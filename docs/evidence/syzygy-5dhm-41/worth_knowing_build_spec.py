#!/usr/bin/env python3
"""Build the version 2.26 MODIFIED REQ-polaris-generation-034 from the version 2.24 bytes by anchored edits (syzygy-5dhm.41).

Every edit asserts its anchor occurs exactly once. Usage: worth_knowing_build_spec.py <worktree> <out>.
"""
import pathlib
import sys

W = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])
src = (W / 'openspec/changes/dossier-system-model/proposed/polaris-generation/spec.md').read_text(encoding='utf-8')
text = src


def once(anchor):
    n = text.count(anchor)
    assert n == 1, (n, anchor[:80])


def replace(old, new):
    global text
    once(old)
    text = text.replace(old, new, 1)


lines = text.split('\n')
assert lines[0].startswith('# Dossier system model'), lines[0]
assert lines[2].startswith('Candidate version 2.24;'), lines[2][:40]
lines[0] = '# Dossier worth-knowing mark: the facts a newcomer would not guess, in a callout near the top'
lines[2] = ("Candidate version 2.26; binds nothing until its agent adoption row in AGENT-ADOPTIONS.md and its version tag. One MODIFIED "
            "requirement, REQ-polaris-generation-034, whose complete text below replaces the effective text that system model version "
            "2.24 gave it. A draft in schema v13 may mark a cited Inferred block, one of a section's own paragraphs, as worth knowing: a fact "
            "about the project an engineer new to it would not guess from the kind of project it is. Check refuses a mark on any other "
            "block, on an uncited block or on a judgement, and advises a Pole that marks none without saying why, or more than three; the "
            "marked blocks of a page render once, in one callout before its sections; brief v19 asks for one to three per Pole, a ceiling "
            "and never a quota, and inventory brief v4 asks the inventory session for the same facts. A draft of an earlier schema keeps "
            "its findings and bytes, and the provider mode keeps its bytes. Every other sentence and scenario of the predecessor is carried "
            "unchanged; the exact changes are in SEMANTIC-DELTA.md. Unmentioned effective requirements are unchanged.")
text = '\n'.join(lines)

# The brief and schema version list.
replace(' and from version 2.24 as `polaris-dossier-brief-v18`, each with',
        ', from version 2.24 as `polaris-dossier-brief-v18` and from version 2.26 as `polaris-dossier-brief-v19`, each with')
replace('brief v17 issues schema v11 and brief v18 issues schema v12 (below)',
        'brief v17 issues schema v11, brief v18 issues schema v12 and brief v19 issues schema v13 (below)')
replace('v10, v11 or v12 is accepted', 'v10, v11, v12 or v13 is accepted')

BRIEF = ("Mark, in each Pole, one to three blocks worth knowing: set `worthKnowing` to true on a cited Inferred block, one of a section's "
         "own paragraphs, that states a fact about this project an engineer new to it would not guess from the kind of project it is, "
         "such as a default, a limit, an ordering or a choice unlike that of similar projects. A marked block cites at least one source "
         "and is never a judgement; check refuses one that is not a section's own paragraph, cites nothing or carries the judgement mark. "
         "Three is a ceiling, never a quota: where no fact in a Pole meets that test, mark none and say why in that Pole's "
         "`worthKnowingNone`, which Syzygy never renders. Syzygy renders the marked blocks of a page in one callout headed \"Worth "
         "knowing\" near its top, each linked to its section, and says on a Pole's page when none was found; check advises a Pole that "
         "marks none without a reason, or more than three. A draft with no `poles` counts as one Pole.")
GLOSS = ("a fact it states about itself that an engineer new to the project would not guess from the kind of project it is, such as a "
         "default, a limit, an ordering or a choice unlike that of similar projects; look for one to three in each major part of the "
         "project, and record none where you find none, never one made to fill a quota")
PLACE = ("only a block that is one of a section's own paragraphs carries the worth-knowing mark: not a child, an element's claim, a "
         "subsection, a deep dive, the introduction or a route step")
CITE = 'a worth-knowing block states a fact about the project and cites at least one source'
JUDGE = 'a worth-knowing block states a fact about the project, never your own judgement: drop one of the two marks'
NONE_ADVICE = ("<name> marks no block worth knowing: mark one to 3 cited facts a newcomer would not guess from the kind of project this "
               "is, or, where none meets that test, say why in its `worthKnowingNone`")
MANY_ADVICE = '<name> marks <n> blocks worth knowing, past 3: keep the ones a newcomer would least guess and drop the mark from the rest'
FOUND = ('<aside class="callout callout-important worth-knowing" id="worth-knowing" aria-label="Worth knowing"><p class="callout-title">'
         '<span class="callout-tone">Worth knowing</span> What a newcomer would not guess</p>')
NONE = ('<aside class="callout callout-note worth-knowing" id="worth-knowing" data-worth-knowing="none" aria-label="Worth knowing">'
        '<p class="callout-title"><span class="callout-tone">Worth knowing</span> None found</p><p>The authoring session reports that no '
        'fact in this part meets the test of what a newcomer would not guess (Inferred, self-reported).</p></aside>')

