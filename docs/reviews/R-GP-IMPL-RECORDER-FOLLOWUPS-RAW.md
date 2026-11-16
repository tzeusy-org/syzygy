# Review: PR #693 (syzygy-nyir), recorder testkit follow-ups

Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 0ad2b9a7f4a2472720807031c3395dc8fe335f02
Subject: PR #693

The reviewer ran every command in the foreground, in a scratch detached worktree at the reviewed commit, after `npm ci` there. TMPDIR was /tmp/r693, deleted afterwards. The PR is stacked on #689 (`agent/syzygy-bpyt.4.8`, head `03b8ed77`). This review covers only the four commits after `03b8ed77`: `395830d1`, `e59c163d`, `1dc8510a` and `0ad2b9a7`.

## Scope of the diff

[Observed] `git diff --stat 03b8ed77 0ad2b9a7` lists 9 files. Three are code or tests under `packages/polaris-generation-consent/src/`:
- `recorder-fixtures.testkit.ts`, +23 -5
- `recorder-fixtures.testkit.test.ts`, +64 -4
- `package-reader.test.ts`, +22 -22: the 15 timeouts and the header comment.

The other six are evidence records under `docs/evidence/syzygy-nyir/`. `git diff --quiet 1dc8510a 0ad2b9a7 -- packages/` exits 0, so the sizing record's subject commit `1dc8510a` has the same package bytes as the head.

## Gates at the reviewed commit

[Observed]

| Gate | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | 167 files, 3658 passed |
| `npm run test:integration` | 89 files, 2554 passed; load1 was 16.29 when it ended |
| `python3 scripts/check_governance.py` | 32 OK, 21 WARN, 0 FAIL (53 checks) |
| Hosted CI on `0ad2b9a7` | `node`, `node (unit)`, `node (integration)` and `node (e2e)` pass; `checks` was pending when read |

These match the PR body's gate lines.

## N1: is the pathlib errno set right?

[Observed] For the Pythons in use, yes. Read from the interpreters on this host:
- Python 3.12.3 (`/usr/bin/python3.12`): `pathlib._IGNORED_ERRNOS` is `(2, 20, 9, 40)`, which is ENOENT, ENOTDIR, EBADF and ELOOP. `Path.is_file` calls `self.stat()`. It re-raises any `OSError` that `_ignore_error` rejects, returns False for one it accepts, and returns False on `ValueError`.
- Python 3.11.17 (uv-managed): the same tuple, `(2, 20, 9, 40)`.
- Python 3.14.4: `Path.is_file(follow_symlinks=True)` returns `os.path.isfile(self)`, which catches every `(OSError, ValueError)` and returns False.
- Python 3.13 is not installed here. [Unknown] whether it follows 3.12 or 3.14.

The kit's `PATHLIB_NO_FILE` is `{ENOENT, ENOTDIR, EBADF, ELOOP}`, so it matches 3.11 and 3.12. Its code comment describes the 3.14 difference correctly.

[Observed] This host's `python3` is **3.14.4**, not 3.12. The kit spawns `python3`, so a local run compares the kit against the 3.14 recorder. That includes the author's runs, whose evidence was recorded on this host.

[Inferred] CI's integration job is `runs-on: ubuntu-latest` with no `setup-python` step (`node-ci.yml:124`), so it uses the runner image's system `python3`. On ubuntu-24.04 that is 3.12. The governance workflow pins 3.11, but it runs no vitest.

[Observed] I ran the testkit test file under both Pythons: `npx vitest run --project integration packages/polaris-generation-consent/src/recorder-fixtures.testkit.test.ts`, once with `python3` resolving to 3.14.4 and once to 3.12.3 (a PATH shim). Both gave 5 of 5 passed. So the three roots in the differential agree with the recorder under both versions.

[Observed] I probed a root the PR does not test: an entry beneath a mode-000 directory, so that `stat` fails with EACCES.

