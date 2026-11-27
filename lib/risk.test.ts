import { describe, expect, it } from "vitest";
import { CASES, getCase } from "./cases";
import { RISK_INTERCEPT, RISK_WEIGHTS, dropoutRisk, sigmoid } from "./risk";

describe("dropout risk", () => {
  it("keeps probabilities inside (0, 1) and gives every weight a source and kind", () => {
    for (const item of CASES) {
      const risk = dropoutRisk(item);
      if (item.closed) {
        expect(risk.p).toBe(0);
        expect(risk.band).toBe("closed");
        expect(risk.contributions).toEqual([]);
      } else {
        expect(risk.p).toBeGreaterThan(0);
        expect(risk.p).toBeLessThan(1);
      }
    }
    for (const weight of Object.values(RISK_WEIGHTS)) {
      expect(weight.source.length).toBeGreaterThan(8);
      expect(weight.kind === "literature" || weight.kind === "operational-prior").toBe(true);
    }
  });

  it("attributes the gap from the reference probability to the contributions", () => {
    const item = getCase("FIT-26771");
    const risk = dropoutRisk(item!);
    const gap = (risk.p - sigmoid(RISK_INTERCEPT)) * 100;
    const sum = risk.contributions.reduce((total, item) => total + item.points, 0);
    expect(sum).toBeCloseTo(gap, 5);
  });

  it("lowers FIT-26771 monotonically from handover to attendance to closure", () => {
    const item = getCase("FIT-26771")!;
    const fresh = dropoutRisk(item);
    const handed = dropoutRisk({ ...item, simulatedPending: true, handoverStatus: "pending_acceptance", endoscopyFacilityId: "ssmc", demoDay: 3 });
    const attended = dropoutRisk({ ...item, simulatedPending: true, handoverStatus: "pending_acceptance", procedureAttended: true, demoDay: 12 });
    const closed = dropoutRisk({ ...item, closed: true, procedureAttended: true, reportReceived: true, dispositionRecorded: true, demoDay: 16 });
    expect(fresh.p).toBeGreaterThan(0.55);
    expect(fresh.p).toBeLessThan(0.7);
    expect(fresh.contributions[0]?.label).toMatch(/Female team/);
    expect(fresh.contributions.some((row) => /No answer/.test(row.label))).toBe(true);
    expect(handed.p).toBeLessThan(fresh.p);
    expect(attended.p).toBeLessThan(handed.p);
    expect(attended.p).toBeLessThan(0.2);
    expect(closed.p).toBe(0);
    expect(closed.band).toBe("closed");
  });
});
