# R-GP-IMPL-UNIT-GUARD-RULE6-1 — CC-REV-1 implementation review of syzygy-l9vt (unit-tier guard inspector patch, rule-6 runner errored class, timeout and tier mapping), round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: f0a72c4d5d2dbe50f5ff8436d73e7ecd4d58e316
Subject: PR #623

Reviewer: fresh-context beads-pr-reviewer-worker (syzygy-sjrs). Merge base 8c87afb1; six files, +174 -37.

## Method
- Scratch detached worktree at f0a72c4d, `npm ci`, no `dist/` present (checked with `find`), short TMPDIR.
- Gates run at that head: `npm run typecheck` exit 0; `npm test` (unit tier) 164 files, 3603 tests passed; `npm run test:tiers` ok, "every test file is in exactly one tier" (unit 164, integration 86, e2e 24, live 3); `python3 -I` `--selftest` of all four scripts exit 0 (13, 7, 7, 10 cases); `scripts/check_governance.py` 32 OK, 21 WARN, 0 FAIL (the 21 WARN are the pre-existing downgraded/advisory rows).
- `gh pr checks 623`: checks, node, node (e2e), node (integration), node (unit) all pass; mergeStateStatus CLEAN.
- End to end: `rule6_mutation_runner.py` on a two-mutant spec with legacy project `@syzygy/support`: A killed (exit 1), B with `timeoutSec` 1 errored (timedOut true, exitCode null), runner exited 1 after writing OUT.json, tree restored. A spec project `bogus` was refused with the tier-list message before any file was touched.
- Process-group kill checked directly: a child that spawns a sleeping grandchild is killed at the limit (2.0 s for a 2 s limit) and the grandchild is dead.

## Rule-6 mutations of the guard (unit-tier-guard.test.ts, `--project unit`)
- Drop `inspectorPromises` from the patch loop: SURVIVES (24 passed). This is the author's equivalent mutant. Probe under vitest: with only `inspector` patched, `inspectorPromises.open === inspector.open` is true, so the promises export already carries the patched function. In plain node the same mutation is not equivalent (`node:inspector` and `node:inspector/promises` are different objects holding the same `open` function; patching one leaves the other opening a debugger socket, shown with a plain `node` script). The author's body states exactly this. Not a fault.
- Drop `inspector` from the loop (keep promises only): killed (1 failed).
- Replace the refusing `open` with `() => undefined`: killed (2 failed).
- Delete the `dns.promises.Resolver.prototype` refusal: killed (1 failed).

## Rule-6 mutations of the runner predicates (each run through `--selftest`)
Killed: skip count ignored (`total <= 0`); todo not counted as skipped; exit code ignored for killed; exit code ignored for survived; `total is None` guard removed (TypeError); `selected == 0` removed; exit-code check removed in rerun_selected; `result is None` guard removed; timeout_rerun failed-needs-exit-1 removed; passed-needs-exit-0 removed; `total == 0` removed; rule6_projects span check, non-tier refusal, `.system.test.ts` suffix, unreadable-lists refusal each removed.
Survived (selftest does not distinguish):
- runner `timed_out or` removed in `classify`; rerun_selected `result.get('timedOut')` removed; timeout_rerun `if timed_out or` removed; timeout_rerun `returncode not in (0, 1)` removed. Each is redundant by construction: a timed-out run has returncode None and (in rerun_selected) selected 0, so a later clause already yields errored. Equivalent, harmless.
- rerun_selected `or result['fileErrors']: return 'errored'` removed: a file that fails to load while another selected test fails would score killed instead of errored. Not pinned by the fixtures (E1).
- rule6_projects `os.killpg(...)` replaced by `p.kill()`: the selftest's hung child has no children, so the process-group property the docstring and bead claim is unpinned. The behavior is correct today (checked above) (E2).

## Findings (notes, none blocks merge)
- E1: the rerun_selected `fileErrors` predicate has no fixture that separates it from the `failed` case (a fixture with `failed` non-empty and `fileErrors` non-empty, expecting errored).
- E2: no selftest for the group kill; add a child that spawns a grandchild and assert it is gone.
- E3: `rule6_timeout_rerun.outcome` scores a run where every test was skipped as `passed` (total counts skipped results, failed empty, exit 0). The runner and the bead's all-skipped item were fixed only in `rule6_mutation_runner.py`. Low; the tool is evidence-only.
- E4: the `rule6_projects.py` docstring says a record is refused when "a file is unknown"; `tier_of` returns `unit` for any path not in a list, so an unknown or misspelled file maps to unit and is caught later only because vitest then runs no test (errored). Doc overstates; behavior fails safe.

## GP-Q0 note
Behavior changes beyond the guard: the three tools now score a missing report, a file that fails to load, a nonzero exit with no failed test, and a timeout as `errored` where rerun_selected previously scored them `killed`; rerun_selected exits nonzero when any mutant errored; legacy `@syzygy/...` projects are mapped or refused. The bead (syzygy-l9vt: "no errored class (risk of false kills)", "old records ... match no vitest project") authorizes each. These tools are evidence tools, not gates of the daemon or a check_governance rule; no owner question raised. The guard now refuses `inspector.open` in the unit tier, which the bead and PR #621's review item (MEDIUM) asked for. Residuals (test restoring originals, raw bindings) are deferred to syzygy-e8lv and not faulted.

## Test growth
PR body states +3 ~0 -0. The three rows extend the existing ROUTES table in unit-tier-guard.test.ts, no cloned setup. Selftest fixtures are inputs with literal expected outcomes.

Verdict: CONFIRM WITH EXCEPTIONS
