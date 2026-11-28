# Version 2.56 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text and count below was extracted from the bytes by script (a line diff of the requirement block and a word diff of each changed line), not transcribed: `docs/evidence/syzygy-3efd-94/code_excerpts_errata_delta.py` writes this file.

## Change class

Normative: one MODIFIED requirement, REQ-polaris-generation-034, in one home (the specification). An erratum of the code excerpts of version 2.54, in four of its paragraphs and two of its scenarios: the range condition of its checks read on its own, the order of an excerpt's `schema` findings at its lists and which positions hold an excerpt, a `range-beyond-blob` finding that skips nothing, the 10,000,000 line bound, and the browser scenario's band and number geometry. Two statements change what the text requires where code and text disagreed or the text was silent: an excerpt citing an absent path is skipped by its range alone, and a band is measured against its line's line box. No scenario is added or removed. No draft schema, brief version or byte, finding, check record, `machine.json` member, page byte or migration moves. Classified before review so a reviewer can contradict it.

## Composition

[Observed] The predecessor is the MODIFIED text in `openspec/changes/dossier-view-levels-errata/proposed/polaris-generation/spec.md` (dossier view levels errata version 2.55, row A-346, tag `polaris-dossier-view-levels-errata-v2.55`; sha256 `530a79f837497883430ba9ca98f8965e005abb50b64cb6f4a35e9b302c5776fb`). [Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 (`openspec/changes/dossier-code-excerpts-errata/proposed/polaris-generation/spec.md`, sha256 `09470281ee040d4711be9cc6b00c53c997c21c93dfaedb44230a82ab011f985e`) replaces that text, composed after version 2.55. Its ID, Source line, Scope line, name and warrants block are unchanged, so `GOVERNING-DEPENDENCIES.json` is version 2.55's, byte for byte.

## Carried unchanged

[Observed] Of the predecessor requirement's 2404 lines, 2400 appear byte for byte and in order in the new text; 4 lines are amended in place, 0 removed and 0 inserted. Below, each edit is one item, so a line edited in several places gives several items (17 items over 4 lines). All 349 predecessor scenarios are carried; the blocks of two are amended as listed below. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once (`docs/evidence/syzygy-3efd-94/code_excerpts_errata_build_spec.py`, which reproduces the spec byte for byte).

## Amended in place

[Observed] The title and preamble (file head, not requirement text) name version 2.56. In the requirement, each changed line, with the displaced words and the words that replace them:

- After "…each `{"startLine", "endLine"}`, two integers from": displaced "1:"; now "1 to 10,000,000, the bound the published draft schema sets on every line number a citation's among them:".
- After "…`{"line", "block"}`: `line` an integer from": displaced "1,"; now "1 to 10,000,000,".
- After "…form, each an integer from 1": inserted "to 10,000,000".
- After "…citation draws no `range-invalid` or `code-excerpt-too-long`": displaced "finding, a well-formed, non-reversed"; now "finding and whose cited".
- After "…`code-excerpt-too-long` finding, a well-formed, non-reversed range": displaced "of"; now "is well formed (its `startLine` and `endLine` two integers from 1), not reversed and".
- After "…non-reversed range of 1 to 60": displaced "lines,"; now "lines long; the second condition is read on its own, so an excerpt citing a path that names no blob at the pinned revision, whose citation draws `path-absent` and neither range finding, is still skipped where its range is not such a range;".
- After "…the draft writes them; each excerpt's": inserted "`schema` findings at its `highlights` and at its `notes` come first, in that order, then its".
- After "…draft writes them; each excerpt's highlight": displaced "findings come before"; now "findings, then".
- After "…finding version 2.53 reports for the": displaced "draft."; now "draft; the `schema` findings at its lists are reported whatever its range, and only the findings of kinds `code-highlight`, `code-note` and `unresolved-reference` at its lists are skipped. An excerpt here is a `code` element at a position the draft admits one, an entry of a section's, a subsection's or a deep dive's `paragraphs` or of a `details` element's `elements` there; a `code` object anywhere else draws version 2.53's `schema` finding at its parent, and this version neither reads nor checks its members.".
- After "…line count of a blob. A": inserted "`range-beyond-blob` finding at an excerpt's citation therefore skips none of them: the excerpt's lines are those its citation numbers, whatever the blob holds. A".
- After "…- **THEN**": displaced "each number of the gutter and"; now "".
- After "…top and height as the line": inserted "box of the line".
- After "…line of the excerpt it names,": inserted "and each number of the gutter lies in its line's box at the offset at which that line's text lies in its own (the offset the engine's rounding of the font gives, the same on every line),".
- After "…number and line 12's band among": displaced "them,"; now "them;".
- After "…band spans the excerpt's whole width": displaced "and is the topmost element"; now "and,".
- After "…point of it between two characters,": inserted "is the topmost element painting a background there, with the excerpt's text above it;".
- After "…finding draw no finding of this": displaced "version"; now "version, nor on an excerpt citing a path that names no blob, whose citation draws `path-absent` alone, with lines 20 to 10 or 1 to 70; with lines 1 to 5 on that path they draw `code-highlight` at `$.sections[0].paragraphs[2].highlights[0]` with the detail `` `highlights[0]` lies outside the excerpt's lines 1 to 5 ``".

## Added

[Observed] 0 paragraphs, 0 scenarios and 0 lines are inserted. Every new sentence is appended to or set inside an existing line and appears above as an amendment.

## Removed

[Observed] 0 lines are removed.

## Effect on bytes

[Inferred] As `design.md` D8 states: none. Each corrected statement is the behaviour `code-marks.ts` and the code excerpt renderer already ship (syzygy-3efd.33, PR #1060) and their tests pin (`code-marks.test.ts`, `code-excerpt.browser.test.ts`). So no finding, check record, `machine.json`, `dossier.json`, page, brief, record or provider-mode byte moves.
