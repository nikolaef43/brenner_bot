# Search Library Decision

**Date**: 2025-12-29
**Author**: PurpleDog
**Status**: Decided

## Summary

**Decision: MiniSearch** is the recommended full-text search library for the Brenner Bot corpus search feature.

## Benchmark Results

Tested on 436 document sections (488K characters) from the corpus:

| Library     | Build Time | Avg Search | Index Size | Bundle Size |
|-------------|------------|------------|------------|-------------|
| FlexSearch  | 131ms      | 0.12ms     | N/A*       | ~20KB       |
| MiniSearch  | 92ms       | 0.89ms     | 1015KB     | ~7KB        |
| Fuse.js     | 6ms        | 6.35ms     | N/A        | ~10KB       |

*FlexSearch uses async export, not directly comparable

### Search Quality (Results per Query)

| Query             | FlexSearch | MiniSearch | Fuse.js |
|-------------------|------------|------------|---------|
| C. elegans        | 10         | 422        | 0       |
| genetics          | 10         | 54         | 9       |
| exclusion testing | 0          | 14         | 1       |
| molecular biology | 10         | 89         | 2       |
| Sydney Brenner    | 7          | 370        | 1       |
| hypothesis        | 10         | 43         | 6       |
| experiment        | 10         | 131        | 12      |

## Analysis

### FlexSearch
**Pros:**
- Fastest search times (0.12ms avg)
- Memory efficient
- Async search option

**Cons:**
- Lower result recall (stricter matching)
- More complex API
- Larger bundle (~20KB)
- Complex serialization for prebuilt indexes

### MiniSearch (Winner)
**Pros:**
- Excellent balance of speed (0.89ms avg) and recall
- Smallest bundle size (~7KB gzipped)
- Built-in prefix matching (perfect for search-as-you-type)
- Simple, clean API
- Easy serialization for prebuilt indexes
- Good relevance scoring

**Cons:**
- Slower than FlexSearch (still sub-millisecond)
- Larger index size (1MB) - but acceptable for our corpus

### Fuse.js
**Pros:**
- Fastest build time (6ms)
- Good fuzzy matching
- Very popular library

**Cons:**
- Slowest search (6.35ms avg)
- Poor recall for exact phrases ("C. elegans" returns 0)
- Fuzzy matching may not be desired for this use case

## Decision Rationale

MiniSearch is the best fit because:

1. **Search-as-you-type UX**: Built-in prefix matching means results appear as users type, without waiting for full words

2. **Excellent recall**: Finds 422 matches for "C. elegans" vs FlexSearch's 10, ensuring users find what they're looking for

3. **Sub-millisecond search**: 0.89ms is well under our 50ms target and imperceptible to users

4. **Smallest bundle**: ~7KB gzipped has minimal impact on initial page load

5. **Simple API**: Clean, well-documented interface reduces implementation complexity

6. **Prebuilt index support**: `toJSON()` and `loadJSON()` enable build-time index generation

## Implementation Notes

```typescript
import MiniSearch from 'minisearch';

// Build index at build time
const miniSearch = new MiniSearch({
  fields: ['title', 'content'],
  storeFields: ['title', 'content', 'anchor'],
  searchOptions: {
    prefix: true,  // Enable search-as-you-type
    fuzzy: 0.2,    // Light fuzzy matching for typos
    boost: { title: 2 }  // Boost title matches
  }
});

// Search with relevance
const results = miniSearch.search(query, { prefix: true });
```

## Next Steps

1. Build search index generation script (`brenner_bot-719`)
2. Implement client-side search engine wrapper (`brenner_bot-3vc`)
3. Build Search UI/UX (`brenner_bot-d4p`)
