#!/usr/bin/env python3
"""Build the MODIFIED REQ-polaris-generation-034 that advises on walk steps restating their element's label (syzygy-3efd.35).

Built from the view levels 2.47 bytes by anchored edits; every edit asserts its anchor occurs exactly once.
Usage: walk_advice_build_spec.py <worktree> <out>.

The rule (`walk-step-restates-label` version 1) is report-only advice on check's report, member `walkAdvice`,
in the manner of 2.33's `figureAdvice`: it gates nothing and moves no other byte (design.md D1 to D7).
"""
import pathlib
import sys

V = '2.48'
W = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])
PREDECESSOR = 'openspec/changes/dossier-view-levels/proposed/polaris-generation/spec.md'
src = (W / PREDECESSOR).read_text(encoding='utf-8')
text = src


def replace(old, new):
    global text
    n = text.count(old)
    assert n == 1, (n, old[:90])
    text = text.replace(old, new, 1)


FILLER = ('a an and are as at be by for from here in is it its of on or see shown shows step that the then these this '
          'those to with').split()
assert len(FILLER) == 30 and FILLER == sorted(FILLER) and len(set(FILLER)) == 30
FILLER_TEXT = ', '.join(f'`{w}`' for w in FILLER)

lines = text.split('\n')
assert lines[0].startswith('# Dossier view levels'), lines[0]
assert lines[2].startswith('Candidate version 2.47;'), lines[2][:40]
lines[0] = '# Dossier walk advice: a step whose paragraph only restates its element\'s label'
lines[2] = (f"Candidate version {V}; binds nothing until its agent adoption row in AGENT-ADOPTIONS.md and its version tag. One "
            "MODIFIED requirement, REQ-polaris-generation-034, whose complete text below replaces the effective text that view "
            "levels version 2.47 gave it. Check's report gains a member `walkAdvice`, rule `walk-step-restates-label` version 1: "
            "advice to the author on each walk step whose paragraph adds no word to the label of the element the step names, "
            "after a stated normalisation, with a threshold of zero new words. It is advice only, in the manner of 2.33's "
            "`figureAdvice`: it gates nothing, is absent under a `schema` finding, carries no draft text, and moves no finding, "
            "record, page or brief. No draft schema or brief version is added. Every other sentence and scenario of the "
            "predecessor is carried unchanged; the exact changes are in SEMANTIC-DELTA.md. Unmentioned effective requirements "
            "are unchanged.")
text = '\n'.join(lines)

DETAIL = ("`` <diagram> step <n>: paragraph <block> adds no word to its element's label; say what a reader learns about that "
          "element at this step ``")

