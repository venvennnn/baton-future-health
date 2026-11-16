import { addDays } from "./dates";
import { ENDOSCOPY_FACILITIES, FACILITY_BY_ID } from "./facilities";
import {
  AS_OF,
  type CaseEvent,
  type DelayReason,
  type HandoverStatus,
  type OutreachTouch,
  type Priority,
  type ScreeningCase,
  type Span,
  type SpanStage,
  type Stage,
  type Sbar,
} from "./types";

interface Spec {
  id: string;
  name: string;
  nameAr?: string;
  age: number;
  sex: "F" | "M";
  origin: string;
  stage: Stage;
  fit: number;
  priority: Priority;
  language: "ar" | "en";
  resultDaysAgo: number;
  physician: string;
  ownerTeam: string;
  ownerName: string;
  navigator?: string;
  femaleTeamRequested?: boolean;
  /** Facilities removed from the default endoscopy list. */
  excludeEligible?: string[];
  endoscopy?: string;
  referralSentDay?: number;
  decisionDay?: number;
  decision?: "accepted" | "rejected";
  bookedDay?: number;
  procedureDay?: number;
  reportDay?: number;
  dispositionDay?: number;
  delayReason?: DelayReason;
  eligibleSlotConstraint?: boolean;
  outreach?: OutreachTouch[];
  sbar?: Partial<Sbar>;
  extraEvents?: CaseEvent[];
}

const FIRST = ["Layla", "Omar", "Noor", "Hassan", "Amina", "Yousef", "Hessa", "Saeed", "Maitha", "Abdulla", "Shamma", "Hamad"];
const LAST = ["Al Mazrouei", "Al Shamsi", "Al Kaabi", "Al Suwaidi", "Al Muhairi", "Al Romaithi"];
const PHYSICIANS = ["Dr. Mona Al Hashimi", "Dr. Saeed Al Ketbi", "Dr. Huda Al Nahyan", "Dr. Yusuf Al Blooshi"];
const NAVIGATORS = ["Maha Mansoor, RN", "Rashed Al Ali, RN", "Noura Al Zaabi, RN"];

function initials(name: string): string {
  const parts = name.split(" ").filter((part) => part !== "Al" && part.length > 1);
  return ((parts[0]?.[0] ?? "B") + (parts[1]?.[0] ?? "T")).toUpperCase();
}

function eligibleFor(spec: Spec): string[] {
  const excluded = new Set(spec.excludeEligible ?? []);
  const ids = ENDOSCOPY_FACILITIES.map((facility) => facility.id).filter((id) => !excluded.has(id));
  return ids.length >= 2 ? ids : ENDOSCOPY_FACILITIES.map((facility) => facility.id);
}

function span(stage: SpanStage, facilityId: string, resultOn: string, startDay: number, endDay: number | null, spec: Spec): Span {
  return {
    stage,
    facilityId,
    startedOn: addDays(resultOn, startDay),
    endedOn: endDay === null ? null : addDays(resultOn, endDay),
    delayReason: endDay === null ? spec.delayReason : undefined,
    eligibleSlotConstraint: endDay === null ? spec.eligibleSlotConstraint : spec.eligibleSlotConstraint && spec.decision === "rejected",
  };
}

