# R-GP-IMPL-LAUNCH-FORM-TARGET-CTIME-1 — CC-REV-1 implementation review of syzygy-bpyt.8.33, round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: d1742589
Subject: r1-review.diff sha256 c0148ad4af5f99df67c9b5c0f86a08eb5e2c805d7179f88921d7f13a9d0ac668

Reviewer: an independent fresh-context session (Claude Opus 5.5), 2026-10-25. I did not write this change and did not edit it. I
fetched no observed-repository content, opened no credential file, edited no worktree under `.worktrees/`, and did not push,
comment or merge. Four notes, no blocking finding.

## 1. Subject identity checks

1. [Observed] `sha256sum r1-review.diff` gave `c0148ad4af5f99df67c9b5c0f86a08eb5e2c805d7179f88921d7f13a9d0ac668`, which matches
   the brief.
2. [Observed] In a fresh clone of the repository, after fetching `agent/syzygy-bpyt.8.33` and checking out `d1742589`,
   `git diff df6046a1 d1742589 | sha256sum` gave the same digest. `git diff --stat` reported "10 files changed, 9176
   insertions(+), 3 deletions(-)": `packages/polaris-dossier/src/launched.test.ts` +6/−3 and 9 new files under
   `docs/evidence/launch-form-target-ctime-2026-10-25/`.
3. [Observed] The PR has three commits over the base: `27613ef9` (the test), `fbe03e30` (the harness) and `d1742589` (the
   records). `gh pr view 523` gives `headRefOid` `d17425890c0b5211714fce1be90b32a90b5f7747`, the reviewed commit. Its two checks
   read "checks SUCCESS COMPLETED" and "node SUCCESS COMPLETED".
4. [Observed] `launched.test.ts` has blob `81600a9a0a13…` at `27613ef9`, `fbe03e30` and `d1742589`, and `7902d838…` at the base.
   `launched.ts` has blob `8012623e69…` at the base and at all three commits. Its sha256 is
   `c7a25b8b45fe12e2add7874f88d46b2bad1eef16ffa4a17e2464d5c671424921` at both ends.
5. [Observed] `tools/check_record.py` checks the two rule-6 records, the field-diff record and its four outputs against the git
   objects at `d1742589`. Result: "TALLY 164 OK, 0 FAIL, 164 checks". §3 item 2 lists what it checks.
6. [Observed] The PR body carries five full digests. Each matches the file at `d1742589`:
   - `mutants-tmpfs.json` `3e583fa8…`;
   - `mutants-ext4.json` `0305c691…`;
   - `field-diff.json` `86ed6542…`;
   - `mutants.py` `ea5c6fdd…`;
   - `launched.ts` `c7a25b8b…`.

## 2. Clauses relied on, and class ruling

**CC-REV-1** (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md:16-58`):
- "Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the agent performing the
  change never finally decides which classes it touches."
- Class 4: "**security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
- Class 3: "**deterministic observation** — snapshot composition, evaluation identity, the deterministic/inferred seam (VIS-7);"
- "**A reviewer or the owner** may reclassify at any time."

**The reader's tie to SEC-3** (`packages/polaris-dossier/src/launched.ts:34-35`): "No caller may treat `unreadable` more leniently
than `launched`: whether Syzygy started the run's sessions cannot be told, so SEC-3's instruction is never given and no launch form
counts."

**GP-Q0** (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md:44-71`):
- Which pull requests get the extra checks: "pull requests touching class 1 (authority boundaries), class 3 (deterministic
  observation) or class 4 (security), and class-6 pull requests that remove an endpoint."
- The checks: "an old-versus-new differential over a mutated-record corpus that includes records with altered prose"; "a rule-6
  mutant for each predicate"; "a non-blocking owner notice in the cycle report."
- What must not change: "a rendered byte, a wire format, a refusal string or an exit code"; "a signed or digest-bound artifact";
  "a consent, security or retention decision."

**AGENTS.md at `d1742589`:**
- Rule 6: "Mutate the input and confirm the check fails, per predicate, before trusting it (`--selftest` holds the fixtures)."
- Rule 11: "An evidence record names its subject and the subject's digest; a record that names neither cannot be re-checked
  against the bytes it describes."
- Guardrail: "A rule-6 evidence record must store each mutant's `old`/`new` fragment and the commit it ran at; ids and outcomes
  alone are not re-runnable".

**Class ruling: class 4, matching the declaration.**
- The 17 rows of `PRESENT_BUT_NOT_THE_MARKER` (`launched.test.ts:52-70`), asked at `:133-152`, are the rule-6 kill evidence that
  `launchFormRefusal` counts no launch form while the marker is unreadable. That is the fail-closed reading `launched.ts:34-35`
  ties to SEC-3. A change to what those rows can kill touches the evidence for a class-4 control, though no product byte changes.
