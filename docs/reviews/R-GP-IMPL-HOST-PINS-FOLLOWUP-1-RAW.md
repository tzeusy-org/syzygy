# R-GP-IMPL-HOST-PINS-FOLLOWUP-1 — CC-REV-1 implementation review of syzygy-bpyt.7.16, round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: fb481b4d
Subject: r1-review.diff sha256 189e8f8ab41d52414a4773885f75551603f62916f30b2ebc440a7d4de5d166e0

Reviewer: rev-542, fresh context, independent of the implementing lane. I changed no reviewed byte, pushed nothing,
commented on nothing and merged nothing. No observed-repository content was read; no credential file was opened.
Every mutant and suite ran in my own scratch clone of `/home/tze/GitHub/syzygy` (fetched from
`https://github.com/Tzeusy/syzygy.git`), with `npm ci` first, one vitest process at a time and a private TMPDIR
(`/tmp/r542-<n>`) that the tool removed after each run.

No blocking finding. Six notes (N1–N6). Each of the bead's four items is done as the bead names it, each target and
lane-own mutant survives at base over 1,022 tests and dies at head by its own row alone, no product byte changes, and
the full suite passes at the reviewed commit.

## 1. Subject identity checks

All [Observed], re-derived by script in my clone.

| Check | Result |
|---|---|
| `sha256sum` of the brief's `r1-review.diff` | `189e8f8ab41d52414a4773885f75551603f62916f30b2ebc440a7d4de5d166e0` — matches the brief |
| `git diff eb8fb6cb fb481b4d \| sha256sum` | `189e8f8ab41d52414a4773885f75551603f62916f30b2ebc440a7d4de5d166e0` — equals the file |
| `git diff --stat eb8fb6cb fb481b4d` | ` 19 files changed, 2548 insertions(+), 4 deletions(-)` |
| `git diff eb8fb6cb 0d7eaf08 \| sha256sum` | `210dc44da2d4701cbfa183d0090a599a7478023b6948febe3ca406e922f3f083` — matches |
| `git diff d38d7a3c acb92078 \| sha256sum` | `210dc44da2d4701cbfa183d0090a599a7478023b6948febe3ca406e922f3f083` — the two code diffs are byte-identical |
| `git diff --name-only eb8fb6cb 0d7eaf08` | exactly the three test files |
| `git diff --name-only 0d7eaf08 fb481b4d` | exactly 16 files, all under `docs/evidence/syzygy-bpyt-7-16/` (`16 files changed, 2519 insertions(+)`) |
| Parents | `fb481b4d` ← `0d7eaf08`; `0d7eaf08` ← `acb92078`, `eb8fb6cb`; `acb92078` ← `d38d7a3c` |
| `git merge-tree --write-tree acb92078 eb8fb6cb` | `8773ab53a715178d1387b59602632fd4f1b8b7d0`, equal to `git rev-parse 0d7eaf08^{tree}`: `0d7eaf08` is git's own merge of its parents |
| GitHub branch head | `gh pr view 542` `headRefOid` = `fb481b4d3b815e20ceeb245a22f6e8c6e6e32788`, state `OPEN`, `MERGEABLE` |
| Product bytes | blob ids of `packages/http-host/src/credentials.ts` (`cba78cd5…`), `apps/three-surface-poc/src/browser-origin.ts` (`17becffd…`) and `packages/http-host/src/server.ts` (`625c6011…`) are equal at `eb8fb6cb`, `0d7eaf08` and `fb481b4d`. No path outside the three tests and the 16 evidence files changes (`pr-paths.txt`, 19 lines) |
| Lane tool and evidence digests | `record.py` `3799ab97…b433`, `summary.json` `74033131…26f8`, `rev535_mut.py` `fe8ae4e5…144dac`, `rev535-specs.json` `628fb34e…e3`, `own_specs.py` `4ecaae09…a6`, `suite_summary.py` `426634af…f32c3` — all six match the PR body |

