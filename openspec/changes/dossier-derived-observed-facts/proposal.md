# Dossier derived structural facts rendered Observed — version 2.3

[Inferred] Candidate agent-decided change under VIS-4 as amended by GOVERNANCE-SIMPLIFICATION-D10. It binds only once its row in `AGENT-ADOPTIONS.md` and its version tag exist; no owner adoption is claimed. It rests on an owner decision about the reading of doctrine, and it decides no owner class itself (no doctrine edit, no secret-screening change, no foreign repository, no exposure or release).

## The owner decision this applies

[Observed] Owner decision `pursuit-2026-11-21-observed-derived`, option A, recorded 2026-11-21T03:53:58+00:00, no edits (recorded on bead syzygy-3efd.27; the pursuit report `docs/pursuits/2026-11-21-vision-pursuit.md`, "Owner gates this run", states the question). Its authorization boundary, verbatim: "this item does not amend doctrine; it does not let any agent or model label its own claim Observed; it approves no particular derivation rule; it does not widen what may be read (item 1 decides that); the spec clause changes only by a reviewed delta recorded as an agent adoption with its revert command."

[Inferred] So the choice of rule (`top-level-unit` version 1), the surface and the currency bound are this adoption's, not the owner's, and are open to veto as any adoption is.

## Why

[Observed] The effective REQ-034 reserves Observed "for a quotation that Syzygy has verified" (its labelling rules), and its scenario "Agent labels its own claim Observed" ends "Observed appears on the page only on a quotation Syzygy verified". No figure element can therefore be Observed, and since A-16 (syzygy-3efd.17) a figure's legend shows "Solid" only where an element is observed, so no figure in an operator-agent dossier draws a solid line. [Observed] `syzygy dossier check` already derives a structure record from the pinned tree's paths and modes (`packages/polaris-dossier/src/derive.ts`, A-15), each fact naming the versioned rule that matched, but only as advice to the author, never rendered.

## What changes

One MODIFIED requirement, REQ-polaris-generation-034 ("Agent brief and mechanically checked draft"), complete text in `proposed/polaris-generation/spec.md`:

- Observed is reserved for a verified quotation and, in the operator-agent mode, for a derived structural fact Syzygy renders under the new paragraphs.
- `syzygy dossier check` derives, from the tree it lists at the pinned revision, the facts of one rule, `top-level-unit` version 1 (the repository root with its root-file count, each top-level directory with its file count, and the root's containment of each), and keeps them per draft revision as an evidence artifact, `derived/rev-<n>.json`, identified by its SHA-256, with source, capture time, scope and provenance. Each render re-derives the facts to confirm them, publishes the record unchanged as `derived-structure.json`, and `machine.json` carries them as `derivedStructure`.
- Their currency bound, `pinned-revision`, is declared per rule and version in the new policy `POLARIS-DOSSIER-DERIVED-FACT-CURRENCY-POLICY-v1`, which a render reads from the Syzygy checkout's committed bytes at a stated digest. A fact without a declared bound renders Unknown (`no-currency-bound-declared`), a fact of a record of another revision or one the render cannot reproduce renders Unknown (`stale-beyond-currency-bound`), and a missing record or a tree that cannot be listed leaves the region with a `Not established.` sentence (`missing-evidence`, `source-uncaptured-or-unreachable`).
- `index.html` ends with a `derived-structure` region: a computed figure (`data-visual-provenance="computed"`) of the root and at most twelve top-level directories, solid where Observed, with its legend, a tally "derived by Syzygy", and a list of every fact, each carrying its rule, version, path, record digest and revision as attributes and in the evidence view, and reading "Derived by Syzygy".
- Every operator-agent figure drawn from the draft carries `data-visual-provenance="curated"`; none is upgraded.

Every other sentence and scenario of REQ-034 is carried unchanged (SEMANTIC-DELTA.md). Provider mode is unaffected.

## Non-goals

No element of a draft is upgraded to Observed, whatever it matches (typed relations and the exact-type witness upgrade are syzygy-3efd.28). No manifest-derived facts. No other rule of the structure record renders; their facts gain no bound. No new read: check and render list the same tree they already list or read. No change to the brief, the draft schemas, secret screening, the screening policy, review or readiness. No computed map pages (syzygy-3efd.36).
