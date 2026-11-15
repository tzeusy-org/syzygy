# R-GP-IMPL-LAUNCHED-MARKER-LIBRARY-2 — rebased-diff re-review of PR #652
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 62666e4c94ba70f33ee5e78398368f35cae121b9
Base: ba0d8af6bb7db75638f28f4df20031be5355d455

Reviewer: fresh-context independent reviewer, not the author. PR #652, branch `agent/syzygy-bpyt.8.11`, head
`62666e4c` (commits `e61337e5`, `62666e4c`), merge base = `origin/main` = `ba0d8af6` (verified with
`git merge-base`). Detached scratch worktrees at the head and at the base, each after `npm ci`. All commands in the
foreground. No target-repository content was read. The PR branch, `bd` and `main` were not touched.

## Governing references

- `OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-15.md`, item `pr652-refusal-disclosures`, answer A (lines 122-135):
  the launched/unreadable allow-execution refusal may carry "the four disclosures the packet quoted, in that order",
  "in JSON, as a `disclosures` array; in text, as stderr lines `disclosures.0:` to `disclosures.3:`". Excluded:
  "any other CLI output change" and "landing without a rebase and a re-review of the rebased diff".
- `OWNER-DIRECTION-GREENFIELD-PARITY-LAUNCHED-MARKER-SCOPE-2026-10-21.md` (the reservation that answer resolves).
- `docs/reviews/R-GP-IMPL-LAUNCHED-MARKER-LIBRARY-1-RAW.md` (round 1, CONFIRM WITH EXCEPTIONS, E1-E3).

## 1. The rebase changes no behaviour beyond the approved disclosures [Observed]

- Diff `origin/main...HEAD`: 5 files, +151 -21, the same five files as round 1.
- `execution-choice.ts` at the head hashes `ac8a75f981bfc5764d2da45b80572a6fc6967b19e19712b2c99e310e986295ba`,
  byte-identical to round 1's reviewed head (`5a124080`) and to `e8b8b0bb` (scripted sha256). `main` did not touch
  this file between round 1's base `5ee1c1a1` and `ba0d8af6` (`git diff --stat` empty), so the library change
  carries over unchanged.
- `cli.ts` diff against `main` is exactly -8 lines:
  - the `import { launchedMarkerState } from './launched.js';` line;
  - the marker read and the two stage-`launched` refusals in the `allow-execution` command.
- Conflict resolution is correct. `cli.ts:11-13` keeps main's `initRun, type InitPorts`, `processLaunchPorts` and
  `withLaunchRecords` imports; all three are still used (`cli.ts:186`, `198`, `203-204`, `241`).
  `launchedMarkerState` has no remaining use in `cli.ts`; its other users (`brief.ts`, `inventory.ts`, `review.ts`,
  `session-handover.ts`) import it themselves.
- Usage checks still precede `allowExecution`: `cli.ts:328-329` (`--revision`, `--declare`, exit 2) come before the
  library call at `cli.ts:330`. Argv parsing (positional count, unknown option) precedes both.
- `allowExecution` has exactly one non-test caller, `cli.ts:330` (`grep -rn 'allowExecution('` over
  `packages apps scripts`, tests excluded).
- `DISCLOSURES` (`execution-choice.ts:84-85`) is `[CHOICE_ATTRIBUTION, NOT_AN_EXECUTION_CONSENT,
  RECORDS_WITHIN_REACH, <run-directory line>]`: the approved four, in the approved order. The launched arms reuse the
  local `refuse`, so they carry the same constant as every other allow-execution refusal.

## 2. Differential: stage, reason, exit code and write state unchanged [Observed]

- Harness: the implementer's adapted copy,
  `/tmp/claude-996/-home-orca-orca-projects-syzygy/c279c71d-f39b-4d61-b70b-caea13e536a7/scratchpad/diff/harness.test.ts`.
  I re-ran it myself at both commits (fresh FIFOs per side), dropped into `packages/polaris-dossier/src/` and removed
  after. Outputs: `.../scratchpad/r2/base.json`, `.../scratchpad/r2/head.json`.
- Compared with my own comparator (`.../scratchpad/r2/cmp.py`, written for this review, record ids
  `choice-<16 hex>` normalised) and, as a second method, round 1's `cmp2.py` on the raw files:

  | Comparator | Cases | Identical | Disclosures only | Other |
  |---|---|---|---|---|
  | `cmp.py` (mine) | 208 | 74 | 134 | 0 |
  | `cmp2.py` (round 1) | 208 | 74 | 134 | 0 |

- All 134 differing cases are stage `launched` on both sides. The only added content is:
  - JSON: a trailing `disclosures` array of the four strings, in the approved order;
  - text: four added stderr lines, `disclosures.0:` to `disclosures.3:`, the same four strings in the same order.
- Stage, exit code and write state agree in all 208 cases. Write-state mismatches (`wrote`, stored choice,
  `wrotePhys`, `wroteLex`): 0. Writes at the head under any present marker plant: 0.
- Stage table (plant, base stage, head stage, base exit, head exit):
  - each of the 11 present-marker plants: `launched/launched 1/1` x12 and usage `2/2` x5;
  - no marker: `run`, `reverify`, `revision`, `d9`, `owner`, `recorded-already` once each, `declarations` twice,
    recorded `0/0` x4 (JSON all-good, text all-good, trailing slash, dot segments), usage `2/2` x5;
  - symlinked `..`: lexical and both refuse `launched`; physical and neither record, on both sides.
