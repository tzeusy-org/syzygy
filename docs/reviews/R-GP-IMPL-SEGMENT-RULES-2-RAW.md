# R-GP-IMPL-SEGMENT-RULES-2 — CC-REV-1 implementation review of syzygy-bpyt.70, round 2
Verdict: REVISE
Reviewed commit: b218990f
Subject: r2-review.diff sha256 24f54b62fb04fd82ae352ec41e4563bec85f46784906feb1f349ad1efea11c3c

Reviewer: fresh-context CC-REV-1 reviewer (rev-557-r2), 2026-10-29. Clones: `rev-557-r2/clone` (review and vitest runs) and
`rev-557-r2/bclone` (the battery), both from `/home/tze/GitHub/syzygy` at `b218990f1c93e350781a72c42b0700c7b329750d`, `npm ci`
first; worktrees `base` (`c672492c`, `npm ci` before its `vitest list`) and `code` (`52d8b96f`) of the review clone. Installed
Node: `v24.6.0`. No target repository content was fetched, no daemon was started, and nothing under the home directory was
opened. I read round 1's raw (sha256 `72272f4b…` as the brief gives it, re-hashed equal) and the brief; not `mid-r2.md` or the
`c75-*` files.

## 1. Subject identity checks

- **Diff.** `git diff c672492c b218990f > subject.diff; sha256sum` gives
  `24f54b62fb04fd82ae352ec41e4563bec85f46784906feb1f349ad1efea11c3c`, equal to `r2-review.diff` [Observed]. 16 files, 3333
  insertions, 7 deletions: the four test-side files (`workspace-reach.testkit.ts`, `workspace-reach.test.ts`,
  `sync-child-process-guard.test.ts`, `support-purity.test.ts`) and 12 under `docs/evidence/syzygy-bpyt-70/` (7 JSON records, 5
  tools) [Observed, `git diff --stat`, `--name-only`]. `git merge-base c672492c b218990f` is `c672492caace…` [Observed]. The
  reading aid `r1-to-r2.diff` hashes to `e8bc5e79…` as given [Observed].
- **Commits.** `git diff --name-only 52d8b96f b218990f` lists exactly the 7 JSON records under `docs/evidence/syzygy-bpyt-70/`
  [Observed], so "The head `b218990f` adds only the records under `docs/evidence/syzygy-bpyt-70/`" is true. `9fd03a8e..52d8b96f`
  changes the three code-side test files and four tools (`build_record.py` new, `differential.mjs` new, `mutants.py`,
  `node_segments.mjs`) [Observed].
- **PR body.** `gh pr view 557 -R Tzeusy/syzygy --json body --jq .body > body.txt; sha256sum body.txt` gives
  `ff8b14ec04aa90d972b1d0389d3eaf6c8228ceee3e022efa511a6f803bf9da0e`, **equal** to the coordinator's frozen figure (and to
  `lead/b70/body-r2.md`); head `b218990f…`, OPEN, MERGEABLE [Observed].
- **Main.** `gh api repos/Tzeusy/syzygy/commits/main` returned `c672492caace…` for most of the review, and
  `7dfad65a69e1b5fd8358e30d78e34f0674892cfb` (PR #556 merged 2026-10-28T18:26:57Z) at the end; #555 is still OPEN [Observed].
  #556 changes 46 files, two outside `docs/` (`apps/three-surface-poc/src/git-observation.ts` and its test). I merged it into
  the head locally (`71cd5848`, no conflict) and ran the changed tests there (section 3).
- **Non-test bytes.** `git diff c672492c b218990f -- '*package.json' vitest.config.ts '.github/**'` is empty (0 bytes)
  [Observed]. The product build at `b218990f` (`npm run build`, then `tools/dist_hashes.py` over every file under the ten
  `dist/` directories): 998 files, and the JSON hashes to `254e3d77b61d…`, byte-equal to round 1's `dist-base.json` (built at
  `c672492c`), 0 of 998 differing [Observed].

## 2. Clauses relied on, and the class ruling

- CC-REV-1, `review-and-documentation.md:18-19`: "Changes touching any of seven classes require review by an independent,
  fresh-context reviewer, and the agent performing the change never finally decides which classes it touches."
- CC-REV-1 class 4, `:37`: "**security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
- CC-REV-1 `:49-50`: "**The change record states** which classes the change touches, or \"none,\" so a misclassification is a
  findable violation after the fact." `:51`: "**A reviewer or the owner** may reclassify at any time."
- GP-Q0, `OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md:53`: behaviour-preserving means none of these changes: "a
  rendered byte, a wire format, a refusal string or an exit code;"
- GP-Q0 `:60`: "Each pull request states which CC-REV-1 classes it touches."
- GP-Q0 `:62`: "**Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4
  (security), and class-6 pull requests that remove an endpoint." `:64-66`: "an old-versus-new differential over a mutated-record
  corpus that includes records with altered prose;", "a rule-6 mutant for each predicate;", "a non-blocking owner notice in the
  cycle report."
