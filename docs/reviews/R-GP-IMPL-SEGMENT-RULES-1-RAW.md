# R-GP-IMPL-SEGMENT-RULES-1 — CC-REV-1 implementation review of syzygy-bpyt.70, round 1
Verdict: REVISE
Reviewed commit: 9fd03a8e
Subject: r1-review.diff sha256 80408eda50f1c8fd2feec1dc34a4cf142d8751387a967c8cc5ccf866609d2e7a

Reviewer: fresh-context CC-REV-1 reviewer (rev-557), 2026-10-28. Clone: `rev-557/clone` from `/home/tze/GitHub/syzygy`, checked
out at `9fd03a8ea3e8f2ff5ad5519f06a7a8843073567d`, `npm ci` first. Installed Node: `v24.6.0`. No target repository content was
fetched, no daemon was started, and nothing under the home directory was opened.

## 1. Subject identity checks

- **Diff.** `git diff c672492c 9fd03a8e > subject.diff; sha256sum` gives
  `80408eda50f1c8fd2feec1dc34a4cf142d8751387a967c8cc5ccf866609d2e7a`, equal to the coordinator's `r1-review.diff` [Observed].
  `git diff --stat` lists 13 files, 2654 insertions, 7 deletions: three test files, `workspace-reach.testkit.ts`, and nine files
  under `docs/evidence/syzygy-bpyt-70/` [Observed]. `git merge-base c672492c 9fd03a8e` is `c672492caace…` (the base) [Observed].
- **Commits.** `c8de2e0e` (code), `cfc79988` (adds only `tools/mutants.py` and `tools/node_segments.mjs`), `9fd03a8e` (adds only
  seven files under `docs/evidence/syzygy-bpyt-70/`) [Observed, `git diff --stat` per pair]. So the body's "the head `9fd03a8e`
  adds only the records under `docs/evidence/syzygy-bpyt-70/`" is true.
- **PR body.** `gh pr view 557 -R Tzeusy/syzygy --json body --jq .body > body.txt; sha256sum body.txt` gives
  `b804ca3cb8e274a34c7f4ef5c09a65ca4b2408428d4e52bf2b4e25ff1c8a3a3d`, the coordinator's figure; head `9fd03a8e…`, OPEN,
  MERGEABLE [Observed].
- **Main.** `gh api repos/Tzeusy/syzygy/commits/main` returned `c672492caace…` at the start and again at the end of this review;
  #555 and #556 are still OPEN [Observed]. The local merge with current main is therefore the head itself (`git merge` would
  fast-forward), so the changed-file runs at `9fd03a8e` below are the merged runs.
- **Non-test bytes.** `git diff c672492c 9fd03a8e -- '*package.json' vitest.config.ts '.github/**'` is empty, and
  `vitest.config.ts` has blob `cdadd1a795b0…` at both commits [Observed]. The product build (`npm run build`) at each commit,
  hashed over every file under the ten `dist/` directories: 998 files each, 0 differing (`dist-base.json`, `dist-head.json`)
  [Observed]. `workspace-reach.testkit.ts` is in the polaris-generation-core product build's `exclude` (`src/**/*.testkit.ts`).

## 2. Clauses relied on, and the class ruling

- CC-REV-1, `review-and-documentation.md:18-19`: "Changes touching any of seven classes require review by an independent,
  fresh-context reviewer, and the agent performing the change never finally decides which classes it touches."
- CC-REV-1 class 4, `:37`: "**security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
- CC-REV-1, `:49-50`: "**The change record states** which classes the change touches, or \"none,\"" (continuing "so a
  misclassification is a findable violation after the fact"); `:51`: "**A reviewer or the owner** may reclassify at any time."
- GP-Q0, `OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md:53`: behaviour-preserving means none of these changes: "a
  rendered byte, a wire format, a refusal string or an exit code;"
- GP-Q0, `:60`: "Each pull request states which CC-REV-1 classes it touches."
- GP-Q0, `:62`: "**Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4
  (security), and class-6 pull requests that remove an endpoint." The checks, `:64-66`: "an old-versus-new differential over a
  mutated-record corpus that includes records with altered prose;", "a rule-6 mutant for each predicate;", "a non-blocking owner
  notice in the cycle report."
- GP-Q0 stop clause, `:95-96`: "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."
- AGENTS.md at `9fd03a8e`: rule 6 (`:126`) "Mutate the input and confirm the check fails, per predicate, before trusting it";
  rule 9 (`:132`) "A claim of absence needs a sweep with a denominator."; rule 11 (`:134`) "An evidence record names its subject
  and the subject's digest".
- The test-rigor bar (`git show 9fd03a8e:.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`):
  - `:60-63`, bar 3: "**Edge and failure paths are first-class** — Empty inputs, boundaries, … Happy-path-only coverage of a
    failure-prone component is a finding."
  - `:66-67`, bar 4: "Expected values are literals or independently derived."
  - `:82-84`, bar 7: "**A failure names the defect** … A maintainer should localize the bug from failure output alone."
  - `:103-104`, workflow step 2: "apply the mutation thought-experiment: name a one-line bug in the code under test this test would
    *not* catch but should."

**My ruling: class 4 (security), and no other** [Inferred, from the clauses and the diff].
- `entryModulesIn` derives the S10 no-egress bundle's alias map (its doc comment, testkit `:158-161`, "The S10 no-egress bundle aliases by it"), and this PR widens what it
  refuses. `sync-child-process-guard.test.ts` guards that the suite loads workspace packages by their `source` condition alone,
  which the S10 proof and the reach guards stand on. Both are test guards over an egress path, the reading #545, #554 round 1
  and #554 round 2 gave (`R-GP-IMPL-SUPPORT-LEAF-FOLLOWUPS-1-RAW.md` and `-2-RAW.md`, section 2).
- Not class 1: no write-universe, authority table or adapter authorization code. Not class 6: no endpoint, contract or export
  changes, and the product dist is byte-identical (section 1). Not class 3: the POC surface version moves (re-derived:
  `polaris@5e39299adacf` at `c672492c`, `polaris@ceab7f47e1cf` at `9fd03a8e`, both by sha256 over the two surface tree ids as
  `walkthrough-inputs.ts:86-98` computes it), but `git grep -F -e 5e39299adacf -e ceab7f47e1cf 9fd03a8e` over 7,883 tracked
  files finds only `record.json:72-73` and one retained raw (`R-GP-IMPL-SUPPORT-LEAF-FOLLOWUPS-2-RAW.md:153`), so no walkthrough
  record binds either version [Observed].
- The body states no class (F3).

So GP-Q0's three checks apply. The rule-6 mutants are section 3 (the lane's 29, and my 14, one of them an unmutated control). The differential is section 3: the
product dist comparison (0 of 998 files differ) and an old-versus-new run of `entryModulesIn` over 156 entries
(`differential.json`). The owner notice is the coordinator's, on `syzygy-bpyt.10`.

