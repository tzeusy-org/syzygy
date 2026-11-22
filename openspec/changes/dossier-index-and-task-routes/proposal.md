# Dossier index and task routes — version 2.14

[Inferred] Candidate agent-decided change under VIS-4 as amended by GOVERNANCE-SIMPLIFICATION-D10. It binds only once its row in `AGENT-ADOPTIONS.md` and its version tag exist; no owner adoption is claimed. It decides no owner class (no doctrine edit, no change to secret detection or SEC-5's fail-closed rule, no foreign repository, no exposure, release or multi-user use).

## Why

- [Observed] A rendered dossier offers a reader two ways in: the reading order (overview, Poles, deep dives) and the glossary. Neither answers "where is `processCommand` discussed" or "what do I read to add a command": a name can be found only by opening pages and searching each (`apps/three-surface-poc/src/polaris-generation/dossier-site.ts` before this change draws no page that lists names, and a block is not a fragment target).
- [Observed] The draft schema has no member for a reader's task. A contributor's question is a task ("add a command", "change how data is persisted"), and the dossier answers by topic (`packages/polaris-dossier/src/draft-schema.ts`, `localDraftSchema`).
- [Inferred] Both gaps can be closed without a model call at render. The names are already on the pages (glossary titles, cited paths, backticked identifiers, figure titles, the derived top-level directories of version 2.3), so an index is a mechanical join of names to the blocks that show them. A task route is a claim like any other, so the author writes it and the existing checks carry it: a route with an unverifiable citation is refused by the rules that refuse any such block (beads syzygy-5dhm.70 and syzygy-5dhm.71).

## What changes

One MODIFIED requirement, REQ-polaris-generation-034 ("Agent brief and mechanically checked draft"), complete text in `proposed/polaris-generation/spec.md`:

- `taskRoutes`, an optional member of a draft in schema v5 or later: 8 to 15 routes, each a short-label `task` and 1 to 8 steps; a step is a cited Inferred claim block and nothing else, and may name the section or deep dive that explains it (`see`). The schema version does not move.
- Findings: every finding a cited block can carry, at the step's path; `label`, `citation-by-kind` and `unresolved-reference` for a step's label, missing citation and `see`; `field-version` for the member in schema v4 or earlier.
- The brief asks for task routes in one added section and becomes `polaris-dossier-brief-v13`: brief v12 with that section, its version line and the schema digest of its draft-schema line, and nothing else.
- `find-by-task.html`, second in the reading order: the routes, each step drawn as the claim block it is with the file and lines to read or change beside it; or, for a draft without routes, one sentence saying so.
- `name-index.html`, after the glossary: five kinds of name, each with its home and every block that names it, by stated matching rules.
- Fragment identities: `id="block-<id>"` on each claim block of the argument outside a collapsible section, `id="figure-<id>"` on each figure drawn from the draft, a sequence and a swimlane among them.
- `machine.json` gains `taskRoutes` and `nameIndex`.

Every other sentence and scenario of REQ-034 is carried unchanged (SEMANTIC-DELTA.md). Provider mode is unaffected.

## Non-goals

No route written, completed or reordered by Syzygy; no model call at render; no script; no walk or reading-depth link targets (neither exists on the default branch; a route step links what exists today: source pages, sections and deep dives); no index of the computed map pages' figures, which are Syzygy's and not the draft's; no index of the understanding record, of a figure's components or of the source pages' text; no stemming or fuzzy matching; no new read, no change to secret screening, the screening policy, review or readiness; no new draft schema version; no change to the provider mode.
