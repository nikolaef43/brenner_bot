"use client";

import { useState, useEffect } from "react";
import type {
  ParsedDistillation,
  DistillationPart,
  DistillationSection,
  DistillationContent,
} from "@/lib/distillation-parser";
import { getModelFromId } from "@/lib/distillation-parser";

// ============================================================================
// DISTILLATION HERO
// ============================================================================

interface DistillationHeroProps {
  title: string;
  author: string;
  subtitle?: string;
  preamble?: string;
  wordCount: number;
  docId: string;
}

export function DistillationHero({
  title,
  author,
  subtitle,
  preamble,
  wordCount,
  docId,
}: DistillationHeroProps) {
  const model = getModelFromId(docId);
  const readTime = Math.ceil(wordCount / 200);

  return (
    <div className="relative overflow-hidden rounded-3xl mb-12">
      {/* Gradient background based on model */}
      <div className={`absolute inset-0 bg-gradient-to-br ${model.color} opacity-10`} />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />

      {/* Decorative pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-full" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }} />
      </div>

      <div className="relative px-8 py-12 lg:px-12 lg:py-16">
        {/* Model badge */}
        <div className="inline-flex items-center gap-3 mb-6">
          <div className={`size-10 rounded-xl bg-gradient-to-br ${model.color} flex items-center justify-center text-white font-bold shadow-lg`}>
            {model.icon}
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Model Distillation
            </div>
            <div className="font-semibold text-foreground">{author}</div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight text-foreground mb-4 max-w-4xl">
          {title}
        </h1>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-lg text-muted-foreground mb-6 max-w-2xl italic">
            {subtitle}
          </p>
        )}

        {/* Preamble */}
        {preamble && (
          <div className="max-w-3xl mb-8 p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50">
            <p className="text-base lg:text-lg leading-relaxed text-foreground/80">
              {preamble}
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-4">
          <StatBadge icon={<ClockIcon />} value={`${readTime} min`} label="read" />
          <StatBadge icon={<WordIcon />} value={formatNumber(wordCount)} label="words" />
        </div>
      </div>
    </div>
  );
}

function StatBadge({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 text-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span className="font-semibold text-foreground">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}k`;
  }
  return n.toString();
}

// ============================================================================
// PART HEADER
// ============================================================================

interface PartHeaderProps {
  part: DistillationPart;
  docId: string;
}

function PartHeader({ part, docId }: PartHeaderProps) {
  const model = getModelFromId(docId);

  return (
    <div className="relative my-16 py-12">
      {/* Decorative line */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Part badge */}
      <div className="relative flex flex-col items-center gap-4">
        <div className={`
          inline-flex items-center gap-3 px-6 py-3 rounded-2xl
          bg-gradient-to-br ${model.color} text-white shadow-lg
        `}>
          <span className="text-sm font-medium opacity-80">Part</span>
          <span className="text-2xl font-bold">{toRoman(part.number)}</span>
        </div>
        <h2 className="text-2xl lg:text-3xl font-bold text-center text-foreground tracking-tight">
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
}

function Section({ section, docId }: SectionProps) {
  const HeadingTag = `h${section.level + 1}` as "h2" | "h3" | "h4";
  const headingClasses = {
    1: "text-2xl lg:text-3xl font-bold mb-6 mt-12 first:mt-0",
    2: "text-xl lg:text-2xl font-semibold mb-4 mt-10",
    3: "text-lg lg:text-xl font-semibold mb-3 mt-8",
    4: "text-base lg:text-lg font-semibold mb-2 mt-6",
  };

  return (
    <section className="scroll-mt-24">
      <HeadingTag className={`text-foreground tracking-tight ${headingClasses[section.level]}`}>
        {section.title}
      </HeadingTag>

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
  const model = getModelFromId(docId);

  switch (content.type) {
    case "paragraph":
      return (
        <p className="text-base lg:text-lg leading-relaxed text-foreground/85">
          {content.text}
        </p>
      );

    case "quote":
      return (
        <figure className="my-6">
          <blockquote className={`
            relative pl-6 pr-4 py-4 rounded-xl
            border-l-4 border-primary bg-primary/5
          `}>
            {/* Quote mark */}
            <div className="absolute -left-2 -top-2 text-4xl text-primary/30 font-serif select-none">
              &ldquo;
            </div>
            <p className="text-base lg:text-lg leading-relaxed text-foreground/90 italic font-serif">
              {content.text}
            </p>
          </blockquote>
          {content.reference && (
            <figcaption className="mt-2 text-sm text-muted-foreground text-right">
              <span className="font-mono px-2 py-0.5 rounded bg-muted text-xs">
                §{content.reference}
              </span>
            </figcaption>
          )}
        </figure>
      );

    case "list":
      if (content.ordered) {
        return (
          <ol className="my-4 space-y-2 ml-6">
            {content.items.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-base lg:text-lg text-foreground/85">
                <span className={`
                  flex-shrink-0 size-6 rounded-full
                  bg-gradient-to-br ${model.color} text-white
                  flex items-center justify-center text-xs font-bold
                `}>
                  {i + 1}
                </span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ol>
        );
      }
      return (
        <ul className="my-4 space-y-2 ml-4">
          {content.items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-base lg:text-lg text-foreground/85">
              <span className="flex-shrink-0 size-1.5 rounded-full bg-primary mt-2.5" />
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
// MAIN VIEWER
// ============================================================================

interface DistillationViewerProps {
  data: ParsedDistillation;
  docId: string;
}

export function DistillationViewer({ data, docId }: DistillationViewerProps) {
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

  const model = getModelFromId(docId);

  return (
    <>
      {/* Reading progress */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-border/30">
        <div
          className={`h-full bg-gradient-to-r ${model.color} transition-all duration-150`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <DistillationHero
        title={data.title}
        author={data.author}
        subtitle={data.subtitle}
        preamble={data.preamble}
        wordCount={data.wordCount}
        docId={docId}
      />

      <div className="max-w-3xl mx-auto">
        {data.parts.map((part) => (
          <div key={part.number}>
            {data.parts.length > 1 && <PartHeader part={part} docId={docId} />}

            {part.sections.map((section, i) => (
              <Section key={i} section={section} docId={docId} />
            ))}
          </div>
        ))}
      </div>

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

// ============================================================================
// ICONS
// ============================================================================

function ClockIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function WordIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}
