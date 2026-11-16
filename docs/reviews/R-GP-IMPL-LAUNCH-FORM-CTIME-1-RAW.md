# R-GP-IMPL-LAUNCH-FORM-CTIME-1 — CC-REV-1 implementation review of syzygy-bpyt.8.30, round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 3fb73809
Subject: r1-review.diff sha256 60ae05442b451517aab5909e65be881116ddb69b10c8f71c7f9ed2727730d293

Reviewer: an independent fresh-context session (Claude Opus 5.5), 2026-10-24. I did not write this change and did not edit it. I
fetched no observed-repository content and opened no credential file. Five notes, no blocking finding.

## 1. Subject identity checks

1. [Observed] `sha256sum r1-review.diff` gave
   `60ae05442b451517aab5909e65be881116ddb69b10c8f71c7f9ed2727730d293`, which matches the brief.
2. [Observed] In a fresh clone, `git diff ce322e1a 3fb73809 | sha256sum` gave the same digest, and `cmp` against the brief's file
   printed `IDENTICAL`. `--numstat` reported 6 files, 2,757 lines inserted and 5 deleted:
   - `packages/polaris-dossier/src/launched.test.ts` +7/−5;
   - `docs/evidence/launch-form-snapshot-ctime-mutants-2026-10-23.json` +2357;
   - under `docs/evidence/launch-form-snapshot-ctime-2026-10-23/`: `mutants.py` +158, `ctime_probe.mjs` +113, `probe-tmpfs.json`
     +61 and `probe-ext4.json` +61.
3. [Observed] The PR branch's head on GitHub is the reviewed commit. Fetching `agent/syzygy-bpyt.8.30` from github.com resolved
   to `3fb7380945bd8ac0374e38792a814aed070bd8c6`, and `gh pr view 519` gives the same `headRefOid`. The PR's two checks ran on that
   SHA and passed: node-ci run 40102201049 and governance-docs run 40102201083.
4. [Observed] `git log ce322e1a..3fb73809` shows two commits. `ab59b666` changes the test, and `3fb73809` adds the evidence.
   `git diff --name-only ab59b666 3fb73809` lists only the 5 files under `docs/evidence/`.
5. [Observed] By script (`tools/check_record.py`, 82 of 82 checks pass):
   - `launched.test.ts` hashes `73fd8fe0c835e3910fbc45e2ea026b0b6ec54ac7c04657aeed9aa2311440fa5e` at both `ab59b666` and
     `3fb73809`, so the record ran at the head's test bytes;
   - at base `ce322e1a` it hashes `e01b040a5f74f044169d46adccde476814187b5d44fa7bfcb44ef082ca2fa740`, which is the #516 record's
     `fix`;
   - `launched.ts` hashes `c7a25b8b45fe12e2add7874f88d46b2bad1eef16ffa4a17e2464d5c671424921` at base, fix and head.
6. [Observed] Main has moved past the base.
   - `ce322e1a..7de5dc40` (the merge of PR #509) changes 150 files, and `ce322e1a..19c80e90` (main now, the merge of PR #517)
     changes 210. Neither set shares a file with the subject's 6: `comm -12` printed nothing.
   - Of main's 210, the three files under `packages/polaris-dossier/` are `gate-sources.ts`, `no-egress.test.ts` and `screen.ts`.
     None of them is imported by `launched.test.ts` or `launched.ts`. `vitest.config.ts` gains one alias and a `globalSetup` for
     the three-surface-poc-app project only, and `package-lock.json` is unchanged.
   - A local merge of `3fb73809` into `19c80e90` (`8b397cff`, discarded afterwards) kept both files' digests and passed
     `launched.test.ts`: "Tests  43 passed (43)".

## 2. Clauses relied on, and the class ruling

- CC-REV-1, `review-and-documentation.md:37`: "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
- CC-REV-1, `:49` and `:51`: "**The change record states** which classes the change touches, or "none," so a misclassification is
  a findable violation after the fact." and "**A reviewer or the owner** may reclassify at any time."
- SEC-3, `security.md:90-91`: "Syzygy never gives the instruction to a session it started or to one left running unattended".
- `launched.ts:34-35` ties the reader to SEC-3: "No caller may treat `unreadable` more leniently than `launched`: whether Syzygy
  started the run's sessions cannot be told, so SEC-3's instruction is never given and no launch form counts."
- GP-Q0, `OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md:62`: "**Which ones:** pull requests touching class 1 (authority
  boundaries), class 3 (deterministic observation) or class 4 (security), and class-6 pull requests that remove an endpoint."
