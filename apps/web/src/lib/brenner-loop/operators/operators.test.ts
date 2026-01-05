import { describe, expect, it } from "vitest";
import { createHypothesisCard, generateHypothesisCardId } from "../hypothesis";
import type { HypothesisCard } from "../hypothesis";
import type { OperatorStepConfig } from "./framework";
import {
  OPERATOR_METADATA,
  canGoBack,
  canProceedToNext,
  canSkipCurrent,
  createStepStates,
  createSession,
  deserializeSession,
  generateInsightId,
  generateSessionId,
  getCurrentStep,
  getCurrentStepConfig,
  getProgress,
  getSessionSummary,
  isOperatorType,
  serializeSession,
  sessionReducer,
} from "./framework";
import {
  getCommonMistakes,
  getOperatorDocumentation,
  getStepTip,
  getSuccessCriteria,
} from "./docs";
import {
  LEVEL_SPLIT_STEP_IDS,
  LEVEL_SPLIT_STEPS,
  buildLevelSplitResult,
  generateCombinationMatrix,
  generateSubHypothesis,
  generateXLevels,
  generateYLevels,
} from "./level-split";
import {
  CATEGORY_DEFAULT_POWER,
  EXCLUSION_TEST_STEP_IDS,
  buildExclusionTestResult,
  createCustomTest,
  generateExclusionTests,
  generateProtocolTemplate,
  generateProtocols,
  getCategoryColor,
  getDiscriminativePowerLabel,
  getDiscriminativePowerStars,
  getFeasibilityColor,
} from "./exclusion-test";
import {
  OBJECT_TRANSPOSE_STEP_IDS,
  buildObjectTransposeResult,
  generateAlternatives,
  generateDiscriminatingTests,
} from "./object-transpose";
import {
  SCALE_CHECK_STEP_IDS,
  buildScaleCheckResult,
  classifyEffectSize,
  estimateToValue,
  generateContextComparison,
  generatePopulationConsiderations,
  getDomainContext,
  varianceExplained,
} from "./scale-check";

function makeHypothesis(overrides: Partial<HypothesisCard> = {}): HypothesisCard {
  const sessionId = overrides.sessionId ?? "TEST-SESSION";

  return createHypothesisCard({
    id: overrides.id ?? generateHypothesisCardId(sessionId, 1),
    statement: overrides.statement ?? "Caffeine causes insomnia through adenosine receptor blockade",
    mechanism: overrides.mechanism ?? "Adenosine signaling disruption",
    domain: overrides.domain ?? ["psychology"],
    predictionsIfTrue: overrides.predictionsIfTrue ?? ["Higher caffeine intake predicts worse sleep quality"],
    predictionsIfFalse: overrides.predictionsIfFalse ?? ["Sleep quality is unrelated to caffeine intake"],
    impossibleIfTrue: overrides.impossibleIfTrue ?? ["Insomnia persists when caffeine is eliminated"],
    confidence: overrides.confidence,
    sessionId,
    tags: overrides.tags,
    notes: overrides.notes,
  });
}

