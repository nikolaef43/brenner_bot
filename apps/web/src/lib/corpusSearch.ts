/**
 * Corpus Search API
 *
 * Implements runtime parsing with in-memory search following
 * search_approach_decision_v0.1.md.
 */

import {
  parseTranscript,
  Section,
  searchSectionsByContent,
  searchSectionsByTitle,
} from "./transcriptParser";
import { readCorpusDoc } from "./corpus";

// ============================================================================
// Types
// ============================================================================

export interface SearchHit {
  id: string; // Section ID: "transcript:§42"
  anchor: string; // Display anchor: "§42"
  title: string; // Section title
  snippet: string; // Highlighted excerpt (max ~200 chars)
  score: number; // Relevance score (0-1)
  matchType: "title" | "body" | "both";
  wordCount: number; // Section word count for context
}

export interface SearchResult {
  query: string;
  hits: SearchHit[];
  totalMatches: number;
  searchTimeMs: number;
}

// ============================================================================
// Section Loading
// ============================================================================

let sectionsCache: Section[] | null = null;
let cacheTimestamp: number | null = null;

/**
 * Load all transcript sections from the corpus.
 *
 * NOTE: This function caches in-memory for repeated server-side calls.
 * When using TanStack Query, this complements client-side caching.
 *
 * @returns Promise resolving to array of parsed sections
 */
async function loadSections(): Promise<Section[]> {
  if (sectionsCache) return sectionsCache;

  const { content } = await readCorpusDoc("transcript");
  const { sections } = parseTranscript(content);

  sectionsCache = sections;
  cacheTimestamp = Date.now();

  return sections;
}

// ============================================================================
// Search Implementation
// ============================================================================

/**
 * Search the corpus for matching sections.
 *
 * @param query - Search query string
 * @param limit - Maximum number of results (default 10)
 * @returns SearchResult with ranked hits
 */
export async function searchCorpus(query: string, limit = 10): Promise<SearchResult> {
  const startTime = performance.now();

  // Normalize query
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return {
      query,
      hits: [],
      totalMatches: 0,
      searchTimeMs: 0,
    };
  }

  const sections = await loadSections();

  // Find matches in title and body
  const titleMatches = new Set(
    searchSectionsByTitle(sections, normalizedQuery).map((s) => s.id)
  );
  const bodyMatches = new Set(
    searchSectionsByContent(sections, normalizedQuery).map((s) => s.id)
  );

  // Combine and deduplicate
  const allMatchIds = new Set([...titleMatches, ...bodyMatches]);
  const matchedSections = sections.filter((s) => allMatchIds.has(s.id));

  // Score and sort
  const scoredHits = matchedSections.map((section) => {
    const inTitle = titleMatches.has(section.id);
    const inBody = bodyMatches.has(section.id);

    return {
      section,
      score: computeScore(section, normalizedQuery, inTitle, inBody),
      matchType: (inTitle && inBody ? "both" : inTitle ? "title" : "body") as
        | "title"
        | "body"
        | "both",
    };
  });

  scoredHits.sort((a, b) => b.score - a.score);

  // Build result
  const hits: SearchHit[] = scoredHits.slice(0, limit).map(({ section, score, matchType }) => ({
    id: section.id,
    anchor: section.anchor,
    title: section.title,
    snippet: extractSnippet(section.plainText, normalizedQuery),
    score,
    matchType,
    wordCount: section.wordCount,
  }));

  const endTime = performance.now();

  return {
    query,
    hits,
    totalMatches: matchedSections.length,
    searchTimeMs: Math.round(endTime - startTime),
  };
}

/**
 * Compute relevance score for a section.
 *
 * Scoring factors:
 * - Title match: 0.4 boost
 * - Body match: 0.2 boost
 * - Query frequency: up to 0.3 based on occurrences
 * - Position: 0.1 boost if query appears early in text
 */
