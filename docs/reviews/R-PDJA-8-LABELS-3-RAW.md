Verdict: REVISE
Reviewed commit: f65fe8b2a07080f5d259194053e7449253a33ccb (`agent/syzygy-pdja.8`), compared with round 2's 49e367779b5a1386416d212cb081d6d34a2d8e06 and merge base 4dff92823a3ff26acf1923404de52d462b06c8cb.

Round 2's findings 1, 2 and 3 are closed as written. The stub into a wrong label is gone, but the same misattribution survives in two other forms. Findings 1 and 2 below grade revise. No finding is blocking. The repair is an improvement on round 2, and I found no regression against the merge base.

Status of round 2's revise findings

- **Round 2 finding 1: closed as written.** [Observed] Over 4,976 leaders in five populations, none ended under a label or node, and none ran under one (0.2 px tolerance, 201 samples per run). The residual harm is in my findings 1 and 2.
- **Round 2 finding 2: closed.** [Observed] `leader-to-first-place`, `leader-neighbour`, `leader-samples-2` and `leader-samples-8` are all killed, the first test to fail in each being `diagram-layout.test.ts:189`.
- **Round 2 finding 3: closed.** [Observed] `step-24`, `step-6`, `step-12`, `across-reversed`, `left-before-right` and `skip-diagonals` are all killed at `diagram-layout.test.ts:158`. See note 5 for that test's title.

Findings

1. **`diagram-layout.ts:222` and `:232`: the PR's limit gives a false cause, and the labels it covers can state a false relationship. Grade: revise.**
   - [Observed] The PR says some moved labels have no leader "because every point of their line is covered". Over every population I ran, 0 such labels had a fully covered line. That is 0 of 4,589 in the first six, plus 0 of 922 in the dedupe and realistic runs (480 samples per curve).
   - [Observed] The actual cause is that every run starts at the label's centre. Wide labels stack 4 px apart, so a neighbouring label or node blocks most rays from the centre. Only 29 of those 4,589 had any clear centre run even at 480 samples.
   - [Observed] Concrete failure, 5 nodes and 5 edges, no parallels, Chrome screenshot with the real `DRAFT_PREVIEW_CSS` and `DOSSIER_THEME_CSS`:
     - "renders pages for" (Router→Cache) sits on the Router→Worker line, just before its arrowhead, at x 250.9, y 161.5.
     - It has no leader. Its own straight line runs at y = 112, and 481 of 481 samples of that line are visible.
     - Read at rest, the diagram says Router renders pages for Worker. The relationship does not exist.
   - [Observed] A plausible-shape population (3,000 graphs, 4-8 nodes, a tree plus 0-2 extra edges, no parallels, realistic labels of 4-20 characters; 16,930 labels):

     | Measure | Count |
     |---|---|
     | Moved labels | 869 |
     | With a leader | 299 |
     | Against their own line | 148 |
     | Neither | 422 (49% of moved) |
     | Of the 422, sitting on another line's visible stretch | 332 |
     | Of the 422, nearer another line than their own | 413 |
     | Graphs with at least one label on another line and not its own | 326 of 3,000 (11%) |

   - [Observed] Repair feasibility: starting the run at a point on the label's edge (17 samples per side) gives a run clear of every other label and node for 400 of those 422. I did not render or test that repair. The same check gives 100% on DAGs of 26-character labels, and 76-82% on my mixed and fan populations, with a median length of 22-75 px depending on the population.
   - [Observed] The PR's figures re-measure in kind:

     | Population | PR | Mine |
     |---|---|---|
     | 26-character | 454 of 1,577 | 477 of 1,865 (of 9,857 labels) |
     | 5-character | 1 of 1,211 | 23 of 1,389 |
     | Sparse | 28 of 553 | 13 of 531 |

     - For the sparse row I read "at most one edge per node" as one outgoing edge per node. Under one outgoing and one incoming edge per node, I got 0 moved labels of 5,267.
     - The PR publishes neither edge density nor seed, and the evidence record holds no such measurement, so its figures cannot be re-derived exactly.
   - [Observed] The PR calls landing on another line pre-existing only for a label left in place. It says nothing of a moved label doing so.
   - [Inferred] These labels did not get worse against the merge base, where they overprinted, and hover and the "Read every component and relationship" list keep the facts recoverable. The failure is still misleading at rest, not merely unassisted. The false cause also tells a reader that nothing can be done.
   - Repair: either start the run from the label's edge, or at least correct the stated cause and state the on-another-line case. Real-dossier rates are [Unknown].

