# dossier-declared-source-readmission

[Inferred] Candidate version 2.13 of the dossier specification line: one MODIFIED REQ-polaris-generation-046 ("Declared local-source admission") and the screening-policy successor it binds, `.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v3.json` (version `dossier-declared-source/3.0.0`), travelling as one semantic delta (bead syzygy-3efd.69). The successor is version 2.0.0 with 44 admitting entries appended to six second-stage lists: the entries version 2.0.0's D7 narrowing removed for reaching no path in a five-repository sample, re-admitted because a tree-metadata census of thirty named public repositories shows the screen placing at least one path by each. It binds nothing until its row in [AGENT-ADOPTIONS.md](../../../.syzygy/governance/decisions/AGENT-ADOPTIONS.md) and the tag `polaris-dossier-declared-source-readmission-v2.13`; adoption state is read from that ledger and from `PROJECT-STATUS.md`, never from this page.

| File | What it holds |
|---|---|
| `proposal.md` | Why, what changes, non-goals |
| `design.md` | The census, the re-admission bar, what stays out, the blast radius, what the code change must do, and the review's dispositions |
| `SEMANTIC-DELTA.md` | Exactly what changes in the specification and the policy, extracted from the bytes |
| `proposed/polaris-generation/spec.md` | The complete MODIFIED requirement |
| `GOVERNING-DEPENDENCIES.json` | The union of its warrants (checked by `scripts/check_spec_reconciliation.py` R4) |
| `tasks.md` | Delivery |

[Observed] `scripts/check_spec_reconciliation.py` composes it after version 2.6 only once one seven-column ledger row carries its tag, names the commit carrying the adopted bytes, links the spec and the policy at that commit and gives a revert, and both still hash to the reviewed bytes; until then it is pending and the effective REQ-046 is version 2.6's. Neither predecessor policy file is edited.

## Rollback after a veto

Keep the adoption row as history, run the row's recorded revert (it removes the successor policy, this package and the checker wiring), revert the row's own commit's census, status and index changes, and append a new row recording the veto; a vetoed change is not adopted again without the owner. With the veto row in place, the checker reads the version 2.6 text as effective again. If the code change that binds version 3.0.0 for new runs has landed by then, revert it first: it is what makes runs bind the successor.
