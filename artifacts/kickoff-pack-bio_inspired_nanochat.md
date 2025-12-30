# Kickoff Pack: Bio-Inspired Nanochat (Round 0)

Bead: `brenner_bot-5so.10.2.1`  
Target repo: `/data/projects/bio_inspired_nanochat`

## Research Question (Discriminative)

In Bio-Inspired Nanochat, is **presynaptic vesicle depletion** (RRP clamping) functionally distinguishable from an ordinary **frequency penalty / logit bias**? If yes, what minimal experiments separate the two?

### Working hypotheses (include third alternative)

- **H1 (Equivalence):** RRP clamping is effectively a tuned frequency penalty; any apparent gains are regularization/cost tradeoffs.
- **H2 (Mechanistic):** RRP clamping creates *context-/edge-dependent fatigue* that changes attention dynamics in ways a token-count penalty can’t reproduce.
- **H3 (Misspecification):** any “wins” are artifacts (metric confound, sampling/seed effects, compute/capacity mismatch, or evaluation leakage).

## Ranked Discriminative Tests (Cheap → Expensive)

1. **Matched-baseline equivalence test:** Replace RRP clamping with an explicit frequency penalty tuned to match *repetition rate* on a small calibration prompt set; compare on held-out prompts across repetition metrics + perplexity (same sampling settings/seed).
2. **Context-sensitivity test:** Construct two prompts with similar token-frequency statistics but different attention structure; if behavior differs under RRP but not under frequency penalty, H2 gains weight.
3. **Ablation matrix (tight control):** `vanilla` vs `presynaptic-only` vs `vanilla + freq_penalty` vs `presynaptic + freq_penalty` (to detect double-counting / over-penalization).
4. **Mechanistic readout:** Instrument mean/var of `RRP` (and derived release/scaling) over time; test whether suppression tracks token counts (H1) or attention-mediated edges/usage (H2).
5. **“Digital handle” toy task:** Use a synthetic prompt where correct output requires controlled repetition (e.g., exact-copy spans); frequency-penalty behavior should degrade predictably, while selective fatigue might not.
6. **Failure-mode audit:** Look for “over-fatigue” pathologies (function words avoided, coherence collapse) vs targeted reduction of degenerate loops; treat as a falsifier for naive settings.

## Excerpt (Brenner Anchors)

### Excerpt: Tags: third-alternative, program-vs-machine, occams-broom, machine-language, simulation, cheap-loop, scale-check

> **§99**: "Well, I'll do a quickie."
> — *Pilot experiment to de-risk*

> **§100**: "it is magnesium that stabilises this, and the caesium will compete with the magnesium"
> — *Find the dominant physical variable*

> **§103**: "You've forgotten there's a third alternative… 'Both could be wrong'"
> — *Third-alternative guard*

> **§103**: "what we had decided to go for was a really definitive one"
> — *Choose the experiment with logical depth*

> **§105**: "you could make a machine in which the instructions were separate from the machine"
> — *Separate program from interpreter*

> **§106**: "Occam's Broom… the minimum number of facts have to be swept up under the carpet"
> — *Minimize hidden contradictions*

> **§160**: "If you can't compute it you can't understand it."
> — *Reconstruction standard*

> **§208**: "the machine language of the thing being simulated"
> — *Work in the native vocabulary*

**Sections included**: §99, §100, §103, §105, §106, §160, §208

## Project Notes (Pointers)

- RRP / vesicle depletion code: `/data/projects/bio_inspired_nanochat/bio_inspired_nanochat/synaptic.py` (search `RRP`, `tau_rrp`, `init_rrp`).
- Runtime metrics plumbing: `/data/projects/bio_inspired_nanochat/bio_inspired_nanochat/engine.py` (search `Presynaptic Stats (RRP, C)`).
- The README explicitly frames vesicle depletion as enforcing a “frequency penalty”; this kickoff is about testing whether that’s *only* what it does.
