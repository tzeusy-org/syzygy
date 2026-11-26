# Design: a figure read in numbered steps, its boxes linked to their sources

[Inferred] Version 2.NN of REQ-polaris-generation-034, for syzygy-3efd.32, drafted on `origin/main` at `4b86e428` over the figure plan text, version 2.33 (`dossier-figure-plan`). Every code site named in D8 is re-located on the base the implementation starts from.

## D1. Sequencing, the predecessor and the symbolic numbers

- [Observed] At drafting, the effective REQ-034 on `main` is version 2.33 (figure plan; schema v14, brief v22). A concurrent candidate, derived-base views (syzygy-3efd.38, branch `agent/syzygy-3efd.38`), is still drafted over 2.24 and is to be rebuilt and adopted first, at about 2.34.
- [Inferred] So this text is drafted over 2.33 and keeps every number that a later adoption could take as a placeholder: the label `2.NN`, the schema `vSS` and the brief `vBB`. The build script (`docs/evidence/syzygy-3efd-32/walk_build_spec.py`) holds them as `NUMS` and its predecessor as `PREDECESSOR`; at adoption it is rebuilt over the version .38 adopts by changing those constants and, where that version moved one, an anchor. Nothing in this design depends on what .38 adds, beyond the predecessor's own accepted-schema list and brief list, which the script extends at their ends.
- [Inferred] If .38 adds a schema, this one becomes its successor (`<PS>`) and brief `<PB>`; the walk paragraphs say "every rule ... for a schema-v<PS> draft holds for a schema-v<S> draft", so they need no other change.

## D2. The walk lives on the place, not on the diagram

- [Inferred] The bead says "a section may declare a walk". The steps tie paragraphs, which a place owns, to elements, which a diagram owns; placing the walk on the section keeps the paragraphs' owner and the walk's owner the same, so check resolves every block against one list and the walk renders on the page that holds both.
- [Inferred] A deep dive gets a walk too: it has its own paragraphs and its own homed figures, and the rule is the same. The overview does not: its text is the hero and the summary, not paragraphs a step could name, and its figures are the landing page's (D3).
- [Inferred] One walk per place, so at most one walked figure per section or deep dive. `walk` is one object, the simplest form, and a place's paragraphs read in one order. Since a walk's figure must be homed in the walk's own place and a diagram has one home, no figure can be walked twice by walks that pass check, so the draft needs no second-walk finding and none is stated (review 1, finding 6). A place with two graph figures walks one; a later version may make `walk` a list if a draft needs more.

## D3. Which figures can be walked

- [Inferred] Only the six graph kinds (`flow`, `lifecycle`, `state-machine`, `boundary`, `dependency`, `placement`). Their layout draws each node as one box whose position and size the layout knows, so the HTML layer has one rectangle per node. A sequence's participants are columns, a swimlane's steps sit in lanes and a containment's groups nest: a box layer over them would need its own geometry rules, and the bead names "elements" without asking for them. A later version may add them.
- [Inferred] For a figure that carries a 2.24 `view`, the elements are the view's expansion, the nodes the reader sees; a step naming a model element the view does not select is the "not drawn" finding.

## D4. The layer, not the SVG

- [Observed] `apps/three-surface-poc/src/polaris-generation/svg-inert.ts` refuses any `href` in a drawing, and the inertness check is a security boundary the bead says stays unchanged.
- [Inferred] So the links, ids and badges sit in an HTML layer laid over the drawing by absolute position, built from the same layout record the drawing is built from. The drawing's bytes do not change, and the layer carries nothing the drawing does not already show but the step number.
- [Observed] Version 2.11's readable layout draws every graph figure at its laid-out width, never scaled, save one width (`svg{display:block;max-width:none;height:auto}` in `DRAFT_PREVIEW_CSS`, `apps/three-surface-poc/src/polaris-generation/draft-preview.ts`, which every dossier page carries), inside a scrolling `diagram-scroll` div. [Observed] The one exception is version 2.2's rule that lets a drawing exactly 1048 px wide shrink to its column (`.diagram-scroll svg[width="1048"]`, `dossier-site.ts:217`); its comment says no figure is that wide today. [Inferred] So layout coordinates are CSS pixels for every other width, and a layer positioned at the drawing's top-left corner inside the same scrolling box covers the drawing exactly at every viewport. A walk renders nowhere over a 1048 px drawing, and the spec says a change that scales a drawing of any other width changes the walk paragraph, so a later responsive drawing cannot silently misplace the boxes.
- [Inferred] Each box carries its position as a `style` attribute. [Observed] The pages' CSP already admits `style-src 'unsafe-inline'` (`DRAFT_PREVIEW_CSP_META`, same file). [Inferred] No script is needed and none is added.

## D5. Highlight by `:target`, links by the existing citation hrefs

