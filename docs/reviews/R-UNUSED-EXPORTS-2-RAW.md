# Review of PR #726 (syzygy-bpyt.4.9), round 2: scripts/check_unused_exports.mjs
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: fe6a19194cb27d28cabf16913848cd308741326a
Subject: PR #726, `scripts/check_unused_exports.mjs` (barrel-use repair, `published` flag, 76 fixture checks, 107 mutants), reviewed under bead syzygy-eof5 (round 2 of the round-1 REVISE in `R-UNUSED-EXPORTS-RAW.md`)

## Method

[Observed] Detached checkout of the exact head (`gh pr view 726 --json headRefOid` = `fe6a19194cb27d28cabf16913848cd308741326a`), shared `node_modules`. Ran the tool, `--selftest`, and `git grep -nw` per finding. Mutations were made in that checkout and reverted with `git checkout`; nothing in the reviewed tree was left edited.

## Findings

### F1 (note): the predicate `SEAM = /Test seam/` has a surviving mutation

[Observed] Rewriting only line 38 (`const SEAM = /Test seam/;`) to `const SEAM = /Test/;` and running `--selftest`: no fixture check printed FAIL (the only FAILs were mutant lines whose `old` fragment no longer occurs, because the file bytes changed; the fixture expectations all held). The fixtures hold a lowercase `test seam`, `the seam of it` and `only a plain comment`, but no comment containing `Test` without `seam`. The PR body's "every predicate has a killed mutant (107 of 107)" is therefore true of the 107 listed mutants and not of every predicate. One fixture comment such as `// Test only.` above an export, expected to stay a finding, plus a mutant for it, closes this. It does not change any count.

### F2 (checked, no finding): the 11 dead findings

[Observed] `node scripts/check_unused_exports.mjs`: `files scanned: 601; workspaces: 13; exports declared: 2117`, `public=483; internal=723; test-only=453; self-only=447; dead=11`, `findings: dead=11; self-only=447; test-only without Test seam=361 (... 92)`, published dead=8, self-only=256, test-only=219. All match the PR body.
[Observed] `git grep -nw` outside `docs/`, per name, files naming it besides the declaration: `ConsentAbsenceBasis`, `RepositoryCoverageState`, `DeclarationField`, `AnswerValue`, `ProviderInventoryCoverage`, `ProviderBlockSupport`: none. `SESSION_DIR`: only `polaris-dossier/src/inventory.ts:23`, an `export { } from` re-export, no consumer of it. `ProviderBlock`, `ProviderDiagram`: only the `polaris-generation-core/src/index.ts:21` re-export. `FACT_FAMILIES`: no TypeScript user; two `.md` files and `scripts/build_pwb_registry_currency_briefing_amendment.py` (a comment, `#: ... fourth FACT_FAMILIES entry`) name it, none is code the tool counts. `PUBLIC_SOURCE_ACT_RECORD_PATH`: one `.md` ledger names it. All eleven are dead as classed; the 8 `published` flags match the barrel re-exports found (`index.ts:21`, `inventory.ts:23`, and the cap1-core and three-surface-poc-core barrels for the others).
[Observed] Five self-only, each by `git grep -nw`: `FIXTURE_AS_OF` (`fixtures/index.ts:43`, `:96`), `ConsentLoadReport` (`consent-loading.ts:119`, `:378`), `PendingRepair` (`polaris.ts:85`, `:447`, `:485`), `AnchoredBlockInput` (`polaris-anchor-resolution.ts:52`, `:58`), `DiscoveryProviderError` (`discovery-provider.ts` plus the `index.ts:16` re-export). Each is used only in its declaring file, apart from the re-export. The sixth listed in the run output, `NO_RECORD_DEADLINE_PASSED`, is used at `status.ts:177` only.

### F3 (checked, no finding): the removed guards were redundant

[Inferred] Read from the diff `a7f2991b..fe6a1919` and the TypeScript node shapes:
- `!isExportDeclaration && !isImportDeclaration` in `declNameNodes`: neither node kind has a `name` property (they carry `exportClause`/`importClause`), so `statement.name &&` is already false for them. An `import x = require()` has a `name` but is neither kind, so the guard never covered it.
- `p &&` before `ts.isExportSpecifier(p)`: an `Identifier` is never the source file, and `createSourceFile(..., true)` sets every `parent`.
- `seen` within a statement: `dedupe()` keeps the first row per name for the whole file, so a within-statement repeat is already collapsed.
- `IDENT` on string literals: an export name is an identifier, so a string that is not an identifier can never equal one; only a count of unmatched strings changes.
- Explicit `ScriptKind`: `createSourceFile` derives it from the file name extension (`.mjs/.cjs/.js` to JS, `.ts/.mts` to TS).
- `moduleSpecifier` guard in the `export *` branch: an `ExportDeclaration` without an `exportClause` always has a specifier.
[Unknown] Not run: a full before/after output comparison of the whole 601-file tree for each guard singly; the dead/self-only/test-only totals at the new head are the only comparison made.

### F4 (checked, no finding): my own mutations

[Observed] Each rewrites one predicate in the head's script and runs `--selftest`:
- `allBarrels.has(path) ? scan.reexports.get(name) ?? 0 : 0` inverted: exit 1, `FAIL barrelOnlyThing: expected dead (finding) published, got internal published` and five more FAIL lines.
- `if (!s.exportClause) star = true;` to `star = false`: exit 1, `FAIL export * declarers: none`.
- `isExported`'s `&& !kinds.includes(DefaultKeyword)` dropped: exit 1, `FAIL not audited: 9 names absent, found defaultFn` and `FAIL row count 65 equals 64 expectations`.
- `SEAM` to `/Test/`: survived (F1).
(The `sed` for the first three also rewrote matching lines in the mutants table; the FAIL lines quoted are fixture failures, not mutant-table ones.)

### F5 (checked, no finding): the F1 to F4 repairs of round 1

[Observed] F1: the 18 false dead names are gone and the 11 that remain are real (F2 above). F3: `published` appears in the report and JSON rows. F4: 601 is the stated denominator. The selftest ends `mutants: 107 of 107 killed`.

## Gates

- [Observed] `node scripts/check_unused_exports.mjs --selftest`: exit 0, `mutants: 107 of 107 killed`.
- [Observed] Hosted CI at `fe6a1919` (`gh pr checks 726` run in the foreground): `checks`, `node`, `node (e2e)`, `node (integration)`, `node (unit)` all pass.
- [Not run] `npm run check` locally; the hosted unit tier covers it at this head and the PR touches no vitest file.

## Verdict

CONFIRM WITH EXCEPTIONS. Round 1's blocking findings are repaired and the counts reproduce. Exception: one predicate (`SEAM`) survives a mutation (F1), contradicting the claim that every predicate is killed; it affects no count and may be fixed after merge or before, at the author's choice.
