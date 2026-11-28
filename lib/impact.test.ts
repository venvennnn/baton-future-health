import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyOddsRatio, CORONADO, scaleImpact } from "./impact";

describe("Coronado odds ratio", () => {
  it("turns a 42.1% usual-care rate into about 55% at the central odds ratio", () => {
    const navigated = applyOddsRatio(CORONADO.usualCare, CORONADO.oddsRatio);
    expect(Math.abs(navigated - CORONADO.navigation)).toBeLessThanOrEqual(0.015);
    expect(applyOddsRatio(CORONADO.usualCare, CORONADO.oddsRatioLow)).toBeLessThan(navigated);
    expect(applyOddsRatio(CORONADO.usualCare, CORONADO.oddsRatioHigh)).toBeGreaterThan(navigated);
  });
});

describe("scaled impact", () => {
  it("scales a rate difference to 1,000 tests and to the 1,429-person study", () => {
    expect(scaleImpact(0)).toEqual({ perThousand: 0, ofMissed: 0 });
    const scaled = scaleImpact(0.1);
    expect(scaled.perThousand).toBeCloseTo(100, 6);
    expect(scaled.ofMissed).toBeCloseTo(142.9, 6);
  });
});

describe("no hard-coded impact strings", () => {
  it("does not keep the old recovery claims in the pages that show impact", () => {
    const paths = [
      "components/simulator-view.tsx",
      "app/governance/page.tsx",
      "components/leakage-panel.tsx",
      "lib/impact.ts",
      "lib/sim/calibration.ts",
    ];
    const banned = ["17.7%", "17.4%", "195 of 585", "of the 585", "≈195", "137 handovers", "day 180"];
    for (const path of paths) {
      const source = readFileSync(path, "utf8");
      for (const phrase of banned) expect(source, `${path} contains ${phrase}`).not.toContain(phrase);
    }
  });
});
