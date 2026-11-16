# R-MEA10-RICH-ELEMENTS-e06b-1
Verdict: REVISE
Reviewed commit: e06b3624
Subject: syzygy-mea.10.5 rich presentation elements (git diff origin/main...e06b3624)

Reviewer: fresh-context code review. I read the diff, the v1.3 SEMANTIC-DELTA.md, proposed/spec.md.patch and
POLARIS-DOSSIER-LOCAL-AGENT-MODE-V1-3-REVIEW-NOTES.md, the latter from worktree agent-a60460f35604ced66. I did
not edit the checkout.

Checks I ran in the checkout at e06b3624:
- [Observed] `npm ci` and then `npm run check`: exit 0. 169 test files and 3785 tests passed, and the
  provider golden test (`dossier-render-provider-golden.test.ts`) is among them.
- [Observed] `npm run check` runs only the unit tier. The new behaviour tests in `render.test.ts`,
  `check.test.ts` and `review.test.ts` are integration tier (see `vitest.tiers.ts`), so I ran them
  separately with `npx vitest run --project integration` over five files: render, check, review, brief, and
  the app's dossier-render. Result: 5 files, 291 tests, all passed.

## Findings

1. **revise**: `packages/polaris-dossier/src/check-derive.ts:237-241`
   - Evidence [Observed, code read]: line 237 `if (state.state !== 'admitted') continue;` runs before the
     `code-excerpt-too-long` test at lines 238-241. A code excerpt whose citation names a blob that
     classification or screening excludes therefore never reaches the line-count check.
   - [Inferred from the control flow; not executed, since the checkout is read-only] An excerpt citing
     `.env` lines 1 to 500 passes check with no finding and renders as an Unknown `excluded-content`
     excerpt.
   - Breaks: acceptance criterion 2 ("More than 60 lines ... is a repair finding") and the v1.3 text. The
     spec says "it SHALL name one citation of 1 to 60 lines, and Syzygy SHALL report a repair finding for one
     of more", and the scenario "Code excerpt over its limit" has the unconditional WHEN "a code excerpt's
     citation names more than 60 lines".
   - Only the *exclusion* is exempt ("its exclusion is not a repair finding"), not the length. The line
     count is the draft's own number, so reporting it leaks no byte of the excluded blob.
   - Missing test: the existing test, "a code excerpt of more than 60 lines" (`check.test.ts`), covers only
     an admitted blob.

2. **revise**: `packages/polaris-dossier/src/check-derive.ts:17-19` (`LABEL_MARKUP`) and `:120-123`
   - Evidence [Observed, code read]: the only short-label finding is `label-markup`. Nothing tests a label
     for a quotation.
   - A caption, title, term, card label or summary written in Syzygy's one quotation form passes check,
     because neither `:` nor `"` is in the markup set. Example: `The project states: "Each command runs to
     completion"`.
   - Nothing in `contentClaims`/`collectBlocks` reaches labels. `leadInQuotations` runs only over a claim
     block's text key (`check-derive.ts:157-158`).
   - The label then renders as escaped plain text. It is not Observed, but a reader sees unverified
     source wording presented as a quotation.
   - Breaks: the v1.3 text, "Syzygy SHALL report a finding for a short label longer than 120 characters or
     one that carries a citation, a quotation or markup". It also breaks the falsifier arm "a short label
     ... carrying a citation, a quotation or markup, passes".
   - Criterion 1 is also affected: the label rules are part of "every rule" a reviewer applies. The fix is
     cheap: run `leadInQuotations(label.value)` over `elementLabels(doc)` and report a finding at the label's
     path, with a check test per label kind.
   - Labels cannot carry a citation, since the schema makes each label a bare string. That half is met
     structurally.

3. **note**: `packages/polaris-dossier/src/draft-schema.ts:142,148,155`
   - Evidence [Observed]: `schemaVersion` is `choice([v2, v3])`, and `paragraphs` is `list(ref('content'))`
     whatever the version. So a draft that declares `polaris-dossier-local-draft-v2` may carry every v1.3
     element and still pass.
   - The v1.3 design says "Syzygy still accepts a `polaris-dossier-local-draft-v2` draft, which uses no
     element".
   - Not a safety hole, because elements are checked identically under either version. But the version tag
     no longer tells a reader which forms a draft may hold.
   - Suggest one of: refuse an element in a v2 draft, or record that v2 is accepted only as an alias.
   - Criterion: schema fidelity to the design; outside the six acceptance criteria.

4. **note**: process, merge ordering (no single line)
   - Evidence [Observed]: no code path gates v3 or elements on a v1.3 sign-off record.
     `LOCAL_DRAFT_SCHEMA_VERSION` is now v3, and every brief issues it (`brief.test.ts`).
   - The v1.3 spec bytes are not installed on this checkout. SEMANTIC-DELTA.md "Migration / supersession
     plan" says: "The proposed order is review, sign-off, recording, then merging the code". It also says
     "the element code becomes conformant only once these bytes are signed".
   - The brief tells me the owner signed on 2026-11-04. If so, the remaining gap is the recording and
     install, which also needs the P115 install blocker resolved.
   - This branch should merge only after, or together with, the v1.3 install. Merging it alone ships
     behaviour that the installed v1.2 spec does not describe ("Nothing beyond the acts in force").

