import { describe, expect, it } from "vitest";
import { spotlightBox, tooltipPosition, tourSteps } from "./walkthrough";

describe("tour steps", () => {
  it("keeps the same route and target in both languages", () => {
    const en = tourSteps("en");
    const ar = tourSteps("ar");
    expect(en.map((step) => step.id)).toEqual(ar.map((step) => step.id));
    expect(en.map((step) => `${step.href}:${step.target}`)).toEqual(ar.map((step) => `${step.href}:${step.target}`));
    expect(new Set(en.map((step) => step.target)).size).toBe(en.length);
    expect(en.map((step) => step.href)).toEqual([
      "/",
      "/",
      "/",
      "/",
      "/cases",
      "/cases",
      "/cases",
      "/cases/FIT-26771",
      "/cases/FIT-26771",
      "/facilities",
      "/facilities",
      "/simulator",
      "/governance",
    ]);
    expect(en.every((step) => step.title && step.body)).toBe(true);
    expect(ar.every((step) => step.title && step.body)).toBe(true);
  });
});

describe("spotlight", () => {
  it("keeps the ring inside the viewport and above the bottom sheet", () => {
    const box = spotlightBox({ top: 400, left: -20, width: 900, height: 500 }, { width: 390, height: 800 }, 220);
    expect(box.left).toBeGreaterThanOrEqual(8);
    expect(box.top + box.height).toBeLessThanOrEqual(800 - 220);
    expect(box.width).toBeLessThanOrEqual(390 - 16);
  });
});

describe("tooltip", () => {
  const tip = { width: 320, height: 180 };

  it("sits below a short target when there is room", () => {
    const pos = tooltipPosition({ top: 80, left: 40, width: 200, height: 40 }, tip, { width: 1200, height: 800 });
    expect(pos.top).toBe(80 + 40 + 12);
    expect(pos.left).toBe(40);
  });

  it("moves above a target that is close to the bottom", () => {
    const pos = tooltipPosition({ top: 700, left: 40, width: 200, height: 40 }, tip, { width: 1200, height: 800 });
    expect(pos.top).toBe(700 - 180 - 12);
  });

  it("uses a bottom card on a narrow screen", () => {
    const pos = tooltipPosition({ top: 80, left: 10, width: 200, height: 40 }, tip, { width: 390, height: 800 });
    expect(pos.top).toBe(800 - 180 - 12);
  });
});
