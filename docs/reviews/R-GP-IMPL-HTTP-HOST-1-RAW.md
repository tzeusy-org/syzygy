# R-GP-IMPL-HTTP-HOST-1 — CC-REV-1 implementation review of syzygy-bpyt.7.3, round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: c68fc5ca
Subject: r1-review.diff sha256 e524ff7dc24cddc925bd0dbaa6371a4c91b8091f889110f4978330b1dfbf5849

Reviewer: rev-529. Fresh context, independent of the lane. No reviewed byte was changed. Nothing was pushed or
commented, and nothing was merged. No target repository content was fetched or read. The only network fetch was of
Syzygy's own `main` from GitHub (section 1). No credential store was opened.

Verdict basis: no blocking finding (F) and twelve notes (N1–N12). Every credential, origin and ceiling decision that I
measured equals base. Both moved files are byte-identical by blob id, as the bead requires. No CAP1 daemon response
byte, refusal string or exit code changes. Every governed citation resolves. I rule the gate prefix the move followed
through, not a change to what the gate accepts or refuses (section 2). One rendered value does change and the PR does
not disclose it: the POC's live walkthrough surface version, which moves with any POC `src` edit by design (N1).

---

## 1. Subject identity checks

- [Observed] `sha256sum` of the brief's subject file and of `git diff c104771f c68fc5ca`:
  `e524ff7dc24cddc925bd0dbaa6371a4c91b8091f889110f4978330b1dfbf5849  ../../lead/b73/r1-review.diff` and
  `e524ff7dc24cddc925bd0dbaa6371a4c91b8091f889110f4978330b1dfbf5849  -`. **Match.** `--shortstat`:
  `65 files changed, 39491 insertions(+), 793 deletions(-)`.
- [Observed] `git diff 9b539e5f 9d551887 | sha256sum` →
  `e2cdf2cef3fbc375a12a63a32ed8ac9c045a481ea4df89afca2386debb0d4a8b  -`. **Match.**
  `44 files changed, 1052 insertions(+), 793 deletions(-)`.
- [Observed] Commit graph:
  - `c68fc5ca` has parents `9d19feaf` and `c104771f`;
  - `9d19feaf` has parent `9d551887`;
  - `9d551887` has parent `9b539e5f`;
  - `git merge-base c104771f 9d19feaf` = `9b539e5f`.
  The PR head on GitHub is `c68fc5ca6ec99a08c118e112df362bfa8ab01070`.
- [Observed] Main between the merge base and base changed 884 paths. None of them is one of the 44 code paths
  (`comm -12` empty).
  - With `--no-renames`, the subject restricted to the 45 code paths (the 44 plus the rename source) hashes the same as
    the code commit's own diff. Both are `58aee5ef528c55224ef9e430d9713a6fdf1f63715c71981aea4aeefc3cb6f38e`.
  - So the reviewed code bytes are the code commit's bytes.
- [Observed] The evidence commit `9d19feaf` adds 21 files, all under `docs/evidence/syzygy-bpyt-7-3/`, and changes
  nothing outside that directory. 44 of the 65 subject paths lie outside that directory.
- [Observed] **Main moved while I worked.** `origin/main` is now `8ff50172` (PR #528, `syzygy-bpyt.8.36`).
  - Main changed 78 paths since `c104771f`: 75 under `docs/` and 3 outside it, namely
    `packages/polaris-dossier/src/argv.test.ts`, `packages/polaris-generation-core/src/workspace-reach.test.ts` and
    `packages/polaris-generation-core/src/workspace-reach.testkit.ts`.
  - **Overlap with the 65 subject paths: 0.**
  - The overlap is not textual, but #528's testkit enumerates workspace manifests by `readdirSync`, so it sees the new
    `packages/http-host`. I therefore merged `c68fc5ca` with `8ff50172` in a scratch clone. The merge had no conflicts.
  - On that merge, the four files that use or were changed by that testkit pass: `subpath-imports.test.ts`,
    `island-boundary.test.ts`, `workspace-reach.test.ts` and `argv.test.ts`, with `Test Files  4 passed (4)` and
    `Tests  133 passed (133)`.

## 2. Clauses relied on (quoted), and class ruling

**CC-REV-1** (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md`):
- l.31: "1. **authority boundaries** — write-universe, typed-authority table, adapter authorization (VIS-5, VIS-6);"
- l.35: "3. **deterministic observation** — snapshot composition, evaluation identity, the deterministic/inferred seam
  (VIS-7);"
- l.37: "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
- l.40: "6. **public interface** — machine-queryable endpoints, adapter contracts, anything an external consumer can depend
  on;"
- l.45: "**Class membership is contested by default and is never finally determined by the agent performing the change**"
- l.51: "**A reviewer or the owner** may reclassify at any time."

**GP-Q0** (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`):
- l.52–55: "\"Behavior-preserving\" means none of the following changes: – a rendered byte, a wire format, a refusal string
  or an exit code; – a signed or digest-bound artifact; – a consent, security or retention decision."
- l.62–66 names which PRs get the three extra checks: "pull requests touching class 1 (authority boundaries), class 3
  (deterministic observation) or class 4 (security), and class-6 pull requests that remove an endpoint". The checks are
  "an old-versus-new differential over a mutated-record corpus that includes records with altered prose; a rule-6 mutant
  for each predicate; a non-blocking owner notice in the cycle report."
- **Stop clause**, l.95–96: "Any change not listed here to what a gate accepts or refuses stops and returns to the
  owner."

**RFC 0005, RFC5-3** (`.syzygy/governance/contracts/rfcs/RFC-0005/admission-and-boundary.md:126–132`):
- "Every request is classified as exactly one of two client classes, **by credential presented, never by network
  location or header heuristics**: a request bearing a valid machine credential is a machine client; every other
  request is browser-class."
- "Loopback location alone never proves client identity (SEC-1)".

**Bead `syzygy-bpyt.7.3`**, read only with `bd show`:
- "Move it byte-identically";
- "Keep packages/cap1-daemon/src/* paths that governed files cite as re-exports";
- guardrail 3: "a path:line locator or manifest row inside a digest-bound file pins that path. Keep the path (thin
  re-export or shim) when a bound file cites it."

**AGENTS.md at `c68fc5ca`:**
- rule 6 (l.126): "Mutate the input and confirm the check fails, per predicate";
- rule 9 (l.132): "A claim of absence needs a sweep with a denominator.";
- l.275: "Root Vitest `test.projects` must alias `@syzygy/cap1-core`, …".

### Class ruling (mine)

| Class | Ruling | Basis |
|---|---|---|
| 1 authority boundaries | **Touched (not declared by the PR, N3)** | `authorizeStateWrite` moved to a new package. `http-host/src/credentials.ts:23–26` calls it "the daemon's only write boundary … The state directory is the daemon's ONE authorized write home". That is the daemon's write universe |
| 2 graph identity | Not touched | No identity minting or continuity code changed |
| 3 deterministic observation | **Touched** | `pocObserverInputsAreClean` decides whether the POC observes and serves from committed bytes. Its input list gained a prefix |
| 4 security | **Touched** | Credential lifecycle and admission (the RFC5-3 boundary) moved. The listener package changed |
| 5 data migration | Not touched | No `.syzygy/**` schema or store changes (0 governed files changed) |
| 6 public interface | **Touched, no endpoint removed** | The `@syzygy/cap1-daemon` export surface (consumers depend on it) and a new `@syzygy/http-host` surface. The e2e differential is byte-equal over every route the CAP1 daemon serves |
| 7 certificate logic | Not touched | — |