function build(spec: Spec): ScreeningCase {
  const resultOn = addDays(AS_OF, -spec.resultDaysAgo);
  const endoscopy = spec.endoscopy;
  const procedureAttended = spec.procedureDay !== undefined;
  const reportReceived = spec.reportDay !== undefined;
  const dispositionRecorded = spec.dispositionDay !== undefined;
  const closed = spec.stage === "closed" && procedureAttended && reportReceived && dispositionRecorded;
  const eligibleSlotConstraint = Boolean(spec.eligibleSlotConstraint);

  let handover: HandoverStatus = "not_sent";
  if (spec.bookedDay !== undefined) handover = "booked";
  else if (spec.decision === "rejected" && eligibleSlotConstraint) handover = "rejected_capacity";
  else if (spec.decision === "rejected") handover = "reverted";
  else if (spec.decision === "accepted") handover = "accepted";
  else if (spec.referralSentDay !== undefined) handover = "pending_acceptance";

  const spans: Span[] = [];
  if (spec.referralSentDay !== undefined && endoscopy) {
    const end = spec.decisionDay ?? null;
    spans.push(span("referral_acceptance", endoscopy, resultOn, spec.referralSentDay, end, spec));
  }
  if (spec.decision === "accepted" && spec.decisionDay !== undefined && endoscopy) {
    spans.push(span("booking", endoscopy, resultOn, spec.decisionDay, spec.bookedDay ?? null, spec));
  }
  if (procedureAttended && spec.procedureDay !== undefined && endoscopy) {
    spans.push(span("report_review", endoscopy, resultOn, spec.procedureDay, spec.reportDay ?? null, spec));
  }

  const events: CaseEvent[] = [
    {
      id: `${spec.id}-result`,
      on: resultOn,
      kind: "result",
      label: "Positive FIT registered",
      detail: `${spec.fit} µg/g recorded at ${FACILITY_BY_ID.get(spec.origin)?.name ?? spec.origin}. Synthetic lab event.`,
      actor: spec.physician,
      facilityId: spec.origin,
    },
  ];

  if (spec.referralSentDay !== undefined && endoscopy) {
    events.push({
      id: `${spec.id}-refer`,
      on: addDays(resultOn, spec.referralSentDay),
      kind: "referral",
      label: "Endoscopy referral recorded",
      detail: `Referral recorded toward ${FACILITY_BY_ID.get(endoscopy)?.name}. This demo does not transmit a ServiceRequest.`,
      actor: spec.ownerName,
      facilityId: endoscopy,
    });
  }
  if (spec.decision === "rejected" && spec.decisionDay !== undefined && endoscopy) {
    events.push({
      id: `${spec.id}-reject`,
      on: addDays(resultOn, spec.decisionDay),
      kind: "rejection",
      label: eligibleSlotConstraint ? "Referral rejected — no eligible slot" : "Referral returned",
      detail: eligibleSlotConstraint
        ? "The case file records an eligible-slot constraint: the patient was eligible and no slot remained inside the booking window."
        : "Returned to the origin team. No eligible-slot constraint is recorded.",
      actor: FACILITY_BY_ID.get(endoscopy)?.short ?? endoscopy,
      facilityId: endoscopy,
    });
  }
  if (spec.decision === "accepted" && spec.decisionDay !== undefined && endoscopy) {
    events.push({
      id: `${spec.id}-accept`,
      on: addDays(resultOn, spec.decisionDay),
      kind: "accepted",
      label: "Referral acceptance recorded",
      detail: `Acceptance recorded at ${FACILITY_BY_ID.get(endoscopy)?.name}.`,
      actor: "Receiving team",
      facilityId: endoscopy,
    });
  }
  if (spec.bookedDay !== undefined && endoscopy) {
    events.push({
      id: `${spec.id}-book`,
      on: addDays(resultOn, spec.bookedDay),
      kind: "booked",
      label: "Booking recorded",
      detail: "A slot is recorded in the synthetic file. This is not a live appointment confirmation.",
      actor: "Booking team",
      facilityId: endoscopy,
    });
  }
  if (spec.procedureDay !== undefined && endoscopy) {
    events.push({
      id: `${spec.id}-proc`,
      on: addDays(resultOn, spec.procedureDay),
      kind: "procedure",
      label: "Procedure attended",
      detail: "Colonoscopy attendance is recorded. Attendance is not documented closure.",
      actor: "Endoscopy team",
      facilityId: endoscopy,
    });
  }
  if (spec.reportDay !== undefined) {
    events.push({
      id: `${spec.id}-report`,
      on: addDays(resultOn, spec.reportDay),
      kind: "report",
      label: "Procedure report recorded",
      detail: "Synthetic report receipt. Histology is not independently verified here.",
      actor: "GI consultant",
      facilityId: endoscopy,
    });
  }
  if (spec.dispositionDay !== undefined) {
    events.push({
      id: `${spec.id}-disp`,
      on: addDays(resultOn, spec.dispositionDay),
      kind: "disposition",
      label: "Disposition recorded",
      detail: "A disposition is present in the synthetic file.",
      actor: spec.physician,
      facilityId: spec.origin,
    });
  }
  if (closed && spec.dispositionDay !== undefined) {
    events.push({
      id: `${spec.id}-close`,
      on: addDays(resultOn, spec.dispositionDay),
      kind: "closure",
      label: "Documented closure",
      detail: "Closure recorded because procedure attendance, the report, and a disposition are all present.",
      actor: spec.ownerName,
      facilityId: spec.origin,
    });
  }
  if (spec.extraEvents) events.push(...spec.extraEvents);

  const atReceiver =
    Boolean(endoscopy) &&
    (handover === "pending_acceptance" ||
      handover === "accepted" ||
      handover === "booked" ||
      procedureAttended ||
      spec.stage === "pathology" ||
      spec.stage === "closed");
  const openSpan = spans.find((item) => item.endedOn === null);
  let nextAction = "Review the synthetic pathway and record the next local note.";
  if (spec.stage === "result_issued") nextAction = "Navigator to contact the patient and explain the positive result.";
  if (spec.stage === "teach_back") nextAction = "Complete teach-back and confirm the patient can prepare for colonoscopy.";
  if (spec.stage === "referral" && handover === "rejected_capacity") nextAction = "Choose another eligible facility. A simulated request is not a live referral.";
  else if (spec.stage === "referral" && handover === "not_sent") nextAction = "Origin clinician to sign the referral. Nothing has been sent.";
  else if (spec.stage === "referral") nextAction = "Receiving team to accept or return the referral.";
  if (spec.stage === "booking") nextAction = handover === "booked" ? "Confirm the patient can attend the recorded slot." : "Booking team to place the patient in an eligible slot.";
  if (spec.stage === "pathology" && !reportReceived) nextAction = "Report is outstanding. Closure stays pending.";
  if (spec.stage === "pathology" && reportReceived && !dispositionRecorded) nextAction = "Disposition is outstanding. Closure stays pending.";
  if (closed) nextAction = "No open action. Surveillance interval is recorded in the synthetic file.";

  let closurePendingReason: string | undefined;
  if (!closed) {
    if (!procedureAttended) closurePendingReason = "Procedure not attended.";
    else if (!reportReceived) closurePendingReason = "Procedure attended. Report is outstanding, so closure stays pending.";
    else if (!dispositionRecorded) closurePendingReason = "Report is in. Disposition is outstanding, so closure stays pending.";
    else closurePendingReason = "Configured closure evidence is incomplete.";
  }

  const originName = FACILITY_BY_ID.get(spec.origin)?.name ?? spec.origin;
  const sbar: Sbar = {
    situation: spec.sbar?.situation ?? `${spec.age}-year-old ${spec.sex === "F" ? "woman" : "man"} with FIT ${spec.fit} µg/g at ${originName}.`,
    background: spec.sbar?.background ?? "Synthetic background. No live record was retrieved.",
    assessment: spec.sbar?.assessment ?? `Current stage is ${spec.stage.replaceAll("_", " ")}. Priority is ${spec.priority}.`,
    recommendation: spec.sbar?.recommendation ?? nextAction,
  };

  const numeric = Number(spec.id.replace(/\D/g, "")) || 1;
  return {
    id: spec.id,
    name: spec.name,
    nameAr: spec.nameAr,
    initials: initials(spec.name),
    age: spec.age,
    sex: spec.sex,
    emiratesId: `784-0000-${String(1000000 + (numeric % 9000000)).padStart(7, "0")}-0`,
    language: spec.language,
    originFacilityId: spec.origin,
    facilityId: atReceiver && endoscopy ? endoscopy : spec.origin,
    endoscopyFacilityId: endoscopy,
    stage: spec.stage,
    ownerTeam: spec.ownerTeam,
    ownerName: spec.ownerName,
    navigator: spec.navigator,
    physician: spec.physician,
    handoverStatus: handover,
    nextAction,
    fitUgG: spec.fit,
    priority: spec.priority,
    femaleTeamRequested: Boolean(spec.femaleTeamRequested),
    hardEligibleFacilityIds: eligibleFor(spec),
    resultOn,
    procedureAttended,
    reportReceived,
    dispositionRecorded,
    closed,
    closurePendingReason,
    delayReason: closed ? undefined : spec.delayReason,
    eligibleSlotConstraint: !closed && eligibleSlotConstraint && (handover === "rejected_capacity" || Boolean(openSpan)),
    spans,
    events: events.sort((a, b) => a.on.localeCompare(b.on) || a.id.localeCompare(b.id)),
    outreach: spec.outreach ?? [],
    sbar,
  };
}