function computeScore(
  section: Section,
  query: string,
  inTitle: boolean,
  inBody: boolean
): number {
  let score = 0;

  // Base score for any match
  score += 0.1;

  // Title match bonus
  if (inTitle) {
    score += 0.4;
    // Exact title match bonus
    if (section.title.toLowerCase() === query) {
      score += 0.2;
    }
  }

  // Body match bonus
  if (inBody) {
    score += 0.2;
  }

  // Frequency bonus (capped)
  const text = section.plainText.toLowerCase();
  const occurrences = countOccurrences(text, query);
  const frequencyScore = Math.min(occurrences / 10, 1) * 0.3;
  score += frequencyScore;

  // Position bonus (early match)
  const firstIndex = text.indexOf(query);
  if (firstIndex !== -1 && firstIndex < 500) {
    score += 0.1 * (1 - firstIndex / 500);
  }

  return Math.min(score, 1); // Cap at 1
}

/**
 * Count occurrences of query in text.
 */
function countOccurrences(text: string, query: string): number {
  let count = 0;
  let pos = 0;
  while ((pos = text.indexOf(query, pos)) !== -1) {
    count++;
    pos += query.length;
  }
  return count;
}

/**
 * Extract a snippet around the first match with context.
 *
 * @param text - Full plain text
 * @param query - Search query
 * @param maxLength - Maximum snippet length (default 200)
 * @returns Snippet with ellipsis and highlighted match
 */
function extractSnippet(text: string, query: string, maxLength = 200): string {
  const lowerText = text.toLowerCase();
  const matchIndex = lowerText.indexOf(query);

  if (matchIndex === -1) {
    // No match, return start of text
    return text.slice(0, maxLength) + (text.length > maxLength ? "..." : "");
  }

  // Calculate window around match
  const contextBefore = 50;
  const contextAfter = maxLength - contextBefore - query.length;

  let start = Math.max(0, matchIndex - contextBefore);
  let end = Math.min(text.length, matchIndex + query.length + contextAfter);

  // Adjust to word boundaries
  if (start > 0) {
    const spaceIndex = text.indexOf(" ", start);
    if (spaceIndex !== -1 && spaceIndex < matchIndex) {
      start = spaceIndex + 1;
    }
  }

  if (end < text.length) {
    const spaceIndex = text.lastIndexOf(" ", end);
    if (spaceIndex !== -1 && spaceIndex > matchIndex + query.length) {
      end = spaceIndex;
    }
  }

  let snippet = text.slice(start, end);

  // Add ellipsis
  if (start > 0) {
    snippet = "..." + snippet;
  }
  if (end < text.length) {
    snippet = snippet + "...";
  }

  return snippet;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get a specific section by anchor.
 */
export async function getSectionByAnchor(anchor: string): Promise<Section | undefined> {
  const sections = await loadSections();
  return sections.find((s) => s.anchor === anchor);
}

/**
 * Get a specific section by number.
 */
export async function getSectionByNumber(num: number): Promise<Section | undefined> {
  const sections = await loadSections();
  return sections.find((s) => s.sectionNumber === num);
}

/**
 * Get all sections (for listing/browsing).
 */
export async function getAllSections(): Promise<Section[]> {
  return loadSections();
}

/**
 * Return basic cache stats for diagnostics/tests.
 */
export function getCacheStats(): { cached: boolean; timestamp: number } {
  return {
    cached: Boolean(sectionsCache),
    timestamp: cacheTimestamp ?? 0,
  };
}

/**
 * Load all sections directly (exposed for use with TanStack Query).
 *
 * When using with Query, wrap this in a server action:
 * ```typescript
 * // In corpusActions.ts
 * export async function fetchAllSections() {
 *   return getAllSections();
 * }
 *
 * // In hook
 * const { data: sections } = useQuery({
 *   queryKey: ['corpus', 'sections'],
 *   queryFn: fetchAllSections,
 *   staleTime: 5 * 60 * 1000, // 5 minutes
 * });
 * ```
 */
export { loadSections };
