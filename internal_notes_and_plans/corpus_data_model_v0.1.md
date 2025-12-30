# Brenner Corpus Data Model v0.1

> **Status**: Draft specification
> **Purpose**: Canonical data model for transcript sections and corpus indexing
> **Scope**: Transcript parser, search API, excerpt builder, citation links

---

## Overview

The Brenner corpus consists of primary source documents (transcripts, distillations, quote banks) that need to be:

1. **Parsed** into structured sections with stable identifiers
2. **Searchable** with ranked results returning snippets and anchors
3. **Citable** using stable `§n` anchors that won't change

This specification defines:
- What constitutes a section
- The data model for corpus entries
- Rules for stable, collision-free identifiers
- Anchor conventions for citations

---

## Section Anchor Convention (`§n`)

### Format

Section anchors use the format `§{N}` where:
- `§` is the Unicode section sign (U+00A7)
- `{N}` is the integer section number (1-indexed, no leading zeros)

**Examples**: `§1`, `§42`, `§236`

### Anchor Rules

1. **Unique per document**: Each `§n` anchor is unique within a single source document
2. **Immutable**: Once a section is numbered, its `§n` anchor never changes
3. **Monotonic**: Section numbers increase sequentially from 1
4. **No gaps**: If `§n` exists, then `§1` through `§(n-1)` also exist

### Extended Anchors (Future)

For subsection references (not yet implemented):
- `§42.p3` — paragraph 3 within section 42
- `§42.q1` — interviewer question 1 within section 42
- `§42.L15` — line 15 within section 42

---

## Corpus Entry Schema

### Section Type

Each parsed section from the transcript produces a `Section` entry:

```typescript
interface Section {
  // === Identity ===
  id: string;           // Stable ID: "{sourceId}:§{n}" e.g., "transcript:§42"
  sectionNumber: number; // The integer N in §N (1-236 for main transcript)
  anchor: string;       // The display anchor: "§42"

  // === Content ===
  title: string;        // Section heading, e.g., "Coming from Eastern European stock"
  body: string;         // Full markdown body (blockquotes, questions, etc.)
  plainText: string;    // Body stripped of markdown for search indexing

  // === Source ===
  sourceId: string;     // Parent document ID: "transcript", "quote-bank", etc.
  sourceTitle: string;  // Parent document title for display

  // === Metadata ===
  lineStart: number;    // 1-indexed line number where section starts in source
  lineEnd: number;      // 1-indexed line number where section ends
  charStart: number;    // 0-indexed character offset in source
  charEnd: number;      // 0-indexed character offset (exclusive)
  wordCount: number;    // Approximate word count of body
}
```

### Corpus Document Type

Each top-level corpus document has a `CorpusDoc` entry:

```typescript
interface CorpusDoc {
  // === Identity ===
  id: string;           // Stable slug: "transcript", "quote-bank", etc.

  // === Content ===
  title: string;        // Human-readable title
  filename: string;     // Filename in repo root: "complete_brenner_transcript.md"

  // === Structure ===
  sectionCount: number; // Number of §n sections (236 for transcript)
  hasSections: boolean; // True if document has parseable sections

  // === Metadata ===
  wordCount: number;    // Total word count
  lastModified?: Date;  // Last modification time (if tracked)
}
```

### Quote Entry Type (Future)

For the quote bank with operator/motif tagging:

```typescript
interface Quote {
  id: string;           // Stable ID: "quote:{n}" e.g., "quote:1"
  text: string;         // Verbatim quote text
  anchor: string;       // Source anchor: "§42"
  sourceSection: string; // Full section ID: "transcript:§42"

  // === Tagging ===
  operators: string[];  // Brenner operators: ["⊘", "✂", "⟂"]
  motifs: string[];     // Thematic tags: ["organism-choice", "digital-handle"]

  // === Provenance ===
  addedAt: Date;
  addedBy?: string;     // Agent or human who added it
}
```

---

## Stable ID Rules

### Principles

1. **Deterministic**: The same source content always produces the same IDs
2. **Collision-free**: No two items share an ID within their scope
3. **Human-readable**: IDs should be meaningful, not random hashes
4. **Stable across edits**: Minor content changes don't invalidate IDs

### ID Formats

