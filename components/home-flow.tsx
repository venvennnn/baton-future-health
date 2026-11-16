"use client";

import { programmeCounts } from "@/lib/analytics";
import { facilityName } from "@/lib/facilities";
import { useDemo } from "@/components/providers";
import Link from "next/link";
import { useState } from "react";

const SCENARIOS = {
  outreach: {
    left: { fit: "1,000", notReached: "420", reached: "580", booked: "520", notBooked: "60" },
    right: { fit: "1,000", notReached: "120", reached: "880", booked: "560", notBooked: "320" },
    leftLeak: "42% unreachable",
    rightLeak: "320 pending slot",
  },
  booking: {
    left: { fit: "1,000", notReached: "280", reached: "720", booked: "420", notBooked: "300" },
    right: { fit: "1,000", notReached: "100", reached: "900", booked: "480", notBooked: "420" },
    leftLeak: "28% unreachable",
    rightLeak: "420 pending slot",
  },
  optimized: {
    left: { fit: "1,000", notReached: "80", reached: "920", booked: "870", notBooked: "50" },
    right: { fit: "1,000", notReached: "60", reached: "940", booked: "890", notBooked: "50" },
    leftLeak: "8% unreachable",
    rightLeak: "50 pending slot",
  },
} as const;

const BOX = { w: 128, h: 68 };

function countOf(value: string) {
  return Number(value.replace(/,/g, "")) || 0;
}

function band(part: number, whole: number, min: number, max: number) {
  const share = whole > 0 ? Math.max(0, Math.min(1, part / whole)) : 0;
  return min + (max - min) * share;
}

