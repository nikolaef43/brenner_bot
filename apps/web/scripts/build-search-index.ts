#!/usr/bin/env bun
/**
 * Search Index Generation Script
 *
 * Builds a MiniSearch index from the corpus at build time.
 * Run with: bun scripts/build-search-index.ts
 *
 * @see brenner_bot-719
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import MiniSearch from "minisearch";

// Import parsers - use relative paths for build script
import { parseTranscript } from "../src/lib/transcript-parser";
import { parseDistillation } from "../src/lib/distillation-parser";
import { parseQuoteBank } from "../src/lib/quotebank-parser";
import { parseMetaprompt } from "../src/lib/metaprompt-parser";
import { CORPUS_DOCS, type DocCategory } from "../src/lib/corpus";
import {
  makeDistillationSectionDomId,
  makeTranscriptSectionDomId,
  quoteBankDomIdFromSectionId,
  slugifyHeadingForAnchor,
} from "../src/lib/anchors";

// ============================================================================
// Types
// ============================================================================

export interface SearchEntry {
  /** Unique identifier for this entry */
  id: string;
  /** Document ID for linking (e.g., "transcript", "distillation-opus-45") */
  docId: string;
  /** Document title for display */
  docTitle: string;
  /** Section title if applicable */
  sectionTitle?: string;
  /** Searchable text content */
  content: string;
  /** URL anchor for deep linking (e.g., "#section-42") */
  anchor?: string;
  /** Document category for filtering */
  category: DocCategory;
  /** Section number for transcripts */
  sectionNumber?: number;
  /** Quote reference for quote bank (e.g., "§57") */
  reference?: string;
}

interface IndexStats {
  totalEntries: number;
  byCategory: Record<string, number>;
  indexSizeBytes: number;
}

// ============================================================================
// Configuration
// ============================================================================

// Use import.meta.url for cross-runtime compatibility (works in Bun and Node)
const __dirname = new URL(".", import.meta.url).pathname;
const REPO_ROOT = resolve(__dirname, "../../..");
const OUTPUT_DIR = resolve(__dirname, "../public/search");
const OUTPUT_FILE = join(OUTPUT_DIR, "index.json");
const STATS_FILE = join(OUTPUT_DIR, "stats.json");

// Documents to index (skip raw responses for cleaner search)
const INDEXABLE_CATEGORIES: DocCategory[] = [
  "transcript",
  "quote-bank",
  "distillation",
  "metaprompt",
];

// ============================================================================
// Document Processing
// ============================================================================

function readCorpusFile(filename: string): string {
  // Try public/_corpus first (for build process)
  const publicPath = join(__dirname, "../public/_corpus", filename);
  if (existsSync(publicPath)) {
    return readFileSync(publicPath, "utf-8");
  }

  // Try repo root (for development)
  const repoPath = join(REPO_ROOT, filename);
  if (existsSync(repoPath)) {
    return readFileSync(repoPath, "utf-8");
  }

  throw new Error(`Corpus file not found: ${filename}`);
}

function processTranscript(docId: string, docTitle: string, content: string): SearchEntry[] {
  const entries: SearchEntry[] = [];
  const parsed = parseTranscript(content);

  for (const section of parsed.sections) {
    // Combine all content in the section
    const textParts: string[] = [];
    for (const item of section.content) {
      textParts.push(item.text);
    }

    entries.push({
      id: `${docId}-section-${section.number}`,
      docId,
      docTitle,
      sectionTitle: section.title,
      content: textParts.join(" "),
      anchor: `#${makeTranscriptSectionDomId(section.number)}`,
      category: "transcript",
      sectionNumber: section.number,
    });
  }

  return entries;
}

function processDistillation(docId: string, docTitle: string, content: string): SearchEntry[] {
  const entries: SearchEntry[] = [];
  const parsed = parseDistillation(content, docId);
  const includePartPrefix = parsed.parts.length > 1;

  let entryIndex = 0;
  for (const part of parsed.parts) {
    for (const section of part.sections) {
      // Extract text from content blocks
      const textParts: string[] = [];
      for (const block of section.content) {
        if (block.type === "paragraph") {
          textParts.push(block.text);
        } else if (block.type === "quote") {
          textParts.push(block.text);
        } else if (block.type === "list") {
          textParts.push(block.items.join(" "));
        } else if (block.type === "emphasis" || block.type === "code") {
          textParts.push(block.text);
        }
      }

      const domId = makeDistillationSectionDomId({
        title: section.title,
        partNumber: includePartPrefix ? part.number : undefined,
        index: entryIndex,
      });

      entries.push({
        id: `${docId}-section-${entryIndex++}`,
        docId,
        docTitle,
        sectionTitle: section.title,
        content: textParts.join(" "),
        anchor: `#${domId}`,
        category: "distillation",
      });
    }
  }

  // Also add preamble if present
  if (parsed.preamble) {
    entries.push({
      id: `${docId}-preamble`,
      docId,
      docTitle,
      sectionTitle: "Introduction",
      content: parsed.preamble,
      anchor: "#introduction",
      category: "distillation",
    });
  }

  return entries;
}