- Not class 3 [Inferred]. Class 3's "snapshot composition" names Syzygy's observation snapshots. `markerSnapshot` is a test
  helper that composes nothing the product emits or evaluates.
- No other class: no endpoint, identity, migration or authority table is touched.

**GP-Q0's three checks for class 4:**
- **Differential.** Degenerate. `launched.ts` is byte-identical at base and head (§1 item 4), so any old-versus-new differential
  over marker records is identical by construction. That includes the 17 plants, whose prose is altered: invalid JSON, another
  format, a BOM, and so on. The stand-in is the old test against the new test over one mutant corpus at base and at fix:
  - the PR's 21 mutants, on tmpfs and ext4;
  - my reproductions, and my 9 mutants X1–X5 (§3 items 4–6).
  Met.
- **A rule-6 mutant per predicate.** The change adds one predicate, `targetCtimeNs` (`launched.test.ts:45,48`). It is killed at
  the fix and survives at base, in every run on both file systems, by O8, O1 (link row), X1, X2 and X5. Met.
- **Owner notice.** Not yet posted [Observed]. `bd comments syzygy-bpyt.10` has one line naming 8.33, and it is the #519 notice
  that filed this bead ("filed as syzygy-bpyt.8.33"). It is due at landing, from the coordinator. Pending.
- **What a gate accepts or refuses:** nothing changes. Reader bytes, refusal strings and test titles are identical (§5).

## 3. What I ran and the results

All runs used kernel `7.0.0-38-generic` (CONFIG_HZ=1000), Node `v24.6.0`, uid 1000, umask 022, and 12 CPUs.

**Private TMPDIRs.**
- tmpfs: under `/tmp/r523-*`; `stat -f` prints "tmpfs".
- ext4: under `/var/tmp/r523-ext4/*`; `stat -f` prints "ext2/ext3" and `df --output=fstype` prints "ext4".

Each result file stores the kernel and both file-system strings. Host load1 ran from 12.4 to 30.0 throughout.

1. **Identity**: §1.
2. **Record check** (`tools/check_record.py`; output `check-record-result.txt`): "TALLY 164 OK, 0 FAIL, 164 checks". [Observed]
   - **Commits.** Each record's `base` is the full base sha, and its `commit` `fbe03e30` is an ancestor of the head. The test and
     reader bytes at `fbe03e30` equal the head's.
   - **Test digests.** `testSha256.base` = sha256 of the base's test file, `73fd8fe0c835…`. That equals the 8.30 record's
     `testSha256.fix`, so "which is the #519 fix" holds. `testSha256.fix` = sha256 of the head's test file, `5dd0d6c74f5c…`.
   - **Diff digest.** `diffSha256` `16bd82a8…` = `git diff base fbe03e30 -- packages` = `git diff base d1742589 -- packages`.
   - **Harness.** `harnessSha256` = `mutants.py` at the head, and `mutants.py` is unchanged from `fbe03e30`.
   - **Sources.** Both `fragmentsFrom` digests match their git objects.
   - **Environment.** Kernel and TMPDIR file system are stored, and `trackedTreeCleanAfter` is true. The unmutated base and fix
     pass 43/43 on both sides, on both file systems.
   - **Population.** 21 mutant ids × 2 sides = 42 runs per file system.
   - **Per mutant run, 84 of 84 OK.** For each run:
     - each stored `old` occurs exactly once in its side's file;
     - each stored edit equals its source record's edit (the 8.30 record's fix-side edit, or the #519 review's head-side edit);
     - `failedRows` re-derives from `failedTests`;
     - `outcome` agrees with the exit code and the failed tests;
     - the counts sum to 43, `restored` is true and `blocked` is false.
   - **Against the 8.30 record.** All 13 of its mutants, ×2 file systems, give a fix-side row set equal to the 8.30 record's fix
     rows: a superset, none added.
   - **Repeats.** 20/20 sequential and 12/12 parallel runs at 43/43 on each file system.
   - **Field diff.** `field-diff.json`'s test digest and tool digest match. Each of the four outputs matches its stored digest and
     holds the link row's failure block exactly once. Every `+`/`-` line in that block names `targetCtimeNs` only, 2 lines per
     output. My regex catches any quoted key, not only the seven fields.
   - **Self-test** (rule 6, `check-record-selftest.txt`). I committed five mutations of the record and one of a field-diff
     output in a throwaway clone, locally only, and ran the checker on that commit. It gave "TALLY 156 OK, 8 FAIL, 164 checks".
     It failed on: the subject digest; "kernel stored"; O1's altered `old`, with once=False and src=False; D4's dropped row,
     twice; O8's flipped outcome; the field-diff digest; and the added `"mode"` line ("fields=['mode', 'targetCtimeNs']").