ADDED = f'''From version {V}, for a v16 or v17 draft whose check reports no finding of kind `schema`, `syzygy dossier check` SHALL compute walk advice and SHALL carry it on its report as the member `walkAdvice`; check SHALL write it into no check record and no other file. The member is `{{"rules": [{{"id": "walk-step-restates-label", "version": 1}}], "examined": <count>, "advisories": [...]}}`, where `examined` counts the steps the rule reads. It reads every step of every walk that has no finding at or below the walk's path, `$.sections[<i>].walk` or `$.deepDives[<i>].walk`, whatever the disposition of the walk's figure or place. A step whose `element` is a base end, in a view whose base map is not established at check, is not read and not counted; nor is a step naming a base element that is withheld at check, whose screening is Unknown there, or whose label check cannot admit for output under version 2.35. Each advisory is `{{"rule", "at", "detail"}}`, `at` being the step's path, `<walk>.steps[<k>]`; advisories are in the order version 2.40 takes walks, the sections' before the deep dives', each walk's steps in order, and the rule gives at most one advisory for a step. Rule `walk-step-restates-label` version 1 advises on a step whose paragraph adds no word to its element's label. Two texts are read. The paragraph's text is the `text` of the block the step's `block` names followed, for a block with children, by each child's `text` in order, as the RS-19 advice reads a block's words, the parts joined by one space. The label is, for an element of the model, its `label` as the draft writes it; for a node of a diagram that carries no `view`, the node's `label`; for a node of a view's expansion, the label the expansion gives it; and for a base element, Syzygy's label for it as version 2.40 states (`Repository root`, `<path>/ (<count> files)`, or a package's or module's `<name>`), never a display name a `names` entry gives it. Each text is reduced to words the same way, code point by code point, a lone surrogate being one code point that is neither L nor N: each letter A to Z is replaced by its lowercase letter, each code point that is neither a letter nor a number, by the Unicode general categories L and N, is replaced by a space, and the result is split at every run of spaces, empty strings dropped; no other code point is changed. The general categories are those of the Unicode version the build's runtime ships, and no normalization form is applied, so a composed and a decomposed form of one text may give different words. A paragraph word is filler where it is one of these 30 words: {FILLER_TEXT}. A paragraph word matches a label word where the two are equal, or where one is the other followed by `s` or by `es`. The paragraph restates the label where every paragraph word that is not filler matches some word of the label: so a paragraph of filler words alone restates any label, and one paragraph word that is neither filler nor a match, a digit string or a word of another element's label among them, stops the advice. The threshold is zero new words: the rule never fires at one. A paragraph with no word restates any label, and a label with no word is restated only by such a paragraph or one of filler words alone. The rule advises on such a step with the detail {DETAIL}, `<diagram>` being the walk's `figure`, `<n>` the step's number, its index plus 1, and `<block>` the step's `block`. Several steps naming one block are each read and each advised on.

The advice is Inferred, a computation over the draft's bytes and, for a base element's label, the base map check establishes, that reads no other blob, layout, record or fact, and two checks of the same draft bytes give the same member. A failure to compute it, at any point and for any cause, SHALL NOT refuse or fail a check: the report then carries no `walkAdvice` member. Each advisory is one a change to the draft clears, so it is advice to the author in the sense of version 2.9, and, like `figureAdvice`, it carries no class member and is on the report beside the `author`-class advice. It gates nothing: it is no repair finding, sets no outcome, exit status or readiness, is read by no render, review or close, and is counted by no reading ledger, reading difference, `run-advice.json`, size report or page. Whether a step's paragraph explains its element stays the authoring session's report and the fidelity and rendered-design reviews' judgement, as version 2.40 states; a step the rule passes may still only narrate the picture, and a step it advises on may stand where the author judges it right. No advisory carries a word of a paragraph or a label: its detail names the figure's and the paragraph's identities, which are handles, and a step number, never a base path, a base element's label or a `names` display name, so no draft text and no path reaches the report through this member: it treats identities as versions 2.40 and 2.47 do, and it carries no value version 2.35 screens. The rule reads no `level`, `scope`, zoom link or `data-view-*` attribute of version 2.47: a step's element in a levelled view is labelled as in any view. A check of a draft whose schema is earlier than v16 (the readings of versions 2.40 and 2.47 that extend a named schema do not apply to this sentence), of a v16 or v17 draft with a `schema` finding, or of an inventory carries no `walkAdvice` member, and its absence says nothing about the walks; a v16 or v17 draft with no walk carries the member with `examined` 0 and no advisory.

The member is the only byte this version moves: the findings, every record check writes, `figureAdvice`, `readerAdvice`, `run-advice.json`, `machine.json`, `dossier.json`, the reading ledger, the size report, every page, the brief and its record are those version 2.47 gives for the same draft and run, and a check's report differs from version 2.47's only by `walkAdvice`. Wherever this requirement says that a draft is checked exactly as an earlier version checks it, that statement compares findings, records and rendered bytes and does not reach this member. No draft schema and no brief version is added: a draft states nothing new, and the brief, which carries no rule of check's advice, is unchanged. The provider mode is unaffected: the provider stages' closed draft schema gains no `walk`, and the rendered bytes the provider golden pins do not change.'''

ANCHOR = "The migration of version 2.24 is unchanged and yields a schema-v12 draft; no migration yields a v17 draft."
replace(ANCHOR, ANCHOR + '\n\n' + ADDED)

