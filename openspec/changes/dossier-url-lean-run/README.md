# dossier-url-lean-run

[Inferred] Version 2.46 of the dossier specification line, for bead syzygy-k54o.3.2: complete MODIFIED texts of REQ-polaris-generation-025 and 047 over URL dossier 2.1. A URL run needs no record and fetches one commit with no credential; the native URL transport, relay and audit clauses 2.1 wrote for those two requirements are dropped.

| File | What it holds |
|---|---|
| `proposal.md` | Why, what changes, non-goals |
| `design.md` | The label, why 2.1 is restated rather than retired, composition |
| `SEMANTIC-DELTA.md` | What changes against the 2.1 texts |
| `proposed/polaris-generation/spec.md` | The two complete MODIFIED requirements |
| `GOVERNING-DEPENDENCIES.json` | The union of its warrants (checked by `scripts/check_spec_reconciliation.py` R4) |
| `tasks.md` | Delivery |

[Observed] `scripts/check_spec_reconciliation.py` composes this version over the effective 2.1 only once two conditions hold. First, one seven-column ledger row carries its tag, names the installing commit, links the spec at that commit and gives a revert. Second, the spec still hashes to the bytes it was installed with. Until then the version is pending and 025 and 047 are 2.1's.

## Rollback after a veto

1. Keep the adoption row as history.
2. Revert the commit the row names, with its recorded command.
3. Revert the census, status and index changes of the row's own commit.
4. Append a new row recording the veto. A vetoed change is not adopted again without the owner.

With the veto row in place, the checker reads the 2.1 texts as effective again.
