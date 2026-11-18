import { canAccess, roleForPath } from "@/lib/access";
import { SESSION_COOKIE, readSessionToken, sessionCookieOptions } from "@/lib/session";
import { sessionSecret } from "@/lib/session-secret";
import { NextResponse, type NextRequest } from "next/server";

function redirectTo(request: NextRequest, pathname: string, params: Record<string, string>) {
  const forwarded = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const host = /^[A-Za-z0-9.-]+(?::\d+)?$/.test(forwarded) ? forwarded : request.nextUrl.host;
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const url = new URL(pathname, `${proto}://${host}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const secret = sessionSecret();
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await readSessionToken(token, secret) : null;
  const invalidCookie = Boolean(token) && !session;
  const zone = roleForPath(pathname);

  if (zone === "public" || zone === "unknown") {
    const response = NextResponse.next();
    if (invalidCookie) response.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
    return response;
  }

  if (!session) {
    const response = redirectTo(request, "/login", { role: zone, next: pathname });
    if (invalidCookie) response.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
    return response;
  }

  if (!canAccess(session.role, pathname)) {
    const home = session.role === "user" ? "/cases" : "/facilities";
    const notice = session.role === "user" ? "admin-required" : "user-required";
    return redirectTo(request, home, { notice });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|photos/|icon.png|.*\\.(?:png|svg|jpg|jpeg|gif|webp|ico)$).*)"],
};
