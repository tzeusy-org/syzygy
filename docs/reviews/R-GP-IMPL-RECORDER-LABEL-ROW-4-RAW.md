# R-GP-IMPL-RECORDER-LABEL-ROW-4 — narrow recheck of the PR #514 merge-group repair
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 4f69913080d437f1117d4cf471d4e517f2897cb5
Base: 74c44cc0d38888316a268ff1111f709c4a98dc2f

Reviewer: fresh-context independent reviewer, not the author. PR #514 (`syzygy-bpyt.8.21`). Head `4f699130` is the
fix commit on merge `830a1bfe`, whose parents are `937a7e93` (the round-3 head) and `74c44cc0`. `74c44cc0` is
`origin/main` at review time and equals `git merge-base HEAD origin/main`. The round-3 base was `9a30237e`
(`git merge-base 937a7e93 74c44cc0`). I worked in a detached worktree, `.worktrees/review/r-514-4`, after `npm ci`,
with every command in the foreground. Read-only: the one mutation (§5) was restored, and the file's blob was checked
against `HEAD`.

## Governing references

- `OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-15.md`, item `pr514-large-label`, lines 137-149. The condition
  reads: "`recorder-template.ts` and both test files stay byte-identical to `8b143272`."
- `bd comments syzygy-bpyt.8.21`, the entry of 2026-11-16 12:39, recorded by
  `coordinator:claude-20261115-bc99f678` as an in-session owner answer. It reads: "gate-label-row.test.ts may gain
  only the await loadRecorderForms() line plus its import; recorder-template.ts and recorder-template.test.ts stay
  byte-identical to 8b143272."
- The team lead's brief: the tier move is approved as test-tier mechanics.

## 1. The merge changes nothing in the PR's subject beyond main [Observed]

- `git diff-tree --cc 830a1bfe` is empty, so the merge resolved no conflict hunks.
- Two patches were compared after dropping `index` lines: `git diff 9a30237e 937a7e93` (the PR before the merge)
  and `git diff 74c44cc0 830a1bfe` (the PR after it). They are identical (`diff` empty; 13 files, +62512 -23).
- So the merge carries the round-3 bytes over unchanged and adds only main's own history.

## 2. `gate-label-row.test.ts` against `937a7e93` [Observed]

- The blob at `937a7e93` is `e5898b42`. That is also its blob at `8b143272`, so the file was byte-identical to
  `8b143272` until this commit. At the head it is `1552ba4d`.
- `git diff 937a7e93 HEAD` on the file is one hunk, +4 -1:
  - the testing import gains `loadRecorderForms` (one line changed);
  - after the vitest/gate-sources imports, a blank line, then the comment line
    `// The recorder forms render once, before the file collects its tests: some tables render at collection
    (syzygy-bpyt.4.8).`, then `await loadRecorderForms();`.
- The comment and the blank line are beyond the letter of the 2026-11-16 allowance ("only the await … line plus its
  import"). See E1.
- The form matches `f2153f34`, which wrote that same comment above the same await in each consumer it touched. At
  the head, 9 of the 12 top-level `await loadRecorderForms();` sites carry the identical comment.

## 3. `recorder-template.ts` and `recorder-template.test.ts` equal `8b143272` [Observed]

Blobs from `git rev-parse <commit>:<path>`; each row equal at all three commits:

| File | `8b143272` | `937a7e93` | Head |
|---|---|---|---|
| `packages/polaris-generation-consent/src/recorder-template.ts` | `325a3176…` | `325a3176…` | `325a3176…` |
| `packages/polaris-generation-consent/src/recorder-template.test.ts` | `d44a959d…` | `d44a959d…` | `d44a959d…` |

## 4. `vitest.tiers.ts` relative to main [Observed]

- `git diff 74c44cc0 HEAD -- vitest.tiers.ts` adds one line,
  `'packages/polaris-dossier/src/gate-label-row.test.ts',`, to `INTEGRATION_TESTS` between `gate-acts.test.ts` and
  `gate-parts.test.ts` (alphabetical). Nothing else changes.
- The move is consistent with the rest of the tree:
  - `loadRecorderForms` (`recorder-fixtures.testkit.ts:91`) renders through "one asynchronous python3 run" (line 4).
  - All 12 files with a top-level `await loadRecorderForms();` at the head are listed in `vitest.tiers.ts`, and so
    are all 9 test files `f2153f34` touched.
  - `npm run test:tiers`: "ok: every test file is in exactly one tier" (unit 188, integration 95, e2e 26, live 3).
  - Run under `--project unit`, the file is now "No test files found".

## 5. Tests and gates at the head [Observed]

- `npx vitest run --project integration packages/polaris-dossier/src/gate-label-row.test.ts`: 1 file, 1 passed.
  The file holds one test.
- Rule 6: I deleted the `await loadRecorderForms();` line and re-ran. The run failed with "recorder render failed:
  the forms are not loaded; await loadRecorderForms() at the top of the test file first" (Tests: 1 skipped, file
  failed). The original was restored and the blob re-checked as `1552ba4d`.
