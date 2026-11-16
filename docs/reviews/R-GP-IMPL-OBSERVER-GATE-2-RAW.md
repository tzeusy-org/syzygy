# R-GP-IMPL-OBSERVER-GATE-2 — CC-REV-1 implementation review of syzygy-bpyt.56, round 2
Verdict: REVISE
Reviewed commit: 8994af16
Subject: r2-review.diff sha256 8029aa4156b7f84fd11d478500f24034ecdb13063d2616548ade73e118c08944

Reviewer: fresh-context CC-REV-1 reviewer (rev-556-r2), 2026-10-28 to 2026-10-29. I did not author the change or its round-1
review, and I changed none of its bytes. I read no observed repository, started no daemon and opened no credential store. Every
command ran in my own scratch clones under `rev-556-r2/`, with private TMPDIRs `/tmp/r556b-1` to `/tmp/r556b-6`.

Every round-1 item is met, and each applied text is the round-1 raw's exact text. The gate is byte-identical to round 1's, the
production change is still the two prefixes, nothing is newly accepted and every newly refused path is under the two prefixes. All
14 lane mutants die by the assertions the record names, R2 and R5 by the ones round 1 named. The full suite, the battery and hosted
CI are green. One blocking finding (F1): the PR body's list of new test refusals omits one. The derived test now refuses a tree
whose tsconfig names a reference by its file, a form TypeScript accepts and the base test accepted. The fix is a body sentence;
no byte of the branch changes. Notes N1 to N4.

## 1. Subject identity checks

- [Observed] `sha256sum lead/b56/r2-review.diff` gives `8029aa4156b7f84fd11d478500f24034ecdb13063d2616548ade73e118c08944`, and
  `git diff c672492c 8994af16 | sha256sum` in my clone gives the same. `git diff --stat` lists 15 files, 1500 insertions and 29
  deletions: `apps/three-surface-poc/src/git-observation.ts`, its test, and 13 files under `docs/evidence/syzygy-bpyt-56/`.
- [Observed] `git merge-base c672492c 8994af16` is `c672492caace634905b4f285434211436bb7fe24`. The branch head from
  `git ls-remote` is `8994af16e5ae735aa3d6f26a925c93e4a0ad7f45`, the PR's `headRefOid` is the same, and the PR is `OPEN`.
- [Observed] The reading aid: `git diff 5d73176a 8994af16 -- <the 15 paths> | sha256sum` gives
  `cfb85ef05fb2e5d17f69f27a4611b04911031e88a6eabae135262c8d3b353cf3`, matching `lead/b56/r1-to-r2.diff`.
  `git diff 5d73176a 8994af16 -- apps/three-surface-poc/src/git-observation.ts` is empty (0 bytes): confirmed.
- [Observed] The gate file's blob is `39d47e4f8302088f8d164c6956f078b698ee6a51` at `ddcc4fb8`, `5d73176a`, `40e5fd23`, `40dd84f1`
  and `8994af16`, and `38d037aee4ca0584dd4967daf7c226707161f47a` at both `29db2b11` and `c672492c`. Its sha256 at `8994af16` is
  `dfe1e173deb17ac96c9cf2420c676f6e81a615271efec2f58bbd2bed5872ea52`, the `fileSha256` every gate row of `mutants-40dd84f1.json`
  carries.
- [Observed] Commit roles: `git diff --name-only 5d73176a 40e5fd23` names the test file, `tools/gate_diff.mjs` and
  `tools/mutants.py`. `92099a3e..40dd84f1` names `tools/gate_diff.mjs` and `tools/surface_version.py`. `40dd84f1..8994af16` names
  only the five new records.
- [Observed] PR body: `gh pr view 556 -R Tzeusy/syzygy --json body --jq .body` hashes to
  `b0fd586a51d459d3d76ef00bc020ba159484842c140d1d4e7d8256428356c78d`, the frozen digest, at the start of the review and again at
  the end (§8).
- [Observed] Main did not move: `git ls-remote … refs/heads/main` returned `c672492caace634905b4f285434211436bb7fe24` at the start,
  in the middle and at the end (§8).

## 2. Clauses relied on, and the class ruling

