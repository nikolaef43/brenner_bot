/**
 * Domain Templates Module
 *
 * Provides domain-specific configuration for the Brenner Loop system.
 * Different research fields have different common confounds, effect size norms,
 * and research designs - this module encapsulates that domain knowledge.
 *
 * @example
 * ```typescript
 * import { getDomainTemplate, listDomainOptions } from "@/lib/brenner-loop/domains";
 *
 * // Get all domains for selection UI
 * const options = listDomainOptions();
 *
 * // Get full template for a domain
 * const psych = getDomainTemplate("psychology");
 * console.log(psych.confoundLibrary);
 * ```
 *
 * @see brenner_bot-ukd1.4 - FEATURE: Domain Templates
 */

// Re-export types
export type {
  DomainId,
  DomainTemplate,
  DomainConfound,
  ResearchDesign,
  EffectSizeNorms,
  LiteratureSource,
  CommonLevelSplits,
  GlossaryEntry,
  SessionDomainContext,
  DomainOption,
  ConfoundLookupResult,
} from "./types";

// Re-export templates and utilities
export {
  DOMAIN_TEMPLATES,
  getDomainTemplate,
  listDomainOptions,
  getDomainConfounds,
  getDomainQuoteTags,
  psychologyTemplate,
  epidemiologyTemplate,
  economicsTemplate,
  biologyMedicineTemplate,
  computerScienceTemplate,
  neuroscienceTemplate,
  physicsTemplate,
  customDomainTemplate,
} from "./templates";
