# Review: syzygy-3efd.38 derived base views code
Verdict: REVISE
Reviewed commit: 03e55595eccc9190f63b2cbe56bef1554fd98f25
Reviewer: fresh-context general-purpose agent, 2026-11-28

## Scope and method

- Diff base: `git merge-base origin/main 03e55595e` = `5bf8fdae797ef8e625972d76b68b28483db9bc49`. There are 27 files, +2533/-119.
- Governing text [Observed]. `openspec/changes/dossier-derived-base-views/` holds version 2.34, which A-332 retired. The 2.35 text is in `openspec/changes/dossier-derived-base-screening/proposed/polaris-generation/spec.md` (A-333). I reviewed against 2.35:
  - spec.md lines 240-258, the v15 paragraphs and the two SEC-5 screening paragraphs;
  - its 25 derived-base scenarios, lines 1631-1781, including the six screening scenarios that 2.35 appends.
- Checks run in a detached worktree after `npm ci` [Observed]:
  - `npm run typecheck` is clean.
  - Targeted vitest passed: 9 files, 665 tests. The files were derived-base, brief, check, cli, containment-figure, draft-schema, system-model, dossier-base and dossier-render-provider-golden.
- `dossier-render-provider-golden.test.ts` is unchanged against the base [Observed]: `git diff --stat` printed nothing.
- The brief v23 paragraph in `brief.ts` equals the spec's quoted paragraph byte for byte [Observed]. I compared them with Python over the spec text.
- I wrote eight scratch probes in the worktree, using the `derived-base.test.ts` harness, and ran them. The worktree has been removed. Findings 1-3 rest on those probe outputs.

## Findings

1. **Blocking.** A directory-map containment never states the root→directory nesting as the record's `contains` fact.
   - Where:
     - `apps/three-surface-poc/src/polaris-generation/dossier-site.ts:957-985`, the containment list, the `witnessed` items and the machine `nestings`;
     - `packages/polaris-dossier/src/render.ts:350`;
     - `packages/polaris-dossier/src/derived-base.ts:603-605`.
   - Spec: line 244 says the root holds each shown directory, "the nesting being the record's `contains` fact, stated in Syzygy's words and with that fact's mark in the figure's list as version 2.23 states a witnessed nesting". The scenario "Directory containment keeps the root" (line 1672) says "each nesting the record's `contains` fact in Syzygy's words".
   - Failure [Observed, probe P4]:
     - draft `dirsContain('parts', {hide: [{paths: ['docs'], reason: …}]})` over the `TREE_D` fixture;
     - the figure list carries no `contains` statement and no `_tree-contains-*` identity;
     - the tally carries no "witnessed by Syzygy" clause;
     - `machine.json` gives `nestings: [{"parent":"_tree-root","child":"_tree-unit-2","witness":null}]`.
   - Cause [Inferred]:
     - `renderBases` computes each element's `contains` `{factId, epistemic}`, but the site never reads it;
     - `edgeRelationsAt` filters out every decision whose id starts with `_`, so `relationOf('_tree-unit-*')` is always undefined.
   - The existing test, `derived-base.test.ts` "Directory containment keeps the root", asserts only the phone outline, so it does not catch this.
   - Repair:
     - for a directory-base containment, emit for each root→directory nesting the list item `Repository root contains <path>/.` with `data-derived-id` set to the contains fact, its mark and `data-visual-provenance="computed"`, as the graph form already does at `dossier-site.ts` (the `isBase(e.id)` edge item);
     - carry the fact as the nesting's witness in `machine.json`, and count it in the tally;
     - assert all three in the test.

