# Review: syzygy-3efd.89 import facts and imports corroboration code
Verdict: REVISE
Reviewed commit: a2c543350af66db676a75be6573f3f44040e9bbf
Reviewer: fresh-context general-purpose agent, 2026-11-28

Diff base: `e2aa8b8537deeced504feda0d0755a1fd1acf90d` (`git merge-base origin/main a2c543350`). Governing text: `openspec/changes/dossier-import-facts/proposed/polaris-generation/spec.md` (2.39, adopted A-270, tag present) and `openspec/changes/dossier-imports-corroboration/proposed/polaris-generation/spec.md` (2.49, adopted A-273, tag present), with both `design.md` files.

## What was run (worktree /home/orca/.tmp/review-89, `npm ci`, since removed)

- [Observed] `npx vitest run` over `import-facts-lexer.test.ts`, `import-facts.test.ts`, `imports-corroboration.test.ts` and `relation-witness.test.ts`: 4 files, 70 tests passed.
- [Observed] `check.test.ts`, `cli.test.ts`, `svg-inert.test.ts` and `dossier-render-provider-golden.test.ts`: 4 files, 494 tests passed. `relation-types.test.ts`, `render.test.ts`, `system-model.test.ts` and `rerender-measure.test.ts`: 4 files, 243 tests passed.
- [Observed] `npm run typecheck` exited clean.
- [Observed] `git diff --stat e2aa8b85 a2c54335 -- apps/three-surface-poc/src/polaris-generation/dossier-render-provider-golden.test.ts` is empty, so the provider golden is unchanged.
- [Observed] Probe tests were written in the worktree only and deleted before it was removed. Their results are quoted in the findings below.
- Not run: mutation scripts, `npm run check:all`, and any consent-asking command.

## Findings

### 1. Blocking: a tampered check record puts unscreened free text on the page, in the SVG and in machine.json

- **Where:** `packages/polaris-dossier/src/render.ts:323-333` (`importFactsOfRecord`), `packages/polaris-dossier/src/relation-witness.ts:253-256`, and `apps/three-surface-poc/src/polaris-generation/dossier-site.ts:770-772`.
- **Failure:**
  - The render reads `checks/rev-<n>.json`. Spec 2.10 states this file lies "within the agent sessions' write reach, so no reader trusts a record's size, values or depth".
  - `importFactsOfRecord` copies each fact's `id` and `form` with `String(...)` and checks neither.
  - `decideImports` constrains `outcome`, `rule` and `ruleVersion`, but takes `fact.id` and `fact.form` as they are.
  - Both values are then rendered into three places: the `data-witness-fact` attribute on the arrow `<g>` and the `<li>`; the evidence text (`corroborated by import fact <id>, a lexical <form> statement`); and `machine.json`'s `witness.fact`.
  - [Observed] Probe: I edited the record through the test's own `edit` hook, setting `_import-3`'s `form` to `PLANTED FREE TEXT form` and its `id` to a fake `ghp_…` token assembled the way the repository's fixtures assemble one.
    - Both strings reached `index.html`.
    - The SVG attribute passed `assertInertSvg`, because `VALUE` `/^[A-Za-z0-9 #().,_-]*$/` admits words, spaces and `_`.
    - `machine.json` carried `"fact":"ghp_…"`.
  - [Observed] Draft text is screened again at render (`render.ts:516`, `clean` → `WITHHELD_TEXT` on `secret-detector-match`), but these values pass through no such screen. So this is a new sink that bypasses SEC-5 output screening.
  - [Observed] The `svg-inert.ts:24-27` comment says these attributes hold "inert data Syzygy wrote from closed lists and its own identities, never a draft's free text". That holds only if the record is untouched.
- **Suggested repair:**
  - In `importFactsOfRecord` (or `decideImports`), accept a fact only if:
    - `id` matches `^_import-[1-9][0-9]*$`;
    - `form` is one of the five `ImportForm` literals;
    - `outcome` is one of the five outcome literals;
    - `rule` is one of the two rule ids;
    - `ruleVersion === 1`;
    - `from` and `to` are strings or null.
  - If any fact fails, treat the member as `unknown` (`facts-unknown`), not as a partial read.
  - Add a literal test that tampers each field and expects `facts-unknown`, with no planted text on any page or in `machine.json`.

### 2. Note: a string literal can yield a fabricated `edge` fact (a regex keyword used as a property name)

