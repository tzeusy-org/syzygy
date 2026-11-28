# Review: syzygy-3efd.88 figure walks code
Verdict: REVISE
Reviewed commit: fb5596f2151546aae13fd71f90783ea78c356f29
Reviewer: fresh-context general-purpose agent, 2026-11-28

Scope: the delta 7ead38289..fb5596f21 (29 files), and how it composes with the 2.35 base. Governing text: `openspec/changes/dossier-figure-walks/proposed/polaris-generation/spec.md` (2.40 paragraphs at lines 274-282, scenarios after line 1840), `design.md` D1-D11, the AGENTS.md guardrails.

Checks run in a detached worktree at fb5596f21 after `npm ci`:
- [Observed] Targeted vitest: walk.test.ts, dossier-walk.test.ts, brief.test.ts, draft-schema.test.ts, check.test.ts, cli.test.ts, containment-figure.test.ts, system-model.test.ts and dossier-render-provider-golden.test.ts. 9 files, 674 tests, all passed.
- [Observed] walk.browser.test.ts with Playwright Chromium 1223 (`SYZYGY_POC_BROWSER`): 1 passed.
- [Observed] derived-base.test.ts and figure-plan.test.ts: 86 passed.
- [Observed] `npm run typecheck`: exit 0.
- [Observed] `npm run check`: 244 files, 5919 passed, 1 skipped.
- [Observed] `dossier-render-provider-golden.test.ts` is not in the diff; it passes unchanged.
- [Observed] The mutation record's nine subject digests match the files at fb5596f21. fb5596f21 differs from the recorded commit 55ef8f48c only by the record itself.
- Probe tests were written in the worktree only and deleted before it was removed.

## Findings

1. **Blocking.** The walk renders for a deep dive whose disposition is not `produced`, and its `Read step` links then point at nothing on the page.
   - File:line: `apps/three-surface-poc/src/polaris-generation/dossier-site.ts:806-831` (`walkOf` never asks whether the walk's place renders); the call at `:959`; the fall-back that draws the figure on the section page at `:1216`; `packages/polaris-dossier/src/walk.ts:183-208` (`walksAt` never reads the place's disposition).
   - Failure scenario [Observed, probe]:
     - A v16 draft has deep dive `dd` with disposition `{"kind":"omitted",…}` and paragraphs `d1` and `d2`.
     - The produced flow `f` is homed in `dd`, and `dd` walks `f` with steps naming `d1` and `d2`.
     - Check reports `passed`. The spec says a place's non-`produced` disposition "raises no finding".
     - At render, `dd` has no page (`deepPaths` holds only produced dives, `:400-401`), so `f` is drawn on its section's page, `index.html` (`:1216`).
     - `walkOf` draws the layer and the list there. In the probe, `index.html` contains `figure-walk` and `href="#block-d1"` but no `id="block-d1"`, because the omitted dive's paragraphs are not rendered.
   - What the spec says: 2.40 line 278: "A walk renders exactly where … the figure is produced, its place renders the draft's content …; otherwise … the walk renders nowhere and no byte of that page moves for it." This page moves, and it carries links to fragments it does not hold.
   - Suggested repair: render a walk only when its place renders the draft's content. Either have `walksAt` leave out a walk whose section or deep dive is not `produced`, or check it in `walkOf` (a deep-dive-homed figure drawn on a page other than `deepPaths.get(home.id)`). Add a scenario test: an omitted deep dive walking a produced figure homed in it; the section page equals the page rendered without the walk. Add a mutant for the new guard.

2. **Note.** The 1048 px rule is pinned only through its helper, and its call site has no test or mutant.
   - File:line: `dossier-site.ts:811` (`if (!walkableWidth(geometry.width)) return undefined;`); `diagram-layout.ts:579`; `dossier-walk.test.ts:122-124`.
   - What I found:
     - [Observed] Mutant `width-rule-off-by-one` changes the helper. No mutant deletes the call at `:811`, and no test reaches it.
     - [Observed, probe] `diagramNodeBoxes` with `READABLE_SPACING` gives 248 px for 1 to 12 nodes as isolated nodes, a fan and pairs. This agrees with the comment at `dossier-site.ts:217-221` that no operator-agent figure is 1048 px wide.
     - [Inferred] The scenario "A drawing 1048 px wide is walked nowhere" cannot be built through the real layout. Testing the helper alone is therefore a reasonable decision, not a defect.
   - Failure scenario: a later layout change makes 1048 reachable and the guard at `:811` is deleted; no test fails.
   - Suggested repair: add a mutant that deletes the `:811` guard and record it as equivalent while the layout cannot reach 1048, with this reason. Or cover the call site through an injected layout width. Record the residual where the spec scenario is cited.

