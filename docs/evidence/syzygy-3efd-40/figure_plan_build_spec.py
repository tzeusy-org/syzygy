#!/usr/bin/env python3
"""Build the version 2.NN MODIFIED REQ-polaris-generation-034 (figure plan) from the version 2.22 bytes by anchored edits (syzygy-3efd.40).

Every edit asserts its anchor occurs exactly once. Usage: figure_plan_build_spec.py <worktree> <out>.
"""
import pathlib
import sys

W = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])
src = (W / 'openspec/changes/dossier-readers-edition/proposed/polaris-generation/spec.md').read_text(encoding='utf-8')
text = src


def once(anchor):
    n = text.count(anchor)
    assert n == 1, (n, anchor[:80])


def replace(old, new):
    global text
    once(old)
    text = text.replace(old, new, 1)


lines = text.split('\n')
assert lines[0].startswith("# Dossier reader's edition"), lines[0]
assert lines[2].startswith('Candidate version 2.22;'), lines[2][:40]
lines[0] = '# Dossier figure plan: the pictures planned before the prose, and advice on figures that carry too little'
lines[2] = ("Candidate version 2.NN; binds nothing until its agent adoption row in AGENT-ADOPTIONS.md and its version tag. One MODIFIED "
            "requirement, REQ-polaris-generation-034, whose complete text below replaces the effective text that reader's edition version "
            "2.22 gave it. Draft schema v11 carries a required figure plan: for the overview, each section and each deep dive, the one "
            "question a picture answers better than text, the figure kind it needs and the diagram that answers it, or why that place has "
            "no figure. Check refuses a plan that does not name every place once or whose figure is not the one drawn there, and advises, "
            "gating nothing, on a figure that is a chain of three or fewer, one that draws nothing another figure does not, and one that "
            "draws a unit beside a unit within it with no contains arrow between them. The plan renders nowhere, and brief v17 asks for it. "
            "Every other sentence and scenario of the predecessor is carried unchanged; the exact changes are in SEMANTIC-DELTA.md. "
            "Unmentioned effective requirements are unchanged.")
text = '\n'.join(lines)

# The brief-version list, the schema each brief issues and the schemas accepted (the v5 paragraph).
replace('from version 2.19 as `polaris-dossier-brief-v15` and from version 2.20 as `polaris-dossier-brief-v16`, each with the same '
        'readability guidance,',
        'from version 2.19 as `polaris-dossier-brief-v15`, from version 2.20 as `polaris-dossier-brief-v16` and from version 2.NN as '
        '`polaris-dossier-brief-v17`, each with the same readability guidance,')
replace('brief v15 issues schema v9 and brief v16 issues schema v10 (below), and a draft in v2, v3, v4, v5, v6, v7, v8, v9 or v10 is '
        'accepted.',
        'brief v15 issues schema v9, brief v16 issues schema v10 and brief v17 issues schema v11 (below), and a draft in v2, v3, v4, v5, '
        'v6, v7, v8, v9, v10 or v11 is accepted.')

# The figure-plan paragraphs, after the reader's edition paragraph (version 2.22).
ANCHOR = ('The provider mode is unaffected: its pages keep their navigation and contents, and the rendered bytes the provider golden pins '
          'do not change.')