const NARRATIVE: Spec[] = [
  {
    id: "FIT-26771",
    name: "Fatima Al Hosani",
    nameAr: "فاطمة الحوسني",
    age: 54,
    sex: "F",
    origin: "al-bateen",
    stage: "referral",
    fit: 142,
    priority: "tier3",
    language: "ar",
    resultDaysAgo: 27,
    physician: "Dr. Khalid Al Nuaimi",
    ownerTeam: "Primary coordinator",
    ownerName: "Dr. Khalid Al Nuaimi",
    navigator: "Maha Mansoor, RN",
    femaleTeamRequested: true,
    endoscopy: "gi-unit-e",
    referralSentDay: 1,
    decisionDay: 5,
    decision: "rejected",
    delayReason: "limited_slots",
    eligibleSlotConstraint: true,
    outreach: [
      {
        id: "FIT-26771-o1",
        on: "2025-10-29",
        channel: "call",
        title: "Outbound call (no answer)",
        detail: "Synthetic log: first call rang out. No live call is placed from this demo.",
        outcome: "No answer",
      },
      {
        id: "FIT-26771-o2",
        on: "2025-10-29",
        channel: "sms",
        title: "Result message logged",
        detail: "عزيزتي فاطمة، نتيجة فحص FIT متوفرة. يرجى التواصل مع عيادة البطين لمتابعة الرعاية الوقائية.",
        outcome: "Logged as delivered in the synthetic file",
      },
      {
        id: "FIT-26771-o3",
        on: "2025-11-04",
        channel: "call",
        title: "Navigator call logged",
        detail: "Maha spoke with Fatima in the synthetic note. Fatima asked for a female endoscopy team and described anxiety about sedation.",
        outcome: "Anxiety barrier · female team requested",
      },
    ],
    sbar: {
      situation: "54-year-old woman with FIT 142 µg/g. Diagnostic colonoscopy is the recorded next procedure. GI Unit E returned the referral after recording that no eligible slot remained inside the window.",
      background: "Asymptomatic in the synthetic note. Maternal history of colonic polyps is listed. Hypertension is listed as controlled. No anticoagulant is listed.",
      assessment: "The case remains open at endoscopy referral. Teach-back is partial. Closure evidence is absent because the procedure has not happened.",
      recommendation: "Record a simulated handover request to an eligible facility with a shorter open queue, then place a local Arabic teach-back note. Do not read a simulated click as a transmitted referral.",
    },
    extraEvents: [
      {
        id: "FIT-26771-policy",
        on: "2025-11-02",
        kind: "note",
        label: "Returned to the primary coordinator",
        detail: "The synthetic pathway marks the case ready for a new destination. No second referral has been transmitted.",
        actor: "Baton demo",
        facilityId: "al-bateen",
      },
    ],
  },
  {
    id: "FIT-26780",
    name: "Ahmed Mansoor Al Zaabi",
    age: 61,
    sex: "M",
    origin: "madinat-zayed",
    stage: "booking",
    fit: 88,
    priority: "urgent",
    language: "ar",
    resultDaysAgo: 20,
    physician: "Dr. Mona Al Hashimi",
    ownerTeam: "Centre P1 booking team",
    ownerName: "Booking team",
    navigator: "Rashed Al Ali, RN",
    endoscopy: "centre-p1",
    referralSentDay: 2,
    decisionDay: 3,
    decision: "accepted",
    bookedDay: 6,
    outreach: [
      {
        id: "FIT-26780-o1",
        on: "2025-11-06",
        channel: "call",
        title: "Prep call logged",
        detail: "Synthetic note: patient repeated the prep instructions.",
        outcome: "Teach-back recorded",
      },
    ],
  },
  {
    id: "FIT-26764",
    name: "Salma Al Mehairbi",
    age: 49,
    sex: "F",
    origin: "al-mushrif",
    stage: "teach_back",
    fit: 210,
    priority: "tier3",
    language: "ar",
    resultDaysAgo: 12,
    physician: "Dr. Huda Al Nahyan",
    ownerTeam: "Navigator team",
    ownerName: "Noura Al Zaabi, RN",
    navigator: "Noura Al Zaabi, RN",
    femaleTeamRequested: true,
    delayReason: "interpreter_transport",
    outreach: [
      {
        id: "FIT-26764-o1",
        on: "2025-11-14",
        channel: "call",
        title: "Call attempt logged",
        detail: "Synthetic note: number rang out.",
        outcome: "No answer",
      },
      {
        id: "FIT-26764-o2",
        on: "2025-11-16",
        channel: "call",
        title: "Second call attempt logged",
        detail: "Synthetic note: number still unverified.",
        outcome: "No answer",
      },
    ],
  },
  {
    id: "FIT-26752",
    name: "Rashid Al Ketbi",
    age: 57,
    sex: "M",
    origin: "khalifa-city-a",
    stage: "referral",
    fit: 94,
    priority: "urgent",
    language: "ar",
    resultDaysAgo: 6,
    physician: "Dr. Mona Al Hashimi",
    ownerTeam: "Origin clinic",
    ownerName: "Dr. Mona Al Hashimi",
    navigator: "Maha Mansoor, RN",
    endoscopy: "gi-unit-n",
    sbar: {
      situation: "57-year-old man with FIT 94 µg/g. The referral is drafted and not sent.",
      background: "Synthetic file lists no prior colonoscopy.",
      assessment: "Waiting for origin sign-off.",
      recommendation: "Origin clinician signs the referral before any destination is contacted.",
    },
  },
  {
    id: "FIT-26749",
    name: "Mariam Al Dhaheri",
    age: 68,
    sex: "F",
    origin: "al-ain-central",
    stage: "closed",
    fit: 76,
    priority: "routine",
    language: "ar",
    resultDaysAgo: 70,
    physician: "Dr. Yusuf Al Blooshi",
    ownerTeam: "Screening programme",
    ownerName: "Programme clerk",
    navigator: "Rashed Al Ali, RN",
    endoscopy: "gi-unit-a",
    referralSentDay: 2,
    decisionDay: 4,
    decision: "accepted",
    bookedDay: 12,
    procedureDay: 16,
    reportDay: 24,
    dispositionDay: 30,
    sbar: {
      situation: "Procedure attended and the synthetic file contains both a report and a 3-year surveillance disposition.",
      background: "Origin clinic is Al Ain Central.",
      assessment: "Documented closure is present. Attendance and closure are both recorded, as separate events.",
      recommendation: "No open chase action in the synthetic file.",
    },
  },
];

