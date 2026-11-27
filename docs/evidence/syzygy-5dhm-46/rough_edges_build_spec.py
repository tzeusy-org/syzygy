#!/usr/bin/env python3
"""syzygy-5dhm.46: build REQ-polaris-generation-034 version VERSION (rough-edge markers) from the effective predecessor's bytes.

Usage: rough_edges_build_spec.py <predecessor spec.md> <predecessor label> <out>
<predecessor label> is the banner's words for the predecessor, for example 'version 2.42 (the test-name recognizers, A-337)'. The script
replaces the title (line 1) and the banner (the one line starting 'Candidate version '), places three paragraphs immediately after the
test-names page paragraph, seven scenarios immediately after the last scenario (the end of the file), and appends one sentence to each of
the oracle's Observable, Oracle and Falsifier lines. Every other byte is the predecessor's; removing these additions and restoring the title
and banner recovers it. Rebuilding as another version is a re-run with VERSION changed.
"""
import pathlib
import sys

VERSION = '2.43'
TAG = f'polaris-dossier-rough-edges-v{VERSION}'

NEW_TITLE = '# Dossier rough-edge markers'
ANCHOR = 'Where a render holds both the derived structure and the member, it SHALL publish one reference page, `reference/test-names.html`'

W = 'A-Za-z0-9_'
PARAGRAPHS = [
    # The recognizer.
    f'From version {VERSION} each render in the operator-agent mode SHALL also derive rough-edge markers: what recognizer '
    '`rough-edge-marker` version 1 reads in the source files of the pinned tree that the bound screening policy admits. Its candidates are '
    'blob entries named by path alone: a basename longer than its extension that ends `.py` (read as Python), one of `.js`, `.jsx`, `.mjs`, '
    '`.cjs`, `.ts`, `.tsx`, `.mts` and `.cts` (read as JavaScript and TypeScript), `.go` (read as Go) or `.java` (read as Java). Each body '
    'is read through the lexer the test-name recognizers read through, which finds every comment (`#` in Python; `//` and `/* */` in the '
    'others) and every string literal of the language, and replaces each comment and each string interior by spaces in the code text; a '
    'regular-expression literal is blanked and is no comment. A body that ends inside a comment or a string, or in which a line break comes '
    'inside a quoted string that cannot hold one, is Unknown `unparsed` with the parse fault `unterminated`. In the content of each comment, '
    'between its delimiters, the recognizer matches these ECMAScript regular expressions, case-sensitive and global: kind `todo`, '
    f'`(?<![{W}])TODO(?![{W}])`; kind `fixme`, `(?<![{W}])FIXME(?![{W}])`; kind `hack`, `(?<![{W}])HACK(?![{W}])`; kind `deprecation`, '
    f'`(?<![{W}@])@deprecated(?![{W}])|(?<![{W}])DEPRECATED(?![{W}])|(?<![{W}@])Deprecated:`; and kind `issue-reference`, five patterns '
    'in this order, a match that overlaps one an earlier pattern took in the same comment being dropped: '
    '`https?://(?:www\\.)?github\\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/(?:issues|pull)/[0-9]+(?![0-9])`, '
    '`https?://gitlab\\.com/[A-Za-z0-9_./-]+?/-/(?:issues|merge_requests)/[0-9]+(?![0-9])`, '
    '`(?<![A-Za-z0-9_./-])[A-Za-z0-9][A-Za-z0-9_.-]*/[A-Za-z0-9_.-]+#[0-9]{1,7}(?![A-Za-z0-9_])`, '
    '`(?<![A-Za-z0-9_])GH-[0-9]{1,7}(?![A-Za-z0-9_])` and `(?<![A-Za-z0-9_&#/.-])#[0-9]{1,7}(?![A-Za-z0-9_])`. In the code text alone, so '
    'never in a comment or a string, it matches kind `deprecation` in Java by `(?<![A-Za-z0-9_$.@])@Deprecated(?![A-Za-z0-9_$])` and in '
    f'Python by `(?<![{W}])(?:Pending)?DeprecationWarning(?![{W}])`. No marker is read in a string, so a Python docstring holds none. Each '
    'match is one marker: its kind, its matched text `marker`, its 1-based line under the line rule that ends a line at CRLF, CR or LF, and '
    '`quote`, that line without its terminator and without its leading and trailing spaces and tabs. A marker states only that the file '
    'writes that line: what the marker means is not read, and what an issue reference names lies outside the clone, so it is Unknown, and '
    'nothing is fetched or resolved. A pattern can match a token that is no issue reference (a colour written `#767676`, say); the marker '
    'still states only that the line holds that token.',
    # The member.
    'Each candidate takes the disposition, in the order, that the test-name recognizers give theirs, with two differences: the recognizer '
    'reads and lists at most 1000 files, and a marker whose quote the value checks refuse (empty, longer than 256 characters, holding a '
    'control character, a tab among them, or matched by a secret detector) is left out and counted in its file\'s `valuesLeftOut`. The '
    'render SHALL hold the result as the member `roughEdges`, of format `polaris-dossier-rough-edges/1`: `{"format", "state": "derived", '
    '"screeningPolicy", "unitRule": {"rule": "top-level-unit", "ruleVersion": 1}, "recognizer", "units", "unitsNotListed", "markers", '
    '"markersNotListed"}`, or `{"format", "state": "unknown", "why"}` where the pinned tree cannot be listed. `recognizer` holds the members '
    'a test-name recognizer entry holds, with `"label": "observed"`, `observed` in place of `inferred` and `markers` in place of `names`, '
    'and so does each of its file entries, whose `epistemic` is `observed` or `unknown`. Each marker is `{"id", "kind", "marker", "path", '
    '"line", "unit", "blob", "quote", "epistemic": "observed", "referenceContent"}`, `blob` being the object id of the blob read, `unit` the '
    'first segment of its path, or null for a file at the root, as rule `top-level-unit` places files, and `referenceContent` `"unknown"` '
    'for an issue reference and null for every other kind. The first 2000 markers in order of path, code unit by code unit, then line, then '
    'position in the file are listed with the identities `_marker-<k>`, and `markersNotListed` counts the rest. `units` holds one row '
    '`{"unit", "files", "markers", "byKind"}` for each unit holding a file read for markers, the root first and then the directories in '
    'code-unit order, the first 250 listed and `unitsNotListed` counting the rest: the files read for markers there, every marker taken '
    'there whether listed or not, and those markers under each of the five kinds. Every marker and every read file entry is labelled '
    'Observed: the blob at that path and revision holds that line. The render derives the member itself, as it derives the test names; '
    'check does not write it, and no reader takes it from a stored record.',
    # The page and the machine view.
    'Where a render holds both the derived structure and the member, it SHALL publish one reference page, `reference/rough-edges.html`, '
    'titled `Rough edges`, linked in the reading order and on `contents.html` immediately after the test-names page where that is '
    'published and otherwise immediately after the computed maps, and opening with a legend of its own: the view switch a map page\'s '
    'legend carries, and what `Derived by Syzygy` and `Not established.` mean there. Its section `<section id="rough-edges" '
    'data-reading-level="1" data-topics="">` holds: a note naming the revision, the bound screening policy, the five languages, the rule and '
    'its version, where each kind is read, that nothing is read inside a string, that each line is quoted from the file, that a marker '
    'never says the code is broken, that what an issue reference names is Unknown and nothing is fetched, and rule `top-level-unit`; a '
    'coverage line giving the candidate files, the files read for markers, the files Unknown, the paths left out because a secret detector '
    'matches them, the paths set apart, the markers the value checks left out, and the markers; under `<h2>Per unit</h2>` a table with one '
    'row per listed unit and the column headers `Unit`, `Files read`, `TODO`, `FIXME`, `HACK`, `Deprecation`, `Issue references` and '
    '`All markers`, the root named `Repository root` and a directory `<dir>/`, whose caption says how many units it lists and how many it '
    'counts and does not list, or, where no file was read for markers, the sentence `No source file was read for markers, so no unit has a '
    'row.`, followed, where any candidate file is Unknown, by a `Not established.` sentence giving their number and saying that what they '
    'write is counted in no row, so each count is of the files read and never a total (VIS-2); under `<h2>What is going away</h2>` each '
    'listed deprecation marker, and under `<h2>Every other marker, by unit</h2>` each other listed marker, both grouped by unit in the '
    'table\'s order, in Syzygy\'s words `<marker>, in <path> at line <n>:` for TODO, FIXME and HACK, `Deprecation marker <marker>, in '
    '<path> at line <n>:` and `Issue reference <marker>, in <path> at line <n>:`, followed by the quote in a `<q>` element, marked `Derived '
    'by Syzygy` and carrying in its DOM text its label Observed, its path, line and blob, the rule and version and the revision, an issue '
    'reference adding a `Not established.` statement, marked `data-epistemic="unknown"` with RFC2-24 reason '
    '`source-uncaptured-or-unreachable`, that what it names is Unknown because it lies outside the clone and Syzygy fetched nothing; no '
    'quote or reference is a link; and under `<h2>Files whose markers are Unknown</h2>` each listed Unknown file, opened by `Not '
    'established.`, with its reason and the RFC2-24 reason the test-names page gives that reason. Where the member is `unknown` the section '
    'holds only its heading and a `Not established.` sentence saying that which markers the source files at that revision write is Unknown '
    'at this render because the pinned tree could not be listed. `machine.json` SHALL carry, outside `reviewStatus`, a member `roughEdges` '
    'holding `"page": "reference/rough-edges.html"` and the member\'s own members exactly. A render without the member or the derived '
    'structure, and every provider-mode render, publishes no such page, link or member, so its bytes are those the replaced version renders.',
]

