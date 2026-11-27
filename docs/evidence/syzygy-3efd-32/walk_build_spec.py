#!/usr/bin/env python3
"""Build the version 2.NN MODIFIED REQ-polaris-generation-034 (figure walks) from the version 2.33 bytes by anchored edits (syzygy-3efd.32).

Every edit asserts its anchor occurs exactly once. Usage: walk_build_spec.py <worktree> <out>.

The predecessor at drafting is figure plan 2.33. Derived-base views (syzygy-3efd.38) adopts first; at adoption this text is rebuilt over
that version by changing PREDECESSOR, NUMS and, where that version moved one, an anchor, and the label 2.NN is written by LABEL.

Rebuilt for adoption (2026-11-28) over import facts 2.39, the newest REQ-034, as version 2.40 with schema v16 and brief v24. Besides the
constants, three anchors moved (the brief list, the paragraph the walk paragraphs follow, the Form line ends) and the scenarios go before
the one Form line. One rule is added: a step may name a base element of a version 2.35 view with a `base`, which takes the badge and the
`:target` highlight but no source link, a base element having no citation, and no finding's detail names the base path the draft wrote.
`walk_rebuild_diff.py` lists every difference from the reviewed edits over 2.33.
"""
import pathlib
import sys

W = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])
PREDECESSOR = 'openspec/changes/dossier-import-facts/proposed/polaris-generation/spec.md'
PREDECESSOR_TITLE = '# Dossier lexical import facts'
PREDECESSOR_LABEL = 'Candidate version 2.39;'
LABEL = '2.40'
src = (W / PREDECESSOR).read_text(encoding='utf-8')
text = src

# The successor's numbers, kept symbolic so that a rebuild over a later predecessor is a change of these constants and the anchors alone.
# <S> and <B> stay placeholders until adoption, as the version label does.
NUMS = {'<S>': '16', '<PS>': '15', '<B>': '24', '<PB>': '23', '<PV>': '2.39'}


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
            "requirement, REQ-polaris-generation-034, whose complete text below replaces the effective text that import facts version <PV> "
            "gave it. Draft schema v<S> is schema v<PS> with one optional member more: a section or deep dive MAY carry one walk, an "
            "ordered list of steps through one graph figure drawn in that place, each step tying one of the place's cited paragraphs to "
            "one element of the figure, which may be a base element of a view with a `base`. Check refuses a walk whose figure is not drawn there or not of a graph kind, or whose steps name "
            "an element the figure does not draw, an element twice, or a paragraph that is not the place's own or cites nothing. On the "
            "page, with no script, the figure shows each step's number on its element, an ordered list beside the drawing links each "
            "step to its element, which the pages' stylesheet then highlights by `:target`, and to its paragraph, and every box whose "
            "element is not withheld and has a linked citation links to the lines its first citation cites, through an HTML layer over "
            "the drawing, which stays inert and keeps its bytes; a base element's box takes the number and the highlight and no link. Brief v<B> is brief v<PB> with one paragraph offering the walk. A draft "
            "without a walk renders as it did; the provider mode keeps its bytes. Every other sentence and scenario of the predecessor is "
            "carried unchanged; the exact changes are in SEMANTIC-DELTA.md. Unmentioned effective requirements are unchanged.")
text = '\n'.join(lines[:2] + [sym(lines[2])] + lines[3:])

# The brief-version list, the schema each brief issues and the schemas accepted (the v5 paragraph).
replace('from version 2.33 as `polaris-dossier-brief-v22` and from version 2.35 as `polaris-dossier-brief-v23`,',
        'from version 2.33 as `polaris-dossier-brief-v22`, from version 2.35 as `polaris-dossier-brief-v23` and from version 2.NN as '
        '`polaris-dossier-brief-v<B>`,')
replace('brief v22 issues schema v14 and brief v23 issues schema v15 (below), and a draft in v2, v3, v4, v5, v6, v7, v8, v9, '
        'v10, v11, v12, v13, v14 or v15 is accepted.',
        'brief v22 issues schema v14, brief v23 issues schema v15 and brief v<B> issues schema v<S> (below), and a draft in '
        'v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15 or v<S> is accepted.')

