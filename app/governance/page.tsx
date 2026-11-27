import { DemoSessionAudit } from "@/components/demo-audit";
import { entryHref } from "@/lib/access";
import { getCase } from "@/lib/cases";
import { requireRole } from "@/lib/guard";
import { DEFAULT_DRAFT_MODEL } from "@/lib/draft-model";
import { MODEL_CARD, RISK_WEIGHTS } from "@/lib/risk";
import Link from "next/link";

export default async function GovernancePage() {
  await requireRole("admin");
  const demo = getCase("FIT-26771");
  const bundle = {
    resourceType: "Bundle",
    type: "collection",
    meta: { tag: [{ code: "synthetic-demo", display: "Not a live Malaffi bundle" }] },
    entry: (demo?.events ?? []).slice(0, 4).map((event) => ({
      resource: {
        resourceType: event.kind === "result" ? "DiagnosticReport" : event.kind === "referral" ? "ServiceRequest" : "Task",
        id: event.id,
        status: event.kind === "rejection" ? "rejected" : "completed",
        description: event.detail,
        authoredOn: event.on,
      },
    })),
  };

  return (
    <main className="page-rise mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-black tracking-tight">FHIR-shaped notes and governance</h1>
      <p className="text-slate-600">This page shows how a case event could be shaped. It is not connected to Malaffi, a hospital FHIR server, or a Department of Health registry.</p>
      <section id="safety" data-tour="governance-safety" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm">
        <h2 className="font-bold">What this demo does not do</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>It does not synchronise with Malaffi or any other exchange.</li>
          <li>It does not verify insurance, identity, or a Department of Health submission.</li>
          <li>A simulated handover, call, SMS, or WhatsApp entry is stored in this browser only.</li>
          <li>Procedure attendance does not close a case. Closure needs a report and a disposition in the case file.</li>
          <li>A long wait is not labelled a confirmed capacity blocker unless the case records an eligible-slot constraint.</li>
        </ul>
      </section>
      <section id="model" className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
        <h2 className="text-xl font-bold">{MODEL_CARD.name}</h2>
        <p className="mt-2">{MODEL_CARD.intendedUse}</p>
        <p className="mt-2"><b>Inputs. </b>{MODEL_CARD.inputs}</p>
        <p className="mt-2">{MODEL_CARD.notFor}</p>
        <p className="mt-2">{MODEL_CARD.recalibration}</p>
        <p className="mt-2 font-semibold">{MODEL_CARD.ownerSignOff}</p>
        <p className="mt-2 text-slate-600" title={MODEL_CARD.operationalPrior}>{MODEL_CARD.operationalPrior}</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="uppercase tracking-wide text-slate-500">
                <th className="py-1">Feature</th>
                <th className="py-1">Weight</th>
                <th className="py-1">Direction</th>
                <th className="py-1">Kind</th>
                <th className="py-1">Source</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(RISK_WEIGHTS).map(([id, weight]) => (
                <tr key={id} className="border-t border-slate-100 align-top">
                  <td className="py-1.5 font-semibold">{id}</td>
                  <td className="py-1.5">{weight.weight}</td>
                  <td className="py-1.5">{weight.direction}</td>
                  <td className="py-1.5">{weight.kind}</td>
                  <td className="py-1.5">{weight.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section id="generative-ai" className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
        <h2 className="text-xl font-bold">Generative AI use</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>The case record can draft an SBAR note and an English or Arabic teach-back message.</li>
          <li>A clinician reviews the draft and must approve it before it is saved. Nothing is sent to a patient or another system.</li>
          <li>Drafts call Gemini ({DEFAULT_DRAFT_MODEL}) when GEMINI_API_KEY is set. Only the synthetic case record is sent. If the key is missing, or the call times out, a template built from those same fields is used.</li>
          <li>In production this would run on an approved in-region deployment (for example via the challenge&apos;s cloud partners) with no PHI leaving the jurisdiction.</li>
          <li>Handovers recovered in Capacity planning are the Kaplan–Meier colonoscopy rate at day 180 minus usual care (6 calls/day, first come first served, no extra slots, teach-back off), times 1,000. The paper-scale line uses the same difference times 1,429 and stops at 585. This is a synthetic cohort simulation, not a forecast.</li>
        </ul>
      </section>
      <section id="audit">
        <h2 className="text-xl font-bold">Example bundle for {demo?.id}</h2>
        <p className="text-sm text-slate-500">Generated from the local case events. Refreshing after a simulated action does not rewrite this server-rendered example.</p>
        <pre className="mt-3 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(bundle, null, 2)}</pre>
        <Link href={entryHref("admin", "/cases/FIT-26771#audit")} className="mt-3 inline-flex font-bold text-blue-700">Open the FIT-26771 audit history</Link>
      </section>
      <DemoSessionAudit />
    </main>
  );
}