5. **note**: `packages/polaris-dossier/src/render.ts:437-457` and
   `apps/three-surface-poc/src/polaris-generation/dossier-site.ts:336`
   - Evidence [Observed]: every way an excerpt is withheld renders the same visible text, "[code excerpt
     withheld: the file it cites is excluded by screening]", with `excluded-content`. These are:
     - a blob screening excludes;
     - a non-UTF-8 blob (`check-derive.ts:205` puts it in state `excluded` with outcome `not-utf8-text`,
       so `admitted.get` is undefined);
     - a range that touches a redacted line;
     - a piece-lookup miss.
   - The `excluded-content` reason matches the spec. But review note 1 asks that "A non-UTF-8 blob renders
     withheld with its reason". For a non-UTF-8 file the words "excluded by screening" are imprecise, and no
     test covers a non-UTF-8 excerpt or a redacted-line excerpt.
   - Criterion: 2 (the excluded arm is met; the precision and test gap is a note) and 6.

6. **note**: `packages/polaris-dossier/src/render.test.ts:989-1090` (describe "rich presentation elements")
   - Evidence [Observed]: the behaviours are mostly pinned, with these gaps against criterion 6:
     - (a) The element fixture asserts neither the absence of `<script` nor the CSP meta on its pages.
       Criterion 4's "no script, and the CSP unchanged" rests on the pre-existing runtime gates
       (`pageSinkCspFinding`, `scanDossierPage`) and on DOSSIER_THEME_CSS staying inside the existing
       `<style>`. [Inferred] The implementation meets it, but this fixture does not pin it.
     - (b) The fragment-target test (line ~1085) checks only the first `<details>` on `index.html`, and
       only same-page `href="#…"`. It misses details on deep-dive pages, and cross-page `index.html#…`
       links into a details element.
     - (c) No test changes the clone's working tree after check and confirms the excerpt is unchanged.
       The scenario "Code excerpt rendered from Syzygy's read" names this case.
     - (d) No test shows that `reviewCheck` refuses a verdict missing the `blockSupport` entry of a claim
       inside an element. The fixture only shows the passing case with entries supplied via
       `extraSupport`. [Observed] `review-verdict.ts:42` uses `collectBlocks`, so the code does reach
       element claims.
   - Each element carries `id="element-<id>"`, including those nested inside `details`. None is
     linked today [Observed in the index fixture]. A later link to one would break the rule silently,
     which is another reason to widen (b).

7. **note**: `packages/polaris-dossier/src/check-derive.ts:19`
   - Evidence [Observed]: `LABEL_MARKUP` flags more than the spec lists.
     - It flags `>` as well as `<`.
     - It flags any single `*` or `_` at a word edge, not just a *paired* emphasis mark. Examples:
       `Footnote*`, `__init__`, and `_private` at the start of a label.
   - It is stricter than v1.3 ("a `<`, `&` or backtick character, or a Markdown link, image or paired
     emphasis mark"), which fails closed, so this is not a defect. But the finding's detail text and the
     readability guidance should disclose the wider rule. Otherwise an agent cannot know why a plain
     identifier label was refused.
   - Criterion 3: met, conservatively.

8. **note**: `packages/polaris-generation-core/src/closed-schema.ts:107-118`
   - Evidence [Observed]: the shared closed-schema checker now resolves `$ref` arms in its "matches none of
     the permitted forms" message. It also reports against a lone undiscriminated arm.
   - This changes the diagnostic text, and in some cases which errors are reported, for every closed schema
     with a `oneOf`, provider-mode schemas included.
   - The provider golden test pins rendered bytes only (criterion 5 is met: [Observed] the golden passes and
     DOSSIER_THEME_CSS is emitted only when `chrome` is present, `dossier-site.ts:159`). It does not pin
     provider-mode refusal text.
   - [Inferred] Low risk: the provider forms are all discriminated. Disclose the change in the PR body.

9. **note**: the empty cell and review note 11
   - [Observed] An empty cell renders `<td class="empty-cell">no entry</td>`, or a `th` with `scope="row"`
     in a row-header column. It has no marking and no anchor, which matches the owner's choice to keep
     "no entry" for v1.3.
   - [Observed] The Unknown count on a `details` summary (note 2), the fidelity-criteria text (notes 3 and
     11), the code-point length (note 8, pinned by a 121-emoji test) and the path-derived language (note 5)
     are each implemented and tested.
   - [Observed] Note 1's escaping is pinned by `src/markup.c`. Its `</pre>` arm is exercised only as a file
     that screening withholds (`src/tagged.c`), not as an admitted line that renders encoded.
   - Recorded for completeness; nothing to repair.

## Summary by criterion

1. Claim blocks inside elements: met for checking, review and render. The label-quotation rule is missing
   (finding 2).
2. Code excerpt: met for the admitted and excluded arms. The over-60 check is skipped for excluded blobs
   (finding 1).
3. Short labels: length (code points), markup and escaping met. The quotation arm is missing (finding 2).
4. Inert semantic HTML: met [Observed in the fixture for scopes, tone words, "no entry" and the first
   details; Inferred for script and CSP]. Test gaps are in finding 6.
5. Provider bytes: met; the golden passes.
6. Tests: green in the unit tier and in the five integration files I ran. Gaps are in findings 1, 2, 5 and
   6.
