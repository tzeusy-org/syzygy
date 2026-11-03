# R-GP-IMPL-LAUNCHED-MARKER-LIBRARY-1 — CC-REV-1 implementation review of syzygy-bpyt.8.11, round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 5a1240805ce7e4a2a4aca89a1ce8559d13e70a4c
Subject: PR #652

Reviewer: w-rev-652 (review bead `syzygy-7xiv`), fresh context, independent of the lane. PR #652, branch
`agent/syzygy-bpyt.8.11`, head `5a1240805ce7e4a2a4aca89a1ce8559d13e70a4c` (commits `e8b8b0bb`, `5a124080` over
merge base `5ee1c1a1`). All runs were in scratch detached worktrees at the head and at the merge base under
`/tmp/r652` after `npm ci`, Node v24.6.0, every command in the foreground. No target-repository content was
fetched or read.

## Scope

- Classes 1 and 4 under GP-Q0 part 1 of `OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`: an execution
  gate (`allow-execution`) whose refusal moves from the CLI wrapper into the library.
- Bead: `syzygy-bpyt.8.11`, from note N1 of `docs/reviews/R-GP-IMPL-LAUNCHED-MARKER-1-RAW.md:254`.
- Files changed (5): `packages/polaris-dossier/src/cli.ts` (-8), `packages/polaris-dossier/src/execution-choice.ts`
  (+15 -6), `packages/polaris-dossier/src/execution-choice.test.ts` (+43 -9),
  `docs/evidence/syzygy-bpyt-8-11/mutants-2026-11-04.json`, `docs/evidence/syzygy-bpyt-8-11/run_mutants.py`.
- Subject digests at the head (sha256, scripted): `execution-choice.ts`
  `ac8a75f981bfc5764d2da45b80572a6fc6967b19e19712b2c99e310e986295ba`, `cli.ts`
  `fb1ecd119ab4f6a65a55412155582d508bf6de1736540c3124b6d3ca209d87e9`.
- Not answered here: whether the owner approves the added `disclosures` field. That is the pending GP-Q0 part 3
  question recorded on the bead (comment of 2026-11-03 21:25).

## 1. What the change does [Observed]

- `cli.ts` loses its `launchedMarkerState(run!)` read and both `launched` refusals, and the `./launched.js` import.
  The two usage errors (missing `--revision`, missing `--declare`, exit 2) stay before the library call.
- `allowExecution` (`execution-choice.ts:87`) now reads `launchedMarkerState(run)` first (lines 93-99), before the
  run-name refusal at line 101, and refuses `launched` and `unreadable` with stage `launched` and the CLI's two
  reason strings, byte for byte (compared in the diff).
- Refusals go through the local `refuse`, so both now carry `disclosures: DISCLOSURES`.
- `AllowExecutionStage` gains `'launched'`. No other module names `AllowExecutionStage`,
  `AllowExecutionRefusal` or `AllowExecutionResult` (`git grep` over `packages apps scripts`: only
  `execution-choice.ts`), so no exhaustive switch elsewhere is affected.
- The docstring is updated to list the launched refusal.

## 2. Callers and reach [Observed]

- `git grep -F allowExecution` over the tree, excluding `docs/`: one non-test caller, `cli.ts:303`. The other
  hits are the definition, the docstring at line 151, a helper named `allowExecutionFaults` in
  `agent-texts.test.ts` (a text checker, not a call), and the dated owner direction
  `OWNER-DIRECTION-GREENFIELD-PARITY-LAUNCHED-MARKER-SCOPE-2026-10-21.md:78`.
- Second method: `git grep -l -F ./execution-choice.js -- packages apps` returns exactly `cli.ts` and
  `execution-choice.test.ts`. No out-of-package importer: every other `execution-choice` hit outside
  `packages/polaris-dossier/src` is a retained evidence file or a static-trace JSON.
- Non-export claim holds. `package.json` `exports` has 13 subpaths (`.`, `./argv`, `./check`, `./cli`,
  `./clone-shape`, `./full-run.testkit`, `./gate-sources`, `./git-object-reader`, `./init`, `./inventory`,
  `./review`, `./screen`, `./state-directory`), none `./execution-choice`. `index.ts` names neither the module nor
  the function, at the head and at the merge base. Neither `index.ts` nor `cli.ts` has an `export *`. `cli.ts`
  imports `allowExecution` and does not re-export it. The barrel narrowing `57ece1b9` is an ancestor of
  `origin/main`.
- So the reach of the library change is the CLI, the `apps/syzygy` `syzygy dossier` path through
  `runDossierCli`, and the test file.

## 3. CLI old-versus-new differential [Observed]

Harness: `docs/evidence/syzygy-7xiv/cli-differential.test.ts.txt`, run as a vitest unit file dropped into
`packages/polaris-dossier/src/` of each worktree, then removed. Each case builds a fresh run directory, plants a
marker, calls `runDossierCli`, and records exit code, stdout, stderr and whether `execution-choice.json` was
written or changed. Comparison: `cmp2.py` over `cli-differential-base.json` and `cli-differential-head.json`.
Temp paths and random record ids are normalized.

