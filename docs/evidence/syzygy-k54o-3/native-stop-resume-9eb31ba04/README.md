# Uninstrumented public Stop and Resume at 9eb31ba04

[Observed] One selected native test failed and three were skipped. The selected test ran for 233.914 seconds using the existing PT2H run deadline and 540-second test watchdog. The independent checkout began and ended at `9eb31ba04eb3164b269727fc57417e7117528efc` with a clean tree. Draft PR #839 head `00bd4845189ec5fbce41ed5a1158f97249db2827` has the same tracked bytes across `apps/`, `packages/`, `scripts/`, `package.json` and `package-lock.json`.

[Observed] The public CLI verified the retained cut, obtained the exact current claim and passed policy and claim withdrawal checks. The fresh attempt recorded the three historical role declarations and launched only Design. Its five Design records end with a durable Round 2 delivery at site 1 and an `inspection-failed` terminal. The view exited on SIGTERM, the process group terminated, and the tool host settled with zero pending invocations. The CLI reported `transport-unavailable` and returned 1. The fresh Design audit contains no machine-peer or relay record. The fixture counted zero Design provider forwards and produced no Execution Record.

[Unknown] The first transport or inspection predicate that refused. The terminal result and CLI summary report different layers of the same attempt, and this run had no predicate instrumentation.

The projection retains the closed audit population and digests of the original files in the owned scratch namespace. Reproduce it there with the original artifact prefix.

```sh
PYTHONDONTWRITEBYTECODE=1 python3 project.py "<original artifact prefix>" | cmp - run-binding.json
sha256sum --check sha256sums.txt
```
