# Review: syzygy-3efd.33 code excerpts code
Verdict: REVISE
Reviewed commit: 9f979c3ba9cae7960b0b3d829367beeee4c1fa95
Reviewer: fresh-context general-purpose agent, 2026-11-28

Scope: diff from merge base `3f04944bbe4de384cb0bd5c231ae36a01fda1a58` to `9f979c3ba` (30 files). Governing text: REQ-polaris-generation-034 version 2.54 in `openspec/changes/dossier-code-excerpts/` (proposed spec paragraphs beginning "A draft in schema `polaris-dossier-local-draft-v18`", "For a v18 draft Syzygy SHALL report", "From version 2.54 Syzygy SHALL render", "The numbers and bands line up", "Brief v26 SHALL issue", "In a draft of any schema from v3 to v17", "A draft in schema v17 or earlier", the twelve 2.54 scenarios, and design.md D1–D8 and its Review section).

## Checks run in a fresh worktree (`npm ci` first)

- [Observed] `npx vitest run` over code-marks, dossier-code-frame, brief, draft-schema, walk, view-level, system-model, containment-figure, dossier-render-provider-golden and dossier-quote-fidelity: 10 files, 264 tests passed.
- [Observed] `check.test.ts`, `render.test.ts` and `cli.test.ts`: 3 files, 611 tests passed.
- [Observed] `code-excerpt.browser.test.ts` with `SYZYGY_POC_BROWSER` set to Chromium 1223: 1 passed. It ran, it was not skipped.
- [Observed] `npm run typecheck` is clean. `npm run check` passed: 248 files, 5993 tests, 1 skipped.
- [Observed] `git diff --stat` from the merge base is empty for `dossier-render-provider-golden.test.ts` and `dossier-quote-fidelity.test.ts`.
- [Observed] The v26 paragraph, extracted from the spec by script, equals `EXCERPT_PARAGRAPH` in `brief.ts` and the copy in `brief.test.ts` byte for byte (801 characters).
- [Observed] Every subject sha256 in the run-2 mutation record equals the file at `9f979c3ba`. Run 2 holds 52 mutants, all `killed: true`, with 52 distinct ids.
- Probes were written only inside the worktree and reverted before it was removed (findings 1, 3, 7 and 8).

## Findings

1. **Blocking.** `packages/polaris-dossier/src/code-marks.ts:90`; `docs/evidence/syzygy-3efd-33/code-marks-mutation-run2-2026-11-28.json`, `equivalent[]` id `too-long-guard-dropped`; the same entry is in run 1.
   - The record calls the mutant equivalent because "An excerpt of more than 60 lines always draws code-excerpt-too-long at its citation". That premise is false.
     - [Observed] `check-derive.ts:310` `continue`s on `path-absent` before the `range-invalid` check (line 311) and the `code-excerpt-too-long` check (line 313).
     - So a citation naming no file draws neither finding, whatever its range.
   - Failure scenario [Observed by probe]: a v18 excerpt citing `src/nope.ts` lines 1 to 70, with `highlights` `[{"startLine": 80, "endLine": 80}]`.
     - At `9f979c3ba` check reports only `path-absent`.
     - With the mutant applied (`|| s > t) return undefined;`), check also reports `code-highlight` at `$.sections[0].paragraphs[2].highlights[0]` with "`highlights[0]` lies outside the excerpt's lines 1 to 70".
     - The mutant is killable. The length guard is load-bearing, and no test covers it alone.
   - [Inferred] The same holds for `s > t` alone (a reversed range on an absent path draws only `path-absent`) and for `s === undefined` with an absent path. The spec's "a well-formed, non-reversed range of 1 to 60 lines" is therefore enforced only by the guard on those paths, untested.
   - The behaviour at `9f979c3ba` is correct. The test and the retained evidence are not.
   - Repair:
     - Add path-absent cases with a reversed range, a 61-line or longer range, and a line of 0, each carrying an out-of-range highlight, and expect no finding of this version.
     - Re-run the mutant and record it as killed in a new run record; do not edit run 1 or run 2.
     - The other half of the reasoning stands: `refused-dropped` is truly equivalent (see finding 2).

2. **Note: the authors' redundancy claim is half right.** `code-marks.ts:86-93`.
   - [Observed] `check-model.ts:319` `line` is the same predicate as `lineOf` (a safe integer of at least 1).
   - `range-invalid` (`check-derive.ts:311`) fires only where `line` fails or start > end. `code-excerpt-too-long` fires only past 60 lines, and both fire only when the path is present.
   - So every case the `refused` reading catches, the guard catches first. `refused-dropped` is a true equivalent, and the reading is redundant.
   - The converse is false (finding 1).
   - Spec defect (minor): "computed only for an excerpt whose citation draws no `range-invalid` or `code-excerpt-too-long` finding, a well-formed, non-reversed range of 1 to 60 lines" reads as an appositive. Because `path-absent` suppresses both findings, it is load-bearing only as a second, conjunctive condition. Suggest the next amendment say "and whose range is".

