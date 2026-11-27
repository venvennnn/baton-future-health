import { daysSinceResult, destinationOptions, isRejected } from "./analytics";
import { CASES } from "./cases";
import { AS_OF, BOOKING_SLA_DAYS, type ScreeningCase } from "./types";

/**
 * Operational features (returned referral, failed contacts, unacknowledged result,
 * slot constraint, wait) use expert-set weights to be recalibrated on Malaffi
 * outcome data in a pilot. They are not a validated prediction.
 */
export const OPERATIONAL_PRIOR_NOTE =
  "Operational prior: expert-set weights to be recalibrated on Malaffi outcome data in a pilot.";

export type WeightKind = "literature" | "operational-prior";

export interface RiskWeight {
  weight: number;
  direction: string;
  source: string;
  kind: WeightKind;
}

export const RISK_INTERCEPT = -0.72;

/** Preferred-language match is omitted: navigator records do not store a language. */
export const RISK_WEIGHTS: Record<string, RiskWeight> = {
  delayWeeks: {
    weight: 0.16,
    direction: "Longer delay → higher dropout",
    source: "Systematic review of delay and colorectal outcomes, PMC7527352",
    kind: "literature",
  },
  rejected: {
    weight: 1.05,
    direction: "Returned or rejected referral → higher dropout",
    source: OPERATIONAL_PRIOR_NOTE,
    kind: "operational-prior",
  },
  failedContacts: {
    weight: 0.62,
    direction: "Each unsuccessful outreach attempt → higher dropout",
    source: OPERATIONAL_PRIOR_NOTE,
    kind: "operational-prior",
  },
  unacknowledged: {
    weight: 0.78,
    direction: "Result not yet acknowledged by the patient → higher dropout",
    source: OPERATIONAL_PRIOR_NOTE,
    kind: "operational-prior",
  },
  femaleSlot: {
    weight: 0.88,
    direction: "Female team requested, stronger when an eligible-slot constraint is recorded → higher dropout",
    source: OPERATIONAL_PRIOR_NOTE,
    kind: "operational-prior",
  },
  longWait: {
    weight: 0.64,
    direction: "Effective wait over 14 days at the routed or best eligible unit → higher dropout",
    source: OPERATIONAL_PRIOR_NOTE,
    kind: "operational-prior",
  },
  ageBand: {
    weight: 0.18,
    direction: "Older age → lower completion",
    source: "Issaka et al., PMC6597438 (age OR 0.98 per year for completion)",
    kind: "literature",
  },
  female: {
    weight: -0.34,
    direction: "Female → higher completion",
    source: "Issaka et al., PMC6597438 (female OR 1.38 for completion)",
    kind: "literature",
  },
  continuity: {
    weight: -0.95,
    direction: "A recorded handover or named continuity of care → higher completion",
    source: "PMC8559494; Coronado et al., Scientific Reports 2020",
    kind: "literature",
  },
  attended: {
    weight: -2.35,
    direction: "Procedure attended → much lower remaining dropout",
    source: OPERATIONAL_PRIOR_NOTE,
    kind: "operational-prior",
  },
};

export const MODEL_CARD = {
  name: "Baton dropout-risk score",
  intendedUse: "Rank synthetic screening cases so a navigator sees who is most likely to leave the pathway without a colonoscopy. It explains the rank. It does not decide care.",
  inputs: "Days since the positive result, referral returned, unsuccessful outreach, whether the patient has acknowledged the result, a female-team request and any eligible-slot constraint, effective wait over 14 days, age band, and sex. All of these are read from the case file already on screen.",
  notFor: "Not a diagnosis. Not a triage of clinical urgency. Not an estimate of cancer risk. No accuracy, AUC, or validation is claimed. There is no outcome data behind this score.",
  recalibration: "Literature directions are cited on the weights. Operational weights are an expert prior to be recalibrated on Malaffi outcome data in a pilot.",
  ownerSignOff: "A clinical owner must sign off before this score is used on real patients.",
  operationalPrior: OPERATIONAL_PRIOR_NOTE,
};

export interface Contribution {
  id: string;
  label: string;
  /** Percentage points of dropout probability attributed to this feature. */
  points: number;
}

export interface RiskResult {
  p: number;
  logit: number;
  band: "low" | "medium" | "high" | "closed";
  contributions: Contribution[];
}

export function sigmoid(logit: number): number {
  if (logit > 20) return 1;
  if (logit < -20) return 0;
  return 1 / (1 + Math.exp(-logit));
}

export function failedContactCount(item: ScreeningCase): number {
  return item.outreach.filter((touch) => /no answer|rang out|unsuccessful|not reached/i.test(`${touch.outcome} ${touch.title} ${touch.detail}`)).length;
}

export function resultAcknowledged(item: ScreeningCase): boolean {
  return item.outreach.some((touch) => {
    const text = `${touch.outcome} ${touch.title} ${touch.detail}`;
    if (/no answer|rang out|unsuccessful|not reached/i.test(text)) return false;
    return /spoke|asked|requested|teach-back|answered|reached/i.test(text);
  });
}

