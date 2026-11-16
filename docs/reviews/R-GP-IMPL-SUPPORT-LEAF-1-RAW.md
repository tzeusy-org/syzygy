# R-GP-IMPL-SUPPORT-LEAF-1 — CC-REV-1 implementation review of syzygy-bpyt.6.3 stack 1, round 1
Verdict: REVISE
Reviewed commit: fe3855a1
Subject: r1-review.diff sha256 37a1799393b122c18bdd8ecf1a314c53e9a6bdda7e646f1dd88b7e48b980d2d2

Reviewer: rev-530, fresh context, did not author the change. Date: 2026-10-25.
PR #530, branch `agent/syzygy-bpyt.6.3`, stack 1 of 3 (bead `syzygy-bpyt.6.3`, finding DC-3). Base `c104771ff90f47ffd070f2339c36010458679c71`.
Scratch root (all paths below are relative to it unless absolute):
`/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-530/`.

One blocking finding (F1): the S10 no-egress proof's esbuild alias map does not map the new `@syzygy/support` package to
its source. With every `dist/` absent the proof fails deterministically. With a stale `dist/` it proves the old bytes,
not the source under review: a support source that opens an `AF_INET` socket passes it. The fix is one line, and I have
verified it. Seven notes (N1–N7). I observed no changed output: probe, live gate rows, exports, registry-bound digests.

---

## 1. Subject identity checks

All [Observed], by script in my clones (`clone` at fe3855a1, `base` at c104771f, `merged` = local merge `ba5811ff`
of fe3855a1 with main `8ff50172`). All three clones have since been deleted.

