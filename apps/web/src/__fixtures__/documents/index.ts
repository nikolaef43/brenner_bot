/**
 * Document Fixtures
 *
 * Realistic document fixtures for testing viewer components and parsers.
 * Based on actual Brenner transcript structure and content.
 *
 * Philosophy: NO mocks - use data that mirrors real corpus structure.
 */

// ============================================================================
// Types
// ============================================================================

export interface DocumentSection {
  number: number;
  title: string;
  text: string;
  anchors: string[];
  highlights?: string[];
  jargonTerms?: string[];
}

export interface TranscriptDocument {
  id: string;
  type: "transcript";
  title: string;
  subtitle?: string;
  sections: DocumentSection[];
  totalSections: number;
}

export interface DistillationDocument {
  id: string;
  type: "distillation";
  title: string;
  model: "opus-4.5" | "gpt-5.2" | "gemini-3";
  sections: DocumentSection[];
  totalSections: number;
}

export interface QuoteBankEntry {
  id: string;
  text: string;
  section: string;
  tags: string[];
  context?: string;
}

export interface QuoteBankDocument {
  id: string;
  type: "quote-bank";
  title: string;
  quotes: QuoteBankEntry[];
  tags: string[];
}

export interface MetapromptDocument {
  id: string;
  type: "metaprompt";
  title: string;
  content: string;
  version: string;
}

// ============================================================================
// Transcript Fixtures
// ============================================================================

/**
 * Minimal transcript with 2 sections for basic parsing tests.
 */
export const minimalTranscript: TranscriptDocument = {
  id: "test-transcript-minimal",
  type: "transcript",
  title: "Sydney Brenner Interview",
  subtitle: "A conversation about science",
  totalSections: 2,
  sections: [
    {
      number: 1,
      title: "Introduction",
      text: "This is what I always tell people. The key is to find the right problem.",
      anchors: ["§1"],
    },
    {
      number: 2,
      title: "C. elegans Selection",
      text: "The choice of C. elegans was crucial. It's transparent—you can see every cell.",
      anchors: ["§2"],
      highlights: ["C. elegans"],
    },
  ],
};

/**
 * Comprehensive transcript excerpt covering key Brenner concepts.
 * Uses real section numbers from the actual transcript.
 */
export const comprehensiveTranscript: TranscriptDocument = {
  id: "test-transcript-comprehensive",
  type: "transcript",
  title: "The Sydney Brenner Interview",
  subtitle: "Recorded 2015",
  totalSections: 8,
  sections: [
    {
      number: 58,
      title: "Reducing Complexity",
      text: "What we did was to reduce the problem to one dimension. Instead of having a three-dimensional puzzle of cells, we could now treat it as a linear sequence. The cell lineage is essentially a program that runs, and we can read it.",
      anchors: ["§58"],
      jargonTerms: ["dimensional reduction", "cell lineage"],
    },
    {
      number: 59,
      title: "Choice of Model Organism",
      text: "The choice of C. elegans was crucial. It's transparent—you can see every cell. It has exactly 959 somatic cells, and every animal develops identically. It's eutelic.",
      anchors: ["§59"],
      highlights: ["C. elegans", "959 somatic cells"],
      jargonTerms: ["eutelic", "model organism"],
    },
    {
      number: 103,
      title: "Third Alternative",
      text: "You've forgotten there's a third alternative. Both could be wrong. We proposed three models and people said which one is right? I said there's a third alternative—both could be wrong.",
      anchors: ["§103"],
      jargonTerms: ["third alternative"],
    },
    {
      number: 105,
      title: "Discriminative Tests",
      text: "Exclusion is always a tremendously good thing in science. If you can exclude something, you've done something positive. You've eliminated a whole family of explanations.",
      anchors: ["§105"],
      jargonTerms: ["exclusion", "discriminative test"],
    },
    {
      number: 125,
      title: "HAL Biology",
      text: "I had invented something called HAL biology. HAL, that's H-A-L, it stood for Have A Look biology. What's the use of doing a lot of biochemistry when you can just see what happened?",
      anchors: ["§125"],
      jargonTerms: ["HAL biology"],
    },
    {
      number: 210,
      title: "Routine Work",
      text: "Routine work generates its important problems. You don't sit there thinking up problems. The problems arise from the work itself.",
      anchors: ["§210"],
      jargonTerms: ["routine work"],
    },
    {
      number: 230,
      title: "Productive Ignorance",
      text: "I'm a great believer in the power of ignorance. When you know too much you're dangerous in the subject because you will deter originality. It is good to be ignorant about a new field.",
      anchors: ["§230"],
      jargonTerms: ["productive ignorance"],
    },
    {
      number: 236,
      title: "Working Out of Phase",
      text: "The best thing in science is to work out of phase. Either half a wavelength ahead or half a wavelength behind. It doesn't matter. But if you're out of phase with the fashion you can do new things.",
      anchors: ["§236"],
      jargonTerms: ["out of phase"],
    },
  ],
};

/**
 * Empty transcript for edge case testing.
 */
export const emptyTranscript: TranscriptDocument = {
  id: "test-transcript-empty",
  type: "transcript",
  title: "Empty Transcript",
  totalSections: 0,
  sections: [],
};

// ============================================================================
// Distillation Fixtures
// ============================================================================

/**
 * Opus 4.5 distillation excerpt.
 */