- GP-Q0, `:64-66`: "an old-versus-new differential over a mutated-record corpus that includes records with altered prose;", "a
  rule-6 mutant for each predicate;" and "a non-blocking owner notice in the cycle report."
- GP-Q0, `:95-96`: "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."
- `AGENTS.md` rule 6: "Mutate the input and confirm the check fails, per predicate, before trusting it". Rule 11: "An evidence
  record names its subject and the subject's digest".

**Ruling: class 4 (security), and no other class.** The PR declares "none", because the change is test-only.
- [Inferred] The 17 launch-form rows are the rule-6 kill evidence that `launchFormRefusal` counts no launch form while the marker
  is unreadable. That is the reader `launched.ts:34-35` ties to SEC-3. A change that weakens or strengthens what these rows can
  kill changes the security evidence, even though it changes no product byte. I agree with the #506, #511 and #516 reviewers.
- Class 3 does not apply. Its "snapshot composition" means Syzygy's observation snapshot, not a test helper's disk snapshot.
- Classes 1, 2, 5, 6 and 7 do not apply. The change touches no write universe, identity, store, endpoint or certificate.

**GP-Q0's three checks for class 4:**
1. *Differential*: degenerate for the product. [Observed] `launched.ts` is byte-identical at base and head, and nothing outside the
   test and `docs/evidence/` differs. So any old-versus-new run of the product reader over any corpus, prose-altered or not, is
   identical by construction. The informative stand-in is the old test against the new test over one mutant corpus:
   - the record's 13 mutants at base and fix;
   - this review's 8 mutants of my own, plus R-chmod-cycle-rewrite reproduced, at base and head on tmpfs and on ext4 (§3);
   - three record mutants re-run.
   The 17 plants are themselves altered markers: other formats, a byte-order mark, wrong types.
2. *A rule-6 mutant per predicate*: met. The change adds one predicate, `ctimeNs` equality inside the snapshot comparison.
   - R-chmod-cycle-rewrite survives at base and is killed at head on both file systems.
   - So are seven of my own mutants (O1, O2, O3, O5, O6 and O7, plus O4 on ext4).
3. *Owner notice*: not yet posted. [Observed] `bd comments syzygy-bpyt.10` has no 8.30 notice, and the #516 notice ends with this
   bead's filing. N5 covers it.

**Gate changes:** none. [Observed] No product byte changes, so `launchedMarkerState` and `launchFormRefusal` accept and refuse
exactly what they did. The only thing that refuses more is the test, and only on mutated readers. The unmutated head passes 43/43,
as the base did, so CI's verdict on the product is unchanged. Nothing in this change has to go back to the owner under GP-Q0
`:95-96`.

## 3. What I ran, and the results

Setup: `git clone /home/tze/GitHub/syzygy`, fetched the branch, checked out `3fb73809`, then `npm ci` ("EXIT 0"). Each suite ran
under a private TMPDIR: `/tmp/r519-1` to `/tmp/r519-7` on tmpfs, or `/var/tmp/r519-ext4/...` on ext4. Host: kernel `7.0.0-38-generic`,
`CONFIG_HZ=1000`, 12 CPUs, load average 20–33 throughout. Node v24.6.0, vitest 3.2.7.

