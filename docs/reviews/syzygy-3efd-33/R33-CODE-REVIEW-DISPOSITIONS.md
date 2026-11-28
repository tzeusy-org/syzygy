# Code excerpts code review 1: dispositions

Review: `R33-CODE-REVIEW-RAW.md` in this directory, verdict `REVISE` (line 2), over `9f979c3ba`. It has 1 blocking finding and 10 notes. This is one round; no confirmation review follows (D10). The repairs are in commits `10c68e629`, `689fa3be7`, `dfab4ccef` and the commit that lands this file, on `agent/syzygy-3efd.33-code`. The mutation records for runs 3 to 6 sit beside the runner in `docs/evidence/syzygy-3efd-33/`. Runs 1 and 2 are not edited.

## 1. Blocking: `too-long-guard-dropped` is not equivalent

Repaired.

- The premise was false. A citation of an absent path draws `path-absent`, and that suppresses both `range-invalid` and `code-excerpt-too-long`. So for that citation, the guard in `rangeOf` is the only thing that skips the excerpt.
- New tests in `code-marks.test.ts` use an absent path with ranges 1 to 70, 20 to 10 and 0 to 5, each carrying a highlight at line 80. None draws a finding of this version. A 1-to-5 control on the same path does draw one. A second test calls `codeMarkFindings` alone, with citations that are not objects or whose lines are not integers from 1.
- The runner moves `too-long-guard-dropped` from the equivalent list to the mutants, and adds `reversed-guard-dropped`. Runs 3, 4 and 5 kill both.

## 2. Note: the redundancy claim is half right

Accepted. `refused-dropped` stays a recorded equivalent, for the reason the review confirms.

Spec defect, for the 2.54 erratum: "a well-formed, non-reversed range of 1 to 60 lines" reads as an appositive. It is a second, conjunctive condition, because `path-absent` suppresses both range findings. Suggested wording: "and whose range is".

## 3. Note: `kind: "code"` objects outside an admitted position

Repaired. `excerptsOf` walks only these positions:

- the entries of a section's, a subsection's or a deep dive's `paragraphs`;
- the `elements` of a `details` element there.

`withoutCodeMarks` strips only those excerpts.

- A test puts a callout child carrying `highlights` in v17 and in v18. It draws its parent's 2.53 `schema` finding alone: no `field-version`, no `code-highlight`, and nothing at `.highlights`.
- New mutants: `misplaced-code-read`, `details-not-read`, `subsections-not-read`. Run 3 showed the last survived, so a test of an excerpt in a subsection's paragraphs was added, and runs 4 and 5 kill it.

## 4. Note: where schema findings at `highlights` and `notes` go

Kept as built: first within each excerpt's group, after every 2.53 finding. Every scenario agrees.

Spec defect, for the 2.54 erratum: the requirement does not name the position of a `schema` finding at either list. Suggested wording: "each excerpt's `schema` findings at either list precede its highlight and note findings, and all of them follow every finding version 2.53 reports".

## 5. Note: `range-beyond-blob` does not skip the checks

Kept, as the review judges. This was already recorded in the PR body (decision 2) and is pinned by a test. For the erratum, the spec could say so in one sentence.

## 6. Note: "topmost" in the browser scenario

Kept. The browser test's reading is the one the clause means:

- the bands are made hit-testable for the one reading;
- among the elements at a point between two characters, the first that paints a background is the band;
- no element above the band paints one;
- the excerpt's `code` lies above the band.

Spec defect, for the 2.54 erratum: the scenario should say "the topmost element painting a background".

## 7. Note: browser coverage and pitch drift

Repaired.

