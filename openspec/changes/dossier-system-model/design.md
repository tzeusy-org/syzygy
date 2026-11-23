# Design: one system model, structural figures as views

[Inferred] Version 2.24 of REQ-polaris-generation-034, for syzygy-3efd.37. It is drafted on `agent/syzygy-3efd.37`, over the version 2.23 text (`dossier-containment-figure`, row A-59, after #921 took A-58; PR #925, merged 2026-11-23). The code of versions 2.16 to 2.23 has not all landed: `main`'s draft schema in `packages/polaris-dossier/src/draft-schema.ts` is v9. Every code site named in D10 must be re-located on the base the implementation starts from.

## D1. The version label

- [Observed] syzygy-3efd.40 (figure plan, advisories) is drafted in parallel over `main`. Both changes therefore used the placeholder 2.NN until adoption, as the lead directed. The lead then ordered .37 to adopt first: no tag or agent branch carried 2.24, so this change is 2.24 (schema v12, brief v18), and .40 rebuilds over it as schema v13 and brief v19.
- [Observed] The label was set by a substitution script (session tooling, not in the tree): replacing `2.24` with `2.NN` in the adopted spec and restoring the preamble's clause "(the label is a placeholder until adoption)" reproduces the repaired bytes, sha256 `21c4b0835116a41407b227c748a96a2e8468feb8343d9b07692101f4494ed47c`. Review 1 and its quotations refer to the 2.NN label.
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

- [Inferred] A parent is "part of", the same relation a containment nesting states. Rule `relation-witness` reads it once, as 2.23 reads a nesting, and only where the view of a produced containment shows both ends, as 2.23 decides a nesting only in a produced containment. A parent no such view shows stays the agent's claim, undecided (review 1, finding 1 and note 7).
- [Inferred] The chain stops at three levels, the containment's own bound, so any containment view's expansion is within depth. `containment-depth` and `containment-size` cannot arise from a view, so the text says so and lists neither among a view's findings (review 1, note 12).
- [Inferred] The chain is walked one `parent` at a time until it ends or repeats; more than two steps, or a repeat, is `element-parent`. An element whose chain runs into a cycle it is not on is reported too (review 1, finding 5).
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
- [Inferred] `model-unviewed`: every claim must be in some view. Otherwise a claim would be checked and reviewed but never placed in a figure. A view counts whatever its diagram's disposition, as a node of a non-produced diagram counts in 2.23; counting only produced views would make a passing v11 draft with a non-produced graph fail once migrated (review 1, note 8).
- [Inferred] One level: a view names no view, level or zoom target, and no derived base (syzygy-3efd.38, .39).

## D7. Shared elements: "a box on one page is the same box on another"

- [Inferred] The same identity, label, marking and line style in every figure. An element selected by more than one view carries `data-element` on its box, and a relationship `data-relationship` on its arrow, in each figure (review 1, note 12). The label text is the same before each layout's wrapping (note 9).
- [Inferred] The claim renders once, in the first figure in draft order that renders as a `<figure>` (a notice does not count): its anchor, citations and fidelity entry, judged with its model parent. Later items link there by a page-relative href, in the containment's `(in …)` form where nested; a witnessed relationship is Syzygy's statement, not a claim, so it keeps 2.19's witnessed item everywhere; counts of claims count it once (review 1, finding 2). Two anchors with one identity would break the one-claim-one-anchor rule, and on one page they would be two equal fragment ids. Later figures' list items link to the first figure.
- [Inferred] An element in only one view carries no `data-element`, so its figure is byte-identical to its expansion's. That is what keeps D8's parity exact.

## D8. Migration

- [Inferred] A pure function from v10 or v11 to v12, never applied by check or render. Drafts are checked and rendered in their own schema, so stored drafts keep their bytes with no migration step anywhere.
- [Inferred] "Merged by identity" (the bead's design): identities are unique within a v10 or v11 draft, so no two nodes merge. Merging only becomes real when an author writes a v12 model.
- [Inferred] Types come from units (D3), or are `module` with no unit.
- [Inferred] Parity holds for drafts check passes, and only for them (review 1, finding 1). A failing draft's findings change kind, not only path: a view's bounds and the model's checks are not the diagram's. For a passing draft:
  - check passes the migrated draft, with the same multiset of advisories at moved paths (the path mapping is stated);
  - the reading ledger is unchanged, because a model-path advisory is located at the first diagram whose view selects it (review 1, note 10);
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

## Review

Review 1, `docs/reviews/syzygy-3efd-37/R-SYSTEM-MODEL-SPEC-1-RAW.md`, read `adee4b70` (spec sha256 `62f1a860…`): REVISE, five blocking findings and seven notes. Every one is repaired; none is declined.

- Finding 1, blocking (migration parity false as stated): repaired.
  - Parity is now stated for drafts check passes, and only those; the text says why a failing draft's findings may change kind and gives the six-group example.
  - The witness decides a relationship or a parent only where the view of a produced graph or containment shows it, as 2.19 and 2.23 decide only in produced figures.
  - Advisories are compared as a multiset of kind, detail and moved path, and the path mapping is stated.
  - The migration scenario and the falsifier are corrected.
- Finding 2, blocking (single-claim rule incomplete): repaired.
  - a. A relationship Syzygy finds witnessed renders 2.19's witnessed arrow and item in every figure, never the "as shown in" form. A new scenario pins it.
  - b. A nested element's later item in a containment reads `<label> (in <parent label>), as shown in …`.
  - c. The first figure is the first that renders as a `<figure>`, a notice not counting. The href is page-relative, `#figure-<diagram>` alone on the same page. The scenario now links from `poles/1.html` to `../index.html#figure-runtime`.
  - d. Labels and the title are as the first figure renders them, withheld words included.
  - e. Every count of the draft's claims counts a shared claim once; only a figure's tally counts it per figure.
  - f. The single fidelity entry is judged with the element's model parent.
- Finding 3, blocking (derived Unknown arrow underspecified): repaired. The expansion gives a derived relationship's edge Syzygy's words for its relation as its label and no citation. Unwitnessed, it renders as an Unknown edge with that label: drawn label, `data-epistemic="unknown"`, `data-relation`, declarative-source line and `machine.json` figure entry, labelled `unknown`, with `"basis": "derived"`. A new scenario pins the drawn label.
- Finding 4, blocking (findings beside a `schema` finding): repaired. Each new finding is computed only where the members it reads have no `schema` finding, with the conditions stated per finding. A view's shape findings also need no `element-parent` finding and no unresolved parent. A new scenario covers a one-element containment view and an out-of-list type.
- Finding 5, blocking (chain running into a cycle): repaired. The chain is walked step by step until it ends or repeats; more than two steps or a repeat is reported. The loop scenario adds `c`, which names `a` and is on no cycle.
- Note 6 (carried solid-arrow scenario): repaired. That scenario's line is amended to "a schema-v9 or later draft", a derived relationship's arrow among them, and the SEMANTIC-DELTA records it.
- Note 7 (parents challenged without being shown): repaired with finding 1. An unshown parent is decided by no rule, never a finding, and stays the agent's claim, carried in `machine.json` and reviewed.
- Note 8 (views of non-rendered diagrams): repaired by statement. A view counts for `model-unviewed` whatever its diagram's disposition (D6 gives the reason, migration parity). An element only an unrendered figure selects renders nowhere, as a node of a diagram that does not render does.
- Note 9 (label widths): repaired. The text now reads "the same label text, before each layout's own wrapping and cutting".
- Note 10 (advisories at model paths): repaired. The reading ledger locates a model-path advisory at the first diagram whose view selects it, so the ledger is among the bytes the parity keeps.
- Note 11 (placeholder label): repaired at adoption. The label is set by script, the same substitution for the spec, `MODEL_TAG` and `MODEL_STATUS_PREFIX`. The adoption commit records that restoring `2.NN` in the adopted spec reproduces the digest the last review read.
- Note 12 (drafting points): all four repaired.
  - A derived relationship's `relation` outside those a cited relationship may carry is a `schema` finding.
  - `containment-depth` and `containment-size` are stated as unable to arise for a view and are dropped from its findings.
  - The new byte-keeping scenario is titled "Schema v11 and earlier keep their bytes".
  - A shared relationship's arrow carries `data-relationship`, not `data-element`.

[Observed] The repairs add three scenarios, so REQ-034 goes from 193 to 207, and they amend one carried scenario line more (SEMANTIC-DELTA.md). The review read `adee4b70`; no review has read the repaired bytes.
