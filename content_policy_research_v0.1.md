# Content Policy Research: Web of Stories Transcript Rights

> **Status**: Research complete - action required
> **Date**: 2025-12-30
> **Task**: brenner_bot-5so.7.6.1
> **Researcher**: PurpleMountain (Claude Code / Opus 4.5)

---

## Executive Summary

**GO/NO-GO Decision: CONDITIONAL NO-GO for public hosting**

The Brenner transcripts are copyrighted by Web of Stories with "All Rights Reserved" status. Public hosting of full transcripts without permission would likely constitute copyright infringement. We need to either:
1. Obtain written permission from Web of Stories, OR
2. Implement content gating (private access only), OR
3. Replace full transcripts with excerpts + links to original videos (fair use)

---

## Research Findings

### 1. Current Transcript Status

The file `complete_brenner_transcript.md` contains:
- 236 video transcripts from Web of Stories
- Explicit copyright notice: `(Copyright Web Of Stories, 2025, All Rights Reserved)`
- Source: webofstories.com

### 2. Web of Stories Terms of Service

From Web of Stories General Terms (webofstories.com/generalTerms):

| Aspect | Finding |
|--------|---------|
| **Copyright Owner** | "The copyright in the material contained on this Web Site and Application belongs to WEB OF STORIES or its licensors." |
| **Reproduction** | "Reproduction of material on this Web Site and Application is prohibited unless express permission is given by WEB OF STORIES." |
| **Commercial Use** | "you agree not to use the Web Site and Application for any commercial use, without the prior written authorisation of WEB OF STORIES" |
| **Linking** | Users may link to up to 5 individual stories without framing, no endorsement implied |
| **Educational Exemption** | **None specified** |
| **Attribution** | No specific requirements stated |

### 3. Sydney Brenner Archive Materials (Wellcome Collection)

From Wellcome Collection (wellcomecollection.org):
- Materials created BY Brenner: Available under CC-BY-NC license
- Materials created BY OTHERS about Brenner: Standard copyright applies
- Original holdings: Cold Spring Harbor Laboratory Library and Archives

**Note**: The Web of Stories videos are created BY Web of Stories (the interviewer organization), not BY Brenner himself. Therefore, they fall under standard copyright, not CC-BY-NC.

---

## Legal Analysis

### Can We Host Full Transcripts Publicly?

**No, not without permission.**

Rationale:
1. Explicit "All Rights Reserved" copyright notice in the transcript file
2. Web of Stories terms explicitly prohibit reproduction without permission
3. No educational exemption is stated
4. The transcripts are substantial reproductions of copyrighted video content

### Fair Use Considerations (US Law)

Under 17 U.S.C. § 107, fair use considers:

| Factor | Analysis |
|--------|----------|
| **Purpose** | Educational/research - favorable, but we're building a public website |
| **Nature of work** | Factual interviews - moderately favorable |
| **Amount used** | Complete transcripts (236 videos) - unfavorable |
| **Market effect** | Could substitute for visiting Web of Stories - unfavorable |

**Conclusion**: Fair use is unlikely to protect hosting full transcripts.

### What About Short Excerpts?

Short, cited excerpts (e.g., quote banks with attribution) have a stronger fair use argument:
- Limited portion of each work
- Transformative commentary/analysis purpose
- Less market substitution effect

---

## Recommendations

### Option A: Seek Permission (Recommended)

**Action**: Contact Web of Stories at info@webofstories.com

Request template:
```
Subject: Permission Request - Sydney Brenner Transcripts for Research Project

Dear Web of Stories Team,

We are developing an open-source research project called Brenner Bot that aims
to operationalize Sydney Brenner's scientific methodology for AI-assisted research.

We would like to request permission to:
1. Host transcripts of the Sydney Brenner interview series for research purposes
2. Use excerpts in prompt templates and research workflows
3. Cite and link back to webofstories.com for all source material

Our project is non-commercial and educational. We would provide full attribution
and link prominently to your original videos.

Could you advise on the feasibility of obtaining such permission?

Thank you,
[Project Contact]
```

### Option B: Content Gating (Fallback)

If permission is not granted:
1. Keep full transcripts private (authenticated access only)
2. Public site shows only:
   - Excerpt snippets with citations
   - Direct links to Web of Stories videos
   - Our synthesized distillation documents (these are our original work)
3. Lab mode (authenticated) provides full transcript access for research

### Option C: Excerpt-Only Mode (Conservative)

Host only:
- Quote bank with short excerpts (fair use defensible)
- Links to original Web of Stories videos
- Our original synthesis documents (fully permissible)
- No full transcripts

---

## Attribution Requirements

Regardless of permission status, we should include:

1. **Source credit**: "Transcripts sourced from Web of Stories (webofstories.com)"
2. **Copyright notice**: "(c) Web of Stories. Used with permission." (if granted)
3. **Link to original**: Direct links to each video on webofstories.com
4. **Terms page**: Dedicated attribution page on brennerbot.org

---

## Implications for Architecture

### Public Mode (No Permission)
- Distillation documents: PUBLIC (our original work)
- Quote bank excerpts: PUBLIC (fair use with attribution)
- Full transcripts: PRIVATE (gated behind authentication)
- Prompt templates: PUBLIC (our original work)

### Public Mode (With Permission)
- All content: PUBLIC with attribution

### Implementation
- `apps/web/lib/content-policy.ts` should enforce these rules
- Server actions must check content type before serving
- Public doc allowlist needed

---

## Next Steps

1. **Immediate**: Contact Web of Stories for permission (Option A)
2. **Parallel**: Implement content gating architecture (Option B fallback)
3. **Update beads**: Close this task, create follow-up for permission request
4. **Document**: Add terms/attribution page to web app

---

## Sources

- [Web of Stories About Page](https://webofstories.com/about)
- [Web of Stories General Terms](https://webofstories.com/generalTerms)
- [Wellcome Collection - Brenner Archives](https://wellcomecollection.org/works/bx2gbrx9)
- US Copyright Law, 17 U.S.C. § 107 (Fair Use)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2025-12-30 | Initial research complete |
