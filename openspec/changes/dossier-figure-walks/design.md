# Design: a figure read in numbered steps, its boxes linked to their sources

[Inferred] Version 2.NN of REQ-polaris-generation-034, for syzygy-3efd.32, drafted on `origin/main` at `4b86e428` over the figure plan text, version 2.33 (`dossier-figure-plan`). Every code site named in D8 is re-located on the base the implementation starts from.

## D1. Sequencing, the predecessor and the symbolic numbers

- [Observed] At drafting, the effective REQ-034 on `main` is version 2.33 (figure plan; schema v14, brief v22). A concurrent candidate, derived-base views (syzygy-3efd.38, branch `agent/syzygy-3efd.38`), is still drafted over 2.24 and is to be rebuilt and adopted first, at about 2.34.
- [Inferred] So this text is drafted over 2.33 and keeps every number that a later adoption could take as a placeholder: the label `2.NN`, the schema `vSS` and the brief `vBB`. The build script (`docs/evidence/syzygy-3efd-32/walk_build_spec.py`) holds them as `NUMS` and its predecessor as `PREDECESSOR`; at adoption it is rebuilt over the version .38 adopts by changing those constants and, where that version moved one, an anchor. Nothing in this design depends on what .38 adds, beyond the predecessor's own accepted-schema list and brief list, which the script extends at their ends.
- [Inferred] If .38 adds a schema, this one becomes its successor (`<PS>`) and brief `<PB>`; the walk paragraphs say "every rule ... for a schema-v<PS> draft holds for a schema-v<S> draft", so they need no other change.

## D2. The walk lives on the place, not on the diagram

- [Inferred] The bead says "a section may declare a walk". The steps tie paragraphs, which a place owns, to elements, which a diagram owns; placing the walk on the section keeps the paragraphs' owner and the walk's owner the same, so check resolves every block against one list and the walk renders on the page that holds both.
- [Inferred] A deep dive gets a walk too: it has its own paragraphs and its own homed figures, and the rule is the same. The overview does not: its text is the hero and the summary, not paragraphs a step could name, and its figures are the landing page's (D3).
- [Inferred] One walk per figure, any number per place. A second walk through one figure would give one box two numbers; two figures in one section are each walkable.

## D3. Which figures can be walked

- [Inferred] Only the six graph kinds (`flow`, `lifecycle`, `state-machine`, `boundary`, `dependency`, `placement`). Their layout draws each node as one box whose position and size the layout knows, so the HTML layer has one rectangle per node. A sequence's participants are columns, a swimlane's steps sit in lanes and a containment's groups nest: a box layer over them would need its own geometry rules, and the bead names "elements" without asking for them. A later version may add them.
- [Inferred] For a figure that carries a 2.24 `view`, the elements are the view's expansion, the nodes the reader sees; a step naming a model element the view does not select is the "not drawn" finding.

## D4. The layer, not the SVG

- [Observed] `apps/three-surface-poc/src/polaris-generation/svg-inert.ts` refuses any `href` in a drawing, and the inertness check is a security boundary the bead says stays unchanged.
- [Inferred] So the links, ids and badges sit in an HTML layer laid over the drawing by absolute position, built from the same layout record the drawing is built from. The drawing's bytes do not change, and the layer carries nothing the drawing does not already show but the step number.
- [Observed] Version 2.11's readable layout draws every graph figure at its laid-out width, never scaled (`svg{display:block;max-width:none;height:auto}` in `DRAFT_PREVIEW_CSS`, `apps/three-surface-poc/src/polaris-generation/draft-preview.ts`, which every dossier page carries), inside a scrolling `diagram-scroll` div. [Inferred] So layout coordinates are CSS pixels, and a layer positioned inside the same scrolling box covers the drawing exactly at every viewport. The spec says so, and says a change that scales the drawing changes the walk paragraph, so a later responsive drawing cannot silently misplace the boxes.
- [Inferred] Each box carries its position as a `style` attribute. [Observed] The pages' CSP already admits `style-src 'unsafe-inline'` (`DRAFT_PREVIEW_CSP_META`, same file). [Inferred]; no script is needed and none is added.

