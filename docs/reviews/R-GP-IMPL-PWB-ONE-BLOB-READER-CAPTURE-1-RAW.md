# R-GP-IMPL-PWB-ONE-BLOB-READER-CAPTURE-1 — CC-REV-1 evidence review of syzygy-q44o (PR 607), round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 66ba6eb831e06aa0b83929acc2136c5a7bb8722d
Subject: `git diff 6e4974aa95fa79b8d20f0bbbb13a067b4656dcc2 66ba6eb8` sha256 822ad32c2301c1c9ceddd4f5c21bf6b9ce63950d7bab66e8c286f0f6bcbe236e (1,289 lines, 7 files, all under docs/evidence/syzygy-bpyt-6-5/)

Reviewer: independent, fresh-context CC-REV-1 reviewer (pr-review-task `syzygy-8s06`), 2026-11-03. I did not write
this change. I read the bead `syzygy-q44o`, the bead `syzygy-bpyt.6.5` (acceptance criterion 3), the PR body, the
seven changed files, the parent record `differential-2026-11-03.json`, the parent review raw
`R-GP-IMPL-PWB-ONE-BLOB-READER-1-RAW.md` (E1, E2), and AGENTS.md verification rules 4, 6, 7, 9 and 11. All runs used
scratch worktrees under `/tmp/r607/` (base `85c54814580a09bf07e0f8d3536259e126b9ffb5`, head
`08f2287d5b9424c549250088690c5abe3da4c357`), `npm ci` in each before any run, and `TMPDIR` set to
`/tmp/r607/tA` (capture) and `/tmp/r607/tB` (differential), neither of which the author used. No Butlers or other
observed repository content was read, no daemon was started, the live mode was not run, and PR 607 was not edited. No
`bd` mutation ran. CI on the head: all five checks pass.

CC-REV-1 class: 3 (deterministic observation), evidence-only. I agree with the proposed class.

## Verdict basis

The evidence is sound and reproduces. The exceptions are about what the record says it establishes, not about what it
measured. The PR body is honest (it says "Not a Butlers capture" and does not call AC 3 met); the JSON record, which is
the retained artifact, is not: E1 below.

## Findings

### E1 (medium): the record says AC 3's capture "remains met" by a stand-in

`capture-differential-2026-11-03-q44o.json`, `capture.liveMode`: "AC 3's \"capture\" remains met by the
object-database stand-in only". AC 3 of `syzygy-bpyt.6.5` reads "Ledger counts, breach findings, degradation state
and all rendered/machine bytes identical on fixtures and a capture." The same record's
`capture.whyNotARetainedButlersCapture` establishes that no capture was used. A real Git object database built by the
harness from the PR's own fixture text is a fixture, not a capture; "remains met ... only" asserts the criterion is met
and then qualifies the word out of meaning. The sentence is the one a later reader will quote. It should say the
capture half of AC 3 is NOT met, that a real-object-database fixture differential stands in, and that the live mode is
the route to meeting it. (Rule 8: the criterion is quoted above from the bead.)

Related, same section: `capture.used` says one scenario is "sized as the retained Butlers capture". I measured the
head output: `scale` reads 226 sources and 205 items; the retained capture
(`docs/evidence/smooth-example-live-run-2026-10-03.json`) reads 285 sources, 392 items and 416 facts. That is 79% of
the sources and 52% of the items. "Sized as" should be "about four-fifths of the source count, half the item count".

### E2 (low): scenario coverage leaves the limit and breach paths unexercised

All 11 capture scenarios, including `scale`, record `limitBreaches: []` (head output, every scenario). AC 3 names
"breach findings". The capture exercises refusal outcomes (secret, active content, invalid UTF-8, NUL, symlink,
denied basenames, missing blob; I confirmed each produces a distinct read record and the degradation states differ)
but no oversize blob or exhausted budget, so the one path where the reader's ceiling logic differs from the base's two
readers is not read through a real object database. The v1 differential has breach scenarios in memory; the capture
record should say the real-database half does not. State the limit in `capture`.

### E3 (low): rule 6 record is counts only

`rule6.results` is seven mutant names with the count 1 each; no old/new fragment, no commit, and the input
`cap-head-1.json` is not retained (`outputsRetained: false`). The parent review's guardrail (AGENTS.md: a rule-6
record must store each mutant's old/new fragment and the commit it ran at) applies. I re-ran the predicate set myself
and it holds: 19 mutations of the head output, all killed except the intended no-op control. Killed: shape digest,
read-record field, dropped cat-file, extra cat-file, reordered calls, second ls-tree kept, first ls-tree dropped
instead of the second, all ls-tree removed, revision, extra scenario, missing scenario, mode, threw-versus-observed,
head `revisions` absent, and live-mode revision. One mutant is a crash, not a clean refusal: removing the `shapes`
section raises `KeyError: 'shapes'` (exit 1, so killed, but with a traceback, not a finding). Store the fragments, or
cite this review's list.

### E4 (low): capture harness bytes differ from the bytes that ran

