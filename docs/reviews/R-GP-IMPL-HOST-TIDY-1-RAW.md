# R-GP-IMPL-HOST-TIDY-1 — CC-REV-1 implementation review of syzygy-bpyt.7.15, round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 561c80b3
Subject: r1-review.diff sha256 b961f4ee73f50e0083ce96802f781e721db0a02bb2dc6d3a5c65f5fc1fdf0076

Reviewer: an independent fresh-context agent. I did not author the change and did not change it. No observed
repository body was read, and no credential file was opened. Every tool and record named below is kept under
`rev-539/` (section 8). Labels: [Observed] is something I ran or read this session; [Inferred] is my reasoning from
observations; [Unknown] is something I could not establish.

## 1. Subject identity checks

- [Observed] `sha256sum r1-review.diff` gives `b961f4ee73f50e0083ce96802f781e721db0a02bb2dc6d3a5c65f5fc1fdf0076`.
  `git diff 9dba2589 561c80b3 | sha256sum` gives the same digest, and `cmp` against the subject file printed
  `SUBJECT_EQUAL`. **Match.**
- [Observed] `git diff 9dba2589 f2304fd5 | sha256sum` gives
  `6516a6a00077f439a10798aaf6e4b47c5d6aaf3628607a10860001f3e055d394`. **Match.**
- [Observed] File counts. The full subject has 48 files (`49142 insertions(+), 33 deletions(-)`). The code-only diff
  has 18 files (`34 insertions(+), 33 deletions(-)`). The evidence commit adds 30 files, all under
  `docs/evidence/syzygy-bpyt-7-15/`.
- [Observed] Commit shape:
  - `f2304fd5` has parents `3fa4817c` and `9dba2589`;
  - `561c80b3` has the single parent `f2304fd5`;
  - `git merge-base 9dba2589 f2304fd5` is `9dba2589`.
  - `gh pr view 539` gives head `561c80b38d447a56e4c1542e0a8fbbdb2dd1d845` and base `bb05df7e…`.
- [Observed] Tool digests at `561c80b3`, by script (`tools/record_check.py`, which printed `101 checks, 0 failing`):
  - `summary.json` is `64f08af9…ec1137`, `diff-tools/differential.py` is `a897e306…51f7ad0`, and
    `diff-tools/surface.mjs` is `655e9789…78552`. Each equals the brief.
  - All six `toolsSha256` rows in `summary.json` equal their blobs. So do all 18 `subjectSha256` rows (at
    `f2304fd5`), and every `records` and `toolsSha256` row in `diff-out/differential.json`.
- [Observed] **Main has moved.** #536 (`9dba2589..bb05df7e`) changed 75 paths, and none of them is among the subject's
  48 paths.
  - `git merge-tree --write-tree bb05df7e 561c80b3` exits 0 with tree `1b01569cec7a2baf586a824de6fac862ff7fe8d7`.
  - My local merge `285476a0` has that same tree.
  - The coordinator's two statements hold (`misc-checks.json` `main536`).
- [Observed] Hosted checks ran at `561c80b38d447a56e4c1542e0a8fbbdb2dd1d845`, read with `gh run view`:
  `governance-docs … success` and `node-ci … success`.

## 2. Clauses relied on, and the class ruling

**CC-REV-1** (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md`):
- l.18–20: "Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the
  agent performing the change never finally decides which classes it touches."
- l.31: "1. **authority boundaries** — write-universe, typed-authority table, adapter authorization (VIS-5, VIS-6);"
- l.35–36: "3. **deterministic observation** — snapshot composition, evaluation identity, the deterministic/inferred
  seam (VIS-7);"
- l.37: "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
- l.40–41: "6. **public interface** — machine-queryable endpoints, adapter contracts, anything an external consumer can
  depend on;"
- l.49–50: "The change record states which classes the change touches, or "none," so a misclassification is a
  findable violation after the fact."

**GP-Q0** (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`):
- l.51: "Behavior-preserving refactors may proceed under the acts already in force. They may touch `apps/**`,
  `packages/**`, `scripts/**`, tests, CI and root manifests."
- l.52–55: "\"Behavior-preserving\" means none of the following changes:" then "a rendered byte, a wire format, a
  refusal string or an exit code;", "a signed or digest-bound artifact;" and "a consent, security or retention
  decision."
- l.62: "pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4
  (security), and class-6 pull requests that remove an endpoint."
- l.64–66: "an old-versus-new differential over a mutated-record corpus that includes records with altered prose;", "a
  rule-6 mutant for each predicate;", "a non-blocking owner notice in the cycle report."
- l.95–96, the stop clause: "Any change not listed here to what a gate accepts or refuses stops and returns to the
  owner."

**RFC5-3** (`.syzygy/governance/contracts/rfcs/RFC-0005/admission-and-boundary.md:126–127`): "Every request is
classified as exactly one of two client classes, **by credential presented, never by network location or header
heuristics**".

**CAP1-REQ-012** (`openspec/changes/project-registration-and-honest-shape-visibility/specs/project-registration-and-honest-shape-visibility/spec.md:406`):
"### Requirement: CAP1-REQ-012 — Unconsented renders Unknown as a policy state, never as error or absence". Its
warrants (l.438–441) are `primary: RFC6-26` and `contracts: [RFC6-26, RFC3-6, RFC2-24]`.

**CAP1-REQ-015** (same file, l.543 and l.551–553): "### Requirement: CAP1-REQ-015 — One coverage boundary, retrievable
identically by human and machine" and "Machine retrieval is available only to an admitted client, classified by
credential presented — never by network location (RFC5-3)."

**Bead `syzygy-bpyt.7.15`** (`bd show --json`, read only; `acceptance_criteria` is null). From its description:
- N2: "Either extract it without changing any printed byte or exit code, or record why not."
- N9: "Make it a comment-only change that describes the generic host."
- N12: "Retarget them to @syzygy/http-host, then drop the POC's cap1-daemon dependency and its tsconfig reference if
  nothing else needs them."

**AGENTS.md** at `561c80b3`:
- verification rules 6 (l.126), 8 (l.130), 9 (l.132) and 11 (l.134);
- the guardrail at l.282: "Root Vitest `test.projects` must alias `@syzygy/cap1-core`, `@syzygy/cap1-daemon` and
  `@syzygy/http-host` to source; verify with every `dist/` absent."

**Test rigor** (`.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`, read by `git show 561c80b3:<path>`):
- l.42: "**A test is worth keeping only if some plausible bug makes it fail.**"
- l.52–54 (bar 1): "A pure refactor should not break tests; a behavior change must."
- l.78–81 (bar 6): "A test that fails intermittently is worse than no test … Fix the nondeterminism (time, ordering,
  shared state) or delete the test; never retry-until-green."
- l.101–102 (workflow 1): "Diff first: for each behavior the change adds or alters, find the test that pins it.
  Missing pin → finding (expectation 1–3)."

### Class ruling

- **Class 4 (security): touched. I confirm the declaration.** [Inferred] `server.ts` is the host's credential-admission
  surface, an "auth surface" in l.37's words. A comment there is part of how that surface is maintained, and N1 below
  is a comment defect of exactly that kind. No code token changed (section 3.2).
