"use client";

import { login } from "@/app/login/actions";
import { SwitchRolePanel } from "@/components/role-chooser";
import { useDemo } from "@/components/providers";
import { DEMO_ACCOUNTS, type Role } from "@/lib/session";
import type { LoginState } from "@/lib/login";
import Link from "next/link";
import { useActionState, useState } from "react";

const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";
const initial: LoginState = {};

const COPY = {
  en: {
    userTitle: "User demo",
    adminTitle: "Admin demo",
    kicker: "Demo access",
    note: "Shared credentials for synthetic data. Nothing is sent to a hospital, Malaffi, or the Department of Health.",
    username: "Username",
    password: "Password",
    show: "Show password",
    hide: "Hide password",
    submit: "Log in",
    pending: "Checking…",
    back: "Back to Overview",
    account: "Demo credentials",
  },
  ar: {
    userTitle: "عرض المستخدم",
    adminTitle: "عرض المسؤول",
    kicker: "دخول تجريبي",
    note: "بيانات مشتركة لبيانات مصطنعة. لا يُرسل شيء إلى مستشفى أو ملفّي أو دائرة الصحة.",
    username: "اسم المستخدم",
    password: "كلمة المرور",
    show: "إظهار كلمة المرور",
    hide: "إخفاء كلمة المرور",
    submit: "دخول",
    pending: "جارٍ التحقق…",
    back: "العودة إلى النظرة العامة",
    account: "بيانات العرض",
  },
} as const;

export function LoginScreen({ role, next, sessionRole }: { role: Role; next: string; sessionRole: Role | null }) {
  const { locale } = useDemo();
  const text = COPY[locale];
  const account = DEMO_ACCOUNTS[role];
  const [state, formAction, pending] = useActionState(login, initial);
  const [visible, setVisible] = useState(false);
  const destination = next || (role === "user" ? "/cases" : "/facilities");

  return (
    <main className="page-rise mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-10 sm:px-6">
      <Link href="/" className={`w-fit text-sm font-semibold text-blue-800 hover:underline ${focus}`}>{text.back}</Link>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
        <p className="text-xs font-bold uppercase tracking-wide text-amber-800">{text.kicker}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{role === "user" ? text.userTitle : text.adminTitle}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{text.note}</p>
        {sessionRole && sessionRole !== role ? (
          <div className="mt-6">
            <SwitchRolePanel from={sessionRole} to={role} next={destination} />
          </div>
        ) : (
          <form action={formAction} className="mt-6 space-y-4" noValidate>
            <input type="hidden" name="role" value={role} />
            <input type="hidden" name="next" value={destination} />
            <input type="hidden" name="locale" value={locale} />
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              <p className="font-semibold">{text.account}</p>
              <dl className="mt-2 space-y-1">
                <div className="flex gap-2"><dt className="font-medium">{text.username}</dt><dd className="font-mono">{account.username}</dd></div>
                <div className="flex gap-2"><dt className="font-medium">{text.password}</dt><dd className="font-mono">{account.password}</dd></div>
              </dl>
            </div>
            {state.formError ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.formError}</p> : null}
            <div>
              <label htmlFor="username" className="mb-1 block text-sm font-semibold text-slate-900">{text.username}</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={state.usernameError ? true : undefined}
                aria-describedby={state.usernameError ? "username-error" : undefined}
                className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-900 ${state.usernameError ? "border-red-400" : "border-slate-300"} ${focus}`}
              />
              {state.usernameError ? <p id="username-error" role="alert" className="mt-1 text-sm text-red-700">{state.usernameError}</p> : null}
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-semibold text-slate-900">{text.password}</label>
              <div className="flex gap-2">
                <input
                  id="password"
                  name="password"
                  type={visible ? "text" : "password"}
                  autoComplete="current-password"
                  aria-invalid={state.passwordError ? true : undefined}
                  aria-describedby={state.passwordError ? "password-error" : undefined}
                  className={`min-w-0 flex-1 rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-900 ${state.passwordError ? "border-red-400" : "border-slate-300"} ${focus}`}
                />
                <button
                  type="button"
                  className={`shrink-0 rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 ${focus}`}
                  aria-pressed={visible}
                  aria-controls="password"
                  onClick={() => setVisible((current) => !current)}
                >
                  {visible ? text.hide : text.show}
                </button>
              </div>
              {state.passwordError ? <p id="password-error" role="alert" className="mt-1 text-sm text-red-700">{state.passwordError}</p> : null}
            </div>
            <button type="submit" disabled={pending} className={`w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60 ${focus}`}>
              {pending ? text.pending : text.submit}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
