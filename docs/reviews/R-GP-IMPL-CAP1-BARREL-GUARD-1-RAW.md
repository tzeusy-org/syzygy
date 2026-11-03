# R-GP-IMPL-CAP1-BARREL-GUARD-1 — CC-REV-1 implementation review of syzygy-bpyt.7.8, round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 5816ada9a4448742d41888f403e47adacc30e45e
Subject: `git diff bcb259aa 5816ada9` sha256 cd8def6de4c2ae0511d8eba65ea6e09ac1e00dedb566af50a7e134a33dfc9433

Reviewer: independent fresh-context pull-request reviewer (Claude Sonnet 5.5), 2026-11-03. I read no body of
Butlers or of any other observed repository; every fixture below is the repository's own source or my own
mutation of it. I did not edit PR #592; every mutation was applied in a scratch worktree and reverted with
`git checkout -- packages` (`git status --short` empty after each).

## 1. Subject identity

- [Observed] `gh pr view 592` gave `headRefOid` 5816ada9a4448742d41888f403e47adacc30e45e, state OPEN, base `main`,
  three files: `packages/cap1-core/src/barrel-guard.test.ts` (+72), `vitest.config.ts` (+7),
  `docs/evidence/syzygy-bpyt-7-8/mutants.json` (+91).
- [Observed] `git fetch origin pull/592/head` returned the same SHA; `git merge-base` with `origin/main` is
  `bcb259aa2c500d778ed8d61050f123151d488baa`, the current `origin/main` (no rebase needed).
  `git diff bcb259aa 5816ada9 | sha256sum` is the digest in the head line above.
- [Observed] Two commits: `f5bbf40a` (the test and the config) and `5816ada9` (the evidence file only;
  `git diff --stat f5bbf40a 5816ada9` is `mutants.json | 91 +`). The test file is therefore the bytes the record
  says it ran against. Test sha256 `74b8283c852048c54e9c3e62fe714cda57e6bb9c2f2341b05b2f817a4ac0582d`, record sha256
  `39b05fb13e039b441f46107ea71eab226460b959233dad17c6118836fe80f021`.
- [Observed] `npm ci` in a fresh worktree exited 0; no `dist/` existed, so every run below resolved `@syzygy/*`
  by the `source` condition.

## 2. Acceptance criteria of syzygy-bpyt.7.8

1. "The barrel test fails with E05 applied (rule-6 run recorded with old/new and commit)." **Met.**
   - [Observed] I re-ran E05 by the recorded fragment (`export * from './distinction.js';\n` followed by
     `export * from './write-boundary.js';\n` in `packages/cap1-core/src/index.ts`, asserted to occur once):
     `npx vitest run packages/cap1-core/src/barrel-guard.test.ts` exit 1, "Tests 1 failed | 2 passed (3)", the failure
     is `shares no exported name with the package barrel`. Same row as `mutants.json`.
   - [Observed] `mutants.json` stores `old`/`new` per edit, the commit (`f5bbf40a`), the command, the exit and the
     failing test names for five rows (U0, E05, N4, N4b, N4c). The commit is reachable from the PR head.
2. "Passes at head." **Met.** [Observed] `npx vitest run --project @syzygy/cap1-core`: 1 file, 3 tests passed;
   `npm run typecheck` exit 0.
3. "(N4) no non-test `.ts` under `packages/*/src` or `apps/*/src` imports `@syzygy/cap1-core/testing`, excluding
   `packages/cap1-conformance/src` and `packages/cap1-system/src`; its own rule-6 mutant adds that import to
   `packages/cap1-daemon/src/routes-human.ts` and must fail." **Met.**
   - [Observed] I re-ran the recorded N4 mutant (the line `import { fullDisclosure } from '@syzygy/cap1-core/testing';`
     prepended to `routes-human.ts`): exit 1, "Tests 1 failed | 2 passed (3)", the failing test is
     `is imported by no non-test module outside the conformance and system suites`. The dynamic-import mutant N4b
     (`void import('@syzygy/cap1-core/testing');`) I did not re-run; its mechanism is the same regex.
   - [Observed] Control N4c, re-run: a file `packages/cap1-system/src/zz-control.ts` importing the entry, exit 0,
     "Tests 3 passed (3)" (removed afterwards).

## 3. The vitest project does not double-run or drop tests

- [Observed] `npx vitest list --filesOnly` at the head: 261 lines. The same command with `origin/main`'s
  `vitest.config.ts` (copied in as a second config file, deleted afterwards): 260 lines. `diff` of the two sorted
  lists: exactly one added line, `[@syzygy/cap1-core] packages/cap1-core/src/barrel-guard.test.ts`; no line removed,
  none duplicated (`sort | uniq -d` empty).
- [Observed] `@syzygy/cap1-core` had no project and no test before this PR (the package held no test file), so the
  new `include` of `packages/cap1-core/src/**/*.test.ts` overlaps no other project's glob. It follows the sibling
  projects' form (`extends: true`, one name, one include).
- Denominator for the population claim: the 261 listed files, not a count of git-tracked paths.

## 4. The literal name list matches the entry today

