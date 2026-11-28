#!/usr/bin/env python3
"""Build the version 2.54 MODIFIED REQ-polaris-generation-034 (code excerpts: line numbers, highlights and margin notes) from the
version 2.53 bytes by anchored edits (syzygy-3efd.33).

Every edit asserts its anchor occurs exactly once. Usage: code_excerpts_build_spec.py <worktree> <out>.

Draft schema v18 lets a code excerpt carry `highlights` (line ranges) and `notes` (`{"line", "block"}`, a walk step's citation
form); check refuses a range or a line outside the excerpt or out of order, and a note whose paragraph is not a cited paragraph of
its place; a verified excerpt of a v18 draft renders with numbered lines, its highlights and its notes, with no script and the
excerpt's own `<pre>` unchanged; brief v26 issues schema v18 and asks for an excerpt where a mechanism is explained (design.md D1
to D8).
"""
import pathlib
import sys

V = '2.54'
W = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])
# The predecessor: its path, the start of its title line, its version and the change name the preamble gives it. A rebind over
# another predecessor (design.md D1) changes these four, and nothing else in this script.
PREDECESSOR = 'openspec/changes/dossier-walk-errata/proposed/polaris-generation/spec.md'
PRED_TITLE = '# Dossier walk errata'
PRED_VERSION = '2.53'
PRED_NAME = 'walk errata'
src = (W / PREDECESSOR).read_text(encoding='utf-8')
text = src


def replace(old, new):
    global text
    n = text.count(old)
    assert n == 1, (n, old[:90])
    text = text.replace(old, new, 1)


lines = text.split('\n')
assert lines[0].startswith(PRED_TITLE), lines[0]
assert lines[2].startswith(f'Candidate version {PRED_VERSION}'), lines[2][:40]
lines[0] = '# Dossier code excerpts: numbered lines, highlights and margin notes'
lines[2] = (f"Candidate version {V}; binds nothing until its agent adoption row in AGENT-ADOPTIONS.md and its version tag. One MODIFIED "
            "requirement, REQ-polaris-generation-034, whose complete text below replaces the effective text that "
            f"{PRED_NAME} version {PRED_VERSION} gave it. Draft schema v18 lets a code excerpt carry `highlights`, ranges of its lines, "
            "and `notes`, each tying one of its lines to a cited paragraph of its place in the form in which a walk step ties an "
            "element to one; check refuses a range or a line outside the excerpt or out of order, and a note whose paragraph is not "
            "a cited paragraph of the place; a verified excerpt of a v18 draft renders with its lines numbered from the file's own "
            "line numbers, its highlights marked and named in words, and its notes marked and linked to their paragraphs, with no "
            "script and the excerpt's own lines byte for byte as before. Brief v26 issues schema v18 and asks for an excerpt where a "
            "section or deep dive explains a mechanism. Every other sentence and scenario of the predecessor is carried unchanged; "
            "the exact changes are in SEMANTIC-DELTA.md. Unmentioned effective requirements are unchanged.")
text = '\n'.join(lines)

