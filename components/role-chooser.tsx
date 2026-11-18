"use client";

import { issueUserDemo, logout } from "@/app/login/actions";
import { useDemo } from "@/components/providers";
import type { Role } from "@/lib/session";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

const COPY = {
  en: {
    title: "How would you like to try Baton?",
    body: "Continue as User starts a demo session and opens the Case Board. Continue as Admin opens the login form.",
    user: "Continue as User",
    userHint: "No password. Opens the Case Board.",
    admin: "Continue as Admin",
    adminHint: "Sign in with the Admin demo, then open Facilities.",
    close: "Close",
    back: "Back",
    userSwitch: "You're signed in as Admin. The case workspace requires User access. Log out to continue as User.",
    adminSwitch: "You're signed in as User. Facilities, the simulator, and governance need an Admin session. Log out, then use the Admin login.",
    confirmUser: "Log out and continue as User",
    confirmAdmin: "Log out and continue as Admin",
  },
  ar: {
    title: "كيف تريد تجربة باتون؟",
    body: "المتابعة كمستخدم تبدأ جلسة تجريبية وتفتح لوحة الحالات. المتابعة كمسؤول تفتح نموذج الدخول.",
    user: "المتابعة كمستخدم",
    userHint: "بدون كلمة مرور. تفتح لوحة الحالات.",
    admin: "المتابعة كمسؤول",
    adminHint: "سجّل الدخول بعرض المسؤول، ثم تُفتح المنشآت.",
    close: "إغلاق",
    back: "رجوع",
    userSwitch: "أنت مسجّل كمسؤول. مساحة الحالات تحتاج دخول المستخدم. سجّل الخروج للمتابعة كمستخدم.",
    adminSwitch: "أنت مسجّل كمستخدم. المنشآت والمحاكي والحوكمة تحتاج جلسة مسؤول. سجّل الخروج ثم استخدم دخول المسؤول.",
    confirmUser: "سجّل الخروج وتابع كمستخدم",
    confirmAdmin: "سجّل الخروج وتابع كمسؤول",
  },
} as const;

export function SwitchRolePanel({ from, to, next }: { from: Role; to: Role; next: string }) {
  const { locale } = useDemo();
  const text = COPY[locale];
  const destination = to === "admin" ? `/login?role=admin&next=${encodeURIComponent(next || "/facilities")}` : next || "/cases";
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-slate-700">{to === "user" ? text.userSwitch : text.adminSwitch}</p>
      {to === "user" ? (
        <form action={issueUserDemo}>
          <input type="hidden" name="confirm" value="switch" />
          <input type="hidden" name="next" value={next || "/cases"} />
          <button type="submit" className={`rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 ${focus}`}>
            {text.confirmUser}
          </button>
        </form>
      ) : (
        <form action={logout}>
          <input type="hidden" name="next" value={destination} />
          <button type="submit" className={`rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 ${focus}`}>
            {text.confirmAdmin}
          </button>
        </form>
      )}
      <p className="text-xs text-slate-500">{from === "user" ? "User" : "Admin"} → {to === "user" ? "User" : "Admin"}</p>
    </div>
  );
}

