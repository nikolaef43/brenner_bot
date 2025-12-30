"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { BrennerOperatorPaletteEntry } from "@/lib/operators";

// ============================================================================
// ICONS
// ============================================================================

const SparklesIcon = ({ className = "size-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);

const SearchIcon = ({ className = "size-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

const XIcon = ({ className = "size-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ChevronDownIcon = ({ className = "size-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const QuoteIcon = ({ className = "size-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h1.5A2.25 2.25 0 0111.25 10.5v3A2.25 2.25 0 019 15.75H7.5a2.25 2.25 0 01-2.25-2.25v-3A2.25 2.25 0 017.5 8.25zM15 8.25h1.5A2.25 2.25 0 0118.75 10.5v3A2.25 2.25 0 0116.5 15.75H15a2.25 2.25 0 01-2.25-2.25v-3A2.25 2.25 0 0115 8.25z" />
  </svg>
);

// ============================================================================
// HELPERS
// ============================================================================

function getTranscriptHref(sectionId: string): string | null {
  const normalized = sectionId.replace(/^§/, "");
  const first = normalized.split("-")[0];
  const sectionNum = first ? Number.parseInt(first, 10) : NaN;
  if (!Number.isFinite(sectionNum) || sectionNum <= 0) return null;
  return `/corpus/transcript#section-${sectionNum}`;
}

function operatorMatchesQuery(operator: BrennerOperatorPaletteEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const quoteText = operator.supportingQuotes
    .map((quote) => [quote.sectionId, quote.title, quote.quote, quote.context, quote.tags.join(" ")].join(" "))
    .join(" ");

  const haystack = [
    operator.title,
    operator.canonicalTag,
    operator.symbol,
    operator.definition,
    operator.whenToUseTriggers.join(" "),
    operator.failureModes.join(" "),
    operator.transcriptAnchors,
    quoteText,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

// ============================================================================
// COMPONENTS
// ============================================================================

function OperatorCard({
  operator,
  isExpanded,
  onToggle,
}: {
  operator: BrennerOperatorPaletteEntry;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const quotes = operator.supportingQuotes;

  return (
    <section
      id={operator.canonicalTag}
      className={`rounded-2xl border bg-card overflow-hidden transition-all duration-200 ${
        isExpanded ? "border-primary/30 shadow-lg shadow-primary/5" : "border-border hover:border-border/80"
      }`}
    >
      {/* Header */}
      <button onClick={onToggle} className="w-full p-5 sm:p-6 flex items-start justify-between gap-4 text-left">
        <div className="flex items-start gap-4 min-w-0">
          <div className="flex size-12 sm:size-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
            <span className="text-xl sm:text-2xl font-semibold leading-none">{operator.symbol}</span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-semibold text-foreground">
                {operator.title}
              </h2>
              <span className="px-2 py-0.5 text-xs rounded-full border border-border/60 bg-muted/30 text-muted-foreground">
                {operator.canonicalTag}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{operator.definition}</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <QuoteIcon className="size-3.5" />
                {quotes.length} quote{quotes.length === 1 ? "" : "s"}
              </span>
              <span aria-hidden="true">•</span>
              <span>{operator.transcriptAnchors}</span>
            </div>
          </div>
        </div>

        <ChevronDownIcon className={`size-5 mt-1 flex-shrink-0 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
      </button>

      {/* Body */}
      {isExpanded && (
        <div className="px-5 pb-6 sm:px-6 space-y-6">
          {/* When to use */}
          <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              When to use
            </div>
            <ul className="space-y-1.5 text-sm text-foreground/85">
              {operator.whenToUseTriggers.map((trigger, index) => (
                <li key={`${operator.canonicalTag}:trigger:${index}`} className="flex gap-2">
                  <span className="mt-2 size-1.5 rounded-full bg-primary/40 flex-shrink-0" />
                  <span>{trigger}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Failure modes */}
          <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Failure modes
            </div>
            <ul className="space-y-1.5 text-sm text-foreground/85">
              {operator.failureModes.map((mode, index) => (
                <li key={`${operator.canonicalTag}:failure:${index}`} className="flex gap-2">
                  <span className="mt-2 size-1.5 rounded-full bg-destructive/40 flex-shrink-0" />
                  <span>{mode}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Quotes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Anchored quotes
                </div>
                <div className="text-sm text-muted-foreground">
                  Curated quote-bank entries tagged with <code className="px-1 py-0.5 rounded bg-muted font-mono text-[0.8em]">{operator.canonicalTag}</code>
                </div>
              </div>
              <Link
                href="/corpus/quote-bank"
                className="text-sm text-primary hover:underline whitespace-nowrap"
              >
                View quote bank
              </Link>
            </div>

            <div className="grid gap-3">
              {quotes.map((quote) => {
                const transcriptHref = getTranscriptHref(quote.sectionId);
                return (
                  <div key={`${operator.canonicalTag}:${quote.sectionId}:${quote.title}`} className="rounded-xl border border-border/60 bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {transcriptHref ? (
                            <Link
                              href={transcriptHref}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-xs font-semibold hover:bg-primary/15 transition-colors"
                            >
                              {quote.sectionId}
                            </Link>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border text-xs font-semibold">
                              {quote.sectionId}
                            </span>
                          )}

                          <h3 className="font-medium text-foreground truncate">{quote.title}</h3>
                        </div>
                      </div>

                      <div className="flex-shrink-0 text-xs text-muted-foreground">
                        {transcriptHref ? (
                          <Link href={transcriptHref} className="hover:text-foreground hover:underline">
                            Open in transcript
                          </Link>
                        ) : (
                          <span>Transcript link unavailable</span>
                        )}
                      </div>
                    </div>

                    <blockquote className="mt-3 text-sm text-foreground/85 italic leading-relaxed">
                      “{quote.quote}”
                    </blockquote>

                    {quote.context && (
                      <div className="mt-3 text-sm text-muted-foreground leading-relaxed">
                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/80">
                          Why it matters:
                        </span>{" "}
                        {quote.context}
                      </div>
                    )}

                    {quote.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {quote.tags.slice(0, 10).map((tag, index) => (
                          <span
                            key={`${operator.canonicalTag}:${quote.sectionId}:${quote.title}:tag:${index}`}
                            className="px-2 py-0.5 text-xs rounded-full border border-border/60 bg-muted/30 text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                        {quote.tags.length > 10 && (
                          <span className="px-2 py-0.5 text-xs rounded-full border border-border/60 bg-muted/30 text-muted-foreground">
                            +{quote.tags.length - 10}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export function OperatorsClient({ operators }: { operators: BrennerOperatorPaletteEntry[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const totalQuotes = useMemo(
    () => operators.reduce((sum, op) => sum + op.supportingQuotes.length, 0),
    [operators]
  );

  const filteredOperators = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return operators;
    return operators.filter((op) => operatorMatchesQuery(op, q));
  }, [operators, searchQuery]);

  const toggleOperator = useCallback((tag: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }, []);

  // Deep linking: /operators#level-split
  useEffect(() => {
    const handleHash = () => {
      const raw = window.location.hash.slice(1);
      const hash = raw ? decodeURIComponent(raw) : "";
      if (!hash) return;

      const match = operators.find((op) => op.canonicalTag === hash);
      if (!match) return;

      setSearchQuery("");
      setExpanded((prev) => new Set(prev).add(match.canonicalTag));

      setTimeout(() => {
        const el = document.getElementById(match.canonicalTag);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, [operators]);

  return (
    <div className="space-y-10">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
        <div className="absolute top-0 right-0 w-56 sm:w-96 h-56 sm:h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-44 sm:w-80 h-44 sm:h-80 bg-amber-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative px-5 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs sm:text-sm font-medium mb-5">
            <SparklesIcon className="size-4" />
            Operator Palette
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            Brenner Operators
          </h1>
          <p className="mt-3 text-base sm:text-lg text-muted-foreground max-w-2xl">
            Fourteen reusable “moves” for turning vague questions into discriminative tests—grounded in transcript anchors and curated quote-bank primitives.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card/80 backdrop-blur-sm border border-border/50">
              <span className="text-xl sm:text-2xl font-bold text-foreground">{operators.length}</span>
              <span className="text-muted-foreground text-xs sm:text-sm">operators</span>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card/80 backdrop-blur-sm border border-border/50">
              <span className="text-xl sm:text-2xl font-bold text-foreground">{totalQuotes}</span>
              <span className="text-muted-foreground text-xs sm:text-sm">anchored quotes</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Link href="/corpus/transcript" className="hover:text-foreground hover:underline">
                Browse transcript
              </Link>
              <span aria-hidden="true">·</span>
              <Link href="/corpus/quote-bank" className="hover:text-foreground hover:underline">
                Browse quote bank
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="space-y-2">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 sm:size-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search operators, triggers, failure modes, and anchored quotes…"
            className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-2.5 sm:py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-base"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground active:scale-90 transition-all touch-manipulation rounded-lg"
              aria-label="Clear search"
            >
              <XIcon />
            </button>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{filteredOperators.length}</span> of{" "}
          <span className="font-medium text-foreground">{operators.length}</span> operators
        </div>
      </div>

      {/* Operator cards */}
      <div className="space-y-4">
        {filteredOperators.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
            No operators match your search.
          </div>
        ) : (
          filteredOperators.map((operator) => (
            <OperatorCard
              key={operator.canonicalTag}
              operator={operator}
              isExpanded={expanded.has(operator.canonicalTag)}
              onToggle={() => toggleOperator(operator.canonicalTag)}
            />
          ))
        )}
      </div>
    </div>
  );
}
