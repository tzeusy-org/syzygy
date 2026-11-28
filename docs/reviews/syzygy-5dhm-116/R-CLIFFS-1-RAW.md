# R-CLIFFS-1 — syzygy-5dhm.116 cliffs v2.49
Reviewed commit: 627aea0b0ee6bf0e6e5a4524ea6e04ac39ef4545
Verdict: REVISE
Scope: `git diff f8da91cd2 627aea0b0`; proposed spec SHA-256 29acdcd5e0461daa1e0b1cf3f871d31bf13e7b2e788b987969ba731e8281b48f

## What was run

All in a detached snapshot clone at `/home/orca/.tmp/w116-review/snap`, HEAD 627aea0b0, `npm ci` done, `refs/remotes/origin/main` set to f8da91cd2, `TMPDIR=/home/orca/.tmp/w116-review/tmp`.

- `sha256sum openspec/changes/dossier-cliffs/proposed/polaris-generation/spec.md` → `29acdcd5…b48f` [Observed].
- `npx vitest run` over `limits-recognize.test.ts`, `limits.test.ts`, `dossier-cliffs.test.ts`, `dossier-render-provider-golden.test.ts` → 4 files, 32 tests passed [Observed].
- `git diff --stat f8da91cd2 627aea0b0 -- apps/three-surface-poc/src/polaris-generation/dossier-render-provider-golden.test.ts` → empty (golden byte-identical to base) [Observed].
- `npm run typecheck` → exit 0, no diagnostics (a first run overlapped a checkout of another commit and was discarded; the rerun was on a clean tree at 627aea0b0) [Observed].
- `python3 scripts/check_spec_reconciliation.py --check` → `6 of 7 predicates without FAIL; FAIL`: R5 `openspec/README.md: 0 rows for tracked change dossier-cliffs, expected 1`; R6 two WARN pins, both present at base too [Observed]. At base f8da91cd2 the same command gives `7 of 7 … PASS` [Observed]. At the sibling's pending commit 2ce92e136 (v2.48, before its adoption commit 3e12ae40c added the README row) R5 failed the same way [Observed], so this is the established pending-stage state (F5).
- `python3 scripts/count_polaris_effective_scenarios.py` → `TOTAL: 39 requirements, 634 scenarios`, equal to what PROJECT-STATUS.md states (the pending change is not counted) [Observed].
- `python3 docs/evidence/syzygy-5dhm-116/cliffs_inverse.py . openspec/changes/dossier-docs-and-code/proposed/polaris-generation/spec.md` → `inverse equals the predecessor: True`; `scenarios 313 321 prefix identical: True` (8 new scenarios, appended last) [Observed]. The script shares the builder's literals, so it checks arithmetic, not intent [Inferred, from its docstring].
- `npx tsx docs/evidence/syzygy-5dhm-116/cliffs_patterns_published.mts <proposed spec>` → `34 of 34 published` [Observed]. It compares `RegExp.source` only, not flags; the one semantically relevant flag (`i` on `iniBoolean`) is stated in words in the spec ("compared without case") [Observed]; `d`/`y` are mechanics.
- Disposition order in `limits.ts:128-141` compared line by line with `rough-edges.ts:110-118`: same order (secret path, vendored/generated, path-not-citable, symbolic link, path screen, class gate, read limit) [Observed].
- Adjacent tests: `npx vitest run packages/polaris-dossier packages/polaris-generation-core apps/three-surface-poc/src/polaris-generation` → 175 files, 2 failed tests [Observed]:
  - `render.test.ts` › "derives no size or object id for a private repository, and names no secret-matching path" fails on `reference/cliffs.html` (F1). Passes at base (no cliffs page there) [Inferred: the assertion names the new page].
  - `dossier-reading.browser.test.ts` › "fits every dossier page at 390 by 844…" fails with `#block-local-reflow-inline a.cite has no hittable label point`; it fails identically at base f8da91cd2 [Observed], so it is pre-existing in this environment and not charged to this change; its fixture holds no reference page (no `cliffs`/`docsAndCode`/`roughEdges` string in it) [Observed].