function processQuoteBank(docId: string, docTitle: string, content: string): SearchEntry[] {
  const entries: SearchEntry[] = [];
  const parsed = parseQuoteBank(content);

  let entryIndex = 0;
  for (const quote of parsed.quotes) {
    const domId = quoteBankDomIdFromSectionId(quote.sectionId);

    entries.push({
      id: `${docId}-${entryIndex++}-${quote.sectionId}`,
      docId,
      docTitle,
      sectionTitle: quote.title,
      content: `${quote.quote} ${quote.context} ${quote.tags.join(" ")}`,
      anchor: `#${domId}`,
      category: "quote-bank",
      reference: quote.sectionId,
    });
  }

  return entries;
}

function processMetaprompt(docId: string, docTitle: string, content: string): SearchEntry[] {
  const entries: SearchEntry[] = [];
  const parsed = parseMetaprompt(content);

  let entryIndex = 0;
  for (const section of parsed.sections) {
    const sectionAnchor = slugifyHeadingForAnchor(section.title) || `section-${entryIndex}`;

    entries.push({
      id: `${docId}-section-${entryIndex++}`,
      docId,
      docTitle,
      sectionTitle: section.title,
      content: section.content,
      anchor: `#${sectionAnchor}`,
      category: "metaprompt",
    });
  }

  return entries;
}

// ============================================================================
// Index Building
// ============================================================================

function buildIndex(): { entries: SearchEntry[]; miniSearchIndex: object; stats: IndexStats; buildTimeMs: number } {
  const startTime = Date.now();
  const entries: SearchEntry[] = [];
  const byCategory: Record<string, number> = {};

  console.log("Building search index...\n");

  // Process each document
  for (const doc of CORPUS_DOCS) {
    if (!INDEXABLE_CATEGORIES.includes(doc.category)) {
      console.log(`  Skipping ${doc.id} (category: ${doc.category})`);
      continue;
    }

    console.log(`  Processing ${doc.id}...`);

    try {
      const content = readCorpusFile(doc.filename);
      let docEntries: SearchEntry[] = [];

      switch (doc.category) {
        case "transcript":
          docEntries = processTranscript(doc.id, doc.title, content);
          break;
        case "distillation":
          docEntries = processDistillation(doc.id, doc.title, content);
          break;
        case "quote-bank":
          docEntries = processQuoteBank(doc.id, doc.title, content);
          break;
        case "metaprompt":
          docEntries = processMetaprompt(doc.id, doc.title, content);
          break;
      }

      entries.push(...docEntries);
      byCategory[doc.category] = (byCategory[doc.category] || 0) + docEntries.length;
      console.log(`    → ${docEntries.length} entries`);
    } catch (error) {
      console.error(`    ✗ Error: ${error}`);
    }
  }

  console.log(`\n  Total entries: ${entries.length}`);

  // Build MiniSearch index
  console.log("\n  Building MiniSearch index...");

  const miniSearch = new MiniSearch<SearchEntry>({
    fields: ["content", "sectionTitle", "docTitle"],
    storeFields: ["docId", "docTitle", "sectionTitle", "anchor", "category", "sectionNumber", "reference"],
    searchOptions: {
      prefix: true,
      fuzzy: 0.2,
      boost: { sectionTitle: 2, docTitle: 1.5, content: 1 },
    },
  });

  miniSearch.addAll(entries);

  const miniSearchIndex = miniSearch.toJSON();
  const indexJson = JSON.stringify(miniSearchIndex);
  const buildTimeMs = Date.now() - startTime;

  const stats: IndexStats = {
    totalEntries: entries.length,
    byCategory,
    indexSizeBytes: Buffer.byteLength(indexJson, "utf-8"),
  };

  console.log(`  Index size: ${(stats.indexSizeBytes / 1024).toFixed(2)} KB`);
  console.log(`  Build time: ${buildTimeMs}ms`);

  return { entries, miniSearchIndex, stats, buildTimeMs };
}

// ============================================================================
// Main
// ============================================================================

function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║           SEARCH INDEX BUILDER                           ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}\n`);
  }

  // Build the index
  const { miniSearchIndex, stats, buildTimeMs } = buildIndex();

  // Write index file
  writeFileSync(OUTPUT_FILE, JSON.stringify(miniSearchIndex) + "\n");
  console.log(`\n✓ Index written to: ${OUTPUT_FILE}`);

  // Write stats file
  writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2) + "\n");
  console.log(`✓ Stats written to: ${STATS_FILE}`);

  // Summary
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║                    BUILD COMPLETE                        ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log(`║  Total entries: ${String(stats.totalEntries).padEnd(42)}║`);
  console.log(`║  Index size: ${((stats.indexSizeBytes / 1024).toFixed(2) + " KB").padEnd(45)}║`);
  console.log(`║  Build time: ${(buildTimeMs + "ms").padEnd(45)}║`);
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log("║  By category:                                            ║");
  for (const [category, count] of Object.entries(stats.byCategory)) {
    console.log(`║    ${category}: ${String(count).padEnd(48)}║`);
  }
  console.log("╚══════════════════════════════════════════════════════════╝\n");
}

main();
