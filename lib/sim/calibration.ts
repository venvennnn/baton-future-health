import {
  ALMANSOORI,
  COMPLETION_TOLERANCE,
  CORONADO,
  LOSS_MIX_TOLERANCE,
  NAVIGATION_ODDS,
  USUAL_CALLS_PER_DAY,
  handoverConversionShare,
  scaleImpact,
  type LossId,
} from "../impact";
import { HORIZON, mulberry32, simDropoutProbability, type ResourcePolicy, type SimPatient } from "./model";

export type Category = "complete" | LossId;
export type Strategy = ResourcePolicy["strategy"];

const HANDOVER: ReadonlySet<Category> = new Set(["never_got_result", "referred_never_went", "booked_never_came"]);

export interface CalibrationRow {
  id: string;
  label: string;
  target: number;
  model: number;
  tolerance: number;
  pass: boolean;
  /** How to read the target. No follow-up window is stated for Almansoori et al. */
  basis: string;
}

export interface ImpactScenario {
  oddsRatio: number;
  completion: number;
  perThousand: number;
  ofMissed: number;
}

export interface OrderImpact {
  strategy: Strategy;
  reached: number;
  handoverReached: number;
  central: ImpactScenario;
  low: ImpactScenario;
  high: ImpactScenario;
}

export interface EvidenceRow {
  parameter: string;
  value: string;
  range: string;
  source: string;
}

export interface ImpactEstimate {
  n: number;
  seed: number;
  horizon: number;
  usualCallsPerDay: number;
  usualCare: number;
  eligibleUsualCare: number;
  sameTeam: OrderImpact;
  byOrder: OrderImpact[];
  extraCallsPerDay: number;
  extraCapacity: OrderImpact;
  rankingPp: { central: number; low: number; high: number };
  teachBackPp: 0;
  readinessPp: 0;
  routingPp: 0;
  calibration: CalibrationRow[];
  evidence: EvidenceRow[];
  thresholds: Record<string, number>;
}

interface Draw {
  uClinical: number;
  uRefuse: number;
  uOther: number;
  uReach: number;
  uBook: number;
  uAttend: number;
}

interface Thresholds {
  clinical: number;
  refused: number;
  other: number;
  reach: number;
  book: number;
  attend: number;
}

interface Fitted {
  categories: Category[];
  thresholds: Thresholds;
  counts: Record<Category, number>;
}

const fitCache = new Map<string, Fitted>();

function countBelow(values: number[], threshold: number): number {
  let count = 0;
  for (const value of values) if (value < threshold) count += 1;
  return count;
}

/** Search a coarse grid and the ordered draws. Keep the split closest to `targetBelow`. */
function gridSearchThreshold(values: number[], targetBelow: number): number {
  if (values.length === 0 || targetBelow <= 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const clamped = Math.min(sorted.length, targetBelow);
  const exact = clamped >= sorted.length ? 1 : (sorted[clamped - 1] + (sorted[clamped] ?? 1)) / 2;
  let best = exact;
  let bestDiff = Math.abs(countBelow(values, exact) - targetBelow);
  for (let step = 0; step <= 200; step += 1) {
    const threshold = step / 200;
    const diff = Math.abs(countBelow(values, threshold) - targetBelow);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = threshold;
    }
  }
  return best;
}

function largestRemainder(n: number, weights: { id: Category; share: number }[]): Record<Category, number> {
  const rows = weights.map((weight) => ({ id: weight.id, exact: weight.share * n, floor: Math.floor(weight.share * n) }));
  let leftover = n - rows.reduce((sum, row) => sum + row.floor, 0);
  const ranked = [...rows].sort((a, b) => b.exact - b.floor - (a.exact - a.floor) || (a.id < b.id ? -1 : 1));
  const counts = {} as Record<Category, number>;
  for (const row of rows) counts[row.id] = row.floor;
  for (const row of ranked) {
    if (leftover <= 0) break;
    counts[row.id] += 1;
    leftover -= 1;
  }
  return counts;
}

function studyTargets(n: number): Record<Category, number> {
  const weights: { id: Category; share: number }[] = [
    { id: "complete", share: ALMANSOORI.completed / ALMANSOORI.positiveTests },
    ...ALMANSOORI.losses.map((loss) => ({ id: loss.id as Category, share: loss.count / ALMANSOORI.positiveTests })),
  ];
  return largestRemainder(n, weights);
}

function drawsFor(index: number, seed: number): Draw {
  const rand = mulberry32((Math.imul(index + 1, 0x9e3779b1) ^ seed) >>> 0);
  return { uClinical: rand(), uRefuse: rand(), uOther: rand(), uReach: rand(), uBook: rand(), uAttend: rand() };
}

