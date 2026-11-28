import { CASES } from "../cases";
import { ENDOSCOPY_FACILITIES } from "../facilities";
import { RISK_INTERCEPT, RISK_WEIGHTS, sigmoid } from "../risk";
import { priorityRank, type Priority, type ScreeningCase } from "../types";

export interface SimFacility {
  id: string;
  dailySlots: number;
  femaleTeam: boolean;
}

export interface SimPatient {
  id: string;
  index: number;
  age: number;
  fit: number;
  language: "ar" | "en";
  sex: "F" | "M";
  priority: 1 | 2 | 3;
  contactDifficulty: number;
  contactRoll: number;
  attendRoll: number;
  attendRoll2: number;
  censorDay: number;
  originId: string;
  designated: number;
  eligibleMask: number;
  femalePref: boolean;
  referralDay: number;
  anchor: boolean;
  /** When set, routing uses these facility ids instead of the base bitmask. */
  eligibleIds?: string[];
}

export interface ResourcePolicy {
  id: string;
  label: string;
  callsPerDay: number;
  /** Multiplier applied to the shared base slot profile with the largest-remainder method. */
  slotScale: number;
  teachBack: boolean;
  strategy: "fifo" | "risk" | "benefit";
}

export interface KmPoint {
  day: number;
  survival: number;
  cumulativeIncidence: number;
  atRisk: number;
}

export interface KmResult {
  curve: KmPoint[];
  /** Kaplan–Meier cumulative incidence of colonoscopy at the horizon. */
  atHorizon: number | null;
  medianDay: number | null;
  p90Day: number | null;
  estimator: "Kaplan–Meier";
}

export interface FacilityOutcome {
  id: string;
  n: number;
  completed: number;
  rate: number | null;
}

export interface SimSummary {
  policyId: string;
  n: number;
  completed: number;
  censored: number;
  stillWaiting: number;
  contactedBy14: number | null;
  booked: number;
  km: KmResult;
  language: { arRate: number; enRate: number; gap: number; nAr: number; nEn: number } | null;
  priorityGap: { tier3Rate: number; routineRate: number; gap: number; nTier3: number; nRoutine: number } | null;
  byOrigin: FacilityOutcome[];
  byDestination: FacilityOutcome[];
  examples: Record<string, ExampleOutcome>;
  dailySlots: number[];
  totalSlotDays: number;
  /** Median and 90th percentile of event days among completions only. Censored patients are excluded. */
  observedWaits: { n: number; median: number | null; p90: number | null };
}

export interface ExampleOutcome {
  id: string;
  destinationId: string | null;
  booked: boolean;
  eventDay: number | null;
  censored: boolean;
}

export const BASE_FACILITIES: SimFacility[] = ENDOSCOPY_FACILITIES.map((facility) => ({
  id: facility.id,
  dailySlots: facility.dailySlots,
  femaleTeam: facility.femaleTeam,
}));

// Default matches the 1-year primary outcome in Coronado et al. 2025.
// TODO(team): confirm Almansoori follow-up window. Do not present a window for that study in the UI.
export const HORIZON = 365;
export const DEFAULT_COHORT_SIZE = 2500;
export const DEFAULT_SEED = 26771;

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function scaleSlots(base: number[], scale: number): number[] {
  const raw = base.map((value) => value * scale);
  const floors = raw.map((value) => Math.floor(value));
  const target = Math.round(raw.reduce((sum, value) => sum + value, 0));
  let leftover = target - floors.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  const slots = floors.slice();
  let cursor = 0;
  while (leftover > 0) {
    slots[order[cursor % order.length].index] += 1;
    leftover -= 1;
    cursor += 1;
  }
  return slots;
}

function maskOf(ids: string[]): number {
  return ids.reduce((mask, id) => {
    const index = BASE_FACILITIES.findIndex((facility) => facility.id === id);
    return index >= 0 ? mask | (1 << index) : mask;
  }, 0);
}

