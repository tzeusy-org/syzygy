# dossier-walk-errata

[Inferred] Version 2.53 of the dossier specification line: one MODIFIED REQ-polaris-generation-034 for bead syzygy-3efd.90. It corrects two statements of the figure walks of version 2.40 to the behaviour Syzygy ships, both recorded as residuals by the .88 code review (`docs/reviews/syzygy-3efd-88/R88-CODE-REVIEW-DISPOSITIONS.md`, notes 3 and 10):

- the brief v24 paragraph is quoted with the bare quotation marks the brief issues;
- every walk box takes the pointer, so a walked figure's drawing shows no per-node tooltip under it. This is now stated as a trade-off and accepted, with no code change.

No finding, record, page, brief byte, draft schema, brief version or scenario moves.

| File | What it holds |
|---|---|
| `proposal.md` | Why, what changes, non-goals |
| `design.md` | The label and numbers, the two corrections and the choice made for each, composition and bytes, code |
| `SEMANTIC-DELTA.md` | Exactly what changes against the version 2.51 text (walk advice), with displaced text quoted (generated from the bytes) |
| `proposed/polaris-generation/spec.md` | The complete MODIFIED requirement |
| `GOVERNING-DEPENDENCIES.json` | The union of its warrants (checked by `scripts/check_spec_reconciliation.py` R4); version 2.51's, unchanged |
| `tasks.md` | Delivery |

[Observed] `scripts/check_spec_reconciliation.py` composes this version after 2.51 only once two conditions hold. First, one seven-column ledger row carries its tag, names the installing commit, links the spec at that commit and gives a revert. Second, the spec still hashes to the bytes the row binds. Until then the version is pending and the effective REQ-034 is version 2.51's.

## Rollback after a veto

1. Keep the adoption row as history.
2. Revert the commit the row names, with its recorded command.
3. Revert the census, status and index changes of the row's own commit.
4. Append a new row recording the veto. A vetoed change is not adopted again without the owner.

With the veto row in place, the checker reads the version 2.51 text as effective again.
