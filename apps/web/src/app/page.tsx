import Link from "next/link";
import { FeatureCard } from "@/components/ui/card";
import { Jargon } from "@/components/jargon";
import { WhatIsThis } from "@/components/onboarding/WhatIsThis";
import { HeroBackground } from "@/components/ui/animated-element";
import { StatsSection } from "@/components/home/stats-section";

// Icons
const BookIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);

const BeakerIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 5.07a1.125 1.125 0 01-1.135 1.416H3.933a1.125 1.125 0 01-1.135-1.416L5 14.5" />
  </svg>
);

const PlayIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="size-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

const AcademicCapIcon = () => (
  <svg className="size-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
  </svg>
);

const LightbulbIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a1.5 1.5 0 01-1.5-1.5v-.6a6 6 0 10-3-5.2v.35A3.75 3.75 0 009.25 15h5.5A3.75 3.75 0 0019 11.05v-.35a6 6 0 10-7 5.2v.6A1.5 1.5 0 0112 18zm-3 3h6" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75l7.5 3v5.57c0 4.418-3.24 8.415-7.5 9.93-4.26-1.515-7.5-5.512-7.5-9.93V6.75l7.5-3z" />
  </svg>
);

const FlowArrowIcon = () => (
  <svg className="size-5 text-muted-foreground/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

const features = [
  {
    href: "/corpus",
    icon: <BookIcon />,
    label: "Browse",
    title: "Corpus",
    description: <>The complete Brenner transcript collection from Web of Stories, plus curated <Jargon term="quote-bank">quote banks</Jargon> and <Jargon term="metaprompt">metaprompts</Jargon>.</>,
    accent: "text-primary",
  },
  {
    href: "/distillations",
    icon: <SparklesIcon />,
    label: "Compare",
    title: "Distillations",
    description: <>Three frontier model <Jargon term="distillation">distillations</Jargon> of Brenner&apos;s methodology. Compare perspectives from GPT-5.2, Opus 4.5, and Gemini 3.</>,
    accent: "text-accent",
  },
  {
    href: "/method",
    icon: <BeakerIcon />,
    label: "Learn",
    title: "Method",
    description: <>The <Jargon term="operator-library">operators</Jargon>, loop structure, and <Jargon term="bayesian-update">Bayesian</Jargon> framework that operationalize Brenner&apos;s approach to scientific discovery.</>,
    accent: "text-primary",
  },
];

const agentProfiles = [
  {
    title: "Hypothesis Generator",
    engine: "Powered by GPT",
    role: "Hunt paradoxes, propose hypotheses",
    personality: "Creative, divergent thinking",
    quote: "What if both established models are wrong?",
    icon: <LightbulbIcon />,
    accent: "from-amber-500/20 via-amber-500/5 to-background",
    iconClass: "bg-amber-500/15 text-amber-700 dark:text-amber-200",
  },
  {
    title: "Test Designer",
    engine: "Powered by Claude",
    role: "Design discriminative tests with potency controls",
    personality: "Rigorous, detail-oriented",
    quote: "This test will eliminate half our hypotheses in one observation.",
    icon: <BeakerIcon />,
    accent: "from-emerald-500/20 via-emerald-500/5 to-background",
    iconClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
  },
  {
    title: "Adversarial Critic",
    engine: "Powered by Gemini",
    role: "Attack framing, check scale constraints",
    personality: "Skeptical, thorough",
    quote: "Have you considered that the entire premise might be wrong?",
    icon: <ShieldIcon />,
    accent: "from-sky-500/20 via-sky-500/5 to-background",
    iconClass: "bg-sky-500/15 text-sky-700 dark:text-sky-200",
  },
];

const debateFormats = [
  {
    title: "Oxford Style",
    description: "Proposition vs opposition with a judge",
    bestFor: "Testing hypothesis strength",
  },
  {
    title: "Socratic",
    description: "Probing questions to surface hidden assumptions",
    bestFor: "Finding weak links fast",
  },
  {
    title: "Steelman Contest",
    description: "Build the strongest case, then dismantle it",
    bestFor: "Exploring the hypothesis space",
  },
];

const flowSteps = [
  {
    title: "Kickoff",
    body: "Threaded prompt goes to each agent role",
  },
  {
    title: "Deltas",
    body: "Structured responses return with citations",
  },
  {
    title: "Merge",
    body: "Deterministic compiler reconciles evidence",
  },
  {
    title: "Human",
    body: "You decide what ships and what dies",
  },
];

export default function Home() {
  const labModeValue = (process.env.BRENNER_LAB_MODE ?? "").trim().toLowerCase();
  const labModeEnabled = labModeValue === "1" || labModeValue === "true";

  return (
    <div className="space-y-12 sm:space-y-16 lg:space-y-24 pb-24 sm:pb-0">
      {/* Hero Section */}
      <HeroBackground
        showOrbs
        showGrid
        className="rounded-2xl sm:rounded-3xl"
        primaryOrbClass="bg-primary/25 dark:bg-primary/30"
        accentOrbClass="bg-accent/20 dark:bg-accent/25"
      >
        <div className="py-10 sm:py-12 lg:py-20 text-center space-y-4 sm:space-y-6 px-4 sm:px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium animate-fade-in">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full size-2 bg-primary"></span>
            </span>
            Research in progress
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold tracking-tight animate-fade-in-up stagger-1">
            <span className="text-gradient-primary">BrennerBot</span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg lg:text-xl text-muted-foreground leading-relaxed animate-fade-in-up stagger-2">
            Operationalizing Sydney Brenner&apos;s scientific methodology through multi-agent collaboration.
            Extract wisdom from the master, apply it to your domain.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 pt-4 px-4 sm:px-0 animate-fade-in-up stagger-3">
            <Link
              href="/corpus/transcript"
              className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 sm:py-3 rounded-xl bg-primary text-primary-foreground font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all active:scale-[0.98] touch-manipulation"
            >
              Read the Transcript
              <ArrowRightIcon />
            </Link>
            <Link
              href="/corpus"
              className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 sm:py-3 rounded-xl border border-border bg-card text-foreground font-medium shadow-sm hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 transition-all active:scale-[0.98] touch-manipulation"
            >
              Explore Corpus
              <ArrowRightIcon />
            </Link>
            <Link
              href="/distillations"
              className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 sm:py-3 rounded-xl border border-border bg-card text-foreground font-medium shadow-sm hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 transition-all active:scale-[0.98] touch-manipulation"
            >
              Read Distillations
              <ArrowRightIcon />
            </Link>
          </div>
        </div>
      </HeroBackground>

      {/* What Is This? - First-time visitor onboarding */}
      <WhatIsThis className="px-4 sm:px-0" />

      {/* Tutorial CTA - Primary discovery mechanism for tutorials */}
      <section className="px-4 sm:px-0 animate-fade-in-up">
        <Link href="/tutorial" className="block group touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-2xl">
          <div className="relative overflow-hidden rounded-xl sm:rounded-2xl p-5 sm:p-8 border border-success/30 hover:border-success/50 bg-gradient-to-br from-success/5 via-success/10 to-primary/5 shadow-lg hover:shadow-xl transition-all active:scale-[0.99]">
            {/* Decorative orbs */}
            <div className="absolute top-0 right-0 -mt-4 -mr-4 size-24 sm:size-32 bg-success/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 -mb-4 -ml-4 size-20 sm:size-24 bg-primary/10 rounded-full blur-3xl" />

            <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <div className="flex items-center justify-center size-12 sm:size-14 rounded-xl sm:rounded-2xl bg-success text-success-foreground shadow-lg">
                <AcademicCapIcon />
              </div>

              <div className="flex-1 space-y-2">
                <h3 className="text-lg sm:text-xl font-semibold text-foreground">
                  Ready to Apply the Method?
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Three learning paths from quick start to multi-agent orchestration.
                  Apply Brenner&apos;s scientific method to your own research questions.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md border border-border text-xs font-medium text-muted-foreground bg-background/50">
                    ~30 min Quick Start
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md border border-border text-xs font-medium text-muted-foreground bg-background/50">
                    Agent-Assisted
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md border border-border text-xs font-medium text-muted-foreground bg-background/50">
                    Multi-Agent Cockpit
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-success font-medium text-sm sm:text-base">
                <span>Start Tutorial</span>
                <ArrowRightIcon />
              </div>
            </div>
          </div>
        </Link>
      </section>

      {/* Features Section */}
      <section className="space-y-6 sm:space-y-8">
        <div className="text-center space-y-2 sm:space-y-3 px-4 sm:px-0">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight">
            What&apos;s Inside
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto">
            A research toolkit for applying Brenner&apos;s epistemology to your own scientific questions.
          </p>
        </div>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Link key={feature.href} href={feature.href} className="touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-2xl">
              <FeatureCard className={`h-full animate-fade-in-up stagger-${index + 1} active:scale-[0.98] transition-transform`}>
                <div className="relative z-10 p-5 sm:p-6 space-y-3 sm:space-y-4">
                  <div className={`inline-flex items-center justify-center size-10 sm:size-12 rounded-xl bg-muted ${feature.accent}`}>
                    {feature.icon}
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <span className={`text-xs sm:text-sm font-medium ${feature.accent}`}>
                      {feature.label}
                    </span>
                    <h3 className="text-lg sm:text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-primary opacity-70 sm:opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-200">
                    <span>Learn more</span>
                    <ArrowRightIcon />
                  </div>
                </div>
              </FeatureCard>
            </Link>
          ))}
        </div>
      </section>

      {/* Research Lab CTA - Always visible */}
      <section className="animate-fade-in-up px-4 sm:px-0">
        <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-border bg-gradient-to-br from-muted/30 via-card to-muted/20 p-6 sm:p-8">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 -mt-8 -mr-8 size-32 sm:size-40 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 size-24 sm:size-32 bg-accent/5 rounded-full blur-3xl" />

          <div className="relative space-y-6">
            {/* Header */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium">
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 5.07a1.125 1.125 0 01-1.135 1.416H3.933a1.125 1.125 0 01-1.135-1.416L5 14.5" />
                </svg>
                Research Lab
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Apply the Method to Your Research
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
                The <Jargon term="brenner-loop">Brenner Loop</Jargon> is an interactive research framework that helps you develop <Jargon term="discriminative-test">discriminative tests</Jargon> using four cognitive operators. Run structured sessions and track your evolving understanding.
              </p>
            </div>

            {/* Operator preview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { symbol: "Σ", name: "Level Split" },
                { symbol: "⊘", name: "Exclusion Test" },
                { symbol: "⟳", name: "Object Transpose" },
                { symbol: "⊙", name: "Scale Check" },
              ].map((op) => (
                <div key={op.symbol} className="flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl bg-background/60 border border-border/50">
                  <span className="text-xl sm:text-2xl font-bold text-primary">{op.symbol}</span>
                  <span className="text-xs sm:text-sm font-medium text-foreground text-center">{op.name}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                href="/sessions"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5 transition-all active:scale-[0.98] touch-manipulation"
              >
                Explore Sessions
                <ArrowRightIcon />
              </Link>
              <Link
                href="/operators"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border bg-card text-foreground font-medium shadow-sm hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 transition-all active:scale-[0.98] touch-manipulation"
              >
                View Operators
                <ArrowRightIcon />
              </Link>
              <Link
                href="/tutorial"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border bg-card text-foreground font-medium shadow-sm hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 transition-all active:scale-[0.98] touch-manipulation"
              >
                Start Tutorial
                <ArrowRightIcon />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-Agent Orchestration Section */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border/60 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6 sm:p-10 lg:p-12 shadow-lg">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 size-40 sm:size-56 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 size-32 sm:size-44 bg-accent/15 rounded-full blur-3xl" />

        <div className="relative space-y-8 sm:space-y-10">
          <div className="space-y-3 text-center">
            <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-muted-foreground">
              Multi-Agent Orchestration
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">
              Your Research Team: AI Agents That Debate, Challenge, and Synthesize
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              Each agent has a precise mandate. Together they sharpen hypotheses, design lethal tests, and merge
              evidence into auditable artifacts—without surrendering control.
            </p>
          </div>

          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:gap-6 sm:overflow-visible sm:grid-cols-2 lg:grid-cols-3">
            {agentProfiles.map((agent) => (
              <div
                key={agent.title}
                className="group relative min-w-[260px] snap-start overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl sm:min-w-0"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${agent.accent}`} />
                <div className="relative p-5 sm:p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex size-11 items-center justify-center rounded-xl ${agent.iconClass} shadow-inner`}>
                      {agent.icon}
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{agent.engine}</p>
                      <h3 className="text-lg font-semibold text-foreground">{agent.title}</h3>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-foreground font-medium">{agent.role}</p>
                    <p className="text-xs text-muted-foreground">{agent.personality}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/70 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Signature stance</p>
                    <p className="text-sm text-foreground italic">&quot;{agent.quote}&quot;</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:gap-6 sm:overflow-visible sm:grid-cols-3">
            {debateFormats.map((format) => (
              <div
                key={format.title}
                className="min-w-[240px] snap-start rounded-2xl border border-border/70 bg-background/80 p-4 sm:p-5 shadow-sm sm:min-w-0"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-semibold text-foreground">{format.title}</h4>
                  <span className="text-xs font-medium text-muted-foreground">Debate Mode</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{format.description}</p>
                <div className="mt-4 inline-flex items-center rounded-full border border-border/70 bg-card px-3 py-1 text-xs text-muted-foreground">
                  Best for: {format.bestFor}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-border/70 bg-card/80 p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-foreground">Coordination Visualization</h4>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Deterministic Merge</span>
              </div>
              <div className="mt-5 flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1">
                    <span className="size-2 rounded-full bg-primary animate-pulse" />
                    Thread ID: RS-20260106-001
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1">
                    <span className="size-2 rounded-full bg-accent animate-pulse" />
                    Ack tracking enabled
                  </span>
                </div>
                <div className="flex flex-col gap-4">
                  {flowSteps.map((step, index) => (
                    <div key={step.title} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-full border border-border/70 bg-background text-sm font-semibold text-foreground">
                          {index + 1}
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">{step.title}</p>
                          <p className="text-xs text-muted-foreground">{step.body}</p>
                        </div>
                      </div>
                      {index < flowSteps.length - 1 && (
                        <div className="flex items-center justify-center sm:ml-auto">
                          <div className="hidden sm:block">
                            <FlowArrowIcon />
                          </div>
                          <div className="sm:hidden rotate-90">
                            <FlowArrowIcon />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/80 p-5 sm:p-6 space-y-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Coordination Without Chaos</p>
                <h4 className="text-lg font-semibold text-foreground">Agent Mail keeps every exchange auditable</h4>
                <p className="text-sm text-muted-foreground">
                  Every message lands in a thread, every response is acknowledged, and every delta is preserved. You stay
                  in the loop with human approval gates at every step.
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-card px-4 py-3 text-sm text-muted-foreground">
                Built on <Jargon term="agent-mail">Agent Mail</Jargon> with thread IDs, ack receipts, and merge-safe deltas.
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Kickoff sent</span>
                  <span className="text-success font-medium">3 agents live</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Deltas merged</span>
                  <span className="text-primary font-medium">1 artifact ready</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Human approval</span>
                  <span className="text-foreground font-medium">Required</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lab Mode Card */}
      {labModeEnabled && (
        <section className="animate-fade-in-up px-4 sm:px-0">
          <Link href="/sessions/new" className="touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-2xl block">
            <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 p-5 sm:p-8 shadow-lg hover:shadow-xl hover:border-primary/50 active:scale-[0.99] transition-all group">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 size-24 sm:size-32 bg-primary/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 -mb-4 -ml-4 size-20 sm:size-24 bg-accent/10 rounded-full blur-3xl" />

              <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                <div className="flex items-center justify-center size-12 sm:size-14 rounded-xl sm:rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
                  <PlayIcon />
                </div>
                <div className="flex-1 space-y-1.5 sm:space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-medium text-primary">Lab Mode Active</span>
                    <span className="flex size-2 rounded-full bg-success animate-pulse" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-foreground">
                    Start a Research Session
                  </h3>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Compose a <Jargon term="kickoff">kickoff</Jargon> prompt and send it to your agent constellation via <Jargon term="agent-mail">Agent Mail</Jargon>.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-primary font-medium text-sm sm:text-base">
                  <span>Launch</span>
                  <ArrowRightIcon />
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Stats/Info Section */}
      <StatsSection />

      {/* Quote Section */}
      <section className="py-6 sm:py-8 px-4 sm:px-0">
        <blockquote className="relative max-w-3xl mx-auto text-center">
          <div className="absolute -top-2 sm:-top-4 left-1/2 -translate-x-1/2 text-5xl sm:text-6xl text-primary/20 font-serif select-none">
            &ldquo;
          </div>
          <p className="text-lg sm:text-xl lg:text-2xl text-foreground leading-relaxed italic pt-6 sm:pt-8">
            I think many fields of science could do a great deal better if they went back to the
            <span className="text-primary font-medium"> classical approach</span> of studying a problem,
            rather than following the latest fashion.
          </p>
          <footer className="mt-4 sm:mt-6 text-muted-foreground">
            <cite className="not-italic font-medium block sm:inline">Sydney Brenner</cite>
            <span className="hidden sm:inline mx-2">·</span>
            <span className="text-xs sm:text-sm block sm:inline mt-1 sm:mt-0">Nobel Laureate in Physiology or Medicine, 2002</span>
          </footer>
        </blockquote>
      </section>

      {/* Mobile Sticky CTA */}
      <div className="sm:hidden fixed bottom-4 left-4 right-4 z-40">
        <Link
          href="/tutorial"
          className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all active:scale-[0.99]"
        >
          Start the Tutorial
          <ArrowRightIcon />
        </Link>
      </div>
    </div>
  );
}
