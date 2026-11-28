#!/usr/bin/env python3
"""syzygy-5dhm.116: build REQ-polaris-generation-034 version VERSION (the cliffs: limits and defaults) from the effective predecessor's bytes.

Usage: cliffs_build_spec.py <predecessor spec.md> <predecessor label> <out>
<predecessor label> is the banner's words for the predecessor, for example 'version 2.48 (the docs and code, syzygy-5dhm.119, A-342)'.
The script replaces the title (line 1) and the banner (the one line starting 'Candidate version '), places three paragraphs immediately
after the docs-and-code page paragraph, eight scenarios immediately after the last scenario (the end of the file), and appends one sentence
to each of the oracle's Observable, Oracle and Falsifier lines. Every other byte is the predecessor's; removing these additions and
restoring the title and banner recovers it. Rebuilding as another version is a re-run with VERSION changed. Its functions are the docs and
code builder's (docs/evidence/syzygy-5dhm-119/docs_and_code_build_spec.py), unchanged.
"""
import pathlib
import sys

VERSION = '2.51'
TAG = f'polaris-dossier-cliffs-v{VERSION}'

NEW_TITLE = '# Dossier cliffs'
ANCHOR = 'Where a render holds both the derived structure and the member, it SHALL publish one reference page, `reference/docs-and-code.html`'