# The walk paragraphs, after version 2.35's last paragraph of the schema line (the earlier-schema paragraph of the derived base).
ANCHOR = ("and so SHALL every sequence and swimlane diagram. The provider mode is unaffected: the provider stages' closed draft schema "
          "gains no member, and the rendered bytes the provider golden pins do not change.")
GRAPH_KINDS = '`flow`, `lifecycle`, `state-machine`, `boundary`, `dependency` and `placement`'
PLACE = '`$.sections[<i>].walk` or `$.deepDives[<i>].walk`'
PARAGRAPHS = [
    # P1: the schema.
    "A draft in schema `polaris-dossier-local-draft-v<S>` (version 2.NN) is a schema-v<PS> draft in every respect but one: a section or a "
    "deep dive MAY carry a member `walk`, one reading path through one figure drawn in that place, in numbered steps; a place carries "
    "at most one walk, so a place with two graph figures walks at most one of them. A walk is "
    "`{\"figure\": <a diagram's identity>, \"steps\": [<step>, ...]}`. `figure` names a diagram whose `home` names the section or deep "
    f"dive that carries the walk and whose `kind` is one of the six graph kinds, {GRAPH_KINDS}; since a diagram has one home and a "
    "place one walk, no diagram is the figure of two walks that pass check. `steps` is a list of 2 to 12 steps in reading order, each "
    "`{\"element\": <identity or base end>, \"block\": <identity>}`; a step names one element, never several. A step's `element` names an element the "
    "figure draws: a node of the diagram, which for a diagram that carries the `view` of version 2.24 is an element of the model that "
    "the view selects, a node of the view's expansion, or, for a view that carries a `base` (version 2.35), a base element the figure "
    "shows, which the step names, in place of an identity, by a base end `{\"map\", \"path\"}` as a cited relationship's `from` or "
    "`to` names one, its `map` the view's base map and its `path` naming exactly one base element the figure shows; no element is "
    "named by two steps of one walk. A base element stays Syzygy's and never the draft's claim: a step that names one ties the step's "
    "paragraph to it as every step ties its paragraph to its element, and gives its box nothing but the step's id and badge. A step's `block` names one of the "
    "place's paragraphs, a claim block that the section's or deep dive's `paragraphs` list holds or, for a section with subsections, "
    "one that a subsection's `paragraphs` list holds, never a block inside a presentation element or a subsection's `answer`; and that "
    "block carries at least one citation. A citation suffices whatever becomes of it at render: a block whose citations are all "
    "withheld, or whose block renders Unknown, may be a step's paragraph, and the step's link then lands on that block as it renders, "
    "Syzygy's words in place of withheld text, as every other link to that block does. Several steps may name one block. A walk is "
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
    f"the walk's path, {PLACE} with the place's index, or below it, with the literal detail given; in a path or detail `<k>` is a "
    "step's index in `steps`, counting from 0. At the walk's path, for a walk that is not an object carrying exactly the members "
    "`figure` and `steps`, whose `figure` is not a string, whose `steps` is not a list of 2 to 12 entries, or one of whose steps is "
    "not an object carrying exactly the members `element` and `block`, `block` a string and `element` a string or a base end, an "
    "object carrying exactly the members `map` and `path`, each a string, with the detail "
    "`` a walk is {\"figure\", \"steps\"}, its steps a list of 2 to 12 {\"element\", \"block\"} ``; a walk with this finding is "
    "not well formed, and no other finding of this paragraph reads it. For a well-formed walk: a finding of kind `unresolved-reference` "
    "at `<walk>.figure` where `figure` names no diagram of the draft, with the detail `` no diagram has the identity named by "
    "`walk.figure` ``; where it names a diagram, one at `<walk>.figure` where that diagram's `home` does not name the walk's place, "
    "with the detail `` <identity>: a walk's figure is drawn where the walk is ``, and another where its `kind` is not one of the six "
    "graph kinds, with the detail `` <identity>: a walk's figure is of a graph kind ``, `<identity>` being the diagram's identity and "
    "the two, where both hold, in that order. Then, for each step in order: where the figure names a diagram of a graph kind, one at "
    "`<walk>.steps[<k>].element` where `element` names no element that diagram draws, with the detail "
    "`` `walk.steps[<k>].element` names no element drawn in <identity> ``, a base end that names no base element the figure shows, or "
    "names one in a figure whose view carries no `base` or another map, being such a step, and, where it names one that an earlier "
    "step of the walk "
    "names, with the detail `` <element>: a second step for this element ``; then one at `<walk>.steps[<k>].block` where `block` names "
    "no paragraph of the walk's place as the paragraph above defines one, with the detail `` `walk.steps[<k>].block` names no paragraph "
    "of this section or deep dive ``, and, where it names one that carries no citation, with the detail `` <block>: a step's paragraph "
    "cites its sources ``; `<k>` written as the step's index, `<element>` and `<block>` as the identities named, and `<element>`, for a "
    "step whose `element` is a base end, written as `` `walk.steps[<k>].element` `` with that step's index, so that no path the draft "
    "writes in a base end enters a finding's detail. A base end resolves against the base elements the figure shows by the derivation "
    "version 2.35 states for the view's own base ends at check; where the view's base map is not established at check, a step naming "
    "a base end takes no finding of this paragraph for its `element`, and the render resolves it as check would: where the render "
    "finds such a step that names no base element the figure shows, or one an earlier step names, the walk renders nowhere and no "
    "byte of that page moves for it. The walks are taken "
    "in draft order, the sections' before the deep dives', each walk's findings in the order stated here, and all of them follow every "
    "finding version <PV> reports for the draft. A draft with such a finding does not proceed to review until a resubmitted revision "
    "passes. A walk whose figure has a disposition other than `produced`, or whose place has one, raises no finding for that "
    "disposition: the disposition is the draft's reasoned account of what is not drawn.",
    # P3: the render.
    "A walk renders exactly where its figure renders as a drawing whose width is not 1048 px: the figure is produced, its place "
    "renders the draft's content, the draft layer is not withheld, its drawing passes the inertness check, and the drawing is not "
    "one that version 2.2's rule for a 1048-px drawing lets shrink to its column; otherwise, as where the drawing renders the notice "
    "that takes its place, the walk renders nowhere and no byte of that page moves for it. Where it renders, Syzygy SHALL render, "
    "with no script, three things, `<diagram>` being the figure's identity and `<n>` a step's number, its index plus 1. First, the "
    "drawing in the figure's `<div class=\"diagram-scroll\">` is wrapped in `<div class=\"walk-figure\">`, which holds the drawing, "
    "byte for byte as Syzygy draws it without a walk, and after it the walk layer, `<div class=\"walk-layer\">`, an HTML layer laid "
    "over the drawing with its top-left corner at the drawing's top-left corner. The layer holds one box for each node of the figure, "
    "in the order the drawing draws its nodes: `<span class=\"walk-node\" style=\"left:<x>px;top:<y>px;width:<w>px;height:<h>px\">`, "
    "where `<x>`, `<y>`, `<w>` and `<h>` are the position and size of the box the layout draws that node in, in the drawing's own "
    "coordinates. Version 2.11's readable layout draws every graph figure at its laid-out width, never scaled, save a drawing 1048 px "
    "wide, which this paragraph leaves without a walk, so those coordinates are CSS pixels and the layer's boxes cover the drawing's "
    "boxes at every viewport; a change that scales a drawing of any other width changes this paragraph. The box of a node that a step "
    "names also carries `id=\"walk-<diagram>-<n>\"` and holds first the badge "
    "`<span class=\"walk-badge\" aria-hidden=\"true\"><n></span>`. A node's label, here and in the walk's list, is its label as the "
    "figure's list of every component and relationship shows it, or, for an element version 2.24 renders in an earlier figure, as "
    "that first figure renders it; it is that text alone, escaped as HTML text, never a link the list item carries, and a withheld "
    "element's label is the Syzygy words its list item shows for it; a base element's label is Syzygy's label for it as its box "
    "shows it (`Repository root`, `<path>/ (<count> files)`, or a package's or module's `<name>`), never a display name a `names` "
    "entry gives it, and its box is the double-bordered box the layout draws, without the `called` line below it. The box of a node that is not withheld and whose first citation "
    "has a link among the citation links of the figure that carries the node's claim (the figure itself, or for such an element its "
    "first figure) holds, after any badge, `<a class=\"walk-source\" href=\"<href>\"><span class=\"visually-hidden\"><label>: cited "
    "lines</span></a>`, `<href>` being the address that citation's link carries there, resolved against the page that holds that "
    "figure and written relative to the page that holds this one, so that it lands where that link lands, on the cited lines of the "
    "source page. A withheld node, or one whose first citation has no such link, holds no link, and so does a base element's box, "
    "since a base element carries no citation: a step naming one gives its box the id and the badge, and the `:target` outline marks "
    "it as it marks every other box. Second, immediately after the "
    "`diagram-scroll` div, before the legend, the walk's list, "
    "`<ol class=\"figure-walk\" aria-label=\"Walk through this figure\">`, with one item per step in step order, "
    "`<li><a href=\"#walk-<diagram>-<n>\"><label></a> <a class=\"walk-text\" href=\"#block-<block>\">Read step <n></a></li>`, "
    "`<label>` being the step's element's label and `#block-<block>` the fragment of the `id=\"block-<identity>\"` that version 2.15 "
    "gives the step's paragraph, which the walk does not change: the walk adds no id to a paragraph and no byte of one. Every id the "
    "walk adds is `walk-` followed by a diagram identity, a hyphen and a step number; a diagram identity is a handle, the number is "
    "decimal digits, and Syzygy SHALL give no other element of a page that holds a walk an id beginning `walk-`, so each such id, "
    "read back from its last hyphen, names one figure and one step and is unique on its page, however many walked "
    "figures the page holds and whatever their identities share. The walk's list, read in order, is an ordered reading of the "
    "figure: each element in reading order, with a link to the paragraph that explains it; it sits beside the drawing and its list "
    "of every component and relationship, which stay the drawing's text alternative, unchanged. Every fragment target this paragraph "
    "adds or links lies outside every collapsible section. In the order of the page the boxes' links come before the walk's list, in "
    "the drawing's node order; after a reader follows a step's link, the page's target is that step's box, so the next element that "
    "takes the focus is that box's own `walk-source` link where it has one. The pages' stylesheet SHALL position the layer as stated, "
    "highlight the box whose id is the page's target, by the `:target` pseudo-class alone, with an outline that does not rely on "
    "colour alone, outline a box under the pointer as the drawing's own rules emphasise a node under the pointer, which the layer "
    "covers, set each badge at the top left of its box in the 13 px figure text, make each `walk-source` link fill its box and show "
    "the pointer cursor over it, and leave the drawing visible through every box; a page holding at least one walk SHALL carry those "
    "style rules, and a page holding none SHALL NOT, as the figure-kind rules of version 2.5 are carried only by a page holding such "
    "a figure. A walk adds no read, no source, no label and no claim, and no text of the draft but the element labels the figure's "
    "lists already show.",
    # P4: the brief.
    "Brief v<B> SHALL issue schema v<S>; it is brief v<PB> changed only in its version line, its draft-schema line, which names schema "
    "v<S> and that schema's digest, and one paragraph placed immediately after the computed-map paragraph brief v<PB> carries after "
    "its figure-plan paragraph, which "
    "reads: \"Where a section or deep dive explains a graph figure drawn there step by step, you may give it one `walk`: "
    "`{\\\"figure\\\": <that diagram's id>, \\\"steps\\\": [{\\\"element\\\": <a node's id, for a view an element it shows, or for "
    "a view with a `base` a base element it shows as {\\\"map\\\", \\\"path\\\"}>, "
    "\\\"block\\\": <the id of one of that place's paragraphs, which cites its sources>}, ...]}`, two to twelve steps in reading order, "
    "each element once. The page then shows each step's number on its element, lists the steps beside the figure, highlights an "
    "element when its step is chosen, and links each box whose element is not withheld to the lines its first citation cites; a "
    "base element's box takes the number and the highlight, never a link. The "
    "walk states nothing itself: each step's paragraph is what the reader reads about that element.\" Every statement above of what "
    "brief v<PB> carries, equals or differs by holds of brief v<B> apart from those three differences. The success report and the "
    "brief record SHALL name brief v<B>.",
    # P5: earlier schemas, the rendered bytes, the provider.
    "A draft in schema v<PS> or earlier SHALL be checked and rendered exactly as version <PV> checks and renders it, the same findings "
    "and the same bytes of every page, of `machine.json` and of every record check writes, except that a `field-version` finding at "
    f"{PLACE}, with the detail `` `walk` needs draft schema polaris-dossier-local-draft-v<S> ``, stands in place of the `schema` "
    "finding at that path for a draft whose section or deep dive carries `walk`; wherever this requirement says that a draft of an "
    "earlier schema is checked or rendered exactly as an earlier version checks or renders it, that exception holds too. A v<S> draft "
    "that carries no walk SHALL be checked and rendered exactly as the same draft in schema v<PS>, apart from any byte that names the "
    "draft's schema or digest. A walk moves the bytes of the page that draws its figure (the wrapper, the layer, the list and the "
    "style rules), that page's measures in the size report and the rendered-design packet that carries them, and nothing else: no "
    "finding but this version's, no `machine.json`, `dossier.json`, check record, `run-advice.json`, reading ledger, figure-fit entry "
    "or figure advice, no byte of a paragraph, and no byte of the drawing. On a walked figure the layer, not the drawing, receives the "
    "pointer, so the drawing's own emphasis of a node under the pointer gives way there to the box's outline. The provider mode is "
    "unaffected: the provider stages' closed draft schema gains no `walk`, and the rendered bytes the provider golden pins do not "
    "change. No migration yields a v<S> draft.",
]
replace(ANCHOR, ANCHOR + '\n\n' + '\n\n'.join(PARAGRAPHS))

