#!/usr/bin/env python3
"""Build the version 2.NN MODIFIED REQ-polaris-generation-034 (figure walks) from the version 2.33 bytes by anchored edits (syzygy-3efd.32).

Every edit asserts its anchor occurs exactly once. Usage: walk_build_spec.py <worktree> <out>.

The predecessor at drafting is figure plan 2.33. Derived-base views (syzygy-3efd.38) adopts first; at adoption this text is rebuilt over
that version by changing PREDECESSOR, NUMS and, where that version moved one, an anchor, and the label 2.NN is written by LABEL.
"""
import pathlib
import sys

W = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])
PREDECESSOR = 'openspec/changes/dossier-figure-plan/proposed/polaris-generation/spec.md'
PREDECESSOR_TITLE = '# Dossier figure plan'
PREDECESSOR_LABEL = 'Candidate version 2.33;'
LABEL = '2.NN'
src = (W / PREDECESSOR).read_text(encoding='utf-8')
text = src

# The successor's numbers, kept symbolic so that a rebuild over a later predecessor is a change of these constants and the anchors alone.
# <S> and <B> stay placeholders until adoption, as the version label does.
NUMS = {'<S>': 'SS', '<PS>': '14', '<B>': 'BB', '<PB>': '22', '<PV>': '2.33'}


def sym(s):
    for k, v in NUMS.items():
        s = s.replace(k, v)
    return s


def once(anchor):
    n = text.count(anchor)
    assert n == 1, (n, anchor[:80])


def replace(old, new):
    global text
    once(old)
    text = text.replace(old, sym(new), 1)


lines = text.split('\n')
assert lines[0].startswith(PREDECESSOR_TITLE), lines[0]
assert lines[2].startswith(PREDECESSOR_LABEL), lines[2][:40]
lines[0] = '# Dossier figure walks: a figure read in numbered steps, each element linked to the lines it cites'
lines[2] = ("Candidate version 2.NN; binds nothing until its agent adoption row in AGENT-ADOPTIONS.md and its version tag. One MODIFIED "
            "requirement, REQ-polaris-generation-034, whose complete text below replaces the effective text that figure plan version <PV> "
            "gave it. Draft schema v<S> is schema v<PS> with one optional member more: a section or deep dive MAY carry a walk, an ordered "
            "list of steps through one graph figure drawn in that place, each step tying one of the place's cited paragraphs to one "
            "element of the figure. Check refuses a walk whose figure is not drawn there or not of a graph kind, or whose steps name an "
            "element the figure does not draw, an element twice, or a paragraph that is not the place's own or cites nothing. On the "
            "page, with no script, the figure shows each step's number on its element, an ordered list beside the drawing links each "
            "step to its element, which the pages' stylesheet then highlights by `:target`, and to its paragraph, and every box of the "
            "figure links to the lines its first citation cites, through an HTML layer over the drawing, which stays inert and keeps "
            "its bytes. Brief v<B> is brief v<PB> with one paragraph offering the walk. A draft without a walk renders as it did; the "
            "provider mode keeps its bytes. Every other sentence and scenario of the predecessor is carried unchanged; the exact changes "
            "are in SEMANTIC-DELTA.md. Unmentioned effective requirements are unchanged.")
text = '\n'.join(lines[:2] + [sym(lines[2])] + lines[3:])

# The brief-version list, the schema each brief issues and the schemas accepted (the v5 paragraph).
replace('from version 2.32 as `polaris-dossier-brief-v21` and from version 2.33 as `polaris-dossier-brief-v22`,',
        'from version 2.32 as `polaris-dossier-brief-v21`, from version 2.33 as `polaris-dossier-brief-v22` and from version 2.NN as '
        '`polaris-dossier-brief-v<B>`,')
replace('briefs v19, v20 and v21 issue schema v13 and brief v22 issues schema v14 (below), and a draft in v2, v3, v4, v5, v6, v7, v8, v9, '
        'v10, v11, v12, v13 or v14 is accepted.',
        'briefs v19, v20 and v21 issue schema v13, brief v22 issues schema v14 and brief v<B> issues schema v<S> (below), and a draft in '
        'v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14 or v<S> is accepted.')

