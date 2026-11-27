#!/usr/bin/env python3
"""syzygy-5dhm.45: build REQ-polaris-generation-034 version 2.38 from the effective predecessor's bytes.

Usage: test_names_build_spec.py <predecessor spec.md> <predecessor label> <out>
<predecessor label> is the banner's words for the predecessor, for example 'version 2.32 (A-321)'. The script replaces the title (line 1)
and the banner (the one line starting 'Candidate version '), places three paragraphs immediately after the `computedMaps` paragraph,
six scenarios immediately after the last scenario (the end of the file), and appends one sentence to each of the oracle's Observable, Oracle
and Falsifier lines. Every other byte is the predecessor's; removing these additions and restoring the title and banner recovers it.
Rebuilding over a later predecessor is a re-run.
"""
import pathlib
import sys

prior_path, label, out = pathlib.Path(sys.argv[1]), sys.argv[2], pathlib.Path(sys.argv[3])
prior = prior_path.read_text(encoding='utf-8')

NEW_TITLE = '# Dossier test-name recognizers'
NEW_BANNER = (f'Candidate version 2.38. One MODIFIED requirement, REQ-polaris-generation-034, whose complete text below replaces effective {label}. '
              'It binds through its agent adoption row and the annotated tag `polaris-dossier-test-names-v2.38`. It adds four lexical test-name '
              'recognizers, the render\'s `testNames` member, the reference page `reference/test-names.html` and the machine view\'s `testNames` '
              'member, all in the operator-agent mode; it changes no finding, no gate, no other page of a render without the member, and no '
              'provider-mode byte.')

ANCHOR = '`machine.json` SHALL carry, beside `derivedStructure` and outside `reviewStatus`, a member `computedMaps`'

