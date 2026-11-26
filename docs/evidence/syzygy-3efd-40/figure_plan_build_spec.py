#!/usr/bin/env python3
"""Build the version 2.33 MODIFIED REQ-polaris-generation-034 (figure plan) from the version 2.32 bytes by anchored edits (syzygy-3efd.40).

Every edit asserts its anchor occurs exactly once. Usage: figure_plan_build_spec.py <worktree> <out>.
"""
import pathlib
import sys

W = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])
src = (W / 'openspec/changes/dossier-question-kind-floor/proposed/polaris-generation/spec.md').read_text(encoding='utf-8')
text = src

# The successor's numbers, kept symbolic so a rebuild over a later predecessor is a change of these constants and the anchors alone.
NUMS = {'<S>': '14', '<PS>': '13', '<B>': '22', '<PB>': '21', '<PV>': '2.32'}


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
assert lines[0].startswith('# Dossier question-kind floor'), lines[0]
assert lines[2].startswith('Candidate version 2.32.'), lines[2][:40]
lines[0] = '# Dossier figure plan: the pictures planned before the prose, and advice on figures that carry too little'
lines[2] = ("Candidate version 2.NN; binds nothing until its agent adoption row in AGENT-ADOPTIONS.md and its version tag. One MODIFIED "
            "requirement, REQ-polaris-generation-034, whose complete text below replaces the effective text that question-kind floor "
            "version <PV> gave it. Draft schema v<S> joins the two schemas that descend from v10, the containment kind and system model "
            "of v11 and v12 and the worth-knowing mark and question kinds of v13, and carries a required figure plan: for the overview, each section and each deep dive, the one "
            "question a picture answers better than text, the figure kind it needs and the diagram that answers it, or why that place has "
            "no figure. Check refuses a plan that does not name every place once or whose figure is not the one drawn there, and advises, "
            "gating nothing, on a figure that is a chain of three or fewer, one that draws nothing another figure does not, and one that "
            "draws a part of the system beside a part within it without a contains arrow or a nesting between them. The plan renders nowhere. "
            "Brief v<B> is brief v<PB> with the containment and system-model paragraphs of briefs v17 and v18 and one paragraph asking for the plan. "
            "Every other sentence and scenario of the predecessor is carried unchanged; the exact changes are in SEMANTIC-DELTA.md. "
            "Unmentioned effective requirements are unchanged.")
text = '\n'.join(lines[:2] + [sym(lines[2])] + lines[3:])

# The brief-version list, the schema each brief issues and the schemas accepted (the v5 paragraph).
replace('from version 2.24 as `polaris-dossier-brief-v18` from version 2.26 as `polaris-dossier-brief-v19`, and from version 2.29 as '
        '`polaris-dossier-brief-v20`, each with the same readability guidance,',
        'from version 2.24 as `polaris-dossier-brief-v18`, from version 2.26 as `polaris-dossier-brief-v19`, from version 2.29 as '
        '`polaris-dossier-brief-v20`, from version 2.32 as `polaris-dossier-brief-v21` and from version 2.NN as '
        '`polaris-dossier-brief-v<B>`, each with the same readability guidance,')
replace('brief v18 issues schema v12 and briefs v19 and v20 issue schema v13 (below), and a draft in v2, v3, v4, v5, v6, v7, v8, v9, '
        'v10, v11, v12 or v13 is accepted.',
        'brief v18 issues schema v12, briefs v19, v20 and v21 issue schema v13 and brief v<B> issues schema v<S> (below), and a draft in '
        'v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13 or v<S> is accepted.')