**The stop clause.** No product gate changes: no product module, no refusal string a user sees, no exit code of a product
command (dist byte-identical). What changes is what node-ci's `npm test` step refuses. I follow the #546 precedent the two
#554 raws cite: "a test guard that refuses more takes an owner notice on syzygy-bpyt.10, not an owner question". Nothing here
needs an owner question instead [Inferred]. The precedent holds only if the notice lists exactly what the suite newly refuses,
and today the body's list is neither complete (F2) nor true in one row (F1).

## 3. What I ran, and the results

Every vitest run used a private TMPDIR under `/tmp/r557-<n>`, one vitest process at a time. Load is `/proc/loadavg` 1-minute.

| Run | State | Load (start → end) | Result [Observed] |
|---|---|---|---|
| Whole suite, `npx vitest run --reporter=json` at `9fd03a8e` | every `dist/` absent (0 of 0 present) | 26.17 → 30.21, 248 s | 256 files, 5803 tests: 5798 passed, 0 failed, 5 skipped; `success: true` |
| `vitest list --json` at `c672492c` and at `9fd03a8e` (`tools/titles_delta.py`) | absent | 26.29 → 34.31 | base 5781, head 5798, delta +17, added 17, removed 0; by file 14 / 2 / 1 (workspace-reach / sync-child-process-guard / support-purity); the added multiset equals `titles.json`'s `added` list exactly |
| The lane's `tools/mutants.py`, unedited | absent | 18.64 → 26.08 | `summary {'rows': 29, 'asExpected': 29, 'unexpected': []} status after ''` |
| The lane's 29 rows again, plus my 11, through `tools/rev_mutants.py` (records each failure message) | absent | 27.96 → 35.82 | lane 29 / 29 as expected; mine 8 / 11 as pre-written (the 3 others below) |
| The same 29 plus my 13 | all 10 `dist/` present (`npm run build` first) | 43.82 → 37.39 | lane 29 / 29 as expected; mine 10 / 13 as pre-written |
| RP3, RP3W (imported plugin alias), on their own | absent | 39.42 | 2 / 2 as pre-written (and again inside the present run above) |
| RX7 (projects reordered) | present | 30.47 | 1 / 1 as pre-written |
| `npm run typecheck` (in a second clone, `bclone`, after `npm ci`) | — | 34.21 → 35.35 | exit 0, `tsc -p tsconfig.json`, no output |
| Canonical battery (PROJECT-STATUS.md §"How to verify this page", line by line, `tools/battery.py`, in `bclone` at `9fd03a8e`) | — | 19.22 → 23.94 | `commands 114 nonzero 0`. Quoted lines: `check_governance.py` "32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted"; `--selftest` "406 fixtures, 0 failing"; `check_quotations.py` exit 0 (its last line, "note  QC-1  excluded verbatim records, round directory: 139 .md files, 10 quotations, 4 not in their source now; history not searched"); `check_quotations.py --selftest` "selftest: 20 of 20 passed"; `git tag --list 'doctrine-*'` "doctrine-d5-2026-09-27". A first battery run in the review clone was stopped by me after 46 commands (all exit 0), because a `vitest list` checkout of the base in that clone overlapped it; the figures here are the second, whole run in its own clone |
| Hosted checks at `9fd03a8e` | — | — | `checks pass 24m47s` (governance-docs run 40698915188), `node pass 4m12s` (node-ci run 40698915174). The node job ran Node `v24.21.0` (`Found in cache @ /opt/hostedtoolcache/node/24.21.0/x64`) and printed `Tests  5798 passed \| 5 skipped (5803)` over `253 passed \| 3 skipped (256)` files |

- **Kills read as assertions.** `tools/kill_messages.py` over each messages file: absent, 27 of 35 vitest rows have failures,
  "rows naming a timeout 0"; present, 28 of 37, "rows naming a timeout 0" [Observed]. Every lane kill is an `AssertionError`
  (for example E8 `expected 'warns' to be 'refuses'`, M4 `expected [Function] to throw an error`, S5 `expected [
  'resolve.aliases', …(3) ] to deeply equal []`) or, for E4S, the file-level throw `its import condition target
  "./dist/x/../state-directory.js" has an empty, '.', '..' or 'node_modules' segment` [Observed]. E6 and M4b are killed through a
  `toThrow(<string>)` mismatch against the unreadable-entry message (`but got '@syzygy/lib: its entry is not a ./dis…'`), which is
  still the named row's assertion.