1. **`launched.test.ts`, unmutated.** [Observed]
   - Head: 46 passing runs, each "43 passed (43)", so 46 × 17 rows × 3 asks = 2,346 asks. Each ask compared `ctimeNs` before and
     after. None failed. The runs were:
     - 1 single run;
     - 1 in each of the three mutant-harness runs;
     - `tools/repeat_head.py`: 20 runs on tmpfs, 4 at a time ("'allPassed43': True"); 10 on ext4, 4 at a time ("'allPassed43':
       True"); and 12 on tmpfs, all 12 at once, ending at load average 28.0 ("'allPassed43': True").
   - Base: 3 runs, each 43/43.
   - Merge preview with main: 43/43 (§1 item 6).
   - No run timed out. I saw no 5 s timeout of the `syzygy-bpyt.4.13` kind. The only thing each run left in its TMPDIR was Node's
     `node-compile-cache`; there were no leftover `polaris-marker-*` directories.
2. **The record and the PR table, by script.** `tools/check_record.py` printed "82 of 82 checks pass". It checks:
   - the record's own digest and both probe digests against the PR body;
   - `base` and `commit` as full SHAs, `subject`, and `testSha256` and `readerSha256` against the git objects;
   - `harnessSource` equal to the committed `mutants.py`;
   - that each mutant's stored `old` occurs exactly once in its side's file;
   - that each outcome agrees with its exit code and failed rows;
   - every cell of the PR body's table, parsed from the body, against the record;
   - AC2 against the #516 record.

   For example: ``PASS PR table D4-truncate / fix: "killed, **11** rows (adds `an empty file`)" ('killed', 11)``, and
   `#516 fix D4-truncate: killed 10 -> this fix killed 11 unchanged-or-stronger`. Rule 6 on the checker: a copy of the body with two cells
   altered (`tools/pr-body-mutated.md`) printed "FAIL PR table D4-truncate / fix" and "FAIL PR table R-fifo-to-empty-file / fix",
   "80 of 82 checks pass".
3. **R-chmod-cycle-rewrite reproduced** from the record's stored fragment, not retyped. [Observed]
   - It survives at base, 43/43, and is killed at head on 1 row, `a file its reader may not read`. Both file systems give the same
     result.
   - With the default reporter, the failure shows only the change time differing: `-   "ctimeNs": 1792854122429087758n,` and
     `+   "ctimeNs": 1792854122429919597n,`, with `bytes`, `ino`, `link`, `mode` and `size` equal
     (`work/chmod-cycle-default-reporter.txt`).
   - I also re-ran D4-truncate (base killed on 10 rows, head on 11), M-every-form-drains-then-refuses (survived on both) and
     D1-with-memoized-reader (17 and 17). These match the record.
4. **My own mutants** (`tools/rev519_mutants.py`). Each inserts a body into `launchFormRefusal`'s unreadable branch, so the reader
   touches the marker and still refuses. Cells give the outcome, the rows killed and the tests passing. Each run restored and
   re-checked the bytes, and the tracked tree was clean after both runs. [Observed]

   | Mutant | tmpfs base | tmpfs head | ext4 base | ext4 head |
   |---|---|---|---|---|
   | R-chmod-cycle-rewrite (from the record) | survived, 43/43 | killed 1, 42/43 | survived, 43/43 | killed 1, 42/43 |
   | O1 rewrite a readable file's own bytes, unchanged | survived | killed 10 | survived | killed 10 |
   | O2 O1, then `utimes` restores atime and mtime; mode-000 file chmod-cycled | survived | killed 11 | survived | killed 11 |
   | O3 truncate to 0, refill with the same bytes | survived | killed 11 | survived | killed 11 |
   | O4 replace a file or directory with a new one of the same type, mode and bytes | killed 12 (new inode) | killed 12 | **survived** (inode number reused) | killed 12 |
   | O5 drain a FIFO and write its bytes back | survived | killed 1 (`a FIFO holding the marker's bytes`) | survived | killed 1 |
   | O6 chmod a non-link marker to the mode it already has | survived | killed 14 | survived | killed 14 |
   | O7 rename the marker away and back | survived | killed 17 | survived | killed 17 |
   | O8 through a link, chmod-cycle the target and rewrite its bytes unchanged | survived | **survived** | survived | **survived** |

   - The snapshot now kills in-place rewrites by every route I tried: a same-size rewrite with times restored (O2), a truncate
     and refill (O3), and a drain and refill (O5). It also kills a new-inode replacement where the inode number is reused (O4 on
     ext4).
   - It still misses two things. One is the drain alone (M-every-form). The other is any in-place change to a link's *target*
     that keeps its bytes (O8, and O1 on the link row; see N2).
   - O6 and O7 change nothing any reader could see, yet they fail. That is N1.
5. **The determinism probe, on a sample.** I ran `ctime_probe.mjs`, unchanged from the head, for 500 rounds each. [Observed]
   - On tmpfs `/tmp/r519-3/probe`, faithful rounds with a move were 0 for each of the 9 kinds. The rewrite arm gave
     "'ctimeUnchanged': 0, 'modeInodeOrSizeMoved': 0" and a smallest move of 39,434 ns.
   - On ext4 `/var/tmp/r519-ext4/probe`, faithful moves were again 0 for each of the 9 kinds. The rewrite arm gave
     "'ctimeUnchanged': 0" and a smallest move of 84,500 ns.
   - The 9 probe kinds cover the 17 rows' plant types:
     - the 10 readable regular files, the 4,097-byte one included, are "a readable file" or "an empty file";
     - the remaining six are one kind each: the mode-000 file, the directory, the dangling link, the link to the written
       marker ("a link to a readable file"), the link to `/dev/zero`, and the plain FIFO;
     - the FIFO holding bytes is "a FIFO holding bytes".
6. **A proxy for coarse timestamps** (`tools/coarse_proxy.mjs`, 2,000 rounds each). [Observed]
   - Two files were planted back to back with no stat between them, then stat'ed.
     - tmpfs: "pairsWithEqualCtime":1999, with plants a median 32,081 ns apart.
     - ext4: "pairsWithEqualCtime":1998, with plants a median 105,930 ns apart.
   - The same chmod made right after an lstat left the change time equal in "chmodAfterLstatLeftCtimeEqual":0 of 2,000 rounds on
     each file system.
   - So on this host a change that no one has queried gets a shared coarse stamp. A change after an `lstat` gets a distinct
     fine-grained one. See N3.
7. **A scratch variant**, never committed (`work/variant-target-ctime.test.ts`, sha256
   `9815465501909b50279ab600e405f8f399d4b7b3165acc3dbe50cff314e283ec`). It adds the followed target's `ctimeNs` for a link whose
   target is a regular file. [Observed]
   - Unmutated, it passed 9 of 9 runs at 43/43.
   - It kills O1 on 11 rows instead of 10 and O8 on 1. The added row both times is `a symbolic link to the marker Syzygy writes`.
   - R-chmod-cycle-rewrite and O5 are unchanged.
8. **`npm run typecheck`** exits 0. [Observed] `tsc -b` covers `packages/polaris-dossier/src`, tests included.
9. **`python3 scripts/check_governance.py`** exits 0: "32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted".
   [Observed] Base gives the same totals. The only differing line is CG-2a, "2069 files examined" at base against "2070" at head.
   That is the new `mutants.py`: CG-2a scans `.py` files. Both runs report 0 findings.
10. **`@syzygy/polaris-dossier` project** (`npx vitest run --project @syzygy/polaris-dossier`): "Test Files  29 passed (29)",
    "Tests  1196 passed | 1 skipped (1197)". [Observed] The one skip is in `no-egress.test.ts`, which this change does not touch.
    I did not run the PROJECT-STATUS canonical battery. The PR's 110/0 is lane-reported, and I have not reproduced it.

## 4. Findings

None blocking.

### N1 — note, low. The helper's comment says "nothing that leaves the marker as it was moves the change time"; that is false as stated, on 17 of 17 rows

- **Evidence.**
  - [Observed] `launched.test.ts:35-36` reads: "Times are left out except the change time: a read moves the access time, and
    nothing that leaves the marker as it was moves the change time." The wording comes from the bead and from the #516 raw's
    option (a).
  - [Observed] O7, which renames the marker away and back, leaves every field a reader can see unchanged: name, inode, type, mode,
    size and bytes. It fails all 17 rows at head and survives at base (§3 item 4).
  - [Observed] O6, which chmods a non-link marker to the mode it already has, fails 14 rows at head and survives at base.
  - The PR's own record shows another case: D4-truncate truncates the empty file to 0 bytes and fails `an empty file` at the fix
    only. The bead calls this "a no-op truncate moves ctime".
  - [Observed] What is true is narrower: no read-only call moves the change time. The calls are `open` with `O_RDONLY`, `fstat`,
    `read`, `close`, `lstat`, `stat`, `readlink`, and a FIFO drain. The evidence is 2,346 asks at head, the probe's
    0-of-500-per-kind sample, and M-every-form surviving.
- **Failure scenario.** A maintainer reads the sentence as the boundary of what fails. Later a reader change adds a harmless-looking
  no-op, such as a `chmod` to the current mode, a rename away and back, or a truncate of an empty file, and the rows go red. The comment
  says that cannot happen to a marker left "as it was". The maintainer concludes the change time is flaky and drops `ctimeNs`,
  which brings back the R-chmod-cycle-rewrite survivor. The reverse reading is also wrong: a failure on `ctimeNs` does not mean the
  marker's content or mode changed. Neither reading fails open, because the reader is unchanged and every row still asserts
  `unreadable`.
- **Proposed fix.** Comment-only, test-only, no title change. Reword `:35-36` to: "Times are left out except the change time: a read
  moves only the access time, and any write, truncate, chmod, rename or link of the marker moves the change time, even one that
  puts back what it changed." Keep `:134-136`.

### N2 — note, low. The change time is the link's own, so an in-place change to a link's target that keeps its bytes still passes; the PR's residuals do not name it

- **Evidence.**
  - [Observed] `markerSnapshot` takes `ctimeNs` from `lstat`, which does not follow a link (`:38`). This is consistent with the
    old snapshot's `mode`, `ino` and `size`. Only `bytes` follows the link (`:41-42`).
  - [Observed] Two mutants survive the head on the row `a symbolic link to the marker Syzygy writes`, on both file systems (§3
    item 4):
    - O8 chmod-cycles the target and rewrites its bytes unchanged;
    - O1 rewrites the target's bytes unchanged through the link.
  - The PR body's "Residuals" names coarse timestamps, inode reuse and the drained pipe, and not this one.
  - Not fail-open: the reader opens with `O_NOFOLLOW` (`launched.ts:48`), so the row still reads `unreadable` whatever the
    target holds.
- **Failure scenario.** A reader mutation that follows the link and normalises the target in place, at the same bytes and mode,
  passes all 17 rows. The comment at `:134-136` reads as though such a reader cannot pass.
- **Proposed fix.** Either:
  - (a) Test-only: add the followed target's change time for a link to a regular file, as in the scratch variant (§3 item 7). The
    lines would be `const followed = stat.isSymbolicLink() ? fs.statSync(marker(dir), { bigint: true, throwIfNoEntry: false }) :
    undefined;` and `targetCtimeNs: followed?.isFile() ? followed.ctimeNs : null`. It does not follow to `/dev/zero`. It passed
    9 of 9 unmutated runs and kills O1 and O8 on that row.
  - (b) Name the residual in the dispositions record and in `:134-136`: "a link's target is compared by its bytes only".

### N3 — note, low (evidence precision). The coarse-timestamp residual reads "could"; on a kernel without multigrain timestamps the kill would usually not happen

- **Evidence.**
  - [Observed] On this host, two changes that no one queried, 32–106 µs apart, shared one change time in 1,999 of 2,000 pairs on
    tmpfs and 1,998 of 2,000 on ext4. A change right after an `lstat` moved it in 2,000 of 2,000 on each (§3 item 6).
  - [Inferred] The determinism that the probe and the record show therefore comes from the kernel's multigrain timestamps. The
    snapshot's own `lstat` marks the change time as queried, so the mutant's next change gets a fine-grained stamp. I believe
    multigrain timestamps landed in Linux 6.13, for tmpfs, ext4, xfs and btrfs [Inferred: from kernel history, not checked
    against kernel source].
  - [Inferred] A kernel or file system without them stamps every change from the coarse clock: 1 ms at `CONFIG_HZ=1000`, or one
    second on a file system with second granularity. R-chmod-cycle-rewrite's chmod lands within tens to hundreds of µs of the
    plant's last change [Inferred; for scale, two back-to-back plants in §3 item 6 were a median 32–106 µs apart]. So there the mutant would survive in most runs,
    not just "could".
  - [Observed] The PR body's residual says: "a rewrite that falls within one tick could leave `ctimeNs` unchanged … Hosted CI's
    kernel and TMPDIR file system are [Unknown: not checked]". The record stores the kernel (`7.0.0-38-generic`) and the TMPDIR
    file system (`tmpfs`).
  - [Observed] The unmutated rows cannot fail from this: a faithful ask moves no time at all, at any granularity. No row passes
    vacuously either: mode, inode, size, link, bytes and the `unreadable` state are all still asserted. Only the new predicate
    weakens.
  - Hosted CI runs only the unmutated file, so CI's kernel matters only if someone re-runs the mutants there. That kernel remains
    [Unknown].
- **Failure scenario.** The rule-6 record is re-run on a pre-6.13 kernel or on a second-granularity file system.
  R-chmod-cycle-rewrite is reported "survived" at the fix. That looks like a regression of this change, when it is the
  environment.
- **Proposed fix.** No code. In the dispositions record, restate the residual: "the change-time kill is deterministic only where the
  kernel and file system give multigrain timestamps (as on this host); elsewhere it holds only for a change that crosses a clock
  tick, which R-chmod-cycle-rewrite's usually does not." Any future re-run of the record should store the kernel and file system
  beside R-chmod-cycle-rewrite's outcome, as this record does. `tools/coarse_proxy.mjs` can serve as the environment check.

### N4 — note, informational. The inode-reuse residual can be upgraded from "Inferred, not run" to Observed: closed on ext4 at the head

- **Evidence.** [Observed] O4 replaces a regular file or directory with a new one of the same type, mode and bytes (§3 item 4).
  - With TMPDIR on this host's ext4, it survives at base, 43/43: inode numbers were reused on all 12 of its rows. It is killed at
    head on the same 12 rows.
  - On tmpfs it is killed at both, because each new inode has a new number.
  - The PR body says: "[Inferred, not run] … This host's tmpfs did not reuse inodes, so no mutant exercises that case."
- **Failure scenario.** None in the code. The dispositions would otherwise carry forward an "Inferred, not run" residual that is
  now Observed closed, up to the timestamp granularity of N3.
- **Proposed fix.** In the dispositions record, mark the inode-reuse residual Observed closed at the head, citing this review's
  `rev519-mutants-ext4.json` (O4).

### N5 — note, process. GP-Q0's owner notice for this class-4 change is not yet posted

- **Evidence.** [Observed] `bd comments syzygy-bpyt.10` has no notice for 8.30 or PR #519. AC3 asks for "Independent class-4 review
  and owner notice", and the PR body promises "a line in the cycle report".
- **Failure scenario.** The bead closes on this review alone, and the owner never hears of a class-4 change.
- **Proposed fix.** After merge, post the non-blocking notice on `syzygy-bpyt.10`, as was done for #516. It should give: the class-4
  ruling; the degenerate differential and its test-against-test stand-in; R-chmod-cycle-rewrite as the predicate's mutant; and N1
  to N4.

## 5. Every changed output

- [Observed] Product outputs: none.
  - `git diff --quiet ce322e1a 3fb73809 -- . ':(exclude)docs/evidence' ':(exclude)packages/polaris-dossier/src/launched.test.ts'`
    exits 0.
  - `launched.ts` has one digest at base, fix and head.
  - The `@syzygy/polaris-dossier` project passes, 1196 of 1197, with the one skip untouched.
- [Observed] Test outputs:
  - The file still has 43 tests: 43/43 at base and at head, unmutated.
  - Of the test file's 12 changed lines, 0 carry `it(`, `it.each(` or `describe(`, so no title changes.
  - The PR's "Tests: +0 ~0 -0" counts test definitions. The 17 rows' assertions change through the shared helper, which the PR
    body discloses ("The 17 launch-form rows assert more through the helper").
  - The test refuses more only for mutated readers.
- [Observed] Check outputs:
  - `check_governance` gives the same totals at base and head; its only changed line is CG-2a's examined count, 2069 to 2070,
    from the new `.py` file, with 0 findings on both.
  - Typecheck exits 0.
- [Observed] Tracked files: 6 of 3,336 at the head differ from the base. One is the test; five are new evidence files.

## 6. Verdict per acceptance criterion

- **AC1** ("markerSnapshot carries ctimeNs, and the :35-36 comment states what is and is not compared; Tests +0 ~0 -0 (helper
  only) or as measured, titles unchanged"): **met, with N1.**
  - `ctimeNs` is carried (`:38`, `:45`), and titles are unchanged.
  - The comment states what is compared, and that the access time is left out. Its reason for comparing the change time is wrong
    as stated (N1).
- **AC2** ("A recorded rule-6 run at the change's commit: R-chmod-cycle-rewrite survives at base and is killed at the fix; the
  existing D1, D3, D4 and T mutants are unchanged or stronger; the unmutated file passes"): **met.**
  - The record ran at `ab59b666`, whose test bytes equal the head's.
  - R-chmod-cycle-rewrite: survived at base, killed on 1 row at the fix, reproduced on two file systems.
  - D1 ×5, D3 and T: 17 → 17. D4: 10 → 11. M: survives on both, as stated. Unmutated: 43/43 on both sides, plus 20 repeats.
  - Each mutant stores `old`/`new`, the command, the full `base` and `commit`, and the subject's digest per side (rules 6 and 11).
  - The record's `asksPerRun: 51` and "of 17 rows" are constants in the harness, not measured, but they are correct (17 × 3).
- **AC3** ("Independent class-4 review and owner notice"): **review met (this raw, class 4 ruled); notice pending (N5).**

## 7. Test quality (the test-rigor bar)

- Bar 1, assert behaviour: met. The rows assert an observable post-condition on the disk, and they do it without the reader under
  test.
- Bar 4, no tautology: met. `before` is read from the disk by code that is independent of `launched.ts`.
- Bar 6, deterministic: met for the unmutated file (§3 item 1: 2,346 asks across tmpfs and ext4 under load). The new predicate's
  power to kill depends on the environment (N3), but that never makes a run flaky.
- Bar 7, a failure names the defect: met. The default reporter's diff shows the `ctimeNs` line (§3 item 3). The JSON reporter's
  first line truncates the field list ("…(4)"), which matters only for the records.
- Bar 10, growth governed: met. The change extends the existing shared helper, and adds no tests.
- The mutation thought experiment: the one plausible bug this still misses, apart from the stated drained pipe, is an in-place
  change to a link's target (N2).

## 8. Cleanup, and every file kept

- Deleted: the scratch clone (`rev-519/clone`), every TMPDIR this review made (`/tmp/r519-1` to `/tmp/r519-7` and
  `/var/tmp/r519-ext4`), the merge-preview branch, which lived only in the clone, and the transient vitest report. `ls` of
  `/tmp/r519-*` and `/var/tmp/r519-*` afterwards: "No such file or directory". No worktree under `.worktrees/` was touched,
  nothing was pushed, and no PR comment was made.
- One disclosure about the harness. `rev519_mutants.py` gained its `VARIANT_TEST` and `FROM_RECORD` options after the tmpfs and
  ext4 runs. The mutant bodies did not change. Each result file stores every mutant's `old`/`new` fragments, so the runs can be
  repeated from the results.
- Kept, under `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-519/` (sha256):
  - `tools/check_record.py` `2527dac90ad8e8328c8f8c521145d22328ce7a0457ba4eee5bcc7bc09a83a4a4`
  - `tools/pr-body-mutated.md` `633661f29bc2019202e03f00b9cba85eb80fc1c0d5ae780af32a72cc5c863879` (the checker's rule-6 fixture)
  - `tools/rev519_mutants.py` `00c9ea4e05a9da9a94b50dc61b2f28cea60ee8c7594cbb02f01c82e635671e6b`
  - `tools/repeat_head.py` `e4e9a7f5313e2cb416fe38f4fa94b0a8156c0b0a91b61a1eb999c7808924dbe3`
  - `tools/coarse_proxy.mjs` `053e3034b5368ca716fcdcae0868c6f0ef02c6e9ffafbb81a349e86e1097b2c3`
  - `tools/one_mutant_default_reporter.py` `5c037652a2a9d6fec7a3ece43f2b0892d52ccbb7ad326e57cfaa2de4cb351488`
  - `check-record-result.txt` `46d853886e847b2e3d20535c02ffff753b8afa5fb5b2753b81d801d350cae1c6`
  - `pr-body-live.md` `54ae7511fac72cfc586bca3f0b54e19c622a3b9e1020a73e52009faad5dc1156`
  - `rev519-mutants-tmpfs.json` `d75a5d338d65c479a68f08f272a2ed1288c2b00f3837a53b132d2a6d3c0036e7`
  - `rev519-mutants-ext4.json` `57b7ea6af12c29bfd4a66eca2627e4538719a1b70274c7072bdd6bb207ed7a77`
  - `rev519-record-sample-tmpfs.json` `9f8d26d68e778257a86ac1fbd0621304eaad2e024a801d2f55fd5ce775637010`
  - `repeat-head-tmpfs.json` `d3a0573172946330685b1ebcf044e4216a4f093e2e8d7ce18efe58904b7cc722`
  - `repeat-head-ext4.json` `509360898af5053294c88683681df1adff0235642ca1cd002931325d0ceebe0a`
  - `repeat-head-tmpfs-p12.json` `a91da51fa38cbb315a494d1a592f3cdc395c03f5d30bee614a809e767c591081`
  - `probe-sample-tmpfs.json` `0f3982140f302723c98130edaebd32ff97008c41b3959043d46b06c85735e3a6`
  - `probe-sample-ext4.json` `c3fd84f3fb7153f17660ed968310360f554b27e2ffc6f5fef7e88cfbf26403b1`
  - `coarse-proxy-tmpfs.json` `3edbb42b32389f66abbab69bad9ded4d90c548415117665b3d2c7412a7925aca`
  - `coarse-proxy-ext4.json` `e8372ec8c716c9e525b44f6e79fd9d899c9cfb0d43bb523a3175a76ce6f30dc7`
  - `variant-target-ctime-results.json` `ea1639bd28286a1a657cfe04b344762e1b8bec5865c756acda9697c1c4db847d`
  - `variant-repeat.json` `cf10a3cae1fcf283fe6aa35dbff707b207c351df1de978eeb37cce38c99b8794`
  - `npm-ci.log` `a0f50cd9e9b28453fbb424495e5d26b988f04bc97df44642aef34ed0241eb411`
  - `work/variant-target-ctime.test.ts` `9815465501909b50279ab600e405f8f399d4b7b3165acc3dbe50cff314e283ec` (scratch only)
  - `work/chmod-cycle-default-reporter.txt` `f2d8d131c9dcb0a775e574aa30463e4a2d6433cc8d7e9d2687bc9d0df163ca02`
  - `work/mut-tmpfs.log` `371e0b3ac1e6ca25388295fe51ab8166dc65d0bc5be336bcc705dc96d96a0682`
  - `work/mut-ext4.log` `a328e386ef39dd85ff72a2789b377284edb4ae53e420b3dab2bfa89b7d3ae96d`
  - `work/typecheck.log` `31dbaac564adfe71d4edc71bb923a043c0050b293ec18b1a8fc6a263ee0e4ffe`
  - `work/check-governance.log` `9a0f2a1f5e04782f3b225df0fabfddd58188989a99e1dd9824c28c344c76ecbc`
  - `work/check-governance-base.log` `aafcc37e73bba651babe0048403fba3ae5b9ed345dc56501da87e535fcc71ec0`
  - `work/dossier-project.log` `2fd6c3ae7e4700634a345fb9ca9d2551368dc3e3d209369020ceacb46a18917a`
  - `work/main-moved-files.txt` `b513d49b7ef0cbc73205443a29f8fb699ed1574ee813deb35092548ce54704f8` (ce322e1a..7de5dc40)
  - `work/main-now-files.txt` `0c9a14ab29afb6f74f339fae77452a0b9a56a1b657df6eb3f14bfd80488feb12` (ce322e1a..19c80e90)
  - `work/subject-files.txt` `5fcc5889cc94ea18acf8c1273aaaf0565147f5a643e314ddca685e679f1cd55d`
