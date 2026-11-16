import type { Facility } from "./types";

export const FACILITIES: Facility[] = [
  {
    id: "al-bateen",
    name: "Al Bateen Healthcare Centre",
    short: "Al Bateen",
    kind: "primary",
    region: "Abu Dhabi",
    femaleTeam: true,
    kmFromCentre: 4,
    dailySlots: 0,
  },
  {
    id: "madinat-zayed",
    name: "Madinat Zayed Clinic",
    short: "Madinat Zayed",
    kind: "primary",
    region: "Al Dhafra",
    femaleTeam: true,
    kmFromCentre: 12,
    dailySlots: 0,
  },
  {
    id: "al-mushrif",
    name: "Al Mushrif Clinic",
    short: "Al Mushrif",
    kind: "primary",
    region: "Abu Dhabi",
    femaleTeam: true,
    kmFromCentre: 8,
    dailySlots: 0,
  },
  {
    id: "khalifa-city-a",
    name: "Khalifa City A Clinic",
    short: "Khalifa City A",
    kind: "primary",
    region: "Abu Dhabi",
    femaleTeam: false,
    kmFromCentre: 22,
    dailySlots: 0,
  },
  {
    id: "al-ain-central",
    name: "Al Ain Central Clinic",
    short: "Al Ain Central",
    kind: "primary",
    region: "Al Ain",
    femaleTeam: true,
    kmFromCentre: 130,
    dailySlots: 0,
  },
  {
    id: "gi-unit-n",
    name: "GI Unit N",
    short: "GI Unit N",
    kind: "endoscopy",
    region: "Abu Dhabi",
    femaleTeam: true,
    kmFromCentre: 11,
    dailySlots: 3,
  },
  {
    id: "gi-unit-s",
    name: "GI Unit S",
    short: "GI Unit S",
    kind: "endoscopy",
    region: "Abu Dhabi",
    femaleTeam: false,
    kmFromCentre: 14,
    dailySlots: 1,
  },
  {
    id: "centre-p2",
    name: "Centre P2",
    short: "Centre P2",
    kind: "endoscopy",
    region: "Abu Dhabi",
    femaleTeam: true,
    kmFromCentre: 18,
    dailySlots: 2,
  },
  {
    id: "skmc",
    name: "Sheikh Khalifa Medical City",
    short: "SKMC",
    kind: "endoscopy",
    region: "Abu Dhabi",
    femaleTeam: false,
    kmFromCentre: 16,
    dailySlots: 2,
  },
  {
    id: "ccad",
    name: "Cleveland Clinic Abu Dhabi",
    short: "CCAD",
    kind: "endoscopy",
    region: "Abu Dhabi",
    femaleTeam: true,
    kmFromCentre: 9,
    dailySlots: 2,
  },
  {
    id: "bmc",
    name: "Burjeel Medical City",
    short: "BMC",
    kind: "endoscopy",
    region: "Mohamed Bin Zayed City",
    femaleTeam: true,
    kmFromCentre: 24,
    dailySlots: 1,
  },
  {
    id: "ssmc",
    name: "Sheikh Shakhbout Medical City",
    short: "SSMC",
    kind: "endoscopy",
    region: "Abu Dhabi",
    femaleTeam: true,
    kmFromCentre: 20,
    dailySlots: 2,
  },
  {
    id: "tawam",
    name: "Tawam Hospital",
    short: "Tawam",
    kind: "endoscopy",
    region: "Al Ain",
    femaleTeam: false,
    kmFromCentre: 128,
    dailySlots: 1,
  },
];

export const FACILITY_BY_ID = new Map(FACILITIES.map((facility) => [facility.id, facility]));

export const ENDOSCOPY_FACILITIES = FACILITIES.filter((facility) => facility.kind === "endoscopy");

export const PRIMARY_FACILITIES = FACILITIES.filter((facility) => facility.kind === "primary");

export function facilityName(id: string | undefined): string {
  if (!id) return "Unassigned";
  return FACILITY_BY_ID.get(id)?.name ?? id;
}

export function facilityShort(id: string | undefined): string {
  if (!id) return "Unassigned";
  return FACILITY_BY_ID.get(id)?.short ?? id;
}