3. **PR body tables against the record.** [Observed] Every cell matches the script's per-mutant table, on both file systems.
   - The unmutated base and fix pass 43/43.
   - **O8:** base survived, 43/43; fix killed on 1 row, the link row.
   - **O1:** base killed on 10 rows, with the link row passing; fix killed on 11, with the link row failing.
   - **O2–O6:** fix rows equal base rows, at 11, 11, 12, 1 and 14. The link row is false on both sides.
   - **Killed on 17 rows each, both sides:** O7, D1 ×5, D3 and T.
   - **D4:** 11 rows on each side. **R-chmod-cycle-rewrite:** 1 row each.
   - **R-same-size-rewrite, R-fill-dangling-target, R-fifo-to-empty-file:** 10, 1 and 2 rows on each side.
   - **M:** survived on both sides.
   - **Totals:** 19 of 21 ids have identical row sets at base and fix. The 2 that differ are O1 and O8, each gaining only the
     link row.
   - **Load.** The record's sequential `loadBefore` runs 15.51–17.06 on tmpfs and 18.51–20.39 on ext4. Parallel `after` reads
     17.4 and 22.98. Both match the body.
4. **Recorded mutants reproduced** (`tools/rev523_mutants.py`, `rev523-mutants-{tmpfs,ext4}.json`). The fragments come from the
   PR's record at `d1742589`, read from the git object. The tool ran 3 times per side per file system. [Observed]

   | Mutant | Base, tmpfs and ext4 | Fix, tmpfs and ext4 |
   |---|---|---|
   | unmutated | 43/43, 6 of 6 runs | 43/43, 6 of 6 runs |
   | O1-same-bytes-rewrite | killed, 10 rows, link row passes, 6 of 6 | killed, 11 rows, link row fails, 6 of 6 |
   | O8-link-target-chmod-cycle-rewrite | survived, 43/43, 6 of 6 | killed, 1 row (the link row), 6 of 6 |
   | R-chmod-cycle-rewrite | killed, 1 row, 6 of 6 | killed, 1 row (`a file its reader may not read`), 6 of 6 |

5. **My mutants.** All are written at the same anchor in `launched.ts`, the `unreadable` branch, and each fragment is stored in
   the result files. [Observed]

   | Mutant (what the reader does) | Base | Fix |
   |---|---|---|
   | X1: chmod-cycle the link's target, then `utimes` its atime and mtime back | survived 6/6 | killed, link row, 6/6 |
   | X2: rename the target away and back | survived 6/6 | killed, link row, 6/6 |
   | X3: replace the target with a byte-identical copy, same mode (`realpathSync`, write tmp, rename over) | survived 6/6 | killed, link row, 6/6 |
   | X3b: as X3, copy at mode 0644 | survived 6/6 | killed, link row, 6/6 |
   | X4: retarget the link to a byte-identical copy at another path | killed, link row, 6/6 | killed, link row, 6/6 |
   | X4b: recreate the link with the same target string | killed, 3 rows, 6/6 | killed, 3 rows, 6/6 |
   | X5: unlink the target, then write a new file of the same bytes and mode at its path | survived 20/20 | killed, link row, 20/20 |

6. **The survivor: X3 without `realpathSync`.** In X3c and X3d the target's path is read with `readlinkSync`. So no directory is
   `lstat`ed, which `realpathSync` does on the way. X3c's copy keeps the mode; X3d's keeps the default, 0644 under umask 022.
   [Observed]
   - tmpfs (`rev523-x3c-tmpfs.json`): X3c and X3d both survive the base 10/10 and are killed at the fix 10/10, on the link row.
   - ext4, two batches (`rev523-x3c-ext4.json`, `rev523-x3c-ext4-2.json`):
     - X3c at the fix: **survived 8 of 10 and 9 of 15, so 17 of 25.**
     - X3d at the fix: survived 0 of 10 and 8 of 15. With the default reporter (`tools/field_diff_own.py`, `fd-X3d-ext4*.txt`)
       it survived 5 of 7 more runs.
     - Both survive the base 25 of 25.
   - In the two killed default-reporter runs, the only `+`/`-` lines are `targetCtimeNs`. For example:
     - `-   "targetCtimeNs": 1792861245424667133n,`
     - `+   "targetCtimeNs": 1792861245424857033n,`
   - **Probe** (`tools/replace_probe.mjs`, 2,000 rounds per form). It plants the link row's shape, takes the snapshot's calls,
     replaces the target as X3c does, and compares. Its JSON key `kernel` holds `process.platform` only; the kernel is as above.
     - tmpfs: `"equalTargetCtime":0` in both forms, `asTest` and `tight`.
     - ext4: `"equalTargetCtime":1687` (`asTest`) and `1746` (`tight`).
     - `"targetInoChanged":2000` in every form on both file systems.
     - Plant to replacement: a median of 102,023 / 62,719 ns on tmpfs and 179,028 / 156,144 ns on ext4.