3. **Note.** Reading the spec's `\"` as an escape is right in substance, but the spec bytes and the brief bytes now differ.
   - File:line: spec line 280 (12 occurrences of `\"`, the only ones in the file); `packages/polaris-dossier/src/brief.ts` `WALK_PARAGRAPH`; `brief.test.ts` comment "its quotation marks unescaped".
   - What I found:
     - [Observed] Every earlier brief paragraph the spec quotes writes bare `"` inside its quotation. The hero paragraph, for example, reads `` `{"figure": "<diagram id>"}` ``.
     - [Inferred] A brief that shows `{\"figure\": …}` inside a Markdown code span would print the backslashes to the authoring agent, so the escape reading is the only sensible one.
   - Failure scenario: a checker or later reviewer compares the brief with the spec's literal paragraph (the 2.40 Oracle fixes the paragraph "as literals") and finds 12 bytes of difference that no record explains.
   - Suggested repair: correct the spec text to bare quotes as an ordinary agent adoption, with an `AGENT-ADOPTIONS.md` row. Or state the escape reading in `design.md` beside D1, so the difference is recorded rather than inferred.

4. **Note.** The box-link arm for a citation with no source page cannot be reached, so the spec's `queue` case cannot be tested.
   - File:line: `dossier-site.ts:818` (`target === undefined`); `dossier-site.ts:536-537` (`refs` throws `unquotable-source` for any citation absent from `sourcePaths`).
   - What I found:
     - [Observed] Every non-shared node's list item calls `refs(from, n.sourceIds, n.id)`. A node citing a file with no source page therefore fails the whole render before any box is drawn.
     - [Observed] The only other path is a shared element in a later figure, whose first figure calls `refs` for the same `sourceIds`.
     - The scenario "Each box links to the lines its first citation cites" names `queue`, "a node [citing] a file that has no source page". That case cannot be built, and no test covers it.
     - [Inferred] Keeping the arm as a defensive guard is acceptable, because it fails toward no link.
     - `first === undefined` is also untested: no test has an element with zero citations, such as an Unknown element.
   - Suggested repair: record the `queue` case as unreachable at this version, with this reason, beside the mutation record's equivalents. Add a case for a node with no citation, if the schema admits one.

5. **Note.** Ids unique across the whole site: the author's residual is not a real defect.
   - What I found:
     - [Observed] The walk adds ids only inside `walkOf`, on the page that draws the walked figure. Each diagram renders as a `<figure>` once (`figurePage` gives one page).
     - [Observed] `dossier-walk.test.ts:60-67` and `walk.test.ts:281-294` assert that only the walked page, `size-report.html` and `size-report.json` change. Every other page keeps its bytes, and with them its id set.
     - [Observed] Walk ids are `walk-<diagram id>-<n>` with distinct diagram ids, so no walk id repeats across pages either.
     - [Observed] No other id site that the renderer derives from draft identities is unprefixed on a walk page: `section-`, `figure-`, `block-`, `subsection-`, `deep-dive-`, `element-` and `term-`. So the `walk-` prefix rule holds.
     - [Observed] The spec's Falsifier is per page: "an id is carried twice on a page".
   - Suggested repair: none needed. Optionally, state this argument in the residual so it does not read as an open gap.

6. **Note.** The two equivalent mutants are equivalent at this commit.
   - `check-walks-not-stripped` (`check.ts:216`):
     - [Observed] `deriveFindings` strips walks itself (`check-derive.ts:133`).
     - [Observed] Every other reader after the strip reads named members: `sessionId`, `executions`, `clarifications`, hero, containment, model and views, plan, advice.
     - [Observed] The v16 schema document admits any `walk`.
     - [Inferred] No test can observe the strip today, so the mutant is equivalent. It is a redundant guard, kept so that a later reader cannot see a walk; the record's reason says the same.
   - `base-box-linked`:
     - [Observed] `derived-base.ts:432` writes `citations: []` for every base element, so a base node's `sourceIds` is empty and `first === undefined` already withholds the link.
     - [Inferred] It is equivalent while that line stands.
   - Suggested repair: none. If `derived-base.ts:432` ever carries a citation, the `isBase` arm becomes the only guard, so pin it then.

