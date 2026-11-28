# Review: syzygy-3efd.91 view levels errata spec (REQ-034 2.55)
Verdict: REVISE
Reviewed commit: 02234e39b832af82791c4683e73b6912bc55aa8f
Reviewer: fresh-context general-purpose agent, 2026-11-29

Subject: branch `agent/syzygy-3efd.91` at `02234e39b832af82791c4683e73b6912bc55aa8f`, package `openspec/changes/dossier-view-levels-errata/`, row A-346, install `fe32fd9f4b951c2fe439e91bb54ac1f406be4ea9`. Merge base with main `3f04944bbe4de384cb0bd5c231ae36a01fda1a58`; `origin/main` at review time `edb073890dba0585f089317f2fcb7afbbf829677`. Neither added any REQ-034 version, adoption row, check-script or census change after the merge base. [Observed] `git merge-tree origin/main HEAD` is clean. [Observed]

Spec digests: [Observed] the new spec is `530a79f837497883430ba9ca98f8965e005abb50b64cb6f4a35e9b302c5776fb` and the predecessor (2.54) is `24132cde379082c2667057c3a2e326f22fe0cf89426b256436dc84d8a92facd3`. Both match `SEMANTIC-DELTA.md` and `VLERR_SUBJECTS`.

Code compared against:
- Zoom handling: `apps/three-surface-poc/src/polaris-generation/dossier-site.ts` and `packages/polaris-dossier/src/view-level.test.ts`, at `3f04944bb` and at `origin/main` `edb073890`. The zoom logic is the same at both; only the line numbers move.
- Screening: `packages/polaris-dossier/src/screen.ts`.
- Walk advice: `agent/syzygy-3efd.35-code`, at two states:
  - `origin` `790bda394`, the pushed state. It has no `deniesBelow`.
  - local unpushed `a82ae1ec0` (repair commit `0fbcadcc4`). It has `deniesBelow`, and item 6's sentence describes this state.

## Checks run in the worktree (not --selftest)

- `python3 scripts/check_spec_reconciliation.py --check`: [Observed] "7 of 7 predicates without FAIL; PASS". R6 shows WARN with 2 findings, which are the pre-existing behaviour-contract pins.
- `python3 scripts/check_governance.py`: [Observed] "22 OK, 17 WARN, 0 FAIL (39 checks)". The merge base gives the same OK/WARN/FAIL lines. Only the examined counts differ (CG-1a, CG-1b, CG-3, CG-22), and the CG-22 finding count is the same (17).
- `python3 scripts/check_docs_review_campaign_partition.py --check`: [Observed] "partition PASS: denominator=1093; assigned=1093; ... unmatched=0; overlaps=0".
- `count_polaris_effective_scenarios.py`: [Observed] "TOTAL: 39 requirements, 670 scenarios" and "PROJECT-STATUS.md asserts: 39 requirements, 670 scenarios". By a second method, `^#### Scenario:` counts 348 in the 2.54 spec and 349 in the 2.55 spec. [Observed]
- Build script: [Observed] `view_levels_errata_build_spec.py . <scratch>` reproduces `proposed/polaris-generation/spec.md` byte for byte (`cmp` equal).
- Delta script: [Observed] `view_levels_errata_delta.py .` rewrites `SEMANTIC-DELTA.md` with no change (`git status` clean).
- Scope of the delta: [Observed] `diff` of the 2.54 and 2.55 specs gives these hunks, and the delta lists them:
  - the title and preamble;
  - one sentence pair appended to the zoom-target paragraph (line 312);
  - one sentence pair appended to the walk-advice paragraph (line 318);
  - the added scenario (lines 616–621);
  - the edits at lines 2040, 2041 (removed), 2045, 2046 and 2057.
  Nothing else moves.
