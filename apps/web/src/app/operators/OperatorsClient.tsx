"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import type { BrennerOperatorPaletteEntry } from "@/lib/operators";
import { Jargon } from "@/components/jargon";
import { generatePromptBundle, type PromptBundle } from "@/lib/prompt-builder";

// ============================================================================
// CONSTANTS
// ============================================================================

const OPERATOR_CATEGORIES = {
  thinking: {
    label: "Thinking Moves",
    description: "Reshape how you frame and analyze problems",
    color: "from-violet-500/20 to-purple-500/20",
    borderColor: "border-violet-500/30",
    textColor: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-500/10",
    tags: ["level-split", "recode", "invariant-extract", "paradox-hunt", "exception-quarantine"],
  },
  experimentation: {
    label: "Experimentation",
    description: "Design and execute decisive tests",
    color: "from-emerald-500/20 to-teal-500/20",
    borderColor: "border-emerald-500/30",
    textColor: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
    tags: ["materialize", "exclusion-test", "object-transpose", "amplify", "diy"],
  },
  epistemics: {
    label: "Epistemics",
    description: "Manage knowledge and avoid bias",
    color: "from-amber-500/20 to-orange-500/20",
    borderColor: "border-amber-500/30",
    textColor: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
    tags: ["cross-domain", "dephase", "theory-kill", "scale-check"],
  },
} as const;

type CategoryKey = keyof typeof OPERATOR_CATEGORIES;

function getOperatorCategory(tag: string): CategoryKey | null {
  for (const key of Object.keys(OPERATOR_CATEGORIES) as CategoryKey[]) {
    const tags = OPERATOR_CATEGORIES[key].tags as readonly string[];
    if (tags.includes(tag)) return key;
  }
  return null;
}

// ============================================================================
// ICONS
// ============================================================================

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