- GP-Q0 stop clause, `:95-96`: "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."
- AGENTS.md at `b218990f`: rule 6 "Mutate the input and confirm the check fails, per predicate, before trusting it"; rule 9 "A
  claim of absence needs a sweep with a denominator."; rule 11 "An evidence record names its subject and the subject's digest".
- Test-rigor bar (`git show b218990f:.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`): `:60-63`, bar 3, "**Edge and
  failure paths are first-class** — Empty inputs, boundaries, … Happy-path-only coverage of a failure-prone component is a
  finding."; `:66-67`, bar 4, "Expected values are literals or independently derived."; `:82-84`, bar 7, "**A failure names the
  defect** … A maintainer should localize the bug from failure output alone."; `:103-104`, workflow step 2, "apply the mutation
  thought-experiment: name a one-line bug in the code under test this test would *not* catch but should."

**My ruling: class 4 (security), and no other — the same as round 1** [Inferred, from the clauses and the diff].
- `entryModulesIn` derives the S10 no-egress bundle's alias map (testkit doc comment: "The S10 no-egress bundle aliases by it"),
  and `sync-child-process-guard.test.ts` guards the suite's `source`-condition loading the S10 proof stands on. Both are test
  guards over an egress path, and this PR widens what they refuse.
- Not class 3: the POC surface version moves, re-derived as `walkthrough-inputs.ts:86-98` computes it (sha256 over the two
  surface tree ids, newline-joined): `polaris@5e39299adacf` at `c672492c`, `polaris@ceab7f47e1cf` at `9fd03a8e`,
  `polaris@56402efc1c19` at `52d8b96f` and `b218990f` [Observed]. Over the 7,886 tracked files at `b218990f`, `git grep -l -F`
  finds `56402efc1c19` in `record.json` only, `5e39299adacf` in `record.json`, `tools/build_record.py` and
  `docs/reviews/R-GP-IMPL-SUPPORT-LEAF-FOLLOWUPS-2-RAW.md`, and `ceab7f47e1cf` nowhere [Observed]. No walkthrough record binds
  any of the three. Not class 1, 2, 5, 6 or 7: no authority, identity, migration, endpoint, contract or export byte, and the
  product dist is byte-identical (section 1).
- The body now states class 4 (round 1's F3, met).

So GP-Q0's three checks apply: the differential (section 3: 156 rows, 0 newly accepted, plus my 16 condition-key and leaf rows,
0 newly accepted), the rule-6 mutants (the lane's 33 and my 9, in both dist states), and the owner notice (the coordinator's, on
`syzygy-bpyt.10`).

**The stop clause.** No product gate changes: no product module, no refusal string a user sees, no product exit code (dist
byte-identical). What changes is what node-ci's `npm test` step refuses, a test guard, and I follow the precedent round 1 and
the two #554 raws cite: "a test guard that refuses more takes an owner notice on syzygy-bpyt.10, not an owner question". That
precedent holds only if the notice lists what the suite newly refuses, and today it misses one shape (F2). Nothing here needs
an owner question instead [Inferred].

## 3. What I ran, and the results

Every vitest run used a private TMPDIR under `/tmp/r557b-<n>`, one vitest process at a time. Load is `/proc/loadavg`, 1-minute,
at start → end.