- Population: 208 cases. 12 marker plants × 17 argument variants = 204, plus 4 symlinked-`..` path cases.
  - Plants: none; a valid marker from `writeLaunchedMarker`; a literal `{"format":"polaris-dossier-launched/1"}`;
    empty; invalid JSON; another format; a directory; a symlink to a valid marker; a dangling symlink; a FIFO
    (pre-made with `mkfifo` and renamed in, because the unit tier refuses child processes); an oversized file
    (over 4096 bytes); a leading U+FEFF.
  - Variants: all good (JSON), all good (text), misnamed run directory, wrong revision, missing declarations,
    unknown declaration, D9 absent, operator not owner, missing `--revision`, missing `--declare`, no run, two
    runs, unknown option, `run.json` removed (reverify fails), choice already recorded, trailing slash, dot
    segments.
  - Symlinked `..`: `<base>/link/../run-…` with `link` pointing into a sibling directory, the marker planted at
    the lexical target, the physical target, both, or neither.
- Result: 74 identical, 134 differ, 0 other. Every one of the 134 is a stage-`launched` refusal, and the only
  difference is the added disclosures:
  - in JSON mode, a `disclosures` array of the four `DISCLOSURES` strings;
  - in text mode (no `--json`), four added stderr lines `disclosures.0:` to `disclosures.3:`.
- Stage, reason, exit code and write state are equal in all 208 cases. The (plant, base stage, head stage, base
  exit, head exit) table:
  - each of the 11 present-marker plants: `launched`/`launched` exit 1/1 in 12 cases, and usage exit 2/2 in 5;
  - no marker: `run`, `reverify`, `revision`, `d9`, `owner`, `recorded-already` once each, `declarations`
    twice, exit 0 in 4 cases (all-good JSON, text, trailing slash, dot segments) and usage exit 2 in 5;
  - symlinked `..`: launched at lexical or both, refused `launched` on both sides; physical-only or neither,
    exit 0 on both sides. `path.join` normalizes `..` lexically in the old CLI read too, so the old and new reads
    name the same file. I had expected `path.resolve` to move the read; it does not.
- No refusal weakened, no new acceptance. No input class accepted at base is refused at head through the CLI, or
  the reverse.

## 4. Ordering [Observed]

- The old CLI order was: argv parsing and positional count (usage, exit 2), missing `--revision`, missing
  `--declare` (exit 2), then the marker, then `allowExecution` (run name first). The new order is the same: the
  usage checks stay in `cli.ts:300-302` and the marker is the first statement after `refuse` is defined.
- When both apply, the launched refusal still wins over every library refusal: in the differential each present
  marker refused `launched` against `run`, `reverify`, `revision`, `declarations`, `d9`, `owner` and
  `recorded-already`, on both sides. Usage errors still win over the marker (exit 2 in all 55 marker-plus-usage
  cases, both sides).
- Library-only (no CLI): a direct call on a misnamed directory with a marker now refuses `launched` where the base
  refused `run`. That is the intended stage change for direct callers, of which only tests exist (§2).

## 5. Library change [Observed]

- The head test file run against the base sources: 11 failed, 26 passed (37). The 6 failing library tests are
  the new refusals (one launched, four unreadable, one ordering). The 5 failing CLI tests are the launched and
  unreadable refusals, which fail only on `disclosures`. This matches the PR body's figure.
- The library on base sources records a choice for a launched run (the N1 exposure); at the head it refuses with
  nothing written (`nothingWritten` asserted in each new test).

## 6. Rule 6

### The author's mutants [Observed]

- `docs/evidence/syzygy-bpyt-8-11/mutants-2026-11-04.json` names commit `e8b8b0bb48966c5aed4608c5166b9417de18c02e`.
  It is an ancestor of the head, and `git branch -r --contains` lists only `origin/agent/syzygy-bpyt.8.11` (see E1).
- M1 and M2 store literal fragments. M3 does not (see E2).

### My own mutants [Observed]

Script: `docs/evidence/syzygy-7xiv/mut.py`. Results: `mutants.json`, with each `old`/`new` fragment, at commit
`5a1240805ce7e4a2a4aca89a1ce8559d13e70a4c`. Each mutant was applied to `execution-choice.ts`, then
`npx vitest run --project unit packages/polaris-dossier/src/execution-choice.test.ts` was run, then the file was
restored (byte equality asserted). All 7 were killed:

| Mutant | Predicate attacked | Failed of 37 |
|---|---|---|
| R1 marker check moved to just before the write | ordering | 1 |
| R2 launched arm gives the unreadable reason | launched reason | 2 |
| R3 launched refusal built without `disclosures` (the old CLI shape) | the output change itself | 2 |
| R4 marker read from `path.dirname(run)` | which directory is read | 11 |
| R5 unreadable arm refuses at stage `run` | unreadable stage | 8 |
| R6 arms merged (`marker !== 'absent'` → launched reason) | unreadable reason | 8 |
| R7 check moved after the run name, before reverify | ordering | 1 |