7. **Faithful asks** (`tools/faithful_probe.mjs`, `faithful-probe-{tmpfs,ext4}.json`). The probe:
   - uses the 17 plants copied from `:52-70`;
   - uses `markerSnapshot` copied verbatim from `:38-50`;
   - asks the unmutated `launched.ts` at `d1742589`, compiled to a scratch build;
   - runs 300 rounds per plant, cycling the three forms.

   [Observed] On each file system:
   - 5,100 asks, with 0 rounds differing in any field and 0 rounds not `unreadable`;
   - `targetCtimeNs` non-null on `a symbolic link to the marker Syzygy writes` 300 of 300, and null on every round of the other
     16 plants.

   Self-test with `--selftest`, which chmod-cycles a linked regular-file target between the snapshots:
   `{'a symbolic link to the marker Syzygy writes': {'targetCtimeNs': 50}}` of 50 rounds.
8. **Shapes no row plants** (`tools/snapshot_shapes.mjs`, `snapshot-shapes-{tmpfs,ext4}.jsonl`). It runs the base and fix helper
   on each shape. [Observed] Same results on both file systems:
   - A link to a directory gives `null`.
   - A link to a FIFO holding 5 bytes gives `null`, and `"fixFifoBytesLeftAfterSnapshot":"bytes"`, so the pipe is not drained.
   - A link to a link to a file gives a number.
   - A link loop gives `{"threw":"ELOOP"}` at base and at fix.
   - A link into an unsearchable directory gives `{"threw":"EACCES"}` at base and at fix.

   So the new line adds no throw the old helper's `:42` `statSync` did not already raise.
9. **What moves a regular file's change time after a query** (`tools/comment_probe.py`, 500 rounds per kind per file system,
   `comment-probe-{tmpfs,ext4}.json`). The kinds act on the file itself, not through a link. [Observed] Identical on tmpfs and
   ext4. Rounds that left `st_ctime_ns` unchanged:
   - read (control): 500;
   - `write(2)` of zero bytes: **500**;
   - `write(2)` of the same 2 bytes: 0;
   - `truncate(2)` by path to the current size: 0;
   - `ftruncate(2)` to the current size: 0;
   - chmod to the current mode: 0;
   - `rename(2)` onto its own name: **500**;
   - rename away and back: 0;
   - `link(2)` then unlink: 0.
10. **Determinism of the unmutated file** (`rev523-repeat-{tmpfs,ext4}.json`, `rev523-parallel-{tmpfs,ext4}.json`). [Observed]
    - 12 sequential runs per side per file system: 48 of 48 at 43/43, load1 14.75–16.07.
    - 10 runs at once of the fix per file system: 10/10 and 10/10 at 43/43, with load1 22.92 before the ext4 batch and 29.97
      after it.
    - The other unmutated fix runs also passed 43/43: 3 per file system in item 4, the project run and one smoke run.
11. **`@syzygy/polaris-dossier` project** (TMPDIR on tmpfs): "Test Files  31 passed (31)" and "Tests  1233 passed | 1 skipped
    (1234)". [Observed] The one skip is in `no-egress.test.ts`.
12. **`npm run typecheck`** exits 0. [Observed]
13. **`python3 scripts/check_governance.py`** gives "32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted", at the
    head and at the base. [Observed] The differing lines are file counts only:
    - scope: 3687 → 3696 tracked;
    - CG-2a: 2157 → 2163 files;
    - CG-3: 1869 → 1873 files.
    That is the 9 new evidence files.
14. **`python3 scripts/check_quotations.py`** exits 0. [Observed]
15. **Titles** (`list-base.txt`, `list-fix.txt`). [Observed]
    - `vitest list` of the file gives 43 lines at each side, byte-identical, sha256 `9b74a21e…` for both.
    - Of the 9 changed lines under `packages/`, 0 carry `it(`, `it.each(`, `describe(`, `test(` or `skipIf`.
    - `git diff --quiet df6046a1 d1742589 -- . ':(exclude)docs/evidence' ':(exclude)packages/polaris-dossier/src/launched.test.ts'`
      exits 0. The changed paths are 1 outside the new evidence directory, the test file.
16. **Not run:** the PROJECT-STATUS canonical battery. The PR's `commands=110 nonzero=0` is lane-reported, and I have not
    reproduced it.

## 4. Findings

None blocking.

### N1 — note, low. Replacing a link's target at its own path with a byte-identical copy survives the fix on ext4 in most runs; the residuals do not name it

