/** Almansoori et al., BMC Cancer 2021 (Abu Dhabi): 1,429 positive tests, 585 handover losses. */
export const ALMANSOORI = {
  positiveTests: 1429,
  handoverLosses: 585,
} as const;

export interface RecoveredHandovers {
  perThousand: number;
  ofPaper: number;
}

/** (KM completion − baseline) scaled to 1,000 tests, and to the paper's 1,429, capped at 585. */
export function handoversRecovered(km: number, baselineKm: number): RecoveredHandovers {
  const delta = km - baselineKm;
  return {
    perThousand: delta * 1000,
    ofPaper: Math.min(ALMANSOORI.handoverLosses, Math.max(0, delta * ALMANSOORI.positiveTests)),
  };
}