- [Observed] The test itself pins `Object.keys(testing).sort()` to the nine-name literal, and it passes.
- [Observed] Second method: a regex over `^export (async )?(const|function|class) NAME` in `parity-oracle.ts` and
  `write-boundary.ts` (the two modules `testing.ts` re-exports) yields the same nine names:
  `CAPABILITY_1_EXTERNAL_EFFECTS`, `WIDENING_FIELD_NAMES`, `authorizeWrite`, `canonicalTupleMultiset`,
  `compareRenderings`, `detectWideningFields`, `disclosureOf`, `fullDisclosure`, `reportEffectBoundary`. The
  remaining exports of those modules are `interface`/`type` declarations, erased at runtime.
- The expected values are literals, not imported from the module under test, so the conformance-literal rule is met.

## 5. Independent importer sweep (rule 9)

- [Observed] Python over the 538 git-tracked files whose path contains `/src/` under `packages/` and `apps/`
  (every extension, multi-line aware, not line-wise), matching `cap1-core/(src/)?testing` and relative specifiers
  ending in `testing`, `write-boundary` or `parity-oracle`. Hits: five conformance tests, two daemon route tests,
  `no-egress.test.ts` (a map key), `barrel-guard.test.ts`, and comments or re-exports inside `cap1-core` itself
  (`testing.ts`, `parity-oracle.ts`, `write-boundary.ts`). **No non-test module outside the two excluded trees.** The
  guard's zero is therefore a true zero today, by a second method and over all extensions, not only `.ts`.
- [Observed] The test's own denominator checks work: the tree list must contain `packages/cap1-daemon/src` and
  `apps/three-surface-poc/src`, and the file count must exceed 100 (the walk does not run on an empty set).

## 6. Rule 6, my own mutants beyond the record

All run as `npx vitest run packages/cap1-core/src/barrel-guard.test.ts`, one at a time, reverted after each.

| id | mutation | exit | result |
|---|---|---|---|
| X1 | append `export * from './parity-oracle.js';` to `index.ts` | 1 | killed (barrel-share test) |
| X2 | append `export { authorizeWrite as aw } from './write-boundary.js';` | 0 | **survives** |
| X3 | append `export * as wb from './write-boundary.js';` | 0 | **survives** |
| X4 | in `routes-human.ts`: `import { fullDisclosure } from` newline `'@syzygy/cap1-core/testing';` | 0 | **survives** |
| X5 | in `routes-human.ts`: `import … from '../../cap1-core/src/testing.js';` | 0 | **survives** |

[Observed] For X5 I also ran `--project @syzygy/cap1-daemon --project @syzygy/cap1-core` (9 files, 119 tests): exit 0,
so no other suite in those two projects notices it either.

## 7. Findings

No revise finding. Notes only.

- **N1 (low): the barrel check compares runtime names, so a renamed or namespaced re-export evades it (X2, X3).**
  The bead asks for "the barrel's export names exclude every name the entry exports", which is what is built, and E05
  as recorded is killed. The failure class the bead cites (a re-export of `write-boundary.js` from the barrel) has two
  spellings the check cannot see. Type-only names (`WideningFieldViolation`, `ChannelDisclosure` and so on) are also
  outside the comparison, harmless at runtime. A stricter form would compare module identity (for example the value
  of `barrel.authorizeWrite === testing.authorizeWrite` for every barrel key, or a scan of `index.ts` for the two
  module specifiers). Not required by the criteria.
- **N2 (low): the import check is line-wise and specifier-literal (X4, X5).** `TESTING_ENTRY_IMPORT` is tested one line
  at a time, so a `from` whose specifier sits on the next line (a formatter would not produce it today) and a
  relative path into `packages/cap1-core/src/testing.js` both pass. Neither occurs in the tree (section 5), so the
  guard is correct now; the record's N4b/N4c rows do not claim these. Disclosing them in the test's header comment, or
  testing the whole file text rather than lines, closes the gap.
- **N3 (information): the evidence record names the subject by commit, not by a file digest (rule 11).** `mutants.json`
  carries `commit` and the test path; the commit fixes the bytes, and the test file is unchanged between `f5bbf40a`
  and the head (section 1), so it can be re-checked. Adding the test file's sha256 would make it re-checkable without
  the commit, which a rebase-merge leaves reachable from no ref (the corpus's own lesson).
- **N4 (information): the PR says "targeted vitest (87 files, 1869 passed)"; I re-ran only the new project and the
  daemon pair** and did not reproduce that number. It states no claim the verdict rests on.

## 8. Gates run by me

- [Observed] `npm ci` exit 0; `npx vitest run --project @syzygy/cap1-core` 3/3; `npm run typecheck` exit 0; the
  mutant runs of sections 2 and 6. Governance and partition checks are reported on the review PR that carries this
  file.

## 9. Verdict

CONFIRM WITH EXCEPTIONS. The three acceptance criteria are met and independently reproduced (E05 and the daemon import
mutant killed, the control passes), the new project adds exactly the one new file and drops nothing, and the literal
list equals the entry by two methods. N1 and N2 are surviving variants outside the recorded set, for a test-only
follow-up if the owner wants them; they block nothing.
