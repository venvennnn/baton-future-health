import { Overview } from "@/components/overview";
import { getSession } from "@/lib/session-cookie";

export default async function HomePage() {
  const session = await getSession();
  return (
    <main>
      <Overview role={session?.role ?? null} />
    </main>
  );
}
