#!/usr/bin/env python3
"""syzygy-5dhm.119: build REQ-polaris-generation-034 version VERSION (docs and code) from the effective predecessor's bytes.

Usage: docs_and_code_build_spec.py <predecessor spec.md> <predecessor label> <out>
<predecessor label> is the banner's words for the predecessor, for example 'version 2.44 (the rough-edge markers, syzygy-5dhm.46, A-338)'.
The script replaces the title (line 1) and the banner (the one line starting 'Candidate version '), places three paragraphs immediately
after the rough-edges page paragraph, eight scenarios immediately after the last scenario (the end of the file), and appends one sentence to
each of the oracle's Observable, Oracle and Falsifier lines. Every other byte is the predecessor's; removing these additions and restoring
the title and banner recovers it. Rebuilding as another version is a re-run with VERSION changed. Its functions are the rough-edge markers'
builder's (docs/evidence/syzygy-5dhm-46/rough_edges_build_spec.py), unchanged.
"""
import pathlib
import sys

VERSION = '2.48'
TAG = f'polaris-dossier-docs-and-code-v{VERSION}'

NEW_TITLE = '# Dossier docs and code'
ANCHOR = 'Where a render holds both the derived structure and the member, it SHALL publish one reference page, `reference/rough-edges.html`'

PARAGRAPHS = [
    # The recognizer.
    f'From version {VERSION} each render in the operator-agent mode SHALL also resolve the paths and identifiers its documents name: what '
    'recognizer `doc-reference` version 1 reads in the Markdown documents of the pinned tree that the bound screening policy admits, each '
    'resolved against that tree. Its documents are blob entries whose basename, compared without case, is longer than and ends `.md` or '
    '`.markdown`. Code contexts are read by the PWB-REQ-006 profile\'s recognizer (`recognizeCodeContexts`), never by the mask, and a body '
    'it reports malformed is Unknown `unparsed` with the malformation as its parse fault. Two places are read and nothing else: the content '
    'of each inline code span (the recognizer\'s span ranges, which lie outside every fence, less the delimiter runs, one space stripped from '
    'each end where both ends hold one and the content is not all spaces), and the destination of each inline link or image matched by '
    '`!?\\[[^\\]\\r\\n]*\\]\\(([^()\\s<>]+)(?:[ \\t]+(?:"[^"\\r\\n]*"|\'[^\'\\r\\n]*\'))?\\)` whose opening bracket lies in no fence and no '
    'span and whose destination lies in no span. A span holding a line break is not read. A span is a path when, after '
    'the line suffix `:[0-9]+(?:-[0-9]+)?$` is removed, it matches `^[A-Za-z0-9_@+.-]+(?:/[A-Za-z0-9_@+.-]+)*/?$` with `.` and `..` segments only as a '
    'leading run, and either it holds a `/` before its last character, or it is one segment matching '
    '`^(?:[^.].*\\.([A-Za-z0-9]+)|\\.[A-Za-z0-9_][A-Za-z0-9_.-]*)$` that captures no extension (a dotfile) or whose captured extension, '
    'compared without case, is one of `c`, `h`, `cc`, `cpp`, `cxx`, `hpp`, `hh`, `md`, `markdown`, `txt`, `rst`, `conf`, `cfg`, `ini`, '
    '`json`, `yaml`, `yml`, `toml`, `xml`, `py`, `pyi`, `tcl`, `mjs`, `cjs`, `mts`, `cts`, `tsx`, `jsx`, `rs`, `go`, `java`, `kt`, `rb`, '
    '`php`, `sh`, `bash`, `lua`, `mk`, `cmake`, `html`, `css`, `scss`, `sql`, `proto`, `lock`, `gradle`, `swift`, `cs`, `env`, or the weak '
    '`js`, `ts` and `in`, or it is one segment ending `/`. A span that is no path is an identifier when it matches '
    '`^[A-Za-z_$][A-Za-z0-9_$]*(?:(?:\\.|::)[A-Za-z_$][A-Za-z0-9_$]*)*(?:\\(\\))?$`, matches `[_$]|[a-z0-9][A-Z]|\\.|::|\\(\\)$`, and its '
    'last name, after `()` is removed and the text is split at `.` and `::`, is at least two characters long and holds a letter or digit; '
    'any other span is counted in `spansNotChecked`. HTML comments and indented code blocks are no code context to that recognizer, so '
    'spans and links in them are read as prose. A link matched where the two characters after it are `](` (a link around an image) is '
    'read, and the outer destination is counted in `linksNotChecked` and not read. A destination is counted in `linksNotChecked` and not read where it begins with a '
    'scheme `^[A-Za-z][A-Za-z0-9+.-]*:` or `/`, where nothing is left of it before its first `#` or `?`, or where that part does not '
    'percent-decode or decodes to a control character. A path resolves against the tree that lists every blob whose path and every '
    'directory prefix no secret detector matches (a symbolic link as a file), every directory holding one, and every directory holding a '
    'submodule entry no secret detector matches, case-sensitively: a link and a span starting `./` or '
    '`../` from the document\'s directory alone; any other span first at its path from the repository root and then from the document\'s '
    'directory, and then where a listed file, or a listed directory, has a path that is the span\'s path or ends with `/` and it, the first '
    'in the order of the sorted file paths (so a bare name resolves by a file name). A path ending `/` resolves only to a directory. A path '
    'whose `..` climbs above the root is Unknown `outside-tree`; one at or under a submodule entry is Unknown `submodule`; one that resolves '
    'nowhere is Unknown `symbolic-link` where it, or a path it lies under, is a symbolic link (by its paths or, for a span, by a listed '
    'link whose path ends with `/` and that prefix of its text, or is it), Unknown `submodule` where a prefix of a span\'s text is in the '
    'same way a submodule entry, Unknown `ambiguous-form` where it is a bare name with a weak extension or a span with a `/` that neither ends `/`, starts '
    '`./` or `../` nor has an extension on its last segment (by the same expression), Unknown `build-output-path` where rule `vendored-path` or `generated-path` names '
    'it, and otherwise `document-only`. An identifier resolves when its last name occurs, as a token matched by '
    '`(?<![A-Za-z0-9_$])[A-Za-z_$][A-Za-z0-9_$]*`, in a code file read: a blob whose language by rule `language-by-extension` is in its '
    'table and is none of Markdown, reStructuredText, AsciiDoc, Plain text, JSON, YAML, TOML, XML and INI, read in the code text the '
    'test-name lexer leaves (comments and string interiors blank) for the five languages it reads and in its whole text otherwise, the '
    'first such file in path order and its first such line naming it, `searched` `code-text` or `file-text`; where no code text holds it, '
    'in the whole text of a file the lexer read, the first such file and line, `searched` `comment-or-string`; where no code file read holds it, it is `document-only` only when '
    'no code file was left out for a secret path and none is Unknown, and Unknown `code-not-fully-read` otherwise. Code files are read '
    'only where some row is an identifier. Each row\'s `quote` is its line without its terminator and its leading and trailing spaces and '
    'tabs (on line 1 without a byte-order mark), or, where that is longer than 256 characters, the exact 256-code-unit excerpt of it that '
    'starts 64 code units before the reading or ends at the line\'s end, whichever starts earlier, moved one unit inward where it would split '
    'a surrogate pair, with `quoteExcerpt` true. A row states what the tree holds, never that a document is wrong, and compares no stated '
    'value: no row is `agrees` or `disagrees`, existence is never reported as agreement, and code that no document names is not listed at '
    'this version.',
    # The member.
    'Documents and code files each take the disposition, in the order, that the rough-edge markers give their candidates: a path a '
    'secret detector matches, or any of whose directory prefixes it matches, is counted in `secretPathsLeftOut` and named nowhere; a '
    'vendored or generated path is counted in `setApart` and named nowhere and, for code, not searched; every other candidate is named, '
    'and Unknown and never read where its path is not citable, it is a symbolic link, the screen\'s path outcome excludes it, the class '
    'gate withholds its class, or it is past the read limit of 1000 documents or 1000 code files; each remaining body is read alone through '
    'the reader bound at 1 MiB and screened whole, and only a body the screen admits whole is read. A row whose value or quote the value '
    'checks refuse (empty, longer than 256 characters, holding a control character, a tab among them, or matched by a secret detector), or '
    'whose path, tried path or tail a secret detector matches (a link\'s tried path decoded), or whose tried path or tail names a directory '
    'that holds only paths a secret detector matches, or a file at such a path, and is no listed directory or file, is left out and counted in its document\'s `valuesLeftOut`. The render SHALL '
    'hold the result as the member `docsAndCode`, of format `polaris-dossier-docs-and-code/1`: `{"format", "state": "derived", '
    '"screeningPolicy", "rule": {"rule": "doc-reference", "ruleVersion": 1}, "documents", "code", "counts", "rows", "rowsNotListed"}`, or '
    '`{"format", "state": "unknown", "why"}` where the pinned tree cannot be listed. `documents` is `{"candidates", "secretPathsLeftOut", '
    '"setApart", "observed", "unknown", "files", "filesNotListed", "spansNotChecked", "linksNotChecked", "valuesLeftOut"}`, its `files` the '
    'documents read and then the Unknown ones, the first 1000 listed, each `{"path", "epistemic", "unknownReason", "parseFault", '
    '"resolves", "documentOnly", "unknown", "valuesLeftOut"}`, the four counts null for an Unknown entry. `code` holds the same counts with '
    '`"read"`, false where no row is an identifier, and lists only its Unknown entries, the first 250. `counts` is `{"resolves", '
    '"documentOnly", "unknown"}` over every row. Each row is `{"id", "document", "line", "quote", "quoteExcerpt", "written", "value", '
    '"form", "outcome", "epistemic", "unknownReason", "resolution"}`: `written` `code-span` or `link`, `form` `path` or `identifier`, '
    '`outcome` `resolves`, `document-only` or `unknown`, `epistemic` `observed` for the first two and `unknown` for the third, and '
    '`resolution` `{"entry": "file" | "directory", "path"}` for a path that resolves, `{"entry": "identifier", "path", "line", "blob", '
    '"searched": "code-text" | "comment-or-string" | "file-text"}` for an identifier that resolves, and null otherwise. The first 2000 rows in order of document, '
    'code unit by code unit, then position are listed with the identities `_docref-<k>`, and `rowsNotListed` counts the rest. A row that '
    'resolves or is document-only is Observed: the tree listing, or the code files read, hold or lack that name. The render derives the '
    'member itself, as it derives the rough-edge markers; check does not write it, and no reader takes it from a stored record.',
    # The page and the machine view.
    'Where a render holds both the derived structure and the member, it SHALL publish one reference page, `reference/docs-and-code.html`, '
    'titled `Docs and code`, linked in the reading order and on `contents.html` as the last of the items after the Sources page: after the '
    'computed maps, the test-names page and the rough-edges page where those are published, and opening with a legend of its own: the view '
    'switch a map page\'s legend carries, and what `Derived by Syzygy` and `Not established.` mean there. Its section `<section '
    'id="docs-and-code" data-reading-level="1" data-topics="">` holds: a note naming the revision, the bound screening policy, the rule '
    'and its version, the two places read, the path and identifier forms, how each resolves, and that a row says what the tree holds and '
    'never that a document is wrong, that no stated value is compared so no row agrees or disagrees, and that code no document names is not '
    'listed; a coverage line giving each count of `documents` and of `code` (or, where no row is an identifier, that no code file was read); '
    'a table captioned `Rows by class` with the rows `Resolves`, `Document only` and `Unknown` and their counts; under `<h2>Per document</h2>` '
    'a table with one row per document read and the column headers `Document`, `Resolves`, `Document only` and `Unknown`, or the sentence '
    '`No document was read, so no document has a row.`, followed, where any document is Unknown or left out for its secret path, by a '
    '`Not established.` sentence giving their number and saying that what they name is in no row, so each count is of the documents read '
    'and never a total (VIS-2); then under `<h2>Document only</h2>`, `<h2>Unknown</h2>` and `<h2>Resolves</h2>` each listed row of that '
    'outcome, grouped by document, in Syzygy\'s words `Path <value>, a code span in <document> at line <n>:` (or `Identifier`, or `a link`) '
    'followed by the quote in a `<q>` element and, for an excerpt, `(an exact excerpt of the line)`; a row that resolves or is document-only '
    'then says `Resolves.` or `Document only.`, is marked `Derived by Syzygy` and carries in its DOM text its label Observed, what the tree '
    'holds (the file or directory listed, the file, line and blob where the identifier token occurs and whether the code text or the file '
    'text was searched, or that nothing is listed or held), the rule and version and the revision; an Unknown row is marked '
    '`data-epistemic="unknown"` with an RFC2-24 reason (`mapping-coverage-absent` for `ambiguous-form` and `code-not-fully-read`, '
    '`source-uncaptured-or-unreachable` for `outside-tree`, `submodule` and `build-output-path`) and says `Not established.` and why in '
    'words; no value or quote is a link; and under `<h2>Files not read</h2>` each listed Unknown document and code file, opened by `Not '
    'established.`, with its reason and the RFC2-24 reason the rough-edges page gives that reason. Each list of rows and files wraps '
    'anywhere, so the page fits 390 CSS pixels. Where the member is `unknown` the section holds only its heading and a `Not established.` '
    'sentence saying that which paths and identifiers the documents at that revision name, and what the tree holds of them, is Unknown at '
    'this render because the pinned tree could not be listed. `machine.json` SHALL carry, outside `reviewStatus`, a member `docsAndCode` '
    'holding `"page": "reference/docs-and-code.html"` and the member\'s own members exactly. A render without the member or the derived '
    'structure, and every provider-mode render, publishes no such page, link or member, so its bytes are those the replaced version renders.',
]

