# R-PDJA-30-1 — launch type test header-only read, implementation review, round 1
Reviewed commit: 69d96fcf
Subject: PR #816
Verdict: REVISE

## What I ran

- Setup
  - `git fetch origin agent/syzygy-pdja-30-type-test`.
  - `git worktree add --detach /home/orca/.tmp/reviews/rv816a 69d96fcf013389a2de12e2dbe5440f526b4b4b38`, then `npm ci` (exit 0).
  - Every run used `TMPDIR=/home/orca/.tmp/reviews/tmp816a`.
- Read
  - `bd show syzygy-pdja.30`.
  - `git diff origin/main...HEAD` over the five changed files.
  - `git-object-reader.ts`: `Walk.readRoot`, `ObjectStore.verified/raw/loose/packed/rawForDelta/inflateAt/handle`, `readAt` and `refuse` (which is typed `never` and throws).
  - Launch-consent spec lines 1–20 and 160–172.
  - `typedAuthority.readAuthority` in `POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-CANDIDATE.json`.
- Subject digests: [Observed]
  - `git merge-base --is-ancestor 7822a01c HEAD` succeeds.
  - Each of the four subject files at 69d96fcf hashes (sha256) to the digest the mutation record gives for it:
    - `git-object-reader.ts`: e4c6f51d…
    - `git-object-reader.test.ts`: ca41ae2d…
    - `launch.ts`: d8dd1db2…
    - `launch.test.ts`: ca2bff6c…
- `npm run check` (which runs `npm run typecheck && npm test`). The typecheck printed no errors; I also ran it alone and it was clean.
  - ` Test Files  183 passed (183)`
  - `      Tests  4306 passed | 1 skipped (4307)`
- `npx vitest run --project integration packages/polaris-dossier`
  - ` Test Files  22 passed (22)`
  - `      Tests  1257 passed | 4 skipped (1261)`
- `python3 scripts/check_governance.py`
  - `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`
- Mutants (rule 6)
  - Method: one Python script. For each mutant it asserts the `old` text occurs exactly once, replaces it, runs `npx vitest run --project integration packages/polaris-dossier/src/git-object-reader.test.ts packages/polaris-dossier/src/launch.test.ts`, and restores the file in a `finally`.
  - Each run's suite: 2 test files, 89 tests.
  - The record's seven mutants, re-run at 69d96fcf: [Observed] all KILLED, with the same failing tests the record lists.
    - M1-loose-full-read: KILLED (2 failed | 87 passed).
    - M2-packed-full-read: KILLED (1 | 88).
    - M3-ofs-base-full-read: KILLED (1 | 88).
    - M4-loose-stored-read-unbounded: KILLED (1 | 88).
    - M5-inflate-whole-stored-not-prefix: KILLED (1 | 88).
    - M6-launch-type-test-back-to-tree: KILLED (2 | 87).
    - M7-stored-read-uncharged: KILLED (1 | 88).
  - My own mutants: [Observed] all six SURVIVED (`Tests  89 passed (89)`).
    - R1-ref-base-full-read
      - old: `        if (o !== null) return this.packedHeaderType(p, o, id, at, depth + 1);`
      - new: `        if (o !== null) return (await this.packed(p, o, id, at, depth + 1)).type;`
    - R6-ref-branch-answers-tree
      - Same `old` as R1.
      - new: `        if (o !== null) return 'tree';`
    - R3-ref-loose-base-dropped
      - old: `      const loose = await this.looseHeaderType(baseId, at);\n      if (loose !== null) return loose;\n`
      - new: (empty)
    - R2-header-chain-depth-unchecked
      - The `if (depth > this.limits.chainDepth) refuse(...)` line was deleted from `packedHeaderType` only.
      - It was anchored on the preceding `Promise<GitObjectType> {\n`.
    - R4-stored-header-cap-unbounded
      - old: `HEADER_STORED_BYTES = 1024;`
      - new: `HEADER_STORED_BYTES = 1 << 30;`
    - R5-header-length-cap-removed
      - old: `if (nul < 0 && out.length <= HEADER_BYTES) continue;`
      - new: `if (nul < 0) continue;`
