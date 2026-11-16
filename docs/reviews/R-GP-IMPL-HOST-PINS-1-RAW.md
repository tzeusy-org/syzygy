# R-GP-IMPL-HOST-PINS-1 — CC-REV-1 implementation review of syzygy-bpyt.7.14, round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 9ebfa92d
Subject: r1-review.diff sha256 80823c20dfcf83c4ac000b6fd598350a41337581f104c224014e78a63aebb6e6

Reviewer: rev-535, an independent fresh-context reviewer. I did not author this change and did not change it.
Date: 2026-10-27. Brief: `lead/b714/brief-r1.md` in the session scratchpad.

Verdict basis: no blocking finding (F) and ten notes (N1–N10).
- [Observed] Every target is killed by a new row: R3, R8, R13, R17, R18 and R19 under Vitest, and R14 under
  `npm run typecheck`. Each survives at base. I re-ran all 19 of the PR 529 reviewer's mutants at head, the seven
  targets at base, the lane's 17 Vitest mutants and 15 type mutants at both commits, and 17 mutants of my own
  (15 Vitest, 2 type-level).
- [Observed] No product byte changes. [Inferred] So every new row encodes what the base code already does, and no row
  changes what a gate accepts or refuses. The three flagged additions are within the bead's fix direction.
- The notes are:
  - two record and disclosure corrections (N1, N2);
  - five pre-existing test gaps on the pinned predicates, found by my own mutants, none of them a bead row
    (N3–N7);
  - one residual-list addition (N8);
  - one out-of-subject gap on current main, which arrived with PR 530 (N9);
  - the owner notice still to post (N10).

## 1. Subject identity checks

All by script (`tools/identity.py`, output `identity.txt`) against the git objects of a clone of
`/home/tze/GitHub/syzygy`, plus `refs/heads/agent/syzygy-bpyt.7.14` and `main` fetched from GitHub.

| Check | Result |
|---|---|
| Subject file sha256 | `80823c20dfcf83c4ac000b6fd598350a41337581f104c224014e78a63aebb6e6` [Observed]. **Matches** the brief |
| `git diff 546f1ff0 9ebfa92d` sha256 | `80823c20…` (the same), and byte-equal to the subject file: `True`. `31 files changed, 5874 insertions(+), 2 deletions(-)` [Observed] |
| `git diff 546f1ff0 01df68ea` sha256 | `cf8756c6b3cebc47b11509ae7dc1f4d039c702c54a3df4510e2338a9936d6aa1`. **Matches** the brief. `5 files changed, 155 insertions(+), 2 deletions(-)` [Observed] |
| Commit chain | `9ebfa92d^` = `01df68ea`, and `01df68ea^` = `546f1ff0` = `merge-base(9ebfa92d, main)` [Observed] |
| GitHub PR 535 | state `OPEN`, `headRefOid` `9ebfa92d301de633b7c40a3f2276219330016d33`, base `main` [Observed] |
| Code diff files | 5 test files and 0 non-test files: `browser-origin.test.ts` (new) and `git-observation.test.ts` in `apps/three-surface-poc/src`, `package.test.ts` and `server.test.ts` in `packages/cap1-daemon/src`, and `packages/http-host/src/credentials.test.ts` [Observed] |
| Evidence commit | 26 paths, all under `docs/evidence/syzygy-bpyt-7-14/` [Observed] |
| Frozen PR 529 evidence | 0 subject paths under `docs/evidence/syzygy-bpyt-7-3/` or `docs/evidence/http-host-review-2026-10-27/` [Observed] |
| Hosted CI at `9ebfa92d` | `node-ci` run `40437392101`, event `pull_request`, conclusion `success`. Steps `build (npm run build)`, `typecheck (npm run typecheck)` and `unit + conformance tests (npm test)` all `success`. `checks` passes too [Observed] |

**Main moved while I worked.** At the end, main is `f7477f52` on GitHub. Its first-parent merges since `546f1ff0` are
`fe38336e` (#522), `e5080f4d` (#531) and `f7477f52` (#530, `syzygy-bpyt.6.3`, the new `@syzygy/support` package).
- [Observed] 451 paths changed on main since `546f1ff0`. **None is a subject path** (overlap with the 31 subject
  paths: `[]`).
- [Observed] Main's code changes include product files that the subject's tests import or neighbour, for example
  `apps/three-surface-poc/src/git-observation.ts` (an import moved to `@syzygy/support`), `vitest.config.ts`,
  `package.json` and `package-lock.json`. The full list is in `identity.txt`.
- [Observed] So I trial-merged. `git merge-tree --write-tree f7477f52 9ebfa92d` exits 0 with no conflict. In a local
  worktree of that merge (never pushed, since deleted), after `npm ci`, the five changed files pass
  `Tests  68 passed (68)` and `npm run typecheck` exits 0 with 0 `error TS` lines.
- My results below are for `9ebfa92d` (rule 7). The trial merge is a smoke check of the landing tree, not a re-run of
  the battery there.

## 2. Clauses relied on, and the class ruling

**CC-REV-1** (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md` at `9ebfa92d`):
- l.18–20: "Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the
  agent performing the change never finally decides which classes it touches."
- l.31–32: "1. **authority boundaries** — write-universe, typed-authority table, adapter authorization (VIS-5, VIS-6);"
- l.35–36: "3. **deterministic observation** — snapshot composition, evaluation identity, the deterministic/inferred
  seam (VIS-7);"
- l.37: "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
- l.40–41: "6. **public interface** — machine-queryable endpoints, adapter contracts, anything an external consumer can
  depend on;"
- l.45–47: "**Class membership is contested by default and is never finally determined by the agent performing the
  change**". l.51: "**A reviewer or the owner** may reclassify at any time."

**GP-Q0** (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md` at `9ebfa92d`):
- l.51: "Behavior-preserving refactors may proceed under the acts already in force. They may touch `apps/**`,
  `packages/**`, `scripts/**`, tests, CI and root manifests."
- l.52–55: `"Behavior-preserving" means none of the following changes:` then "a rendered byte, a wire format, a refusal
  string or an exit code;", "a signed or digest-bound artifact;" and "a consent, security or retention decision."
- l.62–66: the further checks apply to "pull requests touching class 1 (authority boundaries), class 3 (deterministic
  observation) or class 4 (security)". They are "an old-versus-new differential over a mutated-record corpus that
  includes records with altered prose; a rule-6 mutant for each predicate; a non-blocking owner notice in the cycle
  report."
