# Design — code excerpts errata (version 2.56)

[Inferred] This is version 2.56 of REQ-polaris-generation-034, for syzygy-3efd.94.

- It is drafted on `agent/syzygy-3efd.94` over view levels errata 2.55 (`dossier-view-levels-errata`, row A-346, tag `polaris-dossier-view-levels-errata-v2.55`), which is unlanded on `agent/syzygy-3efd.91` at `02234e39b`. This branch merges that one.
- It corrects six statements of the code excerpts of version 2.54. 2.55 carries all six unchanged.
- It also states the finding-detail rule of syzygy-3efd.93 (row A-347, PR #1061), with one scenario (D9).

## D1. The version label, the predecessor and the numbers

- [Observed] REQ-034 versions on `origin/main` at `edb073890` run up to 2.54 (A-345). Above main, 2.55 is on `agent/syzygy-3efd.91` (A-346), and A-347 is on `agent/syzygy-3efd.93` (PR #1061), a code adoption with no version of its own. Its spec delta is this version's D9, so #1061 lands with or after this version, and both after 2.55.
  - The sweep covered all 429 origin branches for a spec preamble "Candidate version 2.56" to "2.59". It found none.
  - It also covered every branch for rows A-348 and A-349. It found none.
  - So this change takes 2.56, row A-348 and tag `polaris-dossier-code-excerpts-errata-v2.56`.
- [Observed] Built over 2.55 because the lead asked for the next version after it. If 2.55 is vetoed or rebound, this version is rebound in the same way as 2.55's own design D1 describes:
  - `code_excerpts_errata_build_spec.py`: its four predecessor constants;
  - `code_excerpts_errata_delta.py`: `PRED`, plus the Composition prose;
  - the checker's `CXERR_SUBJECTS` digest, `cxerr_binding` and `cxerr_delta`;
  - the counter's chain;
  - the prose that names "over 2.55";
  - then the row is rebound and the three checks are re-run in a fresh clone.
- [Observed] The predecessor hashes to `530a79f837497883430ba9ca98f8965e005abb50b64cb6f4a35e9b302c5776fb`. The build script edits it only at anchors it asserts occur exactly once.
- [Observed] REQ-034 goes from 349 scenarios to 350, and Polaris from 670 to 671. No draft schema or brief version is taken.

## D2. The range condition read on its own, and the absent path (bead points 1 and 6)

- [Observed] 2.54 says the checks "are computed only for an excerpt whose citation draws no `range-invalid` or `code-excerpt-too-long` finding, a well-formed, non-reversed range of 1 to 60 lines". The appositive reads as a gloss: as though drawing no range finding were the same as having such a range.
- [Observed] It is not the same. `check-derive.ts` draws `path-absent` and then `continue`s, so a citation of an absent path draws no range finding whatever its range. `code-marks.ts`'s `rangeOf` reads the range itself, so an absent path with lines 20 to 10, or 1 to 70, is skipped by the range alone.
- [Inferred] The text now states two conditions joined by "and", and says the second is read on its own. The malformed-lists scenario gains the absent-path case:
  - reversed or over-long: skipped;
  - lines 1 to 5: the outside-the-lines finding, with its detail.
- [Inferred] This is a correction, not a change: the code has done this since 2.54 landed.

## D3. The finding order, the `schema` findings, and the positions (bead point 2, R33 code finding 3)

- [Observed] `codeMarkFindings` pushes each list's `schema` findings, highlights first and then notes, before it reads the range. Then come the highlight findings, then the note findings.
  - So a `schema` finding at a list is reported even where the range skips the rest.
  - 2.54 gave the order only for the highlight and note findings, and its malformed-lists scenario already shows `schema` findings with no finding of this version.
- [Inferred] The text now places the `schema` findings first in each excerpt's group and reports them whatever the range. It names the three kinds that are skipped.
- [Observed] `excerptsOf` reads a `code` element only at an entry of a section's, a subsection's or a deep dive's `paragraphs`, or of a `details` element's `elements` there. That is the R33 code finding 3 repair. Anywhere else, 2.53's `schema` finding at the parent stands, and nothing of this version is read.
- [Inferred] The text now states which positions hold an excerpt.

## D4. `range-beyond-blob` (bead point 3)

- [Observed] `rangeOf` refuses only on `range-invalid` and `code-excerpt-too-long`. A citation whose range lies beyond its blob still has its highlights and notes checked against the cited numbers.
- [Inferred] 2.54's "computed and reported alike whatever classification and screening decide" implied this but did not name the finding. The text now names it: such a finding skips none of the checks.

## D5. The browser scenario: line boxes, and "topmost" (bead point 4, PR #1060 CI)

- [Observed] 2.54 said each band "is the topmost element at a point of it between two characters". The excerpt's text is painted above the band, so read literally the text's element is topmost there. The test asks `elementsFromPoint` for the topmost element that paints a background.
- [Observed] At an 11 px gutter font the line height is 16.5 px and the glyph box 13 px. The engine places the glyph 1 px from the top of its line box and 2.5 px from the bottom.
  - So "the same top and height as the line" is ambiguous between a glyph box and a line box.
  - The band is the line box. The number's glyph sits in its box at the same offset at which the code line's glyph sits in its own.
  - The test reads it that way: `code-excerpt.browser.test.ts` takes the first number's offset from the gutter top as each line's offset.
- [Inferred] The scenario now says:
  - a band has the top and height of its line's line box;
  - a number lies in its line's box at the offset its line's text lies in its own;
  - a band is the topmost element painting a background there, with the excerpt's text above it.
- [Observed] No CSS moved in that repair.

## D6. The line bound (bead point 5)

- [Observed] `draft-schema.ts` defines `line` as an integer from 1 to `10_000_000`. A citation's `startLine` and `endLine` use it, and so do a highlight's two lines and a note's `line`.
- [Inferred] The bead allowed stating the bound or dropping it from the code. Stating it keeps one bound for every line number in the draft. Dropping it would move a schema finding, and so a check record byte.

## D7. Not changed

- [Inferred] 2.54's withheld scenarios name the two range findings in the skip rule. With D2's second condition, the findings are redundant where they are drawn, but they are kept. They are what a reader of the check report sees, and dropping them moves no byte.

## D8. Composition, bytes and code

- [Inferred] 2.54 (code excerpts): six statements corrected; every other sentence stands.
- [Inferred] 2.55 (view levels errata): untouched.
- [Inferred] 2.35 (derived-base screening): its paragraph stands; D9's paragraph follows it, and its qualified details are screened as any detail is.
- [Observed] Bytes: this version moves none of its own. Each correction is what the code on main at `edb073890` already does, and its tests pin it. The detail rule of D9 moves finding details against main, and A-347 records that move with its code. So `tasks.md` lists no code item.

## D9. The finding-detail rule (syzygy-3efd.93; R93 code review finding 3, notes 4, 5 and 11)

- [Observed] Row A-347 (PR #1061, held until 2.55 lands) changed check's details across 40 builder lines in six modules (`check-derive.ts`, `system-model.ts`, `containment.ts`, `figure-plan.ts`, `walk.ts`, `derived-base.ts`), and added a central screen in `check.ts` before the outcome. Its review found no spec version states that (finding 3). The lead asked that 2.56 carry it rather than a later version.
- [Inferred] One paragraph after the derived-base screening paragraph of 2.35, the paragraph that already screens draft values in details. It states:
  - a detail names a draft identity only where it is a handle (the `handle` pattern and length bound);
  - otherwise one fallback per detail family, as built (note 11): the member's path for a detail that opens with its identity (`<id>: …`), `named here` for a quoted reference, `the identity named here` for an asset part, `a value` for `whySection`;
  - every detail screened whole and by word, the word break being whitespace and `"`, `` ` ``, `'`, `(`, `)`, `,`, `;`, against the detectors, and each word against the denied-path rules (note 4); a match or an undecidable case gives `Finding detail withheld under source screening.`, kind, `at` and order kept;
  - the false positive of note 5, a handle that matches as part of a detail, stated as failing toward withholding;
  - that `at`, `blockId`, `citationId` and the advisory members are outside it (syzygy-3efd.95).
- [Inferred] Why the denied-path rule is stricter than 2.35's paragraph, which admits a denied path in a derived-base detail: a denied path is one the policy keeps out of every output. The 2.35 qualified details are now screened by this rule too, so the two agree in effect.
- [Observed] The scenario's literals are those `finding-names.test.ts` pins on `agent/syzygy-3efd.93` (the deep-dive `sectionId` case and the `id_rsa` duplicate). It describes the token-shaped value by how the fixtures build it (a token prefix and 36 letters) and never spells it, so the spec carries no secret-shaped literal.
- [Inferred] Not stated: the per-call cache, an implementation choice that moves no output.

## Review

[Unknown] One independent fresh-context review (CC-REV-4) is arranged by the lead after this package is pushed. Its raw and dispositions will be recorded here.
