"use client";

import { useState, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ParsedQuoteBank, Quote } from "@/lib/quotebank-parser";
import { filterQuotesByTag, searchQuotes } from "@/lib/quotebank-parser";
import { ReferenceCopyButton, CopyButton } from "@/components/ui/copy-button";
import { useDebounce } from "@/hooks/useDebounce";

// ============================================================================
// HERO
// ============================================================================

interface QuoteBankHeroProps {
  title: string;
  description: string;
  quoteCount: number;
  tagCount: number;
}

function QuoteBankHero({ title, description, quoteCount, tagCount }: QuoteBankHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 mb-8 sm:mb-12">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-48 sm:w-80 h-48 sm:h-80 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-40 sm:w-64 h-40 sm:h-64 bg-primary/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

      {/* Quote decoration */}
      <div className="absolute top-4 right-4 sm:top-8 sm:right-8 text-[100px] sm:text-[180px] font-serif text-amber-500/10 leading-none select-none hidden sm:block">
        &ldquo;
      </div>

      <div className="relative px-5 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-16">
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs sm:text-sm font-medium mb-4 sm:mb-6">
          <QuoteIcon className="size-3.5 sm:size-4" />
          Reference Collection
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-3 sm:mb-4">
          {title}
        </h1>

        {/* Description */}
        <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8 max-w-2xl">
          {description}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-card/80 backdrop-blur-sm border border-border/50 text-sm">
            <span className="text-xl sm:text-2xl font-bold text-foreground">{quoteCount}</span>
            <span className="text-muted-foreground text-xs sm:text-sm">quotes</span>
          </div>
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-card/80 backdrop-blur-sm border border-border/50 text-sm">
            <span className="text-xl sm:text-2xl font-bold text-foreground">{tagCount}</span>
            <span className="text-muted-foreground text-xs sm:text-sm">categories</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAG CLOUD
// ============================================================================

interface TagCloudProps {
  tags: string[];
  selectedTag: string | null;
  onTagSelect: (tag: string | null) => void;
  quoteCounts: Record<string, number>;
}

function TagCloud({ tags, selectedTag, onTagSelect, quoteCounts }: TagCloudProps) {
  return (
    <div className="mb-8">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
        Filter by Category
      </h3>
      {/* Horizontal scroll on mobile, wrap on desktop */}
      <div className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 sm:flex-wrap scrollbar-hide snap-x snap-mandatory">
          <button
            onClick={() => onTagSelect(null)}
            className={`
              flex-shrink-0 snap-start px-4 py-2 sm:px-3 sm:py-1.5 rounded-lg text-sm font-medium transition-all touch-manipulation
              ${
                selectedTag === null
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 active:scale-95"
              }
            `}
          >
            All
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => onTagSelect(tag === selectedTag ? null : tag)}
              className={`
                group flex-shrink-0 snap-start px-4 py-2 sm:px-3 sm:py-1.5 rounded-lg text-sm font-medium transition-all touch-manipulation
                ${
                  selectedTag === tag
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 active:scale-95"
                }
              `}
            >
              {tag.replace(/-/g, " ")}
              <span className={`
                ml-1.5 text-xs
                ${selectedTag === tag ? "opacity-80" : "opacity-50 group-hover:opacity-70"}
              `}>
                {quoteCounts[tag] || 0}
              </span>
            </button>
          ))}
        </div>
        {/* Fade hint for horizontal scroll on mobile */}
        <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none sm:hidden" />
      </div>
    </div>
  );
}

// ============================================================================
// SEARCH
// ============================================================================

interface SearchProps {
  value: string;
  onChange: (value: string) => void;
}