- l.95–96: "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."

**The test-rigor bar** (`.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`, read by
`git show 9ebfa92d:<path>`):
- l.42: "**A test is worth keeping only if some plausible bug makes it fail.**"
- l.64–67 (bar 4): "A test that mirrors the implementation's logic to compute its expected value … verifies nothing.
  Expected values are literals or independently derived."
- l.78–81 (bar 6): "A test that fails intermittently is worse than no test … never retry-until-green."
- l.82–84 (bar 7): "Test names state expected behavior … A maintainer should localize the bug from failure output
  alone."
- l.93–97 (bar 10): "A test is worth *adding* only if it catches a plausible bug no existing test catches … Reviews
  state the net test delta; adds-only growth in a mature area is a finding".

**AGENTS.md verification rules** at `9ebfa92d`: rule 6 ("Mutate the input and confirm the check fails, per predicate,
before trusting it"), rule 9 ("A claim of absence needs a sweep with a denominator") and rule 11 ("An evidence record
names its subject and the subject's digest").

### Class ruling (mine)

| Class | Ruling | Why |
|---|---|---|
| 1 authority boundaries | **Touched** | `authorizeStateWrite` is the daemon's one write home (`packages/http-host/src/credentials.ts:22-25`: every write "is routed through `authorizeStateWrite` — the daemon's only write boundary"). It is the write-universe. A change to the tests that pin it changes the assurance on that boundary |
| 3 deterministic observation | **Touched** | `pocObserverInputsAreClean` is the POC's startup refusal. `poc-main.ts:136` throws `dirtyRefusal` when the observer checkout's inputs are dirty, which keeps the recorded observer revision honest about the code that served. The extended gate row pins which paths count as observer inputs. I rule the class touched (l.45–47), as the lane offered |
| 4 security | **Touched** | Bearer admission (`credentialFromAuthorizationHeader`, `verifyCredential`), the browser-origin check and the content-blind breach log are auth surfaces and a disclosure path |
| 6 public interface | **Not touched** | `@syzygy/cap1-daemon` is a private workspace package (`"private": true`) with in-repo consumers only. The change adds and removes no export and no endpoint. It pins the barrel's surface; it does not change it |
| 2, 5, 7 | Not touched | No identity minting, no `.syzygy/**` schema, no certificates |

**GP-Q0's further checks** apply, because classes 1, 3 and 4 are touched:
- **Differential.** None was run. [Observed] The product files are byte-identical between `546f1ff0` and `01df68ea`,
  since the code diff names five `*.test.ts` files only. So an old-versus-new differential would run the same product
  code twice. I accept "identical by construction" as discharging it for a test-only subject. The one output that does
  move, the POC surface version, comes from the test files themselves and is disclosed (section 5).
- **A rule-6 mutant per predicate.** Done; see sections 3 and 6.
- **The owner notice** on `syzygy-bpyt.10` is not yet posted (N10).

### The three flagged additions

- **The rows pin existing behaviour.** [Observed] The product bytes are identical at base and head, and every new row
  passes at head (11 of 11 runs, section 7). [Inferred, from those two Observed facts] So each row's expected outcome
  is exactly what the base code does.
- **None is a gate change.** A row that pins existing behaviour is not a change "to what a gate accepts or refuses"
  (l.95–96). The gate's code, its inputs and its decisions are unchanged. The row only makes a future change to them
  fail a test.
- **Each is within the bead's fix direction.** The bead asks for test-only rows, each with a "recorded rule-6 run: its
  mutant survives at base and is killed at head". Each addition pins another face of a predicate the bead names, and
  each has its own such run, which I reproduced:

| Addition | Predicate it pins | Its own mutant: base, then head (lane, then mine) | Gate change? |
|---|---|---|---|
| Symlink-to-sibling row (`credentials.test.ts:326-339`) | `isWithin`'s second caller, the real-location check (`credentials.ts:137`). R19 mutates `isWithin` itself, so both callers are in R19's scope | O7: survived, then killed by this row alone; mine the same | No: the base code returns `symlink-escape`, and so does head |
| Unlisted-reason withholding (inside the R8 row, `server.test.ts:124-169`) | The allow-list's withheld arm (`server.ts:157`) | O10 and O11: survived, then killed by this row alone; mine the same | No: the base code already logs `route-non-success` without the diagnostic |
| Shorter-origin rows (`browser-origin.test.ts:22-26`) | `origin === expectedOrigin(host)` (`browser-origin.ts:37`), the reverse prefix | O12: survived, then killed by this row alone; mine the same | No: the base code already refuses them |

[Observed] PR 528 and PR 531's reviews ruled a fail-closed refusal in a test guard, named in the PR, "within the bead's fix
direction, not a gate change under `:95-96`" (`docs/reviews/R-GP-IMPL-ARGV-FAIL-CLOSED-1-RAW.md:137`,
`docs/reviews/R-GP-IMPL-GUARD-PINS-1-RAW.md:66`, on main). The case here is weaker than that, because nothing the code
does changes at all.

## 3. What I ran, and the results

Work tree: a fresh clone in my scratch directory, with `npm ci` (116 packages). Base `546f1ff0` and head `9ebfa92d` were
separate clones. Every Vitest and tsc run used a private `/tmp/r535-<n>` TMPDIR, all since deleted. The tree was
asserted clean after every mutant. The host's one-minute load was 26–62 throughout.

### 3.1 The record, against git objects (rules 6 and 11)

- `record.py . --check` gives `summary.json matches ; problems: 0`. `record.py . --selftest` gives
  `selftest: 26/26 mutations make a check fail` (`record-check.txt`).