| Interpreter or runtime | Result for the entry |
|---|---|
| python3.11 `is_file()` | raises `PermissionError` |
| python3.12 `is_file()` | raises `PermissionError` |
| python3.14 `is_file()` | returns `False` |
| node `statSync` | throws `EACCES`, which is not in the set, so the kit throws |

So the kit agrees with the 3.11 and 3.12 recorder on this root. It diverges from the 3.14 recorder, which this host runs. The divergence fails closed: the kit throws, and it never writes a wrong digest.

## N2: fillSlots

[Observed] `fillSlots` throws when a slot has no value. After the replace, it also throws when any NUL is left. `fill` delegates to it, and only through `forms()`, which throws if `loadRecorderForms()` has not run. The probe test covers all three outcomes: a clean fill, a NUL left by an altered slot, and a slot with no value.

## Rule-6 mutants run by this reviewer

Each mutant was applied alone to `recorder-fixtures.testkit.ts` at `0ad2b9a7`, followed by `npx vitest run --project integration packages/polaris-generation-consent/src/recorder-fixtures.testkit.test.ts` with `python3` at 3.14.4. The source was restored after each one, and the worktree was confirmed byte-identical at the end.

| id | old | new | outcome |
|---|---|---|---|
| R1-stat-errors-all-absent | `    if (!PATHLIB_NO_FILE.has((error as NodeJS.ErrnoException).code ?? '')) throw error;` | `    void error;` | **survived** (5 passed) |
| R2-add-EACCES | `new Set(['ENOENT', 'ENOTDIR', 'EBADF', 'ELOOP'])` | `new Set(['ENOENT', 'ENOTDIR', 'EBADF', 'ELOOP', 'EACCES'])` | **survived** (5 passed) |
| R3-read-any-stat | `const installed = stat?.isFile() === true ? readFileSync(entry) : null;` | `const installed = stat !== undefined ? readFileSync(entry) : null;` | killed (1 failed, 4 passed) |
| R4-drop-ELOOP | `new Set(['ENOENT', 'ENOTDIR', 'EBADF', 'ELOOP'])` | `new Set(['ENOENT', 'ENOTDIR', 'EBADF'])` | **survived** (5 passed) |
| R5-residual-on-template | `if (filled.includes('\0')) throw` | `if (template.includes('\0')) throw` | killed (file failed in setup, 5 skipped) |
| R6-residual-pair-only | `if (filled.includes('\0')) throw` | `if (filled.includes('\0\0')) throw` | killed (1 failed, 4 passed) |

The author's four mutants, recorded in `measurement.json` `mutants.rows` at `395830d1`, are consistent with these. Their own note says N1-invert-filter is killed at `beforeAll`, not by the edge case it targets.

## The fifteen timeouts

[Observed] The evidence is re-checkable (rule 11):
- `timeout-sizing.json` names its subject: commit `1dc8510a`, clean, with file sha256 `655afa3a…`. That digest equals `sha256sum` of `package-reader.test.ts` at the head.
- Each input record's sha256 in both `timeout-sizing.json` and `measurement.json` equals `sha256sum` of the committed file. That covers all four duration records, and `measurement.json` also gives the digest of `timeout-sizing.json`.

[Observed] I re-ran `size_vitest_test_timeouts.py --check` over the three `before-*` records and the `--after` record at the head. Output: "314 collected, 1 sized (0 from a lower bound), 1 problems", exit 1. The one problem is the agreement sweep: it carries 50000 ms and the rule gives 15000 ms. Against the committed record, every top-level key is equal except `subject`, `inputs` and `tests`. Each of those three differs only in the commit, or in record paths spelled relative to where I ran the command. For the fifteen tests named in `measurement.json` `fifteen.rows`, I recomputed the worst durations from my output: 52 ms over the before records and 42 ms in the after record. The next largest test outside the sweep is 129 ms.

