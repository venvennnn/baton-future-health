import { describe, expect, it } from "vitest";
import {
  BASELINE_POLICY,
  buildCohort,
  kaplanMeier,
  navigationPolicy,
  RESOURCE_POLICIES,
  scaleSlots,
  simulateResource,
  simulateRouting,
  type SimFacility,
  type SimPatient,
} from "./model";

function patient(partial: Partial<SimPatient> & Pick<SimPatient, "id" | "eligibleIds" | "designated" | "priority">): SimPatient {
  return {
    index: partial.index ?? 0,
    age: 60,
    fit: 80,
    language: "ar",
    sex: "F",
    contactDifficulty: 0.2,
    contactRoll: 0.1,
    attendRoll: 0,
    attendRoll2: 0,
    censorDay: 181,
    originId: "al-bateen",
    eligibleMask: 0,
    femalePref: false,
    referralDay: 0,
    anchor: false,
    ...partial,
  };
}

describe("Kaplan–Meier", () => {
  it("censors follow-up that ends before the procedure and does not count it as an event", () => {
    const result = kaplanMeier([
      { eventDay: 20, censorDay: 181 },
      { eventDay: 20, censorDay: 181 },
      { eventDay: 40, censorDay: 10 },
      { eventDay: null, censorDay: 10 },
    ]);
    expect(result.estimator).toBe("Kaplan–Meier");
    const day10 = result.curve.find((point) => point.day === 10);
    expect(day10?.cumulativeIncidence).toBe(0);
    expect(day10?.atRisk).toBe(2);
    expect(result.atHorizon).toBe(1);
    expect(result.medianDay).toBe(20);
  });

  it("leaves the median empty when cumulative incidence never reaches 50%", () => {
    const result = kaplanMeier([
      { eventDay: 30, censorDay: 181 },
      { eventDay: null, censorDay: 181 },
      { eventDay: null, censorDay: 181 },
      { eventDay: null, censorDay: 40 },
    ]);
    expect(result.medianDay).toBeNull();
    expect(result.p90Day).toBeNull();
    expect(result.atHorizon).toBeGreaterThan(0);
    expect(result.atHorizon!).toBeLessThan(0.5);
  });
});

describe("resource comparison", () => {
  const cohort = buildCohort(7, 400, false);

  it("repeats exactly for the same seed and cohort", () => {
    const policy = navigationPolicy(8, 15, true, "benefit");
    const first = simulateResource(cohort, policy);
    const second = simulateResource(cohort, policy);
    expect(first.completed).toBe(second.completed);
    expect(first.km.atHorizon).toBe(second.km.atHorizon);
    expect(first.km.medianDay).toBe(second.km.medianDay);
  });

  it("uses one cohort for usual care, more calls, more slots, and both", () => {
    const results = RESOURCE_POLICIES.map((policy) => simulateResource(cohort, policy));
    expect(new Set(results.map((result) => result.n))).toEqual(new Set([cohort.length]));
    const low = simulateResource(cohort, { ...BASELINE_POLICY, id: "low", callsPerDay: 2 });
    const high = simulateResource(cohort, { ...BASELINE_POLICY, id: "high", callsPerDay: 12 });
    expect(high.contactedBy14!).toBeGreaterThan(low.contactedBy14!);
    const usual = results[0];
    expect(results[2].dailySlots.reduce((sum, value) => sum + value, 0)).toBeGreaterThan(usual.dailySlots.reduce((sum, value) => sum + value, 0));
    for (const result of results) {
      expect(result.km.estimator).toBe("Kaplan–Meier");
      expect(result.completed + result.censored + result.stillWaiting).toBe(cohort.length);
    }
  });

  it("does not invent a language gap below the denominator threshold", () => {
    const tiny = buildCohort(3, 40, false);
    const result = simulateResource(tiny, BASELINE_POLICY);
    const ar = tiny.filter((item) => item.language === "ar").length;
    const en = tiny.filter((item) => item.language === "en").length;
    if (ar < 30 || en < 30) expect(result.language).toBeNull();
  });
});

describe("routing comparison", () => {
  const facilities: SimFacility[] = [
    { id: "a", dailySlots: 1, femaleTeam: false },
    { id: "b", dailySlots: 1, femaleTeam: true },
  ];
  const patients = [
    patient({ id: "T", index: 0, priority: 3, designated: 0, eligibleIds: ["a"] }),
    patient({ id: "R", index: 1, priority: 1, designated: 0, eligibleIds: ["a", "b"], femalePref: true }),
    patient({ id: "X", index: 2, priority: 2, designated: 0, eligibleIds: ["b"], referralDay: 5 }),
  ];

  it("keeps the same slots and never assigns an ineligible facility", () => {
    const policies = ["current", "shortest_displayed", "capacity_aware"] as const;
    const results = policies.map((policy) => simulateRouting(patients, policy, facilities, ["T", "R", "X"], 12));
    expect(results.map((result) => result.totalSlotDays)).toEqual([2 * 13, 2 * 13, 2 * 13]);
    for (const result of results) {
      expect(result.examples.T?.destinationId).toBe("a");
      expect(result.examples.X?.destinationId).toBe("b");
      expect(result.examples.R?.destinationId === "a" || result.examples.R?.destinationId === "b").toBe(true);
    }
    expect(results[0].examples.R?.destinationId).toBe("a");
    expect(results[2].examples.R?.destinationId).toBe("b");
    expect(results[2].examples.R?.eventDay).toBeLessThan(results[0].examples.R?.eventDay ?? 99);
  });

  it("gives a rebooked patient a second attendance draw under every policy", () => {
    const one: SimFacility[] = [{ id: "a", dailySlots: 1, femaleTeam: false }];
    const missesOnce = [patient({ id: "M", priority: 2, designated: 0, eligibleIds: ["a"], attendRoll: 0.99, attendRoll2: 0 })];
    for (const policy of ["current", "shortest_displayed", "capacity_aware"] as const) {
      const result = simulateRouting(missesOnce, policy, one, ["M"], 12);
      expect(result.examples.M?.eventDay).not.toBeNull();
    }
  });

  it("stops rebooking a patient who misses twice, so the next patient gets the slot", () => {
    const one: SimFacility[] = [{ id: "a", dailySlots: 1, femaleTeam: false }];
    const pair = [
      patient({ id: "N", index: 0, priority: 3, designated: 0, eligibleIds: ["a"], attendRoll: 0.99, attendRoll2: 0.99 }),
      patient({ id: "W", index: 1, priority: 1, designated: 0, eligibleIds: ["a"] }),
    ];
    for (const policy of ["current", "shortest_displayed", "capacity_aware"] as const) {
      const result = simulateRouting(pair, policy, one, ["N", "W"], 20);
      expect(result.examples.N?.eventDay).toBeNull();
      expect(result.examples.N?.booked).toBe(false);
      expect(result.examples.W?.eventDay).not.toBeNull();
      expect(result.examples.W?.eventDay ?? 99).toBeLessThanOrEqual(8);
    }
  });

  it("does not let capacity-aware assignment complete fewer procedures than current routing on the seeded cohort", () => {
    const cohort = buildCohort();
    const current = simulateRouting(cohort, "current");
    const aware = simulateRouting(cohort, "capacity_aware");
    expect(aware.completed).toBeGreaterThanOrEqual(current.completed);
  });

  it("scales a shared slot profile without changing the facility set", () => {
    expect(scaleSlots([3, 1, 2], 1)).toEqual([3, 1, 2]);
    expect(scaleSlots([3, 1, 2], 1.3).reduce((sum, value) => sum + value, 0)).toBe(Math.round(6 * 1.3));
  });
});
