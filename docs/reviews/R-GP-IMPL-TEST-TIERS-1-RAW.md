# R-GP-IMPL-TEST-TIERS-1 — CC-REV-1 implementation review of syzygy-bpyt.4.3 (unit, integration, e2e and live test tiers), round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 47cfcc7f8df37c1dafca1dc5a1d6f60feb1b047c
Subject: git diff 08f2287d 47cfcc7f sha256 84d128f616c2b72c22399d28fed441441c0da41327e35bbb3562e4c69ad94168

Reviewer: independent, fresh-context reviewer, 2026-11-03. I did not write this change. I read `bd show syzygy-bpyt.4.3`, AGENTS.md,
the PR body and the diff. All work ran in scratch worktrees under `/tmp/r601` (head `47cfcc7f`, merge base `08f2287d`, and a
third copy at head for mutants), Node `v24.6.0`, vitest `3.2.7`, `npm ci` in each before any run, every `dist/` absent for the
unit and integration runs. No Butlers or other observed repository content was read. Nothing was pushed, commented or merged on
PR #601, and no `bd` mutation ran. PR #601 head at review time: `47cfcc7f8df37c1dafca1dc5a1d6f60feb1b047c`
(`gh pr view 601 --json headRefOid`); `git diff --shortstat 08f2287d 47cfcc7f`: 17 files changed, 1249 insertions, 168 deletions.

## Verdict summary

CONFIRM WITH EXCEPTIONS. No revise finding. Every test file is in exactly one tier and none is dropped; the aggregate `node`
job fails on a failed, skipped or cancelled tier; every tier project keeps the `source` condition and `vitest.setup.ts`; the
three recorded mutants I re-ran were killed. The unit guard has real bypasses (worker threads and a few others), none used by
any test today, and one latent loss of its swallowed-refusal check under a non-default vitest option. Six notes follow.

## 1. Partition: is every test file in exactly one tier, and is any dropped

All [Observed], by script.

- `vitest list --filesOnly` at the merge base (root config): 261 rows, no duplicate. At head: 264 rows, no duplicate. `diff` of the
  sorted sets: head adds exactly `test-tiers.test.ts`, `unit-tier-guard-file.test.ts` and `unit-tier-guard.test.ts` under
  `apps/three-surface-poc/src/`; nothing removed. The system config (`--config packages/cap1-system/vitest.config.ts`): 11 rows at
  both commits, identical.
- Head, per project (`vitest list --filesOnly | awk '{print $1}' | sort | uniq -c`): unit 162, integration 86, e2e 13, live 3 =
  264. With the 11 system files: 275. `npm run test:tiers` printed `unit 162, integration 86, e2e 24, live 3; total 275` and
  `ok: every test file is in exactly one tier`.
- Second method for the denominator, not the script's own walk: `git ls-files | grep -E '\.test\.ts$'` at head = 289. The union of
  the root and system listings = 275. The 14 left over are all under `docs/evidence/**/tools/` or `work/` (review probe files,
  not workspace `src/`); the base excluded the same 14 (its globs were the workspace `src/` globs). So the 275 is the workspace
  population, and the exclusion is unchanged.
- Per-test census (`vitest list --json`, base 6031 entries and head 6054): per file, the counts are equal except
  `sync-child-process-guard.test.ts` 9 to 10, plus the three new files (4, 5 and 13 tests). 6054 - 6031 = 23 = the PR's "+23". By
  name, the only changed names are inside `fixture-directories.test.ts` (one title) and `sync-child-process-guard.test.ts` (three
  titles); no test disappeared silently.
- CI cross-check from the hosted logs (run 41591675050 at the base, 41593646423 at the head): base `npm test` 6028 passed and 8
  skipped (6036); head unit 3559 + integration 2370 (2367 passed, 3 skipped) + e2e 127 (125 passed, 2 skipped) + 3 live tests that no
  workflow runs = 6059 = 6036 + 23. The 8 base skips are the same 8: 3 `session-view` (no `bwrap` on the runner), 1 in the opening
  index file, 1 in `no-egress`, 3 live. The live tier is never run by any workflow, as the PR and CONTRIBUTING.md say.
- `partitionProblems` itself: read in full; the rows it reports are the ones `test-tiers.test.ts` pins. The config refuses to load on
  any problem (`vitest.config.ts:7-8`).
- Merge base to current main: `git diff --name-status 08f2287d origin/main` shows no test file, no `vitest*` file and no
  `package.json` change, so nothing on main since collides with a list entry.

## 2. Project configuration: `source` condition and setup files

[Observed] Using the vitest Node API (`createVitest`, then each `project.config` and `project.vite.config`):

| project | setupFiles | globalSetup | ssr conditions begin | isolate | pool |
|---|---|---|---|---|---|
| unit | vitest.setup.ts, vitest.unit-guard.setup.ts | test-fixture-sweep | source, module, node, ... | true | forks |
| integration | vitest.setup.ts | test-fixture-sweep | source, ... | true | forks |
| e2e | vitest.setup.ts | test-fixture-sweep | source, ... | true | forks |
| live | vitest.setup.ts | test-fixture-sweep | source, ... | true | forks |

