# R-GP-IMPL-CODE-STRUCTURE-GITLINK-1 — CC-REV-1 implementation review of syzygy-bpyt.6.9 (pull request 613), round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 88beeb87860c1ab08dc0cebe7650c3e5066f44a0
Subject: diff 5f0ab21f...88beeb87 (4 files) sha256 cf9be9175304ddddba2e1bc959a650d5cac264318ed0bc86040229e0dfa980a0

Reviewer: a fresh-context pr-review worker (bead syzygy-k0ok), date 2026-11-03. I did not author the change. I did not edit pull request 613. Scratch files (a copy of the base module, a differential test, one temporary tiers line) were removed and the worktree was clean afterwards.

## 1. Ruling on the open question: AC2 and case I2

- [Observed] The bead's acceptance criterion 2 says injected "160000 blob <id> 12<TAB>a.ts" (I2) gives Unknown malformed. The bead's description (output-change note) says I2 moves "from Observed 0 back to the base's Observed a.ts". The two conflict inside the bead.
- [Observed] The source review (R-GP-IMPL-CODE-STRUCTURE-3-RAW.md) settles which is meant:
  - Section 3b, I2 row: base Observed a.ts, round 2 Observed a.ts, round-3 head Observed 0 (segment dropped). The reviewer's complaint is that the head moved Observed 1 to Observed 0, "neither the owner-listed output nor a move to Unknown" (section 5, R3-N2).
  - Section 5, R3-N2 proposed fix: drop a record only when it is a well-formed gitlink head; "Everything else then reaches parseGitLsTree and refuses"; add I1 and I2 to the injected test. Round 2 is the reference column, and in it I2 is Observed a.ts, because the parser accepts it.
  - Section 6, criterion 1: the exception named is "even when it is typed blob (I2)", i.e. a record dropped that is not a gitlink.
  - The raw never asks for I2 to be Unknown. Only I1 and I10 are recorded as Unknown in round 2.
- [Observed] The parser, git-tree.ts line 25, is LS_TREE_RECORD = /^([0-7]{6}) (blob|tree|commit) ([0-9a-f]{40,64})(?:\s+(\d+|-))?\t(.+)$/s. It does not relate mode to type, so "160000 blob ... 12<TAB>a.ts" parses, as it does at the base and at round 2. Making it Unknown would need a new mode/type consistency refusal in the shared parser.
- Ruling: the PR is right and AC2's wording for I2 is a drafting error. The PR's reading (I2 gives Observed a.ts) matches the description, the raw's own proposed fix, and the parser.
- Fail-closed polarity applied, not just precedent: the defect in the head was a silent drop of a record that is a file by its own stated type, a partial inventory served as complete. Keeping it restores the base behaviour and refuses nothing it should not. Unknown for I2 would be a stricter refusal, but it is a new behaviour in git-tree.ts, which other consumers read (git-object-reader, the PWB project-shape path), so it changes a shared outcome and belongs to the owner (GP-Q0 part 3), not to this repair.
- [Inferred] Real git cannot emit I2: it prints any 160000 mode as "160000 commit <id>       -" (R3 section 3a, M2 to M4). So the choice is unreachable in production either way.
- Not a REVISE finding. Recorded as note N2 below, so the owner can decide whether a mode/type check is wanted.

## 2. What I ran

- npm ci, then vitest run on code-structure.test.ts and model.test.ts at the exact head: 2 files, 32 tests passed (13 and 19). Matches the mutants record's unmutated "13 passed (13)".
- [Observed] The module bytes at the head hash to a3778c1ea3fad6b1fd4544be870a1236c0b8708939bfbe7c37c949135b5bfd47, which is the differential record's "new" digest. The record's new commit 53ec82a0 differs from the head only by the two evidence files (git diff 53ec82a0 88beeb87 --stat: 2 files, both under docs/evidence/syzygy-bpyt-6-9/).
- Mutants re-run, each applied to a clean copy of code-structure.ts and restored: all ten recorded mutants re-run, not three.
  - R3-byte-filter-contains, R3-string-filter-contains, R3-both-filters-contain, prefix-only-restored, head-drops-commit-type: each "1 failed | 12 passed (13)", killed.
  - head-id-any-length, head-size-column-any, head-spaces-optional, head-drops-tab, byte-slice-too-short: each "1 failed | 12 passed (13)", killed.
  - [Observed] All ten agree with the record's outcome field.
- Mutants I added (not in the record):
  - mine-string-includes-160000 (string filter back to record.includes('160000 ')): "2 failed | 11 passed (13)", killed.
  - mine-string-lookalike-anchor-dropped (drop the ^ from the regex): "1 failed | 12 passed (13)", killed.
  - **mine-byte-prefix-only** (only the byte filter reverted to head.startsWith('160000 '), the string filter unchanged): "13 passed (13)", **survived**. See N1.
