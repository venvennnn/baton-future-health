import { LoginScreen } from "@/components/login-screen";
import { resolveDestination } from "@/lib/access";
import { getSession } from "@/lib/session-cookie";
import { isRole, type Role } from "@/lib/session";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Demo login · Baton" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ role?: string; next?: string }> }) {
  const query = await searchParams;
  const role: Role = isRole(query.role) ? query.role : "user";
  const next = typeof query.next === "string" ? query.next : "";
  const session = await getSession();
  if (session?.role === role) redirect(resolveDestination(role, next));
  return <LoginScreen role={role} next={next} sessionRole={session?.role ?? null} />;
}
