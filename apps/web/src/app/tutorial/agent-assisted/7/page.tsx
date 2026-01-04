"use client";

/**
 * Agent-Assisted Step 7: Agent Runs the Brenner Loop
 *
 * Full loop execution: generate tests, rank by potency, identify exclusions.
 *
 * @see brenner_bot-w5p6 (Tutorial Path: Agent-Assisted Research)
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { TutorialStep, TutorialCodeBlock, ProTip, Important, Warning } from "@/components/tutorial";
import { useTutorial } from "@/lib/tutorial-context";
import type { TutorialStep as TutorialStepType } from "@/lib/tutorial-types";

// ============================================================================
// Step Data
// ============================================================================

const stepData: TutorialStepType = {
  id: "aa-7",
  pathId: "agent-assisted",
  stepNumber: 7,
  title: "Agent Runs the Brenner Loop",
  estimatedTime: "~10 min",
  whatYouLearn: [
    "How to design discriminative tests that distinguish hypotheses",
    "What makes a test 'potent' vs. weak",
    "How to rank tests by discriminative power",
  ],
  whatYouDo: [
    "Give your agent the loop execution prompt",
    "Review the generated discriminative tests",
    "Understand the potency rankings",
  ],
  troubleshooting: [
    {
      problem: "Tests all seem to confirm rather than discriminate",
      solution: "Ask: 'What result would make me abandon hypothesis X?' If you can't answer, the test isn't discriminative.",
    },
    {
      problem: "Agent generated too many tests to evaluate",
      solution: "Ask it to rank by potency and focus on the top 3. Quality over quantity.",
    },
    {
      problem: "Tests seem infeasible",
      solution: "Add constraints: 'Design tests I could run with [available resources]. What's the minimal experiment that discriminates?'",
    },
  ],
};

// ============================================================================
// Main Component
// ============================================================================

export default function AgentAssistedStep7() {
  const router = useRouter();
  const tutorial = useTutorial();

  React.useEffect(() => {
    tutorial.setPath("agent-assisted", 8);
    tutorial.goToStep(6);
  }, [tutorial]);

  const loopPrompt = `Now run the full Brenner loop on my hypothesis slate. Here are my hypotheses:

[PASTE YOUR HYPOTHESIS SLATE FROM STEP 6]

For each pair of hypotheses that need distinguishing, design discriminative tests:

## 1. Discriminative Test Design

For each test, specify:
- **What you would do**: The actual observation or experiment
- **Predicted outcomes**: What each hypothesis predicts you'd see
- **Discrimination logic**: Why this test distinguishes between hypotheses
- **Feasibility notes**: What resources/access would be needed

A good discriminative test has different predictions for different hypotheses. If all hypotheses predict the same outcome, the test isn't discriminative.

## 2. Potency Ranking

Rank your tests by "potency" - how many hypotheses they can exclude:
- **High potency**: Could eliminate 2+ hypotheses with a single result
- **Medium potency**: Eliminates 1 hypothesis, narrows options
- **Low potency**: Provides supporting evidence but doesn't exclude

For each test, note: "If result is A, exclude H1 and H3. If result is B, exclude H2."

## 3. Exclusion Test (⊘) Application

For the top 3 tests, work through the Exclusion Test operator:
- What would the "excluded" hypothesis predict?
- Is there any way that hypothesis could accommodate the result?
- How confident would we be in exclusion?

## 4. Critical Path

Based on potency rankings, suggest the order in which to run tests:
- Start with highest-potency tests
- Note dependencies (test B only makes sense after test A)
- Identify the "critical path" - minimum tests needed to reach a conclusion

Be rigorous. Remember: we're not trying to confirm what we believe. We're trying to eliminate what's false.`;

  return (
    <TutorialStep
      step={stepData}
      totalSteps={8}
      onBack={() => router.push("/tutorial/agent-assisted/6")}
      onNext={() => {
        tutorial.completeAndAdvance();
        router.push("/tutorial/agent-assisted/8");
      }}
    >
      <section className="space-y-6">
        {/* The Core Concept */}
        <motion.div
          className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center justify-center size-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-lg">
              ⊘
            </span>
            <h2 className="text-lg font-semibold text-amber-600 dark:text-amber-400">
              Discriminative, Not Confirmatory
            </h2>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            This is the heart of Brenner's approach. Most researchers design experiments
            to <em>confirm</em> their hypothesis. We design experiments to <em>exclude</em> hypotheses.
            The goal is to find tests where different hypotheses predict different outcomes.
          </p>
        </motion.div>

        {/* What Makes a Test Discriminative */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">What Makes a Test Discriminative?</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5">
              <h4 className="font-semibold text-sm mb-3 text-destructive">
                Confirmatory (Weak)
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                "If my hypothesis is true, I should see X."
              </p>
              <p className="text-xs text-destructive/80">
                Problem: Seeing X doesn't rule out other hypotheses that also predict X.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[oklch(0.72_0.19_145/0.3)] bg-[oklch(0.72_0.19_145/0.05)]">
              <h4 className="font-semibold text-sm mb-3 text-[oklch(0.72_0.19_145)]">
                Discriminative (Strong)
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                "H1 predicts X, H2 predicts Y. Observe which happens."
              </p>
              <p className="text-xs text-[oklch(0.72_0.19_145)]">
                Power: Either result eliminates at least one hypothesis.
              </p>
            </div>
          </div>
        </div>

        {/* The Prompt */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">The Loop Execution Prompt</h2>
          <p className="text-muted-foreground">
            Paste your hypothesis slate where indicated and give this to your agent:
          </p>
          <TutorialCodeBlock
            code={loopPrompt}
            language="text"
            title="Prompt to your agent"
          />
        </div>

        {/* Potency Explained */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Understanding Potency</h2>
          <p className="text-muted-foreground">
            Not all tests are equal. Potency measures how much a test can narrow
            your hypothesis space:
          </p>

          <div className="space-y-3">
            {[
              {
                level: "High Potency",
                color: "oklch(0.72_0.19_145)",
                example: "A single observation eliminates multiple hypotheses",
                scenario: "If we see X, both H1 and H3 are impossible. If we see Y, H2 is ruled out.",
              },
              {
                level: "Medium Potency",
                color: "oklch(0.75_0.15_85)",
                example: "Eliminates one hypothesis definitively",
                scenario: "If we see X, H2 is ruled out. Otherwise, all remain possible.",
              },
              {
                level: "Low Potency",
                color: "oklch(0.55_0.15_250)",
                example: "Provides evidence but doesn't exclude",
                scenario: "X is more likely under H1, but H2 and H3 could also explain it.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border bg-card/50"
                style={{ borderColor: `${item.color}/30` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <h4 className="font-semibold text-sm" style={{ color: item.color }}>
                    {item.level}
                  </h4>
                </div>
                <p className="text-sm text-muted-foreground mb-1">{item.example}</p>
                <p className="text-xs text-muted-foreground italic">"{item.scenario}"</p>
              </div>
            ))}
          </div>
        </div>

        <Warning>
          Beware of tests that seem powerful but actually aren't. "If I see X, it
          supports my hypothesis" is not discriminative. Ask: "What would I see if
          my hypothesis is <em>wrong</em>?"
        </Warning>

        {/* Example Output */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Example: Good Test Design</h2>
          <div className="p-4 rounded-xl border border-border bg-muted/30 font-mono text-sm">
            <p className="text-amber-600 dark:text-amber-400 mb-2">## Test T1: Temporal ordering</p>
            <p className="text-muted-foreground mb-2">
              <strong>What:</strong> Measure whether X changes before Y, or Y before X, in time-series data.
            </p>
            <p className="text-muted-foreground mb-2">
              <strong>Predictions:</strong><br/>
              - H1 (X→Y): X changes precede Y changes<br/>
              - H3 (Y→X): Y changes precede X changes<br/>
              - H4 (Z→both): Both change simultaneously after Z
            </p>
            <p className="text-muted-foreground mb-2">
              <strong>Potency:</strong> HIGH - distinguishes between 3 hypotheses
            </p>
            <p className="text-muted-foreground">
              <strong>Exclusion logic:</strong> If X precedes Y, exclude H3. If Y precedes X, exclude H1.
              If simultaneous, investigate Z (supports H4).
            </p>
          </div>
        </div>

        <Important>
          The critical path is your research roadmap. A well-designed critical path
          minimizes wasted effort by running high-potency tests first and only
          doing follow-up tests when the first results narrow the field.
        </Important>

        <ProTip>
          If your agent generates a test and you can't immediately see what result
          would exclude a hypothesis, the test probably isn't discriminative. Push
          back: "What specific result would rule out H2?"
        </ProTip>

        {/* Review Checklist */}
        <div className="p-5 rounded-xl border border-border bg-card/50">
          <h3 className="font-semibold mb-3">Review Checklist</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Before proceeding, verify your agent's output:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="size-4 rounded border border-border shrink-0 mt-0.5" />
              <span>Each test has explicit predictions for each hypothesis</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="size-4 rounded border border-border shrink-0 mt-0.5" />
              <span>At least one test could eliminate 2+ hypotheses</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="size-4 rounded border border-border shrink-0 mt-0.5" />
              <span>Potency rankings are justified, not just asserted</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="size-4 rounded border border-border shrink-0 mt-0.5" />
              <span>Critical path shows clear decision points</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="size-4 rounded border border-border shrink-0 mt-0.5" />
              <span>Tests are feasible with resources you have access to</span>
            </li>
          </ul>
        </div>

        {/* Success Criteria */}
        <div className="p-5 rounded-xl border border-[oklch(0.72_0.19_145/0.3)] bg-[oklch(0.72_0.19_145/0.05)]">
          <h3 className="font-semibold text-[oklch(0.72_0.19_145)] mb-3">Success Criteria</h3>
          <p className="text-sm text-muted-foreground mb-3">
            You're ready to proceed when you have:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[oklch(0.72_0.19_145)]" />
              At least 3 genuinely discriminative tests
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[oklch(0.72_0.19_145)]" />
              Clear potency rankings with reasoning
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[oklch(0.72_0.19_145)]" />
              A critical path showing which tests to run first
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[oklch(0.72_0.19_145)]" />
              Exclusion logic for each high-potency test
            </li>
          </ul>
        </div>

        {/* Next Step Preview */}
        <div className="p-4 rounded-xl border border-border bg-card/50">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Next up:</strong> In Step 8, you'll
            review the complete research artifact and verify it meets quality standards
            before using it to guide actual research.
          </p>
        </div>
      </section>
    </TutorialStep>
  );
}