KINDS = ('`flow`, `lifecycle`, `state-machine`, `boundary`, `dependency`, `placement`, `sequence` and `swimlane`')
PARAGRAPHS = [
    # P1: the schema.
    "A draft in schema `polaris-dossier-local-draft-v11` (version 2.NN) is a schema-v10 draft in every respect but one: it SHALL carry a "
    "top-level member `figurePlan`, the authoring session's figure plan, written before the prose: for each place a figure can be homed, "
    "the one question a picture there answers better than text and the kind of figure it needs, or why that place has none. The places "
    "are the overview, each section and each deep dive of the draft, each written as a v5 `home` names it: `{\"kind\": \"overview\"}`, "
    "`{\"kind\": \"section\", \"target\": <a section's identity>}` or `{\"kind\": \"deep-dive\", \"target\": <a deep dive's identity>}`; "
    "two places are the same where their `kind` and their `target`, compared by exact code units, are. `figurePlan` is a list holding "
    "exactly one entry for each place, in any order, and each entry is exactly one of two forms. `{\"home\": <place>, \"question\": "
    "<text>, \"kind\": <figure kind>, \"figure\": <a diagram's identity>}` is a planned figure: `kind` is one of the eight figure kinds of "
    f"version 2.5, {KINDS}, and `figure` names the diagram that answers the question, which SHALL be homed at that place and be of that "
    "kind. `{\"home\": <place>, \"omitted\": <text>}` says why the place has no planned figure: no question there is answered better by a "
    "picture, or the planned figure could not be drawn. `question` and `omitted` are each plain text of 1 to 300 Unicode code points. A "
    "planned figure names one diagram, and its place may hold other diagrams that the plan does not name. The plan is the authoring "
    "session's working record, read by check alone: it is no claim block and carries no label, citation or quotation; no page renders "
    "it; `machine.json`, `dossier.json`, `derived-structure.json` and the size report carry none of it; and it enters no claim count, "
    "claim list, fidelity entry or reading ledger. Whether a planned question is the right one, and whether an omission's reason holds, "
    "are the authoring session's judgement and the rendered-design review's, never a check. Every rule this requirement and "
    "REQ-polaris-generation-035 state for a schema-v10 draft holds for a schema-v11 draft.",
    # P2: the findings.
    "For a v11 draft Syzygy SHALL report these repair findings, each of kind `figure-plan` unless another kind is named, with the "
    "literal detail given. At `$.figurePlan` where the member is absent, with the detail `` a v11 draft plans its figures: one "
    "`figurePlan` entry for the overview, each section and each deep dive ``; and where it is present and is not a list, with the detail "
    "`` `figurePlan` is a list of plan entries ``. At `$.figurePlan[<k>]`, `<k>` being the entry's index, for an entry that is not an "
    "object, that does not carry `home` and exactly the further members of one of the two forms, or whose `home` is not one of the three "
    "place forms, whose `question` or `omitted` is not a string of 1 to 300 Unicode code points, or whose `kind` is not one of the eight "
    "figure kinds, with the detail `` a plan entry is {\"home\", \"question\", \"kind\", \"figure\"} or {\"home\", \"omitted\"} ``; an "
    "entry with this finding is not well formed, and no other finding of this paragraph reads it. A finding of kind "
    "`unresolved-reference` at `$.figurePlan[<k>].home.target` for a well-formed entry whose `target` names no section, or no deep dive, "
    "of the draft, as its `kind` says, with the detail `` no section or deep dive has the identity named by "
    "`figurePlan[<k>].home.target` ``, `<k>` written as the entry's index. At `$.figurePlan[<k>].home` for a well-formed entry naming the "
    "same place as an earlier well-formed entry, with the detail `` <place>: a second plan entry for this place ``. For a well-formed "
    "planned figure: a finding of kind `unresolved-reference` at `$.figurePlan[<k>].figure` where `figure` names no diagram of the "
    "draft, with the detail `` no diagram has the identity named by `figurePlan[<k>].figure` ``, `<k>` written as the entry's index; and, "
    "where it names a diagram, one at `$.figurePlan[<k>].figure` where that diagram's `home` is not the entry's place, with the detail `` "
    "<identity>: a planned figure is homed at its plan entry's place ``, and another where that diagram's `kind` is not the entry's "
    "`kind`, with the detail `` <identity>: a planned figure is of the kind its plan entry names ``, `<identity>` being the diagram's "
    "identity; a diagram that fails both raises both, the home finding first. Then, at `$.figurePlan`, one finding for each place that "
    "no well-formed entry names, the overview first, then the sections and then the deep dives, each in draft order, with the detail `` "
    "<place>: no plan entry for this place ``. `<place>` is written `overview`, `section <identity>` or `deep dive <identity>`, with the "
    "section's or deep dive's identity. The findings of the entries come in entry order, each entry's in the order stated here, before "
    "the findings for places no entry names, and all of them follow every finding version 2.22 reports for the draft. The v11 schema "
    "document admits any value at `figurePlan`, so that the generic schema check reports nothing at or below that path and every "
    "failure of the plan's form is a finding of this paragraph. A draft with such a finding does not proceed to review until a "
    "resubmitted revision passes. A planned figure whose diagram has a disposition other than `produced` raises no finding for that: the "
    "disposition is the draft's reasoned account of a figure not drawn.",
    # P3: the advice.
    "For a v11 draft whose check reports no finding of kind `schema`, `syzygy dossier check` SHALL compute figure advice and SHALL carry "
    "it on its report as the member `figureAdvice`; check SHALL write it into no check record and no other file. The member is "
    "`{\"rules\": [{\"id\": \"figure-information-floor\", \"version\": 1}, {\"id\": \"figure-duplicate\", \"version\": 1}, {\"id\": "
    "\"figure-mixed-levels\", \"version\": 1}], \"examined\": <count>, \"advisories\": [...]}`, where `examined` counts the draft's "
    "diagrams whose disposition is `produced`, which are the figures the rules read; no rule reads a diagram of another disposition, or "
    "compares one with another figure. Each advisory is `{\"rule\", \"diagram\", \"at\", \"detail\"}`, naming the figure it advises on by "
    "its identity and, as `at`, by `$.diagrams[<i>]`, its index in the draft; advisories are ordered by that index and, for one figure, "
    "by the rule order above, and a rule gives at most one advisory for a figure. Rule `figure-information-floor` version 1 advises on a "
    "figure that carries too little to be worth a picture, a chain of three or fewer being a sentence: a figure of one of the six graph "
    "kinds with at most three nodes and at most one edge fewer than it has nodes; a `swimlane` with at most three steps; and a "
    "`sequence` with at most two messages; so a chain or fan of three boxes is advised on, and a fourth node, a third edge among three "
    "nodes, a fourth step or a third message is not. Its detail is `` <identity>: a chain of three or fewer is a sentence; say it in the "
    "prose, or draw what a sentence cannot hold ``. Rule `figure-duplicate` version 1 advises on a figure that draws nothing another "
    "figure of its family does not, comparing keys made from labels. A label's key is the label with its leading and trailing white "
    "space removed, each run of white space inside it replaced by one space, and each letter A to Z replaced by its lowercase letter, "
    "white space being the characters U+0009 to U+000D and U+0020 and no other character being changed. A graph figure's keys are "
    "`[\"box\", <key of the label>]` for each node and `[\"arrow\", <key of its from-node's label>, <key of its to-node's label>]` for "
    "each edge; a sequence's, `[\"box\", <key>]` for each participant and `[\"arrow\", <key of its sender's label>, <key of its "
    "receiver's label>]` for each message; a swimlane's, `[\"box\", <key>]` for each lane and `[\"step\", <key of its lane's label>, "
    "<key of its label>]` for each step. An edge's or message's own label is part of no key, and an edge, message or step whose "
    "reference names no node, participant or lane of its figure gives no key. Two figures are of one family where both are of graph "
    "kinds, both are sequences or both are swimlanes. A figure A draws nothing another figure B of its family does not where A has at "
    "least one `arrow` or `step` key, every key of A is a key of B, and either B has a key that A has not, or the two have the same keys "
    "and B comes before A in the draft. The rule advises on A, naming the first such B in draft order, with the detail `` <identity>: "
    "every box and arrow it draws is drawn by <other identity>; keep one figure, or draw what the other does not ``; so of two figures "
    "with the same keys only the later is advised on, and a figure with one box or arrow of its own is not. Rule `figure-mixed-levels` "
    "version 1 advises on a graph figure that draws a unit beside a unit within it without saying that one holds the other. It reads "
    "only the `unit` members that version 2.19 lets a node carry, so a node without one, and every sequence and swimlane, is in no "
    "comparison. A node X's unit encloses a node Y's where X's is `{\"kind\": \"repository-root\"}` and Y's is of any kind but "
    "`repository-root` and `dependency-name`; or where X's is `{\"kind\": \"top-level-directory\", \"path\": <P>}` and Y's is a "
    "`package-manifest`, `workflow-job` or `compose-service` unit whose `path` begins with P followed by `/`. The rule advises on a "
    "graph figure holding two nodes X and Y, X's unit enclosing Y's, that no edge of the figure whose `relation` is `contains` joins "
    "from X to Y, naming the first such pair, ordered by X's index among the nodes and then by Y's, with the detail `` <identity>: <X's "
    "identity> and <Y's identity> stand for a unit and a unit within it, and no contains arrow joins them; draw one level, or show the "
    "containment ``; so a figure of the repository root with its top-level directories joined by `contains` arrows, a figure of two "
    "top-level directories, and a figure of one top-level directory beside a package manifest under another is not advised on. The "
    "advice is Inferred, a computation over the draft's bytes alone that reads no blob, layout, record or fact, and two checks of the "
    "same draft bytes give the same member. Each advisory is one a change to the draft clears, so it is advice to the author in the "
    "sense of version 2.9, and, like the inventory-coverage advice of version 2.12, it carries no class member and is on the report "
    "beside the `author`-class advice. It gates nothing: it is no repair finding, sets no outcome, exit status or readiness, is read by "
    "no render, review or close, and is counted by no reading ledger, reading difference, `run-advice.json` or page. Whether a figure "
    "the rules pass carries enough, says something new or keeps to one level stays the rendered-design review's judgement, and a figure "
    "the rules advise on may stand where the author judges it right. A check of a draft of schema v10 or earlier, of a v11 draft with a "
    "`schema` finding, or of an inventory carries no `figureAdvice` member, and its absence says nothing about the figures.",
    # P4: the brief.
    "Brief v17 SHALL issue schema v11; it is brief v16 changed only in its version line, its draft-schema line, which names schema v11 "
    "and that schema's digest, and one paragraph placed immediately after the hero paragraph brief v16 carries, which reads: \"Plan the "
    "figures before you write the prose, in `figurePlan`: one entry for the overview, each section and each deep dive, its `home` "
    "written as a diagram's `home` is. For each place, write the one question a picture there answers better than text in `question`, "
    "the figure kind it needs in `kind`, and the diagram that answers it in `figure`, homed there and of that kind. Where no picture "
    "would answer better than text, or the planned figure cannot be drawn, write `{\"home\": <place>, \"omitted\": \"<why>\"}` instead. "
    "The plan is not published. A draft whose plan misses a place, names one twice or names a figure that is not the one drawn there is "
    "refused; check only advises where a figure is a chain of three or fewer, draws nothing another figure does not, or draws a part "
    "beside a part of it with no contains arrow.\" Every statement above of what brief v16 carries, equals or differs by holds of brief "
    "v17 apart from those three differences.",
    # P5: earlier schemas, the rendered bytes, the provider.
    "A draft in schema v10 or earlier SHALL be checked and rendered exactly as version 2.22 checks and renders it, the same findings and "
    "the same bytes of every page, of `machine.json` and of every record check writes, and its check's report carries no "
    "`figureAdvice`, except that a `field-version` finding at `$.figurePlan`, with the detail `` `figurePlan` needs draft schema "
    "polaris-dossier-local-draft-v11 ``, stands in place of the `schema` finding at that path for a draft that carries `figurePlan`; "
    "wherever this requirement says that a draft of an earlier schema is checked or rendered exactly as an earlier version checks or "
    "renders it, that exception holds too. The plan and the advice move no rendered byte: a v11 draft's pages, `machine.json`, "
    "`dossier.json` and size report are those the same draft gives as a v10 draft without `figurePlan`, apart from any byte that names "
    "the draft's schema or digest, and its reading ledger is that draft's. The provider mode is unaffected: the provider stages' closed "
    "draft schema gains no `figurePlan`, and the rendered bytes the provider golden pins do not change.",
]
replace(ANCHOR, ANCHOR + '\n\n' + '\n\n'.join(PARAGRAPHS))

