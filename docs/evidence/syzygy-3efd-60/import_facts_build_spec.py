#!/usr/bin/env python3
"""Build the version 2.39 MODIFIED REQ-polaris-generation-034 (lexical import facts) from the version 2.38 bytes by anchored edits (syzygy-3efd.60).

Drafted and reviewed over version 2.33 (the figure plan) under the placeholder label 2.NN; rebuilt over version 2.38 (the
migration parity) for adoption by changing PRED, NUMS, the two head assertions and VERSION alone.

Every edit asserts its anchor occurs exactly once. Usage: import_facts_build_spec.py <worktree> <out>.
"""
import pathlib
import sys

W = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])
PRED = 'openspec/changes/dossier-migration-parity/proposed/polaris-generation/spec.md'
text = (W / PRED).read_text(encoding='utf-8')

# The successor's numbers, kept symbolic so a rebuild over a later predecessor changes these constants and the anchors alone.
NUMS = {'<PV>': '2.38', '<PN>': 'migration parity'}
# The label this text is adopted under; the edits below write the placeholder 2.NN, replaced at the end.
VERSION = '2.39'


def sym(s):
    for k, v in NUMS.items():
        s = s.replace(k, v)
    return s


def replace(old, new):
    global text
    n = text.count(old)
    assert n == 1, (n, old[:80])
    text = text.replace(old, sym(new), 1)


def insert_after(anchor, paragraphs):
    replace(anchor, anchor + ''.join('\n\n' + p for p in paragraphs))


lines = text.split('\n')
assert lines[0].startswith('# Dossier migration parity'), lines[0]
assert lines[2].startswith('Candidate version 2.38;'), lines[2][:40]
lines[0] = '# Dossier lexical import facts: which unit a TypeScript file\'s import statements name, in the check record'
lines[2] = ("Candidate version 2.NN; binds nothing until its agent adoption row in AGENT-ADOPTIONS.md and its version tag. One MODIFIED "
            "requirement, REQ-polaris-generation-034, whose complete text below replaces the effective text that <PN> version <PV> gave "
            "it. In the operator-agent mode, check derives lexical import facts for every TypeScript file of the pinned tree that the bound "
            "screen admits whole: each top-level static import or re-export statement, the unit it names, collapsed to the tree's "
            "`package.json` units, and the unit graph those statements give, with closed file and statement outcomes and a coverage word. "
            "They are Inferred, stored as the check record's member `importFacts` before `manifestFacts`, and read by nothing else at this "
            "version: the structure record stays path-only and byte-unchanged, no page renders them, no relation witness reads them, and "
            "Python is stated unevaluated. Every other sentence and scenario of the predecessor is carried unchanged; the exact changes are "
            "in SEMANTIC-DELTA.md. Unmentioned effective requirements are unchanged.")
text = '\n'.join(lines[:2] + [sym(lines[2])] + lines[3:])

# The record bounds of version 2.10 name the new member beside manifestFacts.
replace('Apart from `manifestFacts`, no member of a check record has a size bound of its own',
        'Apart from `manifestFacts` and, since version 2.NN, `importFacts`, no member of a check record has a size bound of its own')
replace('it holds no `executionFlags`, `quotations`, `excludedContent`, `citedBlobs`, `figureFit`, `readingLedger` or `manifestFacts`, and '
        'its format identifier is the full record\'s.',
        'it holds no `executionFlags`, `quotations`, `excludedContent`, `citedBlobs`, `figureFit`, `readingLedger`, `importFacts` or '
        '`manifestFacts`, and its format identifier is the full record\'s.')
replace('Wherever this requirement says a draft check record carries `figureFit`, `readingLedger` or `manifestFacts`,',
        'Wherever this requirement says a draft check record carries `figureFit`, `readingLedger`, `importFacts` or `manifestFacts`,')

