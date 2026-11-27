# Design — view levels, scope and zoom links (version 2.45)

[Inferred] Version 2.45 of REQ-polaris-generation-034, for syzygy-3efd.39. It is drafted on `agent/syzygy-3efd.39` over imports corroboration 2.44 (`dossier-imports-corroboration`, row A-273, tag `polaris-dossier-imports-corroboration-v2.44` once merged), which stands on migration bounds 2.43, the newest REQ-034 on main.

## D1. The version label, the predecessor and the numbers

- [Observed] 2.44 is the newest REQ-034 version claimed (on `agent/syzygy-3efd.86`), so this change takes 2.45 and the tag `polaris-dossier-view-levels-v2.45`.
- [Observed] Numbers. The newest draft schema in the 2.44 text is `polaris-dossier-local-draft-v16` (2.40, walks) and the newest brief `polaris-dossier-brief-v24`; 2.42 to 2.44 took none. So this change takes **draft schema v17** and **brief v25**.
- [Observed] The build script (`docs/evidence/syzygy-3efd-39/view_levels_build_spec.py`) edits the predecessor's bytes at anchors it asserts occur exactly once:
  - 2.24's sentence that a view names no level or zoom target;
  - the end of 2.40's earlier-schema paragraph ("No migration yields a v16 draft."), after which the six new paragraphs go;
  - the four Form lines, each extended after its 2.44 sentence.
  The scenarios precede the one Form line. If another REQ-034 version lands first, the script is re-run over it with the predecessor path changed.
- [Observed] Predecessor sha256 `5b13a3998bfa9b2b05361ef5f7523b8a7ae58a3d074a440b22e870571d933955`; this spec `056638dfccb49622ca16da990ec10d3d0876734750040b8f3e0d0ef465e7f8e5`. REQ-034 goes from 301 to 310 scenarios.

## D2. The level is a type table