- **Class 3 (deterministic observation): not touched.** This is the class the lane left for me to rule.
  - [Observed] No observation code changed. `apps/three-surface-poc/src/git-observation.ts` is blob `80a1547f` at
    `9dba2589`, `f2304fd5`, `561c80b3`, `bb05df7e` and the merge.
  - [Observed] The observer-input gate's decisions are identical over 5,731 paths (3.5).
  - [Inferred] The POC surface version moves only because it is, by construction, a digest of the source tree ids
    (section 5). Its computation is unchanged.
  - Dropping the build edge changes what `tsc -b apps/three-surface-poc` builds. It does not change what the observer
    reads, how a snapshot is composed, or any evaluation identity.
- **Class 1: not touched.** [Observed] `credentials.ts` (the `authorizeStateWrite` boundary) is byte-identical at both
  commits. Neither the state-directory writes nor any authority table changes.
- **Class 6: not touched.**
  - [Observed] The export surfaces of `@syzygy/http-host` and `@syzygy/cap1-daemon` are equal at both commits:
    70, 17, 14, 6 and 34 names over the five entries, keyed by name, value, type, file and declaration.
  - [Observed] The POC package's `exports` did not change.
  - [Observed] npm installs the same tree at both commits (section 5). The manifest edit is to a `"private": true`
    workspace.
- **Classes 2, 5 and 7: not touched.**
- **Class set: {4}.**
- **GP-Q0's further checks for class 4:**
  - The differential is present, and I reproduced it (3.4). [Inferred] The "altered prose" limb has nothing to bite
    on here. No record parser changed, and the altered prose is the source comments themselves, which both
    comment-equality methods cover.
  - Rule-6 mutants are present (31 in `record.py`, 7 in the differential, plus `code_equal.cjs` and `poc_alone.py`).
    I added 10 of my own (3.7).
  - The owner notice on `syzygy-bpyt.10` is [Unknown]. It is the coordinator's, at landing.
- **Stop clause: not reached.** [Observed] No gate's accept/refuse set changes:
  - the observer-input gate gives 0 differing decisions of 5,731 (3.5);
  - root `build`/`typecheck`, `build:poc` and `tsc -b apps/syzygy` build the same projects in the same order (3.6);
  - the canonical battery gives `commands=110 nonzero=0`;
  - `check_governance.py` gives the same 53 verdicts at base and head.
  - The one accept/refuse difference is that a clean, standalone `tsc -b apps/three-surface-poc` now refuses a POC
    import of `@syzygy/cap1-daemon` (TS2307). It accepted one at base (`poc-alone-*`, M1). [Inferred] That is the
    compile of a private workspace, not a gate that any act or GP-Q0 names, and root CI still accepts the same import
    (M1). I rule it outside the stop clause, and the owner may override.
- **The lane's position that narrowing the gate is owner-gated: I agree.**
  - [Observed] Dropping `'packages/cap1-daemon/'` from `git-observation.ts:183` would turn 21 tracked
    `packages/cap1-daemon/` paths, plus my probes under that prefix, from refused to accepted.
  - That is a change "to what a gate accepts or refuses", and Part 3's table does not list it. So it returns to the
    owner.
  - [Observed] `build:poc` still runs `tsc -b --force … packages/cap1-daemon …`, so a broken cap1-daemon can still fail
    `npm run poc`'s build. Keeping the prefix is therefore not dead weight today. See N4 for the wider divergence.

## 3. What I ran and the results

Clones: `9dba2589` (base), `f2304fd5` (code head), `561c80b3` (evidence commit, never built before the no-dist run),
a local merge `285476a0` of `bb05df7e` into `561c80b3`, and a scratch mutant clone at `561c80b3`. Each had `npm ci`
before any Vitest run, and every suite had its own TMPDIR under `/tmp/r539-<n>`. Load average was 23–52 throughout.

### 3.1 The lane's record
- [Observed] `python3 -I record.py . --check` printed `summary.json matches ; problems: 0` (exit 0).
- [Observed] `--selftest` printed `selftest: 31/31 mutations make a check fail` (exit 0), with 31 `killed` and 0
  `SURVIVED` (`record-selftest.log`).
- [Observed] `tools/record_check.py` is my own reading against the git objects. It gave `101 checks, 0 failing`
  (`record-check.json`). It covers:
  - the commits, the shape of the evidence commit, both subject digests, the file and line counts, and every tool and
    record digest;
  - each differential mutant's `old`, which occurs exactly once at the recorded commit. The `.ts` mutants were read
    from `f2304fd5` and the four `dist` mutants from my build of `f2304fd5`;
  - each differential outcome agreeing with its check value;
  - each `poc-alone` build's exit code agreeing with its error list, and its references equalling the tsconfig at
    that commit;
  - `routes.test.ts` holding the `poc-alone` mutant's `old` exactly once at both commits;
  - in `code-equal.json`, each selftest target (`DAEMON_HOST`, `'node:http'`, `ShutdownSignal`, `'./server.js'`)
    first occurring in code, not in a comment;
  - `suite-head` and `rerun-alone-*`, each exit code agreeing with its counts;
  - 13 PR-body figures checked against the record.

### 3.2 Comment-only, by my own method
`tools/strip_compare.mjs` uses two methods, neither of them the lane's printer: TypeScript's scanner with trivia
skipped, and `ts.transpileModule` with `removeComments`. Its selftest renames a value export (must differ by both),
changes the last string literal (must differ by both) and adds a comment (must stay equal by both). Results
(`strip-compare.txt`):
- [Observed] `server.ts`: `"tokensEqual":true,"tokenCounts":[681,681]`, `"emitEqual":true`, `"selftestOk":true`.
- [Observed] `shutdown.ts`: `"tokensEqual":true,"tokenCounts":[200,200]`, `"emitEqual":true`, `"selftestOk":true`.
- [Observed] Byte-identical at both commits: `http-host/src/index.ts`, `http-host/src/credentials.ts`, both cap1-daemon
  shims, `apps/syzygy/src/main.ts`, `poc-main.ts`, `startup-detail.ts` and `git-observation.ts`.
- [Observed] The lane's `code_equal.cjs`, re-run, wrote a record byte-identical to the committed `code-equal.json`
  (`CODE_EQUAL_RECORD_SAME`).
- [Observed] The `server.ts` line structure holds:
  - 327 lines at both commits;
  - lines 11–29 are all `//` lines at both, with lines 10 and 30 blank;
  - the changed lines are 11–15, 17–25 and 76 (`misc-checks.json`, `summary.json`).
- [Observed] Built JavaScript, comments skipped (`dist-tokens.txt`):
  - `http-host/dist/server.js` differs in 0 of 273 tokens;
  - `shutdown.js`, `server.d.ts` and `shutdown.d.ts` are byte-identical.

### 3.3 Reading the new comments against the code
- `server.ts:11–12`, "The generic HTTP host both apps serve through … the Capability 1 daemon and the Three-Surface
  POC": **true**. [Observed] The only production callers of `createDaemon(` are `apps/syzygy/src/main.ts:248` and
  `poc-main.ts:189`, and both import it from `@syzygy/http-host`.
- l.12–14, admission "by the credential presented, never by network location" under RFC5-3: **true**, and it matches
  RFC5-3's text quoted above.
- l.14–15, "binds 127.0.0.1 only, and the gate consults nothing but the Authorization header": **true of the code**.
  `DAEMON_HOST` is fixed at l.33, and the gate is `credentialFromAuthorizationHeader(req.headers.authorization)` plus
  `verifyCredential` at l.253–254. **The citation "(CAP1-REQ-012)" is wrong** (N1).
