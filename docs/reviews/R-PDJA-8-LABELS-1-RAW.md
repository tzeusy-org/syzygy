Verdict: REVISE
Reviewed commit: e2813e7d9243f8a221ce8c1388235a286fac618a (`agent/syzygy-pdja.8`), diffed against merge base 4dff92823a3ff26acf1923404de52d462b06c8cb.

No finding is blocking. Two findings are graded revise, and the rest are notes.

Findings

1. **`diagram-layout.ts:206-229`: a moved label can land where a reader cannot tell which line it belongs to. Grade: revise.**
   - [Observed] `placeEdgeLabels` treats only nodes, notes and placed labels as obstacles. It knows nothing about lines, and there is no leader line.
   - [Observed] Population: 3,000 seeded random graphs of 1-11 nodes and 0 to 3n edges, with self-loops and mixed labels, 24,571 labels in all.
     - 4,952 labels moved, a median of 32 px and a maximum of 216 px.
     - 2,326 of the moved labels (47%) sit nearer a different line than their own. Identical-path parallels are excluded from that count.
     - 1,356 (27%) sit more than 40 px from their own line.
     - This population is denser than a typical dossier diagram, so these rates are not a forecast.
   - [Observed] Concrete failure: a 3×3 bipartite graph (6 nodes, 9 edges, 31-character labels), in a Chrome screenshot.
     - The labels stack in one column in the gap and hide most of the lines.
     - One label moves into the far column, between two target nodes, and reads as a caption of the node below it.
     - Move and own-line distances over a similar 9-edge graph with longer labels reach 240/95 and 176/150 px.
   - [Inferred] The hover echo is the only link at rest, so touch, keyboard and print readers get none. The "Read every component and relationship" list keeps the facts recoverable, and base was worse because labels overprinted. This is an improvement, but the claim "clears" hides a new misattribution.
   - Repair options: draw a thin leader from a moved label to its line, or add a line-distance term or ceiling. Otherwise, disclose the limit to the owner as a trade-off.

2. **`diagram-layout.test.ts:128-200`: the headline claim "least distance" has no test. Grade: revise.**
   - [Observed] These of my mutants survive all three test files:
     - `sideways-first` (dx and dy swapped in the search)
     - `down-only` (never searches up)
     - `step-32` (`LABEL_STEP` 8 to 32)
   - [Observed] Their tests only pin non-overlap, canvas bounds, "stays if clear" and back-edge priority.
   - The docstring's "up and down before sideways" and the commit's "moves the least distance" are therefore unchecked. A single fixture with a literal expected position would kill all three mutants.

3. **`dossier-reading.browser.test.ts:89-92`: the pointer test does not measure the delay it names. Grade: note.**
   - [Observed] It hops the pointer in one CDP call with no crossing time.
   - [Observed] With the delay mutated and the browser test run alone:

     | Delay | Browser test result |
     |---|---|
     | 0 s | killed |
     | .02 s | survived |
     | .1 s | survived |
     | .59 s | survived |
     | 5 s | killed |

   - [Observed] Only the CSS literal in `dossier-reading.test.ts:136` pins `.35s`. The browser test proves "grace is longer than a CDP round trip and shorter than about 600 ms".
   - [Inferred] Whether .35 s is enough for a real crossing is not established. The commit's reader path is more than 500 px on the wide layout.
   - [Unknown] No human pointer timing was measured.

4. **`dossier-site.ts:169`: the grace period has side effects, and no test pins any of them. Grade: note.**
   - [Observed] Moving the pointer from a later term back to an earlier term on one line leaves both entries visible. For the grace period the later term's entry is on top, while the pointer is on the earlier term.
   - [Inferred] Moving into that spot within .35 s holds the wrong entry open and lets the right one close. The same stacking applies to shift-Tab, because focus closes with the same delay.
   - [Observed] During the grace, `elementFromPoint` on the following line returns the entry. It returned plain text 500 ms later.
   - [Inferred] Entries sit inside the term's `<a>`, so a click there in that window goes to the glossary instead of what the reader sees closing over.

