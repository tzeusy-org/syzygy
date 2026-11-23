# dossier-containment-figure

[Inferred] Candidate version 2.23 of the dossier specification line: one MODIFIED REQ-polaris-generation-034 for bead syzygy-3efd.31. It adds draft schema `polaris-dossier-local-draft-v11` with a figure kind `containment`, a tree of groups at most three levels deep drawn as boxes within boxes by a pure layout, with no line between groups and a nested-list form on a narrow screen; findings naming each bound; each nesting of two groups with units read by rule `relation-witness` as a `contains` relation; and brief `polaris-dossier-brief-v17`. Drafts of schema v10 and earlier, stored drafts and the provider mode keep their bytes.

| File | What it holds |
|---|---|
| `proposal.md` | Why, what changes, non-goals |
| `design.md` | The choices made and why, what the structure record can witness, the layout, the bytes that move, what the code must change, and the review's dispositions |
| `SEMANTIC-DELTA.md` | Exactly what changes against the version 2.22 text (reader's edition), with displaced text quoted (generated from the bytes) |
| `proposed/polaris-generation/spec.md` | The complete MODIFIED requirement |
| `GOVERNING-DEPENDENCIES.json` | The union of its warrants (checked by `scripts/check_spec_reconciliation.py` R4); version 2.22's, unchanged |
| `tasks.md` | Delivery |

[Observed] `scripts/check_spec_reconciliation.py` composes it after version 2.22 only once one seven-column ledger row carries its tag, names the installing commit, links the spec at that commit and gives a revert, and the spec still hashes to the reviewed bytes; until then it is pending and the effective REQ-034 is version 2.22's.

## Rollback after a veto

Keep the adoption row as history, revert the commit the row names (its recorded command), revert the row's own commit's census, status and index changes, and append a new row recording the veto; a vetoed change is not adopted again without the owner. With the veto row in place, the checker reads the version 2.22 text as effective again.
