# Dossier containment figure — version 2.23

[Inferred] Candidate agent-decided change under VIS-4 as amended by GOVERNANCE-SIMPLIFICATION-D10. It binds only once its row in `AGENT-ADOPTIONS.md` and its version tag exist; no owner adoption is claimed. It decides no owner class: no doctrine edit; no change to secret detection or SEC-5's fail-closed rule; no write to a repository the owner does not own; no network exposure, release or multi-user use.

## Why

- [Observed] syzygy-3efd.31 (pursuit 2026-11-21 Q6, slice 3): "A containment figure: nested groups, such as packages inside a workspace or modules inside a service, drawn as boxes within boxes." Exclusions: "no edges between groups beyond what the record declares; no zoom links (syzygy-3efd.39); nesting depth is bounded and the bound is stated."
- [Observed] Today a figure is a graph, a sequence or a swimlane (version 2.5). "This sits inside that" can only be drawn as an arrow, which a reader must decode.
- [Inferred] Boxes within boxes show containment directly. Where the structure record holds the containment, Syzygy can witness it.

## What changes

[Observed] One MODIFIED requirement, REQ-polaris-generation-034 ("Agent brief and mechanically checked draft"), with its complete text in `proposed/polaris-generation/spec.md`:

- Draft schema `polaris-dossier-local-draft-v11` adds a figure kind `containment`.
  - Its record, `groups`, is a tree: one to five top-level groups, each with zero to eight `children`.
  - Each group may carry a v9 `unit`.
  - Bounds: at most three levels and 40 groups, and at least one nesting.
- Findings:
  - the 2.5 `figure-kind` rule, extended;
  - `containment-depth`, `containment-size` and `containment-flat`, each with a literal detail naming its bound;
  - `unit-reference` for a group's unit;
  - `relation-challenged` for a nesting;
  - `field-version` in schema v10 and earlier.
- Rule `relation-witness` version 1 reads each nesting of two groups with units as a `contains` edge from parent to child. So a top-level directory inside the repository root is witnessed or challenged, and every other nesting is Unknown.
- Layout and rendering:
  - a pure layout in 2.5's columns, with children stacked and inset 12 px per level;
  - no line between groups;
  - a nested-list phone form, so the figure fits at 1440 and 390;
  - tally, list and witnessed-nesting items;
  - a declarative source;
  - a `figureStructures` entry.
- Brief `polaris-dossier-brief-v17`: brief v16 plus one paragraph, issuing schema v11.
- Three predecessor sentences are amended to stay true: the Observed reservation, the never-upgraded exception, and one scenario. The brief-version list is extended, ten scenarios are added, and the four Form lines are extended.

[Observed] Every other sentence and scenario of REQ-034 is carried unchanged.

## Non-goals

[Inferred] The following are left out:
- zoom links (syzygy-3efd.39);
- a containment hero;
- any line between groups;
- witnessing a package's workspace membership (no resolved-member fact exists);
- any new fact kind or eligibility row;
- any change to the provider mode or its golden;
- any script.