Because classes 1, 3 and 4 are touched, the GP-Q0 extras apply. The PR supplies all three:
- the differential (a request corpus with malformed headers, altered and invalid declaration fixtures, a state-write
  candidate corpus and credential-file states);
- rule-6 mutants for the new predicates;
- the owner notice, "due on `syzygy-bpyt.10` at landing".

Class 1 needs no check beyond these. Its predicate (`authorizeStateWrite`) is blob-identical, and the differential's
`cases.writes` (11 candidates) is equal.

### The gate prefix, and the stop clause

[Observed] `apps/three-surface-poc/src/git-observation.ts:184` adds `'packages/http-host/',` to `inputPrefixes`.

I re-ran the lane's gate differential (`gate-diff.mjs` through `differential.py`) over `c104771f` and `c68fc5ca`:
- **4,974 paths**: every path tracked at either commit, plus the 7 probes.
- `refusedAtBase` 310 and `refusedAtHead` 321.
- 11 paths differ, each `accepted` at base and `refused` at head: `packages/http-host/package.json`,
  `src/credentials.test.ts`, `src/credentials.ts`, `src/escape-html.ts`, `src/index.ts`, `src/new.ts` (probe),
  `src/package.test.ts`, `src/server.ts`, `src/shutdown.test.ts`, `src/shutdown.ts` and `tsconfig.json`. All are under
  `packages/http-host/`. The list is identical to the lane's committed record at `9b539e5f`/`9d551887`, which used
  4,072 paths.
- `git ls-tree c104771f packages/http-host` is empty, so no differing path exists at base.
- The completeness of this denominator is also analytic. The edit only adds a prefix to an `every(... !startsWith)`
  conjunction, so only paths starting `packages/http-host/` can change decision, and only from accepted to refused.

**Ruling: this is the move followed through, not "a change … to what a gate accepts or refuses" under l.95–96.**
- The gate protects the POC's runtime inputs.
- At base, a dirty edit to the host's admission bytes is refused. Those bytes were then `packages/cap1-daemon/src/server.ts`
  and `credentials.ts`, under the covered prefix `packages/cap1-daemon/`.
- At head, the same bytes are blob-identical (`credentials.ts`) or carry the three recorded edits (`server.ts`), and a
  dirty edit to them is still refused, now under `packages/http-host/`.
- Over every path that exists at base, no decision changes.
- Without the prefix, the gate would have **accepted** a dirty host. That would be the unlisted change, and a loosening.
  - [Observed] my R16 mutant removes the prefix, and the new row then fails.
  - [Observed] The lane's differential selftest `gate-host-prefix` gives `"checkHeld": false, "detected": true`.
- The owner may reclassify (CC-REV-1 l.51). The owner notice should name this ruling (N3).

**The lane's "pre-existing gap" (the gate omits `packages/polaris-generation-core/`): confirmed in the weak sense, and
refuted as a coverage gap of what the gate protects. 7.3 does not change it.**
- [Observed] Imports: 18 POC production files under `apps/three-surface-poc/src/polaris-generation/` import
  `@syzygy/polaris-generation-core` or `-consent`, at both commits.
- [Observed] The gate's only caller is `poc-main.ts:136`, on the serve path. That path is not reached by those imports.
  My static and literal-dynamic import closure of `apps/three-surface-poc/src/main.ts` (tool `closure.py`) contains
  **0** files under `packages/polaris-generation-core/` or `-consent`:
  - at base: 106 files (41 POC app, 20 cap1-core, 8 cap1-daemon, 37 poc-core);
  - at head: 103 files (41 POC app, 20 cap1-core, 5 http-host, 37 poc-core).
  - The only `polaris-generation/` file in either closure is `isolated-git.ts`, which imports neither package.
  - Outside `polaris-generation/`, `git grep "import("` over non-test POC sources returns 0 lines.
- [Observed] The prefix is absent at both commits, and the probe `packages/polaris-generation-core/src/index.ts` is
  `accepted` at both.
- [Inferred] The dossier and generator entry points that do import it never call the gate.
- [Observed] The base gate pins no `packages/cap1-core/` path in its test either. That is a pre-existing test gap, not
  this PR's.

## 3. What I ran and the results

All runs used my own clones under `rev-529/` and private TMPDIRs `/tmp/r529-1…5`, all deleted afterwards:
- `clone`: head `c68fc5ca`, fresh `npm ci`, then `npm run build`;
- `base`: `c104771f`, fresh `npm ci`, then `npm run build`;
- `mut`: head, `npm ci`, with **every `dist/` absent** until the typecheck;
- `merged` and `bpoc`: scratch clones for the main-merge and the `build:poc` checks.

Every daemon I started bound port 0 and stopped itself (the tools close it). I killed nothing.

**3.1 Byte identity, by git objects** (`tools/identity.py`, plus `git diff` of objects):
- [Observed]
  `blob credentials.ts: base cap1-daemon cba78cd5b44ec1322285a1663da6aa18b586930d head http-host cba78cd5b44ec1322285a1663da6aa18b586930d equal=True`
  and
  `blob credentials.test.ts: base cap1-daemon 3ba6d3b05ddb00c53479ecd6390c39c9e86d1655 head http-host 3ba6d3b05ddb00c53479ecd6390c39c9e86d1655 equal=True`.
  Same at `9b539e5f`/`9d551887`.
- [Observed] `git diff c104771f:packages/cap1-daemon/src/server.ts c68fc5ca:packages/http-host/src/server.ts` has
  exactly three hunks:
  1. `-import { evaluationId, type AdmissionResult } from '@syzygy/cap1-core';` became
     `+import type { AdmissionResult } from '@syzygy/cap1-core';`;
  2. `-import type { ProjectEvaluation } from './pipeline.js';` was removed;
  3. the tail from the blank line before `// --- This wave's minimal root route` to EOF was removed (55 lines).
  Nothing else differs.
- [Observed] `shim tail equal to base tail: True (base tail 1982 chars, mark count base=1 shim=1)`.
- [Observed] `escape-html.ts occurs verbatim in base routes-human.ts: True (count 1; 11 lines)`. At head,
  `routes-human.ts` defines no `escapeHtml` (0 definitions). It imports it and re-exports it.
- [Observed] The shims' re-exports, compared with base exports by name:
  - `server.ts: base exports 17; head shim exports 17; missing=[] extra=[]`;
  - `credentials.ts: base exports 14; head shim exports 14; missing=[] extra=[]`.
  These match the PR body's lists: 8 values and 8 types, and 9 values and 5 types.
- [Observed] By the TypeScript checker (`surface.mjs`, my run), the `cap1-daemon` barrel has
  `70 names 42 values` at both commits. At head, `declaredInHost 31`. `errors 0` both.

**Every other production file that changed, and whether behavior can change:**

