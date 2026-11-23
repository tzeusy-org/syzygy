# Design: one system model, structural figures as views

[Inferred] Version 2.NN of REQ-polaris-generation-034, for syzygy-3efd.37. It is drafted on `agent/syzygy-3efd.37`, over the version 2.23 text (`dossier-containment-figure`, row A-58; PR #925, in the merge queue when drafted). The code of versions 2.16 to 2.23 has not all landed: `main`'s draft schema in `packages/polaris-dossier/src/draft-schema.ts` is v9. Every code site named in D10 must be re-located on the base the implementation starts from.

## D1. The version label

- [Observed] syzygy-3efd.40 (figure plan, advisories) is drafted in parallel over `main`. Both changes therefore use the placeholder 2.NN until adoption, as the lead directed.
- [Inferred] At adoption, re-fetch tags, agent branches and `AGENT-ADOPTIONS.md`, and take the next free label and row. If .40 lands first and changes REQ-034, rebuild this text on its text with the same anchored script.
- [Inferred] Schema v12 and brief v18 follow 2.23's v11 and v17. If .40 also takes a schema or brief number, whichever lands second renumbers.

## D2. What exists to ground the model in

[Observed] In the 2.23 text:
- A graph node is `{id, label, epistemic, citations}`, with an optional v9 `unit`.
- A graph edge is `{id, from, to, relation, label, epistemic, citations}`, where `relation` is one of eleven types (2.19).
- A containment group is a node's members plus `children`, at most three levels (2.23).
- Every identity in a draft is unique, so the same part drawn in two figures is two claims today.
- Rule `relation-witness` version 1 has one eligibility row: `contains`, from a `repository-root` unit to a `top-level-directory` unit, from rule `top-level-unit` (2.19).

[Inferred] So an element is a node plus what the bead asks for: a `type` and a `parent`. A cited relationship is exactly a v9 edge. A parent is exactly a 2.23 nesting.

## D3. Element types

- [Inferred] The list is closed so that check can test it, with nine types: `system`, `directory`, `package`, `module`, `service`, `job`, `store`, `external` and `person`.
- [Inferred] Six of them are the types the six unit kinds stand for, so a unit and a type can be checked against each other (`element-type`). An element with a unit therefore cannot claim a type its unit contradicts.
- [Inferred] `module`, `store` and `person` have no unit kind today, so they carry none.
- [Inferred] The type is never drawn. Drawing it would change every migrated figure's bytes, and acceptance criterion 1 requires the same figures. It is in `machine.json` for any later reader (syzygy-ea4w.3, the system map).

## D4. Parents

- [Inferred] A parent is "part of", the same relation a containment nesting states. Rule `relation-witness` reads it once, as 2.23 reads a nesting.
- [Inferred] The chain stops at three levels, the containment's own bound, so any containment view's expansion is within depth. `containment-depth` cannot arise from a view; it stays listed so that the order of findings is total.
- [Inferred] A graph view draws no parent. A view is one level (the bead's exclusion), and nesting in a graph is the containment's job.

## D5. Cited and derived relationships

- [Inferred] "Each cited or derived" (the bead). A cited relationship is the draft's claim, exactly as an edge is.
- [Inferred] A derived relationship carries no label, marking or citation. It asks Syzygy to state the relation, so it can never be the draft's claim, and so it is never rendered as one.
  - Witnessed, it renders as 2.19's witnessed edge does.
  - Otherwise it renders Unknown in Syzygy's words, with the reason.
- [Inferred] A derived relationship that no eligibility row could ever witness is refused (`relationship-not-derivable`), so an author cannot fill a figure with arrows that can only ever be Unknown. Today that leaves one derivable pair, root `contains` top-level directory. This is honest: the table grows by new rule versions, and this text reads whatever version it states.
- [Inferred] Challenged, cited or derived, is `relation-challenged`, now at the model path, once per relationship and not once per view.

## D6. Views

- [Inferred] A view lists identities only. Its figure is the v11 diagram its expansion gives, so every 2.5 to 2.23 rule for drawing, fitting, listing and machine form applies unchanged, and the migration parity of D8 follows by construction.
- [Inferred] Bounds are the graph's (1–40 nodes, 1–80 edges) and the containment's (2–40 elements).
  - A containment's 1–5 and 0–8 list bounds become `view-shape`, because a view has no nested lists to put a `schema` finding on.
- [Inferred] `model-unviewed`: every claim must be read somewhere. Otherwise a claim would be checked and reviewed but never rendered.
- [Inferred] One level: a view names no view, level or zoom target, and no derived base (syzygy-3efd.38, .39).

## D7. Shared elements: "a box on one page is the same box on another"

- [Inferred] The same identity, label, marking and line style in every figure. An element selected by more than one view carries `data-element` on its box in each figure.
- [Inferred] The claim renders once, in the first figure in draft order: its anchor, citations and fidelity entry. Two anchors with one identity would break the one-claim-one-anchor rule, and on one page they would be two equal fragment ids. Later figures' list items link to the first figure.
- [Inferred] An element in only one view carries no `data-element`, so its figure is byte-identical to its expansion's. That is what keeps D8's parity exact.

## D8. Migration

- [Inferred] A pure function from v10 or v11 to v12, never applied by check or render. Drafts are checked and rendered in their own schema, so stored drafts keep their bytes with no migration step anywhere.
- [Inferred] "Merged by identity" (the bead's design): identities are unique within a v10 or v11 draft, so no two nodes merge. Merging only becomes real when an author writes a v12 model.
- [Inferred] Types come from units (D3), or are `module` with no unit.
- [Inferred] Parity:
  - the same findings, at moved paths;
  - every `<figure>`, notice, figure-fit member and `machine.json` figure entry byte-identical;
  - the other bytes differ only in the `model` member and in bytes that name or digest the draft or its schema.
- [Observed] Drafts of schema v9 and earlier cannot be migrated: v10 requires `hero`, and inventing one would put a claim in the author's mouth. They keep rendering in their schema.
  - So acceptance criterion 1 ("every stored draft migrates") holds for stored v10 and v11 drafts.
  - Today the code's schema is v9, so no stored v10 or v11 draft exists yet. The migration test population is the v10 and v11 fixtures that land with those versions' code.

## D9. Rendered bytes that move

[Inferred] Only a schema-v12 draft moves:
- shared elements' `data-element` and link items;
- derived relationships' items;
- `machine.json`'s `model`;
- the findings and the check record;
- the brief (v18).

Drafts of schema v11 and earlier keep every byte, apart from `field-version` in place of `schema` for `model` or `view`. The provider mode and its golden do not change.

## D10. What the code change must do

[Inferred] On a base where versions 2.16 to 2.23 have landed:
- `packages/polaris-dossier/src/draft-schema.ts`: schema v12, with `model` and `view`.
- `check-derive.ts`:
  - the model and view findings, in the stated order;
  - the witness of relationships and parents, once each;
  - `field-version`.
- A pure `migrate-draft.ts` (v10/v11 to v12) beside the schema, never imported by check or render.
- `dossier-site.ts`:
  - each view rendered through its expansion;
  - `data-element` and link items for shared elements;
  - derived relationship items;
  - `machine.json` `model`.
- `brief.ts`: brief v18.
- Tests:
  - a literal migration of every stored v10 and v11 fixture, before and after;
  - render parity for each migrated fixture;
  - a view naming a missing element refused;
  - two views sharing an element;
  - every scenario;
  - stored drafts re-rendered byte-identical;
  - the provider golden unchanged;
  - a rule-6 mutation run.

## D11. The repair-cycle question (acceptance criterion 3)

- [Unknown] Whether one coherent model raises or lowers repair cycles is not measured. The bead's figure, 18 of 23 fidelity verdicts across five runs not ready, predates any v12 draft.
- [Inferred] A measurement needs:
  - the code landed;
  - at least five operator-agent runs of v12 drafts over the same pinned repositories as the five earlier runs;
  - per run, the count of check rounds before a passing draft and the fidelity verdict's readiness;
  - the same brief apart from the model paragraph.
- [Inferred] Until then the question stays Unknown, and this design claims no effect.

## D12. Residuals

- [Inferred] Only one derived relation can be witnessed today (D5).
- [Inferred] An element's type is undrawn (D3). Whether a reader needs it on the page is a design-review question for the system map (syzygy-ea4w.3).
- [Inferred] A shared element's claim sits in its first figure in draft order, which may not be the first in reading order. That is deterministic but not reader-ordered. A later version may choose reading order once the page order is itself a stated function.