# The import-facts paragraphs, after the manifest member's coverage remainder (version 2.14).
ANCHOR = 'no reader at this version takes either form from a stored check record.'
P = []
# P1: what an import fact is, where it is stored, and what reads it.
P.append(
    "In the operator-agent mode `syzygy dossier check`, for each draft revision it checks and writes a check record for, SHALL also "
    "derive lexical import facts (version 2.NN): for each TypeScript file of the pinned tree whose whole body the bound screening "
    "policy admits, each top-level static import or re-export statement the file's text holds, and the unit its module operand names, "
    "collapsed to the `package-manifest` units of version 2.19, a unit being written as the raw path of its `package.json`. An import "
    "fact states only that a file's text holds a statement of a form named below whose operand names, by the finite rules below, a "
    "file or a package of a unit, or names no unit of the tree; never that the code is compiled, loaded, reached or called, that a "
    "compiler, bundler or runtime resolves the operand as these rules do, or that any configuration (a `paths` or `baseUrl` mapping, an "
    "`exports` or `imports` map, a loader) applies. Every import fact is Inferred at this version, whatever evidence exists: the label is "
    "a constant. Import facts read file bodies, so they are not derived structural facts of version 2.3: the structure record "
    "(`derived/rev-<n>.json` and `derived-structure.json`) stays path-only and byte-unchanged, and no trait or pack rule reads them. They "
    "are not declared manifest facts either, and the `manifestFacts` member, its fact identities and its coverage remainder are "
    "unchanged by them. They are stored in the check record that check writes once for the revision, `checks/rev-<n>.json`, as the "
    "member `importFacts`, after `figureFit` and `readingLedger` where present and immediately before `manifestFacts`, which stays the "
    "record's last member; no other check record carries them (an inventory check record carries none), the record's format identifier "
    "stays `polaris-dossier-check/1`, and check's report carries the member once, as it carries the rest of the check record. At this "
    "version no page, `machine.json` or `dossier.json` member, figure, brief, review packet or published file carries the member or "
    "anything taken from it, no draft element is upgraded by it, and no rule of version 2.19 reads it: an `imports` arrow keeps the "
    "witness state that version gives it. The member is derived from the pinned tree, its blobs, the bound screening policy, the run's "
    "content classes and the same check's `manifestFacts` member alone, never from the draft, so a draft that does not parse gets it too. "
    "A check record without `importFacts`, written before this version, states nothing about imports, and its absence is Unknown. "
    "TypeScript is the one language assessed at this version; Python and every other language are unevaluated, and the member says so.")
# P2: candidates and dispositions; the screen.
P.append(
    "The candidates are the blob entries of the pinned tree (modes 100644, 100755 and 120000) whose path ends in `.ts`, from the listing "
    "check takes for its census (a `.d.ts` file is one; a `.tsx`, `.mts` or `.cts` file is not); a submodule or any other entry is never "
    "a candidate. Each candidate takes exactly one disposition, decided in this order, as a package recognizer's candidate takes its own "
    "under version 2.7. A candidate whose path, or any of whose directory prefixes, a secret detector of the bound screening policy "
    "matches, read as a path or as text, is counted in `secretPathsLeftOut` and named nowhere. A candidate with a directory segment that "
    "the vendored-path or generated-path rule version 1 names, or that the tests-path rule version 1 matches, is counted in `setApart`, "
    "never named or read. Every other candidate is a named file. A named file is Unknown and never read for the reasons of version 2.7, "
    "in their order and with their words (`path-not-citable`, `symbolic-link`, `denied-path`, `unknown-extraction-class`, "
    "`class-not-consented`), and, where none of those reaches it, where it is past the 2,000th such file in path order "
    "(`over-read-limit`). Each remaining file is read in its own call of the pinned object reader version 2.7 opens, with its object "
    "bound set to 262,144 bytes: a blob over that bound is refused before it is inflated whole and is Unknown (`too-large`), any other "
    "refusal makes that file Unknown (`object-read-refused`), and neither fails another file or the check. Files are read in path order, "
    "and where the bytes of a file, added to those of the files read before it, would take the bytes read for this member past "
    "16,777,216, that file is Unknown (`over-read-limit`) and not scanned, and every later file is Unknown for the same reason and not "
    "read. A file's bytes are then Unknown where they are not valid UTF-8 (`not-utf8-text`); otherwise the screen's body screen runs "
    "over the whole text, as it runs over a cited blob and a manifest file, and a body it excludes is Unknown with its outcome word "
    "(`secret-detector-match` or `active-content`) and one it retains with lines withheld is Unknown (`redacted-body`). Only a whole body "
    "the screen admits is scanned; an excluded or withheld body is never scanned, used or named beyond its path, and a body the screen "
    "admits is never shown: no operand, name or other text of a body enters the member, its counts and the paths and lines below "
    "aside. The member reads no body of a file a statement names, and no blob the screen and the class gate would not admit as a cited "
    "blob, so it narrows no secret detector and no fail-closed rule of SEC-5. Which files are scanned is the screen's outcome at each "
    "check, never a rule of this requirement.")
