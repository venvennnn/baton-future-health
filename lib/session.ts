export const SESSION_COOKIE = "baton_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

/** Passwordless "Continue as User" may issue only this role. */
export const USER_DEMO_ROLE = "user" as const;

const DEV_SECRET = "baton-local-demo-session-secret-not-for-production";

export type Role = "user" | "admin";

export interface Session {
  role: Role;
  exp: number;
}

export const DEMO_ACCOUNTS: Record<Role, { username: string; password: string }> = {
  user: { username: "user", password: "password" },
  admin: { username: "admin", password: "password" },
};

export function isRole(value: unknown): value is Role {
  return value === "user" || value === "admin";
}

/** Production requires BATON_SESSION_SECRET. Development falls back to a local-only secret. */
export function sessionSecret(): string | null {
  const value = process.env.BATON_SESSION_SECRET?.trim();
  if (value && value.length >= 16) return value;
  if (process.env.NODE_ENV === "production") return null;
  return DEV_SECRET;
}

export function sessionCookieOptions(maxAge = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function safeEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < length; i += 1) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

export function checkDemoCredentials(role: Role, username: string, password: string): boolean {
  const account = DEMO_ACCOUNTS[role];
  return safeEqual(username, account.username) && safeEqual(password, account.password);
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

async function sign(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return encodeBase64Url(new Uint8Array(signature));
}

export async function signSession(role: Role, secret: string, now = Date.now()): Promise<string> {
  const payload = encodeBase64Url(
    new TextEncoder().encode(JSON.stringify({ role, exp: Math.floor(now / 1000) + SESSION_MAX_AGE_SECONDS })),
  );
  return `${payload}.${await sign(secret, payload)}`;
}

export async function readSessionToken(token: string | undefined, secret: string, now = Date.now()): Promise<Session | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  if (!payload || !signature) return null;
  const expected = await sign(secret, payload);
  if (!safeEqual(signature, expected)) return null;
  const bytes = decodeBase64Url(payload);
  if (!bytes) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const role = (parsed as { role?: unknown }).role;
  const exp = (parsed as { exp?: unknown }).exp;
  if (!isRole(role) || typeof exp !== "number" || !Number.isFinite(exp)) return null;
  if (exp * 1000 <= now) return null;
  return { role, exp };
}
