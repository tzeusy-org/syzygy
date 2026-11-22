# dossier-spec-corrections

[Inferred] Candidate version 2.11 of the dossier specification line: one MODIFIED REQ-polaris-generation-034 for bead syzygy-3efd.75 and two findings of the review of syzygy-3efd.70 and .66. It corrects the version 2.10 text where it disagrees with the code that has landed or is about to land: the CI pipeline map's workflow block is a `<ul>`, and its job list appears only where the file has a listed job or need; `run-advice.json` counts as unreadable a record that is not the check record of its revision; `machine.json`'s `pages` list carries the three map pages; the singular sentences are stated; a manifest map says every candidate file was read for facts only where none of its recognizers counts an Unknown file, and otherwise counts the Unknown files it does not list; a bounded check record's reading difference has its own words; and the figure-fit text follows the readable layout that stacks every graph of two or more layers. It binds nothing until its row in [AGENT-ADOPTIONS.md](../../../.syzygy/governance/decisions/AGENT-ADOPTIONS.md) and the tag `polaris-dossier-spec-corrections-v2.11`; adoption state is read from that ledger and from `PROJECT-STATUS.md`, never from this page.

| File | What it holds |
|---|---|
| `proposal.md` | Why, what changes, non-goals |
| `design.md` | The code each correction was read from, the rule chosen for each, the bytes each changes, what the code must change, and the review's dispositions |
| `SEMANTIC-DELTA.md` | Exactly what changes against the effective version 2.10 text, with displaced text quoted |
| `proposed/polaris-generation/spec.md` | The complete MODIFIED requirement |
| `GOVERNING-DEPENDENCIES.json` | The union of its warrants (checked by `scripts/check_spec_reconciliation.py` R4); version 2.10's, unchanged |
| `tasks.md` | Delivery |

[Observed] `scripts/check_spec_reconciliation.py` composes it after version 2.10 only once one seven-column ledger row carries its tag, names the installing commit, links the spec at that commit and gives a revert, and the spec still hashes to the reviewed bytes; until then it is pending and the effective REQ-034 is version 2.10's.

## Rollback after a veto

Keep the adoption row as history, revert the commit the row names (its recorded command), revert the row's own commit's census, status and index changes, and append a new row recording the veto; a vetoed change is not adopted again without the owner. With the veto row in place, the checker reads the version 2.10 text as effective again.
