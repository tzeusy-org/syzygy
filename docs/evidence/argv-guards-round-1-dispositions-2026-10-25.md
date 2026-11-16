# Argv rows and daemon-path guards: review dispositions, round 1

[Observed] This record dispositions the CC-REV-1 review of `syzygy-bpyt.8.34`
(pull request #524), the follow-up to notes N1 to N6 of the PR #521 review.
The change is test-only:
- `packages/polaris-dossier/src/argv.test.ts` gains literal rows for an
  empty value and a repeat whose second value is missing (N1), a spec-guard
  row for `--out=` and one for guard order (N5), and a block that lifts each
  caller's `readArgv` spec from its syntax tree and compares it with the
  test's copy (N2, interim half);
- `subpath-imports.test.ts` pins the edge finder's agreement the other way
  (N3), walks the daemon path from `apps/syzygy/src/main.ts` transitively
  (N4), and adds classifier rows (N6);
- `island-boundary.test.ts`'s `reach` moves unchanged into
  `packages/polaris-generation-core/src/workspace-reach.testkit.ts`, which
  both guards now share.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) |
|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-ARGV-GUARDS-1-RAW.md` | `CONFIRM WITH EXCEPTIONS` | `43ae35fe` | `r1-review.diff` sha256 `27d79306964e269b4130fb7bf7794fd17b1831e500f4e6ee9e4051c0009099b2` |

The subject equals `git diff 3ec6929951080613b3c5cb7205fe303c5449be58
43ae35febce90724228e2e6001ee0b6e4c98597b`. At landing the branch took one
merge of main `71334012` (#523). [Observed] No file that main changed between
`3ec69299` and `71334012` is in the subject (58 files against 14). After the
merge, `git diff origin/main HEAD | sha256sum` printed the same digest as the
subject.

The reviewer found "There is no blocking finding (no F). There are four
notes." (section 4). Under the owner's notes-only stopping rule
(`.syzygy/governance/decisions/POLARIS-GATE-SITTING-2026-09-26-DECISION.md`
section 1), the round clears the exact bytes it read, and those bytes are not
edited. This record sits beside them. It is an implementation record and binds
nothing.

Revise-severity findings open: 0

## Retained review evidence

The reviewer's tools and results are kept under
`docs/evidence/argv-guards-review-2026-10-25/`, 47 files. Each one matches the
sha256 the raw lists for it (section 8), checked by script at landing:
- `tools/` (20 files): the record checker, the mutant runner `mut.py` with the
  lane, island, filter, GM7/OE2, own and X9 mutant specs (each with its `old`
  and `new` fragment), the island walk differential `island_diff.py`, the
  `imports` and condition-order probes, the repeat runner, the title census
  and the kept-file table checker;
- `results/` (27 files): every mutant result at base and head with its log,
  the 246-entry island walk differential, the two probes, the dossier golden
  re-run, the record check and its self-test, the repeat runs and the title
  census.

Not retained: the governance, quotations and three project logs, whose result
lines the raw quotes (section 3), and the reviewer's re-derived subject diff,
which `git diff` re-derives from the two commits above.

## Class

Classes 1 and 4, through the island guard, and class 6 with no endpoint
removed, by the reviewer's ruling (section 2). The PR declared "none", with a
ceiling of class 6. The reviewer's reason: `island-boundary.test.ts` is the
rule-6 kill evidence for the 8.1 ruling's class-4 claim (the provider egress
code is unreachable from the CLI) and its class-1 claim (the CLI injects the
operator-agent renderer adapter), and this change moves that guard's walk into
a shared module, which changes the mechanism of that evidence though no
product byte moves; this agrees with the #516 and #519 reasoning. The argv
rows and the spec-copy check pin the `./argv` reader the daemon imports by
subpath, which is class 6; no `exports` map changes. Classes 2, 3, 5 and 7 are
not touched.

GP-Q0's three checks for classes 1 and 4:
- **Differential: degenerate for the product, with non-degenerate
  stand-ins.** No product byte differs, so any product-gate differential is
  identical by construction. The reviewer ran the base walk and the head walk
  over the same tree from every non-test source module as an entry: 246 of
  246 answers equal (reachable list, edges into the island, unresolved
  specifiers). Over the 25 retained island mutants of the 8.1 and 8.23-era
  reviews that still apply, 17 are killed and 8 survive at both base and head,
  and 0 differ.
- **A rule-6 mutant per predicate: met.** Each of the island guard's four
  tests, the daemon-path guard's four new tests and every new argv row is
  killed by at least one recorded mutant at the head (raw sections 2 and 3).
- **Owner notice:** posted on `syzygy-bpyt.10` at landing (N3).

The stop clause is not triggered: no product byte changes, so nothing any gate
accepts or refuses changes, the dossier golden differs on 0 of 1,696 rows, and
no test title is removed or renamed (+19 names).

## N1: three type-clean forms reach the barrel past the shared resolver

[Observed by the reviewer] `workspace-reach.testkit.ts:33` treats any
specifier that is neither relative nor `@syzygy/<name>` as outside the
workspace, and `:37-38` takes an `exports` entry's `import` (else `default`)
condition. R-X6 and R-X6b (a package.json `imports` alias to the dossier
barrel, from `main.ts` and from an intermediate module) and R-X9 (a `node`
condition ahead of `import` in the dossier's `./argv` export) pass all 27
`subpath-imports.test.ts` rows while Node loads the barrel. The island guard
shares the gap: R-X6i survives at base and at head, so the move neither caused
nor fixed it. Today 0 of 10 workspace manifests declare `imports` or put a
runtime condition ahead of `import`.

**Disposition:** filed as `syzygy-bpyt.8.36`, a precondition of
`syzygy-bpyt.8.5`, whose import tidying is the failure scenario. Until it
lands, the guards' residuals also include these three forms: a package.json
`imports` alias and a runtime condition ordered ahead of `import` are not
followed, so the title "reaches this package through argv.ts and
state-directory.ts alone" can be false while green.

## N2: the spec-copy lift sees only identifier calls

[Observed by the reviewer] `argv.test.ts:177` lifts a call only when its
callee is the identifier `readArgv`. R-Y6 (an extra call through a namespace
import in `cli.ts`) and R-Y7 (an extra call through an alias) both pass 74/74.
The PR stated this residual as "[Inferred, not run]"; it is now Observed. A
variable spec, a spread, a second identifier call, a new caller module and
every copied drift fail loudly.

**Disposition:** filed with N1 as `syzygy-bpyt.8.36`: count every reference
to the `readArgv` binding and fail on any that is not a lifted call, or record
N2 moot if `syzygy-bpyt.8.5`'s export-and-pin retires the lift first.

## N3: the class and the owner notice

**Disposition:** the class is recorded above as classes 1, 4 and 6, not
"none", and the owner notice is posted on `syzygy-bpyt.10` at landing.

## N4: `review.test.ts:545` fails falsely under a TMPDIR holding `p1`

[Observed by the reviewer] Outside this PR's subject: the row asserts that no
string leaf of the reviewer's verdict appears in the observed holder's JSON,
which carries the run path under `os.tmpdir()`; the block id `p1` matched
`TMPDIR=/tmp/r524-p1`, and the file passed under `/tmp/r524-qx`.

**Disposition:** filed as `syzygy-bpyt.4.26`.

## Acceptance criteria (raw section 6)

- AC1 met. The N1, N3 and N5 rows exist with literal expected values; OR1,
  OR2, OE1, OS1 and OS2 are recorded killed with fragments, commit `20cabca5`
  and subject digests, and the reviewer reproduced each surviving at base and
  killed at the head.
- AC2 met, with N2. D1 to D3 are recorded killed and reproduced, with the
  reviewer's R-Y1 to R-Y5; R-Y6 and R-Y7 survive.
- AC3 met, with N1. The walk is transitive from `main.ts`; OE3 to OE5 are
  killed at the head and survive at base; GM1 and GM3 stay killed; the
  reviewer's R-X1 to R-X4 are killed; R-X6, R-X6b and R-X9 pass.
- AC4 met, with the class reclassified (N3). No product byte changes, the
  golden differs on 0 rows, and `Tests: +19 ~0 -0` is confirmed.
