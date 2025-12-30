"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ParsedTranscript, TranscriptSection as TSection, TranscriptContent } from "@/lib/transcript-parser";

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
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 mb-12">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

      <div className="relative px-8 py-12 lg:px-12 lg:py-16">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
          <span className="size-2 rounded-full bg-primary animate-pulse" />
          Primary Source
        </div>

        {/* Title */}
        <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight text-foreground mb-4 max-w-4xl">
          {title}
        </h1>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-lg lg:text-xl text-muted-foreground mb-8 max-w-2xl">
            {subtitle}
          </p>
        )}

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-4 lg:gap-6">
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
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-background/50 backdrop-blur-sm border border-border/50">
      <div className="text-primary">{icon}</div>
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className="text-lg font-semibold text-foreground">{value}</div>
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
// READING PROGRESS
// ============================================================================

export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, scrollPercent)));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
        <div className="flex items-center gap-2 mb-4">
          <div className="size-8 rounded-full bg-gradient-to-br from-primary/20 to-amber-500/20 flex items-center justify-center text-sm font-bold text-primary">
            SB
          </div>
          <span className="text-sm font-medium text-primary">Sydney Brenner</span>
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
// MAIN VIEWER COMPONENT
// ============================================================================

interface TranscriptViewerProps {
  data: ParsedTranscript;
  estimatedReadTime: string;
  wordCount: string;
}

export function TranscriptViewer({ data, estimatedReadTime, wordCount }: TranscriptViewerProps) {
  const [activeSection, setActiveSection] = useState(0);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  // Intersection observer for active section tracking
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute("data-index") || "0", 10);
            setActiveSection(index);
          }
        });
      },
      { rootMargin: "-20% 0px -60% 0px" }
    );

    sectionRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [data.sections]);

  const scrollToSection = useCallback((index: number) => {
    const element = document.getElementById(`section-${data.sections[index].number}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [data.sections]);

  return (
    <>
      <ReadingProgress />

      <TranscriptHero
        title={data.title}
        subtitle={data.subtitle}
        totalSections={data.totalSections}
        estimatedReadTime={estimatedReadTime}
        wordCount={wordCount}
      />

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

        {/* Main content */}
        <main>
          {data.sections.map((section, index) => (
            <div
              key={section.number}
              ref={(el) => { sectionRefs.current[index] = el; }}
              data-index={index}
            >
              <TranscriptSection
                section={section}
                isActive={activeSection === index}
              />
            </div>
          ))}
        </main>
      </div>

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