# Scenarios, after version 2.22's last scenario and before the Form block that follows it.
LAST = '#### Scenario: Provider mode keeps its navigation'
once(LAST)
head, tail = text.split(LAST, 1)
form_at = tail.index('\nForm: event-response.\n')
SCENARIOS = r'''
#### Scenario: A figure plan names each place's question and figure

- **WHEN** a schema-v11 draft with one section `write-path` and one deep dive `replication` carries a `figurePlan` of three entries: `{"home": {"kind": "overview"}, "question": "What are the main parts and what surrounds them?", "kind": "boundary", "figure": "system"}`, where `system` is a `boundary` diagram homed on the overview; a planned figure for `{"kind": "section", "target": "write-path"}` of kind `sequence` naming a `sequence` diagram homed in that section; and `{"home": {"kind": "deep-dive", "target": "replication"}, "omitted": "Two steps read better as one sentence."}`
- **THEN** check reports no `figure-plan`, `unresolved-reference` or `schema` finding for the plan, and the draft proceeds to review
- **AND** no page, `machine.json`, `dossier.json` or size report carries the text of a `question` or an `omitted`, and every page's bytes equal those of the same draft as schema v10 without `figurePlan`, apart from any byte that names the draft's schema or digest

#### Scenario: Draft without a figure plan refused

- **WHEN** a schema-v11 draft carries no `figurePlan`, and again with a `figurePlan` that is an object
- **THEN** check reports one finding of kind `figure-plan` at `$.figurePlan`, with the detail ``a v11 draft plans its figures: one `figurePlan` entry for the overview, each section and each deep dive`` for the first and `` `figurePlan` is a list of plan entries `` for the second, and no `schema` finding at that path
- **AND** the draft does not proceed to review until a resubmitted revision passes

#### Scenario: Every place is planned once

- **WHEN** a schema-v11 draft with sections `a` and `b` and no deep dive carries well-formed plan entries for the overview, for section `a` and again for section `a`, and none for section `b`
- **THEN** check reports a `figure-plan` finding at `$.figurePlan[2].home` with the detail `section a: a second plan entry for this place`, then one at `$.figurePlan` with the detail `section b: no plan entry for this place`
- **AND** where the third entry's `home` is instead `{"kind": "section", "target": "c"}` and the draft has no section `c`, check reports a finding of kind `unresolved-reference` at `$.figurePlan[2].home.target` with the detail ``no section or deep dive has the identity named by `figurePlan[2].home.target` `` and still reports section `b` unplanned

#### Scenario: Malformed plan entry refused

- **WHEN** a schema-v11 plan entry carries both `figure` and `omitted`, or neither, or a further member, or a `kind` of `pie`, or an empty `question` or one of 301 Unicode code points, or a `home` of kind `pole`, or is a string
- **THEN** check reports for that entry one finding of kind `figure-plan` at `$.figurePlan[<k>]` with the detail `a plan entry is {"home", "question", "kind", "figure"} or {"home", "omitted"}`, no other plan finding for it, and no `schema` finding at or below `$.figurePlan`
- **AND** the place that entry was meant for is reported unplanned where no other entry names it

#### Scenario: A planned figure is the one drawn at its place

- **WHEN** the fourth of a schema-v11 draft's plan entries plans a figure `missing` that no diagram of the draft is, and, in turn, a `flow` diagram `f` homed in another section under the kind `flow`, a `sequence` diagram `s` homed at the entry's place under the kind `swimlane`, and a `sequence` diagram `s2` homed in another section under the kind `flow`
- **THEN** check reports a finding of kind `unresolved-reference` at `$.figurePlan[3].figure` with the detail ``no diagram has the identity named by `figurePlan[3].figure` `` for the first, and, at `$.figurePlan[3].figure`, the finding of kind `figure-plan` with the detail `f: a planned figure is homed at its plan entry's place` for the second, `s: a planned figure is of the kind its plan entry names` for the third, and both, the home finding first, for the fourth
- **AND** a planned figure whose diagram is homed at the entry's place and of its kind, with the disposition `omitted`, raises no finding

#### Scenario: Earlier schema keeps its bytes with a figure plan added

- **WHEN** a draft of schema v10 or earlier is checked and rendered, once as stored and once with a `figurePlan` member added
- **THEN** the stored draft's findings and the bytes of every page, of `machine.json` and of every record check writes are those version 2.22 gives it, and its check's report carries no `figureAdvice`
- **AND** the draft with `figurePlan` added gets a `field-version` finding at `$.figurePlan` with the detail `` `figurePlan` needs draft schema polaris-dossier-local-draft-v11 `` in place of the `schema` finding at that path, every other finding is unchanged, and a provider-mode render's bytes equal those the provider golden pins

#### Scenario: A chain of three or fewer is advised as a sentence

- **WHEN** a schema-v11 draft whose check reports no `schema` finding holds, all produced and in this order, a `flow` of three nodes chained by two edges, a `boundary` of three nodes with two edges from one of them, a `flow` of four nodes chained by three edges, a `dependency` of three nodes and three edges, a `swimlane` of three steps, a `swimlane` of four steps, a `sequence` of two messages and a `sequence` of three messages
- **THEN** the report's `figureAdvice` has `examined` 8 and holds a `figure-information-floor` advisory for the first, second, fifth and seventh figures alone, each at `$.diagrams[<i>]` with the detail `<identity>: a chain of three or fewer is a sentence; say it in the prose, or draw what a sentence cannot hold`
- **AND** a ninth diagram, a `flow` of three nodes and two edges whose disposition is `omitted`, gets no advisory and leaves `examined` at 8

#### Scenario: A figure that draws nothing new is advised as a duplicate

- **WHEN** a schema-v11 draft holds, all produced and in this order, a `flow` `a` of five nodes chained by four edges; a `dependency` `b` with the same node labels and edges as `a` except for letter case and white space in its labels and its own edge labels; a `flow` `c` drawing four of `a`'s nodes and three of its edges; a `flow` `d` drawing all of `a` and one more node; a `flow` `e` drawing `a` with one edge reversed; and a `sequence` whose participants and messages carry `a`'s node labels and edges
- **THEN** the report's `figureAdvice` holds, under rule `figure-duplicate`, an advisory for `a` with the detail `a: every box and arrow it draws is drawn by d; keep one figure, or draw what the other does not`, one for `b` naming `a` and one for `c` naming `a`
- **AND** it holds none under that rule for `d`, `e` or the sequence

#### Scenario: A figure that mixes levels is advised

- **WHEN** a schema-v11 draft holds produced graph figures: `f1`, whose node `root` has the unit `{"kind": "repository-root"}` and node `src` the unit `{"kind": "top-level-directory", "path": "src"}`, joined by one edge of `relation` `calls`; `f2`, the same with an edge of `relation` `contains` from `root` to `src`; `f3`, whose nodes have the units `{"kind": "top-level-directory", "path": "packages"}` and `{"kind": "package-manifest", "path": "packages/core/package.json"}` and no edge between them; `f4`, as `f3` with the directory `pack` in place of `packages`; and `f5`, two nodes without `unit`
- **THEN** the report's `figureAdvice` holds a `figure-mixed-levels` advisory for `f1` with the detail `f1: root and src stand for a unit and a unit within it, and no contains arrow joins them; draw one level, or show the containment`, and one for `f3`
- **AND** it holds none under that rule for `f2`, `f4` or `f5`

#### Scenario: Figure advice gates nothing

- **WHEN** a schema-v11 draft that otherwise passes check holds figures that each of the three rules advises on
- **THEN** check passes, the draft proceeds to review, and the advisories are on the report's `figureAdvice` alone: the check record, `run-advice.json`, the reading ledger, the reading difference and every page carry and count none of them
- **AND** the report of a check of a v11 draft with a `schema` finding, of a v10 draft and of an inventory carries no `figureAdvice` member

#### Scenario: Brief v17 asks for the figure plan

- **WHEN** a run is briefed under this version
- **THEN** the brief is `polaris-dossier-brief-v17`, issuing schema `polaris-dossier-local-draft-v11`, and equals brief v16 for the same run except its version line, its draft-schema line and the one figure-plan paragraph placed immediately after the hero paragraph
'''
text = head + LAST + tail[:form_at] + '\n' + SCENARIOS.strip('\n') + '\n' + tail[form_at:]