const ChevronRightIcon = ({ className = "size-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

const QuoteIcon = ({ className = "size-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h1.5A2.25 2.25 0 0111.25 10.5v3A2.25 2.25 0 019 15.75H7.5a2.25 2.25 0 01-2.25-2.25v-3A2.25 2.25 0 017.5 8.25zM15 8.25h1.5A2.25 2.25 0 0118.75 10.5v3A2.25 2.25 0 0116.5 15.75H15a2.25 2.25 0 01-2.25-2.25v-3A2.25 2.25 0 0115 8.25z" />
  </svg>
);

const BookOpenIcon = ({ className = "size-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
  </svg>
);

const LightBulbIcon = ({ className = "size-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
  </svg>
);

const AlertTriangleIcon = ({ className = "size-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

const LinkIcon = ({ className = "size-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
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

function countAnchors(transcriptAnchors: string): number {
  const trimmed = transcriptAnchors.trim();
  if (!trimmed) return 0;
  // Split by comma and filter out empty entries
  return trimmed.split(",").filter((a) => a.trim()).length;
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
// CATEGORY PILL
// ============================================================================

function CategoryPill({
  category,
  isActive,
  onClick,
  count,
}: {
  category: { label: string; textColor: string; bgColor: string; borderColor: string } | null;
  isActive: boolean;
  onClick: () => void;
  count: number;
}) {
  const label = category?.label ?? "All";
  const activeClasses = isActive
    ? category
      ? `${category.bgColor} ${category.borderColor} ${category.textColor}`
      : "bg-primary/10 border-primary/30 text-primary"
    : "bg-muted/50 border-border/50 text-muted-foreground hover:bg-muted hover:border-border";

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium
        transition-all duration-200 whitespace-nowrap
        active:scale-[0.97] touch-manipulation
        ${activeClasses}
      `}
    >
      <span>{label}</span>
      <span className={`text-xs tabular-nums ${isActive ? "opacity-80" : "opacity-60"}`}>
        {count}
      </span>
    </button>
  );
}

// ============================================================================
// OPERATOR CARD (GRID VIEW)
// ============================================================================

function OperatorCard({
  operator,
  onClick,
}: {
  operator: BrennerOperatorPaletteEntry;
  onClick: () => void;
}) {
  const category = getOperatorCategory(operator.canonicalTag);
  const categoryData = category ? OPERATOR_CATEGORIES[category] : null;
  const quotes = operator.supportingQuotes;
  const anchorCount = countAnchors(operator.transcriptAnchors);

  return (
    <button
      onClick={onClick}
      className="group relative w-full text-left rounded-2xl border border-border/60 bg-card overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.99] touch-manipulation"
    >
      {/* Gradient accent top */}
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${categoryData?.color ?? "from-primary/30 to-primary/10"}`} />

      <div className="p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          {/* Symbol */}
          <div className={`flex size-14 sm:size-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${categoryData?.color ?? "from-primary/20 to-primary/5"} border ${categoryData?.borderColor ?? "border-primary/20"}`}>
            <span className="text-2xl sm:text-3xl font-bold leading-none">{operator.symbol}</span>
          </div>

          <div className="min-w-0 flex-1">
            {/* Category badge */}
            {categoryData && (
              <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md ${categoryData.bgColor} ${categoryData.textColor} mb-2`}>
                {categoryData.label}
              </span>
            )}

            {/* Title */}
            <h3 className="text-base sm:text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {operator.title}
            </h3>

            {/* Tag */}
            <code className="text-xs text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded mt-1 inline-block">
              {operator.canonicalTag}
            </code>
          </div>
        </div>

        {/* Definition */}
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed line-clamp-2">
          {operator.definition}
        </p>

        {/* Footer stats */}
        <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <QuoteIcon className="size-3.5" />
              {quotes.length} quote{quotes.length === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BookOpenIcon className="size-3.5" />
              {anchorCount} anchor{anchorCount === 1 ? "" : "s"}
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="hidden sm:inline">Explore</span>
            <ChevronRightIcon className="size-4" />
          </div>
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// OPERATOR DETAIL SHEET (MOBILE & DESKTOP)
// ============================================================================

function OperatorDetailSheet({
  operator,
  onClose,
}: {
  operator: BrennerOperatorPaletteEntry;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"triggers" | "failures" | "quotes">("triggers");
  const category = getOperatorCategory(operator.canonicalTag);
  const categoryData = category ? OPERATOR_CATEGORIES[category] : null;
  const quotes = operator.supportingQuotes;
  const sheetRef = useRef<HTMLDivElement>(null);

  // Lock body scroll
  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const tabs = [
    { key: "triggers" as const, label: "When to Use", icon: LightBulbIcon, count: operator.whenToUseTriggers.length },
    { key: "failures" as const, label: "Pitfalls", icon: AlertTriangleIcon, count: operator.failureModes.length },
    { key: "quotes" as const, label: "Quotes", icon: QuoteIcon, count: quotes.length },
  ];

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="operator-sheet-title"
        className="fixed z-[9999] bg-card shadow-2xl animate-in duration-300
          /* Mobile: bottom sheet */
          inset-x-0 bottom-0 max-h-[92vh] rounded-t-3xl border-t border-border/50
          /* Desktop: side panel */
          lg:inset-y-4 lg:right-4 lg:left-auto lg:w-[600px] lg:max-h-none lg:rounded-2xl lg:border
          flex flex-col"
      >
        {/* Gradient accent */}
        <div className={`absolute inset-x-0 top-0 h-1.5 rounded-t-3xl lg:rounded-t-2xl bg-gradient-to-r ${categoryData?.color ?? "from-primary/30 to-primary/10"}`} />

        {/* Mobile handle */}
        <div className="lg:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-4 lg:pt-6 pb-4 border-b border-border/50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              {/* Symbol */}
              <div className={`flex size-14 sm:size-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${categoryData?.color ?? "from-primary/20 to-primary/5"} border ${categoryData?.borderColor ?? "border-primary/20"}`}>
                <span className="text-2xl sm:text-3xl font-bold leading-none">{operator.symbol}</span>
              </div>

              <div className="min-w-0">
                {categoryData && (
                  <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md ${categoryData.bgColor} ${categoryData.textColor} mb-1`}>
                    {categoryData.label}
                  </span>
                )}
                <h2 id="operator-sheet-title" className="text-xl sm:text-2xl font-bold text-foreground">
                  {operator.title}
                </h2>
                <code className="text-sm text-muted-foreground font-mono">
                  {operator.canonicalTag}
                </code>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground active:scale-90 transition-all touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Close"
            >
              <XIcon className="size-5" />
            </button>
          </div>

          {/* Definition */}
          <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
            {operator.definition}
          </p>

          {/* Transcript anchors */}
          <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
            <LinkIcon className="size-4 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              <span className="font-medium">Transcript:</span> {operator.transcriptAnchors}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 px-6 py-3 border-b border-border/50 flex gap-1 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap
                transition-all duration-200 active:scale-[0.97] touch-manipulation
                ${activeTab === tab.key
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }
              `}
            >
              <tab.icon className="size-4" />
              <span>{tab.label}</span>
              <span className={`text-xs tabular-nums ${activeTab === tab.key ? "opacity-80" : "opacity-50"}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-5 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] lg:pb-6"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {activeTab === "triggers" && (
            <div className="space-y-3">
              {operator.whenToUseTriggers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No usage triggers defined for this operator.
                </div>
              ) : (
                operator.whenToUseTriggers.map((trigger, index) => (
                  <div
                    key={index}
                    className="flex gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="size-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{index + 1}</span>
                      </div>
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed">{trigger}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "failures" && (
            <div className="space-y-3">
              {operator.failureModes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No failure modes documented for this operator.
                </div>
              ) : (
                operator.failureModes.map((mode, index) => (
                  <div
                    key={index}
                    className="flex gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <AlertTriangleIcon className="size-5 text-red-500" />
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed">{mode}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "quotes" && (
            <div className="space-y-4">
              {quotes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No anchored quotes for this operator.
                </div>
              ) : (
                quotes.map((quote, index) => {
                  const transcriptHref = getTranscriptHref(quote.sectionId);
                  return (
                    <div
                      key={index}
                      className="rounded-xl border border-border/60 bg-muted/20 overflow-hidden"
                    >
                      {/* Quote header */}
                      <div className="px-4 py-3 bg-muted/30 border-b border-border/50 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          {transcriptHref ? (
                            <Link
                              href={transcriptHref}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-bold hover:bg-primary/15 active:scale-95 transition-all touch-manipulation"
                            >
                              {quote.sectionId}
                            </Link>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-muted text-muted-foreground border border-border text-xs font-bold">
                              {quote.sectionId}
                            </span>
                          )}
                          <h4 className="font-medium text-foreground text-sm truncate">{quote.title}</h4>
                        </div>
                        {transcriptHref && (
                          <Link
                            href={transcriptHref}
                            className="flex-shrink-0 text-xs text-primary hover:underline active:scale-95 transition-all touch-manipulation"
                          >
                            Open
                          </Link>
                        )}
                      </div>

                      {/* Quote body */}
                      <div className="p-4">
                        <blockquote className="text-sm text-foreground/90 italic leading-relaxed">
                          &ldquo;{quote.quote}&rdquo;
                        </blockquote>

                        {quote.context && (
                          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                            <span className="font-semibold text-foreground/70">Why it matters:</span> {quote.context}
                          </p>
                        )}

                        {quote.tags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {quote.tags.slice(0, 6).map((tag, tagIndex) => (
                              <span
                                key={tagIndex}
                                className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-muted/50 text-muted-foreground border border-border/50"
                              >
                                {tag}
                              </span>
                            ))}
                            {quote.tags.length > 6 && (
                              <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-muted/50 text-muted-foreground border border-border/50">
                                +{quote.tags.length - 6}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Quote bank link */}
              <div className="pt-2">
                <Link
                  href="/corpus/quote-bank"
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  View full quote bank
                  <ChevronRightIcon className="size-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function OperatorsClient({ operators }: { operators: BrennerOperatorPaletteEntry[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null);
  const [selectedOperator, setSelectedOperator] = useState<BrennerOperatorPaletteEntry | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const totalQuotes = useMemo(
    () => operators.reduce((sum, op) => sum + op.supportingQuotes.length, 0),
    [operators]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryKey | "all", number> = { all: operators.length, thinking: 0, experimentation: 0, epistemics: 0 };
    for (const op of operators) {
      const cat = getOperatorCategory(op.canonicalTag);
      if (cat) counts[cat]++;
    }
    return counts;
  }, [operators]);

  const filteredOperators = useMemo(() => {
    let result = operators;

    // Filter by category
    if (selectedCategory) {
      const categoryTags = OPERATOR_CATEGORIES[selectedCategory].tags as readonly string[];
      result = result.filter((op) => categoryTags.includes(op.canonicalTag));
    }

    // Filter by search
    const q = searchQuery.trim();
    if (q) {
      result = result.filter((op) => operatorMatchesQuery(op, q));
    }

    return result;
  }, [operators, selectedCategory, searchQuery]);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
      setSelectedCategory(null);
      setSelectedOperator(match);
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, [operators]);

  const handleOperatorClick = useCallback((op: BrennerOperatorPaletteEntry) => {
    setSelectedOperator(op);
    const url = new URL(window.location.href);
    url.hash = op.canonicalTag;
    window.history.replaceState(null, "", url.toString());
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSelectedOperator(null);
    const url = new URL(window.location.href);
    url.hash = "";
    window.history.replaceState(null, "", url.toString());
  }, []);

  return (
    <div className="space-y-8 sm:space-y-12">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-card via-card to-muted/30 border border-border/50">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-primary/8 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-gradient-to-tr from-violet-500/5 via-transparent to-transparent rounded-full blur-3xl" />

        <div className="relative px-6 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-6">
            <div className="h-px flex-1 max-w-[40px] bg-gradient-to-r from-transparent to-primary/40" />
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              Operator Palette
            </span>
            <div className="h-px flex-1 max-w-[40px] bg-gradient-to-l from-transparent to-primary/40" />
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            Brenner Operators
          </h1>

          {/* Subtitle */}
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Reusable cognitive moves for turning vague questions into{" "}
            <Jargon term="discriminative-test">discriminative tests</Jargon>—grounded in transcript{" "}
            <Jargon term="anchor">anchors</Jargon> and curated{" "}
            <Jargon term="quote-bank">quote-bank</Jargon> primitives.
          </p>

          {/* Stats */}
          <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-background/60 backdrop-blur-sm border border-border/50 shadow-sm">
              <span className="text-2xl sm:text-3xl font-bold text-foreground">{operators.length}</span>
              <span className="text-sm text-muted-foreground">operators</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-background/60 backdrop-blur-sm border border-border/50 shadow-sm">
              <span className="text-2xl sm:text-3xl font-bold text-foreground">{totalQuotes}</span>
              <span className="text-sm text-muted-foreground">anchored quotes</span>
            </div>
            <div className="hidden sm:flex items-center gap-4 ml-2 text-sm text-muted-foreground">
              <Link href="/corpus/transcript" className="hover:text-foreground hover:underline transition-colors">
                Browse transcript
              </Link>
              <span aria-hidden="true">·</span>
              <Link href="/corpus/quote-bank" className="hover:text-foreground hover:underline transition-colors">
                Browse quote bank
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Search & Filters */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search operators, triggers, failure modes, quotes..."
            className="w-full pl-12 pr-24 sm:pr-28 py-3.5 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-base shadow-sm"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />

          {/* Keyboard hint or clear button */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery("")}
                className="p-2 text-muted-foreground hover:text-foreground active:scale-90 transition-all touch-manipulation rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                aria-label="Clear search"
              >
                <XIcon className="size-4" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/60 border border-border/50 text-[11px] text-muted-foreground font-mono">
                <span className="text-xs">⌘</span>K
              </kbd>
            )}
          </div>
        </div>

        {/* Category pills with scroll fade hint */}
        <div className="relative -mx-4 sm:mx-0">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide px-4 sm:px-0">
          <CategoryPill
            category={null}
            isActive={selectedCategory === null}
            onClick={() => setSelectedCategory(null)}
            count={categoryCounts.all}
          />
          {(Object.entries(OPERATOR_CATEGORIES) as [CategoryKey, typeof OPERATOR_CATEGORIES[CategoryKey]][]).map(([key, category]) => (
            <CategoryPill
              key={key}
              category={category}
              isActive={selectedCategory === key}
              onClick={() => setSelectedCategory(key)}
              count={categoryCounts[key]}
            />
          ))}
          </div>
          {/* Fade hint on mobile */}
          <div className="absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none sm:hidden" />
        </div>

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          {searchQuery || selectedCategory ? (
            <>
              Showing <span className="font-medium text-foreground">{filteredOperators.length}</span> of{" "}
              <span className="font-medium text-foreground">{operators.length}</span> operators
            </>
          ) : (
            <>
              <span className="font-medium text-foreground">{operators.length}</span> operators available
            </>
          )}
        </div>
      </div>

      {/* Operator Grid */}
      {filteredOperators.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <div className="size-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
            <SearchIcon className="size-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No operators found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Try adjusting your search or filters.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory(null);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {filteredOperators.map((operator) => (
            <OperatorCard
              key={operator.canonicalTag}
              operator={operator}
              onClick={() => handleOperatorClick(operator)}
            />
          ))}
        </div>
      )}

      {/* Detail Sheet */}
      {selectedOperator && (
        <OperatorDetailSheet
          operator={selectedOperator}
          onClose={handleCloseSheet}
        />
      )}
    </div>
  );
}