- Fixture adaptation judged behaviour-neutral:
  - Against round 1's committed harness (`docs/evidence/syzygy-7xiv/cli-differential.test.ts.txt`) the copy differs
    in exactly two places: the `SUBJECT` locator `https://github.com/redis/redis` → `github.com/redis/redis`, and two
    added `GateSources` members (`observationConsentNaming`, `observationRecords`).
  - Both are the same edits `main` made to the committed `execution-choice.test.ts` fixture between `5ee1c1a1` and
    `ba0d8af6` (`git diff 5ee1c1a1 origin/main` of that file: the same locator line and the same two members).
    `observationConsentNaming` and `observationRecords` are required members of `GateSources` on `main`
    (`gate-sources.ts:62`, `:66`).
  - The same harness runs on both sides, so it cannot manufacture a difference.
  - It also does not hide one by short-circuiting. With no marker, the fixture reaches every library stage
    including a successful record, so the gates behind the marker check are exercised.

## 3. Tests pin the disclosures [Observed]

- `execution-choice.test.ts` pins the JSON refusal with `toEqual` on the full object, `disclosures` included,
  through the library (1 launched + 4 unreadable + 1 ordering) and through the CLI `--json` (1 launched + 4
  unreadable). Expected values are literals (`LAUNCHED_REASON`, `UNREADABLE_REASON`, `REFUSAL_DISCLOSURES`), not
  imported from the module under test. At the head: 37 passed (37).
- The text form is pinned by no committed test, only by this differential. Judged a note, not an exception (N1).

## 4. Rule 6 at the head [Observed]

- I re-ran the author's `docs/evidence/syzygy-bpyt-8-11/run_mutants.py` in the head worktree (output
  `.../scratchpad/r2/mutants-head.json`, commit field `62666e4c…`): M1 killed (3 failing), M2 killed (8), M3 killed
  (1). These are the same counts as the committed record. The worktree was clean afterwards and the subject's sha256
  was unchanged.

## 5. Gates at the head [Observed]

- `npm run check`: exit 0; 188 test files, 4483 passed, 1 skipped.
- `python3 scripts/check_governance.py`: `32 OK, 21 WARN, 0 FAIL (53 checks)`.
- `gh pr checks 652`, read at 2026-11-15T17:14Z (and again before writing this):
  - pass: `node`, `node (unit)`, `node (integration)`, `node (e2e)`, `checks (P115 recording selftest)`,
    `checks (readability selftest)`, `checks (reconciliation selftest)`;
  - pending: `checks (governance)`.
  - `mergeStateStatus: BLOCKED`, `mergeable: MERGEABLE`.

## Findings

### Revise

None.

### Exceptions

- **E1 (carried from round 1, now worse) — the committed mutant record names a commit on no remote ref.**
  - [Observed] `docs/evidence/syzygy-bpyt-8-11/mutants-2026-11-04.json` still says `"commit": "e8b8b0bb…"`.
  - After the rebase, `git branch -r --contains e8b8b0bb` returns nothing. The branch now points at `62666e4c`. The
    object survives only in local object stores.
  - [Observed] The subject bytes are unchanged: `execution-choice.ts` at `e8b8b0bb` and at the head both hash
    `ac8a75f9…`. The test file did change in the rebase (`f55057d4…` → `e31c3c28…`, main's fixture edits). My re-run
    at the head (§4) gives the same kill counts, so the record's claims still hold. The record alone cannot show
    that.
  - Proposed: before merge, regenerate the record at the head, or add the subject and test sha256 to it. The
    commit field is provenance only and will dangle again under rebase-merge.
- **E2 (carried from round 1, unaddressed) — M3's stored fragments are still descriptions, not bytes.**
  - [Observed] M3 `old` ends `const runId ... RUN_ID refusal`, and `new` begins `RUN_ID refusal`. Only re-running
    the script replays M3, not the record.
  - Proposed: as in round 1, store the literal anchor line.

### Notes (non-blocking)

- **N1 — the text form is pinned only by the differential.**
  - [Observed] Text stderr is `renderHuman` (`cli.ts:511`) of the same refusal object, one `key: value` line per
    leaf, with array indices as keys.
  - The object is pinned by `toEqual`. The renderer's index-key form is pinned elsewhere (`check.test.ts:896`,
    `start-gates.test.ts:1202`).
  - So the four `disclosures.N:` lines follow mechanically from pinned pieces. [Inferred] A regression would need a
    renderer change that those tests also catch.
  - The owner approved the text lines explicitly, and a one-assertion CLI test without `--json` would pin them
    directly at little cost. Recommended, not required.
- **N2 — round 1's E3 is resolved.** The owner's answer names the text form (`disclosures.0:` to `disclosures.3:`),
  which E3 asked to be put before the owner.
- **N3 — hosted `checks (governance)` was still pending.** Locally the same check is 0 FAIL. Read
  `gh pr checks 652` again before merge (rule 4: read output, not status).
- **N4 — direct-library stage change is intended.** A direct `allowExecution` call on a misnamed directory with a
  marker now refuses `launched` rather than `run` (ordering test). The only non-test caller is the CLI, where the
  differential shows no stage moved.

## Owner-approval conformance

- [Observed] Through the CLI, the only output change at the rebased head is the four approved disclosures, in the
  approved order, on the stage-`launched` refusal, in both forms: JSON `disclosures` array and text
  `disclosures.0:`-`.3:`. Over 208 cases, no other CLI output, stage, exit code or write changed.
- The rebase condition of the approval is met by this re-review of the rebased diff.