ADDED = '''A draft in schema `polaris-dossier-local-draft-v18` (version 2.54) is a schema-v17 draft in every respect but one: a code excerpt MAY carry two members more, `highlights` and `notes`, either, both or neither. `highlights` is a list of 1 to 12 line ranges, each `{"startLine", "endLine"}`, two integers from 1: the lines the excerpt draws the reader's eye to, numbered as the excerpt's citation numbers them, by the file's own line numbers at the pinned revision. `notes` is a list of 1 to 12 margin notes, each `{"line", "block"}`: `line` an integer from 1, a line of the excerpt numbered in the same way, and `block` the identity of one of the paragraphs of the section or deep dive that holds the excerpt, as version 2.40 defines a walk step's paragraph: a claim block that the place's `paragraphs` list holds or, for a section with subsections, one that a subsection's `paragraphs` list holds, never a block inside a presentation element or a subsection's `answer`; and that block carries at least one citation. A note ties a line to the paragraph that explains it in the form in which a walk step ties an element to one: it carries no text, label, citation or quotation of its own, and what it says is its paragraph, a claim block checked, labelled, rendered and judged as every claim block is. A citation suffices whatever becomes of it at render, as it does for a walk step's paragraph, and several notes may name one block. Highlights and notes are presentation, within the review residual in which the order of an ordered list's steps lies: they state nothing about the subject beyond the claims they tie together, and that a highlighted line matters, or that a note's paragraph speaks of its line, is the authoring session's report and the fidelity and rendered-design reviews' judgement, never a check. They enter no claim count, claim list, fidelity entry, reading ledger, `machine.json`, `dossier.json` or `derived-structure.json`, and a code excerpt still carries no text of the agent's. A `highlights` or `notes` that is not a list of 1 to 12 entries, and an entry that is not an object carrying exactly the members of its form, each an integer from 1 but `block`, a handle, are each a `schema` finding at that path. Every rule this requirement and REQ-polaris-generation-035 state for a schema-v17 draft holds for a schema-v18 draft, the view levels, the walks and the walk advice among them; wherever such a rule names schema v17, alone or in a list of schemas, it SHALL read it as naming schema v18 too, and the v18 schema document admits every member the v17 document does, where and as it does.

For a v18 draft Syzygy SHALL report these repair findings for each code excerpt that carries `highlights` or `notes`, each with the literal detail given; `<e>` is the excerpt's own path, the path that its citation's findings name with `.citation` removed (for example `$.sections[0].paragraphs[2]`), `<k>` an entry's index in its list counting from 0, and `<s>` and `<t>` the `startLine` and `endLine` of the excerpt's citation, each written in decimal. They are computed only for an excerpt whose citation draws no `range-invalid` or `code-excerpt-too-long` finding, a well-formed, non-reversed range of 1 to 60 lines, and, for each of the two lists, only where neither that list nor any of its entries draws a `schema` finding. For each highlight in order: a finding of kind `code-highlight` at `<e>.highlights[<k>]` where its `startLine` is after its `endLine`, with the detail `` `highlights[<k>]` runs from `startLine` to `endLine`, never backwards ``; otherwise one where its `startLine` is before `<s>` or its `endLine` after `<t>`, with the detail `` `highlights[<k>]` lies outside the excerpt's lines <s> to <t> ``; otherwise, for a highlight after the first, one where its `startLine` is not after the `endLine` of the highlight before it, with the detail `` `highlights[<k>]` starts after the highlight before it ends ``. For each note in order: a finding of kind `code-note` at `<e>.notes[<k>].line` where `line` is before `<s>` or after `<t>`, with the detail `` `notes[<k>].line` lies outside the excerpt's lines <s> to <t> ``, or otherwise, for a note after the first, where `line` is not after the `line` of the note before it, with the detail `` `notes[<k>].line` comes after the line of the note before it ``; then a finding of kind `unresolved-reference` at `<e>.notes[<k>].block` where `block` names no paragraph of the excerpt's place as the paragraph above defines one, with the detail `` `notes[<k>].block` names no paragraph of this section or deep dive ``, or, where it names one that carries no citation, a finding of kind `code-note` there with the detail `` <block>: a note's paragraph cites its sources ``, `<block>` written as the identity named. The comparison with the entry before reads that entry's numbers whatever findings that entry draws. The excerpts are taken in the order in which a depth-first reading of the draft as submitted meets their paths, list entries in index order and an object's members in the order the draft writes them; each excerpt's highlight findings come before its note findings, and all of them follow every finding version 2.53 reports for the draft. These findings compare the draft's own numbers and identities with one another and read no blob: they are computed and reported alike whatever classification and screening decide for the blob an excerpt cites, and no detail names a byte, a path or a line count of a blob. A draft with such a finding does not proceed to review until a resubmitted revision passes.

From version 2.54 Syzygy SHALL render a code excerpt of a v18 draft that renders as an Observed quotation from its own read with its lines numbered, and with its highlights and notes where it carries them; an excerpt that renders Unknown with `excluded-content` renders as version 2.53 renders it, and its highlights and notes render nowhere. Such an excerpt's figure holds, in this order: its `<figcaption>`, unchanged; the frame, `<div class="code-frame">`, holding the gutter, `<pre class="code-gutter" aria-hidden="true">`, then the excerpt's `<pre>`, byte for byte as version 2.53 renders it, and, for an excerpt that carries `highlights`, the bands, `<pre class="code-bands" aria-hidden="true">`; for an excerpt that carries `highlights`, the sentence `<p class="code-highlights">Highlighted: <ranges>.</p>`; for an excerpt that carries `notes`, the list `<ol class="code-notes" aria-label="Notes on these lines">`; and its `<p class="code-anchor">` paragraph, unchanged. The gutter holds one line for each line of the excerpt from `<s>` to `<t>`, the lines joined by a line feed (U+000A) with none after the last: `<span class="code-number">` followed by the line's number in decimal and `</span>`, the class being `code-number code-highlighted` for a line that a highlight covers, and, for a line that the `<n>`-th note names, `<n>` that note's index plus 1, followed by ` <span class="code-note-mark"><n></span>`. The bands hold one line for each line of the excerpt, joined in the same way: `<span class="code-band"> </span>` for a line that a highlight covers and nothing for any other. `<ranges>` names each highlight in order, joined by `, `: `line <a>` for a highlight of one line and `lines <a>–<b>`, with U+2013 between the two numbers, for one of more, `<a>` and `<b>` being its `startLine` and `endLine`. The list of notes holds one item for each note, in order: `<li>Line <line> <a class="code-note" href="#block-<block>">Read note <n></a></li>`, `<line>` being the note's `line` and `#block-<block>` the fragment of the `id="block-<identity>"` that version 2.15 gives the note's paragraph, which the note does not change. The notes add no `id` to any element and no byte to a paragraph, so an excerpt inside a collapsible section adds no fragment target inside it; each note's link lands on its paragraph as that paragraph renders, Syzygy's words in place of withheld text where it renders Unknown, as every other link to that block does. Where the bytes of the excerpt's lines hold a carriage return (U+000D) that no line feed follows, or a U+0085, U+2028 or U+2029, which a browser may break a line at or join lines over where Syzygy's line count does not, the figure holds no frame, gutter or bands: the excerpt's `<pre>` stands where version 2.53 renders it, followed by the sentence and the list where the excerpt carries them.

The numbers and bands line up with the excerpt's lines by construction, never by measurement. The pages' stylesheet SHALL give the gutter, the excerpt's `<pre>` and the bands one font, size, line height and vertical padding, with no wrapping; SHALL lay the excerpt's `code` elements out inline inside the frame, so that a quotation part that ends inside a line does not break it; SHALL set the gutter beside the excerpt and the bands over the excerpt's own box and behind its text, the three scrolling together inside the frame, so that each number and each band sits on the line it names at every viewport and at every horizontal scroll, each band covering the excerpt's full width; and SHALL tell a highlighted line apart by its number's weight as well as by its band, never by colour alone, the sentence naming the highlighted lines in words. A note's mark stands on its line in the gutter. The gutter and the bands are hidden from assistive technology and are not the excerpt's `<pre>`, so selecting and copying the excerpt's lines copies no number and no mark, and the excerpt's text, its `verified-quote` elements and their attributes are those version 2.53 renders: the quotation fidelity rules are unchanged. No script is added, and the excerpt reads completely with styles and scripts off: the numbers stand in the gutter, the sentence names the highlighted lines, and each note is a list item naming its line and linking its paragraph. A page holding at least one `code-frame` element SHALL carry the style rules of this paragraph, and a page holding none SHALL NOT, as the walk style rules of version 2.40 are carried only by a page holding a walk.

Brief v26 SHALL issue schema v18; it is brief v25 changed only in its version line, its draft-schema line, which names schema v18 and that schema's digest, and one paragraph placed immediately after the level paragraph brief v25 carries, which reads: "Where a section or deep dive explains how a mechanism works, show the code that does the work in a code excerpt beside the paragraph that explains it: a `code` element whose `citation` names the 1 to 60 lines, which Syzygy reads and numbers itself. To point the reader at the lines that matter, give it `highlights`, 1 to 12 `{"startLine", "endLine"}` ranges inside the cited lines, in the file's own line numbers, in order and not overlapping. To tie a line to the paragraph that explains it, give it `notes`, 1 to 12 `{"line", "block"}` in order of `line`, one note to a line, each naming a cited paragraph of the same section or deep dive, never a block inside an element; Syzygy marks the line and links the paragraph. An excerpt carries no words of yours: say what the lines do in the paragraphs." Every statement above of what brief v25 carries, equals or differs by holds of brief v26 apart from those three differences. The success report and the brief record SHALL name brief v26.

In a draft of any schema from v3 to v17 Syzygy SHALL report a finding of kind `field-version` at `<e>.highlights` and one at `<e>.notes` for a code excerpt that carries that member, with the detail `` `highlights` and `notes` need draft schema polaris-dossier-local-draft-v18 ``; each stands in place of the `schema` finding version 2.53 reports at the same path, and every other finding version 2.53 reports for that draft is kept. A v2 draft admits no code excerpt, its `element-version` finding stands, and it takes no finding of this version.

A draft in schema v17 or earlier SHALL be checked and rendered exactly as version 2.53 checks and renders it, the same findings and the same bytes of every page, of `machine.json` and of every record check writes, except for the `field-version` findings above in place of the `schema` findings at their paths; wherever this requirement says that a draft of an earlier schema is checked or rendered exactly as an earlier version checks or renders it, that exception holds too. A v18 draft SHALL be checked exactly as the same draft in schema v17 apart from the findings above, and rendered exactly as it apart from its numbered excerpts and any byte that names the draft's schema or digest: the numbered lines are how a verified excerpt of a v18 draft renders, with or without highlights and notes. `highlights`, `notes` and the numbered lines move the findings above and the bytes of a page holding a numbered excerpt (the frame, the gutter, the bands, the sentence, the list and, on a page holding a `code-frame` element, the style rules above), that page's measures in the size report and the rendered-design packet that carries them, and nothing else: no `machine.json`, `dossier.json`, check record, `run-advice.json`, reading ledger, figure-fit entry, figure advice or walk advice, no byte of a paragraph and no byte of an excerpt's `<pre>`. The provider mode is unaffected: the provider stages' closed draft schema gains no `highlights` or `notes`, and the rendered bytes the provider golden pins do not change. No migration yields a v18 draft.'''