- **Evidence.**
  - [Observed] `markerSnapshot` compares a link's target only by its bytes (`:42-43`) and its change time (`:45,48`). It does not
    compare the target's inode or mode.
  - [Observed] Take X3c: the reader writes `${target}.tmp` with the same bytes and mode and renames it over the target. With
    TMPDIR on this host's ext4 it survives the fix in 17 of 25 runs. X3d, whose copy keeps mode 0644, survives in 8 of 25 JSON
    runs and 5 of 7 default-reporter runs.
  - After X3d, the target's mode stays changed [Inferred: from umask 022]. Its inode number always changes: "targetInoChanged"
    2000 of 2000 (§3 item 6).
  - Both mutants survive the base in every run, so this is not a regression. The fix is stronger than the base on every mutant
    I ran.
  - On tmpfs both are killed in 10 of 10 runs, and the probe never kept the change time: 0 of 2,000. On ext4 the probe kept it in
    1,687 and 1,746 of 2,000.
  - [Inferred: from the kernel's multigrain-timestamp design, not checked against source] Why the file systems differ:
    - The copy is a new inode no one has queried, so it gets the coarse stamp, the same one the plant's target got within a 1 ms
      tick.
    - ext4 stamps the moved copy before it fine-stamps the queried old target that the rename unlinks. tmpfs unlinks the old
      target first, and that fine stamp raises the floor the copy is then stamped from.
    - X3 and X3b are killed every run on ext4 too. Their `realpathSync` `lstat`s the target's directory, so creating the copy
      there hands out a fine stamp first. That makes the kill an artefact of those mutants.
  - [Observed] X5, which unlinks the target before writing the new file, is killed at the fix 20 of 20 on both file systems.
  - The in-place changes are killed in every run on both file systems: O1, O8, X1 and X2. The brief asks for any in-place change
    to a link's target that still passes. I found none that changes anything [Observed for these four].
    - The only in-place calls that left the change time unchanged are N3's two no-ops, which change nothing. They were probed on
      a file directly; through a link they reach the same inode [Inferred].
    - The survivors are replacements by a new inode, X3c and X3d, on ext4.
  - The PR body's residuals name coarse timestamps, non-regular targets and the drained pipe, and not this.
  - `:137-139` still says "a reader that removes, replaces or truncates an unreadable marker cannot pass here". For the link row,
    a reader that replaces what the link leads to can pass.
  - Not fail-open. The reader opens with `O_NOFOLLOW` (`launched.ts:48`), and every row still asserts `unreadable` (`:145`).
- **Failure scenario.** A reader mutation follows the link and "repairs" the target with an atomic write: a temporary file of the
  same bytes, renamed over the target. That is the common write pattern, and the atomic sibling of O1. On a developer's ext4
  TMPDIR it passes all 17 rows in most runs. X3d also passes while leaving the target's mode changed. The PR's outcome sentence
  reads as though a target changed and kept at its bytes now fails the row.
- **Proposed fix.** Test-only, no title change, class 4 by the same ruling. Either:
  - (a) In `markerSnapshot` (`launched.test.ts:46-49`), beside `targetCtimeNs`, add
    `targetIno: followed?.isFile() ? followed.ino : null, targetMode: followed?.isFile() ? followed.mode : null`.
    - [Inferred] A rename-over allocates the copy while the old target is still linked, so its inode number differs on any file
      system. A changed mode shows directly. So the kill does not depend on timestamps.
    - The 16 other plants still give `null`. [Inferred] Neither field can move on a faithful ask, because the reader never opens
      the target. §3 item 7's 0 of 5,100 covers the `lstat` fields and `targetCtimeNs`, not these two, so run the faithful probe
      again with them added.
    - Re-run X3c, X3d and X5 with `tools/rev523_mutants.py`, at base and fix on ext4. Expect X3c and X3d killed in every fix run.
  - (b) Name the residual at `:137-139` and in the dispositions record: "a link's target is compared by its bytes and change
    time only, not by its inode or mode, so a reader that replaces the target with a new file of the same bytes passes wherever
    the file system stamps the new file with the old one's change time (this host's ext4: X3c survived 17 of 25 runs)."

### N2 — note, low (evidence precision). The coarse-timestamp residual is less precise than the #519 dispositions' restatement of N3

- **Evidence.**
  - [Observed] The PR body says: "[Inferred] On a kernel or file system with coarse timestamps, an in-place change to the target
    within one tick could leave `targetCtimeNs` unchanged, which weakens the kill."
  - The #519 dispositions (`docs/evidence/launch-form-ctime-round-1-dispositions-2026-10-24.md:117-134`) have already corrected
    "could" for the marker's own change time: "the change-time kill is deterministic only where the kernel and file system give
    multigrain timestamps (as on this host, kernel `7.0.0-38-generic`, tmpfs and ext4); elsewhere it holds only for a change that
    crosses a clock tick, which R-chmod-cycle-rewrite's usually does not."
  - The same holds for the target [Inferred]. The snapshot's own stat through the link marks the target's change time as queried.
    Node's `statSync` asks the kernel for it, and so did the old `:42` call and `readFileSync`, before this change.
  - [Observed] So on this host every in-place change is killed in every run: O1, O8, X1 and X2, 6 of 6 each. That covers O8's
    chmod-cycle, whose changes land within microseconds of the plant.
  - The nondeterminism this host does show is X3c's, a replacement (N1), which multigrain does not cover.