function hasBit(mask: number, index: number): boolean {
  return (mask & (1 << index)) !== 0;
}

function priorityOf(priority: Priority): 1 | 2 | 3 {
  return priorityRank(priority) as 1 | 2 | 3;
}

function anchorFromCase(item: ScreeningCase, index: number, roll: SimPatient): SimPatient {
  const eligible = item.hardEligibleFacilityIds.filter((id) => BASE_FACILITIES.some((facility) => facility.id === id));
  const designatedId = item.endoscopyFacilityId && eligible.includes(item.endoscopyFacilityId) ? item.endoscopyFacilityId : eligible[0];
  const designated = Math.max(0, BASE_FACILITIES.findIndex((facility) => facility.id === designatedId));
  return {
    ...roll,
    id: item.id,
    index,
    age: item.age,
    fit: item.fitUgG,
    language: item.language,
    sex: item.sex,
    priority: priorityOf(item.priority),
    originId: item.originFacilityId,
    designated,
    eligibleMask: maskOf(eligible),
    femalePref: item.femaleTeamRequested,
    referralDay: 0,
    anchor: true,
    censorDay: item.closed ? HORIZON + 1 : roll.censorDay,
  };
}

export function buildCohort(seed = DEFAULT_SEED, size = DEFAULT_COHORT_SIZE, anchorCases = false): SimPatient[] {
  const rand = mulberry32(seed);
  const primary = ["al-bateen", "madinat-zayed", "al-mushrif", "khalifa-city-a", "al-ain-central"];
  const patients: SimPatient[] = [];
  for (let index = 0; index < size; index += 1) {
    const age = 45 + Math.floor(rand() * 31);
    const fit = 15 + Math.floor(rand() * 220);
    const language: "ar" | "en" = rand() < 0.62 ? "ar" : "en";
    const sex: "F" | "M" = rand() < 0.48 ? "F" : "M";
    const priority: 1 | 2 | 3 = fit >= 120 || age >= 70 ? 3 : fit >= 55 ? 2 : 1;
    const femalePref = sex === "F" && rand() < 0.42;
    const travelLimited = rand() < 0.22;
    const privateExcluded = rand() < 0.12;
    const originId = primary[Math.floor(rand() * primary.length)];
    const eligible: number[] = [];
    BASE_FACILITIES.forEach((facility, facilityIndex) => {
      if (travelLimited && (facility.id === "tawam" || originId !== "al-ain-central") && facility.id === "tawam") return;
      if (privateExcluded && (facility.id === "ccad" || facility.id === "bmc")) return;
      eligible.push(facilityIndex);
    });
    if (eligible.length < 2) {
      eligible.push(0, 2);
    }
    const uniqueEligible = [...new Set(eligible)];
    let designatedPool = uniqueEligible;
    if (originId === "al-ain-central") {
      const tawam = BASE_FACILITIES.findIndex((facility) => facility.id === "tawam");
      if (uniqueEligible.includes(tawam)) designatedPool = [tawam];
    } else {
      const south = BASE_FACILITIES.findIndex((facility) => facility.id === "gi-unit-s");
      if (uniqueEligible.includes(south) && rand() < 0.55) designatedPool = [south];
    }
    const designated = designatedPool[Math.floor(rand() * designatedPool.length)] ?? uniqueEligible[0];
    const censorDay = rand() < 0.14 ? 12 + Math.floor(rand() * 150) : HORIZON + 1;
    patients.push({
      id: `SYN-${String(index + 1).padStart(4, "0")}`,
      index,
      age,
      fit,
      language,
      sex,
      priority,
      contactDifficulty: rand(),
      contactRoll: rand(),
      attendRoll: rand(),
      attendRoll2: rand(),
      censorDay,
      originId,
      designated,
      eligibleMask: uniqueEligible.reduce((mask, facilityIndex) => mask | (1 << facilityIndex), 0),
      femalePref,
      referralDay: Math.floor(rand() * 45),
      anchor: false,
    });
  }
  if (anchorCases) {
    CASES.slice(0, Math.min(CASES.length, patients.length)).forEach((item, index) => {
      patients[index] = anchorFromCase(item, index, patients[index]);
    });
  }
  return patients;
}