FORM = '\nForm: event-response.\n'
assert text.count(FORM) == 1
at = text.index(FORM)
SCENARIOS = f'''
#### Scenario: A step whose paragraph only restates its element's label is advised on

- **WHEN** a v16 draft's first section carries a walk over the graph `routing` whose three steps name, in order, `client` with paragraph `b-client`, `router` (label `Request router`) with paragraph `b-router`, whose `text` is `The request router.` and which has no children, and `handler` (label `Handler`) with paragraph `b-handler`, whose `text` is `The handler maps a path prefix to one controller.`; and `client`'s label is `Client` and `b-client`'s `text` is `Each client opens one connection per request.`
- **THEN** check passes the draft, and its report carries `walkAdvice` equal to `{{"rules": [{{"id": "walk-step-restates-label", "version": 1}}], "examined": 3, "advisories": [{{"rule": "walk-step-restates-label", "at": "$.sections[0].walk.steps[1]", "detail": "routing step 2: paragraph b-router adds no word to its element's label; say what a reader learns about that element at this step"}}]}}`
- **AND** where the draft's first deep dive also carries a walk whose first step's paragraph restates its element's label, a second advisory, at `$.deepDives[0].walk.steps[0]`, follows the section's, and `examined` is 3 plus that walk's steps; and no finding, check record, page or `run-advice.json` byte differs from the same draft's under version 2.47

#### Scenario: Case, punctuation, plurals and filler words do not count as new words

- **WHEN** in the same draft `b-router`'s `text` is, in turn, `The Request-Router, shown here!`, `Request routers.`, `This is the step shown here.`, and, with one child whose `text` is `It is the router.`, `The request router.`
- **THEN** each of the four draws the one advisory at `$.sections[0].walk.steps[1]`, with the detail of the scenario above
- **AND** `Router: the requests` draws it too, `requests` matching `request`; and the near miss `Request routes.` draws none, `routes` matching neither `request` nor `router`

#### Scenario: One new word stops the advice

- **WHEN** `b-router`'s `text` is, in turn, `The request router retries.`, `The request router, 2.`, and `The request router and the handler.`
- **THEN** no one of the three draws an advisory, each holding exactly one word that is neither filler nor a word of `Request router`: `retries`; `2`, a number being a word; and `handler`, the label of another element counting as a new word
- **AND** `examined` stays 3

#### Scenario: A base element's step reads Syzygy's label

- **WHEN** a v17 draft's walk over a graph whose view has a `base` of the `directories` map, established at check, names as its first step the base end of the top-level directory `src`, which holds 12 files and which a `names` entry calls `Sources`, with a paragraph whose `text` is, in turn, `src: 12 files.` and `The src directory holds the sources.`
- **THEN** the first draws one advisory at that step, with the detail naming the figure, step 1 and the paragraph's identity and no path or label, the label read being `src/ (12 files)`, and the second draws none, `directory`, `holds` and `sources` being new words
- **AND** where the structure record is `unknown` at check, or where `src` is withheld at check, the step is not read, `examined` counts the walk's other steps alone, and no advisory names it

#### Scenario: Where the walk advice is absent

- **WHEN** check runs, in turn, on a v15 draft, on a v16 draft with a `schema` finding, on an inventory, on a v16 draft whose one walk has a `walk` finding at `$.sections[0].walk.steps[1].block`, and on a v17 draft with no walk
- **THEN** the first three reports carry no `walkAdvice` member; the fourth carries it with `examined` 0 and no advisory, that walk's steps not being read; and the fifth carries it with `examined` 0 and no advisory
- **AND** each report is otherwise the report version 2.47 gives for that draft

#### Scenario: The walk advice gates nothing and reads no view level

- **WHEN** a v17 draft passes check with an advisory of rule `walk-step-restates-label`, its walk's figure being a view with `level` `container` and `scope` `app` whose box for `app` carries a zoom link
- **THEN** the draft renders, every page, `machine.json`, `dossier.json`, check record, reading ledger and size report is byte-identical to version 2.47's for the same run, and the report's `outcome`, exit status and readiness are those of the same draft with that paragraph rewritten to explain its element
- **AND** removing the view's `level` and `scope` leaves `walkAdvice` unchanged

#### Scenario: A failure to compute the walk advice leaves the check unchanged

- **WHEN** computing the walk advice fails for a v16 draft that otherwise passes check
- **THEN** check passes the draft with the same findings, outcome and exit status, and its report carries no `walkAdvice` member'''
text = text[:at] + '\n' + SCENARIOS.strip('\n') + '\n' + text[at:]


def extend(end, addition):
    replace(end, end[:-1] + addition)


extend("a walked and a zoom-only figure on one page among them.",
       f"; and, for version {V}, walks whose steps' paragraphs restate, nearly restate and explain their elements' labels, "
       "over model, node, expansion and base elements, with filler words, case, punctuation and plurals, and with no walk.")
extend("the order of the page's links, and the keyboard focus moving through them.",
       f"; for version {V}, `walkAdvice`, its `examined` count and each advisory's `at` and detail, and its absence.")
extend("written as a literal from the fixture's pages, before check and render run.",
       f"; for version {V}, each step's expected advisory written as a literal from the fixture's paragraph and label by the "
       "stated normalisation before check runs.")
extend("or a v17 draft without `level` and `scope` renders other bytes than in schema v16.",
       f"; for version {V}, a restating step draws no advisory, an explaining step or a near miss draws one, an advisory "
       "carries a word of the draft or a path, or the walk advice moves a finding, record, page or outcome.")

assert '2.NN' not in text
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(text, encoding='utf-8')
print('ok', len(src.split('\n')), len(text.split('\n')))
