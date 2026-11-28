#!/usr/bin/env python3
"""Build the version 2.45 MODIFIED REQ-polaris-generation-034 (imports corroboration) from the version 2.44 bytes by anchored edits (syzygy-3efd.86).

Every edit asserts its anchor occurs exactly once. Usage: imports_witness_build_spec.py <worktree> <out>.

The predecessor is rough-edge markers 2.44 (this change was first built as 2.42 over migration bounds 2.41, then as 2.44 over migration bounds 2.43; neither number landed). Rule `relation-witness` gains an `imports` row read from the 2.39 `importFacts` member and a
`corroborated` state that is never Observed (design.md D1 to D4).
"""
import pathlib
import sys

W = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])
PREDECESSOR = 'openspec/changes/dossier-rough-edges/proposed/polaris-generation/spec.md'
src = (W / PREDECESSOR).read_text(encoding='utf-8')
text = src


def replace(old, new):
    global text
    n = text.count(old)
    assert n == 1, (n, old[:90])
    text = text.replace(old, new, 1)


lines = text.split('\n')
assert lines[0].startswith('# Dossier rough-edge markers'), lines[0]
assert lines[2].startswith('Candidate version 2.44.'), lines[2][:40]
lines[0] = '# Dossier imports corroboration: an imports arrow read against the stored lexical import facts'
lines[2] = ("Candidate version 2.45; binds nothing until its agent adoption row in AGENT-ADOPTIONS.md and its version tag. One MODIFIED "
            "requirement, REQ-polaris-generation-034, whose complete text below replaces the effective text that rough-edge markers version "
            "2.44 gave it. Rule `relation-witness` becomes version 2: it gains a row for `imports`, read from the `importFacts` member of "
            "version 2.39, and a witness state `corroborated`, which an `imports` arrow takes where an import statement of the source "
            "unit names the target unit. The row is lexical and Inferred: a corroborated arrow keeps the draft's marking and is never "
            "Observed, the import rules stay out of the eligibility table, and an `imports` arrow no fact joins is Unknown, never "
            "challenged, whatever the member's coverage. No schema, brief, finding or check record changes. Every other sentence and "
            "scenario of the predecessor is carried unchanged but one carried scenario's `imports` case; the exact changes are in "
            "SEMANTIC-DELTA.md. Unmentioned effective requirements are unchanged.")
text = '\n'.join(lines)

# 2.39's statement that nothing reads the member holds until this version.
replace("At this version no page, `machine.json` or `dossier.json` member, figure, brief, review packet or published file carries the "
        "member or anything taken from it, no draft element is upgraded by it, and no rule of version 2.19 reads it: an `imports` arrow "
        "keeps the witness state that version gives it.",
        "At version 2.39 no page, `machine.json` or `dossier.json` member, figure, brief, review packet or published file carries the "
        "member or anything taken from it, no draft element is upgraded by it, and no rule of version 2.19 reads it: an `imports` arrow "
        "keeps the witness state that version gives it. From version 2.45 rule `relation-witness` version 2 reads it, and a page and "
        "`machine.json` carry a corroborating import fact's identity and rule, as that version states; still no draft element is "
        "upgraded to Observed by it.")

# The carried scenario whose `imports` case version 2 decides otherwise.
replace("- **THEN** no edge is drawn solid or labelled Observed and check reports no finding for any of them; `e1` and `e2` are "
        "`unknown` with `no-witness-rule`, and `e3`",
        "- **THEN** no edge is drawn solid or labelled Observed and check reports no finding for any of them; `e1` carrying `relates-to` "
        "or `calls`, and `e2`, are `unknown` with `no-witness-rule`, `e1` carrying `imports` is `unknown` with "
        "`endpoint-kind-mismatch` (version 2.45), and `e3`")