- Cleanup
  - `git status --porcelain` in the worktree printed 0 lines after all mutants.
  - The worktree was removed with `git worktree remove --force` and the TMPDIR deleted.
- Not done: I ran no dossier, read no observed-repository body and made no provider call.

## Findings

**Finding 1 — the REF_DELTA header path is never exercised, though a test name claims "both delta forms"** (revise)
- What the tests do: [Observed]
  - The test "answers each type from loose objects and both delta forms" queries `C2`, `TREE2`, `QUOTED_ID` and `BIG2_ID` in the `REF` fixture.
  - Mutant R6 makes every REF_DELTA entry answer `'tree'`, and it survives. So none of those four objects is a REF_DELTA entry in that pack, and no test reaches the `kind === REF_DELTA` branch of `packedHeaderType`.
  - R1 (a REF base read in full through `packed`) survives for the same reason.
  - R3 (dropping the fallback to a loose REF base) also survives. Neither of these is tested:
    - a REF base that lives loose;
    - a REF base that lives in another pack.
- Why it matters: the branch reads no body as written. [Inferred, from reading the code]
  - It reads the 20- or 32-byte base identifier.
  - It then recurses into `packedHeaderType`, or into `looseHeaderType` for a loose base.
  - But this is one of the three paths the bead's acceptance criterion 1 names ("packed: entry type bits, base-chain headers for deltas"), and nothing would catch a regression to a full base read.
- Repair: add tests that kill R1, R6 and R3.
  - Query a known REF_DELTA entry with its chain's bodies overwritten, as the OFS test does.
  - Add a REF base that is loose, and one in a second pack.

**Finding 2 — the guards on the header path are untested** (note)
- What survives: [Observed] R2, R4 and R5 all survive.
  - R2 removes the delta-chain depth check in `packedHeaderType`.
  - R4 removes the 1024-stored-byte cap on the loose header read.
  - R5 removes the 32-byte header-length cap before a NUL.
- Why it is only a note: [Inferred] each of these still terminates.
  - The per-call `callObjects` budget bounds a REF cycle (default 1,000,000).
  - The 64 KiB `maxOutputLength` and `callBytes` bound the loose loop.
  - Without the caps, though, a crafted object costs more work before it refuses, and the docstring's "well under a kilobyte" claim is pinned by no test.
- Cheap fixtures would pin all three:
  - a REF cycle;
  - a loose object whose inflated prefix is longer than 32 bytes with no NUL;
  - a stored stream longer than 1024 bytes with no header end.

**Finding 3 — the launch-level fixture cannot tell a header read from a full read** (note)
- Why: [Inferred] `isCommit` catches every error and returns `false`.
  - Suppose `storedType` inflated the whole garbage-tailed object and threw `corrupt-object`.
  - The launch would then refuse with the same reason, and the call log would still read `[storedType <id>]`.
- What actually proves it: in `launch.test.ts`, M6 is killed only by the call log, not by the garbage tail. The proof that no body is read is the reader-level test `a loose tag or blob whose body cannot inflate past its header…`, which asserts `'tag'`/`'blob'` rather than a refusal.
- Recommendation:
  - Either assert in the launch test that the reader answered rather than refused, for example through a wrapped `storedType` that records its resolved value;
  - or say in the test comment that the reader test carries the proof.

**Finding 4 — what the garbage-tail fixtures prove, and what they do not** (note)
- What they prove: [Observed, by reading the code; Inferred about zlib behaviour] a `0xff` byte after the sync-flushed header is a deflate block header with BTYPE=11, which is reserved.
  - Any inflate that includes the first garbage byte throws.
  - So both the loose and the packed fixtures prove the reader stops before the first stored byte past the header's stream.
