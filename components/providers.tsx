"use client";

import { CASES } from "@/lib/cases";
import { facilityName } from "@/lib/facilities";
import type { CaseEvent, HandoverStatus, OutreachTouch, ScreeningCase } from "@/lib/types";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "baton-demo-overrides-v1";

interface Override {
  handoverStatus?: HandoverStatus;
  endoscopyFacilityId?: string;
  nextAction?: string;
  simulatedPending?: boolean;
  events: CaseEvent[];
  outreach: OutreachTouch[];
}

interface Store {
  cases: ScreeningCase[];
  clinicId: string;
  setClinicId: (id: string) => void;
  locale: "en" | "ar";
  setLocale: (locale: "en" | "ar") => void;
  recordSimulatedHandover: (caseId: string, facilityId: string) => void;
  recordSimulatedOutreach: (caseId: string, channel: OutreachTouch["channel"], note: string) => void;
  recordNote: (caseId: string, note: string) => void;
}

const CaseStore = createContext<Store | null>(null);

function merge(base: ScreeningCase, override?: Override): ScreeningCase {
  if (!override) return base;
  return {
    ...base,
    handoverStatus: override.handoverStatus ?? base.handoverStatus,
    endoscopyFacilityId: override.endoscopyFacilityId ?? base.endoscopyFacilityId,
    nextAction: override.nextAction ?? base.nextAction,
    simulatedPending: override.simulatedPending ?? base.simulatedPending,
    events: [...base.events, ...override.events].sort((a, b) => a.on.localeCompare(b.on) || a.id.localeCompare(b.id)),
    outreach: [...base.outreach, ...override.outreach],
  };
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [ready, setReady] = useState(false);
  const [clinicId, setClinicId] = useState("all");
  const [locale, setLocale] = useState<"en" | "ar">("en");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setOverrides(JSON.parse(raw) as Record<string, Override>);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  }, [overrides, ready]);

  const cases = useMemo(() => CASES.map((item) => merge(item, overrides[item.id])), [overrides]);

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
      patch(caseId, (current) => {
        const event: CaseEvent = {
          id: `${caseId}-sim-ho-${Date.now()}`,
          on: todayStamp(),
          kind: "simulated",
          simulated: true,
          label: "Simulated handover request",
          detail: `Recorded locally for ${facilityName(facilityId)}. No referral was transmitted.`,
          actor: "Demo user",
          facilityId,
        };
        return {
          events: [...(current?.events ?? []), event],
          outreach: current?.outreach ?? [],
          handoverStatus: "pending_acceptance",
          endoscopyFacilityId: facilityId,
          simulatedPending: true,
          nextAction: `Simulated request is waiting in this browser for ${facilityName(facilityId)}. It has not been sent.`,
        };
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
          events: [...(current?.events ?? []), event],
          outreach: [...(current?.outreach ?? []), touch],
          handoverStatus: current?.handoverStatus,
          endoscopyFacilityId: current?.endoscopyFacilityId,
          nextAction: current?.nextAction,
          simulatedPending: current?.simulatedPending,
        };
      });
    },
    recordNote: (caseId, note) => {
      const text = note.trim();
      if (!text) return;
      patch(caseId, (current) => ({
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
