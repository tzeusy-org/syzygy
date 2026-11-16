Verdict: REVISE
Reviewed commit: 49e367779b5a1386416d212cb081d6d34a2d8e06 (`agent/syzygy-pdja.8`), compared with round 1's e2813e7d9243f8a221ce8c1388235a286fac618a and merge base 4dff92823a3ff26acf1923404de52d462b06c8cb.

No finding is blocking. Three findings are graded revise: round 1's finding 1 is only partly closed, the "own line" claim has no test, and round 1's finding 2 is closed as asked but leaves the same claim class open. The rest are notes.

Findings

1. **`diagram-layout.ts:294-295`: in a large share of moved labels, the leader runs under another line's label, so the misattribution remains. Grade: revise.**
   - [Observed] The leader takes the nearest point on the label's own line, whether or not that point is visible. The search has just pushed the label off an obstacle, so that point is often under the label that displaced it. The leader draws in the line layer, under every label and node, so the reader sees a stub running into the wrong label.
   - [Observed] Walking each leader outward from its own label, to the first thing that covers it (5 seeded populations, my own generators):

     | Population | Moved | Label on own line, leader hidden | Visible to own line | Into a parallel sibling's label (same curve, benign) | Into a different line's label | Under a node first |
     |---|---|---|---|---|---|---|
     | Random dense, 3,000 graphs | 4,820 | 773 | 988 | 1,347 | **1,624 (34%)** | 88 |
     | Layered DAG, no parallels, 3-10 nodes, 3,000 graphs | 2,178 | 755 | 661 | 0 | **759 (35%)** | 3 |
     | Bipartite fans, 2,000 graphs | 5,616 | 1,489 | 1,549 | 0 | **2,511 (45%)** | 67 |
     | Chain plus back edges, 2,000 graphs | 629 | 15 | 2 | 478 | 125 (20%) | 9 |
     | Band chains with parallels, 1,500 graphs | 2,851 | 369 | 18 | 2,153 | 36 (1%) | 275 (10%) |

   - [Observed] Round 1's harm case is a moved label nearer a different line than its own. There the wrong-label outcome is 650 of 1,275 (51%) on the DAG population and 2,264 of 3,786 (60%) on fans. Only 394 and 1,022 of those reach their line visibly.
   - [Observed] In a separate seeded run, the leader ends under the other label and never re-emerges in 285 of 719 such cases (DAG) and 2,769 of 3,582 (fans).
   - [Observed] Concrete failure: round 1's 3×3 bipartite shape in a Chrome screenshot, with my own short labels.
     - "evicts stale" (Worker→Cache) has leader `M 323 140 L 323 172`, ending under "publishes changes ?" (Api→Bus).
     - The reader sees a short stub joining two labels. The first is inferred, the second unknown.
     - The same graph also has one clean leader and one hidden under its own label.
     - A clean case exists too: "sends" in a 6-node fan reads well, so the device works when its end is visible.
   - [Observed] Even "visible to own line" is not always clean. On the DAG population, 64 of 661 cross another line, and 327 of 661 end within 5 px of another line.
   - [Observed] 277 of the DAG's moved labels show under 6 px of leader before the first cover. That is too short to read as a line, or to show a 6-on, 4-off dash.
   - [Observed] Repair feasibility: ending at the nearest point on the own line that is outside every label and node, with a straight run clear of other labels and nodes, exists for 454 of 719 (63%, DAG) and 2,534 of 3,582 (71%, fans). Median length is 98 and 50 px. The remainder has no such point, and would need a different placement or an owner-disclosed limit.
   - [Inferred] Leaders improve on round 1, where nothing linked a moved label to its line at rest. The "Read every component and relationship" list keeps the facts recoverable. Real-dossier rates are [Unknown]: these graphs are synthetic, and the label mix is mine.

