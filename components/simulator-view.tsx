"use client";

import { EquityPareto } from "@/components/coordination";
import { facilityShort } from "@/lib/facilities";
import { ALMANSOORI, MODEL_TAG, USUAL_CALLS_PER_DAY } from "@/lib/impact";
import { estimateImpact, type Category, type ImpactScenario, type OrderImpact, type Strategy } from "@/lib/sim/calibration";
import { buildCohort, simulateRouting, type ResourcePolicy, type RoutingPolicyId } from "@/lib/sim/model";
import { useMemo, useState } from "react";

const EXAMPLE_IDS = ["FIT-26771", "FIT-26780", "FIT-26764", "FIT-26811"];
const ROUTING: { id: RoutingPolicyId; label: string; detail: string }[] = [
  { id: "current", label: "Current routing", detail: "Stay at the designated facility. Priority orders the local queue. Eligibility still applies." },
  { id: "shortest_displayed", label: "Shortest displayed wait", detail: "On referral, pick the eligible facility with the shortest queue divided by its daily slots." },
  { id: "capacity_aware", label: "Capacity-aware assignment", detail: "Each day, higher clinician priority chooses first among eligible facilities that still have a slot, with a female-team preference as a tie break." },
];

const ORDER_LABEL: Record<Strategy, string> = {
  fifo: "First come, first served",
  risk: "Highest predicted dropout first",
  benefit: "Handover losses first",
};

