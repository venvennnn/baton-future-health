"use client";

import { paretoCurve, paretoPoint } from "@/lib/coordination";
import { DEMO_CASE_ID } from "@/lib/cases";
import type { ScreeningCase } from "@/lib/types";
import { useEffect, useId, useMemo, useState } from "react";

const CHECKS = [
  { id: "egfr", label: "eGFR / renal labs", detail: "Kidney function is attached before the request is recorded." },
  { id: "hold", label: "Blood-thinner hold plan", detail: "The hold, or a note that none is needed, is written down." },
  { id: "sedation", label: "ASA sedation risk score", detail: "Cardiac and sedation risk are reviewed before a simulated handover." },
] as const;

export function ReadinessGate({ caseId, onReady }: { caseId: string; onReady: (ready: boolean) => void }) {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => (
    caseId === DEMO_CASE_ID ? { egfr: false, hold: true, sedation: true } : { egfr: true, hold: true, sedation: false }
  ));
  const done = CHECKS.filter((item) => checked[item.id]).length;
  const ready = done === CHECKS.length;

  useEffect(() => {
    onReady(ready);
  }, [onReady, ready]);

  return (
    <div data-tour="record-readiness" className="space-y-2 border-b border-slate-200 p-4 lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Facility readiness checklist</p>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold ${ready ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>{done} of {CHECKS.length}</span>
      </div>
      {CHECKS.map((item) => (
        <label key={item.id} className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 ${checked[item.id] ? "border-slate-200 bg-white hover:bg-slate-50" : "border-amber-200 bg-amber-50"}`}>
          <input
            type="checkbox"
            className="mt-0.5 accent-emerald-600"
            checked={Boolean(checked[item.id])}
            onChange={(event) => setChecked((current) => ({ ...current, [item.id]: event.target.checked }))}
          />
          <span>
            <span className={`block text-sm font-bold ${checked[item.id] ? "text-slate-900" : "text-amber-900"}`}>{item.label}</span>
            <span className="block text-xs text-slate-700">{item.detail}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

interface ConsultMessage {
  id: string;
  role: "primary" | "gi";
  name: string;
  text: string;
}

function seedThread(item: ScreeningCase): ConsultMessage[] {
  if (item.id === "FIT-26771") {
    return [
      {
        id: "seed-pcp",
        role: "primary",
        name: item.physician,
        text: "Hypertension is listed as controlled. She asked about sedation because of that cardiac history. Can the referral wait for a cardiology note, or is the listed history enough to proceed?",
      },
      {
        id: "seed-gi",
        role: "gi",
        name: "GI specialist · synthetic reply",
        text: "The listed history does not need a new cardiology note before booking. Complete the readiness checklist, then record the handover locally. This reply was not sent.",
      },
    ];
  }
  return [
    {
      id: "seed-pcp",
      role: "primary",
      name: item.physician,
      text: item.sbar.assessment,
    },
  ];
}

export function SbarThread({ item }: { item: ScreeningCase }) {
  const [messages, setMessages] = useState<ConsultMessage[]>(() => seedThread(item));
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  return (
    <div data-tour="record-sbar" className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Async SBAR e-consult thread</p>
        <span className="text-[11px] text-slate-700">Saved in this browser · not sent</span>
      </div>
      <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
        {messages.map((message) => (
          <article key={message.id} className={`rounded-xl border p-3 shadow-sm ${message.role === "gi" ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
            <div className="mb-1 flex justify-between gap-2 text-xs">
              <b className={message.role === "gi" ? "text-emerald-700" : "text-blue-800"}>{message.name}</b>
            </div>
            <p className="text-sm text-slate-900">{message.text}</p>
          </article>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const text = draft.trim();
          if (!text) return;
          setMessages((current) => [
            ...current,
            { id: `local-${current.length}`, role: "primary", name: item.physician, text },
          ]);
          setDraft("");
          setSaved("Saved in this browser. The message was not sent.");
        }}
      >
        <input
          id={`consult-${item.id}`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Reply to GI triage…"
          className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900"
        />
        <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">Send</button>
      </form>
      {saved ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">{saved}</p> : null}
    </div>
  );
}

const DISPOSITIONS = [
  { id: "mdt", label: "Oncology MDT" },
  { id: "recall", label: "3-year recall" },
] as const;

export function PathologyLock({ item, onRecord }: { item: ScreeningCase; onRecord: (detail: string) => void }) {
  const [fileName, setFileName] = useState("");
  const [disposition, setDisposition] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const group = useId();
  const pathologyReady = Boolean(fileName) && Boolean(disposition);
  const attendanceReady = item.procedureAttended;
  const canRecord = pathologyReady && attendanceReady && !item.closed;
  const reasons = [
    fileName ? null : "Choose a biopsy result file.",
    disposition ? null : "Select Oncology MDT or a 3-year recall.",
    attendanceReady ? null : "The colonoscopy has not been attended, so the case stays open.",
  ].filter(Boolean) as string[];

  return (
    <section data-tour="record-lock" className={`mt-4 rounded-xl border border-slate-300 p-4 ${item.closed || pathologyReady ? "bg-white" : "locked-stripes"}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">🔒</div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-slate-950">Closure is locked until pathology is chosen</span>
            <span className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-900">{item.closed ? "Closed in the file" : pathologyReady ? "Pathology gate cleared" : "Clinical safety hard lock"}</span>
          </div>
          <p className="mt-1 text-sm text-slate-800">To close this case, choose a biopsy result and either Oncology MDT or a 3-year recall. The colonoscopy also has to have been attended. A saved note stays in this browser.</p>
        </div>
      </div>

      {item.closed ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          {typeof item.demoDay === "number" ? `Closed on Day ${item.demoDay}. The note stays in this browser. Nothing was sent.` : "This case is already closed in the shared file. The lock is not offered again."}
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {item.id === DEMO_CASE_ID ? (
            <div className="flex flex-wrap gap-2">
              {["Tubular adenoma", "Hyperplastic polyp"].map((name) => (
                <button
                  key={name}
                  type="button"
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${fileName === name ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-300 bg-white text-slate-800"}`}
                  onClick={() => {
                    setFileName(name);
                    setNotice(null);
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          ) : null}
          <label className="block text-xs font-semibold text-slate-900">1. Biopsy result
            <input
              type="file"
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white text-xs text-slate-800 file:mr-3 file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:font-semibold file:text-white"
              onChange={(event) => {
                const file = event.target.files?.[0];
                setFileName(file?.name ?? "");
                setNotice(null);
              }}
            />
          </label>
          {fileName ? <p className="text-xs text-slate-500">Chosen locally: {fileName}. The file is not uploaded.</p> : null}
          <fieldset>
            <legend className="text-sm font-semibold">Disposition</legend>
            <div className="mt-2 flex flex-col gap-2">
              {DISPOSITIONS.map((option) => (
                <label key={option.id} className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">
                  <input
                    type="radio"
                    name={group}
                    className="accent-blue-700"
                    checked={disposition === option.id}
                    onChange={() => {
                      setDisposition(option.id);
                      setNotice(null);
                    }}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
          {reasons.length > 0 ? (
            <ul className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
              {reasons.map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
          ) : null}
          <button
            type="button"
            disabled={!canRecord}
            className={`rounded-full px-4 py-2 text-sm font-bold ${canRecord ? "bg-slate-900 text-white" : "cursor-not-allowed bg-slate-200 text-slate-500"}`}
            onClick={() => {
              if (!canRecord) return;
              const label = DISPOSITIONS.find((option) => option.id === disposition)?.label ?? disposition;
              const detail = `Simulated closure note. Biopsy file “${fileName}” and disposition “${label}” were chosen in this browser. The shared case file was not changed, and nothing was sent.`;
              onRecord(detail);
              setNotice(detail);
            }}
          >
            {canRecord ? "Record simulated closure" : "Close case (needs biopsy, disposition, and attendance)"}
          </button>
          {notice ? <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">{notice}</p> : null}
        </div>
      )}
    </section>
  );
}

export function EquityPareto() {
  const curve = useMemo(() => paretoCurve(24), []);
  const [priority, setPriority] = useState(0.35);
  const current = paretoPoint(priority);
  const width = 640;
  const height = 320;
  const pad = { left: 58, right: 18, top: 16, bottom: 36 };
  const gapMin = 0;
  const gapMax = 36;
  const compMin = 1600;
  const compMax = 2000;
  const xOf = (gap: number) => pad.left + ((gapMax - gap) / (gapMax - gapMin)) * (width - pad.left - pad.right);
  const yOf = (completions: number) => pad.top + ((compMax - completions) / (compMax - compMin)) * (height - pad.top - pad.bottom);
  const line = curve.map((point) => `${xOf(point.gap)},${yOf(point.completions)}`).join(" ");
  const cx = xOf(current.gap);
  const cy = yOf(current.completions);

  return (
    <section data-tour="sim-pareto" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Equity vs. completion — Pareto frontier</h2>
          <p className="mt-0.5 text-sm text-slate-700">A teaching curve. Interpreter priority moves the language gap from 31.4% to 2.1% while illustrated completions rise. This is not a Department of Health result, and it is separate from the seeded model.</p>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-500">Language gap</div>
            <div className="text-2xl font-black text-blue-800">{current.gap.toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-500">Completions</div>
            <div className="text-2xl font-black">{current.completions.toLocaleString()}</div>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-slate-800">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-slate-500" />31.4% gap, fewer completions</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-blue-800 ring-2 ring-blue-200" />Current point</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-emerald-600" />2.1% gap, more completions</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-72 w-full min-w-[620px]" role="img" aria-label="Illustrative chart of language gap against completions">
        {[1680, 1760, 1840, 1910].map((value) => (
          <g key={value}>
            <line x1={pad.left} x2={width - pad.right} y1={yOf(value)} y2={yOf(value)} stroke="#e2e8f0" />
            <text x={pad.left - 8} y={yOf(value) + 3} textAnchor="end" fontSize="10" fill="#64748b">{value.toLocaleString()}</text>
          </g>
        ))}
        {[31.4, 20, 10, 2.1].map((value) => (
          <text key={value} x={xOf(value)} y={height - 14} textAnchor="middle" fontSize="10" fill="#64748b">{value}%</text>
        ))}
        <polyline fill="none" stroke="#1d4ed8" strokeWidth="3" points={line} />
        <circle cx={cx} cy={cy} r="7" fill="#0f172a" />
      </svg>
      </div>
      <p className="text-xs text-slate-600">Vertical axis is illustrated completions. Horizontal axis is the language gap, from 31.4% on the left to 2.1% on the right.</p>
      <label className="mt-2 block rounded-xl bg-slate-50 p-4">
        <span className="flex justify-between text-sm font-semibold">
          <span>Interpreter prioritization</span>
          <span className="text-blue-800">{Math.round(priority * 100)}%</span>
        </span>
        <input
          className="mt-2 w-full accent-blue-700"
          type="range"
          min={0}
          max={100}
          value={Math.round(priority * 100)}
          onChange={(event) => setPriority(Number(event.target.value) / 100)}
          aria-label="Interpreter prioritization"
        />
        <span className="mt-1 block text-xs text-slate-500">Left is no extra interpreter priority. Right is full priority on the teaching curve. Moving it does not change the seeded model above.</span>
      </label>
    </section>
  );
}