SCENARIO_ANCHOR = '\n\nForm: event-response.\n'
SCENARIOS = '''

#### Scenario: Documented paths and identifiers resolved against the tree

- **WHEN** under declared-source policy 2.0.0, for a run whose statement lists project-documentation and code-content, a render's pinned tree holds `README.md` whose first line names the code spans src/app.py and src/gone.py and links docs/guide.md, and whose second line names `runApp()` and `missingThing`; docs/guide.md linking ../README.md and naming `lib/`, `Node.js` and `dist/out.js` and, inside a fence, src/fenced.py; src/app.py defining `runApp` on its first line; `src/util.ts`, which never writes `missingThing`; and `pyproject.toml`, which does
- **THEN** the member lists nine rows in order: src/app.py resolves to that file, src/gone.py is document-only, the link resolves to docs/guide.md, `runApp()` resolves to src/app.py line 1 searched in the code text, `missingThing` is document-only, ../README.md resolves to `README.md`, `lib/` is document-only, `Node.js` is Unknown `ambiguous-form` and `dist/out.js` is Unknown `build-output-path`
- **AND** the counts are 4 resolves, 3 document-only and 2 Unknown, 2 code files were searched, and no row holds src/fenced.py

#### Scenario: An identifier absent while a code file is unread stays Unknown

- **WHEN** the same tree also holds src/broken.py, whose body ends inside a triple-quoted string, and a Go file under a directory a secret detector matches
- **THEN** `runApp()` still resolves, `missingThing` is Unknown `code-not-fully-read`, never document-only, and `code` counts 4 candidates, 1 left out for its secret path, 2 read and 1 Unknown, listed as `unparsed` with `unterminated`
- **AND** the member names no part of the secret-matching path

#### Scenario: Tails, directories, submodules and climbs

- **WHEN** docs/a/guide.md names `server.c`, `missing.c`, `src/`, `src/x.c/`, `sub/lib/y.c`, links ../../../x.md, names `../b/`, b/n.txt and `a/`, and links b/n.txt, in a tree holding `src/x.c`, docs/b/n.txt, `cmd/server.c` and a submodule `sub`
- **THEN** `server.c` resolves to `cmd/server.c`, `missing.c` is document-only, `src/` resolves to the directory `src`, `src/x.c/` is document-only, `sub/lib/y.c` is Unknown `submodule`, the climbing link is Unknown `outside-tree`, `../b/` resolves to `docs/b`, the span b/n.txt resolves to docs/b/n.txt, `a/` resolves to `docs/a`, and the link b/n.txt is document-only

#### Scenario: Symbolic links, submodule ancestors, secret-only directories and names in comments or strings

- **WHEN** `README.md` names `docs/`, docs/guide.md, links docs/guide.md, and names `deps/`, `libfoo/`, `libfoo/x.c`, `vault/` and vault/notes.md, in a tree where `docs` is a symbolic link, `deps/libfoo` a submodule and `vault` holds only a path a secret detector matches
- **THEN** the three `docs` rows are Unknown `symbolic-link`, `deps/` resolves to the directory `deps`, `libfoo/` and `libfoo/x.c` are Unknown `submodule`, vault/notes.md is document-only, and `vault/` is left out and counted in `valuesLeftOut`, never document-only, with no part of the secret-matching path named
- **AND** where a lexed code file writes a documented name only in a string or a comment, the row resolves with `searched` `comment-or-string`, and a name its code text holds resolves with `searched` `code-text`

#### Scenario: Documents left out, set apart, Unknown or withheld

- **WHEN** a tree holds a document under a directory a secret detector matches, one under `vendor/`, one under `dist/`, a symbolic link docs/link.md, docs/open.md whose fence never closes, docs/refused.md whose read the reader refuses, docs/bytes.md that is not UTF-8 text and docs/secret.md whose body a secret detector matches
- **THEN** `documents` counts 8 candidates, 1 left out, 2 set apart, none read and 5 Unknown, listed as `symbolic-link`, `not-utf8-text`, `unparsed` with `unclosed-fence`, `object-read-refused` and `secret-detector-match`, and no row
- **AND** for a run relying on no per-project statement, or one whose statement does not list project-documentation, every document is Unknown `class-not-consented` and none is read

#### Scenario: Long lines quoted by an exact excerpt

- **WHEN** a code span a/b.md opens at column 202 of a 310-character line
- **THEN** its quote is the line's last 256 code units, `quoteExcerpt` is true, and the page shows the quote followed by `(an exact excerpt of the line)`

#### Scenario: Docs-and-code page rendered

- **WHEN** a render holds the derived structure and a member with rows src/app.py resolving, src/gone.py document-only, `runApp()` resolving and `Node.js` Unknown `ambiguous-form`, each quoted `Use <value> <here>`, and one Unknown document docs/open.md (`unparsed`, `unclosed-fence`)
- **THEN** `reference/docs-and-code.html` holds the `Rows by class` table with 2, 1 and 1, the per-document row for `README.md`, src/gone.py under `Document only` with its quote shown with `&lt;here&gt;`, `Document only.`, `Derived by Syzygy` and its evidence, `Node.js` under `Unknown` with `Not established.` and `data-unknown-reason="mapping-coverage-absent"`, and the Unknown document opened by `Not established.`
- **AND** `contents.html` links the page after the rough-edges page where that is published, `machine.json`'s `docsAndCode` holds its page and the member's rows, and the page holds no script and no link to a documented path

#### Scenario: No docs-and-code page without the member

- **WHEN** a render holds no `docsAndCode` member, or holds one and no derived structure, or is a provider-mode render, or the pinned tree cannot be listed
- **THEN** in the first three cases it publishes no `reference/docs-and-code.html`, no link to it and no `docsAndCode` member, and its bytes are those the replaced version renders, the provider golden's bytes unchanged; in the last the member is `{"format", "state": "unknown", "why"}` and the page's section holds only its `Not established.` sentence naming the revision'''

OBSERVABLE_ADD = ' For the docs and code, record the render\'s `docsAndCode` member, `reference/docs-and-code.html` and `machine.json`\'s `docsAndCode`.'
ORACLE_ADD = ' For the docs and code, fix each fixture\'s expected rows, outcomes, resolutions, quotes and counts as literals written from the fixture text and tree, outside the recognizer code.'
FALSIFIER_ADD = (' For the docs and code: a row is read inside a fence; a path the tree lists is document-only, or one it does not list resolves; an '
                 'identifier is document-only while a code file is unread; a row is labelled agrees; a vendored, generated or secret-matching path is '
                 'named or read; a body the screen excludes yields a row; a documented path is linked; or a render without the member changes a byte.')


def banner(label: str) -> str:
    return (f'Candidate version {VERSION}. One MODIFIED requirement, REQ-polaris-generation-034, whose complete text below replaces effective '
            f'{label}. It binds through its agent adoption row and the annotated tag `{TAG}`. It adds recognizer `doc-reference` version 1, '
            'the render\'s `docsAndCode` member, the reference page `reference/docs-and-code.html` and the machine view\'s `docsAndCode` member, '
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
    assert len(at) == 1, 'rough-edges page anchor'
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