PARAGRAPHS = [
    # The recognizers.
    'From version 2.38 each render in the operator-agent mode SHALL also derive declared test names: what four versioned recognizers read in '
    'the test files of the pinned tree that the bound screening policy admits, each named by its rule id at version 1. Their candidates are '
    'blob entries named by path alone: for `pytest-test-name`, a basename ending `.py` that begins `test_` or ends `_test.py`; for '
    '`js-test-call`, a basename ending one of `.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, `.tsx`, `.mts` and `.cts` whose stem before that ending '
    'ends `.test` or `.spec` and is longer than it, or which lies under a directory segment `__tests__`; for `go-test-function`, a basename '
    'longer than `_test.go` that ends with it; and for `junit-test-method`, a basename ending `.java` whose stem begins `Test` or ends `Test` '
    'or `Tests`. No path is a candidate of two. Each recognizer reads a body lexically, after replacing every comment and the interior of '
    'every string literal by spaces and keeping every line break, so that a name written inside a comment, a docstring or a string is never a '
    'name: `#` comments and Python string literals with any prefix of r, b, u and f in single, double or triple quotes; `//` and `/* */` '
    'comments, quoted strings, and, for JavaScript and TypeScript, template literals and regular-expression literals, for Go, raw strings in '
    'backquotes, and, for Java, text blocks. A body that ends inside a comment or a string, or in which a line break comes inside a quoted '
    'string that cannot hold one (any but a Python triple-quoted string, a template literal, a Go raw string and a Java text block), is '
    'Unknown `unparsed` with the parse fault `unterminated`. The replacement keeps the offset of every UTF-16 code unit, so a character outside '
    'the Basic Multilingual Plane in a comment or a string moves no later name or line. `pytest-test-name` takes, at any indentation, each `def` or `async def` whose name begins `test` (kind `test`) and each '
    '`class` whose name begins `Test` (kind `suite`); `js-test-call` takes each call of `describe`, `fdescribe`, `xdescribe`, `context` or '
    '`suite` (kind `suite`) or of `it`, `test`, `fit`, `xit` or `specify` (kind `test`), each optionally through any of the modifiers '
    '`only`, `skip`, `todo`, `concurrent`, `fails` and `sequential`, that is no member of another object and whose first argument is a '
    'string literal holding no substitution, no line break and no escape but a backslash before a backslash or a quotation mark, that '
    'literal\'s value being the name; `go-test-function` takes each `func` at the start of a line whose name is `Test` or is `Test` followed '
    'by a character that is not a lower-case letter and whose one parameter is of type `*testing.T`; and `junit-test-method` takes the name '
    'of each method carrying an annotation `Test`, `ParameterizedTest`, `RepeatedTest`, `TestFactory` or `TestTemplate`, simple or '
    'qualified, with or without arguments. A name is what one file declares, never a claim that a test runs, passes or pins a behaviour; no '
    'other part of a test, its body, its assertions or its arguments, is read into the member.',
    # The member.
    'Each candidate takes the disposition, in the order, that the manifest recognizers give theirs, with three differences: a path that rule '
    '`vendored-path` or `generated-path` names is counted in `setApart` and named nowhere, and no candidate is set apart for being a test '
    'path; each recognizer reads and lists at most 250 files; and a name the value checks refuse (empty, longer than 256 characters, holding '
    'a control character, or matched by a secret detector) is left out and counted in its file\'s `valuesLeftOut`. The render SHALL hold the '
    'result as the member `testNames`, of format `polaris-dossier-test-names/1`: `{"format", "state": "derived", "screeningPolicy", '
    '"unitRule": {"rule": "top-level-unit", "ruleVersion": 1}, "recognizers", "units", "unitsNotListed", "names", "namesNotListed"}`, or '
    '`{"format", "state": "unknown", "why"}` where the pinned tree cannot be listed. Each recognizer entry holds the members a manifest '
    'recognizer entry holds, with `names` in place of `facts`, and so does each file entry. Each name is `{"id", "name", "kind", "rule", '
    '"ruleVersion", "path", "line", "unit", "epistemic": "inferred"}`, `line` being the 1-based line of the name in its file under the line '
    'rule that ends a line at CRLF, CR or LF, and `unit` the first segment of its path, or null for a file at the root, as rule '
    '`top-level-unit` places files. The first 2000 names in order of path, line and name, code unit by code unit, are listed with the '
    'identities `_test-name-<k>`, and `namesNotListed` counts the rest. `units` holds one row `{"unit", "files", "names", "byRule"}` for '
    'each unit holding a file read for names, the root first and then the directories in code-unit order, the first 250 listed and '
    '`unitsNotListed` counting the rest: the files read for names there, every name taken there whether listed or not, and those names per '
    'rule. Every name and every entry is labelled Inferred, whatever evidence exists, under the upgrade rule the manifest facts follow; this '
    'version names no record that changes the label. The render derives the member itself, as it derives the manifest facts; check does '
    'not write it, and no reader takes it from a stored record.',
    # The page and the machine view.
    'Where a render holds both the derived structure and the member, it SHALL publish one reference page, `reference/test-names.html`, '
    'titled `Test names`, linked in the reading order and on `contents.html` immediately after the computed maps, and opening with a '
    'legend of its own: the view switch a map page\'s legend carries, and what `Derived by Syzygy` and `Not established.` mean there. Its section `<section id="test-names" data-reading-level="1" '
    'data-topics="">` holds: a note naming the revision, the bound screening policy, the four rules each at version 1, that a rule reads '
    'names alone and skips every comment and string, that a name is never a claim that a test runs or passes, and rule `top-level-unit`; a '
    'coverage line giving, for each recognizer, its candidate files, the files read for names, the files Unknown, the paths left out because '
    'a secret detector matches them, the paths set apart, the names the value checks left out, and its names; under `<h2>Per unit</h2>` a '
    'table with one row per listed unit and the column headers `Unit`, `Files read`, `pytest`, `JavaScript and TypeScript`, `Go`, `JUnit` and '
    '`All names`, the root named `Repository root` and a directory `<dir>/`, whose caption says how many units it lists and how many it '
    'counts and does not list, or, where no file was read for names, the sentence `No test file was read for names, so no unit has a row.`, '
    'followed, where any candidate file is Unknown, by a `Not established.` sentence giving their number and saying that what they declare '
    'is counted in no row, so each count is of the files read and never a total (VIS-2: a file not read is Unknown, never zero names); '
    'under `<h2>Every name, by unit</h2>` each listed name grouped by unit in the table\'s order, in Syzygy\'s words `Test <name>, in <path> '
    'at line <n>.` or `Suite <name>, in <path> at line <n>.`, marked `Derived by Syzygy` and carrying in its DOM text its label Inferred, its '
    'path and line, its rule and version, the revision, and that it is a declared name, never a claim that the test runs or passes; and '
    'under `<h2>Files whose names are Unknown</h2>` each listed Unknown file, opened by `Not established.`, with its reason and the RFC2-24 '
    'reason the manifest maps give that reason. Where the member is `unknown` the section holds only its heading and a `Not established.` sentence saying '
    'that which test names the test files at that revision declare is Unknown at this render because the pinned tree could not be listed. '
    '`machine.json` SHALL carry, outside `reviewStatus`, a member `testNames` holding `"page": "reference/test-names.html"` and the member\'s '
    'own members exactly. A render without the member or the derived structure, and every provider-mode render, publishes no such page, link '
    'or member, so its bytes are those the replaced version renders.',
]