**Main has moved.** When I started, main was `41932c3b` (#533); while I worked #540 landed and main is now
`973965a82f82d9b90af05e4b96524aae0d9dbec4` (`git ls-remote … main`). [Observed] `git diff --name-only eb8fb6cb
41932c3b` lists 134 paths and `git diff --name-only eb8fb6cb 973965a8` lists 225. `comm -12` of each against the
PR's 19 paths is empty: **no path main changed since `eb8fb6cb` is a PR path** (0 of 19, at both mains). #540 changes
`apps/three-surface-poc/src/git-observation.ts` and its test, which are neither PR paths nor the modules this PR's
rows pin. Local merges: `b2dd0cfb` = `fb481b4d` + `41932c3b`, and `6cca1acf` = `fb481b4d` + `973965a8`, both
without conflict; `git diff --name-only 973965a8 6cca1acf` is exactly the PR's 19 paths, and neither main touches a
`package.json` or `package-lock.json`.

## 2. Clauses relied on, and the class ruling

**CC-REV-1** (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md` at `fb481b4d`):
- l.31–32: "1. **authority boundaries** — write-universe, typed-authority table, adapter authorization (VIS-5, VIS-6);"
- l.35–36: "3. **deterministic observation** — snapshot composition, evaluation identity, the deterministic/inferred seam
  (VIS-7);"
- l.37: "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
- l.40–41: "6. **public interface** — machine-queryable endpoints, adapter contracts, anything an external consumer can
  depend on;"
- l.49: "**The change record states** which classes the change touches, or "none,"" and l.51: "**A reviewer or the
  owner** may reclassify at any time."

**GP-Q0** (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md` at `fb481b4d`):
- l.51: "Behavior-preserving refactors may proceed under the acts already in force. They may touch `apps/**`,
  `packages/**`, `scripts/**`, tests, CI and root manifests."
- l.52–55: ""Behavior-preserving" means none of the following changes:" / "a rendered byte, a wire format, a refusal
  string or an exit code;" / "a signed or digest-bound artifact;" / "a consent, security or retention decision."
- l.62: "**Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or
  class 4 (security), and class-6 pull requests that remove an endpoint."
- l.64–66: "an old-versus-new differential over a mutated-record corpus that includes records with altered prose;" /
  "a rule-6 mutant for each predicate;" / "a non-blocking owner notice in the cycle report."
- l.95–96: "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."

**AGENTS.md** at `fb481b4d`: rule 4 (l.123–124) "Read a check's output, not its exit code, and check its denominator
against the whole population."; rule 6 (l.126–127) "Mutate the input and confirm the check fails, per predicate,
before trusting it"; rule 9 (l.132) "A claim of absence needs a sweep with a denominator."; rule 11 (l.134–135) "An
evidence record names its subject and the subject's digest".

**Code anchors** at `fb481b4d`: `packages/http-host/src/credentials.ts:23-25` "Every filesystem write is routed
through `authorizeStateWrite` — the daemon's only write boundary"; `apps/three-surface-poc/src/walkthrough-inputs.ts:52`
"The daemon prints both and Polaris shows both" and l.77–78 "so it changes with any change to either tree and with
nothing else — committing the run record does not move it."

### Class ruling (mine)

| Class | Ruling | Why |
|---|---|---|
| 1 authority boundaries | **Touched** | The new N3 row pins `authorizeStateWrite`, the daemon's one write boundary (`credentials.ts:23-25`): the write-universe. Test-only, but it changes the assurance on that boundary |
| 4 security | **Touched** | Bearer admission (`credentialFromAuthorizationHeader`, `credentials.ts:360-371`), the browser-origin check (`browser-origin.ts:26-38`) and the content-blind breach diagnostic (`http-host/src/server.ts:157`) are auth surfaces and a disclosure path |
| 3 deterministic observation | Not touched | No observation, snapshot or evaluation-identity code or test changes. The surface version moves only because a file under `apps/three-surface-poc/src` changes; its computation is untouched (section 5) |
| 6 public interface | Not touched | Only `*.test.ts` files change; no export, endpoint or adapter contract |
| 2, 5, 7 | Not touched | No identity minting, no `.syzygy/**` schema or store, no certificates |

I agree with the PR's declaration: classes 1 and 4.

**GP-Q0's further checks apply** (l.62: classes 1 and 4).
- *Differential.* [Observed] The product modules are byte-identical at base and head (section 1), so an old-versus-new
  differential would run the same product code twice. I accept "identical by construction" as discharging it for a
  test-only subject, as the PR 535 reviewer did.
- *A rule-6 mutant per predicate.* Done: four predicates (containment, the Bearer parse, the origin comparison, the
  breach allow-list), each with the bead's target mutant and at least one mutant of my own (section 3).
- *Owner notice.* [Observed] Not yet posted: `bd show syzygy-bpyt.10` names `syzygy-bpyt.7.16` only as a follow-up of
  #535. The PR says it is due at landing, which is how the #536 notice was handled. Not a defect.

**Gate accept/refuse (GP-Q0 l.95–96).** [Observed] No product byte changes, so no gate's code changes. The one moved
output, the surface version, is compared by the walkthrough readiness and judgment evaluators against a run record;
at `fb481b4d` and at `973965a8`, `git ls-tree -r` lists 0 files under `.syzygy/governance/records/` and 0 tracked
paths containing `PWB-WALKTHROUGH-001`. [Inferred, from those two Observed facts] No accept/refuse outcome changes:
there is no record for the moved version to stop matching. **Nothing a gate accepts or refuses changes.**

**"A rendered byte" (GP-Q0 l.53).** [Observed] The surface version is rendered on `/polaris`
(`apps/three-surface-poc/src/polaris.ts:922`, `data-polaris-readiness-expected-surface`). I rule that its move is not
a behaviour change under l.53: the version is by design a content address of the two source trees ("it changes with
any change to either tree and with nothing else"), and reading l.53 to forbid it would forbid every change to
`apps/**` that l.51 expressly permits. It is disclosed in the PR. The owner may reclassify (CC-REV-1 l.51).

## 3. What I ran and the results

Tools are mine (section 8); none of the lane's tools ran except `record.py`, which the brief asks me to re-run.
`/proc/loadavg` load1 is recorded before → after each run.

### 3.1 Denominator: which test files can see each mutated module

`tools/importers.py` builds the static import graph of the 512 tracked `*.ts` files under `packages/` and `apps/`
(resolving `.js` → `.ts` and the root `vitest.config.ts` aliases) and asks which of the 246 test files in the root
config's nine projects transitively import each mutated module. [Observed] `credentials.ts` 56, `browser-origin.ts`
48, `http-host/src/server.ts` 55; union 57 files, of which **36 lie outside the lane's 19 test paths** (all under
`apps/three-surface-poc/src/`, most reaching the modules through `routes.ts`). The sets are equal at `eb8fb6cb` and
`fb481b4d`. So I ran every base survival claim over the union, `files-union.json`: the 19 paths plus those 36 — 55
filters, which vitest expands to 105 files and 1,022 tests at base (1,024 at head). Limitation [Inferred]: a test that
spawns a built `dist/` binary is not an import edge; no mutant here was built into `dist/`.

### 3.2 The bead's targets and the lane's own mutants

Specs copied byte for byte by `tools/build_specs.py` from `git show fb481b4d:` of the PR 535 reviewer's
`rev535-specs.json` (V2, V4, V6, V10) and the lane's `own-specs.json` (O1, O2). Runner: `tools/mut542.py` (each `old`
asserted to occur once, original bytes restored, `git status --porcelain` empty after every run).

At **base `eb8fb6cb`, over the union** (`base-targets-union.json`):