2. **`diagram-layout.ts:232-233`: a leader can end on a stretch of its own line that overlaps another line, so it visibly ties the label to that line. Grade: revise.**
   - [Observed] Concrete failure, Chrome screenshot of 6 nodes and 7 edges: "loads config from" (Router→Worker) has leader `M 324 288 L 734.7 172`, 427 px long.
     - Its straight line passes behind the Cache node and comes out collinear with the Cache→Worker line.
     - The leader ends there, so the picture ties the label to Cache→Worker.
     - The end is "a visible point of its own line" as the code means it, and the reader cannot tell the two lines apart.
   - [Observed] On the plausible-shape population, 50 of 299 leaders (17%) end within 1.5 px of a different curve, 49 of them away from any node. For 5-character labels it is 227 of 814; for 26-character labels, 47 of 232.
   - [Observed] For 21 of the 50, the same line has another visible point with a clear centre run, at least 3 px from every other line. The other 29 have none under that rule.
   - [Inferred] The overlap of skip lines behind nodes is pre-existing, but this repair's search selects those points and draws a line to them. This is round 2 finding 1's misattribution, reached through a line rather than a label.
   - Repair: prefer a point not shared with another line, and disclose or omit the leader where none exists. Real-dossier rates are [Unknown].

3. **`diagram-layout.ts:318`: the claim that a sideways-only move is unreachable in practice is false. Grade: note.**
   - [Observed] Sideways-only moved labels:

     | Population | Sideways-only of moved | With a leader |
     |---|---|---|
     | 5-character DAG | 383 of 4,745 (8%) | 196 |
     | Fans | 66 of 3,776 | 55 |
     | 26-character DAG | 34 of 5,315 | 18 |
     | Mixed | 3 of 1,900 | 1 |
     | One outgoing edge per node | 0 of 531 | 0 |

   - [Observed] Round 2's dropped mutant, re-run as `moved-y-only` (`const moved = y !== at.labelY;`), survives all three test files.
   - [Inferred] The failure would be a missing leader, so it is unassisted, not misleading. The rare case is real on dense short labels and nearly absent on long ones. A small fixture would pin it.

4. **`diagram-layout.ts:232-233`: leader length has no bound and most leaders cross a line. Grade: note.**
   - [Observed] On the plausible-shape population, the median is 99 px, 44 of 299 exceed 200 px, 8 exceed 400 px and the longest is 502 px. On the 5-character DAG, 51 of 814 exceed 400 px and the longest is 1,314 px.
   - [Observed] 210 of 299 leaders cross at least one other distinct line. The PR claims clearance only from labels and nodes, so this does not contradict it.
   - [Inferred] A long thin solid line without an arrowhead, absent from the legend, adds to round 2's note 5. Screenshot case: finding 2's leader.
   - [Observed] A leader's end can also land close to another label: within 1 px for 17 of 601 (mixed) and 49 of 478 (fans). The own line usually continues visibly there. Under 12 px of visible own line and within 3 px of another label occurred in 0 of 601 and 12 of 478.

5. **`diagram-layout.test.ts:158`: the test title's "diagonally last" is not what the search does. Grade: note.**
   - [Observed] `diagram-layout.ts:256-257` tries, at ring 2: (0,-2), (0,2), (1,-1), (1,1), (-1,-1), (-1,1), (2,0), (-2,0). So diagonals precede same-ring sideways moves, and the title's claim is false as an order.
   - [Observed] The fixture leaves only a diagonal open, so it pins that diagonals are searched, not when. The docstring at `:239-242` is accurate on what it states: a ring counts steps across plus steps down, and "up, then down, before sideways" holds.

