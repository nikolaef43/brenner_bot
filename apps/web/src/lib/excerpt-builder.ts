/**
 * Excerpt Builder
 *
 * Composes transcript sections into formatted excerpt blocks for session kickoffs.
 * Implements excerpt_format_v0.1.md specification.
 *
 * @example
 * ```typescript
 * import { composeExcerpt, type ExcerptSection } from "./excerpt-builder";
 *
 * const sections: ExcerptSection[] = [
 *   { anchor: "§42", quote: "The question is not whether...", title: "On Discriminative Tests" },
 *   { anchor: "§45", quote: "You need a chastity control...", title: "Potency Checks" },
 * ];
 *
 * const excerpt = composeExcerpt({ theme: "Experimental Design", sections });
 * console.log(excerpt.markdown);
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export interface ExcerptSection {
  /** Section anchor in §n format (e.g., "§42") */
  anchor: string;
  /** The selected quote text */
  quote: string;
  /** Section title for attribution (optional) */
  title?: string;
}

export interface ExcerptConfig {
  /** Theme or title for the excerpt block */
  theme?: string;
  /** Selected sections to include */
  sections: ExcerptSection[];
  /** Ordering strategy: relevance (default) or chronological */
  ordering?: "relevance" | "chronological";
  /** Maximum total words (default: 800) */
  maxTotalWords?: number;
}

export interface ComposedExcerpt {
  /** Full excerpt block as markdown */
  markdown: string;
  /** List of included anchors */
  anchors: string[];
  /** Total word count */
  wordCount: number;
  /** Validation warnings */
  warnings: string[];
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_WORDS = 800;
const MAX_SECTIONS = 7;
const MIN_SECTIONS = 2;

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate anchor format (§ followed by number)
 */
function isValidAnchor(anchor: string): boolean {
  return /^§\d+(-\d+)?$/.test(anchor);
}

/**
 * Extract section number from anchor for sorting
 */
function extractSectionNumber(anchor: string): number {
  const match = anchor.match(/^§(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ============================================================================
// Composition
// ============================================================================

/**
 * Compose an excerpt block from selected sections.
 *
 * @param config - Excerpt configuration
 * @returns Composed excerpt with markdown, metadata, and warnings
 */
export function composeExcerpt(config: ExcerptConfig): ComposedExcerpt {
  const {
    theme,
    sections,
    ordering = "relevance",
    maxTotalWords = DEFAULT_MAX_WORDS,
  } = config;

  const warnings: string[] = [];

  // Validate sections
  if (sections.length < MIN_SECTIONS) {
    warnings.push(`Excerpt has fewer than ${MIN_SECTIONS} sections (has ${sections.length})`);
  }

  if (sections.length > MAX_SECTIONS) {
    warnings.push(`Excerpt has more than ${MAX_SECTIONS} sections (has ${sections.length})`);
  }

  // Validate anchors
  for (const section of sections) {
    if (!isValidAnchor(section.anchor)) {
      warnings.push(`Invalid anchor format: "${section.anchor}" (expected §n)`);
    }
  }

  // Check for duplicates
  const anchors = sections.map((s) => s.anchor);
  const uniqueAnchors = new Set(anchors);
  if (uniqueAnchors.size !== anchors.length) {
    warnings.push("Excerpt contains duplicate anchors");
  }

  // Sort sections if chronological ordering requested
  const orderedSections =
    ordering === "chronological"
      ? [...sections].sort(
          (a, b) => extractSectionNumber(a.anchor) - extractSectionNumber(b.anchor)
        )
      : sections;

  // Build markdown
  const lines: string[] = [];

  // Heading
  const heading = theme ? `### Excerpt: ${theme}` : "### Excerpt";
  lines.push(heading);
  lines.push("");

  // Quotes
  for (const section of orderedSections) {
    lines.push(`> **${section.anchor}**: "${section.quote}"`);
    if (section.title) {
      lines.push(`> — *${section.title}*`);
    }
    lines.push("");
  }

  // Footer metadata
  const anchorList = orderedSections.map((s) => s.anchor).join(", ");
  lines.push(`**Sections included**: ${anchorList}`);

  // Calculate word count
  const totalWords = orderedSections.reduce(
    (sum, section) => sum + countWords(section.quote),
    0
  );
  lines.push(`**Total words**: ~${totalWords} words`);

  // Check word limit
  if (totalWords > maxTotalWords) {
    warnings.push(`Excerpt exceeds ${maxTotalWords} word limit (has ${totalWords})`);
  }

  return {
    markdown: lines.join("\n"),
    anchors: orderedSections.map((s) => s.anchor),
    wordCount: totalWords,
    warnings,
  };
}

/**
 * Parse an excerpt markdown block back into structured data.
 * Useful for editing or recomposing excerpts.
 *
 * @param markdown - Excerpt markdown block
 * @returns Parsed sections or null if invalid format
 */
export function parseExcerpt(markdown: string): ExcerptSection[] | null {
  const sections: ExcerptSection[] = [];

  // Match quote blocks: > **§n**: "quote text"
  // Note: § is Unicode U+00A7, needs proper Unicode regex
  const quotePattern = />\s*\*\*(§\d+)\*\*:\s*"([^"]+)"/gu;
  // Match attribution: > — *title*
  const attrPattern = />\s*—\s*\*([^*]+)\*/g;

  let match: RegExpExecArray | null;
  const quotes: { anchor: string; quote: string; index: number }[] = [];
  const attrs: { title: string; index: number }[] = [];

  // Find all quotes
  while ((match = quotePattern.exec(markdown)) !== null) {
    quotes.push({
      anchor: match[1],
      quote: match[2],
      index: match.index,
    });
  }

  // Find all attributions
  while ((match = attrPattern.exec(markdown)) !== null) {
    attrs.push({
      title: match[1],
      index: match.index,
    });
  }

  // Match quotes with their attributions
  for (const q of quotes) {
    const nextQuote = quotes.find((other) => other.index > q.index);
    const nextQuoteIndex = nextQuote?.index ?? Infinity;

    // Find attribution between this quote and the next
    const attr = attrs.find((a) => a.index > q.index && a.index < nextQuoteIndex);

    sections.push({
      anchor: q.anchor,
      quote: q.quote,
      title: attr?.title,
    });
  }

  return sections.length > 0 ? sections : null;
}

/**
 * Extract just the anchors from an excerpt markdown block.
 * Lightweight alternative to full parsing.
 *
 * @param markdown - Excerpt markdown block
 * @returns Array of anchors found
 */
export function extractAnchorsFromExcerpt(markdown: string): string[] {
  const anchors: string[] = [];
  // Note: § is Unicode U+00A7, needs proper Unicode regex
  const pattern = /\*\*(§\d+)\*\*/gu;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(markdown)) !== null) {
    anchors.push(match[1]);
  }

  return [...new Set(anchors)]; // Deduplicate
}
