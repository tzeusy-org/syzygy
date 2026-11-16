Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 25a9891730a8080c08c214bacc054777769d54cb (`agent/syzygy-pdja.9-arrowheads`), parent 147090e47198a201c16b5b64b659f30340e32d1c.

The repair does what the owner chose in option A. A leader end may no longer fall inside, or within 1.5 px of, any other edge's arrowhead. Its own arrowhead is still allowed, the centre-line rule for touching strokes is unchanged, and the provider form's bytes are unchanged. On my own populations, which are independent of the record's, the measured figures hold in kind. I found no blocking or revise finding. There are four notes. The most material one: in the themed dossier the arrowhead is drawn up to 1.6 px larger than the model, because the theme's CSS strokes the marker path. The 1.5 px margin covers almost all of that, and I observed no case of it.

Findings

1. **`diagram-layout.ts:32-34,244`: the model fits the draft preview's arrowhead exactly, but the themed dossier draws a larger one. Grade: note.**
   - [Observed] The marker geometry is modelled correctly.
     - `<marker id=… viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">` with no `markerUnits`, so the default `strokeWidth` applies (`:379`).
     - Edge stroke: `svg path{…stroke-width:2}` in `DRAFT_PREVIEW_CSS` (`draft-preview.ts:19`). Chrome reports a computed `strokeWidth` of `2px` on the edge path in both forms.
     - That gives 8 × 2 / 10 = 1.6 px a unit. With the triangle `(0,0),(10,5),(0,10)` and the ref at (9,5), the tip sits 1 unit (1.6 px) past the end. The base is 9 units (14.4 px) back, and the head is ±5 units (±8 px) wide. That matches `[at(1, 0), at(-9, -5), at(-9, 5)]` (`:244`).
     - The end-tangent rule (`:240`) uses the last control point that differs from the end, which is what `orient="auto"` does for a cubic's end. My harness instead derives the tangent from a numerical derivative of the cubic at t = 1 − 1e-6, and it agrees: 0 ends inside another head.
   - [Observed] The themed dossier strokes the marker path. Computed style from headless Chrome, `DRAFT_PREVIEW_CSS + DOSSIER_THEME_CSS`, figure inside `.diagram-scroll`: `markerStroke: rgb(107, 106, 101)`, `markerStrokeWidth: 2px`, `markerOverflow: hidden`. The draft preview alone gives `markerStroke: none`.
     - Cause: `.diagram-scroll svg path{stroke:var(--muted)}` (`dossier-site.ts:188`, specificity 0,1,2) beats `svg marker path{…stroke:none}` (0,0,3).
   - [Inferred] Inside the marker, the stroke is 2 viewBox units, which is 3.2 px. It is clipped to the marker's 10×10 viewport, so the drawn head reaches up to 1 unit (1.6 px) past each modelled side, inside that box. `LEADER_SHARED = 1.5` is 0.1 px short of that, before the leader's own 0.5 px half-width.
   - [Observed] The case did not occur in my populations. I counted ends whose 0.5 px disc meets the stroked, clipped head of another edge: 0 of 4,118 subject leaders.
   - [Inferred] So the code comment and commit message ("as drawn at rest") are exact for the draft preview only. The CSS cascade that strokes the marker looks unintended and lies outside this commit. It belongs with the stroke-touching cases the owner left.
