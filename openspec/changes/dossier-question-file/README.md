# dossier-question-file

[Inferred] Candidate version 2.27 of the dossier specification line: one MODIFIED REQ-polaris-generation-033 for bead syzygy-5dhm.21 (pursuit 2026-11-21b move R1 slice 1). The run record names the question file the run was initialised under, by format, version and SHA-256; the question file is the one place a dossier's reader questions are written, three public lists and a held-out part that records evaluator key identifiers, digests and counts. Actual key bytes belong outside the checkouts and views authoring roles can read. It binds nothing until its row in [AGENT-ADOPTIONS.md](../../../.syzygy/governance/decisions/AGENT-ADOPTIONS.md) and the tag `polaris-dossier-question-file-v2.27`; adoption state is read from that ledger and from `PROJECT-STATUS.md`, never from this page.

| File | What it holds |
|---|---|
| `proposal.md` | Why, what changes, non-goals |
| `design.md` | The choices made and what is not yet implemented |
| `SEMANTIC-DELTA.md` | Exactly what changes against the effective version 2.21 text of REQ-033 |
| `proposed/polaris-generation/spec.md` | The complete MODIFIED requirement |
| `GOVERNING-DEPENDENCIES.json` | The union of its warrants (checked by `scripts/check_spec_reconciliation.py` R4); version 2.21's, unchanged |
| `tasks.md` | Delivery |

[Observed] `scripts/check_spec_reconciliation.py` (`qfile_binding`) composes it after the verify-text version 2.21, which last replaced REQ-033, only once one seven-column ledger row carries its tag, names the installing commit, links the spec at that commit and gives a revert, and the spec still hashes to the bound bytes; until then it is pending and the effective REQ-033 is version 2.21's.

## Rollback after a veto

Keep the adoption row as history, revert the commit the row names (its recorded command), revert the row's own commit's census, status and index changes, and append a new row recording the veto; a vetoed change is not adopted again without the owner. With the veto row in place, the checker reads the version 2.21 text as effective again.
