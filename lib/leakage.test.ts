import { describe, expect, it } from "vitest";
import { CASES, getCase } from "./cases";
import { classifyCase, leakage } from "./leakage";

describe("leakage categories", () => {
  it("puts every open case in exactly one category", () => {
    const open = CASES.filter((item) => !item.closed).map((item) => item.id).sort();
    const assigned = leakage(CASES).flatMap((bucket) => bucket.caseIds);
    const openAssigned = assigned.filter((id) => open.includes(id)).sort();
    expect(openAssigned).toEqual(open);
    expect(new Set(openAssigned).size).toBe(open.length);
    for (const item of CASES.filter((row) => row.closed)) expect(classifyCase(item)).toBe("closed_clinical");
  });

  it("moves FIT-26771 as the demo progresses", () => {
    const item = getCase("FIT-26771")!;
    expect(classifyCase(item)).toBe("in_progress");
    expect(classifyCase({ ...item, simulatedPending: true, handoverStatus: "pending_acceptance", demoDay: 3 })).toBe("referred_never_went");
    expect(classifyCase({ ...item, simulatedPending: true, handoverStatus: "pending_acceptance", procedureAttended: true, demoDay: 12, stage: "pathology" })).toBe("in_progress");
    expect(classifyCase({ ...item, closed: true, dispositionRecorded: true, procedureAttended: true, stage: "closed", demoDay: 16 })).toBe("closed_clinical");
  });
});
