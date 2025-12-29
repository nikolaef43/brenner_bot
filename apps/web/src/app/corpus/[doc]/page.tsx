import Link from "next/link";
import { readCorpusDoc } from "@/lib/corpus";

export const runtime = "nodejs";

export default async function CorpusDocPage({
  params,
}: {
  params: Promise<{ doc: string }>;
}) {
  const { doc: docId } = await params;
  const { doc, content } = await readCorpusDoc(docId);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/corpus" className="hover:underline">
            Corpus
          </Link>{" "}
          / {doc.title}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{doc.title}</h1>
      </header>

      <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-950">
        <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-900 dark:text-zinc-50">
          {content}
        </pre>
      </div>
    </div>
  );
}

