/**
 * Session Export / Import Tests
 *
 * @see brenner_bot-1v26.4 (bead)
 */

import { describe, test, expect } from "vitest";
import type { Session } from "./types";
import { createSession } from "./types";
import { exportSession, importSession } from "./export";

function buildTestSession(): Session {
  const now = new Date();
  const session = createSession({ id: "SESSION-TEST-EXPORT" });
  const card = {
    id: "HC-SESSION-TEST-EXPORT-001-v1",
    version: 1,
    statement: "Cells interpret morphogen gradients via thresholded transcription.",
    mechanism: "Gradient binds receptors to activate gene expression at a threshold.",
    domain: ["developmental biology"],
    predictionsIfTrue: ["Boundary appears at consistent gradient threshold."],
    predictionsIfFalse: ["Boundary position is random."],
    impossibleIfTrue: ["Boundary appears without any gradient."],
    confounds: [],
    assumptions: [],
    confidence: 50,
    createdAt: now,
    updatedAt: now,
  };

  session.primaryHypothesisId = card.id;
  session.hypothesisCards = { [card.id]: card };
  session.researchQuestion = "How do cells determine positional information?";
  session.updatedAt = now.toISOString();
  session.commits = [];
  session.headCommitId = "";

  return session;
}

describe("exportSession / importSession", () => {
  test("exports JSON with format and checksum", async () => {
    const session = buildTestSession();
    const blob = await exportSession(session, "json");
    const text = await blob.text();
    const parsed = JSON.parse(text) as { format: string; checksum: string; session: Session };

    expect(parsed.format).toBe("brenner-session-v1");
    expect(parsed.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(parsed.session.id).toBe(session.id);
  });

  test("round-trips a session via JSON import", async () => {
    const session = buildTestSession();
    const blob = await exportSession(session, "json");
    const text = await blob.text();
    const file = new File([text], "session.json", { type: "application/json" });

    const result = await importSession(file);
    expect(result.session.id).toBe(session.id);
  });

  test("warns on checksum mismatch", async () => {
    const session = buildTestSession();
    const blob = await exportSession(session, "json");
    const text = await blob.text();
    const parsed = JSON.parse(text) as { session: Session };
    parsed.session.id = "SESSION-TAMPERED";

    const file = new File([JSON.stringify(parsed)], "session.json", { type: "application/json" });
    const result = await importSession(file);

    expect(result.warnings.join(" ")).toMatch(/Checksum mismatch/);
  });

  test("exports readable markdown", async () => {
    const session = buildTestSession();
    const blob = await exportSession(session, "markdown");
    const markdown = await blob.text();

    expect(markdown).toContain(`# Brenner Loop Session ${session.id}`);
    expect(markdown).toContain("## Hypotheses");
  });
});