R1 and R7 are each killed only by `checks the marker before every other refusal…` (`execution-choice.test.ts:220`),
through its misnamed-directory case (N1).

## 7. Gates at the head [Observed]

- `npm run typecheck`: exit 0.
- `npm test`: 167 files, 3648 passed.
- `npx vitest run --project integration packages/polaris-dossier`: 17 files, 1045 passed.
- `npx vitest run --project e2e packages/polaris-dossier`: 1 file, 6 passed, 1 skipped.
- `python3 scripts/check_governance.py`: `32 OK, 21 WARN, 0 FAIL (53 checks)`.
- `gh pr checks 652`, read at 2026-11-03T21:31Z: `node`, `node (unit)`, `node (integration)` and `node (e2e)`
  pass. `checks` (governance-docs, run 41721545192, head `5a124080`) was `in_progress` since 21:24:43Z.

## Findings

### Revise

None.

### Exceptions

- **E1 — the author's mutant record names a commit reachable only from the PR branch.**
  - [Observed] `e8b8b0bb` is contained only in `origin/agent/syzygy-bpyt.8.11`. A squash merge leaves it on no
    `main` ref, and once the branch is deleted it is on no ref at all.
  - The mutated subject is the same at the head: `5a124080` changes only the two evidence files. So the record can
    be re-checked against the head's `execution-choice.ts` (sha256 above).
  - Proposed: add the head's subject digest to the record, or keep the branch until closure, as the coordinator
    already does.
- **E2 — M3's stored fragments are not the bytes that were mutated.**
  - [Observed] `run_mutants.py` stores `old = block + 'const runId ... RUN_ID refusal'` and
    `new = 'RUN_ID refusal\n' + block`. Both are descriptions with an elided anchor, so the record alone cannot
    replay M3. Only re-running the script can.
  - AGENTS.md asks that a rule-6 record store each mutant's `old`/`new` fragment. M1 and M2 do.
  - Proposed: store the literal anchor line (`if (!RUN_ID.test(runId)) return refuse('run', …);`) in both fragments.
- **E3 — the owner's before/after shows only the JSON form.**
  - [Observed] Without `--json` the same refusal prints on stderr, and at the head it gains four lines,
    `disclosures.0:` to `disclosures.3:` (§3, the text variants of all 11 marker plants).
  - The PR body and the bead's owner question show only the JSON object. GP-Q0 part 3 asks for the exact
    before/after.
  - Proposed: add the text form beside the JSON in the owner question, before the answer is recorded.

### Notes (non-blocking)

- **N1 — ordering is pinned by one test, through one refusal.** The misnamed-directory case kills every move of
  the check past the run-name refusal (R1, R7, M3). Nothing pins the order against `reverify`, `briefed` or
  `recorded-already` separately. That is enough while the check stays first, and the CLI differential (§4) shows
  the full order is unchanged.
- **N2 — check-then-act is unchanged in kind.** The marker is still read once, before the awaited reverify and D9
  and the `wx` write. Brief issuance stays the load-bearing backstop, as the PR body says
  (`R-GP-IMPL-LAUNCHED-MARKER-1-RAW.md`, N2).
- **N3 — a dated owner direction now describes the base.**
  `OWNER-DIRECTION-GREENFIELD-PARITY-LAUNCHED-MARKER-SCOPE-2026-10-21.md:78` says `allowExecution` has no marker
  check of its own. That was true when written. It is a dated record, so it is not edited. `PROJECT-STATUS.md` or
  the bead closure can say where the check lives now.
- **N4 — the hosted `checks` job was still running when this review was written.** The local
  `check_governance.py` run at the head has 0 FAIL. Read `gh pr checks 652` again before merging.
- **N5 — test delta.** The PR body's `Tests: +6 ~5 -0` matches the diff: six library tests are new (one launched,
  four unreadable from `it.each`, one ordering), and five CLI expectations gain `disclosures`. Expected values are
  literals (`LAUNCHED_REASON`, `UNREADABLE_REASON`, `REFUSAL_DISCLOSURES`), not imported from the module under test.
  The fixture list is shared between the two describes and is not duplicated.

## GP-Q0 judgment

- [Observed] Through the CLI, the only change in what `allow-execution` accepts, refuses or prints is the added
  disclosures on the two stage-`launched` refusals, in both output forms. This is the pending part 3 question, and
  merging waits for the owner's recorded answer.
- [Observed] No refusal is weakened and no new acceptance exists, at the CLI or in the library.
- [Observed] The library-level change refuses only more, and only for direct callers. Only tests are direct
  callers. This is the outcome the owner chose for the bead on 2026-10-21.
- [Inferred] Apart from the `disclosures` question, this change needs nothing more from the owner.