## D5. Highlight by `:target`, links by the existing citation hrefs

- [Inferred] The step list links to `#walk-<diagram>-<k>`, the box's id; the stylesheet's `.walk-node:target` outline then marks it. The outline is a shape, not a colour alone, so it reads without colour. No `<details>` holds a target the walk adds, since a fragment target inside one strands keyboard readers (the project's own guardrail); the figure's component list stays inside its `<details>` and the walk's list sits outside it.
- [Observed] Source pages carry one `id="L<n>"` per line (`apps/three-surface-poc/src/polaris-generation/dossier-source-lines.ts:137`), and the figure's component list already renders each citation as a link to the cited line. [Inferred] A box's link copies that `href` exactly, so it lands where the list's link lands; the spec defines it by that equality rather than restating the route grammar, so a later change to citation routes moves both together.
- [Inferred] Only the first citation is linked from a box: a box is one target, and the component list keeps every citation. A withheld node, or one whose first citation has no link, gets no link, so nothing withheld becomes reachable from the layer.

## D6. The walk as the figure's text alternative

- [Inferred] The bead says the walk is also the figure's text alternative. The drawing already has one (`role="img"` with a label and the component list). This version adds the list of steps in reading order, each naming the element and linking its paragraph, as a second, ordered reading of the same figure, and leaves the drawing's own alternative unchanged, so a figure without a walk loses nothing and a figure with one gains a path through it.
- [Inferred] Each step's link text is the element's label as the component list shows it, so a screen-reader user hears the same names in both. The badge is `aria-hidden`: the number is the list's own order.

## D7. Bytes that move

[Inferred]
- A draft of schema v14 or earlier keeps every finding and byte version 2.33 gives it, but for a `field-version` finding at a walk in place of the `schema` finding there.
- A schema-vSS draft without a walk renders as the same draft in schema v14, apart from bytes naming the schema or digest.
- A walk moves only the page that draws its figure (wrapper, layer, list, paragraph ids, the walk style rules), that page's measures in the size report and the rendered-design packet. No byte of the drawing, `machine.json`, `dossier.json`, check record, `run-advice.json`, reading ledger, figure fit or figure advice moves.
- The provider mode is unaffected and its golden does not change: the provider's draft schema is closed and gains no `walk`.
- The walk's style rules are carried only by a page that holds a walk, the pattern of the figure-kind rules (2.5).

## D8. What the code change must do

[Inferred] For the implementing session, on a base where the predecessor version has landed:
- `packages/polaris-dossier/src/draft-schema.ts`: schema vSS, the v14 schema with `walk` admitted as any value on a section and a deep dive.
- `packages/polaris-dossier/src/check-derive.ts` (or a module it calls): the walk findings in the stated order, after every finding of the predecessor, and the `field-version` finding.
- `apps/three-surface-poc/src/polaris-generation/dossier-site.ts`: the wrapper, layer, badges, source links and step list; the paragraph ids; the per-page style rules. Box geometry from `diagram-layout.ts`, the same record the drawing uses.
- `packages/polaris-dossier/src/brief.ts`: brief vBB.
- Tests: every scenario with literal expected values, a browser test with scripts off for `:target` and Tab order, stored drafts of v14 and earlier byte-identical, `svg-inert` tests unchanged, the provider golden unchanged, and a rule-6 mutation run over the new findings and the layer's geometry and links.

## D9. Residuals

- [Inferred] Hover and focus highlighting, and edge-label links, are syzygy-3efd.34; excerpts and code walks are syzygy-3efd.33.
- [Inferred] That a step's paragraph speaks of its element is not checked; it is the author's report and the fidelity and rendered-design reviews' judgement.
- [Inferred] Walks through non-graph kinds and the overview are not offered at this version (D3, D2).
- [Inferred] Whether walks help a newcomer read a figure is for a later review of rendered dossiers; no gain is claimed.

## Review

[Observed] No review has read this package yet.