# The walk paragraphs, after the figure plan's last paragraph (version 2.33).
ANCHOR = "a figure plan being the authoring session's to write."
GRAPH_KINDS = '`flow`, `lifecycle`, `state-machine`, `boundary`, `dependency` and `placement`'
PLACE = '`$.sections[<i>].walk` or `$.deepDives[<i>].walk`'
PARAGRAPHS = [
    # P1: the schema.
    "A draft in schema `polaris-dossier-local-draft-v<S>` (version 2.NN) is a schema-v<PS> draft in every respect but one: a section or a "
    "deep dive MAY carry a member `walk`, a reading path through one figure drawn in that place, in numbered steps. A walk is "
    "`{\"figure\": <a diagram's identity>, \"steps\": [<step>, ...]}`. `figure` names a diagram whose `home` names the section or deep "
    f"dive that carries the walk and whose `kind` is one of the six graph kinds, {GRAPH_KINDS}; no diagram is the figure of two walks. "
    "`steps` is a list of 2 to 12 steps in reading order, each `{\"element\": <identity>, \"block\": <identity>}`. A step's `element` "
    "names an element the figure draws: a node of the diagram, which for a diagram that carries the `view` of version 2.24 is an element "
    "of the model that the view selects, a node of the view's expansion; no element is named by two steps of one walk. A step's `block` "
    "names one of the place's paragraphs, a claim block that the section's or deep dive's `paragraphs` list holds or, for a section "
    "with subsections, one that a subsection's `paragraphs` list holds, never a block inside a presentation element, a subsection's "
    "answer or the introduction; and that block carries at least one citation. Several steps may name one block. A walk is "
    "presentation: it carries no claim, label, citation or quotation of its own and states nothing about the subject beyond the claims "
    "it ties together, and the order of its steps is presentation as the order of an ordered list's steps is, within the same review "
    "residual; that a step's paragraph speaks of its element is the authoring session's report and the fidelity and rendered-design "
    "reviews' judgement, never a check. A walk enters no claim count, claim list, fidelity entry, reading ledger, `machine.json`, "
    "`dossier.json` or `derived-structure.json`. Every rule this requirement and REQ-polaris-generation-035 state for a schema-v<PS> "
    "draft holds for a schema-v<S> draft, the figure plan, its findings and its advice among them; wherever such a rule names schema "
    "v<PS>, alone or in a list of schemas, it SHALL read it as naming schema v<S> too. The v<S> schema document admits any value at a "
    "section's or deep dive's `walk`, so that the generic schema check reports nothing at or below that path and every failure of a "
    "walk's form is a finding of the next paragraph.",
    # P2: the findings.
    "For a v<S> draft Syzygy SHALL report these repair findings for each walk, each of kind `walk` unless another kind is named, at "
    f"the walk's path, {PLACE} with the place's index, or below it, with the literal detail given. At the walk's path, for a walk that "
    "is not an object carrying exactly the members `figure` and `steps`, whose `figure` is not a string, whose `steps` is not a list of "
    "2 to 12 entries, or one of whose steps is not an object carrying exactly the members `element` and `block`, each a string, with the "
    "detail `` a walk is {\"figure\", \"steps\"}, its steps a list of 2 to 12 {\"element\", \"block\"} ``; a walk with this finding is "
    "not well formed, and no other finding of this paragraph reads it. For a well-formed walk: a finding of kind `unresolved-reference` "
    "at `<walk>.figure` where `figure` names no diagram of the draft, with the detail `` no diagram has the identity named by "
    "`walk.figure` ``; where it names a diagram, one at `<walk>.figure` where that diagram's `home` does not name the walk's place, "
    "with the detail `` <identity>: a walk's figure is drawn where the walk is ``, another where its `kind` is not one of the six graph "
    "kinds, with the detail `` <identity>: a walk's figure is of a graph kind ``, and another where it is the figure of an earlier walk "
    "in this order, with the detail `` <identity>: a second walk through this figure ``, `<identity>` being the diagram's identity and "
    "the three, where more than one holds, in that order. Then, for each step in order, `<k>` being its index: where the figure names a "
    "diagram of a graph kind, one at `<walk>.steps[<k>].element` where `element` names no element that diagram draws, with the detail "
    "`` `walk.steps[<k>].element` names no element drawn in <identity> ``, and, where it names one that an earlier step of the walk "
    "names, with the detail `` <element>: a second step for this element ``; one at `<walk>.steps[<k>].block` where `block` names no "
    "paragraph of the walk's place as the paragraph above defines one, with the detail `` `walk.steps[<k>].block` names no paragraph "
    "of this section or deep dive ``, and, where it names one that carries no citation, with the detail `` <block>: a step's paragraph "
    "cites its sources ``; `<k>` written as the step's index, `<element>` and `<block>` as the identities named. The walks are taken "
    "in draft order, the sections' before the deep dives', each walk's findings in the order stated here, and all of them follow every "
    "finding version <PV> reports for the draft. A draft with such a finding does not proceed to review until a resubmitted revision "
    "passes. A walk whose figure has a disposition other than `produced`, or whose place has one, raises no finding for that: the "
    "disposition is the draft's reasoned account of what is not drawn.",
    # P3: the render.
    "A walk renders exactly where its figure renders as a drawing: the figure is produced, its place renders the draft's content, the "
    "draft layer is not withheld, and its drawing passes the inertness check; otherwise, as where the drawing renders the notice that "
    "takes its place, the walk renders nowhere and no byte of that page moves for it. Where it renders, Syzygy SHALL render, with no "
    "script, three things. First, the drawing in the figure's `<div class=\"diagram-scroll\">` is wrapped in "
    "`<div class=\"walk-figure\">`, which holds the drawing, byte for byte as Syzygy draws it without a walk, and after it the walk "
    "layer, `<div class=\"walk-layer\">`, an HTML layer laid over the drawing. The layer holds one box for each node of the figure, in "
    "the order the drawing draws its nodes: `<span class=\"walk-node\" style=\"left:<x>px;top:<y>px;width:<w>px;height:<h>px\">`, where "
    "`<x>`, `<y>`, `<w>` and `<h>` are the position and size of the box the layout draws that node in, in the drawing's own "
    "coordinates. Version 2.11's readable layout draws every graph figure at its laid-out width, never scaled, so those coordinates are "
    "CSS pixels and the layer's boxes cover the drawing's boxes at every viewport; a change that scales the drawing changes this "
    "paragraph. The box of a node that a step names also carries `id=\"walk-<diagram>-<k>\"`, `<diagram>` being the figure's identity "
    "and `<k>` the step's number, counting from 1, and holds first the badge `<span class=\"walk-badge\" aria-hidden=\"true\"><k></span>`. "
    "The box of a node that is not withheld and whose first citation has a link in the figure's list of every component and "
    "relationship holds, after any badge, `<a class=\"walk-source\" href=\"<href>\"><span class=\"visually-hidden\"><label></span></a>`, "
    "`<href>` being the `href` that citation's link carries in that list, so that it lands where that link lands, on the cited lines "
    "of the source page; `<label>` is the node's label as the list shows it, escaped as HTML text. A withheld node, or one whose first "
    "citation has no such link, holds no link. Second, immediately after the `diagram-scroll` div, before the legend, the walk's list, "
    "`<ol class=\"figure-walk\" aria-label=\"Walk through this figure\">`, with one item per step in step order, "
    "`<li><a href=\"#walk-<diagram>-<k>\"><label></a> <a class=\"walk-text\" href=\"#walk-<diagram>-text-<k>\">Read step <k></a></li>`, "
    "`<label>` being the step's element's label as the list of every component and relationship shows it, a withheld element's the "
    "Syzygy words it shows there. Third, each step's paragraph carries `id=\"walk-<diagram>-text-<k>\"` on the element its claim block "
    "renders in; a paragraph that several steps name carries the id of the first of them, and the later steps' `Read step` links name "
    "that id; nothing else of the paragraph changes. The walk's list, read in order, is the figure's walk in words: each element in "
    "reading order, with the paragraph that explains it. The drawing's own text alternative is unchanged. Every fragment target this "
    "paragraph adds lies outside every collapsible section. The pages' stylesheet SHALL highlight the box whose id is the page's "
    "target, by the `:target` pseudo-class alone, with an outline that does not rely on colour alone, set each badge at the top left of "
    "its box in the 13 px figure text, make each `walk-source` link fill its box, and leave the drawing visible through every box; a "
    "page holding at least one walk SHALL carry those style rules, and a page holding none SHALL NOT, as the figure-kind rules of "
    "version 2.5 are carried only by a page holding such a figure. A walk adds no read, no source, no label and no claim, and no text of "
    "the draft but the element labels the figure's list already shows.",
    # P4: the brief.
    "Brief v<B> SHALL issue schema v<S>; it is brief v<PB> changed only in its version line, its draft-schema line, which names schema "
    "v<S> and that schema's digest, and one paragraph placed immediately after the figure-plan paragraph brief v<PB> carries, which "
    "reads: \"Where a section or deep dive explains a graph figure drawn there step by step, you may give it a `walk`: "
    "`{\\\"figure\\\": <that diagram's id>, \\\"steps\\\": [{\\\"element\\\": <a node's id, or for a view an element it shows>, "
    "\\\"block\\\": <the id of one of that place's paragraphs, which cites its sources>}, ...]}`, two to twelve steps in reading order, "
    "each element once. The page then shows each step's number on its element, lists the steps beside the figure, highlights an "
    "element when its step is chosen, and links every box of the figure to the lines its first citation cites. The walk states "
    "nothing itself: each step's paragraph is what the reader reads about that element.\" Every statement above of what brief v<PB> "
    "carries, equals or differs by holds of brief v<B> apart from those three differences. The success report and the brief record "
    "SHALL name brief v<B>.",
    # P5: earlier schemas, the rendered bytes, the provider.
    "A draft in schema v<PS> or earlier SHALL be checked and rendered exactly as version <PV> checks and renders it, the same findings "
    "and the same bytes of every page, of `machine.json` and of every record check writes, except that a `field-version` finding at "
    f"{PLACE}, with the detail `` `walk` needs draft schema polaris-dossier-local-draft-v<S> ``, stands in place of the `schema` "
    "finding at that path for a draft whose section or deep dive carries `walk`; wherever this requirement says that a draft of an "
    "earlier schema is checked or rendered exactly as an earlier version checks or renders it, that exception holds too. A v<S> draft "
    "that carries no walk SHALL be checked and rendered exactly as the same draft in schema v<PS>, apart from any byte that names the "
    "draft's schema or digest. A walk moves the bytes of the page that draws its figure (the wrapper, the layer, the list, the "
    "paragraphs' ids and the style rules), that page's measures in the size report and the rendered-design packet that carries them, "
    "and nothing else: no finding but this version's, no `machine.json`, `dossier.json`, check record, `run-advice.json`, reading ledger, "
    "figure-fit entry or figure advice, and no byte of the drawing. The provider mode is unaffected: the provider stages' closed draft "
    "schema gains no `walk`, and the rendered bytes the provider golden pins do not change. No migration yields a v<S> draft.",
]
replace(ANCHOR, ANCHOR + '\n\n' + '\n\n'.join(PARAGRAPHS))

