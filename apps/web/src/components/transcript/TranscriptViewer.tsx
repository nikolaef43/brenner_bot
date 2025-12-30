"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ParsedTranscript, TranscriptSection as TSection, TranscriptContent } from "@/lib/transcript-parser";
import { CopyButton } from "@/components/ui/copy-button";
import { useReadingPosition } from "@/hooks/useReadingPosition";
import { useSearch } from "@/lib/search";

// ============================================================================
// TRANSCRIPT HERO
// ============================================================================

interface TranscriptHeroProps {
  title: string;
  subtitle: string;
  totalSections: number;
  estimatedReadTime: string;
  wordCount: string;
}

export function TranscriptHero({
  title,
  subtitle,
  totalSections,
  estimatedReadTime,
  wordCount,
}: TranscriptHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 mb-8 sm:mb-12">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-48 sm:w-96 h-48 sm:h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-40 sm:w-64 h-40 sm:h-64 bg-amber-500/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

      <div className="relative px-5 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-16">
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs sm:text-sm font-medium mb-4 sm:mb-6">
          <span className="size-1.5 sm:size-2 rounded-full bg-primary animate-pulse" />
          Primary Source
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight text-foreground mb-3 sm:mb-4 max-w-4xl">
          {title}
        </h1>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl">
            {subtitle}
          </p>
        )}

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 lg:gap-6">
          <Stat icon={<SectionIcon />} label="Sections" value={totalSections.toString()} />
          <Stat icon={<ClockIcon />} label="Read time" value={estimatedReadTime} />
          <Stat icon={<WordIcon />} label="Words" value={wordCount} />
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-background/50 backdrop-blur-sm border border-border/50">
      <div className="text-primary [&>svg]:size-4 sm:[&>svg]:size-5">{icon}</div>
      <div>
        <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className="text-sm sm:text-lg font-semibold text-foreground">{value}</div>
      </div>
    </div>
  );
}

// ============================================================================
// TABLE OF CONTENTS
// ============================================================================

interface TableOfContentsProps {
  sections: TSection[];
  activeSection: number;
  onSectionClick: (index: number) => void;
}

