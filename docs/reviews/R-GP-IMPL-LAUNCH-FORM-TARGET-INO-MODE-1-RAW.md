# R-GP-IMPL-LAUNCH-FORM-TARGET-INO-MODE-1 — CC-REV-1 implementation review of syzygy-bpyt.8.35, round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 74dc0eb9
Subject: r1-review.diff sha256 0c72ef422b251a8e3f7345b6fc93c7627f22b286159fe36b051229baac4ebfe6

Reviewer: an independent fresh-context agent (rev-526). I did not author this change and share no context with its author. I
changed no reviewed byte, pushed nothing, commented on nothing and merged nothing. I read no observed-repository content and
opened no credential file. Every run used a private TMPDIR, deleted afterwards.

## 1. Subject identity checks

All [Observed], in a scratch clone of `/home/tze/GitHub/syzygy` fetched from `origin`:

- `sha256sum r1-review.diff` printed `0c72ef422b251a8e3f7345b6fc93c7627f22b286159fe36b051229baac4ebfe6`. That matches the brief.
- `git diff a088f1caf061c1a2062527ce8521c9b64c3c7fd1 74dc0eb9f3b912b9a89e8db456edd687edbda6ff | sha256sum` printed the same
  digest, `0c72ef422b251a8e3f7345b6fc93c7627f22b286159fe36b051229baac4ebfe6`. `--shortstat`: `30 files changed, 30766 insertions(+), 6 deletions(-)`.
- `git ls-remote origin`: `agent/syzygy-bpyt.8.35` is at `74dc0eb9f3b912b9a89e8db456edd687edbda6ff`, and `main` is at
  `a088f1caf061c1a2062527ce8521c9b64c3c7fd1`. `git merge-base 74dc0eb9 a088f1ca` gives `a088f1ca…`. `gh pr view 526` gives
  `headRefOid` `74dc0eb9…`.
- Branch commits `a088f1ca..74dc0eb9`:
  - `2a21f2b0`, the test change, whose parent is `71334012`;
  - `90efeb41` and `e2db66ac`, evidence;
  - `74dc0eb9`, a merge of main.
- Product bytes. `git diff --quiet a088f1ca 74dc0eb9 -- . ':(exclude)docs/evidence/launch-form-target-ino-mode-2026-10-25'
  ':(exclude)packages/polaris-dossier/src/launched.test.ts'` printed `exit=0`.
  - `git rev-parse <c>:packages/polaris-dossier/src/launched.ts` gives the same blob, `8012623e69186951551e3eb724605bd6c78231f0`,
    at all four commits `df6046a1`, `71334012`, `2a21f2b0` and `74dc0eb9`.
  - Its sha256 is `c7a25b8b45fe12e2add7874f88d46b2bad1eef16ffa4a17e2464d5c671424921`, as the PR body says.
- Test-file sha256 by commit, scripted from the git objects:

  | Commit | sha256 |
  |---|---|
  | `df6046a1` | `73fd8fe0c835e3910fbc45e2ea026b0b6ec54ac7c04657aeed9aa2311440fa5e` |
  | `71334012` | `5dd0d6c74f5c8de9998d82cf6b8989e24e09f293202eebb3fd0969cfa79bd63c` |
  | `a088f1ca` (main) | `5dd0d6c74f5c8de9998d82cf6b8989e24e09f293202eebb3fd0969cfa79bd63c` |
  | `2a21f2b0` | `f3df92691b8a84a88bf57de2b4067d61d512e1bad6cb3b8f09aa489245488d93` |
  | `74dc0eb9` | `f3df92691b8a84a88bf57de2b4067d61d512e1bad6cb3b8f09aa489245488d93` |
- Tracked files: 4,005 at `74dc0eb9` and 3,976 at `a088f1ca`. That is 3,976 plus the 29 new evidence files, matching the body's
  "30 of 4,005".
- CI: `gh pr checks 526` lists `checks pass` and `node pass` at head `74dc0eb9`.

## 2. Clauses relied on, and the class ruling

- **CC-REV-1** (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md:37`), class 4: "**security** — anything
  under SEC-1…SEC-5, auth surfaces, egress paths". Also `:45-47`: "Class membership is contested by default and is never finally
  determined by the agent performing the change". And `:51`: "A reviewer or the owner may reclassify at any time."
- **The reader's tie to SEC-3** (`packages/polaris-dossier/src/launched.ts:34-35`): "No caller may treat `unreadable` more
  leniently than `launched`: whether Syzygy started the run's sessions cannot be told, so SEC-3's instruction is never given and no
  launch form counts."
- **SEC-3** (`.syzygy/governance/doctrine/security.md:61`): "**SEC-3 — Observed code is untrusted, everywhere.**"
- **GP-Q0** (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md:61-66`). The three checks for
  pull requests touching class 1, 3 or 4:
  - "an old-versus-new differential over a mutated-record corpus that includes records with altered prose;"
  - "a rule-6 mutant for each predicate;"
  - "a non-blocking owner notice in the cycle report."
- **AGENTS.md rule 6**: "Mutate the input and confirm the check fails, per predicate, before trusting it". Rule 9: "A claim of
  absence needs a sweep with a denominator." Rule 11: "An evidence record names its subject and the subject's digest".

**Ruling: class 4, and no other class.**
- The 17 rows of `launch forms in a run whose marker is unreadable` are the rule-6 kill evidence that `launchFormRefusal` counts no
  launch form while the marker is unreadable. That is the SEC-3-tied reader quoted above. This change alters what those rows can
  kill: the link row now kills X3c and X3d on ext4 (§3).
  - So it touches the security evidence. That agrees with the #516, #519 and #523 rulings, and with the PR's declaration.
