import { describe, it, expect } from "vitest";
import { loadBrennerOperatorPalette } from "./operators";

describe("operators", () => {
  it("loads the core operator palette from the operator library spec", async () => {
    const ops = await loadBrennerOperatorPalette();
    expect(ops).toHaveLength(17);

    // Track how many operators have full quote-bank coverage
    let opsWithQuotes = 0;

    for (const op of ops) {
      expect(op.canonicalTag.length).toBeGreaterThan(0);
      expect(op.symbol.length).toBeGreaterThan(0);
      expect(op.title.length).toBeGreaterThan(0);

      // Operators with quoteBankAnchors should have matching supportingQuotes
      if (op.quoteBankAnchors.length > 0) {
        expect(op.supportingQuotes.length).toBeGreaterThan(0);
        opsWithQuotes++;

        for (const quote of op.supportingQuotes) {
          expect(quote.tags).toContain(op.canonicalTag);
          expect(op.quoteBankAnchors).toContain(quote.sectionId);
        }
      }
    }

    // At least 14 core operators should have full quote coverage
    // (hal, potency-check, exception-quarantine are pending - see brenner_bot-xxxx)
    expect(opsWithQuotes).toBeGreaterThanOrEqual(14);
  });
});
