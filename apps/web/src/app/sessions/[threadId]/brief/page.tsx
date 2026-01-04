import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Research Brief",
  description: "Generated research artifact and export options.",
};

interface PageProps {
  params: Promise<{ threadId: string }>;
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

const EXPORT_FORMATS = [
  { name: "Markdown", ext: ".md", description: "Plain text with formatting" },
  { name: "PDF", ext: ".pdf", description: "Printable document" },
  { name: "JSON", ext: ".json", description: "Machine-readable format" },
];

export default async function BriefPage({ params }: PageProps) {
  const { threadId } = await params;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground animate-fade-in-up">
        <Link
          href="/sessions"
          className="hover:text-foreground transition-colors"
        >
          Sessions
        </Link>
        <span>/</span>
        <Link
          href={`/sessions/${threadId}`}
          className="hover:text-foreground transition-colors font-mono"
        >
          {threadId.slice(0, 12)}...
        </Link>
        <span>/</span>
        <span className="text-foreground">Research Brief</span>
      </nav>

      {/* Back link */}
      <Link
        href={`/sessions/${threadId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ChevronLeftIcon className="size-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Session
      </Link>

      {/* Header */}
      <header className="animate-fade-in-up">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary">
            <DocumentIcon className="size-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Research Brief</h1>
        </div>
        <p className="text-muted-foreground">
          Generated research artifact with export options.
        </p>
      </header>

      {/* Brief Preview */}
      <div className="rounded-xl border border-border bg-card p-6 animate-fade-in-up stagger-2">
        <h2 className="font-semibold text-foreground mb-4">Brief Contents</h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-success" />
            Hypothesis Slate (2-5 competing explanations)
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-info" />
            Discriminative Tests
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-warning" />
            Assumption Ledger
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary" />
            Adversarial Critique
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-muted-foreground" />
            Evidence Summary
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="space-y-4 animate-fade-in-up stagger-3">
        <h2 className="font-semibold text-foreground">Export Options</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {EXPORT_FORMATS.map((format) => (
            <button
              key={format.ext}
              disabled
              className="rounded-xl border border-border bg-card p-4 text-left opacity-60 cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <DownloadIcon className="size-5 text-muted-foreground" />
                <div>
                  <div className="font-medium text-foreground">{format.name}</div>
                  <div className="text-xs text-muted-foreground">{format.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Placeholder */}
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center animate-fade-in-up stagger-4">
        <p className="text-sm text-muted-foreground">
          Brief generation and export functionality coming soon.
        </p>
      </div>
    </div>
  );
}
