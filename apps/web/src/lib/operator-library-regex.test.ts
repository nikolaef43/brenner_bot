import { describe, expect, it } from "vitest";
import { parseOperatorCards } from "./operator-library";

// Mock markdown content with variadic whitespace
const MOCK_MARKDOWN = `
## Core Operators

### ⊘ Level-Split (level-split)

**Definition**:
Separate program from interpreter.

**When-to-Use Triggers**:
- Trigger 1

**Failure Modes**:
- Failure 1

**Prompt module (copy/paste)**:
~~~text
Prompt
~~~

**Transcript Anchors**: §42

**Quote-bank anchors**: §42

**Canonical tag**: 
level-split
`;

const MOCK_MARKDOWN_NO_BACKTICKS = `
## Core Operators

### ⊘ Level-Split (level-split)

**Definition**: Separate program from interpreter.

**When-to-Use Triggers**: - Trigger 1

**Failure Modes**: - Failure 1

**Transcript Anchors**: §42

**Quote-bank anchors**: §42

**Canonical tag**: level-split
`;

describe("operator-library regex robustness", () => {
  it("parses standard markdown", () => {
    const cards = parseOperatorCards(MOCK_MARKDOWN);
    expect(cards).toHaveLength(1);
    expect(cards[0].symbol).toBe("⊘");
    expect(cards[0].canonicalTag).toBe("level-split");
  });

  it("parses markdown without backticks in canonical tag", () => {
    // This previously failed or was brittle
    const cards = parseOperatorCards(MOCK_MARKDOWN_NO_BACKTICKS);
    expect(cards).toHaveLength(1);
    expect(cards[0].canonicalTag).toBe("level-split");
  });
});
