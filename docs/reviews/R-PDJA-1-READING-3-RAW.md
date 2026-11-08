Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: b9e107b0b21197a15bbcd511f7c6a250708502a6
Reviewer: independent fresh-context session
Date: 2026-11-06

Everything below ran in scratch copies, at these bytes, on the synthetic fixture. The worktree stayed clean. Real Redis prose was not rendered, and I did not run `npm run check:all`. None of the exceptions breaches RFC7-34. It sits at `rendering-and-surface.md:241`, not `narrative-contract.md` as the brief says.

## Exceptions, most severe first

**1. Finding 11 is repaired only for one skip beside its same-row neighbour, so labels still overprint.** [Observed]
- `diagram-layout.ts:154` puts every skip label from a node at the same point, `(x1+gapX/2, y1+52)`.
- Rendered with `READABLE_SPACING` and distinct labels:
  - Two skips from one node (a→b→c→d, a→c, a→d): the a→c and a→d label boxes overlap.
  - A fan plus a skip (h→x, h→y, x→z, h→z): the h→y and h→z boxes overlap, because the sibling's midpoint is 60 px below the source and the skip label is 52 px below.
- Crossing edges (a→c, a→d, b→c, b→d) and parallel edges (two a→b) also overlap at a shared midpoint. These use the midpoint code the repair did not touch, so they are the same family rather than a regression. [Inferred on origin]
- In 2,678 pseudo-random graphs of up to 8 nodes, 1,245 had a label overlapping a label. The population is dense and random, not a real-world rate.
- The `overprinted` assertion at `diagram-layout.test.ts:112` covers only the 8 listed shapes, and none of them hits these overlaps.
- The covered label stays recoverable from the text list and the `<title>`, which is why this is not an RFC7-34 breach.

**2. Finding 4 is repaired at desktop width but not at narrow width.** [Observed]
- `dossier-site.ts:158` sets `outline-offset:-3px` on `.nav-panel>summary` only.
- At 390 px the first navigation stop is `.mobile-contents>summary`. Its computed offset is 5px, its parent has `overflow:auto`, and its left, top and right edges equal the panel's (24, 212, 351).
- A screenshot with `:focus-visible` confirmed shows only the ring's bottom edge, the same defect round 2 reported.
- This rule is older than the commit. The fix belongs in the operator-only stylesheet, so provider bytes stay pinned.

**3. The repair broke label hover: hovering an edge label no longer highlights anything.** [Observed]
- Moving labels into `<g class="edge-text">` (`diagram-layout.ts:236`) took them out of `g.edge`, and the `g.edge:hover rect.edge-label` rule was deleted. The `dossier-site.ts:161` rule remains, and `g.edge` now holds only the path.
- With real mouse events on the first long label:
  - Hovering the label: edge stroke stays 2px and no `g.edge:hover` matches.
  - Hovering a node: stroke goes to 3px, so node hover works.
  - Hovering the visible line: stroke goes to 3px, but the target is only about 9 px at each end of the 183 px gap.
- The bead asks for CSS-only hover highlighting. No mutant covers diagram hover, and `notCovered` (record line 895) no longer mentions it, though round 2 saw it disclosed there.

**4. Finding 6: the hover bridge works only when the term sits above its popup.** [Observed]
- The popup opens at the block's left edge with width `min(22rem,100%)`, and the bridge has the popup's width (`dossier-site.ts:166`).
- For a term at x 885–940 at 1440 px (popup 351–703), a straight pointer path to the nearest point of the popup loses the entry at step 4 of 24. The same happens at 1920 px (term 1075–1131, popup 542–894).
- With a 765 px column, any term starting past about 352 px has this problem.
- Terms above the popup do reach it, with the 4 px gap bridged: all 8 such terms at each width.
- The fixture's `late` term (`dossier-reading.testkit.ts:42`) wraps to the start of a line at 1440 px, so it does not exercise this case.
- Entries remain readable in place and through the glossary link. The term's accessible-name behaviour stays as you stated.

**5. Finding 2's behaviour is repaired, but the floor it added is unpinned.** [Observed]
- I mutated `dossier-site.ts:161` to `svg[width="1048"]{max-width:100%}`. It survives both `dossier-reading.browser.test.ts` and `dossier-reading.test.ts` (17 tests pass).
- No test file contains `860px` or `svg[width`. The recorded `wide-diagram-shrinks` mutant dies only on the 1848 px loop (browser test line 43), so a chain could shrink well below the stated 10.7 px with no test failing.

**6. Finding 7 has undisclosed residuals.** [Observed]
- The page denominator at `dossier-reading.test.ts:24` is still the six fixture pages. Discovery, clarifications, executions, review and deep-dive pages are not in it, and `notCovered` does not say so. I found no visible source id in the code paths for those pages, but I did not render them. [Inferred]
- The test at `dossier-reading.test.ts:129` says it "dims a withheld marker", but only a stylesheet substring backs that. `notCovered` discloses term hover only.

**7. The campaign file overstates finding 6.** [Observed] `docs/review-campaigns/pdja-1-reading.md:13` says "findings 1 to 8 and 11 were repaired", but finding 6 is partial by your own account and by exception 4. Its sentence "Remainders are in the PR body" was not checked.

## Confirmed repaired

| Round 2 finding | Result |
|---|---|
| 1. Lines over text | Repaired. SVG order is lines, nodes, labels. The n0→n3 skip and the back edge from an upper row are drawn behind the nodes, and the order is pinned. [Observed] |
| 2. Scale floor | Repaired in behaviour, see exception 5. The 1048 px chain renders text at 10.67 px at 390, 11.99 at 1440 and 13 at 1920, and scrolls at 390. The 1848 px loop stays at 13 px and scrolls. [Observed] |
| 3. Labels on nodes | Repaired. The a→{m1,m2,m3}→x→y→z shape stays on one band. The fuzz found 0 label-on-node hits and 0 labels outside the SVG. [Observed] |
| 4. Focus ring | Repaired at desktop, see exception 2. At 1440 px with the panel open, the ring is whole on screen. [Observed] |
| 5. Size report | Repaired. The removal is disclosed at `dossier-site.ts:607`, and the source comment no longer claims the report states what a reader loads. [Observed] |
| 6. Esc on the bead | Repaired. `syzygy-pdja.5` now carries it in its notes. [Observed] |
| 8. Mutation record | Repaired. All 7 subject digests match HEAD, including tests, and a runner sentence is stored. Every `old` fragment applies exactly once. |
| 8. Mutant re-run | My re-run of all 54 gave 53 killed plus `bands-despite-loop` surviving, matching the record. Its equivalence claim holds, since a back edge also fails the one-layer-step test. [Observed] |
| 8. Recorded commit | `8eafe50b` is not an ancestor of HEAD, but it has no diff from HEAD under `apps` or `packages`. The digests are the anchor. [Observed] |
| 9. Hashes | Decided in the commit message. [Observed] |
| Pinned bytes | The provider golden and draft-preview tests pass. `renderDiagramSvg` with default spacing is byte-identical to the parent commit's over 3,000 random graphs. [Observed] |
| RFC7-34 | The clause requires that "visual encodings are legended and mean exactly what the legend says". The `†N` legend appears on pages using the mark, and `aria-label` carries the same count in words. [Observed] |
