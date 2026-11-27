import { effectiveWaitDays } from "./coordination";
import { daysBetween } from "./dates";
import { ENDOSCOPY_FACILITIES, FACILITY_BY_ID } from "./facilities";
import {
  AS_OF,
  BOOKING_SLA_DAYS,
  DELAY_ORDER,
  type DelayReason,
  type ScreeningCase,
  type SpanStage,
  type Stage,
} from "./types";

export interface WaitStat {
  median: number | null;
  p90: number | null;
  n: number;
}

export interface BottleneckCell {
  facilityId: string;
  stage: SpanStage;
  completed: WaitStat;
  open: WaitStat;
}

export function quantile(sorted: number[], q: number): number | null {
  if (sorted.length === 0) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] * (hi - pos) + sorted[hi] * (pos - lo);
}

export function waitStat(values: number[], p90Minimum = 5): WaitStat {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    n: sorted.length,
    median: quantile(sorted, 0.5),
    p90: sorted.length >= p90Minimum ? quantile(sorted, 0.9) : null,
  };
}

export function daysSinceResult(item: ScreeningCase, asOf = AS_OF): number {
  if (typeof item.demoDay === "number") return item.demoDay;
  return daysBetween(item.resultOn, asOf);
}

export function isOverdue(item: ScreeningCase, asOf = AS_OF): boolean {
  if (item.closed || item.procedureAttended || item.handoverStatus === "booked") return false;
  return daysSinceResult(item, asOf) > BOOKING_SLA_DAYS;
}

export function overdueBy(item: ScreeningCase, asOf = AS_OF): number {
  return Math.max(0, daysSinceResult(item, asOf) - BOOKING_SLA_DAYS);
}

export function isRejected(item: ScreeningCase): boolean {
  return item.handoverStatus === "rejected_capacity" || item.handoverStatus === "reverted";
}

export function isHighStall(item: ScreeningCase, asOf = AS_OF): boolean {
  return !item.closed && !item.procedureAttended && daysSinceResult(item, asOf) >= 28;
}

export function stallScore(item: ScreeningCase, asOf = AS_OF): number {
  let score = daysSinceResult(item, asOf);
  if (isOverdue(item, asOf)) score += 40;
  if (isRejected(item)) score += 30;
  if (item.eligibleSlotConstraint) score += 20;
  if (item.priority === "tier3") score += 8;
  if (item.closed) score -= 100;
  return score;
}

export interface Kpis {
  open: number;
  overdue: number;
  rejected: number;
  highStall: number;
  meanDaysToBooking: number | null;
  bookingDenominator: number;
  newThisWeek: number;
}

export function kpis(cases: ScreeningCase[], asOf = AS_OF): Kpis {
  const bookingDays: number[] = [];
  for (const item of cases) {
    for (const span of item.spans) {
      if (span.stage === "booking" && span.endedOn) bookingDays.push(daysBetween(span.startedOn, span.endedOn));
    }
  }
  return {
    open: cases.filter((item) => !item.closed).length,
    overdue: cases.filter((item) => isOverdue(item, asOf)).length,
    rejected: cases.filter(isRejected).length,
    highStall: cases.filter((item) => isHighStall(item, asOf)).length,
    meanDaysToBooking: bookingDays.length ? bookingDays.reduce((sum, value) => sum + value, 0) / bookingDays.length : null,
    bookingDenominator: bookingDays.length,
    newThisWeek: cases.filter((item) => daysSinceResult(item, asOf) <= 7 && !item.closed).length,
  };
}

export function stageCounts(cases: ScreeningCase[]): Record<Stage | "all", number> {
  const counts = {
    all: cases.length,
    result_issued: 0,
    teach_back: 0,
    referral: 0,
    booking: 0,
    pathology: 0,
    closed: 0,
  };
  for (const item of cases) counts[item.stage] += 1;
  return counts;
}

export function filterCases(
  cases: ScreeningCase[],
  query: string,
  stage: Stage | "all",
  facilityId?: string,
): ScreeningCase[] {
  const needle = query.trim().toLowerCase();
  return cases.filter((item) => {
    if (stage !== "all" && item.stage !== stage) return false;
    if (facilityId && facilityId !== "all") {
      const hit = item.facilityId === facilityId || item.originFacilityId === facilityId || item.endoscopyFacilityId === facilityId;
      if (!hit) return false;
    }
    if (!needle) return true;
    const hay = [item.id, item.name, item.nameAr ?? "", item.emiratesId, item.ownerName, item.ownerTeam, item.physician]
      .join(" ")
      .toLowerCase();
    return hay.includes(needle);
  });
}

export function bottleneckTable(cases: ScreeningCase[], asOf = AS_OF): BottleneckCell[] {
  const cells: BottleneckCell[] = [];
  const stages: SpanStage[] = ["referral_acceptance", "booking", "report_review"];
  for (const facility of ENDOSCOPY_FACILITIES) {
    for (const stage of stages) {
      const completed: number[] = [];
      const open: number[] = [];
      for (const item of cases) {
        for (const span of item.spans) {
          if (span.facilityId !== facility.id || span.stage !== stage) continue;
          if (span.endedOn) completed.push(daysBetween(span.startedOn, span.endedOn));
          else open.push(Math.max(0, daysBetween(span.startedOn, asOf)));
        }
      }
      cells.push({
        facilityId: facility.id,
        stage,
        completed: waitStat(completed),
        open: waitStat(open),
      });
    }
  }
  return cells;
}

