# R-PDJA-30-2 — launch type test header-only read, implementation review, round 2
Reviewed commit: a85b6c56
Subject: PR #816
Verdict: CONFIRM WITH EXCEPTIONS

## What I ran

- Setup
  - `git fetch origin agent/syzygy-pdja-30-type-test`.
  - `git worktree add --detach /home/orca/.tmp/reviews/rv816b a85b6c568ff0995fa8fa7f51dc67c9b35f796bff`, then `npm ci` (exit 0).
  - Every run used `TMPDIR=/home/orca/.tmp/reviews/tmp816b`.
- What I read
  - `bd show syzygy-pdja.30`, including its three acceptance criteria.
  - `git diff origin/main...HEAD`: 7 files.
    - Code: `git-object-reader.ts`, `git-object-reader.test.ts`, `launch.ts`, `launch.test.ts`.
    - Docs: the mutation record, the campaign file and `R-PDJA-30-1-RAW.md`.
  - `git show --stat` of 902d38cd and a85b6c56.
    - 902d38cd touches only `git-object-reader.test.ts` and `launch.test.ts`.
    - a85b6c56 touches only the three docs files.
  - In `git-object-reader.ts`: `headerType`, `looseHeaderType`, `packedHeaderType`, `count`, `charge`, `verified`, `looseStored`, `loose`, `packed`, `rawForDelta`, `inflateAt`, `handle`, `readAt` and `lookup`.
  - The `launch.ts` `isCommit` port, and its only caller, `launch-revision.ts:100`.
  - Spec `openspec/changes/polaris-dossier-launch-consent/specs/polaris-generation/spec.md`, lines 1–20 and 160–175.
  - The PR #816 body (`gh pr view 816`).
  - PR #812 state: OPEN. `PROJECT-STATUS.md` lists the launch-consent v1.0 and v1.1 sign-off checks only.
- Subject digests [Observed]
  - `git merge-base --is-ancestor 902d38cd HEAD` succeeds.
  - Each of the four code files at a85b6c56 hashes (sha256) to the record's `subjectDigests`:
    - `git-object-reader.ts` e4c6f51d…
    - `git-object-reader.test.ts` fb2f8c37…
    - `launch.ts` d8dd1db2…
    - `launch.test.ts` 23d6aa7b…
- Baseline for the mutant suite
  - Command: `npx vitest run --project integration packages/polaris-dossier/src/git-object-reader.test.ts packages/polaris-dossier/src/launch.test.ts`
  - ` Test Files  2 passed (2)`
  - `      Tests  95 passed (95)`
- Mutants (rule 6)
  - Method: one Python script, kept outside the repository.
    - Per mutant it asserts `old` occurs exactly once in `file`, replaces it, and runs the two test files above under `--project integration`.
    - It restores the file in a `finally`.
  - The record's 13 mutants, re-run at a85b6c56: [Observed] all 13 KILLED (exit 1).
    - Each `Tests` summary line equals the record's:

| Mutant | Tests summary |
|---|---|
| M1-loose-full-read | 5 failed \| 90 passed (95) |
| M2-packed-full-read | 4 failed \| 91 passed (95) |
| M3-ofs-base-full-read | 1 failed \| 94 passed (95) |
| M4-loose-stored-read-unbounded | 1 failed \| 94 passed (95) |
| M5-inflate-whole-stored-not-prefix | 3 failed \| 92 passed (95) |
| M6-launch-type-test-back-to-tree | 2 failed \| 93 passed (95) |
| M7-stored-read-uncharged | 1 failed \| 94 passed (95) |
| R1-ref-base-full-read | 2 failed \| 93 passed (95) |
| R2-header-chain-depth-unchecked | 1 failed \| 94 passed (95) |
| R3-ref-loose-base-dropped | 1 failed \| 94 passed (95) |
| R4-stored-header-cap-unbounded | 1 failed \| 94 passed (95) |
| R5-header-length-cap-removed | 1 failed \| 94 passed (95) |
| R6-ref-branch-answers-tree | 3 failed \| 92 passed (95) |

  - My own mutants, all in `packages/polaris-dossier/src/git-object-reader.ts`: [Observed] all three SURVIVED.
    - Each run exited 0 with ` Test Files  2 passed (2)` and `      Tests  95 passed (95)`.
    - V1-header-inflation-uncharged
      - old: `          this.charge(out.length, id, at);\n`
      - new: (empty)
      - Outcome: SURVIVED.
    - V2-pack-entry-header-byte-cap-removed
      - old: `const b = i < 32 ? (await readAt(fh, offset + i, 1))[0] : undefined;`
      - new: `const b = i < 1 << 30 ? (await readAt(fh, offset + i, 1))[0] : undefined;`
      - Outcome: SURVIVED.
    - V3-header-step-output-unbounded
      - old: `const HEADER_STEP_OUTPUT = 64 * 1024;`
      - new: `const HEADER_STEP_OUTPUT = 2 ** 30;`
      - Outcome: SURVIVED.
  - After all 16 mutants, `git status --porcelain` in the worktree printed 0 lines.
