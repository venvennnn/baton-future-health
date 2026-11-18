import { accessNotice, roleHome } from "@/lib/access";
import { getSession } from "@/lib/session-cookie";
import type { Role } from "@/lib/session";
import { redirect } from "next/navigation";

/** Runs before a protected page renders. Middleware also redirects these routes. */
export async function requireRole(role: Role): Promise<void> {
  const session = await getSession();
  if (!session) redirect(`/login?role=${role}`);
  if (session.role !== role) redirect(`${roleHome(session.role)}?notice=${accessNotice(session.role)}`);
}
