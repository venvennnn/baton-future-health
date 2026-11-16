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

function Ribbon({ prefix, blue, green }: { prefix: string; blue: string; green: string }) {
  const paths = [
    { id: "notReached", d: "M 120,150 C 180,150 190,80 250,80 L 250,118 C 190,118 180,185 120,185 Z", fill: `url(#${prefix}-blue)`, sweep: blue },
    { id: "reached", d: "M 120,185 C 180,185 180,240 240,240 L 240,265 C 180,265 180,215 120,215 Z", fill: `url(#${prefix}-green)`, sweep: green },
    { id: "booked", d: "M 330,240 C 375,240 380,200 440,200 L 440,225 C 380,225 375,250 330,250 Z", fill: `url(#${prefix}-booked)`, sweep: green },
    { id: "notBooked", d: "M 330,255 C 375,255 385,275 440,275 L 440,290 C 385,290 375,270 330,270 Z", fill: `url(#${prefix}-leak)`, sweep: green },
  ];
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 540 320" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={`${prefix}-blue`} x1="0%" x2="100%">
          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.25" />
        </linearGradient>
        <linearGradient id={`${prefix}-green`} x1="0%" x2="100%">
          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.5" />
          <stop offset="55%" stopColor="#10b981" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#059669" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id={`${prefix}-booked`} x1="0%" x2="100%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#059669" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id={`${prefix}-leak`} x1="0%" x2="100%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.4" />
        </linearGradient>
        {paths.map((path) => (
          <linearGradient key={path.id} id={`${prefix}-sweep-${path.id}`} x1="0%" x2="100%">
            <stop offset="0" stopColor={path.sweep} stopOpacity="0" />
            <stop offset=".5" stopColor={path.sweep} stopOpacity=".68" />
            <stop offset="1" stopColor={path.sweep} stopOpacity="0" />
            <animateTransform attributeName="gradientTransform" type="translate" values="-1 0;1 0;1 0" keyTimes="0;.62;1" dur="4s" repeatCount="indefinite" />
          </linearGradient>
        ))}
      </defs>
      {paths.map((path) => (
        <g key={path.id}>
          <path d={path.d} fill={path.fill} />
          <path className="baton-ribbon-sweep" d={path.d} fill={`url(#${prefix}-sweep-${path.id})`} />
        </g>
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

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
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
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-xl font-extrabold ${tone === "blue" ? "text-blue-700" : "text-emerald-700"}`}>{title}</span>
            <span className="text-xl font-extrabold">bottleneck</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold">{pattern}</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{text}</p>
        </div>
        <div className="text-right">
          <span className="block text-xs font-semibold text-slate-400">Example leakage</span>
          <span className="text-sm font-extrabold text-red-600">{leak}</span>
        </div>
      </div>
      <div className="relative h-[330px] overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/70">
        <Ribbon prefix={prefix} blue="#418cff" green="#16d4a6" />
        <Node className="left-3 top-[125px]" bar="bg-blue-700" kicker="FIT" title="positive" value={nodes.fit} />
        <Node className="left-[38%] top-[48px]" bar="bg-red-500" kicker="Not reached" value={nodes.notReached} />
        <Node className="left-[36%] top-[200px]" bar="bg-emerald-600" kicker="Reached" value={nodes.reached} />
        <Node className="right-3 top-[150px]" bar="bg-emerald-600" kicker="Booked" value={nodes.booked} />
        <Node className="right-3 top-[240px]" bar="bg-slate-400" kicker="Not booked" value={nodes.notBooked} />
      </div>
      <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">These four numbers are an example picture. They do not change the case file or the simulator.</p>
    </article>
  );
}

function Node({ className, bar, kicker, title, value }: { className: string; bar: string; kicker: string; title?: string; value: string }) {
  return (
    <div className={`absolute z-10 flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-md ${className}`}>
      <span className={`mr-2 h-9 w-1.5 rounded-full ${bar}`} />
      <span>
        <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">{kicker}</span>
        {title ? <span className="block text-xs font-bold">{title}</span> : null}
        <span className="block text-base font-black">{value}</span>
      </span>
    </div>
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
