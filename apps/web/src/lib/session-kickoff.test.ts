import { describe, it, expect } from "vitest";
import { composeKickoffMessages } from "./session-kickoff";

describe("session kickoff ↔ thread status contract", () => {
  it("instructs canonical DELTA subject tags per role", () => {
    const messages = composeKickoffMessages({
      threadId: "RS-20251230-test",
      researchQuestion: "What is the minimal test case?",
      context: "Short context.",
      excerpt: "§1: Exclusion is good.",
      recipients: ["Codex", "Opus", "Gemini"],
    });

    const bodyByRecipient = new Map(messages.map((m) => [m.to, m.body]));

    expect(bodyByRecipient.get("Codex")).toContain("DELTA[gpt]");
    expect(bodyByRecipient.get("Opus")).toContain("DELTA[opus]");
    expect(bodyByRecipient.get("Gemini")).toContain("DELTA[gemini]");
  });
});

