"use client";

import { EquityPareto } from "@/components/coordination";
import { facilityName, facilityShort } from "@/lib/facilities";
import {
  BASELINE_POLICY,
  buildCohort,
  navigationPolicy,
  RESOURCE_POLICIES,
  simulateResource,
  simulateRouting,
  type ResourcePolicy,
  type RoutingPolicyId,
  type SimSummary,
} from "@/lib/sim/model";
import { useMemo, useState } from "react";

const EXAMPLE_IDS = ["FIT-26771", "FIT-26780", "FIT-26764", "FIT-26811"];
const ROUTING: { id: RoutingPolicyId; label: string; detail: string }[] = [
  { id: "current", label: "Current routing", detail: "Stay at the designated facility. Priority orders the local queue. Eligibility still applies." },
  { id: "shortest_displayed", label: "Shortest displayed wait", detail: "On referral, pick the eligible facility with the shortest queue divided by its daily slots." },
  { id: "capacity_aware", label: "Capacity-aware assignment", detail: "Each day, higher clinician priority chooses first among eligible facilities that still have a slot, with a female-team preference as a tie break." },
];

function pct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

function signed(value: number, digits = 1): string {
  const points = value * 100;
  return `${points >= 0 ? "+" : ""}${points.toFixed(digits)} pp`;
}

