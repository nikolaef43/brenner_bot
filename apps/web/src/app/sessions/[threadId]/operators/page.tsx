import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Operators",
  description: "Apply Brenner methodology operators to refine your hypothesis.",
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

function OperatorsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 3.75H5.25A1.5 1.5 0 003.75 5.25V9A1.5 1.5 0 005.25 10.5H9A1.5 1.5 0 0010.5 9V5.25A1.5 1.5 0 009 3.75zM18.75 3.75H15A1.5 1.5 0 0013.5 5.25V9A1.5 1.5 0 0015 10.5h3.75A1.5 1.5 0 0020.25 9V5.25a1.5 1.5 0 00-1.5-1.5zM9 13.5H5.25a1.5 1.5 0 00-1.5 1.5v3.75a1.5 1.5 0 001.5 1.5H9a1.5 1.5 0 001.5-1.5V15a1.5 1.5 0 00-1.5-1.5zM18.75 13.5H15a1.5 1.5 0 00-1.5 1.5v3.75a1.5 1.5 0 001.5 1.5h3.75a1.5 1.5 0 001.5-1.5V15a1.5 1.5 0 00-1.5-1.5z"
      />
    </svg>
  );
}

const OPERATORS = [
  {
    symbol: "\u03A3",
    name: "Level Split",
    description: "Identify different levels of explanation",
  },
  {
    symbol: "\u2298",
    name: "Exclusion Test",
    description: "Design discriminative tests",
  },
  {
    symbol: "\u27F3",
    name: "Object Transpose",
    description: "Change reference frames",
  },
  {
    symbol: "\u2299",
    name: "Scale Check",
    description: "Check scale-dependence",
  },
];

export default async function OperatorsPage({ params }: PageProps) {
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
        <span className="text-foreground">Operators</span>
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
            <OperatorsIcon className="size-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Operators</h1>
        </div>
        <p className="text-muted-foreground">
          Apply Brenner methodology operators to refine your hypothesis.
        </p>
      </header>

      {/* Operator Grid */}
      <div className="grid gap-4 sm:grid-cols-2 animate-fade-in-up stagger-2">
        {OPERATORS.map((op, index) => (
          <div
            key={op.name}
            className={`rounded-xl border border-border bg-card p-5 hover:border-primary/30 hover:bg-muted/30 transition-all animate-fade-in-up stagger-${index + 2}`}
          >
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center size-12 rounded-xl bg-primary/10 text-primary text-2xl font-bold font-mono">
                {op.symbol}
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground">{op.name}</h3>
                <p className="text-sm text-muted-foreground">{op.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Placeholder */}
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center animate-fade-in-up stagger-6">
        <p className="text-sm text-muted-foreground">
          Interactive operator application workspace coming soon.
        </p>
      </div>
    </div>
  );
}
