# CRLF code-context mask: review dispositions, rounds 1 to 3

[Observed] This record gives the dispositions of the three CC-REV-1 review
rounds of `syzygy-bpyt.16` (pull request #544), and retains the independent
vet of the owner decision the change implements. The owner answered decision
bead `syzygy-bpyt.1.14` with "Arm (a) + bare CR (Recommended)": inside the
PWB-REQ-006 code-context mask a line ends at CRLF, CR or LF, the split keeps
every terminator and offset, and a CRLF or CR text gets exactly its LF form's
decision. One production file changes,
`packages/three-surface-poc-core/src/markdown-code-context.ts`. The lane's
evidence is `docs/evidence/syzygy-bpyt-16/`, with the differential record
`crlf-mask-2026-10-27.json`.

| Raw | Verdict (line 2) | Commit (line 3) | Subject (line 4) | sha256 of the raw |
|---|---|---|---|---|
| `docs/reviews/V-CRLF-MASK-1-RAW.md` | `REPRODUCED` | `8ff50172` | the vet of `syzygy-bpyt.1.14` | `4f1b16f3fd9c2130e3a0ccae5ec447e676592ec4b012d0e1cbf8cb1cc3f62ac3` |
| `docs/reviews/R-GP-IMPL-CRLF-MASK-1-RAW.md` | `REVISE` | `c399eda9` | `r1-review.diff` sha256 `35771aae39a2c8426c1c340bded03db50a4957c22ff9340890a6d083b2b38aee` | `1a2010ae4d7fe2de19aac036545b0ade689d69dcca0ef5c9f15333a161302964` |
| `docs/reviews/R-GP-IMPL-CRLF-MASK-2-RAW.md` | `REVISE` | `561e4f77` | `r2-review.diff` sha256 `0c7cb106c350a2cdc82f3b27221883f5b3cbed0926e409eed6ae29817eb48709` | `165b3f71212e914b8f3a36e642b8d440a36e74ed7176cbe938e4f26676c8647a` |
| `docs/reviews/R-GP-IMPL-CRLF-MASK-3-RAW.md` | `CONFIRM WITH EXCEPTIONS` | `1ff3ed7d` | `r3-review.diff` sha256 `699f4b1c1f15a66a9a4d22bf1d712bb1d0fe81f3d8d50ce4fdc83a5d234db7ec` | `0b112f9696ca4ad098159612ce40f044255a214ae608a290da0cd28ffba6dd0b` |

The raw digests of rounds 1 and 2 are the ones the PR body cites. Round 3 had
notes only, so it cleared the bytes it reviewed under the owner's notes-only
stopping rule. Revise-severity findings open: 0.

## Class and the GP-Q0 ruling

[Observed] Each round ruled CC-REV-1 classes 3 (deterministic observation)
and 4 (security: the mask decides which text the SEC-3 active-content scan
reads). Classes 1 and 6 stay unclaimed: no authority table, endpoint or wire
format is touched. Round 3 found the change inside the owner's ruling on every
corpus measured, so GP-Q0's stop clause is not reached (raw section 2). The
change moves what a gate accepts and refuses, as the owner's answer
authorizes, so the coordinator posted a notice on `syzygy-bpyt.10` at landing
with round 1's N7 content.

## What the reviewers verified

All [Observed] in the raws:
- **No LF decision changes.** 0 of 786,600 LF fuzz texts (round 1); C1 0
  failures over 1,825 LF forms and 10,131 separator-slice texts (round 3).
- **Every CRLF, CR and mixed rendering decides as its LF form**: C2 11,054
  of 11,054; and over 1,230,663 fuzz texts every change is a CR-bearing text
  moving to its LF form's decision (round 1, H3).
- **The PR's accept/refuse table is exact** over its synthetic corpora:
  refuses 427, accepts 3,307, 2,046 rows excluded with another finding, 5,274
  unchanged, summing to 11,054 (round 1 section 5).
- **The repairs changed no production byte.** 0 of 437 production paths
  differ between `561e4f77` and `1ff3ed7d`, and `markdown-code-context.ts`
  has one sha256 at `6928b50a`, `561e4f77` and `1ff3ed7d` (round 3
  section 1).

## Round 1 (REVISE)

- **F1** (blocking: a `LINE_END` widened to U+2028, U+0085 or the JavaScript
  line-terminator set changes LF decisions and no check failed): repaired in
  `c399eda9..561e4f77` with the reviewer's pin, mutants MU17 to MU19 and the
  differential's separator slice; met in round 2.
- **N2(a), N2(b), N4**: repaired in the same range; met in round 2 (N4(c)
  partly, finished in round 2's repair).
- **N1** (the huge-fence `RangeError` now reaches CRLF and CR texts) and
  **N3** (U+2028 or U+2029 in a backtick opener line, older than the PR):
  owner questions `syzygy-bpyt.1.18` and `syzygy-bpyt.1.19`, answered on
  2026-10-28 in
  `.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-FOLLOWUPS-2026-10-28.md`
  (Q1 answer A, carried by `syzygy-bpyt.1.18`; Q7 answer A, implemented by
  `syzygy-bpyt.60`).
- **N2(c)** (the line-model residual): agent work on `syzygy-bpyt.1.20`.
- **N5** (other than the slice) and **N6**: test-quality follow-ups on
  `syzygy-bpyt.41`.
- **N7** (what the landing notice must state): taken into the notice.

## Round 2 (REVISE)

- **F1** (blocking: a test count in the PR body was attached to a commit
  that does not hold it): repaired in `561e4f77..1ff3ed7d`; met in round 3.
- **N1, N2, N4, N5, N7(b)**: repaired in the same range; met in round 3.
- **N3** (LF then CR read as one line end moves only a malformed line):
  `syzygy-bpyt.41`.
- **N6** (a load timeout outside the PR) is a note only; **N7(a)** is
  covered by the general pin.

## Round 3 (CONFIRM WITH EXCEPTIONS)

- **N1** to **N4** (sibling code units the fence-position row and the U+2028
  pin do not name; a mutant-script gate that cannot fail; a row failure that
  does not name its separator; U+2028 or U+2029 in an opener's info string,
  older than the PR): posted to `syzygy-bpyt.41` with round 2's N3, which
  discharges **N6**.
- **N5** (the PR body's round-2 paragraph omits what F1 found false): body
  text only, taken at landing with the reviewer's proposed wording.

## The landing

The landing commit merges main `e4a3a607` (PRs #545, #550, #551 and #552
among others) into the reviewed head `1ff3ed7d`. Of the PR's paths outside
its evidence directory, main changed only `AGENTS.md` since the last merge
base `f7ea8584`, and the two edits met in the fence bullet: this PR's
sentence on the mask, and #552's sentence recording the owner's 2026-10-28
ruling on G2 and G3. The landing keeps both, and drops this PR's clause that
called G2 and G3 open owner questions, which that ruling made false. The
mask module and the seven test files are byte-equal to `1ff3ed7d`. The
battery at the landing commit and hosted `checks` and `node` there are in the
landing note on the pull request. The PR body changed after round 3 only by
round 3's N5 wording, applied verbatim.

## Retained review evidence

The reviewers' and the vetter's tools and results are kept under
`docs/evidence/crlf-mask-review-2026-10-28/`: `r1/` 49 files, `r2/` 32,
`r3/` 28 and `vet/` 13. Each round's raw lists its kept files with their
sha256 in its cleanup section. At landing, a script checked rounds 1 to 3
against their raws: 49, 32 and 28 matched, 0 failed, and no file was
unlisted. The vet raw lists its 13 files in a three-column table with
shortened digests, and all 13 match by prefix. No governance, quotation,
typecheck or `npm ci` log and no copy of the PR body was kept.

This is an implementation record and binds nothing.