5. **`dossier-site.ts:169`: keeping hidden entries laid out adds page bottom height in one case. Grade: note.**
   - [Observed] Measured head against base CSS with a 90-word entry in the page's last block: scroll height on `index.html` is 6323 against 6293 at 1440 px, and 6761 against 6522 at 390 px. That is 239 px of blank scroll on a phone.
   - [Observed] With the fixture's short entries there is no difference on any of 7 pages at either width. No page's `scrollWidth` changed.
   - [Unknown] I did not check a schema limit on entry length.

6. **`diagram-layout.ts:36` and `:152`: two comments now read falsely. Grade: note.**
   - [Observed] Line 36 says "a line never strikes through a node's text or a label". On hover the echo sits in the label layer. A chain-with-skips screenshot shows a dotted echo through "Node 1" and "Node 2", and across earlier labels (later labels cover it).
   - [Observed] Line 152 says a skip label sits "under the neighbouring edge's label". That now holds only where the search leaves it there.
   - The behaviour is defensible because the route is true, but the sentence needs correcting.

7. **`diagram-layout.ts:213-222`: "so it always ends" is conditional. Grade: note.**
   - [Observed] `placeEdgeLabels` never returns when the label is wider than the canvas (301 in 300) or when the slack misses the 8 px grid (299 in 300). A NaN width also hung, by an accident of my argument handling.
   - [Observed] Production looks safe. The widest label is 24 × 7.9 + 12 = 201.6 and the narrowest canvas is 248. That case returned, and a 290-wide label in a 300 canvas also returned.
   - [Observed] Cost is cubic-looking: 50 parallel edges take 46 ms, 200 take 2.2 s, 400 take 19 s. The schemas cap a diagram at 80 edges (`packages/polaris-generation-core/src/draft-model.ts:30`, `packages/polaris-dossier/src/draft-schema.ts:152`), so this is not a live problem.
   - The sentence should state its precondition.

8. **`diagram-layout.ts:265`: the clearance guarantee holds only for the estimated box. Grade: note.**
   - [Observed] A CJK label renders 285 px of text in a 186 px rect, so it overruns the box.
   - The estimator is pre-existing. The new claim "clears every node and label" does not hold for wide glyphs.
   - [Observed] Wide Latin (`W`) fit, at 172 px in 186 px.

9. **Markers are not obstacles. Grade: note.**
   - [Observed] Over the same population, using an approximate marker-centre test, 77 marker covers are new from moved labels and 938 were uncovered. In total, 156 labels cover their own marker (517 at base) and 179 cover another's (630 at base). This is a net improvement.
   - A moved label can still land on an arrowhead and hide direction. The echo draws no arrowhead of its own.

10. **Browser test fixture depends on line wrap. Grade: note.**
    - [Observed] The new `late` sentence is needed. Restoring the old one fails `expect(term.left).toBeGreaterThan(entry.right)` (604 against 703), because the old sentence wraps.
    - [Inferred] That assertion depends on font metrics in `ui-sans-serif`, so another machine's fonts can move it.
    - [Observed] Also, `moved` at `diagram-layout.test.ts:152` counts canvas growth, not moved labels.

Checked and sound

- **Provider bytes.**
  - [Observed] 5,000 random graphs, including empty, CJK, escaped and over-long labels, gave 5,000 byte-identical default-form SVGs against the merge base.
  - [Observed] `layoutDiagram` output is identical on the readable form too.
  - [Observed] `dossier-site.ts:178` adds the theme CSS only when `chrome` is defined.
- **Determinism and canvas.**
  - [Observed] A repeat render was byte-equal. The search has no randomness.
  - [Observed] In the curated runs, growth and bounds matched the tests' invariants, and growth only went downward.