const OPEN_QUEUE: Spec[] = [
  ["FIT-26811", "GI booking", "gi-unit-s", "booking", 18, "limited_slots", false],
  ["FIT-26812", "GI booking", "gi-unit-s", "booking", 14, "patient_reschedule", false],
  ["FIT-26813", "GI booking", "gi-unit-s", "booking", 11, "unknown", false],
  ["FIT-26814", "GI report", "gi-unit-s", "pathology", 16, "report_review", false],
  ["FIT-26815", "GI report", "gi-unit-s", "pathology", 12, "report_review", false],
  ["FIT-26821", "North booking", "gi-unit-n", "booking", 5, "clinical_info", false],
  ["FIT-26822", "North acceptance", "gi-unit-n", "referral", 4, "incomplete_referral", false],
  ["FIT-26823", "North report", "gi-unit-n", "pathology", 3, "report_review", false],
  ["FIT-26831", "P2 booking", "centre-p2", "booking", 6, "limited_slots", true],
  ["FIT-26832", "P2 acceptance", "centre-p2", "referral", 2, "unknown", false],
  ["FIT-26833", "P2 report", "centre-p2", "pathology", 4, "clinical_info", false],
  ["FIT-26841", "GI Unit E booking", "gi-unit-e", "booking", 9, "limited_slots", false],
  ["FIT-26842", "Centre P1 booking", "centre-p1", "booking", 2, "unknown", false],
  ["FIT-26843", "GI Unit A booking", "gi-unit-a", "booking", 7, "interpreter_transport", false],
].map((row, index) => {
  const [id, label, endoscopy, stage, ageDays, reason, slot] = row;
  const stageName = stage as Stage;
  const sent = 1;
  const decided = stageName === "referral" ? undefined : 2;
  const spec: Spec = {
    id: id as string,
    name: `${FIRST[index % FIRST.length]} ${LAST[index % LAST.length]}`,
    age: 46 + (index % 20),
    sex: index % 2 === 0 ? "F" : "M",
    origin: index % 2 === 0 ? "al-bateen" : "al-mushrif",
    stage: stageName,
    fit: 40 + index * 7,
    priority: index % 5 === 0 ? "tier3" : index % 2 === 0 ? "urgent" : "routine",
    language: index % 3 === 0 ? "en" : "ar",
    resultDaysAgo: (ageDays as number) + (stageName === "pathology" ? 6 : stageName === "referral" ? 1 : 2),
    physician: PHYSICIANS[index % PHYSICIANS.length],
    ownerTeam: stageName === "pathology" ? "GI consultant" : stageName === "booking" ? "Booking team" : "Receiving team",
    ownerName: stageName === "pathology" ? "GI consultant" : "Booking team",
    navigator: NAVIGATORS[index % NAVIGATORS.length],
    endoscopy: endoscopy as string,
    referralSentDay: sent,
    decision: stageName === "referral" ? undefined : "accepted",
    decisionDay: decided,
    delayReason: reason as DelayReason,
    eligibleSlotConstraint: Boolean(slot),
    femaleTeamRequested: index % 2 === 0,
  };
  if (stageName === "booking") {
    spec.decisionDay = 2;
    spec.decision = "accepted";
  }
  if (stageName === "pathology") {
    spec.decisionDay = 2;
    spec.decision = "accepted";
    spec.bookedDay = 4;
    spec.procedureDay = 6;
    if (id === "FIT-26815") spec.reportDay = 9;
  }
  spec.sbar = {
    situation: `${label} synthetic case ${id}.`,
    background: "Generated from the shared screening fixture.",
    assessment: spec.eligibleSlotConstraint
      ? "An eligible-slot constraint is explicitly recorded."
      : "No eligible-slot constraint is recorded.",
    recommendation: "Open the case from the worklist. Actions stay inside the demo log.",
  };
  return spec;
});