- **Failure scenario.** The record is re-run on a kernel or file system without multigrain timestamps. O8 survives at the fix in
  most runs, which looks like a regression of this change when it is the environment. Meanwhile the one survivor on this host
  (N1) is filed under "coarse timestamps", where it does not belong.
- **Proposed fix.** No code. In the dispositions record, restate the residual: "The target change-time kill of an in-place change
  (O1, O8) is deterministic only where the kernel and file system give multigrain timestamps (as on this host, kernel
  `7.0.0-38-generic`, tmpfs and ext4), because the snapshot's own stat queries the target's change time; elsewhere it holds only
  for a change that crosses a clock tick, which O8's chmod-cycle usually does not. A replacement of the target by a new file is
  not covered by that guarantee even here (N1)." A re-run elsewhere should store the kernel and file system beside O8's outcome.
  The #519 `tools/coarse_proxy.mjs` can serve as the environment check.

### N3 — note, informational. The new comment's "any write … or rename … moves the change time" has two no-op counterexamples

- **Evidence.**
  - [Observed] `launched.test.ts:36-37` says "any write, truncate, chmod, rename or link of the marker moves the change time,
    even one that puts back what it changed". That is the #519 raw's proposed text, verbatim.
  - The comment holds against O6 (chmod to the current mode: 14 rows killed), O7 (rename away and back: 17) and D4-truncate
    (truncate an empty file to 0: 11, including `an empty file`). The probe agrees for every truncate, chmod, rename-away and link
    kind (0 of 500 unchanged).
  - Two calls the sentence covers left the change time unchanged in 500 of 500 rounds on each file system (§3 item 9):
    - a `write(2)` of zero bytes;
    - a `rename(2)` of the file onto its own name.
  - Both leave the inode untouched, so no test outcome depends on them and nothing fails open.
  - The sentence "a read moves only the access time" holds: 500 of 500 reads left the change time unchanged.
- **Failure scenario.** Someone adds a mutant for a zero-byte write or a self-rename, expects the comment's kill, sees it survive,
  and suspects the snapshot. Low consequence.