| Run | State | Load | Result [Observed] |
|---|---|---|---|
| `node docs/evidence/syzygy-bpyt-70/tools/node_segments.mjs` (no `--write`), at `b218990f` | — | 22.02 | `v24.6.0 regexes true true cases 15/15 mismatches 0`, exit 0; clone clean after |
| `tools/build_record.py 52d8b96f`, at `b218990f` | — | — | prints `52d8b96f… {'base': 'polaris@5e39299adacf', 'head': 'polaris@56402efc1c19'} {'absent': {'rows': 33, 'asExpected': 33, 'unexpected': []}, 'present': {…33, 33, []}} 11`, exit 0; the rewritten `record.json` hashes `f124c255aa84…`, equal to the committed blob; `git status --porcelain` empty |
| The retained `tools/differential.mjs` (sha256 `923988a4…`, equal to round 1's), base `c672492c` vs code `52d8b96f` testkits | — | — | 156 rows: accepts → accepts 15, other → other 10, accepts → segment 48, other → segment 65, segment → segment 18; **no "→ accepts" row from a refusal**. My output (`differential-r2.json`) is byte-equal to the retained `differential.json` (`d6629b35…`) |
| `tools/key_differential.mjs` (mine), base vs code | — | — | 16 rows of condition-key and non-target-leaf shapes: `{"refuses -> refuses":12,"accepts -> accepts":4}` (`key-differential.txt`) |
| `tools/unread_only.mjs` (mine), base vs code | — | — | `{"browser":"./dist/./index.js"}` and the same with a `types` target: base `ok packages/lib/src/index.ts`, head throws "…which Node does not read" (F2) |
| `tools/node_forms_r2.mjs` (round 1's probe plus six empty-segment forms), code testkit | — | 24.45 → 24.91 | 38 forms × 4 modes, 152 child `node` runs (`node-forms-r2.json`); section 6 |
| `tools/warn_probe.mjs`, `tools/key_probe.mjs` (mine) | — | — | 10 empty-segment forms × 2 loaders, every one prints DEP0166; 4 key shapes × 2 loaders (section 6) |
| `tools/rev_mutants_r2.py … absent both` (the lane's `mutants.py` main and its 33 rows, unedited, then my 9) | absent (0 `dist/`) | 23.49 → 38.81 | `summary {'rows': 42, 'asExpected': 42, 'unexpected': []} status after ''` |
| The same, my 9 alone (`mine`), after fixing my tool's message keying (below) | absent | 35.59 → 33.70 | `summary {'rows': 9, 'asExpected': 9, 'unexpected': []} status after ''` |
| `npm run build`, then `tools/rev_mutants_r2.py … present both` | all 10 `dist/` present | 32.42 → 30.78 | `summary {'rows': 42, 'asExpected': 42, 'unexpected': []} status after ''` |
| Whole suite, `npx vitest run --reporter=json` at `b218990f` | every `dist/` absent (10 removed, 0 left) | 25.27 → 35.44, 308 s | 256 files, 5806 tests: **5801 passed, 0 failed, 5 skipped**, `success: True`, `failedFiles: []` |
| `vitest list --json` at `c672492c` (`base`) and `b218990f` | absent | 33.62 → 37.39 | base 5781, head 5801, **+20**, added 20, removed 0; by file 17 / 2 / 1 (workspace-reach / sync-child-process-guard / support-purity); the added multiset equals `titles.json`'s `added` list: True |
| `npm run typecheck` | absent | 36.68 → 36.60 | exit 0, `tsc -p tsconfig.json`, no output |
| Canonical battery (PROJECT-STATUS.md §"How to verify this page", line by line, `tools/battery.py`, in `bclone` at `b218990f`) | — | 43.49 → 23.52 | `commands 114 nonzero 0`. Quoted lines: `check_governance.py` "32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted"; `--selftest` "406 fixtures, 0 failing — a check that cannot fail is not a check"; `check_quotations.py` exit 0 (its last line, "note  QC-1  excluded verbatim records, round directory: 139 .md files, 10 quotations, 4 not in their source now; history not searched"); `check_quotations.py --selftest` "selftest: 20 of 20 passed"; `git tag --list 'doctrine-*'` "doctrine-d5-2026-09-27"; `bclone` clean after |
| Changed tests on the local merge `71cd5848` (head + main `7dfad65a`): `workspace-reach`, `sync-child-process-guard`, `support-purity`, `no-egress`, `polaris-authority-sweep`, `git-observation` | absent | 24.22 → 30.20 | `Test Files  6 passed (6)`, `Tests  167 passed \| 1 skipped (168)`, exit 0 |
| Hosted checks at `b218990f` | — | — | `checks pass 23m43s` (governance-docs run 40730855886), `node pass 4m28s` (node-ci run 40730855851). The node job: `Found in cache @ /opt/hostedtoolcache/node/24.22.1/x64`, `node: v24.22.1`; `Test Files 253 passed \| 3 skipped (256)`, `Tests  5801 passed \| 5 skipped (5806)`; system tests `51 passed (51)` |

- **The lane's 33 at the head equal its records at `52d8b96f`.** For each state, the first 33 rows of my run carry the lane's ids
  in the lane's order, and every row's failing set, exit and edits equal `mutants-{absent,present}.json`'s: "differ from lane
  record (failing, exit, edits): []" in both [Observed]. So the body's "At the head `b218990f`: 33 of 33 … each row with the same
  failing set and exit as at `52d8b96f`" is true.
- **Kills read as assertions** (`tools/kill_messages.py` over `rev-mutants-present.json.messages.json`, keyed by run index):
  "rows with failures 28 of 38 rows naming a timeout 0" [Observed]. Every lane kill is an `AssertionError` or, for E4S, the
  file-level throw naming the new message (`@syzygy/polaris-dossier/state-directory: its import condition target
  "./dist/x/../state-directory.js" has an empty, '.', '..' or 'node_modules' segmen…`). New since round 1: RX3 `expected 'loads' to
  be 'refuses'` (the `%4E` case row); RX4 `expected [Function] to throw error including '@syzygy/lib: its require condition ta…'
  but got '@syzygy/lib: its require condition ta…'` (the severity row); K1 `expected [Function] to throw an error` (the key row);
  S6 `expected false to be true` on the config row (the any-project assertion) beside `expected [] to deeply equal [
  'test.projects.1.resolve.alias' ]` on the walk row; S4 `expected [ 'ssr', 'test' ] to deeply equal ArrayContaining{…}` and
  `expected [] to deeply equal [ 'resolve.alias' ]`. RX7 passes, 8 of 8.
- **My tool's first absent run keyed messages by row id**, and RX3, RX4 and RX7 are ids in both the lane's rows and mine, so
  from the first repeat on that file attributed messages to the wrong rows (I kept it as
  `rev-mutants-absent.json.messages-misaligned.json` and use none of its tail). The failing sets in `rev-mutants-absent.json`
  are per run and unaffected. I re-keyed by run index, re-ran my 9 absent (`rev-mine-absent.*`), and ran the present state with
  the fixed tool.
- **My mutants** (each expected failing set written before the run; edits verbatim in the JSON):

| Id | Edit | Pre-written expectation | Result, both states [Observed] |
|---|---|---|---|
| RX3 | `(n\|%6e\|%4e)` → `(n\|%6e)` in both copies (round 1's, re-run) | the `%4E` case row | as expected: `expected 'loads' to be 'refuses'` — survived at `9fd03a8e`, killed now |
| RX4 | `'require'` dropped from `NODE_CONDITIONS` (round 1's) | the unread/severity row | as expected — survived at `9fd03a8e`, killed now |
| RX7 | the POC app project moved to the front of `test.projects` (round 1's) | `[]` (round 1 expected the config row; round 1's F2 fix must make it pass) | as expected: 8 of 8 pass |
| RX8 | the config's one `globalSetup:` line deleted | the config row | as expected: `expected false to be true` — the any-project assertion still has teeth |
| RK4 | the key message drops its `node > ` path prefix | the key row | as expected: `…its node > condition key…' but got '…its condition key "x/../…'` |
| RK5 | the key predicate widened, `'/../'` → `'/..'` | the key row | as expected: the row's third assertion throws `its condition key "a/..b" has a /../ segment…` |
| RK3 | the key fault ranked `-1` instead of `2` (named before every target fault) | `[]`: no row has a key fault beside a target fault | **survives**, 81 of 81 (N2) |
| RK2 | `conditionKeysOf` returns `[]` for an array | `[]`: the resolver refuses an array entry as unreadable anyway | survives, 81 of 81; equivalent in outcome (N2) |
| RX0 | none | `[]` | 81 of 81 |

- **Item 6 and the purity file** are unchanged since round 1 (`support-purity.test.ts` is not in `git diff 9fd03a8e 52d8b96f`),
  and W4 still kills with `expected [] to deeply equal [ '{ ...Object.freeze } = {}' ]` [Observed].
- **Tree sweep** (round 1's `tree_sweep.mjs`, code testkit): `c672492c` and `b218990f` both "manifests 13, entries 18, targets 63,
  newFaults [], oldFaults []" [Observed]. Over the 13 manifests at `b218990f`: `imports` keys 0, pattern (`*`) subpaths 0,
  condition keys `['default', 'import', 'source', 'types']`, keys containing `/` 0 [Observed, by script].
- **Changed-file runs at the head**, as the unmutated rows of both mutant runs:
  `workspace-reach.test.ts` 81 of 81, `no-egress.test.ts` 6 of 6, `support-purity.test.ts` 51 of 51,
  `sync-child-process-guard.test.ts` 8 of 8, pin tool exit 0, in both dist states [Observed].

## 4. Findings

### F1 — blocking (PR body only). "Every changed file is a test or test-support module" is false at `b218990f`

- **Evidence:** body line 3: "Every changed file is a test or test-support module." `git diff --name-only c672492c b218990f`
  lists 16 files; 4 are test or test-support modules and 12 are this bead's JSON records and Python/JS tools under
  `docs/evidence/syzygy-bpyt-70/` [Observed]. The body's own Verification section says the head "adds only the records under
  `docs/evidence/syzygy-bpyt-70/`", so the summary contradicts it. The sentence was the same at `9fd03a8e`, where round 1 did not
  flag it; the brief's rule ("a false sentence in the PR body") makes it blocking now.
- **Failure scenario:** the change record (CC-REV-1 `:49`) tells a reader the PR touches only test modules, and a reader auditing
  the docs tree against PR descriptions finds 12 files the description disclaims.
- **Fix (exact, by script):** in the body, replace the one occurrence of

  ```text
  Every changed file is a test or test-support module.
  ```

  with

  ```text
  Every changed code file is a test or test-support module, and the other 12 changed files are this bead's records and tools under `docs/evidence/syzygy-bpyt-70/`.
  ```

### F2 — blocking (PR body and record). Refusal 4 omits a newly refused shape: a target under a condition Node does not read other than `types` or `source`

- **Evidence:** body refusal 4: "Any of these under the `types` or `source` condition, or in a `main` field. The `/../` form
  already threw there." `record.json` `newRefusals[3]`: "any of these under the types or source condition, or in a main field
  (before, the '/../' form already threw there)". The guard refuses a segment-faulted target under *every* condition outside
  `NODE_CONDITIONS` ("which Node does not read"). Base versus code (`unread-only.txt`): `{"browser": "./dist/./index.js"}`, and
  the same with a `types` target, go from `ok packages/lib/src/index.ts` at `c672492c` to `throws @syzygy/lib: its browser
  condition target "./dist/./index.js" has an empty, '.', '..' or 'node_modules' segment, which Node does not read` [Observed].
  Refusal 1 names "An `exports` target" without a condition, but says "Node refuses each with `ERR_INVALID_PACKAGE_TARGET`", which
  is not Node's outcome here: a scratch package exporting `{".": {"browser": "./dist/./index.js"}}`, with `dist/index.js`
  present, gives `ERR_PACKAGE_PATH_NOT_EXPORTED` under both `import()` and `require()` (a one-off `node probe.mjs` in
  `/tmp/r557b-3`, printed `error ERR_PACKAGE_PATH_NOT_EXPORTED error ERR_PACKAGE_PATH_NOT_EXPORTED`) [Observed]. So the shape is either unlisted or
  listed under a false Node claim.
- **Scope:** only an entry whose non-`types`/`source` conditions are all ones Node does not read; any other faulted unread target
  differs from the Node-read target and `targetOf` already refused it (`differential.json`'s `browser` shape: 14 "other → segment",
  0 "accepts → segment") [Observed]. 0 such entries in the tree (condition keys are `default`, `import`, `source`, `types`).
- **Failure scenario:** the owner notice, written from the list, tells the owner the suite newly refuses `types`, `source` and
  `main` targets, and a package exporting a `browser`-only (or `worker`-only, …) entry with a `.` segment fails `npm test` for a
  reason the notice did not name.
- **Fix (exact).**
  1. Body, replace the one occurrence of

     ```text
     4. Any of these under the `types` or `source` condition, or in a `main` field.
     ```

     with

     ```text
     4. Any of these under a condition Node does not read by default (`types`, `source`, or any other, such as `browser`), or in a `main` field.
     ```

  2. `docs/evidence/syzygy-bpyt-70/tools/build_record.py`, replace the one occurrence of

     ```text
     "any of these under the types or source condition, or in a main field (before, the '/../' form already threw there)",
     ```

     with

     ```text
     "any of these under a condition Node does not read by default (types, source, or any other, such as browser), or in a main field (before, the '/../' form already threw there)",
     ```

     then run `python3 docs/evidence/syzygy-bpyt-70/tools/build_record.py 52d8b96f` from the repository root (it re-hashes
     `tools/build_record.py` into `files`; nothing else is re-measured).
  3. Optional, same edit as step 1: the summary bullet "A target under `types` or `source`, or in a `main` field, throws without
     saying Node refuses it." → "A target under a condition Node does not read, or in a `main` field, throws without saying Node
     refuses it."
  Step 1 alone is a body edit; step 2 moves record bytes. If the coordinator prefers body-only, apply step 1 and keep step 2 as
  a note for the dispositions record ("record.json newRefusals[3] names only types and source").

### N1 — note. `differential.json` names neither its subject nor the subject's digest (rule 11)

- The retained `differential.json` holds only `rows` and `groups`. Which testkits were compared (base `c672492c`, code
  `52d8b96f`) is said by `record.json` (`base`, `commit`, `round1Repairs.N2`), and the tool by its sha256 in `files` [Observed].
  A reader re-checks it as I did, but only by reading the record beside it. It is my round-1 output format, retained unchanged.
- **Proposed fix (follow-up):** have `build_record.py` write `differential: {base: 'c672492c', head: <commit>, tool:
  'tools/differential.mjs', testkitSha256: {base, head}}`, or retain the differential's command line beside it.

### N2 — note. Two mutants of the key check survive

- **RK3** (the key fault ranked first) survives 81 of 81: no row combines a key fault with a target fault, so "the most severe
  fault is named first" is unpinned for keys. **RK2** (no key walk into arrays) survives too, but is equivalent in outcome: an
  array entry is refused as unreadable by `targetOf` anyway [Observed]. Workflow step 2 (`SKILL.md:103-104`).
- **Proposed row (cheap; not run):**
  `expect(() => entryModulesIn(workspace({}, { 'a/../b': './dist/index.js', import: './dist/./index.js', default: './dist/./index.js' })))`
  `.toThrow(`@syzygy/lib: its import condition target "./dist/./index.js" has an empty, '.', '..' or 'node_modules' segment, which Node refuses (ERR_INVALID_PACKAGE_TARGET)`);`
  in the key row; RK3 should then die.

### N3 — information. `toThrow(<string>)` truncation hides the difference in two kills

- RX4 and R2 fail as `expected [Function] to throw error including '@syzygy/lib: its require condition ta…' but got '@syzygy/lib:
  its require condition ta…'` (R2 the same with `types`): the two strings differ only past vitest's truncation, so the output
  does not show which clause changed (bar 7, `SKILL.md:82-84`). The row title still names the row. A `toThrow(/which Node does not
  read$/)`-style second assertion, or catching the message and `expect(message).toBe(…)`, would print both in full.

### N4 — information. "Node's rules" is true and incomplete in two places

- The quoted literals equal the testkit's (`INVALID_SEGMENT`, `REFUSED_SEGMENT`), `node-segments.json`'s `nodeLiteral`, and the
  running Node 24.6.0's `internal/modules/esm/resolve` lines 356-357, by script, all `True` [Observed]. "`resolvePackageTargetString`
  tests both on the target after its leading `./`" is true (lines 407-408, `StringPrototypeSlice(target, 2)`).
- Node also tests both on a pattern's substituted subpath (lines 433-435); `entryModulesIn` reads no pattern, and there are 0
  pattern subpaths in the tree [Observed]. And "an empty segment (`//`, or a trailing `/`)" reads as exhaustive; my probe finds
  DEP0166 also for a leading `.//`, a bare `./`, `\\`, `/\` and a trailing `\`, each of which the guard names "accepts with a
  deprecation warning (DEP0166)" truly (section 6) [Observed]. No change needed; a residual line if the coordinator wants one.

## 5. Verdict on each round-1 item

Exact texts checked by script against `body.txt` and `git show b218990f:<path>` (`True` for each):

| Item | What round 1 asked | Verdict |
|---|---|---|
| F1 | the empty-segment wording "loads" → "accepts", exact text in testkit `:152` and `:126-127`, the test, `node_segments.mjs`, `mutants.py`, the body bullet, row 3 and `record.json` `newRefusals[2]` | **Met.** Testkit line, comment, body bullet and row 3 are the raw's text verbatim; the new string occurs once in each of the four files and the old 0 times, and `git grep -F 'loads with a deprecation warning' b218990f` finds nothing in the tree; `newRefusals[2]` is row 3 in the record's quoting style. The trailing-`/` case row is added, and `node_segments.mjs` and my probe agree (section 6) |
| F2 | refusal 6 listed; or the optional any-project assertion, with S4 and S6 re-run | **Met, the optional arm.** The assertion is the raw's text verbatim; `test.projects.8` occurs 0 times in the file. S4 and S6 still die, S6 by the new assertion (`expected false to be true`); RX7 passes; RX8 shows the assertion still bites. Refusal 6 is the raw's text adapted to the narrower arm and is true: removing the root `setupFiles` or the only `globalSetup` fails it, a reorder does not |
| F3 | the raw's "CC-REV-1 classes" section verbatim, before "## Residuals" | **Met.** The raw's six lines, de-indented, occur verbatim, before Residuals. **The added line** ("At `b218990f`, `git grep` finds the head's version `56402efc1c19` only in this PR's `record.json`.") is true (1 file of 7,886) and keeps the section true at the head without editing the raw's text, which names `9fd03a8e`: sound |
| N1 | a residual for shadowed targets | **Met**, the raw's sentence verbatim |
| N2 | restore the refusal (coordinator's direction), nothing newly accepted | **Met.** The key check refuses every key containing `/../` at any depth and inside arrays; base and code differ in no accept/refuse outcome over 156 + 16 rows. By construction too: the base refused iff some key or string leaf contained `/../` (JSON escapes add no `/` or `.`, and quotes separate keys from values), every such leaf matches `INVALID_SEGMENT`, and every such key is caught [Inferred]. The message is true against Node (section 6) |
| N3 | the `%4E` case row and the `require` severity row | **Met**, both rows as the raw wrote them; RX3 and RX4 die |
| N4 | a residual naming CI's Node and the 24.6.0-only pin; a follow-up | **Met.** `syzygy-bpyt.76` is OPEN, "Run node_segments.mjs in node-ci under the job's own Node (PR 557 R1 N4)" (`bd show`). **The version deviation is sound**: hosted node-ci printed `node: v24.22.1` at `b218990f` and round 1 saw `24.21.0` at `9fd03a8e`, so naming both is the true sentence. Whether 24.21.0's or 24.22.1's regexes equal 24.6.0's is still [Unknown] here (no such binary; nothing fetched). `record.json`'s residual names 24.21.0 only: true, older |
| N5 | an `imports` residual | **Met**; 0 `imports` keys over 13 manifests [Observed] |
| N7 | the `main` wording | **Met**: "throws without saying Node refuses it" |

## 6. Node's behaviour per form against the guard's decision

`node-forms-r2.json`, Node v24.6.0; each form under `import` (by `import()`), `require` (by `require()`) and `default` (by each).
Node's outcome was the same in the four modes per form except where shown. "Guard" is `segmentFaultOf({[condition]: target},
false)`'s tail, from the code testkit.

| Target | Node [Observed] | Guard | Agree? |
|---|---|---|---|
| `./dist/index.js`, `.hidden`, `..x`, `...x`, `node_modules_x`, `%252e` | loads | accepts | yes |
| `./dist/./index.js`, `./dist/.`, `./dist/x/../index.js`, `./dist/x/..` | `ERR_INVALID_PACKAGE_TARGET` | "which Node refuses (ERR_INVALID_PACKAGE_TARGET)" | yes |
| `node_modules`, `NODE_MODULES`, `Node_Modules`, `nOdE_mOdUlEs` | `ERR_INVALID_PACKAGE_TARGET` | refuses | yes |
| `%2e`, `%2E`, `%2e%2e`, `%2E%2e`, `.%2e` | `ERR_INVALID_PACKAGE_TARGET` | refuses | yes |
| `%6eode_modules`, **`%4Eode_modules`** (new row), `node%5Fmodules`, all sixteen encoded | `ERR_INVALID_PACKAGE_TARGET` | refuses | yes |
| backslash `x\..\`, `\.\`, `\node_modules\` | `ERR_INVALID_PACKAGE_TARGET` | refuses | yes |
| `./dist//index.js`, `.//dist/index.js` | DEP0166, then loads (both loaders) | "which Node accepts with a deprecation warning (DEP0166)" | yes |
| **`./dist/`** (new row), `./dist/x//`, `./dist/x/`, `./`, `.//`, `./dist\` | DEP0166, then does not load: `ERR_UNSUPPORTED_DIR_IMPORT` under `import()`, `MODULE_NOT_FOUND` under `require()` (`warn-probe.txt`, with `index.js` present in each directory) | "which Node accepts with a deprecation warning (DEP0166)" | yes — round 1's F1 row now agrees |
| `./dist\\index.js`, `./dist/\index.js` | DEP0166, then loads (`warn-probe.txt`) | "…accepts with a deprecation warning (DEP0166)" | yes |
| `./dist\index.js` | not loaded in `node_forms` (I wrote the file under a literal backslash name; Node's URL parser reads `\` as `/`) | accepts the segment; `moduleIn` refuses | refused either way |
| `./dist/%2e%2e%2findex.js` | `ERR_INVALID_MODULE_SPECIFIER` | accepts the segment; refused by `moduleIn` | not a segment form |

- **The pin tool's `then` field** (`node-segments.json`, re-run equal): `loads` for the four `loads` rows and for `//`;
  `ERR_INVALID_PACKAGE_TARGET` for the nine `refuses` rows; `ERR_UNSUPPORTED_DIR_IMPORT` for `./dist/`. Each is Node's outcome
  under `import`, which is the mode the tool and the test comment name; my probe agrees on all 15 [Observed]. The tool's catch
  matters: an uncaught `import('pkg')` of `{"import": "./dist/"}` in a `type: module` package exits with
  `ERR_UNSUPPORTED_DIR_IMPORT` and prints no DEP0166 line [Observed], so "catches a failed import, so Node prints its warning" is
  true.
- **The condition-key refusal against Node** (`key-probe.txt`): `{"a/../b": T}` → Node `ERR_PACKAGE_PATH_NOT_EXPORTED` under both
  loaders; `{node: {"x/../import": T}, default: T}` and `{default: T, "a/../b": T}` → Node loads; the guard refuses all three
  with "…has a /../ segment, and no condition Node matches by default has one", which is true (Node's default conditions are
  `node`, `import`/`require`, `module-sync`, `node-addons`, `default`) and claims no Node refusal. `{"a/..b": T, default: T}`:
  Node loads, the guard accepts. The base refused the same three with "its entry has a /../ segment, which Node refuses", which
  was false for them. The refusal is not new, so it is rightly outside the "now refuses" list; the body states it under "Round 1
  repairs", N2.
- **A form Node refuses that the guard accepts:** none among the segment forms, over 38 forms × 4 modes [Observed]. The two the
  segment rule passes (encoded `/`, a lone backslash) are refused by `moduleIn` in any real tree.

## 7. Test quality

- **Pinned well.** Every round-1 gap now has a killing row: `%4E` (RX3), `require` (RX4), the trailing `/` (E9 and R3 both now list
  the `./dist/` row). The key check has its own row covering top level, nested depth and the narrowness of the predicate (K1,
  RK4, RK5). The config row's any-project assertion is tested from both sides (RX7 passes, RX8 and S6 die). Expected values are
  literals, and the 15 Node outcomes are independently derived by real `node` runs, which I re-derived (bar 4).
- **Gaps.** The key fault's rank (RK3, N2). Two kills print truncated strings that hide the changed clause (N3, bar 7).
- **Flakiness.** No sleeps, retries or skips in the changed rows; the config row's dynamic `import()` of `vitest.config.ts` and
  the pin tool ran in every one of my runs at loads 22-39 without a load-related failure; 0 kills name a timeout [Observed].

## 8. Cleanup

- Deleted: both clones (`clone`, `bclone`), the `base` and `code` worktrees, and every TMPDIR I made (`/tmp/r557b-1` …
  `/tmp/r557b-10`); `ls -d /tmp/r557b-*` afterwards prints "No such file or directory" [Observed]. Nothing outside those was
  deleted, and no process was signalled.
- Not kept, by the brief: the PR body copy, the subject diff copy, the battery, typecheck, build, `npm ci` and merged-run logs,
  the whole-suite JSON and the two `vitest list` outputs; their result lines are quoted in section 3. The titles comparison was
  an inline script over the two lists (round 1's `titles_delta.py` assumes one checkout root), so no titles tool is kept.
- Kept (29 files, none over 300 KB; no JSON key named `source`, `provenance`, `evidence` or `anchor`, by script):

| Path (relative to `rev-557-r2/`) | sha256 |
|---|---|
| `differential-r2.json` | `d6629b351547263fe6ea4f7029cd96b3ae5b3022cc51d5192c402a89eb19c566` |
| `dist-head-r2.json` | `254e3d77b61daa10f1797144c1d086604960f478d8c6bc59a682618e3f418c81` |
| `key-differential.txt` | `5433c388c46657a2c17c895ceea9f364af996a7cca1360eddd4505f2f1eb14e1` |
| `key-probe.txt` | `9a5101cca5d226a4b631201ffa76044c613f17fa49ed8a5d29cbdefc13c967a6` |
| `loads.txt` | `4265b55b7cfa71fffd17186b43773a3ab01cc9075d5d19de2d7b9258e52dddad` |
| `node-forms-r2.json` | `b4890d3bb47b2e7bbb146468e3b987bb8be3a75b091aa559b111839dae4aa381` |
| `node-forms-r2.txt` | `5d736c65a9acbdd219f3d58a5e52cfdd303de2da0a4572c2e417569b0de82cb9` |
| `rev-mine-absent.json` | `0cbdcabc8d10bd78a7e8bb0463a8c37c346ffbaecf2fa2df9944a998366e7b18` |
| `rev-mine-absent.json.messages.json` | `77e88765b27d238b96940ee1c6e554bcbb405a6700fa1258504b931fe22393d9` |
| `rev-mine-absent.log` | `db178a8ca7f6078aae96383145b67d0fe3e7755afa2c2d22b8a1100df38ce3a7` |
| `rev-mutants-absent.json` | `b4562887301cdb87d3a0e8d718df9f83d0b81beffee2cbdff0d41f73c8c08294` |
| `rev-mutants-absent.json.messages-misaligned.json` | `b53e9df97d70daf7f0fcfaa321b2289e252d787cb7a72933f2fbe591a9aa1124` |
| `rev-mutants-absent.log` | `0762a6732f303fd58762cb907947665ad38f35641cf2b97d4b9b58911a26f6c7` |
| `rev-mutants-present.json` | `77e1f672ef44a579c32f04755a0ec808e6ad7e3535069960c5c9d920e56d0d87` |
| `rev-mutants-present.json.messages.json` | `7990507b54abf072a3c963d3e06cfaae898ca12fbcabe4787328a0838dc78a9f` |
| `rev-mutants-present.log` | `0762a6732f303fd58762cb907947665ad38f35641cf2b97d4b9b58911a26f6c7` |
| `tools/battery.py` | `2e694f1d78aa990d229bb320993b1bf4b27897929445f049302bfcb4bbf425b0` |
| `tools/dist_hashes.py` | `82dbbaf8922ce102f11599b2c145501389c0f792d84daf24044c4dbf88f4c05e` |
| `tools/key_differential.mjs` | `05b4d7892347915bf3226637376d5f8c637904a5c38b24304f602ed9c91df3fd` |
| `tools/key_probe.mjs` | `56f1158244e5ef5f2006205e5b4b013828cb578ea6d10c3985b4589e9619515b` |
| `tools/kill_messages.py` | `c514faa0b3a5a1098781d0f6cc369f509f38161f269dac2a3791c3a9abfcbf09` |
| `tools/node_forms_r2.mjs` | `f11a4859a1e32dffaa32a770b8d58f84a3d21df27d4dc5d19fbabb4ed27b3434` |
| `tools/rev_mutants_r2.py` | `edc4167e1ff239959963aec2e7228ae1a44bf7b6624c8e603a03c10d64cca797` |
| `tools/suite_summary.py` | `993ba9f4de0482a85307a27af9f21e6e3a9791ecd0550eb3e4a5420d13ac9c0c` |
| `tools/tree_sweep.mjs` | `adb3bcc5b655399d17e6edcaca9dd99e54fdc561678d6dc72c598d9969266944` |
| `tools/unread_only.mjs` | `a8ddfd87991dcac58d432d9b69726361e71cfe3e319f960010a2bac0260d44ea` |
| `tools/warn_probe.mjs` | `c6aa3bb586a7a5a5e44110d476aeab5f6e055d7310bf299fff98e34920de57f4` |
| `unread-only.txt` | `bd9550f98bfc3ef9f5f3884d32c06593d324b92e9e5e729a7c96ffa4b005ccba` |
| `warn-probe.txt` | `1af0bb8709a7677538c5cd381da9bd34acd98db806d1935de5408556ed8f5400` |
