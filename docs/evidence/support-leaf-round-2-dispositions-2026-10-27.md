# Support leaf: review dispositions, rounds 1 and 2

[Observed] This record dispositions the two CC-REV-1 reviews of
`syzygy-bpyt.6.3` stack 1 (pull request #530). The change adds one leaf
package, `@syzygy/support`, holding one `sha256` and one `deepFreeze`, and
moves the production hash and freeze sites onto it: 62 sites before and 6
after, under the sweep's name rule. It covers finding DC-3 of the
greenfield-parity audit, acceptance criteria 1 and 3. The lane's evidence is
under `docs/evidence/syzygy-bpyt-6-3/`. Stacks 2 and 3 are pull requests #534
and #533, reviewed separately as deltas over this one.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) |
|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-SUPPORT-LEAF-1-RAW.md` | `REVISE` | `fe3855a1` | `r1-review.diff` sha256 `37a1799393b122c18bdd8ecf1a314c53e9a6bdda7e646f1dd88b7e48b980d2d2` |
| 2 | `docs/reviews/R-GP-IMPL-SUPPORT-LEAF-2-RAW.md` | `CONFIRM WITH EXCEPTIONS` | `a5ab2b28` | `r2-review.diff` sha256 `0bf9843efcc8755862ecd61f24d65fdef8e7a39016a174e1221332f5837157c9` |

Round 1's subject equals `git diff c104771f fe3855a1`. Round 2's subject
equals `git diff 546f1ff0 a5ab2b28`, the whole PR over main after #529: 96
files, 81 of them outside `docs/`. Round 2 was narrow. It covered the repair
`git diff fe3855a1 094cc542` (sha256
`d0dd53c38fd32286c81835438fccf8615d06fadb4eaefa75cf2011efceabba2f`), the
merge of main, and the merge evidence `git diff 767588d4 a5ab2b28` (sha256
`24b3a7b61657a2080a23499b5c3357db7b7b00206b4481e5bd1016f6f17257f6`).

At landing, main had moved to `e5080f4d` (#522 and #531). Round 2 checked
that move: its 204 paths meet none of the 96 subject paths, and on a local
merge the touched projects passed 150 tests with 1 skipped. After the
landing merge, and before the landing commit, `git diff e5080f4d HEAD`
hashed to the round-2 subject digest.

Round 2 found six notes and no blocking finding. Under the owner's
notes-only stopping rule
(`.syzygy/governance/decisions/POLARIS-GATE-SITTING-2026-09-26-DECISION.md`
section 1), the round clears the exact bytes it read, and those bytes are not
edited. This record sits beside them. It is an implementation record and binds
nothing.

Revise-severity findings open: 0

## Class

Classes 1, 3 and 4, with additive class 6 and no endpoint removed, by both
reviewers' rulings (round 1 section 2, round 2 section 2). This is what the
PR declared.
- **Class 1.** `body-read-authority.ts` and the owner-act gate modules
  change their helper imports, and the digests they compare are computed by
  the moved helper.
- **Class 3.** The observation digest, the manifest digest, the
  `responseIdentity` content key and the evaluation question digests are
  computed by the moved helper.
- **Class 4.** The secret-redaction, public-source classification,
  generation-source and consent package-reader digest bindings move, and so
  do the SEC-3 closure guard and the S10 dossier egress proof's closure.
- **Class 6, additive.** `@syzygy/support` is private. Its 12 existing entry
  points are unchanged and 1 is added; exported names go from 862 to 864,
  with none changed or removed.

GP-Q0's checks:
- **Differential.** It is present. The probe compares 24 models,
  `responseIdentity`, the freeze census, rendered pages, both gate
  evaluations and the helper digests: 68 rows with 0 differing, and equal
  across the merge under one TMPDIR. The live owner-act gate differential is
  483 rows with 0 differing, and its output digest after the merge equals the
  one before it. The hash and freeze call arguments are 111 of 111 and 17 of
  17 equal.
- **A rule-6 mutant per predicate.** 24 lane mutants; round 1 added 10, and
  round 2 ran purity and egress mutants of its own against the repair.
- **Owner notice.** Posted on `syzygy-bpyt.10` at landing.

**GP-Q0's stop clause** (`:95-96`) is not triggered: nothing a gate accepts
or refuses changes. The repair touches no production file. It makes the S10
proof and the new purity test refuse more candidate edits, which changes
verification, not a gate.

The registry-bound files `packages/polaris-dossier/src/git-object-reader.ts`
and `packages/three-surface-poc-core/src/project-shape-observer.ts` are
byte-equal at all nine commits round 2 checked. Of the subject's paths, 0 are
digest-cited under `.syzygy/`, `openspec/`, `scripts/` or `.github/`.

## Round 1

- **F1** (blocking: the S10 no-egress proof did not bundle
  `@syzygy/support` from source). With every `dist/` absent, the proof
  failed with 32 unresolved imports; with a stale `dist/`, it proved the old
  bytes. Repaired in `8bd514d7`: `packages/polaris-dossier/src/no-egress.test.ts:45`
  aliases the package to its source. Round 2 confirmed it. Eight support
  mutants with network or stdout effects, of six kinds, pass at `fe3855a1`
  and are killed at `a5ab2b28`, with every `dist/` present and with every
  `dist/` absent.
- **N1** (the sweep's name rule left two production `createHash` sites out
  of its population). Repaired in the record and the PR body: both
  population rules are stated, and both sites are named as left in place.
  Under the name rule the figures are 62 sites before and 6 after; under the
  reachability rule they are 64 and 8. Replacing the two sites is item 4 of
  `syzygy-bpyt.6.13`.
- **N2** (six predicates pinned by no committed test), **N4**
  (`site-equivalence.py` exits 0 on a difference) and **N5** (the install
  check does not look for `@syzygy/support`): not in the repair. Filed as
  `syzygy-bpyt.6.13`, items 1 to 3.
- **N3** (the support package's purity was unpinned): repaired in
  `8bd514d7` by `packages/support/src/support-purity.test.ts`, 13 tests. Its
  limits are round 2's N9.
- **N6** (the committed probe output depends on the TMPDIR it ran under):
  repaired. The record names the TMPDIR and the command. Round 2 confirmed
  that the dependence is on the path string, not run-to-run noise. It did
  not reproduce the committed bytes, because that TMPDIR is another session's
  live directory on this host (N13).
- **N7** (the PR's "differ only" claim for `polaris-narrative.ts` left out
  a third difference): repaired in the PR body. Round 2 generalized it (N12).

## Round 2

**How the verdict rule was read.** The round-2 brief's REVISE list included
"a support mutant with I/O the S10 proof or the purity test accepts". The
reviewer read it as a support mutant that performs I/O, that both layers
together accept, and that is a plausible bug in the sense of test-rigor
`:42`. Under that reading the one candidate is E9, and E9 does not count,
because it reads a file only through `globalThis['process']` and
`'node:f' + 's'`, written to dodge two tokens. The reviewer stated the
literal per-layer reading too: under it, E6, E7 and E8 (accepted by the
purity test, killed by S10) and E9 would make the round REVISE.

The coordinator wrote the brief, and the reviewer's reading is the intended
one. The clause targets round 1's failure, a plain `node:fs` read (R8) that
passed every committed test. The two layers were named as one defence, so a
mutant one layer kills is refused. The verdict is the reviewer's, copied from
line 2. The purity test's weakness against E6 to E9 is not dropped: it is
N9, filed below.

- **N8** (the merge made two statements stale). Corrected here:
  - The two raw-digest sites left on purpose are
    `packages/http-host/src/credentials.ts:379-380`. #529 moved them there
    from `packages/cap1-daemon/src/credentials.ts`, which holds 0
    `createHash` calls at `a5ab2b28`.
  - The population grew from 236 to 241 files when `@syzygy/http-host`
    arrived. The site count stayed at 6 because those two sites moved with
    it, not because the five new files hold none.
  - The record's `mergeOfMain.sweepAtTheMerge.reading` and the PR body's
    residuals and placement bullets name the old home. Both are frozen
    evidence of the reviewed bytes, so they are not edited; the PR body
    carries a landing note pointing here.
- **N9** (the purity test is an import allowlist plus a token denylist):
  11 of the reviewer's 16 purity mutants survive it, and E9 survives both
  layers. Filed as `syzygy-bpyt.6.14`, item 1: a recursive scan, an exports
  check, an identifier allowlist, one reader shared with
  `owner-act-drafter.test.ts`, and a retitled second test.
- **N10** (the S10 alias map can drift from a package's real entry with the
  proof green): this predates the PR and affects all ten aliases. Filed as
  `syzygy-bpyt.6.14`, item 2: derive or assert the aliases from each
  package's exports, and add an `onResolve` guard.
- **N11** (`merge-resolution-check.py` exits 0 when it reports a difference,
  and in-region list resolutions are checked only by eye): the same class as
  round 1's N4. Filed as item 5 of `syzygy-bpyt.6.13`, for the tool's next
  reuse. Round 2 checked this merge's one hand resolution mechanically:
  `package.json` is the exact union of both sides' lists, with each side's
  order kept.
- **N12** (N7's third difference is one case of a class). Stated here: any
  exception during the freeze walk leaves the old body and the package in
  different partial states. A non-empty typed array, a throwing getter and a
  Proxy whose `ownKeys` trap throws are instances. All are unreachable at the
  call sites, for round 1's reasons. The optional pinning case is item 6 of
  `syzygy-bpyt.6.13`.
- **N13** (re-checkability gaps):
  - The record names no Node version for the probe. The record's N7 probe
    names `v24.6.0`, and the host ran `v24.6.0` at landing [Observed]; that
    the committed probe ran under it too is [Inferred].
  - The probe header says `build:poc` and the record's command says `build`.
    Round 2's reproductions used `npm run build:poc` (its
    `buildpoc-546f.log` and `buildpoc-a5ab.log`), so that is the command
    known to work.
  - `support-purity-mutants.py:61` truncates `failedTests` to four names, so
    the record's T4 row says 5 failures and lists 4. The fifth is the
    `import type` reader case, which round 2 saw fail.
  - The lane's round-1 report, which the round-2 brief named, does not
    exist; round 2 worked from the PR body and the record.
  - The fixes for future probes (a unique TMPDIR per record, the Node
    version, no truncation) are item 7 of `syzygy-bpyt.6.13`.

## Retained review evidence

The reviewers' tools and results are kept under
`docs/evidence/support-leaf-review-2026-10-27/`, in `round-1/` (67 files)
and `round-2/` (81 files).
- Round 1's raw lists 71 kept files in `sha256sum` form. At landing,
  `sha256sum -c` matched 71 of 71, and the listed set equals the
  directory's file set.
- Round 2's raw section 9 lists 89 kept files in a table. At landing a
  script matched 89 of 89, with 0 failed and no kept file unlisted.

The retained files are copies of those. Not retained, though each raw quotes
their result lines: the typecheck, governance, quotation and `npm ci` logs,
4 files from round 1 and 8 from round 2.

## Acceptance criteria (round 2, section 8)

- **AC1**, one definition per helper with sweep, method and denominator, and
  the registry-bound files untouched: met, with notes. At `a5ab2b28` there
  is one `sha256` (`packages/support/src/sha256.ts`) and one `deepFreeze`
  under both population rules, over 241 and 245 files. N8's correction is
  above.
- **AC3**, `responseIdentity` digests, model outputs and rendered bytes
  identical: met, and also across the merge.

`Tests: +22 ~2 -0`, as the PR states it: the 9 package tests round 1
re-derived, and the 13 purity tests round 2 counted. The alias line in
`no-egress.test.ts` changes no assertion.
