# R-GP-IMPL-LAUNCH-FORM-SNAPSHOT-1 — CC-REV-1 implementation review of syzygy-bpyt.8.24, round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: bddbbf6c
Subject: r1-review.diff sha256 ad5c93e720b5a1ac43436e626467227b29aa694dc2faba7ee0727760b2538b7c

Reviewer: a fresh-context CC-REV-1 reviewer that did not author the change. Date: 2026-10-22. PR #516, branch
`agent/syzygy-bpyt.8.24`, reviewed commit `bddbbf6c3ef2cd3fff2b73946356c57fc5bd5353`, base (merge base with main)
`9a30237ed700e6579f3fcc1c6292e6c759861c3f`. No Butlers or other observed-repository content was read. No credential file was
opened. Nothing in the repository, its worktrees, the PR or `bd` was modified.

Summary: no blocking finding, two notes.
- N1 (low): the snapshot leaves out `ctime`, for a reason that holds only for the access time. An in-place rewrite of the
  unreadable (mode 000) file therefore passes, and the code comment names only the pipe residual.
- N2 (process): I confirm class 4. GP-Q0's owner notice for #516 is a landing action.

The oracle reads the disk without calling any `launched.ts` code. It catches every transition of the marker toward `absent`
or `launched` on all 17 rows, whatever the reader remembers. Both departures from the bead's letter are sound and test-only.

## 1. Subject identity checks

1. [Observed] The subject digest matches. In a scratch clone, `git diff 9a30237e bddbbf6c --output=<file>` gives a file whose
   sha256 is `ad5c93e720b5a1ac43436e626467227b29aa694dc2faba7ee0727760b2538b7c`. The brief's `r1-review.diff` hashes to the
   same value.