function pct(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

function span(low: number, high: number, digits = 1): string {
  return `${low.toFixed(digits)}–${high.toFixed(digits)}`;
}

function scenarioSpan(order: OrderImpact, digits = 1): string {
  return `${pct(order.central.completion, digits)} (${pct(order.low.completion, digits)}–${pct(order.high.completion, digits)})`;
}

export function SimulatorView() {
  const [calls, setCalls] = useState(8);
  const [slots, setSlots] = useState(0);
  const [teachBack, setTeachBack] = useState(false);
  const [strategy, setStrategy] = useState<ResourcePolicy["strategy"]>("fifo");
  const [replicates, setReplicates] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [seed, setSeed] = useState(26771);
  const [showRun, setShowRun] = useState(false);

  const cohort = useMemo(() => buildCohort(seed, 2500, seed === 26771), [seed]);
  const impact = useMemo(() => estimateImpact(cohort, calls, seed), [cohort, calls, seed]);
  const routing = useMemo(() => ROUTING.map((policy) => simulateRouting(cohort, policy.id, undefined, EXAMPLE_IDS)), [cohort]);
  const selected = impact.byOrder.find((order) => order.strategy === strategy) ?? impact.sameTeam;
  const saturated = impact.extraCapacity.reached >= cohort.length;

  function runSimulation() {
    setShowRun(true);
    setRunning(true);
    setReplicates(null);
    window.setTimeout(() => {
      const runs: { seed: number; same: number; extra: number }[] = [];
      for (let offset = 1; offset <= 8; offset += 1) {
        const nextSeed = 26771 + offset;
        const sample = buildCohort(nextSeed, 2500, false);
        const result = estimateImpact(sample, calls, nextSeed);
        runs.push({ seed: nextSeed, same: result.sameTeam.central.completion, extra: result.extraCapacity.central.completion });
      }
      const summarize = (values: number[]) => {
        const sorted = [...values].sort((a, b) => a - b);
        const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
        return `mean ${pct(mean, 2)}, spread ${pct(sorted[0], 2)} to ${pct(sorted[sorted.length - 1], 2)}`;
      };
      const current = runs.findIndex((run) => run.seed === seed);
      const chosen = runs[(current + 1) % runs.length];
      setSeed(chosen.seed);
      setReplicates(`Showing seed ${chosen.seed}. The Model column is now this run: same team ${pct(chosen.same, 2)}. Across seeds 26772–26779, same team is ${summarize(runs.map((run) => run.same))}. Extra navigator capacity at ${calls} calls/day is ${summarize(runs.map((run) => run.extra))}. Target stays the study. Usual care still passes. This seed spread is not a clinical confidence interval. ${MODEL_TAG}`);
      setRunning(false);
    }, 30);
  }

  function download() {
    const blob = new Blob([JSON.stringify({ seed, n: cohort.length, impact }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "baton-synthetic-simulation.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="page-rise mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-800">Seeded model · n={cohort.length.toLocaleString()} · seed {seed}</span>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">Capacity planning — screening pathway</h1>
          <p className="mt-1 text-sm text-slate-700">Usual care is calibrated to completion recorded by Almansoori et al. 2021. The navigation effect is the Coronado et al. 2025 odds ratio, applied only to handover losses the same team can reach. The low–high range is that trial’s odds-ratio interval (1.30 to 2.19). This is not a Department of Health result.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50" onClick={() => { setCalls(8); setSlots(0); setTeachBack(false); setStrategy("fifo"); setSeed(26771); setShowRun(false); setReplicates(null); }}>Reset levers</button>
          <button type="button" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50" onClick={download}>Save scenario</button>
          <button type="button" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-60" onClick={runSimulation} disabled={running}>{running ? "Running…" : "Run simulation"}</button>
        </div>
      </div>
      {replicates ? <p className="rounded-xl bg-slate-50 p-3 text-sm">{replicates}</p> : null}

      <section className="stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Usual care (calibrated to Abu Dhabi)" value={pct(impact.usualCare)} delta={`Target ${pct(impact.calibration[0]?.target ?? 0)} · completion recorded in the study`} note={MODEL_TAG} />
        <Metric label="With Baton · same team" value={pct(impact.sameTeam.central.completion)} delta={`${pct(impact.sameTeam.low.completion)}–${pct(impact.sameTeam.high.completion)}`} note={`Same ${USUAL_CALLS_PER_DAY} calls/day and the same endoscopy slots. ${MODEL_TAG}`} />
        <Metric label="Extra colonoscopies per 1,000 positives" value={impact.sameTeam.central.perThousand.toFixed(1)} delta={span(impact.sameTeam.low.perThousand, impact.sameTeam.high.perThousand)} note={MODEL_TAG} />
        <Metric label="In a cohort the size of Almansoori et al." value={`≈${Math.round(impact.sameTeam.central.ofMissed)}`} delta={`${Math.round(impact.sameTeam.low.ofMissed)}–${Math.round(impact.sameTeam.high.ofMissed)} of the ${ALMANSOORI.noColonoscopy.toLocaleString()} who were missed`} note={MODEL_TAG} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="text-lg font-bold text-slate-950">Baton + extra navigator capacity</h2>
        <p className="mt-1 text-sm text-slate-700">Secondary result. It uses the calls lever below and the same first-come order as the headline, so the difference is staffing. It is not the headline.</p>
        <p className="mt-3 text-2xl font-extrabold text-slate-950">{scenarioSpan(impact.extraCapacity)}</p>
        <p className="text-sm font-semibold text-slate-800">{impact.extraCapacity.central.perThousand.toFixed(1)} extra colonoscopies per 1,000 ({span(impact.extraCapacity.low.perThousand, impact.extraCapacity.high.perThousand)}). ≈{Math.round(impact.extraCapacity.central.ofMissed)} of the {ALMANSOORI.noColonoscopy.toLocaleString()} ({Math.round(impact.extraCapacity.low.ofMissed)}–{Math.round(impact.extraCapacity.high.ofMissed)}).</p>
        <p className="mt-2 text-xs text-slate-600">Lever settings: {calls} calls/day, usual care is {USUAL_CALLS_PER_DAY}. This reaches {impact.extraCapacity.reached.toLocaleString()} of {cohort.length.toLocaleString()} patients. {saturated ? "The one-call-reaches-one-patient assumption covers the whole cohort at this setting." : "Some patients are not reached."} Endoscopy slots are unchanged. Teach-back, the readiness gate, and routing are not counted. {MODEL_TAG}</p>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-12">
        <section data-tour="sim-controls" className="flex flex-col gap-5 self-start rounded-2xl border border-slate-200 bg-white p-5 shadow-card lg:col-span-4">
          <h2 className="text-lg font-bold text-slate-900">Levers</h2>
          <label className="rounded-xl bg-slate-50 p-4">
            <span className="flex justify-between font-semibold"><span>A. Extra navigator calls / day</span><span className="text-blue-700">{calls}</span></span>
            <p className="text-xs text-slate-500">Drives only “Baton + extra navigator capacity”. The headline stays at {USUAL_CALLS_PER_DAY} calls/day. Assumption: one call reaches one patient, and capacity is calls × 365 days.</p>
            <input className="mt-2 w-full accent-blue-700" type="range" min={6} max={16} step={1} value={calls} onChange={(event) => setCalls(Number(event.target.value))} />
          </label>
          <fieldset className="rounded-xl bg-slate-50 p-4">
            <legend className="font-semibold">B. Who is reached when capacity is short</legend>
            <p className="mb-2 text-xs text-slate-500">The trial found no moderation by predicted completion, so the odds ratio is the same for every reached patient. Order changes who is reached. It does not change the headline.</p>
            {(["fifo", "risk", "benefit"] as const).map((item) => (
              <label key={item} className="mt-2 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm">
                <input type="radio" name="strategy" checked={strategy === item} onChange={() => setStrategy(item)} />
                {ORDER_LABEL[item]}
              </label>
            ))}
            <p className="mt-3 text-xs text-slate-700">At {USUAL_CALLS_PER_DAY} calls/day this order reaches {selected.handoverReached.toLocaleString()} handover losses and completes {pct(selected.central.completion)} at the central odds ratio. Headline order is first come, first served ({pct(impact.sameTeam.central.completion)}).</p>
          </fieldset>
          <label className="rounded-xl bg-slate-50 p-4">
            <span className="flex justify-between font-semibold"><span>C. Extra endoscopy slots</span><span className="text-emerald-700">+{slots}%</span></span>
            <p className="text-xs text-slate-500">Workflow only. Not counted: no published effect size yet. The headline keeps usual-care slots.</p>
            <input className="mt-2 w-full accent-emerald-700" type="range" min={0} max={30} step={5} value={slots} onChange={(event) => setSlots(Number(event.target.value))} />
          </label>
          <button type="button" className="flex items-center justify-between rounded-xl bg-slate-50 p-4 text-left" onClick={() => setTeachBack((value) => !value)} aria-pressed={teachBack}>
            <span>
              <span className="block font-semibold">D. Bilingual teach-back</span>
              <span className="text-xs text-slate-500">Workflow only. Not counted: no published effect size yet. It does not send an SMS.</span>
            </span>
            <span className={`h-7 w-12 rounded-full p-1 ${teachBack ? "bg-emerald-600" : "bg-slate-300"}`}><span className={`block h-5 w-5 rounded-full bg-white transition ${teachBack ? "translate-x-5" : ""}`} /></span>
          </button>
        </section>

        <div className="flex flex-col gap-5 lg:col-span-8">
          <CalibrationTable rows={impact.calibration} showRun={showRun} n={impact.n} usualCounts={impact.usualCounts} runCounts={impact.runCounts} />
          <Decomposition impact={impact} />
        </div>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-lg font-bold">Routing comparison</h2>
        <p className="text-sm text-slate-600">Workflow only. Not counted: no published effect size yet. The same daily slots are used in every policy ({routing[0]?.dailySlots.reduce((sum, value) => sum + value, 0) ?? 0} slots/day). Completion is not estimated here.</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {ROUTING.map((policy) => (
            <article key={policy.id} className="rounded-xl bg-slate-50 p-4">
              <h3 className="font-extrabold">{policy.label}</h3>
              <p className="text-xs text-slate-500">{policy.detail}</p>
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
          <p className="mt-2 text-xs text-slate-500">The worked example uses the shared case ids inside the seeded cohort. It is not the impact estimate.</p>
        </div>
      </section>

      <EquityPareto />
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

function shareOf(id: string, counts: Record<Category, number>, n: number): number {
  if (id === "complete") return n === 0 ? 0 : counts.complete / n;
  const missed = n - counts.complete;
  return missed === 0 ? 0 : (counts[id as Category] ?? 0) / missed;
}

function signedPp(after: number, before: number): string {
  const pp = (after - before) * 100;
  const rounded = Math.abs(pp).toFixed(1);
  if (Math.abs(pp) < 0.05) return "0.0 pp";
  return `${pp > 0 ? "+" : "−"}${rounded} pp`;
}

function CalibrationTable({
  rows,
  showRun,
  n,
  usualCounts,
  runCounts,
}: {
  rows: { id: string; label: string; target: number; model: number; pass: boolean; basis: string }[];
  showRun: boolean;
  n: number;
  usualCounts: Record<Category, number>;
  runCounts: Record<Category, number>;
}) {
  const passed = rows.every((row) => row.pass);
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <h2 className="font-bold">Calibration check</h2>
      <p className="text-xs text-slate-500">
        {showRun
          ? `The Model column is this run: same team, central odds ratio, on the seed above. Target stays the study. Usual care on this seed still ${passed ? "passes" : "fails"}: completion within 1 percentage point, and each loss share of the people with no colonoscopy within 2. Refused, clinical reasons, and other keep the same count. Their share can rise because fewer people are missed.`
          : "Usual care on this seed. Completion is within 1 percentage point of the study. Each loss share is within 2 percentage points. The loss shares are of the people with no colonoscopy. Run simulation replaces the Model column with this run."}
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="text-xs uppercase text-slate-500">
              <th className="py-2">Row</th>
              <th className="py-2">Target</th>
              <th className="py-2">{showRun ? "This run" : "Model"}</th>
              <th className="py-2">{showRun ? "Change" : "Check"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const usual = shareOf(row.id, usualCounts, n);
              const run = shareOf(row.id, runCounts, n);
              const usualCount = usualCounts[row.id as Category] ?? 0;
              const runCount = runCounts[row.id as Category] ?? 0;
              const detail = row.id === "complete"
                ? `${runCount.toLocaleString()} of ${n.toLocaleString()}`
                : usualCount === runCount
                  ? `${runCount.toLocaleString()} people, same count`
                  : `${runCount.toLocaleString()} still missed, was ${usualCount.toLocaleString()}`;
              let checkClass = "text-red-800";
              let checkLabel = "Fail";
              if (showRun) {
                checkClass = "text-blue-800";
                checkLabel = signedPp(run, usual);
              } else if (row.pass) {
                checkClass = "text-emerald-800";
                checkLabel = "Pass";
              }
              return (
                <tr key={row.id} className="border-t">
                  <td className="py-2">
                    <div className="font-semibold">{row.label}</div>
                    <div className="text-xs text-slate-500">{row.basis}</div>
                  </td>
                  <td className="py-2">{pct(row.target)}</td>
                  <td className={`py-2 ${showRun ? "font-bold text-blue-800" : ""}`}>
                    {showRun ? pct(run) : pct(row.model)}
                    {showRun ? <div className="text-xs font-medium text-slate-600">{detail}</div> : null}
                  </td>
                  <td className={`py-2 font-bold ${checkClass}`}>{checkLabel}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Decomposition({ impact }: { impact: ReturnType<typeof estimateImpact> }) {
  const navigation = (scenario: ImpactScenario) => (scenario.completion - impact.usualCare) * 100;
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <h2 className="font-bold">What is counted</h2>
      <p className="text-xs text-slate-500">The headline is row (a) only, at the same team. Navigation is applied to never got the result, referred never went, and booked never came. Refused, clinical reasons, and other stay as they are. That is a conservative assumption.</p>
      <table className="mt-3 w-full text-left text-sm">
        <thead>
          <tr className="text-xs uppercase text-slate-500">
            <th className="py-2">Piece</th>
            <th className="py-2">Effect</th>
            <th className="py-2">Source</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t align-top">
            <td className="py-2 font-semibold">a. Navigation of handover losses</td>
            <td className="py-2">+{navigation(impact.sameTeam.central).toFixed(1)} pp ({navigation(impact.sameTeam.low).toFixed(1)}–{navigation(impact.sameTeam.high).toFixed(1)})</td>
            <td className="py-2 text-xs text-slate-600">Coronado et al. 2025 odds ratio, on patients reached with {USUAL_CALLS_PER_DAY} calls/day.</td>
          </tr>
          <tr className="border-t align-top">
            <td className="py-2 font-semibold">b. Prioritising who is reached</td>
            <td className="py-2">+{(impact.rankingPp.central * 100).toFixed(1)} pp ({(impact.rankingPp.low * 100).toFixed(1)}–{(impact.rankingPp.high * 100).toFixed(1)})</td>
            <td className="py-2 text-xs text-slate-600">Model mechanics, no extra effect size. Handover losses first versus first come, first served, at the same {USUAL_CALLS_PER_DAY} calls/day. Not in the headline.</td>
          </tr>
          <ZeroRow label="c. Teach-back" />
          <ZeroRow label="d. Readiness gate" />
          <ZeroRow label="e. Routing" />
        </tbody>
      </table>
      <p className="mt-3 text-xs text-slate-500">{MODEL_TAG}</p>
    </section>
  );
}

function ZeroRow({ label }: { label: string }) {
  return (
    <tr className="border-t align-top">
      <td className="py-2 font-semibold">{label}</td>
      <td className="py-2">not counted: no published effect size yet</td>
      <td className="py-2 text-xs text-slate-600">Effect held at 0. The lever stays available for the workflow.</td>
    </tr>
  );
}