describe("operators/framework", () => {
  it("validates OperatorType values", () => {
    expect(isOperatorType("level_split")).toBe(true);
    expect(isOperatorType("exclusion_test")).toBe(true);
    expect(isOperatorType("object_transpose")).toBe(true);
    expect(isOperatorType("scale_check")).toBe(true);
    expect(isOperatorType("not-a-real-operator")).toBe(false);
    expect(isOperatorType(123)).toBe(false);
  });

  it("supports step gating + reducer transitions", () => {
    const hypothesis = makeHypothesis();

    const stepConfigs: OperatorStepConfig[] = [
      {
        id: "step-1",
        name: "Step 1",
        description: "First step",
        canSkip: true,
        isComplete: (session) => session.userSelections["done"] === true,
        validate: () => ({ valid: true, errors: [], warnings: [] }),
      },
      {
        id: "step-2",
        name: "Step 2",
        description: "Second step",
      },
    ];

    let session = createSession("level_split", hypothesis, stepConfigs, "BlueLake");
    expect(session.status).toBe("initializing");
    expect(OPERATOR_METADATA[session.operatorType].name).toBeTruthy();

    // Not complete → cannot proceed.
    expect(canProceedToNext(session).canProceed).toBe(false);

    // Mark step complete and proceed.
    session = sessionReducer(session, { type: "SET_SELECTION", key: "done", value: true });
    expect(canProceedToNext(session).canProceed).toBe(true);

    session = sessionReducer(session, { type: "NEXT_STEP" });
    expect(session.currentStepIndex).toBe(1);
    expect(session.steps[0]?.complete).toBe(true);
    expect(getProgress(session)).toBeGreaterThan(0);

    // Can't jump forward.
    session = sessionReducer(session, { type: "GO_TO_STEP", stepIndex: 10 });
    expect(session.currentStepIndex).toBe(1);

    // Can go back.
    session = sessionReducer(session, { type: "PREV_STEP" });
    expect(session.currentStepIndex).toBe(0);

    // Skip step moves forward when allowed.
    session = sessionReducer(session, { type: "SKIP_STEP" });
    expect(session.currentStepIndex).toBe(1);

    session = sessionReducer(session, { type: "CLEAR_SELECTION", key: "done" });
    expect("done" in session.userSelections).toBe(false);

    session = sessionReducer(session, {
      type: "ADD_INSIGHT",
      insight: { category: "discovery", title: "Test", content: "Insight", stepId: "step-1" },
    });
    expect(session.insights).toHaveLength(1);
    expect(session.insights[0]?.id).toMatch(/^INS-/);
  });

  it("covers framework utilities, validation failures, and terminal states", () => {
    expect(generateSessionId("level_split")).toMatch(/^OP-level_split-/);
    expect(generateInsightId()).toMatch(/^INS-/);

    const hypothesis = makeHypothesis();
    const configs: OperatorStepConfig[] = [
      {
        id: "a",
        name: "A",
        description: "A",
        validate: () => ({ valid: false, errors: ["bad"], warnings: ["warn"] }),
      },
      { id: "b", name: "B", description: "B", canSkip: true },
    ];

    const steps = createStepStates(configs);
    expect(steps[0]?.complete).toBe(false);
    expect(steps[0]?.config.id).toBe("a");

    let session = createSession("exclusion_test", hypothesis, configs);
    expect(getCurrentStep(session)?.config.id).toBe("a");
    expect(getCurrentStepConfig(session)?.id).toBe("a");
    expect(canProceedToNext(session).canProceed).toBe(false);
    expect(canProceedToNext(session).validation?.errors).toContain("bad");
    expect(canGoBack(session)).toBe(false);
    expect(canSkipCurrent(session)).toBe(false);

    session = sessionReducer(session, { type: "NEXT_STEP" });
    expect(session.currentStepIndex).toBe(1);
    expect(canGoBack(session)).toBe(true);
    expect(canSkipCurrent(session)).toBe(true);

    session = sessionReducer(session, { type: "SET_NOTES", notes: "hello" });
    expect(session.notes).toBe("hello");

    session = sessionReducer(session, { type: "COMPLETE" });
    expect(session.status).toBe("completed");

    const abandoned = sessionReducer(session, { type: "ABANDON" });
    expect(abandoned.status).toBe("abandoned");

    const summary = getSessionSummary({ ...session, steps: [], currentStepIndex: 0 });
    expect(summary.operatorName).toBe(OPERATOR_METADATA[session.operatorType].name);
    expect(summary.currentStep).toBe("Unknown");
    expect(summary.totalSteps).toBe(0);
  });

  it("serializes and deserializes sessions", () => {
    const hypothesis = makeHypothesis();
    const session = createSession("scale_check", hypothesis, []);

    const json = serializeSession(session);
    expect(typeof json).toBe("string");
    expect(deserializeSession(json)?.operatorType).toBe("scale_check");
    expect(deserializeSession("not-json")).toBeNull();
  });
});

describe("operators/docs", () => {
  it("returns operator documentation, tips, mistakes, and success criteria", () => {
    const docs = getOperatorDocumentation("level_split");
    expect(docs.type).toBe("level_split");
    expect(docs.explanation.length).toBeGreaterThan(0);

    const tip = getStepTip("level_split", "identify-x-levels");
    expect(tip?.headline).toBeTruthy();

    expect(getStepTip("level_split", "unknown-step")).toBeUndefined();
    expect(getCommonMistakes("scale_check").length).toBeGreaterThan(0);
    expect(getSuccessCriteria("exclusion_test").length).toBeGreaterThan(0);
  });

  it("falls back safely for invalid operator types", () => {
    expect(getStepTip("not-a-real-operator" as never, "identify-x-levels")).toBeUndefined();
    expect(getCommonMistakes("not-a-real-operator" as never)).toEqual([]);
    expect(getSuccessCriteria("not-a-real-operator" as never)).toEqual([]);
  });
});