- Not class 3 [Inferred]. `markerSnapshot` is a test helper and composes nothing the product snapshots, evaluates or emits.
- Not class 6. No product byte or public interface changes (§1).
- Not class 1, 2, 5 or 7. Nothing touches authority, identity, migration or certificates.

**GP-Q0's three checks:**
- **Differential: degenerate, with a stand-in.**
  - `launched.ts` is the same blob at base and head (§1). So an old-versus-new run of the product reader is identical by
    construction over any corpus. That includes the 17 plants, whose prose is altered: invalid JSON, another format, a byte-order
    mark, a non-string format.
  - The stand-in is old test against new test over one mutant corpus. That is:
    - the PR's record: the 21 mutants of the 8.33 record and the #523 reviewer's X1–X5, at `71334012` and at the fix, and X3c, X3d
      and X5 at `df6046a1`;
    - my reproductions;
    - my own 5 reader mutants and 2 test-side mutants (§3 items 4–6).
- **A rule-6 mutant per predicate: met for `targetIno`, and met for `targetMode` only counterfactually.**
  - `targetIno`:
    - X3c is killed at the fix in 20/20 runs (lane) and 10/10 (mine) on ext4. It survives the base `71334012` on ext4 in 2/10
      (lane) and 1/10 (mine).
    - The test-side mutant that removes the `targetIno` line lets X3c survive again on ext4, in 1/10 runs.
    - The field probe makes `targetIno` the only field X3c moves in 260 of 300 ext4 rounds.
  - `targetMode`:
    - It moves under X3d and Y3, and the row fails at the fix for both.
    - With the `targetIno` line removed, X3d is still killed 5/5 on each file system, through `targetMode` [Inferred: X3d moved
      `targetCtimeNs` in only 31 of 300 ext4 probe rounds]. At the base, which has neither field, X3d survived 2/10 on ext4.
    - With the full snapshot, though, `targetMode` is never the only witness on this host: 0 sole-witness rounds of 3,300 per
      file system, and the test-side mutant that removes the `targetMode` line loses no kill. See N1.
- **Owner notice:** not yet posted on `syzygy-bpyt.10`. The lane cannot write to `bd`, and the coordinator posts it at landing
  (AC3).

**Does anything a gate accepts or refuses change?**
- Product gates: no. `launchedMarkerState` and `launchFormRefusal` are byte-identical, with the same refusal strings.
- The test gate as a non-root user: no. The same 43 tests pass at base and fix (§3 item 9). The suite now refuses more reader
  mutants: X3c and X3d, which survive the base on ext4.
- The test gate under a uid of 0: yes. The two mode-000 rows go from failing [Inferred: under real root the reader reads the plant
  as `launched`] to skipped. That is the intended effect of the #521 N7 fix.

## 3. What I ran, and the results

The host had kernel `7.0.0-38-generic` and node `v24.6.0`. `/tmp` is `tmpfs` (`stat -f -c %T`: `tmpfs`; `df --output=fstype`:
`tmpfs`). `/var/tmp` is on `/`, where `stat -f -c %T` prints `ext2/ext3` and `df --output=fstype` prints `ext4`. load1 was 29–62
during the mutant runs and about 14 at the start. Three other reviewers were running beside me.

1. **Identity checks:** §1.

2. **Product bytes and the new fields** [Observed: diff, and `launched.test.ts` read at `74dc0eb9`].
   - The diff adds two property lines, `:50-51`. They read the existing `followed` object, `:46`, which this change leaves alone.
     So there is no new `fs` call, no new follow, no new open and no new read.
   - Each of the 17 plants, by type:
     - Rows 1–9 and 16 (regular files) and row 17 (the mode-000 file): not a link, so `followed` is `undefined` and all three
       target fields are `null`.
     - Row 10 (a directory): not a link, so all three fields are `null`.
     - Row 11 (a dangling link): `throwIfNoEntry: false` gives `undefined`, so the fields are `null` and nothing throws.
     - Row 12 (a link to the marker): a regular file, so all three fields have values.
     - Row 13 (a link to `/dev/zero`): `stat(2)` follows the link without opening the device, and `isFile()` is false, so the fields
       are `null`.
     - Rows 14–15 (FIFOs): not links, so the fields are `null`, and nothing opens a FIFO.
   - No plant is a link to a directory. If one were, `isFile()` would be false and the fields `null`.
   - The one throwing case is a link loop (`ELOOP` from `statSync`), which already existed with `targetCtimeNs`. It would fail the
     row, so it fails closed for the test. No plant makes one.

3. **The faithful ask: the lane's probe**, `faithful_probe.mjs` sha256 `5cb93cb3639a5ed4e7249f2a0362201aba759e903149336e77784e03d70aa2c6`, read
   from the clone's working tree at `74dc0eb9`.
   - It ran against `dist/launched.js` built in my clone at `74dc0eb9`, sha256 `46b0c23e3d460e9bc6f844334adef8b35f1359ec3c21983656e3f3d9315e6756`.
     That equals `probe-build.json`'s `distLaunchedJsSha256`.
   - Arm "none", 17 plants × 300 rounds, on each file system:
     - tmpfs: `plants 17 rounds 5100 differ {} nonnull {'a symbolic link to the marker Syzygy writes': 300} notUnreadable 0`;
     - ext4: `plants 17 rounds 5100 differ {} nonnull {'a symbolic link to the marker Syzygy writes': 300} notUnreadable 0`.
   - On every plant the three target fields were null together, asserted by script.
   - **No field, new or old, moved on a faithful ask** [Observed, 10,200 rounds]. That includes the snapshot's own `statSync` and
     `readFileSync` of the target.