# Every expression recognizer limit-default v1 runs, as its source (cliffs_patterns_published.mts --print).
P = {
    'timeout': r'''(?:^|_)TIMEOUT''',
    'threshold': r'''(?:^|_)THRESHOLD''',
    'limit': r'''(?:^|_)LIMIT''',
    'max': r'''(?:^|_)MAX''',
    'default': r'''^_*DEFAULT_''',
    'python': r'''^[ \t]*(?<name>_*[A-Z][A-Z0-9_]*)[ \t]*(?::[^=\r\n]*)?=(?!=)[ \t]*(?<value>.*?)[ \t]*$''',
    'javascript': r'''^[ \t]*(?:export[ \t]+)?(?:declare[ \t]+)?(?:const|let|var)[ \t]+(?<name>_*[A-Z][A-Z0-9_]*)[ \t]*(?::[^=\r\n]*)?=(?![=>])[ \t]*(?<value>.*?)[ \t]*;?[ \t]*$''',
    'javascriptField': r'''^[ \t]*(?:(?:public|private|protected|static|readonly)[ \t]+)+(?<name>_*[A-Z][A-Z0-9_]*)[ \t]*(?::[^=\r\n]*)?=(?![=>])[ \t]*(?<value>.*?)[ \t]*;?[ \t]*$''',
    'go': r'''^[ \t]*(?:(?:const|var)[ \t]+)?(?<name>_*[A-Z][A-Z0-9_]*)(?:[ \t]+[A-Za-z_][A-Za-z0-9_.]*)?[ \t]*=(?!=)[ \t]*(?<value>.*?)[ \t]*$''',
    'java': r'''^[ \t]*(?:(?:public|private|protected|static|final)[ \t]+)+[A-Za-z_][A-Za-z0-9_.<>\[\]]*[ \t]+(?<name>_*[A-Z][A-Z0-9_]*)[ \t]*=(?!=)[ \t]*(?<value>.*?)[ \t]*;[ \t]*$''',
    'cDefine': r'''^[ \t]*#[ \t]*define[ \t]+(?<name>_*[A-Z][A-Z0-9_]*)[ \t]+(?<value>[^ \t].*?)[ \t]*$''',
    'cDeclaration': r'''^[ \t]*(?:(?:static|const|constexpr|extern|inline|unsigned|signed|long|short|volatile)[ \t]+)*[A-Za-z_][A-Za-z0-9_:]*[ \t]+(?:const[ \t]+)?(?<name>_*[A-Z][A-Z0-9_]*)[ \t]*=(?!=)[ \t]*(?<value>.*?)[ \t]*;[ \t]*$''',
    'number': r'''^[-+]?(?:0[xX][0-9A-Fa-f_]+|0[bB][01_]+|0[oO][0-7_]+|(?:[0-9][0-9_]*(?:\.[0-9_]*)?|\.[0-9][0-9_]*)(?:[eE][-+]?[0-9]+)?)[uUlLnNfFdD]{0,3}$''',
    'decimal': r'''^[-+]?(?:[0-9][0-9_]*\.|\.[0-9]|[0-9][0-9_]*[eE])''',
    'boolean': r'''^(?:true|false|True|False)$''',
    'formatted': r'''^[A-Za-z]*[fF]''',
    'expressionToken': r'''[ \t]*(?:(?<number>(?:0[xX][0-9A-Fa-f_]+|0[bB][01_]+|0[oO][0-7_]+|(?:[0-9][0-9_]*(?:\.[0-9_]*)?|\.[0-9][0-9_]*)(?:[eE][-+]?[0-9]+)?)[uUlLnNfFdD]{0,3})|(?<operator>\*\*|<<|>>|[-+*/%])|(?<open>\()|(?<close>\)))''',
    'iniComment': r'''^[ \t]*(?:[#;]|$)''',
    'iniSection': r'''^[ \t]*\[(?<section>[^\]\r\n]+)\][ \t]*$''',
    'iniEntry': r'''^[ \t]*(?<name>[A-Za-z_][A-Za-z0-9_.-]*)(?:[ \t]*[=:][ \t]*|[ \t]+)(?<value>[^ \t].*?)[ \t]*$''',
    'iniKeyOnly': r'''^[ \t]*(?<name>[A-Za-z_][A-Za-z0-9_.-]*)[ \t]*(?:[=:][ \t]*)?$''',
    'iniIndent': r'''^[ \t]*''',
    'iniBoolean': r'''^(?:true|false|yes|no|on|off)$''',
    'iniString': r'''^(?:"(?:[^"\\]|\\.)*"|'[^']*')$''',
    'yamlSkip': r'''^(?:[ \t]*(?:#.*)?|---[ \t]*|\.\.\.[ \t]*)$''',
    'yamlItem': r'''^(?<indent> *)-(?:[ \t]|$)''',
    'yamlEntry': r'''^(?<indent> *)(?<name>[A-Za-z0-9_][A-Za-z0-9_.\/-]*)[ \t]*:(?:[ \t]+(?<value>.*?))?[ \t]*$''',
    'yamlComment': r'''[ \t]+#.*$''',
    'yamlTab': r'''^ *\t''',
    'yamlNode': r'''^[&*!]''',
    'yamlBlock': r'''^[|>][-+0-9]*$''',
    'yamlPlainMapping': r''':(?:[ \t]|$)''',
    'yamlDouble': r'''^(?<quoted>"(?:[^"\\]|\\.)*")(?:[ \t]+#.*)?$''',
    'yamlSingle': r'''^(?<quoted>'(?:[^']|'')*')(?:[ \t]+#.*)?$''',
    'yamlBoolean': r'''^(?:true|false|True|False|TRUE|FALSE)$''',
    'yamlNull': r'''^(?:null|Null|NULL|~)$''',
}


def c(name: str) -> str:
    assert '`' not in P[name], name
    return f'`{P[name]}`'


