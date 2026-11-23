# Reader sessions over the reader's edition (syzygy-5dhm.136), 2026-11-23

Not authority. The before-and-after reader measurement that rule A-38 asks for, on two of the seven stored runs (`658f2f90` and `d9411d26`). It is one blind grading by one model grader, with one model reader per arm, and it is not calibrated.

- Key: the 2026-11-21 pilot's key, 24 questions and 81 required facts (`docs/evidence/pursuit-2026-11-21b/pilot/`).
- Arms: 11, graded together under blind letters.

| Arm | Text the reader read |
|---|---|
| R | Run `658f2f90`, reader form (`dossier_site_to_text.py --reader`) of this change's render |
| S | Run `d9411d26`, reader form of this change's render |
| U | Run `658f2f90`, full text of this change's render |
| V | Run `d9411d26`, full text of this change's render |
| W | Run `658f2f90`, full text of `main` `82290fb9`'s render (before) |
| X | Run `d9411d26`, full text of `main` `82290fb9`'s render (before) |
| Y | Run `658f2f90`, the original stored site, as text |
| Z | Run `d9411d26`, the original stored site, as text |
| D, E, P | The pilot's arms D, E and P, kept as anchors (their answers are in the pilot record) |

## Files

| File | What it is |
|---|---|
| `answers-{R,S,U,V,W,X,Y,Z}.json` | Each new arm's answers. |
| `grade/grades.json` | The grader's per-question fact marks under blind letters. |
| `labels/labels.json` | The map from blind letter to arm, opened only after grading. |
| `totals.py` | Unblinds and totals. Run `python3 totals.py <this directory>`. |
| `totals.txt` | Its output: the share of required facts per arm, overall and per kind, with wrong answers. |

## Result

The reading is [Inferred]: one uncalibrated grading.

- Run `658f2f90`, overall:
  - main's render (W): 0.235;
  - this change, full text (U): 0.235;
  - this change, reader form (R): 0.216.
- Run `d9411d26`, overall:
  - main's render (X): 0.444;
  - this change, full text (V): 0.451;
  - this change, reader form (S): 0.469.
- Main's render compared with this change's full text (W to U, X to V):
  - no kind and no overall share drops by more than five points (the largest drop is mechanism, -3 on `658f2f90`);
  - no gain is claimed.
- Main's render compared with the reader form (W to R, X to S):
  - overall -2 and +2;
  - one kind drops by more than five points: structure, -8 on `658f2f90` (0.29 to 0.21);
  - the reader form leaves out the run pages, so it is a smaller text, not a different render.
- [Observed] Main's render already scores below the original stored sites (Y 0.290 and Z 0.593 against W and X), mostly on limits. That gap is not this change's; it is filed as syzygy-a70b.

Before committing, the answers were checked for token-shaped strings, and no match was printed. One 44-character match, the same in all four `d9411d26` answers, is a two-segment letters-only path, not a credential.