```
CONTROL: survived exit=0 failed=0/1022 passed=1021 skipped=1 files=105 failedFiles=0 230.4s load=43.84->42.41 clean=True
V2-bearer-leading-whitespace-admitted: survived exit=0 failed=0/1022 passed=1021 skipped=1 files=105 failedFiles=0 225.4s load=42.41->43.61 clean=True
V4-containment-case-insensitive: survived exit=0 failed=0/1022 passed=1021 skipped=1 files=105 failedFiles=0 231.7s load=43.61->43.16 clean=True
V6-origin-suffix-match: survived exit=0 failed=0/1022 passed=1021 skipped=1 files=105 failedFiles=0 195.7s load=43.16->38.04 clean=True
V10-listed-reason-matched-case-insensitively: survived exit=0 failed=0/1022 passed=1021 skipped=1 files=105 failedFiles=0 139.5s load=38.04->31.02 clean=True
O1-bearer-no-break-space-admitted: survived exit=0 failed=0/1022 passed=1021 skipped=1 files=105 failedFiles=0 202.3s load=31.02->42.99 clean=True
O2-origin-null-allowed: survived exit=0 failed=0/1022 passed=1021 skipped=1 files=105 failedFiles=0 150.4s load=42.99->31.93 clean=True
```

At **head `fb481b4d`, over the lane's 19 paths** (`head-targets-19.json`; the code tree equals `0d7eaf08`'s, and the
36 extra files are byte-identical to base, where none of them killed anything):

```
CONTROL: survived exit=0 failed=0/582 passed=582 skipped=0 files=69 failedFiles=0 16.3s load=24.82->25.46 clean=True
V2-bearer-leading-whitespace-admitted: killed exit=1 failed=1/582 passed=581 skipped=0 files=69 failedFiles=1 19.4s load=25.46->26.76 clean=True
     packages/http-host/src/credentials.test.ts > RT3 — credential verification through core admission the minted token behind any other whitespace refuses, named
V4-containment-case-insensitive: killed exit=1 failed=1/582 passed=581 skipped=0 files=69 failedFiles=1 20.2s load=26.76->27.50 clean=True
     packages/http-host/src/credentials.test.ts > RT3 — state-write boundary refuses a sibling whose name differs from the state dir name only in case, as traversal
V6-origin-suffix-match: killed exit=1 failed=1/582 passed=581 skipped=0 files=69 failedFiles=1 19.9s load=27.50->30.73 clean=True
     apps/three-surface-poc/src/browser-origin.test.ts > browserRequestAllowed — the Origin is compared whole refuses an origin that only ends with the host origin, and the opaque origin null
V10-listed-reason-matched-case-insensitively: killed exit=1 failed=1/582 passed=581 skipped=0 files=69 failedFiles=1 18.1s load=30.73->29.74 clean=True
     packages/cap1-daemon/src/server.test.ts > RT3 — credential-classed admission at the transport logs a 503 breach diagnostic for each listed Unknown population and withholds an unlisted one
O1-bearer-no-break-space-admitted: killed exit=1 failed=1/582 passed=581 skipped=0 files=69 failedFiles=1 17.3s load=29.74->31.18 clean=True
     packages/http-host/src/credentials.test.ts > RT3 — credential verification through core admission the minted token behind any other whitespace refuses, named
O2-origin-null-allowed: killed exit=1 failed=1/582 passed=581 skipped=0 files=69 failedFiles=1 18.2s load=31.18->31.23 clean=True
     apps/three-surface-poc/src/browser-origin.test.ts > browserRequestAllowed — the Origin is compared whole refuses an origin that only ends with the host origin, and the opaque origin null
killed 6 survived 1 error 0 of 7
```

Which assertion killed each (first failure message, and the failing line where the stack names one), [Observed]:

| Mutant | Kill text | Line | Is it the form this bead adds? |
|---|---|---|---|
| V2 | `AssertionError: " Bearer aaaa…": expected { admitted: true, …(1) } to deeply equal …` | row at `credentials.test.ts:390` | Yes: the leading-space form |
| O1 | `AssertionError: "Bearer\xa0aaaa…": …` (U+00A0 in the message) | same row | Yes: the no-break-space form |
| V4 | `expected true to be false` | `credentials.test.ts:305` | Yes: the new case row's `authorized` assertion |
| V6 | `expected true to be false` | `browser-origin.test.ts:32` | Yes: the suffix-shaped origin |
| O2 | `expected true to be false` | `browser-origin.test.ts:33` | Yes: `origin: 'null'` |
| V10 | `expected [ { …(12) }, … ] to deeply equal [ … ]` | `server.test.ts:161` | Yes: base, which lacks the fifth population, survives |

No failure timed out (`timedOut` false for all six). **Each survives at base and dies at head by its own row alone**:
exactly one failing row each, and in the two rows that also hold older forms (V2, O1) the failing form is the one the
bead adds. These agree with the lane's `rev535-at-{base,head}.json` and `own-{base,head}.json` (580/582 tests over
the 19 paths), which I read by script.

### 3.3 My own mutants

`own.json`, built by `tools/build_specs.py`. R1 and R2 are the PR 535 reviewer's V7 and V8 copied unchanged. Expected
kills ran at head over the 19 paths (`head-own-19.json`) and at base over the union (`base-own-union.json`); expected
survivors ran at head over the union (`head-own-union.json`).