- My own checker, `tools/check_record.py`, reads every record from the `9ebfa92d` git objects and gives
  `problems 0` (`check-record.txt`). It checks:
  - each run's commit;
  - each `old` occurring exactly once in its file at that commit;
  - each outcome agreeing with its exit code and failed rows;
  - a clean tree after each run;
  - each PR 529 reviewer row equalling that tool's `MUTANTS` as written at `546f1ff0`.

  Its populations: 7 + 12 + 19 reviewer rows, 17 + 17 own rows, 1 O5 rerun, and 15 + 15 type rows with both controls
  at `[0, 0]`.
- Tool digests [Observed]:
  - the PR 529 reviewer's `mutants.py`, `31f0579ac464173e81e2d8f9ca3713c4f6f4574dcd74c1169aa95db9c8865830`. My copy is
    byte-equal;
  - the lane's `tsc_mutants.py`, `796dea4618415bfbfb72cc33da0db0fb2c1ba13f27de2be4dd6b01f37eeec7de`;
  - `mut.py`, `ca2b8eadc503305bb3767b7220b02775429164ef6c183ac9854acf9d8ed9b6a5` (from the record's `toolSha256`; I did
    not use it).

### 3.2 The PR 529 reviewer's mutants, with their own tool and specs

| Run | Result (verbatim tool summary) |
|---|---|
| The seven targets at base (`r529-targets-base.log`) | `killed 0 survived 7 error 0 of 7`. Each `survived exit=0 failed=0/571` (R17: `/35`) |
| All 19 at head (`r529-all-head.log`) | `killed 18 survived 1 error 0 of 19`. `R14-credentials-shim-drops-a-type: survived exit=0 failed=0/580` |

At head, my failed titles equal the lane's `r529-head.json` for 17 of the 19. The two differences are R4 and R6, and
they are N1.

### 3.3 Type mutants under `npm run typecheck`, with unmutated controls

| Run | Result |
|---|---|
| The lane's 15 plus my 2 at base (`tsc-base-rerun.log`) | `controls [0, 0] killed 7 survived 10`. The lane's 15 give the same 8 survivors as its record: `CredentialInspection`, `CredentialProvision`, `CredentialStat`, `StateWriteAuthorization`, `StateWriteRefusalName` (R14), `CredentialClass`, `RouteRequest` and the `CredentialStat` swap. Mine are TT1 and TT2 |
| The same 17 at head (`tsc-head-rerun.log`) | `controls [0, 0] killed 16 survived 1`. Each of the lane's 15 is killed with exactly one error at `packages/cap1-daemon/src/package.test.ts`, for example `(72,25): error TS2724` for R14. TT2 is killed in the pin, `(73,58): error TS2344`. TT1 survives |
| R14 with every `dist/` deleted first, a non-incremental check | base: `exit 0`, 0 `error TS` (`r14-base-fresh.log`). Head: `exit 2`, `packages/cap1-daemon/src/package.test.ts(72,25): error TS2724` (`r14-head-fresh.log`) |
| Unmutated `npm run typecheck` at head, fresh | `exit 0` (`tc-head-1.log`). The head controls ran at 30.2 s (fresh) and 4.4 s |

[Observed] `tsc -p packages/cap1-daemon --listFilesOnly` resolves the self-import `@syzygy/cap1-daemon` in
`package.test.ts` to `packages/cap1-daemon/src/*.ts`, not to `dist`. So the pin sees a shim edit on the same build.

### 3.4 The lane's own 17 Vitest mutants, re-run with my runner

`tools/rev535_mut.py` read the lane's `own-specs.json` from the git object:
- base: `killed 3 survived 14 error 0 of 17`;
- head: `killed 16 survived 1 error 0 of 17`.

Every outcome equals the lane's record at both commits. At head, each kill of O1–O7, O9–O12, O15 and O16 fails exactly
the new row the record names. O8 also fails a pre-existing `response-limits` row. O5 failed one row with 0 timeouts,
which matches the lane's rerun. O17 survives at both commits.

### 3.5 My own mutants

Run over the PR 529 reviewer's `HOST` file list, with the specs from `tools/rev535_specs.py` and the runner
`tools/rev535_mut.py`.
- Each `old` was asserted once at both commits. An unmutated `CONTROL` ran first, `survived exit=0` at both commits.
- None of these fragments is one that `mutants.py` or the lane's `own_specs.py` writes.

| Id | File: `old` → `new` | Base | Head (killing row) |
|---|---|---|---|
| V1 | `credentials.ts:381` `return timingSafeEqual(a, b);` → `return presented === expected;` | survived | **survived** (N4, N8) |
| V2 | `credentials.ts:366` `/^Bearer (.+)$/` → `/^\s*Bearer (.+)$/` | survived | **survived** (N4) |
| V3 | the same line → `/^Bearer (\S+)/` | survived | killed: "the minted token behind any other whitespace refuses, named" |
| V4 | `credentials.ts:86` `isWithin` compared after `toLowerCase()` on both sides | survived | **survived** (N3) |
| V5 | `credentials.ts:119` `isWithin(root, resolved)` → `isWithin(root, root + path.sep + candidatePath)` (compare before normalising) | killed (existing traversal row) | killed: the existing traversal row and "refuses a sibling directory … as traversal" |
| V6 | `browser-origin.ts:37` `===` → `origin.endsWith(expectedOrigin(host))` | survived | **survived** (N5) |
| V7 | the same line compared after `toLowerCase()` | survived | **survived** (N5) |
| V8 | `browser-origin.ts:32` the host lower-cased before the loopback regex and the tailnet comparison | survived | **survived** (N5) |
| V9 | `server.ts:188` a withheld diagnostic gains `hint: reason.slice(-1)`, which leaks one character | survived | killed: "logs a 503 breach diagnostic … withholds an unlisted one" |
| V10 | `server.ts:157` `.includes(population.reason)` → `.includes(population.reason.toLowerCase())` | survived | **survived** (N7) |
| V11 | `git-observation.ts:184` `'packages/http-host/'` → `'packages/http-host'` (no trailing slash) | survived | survived. This fails closed: it over-protects `packages/http-host*` siblings. No action |
| V12 | the same line → `'packages/http-host/src/'` plus `'packages/http-host/package.json'` | survived | **survived** (N6) |
| V13 | `cap1-daemon/src/server.ts`: drop the `REFUSAL_BODY` re-export and add a local copy of the same object | survived | killed: "re-exports each host value as the host binding of the same name" |
| V14 | `git-observation.ts` `'packages/cap1-daemon/'` → `'packages/cap1-daemon/src/'`, over `git-observation.test.ts` and `main.test.ts` | — | **survived** (N6) |
| V15 | `'packages/three-surface-poc-core/'` → `…/src/`, over the same files | — | **survived** (N6) |
| TT1 | `cap1-daemon/src/server.ts`: drop `type CredentialClass` and declare a local `'human-open' \| 'machine-credentialed'` | survived | **survived** under typecheck (N8) |
| TT2 | the same, with a local `string` | survived | killed under typecheck by the type pin |

