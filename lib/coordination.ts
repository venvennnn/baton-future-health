/** Illustrative routing and policy helpers. They read the local case file. They are not a live queue. */

export function effectiveWaitDays(openMedian: number | null, openN: number, dailySlots: number): number | null {
  if (openMedian === null && openN === 0) return 0;
  const age = openMedian ?? 0;
  const slots = Math.max(dailySlots, 1);
  return Math.round((age + openN / slots) * 10) / 10;
}

export const PARETO_GAP_START = 31.4;
export const PARETO_GAP_END = 2.1;
export const PARETO_COMPLETIONS_START = 1680;
export const PARETO_COMPLETIONS_END = 1910;

export interface ParetoPoint {
  /** 0 = no interpreter priority, 1 = full priority. */
  priority: number;
  /** Illustrative language-gap in completion, percentage points. */
  gap: number;
  /** Illustrative total completions on the same teaching curve. */
  completions: number;
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/** Teaching frontier. Endpoints are the briefed example, not a Department of Health result. */
export function paretoPoint(priority: number): ParetoPoint {
  const t = clamp01(priority);
  const gapEase = 1 - Math.pow(1 - t, 1.35);
  const completionEase = Math.pow(t, 0.85);
  const gap = PARETO_GAP_START + (PARETO_GAP_END - PARETO_GAP_START) * gapEase;
  const completions = PARETO_COMPLETIONS_START + (PARETO_COMPLETIONS_END - PARETO_COMPLETIONS_START) * completionEase;
  return {
    priority: t,
    gap: Math.round(gap * 10) / 10,
    completions: Math.round(completions),
  };
}

export function paretoCurve(steps = 21): ParetoPoint[] {
  const count = Math.max(2, steps);
  return Array.from({ length: count }, (_, index) => paretoPoint(index / (count - 1)));
}

/** Local projection only. Diverting a quota of routine patients shortens the saturated wait and lengthens the quieter one. */
export function rebalanceProjection(originMedian: number, targetMedian: number, quotaPercent: number): { origin: number; target: number } {
  const share = Math.min(100, Math.max(0, quotaPercent)) / 100;
  return {
    origin: Math.round(Math.max(0.5, originMedian * (1 - 0.55 * share)) * 10) / 10,
    target: Math.round(targetMedian * (1 + 0.35 * share) * 10) / 10,
  };
}