# P3: the lexical grammar.
P.append(
    "A scanned body is read as TypeScript tokens from its first code point, a leading U+FEFF being whitespace, and its line "
    "terminators being LF, CR, CRLF, U+2028 and U+2029. A statement of the grammar begins at a top-level `import` or `export` token, "
    "top-level meaning outside every brace, parenthesis, bracket and template substitution, and takes one of these forms, its module "
    "operand being one string literal, single- or double-quoted, holding no backslash and no line terminator: `import`, an import "
    "clause, `from` and the operand (form `import`, or `import-type` where the clause begins with `type` followed by `{`, `*` or an "
    "identifier other than `from`); `import` followed directly by the operand (form `side-effect`); and `export`, optionally `type`, "
    "then `*`, `* as` and an identifier, or a brace-delimited export clause, then `from` and the operand (form `re-export`, or "
    "`re-export-type` where `type` is written). An import clause is the ECMAScript `ImportClause` production (a default binding; a "
    "namespace import, `* as` and a binding; a brace-delimited named-imports list; or a default binding, `,` and one of the other two), "
    "with TypeScript's `type` written before the clause or before a named import, a binding being any identifier, `from`, `type` and "
    "`as` among them. A statement ends at its operand's closing quote, and a `;` after it is not part of it. These are outside the "
    "grammar and counted in `outsideGrammar`, never resolved: a top-level import-equals declaration of a module (`import`, optionally "
    "after `export`, then an identifier, `=`, `require` and `(`); an `import` token followed by `(`, wherever it stands outside the "
    "texts named next, a type query `typeof import(` among them; an identifier `require` followed by `(`, wherever it stands outside "
    "those texts, except where it is preceded by `function` or is the `require` of an import-equals declaration; an `import` or "
    "`export` token that is not top level and begins a form above, or an `import` token that is not top level and is followed by an "
    "identifier, `{`, `*` or a string literal (an import inside a `declare module`, `declare global` or `namespace` block, for "
    "example), counted and never dropped; a top-level `import` token that begins no form above and no import-equals declaration and is "
    "followed by neither `(` nor `.`; and a top-level form above whose operand is not such a literal, whose operand is followed by an "
    "import-attributes clause (`with` or `assert`, then a brace), or whose operand a rule below calls outside the grammar. No `import`, "
    "`export` or `require` token preceded by `.` or `?.` (a property, such as `obj.require(x)`) is a statement or an outside-grammar "
    "form; neither is an `import` token followed by `.` (`import.meta`), nor an import-equals declaration whose right side is not "
    "`require(` (a namespace alias). A `require` a file binds for itself is still counted where it is called, so `outsideGrammar` can "
    "count a form that loads no module, and never leaves one uncounted. Text inside a line comment, a block comment, a string literal, "
    "a template literal outside its substitutions or a regular-expression literal is never a statement and never an outside-grammar "
    "form, where each such text begins being decided by this token rule alone: a `/` that does not begin a comment begins a "
    "regular-expression literal where the significant token before it is none, punctuation or an operator other than `)`, `]`, `}`, "
    "`>`, `!`, `++` and `--`, one of the words `return`, `typeof`, `case`, `default`, `do`, `else`, `in`, `instanceof`, `new`, "
    "`delete`, `void`, `throw`, `extends`, `break` and `continue`, or a `)` that closes the parenthesised head of `if`, `while`, `for` "
    "or `with` (the token before its matching `(` being that word, or `await` after `for`); and it is a division operator where that "
    "token is any other identifier or word, a number, a string, the end of a template or regular-expression literal, `]`, or any "
    "other `)`. Where the rule cannot tell the two readings apart, the scan does not guess: a `/` that begins no comment after `}`, "
    "`>`, `!`, `++`, `--`, `of`, `yield` or `await`, or after an identifier that directly follows `break` or `continue`, is a point "
    "where the scan cannot establish a token boundary, as are an unterminated comment, string, template or regular-expression literal "
    "and a code point the TypeScript lexical grammar does not allow outside them. At such a point the scan stops and the file is "
    "`incomplete`: the statements and outside-grammar forms whose last token ends before that point are kept, and no later text of the "
    "file is read for them. A body the scan reads to its end is `scanned`. A statement's lines are the first and last lines holding a "
    "code point of it, numbered as the path-and-range check numbers them, so `[first, last]` is a range that check accepts as a "
    "citation of its path.")
