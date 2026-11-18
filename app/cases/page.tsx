import { CaseBoard } from "@/components/case-board";
import { requireRole } from "@/lib/guard";

export default async function CasesPage() {
  await requireRole("user");
  return <CaseBoard />;
}