- **My mutants** (`tools/rev_mutants.py`; each expected failing set written before the run; edits verbatim in the JSON):

| Id | Edit | Pre-written expectation | Result, both states unless noted [Observed] |
|---|---|---|---|
| RX1 | `REFUSED_SEGMENT`'s `((\.\|%2e)(\.\|%2e)?\|` → `((\.)(\.)?\|` (percent-decoding of `.` dropped from the refused copy) | the `%2e%2e` and `%2E` case rows | as expected: `expected 'warns' to be 'refuses'` |
| RX2 | `INVALID_SEGMENT` loses `/i` (case folding, the copy E8 does not touch) | the `NODE_MODULES` and `%2E` case rows | as expected: `expected 'loads' to be 'refuses'` |
| RX3 | `(n\|%6e\|%4e)` → `(n\|%6e)` in both copies (an encoded capital `N` no longer read) | `[]`: no case row writes `%4E` | **survives** the suite, 78 of 78 pass (N3) |
| RX3T | the same edit, under `node_segments.mjs` | exit 1 | as expected: `regexes false false cases 13/13 mismatches 2` |
| RX5 | `REFUSED_SEGMENT`'s `(n\|%6e\|%4e)` → `(n\|%4e)` | the `%6eode_modules` case row | as expected |
| RX4 | `'require'` dropped from `NODE_CONDITIONS` | `[]`: no row names a `require` target | **survives**, 78 of 78 (N3) |
| RX6 | `REFUSED_SEGMENT.test(target)` without stripping `./` | the `//` case row | killed by that row **and** the severity row (`but got '@syzygy/lib: its import condition tar…'`); my expectation named one row too few |
| RP1, RP1W | a plugin written inline in `vitest.config.ts`, `config: () => ({ resolve: { alias } })`, right and wrong target | `[]`, `[load row]` | killed, but by `vitest.config.ts: 10 projects but 9 recognized single-glob includes`: the guard's text parser counts the plugin's `name:` as a project. Not evidence about the alias walk |
| RP2 | the same plugin with `alias: { … }` written out | the short-tools row | as expected, but by the same project-count throw, not by `ALIAS_KEY` |
| RP3 | the plugin imported from its own module (`vitest-alias-plugin.ts`), `plugins: [aliasPlugin]`, right target | `[]` | as expected: 86 of 86 pass in both files — the residual is real |
| RP3W | the same, wrong target (`/nonexistent/support/index.ts`) | the load row only | as expected: `Cannot find module '@syzygy/support' imported from …/canonical-json.ts` — the hook's alias takes effect, and only the load row sees it |
| RX7 | the POC app project (the one with `globalSetup`) moved to the front of `test.projects` | the new config row | as expected (present): `expected [ 'ssr', 'ssr.resolve', …(66) ] to deeply equal ArrayContaining{…}` (F2) |

- **Node, independently** (`tools/node_forms.mjs`, section 5): 32 target forms × 4 modes (`import` condition by `import()`,
  `require` by `require()`, `default` by each), 128 child `node` runs, each a fresh scratch package. Node's own source compared as
  text: `process.binding('natives')['internal/modules/esm/resolve']` lines 356-357 against the testkit's two `export const` lines:
  "INVALID_SEGMENT === invalidSegmentRegEx true", "REFUSED_SEGMENT === deprecatedInvalidSegmentRegEx true" [Observed].
