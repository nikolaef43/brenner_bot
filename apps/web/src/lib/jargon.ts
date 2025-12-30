/**
 * Jargon Dictionary
 *
 * Comprehensive glossary system for making technical terms accessible.
 * Covers Brenner operators, scientific methodology, biology, Bayesian reasoning,
 * and project-specific terminology.
 *
 * @example
 * ```typescript
 * import { getJargon, jargonDictionary } from "./jargon";
 *
 * const term = getJargon("level-split");
 * if (term) {
 *   console.log(term.short);  // For tooltips
 *   console.log(term.long);   // For full explanation
 * }
 * ```
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Categories for filtering and organizing glossary terms.
 */
export type JargonCategory =
  | "operators" // Brenner operators (⊘, 𝓛, etc.)
  | "brenner" // Core Brenner concepts
  | "biology" // Scientific/biology terms
  | "bayesian" // Bayesian/statistical terms
  | "method" // Scientific method terms
  | "project"; // BrennerBot-specific terms

/**
 * A single glossary term with progressive disclosure.
 */
export interface JargonTerm {
  /** The display term (e.g., "C. elegans", "Level-split") */
  term: string;

  /** One-line definition for quick tooltips (~100 chars) */
  short: string;

  /** Full explanation in plain English (2-4 sentences) */
  long: string;

  /** "Think of it like..." analogy for non-experts */
  analogy?: string;

  /** Why this term matters in the Brenner context */
  why?: string;

  /** Related term keys for discovery (2-4 terms max) */
  related?: string[];

  /** Category for filtering */
  category: JargonCategory;
}

// ============================================================================
// Dictionary
// ============================================================================

/**
 * The complete jargon dictionary.
 * Keys are lowercase with hyphens (e.g., "c-elegans", "level-split").
 */