describe("operators/level-split", () => {
  it("generates levels and sub-hypotheses from selections", () => {
    const hypothesis = makeHypothesis({ domain: ["psychology"] });
    const xLevels = generateXLevels(hypothesis);
    const yLevels = generateYLevels(hypothesis);

    expect(xLevels.length).toBeGreaterThan(0);
    expect(yLevels.length).toBeGreaterThan(0);

    const selectedX = xLevels.slice(0, 2).map((level) => ({ ...level, selected: true }));
    const selectedY = yLevels.slice(0, 2).map((level) => ({ ...level, selected: true }));

    const combos = generateCombinationMatrix(selectedX, selectedY);
    expect(combos).toHaveLength(4);

    const sub = generateSubHypothesis(hypothesis, combos[0]);
    expect(sub.id).toContain(combos[0].xLevel.id);
    expect(sub.statement).toContain("Specifically regarding");

    let session = createSession("level_split", hypothesis, LEVEL_SPLIT_STEPS);
    session = sessionReducer(session, {
      type: "SET_SELECTION",
      key: LEVEL_SPLIT_STEP_IDS.IDENTIFY_X,
      value: selectedX,
    });
    session = sessionReducer(session, {
      type: "SET_SELECTION",
      key: LEVEL_SPLIT_STEP_IDS.IDENTIFY_Y,
      value: selectedY,
    });
    session = sessionReducer(session, {
      type: "SET_SELECTION",
      key: LEVEL_SPLIT_STEP_IDS.REVIEW_MATRIX,
      value: combos.map((combo) => ({ ...combo, selected: combo.xLevel.id === combos[0].xLevel.id })),
    });
    session = sessionReducer(session, {
      type: "SET_CONTENT",
      key: LEVEL_SPLIT_STEP_IDS.GENERATE_SUB,
      value: [sub],
    });
    session = sessionReducer(session, {
      type: "SET_SELECTION",
      key: LEVEL_SPLIT_STEP_IDS.CHOOSE_FOCUS,
      value: sub.id,
    });

    const result = buildLevelSplitResult(session);
    expect(result.xLevels).toHaveLength(2);
    expect(result.yLevels).toHaveLength(2);
    expect(result.selectedCombinations.length).toBeGreaterThan(0);
    expect(result.subHypotheses).toHaveLength(1);
    expect(result.focusedHypothesisId).toBe(sub.id);
  });
});

describe("operators/exclusion-test", () => {
  it("generates tests + protocols and builds result", () => {
    const hypothesis = makeHypothesis();
    const tests = generateExclusionTests(hypothesis);
    expect(tests.length).toBeGreaterThan(0);
    expect(tests[0].discriminativePower).toBeGreaterThanOrEqual(tests.at(-1)?.discriminativePower ?? 0);

    const custom = createCustomTest("Custom", "Desc", "Falsify", "Support", 5, "high");
    expect(custom.category).toBe("custom");
    expect(custom.isCustom).toBe(true);

    const protocols = [
      generateProtocolTemplate({ ...custom, feasibility: "high" }),
      generateProtocolTemplate({ ...custom, feasibility: "medium" }),
      generateProtocolTemplate({ ...custom, feasibility: "low" }),
    ];
    expect(protocols[0].estimatedEffort).toBe("days");
    expect(protocols[1].estimatedEffort).toBe("weeks");
    expect(protocols[2].estimatedEffort).toBe("months");

    const selected = tests.slice(0, 2).map((t, idx) => ({ ...t, selected: idx === 0 }));
    const generatedProtocols = generateProtocols(selected);
    expect(generatedProtocols).toHaveLength(1);

    const session = {
      generatedContent: {
        [EXCLUSION_TEST_STEP_IDS.GENERATE_TESTS]: tests,
        [EXCLUSION_TEST_STEP_IDS.GENERATE_PROTOCOLS]: generatedProtocols,
      },
      userSelections: {
        [EXCLUSION_TEST_STEP_IDS.SELECT_TESTS]: selected,
      },
    } as unknown as Parameters<typeof buildExclusionTestResult>[0];

    const result = buildExclusionTestResult(session);
    expect(result.generatedTests).toHaveLength(tests.length);
    expect(result.testsForSession).toHaveLength(1);
    expect(result.selectedTestIds).toEqual([selected[0].id]);

    expect(getDiscriminativePowerStars(3)).toBe("★★★☆☆");
    expect(getDiscriminativePowerLabel(5)).toBe("Decisive");
    expect(getFeasibilityColor("high")).toContain("green");
    expect(getCategoryColor("natural_experiment")).toContain("green");
    expect(getCategoryColor("dose_response")).toContain("yellow");
    expect(getCategoryColor("specificity")).toContain("gray");
    expect(CATEGORY_DEFAULT_POWER.custom).toBe(3);
  });
});