- Throwaway probe test `packages/polaris-dossier/src/zz-review-probe.test.ts` (written in the snapshot, run, deleted; `git status --short` clean afterwards) [Observed]. Results:
  - ini, tox-style continuation `[testenv]\ndeps =\n    pytest-cov >= 2\ncommands =\n    pytest --timeout 30 {posargs}\n` → `ok: true`, rows `testenv.pytest-cov` = `>= 2` (text, line 3) and `testenv.pytest` = `--timeout 30 {posargs}` (text, line 5); setup.cfg-style `install_requires =\n    requests >= 2.0` → row `options.requests` = `>= 2.0` (F2).
  - yaml `a: 1\n  max_b: 2\n` → rows `a`=1 and top-level `max_b`=2 integer; `a: b: c` → `a` = `b: c` text (F3). `k: one\n  two` → outside-grammar (correct).
  - Python `app.config.update(\n    MAX_CONTENT_LENGTH=16 * 1024 * 1024\n)` → row kind `max`, expression, Observed; C `#if 0\n#define MAX_X 5\n#endif` → `MAX_X` 5 integer (F4).
  - Comments and strings: `# MAX_X = 5`, a `"""…MAX_Y = 6…"""` docstring, `x = "MAX_Z = 7"`, and a JS block comment holding `const MAX_X = 5;` → no rows (correct). `const MAX_X = 2 /* was 3 */;` → value `2` (comment not read); `const MAX_Y = 1 /*x*/ + 2;` → Unknown (conservative, correct).
  - Unknown kept Unknown: `MAX_X = 5 if a else 6`, `DEFAULT_X = f"{a}"`, `"a" "b"`, `MAX_X = 5; MIN = 2`, `const MAX_A = 1, MAX_B = 2;`, a JS template with a substitution, `MAX_Y = ()`, `MAX_Z = (1)(2)` → each `value: null, valueType: null` (correct). Go `MAX_X := 5` and Python `MAX_X == 5` → no row (correct).
- Probe of F1's cause: replacing the test's `text.replaceAll('terraform-configuration', '')` by the same plus `.replace(/[Cc]onfiguration/gu, '')` (snapshot only, reverted with `git checkout --`) → the test passes, so the only `conf` on the cliffs page is the word "configuration"; no secret-path directory is rendered [Observed].
- Secret handling read in `limits.ts:119,214-241`: each body goes through `screenTargetBody` whole (excluded → Unknown `secret-detector-match`/`active-content`, redacted → Unknown `redacted-body`), and every row's quoted line goes through `screenBody` and the value checks before it is kept; value and name are substrings of an admitted body [Observed in code]. No change to a detector or SEC-5 rule is in the diff [Observed: the diff touches no screening module].
- Batching: `limits.ts:143-147,196-212` reads 64 paths per call and, on a `GitObjectReadRefusal`, re-reads that batch one path per call; covered by the test "reads at most 1000 source files, 64 to a call…" [Observed]. No wall-clock measurement was run [Unknown: real-repository cost].
- 390 px: the page uses `overflow-wrap:anywhere` on its lists and headings and the shared `.table-scroll` wrapper (`dossier-cliffs.ts:58,83,98`) [Observed]; no browser measurement of `reference/cliffs.html` was run by this review or exists in the change (F6) [Unknown: measured fit]. `dossier-cliffs.test.ts:72` asserts no `<script` [Observed].

## Findings

### F1 — Important — An integration test fails at the reviewed commit because the cliffs page says "configuration"

