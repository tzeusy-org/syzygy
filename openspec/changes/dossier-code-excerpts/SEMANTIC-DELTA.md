# Version 2.54 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text and count below was extracted from the bytes by script (a line diff of the requirement block and a word diff of each changed line), not transcribed: `docs/evidence/syzygy-3efd-33/code_excerpts_delta.py` writes this file.

## Change class

Normative: one MODIFIED requirement, REQ-polaris-generation-034, in one home (the specification). It adds draft schema v18 (a code excerpt's `highlights` and `notes`), brief v26, the findings `code-highlight` and `code-note` (and `unresolved-reference` and `field-version` at new paths), and numbered lines, highlights and notes on a verified excerpt of a v18 draft; no check record, `machine.json` member or migration. Classified before review so a reviewer can contradict it.

## Composition

[Observed] The predecessor is the MODIFIED text in `openspec/changes/dossier-walk-errata/proposed/polaris-generation/spec.md` (dossier walk errata version 2.53, row A-344, tag `polaris-dossier-walk-errata-v2.53`; sha256 `bdbb3ff63653cff507976110c410da493eddd50ae36d75434869d1c5f6015393`). [Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 (`openspec/changes/dossier-code-excerpts/proposed/polaris-generation/spec.md`, sha256 `24132cde379082c2667057c3a2e326f22fe0cf89426b256436dc84d8a92facd3`) replaces that text, composed after version 2.53. Its ID, Source line, Scope line, name and warrants block are unchanged, so `GOVERNING-DEPENDENCIES.json` is version 2.49's, byte for byte.

## Carried unchanged

[Observed] Of the predecessor requirement's 2311 lines, 2307 appear byte for byte and in order in the new text; 4 lines are amended in place and none is removed. Below, each edit is one item, so a line edited in several places gives several items (4 items over 4 lines). All 336 predecessor scenarios are carried with their blocks byte for byte. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once (`docs/evidence/syzygy-3efd-33/code_excerpts_build_spec.py`, which reproduces the spec byte for byte).

## Amended in place

[Observed] The title and preamble (file head, not requirement text) name version 2.54. In the requirement, each changed line, with the displaced words and the words that replace them:

- After "…punctuation and plurals, and with no": displaced "walk."; now "walk; and, for version 2.54, code excerpts carrying highlights and notes inside, outside, reversed, overlapping and out of order, lists of 0 and 13 entries, entries with a member missing or extra, a line of 0 or not an integer and a block not a handle, excerpts whose citation draws range-invalid or code-excerpt-too-long, two excerpts of one draft in depth-first order, notes naming cited and uncited paragraphs, a subsection's paragraph and a subsection's answer, blocks inside elements and absent blocks, excerpts verified, withheld and path-excluded, read through one quotation part or several, holding a bare carriage return, a U+000B, a U+000C, a U+0085, a U+2028 or a U+2029, whose first line is highlighted and whose first line is not, and inside a collapsible section, in schema v18, in schemas v3 to v17 and in schema v2.".
- After "…render's `docsAndCode` member, `reference/docs-and-code.html` and `machine.json`'s": displaced "`docsAndCode`."; now "`docsAndCode`; for version 2.54, each `code-highlight`, `code-note`, `unresolved-reference` and `field-version` finding, the frame, gutter, bands, sentence and list of notes, the position of each number and band against its line in a browser at several widths and scrolls, and the text a copy of the excerpt's lines yields.".
- After "…text and tree, outside the recognizer": displaced "code."; now "code; for version 2.54, each excerpt's expected findings written from its citation's range and the fixture's paragraphs, and each gutter line, band, sentence and note written as a literal from the fixture, before check and render run.".
- After "…render without the member changes a": displaced "byte."; now "byte; for version 2.54, a highlight or note outside the excerpt or out of order, or a note naming an uncited paragraph, passes; a number or band sits on another line; a bands or gutter line opens with a line feed; a band is hidden behind a background; copying the excerpt copies a number; two excerpts' note links share a name; a note adds an `id` or text of the agent's; a withheld excerpt shows a number; the excerpt's `<pre>` changes; or a v17 draft renders other bytes than version 2.53 gives it.".

## Added

[Observed] 7 paragraphs, placed immediately after the paragraph ending "…the provider stages' closed draft schema gains no `walk`, and the rendered bytes the provider golden pins do not change.":

- "A draft in schema `polaris-dossier-local-draft-v18` (version 2.54) is a schema-v17 draft in every respect but one: …"
- "For a v18 draft Syzygy SHALL report these repair findings for each code excerpt that carries …"
- "From version 2.54 Syzygy SHALL render a code excerpt of a v18 draft that renders as …"
- "The numbers and bands line up with the excerpt's lines by construction, never by measurement. The …"
- "Brief v26 SHALL issue schema v18; it is brief v25 changed only in its version line, …"
- "In a draft of any schema from v3 to v17 Syzygy SHALL report a finding of …"
- "A draft in schema v17 or earlier SHALL be checked and rendered exactly as version 2.53 …"

[Observed] 12 scenarios, after the predecessor's last scenario that precedes the Form line, and before that line: "A code excerpt's lines are numbered from Syzygy's read", "Highlights and notes mark the lines and link their paragraphs", "The numbers and bands sit on their lines, and copying takes the code alone", "A highlight outside the excerpt or out of order is refused", "A note outside the excerpt, out of order or without a cited paragraph is refused", "Malformed lists are schema findings, and a bad citation or list skips this version's checks", "Findings follow the draft's order, and a note may name a subsection's paragraph", "A withheld excerpt renders no numbers, highlights or notes", "A line a browser counts otherwise leaves the excerpt unnumbered", "Notes in a collapsible section add no fragment target there", "Earlier schemas take highlights and notes as a field-version", "Brief v26 asks for code excerpts where a mechanism is explained".

## Removed

[Observed] Nothing.

## Effect on bytes

[Inferred] As `design.md` D6 states: drafts of schema v17 or earlier keep their bytes. A v18 draft is checked as in schema v17 apart from the new findings, and rendered as it apart from its verified excerpts, which gain the frame, gutter and, where carried, bands, sentence and list of notes, and the bytes naming the schema or digest; the page's size-report measures and rendered-design packet move with them. No `machine.json`, `dossier.json`, check record, ledger, paragraph or excerpt `<pre>` byte moves, and the provider golden is unchanged.