The record discloses it (`harness.capture.editedAfterRun`): as run sha256
86079f35e247271e37dc3f23e4808e7b41a0bc440259bb346f8dd9ef45c749f3, retained
31619b1b99ae4cef6875cacfd07d4c3ecd2002ff89832ae271e20755f9f65480, "one header comment sentence ... no code line
changed". The as-run bytes are retained nowhere, so "no code line changed" cannot be re-checked (rules 10, 11). I ran
the retained bytes at both commits and got the recorded output digests (below), which is the stronger evidence;
the record should rest on that rather than on the as-run digest.

### E5 (low): live mode is not bound to the registered repository, and the comparator does not read `admits`

- `BPYT65_LIVE_REPO` is any path. The daemon refuses every locator but the registered one
  (`apps/three-surface-poc/src/git-observation.ts`, `locator-mismatched`); the harness does not, so the real P1 gate
  (which is per repository id, not per path) would admit a read of a different repository handed to it. It matches the
  existing `project-shape-discovery.live.test.ts` pattern (env pointer, skipped when unset), so this is parity, not a
  regression, but the harness comment says the registered checkout is "the owner's to point it at" while enforcing
  nothing.
- The governance revision for the gate is `git rev-parse HEAD` of the checkout the harness sits in, so the base run and
  the head run are gated at different governance states. If one admits and the other does not, the shapes differ with
  no explanation. State `admits` in the comparator output.
- `compare_capture.py` does not read `admits` or `kind`. A refused gate gives two identical `observation-failed`
  records; the comparator still exits 1, but only because the head listed the tree zero times, with the wrong reason.

Safety of the live mode, as asked: it sits behind `evaluateBodyReadAuthority` over `loadBodyReadAuthorityInputs`, not
the test authority, and `observeProjectShape` returns `observation-failed` when `admits` is false before any read
(`project-shape-model.ts:521`). Unset `BPYT65_LIVE_REPO` skips the test (I observed "1 skipped"). Its output holds paths,
content digests, exclusion reasons and git argument lists, no body (checked on the fixture output). No daemon is
involved and nothing binds port 7478. I judge it safe to ship as an owner-run tool, subject to E5.

## What I verified

1. **Scope.** `git diff --name-status` of the head against its merge base lists seven paths, all under
   `docs/evidence/syzygy-bpyt-6-5/`; nothing outside docs/evidence. The base of the PR is current main
   (`6e4974aa`) as of the PR; origin/main has since moved.
2. **Pre-run subject digests (rule 11).** `subject_digests.py` run on clean checkouts of both commits reproduces
   `subjects-pre-run-2026-11-03-q44o.json` for `head`, `trackedFilesModified`, and the `source` and `tests` group
   digests (base 135 source and 136 test files; head 137 and 136). The `harness` group (3 files per side) was not
   present in a clean checkout and is checked against the retained files in the next item. The record's file sha256s
   for the two retained harness files, the config and both comparators match `sha256sum` of the files.
3. **Capture differential reproduced under another TMPDIR.** Retained harness, config copied in, `TMPDIR` =
   `/tmp/r607/tA`: base output sha256 a91d300f4b5841698ebc60fdba8f963937f36e9761fdb7e93ac5829f597ef2c0, head output
   9ab9afcd996ba7ab19b6d6fcb99320554ee25c429c9133547204cc179e405112. Both equal the record's
   `outputs.cap-base` and `outputs.cap-head`. `compare_capture.py` exit 0, no unexpected differences; all 11 scenarios
   give an identical shape record, `calls: second-ls-tree-dropped`, ls-tree 2 versus 1, cat-file counts equal.
4. **v1 differential reproduced under another TMPDIR.** `TMPDIR=/tmp/r607/tB`, default `BPYT65_FIXTURE_ROOT`: base
   22388765b3c40a8e85a9163ca7cc187ff529627ec2a3bbd3e0aa10205e244457, head
   e6f87c7532d534cbaa9d6527a34313e2ee4e19246db200deb324c798c8130eaa; both equal the record. `compare_differential.py`
   exit 0 with `unexpectedDifferences: []`; the 60 expected differences are second-listing faults (base
   `observation-failed`, head `observed`). The E2 repair of the parent review (digests not reproducible) is therefore
   real: two TMPDIRs, one digest per side, and neither is the author's. The header's `--config` form works at both
   commits (base has no tiers).
5. **Absence claim (rule 9).** "No retained capture holds Git objects": `git ls-files` shows no `.bundle`, `.pack`,
   `.idx` or `objects/` path. Denominator: all tracked files. The smooth-example record retains output only.
6. **Other tests of the claim "head lists the tree once, base twice".** Read from the call logs: every scenario, base
   `ls-tree -r -z -l <rev>` twice, head once, equal cat-file count and order apart from the removed listing.
7. **Not done.** I did not run the live mode (owner), the unit suite, or the parent record's rule-6 mutants
   (not in scope for this PR). I did not read the six unchanged files under `docs/evidence/syzygy-bpyt-6-5/` beyond
   the parent record.

## Disposition requested

Reword E1 in the record (and the bead note if it repeats "met"); E2 to E5 are notes the author may take or answer.
None blocks merging the evidence once E1 is reworded, since the reproduction is clean and the PR body already states
the truth. AC 3's capture half stays open until the owner runs the live mode.