Totals over my 17:
- V1–V13 (13): base 1 killed and 12 survived; head 4 killed and 9 survived;
- V14 and V15: run at head only, both survived;
- TT1 and TT2: both survived at base; at head 1 killed and 1 survived.

**None of my survivors is a bead row, and none is named as a residual by the PR.**

### 3.6 Repeats, the dist-absent run, titles and battery

- **Five changed files, sequential** (`repeat-seq.json`): 5 of 5 `Tests  68 passed (68)`, at load 25.8–28.2.
- **Five changed files, three runs at a time** (`repeat-par.json`): 6 of 6 `Tests  68 passed (68)`, at load 26.1–26.4.
  Each run's private TMPDIR held only `node-compile-cache` afterwards (11 of 11), so no new row leaves a directory
  behind.
- **The affected projects with every `dist/` absent** (`nodist-run.log`): `dist dirs before: 0`. The command was
  `npx vitest run --project @syzygy/http-host --project @syzygy/cap1-daemon --project @syzygy/three-surface-poc-app`.
  Results:
  - `Test Files  100 passed | 1 skipped (101)`;
  - `Tests  1262 passed | 2 skipped (1264)`;
  - `dist dirs after: 0`.

  [Unknown] I did not identify the skipped file or the two skipped tests.
- **Titles** (`titles-check.txt`, from `npx vitest list --json` at each commit, by my own script): `titles 5311 5320`.
  - 9 added, all in the five subject files;
  - `removed []`;
  - duplicates 3 at each commit.

  This matches the PR's "5,311 → 5,320" and `Tests: +9 ~1 -0`.
- **The canonical battery**, PROJECT-STATUS §"How to verify this page", run from the tree's own block by
  `tools/battery.py` in a clean worktree at `9ebfa92d`: `commit=9ebfa92d301de633b7c40a3f2276219330016d33 commands=110
  nonzero=0 cleanAfter=True`.
- **`python3 scripts/check_governance.py`** (exit 0): `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not
  asserted`.
- **`python3 scripts/check_quotations.py`** (exit 0): `OK    QC-1  a quotation beside a path:line locator was said by
  that file — 37 quotations examined in 18 of 949 .md files scanned … 0 findings`.

### 3.7 The surface version

Computed by `pwbSurfaceVersion`'s formula: the first 12 hex of sha256 over the two tree ids, joined by a newline.

| Tree | Value |
|---|---|
| `546f1ff0` | `polaris@8d82663ece26` |
| `01df68ea` and `9ebfa92d` | `polaris@c1f544101426` |
| Trial merge onto `f7477f52` | `polaris@c1f544101426` |

[Observed] All three match the PR. [Observed] `.syzygy/governance/records/` holds no walkthrough record at `9ebfa92d`.

## 4. Findings

No blocking finding.

