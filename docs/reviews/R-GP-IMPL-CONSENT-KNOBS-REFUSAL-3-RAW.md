# R-GP-IMPL-CONSENT-KNOBS-REFUSAL-3 — exact-head review of rebased PR #640
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 9dde4cc2b521d938c7c01d5ef25f9055ca7606b2
Base: ba0d8af6bb7db75638f28f4df20031be5355d455

- Bead: `syzygy-bpyt.1.24`. Round 3; rounds 1 and 2 are `docs/reviews/R-GP-IMPL-CONSENT-KNOBS-REFUSAL-1-RAW.md` (REVISE over `e8450656`) and `-2-RAW.md` (CONFIRM WITH EXCEPTIONS over `6d2970c1`), read from `origin/agent/syzygy-pkym`.
- Authority:
  - `.syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-15.md` lines 108-120, `pr640-policy-stem`, answer A. Quoted: "The `pwb-secret-classification-policy` stem is a knob." "The Nov-3 stop clause halts only that knob's alignment." The other knobs "may merge after: a rebase; a re-run of the verdict differential over the current `decisions/` tree that shows no verdict change; a fresh exact-head review." "If the re-run changes any verdict, the work stops and returns to the owner."
  - `.syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-03.md` item 6, lines 156-158: "Align every knob toward refusal wherever one family refuses a world another accepts; stop and return if any family's verdict over the current `decisions/` tree changes".
- Subject bytes at the head:
  - `packages/polaris-generation-consent/src/package-reader.ts`: sha256 `15240c6ae8430ed450b9f6ba82e032831f9c0791786336a45dacf288626c487f`.
  - The base reader at `ba0d8af6`: sha256 `ae01b576dc08602518fc0cc331d63179eefe3faa92b28a4c444d387d4a345450`.
  - `merge-base HEAD origin/main` is `ba0d8af6`, the same as `origin/main` when this review was read. `gh pr view 640` reports head `9dde4cc2`, base `main`, and MERGEABLE.
- Method:
  - Detached worktrees: `.worktrees/review/r-640-3` at the head and `.worktrees/review/r-640-3-base` at `ba0d8af6`.
  - In each: `npm ci`, then `npx tsc -b packages/polaris-generation-consent packages/polaris-dossier`.
  - The author's tool was copied to a private scratch directory and run there. Its digests matched the PR's record before it ran. All outputs are the reviewer's own.
  - A shared scratch directory already held the author's `base.json`/`head.json`. A first comparison against those files was discarded. It was not counted as evidence.

## Verdict basis

The owner's merge condition holds.

- The re-run differential reproduces exactly: 0 of 357 answers change.
- The run is not vacuous, and the comparator kills planted changes.
- A planted stem alignment reproduces the recorded counterfactual exactly: 56 of 357, all toward refusal.
- The rebase conflict keeps main's exempt-record handling. Mutants kill both of its guards.
- The policy stem is still unaligned.
- The tests, governance checks and CI are green.

There are two exceptions, both prose only:

- a wrong form count in the rewritten `POLICY_FAMILY` docstring;
- a PR body that still says the owner question is pending and that merge is unauthorized.

Neither changes any answer.

## Checks

1. The conflict resolution keeps main's behaviour [Observed].
   - The head's `findActRecords` was compared with `origin/main`'s line by line.
     - The exempt-record block is byte-identical, including the R-PDJA-29-GATE-1 comment. It keeps the `OWNER_SELECTION_SLOTS` 64-hex refusal and the slot-value `namesAct` over `Object.values(fields)`.
     - The block still sits before the sweep line.
     - Only two lines differ:
       - the `swept` initialiser, which is now `sweepText(fs, root)` for every family;
       - the final sweep, which now reads both texts, `namesAct(…, textForms(text)) || (setAside !== text && namesAct(…, textForms(setAside)))`.
   - Pins: the `pins` check and `pinnedRecords` for `LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM_V1_0` (line 956) are unchanged.
   - Rule 6: each mutant replaced one occurrence in `package-reader.ts`, ran `npx vitest run packages/polaris-dossier/src/gate-acts.test.ts` (146 tests), then restored the file. The sha256 was checked back to `15240c6a…`.

     | id | old | new | outcome |
     |---|---|---|---|
     | M1 | `if (OWNER_SELECTION_SLOTS.some(slot => /[0-9a-fA-F]{64}/.test(fields[slot] ?? ''))) return refuse();` | (deleted) | killed (2): "refuses version 2 reading version 1's record, a 64-hex token in its selection label" and "fails closed when its act record has a digest in the packet words" |
     | M2 | `      if (namesAct(family.sweep, '', textForms(Object.values(fields).join('\n')))) {` | `      if (false) {` | killed (2): "a withdrawal of version 2 in its selection label", "a withdrawal of version 1 in its selection label" |

   - The exempt path now runs `namesAct` with the aligned sweep. Only digest-bound forms pass `exempt` (line 767), and their sweep already read `>` lines and loose spellings on main. So the exempt reading of a slot is unchanged [Inferred from the code].

