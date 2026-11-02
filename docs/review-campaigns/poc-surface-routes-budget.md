# Surface-routes CI budget

## Patterns

- `R-SURFACE-ROUTES-BUDGET-.*\.md`

## What was under review

`surface-routes.test.ts` 13-link exhaustion shares one browser across its two forms, `syzygy-8hr` (PR #126)

## Last verdict of record, and where the findings landed

`REVISE` (`R-SURFACE-ROUTES-BUDGET-REVIEW-RAW.md:1`): the shared teardown swallowed a `browser.close()` drain failure; repaired so it propagates (mutation-checked), hooks budgeted 60,000ms to match the other browser suites.; confirmation `CONFIRM` (`R-SURFACE-ROUTES-BUDGET-CONFIRMATION-RAW.md:1`).
