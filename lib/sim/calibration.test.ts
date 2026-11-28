import { describe, expect, it } from "vitest";
import { applyOddsRatio, CORONADO, USUAL_CALLS_PER_DAY } from "../impact";
import { buildCohort, HORIZON } from "./model";
import { estimateImpact, fullCoverageEligibleRate } from "./calibration";

const cohort = buildCohort(26771, 2500, true);

describe("usual-care calibration", () => {
  const impact = estimateImpact(cohort, 12, 26771);

  it("stays within 1 percentage point of recorded completion and 2 points of each loss share", () => {
    expect(impact.calibration.every((row) => row.pass)).toBe(true);
    const completion = impact.calibration[0];
    expect(Math.abs(completion.model - completion.target)).toBeLessThanOrEqual(0.01);
    for (const row of impact.calibration.slice(1)) {
      expect(Math.abs(row.model - row.target)).toBeLessThanOrEqual(0.02);
    }
  });

  it("repeats for the same seed and does not change when the same cohort is rebuilt", () => {
    const again = estimateImpact(buildCohort(26771, 2500, true), 12, 26771);
    expect(again.usualCare).toBe(impact.usualCare);
    expect(again.sameTeam.central.completion).toBe(impact.sameTeam.central.completion);
    expect(again.calibration.map((row) => row.model)).toEqual(impact.calibration.map((row) => row.model));
  });
});

describe("navigation effect", () => {
  const impact = estimateImpact(cohort, USUAL_CALLS_PER_DAY, 26771);

  it("uses the same navigator capacity as usual care for the headline", () => {
    expect(impact.sameTeam.strategy).toBe("fifo");
    expect(impact.sameTeam.reached).toBe(Math.min(cohort.length, USUAL_CALLS_PER_DAY * HORIZON));
    expect(impact.extraCapacity.central.completion).toBe(impact.sameTeam.central.completion);
  });

  it("matches the odds ratio when every eligible patient is reached", () => {
    const eligible = fullCoverageEligibleRate(cohort, CORONADO.oddsRatio, 26771);
    const usualEligible = impact.eligibleUsualCare;
    expect(Math.abs(eligible - applyOddsRatio(usualEligible, CORONADO.oddsRatio))).toBeLessThanOrEqual(0.015);
  });

  it("does not give teach-back, the readiness gate, or routing an effect size", () => {
    expect(impact.teachBackPp).toBe(0);
    expect(impact.readinessPp).toBe(0);
    expect(impact.routingPp).toBe(0);
  });

  it("keeps one odds ratio across outreach orders", () => {
    const ratios = impact.byOrder.map((order) => order.central.oddsRatio);
    expect(new Set(ratios)).toEqual(new Set([CORONADO.oddsRatio]));
    expect(impact.byOrder.every((order) => order.reached === impact.sameTeam.reached)).toBe(true);
  });
});