# The figure-plan paragraphs, after the brief v21 paragraph (version 2.32).
ANCHOR = ('which stay out of every authoring text (the comprehension-regression rule of `CONTRIBUTING.md`).')
KINDS = ('`flow`, `lifecycle`, `state-machine`, `boundary`, `dependency`, `placement`, `sequence`, `swimlane` and `containment`')
PARAGRAPHS = [
    # P1: the schema.
    "A draft in schema `polaris-dossier-local-draft-v<S>` (version 2.NN) joins the two schemas that descend from schema v10. It is a "
    "schema-v12 draft in every respect, with the containment kind of version 2.23 and the model and views of version 2.24, that MAY also "
    "carry every member a schema-v13 draft may carry, the worth-knowing mark of version 2.26 (`worthKnowing` on a claim block and "
    "`worthKnowingNone` on a Pole) and the `questionKinds` of version 2.32, each where and as a v13 draft may and under every rule this "
    "requirement states for it there, and it SHALL carry one member more, a "
    "top-level member `figurePlan`, the authoring session's figure plan, written before the prose: for each place a figure can be homed, "
    "the one question a picture there answers better than text and the kind of figure it needs, or why that place has none. The places "
    "are the overview, each section and each deep dive of the draft, each written as a v5 `home` names it: `{\"kind\": \"overview\"}`, "
    "`{\"kind\": \"section\", \"target\": <a section's identity>}` or `{\"kind\": \"deep-dive\", \"target\": <a deep dive's identity>}`, "
    "each `target` a string, and nothing else is a place form; two places are the same where their `kind` and their `target`, compared by exact code units, are. `figurePlan` is a list holding "
    "exactly one entry for each place, in any order, and each entry is exactly one of two forms. `{\"home\": <place>, \"question\": "
    "<text>, \"kind\": <figure kind>, \"figure\": <a diagram's identity>}` is a planned figure: `kind` is one of the nine figure kinds of "
    f"versions 2.5 and 2.23, {KINDS}, and `figure` names the diagram that answers the question, which SHALL be homed at that place and "
    "be of that kind. `{\"home\": <place>, \"omitted\": <text>}` says why the place has no planned figure: no question there is answered "
    "better by a picture, or the planned figure could not be drawn. `question` and `omitted` are each a string of 1 to 300 Unicode "
    "code points holding at least one that is not white space (U+0009 to U+000D and U+0020). A planned figure names one diagram, and its place may hold other diagrams that the plan does not name. "
    "A graph or containment diagram of a v<S> draft carries the `view` version 2.24 gives it, so a planned figure of one of those kinds "
    "names the diagram whose view draws it; the plan names diagrams alone, never an element, a relationship or a view, a view having "
    "no identity of its own, and the view's selection is checked by version 2.24 and never compared with the plan. The plan is the "
    "authoring session's working record, read by check alone: it is no claim block and carries no label, citation or quotation; no page "
    "renders it; `machine.json`, `dossier.json`, `derived-structure.json` and the size report carry none of it; and it enters no claim "
    "count, claim list, fidelity entry or reading ledger. Whether a planned question is the right one, and whether an omission's reason "
    "holds, are the authoring session's judgement and the rendered-design review's, never a check. Every rule this requirement and "
    "REQ-polaris-generation-035 state for a schema-v12 draft holds for a schema-v<S> draft, and so does every rule they state for a "
    "schema-v13 draft's worth-knowing mark, its findings, its advice and its callout, and for `questionKinds` and its advice: wherever "
    "such a rule names schema v13 alone, as the worth-knowing advice, the callout and the question-kind advice do, it SHALL read "
    "schema v13 or v<S>. The v<S> schema document admits `worthKnowing`, `worthKnowingNone` and `questionKinds` where and as the v13 "
    "document does, and the containment kind, `model` and `view` where and as the v12 document does. A plan entry's `question` is the "
    "authoring session's own words and none of the six question kinds of version 2.32: rule `question-kind-floor` reads no plan entry "
    "and counts no diagram, a diagram being no claim block it counts, and a `figurePlan` entry is never a `questionKinds` object.",
    # P2: the findings.
    "For a v<S> draft Syzygy SHALL report these repair findings, each of kind `figure-plan` unless another kind is named, with the "
    "literal detail given. At `$.figurePlan` where the member is absent, with the detail `` a v<S> draft plans its figures: one "
    "`figurePlan` entry for the overview, each section and each deep dive ``; and where it is present and is not a list, with the detail "
    "`` `figurePlan` is a list of plan entries ``. At `$.figurePlan[<k>]`, `<k>` being the entry's index, for an entry that is not an "
    "object, that does not carry `home` and exactly the further members of one of the two forms, or whose `home` is not one of the three "
    "place forms, whose `question` or `omitted` is not a string of 1 to 300 Unicode code points holding at least one that is not white space, or whose `kind` is not one of the nine "
    "figure kinds, with the detail `` a plan entry is {\"home\", \"question\", \"kind\", \"figure\"} or {\"home\", \"omitted\"} ``; an "
    "entry with this finding is not well formed, and no other finding of this paragraph reads it. A finding of kind "
    "`unresolved-reference` at `$.figurePlan[<k>].home.target` for a well-formed entry whose `target` names no section, or no deep dive, "
    "of the draft, as its `kind` says, with the detail `` no section or deep dive has the identity named by "
    "`figurePlan[<k>].home.target` ``, `<k>` written as the entry's index. Such an entry names no place: it is a second entry for no "
    "place, the `home` of the diagram it plans is not compared with it, and it plans no place; every other finding of this paragraph reads it as "
    "any well-formed entry. At `$.figurePlan[<k>].home` for a well-formed entry naming the "
    "same place as an earlier well-formed entry that names a place, with the detail `` <place>: a second plan entry for this place ``. For a well-formed "
    "planned figure: a finding of kind `unresolved-reference` at `$.figurePlan[<k>].figure` where `figure` names no diagram of the "
    "draft, with the detail `` no diagram has the identity named by `figurePlan[<k>].figure` ``, `<k>` written as the entry's index; and, "
    "where it names a diagram, one at `$.figurePlan[<k>].figure` where that diagram's `home` is not the entry's place, with the detail `` "
    "<identity>: a planned figure is homed at its plan entry's place ``, and another where that diagram's `kind` is not the entry's "
    "`kind`, with the detail `` <identity>: a planned figure is of the kind its plan entry names ``, `<identity>` being the diagram's "
    "identity; a diagram that fails both raises both, the home finding first. Then, at `$.figurePlan`, one finding for each place that "
    "no well-formed entry names, the overview first, then the sections and then the deep dives, each in draft order, with the detail `` "
    "<place>: no plan entry for this place ``. `<place>` is written `overview`, `section <identity>` or `deep dive <identity>`, with the "
    "section's or deep dive's identity. The findings of the entries come in entry order, each entry's in the order stated here, before "
    "the findings for places no entry names, and all of them follow every finding version <PV> reports for the draft. The v<S> schema "
    "document admits any value at `figurePlan`, so that the generic schema check reports nothing at or below that path and every "
    "failure of the plan's form is a finding of this paragraph. A draft with such a finding does not proceed to review until a "
    "resubmitted revision passes. A planned figure whose diagram has a disposition other than `produced` raises no finding for that: the "
    "disposition is the draft's reasoned account of a figure not drawn.",
    # P3: the advice.
    "For a v<S> draft whose check reports no finding of kind `schema`, `syzygy dossier check` SHALL compute figure advice and SHALL carry "
    "it on its report as the member `figureAdvice`; check SHALL write it into no check record and no other file. The member is "
    "`{\"rules\": [{\"id\": \"figure-information-floor\", \"version\": 1}, {\"id\": \"figure-duplicate\", \"version\": 1}, {\"id\": "
    "\"figure-mixed-levels\", \"version\": 1}], \"examined\": <count>, \"advisories\": [...]}`, where `examined` counts the draft's "
    "diagrams whose disposition is `produced`, which are the figures the rules read; no rule reads a diagram of another disposition, or "
    "compares one with another figure. Each advisory is `{\"rule\", \"diagram\", \"at\", \"detail\"}`, naming the figure it advises on by "
    "its identity and, as `at`, by `$.diagrams[<i>]`, its index in the draft; advisories are ordered by that index and, for one figure, "
    "by the rule order above, and a rule gives at most one advisory for a figure. A graph or containment figure of a v<S> draft, which "
    "carries a `view`, is read by every rule as its expansion, the schema-v11 figure version 2.24 renders it as: its nodes, edges and "
    "groups are the expansion's, in the expansion's order, a derived relationship's edge among them with the `relation` it carries, "
    "and a view entry naming no element or relationship of the model adds nothing to it. That two views select one element is no "
    "duplication in itself: their figures are compared by their keys as any two figures are. A containment's groups are read in draft order, or in its expansion's order, each "
    "group before its children and its children in their order. Rule `figure-information-floor` version 1 advises on a figure that "
    "carries too little to be worth a picture, a chain of three or fewer being a sentence: a figure of one of the six graph kinds with "
    "at most three nodes and at most one edge fewer than it has nodes; a `swimlane` with at most three steps; a `sequence` with at most "
    "two messages; and a `containment` with at most three groups in all; so a chain or fan of three boxes, or three groups one inside "
    "the next, is advised on, and a fourth node, a third edge among three nodes, a fourth step, a third message or a fourth group is "
    "not. Its detail is `` <identity>: a chain of three or fewer is a sentence; say it in the prose, or draw what a sentence cannot "
    "hold ``. Rule `figure-duplicate` version 1 advises on a figure that draws nothing another figure of its family does not, comparing "
    "keys made from labels. A label's key is the label with its leading and trailing white space removed, each run of white space "
    "inside it replaced by one space, and each letter A to Z replaced by its lowercase letter, white space being the characters U+0009 "
    "to U+000D and U+0020 and no other character being changed. A graph figure's keys are `[\"box\", <key of the label>]` for each node "
    "and `[\"arrow\", <key of its from-node's label>, <key of its to-node's label>]` for each edge; a sequence's, `[\"box\", <key>]` for "
    "each participant and `[\"arrow\", <key of its sender's label>, <key of its receiver's label>]` for each message; a swimlane's, "
    "`[\"box\", <key>]` for each lane and `[\"step\", <key of its lane's label>, <key of its label>]` for each step; and a containment's, "
    "`[\"box\", <key>]` for each group and `[\"in\", <key of its parent's label>, <key of its label>]` for each group drawn inside "
    "another. An edge's or message's own label is part of no key, and an edge, message or step whose reference names no node, "
    "participant or lane of its figure gives no key. A figure's keys are a set: a repeated key counts once, and the order of "
    "messages and steps is not compared, so two sequences of the same messages in another order are advised on as duplicates. Two figures are of one family where both are of graph kinds, both are sequences, "
    "both are swimlanes or both are containments. A figure A draws nothing another figure B of its family does not where A has at least "
    "one `arrow`, `step` or `in` key, every key of A is a key of B, and either B has a key that A has not, or the two have the same keys "
    "and B comes before A in the draft. The rule advises on A, naming the first such B in draft order, with the detail `` <identity>: "
    "everything it draws is drawn by <other identity>; keep one figure, or draw what the other does not ``; so of two figures "
    "with the same keys only the later is advised on, and a figure with one box, arrow or nesting of its own is not. Rule "
    "`figure-mixed-levels` version 1 advises on a graph or containment figure that draws a part of the system beside a part within it "
    "without saying that one holds the other. It reads only the `unit` members that version 2.19 lets a node carry and version 2.23 "
    "lets a group carry and, for a figure drawn from a view, the `parent` members of the model's elements, so every sequence and "
    "swimlane is in no comparison. An element X encloses an element Y where X is an ancestor of Y in the model: following `parent` "
    "from Y one element at a time, the walk reaches X before it reaches an element with no `parent`, a `parent` naming no element, or "
    "an element it has already reached. X also encloses Y where X's unit encloses Y's: where X's is `{\"kind\": \"repository-root\"}` and Y's is of any kind but `repository-root` and `dependency-name`; or "
    "where X's is `{\"kind\": \"top-level-directory\", \"path\": <P>}` and Y's is a `package-manifest`, `workflow-job` or "
    "`compose-service` unit whose `path` begins with P followed by `/`. A graph figure says that X holds Y where a chain of one or "
    "more edges of the figure whose `relation` is `contains`, each starting at the node the one before it ends at, leads from X to Y, and a containment says so where Y is drawn inside X, at any depth. The rule "
    "advises on a figure holding two elements X and Y, X enclosing Y, where the figure does not say that X holds Y, naming the "
    "first such pair, ordered by X's place among the nodes or groups and then by Y's, with the detail `` <identity>: <X's identity> and "
    "<Y's identity> stand for a part and a part within it, and the figure does not show that one holds the other; draw one level, or "
    "show the containment ``; "
    "so a graph of the repository root with its top-level directories joined by `contains` arrows, a containment that draws those "
    "directories inside the root, a figure of two top-level directories, and a figure of one top-level directory beside a package "
    "manifest under another is not advised on, while a containment that draws the root and one of its top-level directories side by "
    "side as two top-level groups, nesting something else, is, and so is a graph view showing an element and its `parent` with no "
    "`contains` arrow from the one to the other. The advice is Inferred, a computation over the draft's bytes alone that reads no blob, layout, record or fact, "
    "and two checks of the same draft bytes give the same member. A failure to compute it, at any point and for any cause, SHALL NOT "
    "refuse or fail a check: the report then carries no `figureAdvice` member. Each advisory is one a change to the draft clears, so it is advice to "
    "the author in the sense of version 2.9, and, like the inventory-coverage advice of version 2.12, it carries no class member and is "
    "on the report beside the `author`-class advice. It gates nothing: it is no repair finding, sets no outcome, exit status or "
    "readiness, is read by no render, review or close, and is counted by no reading ledger, reading difference, `run-advice.json` or "
    "page. Whether a figure the rules pass carries enough, says something new or keeps to one level stays the rendered-design review's "
    "judgement, and a figure the rules advise on may stand where the author judges it right. A check of a draft of schema v<PS> or "
    "earlier, of a v<S> draft with a `schema` finding, or of an inventory carries no `figureAdvice` member, and its absence says nothing "
    "about the figures.",
    # P4: the brief.
    "Brief v<B> SHALL issue schema v<S>; it is brief v<PB> changed only in its version line, its draft-schema line, which names schema v<S> "
    "and that schema's digest, and three paragraphs: immediately after the hero paragraph brief v<PB> carries, the containment paragraph "
    "brief v17 carries, word for word; immediately after that, the system-model paragraph brief v18 carries, word for word; and "
    "immediately after that, one paragraph which reads: "
    "\"Plan the figures before you write the prose, in `figurePlan`: one entry for the overview, each section and each deep dive, its "
    "`home` written as a diagram's `home` is. For each place, write the one question a picture there answers better than text in "
    "`question`, the figure kind it needs in `kind`, and the diagram that answers it in `figure`, homed there and of that kind; for a "
    "graph or containment, that is the diagram whose `view` draws it. Where no "
    "picture would answer better than text, or the planned figure cannot be drawn, write `{\"home\": <place>, \"omitted\": \"<why>\"}` "
    "instead. The plan is not published. A draft whose plan misses a place, names one twice or names a figure that is not the one drawn "
    "there is refused; check only advises where a figure is a chain of three or fewer, draws nothing another figure does not, or draws "
    "a part beside a part of it, by `unit` or `parent`, without showing that one holds the other.\" Every statement above of what "
    "brief v<PB> carries, equals or differs by holds of brief v<B> apart from those five differences. The success report and the brief "
    "record SHALL name brief v<B>.",
    # P5: earlier schemas, the rendered bytes, the provider.
    "A draft in schema v<PS> or earlier SHALL be checked and rendered exactly as version <PV> checks and renders it, the same findings and "
    "the same bytes of every page, of `machine.json` and of every record check writes, and its check's report carries no "
    "`figureAdvice`, except that a `field-version` finding at `$.figurePlan`, with the detail `` `figurePlan` needs draft schema "
    "polaris-dossier-local-draft-v<S> ``, stands in place of the `schema` finding at that path for a draft that carries `figurePlan`; "
    "wherever this requirement says that a draft of an earlier schema is checked or rendered exactly as an earlier version checks or "
    "renders it, that exception holds too. A v13 draft that carries a containment diagram, a `model` or a `view` keeps the `schema` "
    "finding version 2.26 gives it there: only schema v<S> joins them to the worth-knowing mark. The plan and the advice move no "
    "rendered byte: Syzygy SHALL render a v<S> draft's pages, `machine.json`, `dossier.json` and size report exactly as it renders, under "
    "the rules this requirement states for schemas v12 and v13, the same draft without `figurePlan`, apart from any byte that names the "
    "draft's schema or digest, and its reading ledger is that draft's. The provider mode is unaffected: the provider stages' closed "
    "draft schema gains no `figurePlan`, and the rendered bytes the provider golden pins do not change. The migration of version 2.24 "
    "is unchanged and yields a schema-v<PS> draft; no migration yields a v<S> draft, a figure plan being the authoring session's to "
    "write.",
]
replace(ANCHOR, ANCHOR + '\n\n' + '\n\n'.join(PARAGRAPHS))