2. **`diagram-layout.test.ts:167-187`: "a point on its own line" has no test. Grade: revise.**
   - [Observed] The fixture's two parallel edges share one curve whose midpoint is the label's first place, so it cannot tell its own line from the neighbour's. These mutants survive all three test files:
     - `leader-to-neighbour-line` (`layout.edges[0]!.d`): changes 361 of 500 graphs.
     - `leader-to-first-place` (`{x: at.labelX, y: at.labelY}`): changes 372 of 500. This one can end off the line entirely, for a skip or back-edge label.
     - `leader-samples-2` and `leader-samples-8`.
     - `leader-x-only-moved` (a label moved only sideways gets no leader).
   - [Observed] The recorded `leader-to-start` mutant is killed, so the record reads stronger than the pin. The sentence this repair exists for is unchecked.
   - A fixture with two different curves, or a property over the random population (end on own curve, start in own label), would kill these.

3. **`diagram-layout.test.ts:158-165`: the three named mutants die, but the test's own title claims more than it pins. Grade: revise.**
   - [Observed] `sideways-first`, `down-only` and `step-32` are all killed, by this test alone. `down-before-up` is killed too. Round 1's finding 2 is closed as written.
   - [Observed] These survive all three test files:
     - `step-24` (differs on 476 of 500 graphs), `step-6` (447 of 500) and `step-12` (not measured).
       - The fixture needs 19 px, and 24 is a multiple of 6, 8, 12 and 24, so "an eight-pixel step" is not pinned.
     - `across-reversed`, which tries sideways before up and down within a ring (3 of 500).
       - At ring 3 the fixture's sideways candidates cannot clear the pebble, so "both before sideways" is pinned only across axes, never within a ring.
     - `left-before-right` (7 of 500).
     - `skip-diagonals` (not measured).
   - [Inferred] A pebble needing a distance that only 8 divides, plus one fixture where a ring holds both a straight and a diagonal candidate, would close these.
   - [Inferred] Rings are Manhattan: `(2,2)` steps, about 2.83 away, comes after `(0,3)`, 3 away. So "least distance" at `diagram-layout.ts:220` holds only in that metric. Docstring note.

4. **`diagram-layout.ts:293`: a label left in place can still be far from its line, or sit on another line, with no leader. Grade: note.**
   - [Observed] In a typical mixed population, 2,669 of 16,377 unmoved labels have no contact with their own line and sit over 40 px from it: 2,241 skip labels and 428 back-edge labels. Dense random: 8,207 of 22,441.
   - [Observed] In the bipartite screenshot, "publishes changes ?" (Api→Bus) stays put on Worker→Cache's straight line, and reads as that line's label. Its own curve does pass through it.
   - This is pre-existing and outside "moved", but it is the same harm, and the leader's rule cannot reach it.

5. **A leader can read as a line from a node, and the legend does not explain it. Grade: note.**
   - [Observed] Its first cover is a node in 275 of 2,851 band-parallel leaders, and 88 of 4,820 dense ones.
   - [Observed] It emerges on both sides of a node in 50 of 4,887 dense and 10 of 5,443 typical leaders.
   - [Inferred] It has no arrowhead and is 1 px against the line's 2 px, so reading it as a relationship between two nodes is unlikely. A stub between a node and a label does suggest the label belongs to that node.
   - [Observed] The marking is inherited correctly: `svg .inferred>path` and `svg .unknown>path` reach the direct child, and an unknown leader ends at its own unknown line. So I found no false epistemic claim.
   - [Observed] "Line styles" lists solid, dashed and dotted, with nothing for a thin leader. An observed edge's leader is a solid line.
   - [Inferred] `g.edge:hover path` outranks the leader rule, so hovering a line thickens the leader to 3 px. Not run.