2. **Blocking.** At render, a grouped base element's nesting inside a model element loses its relation-witness decision.
   - Where: `packages/polaris-dossier/src/render.ts:350`, the `.filter(({ id }) => !id.startsWith('_'))`.
   - Spec (line 244): each such nesting is "the draft's claim, read by rule `relation-witness` version 1 as version 2.24 reads an element's `parent` … and is drawn as the draft's nesting is drawn".
   - Failure [Observed, probes P7 and P8]:
     - P7 is the base form. A v15 directory containment selects `repo` (unit `repository-root`) with `group: [{element: 'repo', paths: ['src']}]`. Check passes, but the render gives `{"parent":"repo","child":"_tree-unit-2","witness":null}` and no "witnessed by Syzygy" clause.
     - P8 is the same claim drafted as model elements: `srcel`, a `directory` with unit `top-level-directory` `src`, whose parent is `repo`. It renders `witness: {"state":"witnessed","fact":"_tree-contains-2",…}`.
     - So the same claim is drawn witnessed in one form and unwitnessed in the other.
   - Cause [Inferred]: nestings are keyed by the child's id, and a base child's id is its fact id (`_…`), so the filter discards exactly these decisions.
   - Repair:
     - filter only the base `contains` edges and the root→directory nestings, for example by `basis === 'base' && grouped !== true`, and keep the grouped-base decisions;
     - add a test where a grouped base nesting is witnessed, and one where it is challenged. `relation-challenged` from `baseNestingFindings` also has no test.

3. **Blocking.** Byte stability: widening the SVG attribute-value pattern changes the rendered bytes of pre-v15 drafts.
   - Where: `apps/three-surface-poc/src/polaris-generation/svg-inert.ts:37`. `VALUE` now admits `:` in every attribute.
   - Spec (line 258): a draft of schema v14 or earlier SHALL be rendered with "the same bytes of every page" as version 2.33 gives. That is acceptance criterion 3.
   - Failure [Observed, probe P6]:
     - draft: a v12 model with an element `x:y` selected by two graph views, so the element is shared and gets `data-element="x:y"`;
     - at 03e55595e the figure is drawn, with `DRAWN` and the attribute present;
     - with the predecessor `VALUE` restored in the same tree, `assertInertSvg` throws and the page carries the "diagram could not be rendered inertly" notice (`NOTICE`);
     - draft handles admit `:` (`SOURCE_ID_PATTERN`), so this is reachable.
   - Repair: keep `VALUE` as it was, and admit `:` only in the value of `data-name`, for example with a per-attribute pattern `^[A-Za-z0-9_.:-]+:name:[1-9]\d*$`. Add a pre-v15 test with a colon identity.

4. **Blocking.** Four of the six scenarios that 2.35 adds have no test, and two more are tested only in part.
   - Where: `packages/polaris-dossier/src/derived-base.test.ts:393-417`, the only screening tests.
   - Scenarios with no test [Observed]. A grep of the test files found no withheld or unavailable case outside `.env` and the forged reason:
     - "Other derived-base finding kinds screen the submitted diagram identity" (`base-conflict`, `base-root`, `base-group`, `base-size` and `base-label` with an identity that is withheld or unclassified);
     - "Unsupported derived-base fields screen their submitted identity" (the screened `field-version` details);
     - "Containment findings computed over an expanded base use the same screen". Probe P3 shows the code does it: a withheld diagram id on `containment-flat` gives the fixed detail with no leak. Nothing pins it.
     - "The screening boundary preserves admitted map and tally behavior".
   - Tested only in part:
     - "A base-reference finding admits dynamic detail only through the existing screen". The one case, `.env`, is both a secret path and a path the map leaves out unnamed. It cannot tell admission apart from evidence (`derived-base.ts:283`). There is no unavailable case, no `select`, `group`, `names` or base-end case, and no ambiguous case.
     - "Hide and remainder reasons are screened". There is no admitted alternate reason checked byte for byte in both forms, and no unavailable (throwing) screen case (`derived-base.ts:588`). There is no assertion that the machine figure entry, or its `base` member, is absent.
   - Other 2.35 scenarios with no end-to-end test:
     - "One manifest declaring two packages". Only `resolveBasePath` is tested. The `names 2 elements of the unit map; …` finding and the `#2` display name are never checked through `checkDraft`.
     - Every base-end `base-reference` finding (`baseEndFindings`, `derived-base.ts:371-393`, `model: …` details). There are no tests at all.
     - "Unknown base renders a notice", and the late branch where the map is not established at check but is at render. Only the pure `baseNotice` and `baseMachine` are tested. `renderBases`'s `unknown` and `unresolved` arms and `baseViewsAt`'s `late` set are never reached through `renderRun`.
     - "Pruned view prints its chip" and "Chip links from a deeper page" are tested only on hand-built `Drawn` values, not through a render.
     - `base-root` at a `hide` or `group` path naming `.`. Only the `select` arm is tested.
     - The base-view bound replacement: `elements` 0 to 40 and `relationships` 0 to 80, at and past each bound (`baseSchemaReading`). The semantic delta names these bounds as tested.
   - Repair:
     - add one fabricated-screen test per scenario above: admitted, withheld and unavailable (the screen throws), with literal expected details, checking both the check record and the report;
     - add end-to-end render tests for the unknown and late notices and for a figure with a base end.

