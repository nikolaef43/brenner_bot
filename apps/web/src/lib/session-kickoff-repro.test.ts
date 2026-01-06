import { describe, expect, it } from "vitest";
import { composeUnifiedKickoff } from "./session-kickoff";

describe("session-kickoff repro: unified kickoff format", () => {
  it("should include instructions on Response Format (deltas)", () => {
    const unified = composeUnifiedKickoff({
      threadId: "RS-20251231-repro",
      researchQuestion: "Test Question",
      context: "Context",
      excerpt: "Excerpt",
      recipients: ["Codex"],
    });

    // This is expected to fail currently
    expect(unified.body).toContain("## Response Format");
    expect(unified.body).toContain("structured deltas");
  });
});
