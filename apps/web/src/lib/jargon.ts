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
      "The shift from Roman to Arabic numerals made arithmetic tractable; the shift from chemistry to information theory made the genetic code tractable.",
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
      "Noether's theorem: every symmetry implies a conservation law. Find the symmetries and you find the invariants.",
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
      "Sherlock Holmes: 'When you have eliminated the impossible, whatever remains, however improbable, must be the truth.' Exclusion is stronger than confirmation.",
    why:
      "Brenner insisted on 'potent' experiments that could actually falsify theories, not just add confirming data. Transcript anchors: §69 (overlapping code elimination via forbidden amino-acid pairs), §103 ('Both could be wrong'; the third alternative), §147 ('Exclusion is always a tremendously good thing in science').",
    related: ["potency", "forbidden-pattern", "theory-kill", "potency-check"],
    category: "operators",
  },
  "object-transpose": {
    term: "Object Transpose",
    short: "Switch which entity you're experimenting on (⟂).",
    long:
      "The operator ⟂ changes what counts as the experimental object. Sometimes the organism isn't what you should vary; it might be the environment, the tool, or the question itself. Treat the Tree of Life as a component library to be raided.",
    analogy:
      "Darwin studied barnacles, not humans, to understand evolution. The right object makes intractable questions tractable.",
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
      "PCR amplifies DNA exponentially; genetics amplifies molecular events to organismal phenotypes. Nature provides gain if you know where to find it.",
    why:
      "Brenner's genetics work required amplifying molecular effects to organism-level phenotypes that could be scored by eye. Transcript anchors: §62 ('genetics is digital; it's all or none... a thousand times, a million times'), §94 (abundance trick: 'single protein accounted for 70% of all protein synthesis'), §138 (abundance dominates background), §154 (selection for rare worm mutants via tracks).",
    related: ["digital-handle", "abundance-trick"],
    category: "operators",
  },
  democratize: {
    term: "Democratize",
    short: "Make expensive techniques cheap and accessible (⇓).",
    long:
      "The operator ⇓ spreads capability. Technology that only a few labs can do is less valuable than technology any lab can use. Related to DIY: build simple tools that others can replicate.",
    analogy:
      "Negative staining democratized electron microscopy. PCR democratized molecular biology. Cheap methods compound faster than expensive ones.",
    why:
      "Brenner valued methods that could be adopted by the whole field, not just elite labs with special equipment. Transcript anchor: §86 (negative staining democratizes EM: 'now anybody could do it').",
    related: ["diy", "abundance-trick"],
    category: "operators",
  },
  "exception-quarantine": {
    term: "Exception Quarantine",
    short: "Isolate anomalies so they don't corrupt the main theory (ΔE).",
    long:
      "The operator ΔE acknowledges that some observations don't fit current theory, but rather than abandoning the theory, you quarantine the exceptions for later investigation. Preserve a high-coherence core model while isolating anomalies; put them in an appendix and resolve them later.",
    analogy:
      "Mendeleev left gaps in the periodic table for undiscovered elements. Quarantine the anomalies; let the pattern stand.",
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
      "Brenner entered molecular biology before it was a field. By the time crowds arrived, he had moved on to neuroscience.",
    why:
      "Brenner warns against fighting crowded competitions. Transcript anchors: §143 ('the best thing in science is to work out of phase'), §192 ('opening game... tremendous freedom of choice'), §210 (heroic → classical transition).",
    related: ["productive-ignorance", "paradox-hunt", "cross-domain-import"],
    category: "operators",
  },
  unentrain: {
    term: "Unentrain",
    short: "Deliberately ignore conventional wisdom to see fresh (⊙).",
    long:
      "The operator ⊙ involves productive ignorance: not knowing the 'standard' approach lets you see possibilities experts miss. The best people to push a science forward often come from outside it.",
    analogy:
      "Feynman solved physics problems by inventing his own notation. Fresh formalism reveals hidden structure.",
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
      "Shannon imported Boolean algebra into circuit design. Brenner imported information theory into genetics. The borrowed tool often works better than the native one.",
    why:
      "Brenner imported information theory from engineering to crack the genetic code. Transcript anchors: §86 (cross-domain pattern: syphilis staining → negative staining), §200 (paper triage to protect bandwidth), §230 (move fields while carrying invariants).",
    related: ["recode", "level-split", "unentrain", "productive-ignorance"],
    category: "operators",
  },
  "paradox-hunt": {
    term: "Paradox Hunt",
    short: "Actively seek contradictions; they mark discovery zones (◊).",
    long:
      "The operator ◊ treats paradoxes as valuable. Where your theory predicts one thing and reality shows another, there's something important to learn. Paradox is not a nuisance; it's a beacon pointing to missing production rules.",
    analogy:
      "The UV catastrophe led to quantum mechanics. The perihelion of Mercury led to general relativity. Paradoxes are not bugs but features.",
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
      "Feynman: 'The first principle is that you must not fool yourself, and you are the easiest person to fool.' Kill your darlings.",
    why:
      "Brenner's harsh self-criticism prevented him from publishing weak ideas. Transcript anchor: §229 ('When they go ugly, kill them. Get rid of them').",
    related: ["exclusion-test", "potency", "forbidden-pattern"],
    category: "operators",
  },
  materialize: {
    term: "Materialize",
    short: "Turn abstract theory into concrete, testable predictions (⌂).",
    long:
      "The operator ⌂ grounds speculation in reality. A theory that can't be materialized into experiments isn't science; it's philosophy. Ask: 'If this were true, what would I see?'",
    analogy:
      "Einstein's equivalence principle predicted gravitational light bending. Materialize the abstraction into a measurable prediction.",
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
      "Galileo ground his own lenses. Brenner built his own ultracentrifuge components. The tool is part of the discovery.",
    why:
      "Brenner and colleagues built custom equipment. Transcript anchors: §23 (build Warburg manometer), §37, §41 (heliostat), §51 ('This is something you can always do... open to you'), §86 (negative staining democratizes EM).",
    related: ["democratize", "abundance-trick"],
    category: "operators",
  },
  "scale-prison": {
    term: "Scale Prison",
    short: "Physics constrains what's possible at each size (⊞).",
    long:
      "The operator ⊞ reminds us that scale matters. Diffusion, surface area, heat: everything changes with size. What works at one scale may be impossible at another. Calculate actual numbers.",
    analogy:
      "A flea can jump 100x its body length; a human cannot. Reynolds number determines whether viscosity or inertia dominates. Scale changes the rules.",
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
      "Check whether the restaurant is open before driving across town. The cost of a phone call is negligible compared to the cost of a wasted trip.",
    why:
      "Brenner valued efficiency: why commit months of work when a quick test could rule out the hypothesis? Transcript anchor: §99 ('I'll do a quickie').",
    related: ["materialize", "exclusion-test", "potency"],
    category: "operators",
  },
  hal: {
    term: "HAL",
    short: "Have A Look: directly observe before elaborate inference (👁).",
    long:
      "The operator 👁 (HAL = Have A Look) says: before doing complex analysis, consider if you could just look. Each link in an inference chain has error probability; direct observation is often faster.",
    analogy:
      "Open the box instead of weighing it, shaking it, and running statistical tests on the sounds. Direct observation trumps indirect inference.",
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
      "Check whether the light switch is connected before concluding the bulb is burned out. Negative results require positive controls.",
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
      "A Brenner move isn't just clever; it reframes the entire problem space so that what was intractable becomes solvable. It often involves changing levels, representations, or experimental objects.",
    why:
      "The goal of BrennerBot is to help researchers recognize and execute these moves.",
    related: ["level-split", "recode", "object-transpose"],
    category: "brenner",
  },
  "decision-experiment": {
    term: "Decision Experiment",
    short: "An experiment whose result forces a choice between hypotheses.",
    long:
      "A decision experiment is designed to discriminate: it produces different results depending on which hypothesis is true. Impotent experiments confirm everything; decision experiments decide.",
    analogy:
      "A fork in the road where the signs point clearly in different directions. Each outcome rules something out.",
    why:
      "Brenner insisted experiments should make decisions, not just collect data.",
    related: ["potency", "exclusion-test", "forbidden-pattern"],
    category: "brenner",
  },
  "digital-handle": {
    term: "Digital Handle",
    short: "Discrete, countable markers that make a system tractable.",
    long:
      "Genetics provides digital handles: mutations, genes, markers that turn continuous biology into discrete problems. Without digital handles, you're measuring gradients; with them, you can count.",
    analogy:
      "Serial numbers let you track individual items instead of measuring bulk properties. Discrete beats continuous for experimental tractability.",
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
      "Asking someone's name discriminates identity; asking if they're human does not. Design for discrimination.",
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
      "A vegetarian eating meat falsifies the claim. Theories gain power from what they forbid, not from what they allow.",
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
      "Rotating a 3D object reveals its shadow; some projections reveal structure, others hide it. Choose the right representation.",
    why:
      "Brenner's shift from thinking about the genetic code as chemistry to thinking about it as information was a pivotal representation change.",
    related: ["recode", "level-split", "brenner-move"],
    category: "brenner",
  },
  "assumption-ledger": {
    term: "Assumption Ledger",
    short: "Explicit list of load-bearing assumptions and what would break them.",
    long:
      "An assumption ledger makes hidden premises visible. Every theory rests on assumptions, some explicit, most implicit. Listing them and identifying tests that would break each one turns vague theories into falsifiable claims.",
    analogy:
      "An engineering stress test identifies which joints are load-bearing and at what weight they fail. Know your theory's failure modes.",
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
      "'Is light a wave or a particle?' The third alternative: the question assumes classical categories that don't apply.",
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
      "Brenner chose this organism because its properties matched the experiments he wanted to do, an example of object-transpose thinking.",
    related: ["object-transpose", "model-organism", "scale-prison"],
    category: "biology",
  },
  "model-organism": {
    term: "Model Organism",
    short: "A species chosen for study because its properties make experiments tractable.",
    long:
      "Model organisms (E. coli, yeast, flies, worms, mice) are chosen not because they're interesting in themselves, but because they enable experiments impossible in other species. The choice of model is itself a research decision.",
    analogy:
      "You don't need the tallest mountain to study climbing, you need one that's accessible. The right model organism makes intractable problems tractable.",
    why:
      "Brenner's choice of C. elegans was strategic: the organism's properties determined what experiments became possible.",
    related: ["c-elegans", "object-transpose"],
    category: "biology",
  },
  "genetic-code": {
    term: "Genetic Code",
    short: "The mapping from DNA triplets (codons) to amino acids.",
    long:
      "The genetic code translates 64 possible three-letter DNA words into 20 amino acids (plus stop signals). Brenner helped prove that the code uses non-overlapping triplets and identify the reading frame.",
    why:
      "Cracking the genetic code was Brenner's first major achievement, done through clever genetics rather than sequencing.",
    related: ["recode", "digital-handle", "mrna"],
    category: "biology",
  },
  mrna: {
    term: "mRNA",
    short: "Messenger RNA: the intermediate that carries genetic information from DNA to ribosomes.",
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
      "A phenotype is what you can see or measure: behavior, color, size, disease. Genetics works by linking phenotypes to genotypes (DNA sequences). Brenner chose C. elegans partly because behavioral phenotypes were easy to score.",
    analogy:
      "Symptoms versus underlying cause. Phenotype is the readout; genotype is the program.",
    related: ["genotype", "digital-handle"],
    category: "biology",
  },
  genotype: {
    term: "Genotype",
    short: "The genetic makeup (DNA sequence) of an organism.",
    long:
      "A genotype is the DNA sequence information, what's actually encoded in the genes. Connecting genotype to phenotype is the central problem of genetics.",
    related: ["phenotype", "genetic-code"],
    category: "biology",
  },
  mutagenesis: {
    term: "Mutagenesis",
    short: "Deliberately inducing mutations to study gene function.",
    long:
      "Mutagenesis uses chemicals, radiation, or other methods to create random mutations. By studying what breaks when genes are mutated, geneticists infer what those genes normally do.",
    analogy:
      "Understand a machine by breaking parts and seeing what stops working. Genetics as reverse engineering.",
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
      "Different editions of the same book: same story, different typos or corrections.",
    related: ["gene", "wild-type", "homozygous", "heterozygous"],
    category: "biology",
  },
  gene: {
    term: "Gene",
    short: "A segment of DNA that encodes a functional product (usually a protein).",
    long:
      "Genes are the fundamental units of heredity. Each gene contains instructions for making one or more proteins. Mutations in genes alter protein function, producing phenotypic changes that geneticists can study.",
    analogy:
      "A recipe in a cookbook. DNA is the cookbook, genes are individual recipes.",
    related: ["allele", "genetic-code", "phenotype", "genotype"],
    category: "biology",
  },
  dna: {
    term: "DNA",
    short: "Deoxyribonucleic acid: the molecule that stores genetic information.",
    long:
      "DNA is a double-helix molecule made of four nucleotide bases (A, T, G, C). The sequence of bases encodes all genetic information. DNA is transcribed to RNA and ultimately translated into proteins.",
    why:
      "Brenner's work helped establish that DNA's sequence (not its chemistry) carries the genetic message.",
    related: ["rna", "genetic-code", "gene"],
    category: "biology",
  },
  rna: {
    term: "RNA",
    short: "Ribonucleic acid: single-stranded molecule that carries and implements genetic information.",
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
    short: "The building blocks of proteins: 20 standard types coded by DNA.",
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
      "The amino acid sequence is blueprint; the folded protein is the working machine. Sequence determines function through structure.",
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
      "A typo in code: some are silent, others crash the program, a few accidentally improve it. Context determines consequence.",
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
      "One broken copy poisons the whole system. Gain-of-function or dominant-negative interference.",
    related: ["recessive", "heterozygous", "allele"],
    category: "biology",
  },
  recessive: {
    term: "Recessive",
    short: "An allele whose phenotype only shows when homozygous.",
    long:
      "A recessive allele is masked by a dominant allele in heterozygotes. Recessive mutations typically represent loss-of-function: both copies must be non-functional to show the phenotype.",
    analogy:
      "One working copy suffices. Both must fail before the system breaks. Classic loss-of-function pattern.",
    related: ["dominant", "homozygous", "allele"],
    category: "biology",
  },
  "cell-lineage": {
    term: "Cell Lineage",
    short: "The complete ancestral history of a cell, tracing back to the fertilized egg.",
    long:
      "Cell lineage maps show which cells divide to produce which daughter cells throughout development. In C. elegans, the entire lineage of all 959 cells is known, a major achievement enabled by the worm's transparency.",
    why:
      "Brenner chose C. elegans partly because its invariant cell lineage made developmental genetics tractable.",
    related: ["c-elegans", "apoptosis", "neuron"],
    category: "biology",
  },
  apoptosis: {
    term: "Apoptosis",
    short: "Programmed cell death: cells that deliberately kill themselves.",
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
      "C. elegans hermaphrodites can self-fertilize, producing genetically identical offspring. This makes genetics simpler: you can maintain pure genetic lines without crossing. Males exist but are rare (0.1%).",
    why:
      "Self-fertilization was key to Brenner's choice of C. elegans. It simplified maintaining and crossing genetic strains.",
    related: ["c-elegans", "wild-type"],
    category: "biology",
  },
  ems: {
    term: "EMS",
    short: "Ethyl methanesulfonate: a chemical mutagen widely used in genetics.",
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
      "The starting point of inference. Your prior encodes everything you knew before the current experiment.",
    related: ["posterior", "likelihood-ratio", "bayesian-update"],
    category: "bayesian",
  },
  posterior: {
    term: "Posterior",
    short: "Your updated beliefs after seeing new evidence.",
    long:
      "The posterior is what you believe after incorporating new evidence. It combines your prior beliefs with the likelihood of the evidence under each hypothesis.",
    analogy:
      "The endpoint of inference. Prior × likelihood ratio = posterior odds. Learning is updating.",
    related: ["prior", "likelihood-ratio", "bayesian-update"],
    category: "bayesian",
  },
  "likelihood-ratio": {
    term: "Likelihood Ratio",
    short: "How much more likely the evidence is under one hypothesis versus another.",
    long:
      "The likelihood ratio compares P(evidence|H1) to P(evidence|H2). A ratio of 10 means the evidence is 10x more likely if H1 is true. This is the discriminative power of an experiment.",
    why:
      "Brenner's 'potent' experiments have high likelihood ratios: they strongly favor one hypothesis over another.",
    related: ["potency", "decision-experiment", "bayesian-update"],
    category: "bayesian",
  },
  "bayesian-update": {
    term: "Bayesian Update",
    short: "Revising beliefs by combining prior probability with new evidence.",
    long:
      "Bayesian updating multiplies your prior odds by the likelihood ratio to get posterior odds. It's the mathematically correct way to learn from evidence.",
    analogy:
      "Prior odds × likelihood ratio = posterior odds. The multiplication rule of rational belief revision.",
    related: ["prior", "posterior", "likelihood-ratio"],
    category: "bayesian",
  },
  "kl-divergence": {
    term: "KL Divergence",
    short: "Measures how different two probability distributions are.",
    long:
      "Kullback-Leibler divergence quantifies the information lost when approximating one distribution with another. It's used to measure how much an experiment could teach you.",
    analogy:
      "The expected surprise when reality follows one distribution but you predicted another. Asymmetric: KL(P||Q) ≠ KL(Q||P).",
    related: ["likelihood-ratio", "prior", "posterior"],
    category: "bayesian",
  },
  odds: {
    term: "Odds",
    short: "The ratio of probability of an event to probability it doesn't happen.",
    long:
      "Odds express probability differently: if probability is 75%, odds are 3:1 (three times more likely to happen than not). Bayesian updating is often cleaner using odds than probabilities.",
    analogy:
      "Probability 0.75 = odds 3:1. Odds multiply cleanly under Bayes; probabilities require normalization.",
    related: ["prior", "posterior", "bayesian-update"],
    category: "bayesian",
  },
  "bayes-factor": {
    term: "Bayes Factor",
    short: "A ratio measuring the evidence for one hypothesis versus another.",
    long:
      "The Bayes factor is the likelihood ratio integrated over parameter uncertainty. A Bayes factor of 10 means the data are 10 times more likely under one hypothesis. It's used for model comparison.",
    why:
      "Bayes factors quantify 'potency' in statistical terms: how much the data should shift beliefs.",
    related: ["likelihood-ratio", "potency", "decision-experiment"],
    category: "bayesian",
  },
  "base-rate": {
    term: "Base Rate",
    short: "The prior probability of something in a population before specific evidence.",
    long:
      "The base rate is how common something is overall. Ignoring base rates leads to bad inferences: a positive medical test doesn't mean disease if the disease is rare (base rate neglect).",
    analogy:
      "If 1 in 10,000 have a disease, even a 99% accurate test yields mostly false positives. Base rates dominate.",
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
      "High specificity = few false alarms. When the test says no, believe it. Exclusion with confidence.",
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
      "Information gain measures the expected reduction in entropy (uncertainty) from an observation. High information gain experiments are 'potent': they teach you a lot regardless of outcome.",
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
      "A hypothesis is the defendant; evidence is testimony; the experiment is the trial. Verdict: supported or refuted.",
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
      "The null hypothesis states that nothing interesting is happening: no treatment effect, no correlation, no difference between groups. Experiments try to reject the null.",
    analogy:
      "Innocent until proven guilty. The burden of proof lies on the alternative hypothesis.",
    related: ["falsification", "potency"],
    category: "method",
  },
  control: {
    term: "Control",
    short: "The baseline condition an experiment compares against.",
    long:
      "A control group or condition is identical to the experimental condition except for the variable being tested. Without proper controls, you can't attribute results to your manipulation.",
    why:
      "Brenner emphasized 'chastity controls,' controls that verify your assay actually works.",
    related: ["potency", "null-hypothesis"],
    category: "method",
  },
  replication: {
    term: "Replication",
    short: "Repeating an experiment to verify results are real.",
    long:
      "Replication means getting the same results when an experiment is repeated. Results that don't replicate are likely spurious: noise, error, or fraud.",
    related: ["control", "null-hypothesis"],
    category: "method",
  },
  paradigm: {
    term: "Paradigm",
    short: "A framework of assumptions, methods, and problems that defines a scientific field.",
    long:
      "A paradigm (in Kuhn's sense) is the shared worldview of a scientific community. It determines what counts as a good question, valid evidence, and acceptable explanation. Paradigm shifts revolutionize fields.",
    analogy:
      "A lens that makes certain things visible while hiding others. Different paradigms reveal different phenomena.",
    why:
      "Brenner operated across paradigms (biochemistry, information theory, genetics), importing methods between them.",
    related: ["representation-change", "cross-domain-import"],
    category: "method",
  },
  induction: {
    term: "Induction",
    short: "Generalizing from specific observations to broader principles.",
    long:
      "Induction moves from particular instances to general rules. Observing many white swans leads to 'all swans are white' (until you see a black one). Induction is fallible but essential for discovery.",
    analogy:
      "Pattern recognition elevated to principle. Powerful but defeasible: one black swan refutes the generalization.",
    related: ["hypothesis", "falsification"],
    category: "method",
  },
  deduction: {
    term: "Deduction",
    short: "Deriving specific conclusions from general principles.",
    long:
      "Deduction moves from general rules to specific predictions. If all DNA is made of ATGC, then this DNA must be made of ATGC. Deduction is logically certain if premises are true.",
    analogy:
      "If the premises are true, the conclusion must follow. Certainty purchased by assuming the general rule.",
    related: ["hypothesis", "falsification", "induction"],
    category: "method",
  },
  operationalization: {
    term: "Operationalization",
    short: "Defining abstract concepts in terms of measurable procedures.",
    long:
      "Operationalization turns vague ideas into specific measurements. 'Intelligence' becomes 'IQ test score.' 'Movement defect' becomes 'thrashes per minute.' Without operationalization, experiments are impossible.",
    why:
      "Brenner's experiments required operationalizing abstract concepts like 'behavior' into scorable phenotypes.",
    related: ["phenotype", "materialize"],
    category: "method",
  },
  "blind-experiment": {
    term: "Blind Experiment",
    short: "A design where the experimenter doesn't know treatment assignments.",
    long:
      "A blind experiment hides treatment assignment from the experimenter. This prevents unconscious bias in measurement or interpretation.",
    related: ["control", "double-blind"],
    category: "method",
  },
  "double-blind": {
    term: "Double-blind",
    short: "Neither experimenter nor subject knows treatment assignment.",
    long:
      "Double-blind designs hide treatment assignment from both experimenters and subjects. This prevents both unconscious experimenter bias and placebo effects in subjects.",
    analogy:
      "Neither the taster nor the pourer knows which cup is which. Maximum protection against bias.",
    related: ["blind-experiment", "control"],
    category: "method",
  },
  confound: {
    term: "Confound",
    short: "A hidden variable that varies with treatment and could explain results.",
    long:
      "A confound is something that changes along with your manipulation, making it impossible to know which caused the effect. Good experimental design eliminates or controls for confounds.",
    analogy:
      "Testing whether exercise improves mood while only studying outdoor exercisers confounds exercise with sunlight exposure. You cannot attribute the effect.",
    why:
      "Brenner's experimental designs were careful to isolate variables. A confounded experiment is impotent.",
    related: ["control", "replication"],
    category: "method",
  },
  "p-hacking": {
    term: "P-hacking",
    short: "Manipulating analysis until results appear statistically significant.",
    long:
      "P-hacking includes trying many analyses and only reporting ones that 'work,' optional stopping, or post-hoc hypothesis changes. It inflates false positive rates and undermines science.",
    why:
      "Brenner's emphasis on designing discriminative experiments upfront is an antidote to p-hacking.",
    related: ["null-hypothesis", "falsification", "replication"],
    category: "method",
  },
  reproducibility: {
    term: "Reproducibility",
    short: "Whether results can be obtained again using the same methods.",
    long:
      "Reproducibility means another lab can get the same results following your protocol. Irreproducible results are a crisis in science: they may reflect error, fraud, or insufficient detail in methods.",
    related: ["replication", "operationalization"],
    category: "method",
  },
  "forward-genetics": {
    term: "Forward Genetics",
    short: "Starting with a phenotype and working backward to find the gene.",
    long:
      "Forward genetics screens for mutants with interesting phenotypes, then identifies which genes are affected. This is the classical approach Brenner used in C. elegans.",
    why:
      "Brenner's C. elegans screens exemplify forward genetics: start with behavior, find mutations, map genes.",
    related: ["mutagenesis", "phenotype", "c-elegans"],
    category: "method",
  },
  "reverse-genetics": {
    term: "Reverse Genetics",
    short: "Starting with a gene and asking what phenotype its mutation causes.",
    long:
      "Reverse genetics deliberately mutates a known gene and observes the resulting phenotype. This became possible with molecular biology tools and complements forward genetics.",
    related: ["forward-genetics", "genotype", "phenotype"],
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
      "Artifacts are the tangible outputs of research sessions: hypothesis slates, discriminative tests, assumption ledgers. They follow a canonical schema and can be compiled from agent deltas.",
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
  quotebank: {
    term: "Quote Bank",
    short: "A curated collection of quotable passages from the Brenner corpus.",
    long:
      "The quote bank organizes memorable passages from Brenner's transcript by theme, operator, or concept. It enables quick access to relevant quotes for research sessions and UI display.",
    related: ["anchor", "excerpt", "corpus"],
    category: "project",
  },
  distillation: {
    term: "Distillation",
    short: "A processed, structured summary derived from the raw corpus.",
    long:
      "Distillations extract and organize key insights from Brenner's transcript: operator definitions, methodology principles, and thematic summaries. They make the corpus more accessible.",
    related: ["corpus", "excerpt"],
    category: "project",
  },
  "hypothesis-slate": {
    term: "Hypothesis Slate",
    short: "A structured list of competing hypotheses to be evaluated.",
    long:
      "A hypothesis slate is a core artifact type listing competing explanations for a phenomenon. Each hypothesis includes predictions, testable claims, and links to supporting/contradicting evidence.",
    related: ["artifact", "discriminative-test", "assumption-ledger"],
    category: "project",
  },
  "discriminative-test": {
    term: "Discriminative Test",
    short: "An experiment designed to distinguish between competing hypotheses.",
    long:
      "A discriminative test is an artifact type describing experiments that would give different results under different hypotheses. It operationalizes Brenner's emphasis on potent experiments.",
    related: ["hypothesis-slate", "artifact", "potency"],
    category: "project",
  },
  session: {
    term: "Session",
    short: "A research interaction between human and AI agents on a specific question.",
    long:
      "A session is a bounded research conversation that produces artifacts. Sessions start with kickoff prompts, involve multiple agent turns, and end with compiled outputs.",
    related: ["kickoff", "thread", "artifact"],
    category: "project",
  },
  metaprompt: {
    term: "Metaprompt",
    short: "A template that generates specific prompts for different research contexts.",
    long:
      "Metaprompts are parameterized templates that produce tailored prompts based on corpus excerpts, operator focus, and research questions. They enable consistent, high-quality kickoffs.",
    related: ["kickoff", "session", "excerpt"],
    category: "project",
  },
  "operator-library": {
    term: "Operator Library",
    short: "The collection of Brenner operators defined in the system.",
    long:
      "The operator library defines the set of cognitive moves Brenner used. Each operator has a symbol, definition, examples, and anti-patterns. It's the core intellectual content of BrennerBot.",
    related: ["level-split", "recode", "exclusion-test"],
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
      "A Gedanken organism is a thought experiment, a hypothetical creature with exactly the properties needed to answer your question. It clarifies what you're really asking.",
    analogy:
      "The physicist's frictionless pulley or spherical cow. Simplify to isolate the essential question.",
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

  // -------------------------------------------------------------------------
  // Alias for quote-bank (hyphenated version)
  // -------------------------------------------------------------------------
  "quote-bank": {
    term: "Quote Bank",
    short: "A curated collection of Brenner quotes organized by theme.",
    long:
      "The quote bank is a structured collection of excerpts from the Brenner transcript, organized by operator, theme, or principle. It serves as raw material for distillations and provides anchors for claims.",
    related: ["anchor", "excerpt", "corpus"],
    category: "project",
  },

  // -------------------------------------------------------------------------
  // Additional aliases and missing terms
  // -------------------------------------------------------------------------
  "brenner-loop": {
    term: "Brenner Loop",
    short: "The iterative research cycle: hypothesize, design discriminative test, run, update.",
    long:
      "The Brenner Loop is the core research methodology: generate competing hypotheses, design experiments that discriminate between them, run the simplest adequate test, and update beliefs based on results. It operationalizes Brenner's emphasis on potent, discriminative experiments.",
    analogy:
      "The scientific method optimized for maximum information gain per experiment. Each iteration should discriminate.",
    why:
      "BrennerBot sessions follow this loop structure to ensure research stays focused on discriminative tests rather than confirmation-seeking.",
    related: ["discriminative-test", "hypothesis-slate", "potency", "bayesian-update"],
    category: "brenner",
  },
  "brenner-method": {
    term: "Brenner Method",
    short: "Sydney Brenner's approach to scientific research: function before mechanism.",
    long:
      "The Brenner method prioritizes understanding what a system does (function) before how it does it (mechanism). It emphasizes choosing the right experimental object, designing discriminative tests, and maintaining productive ignorance of conventional approaches.",
    why:
      "The entire BrennerBot project aims to make this methodology accessible and teachable.",
    related: ["brenner-loop", "object-transpose", "productive-ignorance", "discriminative-test"],
    category: "brenner",
  },
  operators: {
    term: "Operators",
    short: "Reusable cognitive moves for transforming stuck problems into tractable ones.",
    long:
      "Brenner operators are named patterns of scientific reasoning, such as level-split (⊘), recode (𝓛), and exclusion-test (✂), that can be composed to tackle complex problems. They form the 'operator algebra' of scientific methodology.",
    related: ["level-split", "recode", "exclusion-test", "operator-library"],
    category: "brenner",
  },
  "discriminative-experiment": {
    term: "Discriminative Experiment",
    short: "An experiment designed to distinguish between competing hypotheses.",
    long:
      "A discriminative experiment gives different results depending on which hypothesis is true. It's the opposite of an 'impotent' experiment that confirms everything. Designing discriminative experiments is the core skill Brenner emphasized.",
    related: ["discriminative-test", "potency", "exclusion-test", "decision-experiment"],
    category: "brenner",
  },

  // -------------------------------------------------------------------------
  // Tier 1: Critical Core Concepts
  // -------------------------------------------------------------------------
  "dont-worry-hypothesis": {
    term: "Don't Worry Hypothesis",
    short: "Assume a mechanism exists and proceed; don't block on seeming impossibilities.",
    long:
      "When a theory has strong evidence but one component 'seems impossible,' assume that component has some solution and proceed. Nature has had billions of years to solve engineering problems. 'Seems impossible' usually means 'I can't currently imagine how.' This lets theory development proceed productively.",
    analogy:
      "Like assuming your package will arrive even though you don't know the exact route the delivery truck takes.",
    why:
      "Brenner applied this to DNA unwinding (§57), energy in protein synthesis, and repeatedly to avoid blocking on tractable-but-secondary problems. It's 'very important in biology' because it permits productive work despite apparent difficulties.",
    related: ["exception-quarantine", "house-of-cards", "theory-kill", "third-alternative"],
    category: "brenner",
  },
  "generative-grammar": {
    term: "Generative Grammar",
    short: "The discoverable causal rules that produce phenomena—reality's 'source code.'",
    long:
      "Brenner's first axiom: the world is not merely patterns and correlations but is produced by causal machinery operating according to discoverable rules. Biology is literally computation—DNA is source code, development is execution, mutation is debugging, evolution is version control. Science is reverse-engineering these production rules.",
    analogy:
      "Like the grammar of a language that generates infinite sentences from finite rules—or like source code that compiles into a running program.",
    why:
      "This ontology—learned from Von Neumann's work on self-reproducing automata—underlies Brenner's entire approach. 'The moment I saw the DNA molecule, then I knew it.' Transcript anchors: §23-36 (DNA as information), §126 (gedanken mouse), §147 (proper simulation).",
    related: ["two-axioms", "machine-language", "level-split", "recode"],
    category: "brenner",
  },
  "house-of-cards": {
    term: "House of Cards",
    short: "Theory architecture where all components mutually constrain—all or nothing.",
    long:
      "Build theories where every prediction depends on others. You can't accept one part and reject the rest. If N independent predictions each have probability p of being true by chance, the whole theory has probability p^N. This makes theories fragile in principle but extremely well-confirmed when they survive testing.",
    analogy:
      "Like a jigsaw puzzle where every piece interlocks—you can't remove one piece and claim the rest still work.",
    why:
      "The genetic code theory was 'the real house of cards theory; you had to buy everything... it was all or nothing theory' (§111). Attack any part and the whole falls. This architecture multiplies evidential weight exponentially.",
    related: ["exception-quarantine", "occams-broom", "forbidden-pattern", "assumption-ledger"],
    category: "brenner",
  },
  "chastity-impotence": {
    term: "Chastity vs Impotence",
    short: "Distinguish 'won't happen' (chaste) from 'can't detect' (impotent).",
    long:
      "Same null result, fundamentally different reasons. A chaste experiment correctly shows an effect doesn't exist. An impotent experiment fails to detect an effect that exists. Before interpreting negative results, verify your intervention actually worked (potency check). The outcome is the same; the reasons are fundamentally different.",
    analogy:
      "Like the difference between 'the suspect has an alibi' (chaste—truly innocent) and 'we couldn't reach the witness' (impotent—can't tell).",
    why:
      "Brenner's wordplay crystallizes a fundamental experimental distinction (§50). Science must distinguish true negatives from false negatives. Many failed replications are impotent, not chaste.",
    related: ["potency-check", "potency", "exclusion-test", "decision-experiment"],
    category: "brenner",
  },
  "cheap-loop": {
    term: "Cheap Loop",
    short: "Minimize time between hypothesis and test; optimize for iteration speed.",
    long:
      "Research productivity depends on loop time—how fast you can propose, test, and update. Bureaucracy, expensive equipment, and slow assays are taxes on discrimination. Choose systems where experiments are cheap and fast. The 'quickie' is a cheap loop strategy.",
    analogy:
      "Like preferring a whiteboard over a formal proposal process—speed of iteration beats perfection of planning.",
    why:
      "Brenner valued arriving at a lab and doing an experiment immediately (§80). 'What was so interesting in those times was you could arrive at a lab and do an experiment.' The quickie (§99) exemplifies cheap loop thinking.",
    related: ["quickie", "hal", "diy", "materialize", "brenner-loop"],
    category: "brenner",
  },
  "two-axioms": {
    term: "Two Axioms",
    short: "Brenner's foundational commitments: reality has grammar, understanding = reconstruction.",
    long:
      "Everything in Brenner's method derives from two axioms. Axiom 1: Reality has a generative grammar—phenomena are produced by causal machinery operating according to discoverable rules. Axiom 2: To understand is to be able to reconstruct—you haven't explained something until you can specify how to build it from primitives (the Gedanken Organism Standard).",
    analogy:
      "Like Euclid's axioms generating all of geometry—from these two commitments, the entire Brenner method unfolds with logical necessity.",
    why:
      "These axioms are the generative core from which all Brenner operators and strategies derive. Understand them and the rest follows as corollary.",
    related: ["generative-grammar", "gedanken-organism", "machine-language", "level-split"],
    category: "brenner",
  },
  satisficing: {
    term: "Satisficing",
    short: "Evolution satisfies constraints rather than optimizing: good enough beats best.",
    long:
      "A key insight from Herbert Simon applied to biology: evolution doesn't find optimal solutions, it finds solutions that satisfy the relevant constraints. 'Function precedes mechanism': what matters is that something works, not that it works optimally. This explains why biological systems often look 'messy' rather than elegant.",
    analogy:
      "Buy the first apartment that meets your requirements rather than viewing every apartment in the city. Evolution is a satisficer, not an optimizer.",
    why:
      "This axiom liberates thinking from teleological optimization assumptions. Evolution tinkers; it doesn't engineer. Transcript anchors: Part I distillation (Axiom 1 discussion).",
    related: ["two-axioms", "generative-grammar", "gedanken-organism"],
    category: "brenner",
  },
  "imprisoned-imagination": {
    term: "Imprisoned Imagination",
    short: "Constrain theorizing by physical reality—calculate before speculating.",
    long:
      "Stay 'imprisoned within the physical context of everything.' Before theorizing, get the scale right. The DNA in a bacterium is 1mm long, folded up a thousand times in a 1μ cell. Ribosomes are packed so tightly that messengers thread through them 'like hysterical snakes.' Pictures showing a bacterium with 'a little circle in it' are ridiculous.",
    analogy:
      "Like an architect who can't just draw pretty pictures but must specify actual materials and loads—imagination constrained by physics becomes powerful.",
    why:
      "This 'imprisonment' is actually liberation—it prevents theorizing that can't possibly work physically. Brenner and Crick 'tried very hard to stay imprisoned within the physical context of everything' (§229).",
    related: ["scale-prison", "materialize", "gedanken-organism"],
    category: "brenner",
  },
  "conversational-science": {
    term: "Conversational Science",
    short: "Thinking out loud as cognitive technology: externalize half-formed ideas.",
    long:
      "Never restrain yourself; say it, even if it's completely stupid and ridiculous and wrong. Uttering an idea gets it into the open where others can pick up something from it. Ideas are 'at least 50% wrong the first time' they appear. Speaking externalizes thought, enabling self-correction, combinatorial recombination with other minds, and creation of an 'extended cognitive system.'",
    analogy:
      "Pair programming catches errors that solo coding misses. The blackboard discussions weren't social niceties but thinking technology.",
    why:
      "The 20 years sharing an office with Crick, the Talmudic readings of textbooks aloud, the late nights talking science till 4am were research methods, not recreation. Transcript anchors: §167, §319-332.",
    related: ["productive-ignorance", "cross-domain-import", "brenner-loop"],
    category: "brenner",
  },

  // -------------------------------------------------------------------------
  // Tier 2: Important Methodology Terms
  // -------------------------------------------------------------------------
  "machine-language": {
    term: "Machine Language",
    short: "The primitives a system actually computes with, not metaphors but real operations.",
    long:
      "Every system computes in its own primitives. For genetics: genes, alleles, recombination events. For development: cells, divisions, recognition proteins. For behavior: neurons, synapses, connection strengths. If your explanation uses vocabulary the system cannot 'execute,' you have made a category error.",
    analogy:
      "Describing what a program does in English is not the same as the actual CPU instructions. Only the instructions are what the machine executes.",
    why:
      "'The machine language of development is in terms of cells and the recognition proteins they carry... not gradients and not differential equations' (§208). Brenner insisted explanations must be expressible in the system's actual primitives.",
    related: ["level-split", "generative-grammar", "two-axioms", "recode"],
    category: "brenner",
  },
  "negative-staining": {
    term: "Negative Staining",
    short: "A democratizing EM technique discovered via cross-domain pattern recognition.",
    long:
      "A technique that 'took electron microscopy out of the hands of the elite and gave it to the people.' Instead of staining the object, you surround it with dense stain so it appears light against a dark background. Brenner recognized this from medical training (viewing syphilis spirochetes) and applied it to electron microscopy.",
    analogy:
      "Think of it like seeing a shadow—you don't illuminate the object, you illuminate everything around it so the object stands out as an absence.",
    why:
      "'Now anybody could do it' (§86). This exemplifies the democratize operator—breaking infrastructure monopolies by turning elite craft into cheap, teachable procedures via cross-domain pattern recognition.",
    related: ["democratize", "cross-domain-import", "diy", "cheap-loop"],
    category: "method",
  },
  "opening-game": {
    term: "Opening Game",
    short: "Early research phase with maximum freedom—develop position before committing.",
    long:
      "The operator ∿ means working half a wavelength ahead or behind the crowd. Avoid crowded priors and industrialized midgames. The 'opening game' has tremendous freedom of choice.",
    analogy:
      "Think of it like the opening in chess—you develop pieces and control space before launching a specific attack.",
    why:
      "'The opening game... tremendous freedom of choice' (§192). Brenner warned against jumping into crowded competitions. Work 'out of phase' with fashion to find open territory.",
    related: ["dephase", "productive-ignorance", "cheap-loop"],
    category: "brenner",
  },
  "co-linearity": {
    term: "Co-linearity",
    short: "The correspondence between gene sequence and protein sequence order.",
    long:
      "The principle that the order of mutations in a gene corresponds to the order of amino acid changes in its protein. Proving co-linearity was a major goal—it established that genes encode proteins in a simple sequential mapping, not a scrambled or overlapping code.",
    analogy:
      "Like proving that the order of words in a telegram corresponds to the order they appear in the original message—no scrambling, no codes within codes.",
    why:
      "'We could give a topological proof of co-linearity—we wouldn't have to do any protein sequencing' (§134). This was a key bridge between genetics and biochemistry, proven by clever genetic logic before sequencing was available.",
    related: ["genetic-code", "reading-frame", "recode", "digital-handle"],
    category: "biology",
  },
  "reading-frame": {
    term: "Reading Frame",
    short: "The triplet grouping that determines how DNA is decoded into protein.",
    long:
      "DNA is read in non-overlapping triplets (codons), and the 'frame' is which nucleotide you start counting from. Shift the frame by one or two bases and you get a completely different (usually nonsense) protein. The reading frame is a discrete, integer quantity—not continuous.",
    analogy:
      "Like the difference between 'THE CAT ATE' and 'HEC ATA TE'—same letters, completely different meaning depending on where you start grouping.",
    why:
      "Brenner's frameshift experiments (§109) proved the code was triplet and non-overlapping by showing that +1 and -1 frameshifts could cancel out and restore function.",
    related: ["frameshift", "genetic-code", "mutation", "codon"],
    category: "biology",
  },
  frameshift: {
    term: "Frameshift",
    short: "A mutation that shifts the reading frame, scrambling all downstream codons.",
    long:
      "An insertion or deletion of nucleotides (not multiples of 3) shifts the reading frame, causing all subsequent codons to be misread. The result is usually a completely non-functional protein. Crucially, two frameshifts in opposite directions can cancel out and restore function.",
    analogy:
      "Like accidentally deleting one space in a sentence—everything after the deletion becomes gibberish until you add another space to 'fix' the frame.",
    why:
      "Frameshift analysis was central to proving the triplet code (§90). Though ultimately superseded by direct methods, it exemplifies the Brenner approach of extracting maximum information from pattern.",
    related: ["reading-frame", "genetic-code", "mutation", "codon"],
    category: "biology",
  },
  "anatomical-dissection": {
    term: "Anatomical Dissection",
    short: "Isolate gross parts first before fine purification—chunk before fractionate.",
    long:
      "Instead of treating a complex structure as 'a mixture of proteins to go on columns and separate,' first isolate gross anatomical chunks. Make structure legible before investing in 'proper' purification. Brenner could isolate bacteriophage parts by simple pH tricks before others could by column chromatography.",
    analogy:
      "Think of it like separating a car into engine, chassis, and body before analyzing individual bolts—gross structure guides fine analysis.",
    why:
      "'The whole idea that you could actually isolate chunks as a preliminary was something no one accepted at the time' (§85). This prototype-first approach enabled faster progress with simpler tools.",
    related: ["diy", "cheap-loop", "level-split"],
    category: "method",
  },
  "mutational-spectra": {
    term: "Mutational Spectra",
    short: "Patterns across many mutants that reveal mechanism class and code structure.",
    long:
      "Use a spectrum (pattern over many mutants) to type causal mechanisms. If a chemical mutagen changes G to A, observing which amino acids change constrains the genetic code. The dream: 'we'd actually decode the protein this way' by correlating mutagen chemistry with amino acid changes.",
    analogy:
      "Like using the pattern of errors from a broken typewriter to deduce which key is stuck—the spectrum of mistakes reveals the mechanism.",
    why:
      "This was an attempt to crack the genetic code through mutagen logic rather than sequencing (§90). Though ultimately superseded by direct methods, it exemplifies the Brenner approach of extracting maximum information from pattern.",
    related: ["genetic-code", "mutation", "forbidden-pattern", "digital-handle"],
    category: "method",
  },

  // -------------------------------------------------------------------------
  // Tier 3: Project/UI Terms
  // -------------------------------------------------------------------------
  crosswalk: {
    term: "Crosswalk",
    short: "Comparison table showing how different model distillations map the same concepts.",
    long:
      "A structured comparison of how Opus 4.5, GPT-5.2, and Gemini 3 each articulate the same underlying Brenner concepts. The crosswalk reveals convergent insights (multiple models independently identify the same pattern) and divergent framings (different models emphasize different aspects).",
    why:
      "Multi-model consensus is more robust than single-model output. The crosswalk helps identify which insights are model-independent (probably real) versus model-specific (possibly artifacts).",
    related: ["distillation", "corpus", "metaprompt"],
    category: "project",
  },
  transcript: {
    term: "Transcript",
    short: "The raw 236-section Brenner interview—the primary source material.",
    long:
      "The complete transcript of Sydney Brenner's oral history interviews, organized into 236 numbered sections. This is the authoritative source from which all distillations, operators, and quote-bank entries derive. Section references use the §n format (e.g., §57, §86).",
    why:
      "Every claim about Brenner's method should be traceable to specific transcript sections. The §n anchors ensure distillations remain grounded in primary evidence rather than drifting into interpretation.",
    related: ["section", "corpus", "anchor", "quote-bank"],
    category: "project",
  },
  section: {
    term: "Section",
    short: "A numbered unit of the Brenner transcript, referenced as §n.",
    long:
      "The transcript is divided into numbered sections (§1 through §236). Each section typically covers a single topic, story, or methodological point. Section references (§57, §86, §109, etc.) provide precise attribution for Brenner quotes and concepts.",
    analogy:
      "Like verse numbers in a sacred text—allowing precise citation and cross-referencing regardless of page layout or edition.",
    why:
      "Section numbers enable granular references that survive reformatting. When a definition cites '§57,' you can locate the exact passage in the transcript.",
    related: ["transcript", "anchor", "quote-bank"],
    category: "project",
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

// ============================================================================
// Auto-Matching for Text Processing
// ============================================================================

/**
 * A match found in text with its position and term key.
 */
export interface JargonMatch {
  /** Start index in the original text */
  start: number;
  /** End index in the original text */
  end: number;
  /** The matched text as it appears */
  matchedText: string;
  /** The dictionary key for this term */
  termKey: string;
}

// Cache for the compiled regex and term map
let _matcherCache: {
  regex: RegExp;
  termMap: Map<string, string>;
} | null = null;

/**
 * Build a matcher that can find jargon terms in text.
 * Results are cached for performance.
 */
function buildJargonMatcher(): { regex: RegExp; termMap: Map<string, string> } {
  if (_matcherCache) return _matcherCache;

  // Build a map from lowercase display terms to their keys
  const termMap = new Map<string, string>();

  for (const [key, term] of Object.entries(jargonDictionary)) {
    // Add the display term
    termMap.set(term.term.toLowerCase(), key);

    // Add the key itself (handles hyphenated keys)
    termMap.set(key.toLowerCase(), key);

    // Add common variations
    const termLower = term.term.toLowerCase();

    // Handle "C. elegans" variations: "c elegans", "c.elegans"
    if (termLower.includes(". ")) {
      termMap.set(termLower.replace(/\. /g, " "), key);   // "c elegans"
      termMap.set(termLower.replace(/\. /g, "."), key);   // "c.elegans" (no space)
    }

    // Handle hyphenated terms: "level-split" -> "level split"
    if (key.includes("-")) {
      termMap.set(key.replace(/-/g, " "), key);
    }
  }

  // Sort by length (longest first) to match longer terms before shorter ones
  const sortedTerms = Array.from(termMap.keys()).sort((a, b) => b.length - a.length);

  // Build regex pattern - escape special chars and require word boundaries
  const escapedTerms = sortedTerms.map((t) =>
    t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );

  // Use word boundaries, case-insensitive
  const pattern = `\\b(${escapedTerms.join("|")})\\b`;
  const regex = new RegExp(pattern, "gi");

  _matcherCache = { regex, termMap };
  return _matcherCache;
}

/**
 * Find all jargon terms in a piece of text.
 *
 * @param text - The text to search
 * @returns Array of matches with positions and term keys
 *
 * @example
 * const matches = findJargonInText("C. elegans uses potency checks.");
 * // Returns matches for "C. elegans" and "potency"
 */
export function findJargonInText(text: string): JargonMatch[] {
  const { regex, termMap } = buildJargonMatcher();
  const matches: JargonMatch[] = [];

  // Reset regex state
  regex.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const matchedText = match[0];
    const termKey = termMap.get(matchedText.toLowerCase());

    if (termKey) {
      matches.push({
        start: match.index,
        end: match.index + matchedText.length,
        matchedText,
        termKey,
      });
    }
  }

  return matches;
}

/**
 * Get the set of all matchable term patterns (for debugging/testing).
 */
export function getMatchableTerms(): string[] {
  const { termMap } = buildJargonMatcher();
  return Array.from(termMap.keys());
}
