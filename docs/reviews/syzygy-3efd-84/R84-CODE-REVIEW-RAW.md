# R84 code review: figure plan (REQ-polaris-generation-034 version 2.33)

Verdict: READY WITH NOTES
Subject: `git diff c68704b74..15440e52c` (branch agent/syzygy-3efd.84), reviewed in a detached worktree at 15440e52c after `npm ci`.
Spec: `openspec/changes/dossier-figure-plan/proposed/polaris-generation/spec.md` at origin/main fbf82476e (lines 230-238 and the twelve 2.33 scenarios from line 1540); 2.36 `polaris-source-example-advice` line 276; 2.37 `dossier-choice-floor`.

## Summary

[Observed] The code conforms to the 2.33 text as I read it, clause by clause: finding kinds, paths, details and order; the `figureAdvice` member shape, ordering and gating; the plan stripped before every other reader; brief v22's three paragraphs byte-equal to the spec. `npm run check` and the touched integration files pass. The notes are test gaps (four surviving reviewer mutants) and one false claim in the mutation record: the recorded "equivalent" mutant is killable.

## Runs

- [Observed] `npm run check` at 15440e52c: 232 test files passed, 5,794 tests passed, 1 skipped, exit 0.
- [Observed] `vitest run --project integration` on brief, check, containment-figure, review and system-model `.test.ts` (the touched integration files): 5 files, 524 tests passed. `cli.test.ts`, `draft-schema.test.ts` and `figure-plan.test.ts` are unit tier and ran under `npm run check`.
- [Observed] Mutation record `docs/evidence/syzygy-3efd-84/figure-plan-mutation-2026-11-28.json`: commit 53b4622c8, 60 mutants, each with `old`/`new`, `killed: true` and a non-empty `failedTests`. The record lists 7 subject files with digests, and all 7 match the bytes at 15440e52c (checked by script). 53b4622c8..15440e52c adds only that JSON file.
- [Observed] `apps/` is untouched by the diff, so `dossier-render-provider-golden.test.ts` is unchanged.

## Spec conformance map (2.33)

| Clause / scenario | Code | Test |
|---|---|---|
| Absent / not-list plan details | `figure-plan.ts:21-25,78-80` | `figure-plan.test.ts:39-43`; `system-model.test.ts` "refuses a v14 draft with no plan" |
| Malformed entry (exact members, place forms, 1-300 code points, white space U+0009-000D/0020, nine kinds) | `figure-plan.ts:41-71` | `figure-plan.test.ts:88-122` (14 cases, 300-cp and NBSP boundaries, all nine kinds) |
| Unresolved `home.target`: no second-entry finding, no home compare, kind still compared | `figure-plan.ts:90-95,105-106` | `figure-plan.test.ts:52-74` |
| Second entry; unplanned places overview → sections → dives in draft order; entry findings first | `figure-plan.ts:93-95,108-115` | `figure-plan.test.ts:45-50,76-85` |
| Planned figure: unresolved / homed / kind, home first; non-`produced` disposition raises nothing | `figure-plan.ts:96-106` | `figure-plan.test.ts:125-150` |
| Plan findings after every 2.32 finding | `check.ts:343-344` | `system-model.test.ts` ("worth-knowing … then figure-plan") |
| No schema finding at or below `$.figurePlan` | `check.ts:210-211` (strip), `draft-schema.ts` `issuedDraftSchema` | `system-model.test.ts` "reports no schema finding at or below a plan of any form" |
| v13 / v12 `field-version` at `$.figurePlan` with the v14 detail | `check-derive.ts` `figurePlanFieldVersionPaths` | `system-model.test.ts` (both v13 and v12) |
| `figureAdvice` shape, `examined`, ordering, three rules | `figure-plan.ts:121-309` | `figure-plan.test.ts:183-313` (scenario fixtures as literals) |
| Advice gated: absent with a schema finding, at v13, for an inventory, on throw | `check.ts:454-458` | v14 with a schema finding and v13: tested. Inventory: by construction (`plan.command === 'check'`). Throw: untested |
| Advice in no record | report-only | `system-model.test.ts` "gates nothing" (check record only) |
| Plan in no page, packet or ledger | `render.ts:178-180`, `review-packet.ts:117`, `rerender-measure.ts:113` | pages: two-plan byte compare; packet: `review.test.ts`; re-render measure: **untested** (finding 3) |
| v14 joins model and worth-knowing; 2.36 and 2.37 advice fire at v14 | `draft-schema.ts` predicates; `check.ts:385` wiring fix | `system-model.test.ts` first v14 test (`choiceFloor`, `sourceExampleAdvice`, `questionKindAdvice`). Callout render: **untested** (finding 4) |
| Brief v22 | `brief.ts` | `brief.test.ts` golden splice; a script compared the paragraph, all 931 chars, byte-equal with the spec quote, and both the containment and model paragraphs occur verbatim in the spec |