4. **Field probe: which field witnesses which change** (my `tools/field_probe.mjs`).
   - Setup:
     - The snapshot helper is copied from `launched.test.ts` at `74dc0eb9`. A script found its 15 lines equal, after the two type
       annotations were removed.
     - The plant is the link to the marker. Each round: plant, snapshot, ask, write arm, snapshot.
     - The target's path is read with `readlinkSync`, not `realpathSync`.
     - 300 rounds per arm.
   - Verbatim results, ext4:
     - `X3c-rename-over-same-mode      differ={'targetIno': 300, 'targetCtimeNs': 40} sole={'targetIno': 260}`
     - `X3d-rename-over-0644           differ={'targetIno': 300, 'targetMode': 300, 'targetCtimeNs': 31} sole={}`
     - `X5-unlink-rewrite-same-mode    differ={'targetCtimeNs': 300} sole={'targetCtimeNs': 300}`
     - `Y1-copyfile-rename-over        differ={'targetCtimeNs': 300, 'targetIno': 300} sole={}`
     - `Y2-chmod-current-mode          differ={'targetCtimeNs': 300} sole={'targetCtimeNs': 300}`
     - `Y3-unlink-rewrite-0644         differ={'targetCtimeNs': 300, 'targetMode': 300} sole={}`
     - `Y4-hard-link-left              differ={'targetCtimeNs': 300} sole={'targetCtimeNs': 300}`
     - `Y5-link-rename-unlink          differ={'targetCtimeNs': 300} sole={'targetCtimeNs': 300}`
     - `N3-zero-byte-write             differ={} sole={} nothing=300`
     - `N3-self-rename                 differ={} sole={} nothing=300`
     - `none                           differ={} sole={} nothing=300`
   - tmpfs: every replacement arm moved `targetIno` and `targetCtimeNs` in 300/300 rounds. X3d and Y3 also moved `targetMode`.
     Y2, Y4 and Y5 moved `targetCtimeNs` alone. The two N3 no-ops and "none" moved nothing.
   - Every round of every arm read `unreadable`, with 0 write errors.
   - Over 11 arms × 300 rounds × 2 file systems, `targetMode` was the sole witness in **0** rounds.
   - On ext4, a freed inode number came back in 300/300 rounds of each unlink arm (X5, Y3).

5. **Recorded mutants, reproduced from the recorded fragments** (my `tools/rev526_mutants.py`).
   - Fragments: it reads each mutant's old/new fragments from the stored `edits` of every `mutants-*.json` at `74dc0eb9`, asserted
     identical across those files. For X3c, X3d and X5, a script found the stored `new` equal to the retained `rev523_mutants.py`
     `OWN` bodies.
   - Each run: the test file alone, vitest's JSON reporter, `CI=1`, its own TMPDIR deleted after the run, and the bytes restored and
     checked by digest.
   - Base `71334012` is the parent of the fix commit, and its test file is main's. `df6046a1` is the pre-change-time base.
   - Outcomes (verbatim from `summary-r526.txt`; "link row only" means the one failed test was the link row):

   | Mutant | `df6046a1` | `71334012` | fix `74dc0eb9` |
   |---|---|---|---|
   | X3c, ext4 | survived 3/3 | **survived 1/10**, killed 9 (link row only) | killed 10/10, link row only |
   | X3c, tmpfs | survived 3/3 | killed 10/10 | killed 10/10, link row only |
   | X3d, ext4 | survived 3/3 | **survived 2/10**, killed 8 (link row only) | killed 10/10, link row only |
   | X3d, tmpfs | survived 3/3 | killed 10/10 | killed 10/10, link row only |
   | X5, ext4 | survived 3/3 | killed 10/10 | killed 10/10, link row only |
   | X5, tmpfs | survived 3/3 | killed 10/10 | killed 10/10, link row only |
   | O1, ext4 and tmpfs | — | — | killed 5/5, 11 failed each (the 8.33 record: 11) |
   | O8, ext4 and tmpfs | — | — | killed 5/5, link row only (the 8.33 record: 1 row) |

   - **Every recorded mutant I ran reproduces** [Observed]: every fix run killed, on the link row (O1 on its 11 rows), and every
     `df6046a1` run survived. Over the 328 runs of my harness, `runs 328 problems 0 []`.

6. **My own mutants, and the test-side mutants of each predicate** (same harness).
   - Reader mutants, killed in every run at the fix (5/5 per file system) and at `71334012` (3/3 per file system), each on the link
     row only:
     - Y1, a `copyFileSync` copy renamed over the target, which keeps its bytes and its mode;
     - Y2, `chmod` of the target to the mode it has;
     - Y3, unlink, then rewrite at 0644;
     - Y4, a second hard link left in place;
     - Y5, link the target, rename onto it, unlink.
   - Test-side mutants, where `fix-noIno` and `fix-noMode` are the fix with one new snapshot line removed:

   | Reader mutant @ test variant | ext4 | tmpfs |
   |---|---|---|
   | X3c @ fix-noIno | **survived 1/10**, killed 9 | killed 10/10 |
   | X3d @ fix-noIno | killed 5/5 | killed 5/5 |
   | X3d @ fix-noMode | killed 5/5 | killed 5/5 |
   | Y3 @ fix-noMode | killed 5/5 | killed 5/5 |
   | Y3 @ fix-noIno | killed 5/5 | killed 5/5 |
   | Y1 @ fix-noIno | killed 5/5 | killed 5/5 |

   - **In-place changes.** None that changes anything passes [Observed over Y2, Y4 and Y5 here and O1, O8, X1 and X2 in the
     record]. Only N3's two no-ops leave every field unchanged (300/300 rounds), and they change nothing.
   - **Replacements.**
     - On both file systems, a rename-over (X3c, X3d, Y1) is killed by `targetIno`.
     - An unlink-and-rewrite (X5, Y3) is killed by `targetCtimeNs`, and Y3 also by `targetMode`. On ext4 `targetIno` cannot see it,
       because the inode number is reused.

