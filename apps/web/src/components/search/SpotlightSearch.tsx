"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { searchAction } from "@/lib/globalSearchAction";
import {
  type GlobalSearchResult,
  type GlobalSearchHit,
  type SearchCategory,
  getCategoryInfo,
} from "@/lib/globalSearchTypes";
import {
  Search,
  X,
  Loader2,
  FileText,
  Quote,
  Sparkles,
  Terminal,
  ScrollText,
  ArrowRight,
  Command,
  CornerDownLeft,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface SpotlightSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

// ============================================================================
// Main Component
// ============================================================================

export function SpotlightSearch({ isOpen, onClose }: SpotlightSearchProps) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const resultsRef = React.useRef<HTMLDivElement>(null);

  const [query, setQuery] = React.useState("");
  const [debouncedQuery, isPending] = useDebounce(query, 150);
  const [results, setResults] = React.useState<GlobalSearchResult | null>(null);
  const [isSearching, setIsSearching] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [activeCategory, setActiveCategory] = React.useState<SearchCategory>("all");

  // Reset state when opening
  React.useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults(null);
      setSelectedIndex(0);
      setActiveCategory("all");
      // Focus input after animation
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Perform search when debounced query changes
  React.useEffect(() => {
    if (!debouncedQuery) {
      setResults(null);
      setSelectedIndex(0);
      return;
    }

    const search = async () => {
      setIsSearching(true);
      try {
        const result = await searchAction(debouncedQuery, {
          limit: 25,
          category: activeCategory,
        });
        setResults(result);
        setSelectedIndex(0);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    };

    search();
  }, [debouncedQuery, activeCategory]);

  // Keyboard navigation
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (!results?.hits.length) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.hits.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : results.hits.length - 1
        );
      } else if (e.key === "Enter" && results.hits[selectedIndex]) {
        e.preventDefault();
        navigateToResult(results.hits[selectedIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  // Scroll selected item into view
  React.useEffect(() => {
    if (!resultsRef.current) return;
    const selectedEl = resultsRef.current.querySelector(
      `[data-index="${selectedIndex}"]`
    );
    selectedEl?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const navigateToResult = (hit: GlobalSearchHit) => {
    router.push(hit.url);
    onClose();
  };

  const isLoading = isPending || isSearching;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Search Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] sm:pt-[15vh] px-4 pointer-events-none">
        <div
          className="w-full max-w-2xl pointer-events-auto animate-modal-in"
          role="dialog"
          aria-modal="true"
          aria-label="Search"
        >
          {/* Search Container */}
          <div className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-2xl shadow-primary/5">
            {/* Decorative gradient border */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 via-transparent to-amber-500/10 opacity-50 pointer-events-none" />
            <div className="absolute inset-[1px] rounded-2xl bg-card pointer-events-none" />

            {/* Search Input */}
            <div className="relative">
              <div className="relative flex items-center">
                <div className="absolute left-4 sm:left-5 text-muted-foreground">
                  {isLoading ? (
                    <Loader2 className="size-5 animate-spin text-primary" />
                  ) : (
                    <Search className="size-5" />
                  )}
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search transcript, quotes, distillations..."
                  className={cn(
                    "w-full bg-transparent py-4 sm:py-5 pl-12 sm:pl-14 pr-12 sm:pr-14",
                    "text-base sm:text-lg text-foreground placeholder:text-muted-foreground/60",
                    "border-b border-border/50",
                    "focus:outline-none"
                  )}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="absolute right-4 sm:right-5 p-1 text-muted-foreground hover:text-foreground transition-colors rounded-md"
                    aria-label="Clear search"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              {/* Category Filters */}
              {query && (
                <div className="relative px-4 sm:px-5 py-2 border-b border-border/30 overflow-x-auto scrollbar-hide">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <CategoryPill
                      category="all"
                      isActive={activeCategory === "all"}
                      onClick={() => setActiveCategory("all")}
                      count={results?.totalMatches}
                    />
                    <CategoryPill
                      category="transcript"
                      isActive={activeCategory === "transcript"}
                      onClick={() => setActiveCategory("transcript")}
                      count={results?.categories.transcript}
                    />
                    <CategoryPill
                      category="quote-bank"
                      isActive={activeCategory === "quote-bank"}
                      onClick={() => setActiveCategory("quote-bank")}
                      count={results?.categories["quote-bank"]}
                    />
                    <CategoryPill
                      category="distillation"
                      isActive={activeCategory === "distillation"}
                      onClick={() => setActiveCategory("distillation")}
                      count={results?.categories.distillation}
                    />
                    <CategoryPill
                      category="metaprompt"
                      isActive={activeCategory === "metaprompt"}
                      onClick={() => setActiveCategory("metaprompt")}
                      count={results?.categories.metaprompt}
                    />
                    <CategoryPill
                      category="raw-response"
                      isActive={activeCategory === "raw-response"}
                      onClick={() => setActiveCategory("raw-response")}
                      count={results?.categories["raw-response"]}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Results */}
            <div
              ref={resultsRef}
              className="relative max-h-[50vh] sm:max-h-[60vh] overflow-y-auto overscroll-contain"
            >
              {/* Loading Skeletons */}
              {isLoading && !results && query && (
                <div className="p-3 sm:p-4 space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <SearchResultSkeleton key={i} delay={i * 50} />
                  ))}
                </div>
              )}

              {/* Results List */}
              {results && results.hits.length > 0 && (
                <div className="p-2 sm:p-3">
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {results.totalMatches} result{results.totalMatches !== 1 ? "s" : ""}{" "}
                    <span className="opacity-60">({results.searchTimeMs}ms)</span>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {results.hits.map((hit, index) => (
                      <SearchResultItem
                        key={hit.id}
                        hit={hit}
                        query={debouncedQuery}
                        isSelected={selectedIndex === index}
                        index={index}
                        onClick={() => navigateToResult(hit)}
                        onMouseEnter={() => setSelectedIndex(index)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* No Results */}
              {results && results.hits.length === 0 && !isLoading && (
                <EmptyState query={query} />
              )}

              {/* Initial State */}
              {!query && (
                <InitialState />
              )}
            </div>

            {/* Footer */}
            {query && (
              <div className="relative flex items-center justify-between px-4 sm:px-5 py-2.5 sm:py-3 border-t border-border/50 bg-muted/30">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <kbd className="kbd">↑</kbd>
                    <kbd className="kbd">↓</kbd>
                    <span className="ml-1 hidden sm:inline">Navigate</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="kbd"><CornerDownLeft className="size-3" /></kbd>
                    <span className="ml-1 hidden sm:inline">Open</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="kbd">Esc</kbd>
                    <span className="ml-1 hidden sm:inline">Close</span>
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Command className="size-3" />
                  <span>K</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function CategoryPill({
  category,
  isActive,
  onClick,
  count,
}: {
  category: SearchCategory;
  isActive: boolean;
  onClick: () => void;
  count?: number;
}) {
  const label = category === "all" ? "All" : getCategoryInfo(category as Exclude<SearchCategory, "all">).label;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-shrink-0 flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all",
        isActive
          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={cn(
          "text-[10px] sm:text-xs",
          isActive ? "opacity-80" : "opacity-60"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

function SearchResultItem({
  hit,
  query,
  isSelected,
  index,
  onClick,
  onMouseEnter,
}: {
  hit: GlobalSearchHit;
  query: string;
  isSelected: boolean;
  index: number;
  onClick: () => void;
  onMouseEnter: () => void;
}) {
  const categoryInfo = getCategoryInfo(hit.category);

  return (
    <button
      data-index={index}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        "w-full flex items-start gap-3 px-3 py-2.5 sm:py-3 rounded-xl text-left transition-all",
        isSelected
          ? "bg-primary/10 border border-primary/20"
          : "hover:bg-muted/50 border border-transparent"
      )}
      style={{
        animationDelay: `${index * 30}ms`,
      }}
    >
      {/* Icon */}
      <div className={cn(
        "flex-shrink-0 flex items-center justify-center size-9 sm:size-10 rounded-lg",
        getCategoryBgClass(hit.category, hit.model)
      )}>
        <CategoryIcon category={hit.category} className={cn(
          "size-4 sm:size-5",
          getCategoryTextClass(hit.category, hit.model)
        )} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-medium text-sm sm:text-base text-foreground truncate">
            {hit.title}
          </span>
          {hit.anchor && (
            <span className="flex-shrink-0 text-xs font-mono text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">
              {hit.anchor}
            </span>
          )}
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          <HighlightedText text={hit.snippet} query={query} />
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className={cn(
            "inline-flex items-center gap-1 text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded",
            getCategoryBadgeClass(hit.category, hit.model)
          )}>
            {categoryInfo.label}
          </span>
          {hit.model && (
            <ModelBadge model={hit.model} />
          )}
        </div>
      </div>

      {/* Arrow */}
      <div className={cn(
        "flex-shrink-0 self-center transition-transform",
        isSelected ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"
      )}>
        <ArrowRight className="size-4 text-primary" />
      </div>
    </button>
  );
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;

  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  const regex = new RegExp(`(${terms.map(escapeRegex).join("|")})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) => {
        const isMatch = terms.some((t) => part.toLowerCase() === t);
        return isMatch ? (
          <mark
            key={i}
            className="bg-transparent text-primary font-medium border-b border-primary/50"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </>
  );
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ModelBadge({ model }: { model: "gpt" | "opus" | "gemini" }) {
  const config = {
    gpt: { label: "GPT", class: "bg-gpt/10 text-gpt border-gpt/20" },
    opus: { label: "Opus", class: "bg-opus/10 text-opus border-opus/20" },
    gemini: { label: "Gemini", class: "bg-gemini/10 text-gemini border-gemini/20" },
  };

  return (
    <span className={cn(
      "inline-flex items-center text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded border",
      config[model].class
    )}>
      {config[model].label}
    </span>
  );
}

function SearchResultSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="flex items-start gap-3 px-3 py-3 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="size-10 rounded-lg animate-shimmer" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/2 rounded animate-shimmer" />
        <div className="h-3 w-full rounded animate-shimmer" />
        <div className="h-3 w-3/4 rounded animate-shimmer" />
      </div>
    </div>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="px-6 py-12 sm:py-16 text-center animate-fade-in">
      <div className="inline-flex items-center justify-center size-14 sm:size-16 rounded-2xl bg-muted/50 mb-4">
        <Search className="size-6 sm:size-7 text-muted-foreground" />
      </div>
      <h3 className="text-base sm:text-lg font-medium text-foreground mb-1">
        No results found
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        No matches for &ldquo;<span className="text-foreground font-medium">{query}</span>&rdquo;.
        Try different keywords or check your spelling.
      </p>
    </div>
  );
}

function InitialState() {
  return (
    <div className="px-6 py-10 sm:py-12 text-center">
      <div className="inline-flex items-center justify-center size-12 sm:size-14 rounded-2xl bg-primary/10 mb-3 sm:mb-4">
        <ScrollText className="size-5 sm:size-6 text-primary" />
      </div>
      <h3 className="text-sm sm:text-base font-medium text-foreground mb-1">
        Search the Brenner Corpus
      </h3>
      <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mb-4 sm:mb-6">
        Search across 236 transcript sections, quotes, distillations, and model responses.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <SuggestionChip text="C. elegans" />
        <SuggestionChip text="molecular biology" />
        <SuggestionChip text="Sydney Brenner" />
        <SuggestionChip text="genetics" />
      </div>
    </div>
  );
}

function SuggestionChip({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/50 text-xs text-muted-foreground">
      <Search className="size-3" />
      {text}
    </span>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function CategoryIcon({ category, className }: { category: string; className?: string }) {
  switch (category) {
    case "transcript":
      return <ScrollText className={className} />;
    case "quote-bank":
      return <Quote className={className} />;
    case "distillation":
      return <Sparkles className={className} />;
    case "metaprompt":
      return <Terminal className={className} />;
    case "raw-response":
      return <FileText className={className} />;
    default:
      return <FileText className={className} />;
  }
}

function getCategoryBgClass(category: string, model?: string): string {
  if (model) {
    switch (model) {
      case "gpt":
        return "bg-gpt/10";
      case "opus":
        return "bg-opus/10";
      case "gemini":
        return "bg-gemini/10";
    }
  }

  switch (category) {
    case "transcript":
      return "bg-primary/10";
    case "quote-bank":
      return "bg-amber-500/10";
    case "distillation":
      return "bg-purple-500/10";
    case "metaprompt":
      return "bg-emerald-500/10";
    case "raw-response":
      return "bg-slate-500/10";
    default:
      return "bg-muted";
  }
}

function getCategoryTextClass(category: string, model?: string): string {
  if (model) {
    switch (model) {
      case "gpt":
        return "text-gpt";
      case "opus":
        return "text-opus";
      case "gemini":
        return "text-gemini";
    }
  }

  switch (category) {
    case "transcript":
      return "text-primary";
    case "quote-bank":
      return "text-amber-500";
    case "distillation":
      return "text-purple-500";
    case "metaprompt":
      return "text-emerald-500";
    case "raw-response":
      return "text-slate-500";
    default:
      return "text-muted-foreground";
  }
}

function getCategoryBadgeClass(category: string, model?: string): string {
  if (model) {
    switch (model) {
      case "gpt":
        return "bg-gpt/10 text-gpt";
      case "opus":
        return "bg-opus/10 text-opus";
      case "gemini":
        return "bg-gemini/10 text-gemini";
    }
  }

  switch (category) {
    case "transcript":
      return "bg-primary/10 text-primary";
    case "quote-bank":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "distillation":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
    case "metaprompt":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "raw-response":
      return "bg-slate-500/10 text-slate-600 dark:text-slate-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

// ============================================================================
// Provider Component
// ============================================================================

interface SearchContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const SearchContext = React.createContext<SearchContextType | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);

  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);
  const toggle = React.useCallback(() => setIsOpen((prev) => !prev), []);

  // Global keyboard shortcut
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggle();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggle]);

  return (
    <SearchContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
      <SpotlightSearch isOpen={isOpen} onClose={close} />
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = React.useContext(SearchContext);
  if (!context) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
}

// ============================================================================
// Search Trigger Button
// ============================================================================

export function SearchTrigger({ className }: { className?: string }) {
  const { open } = useSearch();

  return (
    <button
      onClick={open}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg",
        "border border-border bg-muted/50 hover:bg-muted transition-colors",
        "text-sm text-muted-foreground hover:text-foreground",
        className
      )}
    >
      <Search className="size-4" />
      <span className="hidden sm:inline">Search...</span>
      <div className="hidden sm:flex items-center gap-0.5 ml-2">
        <kbd className="kbd">
          <Command className="size-3" />
        </kbd>
        <kbd className="kbd">K</kbd>
      </div>
    </button>
  );
}