[Observed] Wiring fix (`check.ts:385`): the change applies only where `planned !== undefined`, so v14 alone. v12 keeps `viewed.doc` with its v11 schema, and v13 and earlier have no expansion. This matches render (`render.ts:208`), which already keeps the draft's schema. Reviewer mutant `check-expansion-v11` in the record kills a revert.

[Observed] Older schemas: for a non-v14 draft, `withoutFigurePlan` and `figurePlanFindings` are the identity and empty. The only other byte change for older schemas is the unknown-version enum detail, which now names v14. That detail is reached only by a draft of an unknown version, never by a v2-v13 draft. The author disclosed this.

[Observed] Published `draft.schema.json`: `$id` is v14, and `properties.figurePlan` is `{description}` alone. The brief digest changes once, through this document; no other file pins it.

[Inferred] Rendered pages: the render diff adds no markup, only the strip and the re-derived findings, so no script is introduced. Pages under two different plans are byte-identical (test).

## Findings

1. **The recorded "equivalent" mutant is killable; render's re-derivation of the plan findings is untested.** Medium. [Observed]
   - `docs/evidence/syzygy-3efd-84/figure-plan-mutation-2026-11-28.json` `equivalent[0]` (`render-plan-findings-dropped`, `render.ts:199` `findings.push(...planFindings);`).
   - The record's reasoning is that render reads only a passed, digest-verified revision. But render's re-derivation exists for a stored result that is not trusted, and `system-model.test.ts:517-525` already pins the same defence for model findings ("a draft whose check record was altered to passed").
   - I added that test for a v14 draft whose plan omits the overview: check outcome `findings`, then `checks/rev-0.json` rewritten to `outcome: 'passed', findings: []`. Render refuses with `{ stage: 'rederive', reasons: ['figure-plan at $.figurePlan'] }`: it passed at 15440e52c, and it failed with the mutant applied (render then succeeded, `expected null`).
   - Repair: add that test to `system-model.test.ts`, move the mutant from `equivalent` to `mutants`, re-run, and correct the PR's "Equivalent mutant" paragraph.

2. **The per-figure rule order of advisories is untested.** Low-medium. [Observed]
   - `figure-plan.ts:298-306`. Spec: "advisories are ordered by that index and, for one figure, by the rule order above".
   - Reviewer mutant: the `figure-mixed-levels` advisory was moved before the floor advisory. Result: `figure-plan.test.ts` and `system-model.test.ts`, 85 passed, so it survived.
   - The unit tests filter by rule (`rule()`, `figure-plan.test.ts:181`), and the wiring test's two advisories are both floor advisories.
   - Repair: one fixture figure advised by two or three rules, asserting the whole `advisories` array.

3. **The re-render measure's plan strip is untested, and `rerender-measure.ts` has no mutant in the record.** Low-medium. [Observed]
   - `rerender-measure.ts:113` `doc = withoutFigurePlan(doc);`.
   - Reviewer mutant: that line deleted. Result: `rerender-measure.test.ts` and `bounded-readers.test.ts`, 65 passed, so it survived.
   - [Inferred] Without the strip, a v14 draft meets `issuedDraftSchema`, whose object is closed and has no `figurePlan`. Every stored v14 draft would then be refused `why: 'schema'`, which is the behaviour the PR text says it prevents ("the re-render measure … receive the draft without the plan").
   - Repair: a `measureDraft` test over a v14 draft with a plan, plus the file in the runner's subject.

4. **The v14 worth-knowing callout is untested at render.** Low-medium. [Observed]
   - Scenario "Schema v14 joins the system model to the worth-knowing mark" THEN: "the marked paragraph renders in the page's worth-knowing callout where it is lifted". The Case/Observable also asks for the v14 advice and callout "beside the same members' in a v13 draft".
   - Reviewer mutant: `render.ts:966` `hasWorthKnowingForm(doc['schemaVersion'])` replaced by `=== 'polaris-dossier-local-draft-v13'`. Result: `system-model.test.ts`, 47 passed, so it survived.
   - `report.readerAdvice` is asserted only `toHaveProperty('worthKnowing')`, not compared with v13's.
   - Repair: assert the callout region in the v14 render, and compare the v14 `readerAdvice.worthKnowing` and `questionKindAdvice` with the same draft at v13 (less the model).