- [Inferred] The step list links to `#walk-<diagram>-<n>`, the box's id, `<n>` the step's number (its index plus 1; findings use the index, `<k>`); the stylesheet's `.walk-node:target` outline then marks it. The outline is a shape, not a colour alone, so it reads without colour. No `<details>` holds a target the walk adds, since a fragment target inside one strands keyboard readers (the project's own guardrail); the figure's component list stays inside its `<details>` and the walk's list sits outside it.
- [Inferred] Each walk id is `walk-` plus a diagram handle, a hyphen and decimal digits, so read back from its last hyphen it names one figure and one step, and the spec forbids any other `walk-` id on such a page: ids stay unique even for figures `f` and `f-1` on one Pole page (review 1, finding 2).
- [Observed] Version 2.15 gives each claim block outside a collapsible section `id="block-<identity>"`, and the code renders it (`dossier-site.ts:629-636`). [Inferred] So a step's `Read step` link names `#block-<block>` and the walk adds no id and no byte to a paragraph (review 1, finding 1).
- [Inferred] Keyboard: the boxes' links come before the list in page order. Following a step's link makes its box the target, and browsers start sequential focus there, so the next Tab reaches that box's source link. There is no link back from a box to its step; the list follows the layer, so Tab reaches it next.
- [Observed] Source pages carry one `id="L<n>"` per line (`apps/three-surface-poc/src/polaris-generation/dossier-source-lines.ts:137`), and the figure's component list already renders each citation as a link to the cited line. [Inferred] A box's link copies that `href` exactly, so it lands where the list's link lands; the spec defines it by that equality rather than restating the route grammar, so a later change to citation routes moves both together. For an element that 2.24 renders once, in its first figure, a later figure's list carries no citation; the box there takes the first figure's citation link, resolved against that figure's page and re-addressed from this one, so every box whose element is not withheld and has a linked citation links to its lines, as the brief and the proposal say (review 1, finding 5). Its label is the first figure's label text alone, never the list item's "as shown in" link, so the step's link nests no link.
- [Inferred] A box link's accessible name is "<label>: cited lines", saying where it goes; sighted readers get the pointer cursor and the global `a:focus-visible` outline. A visible mark on every box would clutter the drawing; that is a residual (D9).
- [Inferred] Only the first citation is linked from a box: a box is one target, and the component list keeps every citation. A withheld node, or one whose first citation has no link, gets no link, so nothing withheld becomes reachable from the layer.

## D6. The walk as an ordered reading beside the text alternative

- [Inferred] The bead says the walk is also the figure's text alternative. The drawing already has one: `role="img"`, with `aria-describedby` naming its component list (`diagram-layout.ts:551`). The SVG's bytes may not change, so the walk's list cannot be tied to it programmatically; it sits beside the drawing with its own `aria-label`, an ordered reading of the same figure, each element in reading order with a link to its paragraph. The spec calls it that, not the text alternative (review 1, note 11). A figure without a walk loses nothing and a figure with one gains a path through it.
- [Inferred] Each step's link text is the element's label as the component list shows it, so a screen-reader user hears the same names in both. The badge is `aria-hidden`: the number is the list's own order.

## D7. Bytes that move

[Inferred]
- A draft of schema v14 or earlier keeps every finding and byte version 2.33 gives it, but for a `field-version` finding at a walk in place of the `schema` finding there.
- A schema-vSS draft without a walk renders as the same draft in schema v14, apart from bytes naming the schema or digest.
- A walk moves only the page that draws its figure (wrapper, layer, list, the walk style rules), that page's measures in the size report and the rendered-design packet. No byte of a paragraph, of the drawing, `machine.json`, `dossier.json`, check record, `run-advice.json`, reading ledger, figure fit or figure advice moves.
- The provider mode is unaffected and its golden does not change: the provider's draft schema is closed and gains no `walk`.
- The walk's style rules are carried only by a page that holds a walk, the pattern of the figure-kind rules (2.5).
- On a walked figure the layer sits above the drawing and takes the pointer, so the drawing's own node hover emphasis (`.diagram-scroll g.node:hover rect`) no longer fires there; the stylesheet outlines the box under the pointer instead (review 1, note 8). Hover and focus highlighting proper stay with syzygy-3efd.34.

## D8. What the code change must do

[Inferred] For the implementing session, on a base where the predecessor version has landed:
- `packages/polaris-dossier/src/draft-schema.ts`: schema vSS, the v14 schema with `walk` admitted as any value on a section and a deep dive.
- `packages/polaris-dossier/src/check-derive.ts` (or a module it calls): the walk findings in the stated order, after every finding of the predecessor, and the `field-version` finding.
- `apps/three-surface-poc/src/polaris-generation/dossier-site.ts`: the wrapper, layer, badges, source links and step list, with no change to any paragraph; the per-page style rules; no walk over a 1048 px drawing. Box geometry from `diagram-layout.ts`, the same record the drawing uses.
- `packages/polaris-dossier/src/brief.ts`: brief vBB.
- Tests: every scenario with literal expected values, a browser test with scripts off for `:target` and Tab order, stored drafts of v14 and earlier byte-identical, `svg-inert` tests unchanged, the provider golden unchanged, and a rule-6 mutation run over the new findings and the layer's geometry and links.

## D9. Residuals

