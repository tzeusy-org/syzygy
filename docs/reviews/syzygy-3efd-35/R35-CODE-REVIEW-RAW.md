# Review: syzygy-3efd.35 walk advice code
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 790bda394ff162ec5563571c6015db5064c29061
Reviewer: fresh-context general-purpose agent, 2026-11-28

Diff base: `2333607ff296a257d030f4179cb9f51399c2394a` (merge-base with origin/main). Worktree `/home/orca/.tmp/review-35`, `npm ci` clean.

## What was run

- [Observed] `npx vitest run` over `walk-advice.test.ts`, `walk.test.ts`, `view-level.test.ts`, `cli.test.ts`: 4 files, 228 tests passed.
- [Observed] `npm run typecheck`: clean.
- [Observed] `git diff --stat 2333607ff 790bda394 -- apps/` is empty: `dossier-render-provider-golden.test.ts` and the provider path are untouched.
- [Observed] Product diff: `walk-advice.ts` (new), `check.ts` (+14/-1: import, report type, one try block, one spread), `walk.ts` (export keywords only, no behaviour change).
- Probe tests were written into the worktree's `walk.test.ts`, run, and reverted. One hand mutant was applied to `walk-advice.ts`, run against `walk-advice.test.ts`, and reverted. The worktree was clean before removal.

## Acceptance criteria, in brief

1. SHALLs and scenarios. [Observed] Each 2.51 sentence maps to code:
   - the member shape and rule id;
   - `examined`;
   - skipping a walk with a finding at or below its path;
   - the unestablished-map, withheld, Unknown and unadmitted base steps;
   - the `at` and detail forms;
   - sections before deep dives;
   - the paragraph text with its children, joined by one space;
   - the label sources: model element, node, and Syzygy's base label (not the display name);
   - absence for earlier than v16, under a `schema` finding, and for the inventory (`plan.command === 'check'` plus `hasWalkForm`);
   - a failure leaves the member out.

   Requirements with no test are listed in finding 6.
2. Word reading. [Observed] Probes of `adviceWords` and `restates` all behave as the spec says:
   - `İ` (U+0130) and `ẞ` are kept unlowercased;
   - `x◌́y` splits at the combining mark;
   - a ZWJ splits;
   - Arabic-Indic digits, `Ⅻ` and `①` are words (category N);
   - the astral `𐀀` is one word;
   - an existing test covers a lone surrogate;
   - `restates('', '')` is true, `restates('the', '')` is true, `restates('x', '')` is false;
   - `restates('ses','s')` and `restates('s','ses')` are true;
   - `restates('Request routerses','Request router')` is false;
   - all 30 filler words match the spec list exactly;
   - the threshold is containment (`every`).
3. Base-element screening: see findings 1 and 2.
4. Screening of details. [Observed] The detail is `walkAdviceDetail(read.figure, k + 1, step.block)`: two draft identities and a number. It carries no label, path or paragraph word. The identities are resolved, schema-checked identities, and the member is absent under any `schema` finding.
5. Absence. [Observed] All conditions hold in code. The inventory case is untested (finding 6).
6. Byte stability. [Observed] `walkAdvice` is computed after the check record, `run-advice.json` and every other member have been built, and is spread only into the report. Tests assert that the check record, `run-advice.json` and the rendered pages lack the rule string (finding 7).
7. Literals. [Observed] Every expected value in the three test files is a literal. `DETAIL` in `walk.test.ts` is a test-local template, not the module's `walkAdviceDetail`.
8. Mutation evidence: see findings 3, 4 and 5.
9. Correctness: no blocking defect found. See finding 2 for one behavioural inconsistency.

## Findings

1. **Note: the check-level `hidden` path is a real test gap, not unreachable.**
   - Where: `packages/polaris-dossier/src/check.ts:497-498`; the fixture policy is at `packages/polaris-dossier/src/walk.test.ts:38-44`.
   - Fixture: the mutation note says no check-level fixture reaches `hidden`, and that `kubeconfig/` "was read as not hidden". [Observed] `walk.test.ts` builds its screen from the Butlers candidate policy's `sourceAdmission`. Under that fixture a tree with `kubeconfig/a.ts` checks `passed` with `examined: 2`, so the `kubeconfig` step is read, and the page draws `kubeconfig/ (1 file)`.
   - Real policy: [Observed] under the real dossier policy (`POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2.json`, built with `buildDossierScreen`), `screenPath('kubeconfig')` is `denied-path`, while `secretPathOf` gives false and `admitOf` gives `admitted`.
   - So: check's `hidden('kubeconfig')` is true under the real policy, and mutant `check-hidden-unscreened` (`hidden: () => false`) would change `examined` for such a tree. The survivor exists only because of the fixture's policy. That matches syzygy-3efd.92's close reason ("Under the real v3 policy screenPath('kubeconfig') = denied-path").
   - Repair: add one check-level fixture whose screen uses the real dossier policy's `sourceAdmission` and whose tree holds `kubeconfig/a.ts`. Assert the literal `examined` and advisories. Then re-run `check-hidden-unscreened`.