- `npm run check`: exit 0; 188 files, 4512 passed, 1 skipped.
- `python3 scripts/check_governance.py`: `32 OK, 21 WARN, 0 FAIL (53 checks)`.
- `gh pr checks 514`, read at 2026-11-16T12:49Z, after the team lead's report and checked independently:
  - all 9 checks pass;
  - runs `43868924137` and `43868924020` both have `headSha` `4f699130…` and conclusion success;
  - `mergeStateStatus: CLEAN`.

## 6. PR body, "Merge-group repair 2026-11-16" [Observed]

Each claim, checked:

- "failed in one test, `gate-label-row.test.ts`, with 'the forms are not loaded'": consistent with the bead entry and
  with my rule-6 reproduction. I did not open the merge-group run log.
- "main's `f2153f34` … made every recorder-forms consumer await `loadRecorderForms()` at its top level": matches
  `f2153f34`'s message and diff. It is an ancestor of the head.
- "Commit `4f699130` (after merging `origin/main`, `830a1bfe`)": matches the parentage.
- "imports `loadRecorderForms` and awaits it after the imports, written as `f2153f34` wrote it": accurate. The form
  includes `f2153f34`'s comment line.
- "(the owner allowed exactly this edit to the file)": not accurate in the strict sense. The recorded allowance names
  the await line and its import only, not the comment or the blank line (E1).
- "`loadRecorderForms` runs one `python3` process, which the unit tier refuses. Every other consumer `f2153f34`
  touched is already integration-tier": accurate (§4).
- "The owner's byte condition covers `recorder-template.ts`, `recorder-template.test.ts` and this test file, not
  `vitest.tiers.ts`": accurate. The condition names `recorder-template.ts` and "both test files".
- "keep the same blob ids as at `8b143272` (`325a3176…`, `d44a959d…`)": accurate (§3).
- Checks: "1 of 1", "188 files, 4512 passed, 1 skipped", "every file is in exactly one tier", "0 FAIL (32 OK, 21
  WARN)": all reproduced (§4, §5).

## Findings

### Revise

None.

### Exceptions

- **E1 — the test-file edit is two lines wider than the recorded owner allowance, and the PR body says it is exactly
  that allowance.**
  - [Observed] The allowance, as recorded on the bead, is "may gain only the await loadRecorderForms() line plus its
    import". The edit also adds a comment line and a blank line (§2).
  - Behaviour is unaffected:
    - the comment is inert;
    - it is `f2153f34`'s own text, used verbatim at 9 of the 12 sites;
    - the blank line is layout.
  - [Inferred] The owner may well have meant "written as main's consumers write it". But the condition is a
    byte-identity condition, and its narrowing is worded as "only".
  - Proposed, either of:
    - the coordinator puts the exact +4 -1 hunk before the owner and records the answer;
    - drop the comment and the blank line. That costs a CI cycle, and the file would then differ from the
      convention.
  - Either way, correct the PR body's "exactly this edit" sentence to match.

### Notes (non-blocking)

- **N1 — the 2026-11-16 allowance is recorded by an agent, not by an owner-written file.** It is a bead comment by
  `coordinator:claude-20261115-bc99f678` reporting an in-session answer. No dated decision file carries it yet.
  [Inferred] If the project wants it citable later, it belongs in a decisions record beside the 2026-11-15 answers.
- **N2 — tier mechanics.** The tier move is outside the owner's byte condition and required by the unit tier's
  child-process refusal. It is the minimal fix, and `test:tiers` passes.
