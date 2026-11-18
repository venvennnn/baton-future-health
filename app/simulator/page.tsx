import { SimulatorView } from "@/components/simulator-view";
import { requireRole } from "@/lib/guard";

export default async function SimulatorPage() {
  await requireRole("admin");
  return <SimulatorView />;
}