# P4: the units, and the two resolution rules.
P.append(
    "Each statement is collapsed to units, from the tree listing and the `manifestFacts` member alone; no target body is read. A file's "
    "unit is the `package.json` entry of the nearest directory enclosing the file, its own directory first and the root last. Where no "
    "enclosing directory holds an entry named `package.json`, the file lies in no unit. Where the nearest such entry is not a blob of "
    "mode 100644 or 100755, or is one whose path is not citable, whose path or any of whose directory prefixes a secret detector "
    "matches, read as a path or as text, whose path the screen's path outcome denies, or which the vendored-path, generated-path or "
    "tests-path rule above sets apart, the file's unit is undecidable, as version 2.19 withholds such a `package-manifest` unit. Rule "
    "`typescript-relative-import` version 1 takes an operand that is `.` or `..` or begins with `./` or `../`. Such an operand is "
    "outside the grammar where it is `.` or `..`, ends in `/` or holds an empty segment; otherwise it is joined to the importing file's "
    "directory and normalised by segments, a `.` segment being dropped and a `..` segment removing the segment before it, and it is "
    "outside the grammar where that would leave the root. Where a `..` removes a segment whose path the listing holds as a symbolic link "
    "(mode 120000), which a file system follows before it applies the `..`, the target is undecidable. Its candidate addresses are that "
    "path where its last segment ends in `.ts`; that path with a final `.js` replaced by `.ts` where it ends in `.js`; and `<path>.ts` "
    "then `<path>/index.ts` where its last segment holds no `.`; an operand of any other form (one ending in `.json`, `.mjs` or `.css`, "
    "for example) is outside the grammar. The rule takes the addresses in that order. An address that the listing does not hold, and "
    "none of whose directory prefixes it holds as a symbolic link, is passed over, as is one it holds as a tree or a submodule (mode "
    "040000 or 160000), since a resolver takes no directory for a file named by a `.ts` path; where every address is passed over the "
    "target is absent. The rule stops at the first address not passed over: where the listing holds that address, or any of its "
    "directory prefixes, as a symbolic link, the target is undecidable, since where the link leads is not read and could change the "
    "result; where it holds it as a blob of mode 100644 or 100755, that address is the target where its path is citable, no secret "
    "detector matches it or any of its directory prefixes, and the screen's path outcome and the class gate admit it as they would admit "
    "a cited blob, and otherwise the target is undecidable. An undecidable target names nothing. A relative statement's target unit is "
    "the unit of its target, by the unit rule above. Rule `typescript-package-import` version 1 takes an operand whose first segment is "
    "not empty and begins with none of `.`, `/`, `#` and `_`, and whose second segment, where the first begins with `@`, is present and "
    "not empty; every operand that neither rule takes (`''`, `'#internal'`, `'/abs/f'` or `'@scope'`, for example) is outside the "
    "grammar. Its package name is its first segment, or its first two where the first begins with `@`. Where the `manifestFacts` "
    "member is `unknown`, the target is undecidable. Otherwise the rule decides only where the `npm-package-manifest` version 1 entry "
    "of that member has `secretPathsLeftOut`, `setApart`, `unknown`, `valuesLeftOut` and `filesNotListed` all zero and the member's "
    "`factsNotListed` is zero, and elsewhere the target is undecidable, whatever the listed facts hold, since a package that a "
    "left-out, set-apart, Unknown or unlisted `package.json` declares could hold the name: one known declarer is never read as the only "
    "one. Where the rule decides, exactly one `package` fact of that recognizer with that `name` makes the target unit that fact's "
    "`path`, two or more make the target ambiguous, and none makes the operand name no unit of the tree.")
