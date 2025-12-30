"use client";

import Link from "next/link";
import { useState, useMemo, useCallback, type ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AnimatedElement, HeroBackground } from "@/components/ui/animated-element";

// ============================================================================
// TYPES
// ============================================================================

interface CorpusDoc {
  id: string;
  title: string;
  description: string;
  filename: string;
}

type CategoryKey = "primary" | "distillations" | "prompts";

// ============================================================================
// CONSTANTS
// ============================================================================

const CORPUS_DOCS: CorpusDoc[] = [
  {
    id: "transcript",
    title: "Complete Brenner Transcript",
    description: "236 interview segments from Sydney Brenner's Web of Stories collection",
    filename: "complete_brenner_transcript.md",
  },
  {
    id: "quote-bank",
    title: "Quote Bank",
    description: "Curated verbatim quotes indexed by operator and motif",
    filename: "quote_bank_restored_primitives.md",
  },
  {
    id: "distillation-opus-45",
    title: "Opus 4.5 Distillation",
    description: "Two Axioms framework with operator algebra and failure modes",
    filename: "final_distillation_of_brenner_method_by_opus45.md",
  },
  {
    id: "distillation-gpt-52",
    title: "GPT-5.2 Distillation",
    description: "Objective function, scoring rubrics, and 12 guardrails",
    filename: "final_distillation_of_brenner_method_by_gpt_52_extra_high_reasoning.md",
  },
  {
    id: "distillation-gemini-3",
    title: "Gemini 3 Distillation",
    description: "The Brenner Kernel: instruction set and debugging protocols",
    filename: "final_distillation_of_brenner_method_by_gemini3.md",
  },
  {
    id: "metaprompt",
    title: "Metaprompt Template",
    description: "Structured prompts for applying the Brenner method",
    filename: "metaprompt_by_gpt_52.md",
  },
  {
    id: "initial-metaprompt",
    title: "Initial Metaprompt",
    description: "The original seed prompt that started the project",
    filename: "initial_metaprompt.md",
  },
];

// ============================================================================
// ICONS
// ============================================================================