function assign(draw: Draw, thresholds: Thresholds): Category {
  if (draw.uClinical < thresholds.clinical) return "clinical";
  if (draw.uRefuse < thresholds.refused) return "refused";
  if (draw.uOther < thresholds.other) return "other";
  if (!(draw.uReach < thresholds.reach)) return "never_got_result";
  if (!(draw.uBook < thresholds.book)) return "referred_never_went";
  if (!(draw.uAttend < thresholds.attend)) return "booked_never_came";
  return "complete";
}

function fitPatients(patients: SimPatient[], seed: number): Fitted {
  const key = `${seed}:${patients.length}:${patients[0]?.index ?? 0}:${patients[patients.length - 1]?.index ?? 0}`;
  const cached = fitCache.get(key);
  if (cached) return cached;
  const draws = patients.map((patient) => drawsFor(patient.index, seed));
  const targets = studyTargets(patients.length);
  const clinical = gridSearchThreshold(draws.map((draw) => draw.uClinical), targets.clinical);
  const afterClinical = draws.filter((draw) => !(draw.uClinical < clinical));
  const refused = gridSearchThreshold(afterClinical.map((draw) => draw.uRefuse), targets.refused);
  const afterRefused = afterClinical.filter((draw) => !(draw.uRefuse < refused));
  const other = gridSearchThreshold(afterRefused.map((draw) => draw.uOther), targets.other);
  const pathway = afterRefused.filter((draw) => !(draw.uOther < other));
  const reach = gridSearchThreshold(pathway.map((draw) => draw.uReach), pathway.length - targets.never_got_result);
  const reached = pathway.filter((draw) => draw.uReach < reach);
  const book = gridSearchThreshold(reached.map((draw) => draw.uBook), reached.length - targets.referred_never_went);
  const booked = reached.filter((draw) => draw.uBook < book);
  const attend = gridSearchThreshold(booked.map((draw) => draw.uAttend), booked.length - targets.booked_never_came);
  const thresholds = { clinical, refused, other, reach, book, attend };
  const categories = draws.map((draw) => assign(draw, thresholds));
  const counts = emptyCounts();
  for (const category of categories) counts[category] += 1;
  const fitted = { categories, thresholds, counts };
  fitCache.set(key, fitted);
  return fitted;
}

function emptyCounts(): Record<Category, number> {
  return {
    complete: 0,
    never_got_result: 0,
    referred_never_went: 0,
    booked_never_came: 0,
    refused: 0,
    clinical: 0,
    other: 0,
  };
}

export function calibrationRows(counts: Record<Category, number>, n: number): CalibrationRow[] {
  const completion = n === 0 ? 0 : counts.complete / n;
  const targetCompletion = ALMANSOORI.completed / ALMANSOORI.positiveTests;
  const missed = n - counts.complete;
  const rows: CalibrationRow[] = [
    {
      id: "complete",
      label: "Colonoscopy completed",
      target: targetCompletion,
      model: completion,
      tolerance: COMPLETION_TOLERANCE,
      pass: Math.abs(completion - targetCompletion) <= COMPLETION_TOLERANCE + 1e-12,
      basis: "completion recorded in the study",
    },
  ];
  for (const loss of ALMANSOORI.losses) {
    const target = loss.count / ALMANSOORI.noColonoscopy;
    const model = missed === 0 ? 0 : counts[loss.id] / missed;
    rows.push({
      id: loss.id,
      label: loss.label,
      target,
      model,
      tolerance: LOSS_MIX_TOLERANCE,
      pass: Math.abs(model - target) <= LOSS_MIX_TOLERANCE + 1e-12,
      basis: "share of the 993 with no colonoscopy",
    });
  }
  return rows;
}

function reachedIndexes(patients: SimPatient[], categories: Category[], callsPerDay: number, strategy: Strategy): number[] {
  const capacity = Math.min(patients.length, Math.max(0, Math.floor(callsPerDay * HORIZON)));
  const order = patients.map((_, index) => index);
  if (strategy === "risk") {
    order.sort((a, b) => simDropoutProbability(patients[b], 0) - simDropoutProbability(patients[a], 0) || patients[a].index - patients[b].index);
  } else if (strategy === "benefit") {
    order.sort((a, b) => Number(HANDOVER.has(categories[b])) - Number(HANDOVER.has(categories[a])) || patients[a].index - patients[b].index);
  } else {
    order.sort((a, b) => patients[a].index - patients[b].index);
  }
  return order.slice(0, capacity);
}