**N1 — The record counts R4 and R6 as "stronger", and that does not reproduce.** Severity: low (record accuracy).
- Evidence [Observed]: in the lane's `r529-head.json`, R4 fails 15 rows and R6 fails 15 rows.
  - R4's extra row is `git-observation.test.ts > … identifies clean and dirty states without refreshing the index`.
  - R6's extra rows are `routes.test.ts > … refuses a stale validator …` and `surface-routes.test.ts > … serves
    Polaris, Trajectory, and Orrery as human-open, same-origin-guarded pages`.
- In my run at head with the same tool (`r529-all-head.json`), R4 fails 14 and R6 fails 13. Their title sets equal the
  base sets exactly ("mine-base [] | base-mine []").
- `record.py`'s rule (head titles a strict superset of base) therefore files 2 of its 10 "stronger" on rows that this
  PR does not touch and that did not fail again.
- The PR body's "[Inferred] These are load timeouts" is consistent with this. The tool keeps no failure message, so
  "timeout" itself stays [Inferred]. "Did not recur" is [Observed].
- Failure scenario: a later reader counts 10 strengthened kills where the rows earned 8, R1, R3, R7, R8, R13, R17, R18
  and R19, 6 of them the targets.
- Fix: in the dispositions, or the PR body at landing, say "8 stronger; R4 and R6 unchanged. Their extra head
  failures, on rows this PR does not touch, did not recur in the reviewer's re-run". Do not edit the frozen record.

**N2 — The PR says the type pin is run by "the battery and CI". The battery runs no npm command.** Severity: low
(disclosure).
- Evidence [Observed]:
  - 0 of the canonical battery's 110 commands invoke `npm`, `npx`, `tsc` or `vitest` (`battery.json`).
  - `node-ci.yml` does run both `npm run build` and `npm run typecheck` on `pull_request` and `push` to `main`, and
    both compile `src/**` including tests (`include: ["src"]`). Both passed at `9ebfa92d` (section 1).
- So the type pin is enforced by hosted CI, and by any local `npm run build` or `typecheck`, and not by the battery.
- Failure scenario: a session that runs only the canonical battery locally takes a dropped shim type for green.
- Fix: in the PR body's Residuals, write "enforced by CI's build and typecheck steps (`node-ci.yml`); the canonical
  battery has no npm step".

**N3 — The state-write containment is not pinned against case folding: V4 survives at base and at head.** Severity: low
(pre-existing test gap on a class-1 boundary; not caused by this PR, and not a bead row).
- Evidence [Observed]: V4 changes `isWithin` (`credentials.ts:85-87`) to compare `toLowerCase()` forms. It survives 571
  tests at base and 580 at head.
- Under V4, `authorizeStateWrite(stateDir, '../' + basename(stateDir).toUpperCase() + '/f')` passes the lexical check.
  Its nearest existing ancestor is the parent of the state dir, so the real-location check passes too.
  - [Inferred] It is then authorized: a write outside the state directory on a case-sensitive filesystem.
- The new sibling rows do not reach this. Their names differ by a suffix, not by case.
- Failure scenario: a later "portability" edit folds case in `isWithin`. CI stays green, and the daemon's one write
  boundary admits a sibling directory.
- Fix (follow-up, test-only): in `credentials.test.ts`'s state-write block, assert that
  `authorizeStateWrite(stateDir, '../' + basename(stateDir).toUpperCase() + '/f')` is refused with
  `refusedBy: 'traversal'`. The fixture prefix `rt3-cred-` contains letters, so the upper-cased name always differs.
  - [Inferred] The current code refuses it lexically on every OS, because `path.resolve` keeps case. So the row pins
    existing behaviour. Check V4 is killed.

**N4 — Bearer parsing: a leading-whitespace widening survives, and the row's title says "any other whitespace".**
Severity: low (pre-existing; class 4).
- Evidence [Observed]: V2 (`/^\s*Bearer (.+)$/`, which admits ` Bearer <token>`) survives at both commits.
- The new row's title is "the minted token behind any other whitespace refuses, named". It tests four forms: a double
  space, a tab, a trailing space and a trailing newline. Leading whitespace is not "behind" the scheme, so the title is
  not false, but it is wider than its population.
- [Inferred] Node's HTTP parser trims a header value's leading and trailing whitespace before the route sees it. So V2
  is reachable through `credentialFromAuthorizationHeader` as a function, which `@syzygy/http-host` exports and
  `@syzygy/cap1-daemon` re-exports, and not over the socket.
- V1 (a non-constant-time `===`) also survives. A behaviour test cannot see timing; see N8.
- Failure scenario: a later edit tolerates leading whitespace or other Unicode spaces in the function. No row fails.
- Fix (follow-up): add `` ` Bearer ${TOKEN}` `` and `` `Bearer\u00a0${TOKEN}` `` to the row's list. Both are refused
  today, because the regex does not match either: the first has a space before the scheme, and the second has U+00A0
  where the pattern wants a space. Or narrow the title to
  "behind a doubled, tab or trailing whitespace".

**N5 — The origin row's `describe` says "compared whole", but a suffix match survives.** Severity: low (title wider
than its rows; class 4).
- Evidence [Observed]: V6 (`origin.endsWith(expectedOrigin(host))`) survives at head. Every refused origin in the file
  is a prefix relation, longer or shorter. V7 (a case-insensitive comparison) and V8 (the host lower-cased) survive
  too.
- [Inferred] None of the three is reachable from a browser. A browser serializes `Origin` as a lower-case
  `scheme://host[:port]` or `null`, and no serialized origin other than the exact one ends with
  `http://127.0.0.1:7478`. So these are equivalent mutants under the check's threat model. They are not exposures.
- Failure scenario: a later edit replaces `===` with a suffix or "contains" test while the title promises "whole".
  Only the prefix-shaped cases fail.
- Fix (follow-up, optional): add one suffix-shaped refusal, for example
  `{ host: '127.0.0.1:7478', origin: 'http://attacker.invalid.http://127.0.0.1:7478' }` → `false`, and
  `origin: 'null'` → `false`. Both are refused today. Or rename the `describe` to "the Origin is compared whole, not
  by prefix".

**N6 — The observer-input gate rows pin two paths per package, so a narrowing that keeps exactly those passes.**
Severity: low (class 3; partly pre-existing).
- Evidence [Observed]:
  - V12 survives at head. It narrows `'packages/http-host/'` to `src/` plus `package.json`, so it would admit a dirty
    `packages/http-host/tsconfig.json`.
  - V14 (`'packages/cap1-daemon/'` → `…/src/`) and V15 (`'packages/three-surface-poc-core/'` → `…/src/`) survive the
    gate's tests, 35 of 35 passing. PR 529's N7 had noted the cap1-daemon row's shape.
  - `npm run build:poc` reads each package's `tsconfig.json`, so these files are build inputs of what the POC runs.
- The gate's code is correct today. The probe in `merge-gate-probe.txt`, run on the trial merge's built
  `git-observation.js`, gives `false` for `packages/http-host/tsconfig.json` and `packages/cap1-daemon/tsconfig.json`.
  The prefix list is the same at `9ebfa92d`. Only the pin is narrow.
- Failure scenario: a later "precision" edit narrows a prefix to `src/` plus its manifest. A dirty `tsconfig.json`
  then changes the served build while the POC claims clean inputs.
- Fix (follow-up, test-only): one table row, asserting that for each of the five prefixes, `<prefix>src/x.ts`,
  `<prefix>package.json` and `<prefix>tsconfig.json` each give `false`. Check V12, V14 and V15 are killed.

**N7 — The breach allow-list is not pinned against case folding: V10 survives.** Severity: informational.
- Evidence [Observed]: V10 matches the allow-list after `toLowerCase()`, and survives at head.
- [Inferred] It cannot leak free text. It admits only case variants of the three listed strings. The diagnostic is
  "Trusted transport metadata for a bounded final response. Never sourced from request text …" (`packages/http-host/src/server.ts:54-55`).
- V9 shows that the new row's `toEqual` over the whole parsed line catches a one-character leak. The `not.toContain`
  sentinel alone would not.
- Fix (optional): add `'Project shape not-admitted'` as a fifth population, expected to be withheld.

**N8 — The residual list names O17 only. Two more survivors of the same kind are unnamed.** Severity: informational.
- **O17 is a real residual** [Observed]: it survives at both commits.
  - [Inferred] It is an equivalent mutant. A re-export and a local `const` of the same primitive value cannot be told
    apart at runtime. Their module-namespace properties are both data properties holding equal values.
  - Object identity cannot help, because `DAEMON_HOST` is a string. For object-valued exports it already does: V13, a
    local copy of `REFUSAL_BODY`, is killed by the `toBe` row.
  - The harm O17 stands for, drift, appears only when the host's value changes. The same `toBe` row then fails. So no
    further row is needed.
- **TT1, the type-level analogue, also survives**: a local type structurally equal to the host's. `toEqualTypeOf`
  compares structure, so it cannot fail until the two types diverge, and then it does. TT2 proves the pin catches a
  local type that differs.
- **V1, a non-constant-time token comparison**, survives. No behaviour test can see it.
- Fix: in the PR body's Residuals, add "TT1-shape: a shim-local type structurally equal to the host's (equivalent
  until they diverge)" and "a non-constant-time token comparison (timing is not testable here)".

**N9 — Out of this subject, on current main: the POC now imports `@syzygy/support`, and the observer-input gate does
not protect `packages/support/`.** Severity: medium for main. It is not a PR 535 byte and does not affect this verdict.
- Evidence [Observed], at `f7477f52` (PR 530, bead `syzygy-bpyt.6.3`) and in the trial merge:
  - `apps/three-surface-poc/src/poc-main.ts:11` and `git-observation.ts:4` import `@syzygy/support`;
  - `build:poc` builds `packages/support` first;
  - `pocObserverInputsAreClean`'s prefixes are unchanged: the POC, `three-surface-poc-core`, `cap1-daemon`,
    `http-host` and `cap1-core`;
  - so `pocObserverInputsAreClean({ changedPaths: ['packages/support/src/sha256.ts'] })` returns `true`, and so does
    `'packages/support/package.json'` (`merge-gate-probe.txt`).
- [Observed] Before PR 530 those bytes were in a protected path. `git diff 546f1ff0 f7477f52 --
  apps/three-surface-poc/src/git-observation.ts` replaces an inline `createHash('sha256')` with `sha256` from
  `@syzygy/support`. [Inferred, from PR 530's commit subject] The same holds for its other call sites.
- PR 529's dispositions (`docs/evidence/http-host-round-1-dispositions-2026-10-27.md:69-70`) say of the analogous host
  move: "Without the prefix, the gate would have accepted a dirty host, and that would have been the unlisted
  loosening."
- Failure scenario: a dirty edit to `packages/support/src/sha256.ts` changes the worktree-metadata digest the POC
  records, while startup reports a clean observer.
- Fix: route to the coordinator and owner as a `syzygy-bpyt.6.3` follow-up.
  - Add `'packages/support/'` to the prefixes, and gate rows for `src/` and `package.json`.
  - By the PR 529 ruling above, adding a prefix for moved bytes is "the move followed through". Whether it needs an
    owner ruling under l.95–96 is for the coordinator to decide.
  - [Unknown] whether PR 530's reviews considered this. A sweep of its two raws for `observer`, `inputPrefixes` and
    `git-observation` (denominator: the 2 raws `R-GP-IMPL-SUPPORT-LEAF-1-RAW.md` and `-2-RAW.md`) found three lines:
    one line-change table row naming `git-observation.ts`, and two rows naming `project-shape-observer.ts`'s digest.

**N10 — The owner notice is still to post, and the class set differs from the declaration.** Severity: informational
(process).
- Evidence [Observed]: the PR leaves the GP-Q0 notice on `syzygy-bpyt.10` to the coordinator at landing (GP-Q0
  l.66). My ruling is classes 1, 3 and 4, not 6 (section 2).
- Fix: post the notice at landing with "classes 1, 3, 4 (reviewer ruling; 3 added); test-only; no gate change; the
  differential is satisfied by product-byte identity". Name N9 there too, since it is a class-3 gap on main.

## 5. Every changed output

| Output | Change | Evidence |
|---|---|---|
| Product files (`apps/**`, `packages/**`, non-test) | **None** | [Observed] The code diff names 5 `*.test.ts` files and 0 others |
| Served pages, machine JSON, refusal strings, exit codes, wire formats | **None** | [Inferred] from identical product bytes. [Observed] The gate probe and the new rows give the base decisions |
| POC live walkthrough surface version | **Changes**: `polaris@8d82663ece26` → `polaris@c1f544101426`, at the trial merge too. Disclosed in the PR | [Observed], section 3.7. It is printed at POC start and rendered on `/polaris` in `data-polaris-readiness-expected-surface` (per PR 529's N1). No bound record carries it |
| Vitest titles | +9, ~1 (the extended gate row, title unchanged), −0: 5,311 → 5,320 | [Observed], section 3.6 |
| Evidence | 26 new files under `docs/evidence/syzygy-bpyt-7-14/` | [Observed] |
| Governed plane (`.syzygy/**`, `openspec/**`) | **None** | [Observed] No subject path is under either |

## 6. Verdict per acceptance criterion

The bead's outcome: each of R3, R8, R13, R14, R17, R18 and R19 is killed by a row, with old/new and commit recorded.

| Target | `old` → `new` (the PR 529 reviewer's spec) | Base `546f1ff0`, lane and mine | Head, lane `01df68ea` and mine `9ebfa92d` | Killing row | Recorded old/new and commit | Verdict |
|---|---|---|---|---|---|---|
| R3 | `credentials.ts` `/^Bearer (.+)$/` → `/^Bearer\s+(.+?)\s*$/` | survived, survived (571) | killed, killed (1/580) | "the minted token behind any other whitespace refuses, named" | yes (`premise-base.json`, `r529-head.json`) | **Met** |
| R8 | `server.ts` allow-list without `'project shape not-admitted'` | survived, survived | killed, killed (1/580) | "logs a 503 breach diagnostic for each listed Unknown population and withholds an unlisted one" | yes | **Met** |
| R13 | `cap1-daemon/src/server.ts` `HANDLER_FAILURE_STATUS as UNKNOWN_ROUTE_STATUS` | survived, survived | killed, killed (1/580) | "re-exports each host value as the host binding of the same name" | yes | **Met** |
| R14 | `cap1-daemon/src/credentials.ts` drop `type StateWriteRefusalName` | Vitest: survived, survived. Typecheck: survived, survived (incremental and fresh) | Vitest: survived, survived. Typecheck: killed, killed, `package.test.ts(72,25): error TS2724` | the type pin "re-exports each host type under the same name (checked by the compiler)" | yes (`tsc-base.json`, `tsc-head.json`, as `T-drop-StateWriteRefusalName`) | **Met**, by the compiler |
| R17 | `git-observation.ts` `'packages/http-host/'` → `'packages/http-host/src/'` | survived, survived (35) | killed, killed (1/35) | the extended "protects the HTTP host package the POC serves through" | yes | **Met** |
| R18 | `browser-origin.ts` `===` → `startsWith` | survived, survived | killed, killed (1/580) | "refuses an origin that only begins with the host origin" | yes | **Met** |
| R19 | `isWithin` without `path.sep` | survived, survived | killed, killed (2/580) | the sibling traversal row and the symlink-to-sibling row | yes | **Met** |

The bead's literal rows, each present and as written [Observed]:
- item 1: the `toBe` binding row and the `expectTypeOf` type pin;
- item 2: `Bearer  ${TOKEN}` (double space) refused; `../<basename>-x/f` refused as `traversal`; the `not-admitted`
  breach line keeping `response-limit-breached` and its population; `http://127.0.0.1:74789` refused;
- item 3: `packages/http-host/package.json` protected;
- item 4 (N5): not done, as the bead prescribes ("on any later reuse"). The frozen PR 529 evidence is untouched.

## 7. Test quality

- **Bar 4, literals.** [Observed] Every expected value is a literal or an independent identity:
  - the 18-name list is a literal;
  - the breach expectation re-states the three reasons and every field as literals;
  - refusals are `{ admitted: false, served: 'nothing' }` and `'traversal'` or `'symlink-escape'` literals;
  - origins are literal booleans.

  `toBe(host[name])` compares two module bindings. It is the property under test, not a mirrored computation.
- **Rule 6, per row.** [Observed] Every added or extended row has at least one mutant that it alone kills at head:
  - the R3 row: O1–O5 and V3;
  - the sibling row: O6;
  - the symlink row: O7;
  - the breach row: O9–O11 and V9 (O8 also fails a `response-limits` row);
  - the binding row: R13, O15, O16 and V13;
  - the type pin: 8 type mutants at head that survive at base;
  - the gate row: R17;
  - the longer-origin row: R18;
  - the shorter-origin row: O12.

  The exception is the "allows no Origin and the exact origin" row. Its mutants O13 and O14 were already killed at
  base, by 34 and 6 rows. It is the new file's positive control, and without it a refuse-everything edit would pass
  the file's two refusal rows. I do not count it against bar 10.
- **Bar 10, growth.** [Observed] The net delta is stated (`+9 ~1 -0`). Eight of the 9 added titles each catch a mutant
  no existing test catches, which is the bar's own test for adding. The R3 and R19 rows could have extended the
  neighbouring loops ("non-Bearer and empty-token headers refuse, named" and "refuses traversal out of the state dir,
  named"). Separate titles localize each predicate better (bar 7). Not a finding.
- **Weaker than its title.**
  - The R3 row: N4.
  - The origin `describe`: N5.
  - The gate row's "the HTTP host package": N6, two paths pinned.
  - The type pin's title says it is "checked by the compiler". [Observed] Under Vitest it always passes: R14 survives
    Vitest at head. CI's build and typecheck steps run before `npm test`. The title is honest.
- **Bar 6, determinism and cleanup.** [Observed] The five files passed 11 of 11 runs, three at a time in 6 of them,
  under 2× CPU oversubscription. No run left a test directory in its private TMPDIR.
  - [Observed, by reading] The breach row awaits each `fetch` in turn. `emitNonSuccess` writes its line before
    `respond` sends the response, so every line is captured before its fetch resolves.
  - The `stderr` spy is restored in `finally`. The daemon closes through the file's `running` and `afterEach`.
  - The sibling `<stateDir>-x` is pushed to `cleanups`. The symlink row's base dir is removed recursively, and
    `rmSync` does not follow the link.
  - [Inferred] Node 24 (`v24.6.0` here, and `node-version: 24` in CI) prints no fetch warning that could enter the
    captured lines. Any stray write would fail `JSON.parse` loudly, not silently.
- **The dist-absent run.** [Observed] The root Vitest config aliases `@syzygy/cap1-core`, `@syzygy/cap1-daemon` and
  `@syzygy/http-host` to `src` (`vitest.config.ts`). The three affected projects pass with 0 `dist/` before and after
  (section 3.6).

## 8. Cleanup

- Deleted: both clones (base and head), both worktrees (the governance worktree and the trial merge, whose local merge
  commit was never pushed), every `/tmp/r535-*` TMPDIR (`ls -d /tmp/r535-*` gives 0), and the two `npm ci` logs.
- No daemon was started outside Vitest's own tests. No process was killed. Nothing was pushed, commented or merged. No
  `bd` mutation was run.
- To read PR 528's and PR 531's review raws on main, I fetched GitHub `main` once into the main checkout's object store
  as `refs/remotes/rev535/main`, then deleted that ref (`git show-ref | grep -c rev535` gives 0). No working-tree file
  there was touched, and no worktree under `.worktrees/` was opened.
- Kept, in `rev-535/` (all under 300 KB; the largest, `gov-check.log`, is 172,032 bytes):

| File | sha256 |
|---|---|
| `tools/battery.py` | `4a30a3b6fbe065a125da5f7b7bfe2500242da6996d70541f5fe83d9786c0ac14` |
| `tools/check_record.py` | `a9a3df1a7fbc1b779f6e40d9c12ae508d4dcb6389240e14212bda19fe08ae176` |
| `tools/identity.py` | `6d8bbe2605834fd6187c341ee4f810de3bdcc2daca916eb9500019c4d86d08a2` |
| `tools/lane-tsc_mutants.py` | `796dea4618415bfbfb72cc33da0db0fb2c1ba13f27de2be4dd6b01f37eeec7de` |
| `tools/r529-mutants.py` | `31f0579ac464173e81e2d8f9ca3713c4f6f4574dcd74c1169aa95db9c8865830` |
| `tools/repeat.py` | `4358900b41dbfa5709d185f01d51c3ebf4410b3544373c31a978e55d534a4bfb` |
| `tools/rev535_mut.py` | `fe8ae4e5456c957435954fa368ff075ec31c783766e95c602e1bda3410144dac` |
| `tools/rev535_specs.py` | `e155047fdfa8abce4e7ced76ab28fc188c126ddf8d830b89b8e07b99c2c311a9` |
| `battery.json` | `6c11c2e174effc5df58f58175a0816774629b46304e6ea8093563d9c37fcbaa0` |
| `battery.log` | `2de93f56ca3296d8b3daa9b94e807cac9856fcf16dccfa301ce8e4a95be851da` |
| `check-record.txt` | `ab276503692a25e020b0d405fb22c0cba136b9c40eaceba884c2fe4785cde46e` |
| `gov-check.log` | `5155d6ca890a642e0b47f78afa88ba6beb6886a986cac5cfeaf10a69b7da7c13` |
| `identity.txt` | `dfdf23e1c325ad26c47334c8406034ddcb8eab0abc4028b8a62e616fe7b6bd52` |
| `lane-own-base-rerun.json` | `4c25b16cfd8f54ec047333faf20f8b3c9d289c61816dee1fbe39fcfcdc6bcff6` |
| `lane-own-base-rerun.log` | `eaf0bad572ee67721f1dca23fad07611779def0c2c161a742b4a57020a189d95` |
| `lane-own-head-rerun.json` | `5d9e492518780d150f3ac9d713d4880358290b388f23115054d3e01b8ab813fa` |
| `lane-own-head-rerun.log` | `16de926c36567b7a188d005331418d88734a27fb5dff82ee9ce3becc4e40cf7b` |
| `lane-own-specs-runner.json` | `487e8892d992ddb029e4983334c73a00d0c142b3678f7d3375a8c1ac6181e975` |
| `lane-own-specs.json` | `a3dfd7f20b7e76ae29aba9705127bb2eec2125920fe9422c61e31ea16460ad0e` |
| `lane-tsc-specs.json` | `446f175b20c981b4657edc74078dfd5d2d99910fb9d3ce7c98ca95623d92504c` |
| `merge-gate-probe.txt` | `cc11c62027d9b273ba4c537afa86471d7fc270aee6ea90b979aff81bb15ef576` |
| `merge-typecheck.log` | `f21762922bb179fa5dc8c33e881c4f062ef1c33bf48c7d3dad2dd0e5cd30ee98` |
| `nodist-run.log` | `13f265ee55d1dd9a36fa8b1a3e0cc2f7219357311d0ab97448bb3d285dd0b218` |
| `quotations.log` | `a3dfcf00412b4592d95b8bf26a7e6d133955b6df112513710d52d7f9d5e81f2d` |
| `r14-base-fresh.log` | `675faa2021de216af45e280d9fed563c6373a52554da7c19f803a5338b3ad3e8` |
| `r14-head-fresh.log` | `5850c9d4c80734cf3a52204be738f81e763e8b2ad06cb3083eff7e39cf414889` |
| `r529-all-head.json` | `db359f15a51526d7d3d214c5ea06da0ec9483ed034d9826f7747deb0be303c41` |
| `r529-all-head.log` | `f3b0de3fca3845ff8cbcc3ff7b9cd320ab6d5d11b03a9b5e68f964d070527573` |
| `r529-targets-base.json` | `54b6a4e1e5d29ad4cc9bc3267d76bc8cd650fbf6d0a8048341cef896f6bc8e68` |
| `r529-targets-base.log` | `56d54ecfe2742bee5c014a7fbb6a55b170334d6af3958c1d3272061f7e164da3` |
| `record-check.txt` | `9d8d796183d9d825284bf239eeae2683175b907d5ff7bb1ff5d151f1a4103da8` |
| `repeat-par.json` | `74a062afd3a743321e21616a58e738531d0fc9393b09e43f42fa14e55b30cb61` |
| `repeat-seq.json` | `70c5b6670061786a0925714f9c5007453e3aa08e1f67579e145fd9708bdbd0ee` |
| `rev535-base.json` | `0ea02a8b74fcb88fbdd0dbc29282347bdafcd203bf2596e72f97ecb820bba36e` |
| `rev535-base.log` | `5ff5d1c01931e0dc6cf6aca475991f0ec1064c3651fb84f2848e23e9d0e330ed` |
| `rev535-gate-head.json` | `6508947f021b35a6c84618607996fd2c5271a321e117d18fca250299879629cc` |
| `rev535-gate-specs.json` | `f3e32b98a4839dd6dd726d5a13d45f226f28cfb6fc43c967dcc686ef81a641a3` |
| `rev535-head.json` | `27b4072039d0694b491f3ca8e5429a2189e1db7004d6388b7b9be1e05d901e8b` |
| `rev535-head.log` | `ee09a73989dc6f8b9987ef7515cf80e9079c4fa5d02391465346d8820c1eae8d` |
| `rev535-specs.json` | `628fb34ecea806b3c2d53874e96a82057786355066b29d60d89a77485c3e82e3` |
| `rev535-tsc-specs.json` | `9835b03c203ba70fa6f14f3fd6d159968f89d9999d3757b3793e9698553cb260` |
| `tc-head-1.log` | `675faa2021de216af45e280d9fed563c6373a52554da7c19f803a5338b3ad3e8` |
| `titles-check.txt` | `7acbd7c88238afdbe5de894c0ed9d00f60d64a7ce94281d11791343a25e57a82` |
| `tsc-all-specs.json` | `bbac9f8575d1f7fa8f6dea917edfe7b3507ced34061dfe59269d626035328754` |
| `tsc-base-rerun.json` | `df8d626817c73dda32d857344954bd8131684cff9f9ce13a2325f5f1d8e30e6d` |
| `tsc-base-rerun.log` | `e875e5664b7a5d53e81a5215501b2aee3f63cdcbd0e99b10a2b55ae0f0b362d2` |
| `tsc-head-rerun.json` | `a824dd87b95ce26e106e3bb17c9e42a9f0b85566e9775ff98b47c9c2007bb71c` |
| `tsc-head-rerun.log` | `8b54b3de1d8c912ef8d7007a0145ec0c7cc66353a86df6177de097416cbb6190` |

`r14-base-fresh.log` and `tc-head-1.log` share a digest. Each holds only the npm script header and `exit 0`.
