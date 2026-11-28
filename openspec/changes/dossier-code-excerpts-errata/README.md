# dossier-code-excerpts-errata

[Inferred] Version 2.56 of the dossier specification line: one MODIFIED REQ-polaris-generation-034 for bead syzygy-3efd.94. It corrects the code excerpts of version 2.54 to agree with themselves and with the code Syzygy ships (`code-marks.ts` and the code excerpt renderer, syzygy-3efd.33, PR #1060), on the points the .33 code lane and its review recorded (`docs/reviews/syzygy-3efd-33/R33-CODE-REVIEW-RAW.md` and its dispositions):

- the range an excerpt's checks need is a condition of its own, so an excerpt citing an absent path is skipped by its range alone;
- an excerpt's `schema` findings at its lists come first in its group, whatever its range, and only `code` elements at admitted positions are excerpts;
- a `range-beyond-blob` finding skips none of the checks;
- a highlight's and a note's lines are bounded at 10,000,000, the bound every citation line has;
- the browser scenario measures a band against its line's line box, as the topmost element painting a background there with the text above it, and a gutter number at its line's own text offset.

It also states the finding-detail rule of syzygy-3efd.93 (row A-347, PR #1061), with one added scenario:

- a finding's detail names a draft identity only where it is a handle, and otherwise the path of the member or object that holds it, or fixed words, never the value;
- every detail is screened, whole and word by word, against the secret detectors and the denied-path rules, and one that matches is replaced by `Finding detail withheld under source screening.`.

This version moves no byte of its own: the 2.54 corrections are what main ships, and the detail rule is A-347's code, which lands with or after this version. No draft schema or brief version moves. REQ-034 gains one scenario.

| File | What it holds |
|---|---|
| `proposal.md` | Why, what changes, non-goals |
| `design.md` | The label and numbers, each correction and the choice made for it, composition and bytes |
| `SEMANTIC-DELTA.md` | Exactly what changes against the version 2.55 text (view levels errata), with displaced text quoted (generated from the bytes) |
| `proposed/polaris-generation/spec.md` | The complete MODIFIED requirement |
| `GOVERNING-DEPENDENCIES.json` | The union of its warrants (checked by `scripts/check_spec_reconciliation.py` R4); version 2.55's, unchanged |
| `tasks.md` | Delivery |

[Observed] `scripts/check_spec_reconciliation.py` composes this version after 2.55 only once two conditions hold. First, one seven-column ledger row carries its tag, names the installing commit, links the spec at that commit and gives a revert. Second, the spec still hashes to the bytes the row binds. Until then the version is pending and the effective REQ-034 is version 2.55's.

## Rollback after a veto

1. Keep the adoption row as history.
2. Revert the commit the row names, with its recorded command.
3. Revert the census, status and index changes of the row's own commit.
4. Append a new row recording the veto. A vetoed change is not adopted again without the owner.

With the veto row in place, the checker reads the version 2.55 text as effective again.
