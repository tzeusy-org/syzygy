# dossier-view-levels

[Inferred] Version 2.47 of the dossier specification line: one MODIFIED REQ-polaris-generation-034 for bead syzygy-3efd.39. Draft schema v17 lets a graph or containment view carry a `level` (`context`, `container` or `component`) and a `scope` (the element it is about). The level admits element types and the scope bounds what a container or component view shows, both enforced as repair findings. A figure that draws an element with its own view links that box, and its list item, to that view, with no script. Brief v25 issues schema v17.

| File | What it holds |
|---|---|
| `proposal.md` | Why, what changes, non-goals |
| `design.md` | The label and numbers, the level table, the scope, the two meanings of "level", zoom links, bytes, composition, code |
| `SEMANTIC-DELTA.md` | Exactly what changes against the version 2.45 text (imports corroboration), with displaced text quoted (generated from the bytes) |
| `proposed/polaris-generation/spec.md` | The complete MODIFIED requirement |
| `GOVERNING-DEPENDENCIES.json` | The union of its warrants (checked by `scripts/check_spec_reconciliation.py` R4); version 2.45's, unchanged |
| `tasks.md` | Delivery |

[Observed] `scripts/check_spec_reconciliation.py` composes this version after 2.45 only once two conditions hold. First, one seven-column ledger row carries its tag, names the installing commit, links the spec at that commit and gives a revert. Second, the spec still hashes to the bytes the row binds. Until then the version is pending and the effective REQ-034 is version 2.45's.

## Rollback after a veto

1. Keep the adoption row as history.
2. Revert the commit the row names, with its recorded command.
3. Revert the census, status and index changes of the row's own commit.
4. Append a new row recording the veto. A vetoed change is not adopted again without the owner.

With the veto row in place, the checker reads the version 2.45 text as effective again.