PARAGRAPHS = [
    # The recognizer.
    f'From version {VERSION} each render in the operator-agent mode SHALL also read the limits and defaults the files of the pinned tree '
    'declare: what recognizer `limit-default` version 1 reads in the source and configuration files that the bound screening policy admits. '
    'A source candidate is a blob whose basename is longer than and ends with one of `.py` (Python), `.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, '
    '`.tsx`, `.mts` and `.cts` (JavaScript and TypeScript), `.go` (Go), `.java` (Java), and `.c`, `.h`, `.cc`, `.cpp`, `.cxx`, `.hpp` and '
    '`.hh` (C and C++); any other blob is a configuration candidate where its basename is longer than and ends with `.conf`, `.cfg` or `.ini` '
    '(the ini form), or is `values.yaml` or `values.yml`, or starts `config.example.` and ends `.yaml` or `.yml` (the yaml form). A source '
    'body is read by the test-name lexer of its language, C and C++ by its C-like lexer with no option, and the definition forms are matched '
    'against each line of the code text it leaves, in which comments and string interiors are blank, so no definition is ever read in a '
    'comment or a string; a body the lexer cannot end is Unknown `unparsed` with the fault `unterminated`. The forms are, for Python '
    f'{c("python")}; for JavaScript and TypeScript {c("javascript")} and the class field {c("javascriptField")}; for Go {c("go")}; for '
    f'Java {c("java")}; and for C and C++ the macro {c("cDefine")} and the declaration {c("cDeclaration")}; on each line the first form of '
    'its language that matches is the only one read. Its name is a constant only where it matches a kind pattern, tried in the order '
    f'`timeout` {c("timeout")}, `threshold` {c("threshold")}, `limit` {c("limit")}, `max` {c("max")} and `default` {c("default")}, the '
    'first that matches giving the row\'s kind. Its value is the body\'s text at the offsets of the form\'s `value` group, typed: `string` '
    'where it is exactly one string literal the lexer reads as plain and not opened by a prefix matching '
    f'{c("formatted")}; otherwise, after every pair of parentheses enclosing all of it is removed, `boolean` by {c("boolean")}, `integer` '
    f'by {c("number")}, or `decimal` where it also matches {c("decimal")}, and `expression` where it '
    f'is a run of tokens matched by {c("expressionToken")} that alternates operands and operators, each operand a number with any number of '
    'leading signs and opening parentheses before it and closing parentheses after it, with the parentheses balanced and at least one '
    'operator. Any other value, an empty one among them, is no literal: the row is Unknown `value-not-literal`, with no value and no type. '
    'Nothing is evaluated: a value is the text written. Each definition is read from its one line, wherever it stands in the code text: a '
    'keyword argument written in a call in a definition form\'s shape and a macro a preprocessor condition disables are read too, and a '
    'definition continued on the next line is Unknown, or not read where its form needs the line\'s end. An ini-form body is read line by '
    f'line: a line matching {c("iniComment")} (a comment or a blank line) is skipped; a line whose indentation, the match of '
    f'{c("iniIndent")}, is longer than that of the last entry or key with no value since the last section continues that key\'s value, as '
    'Python\'s configparser reads it, so the entry\'s value is Unknown `value-not-literal`, a key with no value so continued is an entry '
    'Unknown `value-not-literal` at its own line, and the continuing lines are no entries; otherwise a line matching '
    f'{c("iniKeyOnly")} (a key with no value) is no entry; a line matching '
    f'{c("iniSection")} opens a section; a line matching {c("iniEntry")} whose value does not end with `{{` is an entry, its name its key, '
    'after the section\'s trimmed name and `.` where a section is open; any other line makes the file Unknown `unparsed` with the fault '
    f'`outside-grammar`. An ini value is `boolean` by {c("iniBoolean")} compared without case, `integer` or `decimal` as a source value '
    f'is, `string` by {c("iniString")}, and `text` otherwise. A yaml-form body is read in a subset: a line matching {c("yamlSkip")} is '
    f'skipped; a line matching {c("yamlTab")} is outside the grammar; a line matching {c("yamlItem")} is a sequence item, counted in '
    '`sequenceItemsNotRead`, and it, every item after it at its indentation and every line indented more deeply are skipped; a line matching '
    f'{c("yamlEntry")} is an entry, its name the keys of the enclosing entries that have no value, each indented less than the next, and '
    'its own key, joined by `.`; a key with no value, or only a comment after it, opens a mapping and is no entry. A value matching '
    f'{c("yamlNode")} (an anchor, an alias or a tag) is outside the grammar; a value opened by a quote must match {c("yamlDouble")} or '
    f'{c("yamlSingle")} and is `string`, its quoted text the value; any other value has {c("yamlComment")} removed and is Unknown '
    f'`value-not-literal` where it matches {c("yamlBlock")} (a block scalar, whose more deeply indented lines are skipped) or opens a flow '
    'collection, opened by `[` or `{` and ending with the matching `]` or `}` (one not ending so is outside the grammar), and is '
    f'otherwise outside the grammar where it matches {c("yamlPlainMapping")}, and `boolean` by {c("yamlBoolean")}, `null` by '
    f'{c("yamlNull")}, `integer` or `decimal` as a source value is, and `text`. A line a block scalar or a sequence item does not skip and '
    'that is indented more deeply than the entry with a value before it is outside the grammar, and so is any other yaml line. A commented-out entry is read in neither form, and a file outside its grammar is never read '
    'past its fault. Each row\'s `quote` is its line, lines ending at CRLF, CR or LF, without its terminator and its leading and trailing '
    'spaces and tabs (on line 1 without a byte-order mark). A row states what a file sets, never that a limit is reached, enforced or right.',
    # The member.
    'Candidates take the disposition, in the order, that the rough-edge markers give theirs: a path a secret detector matches, or any of '
    'whose directory prefixes it matches, is counted in `secretPathsLeftOut` and named nowhere; a vendored or generated path is counted in '
    '`setApart` and named nowhere; every other candidate is named, and Unknown and never read where its path is not citable, it is a '
    'symbolic link, the screen\'s path outcome excludes it, the class gate withholds its class, or it is past the read limit of 1000 source '
    'files or 250 configuration files, each counted in path order. The remaining files are read in path order through the reader bound at '
    '1 MiB, 64 paths to a reader call; where a call is refused, each of its paths is read again in a call of its own, so a file\'s outcome is '
    'its own. Each body is screened whole, and only a body the screen admits whole is read; a body the screen excludes, as active content or '
    'for a secret detector, is Unknown with that reason and yields no row. A row whose quote the value checks refuse (empty, longer than '
    '256 characters, holding a control character, a tab among them, or matched by a secret detector) is left out and counted in its file\'s '
    '`valuesLeftOut`. The render SHALL hold the result as the member `limitsAndDefaults`, of format '
    '`polaris-dossier-limits-and-defaults/1`: `{"format", "state": "derived", "screeningPolicy", "unitRule": {"rule": "top-level-unit", '
    '"ruleVersion": 1}, "recognizer", "units", "unitsNotListed", "rows", "rowsNotListed"}`, or `{"format", "state": "unknown", "why"}` where '
    'the pinned tree cannot be listed. `recognizer` is `{"rule": "limit-default", "ruleVersion": 1, "candidates", "secretPathsLeftOut", '
    '"setApart", "observed", "unknown", "valuesLeftOut", "sequenceItemsNotRead", "rows", "files", "filesNotListed"}`, its `files` the files '
    'read and then the Unknown ones, the first 1000 listed, each `{"path", "source", "epistemic", "unknownReason", "parseFault", "rows", '
    '"valuesLeftOut"}`, `source` `code` or `config` and the two counts null for an Unknown entry. `units` has one entry per unit, by rule '
    '`top-level-unit`, with a file read, the root first and then the directories in code-unit order, the first 250 listed, each `{"unit", '
    '"files", "constants", "entries", "valuesUnknown"}` counting every row, listed or not. Each row is `{"id", "source", "kind", "name", '
    '"value", "valueType", "path", "line", "unit", "blob", "quote", "epistemic", "unknownReason"}`: `kind` one of `timeout`, `threshold`, '
    '`limit`, `max` and `default` for a constant and `entry` for a configuration entry, `valueType` one of `integer`, `decimal`, `boolean`, '
    '`string`, `expression`, `null` and `text`, `blob` the object id of the blob read, `epistemic` `observed` with a null reason where a type '
    'is given and `unknown` with `value-not-literal`, a null value and a null type otherwise. The first 2000 rows in order of path, code unit '
    'by code unit, then line are listed with the identities `_limit-<k>`, and `rowsNotListed` counts the rest. A row with a value is '
    'Observed: the blob at that path sets that name to that text on that line. The render derives the member itself, as it derives the '
    'rough-edge markers; check does not write it, and no reader takes it from a stored record.',
    # The page and the machine view.
    'Where a render holds both the derived structure and the member, it SHALL publish one reference page, `reference/cliffs.html`, titled '
    '`Cliffs`, linked in the reading order and on `contents.html` as the last of the items after the Sources page: after the computed maps, '
    'the test-names page, the rough-edges page and the docs-and-code page where those are published, and opening with a legend of its own: '
    'the view switch a map page\'s legend carries, and what `Derived by Syzygy` and `Not established.` mean there. Its section `<section '
    'id="cliffs" data-reading-level="1" data-topics="">` holds: a note naming the revision, the bound screening policy, the rule and its '
    'version, the languages and configuration forms read, the name patterns in words, that a definition is read from its one line in code '
    'only, wherever it stands, and never in a comment or a string, that an ini value continued on an indented line is Unknown, '
    'comment or a string, that commented-out entries and sequence items are not read, that a value is shown as written and never evaluated, '
    'that a row says what a file sets and never that a limit is reached, enforced or right, that JSON, TOML and environment-file '
    'configuration, command-line flag defaults and values computed at run time are not read by this version, and the unit rule; a coverage line giving each '
    'count of `recognizer`; under `<h2>Per unit</h2>` a table captioned `Limits and defaults per unit, as counts of what the rule read` with '
    'the column headers `Unit`, `Files read`, `Constants`, `Configuration entries` and `Values Unknown`, or the sentence `No file was read '
    'for limits and defaults, so no unit has a row.`, followed, where any candidate is Unknown or left out for its secret path, by a `Not '
    'established.` sentence giving their number and saying that what they set is counted in no row, so each count is of the files read and '
    'never a total (VIS-2); under `<h2>Limits and defaults, by unit</h2>` each listed row, grouped by unit, in Syzygy\'s words `<name>, a '
    'maximum constant, in <path> at line <n>: set to <value> (<type>).` (or a timeout, threshold, limit or default constant, or a '
    'configuration entry) followed by the quote in a `<q>` element, marked `Derived by Syzygy` and carrying in its DOM text its label '
    'Observed, the line, the path and the blob, that the line is quoted exactly but for its leading and trailing spaces and tabs, that the '
    'value is as written and not evaluated, the rule and version and the revision; a row whose value is Unknown is marked '
    '`data-epistemic="unknown"` with the RFC2-24 reason `mapping-coverage-absent` and says, after its quote, `Not established.` and that what '
    'it is set to is Unknown because no value form reads what the line writes, and Syzygy evaluates nothing; no value or quote is a link; '
    'and under `<h2>Files whose limits are Unknown</h2>` each listed Unknown file, opened by `Not established.`, with its reason and its '
    'fault and the RFC2-24 reason the rough-edges page gives that reason. A file reason, kind or row reason this version does not name '
    'refuses the page. Each list of rows and files wraps anywhere, so the page fits 390 CSS pixels. Where the member is `unknown` the '
    'section holds only its heading and a `Not established.` sentence saying that which limits and defaults the files at that revision set '
    'is Unknown at this render because the pinned tree could not be listed. `machine.json` SHALL carry, outside `reviewStatus`, a member '
    '`limitsAndDefaults` holding `"page": "reference/cliffs.html"` and the member\'s own members exactly. A render without the member or '
    'the derived structure, and every provider-mode render, publishes no such page, link or member, so its bytes are those the replaced '
    'version renders.',
]

