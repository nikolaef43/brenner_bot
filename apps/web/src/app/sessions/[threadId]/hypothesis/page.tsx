import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hypothesis",
  description: "View and edit the hypothesis for this research session.",
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

function LightBulbIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  );
}

export default async function HypothesisPage({ params }: PageProps) {
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
        <span className="text-foreground">Hypothesis</span>
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
            <LightBulbIcon className="size-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Hypothesis</h1>
        </div>
        <p className="text-muted-foreground">
          View and refine the hypothesis for this research session.
        </p>
      </header>

      {/* Placeholder Content */}
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-12 text-center animate-fade-in-up stagger-2">
        <div className="flex items-center justify-center size-16 mx-auto mb-4 rounded-xl bg-muted/50">
          <LightBulbIcon className="size-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">
          Hypothesis Editor
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          This view will display the HypothesisCard component with editing capabilities,
          prediction locking, and evolution history.
        </p>
        <p className="text-xs text-muted-foreground/60 mt-4">
          Coming soon in a future update.
        </p>
      </div>
    </div>
  );
}
