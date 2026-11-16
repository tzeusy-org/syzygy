# Guard pins: review dispositions, round 1

[Observed] This record dispositions the CC-REV-1 review of `syzygy-bpyt.8.37`
(pull request #531). The change is test-only. It carries notes N1 to N3 of the
PR #528 review into three files:
- `packages/polaris-generation-core/src/workspace-reach.testkit.ts`, the
  resolver that the island and daemon-path guards share;
- `packages/polaris-generation-core/src/workspace-reach.test.ts`;
- `packages/polaris-dossier/src/argv.test.ts`, the `readArgv` census.

After the change:
- six predicates that no row killed have killing rows;
- a workspace package imported under another name through a local dependency
  now fails both guards;
- the census covers `.mts`, `.cts` and `.tsx` modules as well as `.ts`.

The lane's evidence is under `docs/evidence/syzygy-bpyt-8-37/`.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) |
|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-GUARD-PINS-1-RAW.md` | `CONFIRM WITH EXCEPTIONS` | `138010d5` | `r1-review.diff` sha256 `cb95ae6d6283a641951273f820bc9c33caa04da56555ae92b5c4de8d6c8ef90a` |

The subject equals `git diff 8ff50172b127cba676ff32ce62c12c91b2b0d924
138010d5beda4a1d39945265388fda0b35d34194`: 24 files. Three of them are code,
and the other 21 are under the lane's evidence directory. The code-only diff
`git diff 8ff50172 c90cd732` hashes to
`615db956261b0a5b28d548486fc48282fa0a9ec51e0fe8c928f9f84d0e132fee`.

Main changed root and package manifests and `apps/syzygy/src/main.ts` while
the review ran, and those are inputs of the new resolver. So the reviewer also
merged the subject onto main `546f1ff0` locally. On that merge the four guard
files passed 157 of 157 three times, and the island diff was 251/251 walks and
2,627/2,627 answers.

The round found six notes and no blocking finding. Under the owner's
notes-only stopping rule
(`.syzygy/governance/decisions/POLARIS-GATE-SITTING-2026-09-26-DECISION.md`
section 1), the round clears the exact bytes it read, and those bytes are not
edited. This record sits beside them. It is an implementation record and binds
nothing.

Revise-severity findings open: 0

## Class

Classes 1, 4 and 6, with no endpoint removed, by the reviewer's ruling
(section 2). This is what the PR declared.
- **Classes 1 and 4.** `island-boundary.test.ts` imports the testkit's
  resolver. That guard is the rule-6 kill evidence for the 8.1 ruling's class-1
  and class-4 claims, so the change moves the mechanism of that evidence. No
  product byte moves.
- **Class 6.** The census and the daemon-path guard pin the `./argv` export of
  `@syzygy/polaris-dossier`.

GP-Q0's checks:
- **Differential.** It is degenerate for the product, since no product byte
  changes. The stand-in is the old resolver against the new over today's tree:
  246/246 walks and 2,612/2,612 answers are equal. Its selftest, and two
  variants the reviewer wrote, fail as they should.
- **A rule-6 mutant per predicate.** All 8 targets survive at `8ff50172` and
  are killed at `c90cd732`, each by its own row: RV-P3, RV-P4, RV-P6, RV-Q1,
  RV-Q2, RV-Q3, RV-T18 and RV-C6. RV-P8 is equivalent and survives at both.
  The lane's 36 own mutants are all killed. Of the reviewer's 20 head mutants
  of the new code, 10 survive, and they are N1, N3 and N4.
- **Owner notice.** Posted on `syzygy-bpyt.10` at landing. It names every
  refusal beyond the bead's list (N6).

**The two flagged forms, and GP-Q0's stop clause.** The PR asked for a ruling
on two refusals beyond the bead's literal `file:`, `link:`, `workspace:` and
`npm:` list:
- (a) path and tarball versions;
- (b) dependencies declared in the root manifest.

The reviewer ruled that neither returns to the owner under GP-Q0 `:95-96`,
using the #528 reasoning. Each is a refusal that fails closed, in a test guard.
Each changes no answer in the tree: 0 of 20 dependencies at `c90cd732`, and 0
of 24 on main, take any of these forms. And the PR names each one. The path
forms are also needed for fidelity: npm's own parser gives `../x`, `./x`, `.`,
`..`, `/x` and `~/x` the same type it gives `file:../x`. The coordinator
agrees. The owner notice lists the refusals, so the owner can override the
ruling.

One exception is N2: the PR named the remote-tarball refusal the wrong way
round.

## Notes

- **N1** (five sub-forms of the local-version pattern, and the root manifest's
  dependencies, have no killing row): R1 to R6 survive all 157 rows. The
  bead's own four forms are each pinned. The root row pins only the entry's
  `dir`, so it is weaker than its title. The reviewer's fix rows pass 164 of
  164 together, and each kills its survivor. Filed as `syzygy-bpyt.8.38`.
- **N2** (the tarball arm refuses a remote tarball URL, and the PR's residuals
  say it reads as outside): the PR body's residual sentence "A git dependency
  (`github:`, `git+file:`) or a remote tarball URL still reads as outside the
  workspace" is false in its second half.
  - The pattern's tarball arm matches `https://…/x.tgz`, which npm types as
    `remote`. The resolver now answers that it names no module, so a faithful
    tree with a URL tarball dependency on the daemon path or the CLI walk
    fails both guards.
  - An `npm:` alias of a registry package is refused too. That is the bead's
    own listed form, but no record named the refusal.
  - **Ruling: option (i).** The refusal is kept, because it fails closed and no
    tree carries the form. This record corrects the PR's statement, and the
    owner notice names both refusals. Narrowing the arm would itself need a
    GP-Q0 ruling.
  - The testkit comment at `:59-60` misdescribes `npm:`, `link:` and
    `workspace:`. The comment fix, and a row that pins the URL refusal, are
    filed in `syzygy-bpyt.8.38`.
- **N3** (an unnamed residual): npm reads directory specs without a leading
  `./`, `../`, `/` or `~/`, such as `"packages/polaris-dossier/"`, as a
  directory. The resolver still reads them as outside, before and after the
  change. They are outside the forms npm documents for local paths, and
  outside the bead's list. This record names the residual here, and
  `syzygy-bpyt.8.38` names it in the testkit. Widening the pattern to cover
  them would change what the guard refuses, so it needs a GP-Q0 ruling first.
- **N4** (two census sub-predicates without a row, and the tree's recursion
  unpinned): C1 (the extension test's `$`) and C4 (the test exclusion's dot)
  survive. S2, `treeFiles()` without `recursive: true`, survives at base and at
  head, and it is equivalent on today's tree. Filed in `syzygy-bpyt.8.38`, with
  the reviewer's checked rows.
- **N5** (outside the subject: dossier-project tests time out under load at
  both commits): 1, 4 or 3 tests failed in 3 of 5 whole-project runs, each a
  ~5 s timeout in `start-gates.test.ts`, `review.test.ts`,
  `run-evidence.test.ts` or `git-object-reader.test.ts`. The same four files
  time out at base. Two of the failing rows have no bead, so they are added to
  `syzygy-bpyt.4.24`'s scope by a comment there:
  - `review.test.ts` "retires a counted verdict when the draft is revised…";
  - `git-object-reader.test.ts` "a delta chain one past the depth cap
    refuses…".
- **N6** (the owner notice, and the retained-spec denominator):
  - The owner notice names five refusals beyond the bead's literal list: path
    versions, local tarball names, remote tarball URLs, `npm:` aliases of
    registry packages, and the root manifest. It says each fails closed, in a
    test guard, with 0 of 20 dependencies affected.
  - The PR's "all 123 specs the PR 524 and PR 528 reviewers retained" has this
    denominator, by the reviewer's derivation: 130 gathered rows, less 7
    merged duplicates, makes 123. Eight specs are excluded:
    - the #528 reviewer's `fix-specs.json` (6), which are fix-row checks, not
      mutants of the code;
    - the #524 reviewer's `filter-specs-base.json` (2), which 8.36's
      `reviewer-specs.json` already discloses.

## Retained review evidence

The reviewer's tools and results are kept under
`docs/evidence/guard-pins-review-2026-10-27/`, 56 files. The raw's section 8
lists 59 kept files with their sha256: 13 tools and 46 results. At landing a
script checked all 59 against the reviewer's directory: 59 matched, 0 failed,
and no kept file was unlisted. The retained 56 are copies of those files.
`pr-body-live.md` was renamed `pr-body-live.txt`.

Not retained, though the raw quotes each one's result line: the typecheck,
governance and quotation logs, 3 files.

## Acceptance criteria (raw section 6)

- AC1, the six predicates: met. All six were reproduced, and each `old`
  occurs exactly once at its commit. `summary.json` names the subject digest.
- AC2, RV-T18 and its `link:`/`workspace:` variants, and RV-C6: met.
- AC3, the island walk, Tests and class, the review, and GP-Q0's checks: met.
  The owner notice was due at landing and is posted (N6). Walks are 246/246,
  and 251/251 on the merge. `Tests: +24 ~0 -0`, re-derived by the reviewer.
