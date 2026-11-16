# R-GP-IMPL-OBSERVER-GATE-1 — CC-REV-1 implementation review of syzygy-bpyt.56, round 1
Verdict: REVISE
Reviewed commit: 5d73176a
Subject: r1-review.diff sha256 8446d71666e1f44713cc6f753894c56dd8ca15137dce8736a384502513991297

Reviewer: fresh-context CC-REV-1 reviewer (rev-556), 2026-10-28. I did not author the change, and I changed none of its bytes.
I read no observed repository, started no daemon and opened no credential store. Every command ran in my own scratch clones
under `rev-556/`, with private TMPDIRs `/tmp/r556-1` to `/tmp/r556-5`.

One blocking finding (F1): a false sentence in the PR body, repeated in a test comment, about what `scripts/clean_build.mjs`
refuses. The production change is the two prefixes only. Nothing is newly accepted, and every newly refused path is under the two
new prefixes. All 11 lane mutants are killed by real assertion failures. The full suite, the battery and hosted CI are green.
The other findings are notes N1 to N6.

## 1. Subject identity checks

- [Observed] `sha256sum lead/b56/r1-review.diff` gives `8446d71666e1f44713cc6f753894c56dd8ca15137dce8736a384502513991297`.
  `git diff 29db2b11 5d73176a | sha256sum` in my clone gives the same value, so the diff matches.
  `git diff --stat` lists 9 files, 731 insertions and 29 deletions: `apps/three-surface-poc/src/git-observation.ts`, its test,
  and 7 files under `docs/evidence/syzygy-bpyt-56/`.
- [Observed] `git merge-base 29db2b11 5d73176a` is `29db2b11153990f465c0b86fb3341865ae6459ac`.
  `git diff --name-only 29db2b11 ddcc4fb8` names only the two app files. `git diff --name-only ddcc4fb8 5d73176a` names only
  the 7 evidence files.
- [Observed] PR body: `gh pr view 556 -R Tzeusy/syzygy --json body --jq .body | sha256sum` gives
  `ba330287840c91b7bf8d9dc07b99be0670219f0cf33e763c66c3462adcc7415a`. I read it at the start of the review and again at the end,
  and both reads match the frozen digest. `headRefOid` was `5d73176ac26637e4e0597e66d235903df05156b2` at both reads.
- [Observed] The retained tools hash to the values their records carry. `gate_diff.mjs` is `db6960e0…c7d6`, `mutants.py` is
  `0996d1d3…b784`, and `structural.py` is `a40beb51…03f4`.
- [Observed] Main moved during the review. At the start, `git ls-remote … refs/heads/main` returned `29db2b11`. At the end it
  returned `c672492caace634905b4f285434211436bb7fe24`, the merge of PR #554 (112 files). §3.6 covers the merge.

## 2. Clauses relied on, and the class ruling

