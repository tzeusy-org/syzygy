# R39 code review: dispositions

Review: `R39-CODE-REVIEW-RAW.md` in this directory, verdict `REVISE` (line 2), over `26e15b7b0`. One round; no confirmation review follows (D10).
The repairs are in commit `afdfeb969`, after merging `origin/main` (`c7df47158`); the mutation record is `docs/evidence/syzygy-3efd-39/level-mutation-r39-2026-11-28.json` (55 of 55 killed at `afdfeb969`, none by timeout, six equivalents recorded with reasons; both browser tests passed in each of the two baselines that list them). Run 2, the record the review read, stays at `level-mutation-2026-11-28.json`, the path the raw cites.

## 1. Blocking: `render-rederive-levels-dropped` is not equivalent

Repaired.

- A test in `view-level.test.ts` ("refuses at a render a v17 draft whose check record was altered to passed…", the review's own probe) checks a container view `parts` over `api` and `router`, rewrites the run's revision-0 check record to `passed` with no findings, and renders. The render refuses at `rederive` with exactly `view-level at $.diagrams[1].view.elements[1]`, the pattern of `system-model.test.ts`'s altered-record test.
- The mutant moved from the runner's `EQUIVALENT` list to its mutants and was run: killed, by that test alone.
- The recorded reason was wrong. It assumed check and render read the same frozen record; an altered record is exactly the case where they do not.

## 2. Blocking: a `view-scope-outside` detail can name a non-handle scope

Repaired.

- `levelFindings` (`view-level.ts`) now skips a view whose scope element's own `id` has a finding at `$.model.elements[j].id`, after the resolution check and before any finding that names the scope. So no detail of this version copies an identity that is not a handle.
- Test "names no scope whose element's identity is not a handle…": an element `src/app.ts` that a container view takes as its scope gives the schema finding at its `id` and no finding of this version; the same view about `app` gives the `view-scope-outside` finding as before.
- Mutant `scope-identity-unchecked`: killed.
- The older 2.24 `model-unviewed` finding has the same leak (`system-model.ts:329` and `:333`: `${id}: every element and relationship…` for any string `id`, handle or not). It is outside this change and is reported to the lead for its own bead; it is not repaired here.

## 3. Note: the 1048 px clause cannot be tested

Recorded as a departure and a spec erratum, in the PR body. The lead folds it into the levels erratum (the bead with the href, overview-walk and collapsible-section items).

- `graph-layer-on-1048` and `containment-layer-on-1048` stay in `EQUIVALENT` with their reasons. The guard is the shared `walkableWidth`, pinned at 1047, 1048 and 1049 by `dossier-walk.test.ts`.

## 4. Note: a target that became a notice refuses instead of being passed over

Recorded as a departure in the PR body, and as an erratum for the lead. The code keeps the fail-closed refusal: it is unreachable for a checked draft (`target-guard-dropped` stays equivalent, with the review's agreement in its finding 10), and choosing targets after drawing would reorder the render for no reachable case.

## 5. Note: no test pins "no figure inside a `<details>`"

Repaired. Test "draws no figure inside a collapsible section on any page of a levelled site" renders the zoom fixture and asserts that no `<details>` element on any page contains `id="figure-`, and that at least one `<details>` was seen, so the sweep is not vacuous.

## 6. Note: pass-through on a mixed page is asserted only as bytes

Repaired. `zoom.browser.test.ts` gains a second case over `zoomMixedInput()` (`dossier-reading.testkit.ts`): the walked `flow` and an unwalked `more` drawing the same element `b` on one page. In Chrome, `elementFromPoint` over a walked box returns that box (`walk-node` in `figure-flow`); over the unlinked box of the zoom-only layer it returns the drawing (`svg` in `figure-more`); over `more`'s zoom link it returns the link.

- Mutant `pass-through-unscoped` (the pass-through rule applied to every layer, walked or not): killed, by the new browser case and the literal style test. The runner now requires both browser tests to pass in each baseline that lists the file.

## 7. Note: the order of the `level`/`scope` schema findings

Recorded in the PR body's decisions (decision 2, now naming the review): these `schema` findings come at the start of each view's 2.50 findings, after every 2.49 finding, not in path order among the draft's other `schema` findings. The text orders only this version's own kinds. Not changed.

## 8. Note: `field-version` under any diagram kind

Repaired. `levelledViews` now reads only diagrams for which `isViewKind` holds, as `levelFindings` and `viewLevelsAt` already did. Test "reports no field-version at a level or scope under a diagram of another kind" gives a v16 draft a sequence diagram whose `view` carries both members and finds no `field-version`. Mutant `levelled-any-kind`: killed.

## 9. Note: untested branches

Each reachable branch now has a test, and a mutant where it had none. Line numbers are the raw's, at `26e15b7b0`.

- `view-level.ts:86` and `derived-base.ts:95`, the units arm: a tree with one npm package and one Go module (fixture policy admits `.mod` for this tree). A container view over the units base finds the module (`… shows no element of type module`), a context view finds the package, and a component view finds neither. Mutant `unit-fact-ignored`: killed.
- `view-level.ts:115`, the `unresolved-reference` at `parent` disjunct: a parent naming no element gives that finding and no finding of this version.
- `view-level.ts:150`, `baseBlocked`: a directories base selecting a path that names no directory gives a `base-reference` finding and no `view-level` at `base`; the same view without that path gives it. Mutant `base-blocked-ignored`: killed.
- `view-level.ts:140`, the scope's type with a schema finding: a scope typed `galaxy` gives no `view-scope`; typed `package`, it does.
- `view-level.ts:57`, a non-object diagram: `withoutLevels` returns it as it is.
- `render.ts:215`: finding 1.
- Recorded as unreachable, with no test:
  - `view-level.ts:97` and `:99`, the unknown-parent and cycle exits of `below`: `parentFault` stops the walk before either can be met (the review's reading too);
  - `dossier-site.ts:1586`'s target guard: finding 4.

## 10. Note: the other equivalents check out

No action. Six equivalents remain, each with its reason in the runner.