ANCHOR_START = 'The member is the only byte this version moves: the findings, every record check writes, `figureAdvice`'
assert text.count(ANCHOR_START) == 1
a = text.index(ANCHOR_START)
b = text.index('\n', a)
text = text[:b] + '\n\n' + ADDED + text[b:]

FORM = '\nForm: event-response.\n'
assert text.count(FORM) == 1
at = text.index(FORM)
SCENARIOS = '''
#### Scenario: A code excerpt's lines are numbered from Syzygy's read

- **WHEN** a v18 draft's section carries a code excerpt with no `highlights` or `notes` whose citation names lines 12 to 14 of a blob that Syzygy read and verified at the pinned revision and screening admitted
- **THEN** its figure holds its `<figcaption>`, then `<div class="code-frame"><pre class="code-gutter" aria-hidden="true">` holding `<span class="code-number">12</span>`, `<span class="code-number">13</span>` and `<span class="code-number">14</span>` joined by line feeds, then `</pre>` and the excerpt's `<pre>` as version 2.53 renders it, then `</div>` and its `code-anchor` paragraph
- **AND** the page is otherwise the page of the same draft in schema v17, apart from the bytes naming the schema or digest and the style rules version 2.54 adds

#### Scenario: Highlights and notes mark the lines and link their paragraphs

- **WHEN** a v18 draft's section `s1` holds the cited paragraphs `p-pool` and `p-free` and a code excerpt citing lines 10 to 20, verified and admitted, with `highlights` `[{"startLine": 12, "endLine": 13}, {"startLine": 18, "endLine": 18}]` and `notes` `[{"line": 12, "block": "p-pool"}, {"line": 18, "block": "p-free"}]`
- **THEN** the gutter's lines for 12, 13 and 18 read `<span class="code-number code-highlighted">12</span> <span class="code-note-mark">1</span>`, `<span class="code-number code-highlighted">13</span>` and `<span class="code-number code-highlighted">18</span> <span class="code-note-mark">2</span>`, each other line `<span class="code-number">` with its number, and the bands hold `<span class="code-band"> </span>` on their third, fourth and ninth lines of eleven and nothing on the others
- **AND** after the frame come `<p class="code-highlights">Highlighted: lines 12–13, line 18.</p>` and `<ol class="code-notes" aria-label="Notes on these lines"><li>Line 12 <a class="code-note" href="#block-p-pool">Read note 1</a></li><li>Line 18 <a class="code-note" href="#block-p-free">Read note 2</a></li></ol>`, then the anchor paragraph, and no byte of `p-pool` or `p-free` and no `id` is added

#### Scenario: The numbers and bands sit on their lines, and copying takes the code alone

- **WHEN** the page of that draft is opened in a browser with scripts off, at a viewport narrower than the excerpt's longest line, before and after its frame is scrolled horizontally to its end, and in a second draft the same excerpt's lines are read through two quotation parts, the first ending inside line 15
- **THEN** each number of the gutter and each band has the same top and height as the line of the excerpt it names, each band spans the excerpt's whole width, and line 15 is one line, in both drafts
- **AND** selecting the excerpt's lines and copying them yields the cited text with no number or mark, the page holds no script, and following `Read note 2` makes `p-free`'s block the page's target

#### Scenario: A highlight outside the excerpt or out of order is refused

- **WHEN** a v18 draft's code excerpt at `$.sections[0].paragraphs[2]`, citing lines 10 to 20, carries `highlights` `[{"startLine": 8, "endLine": 11}, {"startLine": 15, "endLine": 14}, {"startLine": 19, "endLine": 21}]`
- **THEN** check reports, in order, findings of kind `code-highlight` at `$.sections[0].paragraphs[2].highlights[0]` with the detail `` `highlights[0]` lies outside the excerpt's lines 10 to 20 ``, at `$.sections[0].paragraphs[2].highlights[1]` with the detail `` `highlights[1]` runs from `startLine` to `endLine`, never backwards ``, and at `$.sections[0].paragraphs[2].highlights[2]` with the detail `` `highlights[2]` lies outside the excerpt's lines 10 to 20 ``, and the draft does not proceed to review
- **AND** with `highlights` `[{"startLine": 12, "endLine": 14}, {"startLine": 14, "endLine": 16}]` instead, check reports one finding, of kind `code-highlight` at `$.sections[0].paragraphs[2].highlights[1]` with the detail `` `highlights[1]` starts after the highlight before it ends ``

#### Scenario: A note outside the excerpt, out of order or without a cited paragraph is refused

- **WHEN** the same excerpt instead carries `notes` `[{"line": 9, "block": "p-pool"}, {"line": 12, "block": "p-ghost"}, {"line": 12, "block": "p-bare"}, {"line": 16, "block": "c-tip"}]`, where `p-pool` is a cited paragraph of the section, `p-ghost` is no block of the draft, `p-bare` is a paragraph of the section that carries no citation, and `c-tip` is a cited block inside a callout of the section
- **THEN** check reports, in order: `code-note` at `$.sections[0].paragraphs[2].notes[0].line` with the detail `` `notes[0].line` lies outside the excerpt's lines 10 to 20 ``; `unresolved-reference` at `$.sections[0].paragraphs[2].notes[1].block` with the detail `` `notes[1].block` names no paragraph of this section or deep dive ``; `code-note` at `$.sections[0].paragraphs[2].notes[2].line` with the detail `` `notes[2].line` comes after the line of the note before it ``; `code-note` at `$.sections[0].paragraphs[2].notes[2].block` with the detail `p-bare: a note's paragraph cites its sources`; and `unresolved-reference` at `$.sections[0].paragraphs[2].notes[3].block` with the detail `` `notes[3].block` names no paragraph of this section or deep dive ``
- **AND** the same excerpt citing a blob whose path screening excludes before any body read draws the same findings, none of whose details names a byte, a path or a line count of the blob

#### Scenario: A withheld excerpt renders no numbers, highlights or notes

- **WHEN** a v18 draft's code excerpt with well-formed `highlights` and `notes` inside its lines cites a blob that classification or screening excludes
- **THEN** check reports no finding of this version for it, and the excerpt renders Unknown with `excluded-content` exactly as version 2.53 renders it, with no frame, gutter, bands, sentence or list of notes
- **AND** a page whose only excerpt is withheld carries none of the style rules version 2.54 adds

#### Scenario: A line a browser counts otherwise leaves the excerpt unnumbered

- **WHEN** a v18 draft's verified code excerpt with `highlights` and `notes` cites lines whose bytes hold a carriage return that no line feed follows
- **THEN** its figure holds no frame, gutter or bands, and its `<pre>` stands where version 2.53 renders it, followed by the sentence of its highlights and its list of notes
- **AND** an excerpt of the same draft whose lines end in line feeds, or in carriage returns each followed by a line feed, is numbered

#### Scenario: Notes in a collapsible section add no fragment target there

- **WHEN** a v18 draft's code excerpt carrying `notes` sits inside a collapsible section of its section, and each note names a paragraph of that section
- **THEN** its list of notes renders inside the collapsible section with each link to its paragraph's `#block-<identity>`, a target outside every collapsible section
- **AND** the excerpt adds no `id` inside the collapsible section

#### Scenario: Earlier schemas take highlights and notes as a field-version

- **WHEN** a schema-v17 draft's code excerpt at `$.sections[0].paragraphs[2]` carries `highlights` and `notes`
- **THEN** check reports a `field-version` finding at `$.sections[0].paragraphs[2].highlights` and one at `$.sections[0].paragraphs[2].notes`, each with the detail `` `highlights` and `notes` need draft schema polaris-dossier-local-draft-v18 ``, in place of the `schema` finding there, and every other finding version 2.53 reports for that draft
- **AND** a v17 draft that carries neither is checked and rendered exactly as version 2.53 checks and renders it, its excerpts unnumbered

#### Scenario: Brief v26 asks for code excerpts where a mechanism is explained

- **WHEN** a run is briefed under this version
- **THEN** the brief is `polaris-dossier-brief-v26`, issuing schema `polaris-dossier-local-draft-v18`, and equals brief v25 for the same run except its version line, its draft-schema line and the excerpt paragraph placed immediately after the level paragraph
- **AND** the success report and the brief record name brief v26'''
text = text[:at] + '\n' + SCENARIOS.strip('\n') + '\n' + text[at:]

