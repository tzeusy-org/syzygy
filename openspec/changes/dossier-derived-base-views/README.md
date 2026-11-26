# dossier-derived-base-views

[Inferred] Version 2.34 of the dossier specification line, over figure plan 2.33: one MODIFIED REQ-polaris-generation-034 for bead syzygy-3efd.38. It adds draft schema `polaris-dossier-local-draft-v15`, schema v14 plus `base`, in which a graph or containment view may start from the directory map or the unit map. The view reads that map read-only, as an embedded computed visual (RFC7-28). It may hide elements with a reason, group them under the draft's elements, give them display names, and draw cited arrows to them. Every derived element stays in Syzygy's words, and a chip Syzygy computes prints how many the figure shows of how many, with a link to the full map. Figure advice reads no base view. It also adds brief `polaris-dossier-brief-v23`. Drafts of schema v14 and earlier, the map pages and the provider mode keep their bytes.

| File | What it holds |
|---|---|
| `proposal.md` | Why, what changes, non-goals |
| `design.md` | The choices made and why: the grounding in the two maps, the narrow exception and its doctrine and contract basis, operations, the chip, check and render, bounds, shared claims, the bytes that move, what the code must change, and residuals |
| `SEMANTIC-DELTA.md` | Exactly what changes against the version 2.33 text (figure plan), with displaced text quoted (generated from the bytes) |
| `proposed/polaris-generation/spec.md` | The complete MODIFIED requirement |
| `GOVERNING-DEPENDENCIES.json` | The union of its warrants (checked by `scripts/check_spec_reconciliation.py` R4); version 2.33's, unchanged |
| `tasks.md` | Delivery |

[Observed] `scripts/check_spec_reconciliation.py` composes this version after 2.33 only once two conditions hold. First, one seven-column ledger row carries its tag, names the installing commit, links the spec at that commit and gives a revert. Second, the spec still hashes to the reviewed bytes. Until then the version is pending and the effective REQ-034 is version 2.24's.

## Rollback after a veto

1. Keep the adoption row as history.
2. Revert the commit the row names, with its recorded command.
3. Revert the census, status and index changes of the row's own commit.
4. Append a new row recording the veto. A vetoed change is not adopted again without the owner.

With the veto row in place, the checker reads the version 2.33 text as effective again.
