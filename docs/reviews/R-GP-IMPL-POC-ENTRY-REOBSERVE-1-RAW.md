# R-GP-IMPL-POC-ENTRY-REOBSERVE-1 — CC-REV-1 implementation review of syzygy-bpyt.5.9, round 1
Verdict: CONFIRM
Reviewed commit: 68ce03ebd4c181f67d5ac21c117e1793734360ef
Subject: git diff 0670bdb5 68ce03eb sha256 e21e60c85cbfff4c68c01e7364caa582491a076a4094dc7094c988764095cbea

Reviewer: w-rev-mvz6 (review bead syzygy-mvz6; fresh context, did not author the change). Date: 2026-11-03.

Scope. PR #579, "test: CI coverage for the POC entry wiring and POST /polaris/reobserve handlers [syzygy-bpyt.5.9]", head `68ce03ebd4c181f67d5ac21c117e1793734360ef` (two commits on merge base `0670bdb5`; `origin/main` was `0fc1f60b` at review time, so the head is behind main by several merges and was reviewed as-is, no rebase). The diff touches three files, all additions: `apps/three-surface-poc/src/main-entry.test.ts` (new), four tests appended to `apps/three-surface-poc/src/main.test.ts`, and the rule-6 record `docs/evidence/syzygy-bpyt-5-9/main-entry-and-reobserve-mutations-2026-11-03.json`. No product file changes. Risk tier: low (test-only).

Acceptance criteria of the bead, as read from `bd show syzygy-bpyt.5.9`:
1. A CI test imports or spawns the real `main.ts` and asserts exit code and output on one success and one refusal path.
2. A CI test reaches each POST /polaris/reobserve handler and asserts its response literally.
3. Rule 6: removing each handler's effect fails a test (recorded).
4. Tests: +a ~b -c; suite green.

## Findings

No revise finding. Two observations, neither blocking.

