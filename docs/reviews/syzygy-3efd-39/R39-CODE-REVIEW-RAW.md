# Review: syzygy-3efd.39 view levels code
Verdict: REVISE
Reviewed commit: 26e15b7b0bc91be19c0d008d0128daac6c77e434
Reviewer: fresh-context general-purpose agent, 2026-11-28

Scope: diff `55b963d20..26e15b7b0` (merge base with origin/main), read against REQ-polaris-generation-034 version 2.50 as written in `openspec/changes/dossier-view-levels/proposed/polaris-generation/spec.md` (its six added paragraphs and twelve scenarios) and `design.md`.

Checks run in a detached review worktree after `npm ci`:
- [Observed] Targeted vitest: `view-level.test.ts`, `dossier-zoom.test.ts`, `brief.test.ts`, `draft-schema.test.ts`, `walk.test.ts` and `dossier-render-provider-golden.test.ts`. 150 passed, 1 skipped. The skip was `zoom.browser.test.ts`, because no browser was on PATH.
- [Observed] `zoom.browser.test.ts` and `walk.browser.test.ts` with `SYZYGY_POC_BROWSER` set to the Playwright chromium-1223 build: 2 of 2 passed.
- [Observed] `npm run typecheck`: rc=0.
- [Observed] The wider suite, `vitest run packages/polaris-dossier apps/three-surface-poc/src/polaris-generation`: 143 of 152 files ran (9 skipped), with 4521 tests passed, 26 skipped and 1 failed. The one failure was the reviewer's own browser probe, run without `SYZYGY_POC_BROWSER` set; it passes with that variable set (finding 6). Two other reviewer probe tests are among the 4521 passed, so the branch's own tests show 4519 passed, 26 skipped and 0 failed.
- [Observed] `git diff --quiet 55b963d20 26e15b7b0 -- apps/three-surface-poc/src/polaris-generation/dossier-render-provider-golden.test.ts` exits 0, so the golden is unchanged.
- [Observed] The `LEVEL_PARAGRAPH` in `brief.ts` equals, byte for byte, the quoted paragraph in the spec's brief-v25 sentence (Python comparison, 1202 = 1202 chars, equal).
- [Observed] The mutation record's recorded commit `461ce95f0` differs from the reviewed commit only in `docs/evidence/syzygy-3efd-39/level-mutation-2026-11-28.json`, so its source digests describe the reviewed sources.

Probe tests were written only in the worktree, and the worktree was removed afterwards.

## Findings

