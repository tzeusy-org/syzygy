# Review of PR #726 (syzygy-bpyt.4.9): scripts/check_unused_exports.mjs
Verdict: REVISE
Reviewed commit: a7f2991b667b2ece6bc761cf6f7d055e6c13380b
Subject: PR #726, `scripts/check_unused_exports.mjs` (TypeScript-compiler-API export census, `--selftest` with 22 fixtures and 15 mutants), reviewed under bead syzygy-eof5

## Method

Checked out the exact head detached, `npm ci`, then ran the tool, its selftest and `npm run check`. Classifications were re-derived with `git grep -nw` and a scratch copy of the script (deleted after use; nothing in the reviewed tree was edited).

## Findings

### F1 (blocking): non-index "barrel" modules are excluded as users, so real uses read as dead

[Observed] `discover()` treats every `source` entry of a package `exports` map as a barrel, and `analyze()` skips a barrel both as a declarer and as a user (`allBarrels.has(other)`). `packages/polaris-dossier/package.json` lists `./argv`, `./check`, `./cli`, `./clone-shape`, `./gate-sources`, `./git-object-reader`, `./init`, `./inventory`, `./review`, `./screen`, `./state-directory`, `./full-run.testkit` as `source` entries, and `apps/three-surface-poc` lists `./dossier-site` and more. These are real modules with logic, not re-export files (`review.ts` calls `validateVerdict` at line 157, `cli.ts:343` calls `awaitSession`), so their identifiers are never counted.

[Observed] Hand check, `git grep -nw`: `awaitSession` is reported dead (run output line `waiting-sessions.ts:443 awaitSession [dead]`) and is imported at `packages/polaris-dossier/src/cli.ts:22` and called at `cli.ts:343`. `validateVerdict` and `nextVerdictNumber` (reported dead) are imported at `review.ts:17` and called at `review.ts:157,169,238,275,279`. `LOCAL_CSS` (dead) is imported at `apps/three-surface-poc/src/polaris-generation/dossier-site.ts:11` and used at `:107`.

[Observed] Quantified with a scratch copy that counts barrel tokens as uses except inside `export ... {}` specifiers (two lines changed): dead falls 29 to 11. The 18 false "dead" names are STEP_LOG_FORMAT, DEFAULT_DRAFT, DRAFT_JSON_LIMITS, BRIEF_JSON_LIMITS, CheckRequest, validateDesignVerdict, inventorySchemaDocument, VERDICT_MAX_BYTES, PACKET_DISCLOSURES, DESIGN_PACKET_DISCLOSURES, nextVerdictNumber, validateVerdict, awaitSession, LOCAL_MACHINE_VIEW, LOCAL_CSS, disclosureMarkup, regionMarkup, anchorDetails. The same change moves 28 self-only and 23 test-only exports to internal; findings fall 897 to 851 (self-only 480 to 454, uncommented test-only 388 to 386). The PR's headline numbers (dead 29, self-only 480, test-only 388) therefore overstate by those amounts. The task brief stressed false "dead" as the costly error: this is that error, 62 per cent of the dead list.

[Inferred] Two sound alternatives: treat only pure re-export statements in a barrel as non-uses, or exclude from user-skipping every barrel that has a non-export statement. The PR text says "barrel tokens are not uses", which is right for `index.ts` and wrong for a subpath module.

[Observed] The selftest cannot see this: the fixture workspace has one barrel (`index.ts`, re-exports only) and no logic-bearing subpath module.

### F2 (blocking): the 15 mutants do not cover the predicates the PR claims, and a mutation I wrote survives

[Observed] The PR body says "15 mutants (one per predicate)". I rewrote one predicate at a time in a scratch copy and ran `--fixtures-only`; these all SURVIVED (exit 0, no FAIL line): dropping `TEST.test(file)` from the declarer filter; dropping `allBarrels.has(file)` from the declarer filter; dropping the `.d.ts` exclusion; dropping the `DefaultKeyword` exclusion; replacing `!p.parent.parent.moduleSpecifier` with `true`; widening `SEAM` to `/Test seam|only/`; removing the `$` anchor of `IDENT`; deleting the `star = true` assignment; narrowing `TEST` to `.ts` only; replacing `file.startsWith(unit.prefix)` with `true`. The `tracked-docs` filter lives in `trackedFiles` outside the fixtures, so no fixture can reach it. Some are inert only because the fixtures lack the input (no `.d.ts`, no default export, no `.mjs` test), which is the gap, not a defense.

