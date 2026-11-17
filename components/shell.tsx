"use client";

import { kpis } from "@/lib/analytics";
import { useDemo } from "@/components/providers";
import { useWalkthrough } from "@/components/walkthrough";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const COPY = {
  en: {
    banner: "Synthetic demo. Actions stay in this browser. Nothing is sent to a hospital, Malaffi, or the Department of Health.",
    overview: "Overview",
    board: "Case Board",
    record: "Case FIT-26771",
    facilities: "Facilities",
    simulator: "Policy Simulator",
    governance: "Governance",
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
    record: "الحالة FIT-26771",
    facilities: "المنشآت",
    simulator: "محاكي السياسة",
    governance: "الحوكمة",
    overdue: "متأخر",
    demo: "افتح العرض",
    clinic: "العيادة:",
    all: "كل عيادات أبوظبي",
    network: "شبكة فحص أبوظبي",
  },
} as const;

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { cases, locale, setLocale } = useDemo();
  const tour = useWalkthrough();
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
    <div className="min-h-screen bg-[#fafbfc] text-slate-800" lang={locale}>
      <div data-tour="demo-banner" className="bg-amber-50 px-4 py-1 text-center text-[11px] font-medium text-amber-800">{text.banner}</div>
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/70 bg-[#fafbfc]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Baton Home">
            <Image src="/brand/baton-mark.png" alt="" width={270} height={270} priority unoptimized className="h-7 w-7 shrink-0" />
            <span className="text-xl font-bold tracking-tight text-slate-900">Baton</span>
          </Link>
          <nav data-tour="main-nav" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-sm sm:gap-4" aria-label="Primary">
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
                  className="nav-link whitespace-nowrap px-2 py-5 font-medium text-slate-700 transition hover:text-slate-950"
                >
                  {link.label}
                  {link.badge ? <span className="ml-1 text-[11px] font-bold text-red-700">{link.badge}</span> : null}
                </Link>
              );
            })}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            {tour.running ? null : (
              <button type="button" onClick={tour.start} className="hidden rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 sm:inline-flex">
                {tour.label}
              </button>
            )}
            <button type="button" className="rounded-lg px-2 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900" onClick={() => setLocale(locale === "en" ? "ar" : "en")}>
              {locale === "en" ? "عربي" : "EN"}
            </button>
            <Link href="/cases" className="hidden items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 md:inline-flex">
              {text.demo}
            </Link>
          </div>
        </div>
      </header>
      <div>{children}</div>
      <footer className="border-t border-slate-200 bg-white px-4 py-8 text-xs text-slate-700 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-800 text-[10px] font-bold text-white">B</span>
            <b className="text-slate-900">Baton</b>
            <span>Synthetic coordination workspace. Not a live clinical system.</span>
          </div>
          <div className="flex gap-6">
            <Link href="/governance" className="hover:text-slate-950">Governance</Link>
            <Link href="/governance#audit" className="hover:text-slate-950">Audit notes</Link>
            <Link href="/governance#safety" className="hover:text-slate-950">Limits</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
