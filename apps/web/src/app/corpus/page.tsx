import Link from "next/link";
import { listCorpusDocs } from "@/lib/corpus";

export const runtime = "nodejs";

export default async function CorpusIndexPage() {
  const docs = await listCorpusDocs();

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Corpus</h1>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          Canonical docs live at repo root and are read server-side.
        </p>
      </header>

      <ul className="grid gap-3">
        {docs.map((doc) => (
          <li key={doc.id}>
            <Link
              href={`/corpus/${doc.id}`}
              className="block rounded-xl border border-black/10 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-zinc-950"
            >
              <div className="font-semibold">{doc.title}</div>
              <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                {doc.filename}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