| Id | Predicate | Mutation | Base (union, 1,022) | Head | Killed by / scope |
|---|---|---|---|---|---|
| R1 (=V7) | origin | `origin.toLowerCase() === expectedOrigin(host).toLowerCase()` | — | survived 0/1,024 | Residual the PR discloses. The bead's item 3 named it but its fix direction names only the suffix and `null` rows; "compared whole" is about extent, and the new comment says case is not pinned. Out of scope; no action |
| R2 (=V8) | origin host | host lower-cased before the allow check | — | survived 0/1,024 | Same as R1 |
| R3 | containment, lexical call only | `if (!isWithin(root.toLowerCase(), resolved.toLowerCase()))` at `credentials.ts:119` | survived 0/1,022 | **killed** 1/582 | The new case row, alone: `expected 'symlink-escape' to be 'traversal'`. So the row's `refusedBy` pin is load-bearing, not only its `authorized` pin |
| R4 | Bearer parse | `.exec(header.trimStart())` | survived 0/1,022 | **killed** 1/582 | The other-whitespace row, alone, on `" Bearer a…"` |
| R5 | Bearer parse | `.exec(header.normalize('NFKC'))` (NFKC maps U+00A0 to U+0020) | survived 0/1,022 | **killed** 1/582 | The other-whitespace row, alone, on `"Bearer\xa0a…"` |
| R6 | containment, real-location call only | `if (!isWithin(realRoot.toLowerCase(), realTarget.toLowerCase()) \|\| realTarget === realRoot)` at `credentials.ts:137` | — | **survived** 0/1,024 | **N1.** Not reached by the bead's row, which exercises only the lexical call |
| R7 | origin | `new URL(origin).origin === expectedOrigin(host)` in a try/catch (false on throw) | — | survived 0/1,024 | [Inferred] Equivalent under the threat model: it widens only to a trailing slash, a path or upper case, which a browser never serializes into `Origin`. Out of scope |
| R8 | breach allow-list | `.some(listed => population.reason.startsWith(listed))` | — | **survived** 0/1,024 | **N2.** Leaks free text after a listed prefix. Outside N7's case scope |
| R9 | breach allow-list | `.includes(population.reason.trim())` | — | survived 0/1,024 | [Inferred] Admits only whitespace-padded copies of a listed reason, which carry no free text. Informational |

Every run: exit and outcome agree, `cleanAfter` true, no timeout. Head-union runs went 146–292 s at load1 32.8–64.9.

### 3.4 Probes: are R6 and R8 real exposures?

`tools/probe.py` copies one probe test into the clone, runs it unmutated and under the named mutants, restores every
byte, removes the probe and requires a clean tree. Neither probe was committed anywhere.

- `tools/zz-rev542-write-probe.test.ts` (`probe-write.json`): a state dir `<base>/state`, a sibling `<base>/STATE`, and
  a symlink `state/link → <base>/STATE`; then `authorizeStateWrite(stateDir, 'link/escape.txt')`. [Observed]
  ```
  NONE exit 0 {"authorized": false, "refusedBy": "symlink-escape", "realLinkTarget": "/STATE"} clean True
  R6-real-location-containment-case-folded-only exit 0 {"authorized": true, "refusedBy": null, "realLinkTarget": "/STATE"} clean True
  ```
- `tools/zz-rev542-breach-probe.test.ts` (`probe-breach.json`): one 503 route whose population reason is
  `project shape not-admitted free-text-sentinel-542`. [Observed] Unmutated, the only stderr line is the
  content-blind `route-non-success` event and `sentinelLogged` is `false`. Under R8 the line is
  `response-limit-breached` with `population: {'kind': 'unknown', 'reason': 'project shape not-admitted
  free-text-sentinel-542'}` and `sentinelLogged` is `true`. Under R9 it is withheld, as unmutated.

### 3.5 The record (rules 6 and 11)

In a second clone at `fb481b4d`:
- `python3 -I docs/evidence/syzygy-bpyt-7-16/record.py . --check` → `summary.json matches ; problems: 0`, exit 0.
- `--selftest` → last line `selftest: 39/39 mutations make a check fail`, exit 0; `grep -c SURVIVED` = 0 and
  `grep -c ^killed` = 39 over the 39 labelled lines (`record-selftest.log`).
- **On-disk mutation of one input:** I renamed V6's failing row in `rev535-at-head.json` to the
  "host origin only begins with" row. `--check` → `summary.json DIFFERS ; problems: 1`, exit 1, problem
  `V6-origin-suffix-match: survived at base, killed at head by ['…refuses an origin that the host origin only begins
  with'], not by its own row alone`. Restored with `git checkout`; `--check` matched again with 0 problems.
- Rule 11: `summary.json` names its subject (`"what": "git diff eb8fb6cb 0d7eaf08"`) and that diff's sha256
  `210dc44d…f083`, and each subject file's sha256 at both commits; I re-derived the six file digests and they match.
- The record's checks are sound for what they claim. Two limits, both in notes: its carrier check runs at `0d7eaf08`,
  not at the reviewed commit (N3), and its no-break-space check covers the three test files only (N4).

### 3.6 Titles

`tools/titles3.py` (`npx vitest list --json` over the three files): 53 titles at `eb8fb6cb`, 55 at `fb481b4d`. Added:
`browserRequestAllowed — the Origin is compared whole > refuses an origin that only ends with the host origin, and the
opaque origin null` and `RT3 — state-write boundary > refuses a sibling whose name differs from the state dir name only
in case, as traversal`. Removed: none. The diff shows the two other changed hunks are the bodies of the
other-whitespace row and the breach row, whose `it(` lines are byte-unchanged. **`Tests: +2 ~2 -0` confirmed.** The
lane's whole-repository 5,374 → 5,376 agrees with my full-suite listing below (5,376 passed + 5 skipped = 5,381 tests;
the difference from 5,376 titles is the lane's 3 duplicated titles).

### 3.7 Full vitest suite at the reviewed commit

`npx vitest run --reporter=json` at `fb481b4d`, after `npm ci` and `npm run typecheck`, TMPDIR `/tmp/r542-11`
(`suite-fb481b4d.json`; raw report sha256 `f406ddccc4823159606417118499e223a7091240f606af8bbb33f66b514a8599`, 2.0 MB,
deleted after summarizing). load1 43.74 before → 37.29 after.

```
{'reportSha256': 'f406ddccc4823159606417118499e223a7091240f606af8bbb33f66b514a8599', 'success': True, 'files': 246, 'total': 5381, 'passed': 5376, 'failed': 0, 'pending': 5, 'todo': 0, 'failedFiles': 0}
```

