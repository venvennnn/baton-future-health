"use client";

import { useDemo } from "@/components/providers";
import { daysSinceResult } from "@/lib/analytics";
import { handoverLoss, leakage, type LeakageId } from "@/lib/leakage";
import { dropoutRisk } from "@/lib/risk";
import { useMemo, useState } from "react";

const COLOUR: Record<LeakageId, string> = {
  never_got_result: "bg-red-700",
  referred_never_went: "bg-red-500",
  booked_never_came: "bg-red-300",
  in_progress: "bg-slate-300",
  closed_clinical: "bg-blue-700",
};

export function LeakagePanel() {
  const { cases } = useDemo();
  const rows = useMemo(() => leakage(cases), [cases]);
  const totals = handoverLoss(cases);
  const [selected, setSelected] = useState<LeakageId | null>(null);
  const total = cases.length || 1;
  const active = rows.find((row) => row.id === selected);
  const listed = active ? cases.filter((item) => active.caseIds.includes(item.id)) : [];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex flex-col justify-between gap-2 md:flex-row md:items-end">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Leakage</h2>
          <p className="text-sm font-semibold text-red-800">Handovers at risk right now: {totals.atRisk} of {totals.open} open cases</p>
        </div>
      </div>
      <div className="mt-4 flex h-8 overflow-hidden rounded-full bg-slate-100">
        {rows.map((row) => (
          <button
            key={row.id}
            type="button"
            title={`${row.label}: ${row.count}`}
            aria-pressed={selected === row.id}
            className={`${COLOUR[row.id]} h-full`}
            style={{ width: `${(row.count / total) * 100}%` }}
            onClick={() => setSelected((current) => (current === row.id ? null : row.id))}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
        {rows.map((row) => (
          <button key={row.id} type="button" onClick={() => setSelected(row.id)} className={`rounded-full border px-2 py-1 ${selected === row.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-800"}`}>
            <span className={`mr-1 inline-block h-2 w-2 rounded-full ${COLOUR[row.id]}`} />
            {row.label} · {row.count}
          </button>
        ))}
      </div>
      {active ? (
        <div className="mt-4 overflow-x-auto">
          <p className="mb-2 text-sm font-bold">{active.label}</p>
          {listed.length === 0 ? <p className="text-sm text-slate-600">No cases in this category.</p> : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="py-1">Case</th>
                  <th className="py-1">Owner</th>
                  <th className="py-1">Days</th>
                  <th className="py-1">Risk</th>
                </tr>
              </thead>
              <tbody>
                {listed.map((item) => {
                  const risk = dropoutRisk(item);
                  return (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="py-1.5 font-semibold">{item.id}</td>
                      <td className="py-1.5">{item.ownerName}</td>
                      <td className="py-1.5">{daysSinceResult(item)}</td>
                      <td className="py-1.5">{risk.band === "closed" ? "Closed" : `${Math.round(risk.p * 100)}%`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
      <p className="mt-3 text-xs text-slate-600">Categories mirror Almansoori et al., BMC Cancer 2021 (Abu Dhabi) so programme leads can compare against the published baseline.</p>
    </section>
  );
}