5. **Note.** Mutation evidence adequacy.
   - Where: `docs/evidence/syzygy-3efd-38/derived-base-mutation-2026-11-28.json` and `derived_base_mutation.mjs`.
   - What the record holds [Observed]:
     - 38 mutants run, 38 killed, plus 1 equivalent (`numbered-leading-zero`) with a stated reason;
     - each mutant stores `file`, `old`, `new`, `killedBy` and `failedTests`;
     - the run's `commit` is 79626ed2b, the parent of the reviewed commit, which adds only the evidence;
     - a per-file `subject` sha256 map binds the bytes, so the record meets the guardrail on old and new fragments plus commit.
   - Only 18 mutants target `derived-base.ts` (618 lines); the other 20 are spread over eight files. For a module that holds every screening decision, the set is thin [Inferred].
   - No mutant touches these branches, and no test reaches them (see finding 4):
     - the `screened(...)` calls for base-conflict, base-root, base-group, base-size and base-label (`:300, :315, :333, :340, :343`). Replacing each with its literal detail would survive.
     - `evidence = !hidden(...)` (`:283, :386`);
     - `admitOf`'s catch → `unavailable` (`:511-513`);
     - all of `baseEndFindings`;
     - the `many && named.length > 1` arm (`:287`);
     - `baseNestingFindings` (`:531-550`);
     - the `renderBases` unavailable, unknown and late arms (`:583-588`);
     - `baseSchemaReading`'s bound rewrite (`:487-493`);
     - `base-root` over hide and group (`:317-319`);
     - the base-label `another` and `selectedLabels` arms (`:345-349`);
     - `selectedLevels`'s self-parent arm (`:246`);
     - `touches` (`:263`);
     - in `system-model.ts`, the graph `containsEdges` root-shown condition.
   - Two blocking defects (findings 1 and 2) sit in code that a mutant set of this size never exercised. Mutation scores here measure the tests that exist, not coverage of the requirement.
   - Repair: after adding finding 4's tests, add one mutant per listed branch, and re-run at the new commit.

6. **Note.** A graph view has no phone form, so one THEN clause of "Base element keeps Syzygy's words" cannot be met as written.
   - Where: `dossier-site.ts`. Only containment figures (`figure-outline`) and sequence and swimlane figures (`figure-stepper`) have a phone form.
   - Spec (scenario at line 1645, a graph view): "its phone-form item begins `Syzygy: ` and ends `, called Server code`".
   - The code adds `Syzygy: ` and `, called …` only to containment outlines (`dossier-site.ts:964-966`). No graph view carries either string [Observed].
   - Repair: either record the clause as vacuous for a graph view in an agent adoption row or spec amendment, or add a graph phone form. Do not leave it silently unmet.