The 5 skips are environment-gated: `no-egress.test.ts` (strace unavailable), two `SYZYGY_POC_BUTLERS_REPO`-gated live
tests in `three-surface-poc-core`, the captured-page browser test and the live project-shape discovery test. So no
observed-repository content was read. The lane's single 5 s timeout in `polaris-authority-sweep.test.ts` did not recur.
Exit 0.

### 3.8 The three files on a merge with current main

`6cca1acf` = `fb481b4d` merged with main `973965a8` (section 1). `npx vitest run` of the three files, TMPDIR
`/tmp/r542-12`, load1 30.74: `{'success': True, 'files': 3, 'total': 55, 'passed': 55, 'failed': 0, 'pending': 0,
…}`, exit 0 (`merge-three-6cca1acf.json`).

### 3.9 Typecheck, governance, quotations, hosted CI

- `npm run typecheck` at `fb481b4d`: exit 0, no diagnostics (`typecheck-fb481b4d.log`).
- `python3 scripts/check_governance.py` at `fb481b4d`: `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not
  asserted`, exit 0.
- `python3 scripts/check_quotations.py` at `fb481b4d`: exit 0; `OK    QC-1  a quotation beside a path:line locator was
  said by that file — 38 quotations examined in 19 of 973 .md files scanned (…), 0 findings`.
- `gh pr checks 542`: `checks pass 25m6s` and `node pass 4m26s`; `gh run view` gives `governance-docs` and `node-ci`,
  both `headSha` `fb481b4d3b815e20ceeb245a22f6e8c6e6e32788`, `success`. `node-ci` runs `npm ci`, `npm run build`,
  `npm run typecheck`, `npm test` and `npm run test:system` (`.github/workflows/node-ci.yml` l.84–120).

### 3.10 Non-ASCII sweep of every changed line

`tools/nonascii.py` over `git diff eb8fb6cb fb481b4d` (`nonascii.json`). Denominator: 2,552 changed lines in 19 files.
- **Code: 33 changed lines (+29/−4) in the three test files, 0 non-ASCII characters.** [Observed]
- Whole files at `fb481b4d`: each of the three test files holds only U+2014 (em dash, in pre-existing describe titles)
  as non-ASCII, and **0 literal U+00A0**; `credentials.test.ts` holds the escape `\u00a0` once
  (`credentials.test.ts:391`).
- Evidence: 71 non-ASCII characters across 9 of the 16 evidence files, of which **1 is a literal U+00A0**, at
  `docs/evidence/syzygy-bpyt-7-16/own-head.json:53`, inside O1's verbatim vitest failure message (N4). A sweep of all
  16 evidence files at `fb481b4d` finds that one and no other.

### 3.11 The surface version

`tools/surface.py` applies `pwbSurfaceVersion`'s formula (`walkthrough-inputs.ts`: first 12 hex of sha256 over the
tree ids of `apps/three-surface-poc/src` and `packages/three-surface-poc-core/src`, newline-joined):

| Commit | Version |
|---|---|
| `eb8fb6cb` (base) | `polaris@ddd7d1721dd8` |
| `0d7eaf08` and `fb481b4d` | `polaris@8928d19927d7` (the core tree `b6f1afb7…` is unchanged; only the app tree moves) |
| `41932c3b` (main at start) / merge `b2dd0cfb` | `polaris@fc2b8509e5a1` / `polaris@dfb1833beea8` |
| `973965a8` (main now) / merge `6cca1acf` | `polaris@dec8a22f7541` / `polaris@3dfdcc5bd309` |

The base and head values match the PR. `git grep -l -F` for each of the 6 distinct values and for each one's 12-hex
part, at each of `0d7eaf08`, `fb481b4d`, `41932c3b`, `b2dd0cfb`, `973965a8` and `6cca1acf` (72 sweeps,
`surface.log`): 60 find nothing, and the 12 hits are all one file, this PR's own
`docs/evidence/syzygy-bpyt-7-16/summary.json`, carrying the base and head values at `fb481b4d` and at both merges.
No act or digest-bound record carries any of them (N3).

## 4. Findings

No blocking finding (no F-numbered item). Six notes.

**N1 — The real-location containment check is not pinned against case folding: R6 survives.** Severity: low
(pre-existing test gap on the class-1 write boundary; not caused by this PR).
- Evidence [Observed]: R6 folds case only in the second `isWithin` call (`credentials.ts:137`, the symlink-reality
  check). It survives 1,024 tests in 105 files at `fb481b4d` (`head-own-union.json`). The probe in 3.4 shows that
  under R6 a write through `state/link → <base>/STATE` is authorized (`"authorized": true`, real location `/STATE`,
  outside the state dir), while the unmutated code refuses it with `symlink-escape`.
- Why the new row misses it: `../RT3-CRED-…/f` is refused by the lexical call (l.119) before the real-location call
  runs. V4, the bead's target, folds the shared function, so it dies at the lexical call. The bead's item 1 did not
  ask for more, but the new comment "containment compares case too" (`credentials.test.ts:300`) is wider than the
  one call it pins. This is the shape the 7.14 rows already guard for a suffix at both call sites (l.289 lexical,
  l.338 real-location).
- Failure scenario: a later edit folds case in the real-location check only (for example to tolerate a platform
  `realpath` that changes case). CI stays green, and on a case-sensitive filesystem a symlink under the state dir into
  a case-variant sibling admits a write outside the daemon's one write home.
- Fix (follow-up, test-only): beside the l.338 row, add: `base = tempDir()`, `stateDir = join(base, 'state')`,
  `mkdirSync(join(base, 'STATE'), { recursive: true })`, `symlinkSync(join(base, 'STATE'), join(stateDir, 'link'))`,
  and assert `authorizeStateWrite(stateDir, 'link/escape.txt')` is refused with `refusedBy: 'symlink-escape'`. It
  passes today [Observed, probe `NONE`]. Check R6 is killed (spec in `own.json`). [Inferred] On a case-insensitive
  filesystem `{ recursive: true }` keeps the `mkdirSync` from throwing, and the refusal still holds there, failing
  closed.

