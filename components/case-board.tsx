"use client";

import { ClinicFilter } from "@/components/clinic-filter";
import { useDemo } from "@/components/providers";
import { daysSinceResult, destinationOptions, filterCases, isHighStall, isOverdue, isRejected, kpis, maskEmiratesId, overdueBy, stageCounts, stallScore } from "@/lib/analytics";
import { formatDays } from "@/lib/dates";
import { facilityShort } from "@/lib/facilities";
import { DEMO_CASE_ID } from "@/lib/cases";
import { CASE_FILE_ILLNESS_ID } from "@/lib/illnesses";
import { HANDOVER_LABEL, STAGE_LABEL, STAGE_ORDER, type ScreeningCase, type Stage } from "@/lib/types";
import Link from "next/link";
import { useMemo, useState } from "react";

function handoverText(item: ScreeningCase): string {
  if (item.simulatedPending) return "Simulated request pending — not transmitted";
  return HANDOVER_LABEL[item.handoverStatus];
}

export function CaseBoard() {
  const { cases, clinicId, recordSimulatedHandover, recordSimulatedOutreach, activeIllness } = useDemo();
  const [stage, setStage] = useState<Stage | "all">("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(DEMO_CASE_ID);
  const [notice, setNotice] = useState<string | null>(null);
  const [breachedOnly, setBreachedOnly] = useState(false);
  const scoped = useMemo(
    () => cases.filter((item) => clinicId === "all" || item.originFacilityId === clinicId || item.facilityId === clinicId || item.endoscopyFacilityId === clinicId),
    [cases, clinicId],
  );
  const metrics = kpis(scoped);
  const counts = stageCounts(scoped);
  const filtered = useMemo(() => {
    const rows = filterCases(scoped, query, stage).sort((a, b) => {
      if (a.id === DEMO_CASE_ID) return -1;
      if (b.id === DEMO_CASE_ID) return 1;
      return stallScore(b) - stallScore(a);
    });
    return breachedOnly ? rows.filter((item) => isOverdue(item)) : rows;
  }, [scoped, query, stage, breachedOnly]);
  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0];
  const options = selected ? destinationOptions(selected, cases) : [];
  const recommended = options.find((option) => !option.rejected) ?? options[0];

  if (activeIllness.id !== CASE_FILE_ILLNESS_ID) {
    return (
      <main className="page-rise mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Case Board</h1>
        <p className="text-sm leading-relaxed text-slate-800">
          Showing {activeIllness.name} · {activeIllness.test}. This synthetic file has no cases for that illness. The FIT worklist is available when colorectal screening is showing.
        </p>
        <ul className="space-y-2">
          {activeIllness.requirements.map((row) => (
            <li key={row.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800">{row.text}</li>
          ))}
        </ul>
      </main>
    );
  }

  return (
    <main className="page-rise mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-800">Synthetic case file</span>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">Case Board — Staff Daily Worklist</h1>
          <p className="mt-1 text-sm text-slate-700">Counts are calculated from this file. Nothing here is a live synchronisation.</p>
        </div>
      </div>

      <section data-tour="board-kpis" className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Open cases" value={String(metrics.open)} />
        <Kpi label="Inside 14-day target" value={String(Math.max(0, metrics.open - metrics.overdue))} note={metrics.open ? `${Math.round(((metrics.open - metrics.overdue) / metrics.open) * 1000) / 10}% of open` : undefined} />
        <Kpi label="Past 14 days" value={String(metrics.overdue)} alert />
        <Kpi label="Returned referrals" value={String(metrics.rejected)} />
      </section>

      {metrics.overdue > 0 ? (
        <div className="relative overflow-hidden rounded-xl border border-red-200 bg-white p-4 pl-6 shadow-sm">
          <div className="absolute bottom-0 left-0 top-0 w-1.5 bg-red-600" />
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-red-800">{metrics.overdue} open cases are past the 14-day booking target</span>
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Past target</span>
              </div>
              <p className="mt-0.5 text-sm text-slate-700">These ages come from the case file. Isolating them does not notify a navigator.</p>
            </div>
            <button type="button" onClick={() => setBreachedOnly((value) => !value)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700">
              {breachedOnly ? "Show every case" : "Isolate past-target cases"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm xl:flex-row xl:items-center">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <ClinicFilter />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by case, name, or Emirates ID…" className="min-w-[260px] max-w-md flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900" />
          <div className="flex flex-wrap items-center gap-0.5 rounded-lg bg-slate-100 p-1">
            <FilterButton active={stage === "all" && !breachedOnly} onClick={() => { setStage("all"); setBreachedOnly(false); }} label={`All (${counts.all})`} />
            {STAGE_ORDER.map((item) => (
              <FilterButton key={item} active={stage === item} onClick={() => { setStage(item); setBreachedOnly(false); }} label={`${STAGE_LABEL[item]} (${counts[item]})`} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-12">
        <section data-tour="board-queue" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card xl:col-span-8">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">Queue Dispatch List</span>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-800">{filtered.length}</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-700">Sorted by time waiting</span>
          </div>
          {filtered.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-bold">No cases match these filters.</p>
              <button type="button" className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" onClick={() => { setQuery(""); setStage("all"); setBreachedOnly(false); }}>Show all cases</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-white text-[11px] uppercase tracking-wider text-slate-700">
                    <th className="px-5 py-2 font-bold">Case and patient</th>
                    <th className="px-3 py-2 font-bold">Pathway stage</th>
                    <th className="px-3 py-2 font-bold">Assigned lead</th>
                    <th className="px-3 py-2 font-bold">Since result</th>
                    <th className="px-5 py-2 text-right font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="queue-rise divide-y divide-slate-100">
                  {filtered.map((item) => (
                    <tr key={item.id} onClick={() => setSelectedId(item.id)} className={`cursor-pointer ${selected?.id === item.id ? "bg-blue-50/70" : "hover:bg-slate-50"}`}>
                      <td className="px-5 py-3">
                        <div className="font-bold text-slate-900">{item.name}</div>
                        <div className="text-xs text-slate-600">{item.id} · {item.age}{item.sex} · FIT {item.fitUgG} · {maskEmiratesId(item.emiratesId)}</div>
                      </td>
                      <td className="px-3 py-3"><StatusChip item={item} /></td>
                      <td className="px-3 py-3 text-slate-800">{item.ownerName}<div className="text-xs text-slate-600">{facilityShort(item.originFacilityId)}</div></td>
                      <td className={`px-3 py-3 font-semibold ${isOverdue(item) ? "text-red-700" : "text-slate-800"}`}>{daysSinceResult(item)}d{isOverdue(item) ? ` · +${overdueBy(item)}` : ""}</td>
                      <td className="px-5 py-3 text-right"><Link href={`/cases/${item.id}`} className="text-sm font-semibold text-blue-800 hover:underline">Open</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-4 xl:sticky xl:top-24 xl:col-span-4">
          {selected ? (
            <div data-tour="board-inspector" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="font-bold">Inspector · {selected.id}</span>
                {isOverdue(selected) ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-extrabold text-red-800">Action needed</span> : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold">In view</span>}
              </div>
              <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Fact label="Current stage" value={STAGE_LABEL[selected.stage]} />
                <Fact label="Accountable team" value={`${selected.ownerTeam} · ${selected.ownerName}`} />
                <Fact label="Handover" value={handoverText(selected)} />
                <Fact label="Next action" value={selected.nextAction} />
              </dl>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs font-bold uppercase text-slate-500">
                  <span>Days since positive FIT / 14-day booking target</span>
                  <span className={isOverdue(selected) ? "text-red-700" : ""}>{overdueBy(selected) ? `${overdueBy(selected)}d past target` : "Inside target or booked"}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full ${isOverdue(selected) ? "bg-red-600" : "bg-emerald-600"}`} style={{ width: `${Math.min(100, (daysSinceResult(selected) / 14) * 100)}%` }} />
                </div>
              </div>
              <h3 className="mt-5 text-xs font-bold uppercase text-slate-500">Event history</h3>
              <ol className="mt-2 flex max-h-64 flex-col gap-3 overflow-auto border-l-2 border-slate-100 pl-4">
                {selected.events.map((event) => (
                  <li key={event.id}>
                    <span className="block text-sm font-bold">{event.label}{event.simulated ? " · simulated" : ""}</span>
                    <span className="block text-xs text-slate-500">{event.on} · {event.actor}</span>
                    <span className="block text-sm text-slate-600">{event.detail}</span>
                  </li>
                ))}
              </ol>
              {recommended ? (
                <div className="mt-4 rounded-xl bg-slate-50 p-3">
                  <span className="text-xs font-bold uppercase text-slate-500">Suggested from the case file</span>
                  <div className="mt-1 font-bold">{recommended.name}</div>
                  <p className="text-sm text-slate-500">
                    {recommended.openMedian === null ? "No open booking age at this facility." : `Open booking age median ${formatDays(recommended.openMedian)} (n=${recommended.openN}).`} Not a live slot offer.
                  </p>
                </div>
              ) : null}
              {notice ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">{notice}</p> : null}
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                  onClick={() => {
                    if (!recommended) return;
                    recordSimulatedHandover(selected.id, recommended.facilityId);
                    setNotice(`Simulated request recorded for ${recommended.short}. Nothing was sent.`);
                  }}
                >
                  Record simulated handover{recommended ? ` · ${recommended.short}` : ""}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                    onClick={() => {
                      recordSimulatedOutreach(selected.id, "call", "Arabic outreach noted locally.");
                      setNotice("Simulated outreach log added. No call was placed.");
                    }}
                  >
                    Log Arabic outreach
                  </button>
                  <Link href={`/cases/${selected.id}#audit`} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-center text-sm font-semibold text-slate-800 hover:bg-slate-50">
                    Audit history
                  </Link>
                </div>
              </div>
              <p className="mt-3 flex items-start gap-1 text-xs text-slate-500">
                <span className="material-symbols-outlined text-[16px]">info</span>
                Simulated clicks update this browser only. They never confirm a live transmission.
              </p>
            </div>
          ) : (
            <div data-tour="board-inspector" className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">Select a case to inspect its stage, owner, handover, next action, and history.</div>
          )}
        </aside>
      </div>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-sm font-bold text-slate-900">{value}</dd>
    </div>
  );
}

function FilterButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold ${active ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
      {label}
    </button>
  );
}

function Kpi({ label, value, note, alert = false }: { label: string; value: string; note?: string; alert?: boolean }) {
  return (
    <article className={`rounded-xl border p-4 shadow-sm ${alert ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}>
      <p className={`text-[11px] font-bold uppercase tracking-wider ${alert ? "text-red-800" : "text-slate-600"}`}>{label}</p>
      <p className={`text-2xl font-extrabold ${alert ? "text-red-700" : "text-slate-900"}`}>{value}{note ? <span className="ml-2 align-middle rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-xs font-bold text-emerald-700">{note}</span> : null}</p>
    </article>
  );
}

function StatusChip({ item }: { item: ScreeningCase }) {
  if (item.closed) return <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">Documented closure</span>;
  if (item.procedureAttended) return <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900">Attended · open</span>;
  if (isRejected(item)) return <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900">Referral returned</span>;
  if (item.handoverStatus === "booked") return <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">Slot recorded</span>;
  if (isHighStall(item) || isOverdue(item)) return <span className="rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white">Past target</span>;
  return <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-800">{STAGE_LABEL[item.stage]}</span>;
}
