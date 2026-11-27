"use client";

import { useDemo } from "@/components/providers";
import { DEMO_CASE_ID } from "@/lib/cases";

export function DemoSessionAudit() {
  const { cases } = useDemo();
  const item = cases.find((row) => row.id === DEMO_CASE_ID);
  const recorded = item?.events.filter((event) => event.simulated) ?? [];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-xl font-bold">Recorded in this browser · {DEMO_CASE_ID}</h2>
      <p className="mt-1 text-sm text-slate-600">Clinician actions from this browser session. They are not written to the shared case file, and nothing is sent.</p>
      {recorded.length === 0 ? (
        <p className="mt-3 text-sm text-slate-700">No simulated actions yet. They appear here after the clinician records them on this case.</p>
      ) : (
        <ol className="mt-3 space-y-2">
          {recorded.map((event) => (
            <li key={event.id} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <div className="flex justify-between gap-3">
                <b className="text-slate-900">{event.label}</b>
                <span className="text-xs text-slate-500">{event.on}</span>
              </div>
              <p className="text-slate-700">{event.detail}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