export function TableOfContents({ sections, activeSection, onSectionClick }: TableOfContentsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="sticky top-24 z-30">
      {/* Mobile toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="lg:hidden w-full flex items-center justify-between px-4 py-3 rounded-xl bg-card border border-border mb-2"
      >
        <span className="font-medium">Table of Contents</span>
        <ChevronIcon className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
      </button>

      {/* TOC list */}
      <nav
        className={`
          lg:block bg-card/80 backdrop-blur-xl rounded-2xl border border-border/50 overflow-hidden
          ${isExpanded ? "block" : "hidden"}
        `}
      >
        <div className="p-4 border-b border-border/50">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
            Contents
          </h3>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-0.5">
          {sections.map((section, index) => (
            <button
              key={section.number}
              onClick={() => {
                onSectionClick(index);
                setIsExpanded(false);
              }}
              className={`
                w-full text-left px-3 py-2 rounded-lg text-sm transition-all
                ${
                  activeSection === index
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }
              `}
            >
              <span className="inline-block w-8 font-mono text-xs opacity-60">
                {section.number}.
              </span>
              <span className="line-clamp-1">{section.title}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

// ============================================================================
// TRANSCRIPT SEARCH
// ============================================================================

interface TranscriptSearchProps {
  sections: TSection[];
  onResultClick: (sectionIndex: number) => void;
  onSearchChange: (query: string) => void;
}

export function TranscriptSearch({ sections, onResultClick, onSearchChange }: TranscriptSearchProps) {
  const { query, results, isSearching, search, clearSearch, setScope } = useSearch({ limit: 20 });
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Set scope to transcript only on mount
  useEffect(() => {
    setScope("transcript");
  }, [setScope]);

  // Notify parent of search query changes for highlighting
  useEffect(() => {
    onSearchChange(query);
  }, [query, onSearchChange]);

  // Filter results to find matching sections
  const matchingSections = useMemo(() => {
    if (!results.length) return [];

    return results
      .filter(r => r.category === "transcript" && r.sectionNumber !== undefined)
      .map(r => {
        const sectionIndex = sections.findIndex(s => s.number === r.sectionNumber);
        return {
          result: r,
          sectionIndex,
          section: sectionIndex >= 0 ? sections[sectionIndex] : null,
        };
      })
      .filter(m => m.section !== null);
  }, [results, sections]);

  const handleResultClick = (sectionIndex: number) => {
    onResultClick(sectionIndex);
    setIsOpen(false);
  };

  const handleClear = () => {
    clearSearch();
    inputRef.current?.focus();
  };

  return (
    <div className="relative mb-4">
      {/* Search Input */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            search(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => query && setIsOpen(true)}
          placeholder="Search transcript..."
          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-muted/50 border border-border/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <CloseIcon className="size-4" />
          </button>
        )}
        {isSearching && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2">
            <div className="size-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && query && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-80 overflow-y-auto">
          {matchingSections.length > 0 ? (
            <>
              <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border/50 bg-muted/30">
                {matchingSections.length} result{matchingSections.length !== 1 ? "s" : ""} found
              </div>
              {matchingSections.map(({ result, sectionIndex, section }) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(sectionIndex)}
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/30 last:border-b-0"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      §{section!.number}
                    </span>
                    <span className="text-sm font-medium text-foreground line-clamp-1">
                      {section!.title}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {result.snippet || "Click to view this section"}
                  </p>
                </button>
              ))}
            </>
          ) : !isSearching ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : null}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

// ============================================================================
// READING PROGRESS
// ============================================================================

interface ReadingProgressProps {
  /** Progress percentage (0-100), when provided skips internal scroll tracking */
  progress?: number;
}

export function ReadingProgress({ progress: externalProgress }: ReadingProgressProps) {
  const [internalProgress, setInternalProgress] = useState(0);
  const progress = externalProgress ?? internalProgress;

  useEffect(() => {
    // Skip internal scroll tracking if external progress is provided
    if (externalProgress !== undefined) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setInternalProgress(Math.min(100, Math.max(0, scrollPercent)));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [externalProgress]);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-border/30">
      <div
        className="h-full bg-gradient-to-r from-primary to-amber-500 transition-all duration-150"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// ============================================================================
// SECTION COMPONENT
// ============================================================================

interface TranscriptSectionProps {
  section: TSection;
  isActive: boolean;
}

export function TranscriptSection({ section, isActive }: TranscriptSectionProps) {
  return (
    <section
      id={`section-${section.number}`}
      className={`
        scroll-mt-24 transition-all duration-500
        ${isActive ? "opacity-100" : "opacity-90"}
      `}
    >
      {/* Section Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="flex-shrink-0 flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 text-primary font-bold text-xl">
          {section.number}
        </div>
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
            {section.title}
          </h2>
          <div className="mt-1 text-sm text-muted-foreground">
            Section {section.number} of the interview
          </div>
        </div>
      </div>

      {/* Section Content */}
      <div className="space-y-6 pl-0 lg:pl-[4.5rem]">
        {section.content.map((content, i) => (
          <ContentBlock key={i} content={content} />
        ))}
      </div>

      {/* Section Divider */}
      <div className="my-16 flex items-center gap-4">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="size-2 rounded-full bg-primary/30" />
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>
    </section>
  );
}

// ============================================================================
// CONTENT BLOCKS
// ============================================================================

function ContentBlock({ content }: { content: TranscriptContent }) {
  switch (content.type) {
    case "brenner-quote":
      return <BrennerQuote text={content.text} highlights={content.highlights} />;
    case "interviewer-question":
      return <InterviewerQuestion text={content.text} />;
    case "paragraph":
      return <Paragraph text={content.text} highlights={content.highlights} />;
    default:
      return null;
  }
}

// ============================================================================
// BRENNER QUOTE - The star component
// ============================================================================

interface BrennerQuoteProps {
  text: string;
  highlights?: string[];
}

function BrennerQuote({ text, highlights }: BrennerQuoteProps) {
  // Split into paragraphs
  const paragraphs = text.split(/\n\n+/);

  return (
    <div className="group relative">
      {/* Quote decoration */}
      <div className="absolute -left-4 top-0 text-6xl font-serif text-primary/20 select-none leading-none">
        &ldquo;
      </div>

      {/* Quote card */}
      <div className="relative pl-8 pr-6 py-6 rounded-2xl bg-gradient-to-br from-primary/[0.03] to-transparent border-l-4 border-primary/40 hover:border-primary/60 transition-colors">
        {/* Speaker badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-gradient-to-br from-primary/20 to-amber-500/20 flex items-center justify-center text-sm font-bold text-primary">
              SB
            </div>
            <span className="text-sm font-medium text-primary">Sydney Brenner</span>
          </div>
          {/* Copy button - appears on hover */}
          <CopyButton
            text={text}
            attribution="— Sydney Brenner"
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            showPreview={true}
          />
        </div>

        {/* Quote text */}
        <div className="space-y-4">
          {paragraphs.map((para, i) => (
            <p
              key={i}
              className="text-lg lg:text-xl leading-relaxed text-foreground/90 font-serif"
            >
              {highlights ? renderTextWithHighlights(para, highlights) : para}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function renderTextWithHighlights(text: string, highlights: string[]): React.ReactNode {
  if (!highlights || highlights.length === 0) {
    return text;
  }

  // Create a regex pattern for all highlights
  const pattern = highlights.map(escapeRegex).join("|");
  const regex = new RegExp(`(${pattern})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, i) => {
    const isHighlight = highlights.some(
      (h) => h.toLowerCase() === part.toLowerCase()
    );
    if (isHighlight) {
      return (
        <span
          key={i}
          className="font-semibold text-primary bg-primary/10 px-1 rounded"
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ============================================================================
// INTERVIEWER QUESTION
// ============================================================================

function InterviewerQuestion({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 py-4 px-5 rounded-xl bg-muted/30 border border-border/50">
      <div className="flex-shrink-0 size-7 rounded-full bg-muted flex items-center justify-center">
        <span className="text-xs font-bold text-muted-foreground">Q</span>
      </div>
      <p className="text-base text-muted-foreground italic leading-relaxed">
        {text}
      </p>
    </div>
  );
}

// ============================================================================
// PARAGRAPH
// ============================================================================

function Paragraph({ text, highlights }: { text: string; highlights?: string[] }) {
  return (
    <p className="text-lg leading-relaxed text-foreground/80">
      {highlights ? renderTextWithHighlights(text, highlights) : text}
    </p>
  );
}

// ============================================================================
// BACK TO TOP
// ============================================================================

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 500);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 z-40 size-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
      aria-label="Back to top"
    >
      <ArrowUpIcon />
    </button>
  );
}

// ============================================================================
// MAIN VIEWER COMPONENT (VIRTUALIZED)
// ============================================================================

interface TranscriptViewerProps {
  data: ParsedTranscript;
  estimatedReadTime: string;
  wordCount: string;
}

export function TranscriptViewer({ data, estimatedReadTime, wordCount }: TranscriptViewerProps) {
  const [activeSection, setActiveSection] = useState(0);
  const [readingProgress, setReadingProgress] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Reading position persistence
  const { position, save: savePosition, canRestore, markRestored } = useReadingPosition("transcript", {
    maxSection: data.sections.length - 1,
  });

  // Virtualizer for efficient rendering of large section lists
  const virtualizer = useVirtualizer({
    count: data.sections.length,
    getScrollElement: () => scrollContainerRef.current,
    // Estimate average section height (varies greatly, will be measured)
    estimateSize: useCallback(() => 400, []),
    // Render extra items above/below viewport for smoother scrolling
    overscan: 3,
  });

  // Track active section based on scroll position
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight - container.clientHeight;

      // Update reading progress
      const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      setReadingProgress(Math.min(100, Math.max(0, progress)));

      // Find active section based on which virtual item is in view
      const virtualItems = virtualizer.getVirtualItems();
      if (virtualItems.length === 0) return;

      // Find the first item whose bottom edge is past the viewport center
      const viewportCenter = scrollTop + container.clientHeight * 0.3;
      for (const item of virtualItems) {
        const itemBottom = item.start + item.size;
        if (itemBottom > viewportCenter) {
          setActiveSection(item.index);
          // Save position for persistence (debounced in hook)
          savePosition(scrollTop, item.index);
          break;
        }
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial call

    return () => container.removeEventListener("scroll", handleScroll);
  }, [virtualizer, savePosition]);

  // Handle URL hash OR restore saved position on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash;

    // URL hash takes priority over saved position
    if (hash.startsWith("#section-")) {
      const sectionNum = parseInt(hash.replace("#section-", ""), 10);
      const sectionIndex = data.sections.findIndex((s) => s.number === sectionNum);

      if (sectionIndex >= 0) {
        // Delay to ensure virtualizer is initialized
        setTimeout(() => {
          virtualizer.scrollToIndex(sectionIndex, { align: "start", behavior: "smooth" });
        }, 100);
        return;
      }
    }

    // Restore saved position if no hash and we have a saved position
    if (canRestore && position) {
      setTimeout(() => {
        virtualizer.scrollToIndex(position.activeSection, { align: "start" });
        markRestored();
      }, 100);
    }
  }, [data.sections, virtualizer, canRestore, position, markRestored]);

  // Scroll to section from TOC
  const scrollToSection = useCallback(
    (index: number) => {
      virtualizer.scrollToIndex(index, { align: "start", behavior: "smooth" });
    },
    [virtualizer]
  );

  // Memoize virtual items to avoid recalculation
  const virtualItems = virtualizer.getVirtualItems();

  return (
    <>
      <ReadingProgress progress={readingProgress} />

      <TranscriptHero
        title={data.title}
        subtitle={data.subtitle}
        totalSections={data.totalSections}
        estimatedReadTime={estimatedReadTime}
        wordCount={wordCount}
      />

      {data.sections.length > 0 ? (
        <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-8 xl:gap-12">
          {/* Sidebar TOC (desktop) */}
          <aside className="hidden lg:block">
            <TableOfContents
              sections={data.sections}
              activeSection={activeSection}
              onSectionClick={scrollToSection}
            />
          </aside>

          {/* Mobile TOC */}
          <div className="lg:hidden mb-8">
            <TableOfContents
              sections={data.sections}
              activeSection={activeSection}
              onSectionClick={scrollToSection}
            />
          </div>

          {/* Main content - virtualized scroll container */}
          <main
            ref={scrollContainerRef}
            className="h-[calc(100vh-200px)] overflow-y-auto scroll-smooth"
            style={{ contain: "strict" }}
          >
            {/* Total height spacer */}
            <div
              style={{
                height: virtualizer.getTotalSize(),
                width: "100%",
                position: "relative",
              }}
            >
              {/* Only render visible items */}
              {virtualItems.map((virtualRow) => {
                const section = data.sections[virtualRow.index];
                return (
                  <div
                    key={section.number}
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
                    <TranscriptSection
                      section={section}
                      isActive={activeSection === virtualRow.index}
                    />
                  </div>
                );
              })}
            </div>
          </main>
        </div>
      ) : data.rawContent ? (
        <div className="max-w-3xl mx-auto">
          <RawContentFallback content={data.rawContent} />
        </div>
      ) : null}

      <BackToTop />
    </>
  );
}

// ============================================================================
// ICONS
// ============================================================================

function SectionIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function WordIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`size-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
    </svg>
  );
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`size-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function CloseIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`size-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// ============================================================================
// RAW CONTENT FALLBACK (for unstructured files)
// ============================================================================

function RawContentFallback({ content }: { content: string }) {
  const paragraphs = content.split(/\n\n+/).filter(Boolean);

  return (
    <div className="prose prose-lg dark:prose-invert max-w-none">
      {paragraphs.map((para, i) => (
        <p key={i} className="text-base lg:text-lg leading-relaxed text-foreground/85 mb-4">
          {para}
        </p>
      ))}
    </div>
  );
}