function scenarioFor(categories: Category[], reached: Set<number>, oddsRatio: number, usualCare: number, eligibleUsual: number): ImpactScenario {
  const candidates: number[] = [];
  categories.forEach((category, index) => {
    if (reached.has(index) && HANDOVER.has(category)) candidates.push(index);
  });
  candidates.sort((a, b) => a - b);
  const quota = Math.round(handoverConversionShare(eligibleUsual, oddsRatio) * candidates.length);
  const converted = new Set(candidates.slice(0, quota));
  let completed = 0;
  categories.forEach((category, index) => {
    if (category === "complete" || converted.has(index)) completed += 1;
  });
  const completion = categories.length === 0 ? 0 : completed / categories.length;
  const scaled = scaleImpact(completion - usualCare);
  return { oddsRatio, completion, perThousand: scaled.perThousand, ofMissed: scaled.ofMissed };
}

function orderImpact(patients: SimPatient[], categories: Category[], callsPerDay: number, strategy: Strategy, usualCare: number, eligibleUsual: number): OrderImpact {
  const indexes = reachedIndexes(patients, categories, callsPerDay, strategy);
  const reached = new Set(indexes);
  let handoverReached = 0;
  for (const index of indexes) if (HANDOVER.has(categories[index])) handoverReached += 1;
  return {
    strategy,
    reached: indexes.length,
    handoverReached,
    low: scenarioFor(categories, reached, NAVIGATION_ODDS.low, usualCare, eligibleUsual),
    central: scenarioFor(categories, reached, NAVIGATION_ODDS.central, usualCare, eligibleUsual),
    high: scenarioFor(categories, reached, NAVIGATION_ODDS.high, usualCare, eligibleUsual),
  };
}

function evidenceRows(n: number, seed: number, thresholds: Thresholds, eligibleUsual: number): EvidenceRow[] {
  const assumption = "assumption";
  return [
    { parameter: "FIT-positive cohort in the cited study", value: ALMANSOORI.positiveTests.toLocaleString(), range: "—", source: ALMANSOORI_SOURCE },
    { parameter: "Colonoscopy completed in the study", value: `${ALMANSOORI.completed} (${((ALMANSOORI.completed / ALMANSOORI.positiveTests) * 100).toFixed(1)}%)`, range: "—", source: `${ALMANSOORI_SOURCE} Completion recorded in the study. No follow-up window is stated here.` },
    { parameter: "No follow-up colonoscopy in the study", value: `${ALMANSOORI.noColonoscopy} (${((ALMANSOORI.noColonoscopy / ALMANSOORI.positiveTests) * 100).toFixed(1)}%)`, range: "—", source: `${ALMANSOORI_SOURCE} The abstract says 933. Table 5 sums to 993. This model uses 993.` },
    ...ALMANSOORI.losses.map((loss) => ({
      parameter: loss.label,
      value: `${loss.count} (${((loss.count / ALMANSOORI.noColonoscopy) * 100).toFixed(1)}% of 993)`,
      range: "—",
      source: ALMANSOORI_SOURCE,
    })),
    { parameter: "Trial colonoscopy at 1 year, usual care", value: "42.1%", range: "—", source: CORONADO_SOURCE },
    { parameter: "Trial colonoscopy at 1 year, navigation", value: "55.1%", range: "—", source: CORONADO_SOURCE },
    { parameter: "Trial difference", value: "+13.0 pp", range: "6.5 to 19.4 pp", source: CORONADO_SOURCE },
    { parameter: "Navigation odds ratio", value: CORONADO.oddsRatio.toFixed(2), range: `${CORONADO.oddsRatioLow.toFixed(2)} to ${CORONADO.oddsRatioHigh.toFixed(2)}`, source: CORONADO_SOURCE },
    { parameter: "Effect modification by predicted completion", value: "None applied", range: "Trial test for heterogeneity P = .16", source: `${CORONADO_SOURCE} Ranking does not change the odds ratio.` },
    { parameter: "Horizon", value: `${HORIZON} days`, range: "—", source: `${CORONADO_SOURCE} Matches the 1-year primary outcome. This is not a follow-up window for Almansoori et al.` },
    { parameter: "Synthetic cohort", value: `${n.toLocaleString()} patients, seed ${seed}`, range: "—", source: assumption },
    { parameter: "Usual-care navigator calls per day", value: String(USUAL_CALLS_PER_DAY), range: "—", source: assumption },
    { parameter: "Patients reached", value: "calls per day × 365, capped at the cohort", range: "—", source: `${assumption}. One call reaches one patient. No published contact probability is applied.` },
    { parameter: "Who receives the odds ratio", value: "Reached patients in the three handover losses", range: "—", source: `${assumption}. Conservative: refused, clinical reasons, and other are unchanged. Coronado et al. did not report effects for those reasons.` },
    { parameter: "Usual-care completion among patients navigation may change", value: `${(eligibleUsual * 100).toFixed(1)}%`, range: "—", source: "Model output after calibration. The odds ratio is applied to this rate, not to 42.1%." },
    { parameter: "P(clinical reasons) threshold", value: thresholds.clinical.toFixed(4), range: "—", source: "Grid search on this seed, fit to Almansoori et al. 2021." },
    { parameter: "P(refused | not clinical) threshold", value: thresholds.refused.toFixed(4), range: "—", source: "Grid search on this seed, fit to Almansoori et al. 2021." },
    { parameter: "P(other | not clinical or refused) threshold", value: thresholds.other.toFixed(4), range: "—", source: "Grid search on this seed, fit to Almansoori et al. 2021." },
    { parameter: "P(reached | still in the pathway) threshold", value: thresholds.reach.toFixed(4), range: "—", source: "Grid search on this seed, fit to Almansoori et al. 2021." },
    { parameter: "P(booked | reached) threshold", value: thresholds.book.toFixed(4), range: "—", source: "Grid search on this seed, fit to Almansoori et al. 2021." },
    { parameter: "P(attended | booked) threshold", value: thresholds.attend.toFixed(4), range: "—", source: "Grid search on this seed, fit to Almansoori et al. 2021." },
    { parameter: "Teach-back effect", value: "0", range: "—", source: "not counted: no published effect size yet" },
    { parameter: "Readiness gate effect", value: "0", range: "—", source: "not counted: no published effect size yet" },
    { parameter: "Routing effect", value: "0", range: "—", source: "not counted: no published effect size yet" },
    { parameter: "Extra endoscopy slots effect", value: "0", range: "—", source: "not counted: no published effect size yet" },
  ];
}

