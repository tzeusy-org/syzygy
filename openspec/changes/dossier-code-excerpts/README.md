# dossier-code-excerpts

[Inferred] Version 2.54 of the dossier specification line: one MODIFIED REQ-polaris-generation-034 for bead syzygy-3efd.33. A code excerpt of draft schema v18 may carry `highlights`, ranges of its lines, and `notes`, each tying one of its lines to a cited paragraph of its place in a walk step's form. Check refuses a range or a line outside the excerpt or out of order and a note without a cited paragraph. A verified excerpt of a v18 draft renders with its lines numbered from the file's own line numbers, its highlights marked and named in words, and its notes marked and linked, with no script and the excerpt's own `<pre>` unchanged. Brief v26 issues schema v18 and asks for an excerpt where a mechanism is explained.

| File | What it holds |
|---|---|
| `proposal.md` | Why, what changes, non-goals |
| `design.md` | The label and numbers, the note's form, the checks, the render and its alignment, bytes and composition, the brief paragraph, code |
| `SEMANTIC-DELTA.md` | Exactly what changes against the version 2.53 text (walk errata), with displaced text quoted (generated from the bytes) |
| `proposed/polaris-generation/spec.md` | The complete MODIFIED requirement |
| `GOVERNING-DEPENDENCIES.json` | The union of its warrants (checked by `scripts/check_spec_reconciliation.py` R4); version 2.53's, unchanged |
| `tasks.md` | Delivery |

[Observed] `scripts/check_spec_reconciliation.py` composes this version after 2.53 only once two conditions hold. First, one seven-column ledger row carries its tag, names the installing commit, links the spec at that commit and gives a revert. Second, the spec still hashes to the bytes the row binds. Until then the version is pending and the effective REQ-034 is version 2.53's.

## Rollback after a veto

1. Keep the adoption row as history.
2. Revert the commit the row names, with its recorded command.
3. Revert the census, status and index changes of the row's own commit.
4. Append a new row recording the veto. A vetoed change is not adopted again without the owner.

With the veto row in place, the checker reads the version 2.53 text as effective again.