3. **Note: objects with `kind: "code"` outside an admitted element position are treated as excerpts.** `code-marks.ts:39-53` (`excerptsOf`), `:59-68` (`withoutCodeMarks`), `:72-76` (`codeMarkFieldVersionPaths`).
   - [Observed by probe] v18: a code object in a callout's `children` (where only blocks are admitted) with an out-of-range highlight draws the parent `schema` finding plus a `code-highlight` finding at `…children[0].highlights[0]`.
   - [Observed by probe] v17: the same object with `highlights` draws the parent `schema` finding plus a `field-version` finding at `…children[0].highlights`. Without `highlights`, only the `schema` finding is drawn.
   - 2.53 reports no `schema` finding at that `.highlights` path (the oneOf failure is reported at the parent). So the `field-version` is an addition, not a finding "in place of the `schema` finding … at the same path". That deviates from "checked … exactly as version 2.53 … except for the `field-version` findings above in place of the `schema` findings at their paths".
   - Impact is limited to drafts already refused.
   - Repair: walk only the positions where a code element is admitted (a section's, subsection's or deep dive's `paragraphs`, and a `details` element's `elements`). Or emit a `field-version` only where the shape check would report a finding at that path.

4. **Note: schema findings at `highlights`/`notes` come after every 2.53 finding.** `code-marks.ts:102-109`.
   - The spec says where the `code-highlight`/`code-note`/`unresolved-reference` findings go ("all of them follow every finding version 2.53 reports"). It does not say where a `schema` finding at `highlights` or `notes` goes, since the generic shape check never sees the stripped members.
   - The author emits them first within each excerpt's group, after every 2.53 finding. Every scenario agrees, including "holds 0" before "holds 13".
   - Judgement: a reasonable reading of a spec gap, not a defect in the code. The spec should name the position.

5. **Note: `range-beyond-blob` does not skip the checks.** The tests say so at `code-marks.test.ts:216-219`.
   - This follows the letter. [Inferred] It is also the only reading consistent with the same paragraph's "computed and reported alike whatever classification and screening decide".
     - `range-beyond-blob` is drawn for a body that was read and then excluded (`check-derive.ts:316-324`), but never for a path-excluded one.
     - Skipping on it would make the findings differ between the two exclusions, and would make their presence depend on the blob's line count.
   - Not a spec defect. At most the spec could say so in a sentence.

6. **Note: "topmost" in the browser scenario conflicts with the clause.** `code-excerpt.browser.test.ts:66-79, 118-129`.
   - The clause requires each band "above any background … and below their text". The scenario says the band "is the topmost element at a point of it between two characters".
   - Hit-testing cannot tell text from its element box. With the text above the band, the `code`/`pre` elements are necessarily above it in `elementsFromPoint`.
   - The author's reading is correct and is what the clause means: make the bands hit-testable, then require that the first element painting a background is the band and that no element above it paints one.
   - [Observed] Mutants `pre-paints-background` and `text-under-bands` are killed.
   - Spec defect in the scenario wording: suggest "the topmost element painting a background".

7. **Note: alignment holds beyond the committed fixture, but the browser test covers only LF-terminated ASCII lines.**
   - [Observed by probe] Chromium 1223, at 390 and 1440 px, unscrolled and scrolled to the end. In every case the excerpt `<pre>` and the gutter each measured 10.995 line heights for 11 lines, and every number and band lay within 0.3 px of its line. The variants were:
     - all CRLF;
     - an empty last line;
     - an empty first line;
     - no final newline;
     - leading and trailing tabs;
     - CJK, emoji and Arabic glyphs (font fallback);
     - ten empty lines;
     - a 600-character line.
   - [Observed] The committed test's band check compares each band with a synthetic box `top + k × lineHeight`. The computed `lineHeight` (20.4 px) differs from the laid-out line pitch by about 0.008 px per line (−0.07 px by shown line 9). At 60 lines the drift approaches the 0.5 px tolerance.
   - Repair:
     - Add CRLF, tab and empty-last-line variants to `codeExcerptInput` in the browser test.
     - Compare bands against the measured text or the gutter number of the same line rather than the synthetic pitch.

8. **Note: what is pinned, and what is not.**
   - [Observed by probe] Rendering a v18 draft with marks against the same draft without them, and that v18 draft against its v17 twin (hex digests and schema name masked), differs only in `index.html`, `size-report.html` and `size-report.json`. `machine.json`, `dossier.json` and `derived-structure.json` are unchanged.
   - [Observed] The withheld-excerpt render test (`code-marks.test.ts:339-347`) uses only a path-excluded `.env`. The scenario also names a blob that classification or screening excludes after a body read. The render branch is shared (`dossier-site.ts:723`), so this is a coverage gap only.
   - [Observed] No test writes `deepDives` before `sections` in the draft's bytes, so "an object's members in the order the draft writes them" is pinned only by `excerpts-reversed`.