7. **Note.** The render reorder adds source reads before a refusal for every draft, pre-v15 drafts included.
   - Where: `packages/polaris-dossier/src/render.ts:211-225`.
   - `derivedStructureAt` and `renderManifestFacts` (tree listing and manifest blob reads) now run before `buildLocalInput`. They used to run after it. So a run that `buildLocalInput` refuses now reads the tree and manifests first.
   - The output bytes are unchanged: both calls catch `GitObjectReadRefusal` [Observed]. But the 2.35 screening paragraphs say "Read no additional source", and pre-v15 renders should be unchanged [Inferred].
   - Repair: compute the maps before `buildLocalInput` only when `hasBaseForm(doc.schemaVersion)`, and keep the predecessor order otherwise.

8. **Note.** The late-render notice can make a false statement.
   - Where: `packages/polaris-dossier/src/render.ts:375-381`, and the `baseNotice` `unresolved` arm in `dossier-base.ts`.
   - Any model finding computed at render for a base view marks the view `late`. The notice then reads "which this dossier's check could not read".
   - If check did establish the map and a finding still appears at render, that sentence is false (VIS-2). That can happen if the check-time and render-time maps differ, for example the tree-facts path against the derived-structure path [Inferred].
   - Repair: mark a view `late` only when the check record shows the map was not established at check. Otherwise refuse the render with `rederive`, as other check-and-render disagreements do.

9. **Note.** `machine.json` writes an empty string for a base end that no drawn view shows.
   - Where: `packages/polaris-dossier/src/render.ts:228-235` (`drawnEnd`) and `system-model.ts` (`localModelOf`).
   - This happens when the only view selecting the relationship is refused or unresolved: the model relationship gets `from: ''` or `to: ''` while its `views` still names the diagram.
   - Spec (line 248) requires every path written to be the resolved form. An empty identity is neither a resolved path nor Unknown [Inferred].
   - Repair: resolve the end against the render's map directly, or write null with a reason.

10. **Note.** `markOf` trusts the draft-reachable keys `basis: 'base'` and `epistemic: 'observed'` to mark an element Observed.
    - Where: `packages/polaris-dossier/src/render.ts` (`markOf`, inside `buildLocalInput`). The same `id.startsWith('_')` test is used in `dossier-site.ts` (`isBase`).
    - Today this is safe: schema closure and the handle pattern `^[A-Za-z0-9]…` keep these values out of any draft that passes check [Observed for the handle pattern; Inferred for closure across every node schema].
    - Repair: key the Observed mark and base identity on the set of fact ids the render resolved (`bases.resolved`), not on fields a draft object could carry.

## Criteria summary

1. 2.35 SHALLs: three are violated (findings 1-3). Untested scenarios are listed in finding 4. The graph phone-form clause is unmet (finding 6).
2. Screening and security:
   - In probes P3, P4 and P6 and the existing tests, no draft value reached a screened sink unscreened [Observed for those cases].
   - No page carried `<script` [Observed]: probe P4 and the existing test sweep.
   - No detector or SEC-5 rule is weakened [Observed]. `admitOf` and the render's `screenReason` use the existing `secret-detector-match` predicate, as `clean` already does.
   - The `svg-inert` change (finding 3) loosens the inert-SVG grammar, though scheme and `href` refusals still hold.
3. Byte stability:
   - The provider golden is unchanged [Observed].
   - Pre-v15 renders change for colon identities (finding 3).
   - The brief changes only as v23 states [Observed].
4. Conformance literals [Observed]. The tests import functions under test, and `resolveBasePath` and `BaseMap` as a type, but every expected value is a literal.
5. Test rigor: see findings 4 and 5.
6. Correctness: see findings 1, 2, 8 and 9. Ordering is deterministic: findings follow path order, and maps iterate in insertion order [Observed in code reading].
