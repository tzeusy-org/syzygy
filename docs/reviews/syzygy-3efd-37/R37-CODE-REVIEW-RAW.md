# R37 code review: system model (REQ-polaris-generation-034 version 2.24), syzygy-3efd.37

Verdict: NOT READY
Reviewed: `git diff 4812826d4..db980e4cb` (origin/agent/syzygy-3efd.37-code), worktree at db980e4cb after `npm ci`
Spec: openspec/changes/dossier-system-model/proposed/polaris-generation/spec.md at origin/main 380a20faa (version 2.24; lines 134-146, scenarios 1354-1430)
Reviewer: fresh-context, read-only

## Summary

[Observed] The code is faithful to 2.24 everywhere I checked it against the text: the schema, all seven new finding kinds with their literal details, their order and their gating; the withheld-end rule of line 138; the derived-relationship rendering of line 140; the shared-element rule; `machine.json` `model`; field-version in v11 and earlier; and a pure migration that check and render never call. Older schemas, v13 and the provider mode keep their bytes, and the provider golden is untouched.

It is NOT READY for one reason: the tests. Two of the seven new finding kinds, `view-shape` and `containment-flat` at a view, are produced by no test. I deleted each of them and the suite stayed green. The PR text says the tests cover "every new finding with its detail and order", and that is false. Several scenario and fixture obligations that the spec lists are also untested (finding 4). The repair is tests only. My probe shows the code already gives the right output (finding 1).

I also found a second spec defect in the parity claim, beyond the withheld-end one that bead .85 already carries (finding 2).

## Checks run

- `npm run check` at db980e4cb: typecheck clean; **Test Files 229 passed (229); Tests 5722 passed | 1 skipped (5723)**. [Observed] This is the unit tier. `system-model.test.ts` is in the integration tier (vitest.tiers.ts:117), so `npm run check` does not run it.
- `npx vitest run --project integration packages/polaris-dossier/src/system-model.test.ts packages/polaris-dossier/src/review.test.ts`: 2 files, 113 passed (system-model 29, review 84). [Observed]
- Provider golden: `apps/three-surface-poc/src/polaris-generation/dossier-render-provider-golden.test.ts` is absent from `git diff --stat 4812826d4..db980e4cb`, so it is untouched. It passes in `npm run check`. [Observed]
- Mutation record: its `subject` sha256 digests, re-computed by script over the db980e4cb bytes, match for all 9 files. The record carries `old`/`new` per mutant and `commit` 2d57e980, which is an ancestor of db980e4cb (the only later commit is the record itself). [Observed]
- `MODEL_PARAGRAPH` (brief.ts) equals the spec's quoted brief v18 paragraph byte for byte, compared by a Python regex extraction (1143 chars). [Observed]

### My three mutants (each applied alone, then restored with `git checkout`)

| # | File | old -> new | Tests run | Result |
|---|---|---|---|---|
| M1 | packages/polaris-dossier/src/system-model.ts:256 | `if (shape.tops > CONTAINMENT_BOUNDS.groups[1] \|\| shape.widest > CONTAINMENT_BOUNDS.children[1])` -> `if (false)` | system-model.test.ts (integration) | **SURVIVED**, 29 passed |
| M2 | packages/polaris-dossier/src/system-model.ts:259 | `if (!shape.nested) out.push` -> `if (false) out.push` | system-model.test.ts (integration) | **SURVIVED**, 29 passed |
| M3 | packages/polaris-dossier/src/draft-schema.ts:219 | `!hasModelForm(version) && !hasWorthKnowingForm(version)` -> `!hasModelForm(version)` | system-model, check, draft-schema, containment-figure tests | **SURVIVED**, 4 files, 423 passed |

None of the three is killed. The task asked me to confirm that each mutant fails; none did, and that is the finding.

### Probe (scratch tests appended to system-model.test.ts, run, then reverted)