**CC-REV-1** (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md`):
- l.18-20: "Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the agent performing
  the change never finally decides which classes it touches."
- l.35-36: "3. **deterministic observation** — snapshot composition, evaluation identity, the deterministic/inferred seam (VIS-7);"
- l.37: "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
- l.49-50: "**The change record states** which classes the change touches, or \"none,\" so a misclassification is a findable
  violation after the fact."
- l.51: "**A reviewer or the owner** may reclassify at any time."

**GP-Q0** (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`):
- l.55: "a consent, security or retention decision."
- l.62: "**Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4
  (security), and class-6 pull requests that remove an endpoint."
- l.64-66: "an old-versus-new differential over a mutated-record corpus that includes records with altered prose;" "a rule-6 mutant
  for each predicate;" "a non-blocking owner notice in the cycle report."
- l.95-96, the stop clause: "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."

**Follow-ups record** (`OWNER-DIRECTION-GREENFIELD-PARITY-FOLLOWUPS-2026-10-28.md`):
- l.21: "listed change for the work it describes, and for nothing wider."
- §"Q3", l.198-213: "add `packages/polaris-generation-core/` and `packages/polaris-generation-consent/` to the gate, and keep
  `packages/cap1-daemon/` while `build:poc` builds it;" "replace the list test with a derived equality test in
  `apps/three-surface-poc/src/git-observation.test.ts` (the projects of the build step the `poc` script runs, every project their
  tsconfig references reach, and the import closure);" "record both observed edits as mutation rows." "`build:poc`, the tsconfig
  references and the three root files stay as they are. The gate refuses more and accepts nothing new." "Review: CC-REV-1 class 3."

**Class ruling (mine), given as notice, not as a question.**
- **Class 3: touched.** The gate decides whether the daemon starts or re-observes on a dirty observer tree, so it decides whether
  the evaluation's observer identity names the code that runs ("evaluation identity", l.35-36).
- **Class 4: touched.** The planted edit makes `escapeHtml` a no-op on every surface, so refusing that tree is "a … security …
  decision" (GP-Q0 l.55); `polaris-generation-consent` is consent code.
- **Class 1: touched indirectly**, as round 1 and `docs/reviews/R-GP-IMPL-OBSERVER-SUPPORT-1-RAW.md` ruled for this gate.
- **Classes 2, 5, 6, 7: not touched.**
- The PR body now states "Classes 3 and 4, and 1 indirectly", so the change record and my ruling agree (CC-REV-1 l.49-51). Q3's
  "class 3" is the owner's floor, and GP-Q0 l.62 sends 1, 3 and 4 to the same three checks. The PR supplies the path-by-path
  differential, a rule-6 mutant per predicate, and the coordinator's owner notice. The "records with altered prose" arm has no
  analogue for a path predicate.
- **No owner question.** No gate decision changes beyond the two prefixes Q3 lists (§6), so the stop clause is met by the notice.
  F1 is a test refusal, not a gate decision; it is within "the work it describes" (follow-ups l.21) and needs listing, not a ruling.

## 3. What I ran, and the results

Load average (`/proc/loadavg`, 1/5/15 min) is recorded beside each run.

1. **Full vitest suite at `8994af16`, every `dist/` absent.** Fresh clone, `npm ci` (exit 0, "added 117 packages").
   `find . -name dist -type d -not -path './node_modules/*' | wc -l` gave `0` before and after; `git status --porcelain` was empty
   after. Command `TMPDIR=/tmp/r556b-6 NO_COLOR=1 npx vitest run`, load 44.40 / 35.88 / 30.13 at the start and 40.04 / 38.94 / 32.71
   at the end. [Observed] Result lines:
   - `Test Files  253 passed | 3 skipped (256)`
   - `Tests  5783 passed | 5 skipped (5788)`
   - `Duration  231.82s (transform 35.28s, setup 4.79s, collect 132.64s, tests 892.71s, environment 102ms, prepare 45.22s)`
   - exit 0. No file failed, so nothing needed a re-run alone.
   - `✓ |@syzygy/three-surface-poc-app| apps/three-surface-poc/src/git-observation.test.ts (16 tests) 6213ms`
