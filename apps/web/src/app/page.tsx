import Link from "next/link";
import { FeatureCard } from "@/components/ui/card";
import { Jargon } from "@/components/jargon";

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

export default function Home() {
  const labModeValue = (process.env.BRENNER_LAB_MODE ?? "").trim().toLowerCase();
  const labModeEnabled = labModeValue === "1" || labModeValue === "true";

  return (
    <div className="space-y-12 sm:space-y-16 lg:space-y-24">
      {/* Hero Section */}
      <section className="relative">
        {/* Background gradient */}
        <div className="absolute inset-0 -z-10 hero-gradient opacity-50 rounded-2xl sm:rounded-3xl" />

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
            <Link key={feature.href} href={feature.href} className="touch-manipulation">
              <FeatureCard className={`h-full animate-fade-in-up stagger-${index + 1} active:scale-[0.98] transition-transform`}>
                <div className="p-5 sm:p-6 space-y-3 sm:space-y-4">
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

      {/* Lab Mode Card */}
      {labModeEnabled && (
        <section className="animate-fade-in-up px-4 sm:px-0">
          <Link href="/sessions/new" className="touch-manipulation">
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
      <section className="py-6 sm:py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {[
            { value: "236", label: "Interview Segments" },
            { value: "3", label: "Model Distillations" },
            { value: "12+", label: "Operator Types" },
            { value: "40k+", label: "Words of Wisdom" },
          ].map((stat, index) => (
            <div
              key={stat.label}
              className={`text-center p-4 sm:p-5 rounded-xl bg-muted/30 hover:bg-muted/50 sm:bg-muted/20 sm:hover:bg-muted/40 border border-transparent hover:border-border/50 transition-all duration-300 animate-fade-in stagger-${index + 1} group cursor-default`}
            >
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gradient-primary group-hover:scale-105 transition-transform duration-300">
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-1.5 group-hover:text-foreground/70 transition-colors duration-300">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

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
    </div>
  );
}
