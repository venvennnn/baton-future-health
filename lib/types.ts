export const AS_OF = "2025-11-24";
export const BOOKING_SLA_DAYS = 14;

export type Stage =
  | "result_issued"
  | "teach_back"
  | "referral"
  | "booking"
  | "pathology"
  | "closed";

export type HandoverStatus =
  | "not_sent"
  | "pending_acceptance"
  | "accepted"
  | "rejected_capacity"
  | "reverted"
  | "booked";

export type DelayReason =
  | "limited_slots"
  | "clinical_info"
  | "report_review"
  | "patient_reschedule"
  | "incomplete_referral"
  | "interpreter_transport"
  | "unknown";

export type SpanStage = "referral_acceptance" | "booking" | "report_review";

export type Priority = "routine" | "urgent" | "tier3";

export interface Facility {
  id: string;
  name: string;
  short: string;
  kind: "primary" | "endoscopy";
  region: string;
  femaleTeam: boolean;
  /** Approximate road distance from central Abu Dhabi, for synthetic display only. */
  kmFromCentre: number;
  /** Base protected endoscopy slots per day. Zero for primary care. */
  dailySlots: number;
}

export interface Span {
  stage: SpanStage;
  facilityId: string;
  startedOn: string;
  /** Null while the case is still in this stage. */
  endedOn: string | null;
  delayReason?: DelayReason;
  /** True only when the record says no eligible slot was available. */
  eligibleSlotConstraint?: boolean;
}

export interface CaseEvent {
  id: string;
  on: string;
  label: string;
  detail: string;
  actor: string;
  facilityId?: string;
  simulated?: boolean;
  kind:
    | "result"
    | "outreach"
    | "referral"
    | "rejection"
    | "accepted"
    | "booked"
    | "procedure"
    | "report"
    | "disposition"
    | "closure"
    | "note"
    | "simulated";
}

export interface OutreachTouch {
  id: string;
  on: string;
  channel: "call" | "sms" | "whatsapp" | "clinic";
  title: string;
  detail: string;
  outcome: string;
  simulated?: boolean;
}

export interface Sbar {
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
}

export interface ScreeningCase {
  id: string;
  name: string;
  nameAr?: string;
  initials: string;
  age: number;
  sex: "F" | "M";
  emiratesId: string;
  language: "ar" | "en";
  originFacilityId: string;
  facilityId: string;
  endoscopyFacilityId?: string;
  stage: Stage;
  ownerTeam: string;
  ownerName: string;
  navigator?: string;
  physician: string;
  handoverStatus: HandoverStatus;
  nextAction: string;
  fitUgG: number;
  priority: Priority;
  femaleTeamRequested: boolean;
  hardEligibleFacilityIds: string[];
  resultOn: string;
  procedureAttended: boolean;
  reportReceived: boolean;
  dispositionRecorded: boolean;
  /** Documented closure. Attendance alone never sets this. */
  closed: boolean;
  closurePendingReason?: string;
  delayReason?: DelayReason;
  eligibleSlotConstraint: boolean;
  spans: Span[];
  events: CaseEvent[];
  outreach: OutreachTouch[];
  sbar: Sbar;
  simulatedPending?: boolean;
  /** Browser-only story clock for the pitch case. Absent on the shared file. */
  demoDay?: number;
}

export const STAGE_ORDER: Stage[] = [
  "result_issued",
  "teach_back",
  "referral",
  "booking",
  "pathology",
  "closed",
];

export const STAGE_LABEL: Record<Stage, string> = {
  result_issued: "1. Result issued",
  teach_back: "2. Teach-back",
  referral: "3. Endoscopy referral",
  booking: "4. Booking pending",
  pathology: "5. Pathology",
  closed: "Documented closure",
};

export const HANDOVER_LABEL: Record<HandoverStatus, string> = {
  not_sent: "Not sent",
  pending_acceptance: "Pending acceptance",
  accepted: "Accepted",
  rejected_capacity: "Rejected — eligible-slot constraint",
  reverted: "Reverted to origin",
  booked: "Slot recorded",
};

export const DELAY_LABEL: Record<DelayReason, string> = {
  limited_slots: "Limited booking slots",
  clinical_info: "Additional clinical information needed",
  report_review: "Report review queue",
  patient_reschedule: "Patient rescheduling",
  incomplete_referral: "Referral details incomplete",
  interpreter_transport: "Needing interpreter / transport",
  unknown: "Unknown",
};

export const DELAY_ORDER: DelayReason[] = [
  "limited_slots",
  "clinical_info",
  "report_review",
  "patient_reschedule",
  "incomplete_referral",
  "interpreter_transport",
  "unknown",
];

export const SPAN_LABEL: Record<SpanStage, string> = {
  referral_acceptance: "Referral acceptance",
  booking: "Booking",
  report_review: "Report review",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  routine: "Routine",
  urgent: "Urgent",
  tier3: "Tier 3",
};

export function priorityRank(priority: Priority): number {
  if (priority === "tier3") return 3;
  if (priority === "urgent") return 2;
  return 1;
}
