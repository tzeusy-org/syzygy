# R-VIEW-LEVELS-SPEC-1 — review of REQ-polaris-generation-034 version 2.45 (view levels, scope and zoom links)

Verdict: REVISE
Reviewed commit: 88180dc69
Spec sha256: 208252fd2094fd5ad725c6d03b0c51884d2017a7fdb5f8217ffeb53720ab45f4

Subject: `openspec/changes/dossier-view-levels/` at 88180dc69 (spec installed at 7031a83d, row A-274). Predecessor: `openspec/changes/dossier-imports-corroboration/proposed/polaris-generation/spec.md`, sha256 `d60afad88bc72dde63ad597d2b9a5fa646143e4b68f89202ffcaff8742068c4d` (recomputed this session, matches SEMANTIC-DELTA and design D1). Line numbers below are of `openspec/changes/dossier-view-levels/proposed/polaris-generation/spec.md` unless another file is named.

Method: `diff` of the predecessor and the new spec (hunks at 1, 3, 138, 294-305, 1975-2027, 2030-2032, 2034: one amended 2.24 line, six added paragraphs, nine scenarios, the Form lines; matches SEMANTIC-DELTA's account). Scenario count by `grep -c '^#### Scenario:'`: 302 to 311 [Observed]. Each new rule was read against the 2.24 model and view paragraphs (lines 138-146), rule `figure-mixed-levels` (line 258), the 2.35 base findings (line 266), the 2.40 walk paragraphs (lines 284-292) and the figure-fit and 2.15 id paragraphs (lines 42, 310).

## Blocking findings

### 1. The zoom target ignores the level, so in the ordinary C4 case a context view is its own system's zoom target and the bead's zoom-in link does not exist (blocking)

- Where: spec line 300 ("its zoom target is the first such diagram, in draft diagram order, whose figure renders as a `<figure>` ..."); same rule in `design.md:45` (D5), `proposal.md:21`, the brief paragraph at line 302 ("Every other figure that draws the scope as a box then links that box ... to the view"), and scenario "A box whose element has its own view links to it" (line 1993-1997).
- Evidence [Observed]: "An element has its own view where the view of a graph or containment diagram of a v17 draft carries a `scope` naming it, and its zoom target is the first such diagram, in draft diagram order ..." The rule reads `scope` alone, never `level`. A context view and a container view are both about a `system` (line 294: "The scope of a context or container view is of type `system`"), and a context view must show its scope (line 298, `view-scope` "a context view shows the system it is about").
- Consequence [Inferred]: in the canonical draft, a context view `ctx` (scope `app`) followed in draft order by a container view `parts` (scope `app`), `app`'s zoom target is `ctx` itself. `ctx` then gives `app` no zoom link ("in every such figure but the zoom target itself"), and any other figure drawing `app` (including `parts`, if it draws `app` as a containment's outer box, which the brief recommends) links *out* to the context view under the text "Zoom in: ...". The bead's link from a system to the view of its parts exists only when the author happens to place the container view earlier in draft order than the context view.
- Scenario defect [Observed]: scenario line 1995 introduces `ctx` before `parts` and never states their draft diagram order, yet its THEN (line 1996) requires `ctx`'s `app` box to link to `deep-dives/runtime.html#figure-parts`. Under the rule as written that outcome holds only if `parts` precedes `ctx` in draft order, which the WHEN does not say; read in the order given, the scenario contradicts its rule.
- Repair: make the target level-aware, for example "the first such diagram whose view's level is `container` for an element of type `system` and `component` for an element of a container type", so a context view is never a zoom target; or state that a context view never makes its scope's own view. State the draft order in scenario 1993 and add a scenario where a context view about `app` precedes the container view about `app` and the link still goes to the container view. Amend the brief sentence to say which view.

### 2. A page with zoom links and no walk has no stylesheet rule that positions the layer, and 2.40 forbids carrying one; on a mixed page the walk rules contradict the zoom-only layer's pointer pass-through (blocking)

