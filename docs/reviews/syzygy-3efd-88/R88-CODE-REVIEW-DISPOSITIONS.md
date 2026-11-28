# R88 code review: dispositions

Review: `R88-CODE-REVIEW-RAW.md` in this directory, verdict `REVISE` (line 2), over `fb5596f21`. One round; no confirmation review follows (D10).
The repairs are in commit `4be395645`; the mutation record is `docs/evidence/syzygy-3efd-88/walk-mutation-r88-2026-11-28.json` (68 of 68 killed at `4be395645`, four equivalents recorded with reasons).

## 1. Blocking: a walk renders where its place is not produced

Repaired.

- `walksAt` (`packages/polaris-dossier/src/walk.ts`) now leaves out a walk whose section or deep dive does not have the disposition `produced`. So an omitted deep dive's walk renders nowhere, even where its figure is drawn on the section's page.
- Check still reports no finding for the place's disposition, as 2.40 says.
- Tests in `walk.test.ts`:
  - "A walk whose place is not produced renders nowhere…" covers an omitted deep dive walking a produced flow homed in it. It asserts that check's findings equal those without the walk, and that every rendered file is byte-equal to the render without the walk.
  - "at the render: a section whose disposition is not produced renders no walk" covers the same rule at `walksAt`, for a section.
- Mutant `render-unproduced-place` is killed by both tests.

## 2. Note: the 1048 px call site

Recorded as equivalent: mutant `width-guard-deleted` is in the runner's `EQUIVALENT` list, with the review's reason.

- No drawing the readable layout produces through a dossier reaches 1048 px.
- The rule is pinned at the helper, `walkableWidth` (mutant `width-rule-off-by-one`).
- Residual: the spec scenario "A drawing 1048 px wide is walked nowhere" cannot be built end to end at this version. It is stated in the PR text beside that scenario.

## 3. Note: the spec's `\"` and the brief's `"`

Recorded here, without editing `openspec/**`.

- The 2.40 walk paragraph in `spec.md` (line 280) writes its JSON with `\"` in 12 places, the only such bytes in the file.
- `WALK_PARAGRAPH` in `brief.ts` issues a bare `"` in each of those places, so the paragraph differs from the spec by those 12 backslashes and nothing else.
- Why this is the reading: every earlier brief paragraph the spec quotes writes bare `"` inside its code spans. A brief showing `{\"figure\": …}` would print the backslashes to the authoring agent. So the backslashes are an escape of the spec's own text, not bytes of the paragraph.
- `design.md` does not state this. The lead folds an erratum into a later spec change.

## 4. Note: the box-link arm for a citation with no source page

Recorded as unreachable at this version.

- `dossier-site.ts`, `sourceLink`, the `target === undefined` arm: every non-shared node's list item calls `refs(from, n.sourceIds, n.id)`.
- `refs` throws `unquotable-source` for a citation absent from `sourcePaths`. So a node citing a file with no source page fails the whole render before any box is drawn.
- A shared element's first figure calls `refs` for the same identities.
- So the scenario's `queue` case (a node citing a file with no source page) cannot be built. The arm is kept as a guard that fails toward no link.
- The `first === undefined` arm is reached by every base element, which carries `citations: []`; the base-element scenario pins its box with no link.
- A model element with no citation is not admitted: the schema holds every model element's `citations` to 1 to 50 items. A probe of an Unknown element with none got two schema findings.

## 5. Note: ids unique across the whole site

No change; the review finds no defect.

- The walk adds ids only on the page drawing the walked figure, and the tests show every other page keeps its bytes.
- The spec's falsifier is per page.

## 6. Note: the two equivalents

No change.

- Both equivalents stand, with the reasons the record gives.
- Two more equivalents are now recorded:
  - `width-guard-deleted` (finding 2);
  - `drawn-nodes-arm-empty`: the `nodes` arm of `drawnIdentities` is unreachable for a v16 draft, whose graph figures are views (finding 7).

## 7. Note: branches with no test or mutant

Repaired. Each listed branch now has a test case and a mutant, all killed.