**N2 — The breach allow-list is not pinned against a prefix match, which leaks free text: R8 survives.** Severity:
low (pre-existing; class 4 disclosure path; outside N7's case-only scope).
- Evidence [Observed]: R8 replaces `.includes(population.reason)` (`http-host/src/server.ts:157`) with
  `.some(listed => population.reason.startsWith(listed))`. It survives 1,024 tests. The probe in 3.4 shows that under
  R8 the reason `project shape not-admitted free-text-sentinel-542` is written to stderr whole; unmutated, the
  diagnostic is withheld.
- The breach row's comment says "any other reason is free text and withholds the whole diagnostic"
  (`server.test.ts:124-126`). Its unlisted populations are a different suffix (`unlisted-sentinel`) and now a case
  variant, so no population starts with a listed reason.
- Failure scenario: a later edit matches the allow-list by prefix ("the reason may carry detail"). CI stays green, and
  free text, which `server.ts:54-55` says is "Never sourced from request text", but may still be anything a route
  puts after a listed reason, reaches the daemon's stderr.
- Fix (follow-up, test-only): add a sixth population, `'project shape not-admitted unlisted-sentinel'`, expected to
  be withheld (`route-non-success` for `/breach-5`). The row's existing `not.toContain('unlisted-sentinel')` then
  guards it too. Check R8 is killed.

**N3 — The surface-version carrier claim is scoped to `0d7eaf08`, and the landing move is against main, not base.**
Severity: informational (record accuracy).
- Evidence [Observed]: the PR body says "`git grep` at head finds neither value in any tracked file", and
  `record.py`'s carrier check runs at its `HEAD`, `0d7eaf08`. At the reviewed commit `fb481b4d`, and at both trial
  merges, exactly one tracked file carries both values and both 12-hex parts: this PR's own `summary.json`
  (section 3.11). That file is evidence written by this PR and is bound by no act, so the conclusion stands: no bound
  record carries either value.
- On landing, main's version moves from `polaris@dec8a22f7541` (`973965a8`) to `polaris@3dfdcc5bd309` (`6cca1acf`);
  the PR states only base → head.
- Failure scenario: a later sweep for carriers of a surface version, reading the PR's "neither value in any tracked
  file", treats the `summary.json` hit as a new binding, or a cycle report copies the base → head pair as the version
  change main saw.
- Fix: in the dispositions record, state the carrier sweep at `fb481b4d` as "1 file, this PR's own `summary.json`",
  and give the landing move against the main it lands on. No byte of this PR needs to change.

**N4 — One changed evidence line holds a literal U+00A0.** Severity: informational.
- Evidence [Observed]: `docs/evidence/syzygy-bpyt-7-16/own-head.json:53`, in O1's failure message
  (`AssertionError: \"Bearer<U+00A0>aaaa…`), written by the PR 535 reviewer's runner with `ensure_ascii=False`. It is
  the only literal U+00A0 among the 2,552 changed lines, and it is verbatim tool output: `record.py`'s O1 check
  (`OWN`, `f'"Bearer{NBSP}a'`) relies on it to prove the no-break-space form is the one that failed. The 33 code lines
  hold none, and the N4 row writes the escape.
- Ruling: the brief's REVISE trigger "a literal U+00A0 in a changed line" exists for the Edit/Write hazard in test
  source; I rule that it does not reach a verbatim failure message in an evidence record, which must not be rewritten.
  The coordinator may read it literally; if so, the only byte-preserving remedy is a JSON re-serialization with the
  escape, which leaves the value unchanged.
- Failure scenario: a reader takes the PR's "`record.py` fails if any subject file holds a literal U+00A0" as covering
  the whole PR and is surprised by the evidence hit.
- Fix: the dispositions record says the no-literal claim covers the three test files, and names this one evidence line.

**N5 — Two changed rows keep titles narrower than their populations.** Severity: informational (test-rigor bar 7).
- Evidence [Observed]: "the minted token behind any other whitespace refuses, named" (`credentials.test.ts:390`) now
  also holds `` ` Bearer ${TOKEN}` ``, whose space is before the scheme, not behind it. "… and withholds an unlisted
  one" (`server.test.ts:127`) now withholds two. The PR keeps both titles on purpose, to keep the rows' identities,
  and says so; the bead allowed the forms to be added without a retitle. Each row's comment states its whole
  population.
- Failure scenario: a maintainer reading only a failure title for V2 looks for a fault after the scheme.
- Fix (optional, next touch of these rows): retitle, e.g. "the minted token after a leading space or behind any other
  whitespace refuses, named". Not needed for this PR.

**N6 — The lane's survival denominators are the 19 paths, not every test file that reaches the mutated modules.**
Severity: informational (rules 4 and 9).
- Evidence [Observed]: 36 test files outside the 19 paths transitively import the three mutated modules (3.1). The
  lane's "survived 580/580 at base" covers 580 tests; I re-ran the six at base over 1,022 tests in 105 files and all
  six still survive, so every claim holds.
- Failure scenario: a later row's "survives at base" over a hand-picked path list is false because an unlisted
  importer already kills it, and a redundant row is added (bar 10).
- Fix (process): derive a mutant run's file list from the import closure of the mutated module (`tools/importers.py` is
  one way) or run the whole suite. No change to this PR.

## 5. Every changed output

