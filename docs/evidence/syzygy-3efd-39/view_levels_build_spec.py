#!/usr/bin/env python3
"""Build the version 2.45 MODIFIED REQ-polaris-generation-034 (view levels, scope and zoom links) from the version 2.44 bytes by anchored edits (syzygy-3efd.39).

Every edit asserts its anchor occurs exactly once. Usage: view_levels_build_spec.py <worktree> <out>.

The predecessor is imports corroboration 2.44. Draft schema v17 gives a graph or containment view a `level` and a `scope`;
a level admits element types, enforced by check findings; and a box whose element has its own view carries a zoom link to
it, with no script (design.md D1 to D8).
"""
import pathlib
import sys

W = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])
PREDECESSOR = 'openspec/changes/dossier-imports-corroboration/proposed/polaris-generation/spec.md'
src = (W / PREDECESSOR).read_text(encoding='utf-8')
text = src


def replace(old, new):
    global text
    n = text.count(old)
    assert n == 1, (n, old[:90])
    text = text.replace(old, new, 1)


lines = text.split('\n')
assert lines[0].startswith('# Dossier imports corroboration'), lines[0]
assert lines[2].startswith('Candidate version 2.44;'), lines[2][:40]
lines[0] = '# Dossier view levels: a level and a scope for each view, and zoom links between views'
lines[2] = ("Candidate version 2.45; binds nothing until its agent adoption row in AGENT-ADOPTIONS.md and its version tag. One MODIFIED "
            "requirement, REQ-polaris-generation-034, whose complete text below replaces the effective text that imports corroboration "
            "version 2.44 gave it. Draft schema v17 lets the view of a graph or containment diagram carry a `level` (`context`, "
            "`container` or `component`) and a `scope` (the element the view is about); the level admits element types and the scope "
            "bounds what a container or component view shows, both enforced as repair findings; and a figure that draws as a box an "
            "element that has its own view links that box, and its list item, to that view, with no script. Brief v25 issues schema "
            "v17. The two meanings of \"level\" (a view's abstraction level, and the enclosure that rule `figure-mixed-levels` reads) "
            "are kept apart. Every other sentence and scenario of the predecessor is carried unchanged but one sentence of version "
            "2.24 that said a view names no level or zoom target; the exact changes are in SEMANTIC-DELTA.md. Unmentioned effective "
            "requirements are unchanged.")
text = '\n'.join(lines)

# 2.24's statement that a view names no level or zoom target holds for schemas v12 to v16 alone.
replace("A view is one level: it selects elements and relationships of the model and names no other view, level or zoom target, "
        "and its figure links to no other figure.",
        "A view is one level: it selects elements and relationships of the model and names no other view, level or zoom target, "
        "and its figure links to no other figure; from schema v17 (version 2.45) a view may also name its abstraction level and "
        "the element it is about, and a figure may carry zoom links to other figures, as version 2.45 states, and \"one level\" "
        "here means only that a view is flat, selecting from the one model and nesting no other view.")

LEVEL_DETAIL = "`` <diagram>: a <level> view shows no element of type <type> ``"

