# Version 2.11 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as a delta (`NORMATIVE-CHANGE-WORKFLOW.md`).

## Composition

[Observed] The effective REQ-polaris-generation-034 is the MODIFIED text in `openspec/changes/dossier-record-bounds/proposed/polaris-generation/spec.md` (record bounds version 2.10, row A-31, tag `polaris-dossier-record-bounds-v2.10`; that file's SHA-256 is `d4da7a60e65c92d01ac87ca25fa59b22b1adf886868023e33ace2c7e64f01afb`, the digest `scripts/check_spec_reconciliation.py` binds as its reviewed subject, `BOUNDS_SUBJECTS`).

[Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 replaces that text, composed after version 2.10 (and so after every earlier version that touches REQ-034). Its ID, Source line, Scope line, name and warrants block are unchanged, so its dependency union (`GOVERNING-DEPENDENCIES.json`) is version 2.10's, byte for byte. The requirement goes from 106 to 110 scenarios; no other requirement changes. Nothing is installed under `.syzygy/governance/`.

## Carried unchanged

[Observed] Every other line of the predecessor requirement appears byte for byte in the new text. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once; a line diff against the predecessor shows, besides the file's title and preamble, exactly the changed lines listed below and the insertions (one paragraph, one AND line, four scenarios).

## Added

[Observed] One paragraph, after the paragraph "These are the bytes version 2.10 changes. ...": "These are the bytes version 2.11 changes." It says the corrections of items (2) to (6) and (9) to (11) change no byte the code written for versions 2.9 and 2.10 and the readable layout writes; that item (7) changes a manifest map's closing list, and so `maps/units.html` or `maps/ci.html`, the size report's measures of them and the rendered-design packet, where a recognizer counts an Unknown file it does not list; that item (8) changes check's report only; which bytes the readable layout's stacking and the map layout's stacking change; and that, wherever the requirement states that a render's pages equal an earlier version's, those stacked drawings and the measures they change are excepted.

[Observed] One AND line, at the end of scenario "Unreadable check record in the run file": a record whose file name gives revision 2 and whose `revision` is 1, or whose `format` is not `polaris-dossier-check/1`, is counted in `checkRecords.unreadable` and contributes no advice.

[Observed] Four scenarios, after the last scenario of version 2.10 ("Derived record kept but unusable told apart from none kept"): "CI pipeline map lists parse as lists" (items 2, 3), "Unknown files counted and not listed on a manifest map" (item 7), "Reading difference of a bounded check record" (item 8), "Readable layout stacks every graph of two or more layers" (item 11).

## Amended

[Observed] The title and preamble (file head, not requirement text) name version 2.11.

[Observed] Figure fit (version 2.2), the 1048 px exception (item 11):

- Was: "(the readable layout's three-column width)"
- Now: "(three columns at the readable spacing; since version 2.11 the readable layout lays out no figure that wide, as stated below, so on a page this exception matches no figure, and in figure fit, for a graph within the draft schema's bounds, it applies only where check is supplied another layout)"

[Observed] Scenario "Scaled text below the minimum", its WHEN line:

- Was: "(three readable columns)"
- Now: "(three columns at the readable spacing, which only a layout other than the readable one, supplied to check, gives)"

[Observed] The reading difference (version 2.4), item (8):

- Was: "Where there is none, or this draft does not parse, `readingDifference` is ... with the words `no earlier run ...`, `the state root could not be listed` or `this draft does not parse, so it has no reading ledger`, and no ledger number:"
- Now: adds the case "where the record this check wrote is the bounded form of version 2.10" and its words `this check's record was written in its bounded form, which keeps no reading ledger`, and states that in that case and where the draft does not parse the state root is not listed and both counts are 0.

[Observed] The bounded form (version 2.10), item (8):

- Was: "and its `readingDifference` is computed as for a check whose record carries no ledger;"
- Now: "and its `readingDifference` is `unknown` with the words `this check's record was written in its bounded form, which keeps no reading ledger` (version 2.11: version 2.10 computed it as for a draft that does not parse, whose words are untrue of a draft that parsed);"

[Observed] The directory map (version 2.9), item (6): the singular list `(`1 file`, `1 submodule`, `1 more top-level directory`)` gains `under the 1 top-level directory listed here`.

[Observed] The manifest maps (version 2.9):

- Item (6). Was: "; a count of one takes the singular." Now: the same, followed by the five singular forms written out (`1 candidate file`, `1 value left out by the value checks`, `1 fact.`, `1 file of <rule> is counted and not listed.`, `1 fact of the manifest files is counted and not listed, so a figure or list may lack it.`) and that the line's other counts take no noun.
- Item (7). Was: "where it has none, the list holds the one item `Every candidate file not left out or set apart was read for facts.`, or, where its recognizers have no candidate file, `No candidate file.`" Now: after the listed Unknown entries, where the recognizers' `unknown` counts sum to more than the Unknown entries they list, one further item `<d> files whose facts are Unknown are counted and not listed.` (singular stated); where the list then has no item, `No candidate file.` or `Every candidate file not left out or set apart was read for facts.`; and a sentence saying what version 2.9 got wrong.
- The map figure's layout (computed maps, version 2.9; review finding F3). Was: "Its drawing is made by the renderer's pure graph layout with the readable spacing but at most two columns, so it is never laid out in three," Now: "... with the readable spacing's box and gap sizes, laid out left to right where its layers lay out at most 648 px wide (two columns) and otherwise stacked top to bottom one box to a row as the readable layout stacks a graph (version 2.11; version 2.9's code continued a longer chain on two-column bands), so it is never laid out in three columns,"
- Item (7), the count item: it carries no epistemic mark, being Syzygy's count (review finding F8).
- Item (6), the unit map's list. Was: "`<f>` being the entry's `facts`," Now: "`<f>` being the entry's `facts` (`<path>: 1 fact.` for one),"

[Observed] The CI pipeline map (version 2.9), items (2) and (3):

- Was: "then `<p class=\"map-workflow\">` holding the entry of its `workflow` fact and, for its `workflow-trigger` facts, each fact's entry, or `No trigger is declared.`;" Now: `<ul class="map-workflow">` holding those entries as its items, or `<li>No trigger is declared.</li>`, with the reason (an `<li>` start tag closes an open `<p>`).
- Was: "and then the list of the file's `job` and `job-needs` facts in the member's order," Now: "and then, only where the file has at least one listed `job` or `job-needs` fact, `<ul class=\"map-facts\">` holding the entries of those facts in the member's order (version 2.11),".
- Was: "a file with no `job` fact has no figure." Now: adds "and a file with neither a listed `job` nor a listed `job-needs` fact has no list."

[Observed] The bytes of version 2.9, item (5):

- Was: "the three map pages' entries in the `pages` list of `dossier.json`;" Now: "... in the `pages` lists of `dossier.json` and of `machine.json`;"
- Was: "these additions are excepted." Now: "these additions are excepted, `computedMaps` and the three entries of `machine.json`'s `pages` list among them (version 2.11 names the latter, which version 2.9's code writes)."
- Scenario "Schema-v4 draft unchanged", its THEN line: "`computedMaps` in `machine.json` and the size report's entries ..." now names "the three pages' entries in the `pages` lists of `dossier.json` and `machine.json`" between them, and ends with "; and, since version 2.11, the drawing of each graph of two or more layers, which the readable layout stacks, and the size report's measures of the pages holding one".

[Observed] Mechanism advice (version 2.9):

- Item (4). Was: "a record past it, or one that does not parse, is counted in `unreadable` and contributes nothing, and a record without `figureFit` contributes nothing." Now: adds "one that is not the check record of its revision (one JSON object whose `format` is `polaris-dossier-check/1` and whose `revision` is the `<n>` of its file name)" to the unreadable set, and says a record without `figureFit` is counted in `read`.
- Items (9) and (11). Was: "648 px is this version's width of a drawing that the readable layout lays out in two columns, ... the author could restate its content as a `sequence` or `swimlane`, or reshape the graph until the layout stacks it, but such advice is about the renderer's forms, ... So at this version's column widths every entry at 390 of a graph figure laid out in two or three columns is `mechanism`." Now: 648 px is the width of two columns at the readable spacing, the least a layout at the readable spacing that draws a graph in columns gives, and the rule's threshold whatever layout is supplied; the reshaping reason is dropped and the restating reason kept; the `mechanism` sentence is kept; and new sentences state that the readable layout stacks every graph of two or more layers (248 px for a chain or fan-out, under 648 px within the schema's bounds), so `graph-without-narrow-form` matches no entry of a graph within those bounds under it, fires only with another supplied layout or past those bounds, and is kept; and that version 2.9's reshaping reason no longer holds.

[Observed] Scenario "Graph figure too wide at 390 routed to the run file", its WHEN line (item 10):

- Was: "- **WHEN** a schema-v7 draft whose `flow` diagram chains three boxes, laid out 1048 px wide, and one of whose sections ..."
- Now: "- **WHEN** a schema-v7 draft one of whose graph figures the figure layout supplied to check lays out 1048 px wide, and one of whose sections ..."

[Observed] Form lines, each extended at its end, none of its existing text changed: **Case**, **Observable**, **Oracle** (a sentence each for version 2.11; the Observable one names the map pages' counted sentences at a count of one) and **Falsifier** (seven further falsifying clauses before its final period).

## What a reader of the previous text would now do differently

[Inferred]

- A renderer following the text writes the CI map's workflow block as a `<ul>` and leaves out the job list for a file with no listed job or need, as the code already does.
- A reader of `run-advice.json` expects a misnamed record among `unreadable`.
- A manifest map whose recognizers count an Unknown file they do not list says how many, and no longer says every candidate file was read for facts.
- A bounded check record's report says why it has no reading difference in words true of it.
- A reader of the figure-fit text no longer expects a readable graph laid out in columns, nor `graph-without-narrow-form` advice from a draft checked with the readable layout.
