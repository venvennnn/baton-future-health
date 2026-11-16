"use client";

import { useDemo } from "@/components/providers";
import { bottleneckTable, delaySummary, programmeCounts, worklist } from "@/lib/analytics";
import { formatDays } from "@/lib/dates";
import { ENDOSCOPY_FACILITIES, facilityShort } from "@/lib/facilities";
import { DELAY_LABEL, SPAN_LABEL, type SpanStage } from "@/lib/types";
import Link from "next/link";
import { useMemo, useState } from "react";

const STAGES: SpanStage[] = ["referral_acceptance", "booking", "report_review"];

export function Bottlenecks() {
  const { cases, clinicId } = useDemo();
  const scoped = useMemo(
    () => cases.filter((item) => clinicId === "all" || item.originFacilityId === clinicId || item.facilityId === clinicId || item.endoscopyFacilityId === clinicId),
    [cases, clinicId],
  );
  const [facilityId, setFacilityId] = useState(clinicId !== "all" && ENDOSCOPY_FACILITIES.some((facility) => facility.id === clinicId) ? clinicId : "gi-unit-s");
  const [stage, setStage] = useState<SpanStage | "all">("booking");
  const cells = useMemo(() => bottleneckTable(scoped), [scoped]);
  const delays = useMemo(() => delaySummary(scoped), [scoped]);
  const rows = worklist(scoped, facilityId, stage);
  const programme = programmeCounts(scoped);

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row">
        <div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Facility bottlenecks</h1>
          <p className="mt-1 max-w-3xl text-slate-600">Where synthetic referrals are waiting, by facility and stage. Completed transition times are separate from the current age of open cases.</p>
        </div>
        <span className="h-fit rounded-md border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Synthetic demo</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section data-tour="facility-table" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-bold">Facility-by-stage wait</h2>
          <p className="mb-4 text-sm text-slate-500">Each cell shows the median open-case age, then the median completed transition. Select a cell to open those cases. Orange means the open median is over 7 days.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs">
                  <th className="py-2">Facility</th>
                  {STAGES.map((item) => <th key={item} className="px-1 py-2">{SPAN_LABEL[item]}</th>)}
                </tr>
              </thead>
              <tbody>
                {ENDOSCOPY_FACILITIES.map((facility) => (
                  <tr key={facility.id}>
                    <td className="py-2 pr-2 font-bold">{facility.short}</td>
                    {STAGES.map((item) => {
                      const cell = cells.find((row) => row.facilityId === facility.id && row.stage === item);
                      const open = cell?.open;
                      const completed = cell?.completed;
                      const hot = (open?.median ?? 0) > 7;
                      const selected = facilityId === facility.id && stage === item;
                      return (
                        <td key={item} className="px-1 py-1.5">
                          <button
                            type="button"
                            onClick={() => { setFacilityId(facility.id); setStage(item); }}
                            className={`w-full rounded-lg px-2 py-2 text-center ${hot ? "bg-orange-100 text-orange-950 ring-1 ring-orange-300" : "bg-blue-50"} ${selected ? "outline outline-2 outline-blue-700" : ""}`}
                          >
                            <span className="block text-sm font-black">{open && open.n > 0 && open.median !== null ? formatDays(open.median) : "—"}</span>
                            <span className="block text-[10px] font-medium text-slate-500">open n={open?.n ?? 0}</span>
                            <span className="block text-[10px] text-slate-500">{completed && completed.n > 0 && completed.median !== null ? `done ${formatDays(completed.median)} · n=${completed.n}` : "no completed"}</span>
                            <span className="block text-[10px] text-slate-400">{completed?.p90 === null || completed?.p90 === undefined ? "p90 not estimated" : `p90 ${formatDays(completed.p90)}`}</span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">90th percentile is shown only when at least 5 completed transitions exist. A long open age is not, by itself, a confirmed capacity blocker.</p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-bold">Documented delay reasons</h2>
          <p className="mb-4 text-sm text-slate-500">Open referral, booking, and report-review cases waiting more than 3 days. Unknown is kept even when the count is zero.</p>
          <div className="flex flex-col gap-3">
            {delays.rows.map((row) => (
              <div key={row.reason} className="flex items-center gap-3 text-sm">
                <span className="w-56 shrink-0 truncate">{DELAY_LABEL[row.reason]}</span>
                <span className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <span className="block h-full rounded-full bg-blue-700" style={{ width: `${Math.max(row.count ? 4 : 0, row.share * 100)}%` }} />
                </span>
                <span className="w-16 text-right font-semibold">{row.count} <span className="font-normal text-slate-500">({Math.round(row.share * 100)}%)</span></span>
              </div>
            ))}
          </div>
          <p className="mt-4 border-t pt-3 text-xs text-slate-500">
            Delayed referrals in this count: <strong>{delays.total}</strong>. Confirmed eligible-slot constraints: <strong>{delays.confirmedSlotConstraints}</strong>. A capacity blocker is confirmed only when the case itself records that no eligible slot was available.
          </p>
        </section>
      </div>

      <section data-tour="facility-worklist" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold">Referral worklist — {facilityId === "all" ? "all endoscopy facilities" : facilityShort(facilityId)}</h2>
            <p className="text-sm text-slate-500">Open cases only, longest current age first. These ages are not completed transition times.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select aria-label="Facility" className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold" value={facilityId} onChange={(event) => setFacilityId(event.target.value)}>
              <option value="all">All endoscopy facilities</option>
              {ENDOSCOPY_FACILITIES.map((facility) => <option key={facility.id} value={facility.id}>{facility.short}</option>)}
            </select>
            <select aria-label="Stage" className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold" value={stage} onChange={(event) => setStage(event.target.value as SpanStage | "all")}>
              <option value="all">All open stages</option>
              {STAGES.map((item) => <option key={item} value={item}>{SPAN_LABEL[item]}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-blue-50 text-xs">
              <tr>
                <th className="px-4 py-3">Case</th>
                <th className="px-4 py-3">Current stage</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Time waiting</th>
                <th className="px-4 py-3">Delay</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No open cases for this facility and stage.</td></tr>
              ) : rows.map((row) => (
                <tr key={`${row.item.id}-${row.stage}`} className="hover:bg-blue-50/40">
                  <td className="px-4 py-3 font-semibold">{row.item.id}</td>
                  <td className="px-4 py-3">{SPAN_LABEL[row.stage]}</td>
                  <td className="px-4 py-3">{row.item.ownerTeam}</td>
                  <td className={`px-4 py-3 font-bold ${row.days > 7 ? "text-orange-700" : ""}`}>{formatDays(row.days)}</td>
                  <td className="px-4 py-3">
                    {DELAY_LABEL[row.item.delayReason ?? "unknown"]}
                    {row.item.eligibleSlotConstraint ? <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-800">Eligible-slot constraint</span> : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/cases/${row.item.id}`} className="font-bold text-blue-700">Review</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-t pt-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-extrabold">The programme view</h2>
            <p className="text-sm text-slate-600">Same case file as the board. Attendance is not counted as closure.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/cases" className="rounded-full bg-blue-700 px-4 py-2 text-sm font-bold text-white">Open case board</Link>
            <Link href="/simulator" className="rounded-full border px-4 py-2 text-sm font-bold">Policy simulator</Link>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat kicker="Positive FIT" value={programme.cohort} detail={`${programme.cohort} cases in the file`} />
          <Stat kicker="Past result stage" value={programme.contacted} detail={`${share(programme.contacted, programme.cohort)} of the file`} />
          <Stat kicker="Slot recorded or attended" value={programme.booked} detail="Includes attended cases" />
          <Stat kicker="Attended / closed" value={programme.attended} detail={`${programme.closed} documented closures · ${programme.attendedWithoutClosure} attended and still open`} />
        </div>
      </section>
    </main>
  );
}

function share(count: number, total: number) {
  if (!total) return "—";
  return `${((count / total) * 100).toFixed(1)}%`;
}

function Stat({ kicker, value, detail }: { kicker: string; value: number; detail: string }) {
  return (
    <article className="rounded-xl border bg-white p-5">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{kicker}</span>
      <div className="mt-1 text-2xl font-black">{value}</div>
      <p className="text-xs text-slate-500">{detail}</p>
    </article>
  );
}