# Scenarios, after version 2.33's last scenario and before the Form block that follows it.
LAST = '#### Scenario: Brief v22 asks for the figure plan'
once(LAST)
head, tail = text.split(LAST, 1)
form_at = tail.index('\nForm: event-response.\n')
SCENARIOS = r'''
#### Scenario: A walk ties a section's paragraphs to its figure's elements

- **WHEN** a schema-v<S> draft's section `write-path`, produced, carries paragraphs `p1`, `p2` and `p3`, each Inferred with one citation, and the walk `{"figure": "f", "steps": [{"element": "client", "block": "p1"}, {"element": "log", "block": "p2"}, {"element": "replica", "block": "p3"}]}`, and `f` is a produced `flow` homed in `write-path` whose view shows the elements `client`, `server`, `log` and `replica`, each with one citation of a file that has a source page
- **THEN** check reports no `walk`, `unresolved-reference`, `field-version` or `schema` finding, and on the page that draws `f` its `diagram-scroll` div holds `<div class="walk-figure">`, which holds the drawing, byte for byte as Syzygy draws it without the walk, and a `walk-layer` of four `walk-node` boxes in the drawing's node order, each at the position and size of its node's box
- **AND** the boxes of `client`, `log` and `replica` carry the ids `walk-f-1`, `walk-f-2` and `walk-f-3` and the badges `1`, `2` and `3`, the box of `server` carries neither, the `figure-walk` list after the drawing holds three items in step order, the first `<li><a href="#walk-f-1">` followed by `client`'s label, `</a> <a class="walk-text" href="#walk-f-text-1">Read step 1</a></li>`, and the paragraphs `p1`, `p2` and `p3` carry the ids `walk-f-text-1`, `walk-f-text-2` and `walk-f-text-3`

#### Scenario: Choosing a step highlights its element with no script

- **WHEN** the page of the walk above is opened in a browser with scripts off, and a reader moves by Tab to the first link of the walk's second item and follows it
- **THEN** the page's fragment is `walk-f-2`, the box over `log` is the page's target and is drawn with the stylesheet's `:target` outline, which does not rely on colour alone, and no other box is
- **AND** the page carries no script, the walk's style rules stand on that page and on no page without a walk, every link of the walk's list is reached by Tab in step order, and no fragment target the walk adds lies inside a `details` element

#### Scenario: Each box links to the lines its first citation cites

- **WHEN** a walked figure's node `log` cites lines 40 to 52 of `src/log.c`, which has a source page, the node `server` cites two spans, the node `cache` is withheld, and the node `queue` cites a file that has no source page
- **THEN** the box over `log` holds `<a class="walk-source">` whose `href` equals the `href` of the citation link of `log` in the figure's list of every component and relationship, landing on line 40 of the source page of `src/log.c`, and the box over `server` holds one whose `href` equals that of its first citation's link
- **AND** the boxes over `cache` and `queue` hold no link, and the drawing's bytes, checked by the inertness check of the drawing as before, carry no link

#### Scenario: Malformed walk refused

- **WHEN** a schema-v<S> section carries a `walk` that is a list, one with a further member, one whose `figure` is `7`, one with one step or with thirteen, one whose step carries a further member, and one whose step's `element` is not a string
- **THEN** check reports for each one finding of kind `walk` at `$.sections[<i>].walk` with the detail `a walk is {"figure", "steps"}, its steps a list of 2 to 12 {"element", "block"}`, no other walk finding for it and no `schema` finding at or below that path
- **AND** the draft does not proceed to review until a resubmitted revision passes

#### Scenario: A walk's figure is drawn where the walk is

- **WHEN** a schema-v<S> section `a` carries a walk whose `figure` is `missing`, which no diagram is, and, in turn, a `flow` `g` homed in section `b`, a `sequence` `s` homed in `a`, a `sequence` homed in `b`, and a `flow` `f` homed in `a` that an earlier walk, of a deep dive, also names
- **THEN** check reports a finding of kind `unresolved-reference` at `$.sections[<i>].walk.figure` with the detail ``no diagram has the identity named by `walk.figure` `` for the first, the `walk` finding `g: a walk's figure is drawn where the walk is` for `g`, `s: a walk's figure is of a graph kind` for `s`, both, home first, for the sequence homed in `b`, and `f: a second walk through this figure` for `f`
- **AND** a walk whose `flow` is homed in `a` with the disposition `omitted` raises no finding and renders nowhere

#### Scenario: A walk's steps name the figure's elements and the place's cited paragraphs

- **WHEN** a schema-v<S> walk's figure `f` is a `boundary` whose view shows `api` and `db` but not `cache`, an element of the model, and its steps name, in order, `api` with `p1`; `cache` with `p1`; `api` with `p2`; `db` with `q1`, a paragraph of another section; `db` with `t1`, a cell of a table among the section's paragraphs; and `db` with `p3`, a judgement citing nothing
- **THEN** check reports at `$.sections[<i>].walk.steps[1].element` the detail ``` `walk.steps[1].element` names no element drawn in f ```, at `steps[2].element` the detail `api: a second step for this element`, at `steps[3].block` and `steps[4].block` the detail ``` `walk.steps[<k>].block` names no paragraph of this section or deep dive ``` with each index written, and at `steps[5].block` the detail `p3: a step's paragraph cites its sources`, in that order
- **AND** a step naming a paragraph of one of the section's subsections, or a paragraph another step also names, raises no finding

#### Scenario: Earlier schema keeps its bytes with a walk added

- **WHEN** a draft of schema v<PS> or earlier is checked and rendered, once as stored and once with a `walk` added to one of its sections
- **THEN** the stored draft's findings and the bytes of every page, of `machine.json` and of every record check writes are those version <PV> gives it
- **AND** the draft with the walk added gets a `field-version` finding at `$.sections[<i>].walk` with the detail `` `walk` needs draft schema polaris-dossier-local-draft-v<S> `` in place of the `schema` finding at that path, and every other finding is unchanged

#### Scenario: A walk moves only its figure's page

- **WHEN** a schema-v<S> draft that carries one walk is checked and rendered, and again with the walk removed, and again as the same draft without the walk in schema v<PS>
- **THEN** the last two give the same findings and the same bytes of every page, of `machine.json` and of every record check writes, apart from any byte that names the draft's schema or digest
- **AND** the first differs from the second only in the page that draws the walked figure, that page's measures in the size report and the rendered-design packet; its `machine.json`, check record, `run-advice.json`, reading ledger, figure fit and figure advice are the second's, the drawing's bytes are unchanged, and the provider golden's bytes do not change

#### Scenario: Brief v<B> offers the walk

- **WHEN** a run is briefed under this version
- **THEN** the brief is `polaris-dossier-brief-v<B>`, issuing schema `polaris-dossier-local-draft-v<S>`, and equals brief v<PB> for the same run except its version line, its draft-schema line and the walk paragraph placed immediately after the figure-plan paragraph
- **AND** the success report and the brief record name brief v<B>
'''
text = head + LAST + tail[:form_at] + '\n' + sym(SCENARIOS).strip('\n') + '\n' + tail[form_at:]


