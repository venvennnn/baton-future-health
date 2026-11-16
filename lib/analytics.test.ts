import { describe, expect, it } from "vitest";
import { bottleneckTable, delaySummary, filterCases, isOverdue, kpis, quantile, stageCounts } from "./analytics";
import { CASES, getCase } from "./cases";
import { AS_OF } from "./types";

describe("case file", () => {
  it("keeps FIT-26771 open, owned by the origin coordinator, and capacity-rejected", () => {
    const item = getCase("FIT-26771");
    expect(item).toBeTruthy();
    expect(item?.stage).toBe("referral");
    expect(item?.ownerTeam).toBe("Primary coordinator");
    expect(item?.ownerName).toBe("Dr. Khalid Al Nuaimi");
    expect(item?.handoverStatus).toBe("rejected_capacity");
    expect(item?.eligibleSlotConstraint).toBe(true);
    expect(item?.procedureAttended).toBe(false);
    expect(item?.closed).toBe(false);
    expect(item?.resultOn).toBe("2025-10-28");
    expect(isOverdue(item!, AS_OF)).toBe(true);
  });

  it("keeps procedure attendance and documented closure distinct", () => {
    const closed = getCase("FIT-26749");
    expect(closed?.procedureAttended).toBe(true);
    expect(closed?.reportReceived).toBe(true);
    expect(closed?.dispositionRecorded).toBe(true);
    expect(closed?.closed).toBe(true);
    const pending = getCase("FIT-26814");
    expect(pending?.procedureAttended).toBe(true);
    expect(pending?.reportReceived).toBe(false);
    expect(pending?.closed).toBe(false);
    expect(pending?.closurePendingReason).toMatch(/Report is outstanding/);
  });

  it("computes KPI counts from the same cases as the queue", () => {
    const counts = stageCounts(CASES);
    expect(counts.all).toBe(CASES.length);
    expect(counts.referral + counts.teach_back + counts.result_issued + counts.booking + counts.pathology + counts.closed).toBe(CASES.length);
    const metrics = kpis(CASES);
    expect(metrics.open).toBe(CASES.filter((item) => !item.closed).length);
    expect(metrics.overdue).toBe(CASES.filter((item) => isOverdue(item)).length);
    expect(metrics.bookingDenominator).toBeGreaterThan(0);
  });

  it("returns an empty queue when the filter matches nothing", () => {
    expect(filterCases(CASES, "zzzz-no-such-patient", "all")).toEqual([]);
    expect(filterCases(CASES, "Fatima", "referral").map((item) => item.id)).toEqual(["FIT-26771"]);
  });

  it("separates completed transition times from the current age of open cases", () => {
    const cells = bottleneckTable(CASES);
    const southBooking = cells.find((cell) => cell.facilityId === "gi-unit-s" && cell.stage === "booking");
    expect(southBooking?.completed.n).toBeGreaterThanOrEqual(5);
    expect(southBooking?.completed.median).not.toBeNull();
    expect(southBooking?.completed.p90).not.toBeNull();
    expect(southBooking?.open.n).toBeGreaterThan(0);
    expect(southBooking?.open.median).not.toBe(southBooking?.completed.median);
  });

  it("preserves Unknown and confirms a capacity blocker only from the case flag", () => {
    const summary = delaySummary(CASES);
    expect(summary.rows.some((row) => row.reason === "unknown")).toBe(true);
    const limited = CASES.filter((item) => item.delayReason === "limited_slots");
    expect(limited.some((item) => item.eligibleSlotConstraint)).toBe(true);
    expect(limited.some((item) => !item.eligibleSlotConstraint)).toBe(true);
    expect(summary.confirmedSlotConstraints).toBe(CASES.filter((item) => item.eligibleSlotConstraint && !item.closed && (item.stage === "referral" || item.stage === "booking" || item.stage === "pathology") && (item.spans.some((span) => !span.endedOn) || item.handoverStatus === "rejected_capacity")).length);
  });

  it("interpolates quantiles", () => {
    expect(quantile([4, 6, 8, 9, 12, 15], 0.5)).toBe(8.5);
    expect(quantile([], 0.5)).toBeNull();
  });
});
