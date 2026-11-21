# Design: sequence and swimlane figure kinds

One MODIFIED REQ-polaris-generation-034, version 2.5, for bead syzygy-3efd.30 (pursuit 2026-11-21 Q6 slice 2). It builds on version 2.4 (row A-20), whose implementation is landing separately and introduces schema `polaris-dossier-local-draft-v6` and brief `polaris-dossier-brief-v11`; this version adds schema `polaris-dossier-local-draft-v7` and brief `polaris-dossier-brief-v12`, additive over both.

## A tagged union, kept additive

[Observed] Today a diagram is one record: `id`, `title`, `sectionId` or (v5) `home`, `kind` (one of `flow`, `lifecycle`, `state-machine`, `boundary`, `dependency`, `placement`), `relationship`, `nodes` (1 to 40), `edges` (1 to 80) and `disposition` (`draft-schema.ts`, `localDraftSchema`); `layoutDiagram` reads nodes and edges only (`diagram-layout.ts:74`).

[Inferred] The bead asks for a tagged union with a record and a layout per kind. Version 2.5 keeps the six existing kinds as one "graph" arm, unchanged in record, layout, findings and bytes, and adds two arms keyed by `kind`: `sequence` (`participants`, `messages`) and `swimlane` (`lanes`, `steps`). Every other diagram member is shared, so homes, dispositions, `repeatsDiagram`, the reading ledger's figure counting and the 2.3 provenance attribute need no new rule. Alternatives considered: a new top-level `figures` member beside `diagrams` (rejected: every rule that names a diagram, its home and its disposition would need a twin); encoding a sequence as nodes and edges with an order field (rejected: the order and the participant/message distinction are what the kind is, and a graph record cannot refuse a message to a non-participant by its shape).

[Inferred] Additivity (bead acceptance 3): schema v7 adds forms only. A stored draft declares its schema version and is checked under it; a v6 or earlier draft is checked and rendered as version 2.4 does, with one addition, a `field-version` finding for the new kinds or members, which mirrors how `home` (2.2) and `thesisBasis` (2.4) were introduced. A v7 draft using only graph kinds renders its figures byte for byte as v6 does.

### Rule mapping instead of a rewrite

[Inferred] REQ-034 and REQ-035 state many rules for "a diagram's nodes and edges" (citations, labels, withheld items, review reach, the fidelity verdict, the machine form). Rather than edit each sentence, the new paragraph maps them: participant, lane and step take a node's rules; message takes an edge's. A step is mapped to a node because it is a box with one claim; its order is carried by the draft's array order, and the arrow Syzygy draws between consecutive steps is drawing, not a claim (like a table cell read with its row and column labels, the fidelity review reads a step with its lane and place). The `from`/`to`/`lane` keys are references, never identities, as `home.target` is (2.2).

## Findings

- `unresolved-reference` (existing kind) for a message's `from`/`to` or a step's `lane` naming nothing in its own diagram, located at the member, exactly as an edge's unknown end is today (`check-derive.ts`, the `edges[j].from`/`.to` loop).
- `figure-kind` (new) for members that do not fit the kind, located within the diagram, naming its identity, as `diagram-home` does; the generic schema check may add its own.
- `figure-unused` (new) for a participant no message names or a lane no step names. [Inferred] A graph's unconnected node renders a "No relationship supplied" note; an empty column instead spends a fifth of the figure's width on nothing, so it is refused. This is a deliberate strictness the brief states.
- `field-version` (existing kind) for the new kinds or members in v6 or earlier.

Bounds: participants and lanes 2 to 5 (fit at 1440 by construction, below), messages 1 to 30, steps 2 to 20 (a one-step swimlane is no workflow). Counts outside bounds are the generic schema check's findings.

## Layouts and the lint