# P5: statement outcomes, the member's form, coverage, listing and bounds.
P.append(
    "Each statement takes exactly one outcome, the first of these that applies: `unknown` with the reason `source-unit-undecidable` "
    "where its file's unit is undecidable, `target-undecidable`, `target-ambiguous` or `target-absent` where its target is so, and "
    "`target-unit-undecidable` where its target's unit is undecidable; `no-unit` where its file, or its relative target, lies in no "
    "unit; `external` where its operand names no unit of the tree; `same-unit` where its source and target units are one; and otherwise "
    "`edge`, from its file's unit to its target unit. An `unknown` statement names no target, no target unit and no identity the screen "
    "or a secret detector withheld. The member is `{\"format\": \"polaris-dossier-import-facts/1\", \"state\": \"derived\", "
    "\"screeningPolicy\": {\"policyId\", \"policyVersion\", \"sha256\"}, \"rules\": [{\"rule\": \"typescript-relative-import\", "
    "\"ruleVersion\": 1}, {\"rule\": \"typescript-package-import\", \"ruleVersion\": 1}], \"label\": \"inferred\", \"languages\": "
    "[{\"language\": \"typescript\", \"state\": \"assessed\"}, {\"language\": \"python\", \"state\": \"unevaluated\"}], \"coverage\", "
    "\"candidates\", \"secretPathsLeftOut\", \"setApart\", \"scanned\", \"incomplete\", \"unknown\", \"statements\": {\"edge\", "
    "\"sameUnit\", \"external\", \"noUnit\", \"unknown\"}, \"outsideGrammar\", \"edges\": [...], \"edgesNotListed\", \"files\": [...], "
    "\"filesNotListed\", \"facts\": [...], \"factsNotListed\"}`, with the bound policy's identity, or, where the pinned tree cannot be "
    "listed, `{\"format\": \"polaris-dossier-import-facts/1\", \"state\": \"unknown\", \"why\": \"the pinned tree could not be listed "
    "(<reason>)\"}` with the object reader's refusal reason and nothing else. `candidates` equals `secretPathsLeftOut` + `setApart` + "
    "`scanned` + `incomplete` + `unknown`, the last three counting every named file by its outcome, listed or not; `statements` counts "
    "every statement of every scanned or incomplete file by its outcome, listed or not, and `outsideGrammar` every outside-grammar form "
    "they hold. `edges` holds one entry per ordered pair of distinct units that some `edge` statement joins, `{\"from\", \"to\", "
    "\"statements\"}`, the two unit paths and how many `edge` statements join them, ordered by `from` and then `to` in code-unit order of "
    "the raw path. `files` holds one entry per named file, first every scanned or incomplete file and then every other, each in path "
    "order, `{\"path\", \"outcome\", \"unknownReason\", \"statements\", \"outsideGrammar\"}`, `outcome` being `scanned`, `incomplete` or "
    "`unknown`, `unknownReason` null except for an Unknown file, and the two counts null for an Unknown file and otherwise its counts, "
    "never a zero for a file not scanned. `facts` holds one entry per statement, `{\"id\", \"rule\", \"ruleVersion\", \"path\", "
    "\"lines\": [<first>, <last>], \"form\", \"outcome\", \"from\", \"to\", \"unknownReason\", \"epistemic\"}`, `rule` being the rule "
    "that took its operand, `from` and `to` its source and target unit paths where its outcome establishes them and otherwise null, "
    "`unknownReason` its reason for an `unknown` statement and otherwise null, and `epistemic` `unknown` for an `unknown` statement and "
    "otherwise `inferred`; facts are ordered by path, then first line, then last line, then position in the file, and `id` is "
    "`_import-<k>`, `<k>` counting from 1 in that order. A path is the raw repository path, escaped only as JSON escapes a string, "
    "except that a `path-not-citable` file's entry gives it in the census's shown form, as version 2.7 does. `coverage` is `complete` "
    "where `secretPathsLeftOut`, `incomplete`, `unknown`, `outsideGrammar` and the `unknown` statements are all zero, so that every "
    "candidate not set apart was scanned to its end, every statement found was decided and no form the grammar leaves undecided was "
    "found; otherwise `partial` where some file is `scanned`, or some "
    "statement or outside-grammar form of an `incomplete` file was kept; and otherwise `unknown`. A count of zero edges is a claim about "
    "the candidates not set apart only where `coverage` is `complete`, and is otherwise never read as the tree having no import between "
    "units. The three lists are listed as prefixes, `edges` first, then `files`, then `facts`, each in its order: an entry's size is "
    "the UTF-8 bytes it takes in the check record's text, its indentation and a separating comma and newline included, counted as "
    "though every entry, the last of its list among them, were followed by both, and entries are "
    "listed while the sizes of all entries listed, in the three lists together, stay within 1,900,000 bytes; the first entry of a list "
    "that would pass that bound, and every later entry of that list, is counted in its `edgesNotListed`, `filesNotListed` or "
    "`factsNotListed`, and the next list is then filled. So the member, encoded as the check record encodes it, takes fewer than "
    "2,000,000 bytes whatever the tree holds, its other members being counts, fixed words and the screening policy's identity, which "
    "Syzygy writes; with `manifestFacts`, the two members take fewer than 15,000,000 bytes. The member is deterministic: its bytes are a "
    "function of the pinned tree, the bytes of the blobs read, the screen the run loads, the run's content classes and the same check's "
    "`manifestFacts` member, so two checks of one run in which the reader refuses no read write byte-identical members whatever their "
    "drafts, and no clock, environment, locale, concurrency or traversal order enters it.")

