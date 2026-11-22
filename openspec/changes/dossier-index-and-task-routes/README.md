# dossier-index-and-task-routes

[Inferred] Candidate version 2.14 of the dossier specification line. It is one MODIFIED REQ-polaris-generation-034 that adds two finding pages to every operator-agent dossier (beads syzygy-5dhm.70 and syzygy-5dhm.71, R15 slices 1 and 2). A generated index lists every glossary term, derived top-level directory, cited or named file, backticked identifier and figure title, each linked to every block that names it; a find-by-task page renders the draft's task routes. Both are built at render with no model call and no script. A draft in schema `polaris-dossier-local-draft-v5` or later may carry `taskRoutes`, 8 to 15 reader tasks each answered by a route of cited steps that are checked exactly as any cited claim block is; the brief, `polaris-dossier-brief-v13`, asks for them. A draft without routes validates and renders, and its find-by-task page says it has none. The provider mode keeps its bytes. It binds nothing until its row in [AGENT-ADOPTIONS.md](../../../.syzygy/governance/decisions/AGENT-ADOPTIONS.md) and the tag `polaris-dossier-index-and-task-routes-v2.14`; adoption state is read from that ledger and from `PROJECT-STATUS.md`, never from this page.

| File | What it holds |
|---|---|
| `proposal.md` | Why, what changes, non-goals |
| `design.md` | The decisions the beads left open, the names fixed for the implementation, and the review's dispositions |
| `SEMANTIC-DELTA.md` | Exactly what changes against the effective version 2.12 text, with displaced lines quoted |
| `proposed/polaris-generation/spec.md` | The complete MODIFIED requirement |
| `GOVERNING-DEPENDENCIES.json` | The union of its warrants (checked by `scripts/check_spec_reconciliation.py` R4); unchanged from version 2.12 |
| `tasks.md` | Delivery |

[Observed] `scripts/check_spec_reconciliation.py` composes it after version 2.12 only once one seven-column ledger row carries its tag, names the installing commit, links the spec at that commit and gives a revert, and the spec still hashes to the reviewed bytes; until then it is pending and the effective REQ-034 is version 2.12's.

## Rollback after a veto

Keep the adoption row as history, revert the commit the row names (its recorded command), revert the row's own commit's census, status and index changes, and append a new row recording the veto; a vetoed change is not adopted again without the owner. With the veto row in place, the checker reads the version 2.12 text as effective again. The installing commit also carries the implementation, so its revert removes the two pages, the fragment identities, the `taskRoutes` member and the brief section together.
