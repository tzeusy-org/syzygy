# Argv table and subpath guard: review dispositions, round 1

[Observed] This record dispositions the CC-REV-1 review of `syzygy-bpyt.8.32`
(pull request #521), the follow-up to notes N1, N2, N4, N5 and N8 of the PR
#518 review. The change does five things:
- A new `packages/polaris-dossier/src/argv.test.ts` holds 65 literal
  `readArgv` rows under four caller policies.
- `subpath-imports.test.ts` finds `main.ts`'s import edges two ways and fails
  unless they agree. It allows the barrel only as a dynamic import inside the
  `dossier` and `polaris` branches.
- `ReviewPacketResult` is restored to two `ok: true` variants.
- `readArgv` throws a programming error for a spec it could never read.
- `state-directory.test.ts`'s mode-000 row is skipped under root.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) |
|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-ARGV-TABLE-1-RAW.md` | `CONFIRM WITH EXCEPTIONS` | `e3e6a78b` | `r1-review.diff` sha256 `ffb43eb9096074b99e7022fd304216f8565844f226ddc772a6aef20adc5784ec` |

The subject equals `git diff df6046a153fe130202abdf6bd3045a79ba143879
e3e6a78b2ae9db8a26e5139ce74213325f3e8d72`. Main had not moved at landing, so
the branch took no merge, and `git diff origin/main HEAD | sha256sum` printed
the same digest as the subject before the landing commit.

The reviewer found "There is no blocking finding (no F)." (section 4), with
eight notes. Under the owner's notes-only stopping rule
(`.syzygy/governance/decisions/POLARIS-GATE-SITTING-2026-09-26-DECISION.md`
section 1), the round clears the exact bytes it read, and those bytes are not
edited. This record sits beside them. It is an implementation record and binds
nothing.

Revise-severity findings open: 0

## Retained review evidence

The reviewer's tools and results are kept under
`docs/evidence/argv-table-review-2026-10-25/`, 42 files. Each file the raw
lists with a digest (section 8) matches the first 16 hex of its sha256:
- `tools/` (12 files): the mutant builders `build_my_mutants.py` and
  `build_phase2.py`, the runner `run_mutants.py`, `check_mutant_copies.py`,
  the literal sweep, the spec-copy lifter `spec_copies.mjs`, the guard probes,
  the type probe, `or_shapes.mjs`, `row_check.py` and the `fake-root.mjs` shim;
- `results/` (14 files): the reviewer's mutant specs and results (both phases,
  each mutant with its `old` and `new` fragment), the rebuilt lane mutants, the
  spec-copy, literal-sweep, guard and type-probe results, `or-shapes.json` and
  the three-file test log;
- `type-probe/` (16 files): the generated assignability probes and their
  results.

Not retained:
- the two `vitest list --json` outputs (about 1.9 MB each) behind the Tests
  delta. The raw gives the totals (5,163 to 5,237), and `npx vitest list
  --json` re-derives them at each commit;
- the base and head builds of `argv` and `review`, which a build of each
  commit re-derives;
- the `npm ci`, typecheck, project and checker logs. The raw quotes the result
  line of each (section 3).

## Class

Class 6 (public interface), with no endpoint removed, by the reviewer's ruling
(section 2, N8). The PR declared "none in the accepted or refused argv forms or
paths", with classes 1 and 6 possible. The reviewer's reasons:
- **Class 6, touched.** `readArgv` behind the public `./argv` subpath now
  throws for a spec it could never read, and the barrel's exported
  `ReviewPacketResult` narrows back to its pre-Outcome form.
- **Class 1, not touched.** `state-directory.ts` and `apps/syzygy/src/main.ts`
  are byte-identical to base. The one class-1-adjacent byte is the test row's
  root skip, which changes whether the row runs, not what the resolver accepts
  or refuses.
- Classes 2, 3, 4, 5 and 7 are not touched.

GP-Q0 asks its three checks of class 6 only when an endpoint is removed, so no
owner notice is needed. The stop clause is not triggered:
- the dossier golden is digest-equal to base, 0 of 1,696 rows differing;
- 13 of 13 real specs pass the new throw;
- the subpath guard is a test.

## N1: a repeat's precedence over a missing value, and an empty value, are pinned by no CI suite

[Observed by the reviewer] OR1 swaps the missing-value and repeat checks at
`argv.ts:62-63`. It survives `argv.test.ts`, the whole
`@syzygy/polaris-dossier` project and the dossier golden, since no golden row
has that shape. OR2 reads an empty value as missing. It survives CI, and only
the uncommitted golden kills it.

**Disposition:** filed as `syzygy-bpyt.8.34` (P2), with the raw's five literal
rows, a precondition of `syzygy-bpyt.8.5`.

## N2: copy and caller can drift apart unseen

[Observed by the reviewer] The four policies equal their callers at the head,
but nothing ties them together. The reviewer's D1 (polaris repeat to refuse),
D2 (daemon repeat to refuse) and D3 (dossier options dash value to take) each
leave the project green, and D2 also leaves the daemon-entry system test green.

**Correction:** the PR's residual 1 says "If a caller's own spec changes, the
daemon's system tests and the dossier CLI tests notice for those two callers".
D2 and D3 are counterexamples: only the uncommitted goldens notice.

**Disposition:** the interim syntax-tree drift check is in `syzygy-bpyt.8.34`.
Exporting each caller's spec and pinning it once is posted on
`syzygy-bpyt.8.5`, which moves `argv.ts`.

## N3: the edge finder's agreement is pinned one way only

[Observed by the reviewer] OE1 throws only when the walk finds a specifier the
preprocessor misses, and it survives. No row feeds a form only the
preprocessor reports, though a concatenated `import()` specifier is one.

**Disposition:** in `syzygy-bpyt.8.34`, with the raw's exact row.

## N4: three forms reach the barrel past both methods

[Observed by the reviewer] Each of these passes `subpath-imports.test.ts`:
- OE3, a computed `import()` specifier;
- OE4, a `createRequire` under an alias in `main.ts`;
- OE5, an intermediate local module that re-exports the barrel.

**Correction:** the PR's residual 3, "None is known", is not right. OE3, OE4
and OE5 are known forms the guard misses.

**Disposition:** in `syzygy-bpyt.8.34`. The guard follows edges transitively,
as `island-boundary.test.ts` does, or a committed module-load census replaces
it.

## N5: the spec-guard rows pin neither the guard's order nor a trailing `=`

[Observed by the reviewer] Every throw row reads `['run']`, which completes
without a fault, so OS1 survives. OS1 moves the guard after the token loop, so
the guard no longer runs "before reading anything". OS2 admits a valued name
ending in `=` and also survives.

**Disposition:** in `syzygy-bpyt.8.34`, with the raw's two rows.

## N6: the branch classifier trusts the condition's text

[Observed by the reviewer] The classifier names the nearest `if` by its
condition's source text. `else if` is classified correctly. A `switch`, a
ternary, an early `return` or a nested `else` fails closed, which gives a false
alarm and never a false pass. The surviving OB1 and OB2 are equivalent for
`main.ts` at the head. OB3, a shadowed `argv` block, is contrived.

**Disposition:** recorded here, with no change to these bytes. The transitive
guard in `syzygy-bpyt.8.34` subsumes it.

## N7: the root-skip evidence proves the mechanism, not the property

[Observed by the reviewer] The `getuid()` shim and the status harness show
that the row's status follows a faked uid. The reviewer's OK1 (`geteuid`) and
OK2 (an early `return`) are false kills.

**Correction:** K1 and K2 are harness checks of the skip's condition. They do
not prove how the row behaves under root, which stays [Inferred] until a root
CI job exists.

**Disposition:** the two remaining mode-000 rows,
`packages/cap1-system/src/state-dir.system.test.ts:364` and
`packages/polaris-dossier/src/launched.test.ts:66`, are filed as
`syzygy-bpyt.4.25` (P3). It waits for `syzygy-bpyt.8.33`, which changes
`launched.test.ts`.

**Stale as of 2026-10-25, at the #523 landing:** the two sentences above no
longer hold. `syzygy-bpyt.4.25` now covers only the
`state-dir.system.test.ts:364` row and no longer waits for
`syzygy-bpyt.8.33`; the `launched.test.ts:66` row's root skip moved to
`syzygy-bpyt.8.35`, which edits that file under one class-4 review (see
`docs/evidence/launch-form-target-ctime-round-1-dispositions-2026-10-25.md`).

## N8: the class

**Disposition:** recorded above as class 6, not class 1.

## Acceptance criteria (raw section 6)

- `argv.test.ts` with literal expected answers per caller policy, killing
  R1–R10: met. The reviewer re-ran R1, R2b and R3–R10, and R2 is correctly
  not applicable.
- GM1 and GM3 killed by `subpath-imports.test.ts`: met.
- N4, N5 and N8 of the PR #518 review answered: met.
- The dossier CLI goldens differ on 0 rows: met.
- The Tests delta and the class stated: met. The delta reproduces by name
  (+77 ~6 −3), and the class is ruled 6.