function FlowChart({ prefix, nodes }: { prefix: string; nodes: { fit: string; notReached: string; reached: string; booked: string; notBooked: string } }) {
  const fit = countOf(nodes.fit);
  const notReached = countOf(nodes.notReached);
  const reached = countOf(nodes.reached);
  const booked = countOf(nodes.booked);
  const notBooked = countOf(nodes.notBooked);
  const boxes = {
    fit: { x: 16, y: 166 },
    notReached: { x: 286, y: 28 },
    reached: { x: 286, y: 176 },
    booked: { x: 612, y: 118 },
    notBooked: { x: 612, y: 286 },
  };
  const fitOut = { x: boxes.fit.x + BOX.w + 8, y: boxes.fit.y + BOX.h / 2 };
  const missedIn = { x: boxes.notReached.x - 8, y: boxes.notReached.y + BOX.h / 2 };
  const reachedIn = { x: boxes.reached.x - 8, y: boxes.reached.y + BOX.h / 2 };
  const reachedOut = { x: boxes.reached.x + BOX.w + 8, y: boxes.reached.y + BOX.h / 2 };
  const bookedIn = { x: boxes.booked.x - 8, y: boxes.booked.y + BOX.h / 2 };
  const openIn = { x: boxes.notBooked.x - 8, y: boxes.notBooked.y + BOX.h / 2 };
  const streams = [
    { id: "miss", d: `M ${fitOut.x} ${fitOut.y} C 210 ${fitOut.y}, 220 ${missedIn.y}, ${missedIn.x} ${missedIn.y}`, width: band(notReached, fit, 8, 34), color: "#60a5fa", delay: "0s" },
    { id: "reach", d: `M ${fitOut.x} ${fitOut.y} C 210 ${fitOut.y}, 220 ${reachedIn.y}, ${reachedIn.x} ${reachedIn.y}`, width: band(reached, fit, 10, 40), color: "#34d399", delay: "0.15s" },
    { id: "booked", d: `M ${reachedOut.x} ${reachedOut.y} C 470 ${reachedOut.y}, 500 ${bookedIn.y}, ${bookedIn.x} ${bookedIn.y}`, width: band(booked, reached, 8, 32), color: "#059669", delay: "0.45s" },
    { id: "open", d: `M ${reachedOut.x} ${reachedOut.y} C 470 ${reachedOut.y}, 500 ${openIn.y}, ${openIn.x} ${openIn.y}`, width: band(notBooked, reached, 6, 26), color: "#94a3b8", delay: "0.6s" },
  ];
  const labels = [
    { key: "fit", ...boxes.fit, bar: "#1d4ed8", kicker: "FIT", title: "positive", value: nodes.fit },
    { key: "notReached", ...boxes.notReached, bar: "#ef4444", kicker: "Not reached", title: "", value: nodes.notReached },
    { key: "reached", ...boxes.reached, bar: "#059669", kicker: "Reached", title: "", value: nodes.reached },
    { key: "booked", ...boxes.booked, bar: "#059669", kicker: "Booked", title: "", value: nodes.booked },
    { key: "notBooked", ...boxes.notBooked, bar: "#94a3b8", kicker: "Not booked", title: "", value: nodes.notBooked },
  ];

  return (
    <svg viewBox="0 0 760 400" className="h-auto w-full" role="img" aria-label="Example flow from a positive FIT result">
      <defs>
        {streams.map((stream) => (
          <linearGradient key={stream.id} id={`${prefix}-${stream.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor={stream.color} />
          </linearGradient>
        ))}
      </defs>
      {streams.map((stream) => (
        <g key={stream.id}>
          <path className="flow-stream" d={stream.d} pathLength={1} fill="none" stroke={`url(#${prefix}-${stream.id})`} strokeWidth={stream.width} strokeLinecap="round" style={{ animationDelay: stream.delay }} />
          <path className="flow-pulse" d={stream.d} pathLength={1} fill="none" stroke="white" strokeWidth={Math.max(3, stream.width * 0.34)} strokeLinecap="round" strokeOpacity="0.9" style={{ animationDelay: `${Number.parseFloat(stream.delay) + 0.9}s` }} />
          <circle className="flow-bead" r="5.5" fill="white" stroke={stream.color} strokeWidth="2.5">
            <animateMotion dur="2.6s" begin={`${Number.parseFloat(stream.delay) + 0.9}s`} repeatCount="indefinite" path={stream.d} calcMode="linear" />
          </circle>
        </g>
      ))}
      {labels.map((label, index) => (
        <foreignObject key={label.key} x={label.x} y={label.y} width={BOX.w} height={BOX.h}>
          <div className="flow-node flex h-full items-center rounded-xl border border-slate-200 bg-white px-2.5 shadow-md" style={{ animationDelay: `${0.08 + index * 0.08}s` }}>
            <span className="mr-2 h-8 w-1.5 shrink-0 rounded-full" style={{ background: label.bar }} />
            <span className="min-w-0 leading-tight">
              <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">{label.kicker}</span>
              {label.title ? <span className="block text-[11px] font-bold text-slate-800">{label.title}</span> : null}
              <span className="block text-sm font-black text-slate-950">{label.value}</span>
            </span>
          </div>
        </foreignObject>
      ))}
    </svg>
  );
}

export function HomeFlow() {
  const { cases, clinicId } = useDemo();
  const [scenario, setScenario] = useState<keyof typeof SCENARIOS>("outreach");
  const visible = cases.filter((item) => clinicId === "all" || item.originFacilityId === clinicId || item.facilityId === clinicId || item.endoscopyFacilityId === clinicId);
  const programme = programmeCounts(visible);
  const picture = SCENARIOS[scenario];
  const share = (count: number) => (programme.cohort ? `${((count / programme.cohort) * 100).toFixed(1)}%` : "—");

  return (
    <div id="interactive-flows" className="mx-auto flex w-full max-w-[1400px] flex-col gap-10 px-4 py-10 sm:px-6">
      <div className="flex flex-col justify-between gap-6 border-b border-slate-200 pb-2 lg:flex-row lg:items-end">
        <div className="max-w-3xl">
          <div className="flex w-fit flex-wrap items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            <span className="font-bold text-blue-800">Screening cohort bottleneck patterns</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600">Illustrative example, not calculated from the case file</span>
          </div>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">See where screening follow-up stalls.</h2>
          <p className="mt-2 text-sm font-medium text-slate-600 sm:text-base">
            The diagrams below are teaching patterns. Measured waits, with denominators, are on Facility bottlenecks.
            {clinicId !== "all" ? ` Programme counts are filtered to ${facilityName(clinicId)}.` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <span className="px-2 text-xs font-bold uppercase tracking-wider text-slate-400">Example</span>
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            {(["outreach", "booking", "optimized"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setScenario(key)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold ${scenario === key ? "bg-white text-blue-700 shadow-sm" : "text-slate-600"}`}
              >
                {key === "outreach" ? "Outreach bottleneck" : key === "booking" ? "Booking bottleneck" : "Target picture"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div data-tour="home-flows" className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <PatternCard title="Outreach" tone="blue" pattern="Pattern A" text="Patient contact gap: high drop-off before a navigator speaks with the patient." leak={picture.leftLeak} nodes={picture.left} prefix="flow-a" />
        <PatternCard title="Booking" tone="green" pattern="Pattern B" text="Scheduling gap: patients are contacted, then wait for an endoscopy slot." leak={picture.rightLeak} nodes={picture.right} prefix="flow-b" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <span className="block text-sm font-bold">Open the cases behind the pathway</span>
          <span className="text-xs text-slate-500">{kpisLabel(visible.length)} in the synthetic case file for this view.</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/cases" className="inline-flex items-center gap-2 rounded-full bg-blue-700 px-5 py-2.5 text-sm font-bold text-white">
            Open case board <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
          <Link href="/simulator" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-5 py-2.5 text-sm font-bold">
            Explore policy simulator <span className="material-symbols-outlined text-[18px] text-blue-700">tune</span>
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h3 className="text-2xl font-extrabold tracking-tight">The programme view</h3>
            <p className="text-sm text-slate-500">Counts from the synthetic case file (n={programme.cohort}). Procedure attendance and documented closure are separate.</p>
          </div>
          <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">Not a live clearance rate</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StageCard kicker="Stage 01" title="Positive FIT result" body="Synthetic register entry. No health-information exchange is connected." value={String(programme.cohort)} detail="Cases in this view" note="100% of the file" />
          <StageCard kicker="Stage 02" title="Outreach and contact" body="Moved past the result, or has a logged outreach touch." value={String(programme.contacted)} detail={share(programme.contacted)} note="of this view" />
          <StageCard kicker="Stage 03" title="Handover and booking" body="A slot is recorded, or the procedure was attended." value={String(programme.booked)} detail={share(programme.booked)} note="of this view" />
          <StageCard kicker="Stage 04" title="Colonoscopy attended" body={`${programme.attendedWithoutClosure} attended with closure still pending. ${programme.closed} have documented closure.`} value={String(programme.attended)} detail={`${programme.closed} closed`} note="attendance ≠ closure" />
        </div>
      </div>
    </div>
  );
}

function kpisLabel(count: number) {
  return `${count} case${count === 1 ? "" : "s"}`;
}

function PatternCard({
  title,
  tone,
  pattern,
  text,
  leak,
  nodes,
  prefix,
}: {
  title: string;
  tone: "blue" | "green";
  pattern: string;
  text: string;
  leak: string;
  nodes: { fit: string; notReached: string; reached: string; booked: string; notBooked: string };
  prefix: string;
}) {
  return (
    <article className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className={`absolute inset-x-0 top-0 h-1.5 ${tone === "blue" ? "bg-blue-700" : "bg-emerald-600"}`} />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`text-xl font-extrabold ${tone === "blue" ? "text-blue-700" : "text-emerald-700"}`}>{title}</span>
            <span className="text-xl font-extrabold">bottleneck</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold">{pattern}</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{text}</p>
        </div>
        <div className="shrink-0 sm:text-right">
          <span className="block text-xs font-semibold text-slate-400">Example leakage</span>
          <span className="text-sm font-extrabold text-red-600">{leak}</span>
        </div>
      </div>
      <div key={leak} className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/70 px-2 py-3">
        <FlowChart prefix={prefix} nodes={nodes} />
      </div>
      <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">These four numbers are an example picture. They do not change the case file or the simulator.</p>
    </article>
  );
}

function StageCard({ kicker, title, body, value, detail, note }: { kicker: string; title: string; body: string; value: string; detail: string; note: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">{kicker}</span>
      <h4 className="mt-2 font-bold">{title}</h4>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{body}</p>
      <div className="mt-6 flex items-end justify-between border-t border-slate-100 pt-4">
        <div>
          <span className="block text-2xl font-black">{value}</span>
          <span className="text-[11px] text-slate-400">{detail}</span>
        </div>
        <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">{note}</span>
      </div>
    </article>
  );
}