| Output | Changes? | Evidence |
|---|---|---|
| Product code (`packages/**`, `apps/**` non-test) | No | Blob ids equal at base and head (section 1); diff names only `*.test.ts` and evidence |
| HTTP responses, refusal strings, exit codes, wire formats | No | [Inferred, from identical product bytes] |
| Test population | `Tests: +2 ~2 -0` (53 → 55 in the three files; 5,376 passed at head) | 3.6, 3.7 |
| POC surface version | **Changes**: `polaris@ddd7d1721dd8` → `polaris@8928d19927d7` (base → head); on landing, `polaris@dec8a22f7541` → `polaris@3dfdcc5bd309` against main `973965a8` | 3.11. Printed at POC start and rendered on `/polaris` (`polaris.ts:922`); carried by no bound record; no run record exists |
| Governed plane (`.syzygy/**`, `openspec/**`) | No | Not in the 19 paths |
| `docs/evidence/syzygy-bpyt-7-16/` | 16 new files | The PR's evidence |
| Battery outputs | No | `check_governance.py` 0 FAIL; hosted `checks` pass |

## 6. Verdict on each of the bead's four items

1. **N3 (class 1), V4 case-folding `isWithin`: DONE.** The row at `credentials.test.ts:302` asserts exactly the
   bead's call and `refusedBy: 'traversal'`. V4 survives at base (1,022 tests) and dies at head by this row alone; R3
   shows the `refusedBy` pin is load-bearing. The `rt3-cred-` prefix holds letters, so the upper-cased name always
   differs [Observed: `mkdtempSync(join(tmpdir(), 'rt3-cred-'))`, l.33]. Residual: N1.
2. **N4 (class 4), V2 leading whitespace: DONE.** Both forms are added to the "any other whitespace" row
   (`credentials.test.ts:391`), the NBSP form as the escape. V2 and O1 each die at head on their own form; R4
   (`trimStart`) and R5 (NFKC) die too. Title kept (N5).
3. **N5 (class 4), V6 suffix match: DONE.** The row at `browser-origin.test.ts:31` holds the bead's suffix-shaped
   origin and `origin: 'null'`; V6 dies on l.32 and O2 on l.33. The describe keeps "compared whole", and the new
   comment says case variants are not pinned. V7 and V8 (R1, R2) survive as disclosed residuals, consistent with the
   bead's fix direction.
4. **N7 (optional), V10 case-folded allow-list: DONE.** `'Project shape not-admitted'` is a fifth population,
   expected as the content-blind `route-non-success` line for `/breach-4`, plus `not.toContain('Project shape')`. V10
   dies at head by the row's `toEqual` (l.161). Residual: N2.

Nothing beyond the items: no other row's body or title changes, the `/breach-0…3` expectations are unchanged in
content (the `/breach-3` literal became one element of a two-route `map` with the same fields), and the only other
edits are the three comments.

## 7. Test quality

Against `.claude/skills/th-engineering/subskills/test-rigor/SKILL.md` at `fb481b4d`:
- l.42: "**A test is worth keeping only if some plausible bug makes it fail.**" Met for all four rows: each has a
  named, plausible mutant that survives without it and dies with it (3.2), and R3–R5 are further plausible bugs the
  rows catch.
- l.52–54, bar 1 (assert behaviour): the rows assert the public functions' return values and the daemon's emitted
  stderr, not internals. Expected values are literals (bar 4, l.64–67), and the refusal vocabulary is hard-coded, not
  imported.
- l.78–81, bar 6 (deterministic): the case row uses a fresh `mkdtemp` and a pure decision, with no clock or ordering
  dependency; the three files passed 55/55 on the merge and 5/5 repeats in the lane's record.
- l.82–84, bar 7 ("A failure names the defect"): the two new titles state the behaviour; the two kept titles are
  narrower than their populations (N5), but the Bearer row's `JSON.stringify(header)` assertion message names the
  failing form, which is how 3.2 identified each kill.
- l.93–97, bar 10 ("A test is worth *adding* only if it catches a plausible bug no existing test catches … prefer
  extending it. Reviews state the net test delta"): two rows were extended rather than duplicated; the two added rows
  have different fixtures from their neighbours (no sibling directory; a different origin shape). Net delta stated and
  confirmed: `+2 ~2 -0`.
- l.102–105 (workflow 2, "name a one-line bug in the code under test this test would *not* catch but should"): R6 and
  R8 are such bugs (N1, N2).

## 8. Cleanup

Deleted: both scratch clones (`rev-542/clone`, `rev-542/rec`, including the local merge commits `b2dd0cfb` and
`6cca1acf`, which exist nowhere else and were never pushed), and the 2.0 MB raw full-suite report (its sha256 is in
3.7). Every TMPDIR `/tmp/r542-1` … `/tmp/r542-12` was removed by its tool or command; `ls -d /tmp/r542-*` finds none.
I killed no process. No file kept is over 300 KB.

**The lane's tooling hazard reproduced on my side.** [Observed] The Write tool turned a typed backslash-u escape into a
literal U+00A0 twice in my own files: once in this raw's draft (section 3.10, repaired by a Python
`str.replace(chr(0xa0), ...)` before the final rename; this file holds 0 literal U+00A0) and once in
`tools/nonascii.py:41`, inside the string literal of `text.count(...)`. There the literal still denotes U+00A0, so
the tool counted what it says it counts; I left its bytes as they ran, so the digest below is the tool that produced
`nonascii.json`.

Kept, under `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-542/`
(46 files besides this raw):