ADDED = '''A draft in schema `polaris-dossier-local-draft-v17` (version 2.45) is a schema-v16 draft in every respect but one: the `view` of a graph or containment diagram MAY carry two members more, `level` and `scope`, the two together or neither. `level` is one of `context`, `container` and `component`, the view's level of abstraction: a context view shows a system with the people and the other systems it deals with, a container view shows the parts a system is built of, and a component view shows the modules inside one of those parts. `scope` is the identity of one element of the model, the element the view is about: the system at the centre of a context view, the system whose parts a container view shows, or the part whose modules a component view shows. Each of the nine element types of version 2.24 stands at one level: `system`, `external` and `person` at the context level; `directory`, `package`, `service`, `job` and `store`, the five container types, at the container level; and `module` at the component level. A view's level admits these types: a context view, the three of the context level; a container view, those three and the five container types, every type but `module`; and a component view, the five container types, `module`, `external` and `person`, every type but `system`. The scope of a context or container view is of type `system`, and the scope of a component view of one of the five container types. A base element of version 2.35 has, for this version, the type of the element it stands for: the repository root `system`, a top-level directory `directory`, a listed `package` fact `package` and a listed `module` fact `module`; a display name that a `names` entry gives a base element changes no type. `level` and `scope` are the authoring session's account of what the view shows, read by check and by the zoom links below: they are no claim block and carry no label, citation or quotation, they enter no claim count, claim list, fidelity entry or reading ledger, and `machine.json`, `dossier.json`, `derived-structure.json` and the size report carry none of them. A `level` that is none of the three, a `scope` that is not a string, and a view carrying one of the two members without the other are each a `schema` finding at that member, the last at the one it carries. Every rule this requirement and REQ-polaris-generation-035 state for a schema-v16 draft holds for a schema-v17 draft, the figure plan, the figure advice, the derived bases and the walks among them; wherever such a rule names schema v16, alone or in a list of schemas, it SHALL read it as naming schema v17 too, and the v17 schema document admits every member the v16 document does, where and as it does.

The word "level" has carried two meanings in this requirement, and from version 2.45 they are kept apart. A view's `level` is its level of abstraction, one of the three above; it is a property of a view, never of an element, an element's type standing at a level and a view's level admitting types. Rule `figure-mixed-levels` of version 2.33, and the words "draw one level" in its detail, speak of enclosure instead: one element being a part of another, by `parent` or by unit, as that rule states. The depth at which a containment draws a group, level 1, 2 or 3 in versions 2.23, 2.24 and 2.35, is a depth of drawing, which neither names. Neither reads the other: the checks of this version read element types and the scope's `parent` chain, never a unit; and the advice reads enclosure, never a view's `level` or `scope`, its rules, versions, details and outputs unchanged. So a container view that shows its scope beside the parts within it passes the level check and is advised on by rule `figure-mixed-levels` unless the figure shows that the scope holds them, by `contains` arrows or by drawing them inside it in a containment; and a view at one abstraction level that shows a package and a package within it passes the level check and is advised on as two levels of enclosure.

For a v17 draft Syzygy SHALL report these repair findings, each with the literal detail given, `<diagram>` being the view's diagram identity and `<level>` the view's `level`, computed only for a view whose `level`, `scope` and lists have no `schema` finding; every identity a detail names is a handle, and no detail names a base path. A finding of kind `unresolved-reference` at `$.diagrams[<i>].view.scope` for a `scope` that names no element of the model, with the detail version 2.24 gives that finding for an entry that names no element. Where the scope names an element: a finding of kind `view-scope` at `$.diagrams[<i>].view.scope` for a scope whose type the view's level does not take as a scope, with the detail `` <diagram>: a context or container view is about a system, and a component view about a directory, package, service, job or store ``, and, for a context view that does not select its scope, one with the detail `` <diagram>: a context view shows the system it is about ``, the two, where both hold, in that order. A finding of kind `view-level` at `$.diagrams[<i>].view.elements[<k>]` for each element the view selects whose type the view's level does not admit, with the detail ''' + LEVEL_DETAIL + ''', `<type>` being the element's type; and one at `$.diagrams[<i>].view.base` for a view with a `base` that shows a base element whose type the view's level does not admit, with the same detail, `<type>` being the first such type in the order `system`, `directory`, `package`, `module`. A finding of kind `view-scope-outside` at `$.diagrams[<i>].view.elements[<k>]` for each element the view selects that is, in a container view, of a container type, or, in a component view, of type `module`, and that is neither the scope nor below it, with the detail `` <diagram>: <element> lies outside <scope>, the element this view is about ``, `<element>` and `<scope>` being the two identities. An element is below the scope where, following `parent` from the element one element at a time, the walk reaches the scope before it reaches an element with no `parent`, a `parent` naming no element, or an element it has already reached, as rule `figure-mixed-levels` walks; only an element of the model is so read, never a base element or a unit, and a base element that a `group` entry draws inside an element is not thereby below it. Syzygy SHALL compute `view-scope`, `view-level` and `view-scope-outside` only where the scope resolves; `view-level` at an element only for an element whose `type` has no `schema` finding; `view-scope-outside` only where the draft holds no `element-parent` finding and no `unresolved-reference` finding at a `parent`; and `view-level` at `base` only where the base map is established at check and the view has no `base-reference` or `base-conflict` finding, as version 2.35 computes its own findings, so that where the map is not established the finding is neither computed nor reported. These findings follow every finding version 2.44 reports for the draft, the views in diagram order, and each view's in the order `unresolved-reference`, `view-scope`, `view-level` (its elements in list order, then its base) and `view-scope-outside`, in list order. A draft with such a finding does not proceed to review until a resubmitted revision passes. In a draft of schema v12, v14, v15 or v16 Syzygy SHALL report a finding of kind `field-version` at `$.diagrams[<i>].view.level` and one at `$.diagrams[<i>].view.scope` for a view that carries that member, with the detail `` <diagram>: `level` and `scope` need draft schema polaris-dossier-local-draft-v17 ``; each stands in place of the `schema` finding version 2.44 reports at the same path, and every other finding version 2.44 reports for that draft is kept. A draft of schema v13, or of v11 or earlier, admits no `view` and takes no finding of this version.

An element has its own view where the view of a graph or containment diagram of a v17 draft carries a `scope` naming it, and its zoom target is the first such diagram, in draft diagram order, whose figure renders as a `<figure>` on a page outside every collapsible section, a notice standing in a figure's place not counting; an element with no such figure has no zoom target, and a base element, which no `scope` names, never has one. Syzygy SHALL give a zoom link, with no script, to each element with a zoom target that a figure of a v17 draft draws as a box, a graph node or a containment group, in every such figure but the zoom target itself. `<href>` is `#figure-<target>` where the target figure is on the same page and otherwise the target figure's page path written relative to the page holding the link, followed by `#figure-<target>`, as version 2.24 writes the address of an element's first figure; `<target>` is the target's diagram identity, whose figure carries `id="figure-<target>"` (version 2.15); and `<title>` is the target's diagram title as its figure renders it, escaped as HTML text. The link is given in two places. First, in the figure's list of every component and relationship, the element's item gains, after everything it holds, one space and `<a class="zoom-text" href="<href>">Zoom in: <title></a>`, in the figure that carries the element's claim and in each later figure that draws it alike. Second, where the figure renders as a drawing that version 2.40 would let carry a walk, the figure produced, its place rendering the draft's content, the draft layer not withheld, the drawing passing the inertness check and its width not 1048 px, the drawing carries the layer version 2.40 states: `<div class="walk-figure">` holding the drawing byte for byte and after it `<div class="walk-layer">`, under those class names whether or not the figure has a walk. For a graph figure the layer holds the boxes version 2.40 states; for a containment figure it holds one box `<span class="walk-node" style="left:<x>px;top:<y>px;width:<w>px;height:<h>px">` for each group, in the order the expansion lists the groups, each group before its children, at the position and size of the box the layout draws that group in, in the drawing's own coordinates. The box of an element with a zoom target holds, after any badge and any `walk-source` link a walk gives it, `<a class="zoom-link" href="<href>"><span aria-hidden="true">+</span><span class="visually-hidden">Zoom in to <label>: <title></span></a>`, `<label>` being the element's label as version 2.40 takes a node's label. A figure with a walk and zoom links has one wrapper and one layer, each box holding what both give it; a figure with zoom links and no walk gives its boxes no id, badge or `walk-source` link, so a box with no zoom link is empty, and its layer passes the pointer to the drawing everywhere but over a zoom link, so the drawing keeps its own emphasis of a node under the pointer. A figure that draws no element with a zoom target is rendered as this requirement renders it without this paragraph. In the order of the page each box's zoom link follows that box's other links, and every link of the layer comes before the figure's walk list and its list of every component and relationship, so a keyboard reader moving forward from the figure reaches each zoom link in the drawing's node or group order; following one makes the target `<figure>` the page's target. A view that carries `level` and `scope` gives its figure's `<figure>` element `data-view-level="<level>"` and `data-view-scope="<scope>"`, after every attribute version 2.35 gives it and before its `id`, which stays the last attribute. The pages' stylesheet SHALL set each zoom link at the top right of its box in the 13 px figure text, show the pointer cursor over it, outline it while it has the keyboard focus, by the `:focus-visible` pseudo-class, with an outline that does not rely on colour alone, and leave the drawing visible around it; a page holding at least one zoom link SHALL carry those rules, and a page holding none SHALL NOT. A zoom link adds no read, no source, no claim and no text of the draft but the labels and titles the figures already render.

Brief v25 SHALL issue schema v17; it is brief v24 changed only in its version line, its draft-schema line, which names schema v17 and that schema's digest, and one paragraph placed immediately after the walk paragraph brief v24 carries, which reads: "A graph or containment `view` may say which level it shows and what it is about: a `level`, `context`, `container` or `component`, with a `scope`, the id of one element. A context view is about a `system` and shows it with the people and other systems around it (types system, external and person); a container view is about a `system` and shows its parts (directory, package, service, job and store), with the systems, people and externals they deal with; a component view is about one of those parts and shows the modules inside it, with parts, people and externals but no system. Every part a container view shows, and every module a component view shows, has the view's scope among its parents. Every other figure that draws the scope as a box then links that box, and its list item, to the view, so a reader can zoom in. Show a container or component view's scope only as the outer box of a containment or with `contains` arrows to what it holds, or leave it out." Every statement above of what brief v24 carries, equals or differs by holds of brief v25 apart from those three differences. The success report and the brief record SHALL name brief v25.

A draft in schema v16 or earlier SHALL be checked and rendered exactly as version 2.44 checks and renders it, the same findings and the same bytes of every page, of `machine.json` and of every record check writes, except for the `field-version` findings above in place of the `schema` findings at their paths; wherever this requirement says that a draft of an earlier schema is checked or rendered exactly as an earlier version checks or renders it, that exception holds too. A v17 draft that carries no `level` or `scope` SHALL be checked and rendered exactly as the same draft in schema v16, apart from any byte that names the draft's schema or digest. A view's `level` and `scope` move the findings above and their figure's two attributes; a zoom link moves the bytes of a page holding a figure that draws an element with a zoom target (the list item's link, the wrapper, the layer and the style rules), that page's measures in the size report and the rendered-design packet that carries them, and nothing else: no `machine.json`, `dossier.json`, check record, `run-advice.json`, reading ledger, figure-fit entry or figure advice, no byte of a paragraph and no byte of a drawing. The figure plan of version 2.33 names diagrams alone and is never compared with a view's `level` or `scope`, and a planned figure's `kind` is no level. The provider mode is unaffected: the provider stages' closed draft schema gains no `level` or `scope`, and the rendered bytes the provider golden pins do not change. The migration of version 2.24 is unchanged and yields a schema-v12 draft; no migration yields a v17 draft.'''

