# Design — view levels, scope and zoom links (version 2.47)

[Inferred] Version 2.47 of REQ-polaris-generation-034, for syzygy-3efd.39. It is drafted on `agent/syzygy-3efd.39` over imports corroboration 2.45 (`dossier-imports-corroboration`, row A-273, tag `polaris-dossier-imports-corroboration-v2.45` once merged), which stands on rough-edge markers 2.44, the newest REQ-034 on main.

## D1. The version label, the predecessor and the numbers

- [Observed] This change first claimed 2.45 over imports corroboration 2.44, and moved to 2.47 when rough-edge markers took 2.44 on main (A-338, PR #1047), pushing imports corroboration to 2.45, while 2.46 is claimed by open PR #1045 (URL lean run, A-340); its tag is `polaris-dossier-view-levels-v2.47`.
- [Observed] Numbers. The newest draft schema in the 2.45 text is `polaris-dossier-local-draft-v16` (2.40, walks) and the newest brief `polaris-dossier-brief-v24`; 2.42 to 2.45 took none. So this change takes **draft schema v17** and **brief v25**.
- [Observed] The build script (`docs/evidence/syzygy-3efd-39/view_levels_build_spec.py`) edits the predecessor's bytes at anchors it asserts occur exactly once:
  - 2.24's sentence that a view names no level or zoom target;
  - 2.40's sentence that a page holding no walk carries none of the walk's style rules, which gains the zoom-layer exception (review 1, finding 2);
  - the end of 2.40's earlier-schema paragraph ("No migration yields a v16 draft."), after which the six new paragraphs go;
  - the four Form lines, each extended after its 2.45 sentence.
  The scenarios precede the one Form line. If another REQ-034 version lands first, the script is re-run over it with the predecessor path changed.
- [Observed] First built over the 2.44 text that review 1 of 2.44 read (sha256 `5b13a399…3955`; this spec then `056638df…f8e5`). Rebuilt by the same script, unchanged, over 2.44 as repaired after that review (sha256 `d60afad88bc72dde63ad597d2b9a5fa646143e4b68f89202ffcaff8742068c4d`): every anchor still occurs once. That build hashed to `208252fd2094fd5ad725c6d03b0c51884d2017a7fdb5f8217ffeb53720ab45f4` (311 scenarios), the bytes review 1 read. Repaired after review 1 by edits to the same script over the same 2.44 bytes, this spec hashes to `50eefcc8e96886bd39c66b9fcc09300b4c308b90d4b8a760e1f0f9ad37e58afa`; REQ-034 goes from 302 to 314 scenarios.
- [Observed] Rebuilt by the same script, with only the version labels changed, over imports corroboration 2.45 (sha256 `a7b05a96…537b`), which is 2.44 rebuilt over rough-edge markers: every anchor still occurs once. This spec now hashes to `ccf8e2d4cdcb389faaafff9ff1abd526b947e1efd4bdd34a5e767dbfa38fc41c`; REQ-034 goes from 309 to 321 scenarios. No review has read this rebuild.

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

- [Inferred] Target: the first diagram, in draft order, that is the element's own view and whose figure renders as a `<figure>` outside every collapsible section. A view is an element's own view only where its level shows what lies inside the element: a `container` view of a `system`, a `component` view of a container-type part. A context view is about its system but shows it from outside, so it is never a zoom target; without this, the ordinary C4 order (context view first) made the context view its own system's target and the system's zoom-in link vanished (review 1, finding 1). Outside, because a fragment target inside `<details>` strands keyboard readers (the AGENTS.md guardrail); a notice is no target. The address follows 2.24's "as shown in" link rule, landing on the `id="figure-<diagram>"` of 2.15.
- [Inferred] Two places:
  - the list of every component and relationship, which every figure has and which is the drawing's text alternative. This link exists even where the drawing carries no layer (a 1048 px drawing);
  - the 2.40 HTML layer over the drawing, so that the box itself is the link. The SVG stays inert and no script is used (bead "Approach").
- [Inferred] The layer keeps 2.40's class names, so a walked page's bytes do not change when it gains no zoom link, and one layer serves both. A zoom-only layer has empty boxes and passes the pointer through, so the drawing's own hover emphasis stays. Containment figures, which 2.40 never layered, get one box per group in preorder; the stylesheet draws them, like graphs, at their laid-out width, so the boxes' coordinates hold.
- [Inferred] Style rules (review 1, finding 2). A figure with no walk takes the wrapper `walk-figure zoom-only`; a walked figure keeps 2.40's `walk-figure`, byte for byte. A page holding a `zoom-link` element carries three sets: 2.40's positioning rules (once, if it also holds a walk), the zoom rules, and pass-through rules for a `zoom-only` layer. 2.40's other rules (pointer, outline, `:target`, badge, `walk-source`) must match nothing inside a `zoom-only` wrapper, by their own selectors or by pass-through rules that win over them; a page with no `zoom-only` wrapper carries 2.40's rules byte for byte, so v16 parity holds. 2.40's "a page holding none SHALL NOT" is amended in place to allow the positioning rules on a page holding a zoom link and no walk. The trigger is the layer's `zoom-link` element, never a list's `zoom-text` link (note 11).
- [Inferred] Keyboard: the zoom link is an `<a href>`, after the box's other links and before the figure's lists, with a `:focus-visible` outline that does not rely on colour. This is the bead's acceptance criterion 1.
- [Inferred] The zoom target figure gets `data-view-level` and `data-view-scope` before its `id` (2.15 keeps `id` last), so a test can find the target's level.

## D6. Bytes that move

- [Inferred] Unchanged: drafts of schema v16 or earlier (but for the `field-version` findings), and v17 drafts without `level` or `scope` (but for bytes naming the schema or digest).
- [Inferred] For a v17 draft: the three findings; the two attributes on a levelled view's figure; on a page holding a figure that draws an element with a zoom target, the list item's link, the wrapper (the `zoom-only` form for a figure with no walk; a walked figure's wrapper keeps its bytes), the layer and, on a page holding a `zoom-link` element, the three sets of style rules; that page's size-report measures and the rendered-design packet.
- [Inferred] Never: `machine.json`, `dossier.json`, check records, `run-advice.json`, the reading ledger, figure fit, figure advice, a paragraph, a drawing, provider mode.

## D7. Composition

- [Inferred] 2.24: elements, relationships and views are unchanged; the level adds a check over the types 2.24 already requires. The migration still yields v12.
- [Inferred] 2.33: the figure plan names diagrams alone and is never compared with `level`; a planned figure's `kind` is no level. The figure advice is unchanged (D4).
- [Inferred] 2.35: base elements are typed (D2); `view-level` at `base` is computed only where the base map is established and the view has no `base-reference` or `base-conflict` finding, as 2.35 computes its own. Base elements are never zoom targets and never "below" a scope, even when a `group` draws them inside an element; nor are they ever a scope, so a context view over a base map selects the model's `system` element as well, drawn beside the root's box (review 1, note 9). [Inferred] The scope's `unresolved-reference` detail repeats the scope only where it is a well-formed identity and gives the path otherwise, as 2.24 does for an entry, so a scope written as a base path enters no detail (note 6).
- [Inferred] 2.40: a walked figure with zoom links has one wrapper and one layer; each box holds badge, `walk-source`, then `zoom-link`. The 1048 px exclusion is the same, for the same reason: only an unscaled drawing lets the layer's boxes match.
- [Inferred] 2.36 to 2.39 and 2.42 to 2.45 read no view level and are untouched. 2.45's corroboration decides arrows, not boxes, and 2.44's rough-edge page draws no figure.

## D8. What the code change must do

- [Inferred] In `packages/polaris-dossier/src/draft-schema.ts` (the draft schema; the bead's note says so): schema v17 with `level` and `scope`; brief v25.
- [Inferred] Check: the type table, the scope rules and the parent walk, the finding order, and `field-version` in v12 and v14 to v16.
- [Inferred] Render: the level-aware zoom target, the list link, the layer (shared with walks, extended to containment groups, `zoom-only` wrapper without a walk), the two attributes, the three sets of style rules only where a `zoom-link` element is.
- [Inferred] Tests, per the bead: a view with a wrong-level element refused with `view-level`; zoom link targets exist; keyboard reachability in the browser tier; the provider golden byte-identical. Literal conformance tests per scenario and rule-6 mutants (drop a type from the table, skip the parent walk, link a figure to itself, put the layer on a 1048 px drawing).

## Review

[Observed] Review 1 (`docs/reviews/syzygy-3efd-39/R-VIEW-LEVELS-SPEC-1-RAW.md`, fresh context, over `88180dc69`, spec sha256 `208252fd…b855`) records `REVISE` (line 3) with two blocking findings and nine notes. Each is repaired; none is overruled. No review has read the repaired bytes (sha256 `50eefcc8e96886bd39c66b9fcc09300b4c308b90d4b8a760e1f0f9ad37e58afa`); under D10 no confirmation round is run.

| Finding | Disposition |
|---|---|
| 1 (blocking): the zoom target ignores the level | Repaired. An element's own view is a `container` view of a `system` or a `component` view of a container-type part; a context view is never a zoom target. Scenario "A box whose element has its own view links to it" states the draft order (`ctx` first); new scenario "The zoom target is the first rendered container view, never a context view" (context first, a collapsed container view passed over, two container views, first wins). The brief paragraph says which view a box zooms to (D5). |
| 2 (blocking): no stylesheet obligation for a zoom-only layer | Repaired. `zoom-only` wrapper, three sets of rules, 2.40's other rules kept off a `zoom-only` layer, 2.40's "SHALL NOT" amended in place, the bytes sentence names the rules; new scenario "A walked figure and a zoom-only figure share one page" (D5, D6). |
| 3: "a drawing 2.40 would let carry a walk" excludes containment | Repaired: "the figure, of a graph kind or `containment`, renders as a drawing under the conditions version 2.40 states for a walk's figure", and a containment drawing is drawn at its laid-out width. |
| 4: new rules without a scenario | Repaired for (a), (c), (d): new scenarios on a containment layer and on target selection. (b) is in the first new scenario's `more`-to-`parts` relative address; (e) to (h) are stated rules left to the code change's literal tests. |
| 5: two imprecise scenarios | Repaired: the four views are named, with literal details; the no-target scenario names both views and the one figure that carries the attributes. |
| 6: the scope's `unresolved-reference` detail | Repaired: the detail repeats the scope only where it is a well-formed identity, and gives the path otherwise (D7). |
| 7: "v12 to v16" | Repaired: "v12 and v14 to v16" in the proposal, D8 and the re-added row A-274. |
| 8: package and index prose | Repaired: the package README says "the bytes the row binds"; the index row carries the semantic-delta link. |
| 9: a context view over a base map | Repaired: the spec and brief say a base element is never a scope, so such a view selects the model's `system` too (D7). |
| 10: the 1048 px premise | Repaired: "a layout supplied to check draws `ctx` 1048 px wide (the readable layout lays out no figure that wide)". |
| 11: "zoom link" names both links | Repaired: the style rules are keyed on a `zoom-link` element; a page whose only link is `zoom-text` carries none of the zoom rules. |