- l.17–19, "a ROUTE REGISTRY that owns no route: each app passes its `Route` values": **true**. [Observed] No
  non-test file under `packages/http-host/src` builds a `credentialClass:` value. The unknown-route 404 is a built-in
  response, not a `Route`.
- l.18–19, "(the Capability 1 root route lives in @syzygy/cap1-daemon)": **true under either reading**. The app's `/`
  is `HUMAN_PAGE_PATH` in `cap1-daemon/src/routes-human.ts:56`, and `minimalRootRoute` is in
  `cap1-daemon/src/server.ts:35`. [Observed] `minimalRootRoute` is mounted only by tests (`server.test.ts`).
- l.19–25 (admission before the handler; the handler never invoked on refusal; named refusal bodies): **unchanged
  wording**. The code still holds them (l.248–262 run before l.275).
- l.76, "The route-registry contract every app builds on": **true**.
- `shutdown.ts:7–11`: **true.**
  - [Observed] The banners share no line. The Capability 1 lines are `syzygy daemon listening at …`,
    `observed root: …`, `machine credential (…) at: …` and `the credential value is never printed; …`
    (`apps/syzygy/src/main.ts:264–272`). The POC lines are `Syzygy Three-Surface POC: …`, `Observed repository: …`,
    `Observed revision: …`, `Machine endpoint: …`, `Machine credential (…) at: …` and `Credential value is never
    printed. …` (`poc-main.ts:212–223`). Even the two credential lines differ in their first letter.
  - [Observed] The POC redacts the start-failure detail through `daemonStartDetail` (`poc-main.ts:207`,
    `startup-detail.ts:7–25`). Capability 1 prints `${start.failure.detail}` whole (`main.ts:258`).
  - [Observed] The PR body's third reason holds too:
    - the POC injects `createDaemon` (`PocMainDeps`, l.82) and its io (`PocIo`);
    - it sets `credentialProvision` (l.211) and starts the console (l.224) between the start and `closeOnSignal`
      (l.226);
    - only Capability 1 passes `closeFailed`.
- No sentence misdescribes credential admission, the refusal paths or the shutdown order. The one defect is a
  citation.
- **N2 "record why not":** the bead allows it in so many words ("or record why not"). The record sits in
  `shutdown.ts:7–11` and in the PR body, which also answers the PR #529 review's N2 fix ("one sentence in the PR body
  or bead close-reason that names what was left out and why").

### 3.4 The differential and its selftest
- [Observed] Re-run as `differential.py <base> <head> <tools> <scratch> <out> --selftest` over my two built clones.
  Results:
  - `"surfaceEqual": true`, `"hostEqualThroughCap1Daemon": true`, `"hostEqualThroughHttpHost": true`,
    `"e2eEqual": true`, `"asExpected": true`, `"selftestPassed": true`;
  - `gate differing: 0 gate equal: True` over 5,528 paths, 321 refused at both, with a `pathsSha256` equal to the
    lane's;
  - `exit=0`.
- [Observed] Six of my eight records are byte-identical to the lane's committed ones:
  - `e2e-*`, base = head = `ddbb9620…`;
  - `host-*-cap1-daemon`, base = head = `2c4e8c40…`;
  - `host-*-http-host`, base = head = `8e7144fc…`.
  - The two `surface-*` records have equal `entries` and differ only in the `tree` path.
  - My `differential.json` differs from the lane's only in `records`, the digests of those path-bearing surface files.
- [Observed] The seven selftest outcomes are identical to the lane's: six `detected` and `source-value-changed`
  `"checkHeld": true` / `"expected": "held"`.
- [Observed] **My R13-style swap is S1**: `  CREDENTIAL_FILE_MODE,` → `  STATE_DIR_MODE as CREDENTIAL_FILE_MODE,` in
  `cap1-daemon/src/credentials.ts`. Both constants are declared in `http-host/src/credentials.ts`.
  - `surfaceEqual` is **false**.
  - The changed row is `['CREDENTIAL_FILE_MODE', True, False, 'packages/http-host/src/credentials.ts',
    'STATE_DIR_MODE']`. Only `declaredAs` differs, so `declaredAs` is what catches it.
- [Observed] **`source-value-changed` is not the only held limit.** Two mutants leave `surfaceEqual` true:
  - S2, a value re-export made type-only: `  REFUSAL_BODY,` → `  type REFUSAL_BODY,`. The surface key should catch
    it, and it does not. Typecheck kills it (TS7053 in `cap1-daemon/src/package.test.ts:60`).
  - S4, a public type's shape changed: `RouteRequest` gains `readonly remoteAddress?: string;`. Typecheck exits 0, and
    all 152 tests in the 13 retargeted files pass.
  - S3, widening `DaemonOptions.port` to `number | string`, also holds the surface. Typecheck kills it (TS2769 at
    `server.ts:298`).
  - See N3.

### 3.5 The observer-input gate, by my own run
`tools/gate_sweep.mjs` imports `pocObserverInputsAreClean` from each tree's own build: base, code head and merge. Its
population is every path tracked at `9dba2589`, `f2304fd5`, `561c80b3` and `bb05df7e` (5,624), plus 110 probes of my
own: each `apps/*`/`packages/*` directory bare, with a slash, with a file, as a `-other` sibling, upper-cased, with
`./`, under `dist/` and under `node_modules/`, plus near-misses of the exact inputs. 5,731 paths in all.
- [Observed] Base, head and merge each refuse 339: 193 under `apps/three-surface-poc/`, 79 under
  `three-surface-poc-core/`, 21 under `cap1-daemon/`, 14 under `http-host/`, 29 under `cap1-core/`, and 3 exact
  (`package-lock.json`, `package.json`, `tsconfig.base.json`).
- [Observed] `"refusedEqual": true` and `"differing": []`. The pair cases agree at all three: empty accepted,
  clean+clean accepted, clean+dirty refused, dirty+clean refused.
- [Observed] The built `git-observation.js` is byte-identical at all three (`bfc59f7b…`).

