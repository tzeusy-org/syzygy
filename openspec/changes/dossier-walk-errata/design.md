# Design — walk errata (version 2.53)

[Inferred] This is version 2.53 of REQ-polaris-generation-034, for syzygy-3efd.90.

- It is drafted on `agent/syzygy-3efd.90` over walk advice 2.51 (`dossier-walk-advice`, row A-275, tag `polaris-dossier-walk-advice-v2.51`), the newest REQ-034 version on main at `55b963d20`.
- It corrects two statements of the figure walks of version 2.40, both carried unchanged through 2.51.

## D1. The version label, the predecessor and the numbers

- [Observed] 2.52 is claimed by the limits-and-defaults change on open PR #1053 (`agent/syzygy-5dhm.116`, row A-343), which modifies REQ-034 over 2.51. So this change takes 2.53, row A-344 and tag `polaris-dossier-walk-errata-v2.53`. No other open PR or recently pushed `agent/*` branch adds a REQ-034 version or an adoption row above A-343.
- [Observed] Built over 2.51, the newest on main, not over 2.52's unmerged bytes. If 2.52 lands first, the build script is re-run over it with the predecessor path changed, and the wiring is chained after 2.52's binding. Both edits sit at anchors 2.52 would have to change to break: the brief v24 paragraph and the last sentence of the walk rendering paragraph.
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
- **Narrow the pointer to boxes with content** (a badge or a link), the rule 2.50 states for a zoom-only figure's empty boxes: rejected for walked figures.
  - Only withheld, link-less and base-element boxes that no step names would regain the drawing's emphasis and tooltip.
  - One figure would then answer the pointer in two ways: the layer's outline over most boxes, the drawing's own emphasis over a few.
  - It would also need a code change, a new test and a mutation run for a small gain.
- **Accept and state**: chosen.
  - The tooltip's text is the node's label and marking, for example `Client (inferred)`.
  - The node's box in the drawing still shows its label, and its border shows its marking.
  - The figure's list of every component and relationship shows both.
  - A linked box's link also names the label in its visually hidden text.
  - So a pointer user loses a duplicate of text already on the page, not information.
- [Observed] The sentence also says what keeps its tooltips: a figure with no walk, and a box that version 2.50 lets pass the pointer to the drawing. (No `zoom-only` rule is in the code at `55b963d20`; the sentence states 2.50's rule, not code.)

## D4. Composition and bytes

- [Inferred] 2.35 (base elements) and 2.40 (walks): the sentences restate behaviour and add no rule; a base element's box takes the pointer as every other box does.
- [Inferred] 2.50 (view levels): its zoom-only figures keep their pass-through, and the new sentence names it as the exception.
- [Inferred] 2.51 (walk advice): it reads no style and no brief byte.
- [Observed] Bytes: none move. The brief already issues the corrected paragraph, and the walk style rules already give every `.walk-node` `pointer-events:auto` and the hover outline. `dossier-walk.test.ts` pins those rules as its literal `STYLE`.

## D5. Code

- [Observed] None. The brief and the style rules already behave as this text states, each pinned by a literal test: `brief.test.ts` for the paragraph, `dossier-walk.test.ts` for the rules. So `tasks.md` lists no code item, and the provider golden is untouched.

## Review

[Unknown] One independent fresh-context review (CC-REV-4) is arranged by the lead after this package is pushed. Its raw and dispositions will be recorded here.
