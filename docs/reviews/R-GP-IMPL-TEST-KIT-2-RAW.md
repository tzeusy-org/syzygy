# R-GP-IMPL-TEST-KIT-2: PR #624 round 2 (syzygy-bpyt.4.4 first slice, private packages/test-kit)

Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 58983b113e439e2928df7a591884e77398f76d3d
Subject: PR #624

Reviewer: fresh-context CC-REV-1 round-2 pass over the repair commit 58983b11 on top of 9737c322 (round 1: R-GP-IMPL-TEST-KIT-1-RAW.md, REVISE). Scratch detached worktree at the reviewed commit, `npm ci`, no `dist/` present (`ls packages/*/dist` found none).

## Repair diff read (9737c322..58983b11)

Three files: `apps/three-surface-poc/src/git-observation.test.ts` (workspace pin 12 to 13, probe pin 61 to 66), `packages/polaris-dossier/src/no-egress.test.ts` (one alias entry), `packages/test-kit/package.json` (description only).

## Commands run (reviewed commit, TMPDIR=/tmp/r2624, all foreground)

- `npm run typecheck`: exit 0.
- `npm test` (unit): 165 files, 3604 tests passed.
- `npm run test:integration`: 86 of 87 files passed; 3 tests in `packages/polaris-dossier/src/review.test.ts` failed with "Test timed out in 5000ms" under host load average about 29. Re-run of that file alone with `--testTimeout=60000`: 63 of 63 passed. `git-observation.test.ts` passed in both runs. Hosted `node (integration)` passes on the head.
- `npx vitest run --project e2e`: 13 files passed, 125 passed, 2 skipped.
- `python3 scripts/check_governance.py`: 32 OK, 21 WARN, 0 FAIL.
- `gh pr checks 624` on the head: node, node (unit), node (integration), node (e2e) pass; the `checks` aggregate was pending at read time.

## Dispositions

F1 (was blocking): CONFIRMED a population pin, not a change to what the observer accepts or refuses. The row's derived `projects` list is asserted unchanged (eight projects, `packages/test-kit` not among them) and `exact` unchanged; the row then requires `pocObserverInputsAreClean` to agree with `isInput` over every tracked path and every probe, now including the five test-kit probes, which must be accepted as non-inputs. That agreement passes, so the refusal set is unchanged and no GP-Q0 question arises. 13 workspaces times 5 probes plus the one near-miss is 66.

F2 (was blocking): CONFIRMED. `@syzygy/test-kit` maps to `packages/test-kit/src/index.ts`, in sorted position; the e2e project passes.

F3 (low): residual ACCEPTED. The package still exports `dist/` targets that cannot exist; the description now says there is no build and that the dist entries exist only for the workspace-reach guard's dist-form requirement. Exception: I did not independently re-prove that guard's requirement beyond the author's statement and the passing e2e/integration runs; if that requirement is later relaxed the dist entries should go.

F4 (low): deferred to syzygy-7zyr; not re-opened. Exception: the PR body should still name the unconsumed exports; not checked on this head.

## Verdict

CONFIRM WITH EXCEPTIONS. Both blocking findings are repaired and verified; the exceptions are the F3 guard-requirement claim taken from the author and the F4 deferral.
