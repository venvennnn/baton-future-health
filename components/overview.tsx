import { DemoCta, HeroActions } from "@/components/role-chooser";
import { programmeCounts } from "@/lib/analytics";
import { entryHref } from "@/lib/access";
import { CASES } from "@/lib/cases";
import type { Role } from "@/lib/session";
import Link from "next/link";

const demo = CASES.find((item) => item.id === "FIT-26771");

export function Overview({ role }: { role: Role | null }) {
  const counts = programmeCounts(CASES);
  const closedShare = counts.cohort === 0 ? 0 : Math.round((counts.closed / counts.cohort) * 1000) / 10;
  const attendedShare = counts.cohort === 0 ? 0 : Math.round((counts.attended / counts.cohort) * 1000) / 10;

  return (
    <div className="page-rise">
      <section className="mx-auto max-w-5xl px-4 pb-12 pt-12 text-center sm:px-6 sm:pt-16 lg:px-8">
        <div data-tour="hero-story" className="rise">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1 text-xs font-medium text-amber-800 sm:text-sm">Screening-to-care coordination</div>
          <h1 className="mb-6 text-4xl font-extrabold leading-[1.12] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">Every screening result.<br />Followed through to care.</h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-slate-700 sm:text-xl">Coordinate patient outreach, referrals and follow-up in one shared workspace.</p>
        </div>
        <HeroActions role={role} />
        <p className="text-xs font-medium text-slate-600">Synthetic demonstration</p>

        <div id="pathway" className="mt-12 scroll-mt-32 overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-window">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center space-x-2"><span className="h-3 w-3 rounded-full bg-red-400" /><span className="h-3 w-3 rounded-full bg-amber-400" /><span className="h-3 w-3 rounded-full bg-emerald-400" /></div>
            <div className="mx-auto hidden h-3 w-64 rounded-full bg-slate-200/70 sm:block" />
            <div className="w-12" />
          </div>
          <div className="relative bg-slate-50/40 p-6 sm:p-10">
            <div className="handoff-rail hidden md:block" aria-hidden="true"><span className="handoff-bead" /></div>
            <div className="relative grid grid-cols-1 items-center gap-6 md:grid-cols-3 lg:gap-8">
              <div className="flex flex-col space-y-4">
                <WindowStep delay="0.05s" done title="Result issued" detail={demo ? `FIT positive · ${demo.fitUgG} µg/g` : "FIT positive"} />
                <WindowStep delay="0.18s" done title="Patient outreach" detail={demo ? `${demo.outreach.length} logged touches` : "Logged touches"} />
                <WindowStep delay="0.31s" done title="Referral" detail="Returned by the receiving team" />
              </div>
              <Link href={entryHref(role, "/cases/FIT-26771")} className="case-live block rounded-2xl border-2 border-amber-300 bg-white p-5 shadow-card" style={{ animationDelay: "0.22s, 0.9s" }}>
                <span className="text-base font-extrabold text-slate-900">FIT-26771</span>
                <div className="my-3"><span className="inline-block rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">Referral returned</span></div>
                <div className="space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-700">
                  <div><strong className="text-slate-900">Owner · </strong>{demo?.ownerName ?? "Primary coordinator"}</div>
                  <div><strong className="text-slate-900">Next step · </strong>Review destinations</div>
                </div>
              </Link>
              <div className="flex flex-col space-y-4">
                <WindowStep delay="0.4s" title="Receiving team" detail="Eligible slot was not available" mark="!" />
                <WindowStep delay="0.52s" title="Documented closure" detail="Locked until pathology is chosen" mark="lock" />
              </div>
            </div>
          </div>
          <div className="loop-words border-t border-slate-200 bg-slate-50 py-3 text-center text-xs font-medium text-slate-700">
            <span>Follow up</span>
            {" · "}
            <span>Hand over</span>
            {" · "}
            <span>Close the loop</span>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-4xl border-t border-slate-200/70 pt-8">
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-600">What this workspace is built around</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Pill dot="bg-emerald-500">Synthetic case file</Pill>
            <Pill dot="bg-blue-600">FHIR-shaped examples</Pill>
            <Pill dot="bg-amber-500">14-day booking target</Pill>
            <Pill dot="bg-emerald-600">English and Arabic</Pill>
          </div>
        </div>
      </section>

      <section data-tour="home-flows" className="mx-auto max-w-6xl border-t border-slate-200/80 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <span className="mb-3 inline-block rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Standardized protocol</span>
          <h2 className="mb-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Closed-loop screening in four clear milestones</h2>
          <p className="text-base text-slate-700">The case stays open from a positive screening result until the report and a disposition are both on file.</p>
        </div>
        <div className="stagger grid grid-cols-1 gap-4 md:grid-cols-4">
          <Milestone kicker="Milestone 01" title="Positive detection" body="A positive FIT result enters the shared case file and the daily worklist." chip="Result on file" tone="green" />
          <Milestone kicker="Milestone 02" title="Navigator outreach" body="Calls, messages, and teach-back are logged. Logging a touch does not place a call." chip="Outreach log" tone="blue" />
          <Milestone kicker="Milestone 03" title="Direct colonoscopy" body="Destinations are ranked from open booking age, queue depth, and a requested female team." chip="File-based match" tone="blue" />
          <Milestone kicker="Milestone 04" title="Care closure and audit" body="Closure stays locked until a biopsy file is chosen and a disposition is selected." chip="Hard lock" tone="green" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl border-t border-slate-200/80 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <h2 className="mb-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">One workspace for every handover.</h2>
          <p className="text-base text-slate-700 sm:text-lg">See the owner, the blocker and the next action.</p>
        </div>
        <div className="stagger grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          <Door href={entryHref(role, "/cases")} kicker="Case Board" kickerClass="border-blue-200 bg-blue-50 text-blue-800" title="Know who owns the next step" body="Daily worklist sorted by how long the case has been waiting." />
          <Door href={entryHref(role, "/cases/FIT-26771")} kicker="Case Record" kickerClass="border-amber-200 bg-amber-50 text-amber-800" title="Readiness, SBAR and hard lock" body="Checklist, e-consult, modesty routing and pathology-gated closure." />
          <Door href={entryHref(role, "/facilities")} kicker="Facilities" kickerClass="border-blue-200 bg-blue-50 text-blue-800" title="See where follow-up is waiting" body="Stage latency and a slider to project a quieter queue." />
          <Door href={entryHref(role, "/simulator")} kicker="Policy Simulator" kickerClass="border-emerald-200 bg-emerald-50 text-emerald-700" title="Equity vs. completion" body="Move interpreter priority along a teaching curve." />
        </div>
      </section>

      <section className="mx-auto max-w-6xl border-t border-slate-200/80 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="mb-2 inline-block rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">From this synthetic file</span>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-950">Counts across the demonstration cohort</h2>
        </div>
        <div className="stagger grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Stat value={String(counts.cohort)} label="Cases in the file" note="The worklist, the record, and the facility page read this same file." />
          <Stat value={`${attendedShare}%`} label="Procedure attended" note={`${counts.attended} attended. Attendance is counted separately from closure.`} />
          <Stat value={String(counts.attendedWithoutClosure)} label="Attended, still open" note="A colonoscopy can be attended while closure is still pending." />
          <Stat value={`${closedShare}%`} label="Documented closure" note={`${counts.closed} cases have the report and a disposition.`} />
        </div>
      </section>

      <section className="bg-slate-950 px-4 py-16 text-white">
        <div className="mx-auto max-w-4xl space-y-6 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Bring the next step into view.</h2>
          <DemoCta role={role} />
        </div>
      </section>
    </div>
  );
}

