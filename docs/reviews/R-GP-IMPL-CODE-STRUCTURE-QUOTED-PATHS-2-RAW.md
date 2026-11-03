# Review R-GP-IMPL-CODE-STRUCTURE-QUOTED-PATHS-2 (PR 664, syzygy-9bbm test pins)

Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: b4840ab178a68fdead7ef817874194b3be00ae77
Subject: PR #664

Reviewer worker for `syzygy-4u5m`. Scratch detached worktree at the head, `npm ci`, every command run in the foreground. Labels per AGENTS.md.

## Scope

- [Observed] `git diff origin/main...b4840ab1` touches two files, +19 -0: `packages/three-surface-poc-core/src/code-structure.test.ts` (+2) and `packages/three-surface-poc-core/src/git-tree.test.ts` (+17). No source file, no governed file, no evidence file.
- [Observed] Base `origin/main` is `5f6ff684` (merge of #646). The head has no commit beyond the tests.

## Gates at the head

- [Observed] `npx vitest run --project unit packages/three-surface-poc-core`: 33 files, 1260 tests passed.
- [Observed] `npx vitest run --project integration .../code-structure.test.ts`: 15 passed. This file is excluded from the unit tier, so the unit command above does not run N1; the integration tier does.
- [Observed] `npm run typecheck`: exit 0.
- [Observed] `python3 scripts/check_governance.py`: 32 OK, 21 WARN, 0 FAIL.

## Each pin asserts current behaviour

- [Observed] N1: `code-structure.ts` rejects a non-empty listing lacking a final NUL, then filters gitlink records with `GITLINK_HEAD`, joins and parses. A gitlink-only listing without a final NUL filters to `''`, which the parser accepts as `parsed` with no entries. Only the observer's own check yields Unknown. The new assertion expects Unknown, which is the behaviour at the head, not a change.
- [Observed] N2: `git-tree.ts` default mode refuses a path that `startsWith('"')` or includes LF only. An interior `"` and CR are accepted. The test pins exactly that, with two entries.
- [Observed] N4: `if (record === '') continue;` applies in both modes. The test feeds `a.md\0\0` to both modes and expects one entry. Current behaviour.

## Mutations re-run (rule 6)

- [Observed] R4 (the observer's `if (raw !== '' && !raw.endsWith('\0'))` replaced by `if (false)`): integration run fails, `asks git for NUL-terminated records and turns any record it cannot read into Unknown, never a skip`: expected `observed` to equal `unknown`. Unmutated: 15 passed. So the N1 line kills R4. R5 and R8 from the PR body were not re-run here.
- [Observed] N2 mutant (default mode also refuses interior `"` and `\r`): 1 failed, the new N2 test, 10 passed.
- [Observed] N4 mutant (`record === '' && false`): 7 failed, among them the new N4 test. The mutant is blunt (every trailing NUL yields an empty last record, so older tests fail too) and does not show that the new test discriminates alone.

## N4 judgment

- [Inferred] Correct as stated. `git ls-tree -z` ends each record with NUL and never emits an empty one, so an empty interior record names no path and drops no entry. Skipping it cannot hide a committed path. Identical in both modes, so no owner question.

## Exceptions

- E1 [Observed]: the PR body says R5 and R8 "also now fail". Not re-run in this review, so that sentence is unconfirmed here.
- E2 [Observed]: the PR body "Tests: +2 ~2 -0" does not match the diff. The diff adds two tests in `git-tree.test.ts` and extends one existing test in `code-structure.test.ts`, so +2 ~1.
- E3 [Observed]: the PR cites `R-GP-IMPL-CODE-STRUCTURE-QUOTED-PATHS-1`. That raw is on `main` nowhere: `git ls-tree -r origin/main` lists no such file. PR 649, which carried it, is CLOSED and unmerged. The citation names a retained record that is not on `main`.
- E4 [Unknown]: the PR's E1 paragraph says GP-Q0 part 3 row 6.1 covers the change and that no separate `syzygy-bpyt.1` decision was made. This review did not read the owner list nor the bead history to confirm either claim.

## Notes

- The N4 test pins an input git never emits; the comment says so.
- No revise finding. No thread was left.
