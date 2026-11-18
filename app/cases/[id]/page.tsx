import { CaseRecord } from "@/components/case-record";
import { CASES, getCase } from "@/lib/cases";
import { requireRole } from "@/lib/guard";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return CASES.map((item) => ({ id: item.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const item = getCase(id);
  return { title: item ? `${item.id} · ${item.name} · Baton` : "Case not found · Baton" };
}

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole("user");
  if (!getCase(id)) notFound();
  return <CaseRecord caseId={id} />;
}