export function contactProbability(patient: SimPatient, policy: ResourcePolicy, attempt: number): number {
  const bilingualLift = policy.teachBack ? (patient.language === "ar" ? 0.2 : 0.05) : 0;
  const value =
    0.28 -
    patient.contactDifficulty * 0.24 +
    (patient.language === "ar" ? -0.08 : 0.05) +
    bilingualLift +
    Math.min(attempt, 5) * 0.07;
  return Math.max(0.04, Math.min(0.9, value));
}

export function attendProbability(patient: SimPatient, teachBack: boolean): number {
  const value = 0.7 + (teachBack ? 0.12 : 0) - patient.contactDifficulty * 0.08;
  return Math.max(0.35, Math.min(0.95, value));
}

/** Simulator-side analogue of the case-board dropout model, using only cohort fields. */
export function simDropoutProbability(patient: SimPatient, attempts: number): number {
  const weights = RISK_WEIGHTS;
  const logit =
    RISK_INTERCEPT +
    weights.delayWeeks.weight * Math.min(patient.referralDay / 7, 12) +
    weights.failedContacts.weight * Math.min(2, attempts) +
    weights.unacknowledged.weight * (attempts === 0 ? 1 : 0) +
    weights.femaleSlot.weight * (patient.femalePref ? 1 : 0) +
    weights.ageBand.weight * Math.min(Math.max(patient.age - 45, 0) / 10, 4) +
    weights.female.weight * (patient.sex === "F" ? 1 : 0);
  return sigmoid(logit);
}

/** Expected change from one call: P(dropout) × P(reached) × P(attend | reached, teach-back) − residual completion without the call. */
export function upliftScore(patient: SimPatient, policy: ResourcePolicy, attempts: number): number {
  const pDrop = simDropoutProbability(patient, attempts);
  const pReach = contactProbability(patient, policy, attempts);
  const pAttend = attendProbability(patient, policy.teachBack);
  const baseline = (1 - pDrop) * attendProbability(patient, false) * 0.15;
  return pDrop * pReach * pAttend - baseline;
}

interface RecordTime {
  eventDay: number | null;
  censorDay: number;
}

export function kaplanMeier(records: RecordTime[], horizon = HORIZON): KmResult {
  const buckets = new Map<number, { events: number; censored: number }>();
  for (const record of records) {
    const eventInWindow = record.eventDay !== null && record.eventDay <= horizon && record.eventDay <= record.censorDay;
    if (eventInWindow && record.eventDay !== null) {
      const bucket = buckets.get(record.eventDay) ?? { events: 0, censored: 0 };
      bucket.events += 1;
      buckets.set(record.eventDay, bucket);
    } else {
      const day = Math.min(record.censorDay, horizon);
      const bucket = buckets.get(day) ?? { events: 0, censored: 0 };
      bucket.censored += 1;
      buckets.set(day, bucket);
    }
  }
  let atRisk = records.length;
  let survival = 1;
  const curve: KmPoint[] = [{ day: 0, survival: 1, cumulativeIncidence: 0, atRisk }];
  for (const day of [...buckets.keys()].sort((a, b) => a - b)) {
    const bucket = buckets.get(day)!;
    if (atRisk > 0 && bucket.events > 0) survival *= 1 - bucket.events / atRisk;
    atRisk -= bucket.events + bucket.censored;
    curve.push({ day, survival, cumulativeIncidence: 1 - survival, atRisk: Math.max(0, atRisk) });
  }
  const atPoint = [...curve].reverse().find((point) => point.day <= horizon);
  return {
    curve,
    atHorizon: atPoint ? atPoint.cumulativeIncidence : null,
    medianDay: kmQuantile(curve, 0.5),
    p90Day: kmQuantile(curve, 0.9),
    estimator: "Kaplan–Meier",
  };
}