Evidence: `packages/polaris-dossier/src/render.test.ts:2126` checks every rendered file for the bare word `conf` (the secret path's directory), after removing only `terraform-configuration`. The cliffs page's note (`apps/three-surface-poc/src/polaris-generation/dossier-cliffs.ts:68`, "…the ini-form and yaml-form configuration files…") and its table header ("Configuration entries", line 79) contain `conf`, so the test fails: `AssertionError: reference/cliffs.html conf: expected '<!doctype html>…' not to contain 'conf'` [Observed]. The probe shows no real leak [Observed], but `npm run check:all` (integration tier) is red at this commit, and the guard is now blind to a real `conf` leak on that page only if someone widens the exclusion carelessly.
Repair: keep the guard's power and make it exclude only the page's own wording, e.g. strip `/[Cc]onfiguration/g` (or test for the secret directory as a path segment, `conf/`), and assert separately that the cliffs page names no path under the secret directory. Run the integration tier before the adoption commit.

### F2 — Important — The ini grammar reads continuation lines as entries: false Observed rows from tox.ini and setup.cfg

Evidence: `packages/polaris-dossier/src/limits-recognize.ts:80` (`iniEntry` accepts a white-space separator and any leading indentation) and `:212-218` (no notion of a continuation line). In the ini dialects the `.cfg`/`.ini` candidates mostly are (Python configparser: setup.cfg, tox.ini, pytest.ini), an indented line after `key =` continues that key's value. The probe gives rows `testenv.pytest` = `--timeout 30 {posargs}`, `testenv.pytest-cov` = `>= 2`, `options.requests` = `>= 2.0`, each `epistemic: observed` on the page as "a configuration entry … set to …" [Observed]. Those keys are not set by the file, so these are false Observed claims (VIS-2), and the spec's own sentence "a file outside its grammar is never read past its fault" (spec line 244) does not hold in substance: the published grammar matches the code, but the grammar admits lines the format gives another meaning. A single-word continuation (`    click`) is silently swallowed by `iniKeyOnly`, so the multi-line value is never surfaced as Unknown either.
Repair: treat an indented non-comment line that follows an entry or a key with no value as a continuation: either make the file Unknown `outside-grammar`, or make the preceding entry's value Unknown `value-not-literal` and skip the continuation lines; add tox.ini and setup.cfg fixtures with literal rows; amend the ini sentence of the requirement and the patterns to match.

### F3 — Minor — The yaml subset reads past two malformed shapes with a wrong key path

Evidence: `limits-recognize.ts:248-254`: only keys with no value are pushed as parents, and indentation deeper than the previous scalar entry is not checked. `a: 1\n  max_b: 2` (invalid YAML) yields an Observed top-level row `max_b` = 2; `a: b: c` (invalid: a mapping value in a plain scalar) yields `a` = `b: c` text [Observed by probe]. Both are malformed inputs, so real-file impact is small [Inferred], but each is a read past a fault the spec says never happens.
Repair: make a line indented more deeply than a preceding scalar entry (with no open block scalar or sequence skip) outside the grammar, and make a plain value containing `: ` outside the grammar (or Unknown); add the two fixtures.

### F4 — Minor — "A constant is a definition" also takes keyword arguments and preprocessor-disabled code

Evidence: the Python form (`limits-recognize.ts:63`) matches `    MAX_CONTENT_LENGTH=16 * 1024 * 1024` inside a multi-line call (Flask's `config.update(...)` idiom), giving a `max` row, Observed expression; the C macro form reads `#define MAX_X 5` inside `#if 0 … #endif` [Observed by probe]. The page note (`dossier-cliffs.ts:69`) says a constant is "a definition". The value is what the line writes, so the row is not wildly wrong, but the word is [Inferred].
Repair: either say on the page and in the requirement that the form matches any line of that shape in code (not only module-level definitions, and not evaluating preprocessor conditions), or require the Python form's line to sit at an indentation where no bracket is open (the lexer can report bracket depth) and add both fixtures.

### F5 — Minor — The reconciler fails R5 at this commit until the adoption adds the openspec README row

Evidence: `check_spec_reconciliation.py --check` → R5 `openspec/README.md: 0 rows for tracked change dossier-cliffs, expected 1` [Observed]. The v2.48 sibling's pending commit 2ce92e136 failed the same way and its adoption commit 3e12ae40c added the row [Observed], so this matches the brief's "pending at this commit".
Repair: the adoption commit must add the `openspec/README.md` row together with the `AGENT-ADOPTIONS.md` row and the tag, and rerun `--check` to PASS on the merged head.

### F6 — Minor — No retained evidence for the 390 px fit, the mutation runs or the revert trial

Evidence: `docs/evidence/syzygy-5dhm-116/` holds only scripts (`cliffs_before_after.mts`, `cliffs_build_spec.py`, `cliffs_inverse.py`, `cliffs_patterns_published.mts`, `cliffs_wire_reconciliation.py`) [Observed]; the v2.48 sibling's `docs/evidence/syzygy-5dhm-119/` retains a before-after JSON, mutation records, a reconcile-mutation record and a revert trial [Observed]. The 390 px claim (spec "so the page fits 390 CSS pixels") rests on CSS only; the site-wide 390 px browser test covers no reference page and fails at base anyway [Observed]. Rule 6 (mutate and see each predicate fail) and rule 11 (records naming subject and digest) have no record for this change.
Repair: before adoption, run and retain the before-after output, a per-predicate mutation record with `old`/`new` fragments and the commit, and a revert trial; measure `reference/cliffs.html` at 390 px in Chrome (document width ≤ viewport) on a fixture with long paths and quotes, and record it.

### F7 — Minor — Page wording of the `default` pattern is narrower than the pattern

Evidence: `dossier-cliffs.ts:69` says "or that starts DEFAULT_"; the pattern is `^_*DEFAULT_` (`limits-recognize.ts:61`), which also takes `__DEFAULT_X` [Observed]. The requirement publishes the exact pattern, so this is only the page's prose.
Repair: "or that starts DEFAULT_ after any leading underscores".