insert_after(ANCHOR, P)

# The bytes this version changes, after the bytes version 2.14 changes.
B_ANCHOR = 'the provider mode renders no map page, link, member or remainder.'
B = (
    "These are the bytes version 2.NN changes. In the operator-agent mode every draft check record that check writes in its full form "
    "gains the member `importFacts`, immediately before `manifestFacts`, whatever the tree holds (a tree with no `.ts` file gives a "
    "member with zero candidates and `coverage` `complete`); with it, check's report, the close record's digest of such a record and "
    "any other digest of it change. The bounded "
    "form of version 2.10 holds no `importFacts`, as it holds no `manifestFacts`, and its bytes are unchanged; a record whose full form "
    "this member takes past the read bound is written in that bounded form, by version 2.10, with its one `check-record-bound` repair "
    "finding. So a draft whose full record version <PV> writes within the read bound, and which passes check there, fails check under "
    "this version where the member takes that record past the bound: the run's repair cycle counts that check as one with findings, "
    "every later step that takes the latest passed draft revision takes another or none, and that check's report (which then carries "
    "no `figureFit`), the run's `run-advice.json` (the bounded form counted among the records it read), the step log's findings count "
    "and the close record's digests of those files change with it. For every other draft no outcome changes. No other byte changes: the structure "
    "record (`derived/rev-<n>.json` and `derived-structure.json`), the `manifestFacts` member, its facts, their identities and its "
    "remainder, every inventory check record, the brief, every draft schema, every rendered page, `machine.json`, `dossier.json`, the "
    "size report, the review packets, every relation witness state and every provider-mode byte stay as version <PV> writes them, and "
    "the member adds no object read to any other step. A check record written before this version holds no `importFacts` and keeps its "
    "bytes and digest: every reader of a draft check record (review, render and close taking the latest passed draft revision, the "
    "reading difference reading an earlier run's records, the run's end screen counting outcomes) reads it under the same read bound and "
    "takes nothing from `importFacts` at this version, so a record with the member and one without are read alike.")
insert_after(B_ANCHOR, [B])

# Scenarios, after the predecessor's last scenario and before the Form line.
S = []
S.append((
    "Import facts give a workspace's unit graph",
    "a draft is checked under declared-source policy 2.0.0 against a fixture tree whose root `package.json` declares `workspaces` "
    "`[\"units/*\"]`, whose units/a/package.json and units/b/package.json name the packages `@w/a` and `@w/b`, and whose "
    "`units/a/src/index.ts` holds, on lines 1 to 4, `import { b } from '@w/b';`, `import type { T } from '../../b/src/types.js';`, "
    "`import './local.js';` and `import fs from 'node:fs';`, beside `units/a/src/local.ts` and `units/b/src/types.ts`, neither of "
    "which holds a statement",
    "the check record holds `importFacts`, `state` `derived`, immediately before `manifestFacts`, with `coverage` `complete`, three "
    "candidates all `scanned`, `statements` `{\"edge\": 2, \"sameUnit\": 1, \"external\": 1, \"noUnit\": 0, \"unknown\": 0}`, the one "
    "edge `{\"from\": \"units/a/package.json\", \"to\": \"units/b/package.json\", \"statements\": 2}`, and the facts `_import-1` "
    "to `_import-4` in line order with forms `import`, `import-type`, `side-effect` and `import`, rules `typescript-package-import`, "
    "`typescript-relative-import`, `typescript-relative-import` and `typescript-package-import`, and outcomes `edge`, `edge`, "
    "`same-unit` and `external`, each `epistemic` `inferred`",
    "`languages` states TypeScript assessed and Python unevaluated, no fact or count carries an operand's text, every line pair is a "
    "range the path-and-range check accepts for its path, and the structure record and `manifestFacts` are byte-identical to those the "
    "same check writes under version <PV>"))