| File(s) | Change | Behavior change possible? |
|---|---|---|
| 12 POC files: `exact-tables`, `materialize-action`, `orrery`, `polaris-reconciliation`, `polaris-source`, `polaris`, `reobserve-action`, `routes`, `startup-detail`, `surface-links`, `trajectory`, `unknown-marker` | Import specifier `@syzygy/cap1-daemon` became `@syzygy/http-host` | [Inferred] No. The same function objects arrive by a different module path. **Except** the live walkthrough surface version, which hashes the `apps/three-surface-poc/src` tree (N1) |
| `apps/three-surface-poc/src/poc-main.ts` | Import, and the shutdown block replaced by `closeOnSignal` with no `closeFailed` | [Inferred] No. A failed close resolved silently before (`() => resolveShutdown()`) and resolves silently now (`io.closeFailed?.(cause)` absent). [Observed] Signal paths are pinned by `main.test.ts` (R12 killed, 9 tests) |
| `apps/three-surface-poc/src/git-observation.ts` | Gate prefix | Yes, for 11 paths under `packages/http-host/`, ruled in section 2 |
| `apps/syzygy/src/main.ts` | `createDaemon` now imported from `@syzygy/http-host`; shutdown block replaced by `closeOnSignal` with an identical announce line and close-failure line | [Observed] No, on every path the e2e exercises: SIGINT, SIGTERM and both together, byte-equal stdout, stderr and exit. [Inferred] The close-failure line is the same template. No test exercises it at the app level at either commit: `git grep "close failed"` finds only `main.ts:279` and `shutdown.test.ts` |
| `packages/cap1-daemon/src/server.ts`, `credentials.ts` | Shims (re-exports), plus the root route kept byte-equal | [Observed] Not for in-repo consumers: the host differential through `cap1-daemon` is equal. A swapped re-export would not be caught by tests (N4) |
| `packages/cap1-daemon/src/routes-human.ts`, `routes-machine.ts` | Imports moved to `@syzygy/http-host`; `escapeHtml` re-exported; the definition comment replaced | [Inferred] No. Type imports are erased, and `escapeHtml` is the same function |
| `packages/http-host/src/{index,shutdown}.ts` | New | The `shutdown.ts` behavior is the base blocks' behavior (above) |
| `package.json`, `package-lock.json`, three app and package manifests, four tsconfigs, `vitest.config.ts` | Wiring | [Observed] No served-byte effect. Build and test results are below |
| `scripts/run_m10_conditional_mutations.mjs` | `serverFile` retargeted | [Observed] Required, since the old path no longer holds the fragment. `m10-head.json`'s `auth-order-bypass` fragment occurs once at `9d551887` |
| `AGENTS.md`, `SECURITY.md` | Prose | [Observed] No digest citer of either base blob or base sha256. The old SECURITY.md sentence is quoted nowhere |

**3.2 The credential boundary.**
- [Observed] `handleRequest` (`http-host/src/server.ts:227–289`) is base bytes. The order is unchanged: route lookup
  (line 233), then, for `machine-credentialed` routes only (248), `credentialFromAuthorizationHeader(req.headers.authorization)`
  (253) and `verifyCredential(expectedToken, credential)` (254), then the refusal or the handler.
- [Observed] Both apps reach it through `@syzygy/http-host`: `apps/syzygy/src/main.ts:39` and `poc-main.ts:7`. At base,
  both reached the same bytes through `@syzygy/cap1-daemon`.
- [Observed] The POC's origin check (`browser-origin.ts`) is unchanged and runs inside the POC's own handlers, as at
  base.

My 19 mutants (`tools/mutants.py`) were run dist-absent at `c68fc5ca`. Each replaces exactly one occurrence, asserted
by count. Each restore was checked with `git status --porcelain`, and every run gave `clean=True`.

- Host set: 571 tests in 68 files. The unmutated baseline is `Test Files  68 passed (68)` / `Tests  571 passed (571)`.
- Gate set (R16, R17): `git-observation.test.ts` and `main.test.ts`, 35 tests.

| Id | Mutant | Outcome (verbatim) | Should a test kill it? |
|---|---|---|---|
| R1 | `tokensEqual` hashes `presented` on both sides | `killed exit=1 failed=6/571 files=4` | — |
| R2 | `/^Bearer (.+)$/i` (scheme case-insensitive) | `killed exit=1 failed=1/571 files=1` | — |
| R3 | `/^Bearer\s+(.+?)\s*$/` (whitespace widened) | **`survived exit=0 failed=0/571`**; also survives at base (`0/561`) | Yes. Pre-existing (N6) |
| R4 | Loopback `remoteAddress` admits (the RFC5-3 violation) | `killed exit=1 failed=14/571 files=4`. CAP1 tests: `routes-machine` 2, `server` 9. POC tests: `routes` 2, `polaris-presentation-route` 1 | — |
| R5 | Machine GET routes skip admission | `killed exit=1 failed=14/571 files=4` | — |
| R6 | Handler invoked once before admission | `killed exit=1 failed=13/571 files=4`. CAP1 `server` 10; POC `materialize-action`, `response-limits`, `routes` 1 each | — |
| R7 | Breach line drops `response-limit-breached` | `killed exit=1 failed=1/571 files=1` | — |
| R8 | Population allow-list drops `'project shape not-admitted'` | **`survived exit=0 failed=0/571`**; also survives at base (`0/561`) | Yes. Pre-existing (N6) |
| R9 | 304 logged as non-success | `killed exit=1 failed=1/571 files=1` | — |
| R10 | `DAEMON_HOST = '0.0.0.0'` | `killed exit=1 failed=21/571 files=8` | — |
| R11 | `closeOnSignal`: a clean close never resolves | `killed exit=1 failed=13/571 files=2` | — |
| R12 | POC registers SIGTERM's listener as SIGINT | `killed exit=1 failed=9/571 files=1` | — |
| R13 | Server shim: `HANDLER_FAILURE_STATUS as UNKNOWN_ROUTE_STATUS` | **`survived exit=0 failed=0/571`** | Yes. New bytes (N4). The differential catches it |
| R14 | Credentials shim drops `type StateWriteRefusalName` | **`survived exit=0 failed=0/571`** | Arguably. New bytes (N4). The differential catches it |
| R15 | `escapeHtml` replaces `&` last | `killed exit=1 failed=4/571 files=4` | — |
| R16 | Gate: `'packages/http-host/'` removed (rule 6 for the gate) | `killed exit=1 failed=1/35 files=1`. The killing row is `protects the HTTP host package the POC serves through` | — |
| R17 | Gate prefix narrowed to `'packages/http-host/src/'` | **`survived exit=0 failed=0/35`** | Yes. Same pattern as the base `cap1-daemon` row (N7) |
| R18 | POC origin `startsWith` instead of `===` | **`survived exit=0 failed=0/571`**; also survives at base (`0/561`) | Yes. Pre-existing, unchanged file (N6) |
| R19 | `isWithin` without `path.sep` (sibling-prefix write) | **`survived exit=0 failed=0/571`** | Yes. Pre-existing; blob-identical code and test (N6) |

Totals: `killed 12 survived 6 error 0 of 18` for R1–R18. R19 is `survived`.
- R4 and R6 were re-run with every failed title kept (`own-mutants-r4-full.json`), to name the files in both apps.
- Base re-runs of R3, R8 and R18: `killed 0 survived 3 error 0 of 3` over 561 tests (`base-mutants.json`).

