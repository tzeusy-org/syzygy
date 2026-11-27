# Design — views over a derived base (version 2.34)

[Inferred] Version 2.34 of REQ-polaris-generation-034, for syzygy-3efd.38. It was drafted and reviewed on `agent/syzygy-3efd.38` over the version 2.24 text (system model), then rebuilt over the version 2.33 text (`dossier-figure-plan`, row A-65, tag `polaris-dossier-figure-plan-v2.33`), as D1 and D12 state. The code of versions 2.16 to 2.33 has not all landed, so every code site named in D10 must be re-located on the base the implementation starts from.

## D1. The version label

- [Observed] This change was drafted as 2.NN with schema v13 and brief v19 over 2.24 while syzygy-3efd.40 (figure plan) was drafted in parallel. Main then took worth-knowing 2.26, brief terminology 2.29 and question-kind floor 2.32 (schema v13, brief v21), and the figure plan adopted as 2.33 (row A-65, schema v14, brief v22).
- [Inferred] So, as the lead directed, this change adopts second: it is rebuilt over 2.33 as version 2.34, draft schema v15 (schema v14 plus `base`) and brief v23. The rebuild changed no rule of the reviewed text beyond the composition stated in D12.

## D2. What the base is grounded in

- [Observed] Version 2.9 (and 2.14) publishes four computed map pages. Two of them are structural and drawn from facts this text already defines:
  - the directory map draws the derived-structure record: `tree-root`, `top-level-unit` and `contains` facts (`_tree-root`, `_tree-unit-<k>`, `_tree-contains-<k>`);
  - the unit map draws the render's `manifestFacts` member: `package` and `module` facts (`_manifest-<k>`).
- [Observed] Both are derived at the render from the pinned tree, never from a stored check record. Check derives the same record and member for the same revision.
- [Inferred] The fact identities are positional (`<k>` counts in path order), so they move when a directory or manifest is added. A draft therefore names a base element by its path: `.` or a top-level directory for the directory map, and a manifest file's path for the unit map. One manifest file can declare several packages or modules, so a unit-map path names all of them, and `<path>#<k>` names the k-th alone; a display name and an arrow end need a path naming exactly one (review finding 4). Paths are what the record and the member carry, and what an author can read off the map page.
- [Inferred] The CI pipeline map and the infrastructure map are left out of this version (D11). Their elements are jobs, triggers and declared resources, not the structural parts the model's views draw, and a base over them would need its own path grammar.

## D3. The narrow exception, and why it stays inside the rule's purpose

- [Observed] The predecessor says: "Nor can it imitate a computed map of version 2.9: no draft member reaches a map page, a map's figures or `computedMaps`, and no figure of a draft renders on a map page. A draft cannot name, place, alter, suppress or add to the derived figure or its record". Its stated reason, in the same paragraph, is "so a curated figure cannot imitate the computed one". The requirement's warrant for it is contract RFC7-28.
- [Observed] RFC7-28 ("Curated diagrams", `.syzygy/governance/contracts/rfcs/RFC-0007/rendering-and-surface.md`:101) reads: "Curated diagrams claim no reproducibility-from-snapshot and must not imitate the computed map; embedded computed visuals inherit the map surface's obligations; curated/computed provenance is a machine-readable attribute on every visual." It cites trust-and-evidence.md and VIS-7.
- [Observed] The doctrine behind it:
  - `trust-and-evidence.md`: "**Rendering may blend the layers**, provided provenance is available where the claim is consumed (hover, query, API field) and inferred structure stays visually distinct from observed structure." and "A speculated future component must never look like an existing one."
  - VIS-2: "No evidence means Unknown, not success."
  - VIS-7: "The observatory itself must be trustworthy."
- [Inferred] A view over a base is the case RFC7-28 already names: an embedded computed visual inside a curated figure. The exception stays inside every one of these:
  - Not imitation. The figure stays `data-visual-provenance="curated"`, and every computed element inside it carries `data-visual-provenance="computed"` with its fact identity, so provenance is machine-readable on every element, as RFC7-28 requires. The chip names the map and links to it.
  - The map's obligations travel with the elements: its note (rules and revision, RFC9-38) follows the tally, and the chip and hidden items keep the denominator (RFC9-44).
  - Layers stay distinct, in the drawing and not only in attributes (review finding 5). A base element is drawn only in Syzygy's label, mark and line style, solid only where its fact renders Observed, and with a double border that no draft element takes, explained by its own legend entry. A display name is drawn outside the box, in the name's own marking. `base-label` refuses a draft element, display name or `contains` arrow that takes the name of a base element in the same figure, so an authored Inferred box can never sit beside a derived Inferred box of the same name.
  - Unknown stays Unknown (VIS-2). An unknown base renders a notice, never a figure drawn from the draft's elements alone.
  - Read-only. No draft member writes to the map, the record, `manifestFacts` or `computedMaps`. The map page is byte for byte what the render gives with no draft.