5. **The field-version path is not pinned to known versions.** Low. [Observed]
   - `check-derive.ts` `figurePlanFieldVersionPaths`.
   - Reviewer mutant: the `LOCAL_DRAFT_SCHEMA_VERSIONS.some(...)` conjunct dropped. Result: system-model, check and draft-schema tests, 433 passed, so it survived.
   - [Inferred] An unknown-version draft carrying `figurePlan` would then get a `field-version` finding in place of its `schema` finding. The spec grants that exception to "v13 or earlier" alone.
   - Repair: one case, a v15 draft with `figurePlan`, expecting the schema finding at `$.figurePlan`.

6. **The published `figurePlan` says "Required." but is not in `required`.** Note. [Observed]
   - `draft-schema.ts` `FIGURE_PLAN_DESCRIPTION`; `draft-schema.test.ts` pins `required` not containing it.
   - This is consistent with the spec: if the member were in `required`, the generic check would report "is required" at `$.figurePlan`, and the spec puts every plan failure in the figure-plan paragraph.
   - But an author validating against the published document alone gets no error for a missing plan.
   - Repair: none required. Optionally have the description say that check, not the schema, enforces the requirement.

7. **The absence of advice on a compute failure is untested.** Note. [Observed]
   - `check.ts:455-457` (try/catch).
   - No test forces a throw, for example through an injected or monkey-patched `figureAdvice`.
   - [Inferred] The branch is probably hard to reach with no schema finding. Leave it as disclosed, or add a seam.

8. **Readability.** Note. [Observed]
   - `check.ts:389`: the existing local `figureAdvice` holds `readerAdvice(...)`, while the new report member `figureAdvice` is built from a variable named `figures`, with the import aliased `computeFigureAdvice`. The same name means two things within 70 lines. Suggest renaming the local to `readerAdviceOfFigures` (or similar) in a follow-up.
   - `check.ts:385`: `planned !== undefined` stands in for "schema v14". Something like `doc['schemaVersion'] === LOCAL_DRAFT_SCHEMA_VERSION_V14` would say what is meant.
   - `rerender-measure.ts:2`: the new import sits between the `node:` imports.
   - `figure-plan.ts:105-106`: `String(figure)`, where `figure` is already known to be a string.

9. **The PR text has moved past the reviewed head.** Note. [Observed]
   - The PR text at the scratchpad path now cites b423e59a5, cd0fb95cb and `figure-plan-mutation-2026-11-28-bounds.json` (the 2.41 migration parity bound).
   - This review is bound to 15440e52c and covers none of those.
   - The PR's line "Check, render, the fidelity packet and the re-render measure all receive the draft without the plan" is true of the code. Its re-render clause is untested (finding 3).

## Out of scope, as briefed

- The spec says the 2.24 migration yields v13. The code yields v12. Not re-examined.

## Reviewer mutants (three requested, five run; all reverted, worktree removed)

| Mutant | Fragment | Tests run | Result |
|---|---|---|---|
| R1 rule order | `figure-plan.ts` mixed-levels advise block moved before the floor advise line | figure-plan, system-model (85) | survived |
| R2 measure strip | `rerender-measure.ts` `  doc = withoutFigurePlan(doc);\n` → `` | rerender-measure, bounded-readers (65) | survived |
| R3 field-version known versions | `check-derive.ts` `doc['schemaVersion'] !== LOCAL_DRAFT_SCHEMA_VERSION_V14 && LOCAL_DRAFT_SCHEMA_VERSIONS.some((known) => known === doc['schemaVersion'])\n    && Object` → `doc['schemaVersion'] !== LOCAL_DRAFT_SCHEMA_VERSION_V14\n    && Object` | system-model, check, draft-schema (433) | survived |
| R4 v14 callout | `render.ts` `...(hasWorthKnowingForm(doc['schemaVersion']) ? { worthKnowing: {` → `...(doc['schemaVersion'] === 'polaris-dossier-local-draft-v13' ? { worthKnowing: {` | system-model (47) | survived |
| R5 recorded "equivalent" | `render.ts` `  findings.push(...planFindings);\n` → `` | reviewer probe test (altered check record) | killed |

At 15440e52c, the reviewer-written probe test for R5 passed against unmutated code.