| Check | Result |
|---|---|
| `sha256sum r1-review.diff` (lead's file) | `37a1799393b122c18bdd8ecf1a314c53e9a6bdda7e646f1dd88b7e48b980d2d2`: equals the subject line |
| `git diff c104771f fe3855a1 \| sha256sum` | the same digest |
| `git diff a088f1ca c6bf39f2 \| sha256sum` (the diff the lane's evidence measured) | the same digest. The PR's byte-identity claim holds |
| shape | 89 files, +4229/−213, 79 outside `docs/` |
| PR head on GitHub (`gh pr view 530 --json headRefOid,state,mergeable`) | `fe3855a1b4f2164da3274e02d868399236c45c9c OPEN MERGEABLE` |
| PR body | re-fetched before writing, byte-equal to the copy I reviewed (`pr-body.txt` carries a 4-line header, then the body) |
| hosted checks (`gh pr checks 530`) | `checks pass 2m5s`; `node pass 3m35s` |
| `a088f1ca..c104771f` paths ∩ subject paths | 0 (`a088-c104.txt`) |
| `git ls-remote` of GitHub, re-checked at the end | `main` = `8ff50172b127cba676ff32ce62c12c91b2b0d924`; `agent/syzygy-bpyt.6.3` = `fe3855a1…`; `agent/syzygy-bpyt.7.3` = `c68fc5ca6ec99a08c118e112df362bfa8ab01070` |

**Main movement since c104771f** [Observed]: `git diff --name-only c104771f 8ff50172` lists 78 paths (`main-moved.txt`):
- `docs/README.md`;
- 73 under `docs/evidence/`;
- 1 under `docs/reviews/`;
- `packages/polaris-dossier/src/argv.test.ts`;
- `packages/polaris-generation-core/src/workspace-reach.test.ts`;
- `packages/polaris-generation-core/src/workspace-reach.testkit.ts`.

None is a subject path: the intersection with the 89 subject paths is 0.
`git merge-tree --write-tree fe3855a1 8ff50172` is clean, tree `243cbb2250beaf53a6b87279247e03ceb40d05c4`, exit 0. On that
merge (`ba5811ff`), with every `dist/` absent, main's new tests pass: `✓ … argv.test.ts (81 tests)`,
`✓ … workspace-reach.test.ts (21 tests)`.

**PR #529 overlap** [Observed]. The merge base of fe3855a1 and c68fc5ca is c104771f. `git merge-tree --write-tree
--name-only fe3855a1 c68fc5ca` exits 1 with `CONFLICT (content): Merge conflict in package.json`, and auto-merges the
other 8 paths. Per-path line ranges come from `git diff -U0` against c104771f (`tools/shared_paths.py`,
`shared-paths-529.txt`), with A = #530 and B = #529:

| Shared path | #530 (A) base lines | #529 (B) base lines | Same lines? |
|---|---|---|---|
| `package.json` | 14–15, 27 | 14–15, 27 | **yes**, and it conflicts: the `build` / `build:poc` / `typecheck` workspace lists |
| `AGENTS.md` | 183 | 275–276 | no |
| `apps/three-surface-poc/package.json` | 16 | 13 | no |
| `apps/three-surface-poc/src/git-observation.ts` | 1, 4, 83 | 183 | no |
| `apps/three-surface-poc/src/poc-main.ts` | 1, 11, 163 | 7, 226–235 | no |
| `apps/three-surface-poc/src/polaris.ts` | 1–2, 35, 731 | 5 | no |
| `apps/three-surface-poc/tsconfig.json` | 22 | 14 | no |
| `package-lock.json` | 36, 887, 1746, 1754, 1758, 1765 | 25, 34, 875, 1733, 1739 | no (merged textually) |
| `vitest.config.ts` | 6, 33 | 21, 68 | no |

What the second landing must re-check:
- resolve the `package.json` build lists by hand;
- regenerate `package-lock.json` with `npm install`, rather than trusting the textual merge of two workspace-link additions;
- confirm both `vitest.config.ts` aliases and projects are present;
- confirm both `tsconfig.json` references are present;
- re-run `npm ci && npm run build && npm test`;
- re-run the Finding F1 check if #529's package also enters the dossier bundle [Inferred].

## 2. Clauses relied on, and the class ruling

Quoted from the files at fe3855a1 (`git show fe3855a1:<path>`).

- CC-REV-1, `.syzygy/governance/policies/craft-and-care/review-and-documentation.md:31-41`:
  - "1. **authority boundaries** — write-universe, typed-authority table, adapter authorization (VIS-5, VIS-6);"
  - "2. **graph identity** — entity identity minting, continuity, split/merge (SDR-2, SDR-22 identity-based counting);"
  - "3. **deterministic observation** — snapshot composition, evaluation identity, the deterministic/inferred seam (VIS-7);"
  - "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
  - "6. **public interface** — machine-queryable endpoints, adapter contracts, anything an external consumer can depend on;"
- The same file, `:45-51`:
  - "**Class membership is contested by default and is never finally determined by the agent performing the change**"
  - "**A reviewer or the owner** may reclassify at any time."
- GP-Q0, `.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md:52-55`:
  - "\"Behavior-preserving\" means none of the following changes:"
  - "a rendered byte, a wire format, a refusal string or an exit code;"
  - "a signed or digest-bound artifact;"
  - "a consent, security or retention decision."
- The same file, `:62-66`:
  - "**Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4 (security), and class-6 pull requests that remove an endpoint."
  - The checks are "an old-versus-new differential over a mutated-record corpus that includes records with altered prose; a rule-6 mutant for each predicate; a non-blocking owner notice in the cycle report."
- The same file, `:95-96`: "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."
- `AGENTS.md` at fe3855a1:
  - rule 4 (`:123-124`): "Read a check's output, not its exit code, and check its denominator against the whole population."
  - rule 6 (`:126-127`): "Mutate the input and confirm the check fails, per predicate, before trusting it"
  - rule 9 (`:132`): "A claim of absence needs a sweep with a denominator."
  - rule 11 (`:134-135`): "An evidence record names its subject and the subject's digest"
  - guardrail (`:282-283`): "Root Vitest `test.projects` must alias both `@syzygy/cap1-core` and `@syzygy/cap1-daemon` to source; verify with every `dist/` absent."
  - note (`:184-185`): "`packages/support/` (`@syzygy/support`): the one `sha256` and the one `deepFreeze`, a leaf with no workspace dependency"
- Test-rigor bar, `.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`:
  - `:42`: "**A test is worth keeping only if some plausible bug makes it fail.**"
  - `:54`: "A pure refactor should not break tests; a behavior change must."
  - `:93-95`: "10. **Growth is governed** — A test is worth *adding* only if it catches a plausible bug no existing test catches: search for the nearest existing test first and prefer extending it."
  - `:101-102`: "Diff first: for each behavior the change adds or alters, find the test that pins it. Missing pin → finding"

**Class ruling** (mine):

| Class | Ruling | Why |
|---|---|---|
| 1 authority boundaries | **touched** | `body-read-authority.ts` and the owner-act gate modules (`walkthrough-judgment.ts`, `act-fields.ts`) change their helper imports. The digests they compare are computed by the moved helper |
| 2 graph identity | **not touched** in the SDR-2 sense | The digest-minted identifiers that change call form are artifact, request, attempt and anchor ids (e.g. `durable-lifecycle.ts` `attemptId`, `dossier-site.ts` anchors). Their bytes are unchanged (section 5). A reader taking a broader reading would add class 2. That adds no obligation, because GP-Q0's extra checks key on 1, 3, 4 and class-6 removals |
| 3 deterministic observation | **touched** | observation digest, manifest digest, `responseIdentity` contentKey, evaluation question digests |
| 4 security | **touched** | `secret-redaction.ts`, `public-source-classification.ts`, `generation-source.ts`, consent `package-reader.ts`, the SEC-3 closure guard, and the dossier S10 egress proof's closure (Finding F1) |
| 5 data migration | none | no `.syzygy/**` or store change |
| 6 public interface | **additive only** | `@syzygy/support` is `"private": true`. Exports probe: 12 entry points unchanged and 1 added, 862 → 864 names, none changed or removed. No endpoint is removed |
| 7 certificate logic | none | n/a |

The PR's proposal is 1, 3, 4 and additive 6, and I agree with it. GP-Q0's three extra checks therefore apply:
- the differential is present (section 5);
- a rule-6 mutant per predicate is present: 24 lane mutants, and I add 10 of my own;
- the owner notice is the coordinator's.

**Gate behaviour** [Observed]: nothing a gate accepts or refuses changes. The live owner-act gate differential covers
483 rows with 0 differences (`cmp-live.json`). The probe's two gate evaluations are equal. Every replaced helper is
byte-equivalent at its reachable call sites (section 3a). The stop clause is not triggered.

## 3. What I ran, and the results

### 3a. Equivalence of each replaced helper

**Hash chains.** I enumerated by script every removed `createHash` chain in the subject's production `.ts` hunks
(`tools/removed_hash_sites.py`, `removed-hash-sites.json`) [Observed].
- 57 chains; all 57 are `'sha256'`, with one `update`, then `digest('hex')`.
- The update encoding is absent in 45 and `'utf8'` in 12.
- No chain uses `latin1`, `base64`, a multi-`update` or a `digest()` without encoding.

Node's `Hash.update(string)` defaults to UTF-8, and a `Uint8Array` argument ignores the encoding. So each chain hashes
the same bytes as the package's `createHash('sha256').update(value).digest('hex')`
(`packages/support/src/sha256.ts:4-6`) [Observed: code; Inferred: Node semantics, confirmed by the probe's equal digests].

**Hunk check.** `tools/hunk_rewrite_check.py c104771f fe3855a1` rewrites each removed line mechanically:
- inline chain → `sha256(X)`;
- local `digest(` alias → `sha256(`;
- drop `createHash` imports and local definitions.

It then compares the result with the added lines. Result (`hunk-rewrite-c104-fe38.txt`) [Observed]:
`hunks 168 checked 168 differing 5`. The 5 are the 3 new `packages/support/src/*.ts` files and the 2 `vitest.config.ts`
hunks (alias at `:7`, project at `:35-41`). So 163 of 163 non-package production hunks are the mechanical rewrite and
nothing else.

**Removed definitions.** 25 file-local `sha256` definitions and 2 local `digest` aliases [Observed: listed in
`hunk-rewrite-c104-fe38.txt`]:
- `(text: string)` with `'utf8'`;
- `(bytes: Uint8Array)` with no encoding;
- `(value|bytes: string | Uint8Array)` with no encoding.

Each is equivalent to the package for every type it accepted [Observed: bodies; Inferred: Node semantics]. The exported
`act-fields.ts` `sha256(bytes: Uint8Array)` and `deepFreeze` were removed; their importers were `body-read-authority.ts`
and `walkthrough-judgment.ts` only, and no package entry point re-exports them (exports probe: 0 names removed)
[Observed].

**Shadowing.** At fe3855a1 no file both imports `sha256` from `@syzygy/support` and binds a local `sha256`.
`sweep-fe3855a1.json`: the head's `sha256` definitions are `packages/support/src/sha256.ts:4` and the test-support
`apps/three-surface-poc/src/test-walkthrough-judgment-fixture.ts:42` only [Observed].

**`deepFreeze`.** 7 removed definitions, compared by body with `packages/support/src/deep-freeze.ts`. The package is
pre-order, guarded: `if (value!==null && typeof value==='object' && !Object.isFrozen(value)) { Object.freeze(value);
for (const member of Object.values(value)) deepFreeze(member); }` [Observed].
- `prompts.ts`, `project-shape-manifest.ts` and `project-shape-observation.ts`: the same algorithm.
- `model.ts` and `poc-seeds.ts`: the same, written as an early return.
- `act-fields.ts`: the same, using `Object.keys` + index. `Object.keys` and `Object.values` visit the same own
  enumerable string-keyed members.
- **`apps/three-surface-poc/src/polaris-narrative.ts` (base `:132-138`) is the one variant**: post-order
  (children, then itself) with no `isFrozen` guard.

**Narrative probe.** I probed this variant with `tools/narrative_freeze_probe.mjs`, `narrative-freeze-probe.json`
[Observed]. Direct, old vs package:

| Input | Old (narrative) | Package |
|---|---|---|
| frozen shell around unfrozen member | ok, 3/3 frozen | ok, **1/3** frozen |
| cycle | `RangeError: Maximum call stack size exceeded` | ok, 2/2 |
| **typed-array member** (not named by the PR) | `TypeError: Cannot freeze array buffer views with elements`, **1/3** frozen | same TypeError, **2/3** frozen |
| shared member (DAG) | ok, 3/3 | ok, 3/3 |
| plain tree | ok, 4/4 | ok, 4/4 |

The same probe ran through `NarrativeRegistry`, built at base and at head, with:
- frozen inputs, shared bands and later mutation of every input;
- a deep dive and an anchored block.

Results: `jsonEqual True`, `censusEqual True`, 25/25 objects frozen on both sides, and the block 9/9 on both. The
inputs stay unfrozen on both sides, because the registry copies them. A cyclic deep dive gives `RangeError` at base and
`terminated` at head.

**Reachability**:
- `registerDeepDive` freezes `structuredClone(form)` (`polaris-narrative.ts:143` at fe3855a1). `structuredClone` never
  returns frozen objects, so no frozen shell can arrive there.
- Its one production caller (`polaris.ts:1409`) passes `deepDiveMachineForm(...)` (`capability-detail.ts:333-359`).
  That builds a fresh literal whose declared type (`DeepDiveMachineForm`, `capability-detail.ts:282`) holds only
  strings, string arrays and plain records. So it carries no cycle and no typed array [Inferred from the type and the
  constructor].
- `registerAnchored` freezes a fresh literal with spread copies (`:150-166`).
- `narrative()` freezes a fresh literal over arrays of already deep-frozen blocks and dives (`:172-180`). There the
  guard skips the frozen members and the old code re-froze them as a no-op, so the outcome is the same.

So none of the three differences is reachable at these call sites [Inferred]. The PR's claim is right, but it is
incomplete: see N7.

### 3b. The sweep (AC1)

The lane's `sweep.py` reproduces exactly at c104771f/a088f1ca and fe3855a1/9029e1cf (`their-sweep-*.json`) [Observed]:
- population 233 at base and 236 at head;
- `sha256` definitions 25 → 1, `deepFreeze` 7 → 1;
- `createHash('sha256')` sites 62 → 6;
- 55 importers.

My broader sweep (`tools/sweep_helpers.py`, `sweep-*.json`) [Observed]:
- population: every non-test `.ts` under `packages/*/src` and `apps/*/src`, excluding only `*.test.ts`,
  `*.browser.test.ts` and `*.testkit.ts`;
- 246 files at base and 249 at head.

At head it finds 8 `createHash('sha256')` sites, against the lane's 6. The two extra:
- `apps/three-surface-poc/src/test-walkthrough-judgment-fixture.ts:44` (test support);
- **`packages/three-surface-poc-core/src/test-artifact-verification.ts:309`** (production; see N1).

The lane's `TEST_FILE` regex (`sweep.py:24`, `(^|/)test-[^/]*\.ts$`) excludes both. 8 non-test files match that
basename rule at fe3855a1. `test-artifact-verification.ts` is exported from `packages/three-surface-poc-core/src/index.ts:10`
and imported by `model.ts` (the import ending at `:39`). Three fixtures are imported by `polaris-accessibility-variants.ts`, which only
`polaris-accessibility-main.ts` (a `*-main.ts` operator tool) and browser tests import. The other four have no
non-test importer [Observed].

### 3c. Registry-bound and digest-cited files

**Registry-bound files** [Observed] are byte-equal at a088f1ca, c104771f, fe3855a1 and 8ff50172:
- `packages/polaris-dossier/src/git-object-reader.ts` (blob sha256 `9f33e5fb…`);
- `packages/three-surface-poc-core/src/project-shape-observer.ts` (`9ff21517…`).

**Digest citers.** `tools/digest_citers.py`, `digest-citers.json` [Observed]:
- every changed file that exists at base: 72, any extension;
- base blob sha256 of each, searched as a 12–64-hex prefix;
- 4,938 tracked files at fe3855a1 and 27,566 distinct hex tokens scanned;
- 43 hits, every one under `docs/evidence/` or `docs/reviews/` (historical evidence and raws);
- 0 under `.syzygy/`, `openspec/`, `scripts/` or `.github/`.

The PR's narrower figure (58 `.ts` files over 1,479 governed files) is consistent with this.

**Code locators.** `path-locators.txt`: 32 `path:line` code locators in governed trees point into changed files. 16 now
land on different text. All 16 sit in candidate packets or raws: historical citations, which this PR may not edit and
need not. `check_quotations.py` exits 0 (below) [Observed]. Not a finding.

### 3d. Differential and trace (AC3)

**Probe runs.** `diff-probe.mjs` (the lane's tool, digest-checked) ran with TMPDIR `/tmp/r530-p` on built clones
[Observed]:
- base twice, head once, and the merge once;
- all four outputs are byte-identical, sha256 `774265553ec2d9b5a73d7cfba85eb0348f576b30055c630fb854aa836ce69a47`;
- `compare-probe.py` gives 68 rows compared and 0 differ for each pair (`cmp-base-base.json`, `cmp-base-head.json`,
  `cmp-base-merged.json`).

**Probe input mutants** (`tools/probe_dist_mutants.py`, applied to the built `dist/` in `ba5811ff` and compared
with `probe-base-1.json`) [Observed]:
- PM1: `packages/three-surface-poc-core/dist/response-identity.js`, old `sha256(serialized)`, new
  `sha256(serialized + ' ')`;
- PM2: `packages/support/dist/deep-freeze.js`, old `typeof value === 'object' && !Object.isFrozen(value)`, new
  `typeof value === 'object' && !Array.isArray(value) && !Object.isFrozen(value)`.
- Both give exit 1 with 24 model rows differing (`cmp-PM1.json`, `cmp-PM2.json`).
- A one-byte flip of a probe file also gives exit 1.

**Live gate rows.** The live owner-act gate harness `live_diff.mjs` was extracted from
`docs/evidence/owner-act-non-human-rule-differential-2026-10-21.json`; its sha256 `eedf318b…` matches that record's
`harnessText` digest. Base vs head [Observed]:
- 483 rows, 0 differ (`cmp-live.json`);
- both outputs `573893db…`.

**Static check.** `site-equivalence.py` reproduces the lane's result on `a088f1ca..9029e1cf`, `c104771f..fe3855a1` and
`c104771f..ba5811ff` (`site-eq-*.json`) [Observed]:
- 56 files;
- hash arguments 111/111 and freeze arguments 17/17 equal per file;
- 0 non-canonical helpers.
- Its `--selftest` passes 13/0.
- Its compare mode always exits 0 (N4).

**Trace residual** (`hashTrace` in the record) [Observed]:
- 48 stable keys whose head count differs: 44 are a changed file's base text and 1 is the surface tree pair, both
  "explained", and 3 are infrastructure.
- 3,185 distinct head-only keys: 5,306 records are explained as "a base run has an unstable key of the same site,
  algorithm and input length", 147 as a changed file's head text and 11 as the head surface pair.

The 5,306 are the bucketing residual. A same-length change to a deterministic input at a site that also makes
nondeterministic same-length hashes would be absorbed there. Trace coverage is 43/52 files with a replaceable site at
base; 9 are not reached, mostly `*-main.ts` tools.

What closes the residual [Observed]:
- The static check closes it for call-site argument changes. My R3 and R9 are equal-length reorders at call sites, and
  both are killed by the static check.
- It does not close upstream changes to a hashed value. R10 survives the static check, and only a test kills it.
- For this diff, the hunk check closes the rest: 163/163 production hunks are the mechanical rewrite. So no hunk
  changes an upstream value.

### 3e. Mutants

**My own mutants.** Ten of them (`tools/rev_mutants.py`, `rev-mutants.json`). Each was applied at fe3855a1, then the
static check and the listed tests were run. `old`/`new` are stored in the JSON. [Observed]:

| Id | Mutation | Static | Tests (scope) | Outcome |
|---|---|---|---|---|
| R1 | `sha256.ts` hashes the whole backing buffer of a view | not killed | `Tests  5 failed \| 1893 passed` (support, poc-core, gen-core) | killed |
| R2 | freeze skips arrays | not killed | `Tests  12 failed \| 1886 passed` | killed |
| R3 | `dossier-profile.ts` question digest, equal-length field reorder | **killed** | `Tests  2104 passed \| 1 skipped` (gen-core, dossier) | **survives the tests** |
| R4 | post-order, unguarded freeze in the package | not killed | `Tests  2 failed` ("ends the walk at an object that is already frozen", "terminates on a cycle") | killed |
| R5 | `secret-redaction.ts` imports a stale local `latin1` copy instead of the package | **not killed** | `Tests  1 failed` (`redacted-generation-source.test.ts`) | killed by test only (N4) |
| R6 | support imports `node:http` | n/a | closure guard `Tests  1 failed \| 57 passed` | killed |
| R7 | support starts `node` via `execFileSync` | n/a | closure guard `Tests  1 failed \| 57 passed` | killed |
| R8 | support reads `/etc/hostname` via `node:fs` | n/a | closure guard + drafter purity: `Tests  61 passed (61)` | **survives** (N3) |
| R9 | `durable-lifecycle.ts` `attemptId`, equal-length field reorder | **killed** | `Tests  40 passed (40)` (3 owning files) | **survives the tests** |
| R10 | `walkthrough-inputs.ts` `trees.push` → `trees.unshift` (upstream of the hash) | **not killed** | `Tests  3 failed \| 15 passed` | killed by test only |

**The closure guard.** The SEC-3 guard `test-artifact-verification-live-source.test.ts` follows into
`packages/support/src` (its `WORKSPACE_PACKAGES` map adds `'@syzygy/support': '../../support/src/index.ts'`):
- R6 fails it with "imports node:http";
- R7 fails it with "starts 'node', not a literal git or bd";
- R8 passes, because its allowed set admits `node:fs`.

So the guard finds only `node:crypto` in support, and fails on network or process imports, but not on file reads
[Observed].

**The lane's six test-missed mutants, against the whole suite.** I ran C1, C2, C3, C11, F1-headroom-not-frozen and
F3-body-authority-not-frozen against the **whole suite**, with 120 s timeouts (`tools/full_suite_mutants.py`,
`full-mutants-a.json` at fe3855a1, `full-mutants-b.json` at `ba5811ff`) [Observed]:
- C2, C3 and F3: exit 0, every test passing (`numFailedTests: 0`; 5287 or 5315 total, 5 pending).
- C1: 1 failure, `cdp-browser.test.ts` "private browser profile drain did not verify two empty scans before deadline".
- C11: 1 failure, a linear-time bound, `expected 2134.628078 to be less than 2000`.
- F1-headroom-not-frozen: `surface-routes.test.ts` `STACK_TRACE_ERROR` and a browser-suite error.

I re-ran each failing file in isolation with the same mutant applied (`tools/isolate_rerun.py`, `isolate-rerun.json`).
All pass: `Tests  29 passed (29)`, `Tests  37 passed (37)` and `Tests  44 passed (44)`. So the failures were host load:
the load average was 52–82. So no committed test pins any of the six predicates. The denominator is the whole suite:
5,287 tests at fe3855a1 and 5,315 at `ba5811ff` (N2).

**The record's mutants.** `tools/check_record.py`, `record-check.json` [Observed]:
- 24 rows. Each `old` occurs exactly once in its file at the recorded `mutants.head` 9029e1cf.
- Each verdict agrees with its detectors' exit codes and failed rows.
- The summary reads `killed 24, survived 0`.
- The per-row `commit` values (e.g. `63bbca57…`) are scratch commits, absent from every ref I fetched. The re-runnable
  coordinates are `mutants.head` plus `old`/`new`, and those are present.

### 3f. Wiring and dist-absent runs

`packages/support/package.json`:
- `"private": true`, `"type": "module"`, `exports` → `./dist/index.js`;
- no dependencies.
- No file under `packages/support` imports any `@syzygy/*` [Observed: `git grep`].

Other wiring [Observed]:
- Root `package.json` lists `packages/support` in `build`, `build:poc` and `typecheck`. The typecheck log's first
  argument is `tsc -b packages/support …`.
- `vitest.config.ts:7` aliases `@syzygy/support` to source, and `:35-41` adds the project.
- No `packages/cap1-*` file references `@syzygy/support`: 0 files.
- `package-lock.json` adds the workspace link.
- Hosted CI (`.github/workflows/node-ci.yml`) installs strace (`:53-56`), runs `npm ci` (`:83-84`), builds (`:87-88`),
  then tests (`:111-112`).

The PR's `npm ci` instruction is correct for the main checkout, but `scripts/check_generator_install.mjs` does not
check for it (N5).

**Typecheck and governance** [Observed]:
- `npm run typecheck` exits 0 at fe3855a1 and at `ba5811ff`.
- `python3 scripts/check_governance.py` at fe3855a1: `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not
  asserted`, and `CG-2a … 2426 files examined, 0 findings`.
- `python3 scripts/check_quotations.py` exits 0.
- I did not re-run the full PROJECT-STATUS battery. The PR's "Battery 0 failing commands at `fe3855a1`" is [Unknown]
  to me.

**Full suite with every `dist/` absent**, at `ba5811ff` (`vitest-merged-distabsent.log`) [Observed]:
`Test Files  5 failed | 234 passed | 3 skipped (242)` and `Tests  9 failed | 5234 passed | 72 skipped (5315)`.
- Four of the failing files are host-load timeouts: `start-gates.test.ts`, `close.test.ts` and `gate-acts.test.ts` in
  `polaris-dossier`, and `act-families.test.ts` in `polaris-generation-consent`. Re-run at fe3855a1 with every `dist/`
  absent and 120 s timeouts, they give `Test Files  4 passed (4)` and `Tests  311 passed (311)`
  (`vitest-fe3855a1-distabsent-four.log`).
- The fifth is `packages/polaris-dossier/src/no-egress.test.ts`, which fails deterministically: Finding F1.

## 4. Findings

### F1 — blocking. The S10 no-egress proof does not bundle `@syzygy/support` from source

- **Severity:** medium. The class-4 egress proof becomes unsound for the new package, and it goes red in the
  repository's documented dist-absent verification. The fix changes the reviewed bytes.

- **Evidence** [Observed]:
  - **The alias map.** `packages/polaris-dossier/src/no-egress.test.ts:35-44` bundles the dossier driver with esbuild.
    Its `alias` map sends 8 workspace specifiers to `src/`: polaris-generation-core (+`/live`),
    polaris-generation-consent (+`/live`), polaris-dossier, cap1-core, cap1-daemon and three-surface-poc-core. It has
    no entry for `@syzygy/support`.
  - **The bundled closure.** esbuild reports 32 unresolved `@syzygy/support` imports in the bundled closure. The merged
    dist-absent log reads
    `Error: Build failed with 32 errors:` and then, for example,
    `apps/three-surface-poc/src/polaris-generation/dossier-site.ts:9:23: ERROR: Could not resolve "@syzygy/support"`.
  - **Repository search.** `packages/polaris-dossier/src/no-egress.test.ts` is the only file under
    `packages/`, `apps/` and `scripts/` that imports `esbuild` (1 of 1).
  - **Six-arm check** (`tools/egress_alias_check.py`, `egress-alias-check.json`). The single file was run in each arm:

    | Arm | Setup | Result |
    |---|---|---|
    | A | `dist/` present (built from clean source); support **source** mutated to bind an `AF_INET` UDP socket at import | `Tests  2 passed \| 1 skipped (3)`: **the proof passes over an egressing source** |
    | B | as A, plus the one-line alias | `Tests  1 failed \| 1 passed \| 1 skipped (3)`. The capture shows `socket(AF_INET, SOCK_DGRAM\|SOCK_CLOEXEC\|SOCK_NONBLOCK, IPPROTO_IP) = 21` and `bind(21, {sa_family=AF_INET, sin_port=htons(0), sin_addr=inet_addr("127.0.0.1")}, 16) = 0` |
    | C | `dist/` present, alias, no mutant | `Tests  2 passed \| 1 skipped (3)` |
    | D | every `dist/` absent, as committed | `Test Files  1 failed (1)`, `Tests  3 skipped (3)`, `Could not resolve "@syzygy/support"` |
    | E | every `dist/` absent, alias | `Tests  2 passed \| 1 skipped (3)` |
    | F | base c104771f, every `dist/` absent (control) | `Tests  2 passed \| 1 skipped (3)` |

  - **Hosted CI** builds before it tests (`node-ci.yml:87-88` before `:111-112`). So CI bundles a fresh `dist/` and
    stays green. CI cannot see either failure mode.

- **Failure scenarios:**
  1. Anyone verifying in the mode `AGENTS.md:282-283` prescribes ("verify with every `dist/` absent") gets a
     deterministic red S10 proof. The only routes back to green are building first, which defeats the check, or
     ignoring the red.
  2. A later edit to `packages/support/src` that adds a network side effect passes the local S10 proof whenever
     `packages/support/dist` is stale. The proof certifies the old compiled bytes, not the reviewed source. Before this
     PR, the hash helpers the driver reaches were file-local to modules the bundle already takes from source, so the
     proof covered them [Inferred: from the removed definitions' files and the alias map].

- **Proposed fix:** add one line to the alias map in `packages/polaris-dossier/src/no-egress.test.ts`, after `:43`:
  `'@syzygy/support': src('packages/support/src/index.ts'),`.
  - Arms B, C and E above verify it.
  - Optional hardening, so that the next workspace package cannot reopen the gap: an esbuild `onResolve` plugin that
    fails the build when any `@syzygy/*` specifier resolves outside `packages/*/src` or `apps/*/src`.
  - Re-run `npx vitest run packages/polaris-dossier/src/no-egress.test.ts` with every `dist/` absent after the fix.

### N1 — note. A production `createHash('sha256')` site sits outside the sweep's population

- **Severity:** low. Output is unaffected, but the published count and its denominator are wrong (rule 9).
- **Evidence** [Observed]:
  - `packages/three-surface-poc-core/src/test-artifact-verification.ts:308-310` is
    `function junitDigest(rawJUnit: Uint8Array): string { return \`sha256:${createHash('sha256').update(rawJUnit).digest('hex')}\`; }`.
  - It is used at `:367`, exported through `packages/three-surface-poc-core/src/index.ts:10` and imported by
    `model.ts` (the import ending at `:39`). It is production code.
  - `sweep.py:24` (`TEST_FILE`, `(^|/)test-[^/]*\.ts$`) classes it as "test support", so it is in neither the 233/236
    population nor the PR body's "left on purpose" list (`pr-body.txt:58`).
  - The true production count at head is therefore at least 7 sites, not 6.
- **Failure scenario:** a reader relying on "62 to 6, each left on purpose with a reason" misses an inline SHA-256 that
  the next DC-3-style audit would also miss. The basename rule silently admits production files named `test-*.ts`.
- **Proposed fix:**
  - Either replace the chain with `sha256(rawJUnit)` from `@syzygy/support` (equivalent: a `Uint8Array` with no
    encoding), in stack 2 or a follow-up bead;
  - or list it as left on purpose, with a reason.
  - Then change the sweep to exclude files by import reachability, or by an explicit list, instead of by basename, and
    restate the counts with the new denominator.

### N2 — note. Six lane predicates are pinned by no committed test, and two of mine survive their owning tests

- **Severity:** low. This gap existed before the PR [Inferred: the predicates and their tests predate it]. It is a
  test-rigor gap (SKILL.md:42, :101-102).
- **Evidence** [Observed]: whole-suite runs, section 3e. With the mutant applied, every test passes, or only
  load-related failures occur that pass in isolation, for:
  - `C1-manifest-digest` (`project-shape-manifest.ts`, `sha256(canonicalManifestJson(manifest) + ' ')`);
  - `C2-observation-digest` (`project-shape-observation.ts`);
  - `C3-model-artifact-digest` (`model.ts`, `sha256(bytes.slice(1))`);
  - `C11-dossier-evaluation-questions` (`dossier-evaluation.ts`);
  - `F1-headroom-not-frozen` (`model.ts`, `resourceHeadroom` not frozen);
  - `F3-body-authority-not-frozen` (`body-read-authority.ts`, result not frozen).
  - My R3 (`dossier-profile.ts` question digest) and R9 (`durable-lifecycle.ts` `attemptId`) survive their owning
    tests: the gen-core and dossier projects, and the 3 durable-lifecycle and dossier-trigger files. I did not run
    them against the whole suite, so for these two the absence of a pin is [Inferred], not swept.
  - Only the lane's static check and differential, which are evidence tools and not CI, kill these.
- **Failure scenario:** a later edit changes any of these digests' bytes, or drops either freeze, with every test green.
  It would silently move an observation digest or an evaluation identity (class 3), or leave a body-read authority
  result mutable (class 1).
- **Proposed fix:** extend the nearest existing test in each case (bar 10; expected values as hard-coded literals,
  `AGENTS.md:280-281`):
  - one fixed input and a literal expected digest each, for the manifest digest, the observation digest, the model
    artifact digest, the dossier-evaluation `questionsSha256`, the dossier-profile question digest and the
    durable-lifecycle `attemptId`;
  - `expect(Object.isFrozen(model.resourceHeadroom)).toBe(true)` and the same for the `body-read-authority` result.
  - Confirm each new assertion kills its mutant (the fragments are in `run/record.json` and `rev-mutants.json`).

### N3 — note. The support package's purity is unpinned, and the drafter purity test now stops at it

- **Severity:** low.
- **Evidence** [Observed]:
  - **The drafter test.** `packages/three-surface-poc-core/src/owner-act-drafter.test.ts:62` changed from
    `['@syzygy/cap1-core', 'node:crypto']` to `['@syzygy/cap1-core', '@syzygy/support']`. The forbidden-pattern loop
    that follows scans the drafter's own source only.
  - **Before the PR**, the drafter's hash code sat behind an import list pinned to `node:crypto`.
  - **Now**, it sits in `packages/support/src`, and no test constrains that package's imports beyond the closure guard.
    The guard admits `node:fs`.
  - **R8** (support reads `/etc/hostname`) passes the closure guard and the drafter test: `Tests  61 passed (61)`.
  - `AGENTS.md:184-185`'s "a leaf with no workspace dependency" is pinned by no test either.
- **Failure scenario:** a file read, an environment read or a `@syzygy/*` import added to `packages/support/src` passes
  every committed test. Every importer then inherits it, including the owner-act drafter, whose purity the test was
  written to hold.
- **Proposed fix:** a test in `packages/support/src`, or extending `owner-act-drafter.test.ts`. It collects the import
  specifiers of every non-test file under `packages/support/src`, asserts they equal `['node:crypto']` (plus relative
  `./*.js`), and applies the drafter's forbidden list to those files. Confirm that R8 and R6 fail it.

### N4 — note. `site-equivalence.py` exits 0 on difference and checks local helpers at the base only

- **Severity:** low (evidence tooling, not shipped).
- **Evidence** [Observed]:
  - In compare mode `site-equivalence.py` prints JSON and always exits 0; only `--selftest` sets an exit code (its
    `__main__` block).
  - The non-canonical helper scan runs on the base text (`before`, `:136-141`). So R5, a stale local `latin1` copy added
    at head, reads as equivalent statically, and only `redacted-generation-source.test.ts` kills it.
- **Failure scenario:**
  - A rerun gated on exit code (rule 4's trap) reports green over a difference.
  - A reintroduced non-canonical local helper is invisible to the static half of the evidence.
- **Proposed fix:**
  - Exit 1 when any of `filesWhoseHashArgumentsDiffer`, `filesWhoseFreezeArgumentsDiffer`, the global multisets or
    `noncanonicalLocalHelpers` is non-empty.
  - Run the local-helper scan on the head text as well.
  - Add a selftest case for each.

### N5 — note. `scripts/check_generator_install.mjs` does not check for `@syzygy/support`

- **Severity:** low.
- **Evidence** [Observed]: `:4-5` checks only `node_modules/.bin/tsc` and `node_modules/@syzygy/polaris-generation-core`.
  The PR body (`pr-body.txt:12`) says: "Until `node_modules/@syzygy/support` exists the package does not resolve."
- **Failure scenario:** a checkout that pulled this merge without re-running `npm ci` passes the install check, then
  fails at the first import of `@syzygy/support` [Inferred: that the script is the install preflight for generator
  runs; I did not trace its callers].
- **Proposed fix:** add `node_modules/@syzygy/support` to the existence check, or derive the list from the root
  `workspaces`.

### N6 — note. The evidence is reproducible only with the lane's TMPDIR, and one tool header is stale

- **Severity:** low (rule 11, re-checkability).
- **Evidence** [Observed]:
  - The `diff-probe.mjs` output depends on the TMPDIR path: the fixture repository under `$TMPDIR` enters the 24 model
    rows' digests.
  - My four runs at `/tmp/r530-p` agree with each other (`774265553e…`). They differ from the committed
    `docs/evidence/syzygy-bpyt-6-3/probe-output.json` (`c491d2f34da26a5b48b994e780d2beef8b502bb6c2d64fb4fa7a5c48aeedb37f`)
    in 24 of 68 rows: `compare-probe.py`, exit 1, equal byte length.
  - The header (`diff-probe.mjs:3`) says only that "TMPDIR must be a short private directory", and the record does not
    name the TMPDIR used.
  - `hash-trace.cjs:1` says "(preloaded with NODE_OPTIONS=--require; not committed)", but it is committed.
- **Failure scenario:** a later re-checker cannot reproduce the committed probe bytes, and may misread the 24-row
  difference as a behaviour change.
- **Proposed fix:**
  - Record the TMPDIR in the record, or make the probe normalize the fixture root out of the rows.
  - State in the header that outputs are comparable only within one TMPDIR.
  - Correct the `hash-trace.cjs` comment.
  - Evidence files are not act-bound [Observed: 0 governed digest citers], so they can be repaired in stack 2.

### N7 — note. The PR's "differ only" claim for `polaris-narrative.ts` omits a third difference

- **Severity:** low (an accuracy correction; unreachable).
- **Evidence** [Observed]:
  - `pr-body.txt:55`: "They differ only for a cyclic input … and for a frozen shell around unfrozen children."
  - A typed-array member is a third difference. Both versions throw `TypeError: Cannot freeze array buffer views with
    elements`, but they leave different partial states: old 1/3 frozen, package 2/3 (`narrative-freeze-probe.json`).
  - It is unreachable for the same reason as the other two (section 3a).
- **Failure scenario:** none at this call site. A future caller relying on the claim could be surprised by the
  partial-freeze state.
- **Proposed fix:**
  - Correct the claim in the dispositions record.
  - Optionally add a `deep-freeze.test.ts` case pinning the typed-array behaviour, which throws, so callers know not to
    freeze views.

## 5. Changed outputs

None observed. The evidence, all [Observed]:

| Output | Evidence | Result |
|---|---|---|
| `responseIdentity` contentKey, model bytes, freeze census, 6 rendered pages × 24 models, both gate evaluations | `diff-probe.mjs` base×2, head, merge; `compare-probe.py` | 68 rows, 0 differ; outputs byte-identical |
| probe sensitivity | PM1 (`responseIdentity` +1 byte), PM2 (freeze skips arrays), a one-byte flip | each exit 1 (24 rows / file mismatch) |
| owner-act gate decisions | `live_diff.mjs` base vs head | 483 rows, 0 differ |
| public entry points | `exports-probe.mjs` base vs head | 12 unchanged + 1 added; 862 → 864 names; 0 changed or removed |
| hash and freeze arguments | `site-equivalence.py` | 111/111 and 17/17 per file over 56 files |
| registry-bound bytes | blob digests at four commits | equal |
| digest-bound governed artifacts | digest-citer sweep | 0 governed citers |
| production hunks | `hunk_rewrite_check.py` | 163/163 mechanical |

Residual limits:
- The trace's same-length bucket (5,306 records) and trace coverage (43/52 files) are not closed by the trace itself.
- Within this diff, the static check and the hunk check close them (section 3d).
- The dossier S10 proof did not certify the support source (Finding F1). Arm C shows that, with the fix, the proof
  passes over the unmutated source. So no egress change is observed, only an unproven path that the fix closes.

## 6. Verdict per acceptance criterion

- **AC1** — one definition per helper in scope, with the sweep, method and denominator; registry-bound file untouched,
  digests equal: **met, with exceptions**.
  - One `sha256` (`packages/support/src/sha256.ts:4`) and one `deepFreeze` (`packages/support/src/deep-freeze.ts:7`)
    among production files [Observed, both sweeps].
  - The registry-bound files are byte-equal [Observed].
  - Exception, N1: the sweep's basename exclusion leaves the production `test-artifact-verification.ts:309` site out of
    the population and out of the "left on purpose" list. So the published `createHash` count and its denominator
    understate by at least 1.
- **AC3** — `responseIdentity` digests, model outputs and rendered bytes identical: **met** [Observed], section 5.
  F1 does not bear on AC3. It bears on the class-4 proof and on the dist-absent verification, and it makes this round
  REVISE.

## 7. Test quality

- **Net delta** [Observed]: `Tests: +9 ~2 -0` is correct.
  - Added: `packages/support/src/sha256.test.ts` and `deep-freeze.test.ts`, 9 tests in the `@syzygy/support` project.
  - Modified: `owner-act-drafter.test.ts:62` and `test-artifact-verification-live-source.test.ts` (the map entry and
    its denominator now include the 3 support source files).
  - Removed: none.
  - Not modified: `no-egress.test.ts`, which needed the alias (F1).
- **Bar 4** (independent literals) [Observed]: 7 distinct expected values and 11 assertions in `sha256.test.ts`. Each
  was re-derived with Python `hashlib`; all match.
- **Kill power of the support tests** [Observed]:
  - `deep-freeze.test.ts` kills R2 ("returns the value it was given and freezes every object it reaches", "makes a
    later write fail") and R4 ("ends the walk at an object that is already frozen", "terminates on a cycle").
  - `sha256.test.ts` kills R1 ("hashes only the view, not the buffer behind it").
- **Bar 10**: the two new files are justified, since no test of a shared helper existed before. Extending the drafter
  test rather than adding one is right in form, but it weakened what the test holds (N3).
- **Bar 1 and the core rule, SKILL.md:42**: N2 lists six predicates, swept against the whole suite, and two more
  against their owning tests. All are in classes 1 and 3, and for each a plausible bug passes the tests that ran.
- **Bar 6** (observation, outside the subject): under host load (load average 52–82), several pre-existing tests failed
  and then passed in isolation:
  - `cdp-browser.test.ts` profile drain;
  - the `parseJUnitRootTotals` linear-time bound, 2134 ms against 2000;
  - `surface-routes.test.ts` with `STACK_TRACE_ERROR`;
  - four dossier and consent files that time out.

  None is touched by this PR. I mention them only so they are not mistaken for this change's effects.

## 8. Cleanup

Deleted [Observed]:
- scratch clones `clone`, `base` and `merged`;
- a temporary bare clone `mt.git`, used only for `merge-tree`;
- every TMPDIR I created (`/tmp/r530-b`, `-e`, `-f1`, `-f2`, `-g`, `-i1`, `-i2`, `-i3`, `-m`, `-n`, `-p`, `-q` and the
  per-mutant `/tmp/r530-mut-*`, which each run removed). `ls -d /tmp/r530-*` reports no such file.

Nothing else in `/tmp` was touched. No daemon was started; the probes run in-process. No process with `rev-530` in its
arguments remains (`ps -eo pid,ppid,etime,args | grep -F rev-530` lists none). No bd mutation, push, PR comment or merge
was made; the only `bd` calls were read-only (`bd show`, `bd prime`). Apart from npm's package cache, which `npm ci` uses, I wrote
nothing outside the scratch root and my TMPDIRs [Inferred].

Kept: 71 files, none over 300 KB (`find . -type f -size +300k` lists none). The largest is
`vitest-merged-distabsent.log` at 205,479 bytes. sha256 of each:

Tools (`tools/`):
```
38612bb1b1108d36fe131c88e9269cb8ed7d99daccfcb06443772a341476e1ad  tools/check_record.py
7e89ff48d41ac493bb955bc6976aff45a425b0919ee4768c29968a116ea21cd2  tools/digest_citers.py
10227e84891b3fd1b98583d2bf6ae85a1294958260dd431c1ce91c251ef37967  tools/egress_alias_check.py
6dee6e00170fbf7e86e240bd378366f0bd384c1f6e30bc2e726b5584a9c0ef39  tools/full_suite_mutants.py
b99ea9add3c9c4f27f60c420765d9325ea86df35b10749a416635ab47cd0a734  tools/hunk_rewrite_check.py
35eeebe1f32af28184fc3e12c3ccc68dad082092fd4a40a1ece0e8865610342a  tools/isolate_rerun.py
b5549f101274595aaa38ff831620a291e231c2679c8062e6c9359c26a4eeb04b  tools/mutant_ne.py
65699da5b19c9b48e889c9577037dc3bd0e451356f46c8aac0abdf8e5be20777  tools/narrative_freeze_probe.mjs
c2a25dc9e9f99fb810556f8dc01abf14e5e3d36513696f7037b1b14a7fe4d614  tools/probe_dist_mutants.py
5d366a68e4a8a98dcc1cbce85afcb8d90f54c0ea6db8366412a56d996a7bbd21  tools/removed_hash_sites.py
428da53c31f14e95f9aef432e743f45750d335811056fa098e1629f6376c86bb  tools/rev_mutants.py
bcb8b809e87c82c51e38ca98b0ddfeef39c82e91303a9378471a0262ce0a19a1  tools/shared_paths.py
3a1a0ce73361158158add673d98f106a44e4857c2936e5f22ce807338b582616  tools/sweep_helpers.py
eedf318b7e44b39f0b1467b6ca95914a9b39ae7c6e223adc982fd1f9d6c4edaa  run/live_diff.mjs
b67fdfba02de8c3f7f1fe3427788da5ef53710314a502cb7b6fe325e3aca3c68  run/record.json
```
`run/live_diff.mjs` is the harness extracted from the 2026-10-21 record. `run/record.json` is a byte copy of
`docs/evidence/syzygy-bpyt-6-3/dc3-support-module-differential-2026-10-25.json` at fe3855a1; its digest equals that
blob's.

Results:
```
34f217933c7446fda6ec0ae6585058aa30e9f87488fc4ed9398f849c2a704b26  a088-c104.txt
ce1e67c60d775278f0624db3ea601b81230b10a8fd57427455fe119a59a89c4b  build-base.log
37653556985ab7f816334ab3590c1219654ec1d4d97ea99b76e03dfbddb6800b  build-head.log
c3dbaf14e203763bc0059e418fe1c1411c1efcfb8e0b59dbf473b1db695b4b0f  check-governance-fe3855a1.log
08cb35eb9df990c351b0acdea76ff32b2e46b7595638fc8f47333695f32df834  check-quotations-fe3855a1.log
21ec8e902f852404ce9b5b49ed2b395575b3d449ad3b4b2af47a6ade08f4cea9  cmp-PM1.json
4e05f5a1b5c72c46e6eeb87a9816641a663b289861c532ad48969ed2a1bb9aaa  cmp-PM2.json
fdc4fa8cd05b5a00f968068e3b7c1512f23244be8a6a6cdb6b9c2f07fb9eadfa  cmp-base-base.json
fdc4fa8cd05b5a00f968068e3b7c1512f23244be8a6a6cdb6b9c2f07fb9eadfa  cmp-base-head.json
fdc4fa8cd05b5a00f968068e3b7c1512f23244be8a6a6cdb6b9c2f07fb9eadfa  cmp-base-merged.json
c21996eac9ae4f9686309a3c0cb023e95201f3020f134e3f182ab0a3d138c374  cmp-live.json
f65ae511b9ef558cf6ef8bbb69e8da52868fedb3ee8f03e720894c0784bfa85f  code.diff
f78c4e165bd79c2aac2f6c433ca0d1e241c7a28b31e8e77710d8640c7f6c8850  digest-citers.json
9ca36bf98fdf842900c6f5437312ea4d0614c05fab2dc6abf11991a1cd3829ba  egress-alias-check.json
0feebd75b24231080c3be73d77425156df47c9ca98f35f255154bbb380d29690  egress-alias-check.log
2d0f73b1d6252460a1b3e49401e54ced7ae80ec0a28a6be0508d8fb782dd4688  exports-base.json
c2d60716cc02c8f085f329e7e47841538c3892045b33e8562422de2284757c03  exports-head.json
43153f1ab2fb7634121a18eb3b4e259c5aed33f1f407b56ae6c0f0a848ea11e2  full-mutants-a.json
3450d365d9c46ebb1bb5f07bd24e79add8cfa66a4e13d7e8575b234ec437b0ae  full-mutants-a.log
0adb7ffdd07946b0816855e2f57cf820ec4edfd95d58ce154a817ab981fa43b9  full-mutants-b.json
d9442616daf84a0db5b06215cccdb6927fed28751728616f23d61ea7088b4949  full-mutants-b.log
37c7b2f5abe33ba95b79f8cd9a9bfb287d89e08115fecdfe90d1d4f373834ab4  hunk-rewrite-c104-fe38.txt
333f0510b24b8b0f3626e5364d215b95697df34685a099cc88d3ff2a552853ef  isolate-rerun.json
573893db0dc456daedb9e9e8289a816dfa9149be1febc6c5dabec7a3a1b11a5d  live-base.json
573893db0dc456daedb9e9e8289a816dfa9149be1febc6c5dabec7a3a1b11a5d  live-head.json
cc12c6cc2da7a5f4491c6e7b24ba0fccdb18ba96419d62e660192a9f21fd15b1  main-moved.txt
6e8f318c20a8af7f221c086e8acc50aa19bbe42210b8c712f3af2daaa0bbbcbd  narrative-freeze-probe.json
be613f71a3ca4c4868c4dc7219700e561ec34cbcb98cf58230623887b96b51ee  path-locators.txt
71a6f72690db7525f71651cabb0edcf0d0345d711a1974be892850456dd4d1c1  pr-body.txt
69cd83eeffef98d648e92dffa5480da9a873ca7af427a24097eca5116f164024  probe-PM1.json
78f6af08b608888e7f215e39ee99c87bd078a924a720f749a353ac151fe85a7f  probe-PM2.json
774265553ec2d9b5a73d7cfba85eb0348f576b30055c630fb854aa836ce69a47  probe-base-1.json
774265553ec2d9b5a73d7cfba85eb0348f576b30055c630fb854aa836ce69a47  probe-base-2.json
774265553ec2d9b5a73d7cfba85eb0348f576b30055c630fb854aa836ce69a47  probe-head.json
774265553ec2d9b5a73d7cfba85eb0348f576b30055c630fb854aa836ce69a47  probe-merged.json
d47f0ef9094073d76c19e82f61861af28995d30538bf5429e9b2c9256661ea46  record-check.json
67a91384fa5d00da2debc6a11070a274f9821e6dad08740fc68e3f50cf8bf260  removed-hash-sites.json
ae36f80e62dc6c27752ef9ecd116e43f3e375d733189bdd8a63278e2a778a627  rev-mutants.json
e4557eab14ade4befa5f96c00b0a1571f08527da1e44a450cc82fd01f9fe1aad  rev-mutants.log
c906564da01ac91979b80c191b2dc3d0bfbc460e01821b712c04fec026f898a7  shared-paths-529.txt
d97835c3ac95852fb94265514ff67d84157ca5a23c146ffa463f76c08a2468fc  site-eq-a088-9029.json
bc392d7e1f5ae8e38fce25e9855e89aed13578ca8dfbc6fe02fa08350c02dbb6  site-eq-c104-fe38.json
210f9830397df9bdcac51b28fa94f51a15943d4873262b2a000ad5cdc483977e  site-eq-c104-merge.json
7a6add7c4e204bf784b623c8b5c201b0a52e1fa8a4f8ab936e7cdf4988b00777  subject-paths.txt
558a6f385b58afdac30b315c888fe79b7cc622e361bee1f11bc53dfd24206baf  sweep-9029e1cf.json
8d9909f99f97dbbd6f64891b568f799e17378e1f5c241be183a6f33ed1bf8bad  sweep-a088f1ca.json
6fb142cacc53b1b7ec4ea32145c690862b5cd9271bce16e19c5cafdc2065f443  sweep-c104771f.json
30c48b88fc2e4f94a76b6e5c8866398f03da978aab53365f62bdbb71c8b161fb  sweep-fe3855a1.json
f3e607cb79be0e0ae2aebe8fcfb160f84660ba47dc0ab6e38bccedc3a362dc8e  their-sweep-9029e1cf.json
16e1e4570ad95f5d144eab2400f4a4ffa561dc12862cafd00071b2733878ea2c  their-sweep-a088f1ca.json
cfbf01a24af0516fac816fd12fc1a176a971397648b5e0cd3cfa1e0a35835aa4  their-sweep-c104771f.json
1bea3d2753a12535ec065fda1fe1d177e226828eae0574feb7a73de1f9f76f78  their-sweep-fe3855a1.json
623b97bbcdf34eee38d2ae77e131bf9ec6fd56d24fa95b2ce7ed96a33f26cc29  typecheck-fe3855a1.log
623b97bbcdf34eee38d2ae77e131bf9ec6fd56d24fa95b2ce7ed96a33f26cc29  typecheck-merge-ba5811ff.log
8440fba43f3f575be3a9c98033a67e061b8eff6e14d3d70654c4443608cbde12  vitest-fe3855a1-distabsent-four.log
57085524594e7d8ed29b6ec53c8cccf5629877dfb7fbdcb3d857f5c8bfe7eb7a  vitest-merged-distabsent.log
```
The two typecheck logs are byte-equal: both are npm's command echo with no tsc diagnostics. The process exit codes were
0, read from the shell.
