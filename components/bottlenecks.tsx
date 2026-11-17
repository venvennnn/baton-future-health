"use client";

import { ClinicFilter } from "@/components/clinic-filter";
import { useDemo } from "@/components/providers";
import { bottleneckTable, delaySummary, programmeCounts, worklist } from "@/lib/analytics";
import { rebalanceProjection } from "@/lib/coordination";
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
  const [quota, setQuota] = useState(20);
  const bookingRows = ENDOSCOPY_FACILITIES.map((facility) => {
    const cell = cells.find((row) => row.facilityId === facility.id && row.stage === "booking");
    return { facility, median: cell?.open.median ?? null, n: cell?.open.n ?? 0 };
  }).filter((row) => row.median !== null && row.n > 0);
  const saturated = [...bookingRows].sort((a, b) => (b.median ?? 0) - (a.median ?? 0))[0];
  const quieter = [...bookingRows].filter((row) => row.facility.id !== saturated?.facility.id).sort((a, b) => (a.median ?? 0) - (b.median ?? 0))[0];
  const projection = saturated && quieter && saturated.median !== null && quieter.median !== null
    ? rebalanceProjection(saturated.median, quieter.median, quota)
    : null;
  const radarMax = Math.max(
    1,
    ...cells.map((cell) => cell.open.median ?? 0),
  );

  return (
    <main className="page-rise mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-800">Network view · from this case file</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Facilities and network bottlenecks</h1>
        <p className="mt-1 text-sm text-slate-700">Open-case age by stage. These are not live hospital waits.</p>
        <div className="mt-3"><ClinicFilter /></div>
      </div>
      <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Endoscopy facilities</p><p className="mt-2 text-3xl font-extrabold">{ENDOSCOPY_FACILITIES.length}</p><p className="mt-1 text-xs text-slate-700">Shared with the case file</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Longest open booking</p><p className="mt-2 text-3xl font-extrabold">{saturated?.median === null || saturated?.median === undefined ? "—" : formatDays(saturated.median).replace(" days", "d").replace(" day", "d")}</p><p className="mt-1 text-xs text-slate-700">{saturated ? saturated.facility.short : "No open booking queue"}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Open cases</p><p className="mt-2 text-3xl font-extrabold">{scoped.filter((item) => !item.closed).length}</p><p className="mt-1 text-xs text-slate-700">{programme.attendedWithoutClosure} attended and still open</p></article>
        <article className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-card"><p className="text-[11px] font-bold uppercase tracking-wider text-red-800">Confirmed slot constraints</p><p className="mt-2 text-3xl font-extrabold text-red-700">{delays.confirmedSlotConstraints}</p><p className="mt-1 text-xs text-red-800">Only when the case itself records it</p></article>
      </div>

      <section data-tour="facility-radar" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-bold">Facility bottleneck radar</h2>
        <p className="mt-1 text-sm text-slate-500">Open-case age at three stages: referral intake, booking, and report review. The length is the median in this file. It shows where a facility is slow, and it is not a live hospital feed.</p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold">
          <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-900">Referral intake</span>
          <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-950">Booking</span>
          <span className="rounded-full bg-violet-100 px-2 py-1 text-violet-950">Report review</span>
        </div>
        <div className="mt-4 hidden grid-cols-[9rem_1fr] gap-3 text-[11px] font-bold uppercase text-slate-500 sm:grid">
          <span />
          <div className="grid grid-cols-3 gap-3">
            <span>Referral intake</span>
            <span>Booking</span>
            <span>Report review</span>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-4">
          {ENDOSCOPY_FACILITIES.map((facility) => (
            <div key={facility.id} className="grid items-center gap-3 sm:grid-cols-[9rem_1fr]">
              <div className="text-sm font-bold">{facility.short}</div>
              <div className="grid grid-cols-3 gap-3">
                {STAGES.map((item) => {
                  const cell = cells.find((row) => row.facilityId === facility.id && row.stage === item);
                  const median = cell?.open.median;
                  const width = median === null || median === undefined ? 0 : (median / radarMax) * 100;
                  const tone = item === "referral_acceptance" ? "bg-blue-500" : item === "booking" ? "bg-amber-500" : "bg-violet-500";
                  return (
                    <div key={item}>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className={`bar-grow ${tone} h-full rounded-full`} style={{ width: `${width}%` }} />
                      </div>
                      <div className="mt-1 text-[11px] font-semibold text-slate-600">{median === null || median === undefined ? "No open cases" : formatDays(median)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">Bars are scaled to the longest open median on this page ({formatDays(radarMax)}). “No open cases” means that stage has nothing waiting in the file.</p>
      </section>

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

      {projection && saturated && quieter ? (
        <section data-tour="facility-rebalance" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900">Rebalance referral traffic</h2>
            <p className="text-sm text-slate-700">A projection in this browser. Moving the slider does not transfer a patient.</p>
          </div>
          <div className="grid grid-cols-1 items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-12">
            <div className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-red-800">Origin (longest open booking)</p>
              <p className="font-bold text-slate-900">{saturated.facility.name}</p>
              <p className="text-xs text-slate-700">Open n={saturated.n} · file median {formatDays(saturated.median ?? 0)}</p>
              <p className="mt-2 text-2xl font-extrabold text-slate-950">{formatDays(projection.origin)}</p>
              <p className="text-[11px] text-slate-600">Projected booking age</p>
            </div>
            <div className="px-1 lg:col-span-4">
              <div className="flex justify-between text-sm"><b>Transfer quota</b><b className="text-blue-800">{quota}%</b></div>
              <input className="mt-2 w-full accent-blue-800" type="range" min={10} max={60} step={5} value={quota} onChange={(event) => setQuota(Number(event.target.value))} aria-label="Routine quota to divert" />
              <div className="flex justify-between text-[11px] text-slate-700"><span>10%</span><span>60%</span></div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Quieter receiving site</p>
              <p className="font-bold text-slate-900">{quieter.facility.name}</p>
              <p className="text-xs text-slate-700">Open n={quieter.n} · file median {formatDays(quieter.median ?? 0)}</p>
              <p className="mt-2 text-2xl font-extrabold text-slate-950">{formatDays(projection.target)}</p>
              <p className="text-[11px] text-slate-600">Projected booking age</p>
            </div>
          </div>
        </section>
      ) : null}

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
