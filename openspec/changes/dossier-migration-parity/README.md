# dossier-migration-parity

[Inferred] Version 2.38 of the dossier specification line: one MODIFIED REQ-polaris-generation-034 for bead syzygy-3efd.85. It narrows the byte-parity claim of the version 2.24 migration from schema v10 and v11 to schema v12. A graph edge that is not itself withheld, one of whose end nodes renders as a withheld item, may render Observed under version 2.19 but migrates under version 2.24 to a relationship whose witness state is `unknown` (`edge-not-inferred`), drawn with the draft's marking. The figure that draws such an edge, its `machine.json` entry, the figure-fit member and the reading ledger are taken out of the parity; the 2.24 rule is kept. No schema, brief, finding or rendered byte changes.

| File | What it holds |
|---|---|
| `proposal.md` | Why, what changes, non-goals |
| `design.md` | The label, why the claim narrows and the rule stays, the scenarios, the bytes that move, the code |
| `SEMANTIC-DELTA.md` | Exactly what changes against the version 2.36 text (source-example advice), with displaced text quoted (generated from the bytes) |
| `proposed/polaris-generation/spec.md` | The complete MODIFIED requirement |
| `GOVERNING-DEPENDENCIES.json` | The union of its warrants (checked by `scripts/check_spec_reconciliation.py` R4); version 2.36's, unchanged |
| `tasks.md` | Delivery |

[Observed] `scripts/check_spec_reconciliation.py` composes this version after 2.36 only once two conditions hold. First, one seven-column ledger row carries its tag, names the installing commit, links the spec at that commit and gives a revert. Second, the spec still hashes to the reviewed bytes. Until then the version is pending and the effective REQ-034 is version 2.36's.

## Rollback after a veto

1. Keep the adoption row as history.
2. Revert the commit the row names, with its recorded command.
3. Revert the census, status and index changes of the row's own commit.
4. Append a new row recording the veto. A vetoed change is not adopted again without the owner.

With the veto row in place, the checker reads the version 2.36 text as effective again.
