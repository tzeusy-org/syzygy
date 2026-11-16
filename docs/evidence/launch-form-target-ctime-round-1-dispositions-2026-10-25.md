# Launch-form target change-time snapshot: review dispositions, round 1

[Observed] This record dispositions the CC-REV-1 review of `syzygy-bpyt.8.33`
(pull request #523), the follow-up to notes N1 and N2 of the PR #519 review.
In `packages/polaris-dossier/src/launched.test.ts`, the launch-form rows'
marker snapshot now also carries the followed target's change time
(`targetCtimeNs`) for a link to a regular file, and the helper's comment says
what moves the change time. The change adds the rule-6 record and its harness
under `docs/evidence/launch-form-target-ctime-2026-10-25/`. No production file
changes.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) |
|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-LAUNCH-FORM-TARGET-CTIME-1-RAW.md` | `CONFIRM WITH EXCEPTIONS` | `d1742589` | `r1-review.diff` sha256 `c0148ad4af5f99df67c9b5c0f86a08eb5e2c805d7179f88921d7f13a9d0ac668` |

The subject equals `git diff df6046a153fe130202abdf6bd3045a79ba143879
d17425890c0b5211714fce1be90b32a90b5f7747`. At landing the branch took one
merge of main `3ec69299` (#521). [Observed] No file that main changed between
`df6046a1` and `3ec69299` is in the subject (60 files against 10). After the
merge, `git diff origin/main HEAD | sha256sum` printed the same digest as the
subject.

The reviewer found "None blocking." (section 4), with four notes. Under the
owner's notes-only stopping rule
(`.syzygy/governance/decisions/POLARIS-GATE-SITTING-2026-09-26-DECISION.md`
section 1), the round clears the exact bytes it read, and those bytes are not
edited. This record sits beside them. It is an implementation record and binds
nothing.

Revise-severity findings open: 0

## Retained review evidence

The reviewer's tools and results are kept under
`docs/evidence/launch-form-target-ctime-review-2026-10-25/`, 44 files. Each
file the raw lists with a digest (section 8) matches its sha256, checked by
script at landing:
- `tools/` (8 files): the record checker `check_record.py`, the mutant runner
  `rev523_mutants.py` (with every fragment it ran), `field_diff_own.py`, the
  replace, faithful-ask, snapshot-shape and comment probes, and
  `parallel_unmutated.py`;
- `results/` (36 files): the record check and its self-test, the mutant
  results on tmpfs and ext4 (each run storing its tool digest, fragments,
  kernel and file system), the X3c, X5, repeat and parallel results, the probe
  outputs, the seven default-reporter X3d outputs, the base and fix
  `vitest list` outputs, the per-run console logs, and the PR body as the
  reviewer read it.

Not retained: the `npm ci`, typecheck, project, governance and quotations
logs. The raw quotes the result line of each (section 3).

## Class

Class 4 (security), by the reviewer's ruling (section 2), matching the PR's
declaration. The 17 launch-form rows are the rule-6 kill evidence that
`launchFormRefusal` counts no launch form while the marker is unreadable, the
reader that `launched.ts:34-35` ties to SEC-3, so a change to what the rows
can kill changes the security evidence. This agrees with the #516 and #519
rulings. The reviewer ruled out class 3 [Inferred by the reviewer]:
`markerSnapshot` is a test helper and composes nothing the product emits or
evaluates. No other class is touched.

GP-Q0's three class-4 checks:
- **Differential: degenerate, with a stand-in.** `launched.ts` is
  byte-identical at base and head, so any old-versus-new run of the product
  reader is identical by construction, including over the 17 plants, whose
  prose is altered (invalid JSON, another format, a byte-order mark). The
  informative comparison is old test against new test over one mutant corpus
  at base and at the fix: the PR's 21 mutants on tmpfs and ext4, and the
  reviewer's reproductions and nine mutants X1 to X5.
- **A rule-6 mutant per predicate: met.** The one new predicate,
  `targetCtimeNs`, is killed at the fix and survives at base, in every run on
  both file systems, by O8, O1 (link row), X1, X2 and X5.
- **Owner notice:** posted on `syzygy-bpyt.10` at landing.

The stop clause is not triggered: no product byte changes, so
`launchedMarkerState` and `launchFormRefusal` accept and refuse exactly what
they did, with the same refusal strings, and no test title changes (the base
and fix `vitest list` outputs are byte-identical, 43 tests each).

## N1: a replacement of a link's target by a byte-identical copy survives on ext4

[Observed by the reviewer] X3c writes `${target}.tmp` with the target's bytes
and mode and renames it over the target. With TMPDIR on this host's ext4 it
survives the fix in 17 of 25 runs; X3d, whose copy keeps mode 0644, survives
in 8 of 25 JSON runs and 5 of 7 default-reporter runs. Both survive the base
in every run, so this is not a regression, and on tmpfs both are killed in 10
of 10 runs. The target's inode number changed in 2,000 of 2,000 probes.
[Inferred by the reviewer, from the kernel's multigrain-timestamp design] The
copy is a new inode no one has queried, so on ext4 it can take the same coarse
stamp the planted target got. The reader still opens with `O_NOFOLLOW`
(`launched.ts:48`) and every row still asserts `unreadable`, so nothing fails
open.

**Disposition:** filed as `syzygy-bpyt.8.35`, taking the raw's option (a): add
`targetIno` and `targetMode` beside `targetCtimeNs` for a link to a regular
file, re-run the faithful-ask probe with them, and re-run X3c, X3d and X5 at
base and fix on ext4, expecting X3c and X3d killed in every fix run. Until
that lands, the residual stands as the raw's option (b) names it: a link's
target is compared by its bytes and change time only, not by its inode or
mode, so a reader that replaces the target with a new file of the same bytes
passes wherever the file system stamps the new file with the old one's change
time (this host's ext4: X3c survived 17 of 25 runs). The comment at
`launched.test.ts:137-139` that "a reader that removes, replaces or truncates
an unreadable marker cannot pass here" does not hold for what the link row's
link leads to until then.

## N2: the coarse-timestamp residual, restated

**Correction:** the PR body says an in-place change to the target within one
tick "could" leave `targetCtimeNs` unchanged. Restated, as the #519
dispositions restated N3 for the marker's own change time: the target
change-time kill of an in-place change (O1, O8) is deterministic only where
the kernel and file system give multigrain timestamps (as on this host, kernel
`7.0.0-38-generic`, tmpfs and ext4), because the snapshot's own stat queries
the target's change time; elsewhere it holds only for a change that crosses a
clock tick, which O8's chmod-cycle usually does not. A replacement of the
target by a new file is not covered by that guarantee even here (N1). A
re-run of the rule-6 record elsewhere should store the kernel and file system
beside O8's outcome; `docs/evidence/launch-form-ctime-review-2026-10-24/`
`tools/coarse_proxy.mjs` can serve as the environment check. Hosted CI's
kernel stays [Unknown: not checked]; CI runs only the unmutated file.

## N3: two no-op counterexamples to the new comment

[Observed by the reviewer] A `write(2)` of zero bytes and a `rename(2)` of
the file onto its own name left the change time unchanged in 500 of 500
rounds on each file system. Both leave the inode untouched, so no test outcome
depends on them.

**Disposition:** the rewording goes to `syzygy-bpyt.8.35`, which edits the
same comment: "any write of at least one byte, truncate, chmod, rename to
another name or link of the marker moves the change time, even one that puts
back what it changed."

## N4: four precision corrections

**Corrections** to the PR body and records, none of which changes a test
outcome:
- (a) The body describes the new call as `fs.statSync(marker, { bigint: true })`.
  The code at `launched.test.ts:45` also passes `throwIfNoEntry: false`, which
  is what makes the dangling-link row give `null` instead of throwing.
- (b) The body and AC1 cite `:134-136` for the `asked` comment. At the fix it
  sits at `launched.test.ts:137-139`, with its bytes unchanged.
- (c) The ext4 record stores the TMPDIR file system as `stat -f` prints it,
  "ext2/ext3". "ext4" comes from `df -T`, in the PR body only.
- (d) `field-diff.json`'s `tmpdir.filesystem`, `kernel` and `reading` fields
  are not printed by `field_diff.py`, which prints only `mutant`, `exit`,
  `restored` and `linkRowDiffLines`; they were added outside the tool. Each
  retained output carries its TMPDIR path, which corroborates them on this
  host. Future harnesses should store `df --output=fstype` beside
  `stat -f -c %T` and emit their own environment fields, as the reviewer's
  `rev523_mutants.py` does.

## Acceptance criteria (raw section 6)

- AC1 met, with N3. The comment at `launched.test.ts:34-37` carries the #519
  raw's proposed sentence verbatim and names the new field; the `asked`
  comment is unchanged.
- AC2 met. `markerSnapshot` carries the followed target's change time for a
  link to a regular file and `null` otherwise (16 of 17 plants, and a link to
  a directory or a FIFO); titles are unchanged; the unmutated file passed
  43/43 in 12 sequential and 10 parallel reviewer runs per file system.
- AC3 met. The record ran at `fbe03e30`, whose test bytes equal the head's.
  O8 and O1 survive at base and are killed at the fix on the link row,
  reproduced 3 runs per side per file system; R-chmod-cycle-rewrite, D1 ×5,
  D3, D4 and T are unchanged.
- AC4 met for the review. The owner notice is posted at landing.
