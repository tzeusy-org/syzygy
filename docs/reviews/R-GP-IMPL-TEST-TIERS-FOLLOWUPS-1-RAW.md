# R-GP-IMPL-TEST-TIERS-FOLLOWUPS-1 — CC-REV-1 implementation review of syzygy-kc8j (PR #618: mutant runner errored class, unit guard gaps), round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 57d8e632b8cafe5f6b6678a052cb742f580dda5b
Subject: git diff 2e27bd41 57d8e632 sha256 13cddb06930abe0b6e6929909dabd710f2895522bf7a18e35edf06efb4a1a14d

Reviewer: independent, fresh-context reviewer, 2026-11-04. I did not write this change. I read `bd show syzygy-kc8j`, AGENTS.md rules 4, 6 and 9,
`docs/reviews/R-GP-IMPL-TEST-TIERS-1-RAW.md` (N1 to N3) and the PR #618 diff (5 files, +85 -16; merge base `2e27bd41`). `npm ci` ran first in the review
worktree (head `57d8e632`) and in a second worktree at origin/main `e3c488ed` for timing. Node `v24.6.0`, vitest `3.2.7`. Scratch under `/tmp/r618`.

## What I ran

- `python3 scripts/rule6_mutation_runner.py --selftest`: `selftest ok: 6 cases`, exit 0. Mutated `classify` (the `total is None or total == 0` line replaced by
  `pass`): selftest exits 1 naming four of the six fixtures. The fixtures bite.
- Unit tier, `npx vitest run --project unit`, head: 164 files, 3600 tests, Duration 30.77s (setup 4.14s). Same command at origin/main: 164 files, 3592
  tests, Duration 27.37s (setup 3.19s). One run each, same host. Origin/main has moved since the merge base, so the 8-test difference is not the PR's
  +10 (8 new rows/cases in unit-tier-guard.test.ts and +2 in unit-tier-guard-file.test.ts, the second file being an integration-tier file); I did not
  reproduce +10 against the merge base. No legitimate unit test failed under the stricter guard: all 3600 pass.
- Five guard mutants, each with the guard's own test run in its tier (`unit-tier-guard.test.ts` in unit, `unit-tier-guard-file.test.ts` in integration):

| Mutant (one occurrence in vitest.unit-guard.setup.ts) | unit-tier-guard.test.ts | unit-tier-guard-file.test.ts | Outcome |
|---|---|---|---|
| M1 `'udp_wrap', ` removed from RAW | 1 failed | 7 passed | killed |
| M2 `isolate === false` to `isolate === 'never'` | 21 passed | 1 failed | killed |
| M3 take gate `if (!GUARD_TEST.test(file))` to `if (false)` | 21 passed | 1 failed | killed |
| M4 `worker_threads.Worker` patch line removed | 1 failed | 7 passed | killed |
| M5 `refuseAll(dns.promises.Resolver.prototype, ...)` line removed | 21 passed | 7 passed | SURVIVED |

  The file was restored from git after each; `git status` shows only the untracked `.beads.gate.lock`.
- Bypass probes, run under the same setup file in a scratch project (default forks pool, one test per route). Refused and recorded: `fetch`,
  `http.get`, `http2.connect`, `tls.connect`, `net.createConnection`, unix-socket `net.Server.listen`, `cluster.fork`, `WebSocket` (to a reachable local
  listener: refused as `net.Socket.connect`), `dgram connect`, `dns.promises.lookup`, `dns.lookupService`, `process.getBuiltinModule('worker_threads').Worker`,
  `new worker_threads.Worker(..., {eval:true})`, a direct `new ChildProcess().spawn`, `execFile` without a callback, `Reflect.apply(spawnSync)`,
  `require('child_process')`, `process.binding('process_wrap')`.
- Isolation probes, two swallowing files per run: `--no-isolate` fails the run with the new message; `--poolOptions.forks.isolate=false` fails both files
  (the hooks still ran); `--pool=threads --poolOptions.threads.isolate=false`, `--pool=vmThreads` and `--pool=vmForks` end `no tests` (the run errors,
  nothing passes).

