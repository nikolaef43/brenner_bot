"use client";

/**
 * TutorialStep - Container for step content
 *
 * Adapted from ACFS wizard step patterns.
 *
 * Provides:
 * - Step header with number, title, and time estimate (with float animation)
 * - Learning objectives and action checklist
 * - Main content area
 * - Collapsible "More details" and "Troubleshooting" sections
 * - Back/Next navigation footer with directional hover animations
 * - Stagger reveal animations for premium feel
 */

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Clock, BookOpen, Wrench, ChevronLeft, ChevronRight, Target, Zap, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TutorialStep as TutorialStepType, TroubleshootingItem } from "@/lib/tutorial-types";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

// ============================================================================
// Types
// ============================================================================

export interface TutorialStepProps {
  /** Step data */
  step: TutorialStepType;
  /** Total number of steps in this path */
  totalSteps: number;
  /** Navigation callbacks */
  onBack?: () => void;
  onNext?: () => void;
  /** Whether back navigation is disabled */
  disableBack?: boolean;
  /** Whether next navigation is disabled */
  disableNext?: boolean;
  /** Main content of the step */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Sub-components
// ============================================================================

function LearningObjectives({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <Collapsible defaultOpen className="rounded-xl border border-primary/20 bg-primary/5">
      <CollapsibleTrigger className="w-full px-4 py-3 flex items-center gap-3 text-left">
        <div className="flex items-center justify-center size-8 rounded-lg bg-primary/20 text-primary">
          {/* Target icon represents goals and objectives */}
          <Target className="size-5" />
        </div>
        <div className="flex-1">
          <span className="text-sm font-medium text-primary">What you&apos;ll learn</span>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="px-4 pb-4 space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <BookOpen className="mt-0.5 size-3.5 text-primary/60 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ActionChecklist({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        {/* Zap icon represents quick actions and energy */}
        <Zap className="size-4 text-[oklch(0.72_0.19_145)]" />
        <span>What you&apos;ll do</span>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
            {/* Empty checkbox visual - represents pending action item */}
            <span className="size-4 rounded border border-muted shrink-0" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TroubleshootingSection({ items }: { items: TroubleshootingItem[] }) {
  if (items.length === 0) return null;

  return (
    <Collapsible className="rounded-xl border border-amber-500/20 bg-amber-500/5">
      <CollapsibleTrigger className="w-full px-4 py-3 flex items-center gap-3 text-left">
        <div className="flex items-center justify-center size-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
          <Wrench className="size-5" />
        </div>
        <div className="flex-1">
          <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Troubleshooting</span>
          <span className="text-xs text-muted-foreground ml-2">({items.length} common issues)</span>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-4 space-y-4">
          {items.map((item, i) => (
            <div key={i} className="space-y-2">
              <p className="text-sm font-medium text-foreground">{item.problem}</p>
              {item.symptoms && item.symptoms.length > 0 && (
                <ul className="text-xs text-muted-foreground space-y-1">
                  {item.symptoms.map((symptom, j) => (
                    <li key={j} className="flex items-center gap-1.5">
                      <span className="size-1 rounded-full bg-amber-500" />
                      {symptom}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-sm text-muted-foreground">{item.solution}</p>
              {item.commands && item.commands.length > 0 && (
                <div className="space-y-1">
                  {item.commands.map((cmd, j) => (
                    <code key={j} className="block px-2 py-1 rounded bg-muted text-xs font-mono text-foreground">
                      {cmd}
                    </code>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================================================
// Animation Variants
// ============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
  exit: { opacity: 0, y: -20 },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 25 },
  },
};

// ============================================================================
// Main Component
// ============================================================================

export function TutorialStep({
  step,
  totalSteps,
  onBack,
  onNext,
  disableBack = false,
  disableNext = false,
  children,
  className,
}: TutorialStepProps) {
  const [isHoveringBack, setIsHoveringBack] = React.useState(false);
  const [isHoveringNext, setIsHoveringNext] = React.useState(false);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn("space-y-6", className)}
    >
      {/* Header with floating icon */}
      <motion.div variants={itemVariants} className="space-y-2">
        <div className="flex items-center gap-4">
          <motion.div
            className="relative flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-primary/30 via-primary/20 to-accent/30 shadow-lg shadow-primary/20"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Glow ring */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-transparent animate-pulse" />
            <Sparkles className="size-6 text-primary relative z-10" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
              {step.title}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center size-5 rounded-full bg-primary/20 text-primary font-mono text-xs font-bold">
                  {step.stepNumber}
                </span>
                <span>of {totalSteps}</span>
              </span>
              <span className="size-1 rounded-full bg-muted-foreground/30" />
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" />
                {step.estimatedTime}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Learning objectives */}
      <motion.div variants={itemVariants}>
        <LearningObjectives items={step.whatYouLearn} />
      </motion.div>

      {/* Action checklist */}
      <motion.div variants={itemVariants}>
        <ActionChecklist items={step.whatYouDo} />
      </motion.div>

      {/* Main content */}
      <motion.div variants={itemVariants} className="prose prose-sm dark:prose-invert max-w-none">
        {children}
      </motion.div>

      {/* More details (if provided) */}
      {step.moreDetails && (
        <motion.div variants={itemVariants}>
          <Collapsible className="rounded-xl border border-border bg-muted/30 hover:border-border/80 transition-colors">
            <CollapsibleTrigger className="w-full px-4 py-3 flex items-center gap-3 text-left group">
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">More details</span>
              <ChevronRight className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 text-sm text-muted-foreground">
                {step.moreDetails}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </motion.div>
      )}

      {/* Troubleshooting */}
      {step.troubleshooting && step.troubleshooting.length > 0 && (
        <motion.div variants={itemVariants}>
          <TroubleshootingSection items={step.troubleshooting} />
        </motion.div>
      )}

      {/* Navigation with directional hover animations */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between pt-6 border-t border-border"
      >
        <motion.div
          onHoverStart={() => setIsHoveringBack(true)}
          onHoverEnd={() => setIsHoveringBack(false)}
        >
          <Button
            variant="ghost"
            onClick={onBack}
            disabled={disableBack || !onBack}
            className="text-muted-foreground hover:text-foreground group min-w-[100px]"
          >
            <motion.div
              animate={{ x: isHoveringBack ? -4 : 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <ChevronLeft className="size-5 mr-1" />
            </motion.div>
            <span>Back</span>
          </Button>
        </motion.div>

        <motion.div
          onHoverStart={() => setIsHoveringNext(true)}
          onHoverEnd={() => setIsHoveringNext(false)}
        >
          <Button
            onClick={onNext}
            disabled={disableNext || !onNext}
            className={cn(
              "min-w-[120px] group",
              step.stepNumber === totalSteps && "bg-[oklch(0.72_0.19_145)] hover:bg-[oklch(0.65_0.19_145)] text-[oklch(0.15_0.02_145)]"
            )}
          >
            <span>{step.stepNumber === totalSteps ? "Complete" : "Next"}</span>
            <motion.div
              animate={{ x: isHoveringNext ? 4 : 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              {step.stepNumber === totalSteps ? (
                <Check className="size-5 ml-1" />
              ) : (
                <ChevronRight className="size-5 ml-1" />
              )}
            </motion.div>
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// Type is already exported with the interface definition above
