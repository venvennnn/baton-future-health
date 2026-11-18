import { cookies } from "next/headers";
import { sessionSecret } from "@/lib/session-secret";
import { SESSION_COOKIE, readSessionToken, sessionCookieOptions, signSession, type Role, type Session } from "@/lib/session";

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  return readSessionToken(jar.get(SESSION_COOKIE)?.value, sessionSecret());
}

export async function setSessionCookie(role: Role): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(role, sessionSecret()), sessionCookieOptions());
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", sessionCookieOptions(0));
}
