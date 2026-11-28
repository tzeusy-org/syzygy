# Review: syzygy-3efd.33 code excerpts spec (REQ-034 2.54)
Verdict: REVISE
Reviewed commit: 9505c93375e4aad25bd55304b65a2ac84d33a8f5
Reviewer: fresh-context general-purpose agent, 2026-11-28

Paths below are relative to the repository root. `spec.md` means
`openspec/changes/dossier-code-excerpts/proposed/polaris-generation/spec.md`, and `design.md` means the package's `design.md`.

## Findings

1. **Blocking.** `spec.md`:328 (the bands sentence) and `spec.md`:2127 (scenario "Highlights and notes mark the lines and link their paragraphs").
   - Problem. [Observed] The spec writes the bands as lines "joined by a line feed (U+000A) with none after the last", with "`<span class="code-band"> </span>` for a line that a highlight covers and nothing for any other". So when the excerpt's first line is not highlighted, the bands `<pre>` begins with a line feed.
   - The HTML parser drops a single line feed that comes immediately after a `<pre>` start tag. [Observed] In local Chromium (Playwright chromium_headless_shell-1223), `<pre>\n\n<span>X</span>\n</pre>` parses to the textContent `"\nX\n"`: one line feed is gone.
   - Every band then sits one line above the line it names. The spec's own scenario hits this: lines 10 to 20 with bands on the third, fourth and ninth lines put the bands on the lines for 11, 12 and 17 in a browser.
   - So the byte literals the spec pins contradict its "by construction" claim (`spec.md`:330), and they contradict the browser scenario at `spec.md`:2131. Literal tests written to the spec would pin the misalignment.
   - The gutter is not affected, because it always begins with `<span`. The excerpt's `<pre>` is not affected either, because it begins with `<code`. [Observed] A line feed inside the first `<code>` is kept.
   - Repair, either of:
     - make every bands line carry an element, for example `<span class="code-band"> </span>` for a highlighted line and `<span class="code-plain"></span>` for any other;
     - state that the bands' content opens with one line feed that the parser discards.
   - Then add to the scenario at 2125, or to the Falsifier, the case of a first line that is not highlighted.

2. **Note.** `spec.md`:330 ("give the gutter, the excerpt's `<pre>` and the bands one font, size, line height and vertical padding").
   - Problem. [Observed] Today the excerpt's font and line height are set on its `code` elements, not on its `<pre>` (`apps/three-surface-poc/src/polaris-generation/dossier-site.ts`:201: `figure.code-excerpt pre code{display:block;…font:${helper}/${bodyLeading} var(--font-mono)…}`).
   - Once the codes lay out inline, the line box takes the larger of the `<pre>`'s strut and the code's inline box. [Observed] In Chromium, a `<pre>` at 16px/20px holding an inline `code` at 13px/1.6 measures 43.6px for two lines where the gutter measures 40px, so the numbers drift down the excerpt.
   - An implementation that obeys the clause as worded (it names the `<pre>` only) can still misalign.
   - Repair: name the excerpt's `code` elements in the clause, for example "the excerpt's `<pre>` and its `code` elements, which take the frame's font, size and line height".

3. **Note.** `spec.md`:330 (vertical alignment terms).
   - Problem. [Observed] The excerpt's `<pre>` has a hairline border and a vertical margin (`dossier-site.ts`:199-200). The clause equalises only the vertical padding, so a gutter with no border sits 1 hairline higher than the excerpt.
   - Repair: equalise the vertical border and margin as well, or state that inside the frame none of the three has a border or margin and the frame carries them.

4. **Note.** `spec.md`:330 ("the bands over the excerpt's own box and behind its text").
   - Problem. [Inferred] The excerpt's `<pre>` paints its own background (`var(--d-surface-2)`, `dossier-site.ts`:199). A band placed behind the text can end up behind that background and invisible, and every geometry assertion in the browser scenario at 2131 still passes.
   - Repair: require that each band is visible, painted above the excerpt's background and below its text. Alternatively, move the background to the frame. Add "a band is hidden" to the Falsifier.

