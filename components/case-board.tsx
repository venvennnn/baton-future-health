"use client";

import { useDemo } from "@/components/providers";
import { daysSinceResult, destinationOptions, filterCases, isHighStall, isOverdue, isRejected, kpis, maskEmiratesId, overdueBy, stageCounts, stallScore } from "@/lib/analytics";
import { formatDays } from "@/lib/dates";
import { facilityShort } from "@/lib/facilities";
import { DEMO_CASE_ID } from "@/lib/cases";
import { HANDOVER_LABEL, STAGE_LABEL, STAGE_ORDER, type ScreeningCase, type Stage } from "@/lib/types";
import Link from "next/link";
import { useMemo, useState } from "react";

function handoverText(item: ScreeningCase): string {
  if (item.simulatedPending) return "Simulated request pending — not transmitted";
  return HANDOVER_LABEL[item.handoverStatus];
}

export function CaseBoard() {
  const { cases, clinicId, recordSimulatedHandover, recordSimulatedOutreach } = useDemo();
  const [stage, setStage] = useState<Stage | "all">("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(DEMO_CASE_ID);
  const [notice, setNotice] = useState<string | null>(null);
  const scoped = useMemo(
    () => cases.filter((item) => clinicId === "all" || item.originFacilityId === clinicId || item.facilityId === clinicId || item.endoscopyFacilityId === clinicId),
    [cases, clinicId],
  );
  const metrics = kpis(scoped);
  const counts = stageCounts(scoped);
  const filtered = useMemo(() => filterCases(scoped, query, stage).sort((a, b) => stallScore(b) - stallScore(a)), [scoped, query, stage]);
  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0];
  const options = selected ? destinationOptions(selected, cases) : [];
  const recommended = options.find((option) => !option.rejected) ?? options[0];

  return (
    <main className="mx-auto flex w-full max-w-[1360px] flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm font-bold uppercase tracking-wide text-blue-700">
            <span className="h-6 w-2.5 rounded-full bg-blue-700" />
            Abu Dhabi colorectal screening operations
            <span className="text-xs font-medium normal-case text-slate-500">Synthetic case file · not a live synchronisation</span>
          </div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Case Board · Staff daily worklist</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">Triage positive FIT pathways, see who owns each case, and open the record. Counts are calculated from this case file.</p>
        </div>
        <div className="rounded-full bg-slate-100 px-4 py-2 text-sm">
          <span className="text-slate-500">Protocol label: </span>
          <span className="font-bold">FIT positive follow-up · demo</span>
        </div>
      </div>

      <section data-tour="board-kpis" className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <Kpi label="Open positive FIT" value={String(metrics.open)} note={`+${metrics.newThisWeek} with result in 7 days`} icon="science" />
        <Kpi label="Overdue handovers" value={String(metrics.overdue)} note="Open, unbooked, past 14 days" icon="warning" alert />
        <Kpi label="Rejected referrals" value={String(metrics.rejected)} note="Returned or eligible-slot rejection" icon="sync_problem" />
        <Kpi label="High stall risk" value={String(metrics.highStall)} note="28+ days, procedure not attended" icon="hourglass_bottom" />
        <Kpi
          label="Mean days to booking"
          value={metrics.meanDaysToBooking === null ? "—" : metrics.meanDaysToBooking.toFixed(1)}
          note={metrics.bookingDenominator ? `Completed booking transitions only (n=${metrics.bookingDenominator})` : "No completed booking transition"}
          icon="timer"
        />
      </section>

      <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap gap-1">
          <FilterButton active={stage === "all"} onClick={() => setStage("all")} label={`All stages (${counts.all})`} />
          {STAGE_ORDER.map((item) => (
            <FilterButton key={item} active={stage === item} onClick={() => setStage(item)} label={`${STAGE_LABEL[item]} (${counts[item]})`} />
          ))}
        </div>
        <label className="relative min-w-[240px] flex-1 lg:max-w-xs">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-slate-400">search</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, case, Emirates ID, clinic"
            className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none ring-blue-600 focus:ring-2"
          />
        </label>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-12">
        <section className="flex flex-col gap-3 lg:col-span-7">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold">Screening queue <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{filtered.length} shown</span></span>
            <span className="text-slate-500">Sorted by stall score</span>
          </div>
          {filtered.length === 0 ? (
            <div data-tour="board-queue" className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="font-bold">No cases match these filters.</p>
              <p className="mt-1 text-sm text-slate-500">Clear the search or choose another stage. The case file itself is unchanged.</p>
              <button type="button" className="mt-4 rounded-full bg-blue-700 px-4 py-2 text-sm font-bold text-white" onClick={() => { setQuery(""); setStage("all"); }}>
                Show all cases
              </button>
            </div>
          ) : (
            filtered.map((item, index) => (
              <button
                key={item.id}
                type="button"
                data-tour={index === 0 ? "board-queue" : undefined}
                onClick={() => setSelectedId(item.id)}
                className={`rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-100 ${selected?.id === item.id ? "ring-2 ring-blue-700" : "hover:shadow-md"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-700 text-sm font-bold text-white">{item.initials}</span>
                    <span>
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="font-extrabold">{item.name}</span>
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-800">{item.id}</span>
                        {isOverdue(item) ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">+{overdueBy(item)}d overdue</span> : null}
                        {item.simulatedPending ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">Simulated</span> : null}
                      </span>
                      <span className="mt-1 block text-sm text-slate-500">
                        {item.age}
                        {item.sex} · {facilityShort(item.originFacilityId)} · FIT {item.fitUgG} µg/g · {maskEmiratesId(item.emiratesId)}
                      </span>
                    </span>
                  </div>
                  <StatusChip item={item} />
                </div>
                {selected?.id === item.id ? (
                  <span className="mt-3 grid gap-2 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-3">
                    <Fact label="Stage" value={STAGE_LABEL[item.stage]} />
                    <Fact label="Accountable team" value={item.ownerTeam} />
                    <Link href={`/cases/${item.id}`} className="inline-flex items-center justify-center rounded-full bg-blue-700 px-3 py-2 text-sm font-bold text-white">
                      Open record
                    </Link>
                  </span>
                ) : null}
              </button>
            ))
          )}
        </section>

        <aside className="flex flex-col gap-3 lg:sticky lg:top-[9.5rem] lg:col-span-5">
          {selected ? (
            <div data-tour="board-inspector" className="rounded-2xl bg-white p-5 shadow-md">
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
                  className="rounded-full bg-blue-700 px-4 py-3 text-sm font-bold text-white"
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
                    className="rounded-full bg-white px-3 py-2 text-sm font-bold shadow ring-1 ring-slate-200"
                    onClick={() => {
                      recordSimulatedOutreach(selected.id, "call", "Arabic outreach noted locally.");
                      setNotice("Simulated outreach log added. No call was placed.");
                    }}
                  >
                    Log Arabic outreach
                  </button>
                  <Link href={`/cases/${selected.id}#audit`} className="rounded-full bg-white px-3 py-2 text-center text-sm font-bold shadow ring-1 ring-slate-200">
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
    <button type="button" onClick={onClick} aria-pressed={active} className={`whitespace-nowrap rounded-full px-3 py-2 text-sm ${active ? "bg-blue-700 font-bold text-white" : "text-slate-600 hover:bg-white"}`}>
      {label}
    </button>
  );
}

function Kpi({ label, value, note, icon, alert = false }: { label: string; value: string; note: string; icon: string; alert?: boolean }) {
  return (
    <article className={`relative overflow-hidden rounded-2xl p-4 shadow-sm ${alert ? "bg-red-50" : "bg-white"}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-full ${alert ? "bg-red-100 text-red-700" : "bg-blue-50 text-blue-700"}`}>
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </span>
      </div>
      <div className="mt-2 text-3xl font-extrabold tracking-tight">{value}</div>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
      <span className={`absolute inset-x-0 bottom-0 h-1 ${alert ? "bg-red-600" : "bg-slate-200"}`} />
    </article>
  );
}

function StatusChip({ item }: { item: ScreeningCase }) {
  if (item.closed) return <span className="text-xs font-bold text-emerald-700">Documented closure</span>;
  if (item.procedureAttended) return <span className="text-xs font-bold text-amber-700">Attended · closure pending</span>;
  if (isRejected(item)) return <span className="text-xs font-bold text-red-700">Referral returned</span>;
  if (item.handoverStatus === "booked") return <span className="text-xs font-bold text-emerald-700">Slot recorded</span>;
  if (isHighStall(item) || isOverdue(item)) return <span className="text-xs font-bold text-red-700">Delay risk</span>;
  return <span className="text-xs font-bold text-slate-500">{STAGE_LABEL[item.stage]}</span>;
}