- A containment view of six outermost elements gives `view-shape` at `$.diagrams[1].view.elements` with the detail `c1: a containment view shows one to five outermost elements and at most eight inside any one`. Correct. [Observed]
- A flat containment view gives `containment-flat` at `$.diagrams[1].view.elements` with the detail `c1: a containment nests at least one group in another`. Correct. [Observed]
- The `SYSTEM()` draft, with a derived relationship and no citations, gives no RS-17 advisory: `readerAdvice.advisories` is `[]`. Correct. [Observed]
- A v11 draft of six graph diagrams with 37 nodes each (222 nodes) passes check (`passed`). Migrated, it fails with `schema $.model.elements: must hold 0 to 200 items; holds 222` (see finding 2). [Observed]

## Findings

### 1. `view-shape` and `containment-flat` at a view are untested; the PR overclaims [Observed] (severity: blocking)

- Where: system-model.ts:254-259; system-model.test.ts (no test); PR text, "Evidence", first bullet.
- Evidence: no test file contains `view-shape` (grep over packages/ and apps/ `*.test.ts`). The only mention in system-model.test.ts is the comment at line 271, which asserts their *absence*. M1 and M2 survive. The spec's test list (the requirement's test-obligation sentence, SEMANTIC-DELTA "Amended in place") requires "containment views at and past each bound" and lists `view-shape` among the findings whose details are pinned. The 46-mutant record has no mutant on either line.
- Repair: add literal-valued tests for `view-shape` (six outermost elements; and nine children of one element), the boundary passing at five and eight, and `containment-flat` at a view (the probe drafts above work). Add both mutants to the mutation record. Correct the PR sentence "every new finding with its detail and order".

### 2. Second spec defect: the model's bounds break line 142's parity claim for large v10/v11 drafts [Observed] (severity: note, spec)

- Where: spec line 134 (model: 0-200 elements, 0-400 relationships) against line 142 ("For every draft d of schema v10 or v11 that check passes, check passes the migrated draft"). Code: draft-schema.ts `MODEL_BOUNDS`.
- Evidence: v11 allows 20 diagrams of up to 40 nodes and 80 edges each (draft-schema.ts:398-403; `diagrams: list(diagram, 0, 20)`), up to 800 nodes and 1600 edges. The probe draft of 222 nodes passes v11 and fails migrated, with a `schema` finding at `$.model.elements`. Containment groups add to the element count in the same way.
- Repair: no code change; the code follows line 134. Add this case to spec bead syzygy-3efd.85: either narrow line 142 to drafts whose node, group and edge counts fit the model's bounds, or raise the bounds. Qualify the PR's "a migrated draft of unshared elements therefore checks and renders its figures byte for byte" in the same way.

### 3. v13's exclusion from `field-version` is untested [Observed] (severity: should-fix)

- Where: draft-schema.ts:219 (`precedesModel`).
- Evidence: M3 survives. With it applied, a v13 draft carrying `model` or `view` would report `field-version` in place of `schema`, changing v13's finding bytes. Spec line 146 confines the exception to "a draft in schema v11 or earlier".
- Repair: one test: a v13 draft carrying `model` and a diagram `view` keeps its `schema` findings at those paths.

### 4. Scenario and fixture obligations that no test covers [Observed] (severity: should-fix)

- Scenario "Derived relationship stated by Syzygy", second AND, the coverage-partial arm: the item `<repo label> → <src label>: Syzygy could not derive this relation (coverage-partial)`. Scenario "Derived relationship Syzygy cannot derive drawn Unknown" also states partial coverage. The tests exercise `edge-not-inferred` (withheld) and an injected `challenged`, never `coverage-partial`. The harness already supports gitlinks (system-model.test.ts:53).
- Scenario "Shared element in a later containment and a witnessed relationship", second AND: a *cited* relationship that Syzygy finds witnessed, selected by two graph views, renders the witnessed arrow and item in both and never the draft's label or the `as shown in` form. No test has a witnessed relationship in two views. The code orders `witnessItem` before `asShown` (dossier-site.ts:820, 827), so I expect it to hold [Inferred].
- Migration of a v10 draft: `V10` is declared at system-model.test.ts:28 and never used, so no v10 draft is migrated anywhere. The spec's fixture list asks for "every stored draft of schema v10 and v11 migrated". The PR's "Not done here" discloses the stored-draft gap, but not the absence of any v10 case.
- View list bounds: graph view 1-40 elements and 1-80 relationships, and the model's 200/400, have no test. Only the containment minimum of 2 is exercised (line 268).
- Repair: add the three tests above, and a one-line v10 migration case with parity.

