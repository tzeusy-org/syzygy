# Host pins: review dispositions, round 1

[Observed] This record dispositions the CC-REV-1 review of `syzygy-bpyt.7.14`
(pull request #535). The change is test-only. It adds rows for notes N4, N6
and N7 of the PR #529 review (`docs/reviews/R-GP-IMPL-HTTP-HOST-1-RAW.md`), so
that each of that review's seven surviving mutants (R3, R8, R13, R14, R17, R18
and R19) is killed by a row. The rows are in five test files:
- `packages/cap1-daemon/src/package.test.ts`: the shims' value bindings
  (`toBe`) and their re-exported types (`expectTypeOf`, checked by the
  compiler);
- `packages/http-host/src/credentials.test.ts`: Bearer whitespace, and the
  sibling traversal and symlink-to-sibling refusals;
- `packages/cap1-daemon/src/server.test.ts`: the breach diagnostic for each
  listed Unknown population, and the withholding of an unlisted one;
- `apps/three-surface-poc/src/browser-origin.test.ts` (new): longer and
  shorter origins refused;
- `apps/three-surface-poc/src/git-observation.test.ts`: the http-host
  manifest as a protected observer input.

The lane's evidence is under `docs/evidence/syzygy-bpyt-7-14/`.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) |
|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-HOST-PINS-1-RAW.md` | `CONFIRM WITH EXCEPTIONS` | `9ebfa92d` | `r1-review.diff` sha256 `80823c20dfcf83c4ac000b6fd598350a41337581f104c224014e78a63aebb6e6` |

The subject equals `git diff 546f1ff066e2ffef749c757cdb4621336039113b
9ebfa92d301de633b7c40a3f2276219330016d33`: 31 files. Five are the test files
above, and the other 26 are under the lane's evidence directory. The
code-only diff `git diff 546f1ff0 01df68ea` hashes to
`cf8756c6b3cebc47b11509ae7dc1f4d039c702c54a3df4510e2338a9936d6aa1`.

Main moved to `f7477f52` (#522, #531 and #530) while the review ran. None of
its 451 changed paths is a subject path. The reviewer trial-merged onto it:
the five files passed 68 of 68 and typecheck exited 0, and the surface version
was the same as at the reviewed commit. After the landing merge, and before
the landing commit, `git diff f7477f52 HEAD` hashed to the subject digest.

The round found ten notes and no blocking finding. Under the owner's
notes-only stopping rule
(`.syzygy/governance/decisions/POLARIS-GATE-SITTING-2026-09-26-DECISION.md`
section 1), the round clears the exact bytes it read, and those bytes are not
edited. This record sits beside them. It is an implementation record and binds
nothing.

Revise-severity findings open: 0

## Class

Classes 1, 3 and 4, by the reviewer's ruling (section 2). The PR declared 1
and 4 and offered 3 and 6.
- **Class 1.** `authorizeStateWrite` is the daemon's one write boundary, and
  the rows change the assurance on it.
- **Class 3.** `pocObserverInputsAreClean` is the POC's startup refusal for a
  dirty observer checkout, and the extended row pins which paths count as
  observer inputs. The reviewer added this class.
- **Class 4.** Bearer admission, the browser-origin check and the
  content-blind breach log.
- **Class 6: not touched.** `@syzygy/cap1-daemon` is private, and the change
  adds or removes no export. It pins the barrel's surface; it does not change
  it.

GP-Q0's checks:
- **Differential.** The product files are byte-identical at base and head, so
  an old-versus-new differential would run the same code twice. The reviewer
  accepted identity by construction as discharging it for a test-only
  subject. The one output that moves is the POC surface version
  (`polaris@8d82663ece26` to `polaris@c1f544101426`). It comes from the test
  files themselves, the PR disclosed it, and no bound record carries it.
- **A rule-6 mutant per predicate.** All seven targets survive at base and
  are killed at head, each by a named row. R14 is killed by the compiler
  (`npm run typecheck`), not by Vitest. The lane's own mutants, re-run by the
  reviewer, agree.
- **Owner notice.** Posted on `syzygy-bpyt.10` at landing. It names N9.

**The three flagged additions** (the symlink-to-sibling row, the unlisted
reason's withholding, and the shorter-origin rows) are within the bead's fix
direction and are not gate changes, by the reviewer's ruling. Each pins
behaviour the base code already has, and each is killed by its own mutant
(O7, O10 and O11, O12), which survives at base. The coordinator agrees.

## Notes

- **N1** (the record's "10 stronger" does not reproduce for R4 and R6).
  Corrected here: 8 are stronger (R1, R3, R7, R8, R13, R17, R18 and R19), and
  R4 and R6 are unchanged. Their extra failures at head were on rows this PR
  does not touch, and they did not recur in the reviewer's re-run. That they
  were load timeouts is [Inferred]. The frozen record is not edited.
- **N2** (the PR says the battery runs the type pin). Corrected here: 0 of
  the canonical battery's 110 commands invoke `npm`, `npx`, `tsc` or
  `vitest`. The type pin is enforced by CI's build and typecheck steps
  (`.github/workflows/node-ci.yml`) and by any local `npm run typecheck`.
- **N3** (a case-folding `isWithin`, V4, survives on the class-1 write
  boundary), **N4** (a leading-whitespace Bearer form, V2, survives), **N5**
  (a suffix origin match, V6, and two case variants survive under a describe
  that says "compared whole") and **N7** (a case-folded breach allow-list,
  V10, survives): each is a pre-existing test gap, and each fix row pins
  behaviour the code already has. Filed as `syzygy-bpyt.7.16`.
- **N6** (the observer-input gate rows pin two paths per package, so a
  prefix narrowed to `src/` plus the manifest passes: V12, V14 and V15
  survive). Filed with N9 as `syzygy-bpyt.6.15`, item 2, because both change
  the same gate's test.
- **N8** (two more equivalent survivors go unnamed). Named here as residuals
  beside the PR's O17:
  - TT1, a shim-local type structurally equal to the host's, which is
    equivalent until the two types diverge, and then the pin fails;
  - V1, a non-constant-time token comparison, which no behaviour test can
    see.
- **N9** (outside this subject, on main since #530: the observer-input gate
  does not protect `packages/support/`). The POC imports `@syzygy/support`
  and `build:poc` builds it, but `pocObserverInputsAreClean` has no
  `packages/support/` prefix. So a dirty `packages/support/src/sha256.ts`
  reads as clean (`docs/evidence/host-pins-review-2026-10-27/merge-gate-probe.txt`).
  Before #530 those bytes sat under a protected prefix. The #530 reviews did
  not consider it: the reviewer's sweep of both raws for `observer`,
  `inputPrefixes` and `git-observation` found no line that does.
  - **Ruling (coordinator).** Adding the prefix restores the gate's pre-#530
    refusal set. It is the reading the PR #529 reviewer and the coordinator
    gave the analogous host move ("the move followed through"), recorded in
    `docs/evidence/http-host-round-1-dispositions-2026-10-27.md` lines 62-70.
    So it sits within GP-Q0's behaviour-preserving mandate, and GP-Q0's stop
    clause (`:95-96`) does not apply. The owner notice names it, so the owner
    can override.
  - Filed as `syzygy-bpyt.6.15` (P1), with an all-prefix table row and a
    drift guard that derives the POC's workspace closure, so a new package
    cannot repeat the gap.
- **N10** (the owner notice, and the class set). Posted at landing with
  classes 1, 3 and 4, and naming N9.

N5 of the PR #529 review (the `differential.py` selftest) applies only when
that tool is next reused. It is carried in `syzygy-bpyt.7.15`.

## Retained review evidence

The reviewer's tools and results are kept under
`docs/evidence/host-pins-review-2026-10-27/`, 44 files. The raw's section 8
lists 48 kept files with their sha256. At landing a script checked all 48
against the reviewer's directory: 48 matched, 0 failed, and no kept file was
unlisted. The retained 44 are copies of those. Not retained, though the raw
quotes each one's result line: the governance, quotation and two typecheck
logs, 4 files.

## Acceptance criteria (raw section 6)

- Each of R3, R8, R13, R14, R17, R18 and R19 is killed by a row, with its
  old and new fragments and its commit recorded: met for all seven. R14 is
  met by the compiler.
- The bead's literal rows: present, as written.
- Item 4 (#529's N5): not done, as the bead prescribes for a later reuse.

`Tests: +9 ~1 -0`, re-derived by the reviewer: titles 5,311 to 5,320, with 9
added in the five subject files, 0 removed, and the extended gate row's title
unchanged.
