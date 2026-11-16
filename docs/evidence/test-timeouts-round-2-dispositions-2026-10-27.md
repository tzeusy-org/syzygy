# Explicit test timeouts: review dispositions, rounds 1 and 2

[Observed] This record gives the dispositions of the two CC-REV-1 review
rounds of `syzygy-bpyt.4.31` (pull request #537). The change works every
explicit test-runner timeout in the vitest suite against the coordinator's
seven rulings (2026-10-27, in the bead's comment):
- a site is removed when its worst observed run is at most half Vitest's
  default (2500 ms for a test, 5000 ms for a hook);
- otherwise it is kept at its base value, with a reason that cites a
  retained measurement of that same site;
- no site is set below its default or resized.

The lane's evidence is under `docs/evidence/syzygy-bpyt-4-31/`.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) |
|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-TEST-TIMEOUTS-1-RAW.md` | `REVISE` | `f44cd65d` | `r1-review.diff` sha256 `09f3105478c5988d45f03f7b6c593677550241a5ad9c763d2f543d5cd7d83b0f` |
| 2 | `docs/reviews/R-GP-IMPL-TEST-TIMEOUTS-2-RAW.md` | `CONFIRM WITH EXCEPTIONS` | `e54f65c6` | `r2-review.diff` sha256 `f618b42b872bdf88d6dbbeced4e126c3a3ed2d07674408bfbeb6c025087c4fc5` |

Round 1's subject equals `git diff f7477f52 f44cd65d`. Round 2 was narrow:
its subject equals `git diff f44cd65d e54f65c6`, 24 files, of which two are
code (`dossier-cap-measure.test.ts` and `production-reobserve.test.ts`, +2/−2
together). The whole PR over its base, `git diff f7477f52 e54f65c6`, is 123
files and hashes to
`8556a75a0c659f97783e773c8bded0aed5863456f2031b7052f003650ca73f79`.

At landing the branch took one merge: `2ffc7405`, the landing head of PR
#542. That commit holds PR #538's landing and main `973965a8`. The branch
merged it rather than main alone, so the commit landed here holds all three
PRs' bytes, and the battery that ran on it covers the tree main has after the
three merges. [Observed] The merge had no conflict. 777 paths changed from
`f7477f52` to `2ffc7405`, and 4 of them are PR paths:
- in `polaris-accessible-names.browser.test.ts`, `surface-routes.test.ts`
  and `tuple-encoding.test.ts`, main changed only the import line
  (`@syzygy/cap1-daemon` to `@syzygy/http-host`);
- in `package-reader.test.ts`, main added one hunk of 30 lines after line 146.

The other 119 PR paths are byte-equal to `e54f65c6` after the merge
(`git diff --quiet e54f65c6 HEAD -- <the 119>`), and the merge's diff over
`2ffc7405` names exactly the PR's 123 paths. Hosted `checks` and `node`
passed at `e54f65c6`. The battery ran on the landing commit (rule 7), and
hosted CI on that commit was checked before the merge. PR #537 was merged
only after PR #542.

**Line numbers after landing.** Round 2 ran the lane's census on its own
merge with `973965a8` (raw section 1). All 92 head sites are present. 77 keep
their line number, and the 15 sites in `package-reader.test.ts` after line
146 move down 30 lines. No site's reason text or citation differs. The census
and audit records name the commit their lines count at (`d627a6b4`, and
`546f1ff0` for `cited.json`'s `linesAt`), so they stay correct; read their
`package-reader.test.ts` line numbers against those commits.

Round 2 found notes only. Under the owner's notes-only stopping rule
(`.syzygy/governance/decisions/POLARIS-GATE-SITTING-2026-09-26-DECISION.md`
section 1), round 2 clears the exact bytes it read, and those bytes are not
edited. This record sits beside them. It is an implementation record and binds
nothing.

Revise-severity findings open: 0

## Class and the GP-Q0 ruling

Both rounds ruled the class none (round 1 raw section 2, round 2 raw section
6):
- no product source changes, only 30 test files and one test-runner config;
- the comment-free token streams of the 31 code files are identical at base
  and head, except for the deleted timeout arguments and one deleted
  constant;
- class 4's two contested places, the `no-egress` hook and the consent-gate
  tests, change nothing an assertion checks (round 1 raw section 2).

A test timeout is a test runner's budget, not product behaviour. It can turn
a test red under load, which is what round 1's F1 found, but that is
test-suite reliability, not a GP-Q0 behaviour. Nothing a gate accepts or
refuses changes. GP-Q0's further checks (`:62`) apply to classes 1, 3 and 4,
so no differential, mutant set or owner notice is owed. The lane ran mutants
over its own tools anyway, and both rounds re-ran them.

## Round 1: two blocking findings

**F1, `dossier-cap-measure.test.ts:12` was removed past ruling 1's hook
threshold.** Under load, round 1 saw the `beforeAll` take 5,107 ms in 1 of 33
observations, against the 5,000 ms threshold. The coordinator took round 1's
arm (a). The base `}, 120_000);` is restored byte for byte, with a reason
that cites this hook's exceedance. A new input, `later-observations.json`,
makes `check_removals.py --later` refuse the removal: 48 of 58 removals hold.
Round 2: repaired, with landing condition N1.

**F2, `production-reobserve.test.ts:160` was kept on another test's
measurement and not counted as a residual.** The coordinator's condition for
removing it was a worst run of 2,500 ms or less. Its retained full-suite runs
give 3,929 to 8,477 ms, so the coordinator ruled it kept. Its reason now cites
two records that name this test (`full-runs.json` and
`repair-durations/production-reobserve.test.tests.json`). In
`citation_audit.py`, a file match now counts only for a site with no test
name of its own. Round 1's T4 and T5 are kept as mutants A12 and A13, and all
13 of the audit's mutants are killed. Round 2: repaired. The audit's counts
are 60 sites measured by test, 13 by file, and 2 residuals.

## Round 1: twelve notes

Round 2's verdict on each is in its raw section 6.
- **N1** (census mutant M8 killed by a syntax error): repaired. M8 is now a
  valid rename, and a SyntaxError counts as an error, not a kill.
- **N2** (five census forms no live file uses): deferred to
  `syzygy-bpyt.4.41`, as the note allowed.
- **N3** (`decide.py` constants had no mutant): repaired, with T1-T3 as
  killed source mutants.
- **N4** (a stem match passed the audit): repaired as written. Round 2's N3
  takes the remaining basename case further.
- **N5** (`--hookTimeout` is not applied in a `--project` run): repaired in
  the hook tool's header and the PR body.
- **N6** (line numbers count at `546f1ff0`): repaired in the PR body.
- **N7** (three hook removals sit close to the threshold): deferred to
  `syzygy-bpyt.4.41`. In round 2's full run their suites' hook times were
  2,594, 1,802 and 2,302 ms.
- **N8** (`pipeline-demo:73` labelled "file"): repaired; it is now measured
  by test.
- **N9** (`cap1-system.hooks.json` exit-1 runs): repaired. The per-run causes
  are [Unknown], a probe names an unhandled worker RPC timeout, and a new
  exit-0 set of 5 runs exists.
- **N10** (`cited.json` had no commit for its lines): repaired with
  `linesAt`.
- **N11** (the PR body's #532 sentence): reworded. Round 2 did not re-verify
  #532's 10 files, so `syzygy-bpyt.35` item 5 carries the check to #532's
  landing.
- **N12** (host stubs under ruling 7): `check_host_stubs.py` finds 55 of 55
  stubs agree with `host.json`, and its mutants H1 and H2 are killed. The
  coordinator rules that a two-field stub checked against `host.json` is a
  copy of the one host record, not a second record, so it is within ruling 7.

## Round 2: four notes

- **N1, a landing condition.** The reason at `dossier-cap-measure.test.ts:12`
  cites `docs/reviews/R-GP-IMPL-TEST-TIMEOUTS-1-RAW.md`, which did not exist at
  `e54f65c6`. That raw lands in this commit, verbatim, and hashes to
  `0ca96c9a5c8b8701f7c21605f21b113976aebab61ec0548280be419a7dbb55cf`, the
  digest `later-observations.json` and `removal-check.json` name. So the
  condition is met. The optional extra citation of `later-observations.json`
  in the reason is `syzygy-bpyt.35` item 1.
- **N2** (`check_removals.py --later` keeps the last row per site, and drops
  a row that names no removal; mutants L5 and L4 survive): latent, since the
  one row names a decided removal. Carried to `syzygy-bpyt.35` item 2.
- **N3** (`citation_audit.py` matches a file by basename and a test by title
  only; mutants R2 and R4 survive): latent, with 0 collisions over the 13
  file-measured sites and 59 test-measured titles. Carried to
  `syzygy-bpyt.35` item 3.
- **N4** (the script that extracted `later-observations.json` is not
  retained): round 2 checked 13 of its literals against the round-1 raw, and
  each holds. Carried to `syzygy-bpyt.35` item 4.

## Retained review evidence

Both reviewers' tools and results are kept under
`docs/evidence/test-timeouts-review-2026-10-27/`, 259 files:
- `r1/` (171 files): round 1's tools and results. Its raw section 8 lists 176
  kept files with their sha256. At landing a script checked all 176 against
  the reviewer's directory: 176 matched, 0 failed, and no kept file was
  unlisted.
- `r2/` (88 files): round 2's tools and results. Its raw section 8 lists 93
  kept files. At landing the same script checked all 93: 93 matched, 0
  failed, and no kept file was unlisted.

Not retained, though each raw quotes the result lines: in each round, the
governance, quotation and typecheck logs and two `npm ci` logs, 5 files per
round. A governance log quotes the retired phrases it reports, so a tracked
copy would fail CG-2a.

## Acceptance criteria

- Every explicit timeout site is worked: 92 head sites. Of the 123 workable
  sites, 48 are absent, exactly the set `check_removals.py` says hold, and 75
  keep their base value with a reason and a citation (round 2 raw section 3.3,
  by its own method).
- Rulings 1, 3 and 5: no removal's worst observed run is over its threshold,
  no site is below its default, and none is resized.
- Ruling 6: every kept reason cites a measurement of its own site, or is one
  of the 2 counted residuals.
- Ruling 4: both config-level timeouts are kept, each citing a measurement.
- Ruling 7: the host is recorded once, in `host.json`, with the stubs checked
  against it.
- The full vitest suite passes at `e54f65c6` (5,357 passed, 5 skipped; round
  2 raw section 3.6), and hosted `checks` and `node` pass.
