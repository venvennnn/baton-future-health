import { Bottlenecks } from "@/components/bottlenecks";
import { requireRole } from "@/lib/guard";

export default async function FacilitiesPage() {
  await requireRole("admin");
  return <Bottlenecks />;
}
