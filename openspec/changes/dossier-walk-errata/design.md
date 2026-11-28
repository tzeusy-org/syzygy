# Design — walk errata (version 2.53)

[Inferred] This is version 2.53 of REQ-polaris-generation-034, for syzygy-3efd.90.

- It is drafted on `agent/syzygy-3efd.90` over walk advice 2.51 (`dossier-walk-advice`, row A-275, tag `polaris-dossier-walk-advice-v2.51`), the newest REQ-034 version on main at `55b963d20`.
- It corrects two statements of the figure walks of version 2.40, both carried unchanged through 2.51.

## D1. The version label, the predecessor and the numbers

- [Observed] 2.52 is claimed by the limits-and-defaults change on open PR #1053 (`agent/syzygy-5dhm.116`, row A-343), which modifies REQ-034 over 2.51. So this change takes 2.53, row A-344 and tag `polaris-dossier-walk-errata-v2.53`. No other open PR or recently pushed `agent/*` branch adds a REQ-034 version or an adoption row above A-343.
- [Observed] Built over 2.51, the newest on main, not over 2.52's unmerged bytes. Both edits sit at anchors 2.52 would have to change to break: the brief v24 paragraph and the last sentence of the walk rendering paragraph. The review applied both anchors to #1053's 2.52 spec with main's `brief.ts`: both hold, twelve escapes are found, and the corrected quotation equals `WALK_PARAGRAPH`.
- If 2.52 lands first, this version is rebound over it, mechanically, by these edits:
  - Run the rebuild on a tree that merges main after #1053, never on #1053's head: that head's `brief.ts` predates the walks code and has no `WALK_PARAGRAPH`, so the build's equality assert cannot run there.
  - `walk_errata_build_spec.py`: set its four predecessor constants (`PREDECESSOR`, `PRED_TITLE`, `PRED_VERSION`, `PRED_NAME`) to 2.52's path, title start (`# Dossier cliffs`), version and name; nothing else in the script names the predecessor.
  - `walk_errata_delta.py`: set `PRED`, and the predecessor's version, row and tag in its Composition prose; re-run it.
  - `scripts/check_spec_reconciliation.py`: the `WALKERR_SUBJECTS` digest; `walkerr_binding`'s predecessor (the 2.52 binding in place of `walkadv_binding`) and its docstring; `walkerr_delta`'s predecessor text.
  - `scripts/count_polaris_effective_scenarios.py`: chain the walk errata after 2.52 and add 2.52's count scope to its not-in-force guard; the predecessor figure is 2.52's census.
  - Prose naming "over 2.51": this README, `proposal.md`, this file, `tasks.md`, the row, the `openspec/README.md` index row and the `PROJECT-STATUS.md` census line.
  - Then rebind the row to the new install commit and re-run the three checks in a fresh clone.
- [Observed] The build script (`docs/evidence/syzygy-3efd-90/walk_errata_build_spec.py`) edits the predecessor's bytes at anchors it asserts occur exactly once.
  - It also asserts that the corrected quotation equals the evaluated `WALK_PARAGRAPH` literal in `packages/polaris-dossier/src/brief.ts`, so the spec cannot be rebuilt to differ from what the brief issues.
  - The predecessor hashes to `84ed7449a67e00da17c03ec921e5b419d06f17c1f04df55c0d548abdaa8d62ca`.
- [Observed] REQ-034 keeps its 336 scenarios. No draft schema or brief version is taken.

## D2. The quotation marks of the brief v24 paragraph: corrected

- [Observed] The predecessor writes the brief v24 paragraph with a backslash before each of twelve quotation marks. Those are the only such bytes in the file.
- [Observed] `WALK_PARAGRAPH` issues each as a bare quotation mark, and `brief.test.ts` pins the paragraph "copied from the requirement, its quotation marks unescaped".
- [Observed] Every earlier brief paragraph the spec quotes writes bare quotation marks inside its code spans.
- [Inferred] The bytes are corrected rather than the reading stated. A requirement that quotes a paragraph "which reads" must hold that paragraph's bytes. A reader comparing a brief with the spec should find them equal, without a rule for undoing escapes that applies to one paragraph alone.
- [Inferred] A sentence after the brief statement records the correction, so a reader of an older version's text knows its backslashes were never brief bytes.
- [Observed] The brief's bytes, its version and its digest do not move: the brief already issues these bytes.

## D3. The walk layer over the drawing's tooltips: accepted and stated

[Inferred] The choice is to accept that every box takes the pointer, state the trade-off in the requirement, and change no code. Three options were weighed:

- **Narrow the pointer to the walked boxes** (the step boxes): rejected.
  - Under 2.40 every box whose node is not withheld and has a citation link holds a `walk-source` link, and the link "fills its box and shows the pointer cursor over it".
  - A box that passed the pointer through would leave that link unreachable by the pointer, though still reachable by the keyboard.
  - On a typical walked figure most boxes are not steps, so most of the layer's links would be lost to a pointer user to restore a duplicate.
