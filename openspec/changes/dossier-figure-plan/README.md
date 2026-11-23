# dossier-figure-plan

[Inferred] Candidate version 2.NN of the dossier specification line (label chosen at adoption): one MODIFIED REQ-polaris-generation-034 for bead syzygy-3efd.40, the figure plan. Draft schema v12 carries a required `figurePlan`: for the overview, each section and each deep dive, the one question a picture answers better than text, the figure kind it needs and the diagram that answers it, or why the place has none. Check refuses a plan that misses or repeats a place or names a figure that is not the one drawn there, and advises, gating nothing, on a figure that is a chain of three or fewer, draws nothing another figure does not, or draws a unit beside a unit within it without a contains arrow or a nesting. The plan renders nowhere; no rendered byte moves; the provider mode keeps its bytes.

| File | What it holds |
|---|---|
| `proposal.md` | Why, what changes, non-goals |
| `design.md` | The choices made and why, the concurrent candidate and how the later one merges, the bytes that move and the residuals |
| `SEMANTIC-DELTA.md` | Exactly what changes against the version 2.23 text (containment figure), with displaced text quoted (generated from the bytes) |
| `proposed/polaris-generation/spec.md` | The complete MODIFIED requirement |
| `GOVERNING-DEPENDENCIES.json` | The union of its warrants (checked by `scripts/check_spec_reconciliation.py` R4); version 2.23's, unchanged |
| `tasks.md` | Delivery |

[Observed] `scripts/check_spec_reconciliation.py` composes it after version 2.23 only once one seven-column ledger row carries its tag, names the installing commit, links the spec at that commit and gives a revert, and the spec still hashes to the reviewed bytes; until then it is pending and the effective REQ-034 is version 2.23's.

## Rollback after a veto

Keep the adoption row as history, revert the commit the row names (its recorded command), and append a new row recording the veto; a vetoed change is not adopted again without the owner. With the veto row in place, the checker reads the version 2.23 text as effective again.
