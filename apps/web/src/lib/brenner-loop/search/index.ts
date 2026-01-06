/**
 * Search Module Index
 *
 * Re-exports public APIs for semantic search and similarity functions.
 *
 * @module brenner-loop/search
 */

// Embeddings
export {
  embedText,
  cosineSimilarity,
  EMBEDDING_DIMENSION,
} from "./embeddings";

// Hypothesis Similarity
export {
  // Types
  type IndexedHypothesis,
  type SimilarityMatch,
  type SimilaritySearchConfig,
  // Embedding helpers
  hypothesisToSearchText,
  embedHypothesis,
  cardToIndexed,
  // Domain similarity
  domainSimilarity,
  // Similarity computation
  computeSimilarity,
  // Search functions
  findSimilarHypotheses,
  searchHypothesesByText,
  clusterSimilarHypotheses,
  findDuplicates,
  getSimilarityStats,
  // Storage integration
  storageToIndexed,
  storageToIndexedBatch,
} from "./hypothesis-similarity";

// Quote matching
export {
  embeddingEntryToQuote,
  buildQuoteQueryText,
  filterQuoteEntriesByTags,
  findSimilarQuotes,
  // Operator-aware quote matching (bead brenner_bot-v2zy)
  type RankedQuote,
  OPERATOR_QUOTE_KEYWORDS,
  computeOperatorRelevance,
  findRelevantQuotes,
  getOperatorQuotes,
} from "./quote-matcher";
