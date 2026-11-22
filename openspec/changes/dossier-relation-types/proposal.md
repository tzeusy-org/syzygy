# Dossier relation types — version 2.18

[Inferred] Candidate agent-decided change under VIS-4 as amended by GOVERNANCE-SIMPLIFICATION-D10. It binds only once its row in `AGENT-ADOPTIONS.md` and its version tag exist; no owner adoption is claimed. It decides no owner class: no doctrine edit; no change to secret detection or SEC-5's fail-closed rule; no write to a repository the owner does not own; no network exposure, release or multi-user use.

## Why

- [Observed] syzygy-3efd.28 (pursuit 2026-11-21 Q3, slice 3): "Every figure arrow has a relation type from a closed list. check upgrades an authored arrow to Observed only when the structure record holds a fact of the identical type between the same two units, and raises a finding when a recognizer's coverage was complete and no such fact exists." Its exclusions: no upgrade across relation types; no upgrade from a recognizer without fixtures and a mutation run; where coverage is partial the absence of a fact is Unknown, not a finding.
- [Observed] Condition 4 of owner decision `pursuit-2026-11-21-observed-derived` (option A, recorded 2026-11-21T03:53:58+00:00 on syzygy-3efd.27): "an authored arrow is upgraded only by a derived fact of the identical relation type". Version 2.3 left that open by upgrading nothing: "at this version a draft's box or arrow that matches a derived fact keeps the draft's marking, and is never upgraded".
- [Observed] A draft edge today is `{id, from, to, label, epistemic, citations}` (`packages/polaris-dossier/src/draft-schema.ts`, the `graph` form): an arrow's meaning lives only in its free-text label, so nothing can compare it with a derived fact except by label text.
- [Inferred] An arrow drawn from memory should be either witnessed by what Syzygy derives or challenged by it; where the derivation cannot decide, the reader is told it is Unknown.

## What changes

[Observed] One MODIFIED requirement, REQ-polaris-generation-034 ("Agent brief and mechanically checked draft"), complete text in `proposed/polaris-generation/spec.md`:

- Draft schema `polaris-dossier-local-draft-v9`: every graph edge carries `relation`, one of eleven types (`contains`, `declares-dependency`, `needs-job`, `depends-on-service`, `calls`, `imports`, `reads`, `writes`, `sends-to`, `starts`, `relates-to`); a graph node may carry `unit`, one of six forms naming a unit of the pinned repository (repository root, top-level directory, package manifest, dependency name, workflow job, Compose service).
- Rule `relation-witness` version 1: per edge, `witnessed`, `challenged` or `unknown` (with one of eight reasons), decided by fact kind and unit identity, never by label; an eligibility table that at version 1 holds `top-level-unit` version 1 alone.
- Findings: `unit-reference` for a unit naming nothing of its kind; `relation-challenged` where coverage is complete and no fact of the identical kind joins the two units; `schema` and, in schema v8 and earlier, `field-version` for the new members.
- Rendering: a witnessed arrow drawn solid and Observed in Syzygy's words with its fact's provenance attributes; every v9 arrow carries `data-relation`; `machine.json` carries each v9 edge's `relation` and `witness`.
- Brief `polaris-dossier-brief-v15`: brief v14 plus one paragraph, issuing schema v9.
- Four predecessor sentences amended so they stay true (the Observed reservation, the version 2.3 never-upgraded sentence and two scenarios), the brief-version list extended, ten scenarios added, the four Form lines extended.

[Observed] Every other sentence and scenario of REQ-034 is carried unchanged.

## Non-goals

[Inferred] No manifest recognizer made eligible (each needs a mutation run at its current code and a later version naming that record); no manifest fact labelled Observed; no relation type or witness on sequence messages or swimlane steps; no upgrade of any box; no matching by label; no change to the computed maps, the derived region, the provider mode or its golden; no script.