- **Where:** `packages/polaris-dossier/src/import-facts-lexer.ts:234-237` (`regexContext`, `REGEX_WORDS` at :46).
- **Failure:**
  - `o.return / 1` reads the `/` as the start of a regular expression, because the preceding word token is `return`, even though it follows `.`.
  - [Observed] Probe through `deriveImportFacts` on `units/a/src/f.ts`: `const q = o.return / 1, s = '/ import x from "@w/b"';`
    - The tokenizer reads `/ 1, s = '/` as a regex.
    - It then tokenizes `import x from "@w/b"`, which is the string's contents, as code.
    - It then stops at the unterminated `'`.
    - The kept statement gives fact `["units/a/src/f.ts",[1,1],"import","edge","units/a/package.json","units/b/package.json",null]` and an `edges` entry. Coverage is `partial`, but the fact is listed as `inferred` and would corroborate an `imports` arrow (2.49).
  - This breaks the 2.39 SHALL that "Text inside … a string literal … is never a statement". The same holds for `x.default / …`, `x.in / …`, `x.delete / …` and the other words.
  - [Inferred] The spec's "one of the words `return`, …" is better read as the keyword token, not an IdentifierName after `.`/`?.`. The scanner already excludes property positions for `import`, `export` and `require` (`:352`).
- **Suggested repair:**
  - In `regexContext`, treat a word preceded by `.` or `?.` as an identifier, which gives a division. This needs `significant(2)`, which is already passed.
  - Add a literal decoy test.
  - If the spec's wording is thought to forbid this, adopt a one-sentence clarification row.

### 3. Note: a regex directly inside a template substitution is read as a division, contrary to the token rule

- **Where:** `packages/polaris-dossier/src/import-facts-lexer.ts:233`. A `template` token, including a template head or middle that ends in `${`, gives "division".
- **Failure:**
  - 2.39 says a `/` begins a regex after "punctuation", and gives division only after "the end of a template … literal". A head ending in `${` is not an end.
  - [Observed] Probes:
    - ``const t = `${/'/.source}`;\nimport a from './a';`` gives `complete: false` and no statements: the genuine statement on line 2 is lost.
    - ``const t = `${/"/.test(s) + "import x from 'fab'"}`;`` gives `outsideGrammar: 1`, an outside-grammar form taken from string text. That breaks "never an outside-grammar form".
  - Both fail in the safe direction (`partial` coverage), but neither conforms to the spec.
- **Suggested repair:** In `templatePart`, record whether a template token ends at a backtick or at `${`. Give division only for a token that ends at a backtick, and regex for a head or middle.

### 4. Note: a trailing top-level `import` in a complete scan is never counted, so coverage can be `complete` while a form goes uncounted

- **Where:** `packages/polaris-dossier/src/import-facts-lexer.ts:360` (`if (next === undefined) continue;`) and `:374` (`if (match.kind === 'short') continue;`).
- **Failure:**
  - [Observed] `"import a from './a';\nimport\n"` and `"import a from './a';\nimport x from\n"` both give `complete: true, outsideGrammar: 0`.
  - Through `deriveImportFacts`, `import { b } from '@w/b';\nimport x from\n` gives `coverage` `complete` and `outsideGrammar` 0.
  - 2.39 counts "a top-level `import` token that begins no form above … and is followed by neither `(` nor `.`" and says `outsideGrammar` "never leaves one uncounted".
  - The file is invalid TypeScript, so the impact is small, but this is an under-count that the spec rules out.
- **Suggested repair:** Where the scan is complete (`stop === null`), count a top-level `short` match, or a lone `import` at end of file, in `outsideGrammar`. Keep `short` uncounted only where the tokens ran out at a stop.

### 5. Note: `import { type as }` and `import { type as as as }` are counted outside the grammar

- **Where:** `packages/polaris-dossier/src/import-facts-lexer.ts:260-266` (`specifiers`).
- **Failure:**
  - [Observed] Both forms give `outsideGrammar: 1` and no statement.
  - 2.39 says "a binding being any identifier, `from`, `type` and `as` among them", and TypeScript accepts both forms.
  - This errs in the safe direction (`partial` coverage), but does not conform.
- **Suggested repair:** Handle the TypeScript disambiguation for `type as`, `type as X` and `type as as X`, or take `type` as a prefix whenever three or more names precede `,` or `}`. Add literals.

### 6. Note: the `data-witness-state` allowance is by attribute name only

- **Where:** `apps/three-surface-poc/src/polaris-generation/svg-inert.ts:27`.
- **Failure:**
  - [Observed] The renderer writes only the literal `corroborated`.
  - [Observed] The validator, however, admits the attribute on any element with any `VALUE`-matching value, so it could carry space-separated words. Finding 1 shows that `data-witness-fact` beside it can already carry words.
  - [Inferred] The allowance is narrow only by the code that emits it, not by the validator.
- **Suggested repair:** In `assertAttribute`, require `value === 'corroborated'` for `data-witness-state`, and `^_[a-z]+-[1-9][0-9]*$` (or the closed id forms) for `data-witness-fact`. Add an `unsafe-svg` test for each.