- [Inferred] So the exception does not cross a doctrine rule. The clause is amended in place by one sentence naming the exception and pointing at the new paragraphs. The sentence that follows ("A draft cannot name, place, alter, suppress or add to the derived figure or its record") now opens "Apart from that read-only reading,": a `directories` base names paths of that record's facts, so the sentence could not stay true unqualified, and everything else it forbids still holds.

## D4. Operations

- [Inferred] The bead asks for "group, hide with a reason, rename for display and add cited runtime arrows". Each is bounded so that it cannot relabel a derived element:
  - `hide` and `select`/`restReason`: what one figure shows. A reason is required ("hiding needs a reason", the bead's exclusion) and is the author's words about the figure, not a claim about the system, so it takes no label or citation.
  - `group` (containment views only): places base elements inside one of the draft's own elements. The nesting is the draft's claim and is read by `relation-witness` as an element's `parent` is (2.24), so it can be witnessed only where a rule row joins the two units. Today no row joins a package or directory to a model element without a unit, so a group nesting stays Unknown.
  - `names` ("rename for display"): never a relabel. The box reads Syzygy's label alone. The name is drawn as its own italic line, `called <name>`, below the box and outside its border, in the name's own marking, and is a claim of the draft with its own anchor, marking and citations. The lead's constraint, "every derived element stays in Syzygy's words", holds.
  - Arrows: a cited relationship may have a base end `{"map", "path"}`. It is the draft's typed claim (relation types, 2.19) and is witnessed by the same rule where its units allow.
- [Inferred] `hide` and `select` are alternatives, never combined, so every left-out element has exactly one stated reason and the hidden items' counts sum to what the figure leaves out (review finding 8a).
- [Inferred] A graph view draws the directory map's own `contains` facts among the elements it shows, in Syzygy's words, as the map draws them. A containment view of the directory map nests each shown directory in the root by its `contains` fact, so the root is always shown and never hidden or grouped; a `select` that leaves it out is `base-root` (review finding 3).
- [Inferred] A containment view's figure is 2.24's parent expansion with base elements added (review finding 2): grouped base elements follow their element's model children, and the root (directories) or each ungrouped unit (units) follows the model's top-level groups. A `group` element must be selected and at level 1 or 2 (`base-group`), so no figure reaches a fourth level.

## D5. The chip

- [Inferred] "Every pruned view prints what it leaves out" (the bead). The chip prints for every base view, pruned or not, so a reader never has to infer that nothing was left out.
- [Inferred] Its numbers are the render's own, and its remainder is the one the map page itself states (review finding 6): for the directory map, the coverage line's unlisted directories, secret-matched files and submodules; for the unit map, the facts not listed and the manifest files read with no facts or left out for a secret detector. A hidden or unmapped element is therefore never missing from a denominator (RFC9-44). The counts are never names, so no secret-matched path is named.
- [Inferred] For the directory map, `<s>`/`<t>`/`<h>` count top-level directories and the root is stated separately (`with` or `without the repository root`), so no reader adds the root into a directory count.
- [Inferred] The chip is computed and carries `data-visual-provenance="computed"`; no draft member writes it.

## D6. Check and render

- [Inferred] Paths are resolved at check against the record and member check derives. The revision is pinned, so the render's derivation lists the same facts: both are functions of the pinned tree.
- [Inferred] Where the base is not established at check (the tree could not be listed), no base finding is computed, as VIS-2 asks. Where it is not established at the render, the figure is a notice.
- [Inferred] Check and render can disagree when a read fails transiently at check. The render then computes the base findings itself; if any would be reported, the figure is a notice that names no path. So a draft path that names no listed element (possibly a secret-matched one) is never rendered or carried in `machine.json` (review finding 8c). A stale record is established: its elements render Unknown, as on the map page.

## D7. Bounds

- [Inferred] A view's figure stays at most 40 boxes, base elements included (`base-size`). A large map therefore needs `hide` or `select`, and the chip says so.
- [Inferred] `hide` has 20 entries of 40 paths, and `select` 40 paths. A unit map of up to 1,000 listed facts can always be reduced to 40 with `select` and one `restReason`.
- [Inferred] Containment bounds (one to five top-level groups, eight children) are 2.24's `view-shape`, computed over the expansion with base elements included.

## D8. Shared claims

- [Inferred] A base element is no claim, so 2.24's single-claim rule does not apply to it: it is drawn in Syzygy's words in every figure that shows it.
- [Inferred] A display name is a claim keyed by its view (`<diagram>:name:<k>`), so two views naming one path are two claims, each with its own anchor in its own figure, both reviewed. (The draft said a repeated name renders its anchor once; the spec never stated that, and per-view keying makes it unnecessary, review note 9.)

## D9. Rendered bytes that move

[Inferred] Only a schema-v15 view with a `base` moves:
- its figure (base elements, chip, hidden items, note);
- its `machine.json` figure entry (`base`, `provenance`);
- the findings and the check record;
- the brief (v23).

Drafts of schema v14 and earlier keep every byte and their `figureAdvice`, apart from `field-version` in place of `schema` for `base` or a base end in a v12 or v14 draft. A v15 view without `base` renders as in v14. The map pages, `computedMaps` and the provider golden do not change.

## D10. What the code change must do

- [Inferred] Schema v15 in `packages/polaris-dossier/src/draft-schema.ts`, with the `base` member, base ends and the six findings, as literal-case tests of each scenario.
- [Inferred] Resolve base paths in check against the derived-structure record and `manifestFacts` check already derives.
- [Inferred] Expansion and rendering in `apps/three-surface-poc/src/polaris-generation/`:
  - reuse the map renderers' element labels, marks and identities, never a copy;
  - the double border, its legend entry and the display-name line;
  - the chip, the hidden items, the tally sentence and the note;
  - `machine.json`'s `base` and `provenance`.
- [Inferred] Byte tests: every map page with and without a base view, every stored draft re-rendered, the provider golden unchanged. The figure advice skipping base views. Brief v23, and a recorded rule-6 mutation run.

## D11. Residuals

- [Inferred] The CI and infrastructure maps are not bases yet (D2).
- [Inferred] A group nesting of a base element is Unknown today, because no witness row joins a model element without a unit; a later rule version may add one.
- [Inferred] Display names are keyed by view; whether a dossier-wide alias is wanted is a question for the system map (syzygy-ea4w.3).
- [Inferred] Views from a base are one level, as 2.24's are. Levels and zoom are syzygy-3efd.39.

## D12. Composition with the figure plan (2.33)

- [Observed] Version 2.33 makes schema v14 the join of v12 (containment, model, views) and v13 (worth-knowing, question kinds), requires a `figurePlan` naming, per place, the diagram that answers its question, and adds figure advice (`figure-information-floor`, `figure-duplicate`, `figure-mixed-levels`), "a computation over the draft's bytes alone that reads no blob, layout, record or fact", reading each graph or containment as its view's expansion.
- [Inferred] Schema. v15 is v14 plus `base` and base ends. Every v14 rule holds for v15, and every rule that names v14 (or v13 or v14) alone reads v15 too, so the plan, the advice, the worth-knowing mark and the question kinds apply to v15 drafts unchanged. `field-version` is reported for `base` in v12 and v14 drafts, the two schemas that carry views. A v13 draft carries no view, so it takes 2.33's findings only.
- [Inferred] Plan. A base view is a graph or containment diagram with an identity, a home and a kind, so a plan entry names it as any diagram. The base changes neither its home nor its kind, so 2.33's plan check needs no change.
- [Inferred] Advice. The advice reads the draft's bytes alone, and a base view's boxes come from a computed map. Reading the view as its draft part alone would misjudge it, for example calling a figure of 12 directories "a chain of three or fewer". Reading its base would make the advice read a fact, which 2.33 rules out. So no rule reads a base view: `examined` does not count it, no rule advises on it, and `figure-duplicate` compares no figure with it. Whether such a figure carries enough stays the rendered-design review's judgement, as 2.33 already says for every figure. Scenario "Figure advice reads no base view".
- [Inferred] Brief. v23 is v22 plus the derived-base paragraph, placed after v22's figure-plan paragraph, the last of the three paragraphs v22 added.
- [Inferred] Placement. The new paragraphs follow 2.33's last paragraph, before the task-routes paragraph, as each version's block follows its predecessor's. Scenarios: 232 to 250.

## Review

[Observed] One fresh-context review, R-DERIVED-BASE-VIEWS-SPEC-1, read the spec over 2.24 at 7760aede (sha256 `a203e6b7…8448`). Verdict REVISE, 8 blocking findings and 4 notes. The raw is retained verbatim at `docs/reviews/syzygy-3efd-38/R-DERIVED-BASE-VIEWS-SPEC-1-RAW.md`. Every finding is repaired; none is declined. No review has read the repaired bytes, nor the rebuild over 2.33 (D12).

| # | Finding | Disposition |
|---|---|---|
| 1 | `select` and `group` could not be combined | Repaired. `base-conflict` now fires on a second naming within one list kind, or on a `group` path or `names` entry for an element not shown. A grouped path must be shown. Scenario "Select and group together". |
| 2 | Containment expansion flattened 2.24's nesting; element bound and depth undecided | Repaired. The figure is 2.24's parent expansion plus base elements (D4). The `elements` bound with a base is zero to 40. New `base-group` finding for an unselected or level-3 `group` element. Scenario "Group into a third-level element refused". |
| 3 | A directories containment could drop the root through `select` | Repaired. `base-root` also fires at a `select` without `.`. Scenario "Directory containment keeps the root". |
| 4 | A unit-map path can name several elements | Repaired. `<path>#<k>` names one; `names` and base ends need a path naming exactly one, otherwise `base-reference` with its own detail. Scenario "One manifest declaring two packages". |
| 5 | Authored and derived looked alike in the drawing | Repaired (a)–(b). The display name is drawn outside the box as its own line, in its own marking. Base boxes have a double border with a legend entry. New `base-label` finding. Scenarios "Base element keeps Syzygy's words" (amended) and "Draft element taking a base element's name refused". (c), a note: a grouped base box now carries the double border inside a draft box, and the nesting's provenance is in the list and `machine.json`, as trust-and-evidence's "hover, query, API field" allows. |
| 6 | Chip remainder and note did not match the map pages | Repaired. (a) units: the unit map's own remainder (facts not listed, manifest files with no facts, secret-matched manifest files), no per-noun claim. (b) directories: the coverage line's m, S and G, as counts. (c) the note is the map page's note word for word, with each map's opening. (d) directory counts exclude the root, which is stated as `with`/`without the repository root`; singulars fixed. |
| 7 | "Chip links from a deeper page" could not be built | Repaired. 250 listed plus 3 counted, with `select` so the figure stays within 40 boxes, and the hidden item stated. |
| 8 | `hide`+`select` counts and the `machine.json` `base` underspecified; draft paths could be echoed | Repaired. (a) `hide` beside `select` is a `schema` finding; item counts sum to the elements left out. (b) `base` gains `root`, `notListed`, `select`, `restReason`, shown `elements` in figure order, `names` with identity `<diagram>:name:<k>`, and is `{map, established: false, reason}` alone when not established. (c) where check could not read the map, the render computes the findings and, if any would fire, renders a notice naming no path; every `machine.json` path names a listed element. |
| 9 | Smaller ambiguities (note) | Repaired: the directory label keeps the map's `(<count> files)`; the tally counts the draft alone and a second sentence counts the computed boxes and arrows; the hidden-item noun has its own rule; "established at the render" is defined, a stale record included, and `<words>` is the exact span; an all-white-space reason and a `restReason` without `select` are `schema` findings; the cited-arrow scenario rules out a dependency fact; a v11 draft takes no new finding; D8's anchor-once rule is dropped in favour of per-view keying. |
| 10 | Authority (note) | No change needed. The review found the exception within RFC7-28 and not crossing VIS-2; findings 5 and 6 were the gaps, and are repaired. |
| 11 | CG-1b (note) | No change needed. The new scenarios also write fixture paths inside JSON code spans; `check_governance.py` reports 0 FAIL. |
| 12 | Carried text and bookkeeping (note) | Re-derived for the repaired bytes over 2.24 (adc32401, before the rebuild of D12): 1433 of 1442 lines carried, 9 amended, 7 paragraphs and 17 scenarios inserted (207 to 224); `SEMANTIC-DELTA.md` regenerated; `VBASE_SUBJECTS` and `vbase_cases` re-pinned. |