export const opusDistillation: DistillationDocument = {
  id: "distillation-opus-45",
  type: "distillation",
  title: "Brenner Method Distillation (Opus 4.5)",
  model: "opus-4.5",
  totalSections: 3,
  sections: [
    {
      number: 1,
      title: "The Two Axioms",
      text: "Reality has a generative grammar. The world is produced by causal machinery that operates according to discoverable rules. To understand is to be able to reconstruct.",
      anchors: [],
    },
    {
      number: 2,
      title: "Operator Algebra",
      text: "Level-split: Separate program from interpreter. Recode: Change representation. Exclusion-test: Derive forbidden patterns.",
      anchors: ["§105"],
      jargonTerms: ["level-split", "recode", "exclusion-test"],
    },
    {
      number: 3,
      title: "The Brenner Loop",
      text: "Hunt paradoxes. Formulate hypotheses. Design discriminative tests. Materialize predictions. Kill failing theories.",
      anchors: ["§103", "§105"],
      jargonTerms: ["brenner loop"],
    },
  ],
};

/**
 * GPT-5.2 distillation excerpt.
 */
export const gptDistillation: DistillationDocument = {
  id: "distillation-gpt-52",
  type: "distillation",
  title: "Brenner Method Distillation (GPT-5.2)",
  model: "gpt-5.2",
  totalSections: 2,
  sections: [
    {
      number: 1,
      title: "Objective Function",
      text: "Maximize expected information gain per unit time and cost. Evidence per week is the key metric.",
      anchors: [],
      jargonTerms: ["evidence per week"],
    },
    {
      number: 2,
      title: "Scoring Rubric",
      text: "Likelihood ratio (0-3). Cost (0-3). Speed (0-3). Ambiguity (0-3). Sum for total score.",
      anchors: [],
    },
  ],
};

/**
 * Gemini 3 distillation excerpt.
 */
export const geminiDistillation: DistillationDocument = {
  id: "distillation-gemini-3",
  type: "distillation",
  title: "Brenner Method Distillation (Gemini 3)",
  model: "gemini-3",
  totalSections: 2,
  sections: [
    {
      number: 1,
      title: "The Brenner Kernel",
      text: "Treat the method as an operating system. Root access to ontological assumptions. Scheduler for hypothesis priority.",
      anchors: [],
      jargonTerms: ["brenner kernel"],
    },
    {
      number: 2,
      title: "Instruction Set",
      text: "HUNT: Find paradoxes. SPLIT: Separate levels. RECODE: Change representation. KILL: Eliminate hypotheses.",
      anchors: [],
    },
  ],
};

// ============================================================================
// Quote Bank Fixtures
// ============================================================================

/**
 * Quote bank with tagged Brenner primitives.
 */
export const quoteBankFixture: QuoteBankDocument = {
  id: "test-quote-bank",
  type: "quote-bank",
  title: "Brenner Quote Bank",
  tags: [
    "third-alternative",
    "productive-ignorance",
    "exclusion",
    "dimensional-reduction",
    "model-organism",
    "out-of-phase",
  ],
  quotes: [
    {
      id: "q1",
      text: "You've forgotten there's a third alternative. Both could be wrong.",
      section: "§103",
      tags: ["third-alternative"],
      context: "Response to binary choice between two models",
    },
    {
      id: "q2",
      text: "It is good to be ignorant about a new field. When you know too much you're dangerous.",
      section: "§230",
      tags: ["productive-ignorance"],
      context: "Discussing advantage of fresh perspectives",
    },
    {
      id: "q3",
      text: "Exclusion is always a tremendously good thing in science.",
      section: "§105",
      tags: ["exclusion"],
      context: "Explaining discriminative test philosophy",
    },
    {
      id: "q4",
      text: "We reduced the problem to one dimension. The cell lineage is essentially a program.",
      section: "§58",
      tags: ["dimensional-reduction"],
      context: "Describing C. elegans approach",
    },
    {
      id: "q5",
      text: "The choice of C. elegans was crucial. It's transparent—you can see every cell.",
      section: "§59",
      tags: ["model-organism"],
      context: "Explaining organism selection criteria",
    },
    {
      id: "q6",
      text: "The best thing in science is to work out of phase with the fashion.",
      section: "§236",
      tags: ["out-of-phase"],
      context: "Advice on scientific strategy",
    },
  ],
};

// ============================================================================
// Metaprompt Fixtures
// ============================================================================

/**
 * Sample metaprompt document.
 */
export const metapromptFixture: MetapromptDocument = {
  id: "test-metaprompt",
  type: "metaprompt",
  title: "Brenner Protocol Metaprompt",
  version: "0.1",
  content: `# Brenner Protocol Session

You are participating in a Brenner-style research session.

## Your Role
- Generate hypotheses based on the provided excerpts
- Design discriminative tests
- Apply Brenner operators: ⊘ Level-split, ✂ Exclusion-test, 𝓛 Recode

## Output Format
Produce structured deltas in \`\`\`delta blocks.

## Key Principles
1. Always include a third alternative
2. Design tests that can exclude, not just confirm
3. Ground claims in transcript anchors (§n)
`,
};

// ============================================================================
// Markdown Raw Fixtures (for parser testing)
// ============================================================================

/**
 * Raw markdown for transcript parsing tests.
 */
export const rawTranscriptMarkdown = `# Sydney Brenner Interview

*A conversation about science and discovery*

## 1. Introduction

> This is what I always tell people.
> The key is to find the right problem.

*[Q] How did you choose your problems?*

> I looked for systems where the question
> could actually be answered.

## 2. C. elegans Selection

> The choice of **C. elegans** was crucial.
> It's transparent—you can see every cell.

---

Some additional context here.
`;

/**
 * Raw markdown with multiple quotes per section.
 */
export const rawMultiQuoteMarkdown = `# Test

## 1. Quotes

> First quote line.
> Second quote line.

> Another separate quote.

*[Q] A question in between*

> Third quote after question.
`;

/**
 * Raw markdown without sections (edge case).
 */
export const rawNoSectionsMarkdown = `# Just a Title

Some content without any sections.

> A quote without structure.
`;
