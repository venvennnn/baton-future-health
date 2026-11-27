import { DemoSessionAudit } from "@/components/demo-audit";
import { entryHref } from "@/lib/access";
import { getCase } from "@/lib/cases";
import { requireRole } from "@/lib/guard";
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
