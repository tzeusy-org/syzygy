Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 170b306e4e84d5a279612ab7cbce9438dfec910b (`agent/syzygy-pdja.8`), compared with round 3's f65fe8b2a07080f5d259194053e7449253a33ccb and merge base 824ae2659a7cdd8117a56f9fe4e57ae87bc952b0.

Round 3's two revise findings are closed as written. The repair has one residual misattribution path. I grade it revise but not blocking, because the rate is low and hover and the relationship list keep the facts recoverable. I found no regression against the merge base.

Status of round 3's revise findings

- **Finding 1 (false cause, centre-start runs): closed.**
  - [Observed] Runs now start from 68 points on the label's edge (`diagram-layout.ts:246-250`). The PR body now states the true cause and the case of a label sitting on another line.
  - [Observed] Population T (definitions under "What I ran"): 108 of 1,152 moved labels have neither a leader nor contact with their own line (9%). Round 3 found 49%. Of the 108, 56 sit on another line.
  - [Observed] The PR's own figure is 104 of 849 (12%), so it re-measures in kind. Its seed is in no record, so it cannot be re-derived exactly, and the PR says so.
- **Finding 2 (end on a shared stretch): closed as written.**
  - [Observed] Over 4,392 leaders in four populations, 0 end within 1.5 px of another line's centre (400-segment polyline per curve).

Findings

1. **`diagram-layout.ts:244`: the shared-point test measures centre lines, not the drawn strokes or arrowheads. A leader can still end inside another edge's arrowhead or touching its stroke. Grade: revise.**
   - [Observed] Edges draw at `stroke-width:2` and the leader at 1. The marker is `markerWidth 8` in stroke units, which makes the arrowhead about 16 px long and 16 px wide. `LEADER_SHARED = 1.5` only stops the two centre lines from overlapping.
   - [Observed] Concrete failure, from a Chrome screenshot with the real `DRAFT_PREVIEW_CSS` and `DOSSIER_THEME_CSS` (population T, graph 480, edge 4):
     - "calls on ca" labels the skip edge `M 624 52 C 1123 52, 1123 112, 1622 112`.
     - Its leader is `M 773.5 72.1 L 807.7 55.2`. It ends 3.2 px below edge 2 (`M 624 52 … 822 52`, labelled "loads api on wri"), inside edge 2's arrowhead, at the node that edge 2 enters.
     - Read at rest, the leader ties "calls on ca" to the arrow into the next node. Its own edge runs on under that node to a node about 800 px further right.
   - [Observed] Rates by population:

     | Population | Leaders | End inside another edge's arrowhead | End 1.5-2 px from another line's centre (strokes touch) | Within 3 px |
     |---|---|---|---|---|
     | T | 445 | 8 | 0 | 43 |
     | D26 | 567 | 0 | 20 | 49 |
     | D5 | 1,089 | 7 | 108 | 232 |
     | G | 2,291 | 34 | 275 | 585 |

   - [Observed] The touching cases I rendered (G graph 1, edge 11) end on a fan of lines leaving one node. They are ambiguous rather than plainly wrong.
   - [Inferred] Any rule that compares centre lines alone will keep this gap. Testing the end against each other edge's stroke half-width plus the leader's, and against its arrowhead triangle, would close it. Real-dossier rates are [Unknown].
2. **`diagram-layout.test.ts:213-216` pins a weaker bound than the code, and parts of the run search are unpinned. Grade: note.**
   - [Observed] The test requires more than 1 px, measured to the vertices of a 2,000-sample curve. The code uses 1.5 px to segments.
   - [Observed] My mutants that survive all three test files:
     - `shared-1.01` (`const LEADER_SHARED = 1.01;`)
     - `no-back-others` (adds `&& !layout.edges[j]!.back` to the `curves.filter` at `:340`, so back-edge lines are never treated as shared)
     - `stops-1` and `stops-2` (`LEADER_EDGE_STOPS` set to 1 or 2)
     - `starts-tb-only` (`starts.push` keeps only the top and bottom edges)
   - [Observed] Killed: `shared-0.5`, `no-sort`, `same-d-included`, `vertex-only`, `later-others-only`, `seg-clamp-off`, `others-no-nodes`.
   - [Inferred] `stops-*` and `starts-tb-only` mean "shortest run from the edge" rests on one literal fixture (`:244`).