## Findings

### Medium

M-1. `node:inspector` opens a listening TCP socket the guard does not refuse. In a unit-tier file, `require('node:inspector').open(0, '127.0.0.1')` returned
`ws://127.0.0.1:<port>/<uuid>` with no refusal and no record, and the port appeared as a kernel LISTEN socket in `/proc/net/tcp` (state `0A`). It reaches the
socket through the inspector binding, not `net.Server.listen`, so none of the patched functions or the seven listed raw bindings sees it. This is the
N1 class ("misses ... servers") the PR set out to close; the PR body's "Left open" names "other raw bindings" generally, not this one. Either patch
`inspector.open`/`Session.connect*` or add it to the stated residue.

### Low

L-1. M5 survives: the `dns.promises.Resolver.prototype` patch is untested. The guard test pins `dns.resolve4`, `dns.lookup`, `new Resolver().resolveTxt` and
`dns.promises.resolve4` but no row calls `new dns.promises.Resolver().resolve*`, and the four `refuseAll` calls each need their own row (rule 6, per
predicate). The patch is present; this is a missing pin, not an open route. The PR's "5 mutants, all killed" does not include this predicate.

L-2. Runner: a run whose tests were all skipped scores `survived`. `parse_counts('      Tests  3 skipped (3)')` gives `(0, 3)` and `classify` returns
`survived`, though no test ran. The PR's own sentence is "survived: tests ran and all passed"; the denominator is the total, which counts skipped
tests. A `-t` selector that matches nothing in a file that has other tests prints a total but runs none of the selected ones. Not a false kill (the safe
direction), but the label overstates. Count `passed + failed` instead of the parenthesised total.

L-3. Runner: the exit code and unhandled errors are not read. `killed` needs a `Tests N failed` line anywhere in stdout+stderr, so a test's own console
output reading `Tests 9 failed` could be taken for the summary; no fixture covers a passing summary beside such a line. A run that passes every test but
exits 1 on an unhandled error is `survived`. `subprocess.run` has no timeout, so a hung mutant (an infinite loop is a normal mutant) hangs the runner
rather than recording `errored`.

### Assessment of the review focus

- Can a run that never executed the mutated path score `killed`? Not for collection errors, no-project or crash before the summary: all print no
  `Tests N (M)` line, `total is None`, `errored`, and the runner exits 1 after writing OUT.json. [Observed: classify fixtures; mutated classify fails
  four fixtures.] It can still score `killed` when a selected test fails for a reason unrelated to the mutant (a timeout, a flake, a failure in another
  selected file while the mutated file's own test file failed to load and ran zero tests). `rule6_timeout_rerun.py` exists for the timeout case; the runner
  itself does not distinguish. Same limit as before the PR; not a regression.
- Is `errored` vs `killed` sound? Yes for the stated predicate (a test ran and failed), with L-2 and L-3 as the edges.
- Does the stricter guard break a legitimate unit test or slow the tier? No test broke (3600 pass). Wall time 30.77s against 27.37s for one run each (setup
  +0.95s summed over workers); one sample per side, so [Inferred] a small cost, not a measured one. N5 (hosted 36.98s vs 30s) is not addressed by this PR, as
  its body says.
- Bypasses left: M-1 (inspector). Acknowledged by the PR: a test that restores the patched originals. Not probed and not claimed: native addons (the
  `process.dlopen` patch has a row only through `_linkedBinding` and the binding rows; I did not call `dlopen`).
- Open items the PR names and I confirm are still open: `rerun_rule6_mutants_selected_tests.py:28-34` and `rule6_timeout_rerun.py:22` read the record's project
  and have no `errored` class.

## Verdict

CONFIRM WITH EXCEPTIONS. N3 is fixed and the runner's errored class is sound for collection, project and crash failures. N1 and N2 are closed for every
route I probed but one (M-1), and one patch is unpinned (L-1). Neither is a regression; both are for a follow-up, with L-2 and L-3 as notes.
