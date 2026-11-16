# Launch-form target inode and mode: review dispositions, round 1

[Observed] This record dispositions the CC-REV-1 review of `syzygy-bpyt.8.35`
(pull request #526). The change is test-only and lives in
`packages/polaris-dossier/src/launched.test.ts`:
- `markerSnapshot` gains `targetIno` and `targetMode` beside `targetCtimeNs`,
  for a link to a regular file, and null otherwise.
- The change-time comment carries the PR #523 review's N3 wording.
- The two mode-000 rows skip under uid 0 through the repository's `isRoot`
  idiom.

The lane's evidence is under
`docs/evidence/launch-form-target-ino-mode-2026-10-25/`.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) |
|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-LAUNCH-FORM-TARGET-INO-MODE-1-RAW.md` | `CONFIRM WITH EXCEPTIONS` | `74dc0eb9` | `r1-review.diff` sha256 `0c72ef422b251a8e3f7345b6fc93c7627f22b286159fe36b051229baac4ebfe6` |

The subject equals `git diff a088f1caf061c1a2062527ce8521c9b64c3c7fd1
74dc0eb9f3b912b9a89e8db456edd687edbda6ff`. The lane had already merged main
`a088f1ca` into the branch. At landing the branch took one more merge of
main, which then carried #525. That merge changed no subject path, and
`git diff origin/main HEAD | sha256sum` printed the same digest as the
subject.

The round found five notes and no blocking finding. Under the owner's
notes-only stopping rule
(`.syzygy/governance/decisions/POLARIS-GATE-SITTING-2026-09-26-DECISION.md`
section 1), the round clears the exact bytes it read, and those bytes are not
edited. This record sits beside them. It is an implementation record and binds
nothing.

Revise-severity findings open: 0

## Class

Class 4, and no other class, by the reviewer's ruling (section 2). This agrees
with the #516, #519 and #523 rulings and with the PR's declaration. The 17
launch-form rows are the rule-6 kill evidence that `launchFormRefusal` counts
no launch form while the marker is unreadable, the reader that
`launched.ts:34-35` ties to SEC-3. This change alters what those rows can
kill.

GP-Q0's checks:
- **Differential.** Degenerate: `launched.ts` is the same blob at base and
  head. The stand-in is old test against new test over one mutant corpus.
- **A rule-6 mutant per predicate.** Met for `targetIno`. Met for
  `targetMode` only counterfactually (N1).
- **Owner notice.** Posted on `syzygy-bpyt.10` at landing.

No product gate changes. As a non-root user, the test gate keeps the same 43
passing tests and now refuses X3c and X3d. Under uid 0, the two mode-000 rows
go from failing to skipped, which is the intended effect.

## Notes

- **N1** (`targetMode` is never the sole witness here). Disposition, in the
  reviewer's words (raw lines 337–340):

  > `targetIno` is killed alone by X3c on ext4 (sole witness in 260 of 300
  > probe rounds, X3c survived the base 1–2 of 10 and the fix without
  > `targetIno` 1 of 10). `targetMode` is a co-witness on this host and never
  > the only one (0 of 3,300 rounds per file system). It kills X3d when
  > `targetIno` is absent. Its sole-witness case, a different-mode rewrite at
  > a reused inode number stamped with the old change time, is [Inferred] and
  > needs a coarse-timestamp file system.

  The PR body's "`targetMode` is killed by X3d, which survives at `df6046a1`"
  does not isolate it, because `df6046a1` lacks all three target fields. At
  this change's own base `71334012`, X3d's survival on ext4 depends on load:
  the lane saw 0 of 10, this review 2 of 10, and #523's reviewer 8 of 25. The
  field stays: it costs nothing, and it cannot fail a faithful ask (no field
  moved in 10,200 faithful rounds). The owner notice says the same.
- **N2** (the residual named the wrong arm). The lane's report called
  `--selftest-unlink-0644` a residual, but at mode 0644 two fields catch it.
  Restated, in the reviewer's words (raw lines 361–364):

  > On this host's ext4 a target unlinked and rewritten at its path takes the
  > freed inode number back (300/300), so `targetIno` cannot see it. A
  > same-mode rewrite (X5) is then killed by `targetCtimeNs` alone (300/300),
  > and a rewrite at another mode (Y3, 0644) by `targetMode` and
  > `targetCtimeNs`. [Inferred] A same-mode unlink-and-rewrite can pass only
  > on a file system that both reuses the inode number and stamps the new
  > file with the old change time.

  The PR body's "through `targetCtimeNs` (300/300 in the probe)" for X5 cited
  the 0644 arm's figure. It is now [Observed] by the reviewer's own X5 arm.
- **N3** (the probe's rename arm is not X3c's write). `faithful_probe.mjs`'s
  `--selftest-rename` arm resolves the target with `realpathSync`, which is
  X3's resolution. Its 298 of 300 change-time figure therefore does not show
  that change time caught X3c's write. For X3c's own write, cite the
  reviewer's `field-probe-ext4.json` (retained below): `targetIno` is the sole
  witness in 260 of 300 rounds. `--selftest-unlink-0644` also uses
  `realpathSync`.
- **N4** (outputs that name no subject, and two claims `record.py` does not
  check). Recorded as a gap; the bytes are not changed:
  - `root-skip-{user,root}.json` and `faithful-probe*.json` name no commit,
    test digest, kernel or file system. The reviewer re-ran the root skip at
    `74dc0eb9` with the same result.
  - `record.py` does not check "on the link row only". The reviewer checked
    it: 20 of 20 per file system.
  - `record.py` checks the old-occurs-once rule against the fix's files only.
    The reviewer checked each side's own file, and both pass.
  The next record of this kind should store the commit, the test sha256, the
  kernel and both file-system names in every output, and its checker should
  assert both properties.
- **N5** (the test delta). Stated by assertion, the delta is `+0 ~18 -0`:
  - 2 rows by registration (the mode-000 rows);
  - 17 by the helper (the launch-form rows, 16 of which compare two more null
    fields);
  - 1 row is in both groups.
  The PR body's `~2` counts registration only.

## Retained review evidence

The reviewer's tools and results are kept under
`docs/evidence/launch-form-target-ino-mode-review-2026-10-25/`, 33 files: 7
tools and 26 results. Each matches the sha256 its raw lists for it in section
8 (39 of 39 named, checked by script at landing). Among them are the field
probes, the faithful-ask runs, the reviewer's mutant groups on ext4 and
tmpfs, and the record checks.

Not retained: the two `npm ci` logs and the governance, quotation, typecheck
and project logs. The raw quotes each one's result line.

## Acceptance criteria (raw section 6)

- AC1: met. The fields are null except for a link to a regular file. A
  faithful ask moves 0 fields over 10,200 rounds. X3c and X3d are killed in
  every fix run on both file systems. The named mutants are unchanged. The
  mutant records store fragments, commit, kernel and file systems; the probe
  and root-skip outputs do not (N4).
- AC2: met. The comment is verbatim. Both mode-000 rows skip under uid 0.
  Titles are unchanged, and the file passes 43 of 43 in 10 of 10 runs per
  file system. Real-root behavior stays [Inferred].
- AC3: met. This was the independent class-4 review, and the owner notice was
  posted at landing.
