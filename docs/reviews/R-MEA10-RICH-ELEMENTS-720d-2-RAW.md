# R-MEA10-RICH-ELEMENTS-720d-2
Verdict: REVISE
Reviewed commit: 720df2b2
Subject: syzygy-mea.10.5 rich presentation elements (git diff origin/main...720df2b2)

Reviewer: fresh-context confirmation review (round 2). I read the whole diff at `720df2b2`, the round-1 raw
(`docs/reviews/R-MEA10-RICH-ELEMENTS-e06b-1-RAW.md`), and the disposition paragraph in
`docs/review-campaigns/mea10-dossier-readability.md`. I read the v1.3 `SEMANTIC-DELTA.md`, `proposed/spec.md.patch` and the
review notes file in worktree `agent-a60460f35604ced66`. I edited nothing in the checkout: `git status --short` shows 0 lines
after the runs. I made no dossier runs and no provider calls, and read no other repository.

Checks run in the checkout:
- [Observed] `npm ci`: exit 0.
- [Observed] First run of
  `npx vitest run packages/polaris-dossier packages/polaris-generation-core apps/three-surface-poc/src/polaris-generation`:
  83 files, 2 failed, 81 passed; 9 tests failed, 2810 passed, 1 skipped. The host load average was about 35 (`uptime`).
- [Observed] Second run of the same command: 2 tests failed, both on "Test timed out in 5000ms".
  - `start-gates.test.ts` > "refuses config naming a remote, a promisor, an include or a command…"
  - `review.test.ts` > "does not count a verdict whose launch record is altered…"
- [Observed] Run alone, `review.test.ts`, `start-gates.test.ts`, `render.test.ts`, `check.test.ts`, `draft-schema.test.ts`
  and `closed-schema.test.ts` pass: 6 files, 374 tests. See note 7.
- [Observed] `dossier-render-provider-golden.test.ts` (unit tier) passes: 1 test. The diff does not touch
  `dossier-render-provider-golden.json` (`git diff origin/main...HEAD -- <it> | wc -l` = 0).

## Round-1 repairs

- [Observed] F1 repaired. `check-derive.ts:255-259` now tests `code-excerpt-too-long` before the `state !== 'admitted'` skip at
  `:260`. `check.test.ts` pins this with "a code excerpt of more than 60 lines of a file screening excludes" (`.env`, 1–61).
- [Observed] F2 repaired. `check-derive.ts:48` `LABEL_QUOTATION`, applied at `:134-137` before the markup test, reports
  `label-quotation` at the label's path. Three tests pin it: curly quotes in a caption, straight quotes in a card label, and a
  bare lead-in in a summary. See note 3 for what it still misses.
- [Observed] The applied notes:
  - a v2 draft carrying an element gets `element-version` (`:139-141`), with a test;
  - the markup detail text now names `<` or `>` and `*` or `_` at a word edge;
  - a no-script/CSP test now runs over every `.html` page.

## Findings

1. **revise**: `packages/polaris-dossier/src/check-derive.ts:260-261`
   - Evidence [Observed, code read]: `if (state.state !== 'admitted') continue;` at `:260` comes before the
     `range-beyond-blob` test at `:261`, and an `excluded` state carries no `lines`. For a blob that `screenPath` excludes,
     `:216` never reads the body at all.
   - So a code excerpt of an excluded file whose range runs past the file's end gets no finding. Example: `.env` (one line in
     the fixture) cited as lines 1–5, which is within 60 lines.
   - No test covers this. `check.test.ts` "a code excerpt past the end of its file" uses the admitted `src/kestrel.c`.
   - Breaks:
     - acceptance criterion 2: "more than 60 lines, or a range past the end of the file, is a repair finding whatever
       screening decides";
     - the v1.3 scenario "Code excerpt over its limit": "**WHEN** a code excerpt's citation names more than 60 lines, or
       lines beyond the end of the blob **THEN** Syzygy reports a repair finding for that excerpt's citation". Its WHEN has
       no screening condition.
   - F1 repaired only the first half of that same criterion.
   - Two cases differ:
     - When screening read the body and then excluded it (content screening, or `not-utf8-text`), the line count is known
       in-process. A finding can be reported, as long as its detail does not state the count of a withheld file.
     - When `screenPath` excludes the path, the body is never read. Meeting the criterion would mean reading a body that
       screening withholds.
   - [Inferred] The second case may need an owner ruling rather than code. The spec's "lines beyond the blob, is a repair
     finding, as for any citation" can be read as inheriting v1.2's rule, under which no excluded citation is range-checked.
   - Either way, the repair should implement the read-body case and disclose the path-excluded case, or the owner should
     rule. The criterion as written is not met.