const BookOpenIcon = ({ className = "size-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
  </svg>
);

const DocumentIcon = ({ className = "size-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const SparklesIcon = ({ className = "size-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
  </svg>
);

const SearchIcon = ({ className = "size-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

const ArrowRightIcon = ({ className = "size-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

const ClockIcon = ({ className = "size-3.5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChevronDownIcon = ({ className = "size-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const XMarkIcon = ({ className = "size-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// ============================================================================
// CATEGORY CONFIG
// ============================================================================

const categories: Record<CategoryKey, { title: string; description: string; icon: ReactNode; color: string }> = {
  primary: {
    title: "Primary Sources",
    description: "The original transcript and curated quotes",
    icon: <BookOpenIcon className="size-4 sm:size-5" />,
    color: "from-blue-500/20 to-cyan-500/20 dark:from-blue-500/10 dark:to-cyan-500/10",
  },
  distillations: {
    title: "Model Distillations",
    description: "Three frontier model analyses of Brenner's methodology",
    icon: <SparklesIcon className="size-4 sm:size-5" />,
    color: "from-purple-500/20 to-pink-500/20 dark:from-purple-500/10 dark:to-pink-500/10",
  },
  prompts: {
    title: "Metaprompts",
    description: "Structured prompts for applying the Brenner method",
    icon: <DocumentIcon className="size-4 sm:size-5" />,
    color: "from-amber-500/20 to-orange-500/20 dark:from-amber-500/10 dark:to-orange-500/10",
  },
};

// ============================================================================
// HELPERS
// ============================================================================

function getCategory(id: string): CategoryKey {
  if (id.startsWith("distillation")) return "distillations";
  if (id === "transcript" || id === "quote-bank") return "primary";
  return "prompts";
}

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

function getModelBadge(id: string): { label: string; colorClass: string } | null {
  if (id === "distillation-opus-45") return { label: "Claude Opus", colorClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400" };
  if (id === "distillation-gpt-52") return { label: "GPT-5.2", colorClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" };
  if (id === "distillation-gemini-3") return { label: "Gemini 3", colorClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400" };
  return null;
}

// ============================================================================
// DOCUMENT CARD COMPONENT
// ============================================================================

interface DocCardProps {
  doc: CorpusDoc;
  index: number;
}

function DocCard({ doc, index }: DocCardProps) {
  const badge = getModelBadge(doc.id);
  const readTime = getReadTime(doc.id);

  return (
    <AnimatedElement
      animation="reveal-up"
      delay={index * 60}
      threshold={0.05}
      rootMargin="0px 0px -20px 0px"
    >
      <Link
        href={`/corpus/${doc.id}`}
        className="group block touch-manipulation"
      >
        <Card hover className="h-full relative overflow-hidden active:scale-[0.98] transition-transform">
          {/* Hover gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:via-transparent group-hover:to-primary/3 transition-all duration-500 pointer-events-none" />

          <CardHeader className="p-4 sm:p-5 lg:p-6 relative">
            <div className="flex items-start justify-between gap-3 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2 flex-1 min-w-0">
                {/* Title with hover animation */}
                <CardTitle className="text-base sm:text-lg lg:text-xl group-hover:text-primary transition-colors duration-200 line-clamp-2">
                  {doc.title}
                </CardTitle>

                {/* Description */}
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                  {doc.description}
                </p>

                {/* Meta info row */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1">
                  {/* Model badge */}
                  {badge && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${badge.colorClass}`}>
                      {badge.label}
                    </span>
                  )}

                  {/* Read time */}
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                    <ClockIcon className="size-3" />
                    {readTime}
                  </span>

                  {/* Filename - hidden on mobile */}
                  <CardDescription className="hidden lg:block font-mono text-[10px] truncate max-w-[180px]">
                    {doc.filename}
                  </CardDescription>
                </div>
              </div>

              {/* Arrow indicator */}
              <div className="flex items-center justify-center size-8 sm:size-10 rounded-xl bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all duration-200 shrink-0 group-hover:translate-x-0.5">
                <ArrowRightIcon className="size-4 sm:size-5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </CardHeader>
        </Card>
      </Link>
    </AnimatedElement>
  );
}

// ============================================================================
// CATEGORY SECTION COMPONENT
// ============================================================================

interface CategorySectionProps {
  categoryKey: CategoryKey;
  docs: CorpusDoc[];
  isExpanded: boolean;
  onToggle: () => void;
  sectionIndex: number;
}

function CategorySection({ categoryKey, docs, isExpanded, onToggle, sectionIndex }: CategorySectionProps) {
  const category = categories[categoryKey];

  if (docs.length === 0) return null;

  return (
    <AnimatedElement
      animation="reveal-up"
      delay={sectionIndex * 100}
      className="space-y-3 sm:space-y-4"
    >
      {/* Category Header - Clickable on mobile */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 text-left group lg:cursor-default"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={`flex items-center justify-center size-8 sm:size-10 rounded-xl bg-gradient-to-br ${category.color} text-foreground transition-transform group-hover:scale-105 lg:group-hover:scale-100`}>
            {category.icon}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-foreground">
              {category.title}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
              {category.description}
            </p>
          </div>
        </div>

        {/* Mobile toggle indicator */}
        <div className={`lg:hidden flex items-center justify-center size-8 rounded-full bg-muted/50 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
          <ChevronDownIcon className="size-4 text-muted-foreground" />
        </div>
      </button>

      {/* Cards Grid - Collapsible on mobile */}
      <div className={`transition-all duration-300 ease-out lg:block ${isExpanded ? "block" : "hidden lg:block"}`}>
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {docs.map((doc, index) => (
            <DocCard key={doc.id} doc={doc} index={index} />
          ))}
        </div>
      </div>
    </AnimatedElement>
  );
}

// ============================================================================
// SEARCH BAR COMPONENT
// ============================================================================

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  resultCount: number;
}

function SearchBar({ value, onChange, resultCount }: SearchBarProps) {
  return (
    <div className="relative group">
      {/* Search input with glassmorphism */}
      <div className="relative flex items-center">
        <div className="absolute left-4 text-muted-foreground transition-colors group-focus-within:text-primary">
          <SearchIcon className="size-4 sm:size-5" />
        </div>

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Filter by title..."
          className="w-full h-11 sm:h-12 pl-11 sm:pl-12 pr-10 sm:pr-12 rounded-xl border border-border/50 bg-background/80 backdrop-blur-sm text-sm sm:text-base placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all duration-200"
        />

        {/* Clear button */}
        {value && (
          <button
            onClick={() => onChange("")}
            className="absolute right-3 sm:right-4 p-1 rounded-full hover:bg-muted transition-colors"
          >
            <XMarkIcon className="size-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Result count or search hint */}
      <div className="absolute -bottom-6 left-4 text-xs text-muted-foreground animate-fade-in">
        {value ? (
          <span>{resultCount} {resultCount === 1 ? "result" : "results"} found</span>
        ) : (
          <span>Press <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">⌘K</kbd> for full-text search</span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// CATEGORY PILLS COMPONENT
// ============================================================================

interface CategoryPillsProps {
  activeCategory: CategoryKey | "all";
  onChange: (category: CategoryKey | "all") => void;
  counts: Record<CategoryKey | "all", number>;
}

function CategoryPills({ activeCategory, onChange, counts }: CategoryPillsProps) {
  const allCategories: (CategoryKey | "all")[] = ["all", "primary", "distillations", "prompts"];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
      {allCategories.map((cat) => {
        const isActive = activeCategory === cat;
        const label = cat === "all" ? "All" : categories[cat].title;
        const count = counts[cat];

        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 ${
              isActive
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <span>{label}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs ${
              isActive ? "bg-primary-foreground/20" : "bg-background/50"
            }`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CorpusIndexPage() {
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryKey | "all">("all");
  const [expandedSections, setExpandedSections] = useState<Record<CategoryKey, boolean>>({
    primary: true,
    distillations: true,
    prompts: true,
  });

  // Filter docs based on search and category
  const filteredDocs = useMemo(() => {
    let docs = CORPUS_DOCS;

    // Category filter
    if (activeCategory !== "all") {
      docs = docs.filter((doc) => getCategory(doc.id) === activeCategory);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      docs = docs.filter((doc) =>
        doc.title.toLowerCase().includes(query) ||
        doc.description.toLowerCase().includes(query) ||
        doc.filename.toLowerCase().includes(query)
      );
    }

    return docs;
  }, [searchQuery, activeCategory]);

  // Group filtered docs by category
  const groupedDocs = useMemo(() => {
    return filteredDocs.reduce(
      (acc, doc) => {
        const cat = getCategory(doc.id);
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(doc);
        return acc;
      },
      {} as Record<CategoryKey, CorpusDoc[]>
    );
  }, [filteredDocs]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryKey | "all", number> = {
      all: CORPUS_DOCS.length,
      primary: 0,
      distillations: 0,
      prompts: 0,
    };

    CORPUS_DOCS.forEach((doc) => {
      const cat = getCategory(doc.id);
      counts[cat]++;
    });

    return counts;
  }, []);

  // Toggle section expansion
  const toggleSection = useCallback((key: CategoryKey) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8 lg:space-y-10">
      {/* Hero Section */}
      <HeroBackground showOrbs showGrid className="rounded-2xl sm:rounded-3xl -mx-4 px-4 sm:mx-0 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <AnimatedElement animation="reveal-up" className="space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex items-start sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center justify-center size-12 sm:size-14 lg:size-16 rounded-2xl bg-primary/10 text-primary shadow-lg shadow-primary/5">
              <BookOpenIcon className="size-6 sm:size-7 lg:size-8" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                Corpus
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mt-0.5">
                The complete Brenner document collection
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="max-w-xl space-y-4">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              resultCount={filteredDocs.length}
            />

            {/* Category Pills */}
            <div className="pt-2">
              <CategoryPills
                activeCategory={activeCategory}
                onChange={setActiveCategory}
                counts={categoryCounts}
              />
            </div>
          </div>
        </AnimatedElement>
      </HeroBackground>

      {/* Document Categories */}
      <div className="space-y-8 sm:space-y-10 lg:space-y-12">
        {(Object.keys(categories) as CategoryKey[]).map((categoryKey, index) => (
          <CategorySection
            key={categoryKey}
            categoryKey={categoryKey}
            docs={groupedDocs[categoryKey] || []}
            isExpanded={expandedSections[categoryKey]}
            onToggle={() => toggleSection(categoryKey)}
            sectionIndex={index}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredDocs.length === 0 && (
        <AnimatedElement animation="fade-in-scale" className="text-center py-12 sm:py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="size-16 sm:size-20 rounded-full bg-muted/50 flex items-center justify-center">
              <SearchIcon className="size-8 sm:size-10 text-muted-foreground/50" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg sm:text-xl font-semibold">No documents found</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Try adjusting your search or filter criteria
              </p>
            </div>
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("all");
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Clear filters
            </button>
          </div>
        </AnimatedElement>
      )}

      {/* Reading Tips - Only show when not searching */}
      {!searchQuery && activeCategory === "all" && (
        <AnimatedElement animation="reveal-up" delay={300}>
          <section className="rounded-2xl sm:rounded-3xl border border-border/50 bg-gradient-to-br from-muted/30 via-muted/20 to-muted/30 p-5 sm:p-6 lg:p-8 space-y-3 sm:space-y-4">
            <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <span className="size-6 sm:size-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <SparklesIcon className="size-3.5 sm:size-4 text-primary" />
              </span>
              Reading Tips
            </h3>
            <ul className="text-sm sm:text-base text-muted-foreground space-y-2.5 sm:space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 size-5 sm:size-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                  1
                </span>
                <span>
                  Start with a <strong className="text-foreground">Distillation</strong> for a structured overview of Brenner&apos;s methodology.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 size-5 sm:size-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                  2
                </span>
                <span>
                  Use the <strong className="text-foreground">Quote Bank</strong> to find specific Brenner quotes on topics of interest.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 size-5 sm:size-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                  3
                </span>
                <span>
                  Dive into the full <strong className="text-foreground">Transcript</strong> for context and nuance around specific ideas.
                </span>
              </li>
            </ul>
          </section>
        </AnimatedElement>
      )}
    </div>
  );
}
