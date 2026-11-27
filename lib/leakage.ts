import { daysSinceResult } from "./analytics";
import { resultAcknowledged } from "./risk";
import { AS_OF, type ScreeningCase } from "./types";

export const LEAKAGE_CATEGORIES = [
  { id: "never_got_result", label: "Never got the result", loss: true },
  { id: "referred_never_went", label: "Referred, never went", loss: true },
  { id: "booked_never_came", label: "Booked, never came", loss: true },
  { id: "in_progress", label: "In progress, on track", loss: false },
  { id: "closed_clinical", label: "Closed with clinical disposition", loss: false },
] as const;

export type LeakageId = (typeof LEAKAGE_CATEGORIES)[number]["id"];

const REFERRED = new Set(["pending_acceptance", "accepted", "rejected_capacity", "reverted", "booked"]);

function bookingOn(item: ScreeningCase): string | null {
  const dated = item.events.filter((event) => event.kind === "booked").map((event) => event.on).sort();
  if (dated.length > 0) return dated[dated.length - 1];
  if (item.handoverStatus === "booked" || item.stage === "booking") {
    return item.spans.find((span) => span.stage === "booking")?.startedOn ?? null;
  }
  return null;
}

function wasReferred(item: ScreeningCase): boolean {
  return REFERRED.has(item.handoverStatus) || Boolean(item.simulatedPending) || item.events.some((event) => event.kind === "referral" || event.kind === "accepted" || event.kind === "rejection");
}

/** One category per case. Loss categories match the three handover failures in Almansoori et al. */
export function classifyCase(item: ScreeningCase, asOf = AS_OF): LeakageId {
  if (item.closed && (item.dispositionRecorded || item.stage === "closed")) return "closed_clinical";
  if (item.procedureAttended) return "in_progress";
  const booked = bookingOn(item);
  if (booked && booked <= asOf) return "booked_never_came";
  if (wasReferred(item) && !booked) return "referred_never_went";
  if (!resultAcknowledged(item)) return "never_got_result";
  return "in_progress";
}

export interface LeakageBucket {
  id: LeakageId;
  label: string;
  loss: boolean;
  count: number;
  caseIds: string[];
}

export function leakage(cases: ScreeningCase[], asOf = AS_OF): LeakageBucket[] {
  const buckets = new Map<LeakageId, string[]>(LEAKAGE_CATEGORIES.map((category) => [category.id, []]));
  for (const item of cases) buckets.get(classifyCase(item, asOf))!.push(item.id);
  return LEAKAGE_CATEGORIES.map((category) => ({
    ...category,
    count: buckets.get(category.id)!.length,
    caseIds: buckets.get(category.id)!.slice().sort(),
  }));
}

export function handoverLoss(cases: ScreeningCase[], asOf = AS_OF): { atRisk: number; open: number } {
  const rows = leakage(cases, asOf);
  const atRisk = rows.filter((row) => row.loss).reduce((sum, row) => sum + row.count, 0);
  const open = cases.filter((item) => !item.closed).length;
  return { atRisk, open };
}

export function leakageDays(item: ScreeningCase, asOf = AS_OF): number {
  return daysSinceResult(item, asOf);
}