5. **Note.** `spec.md`:330 ("the three scrolling together inside the frame") and scenario 2131.
   - Problem. [Inferred] Because the gutter scrolls with the code, horizontally scrolling to the end of a long line takes the numbers out of view. The scenario only compares tops and heights, which still match off-screen.
   - This is a design choice rather than a defect, but `design.md` D4 does not weigh it.
   - Repair: state the trade-off in D4, or keep the gutter in view, for example with a sticky gutter or with only the code column scrolling.

6. **Note.** `spec.md`:328 (sentence and list), together with the `aria-hidden` gutter.
   - Problem, line numbers. [Inferred] A screen-reader user hears no line numbers. Yet the sentence "Highlighted: lines 12–13, line 18." and the items "Line 12 Read note 1" are framed in those numbers. The only way to map them onto the code they hear is to count from the figcaption's "lines 10–20".
   - Problem, link text. Two excerpts on one page each give a link "Read note 1" to different targets, and every list carries the same `aria-label="Notes on these lines"`.
   - Not a problem: colour. Highlights are not carried by colour alone. Number weight, the band and the sentence each carry them [Observed in the text].
   - Repair: give the sentence and list items a relative position as well, such as "line 12, the 3rd shown". Alternatively, state the limitation in D2/D4. Make the list's `aria-label` name the excerpt, for example its path and range.

7. **Note.** `spec.md`:328 (the fallback) and the Case line `spec.md`:2181.
   - Problem, what the browser does. [Observed] Local Chromium (headless shell 1223) breaks a `<pre>` line at none of U+0085, U+2028, U+2029, U+000B or U+000C. It renders `&#13;` as one line (a space), and `&#13;` followed by a line feed as two lines. Its trailing-line-feed behaviour also matches Syzygy's `lineCount`: "a\n" is one line and "a\n\n" is two, so an empty last line aligns.
   - So the fallback is conservative and correct for bare CR, harmless for the other three, and needs the browser behaviour for other engines left as [Unknown]. U+000B and U+000C, which UAX #14 classes as mandatory breaks, are not named.
   - Only the bare carriage return has a scenario (2155) and a Case entry; U+0085, U+2028 and U+2029 have neither.
   - Repair:
     - add U+0085, U+2028 and U+2029 to the Case line and the scenario at 2155;
     - decide U+000B and U+000C explicitly, either including them in the fallback or stating that they are measured not to break;
     - make the design's "may break" claim (`design.md` D4) cite the engines measured.

