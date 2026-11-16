# R-GP-IMPL-LAUNCHED-MARKER-LIBRARY-3 — narrow recheck of the round-2 repairs on PR #652
Verdict: CONFIRM
Reviewed commit: 62e1a54601f39ea7bb582a0c9a26d68c6ea42f5f
Base: ba0d8af6bb7db75638f28f4df20031be5355d455

Reviewer: the round-2 reviewer, rechecking narrowly; not the author. Head `62e1a546` is two commits on round 2's
`62666e4c`: `72eadd27` (test plus mutant script) and `62e1a546` (evidence record, retained raw, campaign entry).
Merge base = `origin/main` = `ba0d8af6`. Detached scratch worktree, `npm ci`, every command in the foreground.
Read-only on the branch: every mutation was restored, and `git status --porcelain` was empty afterwards.

## Scope

The round-2 findings this recheck covers (`R-GP-IMPL-LAUNCHED-MARKER-LIBRARY-2-RAW.md`):

- E1: the mutant record named a commit on no remote ref.
- E2: M3's fragments were descriptions, not the mutated bytes.
- N1: the text form was not pinned by a committed test.
- The campaign entry and the retained raw.

Nothing else from round 2 is re-reviewed. Product bytes are unchanged (§1), so round 2's differential and
owner-approval conformance carry over.

## 1. Product code unchanged [Observed]

- `git diff 62666e4c..62e1a546 --stat` lists 5 files, +227 -7:
  - `mutants-2026-11-16.json` (new);
  - `run_mutants.py`;
  - the campaign file;
  - the retained raw (new);
  - `execution-choice.test.ts`, +16.
- Restricted to `packages/` and `apps/`, the only file is `execution-choice.test.ts`.
- `execution-choice.ts` still hashes `ac8a75f981bfc5764d2da45b80572a6fc6967b19e19712b2c99e310e986295ba` (scripted
  sha256), as in rounds 1 and 2. `cli.ts` has no diff.

## 2. E1 — record regenerated with digests: resolved [Observed]

- `mutants-2026-11-16.json` carries the following fields:
  - `subjectSha256` `ac8a75f9…`;
  - `testSha256` `b46c9965…`;
  - `commit` `72eadd2754cf4f993e248d2c43ace1b62bbaf3f5`.
- Both digests equal the bytes at `72eadd27` and at the head (`git show … | sha256sum`).
- `72eadd27` is contained in `origin/agent/syzygy-bpyt.8.11`. Under rebase-merge it will dangle like `e8b8b0bb`
  did. The record can now be re-checked by digest, which is what round 2 asked for.
- The round-1 record `mutants-2026-11-04.json` is kept unchanged beside the new one.

## 3. E2 — M3 stores literal bytes: resolved [Observed]

- `run_mutants.py` now computes `old = original[start:stop]` (block, `const runId` line, RUN_ID refusal) and
  `new = original[end:stop] + block`.
- It asserts both of these:
  - `old` occurs exactly once;
  - the replacement equals the previous remove-and-reinsert construction.
- In the stored record, each of M1, M2 and M3 has an `old` that occurs exactly once in the head's
  `execution-choice.ts`, and replacing it with `new` changes the file.
- I re-ran the script at the head (`…/scratchpad/r3/mutants-head.json`):
  - `subjectSha256` and `testSha256` equal the committed record's;
  - every mutant's `old`/`new` is byte-equal to the record's;
  - M1 is killed (4 failing), M2 (8) and M3 (1), with the same failing-test names as the record.
  - The `commit` field differs, as it must (`62e1a546` against `72eadd27`).
- M1 now fails 4 tests, not 3, because the new text test also catches it.

## 4. N1 — text form pinned: resolved [Observed]

- New test `execution-choice.test.ts:309-323` runs the CLI without `--json` on a launched run and pins:
  - exit 1;
  - a `stage: launched` line;
  - the stderr lines starting `disclosures`, which must equal `disclosures.0:` to `disclosures.3:` over the
    literal `REFUSAL_DISCLOSURES`, in order;
  - that no choice was written.
- Rule 6, my mutants (`…/scratchpad/r3/tmut.py`, results `…/scratchpad/r3/test-mutants.json` with each
  `old`/`new`). Each mutant was applied, `execution-choice.test.ts` was run, and the file was restored:

  | Mutant | Exit | New test fails | Failing tests |
  |---|---|---|---|
  | T1 swap disclosures 2 and 3 in `DISCLOSURES` | 1 | yes | 11 |
  | T2 `renderHuman` array index `+ 1` | 1 | yes | 1 |
  | T3 launched arm returns a refusal without `disclosures` | 1 | yes | 3 |
  | T4 `renderHuman` drops a `disclosures` array | 1 | yes | 1 |

- T2 and T4 are killed only by the new test. That is the text-specific pin round 2 asked for.

## 5. Retained raw [Observed]

- `docs/reviews/R-GP-IMPL-LAUNCHED-MARKER-LIBRARY-2-RAW.md` is byte-identical to the file I wrote (`cmp` equal).
- Its sha256 is `3df0645b5d59e0d4771598b1e5bd14430b33cf352b2c1f1fe9a6915d9bee6173`, matching the author's
  `3df0645b…`.

## 6. Campaign entry [Observed]

- The edit in `docs/review-campaigns/greenfield-parity-implementation.md` changes `stays` to `stayed`.
- It replaces "merge waits for it;" with a round-2 sentence. That sentence is accurate:
  - verdict `CONFIRM WITH EXCEPTIONS`, cited at `…-LIBRARY-2-RAW.md:2`, which is the `Verdict:` line;
  - over `62666e4c`;
  - two exceptions, four notes, no revise finding;
  - the differential: 208 cases, 74 identical, 134 disclosures-only;
  - E3 resolved by the owner's answer (N2);
  - E1 and E2 carried over.
- It describes the repair as made ("the repair regenerates…", "N1 gains a CLI test"). It does not claim that any
  review confirmed the repair, nor a round-3 verdict.
- `check_docs_review_campaign_partition.py --check` gives `partition PASS: denominator=864; assigned=864;
  raw=817; other=47; unmatched=0; overlaps=0; campaigns=152`. The second-method line reads `864 = 864`.

## 7. Gates at the head [Observed]

- `npm run check`: exit 0; 188 files, 4484 passed, 1 skipped. Round 2 had 4483; the extra test is the new one.
- `python3 scripts/check_governance.py`: `32 OK, 21 WARN, 0 FAIL (53 checks)`.
- `gh pr checks 652`, read at 2026-11-15T17:30Z:
  - all 9 checks pass, including `checks (governance)`;
  - runs `43740488286` and `43740488293` both have `headSha` `62e1a546…` and conclusion success;
  - `mergeStateStatus: CLEAN`.

## Findings

### Revise

None.

### Exceptions

None.

### Notes (non-blocking)

- **N1 — "at the head" in the campaign entry means `72eadd27`, not the PR head.**
  - [Observed] The record's `commit` is `72eadd27`. The current head is `62e1a546`, which adds docs only, so the
    subject and test bytes, and therefore the digests, are equal at both.
  - [Inferred] Accurate in substance. A reader matching the `commit` field against the PR head will see two
    different SHAs. No change needed.
- **N2 — the campaign entry does not yet record this recheck.** That is correct as of these bytes. Adding round 3
  is a later edit, and that edit retires nothing reviewed here, because product bytes are not touched.
