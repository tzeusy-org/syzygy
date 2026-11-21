# Dossier figure kinds: sequence and swimlane — version 2.5

[Inferred] Candidate agent-decided change under VIS-4 as amended by GOVERNANCE-SIMPLIFICATION-D10. It binds only once its row in `AGENT-ADOPTIONS.md` and its version tag exist; no owner adoption is claimed. It decides no owner class (no doctrine edit, no change to secret detection or SEC-5's fail-closed rule, no foreign repository, no exposure, release or multi-user use).

## Why

- [Observed] Every draft diagram is one nodes-and-edges record (`packages/polaris-dossier/src/draft-schema.ts`, the `diagrams` member of `localDraftSchema`), and `apps/three-surface-poc/src/polaris-generation/diagram-layout.ts` lays every one out with one layered graph layout that never reads the diagram's `kind` (`layoutDiagram(nodes, edges, spacing)`). The six kinds in `DIAGRAM_KINDS` (`packages/polaris-generation-core/src/draft-model.ts`) are only an eyebrow word.
- [Observed] A workflow in which several actors take turns, or a request whose calls and replies happen in order, is therefore drawn as boxes and arrows whose order the reader must reconstruct from the arrows, and the graph layout's width grows with the chain until it wraps or stacks (`stackDiagram`). On a 390 px screen, where the column is 261 px (`STACK_COLUMN`), such a figure either stacks one node to a row with lanes beside it or scrolls sideways.
- [Inferred] A sequence and a swimlane name what such a figure is: participants and ordered messages, lanes and ordered steps. Their order is the record's, so the layout can fit the column by construction, and on a phone the same record reads naturally as a numbered list (bead syzygy-3efd.30; pursuit 2026-11-21 Q6 slice 2).

## What changes

One MODIFIED requirement, REQ-polaris-generation-034 ("Agent brief and mechanically checked draft"), complete text in `proposed/polaris-generation/spec.md`:

- Draft schema `polaris-dossier-local-draft-v7`: a diagram's `kind` may be `sequence` (`participants`, `messages` with `from` and `to`) or `swimlane` (`lanes`, `steps` with `lane`), in place of `nodes` and `edges`; the six graph kinds are unchanged. Brief `polaris-dossier-brief-v12` issues it, brief v11 plus one paragraph.
- Findings: `unresolved-reference` for a message or step naming nothing in its own diagram, `figure-kind` for members that do not fit the kind, `figure-unused` for a participant or lane nothing names, and `field-version` for either kind in schema v6 or earlier.
- A pure layout per kind with stated constants: columns 176 px at a 184 px pitch, W = 40 + 184 x n (408 to 960 px), so the drawing fits the 966 px column at 1440.
- The rendered figure holds its drawing and a phone form (an ordered list of messages, or of steps headed by their lanes), exactly one displayed at any box width by a CSS container query; the style rules ride only on pages that hold such a figure.
- Figure fit takes the displayed form, so both kinds fit at 1440 and 390; a Mermaid declarative source per kind; `machine.json`'s `figureStructures` only for a render holding such a figure.

Every other sentence and scenario of REQ-034 is carried unchanged (SEMANTIC-DELTA.md). Provider mode is unaffected.

## Non-goals

No containment, state or HTML figure kinds (later slices, syzygy-3efd.31 and after); no change to a graph figure's layout, findings or bytes; no branching in a swimlane (its steps are one ordered list); no script in any page; no new read, no change to secret screening, the screening policy, review or readiness; no change to the readability guidance (`polaris-dossier-readability-v5`) or the provider mode.
