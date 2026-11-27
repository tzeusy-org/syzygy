# dossier-imports-corroboration

[Inferred] Version 2.42 of the dossier specification line: one MODIFIED REQ-polaris-generation-034 for bead syzygy-3efd.86. Rule `relation-witness` becomes version 2, with a row for `imports` that reads the lexical import facts stored since 2.39 (`importFacts`). An `imports` arrow between two `package-manifest` units that an `edge` import fact joins is `corroborated`: it keeps the draft's marking and is never Observed, and it gains attributes and evidence text naming the fact. Every other `imports` arrow is Unknown, never challenged. No schema, brief, finding or check record changes.

| File | What it holds |
|---|---|
| `proposal.md` | Why, what changes, non-goals |
| `design.md` | The label, corroboration rather than witnessing, absence, where facts are read, bytes, code, composition |
| `SEMANTIC-DELTA.md` | Exactly what changes against the version 2.41 text (migration bounds), with displaced text quoted (generated from the bytes) |
| `proposed/polaris-generation/spec.md` | The complete MODIFIED requirement |
| `GOVERNING-DEPENDENCIES.json` | The union of its warrants (checked by `scripts/check_spec_reconciliation.py` R4); version 2.41's, unchanged |
| `tasks.md` | Delivery |

[Observed] `scripts/check_spec_reconciliation.py` composes this version after 2.41 only once two conditions hold. First, one seven-column ledger row carries its tag, names the installing commit, links the spec at that commit and gives a revert. Second, the spec still hashes to the reviewed bytes. Until then the version is pending and the effective REQ-034 is version 2.41's.

## Rollback after a veto

1. Keep the adoption row as history.
2. Revert the commit the row names, with its recorded command.
3. Revert the census, status and index changes of the row's own commit.
4. Append a new row recording the veto. A vetoed change is not adopted again without the owner.

With the veto row in place, the checker reads the version 2.41 text as effective again.