S.append((
    "Comments, strings, templates and regular expressions hold no import",
    "a scanned file holds one genuine `import { a } from './a';` and, at other lines, the same words inside a line comment, a block "
    "comment, a single- and a double-quoted string, a template literal and a regular-expression literal, and in paired replays the "
    "genuine statement is moved wholly into each of those texts in turn; further files hold the top-level lines "
    "`if (c) /import x from 'y'/.test(s);`, `export default /import x from 'y'/;` and `const q = (a + b) / 2;`, and others "
    "`const r = x! / 2;` and `i++ / 2;`",
    "the first file gives exactly one fact, at the genuine statement's lines, and each replay gives no fact and no outside-grammar "
    "form at the moved text; the `if` and `export default` files are `scanned` with no fact, the `)` closing an `if` head and the "
    "word `default` each starting a regular-expression literal, and the `(a + b) / 2` file is `scanned`, its `/` a division",
    "the `x! / 2` and `i++ / 2` files are `incomplete`, the scan stopping at the `/` it cannot read either way rather than guessing, "
    "and no file states a fact for text inside a regular-expression literal"))
S.append((
    "Forms outside the grammar are counted and never resolved",
    "a scanned file holds a call `import('./a')`, a call `require('./b')`, a top-level `import c = require('./c');`, a top-level "
    "`import d from './d\\u0041';` whose operand holds a backslash, `import e from './e.json';`, `import f from '/abs/f';`, an "
    "`import g from './g';` inside a `declare module 'm' { }` block, the top-level statements `import h from '.';`, "
    "`import i from '..';`, `import j from '#internal';`, `import k from '';` and `import l from './dir/';`, and "
    "`import m from './m' with { type: 'json' };`",
    "the file's `outsideGrammar` is 13 and its `statements` is 0, none of those operands is resolved, named or counted as a statement, "
    "no operand comes out `external`, and `coverage` is `partial`, never `complete`",
    "a property call `obj.require('./n')`, a `function require(p)` declaration, `import.meta.url` and a namespace alias "
    "`import o = N.o;` are neither statements nor outside-grammar forms, and the same file without the thirteen forms has `coverage` "
    "`complete`"))
S.append((
    "Only a whole body the screen admits is scanned",
    "three otherwise equal candidates differ in one way each: the first's body holds a value a secret detector matches, the second's "
    "path lies under a directory whose name a secret detector matches, and the third lies under a tests-path segment",
    "the first is a named file Unknown with reason `secret-detector-match`, never scanned and with null counts; the second is counted "
    "in `secretPathsLeftOut` and named nowhere; and the third is counted in `setApart` and never named or read",
    "`coverage` is `partial` or `unknown` and never `complete` while the first two are present, no text of the first body reaches the "
    "record or the report, and removing only the first two candidates makes `coverage` `complete`"))
S.append((
    "An interrupted scan keeps what closed before it",
    "one candidate holds a complete `import { a } from '../x/a';` on line 1 and an unterminated template literal from line 3, and a "
    "paired candidate holds the unterminated template from line 1 and the same statement after it",
    "the first file is `incomplete` with one statement kept and `coverage` `partial`; the paired file, alone in its tree, is "
    "`incomplete` with no statement and `coverage` `unknown`",
    "neither tree states zero edges as a claim about the tree, and in neither is text after the interruption read for statements"))
S.append((
    "An undecidable target address is Unknown, never passed over",
    "a statement `import { y } from '../lib/y';` has the address `lib/y.ts` held as a blob whose screen path outcome is "
    "`unknown-extraction-class` and the address `lib/y/index.ts` held as an admitted blob in another unit, and in paired replays the "
    "first address is absent, held as a tree, or held as a symbolic link, and a further statement "
    "`import { w } from './link/../w';` names a path through a directory segment `link` the listing holds as a symbolic link",
    "the first case is `unknown` with reason `target-undecidable`, names no target or target unit and names neither address; the "
    "absent and tree replays pass the first address over, resolve to `lib/y/index.ts` and give an `edge` to that file's unit; and the "
    "symbolic-link replay and the `./link/../w` statement are `unknown` with reason `target-undecidable`",
    "no target body and no link target is read in any case, as an instrumented reader shows"))
