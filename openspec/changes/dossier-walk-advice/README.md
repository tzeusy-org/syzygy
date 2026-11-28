# dossier-walk-advice

[Inferred] Version 2.48 of the dossier specification line: one MODIFIED REQ-polaris-generation-034 for bead syzygy-3efd.35. Check's report gains `walkAdvice`, rule `walk-step-restates-label` version 1: advice to the author on each walk step whose paragraph adds no word to its element's label, after a stated normalisation, with a threshold of zero new words. It gates nothing, carries no draft text, and moves no finding, record, page or brief.

| File | What it holds |
|---|---|
| `proposal.md` | Why, what changes, non-goals |
| `design.md` | The label and numbers, why report advice and not a reader standard, the exact rule, labels, composition and bytes, scenarios, code |
| `SEMANTIC-DELTA.md` | Exactly what changes against the version 2.47 text (view levels), with displaced text quoted (generated from the bytes) |
| `proposed/polaris-generation/spec.md` | The complete MODIFIED requirement |
| `GOVERNING-DEPENDENCIES.json` | The union of its warrants (checked by `scripts/check_spec_reconciliation.py` R4); version 2.47's, unchanged |
| `tasks.md` | Delivery |

[Observed] `scripts/check_spec_reconciliation.py` composes this version after 2.47 only once two conditions hold. First, one seven-column ledger row carries its tag, names the installing commit, links the spec at that commit and gives a revert. Second, the spec still hashes to the bytes the row binds. Until then the version is pending and the effective REQ-034 is version 2.47's.

## Rollback after a veto

1. Keep the adoption row as history.
2. Revert the commit the row names, with its recorded command.
3. Revert the census, status and index changes of the row's own commit.
4. Append a new row recording the veto. A vetoed change is not adopted again without the owner.

With the veto row in place, the checker reads the version 2.47 text as effective again.