- **Tree sweep** (`tools/tree_sweep.mjs`, head's `segmentFaultOf` over the manifests at each commit): `c672492c` and `9fd03a8e`
  both "manifests 13, entries 18, targets 63, newFaults [], oldFaults []" [Observed]. `imports` fields: 0 targets in the 13
  manifests. Array targets and a `default` key ahead of another key: 0 in any `exports` [Observed, by script].
- **Old versus new** (`tools/differential.mjs`, the base and head testkits loaded side by side over one two-package fixture whose
  `isFile` holds every `src` file a target could join to): 156 entries — 19 forms × 8 shapes (string, `import`, `require`,
  `source`, `types`, `browser`, nested `node > import`, array fallback), 3 `main` rows, 1 condition-key row. Accepts → accepts 15;
  other refusal → other refusal 10; segment refusal → segment refusal 17; **accepts → segment refusal 48**; other refusal →
  segment refusal 65; **segment refusal → accepts 1** (N2) [Observed].
- **Item 6 by script** (`tools/item6.py`): the retained `fix-n2-object-rest-row.ts.txt` at `9fd03a8e` hashes to
  `73fcffaec45f49fbd589c95c4512a5796235fcd56958b36dc02344cf7e0916f6` (69 bytes), the anchor `'let a = 1; a += 1; [a] = [2];'`
  case occurs once at each commit, and "head == base with fix inserted before anchor: True" [Observed].
- **Records** (section 4, N7): every sha256 in `record.json` re-derived by script: the four `subjects` equal at `cfc79988` and at
  `9fd03a8e`, and the eight `files` equal at `9fd03a8e`; `node-segments.json`'s `subjectSha256` and `casesFromSha256` equal the
  bytes at `9fd03a8e` [Observed].
- Changed-file runs at the head (= the merge with current main): `workspace-reach.test.ts` 78 of 78, `no-egress.test.ts` 6 of 6,
  `support-purity.test.ts` 51 of 51, `sync-child-process-guard.test.ts` 8 of 8, in both dist states (rows W0, N0, P0, G0)
  [Observed].
- **The base rerun.** The refusal rows read the tree's manifests and `vitest.config.ts`, and none of them changed: `git diff
  c672492c 9fd03a8e` outside `docs/` is exactly the four test-side files. So running the new rows "over the base sources" is
  running them over the head tree, which passes (above); the sweep over the base manifests with the head reader returns 0
  faults over 63 targets, and the config blob is the same, so the alias walk returns `[]` there too [Observed].

## 4. Findings

### F1 — blocking (PR body, record, test-support message). "A trailing `/` … which Node loads with the DEP0166 warning" is false

- **Evidence** (`node-forms.json`, Node v24.6.0):
  - `./dist/` and `./dist/x//`, under each of `import`, `require` and `default`, through `import()` and `require()`: Node never
    loads them. With `dist/index.js` and a `dist/package.json` present, `{"default": "./dist/"}` gives `ERR UNSUPPORTED_DIR_IMPORT
    Directory import '…/node_modules/pkg/dist/' is not supported` under `import()` and `ERR MODULE_NOT_FOUND Cannot find module
    '…/pkg/dist/'` under `require()`, each after `[DEP0166] DeprecationWarning: Use of deprecated leading or trailing slash matching
    resolving "./dist/"` [Observed]. Node 24.6.0's `resolvePackageTargetString` (natives, lines 375-423) emits the warning and then
    returns `new URL(target, …)`, a directory URL, which neither loader can load.
  - The guard refuses both forms with "…which Node loads with a deprecation warning (DEP0166)" (testkit `:152`), and the testkit
    comment (`:126-127`) says such a target "it loads with the DEP0166 deprecation warning".
  - Body, "What the test suite now refuses", row 3: "An empty segment (`//`, or a trailing `/`), which Node loads with the DEP0166
    warning." `record.json` `newRefusals[2]`: "an empty segment ('//' or a trailing '/'), which Node loads with the DEP0166
    warning". Both false for the trailing `/`. (For `//`, and for a leading `.//`, Node does load with the warning [Observed].)
  - No case row writes a trailing `/`, so neither the suite nor `node_segments.mjs` measured it; added as a row today,
    `node_segments.mjs` would class Node's outcome `other` and fail.
- **Failure scenario:** the owner notice, written from row 3, tells the owner Node loads a target it cannot load, and a maintainer
  reading the guard's throw for `"./dist/"` is told the same.
- **Fix (exact).** Change the word the message turns on from "loads" to "accepts", which is true of both forms at the segment rule:
  1. `workspace-reach.testkit.ts:152`: `      : [1, 'which Node loads with a deprecation warning (DEP0166)'];` →
     `      : [1, 'which Node accepts with a deprecation warning (DEP0166)'];`
  2. `workspace-reach.testkit.ts:126-127`: `one only the first matches (an empty segment) it loads with the DEP0166\n * deprecation
     warning.` → `one only the first matches (an empty segment) it accepts with the DEP0166\n * deprecation warning (a `//` target
     then loads; one that ends in `/` names a directory, which Node then fails to load).`
  3. `workspace-reach.test.ts:239`, `docs/evidence/syzygy-bpyt-70/tools/node_segments.mjs:43` and `tools/mutants.py:110` (R3's
     `old`): the string `'which Node loads with a deprecation warning (DEP0166)'` → `'which Node accepts with a deprecation warning
     (DEP0166)'`.
  4. Body: the bullet "An empty segment, which Node loads with a DEP0166 warning, throws, naming the warning." → "An empty segment,
     which Node accepts with a DEP0166 warning, throws, naming the warning." Row 3 → "3. An empty segment (`//`, or a trailing
     `/`), which Node 24.6.0 accepts with the DEP0166 warning: it then loads a `//` target, and fails to load one ending in `/`,
     which names a directory (`ERR_UNSUPPORTED_DIR_IMPORT` under `import`, `MODULE_NOT_FOUND` under `require`)."
  5. `record.json` `newRefusals[2]` → the same sentence as the new row 3, in its own quoting style.
  Then re-run `node_segments.mjs --write` and `mutants.py` in both states and regenerate `record.json`'s digests (the subject
  bytes move). A narrower alternative, if the coordinator prefers no code byte: steps 4 and 5 only, plus a residual line "The
  guard's message for an empty segment says Node loads the target; for a target ending in `/` Node warns and then fails to load
  it as a directory." Either clears F1.

### F2 — blocking (PR body, record). The config row refuses a config shape the refusal list does not name

- **Evidence:** `sync-child-process-guard.test.ts:265`, the new row's first assertion:
  `expect(paths).toEqual(expect.arrayContaining(['ssr.resolve.conditions', 'test.setupFiles', 'test.projects.8.test.globalSetup']));`.
  It is there to show the walk read the real config (non-vacuity, and S4/S6 lean on it), but it also refuses any config without
  those three paths at those positions. RX7 moves the POC app project, which holds the config's only `globalSetup`, to the front
  of `test.projects` — an order Vitest does not care about — and the suite fails on this row alone:
  `AssertionError: expected [ 'ssr', 'ssr.resolve', …(66) ] to deeply equal ArrayContaining{…}` (7 of 8 rows pass) [Observed].
  Removing the root `setupFiles`, or adding a project ahead of index 8, fails it the same way [Inferred, from the assertion].
- The body's list of five refusals, and `record.json`'s `newRefusals`, name only "an `alias` key anywhere in the loaded vitest
  config" for this row. The brief's verdict rule: "a refusal the body does not list" is REVISE, and the owner notice the
  precedent rests on must list what the suite newly refuses exactly.