6. **Own mutants that survive on no stated claim. Grade: note.**
   - [Observed] `others-no-notes` survives. The code clears a node's note, and `diagram-layout.test.ts:198` builds blocks without it, so that part of `:319` is untested.
   - [Observed] `seg-delta0-always-slab` and `seg-touch-enters` survive. Each can only make the code refuse more runs, or differ exactly on a box's boundary.
   - [Observed] `near-only-120`, `tie-last`, `min-run-5`, `min-run-10`, `samples-32` and `samples-128` also survive. The code states no such thresholds in prose beyond the constants.
   - [Observed] Killed: `seg-vertical-noblock`, `others-no-nodes`, `others-no-labels`, `others-earlier-only`, `others-unplaced`, `near-only-40`, `first-visible`, `nearest-by-centre`, `min-run-1`, `min-run-30`, `from-label-top`, `contact-by-centre` and `moved-leader-first-only`.

Checked and sound

- **`segmentEntersBox` geometry.** [Inferred, by reading] A vertical or horizontal run along a box's edge does not enter it, and a touch at a corner or endpoint does not enter it. [Observed] A real vertical run is pinned: `seg-vertical-noblock` is killed. A leader's zero-length case cannot occur, because a sample nearer than 6 px returns undefined first (`:231`).
- **Contact.** [Observed] 0 labels that got "against own line" had that contact only at covered points (first five populations with moved labels).
- **Spurious leaders.** [Observed] 0 leaders on an unmoved label, in the same five populations.
- **Determinism.** [Observed] Two renders of each of 6,000 readable-form graphs were byte-identical.
- **Provider and draft-preview form.**
  - [Observed] 6,000 of 6,000 default-form SVGs are byte-identical to the merge base, including CJK, escaped, empty and over-long labels, with 0 leaders and 0 echoes.
  - [Observed] `draft-preview.ts` has no diff. The `dossier-site.ts` CSS change is inside `DOSSIER_THEME_CSS`, added only when `chrome` is defined (`:178-179`). `READABLE_SPACING` is gated at `:442`.
- **Evidence record.**
  - [Observed] Both subject digests match at the reviewed commit. `ranAt` fc8e550d is the subject's parent and differs from it only in this record and the campaign file.
  - [Observed] Every `old` occurs exactly once, and every mutated file has 0 TypeScript syntax diagnostics (`transpileModule`), so no kill comes from a syntax error.
  - [Observed] All 38 of 38 were killed on my re-run. Five include a runtime `TypeError`-class failure among their failures. I checked only the first failure for those, not whether each has an assertion kill too.

What I ran

- [Observed] `npm ci` in a clone at the subject commit, under `/tmp/claude-996/-home-orca-orca-projects-syzygy/2521ee96-232a-47bb-8d46-79eeeed3789c/scratchpad/p8r3`. It is still clean there.
- [Observed] `npx vitest run` on `diagram-layout.test.ts` and `dossier-reading`: 3 files, 50 of 50 passed, the browser test included.
- [Observed] `npm run check`: exit 0, 172 files, 3,973 tests.
- [Observed] 38 recorded and 23 own mutants, each against those three test files.
- [Observed] Scratch-only geometry analysis over seeded populations (about 22,500 graphs in all, my own generators), the 6,000-graph byte comparison, and two Chrome screenshots of the cases in findings 1 and 2.

What I did not run

- No provider call, no dossier run, and no observed-repository body was read.
- A whole provider-mode page was not compared byte for byte, only the SVG renderer, with the CSS gate by reading.
- Real-dossier rates are [Unknown]; every population is synthetic and the realistic-label mix is mine. Human reading is [Unknown]; "reads as" statements are [Inferred] from geometry and my two screenshots.
- The edge-start repair in finding 1 and the unshared-point repair in finding 2 were measured for feasibility, not implemented.
- Hover on a leader, touch, screen readers, print, Firefox and Safari were not run.
- `npm run check:all` and the governance battery were not run.
- Earlier rounds' notes were not re-opened, except where note 4 adds to round 2's note 5.
