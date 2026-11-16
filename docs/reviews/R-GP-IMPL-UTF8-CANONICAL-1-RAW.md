# R-GP-IMPL-UTF8-CANONICAL-1 — CC-REV-1 implementation review of syzygy-bpyt.6.3 stack 2, round 1
Verdict: REVISE
Reviewed commit: 2d3f9375
Subject: r1-review.diff sha256 ebe914b6ac942629ccd819b06cedac08f6bfaebacf2109ee19ac165a60afa7fd

Reviewer: independent, fresh-context CC-REV-1 reviewer, 2026-10-27. I did not author the change and saw only the
brief, the subject and its governing references. Work ran in a scratch clone of `/home/tze/GitHub/syzygy` checked
out at `2d3f93759a28d35e7b04facb5aaebbcc29697d09`, with two scratch worktrees (`a5ab2b28`, and `2d3f9375` with the
PR's canonical JSON tap applied), Node `v24.6.0`, `npm ci` before every build. No Butlers or other observed repository
content was read; every probe input is synthetic or is the PR's own corpus.

In one paragraph: the decoder replacement is equivalent at all four sites on every input except one fault path, the
decoder probe reproduces byte for byte at both commits, no registry-bound or governed byte changed, and the canonical
JSON record reproduces. Two findings block. **F1:** the byte-order-mark predicate at the object reader and at the
seed reader is pinned by no committed test; mutants that keep the BOM at either site pass every test the full suite
runs (5,368 passed, 5 skipped, of 5,373) and are killed only by the evidence probe, which CI does not run. **F2:** the
`code-structure.ts` reorder (the PR's residual 7) changes the Unknown reason when `withoutGitlinkRecords` fails to
allocate; no input bytes reach it, but it is a changed refusal string under GP-Q0. Eight notes follow (N1–N8), none
blocking.

## 1. Subject identity checks

- [Observed] The subject file's sha256, computed by script, is
  `ebe914b6ac942629ccd819b06cedac08f6bfaebacf2109ee19ac165a60afa7fd`; `git diff a5ab2b28 2d3f9375` in my clone hashes
  to the same value. **Match.** `git diff --stat`: `34 files changed, 70089 insertions(+), 44 deletions(-)`.
- [Observed] `a5ab2b28` is an ancestor of `2d3f9375`. At review time `git ls-remote` gave
  `refs/heads/agent/syzygy-bpyt.6.3-utf8` = `2d3f93759a28d35e7b04facb5aaebbcc29697d09` (the reviewed commit, unmoved),
  `refs/heads/agent/syzygy-bpyt.6.3-fence` = `9d9c98a6f265393fcb46dae6e1484eea097aad20`, and `refs/heads/main` =
  `9dba258992667f62ad503ec76d8a6b99efcc4bac`; `agent/syzygy-bpyt.6.3` is no longer listed (#530 merged).
- **Main since `546f1ff0`.** [Observed] Four first-parent merges: `fe38336e` (#522, 122 paths against its first
  parent), `e5080f4d` (#531, 83), `f7477f52` (#530, 248) and `9dba2589` (#535, 78; it landed after the brief was
  written). The paths of #522, #531 and #535 together: 281 distinct paths, of which 273 are under `docs/` and 8 are
  not: `apps/three-surface-poc/src/browser-origin.test.ts`, `apps/three-surface-poc/src/git-observation.test.ts`,
  `packages/cap1-daemon/src/package.test.ts`, `packages/cap1-daemon/src/server.test.ts`,
  `packages/http-host/src/credentials.test.ts`, `packages/polaris-dossier/src/argv.test.ts`,
  `packages/polaris-generation-core/src/workspace-reach.test.ts`,
  `packages/polaris-generation-core/src/workspace-reach.testkit.ts`. Intersection with the 34 subject paths: **0**
  (`comm -12`). `git merge-tree --write-tree 9dba2589 2d3f9375` exits 0 (tree `b04a8438…`), and in that tree all 34
  subject paths keep the blob they have at `2d3f9375` (34 compared, 0 differ). Earlier in the session the same held
  against `f7477f52` (clean, 34 of 34 unchanged).
- **Sibling #533.** [Observed] `git merge-tree --write-tree --name-only 2d3f9375 9d9c98a6` exits 1:
  `CONFLICT (content): Merge conflict in AGENTS.md` and `Auto-merging packages/three-surface-poc-core/src/project-shape-manifest.ts`.
  The two deltas over `a5ab2b28` share 3 of their paths (34 here, 18 there):
  | Shared path | Same lines? | Result |
  |---|---|---|
  | `AGENTS.md` | **Yes.** Both insert a bullet after line 190 of `a5ab2b28` (this PR: hunks `@@ -184,4 +184,5 @@` and `@@ -190,0 +192,5 @@`; #533: `@@ -190,0 +191,7 @@`) | conflict; the second landing must keep both bullets by hand |
  | `packages/three-surface-poc-core/src/project-shape-manifest.ts` | No. #533 edits line 175 (`@@ -175 +175 @@`), this PR line 332 (`@@ -332 +332 @@`) | auto-merges; but `comment-only.mjs` was run on each branch alone, never on the merged file |
  | `docs/evidence/syzygy-bpyt-6-3/comment-only.mjs` | identical change | byte-identical: blob `b81401601eebc7babd391f0da0be093ec0256ba1` at both heads |
  The PR body says both "#533 is a sibling and touches different files" and that `comment-only.mjs` is byte-identical
  "so the two PRs merge cleanly in either order". The tool is byte-identical; the other two statements are false (N7).
  **What the second landing must re-check:** resolve `AGENTS.md` by hand, keeping both bullets; run
  `comment-only.mjs` over the merged `project-shape-manifest.ts` against `a5ab2b28`; re-run `check_governance.py`, and
  the new test files of both PRs, on the merged tree.

## 2. Clauses relied on, and the class ruling

Quoted from the files at `2d3f9375` (rule 8).

- CC-REV-1, `.syzygy/governance/policies/craft-and-care/review-and-documentation.md`:
  - `:18-20` "Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the
    agent performing the change never finally decides which classes it touches."
  - `:31-32` "1. **authority boundaries** — write-universe, typed-authority table, adapter authorization (VIS-5, VIS-6);"
  - `:35-36` "3. **deterministic observation** — snapshot composition, evaluation identity, the deterministic/inferred seam (VIS-7);"
  - `:37` "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
  - `:40-41` "6. **public interface** — machine-queryable endpoints, adapter contracts, anything an external consumer can depend on;"
  - `:45-47` "**Class membership is contested by default and is never finally determined by the agent performing the change**"
- GP-Q0, `.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`:
  - `:52-55` '"Behavior-preserving" means none of the following changes:' / "a rendered byte, a wire format, a refusal
    string or an exit code;" / "a signed or digest-bound artifact;" / "a consent, security or retention decision."
  - `:62` "pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4 (security)"
  - `:64-66` "an old-versus-new differential over a mutated-record corpus that includes records with altered prose;" /
    "a rule-6 mutant for each predicate;" / "a non-blocking owner notice in the cycle report."
  - `:95-96` "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."
- `AGENTS.md` at `2d3f9375`: `:126-127` rule 6 "Mutate the input and confirm the check fails, per predicate, before
  trusting it"; `:132` rule 9 "A claim of absence needs a sweep with a denominator."; `:134-135` rule 11 "An evidence
  record names its subject and the subject's digest; a record that names neither cannot be re-checked against the
  bytes it describes."; `:95` "Never edit an artifact after an act has bound its digest."
- Test-rigor bar, `.claude/skills/th-engineering/subskills/test-rigor/SKILL.md` (read by `git show 2d3f9375:<path>`):
  - `:42` "**A test is worth keeping only if some plausible bug makes it fail.**"
  - `:52-54` "1. **Assert behavior, not implementation** — Tests pin observable outcomes (return values, state
    transitions, emitted effects), not internal call sequences. A pure refactor should not break tests; a behavior
    change must."
  - `:60-62` "3. **Edge and failure paths are first-class** — Empty inputs, boundaries, invalid states, error branches,
    and concurrency-sensitive paths get tests proportional to blast radius."
  - `:64-67` "4. **No tautologies** — … Expected values are literals or independently derived."
  - `:93-94` "10. **Growth is governed** — A test is worth *adding* only if it catches a plausible bug no existing test catches"
  - `:101-102` "Diff first: for each behavior the change adds or alters, find the test that pins it. Missing pin →
    finding (expectation 1–3)."
  - `:103-104` "apply the mutation thought-experiment: name a one-line bug in the code under test this test would *not*
    catch but should."

**Class ruling (mine).**

| Class | Touched? | Why |
|---|---|---|
| 1 authority boundaries | **Yes** | `authority-artifact-fields.ts` decodes the consent, policy and registry artifacts the body-read authority gate evaluates. [Observed] |
| 2 graph identity | No | no entity identity minting or continuity code changed. [Observed: the 8 production files of the diff] |
| 3 deterministic observation | **Yes** | `project-shape-observation.ts` (observation of the shape, its identity inputs), `code-structure.ts`, `git-object-reader.ts`; a comment on `canonicalJson`, the PWB identity encoder. [Observed] |
| 4 security | **Yes** | the object reader feeds the active-content scan and secret detectors; the seed reader feeds `classifyPhaseA` (`project-shape-observation.ts:438`). [Observed] |
| 5 data migration | No | no `.syzygy/**` file and no store changed. [Observed] |
| 6 public interface | Additive, internal only | `@syzygy/support` gains the export `decodeUtf8`; the package is `"private": true` with one `.` export, so no external consumer can depend on it. [Observed: `packages/support/package.json`] No endpoint is removed. |
| 7 certificate logic | No | none exists. |

The PR's own statement (classes 1, 3, 4 with additive 6) agrees with mine. Under GP-Q0 `:62` the three further
checks apply. **What a gate accepts or refuses:** [Observed] over the decoder probe's 12,841 rows (9 drivers ×
1,604 inputs plus 9 code-structure cases) base and head give identical outcomes, and my reach probe confirms every
decoder outcome class reaches each site. [Inferred] No gate accepts or refuses anything differently on any input;
the one difference is F2's Unknown reason, where both commits return `kind: 'unknown'`. The stop clause `:95-96` is
not triggered.

## 3. What I ran, and the results

| Check | Tool (kept under `rev-534/`) | Result |
|---|---|---|
| Subject digest | `sha256sum`, `git diff a5ab2b28 2d3f9375 \| sha256sum` | match (section 1) |
| Per-site equivalence | reading the four old decoders at `a5ab2b28` and the call sites at `2d3f9375` | three sites identical; one fault-path difference (F2); table below |
| Shared-instance state | `tools/decoder_state_probe.mjs` | 300,000 seeded calls: `"freshVsShared": 0`, `"freshVsDecodeUtf8": 0`; selftest with a `stream: true` shared decoder: `"freshVsShared": 9685` (the probe can see carried state) |
| Decoder probe, both commits | the PR's `utf8-probe.mjs` on built `a5ab2b28` and built `2d3f9375`; `compare-utf8-probe.py` | both outputs sha256 `be4bd04594ccd42f0b2e129a1a38c0709f342f0a416fdb803b4f3c1f28cc2667`, equal to the committed `utf8-probe-output-base.json`; `"rowsCompared": 12841, "rowsDiffer": 0, "missing": 0, "extra": 0` (`probe-compare.txt`) |
| Probe and tests under the brief's three decoder mutants | `tools/my_mutants.py` (R1–R3) | all three killed by tests **and** probe (table below) |
| Refusal-path reach | `tools/instrument_decode.py` + `tools/reach_probe.mjs` | 88 of 88 driver × input rows reach `decodeUtf8` with exactly the input bytes; 56 refused, 32 decoded (`reach-probe.json`) |
| Reorder (residual 7) | `tools/reorder_fault_probe.mjs` | base and head differ under an injected allocation failure (F2) |
| Registry-bound files | `git show <c>:<p> \| sha256sum` | byte-equal at `a5ab2b28`, `2d3f9375` and `9dba2589` |
| Digest and path sweep | `tools/digest_sweep.py` | 30 needles, 5,125 files, 52 hits, 0 in governed trees; methods agree (`digest-sweep.json`) |
| Canonical probe | the PR's `canonical-json-probe.mjs` on built `a5ab2b28` | output byte-identical to the committed `canonical-json-probe-output.json` (sha256 `85ae9c295a599d5ef004fa9b15c97c3b7a04a6151dc7ede3faf72cf1c3c7ae51`) |
| Canonical tap | the PR's `canonical-json-tap-apply.py` on a scratch worktree at `2d3f9375`, full suite, `canonical-json-tap-aggregate.py` | equal to the committed aggregate after replacing the clone path in 16 test-caller labels (`tap-aggregate-2d3f9375.json`) |
| Comment-only edits | the PR's `comment-only.mjs` over `a5ab2b28..2d3f9375` | `canonical-json.ts` and `project-shape-manifest.ts` emit-equal (`comment-only-a5ab-2d3f.json`) |
| Committed mutant records | `tools/check_mutant_record.py` | `rows 19 oldExactlyOnce 19 consistent 19` (`mutant-record-check.txt`) |
| My mutants | `tools/my_mutants.py` | 16 mutants; S1, S2, S4, S9 and S10 survive every committed test (F1, N3) |
| Census | `tools/census.py` | base 53 constructions in 36 files, head 50 in 33; methods agree; 20 strict sites remain (`census-*.json`) |
| New test files ×5 | `npx vitest run` on the 4 new test files, 5 runs | each run `Test Files  4 passed (4)`, `Tests  35 passed (35)` (`new-tests-5x.log`) |
| Typecheck | `npm run typecheck` at both commits | exit 0 at both; no diagnostics (`typecheck-*.log`) |
| `check_governance.py` | both commits | `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted` at both (`check-governance-*.log`) |
| `check_quotations.py` | both commits | exit 0; the two outputs are byte-identical; `OK    QC-1  … 37 quotations examined in 18 of 949 .md files scanned … 0 findings` (`check-quotations-*.log`) |
| Full suite at head | `npx vitest run` | `Test Files  1 failed \| 245 passed \| 3 skipped (249)`, `Tests  5303 passed \| 70 skipped (5373)`; the failure is `act-families.test.ts`'s `Error: Hook timed out in 10000ms.` under load; the file alone passes, `Tests  65 passed (65)` (`full-suite-head.log`, `act-families-alone.log`) |

**Per-site equivalence.** [Observed by reading both commits.]

| Site | Old decoder at `a5ab2b28` | Call site at `2d3f9375` | Equivalent? |
|---|---|---|---|
| `git-object-reader.ts` | module `STRICT_UTF8 = new TextDecoder('utf-8', { fatal: true })`; local `decodeUtf8` in try/catch, `undefined` on any throw | `:355` NUL check, `:356` `decodeUtf8(bytes)`, `:357` outcome `'not-utf-8'` | identical text; same `fatal`, same BOM (dropped), same refusal value, no streaming; caller unchanged |
| `project-shape-observation.ts` | the same two declarations, byte for byte | `gitText` `:359-360` (detail ``git ${args[0] ?? ''} produced non-UTF-8 output``); seed reader `:433-436` (reason `'seed is not valid UTF-8'`) | identical; callers unchanged |
| `authority-artifact-fields.ts` | `decode` constructs `new TextDecoder('utf-8', { fatal: true })` per call, inside its try | `parseConsentArtifact` and `parseJson`, detail `'not strict UTF-8'` | equivalent: a non-streaming `decode()` starts from a fresh decoder state on every call, including after a throw; 300,000 calls, 0 differ. One difference only on a Node built without ICU (N6) |
| `code-structure.ts` | `try { return STRICT_UTF8.decode(withoutGitlinkRecords(bytes)); } catch { throw new NonUtf8GitOutput(); }` | `:121` `decodeUtf8(withoutGitlinkRecords(bytes))`; `:122` throws `NonUtf8GitOutput` on `undefined` | same on every input; differs when `withoutGitlinkRecords` throws, which no input makes it do (F2) |

No site decodes with `stream: true` at either commit, and none passes `ignoreBOM`. [Observed]

**Reach.** [Observed, `reach-probe.json`] For 8 drivers (consent, policy, registry, object reader, seed reader, and
the observer's rev-parse, show and ls-tree outputs) × 11 inputs (empty, a lone BOM, BOM-led text, BOM-led consent
text, a truncated 3-byte and a truncated 4-byte sequence at the end, `ED A0 80`, overlongs `C0 80`, `E0 80 AF` and
`F0 80 80 AF`, and a BOM followed by `FF`), every row reached the decoder with exactly the input's bytes. The empty
buffer and the lone BOM are decoded, not refused, at every site (the object and seed readers return text `""` for both);
every malformed input is refused at every site. The code-structure refusal is reached by 4 cases of the committed probe.

**Mutants.** Each row replaces `old` by `new` exactly once in a file at `2d3f9375` (`oldCount` 1 for all 16;
fragments are stored verbatim in `my-mutants.json`). "Tests (core)" ran every test file of `@syzygy/support` and
`@syzygy/three-surface-poc-core` (1,149 tests); "full" ran the whole suite (5,373 tests); the rerun of S1, S2, S4 and S9
(`my-mutants-full-2.json`) passed `--testTimeout=60000 --hookTimeout=60000`, every other run the defaults; "probe" ran `utf8-probe.mjs` on the rebuilt packages against the committed output.

| Id | Mutation | Tests (core) | Full suite | Probe rows differing |
|---|---|---|---|---|
| R1 | `decodeUtf8` keeps the BOM (`ignoreBOM: true`) | killed: `decode-utf8.test.ts` "drops one leading byte-order mark and keeps a second", `authority-artifact-fields.test.ts` "with or without a leading byte-order mark" | — | 552 |
| R2 | `decodeUtf8` not fatal | killed, 13 tests in 7 files | — | 6,866 |
| R3 | refusal returns `''` | killed, 13 tests in 7 files | — | 6,866 |
| M1 | strips every U+FEFF | killed (`decode-utf8.test.ts`) | — | 32 |
| M2 | refuses the empty buffer | killed (2 tests) | — | 497 |
| M3 | decodes `bytes.buffer`, not the view | killed (8 tests) | — | 4 |
| S1 | object reader keeps the BOM | **survives** (`Tests  1147 passed \| 2 skipped (1149)`) | **survives** (`Tests  5368 passed \| 5 skipped (5373)`) | 176 |
| S2 | seed reader keeps the BOM | **survives** | **survives** (`Tests  5368 passed \| 5 skipped (5373)`) | 176 |
| S3 | object reader labels the refusal `contains-nul` | killed (2 tests) | — | 761 |
| S4 | seed reader reason `'seed is not readable'` | **survives** | **survives** (`Tests  5368 passed \| 5 skipped (5373)`) | 761 |
| S5 | code-structure throws a plain `Error` | killed (1 test) | — | 4 |
| S6 | consent falls back to a lenient decode | killed (1 test) | — | 890 |
| S7 | JSON artifact detail `'not JSON'` | killed (1 test) | — | 1,780 |
| S8 | git-text detail reworded | killed (1 test) | — | 2,670 |
| S9 | `gitText` keeps the BOM | **survives** | **survives** (`Tests  5368 passed \| 5 skipped (5373)`) | 192 |
| S10 | code-structure keeps the BOM | **survives** | **survives** (`Tests  5368 passed \| 5 skipped (5373)`) | 0 (equivalent, N3) |

Two first runs mislabelled survivors as killed, and I re-ran both: in the first core run, S1 and S2 each lost one test
of `test-artifact-verification-live-source.test.ts` (one a `5022ms` timeout); re-run, both pass 1,147 of 1,147
(`scratch-s1s2.json`). In the first full run (default timeouts), S4 and S9 each lost
`polaris-dossier/src/start-gates.test.ts` to a load timeout; that test passes 3 of 3 at the head and 3 of 3 under
each mutant (run in this session; that log was not kept), and the raised-timeout rerun of S1, S2, S4 and S9
(`my-mutants-full-2.json`) is the one recorded above. S10's full-suite row is from the first full run
(`my-mutants-full.json`), where it lost no test.

**Census.** [Observed, `census-head.json`] My predicate: every tracked blob under `packages/`, `apps/` or `scripts/`
ending `.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.mjs` or `.cjs` (536 at the head, 531 at the base); a construction is
`new` + optional `globalThis.`/`util.` + `TextDecoder` outside a whole-line `//` comment; second method `git grep -c
-E`. Base: 53 constructions in 36 files; head: 50 in 33; methods agree; this equals the PR's figures, which it took at
`6cbb3186` and `0e2640e9` over its narrower population. Production at the head: 46 (40 inline, 5 constant, 1 helper, as the PR counts them); 21 strict
(`fatal: true`, no `ignoreBOM`), the helper and these **20**: `apps/three-surface-poc/src/capability-detail.ts:254`,
`git-blob-batch.ts:33`, `governance-inputs.ts:200`, `:222`, `:232`, `polaris-generation/dossier-evaluation-main.ts:41`,
`polaris-generation/public-source-screening.ts:149`, `polaris-generation/self-corpus.ts:59`, `verbatim-route.ts:117`;
`packages/polaris-dossier/src/check.ts:335`, `close.ts:186`, `design-review.ts:48`, `render.ts:151`, `review.ts:138`,
`screen.ts:81`, `waiting-sessions.ts:386`; `packages/polaris-generation-core/src/dossier-evaluation.ts:352`;
`packages/three-surface-poc-core/src/project-shape-model.ts:545`, `walkthrough-readiness.ts:288`; and
`scripts/probe_pwb_gate_on_altered_policy_act.mjs:45`. **On class 1 or 4 paths** [Inferred from each enclosing
function and file, not traced end to end]: `governance-inputs.ts:200/222/232` (governance and act inputs: class 1),
`public-source-screening.ts:149` and `polaris-dossier/src/screen.ts:81` (the screening policy: class 4),
`verbatim-route.ts:117` and `capability-detail.ts:254` (verbatim body text after the secret detectors: class 4), and
`git-blob-batch.ts:33` (`parseGitCatFileBatch`, body reads: class 4). That is 8 of the 20. A named-helper sweep (`git
grep -E "STRICT_UTF8 *=|function decodeUtf8|function decode\("`) finds at the head exactly one `STRICT_UTF8` and one
`decodeUtf8`, both in `packages/support/src/decode-utf8.ts`; the 8 `decode(text: string)` hits are HTML-entity
decoders, not UTF-8 decoders.

**Bound and digest-cited bytes.** [Observed] `packages/polaris-dossier/src/git-object-reader.ts` (sha256
`9f33e5fbbf464b1df28b79c3fcf5016b8ad7db1910041734c5fb8e4a790998f3`) and
`packages/three-surface-poc-core/src/project-shape-observer.ts` (sha256
`9ff2151735897a0f5af295669240af79cdd3b038fcb4dc0a2bab50b5ecef93c6`) are byte-equal at `a5ab2b28`, `2d3f9375` and
`9dba2589`. My sweep (`digest-sweep.json`) took 30 needles (sha256 and git blob id of the base and head bytes of the
edited production files), each searched by its first 8 hex characters over the bytes of all 5,125 tracked files at
`2d3f9375`, each hit recording how many hex characters of the digest it carries: 52 hits, **0** under `.syzygy/`,
`openspec/`, `scripts/` or `.github/`; a second method (`git grep -F -l` of each 8-hex prefix) gives the same file
sets. Outside the PR's own directory the hits are: the base sha256 of
`authority-artifact-fields.ts` in four `docs/evidence/live-verification-test-no-spawn-mutants-*-2026-10-07.json`
records, in `docs/reviews/R-P110-EXPLICIT-SELECTION-PROBES-EFCBB78F-1-RAW.md` (64 hex) and in
`docs/reviews/R-LIVE-TEST-NO-SPAWN-1-RAW.md` (an 8-hex prefix, which the PR's own sweep missed: N8); the base sha256
of `code-structure.ts` in `docs/evidence/code-structure-ls-tree-z-differential-2026-10-21-r3.json`,
`code-structure-ls-tree-z-mutants-2026-10-21-r3.json` and `docs/reviews/R-GP-IMPL-CODE-STRUCTURE-3-RAW.md`. All are
historical evidence or retained raws describing older bytes; none binds. A path sweep (`git grep -F`) of
`.syzygy/`, `openspec/`, `scripts/` and `.github/` at `2d3f9375` for the edited production paths finds: the core
`git-object-reader.ts` cited by path, or at `:41-44`, `:43` and `:191`, in candidate packages under
`.syzygy/governance/contracts/candidates/`, all lines this PR leaves in place (it edits `:29` in place and removes
`:277-286`); `project-shape-observation.ts` cited by path or at `:50`, `:75-83` and `:82`, also unmoved (edit `:27` in
place, removal at `:114-123`); `code-structure.ts` by path only (`openspec/changes/three-surface-poc-experience/tasks.md:26`);
`authority-artifact-fields.ts` and `decode-utf8.ts`: none. Two scripts read edited files: `install_redis_sitting.py`
replaces policy identity and version strings in the core `git-object-reader.ts`, and
`build_pwb_registry_machine_ceiling_amendment.py` reads `PWB_RESOURCE_LIMITS` from `project-shape-observation.ts`;
neither text is touched here. The registry and policy artifacts name neither file. `code-structure.ts` lines after
`:2` move (by +2, then +1, then −1); their only line citers are historical raws. [Inferred] No bound or digest-cited
governed byte changed.

**#530's N9 and N10.** [Observed] `decode-utf8.ts` is in the support purity test's scan and passes; it uses only the
`TextDecoder` global (no file, process or clock) and adds no package export or subpath, so neither note changes.

## 4. Findings

### F1 — blocking (medium). The BOM predicate at the object reader and the seed reader is pinned by no committed test

- **Evidence.** [Observed] Mutant S1 replaces the object reader's decode
  (`packages/three-surface-poc-core/src/git-object-reader.ts:356`) by a strict decoder that keeps a leading BOM
  (`new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })` in the same try/catch); S2 does the same at the seed
  reader (`project-shape-observation.ts:433`). Both pass every test of the full suite, `Test Files  246 passed | 3
  skipped (249)` / `Tests  5368 passed | 5 skipped (5373)`, and are killed only by `utf8-probe.mjs` (176 rows each),
  a docs/evidence tool CI does not run. The PR's 18 mutants mutate the BOM only inside `decodeUtf8` (D2), and the
  per-site mutants G1 and O1 only make the site lenient, so this predicate was never mutated at a site. [Inferred]
  The gap predates this PR (the two sites' test files are unchanged here), but GP-Q0 `:65` asks "a rule-6 mutant for
  each predicate" of this PR, and the brief's verdict rule names "a mutant of a decoder predicate that every
  committed test accepts".
- **Reachable.** [Observed] A BOM-led blob reaches both decodes (`reach-probe.json`: `bom-led-text` decodes to
  `"a\n"` at both) and is ordinary repository content [Inferred: some editors write a BOM by default].
- **Failure scenario.** `decode-utf8.ts:4-5` itself invites the edit: "a decoder that must keep it (`ignoreBOM`) is its
  own call." Someone gives one site its own BOM-keeping call, or swaps the import for a local strict decoder with
  `ignoreBOM`. A Butlers declaration saved with a BOM then reaches the active-content scan, the secret detectors and
  the literal line grammar with a leading U+FEFF, so its first line no longer starts with `#`, and every test stays
  green. [Inferred] The rendered shape changes, which GP-Q0 `:53` forbids without an owner act.
- **Proposed fix.** Add two committed tests, with literal expected values (bar 4):
  1. `git-object-reader.test.ts`: `createExactObjectReader` over a blob `EF BB BF 61 0A` (its git blob id computed
     in the fixture) returns `{ kind: 'text', text: 'a\n', … }`, and over `EF BB BF EF BB BF 61` returns text
     `'\uFEFFa'` (one BOM dropped, a second kept).
  2. `project-shape-observation.test.ts` (or the new `project-shape-git-text.test.ts`): `createPhaseASeedReader` over
     a BOM-led seed returns `{ kind: 'text', text: 'a\n', … }`.
  Then re-run S1 and S2 (their `old`/`new` fragments are in `my-mutants.json`) at the repaired head against the full
  suite and add both to the mutants record with fragment, commit and outcome (rules 6 and 11).

### F2 — blocking (low). The `code-structure.ts` reorder changes an Unknown reason on an allocation failure

- **Evidence.** [Observed] At `a5ab2b28`, `withoutGitlinkRecords(bytes)` runs inside the try that converts any throw
  to `NonUtf8GitOutput`; at `2d3f9375` it runs before `decodeUtf8`, outside any try (`code-structure.ts:121`), so its
  throw reaches `observeCodeStructure`'s generic arm (`:150-153`). Reading `:104-114`: it calls `indexOf`, `subarray`
  and `equals` on a Buffer and `Buffer.concat` once; none of these throws on content, so the PR's claim that it cannot
  throw on any input holds. [Inferred] It throws only when `Buffer.concat` cannot allocate the copy, up to 256 MiB
  (`maxBuffer`, `:118`). Injecting exactly that fault (`tools/reorder_fault_probe.mjs`, a `RangeError('Array buffer
  allocation failed')` on the concat of the listing, over a one-file repository):
  - base `a5ab2b28`: `{"fault":true,"injected":1,"kind":"unknown","reason":"code-structure observation produced a path that is not valid UTF-8"}`
  - head `2d3f9375`: `{"fault":true,"injected":1,"kind":"unknown","reason":"repository or revision was unreadable during code-structure observation"}`
  - without the fault both return `{"fault":false,"injected":0,"kind":"observed","files":["a.ts"]}`.
- **Why it blocks.** GP-Q0 `:53` counts "a refusal string" as behaviour, and the brief's verdict rule names "a changed
  refusal string, exit code or Unknown reason". The gate outcome is unchanged (both arms are `kind: 'unknown'`, the
  inventory is Unknown either way), so the stop clause `:95-96` is not triggered, and the head's reason is the truer
  one. It is still a changed rendered reason this PR calls behaviour-preserving.
- **Failure scenario.** A host under memory pressure observes a large repository: the surface used to say the
  inventory is Unknown because a path is not valid UTF-8 and now says the repository was unreadable. A reader or a
  later differential comparing the two commits' Unknown reasons sees an unlisted change.
- **Proposed fix.** Either (a) restore parity in this PR: keep the gitlink filter inside the converting try, e.g.
  `let text: string | undefined; try { text = decodeUtf8(withoutGitlinkRecords(bytes)); } catch { throw new NonUtf8GitOutput(); }`
  followed by the existing `undefined` check, and add the fault probe's two arms as a test (inject the throw through
  a test seam, or record the probe as evidence); or (b) keep the head's reason, name it in the PR and the record as a
  fault-path refusal-string change, and carry it to the owner in the cycle-report notice for a ruling before merge.
  I recommend (a); the more accurate reason can be proposed to the owner on its own. Either way, reword the PR's
  residual 7 and the record from "cannot throw on any input" to "throws only when the copy cannot be allocated", and
  say what the caller then reports.

### N1 — note. The record, the bullet and the test comment overstate what merging the encoders would change

- **Evidence.** [Observed] The record's `canonicalJson.whyNotMerged`: "Merging would make the strict encoder refuse
  the 754 production lenient calls … (about 52 percent of the 1,433), and would change the digests of every PWB
  identity." My tap reproduction (equal to the committed aggregate) shows strict spells the observed inputs of three
  PWB identities byte-identically: `canonicalManifestJson` 297 of 297, `resourceLimitsDigest` 270 of 270,
  `walkthroughEvaluationIdentity` 11 of 11. The differing calls (`observeProjectShapeSources` 190 of 269,
  `buildResponseIdentity` 564 of 586) differ because strict **refuses** (`lenient=ok strict=unsupported-value`), not
  because it spells another digest; `arrayIndexKeyReorder` is 0. 754 / 1,433 = 52.6 % (computed), but that
  denominator is the calls the test suite made, and the record itself says "the value may still be a test fixture".
  `AGENTS.md:195` repeats "Merging them changes digests", and `canonical-json-divergence.test.ts:14` gives "it
  changes digests (GP-Q0)" as the reason a change must go to the owner.
- **Failure scenario.** The owner decision the record says a merge needs (`residuals[3]`) is briefed on a false
  premise ("every PWB identity digest changes") instead of the real trade-offs: strict refusing undefined members of
  the observation and response identities, and the array-index key order (31 of 600 in population B, none seen in
  production).
- **Proposed fix.** Reword `whyNotMerged`, `AGENTS.md:195` and the test comment, for example: "A merge would make one
  encoder refuse what the other spells (754 of 1,433 suite-observed lenient calls carry an undefined member or a
  BigInt) or reorder array-index keys (none observed); on the observed calls both accept, the bytes are identical."
  The rule the test comment states is sound: [Inferred] a change of either encoder's output or refusals is not
  behaviour-preserving under GP-Q0 `:52-55`, so it is outside the refactor permission; only the reason is wrong.

### N2 — note. The divergence test cites a file that does not exist and counts two encoders where the record has three

- **Evidence.** [Observed] `apps/three-surface-poc/src/canonical-json-divergence.test.ts:15` cites
  `docs/evidence/syzygy-bpyt-6-3/dc3-canonical-json-2026-10-25.json`; the record is
  `dc3-decode-and-canonical-json-2026-10-25.json` (36 tracked files under that directory at `2d3f9375`; `git log
  --all` on the cited name: 0 commits). `:6` says "the repository has two key-sorted JSON encoders" and
  `AGENTS.md:192` "Two key-sorted JSON encoders"; the record's `residuals[3]` says "duplicated three ways" and the
  probe compares three. `packages/cap1-core/src/evaluation.ts:47` `deterministicLayer` (equal to lenient on 600 of 600
  in population B) is compared to the other two by no committed test.
- **Failure scenario.** A reader follows the citation and finds nothing; a later change to `deterministicLayer` that
  moves it off the lenient encoder passes every test, though the record calls the three a deliberate set.
- **Proposed fix.** Correct `:15` to the record's name; either say "three … cap1's `deterministicLayer` is left out on
  purpose (cap1 imports nothing shared) and compared only by `canonical-json-probe.mjs`", or add a cap1-side test
  pinning its agreement with the lenient spelling on the rows of `:87-94` and the index-key row of `:106`.

### N3 — note. Three more survivors, and a BOM test that cannot fail

- **Evidence.** [Observed] S4 (seed reader reason `'seed is not valid UTF-8'` →
  `'seed is not readable'`, `project-shape-observation.ts:436`) survives the full suite (`Tests  5368 passed | 5
  skipped (5373)`): a refusal string GP-Q0 `:53` protects is pinned by nothing. S9 (`gitText` keeps the BOM,
  `:359`) survives the full suite too (`Tests  5368 passed | 5 skipped (5373)`); the probe kills it only by feeding
  `ls-tree` a BOM-led answer, which real git does not emit [Inferred], so it is close to equivalent.
  `project-shape-git-text.test.ts:48` is titled "goes on past a rev-parse answer that is well-formed,
  with or without a byte-order mark", but the rev-parse text is `.trim()`ed (`project-shape-observation.ts:496`), and
  `String.prototype.trim` removes U+FEFF, so the case passes whether `gitText` drops the BOM or not. S10
  (code-structure keeps the BOM) survives and is equivalent on real input [Inferred: every `git ls-tree -r -z -l`
  record starts with a mode digit, so its output never starts with EF BB BF].
- **Failure scenario.** The seed reader's reason is reworded and its rendered refusal changes with every test green;
  the BOM case of the git-text test is read as coverage it does not give.
- **Proposed fix.** Assert the seed reader's `{ kind: 'unavailable', reason: 'seed is not valid UTF-8' }` and its
  `not-utf-8` read record in a test; retitle the rev-parse case to what it pins (a BOM-led answer is accepted) or feed
  the BOM to `ls-tree`, where it is not trimmed; record S9 and S10 as equivalent mutants with the reason.

### N4 — note. "The one strict `decodeUtf8`" while 20 inline strict decoders remain, 8 on class 1 or 4 paths

- **Evidence.** [Observed] `AGENTS.md:184-185` "the one `sha256`, the one `deepFreeze` and the one strict
  `decodeUtf8`"; the census lists 20 production strict constructions outside the helper (section 3), 8 of them on
  class 1 or 4 paths [Inferred]. For `sha256` and `deepFreeze` "the one" means the sole definition; for `decodeUtf8`
  it means the sole named helper.
- **Failure scenario.** An agent reads the bullet as "every strict decode goes through `decodeUtf8`" and skips the
  follow-up, or assumes a fix to `decodeUtf8` reaches the screening and governance readers.
- **Proposed fix.** "the shared strict `decodeUtf8` (20 inline strict decoders remain; follow-up `<bead>`)", and file
  the follow-up with the 20 sites and the 8 class 1/4 ones named above.

### N5 — note. The evidence record's own claims run ahead of its detectors

- **Evidence.** [Observed] (a) `decoder.mutants.o2.firstRunVerdict` = "killed by probe (no test in the repository
  killed it)", but O2's test detector ran one file (`"files": ["packages/three-surface-poc-core/src/project-shape-observation.test.ts"]`,
  `Tests  39 passed (39)`). (b) Every one of the 18 rows names its test detectors' files, one or two each (the new
  test files, or the nearest existing one); none ran the whole suite, so no survivor was ever measured against it. (c) `canonicalJson.suiteWideTap` names no commit
  and no digest of what it ran over (rule 11); its aggregate embeds the implementer's scratch path `/tmp/lc63t/` in
  16 caller labels. (d) The mutants record's `expectedProbeOutput` is `/tmp/lc63u/probe-base-a.json`, a scratch path
  with no digest. (e) `decoder.census.head.commit` is `0e2640e9`, not the reviewed head; the counts reproduce at
  `2d3f9375` (50 in 33).
