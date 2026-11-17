import { describe, expect, it } from "vitest";
import {
  PARETO_COMPLETIONS_END,
  PARETO_COMPLETIONS_START,
  PARETO_GAP_END,
  PARETO_GAP_START,
  effectiveWaitDays,
  paretoCurve,
  paretoPoint,
  rebalanceProjection,
} from "./coordination";

describe("effective wait", () => {
  it("adds queue depth divided by daily slots to the open booking age", () => {
    expect(effectiveWaitDays(10, 4, 2)).toBe(12);
    expect(effectiveWaitDays(null, 0, 3)).toBe(0);
  });
});

describe("equity frontier", () => {
  it("starts at a 31.4% gap and ends at 2.1% while completions rise", () => {
    const start = paretoPoint(0);
    const end = paretoPoint(1);
    expect(start.gap).toBe(PARETO_GAP_START);
    expect(end.gap).toBe(PARETO_GAP_END);
    expect(start.completions).toBe(PARETO_COMPLETIONS_START);
    expect(end.completions).toBe(PARETO_COMPLETIONS_END);
    expect(end.completions).toBeGreaterThan(start.completions);
    const curve = paretoCurve();
    for (let index = 1; index < curve.length; index += 1) {
      expect(curve[index].gap).toBeLessThanOrEqual(curve[index - 1].gap);
      expect(curve[index].completions).toBeGreaterThanOrEqual(curve[index - 1].completions);
    }
  });
});

describe("rebalance projection", () => {
  it("shortens the saturated wait and lengthens the quieter one as the quota rises", () => {
    const low = rebalanceProjection(18, 4, 10);
    const high = rebalanceProjection(18, 4, 60);
    expect(high.origin).toBeLessThan(low.origin);
    expect(high.target).toBeGreaterThan(low.target);
  });
});