| Branch | Test (`walk.test.ts`) | Mutant |
|---|---|---|
| `walk.ts` `!Array.isArray(walk['steps'])` | "More malformed walks…": `steps` an object with `length` 3 | `steps-not-list-admitted` |
| `walk.ts` `typeof element['map'] === 'string'` | the same test: a base end whose `map` is the number 7 | `base-map-not-string-admitted` |
| `walk.ts` the known-version clause | the same test: a v17 draft keeps the `schema` finding at the walk, with no `field-version` | `field-version-unknown-version` |
| `walk.ts` `named.length === 1` at check | "at check: a bare path naming both packages…" | `base-several-admitted` |
| `walk.ts` a base end the view hides, at check | the same test, the fixture's hidden API manifest | `base-unshown-admitted` (run 1's name) |
| `walk.ts` `resolved.spec.map === step.element.map` at render | "at the render: …another map…" | `render-base-map-unmatched` |
| `walk.ts` `resolved.shown.includes` at render | the same test, the hidden path | `render-base-unshown-admitted` |
| `walk.ts` `named.length === 1` at render | the same test, the bare two-package path | `render-base-several-admitted` |
| `walk.ts` `seen.has(node)` alone | the same test, a repeated base end | `render-repeat-kept` |
| `walk.ts` the `nodes` arm of `drawnIdentities` | unreachable at v16 (finding 6) | `drawn-nodes-arm-empty`, equivalent |
| `dossier-site.ts` the 1048 call site | see finding 2 | `width-guard-deleted`, equivalent |
| `dossier-site.ts` `first` / `target === undefined` | see finding 4 | none, or unreachable |
| `review-packet.ts` `withoutWalks` | "The fidelity packet's draft and the rerender measure carry no walk…" through `packetDraftView`, the function `buildFidelityPacket` now calls | `packet-walks-kept` |
| `rerender-measure.ts` `withoutWalks` | the same test: `measureDraft` of the walked draft equals that of the draft without its walks | `measure-walks-kept` |

## 8. Note: expectations read from the renderer's output

Repaired.

- The "Each box links…", "a later view of a shared element…" and "a base element…" scenarios now pin every box as a literal row: style, id, badge and link.
- They also pin the source address as a literal path and line fragment.
- Each row follows from the layout's constants. Connected nodes are stacked at x 24, 200 x 56, with rows 122 px apart from y 24. An unconnected pair is 120 px apart.
- The literal rows are cross-checked against the drawing's `rect`s and the list's citation links, which are now themselves compared with literals.
- The `called`-line shift is pinned at `diagramNodeBoxes` (`dossier-walk.test.ts`, 146 to 164 px).

## 9. Note: the browser test in the mutation run

Answered and repaired. Run 2 did run the browser test.

- Evidence: run 2's `target-solid` lists `walk.browser.test.ts` among its failed tests.
- The baseline counts were 9 page tests plus 15 scenarios plus 1 browser test (25), and 9 plus 1 (10). The review read them as 10 plus 15 and 10.
- To make this explicit, the runner now:
  - refuses to start without `SYZYGY_POC_BROWSER`;
  - records each baseline's passed and skipped count per file;
  - refuses unless the browser test passed in every group that lists it.
- The R88 record shows `walk.browser.test.ts: {passed: 1, skipped: 0}` in the `dossier-site.ts`, `diagram-layout.ts` and `dossier-walk.ts` baselines.

## 10. Note: the layer takes the drawing's `<title>` tooltips

Recorded as a residual, not changed.

- 2.40 says the stylesheet shall "outline a box under the pointer as the drawing's own rules emphasise a node under the pointer". So every box, linked or not, takes the pointer.
- Limiting `pointer-events` to linked boxes would leave an unlinked box's hover without its outline.
- On a walked figure the drawing's per-node `<title>` tooltip therefore no longer shows under the pointer. D7 and D9 disclose only the hover emphasis.
- The lead folds "and its tooltip" into the same later spec change as finding 3.

## 11. Note: the browser test does not turn scripts off

Recorded, not changed.

- The page carries no script under the pages' CSP (`document.scripts.length` is 0).
- The shared harness (`cdp-browser.ts`, `BrowserPage`) exposes no script-disable call. Adding one to a harness every browser test uses is outside this bead.
- The scenario's "with scripts off" is met in substance, because nothing on the page could run.

## 12. Note: a second copy of the presentation kinds

Repaired.

- `draft-schema.ts` now exports `PRESENTATION_ELEMENT_KINDS`. `check-derive.ts` (its `ELEMENT_KINDS`) and `walk.ts` both read it.
- The set sits in `draft-schema.ts` because `check-derive.ts` already imports `walk.ts`, and the reverse import would make a cycle.
- Mutant `presentation-kinds-without-table` is killed.
