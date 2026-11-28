# R-DOCS-AND-CODE-1 — syzygy-5dhm.119 docs and code v2.48
Reviewed commit: a65c0de393d9d81fbb04b71089ae1f4571ae065f
Verdict: REVISE
Scope: `git diff 5d1f3c6809b3669164719f84983113e6fa8780d0 a65c0de393d9d81fbb04b71089ae1f4571ae065f` (36 files); proposed spec `openspec/changes/dossier-docs-and-code/proposed/polaris-generation/spec.md` SHA-256 18135fdf2c1c7378f2f5e2538b62e39fba3cd184aa88c50b606e02d0647e0fa5 (re-derived by `sha256sum`, matches); references AGENTS.md (prohibitions, verification rules 1-11), VIS-2, SEC-5, predecessor v2.44 `openspec/changes/dossier-rough-edges/proposed/polaris-generation/spec.md`, bead syzygy-5dhm.107 (`resolves` vs `agrees`).

## What was run

All in a detached snapshot clone at a65c0de39 after `npm ci`, TMPDIR set to the review scratch directory.

1. `npx vitest run packages/polaris-dossier/src/doc-references-recognize.test.ts packages/polaris-dossier/src/doc-references.test.ts apps/three-surface-poc/src/polaris-generation/dossier-docs-and-code.test.ts apps/three-surface-poc/src/polaris-generation/dossier-render-provider-golden.test.ts` — 4 files, 23 tests passed. [Observed]
2. `git diff --stat <base> <subject> -- apps/three-surface-poc/src/polaris-generation/dossier-render-provider-golden.test.ts` — empty: the provider golden is unchanged. [Observed]
3. `npm run typecheck` — clean. [Observed]
4. `npm run check` — exit 0; 242 test files passed, 5894 tests passed, 1 skipped. [Observed]
5. `python3 scripts/check_spec_reconciliation.py --check` — first run exit 1 (R1/R3/R5 FAIL) because the snapshot's `refs/remotes/origin/main` was the source worktree's stale `c62d4cf79`; after fetching the real protected main (`5d1f3c680`, the stated base) into that ref: exit 0, "7 of 7 predicates without FAIL; PASS" (R6 WARN, report only, pre-existing PWB pins). [Observed] The pass depends on the clone's `origin/main` being the base; a reviewer cloning the worktree gets a false FAIL (environmental, not a finding against the change).
6. `python3 scripts/check_spec_reconciliation.py --selftest` — exit 0: "SELFTEST PASS ... 744 of 744 mutants killed by their expected predicate; 204 of 204 controls held (commit a65c0de393d9)". [Observed]
7. `python3 scripts/count_polaris_effective_scenarios.py` — "TOTAL: 39 requirements, 659 scenarios"; "PROJECT-STATUS.md asserts: 39 requirements, 659 scenarios". [Observed]
8. `python3 docs/evidence/syzygy-5dhm-119/docs_and_code_inverse.py . openspec/changes/dossier-rough-edges/proposed/polaris-generation/spec.md` — "inverse equals the predecessor: True"; "scenarios 305 312 prefix identical: True". [Observed] (The script shares the builder's literals, so it checks arithmetic, not intent, as its docstring says.)
9. `npx tsx --conditions=source docs/evidence/syzygy-5dhm-119/docs_and_code_patterns_published.mts <spec>` — "8 of 8 published", exit 0. [Observed]
10. A throwaway probe test (written in the snapshot only, then deleted) driving `deriveDocsAndCode` with the same fixture harness and policy v2 screen as `doc-references.test.ts`. Tree: `docs` mode 120000 (symlink); `vault/<fake secret-named file>` as the only entry under `vault`; `deps/libfoo` mode 160000; `img/logo.png`; `src/a.py` = `url = os.environ["DATABASE_URL"]` / `r = cfg.get("max_retries")`. README spans/links: `` `docs/` ``, `` `docs/guide.md` ``, `[g](docs/guide.md)`, `` `vault/` ``, `` `libfoo/` ``, `` `deps/` ``, `` `DATABASE_URL` ``, `` `max_retries` ``, `[![logo](img/logo.png)](missing-outer.md)`, `<!-- \`commented-gone.py\` -->`, an indented-code-block line `    \`indented-gone.py\`` set off by blank lines. Output rows (value, outcome, reason): `docs/` document-only; `docs/guide.md` (span) document-only; `docs/guide.md` (link) document-only; `vault/` document-only; `libfoo/` document-only; `deps/` document-only; `DATABASE_URL` document-only; `max_retries` document-only; `img/logo.png` resolves; `commented-gone.py` document-only; `indented-gone.py` document-only. `[spansNotChecked, linksNotChecked, valuesLeftOut]` = `[0, 0, 0]`. [Observed]
11. `git ls-tree -r --name-only HEAD docs/evidence | grep revert-trial` — only `syzygy-5dhm-45` and `syzygy-5dhm-46` files; none under `syzygy-5dhm-119`. [Observed]

Reading: the recognizer, resolver, page module, `dossier-site.ts`, `render.ts`, `derive-rules.ts`, `local-render.ts`, `live.ts`, `screening.ts` diffs, and the v2.48 requirement paragraphs (spec lines 238-242). The only change to `packages/three-surface-poc-core/src/screening.ts` is one added export line (`recognizeCodeContexts, spanRangesWithin, isFencedAt`); no detector or fail-closed rule changes (SEC-5 untouched). [Observed]

## Findings

### F1 — Important — false Observed `document-only` where the tree holds the named entry as a symlink, a submodule, or only secret-pathed files

Evidence: `packages/polaris-dossier/src/doc-references.ts:195-204` builds `directories` only from prefixes of non-secret blob paths, and symlinks (mode 120000, in `BLOB_MODES`) enter `files` only; `:275` checks submodules only for `tryPaths` (never the tail of a bare name, and never a path that is a strict ancestor of a submodule); `:277-288` then falls through to `document-only`. Probe 10 [Observed]: a symlinked directory `docs` makes `` `docs/` ``, `` `docs/guide.md` `` and the link `[g](docs/guide.md)` all `document-only`; a directory whose only entry is the submodule `deps/libfoo` makes `` `deps/` `` and `` `libfoo/` `` `document-only`; a directory holding only a secret-pathed file makes `` `vault/` `` `document-only`. The page then renders each as Observed with "the pinned tree lists no file or directory at the path it names" (`apps/three-surface-poc/src/polaris-generation/dossier-docs-and-code.ts:51`), which is false: the tree lists an entry at `docs`, `deps`, `vault`. The spec text (line 238: "the tree that lists every blob whose path and every directory prefix no secret detector matches, and every directory holding one") makes this conformant, so the defect is in the requirement as well as the code. VIS-2: missing evidence (an unfollowed symlink, an unlisted submodule tree, a withheld secret subtree) must yield Unknown, never an Observed absence.

Repair: (a) a path whose first segments reach a symlink entry (equal to it or under it), or whose tail matches a symlink entry, is Unknown with a new reason (e.g. `symbolic-link`, RFC2-24 `source-uncaptured-or-unreachable`); (b) treat every submodule path and its prefixes as directories that resolve (or as Unknown `submodule`), and apply the submodule test to the tail too; (c) a path naming a directory that exists only through secret-pathed blobs is left out and counted (as `valuesLeftOut`, so it is named nowhere), not `document-only`. Amend the paragraph's resolution sentence to match, add fixtures for each, and mutate each predicate.

### F2 — Important — identifiers used only as string literals are labelled `document-only`

Evidence: `doc-references.ts:242-248` searches the lexer's code text, in which string interiors are blanked; `doc-references.test.ts` pins `missingThing` (present in `src/util.ts` as a string and in `pyproject.toml`) as `document-only`. Probe 10 [Observed]: `` `DATABASE_URL` `` and `` `max_retries` ``, read by the code as `os.environ["DATABASE_URL"]` and `cfg.get("max_retries")`, are both `document-only`, Observed. Environment variable names and configuration keys are among the most common code spans in project documentation [Inferred], and for exactly those the label tells the reader the code does not hold a name it does hold. The row's evidence sentence is technically accurate ("holds that name as an identifier token"), but the class word is what the reader takes away, and the bead's line (a row is `resolves` when the documented name exists) is not met.

Repair: where the name is absent from the code text but present in a blanked string interior or comment of a code file read (or in a searched non-code file such as a config), make the row Unknown with a named reason (e.g. `only-in-text`, `mapping-coverage-absent`), or resolve it with `searched: "file-text"` and say so. Publish the choice in the requirement and pin it with a fixture.

### F3 — Important — the adoption row and change package cite evidence absent from the reviewed commit

Evidence: A-342 (`.syzygy/governance/decisions/AGENT-ADOPTIONS.md:135`) says the revert procedure was "tested in a scratch clone: `docs/evidence/syzygy-5dhm-119/revert-trial-2026-11-28.txt`"; that file does not exist at a65c0de39 (run 11) [Observed]. `openspec/changes/dossier-docs-and-code/tasks.md` ticks "Mutate each new predicate and record the runs" and `README.md` says "mutation runs ... are under `docs/evidence/syzygy-5dhm-119/`", but the only mutation record present is the reconciler one (`docs-and-code-reconcile-mutation-2026-11-28.json`, 11 mutants); the code-predicate mutation script `docs_and_code_mutation.mjs` is committed without its output record [Observed]. Rule 6 and rule 11: a claim of a mutation run or a trial needs the stored record naming the commit and each mutant's old/new fragment.

Repair: commit the revert-trial transcript and the `docs_and_code_mutation.mjs` output record (each mutant's `old`/`new`, outcome, commit), or untick the task and drop the citation until they exist. Any later edit retires this review's binding (rule 10).

### F4 — Minor — commented-out and indented-code text is read as references

Evidence: `doc-references-recognize.ts:143-175` reads every span the PWB-REQ-006 recognizer reports and every `LINK` match outside fences; that recognizer treats neither HTML comments nor indented code blocks as code contexts. Probe 10 [Observed]: `` `commented-gone.py` `` inside `<!-- -->` and `` `indented-gone.py` `` inside a four-space indented code block both become `document-only` rows. In rendered Markdown neither is a code span. Conformant with the spec's choice of recognizer (AGENTS.md: read fences by the recognizer), so this is a precision gap, not a contract breach.

Repair: either disclose in the page note and requirement that HTML comments and indented code are read, or count such readings in `spansNotChecked` by skipping offsets inside an HTML comment; leave indented code to a later recognizer version if the profile cannot change.

### F5 — Minor — nested link destinations are dropped with no count

Evidence: `LINK` (`doc-references-recognize.ts:55`) excludes `]` from link text, so in `[![logo](img/logo.png)](missing-outer.md)` only the inner image is read; the outer destination is neither a row nor counted (`linksNotChecked` 0 in probe 10) [Observed]. Badge-and-logo links of this shape are common in READMEs [Inferred]. VIS-2 asks that what is not read be counted.

Repair: count a `](` immediately following a matched link's closing `)` as a link not checked, or publish that nested links are not read; add a fixture.

### F6 — Minor — an identifier resolves by its last name alone

Evidence: `doc-references-recognize.ts:153-154` keeps only the last name; `doc-references.ts:269-270` resolves on any token equal to it. `` `Foo.render()` `` resolves if any searched file contains the token `render`, whatever `Foo` is [Inferred from code]. The requirement publishes this (line 238, "its last name occurs"), and the row's evidence names the file and line, so it is disclosed; but `resolves` is weak for qualified names.

Repair: no change required at this version; consider recording `qualified: true` on rows whose value carries a qualifier so a reader can weigh the match, or requiring the qualifier token in the same file.

### F7 — Minor — the 390-pixel fit is asserted, not measured

Evidence: `dossier-docs-and-code.ts:60-66` relies on `overflow-wrap:anywhere` and `table-scroll`; no test renders the page at 390 CSS pixels (no hit for the page in any width test) [Observed]. Fit is [Inferred] from the markup, which follows the rough-edges page's form.

Repair: add the page to whichever browser fit sweep covers the reference pages, or state in the evidence that fit is inferred.

## Acceptance criteria

- Deterministic, no model: met [Observed from code].
- Undecidable rows Unknown with a reason: not met for F1 and F2.
- Secrets never named or rendered: met in every probe; secret-pathed files and their directories are never named [Observed]. F1(c) is a false absence claim, not a disclosure.
- Every expression published: met for the eight exported patterns (run 9); the remaining inline expressions (fragment strip, control-character test, line-terminator trims) are stated in words in the requirement [Observed].
- Fences by the recognizer: met.
- Provider golden unchanged: met.
- No script, fits 390px: no script asserted by test; fit inferred (F7).
- Tests cover refusals and literal markup: met.
- Inverse recovers predecessor: met.
- Reconciler `--check`: passes against the real protected main.
