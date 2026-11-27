Subject: openspec/changes/dossier-figure-walks/ (REQ-polaris-generation-034 version 2.NN, figure walks, over figure plan 2.33)
Spec sha256: 43351085eb605afa3ef9ded77490656b0389a0a16f604d2fc8b3cc75467b30a7
Verdict: REVISE
Reviewed commit: b4c19f825

# R-FIGURE-WALKS-SPEC-1 — fresh-context specification review

Reviewer: independent fresh-context session, read-only, detached worktree at `b4c19f825`.
Predecessor: `openspec/changes/dossier-figure-plan/proposed/polaris-generation/spec.md`, sha256 `8ae85a0b259825a13d5628b939cebf46e002fb72a671117f8685fc7c44016a3c` (recomputed).
Line numbers below are of the new `proposed/polaris-generation/spec.md` (abbreviated `spec.md`) unless another file is named.

## What was run

- [Observed] `python3 scripts/check_spec_reconciliation.py --check`: "7 of 7 predicates without FAIL; PASS"; R6 WARN is the two pre-existing PWB pins (syzygy-2g0d), unrelated.
- [Observed] `python3 scripts/count_polaris_effective_scenarios.py`: "TOTAL: 39 requirements, 579 scenarios", equal to PROJECT-STATUS.md. Correct while the change is pending (effective REQ-034 is still 2.33's).
- [Observed] `walk_build_spec.py . <out>` reproduces `spec.md` byte for byte (`cmp` silent). `walk_delta.py .` regenerates `SEMANTIC-DELTA.md` with no diff.
- [Observed] Scenario census: 232 in the predecessor, 241 in the new text (`^#### Scenario`). By an independent split (blocks cut at the next `#### Scenario` or `Form:`), all 232 predecessor blocks are byte-identical and are the first 232 of the new text.
- [Observed] `diff` predecessor vs new: changes at file lines 1, 3, 40 (brief and schema lists), 240–249 inserted (five paragraphs), 1621–1674 inserted (nine scenarios), 1677–1679 and 1681 (Form lines). Nothing else moves. Older drafts' text and the provider rules are untouched in the text.
- [Unknown] The checker `--selftest` (and so `walk_cases`) was not run, per the brief.

## Findings

1. **Blocking. A step's paragraph cannot take a second `id`.** `spec.md:244` ("each step's paragraph carries `id="walk-<diagram>-text-<k>"` on the element its claim block renders in ... nothing else of the paragraph changes").
   - [Observed] Every section paragraph already renders with `id="block-<p.id>"` (`apps/three-surface-poc/src/polaris-generation/dossier-site.ts:629-636`, `blockTarget`, returned whenever `fold === null`, i.e. outside a presentation element — exactly the blocks a walk may name), and the name index's fragment for that block is `block-<p.id>` (`:633`).
   - [Inferred] An element has one `id`. The text either requires a duplicate attribute (invalid HTML; the first wins, so the walk link misses) or silently replaces `block-<id>`, which breaks every existing link to the block, contrary to "nothing else of the paragraph changes" and to D7's claim that a walk moves no other byte. Not decidable from the text.
   - Repair: make each `Read step <k>` link name the block's existing `#block-<block id>` and drop the new paragraph id; or state the replacement and every link it breaks. Add a scenario fixing the paragraph's `id` bytes.

2. **Blocking. Fragment ids are not unique.** `spec.md:244`.
   - [Observed] Diagram identities match `^[A-Za-z0-9][A-Za-z0-9_.:-]*$` (`packages/polaris-generation-core/src/source-model.ts:5`, the `handle` schema). `index.html` and each Pole page render several sections (`spec.md` v8 paragraph, file line 84: "one item for each section the page renders").
   - [Inferred] With diagrams `f` and `f-text` each walked on one page, the box id of `f-text`'s step 1 and the paragraph id of `f`'s step 1 are both `walk-f-text-1`. `:target` and the `Read step` link then hit the wrong element. No rule says the walk's ids are unique on the page, or distinct from the existing `figure-`, `block-`, `section-`, `subsection-`, `element-` and `diagram-text-` ids.
   - Repair: fixing finding 1 removes the `-text-` form. Then state that every id the walk adds is unique on its page. Add an adversarial scenario with two walked figures whose identities share a prefix.

3. **Blocking. Scenario "A walk's figure is drawn where the walk is" contradicts the ordering rule.** `spec.md:1647-1649` against `spec.md:242` ("The walks are taken in draft order, the sections' before the deep dives'").
   - [Observed] The WHEN has section `a`'s walk name `f` homed in `a`, "that an earlier walk, of a deep dive, also names". The THEN expects `f: a second walk through this figure` for section `a`'s walk.
   - [Inferred] Under the rule, no deep dive's walk is earlier than a section's. Section `a`'s walk is the first through `f` and gets no finding. The deep dive's walk gets both the home finding and the second-walk finding. The scenario cannot pass an implementation of the paragraph.
   - Repair: make the earlier walk another section's, placed before `a` (it then also draws the home finding), or move the expectation to the deep dive's walk.

4. **Blocking. Scenario "A walk's steps name the figure's elements ..." omits findings the rule requires.** `spec.md:1653-1655` against `spec.md:242`.
   - [Observed] The steps are 0 `api`/`p1`, 1 `cache`/`p1`, 2 `api`/`p2`, 3 `db`/`q1`, 4 `db`/`t1`, 5 `db`/`p3`. The THEN lists exactly five findings "in that order".
   - [Inferred] Steps 4 and 5 name `db`, which step 3 already names. The rule ("where it names one that an earlier step of the walk names") gives `db: a second step for this element` at `steps[4].element` and `steps[5].element`. Those come before each step's block finding. The scenario's exhaustive, ordered list is wrong.
   - Repair: give steps 4 and 5 distinct drawn elements, or add the two findings in their places.

5. **Blocking. The step label and the box link are undefined for an element that 2.24's shared-element rule renders once.** `spec.md:244` against `spec.md:140`.
   - [Observed] In 2.24, a model element drawn by several views renders its claim once, in its first figure. In each later figure its list item reads `<label>, as shown in <a href="<href>"><title></a>`, "Such an item carries no claim anchor and no citation" (`spec.md:140`).
   - [Inferred] For a walk through such a later figure:
     - "the step's element's label as the list of every component and relationship shows it" may be read as the whole item. That nests `<a>` inside the step's `<a>`, which is invalid.
     - The box's link rule ("whose first citation has a link in the figure's list") yields no link. So the proposal's "links every box to the lines its first citation cites" and the bead's "each node label links to the lines it cites" are not met, and the text never says so.
     - The brief's walk paragraph tells authors to expect a link on every box.
   - Repair: define `<label>` as the element's label as the first figure renders it (2.24's own term). Either define the box `href` from the first figure's citation link, or state that a later figure's shared element gets no box link, and soften the brief and the proposal to match. Add a scenario of a walk through the second of two views sharing an element.