O1 (low, `apps/three-surface-poc/src/main-entry.test.ts`, the "refuses a scratch directory" test). The stderr expectation is `/^syzygy POC: configured repository authority rejected \((locator-mismatched|binding-unreadable)\)\n$/`, so it pins "the P1 gate refused, exit 1, nothing on stdout" and not which of the two reasons fires. The scratch directory is not a git repository, so on this machine the reason is `binding-unreadable` (`git-observation.ts:55`); `locator-mismatched` (`git-observation.ts:45`) is what a real repository at the wrong remote would give. The alternation is defensible (the test is about the entry's exit code and stream routing, and the reason is pinned in the git-observation tests), but the file's own comment says "expected values are literals", and this one is a two-way literal. Not worth a round.

O2 (low, same file, the `--help` test). It asserts the first two usage lines as one exact string, `'syzygy three-surface POC (local, non-release)\n\nUsage: npm run poc -- --repo <absolute-path-to-butlers> [options]\n'`. Usage wording is operator-facing but not a clause; a copy edit to the banner fails this test. Same class as the exact strings other `main.test.ts` tests already pin; noted against the test-growth gate, not asked to change.

## Do the tests reach the real code paths named in the bead

- Entry wiring. [Observed] `main-entry.test.ts` imports the real `main.ts` (`await import('./main.js')` after `vi.resetModules()`), so `process.exitCode = await main(process.argv.slice(2), {...})` runs for real. With `poc-main.js` replaced by a recorder it pins the argv slice, the returned exit code, and all five fields (stdout, stderr and stdin by identity; `cwd()` against a mocked `process.cwd`; `now()` against a faked `Date` at two instants; `onSignal` against a spied `process.on` for both SIGINT and SIGTERM). With the real `poc-main.js` it runs `--help` (exit 0, usage on stdout, stderr empty) and `--repo <scratch>` (exit 1, stderr names the gate, stdout empty).
- Reobserve handlers. [Observed] The four new `main.test.ts` tests start `main(...)` through the existing `harness`/`fakeIo` with the fixture model, look the route up in the table `main` registered (`routeOf(h, 'POST', ...)`), and call `route.handle` with a POST request. Both registered paths are driven (`/polaris/reobserve` and `/butlers-syzygy/polaris/reobserve`). Response status, content type, the `data-reobserve-evaluation` and `data-reobserve-supersedes` attributes, the heading, the three limb lines and the back-link are asserted, and the served model is re-read through `GET /api/poc` before and after. The 403 test asserts the full `{status, contentType, body}` object for both paths and that `h.calls` did not grow; the 502 test asserts the reason attribute, the paragraph text, and that the served snapshot is unchanged and `model` was built once.
- Acceptance 1, 2 and 4 are met. Acceptance 3 is met by the record, checked below.

## Expectations and fixtures

- [Observed] Expected values are literals. The only computed values are regexes over a 64-hex digest segment (`[0-9a-f]{64}`) and the `-build-2` suffix, whose producer (`distinctBuilds`) lives in the test, not in the module under test. No expectation imports a value from `main.ts`, `poc-main.ts`, `reobserve-action.ts` or `reobserve-state.ts`.
- [Observed] No short-label substring trap. `toContain` is used only on long, distinctive strings (the `<h1>Re-observed</h1>` heading, the `Butlers HEAD: 1f892687... (unchanged)` item, the full `<p data-reobserve-reason=...>` paragraph, the mount-prefixed back-link). The shortest, `<a href="/polaris">Back to Polaris</a>`, is paired with the status and attribute checks and is the human-path discriminator against the tailnet test's `/butlers-syzygy/polaris` link.
- [Observed] Fixtures. `main-entry.test.ts` makes its scratch directory in `beforeAll` with `mkdtempSync(join(tmpdir(), ...))` (so it follows `TMPDIR`), removes it in `afterAll`, and restores `process.argv`, `process.exitCode`, fake timers, mocks and the module registry in `afterEach`. The repository it names is that empty scratch directory; no Butlers checkout or real repository body is read. The `main.test.ts` tests use the existing fixture model and per-test `serve()`; the Butlers HEAD string is a fixture literal.
- [Observed] Test hygiene: stdout/stderr write spies are restored by `vi.restoreAllMocks()`; the `process.on` spy replaces rather than registers listeners, and the real-`poc-main` runs (`--help`, refusal) never reach serving, so no signal listener or server leaks.

## Rule 6: mutants re-run

[Observed] The record's six subject digests (`main-entry.test.ts`, `main.test.ts`, `main.ts`, `poc-main.ts`, `reobserve-action.ts`, `reobserve-state.ts`) were recomputed with `sha256sum` at the reviewed head and all six match. Its `ranAtCommit` (`462fe04e`) is the head's parent and reachable. Each mutant stores `old` and `new`, and the record states the one-occurrence assertion.

I re-ran nine mutants, seven taken from the record by id and two of my own, by a script that asserts exactly one occurrence of `old`, rewrites the file, runs `npx vitest run apps/three-surface-poc/src/main.test.ts apps/three-surface-poc/src/main-entry.test.ts`, and restores the file (`git status` clean afterwards). All nine failed at least one test:

| Mutant | Source | Killed by |
|---|---|---|
| E2-exit-code-dropped | record | the argv/exit-code test and both end-to-end tests |
| E4-now-constant | record | the five-fields test |
| E8-onSignal-noop | record | the five-fields test |
| R3-tailnet-handler-removed | record | the tailnet 200 test and the cross-origin test |
| R5-origin-check-removed | record | the cross-origin test only |
| R7-mount-prefix-ignored | record | the tailnet 200 test only |
| R8-served-model-not-swapped | record | the human 200 and tailnet 200 tests |
| X1-now-toString (`new Date().toString()`) | mine | the five-fields test |
| X2-sigterm-dropped (`onSignal` registers SIGINT only) | mine | the five-fields test |

The two of my own probe things the record's `E8` (a total no-op) does not: a clock that is not ISO 8601, and a signal hook that handles only one of the two signals. Both are killed. Baseline before mutation: 32 tests passed across the two files.

Coverage of the record is not total (nothing mutates the 502 path's body text or the in-flight guard), but the bead asks that removing each handler's effect fail a test, and R3 and R4 plus R1 and R2 do that for both handlers; the record claims 16 of 16 and the 9 I re-ran bear it out.

## Gates at the reviewed head

- `npm ci`: exit 0.
- `npm run typecheck`: exit 0.
- The two touched files: 2 files, 32 tests passed.
- Full `npm test`, with `TMPDIR` set short (`/tmp/claude-996/t`): exit 0, 256 files passed and 3 skipped, 6002 tests passed and 5 skipped. This matches the PR body's 6002.
- `gh pr checks 579`: `node` pass, `checks` pass. `mergeStateStatus` read `UNKNOWN` (GitHub had not recomputed it), `reviewDecision` empty.
- Test delta: the PR body states `+8 ~0 -0`; the diff adds four tests in `main-entry.test.ts` and four in `main.test.ts`, no existing test changed or removed. Matches.

Environmental failure, reported separately and not a flake of this PR. My first full run, with `TMPDIR` set to a long scratchpad path (about 120 characters), failed 8 tests in 11 files, all of them real-Chrome browser tests (`cdp-browser.browser.test.ts`, the Orrery, Polaris and Trajectory browser tests and the post-script DOM sweeps built on them) with `browser exited with signal before announcing a DevTools endpoint`, plus the PWB-REQ-014 authority sweep timing out at its 5 s limit under load. [Inferred] The cause is the path length of the Chrome profile and singleton socket under that `TMPDIR`, since the identical head passed everything with a short `TMPDIR`. This is not in `syzygy-exj7`'s description (the authority-sweep and `restart.test.ts` load flakes); I did not diagnose it further. None of the touched files was among the failures, and neither flake named in `syzygy-exj7` recurred in the green run.

## Verdict

CONFIRM over `68ce03ebd4c181f67d5ac21c117e1793734360ef`: test-only, the two untested paths are now reached in CI by real code, expectations are literals, fixtures are built in `beforeAll` or per test over a scratch directory, nine of nine re-run mutants are killed, the record's digests match the reviewed bytes, and the suite is green. O1 and O2 are optional and file no bead.