- `npm run check` (exit 0; no `error TS` lines)
  - ` Test Files  183 passed (183)`
  - `      Tests  4306 passed | 1 skipped (4307)`
- `npx vitest run --project integration packages/polaris-dossier`
  - ` Test Files  22 passed (22)`
  - `      Tests  1263 passed | 4 skipped (1267)`
- `python3 scripts/check_governance.py`
  - `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`
- `python3 scripts/check_docs_review_campaign_partition.py --check`
  - `second-method PASS: git ls-files=824; git ls-tree=824; exact path sets equal`
  - `partition PASS: denominator=824; assigned=824; raw=779; other=45; unmatched=0; overlaps=0; campaigns=149`
- Cleanup
  - `git status --porcelain` printed 0 lines.
  - `git worktree remove --force /home/orca/.tmp/reviews/rv816b` was run from the main repo, and the TMPDIR was deleted.
- Not done
  - I ran no dossier, read no observed-repository body and made no provider call.

## Findings

**Finding 1 — Round-1 Finding 1 (the REF_DELTA path was untested) is resolved** (note)
- [Observed] Three new tests reach the `kind === REF_DELTA` branch of `packedHeaderType`:
  - a REF delta in git's own pack, with its chain's bodies overwritten;
  - a REF base that is loose;
  - a REF base in a second, hand-built pack.
- [Observed] One test confirms the entry really is type 7 (`(… >> 4) & 7).toBe(7)`).
- [Observed] The reviewer's mutants are all KILLED at the head:
  - R1 by 2 tests;
  - R3 by 1 test;
  - R6 by 3 tests.
- [Observed] The first test's name no longer says "both delta forms".
  - Its new name still says it answers "from the offset-delta and reference-delta packs". There, the four objects it queries are not REF_DELTA entries.
  - [Inferred] "reference-delta pack" names the fixture, not the entry kind. This is a wording point only, now that other tests cover the branch.

**Finding 2 — Round-1 Finding 2 (untested guards) is resolved** (note)
- [Observed] R2, R4 and R5 are KILLED. Each is killed by its own new test:
  - the REF cycle refuses at `maxDeltaChainDepth: 5`, before `maxObjectsPerCall: 100`;
  - 300 empty stored blocks after `blob 1` refuse at 1024 stored bytes;
  - 40 inflated bytes with no NUL refuse as a malformed header.
- [Observed] The fixtures write literal expected messages.

**Finding 3 — Round-1 Finding 3 (the launch fixture could not tell a header read from a refused full read) is resolved** (note)
- [Observed] `readLog` in `launch.test.ts` now records what each `storedType` call resolved to, or `refused <reason>`.
- [Observed] The tag/blob launch test asserts the answers `['tag']` and `['blob']`.
  - Under M1 or M5 that test fails, so a refused full read is now told apart at launch level.
- [Observed] The HEAD-elsewhere test now pins the exact call sequence `[storedType <c>, tree <c>]` and `['commit']`.

**Finding 4 — Round-1 Findings 4 and 5 (residual reads outside line 9) are disclosed for the owner** (note)
- [Observed] The PR body's section "Disclosed residual, for the owner" says three things:
  - a tag's or blob's header is not on the line-9 list;
  - a type test must touch the named object;
  - the last inflated stored byte may decode body bytes that are then discarded.
- It also leaves the question of "SHALL read no blob" and the registry's `typedAuthority.tags` "never read" to the owner, and names #812.
  - [Observed] #812 is OPEN, so v1.1 stays in force.
- Accuracy: [Inferred] the disclosure is accurate, with one understatement (see Finding 6).
  - The pack path reads only entry-header bytes and a REF base identifier:
    - `next()` reads at most 32 bytes per entry;
    - the base identifier is `HEX/2` bytes.
  - The loose path reads compressed stored bytes 64 at a time, up to 1024. Bytes past the header's stream are read from disk in compressed form but not inflated.
  - The body bytes decoded at the last step are charged by `this.charge(out.length…)`. Nothing returns, hashes or stores them.