# The rule's version 2, after the render paragraph of version 2.19 and before brief v15's.
ANCHOR = "A `challenged` state at a render, which only a difference between what the render derives and what check derived can give, keeps the draft's marking on the page and is carried in `machine.json` as it is."
replace(ANCHOR, ANCHOR + '''

Version 2.45 makes rule `relation-witness` version 2: version 1 with one row more, for `imports`, and one witness state more, `corroborated`. Every statement of this requirement about rule `relation-witness` version 1 holds for version 2 except as this paragraph and the next state, and from version 2.45 every decision this requirement assigns to rule `relation-witness`, of a graph edge, of a cited or derived relationship and of a nesting or a `parent`, is made by version 2, at check and at each render; a literal finding detail that names version 1, as the `relationship-not-derivable` detail of version 2.24 does, is kept verbatim. The `imports` row is a corroborating row: `imports` is corroborated only by an import fact (version 2.39) whose `outcome` is `edge`, of rule `typescript-relative-import` or `typescript-package-import` version 1, from a `package-manifest` unit to a `package-manifest` unit; a fact joins two units where its `from` equals the source unit's `path` and its `to` the target unit's `path`, in exact code units. The row states only that a TypeScript file of the source unit holds a top-level static import or re-export statement whose operand names, by the finite rules of version 2.39, a file or a package of the target unit; never that the code is compiled, loaded, reached or called, and never that a unit does not import another. Every form version 2.39 gives an `edge` fact corroborates, `import`, `import-type`, `side-effect`, `re-export` and `re-export-type` alike, so a type-only import, which compilation erases, corroborates as a value import does, and the evidence text below names the fact's form so that a reader can tell them apart. The row is not in the eligibility table and its two rules do not enter it at this version, since an import fact is Inferred whatever evidence exists: a corroborated edge is never Observed, and an `imports` edge becomes `witnessed` only by a later version of this requirement that adds those rules to the eligibility table under every condition the eligibility paragraph above states. For an `imports` edge the order above reads so: the cases `no-witness-rule` and `recognizer-not-eligible` never apply; the record the row reads is the `importFacts` member, and an edge is `unknown` (`facts-unknown`) where that member is absent or in `state` `unknown`; an edge whose two units an `edge` fact joins is `corroborated`, naming that fact (the first such fact in the member's `facts` order), in place of `witnessed`; and every other `imports` edge is `unknown` (`coverage-partial`), the reason naming the coverage of the relation and not the member's, never `challenged`, whatever the member's `coverage`, since the member reads `.ts` files alone and leaves every other language unevaluated, and a fact its `facts` list leaves out (`factsNotListed`) could hold the statement. So no `imports` edge draws a `relation-challenged` finding, and the absence of an import fact is never read as the absence of an import. A `same-unit`, `external`, `no-unit` or `unknown` statement corroborates nothing, and the `edges` list, which names no fact, is not read. Check decides the `imports` edges from the `importFacts` member it derives for the revision. Each render decides them from the `importFacts` member of the check record of the draft revision it renders, read as it reads that record under the read bound of version 2.10, and never scans a body for them; a record written before version 2.39, or written in its bounded form, holds no such member, so its `imports` edges are `unknown` (`facts-unknown`). A derived relationship (version 2.24) still names only a relation that a row of the eligibility table joins, so a derived `imports` relationship still draws `relationship-not-derivable`. Brief v15's sentence that only `contains` can be witnessed stays true: corroboration is not witnessing, and no brief changes.

A `corroborated` edge is the draft's claim and renders as version 2.16 renders an edge, with the draft's marking, label and citations, counted in every count of the draft as any edge is, its figure's tally, legend and line style unchanged; its arrow and its list item carry `data-relation`, `data-witness-state="corroborated"`, `data-witness-fact` (the import fact's identity), `data-witness-rule` and `data-witness-rule-version`, and its list item gains, after the draft's text, the DOM text, clipped in the reading view by the renderer's visually-hidden class and shown in the evidence view, `Evidence: label Inferred, as the draft marks it; corroborated by import fact <fact id>, a lexical <form> statement found by Syzygy by rule <rule> version <version> at revision <full revision>; import facts sha256:<hex>.`, `<form>` being the fact's `form` and `<hex>` the SHA-256 of the `importFacts` member the render read, its bytes as the check record holds them, which version 2.39 makes a function of the run and the pinned tree and never of the draft. No path, line, operand or unit path of the import fact is rendered. A corroborated cited relationship of a v12 or later draft renders in its first figure (version 2.24) as this paragraph states; in each later figure that draws it, its list item takes the form version 2.24 gives such an item, `<from> → <to>: <label>, as shown in <a href="<href>"><title></a>`, with no claim anchor, no citation and no evidence text, and that item and the relationship's arrow there carry the `data-relation` and `data-witness-*` attributes above, so every figure that draws it shows the one state decided for it. For the parity of version 2.24, a render of a migrated draft reads the `importFacts` member of the check of that draft in the run; where neither that check nor the check of the draft it was migrated from has a refused read, version 2.39 makes the two members byte-identical, so every `imports` edge and the relationship it migrates to take one state and one fact, the evidence text and its digest are the same bytes, and the parity holds for them; where either check has a refused read, no parity is stated for a figure that draws an `imports` edge, or for that figure's entry. `machine.json` carries such an edge's `witness` as `{"state": "corroborated", "reason": null, "fact", "rule", "ruleVersion"}`, the import fact's identity, rule and version, its entry labelled as the draft marks it, and every other edge as before. These are the bytes version 2.45 changes. In the operator-agent mode: on a page that draws an `imports` edge whose state version 1 gave as `unknown` (`no-witness-rule`), that edge's arrow and list item where an import fact corroborates it, with the evidence text, and that edge's `witness` member in `machine.json` (`corroborated`, or `unknown` with the reason version 2 gives), with the page's measures in the size report. No check record, finding, schema, brief, figure-fit member, reading ledger, `dossier.json` byte or provider-mode byte moves, and a draft holding no `imports` edge renders byte for byte as before.''')

