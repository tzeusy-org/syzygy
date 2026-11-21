# Dossier figure homes and figure fit — version 2.2

[Inferred] Candidate agent-decided change under VIS-4 as amended by GOVERNANCE-SIMPLIFICATION-D10. It binds only once its row in `AGENT-ADOPTIONS.md` and its version tag exist; no owner adoption is claimed, and no owner class is touched (no doctrine, secret screening, foreign repository, exposure or release).

## Why

[Observed] Today a diagram in an operator-agent draft must name a section (`sectionId`, required in `packages/polaris-dossier/src/draft-schema.ts`), and the renderer (`apps/three-surface-poc/src/polaris-generation/dossier-site.ts`) places figures only inside sections. A figure that explains a deep dive, or the whole project on the first page, has nowhere to go (bead syzygy-3efd.18).

[Observed] A figure wider than its column scrolls sideways in its box, and the one figure the stylesheet lets shrink (the 1048 px three-column chain) is drawn with 13 px text scaled down. Nothing tells the author before rendering, and nothing records it so a later run can compare (bead syzygy-3efd.20).

## What changes

One MODIFIED requirement, REQ-polaris-generation-034 ("Agent brief and mechanically checked draft"), complete text in `proposed/polaris-generation/spec.md`:

- Draft schema `polaris-dossier-local-draft-v5`: a schema-v4 draft whose diagrams carry a required `home` (`{"kind": "section", "target": <id>}`, `{"kind": "deep-dive", "target": <id>}` or `{"kind": "overview"}`) in place of `sectionId`. A malformed or doubled home is a `diagram-home` finding, an unknown target `unresolved-reference`, and a `home` in a v4-or-earlier draft `field-version`, each naming the diagram. A figure homed on a deep dive with no page of its own renders with its section's figures instead. A figure renders once, on its home's page, with the same legend and tally. Drafts in v4 and earlier are checked and rendered exactly as before. The brief names the three kinds.
- Figure-fit advice: `syzygy dossier check` computes, without a browser, each figure's laid-out width against its column at 1440 px and 390 px, and its effective text size against an 11 px minimum, and reports one entry per figure and viewport that does not fit. Unlike the other advice members, it is also written into `checks/rev-<n>.json` as `figureFit`, deterministically.

Every other sentence and scenario of REQ-034 is carried unchanged (SEMANTIC-DELTA.md). Provider mode is unaffected.

## Non-goals

No change to secret screening, the screening policy, the source model, review or readiness rules. Figure fit gates nothing and is never a finding. No new browser measurement at check time.