- Wiring and tag: [Observed] the following agree with one another:
  - the row's tag column `polaris-dossier-view-levels-errata-v2.55` and `VLERR_TAG`;
  - the `openspec/README.md` index row;
  - the `PROJECT-STATUS.md` paragraph and census line ("With the levels errata version effective, Polaris has 39 requirements and 670 scenarios");
  - the row's link to the spec and delta at `fe32fd9f4`. The spec has been byte-identical since `fe32fd9f4`, because `02234e39b` touches only `design.md`.
  The tag itself is not yet created; `tasks.md` lists that as open.

## Per-item verification

1. Deep-dive href (spec.md:2046): [Observed] it now reads `../deep-dives/runtime.html#figure-parts`. This is the form the paragraph gives ("relative to the page holding the link ... as version 2.24 writes"). The code agrees: `view-level.test.ts` (main) lines 559–560 assert that literal for `more` on `deep-dives/storage.html`. Correct.
2. Walks on s1 (spec.md:2040, 2057): [Observed] in the tests (`view-level.test.ts:521`, `:534`), `graphView` defaults to `home: {kind:'section', target:'s1'}` and `walking` defaults to `sections[0]`. The walked figure renders on `index.html`. Both scenarios now match. Correct.
3. Omitted view (spec.md:2045): [Observed] the test (`:548`) builds `hidden` at `DIVE('runtime')` with `disposition: {kind:'omitted'}`, and the scenario now does the same. The paragraph's new sentence matches the code's target selection, `if (viewLevels !== undefined && !withheld)`, then `figurePage(d)` (undefined unless produced and on a drawn page) and `based.state !== 'drawn'` (dossier-site.ts:894–901 at `3f04944bb`; 925ff on main). But the scenario's lead-in still says "four produced graphs" (finding 1).
4. 1048 px clause: [Observed] the WHEN clause and its AND line are removed. `walkableWidth = width !== 1048` (diagram-layout.ts:579). Containments are at most 960 px (diagram-layout.ts:590). The paragraph's "width not 1048 px" condition is kept, as D5 says. Correct.
5. Inertness refusal (spec.md:312): [Observed] after drawing, dossier-site.ts:1593 (`3f04944bb`) / 1624 (main) throws when a chosen target is not in `drawnFigures`. `drawnFigures` is added to only on the drawn-figure paths, after the inertness-guard `notice(...)` returns at :985 and :1052. `packages/polaris-dossier/src/render.ts:275` catches any renderer throw as "the renderer refused the run", and `refuse('render', …)` returns before `writeSite` (:315). So "refuse the render and write no page" is the shipped behaviour. Correct, with finding 4 as a residual.
6. Denied-path directory (spec.md:318, 616–621). These probes ran at the reviewed commit under `POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v3.json`, using `buildDossierScreen(policy, false, null, 'public')`; the probe file was deleted afterwards:
   - [Observed] `screenPath` results:

     | Path | Result |
     |---|---|
     | `kubeconfig` | `denied-path` |
     | `kubeconfig/x` | `unknown-extraction-class` |
     | `kubeconfig/notes` | `unknown-extraction-class` |
     | `.kube` | `unknown-extraction-class` |
     | `.kube/config` | `denied-path` |
     | `.kube/notes` | `denied-path` |
     | `.ssh` | `unknown-extraction-class` |
     | `.ssh/id_rsa` | `denied-path` |
     | `.ssh/notes` | `denied-path` |
     | `src` | `unknown-extraction-class` |
     | `src/a.ts` | admitted |

     The policy lists `kubeconfig` under `deniedPathBasenames`, and `.ssh` and `.kube` under `deniedDirectoryNames`.
   - [Observed] `deriveTreeFacts` over the scenario's four paths, with `secretPathOf(screen)`, gives `top-level-unit` facts `.kube` 2, `kubeconfig` 1 and `src` 1, with `secretPathsLeftOut` 0. The label is `${path}/ (${plural(count,'file','files')})` (derived-base.ts:76). This matches the scenario's THEN.
   - [Observed] At `a82ae1ec0`, `stepLabel` withholds a base element where any of these holds:
     - `hidden(manifest ?? path)`, which is a secret path or `screenPath = denied-path`;
     - for a directory (no manifest), `deniesBelow(path)`, which is `deniedDirectory(path + '/-', deniedDirectoryNames)`;
     - `admit` withholds it.
     That is the 2.55 sentence exactly: the element's own path is denied, or, for a top-level directory, a `deniedDirectoryNames` entry names it, decided from the path and the policy alone. The check-level test there (walk.test.ts:735–768) passes, with `examined: 1` (only `src`) under the real v3 rules.
   - [Observed] Pushed `790bda394` gives `hidden` only, so `.kube` and `.ssh` would be read there. The sentence is therefore true of the unpushed repair only (finding 2).
   - [Inferred] It agrees with the 2.35 naming clause at spec.md:24 and 44. Under that clause a withheld path the policy permits naming may be named, a secret-detector match is counted and never named, and a directory whose files are all withheld on a ground other than a detector is still a fact. The scenario names both directories, counts neither in `secretPathsLeftOut`, and reads no denied body.
   - [Inferred] It makes no SEC-5 weakening. The walk advice reads fewer steps, not more, and names no label or path in a detail. No detector or denied-path rule changes.