SCENARIO_ANCHOR = '\n\nForm: event-response.\n'  # checked present once; the scenarios no longer go before it
SCENARIOS = '''

#### Scenario: Test names read from code, never from comments or strings

- **WHEN** under declared-source policy 2.0.0 a render's pinned tree holds `test_root.py` declaring `test_at_root`; tests/test_api.py with a comment `# def test_commented():`, a function `test_get` whose docstring holds `def test_doc(): pass`, and a class `TestPost` with a method `test_create`; `web/src/app.test.ts` with a comment `// it('commented')`, a call `describe('app', ...)` holding `it('renders', ...)` and a string holding `it('in a string')`; `cmd/run_test.go` with a commented `func TestCommented(t *testing.T) {}` and `func TestRun(t *testing.T) {}`; and `java/src/FooTest.java` with a commented `@Test void commented()` and `@Test void works()`
- **THEN** the member lists eight names in order: `TestRun` (unit `cmd`), `works` (`java`), `test_at_root` (unit null), `test_get`, `TestPost` as a suite and `test_create` (`tests`), and `app` as a suite and `renders` (`web`), each Inferred with its path and line
- **AND** no name, member or page of the render holds `test_commented`, `test_doc`, `commented`, `in a string` or `TestCommented`

#### Scenario: Test files left out, set apart or Unknown

- **WHEN** a tree holds a pytest candidate under a directory a secret detector matches, one under `vendor/`, a JavaScript candidate under `dist/`, a symbolic link tests/test_link.py, tests/test_open.py whose body ends inside a triple-quoted string, tests/test_refused.py whose read the reader refuses, tests/test_bytes.py that is not UTF-8 text and tests/test_secret.py whose body a secret detector matches
- **THEN** `pytest-test-name` counts 7 candidates, 1 left out for its secret path, 1 set apart, none read for names and 5 Unknown, listed as `not-utf8-text`, `unparsed` with `unterminated`, `object-read-refused`, `secret-detector-match` and `symbolic-link`; `js-test-call` sets 1 apart
- **AND** the member names no unit, and neither the secret-matching directory, `vendor`, `dist/` nor any name from the excluded bodies

#### Scenario: Test names the value checks refuse

- **WHEN** a JavaScript test file calls `it` with a name of 257 characters, with an empty name and with `kept`
- **THEN** its file entry is Inferred with `names` 1 and `valuesLeftOut` 2, and only `kept` is listed

#### Scenario: Test-names page rendered

- **WHEN** a render holds the derived structure and a member whose units are the root, `tests` and `web`, one name of which is `renders <b>`, and one Unknown file tests/test_open.py (`unparsed`, `unterminated`)
- **THEN** `reference/test-names.html` holds the per-unit table with the row `Repository root`, its files read and its names per rule, each name entry `Test <name>, in <path> at line <n>.` with `Derived by Syzygy` and its evidence, the name shown as `renders &lt;b&gt;`, and the Unknown file's item opened by `Not established.` with `data-unknown-reason="mapping-coverage-absent"`
- **AND** `contents.html` links the page and `machine.json`'s `testNames` holds its page and the member's names, and the page holds no script

#### Scenario: Test names Unknown when the tree is not listed

- **WHEN** the pinned tree cannot be listed at a render
- **THEN** the member is `{"format", "state": "unknown", "why"}` and the page's section holds only its `Not established.` sentence naming the revision

#### Scenario: No test-names page without the member

- **WHEN** a render holds no `testNames` member, or holds one and no derived structure, or is a provider-mode render
- **THEN** it publishes no `reference/test-names.html`, no link to it and no `testNames` member, and its bytes are those the replaced version renders; the provider golden's bytes are unchanged'''

OBSERVABLE_ADD = ' For the test-name recognizers, record the render\'s `testNames` member, `reference/test-names.html` and `machine.json`\'s `testNames`.'
ORACLE_ADD = ' For the test-name recognizers, fix each fixture\'s expected names, lines, units and file dispositions as literals written from the fixture text, outside the recognizer code.'
FALSIFIER_ADD = (' For the test-name recognizers: a name inside a comment, a docstring or a string is listed; a vendored, generated or secret-matching '
                 'path is named or read; a body the screen excludes yields a name; a name is labelled other than Inferred; or a render without the '
                 'member changes a byte.')


def once(text: str, old: str, new: str) -> str:
    assert text.count(old) == 1, old[:80]
    return text.replace(old, new)


def line_end(text: str, prefix: str, add: str) -> str:
    lines = text.split('\n')
    hits = [i for i, line in enumerate(lines) if line.startswith(prefix)]
    assert len(hits) == 1, prefix
    lines[hits[0]] += add
    return '\n'.join(lines)


lines = prior.split('\n')
assert lines[0].startswith('# '), 'predecessor title'
lines[0] = NEW_TITLE
banners = [i for i, line in enumerate(lines) if line.startswith('Candidate version ')]
assert len(banners) == 1, 'predecessor banner'
lines[banners[0]] = NEW_BANNER
at = [i for i, line in enumerate(lines) if line.startswith(ANCHOR)]
assert len(at) == 1, 'computedMaps anchor'
for k, paragraph in enumerate(PARAGRAPHS):
    lines[at[0] + 1 + 2 * k:at[0] + 1 + 2 * k] = ['', paragraph]
spec = '\n'.join(lines)
# The six scenarios go after the last one, at the end of the file, as each version since 2.35 places its own.
assert spec.endswith('\n') and not spec.endswith('\n\n') and spec.count(SCENARIO_ANCHOR) == 1, 'predecessor end'
assert spec.rindex('\n#### Scenario: ') > spec.index(SCENARIO_ANCHOR), 'last scenario after the form line'
spec = spec[:-1] + SCENARIOS + '\n'
spec = line_end(spec, '- **Observable:**', OBSERVABLE_ADD)
spec = line_end(spec, '- **Oracle:**', ORACLE_ADD)
spec = line_end(spec, '- **Falsifier:**', FALSIFIER_ADD)
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(spec, encoding='utf-8')
print(f'wrote {out}: {len(spec.encode())} bytes')