S.append((
    "A package name resolves only against complete manifest facts",
    "`import { z } from '@w/z';` is checked in four trees: one where exactly one `package.json` names `@w/z`, one where two do, one where "
    "none does and the `npm-package-manifest` entry is complete, and one where none does and one `package.json` is Unknown "
    "(`unparsed`)",
    "the outcomes are `edge` (or `same-unit` where the importing file lies in that package), `unknown` with `target-ambiguous`, "
    "`external`, and `unknown` with `target-undecidable`",
    "a subpath `@w/z/sub` resolves as `@w/z` does, and in two further trees, one holding a set-apart `package.json` under a "
    "tests-path segment and one where exactly one `package.json` names `@w/z` and another is Unknown (`unparsed`), the outcome is "
    "`unknown` with `target-undecidable`, never `external` and never `edge`"))
S.append((
    "An undecidable source unit is Unknown",
    "a scanned file's nearest enclosing `package.json` entry is a symbolic link, and in a paired replay the same directory holds no "
    "`package.json` and the root does",
    "the first file's statements are `unknown` with reason `source-unit-undecidable`, and the replay's statements take the root "
    "`package.json` as their source unit",
    "a file under no `package.json` at all gives statements of outcome `no-unit`, which are no edge and are not Unknown"))
S.append((
    "Read limits are inclusive and stop in path order",
    "synthetic trees hold a candidate of exactly 262,144 bytes and one of 262,145 bytes; 2,000 and then 2,001 named files that no "
    "reason of version 2.7 reaches; and files whose bytes reach exactly 16,777,216 and then pass that total",
    "the 262,144-byte file is scanned and the 262,145-byte file is Unknown (`too-large`); the 2,001st file in path order is Unknown "
    "(`over-read-limit`) and not read; and the file whose bytes pass the total, and every later file, is Unknown (`over-read-limit`) and "
    "not scanned",
    "each such file is counted in `unknown` and the `coverage` is `partial`"))
S.append((
    "Listing stops at the byte budget and counts the rest",
    "a synthetic tree's facts, files and edges together would take more than 1,900,000 bytes as listed entries",
    "`edges` is listed first, then `files`, then `facts`, each as the longest prefix within the budget, the rest counted in its "
    "`NotListed` member, and the counts of `statements`, `scanned`, `incomplete` and `unknown` still count every statement and file",
    "the member takes fewer than 2,000,000 bytes, and the check record is within the read bound or written in its bounded form, which "
    "holds no `importFacts`"))
S.append((
    "A byte-order mark and CRLF lines keep line numbers citable",
    "a scanned file begins with U+FEFF, ends its lines with CRLF, and holds `import { a } from '../x/a';` on its line 2 and a "
    "statement spanning its lines 4 to 6",
    "the file is `scanned`, the first statement's `lines` is `[2, 2]` and the second's `[4, 6]`, and the path-and-range check accepts "
    "both ranges as citations of the file's path",
    "the same file with LF lines and no U+FEFF gives the same facts and the same `lines`"))
S.append((
    "Earlier records and every other output keep their bytes",
    "a run's earlier check record written before this version is read back by review, render and close, and the same draft, whose "
    "full check record lies within the read bound under both versions, is checked and rendered under this version, in both modes",
    "the earlier record keeps its bytes and digest and is read as before, with no `importFacts`; the new record differs from the "
    "version <PV> record only by the `importFacts` member",
    "every rendered page, `machine.json`, `dossier.json`, `derived-structure.json`, the size report, the review packets, every relation "
    "witness state and the provider-mode pages are byte-identical to those version <PV> gives"))

block = ''
for name, when, then, and_ in S:
    block += f"\n#### Scenario: {name}\n\n- **WHEN** {sym(when)}\n- **THEN** {sym(then)}\n- **AND** {sym(and_)}\n"
F_ANCHOR = '\nForm: event-response.'
n = text.count(F_ANCHOR)
assert n == 1, n
text = text.replace(F_ANCHOR, block + F_ANCHOR, 1)

assert text.count('2.NN') == 4, text.count('2.NN')
text = text.replace('2.NN', VERSION)
out.write_text(text, encoding='utf-8')
print('built', out, len(text.split('\n')), 'lines')
