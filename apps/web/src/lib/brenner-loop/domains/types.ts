/**
 * Domain Templates - Pre-Configured Guidance by Field
 *
 * Different research domains have different:
 * - Common confounds to check
 * - Standard research designs
 * - Effect size norms
 * - Literature databases
 * - Terminology
 *
 * This module provides domain-specific templates that customize
 * the Brenner Loop experience based on the user's research field.
 *
 * @see brenner_bot-ukd1.4 - FEATURE: Domain Templates
 * @see brenner_bot-ukd1 - EPIC: Semantic Search & Intelligence
 */

// ============================================================================
// Core Domain Types
// ============================================================================

/**
 * Unique identifier for a domain template.
 * Uses lowercase snake_case for consistency with other identifiers.
 */
export type DomainId =
  | "psychology"
  | "epidemiology"
  | "economics"
  | "biology_medicine"
  | "computer_science"
  | "physics"
  | "neuroscience"
  | "custom";

/**
 * A confound type specific to a domain.
 * These are pre-defined confounds that researchers commonly encounter.
 */
export interface DomainConfound {
  /** Unique identifier within the domain */
  id: string;

  /** Display name (e.g., "Selection Bias", "Demand Characteristics") */
  name: string;

  /** Detailed description of the confounding mechanism */
  description: string;

  /** When this confound typically appears */
  whenToCheck: string;

  /** How to address or mitigate this confound */
  mitigationStrategies: string[];

  /** Estimated base likelihood (0-1) as a starting prior */
  baseLikelihood: number;

  /**
   * Brenner transcript section numbers that discuss this confound.
   * Used for surfacing relevant quotes.
   */
  relevantSections?: number[];
}

/**
 * A standard research design used in a domain.
 */
export interface ResearchDesign {
  /** Short identifier (e.g., "rct", "cohort", "case_control") */
  id: string;

  /** Display name (e.g., "Randomized Controlled Trial") */
  name: string;

  /** Description of the design */
  description: string;

  /** How powerful this design is for causal inference (1-10) */
  discriminativePower: number;

  /** How feasible this design is to implement */
  feasibility: "high" | "medium" | "low";

  /** Example use case */
  exampleUse: string;

  /** Common confounds this design addresses */
  addressesConfounds: string[];

  /** Common confounds this design is vulnerable to */
  vulnerableTo: string[];
}

/**
 * Effect size norms for a domain.
 * Used to contextualize findings (e.g., "Is this effect large for psychology?")
 */
export interface EffectSizeNorms {
  /** The primary effect size metric used (e.g., "Cohen's d", "Odds Ratio") */
  metric: string;

  /** What counts as a small effect */
  small: number;

  /** What counts as a medium effect */
  medium: number;

  /** What counts as a large effect */
  large: number;

  /** Narrative description of typical effects in this domain */
  typicalDescription: string;

  /** Any important caveats about interpreting effect sizes */
  caveats?: string;
}

/**
 * A literature source useful for a domain.
 */
export interface LiteratureSource {
  /** Display name (e.g., "PubMed", "PsycINFO") */
  name: string;

  /** URL to the resource */
  url: string;

  /** Tips for effective searching */
  searchTips: string;

  /** Whether this is a primary or secondary source */
  priority: "primary" | "secondary";
}

/**
 * Common level splits for a domain (for the Σ operator).
 * These suggest how to decompose causes and effects into levels.
 */
export interface CommonLevelSplits {
  /** Common X (cause) decompositions */
  cause: string[];

  /** Common Y (effect) decompositions */
  effect: string[];

  /** Common moderating variables */
  moderators?: string[];

  /** Common mediating variables */
  mediators?: string[];
}

/**
 * A glossary entry for domain-specific terminology.
 */
export interface GlossaryEntry {
  /** The term being defined */
  term: string;

  /** Definition of the term */
  definition: string;

  /** Related terms */
  relatedTerms?: string[];
}

// ============================================================================
// Domain Template Interface
// ============================================================================

/**
 * A complete domain template with all domain-specific configuration.
 */
export interface DomainTemplate {
  /** Unique identifier for this domain */
  id: DomainId;

  /** Display name (e.g., "Psychology", "Epidemiology") */
  name: string;

  /** Short description of the domain */
  description: string;

  /** Icon name for UI display (from Lucide or similar) */
  icon: string;

  /** Color theme for this domain (Tailwind color class) */
  colorClass: string;

  /** Common confounds in this domain */
  confoundLibrary: DomainConfound[];

  /** Standard research designs */
  researchDesigns: ResearchDesign[];

  /** Effect size norms and context */
  effectSizeNorms: EffectSizeNorms;

  /** Literature sources for this domain */
  literatureSources: LiteratureSource[];

  /** Common level splits for the Σ operator */
  commonLevelSplits: CommonLevelSplits;

  /** Domain-specific glossary */
  glossary: GlossaryEntry[];

  /**
   * Brenner transcript section numbers particularly relevant to this domain.
   * Used to surface contextual quotes.
   */
  relevantBrennerSections: number[];

  /**
   * Tags from the quote bank that are most relevant to this domain.
   * Used for semantic search filtering.
   */
  relevantQuoteTags: string[];

  /**
   * Example hypotheses in this domain (for onboarding).
   */
  exampleHypotheses?: string[];
}

// ============================================================================
// Domain Context for Sessions
// ============================================================================

/**
 * Domain context attached to a session.
 * This is stored with the session and used to customize the experience.
 */
export interface SessionDomainContext {
  /** The primary domain for this session */
  primaryDomain: DomainId;

  /** Optional secondary domains (for interdisciplinary research) */
  secondaryDomains?: DomainId[];

  /** Custom confounds added by the user beyond the domain defaults */
  customConfounds?: DomainConfound[];

  /** User's familiarity level with the domain */
  familiarityLevel?: "novice" | "intermediate" | "expert";

  /** When the domain was selected */
  selectedAt: Date;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * A simplified domain option for UI selection.
 */
export interface DomainOption {
  id: DomainId;
  name: string;
  description: string;
  icon: string;
  colorClass: string;
}

/**
 * Result of looking up confounds for a hypothesis.
 */
export interface ConfoundLookupResult {
  /** Suggested confounds based on domain */
  suggested: DomainConfound[];

  /** Confounds that are highly relevant based on hypothesis content */
  highRelevance: DomainConfound[];

  /** Total confounds in the domain library */
  totalAvailable: number;
}