# The four Form lines of the last Form block, each extended at its end.
def extend(end, addition):
    replace(end, end[:-1] + addition)


extend("every stored run's latest passed draft drawn again, and a provider-mode render.",
       "; and, for version 2.NN, schema-v11 drafts with complete, incomplete, repeated and malformed figure plans, planned figures named, "
       "unresolved, misplaced and of the wrong kind, and omitted places; figures on each side of each advice rule's boundary (a third "
       "and a fourth node, a third edge among three nodes, a third and a fourth step, a second and a third message; equal, contained, "
       "extended and reversed keys and another family; a unit enclosing another with and without a `contains` arrow, and a directory "
       "that is only a prefix of a path); and drafts of schema v10 and earlier with and without `figurePlan`.")
extend("and each Unknown or withheld claim's element on the page `machine.json` names for it.",
       "; for version 2.NN, the plan findings with their paths, details and order, the report's `figureAdvice` member, the check record, "
       "`run-advice.json` and reading ledger beside it, the brief v17 figure-plan paragraph, and the rendered bytes of a v11 draft beside "
       "the same draft as v10.")
extend("and its marking, reason or withheld words looked for in the element's own text, not its attributes.",
       "; for version 2.NN, each fixture's expected plan findings and advisories written as literals before check runs, each label key "
       "computed by hand, and a v11 draft's pages compared byte for byte with the same draft rendered as v10.")
extend("a disclosure leaves its claim's element or page, or a provider-mode byte changes.",
       "; for version 2.NN, a v11 draft without a plan, with a place unplanned or planned twice, or with a planned figure that is "
       "missing, homed elsewhere or of another kind proceeds to review; a plan entry's text reaches a page or a published file; an "
       "advisory is a finding, changes an outcome or a record, or is counted by the reading ledger or `run-advice.json`; an advisory "
       "fires on a fixture outside its rule or is missing from one inside it; or a draft of schema v10 or earlier changes any finding "
       "but the `field-version` one at `$.figurePlan`, or any byte.")

out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(text, encoding='utf-8')
print('ok', len(src.split('\n')), len(text.split('\n')))