SCENARIO_ANCHOR = '\n\nForm: event-response.\n'
SCENARIOS = '''

#### Scenario: Rough-edge markers read in comments, never in strings

- **WHEN** under declared-source policy 2.0.0 a render's pinned tree holds `setup.py` whose first line is `# TODO: pin versions`; `pkg/core.py` whose function's docstring holds `FIXME` and whose fifth line is `warnings.warn("old", DeprecationWarning)  # see #41`; `web/src/app.ts` with the first line `// HACK: around #7`, a string holding `TODO in a string` and the third line `/** @deprecated use g */`; `cmd/main.go` with the second line `// Deprecated: use run2` and the fourth `// FIXME GH-9`; `java/A.java` whose second line is `@Deprecated void f() {}`; `web/src/clean.ts` with no marker; and `README.md` holding `# TODO`
- **THEN** the recognizer counts 6 candidates, 6 read for markers and 10 markers, and the member lists them in order: `Deprecated:`, `FIXME` and `GH-9` (unit `cmd`), `@Deprecated` (`java`), `DeprecationWarning` and `#41` (`pkg`), `TODO` (unit null), and `HACK`, `#7` and `@deprecated` (`web`), each Observed with its line and quote, each issue reference with `referenceContent` `unknown`
- **AND** the unit rows are the root with 1 file and 1 `todo`, `cmd` with 3, `java` with 1, `pkg` with 2 and `web` with 2 files and 3 markers, and no marker or member holds the docstring's line, `TODO in a string` or `README.md`

#### Scenario: Issue-reference look-alikes left out

- **WHEN** Python comments hold `#123`, `GH-45`, `owner/repo#7`, `https://github.com/o/r/issues/9`, `https://github.com/o/r/pull/10` and `https://gitlab.com/g/sub/p/-/issues/3`, and `a#1`, `&#38;`, `##2`, `#12a`, `path/#3` and `#12345678`
- **THEN** exactly the first six are markers of kind `issue-reference`, each once, and none of the second six is a marker

#### Scenario: Source files left out, set apart or Unknown

- **WHEN** a tree holds a Python file under a directory a secret detector matches, one under `vendor/`, a JavaScript file under `dist/`, a symbolic link src/link.py, src/open.py whose body ends inside a triple-quoted string, src/refused.py whose read the reader refuses, src/bytes.py that is not UTF-8 text and src/secret.py whose body a secret detector matches
- **THEN** the recognizer counts 8 candidates, 1 left out for its secret path, 2 set apart, none read for markers and 5 Unknown, listed as `not-utf8-text`, `unparsed` with `unterminated`, `object-read-refused`, `secret-detector-match` and `symbolic-link`
- **AND** the member names no unit, and neither the secret-matching directory, `vendor`, `dist/` nor any line from the excluded bodies

#### Scenario: Marker lines the value checks refuse

- **WHEN** a JavaScript file's comments hold `TODO` on a line of more than 256 characters, `FIXME` on a line holding a tab between two words, and `HACK kept`
- **THEN** its file entry is Observed with `markers` 1 and `valuesLeftOut` 2, only the `HACK` marker is listed, and the root's row counts 1 `hack`

#### Scenario: Rough-edges page rendered

- **WHEN** a render holds the derived structure and a member whose units are the root and `web`, whose markers are a `TODO` quoted `# TODO: pin <versions>`, a `HACK` and an issue reference `#7` on one line, and an `@deprecated`, and whose one Unknown file is web/open.ts (`unparsed`, `unterminated`)
- **THEN** `reference/rough-edges.html` holds the per-unit table with the row `Repository root`, the deprecation marker under `What is going away` and the others under `Every other marker, by unit`, each with `Derived by Syzygy`, its evidence and its quote shown as `# TODO: pin &lt;versions&gt;`, the issue reference with its `Not established.` statement and `data-unknown-reason="source-uncaptured-or-unreachable"`, and the Unknown file's item opened by `Not established.` with `data-unknown-reason="mapping-coverage-absent"`
- **AND** `contents.html` links the page, `machine.json`'s `roughEdges` holds its page and the member's markers, and the page holds no script and no link to an issue

#### Scenario: Rough edges Unknown when the tree is not listed

- **WHEN** the pinned tree cannot be listed at a render
- **THEN** the member is `{"format", "state": "unknown", "why"}` and the page's section holds only its `Not established.` sentence naming the revision

#### Scenario: No rough-edges page without the member

- **WHEN** a render holds no `roughEdges` member, or holds one and no derived structure, or is a provider-mode render
- **THEN** it publishes no `reference/rough-edges.html`, no link to it and no `roughEdges` member, and its bytes are those the replaced version renders; the provider golden's bytes are unchanged'''

