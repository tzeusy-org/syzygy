# syzygy-5dhm.29 — the fidelity review waits for inventory coverage (spec 2.28)

| File | What it holds |
|---|---|
| `coverage_hold_build_spec.py` | Builds `openspec/changes/dossier-coverage-hold/proposed/polaris-generation/spec.md` from the version 2.18 bytes of REQ-polaris-generation-035 (digest asserted); `--check` compares |
| `coverage_hold_survival.py` | Counts the predecessor lines carried in order and the lines added (206 carried, 18 added; 40 to 44 scenarios) |
| `coverage_hold_mutation.mjs` | The rule-6 mutation runner: each mutant's `old` and `new` fragment, the test files it runs, restore in `finally` |
| `coverage-hold-mutation-2026-11-25.json` | Its record at commit `6896bbdb6de0c4c27fd6a7f03269538656436f61`, run in a clone of that commit: 14 mutants, 14 killed, the subject digests and every baseline |
