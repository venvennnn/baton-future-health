import { SimulatorView } from "@/components/simulator-view";
import { requireRole } from "@/lib/guard";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Capacity planning · Baton" };

export default async function SimulatorPage() {
  await requireRole("admin");
  return <SimulatorView />;
}
