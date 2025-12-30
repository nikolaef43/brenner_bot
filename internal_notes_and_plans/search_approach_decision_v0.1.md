# Search Approach Decision v0.1

> **Status**: Decision documented
> **Task**: brenner_bot-5so.2.2.1
> **Decision**: Runtime parsing with in-memory search
> **Date**: 2025-12-29

---

## Context

The Brenner corpus needs to be searchable. This decision evaluates runtime parsing vs prebuilt index approaches.

---

## Constraints Analyzed

### Corpus Size

| Metric | Value |
|--------|-------|
| File size | 485 KB |
| Sections | 236 |
| Total words | ~86,000 |
| Parse time | ~12ms |

### Vercel Serverless Limits

| Limit | Value | Impact |
|-------|-------|--------|
| Default timeout | 10s | Parse time (12ms) is well under limit |
| Bundle size | 50MB | Corpus (485KB) is negligible |
| Memory | 1024MB default | Parsed sections (~1-2MB in memory) is negligible |
| Cold start | Variable | First request parses file; subsequent requests can cache |

### Implementation Complexity

| Approach | Complexity | Maintenance |
|----------|------------|-------------|
| Runtime parsing | Low | None - source file is authoritative |
| Prebuilt JSON index | Medium | Rebuild step required on corpus changes |
| SQLite FTS | High | Database management, Vercel edge considerations |

---

## Decision: Runtime Parsing with In-Memory Search

### Recommendation

Use **runtime parsing** for the initial implementation:

1. **Parse on first request**: Use `parseTranscript()` from `transcriptParser.ts`
2. **Cache in module scope**: Store parsed sections in a module-level variable
3. **Search in memory**: Use simple string matching on `plainText` field

### Rationale

1. **Corpus is small**: 485KB parses in 12ms - negligible overhead
2. **Simplicity**: No build step, no generated files, source is authoritative
3. **Maintainability**: Changes to transcript are immediately reflected
4. **Vercel-friendly**: Works with both Node.js runtime and Edge (with caching)

### Implementation Sketch

```typescript
// lib/corpusSearch.ts

import { parseTranscript, Section, searchSectionsByContent } from './transcriptParser';
import { readCorpusDoc } from './corpus';

let cachedSections: Section[] | null = null;

async function getSections(): Promise<Section[]> {
  if (cachedSections) return cachedSections;

  const { content } = await readCorpusDoc('transcript');
  const { sections } = parseTranscript(content);
  cachedSections = sections;
  return sections;
}

export async function searchCorpus(query: string, limit = 10): Promise<SearchHit[]> {
  const sections = await getSections();
  const matches = searchSectionsByContent(sections, query);

  return matches.slice(0, limit).map(section => ({
    id: section.id,
    anchor: section.anchor,
    title: section.title,
    snippet: extractSnippet(section.plainText, query),
    score: computeScore(section, query),
  }));
}
```

---

## Future Considerations

### When to Migrate to Prebuilt Index

Migrate if any of these become true:
- [ ] Parse time exceeds 100ms
- [ ] Corpus grows beyond 5MB
- [ ] Need for fuzzy matching or advanced ranking
- [ ] Cold start becomes problematic in production metrics

### Potential Enhancements (Not Now)

1. **TF-IDF scoring**: Better ranking than substring match
2. **Operator tagging search**: Search by Brenner operators
3. **Semantic search**: Vector embeddings for concept matching
4. **Quote bank integration**: Cross-reference with tagged quotes

---

## Tradeoffs Summary

| Factor | Runtime Parsing | Prebuilt Index |
|--------|-----------------|----------------|
| Simplicity | ++ | - |
| Cold start | + (12ms) | ++ (instant) |
| Rebuild needed | No | Yes |
| Bundle size | + (source only) | - (index adds ~1-2MB) |
| Search quality | Basic substring | Can be more sophisticated |
| Maintenance | None | Generator script |

**Verdict**: For a 485KB corpus with 12ms parse time, the simplicity of runtime parsing outweighs the marginal cold start improvement of a prebuilt index.

---

## Action Items

1. [x] Evaluate constraints (this document)
2. [ ] Implement `corpusSearch.ts` with caching (next task)
3. [ ] Add search API route (future task)
4. [ ] Monitor cold start times in production (future task)