6. **`label-and-pointer-mutants-2026-11-07.json`: the `ranAt` commit exists only locally. Grade: note.**
   - [Observed] Both subject digests match at the reviewed commit and at `ranAt`. Every recorded `old` fragment occurs exactly once.
   - [Observed] All 24 of 24 recorded mutants were killed on my re-run.
   - [Observed] `6314696e` exists as an object in the worktree, but `git branch -a --contains` lists nothing, and the GitHub API answers 422 "No commit found". Its parent is e2813e7d, and it differs from the reviewed commit only in this record.
   - [Inferred] It will be collected eventually, and no remote reader can check out it. The digests still bind the subject, so this is not a false record. Its parent plus a stated "subject bytes unchanged" would survive.
   - [Observed] The record still does not say which test killed each mutant (round 1's observation).

7. **`diagram-layout.ts:202-214`: 33 samples are coarse on a long curve. Grade: note.**
   - [Observed] `len − true nearest` has a median of 0-0.1 px, and a maximum of 26.2 px in the dense population.
   - [Observed] Leaders whose end sat over 0.3 px from a 3,000-sample curve: 16, all in the dense population. [Inferred] That is the spacing of my measuring samples on long curves, since the leader's end is computed on the curve.
   - The end stays on the line, so this costs only a slightly slanted leader.

Checked and sound

- **Path parsing.** [Observed] All 87,307 laid-out paths across the populations match `M x y C x y, x y, x y` with 8 numbers, including band hand-offs (1,500 graphs), self-loops and back edges. `nearestOnEdge`'s parsing fits every form `layoutDiagram` emits. No exponent form occurred.
- **Back edges and self-loops.** [Observed] 95 self-loop labels moved in the dense population. No non-self back-edge label moved in any population, so its leader went unexercised in my runs. I did not classify self-loop leaders separately.
- **No spurious leaders.** [Observed] Over 6,000 graphs: 0 leaders on an unmoved label and 0 moved labels without one. `moved`'s exact float compare did not misfire.
- **Provider and draft-preview form.**
  - [Observed] 6,000 of 6,000 `renderDiagramSvg` default-form outputs are byte-identical to the merge base, including empty, CJK, escaped and over-long labels, with 0 leaders.
  - [Observed] With leaders stripped, 3,000 of 3,000 readable-form outputs are identical to round 1's commit. So the repair adds leaders and moves nothing.
  - [Observed] By reading, `dossier-site.ts:178` adds the theme CSS only when `chrome` is defined.
- **The `loop` fixture.**
  - [Observed] Removing the parallel edge fails exactly 1 of 49 tests, at the browser test's leader query (`getComputedStyle` on null).
  - [Observed] Nothing else passes only because of it. It supplies the case for the leader's colour and width assertions, and its added edge weakens no other assertion I found.
  - [Observed] The fixture's own leader case is a same-curve parallel, which is why finding 2 stays open in the browser test too.
- **Comments.** [Observed] The corrected comments at `diagram-layout.ts:37`, `:154` and `:222` now match the behaviour I measured.

What I ran

- [Observed] `npm ci` in a clone at the subject commit. The clone is still clean at 49e36777.
- [Observed] `npx vitest run` on `diagram-layout.test.ts` and `dossier-reading` (all): 3 files, 49 of 49 passed. The browser test ran, 0 skipped.
- [Observed] `npm run check`: exit 0, 172 files, 3,972 tests.
- [Observed] 16 mutants of my own, the 24 recorded mutants, a fixture reversion, and differential runs over 500 graphs for six survivors.
- [Observed] Scratch-only geometry analysis over 11,500 classified graphs, plus the 6,000 and 3,000 byte-comparison graphs and a further 6,000 graphs for the separate seeded and typical runs.
- [Observed] Two Chrome screenshots of renders with the real `DRAFT_PREVIEW_CSS` and `DOSSIER_THEME_CSS` (not `DOSSIER_CSS` or `LOCAL_CSS`).

What I did not run

- No provider call, no dossier run, and no observed-repository body was read.
- A whole provider-mode page was not compared byte for byte, only the SVG renderer, and the CSS gate by reading.
- Human reading of the diagrams is [Unknown]. My classes are geometric, and "reads as" statements are [Inferred] from them and from the two screenshots.
- Real-dossier diagrams were not measured, so rates on real diagrams are [Unknown].
- Hover on a leader, touch, screen readers, print, Firefox and Safari were not run.
- `npm run check:all` and the governance battery were not run.
- Round 1's notes 3, 4, 5, 8, 9 and 10 were not re-opened. Placement is byte-identical to round 1 (above), so the repair did not worsen the placement-based ones, 8 and 9. Notes 3, 4, 5 and 10 sit in code the repair did not change.
