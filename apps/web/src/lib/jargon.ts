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
      "The operator ΔE acknowledges that some observations don't fit current theory, but rather than abandoning the theory, you quarantine the exceptions for later investigation.",
    analogy:
      "Think of it like a hospital's isolation ward—you don't shut down the whole hospital because of a few unusual cases.",
    why:
      "Brenner understood that exceptions often reveal deeper truths, but only after the main theory is solid enough to define what counts as exceptional.",
    related: ["forbidden-pattern", "exclusion-test"],
    category: "operators",
  },
  dephase: {
    term: "Dephase",
    short: "Delay commitment to maximize information gathering (∿).",
    long:
      "The operator ∿ keeps options open during the 'opening game' of research. Premature commitment to a hypothesis closes off exploration.",
    analogy:
      "Think of it like the opening in chess—you develop pieces and control space before launching a specific attack.",
    why:
      "Brenner warns against jumping to conclusions. Early research should gather data, not defend positions.",
    related: ["productive-ignorance", "paradox-hunt"],
    category: "operators",
  },
  unentrain: {
    term: "Unentrain",
    short: "Deliberately ignore conventional wisdom to see fresh (⊙).",
    long:
      "The operator ⊙ involves productive ignorance—not knowing the 'standard' approach lets you see possibilities experts miss.",
    analogy:
      "Think of it like a child asking 'why?' about things adults take for granted.",
    why:
      "Brenner's outsider status in several fields gave him advantages—he wasn't blinded by what everyone 'knew' was true.",
    related: ["dephase", "productive-ignorance"],
    category: "operators",
  },
  "cross-domain-import": {
    term: "Cross-Domain Import",
    short: "Borrow techniques or concepts from other fields (⊕).",
    long:
      "The operator ⊕ transfers ideas across disciplinary boundaries. Solutions in one field may already exist in another.",
    analogy:
      "Think of it like how assembly line manufacturing was inspired by meatpacking plants.",
    why:
      "Brenner imported information theory from engineering to crack the genetic code—a biology problem solved with math.",
    related: ["recode", "level-split"],
    category: "operators",
  },
  "paradox-hunt": {
    term: "Paradox Hunt",
    short: "Actively seek contradictions—they mark discovery zones (◊).",
    long:
      "The operator ◊ treats paradoxes as valuable. Where your theory predicts one thing and reality shows another, there's something important to learn.",
    analogy:
      "Think of it like a detective who gets excited when the alibi doesn't match—contradictions are clues.",
    why:
      "Brenner actively sought paradoxes because resolving them forces deeper understanding.",
    related: ["forbidden-pattern", "exception-quarantine"],
    category: "operators",
  },
  "theory-kill": {
    term: "Theory Kill",
    short: "Deliberately attempt to destroy your own hypothesis (†).",
    long:
      "The operator † requires trying to falsify your own ideas before publishing. If you can't kill your theory, maybe it's true. If you can, better to find out now.",
    analogy:
      "Think of it like stress-testing a bridge before letting traffic on it.",
    why:
      "Brenner's harsh self-criticism prevented him from publishing weak ideas—he'd already killed them internally.",
    related: ["exclusion-test", "potency", "forbidden-pattern"],
    category: "operators",
  },
  materialize: {
    term: "Materialize",
    short: "Turn abstract theory into concrete, testable predictions (⌂).",
    long:
      "The operator ⌂ grounds speculation in reality. A theory that can't be materialized into experiments isn't science—it's philosophy.",
    analogy:
      "Think of it like an architect who can't just draw pretty pictures but must specify actual materials and measurements.",
    why:
      "Brenner despised armchair theorizing. Every idea had to cash out in an experiment someone could actually do.",
    related: ["scale-prison", "potency"],
    category: "operators",
  },
  diy: {
    term: "DIY",
    short: "Build your own tools when commercial ones don't exist (🔧).",
    long:
      "The operator 🔧 means building custom equipment or methods. Sometimes the right tool doesn't exist, so you make it.",
    analogy:
      "Think of it like a chef who forges their own knives because nothing on the market suits their technique.",
    why:
      "Brenner and colleagues built custom equipment when commercial options were inadequate for their precise needs.",
    related: ["democratize", "abundance-trick"],
    category: "operators",
  },
  "scale-prison": {
    term: "Scale Prison",
    short: "Physics constrains what's possible at each size (⊞).",
    long:
      "The operator ⊞ reminds us that scale matters. Diffusion, surface area, heat—everything changes with size. What works at one scale may be impossible at another.",
    analogy:
      "Think of it like how ants can carry 50x their weight, but if you scaled an ant to human size it would collapse.",
    why:
      "Brenner emphasized that biological imagination must be 'imprisoned by physics'—not everything conceivable is physically possible.",
    related: ["level-split", "materialize"],
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