6. **Blocking. The design contradicts the specification on walks per place.** `design.md` D2 ("One walk per figure, any number per place ... two figures in one section are each walkable"), `proposal.md` "walked by no other walk", against `spec.md:240`.
   - [Observed] The spec gives a section or deep dive one member `walk`, a single object.
   - [Inferred] So at most one walk per place, and a second figure in the same section cannot be walked. That is the opposite of D2's stated reason for the second-walk finding.
     - Because a walk's figure must be homed in the walk's own place, the second-walk finding is reachable only alongside a home finding.
     - Read literally ("the figure of an earlier walk in this order", whatever that walk's own findings), a correctly homed section walk is refused as "a second walk" whenever an earlier section's mis-homed walk names the same figure.
     - The implementing session (D8) follows the design.
   - Repair: either make `walk` a list (with a per-place bound and a scenario of two walks in one section), or correct D2 and the proposal to one walk per place. In either case, say whether a walk with a home finding counts as "earlier".

7. **Note. "Never scaled" has a standing exception.** `spec.md:244`, `design.md` D4.
   - [Observed] `dossier-site.ts:217` scales any `svg[width="1048"]` (`max-width:max(100%,860px)`). The code comment (`:214-216`) says no figure is 1048 px wide today.
   - [Inferred] If a graph layout ever lands on 1048 px, the layer misplaces every box, and the spec's "a change that scales the drawing changes this paragraph" would not trip, because that rule predates it.
   - Repair: state the exclusion, or make the walk render nowhere for a 1048 px drawing. Add a Falsifier line.

8. **Note. The layer takes the pointer off the drawing's nodes.** `spec.md:244` ("make each `walk-source` link fill its box").
   - [Observed] Existing rules emphasise the node under the pointer (`dossier-site.ts:217`, `.diagram-scroll g.node:hover rect`).
   - [Inferred] A box that fills the node and sits above the SVG receives the hover, so walked figures lose node hover emphasis. D7 says nothing about it. Node hover belongs to syzygy-3efd.34, but losing the existing hover is a behaviour change.
   - Repair: disclose it in D7, or give the layer a rule that keeps it (for example, hover on the box).

9. **Note. The box link's accessible name and sighted discoverability.** `spec.md:244`.
   - [Inferred] The link's name is the node label alone, so a screen reader announces "<label>, link" for a link that goes to source lines on another page.
   - [Inferred] Sighted readers get no visible cue that a box is a link.
   - Repair: name it, for example, "<label>: cited lines"; consider a visible affordance.

10. **Note. Keyboard behaviour is only partly specified.** `spec.md:1635-1637`.
    - [Observed] The scenario checks that the list's links are reached in step order and that the target is outlined.
      - Focus visibility on the box links is covered by the existing global `a:focus-visible` (`draft-preview.ts:19`).
    - [Inferred] Still unstated:
      - where sequential focus goes after a step link is followed (the target `span` is not focusable);
      - that up to 40 box links are inserted into the Tab order before the list;
      - that there is no way back from a box to its step.
    - Repair: state the expected next Tab stop after activation, and decide whether the boxes precede the list in Tab order.

11. **Note. The text alternative is consistent but not associated.** `spec.md:244`, `design.md` D6.
    - [Observed] The SVG's `aria-describedby` names `diagram-text-<index>`, the component list inside its `<details>` (`diagram-layout.ts:551`). The walk list leaves it unchanged.
    - [Inferred] The walk list does not duplicate or contradict that list: labels are the same words and it adds only order and paragraph links. But it is not programmatically tied to the figure beyond adjacency and its `aria-label`, so calling it "the figure's text alternative" overstates it slightly.
    - [Observed] No walk target can land in a `<details>`:
      - the boxes sit in `diagram-scroll` inside `<figure>`, outside the figure's `<details>` (`dossier-site.ts:809`);
      - the walk list's own target ids are the boxes;
      - paragraph targets are own or subsection paragraphs, rendered in `<section class="subsection">`, not in `<details>`;
      - presentation-element blocks, the only claim blocks that fold, are excluded.
    - The guardrail holds.

12. **Note. `<k>` has two bases.** `spec.md:242` uses the step's index (zero-based, as the scenario's `steps[1]` for the second step shows). `spec.md:244` uses the step's number "counting from 1". The scenarios agree with this reading, but the same placeholder carries both meanings. Repair: name them `<k>` (index) and `<n>` (number).