| Type | Format | Example | Notes |
|------|--------|---------|-------|
| Corpus Document | `{slug}` | `transcript` | Lowercase, hyphen-separated |
| Section | `{sourceId}:§{n}` | `transcript:§42` | Includes source prefix |
| Quote | `quote:{n}` | `quote:1` | Sequential within quote bank |
| Search Result | `hit:{sourceId}:§{n}:{offset}` | `hit:transcript:§42:150` | Includes char offset for dedup |

### ID Assignment Rules

1. **Document IDs**: Manually assigned in `CORPUS_DOCS` array; never change
2. **Section IDs**: Derived from parsing; stable as long as section order unchanged
3. **Quote IDs**: Assigned sequentially when added to quote bank
4. **Search Result IDs**: Generated at query time, not persisted

### Handling ID Stability

If the transcript is restructured (sections added/removed/reordered):
- **DO NOT** renumber existing sections
- **DO** add new sections at the end with new numbers
- **DO** mark removed sections as deprecated (not deleted)
- **DO** document any numbering changes in a changelog

---

## Transcript Section Parsing

### Source Format

The transcript (`complete_brenner_transcript.md`) uses this structure:

```markdown
# Sydney Brenner: Complete Transcript Collection

*A collection of 236 video transcripts from Web of Stories*

(Copyright Web Of Stories, 2025, All Rights Reserved)

---

## 1. Coming from Eastern European stock

> Both my parents had come to South Africa from Russia...
>
> His brother, who is someone I remembered very well...

---

## 2. Mother and father

> Well, my father was a shoemaker...

*[Q] But he couldn't read or write?*

> Could not read or write...

---
```

### Parsing Rules

1. **Section Start**: Line matching `^## (\d+)\. (.+)$`
   - Group 1: Section number
   - Group 2: Section title

2. **Section End**: Next section start OR end of file

3. **Body Content**: All content between section header and section end
   - Excludes the `---` separator lines
   - Preserves blockquotes (`>`) and question markers (`*[Q]*`)

4. **Ignored Content**:
   - Document header (title, subtitle, copyright)
   - Horizontal rules (`---`) used as separators

### Expected Output

For the main transcript (236 sections):

| Field | Example (§1) | Example (§236) |
|-------|--------------|----------------|
| `id` | `transcript:§1` | `transcript:§236` |
| `sectionNumber` | `1` | `236` |
| `anchor` | `§1` | `§236` |
| `title` | `Coming from Eastern European stock` | `Scientific heroes` |
| `sourceId` | `transcript` | `transcript` |

---

## Search Indexing

### Searchable Fields

| Field | Weight | Notes |
|-------|--------|-------|
| `title` | High | Section heading, exact match boost |
| `plainText` | Medium | Stripped body content |
| `operators` | High | Quote bank only, exact match |
| `motifs` | Medium | Quote bank only, fuzzy match |

### Search Result Type

```typescript
interface SearchHit {
  id: string;           // Section or quote ID
  anchor: string;       // Display anchor: "§42"
  title: string;        // Section title for context
  snippet: string;      // Highlighted excerpt (max 200 chars)
  score: number;        // Relevance score (0-1)
  matchType: "title" | "body" | "operator" | "motif";
}
```

---

## Validation Rules

### Document-Level

- [ ] Document ID is lowercase, uses only `[a-z0-9-]`
- [ ] Document has a title
- [ ] Document filename exists in repo

### Section-Level

- [ ] Section number is positive integer
- [ ] Section numbers are sequential (1, 2, 3... no gaps)
- [ ] Section has non-empty title
- [ ] Section has non-empty body
- [ ] Section ID is unique within corpus

### Quote-Level

- [ ] Quote references valid section anchor
- [ ] Quote text appears in referenced section (fuzzy match OK)
- [ ] Operators are from valid operator set

---

## Implementation Notes

### Parser Implementation

The parser should be:
1. **Streaming-friendly**: Process line-by-line for large files
2. **Error-tolerant**: Log warnings for malformed sections, don't crash
3. **Deterministic**: Same input always produces same output
4. **Testable**: Unit tests with expected section counts and content samples

### Index Storage

Options (to be decided in brenner_bot-5so.2.2.1):
1. **Runtime parsing**: Parse on each request (simple, cold start cost)
2. **Prebuilt JSON index**: Generated at build time (fast, needs rebuild)
3. **SQLite FTS**: Full-text search index (powerful, more complexity)

Recommendation: Start with runtime parsing for simplicity, migrate to prebuilt index if cold start becomes a problem.

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2025-12-29 | Initial specification |