### 7. Note: mutation evidence is thin on the lexer (8 of 33 mutants), and several branches have no test at all

- **Where:** `docs/evidence/syzygy-3efd-89/import-facts-mutation-2026-11-28.json`.
- [Observed] The 33 mutants break down as follows: 8 on the lexer, 13 on `import-facts.ts`, 4 on `relation-witness.ts`, 2 on `render.ts`, 4 on `dossier-site.ts`, 1 on `svg-inert.ts` and 1 on `check.ts`.
- [Observed] None mutates the tokenizer core: string, template, regex-body and comment scanning, or the depth stack. [Inferred] 33 is enough for the witness row but not for a 402-line lexer whose errors produce false facts (findings 2 and 3).
- **Untested branches, by line, at a2c54335:**
  - **Lexer, `import-facts-lexer.ts`:**
    - `:46`: every `REGEX_WORDS` entry except `default`. For example, `return /import a from 'b'/` is untested.
    - `:73`: escapes inside a template literal (`` `\`import …` ``).
    - `:81-83`: the hashbang skip. [Observed] Separately, a BOM followed by `#!` stops the scan as `incomplete`.
    - `:107-112`: regex escapes at end of line, and the character-class rule (`/[/]import a from 'b'/`).
    - `:116`: regex flags.
    - `:132`: a U+2028 or U+2029 inside a string makes it non-plain. Probed but not tested.
    - `:136`: backslash-CRLF line continuation inside a string.
    - `:156-163`: unicode-escaped identifiers. [Observed] `import` gives no statement, which is correct but untested.
    - `:172-180`: private names.
    - `:186`: `?.` against `?.5`.
    - `:203`: heads for `while`, `for`, `with` and `for await`. Only `if` is tested.
    - `:215-219`: a mismatched closer does not pop the stack.
    - `:236`: the `continue` label. Only `break` is tested.
    - `:241`: `]` gives a division.
    - `:329`: `export * as 'string'`.
    - `:369`: an import-equals or namespace alias inside a block, counted.
    - `:360` and `:374`: `short` at end of file (finding 4).
  - **Derivation, `import-facts.ts`:**
    - `:226`, `:227`, `:229`, `:231`, `:246`, `:253`, `:255-257` and `:260`: the file dispositions `path-not-citable`, `symbolic-link` (a `.ts` candidate of mode 120000), `denied-path`, `class-not-consented`, `object-read-refused`, `not-utf8-text`, `active-content` and `redacted-body`. Each occurs 0 times in `import-facts.test.ts`.
    - `:174`: a `..` that leaves the root.
    - `:196` and `:325`: the statement outcomes `target-absent` and `target-unit-undecidable`. Each occurs 0 times.
  - **Render, `render.ts:325-328`:** an unreadable or foreign record (`isCheckRecordOf` false), a member that is not a record, and `facts` that is not an array.
- **Suggested repair:** Add literal tests for each branch above, and a second mutation run covering the tokenizer core. At minimum, mutate:
  - the string terminator check;
  - the `inClass` toggle;
  - the template `${` push;
  - the `t`-pop at `:193`;
  - the `depth` captured in `push`;
  - `HEAD_WORDS`;
  - `DIVISION_PUNCT`.

### 8. Note: three 2.39 and 2.49 scenario clauses have no direct test

- **Where:** `packages/polaris-dossier/src/import-facts.test.ts` and `packages/polaris-dossier/src/imports-corroboration.test.ts`.
- **2.39, "Import facts give a workspace's unit graph" AND:**
  - It requires that "the structure record and `manifestFacts` are byte-identical to those the same check writes under version 2.38". No test compares them.
  - It requires that every line pair is a range "the path-and-range check accepts". The test uses `lineCountOf` bounds, not the check itself.
- **2.39, "Earlier records and every other output keep their bytes":**
  - Review and close reading a record without `importFacts` are untested. Only the render reads one, in the 2.49 `drop` case.
  - The new record differing from the 2.38 record "only by the `importFacts` member" is not asserted.
- **2.49, "A missing import fact is never read as no import":**
  - It names a third case, "once with `factsNotListed` above zero". Only the `complete` and `partial` trees run.
  - The rule ignores `factsNotListed`, so this is a gap in the test, not in the code.
  - The migration AND line is tested with a hand-built v12 draft in a separate run, not "migrated … and checked in the same run". [Inferred] This is acceptable, since the member is run-independent.
- **Carried scenario "A fact of another relation type never witnesses":**
  - Its THEN was amended by 2.49 to "`e1` carrying `imports` is `unknown` with `endpoint-kind-mismatch`".
  - `relation-types.test.ts:250-256` checks findings for `imports` but renders and asserts states only for `calls`. The amended state is unit-tested in `relation-witness.test.ts` with a top-level-directory → package-manifest pair, not with the scenario's `e1`.
