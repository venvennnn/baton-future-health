/**
 * Published inputs for the capacity-planning estimate.
 * Counts are the study's, not a model result. The abstract of Almansoori et al.
 * says 933 people had no colonoscopy; Table 5 sums to 993. This file uses 993.
 */

export const ALMANSOORI_CITATION =
  "Almansoori A, Alzaabi M, Alketbi L. Colorectal cancer screening in ambulatory healthcare service clinics in Abu Dhabi, United Arab Emirates in 2015–2016. BMC Cancer. 2021. doi:10.1186/s12885-021-08623-9";

export const CORONADO_CITATION =
  "Coronado GD, Petrik AF, Thompson JH, Leo MC, Slaughter M, Gautom P, Hussain SA, Mosso L, Gibbs J, Yadav N, Mummadi RR, Johnson ES, Jimenez R. Patient navigation to improve colonoscopy completion after an abnormal stool test result: a randomized controlled trial. Annals of Internal Medicine. 2025;178(5):645–654. doi:10.7326/ANNALS-24-01885";

export const MODEL_TAG =
  "Modelled · synthetic cohort calibrated to Almansoori 2021 · effect from Coronado 2025 RCT";

export const COMPLETION_TOLERANCE = 0.01;
export const LOSS_MIX_TOLERANCE = 0.02;

/** Assumption. Usual-care navigator capacity for the same-team comparison. Not reported by Almansoori et al. */
export const USUAL_CALLS_PER_DAY = 6;

export const ALMANSOORI = {
  positiveTests: 1429,
  completed: 436,
  noColonoscopy: 993,
  losses: [
    { id: "never_got_result", label: "Never got the result", count: 133 },
    { id: "referred_never_went", label: "Referred, never went", count: 360 },
    { id: "booked_never_came", label: "Booked, never came", count: 92 },
    { id: "refused", label: "Refused", count: 112 },
    { id: "clinical", label: "Clinical reasons", count: 160 },
    { id: "other", label: "Other", count: 136 },
  ],
} as const;

export type LossId = (typeof ALMANSOORI.losses)[number]["id"];

/** Coronado et al. 2025, modified intention-to-treat, colonoscopy at 1 year. */
export const CORONADO = {
  usualCare: 0.421,
  navigation: 0.551,
  difference: 0.13,
  differenceLow: 0.065,
  differenceHigh: 0.194,
  oddsRatio: 1.69,
  oddsRatioLow: 1.3,
  oddsRatioHigh: 2.19,
} as const;

export const NAVIGATION_ODDS = {
  low: CORONADO.oddsRatioLow,
  central: CORONADO.oddsRatio,
  high: CORONADO.oddsRatioHigh,
} as const;

export function completionOdds(rate: number): number {
  if (rate <= 0) return 0;
  if (rate >= 1) return Number.POSITIVE_INFINITY;
  return rate / (1 - rate);
}

/** Completion probability after multiplying the odds by `oddsRatio`. */
export function applyOddsRatio(rate: number, oddsRatio: number): number {
  const odds = completionOdds(rate) * oddsRatio;
  if (!Number.isFinite(odds)) return 1;
  return odds / (1 + odds);
}

/**
 * Share of usual-care handover losses that complete once navigation is applied.
 * `rate` is usual-care completion among patients who are not refused, clinical, or other.
 */
export function handoverConversionShare(rate: number, oddsRatio: number): number {
  if (rate <= 0 || rate >= 1) return 0;
  const next = applyOddsRatio(rate, oddsRatio);
  return Math.min(1, Math.max(0, (next - rate) / (1 - rate)));
}

export interface ScaledImpact {
  perThousand: number;
  /** Extra colonoscopies in a cohort of 1,429. These come from the 993 who had no colonoscopy. */
  ofMissed: number;
}

export function scaleImpact(delta: number): ScaledImpact {
  return {
    perThousand: delta * 1000,
    ofMissed: delta * ALMANSOORI.positiveTests,
  };
}