- What they do not cover: in a real object the header and the first body literals share stored bytes.
  - The last inflate step can decode some body bytes into memory before they are discarded.
  - For a tiny blob that can be the whole body.
  - The JSDoc states this ("discarded unread"), and the budget test bounds it to 64 bytes for `BIG2`.
- Whether "SHALL read no blob" (spec line 9) and the registry's "never read" allow decoding a few body bytes that are discarded unused is a judgment about the text, not about the code. [Inferred]

**Finding 5 — reading a tag's or blob's header is itself outside the spec's pre-answer read list** (note)
- What line 9 lists: [Observed] before the answer Syzygy may read "the clone's references; the pinned commit object …; and the tree objects reachable from that root tree", and "SHALL read no blob".
- What the PR reads: a header-only read still opens and inflates up to 1024 stored bytes of a candidate tag or blob, and 32 bytes of a pack entry header.
- Assessment: [Inferred] the PR greatly reduces the conflict but does not remove it.
  - Any type test on an object the operator names must touch that object, and the bead's own repair prescribes a header read.
  - So this needs no code change. The residual should be disclosed, or put to the owner, rather than described as "no body bytes".
- The bead notes that #812's v1.2 text decides the type differently; check whichever version is in force when this merges.

**Finding 6 — `isCommit` on the commit path stays within line 9** (note)
- [Observed] Once `storedType` returns `'commit'`, `tree()` goes through `Walk.readRoot`:
  - `store.verified(revision, 'commit')` inflates the commit object and re-hashes it;
  - it uses only the `^tree <id>\n` line.
- No tree object or blob is read. Line 9 permits reading the commit object and restricts what is *used*, so this conforms. [Inferred]
- A lying header is safe. [Inferred]
  - A header that wrongly says `commit` fails the re-hash in `verified` (`identifier-mismatch`), so the answer is not acted on.
  - A header that wrongly says non-commit fails closed (`false`).
- Header and body readers resolve objects in the same order. [Observed]
  - Top level: loose objects first, then packs (`headerType` and `raw` agree).
  - REF base: packs first, then loose (`packedHeaderType` and `rawForDelta` agree).

**Finding 7 — the code terminates and stays bounded on every path I traced** (note)
- Loose header loop: [Inferred]
  - It reads at most 1024 stored bytes, 64 at a time.
  - Every intermediate inflate either yields 32 bytes or fewer, or ends the loop.
  - The final step is capped at 64 KiB by `maxOutputLength`; going over throws, which becomes `corrupt-object`.
  - A header split across 64-byte reads is handled, because each new stored byte re-inflates the whole prefix.
- Packed path:
  - Header bytes: `next()` reads at most 32 bytes, shared by the size varint and the OFS varint.
  - OFS: a base must lie strictly backward (`back > 0`), so the chain cannot cycle.
  - OFS offset: a varint that overflows to a float is still caught by `back > offset - 12`.
  - REF: cycles are bounded by `chainDepth` (1,000) and the `callObjects` budget.
- Charging: [Observed] pack entry header bytes are counted per object but not charged to `callBytes`. This is consistent with `packed`'s own header read.

**Finding 8 — the mutation evidence record is complete** (note)
- Per mutant it gives: [Observed]
  - `file`, `old` and `new` text;
  - exit code and outcome;
  - the vitest summary lines.
- It also gives `ranAt` 7822a01c, which is an ancestor of 69d96fcf, and the four subject sha256 digests. All four match the files at the head.
- At the head, all seven mutants re-ran KILLED, matching the record.
- Gap: it holds no mutant against the REF_DELTA branch or the three guards; see Findings 1 and 2.

**Finding 9 — the tests use literal expected values and an independent oracle** (note)
- [Observed] Expected values are literals: `TAG`, `BIG2_ID`, the type strings, and the refusal messages.
- The delta and base pair is derived by `git verify-pack -v`, which inspects the fixture independently of the code under test. That is an acceptable oracle.
