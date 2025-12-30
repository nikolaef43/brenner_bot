import Link from "next/link";
import { readCorpusDoc, CORPUS_DOCS } from "@/lib/corpus";
import type { Metadata } from "next";

export const runtime = "nodejs";

// Generate metadata for the document
export async function generateMetadata({
  params,
}: {
  params: Promise<{ doc: string }>;
}): Promise<Metadata> {
  const { doc: docId } = await params;
  const docInfo = CORPUS_DOCS.find((d) => d.id === docId);

  return {
    title: docInfo?.title || "Document",
    description: `Read ${docInfo?.title || "this document"} from the Brenner Bot corpus.`,
  };
}

// Icons
const ChevronRightIcon = () => (
  <svg className="size-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

const ClockIcon = () => (
  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const DocumentIcon = () => (
  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

function getReadTime(id: string): string {
  const times: Record<string, string> = {
    transcript: "2+ hours",
    "quote-bank": "45 min",
    metaprompt: "10 min",
    "initial-metaprompt": "5 min",
    "distillation-gpt-52": "30 min",
    "distillation-opus-45": "45 min",
    "distillation-gemini-3": "20 min",
  };
  return times[id] || "15 min";
}

function getWordCount(content: string): string {
  const words = content.split(/\s+/).filter(Boolean).length;
  if (words >= 1000) {
    return `${Math.round(words / 1000)}k words`;
  }
  return `${words} words`;
}

function getNavLinks(currentId: string) {
  const currentIndex = CORPUS_DOCS.findIndex((d) => d.id === currentId);
  const prev = currentIndex > 0 ? CORPUS_DOCS[currentIndex - 1] : null;
  const next = currentIndex < CORPUS_DOCS.length - 1 ? CORPUS_DOCS[currentIndex + 1] : null;
  return { prev, next };
}

export default async function CorpusDocPage({
  params,
}: {
  params: Promise<{ doc: string }>;
}) {
  const { doc: docId } = await params;
  const { doc, content, restricted } = await readCorpusDoc(docId);
  const { prev, next } = getNavLinks(docId);
  const wordCount = getWordCount(content);

  return (
    <article className="max-w-none">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
        <Link href="/corpus" className="hover:text-foreground transition-colors link-underline">
          Corpus
        </Link>
        <ChevronRightIcon />
        <span className="text-foreground font-medium truncate">{doc.title}</span>
      </nav>

      {/* Header */}
      <header className="mb-8 pb-8 border-b border-border">
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4 animate-fade-in-up">
          {doc.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground animate-fade-in-up stagger-1">
          <span className="flex items-center gap-1.5">
            <ClockIcon />
            {restricted ? "Restricted" : `${getReadTime(docId)} read`}
          </span>
          {!restricted && (
            <span className="flex items-center gap-1.5">
              <DocumentIcon />
              {wordCount}
            </span>
          )}
          <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
            {doc.filename}
          </span>
        </div>
      </header>

      {restricted && (
        <section className="mb-8 rounded-xl border border-border bg-muted/30 p-6 animate-fade-in-up stagger-2">
          <h2 className="text-lg font-semibold mb-2">Restricted document</h2>
          <p className="text-sm text-muted-foreground">
            This document is not served in public mode. If you are running Brenner Bot locally, enable lab mode with{" "}
            <span className="font-mono">BRENNER_LAB_MODE=true</span> and reload.
          </p>
        </section>
      )}

      {/* Content */}
      <div className="prose prose-wide dark:prose-invert animate-fade-in-up stagger-3">
        <pre className="whitespace-pre-wrap break-words font-sans text-base leading-relaxed bg-transparent border-0 p-0 m-0 overflow-visible">
          {content}
        </pre>
      </div>

      {/* Navigation */}
      <nav className="mt-16 pt-8 border-t border-border">
        <div className="grid gap-4 sm:grid-cols-2">
          {prev ? (
            <Link
              href={`/corpus/${prev.id}`}
              className="group flex flex-col p-4 rounded-xl border bg-card hover:bg-muted/50 hover:border-primary/30 transition-all"
            >
              <span className="text-xs text-muted-foreground mb-1">Previous</span>
              <span className="font-medium group-hover:text-primary transition-colors line-clamp-1">
                {prev.title}
              </span>
            </Link>
          ) : (
            <div />
          )}

          {next ? (
            <Link
              href={`/corpus/${next.id}`}
              className="group flex flex-col p-4 rounded-xl border bg-card hover:bg-muted/50 hover:border-primary/30 transition-all text-right sm:items-end"
            >
              <span className="text-xs text-muted-foreground mb-1">Next</span>
              <span className="font-medium group-hover:text-primary transition-colors line-clamp-1">
                {next.title}
              </span>
            </Link>
          ) : (
            <div />
          )}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/corpus"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Corpus
          </Link>
        </div>
      </nav>
    </article>
  );
}
