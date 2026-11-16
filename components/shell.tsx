"use client";

import { kpis } from "@/lib/analytics";
import { FACILITIES } from "@/lib/facilities";
import { useDemo } from "@/components/providers";
import Link from "next/link";
import { usePathname } from "next/navigation";

const COPY = {
  en: {
    banner: "Synthetic demo. Actions stay in this browser. Nothing is sent to a hospital, Malaffi, or the Department of Health.",
    overview: "Overview / Flow",
    board: "Case Board",
    record: "Case Record (FIT-26771)",
    facilities: "Facility bottlenecks",
    simulator: "Policy Simulator",
    governance: "FHIR & Governance",
    overdue: "Overdue",
    demo: "Open demo",
    clinic: "Clinic:",
    all: "All Abu Dhabi clinics",
    network: "Abu Dhabi Screening Network",
  },
  ar: {
    banner: "عرض تجريبي ببيانات مصطنعة. الإجراءات تبقى في هذا المتصفح ولا تُرسل إلى أي نظام سريري.",
    overview: "نظرة عامة",
    board: "لوحة الحالات",
    record: "سجل الحالة (FIT-26771)",
    facilities: "اختناقات المنشآت",
    simulator: "محاكي السياسة",
    governance: "FHIR والحوكمة",
    overdue: "متأخر",
    demo: "افتح العرض",
    clinic: "العيادة:",
    all: "كل عيادات أبوظبي",
    network: "شبكة فحص أبوظبي",
  },
} as const;

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { cases, clinicId, setClinicId, locale, setLocale } = useDemo();
  const text = COPY[locale];
  const overdue = kpis(cases).overdue;
  const links = [
    { href: "/", label: text.overview, icon: "hub" },
    { href: "/cases", label: text.board, icon: "bar_chart", badge: overdue },
    { href: "/cases/FIT-26771", label: text.record, icon: "assignment" },
    { href: "/facilities", label: text.facilities, icon: "clinical_notes" },
    { href: "/simulator", label: text.simulator, icon: "science" },
    { href: "/governance", label: text.governance, icon: "layers" },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900" lang={locale} style={{ ["--baton-header" as string]: "8.75rem" }}>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-[0_2px_12px_rgba(15,23,42,0.03)] backdrop-blur">
        <div className="bg-amber-50 px-4 py-1 text-center text-[12px] font-semibold text-amber-950">{text.banner}</div>
        <div className="mx-auto flex h-28 max-w-[1400px] flex-col justify-between px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-700 text-white shadow-md">
                  <span className="material-symbols-outlined text-[20px]">sync_alt</span>
                </span>
                <span className="leading-none">
                  <span className="block text-xl font-black tracking-tight">Baton</span>
                  <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-widest text-blue-700">Intelligence</span>
                </span>
              </Link>
              <span className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {text.network}
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <label className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold md:flex">
                <span className="font-normal text-slate-500">{text.clinic}</span>
                <select
                  aria-label="Clinic"
                  className="max-w-[180px] bg-transparent font-semibold outline-none"
                  value={clinicId}
                  onChange={(event) => setClinicId(event.target.value)}
                >
                  <option value="all">{text.all}</option>
                  {FACILITIES.map((facility) => (
                    <option key={facility.id} value={facility.id}>
                      {facility.short}
                    </option>
                  ))}
                </select>
              </label>
              <Link href="/cases" className="inline-flex items-center gap-1 rounded-full bg-blue-700 px-3 py-2 text-xs font-semibold text-white shadow-md hover:bg-blue-800">
                <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                <span className="hidden sm:inline">{text.demo}</span>
              </Link>
              <button
                type="button"
                className="rounded px-2 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
                onClick={() => setLocale(locale === "en" ? "ar" : "en")}
              >
                {locale === "en" ? "EN / العربية" : "العربية / EN"}
              </button>
            </div>
          </div>
          <nav className="flex h-12 items-center gap-1 overflow-x-auto pb-2 text-xs font-semibold">
            {links.map((link) => {
              const on = link.href === "/"
                ? pathname === "/"
                : link.href === "/cases"
                  ? pathname === "/cases"
                  : link.href === "/cases/FIT-26771"
                    ? pathname.startsWith("/cases/")
                    : pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={on ? "page" : undefined}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 ${on ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  <span className="material-symbols-outlined text-[16px]">{link.icon}</span>
                  {link.label}
                  {link.badge ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">{link.badge} {text.overdue}</span> : null}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <div className="pt-[8.75rem]">{children}</div>
      <footer className="mt-16 border-t border-slate-200 py-8">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-800">Baton Healthcare Intelligence</span>
            <span>Synthetic demonstration. Not a Department of Health submission.</span>
          </div>
          <div className="flex gap-4 font-medium">
            <Link href="/governance" className="hover:text-blue-700">FHIR-shaped examples</Link>
            <Link href="/governance#audit" className="hover:text-blue-700">Local audit notes</Link>
            <Link href="/governance#safety" className="hover:text-blue-700">What this demo does not do</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