SCENARIO_ANCHOR = '\n\nForm: event-response.\n'
SCENARIOS = '''

#### Scenario: Limits and defaults listed per unit with value, path and line

- **WHEN** under declared-source policy 2.0.0 a render's pinned tree holds setup.py defining `MAX_WORKERS = 4` and, in a comment, `MAX_COMMENTED = 1`; pkg/net.py defining `READ_TIMEOUT = 2.5`, `DEFAULT_HOST = "localhost"` and `MAX_SIZE = size_of()`; web/src/limits.ts exporting `UPLOAD_LIMIT = 10 * 1024 * 1024` and writing `MAX_IN_STRING = 1` inside a string; src/server.h defining the macro `PROTO_MAX_BULK (512*1024*1024)`; charts/app/values.yaml setting `replicaCount: 2` and `port: 8080` under `service:`; redis.conf; and a README.md
- **THEN** the member lists eight rows in path order: `replicaCount` 2 and `service.port` 8080 as integer configuration entries in unit `charts`, `READ_TIMEOUT` 2.5 decimal, `DEFAULT_HOST` the string `"localhost"`, `MAX_SIZE` Unknown `value-not-literal` in unit `pkg`, `MAX_WORKERS` 4 at the root, `PROTO_MAX_BULK` the expression `(512*1024*1024)` in unit `src` and `UPLOAD_LIMIT` the expression `10 * 1024 * 1024` in unit `web`, each with its line, quote and blob
- **AND** the five source and configuration files are read in one reader call, redis.conf is Unknown `unknown-extraction-class` because the policy gives its path no class, the units count 1, 2, 3, 1 and 1 rows with one value Unknown in `pkg`, and no row holds the commented, quoted or README name

#### Scenario: Each source form read in code, never in a comment or a string

- **WHEN** a Go file defines `MAX_CONNS = 64` and `DEFAULT_HOST string = "localhost"` in a const block and `READ_TIMEOUT = 5 * time.Second`; a Java class declares `public static final int MAX_DEPTH = 32` and `private static final long IDLE_TIMEOUT = 60L * 1000L` and a field `int MAX_LOCAL = 1` with no modifier; and a C header defines `CONFIG_DEFAULT_HZ 10`, the function-like macro `MAX(a, b)`, `PROTO_MAX_SIZE (512*1024*1024)` and `static const size_t LOOKUP_LIMIT = 0x100`, and in a comment `MAX_OFF 3`
- **THEN** the Go rows are `MAX_CONNS` 64 integer, `DEFAULT_HOST` string and `READ_TIMEOUT` Unknown `value-not-literal`; the Java rows are `MAX_DEPTH` 32 and `IDLE_TIMEOUT` the expression `60L * 1000L`; the C rows are `PROTO_MAX_SIZE` and `LOOKUP_LIMIT` `0x100` integer
- **AND** no row holds `MAX_LOCAL`, `CONFIG_DEFAULT_HZ` (no kind pattern matches it), the function-like macro or the commented definition, and a Python `DEFAULT_FMT = f"{x}"` and a TypeScript template with a substitution are Unknown `value-not-literal`

#### Scenario: Configuration entries in the ini and yaml forms

- **WHEN** an ini-form body writes `maxmemory 2gb`, `timeout 0`, a section `[server]` and under it `port = 6379`, `verbose: yes`, `name = "svc"`, `ratio=0.75`, `skip-networking` and `empty =`; and a yaml-form body sets `replicaCount: 1`, `image.repository` and a quoted `image.tag`, `resources.limits.memory: 512Mi` and `cpu: 0.5`, a sequence of two items under `args:` and one under `extra:`, `debug: false`, a block scalar `notes: |`, `nothing: ~`, a flow mapping `labels: {app: web}` and `service.port: 80` with a comment
- **THEN** the ini entries are `maxmemory` `2gb` text, `timeout` 0 integer, `server.port` integer, `server.verbose` boolean, `server.name` string and `server.ratio` decimal, and neither key with no value is an entry; the yaml entries are named by their key paths, `notes` and `labels` Unknown `value-not-literal`, `nothing` `null`, and 3 sequence items are counted and not read
- **AND** in a tox-style ini body `deps =` followed by indented requirement lines, and `setenv = PYTHONHASHSEED=0` followed by an indented `LANG=C`, are entries Unknown `value-not-literal`, and no indented line is an entry, while keys indented alike under a section are entries
- **AND** an ini body with a `{` block, and a yaml body with an anchor, a tag, an alias, an unclosed flow or quote, a tab in its indentation, a plain scalar continued on the next line, a plain value holding `: ` or an entry indented under an entry with a value, is Unknown `unparsed` with the fault `outside-grammar`, and none of its entries is a row

#### Scenario: Values the rule cannot read whole stay Unknown

- **WHEN** Python constants are set to `1 2`, `(1 + 2`, `1 +`, `* 2`, `* 2 + 1`, `- (5)`, `1) + (2`, another name, two adjacent strings, `1.5.2` and `null`
- **THEN** each is a row Unknown `value-not-literal` with no value and no type, never a guessed number

#### Scenario: Files left out, set apart, Unknown or withheld

- **WHEN** a tree holds a source file under a directory a secret detector matches, one under `vendor/`, one under `dist/`, a symbolic link src/link.py, src/open.py ending inside a string, src/refused.py whose read the reader refuses, src/bytes.py that is not UTF-8 text, src/secret.py whose body a secret detector matches, and chart/values.yaml opening a value with an anchor
- **THEN** the recognizer counts 9 candidates, 1 left out, 2 set apart, none read and 6 Unknown, listed as `unparsed` with `outside-grammar`, `not-utf8-text`, `unparsed` with `unterminated`, `object-read-refused`, `secret-detector-match` and `symbolic-link`, and no row; the refused batch is read again one path to a call
- **AND** a values.yaml whose body the screen excludes as active content is Unknown `active-content` with no row; and for a run whose statement does not list code-content, every source file is Unknown `class-not-consented` and none is read

#### Scenario: Read limits, batches and listing limits

- **WHEN** a tree holds 1001 Python files and 251 values.yaml files, each setting one value
- **THEN** 250 configuration files and 1000 source files are read, 64 paths to a call in 20 calls, one source file and one configuration file are Unknown `over-read-limit`, 1000 file entries are listed and 252 counted and not listed
- **AND** a file setting 2001 constants lists 2000 rows and counts 1 not listed, and 251 units list 250 and count 1

#### Scenario: Cliffs page rendered

- **WHEN** a render holds the derived structure and a member with `service.port` 8080 in chart/values.yaml, `MAX_NAME` set to the string `"<a>"` and `READ_TIMEOUT` Unknown `value-not-literal` in setup.py, and the Unknown files redis.conf (`unknown-extraction-class`) and web/open.yaml (`unparsed`, `outside-grammar`)
- **THEN** `reference/cliffs.html` holds the per-unit table with its five column headers, the root's rows before `chart/`, `MAX_NAME, a maximum constant, in setup.py at line 1: set to &quot;&lt;a&gt;&quot; (string).` with its quote, `Derived by Syzygy` and its evidence, `READ_TIMEOUT` with `Not established.` and `data-unknown-reason="mapping-coverage-absent"`, and each Unknown file opened by `Not established.` with its reason and fault
- **AND** `contents.html` links the page after the docs-and-code page where that is published, `machine.json`'s `limitsAndDefaults` holds its page and the member's rows, and the page holds no script and no link to a file

#### Scenario: No cliffs page without the member

- **WHEN** a render holds no `limitsAndDefaults` member, or holds one and no derived structure, or is a provider-mode render, or the pinned tree cannot be listed
- **THEN** in the first three cases it publishes no `reference/cliffs.html`, no link to it and no `limitsAndDefaults` member, and its bytes are those the replaced version renders, the provider golden's bytes unchanged; in the last the member is `{"format", "state": "unknown", "why"}` and the page's section holds only its `Not established.` sentence naming the revision'''