function WindowStep({ title, detail, done = false, mark, delay = "0s" }: { title: string; detail: string; done?: boolean; mark?: "!" | "lock"; delay?: string }) {
  const badge = done ? "bg-emerald-50 text-emerald-700" : mark === "!" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-700";
  return (
    <div className="rise flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm" style={{ animationDelay: delay }}>
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg font-bold ${badge}`}>{done ? "✓" : mark === "lock" ? "🔒" : "!"}</div>
      <div>
        <h4 className="text-xs font-bold text-slate-900">{title}</h4>
        <p className="text-[11px] text-slate-600">{detail}</p>
      </div>
    </div>
  );
}

function Pill({ children, dot }: { children: string; dot: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {children}
    </div>
  );
}

function Milestone({ kicker, title, body, chip, tone }: { kicker: string; title: string; body: string; chip: string; tone: "green" | "blue" }) {
  const chipClass = tone === "green" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-800";
  const dot = tone === "green" ? "bg-emerald-500" : "bg-blue-600";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-1 text-xs font-bold uppercase text-blue-800">{kicker}</div>
      <h4 className="mb-2 text-base font-bold text-slate-900">{title}</h4>
      <p className="mb-4 text-xs leading-relaxed text-slate-700">{body}</p>
      <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-semibold ${chipClass}`}><span className={`h-1.5 w-1.5 rounded-full ${dot}`} />{chip}</span>
    </div>
  );
}

function Door({ href, kicker, kickerClass, title, body }: { href: string; kicker: string; kickerClass: string; title: string; body: string }) {
  return (
    <Link href={href} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-card">
      <span className={`mb-3 inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${kickerClass}`}>{kicker}</span>
      <h3 className="mb-1 font-bold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-700">{body}</p>
      <span className="mt-3 inline-block text-sm font-semibold text-slate-900 group-hover:text-blue-800">Open →</span>
    </Link>
  );
}

function Stat({ value, label, note }: { value: string; label: string; note: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="text-3xl font-extrabold text-slate-900">{value}</div>
      <div className="mb-2 mt-1 text-xs font-bold text-slate-900">{label}</div>
      <p className="text-xs leading-relaxed text-slate-700">{note}</p>
    </div>
  );
}
