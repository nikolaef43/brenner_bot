"use client";

/**
 * Agent-Assisted Step 8: Human Review
 *
 * Interactive checklist to evaluate the agent's output.
 * Quality gate before using results.
 *
 * @see brenner_bot-w5p6 (Tutorial Path: Agent-Assisted Research)
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { TutorialStep, ProTip, Important } from "@/components/tutorial";
import { useTutorial } from "@/lib/tutorial-context";
import type { TutorialStep as TutorialStepType } from "@/lib/tutorial-types";

// ============================================================================
// Step Data
// ============================================================================

const stepData: TutorialStepType = {
  id: "aa-8",
  pathId: "agent-assisted",
  stepNumber: 8,
  title: "Human Review",
  estimatedTime: "~5 min",
  whatYouLearn: [
    "How to evaluate the quality of agent-generated research artifacts",
    "Common failure modes to watch for",
    "When to iterate vs. proceed",
  ],
  whatYouDo: [
    "Work through the quality checklist",
    "Identify any gaps in the agent's output",
    "Decide whether to iterate or use the results",
  ],
  troubleshooting: [
    {
      problem: "Failed several checklist items",
      solution: "Go back to the relevant step and ask the agent to address specific gaps. Be explicit about what's missing.",
    },
    {
      problem: "Not sure if quality is good enough",
      solution: "Ask yourself: would I be comfortable presenting this to a skeptical colleague? If not, iterate.",
    },
  ],
};

// ============================================================================
// Types
// ============================================================================

interface ChecklistItem {
  id: string;
  category: string;
  question: string;
  why: string;
  fixPrompt: string;
}

// ============================================================================
// Checklist Data
// ============================================================================

const checklistItems: ChecklistItem[] = [
  // Hypothesis Slate
  {
    id: "h1",
    category: "Hypothesis Slate",
    question: "Are there at least 4 genuinely distinct hypotheses?",
    why: "Fewer than 4 suggests insufficient exploration of the hypothesis space.",
    fixPrompt: "Generate more hypotheses using Object Transpose. What other mechanisms could produce the same observation?",
  },
  {
    id: "h2",
    category: "Hypothesis Slate",
    question: "Is there a reversed-causation hypothesis?",
    why: "Causal direction is often assumed rather than tested.",
    fixPrompt: "Apply Object Transpose: what if Y causes X instead of X causing Y?",
  },
  {
    id: "h3",
    category: "Hypothesis Slate",
    question: "Is there a third-variable hypothesis?",
    why: "Correlation without causation is a common trap.",
    fixPrompt: "What hidden variable could cause both X and Y, making them correlated but causally unrelated?",
  },
  // Assumption Ledger
  {
    id: "a1",
    category: "Assumption Ledger",
    question: "Are assumptions categorized (theoretical, methodological, background)?",
    why: "Different assumption types require different validation strategies.",
    fixPrompt: "Categorize each assumption. Which are about the world, which about measurement, which are field-wide defaults?",
  },
  {
    id: "a2",
    category: "Assumption Ledger",
    question: "Are there at least 5 non-obvious assumptions listed?",
    why: "Shallow assumption mining misses critical blind spots.",
    fixPrompt: "What are we taking for granted that experts in our field never question? What would an outsider challenge?",
  },
  // Tests
  {
    id: "t1",
    category: "Discriminative Tests",
    question: "Does each test have explicit predictions for each hypothesis?",
    why: "Vague predictions allow confirmation bias to sneak in.",
    fixPrompt: "For each test, specify: what would H1 predict? H2? H3? Be specific about observable outcomes.",
  },
  {
    id: "t2",
    category: "Discriminative Tests",
    question: "Is there at least one high-potency test (eliminates 2+ hypotheses)?",
    why: "High-potency tests are the most efficient use of research resources.",
    fixPrompt: "Design a test where different hypotheses predict different outcomes. What single observation distinguishes the most hypotheses?",
  },
  {
    id: "t3",
    category: "Discriminative Tests",
    question: "Are the tests actually feasible with available resources?",
    why: "Brilliant but impossible tests don't advance research.",
    fixPrompt: "Given my constraints [describe resources], what's the minimal test that still discriminates?",
  },
  // Critical Path
  {
    id: "c1",
    category: "Critical Path",
    question: "Is there a clear ordering of which tests to run first?",
    why: "Running tests in the wrong order wastes effort.",
    fixPrompt: "Rank tests by potency. Which test, if run first, would most efficiently narrow the hypothesis space?",
  },
  {
    id: "c2",
    category: "Critical Path",
    question: "Are test dependencies noted (test B only makes sense after test A)?",
    why: "Some tests become irrelevant depending on earlier results.",
    fixPrompt: "For each test, note: does this test depend on the outcome of another test?",
  },
  // Scale & Plausibility
  {
    id: "s1",
    category: "Scale Checks",
    question: "Do scale checks include actual numbers?",
    why: "Hand-waving about 'large' or 'small' effects hides implausibility.",
    fixPrompt: "For each hypothesis, calculate: what magnitude of effect would be needed? Is this physically/biologically plausible?",
  },
];

// ============================================================================
// Icons
// ============================================================================

const CheckIcon = () => (
  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const XIcon = () => (
  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// ============================================================================
// Checklist Item Component
// ============================================================================

function ChecklistItemCard({
  item,
  status,
  onToggle,
  isExpanded,
  onExpand,
}: {
  item: ChecklistItem;
  status: "unchecked" | "pass" | "fail";
  onToggle: (status: "pass" | "fail") => void;
  isExpanded: boolean;
  onExpand: () => void;
}) {
  return (
    <motion.div
      className={`rounded-xl border transition-colors ${
        status === "pass"
          ? "border-[oklch(0.72_0.19_145/0.5)] bg-[oklch(0.72_0.19_145/0.05)]"
          : status === "fail"
          ? "border-destructive/50 bg-destructive/5"
          : "border-border bg-card/50"
      }`}
      layout
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Toggle Buttons */}
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => onToggle("pass")}
              className={`size-8 rounded-lg flex items-center justify-center transition-all ${
                status === "pass"
                  ? "bg-[oklch(0.72_0.19_145)] text-white"
                  : "bg-muted hover:bg-[oklch(0.72_0.19_145/0.2)] text-muted-foreground hover:text-[oklch(0.72_0.19_145)]"
              }`}
              aria-label="Mark as pass"
            >
              <CheckIcon />
            </button>
            <button
              onClick={() => onToggle("fail")}
              className={`size-8 rounded-lg flex items-center justify-center transition-all ${
                status === "fail"
                  ? "bg-destructive text-white"
                  : "bg-muted hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
              }`}
              aria-label="Mark as fail"
            >
              <XIcon />
            </button>
          </div>

          {/* Question */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{item.question}</p>
            <button
              onClick={onExpand}
              className="text-xs text-muted-foreground hover:text-primary mt-1"
            >
              {isExpanded ? "Hide details" : "Why this matters"}
            </button>
          </div>
        </div>

        {/* Expanded Details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-3 mt-3 border-t border-border/50 space-y-2">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Why:</strong> {item.why}
                </p>
                {status === "fail" && (
                  <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-xs text-primary">
                      <strong>Fix:</strong> {item.fixPrompt}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function AgentAssistedStep8() {
  const router = useRouter();
  const tutorial = useTutorial();
  const [statuses, setStatuses] = React.useState<Record<string, "unchecked" | "pass" | "fail">>({});
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    tutorial.setPath("agent-assisted", 8);
    tutorial.goToStep(7);
  }, [tutorial]);

  const toggleStatus = (id: string, newStatus: "pass" | "fail") => {
    setStatuses(prev => ({
      ...prev,
      [id]: prev[id] === newStatus ? "unchecked" : newStatus,
    }));
  };

  const passCount = Object.values(statuses).filter(s => s === "pass").length;
  const failCount = Object.values(statuses).filter(s => s === "fail").length;
  const totalChecked = passCount + failCount;
  const allPassed = passCount === checklistItems.length;

  // Group items by category
  const categories = [...new Set(checklistItems.map(item => item.category))];

  return (
    <TutorialStep
      step={stepData}
      totalSteps={8}
      onBack={() => router.push("/tutorial/agent-assisted/7")}
      onNext={() => {
        tutorial.completeAndAdvance();
        router.push("/tutorial/agent-assisted");
      }}
    >
      <section className="space-y-6">
        {/* Introduction */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Quality Gate</h2>
          <p className="text-muted-foreground">
            Before using your research artifact, work through this checklist.
            Be honest &mdash; catching problems now saves wasted effort later.
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="p-4 rounded-xl border border-border bg-card/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Review Progress</span>
            <span className="text-sm text-muted-foreground">
              {totalChecked} of {checklistItems.length} checked
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full flex">
              <motion.div
                className="bg-[oklch(0.72_0.19_145)]"
                initial={{ width: 0 }}
                animate={{ width: `${(passCount / checklistItems.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
              <motion.div
                className="bg-destructive"
                initial={{ width: 0 }}
                animate={{ width: `${(failCount / checklistItems.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-[oklch(0.72_0.19_145)]" />
              {passCount} passed
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-destructive" />
              {failCount} failed
            </span>
          </div>
        </div>

        {/* Checklist by Category */}
        {categories.map(category => (
          <div key={category} className="space-y-3">
            <h3 className="text-lg font-semibold text-amber-600 dark:text-amber-400">
              {category}
            </h3>
            <div className="space-y-2">
              {checklistItems
                .filter(item => item.category === category)
                .map(item => (
                  <ChecklistItemCard
                    key={item.id}
                    item={item}
                    status={statuses[item.id] || "unchecked"}
                    onToggle={(status) => toggleStatus(item.id, status)}
                    isExpanded={expandedId === item.id}
                    onExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  />
                ))}
            </div>
          </div>
        ))}

        {/* Result Summary */}
        <AnimatePresence>
          {totalChecked === checklistItems.length && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-5 rounded-xl border ${
                allPassed
                  ? "border-[oklch(0.72_0.19_145/0.5)] bg-[oklch(0.72_0.19_145/0.1)]"
                  : "border-amber-500/50 bg-amber-500/10"
              }`}
            >
              {allPassed ? (
                <>
                  <h3 className="font-semibold text-[oklch(0.72_0.19_145)] mb-2">
                    All Checks Passed
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Your research artifact meets quality standards. You're ready to use
                    it to guide actual research. Save the artifact for future reference
                    and proceed with your critical path of tests.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="font-semibold text-amber-600 dark:text-amber-400 mb-2">
                    {failCount} Item{failCount > 1 ? "s" : ""} Need Attention
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Review the failed items above. Each has a suggested fix prompt.
                    Go back to the relevant step and address the gaps before proceeding.
                  </p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <Important>
          This checklist isn't bureaucracy &mdash; it's protection against wasted
          effort. A research artifact with gaps will lead you down blind alleys.
          Take the time to get it right.
        </Important>

        <ProTip>
          Keep this checklist handy for future research loops. As you get better
          at using the Brenner methodology, you'll start catching these issues
          during generation rather than review.
        </ProTip>

        {/* What's Next */}
        <div className="p-5 rounded-xl border border-primary/30 bg-primary/5">
          <h3 className="font-semibold mb-3">What's Next?</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Now that you have a quality-checked research artifact, you can:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">1.</span>
              <span>Run the tests in your critical path order</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">2.</span>
              <span>Update the hypothesis slate as you get results</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">3.</span>
              <span>Document which hypotheses you exclude and why</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">4.</span>
              <span>Run another loop if new hypotheses emerge</span>
            </li>
          </ul>
        </div>

        {/* Completion */}
        <div className="p-5 rounded-xl border border-[oklch(0.72_0.19_145/0.3)] bg-[oklch(0.72_0.19_145/0.05)]">
          <h3 className="font-semibold text-[oklch(0.72_0.19_145)] mb-3">
            Tutorial Complete
          </h3>
          <p className="text-sm text-muted-foreground">
            You've learned the agent-assisted workflow for Brenner methodology.
            Your coding agent now has a working understanding of discriminative
            research design and can help you apply it to any question.
          </p>
        </div>
      </section>
    </TutorialStep>
  );
}