# The four Form lines of the last Form block, each extended at its end.
def extend(end, addition):
    replace(end, end[:-1] + addition)


extend("with and without `figurePlan`, `model` and `view`.",
       "; and, for version 2.NN, schema-v<S> drafts with well-formed and malformed walks in sections, subsections and deep dives; walks "
       "whose figure is unresolved, homed elsewhere, of a non-graph kind, walked twice, not produced, withheld or rendered as the "
       "inertness notice; steps naming a node, a view's element, an element the view does not show, an element twice, a paragraph of "
       "the place, of a subsection, of another place, inside a presentation element, and one citing nothing; nodes that are withheld, "
       "cite no file with a source page, or cite several spans; and drafts of schema v<PS> and earlier with and without `walk`.")
extend("beside the same members' in a v13 draft.",
       "; for version 2.NN, the walk findings with their paths, details and order, the walked figure's page (its layer, boxes, badges, "
       "source links, list and paragraph ids) beside the same draft rendered without the walk, the walk's style rules on each page, the "
       "browser's `:target` highlight and Tab order with scripts off, and the brief v<B> walk paragraph.")
extend("rendered without `figurePlan`.",
       "; for version 2.NN, each fixture's expected walk findings and each box's position, size and `href` written as literals before "
       "check and render run, each box's position taken by hand from the layout's literal constants, and each `href` compared with the "
       "citation link the figure's list carries.")
extend("counts a diagram or a plan entry.",
       "; for version 2.NN, a walk whose figure, element or paragraph does not resolve as stated proceeds to review; a box lies off its "
       "node; a step's link does not highlight its element, or highlights it by script or by colour alone; a box's link lands anywhere "
       "but the cited lines its first citation's link lands on; a fragment target lies in a collapsible section; the drawing's bytes, "
       "`machine.json`, a check record, the reading ledger or the provider golden move; a page without a walk changes; or a draft of "
       "schema v<PS> or earlier changes any finding but the `field-version` one at a walk, or any byte.")

assert LABEL not in src
text = text.replace('2.NN', LABEL)
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(text, encoding='utf-8')
print('ok', len(src.split('\n')), len(text.split('\n')))
