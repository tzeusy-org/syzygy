# Design — view levels errata (version 2.55)

[Inferred] This is version 2.55 of REQ-polaris-generation-034, for syzygy-3efd.91.

- It is drafted on `agent/syzygy-3efd.91` over code excerpts 2.54 (`dossier-code-excerpts`, row A-345, tag `polaris-dossier-code-excerpts-v2.54`), the newest REQ-034 version on main at `3f04944bb`.
- It corrects five statements of the view levels of version 2.50, all carried unchanged through 2.54, and adds one scenario and one sentence of the walk advice of version 2.51.

## D1. The version label, the predecessor and the numbers

- [Observed] A sweep of `origin/main` and all 444 origin branches at `3f04944bb` finds REQ-034 versions on main up to 2.54 (A-345), and above main only 2.52 (`dossier-cliffs`, open PR #1053, row A-343). Row A-339 is held by `agent/syzygy-5dhm.26` (#1051). So this change takes 2.55, row A-346 and tag `polaris-dossier-view-levels-errata-v2.55`.
- [Observed] Built over 2.54, the newest on main. If 2.52 lands first it does not touch this chain's predecessor: 2.52 is a MODIFIED REQ-034 over 2.51, so it would itself be rebound over 2.54 by its own lane, and this version would then be rebound over that. The rebind is mechanical:
  - run the rebuild on a tree that merges main after that change, never on its branch head;
  - `view_levels_errata_build_spec.py`: set its four predecessor constants (`PREDECESSOR`, `PRED_TITLE`, `PRED_VERSION`, `PRED_NAME`); nothing else in the script names the predecessor;
  - `view_levels_errata_delta.py`: set `PRED`, and the predecessor's version, row and tag in its Composition prose; re-run it;
  - `scripts/check_spec_reconciliation.py`: the `VLERR_SUBJECTS` digest, `vlerr_binding`'s predecessor binding and docstring, and `vlerr_delta`'s predecessor;
  - `scripts/count_polaris_effective_scenarios.py`: the chain and the predecessor's not-in-force guard;
  - prose naming "over 2.54": this file, the README, `proposal.md`, `tasks.md`, the row, the `openspec/README.md` index row and the `PROJECT-STATUS.md` census line;
  - then rebind the row to the new install commit and re-run the three checks in a fresh clone.
- [Observed] The build script edits the predecessor's bytes at anchors it asserts occur exactly once. The predecessor hashes to `24132cde379082c2667057c3a2e326f22fe0cf89426b256436dc84d8a92facd3`.
- [Observed] REQ-034 goes from 348 scenarios to 349; Polaris from 669 to 670. No draft schema or brief version is taken.

## D2. The address between deep dives: the scenario corrected

- [Observed] The zoom target paragraph writes `<href>` as "the target figure's page path written relative to the page holding the link … as version 2.24 writes the address of an element's first figure". The scenario "The zoom target is the first rendered container view, never a context view" wrote `more`'s link, on `deep-dives/storage.html`, as `runtime.html#figure-parts`.
- [Observed] The code writes `../deep-dives/runtime.html#figure-parts` (`view-level.test.ts:559-560`, which records the scenario's spelling as an erratum). Both name the same page; the paragraph's form is the one version 2.24 writes.
- [Inferred] The scenario is corrected to the paragraph and the code. The paragraph does not change.

## D3. Walks on the overview: the scenarios corrected

- [Observed] Version 2.40 admits a walk on a section or a deep dive only (`$.sections[<i>].walk`, `$.deepDives[<i>].walk`), and no later version adds the overview. Two 2.50 scenarios put a walk on the overview: "Zoom links and a walk share one layer" and "A walked figure and a zoom-only figure share one page".
- [Observed] The code's tests home the walked figure at section `s1`, which renders on `index.html`, and walk it there (`view-level.test.ts:521`, `:534`).
- [Inferred] Both scenarios now put the walk on section `s1`, as the tests do. Admitting a walk on the overview would need a schema and code change for no reader need the bead names, so it is not taken.

## D4. "Inside a collapsible section": the scenario restated, the paragraph says so

- [Observed] No figure of this renderer is drawn inside a `<details>` (`dossier-site.ts:889-890`, and the test "draws no figure inside a collapsible section on any page of a levelled site", `view-level.test.ts:482`, added for R39 finding 5). So the scenario's view `hidden`, "whose figure renders inside a collapsible section", cannot be built.
- [Observed] The code's test stands an omitted view (disposition `omitted`) in that place (`view-level.test.ts:548`), and a second test makes a view a notice by leaving its base not drawn at the render (`:565`).
- [Inferred] The scenario's `hidden` is now an omitted view, as the test builds it. The paragraph keeps its clause and gains a sentence: no figure renders inside a collapsible section, so that clause passes no view over; and it names the notices that are passed over: a figure not produced, not on a page the render draws, or with a base not drawn at the render; and where the draft layer is withheld, no element has a zoom target (`dossier-site.ts:894`, `!withheld`).

## D5. The 1048 px clause: dropped

- [Observed] "Zoom links and a walk share one layer" asked for a second draft in which "a layout supplied to check draws `ctx` 1048 px wide". A layout supplied to check reaches figure-fit advice, not the render. The render lays out graphs in one column and containments at most 960 px wide (`diagram-layout.ts:590`), so no render draws a figure 1048 px wide, and the clause cannot have a test (R39 note 3).
- [Observed] The guard itself is the shared `walkableWidth` (`diagram-layout.ts:579`), pinned at 1047, 1048 and 1049 px by `dossier-walk.test.ts`.
- [Inferred] The clause and its `AND` line are dropped. The paragraph's "width not 1048 px" condition stays: it is version 2.40's condition, stated once, and the 2.40 scenario "A drawing 1048 px wide is walked nowhere" is not this erratum's.

## D6. A zoom target that fails the inertness check: the text follows the code

- [Observed] The code chooses each zoom target before it draws any figure, from what it knows then: a figure produced, on a page the render draws, with its base drawn (`dossier-site.ts:893-901`). After drawing every page, a chosen target that the inertness guard turned into a notice refuses the render (`dossier-site.ts:1591-1593`). 2.50's text passed such a view over.
- [Inferred] The text now says the render is refused and no page is written. This is the fail-closed choice, and the bead prefers it:
  - the other way round, choosing targets after drawing, would reorder the render to serve a case no checked draft reaches: every drawing the renderer makes from a checked draft passes its own inertness check (R39 note 4; `target-guard-dropped` stays equivalent in the .39 mutation record, with the review's agreement in its finding 10);
  - passing the view over after links to it were written would leave links to a fragment no page carries.
- [Observed] No scenario is added for it: no checked draft reaches it, so a scenario would need a renderer fault injected, which is a code-test matter. The sentence is a SHALL with no scenario, stated as a residual here.

## D7. A directory a denied-path rule names: the scenario added, the walk advice stated

- [Observed] The effective text already allows naming such a directory: "Of the blob entries left, one whose path has one segment is a file at the root, and one whose path has two or more segments belongs to the top-level directory its first segment names, whatever other rule excludes or withholds its blob: a withheld path that the policy permits naming may be named (as this requirement already allows), so a directory whose files are all withheld on a ground other than a secret detector is still a fact." Only a path a secret detector matches is left out (`derive.ts`, `secretOrUnder`).
- [Observed] The bound policy (`POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v3.json`, `sourceAdmission.pathRuleScope`) applies basename, prefix and suffix rules to a path's final segment, and directory-name rules to every segment but the final one; "a denied path is never read".
- [Observed] A probe at `3f04944bb` under that policy (the screen built by `buildDossierScreen`, public visibility; tree `README.md`, `src/a.ts`, `kubeconfig/notes.txt`, `.kube/config`, `.kube/notes.txt`; not committed) gave:
  - the directory map elements `kubeconfig/ (1 file)` and `.kube/ (2 files)`, with `secretPathsLeftOut` 0;
  - `screenPath('kubeconfig')` = `denied-path`, `screenPath('.kube')` = `unknown-extraction-class`, and `screenPath('.kube/config')` = `denied-path`;
  - so check's `hidden` predicate (a secret path, or `screenPath` = `denied-path`) holds for `kubeconfig` and not for `.kube`.
- [Inferred] The walk advice of syzygy-3efd.35 skips a base step where that predicate holds, treating a denied own path as "withheld at check" in 2.51's words. That is fail-closed: fewer steps read, nothing more named. The sentence states it, with the `deniedDirectoryNames` case, so the code and the text agree once that code lands.
- [Observed] The scenario's map statements are observed at `3f04944bb`. Its walk advice line states code not yet on main (syzygy-3efd.35, branch `agent/syzygy-3efd.35-code`); `tasks.md` lists the literal test as a follow-up.
- [Inferred] Hiding such a directory instead would be stricter than the text, not looser, and is not taken: the text names it on purpose. Nothing here weakens what the policy hides (SEC-5).

## D8. Composition, bytes and code

- [Inferred] 2.50 (view levels): five of its statements are corrected; every other sentence stands.
- [Inferred] 2.51 (walk advice): one sentence added; it reads no level.
- [Inferred] 2.53 (walk errata) and 2.54 (code excerpts): untouched.
- [Observed] Bytes: none move. Each correction is what the code on main already does and its tests pin, and the walk advice sentence is syzygy-3efd.35's code. So `tasks.md` lists no code item for this version but the follow-up test, and the provider golden is untouched.

## Review

[Unknown] One independent fresh-context review (CC-REV-4) is arranged by the lead after this package is pushed. Its raw and dispositions will be recorded here.