9. **Note: line bounds.** `draft-schema.ts` `HIGHLIGHTS_SCHEMA`/`NOTES_SCHEMA` use `line` (`maximum: 10_000_000`).
   - The spec says "each an integer from 1". A `startLine` of 20,000,000 becomes a `schema` finding ("must be an integer from 1 to 10000000") rather than a `code-highlight` "lies outside".
   - Harmless, since a citation's own lines share the bound, but it deviates from the letter.
   - Repair: state the bound in the spec, or drop it.

10. **Note: equivalents judged.**
    - `lines-wrap` is [Inferred] truly equivalent.
      - The excerpt's text sits in `code` elements, which carry their own `white-space:pre` (`dossier-code-frame.ts:16`), so the mutant changes only the `<pre>`'s inline formatting context, which holds no bare text.
      - The second column is `minmax(max-content, 1fr)`, and the max-content of `pre-wrap` is the unwrapped width.
      - The gutter column is `max-content`.
    - `refused-dropped` is truly equivalent (finding 2).
    - `field-version-in-v18` is equivalent for today's callers: `deriveFindings` is reached only from `check.ts:242`, `render.ts:205` (both after `withoutCodeMarks`) and `verify-text.ts:328`, whose subject has no excerpts. That depends on a caller contract that nothing enforces, recorded in the comment at `check-derive.ts:137-138`.
    - `too-long-guard-dropped` is **not** equivalent (finding 1).

11. **Note: branches no test reaches** (`code-marks.ts` unless named).
    - `:46` the `at === '$'` guard (a nested `sections` or `deepDives` key);
    - `:88` a citation that is not an object;
    - `:89-90` `s === undefined`, `t === undefined`, `s > t` and the length test, for an absent path (finding 1);
    - `:126` an excerpt with no place;
    - `:148-149` a non-string or repeated element `id` in `codeMarksAt`;
    - `:150-153` the render-side entry filters (unreachable after check plus rederive);
    - `:74` the unknown-version arm (a v19 draft carrying `highlights`: no test);
    - `dossier-code-frame.ts:18-19` `user-select:none` on the gutter and bands. No mutant covers it, but the copy assertion at `code-excerpt.browser.test.ts:131-136` probably would fail without it [Inferred];
    - `dossier-code-frame.ts:22-23` the note-mark and sentence/list styles (cosmetic).

## Acceptance criteria

1. Every 2.54 SHALL and the eleven 2.54 scenarios about the excerpt are implemented as written, and each has a test.
   - [Observed] Scenarios matched to tests: lines numbered; highlights and notes; browser alignment and copy; highlight findings; note findings and path-excluded; malformed lists and skips; order, subsection and deep dive, and v2; withheld; fallback; collapsible; field-version; brief v26.
   - Gaps: findings 1, 7 and 8.
2. Alignment:
   - [Observed] It holds for every case named, at both widths and both scrolls (finding 7).
   - The six excluded characters get no frame, at unit and pipeline level, and a CRLF excerpt is numbered.
   - Bands paint above the frame background and below the text. The author's "topmost" reading is right (finding 6).
3. Screening:
   - [Observed] The checks read only the draft and prior findings, and notes carry no text.
   - The page gets loop integers, `lineOf`-filtered integers and escaped handles (each re-checked at rederive), and the excerpt path that the `<figcaption>` already shows.
   - A withheld excerpt takes the unchanged 2.53 branch (`dossier-site.ts:723-728`) before any marks are read.
   - No `<script>` is emitted. Detector and screening code is untouched.
4. Accessibility:
   - [Observed] The link name is "Read note n on <path>, <where>". The list's `aria-label` is "Notes on <path>, <where>".
   - The gutter and bands are `aria-hidden`, and the gutter mark is not a link.
   - Names are distinct per excerpt, except for the same lines of the same file, as D2 accepts.
5. Findings:
   - [Observed] Bounds, order, overlap (touching allowed), notes outside the excerpt, subsection paragraph against answer, and depth-first order are all as specified and tested.
   - The authors' three decisions are judged in findings 2, 4 and 5. Spec defects: the appositive range condition (finding 2) and the unstated `schema` position (finding 4), both minor.
6. Byte stability:
   - [Observed] The provider golden is unchanged and passes.
   - v17 and earlier: `codeMarksAt` returns an empty map, so `codeMarks` is absent and the style rules are absent. The only check deviation is the misplaced-object `field-version` (finding 3).
   - The brief changes only in the version line, the draft-schema line and the one paragraph.
   - The .39 tests (`check.test.ts` twice, `system-model.test.ts`, `view-level.test.ts`, `walk.test.ts`) changed only v18 to v19 and their titles. `check.test.ts` also gained v18 in the expected "must be one of" list, which is the necessary consequence.
7. Conformance values: [Observed] the expected strings in `code-marks.test.ts` and `dossier-code-frame.test.ts` are literals. `CODE_MARK_DETAIL` is not imported by either test.
8. Mutation evidence:
   - Run 2 is 52/52 killed with 4 recorded equivalents.
   - Three equivalents hold; one does not (findings 1 and 10).
   - Untested branches are listed in finding 11.
9. Correctness bugs: none found in the shipped behaviour beyond finding 3 (an edge case on drafts already refused).

Counts: 1 blocking, 10 notes.