1. **Blocking: the `render-rederive-levels-dropped` equivalent is not equivalent. The defence it removes has no test.**
   - Location: `packages/polaris-dossier/src/render.ts:215` (`findings.push(...levelFindings(walked, findings, {}));`); `docs/evidence/syzygy-3efd-39/level-mutation-2026-11-28.json`, entry `equivalent[6]`.
   - The recorded reason is that "a draft that check passed has no level finding". That ignores the case this re-derivation exists for: a check record altered to `passed`. Sibling suites already test that case: `system-model.test.ts:569` and `:825` ("refuses at a render a draft whose check record was altered to passed…").
   - [Observed] Reviewer probe: a v17 draft with a `view-level` finding (`parts`, container view selecting module `router`). Its `checks/rev-0.json` was rewritten to `outcome: 'passed', findings: []`.
     - Unmutated, `renderRun` refuses at `rederive`, naming `view-level at $.diagrams[1].view.elements[1]`.
     - With line 215 deleted by hand in the scratch worktree, the same probe renders the site (`expected 'rendered' to match /^rederive: …/`), while all 14 tests of `view-level.test.ts` still pass.
     - So the mutant survives the suite, and the record's "49/49 killed, 7 equivalent" is really 49 killed, 6 equivalent and 1 survivor.
   - Failure scenario: a tampered or stale check record lets a draft whose views break their level, or show parts outside their scope, render. No test would notice the re-derivation being dropped.
   - Repair: add the altered-record test to `view-level.test.ts`, in the pattern of `system-model.test.ts:569`. Move the mutant from `equivalent` to `mutants` and re-record. The 2.40 walk suite has no such test either (`walk.test.ts`; not this change's scope, noted only).

2. **Blocking: a `view-scope-outside` detail can name a scope that is not a handle. This breaks "every identity a detail names is a handle".**
   - Location: `packages/polaris-dossier/src/view-level.ts:133-161`, with the detail built at `:161` from `scope` and `LEVEL_DETAIL.outside` at `:39`.
   - `index.elementById` (`system-model.ts:35`) indexes every string id, including ids that fail the handle schema. A scope that names such an element therefore "resolves", skips the handle test at `:134`, and is copied verbatim into the `outside` detail.
   - [Observed] Reviewer probe:
     - Model: element `src/app.ts` of type `system` (schema finding at `$.model.elements[0].id`), `api` a package with no parent, and `user`. View `parts` is `container` / `src/app.ts`.
     - Check reports `view-scope-outside` with detail `parts: api lies outside src/app.ts, the element this view is about`.
     - The 2.50 text says "every identity a detail names is a handle, and no detail names a base path".
   - [Observed] Context: the 2.24 `model-unviewed` finding in the same run already names `src/app.ts` (`src/app.ts: every element and relationship of the model is shown by at least one view`). The leak class is therefore pre-existing, but this change adds a new sink for it, against its own SHALL.
   - Failure scenario: a draft writes a path, or worse, as an element id and uses it as a scope. The string enters the check record and report through a 2.50 detail.
   - Repair: do not compute this view's findings when the scope element's `id` has a schema finding (`touched(\`${entry.at}.id\`)`). Alternatively, name the scope by the handle test, as `:134` does for an unresolved one. Add the probe as a literal test. The `model-unviewed` precedent is worth a separate bead.

3. **Note: the 1048 px clause of the scenario "Zoom links and a walk share one layer" has no test, and as written cannot have one.**
   - Location: spec scenario AND clause ("in a second draft a layout supplied to check draws `ctx` 1048 px wide … its list item for `app` still ends with the `zoom-text` link"); code at `dossier-site.ts:819` (`walkableWidth`) and `:1087`.
   - [Observed] The render lays out every operator-agent graph with `READABLE_SPACING`, a stacked column (`STACK_COLUMN = 261`, `diagram-layout.ts:41`). A layout "supplied to check" is a figure-fit input that the render never draws.
   - [Observed] A containment is at most `40 + 184·5 = 960` px (`diagram-layout.ts:612,626`).
   - So the equivalents `graph-layer-on-1048` and `containment-layer-on-1048` are equivalent [Inferred, from those constants]. The scenario clause, however, is a spec defect that the PR does not list among its departures.
   - Repair: record it as a fourth erratum next to the three the PR names. Optionally, pin `walkableWidth` gating for zoom-only layers in a renderer-level unit test that calls `walkOf` with a 1048 geometry, if a seam exists.

4. **Note: a zoom target the inertness guard turns into a notice refuses the whole render; the text says it is passed over.**
   - Location: `apps/three-surface-poc/src/polaris-generation/dossier-site.ts:1586`.
   - The spec says a target is the first own view "whose figure renders as a `<figure>` … a notice standing in a figure's place not counting, so that … a view of the element whose figure renders … as a notice [is] passed over". The code chooses targets before drawing (`:886-895`) and throws if one became a notice. `render.ts:275` turns that throw into a clean `render` refusal.
   - [Inferred] It is unreachable for a checked draft (escaped labels always pass `assertInertSvg`), which is why `target-guard-dropped` is recorded as equivalent. That reasoning is sound. The behaviour is still a departure: fail-closed refusal instead of passing over.
   - Repair: record it as a departure in the PR body, or choose targets after drawing.

5. **Note: the departures the PR records are real spec defects, and the substitutions are faithful.**
   - [Observed] Href. `href()` (`dossier-site.ts:116-119`) writes `../` per directory level, the 2.24 "as shown in" form the normative paragraph cites ("as version 2.24 writes the address of an element's first figure"). From `deep-dives/storage.html`, `../deep-dives/runtime.html#figure-parts` and the scenario's `runtime.html#figure-parts` resolve to the same URL. The scenario's literal contradicts its own paragraph, and the code follows the paragraph. Faithful.
   - [Observed] Overview walks. A walk belongs to a section or a deep dive (2.40, `walk.ts`, and the brief's walk paragraph), so "the overview … carries a walk" cannot be written. Homing `ctx` in section `s1`, which renders on `index.html`, keeps the scenario's page, wrapper and order assertions intact. Faithful.
   - [Observed] Collapsible section. No figure of this renderer is drawn inside `<details>`. The `<details>` producers are at `dossier-site.ts:687, 722, 1003, 1094, 1135, 1180, 1491, 1858` and none wraps a `<figure>`. That makes the scenario's `hidden` arm vacuous. The substitutes cover the arm the text can actually reach, a notice in the figure's place: an omitted view (`view-level.test.ts:465`) and a base-not-drawn notice (`:482`). Faithful.
   - Gap: nothing pins the invariant "no `id="figure-…"` inside a `<details>`" that the comment at `:882-883` relies on. A future change that nests figures would silently make collapsed figures zoom targets.
   - Repair: add a page-wide assertion over a rendered fixture that no `<details>` contains `id="figure-`.

6. **Note: the pass-through precedence on a mixed page is asserted only as CSS bytes, never in a browser.**
   - Location: `zoom.browser.test.ts` renders `zoomInput()`, a page with no walk. There `.walk-node:hover` is absent, so its `outlineStyle === 'none'` assertion holds trivially.
   - [Observed] Reviewer browser probe: `figureLayerCss(true, true)` with a walked and a `zoom-only` wrapper on one page. `elementFromPoint` over the zoom-only box returns the drawing's `rect`, and over its zoom link returns `zoom-link`. Over the walked box it returns `walk-node`.
   - [Inferred] The outline override holds by specificity: `.zoom-only .walk-node:hover` (0,3,0) beats `.walk-node:hover` (0,2,0), and it comes later in the sheet.
   - Repair (optional): extend the browser test with a page that also holds a walk (`zoomInput(true)` plus a second, unwalked figure).

7. **Note: `level`/`scope` schema findings are emitted after every 2.49 finding, out of path order with the draft's other `schema` findings.**
   - Location: `view-level.ts:127-131`.
   - The text orders this version's four kinds explicitly. For the `schema` findings at `level` and `scope` it says only that they are findings, so this is a defensible reading [Inferred].
   - Repair: state the order in the PR's decisions, next to the recorded `alone` detail wording.

8. **Note: `field-version` is reported for `level`/`scope` under any diagram kind's `view`.**
   - Location: `view-level.ts:45-49,68-72`. `levelledViews` does not filter by `isViewKind`, unlike `levelFindings` (`:123`) and `viewLevelsAt` (`:173`).
   - [Inferred] In a v12, v14, v15 or v16 draft, a sequence or swimlane diagram carrying a `view` with `level` would get two `field-version` findings beneath a `view` that is itself a schema finding. That is harmless, but it is not "a view of a graph or containment diagram".
   - Repair: filter with `isViewKind` in `levelledViews`, or document the behaviour.

9. **Note: untested branches, by line.** [Observed by reading the tests and the mutant list; none of these is named by a killed mutant.]
   - `view-level.ts:86`, the `units` arm (`element.unitFact ?? 'package'`), and `derived-base.ts:95`, the `unitFact` assignment. No test runs a levelled view over a `units` base, so a `module` fact typed `package` would pass.
   - `view-level.ts:115`, the `unresolved-reference`-at-`parent` disjunct of `parentFault`. Only `element-parent` is tested (`view-level.test.ts:357`).
   - `view-level.ts:150`, `baseBlocked` (a `base-reference` or `base-conflict` finding suppresses `view-level` at `base`). No test.
   - `view-level.ts:140`, `view-scope` skipped when the scope's `type` has a schema finding (`scopeType === undefined`). No test.
   - `view-level.ts:97,99`, the unknown-parent and cycle exits of `below`. [Inferred] These are unreachable once `parentFault` gates the walk, so they are defensive only.
   - `view-level.ts:57`, a non-record diagram in `withoutLevels`. No test.
   - `render.ts:215`, as in finding 1.
   - `dossier-site.ts:1586`, as in finding 4 (unreachable).
   - Spec rule without a test: the 1048 px clause (finding 3). Every other 2.50 scenario has a literal test. The keyboard, focus-outline and follow-to-target clauses are covered by `zoom.browser.test.ts`, which passed here with a browser supplied.

10. **Note: the other recorded equivalents check out.**
    - `derive-levels-not-stripped`: the only callers of `deriveFindings` are `check.ts:239` and `render.ts:203`, both stripped first, and `verify-text.ts:328`, which passes a synthetic subject [Observed by grep]. Equivalent.
    - `field-version-in-v17`: `levelFieldVersionPaths` and `levelFieldVersionFindings` are read only in `check-derive.ts:853,907`, on the stripped subject [Observed by grep]. Equivalent.
    - `base-node-zoomed`: base fact ids start with `_` (`derived-base.ts:30`). `SOURCE_ID_PATTERN` is `^[A-Za-z0-9]…`, and an element `id` is a `handle` (`draft-schema.ts:522`). A scope resolves only against model elements, so no base id is a target key [Observed]. Equivalent.
    - `graph-layer-on-1048` and `containment-layer-on-1048`: see finding 3. Equivalent.
    - `target-guard-dropped`: see finding 4. Equivalent as unreachable.

## Criteria summary

- **1. Spec coverage.** Every SHALL is implemented. The exceptions are the departures in findings 2, 4 and 7. Every scenario is tested except the 1048 px clause (finding 3).
- **2. Departures.** All three recorded departures are real spec defects, and each substitution is faithful (finding 5).
- **3. Zoom targets.**
  - [Observed] Zoom targets are level-aware. A context view is never a target (`dossier-site.ts:890`). The first own view in draft order that renders wins (killed mutants `last-own-view-wins` and `context-view-a-target`).
  - [Observed] No figure links to itself (`:902`).
  - [Observed] No link dangles for an omitted view, a notice or an unestablished base.
  - [Observed] A zoom-only figure carries its own three rule sets.
  - [Inferred] Walk rules cannot reach a zoom-only box (finding 6).
  - [Observed] Level constraints are check findings.
- **4. Screening.**
  - [Observed] No `<script>` appears on any page.
  - [Observed] No draft text reaches a page beyond labels and titles already rendered.
  - [Observed] No secret detector or SEC-5 path changed.
  - Exception: finding 2, a non-handle scope in a detail.
- **5. Bytes.**
  - [Observed] The golden is unchanged.
  - [Observed] A v17 draft without levels renders as v16, and a v16 page keeps `WALK_FIGURE_CSS` byte for byte (`figureLayerCss(walk, false)`).
  - [Observed] The brief differs only in its version line, its schema line and `LEVEL_PARAGRAPH`.
- **6. Literals.** [Observed] Conformance values are literals.
- **7. Mutation evidence.** 6 of the 7 equivalents hold. `render-rederive-levels-dropped` survives (finding 1).
- **8. Correctness bugs.** Finding 2. No other correctness bug was found.