7. **Note.** Branches with no test or mutant at this commit:
   - `walk.ts:50`, `!Array.isArray(walk['steps'])`. A `steps` object such as `{"length": 3}` is untested. Without the guard, `for…of` throws and check crashes rather than reporting the malformed finding.
   - `walk.ts:58`, `typeof element['map'] === 'string'`. The base end `{"map": 7, "path": "x"}` is untested. Without the check, it reads as a well-formed base end and gets the element finding instead of the malformed one.
   - `walk.ts:86`, the clause for a known version. A `walk` in a draft of an unknown version (for example v17) keeps its `schema` finding; no test.
   - `walk.ts:134` and `walk.ts:199`, `named.length === 1`. A unit path naming several packages, with no `#k`, is untested at check and at render.
   - `walk.ts:134`, a base end naming an element the view hides. [Observed, probe] It gives the correct "names no element drawn" finding, but the spec's Case line lists this case ("one it hides") and the suite has no test for it.
   - `walk.ts:197`, `resolved.spec.map === step.element.map`. A base end over another map at render, with the map unestablished at check, is untested. So is `walk.ts:199` `resolved.shown.includes`, a hidden element at render.
   - `walk.ts:201`, the `seen.has(node)` arm alone (a repeated base element found only at render). Mutant `render-partial-walk` changes both disjuncts together.
   - `walk.ts:117-121`, the `nodes` arm of `drawnIdentities`. [Inferred] It is unreachable for a v16 draft (model form).
   - `dossier-site.ts:811`; see finding 2.
   - `dossier-site.ts:818`, the `first === undefined` and `target === undefined` arms; see finding 4.
   - `review-packet.ts:118` and `rerender-measure.ts:115`, `withoutWalks`. No test or mutant. Without the strip, a walk would reach the fidelity packet, against 2.40 line 274: "A walk enters no claim count, claim list, fidelity entry …".
   - Suggested repair: add the cases above to `walk.test.ts`, and add a fidelity-packet test showing that a v16 draft's packet holds no `walk`.

8. **Note.** Some expected values in the conformance tests are read from the renderer's output, not written as literals.
   - File:line: `walk.test.ts:243-247` (`rectStyle`) and `:236-240` (`citeHref`), used at `:327-336`, `:351` and `:364-366`.
   - What I found:
     - [Observed] The first scenario (`:270-272`) and `dossier-walk.test.ts:13-19` pin every box as a literal.
     - The `Each box links …` and `A step names a base element` cases take the expected box position from the rendered SVG's own `rect`. 2.40 Oracle: "each box's position taken by hand from the layout's literal constants".
     - Comparing the `href` with the list's link is what the spec asks, but the expected `href` is never written as a literal there either; only a regex (`#L2$`) is checked.
     - [Inferred] The `called`-line offset is still pinned as a literal (`dossier-walk.test.ts:114-120`), so the gap is small.
   - Suggested repair: write the base box and the `Log`, `Server` and withheld boxes as literal styles. Write at least one `href` as a literal path and fragment.

9. **Note.** Mutation run 2 did not run the browser test.
   - File:line: `docs/evidence/syzygy-3efd-88/walk-mutation-2026-11-28.json`, `baselines`.
   - What I found:
     - [Observed] The baselines count 25 tests for the `dossier-site.ts` and `diagram-layout.ts` groups (10 + 15) and 10 for `dossier-walk.ts`. That is the count without `walk.browser.test.ts`.
     - So the four style mutants (`target-solid`, `target-on-hover-only`, `layer-not-relative`, `layer-takes-pointer`) were killed only by the literal `STYLE` string compare, never by the browser's computed `:target` outline or Tab order.
     - [Observed] The runner's header says this is recorded "by its test count", which is honest but easy to miss.
   - Suggested repair: state "browser test not run (no Chrome)" in the record's summary, or re-run the style group with `SYZYGY_POC_BROWSER` set. The browser test passes here with Chromium 1223.

