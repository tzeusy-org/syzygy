# Version 2.56 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text and count below was extracted from the bytes by script (a line diff of the requirement block and a word diff of each changed line), not transcribed: `docs/evidence/syzygy-3efd-94/code_excerpts_errata_delta.py` writes this file.

## Change class

Normative: one MODIFIED requirement, REQ-polaris-generation-034, in one home (the specification). An erratum of the code excerpts of version 2.54, in four of its paragraphs and two of its scenarios, and one paragraph and one scenario added: the range condition of its checks read on its own, the order of an excerpt's `schema` findings at its lists and which positions hold an excerpt, a `range-beyond-blob` finding that skips nothing, the 10,000,000 line bound, and the browser scenario's band and number geometry; and the finding-detail rule syzygy-3efd.93 ships (row A-347, PR #1061). Three statements change what the text requires where code and text disagreed or the text was silent: an excerpt citing an absent path is skipped by its range alone, a band is measured against its line's line box, and a finding detail names a draft identity only where it is a handle and is screened before it is reported. One scenario is added and none removed. No draft schema, brief version or byte, finding, check record, `machine.json` member, page byte or migration moves. Classified before review so a reviewer can contradict it.

## Composition

[Observed] The predecessor is the MODIFIED text in `openspec/changes/dossier-view-levels-errata/proposed/polaris-generation/spec.md` (dossier view levels errata version 2.55, row A-346, tag `polaris-dossier-view-levels-errata-v2.55`; sha256 `530a79f837497883430ba9ca98f8965e005abb50b64cb6f4a35e9b302c5776fb`). [Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 (`openspec/changes/dossier-code-excerpts-errata/proposed/polaris-generation/spec.md`, sha256 `c7b570d04244a2d37a6f45264946cd8d8c830f678feae99eaeb0c42c995af9c5`) replaces that text, composed after version 2.55. Its ID, Source line, Scope line, name and warrants block are unchanged, so `GOVERNING-DEPENDENCIES.json` is version 2.55's, byte for byte.

## Carried unchanged

[Observed] Of the predecessor requirement's 2404 lines, 2400 appear byte for byte and in order in the new text; 4 lines are amended in place, 0 removed and 8 inserted. Below, each edit is one item, so a line edited in several places gives several items (17 items over 4 lines). All 349 predecessor scenarios are carried; the blocks of two are amended as listed below. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once (`docs/evidence/syzygy-3efd-94/code_excerpts_errata_build_spec.py`, which reproduces the spec byte for byte).

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

[Observed] 1 paragraphs and 1 scenarios are inserted: "A finding detail names a handle only, and a detail screening matches is withheld". Its lines, as inserted:

> From version 2.56 a finding's `detail`, of every kind and in every draft schema, SHALL name a draft-supplied identity or reference only where the value is a handle (a string of the draft schema's `handle` form, its pattern and its length bound). Where a detail would name a value of another form, it names in its place, by the family the detail belongs to: for a detail that opens with the identity it is about (`<id>: …`), the path of the member that holds the value, such as `$.diagrams[0].id`, a walk's `figure` or a step's `element` or `block`; for a detail that quotes an identity it refers to, the words `named here`, or `the identity named here` for an asset part a disposition names; and for `whySection`, the words `a value`. A detail that names a handle names it as before. Then, before writing the check record or preparing any form of the check report, after the qualified details of the preceding paragraph, Syzygy SHALL screen every finding's detail: whole and each of its words, a word being a run of the detail between whitespace and the characters `"`, `` ` ``, `'`, `(`, `)`, `,` and `;`, against the secret detectors, and each word against the bound policy's denied-path rules as a path. A detail that any of them matches, or for which screening cannot decide, is replaced by `Finding detail withheld under source screening.`; the finding keeps its kind, its `at`, its other members and its place in the order, and the draft passes or fails exactly as it would with the detail intact. A handle can itself match a detector as part of a detail (an identity `token` followed by a word of 8 or more characters, say); that detail is withheld, failing toward withholding. This rule screens details only: a finding's `at`, `blockId` and `citationId` and the advisory members of the report are not screened by it.
>
> #### Scenario: A finding detail names a handle only, and a detail screening matches is withheld
>
> - **WHEN** a draft's three deep dives name, as `sectionId`, the path-like value `src/app.ts`, a token-shaped handle (built as the fixtures build one: the four-character prefix of a GitHub personal access token followed by 36 letters, which a secret detector matches) and `s9`, none of them a section of the draft, and two paragraphs of its first section share the identity `id_rsa`, a basename the bound policy denies as a path
> - **THEN** check reports `unresolved-reference` at `$.deepDives[0].sectionId` with the detail `no section has the identity named here`, at `$.deepDives[1].sectionId` with the detail `Finding detail withheld under source screening.` and at `$.deepDives[2].sectionId` with the detail `no section has the identity "s9"`, and `duplicate-id` at `$.sections[0].paragraphs[1]` with the detail `Finding detail withheld under source screening.`, each beside whatever the schema check reports at those members
> - **AND** neither `src/app.ts` nor the token-shaped value appears in the check report or the check record, every finding keeps its kind and `at`, and the draft fails check as it would with every detail intact
>

Every other new sentence is appended to or set inside an existing line and appears above as an amendment.

## Removed

[Observed] 0 lines are removed.

## Effect on bytes

[Inferred] As `design.md` D8 states: none. Each corrected statement is the behaviour `code-marks.ts` and the code excerpt renderer already ship (syzygy-3efd.33, PR #1060) and their tests pin (`code-marks.test.ts`, `code-excerpt.browser.test.ts`). The finding-detail rule is the code of syzygy-3efd.93 (`finding-names.ts`, PR #1061, row A-347), which lands with or after this version, and its tests (`finding-names.test.ts`) pin the added scenario's literals. Against the code on main, that rule moves finding details, which A-347 records; beyond it, no finding, check record, `machine.json`, `dossier.json`, page, brief, record or provider-mode byte moves.