2. **Note: denied directories are treated inconsistently, and part of the `hidden` predicate is dead for map elements.**
   - Where: `packages/polaris-dossier/src/check.ts:498` and `packages/polaris-dossier/src/walk-advice.ts:114-115`.
   - [Observed] Under the real v2 policy:
     - `screenPath('kubeconfig')` is `denied-path`, so the step is hidden and not read;
     - `screenPath('.ssh')` is `unknown-extraction-class`, because `deniedDirectoryNames` applies only to non-final segments, so `hidden('.ssh')` is false and the step is read.
   - [Observed] `.ssh/a.ts` is `denied-path` but not a secret-detector match. So `deriveTreeFacts` (`derive.ts:202-215`, which drops only `isSecretPath` blobs) still lists a `.ssh` top-level directory, and the walk advice reads and counts it.
   - Result: of two directories the policy denies by name, one is excluded from `examined` and the other is not, and both are drawn. [Inferred] For `kubeconfig` this relies on syzygy-3efd.92's close reason that naming is allowed; I observed the drawing only under the fixture policy.
   - Spec gap: 2.51 says "withheld at check" without defining a directory's withholding, and the code reads it as "a file-path denied rule matches the directory's path".
   - Dead branch: [Observed] the `secretOrUnder(...)` half of the predicate cannot decide for any map element. Secret paths are left out of the directory map (`derive.ts:212`) and, [Inferred] from the mutation note, out of the unit map (`secretPathsLeftOut`).
   - Leak: none. The detail carries no label, and both labels are already admitted for output.
   - Repair: name the predicate in the spec ("a step whose base path check's `hidden` predicate names") or drop `hidden` from walk advice. Either way, decide `.ssh/`-style directories explicitly and pin both with fixtures.

3. **Note: the mutation evidence is not bound to the reviewed bytes.**
   - Where: `docs/evidence/syzygy-3efd-35/walk-advice-code-mutation-2026-11-28.json`, `subject`.
   - [Observed] The record names `round` `d2ee135a8…`, and its `subject` digests match the reviewed commit for `walk-advice.ts` (`316ca36a…`) and `walk-advice.test.ts` (`da609a0f…`) only.
   - At `790bda394`, `check.ts` is `f761eebf…` (record: `2473df07…`) and `walk.test.ts` is `77bcd963…` (record: `30f0ca36…`).
   - The two merges from main brought in `levelFindings` and import facts. `levelFindings` is now pushed into the `findings` that walk advice reads. The new `view-level.test.ts` cases were not in the run.
   - [Inferred] The scores are likely unchanged, but the record cannot be re-checked against these bytes (rules 7 and 11).
   - Repair: re-run at the PR head and record that head commit, or state in the record that it binds `d2ee135a8`.

4. **Note: the two equivalence arguments.**
   - Where: `packages/polaris-dossier/src/walk-advice.ts:86` and `:111`.
   - `base-not-shown-read` (`:111`): truly equivalent. [Observed] `directoryBase` and `unitBase` give every element a string `factId` (`text(...) ?? ''` for units), and a non-`shown` `BaseStep` has no `factId`. So `elements.find(e => e.factId === undefined)` is always undefined, and an unestablished map is absent from `maps`.
   - `graph-kind-ignored` (`:86`): equivalent only through check's composition. [Observed] `walkFindings` (`walk.ts:151`) pushes a `walk` finding at `${at}.figure` for a non-graph figure, `check.ts:373` runs it under the same guards, and `under` then skips the walk.
   - The exported `walkAdvice` makes no such guarantee: called with `findings = []` (as every unit test does), a non-graph figure would be read. The same composition argument also covers `:85-86` (`read === undefined`, `diagram === undefined`), `:91` (`block === undefined`) and `:107-108` (node not found). None of these was mutated.
   - Repair: none needed for behaviour. State the precondition in the `walkAdvice` docstring: the findings must include `walkFindings` for the same draft.

5. **Note: three D7 mutants are missing from the evidence, and the tests kill them.**
   - Where: `openspec/changes/dossier-walk-advice/design.md` D7, and the mutation record.
   - D7 lists "iterate UTF-16 code units", "widen to one new word" and "echo a word in the detail". The 37-mutant record has none of the three.
   - UTF-16 iteration: [Observed] I applied it by hand (`for (let i…) value[i]` / `charCodeAt`), and `walk-advice.test.ts:43` (`a𝐀b`) killed it.
   - The other two: [Inferred] they would be killed by the one-new-word literal cases (`walk-advice.test.ts:22-26, 90-91`) and by the literal detail comparisons.
   - Repair: add the three to the script so the record matches D7.

6. **Note: some requirements and branches have no test.**
   - Inventory absence (spec scenario "Where the walk advice is absent", third case): there is no check-level test. The guard is `check.ts:494`; [Observed] no `inventory*.test.ts` mentions `walkAdvice`.
   - Disposition independence ("whatever the disposition of the walk's figure or place"): no fixture with an omitted place or figure.
   - "Exit status and readiness" in "The walk advice gates nothing": `view-level.test.ts` compares only `outcome` and `findings`.
   - `check.ts:494`: the `parseFault === null` and `isRecord(walked)` guards are untested. They are redundant with `hasWalkForm(undefined)`.
   - `walk-advice.ts:106`: the `isRecord(diagram['view'])` conjunct is untested.
   - `walk-advice.ts:85-86, 91, 107-108, 112`: composition-guarded and untested at unit level (finding 4).
   - The check-level `hidden` path is untested (finding 1).
   - Repair: add a check-level inventory test asserting no `walkAdvice` member, a v16 fixture with a non-produced place whose walk is still read and counted, and an exit-status comparison in the gates-nothing test.

7. **Note: byte stability is asserted by absence of a string, not by byte comparison.**
   - Where: `packages/polaris-dossier/src/walk.test.ts` (2.51 block, first test) and `packages/polaris-dossier/src/view-level.test.ts` (2.51 block).
   - [Observed] The tests check that the stored record, `run-advice.json` and the pages do not contain `walk-step-restates-label`. They do not compare against the same draft with the advice disabled.
   - [Inferred] The diff makes the claim hold structurally: the computation comes after every write, and only the report spread changes. The failure-path test does show that the report's other keys are unchanged.
   - Repair (optional): reuse the `walkAdviceFails` toggle to render and record once with the advice and once without, and compare the bytes.

## Counts

0 blocking, 7 notes.
