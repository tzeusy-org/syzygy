# R-GP-IMPL-MAIN-TEST-WAIT-BOUNDS-1 — CC-REV-1 implementation review of syzygy-bpyt.5.10 (PR #581), round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: c197af537b513a6c9006a276b53caff97c69eb7b
Subject: `git diff 0fc1f60b c197af53` (PR #581 against its merge base) sha256 4faf901a441cff2cbfdc00e203fc4e36465f357987b048ea0abf8b11aa13cc0d

- Reviewer: an independent CC-REV-1 reviewer with fresh context. I did not author the change. Date 2026-11-03.
- CC-REV-1 class: none expected, and none found. The PR touches `apps/three-surface-poc/src/main.test.ts` and four files under `docs/evidence/syzygy-bpyt-5-10/`; no production, governed or normative byte changes.
- Subject of the review: source notes N3 and N4 of `docs/reviews/R-GP-IMPL-POC-MAIN-WIRING-1-RAW.md` section 4, as restated in the bead `syzygy-bpyt.5.10`.

## 1. Gates run (short TMPDIR `/tmp/r581`, fresh worktree on the PR head)

- [Observed] `npm ci` exit 0; `npm run typecheck` exit 0; `npm test` exit 0: 256 files passed, 3 skipped; 6014 tests passed, 5 skipped (matches the PR body).
- [Observed] `python3 scripts/check_governance.py` exit 0: 32 OK, 21 WARN, 0 FAIL (53 checks).
- [Observed] `gh pr checks 581` at review time: `checks` pass, `node` pass.
- [Observed] `main.test.ts` alone: 26 passed (24 before the PR, +2).

## 2. N3 — the wait-bound relation

What the change does [Observed from the diff]: `chargeWait()` adds `WAIT_MS` to a per-test map keyed by `expect.getState().currentTestName`; `started()` charges when `boundMs === WAIT_MS`; `waitedFor()` charges and calls `vi.waitFor` with `WAIT_MS`. A final test reads `task.file.tasks`, builds `name -> registered timeout`, and fails when a charged test's summed budget reaches its timeout, or when a passed test with `timeoutMs === 30_000` has no charge and its name does not start with `started(): `.

Mutants re-run by me, one at a time on the PR head, each reverted with `git checkout`:

| Mutant | Fragment | Result |
|---|---|---|
| Reviewer mutant | `const WAIT_MS = 10_000;` to `40_000` | killed: 25 passed, 1 failed (the guard) |
| Recorded: charge removed | `if (boundMs === WAIT_MS) chargeWait();` to `... undefined;` | killed: the guard |
| Recorded: waiter omits timeout | first serving test's `}, TEST_TIMEOUT_MS);` to `});` | killed: the guard |
| Mine X1: `waitedFor` bound raised, charge unchanged | `vi.waitFor(assertion, { timeout: WAIT_MS })` to `timeout: 4 * WAIT_MS` | SURVIVED: 26 passed |
| Mine X2: `started` deadline raised, charge unchanged | `Date.now() + boundMs` to `Date.now() + 4 * boundMs` | SURVIVED: 26 passed |
| Mine X3: one explicit bound | `started(run, fake, 25_000)` in the OS-temp-dir test | killed, but only because that test has a single wait and so charged nothing |

Findings:

- F1 (low, notes only): the guard goes vacuous when the guard test does not run last or alone. Vitest settings are default here (no `sequence.shuffle`), so the "last in file" comment holds in CI. But `npx vitest run apps/three-surface-poc/src/main.test.ts --sequence.shuffle --sequence.seed=N` with the `WAIT_MS = 40_000` mutant applied: seed 1 passed 26 of 26 (mutant survives), seed 2 failed 1 (killed), seed 3 passed 26 of 26 (survives). With the guard first, `waitBudgets` is empty and no test has `passed` set, so both branches of `boundViolations` return `[]`, and `tests.length > 20` is the only floor. A `-t 'serving'` run with the mutant also passes (5 passed, 21 skipped), as for any filtered run. Cheap repair: assert that every registered test other than the guard itself has a `result` before computing, so a shuffled or filtered run reports itself as unchecked instead of green.
- F2 (low, notes only): `started()` charges only when `boundMs === WAIT_MS`, a comparison against the constant. Any explicit bound other than the two used by the `started()` tests (X3) is an uncharged wait. In a test with another wait the "charged no wait" branch does not fire, so the relation silently excludes it. The by-name exemption `startsWith('started(): ')` likewise exempts any test later added under that `describe` from the uncharged branch. Repair: charge `boundMs` itself (the two `started()` tests then charge 60 000 ms and 50 ms against their own registered timeouts, which would need their timeouts declared against that charge) or take the bound from one `charge()` return value.
- F3 (low, undisclosed gap): the relation checks `WAIT_MS` against the timeouts, not the bound each wait actually applies. X1 and X2 change what `waitedFor` and `started` really wait while the charge stays `WAIT_MS`, and the suite stays green. I found no statement of this limit in the PR body, the evidence record, the commit messages or the bead; the coordinator's brief called it self-admitted, but I could not locate the admission. It is acceptable for the stated acceptance criterion (the reviewer's `WAIT_MS = 40_000` mutant), because both sites sit beside their charge; but it should be disclosed in the PR body. A one-line repair makes the pair non-independent: have `chargeWait()` return `WAIT_MS` and pass `timeout: chargeWait()` in `waitedFor`.
- F4 (info): a `TEST_TIMEOUT_MS` test that never waits fails the guard ("carries TEST_TIMEOUT_MS but charged no wait"). That is strict, not vacuous, and consistent with the PR's stated purpose.
- [Observed] No raw `vi.waitFor` or other `setTimeout`-based wait remains outside `waitedFor` and `started` in the file (grep: line 69 and line 216 only).