interface ClosedSpan {
  facility: string;
  accept: number;
  book: number;
  report: number;
}

const CLOSED_SPANS: ClosedSpan[] = [
  { facility: "gi-unit-s", accept: 1, book: 4, report: 2 },
  { facility: "gi-unit-s", accept: 2, book: 6, report: 3 },
  { facility: "gi-unit-s", accept: 1, book: 8, report: 4 },
  { facility: "gi-unit-s", accept: 2, book: 9, report: 5 },
  { facility: "gi-unit-s", accept: 1, book: 12, report: 6 },
  { facility: "gi-unit-s", accept: 3, book: 15, report: 8 },
  { facility: "gi-unit-n", accept: 1, book: 3, report: 2 },
  { facility: "gi-unit-n", accept: 1, book: 4, report: 2 },
  { facility: "gi-unit-n", accept: 2, book: 4, report: 3 },
  { facility: "gi-unit-n", accept: 1, book: 5, report: 2 },
  { facility: "gi-unit-n", accept: 2, book: 6, report: 3 },
  { facility: "gi-unit-n", accept: 1, book: 7, report: 4 },
  { facility: "centre-p2", accept: 1, book: 3, report: 2 },
  { facility: "centre-p2", accept: 1, book: 4, report: 2 },
  { facility: "centre-p2", accept: 1, book: 5, report: 3 },
  { facility: "centre-p2", accept: 2, book: 5, report: 3 },
  { facility: "centre-p2", accept: 1, book: 6, report: 4 },
  { facility: "centre-p2", accept: 2, book: 8, report: 4 },
];

