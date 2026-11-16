# Capture test-artifact no-spawn

## Patterns

- `R-CAPTURE-TEST-ARTIFACT-NO-SPAWN-.*\.md`

## What was under review

Pre-merge review of `poc:capture-test-artifact` printing the focused pytest command instead of spawning it, `apps/three-surface-poc/src/capture-test-artifact{,-main}.ts` (PR #383, `syzygy-4mbu`); implementation, binds nothing

## Last verdict of record, and where the findings landed

Round 1 `REVISE` (`R-CAPTURE-TEST-ARTIFACT-NO-SPAWN-1-RAW.md:2`) over `0c59614c`: three revise findings (operator-reported exit status and JUnit content reached the Verified badge as Observed; non-regular files, unbounded reads and a quadratic root-tag scan; the source check missed `process.getBuiltinModule`) and five notes, repaired in the same PR. Round 2 `REVISE` (`R-CAPTURE-TEST-ARTIFACT-NO-SPAWN-2-RAW.md:2`) over `0e6b5492`: round-1 findings 1–7 repaired; one revise finding (the Function constructor reached as `process.stdout.constructor.constructor` evaded the source check) and five notes, repaired in the same PR. Round 3 `CONFIRM WITH EXCEPTIONS` (`R-CAPTURE-TEST-ARTIFACT-NO-SPAWN-3-RAW.md:2`) over `5fd41040`: round-2 findings repaired; four notes, 0 revise (the permitted `execFileSync` binding reached without direct-call syntax; core imports read by local name; the Verified narrowing to tell the owner; `report-fact` on an Unknown span), carried to `syzygy-z774` and repaired in PR #386
