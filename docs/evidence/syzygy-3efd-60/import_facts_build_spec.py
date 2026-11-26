#!/usr/bin/env python3
"""Build the version 2.NN MODIFIED REQ-polaris-generation-034 (lexical import facts) from the version 2.33 bytes by anchored edits (syzygy-3efd.60).

Every edit asserts its anchor occurs exactly once. Usage: import_facts_build_spec.py <worktree> <out>.
"""
import pathlib
import sys

W = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])
PRED = 'openspec/changes/dossier-figure-plan/proposed/polaris-generation/spec.md'
text = (W / PRED).read_text(encoding='utf-8')

# The successor's numbers, kept symbolic so a rebuild over a later predecessor changes these constants and the anchors alone.
NUMS = {'<PV>': '2.33', '<PN>': 'figure plan'}


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
assert lines[0].startswith('# Dossier figure plan'), lines[0]
assert lines[2].startswith('Candidate version 2.33;'), lines[2][:40]
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
    "A scanned body is read as TypeScript tokens from its first code point. A statement of the grammar begins at a top-level `import` or "
    "`export` token, top-level meaning outside every brace, parenthesis, bracket and template substitution, and takes one of these "
    "forms, its module operand being one string literal, single- or double-quoted, holding no backslash and no line terminator: "
    "`import`, an import clause, `from` and the operand (form `import`, or `import-type` where the clause begins with `type` followed "
    "by `{`, `*` or an identifier other than `from`); `import` followed directly by the operand (form `side-effect`); and `export`, "
    "optionally `type`, then `*`, `* as` and an identifier, or a brace-delimited export clause, then `from` and the operand (form "
    "`re-export`, or `re-export-type` where `type` is written). These are outside the grammar and counted in `outsideGrammar`, never "
    "resolved: a top-level `import` followed by an identifier and `=` (an import-equals declaration); an `import` token followed by `(` "
    "and an identifier `require` followed by `(` that is not the operand of such a declaration, wherever either stands "
    "outside the texts named next; and a top-level form above whose "
    "operand is not such a literal or whose operand a rule below calls outside the grammar. Text inside a line comment, a block comment, "
    "a string literal, a template literal outside its substitutions or a regular-expression literal is never a statement and never an "
    "outside-grammar form. A `/` that does not begin a comment begins a regular-expression literal where the significant token before "
    "it is none, punctuation other than `)`, `]` and `}`, an operator, or one of the words `return`, `typeof`, `case`, `do`, `else`, "
    "`in`, `instanceof`, `new`, `delete`, `void`, `throw`, `yield`, `await` and `of`, and a division operator where that token is any "
    "other identifier, a number, a string, the end of a template, `)` or `]`. Wherever the scan cannot establish a token boundary (a `/` "
    "after `}` that begins no comment, an unterminated comment, string, template or regular-expression literal, or a code point the "
    "TypeScript lexical grammar does not allow outside them), the scan stops there and the file is `incomplete`: the statements and "
    "outside-grammar forms whose last token ends before that point are kept, and no later text of the file is read for them. A body the "
    "scan reads to its end is `scanned`. A statement's lines are the first and last lines holding a code point of it, numbered as the "
    "path-and-range check numbers them, so `[first, last]` is a range that check accepts as a citation of its path.")