const CLOSED: Spec[] = CLOSED_SPANS.map((item, index) => {
  const sent = 2;
  const decided = sent + item.accept;
  const booked = decided + item.book;
  const procedure = booked + 2;
  const report = procedure + item.report;
  const disposition = report + 2;
  return {
    id: `FIT-26${String(100 + index)}`,
    name: `${FIRST[(index + 3) % FIRST.length]} ${LAST[(index + 2) % LAST.length]}`,
    age: 50 + (index % 18),
    sex: index % 2 === 0 ? "M" : "F",
    origin: index % 4 === 0 ? "al-ain-central" : "khalifa-city-a",
    stage: "closed" as Stage,
    fit: 30 + index * 3,
    priority: "routine" as Priority,
    language: index % 4 === 0 ? "en" : "ar",
    resultDaysAgo: disposition + 12,
    physician: PHYSICIANS[index % PHYSICIANS.length],
    ownerTeam: "Screening programme",
    ownerName: "Programme clerk",
    endoscopy: item.facility,
    referralSentDay: sent,
    decisionDay: decided,
    decision: "accepted" as const,
    bookedDay: booked,
    procedureDay: procedure,
    reportDay: report,
    dispositionDay: disposition,
  };
});

const EARLY: Spec[] = [0, 1, 2, 3, 4].map((index) => ({
  id: `FIT-2690${index}`,
  name: `${FIRST[(index + 5) % FIRST.length]} ${LAST[(index + 1) % LAST.length]}`,
  age: 52 + index,
  sex: index % 2 === 0 ? "F" : "M",
  origin: ["al-bateen", "madinat-zayed", "al-mushrif", "khalifa-city-a", "al-ain-central"][index],
  stage: "result_issued" as Stage,
  fit: 25 + index * 11,
  priority: index === 4 ? "tier3" : "routine",
  language: "ar" as const,
  resultDaysAgo: 1 + index,
  physician: PHYSICIANS[index % PHYSICIANS.length],
  ownerTeam: "Origin clinic",
  ownerName: PHYSICIANS[index % PHYSICIANS.length],
  navigator: NAVIGATORS[index % NAVIGATORS.length],
}));

function withStableEmiratesId(items: ScreeningCase[]): ScreeningCase[] {
  return items.map((item) => {
    if (item.id !== "FIT-26771") return item;
    return { ...item, emiratesId: "784-0000-4921882-0" };
  });
}

export const CASES: ScreeningCase[] = withStableEmiratesId(
  [...NARRATIVE, ...OPEN_QUEUE, ...CLOSED, ...EARLY].map(build),
);

export const CASE_BY_ID = new Map(CASES.map((item) => [item.id, item]));

export const DEMO_CASE_ID = "FIT-26771";

export function getCase(id: string): ScreeningCase | undefined {
  return CASE_BY_ID.get(id);
}
