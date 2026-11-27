# dossier-migration-bounds

[Inferred] Version 2.43 of the dossier specification line: one MODIFIED REQ-polaris-generation-034 for bead syzygy-3efd.87. It narrows the parity version 2.24 states for the migration of a schema-v10 or v11 draft to schema v12 (narrowed before by 2.38) to drafts whose migrated model fits the v12 bounds: at most 200 graph nodes and containment groups in all, and at most 400 graph edges in all. A larger draft that check passes migrates to a draft check refuses with a `schema` finding. No migration, bound, schema, brief, finding or rendered byte changes.

| File | What it holds |
|---|---|
| `proposal.md` | Why, what changes, non-goals |
| `design.md` | The label, why the claim narrows and the bounds stay, the scenario, the bytes that move, the code, composition |
| `SEMANTIC-DELTA.md` | Exactly what changes against the version 2.42 text (test-name recognizers), with displaced text quoted (generated from the bytes) |
| `proposed/polaris-generation/spec.md` | The complete MODIFIED requirement |
| `GOVERNING-DEPENDENCIES.json` | The union of its warrants (checked by `scripts/check_spec_reconciliation.py` R4); version 2.42's, unchanged |
| `tasks.md` | Delivery |

[Observed] `scripts/check_spec_reconciliation.py` composes this version after 2.42 only once two conditions hold. First, one seven-column ledger row carries its tag, names the installing commit, links the spec at that commit and gives a revert. Second, the spec still hashes to the reviewed bytes. Until then the version is pending and the effective REQ-034 is version 2.42's.

## Rollback after a veto

1. Keep the adoption row as history.
2. Revert the commit the row names, with its recorded command.
3. Revert the census, status and index changes of the row's own commit.
4. Append a new row recording the veto. A vetoed change is not adopted again without the owner.

With the veto row in place, the checker reads the version 2.42 text as effective again.