13. **Note. The bead's "elements" is narrowed to one element per step without disclosure.** `bd show syzygy-3efd.32` says "each tying a cited paragraph to elements of a figure". The spec allows one element per step. Repair: list it in the proposal's non-goals or D9.

14. **Note. A citation is enough even when every citation is withheld or Unknown.** `spec.md:240` "that block carries at least one citation".
    - [Inferred] A paragraph whose only citation is withheld or fails to verify satisfies the step. Its `Read step` link then lands on a withheld sentence or an Unknown block. That is honest, since the block renders as it would anyway, but the text never states it.
    - Repair: state it, or require the citation to be admitted. Either is a choice; say which.

15. **Note. The survival script's denominator.** `walk_survival.py` prints "predecessor scenario blocks byte-identical in new text 231 of 231". `SEMANTIC-DELTA.md` says "All 232 predecessor scenarios are carried with their blocks byte for byte". [Observed] By my split, 232 of 232 are byte-identical, so the delta's claim holds, but its cited tool reports a different denominator (rule 4). Repair: fix the script's block extraction for the last block, or note the difference.

16. **Note. Placement of the layer is implied, not stated.** `spec.md:244` lists the style rules (target outline, badge, link fill, drawing visible) but not that the layer is positioned at the drawing's origin. "laid over the drawing" carries it. Repair: add "positioned at the drawing's top-left corner" to the stylesheet sentence, so the Falsifier "a box lies off its node" has a stated cause.

