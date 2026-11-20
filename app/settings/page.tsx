import { IllnessSettings } from "@/components/illness-settings";
import { requireRole } from "@/lib/guard";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Illness requirements · Baton" };

export default async function SettingsPage() {
  await requireRole("admin");
  return <IllnessSettings />;
}
