# Dossier system model — version 2.24

[Inferred] Candidate agent-decided change under VIS-4 as amended by GOVERNANCE-SIMPLIFICATION-D10. Drafted under the placeholder label 2.NN while syzygy-3efd.40 was drafted in parallel; labelled 2.24 at adoption, .37 adopting first by the lead's ordering (design D1).

## Why

- [Observed] syzygy-3efd.37 (pursuit 2026-11-21 Q7, slice 2): "The draft carries one model of the system (elements with a type and a parent; relationships, each cited or derived) and structural figures become views over it. A box on one page is the same box on another." Exclusions: "one level of view only (levels and zoom are syzygy-3efd.39); views from a derived base are syzygy-3efd.38; sequence and swimlane figures stay as they are."
- [Observed] Today each graph or containment figure carries its own nodes, edges or groups, and every identity in a draft is unique (version 2.2). The same part of a system drawn in two figures is two claims with two identities, two labels and two sets of citations, and nothing checks that they agree.
- [Inferred] One model, selected by views, makes a part one claim wherever it is drawn: one label, one marking, one review entry.

## What changes

[Observed] One MODIFIED requirement, REQ-polaris-generation-034 ("Agent brief and mechanically checked draft"), with its complete text in `proposed/polaris-generation/spec.md`:

- Draft schema `polaris-dossier-local-draft-v12` adds a required top-level `model`.
  - Elements: a node's members plus a `type` from a closed list of nine, an optional `parent` and an optional v9 `unit`.
  - Relationships: cited (a v9 edge's members) or derived (`basis: "derived"`, no label, marking or citation), which asks Syzygy to state the relation.
- Every graph and containment diagram carries a `view` in place of `nodes`/`edges` or `groups`: lists of element and relationship identities. A view is one level and links nowhere.
- Findings:
  - `unresolved-reference` for a parent, a relationship end or a view entry;
  - `element-type`, `element-parent`, `relationship-not-derivable`;
  - `view-duplicate`, `view-relationship`, `view-shape`, `model-unviewed`;
  - the 2.23 containment findings and `relation-challenged`, now on the model;
  - `field-version` in schema v11 and earlier.
- Rule `relation-witness` version 1 decides each relationship and each parent once, where a produced view shows it; every view shows the one state.
- Rendering: a view renders as the v11 diagram its expansion gives. An element shared by two views keeps one label and marking, and its claim (anchor, citations, review entry) renders once; later figures link to it. A derived relationship renders in Syzygy's words, Observed only where witnessed. `machine.json` gains `model`.
- A pure migration from schema v10 or v11 to v12; for a draft check passes, the migrated draft passes and renders the same figure bytes.
- Brief `polaris-dossier-brief-v18`: brief v17 plus one paragraph, issuing schema v12.
- Five predecessor sentences are amended to stay true: the Observed reservation, the never-upgraded exception, the brief-version list, the scenario on where Observed appears and the scenario on which arrows are solid. Fourteen scenarios are added, and the four Form lines are extended.

[Observed] Every other sentence and scenario of REQ-034 is carried unchanged.

## Non-goals

[Inferred] The following are left out:
- levels, zoom and links between views (syzygy-3efd.39);
- views that start from a derived base and the hidden-count chip (syzygy-3efd.38);
- any change to sequence or swimlane figures;
- drawing an element's type;
- any new fact kind or eligibility row;
- migrating drafts of schema v9 or earlier (they lack the required `hero`);
- any change to the provider mode or its golden;
- any script.
