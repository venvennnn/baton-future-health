"use server";

import { logoutTarget, resolveDestination } from "@/lib/access";
import { loginFeedback, loginLocale, loginMessage, requestedRole } from "@/lib/login";
import type { LoginState } from "@/lib/login";
import { USER_DEMO_ROLE, sessionSecret } from "@/lib/session";
import { clearSessionCookie, getSession, setSessionCookie } from "@/lib/session-cookie";
import { redirect } from "next/navigation";

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const locale = loginLocale(formData.get("locale"));
  const role = requestedRole(formData.get("role"));
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");
  const feedback = loginFeedback({ role, username, password, locale });
  if (feedback) return feedback;
  if (!sessionSecret()) return { formError: loginMessage(locale, "unconfigured") };
  const current = await getSession();
  if (current && current.role !== role) return { formError: loginMessage(locale, "switch") };
  await setSessionCookie(role);
  redirect(resolveDestination(role, next));
}

/** Issues a User session only. An Admin session is replaced only after an explicit switch. */
export async function issueUserDemo(formData: FormData): Promise<void> {
  const confirm = formData.get("confirm") === "switch";
  const next = String(formData.get("next") ?? "");
  const current = await getSession();
  if (current?.role === "admin" && !confirm) redirect("/facilities?notice=user-required");
  if (!sessionSecret()) redirect("/login?role=user");
  await setSessionCookie(USER_DEMO_ROLE);
  redirect(resolveDestination(USER_DEMO_ROLE, next || "/cases"));
}

export async function logout(formData: FormData): Promise<void> {
  const next = String(formData.get("next") ?? "");
  await clearSessionCookie();
  redirect(logoutTarget(next));
}