- **Hidden entries.**
  - [Observed] Head and base are identical for tab order (70 stops), `window.find`, selection text, `innerText`, AX tree node count and entry absence, and PDF page count (7 and 2, short and long fixtures).
  - [Observed] The census covers `index.html` only: 14 entries, no overflow ancestor, all inside a claim, no link inside an entry.
  - [Observed] The size report's stripping regex still matches, because the HTML shape is unchanged and the "measures the same" test passes.
  - [Observed] `prefers-reduced-motion` leaves the .35 s delay in place. It is a delay, not motion, so I see no defect. [Inferred]
- **Echo.**
  - [Observed] `assertInertSvg` passes on 400 random graphs in the repo test.
  - [Observed] The echo inherits its marking: dash `6px, 4px` for inferred, `2px, 4px` for unknown, `none` for observed. That matches the legend, so it does not misstate a marking.
  - [Observed] Its colour matches the line, at 3 px against 2 px.
  - [Observed] Cost is about 66 bytes per edge: 15 echoes, 984 bytes, 1.6% of a 62 KB page. At the 80-edge cap that is about 5 KB per diagram. It counts toward `entryPageBytes`, and the fixture declares no budget.
- **Flakiness.**
  - [Observed] The browser test passed 8 of 8 at load about 7, and 6 of 6 with 24 busy loops running (load rose to 32).
  - It is not flaky. Finding 3 is the cost of the same margin.
- **Evidence record.**
  - [Observed] Both subject digests match the files at this commit.
  - [Observed] All 17 recorded mutants were killed on my re-run: 12 by unit tests only, 5 by unit and e2e.
  - The record does not say which test killed each mutant.
- **Other mutants.**
  - [Observed] `display-none-form` was killed by the browser test only, which supports the Chrome 120 comment. Chrome here is 120.0.6099.224.
  - [Observed] `no-left0` survived everything and looks equivalent, because a block-level absolute box's static position is already the block's left edge. [Inferred]
  - [Observed] Three small survivors look harmless: `no-growth-margin`, `top-bound-0`, `note-height-18`.
- **Sweep.**
  - [Observed] Python literal sweep over tracked `.ts`, `.md`, `.mjs`, `.py` and `.json` files with polaris, dossier or diagram in the path, excluding `-RAW.md`, `round-*` and `docs/evidence/`. Literals:
    - `visibility:hidden`, `visibility: hidden`, `display:none`, `display: none`
    - `hidden content`, `layout.height`
    - `strikes through`, `never strikes`, `under the neighbouring`
  - [Observed] A broader `term-pop` and `edge-label` pass found no spec or contract that names these entries or label placement.
  - [Observed] The `display: none` hits in the PWB spec and `polaris-accessible-names.ts` / `polaris-opening-index.ts` define accessible-name populations. They read as another surface. [Inferred]
  - The only false sentences found are in finding 6.

What I ran

- [Observed] `npm ci` in a clone at the subject commit.
- [Observed] `npx vitest run` on the three affected test files: 46 of 46 passed.
- [Observed] `npm run check`: exit 0, 172 files, 3,969 tests.
- [Observed] 21 of my own mutants, with unit and browser tests run separately, plus the 17 recorded ones.
- [Observed] Scratch-only analysis of placement and provider bytes.
- [Observed] Scratch browser experiments on fixture input, with screenshots.
- [Observed] Nothing was committed or pushed, and the clone is clean.

What I did not run

- No provider call, no dossier run and no observed-repository body were read.
- Touch is [Unknown]. `Input.dispatchTouchEvent` did not navigate in either form, `Input.synthesizeTapGesture` errored, and iOS was not tried. No touch-specific CSS exists, so I infer no change on tap, but this is unverified.
- Real screen readers were not run, only the AX tree. Firefox and Safari were not run: the discrete `visibility` delay and hit testing were observed in Chrome 120 only.
- A whole provider-mode page was not compared byte for byte, only the SVG renderer and the CSS gate by reading.
- `npm run check:all` and the governance battery were not run.