- **Failure scenario.** A later reviewer re-runs the record and cannot tell which bytes the tap and the probe
  expectation describe; "no test in the repository" is quoted as a sweep it never was.
- **Proposed fix.** Say "no test in `project-shape-observation.test.ts`"; add the tap's commit and the sha256 of the
  committed probe output as `expectedProbeOutput`; name the census commit beside the reviewed head.

### N6 — note. Fail-closed on a Node without ICU now fails at import, earlier and wider

- **Evidence.** [Observed in Node `v24.6.0`'s embedded `lib/internal/encoding.js`] Without ICU, the `TextDecoder`
  constructor throws `ERR_NO_ICU('"fatal" option')`. `decode-utf8.ts:1` constructs at module load, so on such a build
  importing `@syzygy/support` throws. [Inferred] At the base the support barrel constructed nothing; the consent,
  policy and registry readers built their decoder inside the try, so they refused every artifact as `'not strict
  UTF-8'`; Polaris generation and dossier modules failed only at a decode call. Official Node builds ship ICU, so the
  blast radius is small, and both behaviours fail closed.
- **Proposed fix.** Construct the decoder lazily on first call, or state in the support package's header that it
  requires a Node with ICU.

### N7 — note. #533 overlaps this PR, and the PR body says it does not

- **Evidence.** Section 1: the two PRs share 3 paths; `AGENTS.md` conflicts, `project-shape-manifest.ts` auto-merges
  on different lines, `comment-only.mjs` is byte-identical. The body's "touches different files" and "merge cleanly
  in either order" are false. [Observed]
- **What the second landing must re-check.** Resolve `AGENTS.md` by keeping both bullets; run `comment-only.mjs` over
  the merged `project-shape-manifest.ts` against `a5ab2b28` (each branch's run covered only its own edit); re-run
  `check_governance.py` (the bullets change `AGENTS.md`'s word count) and the new test files on the merged tree.
- **Proposed fix.** Correct the two sentences of the PR body; the coordinator re-checks as above.

### N8 — note. The record's digest-citer sweep missed an 8-hex citer

- **Evidence.** [Observed] `docs/reviews/R-LIVE-TEST-NO-SPAWN-1-RAW.md` (offset 11634) cites the base sha256 of
  `authority-artifact-fields.ts` as an 8-hex prefix; the record's `digestCiters.citersByTree.docs/reviews` lists two
  raws and not this one. It is a retained raw and binds nothing, so nothing changes; but the record's absence claim
  covered a narrower set of forms than the corpus uses (rule 9; the continuation-form lesson in `AGENTS.md`).
- **Proposed fix.** Match prefixes of 8 hex or more in `digest-citers-stack2.py` and add the raw to the list.

## 5. Changed outputs

- [Observed] Decoder outcomes: the decoder probe's 12,841 rows are identical at `a5ab2b28` and `2d3f9375` (byte-equal
  outputs, equal to the committed file), and the shared-instance probe finds 0 differences in 300,000 calls.
- [Observed] Encoders: both canonical JSON source edits are comment-only (emit-equal); the canonical probe on the base
  build reproduces the committed output byte for byte.
- [Observed] The one changed output: `observeCodeStructure`'s Unknown reason when the gitlink filter's allocation
  fails (F2). No input bytes produce it.
- [Inferred] No rendered byte, wire format, exit code, digest-bound artifact or gate decision changes on any input;
  I did not render the surfaces myself, and rely on the probes and on the call sites' unchanged handling.
- [Observed] No governed file is in the diff (`.syzygy/**` and `openspec/**`: 0 paths of 34).

## 6. Verdict on the bead's acceptance criterion

The bead's criterion (read-only `bd show`): "1. One definition per helper in the scope (sweep with method and
denominator); registry-bound file untouched (digest before/after equal). 2. canonicalJson equivalence evidence
(property test over fixture corpus) or documented divergence. 3. responseIdentity digests, model outputs and rendered
bytes identical. 4. Fence-rule finding recorded (spec citation per rule)."

- **Decoder, criterion 1: met, narrowly.** [Observed] One `decodeUtf8` and one `STRICT_UTF8`, both in
  `@syzygy/support`, by a named-helper sweep with two census methods over 536 files; both registry-bound files
  byte-equal. The bead's scope names "decodeUtf8/STRICT_UTF8", so the 20 inline strict decoders are outside it; N4
  asks the docs to say so. F1 and F2 concern the evidence and a fault path, not the criterion's count.
- **Encoders, criterion 2: met by documented divergence**, with N1 (the stated consequence is overstated) and N2
  (the test's citation is dangling and the third encoder is unpinned). The divergence test pins the two encoders'
  behaviour with literal or independently derived expected values.
- **Criterion 3:** [Inferred] identical, from the comment-only encoders and the 0-difference decoder probe; F2's
  fault path is the one exception.
- **Criterion 4:** not this PR (#533).

## 7. Test quality

- **New tests run 5 times:** [Observed] 5 of 5 runs `Tests  35 passed (35)`; no flake (bar 6).
- **`decode-utf8.test.ts` (6 tests).** Expected values are literals written from the standard (bar 4, `:64-67`);
  it covers the empty buffer, every sequence length, ten malformed classes including `ED A0 80`, overlongs and a
  truncated tail, one and two BOMs, a view over a larger buffer and carried state. It kills R1–R3 and M1–M3. Good.
- **`authority-artifact-fields.test.ts` (new, 5 tests).** Pins the refusal detail `'not strict UTF-8'` for all three
  artifacts and the BOM for policy and registry; kills S6 and S7. Its consent BOM case (`:22`, "with or without a
  leading byte-order mark") cannot fail on the BOM: `parseConsentArtifact` trims every line, and trimming removes
  U+FEFF, so R1 changes 0 of the probe's 1,604 consent rows. That is harmless (keeping or dropping the BOM is
  equivalent there), but the title claims more than the case pins.
- **`project-shape-git-text.test.ts` (3 tests).** Pins the three commands' refusal details and kills O2 and S8; its
  BOM case cannot fail (N3, bar `:42`).
- **`canonical-json-divergence.test.ts` (21 tests).** Expected values are literals (`:87-94`, `:106-111`,
  `:127-143`, `:151-164`) or the independent `reference` (`:37-43`), which sorts by code unit and spells scalars with
  `JSON.stringify`; it reads neither encoder (bar 4 holds). A merge in either direction fails it: replacing either
  encoder by the other fails the index-key test (`:106` or `:107`) and every row of `:128-143`, since each row's two
  outcomes differ. Gaps: N2 (cap1 unpinned, dangling citation).
- **Missing pins (workflow `:101-102`):** the per-site BOM predicate at the object and seed readers (F1); the seed
  reader's refusal reason (N3); F2's fault arm.
- **Net delta:** `Tests: +35 ~0 -0` as the PR states; [Observed] the four new files hold 35 tests. The additions
  catch bugs no existing test caught (O2, S6–S8) except the BOM case of N3 (bar 10, `:93-94`).

## 8. Cleanup

[Observed] Deleted: the scratch clone `rev-534/clone`, its worktrees `rev-534/base` and `rev-534/tap`, my TMPDIRs
`/tmp/r534-1` to `/tmp/r534-8` (nothing else in `/tmp`), and the two 2 MB probe outputs, whose sha256
(`be4bd04594ccd42f0b2e129a1a38c0709f342f0a416fdb803b4f3c1f28cc2667`) is that of the committed
`docs/evidence/syzygy-bpyt-6-3/utf8-probe-output-base.json` and is recorded in `probe-compare.txt`. No
repository checkout or worktree under `/home/tze/GitHub/syzygy` was edited; nothing was pushed, commented or merged,
and no `bd` mutation ran. Every kept file is under 300 KB (`find -size +300k`: none). Paths inside the result files
name the deleted clone; the probe expectation they name is the committed file above. To re-run a tool, clone at the
commit it names, `npm ci`, build, and pass the clone path. `tools/my_mutants.py` as kept passes the raised timeouts in
both modes; `my-mutants.json`, `scratch-s1s2.json` and `my-mutants-full.json` were produced before that edit, with
the default timeouts; each stores its own fragments, head commit and test command.

Kept, 39 files, relative to `rev-534/`:

| File | sha256 |
|---|---|
| `act-families-alone.log` | `21bdf467eef1f871d3f72b10add7186c0aba58275d62c9d69c83dfd7883bd511` |
| `baseline-core.log` | `093c1bcc21dee2293912997fd90945da7e3f55c03ced3c2b4fc24bb719c00fe0` |
| `canonical-probe-base-a5ab2b28.json` | `85ae9c295a599d5ef004fa9b15c97c3b7a04a6151dc7ede3faf72cf1c3c7ae51` |
| `census-base.json` | `b27ec213e172fc52013b1e7a6065a311c767f00f8d77ddb99c06781a7d6d6e65` |
| `census-head.json` | `13d1142b93a9d8f62b01b2efe84ff3ba2d373747de55b9784b912eccf2d4e340` |
| `check-governance-base.log` | `023975001314d13dbbaf916f6fb84f5a3e6ecd2967c2db2968be442d4765e96d` |
| `check-governance-head.log` | `1047529991604305e6686c08564c5b7eb0b493860f6d82c5a87541a875772c5e` |
| `check-quotations-base.log` | `a3dfcf00412b4592d95b8bf26a7e6d133955b6df112513710d52d7f9d5e81f2d` |
| `check-quotations-head.log` | `a3dfcf00412b4592d95b8bf26a7e6d133955b6df112513710d52d7f9d5e81f2d` |
| `comment-only-a5ab-2d3f.json` | `17476b0fc5398a1fac2246a6123cda832f67fbc80f8acfb3cf99d8f71265952b` |
| `decoder-state-probe-selftest.json` | `0589a9fadd90a52339ed47111467b35c8a22eaaa7a00facfacca6c1917a12e65` |
| `decoder-state-probe.json` | `ae0743ff9e1f57ae9bfccedfa0c4c1c7989acf6f561008f83dc1d65b1e7a651c` |
| `digest-sweep.json` | `9450702229bb6bbace206eebc62edc877ea89ccb22931f42f1b1fd2c6091050d` |
| `full-suite-head.log` | `f889bee0c0f37b79a3e400677b17547c775ca2cf8fe71ce2d6bd84276214d214` |
| `full-suite-tapped.log` | `4f3d37842232f3cf15bd084844b590c1b54273dc5e3dbbd92c428b17a239b483` |
| `mutant-record-check.txt` | `178a5b6642154a1c0b6752758cfcbd69ef4da432c616a9100c7019422741834f` |
| `my-mutants-full-2.json` | `e8a96a1231569e0460f3456a5c568a879c47f2efb60a8e59b27d80b406a64c32` |
| `my-mutants-full-2.log` | `fb021857249499578ca9d6f21a07027c205e5aeace6b142e69b94667ae8a58b7` |
| `my-mutants-full.json` | `0edace6f42849f8a1be0873ea159cd238f832b59ed41c85155b8546a223ffd2f` |
| `my-mutants-full.log` | `62543079e61f87effdd4dbc9151cc56961f45efaa828674704312749c469874e` |
| `my-mutants.json` | `c1c8c8a627e752d8099717df7ed7190bbbf4b76f9de67e4a189e8ba4be4490ee` |
| `my-mutants.log` | `15c101a0ffc85413eef594ad75cd1468081e3f0cd1ce30bb5beb4030a5066ca6` |
| `new-tests-5x.log` | `aa48f00fb77345974ad23c12641968ff57ad08992047722b8490716afe408844` |
| `npm-ci.log` | `b6640843f1adc9157410536aed53695255a92226d17e56daba188c8d3e39b40f` |
| `probe-compare.txt` | `63514840ea268d479fe90ee11ddff7eb28e84db79d6de3278faf480f4a2cba8c` |
| `reach-probe.json` | `c1a98e6b04529ce748c478ef31e1dc6145b8d579f0565bd89daff96b5365932f` |
| `reorder-fault-probe.txt` | `40ba418b17fe323931d2df47e3cd1aaf686ac08336fc094d5908b8573a3b5b37` |
| `scratch-s1s2.json` | `5d7675444d35e929656f4354f42be8296121d0f70bcf30735fd4d674aa1eb2a3` |
| `tap-aggregate-2d3f9375.json` | `4f5a664120fee708a59040e3a77f13c77f3a2db2bda472b49363ee71f9507fa8` |
| `tools/census.py` | `86e67311e4be9c2b7bc71f4a1f7aa5fe25c7d70de68668071201eb3f33540d8b` |
| `tools/check_mutant_record.py` | `6818030854e9f9f93f8708493f4c6b1ff9473195ced86704ac7421b94bfcd94f` |
| `tools/decoder_state_probe.mjs` | `5e0564cd36a4d0cfae9652652f71f69b6844655c43f7dccdee23757edffc4302` |
| `tools/digest_sweep.py` | `359332229f0e589d904ea56171379c776a3955ab6cbdded79cf50531e4a522c9` |
| `tools/instrument_decode.py` | `122e126fb69f50567a3b139494cd7488600d3b6534b34ca61e1f0315e338e5f3` |
| `tools/my_mutants.py` | `a33abf7f270ce4bc21c46cb4733a043c778d48cdb3295b795ca83d18bdf7fa88` |
| `tools/reach_probe.mjs` | `f15c5e12b9ca5f800659ab4ba713cb0d701e73430caefb5ff3719992568873a6` |
| `tools/reorder_fault_probe.mjs` | `bbb945b81c87351f609b6e21d012b2d86fb9a248dc5e4ee2ee64e673b2e95d9a` |
| `typecheck-base.log` | `f21762922bb179fa5dc8c33e881c4f062ef1c33bf48c7d3dad2dd0e5cd30ee98` |
| `typecheck-head.log` | `f21762922bb179fa5dc8c33e881c4f062ef1c33bf48c7d3dad2dd0e5cd30ee98` |