FORM_ADDITIONS = {
    '- **Case:**': "; and, for version 2.54, code excerpts carrying highlights and notes inside, outside, reversed, overlapping and out of "
                   "order, notes naming cited and uncited paragraphs, blocks inside elements and absent blocks, excerpts verified, "
                   "withheld and path-excluded, read through one quotation part or several, holding a bare carriage return, and inside "
                   "a collapsible section, in schema v18 and earlier.",
    '- **Observable:**': "; for version 2.54, each `code-highlight`, `code-note`, `unresolved-reference` and `field-version` finding, "
                         "the frame, gutter, bands, sentence and list of notes, the position of each number and band against its line "
                         "in a browser at several widths and scrolls, and the text a copy of the excerpt's lines yields.",
    '- **Oracle:**': "; for version 2.54, each excerpt's expected findings written from its citation's range and the fixture's "
                     "paragraphs, and each gutter line, band, sentence and note written as a literal from the fixture, before check "
                     "and render run.",
    '- **Falsifier:**': "; for version 2.54, a highlight or note outside the excerpt or out of order, or a note naming an uncited "
                        "paragraph, passes; a number or band sits on another line; copying the excerpt copies a number; a note adds "
                        "an `id` or text of the agent's; a withheld excerpt shows a number; the excerpt's `<pre>` changes; or a v17 "
                        "draft renders other bytes than version 2.53 gives it.",
}
form_at = text.index(FORM)
lines = text.split('\n')
start = text[:form_at].count('\n') + 1
for lead, addition in FORM_ADDITIONS.items():
    hits = [i for i in range(start, len(lines)) if lines[i].startswith(lead)]
    assert hits, lead
    i = hits[0]
    assert lines[i].endswith('.'), lines[i][-40:]
    lines[i] = lines[i][:-1] + addition
text = '\n'.join(lines)

assert '2.NN' not in text
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(text, encoding='utf-8')
print('ok', len(src.split('\n')), len(text.split('\n')))
