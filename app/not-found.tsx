import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-black">That page is not in the demo</h1>
      <p className="mt-2 text-slate-600">The case id may not be in the synthetic file.</p>
      <Link href="/cases" className="mt-4 inline-flex rounded-full bg-blue-700 px-4 py-2 text-sm font-bold text-white">Back to the case board</Link>
    </main>
  );
}