# Scenarios, before the one Form line.
FORM = '\nForm: event-response.\n'
assert text.count(FORM) == 1
at = text.index(FORM)
SCENARIOS = '''
#### Scenario: An import statement corroborates an imports arrow

- **WHEN** a schema-v9 graph figure has nodes `web` and `core` whose units are `{"kind": "package-manifest", "path": "web/package.json"}` and `{"kind": "package-manifest", "path": "core/package.json"}`, and an Inferred edge `i1` from `web` to `core` with relation `imports`; and the check's `importFacts` member is `derived`, its first `edge` fact joining those two units being `_import-3`, of rule `typescript-relative-import` version 1
- **THEN** check reports no finding for `i1`, and the render draws it with the draft's marking, label and citations, never solid and never with `data-epistemic="observed"`, its arrow and list item carrying `data-relation="imports"`, `data-witness-state="corroborated"`, `data-witness-fact="_import-3"`, `data-witness-rule="typescript-relative-import"` and `data-witness-rule-version="1"`
- **AND** its list item's evidence text names `_import-3`, its form, rule `typescript-relative-import` version 1, the pinned revision and the digest of the `importFacts` member, and no path, line or operand of the fact; `machine.json` carries `i1` with `witness` `{"state": "corroborated", "reason": null, "fact": "_import-3", "rule": "typescript-relative-import", "ruleVersion": 1}`, labelled as the draft marks it; and the draft's counts and the figure's tally and legend equal those of the same draft whose `i1` is `unknown`
- **AND** the evidence text reads `a lexical import-type statement` where `_import-3`'s `form` is `import-type`, and `i1` is corroborated as before; a `typescript-package-import` fact joining the two units corroborates `i1` as `_import-3` does, naming that rule; and where the member's only `edge` fact runs from the unit of `core` to the unit of `web`, `i1` is `unknown` with `coverage-partial`
- **AND** the same draft migrated to schema v12 and checked in the same run with no refused read renders `i1`'s relationship corroborated by `_import-3`, with byte-identical evidence text, `import facts sha256:` digest and figure, and no byte of the evidence text names the check record

#### Scenario: A missing import fact is never read as no import

- **WHEN** the same edge `i1` is checked over an `importFacts` member that is `derived` and holds no `edge` fact from the unit of `web` to the unit of `core`, once with `coverage` `complete`, once with `coverage` `partial`, and once with `factsNotListed` above zero
- **THEN** `i1` is `unknown` with `coverage-partial` each time, never `challenged`, check reports no `relation-challenged` finding, and nothing on the page or in `machine.json` states that `web` does not import `core`
- **AND** a `same-unit` statement of the unit of `web` corroborates no `imports` edge from `web` to `web`, which is `unknown` with `coverage-partial`, and an `external` statement naming a package no unit declares corroborates nothing

#### Scenario: Import facts that cannot be read leave the arrow Unknown

- **WHEN** the same edge `i1` is rendered from a check record that holds no `importFacts` member, because it was written before version 2.39 or, in an injected record since a bounded record's revision never reaches a render, in its bounded form, or from one whose member is in `state` `unknown`
- **THEN** `i1` is `unknown` with `facts-unknown`, whatever the structure record and the `manifestFacts` member hold, and the render scans no file body for it
- **AND** an `imports` edge from a node whose unit is a `top-level-directory` to `core` is `unknown` with `endpoint-kind-mismatch`, an `imports` edge from a node with no `unit` to `core` is `unknown` with `endpoint-without-unit`, an `imports` edge the draft labels Unknown is `unknown` with `edge-not-inferred`, and a v12 derived relationship with relation `imports` still draws a `relationship-not-derivable` finding

#### Scenario: A corroborated relationship shown in two views

- **WHEN** a schema-v12 draft's model holds elements `web` and `core` with the two `package-manifest` units above and an Inferred cited relationship `i1` from `web` to `core` with relation `imports`, which the views of two produced graph diagrams, `deps` and then `layers`, both select, both rendering as figures on `index.html`; and the check's `importFacts` member is `derived`, its first `edge` fact joining the two units being `_import-3`
- **THEN** in `deps`, `i1`'s list item carries its claim anchor, its citations and the evidence text naming `_import-3`, and in `layers` its item reads `web → core: <label>, as shown in <a href="#figure-deps">…</a>` with no claim anchor, no citation and no evidence text
- **AND** in both figures `i1`'s arrow and list item carry `data-witness-state="corroborated"` and `data-witness-fact="_import-3"`, `i1` is counted once among the draft's claims, and `machine.json`'s `model` member carries its `witness` once, as `corroborated`'''
text = text[:at] + '\n' + SCENARIOS.strip('\n') + '\n' + text[at:]


def extend(end, addition):
    replace(end, end[:-1] + addition)


extend("spread over several diagrams, migrated to schema v12.",
       "; and, for version 2.45, graph figures holding `imports` edges between `package-manifest` units, over `importFacts` members "
       "with and without a joining `edge` fact, with `complete`, `partial` and `unknown` coverage, with facts not listed, and check "
       "records without the member.")
extend("each migrated draft's element and relationship counts and check's findings on it.",
       "; for version 2.45, each `imports` edge's witness state and reason at check and at render, its attributes and evidence text, "
       "and its `machine.json` `witness` member.")
extend("and the expected `schema` finding written before check runs.",
       "; for version 2.45, each `imports` edge's expected state, reason and fact written as literals from the fixture's import "
       "facts before the rule runs.")
extend("a nesting is counted as a relationship, or the migration yields no draft for it.",
       "; for version 2.45, an `imports` edge renders Observed or solid, is `challenged` or draws a `relation-challenged` finding, "
       "is corroborated by a fact whose outcome is not `edge` or that joins other units, or a page or `machine.json` names an "
       "import fact's path or operand.")

assert '2.NN' not in text
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(text, encoding='utf-8')
print('ok', len(src.split('\n')), len(text.split('\n')))
