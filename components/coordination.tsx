"use client";

import { paretoCurve, paretoPoint } from "@/lib/coordination";
import type { ScreeningCase } from "@/lib/types";
import { useEffect, useId, useMemo, useState } from "react";

const CHECKS = [
  { id: "egfr", label: "eGFR on file", detail: "Kidney function from the last 30 days is attached before the request is recorded." },
  { id: "hold", label: "Blood-thinner hold plan", detail: "The hold, or a note that none is needed, is written down." },
  { id: "sedation", label: "Sedation risk reviewed", detail: "ASA class and cardiac risk are reviewed before a simulated handover." },
] as const;

export function ReadinessGate({ onReady }: { onReady: (ready: boolean) => void }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({ egfr: true, hold: true, sedation: false });
  const done = CHECKS.filter((item) => checked[item.id]).length;
  const ready = done === CHECKS.length;

  useEffect(() => {
    onReady(ready);
  }, [onReady, ready]);

  return (
    <section data-tour="record-readiness" className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Pre-referral readiness</h2>
          <p className="mt-1 text-sm text-slate-500">Clear these before a simulated handover can be recorded. This stops an incomplete request in the demo. Nothing is sent to a hospital.</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${ready ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-950"}`}>
          {done} of {CHECKS.length} cleared
        </span>
      </div>
      <ul className="mt-4 flex flex-col gap-2">
        {CHECKS.map((item) => (
          <li key={item.id}>
            <label className={`flex cursor-pointer gap-3 rounded-xl p-3 ${checked[item.id] ? "bg-emerald-50" : "bg-slate-50"}`}>
              <input
                type="checkbox"
                className="mt-1 accent-blue-700"
                checked={Boolean(checked[item.id])}
                onChange={(event) => setChecked((current) => ({ ...current, [item.id]: event.target.checked }))}
              />
              <span>
                <span className="block text-sm font-bold">{item.label}</span>
                <span className="block text-xs text-slate-600">{item.detail}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </section>
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
    <section data-tour="record-sbar" className="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Async SBAR e-consult</h2>
          <p className="mt-1 text-sm text-slate-500">A local thread between the primary doctor and a GI note. Messages stay in this browser. They are not delivered.</p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">Not sent</span>
      </div>
      <div className="mt-4 flex max-h-72 flex-col gap-3 overflow-y-auto">
        {messages.map((message) => (
          <article key={message.id} className={`max-w-[95%] rounded-2xl p-3 text-sm ${message.role === "primary" ? "self-start bg-slate-100" : "self-end bg-blue-50"}`}>
            <div className="text-[11px] font-bold uppercase text-slate-500">{message.role === "primary" ? "Primary" : "GI"} · {message.name}</div>
            <p className="mt-1 text-slate-800">{message.text}</p>
          </article>
        ))}
      </div>
      <form
        className="mt-4 flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const text = draft.trim();
          if (!text) return;
          setMessages((current) => [
            ...current,
            { id: `local-${current.length}`, role: "primary", name: item.physician, text },
          ]);
          setDraft("");
          setSaved("Saved in this browser. The message was not sent to a specialist.");
        }}
      >
        <label className="text-xs font-bold uppercase text-slate-500" htmlFor={`consult-${item.id}`}>Reply from the primary doctor</label>
        <textarea
          id={`consult-${item.id}`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={2}
          placeholder="Ask about cardiac risk, medicines, or timing. It stays on this page."
          className="rounded-xl bg-slate-50 px-3 py-2 text-sm outline-none ring-1 ring-slate-200"
        />
        <button type="submit" className="self-start rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white">Save reply locally</button>
      </form>
      {saved ? <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">{saved}</p> : null}
    </section>
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
    <section data-tour="record-lock" className={`rounded-2xl p-5 shadow-sm ring-1 ring-slate-100 ${pathologyReady ? "bg-white" : "lock-stripe bg-white"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Pathology hard lock</h2>
          <p className="mt-1 text-sm text-slate-500">Closure stays locked until a biopsy file is chosen and a disposition is selected. Attendance is still required. A saved note is not a transmitted report.</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${item.closed ? "bg-emerald-100 text-emerald-900" : pathologyReady ? "bg-amber-100 text-amber-950" : "bg-slate-900 text-white"}`}>
          {item.closed ? "Closed in the file" : pathologyReady ? "Pathology gate cleared" : "Locked"}
        </span>
      </div>

      {item.closed ? (
        <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">This case is already closed in the shared file. The lock is not offered again.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <label className="text-sm font-semibold">
            Biopsy result
            <input
              type="file"
              className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-bold"
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
                <label key={option.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold">
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
            Record simulated closure
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
    <section data-tour="sim-pareto" className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-lg font-bold">Equity and completion</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">A teaching curve for interpreter prioritization. The language gap moves from 31.4% to 2.1% while the illustrated completion count rises. This is not a Department of Health result, and it is separate from the seeded Kaplan–Meier run.</p>
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
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 h-72 w-full" role="img" aria-label="Illustrative chart of language gap against completions">
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
      <p className="text-xs text-slate-500">Vertical axis is illustrated completions. Horizontal axis is the language gap, and it runs from 31.4% on the left to 2.1% on the right.</p>
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