ANCHOR = "The provider mode is unaffected: the provider stages' closed draft schema gains no `walk`, and the rendered bytes the provider golden pins do not change. No migration yields a v16 draft."
replace(ANCHOR, ANCHOR + '\n\n' + ADDED)

# Scenarios, before the one Form line.
FORM = '\nForm: event-response.\n'
assert text.count(FORM) == 1
at = text.index(FORM)
SCENARIOS = '''
#### Scenario: A view's level refuses an element of another level

- **WHEN** a schema-v17 draft's model holds `app` of type `system`, `api` of type `package` whose `parent` is `app`, `router` of type `module` whose `parent` is `api`, and `user` of type `person`; and diagram `parts` is a graph whose view has `level` `container` and `scope` `app` and selects `api` and `router`
- **THEN** check reports one finding of kind `view-level` at `$.diagrams[<i>].view.elements[1]`, `<i>` the index of `parts`, with the detail `parts: a container view shows no element of type module`, and no `view-scope-outside` finding for `router`, a module being no part a container view bounds
- **AND** a context view of scope `app` selecting `app` and `api` draws a `view-level` finding at `api` naming type `package`, and a component view of scope `api` selecting `router` and `user` draws no finding of this version

#### Scenario: A view's scope is of its level and bounds what it shows

- **WHEN** the same model also holds `other` of type `system`, `lib` of type `package` whose `parent` is `other`, and `db` of type `store` with no `parent`; and four views carry, in turn, `level` `component` with `scope` `app`; `level` `context` with `scope` `app`, selecting `user` alone; `level` `container` with `scope` `app`, selecting `api`, `lib`, `db` and `user`; and `level` `container` with `scope` `ghost`, which names no element
- **THEN** the first view draws a `view-scope` finding at its `scope` with the detail naming a system and the five container types; the second, a `view-scope` finding with the detail `<diagram>: a context view shows the system it is about`; the third, `view-scope-outside` findings at `lib` and at `db`, in list order, each naming the element and `app`, and none at `api` or `user`; and the fourth, one `unresolved-reference` finding at its `scope` and no other finding of this version
- **AND** a view carrying `level` without `scope`, or `level` `system`, draws a `schema` finding at that member and no other finding of this version

#### Scenario: A base view's level types its base elements

- **WHEN** a v17 draft's containment view of the `directories` map, the map established at check with the repository root and two top-level directories, carries `level` `context` and a `scope` naming a `system` element the view selects, and shows every base element
- **THEN** check reports a `view-level` finding at `$.diagrams[<i>].view.base` whose detail names type `directory` and no base path
- **AND** the same view whose `select` names `.` alone, with its `restReason`, draws no finding of this version, and where the structure record is `unknown` at check no `view-level` finding at `base` is computed or reported

#### Scenario: A box whose element has its own view links to it

- **WHEN** a v17 draft homes the produced graph `ctx` (title `The system and its users`, `level` `context`, `scope` `app`, selecting `app` and `user`) at the overview and the produced graph `parts` (title `Parts of the app`, `level` `container`, `scope` `app`, selecting `api` and `db`, every part below `app`) at deep dive `runtime`, each drawing below 1048 px wide
- **THEN** on `index.html` the list item for `app` in `ctx` ends with ` <a class="zoom-text" href="deep-dives/runtime.html#figure-parts">Zoom in: Parts of the app</a>`, and the `walk-layer` box for `app` holds `<a class="zoom-link" href="deep-dives/runtime.html#figure-parts">`, whose hidden text reads `Zoom in to <label>: Parts of the app`; the box for `user` holds nothing; neither page holds a script; and `ctx`'s `<figure>` carries `data-view-level="context"` and `data-view-scope="app"` before its `id`
- **AND** moving the keyboard focus forward from the start of `ctx` reaches the zoom link before any link of the figure's lists, it shows a focus outline, and following it opens `deep-dives/runtime.html` with `figure-parts` as the page's target; `parts` draws no zoom link to itself, and `machine.json`, `dossier.json` and the check record equal those of the same draft with neither view carrying `level` or `scope` but for the bytes naming the schema or digest

#### Scenario: Zoom links and a walk share one layer

- **WHEN** the overview of the same draft also carries a walk over `ctx` whose first step names `app`, and in a second draft `ctx` is drawn 1048 px wide
- **THEN** `ctx` has one `walk-figure` wrapper and one layer, and the box for `app` holds the badge, then its `walk-source` link where its first citation has one, then the zoom link, in that order, the walk's list following every link of the layer
- **AND** the 1048 px `ctx` carries no wrapper, no layer and no walk, and its list item for `app` still ends with the `zoom-text` link

#### Scenario: No zoom target, no zoom link

- **WHEN** a v17 draft's only view whose `scope` is `app` belongs to a diagram whose disposition is not `produced`, and a second draft carries no `level` or `scope` at all
- **THEN** no figure of the first draft carries a zoom link or a layer for one, no page of it carries the zoom link's style rules, and its figures are rendered as they are with both views' `level` and `scope` removed but for the two attributes on the figures of views that carry them
- **AND** the second draft is checked and rendered exactly as the same draft in schema v16, apart from the bytes naming its schema or digest

#### Scenario: A view's level and the mixed-levels advice read different things

- **WHEN** a v17 draft's graph `parts`, with `level` `container` and `scope` `app`, selects `app`, `api` and `web`, both of type `package` with `parent` `app`, and no `contains` relationship; a containment `nest` with the same level and scope draws `api` and `web` inside `app`; and a graph `pkgs` of `level` `container` and `scope` `app` selects `api` and `api-core`, of type `package` with `parent` `api`
- **THEN** check reports no finding of this version for any of the three views; the figure advice holds a `figure-mixed-levels` advisory for `parts` and one for `pkgs`, each with the detail version 2.33 gives, and none for `nest`
- **AND** removing every `level` and `scope` leaves the figure advice unchanged

#### Scenario: Earlier schemas take level and scope as a field-version

- **WHEN** a schema-v16 draft's graph view `parts` carries `level` `container` and `scope` `app`
- **THEN** check reports a `field-version` finding at `$.diagrams[<i>].view.level` and one at `$.diagrams[<i>].view.scope`, each with the detail ``parts: `level` and `scope` need draft schema polaris-dossier-local-draft-v17``, in place of the `schema` finding there, and every other finding version 2.44 reports for that draft

#### Scenario: Brief v25 offers levels and zoom

- **WHEN** a run is briefed under this version
- **THEN** the brief is `polaris-dossier-brief-v25`, issuing schema `polaris-dossier-local-draft-v17`, and equals brief v24 for the same run except its version line, its draft-schema line and the level paragraph placed immediately after the walk paragraph
- **AND** the success report and the brief record name brief v25'''
text = text[:at] + '\n' + SCENARIOS.strip('\n') + '\n' + text[at:]


