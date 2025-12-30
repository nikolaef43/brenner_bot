"use client";

import { useState, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import type {
  ParsedDistillation,
  DistillationPart,
  DistillationSection,
  DistillationContent,
} from "@/lib/distillation-parser";
import { getDistillationMeta } from "@/lib/distillation-parser";
import { ReferenceCopyButton, CopyButton } from "@/components/ui/copy-button";

// ============================================================================
// MODEL THEME SYSTEM - Stripe-level color consistency
// ============================================================================

type ModelTheme = {
  // Primary accent colors with proper contrast
  accent: string;
  accentLight: string;
  accentDark: string;
  // Background treatments
  bgGradient: string;
  bgSubtle: string;
  // Text colors that work in both modes
  textOnAccent: string;
  // Border and shadow
  borderAccent: string;
  shadowAccent: string;
  // Glow effect
  glowColor: string;
};

const MODEL_THEMES: Record<string, ModelTheme> = {
  "distillation-gpt-52": {
    accent: "bg-emerald-500",
    accentLight: "bg-emerald-400",
    accentDark: "bg-emerald-600",
    bgGradient: "from-emerald-500/15 via-emerald-600/10 to-teal-500/5",
    bgSubtle: "bg-emerald-500/8",
    textOnAccent: "text-white",
    borderAccent: "border-emerald-500/30",
    shadowAccent: "shadow-emerald-500/20",
    glowColor: "emerald",
  },
  "distillation-opus-45": {
    accent: "bg-violet-500",
    accentLight: "bg-violet-400",
    accentDark: "bg-violet-600",
    bgGradient: "from-violet-500/15 via-violet-600/10 to-purple-500/5",
    bgSubtle: "bg-violet-500/8",
    textOnAccent: "text-white",
    borderAccent: "border-violet-500/30",
    shadowAccent: "shadow-violet-500/20",
    glowColor: "violet",
  },
  "distillation-gemini-3": {
    accent: "bg-blue-500",
    accentLight: "bg-blue-400",
    accentDark: "bg-blue-600",
    bgGradient: "from-blue-500/15 via-blue-600/10 to-cyan-500/5",
    bgSubtle: "bg-blue-500/8",
    textOnAccent: "text-white",
    borderAccent: "border-blue-500/30",
    shadowAccent: "shadow-blue-500/20",
    glowColor: "blue",
  },
};

function getModelTheme(docId: string): ModelTheme {
  return MODEL_THEMES[docId] ?? MODEL_THEMES["distillation-opus-45"];
}

// ============================================================================
// DISTILLATION HERO - Stripe-level polish
// ============================================================================

interface DistillationHeroProps {
  title: string;
  wordCount: number;
  docId: string;
}

export function DistillationHero({
  title,
  wordCount,
  docId,
}: DistillationHeroProps) {
  const meta = getDistillationMeta(docId);
  const theme = getModelTheme(docId);
  const readTime = Math.ceil(wordCount / 200);

  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl mb-8 sm:mb-12 border border-border/50">
      {/* Layered gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${theme.bgGradient}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/60 to-background/30" />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Accent glow orbs */}
      <div className={`absolute -top-16 -right-16 sm:-top-24 sm:-right-24 size-48 sm:size-80 rounded-full ${theme.accent} opacity-15 blur-[80px]`} />
      <div className={`absolute -bottom-12 -left-12 sm:-bottom-20 sm:-left-20 size-36 sm:size-60 rounded-full ${theme.accent} opacity-10 blur-[60px]`} />

      <div className="relative px-5 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-16">
        {/* Top row: Model identity + Date */}
        <div className="flex flex-wrap items-start justify-between gap-4 sm:gap-6 mb-8 sm:mb-10">
          {/* Model identity */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Model icon with glow */}
            <div className="relative">
              <div className={`absolute inset-0 ${theme.accent} rounded-xl sm:rounded-2xl blur-xl opacity-40`} />
              <div className={`relative size-12 sm:size-16 rounded-xl sm:rounded-2xl ${theme.accent} flex items-center justify-center ${theme.textOnAccent} text-xl sm:text-3xl font-bold shadow-2xl ${theme.shadowAccent}`}>
                {meta.icon}
              </div>
            </div>

            <div className="space-y-0.5">
              {/* Model type label */}
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider ${theme.bgSubtle} ${theme.borderAccent} border`}>
                <span className={`size-1.5 rounded-full ${theme.accent} animate-pulse`} />
                Model Distillation
              </div>

              {/* Model name - high contrast */}
              <h2 className="text-lg sm:text-2xl font-bold text-foreground tracking-tight">
                {meta.name}
              </h2>

              {/* Tagline - visible in both modes */}
              <p className="text-sm sm:text-base font-medium text-foreground/70">
                {meta.tagline}
              </p>
            </div>
          </div>

          {/* Date badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-foreground/5 border border-border/50">
            <CalendarIcon className="size-3.5 text-muted-foreground" />
            <span className="text-xs sm:text-sm text-muted-foreground font-medium">
              {meta.date}
            </span>
          </div>
        </div>

        {/* Document title */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight text-foreground mb-5 sm:mb-6 max-w-4xl leading-[1.15]">
          {title}
        </h1>

        {/* Approach description */}
        <p className="text-base sm:text-lg lg:text-xl leading-relaxed text-foreground/75 max-w-3xl mb-8 sm:mb-10">
          {meta.approach}
        </p>

        {/* Key Strengths - Premium cards */}
        <div className="mb-8 sm:mb-10">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircleIcon className={`size-4 ${theme.accent.replace('bg-', 'text-')}`} />
            <span className="text-xs sm:text-sm font-semibold text-foreground/80 uppercase tracking-wider">
              Key Strengths
            </span>
          </div>

          {/* Horizontal scroll on mobile, wrap on desktop */}
          <div className="relative -mx-5 sm:mx-0">
            <div className="flex gap-3 overflow-x-auto pb-2 sm:pb-0 sm:flex-wrap scrollbar-hide px-5 sm:px-0 snap-x snap-mandatory">
              {meta.strengths.map((strength, i) => (
                <StrengthPill
                  key={i}
                  strength={strength}
                  theme={theme}
                  index={i}
                />
              ))}
            </div>
            {/* Fade hint on mobile */}
            <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none sm:hidden" />
          </div>
        </div>

        {/* Stats row - refined design */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-6 border-t border-border/40">
          <StatChip icon={<ClockIcon />} value={`${readTime} min`} label="read time" />
          <StatChip icon={<DocumentIcon />} value={formatNumber(wordCount)} label="words" />
          <StatChip icon={<SparklesIcon />} value="Frontier" label="model class" accent />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STRENGTH PILL - Premium badge design
// ============================================================================

interface StrengthPillProps {
  strength: string;
  theme: ModelTheme;
  index: number;
}

function StrengthPill({ strength, theme, index }: StrengthPillProps) {
  return (
    <div
      className={`
        group flex-shrink-0 snap-start
        flex items-start gap-2.5 sm:gap-3
        px-4 py-3 sm:px-5 sm:py-3.5
        rounded-xl sm:rounded-2xl
        bg-card/80 backdrop-blur-sm
        border border-border/60
        shadow-sm hover:shadow-md
        hover:border-border
        transition-all duration-200
        max-w-[280px] sm:max-w-none
      `}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Checkmark with accent background */}
      <div className={`
        flex-shrink-0 size-5 sm:size-6 rounded-lg
        ${theme.accent} ${theme.textOnAccent}
        flex items-center justify-center
        shadow-sm ${theme.shadowAccent}
        group-hover:scale-110 transition-transform
      `}>
        <CheckIcon className="size-3 sm:size-3.5" />
      </div>

      {/* Strength text */}
      <span className="text-sm sm:text-[15px] text-foreground/90 leading-snug font-medium">
        {strength}
      </span>
    </div>
  );
}

// ============================================================================
// STAT CHIP - Clean, minimal stats
// ============================================================================

interface StatChipProps {
  icon: ReactNode;
  value: string;
  label: string;
  accent?: boolean;
}

function StatChip({ icon, value, label, accent }: StatChipProps) {
  return (
    <div className={`
      inline-flex items-center gap-2 sm:gap-2.5
      px-3 sm:px-4 py-2 sm:py-2.5
      rounded-xl
      ${accent
        ? "bg-primary/10 border-primary/20"
        : "bg-foreground/5 border-border/50"
      }
      border
      transition-colors
    `}>
      <span className={accent ? "text-primary" : "text-muted-foreground"}>
        {icon}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className="font-semibold text-foreground text-sm sm:text-base">
          {value}
        </span>
        <span className="text-muted-foreground text-xs sm:text-sm">
          {label}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// UTILITY
// ============================================================================

function formatNumber(n: number): string {
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}k`;
  }
  return n.toString();
}