### 5. `migratedPath` is dead and untested [Observed] (severity: should-fix)

- Where: system-model.ts:369-396.
- Evidence: a grep over packages, apps, scripts and docs finds no caller and no test. Line 142's path move ("A path into a moved member moves with it") is the parity claim's advisory equivalence. The parity test passes only because the fixture's advisories never sit at a node or edge path; if one did, `readerAdvice` before and after would differ and the test would fail without a move.
- Repair: either use it in the parity test (compare d's advisories, each path moved, against the migrated draft's) with a fixture that has an RS-17 advisory on an edge, or delete it.

### 6. "First figure" ignores the inert-render notice fallback [Inferred] (severity: low)

- Where: dossier-site.ts:771-786 (`figurePage`, `firstFigure`) against dossier-site.ts:846 (the notice returned when `assertInertSvg` throws).
- Evidence: `firstFigure` counts any produced diagram with a page as rendering a `<figure>`. If its SVG fails the inert check, a notice stands in its place. Later figures then link to `#figure-<id>`, which no element carries, and the claim renders nowhere. Spec line 140 says "a notice standing in a figure's place not counting", and its forbidden list includes "a shared element's later item links to a notice or to no `id`". I believe this is practically unreachable, because every text is escaped before the assert.
- Repair: decide figure placement after drawing (render each diagram once and record which ones produced a `<figure>`), or document why the fallback cannot fire for a passed draft.

### 7. Parity test compares parsed structure, not bytes, for three of its members [Observed] (severity: low)

- Where: system-model.test.ts:404-418.
- Evidence: `<figure>` HTML is compared as strings, which are bytes. `figureFit`, `readingLedger` and the `machine.json` `edges`/`figureStructures` are compared with `toEqual` on parsed JSON, so key order is not compared. Line 142 says "byte-identical". Notices in a figure's place are not collected by `figuresOf`, and the fixture has none. Other figure entries of `machine.json`, if any, are not compared.
- Repair: compare `JSON.stringify` of each member, or the raw substrings; add one unresolved-disposition diagram to the fixture.

### 8. Orphaned docstring in local-render.ts [Observed] (severity: low, readability)

- Where: packages/polaris-generation-core/src/local-render.ts:263-275.
- Evidence: the new `LocalModel` interface and its comment were inserted between `LocalEdgeRelation`'s docstring (263) and its declaration (275). The edge docstring now sits above `LocalModel`, which has its own docstring, and `LocalEdgeRelation` has none.
- Repair: move `LocalModel` (and its comment) above line 263, or below the `LocalEdgeRelation` union.

### 9. Relationship findings are skipped when any schema fault touches the relationship [Inferred] (severity: low)

- Where: system-model.ts:202 (`if (!clean(at)) continue;`).
- Evidence: line 136 gates each finding on "the members it reads". `unresolved-reference` at `.from` reads only `from`, but the code skips it if any member of the relationship, its label for instance, has a schema finding. For a `oneOf` relationship the validator probably reports at the relationship path anyway, so the practical effect is small. I did not probe this.
- Repair: gate the end check on `clean(\`${at}.${end}\`)`, or state in a comment why the whole relationship is the read.

### 10. Informational [Observed/Inferred]

