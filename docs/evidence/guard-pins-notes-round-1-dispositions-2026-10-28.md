# Guard-pin follow-up notes: review dispositions, round 1

[Observed] This record gives the dispositions of the CC-REV-1 review of
`syzygy-bpyt.39` (pull request #547). The change takes four notes of PR
#541's round-3 review (`docs/reviews/R-GP-IMPL-GUARD-PINS-FOLLOWUP-2-3-RAW.md`):
N1, N3, N4 and N5. It edits two evidence tools and one summary under
`docs/evidence/syzygy-bpyt-8-39/` in place, changes comment text in
`packages/polaris-generation-core/src/workspace-reach.testkit.ts`, and adds
the bead's own evidence under `docs/evidence/syzygy-bpyt-39/`. No guard, test
or product file changes.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) |
|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-GUARD-PINS-NOTES-1-RAW.md` | `REVISE` | `38fa1596` | `r1-review.diff` sha256 `2eed0ddc776e4103a58c27e3f95db5e9c1a7adae19a93b58d382c2091825f9c7` |

The subject equals `git diff 81862261 38fa1596`: 15 files, +1540/−14. Its
`packages/` part hashes to
`15826057c37847909d6b7d85e4c432d8bf75c52c3324399e8b3fa432af14ab7d`. The
reviewer re-derived both digests (raw section 1).

## The one blocking finding, and why there was no round 2

Round 1's only blocking finding, F1, was a sentence in the PR body, not in
the reviewed bytes. The sentence said the probe's version calls "no longer
read the caller's `.npmrc`". That is false when the scratch directory lies
inside the caller's npm project: npm then takes the caller's directory as the
project, and the reviewer observed the fixed probe opening the caller's
`.npmrc` once. The reviewer stated that no reviewed byte has to change, and
gave replacement text.

**Ruling (coordinator, 2026-10-28).** The coordinator replaced that line of
the PR body with the reviewer's text, and checked the result by the
reviewer's own test: the new phrase occurs once and the old sentence zero
times. In the same edit, it added the CC-REV-1 class section that N5 asks
for. The reviewed bytes are unchanged at `38fa1596`, and every other finding
is a note. So no round 2 was dispatched, as with PR #543's F1. CC-REV-1 asks
for a fresh review when a reviewer authors a semantic fix to the reviewed
bytes; this fix is prose in the pull request, outside them.

The PR body the reviewer read hashes to
`dfabd04d7368b065e794273d8857a1b90bf07f9c6fb5a7fd9e99072a200e9f8b`. Lane A
then filled in the battery line in an edit that overwrote the coordinator's
first repair. The coordinator restored the repair and kept lane A's battery
lines. The body as applied hashes to
`912df49bfc0ad9655533f6af8ca700abbb5e134a3b5c14f118b77c78df7e95ec`.

Revise-severity findings open in the reviewed bytes: 0.

## What the reviewer verified

All of the following are [Observed] in the raw, sections 3 and 6:
- **The in-place edit of 8.39's evidence is right here.** No tracked file
  outside the set this PR regenerates cites the old bytes of the three
  edited files by digest. The sweep covered 6,827 blobs at the head and
  6,816 at the base, in sha256, prefix and blob-id forms. The one exception
  is the new "before" trace, which cites the old probe on purpose. Every
  locator into the three files is commit-scoped. The reviewer ruled that new
  copies under `syzygy-bpyt-39/` would have been worse (raw section 6).
- **N1 (round 3): met, with a residual.** Dropping each of the three
  predicates of 8.39's comment-only check leaves exactly its own entry
  alive, 75/76 each. The residual is this round's N2.
- **N3 (round 3): partly met.** Both version calls run with `cwd` set to
  scratch, and `npm-alias-probe.json` is byte-identical under the new probe.
  The claim still lacks its precondition (F1, N1).
- **N4 and N5 (round 3): met.** Both hedged sentences are true. The
  root-manifest exception holds for all ten forms of the first bullet and
  both forms of the second, observed through the lock entry, the install and
  Node's resolution.
- **No gate changes.** The testkit's emit and comment-stripped print are
  equal, 1,300 of 1,300 parse-tree leaves are equal, and `LOCAL_VERSION`
  stays at line 79. The four testkit importers pass 98/98 at the head and on
  the merge.
- **Checks:** the whole vitest suite once at the head, 5,511 tests: 5,505
  passed, 1 failed, 5 pending. The failure is one `gate-acts.test.ts` case at
  5,096 ms against the 5 s default under load, and the file passes alone,
  133/133 (N6). Hosted `node` passed the same 5,511. Typecheck exit 0;
  governance 32 OK, 21 WARN, 0 FAIL; quotations exit 0; hosted `checks`
  pass.
- **The selftest figures,** each correct for its own commit: 70/70 at
  `93dc0390`, 74/74 at the base `81862261`, 76/76 at the head.

## Class and the GP-Q0 ruling

The reviewer ruled CC-REV-1 class none (raw section 2), and nothing a gate
accepts or refuses changes. The PR body now states the class.

## The notes

- **N1** (both probe docstrings state the npmrc property without its
  precondition), **N2** (8.39's `@since` hook sits after the
  evidence-directory filter, so a widened filter survives) and **N3** (the
  new `record.py` leaves 4 of its 18 checks and four expression mutants
  unexercised) are evidence tooling. They are carried to `syzygy-bpyt.49`,
  with the reviewer's verified diffs and entries, which are retained with
  this record.
- **N4** (a cold reading of #541's record goes stale): taken here, below.
- **N5** (the PR body stated no class and promised a battery comment that
  never came): repaired in the PR body. The battery result is
  `commit=38fa15966db89bfede725fbde8073aef552daf0b commands=114 nonzero=0`.
  The pull request merges with a merge commit, so the commits the new record
  pins, `fafe3669` and `226e367b`, stay reachable.
- **N6** (a `gate-acts.test.ts` case times out under load): outside this
  diff, carried to `syzygy-bpyt.4.40`.

## A dated pointer for #541's record (N4)

[Observed, 2026-10-28] `docs/evidence/guard-pins-followup-2-round-3-dispositions-2026-10-27.md:78-80`
reports 8.39's `record.py --selftest` as 74/74 "on the landing tree". That is
true at `a403b902`, #541's merge. This PR edits 8.39's `record.py` and
`npm_alias_probe.py` in place. On main after it, the same command prints
76/76, and 8.39's `summary.json` carries two new tool digests. The same
record's `:163-166` ("stands unhedged in the testkit until that bead lands")
is historical from this PR on. That record is not edited.

## The landing

The landing commit merges #546's landing head `213afd0c` into the reviewed
head `38fa1596`. `213afd0c` is itself main `b10e4da9` (#532) plus #546. So
#547 lands stacked on #546, and one battery covers both. Main changed none
of the 15 PR paths since `81862261`, and neither did #546. So against
`213afd0c`, the landing commit differs in exactly those 15 paths, each
byte-equal to `38fa1596`, plus the raw, this record and the retained
evidence. The battery and hosted checks at the landing commit are in the
landing note on the pull request.

## Retained review evidence

The reviewer's tools and results are kept under
`docs/evidence/guard-pins-notes-review-2026-10-28/r1/`, 42 files. The raw's
cleanup section lists 44 kept files with their sha256. At landing, a script
checked all 44 against the reviewer's directory: 44 matched, 0 failed, and
no file was unlisted. Not retained, though the raw quotes each one's result:
the reviewer's `npm ci` log and typecheck log.

This is an implementation record and binds nothing.