export function RoleChooserButton({
  role,
  label,
  className,
  userNext = "/cases",
}: {
  role: Role | null;
  label: string;
  className: string;
  userNext?: string;
}) {
  const { locale } = useDemo();
  const text = COPY[locale];
  const titleId = useId();
  const opener = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"choose" | "user" | "admin">("choose");

  const close = useCallback(() => {
    setOpen(false);
    setMode("choose");
    opener.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const node = dialog.current;
    const items = () => [...(node?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([type="hidden"])') ?? [])];
    (node?.querySelector<HTMLElement>("[data-initial-focus]") ?? items()[0])?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      }
      if (event.key !== "Tab" || !node) return;
      const focusable = items();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, mode, close]);

  function choose(nextMode: "user" | "admin") {
    if (nextMode === "user" && role === "admin") {
      setMode("user");
      return;
    }
    if (nextMode === "admin" && role === "user") {
      setMode("admin");
    }
  }

  return (
    <>
      <button ref={opener} type="button" className={className} onClick={() => { setMode("choose"); setOpen(true); }}>
        {label}
      </button>
      {open ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/40 p-4 sm:items-center" onMouseDown={close}>
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-window"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id={titleId} className="text-xl font-extrabold tracking-tight text-slate-950">{text.title}</h2>
              <button type="button" className={`rounded-full px-2 py-1 text-sm font-semibold text-slate-500 hover:text-slate-900 ${focus}`} onClick={close}>
                {text.close}
              </button>
            </div>
            {mode === "choose" ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm leading-relaxed text-slate-700">{text.body}</p>
                {role === "user" ? (
                  <Link href={userNext} data-initial-focus className={`block rounded-2xl border border-slate-200 px-4 py-3 hover:border-blue-300 hover:bg-blue-50 ${focus}`}>
                    <span className="block text-sm font-bold text-slate-950">{text.user}</span>
                    <span className="mt-1 block text-xs text-slate-600">{text.userHint}</span>
                  </Link>
                ) : role === "admin" ? (
                  <button type="button" data-initial-focus className={`block w-full rounded-2xl border border-slate-200 px-4 py-3 text-left hover:border-blue-300 hover:bg-blue-50 ${focus}`} onClick={() => choose("user")}>
                    <span className="block text-sm font-bold text-slate-950">{text.user}</span>
                    <span className="mt-1 block text-xs text-slate-600">{text.userHint}</span>
                  </button>
                ) : (
                  <form action={issueUserDemo}>
                    <input type="hidden" name="next" value={userNext} />
                    <button type="submit" data-initial-focus className={`block w-full rounded-2xl border border-slate-200 px-4 py-3 text-left hover:border-blue-300 hover:bg-blue-50 ${focus}`}>
                      <span className="block text-sm font-bold text-slate-950">{text.user}</span>
                      <span className="mt-1 block text-xs text-slate-600">{text.userHint}</span>
                    </button>
                  </form>
                )}
                {role === "admin" ? (
                  <Link href="/facilities" className={`block rounded-2xl border border-slate-200 px-4 py-3 hover:border-blue-300 hover:bg-blue-50 ${focus}`}>
                    <span className="block text-sm font-bold text-slate-950">{text.admin}</span>
                    <span className="mt-1 block text-xs text-slate-600">{text.adminHint}</span>
                  </Link>
                ) : role === "user" ? (
                  <button type="button" className={`block w-full rounded-2xl border border-slate-200 px-4 py-3 text-left hover:border-blue-300 hover:bg-blue-50 ${focus}`} onClick={() => choose("admin")}>
                    <span className="block text-sm font-bold text-slate-950">{text.admin}</span>
                    <span className="mt-1 block text-xs text-slate-600">{text.adminHint}</span>
                  </button>
                ) : (
                  <Link href="/login?role=admin&next=/facilities" className={`block rounded-2xl border border-slate-200 px-4 py-3 hover:border-blue-300 hover:bg-blue-50 ${focus}`}>
                    <span className="block text-sm font-bold text-slate-950">{text.admin}</span>
                    <span className="mt-1 block text-xs text-slate-600">{text.adminHint}</span>
                  </Link>
                )}
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <SwitchRolePanel from={role === "admin" ? "admin" : "user"} to={mode} next={mode === "user" ? userNext : "/facilities"} />
                <button type="button" className={`text-sm font-semibold text-slate-600 hover:text-slate-950 ${focus}`} onClick={() => setMode("choose")}>
                  {text.back}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

export function HeroActions({ role }: { role: Role | null }) {
  const primary = `rounded-full bg-slate-950 px-6 py-3 text-sm font-medium text-white shadow-md transition hover:bg-blue-800 ${focus}`;
  const secondary = `rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 ${focus}`;
  const blue = `rounded-full border border-blue-200 bg-blue-50 px-6 py-3 text-sm font-medium text-blue-800 shadow-sm transition hover:bg-blue-100 ${focus}`;
  return (
    <div className="mb-3 flex flex-wrap items-center justify-center gap-3">
      <RoleChooserButton role={role} label="Open demo" className={primary} />
      <a href="#pathway" className={secondary}>Explore the pathway</a>
      <Link href="/login?role=user" className={blue}>Login as User</Link>
      <Link href="/login?role=admin" className={secondary}>Login as Admin</Link>
    </div>
  );
}

export function DemoCta({ role }: { role: Role | null }) {
  return (
    <RoleChooserButton
      role={role}
      label="Open the Baton demo"
      className={`inline-block rounded-full bg-white px-7 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 ${focus}`}
    />
  );
}