**CC-REV-1** (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md`):
- l.35: "3. **deterministic observation** — snapshot composition, evaluation identity, the deterministic/inferred seam (VIS-7);"
- l.37: "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
- l.49: "**The change record states** which classes the change touches, or \"none,\""
- l.51: "**A reviewer or the owner** may reclassify at any time."

**GP-Q0** (`OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`):
- l.55: "a consent, security or retention decision."
- l.62: "**Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4 (security), and class-6 pull requests that remove an endpoint."
- l.64: "an old-versus-new differential over a mutated-record corpus that includes records with altered prose;"
- l.65: "a rule-6 mutant for each predicate;"
- l.66: "a non-blocking owner notice in the cycle report."
- l.95–96, the stop clause: "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."

**Follow-ups record** (`OWNER-DIRECTION-GREENFIELD-PARITY-FOLLOWUPS-2026-10-28.md`):
- l.21: "Each answer here is now a listed change for the work it describes, and for nothing wider."
- l.187: "Selected: **\"B: all compiled (Recommended)\"**."
- l.198–205, l.207–208, l.213: quoted item by item in §6.

**Class ruling (mine).**
- **Class 3: touched.** The gate decides whether the daemon starts or re-observes on a dirty observer tree. That decides
  whether the evaluation's observer component names the code that actually runs, which is "evaluation identity".
- **Class 4: touched.** The observed edit this PR plants turns `escapeHtml('<script>')` into `'<script>'` on every surface,
  through `packages/http-host/dist` (`syzygy-bpyt.1.16`, comment of 2026-10-27). The gate's refusal of that tree is therefore a
  "security … decision" in GP-Q0's words (l.55). The newly protected `polaris-generation-consent` is consent code. The
  precedent review of this same gate, `docs/reviews/R-GP-IMPL-OBSERVER-SUPPORT-1-RAW.md` l.59–67, ruled classes 3 and 4,
  and class 1 indirectly. I follow it.
- **Class 1: touched indirectly,** as in that precedent.
- **Classes 2, 5, 6, 7: not touched.** No identity, migration, endpoint or certificate change.
- The PR body and the Q3 record (l.213) say "class 3". Under CC-REV-1 l.51 I reclassify to 3 and 4, with 1 indirectly. This
  adds no check: GP-Q0 l.62 sends class 1, 3 and 4 to the same three extras, and the PR supplies all three.
  - Differential: the corpus is every tracked path plus probes, which is the right corpus for a path predicate. The
    "records with altered prose" arm has no analogue for a path gate.
  - Rule-6 mutants per predicate.
  - The owner notice, which the coordinator posts at landing.
  This is note N1.
- **No owner question is needed.** Q3 lists exactly this change: two prefixes, refuse more, accept nothing new. My differential
  in §5 finds nothing beyond it. The stop clause is met by a notice on `syzygy-bpyt.10`.
  - The extends row (§4, N2) is a new test refusal. It is not a gate decision: no path changes between accepted and refused.
    It refuses no form today's tree uses. It is a precondition of the derived test's exact-input half. I rule it within the
    work Q3 describes (l.21).

## 3. What I ran, and the results

Load average (`/proc/loadavg`, 1/5/15 min) is recorded beside each run.

1. **Full vitest suite at `5d73176a`, every `dist/` absent.** The clone was fresh, followed by `npm ci`.
   `find . -name dist -type d -not -path './node_modules/*' | wc -l` gave `0` both before and after.
   - The command was `TMPDIR=/tmp/r556-1 npx vitest run`, at load 22.47 / 24.25 / 24.45 at the start and 36.47 / 30.86 / 27.01
     at the end. [Observed] The result lines:
     - `Test Files  253 passed | 3 skipped (256)`
     - `Tests  5762 passed | 5 skipped (5767)`
     - `Duration  190.00s`
     - exit 0
   - No file failed, so nothing needed a re-run alone. `git status --porcelain` was empty afterwards.
   - The changed file's line: `✓ |@syzygy/three-surface-poc-app| apps/three-surface-poc/src/git-observation.test.ts (16 tests) 6575ms`.
2. **Hosted CI at `5d73176a`.** [Observed] `gh pr checks 556`:
   - `checks	pass	24m47s`
   - `node	pass	4m10s`
   - `gh run view` gives `headSha 5d73176ac26637e4e0597e66d235903df05156b2` for both runs, with conclusion `success`.
   - The node log carries the same `253 passed | 3 skipped (256)` and `5762 passed | 5 skipped (5767)`.
3. **Governance checks.**
   - [Observed] `python3 scripts/check_governance.py` gives `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`,
     exit 0.
   - [Observed] I ran the PROJECT-STATUS battery block, one command at a time, from the clean clone at `5d73176a`
     (`tools/run_battery.py`). The load was 19.38 / 24.95 / 25.56 at the start and 19.90 / 19.82 / 21.22 at the end. The result
     line is `commands=114 nonzero=0`.
   - [Observed] `npm run typecheck` (`tsc -p tsconfig.json`, noEmit) exits 0 at `5d73176a`. It created no dist.
4. **Lane mutants re-run** (`python3 -I docs/evidence/syzygy-bpyt-56/tools/mutants.py` at `5d73176a`;
   `lane-mutants-rerun-5d73176a.json`). The load was 29.57 / 29.69 / 26.73 before and 29.25 / 29.55 / 26.86 after.
   - [Observed] `"worktreeClean": true`, `"worktreeCleanAfter": true`, unmutated `16` of `16`, `"killed": 11`, `"of": 11`.
   - Every kill is an assertion failure or a derivation `Error`. None is a timeout. The first failing message of each mutant:

| Mutant | Killed by (test) | First message line |
|---|---|---|
| M1 | equality row; core plant row | `AssertionError: expected [ …(53) ] to deeply equal []`; `AssertionError: own outDir: expected true to be false` |
| M2 | "allows unrelated dirty files…"; equality row; cap1-daemon plant row | `expected true to be false`; `expected [ …(18) ] to deeply equal []`; `own outDir: expected true to be false` |
| M3 | equality row | `expected [ …(21) ] to deeply equal []` |
| M4 | equality row | `expected [ …(81) ] to deeply equal []` |
| M5 | "protects the clean-build script…"; equality row | `expected true to be false`; `expected [ 'scripts/clean_build.mjs' ] to deeply equal []` |
| M6 | "protects the HTTP host package…"; equality row | `expected true to be false`; `expected [ …(18) ] to deeply equal []` |
| M7, M8, M9 | equality row, at the 8-project pin | `expected [ 'apps/three-surface-poc', …(8) ] to deeply equal [ 'apps/three-surface-poc', …(7) ]` |
| M10 | extends row | `packages/support: expected 'packages/support/tsconfig.json' to be 'tsconfig.base.json'` |
| M11 | equality row; extends row | `Error: scripts.poc is not "npm run <build> --silent && node <project>/dist/<entry>.js": npm run build:poc && node apps/three-surface-poc/dist/main.js` |

   - Every count matches the retained `mutants-5877559c.json`: failed and passed per mutant, and the 53, 21, 81 and 18 path
     counts.
5. **My own mutants** (`tools/rev_mutants.py`, `rev-mutants-5d73176a.json`, at `5d73176a`; the load was 25.36 / 28.65 / 26.63
   before and 21.27 / 26.94 / 26.18 after; clean before and after; unmutated 16 of 16). Each row records its exact `old` and
   `new`.

| Id | Mutation | Outcome | Killing assertion |
|---|---|---|---|
| B0 | the whole base gate (`29db2b11` bytes) under the head test file | killed (2) | equality `expected [ …(74) ] to deeply equal []`; core plant row `own outDir: expected true to be false`. The cap1-daemon plant row passes |
| R1 | `startsWith(prefix)` → `startsWith(prefix.slice(0, -1))` | killed | equality `expected [ Array(8) ] to deeply equal []` (the `<dir>x/a.ts` siblings) |
| R2 | `startsWith(prefix)` → `includes(prefix)` | **survived** | none (N3) |
| R3 | `'packages/polaris-generation-consent/'` → `'packages/polaris-generation-consent'` | killed | equality `expected [ Array(1) ] to deeply equal []` |
| R4 | `changedPaths.every(` → `changedPaths.some(` | killed | "retains a protected source path when it is renamed out": `expected true to be false` |
| D1 | derivation: the reference walk stops at depth 1 | survived (equivalent on today's tree) | none |
| D1t | tree only: `polaris-generation-consent` references `polaris-dossier` (depth 2 from the app) | killed | pin `…(8) ] to deeply equal [ …(7) ]` |
| D1x | D1 plus the D1t tree | survived | none (N4) |
| D2 | derivation: the import walk drops every `export … from` edge | killed | `Error: the import walk does not reach packages/support/src/sha256.ts` (the sentinel) |
| D2x | D2 plus the lane's M9 tree | killed | the same sentinel |
| D3 | derivation: the build-step parser takes only the first project | killed | pin `expected [ 'apps/three-surface-poc', …(4) ] to deeply equal [ …(7) ]` |
| D4 | derivation: the import walk adds no project | survived (equivalent on today's tree) | none |
| D4x | D4 plus the lane's M9 tree | survived | none (N4) |
| D5 | derivation: no reference walk at all | killed | pin `…(6) ] to deeply equal [ …(7) ]` (consent missing) |

6. **Gate differential.**
   - [Observed] I re-ran the lane's `gate_diff.mjs 29db2b11 5877559c`. The output equals the retained `gate-diff-5877559c.json`
     key for key (`equal except tool: True`, and the tool hash is identical too). The figures are: base 347, head 421, population
     7,800 (7,773 tracked and 49 probes), newly refused 74 (72 tracked), newly accepted 0.
   - [Observed] I re-ran `structural.py 29db2b11 ddcc4fb8`. It equals the retained record except for the head id:
     `exactInputsIdentical` and `returnIdentical` are true, `removed` is `[]`, `added` is the two prefixes, and
     `rootFilesAndTsconfigsChanged` is `[]`.
   - [Observed] My own differential (`tools/gate_diff_rev.mjs`) uses a different method. It transpiles the whole
     `git-observation.ts` at each commit, stubs the `@syzygy/support` import, and imports the real export, instead of slicing
     the function. Its population is 7,897 paths: 7,777 tracked at `5d73176a`, the lane's 49 probes, and 94 probes of my own
     (each workspace's `dist/` outputs, its bare directory name, `./` and upper-case forms, `escape.json` and `node_modules/`,
     plus root-file near-misses). Base `29db2b11` against head `ddcc4fb8`:
     - base refuses 371 and head refuses 453;
     - newly refused 82 (72 tracked), 57 under core and 25 under consent;
     - `newlyRefusedOutsideTwoPrefixes: []` and `newlyAccepted: []`;
     - a mixed observation is refused at both commits, and an empty observation is clean at both.
   - On the merge with current main, see item 7.
7. **Merge with current main.**
   - Before `c672492c` landed, main was `29db2b11`. A local `--no-ff` merge then had tree `4c9fd6a2…`, equal to `5d73176a`'s
     tree. `git-observation.test.ts` plus `main.test.ts` gave `Tests  40 passed (40)` at load 23.71.
   - After main moved, I merged `5d73176a` into `c672492c` (`a994e5d3`, no conflict). #554 touches neither gate file, no
     root file, no `clean_build.mjs` and no project `tsconfig.json` or `package.json` (0 of 112 paths). It does change
     `workspace-reach.testkit.ts`, which the derivation imports.
     - The two test files on the merge gave `Test Files  2 passed (2)` and `Tests  40 passed (40)`, at load 18.68.
     - The lane's `gate_diff` on the merge (`c672492c` against `a994e5d3`): population 7,908 (7,881 tracked), base 347,
       head 421, newly refused 74 (72 tracked; core 53, consent 21), newly accepted 0.
     - My differential on the merge: 8,001 paths, newly refused 82, outside the two prefixes `[]`, newly accepted `[]`
       (`gate-diff-rev-merge-a994e5d3.json`).
8. **Derivation probe** (`tools/zz-rev556-probe.test.ts`). I copied it into the clone for one run, then removed it, and the
   tree was clean afterwards. [Observed]:
   - The import walk from `main.ts` reaches 108 modules in 5 workspaces: `apps/three-surface-poc`, `packages/cap1-core`,
     `packages/http-host`, `packages/support`, `packages/three-surface-poc-core`. It has 0 unresolved edges.
   - With re-export edges dropped, the walk reaches 44 modules in 4 workspaces. `cap1-core` is reached only through a
     re-export.
   - The build list is 7 projects. Reference depth 1 adds `polaris-generation-consent`, and deeper references add nothing,
     giving 8.
   - Every one of the 8 has the extends chain `[<project>/tsconfig.json, tsconfig.base.json]`.
   - `restart-main.ts` reaches only `apps/three-surface-poc` and `packages/support`.
9. **The `clean_build.mjs` claim (F1).** In a scratch tree I copied `scripts/clean_build.mjs` and `tsconfig.base.json` from
   `5d73176a` and wrote the plant row's two tsconfigs byte for byte. `node scripts/clean_build.mjs packages/polaris-generation-core`
   gives, for **both** forms:
   `Error: packages/polaris-generation-core/tsconfig.json: its outputs and incremental state are not both under dist`, exit 1.
   `packages/http-host/dist` stayed empty.
10. **Proposed test fixes** (`tools/rev_fixes.py`, `rev-fixes-5d73176a.json`, at `5d73176a`; load 25.87 at the start and 28.55 at
    the end; clean afterwards):
    - R5 (support's tsconfig extends a tracked `configs/mid.json`, which extends `tsconfig.base.json`) at head: 16 of 16 pass,
      so it **survives**.
    - The N2 and N3 fixes applied with no mutant: 16 of 16 pass.
    - Fixes plus R2: killed, `expected [ …(8) ] to deeply equal []`.
    - Fixes plus R5: killed, `packages/support: expected [ 'configs/mid.json' ] to deeply equal []`.

## 4. Findings

### F1 (blocking): a false sentence in the PR body, and the same claim in the test comment, about the inherited-`outDir` form

- **Severity:** blocking under the verdict rule ("a false sentence in the PR body"). The test bytes still pin what they should;
  the fault is in the disclosure.
- **Evidence.** The PR body, under "The two observed edits as rows", says:
  "Since #549, `scripts/clean_build.mjs` refuses a project's own `outDir` outside dist before it builds anything. It does not read
  an inherited `outDir` (the #549 follow-up), so the inherited form is the one the gate alone stops at build time."
  `git-observation.test.ts:228-230` says: "scripts/clean_build.mjs now refuses a project's own outDir outside dist before building,
  but not one inherited through `extends`, so both forms are planted here".
  - [Observed] `clean_build.mjs:30` refuses unless the tsconfig's **own** `compilerOptions.outDir` is `'dist'`:
    `if (options.outDir !== 'dist' || options.tsBuildInfoFile !== 'dist/.tsbuildinfo' || …) throw`.
  - The inherited plant's own `compilerOptions` is `{ tsBuildInfoFile: 'dist/.tsbuildinfo' }`, so it has no `outDir`, and
    `undefined !== 'dist'` refuses. §3.9 shows the script refusing both planted forms with the same error.
  - [Inferred] No inherited-`outDir` variant can get past the script. Either the own `outDir` is `dist`, and it overrides any
    inherited one, or it is absent or something else, and the script refuses.
  - So the inherited form is **not** a path the gate alone stops, and the brief's question gets a no. What the script really
    does not read through `extends` is `declarationDir` and `outFile`: `syzygy-bpyt.65` item 3, and `docs/reviews/R-GP-IMPL-SOURCE-RESOLUTION-1-RAW.md`
    l.373. The rows remain valid regression pins of the gate's own refusal. B0 shows the core row fails on the base gate and the
    cap1-daemon row passes on both.
- **Failure scenario.** A reader of the landed PR, or of the test comment, believes that removing the gate prefix would leave
  the inherited-`outDir` escape open at build time. They then cost or rank `syzygy-bpyt.65` item 3 and `syzygy-bpyt.57` on a
  premise that is false. The same false premise would carry into the owner notice on `syzygy-bpyt.10`.
- **Exact fix (two replacements, no behaviour change).**
  - PR body: replace the bullet
    `- Since #549, \`scripts/clean_build.mjs\` refuses a project's own \`outDir\` outside dist before it builds anything. It does not read an inherited \`outDir\` (the #549 follow-up), so the inherited form is the one the gate alone stops at build time.`
    with
    `- Since #549, \`scripts/clean_build.mjs\` refuses both planted forms before it builds anything: it requires each project's own \`compilerOptions.outDir\` to be \`dist\`, and the inherited form's tsconfig sets no \`outDir\` of its own. The rows therefore pin the gate's own refusal, beside the build's. What the build does not read through \`extends\` is \`declarationDir\` and \`outFile\` (\`syzygy-bpyt.65\` item 3).`
  - `apps/three-surface-poc/src/git-observation.test.ts`, lines 228–230: replace
    ```
      // gate accepted that tree before syzygy-bpyt.56; through cap1-daemon it refused it. scripts/clean_build.mjs now refuses a project's
      // own outDir outside dist before building, but not one inherited through `extends`, so both forms are planted here and observed
      // as the gate observes them, untracked files included.
    ```
    with
    ```
      // gate accepted that tree before syzygy-bpyt.56; through cap1-daemon it refused it. Both forms are planted, the project's own
      // outDir and one inherited through `extends`, and observed as the gate observes them, untracked files included. Since #549
      // scripts/clean_build.mjs refuses both before building too (a project's own outDir must be dist, and the inherited form sets
      // none), so these rows pin the gate's own refusal, beside the build's.
    ```
  - The test edit is comment-only. Re-run `git-observation.test.ts`, and regenerate `surface-version-*.json`, because the app
    src tree id moves. The other records are unaffected: `gate_diff` reads the function only, and the mutants' fragments
    are elsewhere in the file. The mutant record's `fileSha256` for the test file is not recorded; only the gate's is.

### N1 (note): class statement

The PR body's "CC-REV-1 class" section says "Class 3". I rule classes 3 and 4, with 1 indirectly (§2), following
`R-GP-IMPL-OBSERVER-SUPPORT-1-RAW.md` l.59–67. No check is missing: GP-Q0 sends classes 1, 3 and 4 to the same extras.
- **Action** (with F1's body edit, optional): replace `Class 3: what a gate refuses changes, and here it only refuses more.`
  with `Classes 3 and 4, and 1 indirectly (as the R-GP-IMPL-OBSERVER-SUPPORT-1 review ruled for this gate): what a gate refuses changes, and here it only refuses more.`
- The owner notice on `syzygy-bpyt.10` should name the same classes.

### N2 (note): the extends row checks only the last link of each chain

- **Evidence.** `git-observation.test.ts:222` asserts `chain.at(-1)` is `tsconfig.base.json`. A link between the project's
  tsconfig and the base, outside every protected prefix, passes. The gate then accepts a dirty edit to that link, which
  every build reads.
  - [Observed] R5: support's tsconfig extends `configs/mid.json`, which extends `../tsconfig.base.json`. It survives, 16 of 16
    (§3.10).
  - The comment at l.212, "A protected project that extends another file, or none, fails here", overstates. A project that
    extends another file which itself ends at the base passes.
  - Today's tree uses no intermediate link: all 8 chains have length 2 (§3.8). This is also `syzygy-bpyt.6.16` item 2
    ("every extends target of each reached tsconfig.json, followed transitively").
- **Exact fix** (verified in §3.10: it passes today and kills R5). After l.222 add:
  ```
      expect(chain.filter((link) => link !== 'tsconfig.base.json' && !projects.some((dir) => link.startsWith(`${dir}/`))), project).toEqual([]);
  ```
  and at l.212 change "A protected project that extends another file, or none, fails here." to "A protected project whose chain
  ends anywhere else, or passes through a file outside every protected project, fails here."
- It refuses more trees in a test only and changes no gate decision.

### N3 (note): the equality row's population has no path that carries a protected prefix in the middle

- **Evidence.** [Observed] R2 (`startsWith` → `includes`) survives. No tracked path and no probe contains a protected prefix
  after its first segment. The row's claim, "requires the gate to refuse exactly those", holds only over a population that
  cannot tell `startsWith` from `includes`.
  - [Inferred] R2 refuses more, never less, so it is not a hole that accepts a dirty input. It would refuse, for example, a
    future `docs/evidence/packages/support/…` record.
- **Exact fix** (verified in §3.10). In the probe list, add `` `docs/${dir}/a.ts` `` after `` `${dir}x/a.ts` ``, and change
  `toHaveLength(49)` to `toHaveLength(61)`. The PR body figure "49 probes" then becomes 61, and the per-workspace count goes
  from four probes to five.

### N4 (note): two derivation arms are exercised only by tree changes the record does not hold, or by one mutant

- **Evidence.** [Observed] On today's tree, D1 (the reference walk at depth 1) and D4 (an import walk that adds no project) are
  equivalent mutants. No project is reachable only at reference depth 2 or more, and every workspace `main.ts` imports is also
  compiled (§3.8).
  - So the 8-project pin cannot tell either derivation from the real one today.
  - The transitive arm is exercised by no lane mutant. D1t kills, but D1x survives.
  - The import arm is exercised only by the lane's M9: D4x survives.
  - This is not a defect in the test, which derives correctly (D1t is killed). It is a gap in the rule-6 record's coverage of
    the derivation the PR body describes.
- **On the pin.** The pin does not defeat the derivation. It makes any change in the derived set fail first, as a reviewable
  literal diff, as M7 to M9, D1t, D3 and D5 show. The equality half is exercised by every gate mutant (M1 to M6, B0, R1, R3).
  - Once a maintainer updates the pin, the equality half then fails unless the gate is moved too. The PR body's
    "[Inferred] … it is not reached" is accurate.
- **Action.** At the next regeneration of the mutant record, or in `syzygy-bpyt.6.16`, add D1t as a lane row: "the consent
  package's tsconfig references polaris-dossier, depth 2 from the app". It would pin the transitive arm against a future
  depth-1 rewrite.

### N5 (note): failure output and brittle size pins

- `expect(workspaces).toHaveLength(12)` and `expect(probes).toHaveLength(49)` (l.201, l.204) fail on a 13th workspace even when
  the gate is right, and the message, "expected … to have a length of 12", does not name a gate defect.
- The equality failure lists the mismatched paths but not which way each is wrong: wrongly accepted, or wrongly refused.
- **Action, optional:** drop the two length pins, or carry a message that says what the count is for. Map each mismatch to
  `` `${path}: ${isInput(path) ? 'accepted' : 'refused'}` `` before `toEqual([])`.

### N6 (note): `syzygy-bpyt.6.16` describes rows this PR removes

`syzygy-bpyt.6.16` items 1 to 4 refer to "the drift guard" (the removed subset row) and its G1/G6 sibling mutants.
- [Observed] This PR's `<dir>x/a.ts` probes now kill the G1-style mutant (R1, R3).
- Item 2 is partly met by the extends row (N2).
- Item 1 still applies to `pocStartInputs`' import walk: computed `import()` and `createRequire`.
- **Action:** at disposition, update that bead's text to the rows as landed.

## 5. Every changed gate decision

- [Observed] The production diff of `git-observation.ts` is a 3-line comment rewrite plus two added array entries,
  `'packages/polaris-generation-core/'` and `'packages/polaris-generation-consent/'`. `exactInputs`, the six existing prefixes,
  and the `return` predicate are byte-identical (structural re-run, §3.6).
- [Observed] Over every tracked path at `5d73176a` plus 143 probes (7,897 paths), base against head:
  - Newly refused: 82, every one under the two new prefixes. That is 57 under `packages/polaris-generation-core/` and 25 under
    `packages/polaris-generation-consent/`, and 72 of the 82 are tracked.
  - The 10 untracked ones are my probes and the lane's: `dist/.tsbuildinfo`, `dist/index.js`, `escape.json`,
    `node_modules/x/index.js` and `src/__untracked__.ts`, under each of the two packages.
  - The 72 tracked paths are the ones the retained `gate-diff-5877559c.json` lists, which my re-run reproduced exactly.
  - Newly refused outside the two prefixes: `[]`. Newly accepted: `[]`.
- [Observed] The same holds on the merge with current main `c672492c` (§3.7).
- There is no other changed decision.

## 6. Verdict on each item the Q3 record names

| Q3 item (record line) | Verdict | Evidence |
|---|---|---|
| "add `packages/polaris-generation-core/` and `packages/polaris-generation-consent/` to the gate" (l.198–199) | Met | §5; `git-observation.ts:191-192` |
| "keep `packages/cap1-daemon/` while `build:poc` builds it" (l.199–200) | Met | prefix kept; `build:poc` still names `packages/cap1-daemon`; M2 killed three ways |
| "replace the list test with a derived equality test … (the projects of the build step the `poc` script runs, every project their tsconfig references reach, and the import closure)" (l.201–204) | Met | The literal-list row and the subset row are removed. `pocStartInputs` derives all three arms from `package.json`, the tsconfigs and the import walk. The equality is two-sided (M4 and R3 killed). Notes N2–N5 |
| "record both observed edits as mutation rows" (l.205) | Met | `it.each` over both projects plants the `syzygy-bpyt.1.16` edit (an outDir into `packages/http-host/dist` plus an untracked `src/escape-html.ts` that does not escape) through a scratch repository and the real `observeGitRepository`. B0: the core row fails on the base gate, and the cap1-daemon row passes on both. The rule-6 rows M1 and M2 are killed by them. F1 corrects their disclosure |
| "`build:poc`, the tsconfig references and the three root files stay as they are" (l.207–208) | Met | `rootFilesAndTsconfigsChanged: []`; the diff names 9 files, none of them a manifest, tsconfig or root file |
| "The gate refuses more and accepts nothing new" (l.208) | Met | §5: newly accepted `[]` on two methods and two bases |
| "Review: CC-REV-1 class 3" (l.213) | Met, reclassified | this review; I rule 3 and 4, with 1 indirectly (N1) |
| Nothing beyond the direction | Met | the production change is the two prefixes and a comment. The extends row is a test-only precondition (§2) |

## 7. Test quality

Bar: `.claude/skills/th-engineering/subskills/test-rigor/SKILL.md` at `5d73176a`.
- l.42: "**A test is worth keeping only if some plausible bug makes it fail.**"
- l.64–67: "**No tautologies** … Expected values are literals or independently derived."
- l.82–84: "**A failure names the defect** … A maintainer should localize the bug from failure output alone."
- l.93–95: "**Growth is governed** — A test is worth *adding* only if it catches a plausible bug no existing test catches".

- **Equality row.** It is independently derived, satisfying l.64–67. The population comes from `package.json`, the tsconfigs
  and the import walk, and the expected set is a literal pin.
  - The plausible bugs (l.42) are a missing prefix, an extra prefix, a narrowed prefix, a slash-less prefix, a dropped exact
    input, and a build, reference or import change. Each is killed: M1 to M9, R1, R3 and B0.
  - Gaps: R2 (N3), and the D1/D4 coverage (N4).
- **Extends row.** It catches a project leaving the base (M10). It misses an unprotected intermediate (N2).
- **Plant rows.** These are real behaviour: the real `observeGitRepository` over a real repository, including the untracked
  files, with a per-form label in each message.
  - They are the only rows that pin the observed edit end to end. Under l.93–95 they earn their place, because the equality
    row cannot see untracked-file observation.
- **Net delta:** 14 tests become 16. Two are removed (both covered: M1, M2, M6 and B0 kill the equality row), and four are
  added.
- **Failure messages (l.82–84).** The plant rows and the extends row name the project and the form. The equality row names the
  paths but not the direction (N5).
- **Determinism.** [Observed] The file passed 16 of 16 in five separate unmutated runs: the full suite, the lane-tool baseline,
  my mutant baseline, and the two merges.
  - Each plant row uses its own `mkdtemp` repository with `gc.auto 0` and `maintenance.auto false`, is cleaned in `afterEach`,
    and reads no clock.
- **Durations** under load 25 to 29, from the JSON reporter at `5d73176a`:
  - equality row 174.6 ms;
  - extends row 60.5 ms;
  - core plant row 250.8 ms;
  - cap1-daemon plant row 238.2 ms.
  In the merge run at load 23.7 the same rows took 428 ms, 538 ms and 549 ms (the extends row was under the reporter's slow
  threshold). The whole file took 6,575 ms inside the loaded full suite.

## 8. Cleanup

- I deleted both scratch clones (`rev-556/clone`, `rev-556/clone2`), the `clean_build` scratch tree and the scratch transpile
  directory. I deleted `/tmp/r556-1` through `/tmp/r556-5`, my only TMPDIRs, and deleted nothing else in `/tmp`.
- I deleted the governance, battery, typecheck and `npm ci` logs, the PR body copy, and the run markers. Their result lines are
  quoted above.
- I killed no process.

Kept files (paths relative to `rev-556/`):

| File | sha256 |
|---|---|
| `full-suite.log` | `0f1d8c3bae4cb2deacd80500048a0d908d92fa6ec66614d1781d1e7a2ab46c92` |
| `gate-diff-rev-5d73176a.json` | `684ef1f9bdd2b1eaa163bd5bc22ca46a4a81b7d5750fb9fce625cf8d290cc172` |
| `gate-diff-rev-merge-a994e5d3.json` | `391756b1f1beac26ea0227df1b20f390bb9b4c280eaa013a70b9bea0eeb5a80a` |
| `lane-mutants-rerun-5d73176a.json` | `767f60de581f5b5ed7f8a2fe0b4a2307b1357bf6383881a7fab9e746f57c62b2` |
| `probe-out.txt` | `dfb8c4745796f0d86caba48b0d7bb6d578f2ec69e6a34e51f6ea70960e1e0d2f` |
| `rev-fixes-5d73176a.json` | `a0c669915c01fcef39c086f692dc00d5895d86e6540abf4f2bb7a5d487b6d4b6` |
| `rev-mutants-5d73176a.json` | `c8309cd2076d51b7ed7c77506a4901c3a97f24866460e2e09bafe94dc983abfc` |
| `tools/gate_diff_rev.mjs` | `a90ec8a0d6028e90197242690140ca96f4b3afab37987821e080345d09e7dad3` |
| `tools/rev_fixes.py` | `6bd9045ad304fe4233615cac5d34196b7ba62a82f981e8347a26a14aa035d654` |
| `tools/rev_mutants.py` | `e70034eab755e03648827889436af28f6a67cf2fa37f85a36dd06758c8071a00` |
| `tools/run_battery.py` | `3de6db7c94e03acc07a60db918e9e567e52ad30ad1e406ff07b5cb952ddec124` |
| `tools/zz-rev556-probe.test.ts` | `251031e5e8d689ad281d4a15ea780f723b14456ff99ccf171e0d3897905c5f94` |

The raw review itself is `R-GP-IMPL-OBSERVER-GATE-1-RAW.md`; its digest is given in the reply, not here.
