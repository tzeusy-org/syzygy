# dossier-record-bounds

[Inferred] Candidate version 2.10 of the dossier specification line: one MODIFIED REQ-polaris-generation-034 for beads syzygy-3efd.73 and syzygy-3efd.74. Every draft and inventory check record Syzygy writes lies within the version 2.8 read bound: a step measures the record before writing it and, where it would be past the bound, writes a bounded form holding only the members whose size does not grow with the subject and one repair finding, `check-record-bound`, so that draft or inventory does not pass. Every reader takes a check record's size before reading it, and the inventory check record is read under the same bound wherever Syzygy reads it, a record past it counting as no record. And the derived region tells a draft revision with no derived-record file from one whose file this render cannot use, in its words and in `machine.json`'s `state`. It binds nothing until its row in [AGENT-ADOPTIONS.md](../../../.syzygy/governance/decisions/AGENT-ADOPTIONS.md) and the tag `polaris-dossier-record-bounds-v2.10`; adoption state is read from that ledger and from `PROJECT-STATUS.md`, never from this page.

| File | What it holds |
|---|---|
| `proposal.md` | Why, what changes, non-goals |
| `design.md` | Which requirement owns the inventory check record, the measured worst cases and the bounded form, the region's words, the bytes each change touches, what the code must change, and the review's dispositions |
| `SEMANTIC-DELTA.md` | Exactly what changes against the effective version 2.9 text, with displaced lines quoted |
| `proposed/polaris-generation/spec.md` | The complete MODIFIED requirement |
| `GOVERNING-DEPENDENCIES.json` | The union of its warrants (checked by `scripts/check_spec_reconciliation.py` R4); version 2.9's plus REQ-polaris-generation-035 |
| `tasks.md` | Delivery |

The measurement behind the stated sizes is `docs/evidence/syzygy-3efd-73/record-bounds-measurement-2026-11-22.json`, with the two scripts beside it.

[Observed] `scripts/check_spec_reconciliation.py` composes it after version 2.9 only once one seven-column ledger row carries its tag, names the installing commit, links the spec at that commit and gives a revert, and the spec still hashes to the reviewed bytes; until then it is pending and the effective REQ-034 is version 2.9's.

## Rollback after a veto

Keep the adoption row as history, revert the commit the row names (its recorded command), revert the row's own commit's census, status and index changes, and append a new row recording the veto; a vetoed change is not adopted again without the owner. With the veto row in place, the checker reads the version 2.9 text as effective again.