### 3.6 N12: the import closure, the install and the build graph
- [Observed] **Import closure** (`tools/closure.mjs`, my own resolver over TypeScript's `preProcessFile`):
  - Trees walked: base `9dba2589`, code head `f2304fd5` (`561c80b3` adds only evidence files) and the merge
    (`closure-*.json`).
  - POC sources: 95 entries reach 192 files at base, head and merge, with **0** under `packages/cap1-daemon/` at all
    three.
  - POC tests: 91 entries reach 277 files at base, 8 of them cap1-daemon files, by
    `evaluation-footer.test.ts -[@syzygy/cap1-daemon]-> …`. At head and merge they reach 269 files, **0** of them
    cap1-daemon files.
  - The daemon entry `main.ts` alone reaches 106 files, 0 of them cap1-daemon files.
  - 0 specifiers were unresolved.
  - Limit: a dynamic import with a non-literal specifier is invisible to it.
- [Observed] **Every mention**: `git grep -F 'cap1-daemon' 561c80b3 -- apps/three-surface-poc`, over 189 tracked
  files, gives 4 lines in 3 files: `git-observation.ts:183`, `git-observation.test.ts:109` and `:114`, and
  `main.test.ts:399`. All are path strings or a comment, and none is an import. At base, 14 files name
  `@syzygy/cap1-daemon`.
- [Observed] **No POC source, and no test, reaches `@syzygy/cap1-daemon` at head.**
- [Observed] **npm ci:**
  - the installed tree is identical at base, head and merge (1,294 files and links, sha256 `d4447131…`, Vitest's
    `.vite` results cache excluded);
  - `node_modules/.package-lock.json` is equal across all three once the POC entry's `@syzygy/cap1-daemon` edge is
    removed from base;
  - every `@syzygy/*` link is present at all three, `cap1-daemon -> ../../packages/cap1-daemon` included.
- [Observed] **Build order** (`tsc -b --dry --force`):
  - `tsc -b apps/three-surface-poc` goes from 8 projects to 7 (`packages/cap1-daemon` drops out);
  - root `build`/`typecheck`, `build:poc` and `tsc -b apps/syzygy` list the same projects in the same order at both
    commits (`buildorder-*.txt`);
  - `apps/syzygy/tsconfig.json` still references cap1-daemon.
- [Observed] **Root Vitest aliases** (the AGENTS.md l.282 guardrail): `vitest.config.ts` is not in the subject and
  still aliases `@syzygy/cap1-core`, `@syzygy/cap1-daemon` and `@syzygy/http-host` to source.
- [Observed] **The POC suite with every `dist/` absent**, at `561c80b3` with 0 `dist` directories before the run:
  `'exit': 0, 'files': 101, 'total': 1264, 'passed': 1262, 'failed': 0, 'skipped': 2` (load 36.3, 320.6 s).
- [Observed] `poc_alone.py`, re-run at both commits, wrote records byte-identical to the committed `poc-alone-*.json`:
  - base: `plain` exit 0 and `mutant` exit 0, cap1-daemon built both times;
  - head: `plain` exit 0 and `mutant` exit 2 with `error TS2307: Cannot find module '@syzygy/cap1-daemon'`,
    cap1-daemon not built.

### 3.7 Suites, typecheck, titles, governance and battery
- [Observed] Three projects (POC app, http-host, cap1-daemon) at each tree, my `tools/suite.py`:

  | Tree | Files | Total | Passed | Failed | Skipped | Exit | Load | Wall |
  |---|---|---|---|---|---|---|---|---|
  | base `9dba2589` | 101 | 1264 | 1262 | 0 | 2 | 0 | 30.3 | 255.8 s |
  | head `561c80b3`, no `dist` | 101 | 1264 | 1262 | 0 | 2 | 0 | 36.3 | 320.6 s |
  | merge `285476a0` (tree `1b01569c`) | 101 | 1264 | 1262 | 0 | 2 | 0 | 43.2 | 296.7 s |

  Per-file counts are identical across the three.
- [Observed] `npm run typecheck` exits 0 at `561c80b3` and at the merge, with 0 `error TS` lines. `npm run build` exits
  0 at base and at `f2304fd5`.
- [Observed] Titles, by my `tools/titles.py` (`vitest list` over the three projects): `'titles': [1262, 1262]`,
  `'added': []`, `'removed': []`, `'files': [100, 100]`.
- [Observed] `check_governance.py` gives `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted` at base,
  head and merge, exit 0.
  - Base and head differ in one line only: CG-2a's examined count, `2601 files` → `2607 files`, which is this PR's
    evidence.
- [Observed] `check_quotations.py` exits 0 at all three, with `QC-1 … 0 findings`.
- [Observed] The canonical battery is the `PROJECT-STATUS.md` "How to verify this page" block, run line by line by
  `tools/battery.py`. It gave `commit=561c80b3 commands=110 nonzero=0 seconds=562.8 cleanAfter=True`.

### 3.8 My own mutants against the subject (rule 6)
`tools/mutants.py` ran these in a scratch clone at `561c80b3`, one at a time. Each `old` occurred exactly once, and
each mutant was restored to a clean tree. M1–M6 and S1–S3 are in `mutants.json`, S4 in `mutants-s4.json`.

| Id | Mutation (file) | Result | Killed by | Named residual? |
|---|---|---|---|---|
| M1 | `routes.ts:1`: `escapeHtml` imported from `@syzygy/cap1-daemon` (a POC **source** file) | typecheck exit 0; `routes`+`surface-routes` tests 29/29 pass; clean `tsc -b apps/three-surface-poc` exit 2, TS2307 | standalone POC build only | **No** (N2) |
| M2 | `poc-main.ts:220` banner: `non-release.` → `non-release!` | `main.test.ts`: 1 of 24 failed ("serving prints the banner…") | tests | — |
| M3 | `http-host/src/server.ts`: `REFUSAL_STATUS = 401` → `403` | the 13 retargeted files: 3 of 152 failed | tests | — |
| M4 | `server.ts`: `export interface RouteContext` → `interface RouteContext` | typecheck exit 2 (TS2305 at `cap1-daemon/src/server.ts:23`, `reobserve-action.test.ts:2`, `response-limits.test.ts:11`; TS2694 at `package.test.ts:77`); Vitest 17/17 pass | typecheck | — |
| M5 | POC `tsconfig.json`: the `http-host` reference removed | typecheck exit 0; clean standalone build exit 2, TS2307 | standalone POC build only | No (pre-existing class; N2) |
| M6 | `package-lock.json`: the POC entry keeps `@syzygy/cap1-daemon` while `package.json` drops it | `npm ci` exit 0 | **nothing** | No. Benign: npm does not check a workspace entry's edges |
| S1 | cap1-daemon credentials shim: `STATE_DIR_MODE as CREDENTIAL_FILE_MODE` | `surfaceEqual` false (`declaredAs`) | surface | — |
| S2 | cap1-daemon server shim: `type REFUSAL_BODY` | `surfaceEqual` **true**; typecheck exit 2 | typecheck | **No** (N3) |
| S3 | `DaemonOptions.port?: number \| string \| undefined` | `surfaceEqual` true; typecheck exit 2 | typecheck | No |
| S4 | `RouteRequest` gains `readonly remoteAddress?: string;` | `surfaceEqual` **true**; typecheck exit 0; the 13 retargeted files 152/152 pass | **nothing** | **No** (N3) |

Survivors of every durable check (typecheck, the tests, CI): M1, M5, M6 and S4. M2 and M3 show that the retargeted
tests still drive the real host through `@syzygy/http-host`.

### 3.9 The flake disclosure
`polaris-authority-sweep.test.ts` ran alone 5 times at each commit, then within the full POC project twice at each,
base and head interleaved (`tools/flake.sh`). The figure is the duration of the timing-sensitive test, "no
source/authority/provenance field…", against Vitest's default 5,000 ms.

| Run | Base `9dba2589` | Head `561c80b3` |
|---|---|---|
| alone ×5 (load 32–35) | 5/5 passed each: 728, 1113, 858, 1537, 1025 ms | 5/5 passed each: 713, 962, 804, 1119, 808 ms |
| full POC project ×2 (1,136 tests; load 28–33) | 1134 passed, 0 failed: 908, 1329 ms | 1134 passed, 0 failed: 2073, 736 ms |
| three-project run (3.7) | 5/5 | 5/5, also 5/5 at the merge |

- [Observed] 0 failures in 17 runs of the file (8 at base, 8 at head, 1 at the merge). The worst duration was 2,073 ms,
  41% of the timeout. I did not reproduce the lane's timeout.
- [Inferred] **It is pre-existing.**
  - The test walks every `.md/.json/.yml/.ts` file under five roots of the working tree. The walk itself is at
    `polaris-authority-sweep.test.ts:47–55` and the root list at l.181; it reads untracked files too, per the
    docstring at l.57–61.
  - At base that is 4,164 tracked files and 100,662,706 bytes, under a 5,000 ms default timeout, so heavy load can
    time it out at either commit.
- [Observed] **Whether this PR changes its odds:**
  - the code head adds 262 bytes and 0 files to that population;
  - the evidence commit adds 17 files and 1,021,361 bytes (+1.01%), giving 4,181 files.
  - [Inferred] That shifts the odds by about 1%, which is immaterial. Main itself was already at 4,206 files at
    `bb05df7e`.

## 4. Findings

No blocking finding (no F). Five notes.

**N1 — The rewritten header cites CAP1-REQ-012 for the admission gate, and CAP1-REQ-012 is the
unconsented-rendering rule.** Severity: low (docs, in a class-4 file). Pre-existing, but the N9 rewrite restated it.
- Evidence [Observed]:
  - `server.ts:14–15` now reads "the gate consults nothing but the Authorization header (CAP1-REQ-012)".
  - CAP1-REQ-012 (`spec.md:406`) is "Unconsented renders Unknown as a policy state, never as error or absence", with
    warrants `RFC6-26`, `RFC3-6` and `RFC2-24`. Its block (l.406–441) contains no credential, admission or header
    clause.
  - Admission "by credential presented — never by network location (RFC5-3)" is CAP1-REQ-015 (l.551–553), whose
    oracle limb (c) `server.ts:91` already cites.
  - The base header had the same miscitation ("CAP1-REQ-012's admission at the transport"). So do two files outside
    the subject: `http-host/src/credentials.ts:7` ("CAP1-REQ-012's admission context") and
    `cap1-daemon/src/routes-machine.ts:238` ("CAP1-REQ-012's admission gate").
  - The PR body says those citations each cite "where its rule comes from, which stays true for the shared host". For
    CAP1-REQ-012 that is false.
  - The code statement in the sentence is true (3.3), so the bytes misstate no behaviour.
- Rule 8: "Anchor a contract claim to a defined clause and quote it; nearby prose is not the clause."
- Failure scenario: a maintainer changing the admission gate reads CAP1-REQ-012 for its constraints. They find a
  rendering rule, and miss CAP1-REQ-015's oracle (an unadmitted client served nothing, and admission unchanged by
  location) and RFC5-3.