2. **note**: `packages/polaris-dossier/src/render.test.ts:1087-1094`
   - Evidence [Observed]: the fragment-target sweep collects `href` targets from every page. It looks for `<details>` only
     in `index.html` (`const opened = [...index.matchAll(…)]`).
   - The element fixture places its one `details` on `index.html`, so a `details` on a deep-dive page is never checked.
   - [Observed] The renderer links to no `#element-…` id and gives claims `data-claim-id` attributes, not `id`. So no target
     sits inside a `details` today.
   - The pin is narrower than the disposition's "the wider fragment-target sweep" suggests.
   - Criterion 4, 6.

3. **note**: `packages/polaris-dossier/src/check-derive.ts:48`
   - Evidence [Observed]: `LABEL_QUOTATION` matches straight and curly double quotes, `„`, `«`, `»`, and the lead-in
     `\bstates:`. That pattern is case-sensitive.
   - It does not catch single or curly single quotes (`‘fast’`), nor `States:`.
   - Syzygy's one quotation form is the lead-in with straight double quotes (`brief.ts:45`), so the spec's "a quotation" arm
     is met.
   - But the agent guidance says "no quotation mark" (`brief.ts`, rule 5), and a `‘…’` label would still show unverified
     source wording as a quotation to a reader.
   - Criterion 3, conservatively met.

4. **note**: `apps/three-surface-poc/src/polaris-generation/dossier-site.ts:336`
   - Carried from round-1 note 5 and still open, as the disposition records. Every withholding cause renders the same text,
     "excluded by screening":
     - a non-UTF-8 blob;
     - a range touching a redacted line;
     - a piece-lookup miss;
     - a blob withheld by the class gate.
   - Review note 1 asks that "A non-UTF-8 blob renders withheld with its reason". There is still no test for a non-UTF-8 or
     redacted-line excerpt.
   - Criterion 2, 6.

5. **note**: `packages/polaris-dossier/src/render.test.ts` (rich presentation elements describe)
   - Carried and still open, as the disposition records:
     - No test changes the clone's working tree after check and confirms the excerpt is unchanged. The v1.3 scenario "Code
       excerpt rendered from Syzygy's read" names that case.
     - No test shows `reviewCheck` refusing a verdict that lacks the `blockSupport` entry of an element claim.
   - [Observed] The code paths do reach both: `excerpt()` reads `admitted` from the derivation, and the review uses
     `collectBlocks`.
   - Criterion 1, 2, 6.

6. **note**: `packages/polaris-dossier/src/draft-schema.ts:24` (process, merge order)
   - Carried from round-1 note 4. Every brief issues `polaris-dossier-local-draft-v3`, and no code path waits for a v1.3
     sign-off record.
   - The v1.3 spec bytes are not installed on this checkout, and the SEMANTIC-DELTA's plan is "review, sign-off, recording,
     then merging the code".
   - The branch should merge only with, or after, the v1.3 install, with its P115 blocker resolved. Outside the six criteria
     ("Nothing beyond the acts in force").

7. **note**: test tier stability (no single line)
   - Evidence [Observed]: under a host load average of about 35, the criterion-6 command failed by 5000 ms timeouts: 9 tests
     on the first run and 2 on the second. Each failing test is outside the element tests, and each file passes when run
     alone.
   - Not a defect of this change. It does mean a single run of that command is not a reliable green: re-run on a quiet
     host before quoting it as evidence.
   - Criterion 6.

8. **note**: shared closed-schema diagnostics
   - Carried from round-1 note 8 and still on record. `closed-schema.ts` changes refusal wording for every `oneOf` schema,
     provider-mode ones included. The provider golden pins rendered bytes only (criterion 5 met, [Observed]), not refusal
     text. Disclose this in the PR body.

## Summary by criterion

1. Claims inside elements: met.
   - [Observed] `contentClaims` reaches table cells, callout and details blocks, steps, definitions and card bodies.
   - Each has its own finding path (six check tests), its marking (render test), its machine entry, and a fidelity-criteria
     line. Identities are checked across the whole draft.
2. Code excerpts: partly met.
   - [Observed] Met: rendered from Syzygy's read, entity-encoded, Observed with an RFC7-10 evidence-artifact anchor, and
     excluded files Unknown `excluded-content` with no bytes. Over 60 lines is now a finding whatever screening decides.
   - Not met: a range past the end of an excluded file gets no finding (finding 1).
3. Short labels: met.
   - [Observed] 120 code points; markup and quotation findings at the label's path; rendered escaped and screened with no
     marking or anchor. Single quotes are a gap (note 3).
4. Inert semantic HTML: met.
   - [Observed] Scoped `th`, tone stated in words, "no entry", no `<script`, the CSP meta unchanged on every page. The
     details sweep is index-only (note 2).
5. Provider bytes: met; the golden passes and its JSON is unchanged.
6. Tests: the element behaviours are pinned except for finding 1 and notes 2, 4 and 5. The tier is green when run
   alone; see note 7.
