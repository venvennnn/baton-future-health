"use client";

import { CASES, DEMO_CASE_ID } from "@/lib/cases";
import { draftApprovalEvent, type DraftSource } from "@/lib/draft";
import { addDays } from "@/lib/dates";
import { facilityName } from "@/lib/facilities";
import { CASE_FILE_ILLNESS_ID, activeIllness, defaultIllnesses, normalizeIllnesses, type IllnessProgramme } from "@/lib/illnesses";
import type { CaseEvent, HandoverStatus, OutreachTouch, ScreeningCase, Stage } from "@/lib/types";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "baton-demo-overrides-v1";
const ILLNESS_KEY = "baton-illness-programmes-v1";

interface Override {
  handoverStatus?: HandoverStatus;
  endoscopyFacilityId?: string;
  nextAction?: string;
  simulatedPending?: boolean;
  events: CaseEvent[];
  outreach: OutreachTouch[];
  demoDay?: number;
  procedureAttended?: boolean;
  reportReceived?: boolean;
  dispositionRecorded?: boolean;
  closed?: boolean;
  stage?: Stage;
  closurePendingReason?: string;
}

interface Store {
  cases: ScreeningCase[];
  clinicId: string;
  setClinicId: (id: string) => void;
  locale: "en" | "ar";
  setLocale: (locale: "en" | "ar") => void;
  recordSimulatedHandover: (caseId: string, facilityId: string) => void;
  recordColonoscopyAttended: (caseId: string) => void;
  recordDemoClosure: (caseId: string, detail: string) => void;
  resetDemoCase: (caseId: string) => void;
  recordSimulatedOutreach: (caseId: string, channel: OutreachTouch["channel"], note: string) => void;
  recordNote: (caseId: string, note: string) => void;
  recordDraftApproval: (caseId: string, source: DraftSource, text: string) => void;
  illnesses: IllnessProgramme[];
  activeIllness: IllnessProgramme;
  setActiveIllness: (id: string) => void;
  updateIllness: (id: string, patch: { name?: string; test?: string }) => void;
  addRequirement: (illnessId: string, text: string) => void;
  removeRequirement: (illnessId: string, requirementId: string) => void;
  addIllness: (input: { name: string; test: string; requirement: string }) => void;
  removeIllness: (id: string) => void;
}

const CaseStore = createContext<Store | null>(null);

function merge(base: ScreeningCase, override?: Override): ScreeningCase {
  if (!override) return base;
  const closed = override.closed ?? base.closed;
  return {
    ...base,
    handoverStatus: override.handoverStatus ?? base.handoverStatus,
    endoscopyFacilityId: override.endoscopyFacilityId ?? base.endoscopyFacilityId,
    nextAction: override.nextAction ?? base.nextAction,
    simulatedPending: override.simulatedPending ?? base.simulatedPending,
    events: [...base.events, ...override.events].sort((a, b) => a.on.localeCompare(b.on) || a.id.localeCompare(b.id)),
    outreach: [...base.outreach, ...override.outreach],
    demoDay: override.demoDay,
    procedureAttended: override.procedureAttended ?? base.procedureAttended,
    reportReceived: override.reportReceived ?? base.reportReceived,
    dispositionRecorded: override.dispositionRecorded ?? base.dispositionRecorded,
    closed,
    stage: override.stage ?? base.stage,
    closurePendingReason: closed ? undefined : (override.closurePendingReason ?? base.closurePendingReason),
  };
}

function carried(current: Override | undefined) {
  return {
    demoDay: current?.demoDay,
    procedureAttended: current?.procedureAttended,
    reportReceived: current?.reportReceived,
    dispositionRecorded: current?.dispositionRecorded,
    closed: current?.closed,
    stage: current?.stage,
    closurePendingReason: current?.closurePendingReason,
  };
}

