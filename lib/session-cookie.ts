import { cookies } from "next/headers";
import { SESSION_COOKIE, readSessionToken, sessionCookieOptions, sessionSecret, signSession, type Role, type Session } from "@/lib/session";

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const secret = sessionSecret();
  if (!secret) return null;
  return readSessionToken(jar.get(SESSION_COOKIE)?.value, secret);
}

export async function setSessionCookie(role: Role): Promise<void> {
  const secret = sessionSecret();
  if (!secret) throw new Error("BATON_SESSION_SECRET is not configured");
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(role, secret), sessionCookieOptions());
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", sessionCookieOptions(0));
}
