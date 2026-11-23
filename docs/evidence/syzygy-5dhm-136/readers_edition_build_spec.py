#!/usr/bin/env python3
"""Build the version 2.22 MODIFIED REQ-polaris-generation-034 from the version 2.20 bytes by anchored edits (syzygy-5dhm.136).

Every edit asserts its anchor occurs exactly once. Usage: build_spec.py <worktree> <out>.
"""
import pathlib
import sys

W = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])
src = (W / 'openspec/changes/dossier-hero-figure/proposed/polaris-generation/spec.md').read_text(encoding='utf-8')
text = src


def once(anchor):
    n = text.count(anchor)
    assert n == 1, (n, anchor[:80])


def replace(old, new):
    global text
    once(old)
    text = text.replace(old, new, 1)


lines = text.split('\n')
assert lines[0].startswith('# Dossier hero figure'), lines[0]
assert lines[2].startswith('Candidate version 2.20;'), lines[2][:40]
lines[0] = "# Dossier reader's edition: the subject first, the run's own pages behind About this run"
lines[2] = ("Candidate version 2.22; binds nothing until its agent adoption row in AGENT-ADOPTIONS.md and its version tag. One MODIFIED "
            "requirement, REQ-polaris-generation-034, whose complete text below replaces the effective text that hero figure version 2.20 "
            "gave it. In the operator-agent mode, whatever the draft's schema, the pages about the run itself fold under one last "
            "navigation entry, \"About this run\", and end the contents page under that heading; the index is third in the reading order, "
            "directly after find-by-task; and the landing page holds its header, its overview figures, the Pole map and then its sections. "
            "Nothing is deleted, every link still resolves, and every disclosure that qualifies a claim stays inside that claim's element on "
            "that claim's page. The provider mode keeps its bytes. Every other sentence and scenario of the predecessor is carried "
            "unchanged; the exact changes are in SEMANTIC-DELTA.md. Unmentioned effective requirements are unchanged.")
text = '\n'.join(lines)

# F1(a): the index's place.
replace('the page `name-index.html`, titled "Index": directly after `glossary.html` in the reading order, and linked directly after the '
        'link to `glossary.html` in every page\'s navigation and on the contents page, with the word "Index".',
        'the page `name-index.html`, titled "Index": third in the reading order, directly after `find-by-task.html`, and linked directly '
        'after the link to `find-by-task.html` in every page\'s navigation and on the contents page, with the word "Index".')

# The reader's edition paragraph, after the last schema paragraph (version 2.20's earlier-schema paragraph).
ANCHOR = ('No figure of such a draft carries `data-hero`, and its `machine.json` carries no `hero` member. The provider mode is unaffected: '
          'the provider stages\' closed draft schema gains no `hero`, and the rendered bytes the provider golden pins do not change.')
PARAGRAPH = (
    "From version 2.22 (the reader's edition) every operator-agent rendering, whatever its draft's schema, puts the subject before the "
    "run. The run pages are the pages about the run itself: `understanding.html`, `discovery.html`, `clarifications.html`, "
    "`executions.html` and `review.html`, each where the run renders it, then `size-report.html` and `appendix.html`; every other page "
    "is on the reading path. Each page's navigation SHALL list, in this order, `index.html` with the word \"Overview\", "
    "`find-by-task.html`, `name-index.html`, each Pole page in Pole order, `contents.html`, each deep dive's page, `glossary.html` and "
    "`sources/index.html`, and SHALL end with one collapsible entry, `<details class=\"about-this-run\">`, whose summary reads \"About "
    "this run\" and which holds one list linking every run page the render holds, in the order above; it is open on a page it links and "
    "closed on every other page. No run page is linked from a page's navigation outside that entry. The contents page SHALL end with "
    "the heading `<h2 id=\"about-this-run\">About this run</h2>`, the sentence \"How this dossier was made, apart from what it says about "
    "the project.\" and a list linking every run page in the same order, and SHALL link no run page before that heading. The run pages "
    "are rendered as before and are reached from every page, so nothing is deleted, and the appendix stays the last page of the reading "
    "order. The main content of `index.html` SHALL hold, in this order: its header; the region of figures homed on the overview, where "
    "one renders; the Pole map, where the draft has Poles; the sections the landing page renders, preceded by the contents list version "
    "2.16 places before them where it renders one; the list of sections not generated, where there is one; and the `derived-structure` "
    "region. So where no figure is homed on the overview, the Pole map immediately follows the header. A disclosure that qualifies a "
    "claim, its Unknown marking and reason, a withheld item's words or a screening outcome, SHALL stay inside that claim's element on "
    "the page that makes the claim, and none moves to a run page. Wherever this requirement states that a render's pages, "
    "`dossier.json`, `machine.json` or size report equal those an earlier version writes, or makes a change to a byte of one a "
    "falsifier, the changes of version 2.22 are excepted: the order of each page's navigation, the fold's class and summary, the "
    "contents page's order and its closing heading and sentence, the index's place in the reading order and in the `pages` lists of "
    "`dossier.json` and `machine.json`, and the order of the landing page's main content. The provider mode is unaffected: its pages "
    "keep their navigation and contents, and the rendered bytes the provider golden pins do not change.")