OBSERVABLE_ADD = ' For the cliffs, record the render\'s `limitsAndDefaults` member, `reference/cliffs.html` and `machine.json`\'s `limitsAndDefaults`.'
ORACLE_ADD = ' For the cliffs, fix each fixture\'s expected rows, kinds, values, types, lines, quotes and counts as literals written from the fixture text and tree, outside the recognizer code.'
FALSIFIER_ADD = (' For the cliffs: a definition is read in a comment or a string; a value is evaluated, or a value no form takes is given a type; a '
                 'file outside its grammar yields a row; a vendored, generated or secret-matching path is named or read; a body the screen excludes '
                 'yields a row; a row is linked; or a render without the member changes a byte.')


def banner(label: str) -> str:
    return (f'Candidate version {VERSION}. One MODIFIED requirement, REQ-polaris-generation-034, whose complete text below replaces effective '
            f'{label}. It binds through its agent adoption row and the annotated tag `{TAG}`. It adds recognizer `limit-default` version 1, '
            'the render\'s `limitsAndDefaults` member, the reference page `reference/cliffs.html` and the machine view\'s `limitsAndDefaults` '
            'member, all in the operator-agent mode; it changes no finding, no gate, no other page of a render without the member, and no '
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
    assert len(at) == 1, 'docs-and-code page anchor'
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