[Inferred] Both kinds lay out in columns: 176 px wide at a 184 px pitch with a 24 px margin, so W = 40 + 184 x n: 408, 592, 776, 960 px for n = 2 to 5. At 1440 the column is 966 px (`FIGURE_VIEWPORTS`), so W <= 960 < 966: D = W, T = 13 px, no entry. W never equals 1048, so the shrinking rule never applies. Lanes run top to bottom as columns (a vertical swimlane) because that keeps the width bounded by the lane count, not the step count; a horizontal swimlane's width grows with its steps and would wrap or scroll.

[Inferred] The constants are stated in the requirement (as 2.2 states figure fit's) so the bead's literal-coordinate tests have an oracle outside the layout's code: a sequence of 3 participants and 4 messages is 592 x 392 px (H = 104 + 72m), a swimlane of 3 lanes and 5 steps 592 x 536 px (H = 96 + 88s). The label wraps (22 characters for a message, 19 for a box) follow the existing `nodeChars = floor((width - 24) / 8)` rule for a 176 px box and the readable spacing's 22-character edge wrap.

### The phone form and 390 px

[Inferred] At 390 the column is 261 px and every W is at least 408, so the drawing cannot fit. The bead asks the swimlane to collapse to a numbered stepper with CSS only. This version gives both kinds a phone form (the sequence as a numbered message list) because acceptance 1 asks both kinds to pass the lint at 390; the alternative, a sequence of at most two participants, would make the kind useless. The rendered figure holds both forms and the stylesheet displays exactly one, by a container size query on the `figure-forms` box against its `data-figure-width`, so the switch is exactly where the drawing stops fitting its box, at any viewport, not only the two the lint names. A media query on the viewport was rejected: between 800 and roughly 1100 px viewports the box is narrower than a 960 px drawing, which would then scroll sideways.

[Inferred] Figure fit takes the displayed form: drawing where W <= C, phone form (W = D = C, unscaled 13 px text) otherwise. So both kinds fit at both viewports by construction, and an unresolved reference makes the layout fail and the fit Unknown, as today. That the phone form really does not scroll sideways at 390 px is a browser observation (bead acceptance 2), named in the scenario and the Oracle line, never computed by the renderer.

[Inferred] The phone form carries no identity, citation, anchor or label token: the claims are already the entries of the figure's "Read every component and relationship" list, and duplicating claims would duplicate identities and machine entries. It shows labels exactly as the drawing does (a withheld element's label replaced, an Unknown one marked), and draws each item in its element's line style, which the legend explains.

[Inferred] The style rules ride only on pages holding such a figure, because the stylesheet is inlined in every page: adding rules to the operator-agent stylesheet for every page would change the bytes of every page of every v6 or earlier draft, breaking the byte-identity promise. The provider stylesheet is untouched (its bytes are pinned by `dossier-render-provider-golden.test.ts`).

## Machine-readable form

[Inferred] Two forms: the declarative source in the figure (Mermaid `sequenceDiagram`, and `flowchart TB` with one `subgraph` per lane, by position, never draft identities, as `diagramToMermaid` does), and `machine.json`'s `figureStructures`, present only when a render holds such a figure so every other `machine.json` keeps its bytes. It carries identities and references only; labels, marks and citations stay in `claims`, each element once. No key is named `source`, `evidence`, `provenance`, `anchor` or `cites` (the PWB-REQ-014 sweep).

## Brief v12

[Inferred] Brief v12 is brief v11 with its version line, draft-schema line and one paragraph after the thesis-basis paragraph, quoted whole in the requirement. The readability guidance's rule 2, which names the graph kinds, is left at `polaris-dossier-readability-v5`, so its version need not move; the new paragraph says when to use each new kind and to keep everything else a graph.

## Names fixed

Schema `polaris-dossier-local-draft-v7`; brief `polaris-dossier-brief-v12`; kinds `sequence`, `swimlane`; members `participants[] {id, label, epistemic, citations}`, `messages[] {id, from, to, label, epistemic, citations}`, `lanes[] {id, label, epistemic, citations}`, `steps[] {id, lane, label, epistemic, citations}`; findings `figure-kind`, `figure-unused` (new), `unresolved-reference`, `field-version` (existing); HTML `data-figure-kind`, `figure-forms`, `data-figure-width`, `figure-drawing`, `figure-stepper`; tally words `{P} participants and {M} messages, as marked:` and `{L} lanes and {S} steps, as marked:` (singular for one); phone-form item heading `stepper-head`; `machine.json` member `figureStructures`.