function Search({ value, onChange }: SearchProps) {
  return (
    <div className="relative mb-6 sm:mb-8">
      <SearchIcon className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 size-4 sm:size-5 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search quotes..."
        className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-2.5 sm:py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-base"
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground active:scale-90 transition-all touch-manipulation rounded-lg"
          aria-label="Clear search"
        >
          <XIcon />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// QUOTE CARD
// ============================================================================

interface QuoteCardProps {
  quote: Quote;
}

function QuoteCard({ quote }: QuoteCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <article
      className={`
        group relative rounded-2xl border border-border bg-card overflow-hidden
        hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5
        active:scale-[0.995] transition-all duration-300
      `}
    >
      {/* Reference badge - clickable to copy */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
        <ReferenceCopyButton
          reference={quote.sectionId}
          quoteText={quote.quote}
          source="Sydney Brenner"
        />
      </div>

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Title */}
        <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-foreground mb-3 sm:mb-4 pr-12 sm:pr-16 group-hover:text-primary transition-colors leading-snug">
          {quote.title}
        </h3>

        {/* Quote text */}
        <div className="relative group/quote">
          <div className="absolute -left-1 -top-1 sm:-left-2 sm:-top-2 text-3xl sm:text-4xl text-primary/20 font-serif select-none">
            &ldquo;
          </div>
          <blockquote className="pl-3 sm:pl-4 text-[15px] sm:text-base lg:text-lg leading-relaxed text-foreground/85 italic font-serif">
            {isExpanded || quote.quote.length < 300
              ? quote.quote
              : `${quote.quote.slice(0, 300)}...`}
          </blockquote>
          {/* Copy button - appears on hover */}
          <div className="absolute -right-2 top-0 opacity-0 group-hover/quote:opacity-100 transition-opacity">
            <CopyButton
              text={quote.quote}
              attribution={`— Sydney Brenner, ${quote.sectionId}`}
              variant="ghost"
              size="sm"
              showPreview={true}
            />
          </div>
          {quote.quote.length >= 300 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-3 px-3 py-1.5 -ml-1 text-sm text-primary hover:underline active:scale-95 transition-transform touch-manipulation rounded-lg"
            >
              {isExpanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>

        {/* Why it matters */}
        {quote.context && (
          <div className="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-border/50">
            <div className="flex items-start gap-2.5 sm:gap-3">
              <div className="flex-shrink-0 size-5 sm:size-6 rounded-full bg-amber-500/10 flex items-center justify-center">
                <LightbulbIcon className="size-3 sm:size-3.5 text-amber-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Why it matters
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {quote.context}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tags - horizontal scroll on mobile */}
        {quote.tags.length > 0 && (
          <div className="mt-4 -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto sm:flex-wrap scrollbar-hide">
              {quote.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex-shrink-0 px-2 py-0.5 text-xs rounded-md bg-muted text-muted-foreground whitespace-nowrap"
                >
                  {tag.replace(/-/g, " ")}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

// ============================================================================
// MAIN VIEWER
// ============================================================================

interface QuoteBankViewerProps {
  data: ParsedQuoteBank;
}

export function QuoteBankViewer({ data }: QuoteBankViewerProps) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Debounce search query for better performance
  const [debouncedQuery] = useDebounce(searchQuery, 200);

  // Calculate quote counts per tag
  const quoteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    data.quotes.forEach((q) => {
      q.tags.forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    return counts;
  }, [data.quotes]);

  // Filter and search (using debounced query)
  const filteredQuotes = useMemo(() => {
    let result = data.quotes;
    if (selectedTag) {
      result = filterQuotesByTag(result, selectedTag);
    }
    if (debouncedQuery.trim()) {
      result = searchQuotes(result, debouncedQuery);
    }
    return result;
  }, [data.quotes, selectedTag, debouncedQuery]);

  // Virtualizer for efficient rendering of quote cards
  const virtualizer = useVirtualizer({
    count: filteredQuotes.length,
    getScrollElement: () => scrollContainerRef.current,
    // Estimate average quote card height (will be measured dynamically)
    estimateSize: () => 280,
    // Render extra items above/below viewport for smoother scrolling
    overscan: 3,
  });

  // Get virtual items
  const virtualItems = virtualizer.getVirtualItems();

  return (
    <>
      <QuoteBankHero
        title={data.title}
        description={data.description}
        quoteCount={data.quotes.length}
        tagCount={data.allTags.length}
      />

      <div className="max-w-4xl mx-auto">
        <Search value={searchQuery} onChange={setSearchQuery} />

        <TagCloud
          tags={data.allTags}
          selectedTag={selectedTag}
          onTagSelect={setSelectedTag}
          quoteCounts={quoteCounts}
        />

        {/* Results count */}
        <div className="mb-6 text-sm text-muted-foreground">
          Showing {filteredQuotes.length} of {data.quotes.length} quotes
          {selectedTag && (
            <span className="ml-2">
              in <span className="text-primary font-medium">{selectedTag.replace(/-/g, " ")}</span>
            </span>
          )}
        </div>

        {/* Virtualized quote list */}
        {filteredQuotes.length > 0 ? (
          <div
            ref={scrollContainerRef}
            className="h-[calc(100vh-400px)] min-h-[400px] overflow-y-auto scroll-smooth"
            style={{ contain: "strict" }}
          >
            {/* Total height spacer for scroll */}
            <div
              style={{
                height: virtualizer.getTotalSize(),
                width: "100%",
                position: "relative",
              }}
            >
              {/* Only render visible quote cards */}
              {virtualItems.map((virtualRow) => {
                const quote = filteredQuotes[virtualRow.index];
                return (
                  <div
                    key={quote.sectionId}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {/* Add spacing between cards */}
                    <div className="pb-6">
                      <QuoteCard quote={quote} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-foreground mb-2">No quotes found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}
      </div>
    </>
  );
}

// ============================================================================
// ICONS
// ============================================================================

function QuoteIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  );
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="size-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function LightbulbIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  );
}
