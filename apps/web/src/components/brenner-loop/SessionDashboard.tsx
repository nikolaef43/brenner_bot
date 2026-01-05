"use client";

/**
 * Session Dashboard Component
 *
 * Main dashboard layout for active Brenner Loop sessions.
 * Displays phase timeline, current phase content, hypothesis card,
 * and Brenner quote sidebar.
 *
 * @see brenner_bot-reew.1 (bead)
 * @module components/brenner-loop/SessionDashboard
 */

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Skeleton, SkeletonCard, SkeletonButton } from "@/components/ui/skeleton";
import { HypothesisCard } from "./HypothesisCard";
import { CorpusSearchDialog } from "./CorpusSearch";
import {
  useSession,
  useSessionMachine,
  usePhaseNavigation,
  getPhaseStatusClass,
  getSessionProgress,
  exportSession,
  type SessionPhase,
} from "@/lib/brenner-loop";

// ============================================================================
// Icons
// ============================================================================

const ChevronLeftIcon = ({ className }: { className?: string }) => (
  <svg className={cn("size-4", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg className={cn("size-4", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={cn("size-4", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const LockClosedIcon = ({ className }: { className?: string }) => (
  <svg className={cn("size-4", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

const SearchIcon = ({ className }: { className?: string }) => (
  <svg className={cn("size-4", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 6 6a7.5 7.5 0 0 0 10.65 10.65Z" />
  </svg>
);

// ============================================================================
// Phase Configuration
// ============================================================================

interface PhaseConfig {
  name: string;
  shortName: string;
  symbol?: string;
  description: string;
  quote?: {
    text: string;
    anchor: string;
  };
}

const PHASE_CONFIG: Record<SessionPhase, PhaseConfig> = {
  intake: {
    name: "Hypothesis Intake",
    shortName: "Intake",
    description: "Enter your initial hypothesis and research question.",
    quote: {
      text: "The secret of asking the right question is just to know what question to ask.",
      anchor: "§23",
    },
  },
  sharpening: {
    name: "Hypothesis Sharpening",
    shortName: "Sharpening",
    description: "Refine your hypothesis with predictions and falsification conditions.",
    quote: {
      text: "You have to sharpen your hypothesis to the point where it makes a unique prediction.",
      anchor: "§89",
    },
  },
  level_split: {
    name: "Level Split",
    shortName: "Levels",
    symbol: "Σ",
    description: "Identify different levels of explanation that might be conflated.",
    quote: {
      text: "The confusion of levels is the most profound error in biology.",
      anchor: "§147",
    },
  },
  exclusion_test: {
    name: "Exclusion Test",
    shortName: "Exclude",
    symbol: "⊘",
    description: "Design tests that could definitively rule out your hypothesis.",
    quote: {
      text: "Not merely unlikely—impossible if the alternative is true.",
      anchor: "§89",
    },
  },
  object_transpose: {
    name: "Object Transpose",
    shortName: "Transpose",
    symbol: "⟳",
    description: "Consider alternative experimental systems or reference frames.",
    quote: {
      text: "Change the object. Use a different experimental system where the problem is cleaner.",
      anchor: "§112",
    },
  },
  scale_check: {
    name: "Scale Check",
    shortName: "Scale",
    symbol: "⊙",
    description: "Verify physical and mathematical plausibility.",
    quote: {
      text: "Before you start, do your sums.",
      anchor: "§58",
    },
  },
  agent_dispatch: {
    name: "Agent Dispatch",
    shortName: "Agents",
    description: "Send hypothesis to AI agents for analysis.",
    quote: {
      text: "Get multiple perspectives before committing to a path.",
      anchor: "§200",
    },
  },
  synthesis: {
    name: "Synthesis",
    shortName: "Synthesis",
    description: "Synthesize agent responses and identify consensus.",
    quote: {
      text: "Listen to the disagreements—that's where the interesting problems hide.",
      anchor: "§215",
    },
  },
  evidence_gathering: {
    name: "Evidence Gathering",
    shortName: "Evidence",
    description: "Execute tests and collect evidence.",
    quote: {
      text: "The experiment must be potent—capable of excluding.",
      anchor: "§134",
    },
  },
  revision: {
    name: "Revision",
    shortName: "Revision",
    description: "Revise hypothesis based on evidence.",
    quote: {
      text: "If the evidence contradicts your hypothesis, change your hypothesis.",
      anchor: "§178",
    },
  },
  complete: {
    name: "Complete",
    shortName: "Done",
    description: "Session complete. Generate research brief.",
    quote: {
      text: "The goal is not to be right, but to be less wrong.",
      anchor: "§256",
    },
  },
};

// ============================================================================
// PhaseTimeline Component
// ============================================================================

interface PhaseTimelineProps {
  currentPhase: SessionPhase;
  reachablePhases: SessionPhase[];
  onPhaseClick?: (phase: SessionPhase) => void;
  className?: string;
}

function PhaseTimeline({
  currentPhase,
  reachablePhases,
  onPhaseClick,
  className,
}: PhaseTimelineProps) {
  const phases: SessionPhase[] = [
    "intake",
    "sharpening",
    "level_split",
    "exclusion_test",
    "object_transpose",
    "scale_check",
    "agent_dispatch",
    "synthesis",
    "evidence_gathering",
    "revision",
    "complete",
  ];

  return (
    <div className={cn("w-full", className)}>
      {/* Progress bar */}
      <div className="relative h-1 bg-muted rounded-full mb-4 overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${getSessionProgress(currentPhase)}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Phase dots */}
      <div className="flex justify-between items-start gap-1">
        {phases.map((phase, index) => {
          const config = PHASE_CONFIG[phase];
          const status = getPhaseStatusClass(currentPhase, phase, reachablePhases);
          const isClickable = status !== "locked" && phase !== currentPhase;

          return (
            <div
              key={phase}
              className="flex flex-col items-center flex-1 min-w-0"
            >
              {/* Phase dot */}
              <button
                onClick={() => isClickable && onPhaseClick?.(phase)}
                disabled={!isClickable}
                className={cn(
                  "relative size-8 rounded-full flex items-center justify-center transition-all",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  status === "complete" && "bg-primary text-primary-foreground",
                  status === "current" && "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2",
                  status === "upcoming" && "bg-muted-foreground/20 text-muted-foreground hover:bg-muted-foreground/30 cursor-pointer",
                  status === "locked" && "bg-muted text-muted-foreground/50 cursor-not-allowed"
                )}
                title={config.name}
              >
                {status === "complete" ? (
                  <CheckIcon className="size-4" />
                ) : status === "locked" ? (
                  <LockClosedIcon className="size-3" />
                ) : config.symbol ? (
                  <span className="text-xs font-bold">{config.symbol}</span>
                ) : (
                  <span className="text-xs font-medium">{index + 1}</span>
                )}
              </button>

              {/* Phase label (hidden on mobile) */}
              <span
                className={cn(
                  "mt-2 text-xs text-center truncate w-full hidden sm:block",
                  status === "current" && "font-semibold text-foreground",
                  status === "complete" && "text-muted-foreground",
                  status === "upcoming" && "text-muted-foreground",
                  status === "locked" && "text-muted-foreground/50"
                )}
              >
                {config.shortName}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// BrennerQuote Component
// ============================================================================

interface BrennerQuoteProps {
  phase: SessionPhase;
  className?: string;
}

function BrennerQuote({ phase, className }: BrennerQuoteProps) {
  const config = PHASE_CONFIG[phase];

  if (!config.quote) return null;

  return (
    <Card className={cn("bg-muted/50", className)}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-2">
          <span className="text-2xl leading-none" aria-hidden="true">&ldquo;</span>
          <div className="flex-1">
            <blockquote className="text-sm italic text-muted-foreground">
              {config.quote.text}
            </blockquote>
            <footer className="mt-2 text-xs text-muted-foreground/70">
              — Sydney Brenner, {config.quote.anchor}
            </footer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// PhaseContent Component
// ============================================================================

interface PhaseContentProps {
  phase: SessionPhase;
  className?: string;
}

function PhaseContent({ phase, className }: PhaseContentProps) {
  const config = PHASE_CONFIG[phase];

  return (
    <Card className={cn("flex-1", className)}>
      <CardHeader>
        <div className="flex items-center gap-3">
          {config.symbol && (
            <span className="text-2xl font-mono text-primary">{config.symbol}</span>
          )}
          <div>
            <CardTitle>{config.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {config.description}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Phase-specific content will be injected here */}
        <div className="min-h-[200px] flex items-center justify-center text-muted-foreground">
          <p>Phase content for &ldquo;{config.name}&rdquo; will appear here.</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SessionDashboard Component
// ============================================================================

export interface SessionDashboardProps {
  /** Optional CSS class name */
  className?: string;
  /** Callback when edit hypothesis is requested */
  onEditHypothesis?: () => void;
  /** Callback when evolve hypothesis is requested */
  onEvolveHypothesis?: () => void;
  /** Callback when view history is requested */
  onViewHistory?: () => void;
}

export function SessionDashboard({
  className,
  onEditHypothesis,
  onEvolveHypothesis,
  onViewHistory,
}: SessionDashboardProps) {
  const { session, primaryHypothesis, isLoading, error, attachQuote } = useSession();
  const [isExporting, setIsExporting] = React.useState(false);
  const [isCorpusSearchOpen, setIsCorpusSearchOpen] = React.useState(false);

  // useSessionMachine provides computed values (reachablePhases, isComplete, etc.)
  const machine = useSessionMachine(session);

  // usePhaseNavigation provides navigation actions that persist to storage
  const { prev, next, canPrev, canNext, goTo } = usePhaseNavigation();

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex flex-col gap-6", className)}>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="flex items-center gap-2">
            <SkeletonButton size="sm" />
            <SkeletonButton size="sm" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="flex flex-col gap-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn("flex items-center justify-center min-h-[400px]", className)}>
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-destructive font-medium">Error loading session</p>
            <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No session loaded
  if (!session || !machine) {
    return (
      <div className={cn("flex items-center justify-center min-h-[400px]", className)}>
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No session loaded</p>
            <Button className="mt-4">Start New Session</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handlePhaseClick = (phase: SessionPhase) => {
    // Use navigation's goTo which handles persistence
    goTo(phase);
  };

  const handleExport = async (format: "json" | "markdown") => {
    if (!session) return;
    setIsExporting(true);
    try {
      const blob = await exportSession(session, format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `brenner-session-${session.id}.${format === "json" ? "json" : "md"}`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <LoadingOverlay
        visible={isExporting}
        message="Exporting session..."
        detail="Preparing your research brief for download."
      />

      <CorpusSearchDialog
        open={isCorpusSearchOpen}
        onOpenChange={setIsCorpusSearchOpen}
        hypothesisId={session.primaryHypothesisId || undefined}
        onAttachQuote={attachQuote}
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">BrennerBot Lab</h1>
          <p className="text-sm text-muted-foreground">
            Session: {session.id}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCorpusSearchOpen(true)}
            className="gap-2"
          >
            <SearchIcon />
            Search Corpus
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("json")}
            disabled={isExporting}
          >
            Export JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("markdown")}
            disabled={isExporting}
          >
            Export Markdown
          </Button>
          <span className="text-sm text-muted-foreground">
            {Math.round(getSessionProgress(session.phase))}% complete
          </span>
        </div>
      </div>

      {/* Phase Timeline */}
      <PhaseTimeline
        currentPhase={session.phase}
        reachablePhases={machine.reachablePhases}
        onPhaseClick={handlePhaseClick}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Phase Content (2/3 width on desktop) */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={session.phase}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <PhaseContent phase={session.phase} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Sidebar (1/3 width on desktop) */}
        <div className="flex flex-col gap-4">
          {/* Hypothesis Card */}
          {primaryHypothesis && (
            <HypothesisCard
              hypothesis={primaryHypothesis}
              mode="compact"
              onEdit={onEditHypothesis ? () => onEditHypothesis() : undefined}
              onEvolve={onEvolveHypothesis}
              onViewHistory={onViewHistory}
              showConfounds={false}
              showStructure={false}
            />
          )}

          {/* Brenner Quote */}
          <BrennerQuote phase={session.phase} />
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={prev}
          disabled={!canPrev}
        >
          <ChevronLeftIcon className="size-4 mr-2" />
          Previous
        </Button>

        <Button
          onClick={next}
          disabled={!canNext || machine?.isComplete}
        >
          {machine?.isComplete ? "Complete" : "Next"}
          {!machine?.isComplete && <ChevronRightIcon className="size-4 ml-2" />}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export { PhaseTimeline, BrennerQuote, PhaseContent, PHASE_CONFIG };