**Finding 5 — The budget test's name claims a charge that no test pins** (note)
- [Observed] Mutant V1 removes `this.charge(out.length, id, at)` and survives.
- Why the test cannot catch it: [Inferred]
  - The test is named "a loose header is charged one 64-byte stored read and its inflation".
  - At 128 bytes it passes either way: 64 stored bytes plus a short header fit.
  - At 40 bytes it refuses on the stored charge alone (M7 kills that).
  - So "and its inflation" is pinned by nothing.
- The same claim appears in the JSDoc and in the PR body ("the stored reads and the final inflation are charged").
- [Inferred] As written the code does charge it. A regression would under-count the call budget by about 1 KiB per header at most (Finding 6), so the read stays bounded.
- Repair (optional):
  - add a budget between 64 and 64 plus the decoded prefix length, derived from the fixture, that must refuse;
  - or drop "and its inflation" from the test name.

**Finding 6 — `HEADER_STEP_OUTPUT` is in practice unreachable, so V3's survival is an equivalent mutant; the true decode bound is about 1 KiB** (note)
- [Observed] V3 raises the 64 KiB cap to 2^30 and survives.
- Why the cap cannot bind: [Inferred, from the deflate format, not measured]
  - One more input byte is 8 bits.
  - The cheapest length-258 match is a 1-bit literal/length code plus a 1-bit distance code, with no extra bits.
  - So one stored byte decodes to at most about 4 × 258 = 1032 bytes.
  - Earlier steps add at most 32 bytes on top of that.
  - So `maxOutputLength: HEADER_STEP_OUTPUT` is defensive, and no valid stream reaches it.
- The JSDoc ("a few back-references of 258 bytes each") is consistent with this.
- Effect on the disclosure: the PR body's "a few body bytes" is typical, not the worst case.
  - For a highly compressible blob or tag body, up to about 1 KiB of body can be decoded in memory and discarded.
  - The owner question in Finding 4 should carry that figure. This is a wording note, not a defect.

**Finding 7 — The pack entry-header byte cap is untested but harmless** (note)
- [Observed] V2 lifts `next()`'s 32-byte limit and survives.
- Why it is harmless: [Inferred]
  - Without the cap, a crafted entry whose header bytes all have the continuation bit set is read one byte per `read` call until the pack ends.
  - Each byte is uncharged and unaccumulated, because the header path never builds the size.
  - It still terminates: `readAt` returns empty at end of file, which refuses `corrupt-object`.
  - Real headers fit easily: a size varint is at most 10 bytes, and an OFS varint at most 10.
- This matches the round-1 Finding 2 standard (it terminates, so it is a note). A two-entry fixture would pin it if wanted.

**Finding 8 — Correctness, boundedness and termination of the diff hold on every path traced** (note)
- [Observed] `isCommit` has one caller, `launch-revision.ts:100`, and is called once per launch.
  - A non-commit answer returns `false` before `tree()`, so a tag or blob is never passed to `verified()`.
  - A commit answer goes on to `tree()`, which re-hashes the commit (`identifier-mismatch` on a lying header) and reads only its root-tree line. That stays within line 9's "the pinned commit object".
- [Observed] Resolution order matches the full reader:
  - loose before packs at the top level (`headerType` and `raw`);
  - packs before loose for a REF base (`packedHeaderType` and `rawForDelta`).
- Loose loop: [Inferred]
  - `stored.length` is at most 1024.
  - Each step re-inflates the prefix with `Z_SYNC_FLUSH`.
  - It stops at the first output holding a NUL or exceeding 32 bytes.
  - So it makes at most 1024 inflates of at most 1024 bytes each.
- Pack path: [Inferred]
  - OFS bases lie strictly backward, so they cannot cycle.
  - REF chains are bounded by `chainDepth` (pinned, R2) and by `callObjects`.
  - A truncated REF base identifier refuses.
- [Observed] The header path skips `packed`'s check that the declared size is at most `objectBytes`. This is immaterial, because no body is read.
- [Observed] `refuse` reasons keep the public shape. The body-read paths are unchanged (diff shows no edit to `verified`, `loose` or `packed`).

**Finding 9 — The evidence record, campaign and retained raw are consistent with the bytes** (note)
- The mutation record: [Observed]
  - its `ranAt` 902d38cd is an ancestor of the head;
  - all four subject digests match the head;
  - each mutant carries `old`, `new`, `exitCode`, `outcome` and summary lines;
  - its `supersedes` note names the first 7-of-7 run at 7822a01c.
- The campaign file: [Observed]
  - its pattern `R-PDJA-30-.*\.md` matches this raw's intended name;
  - it cites `R-PDJA-30-1-RAW.md:4` as `Verdict: REVISE`, and line 4 of that file reads exactly that;
  - the partition check passes with `unmatched=0`.
- Gap: the record does not hold V1–V3 (Findings 5–7). Adding them would make it complete for this round.