- The equivalent mutant `parent-loop-ignored` really is equivalent [Inferred, by reasoning]. Any revisit implies a cycle. A cycle makes the chain infinite, so the step counter passes 2 within three steps and returns `true` either way. A chain with no cycle never trips the reached test. The function returns only a boolean, so no observable output differs.
- Migration is pure and never applied by check or render [Observed]: `migrateDraft` has no caller outside system-model.test.ts.
- The withheld-end exception is pinned [Observed]: system-model.test.ts:510-531 asserts the before and after bytes, with the reasoning in a comment that cites lines 98, 138, 140 and 142.
- VIS-2 [Observed]: an unwitnessed derived relationship's arrow carries `class="edge unknown"` and `data-epistemic="unknown"`, and its title reads `(unknown)`. Its item says "Syzygy could not derive this relation (<reason>)". Observed is given only where `relationOf(e.id).evidence` exists, which means witnessed at render. The derived item carries no `data-epistemic` attribute while the witnessed item carries `data-epistemic="observed"`. The spec does not ask for one; adding `data-epistemic="unknown"` would make the two symmetric. This is optional.
- No script [Observed]: the change adds no `<script>`. The new SVG attributes `data-element` and `data-relationship` are allow-listed in svg-inert.ts and value-checked there. The `as shown in` link text and href pass through `escape`.
- The "one fidelity entry" clause is vacuous here [Observed]: the fidelity verdict carries only `inventoryCoverage`, `inventoryAccuracy` and `blockSupport` (review-verdict.ts:75-77), with no diagram element entries. A shared element therefore cannot get two, and "judged as read with its model parent" has nothing to attach to. The PR discloses the latter.
- Finding details were checked literally against line 136: unresolved-reference (both forms), element-type (both forms), element-parent, relationship-not-derivable, view-duplicate, view-relationship, view-shape, model-unviewed, and field-version (both). All match. The `unit-reference` and `relation-challenged` details substitute "the element" / "the relationship" / "model" for 2.19/2.23's nouns. The spec gives no literal for the first, and its substitutions for the second, so these are consistent.
- The mutation record's subject omits draft-schema.ts, brief.ts and local-render.ts, so no schema-bound mutant was run (see M3 and finding 4).

## Spec-rule map (abridged)

| Spec | Code | Test |
|---|---|---|
| 134 schema v12, bounds, oneOf relationship, view per kind | draft-schema.ts:236-262, 286-318, 245 | containment-minimum only (sm.test 268); others none |
| 136 unresolved-reference (parent, ends, view entries) | system-model.ts:173-181, 204-207, 229-236 | sm.test 206, 435 |
| 136 element-type | system-model.ts:184-189 | sm.test 235, 444 |
| 136 unit-reference at model | system-model.ts:190-193; check-derive.ts:36, 622-623 | review.test 936 (screening only); no check test |
| 136 element-parent (cycle, chain-into-cycle, >2) | system-model.ts:194-196, 285-298 | sm.test 215, 226 |
| 136 relationship-not-derivable | system-model.ts:208-213; relation-witness.ts:332 | sm.test 244 |
| 136 view-duplicate / view-relationship | system-model.ts:238-253 | sm.test 252 / 206 |
| 136 view-shape / containment-flat at view | system-model.ts:254-259 | **none** (finding 1) |
| 136 model-unviewed | system-model.ts:263-279 | sm.test 252 |
| 136 gating beside schema | system-model.ts:169, 184, 237, 254, 263 | sm.test 268 |
| 136 field-version v11 and earlier | system-model.ts:137-145; check-derive.ts 458, 829 | sm.test 275; v13 none (finding 3) |
| 138 decide once; withheld end unknown; relation-challenged | check.ts:120-140; system-model.ts:403-435 | sm.test 261, 453, 461 |
| 140 expansion, derived words, Unknown form, shared rule, machine `model` | system-model.ts:67-129; dossier-site.ts:763-880, 1429-1432 | sm.test 292-362, 533-555; coverage-partial and witnessed-shared none (finding 4) |
| 140 ledger/advice located at first view | check.ts:152-168 | sm.test 472 (advice); ledger not separately |
| 142 migration pure; parity | system-model.ts:320-367 | sm.test 373, 394, 510 (finding 2, 5, 7) |
| 144 brief v18 paragraph | brief.ts:177 | sm.test 425 |
| 146 v11 and earlier, provider unchanged | guards on `hasModelForm`/`local.model` | golden untouched; existing suites |
