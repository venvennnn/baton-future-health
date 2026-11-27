import { facilityName } from "./facilities";
import type { CaseEvent, ScreeningCase } from "./types";

export type DraftKind = "sbar" | "teachback";
export type DraftLanguage = "en" | "ar";
export type DraftSource = "llm" | "template";

export interface DraftResult {
  text: string;
  source: DraftSource;
  model?: string;
}

/** Fields the draft is allowed to see. Nothing else from the record is sent. */
export function caseFacts(item: ScreeningCase) {
  return {
    id: item.id,
    name: item.name,
    age: item.age,
    sex: item.sex === "F" ? "female" : "male",
    language: item.language,
    fitUgG: item.fitUgG,
    resultOn: item.resultOn,
    physician: item.physician,
    navigator: item.navigator ?? item.ownerName,
    ownerTeam: item.ownerTeam,
    origin: facilityName(item.originFacilityId),
    femaleTeamRequested: item.femaleTeamRequested,
    nextAction: item.nextAction,
    situation: item.sbar.situation,
    background: item.sbar.background,
    assessment: item.sbar.assessment,
    recommendation: item.sbar.recommendation,
  };
}

const SYSTEM = `You draft text for a clinician to review. Use only the facts in the user message. Do not add a diagnosis, a cancer finding, a lab result, a medicine, or any clinical fact that is not in those fields. Plain language. The patient message should read at about a 12-year-old reading age. For a patient message, explain what a colonoscopy is, why it matters after a positive FIT, the basics of bowel preparation, and who to call. When the language is Arabic, write in Modern Standard Arabic as a native text, not as a word-for-word translation of an English draft. Nothing you write is sent to the patient.`;

export function draftPrompt(item: ScreeningCase, kind: DraftKind, language: DraftLanguage): { system: string; user: string } {
  const facts = caseFacts(item);
  const task = kind === "sbar"
    ? "Write an SBAR note (Situation, Background, Assessment, Recommendation) for the receiving endoscopy team. English."
    : `Write a teach-back message the navigator can read to the patient. Language: ${language === "ar" ? "Modern Standard Arabic" : "English"}.`;
  return { system: SYSTEM, user: `${task}\n\nCase facts:\n${JSON.stringify(facts, null, 2)}` };
}

export function templateDraft(item: ScreeningCase, kind: DraftKind, language: DraftLanguage): string {
  const facts = caseFacts(item);
  const who = facts.navigator;
  const female = facts.femaleTeamRequested ? " She has asked for a female endoscopy team." : "";
  if (kind === "sbar") {
    return [
      `Situation: ${facts.name}, ${facts.age}, ${facts.sex}, FIT ${facts.fitUgG} µg/g on ${facts.resultOn}. Case ${facts.id}. ${facts.situation}`,
      `Background: ${facts.background} Physician ${facts.physician}. Origin ${facts.origin}.${female}`,
      `Assessment: ${facts.assessment}`,
      `Recommendation: ${facts.recommendation} Navigator ${who}, ${facts.ownerTeam}. This draft was not sent.`,
    ].join("\n\n");
  }
  if (language === "ar") {
    const team = facts.femaleTeamRequested ? " وقد طلبت فريق تنظير من النساء." : "";
    return [
      `مرحباً ${facts.name}.`,
      `نتيجة فحص الدم الخفي في البراز موجبة (${facts.fitUgG} ميكروغرام/غرام، بتاريخ ${facts.resultOn}). هذا الفحص لا يشخص مرضاً. هو إشارة إلى أن الخطوة التالية منظار للقولون.`,
      `منظار القولون فحص ينظر فيه الطبيب إلى داخل الأمعاء الغليظة بكاميرا رفيعة. بعد نتيجة موجبة لفحص البراز، يساعد المنظار على رؤية سبب النزيف الخفيف وإزالة الزوائد إن وُجدت، قبل أن تكبر.`,
      `قبل الموعد ستحتاج إلى شراب يفرغ الأمعاء، وإلى تعليمات عن الطعام والشراب. اتبع ورقة التحضير التي يعطيها لك الفريق، واسأل إذا كان أي دواء يجب إيقافه.`,
      `للأسئلة اتصل بـ ${who} في ${facts.origin}.${team}`,
      `هذه رسالة للمراجعة. لم تُرسل.`,
    ].join("\n\n");
  }
  return [
    `Hello ${facts.name}.`,
    `Your stool test (FIT) was positive at ${facts.fitUgG} µg/g on ${facts.resultOn}. A positive test is not a diagnosis. It means the next step is a colonoscopy.`,
    `A colonoscopy is a test where a doctor looks inside the large bowel with a thin camera. After a positive stool test, it helps find the cause of a small amount of blood and remove growths if they are there, before they get larger.`,
    `Before the appointment you drink a liquid that clears the bowel, and you follow food and drink instructions. Ask which medicines to pause.`,
    `Call ${who} at ${facts.origin} if you have a question.${female}`,
    `This message is for review. It has not been sent.`,
  ].join("\n\n");
}

export function draftApprovalDetail(clinician: string, source: DraftSource): string {
  return `Draft approved by ${clinician} · source ${source}`;
}

export function draftApprovalEvent(caseId: string, clinician: string, source: DraftSource, on: string, text: string): CaseEvent {
  return {
    id: `${caseId}-draft-${source}-${on}`,
    on,
    kind: "note",
    simulated: true,
    label: "Draft approved (simulated)",
    detail: `${draftApprovalDetail(clinician, source)}. Nothing was sent. ${text.slice(0, 240)}`,
    actor: clinician,
  };
}