# Scenarios, after the predecessor's last scenario before the one Form line, and before that line.
FORM = '\nForm: event-response.\n'
once(FORM)
form_at = text.index(FORM)
SCENARIOS = r'''
#### Scenario: A walk ties a section's paragraphs to its figure's elements

- **WHEN** a schema-v<S> draft's section `write-path`, produced, carries paragraphs `p1`, `p2` and `p3`, each Inferred with one citation, and the walk `{"figure": "f", "steps": [{"element": "client", "block": "p1"}, {"element": "log", "block": "p2"}, {"element": "replica", "block": "p3"}]}`, and `f` is a produced `flow` homed in `write-path` whose view shows the elements `client`, `server`, `log` and `replica`, each with one citation of a file that has a source page, drawn 640 px wide
- **THEN** check reports no `walk`, `unresolved-reference`, `field-version` or `schema` finding, and on the page that draws `f` its `diagram-scroll` div holds `<div class="walk-figure">`, which holds the drawing, byte for byte as Syzygy draws it without the walk, and a `walk-layer` of four `walk-node` boxes in the drawing's node order, each at the position and size of its node's box
- **AND** the boxes of `client`, `log` and `replica` carry the ids `walk-f-1`, `walk-f-2` and `walk-f-3` and the badges `1`, `2` and `3`, the box of `server` carries neither, the `figure-walk` list after the drawing holds three items in step order, the first `<li><a href="#walk-f-1">` followed by `client`'s label, `</a> <a class="walk-text" href="#block-p1">Read step 1</a></li>`, and the paragraphs `p1`, `p2` and `p3` render byte for byte as they do without the walk, each with its `id="block-p1"`, `id="block-p2"` or `id="block-p3"`

#### Scenario: Walk ids stay unique on a page of several walked figures

- **WHEN** a Pole page renders the sections `a` and `b`, `a` walking the `flow` `f` in two steps and `b` walking the `boundary` `f-1` in two steps, and a section on the same page carries a paragraph `walk-f-1`
- **THEN** the boxes carry the ids `walk-f-1` and `walk-f-2` for `f` and `walk-f-1-1` and `walk-f-1-2` for `f-1`, each once on the page, and following `#walk-f-1-1` makes the box of `f-1`'s first step, and no other element, the page's target
- **AND** the paragraph `walk-f-1` keeps its own `id="block-walk-f-1"`, so no id on the page is carried twice

#### Scenario: Choosing a step highlights its element with no script

- **WHEN** the page of the first walk above is opened in a browser with scripts off, and a reader moves by Tab to the first link of the walk's second item and follows it
- **THEN** the page's fragment is `walk-f-2`, the box over `log` is the page's target and is drawn with the stylesheet's `:target` outline, which does not rely on colour alone, no other box is, and the next Tab moves the focus to the `walk-source` link of the box over `log`
- **AND** the page carries no script, the walk's style rules stand on that page and on no page without a walk, the boxes' links come before the walk's list in Tab order and the list's links in step order, and no fragment target the walk adds or links lies inside a `details` element

#### Scenario: Each box links to the lines its first citation cites

- **WHEN** a walked figure's node `log` cites lines 40 to 52 of `src/log.c`, which has a source page, the node `server` cites two spans, the node `cache` is withheld, and the node `queue` cites a file that has no source page
- **THEN** the box over `log` holds `<a class="walk-source">` whose `href` equals the `href` of the citation link of `log` in the figure's list of every component and relationship, landing on line 40 of the source page of `src/log.c`, and whose visually hidden text is `log`'s label followed by `: cited lines`, and the box over `server` holds one whose `href` equals that of its first citation's link
- **AND** the boxes over `cache` and `queue` hold no link, and the drawing's bytes, checked by the inertness check of the drawing as before, carry no link

#### Scenario: A walk through a later view of a shared element

- **WHEN** a schema-v<S> draft's views `v1`, on `index.html`, and `v2`, homed in the section `s` on a Pole page, both select the element `log`, which cites line 40 of `src/log.c`, `v1` coming first in diagram order, and `s` walks `v2` with a step naming `log`
- **THEN** `v2`'s list item for `log` reads, as version 2.24 states, `log`'s label followed by `, as shown in` and a link to `v1`, and the walk's item for that step links `#walk-v2-<n>` with `log`'s label as `v1` renders it as its only text, holding no nested link
- **AND** the box over `log` in `v2` holds a `walk-source` link to line 40 of the source page of `src/log.c`, its address written relative to the Pole page, and the walk adds no claim anchor, citation or fidelity entry for `log`

#### Scenario: A step names a base element

- **WHEN** a schema-v<S> section `s` walks the `dependency` view `d`, homed in `s`, which carries `base` `{"map": "units"}` and shows the element `api` and the unit `@x/core`, the one base path `libs/core/package.json#1` names, to which a `names` entry gives the display name `Core`, and the walk's steps name `{"map": "units", "path": "libs/core/package.json#1"}` with the paragraph `p1` and `api` with `p2`
- **THEN** check reports no walk finding; the box over `@x/core` carries `id="walk-d-1"` and the badge `1` and holds no `walk-source` link, its position and size those of the double-bordered box without the `called Core` line, the walk's first item is `<li><a href="#walk-d-1">@x/core</a> <a class="walk-text" href="#block-p1">Read step 1</a></li>`, and following `#walk-d-1` makes that box the page's target, drawn with the `:target` outline
- **AND** with a third step naming `{"map": "units", "path": "libs/gone/package.json"}`, which names no base element the figure shows, check reports at `$.sections[<i>].walk.steps[2].element` the detail ``` `walk.steps[2].element` names no element drawn in d ```, and with a third step naming the first step's base element again it reports there the detail ``` `walk.steps[2].element`: a second step for this element ```, and no finding's detail holds a path the draft wrote

#### Scenario: Malformed walk refused

- **WHEN** a schema-v<S> section carries a `walk` that is a list, one with a further member, one whose `figure` is `7`, one with one step or with thirteen, one whose step carries a further member, and one whose step's `element` is not a string
- **THEN** check reports for each one finding of kind `walk` at `$.sections[<i>].walk` with the detail `a walk is {"figure", "steps"}, its steps a list of 2 to 12 {"element", "block"}`, no other walk finding for it and no `schema` finding at or below that path
- **AND** the draft does not proceed to review until a resubmitted revision passes

#### Scenario: A walk's figure is drawn where the walk is

- **WHEN** the schema-v<S> sections `a`, `b`, `c` and `d`, in that order, carry walks whose `figure` is `missing`, which no diagram is; `g`, a `flow` homed in section `e`; `s`, a `sequence` homed in `c`; and `t`, a `sequence` homed in `e`
- **THEN** check reports a finding of kind `unresolved-reference` at `$.sections[0].walk.figure` with the detail ``no diagram has the identity named by `walk.figure` ``, the `walk` finding `g: a walk's figure is drawn where the walk is` at `$.sections[1].walk.figure`, `s: a walk's figure is of a graph kind` at `$.sections[2].walk.figure`, and at `$.sections[3].walk.figure` `t: a walk's figure is drawn where the walk is` then `t: a walk's figure is of a graph kind`, in that order
- **AND** a section walking a `flow` homed in it with the disposition `omitted` raises no finding for that disposition and renders no walk

#### Scenario: A walk's steps name the figure's elements and the place's cited paragraphs

- **WHEN** a schema-v<S> walk's figure `f` is a `boundary` whose view shows `api`, `db`, `queue` and `log` but not `cache`, an element of the model, and its steps name, in order, `api` with `p1`; `cache` with `p1`; `api` with `p2`; `db` with `q1`, a paragraph of another section; `queue` with `t1`, a cell of a table among the section's paragraphs; and `log` with `p3`, a judgement citing nothing
- **THEN** check reports at `$.sections[<i>].walk.steps[1].element` the detail ``` `walk.steps[1].element` names no element drawn in f ```, at `steps[2].element` the detail `api: a second step for this element`, at `steps[3].block` and `steps[4].block` the detail ``` `walk.steps[<k>].block` names no paragraph of this section or deep dive ``` with each index written, and at `steps[5].block` the detail `p3: a step's paragraph cites its sources`, in that order and no other walk finding
- **AND** a step naming a paragraph of one of the section's subsections, a paragraph another step also names, or a paragraph whose one citation is withheld, raises no finding

#### Scenario: Earlier schema keeps its bytes with a walk added

- **WHEN** a draft of schema v<PS> or earlier is checked and rendered, once as stored and once with a `walk` added to one of its sections
- **THEN** the stored draft's findings and the bytes of every page, of `machine.json` and of every record check writes are those version <PV> gives it
- **AND** the draft with the walk added gets a `field-version` finding at `$.sections[<i>].walk` with the detail `` `walk` needs draft schema polaris-dossier-local-draft-v<S> `` in place of the `schema` finding at that path, and every other finding is unchanged

#### Scenario: A walk moves only its figure's page

- **WHEN** a schema-v<S> draft that carries one walk is checked and rendered, and again with the walk removed, and again as the same draft without the walk in schema v<PS>
- **THEN** the last two give the same findings and the same bytes of every page, of `machine.json` and of every record check writes, apart from any byte that names the draft's schema or digest
- **AND** the first differs from the second only in the page that draws the walked figure, that page's measures in the size report and the rendered-design packet; its `machine.json`, check record, `run-advice.json`, reading ledger, figure fit and figure advice are the second's, the drawing's and every paragraph's bytes are unchanged, and the provider golden's bytes do not change

#### Scenario: A drawing 1048 px wide is walked nowhere

- **WHEN** a schema-v<S> section walks a produced graph figure whose drawing is 1048 px wide
- **THEN** check reports no walk finding for it, and the page renders exactly as it does with the walk removed
- **AND** a figure 1047 px or 1049 px wide renders its walk as stated

#### Scenario: Brief v<B> offers the walk

- **WHEN** a run is briefed under this version
- **THEN** the brief is `polaris-dossier-brief-v<B>`, issuing schema `polaris-dossier-local-draft-v<S>`, and equals brief v<PB> for the same run except its version line, its draft-schema line and the walk paragraph placed immediately after the computed-map paragraph
- **AND** the success report and the brief record name brief v<B>
'''
text = text[:form_at] + '\n\n' + sym(SCENARIOS).strip('\n') + '\n' + text[form_at:]