## Findings

1. **Blocking.** spec.md:2045 ("The zoom target is the first rendered container view, never a context view").
   - Problem: [Observed] the WHEN reads "four produced graphs about `app`", but then gives `hidden` "the disposition `omitted`, so a notice stands in its figure's place". A graph cannot be both produced and omitted. Item 3 introduced this: in 2.54, `hidden` was produced and drawn inside a collapsible section, so "four produced graphs" was true. The erratum exists to make the view-levels text agree with itself, and this scenario's precondition now contradicts itself. A reader building the fixture from the text has to choose which clause wins. The test (`view-level.test.ts:548`) builds three produced graphs and one omitted.
   - Repair: change the build-script anchor to, for example, "four graphs about `app`, three of them produced: …", or drop "produced" from the lead-in and add "produced" to `ctx`, `parts` and `more`. Regenerate the spec and delta, and rebind the row and `VLERR_SUBJECTS`.

2. **Note.** design.md:62 and design.md:67, and the row's own reliance on them.
   - Problem: D7 says [Observed] that the R35 code review raw "is retained beside that code, on branch `agent/syzygy-3efd.35-code`", and that the .35 code "follows it on branch `agent/syzygy-3efd.35-code` (the screen's `deniesBelow`, after the R35 repair)". [Observed] Neither is true of any ref:
     - `origin/agent/syzygy-3efd.35-code` at `790bda394` has no `deniesBelow`, and its `hidden` reads `.kube` and `.ssh` (check.ts walk-advice block).
     - The local, unpushed `a82ae1ec0` (repair `0fbcadcc4`) has `deniesBelow`.
     - `docs/reviews/syzygy-3efd-35/R35-CODE-REVIEW-RAW.md` exists only as an untracked file in the .35-code worktree. It is in the tree of neither commit.
     A reader at origin cannot observe what is labelled [Observed], so the 2.51-sentence's code basis cannot be re-checked yet (rule 11). Commit `02234e39b` says the citation is provisional "until it lands", but the text does not say so.
   - Repair: label both statements as pending, for example "[Inferred] once `0fbcadcc4` and the R35 raw are pushed", and name the repair commit. Or re-cite by commit after the .35 lane pushes. Do not tag 2.55 until the .35 repair is on origin, or record in the row that the walk-advice sentence describes unlanded code.