export function SimulatorView() {
  const [calls, setCalls] = useState(8);
  const [slots, setSlots] = useState(15);
  const [teachBack, setTeachBack] = useState(true);
  const [strategy, setStrategy] = useState<ResourcePolicy["strategy"]>("benefit");
  const [replicates, setReplicates] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const cohort = useMemo(() => buildCohort(26771, 2500, true), []);
  const baseline = useMemo(() => simulateResource(cohort, BASELINE_POLICY, EXAMPLE_IDS), [cohort]);
  const navigation = useMemo(() => simulateResource(cohort, navigationPolicy(calls, slots, teachBack, strategy), EXAMPLE_IDS), [cohort, calls, slots, teachBack, strategy]);
  const resources = useMemo(() => RESOURCE_POLICIES.map((policy) => simulateResource(cohort, policy, EXAMPLE_IDS)), [cohort]);
  const routing = useMemo(() => ROUTING.map((policy) => simulateRouting(cohort, policy.id, undefined, EXAMPLE_IDS)), [cohort]);

  function runReplicates() {
    setRunning(true);
    setReplicates(null);
    window.setTimeout(() => {
      const policy = navigationPolicy(calls, slots, teachBack, strategy);
      const values: number[] = [];
      for (let seed = 1; seed <= 8; seed += 1) {
        const sample = buildCohort(26771 + seed, 800, false);
        const result = simulateResource(sample, policy);
        if (result.km.atHorizon !== null) values.push(result.km.atHorizon);
      }
      values.sort((a, b) => a - b);
      const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
      setReplicates(`8 synthetic replicates, seeds 26772–26779, n=800. Mean Kaplan–Meier day-180 incidence ${pct(mean)}. Spread ${pct(values[0])} to ${pct(values[values.length - 1])}. This is not a clinical confidence interval.`);
      setRunning(false);
    }, 30);
  }

  function download() {
    const blob = new Blob([JSON.stringify({ seed: 26771, n: cohort.length, baseline, navigation, resources, routing }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "baton-synthetic-simulation.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  const callDelta = (navigation.contactedBy14 ?? 0) / navigation.n - (baseline.contactedBy14 ?? 0) / baseline.n;
  const bookDelta = navigation.booked / navigation.n - baseline.booked / baseline.n;
  const completeDelta = navigation.completed / navigation.n - baseline.completed / baseline.n;

  return (
    <main className="page-rise mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-800">Seeded model · n={cohort.length.toLocaleString()}</span>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">Policy Simulator — screening pathway</h1>
          <p className="mt-1 text-sm text-slate-700">Figures below are model output on synthetic data, or a labeled teaching curve. They are not a Department of Health result.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50" onClick={() => { setCalls(8); setSlots(15); setTeachBack(true); setStrategy("benefit"); setReplicates(null); }}>Reset to baseline</button>
          <button type="button" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50" onClick={download}>Save scenario</button>
          <button type="button" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800" onClick={runReplicates} disabled={running}>{running ? "Running…" : "Run simulation"}</button>
        </div>
      </div>
      {replicates ? <p className="rounded-xl bg-slate-50 p-3 text-sm">{replicates}</p> : null}

      <section className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Kaplan–Meier colonoscopy by day 180" value={pct(navigation.km.atHorizon)} delta={signed((navigation.km.atHorizon ?? 0) - (baseline.km.atHorizon ?? 0))} note={`Baseline ${pct(baseline.km.atHorizon)} · estimator: Kaplan–Meier`} />
        <Metric label="KM median wait" value={navigation.km.medianDay === null ? "Not reached" : `${navigation.km.medianDay}d`} delta={navigation.km.medianDay === null ? "Incidence stays under 50%" : `Baseline ${baseline.km.medianDay ?? "not reached"}`} note={navigation.observedWaits.median === null ? "No completions" : `Among completions only: ${navigation.observedWaits.median.toFixed(0)}d (n=${navigation.observedWaits.n})`} />
        <Metric label="KM 90th percentile" value={navigation.km.p90Day === null ? "Not reached" : `${navigation.km.p90Day}d`} delta={navigation.observedWaits.p90 === null ? "Completed-only p90 unavailable" : `Completed-only p90 ${navigation.observedWaits.p90.toFixed(0)}d`} note="Patients whose follow-up ends first are censored" />
        <Metric label="Language gap" value={navigation.language ? signed(navigation.language.gap) : "Not estimated"} delta={navigation.language ? `Arabic ${pct(navigation.language.arRate)} · English ${pct(navigation.language.enRate)}` : "Needs 30 patients in each language"} note={navigation.language ? `n Arabic ${navigation.language.nAr} · n English ${navigation.language.nEn}` : "Empty because a group is too small"} />
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-12">
        <section data-tour="sim-controls" className="flex flex-col gap-5 self-start rounded-2xl border border-slate-200 bg-white p-5 shadow-card lg:col-span-4">
          <h2 className="text-lg font-bold text-slate-900">Intervention levers</h2>
          <label className="rounded-xl bg-slate-50 p-4">
            <span className="flex justify-between font-semibold"><span>A. Navigator calls / day</span><span className="text-blue-700">{calls}</span></span>
            <p className="text-xs text-slate-500">Attempts available each simulated day. After 4 unsuccessful attempts a patient is left for later patients.</p>
            <input className="mt-2 w-full accent-blue-700" type="range" min={2} max={16} step={1} value={calls} onChange={(event) => setCalls(Number(event.target.value))} />
          </label>
          <fieldset className="rounded-xl bg-slate-50 p-4">
            <legend className="font-semibold">B. Outreach order</legend>
            <p className="mb-2 text-xs text-slate-500">Benefit rank is priority times contact difficulty. Risk rank is priority, then FIT value. FIFO is cohort order.</p>
            {(["benefit", "risk", "fifo"] as const).map((item) => (
              <label key={item} className="mt-2 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm">
                <input type="radio" name="strategy" checked={strategy === item} onChange={() => setStrategy(item)} />
                {item === "benefit" ? "Benefit-ranked" : item === "risk" ? "Risk-ranked" : "FIFO"}
              </label>
            ))}
          </fieldset>
          <label className="rounded-xl bg-slate-50 p-4">
            <span className="flex justify-between font-semibold"><span>C. Extra endoscopy slots</span><span className="text-emerald-700">+{slots}%</span></span>
            <p className="text-xs text-slate-500">Scales the shared daily slot profile with the largest-remainder method. Routing comparisons do not use this slider.</p>
            <input className="mt-2 w-full accent-emerald-700" type="range" min={0} max={30} step={5} value={slots} onChange={(event) => setSlots(Number(event.target.value))} />
          </label>
          <button type="button" className="flex items-center justify-between rounded-xl bg-slate-50 p-4 text-left" onClick={() => setTeachBack((value) => !value)} aria-pressed={teachBack}>
            <span>
              <span className="block font-semibold">D. Bilingual teach-back</span>
              <span className="text-xs text-slate-500">Raises contact probability, more for Arabic speakers, and raises attendance probability. It does not send an SMS.</span>
            </span>
            <span className={`h-7 w-12 rounded-full p-1 ${teachBack ? "bg-emerald-600" : "bg-slate-300"}`}><span className={`block h-5 w-5 rounded-full bg-white transition ${teachBack ? "translate-x-5" : ""}`} /></span>
          </button>
        </section>

        <section className="flex flex-col gap-4 lg:col-span-8">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <h2 className="font-bold">Baseline versus this navigation run</h2>
            <p className="text-xs text-slate-500">Baseline is 6 calls/day, FIFO, no extra slots, teach-back off. Same cohort and seed.</p>
            <Funnel label="FIT positive" current={1} baseline={1} currentText={`${navigation.n.toLocaleString()} patients`} />
            <Funnel label="Contacted by day 14" current={(navigation.contactedBy14 ?? 0) / navigation.n} baseline={(baseline.contactedBy14 ?? 0) / baseline.n} currentText={`${pct((navigation.contactedBy14 ?? 0) / navigation.n)} (${signed(callDelta)})`} />
            <Funnel label="Booked" current={navigation.booked / navigation.n} baseline={baseline.booked / baseline.n} currentText={`${pct(navigation.booked / navigation.n)} (${signed(bookDelta)})`} />
            <Funnel label="Colonoscopy attended by day 180" current={navigation.completed / navigation.n} baseline={baseline.completed / baseline.n} currentText={`${navigation.completed.toLocaleString()} crude completions (${signed(completeDelta)})`} />
            <p className="mt-3 text-xs text-slate-500">Crude completions count a procedure on or before day 180. The Kaplan–Meier figure above censors follow-up that ends earlier and can differ from the crude rate. {navigation.censored.toLocaleString()} censored · {navigation.stillWaiting.toLocaleString()} still waiting.</p>
          </div>
          <Curve baseline={baseline} current={navigation} />
        </section>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-lg font-bold">Resource comparison</h2>
        <p className="text-sm text-slate-600">Same cohort. Usual care, more calls, more slots, and both. Routing stays on the designated facility so this comparison is not mixed with the routing experiment.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {resources.map((result) => <PolicyCard key={result.policyId} result={result} />)}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-lg font-bold">Routing comparison</h2>
        <p className="text-sm text-slate-600">Same referred cohort and the same daily slots at every facility ({routing[0]?.dailySlots.reduce((sum, value) => sum + value, 0) ?? 0} slots/day, {routing[0]?.totalSlotDays.toLocaleString()} slot-days). Eligibility and clinician priority are applied in every policy. Contact is already assumed, so contact rate is not estimated here.</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {routing.map((result, index) => (
            <article key={result.policyId} className="rounded-xl bg-slate-50 p-4">
              <h3 className="font-extrabold">{ROUTING[index].label}</h3>
              <p className="text-xs text-slate-500">{ROUTING[index].detail}</p>
              <ResultLines result={result} hideContact />
            </article>
          ))}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase text-slate-500">
                <th className="py-2">Case in the file</th>
                {ROUTING.map((policy) => <th key={policy.id} className="py-2">{policy.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {EXAMPLE_IDS.map((id) => (
                <tr key={id} className="border-t">
                  <td className="py-2 font-bold">{id}</td>
                  {routing.map((result) => {
                    const example = result.examples[id];
                    return <td key={result.policyId} className="py-2">{example ? `${example.destinationId ? facilityShort(example.destinationId) : "Unassigned"}${example.eventDay !== null ? ` · day ${example.eventDay}` : example.booked ? " · booked" : " · not booked"}` : "Not in this cohort"}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-slate-500">The worked example uses the shared case ids inside the seeded cohort. Aggregate rates use all {cohort.length.toLocaleString()} patients, not only these four.</p>
        </div>
      </section>

      <EquityPareto />

      <Sensitivity resources={resources} />
    </main>
  );
}

function Metric({ label, value, delta, note }: { label: string; value: string; delta: string; note: string }) {
  return (
    <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <div className="mt-1 text-3xl font-extrabold">{value}</div>
      <div className="text-sm font-semibold text-emerald-800">{delta}</div>
      <p className="text-xs text-slate-500">{note}</p>
    </article>
  );
}

function Funnel({ label, current, baseline, currentText }: { label: string; current: number; baseline: number; currentText: string }) {
  return (
    <div className="mt-3">
      <div className="flex justify-between text-sm font-semibold"><span>{label}</span><span className="text-emerald-800">{currentText}</span></div>
      <div className="mt-1 h-5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.max(2, Math.min(100, current * 100))}%` }} /></div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-300" style={{ width: `${Math.max(2, Math.min(100, baseline * 100))}%` }} /></div>
    </div>
  );
}

function Curve({ baseline, current }: { baseline: SimSummary; current: SimSummary }) {
  const path = (summary: SimSummary) => {
    const points = summary.km.curve.filter((point) => point.day <= 180);
    return points.map((point) => {
      const x = 40 + (point.day / 180) * 540;
      const y = 20 + (1 - point.survival) * 160;
      return `${x},${y}`;
    }).join(" ");
  };
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <h2 className="font-bold">Time to colonoscopy</h2>
      <p className="text-xs text-slate-500">Kaplan–Meier survival: the share still without a colonoscopy. Follow-up that ends before the procedure is censored. The curve is not a fitted illustration.</p>
      <svg viewBox="0 0 600 180" className="mt-2 h-48 w-full">
        {[20, 60, 100, 140].map((y) => <line key={y} x1="40" x2="580" y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4" />)}
        <text x="8" y="24" fontSize="10" fill="#64748b">100%</text>
        <text x="12" y="64" fontSize="10" fill="#64748b">75%</text>
        <text x="12" y="104" fontSize="10" fill="#64748b">50%</text>
        <text x="12" y="144" fontSize="10" fill="#64748b">25%</text>
        <polyline fill="none" stroke="#94a3b8" strokeWidth="2" points={path(baseline)} />
        <polyline fill="none" stroke="#1d4ed8" strokeWidth="3" points={path(current)} />
      </svg>
      <p className="text-xs text-slate-500">Grey is the baseline. Blue is this navigation run. {current.km.medianDay === null ? "The Kaplan–Meier median is not reached because cumulative incidence stays below 50%." : `Kaplan–Meier median is day ${current.km.medianDay}.`}</p>
    </div>
  );
}

function ResultLines({ result, hideContact = false }: { result: SimSummary; hideContact?: boolean }) {
  return (
    <dl className="mt-3 space-y-1 text-sm">
      <div className="flex justify-between"><dt>KM day-180 incidence</dt><dd className="font-bold">{pct(result.km.atHorizon)}</dd></div>
      <div className="flex justify-between"><dt>Crude completions</dt><dd className="font-bold">{result.completed.toLocaleString()} / {result.n.toLocaleString()}</dd></div>
      <div className="flex justify-between"><dt>KM median</dt><dd className="font-bold">{result.km.medianDay === null ? "Not reached" : `${result.km.medianDay}d`}</dd></div>
      <div className="flex justify-between"><dt>KM 90th percentile</dt><dd className="font-bold">{result.km.p90Day === null ? "Not reached" : `${result.km.p90Day}d`}</dd></div>
      {hideContact ? <div className="text-xs text-slate-500">Contact rate is not computed in the routing comparison.</div> : null}
      <div className="text-xs text-slate-500">{result.language ? `Language gap ${signed(result.language.gap)} (Arabic n=${result.language.nAr}, English n=${result.language.nEn}).` : "Language gap not estimated."}</div>
      <div className="text-xs text-slate-500">{result.priorityGap ? `Tier 3 minus routine, completed by day 30: ${signed(result.priorityGap.gap)} (n=${result.priorityGap.nTier3} / ${result.priorityGap.nRoutine}).` : "Priority access gap not estimated."}</div>
    </dl>
  );
}

function PolicyCard({ result }: { result: SimSummary }) {
  const labels: Record<string, string> = { usual: "Usual care", more_calls: "More navigator calls", more_slots: "More slots", both: "Calls and slots" };
  return (
    <article className="rounded-xl bg-slate-50 p-4">
      <h3 className="font-extrabold">{labels[result.policyId] ?? result.policyId}</h3>
      <p className="text-xs text-slate-500">{result.dailySlots.reduce((sum, value) => sum + value, 0)} slots/day across the shared facilities.</p>
      <ResultLines result={result} />
    </article>
  );
}

function Sensitivity({ resources }: { resources: SimSummary[] }) {
  const usual = resources.find((result) => result.policyId === "usual");
  const calls = resources.find((result) => result.policyId === "more_calls");
  const slots = resources.find((result) => result.policyId === "more_slots");
  if (!usual || !calls || !slots) return null;
  const rows = usual.byOrigin.filter((row) => row.n >= 40).map((row) => {
    const callRate = calls.byOrigin.find((item) => item.id === row.id)?.rate ?? 0;
    const slotRate = slots.byOrigin.find((item) => item.id === row.id)?.rate ?? 0;
    const base = row.rate ?? 0;
    return { id: row.id, n: row.n, callGain: callRate - base, slotGain: slotRate - base };
  });
  if (rows.length === 0) return <p className="text-sm text-slate-500">No origin facility has 40 or more patients, so facility sensitivity is not estimated.</p>;
  const outreach = [...rows].sort((a, b) => b.callGain - a.callGain)[0];
  const constrained = [...rows].sort((a, b) => b.slotGain - a.slotGain)[0];
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-lg font-bold">Origin-facility sensitivity</h2>
      <p className="text-sm text-slate-600">Gain is the change in crude completion versus usual care, inside the resource comparison. Origins with fewer than 40 patients are left out.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <article className="rounded-xl bg-slate-50 p-4">
          <h3 className="font-extrabold">{facilityName(outreach.id)}</h3>
          <p className="text-xs text-slate-500">Largest calculated gain from more calls in this run. n={outreach.n}.</p>
          <p className="mt-2 text-2xl font-black text-blue-800">{signed(outreach.callGain)}</p>
          <p className="text-sm">More slots at this origin: {signed(outreach.slotGain)}.</p>
        </article>
        <article className="rounded-xl bg-slate-50 p-4">
          <h3 className="font-extrabold">{facilityName(constrained.id)}</h3>
          <p className="text-xs text-slate-500">Largest calculated gain from more slots in this run. n={constrained.n}.</p>
          <p className="mt-2 text-2xl font-black text-emerald-800">{signed(constrained.slotGain)}</p>
          <p className="text-sm">More calls at this origin: {signed(constrained.callGain)}.</p>
        </article>
      </div>
    </section>
  );
}
