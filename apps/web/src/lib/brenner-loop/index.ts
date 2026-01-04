/**
 * Brenner Loop Module
 *
 * Core data models and utilities for the Brenner Loop hypothesis engine.
 * This module provides the foundational types for discriminative hypothesis testing.
 *
 * @module brenner-loop
 */

// Re-export everything from hypothesis module
export {
  // Core interfaces
  type HypothesisCard,
  type IdentifiedConfound,

  // Validation types
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
  type ValidationErrorCode,
  type ValidationWarningCode,

  // Validation functions
  validateHypothesisCard,
  validateConfound,

  // Type guards
  isHypothesisCard,
  isIdentifiedConfound,

  // Factory functions
  generateHypothesisCardId,
  generateConfoundId,
  createHypothesisCard,
  evolveHypothesisCard,

  // Utility functions
  calculateFalsifiabilityScore,
  calculateSpecificityScore,
  interpretConfidence,
} from "./hypothesis";
