# dossier-figure-walks

[Inferred] Version 2.40 of the dossier specification line: one MODIFIED REQ-polaris-generation-034 for bead syzygy-3efd.32, figure walks. Draft schema v16 is schema v15 plus an optional `walk` on a section or deep dive, at most one per place: 2 to 12 ordered steps through one graph figure drawn there, each tying one of the place's cited paragraphs to one element of the figure, which may be a base element of a version 2.35 view with a `base`. Check refuses a walk that does not resolve as stated. On the page, with no script, an HTML layer over the unchanged, inert drawing numbers each step's element, outlines the element whose step is the page's `:target`, and links each box whose element is not withheld and has a linked citation to the lines its first citation cites (a base element's box, having no citation, takes the number and the highlight and no link); an ordered list beside the figure links each step to its element and to its paragraph's existing `block-` fragment. A draft without a walk renders as it did; the provider mode keeps its bytes. Drafted and reviewed over figure plan 2.33 under placeholders, rebuilt over import facts 2.39 for adoption (`design.md` D1, D10, D11).

| File | What it holds |
|---|---|
| `proposal.md` | Why, what changes, non-goals |
| `design.md` | The choices made and why, the sequencing after syzygy-3efd.38, the bytes that move and the residuals |
| `SEMANTIC-DELTA.md` | Exactly what changes against the version 2.39 text (import facts), with displaced text quoted (generated from the bytes) |
| `proposed/polaris-generation/spec.md` | The complete MODIFIED requirement |
| `GOVERNING-DEPENDENCIES.json` | The union of its warrants (checked by `scripts/check_spec_reconciliation.py` R4); version 2.39's, unchanged |
| `tasks.md` | Delivery |

[Observed] `scripts/check_spec_reconciliation.py` composes it after version 2.39 only once one seven-column ledger row carries its tag, names the installing commit, links the spec at that commit and gives a revert, and the spec still hashes to the reviewed bytes; until then it is pending and the effective REQ-034 is its predecessor's.

## Rollback after a veto

Keep the adoption row as history, revert the commit the row names (its recorded command), and append a new row recording the veto; a vetoed change is not adopted again without the owner. With the veto row in place, the checker reads the predecessor text as effective again.
