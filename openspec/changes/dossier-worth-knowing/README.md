# dossier-worth-knowing

[Inferred] Candidate version 2.23 of the dossier specification line: one MODIFIED REQ-polaris-generation-034 for bead syzygy-5dhm.41, the worth-knowing mark. A draft in schema v11 may mark a cited Inferred block, one of a section's own paragraphs, as worth knowing: a fact about the project an engineer new to it would not guess from the kind of project it is. Check refuses a mark on any other block, on an uncited block or on a judgement, and advises a Pole that marks none without saying why, or more than three. The marked blocks of a page render once, in one "Worth knowing" callout before its sections. Brief v17 asks for one to three per Pole, a ceiling and never a quota, and inventory brief v4 asks the inventory session for the same facts. Earlier drafts and the provider mode keep their bytes.

| File | What it holds |
|---|---|
| `proposal.md` | Why, what changes, non-goals |
| `design.md` | The choices made and why, the bytes that move, the evidence, and what is not yet implemented |
| `SEMANTIC-DELTA.md` | Exactly what changes against the version 2.22 text (reader's edition), with displaced text quoted (generated from the bytes) |
| `proposed/polaris-generation/spec.md` | The complete MODIFIED requirement |
| `GOVERNING-DEPENDENCIES.json` | The union of its warrants (checked by `scripts/check_spec_reconciliation.py` R4); version 2.22's, unchanged |
| `tasks.md` | Delivery |

[Observed] `scripts/check_spec_reconciliation.py` composes it after version 2.22 only once one seven-column ledger row carries its tag, names the installing commit, links the spec at that commit and gives a revert, and the spec still hashes to the reviewed bytes; until then it is pending and the effective REQ-034 is version 2.22's.

## Rollback after a veto

Keep the adoption row as history, revert the commit the row names (its recorded command), revert the row's own commit's census, status and index changes, and append a new row recording the veto; a vetoed change is not adopted again without the owner. With the veto row in place, the checker reads the version 2.22 text as effective again. The checker, schema, brief and renderer change is separate: reverting it is `git revert` of the implementation commit this branch names in `tasks.md`.