/** 1 when a female team was requested; 1.35 when the file also records an eligible-slot constraint. */
export function femaleSlotValue(item: ScreeningCase): number {
  if (!item.femaleTeamRequested) return 0;
  return item.eligibleSlotConstraint ? 1.35 : 1;
}

export function continuityOwned(item: ScreeningCase): boolean {
  return Boolean(item.simulatedPending) || item.handoverStatus === "pending_acceptance" || item.handoverStatus === "accepted" || item.handoverStatus === "booked" || item.procedureAttended;
}

function effectiveWait(item: ScreeningCase): number | null {
  const options = destinationOptions(item, CASES);
  const routed = item.endoscopyFacilityId ? options.find((option) => option.facilityId === item.endoscopyFacilityId && !option.rejected) : undefined;
  const best = options.find((option) => !option.rejected) ?? options[0];
  return (routed ?? best)?.effectiveWait ?? null;
}

interface Term {
  id: string;
  label: string;
  value: number;
  weight: number;
}

function terms(item: ScreeningCase, asOf: string): Term[] {
  const days = daysSinceResult(item, asOf);
  const wait = effectiveWait(item);
  const failed = Math.min(2, failedContactCount(item));
  const weights = RISK_WEIGHTS;
  return [
    { id: "delayWeeks", label: `${days} ${days === 1 ? "day" : "days"} since result`, value: Math.min(days / 7, 12), weight: weights.delayWeeks.weight },
    { id: "rejected", label: "Referral returned", value: isRejected(item) ? 1 : 0, weight: weights.rejected.weight },
    { id: "failedContacts", label: failed <= 1 ? "No answer on first call" : `${failed} calls with no answer`, value: failed, weight: weights.failedContacts.weight },
    { id: "unacknowledged", label: "Result not acknowledged", value: resultAcknowledged(item) ? 0 : 1, weight: weights.unacknowledged.weight },
    { id: "femaleSlot", label: "Female team needed, slots scarce", value: femaleSlotValue(item), weight: weights.femaleSlot.weight },
    { id: "longWait", label: "Effective wait over 14 days", value: wait !== null && wait > BOOKING_SLA_DAYS ? 1 : 0, weight: weights.longWait.weight },
    { id: "ageBand", label: "Older age band", value: Math.min(Math.max(item.age - 45, 0) / 10, 4), weight: weights.ageBand.weight },
    { id: "female", label: "Female sex", value: item.sex === "F" ? 1 : 0, weight: weights.female.weight },
    { id: "continuity", label: "Handover has an owner", value: continuityOwned(item) ? 1 : 0, weight: weights.continuity.weight },
    { id: "attended", label: "Colonoscopy attended", value: item.procedureAttended && !item.closed ? 1 : 0, weight: weights.attended.weight },
  ];
}

export function riskBand(p: number, closed: boolean): RiskResult["band"] {
  if (closed) return "closed";
  if (p >= 0.7) return "high";
  if (p >= 0.4) return "medium";
  return "low";
}

export function dropoutRisk(item: ScreeningCase, asOf = AS_OF): RiskResult {
  if (item.closed) return { p: 0, logit: Number.NEGATIVE_INFINITY, band: "closed", contributions: [] };
  const active = terms(item, asOf);
  const logit = RISK_INTERCEPT + active.reduce((sum, term) => sum + term.weight * term.value, 0);
  const p = sigmoid(logit);
  const reference = sigmoid(RISK_INTERCEPT);
  const gap = p - reference;
  const denom = active.reduce((sum, term) => sum + term.weight * term.value, 0);
  const contributions = active
    .filter((term) => term.value !== 0)
    .map((term) => ({
      id: term.id,
      label: term.label,
      points: denom === 0 ? 0 : ((term.weight * term.value) / denom) * gap * 100,
    }))
    .sort((a, b) => Math.abs(b.points) - Math.abs(a.points) || a.id.localeCompare(b.id));
  return { p, logit, band: riskBand(p, false), contributions };
}

export function topReasons(result: RiskResult, count = 3): string {
  return result.contributions
    .slice(0, count)
    .map((item) => `${item.label} ${item.points >= 0 ? "+" : ""}${item.points.toFixed(0)} pts`)
    .join(" · ");
}

/** Board call-list score: how much a call is expected to change dropout, using the same risk story. */
export function outreachUplift(item: ScreeningCase, asOf = AS_OF): number {
  if (item.closed || item.procedureAttended) return 0;
  const pDrop = dropoutRisk(item, asOf).p;
  const pReach = Math.max(0.18, 0.64 - failedContactCount(item) * 0.1);
  const pAttend = item.sex === "F" ? 0.78 : 0.7;
  const baseline = pDrop * 0.12;
  return pDrop * pReach * pAttend - baseline;
}