[Inferred] Dropping the fifteen to the 5000 ms default is safe:
- [Observed] No test in `package-reader.test.ts` spawns. The file has no `execFile`, `spawn` or `child_process`.
- [Observed] `forms()` throws rather than rendering lazily, so no render cost can move into a test.
- The worst case is about 96x under the budget. The measurements did not go above load1 21.4, a limit the PR discloses. Even at load1 127 on 12 cores, a 52 ms in-memory test would need a slowdown of roughly 100x to reach 5 s.
- The flake history in `syzygy-exj7` concerns `polaris-authority-sweep.test.ts` and `restart.test.ts`, not this file. The load-127 timeouts recorded under `syzygy-bpyt-4-13` were render-bound, and `syzygy-bpyt.4.8` removed the renders from these tests.

## What `size --check` is, and whether "one problem" is a regression

[Observed] `scripts/size_vitest_test_timeouts.py` calls itself an "Evidence tool, not authority". Nothing gates on it:
- `grep -F -l size_vitest .github/workflows/*.yml PROJECT-STATUS.md package.json` returns no file.
- A second sweep, over every tracked file except `docs/evidence/` and `node_modules`, finds the name only in the script itself, the test file's header comment and `docs/reviews/*-RAW.md`.

So it is in neither CI nor the battery.

[Observed] It did not report 0 at the base. At `03b8ed77`, I ran it over that tree's `package-reader.test.ts` with the six inputs `docs/evidence/syzygy-bpyt-4-13/timeout-sizing.json` names. Those are three records, the load-127 report (commit `8b143272`, load1 127.56 to 83.31) and two after records. Output: "314 collected, 16 sized (10 from a lower bound), 15 problems", exit 1. All 15 problems are "collected but measured in no --record": tests added after `syzygy-bpyt.4.13` measured the file. The PR takes the file from 15 problems to 1. That one problem, the sweep, is deliberate and disclosed in the file header and in `measurement.json` `sizing.whyTheOneProblemStands`.

This is not a regression, and it tightens no gate, so it is not a GP-Q0 matter.

## Findings

- **F1 (exception): the "every other stat error throws" predicate has no pin.** R1 and R2 survive. The three roots exercise ENOENT (through the probe), ENOTDIR, a directory, and a read error (EACCES on read). No root makes `stat` fail with an errno outside the set, so the PR body's sentence "Every other stat error throws" is not pinned (rule 6). R4 also survives, which means ELOOP (and EBADF) are unexercised too.

  The root that would pin it, an entry beneath a mode-000 directory, has a recorder outcome that depends on the Python version: `PermissionError` under 3.11 and 3.12, absent under 3.14. This host runs 3.14. A fourth root therefore has to state its expected recorder outcome per interpreter. One way: have the Python side report `sys.version_info`, require the kit to throw EACCES in every case, and require the recorder to raise under < 3.14 and to write absent under >= 3.14, with the divergence named. A symlink-loop root would pin ELOOP the same way on every version.

  The code itself is correct for CI's Python. This is a test gap, not a defect.

- **F2 (exception): the PR body's "checked on python3.12" does not name the interpreter the evidence ran under.** This host's `python3` is 3.14.4, so the local differential and the author's recorded runs compared against the 3.14 recorder. The three roots agree under both versions, so no recorded outcome changes. The kit's comment names 3.12 as "ubuntu-24.04's python3". Neither it nor the PR says that a local run here takes the 3.14 branch.

## Notes

- **n1:** `measurement.json` `sizing.command` spells its inputs as bare names (`--record before-alone.json`, with TREE `.`). The committed record's `inputs[].path` values are `docs/evidence/syzygy-nyir/before-alone.json`. So the recorded command is not the literal one that produced the record, although the record re-derives (see above).
- **n2:** the `beforeAll` at `package-reader.test.ts:1033` keeps its 60 s budget and its "five Python renders" comment. Both are stale since `syzygy-bpyt.4.8`. The PR body discloses this.
- **n3:** under a 3.14 `python3`, the kit throws where the recorder writes absent for an entry beneath an unsearchable directory. That is fail-closed and disclosed in the code comment. It is listed here only so that a later reader of a local failure knows its cause.