# The four Form lines of the last Form block, each extended at its end.
def extend(end, addition):
    replace(end, end[:-1] + addition)


extend("migrated to schema v12.",
       "; and, for version 2.NN, schema-v<S> drafts with well-formed and malformed walks in sections, subsections and deep dives; walks "
       "whose figure is unresolved, homed elsewhere, of a non-graph kind, both, not produced, withheld, rendered as the inertness notice "
       "or drawn 1048 px wide; steps naming a node, a view's element, an element a later view shares with an earlier one, an element "
       "the view does not show, an element twice, a paragraph of the place, of a subsection, of another place, inside a presentation "
       "element, one citing nothing and one whose citations are withheld; nodes that are withheld, cite no file with a source page, or "
       "cite several spans; steps naming a base element of a view with a `base`, one it hides, one of another map and one it does not "
    "list, over a base map established and not established at check; pages holding several walked figures whose identities share a "
    "prefix; and drafts of schema v<PS> and "
       "earlier with and without `walk`.")
extend("record check's `readerAdvice.choiceFloor` and the check record beside it.",
       "; for version 2.NN, the walk findings with their paths, details and order, the walked figure's page (its layer, boxes, badges, "
       "source links and their accessible names, list and the paragraphs' unchanged ids) beside the same draft rendered without the "
       "walk, the uniqueness of every id on each page, the walk's style rules on each page, and the browser's `:target` highlight, "
       "focus after a step's link and Tab order with scripts off, and the brief v<B> walk paragraph.")