7. **The `71334012` result.**
   - `71334012` is `Merge pull request #523 from Tzeusy/agent/syzygy-bpyt.8.33` on main.
   - It is the parent of the fix commit `2a21f2b0` and the branch point. Its test file is byte-identical to the merge base
     `a088f1ca`'s (both `5dd0d6c7…`, table in §1).
   - So the `71334012` column **is this change's base**. It is neither an intermediate nor a misattribution.
   - `df6046a1` is `Merge pull request #519`, #523's base, one test-file version earlier (no `targetCtimeNs`). Its 10/10 survivals
     measure #523 and this change together.
   - X3c's survival at the base is nondeterministic and depends on load:
     - #523's reviewer: 17 of 25 at the same test bytes;
     - the lane: 2/10;
     - mine: 1/10 at load1 29–62.
   - X3d's base survival also varies: #523's reviewer 8 of 25, the lane 0/10, mine 2/10. See N1 for what that means for the PR's
     rule-6 line.

8. **The rewording.**
   - The comment's text was joined across its wrapped lines by script. The #523 raw's N3 proposed text, "any write of at least one
     byte, truncate, chmod, rename to another name or link of the marker moves the change time, even one that puts back what it
     changed.", occurs in it verbatim: `N3 text occurs in comment: True`.
   - Is it true on this host? [Observed]
     - The two cases it now excludes, a zero-byte write and a rename onto its own name, moved nothing in 300/300 rounds through the
       link on each file system.
     - Every operation it names moved `targetCtimeNs`: a chmod to the current mode (Y2), a link (Y4) and a link-rename-unlink (Y5),
       300/300 each. So did a rewrite (O1), a truncate (D4-truncate) and a rename away and back (O7) in the record.
   - Off this host, the sentence holds only with multigrain timestamps. The 8.33 dispositions' N2 already records that residual,
     so it is not reopened here.

