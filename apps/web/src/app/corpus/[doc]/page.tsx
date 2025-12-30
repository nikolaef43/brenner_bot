import Link from "next/link";
import { readCorpusDoc, CORPUS_DOCS } from "@/lib/corpus";
import { parseTranscript } from "@/lib/transcript-parser";
import { parseDistillation } from "@/lib/distillation-parser";
import { parseQuoteBank } from "@/lib/quotebank-parser";
import { parseMetaprompt } from "@/lib/metaprompt-parser";
import { TranscriptViewer } from "@/components/transcript/TranscriptViewer";
import { DistillationViewer } from "@/components/distillation/DistillationViewer";
import { QuoteBankViewer } from "@/components/quotebank/QuoteBankViewer";
import { MetapromptViewer } from "@/components/metaprompt/MetapromptViewer";
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
    description: docInfo?.description || `Read ${docInfo?.title || "this document"} from the Brenner Bot corpus.`,
  };
}

// Icons
const ChevronRightIcon = () => (
  <svg className="size-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
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
    return `${Math.round(words / 1000)}k`;
  }
  return `${words}`;
}

function getNavLinks(currentId: string) {
  const currentIndex = CORPUS_DOCS.findIndex((d) => d.id === currentId);
  const prev = currentIndex > 0 ? CORPUS_DOCS[currentIndex - 1] : null;
  const next = currentIndex < CORPUS_DOCS.length - 1 ? CORPUS_DOCS[currentIndex + 1] : null;
  return { prev, next };
}

/**
 * Determine document type from ID
 */
function getDocType(id: string): "transcript" | "distillation" | "quote-bank" | "metaprompt" {
  if (id === "transcript") return "transcript";
  if (id === "quote-bank") return "quote-bank";
  if (id.startsWith("distillation")) return "distillation";
  return "metaprompt";
}

/**
 * Render the appropriate viewer based on document type
 */
function DocumentContent({ docId, content }: { docId: string; content: string }) {
  const docType = getDocType(docId);
  const readTime = getReadTime(docId);
  const wordCount = getWordCount(content);

  switch (docType) {
    case "transcript": {
      const parsed = parseTranscript(content);
      return (
        <TranscriptViewer
          data={parsed}
          estimatedReadTime={readTime}
          wordCount={wordCount}
        />
      );
    }

    case "distillation": {
      const parsed = parseDistillation(content, docId);
      return <DistillationViewer data={parsed} docId={docId} />;
    }

    case "quote-bank": {
      const parsed = parseQuoteBank(content);
      return <QuoteBankViewer data={parsed} />;
    }

    case "metaprompt": {
      const parsed = parseMetaprompt(content);
      return <MetapromptViewer data={parsed} />;
    }
  }
}

export default async function CorpusDocPage({
  params,
}: {
  params: Promise<{ doc: string }>;
}) {
  const { doc: docId } = await params;
  const { doc, content } = await readCorpusDoc(docId);
  const { prev, next } = getNavLinks(docId);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-8 animate-fade-in" aria-label="Breadcrumb">
        <Link href="/corpus" className="hover:text-foreground transition-colors link-underline">
          Corpus
        </Link>
        <ChevronRightIcon />
        <span className="text-foreground font-medium truncate">{doc.title}</span>
      </nav>

      {/* Document Content with Type-Specific Viewer */}
      <div className="animate-fade-in-up">
        <DocumentContent docId={docId} content={content} />
      </div>

      {/* Navigation */}
      <nav className="mt-20 pt-10 border-t border-border animate-fade-in-up">
        <div className="grid gap-4 sm:grid-cols-2">
          {prev ? (
            <Link
              href={`/corpus/${prev.id}`}
              className="group flex items-center gap-4 p-5 rounded-2xl border bg-card hover:bg-muted/50 hover:border-primary/30 transition-all"
            >
              <div className="flex items-center justify-center size-12 rounded-xl bg-muted text-muted-foreground group-hover:text-primary transition-colors">
                <ArrowLeftIcon />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Previous</span>
                <div className="font-semibold group-hover:text-primary transition-colors truncate">
                  {prev.title}
                </div>
              </div>
            </Link>
          ) : (
            <div />
          )}

          {next ? (
            <Link
              href={`/corpus/${next.id}`}
              className="group flex items-center gap-4 p-5 rounded-2xl border bg-card hover:bg-muted/50 hover:border-primary/30 transition-all text-right sm:flex-row-reverse"
            >
              <div className="flex items-center justify-center size-12 rounded-xl bg-muted text-muted-foreground group-hover:text-primary transition-colors">
                <ArrowRightIcon />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Next</span>
                <div className="font-semibold group-hover:text-primary transition-colors truncate">
                  {next.title}
                </div>
              </div>
            </Link>
          ) : (
            <div />
          )}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/corpus"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all"
          >
            <ArrowLeftIcon />
            Back to Corpus
          </Link>
        </div>
      </nav>
    </div>
  );
}