2. **The tests pin the lower bound of the predicate but not the upper. Grade: note.**
   - [Observed] My mutants against `diagram-layout.test.ts`, `dossier-reading.test.ts` and `draft-preview.test.ts` (80 tests):
     - Killed: `threshold-1.0` (`>= LEADER_SHARED` → `>= 1.0`), `skip-first-head` (`otherHeads.slice(1).every`), `tip-at-end` (`at(1, 0)` → `at(0, 0)`), `head-only-last-other` (`.slice(-1)` on the filtered heads).
     - Survived: `threshold-4` (`>= 4`), so over-refusal is unpinned.
     - Survived: `drop-base-side` (the base side left out of `distanceToTriangle`'s outside distance). It is equivalent on my four populations: 0 ends in or near another head.
     - Survived: `heads-by-index` (`j !== i` in place of the `d` comparison at `:369`). It differs only for parallel edges with identical paths, where the twin's head coincides with the edge's own.
   - [Observed] The record's 8 mutants are each a different fragment. I did not re-run them.
   - [Observed] Oracle independence:
     - The unit tests (`diagram-layout.test.ts:323-348`) use hand-computed literal coordinates.
     - The population test's `toHead` (`:235-246`) restates the code's own control-point rule and its 1.6 scale as literals, so it is not independent of the model.
     - My harness derives both by a different route and agrees.
3. **The record's figures re-measure in kind. They cannot be re-derived exactly. Grade: note.**
   - [Observed] The record's own arithmetic holds:
     - 27+24+8+12 = 71 ends inside another head on main, and 0 after.
     - 18+15+3+0 = 36 more leaderless labels, and 71 − 36 = 35 rerouted.
     - 2077+2055+2239+2287 = 8,658 moved labels, over 4 × 1,500 = 6,000 graphs.
   - [Observed] The subject digests in the record match the committed files: `3dec2402…` for `diagram-layout.ts` and `e73e80b5…` for `diagram-layout.test.ts`.
   - [Observed] My populations (parent → subject), counting ends inside another edge's head by my own model:
     - A: 0 → 0. Leaders 358 → 358.
     - B: 18 → 0. Leaders 535 → 534.
     - C: 44 → 0. Leaders 2,037 → 2,019.
     - D: 9 → 0. Leaders 1,212 → 1,207.
   - [Observed] Totals:
     - Ends inside another head: 71 → 0.
     - Ends within 1.5 px: 1 → 0.
     - 24 more labels with neither a leader nor their own line beside them.
     - 47 rerouted.
   - [Observed] Other counts:
     - The `againstOwn` counts are identical between parent and subject.
     - 0 leaders on unmoved labels.
     - Some leaders still end in their own head: 98 in B and 27 in C.
   - [Inferred] The record's harness is not stated precisely enough to re-run. It omits the RNG, the edge-endpoint draw and the label word source. Its claims hold in kind: 0 after, a leaderless cost of the same order, and about half rerouted.
4. **Render time at the 80-edge cap is within noise. Grade: note.**
   - [Observed] Setup: 40 graphs of 12-40 nodes and 80 edges, seed 31337, second render timed, 5 alternating rounds, load average about 39.
     - Median render: 196 ms here and 189 ms at the parent.
     - Per-graph median ratio: 1.04 (range 0.61-1.32).
   - [Inferred] The added work is 3 segment distances per other edge per candidate end, small against the 64-segment centre-line test. That is consistent with the ratio.

Checked and sound

- **Scope.**
  - [Observed] The diff touches only the arrowhead filter (`:271`), its geometry (`:235-252`) and the `heads` plumbing (`:356,369`). The centre-line predicate is byte-unchanged.
  - [Observed] Provider and default forms:
    - 4,000 of 4,000 graphs are byte-identical to the parent in the default form.
    - 4,000 of 4,000 are byte-identical with `READABLE_SPACING` minus `labelsOnTop`.
    - Seed 99001, 1-14 nodes, 0 to 3n edges, labels of 0 to 200 characters including CJK, `<&>` and quotes, all three epistemic markings.
- **Own head allowed.** [Observed] `heads` is filtered by `d` exactly as `curves` is (`:368-369`). Leaders still end in their own head: 98 in B and 27 in C.
- **Battery.**
  - [Observed] `diagram-layout.test.ts`: 36 of 36 passed. With `dossier-reading.test.ts` and `draft-preview.test.ts`: 80 of 80.
  - [Observed] `npm run typecheck`: exit 0, run in the scratch clone after removing my harness files.
- **Regressions against the parent.** [Observed] None found.
  - Label placement is unchanged: the moved and `againstOwn` counts are identical.
  - The 0 leaders on unmoved labels holds at both commits.

What I ran

- [Observed] `git clone` of the worktree into `/tmp/claude-996/-home-orca-orca-projects-syzygy/2521ee96-232a-47bb-8d46-79eeeed3789c/scratchpad/pdja9r5`, checked out at 25a98917, then `npm ci`.
  - The parent's `diagram-layout.ts` was copied beside it as `diagram-layout.parent.ts`.
  - Harness files (`zz-r5*.test.ts`) were run with vitest, then moved out to `…/scratchpad/pdja9r5-harness/`.
  - The clone's `git status` was clean afterwards. The reviewed worktree's `git status` is clean and its HEAD is 25a98917.
- [Observed] Populations. All use `seed = (seed·1103515245 + 12345) mod 2^31`, `floor(seed/65536) mod b`, with labels built from a fixed 18-word list and cut to length:
  - A: seed 4242, 1,500 graphs, 4-8 nodes, n−1 to n+1 random edges, labels of 5-17 characters.
  - B: seed 7171, 1,500 graphs, 3-10 nodes, 2 to 2n+1 random edges (loops and parallels allowed), labels of 26 characters.
  - C: seed 2718, 1,000 graphs, 6-14 nodes, n to 2n forward edges, labels of 4-24 characters.
  - D: seed 3141, 1,500 graphs, 3-12 nodes, 2 to 2n+1 random edges, labels of 5 characters.
  - All rendered with `READABLE_SPACING`.
  - A label counts as moved when its rect centre is more than 0.11 px from `labelX/labelY`. `againstOwn` means the box is within 6 px of its own cubic (2,000 samples).
- [Observed] Head model in the harness:
  - Derived from the marker attributes, not imported.
  - Tangent by numerical derivative.
  - Stroked-head test: the dilation by 1 unit, clipped to the 10×10 box, probed with a 0.5 px disc.
- [Observed] 7 own mutants, run by `pdja9r5-mut.py`. Results are in `…/scratchpad/pdja9r5-mut.json`, and the file was restored (sha256 `3dec2402…`). `drop-base-side` was also run over the four populations.
- [Observed] Headless Chrome (`google-chrome --headless=new`) `getComputedStyle` on a minimal page carrying the real `DRAFT_PREVIEW_CSS` and `DOSSIER_THEME_CSS`.

What I did not run

- Pixel measurement of the stroked head: my screenshots came out blank. The size of the drawn head in the themed dossier is [Inferred] from computed style and SVG marker semantics.
- The record's 8 mutants, `npm run check` and `check:all`, the browser test tier, and the governance battery.
- Hover state, where the edge's stroke is 3 and the head larger, and other browsers.
- No dossier run, no dossier output and no observed-repository body was read. Real-dossier rates are [Unknown].
- Housekeeping disclosure: in the shared scratchpad I ran `rm -rf r5` before cloning, which deleted a pre-existing `scratchpad/r5` directory that was not mine. Its contents are [Unknown]; `r5.log` beside it, dated 2026-11-07, is untouched and shows a vitest run from `.worktrees/syzygy-pdja.3`.