- **Fix (exact, no code byte):** add to the body's list, and to `record.json` `newRefusals`:
  "6. A loaded vitest config without `ssr.resolve.conditions`, without a root `test.setupFiles`, or without a `test.globalSetup` in
  its ninth project (`test.projects.8`). The alias row checks those three paths to show it reads the real config, so reordering the
  projects or moving the fixture-sweep global setup fails it until the row is updated."
  (Optional, if the lane prefers a narrower refusal: replace the index-pinned path with
  `expect(paths.some((path) => /^test\.projects\.\d+\.test\.globalSetup$/u.test(path))).toBe(true);` — then row 6 reads "…or
  without a `test.globalSetup` in any project", and S4/S6 must be re-run to show they still die.)

### F3 — blocking (PR body). The body states no CC-REV-1 class

- **Evidence:** `grep -niF class body.txt` returns nothing [Observed]. GP-Q0 `:60`: "Each pull request states which CC-REV-1
  classes it touches." CC-REV-1 `:49`: "**The change record states** which classes the change touches, or \"none,\"". #554's body
  stated its reading ("My reading is that this is CC-REV-1 class 4 (test guards that refuse more), as for #545; the reviewer
  rules."), and #548 and #549 carry a "CC-REV-1 classes" section [Observed, `gh pr view`].
- **Fix (exact):** add before "## Residuals":
  "## CC-REV-1 classes

  Stated by the author, never final (CC-REV-1): class 4 (security). `entryModulesIn` derives the S10 no-egress bundle's alias map,
  and this PR widens what it and the suite-config guard refuse: an egress path's test guards refusing more, as for #545 and #554.
  Not claimed: 1, 2, 3, 5, 6, 7. The POC surface version moves, but no record binds either version: at `9fd03a8e`, `git grep`
  finds `5e39299adacf` and `ceab7f47e1cf` only in this PR's `record.json` and one retained review raw."

### N1 — note. "Which Node refuses" is said of targets Node never reaches

- `{"default": "./dist/index.js", "import": "./dist/./index.js"}` and `["./dist/./index.js", "./dist/index.js"]`: Node 24.6.0
  loads both, under `import()` and `require()` (a condition after `default` is never read; an array falls back past an
  `ERR_INVALID_PACKAGE_TARGET`) [Observed]. `segmentFaultOf` names the `./` target "which Node refuses (ERR_INVALID_PACKAGE_TARGET)".
- The refusal itself is unchanged: `targetOf` already refuses both entries as unreadable (`differential.json`, the array shape is
  "other refusal → segment refusal"), and 0 of the 18 real entries has an array or a key after `default` [Observed]. Only the stated
  reason is wrong, so this is a note.
- **Proposed fix (follow-up):** treat a target inside an array, or under a key that follows `default` in its object, as one Node
  does not read (`rank 2`), or add a residual: "For a target after `default` or in an array fallback, the message says Node
  refuses it, though Node never reaches it; the entry is refused as unreadable either way."

### N2 — note. One entry the base refused is now accepted: a condition key containing `/../`

- `{ ".": { "a/../b": "./dist/index.js" } }`: the base check (`JSON.stringify(entry).includes('/../')`) refused it; the head reader
  reads only targets, so it accepts it and maps the specifier to `src/index.ts` (`differential.json`, "segment refusal → accepts
  1") [Observed]. Node refuses the package outright: `ERR_PACKAGE_PATH_NOT_EXPORTED No "exports" main defined` under both loaders
  [Observed], because no condition matches. The head's acceptance comes from `targetOf`, which ignores condition names (main's
  behaviour for any unknown condition), not from this PR's rule.
- 0 of the 62 condition keys in the tree's 18 entries contains a `/` (the four keys used are `default`, `import`, `source`,
  `types`) [Observed]. No egress follows from it (Node loads nothing). But the
  body says only what is newly refused, so a reader takes the change as refusing more everywhere.
- **Proposed disposition:** one residual line, "A condition key containing `/../` is no longer refused (the base matched the
  serialized entry); Node refuses such a package with ERR_PACKAGE_PATH_NOT_EXPORTED, and the resolver's condition-name gap is
  `targetOf`'s, unchanged here." Or a follow-up bead on `targetOf` reading condition names.

### N3 — note. Two predicates are pinned only by the pin tool, or by nothing

- **RX3** (an encoded capital `N`, `%4E`, dropped from both copies) survives the suite, 78 of 78, in both states; only
  `node_segments.mjs` (RX3T) kills it, and nothing in CI runs that tool. **RX4** (`require` dropped from `NODE_CONDITIONS`)
  survives everything: a `require`-only refused target would then read "which Node does not read" [Observed]. Workflow step 2's
  "a one-line bug … this test would *not* catch but should" (`SKILL.md:103-104`).
- **Proposed fix (cheap; verified only as far as the rows below go):** add `['./dist/%4Eode_modules/index.js', 'refuses']` to
  `CASES` (the pin tool reads `CASES` from the test source, so it is checked against Node too; my `node-forms.json` records
  Node 24.6.0 refusing it), and to the severity row:
  `expect(() => entryModulesIn(workspace({}, { require: './dist/./index.js', import: './dist/index.js', default: './dist/index.js' })))`
  `.toThrow(`@syzygy/lib: its require condition target "./dist/./index.js" has an empty, '.', '..' or 'node_modules' segment, which Node refuses (ERR_INVALID_PACKAGE_TARGET)`);`
  then RX3 and RX4 should die. `module-sync` and `node-addons` are likewise unpinned members of the set.