OBSERVABLE_ADD = ' For the rough-edge markers, record the render\'s `roughEdges` member, `reference/rough-edges.html` and `machine.json`\'s `roughEdges`.'
ORACLE_ADD = ' For the rough-edge markers, fix each fixture\'s expected markers, lines, quotes, units, per-kind counts and file dispositions as literals written from the fixture text, outside the recognizer code.'
FALSIFIER_ADD = (' For the rough-edge markers: a marker inside a string is listed; a look-alike the patterns exclude is a marker; a vendored, generated or '
                 'secret-matching path is named or read; a body the screen excludes yields a marker; a unit count differs from the markers read '
                 'there; an issue reference is fetched, linked or given content; or a render without the member changes a byte.')


def banner(label: str) -> str:
    return (f'Candidate version {VERSION}. One MODIFIED requirement, REQ-polaris-generation-034, whose complete text below replaces effective '
            f'{label}. It binds through its agent adoption row and the annotated tag `{TAG}`. It adds recognizer `rough-edge-marker` version 1, '
            'the render\'s `roughEdges` member, the reference page `reference/rough-edges.html` and the machine view\'s `roughEdges` member, '
            'all in the operator-agent mode; it changes no finding, no gate, no other page of a render without the member, and no '
            'provider-mode byte.')


