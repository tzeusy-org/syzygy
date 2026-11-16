# Chrome singleton directory removal: review dispositions, rounds 1 and 2

[Observed] This record dispositions the two CC-REV-1 review rounds of
`syzygy-bpyt.4.11` (pull request #515). Chrome makes a singleton directory
directly in its temp directory and removes it only on a clean exit, so a
leader that `closeDisposableBrowser` SIGKILLs leaves one behind. In
`apps/three-surface-poc/src/cdp-browser.ts`, `launchBrowser` now reads that
directory from the profile's `SingletonSocket` link once Chrome has announced
its endpoint, recording its path, device and inode, and `removeBrowserProfile`
removes it after the profile. The removal is guarded: the parent is directly
`os.tmpdir()`, the name is Chrome's, `lstat` says directory, the directory is
the running user's and is the one that was read, and the link is read only
from a profile and a link that are the running user's. Any failure is
swallowed. `draft-preview.browser.test.ts` moves its launch inside its `try`.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) |
|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-CHROME-SINGLETON-1-RAW.md` | `REVISE` | `490332aa` | `r1-review.diff` sha256 `a41c58ec78cdb30a1e6463ba7332dcf575e384472b23988d3cd213c047526436` |
| 2 | `docs/reviews/R-GP-IMPL-CHROME-SINGLETON-2-RAW.md` | `CONFIRM WITH EXCEPTIONS` | `6dcf9490` | `r2-review.diff` sha256 `100fa4ae6502e12043020af48fea6a68d93e3f8aa6f280ca7a72ad9261959c53` |

Round 2's subject equals `git diff 3ec6929951080613b3c5cb7205fe303c5449be58
6dcf94906b2989345f5b03dfeaa2d64c56632886`. At landing the branch took one
merge of main `894fb032` (#523 and #524). [Observed] No file that main
changed between `3ec69299` and `894fb032` is in the subject (121 files
against 42). After the merge, `git diff origin/main HEAD | sha256sum` printed
the same digest as the subject.

Round 2 found every round-1 finding repaired, or dispositioned as directed,
and four new notes with no blocking finding (section 5). Under the owner's
notes-only stopping rule
(`.syzygy/governance/decisions/POLARIS-GATE-SITTING-2026-09-26-DECISION.md`
section 1), the round clears the exact bytes it read, and those bytes are not
edited. This record sits beside them. It is an implementation record and binds
nothing.

Revise-severity findings open: 0

## Retained review evidence

Both reviewers' tools and results are kept under
`docs/evidence/chrome-singleton-review-2026-10-25/`, 78 files:
- `r1/` (21 files): round 1's `tools/` (`check_records.py`, `decoy_probe.mjs`,
  `fixed_path_probe.sh` and `my_mutants.py`, each matching the digest
  prefix and suffix the raw gives in section 8) and 17 `results/`, among them
  the F1 fixed-path probe, the decoy probe, the reviewer's mutants and
  `digests.txt`, against which the 16 kept files it names match.
- `r2/` (57 files): round 2's 13 `tools/` and 44 `results/`, each matching
  the sha256 the raw lists for it (section 8), checked by script at landing.
  They include the victim and racer probes, the safety probe with the
  surviving N8 mutant, the necessity mutants, the ten launch-probe runs and
  the repeated real-Chrome runs.

Not retained: the `npm ci`, typecheck, build and governance logs of both
rounds, round 1's two accessibility-command outputs (about 330 KB each), and
round 2's concatenated battery logs and two `vitest list` outputs (about
1.1 MB each). The raws quote the result line of each; `npx vitest list`
re-derives the name sets at each commit.

## Class

None, by both reviewers' rulings (round 1 section 2; round 2 section 2,
"Ruling: no class (none). It confirms round 1's ruling."). Round 2's reason
that the repair does not change the class: it adds an owner check and an
identity check to an existing removal, and moves no rendered byte, route,
wire format, fixture or exit path. GP-Q0's extra checks therefore do not
apply, and no owner notice is due. The change is behavior-preserving: the CDP
launch arguments and spawn options are untouched.

## Round 1: one blocking finding and seven notes

- **F1** (blocking): four unit cases injected `remove` but passed literal
  `/tmp/syzygy-browser-profile…` paths, so `removeBrowserProfile` read a link
  in the shared `/tmp` and removed the Chrome-named directory it named.
  **Repaired** (round 2 section 4): fix 1, a non-existent path under a private
  root each case makes; fix 2, the link is read only when the profile and the
  link are the running user's, with three cases and three killed mutants. The
  victim survives at the head and is removed at `490332aa` with the same 129
  plants.
- **N1** (identity): **repaired**; the device and inode are recorded and
  compared, with three killed mutants.
- **N2** (case sensitivity): **repaired**.
- **N3** (145, not 147): **repaired** in the comments; the test name keeps
  "147", as directed, so the name set does not move.
- **N4** (`sha256AtCommit`, rule 11): **repaired**.
- **N5** (root): **repaired** with a uid-0 skip. [Unknown] The root
  counterfactual could not be observed on this host: AppArmor's
  `unpriv_bwrap` profile denies DAC override even as uid 0 in the sandbox.
- **N6** (TMP or TEMP set, TMPDIR unset): **disclosed** as a residual.
- **N7** (a load flake in an untouched case): **filed** as
  `syzygy-bpyt.4.21`.

## Round 2: four notes

- **N8**: a mutant that resolves the profile path before the owner check
  (`lstat(realpathSync(profile))` at `cdp-browser.ts:311`) survives 31/31 and
  is not equivalent: built into the dist, it removes the victim in safety
  probe P1a. The code is right today. **Disposition:** filed as
  `syzygy-bpyt.4.28`: a case where the profile is a link answered as another
  owner, and the mutant re-run and killed.
- **N9**: two same-user windows sit between a check and the action it guards.
  The owner check, then `readlinkSync` (`:311-312`), is not disclosed; the
  identity check, then `rmSync` (`:325-326`), is disclosed, and a racer
  removed the replacement in 12 of 1,000 trials. [Inferred by the reviewer]
  Neither is open to another account with `mkdtemp` (0700) profiles in a
  sticky or private TMPDIR. **Disposition:** the residual is stated here
  until `syzygy-bpyt.4.28` lands: the link is read only if the profile and
  the link are the running user's *at the instant of the `lstat`*, and the
  guarantee holds for a private profile in a sticky or private temp
  directory. The bead also takes the doc-comment scoping at `:303-307` and
  the reviewer's optional refusal of a group- or world-writable profile.
- **N10**: the comment at `cdp-browser.ts:282-285`, "the identity tells the
  two apart", overstates, since a file system may reuse an inode number
  (the test comment at `cdp-browser.test.ts:465` already says so).
  **Disposition:** the rewording goes to `syzygy-bpyt.4.28`, which edits
  the same file.
- **N11**: the PR body's "Repaired on `origin/main` at `3ec69299`" read as if
  the repair were on main. **Correction:** the repair is on the branch (code
  commit `bcd39b4e`), with `origin/main` at `3ec69299` merged in
  (`6dcf9490`). The PR body was reworded at landing; it is not part of the
  reviewed bytes.

## Acceptance criteria (round 2 section 7)

- AC1 met. A passing run of every Chrome-driven file in a fresh private
  TMPDIR leaves no Chrome singleton or `polaris-draft-browser-*` directory:
  10 of 10 reviewer runs of `cdp-browser.browser.test.ts`, 0 entries over 240
  launches, and the lane's records under Chrome 120, under Chrome for
  Testing 154, and over a matrix of 120, 145, 147, 149, 151 and 154 (each
  `left []`).
- AC2 met. A killed run's leftover is stated out of scope in the PR's
  criteria table and residuals. [Inferred] `syzygy-bpyt.4.18` (PR #522) is
  the census of what a killed run leaves.
- AC3 met. No assertion on main changes; `Tests: +17 ~4 -0`, every added test
  a cleanup test, and the four changed cases change their profile argument
  only.
- AC4 met. The class is stated (none) and confirmed.