- Differential, my own driver (base module from origin/main as a scratch copy versus the head module; fixtures built with git mktree -z; the injected seam through runGit). [Observed]
  - Real git, 4 rows: gitlinks including a non-UTF-8 gitlink path; blob "160000 x.ts" beside a gitlink; a quote-leading gitlink path; a non-UTF-8 blob path. All 4 give identical outcomes, base versus head (Observed a.ts; Observed "160000 x.ts"; Observed a.ts; Unknown "path that is not valid UTF-8").
  - Injected, 9 rows. Moved: I1 (blob then "160000 garbage") Observed a.ts to Unknown malformed; I10 (two spaces) Observed a.ts to Unknown malformed; I2 Observed 0 to Observed a.ts. Unchanged: a well-formed gitlink head, the same with a 64-hex id, an empty listing, an unterminated gitlink (Unknown malformed in both), a gitlink whose path starts with a quote, a gitlink with a single-space size column.
  - The movements are exactly the three the PR's differential record lists (I1, I2, I10) and nothing else.
- The PR's own differential record claims 13 of 13 real-git Part B rows equal origin/main and 28 of 28 Part A rows equal the r3 record. I did not re-run the stored r3 harness; my 4-row real-git sample agrees. [Unknown] for the other 37 rows beyond what the author recorded.
- Production-served outcomes: [Observed] observeCodeStructure is called once outside tests, model.ts line 990, passing runGit only when the model input carries one; the app's git-observation runner is a different seam, and the git reads in project-shape-observation use gitRunnerFor. No production caller injects a code-structure runner (the same finding as R3 section 3e). The three moved outcomes are on the injected seam only; nothing a production gate serves moved.
- -z parsing intact: [Observed] the default runner still asks for "ls-tree -r -z -l"; the byte filter still splits on NUL, keeps an unterminated tail (test: unterminated gitlink gives Unknown malformed, in my table too), and tests only a 128-byte slice decoded as latin1. The longest legal head is 14 + 64 + 1 + 7 + 1 = 87 bytes, so 128 is enough, and the path after the tab is never decoded by the filter. The string filter splits on NUL and tests the whole record with an anchored regex.

## 3. Findings

### N1 — note — the byte filter's head predicate is pinned only through the string filter; reverting the byte filter alone to a seven-byte prefix survives

- [Observed] Mutant mine-byte-prefix-only passes 13 of 13. The recorded mutants all change the string filter, change both, or change the shared regex or slice length; none changes the byte filter's predicate alone to a prefix test.
- Reason it survives: the only way to feed the byte filter a record that starts with "160000 " and is not a well-formed gitlink is a git executable that prints one. Real git cannot, and no test installs a fake git for the default runner. For the string path, the string filter catches the same records, so the combined behaviour is unchanged.
- Effect if it regressed: a default-runner listing with a malformed 160000 record would be dropped before decoding instead of refused. [Inferred] Unreachable with real git, so it does not block. AC3 only lists the three contains mutants and they are killed.
- Optional fix: a test that points the default runner at a stub git printing "160000 garbage\0", or a direct unit test of withoutGitlinkRecords if it is exported for tests.

### N2 — note — no mode/type consistency check exists anywhere, so "160000 blob" is a file record

- Consequence of the ruling in section 1. The parser records any "blob" typed entry whatever its mode. Real git derives the type from the mode, so the combination cannot appear. If the owner wants the combination refused, that is a git-tree.ts change affecting every consumer and goes through GP-Q0.
- Bead text: AC2's "Injected ... 'blob <id> 12<TAB>a.ts' give Unknown malformed" should be amended to say Observed a.ts, so a later audit against the bead does not read the PR as short of its acceptance.

### N3 — note — the differential record's file state

- [Observed] The record names the commit 53ec82a0 and the module digest, both correct for the code at the head. The head 88beeb87 is the same code plus the two evidence files, so the evidence digest is valid for the head by module bytes, but the record's "commit" field is not the head. A reader checking commit equality will see a mismatch. Rule 11 is met by the module digest.

## 4. Verdict per acceptance criterion

1. **Only a well-formed gitlink head is dropped; every other record reaches the parser.** Met. [Observed] Both filters use the anchored head predicate; the string and real-git rows above agree.
2. **I1 gives Unknown malformed; I2 as ruled gives Observed a.ts; a real-git blob "160000 x.ts" beside gitlinks is recorded.** Met as ruled (section 1). The real-git lookalike test (including a path holding a whole gitlink head after its own head) passes, and my probe agrees.
3. **Rule-6 record with old/new fragments, including the three contains mutants, all killed.** Met. All ten re-run and killed; fragments are stored. One non-listed mutant survives (N1).
4. **Every real-git row keeps its outcome, stated with a re-run.** Met on the author's record and on my 4-row sample.

**Overall: CONFIRM WITH EXCEPTIONS.** The bytes read are sound, the I2 question is resolved in the PR's favour, and the three notes do not change any production outcome.

Not run: the full governance battery on the PR head (it ran on the review branch, see the review pull request). Hosted checks on the head were SUCCESS at the time of review, merge state UNKNOWN.