PARAGRAPHS = [
    "A draft in schema `polaris-dossier-local-draft-v13` (version 2.26) is a schema-v12 draft in every respect but two optional members, "
    "the worth-knowing mark. A claim block labelled Inferred MAY carry `worthKnowing`, a boolean; `true` marks the block as worth "
    "knowing, a fact about this project, stated in one of a section's own paragraphs and cited, that an engineer new to the project "
    "would not guess from the kind of project it is, and `false` marks nothing. Each item of `poles` MAY carry `worthKnowingNone`, a "
    "text of 1 to 8000 characters saying why no block of that Pole's sections carries the mark. The v13 schema document admits "
    "`worthKnowing` on the claim-block forms labelled Inferred and on no other form, so that the member on a block of another label, "
    "on a non-normative block or on a presentation element, a `worthKnowing` that is not a boolean and an empty `worthKnowingNone` "
    "are each a `schema` finding. For a v13 draft Syzygy SHALL report a repair finding of kind `worth-knowing` at the path of the "
    "block's `worthKnowing` member, naming the block's identity where it has one, for each block labelled Inferred that carries "
    "`worthKnowing: true` and: is not one of a section's own paragraphs, a block at `$.sections[<i>].paragraphs[<j>]`, with the detail "
    f"`` {PLACE} ``; cites no source, with the detail `` {CITE} ``; or carries the judgement mark, with the detail `` {JUDGE} ``. A "
    "block that fails more than one raises each, in that order.",

    "For a v13 draft, and for no draft of an earlier schema, check's report SHALL carry in its `readerAdvice` a member `worthKnowing`, a "
    "list of advisories `{\"at\", \"marked\", \"detail\"}`; like the rest of that advice it sets no outcome, is no finding, and is "
    "written into no check record and no rendered page. It counts, for each Pole in the draft's order, the blocks carrying "
    "`worthKnowing: true` among the own paragraphs of the Pole's sections, each section counted once, in the first Pole that names it; "
    "a draft with no `poles` is one group, at `$.sections`, holding every section. A group that counts none, where its Pole carries no "
    f"`worthKnowingNone`, gets one advisory with the detail `` {NONE_ADVICE} ``, and a group that counts more than three gets one with "
    f"the detail `` {MANY_ADVICE} ``, where `<name>` is `the Pole \"<label>\"`, the Pole's label written as a JSON string, or `the "
    "draft`, `<n>` is the count, `marked` is the count and `at` is `$.poles[<index>]` or `$.sections`. Three is a ceiling, never a "
    "quota: a group that counts one to three gets no advisory, and a Pole's reason excuses a count of none, never a count above three.",

    "On each page of a v13 draft that draws sections, the blocks carrying `worthKnowing: true` among the own paragraphs of the produced "
    "sections that page draws SHALL render once, in the draft's order, in one callout placed before the page's on-page contents list "
    "and its first section, and not again in their section. The landing page's callout holds the why section's marked blocks, or every "
    "section's in a draft with no `poles`; a Pole page's holds those of the sections that page draws. The callout is the element "
    f"`{FOUND}…</aside>`, holding after that title, for each marked block, a `<div class=\"worth-knowing-item\">` that holds the block "
    "rendered as it renders in its section, with its label, citations, anchors and every disclosure that qualifies it, and then "
    "`<p class=\"worth-knowing-from\">In <a href=\"…\">…</a></p>`, whose link names the block's section by its title and leads to it, "
    "as `#section-<id>` where the section is on the same page. Each marked block is a claim of the page its callout is on, and "
    "`machine.json` names that page for it. A page whose drawn sections mark no block renders no callout, except that the page of a "
    "Pole carrying `worthKnowingNone`, or for a Pole with no page of its own the landing page, renders in the callout's place the "
    f"Syzygy-written element `{NONE}`; the Pole's reason itself is rendered on no page and in no machine form. The callout carries no "
    "script and no style of its own beyond the callout classes every page already has. Where the draft layer is withheld, no callout "
    "renders and no marked block is moved. A v13 draft that marks no block and gives no reason renders, apart from its schema version, "
    "as its predecessor schema renders it.",

    "Brief v19 SHALL issue schema v13; it is brief v18 changed only in its version line, its draft-schema line, which names schema v13 "
    "and that schema's digest, and one paragraph placed immediately before its task-routes heading, `## Task routes`, which reads: "
    f"\"{BRIEF}\" Every statement above of what brief v18 carries, equals or differs by holds of brief v19 apart from those three "
    "differences. The inventory session SHALL receive the same request: the inventory brief, from version 2.26 "
    "`polaris-dossier-inventory-brief-v4`, issues inventory schema `polaris-dossier-local-inventory-v2`, which is inventory schema "
    "`polaris-dossier-local-inventory-v1` with one more entry kind, `worth-knowing`, placed before `other` and glossed in the brief as "
    f"\"{GLOSS}\". An inventory in schema v1 is still accepted. A `worth-knowing` entry is covered, omitted or uncovered by the "
    "inventory-coverage rule exactly as an entry of any other kind is, so that a fact the inventory records and the draft never cites "
    "surfaces as an uncovered entry; whether the draft marks it is compared by no rule.",

    "A draft in schema v12 or earlier SHALL be checked and rendered exactly as version 2.24 checks and renders it, the same findings and "
    "the same bytes of every page, of `machine.json` and of every record check writes, except that a `field-version` finding stands in "
    "place of the `schema` finding at each `worthKnowing` member anywhere in the draft, with the detail "
    "`` `worthKnowing` needs draft schema polaris-dossier-local-draft-v13 ``, and at each Pole's `worthKnowingNone`, with the detail "
    "`` `worthKnowingNone` needs draft schema polaris-dossier-local-draft-v13 ``; wherever this requirement says that a draft of an "
    "earlier schema is checked or rendered exactly as an earlier version checks or renders it, that exception holds too. Its report "
    "carries no `worthKnowing` advice and its pages no `worth-knowing` callout. The provider mode is unaffected: the provider stages' "
    "closed draft schema gains neither member, and the rendered bytes the provider golden pins do not change.",
]

