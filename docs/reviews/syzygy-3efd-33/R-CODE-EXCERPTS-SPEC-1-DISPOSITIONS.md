# Code excerpts spec review 1: dispositions

Review: `R-CODE-EXCERPTS-SPEC-1-RAW.md` in this directory, verdict `REVISE` (line 2), over `9505c9337`. One round; no confirmation review follows (D10).
The repairs are in the install commit `cb2e966c3`, rebuilt by `docs/evidence/syzygy-3efd-33/code_excerpts_build_spec.py` over walk errata 2.53; row A-345 now names that commit. REQ-034 goes from 336 scenarios to 348 (two added), and the census to 669.

## 1. Blocking: the bands lose their first line feed

Repaired.

- Every line of the bands now holds an element: `<span class="code-band"> </span>` where a highlight covers the line, `<span class="code-unbanded"></span>` otherwise. The paragraph states why: the parser drops a line feed straight after a `<pre>` start tag, and neither the gutter nor the bands now opens with one.
- The scenario "Highlights and notes mark the lines and link their paragraphs" (lines 10 to 20, first line not highlighted) now pins the bands' opening `<span class="code-unbanded"></span>` for line 10.
- The browser scenario names line 10's number and line 12's band, so it fails if the first line is lost.
- The Case line names an excerpt whose first line is highlighted and one whose first line is not; the Falsifier names "a bands or gutter line opens with a line feed".

## 2. Note: the font and line height sit on the `code` elements

Repaired. The stylesheet clause now gives one font, size and line height to the gutter, the bands, the excerpt's `<pre>` and the excerpt's `code` elements, as each renders inside the frame. `design.md` D4 records why.

## 3. Note: border and margin

Repaired. The clause asks the three `<pre>`s for one vertical padding, no vertical border and no vertical margin; the frame carries any border or margin around them.

## 4. Note: a band behind the excerpt's background

Repaired. The clause asks that each band paint visibly, above any background behind the lines and below their text. The browser scenario checks that a band is the topmost element between two characters, and the Falsifier names "a band is hidden behind a background". D4 notes that moving the background to the frame is one way to meet it.

## 5. Note: the gutter scrolls out of view

Kept, with the trade-off stated in D4. Scrolling together keeps alignment by construction. A sticky gutter (an opaque layer over the scrolled code, above the bands) and a code-only scroller (a second wrapper that the bands must follow) were weighed and rejected for now. The cost is bounded: at most 60 lines, the sentence and list name every marked line in words, and the numbers return on scrolling back.

## 6. Note: a hearer has no line numbers; note links repeat

Repaired.

- The sentence and each list item also give the line's place among the shown lines: `lines 12–13 (shown lines 3–4)`, `Line 12 (shown line 3)`.
- Each note link ends with a visually hidden ` on <path>, lines <s>–<t>`, and the list's `aria-label` is `Notes on <path>, lines <s>–<t>`. The path is the one the `<figcaption>` already shows. Two excerpts of the same lines of one file still share names, which the paragraph states.
- D2 records both.

## 7. Note: the fallback characters

Repaired.

- U+000B and U+000C join the fallback. D4 cites the engine the review measured (Chromium headless shell 1223 breaks at none of the five; a bare CR joins lines) and marks other engines [Unknown], so including all five is the conservative reading.
- The fallback scenario now covers U+000B, U+000C, U+0085, U+2028 and U+2029, each in its own draft, and the Case line names them.

## 8. Note (exception): SHALLs with no scenario

Repaired with two scenarios and Case entries.

- "Malformed lists are schema findings, and a bad citation or list skips this version's checks":
  - lists of 0 and 13 entries;
  - a missing and an extra member, with the closed schema's details;
  - a line of 0 or 1.5 and a block that is not a handle;
  - the highlight checks skipped where an entry draws a `schema` finding, while the notes are still checked;
  - the skip on `range-invalid` and `code-excerpt-too-long`.
- "Findings follow the draft's order, and a note may name a subsection's paragraph":
  - two excerpts in depth-first order, highlights before notes, after every 2.53 finding;
  - a subsection's paragraph admitted and a subsection's `answer` refused;
  - the v2 draft keeping its `element-version` finding.

## 9. Note: the byte-stability scope

Repaired. The paragraph now reads "apart from its verified excerpts, numbered or, under the fallback above, unnumbered with their sentence and list", and what moves is "the bytes of a page holding a verified excerpt of a v18 draft". D6 matches.

## 10. Note: D1 points at an untracked script

Repaired. D1 no longer names `wire_successor.py`. It gives the manual rebind steps for both scripts: the `CODEEX_SUBJECTS` digest, `codeex_binding`'s predecessor arguments and the places `codeex` is read, the `codeex_cases` anchors, and the counter's chains and census figure.
