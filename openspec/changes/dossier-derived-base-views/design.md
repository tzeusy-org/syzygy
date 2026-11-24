# Design — views over a derived base (version 2.NN)

[Inferred] Version 2.NN of REQ-polaris-generation-034, for syzygy-3efd.38. It is drafted on `agent/syzygy-3efd.38`, over the version 2.24 text (`dossier-system-model`, row A-64, tag `polaris-dossier-system-model-v2.24`). The code of versions 2.16 to 2.24 has not all landed, so every code site named in D10 must be re-located on the base the implementation starts from.

## D1. The version label

- [Observed] syzygy-3efd.40 (figure plan, advisories) is rebuilding over 2.24 in parallel. It also plans schema v13 and brief v19.
- [Inferred] So this change uses the placeholder 2.NN, schema v13 and brief v19 until adoption. Whichever of the two adopts second renumbers its label, schema and brief, and rebuilds over the first, as the lead directed.

## D2. What the base is grounded in

- [Observed] Version 2.9 (and 2.14) publishes four computed map pages. Two of them are structural and drawn from facts this text already defines:
  - the directory map draws the derived-structure record: `tree-root`, `top-level-unit` and `contains` facts (`_tree-root`, `_tree-unit-<k>`, `_tree-contains-<k>`);
  - the unit map draws the render's `manifestFacts` member: `package` and `module` facts (`_manifest-<k>`).
- [Observed] Both are derived at the render from the pinned tree, never from a stored check record. Check derives the same record and member for the same revision.
- [Inferred] The fact identities are positional (`<k>` counts in path order), so they move when a directory or manifest is added. A draft therefore names a base element by its path: `.` or a top-level directory for the directory map, and a manifest file's path for the unit map. Paths are what the record and the member carry, and what an author can read off the map page.
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
  - Layers stay distinct. A base element is drawn only in Syzygy's label, mark and line style, and it is solid only where its fact renders Observed. The draft's words (a display name, a group, an arrow) are drawn beside it as the draft's claims, in the draft's marking, never in place of it.
  - Unknown stays Unknown (VIS-2). An unknown base renders a notice, never a figure drawn from the draft's elements alone.
  - Read-only. No draft member writes to the map, the record, `manifestFacts` or `computedMaps`. The map page is byte for byte what the render gives with no draft.
- [Inferred] So the exception does not cross a doctrine rule. The clause is amended in place by one sentence naming the exception and pointing at the new paragraphs. The sentence that follows ("A draft cannot name, place, alter, suppress or add to the derived figure or its record") now opens "Apart from that read-only reading,": a `directories` base names paths of that record's facts, so the sentence could not stay true unqualified, and everything else it forbids still holds.

## D4. Operations

- [Inferred] The bead asks for "group, hide with a reason, rename for display and add cited runtime arrows". Each is bounded so that it cannot relabel a derived element:
  - `hide` and `select`/`restReason`: what one figure shows. A reason is required ("hiding needs a reason", the bead's exclusion) and is the author's words about the figure, not a claim about the system, so it takes no label or citation.
  - `group` (containment views only): places base elements inside one of the draft's own elements. The nesting is the draft's claim and is read by `relation-witness` as an element's `parent` is (2.24), so it can be witnessed only where a rule row joins the two units. Today no row joins a package or directory to a model element without a unit, so a group nesting stays Unknown.
  - `names` ("rename for display"): never a relabel. The box reads `<Syzygy's label> · <name>`, and the name is a claim of the draft with its own anchor, marking and citations. The lead's constraint, "every derived element stays in Syzygy's words", holds.
  - Arrows: a cited relationship may have a base end `{"map", "path"}`. It is the draft's typed claim (relation types, 2.19) and is witnessed by the same rule where its units allow.
- [Inferred] A graph view draws the directory map's own `contains` facts among the elements it shows, in Syzygy's words, as the map draws them. A containment view of the directory map nests each shown directory in the root by its `contains` fact, so the root frames it and is not hidden or grouped (`base-root`).

## D5. The chip

- [Inferred] "Every pruned view prints what it leaves out" (the bead). The chip prints for every base view, pruned or not, so a reader never has to infer that nothing was left out.
- [Inferred] Its numbers are the render's own: `<t>` is every element the map lists at that render, and the map's own "counted and not listed" remainder is added as a further sentence. A hidden element is therefore never missing from a denominator.
- [Inferred] The chip is computed and carries `data-visual-provenance="computed"`; no draft member writes it.

## D6. Check and render

- [Inferred] Paths are resolved at check against the record and member check derives. The revision is pinned, so the render's derivation lists the same facts: both are functions of the pinned tree.
- [Inferred] Where the base is not established at check (the tree could not be listed), no base finding is computed, as VIS-2 asks. Where it is not established at the render, the figure is a notice.

## D7. Bounds

- [Inferred] A view's figure stays at most 40 boxes, base elements included (`base-size`). A large map therefore needs `hide` or `select`, and the chip says so.
- [Inferred] `hide` has 20 entries of 40 paths, and `select` 40 paths. A unit map of up to 1,000 listed facts can always be reduced to 40 with `select` and one `restReason`.
- [Inferred] Containment bounds (one to five top-level groups, eight children) are 2.24's `view-shape`, computed over the expansion with base elements included.

## D8. Shared claims

- [Inferred] A base element is no claim, so 2.24's single-claim rule does not apply to it: it is drawn in Syzygy's words in every figure that shows it.
- [Inferred] A display name is a claim, so it renders its anchor once. Each later figure that names the same path's display name repeats the box text but carries no anchor, as 2.24 states for a shared element. A display name is keyed by its view, so two views naming one path differently is two claims, both reviewed.

## D9. Rendered bytes that move

[Inferred] Only a schema-v13 view with a `base` moves:
- its figure (base elements, chip, hidden items, note);
- its `machine.json` figure entry (`base`, `provenance`);
- the findings and the check record;
- the brief (v19).

Drafts of schema v12 and earlier keep every byte, apart from `field-version` in place of `schema` for `base` or a base end. A v13 view without `base` renders as in v12. The map pages, `computedMaps` and the provider golden do not change.

## D10. What the code change must do

- [Inferred] Schema v13 in `packages/polaris-dossier/src/draft-schema.ts`, with the `base` member, base ends and the four findings, as literal-case tests of each scenario.
- [Inferred] Resolve base paths in check against the derived-structure record and `manifestFacts` check already derives.
- [Inferred] Expansion and rendering in `apps/three-surface-poc/src/polaris-generation/`:
  - reuse the map renderers' element labels, marks and identities, never a copy;
  - the chip, the hidden items and the note;
  - `machine.json`'s `base` and `provenance`.
- [Inferred] Byte tests: every map page with and without a base view, every stored draft re-rendered, the provider golden unchanged. Brief v19, and a recorded rule-6 mutation run.

## D11. Residuals

- [Inferred] The CI and infrastructure maps are not bases yet (D2).
- [Inferred] A group nesting of a base element is Unknown today, because no witness row joins a model element without a unit; a later rule version may add one.
- [Inferred] Display names are keyed by view; whether a dossier-wide alias is wanted is a question for the system map (syzygy-ea4w.3).
- [Inferred] Views from a base are one level, as 2.24's are. Levels and zoom are syzygy-3efd.39.