export interface DelayRow {
  reason: DelayReason;
  count: number;
  share: number;
}

export interface DelaySummary {
  rows: DelayRow[];
  total: number;
  confirmedSlotConstraints: number;
}

export function currentWaitDays(item: ScreeningCase, asOf = AS_OF): number | null {
  const open = item.spans.find((span) => span.endedOn === null);
  if (open) return daysBetween(open.startedOn, asOf);
  if (item.closed || item.stage === "result_issued" || item.stage === "teach_back") return null;
  return daysSinceResult(item, asOf);
}

export function delaySummary(cases: ScreeningCase[], asOf = AS_OF, minimumDays = 3): DelaySummary {
  const counts = new Map<DelayReason, number>(DELAY_ORDER.map((reason) => [reason, 0]));
  let total = 0;
  let confirmedSlotConstraints = 0;
  for (const item of cases) {
    if (item.closed) continue;
    if (item.stage !== "referral" && item.stage !== "booking" && item.stage !== "pathology") continue;
    const age = currentWaitDays(item, asOf);
    if (age === null || age <= minimumDays) continue;
    const reason = item.delayReason ?? "unknown";
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
    total += 1;
    if (item.eligibleSlotConstraint) confirmedSlotConstraints += 1;
  }
  return {
    total,
    confirmedSlotConstraints,
    rows: DELAY_ORDER.map((reason) => ({
      reason,
      count: counts.get(reason) ?? 0,
      share: total === 0 ? 0 : (counts.get(reason) ?? 0) / total,
    })),
  };
}

export interface ProgrammeCounts {
  cohort: number;
  contacted: number;
  booked: number;
  attended: number;
  closed: number;
  attendedWithoutClosure: number;
}

export function programmeCounts(cases: ScreeningCase[]): ProgrammeCounts {
  const contacted = cases.filter((item) => item.stage !== "result_issued" || item.outreach.length > 0).length;
  const booked = cases.filter((item) => item.handoverStatus === "booked" || item.procedureAttended || item.closed).length;
  const attended = cases.filter((item) => item.procedureAttended).length;
  const closed = cases.filter((item) => item.closed).length;
  return {
    cohort: cases.length,
    contacted,
    booked,
    attended,
    closed,
    attendedWithoutClosure: cases.filter((item) => item.procedureAttended && !item.closed).length,
  };
}

export interface DestinationOption {
  facilityId: string;
  name: string;
  short: string;
  rejected: boolean;
  femaleTeam: boolean;
  km: number;
  dailySlots: number;
  openMedian: number | null;
  openN: number;
  /** Open booking age plus queue depth divided by daily slots. Zero when nothing is waiting. */
  effectiveWait: number | null;
}

export function destinationOptions(item: ScreeningCase, cases: ScreeningCase[]): DestinationOption[] {
  return item.hardEligibleFacilityIds
    .map((facilityId) => {
      const facility = FACILITY_BY_ID.get(facilityId);
      const ages: number[] = [];
      for (const other of cases) {
        for (const span of other.spans) {
          if (span.facilityId === facilityId && span.stage === "booking" && !span.endedOn) {
            ages.push(daysBetween(span.startedOn, AS_OF));
          }
        }
      }
      const rejected = item.events.some((event) => event.kind === "rejection" && event.facilityId === facilityId);
      const open = waitStat(ages);
      const dailySlots = facility?.dailySlots ?? 0;
      return {
        facilityId,
        name: facility?.name ?? facilityId,
        short: facility?.short ?? facilityId,
        rejected,
        femaleTeam: Boolean(facility?.femaleTeam),
        km: facility?.kmFromCentre ?? 0,
        dailySlots,
        openMedian: open.median,
        openN: ages.length,
        effectiveWait: effectiveWaitDays(open.median, ages.length, dailySlots),
      };
    })
    .sort((a, b) => {
      if (a.rejected !== b.rejected) return a.rejected ? 1 : -1;
      if (item.femaleTeamRequested && a.femaleTeam !== b.femaleTeam) return a.femaleTeam ? -1 : 1;
      const aWait = a.effectiveWait ?? 999;
      const bWait = b.effectiveWait ?? 999;
      if (aWait !== bWait) return aWait - bWait;
      return a.km - b.km;
    });
}

export function maskEmiratesId(value: string): string {
  const parts = value.split("-");
  if (parts.length < 4) return value;
  return `${parts[0]}-${parts[1]}-*****-${parts[3]}`;
}

export interface WorkItem {
  item: ScreeningCase;
  stage: SpanStage;
  days: number;
  completed: boolean;
}

export function worklist(
  cases: ScreeningCase[],
  facilityId: string,
  stage: SpanStage | "all",
  asOf = AS_OF,
): WorkItem[] {
  const rows: WorkItem[] = [];
  for (const item of cases) {
    if (item.closed) continue;
    for (const span of item.spans) {
      if (span.endedOn) continue;
      if (facilityId !== "all" && span.facilityId !== facilityId) continue;
      if (stage !== "all" && span.stage !== stage) continue;
      rows.push({
        item,
        stage: span.stage,
        days: daysBetween(span.startedOn, asOf),
        completed: false,
      });
    }
  }
  return rows.sort((a, b) => b.days - a.days || a.item.id.localeCompare(b.item.id));
}