3. **`diagram-layout.ts:243-252`: cost is about ten times round 3's at the schema cap. Grade: note.**
   - [Observed] For each moved label, the end filter does about 65 × (E−1) × 64 segment-distance computations, and the search sorts 4,420 candidate runs.
   - [Observed] 80 edges, 5 graphs per shape, seed 31337, same machine:
     - Worst render is 341 ms at this commit and 67 ms at f65fe8b2 (40 nodes, 24-character labels).
     - Every other shape is 111-307 ms here and 15-21 ms at f65fe8b2.
   - [Inferred] Rendering is offline and per page, so this is tolerable. A page with several diagrams at the cap could take seconds.
4. **The PR body and test titles describe the old end rule. Grade: note.**
   - [Observed] The PR's "Edge labels" bullet says the leader runs "to the nearest point of its own line it can see". The test title at `diagram-layout.test.ts:238` says the same.
   - [Observed] The code takes the shortest edge-to-curve run to a point that is clear of other lines. The PR's limit bullet states that rule correctly.

Checked and sound

- **Start of a leader.** [Observed] 0 of 4,392 leader starts lie inside another label or node, and 0 leaders were drawn on an unmoved label.
- **Running along another line.** [Observed] No leader stays within 1 px of another line's centre for 8 px or more in T. In G, 94 of 2,291 do, and in my G graph 33 render that becomes a convergence near the end, as in finding 1. Crossing other lines remains round 3's note 4.
- **Determinism.** [Observed] 0 differences on a second render of 1 in 10 graphs across all populations (700 graphs).
- **Provider and draft-preview forms.**
  - [Observed] 6,000 of 6,000 default-form SVGs are byte-identical to the merge base, with 0 leaders and 0 echoes. That run used seed 99173, 1-14 nodes, 0 to 3n edges, and CJK, escaped, empty, 200-character and wrapping labels.
  - [Observed] `draft-preview.ts` has no diff against the merge base. `dossier-site.ts` is unchanged since f65fe8b2.
- **Sideways move (round 3 note 3).** [Observed] The test now counts it (`:203`, `:235`), and `leader-y-only` is killed.
- **Evidence record.**
  - [Observed] Both subject digests match at 170b306e.
  - [Observed] `ranAt` 64a3eeb1 is an ancestor of 170b306e and differs from it only in the record and the campaign file.
  - [Observed] Each of the 39 `old` fragments occurs exactly once. All 39 mutated files have 0 `transpileModule` diagnostics, and all 39 are marked killed. I did not re-run the recorded 39, only my own 14.
- **Battery.**
  - [Observed] `npx vitest run` on `diagram-layout.test.ts` and `dossier-reading`: 3 files, 50 of 50 passed, the browser test included.
  - [Observed] `npm run check`: exit 0, 172 files, 3,973 tests.

What I ran

- [Observed] `npm ci` in a clone at the subject commit: `/tmp/claude-996/-home-orca-orca-projects-syzygy/2521ee96-232a-47bb-8d46-79eeeed3789c/scratchpad/p8r4`. It is clean after the mutants.
- [Observed] Populations. All use `seed = (seed·1103515245 + 12345) mod 2^31`, with labels cut to length from a fixed 20-word list.
  - **T**: seed 4242, 3,000 graphs, 4-8 nodes, a tree (each node links to a random earlier one) plus 0-2 extra non-self edges, labels of 5-17 characters.
  - **D26 / D5**: seeds 777 / 778, 1,500 graphs each, 3-10 nodes, 2 to 2n+1 random edges (loops and parallels allowed), labels of 26 / 5 characters.
  - **G**: seed 909, 1,000 graphs, 6-14 nodes, n to 2n forward edges, labels of 4-24 characters.
- [Observed] Measures: arrowheads modelled from the marker geometry (scale 1.6, tip at refX). Three Chrome 120 screenshots: T graph 480, G graph 33, G graph 1.
- [Observed] 14 own mutants, each against the three test files, the evidence-record checks above, and the cap timing against bundles of this commit and f65fe8b2.

What I did not run

- No provider call, no dossier run, and no observed-repository body or dossier output was read.
- `npm run check:all` and the governance battery.
- Real-dossier rates are [Unknown]. Every population is synthetic. Human reading is [Inferred] from geometry and three screenshots.
- Hover on a leader, touch, print, screen readers, Firefox and Safari.
- Earlier rounds' notes were not re-opened.