- `codeExcerptInput` now takes a variant. The browser test runs each variant at 390 and 1440 px, unscrolled and scrolled to the end:
  - LF, in one part and in two;
  - CRLF;
  - tab-padded lines;
  - an empty first line;
  - an empty last line;
  - no final newline (line 20 is the blob's last);
  - a 600-character line;
  - a 60-line excerpt (lines 1 to 60 of a 65-line blob), highlighted also on 59 to 60.
- The band check no longer uses `top + k × lineHeight`. Each band is compared with its own line's number box and text box, by centre, and its height with the line height. No error accumulates with depth, and the 60-line case holds within the 0.5 px tolerance at its foot.
- The copy check compares against the cited lines literally for every variant but CRLF. For CRLF it compares against the excerpt's `<pre>` selected alone.

After the review, the hosted e2e tier failed at `7556d82ab` (CI run 46164381249). The message was "one part, lf, at 390, unscrolled: band of shown line 3". The failure was diagnosed and repaired:

- [Observed] Locally, setting the frame's font size to 11, 15.5 or 17.1 px, or its line height to 19.3 or 13.7 px, reproduces the message exactly. At 11 px the line height is 16.5 px and the glyph box is 13 px tall, and the engine places the glyph 1 px below its line box's top and 2.5 px above its bottom.
- [Observed] The band is exactly its line box. Its top is the gutter's content top plus two line heights, 136.375 px, and its height is 16.5 px.
- So the band was right, and the test's premise was wrong. The test compared the band's centre with the glyph's centre, which assumes half-leading splits evenly. The hosted runner's fonts give a size where it does not. The cause is line-height rounding within the line box, not a band misplaced against its line or a font fallback.
- No CSS change: the layout already meets the clause under any font. Setting `vertical-align:top` on the bands was tried and changes nothing measured, since a band shares its line's font and strut.
- The test now reads the glyph's offset in its line box once, on the gutter's first line, whose box begins at the gutter's content top. Each band's top must equal its own number's measured top less that offset, within 0.5 px, and its height must equal the line height. Each line's text must lie inside its band. This is as tight as before and needs no even split.
- The same excerpt also runs with the frame's font size set by the test to 11, 15.5 and 17.1 px, the sizes that split unevenly here. This pins the failure CI met.
- The other failure in that run, "fits every dossier page at 390 by 844" in `dossier-reading.browser.test.ts`, timed out at 5010 ms against vitest's default 5 s. Its input holds no code excerpt, and this branch changes neither that test's page nor its input. Locally it takes 1.5 s. Its four siblings in the file carry 30 to 60 s limits, so it now takes 60 s, with the reason in a comment. [Inferred] The runner was loaded by the e2e files that run alongside it, the code-excerpt browser test's page loads among them.

## 8. Note: what is pinned, and what is not

Repaired.

- A body screening reads and then excludes now has a test: `src/held.ts`, a credential assignment built in pieces. Its excerpt draws no finding of this version, and it renders through the withheld branch with `excluded-content` and no frame, gutter, bands, sentence or list. Its sibling test covers a path screening excludes (`.env`). These are the two withholding grounds that reach the render, and both take the one 2.53 branch.
- A draft that writes `deepDives` before `sections` has a test, and its deep dive's findings come first.
- The byte-stability observation (only `index.html` and the size report move) needs no change.

## 9. Note: the 10,000,000 line bound

Kept. `HIGHLIGHTS_SCHEMA` and `NOTES_SCHEMA` reuse `line`, the citation's own bound, so a mark can never name a line that a citation cannot.

Spec defect, for the 2.54 erratum: state the bound ("an integer from 1 to 10,000,000, as a citation's lines"). Alternatively it could be derived from the excerpt bounds, but then a schema finding would become a `code-highlight` finding, which is a behaviour change. It is left to the erratum.

## 10. Note: equivalents judged

- `lines-wrap` and `refused-dropped` stay recorded equivalents, as judged.
- `field-version-in-v18` held only because every caller strips first. It now runs as a mutant against a test of `codeMarkFieldVersionPaths` alone over an unstripped v18 draft, and runs 5 and 6 kill it. The function stands without its callers' contract.
- `too-long-guard-dropped` (finding 1).

## 11. Note: branches no test reaches

Each line the review lists now has a test or is gone:

- `:46`, the `at === '$'` guard: gone. Finding 3's rewrite reads only the top-level `sections` and `deepDives`.
- `:88`, a citation that is not an object: tested in the module-alone block.
- `:89-90`, the guards for an absent path: tested (finding 1).
- `:126`, an excerpt with no place: gone. Every excerpt now has its section or deep dive.
- `:148-149`, a non-string or repeated `id` in `codeMarksAt`: tested. Mutants `repeated-id-overwrites` and `any-id-marked` were added.
- `:150-153`, the render-side entry filters: tested with malformed entries. Mutants `render-highlight-unfiltered` and `render-note-unfiltered` were added.
- `:74`, the unknown-version arm: a v19 draft carrying `highlights` takes no finding of this version.
- `dossier-code-frame.ts:18-19`, `user-select:none`: mutants `gutter-selectable` and `bands-selectable` were added to the browser group, against the copy assertion.
- `dossier-code-frame.ts:22-23`, the note-mark and list styles: cosmetic. No test is added; the unit test pins their literals.

## Errata for team-lead's 2.54 spec bead

These come from findings 2, 4, 5, 6 and 9 above:

- the range condition as a second requirement;
- the position of the `schema` findings at either list;
- `range-beyond-blob` not skipping, stated;
- "topmost element painting a background";
- the line bound stated.
