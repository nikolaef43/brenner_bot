import { readCorpusDoc } from "@/lib/corpus";
import { CompareView } from "@/components/distillation/CompareView";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Compare Distillations",
  description: "Side-by-side comparison of three frontier model analyses of Sydney Brenner's methodology.",
};

export const runtime = "nodejs";

// Icon
const ArrowLeftIcon = () => (
  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const docIds = {
  opus: "distillation-opus-45",
  gpt: "distillation-gpt-52",
  gemini: "distillation-gemini-3",
} as const;

export default async function ComparePage() {
  // Load all three distillations
  const [opusDoc, gptDoc, geminiDoc] = await Promise.all([
    readCorpusDoc(docIds.opus),
    readCorpusDoc(docIds.gpt),
    readCorpusDoc(docIds.gemini),
  ]);

  const distillations = {
    opus: { content: opusDoc.content },
    gpt: { content: gptDoc.content },
    gemini: { content: geminiDoc.content },
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col -mx-4 lg:-mx-8">
      {/* Back Link */}
      <div className="px-4 lg:px-8 py-3 border-b border-border bg-muted/30">
        <Link
          href="/distillations"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon />
          <span>Back to Distillations</span>
        </Link>
      </div>

      {/* Compare View */}
      <div className="flex-1 min-h-0">
        <CompareView distillations={distillations} />
      </div>
    </div>
  );
}