- **Proposed fix.** Optional, only when the file is next edited (for example by N1's follow-up): "any write of at least one byte,
  truncate, chmod, rename to another name or link of the marker moves the change time, even one that puts back what it changed."
  Not worth a change by itself.

### N4 — note, informational. Four precision points in the PR body and the records

- **Evidence.** [Observed]
  - (a) The body describes the new call as `followed = fs.statSync(marker, { bigint: true })`. The code at `:45` also passes
    `throwIfNoEntry: false`. That option is what makes the dangling-link row give `null` instead of throwing. The code is right;
    the summary omits it.
  - (b) The body and AC1 cite `:134-136` for the `asked` comment. At the fix it sits at `:137-139`, three lines down, with its
    bytes unchanged.
  - (c) The ext4 record stores the TMPDIR file system as `stat -f` prints it, "ext2/ext3". "ext4" appears only in the PR body,
    from `df -T`.
  - (d) `field-diff.json`'s `tmpdir.filesystem`, `kernel` and `reading` fields are not printed by `field_diff.py`. That tool
    prints only `mutant`, `exit`, `restored` and `linkRowDiffLines`, so those fields were added outside the tool. The retained
    outputs each carry their TMPDIR path, `/tmp/la-b833/fd` or `/var/tmp/la-b833/fd`, which corroborates them on this host.
- **Failure scenario.** A later reader re-checking the record cannot tell ext4 from ext2/ext3 from the record alone, or cannot
  regenerate `field-diff.json`'s environment fields from its tool. Rule 11 is otherwise met: the subject and its digest are named.
- **Proposed fix.** None for this PR. For future harnesses, store `df --output=fstype` beside `stat -f -c %T`, and have the
  field-diff tool emit its own environment fields. This review's `rev523_mutants.py` does both.

## 5. Every changed output

None. [Observed]
- `launched.ts` is byte-identical at base and head (sha256 `c7a25b8b…`). So `launchedMarkerState` and `launchFormRefusal` accept
  and refuse exactly what they did, with the same refusal strings.
- Outside `docs/evidence/` and the test file, `git diff --quiet` exits 0.
- No test title changed. The `vitest list` outputs at base and fix are byte-identical, 43 tests each.
- The governance check's verdict lines are unchanged; only its file counts move, by the 9 new evidence files (§3 item 13).
- The test file's own change is to the helper and its comment (`:34-37`, `:45`, `:48`). The link row asserts more through the
  helper. Tests: +0 ~0 −0.

## 6. Verdict per acceptance criterion

- **AC1: met, with N3.**
  - `:34-37` carries the #519 raw's sentence verbatim (script-checked, whitespace-normalised), and names the new field in the
    first sentence. That addition is sound.
  - The `asked` comment, base `:134-136` and now `:137-139`, is unchanged.
- **AC2: met.**
  - `markerSnapshot` carries the followed target's change time for a link to a regular file. It gives `null` otherwise: on 16 of
    17 plants, and on a link to a directory or to a FIFO. A link loop and an unsearchable path throw as they did at base.
  - Titles are unchanged.
  - The unmutated file passes 43/43 in at least 10 repeated runs under load. The PR shows 20 sequential and 12 parallel runs per
    file system. I ran 12 sequential and 10 parallel runs of the fix per file system, all 43/43.
- **AC3: met.**
  - The record ran at `fbe03e30`, whose test bytes equal the head's. It stores each mutant's `old`/`new`, the kernel and the
    TMPDIR file system (N4 c).
  - O8 and O1 survive at base and are killed at the fix on the link row. I reproduced both, 3 runs per side per file system.
  - R-chmod-cycle-rewrite, D1 ×5, D3, D4 and T are unchanged: equal row sets on both file systems, and I reproduced
    R-chmod-cycle-rewrite at the fix.
- **AC4: met for the review** (this raw). The owner notice on `syzygy-bpyt.10` is still to post at landing.

## 7. Test quality (test-rigor bar)

- **Bar 1 (behavior, not implementation): holds.** The snapshot pins observable file-system state before and after each ask, and
  never spies on which calls the reader makes. A faithful refactor of the reader cannot fail it: 0 of 5,100 faithful asks
  differed per file system.
- **Bar 4 (no tautologies): holds.** The refusal string is a literal, and the snapshot is computed independently of the reader.
- **Bar 5 (mocks at the boundary): holds.** The rows use the real file system. The `patchFs` rows (`:112-130`) are untouched.
- **Bar 6 (deterministic): holds.**
  - [Observed] 0 differing fields over 10,200 faithful asks on tmpfs and ext4.
  - Every unmutated run passed: 48 sequential and 20 parallel runs in §3 item 10, 6 in item 4, the project run and a smoke run.
    The record's 64 runs passed too.
  - [Inferred] A faithful ask cannot move the target's change time at any timestamp granularity. The reader never opens the
    target (`O_NOFOLLOW`), and the snapshot's own stat and read are read-only.
- **Bar 7 (failure names the defect): holds.** With the default reporter, the failure diff names the field (`targetCtimeNs`). The
  JSON reporter's first line truncates it, for example "AssertionError: expected { mode: 41471n, ino: 3043819n, …(5) } to deeply
  equal { mode: 41471n, ino: 3043819n, …(5) }" (`rev523-x3c-ext4.json`, X3c fix run 5). Only the default reporter expands it.
- **Bar 10 (growth): holds.** The net test delta is +0 ~0 −0, and the change extends the nearest existing helper.
- **Mutation thought experiment.** The plausible bug these rows would not catch is N1's atomic rewrite of a linked target. On
  this host's ext4 it is caught in about a third of runs. Option (a) closes it without timestamps.

## 8. Cleanup

**Deleted** [Observed: `ls -d /tmp/r523* /var/tmp/r523*` reports "No such file or directory" for both]:
- the scratch clone, both times it existed;
- the self-test clone, with its local-only commit `2c8786cf`;
- the scratch build of `launched.ts`;
- every TMPDIR I made: `/tmp/r523-{t,probe,rp,fp,shapes,par,proj,list,x5}` and `/var/tmp/r523-ext4` with all its
  subdirectories.

I deleted nothing else in `/tmp` or `/var/tmp`, and killed no process by name or pattern. Timeouts were per run, on each run's
own process group, and none fired.

**Kept**, under `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-523/`.

Tools (`tools/`), sha256:
- `check_record.py` `f22de4b13b78cc90d9cf2c98fe59c45e09c4dba8a0ddb27807d5febe0a7e8c55`
- `rev523_mutants.py` `b538ba21cb9f29d4795921d862200c07c769f4c4643480982594625f3cc86c96`. This is the final version, with every
  fragment used. `rev523-mutants-tmpfs.json` ran at `0894f493…`, before X3c, X3d and X5 were added. The ext4, X3c and repeat
  results ran at `1b37695c…`, before X5. Each result stores its own `toolSha256` and every run's fragments.
- `field_diff_own.py` `ceb966f199b519cf40b62bccb6ec395252a4e51576ae15252972359111b53ceb`
- `replace_probe.mjs` `9b96561eeb6a95edbb77586a8cb759578855230c6ad8234decce6460b5dfa5dc`
- `faithful_probe.mjs` `e8c9a2c5f54f8a33a38a018e98f6a836052e287a4793f816d2c6b6ee08a21ca6`
- `snapshot_shapes.mjs` `1e01cb43c9db840a28a6a61beb2e06886d22615b94737123ca9c998bdb1646d2`
- `comment_probe.py` `3dc960acd0edb3c8d943012524b9cfc89a556d326da298d99f3c76c36b64667f`
- `parallel_unmutated.py` `14d5e743a99fe2f66710b15341a3a9282fa5476421e15431d7bcf771cbf466f0`

Results, sha256 of each:
- `check-record-result.txt` `5578693743a6fa3a3ffb8889060ef9f3b07370d21b35af26ee62ef61f10556ed`
- `check-record-selftest.txt` `861569eb9e984ffb414604ca54653311caeb7da392483728aee3b2de3100647c`
- `rev523-mutants-tmpfs.json` `6f8a487bb8a14c0ab82993f4b5850678d0cdcf11a3d733c3eee15c4f4924d45b`
- `rev523-mutants-ext4.json` `33db35a8c84ee281e55f9e5deb921ce9dde0d27bf7fd58e84f6cd015a1766cd7`
- `rev523-x3c-tmpfs.json` `14efae63751d3b612a7ef45feb08e432ed49607f54188ccc4b4b6d60f415ccca`
- `rev523-x3c-ext4.json` `0d8bc19d54789253168a9136366d6aee5062798dd65f0b618cc4db756c620f82`
- `rev523-x3c-ext4-2.json` `49ad537fb14a0851bd7844051654a458e81075ef612e5642dadabcace913f01a`
- `rev523-x5-tmpfs.json` `ac1a4ee0e48b4a7816f33e1a6fbbfcd2183cafac684661227f9b9dba5969c622`
- `rev523-x5-ext4.json` `bf20513abeb42f4b99b508cf3ce907e55c9925633827d7eead16d7be6e93165b`
- `rev523-repeat-tmpfs.json` `8951bbc17f910d701dbaf3288ca848fc5dfe50ee7a349f11fa8830e8d6780f2f`
- `rev523-repeat-ext4.json` `b67e70394a38c6b6719ee9bfcb87c0857f316d246b279ad0feadb71804aa7002`
- `rev523-parallel-tmpfs.json` `ae395374be53118a27efcf2d099f56b6e91d2edb1af31b11c44082b31f907002`
- `rev523-parallel-ext4.json` `37c1366425ed13c3728a28754a3c7d044a00cba94f0950e99d7ba51e728b67b1`
- `replace-probe-tmpfs.json` `f44630c162c797beb7ed6f303bc57c9f87186b0a83504cdb5f576e961e870d34`
- `replace-probe-ext4.json` `f72bd3f009311730f04233e3de9b7885c7b811c243992d9c8ff742cf0d44ce6d`
- `faithful-probe-tmpfs.json` `73fd609f8a542bf07560d9785f6716cce4c54ac0237478c1b242da87a7c86247`
- `faithful-probe-ext4.json` `1efeefc35def2b4a2f2a6da4ea6e1a342aacc924e19db23a6e9e65e4ddcb33d5`
- `snapshot-shapes-tmpfs.jsonl` `0ee0aacb051e490d47ed1376fb74a70a97799d5ba616b890bb8a7a49c5236d9f`
- `snapshot-shapes-ext4.jsonl` `36ae5897b608ac867ae25bc3906ea084c1bb89d7e5819615f6b5de9ff281e74f`
- `comment-probe-tmpfs.json` `796fa276d809fd01f867c8e9b58da6e4726a6339d6c7f4874d6a849798ecd115`
- `comment-probe-ext4.json` `dc0af62962d2d3265bbb550fdff27e046cefcbcdaf8a92864b363194d5a235c8`
- `fd-X3d-ext4.txt` and `fd-X3d-ext4-1.txt` … `fd-X3d-ext4-6.txt`: the 7 default-reporter X3d outputs. Runs 3 and 6 failed;
  the other 5 passed.
- `governance-head.txt` `b59b848f65bff4c2c802df8a2b58c2a8cf99d3d72f3bbb3f55611637a04c54aa`
- `governance-base.txt` `0092bf3a79b5910ab5c44c8e9d1002fed0a671aa92a3ae4cf002ba87bc06f573`
- `quotations-head.txt` `e74d8139828f35da8dc6127ed2361f50f161fb46dcd42b2cb5caf663a87a9af4`
- `project-run.txt` `3797ac0a3fc3a7f1012492cb51354fb7f39673ad0353271ceb462c2da8629b43`
- `typecheck.txt` `e2c8b37ba8c2974699631485e9c24406b9eb7c793bbbd178345cd4a0f86ce13f`
- `list-base.txt` and `list-fix.txt`, both `9b74a21e6034db437343f1606a4ff0443474e50254ae1e221f6dcf27ac3f745c`
- `pr-body.txt` `355d5bd5faa27d6f5f7e9f1b417dbf0810b50ef8012fa955bb1be6ce99febb47`, the PR body as read for §3 item 3
- `npm-ci.log` and the per-run console logs `rev523-*.log`