### N4 — note. The "copied from Node 24.6.0" claim is true here, and checked against nothing else

- At v24.6.0 the copies equal Node's source text byte for byte (section 3), and all 13 case rows agree with my independent probe
  (section 5) [Observed]. A reader re-checks it with `node docs/evidence/syzygy-bpyt-70/tools/node_segments.mjs` (exit 1 on any
  mismatch), or with the two-line text comparison in section 3.
- Hosted node-ci pins `node-version: 24` (`.github/workflows/node-ci.yml:46`), and ran `v24.21.0` at this head. The test rows do
  not run Node, so CI passes whatever 24.21.0's rule is; whether 24.21.0's regexes equal 24.6.0's is [Unknown] here (no such
  binary was available, and I fetched nothing). The body's residual ("A later Node that changes its rules is caught only when
  `node_segments.mjs` is re-run") is true, and already in force: CI's Node is the later one.
- The tool reads `process.binding('natives')`, a deprecated internal; a Node that removes it makes the tool throw, which fails
  closed but no longer checks anything.
- **Proposed disposition:** add to that residual "Hosted CI runs Node `24.x` (24.21.0 at this head), and the pin was run on
  24.6.0 only", and file a follow-up to run `node_segments.mjs` in node-ci under the job's own Node.

### N5 — information. `imports` targets get no segment check

- Node applies the same two rules to `imports` targets (`resolvePackageTargetString` with `internal`, natives lines 375-423),
  and `resolveIn`'s `#` branch joins them with `moduleIn` unchecked, so `"#x": "./dist/./x.js"` would read as `src/x.ts` where
  Node refuses. 0 `imports` targets in the 13 manifests today [Observed]. Outside the bead's "export-entry reader"; a residual line
  or a follow-up bead.

### N6 — information. The plugin residual is true, and narrower than "any plugin"

- RP3: a plugin imported from its own module that adds the right alias through a `config` hook passes every row of both files;
  RP3W, the wrong alias, fails only the load row, and its `Cannot find module` shows the hook's alias is applied [Observed]. So
  the residual is stated truly, and round 2's "no wrong alias goes unrefused" still holds.
- An inline plugin object in `vitest.config.ts` is refused today, but by accident: the text parser counts its `name:` as a project
  (`10 projects but 9 recognized single-glob includes`, RP1/RP1W/RP2). "The config has no plugins today": `plugins` occurs 0 times in
  `vitest.config.ts` at `9fd03a8e` [Observed].

### N7 — information. Rule 11 and the records

- `record.json` names its four subjects with sha256 (correct at `cfc79988` and `9fd03a8e`) and every retained file with sha256
  (correct). `node-segments.json` names its subject and the case source with sha256 (correct). `mutants-absent.json`,
  `mutants-present.json`, `suite-absent.json` and `titles.json` name their subject by commit id (`cfc79988…`, and `c672492c…` for
  the titles base), and the mutant records store each edit as `{path, old, new}` with the imported tools' sha256. A commit id is a
  digest over the tree, so each record can be re-checked against the bytes it describes [Inferred]. Every figure I re-derived
  matches: 29 / 29 in both states, 256 files, 5798 / 0 / 5, +17 by file, the titles list, both surface versions.
- `suite-absent.json`'s figures were measured at `cfc79988` and mine at `9fd03a8e`; the two differ only in `docs/evidence/`.
- The body's "throws without a claim about Node" (the `types`/`source`/`main` bullet) is loose for `main`, whose message says
  "which Node reads without its exports rules" — a claim about Node, and a true one: Node loads `main: "./dist/x/../main.js"`,
  `./dist/./main.js`, `./dist//main.js` and `./dist/node_modules/main.js` under both loaders [Observed]. Suggested wording, with
  F1's body edit: "throws without saying Node refuses it".

## 5. Node's behaviour per form against the guard's decision

`node-forms.json`; Node v24.6.0; each form under `import` (loaded by `import()`), `require` (by `require()`) and `default` (by
each). Node's outcome was the same in all four modes for every form (three non-loading rows differ only as `ERR_MODULE_NOT_FOUND`
under `import()` and `MODULE_NOT_FOUND` under `require()`), so one column stands for all four. "Guard" is
`segmentFaultOf({[condition]: target}, false)`'s message tail.

| Target | Node, all four modes [Observed] | Guard | Agree? |
|---|---|---|---|
| `./dist/index.js`, `./dist/.hidden/index.js`, `./dist/..x/index.js`, `./dist/...x/index.js`, `./dist/node_modules_x/index.js`, `./dist/%252e/index.js` | loads | accepts | yes |
| `./dist/./index.js`, `./dist/.`, `./dist/x/../index.js`, `./dist/x/..` | throws `ERR_INVALID_PACKAGE_TARGET` | "which Node refuses (ERR_INVALID_PACKAGE_TARGET)" | yes |
| `./dist/node_modules/index.js`, `NODE_MODULES`, `Node_Modules`, `nOdE_mOdUlEs` | throws `ERR_INVALID_PACKAGE_TARGET` | refuses | yes |
| `%2e`, `%2E`, `%2e%2e`, `%2E%2e`, `.%2e` as a segment | throws `ERR_INVALID_PACKAGE_TARGET` | refuses | yes |
| `%6eode_modules`, `%4Eode_modules`, `node%5Fmodules`, all sixteen letters encoded | throws `ERR_INVALID_PACKAGE_TARGET` | refuses | yes |
| `./dist/x\..\index.js`, `./dist\.\index.js`, `./dist\node_modules\index.js` (backslash separators) | throws `ERR_INVALID_PACKAGE_TARGET` | refuses | yes |
| `./dist//index.js`, `.//dist/index.js` | loads, with DEP0166 on stderr | "which Node loads with a deprecation warning (DEP0166)" | yes |
| `./dist/`, `./dist/x//` (trailing `/`) | DEP0166, then **does not load** (`ERR_UNSUPPORTED_DIR_IMPORT` / `MODULE_NOT_FOUND`) | "which Node loads with a deprecation warning (DEP0166)" | **no — F1** |
| `./dist\index.js` (a backslash with no bad segment) | not loaded in my probe, an artefact: Node's URL parser reads `\` as `/`, and I wrote the file under a literal backslash name | accepts the segment; `moduleIn` then refuses it (not `./dist/`) | refused either way |
| `./dist/%2e%2e%2findex.js` (an encoded `/`) | throws `ERR_INVALID_MODULE_SPECIFIER` | accepts the segment; refused by `moduleIn` unless `src/%2e%2e%2findex.ts` exists literally | refused in practice; not a segment form |