Expectations are literal: the pure case pins `boundViolations` on literal budgets, timeouts and message strings, and imports nothing from the module under test.

## 3. N4 — the verbatim-reader test

- [Observed] The test now serves the fixture baseline spec for the literal object id `ffcbf1c2ab91c30ee33ff2bcd1844fc5f6132b38` only, requests `/polaris` (the page that builds the reader), and asserts `blobReader.roots` equals `[BOUND]`, `blobReader.objectIds` equals that one literal id, and the response contains the two requirement sentences (literals) and not `PURPOSE-PROSE-NEVER-RENDERED`.
- [Observed] `afterEach` resets `serve`, so no later test inherits the reader.
- Recorded mutants re-run by me: none of the three N4 mutants was re-run individually; I re-ran the control (26 passed) and trust the record only as far as the control and N3 re-runs agree (they do). The recorded fragments are present once each in the files at the recorded head, per the script's own `count == 1` assertion.
- F5 (info): the assertions pin the first line of each requirement block, not the block byte-for-byte (the scenario lines are not asserted). That meets N4's wording ("the exact requirement line appears"); the whole block is available as `PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_REQUIREMENTS` if the owner wants more.
- The test name now says what it pins.

## 4. Interaction with PR #579 (head 68ce03eb, lands first)

- [Observed] `git merge --no-commit pr579` onto the PR head merges cleanly (no textual conflict in `main.test.ts`).
- [Observed] The combined file runs 30 of 30 passing.
- [Observed] With a temporary `console.log` of `waitBudgets` in the combined tree, all four new `the POST /polaris/reobserve handlers main registers` tests are charged 10 000 ms each (their `serve()` helper calls `started(run, fake)` inside the test body, so `currentTestName` is the running test) and they carry `TEST_TIMEOUT_MS`. So they are charged correctly with no further edit. The temporary edit was reverted.
- Residual: #579 tests added to the file after both land that wait through a new helper outside `started()`/`waitedFor()` would not be charged (F3's class).

## 5. Load evidence

- [Observed] `docs/evidence/syzygy-bpyt-5-10/load-runs-main-test.json` records 10 runs, 26 of 26 each, under 24 busy-loop processes (loadavg1 14.2 before, 41.9 after), at head `62d82c11`; the PR head `c197af53` adds only the evidence files over it (`git diff --stat 62d82c11 c197af53` touches nothing else). I did not repeat the ten loaded runs; my own full `npm test` ran on an otherwise lightly loaded host.
- Evidence scripts store old/new fragments and the commit, as the repo's mutation-record rule asks.

## 6. Verdict

CONFIRM WITH EXCEPTIONS. N3's acceptance mutant (`WAIT_MS = 40_000`) is killed in the default configuration, the omitted-timeout case is covered without a source scan, N4's test reads text and pins a literal object id, and PR #579 combines cleanly and is charged. The exceptions are F1 to F3, notes only; none blocks the merge.