- Where: spec line 300 (the zoom layer and its stylesheet sentence) against 2.40 at line 288.
- Evidence [Observed]: 2.40, line 288: "The pages' stylesheet SHALL position the layer as stated, highlight the box whose id is the page's target ..., outline a box under the pointer ..., make each `walk-source` link fill its box ...; a page holding at least one walk SHALL carry those style rules, and a page holding none SHALL NOT". 2.40, line 292: "On a walked figure the layer, not the drawing, receives the pointer". 2.45, line 300: a zoom-only figure carries "the layer version 2.40 states" under the same class names, "its layer passes the pointer to the drawing everywhere but over a zoom link", and the stylesheet sentence requires only that each zoom link be set at the top right of its box, its cursor, its `:focus-visible` outline, and that the drawing stay visible.
- Consequence [Inferred]: (a) On a page holding zoom links and no walk, nothing requires the rules that lay `walk-layer` over the drawing and size each `walk-node` absolutely, and 2.40's "SHALL NOT" (which 2.45 does not amend) forbids the walk rules there; an implementation conforming to both texts leaves the layer as inline spans after the drawing, with the zoom links not over their boxes. (b) On a page holding one walked figure and one zoom-only figure, 2.40's rules (layer receives the pointer, outline the box under the pointer) are carried and, keyed on the shared class names, apply to the zoom-only layer too, contradicting 2.45's pass-through and the drawing keeping "its own emphasis of a node under the pointer". (c) The pass-through is required in prose but in no stylesheet obligation, so no "carry those rules" sentence names it. D6 and line 304 say a zoom link moves "the style rules" without saying which.
- Repair: state the full zoom stylesheet obligation: the layer-positioning rules (2.40's "position the layer as stated") on every page holding a zoom layer, the pass-through rule for a layer of a figure with no walk, and how the 2.40 pointer and target rules are scoped so they do not reach a zoom-only layer (for example a distinguishing class or attribute on a walked figure's wrapper, which would change a walked page's bytes and must then be said in D6/line 304); and amend 2.40's "a page holding none SHALL NOT" to except the positioning rules on a page holding a zoom layer. Add a scenario for a page holding a walked figure and a zoom-only figure.

## Notes (non-blocking)

### 3. "A drawing that version 2.40 would let carry a walk" excludes every containment figure, which the next sentence then layers (note)

- Where: line 300.
- Evidence [Observed]: 2.40 (line 284) lets a walk's `figure` name only a diagram "whose `kind` is one of the six graph kinds", so no containment figure is one "version 2.40 would let carry a walk"; line 300 then says "for a containment figure it holds one box ... for each group". The enumerated conditions that follow ("the figure produced, its place rendering the draft's content, ...") carry the intended meaning, but the lead clause contradicts it. Containment drawings are drawn at their laid-out width (line 42), so the coordinate premise does hold for them [Inferred]; the spec does not say so, and 2.40's own premise sentence names only graph figures.
- Repair: say "where the figure, of a graph kind or `containment`, renders as a drawing under the conditions version 2.40 states for a walk's figure: ...", and state that a containment drawing is never scaled at a width other than 1048 px.

### 4. Several new rules have no scenario (note)

- Evidence [Observed], from the nine scenarios at lines 1975-2026: no scenario covers (a) a containment figure's layer, one box per group in preorder, at all; (b) a same-page `#figure-<target>` address; (c) a scoped view whose figure sits inside a collapsible section or is a notice, so that a later figure becomes the target (the non-produced case at 2005 shows only "no target"); (d) two rendered views with one scope (first-in-draft-order selection, see finding 1); (e) the `view-scope-outside` gate on an `element-parent` or parent `unresolved-reference` finding; (f) one view drawing more than one kind of this version's finding, to fix the stated order `unresolved-reference`, `view-scope`, `view-level`, `view-scope-outside`; (g) a v16 view carrying only one of the two members (one `field-version` finding); (h) the `data-view-*` attributes' place relative to 2.35's attributes.
- Repair: add scenarios, at least for (a), (c) and (d), which are new render behaviour.

### 5. Two scenarios are not precise enough to test literally (note)

- Line 1983 (scenario "A view's scope is of its level and bounds what it shows"): the first view (`component`, scope `app`) has no stated selection, so whether it draws findings beyond `view-scope` is open, and its detail is described ("the detail naming a system and the five container types") rather than given as the literal of line 298, while the Form's Oracle line asks for literals.
- Line 2007 (scenario "No zoom target, no zoom link"): "rendered as they are with both views' `level` and `scope` removed but for the two attributes on the figures of views that carry them" — the WHEN names one view in the first draft (the only one scoped to `app`), so "both views" has no clear referent, and that view's diagram is not produced and so has no figure for the attributes.
- Repair: give the first view's elements and the literal detail; name the second view in the WHEN of 2005 or reword the THEN.

### 6. "Every identity a detail names is a handle" is not true of the scope's `unresolved-reference` detail as written (note)

- Where: line 298.
- Evidence [Observed]: the `unresolved-reference` at `view.scope` takes "the detail version 2.24 gives that finding for an entry that names no element", which is `` <identity>: no element of the model has this identity ``, with "the path where it has no well-formed identity" (line 140). A `scope` is any string (line 294: only "a `scope` that is not a string" is a `schema` finding), so the detail echoes a draft-supplied string whenever it is a well-formed identity, and falls back to the path otherwise. The 2.35 screening intent (design D2: "no draft path reaches a detail") is met only through that 2.24 fallback, and only if a base path such as `src/x` is never a well-formed identity [Unknown: the handle grammar was not re-read for `/` and `.`].
- Repair: say explicitly that the scope is named in the detail only where it is a well-formed identity, and the path otherwise, as 2.24 states; or confirm in design D7 that no base path is a handle.

### 7. "`field-version` in schemas v12 to v16" overstates the spec, which names v12, v14, v15 and v16 (note)

- Evidence [Observed]: spec line 298: "In a draft of schema v12, v14, v15 or v16 ... A draft of schema v13, or of v11 or earlier, admits no `view` and takes no finding of this version." `proposal.md:20` and row A-274 in `.syzygy/governance/decisions/AGENT-ADOPTIONS.md` say "in schemas v12 to v16".
- Repair: say "v12 and v14 to v16" in the proposal and, by a new row or an editorial note, in the ledger.

### 8. Package and index prose (note)

- `README.md:14` (package): "the spec still hashes to the reviewed bytes" — no review has read these bytes (design "Review", row A-274 both say so honestly). The checker pins the installed bytes, not reviewed ones. Repair: "the bytes the row binds".
- `openspec/README.md` row for `dossier-view-levels` carries three cells where its neighbours (`dossier-imports-corroboration` and earlier) carry four, the fourth the semantic-delta link [Observed]. Repair: add the link.
- Row A-274 is honest that no review read the version ("No review has read this version") [Observed]; the commit message and design "Review" agree.

### 9. A context view over a base map cannot be about the root it draws (note)

- Where: lines 294, 298, 302.
- Evidence [Observed]: a base element "has ... the type of the element it stands for: the repository root `system`", but `scope` names "one element of the model" and a context view must select its scope. So a context containment of the directory map, which always shows the root (line 266, `base-root`), must also select a model `system` element to pass, drawing the system twice (once as Syzygy's root box, once as the draft's element) [Inferred]. Scenario 1987 builds exactly that. The brief paragraph does not tell the author that a base element cannot be a scope.
- Repair: state the consequence in the paragraph and the brief, or let a context view over the directory map satisfy "shows its scope" by the root.

### 10. The 1048 px case inherits a premise the readable layout never produces (note)

- Line 2001: "in a second draft `ctx` is drawn 1048 px wide". Line 42 says the readable layout "lays out no figure that wide ... so on a page this exception matches no figure". The 2.40 scenario at line 1931 has the same wording; the figure-fit scenario at line 545 says the honest form ("which only a layout other than the readable one, supplied to check, gives"). Repair: say the layout is supplied, as line 545 does.

### 11. "zoom link" names both links, so the style-rule trigger is ambiguous (note)

- Line 300: "a page holding at least one zoom link SHALL carry those rules, and a page holding none SHALL NOT". Both the list's `zoom-text` and the layer's `zoom-link` are called zoom links ("The link is given in two places"). A page whose only zoom link is a `zoom-text` (a 1048 px drawing; or a drawing failing inertness) either must or must not carry rules that position nothing. Repair: key the rules on a `zoom-link` element.

## Criteria with no finding

- Type table [Observed]: line 294 admits, per level, exactly design D2's table (context: system, external, person; container: all but module; component: all but system); scope types agree with D3; scenario 1975 checks container and context refusals and a clean component view.
- Two meanings of "level" [Observed]: line 296 reconciles 2.33's enclosure (`figure-mixed-levels` reads `parent` and units, line 258) with the abstraction level; scenario 2011 is consistent with the rule at line 258 (a containment drawing children inside their parent says it holds them; a graph without `contains` does not).
- Migration [Observed]: line 304 keeps 2.24's migration to v12 and states no migration yields v17; nothing assigns a level; 2.38's and 2.43's parity statements (line 146) are untouched by the diff.
- 2.44 [Observed]: corroboration acts on relationships and arrows; no new rule reads `importFacts` or `witness`.
- 2.35 sinks [Inferred]: `data-view-scope` is emitted only on a draft that passed check, so its value is a resolved element identity; `data-view-level` is one of three literals; the zoom link's title and label are text the figures already render, withheld labels being Syzygy's words (2.40, line 288). Only the finding detail in note 6 depends on a fallback.
- VIS-2 [Inferred]: a zoom link carries no claim, marking, citation or count (line 300 last sentence, line 304); `level` and `scope` are declared "no claim block" and carry no label. Nothing Unknown is rendered as Observed. A zoom target never depends on evidence, and a base element (Syzygy's Observed structure) never takes a link.
- Numbering [Observed]: schema v17 and brief v25 follow v16 and v24 of 2.40 (lines 284, 290); scenario census 302 to 311 and `PROJECT-STATUS.md` "658 scenarios" (649 + 9) agree; `VIEWLVL_SUBJECTS` in `scripts/check_spec_reconciliation.py` pins the spec's sha256 recomputed above.
- Form lines [Observed]: each of the four extensions (lines 2030-2034) names the 2.45 findings, links, layer and keyboard order; they agree with SEMANTIC-DELTA's quoted text.
