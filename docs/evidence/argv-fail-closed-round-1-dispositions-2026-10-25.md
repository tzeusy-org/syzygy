# Daemon-path and island guards fail closed: review dispositions, round 1

[Observed] This record dispositions the CC-REV-1 review of `syzygy-bpyt.8.36`
(pull request #528). The change is test-only. It answers notes N1 and N2 of
the PR #524 review (`docs/reviews/R-GP-IMPL-ARGV-GUARDS-1-RAW.md`):
- **The shared resolver**, `packages/polaris-generation-core/src/workspace-reach.testkit.ts`,
  behind both the daemon-path guard and the island guard. It now returns
  "unresolved" for:
  - a `#` specifier it cannot follow through the importing package's
    `imports`;
  - an absolute path;
  - a `file:` URL;
  - an `@syzygy/*` exports entry whose runtime conditions do not all name
    one target.
  A new `workspace-reach.test.ts` pins each form.
- **The `readArgv` census** in `packages/polaris-dossier/src/argv.test.ts`
  now fails on any reference to the `readArgv` binding that is not the callee
  of a lifted call.

The lane's evidence is under `docs/evidence/syzygy-bpyt-8-36/`.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) |
|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-ARGV-FAIL-CLOSED-1-RAW.md` | `CONFIRM WITH EXCEPTIONS` | `aa331269` | `r1-review.diff` sha256 `6f5b19924040907b6d6efb2415aab535d0e252d1c9565586e8f260ad1957e626` |

The subject equals `git diff a088f1caf061c1a2062527ce8521c9b64c3c7fd1
aa3312691d815d09239958c2dec4116cfb1d9cbe`: 20 files, 3 of them test files
and 17 evidence files. At landing the branch took one merge of main, which
then carried #525, #526, #520 and #527. The merge changed no subject path,
and `git diff origin/main HEAD | sha256sum` printed the same digest as the
subject.

The round found five notes and no blocking finding. Under the owner's
notes-only stopping rule
(`.syzygy/governance/decisions/POLARIS-GATE-SITTING-2026-09-26-DECISION.md`
section 1), the round clears the exact bytes it read, and those bytes are not
edited. This record sits beside them. It is an implementation record and binds
nothing.

Revise-severity findings open: 0

## Class

Classes 1, 4 and 6, with no endpoint removed, by the reviewer's ruling
(section 2). This agrees with the PR's declaration and the #524 ruling. The
resolver is the island guard's mechanism. The island guard is the rule-6
kill evidence for the 8.1 ruling's class-4 claim (provider egress code is
unreachable from the CLI) and its class-1 claim (the CLI injects the
operator-agent renderer adapter). Class 6 applies because the census and the
daemon-path guard pin the `./argv` export the daemon imports. No
`package.json` is in the diff.

GP-Q0's checks:
- **Differential.** Degenerate for the product, since no product byte
  changes. The stand-in is the old resolver against the new over one tree:
  - 246 of 246 island walks equal, with answers sha256
    `e297b289a9f722bdfe5840064f27e1454df131795eecb5b6c1546f30a1cae777`, the
    same digest as the #524 review's retained
    `docs/evidence/argv-guards-review-2026-10-25/results/island-diff-all-entries.json`;
  - 2,608 of 2,608 resolver answers equal over 495 source modules.
  The reviewer reproduced both, and also ran the #524 reviewer's original
  tool.
- **A rule-6 mutant per predicate.** Met for the forms the bead names:
  - R-X6, R-X6b, R-X9, R-X6i, R-Y6 and R-Y7 each survive at base and are
    killed at the code head `1447b6bb`;
  - the reviewer's own 20 tree forms of the N1 class and 6 of the N2 class
    are killed at head;
  - over the #524 reviewer's 79 retained specs, 0 are weaker, 9 stronger
    (among them 8.1's `island:R4` and 8.23's `consen:R4`, now killed) and 70
    unchanged.
  Not met for six of the new predicates, whose mutants pass every row (N1).
  Their rows are filed as `syzygy-bpyt.8.37`, a precondition of
  `syzygy-bpyt.8.5`.
- **Owner notice.** Posted on `syzygy-bpyt.10` at landing (N4).

**What a gate accepts or refuses.** No product gate changes, because no
product byte changes. On today's tree the guards give the same answers old
against new. Looking ahead, the guards refuse slightly more than the bead's
literal list:
- every runtime condition except `types`, not only `node`, `import`,
  `require` and `default`. This covers `module-sync`, which Node 24.6
  resolves ahead of `import`, so comparing it is needed for fidelity;
- `#` patterns, fallback arrays, nested conditions, and `./` targets outside
  `./dist/`.
Each is a fail-closed refusal in a test guard, changes no answer on today's
tree, and is named in the PR's residuals. The reviewer ruled these within the
bead's fix direction and not a gate change under GP-Q0's stop clause. The
coordinator agrees, and the owner notice names them.

## Notes

- **N1** (seven new predicates have no killing row, six of which need one):
  - RV-P6, the `target.startsWith('../')` arm;
  - RV-P3 and RV-P4, `moduleIn`'s two "unresolved" sentinels;
  - RV-Q1, the callee conjunct;
  - RV-Q2, the declaration's module conjunct;
  - RV-Q3, the `unlifted` push.
  Each passes the four guard files. The reviewer checked a row for each in
  `fix-head.json`: the rows pass at head together (107 passed), and each
  kills its survivor alone. They are filed as `syzygy-bpyt.8.37`, which
  `syzygy-bpyt.8.5` now depends on, because 8.5's import tidying is the
  failure scenario. RV-P8 (`Array.isArray` dropped) is equivalent for the
  guard's property and needs no row.
- **N2** (an unnamed residual: a workspace package imported under another
  name reads as outside the workspace): RV-T18, a `file:` dependency named
  `dossier` and imported from `main.ts`, passes at base and head, and Node
  resolves it to the dossier barrel. Today 0 of 11 manifests carry a `file:`,
  `link:`, `npm:` or `workspace:` dependency. Filed in `syzygy-bpyt.8.37`. It
  is named in the owner notice and in the residuals carried to 8.5.
- **N3** (the census and the lift skip `.mts`, `.cts` and `.tsx` modules,
  which the build compiles): this was pre-existing, since the lift always had
  the same population. The walks fail closed on the import edge to such a
  module. The census does not. Filed in `syzygy-bpyt.8.37`.
- **N4** (the owner notice was not yet posted): posted at landing, with the
  contents the reviewer listed.
- **N5** (`start-gates.test.ts:482` failed once in 8 whole-project runs under
  load): outside the subject. Filed as `syzygy-bpyt.4.33`.

This change also resolves notes N1 and N2 of the PR #524 review. That
review's dispositions record,
`docs/evidence/argv-guards-round-1-dispositions-2026-10-25.md`, filed them as
`syzygy-bpyt.8.36`.

## Retained review evidence

The reviewer's tools and results are kept under
`docs/evidence/argv-fail-closed-review-2026-10-25/`, 55 files: 23 tools and 32
results. The raw's section 8 lists 58 files, 23 tools and 35 results. At
landing a script checked each retained file against the sha256 the raw lists
for it: 55 matched and 0 failed.

Not retained: the governance, quotation and typecheck logs. The raw quotes
each one's result line.

The retained raw is the reviewer's final text. The coordinator first copied an
interim version, and the reviewer then finished the raw without changing the
verdict or the notes. The final text adds two things:
- section 1 item 5, a second main-moved check at `ef467d4a`, with 0 of 864
  changed paths in the subject and a clean merge;
- section 8, a disclosure that the brief contradicted itself. Its constraint
  line forbade reading anything under the home `.claude` directory, while its
  reference 4 pointed at the test-rigor skill there. The reviewer re-anchored
  every test-rigor quote to the tracked copy,
  `.claude/skills/th-engineering/subskills/test-rigor/SKILL.md` at
  `aa331269`. The coordinator's later briefs cite the tracked copies.

## Acceptance criteria (raw section 6)

- AC1: met. R-X6, R-X6b, R-X9 and R-X6i survive at base and are killed at
  head, each recorded with its fragments, its commit and the subject digest.
  The island walk's answers are unchanged.
- AC2: met. R-Y6 and R-Y7 are killed at head. N2 of #524 is fixed, not moot,
  because 8.5 has not landed.
- AC3: met with the owner notice posted at landing. No product byte changes,
  titles go from 105 to 133 with 0 removed, and `Tests: +28 ~0 -0` and the
  classes are stated.
