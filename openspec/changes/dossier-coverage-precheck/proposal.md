# Dossier coverage pre-check and justified-omission record — version 2.5

[Inferred] Candidate agent-decided change under VIS-4 as amended by GOVERNANCE-SIMPLIFICATION-D10. It binds only once its row in `AGENT-ADOPTIONS.md` and its version tag exist; no owner adoption is claimed. It decides no owner class (no doctrine edit, no change to secret detection or SEC-5's fail-closed rule, no foreign repository, no exposure, release or multi-user use).

## Why

- [Observed] Most fidelity failures are bookkeeping, not falsehood. Over the six stored operator-agent runs, the first validated fidelity verdict of each marks 181 of 385 inventory entries `unsupported`: the draft did not represent them (`docs/evidence/pursuit-2026-11-21b/measure-now.json`, figure `c_r4_replay`). Each such verdict costs a full review round, and the author learns which entries it missed only from the reviewer.
- [Observed] The comparison the reviewer makes first is mechanical. A rule that calls an entry covered when a draft citation overlaps one of its citations, or a claim block names a path it cites, lists 184 of those 385 entries, 151 of them among the 181 the reviewer marked unsupported, and 12 the reviewer accepted as represented (same figure; reproduced with the shipped rule in `docs/evidence/syzygy-5dhm-28/coverage-precheck-replay-2026-11-22.json`).
- [Observed] `syzygy dossier check` already tells the author, as advice, which cited files the review will not see (`reviewVisibility`) and which blocks no verdict can confirm (`reviewReach`). It says nothing about the inventory, although an inventory of record is in the run directory from the second draft revision on (`inventory.ts`, `inventoryOfRecord`).
- [Observed] The reviewer has two acceptable outcomes for an entry, `represented` and `justified-omission` (`draft-schema.ts`, `localVerdictSchema`); the draft schema gives the author no place to state the second, so an intended omission and an oversight look the same to every reader.

## What changes

One MODIFIED requirement, REQ-polaris-generation-034 ("Agent brief and mechanically checked draft"), complete text in `proposed/polaris-generation/spec.md`:

- Inventory-coverage advice, `inventoryCoverage` on check's report and in no file: rule `overlap-or-path-named` version 1 over the inventory of record; each uncovered entry listed by identifier and the distinct paths it cites, nothing else of the entry; a path a secret detector matches counted, never named; Unknown, never an empty list, where no inventory counts or it cannot be read; never a finding, an outcome or a refusal.
- An optional top-level `inventoryOmissions` member of a draft in schema v5 or later: `{"entryId", "reason"}` objects. An entry so recorded is not listed. It is never rendered, claims nothing, adds no schema version, and binds no reviewer disposition; in a v2 to v4 draft it is a `field-version` finding.

Every other sentence and scenario of REQ-034 is carried unchanged (SEMANTIC-DELTA.md). Provider mode is unaffected.

## Non-goals

No gate: the review step does not wait on the advice (that is slice 2, syzygy-5dhm.29, its own adoption). No coverage plan and no change to the fidelity brief, its criteria, the verdict schema or readiness (slice 3, syzygy-5dhm.30). No change to the authoring brief's words or version; the digest of the issued schema file, which a brief states, changes because that file describes the new member. No entry text, kind or line range reaches the authoring session. No new read of the repository: the advice reads the run directory's frozen inventory and the draft. No change to secret screening, the screening policy or the class gate.
