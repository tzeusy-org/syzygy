# Support-leaf follow-ups: review dispositions, rounds 1 and 2

[Observed] This record gives the dispositions of the two CC-REV-1 review
rounds of `syzygy-bpyt.6.13` (pull request #538). The change does items 1, 3,
4 and 6 of the bead. The bead carries notes from the PR #530 review
(`docs/reviews/R-GP-IMPL-SUPPORT-LEAF-1-RAW.md` and `-2-RAW.md`; dispositions
in `docs/evidence/support-leaf-round-2-dispositions-2026-10-27.md`):
- item 1: literal-digest and `isFrozen` rows for C1, C2, C3, C11, F1-headroom,
  F3-body-authority, R3 and R9;
- item 3: `scripts/check_generator_install.mjs` also checks
  `node_modules/@syzygy/support`;
- item 4, half done: the walkthrough-judgment fixture takes `sha256` from
  `@syzygy/support`. The `junitDigest` half was reverted in round 2's repair
  (see "Why there is a round 2");
- item 6: a `deep-freeze.test.ts` case for the partial-freeze state after a
  throw mid-walk.

The lane's evidence is under `docs/evidence/syzygy-bpyt-6-13/`.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) |
|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-SUPPORT-FOLLOWUPS-1-RAW.md` | `CONFIRM WITH EXCEPTIONS` | `663061c4` | `r1-review.diff` sha256 `ca08e373a8d94e01dea67d95a8f7822940622a3c180fc9990d96d0a763773916` |
| 2 | `docs/reviews/R-GP-IMPL-SUPPORT-FOLLOWUPS-2-RAW.md` | `CONFIRM WITH EXCEPTIONS` | `7d408fd9` | `r2-review.diff` sha256 `dfe5317ed5d34a7ef0e8fcb91f9c367187cefa32152a8ff47c81ef8848f3f674` |

Round 1's subject equals `git diff f7477f52 663061c4`, 32 files. Round 2 was
narrow. Its subject equals `git diff 4b9a4be0 7d408fd9`, 11 files, of which
one is code: `test-artifact-verification.ts`, restored to its `f7477f52`
blob. `4b9a4be0` merges main `eb8fb6cb` into `663061c4`, and round 2
confirmed that it is git's own merge, path for path (5,789 paths, 0
differing). The whole PR over main, `git diff eb8fb6cb 7d408fd9`, is 40 files
and hashes to
`4f447dfc7cd6d89f5c255e20d60aae6555d8b197ad86a73ce48aeb3d8ac0f19e`.

At landing the branch took two more merges of main: `41932c3b` (#533), then
`973965a8` (#540). [Observed] Main changed 134 paths from `eb8fb6cb` to
`41932c3b`, and 92 from `41932c3b` to `973965a8`. None of them is one of the
PR's 40. After each merge, `git diff origin/main HEAD | sha256sum` printed the
whole-PR digest above. Hosted `checks` and `node` passed at
`7d408fd9`, and the lane's clean-clone battery gave `commands=114
nonzero=0` there. The battery ran again on the landing commit (rule 7), and
hosted CI on that commit was checked before the merge.

Each round found notes only. Under the owner's notes-only stopping rule
(`.syzygy/governance/decisions/POLARIS-GATE-SITTING-2026-09-26-DECISION.md`
section 1), round 2 clears the exact bytes it read, and those bytes are not
edited. This record sits beside them. It is an implementation record and binds
nothing.

Revise-severity findings open: 0

## Why there is a round 2

Round 1 cleared `663061c4`, but the landing stopped: hosted `node` failed at
`663061c4` itself. The failing test was
`apps/three-surface-poc/src/capture-test-artifact-main.test.ts`, "names no
other way to start a process, in the tool or the core module it calls", with
"test-artifact-verification.ts: expected [ 'imports @syzygy/support' ] to
deeply equal []". `ALLOWED_IMPORTS[CORE_SOURCE]` in that test pins the core
module's imports to `node:crypto`, `node:fs` and `node:path`. Neither the lane
nor round 1 saw it, because the canonical battery does not run `npm test`.

The coordinator ruled as follows. Revert the `junitDigest` half of item 4,
and keep the fixture half. That no-spawn source check is a class-4 guard.
Widening its accept set to admit `@syzygy/support` would change what a gate
accepts, which GP-Q0's stop clause
(`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md:95-96`)
returns to the owner. So the local `sha256` in `test-artifact-verification.ts`
stays, as a justified residual.

Round 2 found every requirement of the ruling met (raw section 4):
- The revert is exact.
- The guard fails on the round-1 bytes (1 failed, 51 passed) and passes at
  `7d408fd9`.
- No other PR file sits under an import allowlist (0 of 13 under G1-G9).
- The full suite passes at `7d408fd9` (5,393 passed, 5 skipped, 0 failed).
- Round 1's `junitDigest` mutants and differential rows are marked not
  applicable, and none is deleted.

The PR's own merge of `eb8fb6cb` is git's own merge, so no landing commit of
the coordinator's carries over. The unmerged landing commit made for round 1
(`137e5b74`) was dropped from the branch. It is kept locally as
`refs/archive/landing/syzygy-bpyt.6.13-r1`, and its round-1 files are
retained here unchanged, except for their move to `r1/`.

## Class and the GP-Q0 ruling

Round 1 ruled classes 1, 3, 4 and 6 (raw section 2.2). After the revert,
round 2 ruled classes 1, 3 and 6: class 4 is no longer touched (raw section
2.2).

GP-Q0's checks:
- **Differential.** The fixture is byte-equal on 25 of 25 rows, with a noise
  control at 0. The 15 `junitDigest` rows are not applicable, since the file is
  back to its base bytes and equal by identity of the source. Round 2's re-run
  at `7d408fd9` is byte-identical to the base's.
- **A rule-6 mutant per predicate.** Round 1: 19 of 19 of the lane's mutants
  reproduce at both commits, with 3 negative controls passing, and the
  reviewer's own mutants are killed. Round 2: the fixture mutants W1-W3 are
  killed by tests at `7d408fd9` (5 of 86 each). W4, an equivalent local copy,
  is killed only by the sweep's reach rule, by design.
- **Owner notice.** Posted on `syzygy-bpyt.10` at landing. It carries round
  1's N1 and the revert.

**The install preflight's exit code.** Round 1 rejected the PR body's reason,
that the preflight is "not an owner-act, consent or authority gate". The stop
clause (`:95-96`) covers any gate. Round 1 applied the test that the http-host
and `syzygy-bpyt.6.15` rulings used instead: does any input that was usable
before #530 pass the preflight then and fail it now?
- Before #530, the generation-core check covered the generation core's whole
  workspace closure. #530 moved part of that closure into `@syzygy/support`.
- The two newly refused install states (the support link absent, or a dangling
  link) cannot build the base tree or the head tree. Every state that can
  build passes all three preflights (`f7477f52^1`, `f7477f52`, `663061c4`).
- So nothing a gate accepts or refuses changes beyond the move followed
  through, and the change is within the fix direction (bead item 3).

Round 1 names the strongest counter-reading for the owner. GP-Q0 Part 1
(`:52-53`) counts "a refusal string or an exit code" as behaviour, and Part 3's
`6.2` row (`:88`), "Refusal reasons change for inputs that are already
refused", has the shape of what changes here. The PR body still gives the
rejected reason (round 2, N3). This record and the PR's landing note correct
it.

## Round 1: six notes

- **N1** (the changed-output inventory leaves out the entry commands).
  Corrected here. For an install with `tsc` and the generation core but no
  `@syzygy/support` link:
  - `npm run poc:dossier` and `npm run poc:generator-demo` went from exit 2,
    with 44 `error TS` lines on stdout (41 TS2307, 3 TS7006) and empty stderr,
    to exit 1 with the one instruction line on stderr;
  - the preflight script itself goes from exit 0 to exit 1 for an absent or
    dangling link;
  - no install state that can build changes.

  The PR body's "failed later at the first import" should read "failed at
  `tsc -b` in `build:poc`", and its "Every changed output: One" should name
  the two entry commands too. Round 2 found both unchanged in the PR body (N3).
  The owner notice states all of this and names the `6.2` counter-reading.
- **N2** (the C1 and C2 literals re-hash the module's own output). Corrected
  here. The PR body's "not copied from a run" is false for C1 and C2. Their
  pre-images are the module's own dumps, re-hashed by an independent
  canonical-JSON and SHA-256 step. The other 14 pre-images are typed.
  - The dumps are `derivation-inputs/manifest-dump.json`, sha256
    `104ce3fdf993d8ca93181660d41f05c5c5f74b96897fcfe2edf0ae9165115be4`, and
    `derivation-inputs/observation-dump.json`, sha256
    `a9ee883767f47c7b15950ddbc4a84a7e66aff8817fb266ccb513e5cf09e1eb4c`.
  - The lane's record names no command for them. Round 1's own dump at
    `663061c4` is byte-identical (round 1 raw section 3.1).
  - Both pins still kill their mutants, since each mutant alters the hash step.
  - The test-comment wording, and recording the dumps' provenance on
    `derive-literals.py`'s next reuse: `syzygy-bpyt.25`, item 2.
- **N3** (the preflight checks existence only). Named as a residual. An empty
  `node_modules/@syzygy/support` directory passes the preflight at all three
  commits and then fails the build. The generation-core entry has had the same
  form since `133106eb`. Strengthening the check would change what the
  preflight refuses, so it is outside this bead and owner-visible. The row
  title at `generator-install-check.test.ts:48` overstates the fixture:
  `syzygy-bpyt.25`, item 3.
- **N4** (record labels, and "killed by exactly the new row"). Corrected here.
  The kill attribution at the head, per round 1 raw section 3.2:
  - C2, C3, C11, F1, F3, R3, R9 and D3 are each killed by exactly one row, the
    new one;
  - C1 is killed by its own row and the C2 row, both new;
  - D1 is killed by the new row and by the pre-existing `deepFreeze terminates
    on a cycle`, which also kills it at the base;
  - in the new files, I4 and I6 are killed by 4 rows, I5, H1 and H2 by 2, H3 by
    3, and I1-I3 by 1. Each is the row named for its entry.

  The item-4 rows' `commit` values name scratch mutant commits in no ref (9 of
  9, and the two new repair rows too). The re-runnable anchor is the record's
  `head` (`b214ef10`) with `old` and `new`, and `old` occurs once there in 9 of
  9. D1's `survivesAtBase` field holds a kill. Both renames: `syzygy-bpyt.25`,
  item 4. Round 2 found this partly addressed.
- **N5** (PR-body figures with no record behind them). Round 2 found it partly
  addressed. The full-suite figure now has a record entry
  (`item4.repair.fullSuiteAtRepair`) and a committed log bound by sha256, and
  "531" is gone from the PR body. The battery, `check_governance` and
  typecheck figures are the lane's, in the PR body only. Each round reproduced
  them: round 1 at the head and on the merge, round 2 the governance and
  typecheck figures at `7d408fd9`.
- **N6** (a comment in `deep-freeze.test.ts` misstates where the Proxy throw
  comes from). The pinned states are right. Comment wording:
  `syzygy-bpyt.25`, item 5.

Round 1's `junitDigest` work is moot after the revert: its section 3.4
equivalence, the cross-build probe, M6 and the section 3.5 closure edge
(round 2, "Round 1's notes after the repair"). Its other notes are unchanged by
the repair.

The bead's items 2, 5 and 7 apply "on the tool's next reuse". Round 1 found
leaving them consistent with the bead's wording, since none of those tools was
reused here. They are `syzygy-bpyt.25`, item 1.

The four historical evidence records that drift under
`check_evidence_currency.py --rev` (`current` 21 → 20, `drift` 209 → 210) are
left unedited. Round 1 confirmed the four and the figures, and ruled leaving
them right under rules 10 and 11. Round 2 found the same four at the merge, the
repair and the head.

## Round 2: three notes

- **N1** (four labels in the repaired record say something its own rows do
  not). Corrected here; no count, digest, outcome or commit is false at the
  commit it names.
  - The status field of W1 and W2 says they were "re-checked by the sweep detector
    alone in i4.mutants.repair". That block (`item4.mutants.repair`) holds only
    W3 and W4, and the lane did not re-run W1 or W2 at the repair. Round 2
    re-ran W1-W4 by the test detector at `7d408fd9` (`r2/` `w-mutants-at-repair.json`:
    5/86, 5/86, 5/86 and 0/86, with controls at 0/86).
  - J5's status field quotes the fragment `sha256(rawJUnit)`. J5's `old` is the
    import line `import { sha256 } from '@syzygy/support';`, which is also
    absent at `c7ed9ef2`. The verdict stands.
  - `item4.status` says "The fields below describe the state at b214ef10".
    Read "above": the `b214ef10` fields come before it, and the repair fields
    after.
  - The `evidenceCurrencyAtRepair.note` gives the wrong reason for the
    unchanged figures. `check_evidence_currency.py` counts only `*.json` files
    one segment under `docs/evidence/`, so no record in
    `docs/evidence/syzygy-bpyt-6-13/` is ever in its population B. Whether that
    exclusion is intended: `syzygy-bpyt.25`, item 7.
  - The four strings: `syzygy-bpyt.25`, item 6, if the record is ever touched.
- **N2** (`item4-repair-sweep.py`'s control is written, not computed). A kill
  rule of `>=` (T5), or the stale `b214ef10` threshold (T2), still exits 0
  with both rows killed. One computed no-op row would catch both. On the
  tool's next reuse: `syzygy-bpyt.25`, item 6.
- **N3** (the PR body still gives the GP-Q0 reason round 1 rejected, and
  round 1's N1 text is unchanged). Corrected here, in the section above, and
  in the PR's landing note and the owner notice. The PR body is not in either
  frozen subject.

## Retained review evidence

Both reviewers' tools and results are kept under
`docs/evidence/support-followups-review-2026-10-27/`, 87 files:
- `r1/` (42 files): round 1's tools and results. Round 1's raw section 8 lists
  47 kept files with their sha256. At round 1's landing attempt, a script
  checked all 47 against the reviewer's directory: 47 matched, and no kept
  file was unlisted. Not retained, though the raw quotes each one's result
  line: the governance, quotation, two typecheck and one `npm ci` logs, 5
  files.
- `r2/` (45 files): round 2's tools and results. Its raw section 8 lists 54
  kept files. At landing a script checked all 54 against the reviewer's
  directory: 54 matched, 0 failed, and no kept file was unlisted. The
  reviewer's two copies of the PR body are kept as `pr-body.txt` and
  `pr-body-2.txt`, with their bytes unchanged. Not retained, though the raw
  quotes each one's result line: 9 files, namely two governance logs, two
  quotation logs, three typecheck logs and two `npm ci` logs. A governance
  log quotes the retired phrases it reports, so a tracked copy would fail
  CG-2a.

## Acceptance criteria

The bead has no `acceptance_criteria` field, so both reviewers took the items
as the criteria.
- Item 1: met, with round 1's notes N2 and N4.
- Item 3: met, with the ruling above and round 1's notes N1 and N3.
- Item 4: half met. The fixture half reproduces byte for byte, and its mutants
  are killed. The `junitDigest` half stays local, a justified residual under a
  class-4 import guard, by the coordinator's ruling.
- Item 6: met, with round 1's note N6.
- Items 2, 5 and 7: consistent with the bead's wording, and carried to
  `syzygy-bpyt.25`.
- GP-Q0's review rule: the differential and the mutants are met, and the owner
  notice is posted at landing.
- `Tests: +19 ~0 -0`, with no existing test edited or removed. The repair adds
  and removes none.
