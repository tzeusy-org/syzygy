# R-MEA10-RICH-ELEMENTS-9a7a-3
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 9a7a7b94
Subject: syzygy-mea.10.5 rich presentation elements (git diff origin/main...9a7a7b94)

Reviewer: fresh-context confirmation review (round 3).

What I read:
- the whole diff at `9a7a7b94` (19 files);
- the round-2 raw `docs/reviews/R-MEA10-RICH-ELEMENTS-720d-2-RAW.md`;
- the disposition paragraph in `docs/review-campaigns/mea10-dossier-readability.md:17`;
- in worktree `agent-a60460f35604ced66`: the v1.3 `SEMANTIC-DELTA.md`, `proposed/spec.md.patch` and `proposed/design.md.patch`, and the review notes file;
- the v1.2 REQ-034 check list on this checkout (`openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md:236-243`).

What I did not do:
- I edited nothing in the checkout. `git status --short` shows 0 lines after the runs.
- I made no dossier runs and no provider calls, and read no other repository.
- I ran the mutants in a scratch copy made by `git archive HEAD`, outside the checkout.

Checks run:
- [Observed] `npm ci`: exit 0.
- [Observed] `npx vitest run packages/polaris-dossier packages/polaris-generation-core apps/three-surface-poc/src/polaris-generation`:
  - 83 files, 3 failed and 80 passed;
  - 2823 tests: 3 failed, 2819 passed, 1 skipped;
  - all 3 failures are "Test timed out in 5000ms", with the host load average at about 18–28.
- [Observed] Each of the 3 timed-out files passes when run alone:
  - `review.test.ts`: 65 tests;
  - `secret-redaction.test.ts`: 38 tests;
  - `redis-shaped-discovery.test.ts`: 14 tests.
- [Observed] `check.test.ts`, `render.test.ts`, `draft-schema.test.ts` and `closed-schema.test.ts`, run together, pass: 4 files, 204 tests.
- [Observed] `dossier-render-provider-golden.test.ts` passes (1 test). The diff does not touch `dossier-render-provider-golden.json`: `git diff origin/main...HEAD --stat` on it prints 0 lines.
- [Observed] Rule-6 mutants on `packages/polaris-dossier/src/check-derive.ts` at `9a7a7b94`, each run against `check.test.ts` (95 tests):

| Mutant | `old` | `new` | Result |
|---|---|---|---|
| M1 | `if (state.state === 'excluded' && at.endsWith('.citation')` | `if (false && state.state === 'excluded' && at.endsWith('.citation')` | killed (1 failed) |
| M2 | `outcome: screened.outcome, lines: lineCount(raw) }` | `outcome: screened.outcome }` | killed (1 failed) |
| M3 | `\bstates:/iu` | `\bstates:/u` | killed (1 failed) |
| M4 | `outcome: 'not-utf8-text', lines: lineCount(Buffer.from(blob.bytes).toString('latin1')) }` | `outcome: 'not-utf8-text' }` | **survived** (95 passed) |
| M5 | `state.lines !== undefined && end > state.lines` | `state.lines !== undefined && end >= state.lines` | killed (1 failed) |

## Round-2 repair

- [Observed] Round-2 F1 is repaired for content-screened bodies.
  - `check-derive.ts:226-227`: a body that `screenTargetBody` excludes now keeps `lines: lineCount(raw)`.
  - `check-derive.ts:263-266`: a code excerpt whose range ends past those lines gets `range-beyond-blob` at `.citation.endLine`. The finding's detail names no line count.
  - This check runs after the 60-line check (`:257-260`) and before the `admitted` skip (`:267`).
  - `check.test.ts:291-292` pins it: `src/types.ts` has active content and 2 lines, and the excerpt cites lines 1–3. M1, M2 and M5 kill against this test.
  - `check.test.ts:304-310` pins the passing side: types.ts lines 1–2 gets no finding, and the path-excluded `.env` lines 1–5 gets no finding either.
- [Observed] The case-insensitive lead-in (round-2 note 3) is pinned by `check.test.ts:293-294`, and M3 kills against it.

## Findings

1. **note** (a judgment on the path-excluded resolution): `packages/polaris-dossier/src/check-derive.ts:261-267`
   - Evidence [Observed]: no range check runs on a code excerpt of a path-excluded file, because its body is never read (`:213-214` decides the exclusion before `readBlobs`).
   - The v1.3 scenario "Code excerpt over its limit" sets no screening condition: "**WHEN** a code excerpt's citation names more than 60 lines, or lines beyond the end of the blob **THEN** Syzygy reports a repair finding".
   - The v1.2 check it inherits also sets none: "every cited path names a blob at the pinned revision, and every cited line range lies within that blob" (spec.md:239).
   - So the code meets a narrower reading than the text says. A literal reading of that scenario is not met for a path-excluded file.
   - [Inferred] I still judge the resolution sound, and not a merge blocker:
     - Since v1.2 the implementation has range-checked no excluded citation, and the reviews confirmed that.
     - The v1.3 text routes the excerpt through "the rule for a blob that classification or screening excludes ... as to a quotation", and v1.2 reads that rule as unchecked.
     - Path screening exists so that Syzygy never reads the body. Reading it only to count lines would breach the fail-closed posture that SEC-5 and the screening policy set. That is the owner's call, not an implementer's.
     - What renders is Unknown `excluded-content` with no bytes, so no false content and no excluded byte reaches a page.
   - What is missing is the routing. The residual is recorded only in the campaign file (`docs/review-campaigns/mea10-dossier-readability.md:17`).
     - `PENDING-OWNER-DECISIONS.md` has no entry for it (a grep for "path-excluded", "mea.10.5" and "code excerpt" returns 0 lines).
     - Neither does the v1.3 review-notes record.
   - Put it before the owner in the PR body, and either as a v1.4 text note ("lines beyond the blob, for a blob Syzygy read") or as a register question. Do not leave it only in the campaign file.
   - A smaller related point: the withheld excerpt's caption still shows the agent's unverified range ("lines 1–5" of a 1-line file) in Syzygy's own figcaption (`apps/three-surface-poc/src/polaris-generation/dossier-site.ts:333`). It sits inside the Unknown figure, so it is a presentation residual only.
   - Criterion: 2.