export const jargonDictionary: Record<string, JargonTerm> = {
  // -------------------------------------------------------------------------
  // Brenner Operators
  // -------------------------------------------------------------------------
  "level-split": {
    term: "Level-split",
    short:
      "Decompose a problem into distinct levels of organization (⊘).",
    long:
      "The operator ⊘ separates a problem into levels (e.g., atoms → molecules → cells → organisms). Each level has its own rules. Confusion arises when you mix levels or try to explain one level purely in terms of another. Distinguish program from interpreter, message from machine, specification from execution.",
    analogy:
      "Think of it like separating a building into floors. Plumbing problems on floor 3 don't require knowing every brick in the foundation.",
    why:
      "Brenner emphasizes that biology operates across multiple levels. Failing to level-split leads to confused explanations. Transcript anchors: §45-46 (Von Neumann insight), §50 (chastity vs impotence), §59 (logic vs machinery), §105 (message vs machine), §147 (proper vs improper simulation), §205 (construction vs performance).",
    related: ["recode", "scale-prison", "object-transpose"],
    category: "operators",
  },
  recode: {
    term: "Recode",
    short: "Change representation to make patterns visible (𝓛).",
    long:
      "The operator 𝓛 transforms data or problems into a different representation where the answer becomes obvious. What's hidden in one encoding may be obvious in another. Especially powerful: reduce dimensionality from 3D to 1D when possible.",
    analogy:
      "Think of it like switching from Roman numerals to Arabic numerals—suddenly multiplication becomes easy.",
    why:
      "Brenner solved the genetic code by recoding the problem from chemistry to information theory. Transcript anchors: §34 (wordplay as alternative interpretations), §58 (dimensional reduction: 'reduction to one dimension... absolute crucial step'), §147 (machine language constraint), §161 (European vs American plan), §175 (junk vs garbage definitional cleanup), §197 (digital/analogue sanity), §205 (gradients vs lineage), §208 (machine language of development).",
    related: ["level-split", "invariant-extract", "digital-handle"],
    category: "operators",
  },
  "invariant-extract": {
    term: "Invariant Extract",
    short: "Find what stays the same across transformations (≡).",
    long:
      "The operator ≡ identifies properties that remain constant despite changes. These invariants are often the key to understanding a system. Find what survives coarse operations, what must hold regardless of specifics.",
    analogy:
      "Think of it like noticing that no matter how you shuffle a deck, there are always 52 cards.",
    why:
      "Brenner used invariants to identify the essential features of genetic systems that any solution must preserve. Transcript anchors: §66 (scale constraints), §88-89 (phase problem), §100 (dominant-variable rescue: magnesium vs caesium), §109 (topology-level inference), §134 (topological proof of co-linearity), §163 (combinatorial constraints), §178 (feasibility units).",
    related: ["level-split", "recode", "scale-prison"],
    category: "operators",
  },
  "exclusion-test": {
    term: "Exclusion Test",
    short: "Design tests that rule out hypotheses, not confirm them (✂).",
    long:
      "The operator ✂ focuses on what can be eliminated. A discriminative experiment asks: 'What result would prove this hypothesis wrong?' If you can't answer that, the experiment is impotent. Derive what patterns are forbidden under each hypothesis, then design cheap tests that probe those forbidden patterns.",
    analogy:
      "Think of it like a murder mystery where you look for alibis that rule suspects out, not evidence that could fit anyone.",
    why:
      "Brenner insisted on 'potent' experiments that could actually falsify theories, not just add confirming data. Transcript anchors: §69 (overlapping code elimination via forbidden amino-acid pairs), §103 ('Both could be wrong'—the third alternative), §147 ('Exclusion is always a tremendously good thing in science').",
    related: ["potency", "forbidden-pattern", "theory-kill", "potency-check"],
    category: "operators",
  },
  "object-transpose": {
    term: "Object Transpose",
    short: "Switch which entity you're experimenting on (⟂).",
    long:
      "The operator ⟂ changes what counts as the experimental object. Sometimes the organism isn't what you should vary—it might be the environment, the tool, or the question itself. Treat the Tree of Life as a component library to be raided.",
    analogy:
      "Think of it like realizing you should test different fishing spots, not different fish.",
    why:
      "Brenner chose C. elegans specifically because its properties as an object (small, fast, transparent) enabled experiments impossible in other organisms. Transcript anchors: §91 ('choice of the experimental object remains one of the most important things'), §128-129 (C. elegans specification), §145-146 (EM window forcing function), §191 ('kitchen table' genome mapping), §199 ('Somewhere there is the ideal organism'), §221-222 (Fugu as discount genome).",
    related: ["level-split", "scale-prison", "c-elegans"],
    category: "operators",
  },
  amplify: {
    term: "Amplify",
    short: "Enhance weak signals until they become measurable (↑).",
    long:
      "The operator ↑ uses biological amplification mechanisms (selection, replication, dominance, abundance) to make signals large and robust. Let biology do the work rather than fighting noise with statistics.",
    analogy:
      "Think of it like using a stethoscope to hear a heartbeat you couldn't detect with your bare ear.",
    why:
      "Brenner's genetics work required amplifying molecular effects to organism-level phenotypes that could be scored by eye. Transcript anchors: §62 ('genetics is digital; it's all or none... a thousand times, a million times'), §94 (abundance trick: 'single protein accounted for 70% of all protein synthesis'), §138 (abundance dominates background), §154 (selection for rare worm mutants via tracks).",
    related: ["digital-handle", "abundance-trick"],
    category: "operators",
  },
  democratize: {
    term: "Democratize",
    short: "Make expensive techniques cheap and accessible (⇓).",
    long:
      "The operator ⇓ spreads capability. Technology that only a few labs can do is less valuable than technology any lab can use. Related to DIY—build simple tools that others can replicate.",
    analogy:
      "Think of it like making smartphones—cameras that once required professional equipment became available to everyone.",
    why:
      "Brenner valued methods that could be adopted by the whole field, not just elite labs with special equipment. Transcript anchor: §86 (negative staining democratizes EM—'now anybody could do it').",
    related: ["diy", "abundance-trick"],
    category: "operators",
  },
  "exception-quarantine": {
    term: "Exception Quarantine",
    short: "Isolate anomalies so they don't corrupt the main theory (ΔE).",
    long:
      "The operator ΔE acknowledges that some observations don't fit current theory, but rather than abandoning the theory, you quarantine the exceptions for later investigation. Preserve a high-coherence core model while isolating anomalies—put them in an appendix and resolve them later.",
    analogy:
      "Think of it like a hospital's isolation ward—you don't shut down the whole hospital because of a few unusual cases.",
    why:
      "Brenner understood that exceptions often reveal deeper truths, but only after the main theory is solid enough to define what counts as exceptional. Transcript anchors: §57 ('Don't Worry hypothesis'), §106, §229 (Occam's broom: 'minimize swept-under-the-carpet facts'), §110 ('we didn't conceal them; we put them in an appendix'), §111 ('house of cards... all or nothing theory').",
    related: ["forbidden-pattern", "exclusion-test", "occams-broom"],
    category: "operators",
  },
  dephase: {
    term: "Dephase",
    short: "Move out of phase with fashion to find open territory (∿).",
    long:
      "The operator ∿ means working half a wavelength ahead or behind the crowd. Avoid crowded priors and industrialized midgames. The 'opening game' has tremendous freedom of choice.",
    analogy:
      "Think of it like the opening in chess—you develop pieces and control space before launching a specific attack.",
    why:
      "Brenner warns against fighting crowded competitions. Transcript anchors: §143 ('the best thing in science is to work out of phase'), §192 ('opening game... tremendous freedom of choice'), §210 (heroic → classical transition).",
    related: ["productive-ignorance", "paradox-hunt", "cross-domain-import"],
    category: "operators",
  },
  unentrain: {
    term: "Unentrain",
    short: "Deliberately ignore conventional wisdom to see fresh (⊙).",
    long:
      "The operator ⊙ involves productive ignorance—not knowing the 'standard' approach lets you see possibilities experts miss. The best people to push a science forward often come from outside it.",
    analogy:
      "Think of it like a child asking 'why?' about things adults take for granted.",
    why:
      "Brenner's outsider status gave him advantages. Transcript anchors: §63 ('spreading ignorance rather than knowledge'), §65 ('Don't equip yourself'), §157 ('the émigrés are always the best people'), §192 ('strong believer in the value of ignorance').",
    related: ["dephase", "productive-ignorance", "cross-domain-import"],
    category: "operators",
  },
  "cross-domain-import": {
    term: "Cross-Domain Import",
    short: "Borrow techniques or concepts from other fields (⊕).",
    long:
      "The operator ⊕ transfers ideas across disciplinary boundaries. Solutions in one field may already exist in another. Import patterns from unrelated fields; maintain 'fresh eyes' by resisting expert entrainment.",
    analogy:
      "Think of it like how assembly line manufacturing was inspired by meatpacking plants.",
    why:
      "Brenner imported information theory from engineering to crack the genetic code. Transcript anchors: §86 (cross-domain pattern: syphilis staining → negative staining), §200 (paper triage to protect bandwidth), §230 (move fields while carrying invariants).",
    related: ["recode", "level-split", "unentrain", "productive-ignorance"],
    category: "operators",
  },
  "paradox-hunt": {
    term: "Paradox Hunt",
    short: "Actively seek contradictions—they mark discovery zones (◊).",
    long:
      "The operator ◊ treats paradoxes as valuable. Where your theory predicts one thing and reality shows another, there's something important to learn. Paradox is not a nuisance—it's a beacon pointing to missing production rules.",
    analogy:
      "Think of it like a detective who gets excited when the alibi doesn't match—contradictions are clues.",
    why:
      "Brenner actively sought paradoxes. Transcript anchors: §95 (paradox of prodigious synthesis rate → led to messenger RNA discovery), §106 ('how can these two things exist and not be explained').",
    related: ["forbidden-pattern", "exception-quarantine"],
    category: "operators",
  },
  "theory-kill": {
    term: "Theory Kill",
    short: "Deliberately attempt to destroy your own hypothesis (†).",
    long:
      "The operator † requires trying to falsify your own ideas before publishing. If you can't kill your theory, maybe it's true. If you can, better to find out now. Don't fall in love with theories.",
    analogy:
      "Think of it like stress-testing a bridge before letting traffic on it.",
    why:
      "Brenner's harsh self-criticism prevented him from publishing weak ideas. Transcript anchor: §229 ('When they go ugly, kill them. Get rid of them').",
    related: ["exclusion-test", "potency", "forbidden-pattern"],
    category: "operators",
  },
  materialize: {
    term: "Materialize",
    short: "Turn abstract theory into concrete, testable predictions (⌂).",
    long:
      "The operator ⌂ grounds speculation in reality. A theory that can't be materialized into experiments isn't science—it's philosophy. Ask: 'If this were true, what would I see?'",
    analogy:
      "Think of it like an architect who can't just draw pretty pictures but must specify actual materials and measurements.",
    why:
      "Brenner despised armchair theorizing. Transcript anchors: §42 ('Let the imagination go... but... direct it by experiment'), §66 ('Materialise the question').",
    related: ["scale-prison", "potency", "quickie"],
    category: "operators",
  },
  diy: {
    term: "DIY",
    short: "Build your own tools when commercial ones don't exist (🔧).",
    long:
      "The operator 🔧 means building custom equipment or methods. Sometimes the right tool doesn't exist, so you make it. Don't let missing tools define your pace.",
    analogy:
      "Think of it like a chef who forges their own knives because nothing on the market suits their technique.",
    why:
      "Brenner and colleagues built custom equipment. Transcript anchors: §23 (build Warburg manometer), §37, §41 (heliostat), §51 ('This is something you can always do... open to you'), §86 (negative staining democratizes EM).",
    related: ["democratize", "abundance-trick"],
    category: "operators",
  },
  "scale-prison": {
    term: "Scale Prison",
    short: "Physics constrains what's possible at each size (⊞).",
    long:
      "The operator ⊞ reminds us that scale matters. Diffusion, surface area, heat—everything changes with size. What works at one scale may be impossible at another. Calculate actual numbers.",
    analogy:
      "Think of it like how ants can carry 50x their weight, but if you scaled an ant to human size it would collapse.",
    why:
      "Brenner emphasized that biological imagination must be 'imprisoned by physics'. Transcript anchor: §66 ('get the scale of everything right... the DNA in a bacterium is 1mm long... folded up a thousand times').",
    related: ["level-split", "materialize", "invariant-extract"],
    category: "operators",
  },

  // -------------------------------------------------------------------------
  // Derived Operators (compositions of core operators)
  // -------------------------------------------------------------------------
  quickie: {
    term: "Quickie",
    short: "Run a cheap pilot test to de-risk before committing to the full experiment (⚡).",
    long:
      "The operator ⚡ asks: before investing months in the flagship experiment, can you run a cheap pilot that would kill the key alternative? De-risk before committing major resources.",
    analogy:
      "Think of it like checking if a restaurant is open before driving across town for dinner.",
    why:
      "Brenner's approach valued efficiency—why commit months of work when a quick test could rule out the hypothesis? Transcript anchor: §99 ('I'll do a quickie').",
    related: ["materialize", "exclusion-test", "potency"],
    category: "operators",
  },
  hal: {
    term: "HAL",
    short: "Have A Look—directly observe before elaborate inference (👁).",
    long:
      "The operator 👁 (HAL = Have A Look) says: before doing complex analysis, consider if you could just look. Each link in an inference chain has error probability; direct observation is often faster.",
    analogy:
      "Think of it like peeking inside a box instead of weighing it, shaking it, and running statistical tests on the sounds.",
    why:
      "Brenner preferred direct observation over elaborate inference when possible. Transcript anchor: §198 ('I had invented something called HAL biology. HAL... stood for Have A Look biology').",
    related: ["materialize", "amplify", "quickie"],
    category: "operators",
  },
  "potency-check": {
    term: "Potency Check",
    short: "Verify your intervention actually worked before trusting results (🎭).",
    long:
      "The operator 🎭 distinguishes 'won't' from 'can't'. Before concluding a hypothesis is wrong based on a negative result, verify that your intervention actually worked. Chaste vs impotent.",
    analogy:
      "Think of it like checking if the light switch is connected before concluding the bulb is burned out.",
    why:
      "Brenner emphasized that negative results only mean something if you've verified the positive control. Transcript anchor: §50 (chastity vs impotence: same outcome, different reasons).",
    related: ["exclusion-test", "potency", "decision-experiment"],
    category: "operators",
  },

  // -------------------------------------------------------------------------
  // Core Brenner Concepts
  // -------------------------------------------------------------------------
  "brenner-move": {
    term: "Brenner Move",
    short: "A strategic intervention that transforms a stuck problem into a tractable one.",
    long:
      "A Brenner move isn't just clever—it reframes the entire problem space so that what was intractable becomes solvable. It often involves changing levels, representations, or experimental objects.",
    why:
      "The goal of BrennerBot is to help researchers recognize and execute these moves.",
    related: ["level-split", "recode", "object-transpose"],
    category: "brenner",
  },
  "decision-experiment": {
    term: "Decision Experiment",
    short: "An experiment whose result forces a choice between hypotheses.",
    long:
      "A decision experiment is designed to discriminate—it produces different results depending on which hypothesis is true. Impotent experiments confirm everything; decision experiments decide.",
    analogy:
      "Think of it like a fork in the road where the signs point clearly in different directions.",
    why:
      "Brenner insisted experiments should make decisions, not just collect data.",
    related: ["potency", "exclusion-test", "forbidden-pattern"],
    category: "brenner",
  },
  "digital-handle": {
    term: "Digital Handle",
    short: "Discrete, countable markers that make a system tractable.",
    long:
      "Genetics provides digital handles—mutations, genes, markers—that turn continuous biology into discrete problems. Without digital handles, you're measuring gradients; with them, you can count.",
    analogy:
      "Think of it like serial numbers that let you track individual items instead of measuring bulk properties.",
    why:
      "Brenner's choice of genetics over biochemistry was partly because genetics gave digital handles to molecular problems.",
    related: ["amplify", "recode", "abundance-trick"],
    category: "brenner",
  },
  potency: {
    term: "Potency",
    short: "An experiment's power to discriminate between hypotheses.",
    long:
      "Potency measures whether an experiment can actually distinguish between competing ideas. A potent experiment has results that would differ depending on which hypothesis is correct. An impotent experiment gives the same result no matter what's true.",
    analogy:
      "Think of it like the difference between asking someone's name versus asking if they're human—one discriminates, one doesn't.",
    why:
      "Brenner repeatedly criticized 'impotent' experiments that couldn't falsify anything.",
    related: ["decision-experiment", "exclusion-test", "theory-kill"],
    category: "brenner",
  },
  "productive-ignorance": {
    term: "Productive Ignorance",
    short: "Not knowing the standard approach lets you see alternatives.",
    long:
      "Productive ignorance is the advantage of not being trained in a field's conventions. Experts often can't see past their assumptions; outsiders ask naive questions that reveal hidden possibilities.",
    why:
      "Brenner credited some of his best insights to entering fields as an outsider.",
    related: ["unentrain", "dephase"],
    category: "brenner",
  },
  "forbidden-pattern": {
    term: "Forbidden Pattern",
    short: "Results that your theory says cannot occur.",
    long:
      "A forbidden pattern is what a theory rules out. If you observe a forbidden pattern, the theory is wrong. Good theories make bold forbidden predictions; weak theories forbid nothing.",
    analogy:
      "Think of it like a dietary law—if someone claims to be vegetarian, seeing them eat meat is a forbidden pattern that falsifies the claim.",
    why:
      "Brenner designed experiments around what should be impossible, not just what should happen.",
    related: ["exclusion-test", "potency", "theory-kill"],
    category: "brenner",
  },
  "representation-change": {
    term: "Representation Change",
    short: "Restate the problem in a domain where constraints are clearer.",
    long:
      "A representation change transforms a problem from one language or framework to another where the solution becomes more tractable. What's hard in chemistry might be obvious in information theory; what's confusing in 3D might be simple in 1D.",
    analogy:
      "Think of it like rotating a 3D object to see its shadow—some angles reveal the structure, others hide it.",
    why:
      "Brenner's shift from thinking about the genetic code as chemistry to thinking about it as information was a pivotal representation change.",
    related: ["recode", "level-split", "brenner-move"],
    category: "brenner",
  },
  "assumption-ledger": {
    term: "Assumption Ledger",
    short: "Explicit list of load-bearing assumptions and what would break them.",
    long:
      "An assumption ledger makes hidden premises visible. Every theory rests on assumptions—some explicit, most implicit. Listing them and identifying tests that would break each one turns vague theories into falsifiable claims.",
    analogy:
      "Think of it like an engineering stress test—you don't just hope the bridge holds, you know exactly which joints are load-bearing and at what weight they fail.",
    why:
      "Brenner insisted on surfacing assumptions that are usually hidden inside theoretical frameworks.",
    related: ["forbidden-pattern", "theory-kill", "potency"],
    category: "brenner",
  },
  "third-alternative": {
    term: "Third Alternative",
    short: "The 'both models are wrong' escape from false dichotomies.",
    long:
      "The third alternative reminds us that when two theories compete, we shouldn't assume one must be right. Often both are wrong, or the question itself is malformed. The real answer may require reframing the problem entirely.",
    analogy:
      "Think of it like being asked 'Is light a wave or a particle?' The third alternative is 'The question assumes classical categories that don't apply.'",
    why:
      "Brenner repeatedly warned against false dichotomies and premature theory commitment.",
    related: ["decision-experiment", "representation-change", "productive-ignorance"],
    category: "brenner",
  },

  // -------------------------------------------------------------------------
  // Biology Terms
  // -------------------------------------------------------------------------
  "c-elegans": {
    term: "C. elegans",
    short: "A tiny transparent worm (~1mm) that became a model organism for genetics and neuroscience.",
    long:
      "Caenorhabditis elegans is a nematode with exactly 959 somatic cells (302 neurons). Its transparency, fast reproduction (3 days), and simple nervous system made it ideal for Brenner's developmental genetics work.",
    why:
      "Brenner chose this organism because its properties matched the experiments he wanted to do—an example of object-transpose thinking.",
    related: ["object-transpose", "model-organism", "scale-prison"],
    category: "biology",
  },
  "model-organism": {
    term: "Model Organism",
    short: "A species chosen for study because its properties make experiments tractable.",
    long:
      "Model organisms (E. coli, yeast, flies, worms, mice) are chosen not because they're interesting in themselves, but because they enable experiments impossible in other species. The choice of model is itself a research decision.",
    analogy:
      "Think of it like picking a testing ground—you don't need the tallest mountain to study climbing, you need one that's accessible.",
    why:
      "Brenner's choice of C. elegans was strategic—the organism's properties determined what experiments became possible.",
    related: ["c-elegans", "object-transpose"],
    category: "biology",
  },
  "genetic-code": {
    term: "Genetic Code",
    short: "The mapping from DNA triplets (codons) to amino acids.",
    long:
      "The genetic code translates 64 possible three-letter DNA words into 20 amino acids (plus stop signals). Brenner helped prove that the code uses non-overlapping triplets and identify the reading frame.",
    why:
      "Cracking the genetic code was Brenner's first major achievement—done through clever genetics, not sequencing.",
    related: ["recode", "digital-handle", "mrna"],
    category: "biology",
  },
  mrna: {
    term: "mRNA",
    short: "Messenger RNA—the intermediate that carries genetic information from DNA to ribosomes.",
    long:
      "mRNA (messenger RNA) is copied from DNA and carries instructions to ribosomes for protein synthesis. Brenner co-discovered mRNA, proving that genetic information flows through an unstable intermediate.",
    why:
      "The mRNA discovery was a key piece in understanding how cells express genetic information.",
    related: ["genetic-code", "ribosome"],
    category: "biology",
  },
  ribosome: {
    term: "Ribosome",
    short: "The cellular machine that reads mRNA and builds proteins.",
    long:
      "Ribosomes are molecular machines made of RNA and protein that translate mRNA into protein. They read the genetic code three letters at a time and assemble amino acids into chains.",
    related: ["mrna", "genetic-code"],
    category: "biology",
  },
  phenotype: {
    term: "Phenotype",
    short: "The observable characteristics of an organism.",
    long:
      "A phenotype is what you can see or measure—behavior, color, size, disease. Genetics works by linking phenotypes to genotypes (DNA sequences). Brenner chose C. elegans partly because behavioral phenotypes were easy to score.",
    analogy:
      "Think of it like the symptoms of a condition versus its underlying cause.",
    related: ["genotype", "digital-handle"],
    category: "biology",
  },
  genotype: {
    term: "Genotype",
    short: "The genetic makeup (DNA sequence) of an organism.",
    long:
      "A genotype is the DNA sequence information—what's actually in the genes. Connecting genotype to phenotype is the central problem of genetics.",
    related: ["phenotype", "genetic-code"],
    category: "biology",
  },
  mutagenesis: {
    term: "Mutagenesis",
    short: "Deliberately inducing mutations to study gene function.",
    long:
      "Mutagenesis uses chemicals, radiation, or other methods to create random mutations. By studying what breaks when genes are mutated, geneticists infer what those genes normally do.",
    analogy:
      "Think of it like understanding a machine by breaking parts and seeing what stops working.",
    why:
      "Brenner used mutagenesis extensively in C. elegans to map the genes controlling development and behavior.",
    related: ["phenotype", "genetic-code", "c-elegans"],
    category: "biology",
  },
  allele: {
    term: "Allele",
    short: "A particular version of a gene at a specific position in the genome.",
    long:
      "Alleles are alternative forms of the same gene. Most genes have a 'wild-type' (normal) allele and various mutant alleles. An organism can be homozygous (two identical alleles) or heterozygous (two different alleles).",
    analogy:
      "Think of it like different editions of the same book—same story, slightly different text.",
    related: ["gene", "wild-type", "homozygous", "heterozygous"],
    category: "biology",
  },
  gene: {
    term: "Gene",
    short: "A segment of DNA that encodes a functional product (usually a protein).",
    long:
      "Genes are the fundamental units of heredity. Each gene contains instructions for making one or more proteins. Mutations in genes alter protein function, producing phenotypic changes that geneticists can study.",
    analogy:
      "Think of it like a recipe in a cookbook—DNA is the cookbook, genes are individual recipes.",
    related: ["allele", "genetic-code", "phenotype", "genotype"],
    category: "biology",
  },
  dna: {
    term: "DNA",
    short: "Deoxyribonucleic acid—the molecule that stores genetic information.",
    long:
      "DNA is a double-helix molecule made of four nucleotide bases (A, T, G, C). The sequence of bases encodes all genetic information. DNA is transcribed to RNA and ultimately translated into proteins.",
    why:
      "Brenner's work helped establish that DNA's sequence (not its chemistry) carries the genetic message.",
    related: ["rna", "genetic-code", "gene"],
    category: "biology",
  },
  rna: {
    term: "RNA",
    short: "Ribonucleic acid—single-stranded molecule that carries and implements genetic information.",
    long:
      "RNA comes in several forms: mRNA carries genetic messages, tRNA brings amino acids to ribosomes, rRNA forms the ribosome structure. RNA is the intermediary between DNA and proteins.",
    related: ["dna", "mrna", "ribosome"],
    category: "biology",
  },
  codon: {
    term: "Codon",
    short: "A three-nucleotide sequence that specifies one amino acid.",
    long:
      "Codons are the 'words' of the genetic code. Each three-letter combination (like AUG or GCA) corresponds to a specific amino acid or stop signal. Brenner helped prove the code uses non-overlapping triplets.",
    why:
      "Brenner's genetic code work established that codons are read sequentially without overlap.",
    related: ["genetic-code", "amino-acid", "mrna"],
    category: "biology",
  },
  "amino-acid": {
    term: "Amino Acid",
    short: "The building blocks of proteins—20 standard types coded by DNA.",
    long:
      "Amino acids are linked together to form proteins. The sequence of amino acids determines the protein's 3D structure and function. The genetic code maps 64 codons to 20 amino acids plus stop signals.",
    related: ["codon", "genetic-code", "protein"],
    category: "biology",
  },
  protein: {
    term: "Protein",
    short: "A molecular machine made of amino acids that performs cellular functions.",
    long:
      "Proteins are chains of amino acids folded into specific 3D shapes. They catalyze reactions (enzymes), provide structure, transport molecules, and send signals. Most genes encode proteins.",
    analogy:
      "Think of it like a tool—the amino acid sequence is the blueprint, the folded protein is the working tool.",
    related: ["amino-acid", "gene", "ribosome"],
    category: "biology",
  },
  transcription: {
    term: "Transcription",
    short: "The process of copying DNA into RNA.",
    long:
      "Transcription is the first step of gene expression. An enzyme (RNA polymerase) reads DNA and produces a complementary RNA strand. This RNA is then processed and translated into protein.",
    related: ["dna", "rna", "mrna", "translation"],
    category: "biology",
  },
  translation: {
    term: "Translation",
    short: "The process of reading mRNA to build proteins at the ribosome.",
    long:
      "Translation is the second step of gene expression. Ribosomes read mRNA codons and link corresponding amino acids into a protein chain. Transfer RNAs (tRNAs) bring amino acids to the ribosome.",
    related: ["transcription", "mrna", "ribosome", "codon"],
    category: "biology",
  },
  mutation: {
    term: "Mutation",
    short: "A change in DNA sequence that may alter gene function.",
    long:
      "Mutations can be insertions, deletions, or substitutions of nucleotides. Some mutations are harmless, others cause loss or gain of function. Forward genetics uses mutations to understand gene function.",
    analogy:
      "Think of it like a typo—some typos are unnoticeable, others completely change meaning.",
    related: ["mutagenesis", "allele", "phenotype"],
    category: "biology",
  },
  "wild-type": {
    term: "Wild-type",
    short: "The normal, non-mutant version of an organism or gene.",
    long:
      "Wild-type refers to the standard reference strain or allele. In C. elegans, the N2 Bristol strain is wild-type. Mutant phenotypes are described as deviations from wild-type.",
    related: ["mutation", "allele", "c-elegans"],
    category: "biology",
  },
  homozygous: {
    term: "Homozygous",
    short: "Having two identical alleles of a gene.",
    long:
      "A homozygous organism has inherited the same allele from both parents. Homozygotes express the allele's phenotype directly, making them useful for genetic analysis.",
    related: ["heterozygous", "allele", "genotype"],
    category: "biology",
  },
  heterozygous: {
    term: "Heterozygous",
    short: "Having two different alleles of a gene.",
    long:
      "A heterozygous organism carries one copy each of two different alleles. The phenotype depends on whether alleles are dominant or recessive. Heterozygotes reveal genetic dominance relationships.",
    related: ["homozygous", "dominant", "recessive", "allele"],
    category: "biology",
  },
  dominant: {
    term: "Dominant",
    short: "An allele whose phenotype shows even when heterozygous.",
    long:
      "A dominant allele produces its phenotype whether there's one copy or two. Dominant mutations often represent gain-of-function or interference with normal protein.",
    analogy:
      "Think of it like a loud voice that's heard even when quieter voices are present.",
    related: ["recessive", "heterozygous", "allele"],
    category: "biology",
  },
  recessive: {
    term: "Recessive",
    short: "An allele whose phenotype only shows when homozygous.",
    long:
      "A recessive allele is masked by a dominant allele in heterozygotes. Recessive mutations typically represent loss-of-function—both copies must be non-functional to show the phenotype.",
    analogy:
      "Think of it like a quiet voice drowned out by louder ones until it's the only voice speaking.",
    related: ["dominant", "homozygous", "allele"],
    category: "biology",
  },
  "cell-lineage": {
    term: "Cell Lineage",
    short: "The complete ancestral history of a cell, tracing back to the fertilized egg.",
    long:
      "Cell lineage maps show which cells divide to produce which daughter cells throughout development. In C. elegans, the entire lineage of all 959 cells is known—a major achievement enabled by the worm's transparency.",
    why:
      "Brenner chose C. elegans partly because its invariant cell lineage made developmental genetics tractable.",
    related: ["c-elegans", "apoptosis", "neuron"],
    category: "biology",
  },
  apoptosis: {
    term: "Apoptosis",
    short: "Programmed cell death—cells that deliberately kill themselves.",
    long:
      "Apoptosis is controlled suicide of cells. In C. elegans, exactly 131 cells die during development. The genes controlling apoptosis (ced genes) were discovered in C. elegans and are conserved in humans.",
    why:
      "The C. elegans apoptosis pathway (ced-3, ced-4, ced-9) became a model for understanding human programmed cell death.",
    related: ["cell-lineage", "c-elegans"],
    category: "biology",
  },
  neuron: {
    term: "Neuron",
    short: "A nerve cell specialized for transmitting electrical and chemical signals.",
    long:
      "Neurons process and transmit information through electrical signals and chemical neurotransmitters. C. elegans has exactly 302 neurons, and their complete wiring diagram (connectome) is mapped.",
    why:
      "Brenner chose C. elegans partly to understand the genetic basis of behavior through its simple nervous system.",
    related: ["synapse", "c-elegans", "connectome"],
    category: "biology",
  },
  synapse: {
    term: "Synapse",
    short: "A junction where neurons communicate with each other or with muscles.",
    long:
      "Synapses are the connection points between neurons. Signals cross synapses via chemical neurotransmitters or (rarely) direct electrical coupling. C. elegans has about 7,000 synapses.",
    related: ["neuron", "c-elegans"],
    category: "biology",
  },
  connectome: {
    term: "Connectome",
    short: "The complete wiring diagram of all neural connections in a nervous system.",
    long:
      "A connectome maps every neuron and every synapse in a brain. C. elegans was the first organism with a complete connectome (mapped from electron microscopy in the 1980s by White, Brenner, and colleagues).",
    why:
      "The C. elegans connectome was a landmark achievement, enabling computational models of neural circuits.",
    related: ["neuron", "synapse", "c-elegans"],
    category: "biology",
  },
  hermaphrodite: {
    term: "Hermaphrodite",
    short: "An organism with both male and female reproductive organs.",
    long:
      "C. elegans hermaphrodites can self-fertilize, producing genetically identical offspring. This makes genetics simpler—you can maintain pure genetic lines without crossing. Males exist but are rare (0.1%).",
    why:
      "Self-fertilization was key to Brenner's choice of C. elegans—it simplified maintaining and crossing genetic strains.",
    related: ["c-elegans", "wild-type"],
    category: "biology",
  },
  ems: {
    term: "EMS",
    short: "Ethyl methanesulfonate—a chemical mutagen widely used in genetics.",
    long:
      "EMS causes point mutations by modifying guanine bases. It's the workhorse mutagen for forward genetic screens because it produces many single-nucleotide changes distributed across the genome.",
    why:
      "Brenner used EMS mutagenesis to create the first C. elegans mutant collection, enabling genetic dissection of development and behavior.",
    related: ["mutagenesis", "mutation", "c-elegans"],
    category: "biology",
  },

  // -------------------------------------------------------------------------
  // Bayesian / Statistical Terms
  // -------------------------------------------------------------------------
  prior: {
    term: "Prior",
    short: "Your beliefs about a hypothesis before seeing new evidence.",
    long:
      "In Bayesian reasoning, the prior represents what you believed before the experiment. It gets updated by evidence to produce the posterior (your new belief).",
    analogy:
      "Think of it like your initial suspicion about who committed a crime before the investigation begins.",
    related: ["posterior", "likelihood-ratio", "bayesian-update"],
    category: "bayesian",
  },
  posterior: {
    term: "Posterior",
    short: "Your updated beliefs after seeing new evidence.",
    long:
      "The posterior is what you believe after incorporating new evidence. It combines your prior beliefs with the likelihood of the evidence under each hypothesis.",
    analogy:
      "Think of it like your revised suspicion after hearing an alibi.",
    related: ["prior", "likelihood-ratio", "bayesian-update"],
    category: "bayesian",
  },
  "likelihood-ratio": {
    term: "Likelihood Ratio",
    short: "How much more likely the evidence is under one hypothesis versus another.",
    long:
      "The likelihood ratio compares P(evidence|H1) to P(evidence|H2). A ratio of 10 means the evidence is 10x more likely if H1 is true. This is the discriminative power of an experiment.",
    why:
      "Brenner's 'potent' experiments have high likelihood ratios—they strongly favor one hypothesis over another.",
    related: ["potency", "decision-experiment", "bayesian-update"],
    category: "bayesian",
  },
  "bayesian-update": {
    term: "Bayesian Update",
    short: "Revising beliefs by combining prior probability with new evidence.",
    long:
      "Bayesian updating multiplies your prior odds by the likelihood ratio to get posterior odds. It's the mathematically correct way to learn from evidence.",
    analogy:
      "Think of it like adjusting your bet after seeing some cards revealed.",
    related: ["prior", "posterior", "likelihood-ratio"],
    category: "bayesian",
  },
  "kl-divergence": {
    term: "KL Divergence",
    short: "Measures how different two probability distributions are.",
    long:
      "Kullback-Leibler divergence quantifies the information lost when approximating one distribution with another. It's used to measure how much an experiment could teach you.",
    analogy:
      "Think of it like measuring how surprised you'd be if reality differed from your expectations.",
    related: ["likelihood-ratio", "prior", "posterior"],
    category: "bayesian",
  },
  odds: {
    term: "Odds",
    short: "The ratio of probability of an event to probability it doesn't happen.",
    long:
      "Odds express probability differently: if probability is 75%, odds are 3:1 (three times more likely to happen than not). Bayesian updating is often cleaner using odds than probabilities.",
    analogy:
      "Think of it like betting—'3 to 1 odds' means you'd bet $3 to win $1.",
    related: ["prior", "posterior", "bayesian-update"],
    category: "bayesian",
  },
  "bayes-factor": {
    term: "Bayes Factor",
    short: "A ratio measuring the evidence for one hypothesis versus another.",
    long:
      "The Bayes factor is the likelihood ratio integrated over parameter uncertainty. A Bayes factor of 10 means the data are 10 times more likely under one hypothesis. It's used for model comparison.",
    why:
      "Bayes factors quantify 'potency' in statistical terms—how much the data should shift beliefs.",
    related: ["likelihood-ratio", "potency", "decision-experiment"],
    category: "bayesian",
  },
  "base-rate": {
    term: "Base Rate",
    short: "The prior probability of something in a population before specific evidence.",
    long:
      "The base rate is how common something is overall. Ignoring base rates leads to bad inferences—a positive medical test doesn't mean disease if the disease is rare (base rate neglect).",
    analogy:
      "Think of it like knowing that only 1 in 10,000 people have a disease before interpreting a positive test.",
    why:
      "Brenner's emphasis on priors aligns with paying attention to base rates when interpreting experiments.",
    related: ["prior", "posterior", "bayesian-update"],
    category: "bayesian",
  },
  sensitivity: {
    term: "Sensitivity",
    short: "The probability a test correctly detects a condition when present.",
    long:
      "Sensitivity (true positive rate) measures how often a test correctly identifies positives. High sensitivity means few false negatives. A sensitive test catches most cases but may have false alarms.",
    related: ["specificity", "likelihood-ratio"],
    category: "bayesian",
  },
  specificity: {
    term: "Specificity",
    short: "The probability a test correctly rules out a condition when absent.",
    long:
      "Specificity (true negative rate) measures how often a test correctly identifies negatives. High specificity means few false positives. A specific test rules out with confidence.",
    analogy:
      "Think of it like a bouncer who only lets the right people in—high specificity means few gate-crashers.",
    related: ["sensitivity", "likelihood-ratio"],
    category: "bayesian",
  },
  evidence: {
    term: "Evidence",
    short: "Data or observations that update beliefs about hypotheses.",
    long:
      "In Bayesian terms, evidence is information that changes the probability of hypotheses. Strong evidence shifts beliefs substantially; weak evidence shifts them little. Evidence strength is measured by likelihood ratios.",
    related: ["likelihood-ratio", "bayesian-update", "posterior"],
    category: "bayesian",
  },
  "information-gain": {
    term: "Information Gain",
    short: "How much an experiment reduces uncertainty about a question.",
    long:
      "Information gain measures the expected reduction in entropy (uncertainty) from an observation. High information gain experiments are 'potent'—they teach you a lot regardless of outcome.",
    why:
      "Brenner's discriminative experiments maximize information gain by having different predictions under each hypothesis.",
    related: ["kl-divergence", "potency", "decision-experiment"],
    category: "bayesian",
  },
  hypothesis: {
    term: "Hypothesis",
    short: "A proposed explanation for phenomena, to be tested by experiment.",
    long:
      "A hypothesis is a specific, testable claim about how something works. Good hypotheses make predictions that could be falsified. Experiments arbitrate between competing hypotheses.",
    analogy:
      "Think of it like a suspect in a murder investigation—you gather evidence to convict or exonerate.",
    related: ["falsification", "exclusion-test", "decision-experiment"],
    category: "bayesian",
  },

  // -------------------------------------------------------------------------
  // Scientific Method Terms
  // -------------------------------------------------------------------------
  falsification: {
    term: "Falsification",
    short: "Proving a hypothesis wrong rather than confirming it.",
    long:
      "Falsification is the Popperian principle that scientific theories should make risky predictions that could prove them false. Confirmation is easy; falsification is informative.",
    why:
      "Brenner's emphasis on exclusion tests and forbidden patterns is deeply Popperian.",
    related: ["exclusion-test", "theory-kill", "potency"],
    category: "method",
  },
  "null-hypothesis": {
    term: "Null Hypothesis",
    short: "The default assumption that there's no effect or difference.",
    long:
      "The null hypothesis states that nothing interesting is happening—no treatment effect, no correlation, no difference between groups. Experiments try to reject the null.",
    analogy:
      "Think of it like 'innocent until proven guilty' in statistics.",
    related: ["falsification", "potency"],
    category: "method",
  },
  control: {
    term: "Control",
    short: "The baseline condition an experiment compares against.",
    long:
      "A control group or condition is identical to the experimental condition except for the variable being tested. Without proper controls, you can't attribute results to your manipulation.",
    why:
      "Brenner emphasized 'chastity controls'—controls that verify your assay actually works.",
    related: ["potency", "null-hypothesis"],
    category: "method",
  },
  replication: {
    term: "Replication",
    short: "Repeating an experiment to verify results are real.",
    long:
      "Replication means getting the same results when an experiment is repeated. Results that don't replicate are likely spurious—noise, error, or fraud.",
    related: ["control", "null-hypothesis"],
    category: "method",
  },

  // -------------------------------------------------------------------------
  // Project-Specific Terms
  // -------------------------------------------------------------------------
  "agent-mail": {
    term: "Agent Mail",
    short: "The coordination substrate for multi-agent research sessions.",
    long:
      "Agent Mail is a messaging system that lets multiple AI agents (Claude, Codex, Gemini) communicate via threads, inbox/outbox, and acknowledgements. It enables durable, auditable collaboration without direct API calls.",
    why:
      "BrennerBot uses Agent Mail to coordinate research sessions across multiple models.",
    related: ["thread", "kickoff", "artifact"],
    category: "project",
  },
  thread: {
    term: "Thread",
    short: "A conversation stream in Agent Mail identified by a unique ID.",
    long:
      "A thread groups related messages together. In BrennerBot, the thread ID is the join key across Agent Mail, session artifacts, and beads issues.",
    related: ["agent-mail", "kickoff", "artifact"],
    category: "project",
  },
  kickoff: {
    term: "Kickoff",
    short: "The initial prompt that starts a research session.",
    long:
      "A kickoff message defines the research question, includes corpus excerpts, sets roles for each agent, and specifies what artifacts to produce. It's composed in the web UI or CLI.",
    related: ["thread", "artifact", "excerpt"],
    category: "project",
  },
  artifact: {
    term: "Artifact",
    short: "A structured output from a research session (hypotheses, tests, etc.).",
    long:
      "Artifacts are the tangible outputs of research sessions—hypothesis slates, discriminative tests, assumption ledgers. They follow a canonical schema and can be compiled from agent deltas.",
    related: ["thread", "kickoff", "delta"],
    category: "project",
  },
  delta: {
    term: "Delta",
    short: "A structured update to an artifact from an agent.",
    long:
      "Deltas are mergeable updates that agents produce during research sessions. Multiple deltas from different agents are compiled into the final artifact.",
    related: ["artifact", "thread"],
    category: "project",
  },
  corpus: {
    term: "Corpus",
    short: "The primary source documents in BrennerBot (transcripts + distillations).",
    long:
      "The corpus includes the complete Sydney Brenner transcript and derived distillations. It's the 'ground truth' that anchors all research sessions.",
    related: ["excerpt", "anchor"],
    category: "project",
  },
  excerpt: {
    term: "Excerpt",
    short: "A curated selection of corpus sections for a kickoff prompt.",
    long:
      "Excerpts are formatted blocks of transcript quotes with stable §n anchors. They ground research sessions in Brenner's actual words.",
    related: ["corpus", "anchor", "kickoff"],
    category: "project",
  },
  anchor: {
    term: "Anchor",
    short: "A stable reference to a transcript section (§n format).",
    long:
      "Anchors like §42, §127 provide stable, citable references to specific sections of the Brenner transcript. They don't change when formatting changes.",
    related: ["corpus", "excerpt"],
    category: "project",
  },
  beads: {
    term: "Beads",
    short: "The issue tracking system used in BrennerBot development.",
    long:
      "Beads (bd command) tracks development issues in a .beads/ directory. Issue IDs like brenner_bot-5so serve as join keys with Agent Mail threads.",
    related: ["thread", "agent-mail"],
    category: "project",
  },

  // -------------------------------------------------------------------------
  // Additional Brenner Vocabulary
  // -------------------------------------------------------------------------
  "abundance-trick": {
    term: "Abundance Trick",
    short: "Exploit naturally high quantities to avoid purification.",
    long:
      "The abundance trick uses organisms or systems where your target molecule is already present in large amounts, avoiding costly purification steps. E. coli ribosomes, for instance, are abundant enough to study without enrichment.",
    why:
      "Brenner and colleagues chose experimental systems partly based on what was naturally abundant.",
    related: ["amplify", "diy", "democratize"],
    category: "brenner",
  },
  "gedanken-organism": {
    term: "Gedanken Organism",
    short: "An imaginary organism designed to think through what's possible.",
    long:
      "A Gedanken organism is a thought experiment—a hypothetical creature with exactly the properties needed to answer your question. It clarifies what you're really asking.",
    analogy:
      "Think of it like a physicist's frictionless pulley—a simplified model that isolates the key variables.",
    why:
      "Brenner used Gedanken organisms to reason about what properties an ideal experimental system would need.",
    related: ["object-transpose", "model-organism"],
    category: "brenner",
  },
  "occams-broom": {
    term: "Occam's Broom",
    short: "Sweeping inconvenient facts under the rug.",
    long:
      "Occam's broom (coined by Sydney Brenner) is the opposite of Occam's razor. Instead of choosing the simplest explanation, people brush aside data that doesn't fit their theory.",
    why:
      "Brenner warned against this tendency to ignore contradictory evidence.",
    related: ["exception-quarantine", "paradox-hunt"],
    category: "brenner",
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a jargon term by key.
 *
 * @param termKey - The dictionary key (lowercase, hyphenated)
 * @returns The jargon term or undefined if not found
 *
 * @example
 * const term = getJargon("c-elegans");
 * if (term) console.log(term.short);
 */
export function getJargon(termKey: string): JargonTerm | undefined {
  return jargonDictionary[termKey];
}

/**
 * Get all terms in a specific category.
 *
 * @param category - The category to filter by
 * @returns Array of [key, term] tuples
 */
export function getTermsByCategory(
  category: JargonCategory
): [string, JargonTerm][] {
  return Object.entries(jargonDictionary).filter(
    ([, term]) => term.category === category
  );
}

/**
 * Get all category names with term counts.
 *
 * @returns Array of [category, count] tuples
 */
export function getCategoryCounts(): [JargonCategory, number][] {
  const counts: Record<JargonCategory, number> = {
    operators: 0,
    brenner: 0,
    biology: 0,
    bayesian: 0,
    method: 0,
    project: 0,
  };

  for (const term of Object.values(jargonDictionary)) {
    counts[term.category]++;
  }

  return Object.entries(counts) as [JargonCategory, number][];
}

/**
 * Search for terms matching a query.
 *
 * @param query - Search query
 * @returns Array of [key, term] tuples matching the query
 */
export function searchJargon(query: string): [string, JargonTerm][] {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return Object.entries(jargonDictionary);

  const parts = lowerQuery.split(/\s+/).filter(Boolean);

  return Object.entries(jargonDictionary).filter(([key, term]) => {
    const haystack = [
      key,
      term.term,
      term.short,
      term.long,
      term.analogy ?? "",
      term.why ?? "",
      ...(term.related ?? []),
    ]
      .join(" ")
      .toLowerCase();

    return parts.every((part) => haystack.includes(part));
  });
}

/**
 * Get the total number of terms in the dictionary.
 */
export function getTermCount(): number {
  return Object.keys(jargonDictionary).length;
}