- **Suggested repair:** Add one assertion for each item.

### 9. Note: the 2.39 timing and size measurement (tasks.md) is not done, and both `tasks.md` files leave the code items open

- **Where:**
  - `openspec/changes/dossier-import-facts/tasks.md` items "Code, after adoption" and "Measure the scan's time and the member's size on a large synthetic tree and on this repository";
  - `openspec/changes/dossier-imports-corroboration/tasks.md` item "The code change";
  - design D4, which records `[Unknown]` with no measurement yet.
- **Failure:**
  - [Observed] `docs/evidence/syzygy-3efd-89/` holds only the mutation record.
  - Check now adds up to 2,000 reads and up to 16 MiB of tokenizing to every draft check. Its cost on this repository is not recorded.
  - [Observed] The 16 MiB read-limit test alone takes about 3.9 s in vitest.
- **Suggested repair:** Record a timing and member-size measurement on this repository and on a synthetic tree at the caps. Tick the delivered `tasks.md` items in the same change.

### 10. Note: stale "version 1" comments after the bump to version 2

- **Where:**
  - `packages/polaris-dossier/src/relation-witness.ts:6`: "Rule `relation-witness` version 1 …";
  - `packages/polaris-dossier/src/render.ts:306`;
  - `packages/polaris-dossier/src/check-derive.ts:645`.
- **Failure:**
  - [Observed] `RELATION_WITNESS` is now `version: 2`, and no output byte reads that constant, so byte stability holds.
  - The doc comments still name version 1.
- **Suggested repair:** Reword the comments to say "version 2 (version 1 plus the `imports` row)".

## Criteria answered

1. **SHALLs and scenarios.**
   - [Observed] Every 2.39 and 2.49 scenario has a test, except the clauses listed in finding 8.
   - The lexer departs from the token rule in findings 3, 4 and 5. Finding 2 departs from the "never a statement" SHALL.
2. **Lexical only, honest absence.**
   - [Observed] `decideImports` never returns `challenged`: there is no code path to it. Absence gives `coverage-partial`, and a missing or unknown member gives `facts-unknown`.
   - Withheld, secret-matched, symlinked and undecidable-package cases are Unknown, as written and as tested where tests exist (finding 7 lists the gaps).
   - Findings 2 and 3 are false or lost statements.
3. **Screening.**
   - [Observed] No operand or body text enters the member. The test at `import-facts.test.ts:95` checks this, and the code stores only offsets converted to lines.
   - [Observed] The render reads no body for this rule: `edgeRelationsAt` gets `imports` from the record only.
   - [Observed] No script or event attribute is added.
   - Finding 1 is a new unscreened sink.
   - The `data-witness-state` allowance is narrow by code only (finding 6).
4. **Evidence digest.**
   - [Observed] The digest is `sha256` over the `importFacts` value's bytes, with lines after the first re-indented by two spaces (`render.ts:338`).
   - [Observed] The tests derive the expected digest independently, by slicing the written record bytes between `"importFacts": ` and `,\n  "manifestFacts": ` (`imports-corroboration.test.ts:196-200`), never through `importFactsDigest`.
   - [Observed] The evidence text names no check-record digest.
   - [Observed] The v12 later-figure item takes the "as shown in" form with the attributes and no evidence text (test at `:322-335`).
5. **Byte stability.**
   - [Observed] The provider golden is unchanged.
   - [Observed] `check.test.ts:538` is required: 2.39 places `importFacts` "immediately before `manifestFacts`, which stays the record's last member".
   - [Observed] `check.test.ts:1984` is required by the 2.10 bounded form as amended.
   - [Observed] The `cli.test.ts:132` list change is required, because the no-network sweep enumerates every source file and the two new modules are in it. It is mechanical, not a semantic change.
   - [Inferred] A draft with no `imports` edge renders unchanged, since only `decideImports` and the `corroborated` branches are new. The relation and render tests above all pass unchanged.
6. **Conformance literals.** [Observed] Expected values in the four new or changed test files are literals. Only fixtures and drivers are imported from the modules under test.
7. **Mutation adequacy.** Not adequate for the lexer (finding 7).
8. **Correctness.**
   - Findings 2 to 5.
   - [Observed] Ordering is deterministic: facts sort by path, first line, last line, then position; edges by `from`, then `to`; files by outcome group, then path.
   - [Inferred] Minor points:
     - `path-not-citable` entries sort by their shown form, not the raw path (`import-facts.ts:279`).
     - A relative operand that normalises to the root directory (`./q/..` from a root file) gives addresses `.ts` and `/index.ts`, so `target-absent`. That is Unknown and literal to the spec, so it is not reported as a finding.
