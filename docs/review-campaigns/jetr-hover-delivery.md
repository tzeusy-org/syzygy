# syzygy-jetr mobile citation hover delivery

## Patterns

- `R-JETR-HOVER-DELIVERY-.*\.md`

## What was under review

The 390 × 844 inline citation hover in `dossier-reading.browser.test.ts` (`syzygy-jetr`): an instant scroll held still across two frames before one trusted CDP move, a recorded delivery that fails with sampled and delivered geometry, trust, target and hint state, and a 40-pixel displacement control. Test-only; fixture, production and workflow unchanged.

## Last verdict of record, and where the findings landed

`REVISE` (`R-JETR-HOVER-DELIVERY-1-RAW.md:2`) over `a3acc4f14`. The pull request body (#1011) records the repair or answer for each of its eight findings; the review gates nothing and no confirmation round follows (D10).
