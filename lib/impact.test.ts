import { describe, expect, it } from "vitest";
import { handoversRecovered } from "./impact";
import { buildCohort, navigationPolicy, simulateResource } from "./sim/model";

describe("handovers recovered", () => {
  it("is zero at baseline and scales a known difference", () => {
    expect(handoversRecovered(0.42, 0.42)).toEqual({ perThousand: 0, ofPaper: 0 });
    const recovered = handoversRecovered(0.5, 0.4);
    expect(recovered.perThousand).toBeCloseTo(100, 6);
    expect(recovered.ofPaper).toBeCloseTo(142.9, 6);
    expect(handoversRecovered(1, 0).ofPaper).toBe(585);
  });

  it("is positive for the default navigation run against its baseline", () => {
    const cohort = buildCohort(26771, 400, false);
    const baseline = simulateResource(cohort, navigationPolicy(6, 0, false, "fifo"));
    const uplift = simulateResource(cohort, navigationPolicy(8, 15, true, "benefit"));
    const recovered = handoversRecovered(uplift.km.atHorizon ?? 0, baseline.km.atHorizon ?? 0);
    expect(recovered.perThousand).toBeGreaterThan(0);
    expect(recovered.ofPaper).toBeCloseTo(Math.min(585, Math.max(0, ((uplift.km.atHorizon ?? 0) - (baseline.km.atHorizon ?? 0)) * 1429)), 5);
  });
});