def extend(end, addition):
    replace(end, end[:-1] + addition)


extend("with facts not listed, and check records without the member.",
       "; and, for version 2.45, views carrying each `level` and `scope`, selecting elements and base elements of each type, "
       "inside and outside the scope, with zoom targets on the same page and on others, in a notice, and with and without a walk.")
extend("its attributes and evidence text, and its `machine.json` `witness` member.",
       "; for version 2.45, each `view-scope`, `view-level`, `view-scope-outside` and `field-version` finding, each zoom link's "
       "place, address and text, the layer, the order of the page's links, and the keyboard focus moving through them.")
extend("written as literals from the fixture's import facts before the rule runs.",
       "; for version 2.45, each view's expected findings written from the type table and the model's parents, and each zoom "
       "link's expected address written as a literal from the fixture's pages, before check and render run.")
extend("or a page or `machine.json` names an import fact's path or operand.",
       "; for version 2.45, a view shows an element of a type its level does not admit, or a part outside its scope, with no "
       "finding; a box whose element has its own view carries no zoom link or one to another figure; a zoom link needs a script "
       "or is unreachable by keyboard; or a v17 draft without `level` and `scope` renders other bytes than in schema v16.")

assert '2.NN' not in text
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(text, encoding='utf-8')
print('ok', len(src.split('\n')), len(text.split('\n')))
