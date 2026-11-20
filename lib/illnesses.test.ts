import { describe, expect, it } from "vitest";
import { CASE_FILE_ILLNESS_ID, defaultIllnesses, normalizeIllnesses } from "./illnesses";

describe("illness programmes", () => {
  it("keeps colorectal screening and drops a forged case-file flag", () => {
    const stored = [
      { id: "breast", name: "Breast screening", test: "Mammogram", hasCaseFile: true, requirements: [{ id: "a", text: "Assessment" }] },
      { id: CASE_FILE_ILLNESS_ID, name: "Colorectal screening", test: "FIT", requirements: [] },
    ];
    const illnesses = normalizeIllnesses(stored);
    expect(illnesses[0].id).toBe(CASE_FILE_ILLNESS_ID);
    expect(illnesses.map((item) => item.id)).toEqual([CASE_FILE_ILLNESS_ID, "breast"]);
    expect(illnesses.some((item) => "hasCaseFile" in item)).toBe(false);
  });

  it("falls back to the three starter illnesses when storage is unusable", () => {
    expect(normalizeIllnesses(null).map((item) => item.name)).toEqual(defaultIllnesses().map((item) => item.name));
  });
});