ANCHOR = 'A draft in schema v11 or earlier SHALL be checked and rendered exactly as version 2.23'
once(ANCHOR)
start = text.index(ANCHOR)
end = text.index('\n\n', start)
text = text[:end] + ''.join('\n\n' + p for p in PARAGRAPHS) + text[end:]

SCENARIOS = f"""#### Scenario: A worth-knowing block leads its page

- **WHEN** a v13 draft whose second Pole holds a section with a cited Inferred paragraph carrying `worthKnowing: true` is rendered
- **THEN** that Pole's page holds, before its on-page contents list and its first section, the callout opening `{FOUND}` with that block once, with its label and citations, followed by a link to `#section-<id>` of its section
- **AND** the block is not rendered again in its section, `machine.json` names that page for it, and a sibling paragraph carrying `worthKnowing: false` renders in its section as before

#### Scenario: A Pole with none found

- **WHEN** a v13 draft one of whose Poles marks no block and carries `worthKnowingNone` is rendered
- **THEN** that Pole's page carries the none-found callout `{NONE}`
- **AND** the text of `worthKnowingNone` appears on no page and in no machine form

#### Scenario: A misplaced, uncited or judged mark refused

- **WHEN** a v13 draft is checked in which `worthKnowing: true` is carried by an Inferred child of a paragraph, by an Inferred section paragraph with no citation, and by an Inferred section paragraph carrying the judgement mark
- **THEN** check reports a `worth-knowing` finding at each block's `worthKnowing`, naming the block, with the details `` {PLACE} ``, `` {CITE} `` and `` {JUDGE} `` respectively
- **AND** the same member on an Unknown block or a presentation element is a `schema` finding

#### Scenario: Count advice without a quota

- **WHEN** a v13 draft is checked whose first Pole marks no block and gives no reason, whose second marks four, whose third marks none and gives a reason and whose fourth marks three
- **THEN** check's `readerAdvice.worthKnowing` holds exactly two advisories, at `$.poles[0]` with `marked` 0 and at `$.poles[1]` with `marked` 4, each with its literal detail
- **AND** neither is a finding, and the check passes or fails as it would without the marks

#### Scenario: A pre-v13 draft keeps its bytes

- **WHEN** a draft of schema v12 or earlier is checked and rendered, once as stored and once with `worthKnowing` added to a block and `worthKnowingNone` to a Pole
- **THEN** the stored draft's findings and the bytes of every page, of `machine.json` and of every record check writes are those version 2.24 gives it, with no `worth-knowing` callout and no `worthKnowing` advice
- **AND** the draft with the members added gets a `field-version` finding at each with the detail naming `polaris-dossier-local-draft-v13`, in place of the `schema` finding at that path

#### Scenario: Brief v19 and inventory brief v4 ask for the facts

- **WHEN** a run is briefed and its inventory session is briefed under this version
- **THEN** the brief is `polaris-dossier-brief-v19`, issuing schema `polaris-dossier-local-draft-v13`, and equals brief v18 for the same run except its version line, its draft-schema line and the one worth-knowing paragraph placed immediately before `## Task routes`
- **AND** the inventory brief is `polaris-dossier-inventory-brief-v4`, issuing inventory schema `polaris-dossier-local-inventory-v2`, whose entry kinds include `worth-knowing` with its gloss, and an inventory in schema v1 is still accepted

"""
FORM = '\nForm: event-response.\n'
once(FORM)
text = text.replace(FORM, '\n' + SCENARIOS + FORM.lstrip('\n'), 1)

out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(text, encoding='utf-8')
print('wrote', out, len(text.encode('utf-8')), 'bytes')