10. **Note.** A walked figure loses the drawing's SVG `<title>` tooltips, and the spec does not disclose it.
    - File:line: `dossier-walk.ts` (`.walk-node{…pointer-events:auto…}` on every box, linked or not).
    - [Inferred] Every node box takes the pointer, so the drawing's per-node `<title>` tooltip (for example "Client (inferred)") no longer appears under the pointer on a walked figure. The spec and D7 disclose only that the `g.node:hover` emphasis gives way.
    - Suggested repair: give `pointer-events:auto` only to boxes holding a `walk-source` link, if hover outlining of unlinked boxes is not needed. Or add "and its tooltip" to the D7 and D9 residual.

11. **Note.** The browser test does not turn scripts off.
    - File:line: `walk.browser.test.ts:24-48`.
    - [Observed] The page carries no script (`document.scripts.length === 0`) under the pages' CSP. The harness drives focus by `Runtime.evaluate` and never sets `Emulation.setScriptExecutionDisabled`.
    - [Inferred] The scenario's "with scripts off" is met in substance, because nothing on the page could run.
    - The CDP guardrails are respected: `launchBrowser` enables focus emulation (`cdp-browser.ts:653`) and passes `--disable-ipc-flooding-protection` (`:581`), and the hash starts empty, so no re-navigate is needed.
    - Suggested repair: optional. Disable script execution for the page before navigating and keep the harness's evaluate calls, so the scenario's condition is literal.

12. **Note.** `walk.ts` keeps its own copy of the seven presentation kinds.
    - File:line: `walk.ts:22` (`PRESENTATION_KINDS`) beside `check-derive.ts:29` (`ELEMENT_KINDS`). The two sets are equal today [Observed].
    - Failure scenario: a later presentation kind added to the schema and to `ELEMENT_KINDS` but not here becomes nameable as a step's paragraph. Its `#block-` target would not exist, since elements take `element-` ids or fold.
    - Suggested repair: export one set and import it in both places.

## Acceptance criteria, in brief

1. SHALLs and scenarios: all implemented except finding 1. The 1048 px scenario (finding 2) and the `queue` arm (finding 4) cannot be built; finding 7 lists the untested cases.
2. Screening [Observed]:
   - Every walk finding detail is a fixed string carrying a resolved diagram, element or block identity, or a step index. A base-end step is named only by `` `walk.steps[<k>].element` `` (`walk.ts:164`); the test at `walk.test.ts:368-375` pins it.
   - The page writes node labels the list already shows, Syzygy's base label (probe: `src/ (40 files)`; test: `api`, never `Core`), ids from diagram handles and numbers, and `href`s from the same `href`/`lineFragment` the list uses.
   - An unresolved base step drops the whole walk (`walk.ts:201`).
   - No page carries a script. Secret detection and SEC-5's fail-closed rule are untouched.
   - The render's refusal reasons carry only kind and path.
3. Byte stability [Observed]:
   - The provider golden is unchanged and passes.
   - `walks` is set only for v16 drafts (`walk.ts:185`), and the existing render suites pass.
   - Pages without a walk do not change (`dossier-walk.test.ts:60-74`).
   - The brief changes only by the version line, the schema line and the walk paragraph (`brief.test.ts`, spliced against the v10 golden).
   - The exception is finding 1, where an unwalkable place still moves its section's page.
4. Accessibility and HTML: site-wide id uniqueness is not a defect (finding 5). The `:target` outline is dashed, 3px, and only on the target box [Observed, browser]. No walk target lies in `<details>` [Observed, browser]. Finding 1 is a dangling-fragment defect.
5. Recorded decisions: `\"` as an escape, accepted, but record it (finding 3). The 1048 helper, accepted, but add the call-site mutant or residual (finding 2). The unreachable arm, accepted, but record it and fix the scenario's `queue` case (finding 4).
6. Literals: partly (finding 8).
7. Rigor:
   - 56 of 56 killed, and the subject digests match.
   - Both equivalents hold (finding 6).
   - The browser test did not run in the mutation run (finding 9).
   - Finding 7 lists the untested branches.
8. Correctness: finding 1. No other correctness bug found.