8. **Note (exception).** `spec.md`:324 and :326; Case `spec.md`:2181; scenarios 2119-2178.
   - Problem. These SHALLs have no scenario and are not named in the Case line:
     - the `schema` findings for a list of 0 or 13 entries, an entry with a missing or extra member, a non-integer or zero line, and a `block` that is not a handle (acceptance criterion 4's bounds);
     - the skip when the citation draws `range-invalid` or `code-excerpt-too-long`;
     - the skip of a list whose entries draw a `schema` finding;
     - the depth-first order across two excerpts, with highlights before notes and both after every 2.53 finding;
     - a note naming a subsection's paragraph (admitted) versus a subsection's `answer` (refused);
     - the v2 draft (`element-version` stands).
   - The Form lines make these falsifiable in principle, but no fixture is named for them.
   - Repair: add these to the Case line, and either add one scenario for bounds and skips or extend the scenarios at 2137 and 2143.

9. **Note.** `spec.md`:336 and the fallback at :328.
   - Problem. The byte-stability paragraph lets a v18 page differ from v17 only "apart from its numbered excerpts", and lists "the bytes of a page holding a numbered excerpt" as what moves.
   - Under :328, an excerpt in the fallback has no frame or gutter, so it is not numbered, yet it gains the sentence and the list. Read literally, :336 forbids those bytes.
   - `design.md` D6 says "apart from its verified excerpts", which is the right scope.
   - Repair: in :336 write "its verified excerpts (numbered or, under the fallback above, unnumbered with their sentence and list)", or define "numbered excerpt" to include the fallback form.

10. **Note.** `design.md`:17 (D1 rebind plan).
    - Problem. [Observed] The plan tells a rebinder to "re-run the generic wiring (`wire_successor.py`)". No file of that name is tracked at 9505c93 (`git ls-files`, 0 matches). The only file in the worktree naming it is this `design.md`, and no file of that name exists under `/home/orca`. So that half of the plan cannot be followed.
    - Repair: name a tracked tool, or drop that alternative and keep the manual one (update `CODEEX_SUBJECTS`' digest and chain `codeex` after the new predecessor).

## Checked and found sound

- [Observed] Screening:
  - The new checks compare only the draft's numbers and identities, and their details name no blob byte, path or line count (`spec.md`:326). The path-excluded variant is in the scenario at 2143.
  - Notes carry no text, label, citation or quotation of their own (:324).
  - The only draft-supplied values rendered are the integers, checked against the verified range, and the `block` handle in `href="#block-…"`, which version 2.15 already renders as an `id`.
  - No script is added (:330).
  - An excerpt that renders Unknown gets no gutter, highlights or notes (:328, scenario 2149). In `packages/polaris-dossier/src/render.ts`:802-821 every withheld excerpt is `excluded-content`, so the single condition at :328 covers every Unknown excerpt today.
- [Observed] Fragment targets: the notes add no `id`, and their targets are `block-<identity>` of place paragraphs. Version 2.15 (:342) gives these an `id` outside a collapsible section unless they are drawn inside one, and a place paragraph is never inside a presentation element. Scenario 2161 covers this.
- [Observed] Bounds: highlights and notes are each 1 to 12 entries. Reversed, outside and overlapping highlights are refused, with the precedence reversed, then outside, then order. Adjacent highlights are allowed (D3). Notes are strictly increasing, so there is one note to a line. The scenario findings at 2137 and 2143 recompute exactly from the stated rules.
- [Observed] Bytes:
  - v17 and earlier drafts keep their bytes apart from the `field-version` replacement (:334-336).
  - Brief v26 differs from v25 only by the version line, the schema line and one paragraph after the level paragraph, which version 2.50 defines (:332).
  - The provider stages' schema gains nothing, and numbering is keyed to local draft schema v18.
- [Observed] Package:
  - `code_excerpts_build_spec.py` reproduces `spec.md` byte for byte, and `code_excerpts_delta.py` reproduces `SEMANTIC-DELTA.md` with no diff. The delta reports 4 lines changed, 2307 kept and 10 scenarios added.
  - The spec's sha256 `8c8fe718…f278` is the same at install commit `1840f37dd`, in the delta and in `CODEEX_SUBJECTS`.
  - `GOVERNING-DEPENDENCIES.json` is byte-identical to version 2.53's.
  - Row A-345 has 7 columns, with the install commit, the spec link, the revert `git revert 1840f37dd…` and the tag `polaris-dossier-code-excerpts-v2.54`. The tag is not yet created, which is expected per `tasks.md`.
  - The `openspec/README.md` row and the `PROJECT-STATUS.md` census line (39 requirements, 667 scenarios) are present.
  - `count_polaris_effective_scenarios.py` gives 39/667 and matches the asserted census.
- [Observed] Battery in the worktree, after `git fetch origin`:
  - `check_spec_reconciliation.py --check`: 7 of 7 predicates without FAIL (R6 WARN is the pre-existing `syzygy-2g0d` pins);
  - `check_governance.py`: 22 OK, 17 WARN, 0 FAIL (39 checks);
  - `check_docs_review_campaign_partition.py --check`: partition PASS, unmatched=0.

## Counts

1 blocking, 9 notes (one of them an exception against acceptance criteria 1 and 4).