2. **note**: `packages/polaris-dossier/src/check-derive.ts:224`
   - Evidence [Observed]: mutant M4 survives. Removing `lines` from the `not-utf8-text` arm leaves all 95 `check.test.ts` tests passing.
   - The commit message and the disposition ("content screening, not UTF-8") both claim the not-UTF-8 arm, but no test pins it.
   - The property that the finding "names no length" is not pinned either: the check-table test strips `detail` before it compares (`check.test.ts:301`).
   - [Inferred] The arm counts lines over a latin1 view of the bytes. That is a reasonable line count for a body that is not text, but it is untested.
   - Add a fixture blob that is not UTF-8, with an excerpt past its end, and assert that the detail carries no digit count.
   - Criterion: 2, 6.

3. **note**: `packages/polaris-dossier/src/check-derive.ts:263`
   - Evidence [Observed]: the new check is limited to `at.endsWith('.citation')`, the code excerpts.
   - An ordinary block citation of a body that was read and then excluded, cited past the body's end, still gets no finding.
   - v1.2's "every cited line range lies within that blob" covers that citation too.
   - This is v1.2 behaviour that the change did not cause. But excerpts and block citations of the same body are now checked differently, and nothing in the code or the disposition says why.
   - Either extend the check or record why it stops at excerpts.
   - Criterion: 2 (adjacent).

4. **note**: round-2 notes still open, carried as the disposition records.
   - Note 2 [Observed]: the `details` fragment-target sweep in `render.test.ts` reads only `index.html`.
     - Every element carries `id="element-…"` (`dossier-site.ts:304`), including elements nested inside a `details`.
     - No `href` names `#element-…`, so by the repository's own definition no fragment target sits inside a `details` today.
   - Note 4: every withholding cause renders one wording, "the file it cites is excluded by screening" (`dossier-site.ts:336`), and no test covers a non-UTF-8 or redacted-line excerpt.
   - Note 5: two tests are still missing:
     - one that changes the working tree after check and shows the excerpt unchanged;
     - one that shows a verdict refused when it lacks an element claim's `blockSupport` entry.
   - Note 8: the shared closed-schema refusal wording changes for every `oneOf` schema, provider-mode schemas included.
   - None blocks a criterion.
   - Criterion: 2, 4, 5, 6.

5. **note** (process, merge order): `packages/polaris-dossier/src/draft-schema.ts:24`
   - Every brief issues `polaris-dossier-local-draft-v3`, and no code path waits for a v1.3 sign-off record.
   - The v1.3 spec bytes are not installed on this checkout, and the P115 install blocker is unresolved.
   - Per the SEMANTIC-DELTA migration plan and "Nothing beyond the acts in force", merge only with or after the v1.3 install.
   - Outside the six criteria.

6. **note** (test tier stability):
   - Evidence [Observed]: under host load, the criterion-6 command gave 3 timeouts at 5000 ms, all in tests outside the element code, and each file passed alone.
   - A single run of that command is not a reliable green. Re-run on a quiet host before quoting it as evidence.
   - Criterion: 6.

## Summary by criterion

1. Claims inside elements: met.
   - [Observed] `contentClaims` (`check-derive.ts:395-414`) reaches table cells (not empty ones), callout and details blocks (recursively), steps, definitions and card bodies.
   - `collectBlocks` uses it for check and review.
   - The fidelity criteria name every element claim and say how a table cell is judged.
   - Each claim renders through `paragraph` with its marking.
2. Code excerpts: met for every body Syzygy read.
   - [Observed] Each excerpt is rendered from `admitted`, entity-encoded, Observed, with an RFC7-10 anchor. An excluded or withheld file renders Unknown `excluded-content` with no bytes.
   - [Observed] More than 60 lines is a finding whatever screening decides.
   - [Observed] Past the end is a finding for an admitted body and for a content-screened body.
   - [Inferred] The not-UTF-8 arm is correct by reading but unpinned (finding 2).
   - The path-excluded residual is sound but unrouted (finding 1).
3. Short labels: met.
   - 120 code points (`draft-schema.test.ts:99`).
   - Quotation and markup findings at the label's path, now case-insensitive for the lead-in.
   - Labels render escaped, with no marking or anchor.
4. Inert semantic HTML: met.
   - Scoped `th`, tone stated in words, "no entry", no `<script`, and the CSP unchanged on every page.
   - No `href`-named target sits inside a `details`.
5. Provider bytes: met. The golden passes and its JSON is unchanged.
6. Tests: met, except that the not-UTF-8 arm is unpinned (finding 2) and round-2 note 5's two tests are still missing. The tier is green when each timed-out file is run alone.
