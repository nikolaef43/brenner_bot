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
import { toast } from "@/components/ui/toast";
import { HypothesisCard } from "./HypothesisCard";
import { PhaseTimeline } from "./PhaseTimeline";
import { useAsyncOperation } from "@/hooks/useAsyncOperation";
import { CorpusSearchDialog } from "./CorpusSearch";
import {
  PHASE_ORDER,
  useSession,
  useSessionMachine,
  usePhaseNavigation,
  getSessionProgress,
  exportSession,
  type Session,
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

async function exportSessionToFile(session: Session, format: "json" | "markdown"): Promise<void> {
  const blob = await exportSession(session, format);
  const url = URL.createObjectURL(blob);

  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = `brenner-session-${session.id}.${format === "json" ? "json" : "md"}`;
    link.click();
  } finally {
    URL.revokeObjectURL(url);
  }
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
  const {
    session,
    primaryHypothesis,
    isLoading,
    error,
    attachQuote,
    isDirty,
    saveState,
  } = useSession();
  const exportOperation = useAsyncOperation();
  const [isCorpusSearchOpen, setIsCorpusSearchOpen] = React.useState(false);
  const lastSaveErrorRef = React.useRef<string | null>(null);

  // useSessionMachine provides computed values (reachablePhases, isComplete, etc.)
  const machine = useSessionMachine(session);

  // usePhaseNavigation provides navigation actions that persist to storage
  const { prev, next, canPrev, canNext, goTo } = usePhaseNavigation();

  // Save status indicator - must be before early returns per React hooks rules
  const saveStatus = React.useMemo(() => {
    if (saveState.status === "saving") {
      return { label: "Saving changes...", tone: "muted" as const };
    }
    if (saveState.status === "error") {
      return { label: "Save failed. Try again.", tone: "destructive" as const };
    }
    if (isDirty) {
      return { label: "Unsaved changes", tone: "muted" as const };
    }
    if (saveState.status === "saved") {
      return { label: "All changes saved", tone: "muted" as const };
    }
    return null;
  }, [isDirty, saveState]);

  React.useEffect(() => {
    if (saveState.status === "error") {
      const message = saveState.error?.message ?? "Failed to save session.";
      if (message !== lastSaveErrorRef.current) {
        toast.error("Save failed", message);
        lastSaveErrorRef.current = message;
      }
      return;
    }
    lastSaveErrorRef.current = null;
  }, [saveState.status, saveState.error]);

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
            <div className="mt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
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
    const currentSession = session;
    if (!currentSession) return;

    await exportOperation.run(() => exportSessionToFile(currentSession, format), {
      message: "Exporting session...",
      estimatedDuration: 3,
      onError: (error) => {
        toast.error("Export failed", error.message);
      },
    });
  };

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <LoadingOverlay
        visible={exportOperation.isLoading}
        message={exportOperation.state.message ?? "Exporting session..."}
        detail="Preparing your research brief for download."
        progress={exportOperation.state.progress}
        cancellable={exportOperation.state.cancellable}
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
        <div className="flex flex-col items-end gap-2">
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
              disabled={exportOperation.isLoading}
            >
              Export JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("markdown")}
              disabled={exportOperation.isLoading}
            >
              Export Markdown
            </Button>
            <span className="text-sm text-muted-foreground">
              {Math.round(getSessionProgress(session.phase))}% complete
            </span>
          </div>
          {exportOperation.isError && (
            <p className="text-xs text-destructive">
              Export failed. Please try again.
            </p>
          )}
          {saveStatus && (
            <p
              className={cn(
                "text-xs",
                saveStatus.tone === "destructive"
                  ? "text-destructive"
                  : "text-muted-foreground"
              )}
            >
              {saveStatus.label}
            </p>
          )}
        </div>
      </div>

      {/* Phase Timeline */}
      <PhaseTimeline
        currentPhase={session.phase}
        phases={PHASE_ORDER}
        completedPhases={PHASE_ORDER.slice(0, Math.max(0, PHASE_ORDER.indexOf(session.phase)))}
        availablePhases={machine.reachablePhases}
        skippedPhases={[]}
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