extend("as literals from the fixture's Poles, sections and understanding record, outside the advice code.",
       "; for version 2.NN, each fixture's expected walk findings and each box's position, size and `href` written as literals before "
       "check and render run, each box's position taken by hand from the layout's literal constants, and each `href` compared with the "
       "citation link the list of the figure carrying the node's claim carries.")
extend("or a v14 or v15 draft is counted otherwise than a v13 draft.",
       "; for version 2.NN, a walk whose figure, element or paragraph does not resolve as stated proceeds to review; a box lies off its "
       "node; a walk renders over a drawing 1048 px wide; an id is carried twice on a page; a step's link does not highlight its "
       "element, or highlights it by script or by colour alone; a box's link lands anywhere but the cited lines its first citation's "
       "link lands on; a base element's box takes a link, or a finding's detail holds a base path the draft wrote; a step's item nests "
    "a link; a fragment target lies in a collapsible section; a paragraph's bytes, the drawing's "
       "bytes, `machine.json`, a check record, the reading ledger or the provider golden move; a page without a walk changes; or a "
       "draft of schema v<PS> or earlier changes any finding but the `field-version` one at a walk, or any byte.")

assert LABEL not in src
text = text.replace('2.NN', LABEL)
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(text, encoding='utf-8')
print('ok', len(src.split('\n')), len(text.split('\n')))
