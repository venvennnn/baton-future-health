"use client";

import { PathologyLock, ReadinessGate, SbarThread } from "@/components/coordination";
import { DraftBox } from "@/components/draft-box";
import { useDemo } from "@/components/providers";
import { RiskPill } from "@/components/risk-pill";
import { daysSinceResult, destinationOptions, isOverdue, maskEmiratesId, overdueBy } from "@/lib/analytics";
import { DEMO_CASE_ID } from "@/lib/cases";
import { formatDay, formatDays } from "@/lib/dates";
import { facilityName } from "@/lib/facilities";
import { MODEL_CARD, dropoutRisk, topReasons } from "@/lib/risk";
import { BOOKING_SLA_DAYS, type OutreachTouch } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";

export function CaseRecord({ caseId }: { caseId: string }) {
  const { cases, recordSimulatedHandover, recordColonoscopyAttended, recordDemoClosure, resetDemoCase, recordSimulatedOutreach, recordNote } = useDemo();
  const item = cases.find((row) => row.id === caseId);
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [gateKey, setGateKey] = useState(0);
  if (!item) return null;
  const options = destinationOptions(item, cases);
  const eligible = options.filter((option) => !option.rejected);
  const suggested = eligible[0];
  const returned = options.find((option) => option.rejected);
  const days = daysSinceResult(item);
  const remaining = BOOKING_SLA_DAYS - days;
  const risk = dropoutRisk(item);

  return (
    <main className="page-rise mx-auto max-w-7xl space-y-5 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-2 text-xs text-slate-700 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link href="/cases" className="hover:text-blue-800 hover:underline">Case Board</Link>
          <span>›</span>
          <span>Cases</span>
          <span>›</span>
          <b className="text-blue-800">{item.id}</b>
          <span className="ml-2 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-semibold text-blue-800">Synthetic record</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-medium">
            <span className={`h-2 w-2 rounded-full ${item.closed ? "bg-emerald-500" : isOverdue(item) ? "bg-red-500" : "bg-amber-500"}`} />
            {item.closed ? `Closed on Day ${days}` : isOverdue(item) ? `${overdueBy(item)} days past the ${BOOKING_SLA_DAYS}-day target` : `${remaining} days left in the ${BOOKING_SLA_DAYS}-day target`}
          </span>
          {item.id === DEMO_CASE_ID ? (
            <button
              type="button"
              className="rounded border border-slate-300 bg-white px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => {
                resetDemoCase(item.id);
                setGateKey((current) => current + 1);
                setReady(false);
                setNotice("Demo case reset in this browser. Nothing was sent.");
              }}
            >
              Reset demo case
            </button>
          ) : null}
          <button type="button" className="rounded border border-slate-300 bg-white px-2.5 py-1 font-medium text-slate-800 hover:bg-slate-50" onClick={() => window.print()}>Export summary</button>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-800">{item.initials}</div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">{item.name}</h1>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">{item.age}y · {item.sex === "F" ? "Female" : "Male"}</span>
                {item.closed ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">Closed on Day {days}</span> : null}
                {item.handoverStatus === "rejected_capacity" ? <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">Referral returned — action required</span> : null}
                {item.femaleTeamRequested ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800">Female specialist requested</span> : null}
                <RiskPill risk={risk} />
              </div>
              <p className="mt-1 text-sm text-slate-700"><span className="font-bold">Why: </span>{risk.band === "closed" ? "Closed. This case is excluded from the ranking." : topReasons(risk)}</p>
              <a href="#model-card" className="text-xs font-semibold text-blue-800 underline">How this is calculated</a>
              <p className="mt-1 text-xs text-slate-700">
                {item.nameAr ? <span>{item.nameAr} · </span> : null}
                Emirates ID <b className="text-slate-900">{maskEmiratesId(item.emiratesId)}</b>
                {" · "}Primary care <b className="text-slate-900">{facilityName(item.originFacilityId)}</b>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50" onClick={() => { recordSimulatedOutreach(item.id, "call", note || "Contact attempt logged locally."); setNotice("Contact logged in this browser. No call was placed."); }}>Document contact</button>
            <a href="#routing" className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100">Review destinations</a>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-4">
          <div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Trigger</p><p className="font-semibold text-blue-800">FIT positive</p><p className="text-xs text-slate-700">{item.fitUgG} µg/g · {formatDay(item.resultOn)}</p></div>
          <div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Care coordinator</p><p className="font-semibold text-slate-900">{item.navigator ?? item.ownerName}</p><p className="text-xs text-slate-700">{item.ownerTeam}</p></div>
          <div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Booking target</p><p className={`font-semibold ${item.closed ? "text-emerald-700" : isOverdue(item) ? "text-red-700" : "text-amber-800"}`}>{item.closed ? `Closed on Day ${days}` : isOverdue(item) ? `${overdueBy(item)} days over` : `${remaining} days remaining`}</p><p className="text-xs text-slate-700">{item.closed ? "Documented in this browser" : `Day ${days} of ${BOOKING_SLA_DAYS}`}</p></div>
          <div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Language</p><p className="font-semibold text-slate-900">{item.language === "ar" ? "Arabic" : "English"}</p><p className="text-xs text-slate-700">{item.physician}</p></div>
        </div>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">End-to-end screening pathway</h2>
          <p className="text-xs text-slate-700">Attendance does not close the case. Closure needs the report and a disposition.</p>
        </div>
        <div data-tour="record-milestones" className="relative min-w-[840px] py-2">
          <div className="pathway-line absolute left-12 right-12 top-[34px] h-0.5 bg-slate-200" />
          <div className="pathway-steps relative grid grid-cols-5 gap-4">
            <Step done title="Positive FIT result" when={formatDay(item.resultOn)} detail="Result on file" />
            <Step done={item.outreach.length > 0} title="Patient outreach" when={item.outreach.length ? `${item.outreach.length} logged` : "None yet"} detail="Log only" />
            <Step alert={item.handoverStatus === "rejected_capacity" || item.handoverStatus === "reverted"} done={item.handoverStatus === "accepted" || item.handoverStatus === "booked" || item.procedureAttended || (item.id === DEMO_CASE_ID && Boolean(item.simulatedPending))} title="GI referral" when={returned ? "Returned" : item.id === DEMO_CASE_ID && item.simulatedPending ? "Recorded" : "Open"} detail={returned ? returned.short : item.id === DEMO_CASE_ID && item.simulatedPending && item.endoscopyFacilityId ? facilityName(item.endoscopyFacilityId) : "No return on file"} />
            <Step done={item.procedureAttended || item.handoverStatus === "booked"} title="Colonoscopy" when={item.procedureAttended ? "Attended" : "Not attended"} detail="Separate from closure" />
            <Step locked={!item.closed} done={item.closed} title="Biopsy and closure" when={item.closed ? `Day ${days}` : "Hard lock"} detail={item.closed ? "Closed" : "Biopsy and disposition"} />
          </div>
        </div>
        {item.id === DEMO_CASE_ID && !item.procedureAttended && !item.closed ? (
          <div className="mt-4 flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-700">Record attendance only after the handover. It stays in this browser, nothing is sent, and attendance alone does not close the case.</p>
            <button
              type="button"
              disabled={!item.simulatedPending}
              className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold ${item.simulatedPending ? "bg-slate-900 text-white hover:bg-blue-800" : "cursor-not-allowed bg-slate-200 text-slate-500"}`}
              onClick={() => {
                if (!item.simulatedPending) return;
                recordColonoscopyAttended(item.id);
                setNotice("Colonoscopy attendance recorded in this browser. Nothing was sent.");
              }}
            >
              Record colonoscopy attended (simulated)
            </button>
          </div>
        ) : null}
        <PathologyLock
          item={item}
          onRecord={(detail) => {
            if (item.id === DEMO_CASE_ID) {
              recordDemoClosure(item.id, detail);
              setNotice("Simulated closure recorded in this browser. Nothing was sent.");
              return;
            }
            recordNote(item.id, detail);
          }}
        />
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {returned ? (
            <div className="flex flex-col justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 md:flex-row md:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-amber-900">Referral returned from {returned.name}</h3>
                  <span className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-900">Workflow blocker</span>
                </div>
                <p className="mt-1 text-sm text-slate-800">{item.eligibleSlotConstraint ? "The case file says the patient was eligible and no slot remained inside the window." : "The receiving facility returned this case."} This is not a live capacity feed.</p>
              </div>
            </div>
          ) : null}

          <section id="routing" data-tour="record-routing" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="mb-1 flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-slate-900">Alternate facilities in the case file</h3>
              <span className="text-xs font-semibold text-slate-600">Not a live queue</span>
            </div>
            <p className="mb-4 text-sm text-slate-700">
              Effective wait adds queue depth, divided by daily slots, to the open booking age.
              {item.femaleTeamRequested ? " A female specialist was requested, so those clinics are listed first." : ""}
            </p>
            {!ready ? <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">The readiness checklist is still open, so a simulated handover stays disabled.</p> : null}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {eligible.slice(0, 2).map((option, index) => (
                <article key={option.facilityId} className={`flex flex-col justify-between rounded-xl border bg-white p-4 shadow-sm ${index === 0 ? "border-2 border-emerald-500" : "border-slate-200"}`}>
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${index === 0 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-800"}`}>{index === 0 ? "Suggested from this file" : "Next option"}</span>
                        <h4 className="mt-2 text-base font-bold text-slate-900">{option.name}</h4>
                        <p className="text-xs text-slate-700">{option.km} km, illustrative · {option.dailySlots} daily slots in the file</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-extrabold text-blue-800">{option.openN === 0 ? "0 days" : option.effectiveWait === null ? "—" : formatDays(option.effectiveWait).replace(" days", "").replace(" day", "")}</span>
                        <p className="text-[11px] text-slate-700">{option.openN === 0 ? "Nothing waiting" : "Effective wait"}</p>
                      </div>
                    </div>
                    <div className={`mt-3 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold ${option.femaleTeam ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                      {option.femaleTeam ? "Female endoscopist available" : "No female endoscopist listed"}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!ready}
                    className={`mt-4 w-full rounded-lg py-2.5 text-sm font-semibold ${ready ? "bg-slate-900 text-white hover:bg-blue-800" : "cursor-not-allowed border border-slate-300 bg-slate-200 text-slate-500"}`}
                    onClick={() => {
                      if (!ready) return;
                      recordSimulatedHandover(item.id, option.facilityId);
                      setNotice(`Simulated handover recorded for ${option.short}. No referral was sent.`);
                    }}
                  >
                    Record simulated handover
                  </button>
                </article>
              ))}
            </div>
            {notice ? <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">{notice}</p> : null}
          </section>

          <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h3 className="text-lg font-bold text-slate-900">Diagnostic and triage profile</h3>
            <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-800">Situation</span>
                <p className="mt-1 text-slate-800">{item.sbar.situation}</p>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-800">Background</span>
                <p className="mt-1 text-slate-800">{item.sbar.background}</p>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h4 className="text-sm font-bold text-slate-900">Facility readiness checklist and async SBAR e-consult</h4>
                <p className="text-xs text-slate-700">Clear the checklist before a handover can be recorded. The thread is not delivered.</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-5">
                <div className="lg:col-span-2"><ReadinessGate key={`${item.id}-${gateKey}`} caseId={item.id} onReady={setReady} /></div>
                <div className="lg:col-span-3">
                  <SbarThread item={item} />
                  <div className="px-4 pb-4"><DraftBox caseId={item.id} kind="sbar" label="Draft SBAR with AI" /></div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Outreach history</h3>
              <span className="text-xs font-semibold text-blue-800">{item.outreach.length} touches</span>
            </div>
            <DraftBox caseId={item.id} kind="teachback" label="Draft teach-back message" />
            <div className="mb-3 flex flex-wrap gap-2">
              {(["call", "sms", "whatsapp", "clinic"] as const).map((channel) => (
                <button key={channel} type="button" className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-200" onClick={() => { recordSimulatedOutreach(item.id, channel, `Simulated ${channel} entry.`); setNotice(`Simulated ${channel} entry saved. Nothing was sent.`); }}>
                  + {channel === "clinic" ? "In-clinic" : channel === "whatsapp" ? "WhatsApp" : channel.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {item.outreach.map((touch) => <Touch key={touch.id} touch={touch} />)}
              {item.outreach.length === 0 ? <p className="text-sm text-slate-600">No outreach is logged yet.</p> : null}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-blue-800" />
            <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-blue-800">Next step in this file</p>
            <h3 className="mt-1 text-lg font-bold text-slate-900">{suggested ? `Review ${suggested.short}` : item.nextAction}</h3>
            <p className="mt-1 text-sm text-slate-800">{item.sbar.recommendation}</p>
            {suggested ? (
              <button
                type="button"
                disabled={!ready}
                className={`mt-3 w-full rounded-lg py-2.5 text-sm font-semibold ${ready ? "bg-slate-900 text-white hover:bg-blue-800" : "cursor-not-allowed bg-slate-200 text-slate-500"}`}
                onClick={() => {
                  if (!ready) return;
                  recordSimulatedHandover(item.id, suggested.facilityId);
                  setNotice(`Simulated handover recorded for ${suggested.short}. No referral was sent.`);
                }}
              >
                Record simulated handover
              </button>
            ) : null}
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h3 className="text-sm font-bold text-slate-900">Patient contact profile</h3>
            <div className="space-y-2 text-xs">
              <Row label="Preferred language" value={item.language === "ar" ? "Arabic" : "English"} />
              <div className={`flex items-center justify-between gap-2 rounded border p-2 ${item.femaleTeamRequested ? "border-emerald-200 bg-emerald-50" : "border-transparent bg-slate-50"}`}>
                <span className="font-medium text-slate-800">Provider preference</span>
                <b className={item.femaleTeamRequested ? "text-emerald-700" : "text-slate-900"}>{item.femaleTeamRequested ? "Female specialist requested" : "No gender request"}</b>
              </div>
              <Row label="Navigator" value={item.navigator ?? "Unassigned"} />
              <Row label="Physician" value={item.physician} />
            </div>
          </div>

          <section id="model-card" className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5 text-sm shadow-card">
            <h3 className="font-bold text-slate-900">{MODEL_CARD.name}</h3>
            <p>{MODEL_CARD.intendedUse}</p>
            <p>{MODEL_CARD.notFor}</p>
            <p>{MODEL_CARD.recalibration}</p>
            <p className="font-semibold">{MODEL_CARD.ownerSignOff}</p>
          </section>
          <div id="audit" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Add a local note</h3>
              <span className="text-[11px] text-slate-700">Stays in this browser</span>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                recordNote(item.id, note);
                setNote("");
                setNotice("Local note added to the audit history.");
              }}
            >
              <textarea value={note} onChange={(event) => setNote(event.target.value)} className="h-24 w-full resize-none rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm text-slate-900" placeholder="Log an observation. It is not sent." />
              <div className="mt-2 flex justify-end">
                <button type="submit" className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-800">Save note</button>
              </div>
            </form>
            <div className="flex max-h-72 flex-col gap-2 overflow-auto">
              {[...item.events].reverse().slice(0, 6).map((event, index) => (
                <article id={index === 0 ? "audit-latest" : undefined} key={event.id} className={`rounded-lg p-2 text-xs ${index === 0 && event.label.startsWith("Draft approved") ? "bg-emerald-50 ring-2 ring-emerald-400" : "bg-slate-50"}`}>
                  <div className="flex justify-between gap-2 text-slate-500"><span className="font-bold uppercase">{event.kind}{event.simulated ? " · simulated" : ""}</span><span>{event.on}</span></div>
                  <div className="font-bold text-slate-900">{event.label}</div>
                  <p className="text-slate-700">{event.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Step({ title, when, detail, done = false, alert = false, locked = false }: { title: string; when: string; detail: string; done?: boolean; alert?: boolean; locked?: boolean }) {
  const circle = locked
    ? "bg-slate-900 text-white ring-4 ring-slate-300"
    : alert
      ? "border-2 border-amber-500 bg-amber-100 text-amber-800 ring-4 ring-amber-100"
      : done
        ? "bg-emerald-600 text-white shadow-md"
        : "border-2 border-blue-500 bg-blue-50 text-blue-800";
  return (
    <div className="flex flex-col items-center text-center">
      <div className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold ${circle}`}>{locked ? "🔒" : alert ? "!" : done ? "✓" : "·"}</div>
      <span className={`mt-3 text-xs font-bold ${alert ? "text-amber-800" : "text-slate-900"}`}>{title}</span>
      <span className={`text-[11px] font-semibold ${alert ? "text-amber-800" : done ? "text-emerald-700" : "text-slate-700"}`}>{when}</span>
      <span className="text-[11px] text-slate-700">{detail}</span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 rounded bg-slate-50 p-2">
      <span className="text-slate-700">{label}</span>
      <b className="text-right text-slate-900">{value}</b>
    </div>
  );
}

function Touch({ touch }: { touch: OutreachTouch }) {
  return (
    <article className="flex gap-3 rounded-xl border border-slate-200 p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-800">{touch.channel === "call" ? "☎" : "✉"}</div>
      <div className="flex-1">
        <div className="flex justify-between gap-2 text-sm"><b className="text-slate-900">{touch.title}</b><span className="text-xs text-slate-700">{touch.on}</span></div>
        <p className="mt-1 text-sm text-slate-800">{touch.detail}</p>
        <p className="mt-1 text-[11px] text-slate-600">{touch.simulated ? "Simulated. " : ""}{touch.outcome}</p>
      </div>
    </article>
  );
}