[Observed] The author's own gate passes: `--selftest` exit 0, 21 ok lines plus the unexpected-exports check (22 expectations), 15 of 15 killed. The 15 are real kills; the claim is only that they exhaust the predicates.

### F3 (note): public-API-only re-exports are classed dead or self-only

[Observed] `ProviderBlock` and `ProviderDiagram` (`polaris-generation-core/src/provider-draft.ts`, re-exported at `index.ts:21`), `SESSION_DIR` (re-exported by `polaris-dossier/src/inventory.ts:23`) and `InvalidOutputReason` (`pipeline.ts`, re-exported at `index.ts:19`) are used nowhere in code except the re-export. They stay in the dead/self-only list by design ("barrel tokens are not uses"). [Inferred] That may be the wanted answer (remove from the public surface), but the output does not distinguish "dead, also published" from "dead, private"; a reader deleting them breaks the package's exported API.

### F4 (note): population count is 601, not 600

[Observed] `git ls-files` filtered by the tool's own rule (`\.(ts|mts|mjs|js|cjs)$`, not under `docs/` or `node_modules/`) gives 601 at this head, equal to the tool's "files scanned: 601". The PR body says 600; the script file itself is the 601st. No file is missed or extra for the rule.

[Observed] Declarer population: 285 non-test, non-`.d.ts` `.ts` files under `packages/*/src` and `apps/*/src`; 241 declare at least one row; the other 44 are entry mains and fixtures with no export line, plus `source`-listed barrel files (28 barrel paths in all, 19 of them not `index.ts`). Those non-index barrels are the F1 population; their own declarations (for example `argv.ts` `ArgvSpec`) are never audited, which the header comment states for barrels in general but which hides real declarations in subpath modules. No `.tsx`, `.jsx`, or inline-script HTML consumer exists under the scanned trees (the three tracked `.html` files are under `.syzygy/` and `docs/evidence/`).

### F5 (checked, no finding): the other items

- [Observed] Hand check of the remaining 11 dead after F1 (`ConsentAbsenceBasis`, `RepositoryCoverageState`, `DeclarationField`, `AnswerValue`, `ProviderInventoryCoverage`, `ProviderBlockSupport`, `FACT_FAMILIES`, `PUBLIC_SOURCE_ACT_RECORD_PATH`, plus the three in F3): `git grep -nw` outside docs, `.syzygy` and `openspec` finds only the declaration (and for F3, the re-export). Correct.
- [Observed] Five self-only checked by seeded sample: `MACHINE_VIEW_REGION_MEMBER`, `HumanSection`, `PreflightReport`, `InvalidOutputReason`, `AdmittedAct`. Each is used only inside its declaring file (plus the barrel re-export for `InvalidOutputReason`). Correct.
- [Observed] Re-exports: `export { x } from` in a non-barrel counts as a use of `x` (the `moduleSpecifier` branch); `export *` is flagged by `star` and reported as 0 files here. Dynamic `import('...')` of a path names no export and adds none; a string equal to an identifier counts (`mod['name']`), which is the stated under-reporting direction. Type-only imports are identifier nodes and count.
- [Observed] The `/*`-inside-a-string bug is covered: fixture lines `globHolder`/`afterGlob`/`afterGlobUse` put `'**/*.ts'` before a real `/* c */` comment and a following export, and `b.ts` repeats the pattern; `stringOnly` holds `'http://h/x'`. The mutant `identifier-uses-not-counted` and the fixtures fail if a regex replaces the parser. I did not reintroduce the old regex to prove the fixture fails; the AST path makes the failure mode unreachable.

## Gates

- [Observed] `node scripts/check_unused_exports.mjs --selftest`: exit 0, 22 fixture expectations hold, 15 of 15 mutants killed.
- [Observed] `npm run check`: exit 0, 168 test files, 3766 tests passed.
- [Observed] Hosted CI at `a7f2991b` (`gh pr checks 726`): node, node (unit), node (integration), node (e2e) passed; the `checks` job was still pending when read.

## Verdict

REVISE. Not merge-ready: the headline counts are wrong in the direction the task weighted most (false dead), and the selftest does not exercise the failure. Fix F1 (count logic-bearing subpath modules as users) with a fixture holding a non-index `source` module that uses a sibling's export, and add fixtures/mutants for the surviving predicates in F2. F3 and F4 are notes.