# Scenarios, after version 2.23's last scenario and before the Form block that follows it.
LAST = '#### Scenario: Brief v21 teaches the six kinds'
once(LAST)
head, tail = text.split(LAST, 1)
form_at = tail.index('\nForm: event-response.\n')
SCENARIOS = r'''
#### Scenario: A figure plan names each place's question and figure

- **WHEN** a schema-v<S> draft with one section `write-path` and one deep dive `replication` carries a `figurePlan` of three entries: `{"home": {"kind": "overview"}, "question": "What are the main parts and what surrounds them?", "kind": "boundary", "figure": "system"}`, where `system` is a `boundary` diagram homed on the overview; a planned figure for `{"kind": "section", "target": "write-path"}` of kind `sequence` naming a `sequence` diagram homed in that section; and `{"home": {"kind": "deep-dive", "target": "replication"}, "omitted": "Two steps read better as one sentence."}`
- **THEN** check reports no `figure-plan`, `unresolved-reference` or `schema` finding for the plan, and the draft proceeds to review
- **AND** no page, `machine.json`, `dossier.json` or size report carries the text of a `question` or an `omitted`, and every page's bytes equal those Syzygy renders for the same draft without `figurePlan`, apart from any byte that names the draft's schema or digest

#### Scenario: Draft without a figure plan refused

- **WHEN** a schema-v<S> draft carries no `figurePlan`, and again with a `figurePlan` that is an object
- **THEN** check reports one finding of kind `figure-plan` at `$.figurePlan`, with the detail ``a v<S> draft plans its figures: one `figurePlan` entry for the overview, each section and each deep dive`` for the first and `` `figurePlan` is a list of plan entries `` for the second, and no `schema` finding at that path
- **AND** the draft does not proceed to review until a resubmitted revision passes

#### Scenario: Every place is planned once

- **WHEN** a schema-v<S> draft with sections `a` and `b` and no deep dive carries well-formed plan entries for the overview, for section `a` and again for section `a`, and none for section `b`
- **THEN** check reports a `figure-plan` finding at `$.figurePlan[2].home` with the detail `section a: a second plan entry for this place`, then one at `$.figurePlan` with the detail `section b: no plan entry for this place`
- **AND** where the third entry's `home` is instead `{"kind": "section", "target": "c"}` and the draft has no section `c`, check reports a finding of kind `unresolved-reference` at `$.figurePlan[2].home.target` with the detail ``no section or deep dive has the identity named by `figurePlan[2].home.target` `` and still reports section `b` unplanned; a fourth entry with that same unresolved `home` gets its own `unresolved-reference` finding and no `a second plan entry` finding; a planned figure in such an entry, naming a diagram of its kind homed in a section, gets no home finding; and a `target` that is not a string, such as `7`, gets the malformed-entry finding at `$.figurePlan[<k>]` and no `unresolved-reference` finding

#### Scenario: Malformed plan entry refused

- **WHEN** a schema-v<S> plan entry carries both `figure` and `omitted`, or neither, or a further member, or a `kind` of `pie`, or an empty `question`, one of 301 Unicode code points or one of white space alone, or a `home` of kind `pole`, or is a string
- **THEN** check reports for that entry one finding of kind `figure-plan` at `$.figurePlan[<k>]` with the detail `a plan entry is {"home", "question", "kind", "figure"} or {"home", "omitted"}`, no other plan finding for it, and no `schema` finding at or below `$.figurePlan`
- **AND** the place that entry was meant for is reported unplanned where no other entry names it, and an entry whose `kind` is `containment` is well formed

#### Scenario: A planned figure is the one drawn at its place

- **WHEN** the fourth of a schema-v<S> draft's plan entries plans a figure `missing` that no diagram of the draft is, and, in turn, a `flow` diagram `f` homed in another section under the kind `flow`, a `sequence` diagram `s` homed at the entry's place under the kind `swimlane`, and a `sequence` diagram `s2` homed in another section under the kind `flow`
- **THEN** check reports a finding of kind `unresolved-reference` at `$.figurePlan[3].figure` with the detail ``no diagram has the identity named by `figurePlan[3].figure` `` for the first, and, at `$.figurePlan[3].figure`, the finding of kind `figure-plan` with the detail `f: a planned figure is homed at its plan entry's place` for the second, `s: a planned figure is of the kind its plan entry names` for the third, and both, the home finding first, for the fourth
- **AND** a planned figure whose diagram is homed at the entry's place and of its kind, with the disposition `omitted`, raises no finding

#### Scenario: Earlier schema keeps its bytes with a figure plan added

- **WHEN** a draft of schema v<PS> or earlier is checked and rendered, once as stored and once with a `figurePlan` member added
- **THEN** the stored draft's findings and the bytes of every page, of `machine.json` and of every record check writes are those version <PV> gives it, and its check's report carries no `figureAdvice`
- **AND** the draft with `figurePlan` added gets a `field-version` finding at `$.figurePlan` with the detail `` `figurePlan` needs draft schema polaris-dossier-local-draft-v<S> `` in place of the `schema` finding at that path, every other finding is unchanged, and a provider-mode render's bytes equal those the provider golden pins

#### Scenario: A chain of three or fewer is advised as a sentence

- **WHEN** a schema-v<S> draft whose check reports no `schema` finding holds, all produced and in this order, a `flow` whose view shows three elements chained by two relationships, a `boundary` whose view shows three elements and two relationships from one of them, a `flow` whose view shows four elements chained by three relationships, a `dependency` whose view shows three elements and three relationships, a `swimlane` of three steps, a `swimlane` of four steps, a `sequence` of two messages, a `sequence` of three messages, a `containment` whose view shows three elements, each the `parent` of the next, and a `containment` whose view shows four elements
- **THEN** the report's `figureAdvice` has `examined` 10 and holds a `figure-information-floor` advisory for the first, second, fifth, seventh and ninth figures alone, each at `$.diagrams[<i>]` with the detail `<identity>: a chain of three or fewer is a sentence; say it in the prose, or draw what a sentence cannot hold`
- **AND** an eleventh diagram, a `flow` whose view shows three elements and two relationships and whose disposition is `omitted`, gets no advisory and leaves `examined` at 10

#### Scenario: A figure that draws nothing new is advised as a duplicate

- **WHEN** a schema-v<S> draft holds, all produced and in this order, a `flow` `a` whose view shows five elements chained by four relationships; a `dependency` `b` whose view shows five other elements, whose labels differ from those of `a`'s only in letter case and white space, joined as `a`'s are by relationships with labels of their own; a `flow` `c` whose view shows four of `a`'s elements and three of its relationships; a `flow` `d` whose view shows all of `a`'s and one more element; a `flow` `e` whose view shows `a`'s elements with one relationship replaced by one in the opposite direction; a `sequence` whose participants and messages carry `a`'s element labels and relationships' ends; a `containment` `k1` whose view shows an element `Workspace` and elements `api` and `web` whose `parent` it is; a `containment` `k2` whose view shows an element labelled `workspace` and an element labelled `API` whose `parent` it is; two sequences `q1` and `q2` of the same two messages in opposite orders; and a `flow` `g` whose view selects exactly the elements and relationships `d`'s does
- **THEN** the report's `figureAdvice` holds, under rule `figure-duplicate`, an advisory for `a` with the detail `a: everything it draws is drawn by d; keep one figure, or draw what the other does not`, one for `b` naming `a`, one for `c` naming `a`, one for `k2` naming `k1`, one for `q2` naming `q1` and one for `g` naming `d`
- **AND** it holds none under that rule for `d`, `e`, the first sequence, `k1` or `q1`

#### Scenario: A figure that mixes levels is advised

- **WHEN** a schema-v<S> draft's model holds, among others, the elements `root` with the unit `{"kind": "repository-root"}`; `src`, whose `parent` is `root`, with the unit `{"kind": "top-level-directory", "path": "src"}`; `lib`, with no `parent`, with the unit `{"kind": "top-level-directory", "path": "lib"}`; `app`, whose `parent` is `lib`, without `unit`; `pkgs` and `pack` with no `parent`, with the units of the top-level directories `packages` and `pack`; `core`, with no `parent`, with the unit `{"kind": "package-manifest", "path": "packages/core/package.json"}`; `svc`, of type `service`, and `mod`, of type `module` and whose `parent` is `svc`, both without `unit`; and `x` and `y`, with no `parent` and without `unit`; and it holds produced figures whose views show: `f1`, a graph of `lib` and the repository root `root`, joined by one relationship of `relation` `calls`; `f2`, the same with a relationship of `relation` `contains` from `root` to `lib`; `f3`, a graph of `pkgs` and `core` with no relationship between them; `f4`, as `f3` with `pack` in place of `pkgs`; `f5`, a graph of `x` and `y`; `f6`, a containment of `root` and `src`, whose expansion draws `src` inside `root`; `f7`, a containment of `root`, `lib` and `app`, whose expansion draws `root` and `lib` side by side as top-level groups, `lib` holding `app`; `f8`, a graph of `root`, `pkgs` and `core`, with relationships of `relation` `contains` from `root` to `pkgs` and from `pkgs` to `core` and none from `root` to `core`; `f9`, a graph of `svc` and `mod` joined by one relationship of `relation` `calls`; `f10`, as `f9` with a relationship of `relation` `contains` from `svc` to `mod`; and `f11`, a containment of `root` and `app` and no other element
- **THEN** the report's `figureAdvice` holds a `figure-mixed-levels` advisory for `f1` with the detail `f1: root and lib stand for a part and a part within it, and the figure does not show that one holds the other; draw one level, or show the containment`, and one each for `f3`, `f7` and `f9`, the one for `f9` naming `svc` and `mod`
- **AND** it holds none under that rule for `f2`, `f4`, `f5`, `f6`, `f8`, `f10` or `f11`, `app` being of no unit and its parent `lib` not shown

#### Scenario: Figure advice gates nothing

- **WHEN** a schema-v<S> draft that otherwise passes check holds figures that each of the three rules advises on
- **THEN** check passes, the draft proceeds to review, and the advisories are on the report's `figureAdvice` alone: the check record, `run-advice.json`, the reading ledger, the reading difference and every page carry and count none of them
- **AND** the report of a check of a v<S> draft with a `schema` finding, of a v<PS> draft and of an inventory carries no `figureAdvice` member

#### Scenario: Schema v<S> joins the system model to the worth-knowing mark

- **WHEN** a schema-v<S> draft carries a `model`, a graph diagram and a containment diagram each drawn from a `view`, a section's own paragraph labelled Inferred with one citation and `worthKnowing: true`, a `questionKinds` object naming that paragraph with the kind `mechanism`, and a well-formed `figurePlan` planning both diagrams
- **THEN** check reports no `schema`, `field-version` or `worth-knowing` finding, its report carries `figureAdvice`, the `worthKnowing` member of `readerAdvice` and `questionKindAdvice`, each view renders as its expansion, and the marked paragraph renders in the page's worth-knowing callout where it is lifted
- **AND** `questionKindAdvice` counts that paragraph and no diagram or plan entry; the same members in a schema-v13 draft give `schema` findings at the `model` and the views and a `field-version` finding at `$.figurePlan`; and in a schema-v12 draft they give the `field-version` findings at `worthKnowing`, at `$.questionKinds` and at `$.figurePlan`

#### Scenario: Brief v<B> asks for the figure plan

- **WHEN** a run is briefed under this version
- **THEN** the brief is `polaris-dossier-brief-v<B>`, issuing schema `polaris-dossier-local-draft-v<S>`, and equals brief v<PB> for the same run except its version line, its draft-schema line, brief v17's containment paragraph placed immediately after the hero paragraph, brief v18's system-model paragraph immediately after that, and the one figure-plan paragraph immediately after that, and the success report and the brief record name brief v<B>
'''
text = head + LAST + tail[:form_at] + '\n' + sym(SCENARIOS).strip('\n') + '\n' + tail[form_at:]