## Not changed, and why

[Inferred] Graph figures (record, layout, findings, bytes), figure-fit constants, the reading ledger, shape packs, thesis basis, derived structure, review, readiness, screening and the provider mode. Containment, state and HTML kinds are later slices (syzygy-3efd.31 and after); a swimlane has no branches.

## Implementation pointers (not normative)

- `draft-model.ts`: keep `DIAGRAM_KINDS` for the provider; add the local kinds and the union types beside it.
- `draft-schema.ts`: `LOCAL_DRAFT_SCHEMA_VERSION` v7, the diagram item a `oneOf` of three arms; `check-derive.ts`: the four findings.
- `diagram-layout.ts`: `layoutSequence`, `layoutSwimlane`, and their SVG renderers under the inertness check (`svg-inert.ts` lists the attributes; a lifeline may need `line` or a `path`).
- `figure-fit.ts`: the port takes the whole diagram (or a kind-tagged shape); `dossier-site.ts`: `figureLaidOutWidth` per kind, the figure markup, the conditional style rules, `figureStructures`.

## Review

[Observed] One fresh-context review, `docs/reviews/syzygy-3efd-30/R-FIGURE-KINDS-SPEC-1-RAW.md`, read the first draft (spec SHA-256 `3d9d0e34c921ebfbb675a0777daca7a27ff20d9ac4dfc0be89ddcda5d07c6764`) and records `Verdict: REVISE` at its line 3: one blocking finding, eight non-blocking. Every finding was repaired or answered as below in the bytes this package now carries; none was overruled. Under D10 the review gates nothing and no confirmation round was run, so the repairs themselves are unreviewed.

- F1 (blocking; finding counts, paths and schema findings open): repaired. `figure-kind` is one finding per carried member the kind does not take, at `$.diagrams[<i>].<member>`, and one per missing required member, at `$.diagrams[<i>]` naming it; the v7 schema check reports no `schema` finding where a `figure-kind` stands and reports every other fault, the count bounds by SHALL. In schema v6 or earlier `field-version` stands at `$.diagrams[<i>].kind` for a new kind and at each new member, each in place of the `schema` finding version 2.4 reports at that path (the existing `home` pattern, `check-derive.ts` `earlier.reported`), every other 2.4 finding kept; the schema-v5 paragraph's exception, the two scenarios and the Falsifier say the same.
- F2 (tally placeholders and singular): repaired. Placeholders are `{P}`, `{M}`, `{L}`, `{S}`, singular for one, followed by the graph tally's ` {O} observed, {I} inferred, {U} unknown.`.
- F3 (phone-form text): repaired. Each item's markup and text is stated (`stepper-head`, whole labels escaped, ` ?` for Unknown, withheld labels as in the drawing), and the style carrier is a left border by mark.
- F4 (phone-form text size): repaired. The stylesheet sets the list's text at 13 px, which is the T figure fit records.
- F5 (Mermaid bytes): repaired. Indentation, one statement a line, the final newline, no class lines for a sequence, and step class lines for a swimlane are stated.
- F6 (layout on a mismatch; style-rule trigger): repaired. A figure with an `unresolved-reference`, `figure-kind` or `figure-unused` finding, or a count out of bounds, is Unknown for fit; style rules ride only on pages where a produced figure of either kind renders its two forms.
- F7 (carried Falsifier clause and preamble overbroad): repaired. The clause is qualified in place (a ninth recorded change in SEMANTIC-DELTA.md) and the preamble and package README say the `field-version` exception.
- F8 (tasks ticked before the review): answered. The item is ticked in the install commit, which retains the raw and these dispositions.
- F9 (R5 on an uncommitted package): answered. The `openspec/README.md` row is committed with the package; `--check` passes on the install commit.