function generateAnchorId(title: string, partNumber?: number): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return partNumber ? `part-${partNumber}-${slug}` : slug;
}

// ============================================================================
// TABLE OF CONTENTS
// ============================================================================

interface TocEntry {
  id: string;
  title: string;
  level: number;
  partNumber?: number;
  partTitle?: string;
}

function extractTocEntries(data: ParsedDistillation): TocEntry[] {
  const entries: TocEntry[] = [];

  for (const part of data.parts) {
    // Add part as entry if multiple parts
    if (data.parts.length > 1) {
      entries.push({
        id: `part-${part.number}`,
        title: part.title,
        level: 0,
        partNumber: part.number,
      });
    }

    // Add sections
    for (const section of part.sections) {
      entries.push({
        id: generateAnchorId(section.title, data.parts.length > 1 ? part.number : undefined),
        title: section.title,
        level: section.level,
        partNumber: data.parts.length > 1 ? part.number : undefined,
        partTitle: data.parts.length > 1 ? part.title : undefined,
      });
    }
  }

  return entries;
}

interface DistillationTOCProps {
  entries: TocEntry[];
  activeSection: string;
  onSectionClick: (id: string) => void;
  docId: string;
}

function DistillationTOC({ entries, activeSection, onSectionClick, docId }: DistillationTOCProps) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = getModelTheme(docId);

  return (
    <nav className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden w-full flex items-center justify-between px-4 py-3 rounded-xl bg-card border border-border mb-2"
      >
        <span className="text-sm font-medium text-foreground">Table of Contents</span>
        <ChevronIcon className={`size-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* TOC list */}
      <div className={`${isOpen ? "block" : "hidden"} lg:block`}>
        <div className="px-4 py-3 rounded-xl bg-card/50 border border-border/50 lg:bg-transparent lg:border-0 lg:p-0">
          <h3 className="hidden lg:block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Contents
          </h3>
          <ul className="space-y-1">
            {entries.map((entry) => {
              const isActive = activeSection === entry.id;
              const isPart = entry.level === 0;

              return (
                <li key={entry.id}>
                  <button
                    onClick={() => {
                      onSectionClick(entry.id);
                      setIsOpen(false);
                    }}
                    className={`
                      w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                      ${isPart ? "font-semibold" : "font-normal"}
                      ${isActive
                        ? `${theme.bgSubtle} text-foreground`
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }
                    `}
                    style={{ paddingLeft: isPart ? undefined : `${12 + (entry.level - 1) * 12}px` }}
                  >
                    {entry.title}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}

// ============================================================================
// ICONS - Clean, consistent
// ============================================================================

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  );
}

// ============================================================================
// PART HEADER
// ============================================================================

interface PartHeaderProps {
  part: DistillationPart;
  docId: string;
}

function PartHeader({ part, docId }: PartHeaderProps) {
  const theme = getModelTheme(docId);

  return (
    <div className="relative my-12 sm:my-16 py-8 sm:py-12">
      {/* Decorative line */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Part badge */}
      <div className="relative flex flex-col items-center gap-3 sm:gap-4">
        <div className={`
          relative inline-flex items-center gap-2 sm:gap-3 px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl
          ${theme.accent} ${theme.textOnAccent} shadow-xl ${theme.shadowAccent}
        `}>
          <span className="text-xs sm:text-sm font-medium opacity-80">Part</span>
          <span className="text-xl sm:text-2xl font-bold">{toRoman(part.number)}</span>
        </div>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-center text-foreground tracking-tight px-4">
          {part.title}
        </h2>
      </div>
    </div>
  );
}

function toRoman(num: number): string {
  const romans: [number, string][] = [
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let result = "";
  for (const [value, symbol] of romans) {
    while (num >= value) {
      result += symbol;
      num -= value;
    }
  }
  return result;
}

// ============================================================================
// SECTION
// ============================================================================

interface SectionProps {
  section: DistillationSection;
  docId: string;
  sectionId: string;
}

function Section({ section, docId, sectionId }: SectionProps) {
  const [copied, setCopied] = useState(false);
  const HeadingTag = `h${section.level + 1}` as "h2" | "h3" | "h4";
  const headingClasses = {
    1: "text-2xl lg:text-3xl font-bold mb-6 mt-12 first:mt-0",
    2: "text-xl lg:text-2xl font-semibold mb-4 mt-10",
    3: "text-lg lg:text-xl font-semibold mb-3 mt-8",
    4: "text-base lg:text-lg font-semibold mb-2 mt-6",
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#${sectionId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id={sectionId} className="scroll-mt-24 group/section">
      <div className="flex items-start gap-2">
        <HeadingTag className={`text-foreground tracking-tight ${headingClasses[section.level]} flex-1`}>
          {section.title}
        </HeadingTag>
        <button
          onClick={handleCopyLink}
          className="opacity-0 group-hover/section:opacity-100 transition-opacity mt-2 p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
          title={copied ? "Copied!" : "Copy link to section"}
        >
          {copied ? (
            <CheckIcon className="size-4" />
          ) : (
            <LinkIcon className="size-4" />
          )}
        </button>
      </div>

      <div className="space-y-4">
        {section.content.map((content, i) => (
          <ContentRenderer key={i} content={content} docId={docId} />
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// CONTENT RENDERER
// ============================================================================

interface ContentRendererProps {
  content: DistillationContent;
  docId: string;
}

function ContentRenderer({ content, docId }: ContentRendererProps) {
  const theme = getModelTheme(docId);

  switch (content.type) {
    case "paragraph":
      return (
        <p className="text-base lg:text-lg leading-relaxed text-foreground/85">
          {content.text}
        </p>
      );

    case "quote":
      return (
        <figure className="my-6 group">
          <blockquote className="relative pl-5 sm:pl-6 pr-4 py-4 rounded-xl border-l-4 border-primary bg-primary/5">
            {/* Quote mark */}
            <div className="absolute -left-2 -top-2 text-3xl sm:text-4xl text-primary/30 font-serif select-none">
              &ldquo;
            </div>
            {/* Copy button - appears on hover */}
            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <CopyButton
                text={content.text}
                attribution={content.reference ? `— Sydney Brenner, §${content.reference}` : "— Sydney Brenner"}
                variant="ghost"
                size="sm"
                showPreview={true}
              />
            </div>
            <p className="text-base lg:text-lg leading-relaxed text-foreground/90 italic font-serif pr-8">
              {content.text}
            </p>
          </blockquote>
          {content.reference && (
            <figcaption className="mt-2 text-sm text-muted-foreground text-right">
              <ReferenceCopyButton
                reference={`§${content.reference}`}
                quoteText={content.text}
                source="Sydney Brenner"
              />
            </figcaption>
          )}
        </figure>
      );

    case "list":
      if (content.ordered) {
        return (
          <ol className="my-4 space-y-2.5 sm:space-y-3 ml-1 sm:ml-2">
            {content.items.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-base lg:text-lg text-foreground/85">
                <span className={`
                  flex-shrink-0 size-6 rounded-lg
                  ${theme.accent} ${theme.textOnAccent}
                  flex items-center justify-center text-xs font-bold
                  shadow-sm ${theme.shadowAccent}
                `}>
                  {i + 1}
                </span>
                <span className="leading-relaxed pt-0.5">{item}</span>
              </li>
            ))}
          </ol>
        );
      }
      return (
        <ul className="my-4 space-y-2 ml-1 sm:ml-2">
          {content.items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-base lg:text-lg text-foreground/85">
              <span className={`flex-shrink-0 size-1.5 rounded-full ${theme.accent} mt-2.5`} />
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      );

    case "code":
      return (
        <pre className="my-4 p-4 rounded-xl bg-muted/50 border border-border overflow-x-auto">
          <code className="text-sm font-mono text-foreground/90">{content.text}</code>
        </pre>
      );

    default:
      return null;
  }
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

// ============================================================================
// MAIN VIEWER
// ============================================================================

interface DistillationViewerProps {
  data: ParsedDistillation;
  docId: string;
}

export function DistillationViewer({ data, docId }: DistillationViewerProps) {
  const [progress, setProgress] = useState(0);
  const [activeSection, setActiveSection] = useState("");
  const theme = getModelTheme(docId);

  // Extract TOC entries
  const tocEntries = useMemo(() => extractTocEntries(data), [data]);

  // Track scroll for progress bar and active section
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, scrollPercent)));

      // Find active section based on scroll position
      const sections = tocEntries.map(e => document.getElementById(e.id)).filter(Boolean) as HTMLElement[];
      const viewportCenter = scrollTop + window.innerHeight * 0.3;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section.offsetTop <= viewportCenter) {
          setActiveSection(tocEntries[i].id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial call
    return () => window.removeEventListener("scroll", handleScroll);
  }, [tocEntries]);

  // Handle URL hash on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.slice(1);
    if (hash) {
      const element = document.getElementById(hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    }
  }, []);

  // Scroll to section from TOC
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      // Update URL hash
      window.history.replaceState(null, "", `#${id}`);
    }
  };

  // Check if we have enough sections for a TOC
  const showTOC = tocEntries.length > 3;

  return (
    <>
      {/* Reading progress */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-border/30">
        <div
          className={`h-full ${theme.accent} transition-all duration-150`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <DistillationHero
        title={data.title}
        wordCount={data.wordCount}
        docId={docId}
      />

      {data.parts.length > 0 ? (
        showTOC ? (
          <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-8 xl:gap-12 max-w-6xl mx-auto">
            {/* Sidebar TOC (desktop) */}
            <aside className="hidden lg:block">
              <DistillationTOC
                entries={tocEntries}
                activeSection={activeSection}
                onSectionClick={scrollToSection}
                docId={docId}
              />
            </aside>

            {/* Mobile TOC */}
            <div className="lg:hidden mb-8">
              <DistillationTOC
                entries={tocEntries}
                activeSection={activeSection}
                onSectionClick={scrollToSection}
                docId={docId}
              />
            </div>

            {/* Main content */}
            <main className="max-w-3xl">
              {data.parts.map((part) => (
                <div key={part.number} id={data.parts.length > 1 ? `part-${part.number}` : undefined}>
                  {data.parts.length > 1 && <PartHeader part={part} docId={docId} />}

                  {part.sections.map((section) => (
                    <Section
                      key={section.title}
                      section={section}
                      docId={docId}
                      sectionId={generateAnchorId(section.title, data.parts.length > 1 ? part.number : undefined)}
                    />
                  ))}
                </div>
              ))}
            </main>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {data.parts.map((part) => (
              <div key={part.number}>
                {data.parts.length > 1 && <PartHeader part={part} docId={docId} />}

                {part.sections.map((section) => (
                  <Section
                    key={section.title}
                    section={section}
                    docId={docId}
                    sectionId={generateAnchorId(section.title, data.parts.length > 1 ? part.number : undefined)}
                  />
                ))}
              </div>
            ))}
          </div>
        )
      ) : data.rawContent ? (
        <div className="max-w-3xl mx-auto">
          <RawContentFallback content={data.rawContent} />
        </div>
      ) : null}

      {/* Back to top */}
      <BackToTopButton />
    </>
  );
}

function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 500);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-40 size-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
      aria-label="Back to top"
    >
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
      </svg>
    </button>
  );
}