- **A form Node refuses that the guard accepts:** none of the segment forms the body lists [Observed: of the 32 forms, 20 Node refuses and the guard refuses as refused,
  2 Node loads with the warning and the guard names the warning, 6 Node loads and the guard accepts]. The two rows the segment rule passes (encoded `/`, and a non-`./` target) are refused by `moduleIn`/`targetOf` in any
  real tree. Shadowed and fallback targets are N1.
- **A form Node loads that the guard refuses without the body saying so:** `//` (and a leading `.//`) — listed, row 3 — and the
  N1 shapes (refused anyway as unreadable). Under `types` or `source`, every form is refused "which Node does not read", and Node
  never reads those conditions — listed, row 4.
- **The 13 case rows** all agree with this probe: the four `loads`, the eight `refuses` and the one `warns` [Observed].
- **The claim the copies equal Node 24.6.0's source** is true by text comparison (section 3). A reader re-checks it by running
  `node_segments.mjs` or the comparison; on a Node upgrade nothing in the suite notices (N4).

## 6. Verdict on each bead item

| Item | Source note (quoted) | Verdict |
|---|---|---|
| 1 | round 1 F3 remainder, alias the dossier subpaths | **Moot** since #549: round 2's N5, "There is no alias map now, and both subpaths load under vitest in both dist states". Agreed; untouched here |
| 2 | round 1 N3: "Node 24 refuses `./dist/./index.js` … but `entryModulesIn` reads it as `packages/lib/src/index.ts` and does not throw"; "A `types` condition of `./dist/x/../index.d.ts` … `entryModulesIn` throws on it with \"…which Node refuses\", which is false for that entry." | **Partly met.** Both halves are fixed: every segment form Node refuses is now refused under every Node condition (section 5), and a `types`/`source` target says "which Node does not read". The message is false for a trailing `/` (F1) and overclaims for shadowed targets (N1) |
| 3 | round 1 N4 (information): "Neither needs a row unless the coordinator wants rows over the guards' own comparisons." | **No row, sound.** The bead says "add rows only if cheap"; round 1 measured the reach (`Map` alone, harmless; X3 basename) and called it information; `record.json` item 3 says why. Nothing is refused for it |
| 4 | round 1 N6, the purity testkit's `typescript` import in `dist` | **Moot** since #549 (round 2 N5: "The build no longer emits it") |
| 5 | round 2 N1: "rewrite `source` and both targets to the `/../` form. Use it for E4" … "Add a row `E1E4S…` … expecting `[]`, the disclosed residual." | **Met**, in this bead's own `tools/mutants.py` rather than the bpyt-46 tool the bead names; the body says so, and leaving a landed bead's retained tool unedited is the sound choice. E4S dies at file level with the new message, E1E4S passes, in both states [Observed]. The residual is in the body |
| 6 | round 2 N2: "Insert the content of `rev-554-r2/tools/fix-n2-object-rest-row.ts.txt` before the `'let a = 1; a += 1; [a] = [2];'` case" | **Met**, byte for byte by script (section 3); W4 kills the dropped arm with `expected [] to deeply equal [ '{ ...Object.freeze } = {}' ]` [Observed] |
| 7 | round 2 N3: "Whichever it decides, it adds the matching row … and changes refusal 5's \"`types` and `source` included\"" | **Met.** Rows for `types`-only, `source`-only, nested `node > import`, `main`, and the severity order; M4, M4b, M6, R1-R4 die; the refusal list's row 4 is updated |
| 8 | round 2 N4: "Its text check could read the loaded config, as the dropped oracle did." | **Met.** The walk catches the shorthand (S2, S3) and every form the text check catches inside the config object; the text check is kept beside it. The plugin residual is true (N6). The row's anchor assertion is an unlisted refusal (F2) |

## 7. Test quality

- **What is pinned well.** Each predicate of `segmentFaultOf` has a killing row: the check itself (E1), depth (E5, E6), the
  narrowing (E7), both case flags (E8, RX2), percent-decoding of `.` and lowercase `n` (RX1, RX5), the empty-segment rule (E9),
  the three exemptions (M4, M4b, M6), the order and every message (R1-R3, RX6), `default` (R4). The alias walk: depth (S4), exact
  key (S5), arrays (S6), the real config (S2, S3). Expected values are literals, and the Node outcomes are independently derived
  from real `node` runs (bar 4); I re-derived all 13 the same way.