export function kmQuantile(curve: KmPoint[], q: number): number | null {
  for (const point of curve) {
    if (point.cumulativeIncidence >= q - 1e-9) return point.day;
  }
  return null;
}

function rate(completed: number, n: number): number | null {
  if (n < 30) return null;
  return completed / n;
}

function summarize(
  policyId: string,
  patients: SimPatient[],
  doneDay: Int16Array,
  censored: Uint8Array,
  booked: Uint8Array,
  contactedDay: Int16Array,
  destination: Int16Array,
  dailySlots: number[],
  exampleIds: string[],
  includeContact: boolean,
  horizon = HORIZON,
  facilityIds: string[] = BASE_FACILITIES.map((facility) => facility.id),
): SimSummary {
  const records: RecordTime[] = patients.map((patient, index) => ({
    eventDay: doneDay[index] >= 0 ? doneDay[index] : null,
    censorDay: censored[index] ? patient.censorDay : HORIZON,
  }));
  const km = kaplanMeier(records);
  let completed = 0;
  let censoredCount = 0;
  let stillWaiting = 0;
  let contactedBy14 = 0;
  let bookedCount = 0;
  const origin = new Map<string, { n: number; completed: number }>();
  const dest = new Map<string, { n: number; completed: number }>();
  const language = { ar: { n: 0, completed: 0 }, en: { n: 0, completed: 0 } };
  const priority = { tier3: { n: 0, completed: 0 }, routine: { n: 0, completed: 0 } };
  patients.forEach((patient, index) => {
    const didComplete = doneDay[index] >= 0;
    if (didComplete) completed += 1;
    else if (censored[index]) censoredCount += 1;
    else stillWaiting += 1;
    if (booked[index]) bookedCount += 1;
    if (includeContact && contactedDay[index] >= 0 && contactedDay[index] <= 14) contactedBy14 += 1;
    const originRow = origin.get(patient.originId) ?? { n: 0, completed: 0 };
    originRow.n += 1;
    if (didComplete) originRow.completed += 1;
    origin.set(patient.originId, originRow);
    if (destination[index] >= 0) {
      const id = facilityIds[destination[index]] ?? `facility-${destination[index]}`;
      const row = dest.get(id) ?? { n: 0, completed: 0 };
      row.n += 1;
      if (didComplete) row.completed += 1;
      dest.set(id, row);
    }
    const lang = patient.language === "ar" ? language.ar : language.en;
    lang.n += 1;
    if (didComplete) lang.completed += 1;
    if (patient.priority === 3) {
      priority.tier3.n += 1;
      if (didComplete && doneDay[index] <= 30) priority.tier3.completed += 1;
    }
    if (patient.priority === 1) {
      priority.routine.n += 1;
      if (didComplete && doneDay[index] <= 30) priority.routine.completed += 1;
    }
  });
  const arRate = rate(language.ar.completed, language.ar.n);
  const enRate = rate(language.en.completed, language.en.n);
  const tier3Rate = rate(priority.tier3.completed, priority.tier3.n);
  const routineRate = rate(priority.routine.completed, priority.routine.n);
  const observed: number[] = [];
  patients.forEach((_, index) => {
    if (doneDay[index] >= 0) observed.push(doneDay[index]);
  });
  observed.sort((a, b) => a - b);
  const observedQuantile = (q: number) => {
    if (observed.length === 0) return null;
    const pos = (observed.length - 1) * q;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    if (lo === hi) return observed[lo];
    return observed[lo] * (hi - pos) + observed[hi] * (pos - lo);
  };
  const examples: Record<string, ExampleOutcome> = {};
  for (const id of exampleIds) {
    const index = patients.findIndex((patient) => patient.id === id);
    if (index < 0) continue;
    examples[id] = {
      id,
      destinationId: destination[index] >= 0 ? facilityIds[destination[index]] ?? null : null,
      booked: Boolean(booked[index]),
      eventDay: doneDay[index] >= 0 ? doneDay[index] : null,
      censored: Boolean(censored[index]),
    };
  }
  return {
    policyId,
    n: patients.length,
    completed,
    censored: censoredCount,
    stillWaiting,
    contactedBy14: includeContact ? contactedBy14 : null,
    booked: bookedCount,
    km,
    language: arRate === null || enRate === null ? null : { arRate, enRate, gap: arRate - enRate, nAr: language.ar.n, nEn: language.en.n },
    priorityGap:
      tier3Rate === null || routineRate === null
        ? null
        : { tier3Rate, routineRate, gap: tier3Rate - routineRate, nTier3: priority.tier3.n, nRoutine: priority.routine.n },
    byOrigin: [...origin.entries()].map(([id, row]) => ({ id, n: row.n, completed: row.completed, rate: row.n ? row.completed / row.n : null })),
    byDestination: [...dest.entries()].map(([id, row]) => ({ id, n: row.n, completed: row.completed, rate: row.n ? row.completed / row.n : null })),
    examples,
    dailySlots,
    totalSlotDays: dailySlots.reduce((sum, value) => sum + value, 0) * (horizon + 1),
    observedWaits: {
      n: observed.length,
      median: observedQuantile(0.5),
      p90: observed.length >= 5 ? observedQuantile(0.9) : null,
    },
  };
}

