import { isRole, type Role } from "@/lib/session";

export type Zone = Role | "public" | "unknown";

export function roleHome(role: Role): "/cases" | "/facilities" {
  return role === "user" ? "/cases" : "/facilities";
}

export function roleForPath(pathname: string): Zone {
  if (pathname === "/" || pathname === "/login") return "public";
  if (pathname === "/cases" || /^\/cases\/[A-Za-z0-9-]+$/.test(pathname)) return "user";
  if (pathname === "/facilities" || pathname === "/simulator" || pathname === "/governance" || pathname === "/settings") return "admin";
  return "unknown";
}

export function canAccess(role: Role, pathname: string): boolean {
  const zone = roleForPath(pathname);
  if (zone === "public" || zone === "unknown") return true;
  return zone === role;
}

export interface InternalPath {
  pathname: string;
  hash: string;
}

/** Accepts a single internal path. Rejects protocol-relative, external, and traversal targets. */
export function parseInternal(value: string | null | undefined): InternalPath | null {
  if (!value || typeof value !== "string" || value.length > 200) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes("://")) return null;
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.includes("\\") || decoded.includes("://") || decoded.includes("..")) return null;
  const hashAt = decoded.indexOf("#");
  const beforeHash = hashAt >= 0 ? decoded.slice(0, hashAt) : decoded;
  const hash = hashAt >= 0 ? decoded.slice(hashAt) : "";
  if (hash && !/^#[A-Za-z0-9_-]+$/.test(hash)) return null;
  const queryAt = beforeHash.indexOf("?");
  const pathname = queryAt >= 0 ? beforeHash.slice(0, queryAt) : beforeHash;
  if (!pathname.startsWith("/") || pathname.startsWith("//") || pathname.includes("//")) return null;
  return { pathname, hash };
}

export function isPermittedDestination(role: Role, pathname: string): boolean {
  if (pathname === "/") return true;
  return roleForPath(pathname) === role;
}

export function resolveDestination(role: Role, next: string | null | undefined): string {
  const parsed = parseInternal(next);
  if (parsed && isPermittedDestination(role, parsed.pathname)) return `${parsed.pathname}${parsed.hash}`;
  return roleHome(role);
}

export function entryHref(sessionRole: Role | null, destination: string): string {
  const parsed = parseInternal(destination);
  if (!parsed) return "/";
  const zone = roleForPath(parsed.pathname);
  const target = `${parsed.pathname}${parsed.hash}`;
  if (zone === "public" || zone === "unknown") return target;
  if (sessionRole === zone) return target;
  return `/login?${new URLSearchParams({ role: zone, next: target }).toString()}`;
}

/** After logout, only the overview or a sanitized login URL may be used. */
export function logoutTarget(value: string | null | undefined): string {
  if (!value || value === "/") return "/";
  if (value.includes("\\") || value.includes("://") || value.startsWith("//")) return "/";
  let url: URL;
  try {
    url = new URL(value, "http://baton.local");
  } catch {
    return "/";
  }
  if (url.origin !== "http://baton.local" || url.username || url.password) return "/";
  if (url.pathname === "/") return "/";
  if (url.pathname !== "/login") return "/";
  const role = url.searchParams.get("role");
  if (!isRole(role)) return "/login?role=user";
  const next = resolveDestination(role, url.searchParams.get("next"));
  return `/login?${new URLSearchParams({ role, next }).toString()}`;
}

export function accessNotice(role: Role): "admin-required" | "user-required" {
  return role === "user" ? "admin-required" : "user-required";
}