- **Gaps:** RX3 and RX4 survive (N3); no row covers a trailing `/`, which is how F1 went unmeasured (bar 3, "boundaries").
- **Failure output** names the defect (bar 7): a case row fails `expected 'warns' to be 'refuses'` under the row title naming the
  target; the severity row's `toThrow(<string>)` shows the condition named. The config row's anchor fails as `expected [ 'ssr',
  'ssr.resolve', …(66) ] to deeply equal ArrayContaining{…}`, which does not say which path is missing; that row would localize
  better with the three paths asserted one by one, or as in F2's optional fix.
- **Flakiness:** no sleeps, retries or skips in the changed rows; the config row's dynamic `import()` of `vitest.config.ts` ran in
  every one of my 40-odd runs without a load-related failure, at loads of 18 to 44 [Observed].

## 8. Cleanup

- Deleted: both clones (`clone`, `bclone`), the `diffroot` fixture directory, and every TMPDIR I made (`/tmp/r557-1` …
  `/tmp/r557-10`); `ls -d /tmp/r557-*` afterwards prints nothing [Observed]. Nothing outside those was deleted; no process outside
  my own tree was signalled (I stopped my own first battery, PIDs 2451081 and 3445914).
- Not kept, by the brief: the PR body copy, the battery, typecheck and `npm ci` logs, the whole-suite JSON and the two `vitest list`
  outputs (each over 2 MB); their result lines are quoted in section 3.
- Kept (none over 300 KB; no JSON key named `source`, `provenance`, `evidence` or `anchor`):

| Path (relative to `rev-557/`) | sha256 |
|---|---|
| `differential.json` | `a0439b10361b1de2eebf38f2c8274d17d28c8e5a359a31dd44c10c583fd4a8d0` |
| `dist-base.json` | `254e3d77b61daa10f1797144c1d086604960f478d8c6bc59a682618e3f418c81` |
| `dist-head.json` | `254e3d77b61daa10f1797144c1d086604960f478d8c6bc59a682618e3f418c81` |
| `loads.txt` | `cd8d61619575e146d0e545c1151d5bf1bef751a92ee85916eceef60e7344ac33` |
| `mutants-absent.json` | `428169164259776d056448e119d42f9724af5ef47e5780076c35fae266620abe` |
| `mutants-absent.log` | `f91e0600ef1ba78530795c55aa45e463e7512941b90fd890abf20288f31f64c8` |
| `node-forms.json` | `ec12534aaa7317802f7286690d8815cfbd647b8478f7754c35487c479866aa43` |
| `rev-mutants-absent.json` | `169983f38a7052cb151a9960efefde41ee6240ff6cab9c4b2caa2408825e1d03` |
| `rev-mutants-absent.json.messages.json` | `64127db817c1922d4c24b9eb48a1830d23b6371db489fa2b2f1b9fa3953e0575` |
| `rev-mutants-absent.log` | `afb3975b5680ee2fa4c9e554a9cc9d4727c4c492008588ea2044cf4105fe7637` |
| `rev-mutants-present.json` | `1954213da80cf2945adc7ffa9e72bc0236e4f4e12ca3c3d4a6ae63ee22aaf9ac` |
| `rev-mutants-present.json.messages.json` | `6315e4d448e650e7688dbfcff3008003ae553eb6bb713084af8f90fef7c4c72a` |
| `rev-mutants-present.log` | `160c185cf433575400cd7c1ff2fe1652d47cfc1574d592356162a268f7c81da4` |
| `rev-plugin-absent.json` | `d98cd9e9f27a1892d49cfa41f8ed1d7ea700ff96b9181e855762e551de3557e3` |
| `rev-plugin-absent.json.messages.json` | `3e794562278837d533f782b306878992e17eab06f00ba70a8242eefaf999f186` |
| `rev-reorder-present.json` | `f80cc351b8aa50274b643873598a63598adbb50e8e352274b5470261c693b177` |
| `rev-reorder-present.json.messages.json` | `9d2376c51aa199d827665b9644f789b5d3869fe5dd3db5c76de3e3b7f635a496` |
| `tools/battery.py` | `2e694f1d78aa990d229bb320993b1bf4b27897929445f049302bfcb4bbf425b0` |
| `tools/differential.mjs` | `923988a4ecae9b9ee02385804297ccb973945b42bd1e9ff4b4f8c60f28697e75` |
| `tools/dist_hashes.py` | `82dbbaf8922ce102f11599b2c145501389c0f792d84daf24044c4dbf88f4c05e` |
| `tools/item6.py` | `4ada537ea6319f400fd1aab49310fb1e6a730eaa99d162b9445719c9900183cd` |
| `tools/kill_messages.py` | `c514faa0b3a5a1098781d0f6cc369f509f38161f269dac2a3791c3a9abfcbf09` |
| `tools/node_forms.mjs` | `b7f105bb688e215c82adfe62eb5301171c957874d8db6257fff2b56978bd0b15` |
| `tools/rev_mutants.py` | `0fdfa311918defe4ec427c68ccc3bb90ce43e7dcacef84cefe0d2d65e9897bab` |
| `tools/suite_summary.py` | `993ba9f4de0482a85307a27af9f21e6e3a9791ecd0550eb3e4a5420d13ac9c0c` |
| `tools/titles_delta.py` | `1e05eda0728e921afe9af1eed5aaa42f1e0a1a9fcc41b96d26f6edcfb6045741` |
| `tools/tree_sweep.mjs` | `adb3bcc5b655399d17e6edcaca9dd99e54fdc561678d6dc72c598d9969266944` |