2. [Observed] The history is as the brief says. `bddbbf6c` has parents `896ca36e` and `9a30237e`. The first-parent chain is
   `896ca36e` (evidence) → `5c2b34da` (test) → `a0406967` (#511's merge).
   - `git diff a0406967 896ca36e` also hashes to `ad5c93e7…2538b7c`. So the merge of main brought only main's bytes, as the
     PR body says.
3. [Observed] `launched.test.ts` is identical at the record's commit and at the head.
   - Its git blob is `c6081889` at both `5c2b34da` and `bddbbf6c`, sha256
     `e01b040a5f74f044169d46adccde476814187b5d44fa7bfcb44ef082ca2fa740`.
   - At `a0406967` and `9a30237e` it is `59567e9a`, sha256 `1243441dfdc7216015d48b1431327d1338d9d54ea71f25439cf69fe6158c1141`.
   - These two digests equal the record's `testSha256.fix` and `testSha256.base`.
4. [Observed] `launched.ts` has blob `8012623e` and sha256 `c7a25b8b45fe12e2add7874f88d46b2bad1eef16ffa4a17e2464d5c671424921`
   at `a0406967`, `5c2b34da`, `9a30237e` and `bddbbf6c`. That equals the record's `readerSha256`.
5. [Observed] I compared blobs over the full trees of `9a30237e` and `bddbbf6c` (`tools/tree_compare.py`, `git ls-tree -r -z`).
   The union holds 3312 paths and 2 differ:
   - `packages/polaris-dossier/src/launched.test.ts`, changed;
   - `docs/evidence/launch-form-snapshot-oracle-mutants-2026-10-22.json`, added.

   `git diff --name-status` lists the same 2 paths.
6. [Observed] The record's sha256 is `a0d7acbc8f7e9e4577cfc077b9988e9d064e791b5b49860d391246fbcadc5dc7` (106,821 bytes).
   `git grep -F launch-form-snapshot-oracle bddbbf6c` finds 0 hits, so no tracked file cites it or reads it at the head.
7. [Observed] `gh pr view 516` gives `headRefOid` `bddbbf6c3ef2cd3fff2b73946356c57fc5bd5353` and state `OPEN`. The hosted run
   checked out `refs/remotes/pull/516/merge`, and its log says: "HEAD is now at 06791d63 Merge
   bddbbf6c3ef2cd3fff2b73946356c57fc5bd5353 into 9a30237ed700e6579f3fcc1c6292e6c759861c3f". [Inferred] Because `bddbbf6c`
   already contains `9a30237e`, that merge tree is `bddbbf6c`'s tree.

## 2. Clauses relied on, and the class ruling

Quoted at `bddbbf6c`:

- CC-REV-1, `.syzygy/governance/policies/craft-and-care/review-and-documentation.md`:
  - `:37`: "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
  - `:49`: "**The change record states** which classes the change touches, or "none,""
  - `:51`: "**A reviewer or the owner** may reclassify at any time."
- GP-Q0, `.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`:
  - `:62`: "**Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4
    (security), and class-6 pull requests that remove an endpoint."
  - `:64-66`: "an old-versus-new differential over a mutated-record corpus that includes records with altered prose;" / "a
    rule-6 mutant for each predicate;" / "a non-blocking owner notice in the cycle report."
- `AGENTS.md`:
  - rule 6, `:126-127`: "Mutate the input and confirm the check fails, per predicate, before trusting it";
  - rule 11, `:134-135`: "An evidence record names its subject and the subject's digest; a record that names neither cannot be
    re-checked against the bytes it describes."
  - the guardrail at `:263-265`: "A rule-6 evidence record must store each mutant's `old`/`new` fragment and the commit it ran
    at; ids and outcomes alone are not re-runnable, and a rebase-merge leaves the recorded commit reachable from no ref."
- The test-rigor bar, `th-engineering/subskills/test-rigor/SKILL.md`:
  - bar 4, `:65-68`: "**No tautologies** — A test that mirrors the implementation's logic to compute its expected value, or that
    asserts a mock returned what the mock was told to return, verifies nothing. Expected values are literals or independently
    derived."
  - bar 6, `:79-80`: "**Deterministic or quarantined** — A test that fails intermittently is worse than no test".
- The reader under test, `packages/polaris-dossier/src/launched.ts:34-35`: "No caller may treat `unreadable` more leniently than
  `launched`: whether Syzygy started the run's sessions cannot be told, so SEC-3's instruction is never given and no launch form
  counts."

**Class ruling: class 4 (security).**
- The PR body states "**CC-REV-1 classes:** none in the code". It also says that the #506 and #511 reviewers ruled changes to
  these rows class 4.
- The 17 changed bodies are the reader's own rule-6 kill evidence for the fail-closed launched-marker reader. `launched.ts:34-35`
  ties that reader to SEC-3, which falls under `:37`'s "anything under SEC-1…SEC-5".
- Under `:51` I rule the change **class 4**, as both earlier reviewers did.
- I do not rule class 3. "Snapshot" here is a test fixture of one file's metadata, not the observation snapshot composition that
  class 3 names.

**GP-Q0's three checks, applied to a test-only change:**
1. **Differential (`:64`).** Degenerate.
   - No product byte differs (§1 item 5). Any old-versus-new differential of a product reader over any corpus, prose-altered
     records included, is therefore identical by construction. Showing the code identical answers the check more strongly than
     any finite corpus could.
   - What carries information here is old test against new test over a mutant corpus. The record provides that: 9 mutants,
     each at base and at the fix. So does this review's corpus. It runs 9 mutants at base and at the fix, adds
     M-every-form-drains-then-refuses at the fix, and runs 3 mutants and the control against a `ctime` variant of the test (§3
     items 4 and 5).
   - No record-reading code changed, so "records with altered prose" has no object.
2. **A rule-6 mutant for each predicate (`:65`).** Met.
   - The change adds one predicate, the snapshot equality at `launched.test.ts:139`, called from three asks (`:144`, `:145`,
     `:146`).
   - [Observed] At the fix, D1-terminal-only, D1-bang-only and D1-syzygy-launched-only fail at `:139`, called from `:144`, `:145`
     and `:146` respectively, on 17 rows each (§3 item 4).
   - What the predicate adds beyond the state assertion is shown by five mutants. Each survives at base and is killed at the fix:
     D1-with-memoized-reader, D4-truncate, R-same-size-rewrite, R-fill-dangling-target and R-fifo-to-empty-file.
3. **Owner notice (`:66`).** Not yet posted, which is expected before landing. See N2.

## 3. What I ran, and the results

All runs were in scratch clones under `…/rev-516/`, at `bddbbf6c`, under Node `v24.6.0`. Each test run used `CI=1` and a
private `TMPDIR` (`/tmp/r516-1` to `/tmp/r516-8`; `/tmp/r516-4` held only the stat probe). The host's one-minute load
average was 75 to 124 throughout. `uptime` read "load average: 75.28, 78.87, 74.66" at 21:07 and "load average: 113.67,
110.04, 97.30" at 21:27, and the re-runs logged `loadAfter` from 91.31 to 123.73.

1. **Setup.**
   - `git clone` of the local repository, then `fetch agent/syzygy-bpyt.8.24`, then `checkout bddbbf6c`, then `npm ci` (exit=0).
   - A second clone of that clone, `mclone`, for mutants, with its own `npm ci` (exit=0). This kept the full-project run from
     sharing files with mutated sources.
2. **`launched.test.ts` at the head, unmutated.** [Observed] 43/43 on each of 7 local runs of the head's bytes:
   - the first run: "Tests  43 passed (43)";
   - the harness control `none/fix`, 5 times;
   - the full-project run ("launched.test.ts: {'passed': 43}").

   Two scratch variants of the head's test, `none/fixctime` and the per-row `probe` (§3 items 5 and 6), also passed 43/43. So
   did `none/base` at `a0406967`'s test. Hosted CI passed it too: "packages/polaris-dossier/src/launched.test.ts (43 tests)".
3. **The record, checked by script** (`tools/inspect_record.py`, `tools/check_record.py`, `tools/record_errors.py`; it was never
   read whole). [Observed]
   - It names its subject (`["packages/polaris-dossier/src/launched.test.ts"]`), `testSha256` for base and fix, and
     `readerSha256`, which meets rule 11.
   - It gives `base` `a04069678c02881cd41a25b850e14f79d581c083` and `commit` `5c2b34daad45588d1f54e31baee4a962f0abade7` in full,
     node `v24.6.0`, and the command.
   - Unmutated, both sides read `{"numTotalTests": 43, "numPassedTests": 43, "numFailedTests": 0}`.
   - It holds 18 mutant entries, 9 mutants × 2 sides. Each stores `edits` (`file`/`old`/`new`), `exitCode`, `counts`,
     `failedTests` (`test`, `firstErrorLine`), `failedRows`, `blocked` and `restored`. All 18 read `blocked: false` and
     `restored: true`, and `trackedTreeCleanAfter` is `true`.
   - Every `old` fragment occurs exactly once in the base file it edits.
   - I transcribed Appendix A of `R-GP-IMPL-LAUNCH-FORM-POSTCONDITION-1-RAW.md` (`:373-398`) independently into
     `tools/rev516_mutants.py`. The record's `edits` equal my transcription byte for byte for **9 of 9** mutants, including the
     REMOVE-ANY `unlinkSync` fallback (N2 of #511) and the memoized reader's two edits. So the D1-with-memoized-reader mutant is
     faithful to Appendix A.
   - The record's summary matches the PR body's table. At the fix, D1-with-memoized-reader fails 17 rows, each with a first
     line of the form "AssertionError: expected null to deeply equal { mode: …, ino: …, …(3) }", which is the snapshot. D4-truncate
     fails 10 rows. M-every-form-drains-then-refuses survives.
4. **This review's mutants** (`tools/rev516_mutants.py`). Each mutant edits exact fragments, each occurring exactly once. Each
   runs `npx vitest run --project @syzygy/polaris-dossier --reporter=json --outputFile=<…> packages/polaris-dossier/src/launched.test.ts`
   in its own process group with a 300 s timeout, then restores the files and checks their digests.
   - The base side writes `launched.test.ts` at `a0406967` (sha256 `1243441d…`) over the clone's copy. The fix side uses the
     head's copy (sha256 `e01b040a…`).
   - The failing lines come from the stored vitest reports (`tools/frames.py`): the first and second `launched.test.ts` frames.
   - [Observed] Every run read `restored: true` and `timedOut: false`, and the harness ended "tracked tree clean after: True".

   | Mutant | Base (`a0406967` test) | Fix (`bddbbf6c` test) | Fix: failing line → calling ask |
   |---|---|---|---|
   | none (control) | survived, 43/43 | survived, 43/43 | — |
   | D1-with-memoized-reader (Appendix A) | **survived**, 43/43 | **killed**, 17 rows: "expected null to deeply equal { mode: 33188, ino: N, …" (10), mode 16877 (1), 41471 (3), 4516 (2), 32768 (1) | `139 → 144` × 17 |
   | D1-terminal-only (Appendix A) | killed, 17 rows: "expected 'absent' to be 'unreadable'", `124 → 128` | killed, 17 rows, on the snapshot | `139 → 144` × 17 |
   | D1-bang-only (Appendix A) | killed, 17 rows, `124 → 129` | killed, 17 rows, on the snapshot | `139 → 145` × 17 |
   | D1-syzygy-launched-only (Appendix A) | killed, 17 rows, `124 → 130` | killed, 17 rows, on the snapshot | `139 → 146` × 17 |
   | D4-truncate (Appendix A) | **survived**, 43/43 | **killed**, 10 rows | `139 → 144` × 10 |
   | R-same-size-rewrite (own) | **survived**, 43/43 | **killed**, 10 rows | `139 → 144` × 10 |
   | R-fill-dangling-target (own) | **survived**, 43/43 | **killed**, 1 row (`a dangling symbolic link`) | `139 → 144` × 1 |
   | R-fifo-to-empty-file (own) | **survived**, 43/43 | **killed**, 2 rows (`a FIFO`, `a FIFO holding the marker's bytes`) | `139 → 144` × 2 |
   | R-chmod-cycle-rewrite (own) | survived, 43/43 | **survived**, 43/43 | — (N1) |
   | M-every-form-drains-then-refuses (Appendix A) | not run | survived, 43/43 | — (the stated limit) |

   This review's own mutants each replace REFUSAL-LINE with REFUSAL-WITH(body), as Appendix A defines them. Their bodies:
   - **R-same-size-rewrite:** `try { const p = path.join(runDir, RUN_LAYOUT.launched); const s = fs.statSync(p); if (s.isFile() && s.size > 0) fs.writeFileSync(p, ' '.repeat(s.size)); } catch { /* reviewer mutant */ }`.
     It rewrites the file in place, through a link if there is one, at the same size, inode and mode.
   - **R-chmod-cycle-rewrite:** `try { const p = path.join(runDir, RUN_LAYOUT.launched); const s = fs.lstatSync(p); if (s.isFile() && (s.mode & 0o777) === 0) { fs.chmodSync(p, 0o600); fs.writeFileSync(p, ' '.repeat(s.size)); fs.chmodSync(p, 0o000); } } catch { /* reviewer mutant */ }`.
   - **R-fill-dangling-target:** `try { const p = path.join(runDir, RUN_LAYOUT.launched); if (fs.lstatSync(p).isSymbolicLink()) { const t = fs.readlinkSync(p); if (!fs.existsSync(t)) fs.writeFileSync(t, '{"format": "polaris-dossier-launched/1"}'); } } catch { /* reviewer mutant */ }`.
   - **R-fifo-to-empty-file:** `try { const p = path.join(runDir, RUN_LAYOUT.launched); if (fs.lstatSync(p).isFIFO()) { fs.unlinkSync(p); fs.writeFileSync(p, ''); } } catch { /* reviewer mutant */ }`.

   The rows D4-truncate and R-same-size-rewrite kill are the same 10 [Observed]:
   - `JSON null`, `a JSON array`, `a JSON string`, `a byte-order mark before the marker`, `a format that is not a string`,
     `another format`, `invalid JSON`, `no format`;
   - `a marker of 4097 bytes, one past the bound`;
   - `a symbolic link to the marker Syzygy writes`.

   The PR's per-form D1 variants and the memoized reader reproduce exactly. At the fix, every D1 variant dies first on the
   snapshot (`:139`) and never on a timeout or a setup failure. Of the 32 harness runs (24 mutant runs and 8 controls or
   probes), 0 timed out. Of the 24 mutant runs, 0 failed a test outside the 17 launch-form rows.
5. **The proposed strengthening, probed (N1).** In a scratch edit only, the side `fixctime` adds
   `ctimeNs: fs.lstatSync(marker(dir), { bigint: true }).ctimeNs` to the snapshot's return. [Observed]
   - none: survived, 43/43. So over the 51 asks, neither the faithful reader nor the snapshot moved `ctime`.
   - R-chmod-cycle-rewrite: **killed**, 1 row (`a file its reader may not read`), at `139 → 144`. This also confirms that the
     mutant did take effect in the fix-side run where it survived.
   - M-every-form-drains-then-refuses: survived, 43/43. A drain does not move `ctime` either.
   - D4-truncate: killed on 11 rows, one more than at the fix: `an empty file`. [Inferred from that kill] Truncation updates the
     times even when the size does not change, so the strengthened snapshot also treats a no-op write as a change.
6. **What the snapshot holds, per row** (the `probe` side, a scratch edit that logs each ask's `before`). [Observed] 51 records:
   17 rows × 3 forms.
   - Fields `mode`, `ino`, `size`, `link` and `bytes` are present on **17 of 17** rows.
   - `bytes` is non-null on **11**: the 8 non-empty JSON-ish files, the empty file (0 bytes), the 4097-byte marker, and the link
     to the marker Syzygy writes (231 bytes, followed).
   - `link` is non-null on **3**: the dangling link, the link to the marker, and `/dev/zero`.
   - `bytes` is null on 6: the directory, the dangling link, `/dev/zero`, both FIFOs, and the mode-000 file.

   This matches the PR body's "lstat on all 17 rows, bytes on 11 and a link on 3".
7. **FIFO and stat probe** (`tools/fifo_probe.mjs`, which imports no repository code). It is a JS transcription of the snapshot's
   calls on tmpfs (`df -T /tmp`: "tmpfs"). [Observed]
   - On a FIFO holding the 231 marker bytes, `lstatSync`, `statSync` and `lstatSync` again took 76 µs in all. Afterwards the pipe
     still held 231 bytes. `statSync(...).isFile()` was `false` and `lstat` size was `0`. So the snapshot neither blocks on nor
     drains a FIFO.
   - After a 231-byte drain, a FIFO's `mode`, `ino`, `size`, `ctimeMs` and `mtimeMs` were all unchanged. A drain is invisible to
     any stat field.
   - The reader's own read (`O_RDONLY|O_NOFOLLOW|O_NONBLOCK`, then `readSync`), followed by `readFileSync`, left a regular
     file's `ctimeMs` and `mtimeMs` unchanged.
   - A chmod-cycle same-size rewrite of a mode-000 file left `mode`, `ino` and `size` equal and changed `ctimeMs` and `mtimeMs`.
     The test cannot read that file ("EACCES").
   - An unlink and recreate at the same name got a new inode on tmpfs ("reused": false, one trial).
8. **The `@syzygy/polaris-dossier` project, full**, at the head (`--reporter=default --reporter=json`). [Observed]
   - Result: "Test Files  9 failed | 20 passed (29)" and "Tests  70 failed | 1126 passed | 1 skipped (1197)".
   - The failures, by file and first error line from the log (`tools/log_failures.py`):

     | File | Failures | First error |
     |---|---|---|
     | `gate-acts.test.ts` | 37 | "Error: Test timed out in 5000ms." |
     | `screen.test.ts` | 11 | the same |
     | `start-gates.test.ts` | 10 | the same |
     | `close.test.ts` | 4 | the same |
     | `run-evidence.test.ts` | 3 | the same |
     | `execution-flags.test.ts` | 1 | the same |
     | `render.test.ts` | 1 | the same |
     | `waiting-sessions.test.ts` | 1 | the same |
     | `git-object-reader.test.ts` | 1 | the same |
     | `git-object-reader.test.ts` | 1 | "Error: no refusal within 30000 ms" |

     That is 69 timeouts of 5000 ms, plus one 30 s time bound, over 70 failures.
   - None of the 9 files is touched by this PR (§1 item 5), and `launched.test.ts` passed 43/43.
   - The one skip is `no-egress.test.ts`, because strace is unavailable on this host.
   - [Inferred] These are the load timeouts tracked as `syzygy-bpyt.4.13`, which the brief names. The PR body's own run at load
     about 70 saw 25 such failures over 6 of these files.
   - Each failing file was re-run alone, sequentially (`tools/rerun_files.py`). The results are in §3 item 8a.
8a. **Re-runs of the failing files, each alone and in sequence**, at load 91 to 124 (`loadAfter` per file). [Observed] Counts
    are from each file's JSON report; error lines are from its log (`tools/log_failures.py`).

    | File | Tests | Failed | Failure kind |
    |---|---|---|---|
    | `gate-acts.test.ts` | 133 | 0 | — |
    | `screen.test.ts` | 110 | 0 | — |
    | `waiting-sessions.test.ts` | 116 | 0 | — |
    | `render.test.ts` | 42 | 0 | — |
    | `start-gates.test.ts` | 104 | 3 | "Error: Test timed out in 5000ms." × 3 |
    | `git-object-reader.test.ts` | 60 | 4 | "Error: Test timed out in 5000ms." × 3, "Error: no refusal within 30000 ms" × 1 |
    | `execution-flags.test.ts` | 10 | 2 | "Error: Test timed out in 5000ms." × 2 |
    | `close.test.ts` | 9 | 1 | "Error: Test timed out in 5000ms." × 1 |
    | `run-evidence.test.ts` | 4 | 1 | "Error: Test timed out in 5000ms." × 1 |

    The failures fell from 70 to 11, and every one of the 11 is a time bound. 4 of the 9 files went green. No failure of any
    other kind appeared in either run.
9. **Hosted CI on the PR.** `gh pr checks 516`: "checks	pass	2m0s" (governance-docs) and "node	pass	4m17s" (node-ci). Both runs
   are on `headSha` `bddbbf6c3ef2cd3fff2b73946356c57fc5bd5353`, `conclusion` `success`.
   - The node job's `npm test` step reads "Test Files  232 passed | 3 skipped (235)" and "Tests  5108 passed | 5 skipped (5113)".
   - `launched.test.ts` reads "(43 tests)", passed.
10. **Other checks at the head.**
    - `npm run typecheck` (`tsc -b` over the ten projects, in `mclone` at `bddbbf6c` while it was clean): no diagnostic after npm's two header lines, exit=0.
    - `python3 scripts/check_governance.py`: "32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted", exit=0.
    - `python3 scripts/check_quotations.py`: exit=0.
    - I did not run the PROJECT-STATUS canonical battery; the lane reports `commands=110 nonzero=0`. [Unknown] to this review.
11. **Test names.** [Observed] From the unmutated vitest reports, base and fix each have 43 test names, 43 distinct, and the sets
    are equal. 17 of the names are launch-form rows. The diff touches no title line, so the delta is `+0 ~17 -0`.

## 4. Findings

No finding is blocking.

### N1 — note, low. The snapshot leaves out `ctime`, for a reason that holds only for the access time, so an in-place rewrite of the unreadable file passes; the comment names only the pipe residual

- **Evidence.**
  - [Observed] The helper's comment (`launched.test.ts:35-36`) says: "Times are left out: a read moves the access time, and neither
    time is what the snapshot checks." The reason covers `atime`. It does not cover `ctime` (or `mtime`).
    - On tmpfs, neither a faithful read nor a FIFO drain moves those (§3 item 7).
    - With `ctimeNs` added, the unmutated file passes 43/43 (§3 item 5).
  - [Observed] R-chmod-cycle-rewrite survives at the fix, 43/43 (§3 item 4). It chmods the mode-000 file to 0600, rewrites it
    at the same size, and chmods it back. `mode`, `ino` and `size` are unchanged and the bytes are never read. With `ctimeNs` in
    the snapshot it is killed on that row (§3 item 5).
  - [Inferred: not run, since this host's TMPDIR is tmpfs, which did not reuse the inode in one trial (§3 item 7)] On a
    filesystem that reuses inode numbers after unlink, for example ext4, a few same-type replacements would also pass. These are
    replacements at the same mode and size of a row whose bytes are not compared: the mode-000 file, the plain `a FIFO` and the
    directory. Whether hosted CI's TMPDIR reuses inode numbers is [Unknown: not checked]. A new inode carries a new `ctime`, so
    `ctime` would close this too, up to timestamp granularity.
  - [Observed] The `asked` comment (`launched.test.ts:132-134`) says: "So a reader that removes, replaces or truncates an
    unreadable marker cannot pass here, whatever it remembers. The snapshot reads no FIFO's bytes and cannot read an unreadable
    file's, so a reader that only drains a pipe still passes." It draws the pipe consequence and not the unreadable-file one,
    which the PR body's "Residuals" does state.
    - The comment is otherwise accurate, and it no longer says "as it found it". "As the test saw it" is bounded by the
      helper's listed fields.
    - "Removes" holds on 17 of 17 rows, and "truncates" on every row where a truncate can change bytes (§3 item 4).
    - "Replaces" holds on tmpfs (R-fifo-to-empty-file in this review, D3-repair-to-launched on 17 rows in the record), and it is
      the qualified part.
  - Not fail-open, by the reader's own conditions (`launched.ts:43-63`) [Inferred: argued, not mutated exhaustively]:
    - `absent` needs ENOENT at the name, which makes the snapshot `null` on every row.
    - `launched` needs a regular file at the name that is readable and at most 4096 bytes and parses to the format. From any of
      the 17 plants, that needs a change of type bits or permission bits (`mode`), of `size`, or of compared bytes.
    - Every survivor this review found (R-chmod-cycle-rewrite, M-every-form-drains-then-refuses) leaves the run `unreadable`.
- **Failure scenario.** A maintainer reads the comment "removes, replaces or truncates … cannot pass" and takes the row as proof
  that an ask never writes the marker. A reader change then "normalises" an unreadable marker in place, for example rewriting a
  mode-000 file's bytes while restoring its mode. The row stays green on any filesystem. Where inodes are reused, it also stays
  green when the file is replaced outright. Within the reader's three states nothing fails open. The row's guarantee is narrower
  than its comment reads.
- **Proposed fix.** Test-only, `~17`, titles unchanged. Either:
  - (a) Add `ctimeNs: fs.lstatSync(marker(dir), { bigint: true }).ctimeNs` to `markerSnapshot`'s return (`launched.test.ts:44`),
    as §3 item 5 probed. Reword `:35-36` to "Times are left out except the change time: a read moves the access time, and nothing
    that leaves the marker as it was moves the change time", and keep `:134` as is. This kills R-chmod-cycle-rewrite and closes
    the inode-reuse case, and it keeps M-every-form as the one stated limit.
    - It also counts a no-op truncate of the empty file as a change (D4 then kills 11 rows).
    - [Inferred] On a kernel without fine-grained timestamps, a rewrite within one timestamp tick could leave `ctime` equal. That
      weakens the kill, never the unmutated pass.
  - (b) Keep the snapshot. Reword `:35-36` to "Times are left out: a read moves the access time", and make `:134` name both
    residuals: "…so a reader that only drains a pipe, or rewrites an unreadable file in place at its size and mode, still passes;
    where inode numbers are reused, so does one that replaces such a file with one of the same type, mode and size."

  I recommend (a). It is one field and a comment, and it makes the comment's "replaces" hold whether or not the filesystem reuses
  inode numbers, up to timestamp granularity. Either way, re-run the change's rule-6 record with R-chmod-cycle-rewrite added
  (body in §3 item 4).

### N2 — note, process. I confirm class 4; GP-Q0's owner notice for #516 is not yet posted

- **Evidence.**
  - [Observed] The PR body asks for "a class-4 review and a non-blocking GP-Q0 owner notice". I rule class 4 under CC-REV-1
    `:51` (§2).
  - [Observed] `bd comments syzygy-bpyt.10` (649 lines, read only) carries the #511 notice. It begins "[owner notice,
    coord-9297eba3, 2026-10-22] syzygy-bpyt.8.18 merged (PR #511," and names `syzygy-bpyt.8.24` as the follow-up. It has no
    notice for #516, as expected before landing.
- **Failure scenario.** The cycle report omits #516, and GP-Q0's notice trail has a gap for a class-4 change.
- **Proposed fix.** At landing, the coordinator posts one notice for #516 on `syzygy-bpyt.10`. It should say:
  - test-only, and class 4 by reviewer ruling;
  - no production byte changed (2 of 3312 paths differ, the test and its record);
  - the memoized-reader removal is now killed in the reader's own file, on 17 of 17 rows, by an oracle that asks no reader;
  - the GP-Q0 checks as in §2;
  - this review's verdict and N1.

## 5. Every changed output, or the evidence that there is none

None. [Observed]
- **Method 1.** `git diff --name-status 9a30237e bddbbf6c` lists 2 paths: `A docs/evidence/launch-form-snapshot-oracle-mutants-2026-10-22.json`
  and `M packages/polaris-dossier/src/launched.test.ts`.
- **Method 2.** A blob comparison over all 3312 paths in the union of the two trees finds 2 that differ, the same 2. **Non-test
  files changed outside `docs/evidence/`: 0 of 3312.**
- `launched.ts` is byte-identical at base, fix and head (§1 item 4).
- The new JSON is read by no code and cited by no tracked file at the head (§1 item 6).
- So no rendered byte, wire format, refusal string, exit code, digest-bound artifact, or consent, security or retention decision
  changes. That is the GP-Q0 Part 1 sense of "behavior-preserving".

## 6. Verdict per acceptance criterion

- **AC1 — met, and exceeded.** The bead's text: "Each non-FIFO launch-form ask asserts the marker's lstat (and bytes, where
  readable) unchanged, and every ask still asserts unreadable; Tests +0 ~17 -0, titles unchanged."
  - [Observed] All 17 rows assert the snapshot at `:139`, then `unreadable` at `:140`, for each of three asks. Bytes are taken on
    11 rows (§3 item 6), and the delta is `+0 ~17 -0` with equal name sets (§3 item 11).
  - Departure (a) extends the `lstat` part to the 2 FIFO rows. It is sound:
    - `lstat` and `stat` neither open nor drain a FIFO (§3 item 7).
    - It is what kills D1-with-memoized-reader on those 2 rows: their first error is "expected null to deeply equal { mode:
      4516, …". [Inferred] Without (a), the memoized reader would pass them, since the state assertion asks the memoized
      reader.
    - It kills R-fifo-to-empty-file, which survives at base.
  - Departure (b) adds `readlink` and the bytes followed through a link. It is sound:
    - `statSync` gates the read on a regular file, so `/dev/zero` is never opened (`bytes` null, §3 item 6).
    - It is what kills D4-truncate and R-same-size-rewrite on `a symbolic link to the marker Syzygy writes`, and
      R-fill-dangling-target on `a dangling symbolic link`.
  - Both departures stay test-only (§5).
- **AC2 — met.** The bead's text: "Recorded rule-6 run at the change's commit, launched.test.ts alone: D1-with-memoized-reader,
  D1-terminal-only, D1-bang-only, D1-syzygy-launched-only and D1-any-remover each killed, with old/new fragments and the commit."
  - [Observed] The record ran at `5c2b34da`, the change's commit, whose test bytes equal the head's (§1 item 3).
  - It ran against `launched.test.ts` alone, with full fragments and the full commit. The five acceptance mutants are each
    killed at the fix on 17 rows.
  - I reproduced four of the five (all but D1-any-remover) and got the same outcomes, plus D4-truncate (§3 item 4).
  - The repository lands PRs by merge commit (`9a30237e` is "Merge pull request #512"), so `5c2b34da` stays reachable. The
    test digest `e01b040a…` anchors the record either way.
- **AC3 — met, on hosted CI.** The bead's text: "@syzygy/polaris-dossier project green."
  - [Observed] Hosted node-ci on the PR merge ref passed: "Tests  5108 passed | 5 skipped (5113)".
  - Locally, at load 75 to 124, the project gave 70 failures, all in 9 files this PR does not touch: 69 timeouts of 5000 ms and
    one 30 s bound. `launched.test.ts` passed 43/43.
  - Re-run alone, the same 9 files fail 11 tests, all time bounds, and 4 of the files pass whole (§3 item 8a). The failing set
    moves between runs and shrinks when a file runs alone.
  - [Inferred] The local reds are `syzygy-bpyt.4.13` load timeouts, not this change. This change edits none of those files and
    no product file, and hosted CI is green over the whole project.
- **AC4 — met for the review; the notice is a landing action.** The bead's text: "Class 4 (the PR 506 and PR 511 reviewers'
  ruling on these rows): independent review and owner notice." This is the independent review, and it rules class 4. The owner
  notice is N2.

## 7. Test quality

- **Bar 4, independence: met.**
  - `markerSnapshot` (`launched.test.ts:37-45`) calls only `fs.lstatSync`, `fs.statSync`, `fs.readFileSync` and `fs.readlinkSync`
    on `marker(dir)`. `marker` is the test's own `path.join(dir, 'launched.json')` (`:19`). That is a literal, equal to
    `RUN_LAYOUT.launched` at `state-directory.ts:29` but not imported from it.
  - No `launched.ts` export is called between the two snapshots except the ask under test.
  - The expected value `before` is derived from the disk, not from the reader. The memoized-reader kill (§3 item 4) is the
    behavioural proof.
  - [Inferred] One residual is outside any honest-defect mutation model. The test and the reader share the `node:fs` module
    object, so a reader that patched `fs.lstatSync` could deceive the snapshot. No such code exists, and I do not count it.
- **Bar 1: met.** The new assertion pins an observable outcome, the marker on disk after the ask, and not a call sequence.
- **Bar 6, determinism: met.**
  - Every operation is synchronous. The compared fields (`mode`, `ino`, `size`, the link text and the bytes) are not moved by
    the reader's read or by the snapshot's own read (§3 item 7). No time field is compared.
  - [Observed] Each of the 7 unmutated local runs of the head's bytes passed at load 75 to 124, and so did CI. In each of the
    24 mutant runs, every failure was a launch-form row, and at least 26 of the 43 tests passed.
  - **Cleanup on failure.** After the first 20 harness runs, 11 of which failed 1 to 17 tests, `/tmp/r516-3` held only
    `node-compile-cache` and no `polaris-marker-*` directory. The `afterEach` cleanups run when an `expect` throws. A FIFO's `keep` descriptor is
    closed before its directory is removed, because the cleanups run in reverse.
- **Bar 7: met.** At the fix, a removal fails with "expected null to deeply equal { mode: …" and a rewrite with the field diff.
  The row title names the plant.
- **Bars 8 and 10: met.** The helper sits beside the other fixtures, the change is `+0 ~17 -0`, and nothing is duplicated.
- **The residuals, in full.** Each of these leaves the run `unreadable`:
  - a FIFO drain (inherent: no stat field moves);
  - bytes written into the held FIFO [Inferred: a FIFO's lstat size is 0 whatever it holds];
  - an in-place rewrite of the mode-000 file (N1);
  - on inode-reusing filesystems, a same-type replacement of a row whose bytes are not compared (N1);
  - metadata the snapshot does not hold (owner, group, link count, extended attributes, a link target's mode, a directory's
    entries where its size does not move).

## 8. Cleanup

- [Observed] Every mutation ran in the scratch clone `mclone`. After each run the harness checked by sha256 that both files were
  restored (`restored: true` on 32 of 32 runs), and each harness invocation ended "tracked tree clean after: True".
  - Before `mclone` was deleted, `git status --porcelain --untracked-files=no` was empty.
  - Its `launched.ts` hashed `c7a25b8b…71424921` and its `launched.test.ts` hashed `e01b040a…ca2fa740`, the head's bytes.
  - `clone` also had an empty tracked status before deletion.
- [Observed] Before deletion, the 8 private TMPDIRs (`/tmp/r516-1` to `/tmp/r516-8`) held 0 `polaris-marker-*` directories.
  `launched.test.ts` left nothing behind in any of them, failing runs included. Two held one leftover each, both from timed-out
  tests in files this PR does not touch:
  - `/tmp/r516-2/dossier-evidence-*`, from the full-project run;
  - `/tmp/r516-6/dossier-close-*`, from the `close.test.ts` re-run.

  [Inferred] Those two files' cleanup may not run when a test times out. That is outside this PR. The coordinator may add it
  to `syzygy-bpyt.4.13` or file it on its own; it is not a finding here.
- [Observed] Deleted when the runs ended: both scratch clones (`…/rev-516/clone`, `…/rev-516/mclone`) and all 8 TMPDIRs.
  `ls -d` on the 10 paths then reported "No such file or directory" for each. Nothing in `/tmp` outside those directories was
  deleted.
- No worktree under `/home/tze/GitHub/syzygy/.worktrees/` was touched. No `bd` mutation was run: only `bd show` and
  `bd comments`. The PR was not commented on, pushed to or merged. No process was killed by pattern. The harness kills only its
  own process group on timeout, and nothing timed out.
- The tools and results stay beside this raw under
  `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-516/`:
  - `tools/`, with sha256s:
    - `rev516_mutants.py` `6ad034b1c176e02f28f4632559cfef16a653b66146b8a907b75450dfa67d1d09`. The `fixctime` and `probe` sides
      were added after the first harness invocation (`results/`); the mutant definitions did not change.
    - `fifo_probe.mjs` `1331582338fce7296a8e8891918d79e295657c38accc532dbe1491623a0af9da`
    - `tree_compare.py` `532321c0d4f6ff721021a40b8e928149cb48c00c8541ef5547f30aa9215810b4`
    - `check_record.py` `9863841a38ece3a2564fd5c163989d80bc25a5309502c917477d96b2be3803a0`
    - `inspect_record.py` `98e7f645d08d2146d051d8466042490b0be3f0095e6a162f2fae1cc9b345f891`
    - `record_errors.py` `90fea862e0e107c8f66973cb5a4e870f8a58df0d43a75be7cae380ad484613a8`
    - `summarize.py` `0572197f61a8c0f912e0bcdb18699559aa07020cfad43dfc93f451750900bc9e`
    - `frames.py` `34b26564ea35e42da10e7a2d01b3c9619992bb0846d2759cb7a0b453b3c87256`
    - `project_failures.py` `8eacdb67fdb2c43fe46fb276b31ea197b3ef49cc01bccac4420d5eadf8e97896`
    - `log_failures.py` `6eb4e8c4c568535fddd0a7410eee134bd5bd7f90c54fdbf5a66f18b88375693e`
    - `rerun_files.py` `1abd8c858008885ac644c0e206843efcca347e72fbe2fdcc4d8a3b46597914af`
  - `results/`, `results2/`, `results3/` and `results4/`: each harness invocation's JSON, its log and the per-run vitest
    reports. `results3/probe-rows.jsonl` holds the per-row snapshot probe.
  - `runs/`: the first `launched.test.ts` run, the full-project log and JSON, typecheck, `check_governance` and
    `check_quotations`.
  - `reruns/`: each re-run file's log and JSON, and `rerun-summary.json`.
  - `ci-node-job.log`, the hosted node job's log; `bpyt10-comments.txt`, read only; and `rederived.diff` and `prediff.diff`,
    which hash to the subject digest.
