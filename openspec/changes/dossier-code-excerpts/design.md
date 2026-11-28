# Design — code excerpts (version 2.54)

[Inferred] This is version 2.54 of REQ-polaris-generation-034, for syzygy-3efd.33. It is drafted on `agent/syzygy-3efd.33`, which is main at `55b963d20` with `agent/syzygy-3efd.90` (walk errata 2.53, open PR #1057) merged in, so that it can be built and wired over 2.53.

## D1. The version label, the predecessor and the numbers

- [Observed] The newest REQ-034 version on main is walk advice 2.51 (A-275). 2.52 is claimed by limits and defaults (open PR #1053, `agent/syzygy-5dhm.116`, A-343), over 2.51. 2.53 is claimed by walk errata (open PR #1057, `agent/syzygy-3efd.90`, A-344), also over 2.51.
- So this change takes 2.54, row A-345 and tag `polaris-dossier-code-excerpts-v2.54`, over 2.53.
  - [Observed] No origin branch (441 swept) carries `A-345`, `polaris-dossier-code-excerpts-v2` or a REQ-034 version above 2.53.
- [Observed] Draft schema `polaris-dossier-local-draft-v18` and brief `polaris-dossier-brief-v26` are unclaimed.
  - v17 and v25 belong to view levels 2.50, whose code is on `agent/syzygy-3efd.39-code`.
  - The only uses of v18 on any origin branch are four test files of that branch, which use it as an unknown version. The .33 code moves them to v19 (D8).
- [Observed] The build script (`docs/evidence/syzygy-3efd-33/code_excerpts_build_spec.py`) edits the predecessor's bytes at anchors it asserts occur exactly once. It inserts seven paragraphs after the paragraph of 2.51 that ends the walk advice, twelve scenarios before the Form line, and one clause at the end of each of the four Form lines.
- **This version rebinds if the order changes.** If 2.52, or anything else, lands between 2.53 and this version, or 2.53 itself is rebuilt, this version is rebuilt over the new predecessor, mechanically:
  - `code_excerpts_build_spec.py`: set its four predecessor constants (`PREDECESSOR`, `PRED_TITLE`, `PRED_VERSION`, `PRED_NAME`), and `V` if the label moves. Nothing else in the script names the predecessor. Its anchors are 2.51's walk advice paragraph, the Form line and the four Form lines' starts, none of which 2.52 or 2.53 changes.
  - `code_excerpts_delta.py`: set `PRED`, and the predecessor's version, row and tag in its Composition prose; re-run it.
  - `scripts/check_spec_reconciliation.py`: set `CODEEX_SUBJECTS`' digest to the rebuilt spec's sha256, and point `codeex_binding`'s `predecessor=` and `predecessor_label=` at the new predecessor's binding, moving each place the script reads `codeex` right after it (search the script for `walkerr`, the current predecessor). Then re-run the script's `--selftest` and update the `codeex_cases` anchors it names.
  - `scripts/count_polaris_effective_scenarios.py`: move `codeex_amendment` after the new predecessor's amendment in the composition and the count-scope chains, and set the census line's figure to the counter's output.
  - Prose naming "over 2.53": this README, `proposal.md`, this file, `tasks.md`, the row, the `openspec/README.md` index row and the `PROJECT-STATUS.md` census line.
  - Then rebind the row to the new install commit and re-run the three checks in a fresh clone.
- [Observed] REQ-034 goes from 336 scenarios to 348 (ten scenarios at install; review 1 added two).

## D2. A note is a walk step's form, not text of its own

- [Observed] The bead asks for "cited margin notes" and for notes and walk steps to "share one citation form". A walk step (2.40) is `{"element", "block"}`: it ties an element to a cited paragraph of its place and carries no text of its own.
- [Inferred] A note is `{"line", "block"}` in the same way. Three forms were weighed:
  - **A reference to a cited paragraph** (chosen). What a note says is a paragraph that is already a claim block: checked, labelled, rendered once and judged by the fidelity review. A note adds no claim, no fidelity entry and no ledger row, and the excerpt still "carries no text of the agent's", as the rich elements require.
  - **A claim block of its own**, as a step of a `steps` element is: rejected. It would put the agent's words inside the excerpt, which the rich-elements rule forbids. It would also add a second kind of claim to every count, list and fidelity entry, and render prose in a margin that is a column of a few characters.
  - **The paragraph's text repeated in the margin**: rejected. One claim would render twice, and the claim parity rules count a claim's renderings.
- [Inferred] The list of notes is the notes' text alternative, as a walk's list is the walk's: each item names its line and links its paragraph (`Read note <n>`, after the walk's `Read step <n>`).
- [Inferred] A hearer gets no gutter, so the file's line numbers alone do not place a line in what they hear. The sentence and each item therefore also give the line's place among the shown lines (`line 18 (shown line 9)`), which a hearer can count to (review 1, finding 6).
- [Inferred] Two excerpts on a page would each give `Read note 1`. Each link's name, and the list's `aria-label`, carry the excerpt's path and lines (`on src/pool.ts, lines 10–20`), in a visually hidden span on the link. The path is the one the excerpt's `<figcaption>` already shows, so nothing new is disclosed. Two excerpts of the same lines of one file still share names; that is the same quotation twice.
- [Inferred] The mark in the gutter is not a link. The gutter is `aria-hidden`, and a focusable element inside hidden content is an accessibility fault. So the list item is the one link.

## D3. The checks

- [Inferred] Bounds:
  - Highlights and notes are each 1 to 12, as a walk's steps are at most 12. An excerpt is at most 60 lines, so 12 of each is more than a reader can take in.
  - Highlights are ordered and disjoint: each starts after the one before ends. Two adjacent ranges (12–13, 14–15) are allowed. They render as one run of bands but are named as two in the sentence, which is the author's choice.
  - Notes are ordered by line, one to a line, so a line's mark is one number.
- [Inferred] The findings are new kinds, `code-highlight` and `code-note`, beside the existing `unresolved-reference` for a `block` that names no paragraph. This follows the walk's split between its own kind and `unresolved-reference`.
- [Inferred] The checks compare the draft's numbers with one another and with the citation's range, which is itself the draft's. They read no blob, so they are computed alike for a verified, a content-excluded and a path-excluded excerpt.
  - No detail names a byte, a path or a line count of a blob, so the no-disclosure rule for an excluded excerpt (the range is "agent-supplied and unverified") holds.
  - A path-excluded excerpt with an out-of-range highlight is refused, though it will render Unknown. A draft that will be read with another screening result should be right either way.
- [Inferred] They are skipped where the citation is malformed, reversed or over 60 lines, because there is no excerpt range to compare with. The citation's own finding already refuses the draft.
- [Inferred] The comparison with the entry before reads that entry's numbers even where it drew a finding. This is stated so the order of findings is reproducible.
- [Inferred] Order: excerpts in a depth-first reading of the draft as submitted, highlights before notes, all after every 2.53 finding. As with 2.50's levels, the new findings come last.

## D4. The render: a gutter beside an unchanged `<pre>`

- [Observed] The quotation fidelity tests (`dossier-quote-fidelity.test.ts`) and the rich-elements rule pin the excerpt's `<pre>`: its `verified-quote` code elements, their attributes and the escaped bytes. An excerpt may be read through several quotation parts whose boundaries need not fall at line ends (`render.ts`, `excerpt`).
- [Inferred] So nothing is put inside the `<pre>`. Three options were weighed:
  - **Wrap each line in a span inside the `<pre>`**: rejected. It changes the quotation's markup, and a line split across two parts would need two spans.
  - **Number by CSS counters over line spans**: rejected for the same reason.
  - **A separate gutter `<pre>` and bands `<pre>` laid beside and under the excerpt's `<pre>`, in one font and line height** (chosen). They line up by construction, since each holds one line per excerpt line and nothing wraps. No pixel position is computed, unlike the walk layer, and the `<pre>`'s bytes do not move.
- [Observed] Today `figure.code-excerpt pre code` is `display:block`, so a part that ends inside a line breaks that line visually. Inside the frame the code elements lay out inline (a style rule, not a byte of the `<pre>`). This makes the visual line count equal the line count the gutter numbers.
- [Observed] Syzygy counts lines at CRLF, CR and LF (`render.ts`, `byteOf`). [Observed by review 1 in Chromium headless shell 1223] A bare CR inside a `<pre>` renders as a space, joining two of Syzygy's lines, and the browser breaks at none of U+000B, U+000C, U+0085, U+2028 and U+2029. [Unknown] Other engines were not measured; UAX #14 classes all five as mandatory breaks, so an engine that follows it would break where Syzygy does not.
  - An excerpt holding a bare CR, or any of those five, could show a gutter off by one in some engine, so it gets no frame, gutter or bands. Including U+000B and U+000C is the conservative reading: it costs only the numbers of an excerpt that holds such a byte.
  - Its sentence and list of notes still render, because they name lines in words and need no alignment.
  - This is the honest degradation: no number on a wrong line.
- [Observed by review 1 in Chromium] The HTML parser drops one line feed straight after a `<pre>` start tag. So no line of the gutter or the bands is empty: a line no highlight covers holds `<span class="code-unbanded"></span>`, and the bands never open with a line feed. The gutter always opens with a number's span, and the excerpt's `<pre>` with a `code` element, so neither loses its first line.
- [Observed by review 1] The alignment holds only if every box that sets a line's height agrees. Today the excerpt's font and line height are on its `code` elements and the `<pre>` has a hairline border and a margin. So the clause names the `code` elements as rendered, and asks the three `<pre>`s for one padding and no vertical border or margin, the frame carrying them.
- [Inferred] The excerpt's `<pre>` paints a background today. A band put behind the text could fall behind that background and vanish while every geometry test passed. So the clause asks that each band paint above any background behind the lines and below their text, and the browser scenario checks the band is topmost between characters. Moving the background to the frame is one way to meet it.
- [Inferred] The gutter scrolls with the code, so scrolling a long line to its end takes the numbers out of view (review 1, finding 5). Weighed:
  - **Scroll together** (chosen): the three `<pre>`s are siblings in one scroller and line up by construction, with no positioning but the band layer's.
  - **A sticky gutter**: rejected. It must paint over the scrolled code with an opaque background, which then has to stay above the bands and below nothing else, and its left offset is one more thing to keep aligned at every width.
  - **Only the code column scrolls**: rejected for now. It needs a second wrapper inside the frame, and the bands must move with the code, not with the frame.
  - The cost is bounded: an excerpt is at most 60 lines, most lines fit the column, the sentence and the list name every marked line in words, and the line numbers return when the reader scrolls back.
- [Inferred] Line numbers render for v18 drafts only.
  - Every earlier version kept an earlier schema's bytes, and a v17 draft re-rendered under 2.54 keeps its pages. The bead also records that no stored draft uses a code element today.
  - Numbering every schema's excerpts would be a render change to drafts that asked for nothing.
  - A v18 draft's verified excerpt is numbered even with neither member. Numbers are how a v18 excerpt renders, not a request.
- [Inferred] The sentence `Highlighted: …` names the highlighted lines in words, so highlights are not carried by colour alone. The highlighted line's number is also set in a heavier weight.
- [Inferred] The style rules are carried only by a page holding a `code-frame` element, as the walk rules are carried only by a page holding a walk.

## D5. No script, collapsible sections and withheld paragraphs

- [Observed] Nothing here needs a script: numbers, bands and marks are static markup and style, and notes are ordinary links.
- [Observed] The notes add no `id`. Their links target the paragraph's `block-<identity>`, which 2.15 gives every claim block. A note's paragraph is never inside a presentation element, so never inside a collapsible section. An excerpt inside a collapsible section therefore adds no fragment target there, as the rich-elements rule requires.
- [Observed] A note's paragraph may render Unknown, or be a withheld item. The link lands on it as it renders, as a walk step's link does (2.40).

## D6. Bytes and composition

- [Inferred] Drafts of schema v17 or earlier keep every byte, except that a `field-version` finding replaces the `schema` finding at `highlights` or `notes`.
- [Inferred] A v18 draft is checked as the same draft in v17 apart from the new findings. It is rendered as that draft apart from its verified excerpts (frame, gutter, bands, sentence, list; under the fallback, the sentence and list alone) and the bytes naming the schema or digest. Review 1 found the spec's paragraph scoped this to numbered excerpts only; it now names verified excerpts. The page's size-report measures and the rendered-design packet move with those pages.
- [Inferred] Nothing else moves: no `machine.json`, `dossier.json`, check record, `run-advice.json`, reading ledger, figure fit, figure advice or walk advice, no paragraph byte and no excerpt `<pre>` byte.
- [Observed] The provider stages' closed draft schema gains nothing, and the provider golden's bytes do not change.
- [Inferred] 2.50's view levels, 2.51's walk advice and 2.53's walk errata are read by nothing here, and read nothing here. The v18 schema document admits every v17 member as v17 does.

## D7. The brief paragraph

- [Inferred] Brief v26 is brief v25 plus one paragraph after the level paragraph, with the version line and the draft-schema line changed.
- The paragraph says where an excerpt belongs ("where a section or deep dive explains how a mechanism works"), what `highlights` and `notes` are, and their limits. It closes with the rule that the excerpt carries no words of the author's, so the explanation stays in the paragraphs.
- It does not ask for an excerpt in every section; the bead asks for one "where a mechanism is explained".

## D8. Code (follow-up on syzygy-3efd.33)

- `draft-schema.ts`:
  - v18, `hasExcerptMarkForm` (v18 and later);
  - the v18 document admitting `highlights` and `notes` on the `code` element;
  - field-version paths for v3 to v17.
- `check-derive.ts` / a new `code-marks.ts`: the findings of the second paragraph, in the stated order, after every 2.53 finding.
- `render.ts`: pass each excerpt's highlights and notes to the local render input, and keep the members away from every other reader (as `withoutWalks` and `withoutLevels` do).
- `dossier-site.ts`: the frame, gutter, bands (every line an element), sentence and list with shown-line positions and per-excerpt names; the bare-CR, U+000B, U+000C, U+0085, U+2028 and U+2029 fallback; the page-conditional style rules, with the code elements', borders', margins' and bands' painting rules.
- `brief.ts`: v26 and the paragraph, pinned by `brief.test.ts`.
- Tests:
  - render literals with real line numbers;
  - every finding of the scenarios, with literal details;
  - a browser test of alignment at two widths and two scrolls, with a first line not highlighted, of a band being topmost between characters, of a two-part excerpt, of the copied text and of the note's link;
  - `dossier-quote-fidelity.test.ts` unchanged.
- The four `.39-code` tests that use v18 as an unknown version move to v19.
- The provider golden must stay unchanged.
- A rule-6 mutation run must include:
  - dropping each bound;
  - the outside and order comparisons;
  - the skip on a bad citation;
  - the depth-first order;
  - the fallback;
  - the inline-code rule;
  - the page-conditional style;
  - the `aria-hidden` attributes.

## Review 1

[Observed] One fresh-context review over `9505c9337`: `REVISE`, 1 blocking finding and 9 notes. The raw is `docs/reviews/syzygy-3efd-33/R-CODE-EXCERPTS-SPEC-1-RAW.md`; each finding's repair is in `R-CODE-EXCERPTS-SPEC-1-DISPOSITIONS.md` beside it. The repairs are folded into D1, D2, D4 and D6 above and into the spec, rebuilt by the same script. No confirmation round (D10).