**3.3 The differential** (`tools/differential.py` and its four recorders at the committed digests):
- [Observed] I ran it on my clean built clones of `c104771f` and `c68fc5ca`, with `--selftest`. Verbatim:
  `"surfaceEqual": true`, `"hostEqualThroughCap1Daemon": true`, `"hostEqualThroughHttpHost": true`,
  `"e2eEqual": true`, `"asExpected": true`, and `"selftestPassed": true`.
  - All four selftest mutants report `"detected": true`: `refusal-status`, `credential-detail`,
    `shutdown-announcement` and `gate-host-prefix`.
  - The run prints `gate differing: 11 only host paths: True`.
  - `toolsSha256` equals the committed record's.
- [Observed] My host and e2e records are byte-identical to the lane's committed ones, which were made at other commits
  (`9b539e5f`/`9d551887`):
  - `e2e-base.json` and `e2e-head.json`: `ddbb9620…`;
  - `host-base.json` and `host-head-cap1-daemon.json`: `2c4e8c40…`;
  - `host-head-http-host.json`: `8e7144fc…`.
  The full digests are in `diff-out-records.sha256`. The `surface-*` files differ only because each embeds its tree
  path.
- [Observed] Input mutation beyond the lane's selftest (`tools/diff_probe.py`):
  - With R14 applied, `"R14surfaceEqual": false`.
  - With R13 applied to the built shim, `"R13hostEqualThroughCap1Daemon": false`, and the constants differ:
    `"UNKNOWN_ROUTE_STATUS": [500, 404]`.
  - The unmutated control gives `"surfaceControlEqual": true`.
  So the differential detects both shim mutants that the tests miss.
- [Observed] Corpus denominator, by script over `host-base.json`:
  - `requests 1296` = 24 paths × 6 methods × 9 `Authorization` forms (none, right, wrong, lower-case scheme, double
    space, trailing space, empty token, `Basic`, token minus its last character). There are 128 distinct answers.
  - Status histogram:
    `{200: 50, 201: 9, 302: 9, 304: 2, 401: 70, 404: 1080, 410: 9, 500: 20, 503: 38, 600: 9}`.
  - stderr reasons: `{'unknown-route': 1080, 'credential-refused': 70, 'handler-failure': 20, 'route-non-success': 45,
    'response-limit-breached': 11}`, with `strayStderr 0`.
  - Both credential classes are present (`tools/count401.py`, over the committed `host-base.json` read from git
    objects). 10 (method, path) pairs reach a machine-credentialed route: GET and DELETE on `/machine`,
    `/machine?x=1&x=2` and `/open/../machine`, and GET on `/etag`, `/limit-unknown`, `/not-modified` and
    `/throws-string`. Each is refused with 401 under auth forms 0, 2, 3, 4, 6, 7 and 8, which gives `401 total 70`
    (10 × 7). None is refused under forms 1 or 5.
  - All three start failures are recorded: `duplicate-route`, `credential-unprovisionable` and `bind-failed`.
  - There are 18 credential case groups, including 11 state-write candidates.
  - The e2e covers 3 fixtures (complete, bare, and an invalid declaration, which is the altered-record case) × 24
    requests, the 3 signal sets, and 3 refused invocations.
- [Observed] Auth form 5 (`Bearer <TOKEN> `, trailing space) is admitted (200) at **both** commits. [Inferred] Node's
  HTTP parser trims trailing header whitespace before the host sees it. This is not a change.
- [Observed] Coverage limits:
  - No `Origin` or `Host` variation. That is correct for the host, which consults neither (RFC5-3). The origin check is
    the POC's and is unchanged.
  - No request body.
  - The POC is not run end to end: it serves only the registered Butlers locator.
  - The differential's own selftest has no mutant for `surfaceEqual` (N5).

**3.4 Wiring.**
- [Observed] Root `package.json` lists `packages/http-host` in `build`, `build:poc` and `typecheck`.
- [Observed] `package-lock.json` adds only the link, the package entry and three dependency edges.
- [Observed] `http-host/tsconfig.json` is the base `cap1-daemon/tsconfig.json` blob (`a0f1da52`). `cap1-daemon`, the
  POC app and `apps/syzygy` reference it.
- [Observed] `vitest.config.ts` aliases `@syzygy/http-host` to `packages/http-host/src/index.ts` and adds a project.
  `@syzygy/cap1-core` and `@syzygy/cap1-daemon` stay aliased.
- [Observed] CI (`node-ci.yml`) runs `npm ci`, `build`, `typecheck`, `npm test` and `test:system`, with no path filters.
  Hosted checks at `c68fc5ca`: `checks pass 2m9s` and `node pass 3m32s`.
- [Observed] **Dist-absent full suite** in `mut` (`find … -name dist` = 0, tree clean): `npx vitest run` gave
  `'numTotalTests': 5288, 'numPassedTests': 5283, 'numFailedTests': 0, 'numPendingTests': 5, 'success': True`, and
  `241 files; 0 not passed`, exit 0. The five skips are:
  - `no-egress.test.ts`, with "strace is unavailable, so the capture is skipped";
  - three `SYZYGY_POC_BUTLERS_REPO`-gated live tests;
  - one browser test.
- [Observed] Of the 88 kept test files:
  - 80 non-system files ran and passed (2,214 of 2,215 tests; the one skip is the no-egress strace test).
  - The 7 system files passed in the system run.
  - 1 file, `docs/evidence/launch-form-ctime-review-2026-10-24/work/variant-target-ctime.test.ts`, is in no Vitest
    project and was not run. Its blob is unchanged.
- [Observed] `npm run typecheck` in `mut`, from dist-absent: `exit=0`.
- [Observed] **Fresh checkout:**
  - `npm ci` then `npm run build` exit 0 in `clone` and `base`.
  - In a further fresh clone, `npm ci` then `npm run build:poc` gives `build-poc-exit=0`. The built POC loads,
    `import.meta.resolve('@syzygy/http-host')` → `<bpoc>/packages/http-host/dist/index.js`, and `main.js --help` prints
    its usage.
  - The built CAP1 daemon served the e2e corpus.
  - [Unknown] The POC serving a live repository. It refuses any repository but the registered Butlers locator, which I
    may not read.
- [Observed] **System tests**, run as `SYZYGY_FRESH_CLONE=1 npm run test:system` in `clone`:
  - Run 1: `Test Files  10 passed (10)`, `Tests  49 passed (49)` and `Errors  1 error`, exit 1. The error was
    `Error: [vitest-worker]: Timeout calling "onTaskUpdate"` at load average ~28.
  - Run 2: `Test Files  10 passed (10)`, `Tests  49 passed (49)`, exit 0. It included
    `✓ src/fresh-clone.system.test.ts (1 test)` and `✓ src/daemon-entry-unchanged.system.test.ts (15 tests)`.
  - [Inferred] Run 1's error is host load, not the change.
  - At `c68fc5ca` there are 10 files and 49 tests. The lane's 9 and 48 are at `9d551887`. The extra file is
    `skipped-population.system.test.ts`, from #527, which is not in `9b539e5f`.