2. **Hosted CI at `8994af16`.** [Observed] `gh pr checks 556`: `checks	pass	23m56s` and `node	pass	4m6s`. `gh run list` gives
   `headSha 8994af16e5ae735aa3d6f26a925c93e4a0ad7f45`, conclusion `success`, for both `node-ci` (run 40699636000) and
   `governance-docs` (run 40699635997). The node log carries `Test Files  253 passed | 3 skipped (256)` and
   `Tests  5783 passed | 5 skipped (5788)`, and its git-observation line says `16 tests`. The governance log carries
   `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`.
3. **Governance, typecheck and battery at `8994af16`.**
   - [Observed] `python3 scripts/check_governance.py`: `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`.
   - [Observed] `npm run typecheck` (`tsc -p tsconfig.json`): exit 0, and it created no dist.
   - [Observed] I ran the PROJECT-STATUS battery block, one command at a time, from the clean clone at `8994af16`, with round 1's
     runner (`rev-556/tools/run_battery.py`, sha256 `3de6db7c…c124`). The load was 29.63 / 36.27 / 32.22 at the start and
     31.62 / 34.07 / 31.99 at the end. The result line is `commands=114 nonzero=0`, exit 0. The tree was clean and dist-free after.
4. **Lane mutants re-run** (`python3 -I docs/evidence/syzygy-bpyt-56/tools/mutants.py` in the clean clone at `8994af16`, whose gate
   and test bytes are those of `40dd84f1`; `lane-mutants-rerun-8994af16.json`; load 25.22 / 22.87 / 25.08 before, 33.72 / 27.33 /
   26.48 after). [Observed] `"worktreeClean": true`, `"worktreeCleanAfter": true`, unmutated 16 of 16, `"killed": 14`, `"of": 14`,
   tool sha256 `c139b49b0e6fddcc060815ad57bef1939f86854781d19a2beb5e006daf429a47` (equal to the record's). For every mutant, the
   edits (old, new and `fileSha256`), the failed and passed counts, and each failing test's name and first message line equal
   `mutants-40dd84f1.json` exactly (a scripted per-row comparison returned `True` 14 times). After the run `configs/` did not exist
   in the clone, and `git check-ignore -v configs/mid.json` exits 1, so `git status --porcelain` would have shown a leftover.
5. **My own mutants** (`tools/rev_mutants_r2.py`, `rev-mutants-r2-8994af16.json`, at `8994af16`; gate sha256 `dfe1e173…ea52`, test
   sha256 `6809f8e249089645…9a63`; clean before and after; unmutated 16 of 16; load 34.72 / 29.94 / 27.54 before, 43.82 / 34.31 /
   29.35 after). Each row records its exact `old` and `new`.

| Id | Mutation | Outcome | Killing assertion (first line) |
|---|---|---|---|
| B0 | the base gate (`29db2b11` bytes) under the head test file | killed (2) | equality `expected [ …(74) ] to deeply equal []`; core plant row `own outDir: expected true to be false` |
| R1 | prefixes compared without their trailing slash | killed | equality `expected [ …(8) ] to deeply equal []` |
| R2 | `startsWith(prefix)` → `includes(prefix)` | killed | equality `expected [ …(8) ] to deeply equal []`; the default reporter lists the 8 as `docs/<dir>/a.ts: refused`, one per protected project (`diff-output-R2.txt`) |
| R2-N3 | R2, with the `docs/<dir>/a.ts` probe removed and the pin back at 49 | survived | none: the N3 probe carries the kill |
| R3 | `'packages/polaris-generation-consent/'` without its slash | killed | equality `expected [ Array(1) ] to deeply equal []` |
| R4 | `changedPaths.every(` → `changedPaths.some(` | killed | rename row `expected true to be false` |
| M4dir | the lane's M4 (an extra `packages/polaris-dossier/` prefix) | killed | equality `expected [ …(81) ] to deeply equal []`; the reporter lists 81 entries, every one under `packages/polaris-dossier/` and ending `: refused` (`diff-output-M4.txt`) |
| M5dir | the lane's M5 (`scripts/clean_build.mjs` dropped) | killed (2) | equality `expected [ 'scripts/clean_build.mjs: accepted' ] to deeply equal []`; the clean-build row |
| R5-N2 | the lane's R5 tree, with the N2 assertion line removed | survived | none: the N2 assertion carries the kill |
| N2ok | support's tsconfig extends a new `packages/cap1-core/mid.json`, which extends the base | passed, 16 of 16 | none, as intended: a link under a protected project is protected |
| N2dossier | support's tsconfig extends a new `packages/polaris-dossier/mid.json`, which extends the base | killed | extends row `packages/support: expected [ 'packages/polaris-dossier/mid.json' ] to deeply equal []` |
| D1 | derivation: the reference walk stops at depth 1 | survived | none (equivalent on today's tree, as in round 1) |
| D1x | D1 plus the lane's D1t tree | survived | none: under a depth-1 rewrite the D1t row would report survived |
| D4x | derivation: the import walk adds no project, plus the lane's M9 tree | survived | none: under that rewrite the M9 row would report survived |
| P1 | the probe list gains a sixth per-workspace probe | killed | `five probes per workspace and the program's near-miss; a changed count means the probe list changed: expected [ 'apps/syzygy/package.json', …(72) ] to have a length of 61 but got 73` |

6. **Gate differential.**
   - [Observed] The lane's `gate_diff.mjs 29db2b11 40dd84f1` and `gate_diff.mjs c672492c 40dd84f1`, `structural.py 29db2b11 40dd84f1`
     and `surface_version.py 29db2b11 c672492c 40dd84f1`, re-run in my clone, each equal their retained record as parsed JSON
     (`True` four times): `gate-diff-40dd84f1.json`, `gate-diff-main-c672492c-40dd84f1.json`, `structural-40dd84f1.json`,
     `surface-version-40dd84f1.json`.
   - [Observed] Their figures: population 7,921 (7,882 tracked at `40dd84f1`, 61 probes, 12 workspaces; 22 probes are tracked
     paths); base refuses 347 and head 421, against either base; newly refused 74, 72 of them tracked, `packages/polaris-generation-core`
     53 and `packages/polaris-generation-consent` 21; newly accepted 0. The 74 are the 72 tracked files under the two prefixes at
     `8994af16` (52 and 20, the same counts at `29db2b11` and `40dd84f1`) plus each package's `src/__untracked__.ts` probe.
   - [Observed] My own method (`tools/gate_diff_r2.mjs`: it transpiles the whole `git-observation.ts` at each commit with the
     `@syzygy/support` import stubbed and imports the real export). Population 8,081 paths: 7,887 tracked at `8994af16`, the lane's
     61 probes, and 157 of my own (round 1's 94, plus `x/<dir>/a.ts`, a backslash form, `<dir>/`, `<dir>//a.ts` and
     `node_modules/<dir>/a.ts` per workspace, and three root near-misses). Base `29db2b11` against head `8994af16`:
     - base refuses 384 and head refuses 470;
     - newly refused 86 (72 tracked; 59 under core and 27 under consent), the 14 untracked being probes under the two prefixes;
     - `newlyRefusedOutsideTwoPrefixes: []` and `newlyAccepted: []`;
     - a mixed observation is refused at both commits and an empty one is clean at both.
     The same figures hold with main `c672492c` as the base (`gate-diff-r2-main-c672492c.json`).
7. **Merge with current main.** Main was `c672492c`, an ancestor of `8994af16`. A local `--no-ff` merge (`7461a6ff`) has tree
   `eadb9ca91b940cb3e841749b293ddee21eaccb45`, equal to `8994af16`'s. `git-observation.test.ts` plus `main.test.ts` on it gave
   `Test Files  2 passed (2)` and `Tests  40 passed (40)`, at load 26.45 / 29.81 / 32.31.
8. **Exact texts** (`tools/exact_texts.py`, `exact-texts-8994af16.jsonl`). It extracts each replacement text from the round-1 raw
   by line and tests it against the PR body and `git show 8994af16:<test file>`. [Observed] All ten checks are `true`: the F1
   bullet is present and the old bullet absent; the F1 comment (raw l.230-233, less the raw's 4-column list indent) is the test's
   l.230-233 and the old comment is absent; the N1 sentence; the N2 assertion line and comment sentence; the N3 probe and
   `toHaveLength(61)` with no `toHaveLength(49)`; the N5 mapping. Self-test: against a body with two one-character edits and the
   test file at `5d73176a`, every check returns `false`.
9. **The test refusals the body does not list** (`tools/unlisted_refusals.py`; `unlisted-refusals-8994af16.json` and
   `unlisted-refusals-29db2b11.json`; each run clean before and after; load 22.54-27.68). Two tree forms, run under the head test
   file and the base test file:
   - **F**: `apps/three-surface-poc/tsconfig.json`'s reference `"path": "../../packages/http-host"` becomes
     `"path": "../../packages/http-host/tsconfig.json"`. [Observed] Head: exit 1, 2 failed, 14 passed. The equality row and the
     extends row both fail with `Error: ENOTDIR: not a directory, open '…/packages/http-host/tsconfig.json/tsconfig.json'`. Base:
     exit 0, 14 of 14 pass.
   - **J**: `main.ts` gains `import '../../../package.json';`. [Observed] Head: both rows fail with
     `Error: package.json: in no workspace`. Base: the subset row fails too, with
     `expected [ 'package.json/package.json', …(1) ] to deeply equal []`. So J is no new refusal.

## 4. Findings

### F1 (blocking): the body's list of new test refusals omits one, a tsconfig reference written as a file

- **Severity:** blocking under the verdict rule, as "a refusal the body does not list". No gate decision changes, and the test's
  fail-closed behaviour is right; the defect is the disclosure, and the fix is the body only.
- **Evidence.**
  - The body's "These are the new test refusals" bullet says the equality row "also throws on a `poc` or build script of another
    shape, or on an unresolved import."
  - `pocStartInputs` (`git-observation.test.ts:90-95`) reads `` `${project}/tsconfig.json` `` for every build-step project and every
    reference target, `posix.join(project, reference.path)`. TypeScript accepts a reference `path` that names a directory or the
    config file itself. Today's tree uses only directories (the unmutated run passes).
  - [Observed] §3.9 F: a reference written as `../../packages/http-host/tsconfig.json` makes both the equality row and the extends
    row throw `ENOTDIR`, at `8994af16`. The base test (`29db2b11`) passes the same tree, 14 of 14. So the PR adds a test refusal the
    list omits.
  - [Inferred: from `git-observation.test.ts:93`; not run] A build-step project or reference target whose directory holds no
    `tsconfig.json` throws `ENOENT` the same way.
  - The `<module>: in no workspace` throw (l.104) is not listed either. It is not new: §3.9 J shows that the base test refused the
    same tree through its subset row. I fold it into the fix so the list is complete.
- **Failure scenario.** A maintainer converts the app's references to the file form, which TypeScript documents and accepts. The
  POC build is unaffected, but both rows of this file fail with an `ENOTDIR` that names no gate defect. The owner notice and the
  landed body list every new refusal but this one. The reader then takes the list as complete and either "fixes" the gate or relaxes
  the derivation.
- **Exact fix (PR body only; no file changes).** Replace the bullet
  `` - `refuses exactly the projects the POC start compiles or loads, and the files that define its build` fails when the gate and the derived set differ. It also throws on a `poc` or build script of another shape, or on an unresolved import. ``
  with
  `` - `refuses exactly the projects the POC start compiles or loads, and the files that define its build` fails when the gate and the derived set differ. It also throws on a `poc` or build script of another shape, on an unresolved import, on an imported module that lies in no workspace, and on a project the build step or a tsconfig reference names that is not a directory holding a `tsconfig.json`. The last includes a reference whose `path` names a tsconfig file rather than its directory: TypeScript accepts that form, today's tree does not use it, and the base test accepted such a tree. The extends row reads the same derived set, so it throws the same way. ``
  The owner notice on `syzygy-bpyt.10` should carry the same sentence. Because only the body changes, round 3 can confirm it by
  hashing the new body and checking that this text is present.

### N1 (note): two records carry thinner identity than rule 11 asks, and one names no test digest

- **Evidence.** [Observed] `structural-40dd84f1.json` (like its `5877559c` sibling) has no `subject` field and no tool digest. It
  also carries no digest of the texts it compares; only the `base` and `head` commit ids identify them. `surface-version-40dd84f1.json`
  names its subject and the tree ids, but not its tool's digest. `mutants-40dd84f1.json` records `fileSha256` for each mutated
  file and the commit, but not the sha256 of `git-observation.test.ts`, the file whose assertions kill (round 1 noted this too).
  The commit ids do pin every byte, so each record can still be re-checked; nothing is false.
- **Action (at the next regeneration, or in a follow-up bead).**
  - Have `structural.py` print `"subject": "pocObserverInputsAreClean's text, base against head"`,
    `"tool": {"path": …, "sha256": …}`, and the sha256 of each side's function text, as `gate_diff.mjs` does.
  - Have `surface_version.py` print its own `tool` digest.
  - Have `mutants.py` record `"testSha256"` for each file in `TEST`.

### N2 (note): the round-1 records name tool bytes that are no longer at their paths

- **Evidence.** [Observed] `gate-diff-5877559c.json` names `tools/gate_diff.mjs` with sha256 `db6960e0…`, and
  `mutants-5877559c.json` names `tools/mutants.py` with `0996d1d3…`. The files at those paths now hash to `d5f86cdf…` and
  `c139b49b…`. The body's "The round-1 records at `5877559c` stay beside them, valid for that commit" is true, and the digests make
  the mismatch detectable. Still, nothing tells a re-runner to take the tool as of `5877559c`; run from the tree, it gives 61
  probes, not the record's 49.
- **Action (optional, body or a follow-up bead).** Add to the Evidence section: "Re-run a `5877559c` record with its tool as of
  that commit (`git show 5877559c:docs/evidence/syzygy-bpyt-56/tools/<tool>`); the tools in the tree are the `40dd84f1` versions."

### N3 (note): the applied N2 comment sentence was not rewrapped

- **Evidence.** [Observed] `git-observation.test.ts:213` is 156 columns. Every other comment line in the file is 133 columns or
  fewer, and the comments wrap at about 132. The text is round 1's exact sentence, so this is layout only.
- **Action (optional, at the next edit of this file).** Replace l.212-213 with
  ```
    // A tsconfig.base.json every protected project's own tsconfig.json extends, so the root file the gate protects is the one each
    // build reads its options from. A protected project whose chain ends anywhere else, or passes through a file outside every
    // protected project, fails here.
  ```

### N4 (note): the lane's added comment clause is accurate, but the sentence it extends does not name the failure it adds

- **Evidence.** The lane's own clause on the equality row's comment (l.186): "…a manifest, a tsconfig, an untracked module and a
  sibling directory that only shares the name's start, and a path under docs/ that carries the name after its first segment."
  [Observed] It is true: R2 is killed by exactly those 8 probes, and R2-N3 shows nothing else kills it. **I accept the clause.**
  The same sentence's list of what fails ("a prefix it lacks, one it has beyond them, or one narrowed to src/") does not add "or
  one matched anywhere in the path", which is what the clause's probe is for; the PR body does say it. The double "and" also reads
  awkwardly.
- **Action (optional, at the next edit of this file).** Replace l.184-186's
  "so a prefix it lacks, one it has beyond them, or one narrowed to src/ (the PR 535 review's N6) fails it, over every tracked path
  and, for each workspace, a manifest, a tsconfig, an untracked module and a sibling directory that only shares the name's start,
  and a path under docs/ that carries the name after its first segment."
  with
  "so a prefix it lacks, one it has beyond them, one narrowed to src/ (the PR 535 review's N6) or one matched anywhere in the path
  fails it, over every tracked path and, for each workspace, a manifest, a tsconfig, an untracked module, a sibling directory that
  only shares the name's start, and a path under docs/ that carries the name after its first segment."
  (rewrapped to the file's width).

## 5. Verdict on each round-1 item

| Item | Verdict | Evidence |
|---|---|---|
| F1 (blocking): the false `clean_build.mjs` sentence in the body and the test comment | **Met** | §3.8: the raw's l.221 bullet is in the body and the old bullet is gone; the raw's l.230-233 comment is the test's l.230-233 and the old comment is gone. It is a comment-only test edit, and the surface-version record was regenerated (§3.6) |
| N1: class statement | **Met** | The body's class sentence is the raw's l.244 text verbatim (§3.8) |
| N2: intermediate links in the extends chain | **Met** | The raw's l.260 assertion and l.262 sentence are verbatim (§3.8). R5 is killed by `packages/support: expected [ 'configs/mid.json' ] to deeply equal []`, the message the raw named. R5-N2 shows the new assertion carries the kill, and N2ok shows it does not refuse a link under a protected project. All 8 of today's chains pass (unmutated 16 of 16). Layout: N3 |
| N3: a path carrying a protected prefix mid-path | **Met** | `docs/${dir}/a.ts` sits after `${dir}x/a.ts`, and the pin is 61 (§3.8). R2 is killed by `expected [ …(8) ] to deeply equal []`, the message the raw named; the 8 are the `docs/<dir>/a.ts` probes (§3.5). The body's "49 probes" became 61, and "four probes" became "five probes" |
| N4: D1t as a lane mutant row | **Met** | `mutants-40dd84f1.json` row D1t uses round 1's exact edit, killed by the pin. D1x survives (§3.5), so a depth-1 rewrite of the walk would show up as D1t surviving on re-run. That is the pin round 1 asked for, held by the record, not by the suite |
| N5: mismatch direction and the two length pins | **Met** | The raw's l.301 mapping is verbatim. Direction is right: M5dir reads `scripts/clean_build.mjs: accepted`, a path the gate wrongly accepts, and M4dir's 81 read `: refused`, paths it wrongly refuses. Both pins stay, with the lane's messages: the 61 message fires as written (P1). The 12 message ("the workspaces the probes are built over; a new workspace needs its probes reviewed") is true, since the probes are built per workspace |
| N6: `syzygy-bpyt.6.16`'s text | Not in this subject | The coordinator's, as the brief says |
| The lane's own equality-comment clause | **Accepted** | True as written (N4 for an optional completion) |
| Merge of main `c672492c` | **Met** | `92099a3e` is its own merge commit; #554 touches neither gate file, no root file the gate protects, no `clean_build.mjs` and no tsconfig (the `rootFilesAndTsconfigsChanged: []` re-run, §3.6) |

## 6. Every changed gate decision

- [Observed] `git diff c672492c 8994af16 -- apps/three-surface-poc/src/git-observation.ts` is one 3-line comment rewrite plus two added
  array entries, `'packages/polaris-generation-core/'` and `'packages/polaris-generation-consent/'`. `structural.py` gives
  `exactInputsIdentical: true`, `returnIdentical: true`, `removed: []`, `added` = the two prefixes and
  `rootFilesAndTsconfigsChanged: []`. The blob is unchanged since round 1 (§1).
- [Observed] Over 8,081 paths (every tracked path at `8994af16` plus 218 probes), base against head: newly refused 86, every one under
  the two new prefixes (59 and 27, 72 tracked); newly refused outside the two prefixes `[]`; newly accepted `[]`. The same holds
  against `c672492c`. The lane's method over 7,921 paths agrees: 74 newly refused (72 tracked), all under the two prefixes, and 0
  newly accepted.
- There is no other changed gate decision. The test-only refusals are the extends row (listed, now including an intermediate link)
  and the two derivation throws in F1.

## 7. Test quality

Bar: `.claude/skills/th-engineering/subskills/test-rigor/SKILL.md` at `8994af16`.
- l.42: "**A test is worth keeping only if some plausible bug makes it fail.**"
- l.64-67: "**No tautologies** — A test that mirrors the implementation's logic to compute its expected value … verifies nothing.
  Expected values are literals or independently derived."
- l.82-84: "**A failure names the defect** — Test names state expected behavior …; assertion messages make the diff readable. A
  maintainer should localize the bug from failure output alone."
- l.93-94: "**Growth is governed** — A test is worth *adding* only if it catches a plausible bug no existing test catches".

- **The new assertions earn their place (l.42).** The intermediate-link assertion catches an unprotected link (R5, N2dossier), and
  only it does (R5-N2). The `docs/<dir>/a.ts` probe catches a prefix matched mid-path (R2), and only it does (R2-N3). The test count
  stays 16, so the round adds assertions, not tests (l.93-94).
- **Failure output (l.82-84) is now better.** Each mismatch names its path and direction, and the reporter's diff lists them all
  (`diff-output-*.txt`). The vitest JSON reporter truncates the list to `…(N)`, so the retained mutant records cannot show the
  direction. That is a property of the record tool, not of the test. The 61 pin names what changed.
- **The length pins** are change detectors more than bug detectors: the 61 pin can fail only when someone edits the probe line,
  because the 12 pin fails first on a new workspace. They stay by the coordinator's direction. Their messages now say what each
  count is for, which answers round 1's l.82-84 point.
- **No tautology (l.64-67).** The expected set is an 8-entry literal, and the population is derived from the tree.
- **Determinism.** [Observed] The file passed 16 of 16 in every unmutated run: the full suite, the lane-tool baseline, my mutant
  baseline, the F/J baseline and the merge.

## 8. Cleanup

- I deleted both scratch clones (`rev-556-r2/clone`, `rev-556-r2/clone2`) and `/tmp/r556b-1` through `/tmp/r556b-6`, my only
  TMPDIRs. I deleted nothing else in `/tmp`.
- I deleted the `npm ci`, governance, typecheck and battery logs, the PR body copy, the mutated-body copy, the load notes and the
  four lane-tool re-run outputs (each equal to its retained record, §3.6). Their result lines are quoted above.
- I killed no process.
- At the end, the PR body still hashed to `b0fd586a51d459d3d76ef00bc020ba159484842c140d1d4e7d8256428356c78d`, `headRefOid` was
  `8994af16e5ae735aa3d6f26a925c93e4a0ad7f45`, and main was `c672492caace634905b4f285434211436bb7fe24`.

Kept files (paths relative to `rev-556-r2/`; none over 300 KB, the largest `full-suite.log` at 134,703 bytes):

| File | sha256 |
|---|---|
| `diff-output-M4.txt` | `f31a2c2c7a775c5e7caf7c361a030dc36a34216beb12879973e4dc45fe46a13d` |
| `diff-output-R2.txt` | `38e6ce3a6f5ae5274c1196cc0b4a5fa6be922f4445f5e4810baaf53dfc671529` |
| `exact-texts-8994af16.jsonl` | `477b0570725b0b4faf4e5ac162292bd14fd0f25aac2308af15a5944d9f552f0a` |
| `full-suite.log` | `9749d17ed883091486b7fbd7c456579c5dbe3ce2c6d7b35cfa483b38a8ef2f47` |
| `gate-diff-r2-8994af16.json` | `146e1d98013c2645926c5fcb6fc230d94e512ff9ba4540ad14068a5584a31322` |
| `gate-diff-r2-main-c672492c.json` | `21632b8e8ddf243202703464bb15a2768066f20a866ca5088fe14579704ce31f` |
| `lane-mutants-rerun-8994af16.json` | `4c5d161e0f6bdb7a7f72ce621e590915dcacec1f33efbcfed304c1091a8e265c` |
| `rev-mutants-r2-8994af16.json` | `1868bbfc0ba4016757ed3a2a118df28542547e296aa9709cc6fea5401299d666` |
| `tools/diff_output.py` | `903334319719942582c75928e215165c7e774058ce878337ddb59071aa8eeb9a` |
| `tools/exact_texts.py` | `3376388dbd6c88b3f262281054048dd8e0d1a06440fa642e13a2dea268195d2a` |
| `tools/gate_diff_r2.mjs` | `35afeaf2628a80deb2d95b764db8edf116efa4bd20890c539daf5455f34caf8a` |
| `tools/rev_mutants_r2.py` | `dfdc185def5a6486a72ec003f8dc8b1aa7f2149741f36d7ee2e8f4e7f1f18ca8` |
| `tools/unlisted_refusals.py` | `6e18333cafc105597e89f4fd36c8012fcda60442697c0d10e6c620ae2d95a2d9` |
| `unlisted-refusals-29db2b11.json` | `07693ee45810ad2bcf65e7879cd49817c88d881caf498b82f6e5317453744e84` |
| `unlisted-refusals-8994af16.json` | `408e8a87b3c5a30c1f2400d3dd9e6da3420844b98fea05142584781dc3e78d09` |

The raw review itself is `R-GP-IMPL-OBSERVER-GATE-2-RAW.md`; its digest is given in the reply, not here.