No project lost the `source` condition or the `setImmediate` yield, and the guard is on `unit` alone. The global setup moved from
one project to all four; it removes fixture directories of dead processes and is idempotent, so a repeat is harmless.

My own mutants on `vitest.config.ts` (not in the PR's record; run on the head copy, with `sync-child-process-guard`,
`fixture-directories`, `test-tiers` and `unit-tier-guard` as the tests):

- M1 `extends: true as const` to `extends: false as never`: killed, one failure, `sync-child-process-guard` ("no project entry
  detached from the root config").
- M2 `'source'` removed from the conditions: killed, one failure, `sync-child-process-guard` ("runs only short local tools...").
- M3 root `setupFiles` removed: killed, one failure, `sync-child-process-guard`.

Each has exactly one killer, and it is in the integration tier (note N5).

## 3. Can the unit guard be bypassed

[Observed] Probe files in the unit project (untracked, deleted afterwards), run with `vitest run --project unit`:

| route | refused? |
|---|---|
| `child_process.execSync` (namespace and named import), swallowed in a test | refused; the file still fails |
| `http.get` to loopback | refused (`net.Socket.connect`) |
| `fetch('http://127.0.0.1:45999/')` | refused; the file fails |
| `Worker` (eval) that calls `child_process.execSync('echo ...')` | **not refused**; it ran and returned the output |
| `Worker` (eval) that runs `http.createServer().listen(0)` | **not refused**; it listened |
| `process.binding('spawn_sync').spawn(...)` | **not refused**; it ran `echo` |
| `dns.resolve4` with `dns.setServers(['127.0.0.1:9'])` | **not refused** (ECONNREFUSED came back from c-ares) |
| `globalThis.syzygyUnitTierGuardTake()` after a swallowed refusal | drains the attempts (returned 1), so the file would pass |

`git grep -nE "worker_threads|new Worker\(|process\.binding|node:dns"` over `apps/*/src` and `packages/*/src` returns 0 lines, so no
test uses any of these today. `fetch` is covered (undici connects through `net.Socket.connect`). With `--pool=threads` the guard
still refuses and fails the file. Modules a test imports run after the setup file, so an import-time spawn is refused.

The first-class claim in the setup file's header ("Every route to a process or a socket goes through one of the functions patched
here") and in CONTRIBUTING.md is wider than what holds. See N1.

## 4. Latent loss of the swallowed-refusal check

[Observed] `vitest.unit-guard.setup.ts` installs once per process through a `Symbol.for` slot, but its `attempts` array and
`complain` hooks belong to each evaluation of the module. With `--no-isolate --pool=forks --poolOptions.forks.singleFork` and
two files, the first file (a swallowed `fetch` and a swallowed `execSync`) failed correctly. The second file, which only swallows
an `execSync`, **passed** (`✓ zz-probe-c.test.ts (1 test)`): its refusal was pushed onto the first evaluation's array, and its own
`complain` read an empty one. The default config (`isolate: true`) is not affected, and the comment's claim ("the module cache of
a worker that reuses its process keeps one copy") does not hold for this case. See N2.

## 5. Aggregate `node` job and the workflow

[Observed] by reading `.github/workflows/node-ci.yml` at head and the repository ruleset
(`gh api repos/tzeusy-org/syzygy/rulesets/26342156`): required status checks are `node` and `checks`, with the merge queue.

- `node` has no `name:` key, so its check name is `node`; the hosted run lists it (`node`, success) beside `node (unit)`,
  `node (integration)` and `node (e2e)`. No tier job is named `node`.
- `needs: [unit, integration, e2e]`, `if: ${{ always() }}`, and three `test "${X}" = success` lines. A failed, skipped or
  cancelled tier gives a result other than `success`, so the job fails; a failed `unit` makes the two others `skipped`, and the
  aggregate fails. A neutral or missing `needs` result cannot pass.
- `merge_group: types: [checks_requested]` is still present with `push` and `pull_request`.
- Steps moved without loss: Node segment rules, build, typecheck, the three builder checks and `npm test` are in the unit job;
  strace install, its prerequisite and the Chrome prerequisite are in the e2e job, with `SYZYGY_FRESH_CLONE: '1'` on the e2e
  step; the integration job has no strace or browser. The 3 `session-view` skips in the integration job are the same 3 the base
  logged. Integration passed with every `dist/` absent, and the job installs and does not build (below).
- `governance-docs.yml` is untouched.

## 6. Runs at the head

All [Observed]; `npm ci` first; host load average 12 to 15 during the runs.

- `npm test` (unit): 162 files, 3559 tests passed, Duration 25.48 s, no `dist/`.
- `npm run test:integration`: 86 files, 2370 tests passed, 0 skipped (`bwrap` present locally), Duration 39.25 s, no `dist/`.
- `npm run test:e2e`: 13 files, 125 passed and 2 skipped; then `test:system` (builds): 11 files, 10 passed and 1 skipped, 52 passed
  and 1 skipped (the guarded fresh-clone test, `SYZYGY_FRESH_CLONE` unset).
- `python3 scripts/run_status_battery.py --selftest`: PASS, 114 commands read from PROJECT-STATUS.md. The block has 116
  non-comment lines, 2 of which are assignments (`CS=`, `DR=`), 0 backslash continuations: 116 - 2 = 114 matches.
  `python3 scripts/run_status_battery.py`: `battery: 114 ok, 0 failed, 114 commands`.
- CI Duration of the unit step: 36.98 s on the hosted runner (`Tests 3559 passed`, no skip); the bead's target is 30 s (N6).

## 7. Rule 6: three recorded mutants re-run, at `47cfcc7f`

I applied each mutant's `old` to `new` from `docs/evidence/syzygy-bpyt-4-3/tiers-2026-11-03.json` with a script that asserts the
fragment occurs once, ran the record's command, and restored the file.

- G10 (`afterEach(complain);` removed; integration project, `unit-tier-guard-file.test.ts`): exit 1, KILLED. Two failures, "fails a
  file whose swallowed refusal was caught" and "...server refusal...".
- T4 (`if (paths.some(... !== sorted[index])) problems.push` made `if (false)`): exit 1, KILLED, in `test-tiers.test.ts` ("reports
  each way the lists and the tree disagree").
- C2 (the guard added to the integration tier): exit 1, KILLED, in `sync-child-process-guard.test.ts` (two tests).

The record's `subjectFileSha256` for the six listed files matches their bytes at head (scripted `sha256`). The record's 29 rows are
26 mutants plus S1, S2 and C7; C7 is marked redundant by design. The record has no mutant for `extends`, the `source` condition or
the root `setupFiles` of a tier; my M1 to M3 (section 2) were all killed.

## Findings

No finding rises to REVISE: the AC outcomes hold, and the bypasses are not reachable by any test in the tree.

- **N1 (Low, test hygiene)** The unit guard does not refuse a process or a server started inside a `worker_threads` Worker, via
  `process.binding('spawn_sync')`, or UDP DNS through c-ares (section 3). No test in the tree does this. The header comment and
  CONTRIBUTING.md claim every route is covered; either narrow the claim to "the `child_process`, `net` and `dgram` entry points of
  the worker's own thread", or add a pin that fails on a test file importing `worker_threads`. Also, `globalThis.syzygyUnitTierGuardTake`
  is public and drains the record (section 3, last row); it is meant for the guard's own test only.
- **N2 (Low, latent)** Under a reused worker process (`--no-isolate` with one fork) a swallowed refusal in a later file does not fail
  it (section 4). Keeping `attempts` and the hooks' state in the `Symbol.for` slot, not in module scope, would remove it. The repo
  does not set `isolate: false`.
- **N3 (Low, evidence tooling)** The rename of the vitest projects broke a script that names one: `scripts/run_line_slot_rule6_mutants.py:19`
  has `PROJECT = '@syzygy/polaris-generation-consent'`; `npx vitest run --project @syzygy/support` at head prints `Startup Error: No
  projects matched the filter` and exits 1 (run by me). That script records `errored`, never killed, so it is loud. But
  `scripts/rule6_mutation_runner.py` sets `killed = (failed or 0) > 0 or tot is None` and reads its project from the spec, so a
  spec written against an old project name makes every mutant "killed" (outcome field `errored`). Stored records of earlier rounds
  name the old projects; they re-run only at the commit they ran at. Say so in CONTRIBUTING.md or the runner's docstring.
- **N4 (Info, completeness of the proof)** The config-shape pins (`source` condition, `extends`, root setup file) live in
  `sync-child-process-guard.test.ts`, which is integration tier. `npm run check` (unit) does not run them; the unit job in CI
  builds first, so a lost `source` condition would be masked there by `dist/` and caught only by the integration job (no build,
  so the import fails) and by `check:all`. Acceptable; worth one line in CONTRIBUTING.md.
- **N5 (Info)** M1, M2 and M3 each have a single killer. A second pin (the config's own load, for example) would be cheap; not
  required.
- **N6 (Info, AC target)** The unit tier takes 25.5 s here and 36.98 s on the hosted runner (the PR gives 27 to 30 s). The bead's
  "under 30 s" is a target; the PR states the number. The single slowest file (`test-artifact-verification-live-source`, 31 s alone)
  is the floor, and it is why the `setImmediate` yield stays in every tier; that retention is justified in `vitest.setup.ts`.

## Not checked

- I could not run the `node` job's `always()` aggregate against a failing tier on the hosted runner; section 5 is by reading the
  workflow, the ruleset and the base-versus-head hosted logs.
- I did not review CC-DEP-1 (no linter was added, none required by this PR), nor CONTRIBUTING.md wording beyond its facts.
- `test:live` was not run (needs a consented repository).
