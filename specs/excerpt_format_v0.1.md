# Brenner Protocol Excerpt Format v0.1

> **Status**: Draft specification
> **Purpose**: Standard format for transcript excerpts used in session kickoffs
> **Scope**: Web app + CLI use identical excerpt format for all kickoff prompts

---

## Overview

An excerpt is a curated selection of transcript sections assembled for use in session kickoffs. Excerpts ground the research question in Brenner's actual words while keeping prompt context manageable.

### Design Goals

1. **Preserve Citations**: Every quote must include its `§n` anchor
2. **Consistent Structure**: Predictable format for agent parsing
3. **Size-Bounded**: Stay within token limits for kickoff prompts
4. **Machine-Readable**: Structured enough for automated validation

---

## Excerpt Block Format

```markdown
### Excerpt: [Title or Theme]

> **§n**: "[Brenner quote]"
> — *[Optional section title]*

> **§m**: "[Another quote]"
> — *[Optional section title]*

**Sections included**: §n, §m, ...
**Total words**: ~X words
```

### Required Elements

| Element | Format | Example |
|---------|--------|---------|
| Block heading | `### Excerpt: [theme]` | `### Excerpt: Reduction to Mechanism` |
| Citation anchor | `**§n**:` | `**§42**:` |
| Quote text | Double-quoted, italicized context | `"[quote text]"` |
| Source attribution | Em dash + section title | `— *On Getting the Right Organism*` |
| Footer metadata | Sections list + word count | `**Sections included**: §42, §57` |

---

## Citation Format

All transcript references use the stable anchor format:

```
§n    — Single section (e.g., §42)
§n-m  — Range of sections (e.g., §42-45)
```

### Anchor Rules

1. **Always prefix with §**: Never use bare numbers
2. **Use original anchor**: Don't renumber or alias
3. **Preserve in quotes**: Include `(§n)` inline when quoting mid-section
4. **Link to source**: In web UI, anchors should be clickable

---

## Excerpt Construction Rules

### Selection Criteria

1. **Relevance**: Sections must directly support the research question
2. **Primacy**: Prefer Brenner's direct statements over commentary
3. **Diversity**: Include multiple perspectives when hypotheses conflict
4. **Density**: Choose information-dense sections over lengthy narratives

### Size Constraints

| Constraint | Limit | Rationale |
|------------|-------|-----------|
| Max sections | 5-7 | Keep focused on core evidence |
| Max words per quote | ~150 | Ensure readability |
| Max total words | ~800 | Fit within kickoff token budget |
| Min sections | 2 | Require multiple sources |

### Ordering

1. Order by relevance to research question (most relevant first)
2. Or order chronologically within transcript (by `§n` number)
3. State ordering convention in excerpt heading if non-obvious

---

## Examples

### Minimal Excerpt (2 sections)

```markdown
### Excerpt: The Right Organism

> **§58**: "You have to choose the right organism to work on. If you don't, you're stuck."
> — *On Getting the Right Organism*

> **§61**: "The power of genetics is that it reduces the problem to one dimension."
> — *Reduction to One Dimension*

**Sections included**: §58, §61
**Total words**: ~45 words
```

### Full Excerpt (5 sections with theme)

```markdown
### Excerpt: Scale and Potency in Experimental Design

> **§42**: "The question is not whether you can do the experiment, but whether it will tell you anything. Most experiments are impotent—they cannot distinguish between hypotheses."
> — *On Discriminative Tests*

> **§45**: "You need a chastity control. If the result is negative, how do you know your assay worked? A negative that could have been positive is data. A negative from a dead assay is noise."
> — *Potency Checks*

> **§127**: "Calculate the numbers first. If diffusion time is longer than the cell cycle, your gradient hypothesis is dead before you start."
> — *Scale as Prison*

> **§129**: "The imprisoned imagination—we forget that physics constrains possibility. Not everything imaginable is physically realizable."
> — *Physical Constraints*

> **§205**: "The gradient gives you analog, lineage gives you digital. Know which game you're playing."
> — *Coordinate Systems*

**Sections included**: §42, §45, §127, §129, §205
**Total words**: ~180 words
```

---

## Integration with Kickoff Templates

Excerpts are inserted into kickoff messages under the `## Transcript Excerpt` section:

```markdown
## Transcript Excerpt

### Excerpt: [Theme from form or auto-generated]

> **§n**: "[quote]"
...

**Sections included**: §n, §m
**Total words**: ~X words
```

### Compatibility with Artifact Schema

The excerpt block maps to artifact sections:

| Excerpt Element | Artifact Use |
|-----------------|--------------|
| Section anchors (`§n`) | **Anchors** field in Research Thread, Hypotheses |
| Quote text | Evidence citations in any section |
| Theme | Supports Research Thread context |

---

## API Shape

The excerpt builder function signature:

```typescript
interface ExcerptSection {
  anchor: string;      // "§42"
  quote: string;       // The selected text
  title?: string;      // Section title for attribution
}

interface ExcerptConfig {
  theme?: string;                    // Excerpt theme/title
  sections: ExcerptSection[];        // Selected sections
  ordering?: "relevance" | "chronological";
  maxTotalWords?: number;            // Default: 800
}

interface ComposedExcerpt {
  markdown: string;    // Full excerpt block as markdown
  anchors: string[];   // List of included anchors
  wordCount: number;   // Total word count
  warnings: string[];  // Size limit warnings, etc.
}

function composeExcerpt(config: ExcerptConfig): ComposedExcerpt;
```

---

## Validation Rules (for linter)

### Errors (must fix)

- [ ] All quotes include `§n` anchor
- [ ] At least 2 sections included
- [ ] No duplicate anchors
- [ ] Anchors use valid format (`§` + number)

### Warnings (should fix)

- [ ] Total words exceeds 800
- [ ] More than 7 sections included
- [ ] Missing section attributions
- [ ] Theme/heading not descriptive

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2025-12-30 | Initial draft |