export function simulateResource(patients: SimPatient[], policy: ResourcePolicy, exampleIds: string[] = []): SimSummary {
  const n = patients.length;
  const status = new Uint8Array(n);
  const attempts = new Uint8Array(n);
  const contactedDay = new Int16Array(n).fill(-1);
  const doneDay = new Int16Array(n).fill(-1);
  const procedureDay = new Int16Array(n).fill(-1);
  const censored = new Uint8Array(n);
  const booked = new Uint8Array(n);
  const retried = new Uint8Array(n);
  const destination = new Int16Array(n).fill(-1);
  const compareWaiting = (a: number, b: number) =>
    patients[b].priority - patients[a].priority || retried[a] - retried[b] || patients[a].index - patients[b].index;
  const dailySlots = scaleSlots(BASE_FACILITIES.map((facility) => facility.dailySlots), policy.slotScale);

  for (let day = 0; day <= HORIZON; day += 1) {
    for (let index = 0; index < n; index += 1) {
      if (status[index] !== 2 || procedureDay[index] !== day) continue;
      const probability = attendProbability(patients[index], policy.teachBack);
      const roll = retried[index] ? patients[index].attendRoll2 : patients[index].attendRoll;
      if (roll < probability) {
        status[index] = 3;
        doneDay[index] = day;
      } else if (!retried[index]) {
        retried[index] = 1;
        status[index] = 1;
        booked[index] = 0;
      } else {
        status[index] = 5;
        booked[index] = 0;
      }
    }
    for (let index = 0; index < n; index += 1) {
      if (status[index] === 3 || censored[index]) continue;
      if (patients[index].censorDay <= day) {
        status[index] = 4;
        censored[index] = 1;
      }
    }
    const callQueue: number[] = [];
    for (let index = 0; index < n; index += 1) {
      if (status[index] === 0 && attempts[index] < 4) callQueue.push(index);
    }
    callQueue.sort((a, b) => {
      if (policy.strategy === "risk") return patients[b].priority - patients[a].priority || patients[b].fit - patients[a].fit || a - b;
      if (policy.strategy === "benefit") {
        return upliftScore(patients[b], policy, attempts[b]) - upliftScore(patients[a], policy, attempts[a]) || a - b;
      }
      return a - b;
    });
    const calls = Math.min(policy.callsPerDay, callQueue.length);
    for (let k = 0; k < calls; k += 1) {
      const index = callQueue[k];
      const attempt = attempts[index];
      attempts[index] += 1;
      if (patients[index].contactRoll < contactProbability(patients[index], policy, attempt)) {
        status[index] = 1;
        contactedDay[index] = day;
      }
    }
    const slots = dailySlots.slice();
    const waiting: number[] = [];
    for (let index = 0; index < n; index += 1) if (status[index] === 1) waiting.push(index);
    waiting.sort(compareWaiting);
    for (const index of waiting) {
      const facility = patients[index].designated;
      if (!hasBit(patients[index].eligibleMask, facility)) continue;
      if (slots[facility] <= 0) continue;
      slots[facility] -= 1;
      status[index] = 2;
      booked[index] = 1;
      destination[index] = facility;
      procedureDay[index] = Math.min(HORIZON, day + 2);
    }
  }
  return summarize(policy.id, patients, doneDay, censored, booked, contactedDay, destination, dailySlots, exampleIds, true);
}