- [Observed] The no-egress alias is inert here. The driver's static closure (126 files) reaches neither `cap1-daemon`
  nor `http-host`, as at base for the existing `cap1-daemon` alias. The strace test that would use it was skipped on
  this host.

**3.5 Governed and tracked citations** (`tools/citations.py`, which uses two methods plus a wrapped-line pass):
- [Observed] Method 1 at head: `tracked files 4968; text files read 4964; files citing cap1-daemon/src/<name>: 70`.
- [Observed] Governed population: 1,345 files under `.syzygy/` and `openspec/`. Four of them cite four paths, and **all
  resolve**:
  - `IMPACT-LEDGER.md:333–334`: `routes-human.ts`, `routes-machine.ts`;
  - `OWNER-DIRECTION-MACHINE-CEILING-2026-10-15.md:37`: `server.ts`;
  - `POLARIS-RESPONSE-CEILING-READING-DECISION-PACKET.md:142`: `server.ts`;
  - `SECURITY-CONTRACT.md:151`: `credentials.ts`.
- [Observed] Method 2 (basename near `cap1-daemon`) finds no further governed mention. The wrapped-line pass finds 3
  joins, none governed.
- [Observed] One path that resolved at base no longer resolves at head: `cap1-daemon/src/credentials.test.ts`, cited by
  6 tracked files. Four of them are this PR's own evidence. The other two are historical, outside `.syzygy/` and
  `openspec/`:
  - `docs/evidence/cap1-credential-reuse-inspection-rule6-2026-10-03.json`. It names `"ranAtCommit":
    "c5d19304c995eb057f8cdd9f67480a1882620ea4"`, so it stays re-runnable at that commit (rule 11).
  - `docs/evidence/syzygy-bpyt-7-2/vitest-full.files.txt:85`, a log.
  No script or workflow reads either path (`git grep -F cap1-daemon` over `scripts/` and `.github/`: one workflow
  comment only).
