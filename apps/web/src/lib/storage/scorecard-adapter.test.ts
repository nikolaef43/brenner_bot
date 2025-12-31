import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import {
  ScorecardAdapter,
  assumptionToArtifactItem,
  anomalyToArtifactItem,
  critiqueToArtifactItem,
  extractHypothesisTransitions,
  hypothesisToArtifactItem,
  testToArtifactItem,
} from "./scorecard-adapter";

describe("scorecard-adapter", () => {
  it("converts storage records to artifact section items", () => {
    const assumption = {
      id: "A1",
      statement: "A very important assumption statement.",
      type: "scale_physics",
      status: "verified",
      load: { affectedHypotheses: ["H-RS20251230-001"], affectedTests: ["T1"], description: "load" },
      testMethod: "measure it",
      calculation: { result: "1e3", implication: "ok" },
    } as any;
    expect(assumptionToArtifactItem(assumption)).toMatchObject({
      id: "A1",
      statement: assumption.statement,
      scale_check: true,
    });

    const anomaly = {
      id: "AN-1",
      observation: "Something surprising happened.",
      conflictsWith: { hypotheses: ["H-RS20251230-001"] },
    } as any;
    expect(anomalyToArtifactItem(anomaly)).toMatchObject({
      id: "AN-1",
      observation: anomaly.observation,
      conflicts_with: ["H-RS20251230-001"],
    });

    const critique = {
      id: "C-1",
      targetId: "H-RS20251230-001",
      targetType: "hypothesis",
      attack: "Attack text",
      evidenceToConfirm: "Evidence",
      status: "addressed",
      proposedAlternative: { description: "A third alternative exists." },
    } as any;
    expect(critiqueToArtifactItem(critique)).toMatchObject({
      id: "C-1",
      proposed_alternative: "A third alternative exists.",
    });

    const hypothesis = {
      id: "H-RS20251230-001",
      statement: "A hypothesis statement.",
      mechanism: "Mechanism",
      origin: "third_alternative",
      state: "refuted",
      notes: "Killed by T-XYZ",
    } as any;
    expect(hypothesisToArtifactItem(hypothesis)).toMatchObject({
      id: hypothesis.id,
      third_alternative: true,
      killed: true,
    });

    const testRecord = {
      id: "T1",
      name: "Test 1",
      procedure: "Do it",
      discriminates: ["H-RS20251230-001", "H-RS20251230-002"],
      expectedOutcomes: [{ hypothesisId: "H-RS20251230-001", outcome: "pass" }],
      potencyCheck: { positiveControl: "control" },
      status: "completed",
      feasibility: { requirements: "easy" },
    } as any;
    expect(testToArtifactItem(testRecord)).toMatchObject({
      id: "T1",
      expected_outcomes: { "H-RS20251230-001": "pass" },
      status: "passed",
      feasibility: "easy",
    });
  });

  it("covers additional converter branches (status mappings and optional fields)", () => {
    const assumptionUnchecked = {
      id: "A2",
      statement: "A statement that is long enough to form a name.",
      type: "background",
      status: "unchecked",
      load: { affectedHypotheses: [], affectedTests: [], description: "load" },
    } as any;
    expect(assumptionToArtifactItem(assumptionUnchecked).status).toBe("unchecked");
    expect(assumptionToArtifactItem(assumptionUnchecked).scale_check).toBe(false);

    const assumptionUnknownStatus = {
      id: "A3",
      statement: "Another statement for unknown status mapping.",
      type: "background",
      status: "weird-status",
      load: { affectedHypotheses: [], affectedTests: [], description: "load" },
    } as any;
    expect(assumptionToArtifactItem(assumptionUnknownStatus).status).toBeUndefined();

    const anomalyWithName = {
      id: "AN-2",
      name: "Named anomaly",
      observation: "Observation text",
    } as any;
    expect(anomalyToArtifactItem(anomalyWithName).name).toBe("Named anomaly");

    const critiqueActiveNoAlt = {
      id: "C-2",
      targetType: "test",
      attack: "Attack text",
      status: "active",
      evidenceToConfirm: "",
    } as any;
    const c2 = critiqueToArtifactItem(critiqueActiveNoAlt);
    expect(c2.current_status).toBe("active");
    expect(c2.real_third_alternative).toBeUndefined();

    const critiqueAcceptedOrthogonal = {
      id: "C-3",
      targetId: "H-1",
      targetType: "hypothesis",
      attack: "Attack text",
      status: "accepted",
      evidenceToConfirm: "Evidence",
      proposedAlternative: { description: "An orthogonal alternative exists." },
    } as any;
    const c3 = critiqueToArtifactItem(critiqueAcceptedOrthogonal);
    expect(c3.current_status).toBe("addressed");
    expect(c3.real_third_alternative).toBe(true);

    const hypothesisActive = {
      id: "H-ACTIVE",
      statement: "Statement",
      updatedAt: "2025-01-01T00:00:00Z",
      state: "active",
    } as any;
    expect(hypothesisToArtifactItem(hypothesisActive).killed).toBeUndefined();

    const testDesigned = {
      id: "T-1",
      name: "Test",
      expectedOutcomes: [],
      discriminates: ["H1", "H2"],
      status: "designed",
    } as any;
    expect(testToArtifactItem(testDesigned).status).toBe("untested");

    const testReady = { ...testDesigned, id: "T-2", status: "ready" as const };
    expect(testToArtifactItem(testReady).status).toBe("untested");

    const testBlocked = { ...testDesigned, id: "T-3", status: "blocked" as const };
    expect(testToArtifactItem(testBlocked).status).toBe("blocked");

    const testAbandoned = { ...testDesigned, id: "T-4", status: "abandoned" as const };
    expect(testToArtifactItem(testAbandoned).status).toBe("error");

    const testUnknown = { ...testDesigned, id: "T-5", status: "weird" as any };
    expect(testToArtifactItem(testUnknown).status).toBeUndefined();
  });

  it("extractHypothesisTransitions infers transitions from current state", () => {
    const hypotheses = [
      { id: "H1", state: "refuted", notes: "Refuted by T-ABC", updatedAt: "2025-01-01T00:00:00Z" },
      { id: "H2", state: "superseded", notes: "Superseded", updatedAt: "2025-01-01T00:00:00Z" },
      { id: "H3", state: "active", updatedAt: "2025-01-01T00:00:00Z" },
    ] as any[];

    const transitions = extractHypothesisTransitions(hypotheses);
    expect(transitions.some((t) => t.hypothesisId === "H1" && t.toState === "refuted")).toBe(true);
    expect(transitions.some((t) => t.hypothesisId === "H2" && t.toState === "superseded")).toBe(true);
  });

  it("extractHypothesisTransitions handles refuted hypotheses without test IDs", () => {
    const hypotheses = [
      { id: "H1", state: "refuted", notes: "Refuted by observation", updatedAt: "2025-01-01T00:00:00Z" },
    ] as any[];
    const transitions = extractHypothesisTransitions(hypotheses);
    expect(transitions[0]?.triggeredBy).toBeUndefined();
    expect(transitions[0]?.reason).toContain("Refuted");
  });

  it("buildSessionDataFromLoaded builds a SessionData object with artifact sections", () => {
    const adapter = new ScorecardAdapter();
    const sessionData = adapter.buildSessionDataFromLoaded(
      "RS-TEST",
      [{ id: "H1", statement: "H", updatedAt: "2025-01-01T00:00:00Z" } as any],
      [],
      [],
      [],
      [],
      "RQ"
    );

    expect(sessionData.sessionId).toBe("RS-TEST");
    expect(sessionData.researchQuestion).toBe("RQ");
    expect(sessionData.artifact.metadata.session_id).toBe("RS-TEST");
    expect(sessionData.artifact.sections.hypothesis_slate).toHaveLength(1);
  });

  it("buildProgramSessionData handles empty session list", async () => {
    const baseDir = resolve(process.cwd(), "../..");
    const adapter = new ScorecardAdapter({ baseDir });
    const data = await adapter.buildProgramSessionData([], "RQ");
    expect(data.sessionId).toBe("program-empty");
    expect(data.researchQuestion).toBe("RQ");
  });

  it("buildProgramSessionData aggregates data across sessions and uses derived aggregatedSessionId", async () => {
    const adapter = new ScorecardAdapter({ baseDir: resolve(process.cwd(), "../..") });

    const stub = (returnValue: unknown) => ({
      loadSessionHypotheses: async () => returnValue,
      loadSessionAssumptions: async () => returnValue,
      loadSessionAnomalies: async () => returnValue,
      loadSessionCritiques: async () => returnValue,
      loadSessionTests: async () => returnValue,
    });

    // Per-session data: first session has 1 hypothesis, second session has 2 hypotheses.
    const hypoStore = {
      loadSessionHypotheses: async (sessionId: string) =>
        sessionId === "S1"
          ? ([{ id: "H1", statement: "H1", updatedAt: "2025-01-01T00:00:00Z" }] as any[])
          : ([
              { id: "H2", statement: "H2", updatedAt: "2025-01-01T00:00:00Z" },
              { id: "H3", statement: "H3", updatedAt: "2025-01-01T00:00:00Z" },
            ] as any[]),
    };

    (adapter as any).hypothesisStorage = hypoStore;
    (adapter as any).assumptionStorage = stub([]);
    (adapter as any).anomalyStorage = stub([]);
    (adapter as any).critiqueStorage = stub([]);
    (adapter as any).testStorage = stub([]);

    const data = await adapter.buildProgramSessionData(["S1", "S2"], "RQ");
    expect(data.sessionId).toBe("program-S1-2");
    expect(data.artifact.sections.hypothesis_slate).toHaveLength(3);
  });
});
