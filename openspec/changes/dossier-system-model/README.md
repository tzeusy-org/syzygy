# dossier-system-model

[Inferred] Candidate version 2.24 of the dossier specification line: one MODIFIED REQ-polaris-generation-034 for bead syzygy-3efd.37. It adds draft schema `polaris-dossier-local-draft-v12` with one system model (elements with a type, an optional parent and unit; relationships cited by the draft or derived by Syzygy), makes every graph and containment figure a one-level view selecting from that model, renders a shared element as one claim, states a derived relationship only in Syzygy's words, and defines a pure migration from schema v10 or v11 whose figures render byte for byte as the original's; brief `polaris-dossier-brief-v18`. Drafts of schema v11 and earlier, stored drafts, sequence and swimlane figures and the provider mode keep their bytes.

| File | What it holds |
|---|---|
| `proposal.md` | Why, what changes, non-goals |
| `design.md` | The choices made and why, what the model is grounded in, views, shared elements, migration, the bytes that move, what the code must change, the repair-cycle question, and the review's dispositions |
| `SEMANTIC-DELTA.md` | Exactly what changes against the version 2.23 text (containment figure), with displaced text quoted (generated from the bytes) |
| `proposed/polaris-generation/spec.md` | The complete MODIFIED requirement |
| `GOVERNING-DEPENDENCIES.json` | The union of its warrants (checked by `scripts/check_spec_reconciliation.py` R4); version 2.23's, unchanged |
| `tasks.md` | Delivery |

[Observed] `scripts/check_spec_reconciliation.py` composes it after version 2.23 only once one seven-column ledger row carries its tag, names the installing commit, links the spec at that commit and gives a revert, and the spec still hashes to the reviewed bytes; until then it is pending and the effective REQ-034 is version 2.23's.

## Rollback after a veto

Keep the adoption row as history, revert the commit the row names (its recorded command), revert the row's own commit's census, status and index changes, and append a new row recording the veto; a vetoed change is not adopted again without the owner. With the veto row in place, the checker reads the version 2.23 text as effective again.