# P4: the units, and the two resolution rules.
P.append(
    "Each statement is collapsed to units, from the tree listing and the `manifestFacts` member alone; no target body is read. A file's "
    "unit is the `package.json` entry of the nearest directory enclosing the file, its own directory first and the root last. Where no "
    "enclosing directory holds an entry named `package.json`, the file lies in no unit; where the nearest such entry is not a blob of "
    "mode 100644 or 100755, or is one whose path a secret detector matches, which is set apart, or whose path is not citable, the file's "
    "unit is undecidable. Rule `typescript-relative-import` version 1 takes an operand beginning with `./` or `../`: it is joined to the "
    "importing file's directory and normalised by segments, and one that would leave the root is outside the grammar. Its candidate "
    "addresses are that path where its last segment ends in `.ts`; that path with a final `.js` replaced by `.ts` where it ends in `.js`; "
    "and `<path>.ts` then `<path>/index.ts` where its last segment holds no `.`; an operand of any other form (one ending in `.json`, "
    "`.mjs` or `.css`, for example) is outside the grammar. The rule takes the addresses in that order and stops at the first that the "
    "listing holds as a blob of mode 100644 or 100755: that address is the target where its path is citable, no secret detector matches "
    "it or any of its directory prefixes, and the screen's path outcome and the class gate admit it as they would admit a cited blob; "
    "otherwise the target is undecidable, and the statement names nothing. An address the listing holds as any other entry, or does not "
    "hold, is passed over; where every address is passed over the target is absent. Rule `typescript-package-import` version 1 takes "
    "every other operand that does not begin with `/` (one that does is outside the grammar): its package name is its first segment, or "
    "its first two where the first begins with `@`. Where the `manifestFacts` member is `unknown`, the target is undecidable; where "
    "exactly one `package` fact of rule `npm-package-manifest` version 1 in that member has that `name`, the target unit is that fact's "
    "`path`; where two or more do, the target is ambiguous; and where none does, the operand names no unit of the tree where that "
    "recognizer's entry has `secretPathsLeftOut`, `unknown`, `valuesLeftOut` and `filesNotListed` all zero and the member's "
    "`factsNotListed` is zero, and otherwise the target is undecidable, since a package a left-out, Unknown or unlisted file declares "
    "could hold the name. A relative statement's target unit is the unit of its target, by the unit rule above.")
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
    "where `secretPathsLeftOut`, `incomplete`, `unknown` and the `unknown` statements are all zero, so that every candidate not set "
    "apart was scanned to its end and every statement found was decided; otherwise `partial` where some file is `scanned`, or some "
    "statement or outside-grammar form of an `incomplete` file was kept; and otherwise `unknown`. A count of zero edges is a claim about "
    "the candidates not set apart only where `coverage` is `complete`, and is otherwise never read as the tree having no import between "
    "units. The three lists are listed as prefixes, `edges` first, then `files`, then `facts`, each in its order: an entry's size is "
    "the UTF-8 bytes it takes in the check record's text, its indentation and separating comma and newline included, and entries are "
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
    "member with zero candidates and `coverage` `complete`); with it, check's report and any digest of such a record change. The bounded "
    "form of version 2.10 holds no `importFacts`, as it holds no `manifestFacts`, and its bytes are unchanged; a record whose full form "
    "this member takes past the read bound is written in that bounded form, by version 2.10. No other byte changes: the structure "
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
    "genuine statement is moved wholly into each of those texts in turn",
    "the first file gives exactly one fact, at the genuine statement's lines, and each replay gives no fact and no outside-grammar "
    "form at the moved text",
    "a `/` after `)` reads as division and one after `return` as the start of a regular expression, as the token rule states, and "
    "neither changes the count"))
S.append((
    "Forms outside the grammar are counted and never resolved",
    "a scanned file holds a call `import('./a')`, a call `require('./b')`, a top-level `import c = require('./c');`, a top-level "
    "`import d from './d\\u0041';` whose operand holds a backslash, `import e from './e.json';`, `import f from '/abs/f';` and an "
    "`import g from './g';` inside a `declare module 'm' { }` block",
    "the file's `outsideGrammar` is 6 and its `statements` is 0, and none of those operands is resolved, named or counted as a statement",
    "the statement inside the block is neither a statement nor an outside-grammar form, being nested"))
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
    "first address is absent, or held as a symbolic link",
    "the first case is `unknown` with reason `target-undecidable`, names no target or target unit and names neither address, and "
    "both replays resolve to `lib/y/index.ts` and give an `edge` to that file's unit",
    "no target body is read in any case, as an instrumented reader shows"))
S.append((
    "A package name resolves only against complete manifest facts",
    "`import { z } from '@w/z';` is checked in four trees: one where exactly one `package.json` names `@w/z`, one where two do, one where "
    "none does and the `npm-package-manifest` entry is complete, and one where none does and one `package.json` is Unknown "
    "(`unparsed`)",
    "the outcomes are `edge` (or `same-unit` where the importing file lies in that package), `unknown` with `target-ambiguous`, "
    "`external`, and `unknown` with `target-undecidable`",
    "a subpath `@w/z/sub` resolves as `@w/z` does, and an operand naming a package whose declaring file is set apart is `external` "
    "only where the entry's counts above are zero, a set-apart file being outside the recognizer's facts"))
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
    "Earlier records and every other output keep their bytes",
    "a run's earlier check record written before this version is read back by review, render and close, and the same draft is checked "
    "and rendered under this version, in both modes",
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

out.write_text(text, encoding='utf-8')
print('built', out, len(text.split('\n')), 'lines')
