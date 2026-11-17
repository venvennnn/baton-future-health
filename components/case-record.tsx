"use client";

import { PathologyLock, ReadinessGate, SbarThread } from "@/components/coordination";
import { useDemo } from "@/components/providers";
import { daysSinceResult, destinationOptions, isOverdue, overdueBy } from "@/lib/analytics";
import { formatDay, formatDays } from "@/lib/dates";
import { facilityName } from "@/lib/facilities";
import { BOOKING_SLA_DAYS, HANDOVER_LABEL, STAGE_LABEL, type OutreachTouch, type ScreeningCase } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";

export function CaseRecord({ caseId }: { caseId: string }) {
  const { cases, recordSimulatedHandover, recordSimulatedOutreach, recordNote } = useDemo();
  const item = cases.find((row) => row.id === caseId);
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  if (!item) return null;
  const options = destinationOptions(item, cases);
  const days = daysSinceResult(item);

  return (
    <main className="mx-auto flex w-full max-w-[1360px] flex-col gap-6 px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link href="/cases" className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-blue-700">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Case Board
          </Link>
          <span className="text-slate-300">/</span>
          <span className="font-bold">{item.id}</span>
          {isOverdue(item) ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">Overdue +{overdueBy(item)}d past {BOOKING_SLA_DAYS}d</span> : null}
          {item.simulatedPending ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">Simulated request in this browser</span> : null}
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <button type="button" className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold" onClick={() => window.print()}>Print SBAR</button>
          <button
            type="button"
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold"
            onClick={() => {
              void navigator.clipboard.writeText(window.location.href);
              setNotice("Link copied. This does not share the record with a clinical system.");
            }}
          >
            Copy link
          </button>
          <button type="button" disabled className="cursor-not-allowed rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-500" title="Malaffi is not connected in this demo">
            Malaffi not connected
          </button>
        </div>
      </div>

      {!item.closed && item.handoverStatus === "rejected_capacity" ? (
        <div className="flex flex-col justify-between gap-4 rounded-2xl bg-red-50 p-5 md:flex-row md:items-center">
          <div>
            <h2 className="text-lg font-extrabold text-red-800">Referral returned after an eligible-slot constraint</h2>
            <p className="text-sm text-slate-700">The case file says the patient was eligible and no slot remained. That is not a live capacity feed. Closure is still pending because the procedure has not been attended.</p>
          </div>
          <a href="#routing" className="rounded-full bg-red-700 px-5 py-2.5 text-sm font-bold text-white">Review destinations</a>
        </div>
      ) : null}

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="flex gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-xl font-bold text-blue-800">{item.initials}</div>
              <div>
                <h1 className="text-2xl font-extrabold">{item.name} {item.nameAr ? <span className="font-medium text-slate-500">{item.nameAr}</span> : null}</h1>
                <p className="text-sm text-slate-500">{item.age} years · {item.sex === "F" ? "Female" : "Male"} · EID {item.emiratesId}</p>
                <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5">{facilityName(item.originFacilityId)}</span>
                  {item.femaleTeamRequested ? (
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-950">Female specialist requested</span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">No specialist-gender request</span>
                  )}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Mini label="Accountable physician" value={item.physician} />
              <Mini label="Accountable team" value={`${item.ownerTeam} · ${item.ownerName}`} />
              <Mini label="Navigator" value={item.navigator ?? "Unassigned"} />
              <Mini label="Language" value={item.language === "ar" ? "Arabic" : "English"} />
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 lg:col-span-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold uppercase">FIT result</span>
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">{item.priority}</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-5xl font-black">{item.fitUgG}</span>
              <span className="text-slate-500">µg/g</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">Result date {formatDay(item.resultOn)}. The threshold used in this demo is above 10 µg/g for colonoscopy follow-up.</p>
          </div>
          <div className="flex flex-col gap-2 lg:col-span-3">
            <Mini label="Handover" value={item.simulatedPending ? "Simulated request pending — not transmitted" : HANDOVER_LABEL[item.handoverStatus]} />
            <Mini label="Stage" value={STAGE_LABEL[item.stage]} />
            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <div className="flex justify-between text-xs font-semibold text-slate-500"><span>Day {days} / {BOOKING_SLA_DAYS} booking target</span></div>
              <div className="mt-2 h-2 rounded-full bg-slate-200"><div className={`h-full rounded-full ${isOverdue(item) ? "bg-red-600" : "bg-emerald-600"}`} style={{ width: `${Math.min(100, (days / BOOKING_SLA_DAYS) * 100)}%` }} /></div>
            </div>
          </div>
        </div>
        <div className="mt-6" data-tour="record-milestones">
          <h2 className="font-bold">Screening-to-intervention milestones</h2>
          <p className="text-xs text-slate-500">Updated from the case file in this browser. Not a live diagnostic-report webhook.</p>
          <div className="mt-3 grid gap-3 md:grid-cols-5">
            <Milestone step="01" title="FIT result" done body={`${item.fitUgG} µg/g · ${formatDay(item.resultOn)}`} chip="Result logged" />
            <Milestone step="02" title="Patient outreach" done={item.outreach.length > 0 || item.stage !== "result_issued"} body={item.outreach.length ? `${item.outreach.length} logged touch${item.outreach.length === 1 ? "" : "es"}` : "No outreach logged"} chip={item.stage === "teach_back" ? "Teach-back open" : "See log"} />
            <Milestone step="03" title="Specialist referral" done={item.handoverStatus !== "not_sent"} alert={item.handoverStatus === "rejected_capacity" || item.handoverStatus === "reverted"} body={HANDOVER_LABEL[item.handoverStatus]} chip={item.endoscopyFacilityId ? facilityName(item.endoscopyFacilityId) : "No destination"} />
            <Milestone step="04" title="Colonoscopy slot" done={item.handoverStatus === "booked" || item.procedureAttended} body={item.procedureAttended ? "Procedure attended" : item.handoverStatus === "booked" ? "Slot recorded, not yet attended" : "No slot recorded"} chip="Attendance is separate from closure" />
            <Milestone step="05" title="Report and closure" done={item.closed} body={item.closurePendingReason ?? "Report and disposition are both present."} chip={item.closed ? "Documented closure" : "Locked until biopsy and disposition"} />
          </div>
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <ReadinessGate onReady={setReady} />
        <SbarThread item={item} />
        <PathologyLock
          item={item}
          onRecord={(detail) => {
            recordNote(item.id, detail);
          }}
        />
      </div>

      <Tasks item={item} />

      <div className="grid items-start gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <section id="routing" data-tour="record-routing" className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <h2 className="text-lg font-bold">Referral options in the case file</h2>
            <p className="text-sm text-slate-500">
              Effective wait adds the open queue depth, divided by daily slots, to the open booking age. {item.femaleTeamRequested ? "A female specialist was requested, so clinics with a female endoscopist are listed first." : "No specialist-gender request is on this profile."} This is calculated from the case file, not a live queue.
            </p>
            {!ready ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">The readiness checklist is still open, so a simulated handover stays disabled.</p> : null}
            <div className="mt-4 flex flex-col gap-3">
              {options.slice(0, 4).map((option, index) => {
                const suggested = index === 0 && !option.rejected;
                return (
                  <article key={option.facilityId} className={`rounded-2xl p-4 ${suggested ? "bg-blue-50 ring-1 ring-blue-200" : "bg-slate-50"}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-extrabold">{index + 1}. {option.name}</div>
                      <div className="flex flex-wrap gap-1">
                        {suggested ? <span className="rounded-full bg-blue-700 px-2 py-0.5 text-xs font-bold text-white">Suggested from this file</span> : null}
                        {option.rejected ? <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">Previously returned</span> : null}
                        {option.femaleTeam ? <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-950">Female endoscopist available</span> : <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-600">No female endoscopist listed</span>}
                      </div>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                      <Mini label="Effective wait" value={option.effectiveWait === null ? "Not calculated" : option.openN === 0 ? "Nothing waiting" : formatDays(option.effectiveWait)} />
                      <Mini label="Open booking age" value={option.openMedian === null ? `No open cases (n=${option.openN})` : `${formatDays(option.openMedian)} (n=${option.openN})`} />
                      <Mini label="Daily slots in the file" value={String(option.dailySlots)} />
                      <Mini label="Approx. distance" value={`${option.km} km, illustrative`} />
                    </dl>
                    {!option.rejected ? (
                      <button
                        type="button"
                        disabled={!ready}
                        className={`mt-3 rounded-full px-4 py-2 text-sm font-bold ${ready ? "bg-blue-700 text-white" : "cursor-not-allowed bg-slate-200 text-slate-500"}`}
                        onClick={() => {
                          if (!ready) return;
                          recordSimulatedHandover(item.id, option.facilityId);
                          setNotice(`Simulated handover request recorded for ${option.short}. No referral was sent.`);
                        }}
                      >
                        Record simulated handover to {option.short}
                      </button>
                    ) : null}
                  </article>
                );
              })}
            </div>
            {notice ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">{notice}</p> : null}
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Clinical handover summary (SBAR)</h2>
              <span className="text-xs font-semibold text-slate-500">Synthetic note</span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <SbarBlock letter="S" title="Situation" body={item.sbar.situation} />
              <SbarBlock letter="B" title="Background" body={item.sbar.background} />
              <SbarBlock letter="A" title="Assessment" body={item.sbar.assessment} />
              <SbarBlock letter="R" title="Recommendation" body={item.sbar.recommendation} />
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-5">
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <h2 className="text-lg font-bold">Outreach log</h2>
            <p className="text-xs text-slate-500">Buttons add a simulated log line. They do not place a call or send a message.</p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {(["call", "sms", "whatsapp", "clinic"] as const).map((channel) => (
                <button
                  key={channel}
                  type="button"
                  className="rounded-xl bg-slate-50 py-2 text-xs font-bold"
                  onClick={() => {
                    recordSimulatedOutreach(item.id, channel, note || `Simulated ${channel} entry.`);
                    setNotice(`Simulated ${channel} entry saved. Nothing was sent.`);
                  }}
                >
                  {channel === "clinic" ? "In-clinic" : channel === "whatsapp" ? "WhatsApp" : channel.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {item.outreach.map((touch) => <Touch key={touch.id} touch={touch} />)}
              {item.outreach.length === 0 ? <p className="text-sm text-slate-500">No outreach is logged yet.</p> : null}
            </div>
            <form
              className="mt-4 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                recordNote(item.id, note);
                setNote("");
                setNotice("Local note added to the audit history.");
              }}
            >
              <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Local note. It is not sent." className="flex-1 rounded-full bg-slate-100 px-4 py-2 text-sm outline-none" />
              <button type="submit" className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-700 text-white" aria-label="Add note">
                <span className="material-symbols-outlined text-[18px]">add</span>
              </button>
            </form>
          </section>

          <section id="audit" className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Audit history</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">Browser log, not tamper-proof</span>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {[...item.events].reverse().map((event) => (
                <article key={event.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                  <div className="flex justify-between gap-2 text-xs text-slate-500">
                    <span className="font-bold uppercase">{event.kind}{event.simulated ? " · simulated" : ""}</span>
                    <span>{event.on}</span>
                  </div>
                  <div className="font-bold">{event.label}</div>
                  <p className="text-slate-600">{event.detail}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Tasks({ item }: { item: ScreeningCase }) {
  const tasks = [
    item.procedureAttended ? null : "Procedure attendance is still outstanding.",
    item.procedureAttended && !item.reportReceived ? "Procedure report is outstanding." : null,
    item.reportReceived && !item.dispositionRecorded ? "Disposition is outstanding." : null,
    item.closed ? null : item.closurePendingReason,
  ].filter(Boolean) as string[];
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="font-bold">Outstanding tasks</h2>
      <p className="text-sm text-slate-500">Closure stays pending until the procedure, the report, and a disposition are all in the case file.</p>
      <ul className="mt-3 flex flex-col gap-2 text-sm">
        {item.closed ? <li className="rounded-xl bg-emerald-50 p-3 font-semibold text-emerald-800">Documented closure is present. Attendance and closure were recorded as separate events.</li> : tasks.map((task) => <li key={task} className="rounded-xl bg-amber-50 p-3">{task}</li>)}
      </ul>
    </section>
  );
}

function Milestone({ step, title, body, chip, done = false, alert = false }: { step: string; title: string; body: string; chip: string; done?: boolean; alert?: boolean }) {
  return (
    <article className={`rounded-xl p-3 ${alert ? "bg-red-50" : "bg-slate-50"} ${done || alert ? "" : "opacity-70"}`}>
      <div className="text-[11px] font-extrabold uppercase text-slate-500">Step {step}</div>
      <div className="font-extrabold">{title}</div>
      <p className="mt-1 text-xs text-slate-600">{body}</p>
      <div className="mt-2 rounded-full bg-white px-2 py-0.5 text-center text-[11px] font-bold">{chip}</div>
    </article>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="text-[11px] font-semibold uppercase text-slate-500">{label}</div>
      <div className="text-sm font-bold">{value}</div>
    </div>
  );
}

function SbarBlock({ letter, title, body }: { letter: string; title: string; body: string }) {
  return (
    <article className="rounded-xl bg-slate-50 p-3">
      <div className="flex items-center gap-2 font-extrabold"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-700 text-xs text-white">{letter}</span>{title}</div>
      <p className="mt-2 text-sm leading-relaxed text-slate-700">{body}</p>
    </article>
  );
}

function Touch({ touch }: { touch: OutreachTouch }) {
  return (
    <article className="rounded-xl bg-slate-50 p-3 text-sm">
      <div className="flex justify-between gap-2">
        <span className="font-bold">{touch.title}</span>
        <span className="text-xs text-slate-500">{touch.on}</span>
      </div>
      <p className="mt-1 text-slate-700">{touch.detail}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{touch.simulated ? "Simulated. " : ""}{touch.outcome}</p>
    </article>
  );
}