function storyOn(item: ScreeningCase, day: number): string {
  return addDays(item.resultOn, day);
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [ready, setReady] = useState(false);
  const [clinicId, setClinicId] = useState("all");
  const [locale, setLocale] = useState<"en" | "ar">("en");
  const [illnesses, setIllnesses] = useState<IllnessProgramme[]>(defaultIllnesses);
  const [activeIllnessId, setActiveIllnessId] = useState(CASE_FILE_ILLNESS_ID);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setOverrides(JSON.parse(raw) as Record<string, Override>);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    try {
      const saved = localStorage.getItem(ILLNESS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { activeId?: string; illnesses?: unknown };
        const next = normalizeIllnesses(parsed.illnesses);
        setIllnesses(next);
        if (next.some((item) => item.id === parsed.activeId)) setActiveIllnessId(parsed.activeId as string);
      }
    } catch {
      localStorage.removeItem(ILLNESS_KEY);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    localStorage.setItem(ILLNESS_KEY, JSON.stringify({ activeId: activeIllnessId, illnesses }));
  }, [overrides, illnesses, activeIllnessId, ready]);

  const cases = useMemo(() => CASES.map((item) => merge(item, overrides[item.id])), [overrides]);
  const shownIllness = activeIllness(illnesses, activeIllnessId);

  function editIllness(id: string, update: (item: IllnessProgramme) => IllnessProgramme) {
    setIllnesses((current) => current.map((item) => (item.id === id ? update(item) : item)));
  }

  function patch(caseId: string, update: (current: Override | undefined, item: ScreeningCase) => Override) {
    setOverrides((current) => {
      const item = CASES.find((row) => row.id === caseId);
      if (!item) return current;
      return { ...current, [caseId]: update(current[caseId], item) };
    });
  }

  const store: Store = {
    cases,
    clinicId,
    setClinicId,
    locale,
    setLocale,
    recordSimulatedHandover: (caseId, facilityId) => {
      patch(caseId, (current, item) => {
        const pitch = caseId === DEMO_CASE_ID;
        const event: CaseEvent = {
          id: `${caseId}-sim-ho-${Date.now()}`,
          on: pitch ? storyOn(item, 3) : todayStamp(),
          kind: "simulated",
          simulated: true,
          label: "Simulated handover request",
          detail: `Recorded locally for ${facilityName(facilityId)}. No referral was transmitted.`,
          actor: pitch ? "Clinician" : "Demo user",
          facilityId,
        };
        return {
          ...carried(current),
          events: [...(current?.events ?? []), event],
          outreach: current?.outreach ?? [],
          handoverStatus: "pending_acceptance",
          endoscopyFacilityId: facilityId,
          simulatedPending: true,
          nextAction: `Simulated request is waiting in this browser for ${facilityName(facilityId)}. It has not been sent.`,
          ...(pitch ? { demoDay: 3 } : {}),
        };
      });
    },
    recordColonoscopyAttended: (caseId) => {
      if (caseId !== DEMO_CASE_ID) return;
      patch(caseId, (current, item) => {
        if (current?.procedureAttended) return { ...carried(current), events: current.events, outreach: current.outreach, handoverStatus: current.handoverStatus, endoscopyFacilityId: current.endoscopyFacilityId, simulatedPending: current.simulatedPending, nextAction: current.nextAction };
        const event: CaseEvent = {
          id: `${caseId}-sim-proc`,
          on: storyOn(item, 12),
          kind: "procedure",
          simulated: true,
          label: "Colonoscopy attended (simulated)",
          detail: "Attendance recorded in this browser. Nothing was sent. Attendance does not close the case.",
          actor: "Clinician",
          facilityId: current?.endoscopyFacilityId,
        };
        return {
          ...carried(current),
          events: [...(current?.events ?? []), event],
          outreach: current?.outreach ?? [],
          handoverStatus: current?.handoverStatus,
          endoscopyFacilityId: current?.endoscopyFacilityId,
          simulatedPending: current?.simulatedPending,
          procedureAttended: true,
          stage: "pathology",
          demoDay: 12,
          closurePendingReason: "Procedure attended. Report is outstanding, so closure stays pending.",
          nextAction: "Record the biopsy result and a disposition. Attendance alone does not close the case. Nothing has been sent.",
        };
      });
    },
    recordDemoClosure: (caseId, detail) => {
      if (caseId !== DEMO_CASE_ID) return;
      patch(caseId, (current, item) => {
        if (current?.closed) return { ...carried(current), events: current.events, outreach: current.outreach, handoverStatus: current.handoverStatus, endoscopyFacilityId: current.endoscopyFacilityId, simulatedPending: current.simulatedPending, nextAction: current.nextAction };
        const on = storyOn(item, 16);
        const facilityId = current?.endoscopyFacilityId;
        const events: CaseEvent[] = [
          ...(current?.events ?? []),
          {
            id: `${caseId}-sim-report`,
            on,
            kind: "report",
            simulated: true,
            label: "Procedure report recorded (simulated)",
            detail: "Synthetic report recorded in this browser. Nothing was sent.",
            actor: "Clinician",
            facilityId,
          },
          {
            id: `${caseId}-sim-disp`,
            on,
            kind: "disposition",
            simulated: true,
            label: "Disposition recorded (simulated)",
            detail,
            actor: "Clinician",
            facilityId,
          },
          {
            id: `${caseId}-sim-close`,
            on,
            kind: "closure",
            simulated: true,
            label: "Documented closure (simulated)",
            detail: "Closed in this browser on Day 16 because attendance, the report, and a disposition are recorded. The shared case file was not changed, and nothing was sent.",
            actor: "Clinician",
            facilityId,
          },
        ];
        return {
          ...carried(current),
          events,
          outreach: current?.outreach ?? [],
          handoverStatus: current?.handoverStatus,
          endoscopyFacilityId: facilityId,
          simulatedPending: current?.simulatedPending,
          procedureAttended: true,
          reportReceived: true,
          dispositionRecorded: true,
          closed: true,
          stage: "closed",
          demoDay: 16,
          nextAction: "No open action in this browser. Closed on Day 16. Nothing was sent.",
        };
      });
    },
    resetDemoCase: (caseId) => {
      setOverrides((current) => {
        if (!current[caseId]) return current;
        const next = { ...current };
        delete next[caseId];
        return next;
      });
    },
    recordSimulatedOutreach: (caseId, channel, note) => {
      patch(caseId, (current) => {
        const touch: OutreachTouch = {
          id: `${caseId}-sim-out-${Date.now()}`,
          on: todayStamp(),
          channel,
          title: `Simulated ${channel} log`,
          detail: note.trim() || "No note added.",
          outcome: "Not sent. Demo log only.",
          simulated: true,
        };
        const event: CaseEvent = {
          id: `${caseId}-sim-ev-${Date.now()}`,
          on: todayStamp(),
          kind: "simulated",
          simulated: true,
          label: `Simulated ${channel} entry`,
          detail: touch.detail,
          actor: "Demo user",
        };
        return {
          ...carried(current),
          events: [...(current?.events ?? []), event],
          outreach: [...(current?.outreach ?? []), touch],
          handoverStatus: current?.handoverStatus,
          endoscopyFacilityId: current?.endoscopyFacilityId,
          nextAction: current?.nextAction,
          simulatedPending: current?.simulatedPending,
        };
      });
    },
    illnesses,
    activeIllness: shownIllness,
    setActiveIllness: (id) => {
      if (illnesses.some((item) => item.id === id)) setActiveIllnessId(id);
    },
    updateIllness: (id, fields) => {
      editIllness(id, (item) => {
        const name = fields.name === undefined ? item.name : fields.name.replace(/\s+/g, " ").slice(0, 80);
        const test = fields.test === undefined ? item.test : fields.test.replace(/\s+/g, " ").slice(0, 40);
        return {
          ...item,
          name: name.trim() ? name : item.name,
          test: test.trim() ? test : item.test,
        };
      });
    },
    addRequirement: (illnessId, text) => {
      const clean = text.trim().replace(/\s+/g, " ").slice(0, 160);
      if (!clean) return;
      editIllness(illnessId, (item) => ({
        ...item,
        requirements: [...item.requirements, { id: `req-${Date.now()}`, text: clean }].slice(0, 12),
      }));
    },
    removeRequirement: (illnessId, requirementId) => {
      editIllness(illnessId, (item) => ({ ...item, requirements: item.requirements.filter((row) => row.id !== requirementId) }));
    },
    addIllness: ({ name, test, requirement }) => {
      const cleanName = name.trim().replace(/\s+/g, " ").slice(0, 80);
      const cleanTest = test.trim().replace(/\s+/g, " ").slice(0, 40);
      const cleanRequirement = requirement.trim().replace(/\s+/g, " ").slice(0, 160);
      if (!cleanName || !cleanTest) return;
      const id = `illness-${Date.now()}`;
      setIllnesses((current) => [
        ...current,
        { id, name: cleanName, test: cleanTest, requirements: cleanRequirement ? [{ id: `req-${Date.now()}`, text: cleanRequirement }] : [] },
      ]);
      setActiveIllnessId(id);
    },
    removeIllness: (id) => {
      if (id === CASE_FILE_ILLNESS_ID) return;
      setIllnesses((current) => current.filter((item) => item.id !== id));
      setActiveIllnessId((current) => (current === id ? CASE_FILE_ILLNESS_ID : current));
    },
    recordDraftApproval: (caseId, source, text) => {
      const clean = text.trim();
      if (!clean) return;
      patch(caseId, (current) => ({
        ...carried(current),
        events: [...(current?.events ?? []), draftApprovalEvent(caseId, "Clinician", source, todayStamp(), clean)],
        outreach: current?.outreach ?? [],
        handoverStatus: current?.handoverStatus,
        endoscopyFacilityId: current?.endoscopyFacilityId,
        nextAction: current?.nextAction,
        simulatedPending: current?.simulatedPending,
      }));
    },
    recordNote: (caseId, note) => {
      const text = note.trim();
      if (!text) return;
      patch(caseId, (current) => ({
        ...carried(current),
        events: [
          ...(current?.events ?? []),
          {
            id: `${caseId}-note-${Date.now()}`,
            on: todayStamp(),
            kind: "note",
            simulated: true,
            label: "Local note",
            detail: text,
            actor: "Demo user",
          },
        ],
        outreach: current?.outreach ?? [],
        handoverStatus: current?.handoverStatus,
        endoscopyFacilityId: current?.endoscopyFacilityId,
        nextAction: current?.nextAction,
        simulatedPending: current?.simulatedPending,
      }));
    },
  };

  return <CaseStore.Provider value={store}>{children}</CaseStore.Provider>;
}

export function useDemo(): Store {
  const store = useContext(CaseStore);
  if (!store) throw new Error("useDemo must be used inside Providers");
  return store;
}