## Adversarial drafts, decided by the text

| Draft | Outcome by the text | Holds? |
|---|---|---|
| Step names an element absent from the figure | `walk` finding at `steps[<k>].element` ("names no element drawn in <identity>") | Yes |
| Step's paragraph has no citation | `<block>: a step's paragraph cites its sources` | Yes (see 14 for withheld or Unknown citations) |
| Duplicate step | Second naming of an element is a finding. The same block twice is allowed, and the paragraph id goes to the first step | Rule yes; scenario 4 wrong |
| Two walks in one place | Impossible: `walk` is one object, so a list is a malformed-walk finding. Contradicts D2 | Finding 6 |
| Sequence, swimlane, containment figure | `<identity>: a walk's figure is of a graph kind` | Yes |
| View, or system-model element not selected | View's expansion counts; an unselected model element is "not drawn" | Yes |
| Element shown in two figures (2.24) | Label and link undefined or absent in the later figure | Finding 5 |
| Withheld or secret-matched element | Label is Syzygy's words, no box link, badge and id kept; finding details name only draft identities the author wrote | Yes |
| More than 12 steps | Malformed-walk finding at the walk's path | Yes |
| Step whose cited lines are Unknown | Passes; links land as the list's do (14) | Unstated, note |
| `:target` ids colliding with anchors | Paragraph already has `block-` id; `-text-` form not injective | Findings 1, 2 |
| Provider mode | Closed schema gains no `walk`; golden unchanged | Yes |
| Older schemas | `field-version` in place of `schema` at the walk path; every other byte as 2.33 | Yes |

## Honesty, security and scope

- [Observed] Graph nodes and model elements are labelled only `inferred` or `unknown` (`draft-schema.ts:332`). The layer adds no marking. The badge is `aria-hidden` and states no status. The box `href` is defined by equality with the list's citation link, so it points at what that citation cites. Nothing derived or Inferred is presented as Observed (VIS-2 holds, subject to finding 5's undefined case).
- [Observed] No script is added. The CSP already admits inline style (D4). `svg-inert` and the SVG bytes are unchanged by rule. No new read, source or label is added (`spec.md:244`, last sentence). Secret detection and SEC-5 are untouched. No owner class is decided.

## Bookkeeping

- [Observed] SEMANTIC-DELTA is accurate:
  - it regenerates byte for byte;
  - its 5 amended lines, 5 paragraphs and 9 scenarios match the diff;
  - `GOVERNING-DEPENDENCIES.json` is claimed unchanged, and R4 and R7 pass.
- [Observed] The checker wiring is pending and consistent:
  - tag `polaris-dossier-figure-walks-v2.NN`;
  - subject digest equal to the reviewed `spec.md`;
  - the count script composes `WALK_SPEC` after `FIGPLAN_SPEC`.
- [Observed] Census 232 → 241 is correct for the text. The effective total stays 579 until adoption.