| File | sha256 |
|---|---|
| `base-own-union.json` | `089f2cb3cd0f2fefad851e691f1ce382438f24222fee26078fcbcb95e6d55771` |
| `base-own-union.log` | `ffa85b2e9919b37f3a27d942eb363cae3946b09888eca4bef405b37eda61deaf` |
| `base-targets-union.json` | `314ebff40b063561d9237939fc9a174d9460f8983374c2f073faf69a11a6f656` |
| `base-targets-union.log` | `f573912d102870e6bef32c099566b039e72ec3a70ac739c3a6b2a2f4f75666c4` |
| `check-governance-fb481b4d.log` | `98f2d50ede228b51f08bf5f2b253e2ce720f1dcfb05b8b6c3fd5d300ee247b75` |
| `check-quotations-fb481b4d.log` | `c664dd60aaecc6f410eb86967de57c59f594917e66e88e6bbc71c4b5de35d27f` |
| `files-19.json` | `07b2fd9139e64726385f37ec5697c70f5964f3f39c3c19fda9fb5498961a0653` |
| `files-union.json` | `bf804488f3d3aea8a709600c3b9ad0bf898f951323369f10a4e5e16da5f680db` |
| `head-own-19.json` | `0720dcfce24a6cc22c571f4897032d17d040fb3a39b013bd6d4b18f891baeded` |
| `head-own-19.log` | `0ddc68000db38f71ab0d0acd4a4909c2cee60aa41348026f9ee950ab9887d4a4` |
| `head-own-union.json` | `eddaf4eb59af722234b43d134465f8afa7810674ad05063f2640fb3e46bade32` |
| `head-own-union.log` | `8c1ea1797ae0862c89ae7b0a653de731d86188723a35c7c1eae201129b570d85` |
| `head-targets-19.json` | `b6b5564536803624e2ab29300ee8118bb7e59d989b2a78edd4f60ab73595dde8` |
| `head-targets-19.log` | `5c9d238ea92faca5c770dad967fdae430a8f621e796013c7003438f0fdc132da` |
| `importers-eb8fb6cb.json` | `c66367e3c3ac22ca702567578e795df50f9f61d521df32245c79f37160ee1103` |
| `importers-fb481b4d.json` | `3814dfa4ab95539bdbda729fd8ef8f1565a7e63f8189f82ebfcd2f08bef05b59` |
| `main-since-eb8fb6cb-973965a8.txt` | `548039db1d616806524ea6c850349f95c86db290f09116b8dfeb9310e5c89e49` |
| `main-since-eb8fb6cb.txt` | `6f675868a5d497a33e12341d10fa2a44d4c3aab83c2b300a7bfa84dd4f0107d8` |
| `merge-three-6cca1acf.json` | `fecefe85f60f037bad611572df3867b9cbbc0526e18ec796f7b908134ffbcaac` |
| `merge-three-raw.json` | `06d6700eb480a2d6a9eb44f7aea7f78cbb43e000abfe86ff26732a10caa48749` |
| `merge-three.log` | `133af6c0be079b359f7d177e9192d26818079e37b48741dd0fdf49b363b512f6` |
| `nonascii.json` | `c93562fa36f013576e3fa35ecc2c661aabbc2c1763f6a0567d2bc68882b2d9f9` |
| `npm-ci.log` | `df99c6c7794f3c7a0bdf8523d26eb6d3d2ab18a0f93e269ff66c8eb1c8165c93` |
| `own.json` | `7c733dc2aa5833004a6b6da390dcbd3f4db6774ab25fee290c4d930cc7cd78c2` |
| `pr-paths.txt` | `40ded7556d7e6986ce8a54ea751dcdcc219e19e0c81af2cbb7bd9fd121eac998` |
| `probe-breach.json` | `b59d85f904a882040b105b7a622207fe27fbf3625b1d38e11078daa6c271fc8c` |
| `probe-write.json` | `9b1e2c2eea236e8c8fc47c3be0410ebfaaebfc3e798b839075c41b46d75359f5` |
| `record-selftest.log` | `f92409c0a5bdd0823f3bd48a246bd63c744efbcb2cc28947e0796ad05b1132ff` |
| `suite-fb481b4d.json` | `359f116291e177b13f1966f731eb2bc916ebe4a6cdbe1fa55fb01a0d4d4723d6` |
| `suite-fb481b4d.log` | `42d579d4a6f1c0252b3dcec6d3b1372355b0db7962dfa6594ca6975dd69d281c` |
| `surface.json` | `572b32ee96898be45f6ebd43f8b8d2211f4ec33915444cda6b2e52e9dc3e8189` |
| `surface.log` | `e47b0c9ea5d2c833fe3315b4478a42836dc30b1e4b0bf9fb21de6e546006a3fd` |
| `targets.json` | `4f7a7c35f2f6dab38692d21343817fb5557e4b344487509e763e5128a1aabc09` |
| `titles3-eb8fb6cb.json` | `aae87cbdd1a5bd0d14406e1cde54c4e16e35f06139c053e0e405bad4260f1ec0` |
| `titles3-fb481b4d.json` | `eb31eadcd4d174a71a8b93a06c799df758fe870b942375c3f4f55162db14c957` |
| `tools/build_specs.py` | `73aec33a95177b8429d11324d85749649adfca30a02522bf4bdeac69724f5193` |
| `tools/importers.py` | `3f788afabbb6bbfe712553fd1c351534fa16f23f52af6c2eaf61965e8c4280d3` |
| `tools/mut542.py` | `80b55df630df0cfb8c4952009d0492c9589da30a741ed55a2c0c21c7ff516d91` |
| `tools/nonascii.py` | `55360cf3e7ebd95d1a57a3b87334c688a947f18b1dc9c834492b6b2d70654aa9` |
| `tools/probe.py` | `e7f108752e4a9c51dff8c7dac4bd882828231ae85bfa8fda765fb767207a8bd5` |
| `tools/suite_sum.py` | `2b34a67e55473d3d19812b6c74b5bd503f9ec0079d2441ccb975159a19ba5197` |
| `tools/surface.py` | `7ed901cff410c4588b4db4c746959ad65be51de2517d2691ce6d92ae66e61329` |
| `tools/titles3.py` | `a4d4745c881960345c3c7dc4c466e466097b2371d46f34c9ff6e9783185878e0` |
| `tools/zz-rev542-breach-probe.test.ts` | `94399e4946561f7cf7b0a9795bd33e91da5377b48878f96d03746ae8c09e7b47` |
| `tools/zz-rev542-write-probe.test.ts` | `7387dabfad7e2e952abe52e3701f42e4ab04b11844057a46de700cc06a2c92a0` |
| `typecheck-fb481b4d.log` | `16ec4cd0ac6c93c48bb2b0beed58c59bf9624ee2e6eeb774b810ea969fe40edc` |