3. **Note.** AGENT-ADOPTIONS.md:142 (A-346 revert column), and dossier-view-levels-errata/README.md, "Rollback after a veto".
   - Problem: [Observed] the recorded chain is `git revert fe32fd9f4`, then `be6c1d7ce`, then `4ae2baf18`. Run at the branch head, it does not apply cleanly:
     - Reverting `fe32fd9f4` conflicts in `design.md`, because `02234e39b` edits the same line after the install.
     - With `02234e39b` reverted first, `fe32fd9f4` and `be6c1d7ce` revert cleanly. `4ae2baf18` then conflicts in `scripts/check_spec_reconciliation.py`, because the row commit `d7c42eb6b` changed `VLERR_COUNT_SCOPE`/`VLERR_COUNT_PREFIX`.
     README step 3 says to revert only "the census, status and index changes of the row's own commit", after the install revert. It leaves out those script constants and puts them in the wrong order.
   - Repair:
     - Add `02234e39b` at the head of the chain.
     - State that the row commit's check-script lines (or the whole of `d7c42eb6b`, `c37df4f42` and `899139e22`, the row and wiring commits) are reverted before `4ae2baf18`.
     - Re-run the chain in a scratch worktree to confirm it applies.

4. **Note.** spec.md:312 (the new "Syzygy SHALL refuse the render and write no page" sentence) and design.md:48–52 (D6).
   - Problem: [Observed] no checked draft reaches the case, and no test exercises it:
     - The message "did not render as a figure" occurs in no test file.
     - `target-guard-dropped` is recorded as equivalent in `docs/evidence/syzygy-3efd-39/level-mutation-*.json`.
     CC-SPEC-4 asks every requirement to name a reachable or producible case "using means the requirement names". The residual is stated only in `design.md`, which is not the requirement. A reader of REQ-034 alone sees a SHALL with no named means to falsify it.
   - Repair: in the requirement's verification text, state that this sentence is reachable only by a renderer fault. Alternatively, add a `tasks.md` follow-up for a code test that injects a renderer fault: stub the inertness check to fail for a chosen target, then assert the `render` refusal and that no site is written.

5. **Note.** spec.md:621 (the added scenario's last AND).
   - Problem: [Inferred] the walk-advice line names no draft, view or walk. It depends on an implied v16/v17 draft with a `directories` base view showing `src`, `kubeconfig` and `.kube`, and a walk with one step on each, with no finding. Without these, "withheld at check, neither read nor counted, while a step naming `src` is read" has no producible case in the scenario itself.
   - [Observed] No check-level test covers `.kube` under the real policy. The .35 check-level test uses `kubeconfig` and `.ssh`, and covers `.kube` only through a mocked `deniesBelow` (walk-advice.test.ts:220 at `a82ae1ec0`).
   - Repair: add to the WHEN "and a v17 draft's section `s1` walks a produced `directories` view that shows `src`, `kubeconfig` and `.kube`, one step on each". Keep the `tasks.md` follow-up for the literal test.

6. **Note.** spec.md:618–620.
   - Problem: [Observed] under v3, `kubeconfig/notes` is not a denied path (`unknown-extraction-class`), because basename rules read only the final segment. The scenario does not say this. Bead item 6 ("their denied files are never read") and the scenario's title can be read as saying everything under `kubeconfig/` is protected. The text makes no false claim, but a reader can infer one.
   - Repair (optional): add "`kubeconfig/notes` is not itself a denied path, the basename rule naming only the directory's own path" to the THEN or AND. Or add a sentence to design D7. No policy change is implied, and this is not a SEC-5 matter.

7. **Note.** design.md:36 and design.md:48.
   - Problem: [Observed] the line citations `dossier-site.ts:889-890`, `:893-901` and `:1591-1593` are correct at `3f04944bb`. On current `origin/main` (`edb073890`) the same code is at about 921, 925–932 and 1624, because the code-excerpts code landed.
   - Repair: name the commit the lines are read at, for example "at `3f04944bb`", or cite by symbol (`zoomTargets`, `drawnFigures`).

Counts: 1 blocking, 6 notes.