- Why not blocking: merging leaves the citation exactly as wrong as on main today. A correct fix spans three sites,
  two of them outside this diff, and so belongs in one comment-only change.
- Fix (follow-up bead, comment-only, GP-Q0-neutral):
  - replace "CAP1-REQ-012" with "RFC5-3; CAP1-REQ-015" at `server.ts:15`, `credentials.ts:7` and
    `routes-machine.ts:238`;
  - optionally have `server.ts:18–19` say "the Capability 1 routes (its human page at `/` and the machine endpoint)
    live in @syzygy/cap1-daemon", since `minimalRootRoute` is mounted only by tests;
  - `server.ts:32` ("out of Capability 1's scope") is true and may stay.

**N2 — Nothing durable pins N12's outcome: a POC import of `@syzygy/cap1-daemon` passes typecheck, the tests and CI.**
Severity: low (test quality, rule 6).
- Evidence [Observed]:
  - M1 adds a value import of `escapeHtml` from `@syzygy/cap1-daemon` to `routes.ts`, a source file. Root typecheck
    exits 0 and 29/29 tests pass.
  - Only a clean, standalone `tsc -b apps/three-surface-poc` fails it (TS2307). No CI job, battery line or test runs
    that build: the root `build`, `typecheck` and `build:poc` all build cap1-daemon before the POC (3.6), and Vitest
    aliases cap1-daemon to source.
  - M5 (dropping the POC's http-host reference) has the same shape and is pre-existing.
  - The lane's `poc_alone.py` is one-off evidence, not a gate.
  - Test-rigor l.101–102: "for each behavior the change adds or alters, find the test that pins it. Missing pin →
    finding".
- Failure scenario: a later POC edit copies an import line from a pre-#539 file or a cap1-daemon test. The POC
  silently gains an undeclared edge again: no manifest entry, no tsconfig reference. Every check stays green until
  someone builds the POC alone from a clean tree.
- Fix (follow-up, test-only): add a POC test that walks the POC's import closure and asserts no
  `packages/cap1-daemon/` file is reached. That is the predicate of `rev-539/tools/closure.mjs`, or the
  `workspace-reach` testkit's resolver. Alternatively, assert that every `@syzygy/*` specifier under
  `apps/three-surface-poc/src` is a declared dependency with a tsconfig reference. That would also catch M5.

**N3 — The differential's stated limit is narrower than its real one, and the PR describes the 7.3 key inaccurately.**
Severity: low (evidence tool).
- Evidence [Observed]:
  - The docstring (`differential.py:25–28`) and the PR body give the one held limit as "the surface is names and
    bindings, never values".
  - S2 (a value re-export made type-only) and S4 (an optional member added to an exported interface) also leave
    `surfaceEqual` true (3.4). The cause is that `surface.mjs:27–35` reads `value`/`type` from the alias **target's**
    flags, not the export's own type-only status, and records no type shape.
  - The PR body says the key "now includes the declaration's own name (`declaredAs`), beside its file". The docstring
    says "(name, value, type, file) was blind to it".
  - But 7.3's comparison key was `[r['name'], r['value'], r['type']]` (`docs/evidence/syzygy-bpyt-7-3/tools/differential.py:64`).
    7.15's key (`differential.py:79`) adds **both** `declaredIn` and `declaredAs`. The 7.3 key was blind to R13 for
    want of either field, not because of the shared file.
- Failure scenario: a later reuse trusts `surfaceEqual` against a type-only re-export or a changed public type shape,
  both of which an external consumer of `@syzygy/cap1-daemon` or `@syzygy/http-host` can depend on.
- Fix (a later evidence round; the committed evidence stays frozen): either add each export's own type-only status
  (`checker.getTypeOnlyAliasDeclaration`) and a printed type to the row, or name these two limits in the docstring.
  The dispositions record should state the key change as "+declaredIn, +declaredAs".

**N4 — The observer-input gate's list and the POC's real inputs diverge both ways.** Severity: informational;
pre-existing and unchanged by this PR. Context for the owner question the PR raises.
- Evidence [Observed]:
  - The gate (`git-observation.ts:178–189`) lists `apps/three-surface-poc/`, `packages/three-surface-poc-core/`,
    `packages/cap1-daemon/`, `packages/http-host/` and `packages/cap1-core/`.
  - The daemon entry's closure (3.6) reaches `apps/three-surface-poc`, `cap1-core`, `http-host`, `support` and
    `three-surface-poc-core`. The value imports `sha256` and `deepFreeze` from `@syzygy/support` are at
    `poc-main.ts:11` and `three-surface-poc-core/src/model.ts:13`.
  - So `packages/support/` is a runtime input the gate accepts, and `packages/cap1-daemon/` is a refused path that no
    POC file reaches. Its only remaining tie is `build:poc`.
  - Both hold identically at base. `main.test.ts:399` and `git-observation.test.ts:109` pin the cap1-daemon entry, as
    the lane disclosed.
- Failure scenario: an operator with a dirty `packages/support/` working tree gets served identities (`sha256`) from
  uncommitted bytes, with no refusal, while a dirty cap1-daemon file blocks re-observation for a package the POC never
  loads.
- Fix: not in this PR. Both directions change what a gate refuses, so under the stop clause they go to the owner. One
  owner question can cover both: narrow `cap1-daemon/`, and add `support/` (and, for the generation entries,
  `polaris-generation-*`).

**N5 — Small inaccuracies in the change record.** Severity: trivial.
- [Observed] The PR body says of the authority sweep that "the test reads only the tracked tree". Its `walk` reads the
  working directory, untracked files included (`polaris-authority-sweep.test.ts:57–61`, "The walk also reads
  untracked files"). And the evidence commit adds 1,021,361 bytes to that walk (3.9). Neither changes the [Inferred]
  load-timeout reading.
- [Observed] The "Battery:" line names `battery_clone.py`, which is not tracked (`git grep` over `561c80b3` finds no
  such file). My own runner over the canonical block reproduces `commands=110 nonzero=0`.
- Fix: in the dispositions record, cite the canonical block and this review's `battery-head.json` for the battery
  figure.

## 5. Every changed output

| Output | Base `9dba2589` → head (`f2304fd5` / `561c80b3`) | Evidence |
|---|---|---|
| Host answers to 1,296 requests, start failures and credential decisions, through both barrels | **Equal**; records byte-identical | [Observed] 3.4 |
| Capability 1 daemon end to end (statuses, bodies, stdout/stderr, exits, shutdown) | **Byte-equal** (`ddbb9620…` both) | [Observed] 3.4 |
| Both entries' banners, start-failure lines and exit codes | **Unchanged**: `apps/syzygy/src/main.ts`, `poc-main.ts` and `startup-detail.ts` byte-identical, and so are their built files | [Observed] 3.2, and below |
| Built output, 2,052 files per tree | **26 differ**: two `.tsbuildinfo`; `http-host/dist/server.js` (0 of 273 tokens differ) and its map; the `shutdown.js` and `shutdown.d.ts` maps; and the 10 retargeted POC test `.js` files (each differs in one token, `'@syzygy/cap1-daemon'` → `'@syzygy/http-host'`) with their maps. The other 3 retargeted tests import types only, so their emit is identical. Every non-test POC file and every other package file is byte-identical | [Observed] `misc-checks.json`, `dist-tokens.txt` |
| POC served pages and machine JSON | [Inferred] Unchanged: every non-test built POC module is byte-identical. Not measured end to end against a live repository [Unknown] | — |
| Export surfaces of `@syzygy/http-host` and `@syzygy/cap1-daemon` | **Equal** | [Observed] 3.4 |
| Observer-input gate | **0 of 5,731 decisions differ**; 339 refused at base, head and merge | [Observed] 3.5 |
| npm-installed tree | **Identical** (1,294 entries) | [Observed] 3.6 |
| Build graph | `tsc -b apps/three-surface-poc`: 8 → 7 projects. Root `build`/`typecheck`, `build:poc` and `apps/syzygy` unchanged | [Observed] 3.6 |
| Test titles and outcomes | 1,262 → 1,262; 1264/1262/0/2 at base, head and merge | [Observed] 3.7 |
| Governance checks and battery | Same 53 verdicts; battery 110/0 | [Observed] 3.7 |
| POC walkthrough surface version | **Changes**: `polaris@e4fd613eed56` → `polaris@2bb1f43332fd` (main `bb05df7e` = base value; the merge = head value) | [Observed] `misc-checks.json` |

**My ruling on the surface version: not a GP-Q0 behaviour change.**
- [Observed] It is printed (`poc-main.ts:40`) and rendered (`polaris.ts:922`), so literally a byte changes.
- [Observed] But `walkthrough-inputs.ts:76–79` defines it as "a digest over both Git tree ids at the observer revision,
  so it changes with any change to either tree and with nothing else".
- [Inferred] Read as a "rendered byte" under l.53, it would forbid every refactor of `apps/three-surface-poc/src`,
  test-only ones included. l.51 permits exactly those. So it is a content identity, like a printed commit, not
  behaviour.
- [Observed] No bound record carries either value:
  - `.syzygy/governance/records/` does not exist at `561c80b3`;
  - `git grep -E "polaris@(e4fd613eed56|2bb1f43332fd)"` finds only this PR's `summary.json`;
  - so no readiness state flips.
- This agrees with the coordinator's acceptance for #535. The owner may override.

## 6. Verdict per acceptance criterion

The bead's `acceptance_criteria` field is null, so I judge its three numbered items and the carried N5.

| Criterion | Verdict | Basis |
|---|---|---|
| 1. N2: extract the boilerplate without moving a printed byte or exit code, **or record why not** | **Met** (recorded why not) | Every reason is true of the code (3.3). Nothing extracted, so no printed byte or exit code moves (`e2eEqual`, byte-identical entries) |
| 2. N9: a comment-only change to `server.ts:11–29` describing the generic host | **Met, with N1** | Code-equal by two independent methods and in the emitted JS (3.2). Every sentence is true of the code. One citation is wrong, as it was before |
| 3. N12: retarget the 13 test files to `@syzygy/http-host`, then drop the cap1-daemon dependency and tsconfig reference if nothing else needs them | **Met, with N2** | 13 one-line retargets. 0 POC sources or tests reach cap1-daemon. The install and every other build graph are unchanged. The suite passes with no `dist`. No durable pin (N2) |
| Carried N5 (PR #529 review): a `surfaceEqual` selftest mutant and the swap limit stated | **Met, exceeded, with N3** | The swap is now detected (lane's R13 and my S1). The held limit stated is narrower than the real one (S2, S4) |
| GP-Q0 behaviour-preserving; class-4 further checks; stop clause | **Met** | No rendered byte, refusal or exit code changes (surface version ruled in section 5). Differential and mutants present and reproduced. The owner notice is the coordinator's [Unknown]. The stop clause is not reached |

## 7. Test quality

- **Net delta: `+0 ~0 -0`** in titles (1,262 at both). 13 test files change one import line each. No assertion changed.
  Test-rigor l.52–54 holds: "A pure refactor should not break tests" (none did), and the same tests now reach the host
  directly.
- **The retargeted tests still bite.** M3 (refusal status 401 → 403) fails 3 of their 152 tests. M4 (an unexported
  `RouteContext`) fails typecheck in two of them. M2 (one banner character) fails `main.test.ts`. The retargeting
  costs no protection.
- **Missing pin (N2).** The altered behaviour, "the POC builds and runs without cap1-daemon", is pinned only by
  one-off evidence (test-rigor l.101–102).
- **Evidence tools.**
  - `record.py`'s selftest kills 31 of 31.
  - The differential's seven mutants behave as stated. My S1 confirms the `declaredAs` fix, and S2 and S4 show the
    held limit is wider than stated (N3).
  - `code_equal.cjs`'s selftest targets are real code tokens, not comment text (3.1).
  - Each tool names its subject commit and digests, so rule 11 holds.
- **Flakiness (bar 6).** I did not reproduce the authority-sweep timeout in 17 runs, the worst at 2,073 ms against
  5,000 ms. [Inferred] Its sensitivity to load comes from a whole-tree read under the default timeout. That predates
  this PR and changes by about 1% here. It is outside the subject. If it recurs, the bar-6 remedy is a declared
  per-test timeout sized to the population, or a narrower population, and never a retry.

## 8. Cleanup

- Deleted:
  - the five scratch clones (`clone`, `clone-base`, `clone-headcode`, `clone-merge` and `clone-mut`);
  - every private TMPDIR I made, `/tmp/r539-1` to `/tmp/r539-11`. I touched nothing else in `/tmp`;
  - the six byte-duplicate differential records (`e2e-*`, `host-*`). Their digests are kept in
    `diff-out-r539/SHA256SUMS-before-prune.txt`, and each equals the lane's committed record (`cmp`).
- No process I started is still running. No kept file is over 300 KB.
- Notes on the kept files:
  - `mutants.json` (M1–M6, S1–S3) and `mutants-s4.json` (S4) are two invocations of `tools/mutants.py` at the same
    commit. The tool now lists all ten.
  - `suite-base.json`, `suite-head-nodist.json` and `suite-merge.json` came from `tools/suite.py` before it gained its
    `sweep` field. The `flake/` records came from the current version.
- The raw review itself is not in the table below.

| Path (relative to `rev-539/`) | sha256 |
|---|---|
| `battery-head.json` | `81a5f6a0a1cbf58dcdf69807327c10fd4fef7f08dc6c7d6038d33ea703a09aa8` |
| `battery-head.out` | `24f3b1a376de44323fc07d56eaa4e493c9f45ea0584dfd3d0cc7ccf369af1d9c` |
| `build-base.log` | `b1fb3e5eb7ec98e69daa88cfaf75d0d62abe9883114b772dfc9ccec2aacb6867` |
| `build-headcode.log` | `b1fb3e5eb7ec98e69daa88cfaf75d0d62abe9883114b772dfc9ccec2aacb6867` |
| `buildorder-base.txt` | `f9f08d4f0dae0d17aff05b8bb45eedfac1231da4da3ff681fc850a7b9b98dc51` |
| `buildorder-headcode.txt` | `a3f6f3344b5946c91fe85f861a3d64f893968879ad73c9c2eec6e296a73f3cc0` |
| `buildorder-root-head.txt` | `73ac5919c4e1c091435ead6375eeb2ab124a3bb53235f3ad20d9a7ef68c6e330` |
| `check-governance-base.log` | `35e629e797753d866cdea9bca8ad0989650fafad61176c9420a7a9e5d2592f4d` |
| `check-governance-head.log` | `f3e3f26fd8b1ba6620b171f4df31398b200ea8adf0cd9426c1a23035c92064b3` |
| `check-governance-merge.log` | `8699d192f41961f1c4740a64bb693f8588f6a3a7692303026dcfad70889e2675` |
| `check-quotations-base.log` | `323dfd4918f8f7178882202be9ed810b2d666f5be6b27c9677129dab554bb930` |
| `check-quotations-head.log` | `323dfd4918f8f7178882202be9ed810b2d666f5be6b27c9677129dab554bb930` |
| `check-quotations-merge.log` | `eca3cc1b92450ec8c9097e41b940b1895d4e8441df2713ec84c6bfacbdc8e3a1` |
| `closure-base.json` | `fa6202ba796398fde1ea76fc67923d25f05284baacf4eb6e8d95f52d36a8b3e0` |
| `closure-headcode.json` | `47ab28d6838d84778d92d6be2aa8d20a26ca1e9cafe4fcf6729c4135bfd21765` |
| `closure-merge.json` | `ccbce0d9a98339bcc0ff4abfab6f5fb96590d68bc8e62e3b7992708a2c7eead7` |
| `code-equal-r539.json` | `fed8f85438ea8a66a05095e2de03069706ac24c2d02a2b86d2def17e05607935` |
| `diff-out-r539/SHA256SUMS-before-prune.txt` | `ef8ad8e78b14a9e692801ca4d3a367bdd4f2e426f2b0dddd734b5f38faeebbde` |
| `diff-out-r539/differential.json` | `dec1683007fd3c99e14e35a7bc35b5998e4b84d54058d7bcc37a13839677bffc` |
| `diff-out-r539/surface-base.json` | `bcd3e9342aebc602b04e5ca1f553b8011ff784a86d81d57a437cf676a91b6066` |
| `diff-out-r539/surface-head.json` | `974be3fb3a466f93ffa0180bb4c7741cedf8f41034968200cb849f9c24a92be3` |
| `differential-r539.log` | `098b12c84d4dd1843a4e370b5b734f9881fbe802019051194fbd4001b0f5e814` |
| `dist-tokens.txt` | `4e5191c238e5b995b633d6febe819ef809282aeac6d97bca59e45f0faba3b5e9` |
| `flake/alone-base-1.json` | `88edce15556edbde25044aac32581d4e80043a1743a020703636f52f2d620fe2` |
| `flake/alone-base-1.out` | `1c6c7fc7dd94200042261465bf13b2194ce855520d55853bdbf02862c1e650e8` |
| `flake/alone-base-2.json` | `f99ba12ed40833502bad018c9eb5d4e0e1b34ed54df3bdb96a863441302a717e` |
| `flake/alone-base-2.out` | `6c898f175fe09172b208695f7524e4c4fb019ee5891a613bd6c7d93169839011` |
| `flake/alone-base-3.json` | `f5543eefd9621f86fd82f93b04a32654da87e4974cfada1c630616fe248f7564` |
| `flake/alone-base-3.out` | `b51b5d99728175faeedaa7c6c388618c965f18dd1aa064a8219129d741d19221` |
| `flake/alone-base-4.json` | `457e8c6711ec207ea2cb0e77d095fd771bfc1525c468e8f8a8f8f6e580ca37d1` |
| `flake/alone-base-4.out` | `a3f979d45acb6bde13533cf696fc2e048798cdd61e699fff11dc25ac0ade1333` |
| `flake/alone-base-5.json` | `fe6c3932f6c170b2d75584339e58a337d761c25c1ea439ecf5e28a67f4f85ba8` |
| `flake/alone-base-5.out` | `bf2302beda208ab3722aa8dca4a7f2c7bf34563cd56c0d3178fdd686a7cfd2fd` |
| `flake/alone-head-1.json` | `ee2959d8d4892d557cb556e12cf9178d9743bd7be98025ae144e23225a8693d8` |
| `flake/alone-head-1.out` | `bead88b886e5adc296ad616d00387a7ccfabe1cd8a874cf4676e11d800840ef4` |
| `flake/alone-head-2.json` | `28e13d3cfbd26985909eaef4bce94fe1fcdcf6530168f0520d27138c5a15b378` |
| `flake/alone-head-2.out` | `0772dc3e5cfc56b956e2c18be9816819445e17f8949180863591f8ed961b34d5` |
| `flake/alone-head-3.json` | `bb34a6c1a491e28c0739960945a76388b410a9ba23d116bc4d1da7cb60776467` |
| `flake/alone-head-3.out` | `18f1c197c1197a2168c9bffbcfc078c5d1501df626070161fc062a37976f7c5d` |
| `flake/alone-head-4.json` | `39c3bc51ea484c3426c10bdb5a503811eec46c3ba263df2ae2401349031669e6` |
| `flake/alone-head-4.out` | `d1114dd007167fca79347841ed6279119774b6a02b8f460f38b1d66615c985bd` |
| `flake/alone-head-5.json` | `a970b594172ad9e5a02d6bb4548489c2ad93079a2af82ca70085f831c4782c3e` |
| `flake/alone-head-5.out` | `056377ab0c82bab4026316edbae81c869a06a9247f8c216c98d6bf41dbfe132c` |
| `flake/poc-base-1.json` | `8d69308e76d347898096650d2b8f147d9d5481a4e7d9e0b222e3998fcb1dcce0` |
| `flake/poc-base-1.out` | `8715573f80bc002e79469ecc45ad6767cc4eb3db3f16855ff8a3205da8f67168` |
| `flake/poc-base-2.json` | `cc22b408e53294c88e8448fe614206fffc63b1447fadbafb55a4f9d8cd78bfc9` |
| `flake/poc-base-2.out` | `40f27289c3b5ba46fbe99d36609d7fefca87bc4bbc6a28552e0f273ebb07a432` |
| `flake/poc-head-1.json` | `7b290bca8ad1569abcc5e52f14f7b7d0357b83759b95376efa07fefa7806b51e` |
| `flake/poc-head-1.out` | `e000cbb44f3d0b6c4e0624e07c4fbede86a19eccbc67f00f26edae474eabcff2` |
| `flake/poc-head-2.json` | `906fd31583f0ec92f5950d32593d423a18069c461dfbac513f4746ae541c4fe5` |
| `flake/poc-head-2.out` | `eb75c79963822a342ed936235a3da04ff2a8d5eaf1b749fbd8db6988c338ea1e` |
| `gate-sweep.json` | `ef523604462b1db93eecebb3adec6506043c6202b44caf9f914855f0afa45aaa` |
| `m536.txt` | `576a0f9967a227d0d616b8a95895e4a9c50ddee89c1c41919c8317a0a120d7ea` |
| `misc-checks.json` | `422a6ffd551edfee923de4956a9b3a730e2fddca014da22798f90fd8510a6861` |
| `mutants-s4.json` | `86e209252dd1228888ac03f988dd33cafe5070ad1ced660e7c493a0e644c3aee` |
| `mutants.json` | `6b81a5dcbd65ee608759d05e31a6ce30929a194248b005353abf2eb7a4c2d84e` |
| `mutants.out` | `a858a130a29440dc05c75169f13207d80bbf1828e34cbb5d98809f226b2b6364` |
| `npmci-base.log` | `77c29a792ee55ce2f4090536c1d69743b7246f1c0d6c49e588793029fa4f62cd` |
| `npmci-head.log` | `757f96e92df2fd0cd564291223f813b4947b27d1415aa0ab8a93b8391322a1e1` |
| `npmci-headcode.log` | `493ee52b25036c36e6a978d8f8f70ccf1a329a70d1266d668cb6cb063f95b09c` |
| `npmci-merge.log` | `757f96e92df2fd0cd564291223f813b4947b27d1415aa0ab8a93b8391322a1e1` |
| `npmci-mut.log` | `df99c6c7794f3c7a0bdf8523d26eb6d3d2ab18a0f93e269ff66c8eb1c8165c93` |
| `poc-alone-r539-base.json` | `c0cafc74a63f00cac42e74c369d834e1646f93fe485ea650cea55d4cd7a42035` |
| `poc-alone-r539-head.json` | `86c66623dbd6f703184a49be464c6a561fff7a1f37e5f998249db33a9ef00121` |
| `pr-body.md` | `ce67e96e5a320a37753f152ae71d29033fc103e33adec88118da012956231f69` |
| `record-check.json` | `42ebfa97a01e7013d45520d4781dac68f1331b93c8c1a336fc7a79d8964f8619` |
| `record-selftest.log` | `b25a944b5024e0301db3f89a9d4b830e5f5d7adca57590263446726c6b852a3e` |
| `strip-compare.txt` | `b448c13f52b73afdd05f13fccd9bc5e8e2537da8221207f6827e7fdfae04998c` |
| `subj.txt` | `99d75fe04d7b41d0e1ed4f53aa7ddafce3b2673e8eba839d90f0e86450e68c0f` |
| `suite-base.json` | `73fb848047d7be256808c4fa763a0add1b5d6fc45125388ae7bb484060445c6b` |
| `suite-base.out` | `6989d71d1f963c3b19888413bf800241f38881a85e59a63352889c1f6ea09bc8` |
| `suite-head-nodist.json` | `dcfeda66ccf71e60d7b49c202ac74ffd0fcf194e5a72152e7d82a932cabe5a01` |
| `suite-head-nodist.out` | `2c0f8bf612d4de84ce59d54e35bce46437da8b2f9250ef527c5e4d90e416bf28` |
| `suite-merge.json` | `3887b233a280c360934f160661bd4cbb40d1547caca46c550279a70d5bdbf6fb` |
| `suite-merge.out` | `e241b38594b07be4a581ecbdea0ddb5556f06b77836e9a16e24b993378433d96` |
| `titles-r539.json` | `dd2c502c9f9c28ff20cf02ae080f807a0b2bb2e585d4e63057e3b5df92effcb1` |
| `tools/battery.py` | `945f777446bf5c914e99c81a63b945bd1024a133b1def8d2c0d028fe51123c23` |
| `tools/closure.mjs` | `303a7061a4d05ca67174c7653aaa4308829747c1b8eec74acfc91507f57f96ec` |
| `tools/dist_tokens.mjs` | `629debfdd9f0af8fb6239437ebfdc090d66b04f0f1aaf9cfe10ee0a7e32714df` |
| `tools/flake.sh` | `0f8553d448d005bbc92f4a0492a9f741ec66bb9a52ce03b41c874ffdb37d8f56` |
| `tools/gate_sweep.mjs` | `7cd61e609a4c591437bf3ff9a630e616d2788055bb77af654e8e562e36780c42` |
| `tools/misc_checks.py` | `d9b6bb25da23349a917cd7dc7ba3d46416ef0ed77f85b2a02d6f5300f8a240a1` |
| `tools/mutants.py` | `6b4601762e127b8f92bc5744a4b5bd6b4161782c49f9115cd266082a1c3c8d07` |
| `tools/record_check.py` | `71444aeb4c0065e3c557c57966c5ddbd63e6b2c62ebc7a848e3d8bacf05f91a8` |
| `tools/strip_compare.mjs` | `4e05cb8ec4c92947f260497e21df753edb6df8d48e4bc8929f68dd1d53cdd62a` |
| `tools/suite.py` | `61aafaa4d5ec6775940b243cb6287c1fc865ebb6ccd85ac840b641d1a1b743d4` |
| `tools/titles.py` | `e2f800b340a7abd54e87f68405cc7dc9215321474b68e63fc687d34315df62fc` |
| `typecheck-head.log` | `16ec4cd0ac6c93c48bb2b0beed58c59bf9624ee2e6eeb774b810ea969fe40edc` |
| `typecheck-merge.log` | `16ec4cd0ac6c93c48bb2b0beed58c59bf9624ee2e6eeb774b810ea969fe40edc` |