# The four Form lines of the last Form block, each extended at its end.
def extend(end, addition):
    replace(end, end[:-1] + addition)


extend("then separately remove only the instruction or restore only the v19 version.",
       "; and, for version 2.NN, schema-v<S> drafts with complete, incomplete, repeated and malformed figure plans, planned figures named, "
       "unresolved, misplaced and of the wrong kind, and omitted places; figures on each side of each advice rule's boundary (a third "
       "and a fourth node, a third edge among three nodes, a third and a fourth step, a second and a third message, a third and a fourth "
       "group; equal, contained, extended and reversed keys and another family; a unit enclosing another with and without a `contains` "
       "arrow, a chain of them or a nesting, a directory that is only a prefix of a path, and an element beside its model parent or "
       "grandparent in a graph view and a containment view); views sharing elements; entries with an unresolved or non-string "
       "`target`; the same drafts with their draft layer withheld; schema-v<S> drafts joining views, a containment, the worth-knowing mark "
       "and `questionKinds`; and drafts of schema v<PS> and earlier with and without `figurePlan`, `model` and `view`.")
extend("the check record and step log beside it, and the issued brief v21.",
       "; for version 2.NN, the plan findings with their paths, details and order, the report's `figureAdvice` member, the check record, "
       "`run-advice.json` and reading ledger beside it, the brief v<B> figure-plan paragraph, and the rendered bytes of a v<S> draft beside "
       "the same draft without `figurePlan`, and a v<S> draft's `worthKnowing` advice, callout and `questionKindAdvice` beside the same "
       "members' in a v13 draft.")
extend("outside the advice code.",
       "; for version 2.NN, each fixture's expected plan findings and advisories written as literals before check runs, each label key "
       "computed by hand from each view's expansion, and a v<S> draft's pages compared byte for byte with the same draft rendered "
       "without `figurePlan`.")
extend("or the brief's paragraph names a regression question.",
       "; for version 2.NN, a v<S> draft without a plan, with a place unplanned or planned twice, or with a planned figure that is "
       "missing, homed elsewhere or of another kind proceeds to review; a plan entry's text reaches a page or a published file; an "
       "advisory is a finding, changes an outcome or a record, or is counted by the reading ledger or `run-advice.json`; an advisory "
       "fires on a fixture outside its rule or is missing from one inside it; or a draft of schema v<PS> or earlier changes any finding "
       "but the `field-version` one at `$.figurePlan`, or any byte; a v<S> draft loses the worth-knowing mark, its callout or its advice, "
       "or the question-kind advice; or the question-kind floor counts a diagram or a plan entry.")

assert '2.NN' not in src and '2.33' not in src
text = text.replace('2.NN', '2.33')
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(text, encoding='utf-8')
print('ok', len(src.split('\n')), len(text.split('\n')))