replace(ANCHOR, ANCHOR + '\n\n' + PARAGRAPH)

# Scenarios, after version 2.20's last scenario and before the Form block that follows it.
LAST = '#### Scenario: Brief v16 asks for the hero'
once(LAST)
head, tail = text.split(LAST, 1)
form_at = tail.index('\nForm: event-response.\n')
SCENARIOS = '''
#### Scenario: The run's own pages fold under About this run

- **WHEN** an operator-agent dossier with two Poles holding pages, no deep dive and an understanding record is rendered
- **THEN** every page's navigation lists, in this order, the overview, `find-by-task.html`, `name-index.html`, the two Pole pages, the contents page, the glossary and the sources, and ends with one `<details class="about-this-run">` whose summary reads "About this run" and which links `understanding.html`, `size-report.html` and `appendix.html` in that order, open on those three pages and closed on every other
- **AND** the contents page links no run page before `<h2 id="about-this-run">About this run</h2>` and links each run page after it, and every internal link of every page names a page of the render and, where it names a fragment, an element with that `id` on that page

#### Scenario: The landing page leads with the subject

- **WHEN** an operator-agent dossier with Poles and a figure homed on the overview is rendered
- **THEN** the main content of `index.html` holds its header, then the region of overview figures, then the Pole map, then the landing page's sections, then the list of sections not generated where there is one, then the `derived-structure` region
- **AND** for the same draft with no figure homed on the overview, the Pole map immediately follows the header

#### Scenario: The index is read third

- **WHEN** an operator-agent dossier is rendered
- **THEN** the `pages` lists of `dossier.json` and `machine.json` begin `index.html`, `find-by-task.html`, `name-index.html`, every page's navigation and the contents page link the index directly after find-by-task, and the appendix is the last page of the reading order

#### Scenario: A disclosure stays on its claim's page

- **WHEN** an operator-agent dossier with an Unknown claim on the landing page and a withheld item on a Pole page is rendered
- **THEN** each claim occurs once, on the page `machine.json` names for it, and its own element there carries its label, and the `[Unknown]` marking and its reason in its text or, for the withheld item, Syzygy's withheld words
- **AND** moving either disclosure out of that element or onto a run page is reported

#### Scenario: Provider mode keeps its navigation

- **WHEN** a provider-mode dossier is rendered
- **THEN** its pages carry no `about-this-run` entry or heading, and their bytes equal those the provider golden pins
'''
text = head + LAST + tail[:form_at] + '\n' + SCENARIOS.strip('\n') + '\n' + tail[form_at:]

# The four Form lines of the last Form block, each extended at its end.
def extend(end, addition):
    replace(end, end[:-1] + addition)

extend("drafts of schema v9 and earlier with and without `hero`.",
       "; and, for version 2.22, operator-agent drafts with and without Poles, deep dives, a figure homed on the overview, run pages "
       "and Unknown or withheld claims on the landing page and on a Pole page, every stored run's latest passed draft drawn again, and "
       "a provider-mode render.")
extend("the reading ledger's `index.html` entry and the brief v16 hero paragraph.",
       "; for version 2.22, each page's navigation entries in order and its fold's class, summary, `open` state and links, the contents "
       "page's links before and after its run heading, the `pages` lists of `dossier.json` and `machine.json`, the order of the landing "
       "page's main content, every internal link of the site and whether it resolves, and each Unknown or withheld claim's element on "
       "the page `machine.json` names for it.")
extend("and, for every draft of schema v9 or earlier, the bytes version 2.19 renders for it.",
       "; for version 2.22, the navigation order, the run pages, the landing order, the reading order and the fixture's link count "
       "written as literals before the renderer runs, and each disclosure's page read from `machine.json` and its marking, reason or "
       "withheld words looked for in the element's own text, not its attributes.")
extend("other than the `field-version` finding in place of the `schema` finding at `$.hero`.",
       "; for version 2.22, a run page is linked from a navigation outside its fold or from the contents page before its run heading, a "
       "fold holds anything but the run pages the render holds, a run page is unreachable or not rendered, an internal link does not "
       "resolve, the landing page puts anything but the region of overview figures between its header and the Pole map or puts a "
       "section before the Pole map, the index stands anywhere but directly after find-by-task, a disclosure leaves its claim's element "
       "or page, or a provider-mode byte changes.")

out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(text, encoding='utf-8')
print('ok', len(src.split('\n')), len(text.split('\n')))
