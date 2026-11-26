# Proposal: lexical import facts in the check record

**State:** Candidate, reviewed once (`REVISE`, every finding repaired; `design.md` Review). Version number, adoption and implementation pending.

## Why

[Inferred] A dossier author can see which packages a manifest declares and can draw an `imports` arrow between two units, but Syzygy holds no evidence that any file's text links two units. Version 2.19 leaves every `imports` arrow `unknown` (`no-witness-rule`), and version 2.7 says a declared manifest fact is "never what any code imports". For a monorepo, which units a file's import statements name is the most direct structural evidence after the tree itself. It can be read lexically, without running or compiling anything, and so can be stated with an honest denominator and an Unknown where the reading stops.

[Observed] Bead syzygy-3efd.60 asks for a unit-level import graph, "lexical only: a fact states that a file contains an import statement naming a unit, never that code calls it at run time; languages one at a time, each staged like any recognizer (Inferred until golden fixtures and a recorded mutation run)". Two candidate steps landed before this one and were not adopted: the design `docs/design/dossier-lexical-import-evidence.md` (#963, review syzygy-vjgl) and the TypeScript report candidate `openspec/changes/polaris-lexical-import-report/` (#968, review syzygy-unep).

## What changes

- In the operator-agent mode, `syzygy dossier check` derives a new member of the draft check record, `importFacts`, format `polaris-dossier-import-facts/1`, placed immediately before `manifestFacts`.
- Candidates are the tree's `.ts` blobs. Each takes the dispositions of the version 2.7 package recognizers: secret-left-out, set apart, or a named file that is Unknown for a stated reason, scanned, or incomplete. Only a whole body the bound screen admits is scanned.
- A finite TypeScript lexical grammar covers top-level static `import`, `import type`, side-effect imports and `export … from` re-exports. Dynamic `import()`, `require()` and import-equals declarations are counted as outside the grammar. Comments, strings, templates and regular expressions never match.
- Two rules resolve operands to `package.json` units.
  - `typescript-relative-import` resolves relative operands over finite addresses, with no target-body read.
  - `typescript-package-import` resolves bare package names against the same check's `npm-package-manifest` `package` facts.
  - Each statement takes one outcome: `edge`, `same-unit`, `external`, `no-unit` or `unknown` (with a reason).
- The member holds the counts, a coverage word (`complete`, `partial` or `unknown`), the edges, files and facts listed as prefixes within a 1,900,000-byte budget, and its own bound under 2,000,000 bytes.
- Read limits: 2,000 named files, 262,144 bytes per file and 16,777,216 bytes in all, each with counted remainders.
- The record bounds of version 2.10 name the new member: the bounded form omits it.
- A byte-change paragraph states that only full draft check records, check's report and their digests change. Older records keep their bytes and read alike.

## Non-goals

- Python or any other language. The member states Python unevaluated. A second language is a later amendment.
- A relation-witness row for `imports`. Version 2.19's witness states are unchanged. A later bead takes this up.
- Any rendered page, `machine.json` or `dossier.json` member, figure, brief or review packet carrying the facts.
- The structure record (`derived-structure.json`), which stays path-only and byte-unchanged.
- Resolution by `tsconfig` `paths`, `exports` maps, bundler or loader configuration. Nothing here runs or compiles project code.
- Any change to secret detection or to the bound screen.

## Impact

- Specification: REQ-polaris-generation-034, MODIFIED (`SEMANTIC-DELTA.md`).
- Code, after adoption: a TypeScript scanner and an import-facts module beside `packages/polaris-dossier/src/manifest-facts.ts`, wired into the check record writer and report.
- Provider mode: no change. The provider golden test stays byte-identical.
