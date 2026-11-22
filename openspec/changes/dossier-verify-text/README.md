# dossier-verify-text

[Inferred] Candidate version 2.16 of the dossier specification line: one MODIFIED REQ-polaris-generation-033 that adds one command (bead syzygy-5dhm.23, pursuit 2026-11-21b move R2 slice 1). `syzygy dossier verify <run> --text <file> [--out <file>]` checks a free-form Markdown text about the run's pinned repository, whoever wrote it, with check's own citation and quotation derivation, and reports each claim's outcome, a tally of six outcomes and, with `--out`, an annotated copy. It binds nothing until its row in [AGENT-ADOPTIONS.md](../../../.syzygy/governance/decisions/AGENT-ADOPTIONS.md) and the tag `polaris-dossier-verify-text-v2.16`; adoption state is read from that ledger and from `PROJECT-STATUS.md`, never from this page.

| File | What it holds |
|---|---|
| `proposal.md` | Why, what changes, non-goals |
| `design.md` | The decisions the bead left open and the names fixed for the implementation |
| `SEMANTIC-DELTA.md` | Exactly what changes against the effective version 2.1 text of REQ-033 |
| `proposed/polaris-generation/spec.md` | The complete MODIFIED requirement |
| `GOVERNING-DEPENDENCIES.json` | The union of its warrants (checked by `scripts/check_spec_reconciliation.py` R4) |
| `tasks.md` | Delivery |

[Observed] `scripts/check_spec_reconciliation.py` (`verify_binding`) composes it after the URL declared-source run version 2.1, which last replaced REQ-033, only once one seven-column ledger row carries its tag, names the installing commit, links the spec at that commit and gives a revert, and the spec still hashes to the bound bytes; until then it is pending and the effective REQ-033 is version 2.1's.

## Rollback after a veto

Keep the adoption row as history, revert the commit the row names (its recorded command), revert the row's own commit's census, status and index changes, and append a new row recording the veto; a vetoed change is not adopted again without the owner. With the veto row in place, the checker reads the version 2.1 text as effective again.