def once(text: str, old: str, new: str) -> str:
    assert text.count(old) == 1, old[:80]
    return text.replace(old, new)


def line_end(text: str, prefix: str, add: str) -> str:
    lines = text.split('\n')
    hits = [i for i, line in enumerate(lines) if line.startswith(prefix)]
    assert len(hits) == 1, prefix
    lines[hits[0]] += add
    return '\n'.join(lines)


def build(prior: str, label: str) -> str:
    lines = prior.split('\n')
    assert lines[0].startswith('# '), 'predecessor title'
    lines[0] = NEW_TITLE
    banners = [i for i, line in enumerate(lines) if line.startswith('Candidate version ')]
    assert len(banners) == 1, 'predecessor banner'
    lines[banners[0]] = banner(label)
    at = [i for i, line in enumerate(lines) if line.startswith(ANCHOR)]
    assert len(at) == 1, 'test-names page anchor'
    for k, paragraph in enumerate(PARAGRAPHS):
        lines[at[0] + 1 + 2 * k:at[0] + 1 + 2 * k] = ['', paragraph]
    spec = '\n'.join(lines)
    assert spec.endswith('\n') and not spec.endswith('\n\n') and spec.count(SCENARIO_ANCHOR) == 1, 'predecessor end'
    assert spec.rindex('\n#### Scenario: ') > spec.index(SCENARIO_ANCHOR), 'last scenario after the form line'
    spec = spec[:-1] + SCENARIOS + '\n'
    spec = line_end(spec, '- **Observable:**', OBSERVABLE_ADD)
    spec = line_end(spec, '- **Oracle:**', ORACLE_ADD)
    spec = line_end(spec, '- **Falsifier:**', FALSIFIER_ADD)
    return spec


if __name__ == '__main__':
    prior_path, label, out = pathlib.Path(sys.argv[1]), sys.argv[2], pathlib.Path(sys.argv[3])
    spec = build(prior_path.read_text(encoding='utf-8'), label)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(spec, encoding='utf-8')
    print(f'wrote {out}: {len(spec.encode())} bytes')