- [Inferred] Hover and focus highlighting, and edge-label links, are syzygy-3efd.34; excerpts and code walks are syzygy-3efd.33.
- [Inferred] That a step's paragraph speaks of its element is not checked; it is the author's report and the fidelity and rendered-design reviews' judgement.
- [Inferred] Walks through non-graph kinds and the overview, more than one walk per place, and walks over a 1048 px drawing are not offered at this version (D3, D2, D4).
- [Inferred] A step names one element; the bead's "elements of a figure" is narrowed so one box takes one number and one highlight (review 1, note 13).
- [Inferred] A step's paragraph needs a citation but not an admitted one: a block whose citations are all withheld, or which renders Unknown, may be a step's paragraph, and the step's link lands on the block as it renders. That is honest, since the block renders so anyway, and refusing it would let a render-time screening decision reject a draft at check (review 1, note 14).
- [Inferred] Box links have no visible mark at rest; only the cursor and focus outline show them (note 9).
- [Inferred] Whether walks help a newcomer read a figure is for a later review of rendered dossiers; no gain is claimed.

## Review

[Observed] Review 1 (`docs/reviews/syzygy-3efd-32/R-FIGURE-WALKS-SPEC-1-RAW.md`, over spec sha256 `43351085…` at `b4c19f825`) recorded `REVISE` (line 3) with six blocking findings and ten notes. Each was repaired or recorded in one pass; no confirmation round was run (one non-gating review under D10). No review has read the repaired bytes.

| Finding | Disposition |
|---|---|
| 1 (blocking) a step's paragraph cannot take a second `id` | Repaired: `Read step <n>` links `#block-<block>`, the id version 2.15 gives the paragraph; the walk adds no id or byte to a paragraph. The first scenario fixes each paragraph's `id="block-…"` bytes, and "A walk moves only its figure's page" says no paragraph byte moves. D5. |
| 2 (blocking) fragment ids not unique | Repaired: with finding 1 the `-text-` form is gone; each walk id is `walk-<diagram>-<n>`, `<n>` decimal digits, so read from its last hyphen it is injective, and Syzygy SHALL give no other element of such a page a `walk-` id. New scenario "Walk ids stay unique on a page of several walked figures" walks `f` and `f-1` on one Pole page beside a paragraph `walk-f-1`. D5. |
| 3 (blocking) scenario contradicts the order rule | Repaired by removing the second-walk finding (finding 6), so the scenario's `f` case is gone; the scenario now uses four sections in order, one per finding, and the combined home-and-kind case shows the stated order. |
| 4 (blocking) two missing "second step" findings | Repaired: steps 4 and 5 name `queue` and `log`, elements the view shows and no earlier step names, so the five listed findings are exactly those the rule gives; the THEN adds "and no other walk finding". |
| 5 (blocking) shared element in a later figure | Repaired: the label is the first figure's label text alone (2.24's term), never the item's link, so no link nests; the box link is the first figure's citation link, resolved against that figure's page and written relative to this one. Brief, proposal, README and index row now say "each box whose element is not withheld and has a linked citation". New scenario "A walk through a later view of a shared element". D5. |
| 6 (blocking) one walk per place or many; "earlier" walk | Repaired: one walk per place, stated in the spec, proposal and D2. Since a walk's figure must be homed in its own place, two passing walks cannot share a figure, so the second-walk finding is removed and the question of which walk counts as earlier no longer arises. |
| 7 (note) 1048 px exception | Repaired: a walk renders nowhere over a drawing 1048 px wide; the "never scaled" sentence names the exception; a scenario and a Falsifier line pin it. D4. |
| 8 (note) the layer takes the pointer | Repaired: the stylesheet outlines the box under the pointer, and D7 and the spec's bytes paragraph disclose that the drawing's own node hover gives way there. |
| 9 (note) accessible name and sighted cue | Repaired in part: the link's hidden text is "<label>: cited lines" and the box shows the pointer cursor; a visible mark at rest is a recorded residual (D9). |
| 10 (note) keyboard behaviour | Repaired: the spec states the boxes' links precede the list and, after a step's link, the next Tab reaches that box's source link; the scenario checks it. No way back from a box to its step is recorded in D5. |
| 11 (note) text alternative overstated | Repaired: the spec and D6 call the list an ordered reading beside the drawing's unchanged text alternative. |
| 12 (note) `<k>` has two bases | Repaired: `<k>` is the zero-based index in findings, `<n>` the step's number (index plus 1) in rendering, each defined where used. |
| 13 (note) one element per step undisclosed | Recorded: the proposal's non-goals and D9. |
| 14 (note) withheld or Unknown citations | Decided and stated: a citation suffices whatever becomes of it at render; the step's link lands on the block as it renders. Spec, scenario and D9. |
| 15 (note) survival script 231 vs 232 | Repaired: `walk_survival.py` keeps blocks as a list, not keyed by title (two predecessor scenarios share the title "Earlier schema keeps its bytes"), and now prints 232 of 232. |
| 16 (note) layer placement | Repaired: the layer is laid over the drawing "with its top-left corner at the drawing's top-left corner", and the stylesheet sentence positions it so. |

[Observed] After the repairs the requirement gains twelve scenarios, not nine (232 to 244 on REQ-034); the checker's subject digest and `walk_cases` counts follow.