export type RoutingPolicyId = "current" | "shortest_displayed" | "capacity_aware";

export function simulateRouting(
  patients: SimPatient[],
  policyId: RoutingPolicyId,
  facilities: SimFacility[] = BASE_FACILITIES,
  exampleIds: string[] = [],
  horizon = HORIZON,
): SimSummary {
  const n = patients.length;
  const status = new Uint8Array(n);
  const doneDay = new Int16Array(n).fill(-1);
  const procedureDay = new Int16Array(n).fill(-1);
  const censored = new Uint8Array(n);
  const booked = new Uint8Array(n);
  const retried = new Uint8Array(n);
  const assigned = new Int16Array(n).fill(-1);
  const compareWaiting = (a: number, b: number) =>
    patients[b].priority - patients[a].priority || retried[a] - retried[b] || patients[a].referralDay - patients[b].referralDay || patients[a].index - patients[b].index;
  const destination = new Int16Array(n).fill(-1);
  const dailySlots = facilities.map((facility) => facility.dailySlots);

  const eligibleIndexes = patients.map((patient) => {
    if (patient.eligibleIds && patient.eligibleIds.length > 0) {
      return patient.eligibleIds
        .map((id) => facilities.findIndex((facility) => facility.id === id))
        .filter((index) => index >= 0);
    }
    const indexes: number[] = [];
    facilities.forEach((facility, index) => {
      const baseIndex = facilities === BASE_FACILITIES ? index : BASE_FACILITIES.findIndex((item) => item.id === facility.id);
      if (baseIndex >= 0 && hasBit(patient.eligibleMask, baseIndex)) indexes.push(index);
    });
    return indexes;
  });

  for (let day = 0; day <= horizon; day += 1) {
    for (let index = 0; index < n; index += 1) {
      if (status[index] !== 2 || procedureDay[index] !== day) continue;
      if (patients[index].attendRoll < 0.82) {
        status[index] = 3;
        doneDay[index] = day;
      } else if (!retried[index]) {
        retried[index] = 1;
        status[index] = 1;
        booked[index] = 0;
      } else {
        status[index] = 5;
        booked[index] = 0;
      }
    }
    for (let index = 0; index < n; index += 1) {
      if (status[index] === 3 || censored[index]) continue;
      if (day < patients[index].referralDay) continue;
      if (patients[index].censorDay <= day) {
        status[index] = 4;
        censored[index] = 1;
      }
    }
    const slots = dailySlots.slice();
    if (policyId === "capacity_aware") {
      const waiting: number[] = [];
      for (let index = 0; index < n; index += 1) {
        if (censored[index] || status[index] === 3 || status[index] === 2) continue;
        if (patients[index].referralDay <= day) waiting.push(index);
      }
      waiting.sort(compareWaiting);
      for (const index of waiting) {
        let choice = -1;
        let bestSlots = 0;
        let bestPref = -1;
        for (const facility of eligibleIndexes[index]) {
          if (slots[facility] <= 0) continue;
          const pref = patients[index].femalePref && facilities[facility].femaleTeam ? 1 : 0;
          if (slots[facility] > bestSlots || (slots[facility] === bestSlots && pref > bestPref) || (slots[facility] === bestSlots && pref === bestPref && (choice < 0 || facility < choice))) {
            choice = facility;
            bestSlots = slots[facility];
            bestPref = pref;
          }
        }
        if (choice < 0) continue;
        slots[choice] -= 1;
        status[index] = 2;
        booked[index] = 1;
        assigned[index] = choice;
        destination[index] = choice;
        procedureDay[index] = Math.min(horizon, day + 2);
      }
    } else {
      const arrivals: number[] = [];
      for (let index = 0; index < n; index += 1) {
        if (patients[index].referralDay !== day || censored[index] || status[index] === 3) continue;
        arrivals.push(index);
      }
      arrivals.sort((a, b) => a - b);
      const queueSize = new Array(facilities.length).fill(0);
      for (let index = 0; index < n; index += 1) if (assigned[index] >= 0 && status[index] === 1) queueSize[assigned[index]] += 1;
      for (const index of arrivals) {
        const options = eligibleIndexes[index];
        let choice = options[0] ?? 0;
        if (policyId === "current") {
          const designated = Math.min(patients[index].designated, facilities.length - 1);
          choice = options.includes(designated) ? designated : options[0] ?? designated;
        } else {
          let best = Number.POSITIVE_INFINITY;
          for (const facility of options) {
            const displayed = queueSize[facility] / Math.max(1, dailySlots[facility]);
            if (displayed < best || (displayed === best && facility < choice)) {
              best = displayed;
              choice = facility;
            }
          }
        }
        assigned[index] = choice;
        destination[index] = choice;
        queueSize[choice] += 1;
        status[index] = 1;
      }
      for (let facility = 0; facility < facilities.length; facility += 1) {
        const waiting: number[] = [];
        for (let index = 0; index < n; index += 1) if (status[index] === 1 && assigned[index] === facility) waiting.push(index);
        waiting.sort(compareWaiting);
        const take = Math.min(slots[facility], waiting.length);
        for (let k = 0; k < take; k += 1) {
          const index = waiting[k];
          status[index] = 2;
          booked[index] = 1;
          procedureDay[index] = Math.min(horizon, day + 2);
        }
      }
    }
  }
  const contactedDay = new Int16Array(n).fill(-1);
  return summarize(
    policyId,
    patients,
    doneDay,
    censored,
    booked,
    contactedDay,
    destination,
    dailySlots,
    exampleIds,
    false,
    horizon,
    facilities.map((facility) => facility.id),
  );
}

export const RESOURCE_POLICIES: ResourcePolicy[] = [
  { id: "usual", label: "Usual care", callsPerDay: 6, slotScale: 1, teachBack: false, strategy: "fifo" },
  { id: "more_calls", label: "More navigator calls", callsPerDay: 12, slotScale: 1, teachBack: false, strategy: "benefit" },
  { id: "more_slots", label: "More slots", callsPerDay: 6, slotScale: 1.3, teachBack: false, strategy: "fifo" },
  { id: "both", label: "Calls and slots", callsPerDay: 12, slotScale: 1.3, teachBack: true, strategy: "benefit" },
];

export function navigationPolicy(callsPerDay: number, slotPercent: number, teachBack: boolean, strategy: ResourcePolicy["strategy"]): ResourcePolicy {
  return {
    id: "navigation",
    label: "Navigation experiment",
    callsPerDay,
    slotScale: 1 + slotPercent / 100,
    teachBack,
    strategy,
  };
}

export const BASELINE_POLICY: ResourcePolicy = {
  id: "baseline",
  label: "Baseline",
  callsPerDay: 6,
  slotScale: 1,
  teachBack: false,
  strategy: "fifo",
};