const ALMANSOORI_SOURCE = "Almansoori et al., BMC Cancer 2021";
const CORONADO_SOURCE = "Coronado et al., Annals of Internal Medicine 2025";

export function estimateImpact(patients: SimPatient[], extraCallsPerDay: number, seed = 26771): ImpactEstimate {
  const fitted = fitPatients(patients, seed);
  const n = patients.length;
  const usualCare = n === 0 ? 0 : fitted.counts.complete / n;
  const eligible = fitted.counts.complete + fitted.counts.never_got_result + fitted.counts.referred_never_went + fitted.counts.booked_never_came;
  const eligibleUsual = eligible === 0 ? 0 : fitted.counts.complete / eligible;
  const byOrder = (["fifo", "risk", "benefit"] as const).map((strategy) => orderImpact(patients, fitted.categories, USUAL_CALLS_PER_DAY, strategy, usualCare, eligibleUsual));
  const sameTeam = byOrder.find((item) => item.strategy === "fifo") ?? byOrder[0];
  const benefit = byOrder.find((item) => item.strategy === "benefit") ?? byOrder[2];
  const extraCapacity = orderImpact(patients, fitted.categories, extraCallsPerDay, "fifo", usualCare, eligibleUsual);
  return {
    n,
    seed,
    horizon: HORIZON,
    usualCallsPerDay: USUAL_CALLS_PER_DAY,
    usualCare,
    eligibleUsualCare: eligibleUsual,
    sameTeam,
    byOrder,
    extraCallsPerDay,
    extraCapacity,
    rankingPp: {
      central: benefit.central.completion - sameTeam.central.completion,
      low: benefit.low.completion - sameTeam.low.completion,
      high: benefit.high.completion - sameTeam.high.completion,
    },
    teachBackPp: 0,
    readinessPp: 0,
    routingPp: 0,
    calibration: calibrationRows(fitted.counts, n),
    evidence: evidenceRows(n, seed, fitted.thresholds, eligibleUsual),
    thresholds: { ...fitted.thresholds },
  };
}

/** Eligible-subgroup completion if every patient is reached. Used to check the odds ratio, not as the headline. */
export function fullCoverageEligibleRate(patients: SimPatient[], oddsRatio: number, seed = 26771): number {
  const fitted = fitPatients(patients, seed);
  const handover = fitted.counts.never_got_result + fitted.counts.referred_never_went + fitted.counts.booked_never_came;
  const eligible = fitted.counts.complete + handover;
  if (eligible === 0) return 0;
  const eligibleUsual = fitted.counts.complete / eligible;
  const quota = Math.round(handoverConversionShare(eligibleUsual, oddsRatio) * handover);
  return (fitted.counts.complete + quota) / eligible;
}