9. **The root skip.**
   - The table:
     - `PRESENT_BUT_NOT_THE_MARKER` at the fix is the base's 17 rows minus the mode-000 row, in order: `fix == base minus
       mode-000 row: True`.
     - The mode-000 row was last at base (`True`).
     - The `MODE_000` tuple text occurs once at base and once at the fix.
   - Both row bodies are byte-identical, scripted (124 and 1,418 characters).
   - Titles: `vitest list` at the fix, and at the base under a temporary name. Both have 43 lines, `lists identical in order`.
     The fix list's sha256 is `9b74a21e6034db437343f1606a4ff0443474e50254ae1e221f6dcf27ac3f745c`, equal to the lane's
     `list-fix.txt`.
   - The worker-only shim (`as-root-worker.mjs`), over the whole file unfiltered:
     - as the user: `{'numTotalTests': 43, 'numPassedTests': 43, 'numFailedTests': 0, 'numPendingTests': 0}`;
     - with the shim: `{'numTotalTests': 43, 'numPassedTests': 41, 'numFailedTests': 0, 'numPendingTests': 2}`;
     - the same 43 titles, of which only `launchedMarkerState is unreadable for a file its reader may not read` and `launch forms
       in a run whose marker is unreadable count neither a declared form nor a syzygy-launched one: a file its reader may not read`
       changed (`passed -> skipped`).
   - With the shim and the `skipIf` removed, the rows run and pass, 43/43. That is because the process is not really root.
     **So the shim checks the skip's condition only, and says nothing about how the rows behave under real root**, which stays
     [Inferred]. An unprivileged user namespace was not available as a stand-in: `unshare: write failed /proc/self/uid_map:
     Operation not permitted`, and `kernel.apparmor_restrict_unprivileged_userns = 1`.
   - **Rule-9 sweep for other mode-000 rows** (`tools/mode_sweep.py`, over the git objects at `74dc0eb9`):
     - Result lines: `tracked_files=78 text_scanned=78 mode_literals=87`, `literals_without_owner_read=4` and
       `chmod_calls_without_literal=0`.
     - The 4 mode-000 plants:
       - `credential-probe.test.ts:34`, in `it.skipIf(isRoot)` at `:30`;
       - `git-object-reader.test.ts:518`, in `it.skipIf(process.getuid?.() === 0)` at `:516`;
       - `launched.test.ts:75`, now skipped;
       - `state-directory.test.ts:123`, in `it.skipIf(isRoot)` at `:121`.
     - **All 4 mode-000 plants in `packages/polaris-dossier/` are root-guarded at the head** [Observed].
     - Outside the package, `packages/cap1-system/src/state-dir.system.test.ts:364` (`chmodSync(blocked, 0o000);`) is still
       unguarded. It stays with `syzygy-bpyt.4.25`.

10. **Determinism.** The unmutated file at `74dc0eb9` passed in 10/10 runs per file system. A script asserted every run at
    `{'numTotalTests': 43, 'numPassedTests': 43, 'numFailedTests': 0, 'numPendingTests': 0}`, each with a private TMPDIR, at
    load1 29–62.

11. **The record, by script against the git objects** (`tools/verify_record.py`, `tools/verify_compare.py`).
    - `verify_record.py` checked:
      - all 496 runs in the six `mutants-*.json`: `runs checked: 496`, `problems: 0`;
      - each header's commit `2a21f2b0…`, its base (`71334012…` for a and b, `df6046a1…` for c) and its tool digest, equal to the
        retained `rev523_mutants.py` at `74dc0eb9`;
      - `kernel` `7.0.0-38-generic`, with `statF`/`dfT` `tmpfs`/`tmpfs` and `ext2/ext3`/`ext4`, stored in every one of the six
        files;
      - each run's test digest against its side's git object;
      - each stored `old` occurring exactly once in its side's file. 464 edits are to `launched.ts`, and 8 are to the test file
        (`T-ask-of-an-unplanted-run`), checked against the base's test file on the base side;
      - each outcome against its exit code and failed-test list;
      - `failedRows` and `linkRowFailed` derived again from the failed tests;
      - restore, and a clean tree after.
    - The PR's X3c, X3d and X5 figures come back exactly: at the fix, 20/20 killed per file system, all link-row-only; at
      `df6046a1`, 10/10 survived; at `71334012`, on ext4 X3c survived 2 and was killed 8, X3d and X5 were killed 10/10, and on
      tmpfs all were killed 10/10.
    - `verify_compare.py`: the 21 8.33 fix rows (D1×5, D3, D4, M, T, R×4, O1–O8) give the same failed-test set in every `b` fix
      run, on each file system. M survives 2/2. Result line: `mismatches: 0`.
    - `record.py --check`: `summary.json matches ; problems: 0`, exit 0. `record.py --selftest`: `selftest: 12/12 mutations make a
      check fail`, exit 0.
    - The PR body's other figures match the record:
      - the probe table;
      - the root-skip counts;
      - the digests of `summary.json`, `record.py`, `faithful_probe.mjs`, the shim, `list-fix.txt` and the tool;
      - the citations `R-GP-IMPL-LAUNCH-FORM-TARGET-CTIME-1-RAW.md:235-324` and `R-GP-IMPL-ARGV-TABLE-1-RAW.md:420-438`;
      - `credentials.ts:303`;
      - the line `:147-149`.

12. **Project and gates.**
    - `@syzygy/polaris-dossier` once: `Test Files  32 passed (32)` and `Tests  1326 passed | 1 skipped (1327)`. The skip is in
      `no-egress.test.ts (3 tests | 1 skipped)`, its strace/no-strace pair.
    - `npm run typecheck`: exit 0.
    - `python3 scripts/check_governance.py`: `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`, exit 0.
    - `python3 scripts/check_quotations.py`: exit 0.
    - **Not run:** the PROJECT-STATUS canonical battery. The PR's `commands=110 nonzero=0` is lane-reported, and I have not
      reproduced it.

## 4. Findings

None blocking.

### N1 — note, low. `targetMode` is never the sole witness at the fix on this host, and the PR's per-predicate evidence for it does not isolate it

- **Evidence.**
  - [Observed] The PR body says: "`targetMode` is killed by X3d, which survives at `df6046a1` in 10/10 runs."
  - That comparison does not isolate `targetMode`:
    - `df6046a1` lacks all three target fields.
    - At this change's own base, `71334012`, the lane's record has X3d killed 10/10 on both file systems, through `targetCtimeNs`.
    - X3d at the fix is equally killed by `targetIno`: it moved `targetIno` in 300/300 probe rounds on each file system.
    - With the `targetMode` line removed (`fix-noMode`), X3d is killed 5/5 on each file system.
  - [Observed] Over 11 write arms × 300 rounds × 2 file systems (§3 item 4), `targetMode` was the sole moved field in 0 rounds.
    - Every arm that moved it (X3d, Y3) also moved `targetIno` or `targetCtimeNs`.
    - The test-side mutant `fix-noMode` lost no kill (X3d 5/5, Y3 5/5, per file system).
  - [Observed] `targetMode` is not dead. Against `fix-noIno`, X3d is killed 5/5 on ext4, where the base (neither field) let it
    survive 2/10, and X3d moved `targetCtimeNs` in only 31 of 300 ext4 rounds. So it can kill when `targetIno` is absent. On this
    host it is a redundant co-witness.
  - [Inferred] Its one sole-witness case needs both of these:
    - a different-mode rewrite at a reused inode number (Y3, as on this ext4);
    - a file system that stamps the new inode with the old change time (coarse timestamps).
    That case is not reproducible on this host.
  - The lane's record has X3d killed 10/10 at `71334012`. Mine survived 2/10, and #523's reviewer saw 8 of 25. So the lane's 0/10
    is not evidence that the base kills X3d; base survival is load-dependent.
- **Failure scenario.** A later reader of the dispositions takes `targetMode` as proven by X3d. They then either remove
  `targetIno` as redundant, expecting `targetMode` to carry X3d alone, or count GP-Q0's per-predicate check as met by evidence that
  never isolated the predicate.
- **Proposed fix.** No code. In the dispositions record:
  > `targetIno` is killed alone by X3c on ext4 (sole witness in 260 of 300 probe rounds, X3c survived the base 1–2 of 10 and the
  > fix without `targetIno` 1 of 10). `targetMode` is a co-witness on this host and never the only one (0 of 3,300 rounds per file
  > system). It kills X3d when `targetIno` is absent. Its sole-witness case, a different-mode rewrite at a reused inode number
  > stamped with the old change time, is [Inferred] and needs a coarse-timestamp file system.

  Mention the same in the owner notice on `syzygy-bpyt.10`.

### N2 — note, low (evidence precision). The ext4 unlink-and-rewrite residual names the wrong arm and omits a conjunct

- **Evidence.** [Observed]
  - The lane's report, claim 6, calls the `--selftest-unlink-0644` result a residual: "`targetMode` changes in 300 rounds and
    `targetIno` in 0 (the inode number is reused). This is a residual." At mode 0644 it is not: two fields catch it,
    `targetMode` and `targetCtimeNs`, 300/300 each on ext4.
  - The single-witness case is the same-mode rewrite, X5. My X5 arm on ext4: `differ={'targetCtimeNs': 300}
    sole={'targetCtimeNs': 300}`.
  - The PR body says: "X5 is still killed 20/20 at the fix, through `targetCtimeNs` (300/300 in the probe)." But that probe figure
    is the 0644 arm's. The lane's probe has no same-mode unlink arm, so "through `targetCtimeNs`" was [Inferred] there. It is now
    [Observed] by my X5 arm.
  - The body's [Inferred] residual reads: "A same-mode unlink-and-rewrite on a coarse-timestamp file system could still pass,
    because the change time is then its only witness." That holds only where the file system also reuses the freed inode number.
    Where the number is fresh (tmpfs here: `targetIno` moved in 300/300 X5 and Y3 rounds), `targetIno` still catches it.
- **Failure scenario.** A reader of the dispositions records the 0644 case as an open hole and files work to close it. Meanwhile
  the true single-witness case, same mode on ext4, goes unstated, and the conjunct "and reuses the inode number" is lost.
- **Proposed fix.** No code. Restate it in the dispositions:
  > On this host's ext4 a target unlinked and rewritten at its path takes the freed inode number back (300/300), so `targetIno`
  > cannot see it. A same-mode rewrite (X5) is then killed by `targetCtimeNs` alone (300/300), and a rewrite at another mode
  > (Y3, 0644) by `targetMode` and `targetCtimeNs`. [Inferred] A same-mode unlink-and-rewrite can pass only on a file system that
  > both reuses the inode number and stamps the new file with the old change time.

### N3 — note, informational. The probe's `--selftest-rename` arm is not X3c's write

- **Evidence.** [Observed]
  - `faithful_probe.mjs:79-80` labels the arm "X3c's write", but it resolves the target with `fs.realpathSync`. That is X3's
    resolution, which #523's N1 found hands out fine stamps.
  - The lane's ext4 run shows `targetCtimeNs` 298 of 300. My X3c arm, which resolves with `readlinkSync` as X3c does, moved it in
    40 of 300.
  - The arm still shows `targetIno` moving (300/300), which is its stated purpose. It does not reproduce the change-time
    coincidence that made X3c survive. `--selftest-unlink-0644` also uses `realpathSync`.
- **Failure scenario.** Someone takes the 298/300 as evidence that the change time already caught X3c's write on ext4, and that
  `targetIno` was not needed.
- **Proposed fix.** No code, since the record bytes are evidence. In the dispositions, say that the arm uses X3's resolution, and
  cite this review's `field-probe-ext4.json` for X3c's own write (`targetIno` sole in 260/300).

### N4 — note, informational (rules 4 and 11). Some outputs name no subject digest, and `record.py` reports two claims it does not check

- **Evidence.** [Observed]
  - **Root-skip outputs.** `root-skip-{user,root}.json` name only the file path in the lane's worktree. They carry no commit, test
    digest, kernel or file system. `record.py` checks their titles and statuses only. I re-ran them at `74dc0eb9`, with the same
    result (§3 item 9).
  - **Probe outputs.** `faithful-probe*.json` carry only `root` and `roundsPerPlant`. `probe-build.json` names the fix commit, the
    build digest and the roots, but no kernel and no `statF`/`dfT`. The mutant records store all of these, which is AC1's list.
  - **Unchecked claims in `record.py`.**
    - Its `acceptance()` reports base survival and counts fix kills. It does not check the PR's "on the link row only". I checked
      that: 20/20 per file system.
    - Its `old`-occurs-once check runs against the fix's files only (`:76-79`). For the 8 test-file edits of
      `T-ask-of-an-unplanted-run` on the base side, that is the wrong file. My check against each side's file passes.
    - Its outcome check would raise on a timed-out run, because `counts` would be `None` (`:73`). No run timed out.
- **Failure scenario.** A later re-run on another host or commit produces root-skip or probe outputs that cannot be tied to the
  bytes they ran. Or a regression in the link-row-only property, or a base-side fragment mismatch, passes `--check`.
- **Proposed fix.** No change to these bytes. In the next record of this kind:
  - store the commit, the test sha256, the kernel and `statF`/`dfT` in every output;
  - have the checker assert link-row-only kills, and old-once against the side's own file.

  Record the gap in the dispositions.

### N5 — note, informational. The test delta undercounts the rows whose assertion changed

- **Evidence.**
  - [Observed] The PR body says `Tests: +0 ~2 -0`, and also that "The link row asserts more through the helper."
  - The helper is used by all 17 launch-form rows. At the fix, 16 of them compare two more fields (both `null`), and the link row
    compares two more non-null fields.
  - So by assertion, 18 distinct tests changed: the 17 launch-form rows, and the `launchedMarkerState` mode-000 row by
    registration. The launch-form mode-000 row is in both groups.
- **Failure scenario.** A reader of `~2` misses that every launch-form row's assertion changed. Low consequence, because the body
  names the link row.
- **Proposed fix.** In the dispositions, state the delta as `+0 ~18 -0`: 2 by registration (the mode-000 rows), 17 by the helper
  (the launch-form rows), and 1 in both.

## 5. Every changed output, or the evidence that there is none

- **None.** `git diff --quiet a088f1ca 74dc0eb9 -- . ':(exclude)docs/evidence/launch-form-target-ino-mode-2026-10-25'
  ':(exclude)packages/polaris-dossier/src/launched.test.ts'` printed `exit=0`.
- `launched.ts` is the same blob at `df6046a1`, `71334012`, `2a21f2b0` and `74dc0eb9`.
- The 30 changed paths are:
  - 1 test file, `packages/polaris-dossier/src/launched.test.ts` (+16/−6);
  - 29 new evidence files under `docs/evidence/launch-form-target-ino-mode-2026-10-25/`.
- No rendered byte, wire format, refusal string or exit code of the product changes.
- Test titles: 43 at base and at the fix, byte-identical in order (§3 item 9).

## 6. Verdict per acceptance criterion

- **AC1: met.**
  - The new fields: `markerSnapshot` carries `targetIno` and `targetMode` for a link to a regular file, and `null` otherwise
    (`:50-51`, §3 item 2). The faithful probe re-run changes 0 fields: 10,200 rounds over 17 plants on two file systems (§3
    item 3).
  - X3c and X3d at the fix: killed in every run on ext4 and tmpfs (lane 20/20, mine 10/10, per file system).
  - X3c and X3d at the base: they survive `df6046a1` in every run (lane 10/10, mine 3/3). At this change's own base `71334012`
    they survive only some ext4 runs (X3c 2/10 lane and 1/10 mine; X3d 0/10 lane and 2/10 mine) and no tmpfs run (§3 item 7, N1).
  - The named mutants: O1, O8, R-chmod-cycle-rewrite, D1, D3, D4 and T are each "unchanged" on both file systems, by
    `namedInAc1` and by my comparison (§3 item 11).
  - The record stores the old/new fragments, the commit, the kernel and both file-system names for every mutant run. The probe and
    root-skip outputs do not (N4).
- **AC2: met.**
  - The comment carries the N3 wording verbatim (§3 item 8).
  - Both mode-000 rows skip under a uid of 0, through `const isRoot = process.getuid?.() === 0;` and `it.skipIf(isRoot)`, with a
    one-line comment (`:73-79`, §3 item 9).
  - Titles are unchanged.
  - The unmutated file passes 43/43 in 10/10 runs per file system, by the lane and by me (§3 item 10).
  - Real-root behaviour stays [Inferred].
- **AC3: met on the review half.** This is the independent class-4 review. The owner notice on `syzygy-bpyt.10` is still to post,
  by the coordinator at landing.

## 7. Test quality

Held to the test-rigor bar (`th-engineering/subskills/test-rigor/SKILL.md`):

- **"A test is worth keeping only if some plausible bug makes it fail."** Met.
  - `targetIno` turns the plausible atomic-write repair, X3c, from an ext4 survivor into a kill in every run.
  - `targetMode` adds no kill on this host (N1). It costs nothing and cannot fail a faithful ask (§3 item 3).
- **Bar 1, behavior not implementation.** Met. The snapshot is an observable effect on the file system, taken without asking the
  reader.
- **Bar 4, no tautologies.** Met. The before/after comparison is independently derived, and the refusal string is a literal.
- **Bar 6, deterministic.** Met.
  - The unmutated file passed 20/20 runs at load1 up to 62, and no field moved on a faithful ask in 10,200 rounds.
  - The new kill of X3c rests on an inode allocated while the old target is still linked, not on timestamps [Inferred: from rename
    semantics; Observed 300/300 per file system here].
- **Bar 7, a failure names the defect.** Met. A failed `toEqual` names the moved field.
- **Bar 8, maintained code.** Met.
  - `eachPlant` (`:76-80`) keeps titles and order with two registrations and a one-line docstring.
  - Taking the mode-000 plant out of `PRESENT_BUT_NOT_THE_MARKER` leaves that name still accurate.
- **Coverage under root** [Inferred, from `launched.ts:47-51`]. Under root, the mode-000 plant was the only plant that reaches the
  open-error branch through `EACCES`. The same branch stays covered by the three link plants (`ELOOP` under `O_NOFOLLOW`). So the
  skip loses no branch of the fail-closed reader.
- **The skip's condition.** It reads the uid, not the capability. A non-root process with `CAP_DAC_OVERRIDE` would read the
  mode-000 plant and not skip. That is the same limit as the repository idiom at `credential-probe.test.ts:20` and
  `state-directory.test.ts:19`, and not a new one.
- **Bar 10, growth.** Met. No test was added: the change extends the existing helper and rows.

## 8. Cleanup, and the kept files

Deleted:
- both scratch clones (`rev-526/clone`, `rev-526/cloneB`);
- every TMPDIR I made: `/tmp/r526-*` and `/var/tmp/r526-ext4/`.

Nothing outside them was touched.

Kept under `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-526/`, with
sha256 computed after the last write:

Tools (7):

- `tools/field_probe.mjs` `59b0265f4a3a987fe123e55f0ad04c09fbcdcd272dba424f1df5cd7088dd9043`
- `tools/mode_sweep.py` `0265d5f1d1b5d4f4a09c428c2375f842fb0494b33b23c14b5cae5c8aec15cb62`
- `tools/rev526_mutants.py` `b25d572abf6a2cbb4e815276ec57d9bb878189e0f0cdedc3cf50c66c7ecd55ca`
- `tools/run_all.sh` `c68ed6791ed95e071e1c48b3934bf773f24934ac439466648273fd7a6a285d10`
- `tools/summarise.py` `bfbe59293f427398172bbd6553c29d6e51684ed7ba917dda239981738ba636e1`
- `tools/verify_compare.py` `d0511b7f3ebc4bebae50ada2ed5f22b49551c577f20e6e18ce3cfd3869d2d805`
- `tools/verify_record.py` `eef494d82ba248933ec17a738b419b3ab708746590395ed5f81e21e94a800de5`

Results (32). The two empty `.err` files and the two `npm ci` logs have the same digests because their bytes are the same:

- `faithful-none-ext4.json` `ff4bb5e5ecafb91ac311178c02cc60fa7bc610a3b18cf4bf327f6f27e51ed764`
- `faithful-none-tmpfs.json` `dfe9ccc8a893032e4edc690c2bff63b158b325f29a3607ed9e6e08a12ebacc09`
- `field-probe-ext4.json` `15b6defd59d18e2303a03170a401f37bd0806e69c34aeb1ab1e6ae86701c4816`
- `field-probe-summary-r526.txt` `17a843f453c008e197c39fbcfa38f7eea91419898f6339920012ae4db90769d7`
- `field-probe-tmpfs.json` `2fcaedb4ece65471a9b122aa21075be353d2f6df663922ae5ed21e4b6c6954aa`
- `governance-r526.log` `855480c489d6b37bd225c7916b198af7adfbd1196c6a0ff51de84674673c38a0`
- `list-base-r526.err` `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- `list-base-r526.txt` `40a0ce320c1a54838bf90693cfc1f1df92112dd8db814269b2bff33095c74845`
- `list-fix-r526.err` `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- `list-fix-r526.txt` `9b74a21e6034db437343f1606a4ff0443474e50254ae1e221f6dcf27ac3f745c`
- `mode-sweep-r526.txt` `8c4153f8f43336f627416f8d31c60958e08006324780b92ffea4e68559abf925`
- `mutants-g1-ext4.json` `9a948eadc86425cfd4271558030c7db85a09a872a787e2caac9e3a888206cb3f`
- `mutants-g1-tmpfs.json` `4ff9fdc73e53037380f97cef56ce7bcb7f360c9d85edb6909cc470da094fba7a`
- `mutants-g2-ext4.json` `f45c9c5cf8a8f549730d520b0388db3b29cde79cffe876db83a3046a82bf5a18`
- `mutants-g2-tmpfs.json` `01155a18b32954921fad81c0cd9169d56cb91e905b76f255f7cdcc2c6a915986`
- `mutants-g3-ext4.json` `d95ec75c9fd9b9e139301306db69bf1f8756971b61cc6d18c1f0562470d4bbfb`
- `mutants-g3-tmpfs.json` `cb47dcfc29e2cd6a2026e2d9335c1e4fd82b024b135f3bbc69e589a5fa4d9856`
- `npm-ci-B.log` `d10275741ededc3115f459c96db72da571e9d8dc9211740789b5a9d05f5b603e`
- `npm-ci.log` `d10275741ededc3115f459c96db72da571e9d8dc9211740789b5a9d05f5b603e`
- `project-r526.log` `3d06ca175f79e8791259e9da4d92bddfe1a4e95de12d688fe01d5c291033cc94`
- `quotations-r526.log` `9d3b93e212e75e5d78a6cdbe89a19fc54bbcb1b9680f4c723317af5bee5a80fc`
- `record-check-r526.txt` `5bec36d84a20e016aa47d1a93bcc30af0428e7a82096c138f5b8c00c31eb87d3`
- `root-skip-shim-noskip-r526.json` `1d68eac44ad5abaa3446d9a926abe929129563d952d74453151b8c6a3a48a4af`
- `root-skip-shim-r526.json` `85223b93446982625f3f43c922539d6c9e39e33763e26fcf5f00fe533a3b23d2`
- `root-skip-user-r526.json` `38a6ebe469bd1cfdec2aef91a237f689b4c08be2cf1f9fde54bbd75ba0ba9c07`
- `run-ext4.log` `591e4bfbf499605e81d792bce7005f29c05d14a38767f907514fa9b32dd10c55`
- `run-tmpfs.log` `cf5fa63dd48a9944a8fc57c5d0ef78171da09776d08fbf2d582ea465a2e3bb57`
- `smoke.json` `05dd25654073ebc248f559246fa626775da6c9c3d55762288c694b9a7b3f23a8`
- `summary-r526.txt` `033310fb9b3d419122d6666b1a7b994f5149539506679277bf340de6dba4bc2d`
- `typecheck-r526.log` `e2c8b37ba8c2974699631485e9c24406b9eb7c793bbbd178345cd4a0f86ce13f`
- `verify-compare-r526.txt` `ac5d48dd4ea60855334cc32ecbfb7431fa5ae8053fb364b562bbae0b5f8c5d59`
- `verify-record-r526.txt` `a498e15a5ca42bd71f63897f8a9978365e8a30c57dfe4e6d71d5c78c5616ec99`

That is 39 files besides this raw. No tracked file of the reviewed commit is copied here.