- [Observed] Two governed locators now land in a shim (N8).
  - The packet's l.142–143 says "line 207" and "(line 255)". The shim has 82 lines. The cited bytes, `const expectedToken
    = provision.token;` and `const result = verifyCredential(expectedToken, credential);`, are at
    `http-host/src/server.ts:206` and `:254`. At base they were at `cap1-daemon/src/server.ts:207` and `:255`.
  - `emitNonSuccess` is at `http-host/src/server.ts:171`.
  - The bytes are reachable: the shim's header comment names `packages/http-host/src/server.ts`.
- [Observed] `python3 scripts/check_quotations.py` output is byte-identical at base and head (sha256 `2dc8a0f6…` both),
  exit 0.
- [Observed] `python3 scripts/check_governance.py`: `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`
  at both commits. The only line differences are the root and file counts, and the CG-2a examined count (2421 → 2423).

**3.6 The record** (`tools/check_record.py`, against git objects; `record.py` re-run):
- [Observed] The digests match the PR body:
  - `record.py` `b4dfd9659a1ea7e2c9e50d44b15b90738d62794a234e8150a7de48a44b9716fb`;
  - `summary.json` `d564386bead6367ea7a932fffa3a63e942be027c06d2d77e14192aa17cd4ddf2`;
  - the PR 524 `mut.py` `ca2b8eadc503305bb3767b7220b02775429164ef6c183ac9854acf9d8ed9b6a5`.
  - The tool digests equal `differential.json`'s `toolsSha256`.
- [Observed] `record.py <clone> --check` gives `summary.json matches ; problems: 0` (exit 0).
- [Observed] `record.py <clone> --selftest` gives `selftest: 26/26 mutations make a check fail` (exit 0).
- [Observed] `own-head.json`:
  - It ran at `9d55188734e5d7d315591a55daf3a7bb5970c5aa`.
  - It has 17 specs and 17 results, with the ids in the same order and each run's edits equal to its spec.
  - Each `old` occurs exactly once in its file at that commit.
  - Each outcome is `killed`, with `exit=1`, a failed count equal to its failed rows (from 1 to 9) and
    `cleanAfter: true`.
  - `problems 0`.
- [Observed] `m10-head.json`: `testedCommit` is `9d551887…`, the baseline is `Tests  29 passed (29)`, and 7 results all
  have `exitCode 1` with failing tests. `auth-order-bypass` targets `packages/http-host/src/server.ts`.
- [Observed] Titles, from my `vitest list --json` at `c104771f`/`c68fc5ca`:
  - `base titles 5273 distinct 5264 | head titles 5283 distinct 5274`;
  - `moved (same name) 26 | new 10 | removed 0`;
  - `MOVED 26 packages/cap1-daemon/src/credentials.test.ts -> ['packages/http-host/src/credentials.test.ts']`;
  - `duplicate keys base 3 head 3 equal True`.
  The ten NEW titles are the PR's ten. So `Tests: +10 ~0 -0` is confirmed. (On "9 duplicate keys", see N10.)
- [Observed] Battery (`tools/battery.py` runs the PROJECT-STATUS "How to verify this page" block one command at a time,
  in `mut`): `commit=c68fc5ca6ec99a08c118e112df362bfa8ab01070 commands=110 nonzero=0`, `clean after: True`.
  - Rule 4: of the 110 logs, the only `FAIL` text is the phrase "without FAIL" in `cmd-092`, and the only `Error:` text
    is in `cmd-001`. `cmd-001` is `check_governance.py`, whose result line is `0 FAIL`.
- [Observed] Every PR-body claim I checked agrees with the record and with my re-runs. That covers claims 1 to 9 of the
  brief, the 70/42 surface and the 11 gate paths. The exceptions are N1, N2, N3 and N10.

## 4. Findings

No blocking findings (F).

**N1 — The PR's "Every changed output: None" omits the POC's live walkthrough surface version.** Severity: low
(disclosure).
- Evidence [Observed]:
  - `walkthrough-inputs.ts:73–79` defines the version as a digest over the tree ids of `apps/three-surface-poc/src` and
    `packages/three-surface-poc-core/src`, "so it changes with any change to either tree".
  - This PR changes 15 files in the first tree.
  - The module's own `pwbSurfaceVersion` gives `polaris@aabeb05c809a` at `c104771f` and `polaris@8d82663ece26` at
    `c68fc5ca`.
  - The value is printed at POC start (`poc-main.ts:40`, "Walkthrough surface version:") and rendered on `/polaris` in
    `data-polaris-readiness-expected-surface` (`polaris.ts:923`) whenever readiness is evaluated.
  - The run-record path it binds to, `.syzygy/governance/records/PWB-WALKTHROUGH-001.md`, does not exist at `c68fc5ca`,
    so nothing bound goes stale.
- Precedent: `R-GP-IMPL-POC-APP-HYGIENE-1-RAW.md` item 4 treated the same effect as a disclosed note ("adds no new
  class of staleness").
- Why it is not REVISE [Inferred]: the version is an identity of the source trees, not an output computed from inputs.
  If it counted as a GP-Q0 "rendered byte", no POC `src` refactor would be possible, yet GP-Q0 l.51 admits refactors of
  `apps/**`.
- Failure scenario: an owner or a walkthrough session reads "no changed output" and expects the readiness binding to
  be the same after merge. It is not.
- Fix: add a row to the PR's "Every changed output" table and to the `syzygy-bpyt.10` owner notice: "live walkthrough
  surface version moves (any POC `src` change does); value at the merge commit". The landing value depends on main at
  merge.

**N2 — The bead's boilerplate outcome is delivered only for shutdown, and the PR does not say the rest was left out.**
Severity: low.
- Evidence [Observed]:
  - The bead's outcome is "the duplicated createDaemon/print/shutdown boilerplate in both main.ts files becomes one
    helper".
  - `closeOnSignal` replaces only the signal block (`apps/syzygy/src/main.ts:274–282`, `poc-main.ts:226–229`).
  - The `createDaemon` call, the start-failure line and the listening banner remain per app
    (`apps/syzygy/src/main.ts:248–272`, `poc-main.ts:189–222`).
  - The PR body says only that `closeOnSignal` is "the signal-to-close block both entry points held".
  - [Inferred] The remaining lines differ byte for byte: `syzygy daemon: failed to start (${kind}): ${detail}` against
    `syzygy POC: daemon did not start (${kind}: ${daemonStartDetail(...)})`, and two different banners. A shared helper
    would only take them as parameters.
- Failure scenario: the bead is closed as fully delivered, and the next audit finds the same duplication and files it
  again.
- Fix: one sentence in the PR body or bead close-reason that names what was left out and why, or a follow-up bead.

**N3 — The change record omits class 1. The owner notice should carry the class set and the gate ruling.**
Severity: low (classification).
- Evidence [Observed]: the PR declares "4 and 6 declared, with 3 possible". `authorizeStateWrite` moved, and
  `credentials.ts:23–26` calls it "the daemon's only write boundary".
- No extra check is owed. The GP-Q0 extras for class 1 equal those for classes 3 and 4, and they are present.
- Failure scenario: a later sweep of change records for class-1 PRs misses this one (CC-REV-1: "a misclassification is
  a findable violation").
- Fix: the cycle-report owner notice states classes **1, 3, 4, 6**. It also gives this review's stop-clause ruling on
  the gate prefix, so the owner can override it.

**N4 — The new shim-pin tests check names, not bindings.** Severity: low (test quality, new bytes).
- Evidence [Observed]:
  - R13 (`HANDLER_FAILURE_STATUS as UNKNOWN_ROUTE_STATUS` in `cap1-daemon/src/server.ts`) and R14 (dropping
    `type StateWriteRefusalName` from `cap1-daemon/src/credentials.ts`) both survive 571 tests.
  - `cap1-daemon/src/package.test.ts` pins `Object.keys(daemon).sort()` only.
  - No in-repo test or production code reads those constants through `cap1-daemon` (`git grep`). Tests use the literals
    404, 401 and 500, which is the right practice.
  - No in-repo code imports `StateWriteRefusalName` through `cap1-daemon`, so `tsc` passes R14 too.
  - Only the differential catches them (3.3).
- Failure scenario: a later edit to a shim aliases one name to another binding. Every test stays green, and an external
  consumer of `@syzygy/cap1-daemon` gets 500 where it expects 404.
- Fix (follow-up, test-only):
  - in `cap1-daemon/src/package.test.ts`, assert `daemon[name]` `toBe` `host[name]` for every name the host exports;
  - for types, either an `expectTypeOf` compile check of each re-exported type, or record that the differential's
    surface comparison is the type pin.

**N5 — The differential's `--selftest` has no mutant for `surfaceEqual`.** Severity: low (rule 6, evidence tool).
- Evidence [Observed]:
  - The four selftest mutants target `hostEqualThroughHttpHost`, `hostEqualThroughCap1Daemon`, `e2eEqual` and
    `onlyHostPathsDiffer`.
  - My probe shows `surfaceEqual` does detect a dropped type (R14 → `false`).
  - Its key is `[name, value, type]`, which excludes `declaredIn`, so a swapped binding (R13) leaves `surfaceEqual` true.
    Only the host comparison catches that, and only for the constants it records.
- Failure scenario: a later reuse of `differential.py` trusts `surfaceEqual` against a binding swap.
- Fix: in a later evidence round, add a fifth selftest mutant (a source edit dropping a shim type re-export) and state
  the swap limit in the docstring. Do not edit this PR's frozen evidence.

**N6 — Pre-existing test gaps in byte-identical moved code and an unchanged POC file.** Severity: low; not caused by 7.3.
The bead required the tests to stay unchanged. Evidence [Observed]:
- **R3**: widening the Bearer pattern so that `Bearer  <token>` (double space) is admitted survives at head (571) and at
  base (561). The differential's auth form 4 would catch it; the tests do not.
- **R8**: dropping `'project shape not-admitted'` from `safeResponseDiagnostic`'s allow-list survives at both commits.
- **R18**: POC `browserRequestAllowed` with `startsWith`, which would admit an origin such as `http://127.0.0.1:74789`
  for host `127.0.0.1:7478`, survives at both commits.
- **R19**: `isWithin` without `path.sep` survives at head. A candidate `../<state-dir-basename>-x/f` would be authorized.
  [Inferred] It survives at base, since the code and test are blob-identical. Neither the differential's 11 write
  candidates nor any test probes a sibling prefix.

Failure scenario: a future edit to the credential parser, the write boundary, the breach diagnostic or the origin check
widens admission or writes, and CI stays green.

Fix: one follow-up test-only bead that adds four rows:
- `credentialFromAuthorizationHeader('Bearer  x')` → token `' x'`, and `verifyCredential` refuses it;
- `authorizeStateWrite(root, '../' + basename(root) + '-x/f')` → `refusedBy: 'traversal'`;
- a breach line with population `project shape not-admitted` keeps `reason: 'response-limit-breached'` and its
  population;
- `browserRequestAllowed({ host: '127.0.0.1:7478', origin: 'http://127.0.0.1:74789' })` → `false`.

**N7 — The new gate row pins one path.** Severity: low (test quality, new bytes).
- Evidence [Observed]: R17 (prefix narrowed to `'packages/http-host/src/'`) survives 35 tests. Under it, a dirty
  `packages/http-host/package.json` would be accepted, and that file's `exports` map decides what the POC loads.
- The base `cap1-daemon` row has the same shape: `git-observation.test.ts:108–110` pins only `src/server.ts`.
- Fix: add `expect(pocObserverInputsAreClean({ changedPaths: ['packages/http-host/package.json'] })).toBe(false)` to the
  new row.

**N8 — Three governed citations now name a shim, two of them by line or function.** Severity: informational.
- Evidence [Observed], section 3.5:
  - `POLARIS-RESPONSE-CEILING-READING-DECISION-PACKET.md:142–143` (lines 207 and 255 lie beyond the shim's 82);
  - `OWNER-DIRECTION-MACHINE-CEILING-2026-10-15.md:37` (`emitNonSuccess` is not in the shim);
  - `SECURITY-CONTRACT.md:151` (it names `credentials.ts` as the "Relevant source", now a re-export).
- The packet has 1 digest citer and `SECURITY-CONTRACT.md` has 15, so neither may be edited here.
- Bead guardrail 3 prescribes exactly this remedy ("Keep the path (thin re-export or shim)"). The shim headers route to
  `packages/http-host/src/`. This is not a resolution failure.
- Fix: record the mapping (207 → `http-host/src/server.ts:206`, 255 → `:254`, `emitNonSuccess` → `:171`,
  `credentials.ts` → `http-host/src/credentials.ts`) in this round's dispositions record. Update the governed files
  only through their own successor process, if the owner ever wants to.

**N9 — The moved `server.ts` keeps its Capability 1 header comment.** Severity: low (docs).
- Evidence [Observed]: `http-host/src/server.ts:11–29` still says "this wave mounts only the minimal root route" and
  frames the file as "CAP1-REQ-012's admission". The root route now lives in `cap1-daemon`.
- The lane discloses this as a residual.
- Fix: a later comment-only change in `http-host`. [Inferred] It moves no served byte. It does not move the PWB
  surface version either, because `packages/http-host/src` is not one of the two trees that version hashes.

**N10 — "The 9 parametrized duplicate keys" counts surplus rows, not keys.** Severity: trivial.
- Evidence [Observed]: `titles.json` `duplicates` lists 3 keys, occurring 7, 3 and 2 times, so 9 rows are surplus.
  `duplicateKeys: 9` therefore counts rows.
- Fix: say "3 keys listed 12 times (9 surplus rows)" wherever the figure is reused.

**N11 — The full-suite and system figures are at different commits.** Severity: informational.
- Evidence [Observed]: the PR's system figures (9 files, 48 tests) and Vitest figures are at the code commit
  `9d551887`. At the reviewed merge `c68fc5ca` they are 10 files and 49 tests (system), and 241 files with 5,283 passed
  and 5 skipped (Vitest).
- Both are correct for their commits.
- Fix: none needed. The dispositions record should cite the reviewed-commit figures.

**N12 — POC tests still reach the host through `@syzygy/cap1-daemon`.** Severity: informational; disclosed by the lane.
- Evidence [Observed]: 13 POC test files import `@syzygy/cap1-daemon`, and 0 POC production files do. That is why
  `apps/three-surface-poc/package.json:13` and its tsconfig keep the `cap1-daemon` edge.
- Fix: a later test-only change, if wanted, can retarget those imports to `@syzygy/http-host` and drop the edge.

## 5. Every changed output

| Surface | Base `c104771f` vs head `c68fc5ca` | Evidence |
|---|---|---|
| CAP1 daemon: every status, header, body, stdout and stderr line, and exit, over 3 fixtures × 24 requests, 3 signal sets and 3 refused invocations | **Byte-equal** | [Observed] e2e records `ddbb9620…` both |
| Host answers to 1,296 requests, 3 start failures and 18 credential groups, through `cap1-daemon` | **Equal** | [Observed] `2c4e8c40…` both |
| The same, through `@syzygy/http-host` at head | **Equal** under the differential's `host()` key | [Observed] `hostEqualThroughHttpHost: true` |
| `cap1-daemon` barrel and the cited shims (names, value and type kinds) | **Equal**: 70 names, 42 values | [Observed] |
| POC observer-input gate | 11 paths under `packages/http-host/` go from accepted to refused; none exists at base | [Observed]; ruled in section 2 |
| POC live walkthrough surface version | **Changes**: `polaris@aabeb05c809a` → `polaris@8d82663ece26`. Undisclosed | [Observed]; N1 |
| POC served pages and machine JSON | [Inferred] unchanged apart from the surface version. The same function objects are imported. The POC's own route modules change only their import line. Not measured end to end ([Unknown]: live repository only) | 3.1 |
| Prose: `SECURITY.md` listener line, and the `AGENTS.md` Vitest guardrail | Changed, and accurate | [Observed] |
| Governed files (`.syzygy/`, `openspec/`) | 0 changed | [Observed] |
| Signed or digest-bound artifacts | None touched. `check_governance` and `check_quotations` match base | [Observed] |

## 6. Verdict per acceptance criterion

1. **"@syzygy/http-host exists; apps import the host from it; cap1-daemon depends on it": met.**
   - [Observed] The package exists with its manifest, tsconfig and project.
   - `apps/syzygy/src/main.ts:39` imports `closeOnSignal, createDaemon` from `@syzygy/http-host`.
   - 13 POC production files import from `@syzygy/http-host`, and 0 import `@syzygy/cap1-daemon`.
   - The `cap1-daemon` `package.json`, tsconfig reference and lock entry all name it.
   - The boilerplate helper exists only for shutdown (N2).
2. **"Credential, origin and ceiling tests unchanged and green; system tests green": met.**
   - [Observed] 88 of 252 base test files match the regex. At `c104771f` the population is 252; at `9b539e5f` it is
     251, with the same 88. All 88 are the same blob at head, one of them by an R100 rename.
   - They are green dist-absent, and the system run is green (10 files and 49 tests on re-run, after one load-induced
     worker timeout).
3. **"Cited paths still resolve (re-exports listed)": met.**
   - [Observed] 4 governed files cite 4 paths, and all resolve.
   - The shims re-export every base name (17 and 14), and the PR body lists them.
   - Two locators now land in a shim, as the bead prescribes (N8).

## 7. Test quality

The bar is `.claude/skills/th-engineering/subskills/test-rigor/SKILL.md` at `c68fc5ca`:
- l.42–43: "**A test is worth keeping only if some plausible bug makes it fail.**"
- l.60–63: "**Edge and failure paths are first-class** — … error branches … get tests proportional to blast radius."
- l.66–67: "Expected values are literals or independently derived."
- l.93–95: "**Growth is governed** — A test is worth *adding* only if it catches a plausible bug no existing test catches".
- l.102–103: "apply the mutation thought-experiment: name a one-line bug in the code under test this test would *not*
  catch but should."

- **`http-host/src/shutdown.test.ts` (6 new) meets the bar.**
  - It asserts whole event sequences as literals.
  - It covers the failure path ("tells a failed close to closeFailed and still resolves"), the quiet path, repeat
    signals and "stays pending".
  - It kills S1–S6 (lane) and R11 (mine). Each test pins a behavior a plausible bug breaks (l.42).
- **The two new `package.test.ts` rows meet l.66–67** (hard-coded name lists), but **fail the l.102–103 thought
  experiment for binding swaps** (R13, R14, N4).
- **The new `git-observation` row** kills the prefix removal (R16), but not a narrowing (R17, N7).
- **The moved `credentials.test.ts` (26) is unchanged, as the bead requires.** Its pre-existing gaps (R3, R19) and
  those near it (R8, R18) are N6. They count against l.60–63 for a credential and write boundary, whose blast radius is
  the whole security surface. They are not this PR's to fix.
- **Net delta: `+10 ~0 -0`.** Every new test pins new code (`closeOnSignal`, the new barrel, the new prefix), so l.93
  is satisfied.
- Mutants on the moved and edited host: 12 of my 19 are killed and 7 survive (R3, R8, R13, R14, R17, R18, R19). All the RFC5-3-critical ones are killed, in both apps'
  test suites:
  - R4 (loopback admits);
  - R5 (class skip);
  - R6 (handler before admission);
  - R10 (bind all interfaces);
  - R1 and R2 (token comparison and scheme).

## 8. Cleanup

Deleted:
- the clones `rev-529/clone`, `rev-529/base`, `rev-529/mut`, `rev-529/merged` and `rev-529/bpoc`;
- the TMPDIRs `/tmp/r529-1`, `/tmp/r529-2`, `/tmp/r529-3`, `/tmp/r529-4` and `/tmp/r529-5`. `ls -d /tmp/r529-*`
  reports none;
- the redundant large results: my five e2e and host records, whose digests are kept in `diff-out-records.sha256` and
  are identical to the committed ones, and `vitest-full-nodist.json` (2 MB).

Nothing outside my own paths was touched.

Kept, under `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-529/`. No
file is over 300 KB.

Tools:
- `51ac8b810fa5562beed363a75c87322816ebd74adc110987a1fe0166e6064687  tools/battery.py`
- `047901a52be0edbc6d7a8a43d11dcf81e8c663d63c31629e9c1fd11c49898573  tools/check_record.py`
- `9a318935182df3d044131b14a933175c0153a5e69b7d17c0882830bd3404c342  tools/citations.py`
- `949a5abc8ef87c76b99399b2a08aee4d22da46806412229cee8c2ebb21f3163c  tools/cleanup_check.py`
  - This checks that this section lists every kept file at its current digest. Its last run gave
    `kept 44 listed 47 missing-or-stale 0 listed-but-absent 3`. The 3 extra listed matches are the three digest lines
    quoted in section 1, not kept files. The raw itself is excluded from `kept`.
- `59c8656967da66c776f18aa315b67feb084248f96e673d5cefbd65a9c7b875ce  tools/closure.py`
- `8d561ed1dd8d6181f8cef2a3f8e23c298d3b2910ed31d8a90ce2d7cd03797022  tools/count401.py`
- `b24f2eb47b90fceedbb29c1d09498edc2177edd3bced2187108e659d1e7c7c5f  tools/diff_probe.py`
- `34c228be847d9175c395efa4f5cf889df21337137486b658a7df08ba6e24549a  tools/identity.py`
- `31f0579ac464173e81e2d8f9ca3713c4f6f4574dcd74c1169aa95db9c8865830  tools/mutants.py`
  - R19 was appended, and the `failedTitles` cap of 6 was removed after the R1–R18 run. R1–R18 are byte-identical in
    the list. `own-mutants.json` was written with the cap.
- `a7fa2f9090f8c4a3812ff737cbc7f768bd678d843ab5e2f8d5d45e302923ff31  tools/mutants_base.py`
  - This is `mutants.py` with the base paths and base test list, generated by `sed`, before both edits.
- `9068e337ca28296f394a4bd05038978dcf4551e6ba22df138774aed55345e2e7  tools/testset.py`
- `9816451a9da05c514f8efedd8dc909b6307fb474a9ced457bbf692ae4ff11b34  tools/titles.py`

Results:
- `592b540b96497e99ad82117c0d86b7d6051cc15337046d1617d3d1ff3d1e060e  base-mutants.json`
- `25cb61d86095465e8d60863989ff69eb5371790070b2a1224e73d65d5f99c9e3  battery-mut.txt`
- `9b68640d2cf6990272de03aca4784104b8ba8cb52228a2478bdf55b0c9e2a8ae  battery-status.txt`
- `e2a904e3cd3bc75a6fb41f7af41fef088c429040368eb18f1fff4522010c0390  build-base.log`
- `a9e49f4381fbac724a460078852829d55745add9918ef22915e532bed82976f2  build-head.log`
- `a3a72a9f242cf7fd8cb0fef6262ab771df10d5dba5580ac943e355c80cae7660  build-poc.log`
- `a444e7c0782887c5ab6d6629d8e00b1babbf9f4c142412787148f65bfd894d57  check-record.txt`
- `6bfad5646478c56f8374be49dcba5ab5ba0c4a060ae0aca496450d2e367312c6  citations-base.txt`
- `976da6f4e8cdb9933dbb7c9d84cad17f1671e395d2d3241532699195ab652ab2  citations-head.txt`
- `688383c53a5fd727ef718b0e296f7a3a2c6fa60ced487a3725d6eba98bf2502b  diff-out-records.sha256`
- `76b8b7ef9de4ae9cc47f10d0f2443f02971d92c15ce6903e65ddab03cbce7969  diff-out/differential.json`
- `f7244fb7dc411c8c22c0ab499a8af9dfa8f6dca8bf13c47de520fe2e52423b90  diff-out/surface-base.json`
- `fa2ae91d552ba6696c11e24263ae5788f03099e6b18ba09a223e6a64ccd13215  diff-out/surface-head.json`
- `828346d6197bf26f3c639ff0cecc54123024a308d61081c5aad2afb7c2bfa2cb  diff-probe.json`
- `6c9295cf190da9ec1ef887dfa1ff35d27799cd390403649dedf3825fd5b99fc5  diff-run.log`
- `d22f6dbf6f13e8e4b8ab92953b08ca1c0d70a5c4d92aa9fdea11831479ddff74  gov-base.log`
- `d3891b091fc50156765d3c951f361e63f5e2db4c90fb5147729462c9e97e4e2a  gov-head.log`
- `337e6149f191e79ca9ccc9b44dd95b8f709dc42a0b2e1a775e84744cec28c485  npmci-base.log`
- `4dfec5d6248be4b972cbb2f80083009f73a0c7a78458eadd5fc81ee408efc5f6  npmci-head.log`
- `1c04077776ffdbe9dfc9e76a83f7b43cdefe84d7e4031956776e53e0f33c9fa1  own-mutants-r19.json`
- `7dccb84dec07c9319691022dd9853b40fe35d112352d3f72de88bcc5b0d71535  own-mutants-r4-full.json`
- `c834e24c7de670bc5c8d3145d3ac9a485a5c890b2118426b94b7d934d5218013  own-mutants.json`
- `33e8954694801387f14b19c364888118bfc91c188e75a868d5996eb25f939189  own-mutants.log`
- `2dc8a0f68b6dc1694ed4071b5137cf01969742e88efe5792c07e0fbd752c2269  quot-base.log`
- `2dc8a0f68b6dc1694ed4071b5137cf01969742e88efe5792c07e0fbd752c2269  quot-head.log`
- `37010024b02efb27cc2264ce7b9b1d1f8c3dca3cbb7522087d08a3faa9a4e7a5  system-head-2.log`
- `98af638e3f87e295eed3cca664c22749bc592cdbb6f2a616a6aeeab2c55f7b6f  system-head.log`
- `92ba1a0077ca0c10fd77f5872fe26b9225bfa70541221d10ed6a6a5d8d6180b7  testset-88.txt`
- `86e8f3b4e9eec6a767489be285527e99eef3074165f2b36b7fcee0d099c7e53a  titles-r529.txt`
- `0f206c9bd73b968c1a7212f9b1604f31ac20a0b46101c3dd472d3ad0f6e4950f  typecheck-mut.log`
- `3ffeda7882ed5b3e439a94698931169787562dd9f2e2fae8ffa187bde5bea3ae  vitest-full-nodist-summary.txt`
- `131fba8644f2ec33e76157159f552ab2b0df1a5c87b830d4ae367ea4a5e05f90  vitest-full-nodist.log`
