# Launch-form change-time snapshot: review dispositions, round 1

[Observed] This record dispositions the CC-REV-1 review of `syzygy-bpyt.8.30`
(pull request #519). In `packages/polaris-dossier/src/launched.test.ts`, the
launch-form rows' marker snapshot now carries the marker's change time
(`ctimeNs`, from `lstat`) beside its mode, inode, size, link and bytes, so a
reader that rewrites the unreadable marker in place and puts it back fails the
row. The change also adds the rule-6 record
`docs/evidence/launch-form-snapshot-ctime-mutants-2026-10-23.json` and its
harness and change-time probe under
`docs/evidence/launch-form-snapshot-ctime-2026-10-23/`. No production file
changes.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) |
|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-LAUNCH-FORM-CTIME-1-RAW.md` | `CONFIRM WITH EXCEPTIONS` | `3fb73809` | `r1-review.diff` sha256 `60ae05442b451517aab5909e65be881116ddb69b10c8f71c7f9ed2727730d293` |

The subject equals `git diff ce322e1a65b784c6304d51b05fb347351912a926
3fb7380945bd8ac0374e38792a814aed070bd8c6`. At landing the branch took one
merge of main `f01e228c` (#509, #517 and #518). [Observed] No file that main
changed between `ce322e1a` and `f01e228c` is in the subject (354 files against
6). After the merge, `git diff origin/main HEAD | sha256sum` printed the same
digest as the subject.

The reviewer found "None blocking." (section 4), with five notes. Under the
owner's notes-only stopping rule
(`.syzygy/governance/decisions/POLARIS-GATE-SITTING-2026-09-26-DECISION.md`
section 1), the round clears the exact bytes it read, and those bytes are not
edited. This record sits beside them. It is an implementation record and binds
nothing.

Revise-severity findings open: 0

## Retained review evidence

The reviewer's tools and results are kept under
`docs/evidence/launch-form-ctime-review-2026-10-24/`, 27 files. Each has the
sha256 the raw gives for it (section 8). Two keep their bytes under a new
name: the two PR-body copies the raw lists with a `.md` suffix are retained
as `results/pr-body-live.txt` and `tools/pr-body-mutated.txt`, because the PR
body quotes two truncated test-file digests that `check_governance` CG-15
reads as stale act quotes in any `.md` file outside `docs/reviews/`.
- `tools/` (6 files): the record and PR-table checker `check_record.py` with
  its rule-6 fixture `pr-body-mutated.txt`, the mutant harness
  `rev519_mutants.py` (O1 to O8, each with its `old` and `new` fragment), the
  repeat runner `repeat_head.py`, the coarse-timestamp proxy
  `coarse_proxy.mjs` and `one_mutant_default_reporter.py`;
- `results/` (14 files): `check-record-result.txt`, the live PR body the
  checker read, the mutant results on tmpfs and ext4, the record sample, the
  three repeat runs, the probe and proxy samples on both file systems, and the
  target-change-time variant's results and repeats;
- `work/` (7 files): the scratch variant `variant-target-ctime.test.ts`
  (never committed as a test; Vitest's project globs do not reach
  `docs/evidence/`), the default-reporter output for R-chmod-cycle-rewrite,
  both mutant-run logs and the three file lists behind section 1 item 6.

Not retained: the `npm ci`, typecheck and `@syzygy/polaris-dossier` project
logs, and the two `check_governance` transcripts. The raw quotes the result
line of each (section 3 items 8 to 10).

## Class

Class 4 (security), by the reviewer's ruling (section 2). The PR declared
"none", because the change is test-only. The reviewer's reason: the 17
launch-form rows are the rule-6 kill evidence that `launchFormRefusal` counts
no launch form while the marker is unreadable, the reader that
`launched.ts:34-35` ties to SEC-3, so a change to what the rows can kill
changes the security evidence. This agrees with the #506, #511 and #516
rulings. Classes 1, 2, 3, 5, 6 and 7 are not touched.

GP-Q0's three class-4 checks:
- **Differential: degenerate, with a stand-in.** `launched.ts` is
  byte-identical at base and head, so any old-versus-new run of the product
  reader is identical by construction. The informative comparison is old test
  against new test over one mutant corpus: the record's 13 mutants, the
  reviewer's O1 to O8 plus R-chmod-cycle-rewrite at base and head on tmpfs and
  ext4, and three record mutants re-run. The plants are themselves altered
  markers (other formats, a byte-order mark, wrong types).
- **A rule-6 mutant per predicate: met.** The one new predicate, `ctimeNs`
  equality in the snapshot comparison, kills R-chmod-cycle-rewrite at the head
  on both file systems, where it survives at base; O1, O2, O3, O5, O6 and O7,
  and O4 on ext4, do the same.
- **Owner notice:** posted on `syzygy-bpyt.10` at landing (N5).

The stop clause is not triggered: no product byte changes, so
`launchedMarkerState` and `launchFormRefusal` accept and refuse exactly what
they did, and the unmutated head passes 43/43 as the base did.

## N1: the helper comment overstates what moves the change time

[Observed by the reviewer] `launched.test.ts:35-36` says "nothing that leaves
the marker as it was moves the change time". O7 (rename the marker away and
back) fails all 17 rows at the head, O6 (chmod to the mode it already has)
fails 14, and the record's D4-truncate fails `an empty file`. What holds is
narrower: no read-only call moves the change time. Nothing fails open, since
every row still asserts `unreadable`.

**Disposition:** filed as `syzygy-bpyt.8.33` (P3, test-only, class 4), with the
raw's rewording. It cannot ride in this PR, because any byte change would
retire this round's review.

## N2: a link's target is compared by its bytes only

[Observed by the reviewer] `markerSnapshot` takes `ctimeNs` from `lstat`, so a
link row compares the link's own change time. O8 (chmod-cycle the target and
rewrite its bytes unchanged) and O1 on the link row survive the head on
`a symbolic link to the marker Syzygy writes`, on both file systems. Not
fail-open: the reader opens with `O_NOFOLLOW` (`launched.ts:48`). The PR's
residuals do not name this one.

**Disposition:** in `syzygy-bpyt.8.33`, taking the raw's option (a): add the
followed target's change time for a link to a regular file. The reviewer's
scratch variant passed 9 of 9 unmutated runs and killed O1 on 11 rows and O8
on 1. Until that lands, the residual stands as the raw names it: a link's
target is compared by its bytes only.

## N3: the coarse-timestamp residual, restated

[Observed by the reviewer] On this host two changes no one queried shared one
change time in 1,999 of 2,000 pairs on tmpfs and 1,998 of 2,000 on ext4, while
a change right after an `lstat` moved it in 2,000 of 2,000 on each.
[Inferred by the reviewer] The kill's determinism therefore comes from the
kernel's multigrain timestamps, which the snapshot's own `lstat` triggers.

**Correction:** the PR body's residual says a rewrite within one tick "could"
leave `ctimeNs` unchanged. Restated: the change-time kill is deterministic only
where the kernel and file system give multigrain timestamps (as on this host,
kernel `7.0.0-38-generic`, tmpfs and ext4); elsewhere it holds only for a
change that crosses a clock tick, which R-chmod-cycle-rewrite's usually does
not. The unmutated rows cannot fail from this, because a faithful ask moves no
time at all. A re-run of the rule-6 record elsewhere should store the kernel
and file system beside R-chmod-cycle-rewrite's outcome, and
`tools/coarse_proxy.mjs` can serve as the environment check. Hosted CI's
kernel stays [Unknown: not checked]; CI runs only the unmutated file.

## N4: the inode-reuse residual is now Observed closed

[Observed by the reviewer] O4 replaces a regular file or directory with a new
one of the same type, mode and bytes. With TMPDIR on this host's ext4 the inode
numbers were reused on all 12 of its rows: it survives at base and is killed at
the head on the same 12 (`results/rev519-mutants-ext4.json`). On tmpfs it is
killed at both.

**Correction:** the PR body's "[Inferred, not run]" inode-reuse residual is
upgraded: Observed closed at the head on ext4, up to N3's timestamp
granularity.

## N5: the owner notice

**Disposition:** posted on `syzygy-bpyt.10` at landing.

## Acceptance criteria (raw section 6)

- AC1 met, with N1. `markerSnapshot` carries `ctimeNs` and titles are
  unchanged; the comment's reason for comparing the change time goes to
  `syzygy-bpyt.8.33`.
- AC2 met. The record ran at `ab59b666`, whose test bytes equal the head's.
  R-chmod-cycle-rewrite survives at base and is killed on 1 row at the fix,
  reproduced on two file systems. D1 ×5, D3 and T are unchanged (17 to 17), D4
  is stronger (10 to 11), and M survives on both, as stated.
- AC3 met for the review. The owner notice is posted at landing (N5).