2. The differential is sound, and it reproduces at base and head [Observed].
   - Re-run:
     - Command: `verdicts_over_tree_2.mjs` (sha256 `1f28b56b…`, equal to the record's `tools` entry), run against each worktree at the record's 7 instants.
     - Output: 51 answers per instant, 357 in all, over 223 decisions files. `git ls-files` and `find -type f` both count 223.
     - `decisionsTreeSha256` is `d91011d5…` at both commits, and equal to the record. Both trees are clean.
     - `compare_verdicts.py` exits 0 with `changedCount` 0.
   - Byte agreement with the record:
     - My head runs, as sorted-key JSON, hash to `b0892ec30c6480a597f7b659b88f062dee53144310e2da85698862ef003dd0e5`, the record's `runsSha256`.
     - They are equal as JSON to the retained `verdicts-over-tree-runs-2026-11-16.json`.
   - Non-vacuity, from my baseShapes, identical to the record's:
     - forms: 36 `ok`, 27 `absent`, 7 `refused`;
     - port: 43 satisfied, 62 unsatisfied;
     - policy chain: `ok` at 3 instants, `refused` at 4;
     - gates: 56 satisfied, 14 unsatisfied, 4 `refused`;
     - admission: one record at each instant.
   - Population:
     - The tool walks every export of the consent `dist/index.js` and of the dossier `gate-sources.js` for objects with `file` and `stems`. It finds 10 forms, including the two signoff versions main added (`…SIGNOFF-v1.0.md`, `-v1.1.md`) and the v2 successor statement.
     - It also reads `createPackageAdmissionReader`, `createPackagePolicyReader`, `readPolicyActChain`, `readClassActState`, `readInForceEgress`, every `createPackageGateSources` question, and the records port for each kind × (repository, revision).
     - So every exported reader entry point (listed from the built index) is exercised.
     - Two gate questions, `repositoryIdsFor` and `consentAbsenceFor`, are not asked directly. Both derive from `observationRecords`, which is compared.
     - Every other caller of these readers in `apps/` and `packages/` sits on top of an exported reader: `screen.ts`, `launch-cli.ts`, `source-visibility-gate.ts`, `public-source-screening.ts` and `cli.ts`. `launch-write-consent.ts` has its own reader, which this diff does not touch.
   - The comparator kills planted changes (rule 6):
     - P1 sets `classAct` at 2026-11-15 to `refused` in a copy of my head output. Result: exit 1, 1 changed.
     - P2 deletes `gate:d9` at 2026-10-08. Result: exit 1, 1 changed, as `<missing>`.
     - P3 is a code mutant. In the built head `dist/package-reader.js`, `needles: [POLICY_PATH], fields` became `needles: [POLICY_PATH, POLICY_STEM], fields` (one occurrence). After the run the file was restored, and its sha256 was re-checked to `fe11ef74…`.
     - P3 result: exit 1, **56 of 357 changed**. That equals the record's counterfactual, with the same split:
       - `port:public-source-policy` satisfied→unsatisfied 15, unsatisfied→unsatisfied 20;
       - `policyReader` list→throw 7;
       - `gate:screeningPolicy` and `policyChain` each ok→refused 3, refused→refused 4.
     - No P3 answer moves toward acceptance.
   - What the tool cannot see [Inferred]:
     - `CITATION_ALLOWLIST` is `new Map([])` at both commits, so knob 2's set-aside reading never runs over the tree. Under the head's union it can only add refusals, and it adds none while the list is empty.
     - Worlds other than the current tree are outside the tool by design. The owner condition names only the current tree.
     - Each knob's direction over other worlds is covered by the `act-families.test.ts` before/after rows and by check 3.
     - No verdict-changing path over the current tree was found outside the tool's population.

3. The stem is not aligned, and every other change is toward refusal [Observed in the diff; direction Inferred from the code].
   - `POLICY_FAMILY.sweep` is `{ stems: [SCOPE_STEM], needles: [POLICY_PATH], fields: everyField([POLICY_PATH, POLICY_STEM]), withdrawal: POLICY_STEM }`.
     - `POLICY_STEM` is not a text needle.
     - The folded `POLICY_PATH` does not carry the stem, because `POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY` is not `PWB-…`.
     - The row `text carrying the policy stem alone` pins `['ok','ok','ok','ok']`.
   - Each changed predicate was checked for direction:
     - `>` field lines count in every family;
     - loose reading applies in every family;
     - all four field labels are read;
     - the policy path is a text needle;
     - the recorder lines are read for admission, class and policy, and the provenance line is held whole and by its opening;
     - the supersession field is read for admission, so a repeat refuses, while the admission act ignores its value;
     - a line under the other instant label refuses;
     - the `Act type` pattern widens to `[^`\n]+`. Under `one(...)`, a wider pattern can only raise the match count, so a second type line now refuses, and `type !== form.type` still refuses a wrong single value.
   - Each of these can only add refusals.
   - The allowlist union is the round-2-confirmed F1 repair.
   - Nothing outside `packages/polaris-generation-consent/` and `docs/evidence/syzygy-bpyt-1-24/` changes. `git diff --stat origin/main...HEAD` lists 15 files: none under `.syzygy/**` or `openspec/**`, and no act record.

4. Prose [Observed].
   - The X1 sites are repaired:
     - `act-families.test.ts:213-216` now says "A knob, left unaligned under the stop clause" and cites the 2026-11-15 answer. Its behaviour sentence matches the rows at 205-207 and 220: the stem names the policy "only on a field line, or in a file name beside a withdrawal or revocation word".
     - The `POLICY_FAMILY` docstring states the same reading, and it matches the code above.
   - The PR body's filename paragraph is now accurate: "the stem alone in a file name or in text reads `ok` in every family".
   - Two errors remain: X2 and X3 below.

5. Gates at the head [Observed].
   - `npm run check` exited 1 with 2 failures of 4478:
     - `island-boundary.test.ts`;
     - `diagram-layout.test.ts`.
     - Both were 5000 ms timeouts while my verdict run loaded the machine, and neither file is touched by the PR.
     - Re-run alone, `npx vitest run` on the two files passed 2 files, 46 of 46 tests.
   - `python3 scripts/check_governance.py`: 32 OK, 21 WARN, 0 FAIL.
   - `gh pr checks 640` passes on every row:
     - `checks`;
     - its four sub-jobs: governance, P115, readability, reconciliation;
     - `node`, `node (unit)`, `node (integration)` and `node (e2e)`.

6. Rule 11 [Observed].
   - `verdicts-over-tree-2026-11-16.json` names its subject:
     - the decisions tree by its sha256 (`d91011d5…`, re-derived);
     - each side's `packageReaderSha256`; the head value equals the reviewed head's bytes;
     - both commits;
     - the runs digest (re-derived);
     - the tool digests (re-derived).
   - The runs file names its tool, commit, decisions-tree sha256 and reader sha256.
   - Its head commit is `ffca5d2d`, an ancestor of `9dde4cc2`. `git diff --stat ffca5d2d 9dde4cc2` touches only the four evidence files, and the reader sha256 is the stated anchor.

## Findings

### X2 (exception, low; prose only) — the rewritten `POLICY_FAMILY` docstring miscounts the forms [Observed]

- Anchor: `packages/polaris-generation-consent/src/package-reader.ts:408`, which reads "The policy family: its five forms".
- `POLICY_ACT_FORMS.length` is 8 at both commits: `…PUBLIC-SOURCE-SCOPE-ACT.md` and `-V2-` through `-V8-ACT.md`. This was read from the built index.
- Main said "four", which was also wrong. This PR rewrote the sentence for X1 and introduced a different wrong number.
- Pre-existing, not introduced by this PR: `readPolicyActs` at line 418 says "version 1 to 7".
- Repair: state no count, or derive the count from the list. No answer changes.

### X3 (exception, low; prose only) — the PR body still describes the owner question as open and the merge as unauthorized [Observed]

- Anchor: the PR #640 body as read at head `9dde4cc2`.
- **Outcome** paragraph: it says "policy-stem alignment and the whole-alignment stop disposition remain behind the existing owner gate" and "is not authorized to merge by the retained exact-head technical review".
- **N2, reframed** bullet: it says "pending the owner's decision".
- The trailing "Coordinator disposition 2026-11-05" paragraph:
  - it says the X1 prose "is retained as an unresolved source correction";
  - it says "the current-tree comparison remains Unknown".
- All of these were overtaken by the 2026-11-15 answer, the X1 repair and the 2026-11-16 re-run.
- The new "Excluded under the stop clause" and "Rebase and re-run" paragraphs are correct, so the body contradicts itself.
- Repair: mark each stale sentence at the sentence itself, quoted and dated (the CG-27 lesson). Do not rely on the newer paragraphs to overrule them.

### N1 (note) — two records name commits reachable from no ref [Observed]

- The counterfactual commit `8815f1b7` exists in the local object store, and `git branch -a --contains` finds no branch containing it.
- `c962c7bd`, named by the three 2026-11-04 records, is contained in no remote branch after the rebase.
- Both records store what is needed to re-check them:
  - the counterfactual's `old`/`new` fragment, which this review re-ran (P3, identical result);
  - the 2026-11-04 records carry the reader sha256.
- So they remain re-checkable. The 2026-11-04 records are now historical pre-rebase evidence of `05a8097f…` bytes, not of the head.

### N2 (note) — the README's limits paragraph carries pre-existing stale sentences on a line this PR edited [Observed]

- Anchor: `packages/polaris-generation-consent/README.md:59`.
- The sentences: "no performed act exists today, so the reader returns no record from the live tree", and the 131-file seed count at `5126610b`.
- The admission reader returns one record at every instant over the current tree (check 2).
- Neither sentence was introduced here. They are recorded because the PR rewrote the line that holds them.

### N3 (note) — the differential does not exercise knob 2 [Inferred]

- The allowlist is empty, so the set-aside reading is dead over the tree. The re-run's 0 changes say nothing about that knob.
- Its direction rests on the round-2 confirmation and the test rows, not on this differential. This is correct for the owner's condition, which names only the current tree.
