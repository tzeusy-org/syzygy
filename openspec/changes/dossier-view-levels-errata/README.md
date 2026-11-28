# dossier-view-levels-errata

[Inferred] Version 2.55 of the dossier specification line: one MODIFIED REQ-polaris-generation-034 for bead syzygy-3efd.91. It corrects the view levels of version 2.50 to agree with themselves and with the code Syzygy ships, on the five points the .39 code lane and its review recorded (`docs/reviews/syzygy-3efd-39/R39-CODE-REVIEW-RAW.md`, notes 3 and 4; the PR's three recorded departures), and adds one scenario from syzygy-3efd.92:

- a scenario's address between two deep dives is the one the paragraph gives, `../deep-dives/runtime.html#figure-parts`;
- two scenarios that put a walk on the overview, which no version admits, put it on section `s1`;
- a scenario's view "inside a collapsible section", which no render draws, is an omitted view, and the paragraph says no figure renders inside one;
- a 1048 px clause no render can reach is dropped;
- a zoom target whose figure fails the inertness check refuses the render, as the code does, where 2.50's text passed it over;
- a top-level directory a denied-path rule names is still a fact on the directory map, and a walk step on one whose own path is denied is not read by the walk advice.

No finding, record, page byte, brief byte, draft schema or brief version moves. REQ-034 gains one scenario.

| File | What it holds |
|---|---|
| `proposal.md` | Why, what changes, non-goals |
| `design.md` | The label and numbers, each correction and the choice made for it, composition and bytes, code |
| `SEMANTIC-DELTA.md` | Exactly what changes against the version 2.54 text (code excerpts), with displaced text quoted (generated from the bytes) |
| `proposed/polaris-generation/spec.md` | The complete MODIFIED requirement |
| `GOVERNING-DEPENDENCIES.json` | The union of its warrants (checked by `scripts/check_spec_reconciliation.py` R4); version 2.54's, unchanged |
| `tasks.md` | Delivery |

[Observed] `scripts/check_spec_reconciliation.py` composes this version after 2.54 only once two conditions hold. First, one seven-column ledger row carries its tag, names the installing commit, links the spec at that commit and gives a revert. Second, the spec still hashes to the bytes the row binds. Until then the version is pending and the effective REQ-034 is version 2.54's.

## Rollback after a veto

1. Keep the adoption row as history.
2. Revert the commit the row names, with its recorded command.
3. Revert the census, status and index changes of the row's own commit.
4. Append a new row recording the veto. A vetoed change is not adopted again without the owner.

With the veto row in place, the checker reads the version 2.54 text as effective again.