describe("operators/object-transpose", () => {
  it("generates alternatives, tests, and result projections", () => {
    const hypothesis = makeHypothesis();
    const alternatives = generateAlternatives(hypothesis);
    expect(alternatives.length).toBeGreaterThan(0);

    const ratings = alternatives.slice(0, 2).map((alt, idx) => ({
      alternativeId: alt.id,
      plausibility: idx === 0 ? 4 : 2,
      evidenceDiscrimination: idx === 0 ? "poor" : "good",
      notes: "",
    }));

    const tests = generateDiscriminatingTests(alternatives, ratings);
    expect(tests.length).toBeGreaterThan(0);
    expect(tests.every((t) => t.alternativeId)).toBe(true);

    const session = {
      generatedContent: {
        [OBJECT_TRANSPOSE_STEP_IDS.GENERATE_ALTERNATIVES]: alternatives,
        [OBJECT_TRANSPOSE_STEP_IDS.IDENTIFY_TESTS]: tests.map((t, idx) => ({
          ...t,
          priority: idx === 0 ? 1 : undefined,
          feasibility: idx === 0 ? "easy" : t.feasibility,
        })),
      },
      userSelections: {
        [OBJECT_TRANSPOSE_STEP_IDS.RATE_PLAUSIBILITY]: ratings,
      },
    } as unknown as Parameters<typeof buildObjectTransposeResult>[0];

    const result = buildObjectTransposeResult(session);
    expect(result.highPriorityAlternativeIds).toEqual([ratings[0].alternativeId]);
    expect(result.selectedTestIds.length).toBeGreaterThan(0);
  });
});

describe("operators/scale-check", () => {
  it("computes basic scale utilities and builds result defaults", () => {
    expect(estimateToValue("small", "r")).toBeGreaterThan(0);
    expect(classifyEffectSize(0.1, "r")).toBe("small");
    expect(varianceExplained(0.5)).toBeCloseTo(25, 5);

    const hypothesis = makeHypothesis({ domain: ["technology"] });
    const context = getDomainContext(hypothesis);
    expect(context.domain).toContain("Tech");

    const comparison = generateContextComparison(
      { type: "r", value: 0.95, direction: "increase" },
      context
    );
    expect(comparison.relativeToNorm).toBe("exceptional");
    expect(comparison.warnings.length).toBeGreaterThan(0);

    const population = generatePopulationConsiderations();
    expect(population.every((c) => c.addressed === false)).toBe(true);

    const session = {
      generatedContent: {
        [SCALE_CHECK_STEP_IDS.CONTEXTUALIZE]: comparison,
      },
      userSelections: {
        [SCALE_CHECK_STEP_IDS.QUANTIFY]: { type: "estimate", estimate: "medium", direction: "change" },
        [SCALE_CHECK_STEP_IDS.PRECISION]: { isDetectable: false, powerNotes: "low power", warnings: [] },
        [SCALE_CHECK_STEP_IDS.PRACTICAL]: { isPracticallyMeaningful: true, stakeholders: ["users"], reasoning: "ok" },
        [SCALE_CHECK_STEP_IDS.POPULATION]: population,
      },
      notes: "summary",
    } as unknown as Parameters<typeof buildScaleCheckResult>[0];

    const result = buildScaleCheckResult(session);
    expect(result.overallPlausibility).toBe("implausible");
    expect(result.summaryNotes).toBe("summary");
  });
});