- [Inferred] The bead names the three C4-style levels. The model already types every element (2.24's nine types), so a level is checked by type alone, with no new member on an element:

| Type | Stands at | Context view | Container view | Component view |
|---|---|---|---|---|
| `system` | context | yes | yes | no |
| `external`, `person` | context | yes | yes | yes |
| `directory`, `package`, `service`, `job`, `store` | container | no | yes | yes |
| `module` | component | no | no | yes |

- [Inferred] Each level shuts out something: a context view shows no part, a container view no module, a component view no whole system. People and external systems may appear at every level, as neighbours. A tighter table (a component view of modules alone) would forbid the neighbouring parts a component view needs to say what its modules talk to.
- [Inferred] Base elements (2.35) are typed by what they stand for: the root `system`, a top-level directory `directory`, a package fact `package` and a module fact `module`. One `view-level` finding at `base` names the first offending type and no base path, so no draft path reaches a detail (the 2.35 screening composition).
- [Inferred] `level` and `scope` come together, so that the check always knows what a level is about. Both are optional: a v17 draft without them is a v16 draft.

## D3. The scope

- [Inferred] A context or container view is about a `system`; a component view about a container type. A context view must show its scope, since a context view is a picture of that system among its neighbours. A container or component view need not: its scope can be left implicit, or drawn as a containment's outer box.
- [Inferred] "Below the scope" follows `parent` only, with the walk rule of `figure-mixed-levels`. Units are not read: a unit's enclosure is by path and would let a directory's unit place a package under a system the draft never said holds it. Only container-type elements of a container view and modules of a component view are bounded; people, externals and other systems are neighbours.
- [Inferred] A scope naming no element gets 2.24's `unresolved-reference` and stops the other findings for that view, as 2.24 does for a view entry.

## D4. Two meanings of "level"

- [Observed] Before this version "level" meant enclosure in rule `figure-mixed-levels` (2.33): its detail says "draw one level", meaning "do not draw a part beside a part within it". Containment groups also sit "at level 1, 2 or 3" (2.23, 2.24, 2.35), a drawing depth. 2.24 said "A view is one level", meaning a flat view.
- [Inferred] The new text names the three and says neither check reads the other: the level checks read types and the scope's `parent` chain; the advice reads enclosure and never `level` or `scope`. 2.24's sentence is amended in place to say "one level" means flat.
- [Inferred] Rejected: a `figure-mixed-levels` version 2 that skips the pair (scope, part). It would silence advice that is right: a container view that draws its scope beside its parts, with no `contains` arrow, does hide that one holds the other. The brief tells the author to draw the scope as a containment's outer box, with `contains` arrows, or not at all, which clears the advice.

## D5. Zoom links

- [Inferred] Target: the first diagram, in draft order, whose view's `scope` is the element and whose figure renders as a `<figure>` outside every collapsible section. Outside, because a fragment target inside `<details>` strands keyboard readers (the AGENTS.md guardrail); a notice is no target. The address follows 2.24's "as shown in" link rule, landing on the `id="figure-<diagram>"` of 2.15.
- [Inferred] Two places:
  - the list of every component and relationship, which every figure has and which is the drawing's text alternative. This link exists even where the drawing carries no layer (a 1048 px drawing);
  - the 2.40 HTML layer over the drawing, so that the box itself is the link. The SVG stays inert and no script is used (bead "Approach").
- [Inferred] The layer keeps 2.40's class names, so a walked page's bytes do not change when it gains no zoom link, and one layer serves both. A zoom-only layer has empty boxes and passes the pointer through, so the drawing's own hover emphasis stays. Containment figures, which 2.40 never layered, get one box per group in preorder.
- [Inferred] Keyboard: the zoom link is an `<a href>`, after the box's other links and before the figure's lists, with a `:focus-visible` outline that does not rely on colour. This is the bead's acceptance criterion 1.
- [Inferred] The zoom target figure gets `data-view-level` and `data-view-scope` before its `id` (2.15 keeps `id` last), so a test can find the target's level.

## D6. Bytes that move

- [Inferred] Unchanged: drafts of schema v16 or earlier (but for the `field-version` findings), and v17 drafts without `level` or `scope` (but for bytes naming the schema or digest).
- [Inferred] For a v17 draft: the three findings; the two attributes on a levelled view's figure; on a page holding a figure that draws an element with a zoom target, the list item's link, the wrapper, the layer and the style rules; that page's size-report measures and the rendered-design packet.
- [Inferred] Never: `machine.json`, `dossier.json`, check records, `run-advice.json`, the reading ledger, figure fit, figure advice, a paragraph, a drawing, provider mode.

## D7. Composition

- [Inferred] 2.24: elements, relationships and views are unchanged; the level adds a check over the types 2.24 already requires. The migration still yields v12.
- [Inferred] 2.33: the figure plan names diagrams alone and is never compared with `level`; a planned figure's `kind` is no level. The figure advice is unchanged (D4).
- [Inferred] 2.35: base elements are typed (D2); `view-level` at `base` is computed only where the base map is established and the view has no `base-reference` or `base-conflict` finding, as 2.35 computes its own. Base elements are never zoom targets and never "below" a scope, even when a `group` draws them inside an element.
- [Inferred] 2.40: a walked figure with zoom links has one wrapper and one layer; each box holds badge, `walk-source`, then `zoom-link`. The 1048 px exclusion is the same, for the same reason: only an unscaled drawing lets the layer's boxes match.
- [Inferred] 2.36 to 2.39 and 2.42 to 2.44 read no view level and are untouched. 2.44's corroboration decides arrows, not boxes.

## D8. What the code change must do

- [Inferred] In `packages/polaris-dossier/src/draft-schema.ts` (the draft schema; the bead's note says so): schema v17 with `level` and `scope`; brief v25.
- [Inferred] Check: the type table, the scope rules and the parent walk, the finding order, and `field-version` in v12 to v16.
- [Inferred] Render: the zoom target, the list link, the layer (shared with walks, extended to containment groups), the two attributes, the style rules only where a zoom link is.
- [Inferred] Tests, per the bead: a view with a wrong-level element refused with `view-level`; zoom link targets exist; keyboard reachability in the browser tier; the provider golden byte-identical. Literal conformance tests per scenario and rule-6 mutants (drop a type from the table, skip the parent walk, link a figure to itself, put the layer on a 1048 px drawing).

## Review

[Observed] No review has read this version. The lead arranges one; this change dispatches none.