- **Narrow the pointer to boxes with content** (a badge or a link), unlike 2.50's rule for a zoom-only figure, where every box passes the pointer and only its zoom link takes it: rejected for walked figures.
  - Only withheld, link-less and base-element boxes that no step names would regain the drawing's emphasis and tooltip.
  - One figure would then answer the pointer in two ways: the layer's outline over most boxes, the drawing's own emphasis over a few.
  - It would also need a code change, a new test and a mutation run for a small gain.
- **Accept and state**: chosen.
  - The tooltip's text is the node's label and marking, for example `Client (inferred)`.
  - The node's box in the drawing shows its marking (its border, and ` ?` after an Unknown label) and its label, but not always the whole label: `wrapLabel` cuts a label to at most two lines of at most 22 characters and ends it with an ellipsis.
  - The figure's list of every component and relationship carries the full label and the marking, inside a collapsed disclosure ("Read every component and relationship").
  - A linked box's link also names the full label in its visually hidden text, for assistive technology; a pointer user does not see it.
  - So for a label the box holds whole, a pointer user loses a duplicate of text on the page. For a longer label, the cost is real: the tooltip was the one place in the figure showing it whole, and a pointer user now opens one disclosure to read it. The trade-off is accepted at that cost, and the requirement says so.
- [Observed] The sentence also says what keeps its tooltips: a figure with no walk, save over the mark of a zoom link 2.50 sets on a box, which takes the pointer there. (No `zoom-only` rule is in the code at `55b963d20`; the sentence states 2.50's rule, not code.)
- [Inferred] The sentence describes the 2.40 walk style rules ("As the walk style rules of version 2.40 make every box … take the pointer"); it adds no rule, so no scenario is added. The 2.40 scenario that the page carries the walk rules, and the literal `STYLE` in `dossier-walk.test.ts`, pin those rules.

## D4. Composition and bytes

- [Inferred] 2.35 (base elements) and 2.40 (walks): the sentences restate behaviour and add no rule; a base element's box takes the pointer as every other box does.
- [Inferred] 2.50 (view levels): its zoom-only figures keep their pass-through, and the new sentence names it as the exception.
- [Inferred] 2.51 (walk advice): it reads no style and no brief byte.
- [Observed] Bytes: none move. The brief already issues the corrected paragraph, and the walk style rules already give every `.walk-node` `pointer-events:auto` and the hover outline. `dossier-walk.test.ts` pins those rules as its literal `STYLE`.

## D5. Code

- [Observed] None. The brief and the style rules already behave as this text states, each pinned by a literal test: `brief.test.ts` for the paragraph, `dossier-walk.test.ts` for the rules. So `tasks.md` lists no code item, and the provider golden is untouched.

## Review

[Observed] One fresh-context review (CC-REV-4) read the package at `5461b641d` (spec sha256 `2225d8f3e97c4b5ef41f60e44f2c2bb0158dc5346766be61d3693104aad5ab9d`). Its raw is stored verbatim at `docs/reviews/syzygy-3efd-90/R-WALK-ERRATA-SPEC-1-RAW.md` (sha256 `694af7b209755c052d2c209fedc67ce7fa8c7da0dbe51e99d249b370bbf2e476`), and its verdict is `REVISE`: one blocking finding and four notes. All five were repaired in one round, and no confirmation round was run (D10: one review, gating nothing). The repaired spec hashes to `bdbb3ff63653cff507976110c410da493eddd50ae36d75434869d1c5f6015393`.

- Finding 1 (blocking), "the label stays shown" is false for long labels: repaired.
  - The spec sentence now says that the drawing's box shows the marking and the label, or its first lines ending in an ellipsis where the label is longer than the box holds, and that the full label and marking stay in the figure's list behind that list's disclosure.
  - D3 says the same, and names the cost a pointer user pays for a long label: one disclosure to open. Row A-344's summary is corrected to match.
  - Accepting the trade-off stands.
- Note 2, the description of 2.50: repaired.
  - D3 now describes 2.50's rule as "every box of a zoom-only figure passes the pointer; only its zoom link takes it".
  - The spec clause that added nothing now reads "A figure with no walk keeps its tooltips, save over the mark of a zoom link that version 2.50 sets on a box".
- Note 3, four off-by-one design references: repaired.
  - In the build script's docstring the quotation marks are D2 and the trade-off is D3.
  - In `proposal.md` the literal tests are D4 and D5, and the non-goal is D3.
  - In `SEMANTIC-DELTA.md` (through `walk_errata_delta.py`) the bytes are D4.
  - Row A-344 cites D3.
- Note 4, the rebinding plan: repaired.
  - D1 lists every edit a rebind over 2.52 makes, and says the rebuild runs on a merged tree, never on #1053's head.
  - The build script now names its predecessor in four constants and nothing else.
- Note 5, whether the pointer sentence is normative: repaired as description.
  - The sentence now opens "As the walk style rules of version 2.40 make every box of a walk's layer take the pointer".
  - It adds no rule and no scenario line, so the scenario bytes and the census (336 for REQ-034, 657 in all) do not move. D3 says this.
