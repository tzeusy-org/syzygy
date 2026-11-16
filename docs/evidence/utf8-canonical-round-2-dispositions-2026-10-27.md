# One strict UTF-8 decoder: review dispositions, rounds 1 and 2

[Observed] This record gives the dispositions of the two CC-REV-1 review
rounds of `syzygy-bpyt.6.3` stack 2 (pull request #534). It is the second of
the bead's three stacked PRs. #530 (the support leaf) and #533 (the fence
rules) have landed. This PR covers the bead's acceptance criterion on the UTF-8
decoder and the canonical JSON encoders:
- `@syzygy/support` gains `decodeUtf8(bytes)`, a strict decoder that drops
  one byte-order mark and returns `undefined` on refusal. It replaces three
  local helpers and one `STRICT_UTF8` constant: `git-object-reader.ts`,
  `project-shape-observation.ts`, `authority-artifact-fields.ts` and
  `code-structure.ts`.
- The three key-sorted JSON encoders are **not** merged, because the
  evidence says they are not equivalent. They are the lenient
  `canonicalJson`, the strict `encodeCanonicalJson` and cap1's
  `deterministicLayer`. The difference is recorded in an `AGENTS.md` bullet,
  two pointer comments and `canonical-json-divergence.test.ts`.

The lane's evidence is under `docs/evidence/syzygy-bpyt-6-3/`, in the record
`dc3-decode-and-canonical-json-2026-10-25.json`.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) |
|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-UTF8-CANONICAL-1-RAW.md` | `REVISE` | `2d3f9375` | `r1-review.diff` sha256 `ebe914b6ac942629ccd819b06cedac08f6bfaebacf2109ee19ac165a60afa7fd` |
| 2 | `docs/reviews/R-GP-IMPL-UTF8-CANONICAL-2-RAW.md` | `CONFIRM WITH EXCEPTIONS` | `abc40c9a` | `r2-review.diff` sha256 `b73519daf1dbf9b2902bb0a359e70ea6560f49a374b71475aeb3404630b98ab2` |

Round 1's subject equals `git diff a5ab2b28 2d3f9375`, the PR's own delta
over #530's reviewed head. Round 2 was narrow. Its subject is the lane's own
change since round 1, without main: `git diff 2d3f9375 b329dc9c` followed by
`git diff a5b1d532 abc40c9a`, concatenated. Round 2 also checked both merges
of main:
- `e6afa657` is git's own merge of main `d38d7a3c`, with the same tree;
- `a5b1d532` merges main `41932c3b`. It differs from git's own merge only
  at its two conflict paths, and both sides of `AGENTS.md` are kept byte for
  byte (round 2 raw section 1).

The whole PR over `41932c3b`, `git diff 41932c3b abc40c9a`, is 47 files and
hashes to
`7a6fc1b50cc2de1f048bc9d3b70d6c0ff1494dd5e3f5bd41eac2103d8f0ef50b`.

At landing the branch took one more merge: `5e78e852`, the landing head of
PR #537. That commit holds PRs #542 and #538 and main `973965a8`. The branch
merged it rather than main alone, so the commit landed here holds every PR's
bytes, and the battery that ran on it covers the tree main has after all the
merges.

[Observed] The merge had no conflict. 670 paths changed from `41932c3b` to
`5e78e852`, and 1 of them is a PR path, `project-shape-observation.test.ts`.
PR #538 added a literal-digest row to that file, and this PR adds BOM rows.
The other 46 PR paths are byte-equal to `abc40c9a` after the merge, and the
merge's diff over `5e78e852` names exactly the PR's 47 paths. On the merged
tree, `project-shape-observation.test.ts`, `project-shape-manifest.test.ts`,
`git-object-reader.test.ts` and `project-shape-git-text.test.ts` pass, 144 of
144. Hosted `checks` and `node` passed at `abc40c9a`, and the lane's
clean-clone battery gave `commands=114 nonzero=0` there. The battery ran
again on the landing commit (rule 7), and hosted CI on that commit was
checked before the merge. PR #534 was merged only after PR #537.

Round 2 found notes only. Under the owner's notes-only stopping rule
(`.syzygy/governance/decisions/POLARIS-GATE-SITTING-2026-09-26-DECISION.md`
section 1), round 2 clears the exact bytes it read, and those bytes are not
edited. This record sits beside them. It is an implementation record and binds
nothing.

Revise-severity findings open: 0

## Class and the GP-Q0 ruling

Both rounds ruled that the whole PR touches classes 1, 3 and 4, with an
additive class 6:
- class 1: the consent, policy and registry readers decode through
  `decodeUtf8`;
- class 3: `code-structure.ts`, the code-structure observer's git runner;
- class 4: the object reader feeds the active-content scan, and the seed
  reader feeds `classifyPhaseA`;
- class 6: `decodeUtf8` is a new export in a private package.

GP-Q0's checks (`:62`):
- **Differential.** `utf8-probe.mjs` runs 9 drivers over 1,604 inputs each,
  plus 9 code-structure cases. At `abc40c9a` its output is byte-identical to
  the base's: 12,841 rows, 0 differ (round 2 raw section 5).
- **A rule-6 mutant per predicate.** At the repair, 8 of 8 mutants are killed
  by the whole suite. Round 2's own mutants are killed except X2 and X6, two
  BOM variants that only the probe kills (its N1 below).
- **Owner notice.** Posted on `syzygy-bpyt.10` at landing.

**What a gate accepts or refuses.** Round 2 found:
- over main, the 8 production files add or remove no string literal except
  imports and three `'utf-8'` decoder arguments;
- the injected allocation fault in `code-structure.ts` again yields the
  base's Unknown reason;
- the decoder probe matches the base on every row.

So no refusal string, Unknown reason, exit code or gate outcome changes
against main, and the stop clause (`:95-96`) is not triggered.

## Round 1: two blocking findings

**F1, no committed test pinned the BOM predicate at the object reader
(`git-object-reader.ts:356`) or the seed reader
(`project-shape-observation.ts:433`).** Mutants S1 and S2, which keep the BOM
at the site, passed the full suite and were killed only by
`utf8-probe.mjs`. The routing asked for the reviewer's two tests, with
literal expected values. The repair adds them:
- the object reader: `EF BB BF 61 0A` to `"a\n"`, and a doubled BOM to a
  string that keeps the second;
- the seed reader: a BOM-led seed to `"a\n"`.

Round 2: repaired. S1 and S2 survive at `2d3f9375` (0 of 1,149 core tests
fail) and are killed at `b81010c8` by the new literal assertions.

**F2, the `code-structure.ts` reorder changed an Unknown reason on an
allocation failure.** The coordinator ruled arm (a): put `withoutGitlinkRecords`
back inside the converting try. Both arms are now pinned by an injected
`Buffer.concat` failure with a no-fault control. Residual 7 now reads "throws
only when the copy cannot be allocated". Round 2: repaired. The fault test
kills F2, X3 and X4, and the fault reason at `abc40c9a` is the base's.

## Round 1: eight notes

From round 2's table (raw section 6):
- **N1** (the encoders bullet overstated what a merge would change):
  repaired, with round 2's N2 and N3 on the new wording.
- **N2** (the divergence test cited a missing file and counted two
  encoders): repaired.
- **N3** (three more survivors, and a BOM test that could not fail):
  repaired. S4 is pinned, the rev-parse case is split, S9 is killed by the
  listing case, and S10 is killed through a fake `git`.
- **N4** ("the one strict `decodeUtf8`" while 20 inline strict decoders
  remain): repaired in `AGENTS.md`. The record lists the 20, and round 2's
  predicate reproduces them. Adopting the helper at those sites is
  `syzygy-bpyt.37`.
- **N5** (the record's claims ran ahead of its detectors): repaired, with
  round 2's N5 on the new logs.
- **N6** (on a Node without ICU, the decoder now fails at import): disclosed in
  the PR body and the record only. Round 2's N7 asks for one comment line in
  `decode-utf8.ts`, which is `syzygy-bpyt.38` item 7.
- **N7** (#533 overlapped this PR): repaired by both merges, as described
  above.
- **N8** (the digest-citer sweep missed an 8-hex citer): repaired at
  `b81010c8`. Round 2's N4 finds the sweep stale at the head.

## Round 2: seven notes

Each is carried to `syzygy-bpyt.38`, with the item number given:
- **N1** (item 1): a doubled BOM is pinned at the object reader only. X2, at
  the seed reader, and X6, at the git-text decode, survive every committed
  test.
- **N2** (item 2): `AGENTS.md` (the canonical-JSON encoders bullet) and
  `canonical-json-divergence.test.ts:18` say the lenient encoder "spells" a
  BigInt. It throws `TypeError`, which the same test pins at `:148`. Read
  that sentence as: the strict encoder refuses what the lenient one spells
  (an `undefined` member), and the two refuse a BigInt with different errors.
- **N3** (item 3): the six extra tap calls come from the new tree-listing
  test, not the seed-reader tests. The figure reproduces; only the
  attribution, labelled Inferred, is wrong.
- **N4** (item 4): the "none under `.syzygy/`" digest-citer claim held at
  `b81010c8`, before the merges. At the head, one governed file cites the base
  digest of `authority-artifact-fields.ts`: the P-115 package's
  `compatibility/STATIC-TRACE.json`. It is pinned to commit `eba011df`, is not
  a manifest row, and binds nothing at the head.
- **N5** (item 5): two retained logs name no commit, command or exit status,
  and the merged-tree checks have no retained log. The record carries the
  commits and exit statuses, so the chain from the record holds.
- **N6** (item 6): `killedByANewTest` lists C1, which only a pre-existing
  test kills. The PR body's "each is killed by a named assertion in the new
  tests" is true of 7 of the 8.
- **N7** (item 7): the no-ICU import-time throw is not stated in
  `decode-utf8.ts`.

## Retained review evidence

Both reviewers' tools and results are kept under
`docs/evidence/utf8-canonical-review-2026-10-27/`, 71 files:
- `r1/` (32 files): round 1's tools and results. Its raw section 8 lists 39
  kept files with their sha256. At landing a script checked all 39 against
  the reviewer's directory: 39 matched, 0 failed, and no kept file was
  unlisted. Not retained, though the raw quotes each one's result line: 7
  files, namely two governance logs, two quotation logs, two typecheck logs
  and one `npm ci` log.
- `r2/` (39 files): round 2's tools and results. Its raw section 8 lists 43
  kept files, and the same script found all 43 matching. Not retained: 4
  files, namely one each of the governance, quotation, typecheck and `npm ci`
  logs.

A governance log quotes the retired phrases it reports, so a tracked copy
would fail CG-2a.

## Acceptance criteria

The bead's criterion for this stack covers the decoder and the canonical JSON
encoders:
- **One strict decoder.** Met for the four sites the PR converts. The 20
  remaining inline sites are named, and adopting the helper there is
  `syzygy-bpyt.37`.
- **The encoders.** Not merged, on evidence: the strict encoder would refuse
  754 of 1,439 production lenient calls (753 with an `undefined` member, 1
  with a BigInt). That divergence is pinned by
  `canonical-json-divergence.test.ts`.
- **GP-Q0's review rule.** The differential and the mutants are met, and the
  owner notice is posted at landing.
- **Tests.** `Tests: +41 ~0 -0` for the whole PR over main, and the full
  suite passes at `abc40c9a` (5,476 passed, 5 skipped; round 2 raw section 3).
