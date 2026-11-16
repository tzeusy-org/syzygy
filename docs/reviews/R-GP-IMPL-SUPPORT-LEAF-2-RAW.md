# R-GP-IMPL-SUPPORT-LEAF-2 — CC-REV-1 implementation review of syzygy-bpyt.6.3 stack 1, round 2
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: a5ab2b28
Subject: r2-review.diff sha256 0bf9843efcc8755862ecd61f24d65fdef8e7a39016a174e1221332f5837157c9

Reviewer: rev-530b, fresh context, did not author the change and did not write round 1. Date: 2026-10-27.
PR #530, branch `agent/syzygy-bpyt.6.3`, stack 1 of 3 (bead `syzygy-bpyt.6.3`, finding DC-3). Base `546f1ff066e2ffef749c757cdb4621336039113b`.
This is a narrow round: round 1's repair items, the merge of main, and whether either broke anything they touched.
Scratch root (paths below are relative to it unless absolute):
`/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-530b/`.

Summary. F1 is repaired: I reproduced the arms at `fe3855a1` and at `a5ab2b28`. With the alias in place, the S10 proof
refuses eight support-source mutants with network or stdout effects of six kinds, both with every `dist/` present and
with every `dist/` absent. N3, N1, N6 and N7 are repaired as round 1 proposed. The merge of main is git's own merge
everywhere except `package.json`, and that file is the exact union of both sides' lists. Of the 81 subject paths outside
`docs/`, 78 carry the same change as round 1's subject. I observed no changed output. Six notes, N8–N13, none blocking. N9
is the one to read first: the new purity test is a token denylist. Ambient-global forms survive it, and one deliberately
obfuscated file read passes both the purity test and the S10 proof. Section 2 says how I read the verdict rule on that
point.

---

## 1. Subject identity checks

All [Observed], by script. The clone is from `/home/tze/GitHub/syzygy`, plus `git fetch` of
`https://github.com/Tzeusy/syzygy.git`.

| Check | Result |
|---|---|
| `sha256sum` of `r2-review.diff` (lead's file) | `0bf9843efcc8755862ecd61f24d65fdef8e7a39016a174e1221332f5837157c9`, equal to the subject line |
| `git diff 546f1ff0 a5ab2b28 \| sha256sum` | the same digest |
| shape | `96 files changed, 5909 insertions(+), 213 deletions(-)`; 81 paths outside `docs/` |
| `r2-repair.diff` / `git diff fe3855a1 094cc542` | both `d0dd53c38fd32286c81835438fccf8615d06fadb4eaefa75cf2011efceabba2f`; `9 files changed, 1474 insertions(+), 5 deletions(-)` |
| `r2-mergeev.diff` / `git diff 767588d4 a5ab2b28` | both `24b3a7b61657a2080a23499b5c3357db7b7b00206b4481e5bd1016f6f17257f6` |
| commits | `8bd514d7`: 2 files, both tests (`no-egress.test.ts` +1, `support-purity.test.ts` +67). `094cc542`: 7 files under `docs/evidence/syzygy-bpyt-6-3/`. `767588d4`: parents `094cc542…` and `546f1ff0…`. `a5ab2b28`: 2 evidence files |
| `git merge-base 546f1ff0 a5ab2b28` | `546f1ff066e2…`: the base is main after #529 |
| round-1 raw | `R-GP-IMPL-SUPPORT-LEAF-1-RAW.md` sha256 `215723bc3f6c26277a38722e293d3861491772f3027c0cf5c4ae6bf66da89fcb` |
| PR head (`gh pr view 530`) | `a5ab2b287266e9be6b8e96b381d014cb8e73d9d4 OPEN`; `git ls-remote` agrees |
| PR body | fetched at the start and again before writing; both sha256 `9133788de4ff1ddde9b5f968728f77f6662dce73f12398525c5188b9db9f7951` (`pr-body.txt`) |
| hosted checks (`gh pr checks 530`) | `checks pass 1m59s`; `node pass 2m57s` |
| record tool digests (`toolsSha256`, 13 tools) | 13 of 13 equal to the committed blobs at `a5ab2b28` |
| `toolsEditedAfterTheRuns` | `ranAsSha256` equals the `fe3855a1` blob for both `diff-probe.mjs` (`f7fa07aa…`) and `hash-trace.cjs` (`b0e07e72…`). `git diff -U0 fe3855a1 a5ab2b28` changes only `//` lines in each |
| lane report `lane-c/p63r1/report-530-r1.md` | **absent**. `find` over the scratchpad finds no `report-530*`. I worked from the PR body and the record |

**Main movement** [Observed]. `main` is now `e5080f4dcdcc208127ae5dc0b915acf413df9764` (#522 as `fe38336e`, then #531
as `e5080f4d`). `git diff --name-only 546f1ff0 e5080f4d` lists 204 paths (`main-moved-final.txt`):
- 201 under `docs/`;
- `packages/polaris-dossier/src/argv.test.ts`;
- `packages/polaris-generation-core/src/workspace-reach.test.ts`;
- `packages/polaris-generation-core/src/workspace-reach.testkit.ts`.

Their intersection with the 96 subject paths is **0** (`comm -12`, empty).
`git merge-tree --write-tree a5ab2b28 e5080f4d` is clean: tree `38b079b55e961329170442bfb6db711555c245de`, exit 0. On
a local merge with that tree, with every `dist/` absent, #531's tests and the touched projects pass:
- the run covered `argv.test.ts`, `workspace-reach.test.ts`, `packages/support` and `no-egress.test.ts`;
- result: `Test Files  6 passed (6)`, `Tests  150 passed | 1 skipped (151)` (`vitest-localmerge-main531.log`).
The skip is the without-strace placeholder.

## 2. Clauses relied on, and the class ruling

Each is quoted from the file at `a5ab2b28` (`git show a5ab2b28:<path>`). `tools/quote_check.py` re-checks every
quotation and line cite in this raw against those bytes (section 3).

- CC-REV-1, `.syzygy/governance/policies/craft-and-care/review-and-documentation.md`:
  - `:18-20`: "Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the
    agent performing the change never finally decides which classes it touches."
  - `:31-32`: "1. **authority boundaries** — write-universe, typed-authority table, adapter authorization (VIS-5, VIS-6);"
  - `:35-36`: "3. **deterministic observation** — snapshot composition, evaluation identity, the deterministic/inferred seam (VIS-7);"
  - `:37`: "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
  - `:45-46`: "**Class membership is contested by default and is never finally determined by the agent performing the change**"
  - `:51`: "**A reviewer or the owner** may reclassify at any time."
- GP-Q0, `.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`:
  - `:52-55`: "\"Behavior-preserving\" means none of the following changes:" / "a rendered byte, a wire format, a refusal string or an exit code;" / "a signed or digest-bound artifact;" / "a consent, security or retention decision."
  - `:62`: "**Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4 (security), and class-6 pull requests that remove an endpoint."
  - `:64-66`: "an old-versus-new differential over a mutated-record corpus that includes records with altered prose;" / "a rule-6 mutant for each predicate;" / "a non-blocking owner notice in the cycle report."
  - `:95-96`: "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."
- `AGENTS.md`:
  - `:123-124` (rule 4): "Read a check's output, not its exit code, and check its denominator against the whole population."
  - `:126-127` (rule 6): "Mutate the input and confirm the check fails, per predicate, before trusting it"
  - `:132` (rule 9): "A claim of absence needs a sweep with a denominator."
  - `:134-135` (rule 11): "An evidence record names its subject and the subject's digest"
  - `:282-284`: "Root Vitest `test.projects` must alias `@syzygy/cap1-core`, `@syzygy/cap1-daemon` and `@syzygy/http-host` to source; verify with every `dist/` absent."
- Test-rigor bar, `.claude/skills/th-engineering/subskills/test-rigor/SKILL.md` at `a5ab2b28`:
  - `:42`: "**A test is worth keeping only if some plausible bug makes it fail.**"
  - `:64-67` (bar 4): "A test that mirrors the implementation's logic to compute its expected value, or that asserts a mock returned what the mock was told to return, verifies nothing. Expected values are literals or independently derived."
  - `:85-86` (bar 8): "Duplication, dead fixtures, and copy-paste setup rot suites until people stop reading failures."
  - `:93-95` (bar 10): "A test is worth *adding* only if it catches a plausible bug no existing test catches"
  - `:103-104`: "apply the mutation thought-experiment: name a one-line bug in the code under test this test would *not* catch but should."

**Class ruling** (mine): unchanged from round 1. The classes are 1, 3 and 4, and 6 is additive only.
- **The repair** changes no production file: `8bd514d7` touches two test files, and `094cc542` and `a5ab2b28` touch only
  evidence [Observed, `git diff --stat`]. It strengthens the class-4 egress proof and the purity pin.
- **The merge** brings only main's own code, which is in the base, not the subject. The subject's production change is the
  one round 1 reviewed: 78 of 81 non-`docs/` paths carry identical removed and added lines (section 5).
- **GP-Q0's stop clause is not triggered** [Observed]:
  - The live owner-act gate rows are 483 with 0 differences, and their output digest equals the record's pre-merge one.
  - The probe's two gate evaluations are equal.
  - No production byte changes in the repair.
  - The S10 proof and the purity test now refuse more candidate edits. That changes verification, not what any product gate
    accepts or refuses.

**How I read the verdict rule's support-mutant clause.** The brief's REVISE list includes "a support mutant with I/O the S10
proof or the purity test accepts". My reading:
- the mutated package performs I/O when it runs;
- the committed tests together (the two layers) accept it;
- it is a plausible bug in the sense of test-rigor `:42`.

Under that reading, one candidate exists, E9 (N9). It reads a file only through `globalThis['process']` and
`'node:f' + 's'`, written to dodge two tokens, so I hold that it is not a plausible bug.

Under a literal per-layer reading, more mutants qualify:
- E6, E7 and E8 have I/O that the purity test accepts and the S10 proof refuses;
- E9 has I/O that both accept.

Under that reading this round would be REVISE. I state the reading so that the coordinator can apply the other one.

## 3. What I ran, and the results

All [Observed] unless labelled otherwise.

**Clones.** I used three clones:
- `clone` at `a5ab2b28`;
- `clone-fe` at `fe3855a1`;
- `clone-p` at `a5ab2b28`, for static work and the purity runs.
`clone` was later checked out at `546f1ff0`, and then at a local merge with `e5080f4d`. Each clone ran `npm ci`:
`added 117 packages` at `a5ab2b28` and `added 116 packages` at `fe3855a1` and at `546f1ff0`. Each then ran `npm run build`
(exit 0, 12 and 11 `dist/` directories), plus `npm run build:poc` for the probes. Every suite ran under a short private
TMPDIR (`/tmp/r530b-<n>`, `/tmp/r530q`, `/tmp/r530w`).

| Run | Tool | Result |
|---|---|---|
| F1 arms, 7 mutants × 2 `dist/` modes, at `fe3855a1` and at `a5ab2b28` | `tools/egress_arms.py` (mine) | section 4, F1 |
| 4 more S10 mutants at `a5ab2b28`, then 1 more | the same tool | section 4, F1 |
| S10 entry-drift probe | `tools/entry_drift_probe.py` | N10 |
| esbuild subpath probe | `tools/alias_subpath_probe.mjs` | subpath → `Cannot read directory "packages/support/src/index.ts": not a directory` |
| purity mutants: 13 of mine plus 3 drafter-parity rows | `tools/purity_mutants.py` | section 4, N3 |
| 3 more purity mutants; T4 and T5 reader mutants | `tools/purity_mutants_2.py`, inline (`purity-T5.txt`) | section 4, N3 |
| the S10 mutants against the purity test | `tools/cross_purity.py` | section 4, N3 |
| `merge-resolution-check.py` at `767588d4` | the lane's tool | equal to the record's `mergeOfMain.check` (`True` by script) |
| `merge-resolution-check.py --selftest` | the lane's tool | `{"cases": 8, "failures": []}` |
| independent `git merge-tree --write-tree 094cc542 546f1ff0` | git | section 5 |
| 9 merge mutants | `tools/merge_check_mutants.py` | section 5 |
| union and build-order check | `tools/union_order_check.py` | section 5 |
| re-based change equality | `tools/change_equality.py` | 3 of 81 paths differ; section 5 |
| `site-equivalence.py`: `a088f1ca..9029e1cf`, `c104771f..fe3855a1`, `546f1ff0..a5ab2b28` | the lane's tool | section 7 |
| `site-equivalence.py --selftest` | the lane's tool | `{"cases": 13, "failures": []}` |
| registry-bound blob digests at 9 commits | `git show \| sha256sum` | section 7 |
| digest citers of the 73 subject paths existing at `546f1ff0` | `tools/digest_citers_r2.py` | section 7 |
| probe, `546f1ff0` vs `a5ab2b28`, one TMPDIR, plus a second TMPDIR | the lane's `diff-probe.mjs` and `compare-probe.py` | section 7 |
| live owner-act gate harness, `546f1ff0` vs `a5ab2b28` | `tools/live_diff.mjs` (round 1's extract, sha256 `eedf318b…`, equal to the record's `liveDiffHarnessSha256`) | section 7 |
| `sweep.py` at `094cc542`, `767588d4`, `a5ab2b28` | the lane's tool | N8 |
| `population-audit.py` at `a088f1ca`, `8bd514d7`, `a5ab2b28`, plus `--selftest` | the lane's tool | selftest `{"cases": 8, "failures": []}`; section 4, N1 |
| narrative probe, plus my getter and Proxy probe | the lane's `narrative-freeze-probe.mjs`; `tools/narrative_getter_probe.mjs` | section 4, N7; N12 |
| N1 reachability | `tools/reach.py` | section 4, N1 |
| full suite, every `dist/` absent, `--testTimeout=120000 --hookTimeout=120000` | `tools/dist_absent_run.py` | `Test Files  242 passed \| 3 skipped (245)`, `Tests  5333 passed \| 5 skipped (5338)`, `vitest exit 0`. The "dist directories present during the run" list is `[]` |
| `npm run typecheck` (`clone-p`) | npm | exit 0. The log is npm's echo of `tsc -b packages/support packages/cap1-core packages/http-host …` with no diagnostics |
| `python3 scripts/check_governance.py` | the repository's script | `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`; `CG-2a … 2475 files examined, 0 findings` |
| `python3 scripts/check_quotations.py` | the repository's script | exit 0. Notes only, e.g. `note  QC-1  7 of 37 found outside their cited lines (±2): locator drift, reported, never failed` |
| this raw's quotations and line cites: 42 against the bytes at `a5ab2b28` or `a088f1ca`, one of them the record's merge reading, and 3 against `pr-body.txt` | `tools/quote_check.py` | `rows 45 failed 0`. Rule 6: a PR-body copy with lines 5 and 67 mutated gives `rows 45 failed 2`. I deleted that copy |

I did not run the full `PROJECT-STATUS.md` battery. The PR's `commands=110 nonzero=0` is [Unknown] to me.

In the full dist-absent run, the 5 skipped tests are:
- the S10 without-strace placeholder;
- three `*.live.test.ts` tests;
- `polaris-opening-index.browser.test.ts`.

Every affected file passed (`vitest-distabsent-a5ab2b28-summary.json`):

| File | Passed |
|---|---|
| `support-purity.test.ts` | 13 |
| `sha256.test.ts` | 4 |
| `deep-freeze.test.ts` | 5 |
| `no-egress.test.ts` | 2, plus the placeholder skip |
| `http-host` `credentials.test.ts` | 26 |
| `http-host` `package.test.ts` | 2 |
| `http-host` `shutdown.test.ts` | 6 |
| `owner-act-drafter.test.ts` | 3 |
| `test-artifact-verification-live-source.test.ts` | 58 |

## 4. Round 1's repair items

### F1 (blocking in round 1): **repaired**

The fix is `packages/polaris-dossier/src/no-egress.test.ts:45`,
`'@syzygy/support': src('packages/support/src/index.ts'),`. The merge kept main's `:43`, `'@syzygy/http-host'`, beside it.

**My arms**. Each arm is one file, `no-egress.test.ts`, run by vitest's JSON reporter. The "line" column is the
failing assertion's location in the test.

| Mutant (support source) | Kind | `fe3855a1` dist present | `fe3855a1` dist absent | `a5ab2b28` dist present | `a5ab2b28` dist absent |
|---|---|---|---|---|---|
| C0 | clean control | pass (2 \| 1 skipped) | exit 1, `Build failed with 32 errors:` | pass | pass |
| M0 | the lane's `node:dgram` udp4 bind at import (`sha256.ts`) | pass | build failed | **killed**, line 82 | **killed**, line 82 |
| E1 | dynamic `import('node:net')`, a TCP connect to 127.0.0.1:9 on the **first `sha256()` call** | pass | build failed | **killed**, 82 | **killed**, 82 |
| E2 | `node:child_process` `execFileSync` of a node child that binds udp4 (`deep-freeze.ts`) | pass | build failed | **killed**, 82 | **killed**, 82 |
| E3 | udp6 (`AF_INET6`) bind to `::1` at import | pass | build failed | **killed**, 82 | **killed**, 82 |
| E4b | global `fetch('http://127.0.0.1:65530/')` on the first `deepFreeze()` call, no import | — | — | **killed**, 82 | **killed**, 82 |
| E6 | `console.log` at import | — | — | **killed**, line 71: `SyntaxError: Unexpected token 's', "support lo"... is not valid JSON` | **killed**, 71 |
| E7 | `globalThis.fetch?.(…)` at import | — | — | **killed**, 82 | **killed**, 82 |
| E8 | `new WebSocket('ws://127.0.0.1:65530/')` at import | — | — | **killed**, 82 | **killed**, 82 |
| E4 | `fetch` to port 9 | pass | build failed | pass | pass |
| E5 | `node:fs` write at import (not network) | pass | build failed | pass | pass |
| E9 | file read through `globalThis['process'].getBuiltinModule('node:f' + 's')` at import | — | — | pass | pass |

Line 82 is `expect(run.calls.filter((line) => INTERNET_FAMILY.test(line))).toEqual([])`, and every killed row fails
there with `AssertionError: expected [ …(2) ] to deeply equal []`. The canary test passed in every arm. Each arm left
`git status --porcelain` empty.

Notes on the rows that pass:
- **E4 is an invalid mutant**. `node -e "fetch('http://127.0.0.1:9/')…"` gives `port 9: fetch failed | bad port`: port 9
  is on the Fetch standard's bad-port list, so no socket was ever made. E4b, on a closed port fetch tries (`port 65530:
  fetch failed | ECONNREFUSED`), is killed.
- **E5 and E9 are outside S10's predicate.** That predicate is Internet-family sockets (`:82`), plus stdout, stderr and
  status (`:69-77`). E5's write ran in the bundled driver at `a5ab2b28`: 4 files written, `process.argv[1]` =
  `…/dossier-no-egress-*/driver.mjs`. At `fe3855a1`, only vitest's tinypool worker wrote. So the driver there ran the
  clean `dist`, which is F1 itself. The purity test kills E5 (below), but not E9 (N9).

**F1, reading.**
- At `fe3855a1`, every mutant passes with `dist/` present, because the proof reads the clean dist. The proof cannot
  build with `dist/` absent.
- At `a5ab2b28`, every network or stdout mutant is refused both ways, and the clean tree passes both ways.
- The lane's record (`roundOneRepair.f1`) agrees, arm for arm, at `fe3855a1` and `8bd514d7`.

**Could the alias drift from the package's real entry with the proof green?**
- **A new subpath export: no, the proof goes red.** esbuild maps `@syzygy/support/x` onto
  `…/packages/support/src/index.ts/x`, and the build fails: `Cannot read directory "packages/support/src/index.ts": not a
  directory` (`alias-subpath-probe.json`).
- **A redirected entry: yes, silently.** I moved `exports["."]` to `./dist/main.js` and added a `src/main.ts` that
  re-exports `./index.js` and binds udp4, leaving `src/index.ts` in place. The S10 proof stays `passed: 2, failed: 0`,
  because the alias still bundles `index.ts`. Node's own resolution of `@syzygy/support`, from
  `packages/three-surface-poc-core`, shows `socket(AF_INET, SOCK_DGRAM|SOCK_CLOEXEC|SOCK_NONBLOCK, IPPROTO_IP) = 21` under
  strace (`entry-drift-probe.json`). The probe restored the files, and `git status` was empty afterwards.
- **A new workspace package with no alias** reopens F1's class: it resolves to its `dist`.
- These are N10. All ten hard-coded aliases share the property. It predates this PR.

### N3: **repaired** (as round 1 proposed; limits in N9)

The fix is `packages/support/src/support-purity.test.ts`, with 13 tests:
- 4 guard tests: sources not empty; imports allowlisted to `node:crypto` and `./x.js`; the drafter's forbidden tokens;
  no dependency and no tsconfig reference;
- 9 specifier-reader cases.

By script, its forbidden list, its three reader regexes and its comment filter are identical to
`owner-act-drafter.test.ts` at `546f1ff0` (`True`, `True` with 3 of 3, `True`).

**Each test against a mutant of its own (rule 6).** The kill matrix combines the record's 17 rows with my rows:
- `scans the package sources`: killed only by my T5 (the `SOURCES` filter changed to `.mts`), which fails it and the
  allowlist test, `2 of 13`;
- the allowlist test: 11 mutants;
- the forbidden-token test: 9;
- the manifest test: 2 (P8, P9);
- 8 of the 9 reader cases: T1–T4. My re-run of T4 fails 5 tests, including `reads "import type { X } from
  '@syzygy/cap1-core';"`. The record's T4 row lists only 4 names because the lane's tool truncates the list (N13);
- killed by no mutant: the reader case `reads "export const a = 1;"`, a negative control with no string in it. It is low
  value but harmless (bar 10).

**Bar 4.** Every expected value is a literal: the allowlist regex, `['node:crypto']`, the forbidden list and the reader
cases. The package sources are the input, not the oracle. No tautology.

**Bar 8.** The reader and the forbidden list are copies of the drafter test's. A strengthened drafter list will not
follow (N9, fix (e)).

**My purity mutants** (`purity-mutants.json`, `purity-mutants-2.json`; I wrote down an expectation before each run; every
run ended with `status after: ''`):

| Id | Mutation | Purity test |
|---|---|---|
| RP1 | `export { readFileSync } from 'node:fs'` in `index.ts` (a re-export) | killed, 2 of 13 |
| RP4 | `createRequire(import.meta.url)('node:fs')` | killed, 2 |
| RP9 | `import fs = require('node:fs')` | killed, 2 |
| RP10 | `src/io/read.ts` with `node:fs`, re-exported from `index.ts` | killed, 1 (`./io/read.js` fails the allowlist) |
| RP11 | `src/net.mts` with `node:http`, re-exported as `./net.mjs` | killed, 1 |
| **RP2** | `(globalThis as Record<string, any>)['process']['env']['HOME']` | **survives**, 13 of 13 pass |
| **RP3** | `console.log('support loaded')` at top level | **survives** |
| **RP5** | `export const open = (url: string): WebSocket => new WebSocket(url)` | **survives** |
| **RP6** | `globalThis['process'].getBuiltinModule('node:f' + 's').readFileSync('/etc/hostname')` at import | **survives** |
| **RP7** | `performance.now()` at import | **survives** |
| **RP8** | `randomBytes` from the allowed `node:crypto` | **survives** |
| **RP12** | `import (['node', 'ne' + 't'].join(':'))` (a space, a computed specifier) | **survives** |
| **RP13** | `const send = globalThis.fetch;` then `send(u)` | **survives** |
| **RP14** | `src/io/read.ts` with `node:fs`, exposed only through a new `exports["./io"]` subpath | **survives** (the scan is not recursive, and `exports` is unchecked) |
| **RP15** | `void globalThis.fetch?.('http://127.0.0.1:65530/')` at import | **survives** |
| **RP16** | `globalThis.process?.env['HOME']` | **survives** |
| D2, D5 (parity) | RP2's and RP5's forms placed in `owner-act-drafter.ts`, against the drafter's own test | **survive**, 3 of 3 pass |

**Cross matrix** (`cross-purity.json`): the S10 mutants run against the purity test:
- M0, E1, E2, E3, E4, E4b and E5 are killed;
- E6, E7 and E8 survive it, and S10 refuses all three when they run in the dossier closure;
- E9 (RP6) survives both.

**Reading.** The import allowlist is closed and holds every import form I tried (RP1, RP4, RP9, RP10, RP11). The token
denylist is open:
- ambient globals reach I/O without an import (RP3, RP5, RP13, RP15);
- or they reach ambient input (RP2, RP7, RP8, RP16).

Round 1's R6 and R8 (`node:http`, a `node:fs` read) are the record's P2 and P1, both killed. So the repair does what round
1 asked, and holds the support package to exactly the guard the drafter held itself to before the PR. N9 has the residual.

### N1 (text): **repaired**

**Figures reproduced** with `population-audit.py` (`popaudit-*.json`):

| Commit | Name rule: files / sites / local `sha256` / `deepFreeze` | Reachability rule: files / sites / local `sha256` / `deepFreeze` |
|---|---|---|
| `a088f1ca` | 233 / 62 / 25 / 7 | 237 / 64 / 26 / 7 |
| `8bd514d7` | 236 / 6 / 1 / 1 | 240 / 8 / 2 / 1 |
| `a5ab2b28` | 241 / 6 / 1 / 1 | 245 / 8 / 2 / 1 |

**Second method** (mine): every `.ts` under `packages/*/src` and `apps/*/src`, excluding only `*.test.ts` and
`*.testkit.ts`, with Python `re`. It counts 241 files and 64 sites at `a088f1ca`, and 249 files and 8 sites at
`a5ab2b28`. The 8 are listed under N8.

**Both named sites are unchanged.**
- Neither file is among the 96 subject paths (0 of 2).
- `git diff --quiet c104771f a5ab2b28` exits 0 for both files.
- So leaving them in place changes no output.
- A later replacement would be equivalent. `junitDigest` takes a `Uint8Array` with no encoding, and the package's
  `sha256` hashes only the view's bytes, which round 1's R1 pins [Inferred: Node semantics].

**Reach** (`reach-n1.txt`, static relative-import closure):
- **The gates.** Neither file is reached by `body-read-authority.ts` (7 files reached), `walkthrough-judgment.ts` (9),
  `act-fields.ts` (1), `owner-act-drafter.ts` (24) or `response-identity.ts` (6).
- **`junitDigest` has two other reachers.**
  - `apps/three-surface-poc/src/poc-main.ts`, through `three-surface-poc-core/src/index.ts`.
  - The no-egress driver, through `polaris-dossier/src/screen.ts` and then that same `index.ts`.
  - Its output is the `digest` field of an operator-reported test-artifact record (`test-artifact-verification.ts:367`).
- **The fixture's local `sha256`** is reached only by `polaris-accessibility-main.ts`, through
  `polaris-accessibility-variants.ts`.
- **Bound records.** Whether any digest-bound record carries a `junitDigest` value is [Unknown] to me: I did not sweep for
  JUnit digests. Because the site is byte-unchanged, that cannot be a change here.

**The PR body and the record** name both sites, say they are left in place by the repair and not "left on purpose by the
sweep", and restate the figures. That is true and complete for N1. N8 covers the merge's effect on the "left on purpose"
list.

### N6 (text and reproduction): **repaired**, with caveats in N13

**What changed.**
- The header of `diff-probe.mjs:3-7` now names the TMPDIR dependency and `/tmp/lc63x`.
- The record names `tmpdirOfTheCommittedOutput: "/tmp/lc63x"`, the command, the clone commit and the governance revision.
- `hash-trace.cjs` no longer says "not committed".

**My checks.**
- **Byte reproduction: not attempted.** On this host, `/tmp/lc63x` exists and is lane-c's live working directory
  (`drwxr-xr-x … 10:13`, holding `battery-r1.out` and other files). I did not write into another session's directory,
  and user namespaces are unavailable here: `unshare: write failed /proc/self/uid_map: Operation not permitted`. So
  byte-for-byte reproduction of `c491d2f3…` is [Unknown] to me.
- **Determinism across the merge.** Under TMPDIR `/tmp/r530q` (the same length as `/tmp/lc63x`), `546f1ff0` and
  `a5ab2b28` give byte-identical outputs, `1cc8b7c34af0…`. `compare-probe.py` gives `"rowsCompared": 68`,
  `"rowsThatDiffer": 0`.
- **Against the committed output**, `rowsThatDiffer: 24`: 24 of 24 model rows and 0 of 44 helper rows.
- **Path dependence.** A second TMPDIR of mine, `/tmp/r530w`, differs from `/tmp/r530q` in 24 rows.

So the dependence is on the path string, as the record says, and not run-to-run noise. This is consistent with the
record's `otherTmpdirControl`.

### N7 (text): **repaired** (one completeness note, N12)

- **The PR body** now names the third difference, a non-empty typed-array member, with the partial states. It no longer
  says "only".
- **The lane's `narrative-freeze-probe.mjs`**, re-run by me, gives an object equal to the record's `roundOneRepair.n7.probe`
  (`equal to record probe: True`).
- **Base blob.** `polaris-narrative.ts` at `a088f1ca` has sha256 `b8e2f77c…`, equal to the record's.
- **Reachability** is as round 1 found.

## 5. The merge of main

**Computed tree** [Observed].
- **The lane's tool.** `merge-resolution-check.py` computes tree `f6b5e1da2b5e…` with `merge.conflictStyle=diff3` and
  full-SHA labels. Its output equals the record's `mergeOfMain.check`: 5,098 paths, 5,097 equal, and one hand-resolved
  conflict, `package.json`, in 2 regions.
- **My independent run.** `git merge-tree --write-tree 094cc542 546f1ff0` exits 1 with `CONFLICT (content): Merge
  conflict in package.json`. It auto-merges exactly the 10 paths the record lists. The comparison against the record's
  `pathsChangedByBothSides` (`both-sides.txt`) prints `True`.
- **The diff.** This host's `zdiff3` with short labels gives tree `5c37d35e…`, a different blob for the marked file only.
  `git diff --name-status 5c37d35e 767588d4^{tree}` lists `M	package.json` and nothing else, over 5,098 paths on each
  side.

**The `package.json` union** (`union-order-check.json`; base `c104771f`, ours `094cc542`, theirs `546f1ff0`) [Observed].
- **Lists.** For each of `build`, `build:poc` and `typecheck`: `setEqualsUnion: True`, `noDuplicates: True`,
  `oursOrderKept: True`, `theirsOrderKept: True`, `lostFromEitherSide: []`. Ours added `packages/support`, theirs added
  `packages/http-host`.
- **`packages/support`** is first in all three lists. Every project that imports `@syzygy/support` declares the dependency
  and has a tsconfig reference to it: `three-surface-poc-core`, `polaris-generation-core`, `polaris-generation-consent`,
  `polaris-dossier` and `apps/three-surface-poc`.
- **`packages/http-host`** follows its dependency `cap1-core` and precedes its dependents `cap1-daemon`, `apps/syzygy` and
  `apps/three-surface-poc`.
- **The out-of-order edges.**
  - `build` and `typecheck` have 3 each: `apps/syzygy` before `polaris-dossier`, and `apps/three-surface-poc` before
    `polaris-generation-core` and `polaris-generation-consent`.
  - `build:poc` has 1: `polaris-generation-consent` is absent from it.
  - Every one is covered by a tsconfig reference, which `tsc -b` builds first.
  - Every one already stands in the base region text the record quotes. None involves `support` or `http-host`.

**Merge mutants** (`merge-check-mutants.json`; new commits with the same parents, built through a private index):

| Id | Mutation | `merge-resolution-check.py` | My union check |
|---|---|---|---|
| MM0 | none | no difference | passes |
| MM1 | the lane's: drop `"@syzygy/http-host"` from `apps/three-surface-poc/package.json` | reports `apps/three-surface-poc/package.json` | passes (not its scope) |
| MM2 | the region drops `packages/http-host` from `build` only | **not reported** (in-region) | **fails** |
| MM3 | the region keeps ours only | **not reported** | **fails** |
| MM4 | the region drops `packages/support` from `typecheck` | **not reported** | **fails** |
| MM5 | the region moves `packages/support` to the end of `build` | **not reported** | **fails** |
| MM6 | an edit outside the region (`"test"` script) | reports `package.json` | passes |
| MM7 | a file added | reports it | passes |
| MM8 | `packages/http-host/src/escape-html.ts` removed | reports it | passes |
| MM9 | a mode change on `sha256.ts` | reports it | passes |

`merge-resolution-check.py` **exits 0 in every row**, including the rows where it reports a difference (N11). The record
says in-region text "is for the reader to check" (`mutationControl.reading`). I checked it, and it is the union.

**The rest of the merge** [Observed]:
- **Re-based change equality** (`change-equality.json`): `git diff -U0 c104771f fe3855a1` against `git diff -U0 546f1ff0
  a5ab2b28`, outside `docs/`. Round 1's change has 79 paths and this one has 81. 3 differ:
  - `package.json`: the `http-host` token in the three lines;
  - `no-egress.test.ts`: the one alias line;
  - `support-purity.test.ts`: new.
  The other 78, including `package-lock.json`, `vitest.config.ts`, `AGENTS.md` and the five app files changed on both
  sides, carry identical removed and added lines. So round 1's `hunks 168 checked 168 differing 5` hunk check carries over.
- **The no-egress alias map** at `a5ab2b28` holds both `'@syzygy/http-host'` (`:43`) and `'@syzygy/support'` (`:45`).
- **Root Vitest.**
  - `vitest.config.ts:7` aliases `@syzygy/support`, and `:14-25` alias `@syzygy/cap1-core/testing`, `@syzygy/cap1-core`,
    `@syzygy/cap1-daemon` and `@syzygy/http-host`, all to `src`.
  - `test.projects` includes `@syzygy/support` (`:41`) and `@syzygy/http-host` (`:83`).
  - The full suite with every `dist/` absent passes (section 3).
- **`npm ci` at `a5ab2b28`** succeeds: `added 117 packages`, which is 116 plus the `@syzygy/support` link. `npm ci` refuses
  a lock out of sync with the manifests, so the textually merged lock is consistent [Inferred: npm ci semantics].
- **`@syzygy/http-host` imports nothing that now has a second copy.**
  - Its 5 production files import `node:crypto` (`createHash`, `randomBytes`, `timingSafeEqual`), `node:fs`, `node:path`,
    `node:http`, `@syzygy/cap1-core` (`admitClient` and two types) and their own modules.
  - Neither `http-host` nor `cap1-core` defines a local `sha256` or `deepFreeze`: `git grep` at `a5ab2b28` finds only
    `http-host/src/credentials.ts:379-380`, two raw `.digest()` sites, which are not replaceable.

## 6. New findings

### N8 — note. The merge made two statements stale: the record's merge sweep reading and the PR body's "left on purpose" list

- **Severity:** low (accuracy). The counts are right. The prose about where the sites are is wrong.
- **Evidence** [Observed, `sweep-*.json`]:
  - At `094cc542`, `sweep.py` lists `packages/cap1-daemon/src/credentials.ts` lines 379 and 380 (`digest is not hex`).
  - At `767588d4` and `a5ab2b28`, it lists `packages/http-host/src/credentials.ts` lines 379 and 380 instead. The total is 6
    at all three.
  - #529 moved those two sites. `cap1-daemon/src/credentials.ts` has 0 `createHash` at `a5ab2b28`.
  - The record's `mergeOfMain.sweepAtTheMerge.reading` says: "the population grew from 236 to 241 files because
    @syzygy/http-host brings five production files, none of which holds a hash or freeze site". `credentials.ts` is one of
    those five, and it holds 2.
  - The PR body says the same ("five `http-host` files, none with a hash or freeze site").
  - The PR body's Residuals bullet "Left on purpose … `cap1-daemon/src/credentials.ts` x2 … (raw `.digest()`)"
    (`pr-body.txt:67`) and the placement bullet "`cap1-daemon` takes raw digests" (`:5`) name the pre-merge home.
- **Failure scenario:** a reader takes "none of which holds a hash … site" at face value and does not audit
  `http-host/src/credentials.ts`. Or they look for the two left-on-purpose sites in `cap1-daemon` and find none. Either way
  they conclude that the inventory is inconsistent.
- **Proposed fix:** in the dispositions record and the PR body:
  - say the two raw-digest sites are `packages/http-host/src/credentials.ts:379-380`, moved there by #529;
  - say the count is unchanged because the sites moved, not because the new files hold none.

  The JSON record is evidence, not act-bound, and may take a corrected `reading` or a dated erratum key.

### N9 — note. The purity test is a token denylist behind an import allowlist; ambient-global forms survive it, and one obfuscated file read survives both layers

- **Severity:** low. This is test rigor (`SKILL.md:42`, `:103-104`), not a regression: the guard is identical to what the
  drafter held for itself before the PR (D2 and D5 survive there too).
- **Evidence** [Observed, section 4 N3]: 11 of my 16 purity mutants survive the purity test:
  - I/O reached through globals: RP3 (console), RP5 (WebSocket), RP13 (`fetch` by reference) and RP15 (`fetch?.()`);
  - ambient input: RP2 and RP16 (environment), RP7 (clock) and RP8 (randomness);
  - obfuscated: RP6 (file read) and RP12 (computed import);
  - RP14: a subdirectory module exposed by a new subpath export, which the scan never reads (`readdirSync` of the top level
    only, and `exports` unchecked).
- **What the S10 proof covers.** It refuses the network and stdout forms when they run in the dossier closure (E6, E7,
  E8). It does not see:
  - E9, a file read in RP6's form, which passes S10 both ways;
  - environment, clock or randomness reads;
  - support code that runs only on paths the dossier driver does not take.
- **The title overclaims.** The second test's title, "imports only node:crypto and its own modules, so no file read, no
  workspace package and no network", claims more than an import scan shows.
- **Failure scenario:** a later edit to `packages/support/src` adds `globalThis.process?.env[...]`, a `performance.now()`
  timer or a `WebSocket` helper, and every committed test stays green. Every importer inherits it, including the
  body-read authority and the owner-act gates (class 1 and 4). RP16's optional-chaining idiom is the plausible accident
  here; RP6 and E9 need deliberate evasion, which is review's job, not a test's.
- **Proposed fix** (one follow-up; extend the existing test, bar 10):
  - (a) Scan `src` recursively, and every source extension (`.ts`, `.mts`, `.cts`, `.js`).
  - (b) Assert that `package.json` `exports` has exactly the `"."` entry.
  - (c) The package is three short files, so replace the denylist with an identifier allowlist for it. Collect every
    identifier in the non-comment code and assert that the set is a subset of a literal list. That kills
    RP2–RP16 and E9 in one predicate.
  - (d) Or, at least, extend the denylist with `globalThis`, `\bprocess\b`, `\bfetch\b`, `WebSocket`, `console`,
    `performance`, `getBuiltinModule`, `\bFunction\b`, `eval` and `import\s*\(`, and add `randomBytes` and its kin
    against `node:crypto`.
  - (e) Share one reader and one list with `owner-act-drafter.test.ts`, so that the two cannot drift (bar 8).
  - (f) Retitle the second test to what it proves.

  Confirm each of RP2–RP16 and E9 fails it. The fragments are in `purity-mutants*.json` and `egress-mutants-3.json`.

### N10 — note. The S10 alias map can drift from a package's real entry with the proof green

- **Severity:** low. The property is pre-existing: all ten aliases hard-code `src/index.ts`. It needs an entry redirect
  that leaves the old file.
- **Evidence** [Observed, `entry-drift-probe.json`, section 4 F1]:
  - I redirected `exports["."]` to a new `src/main.ts` that egresses, leaving `src/index.ts`. S10 stays `passed: 2,
    failed: 0`, while Node's own resolution of `@syzygy/support` creates `socket(AF_INET, …)`.
  - A subpath import fails the build: loud, not silent.
  - A new workspace package with no alias resolves through `node_modules` to its `dist`, which is F1's class (round 1's
    optional `onResolve` hardening, which `roundOneRepair.f1.notRun` declines).
- **Failure scenario:** a refactor renames or redirects a package entry. The dossier run from `dist`
  (`npm run poc:dossier`) executes the new entry, while the S10 proof keeps certifying the old one.
- **Proposed fix:** do one of the following, either in `no-egress.test.ts` or in a test beside it:
  - derive the alias map from each workspace `package.json` `exports`, mapping `./dist/X.js` to `./src/X.ts`;
  - or assert, per alias, that its target is that mapping of the package's `exports["."].import`.

  Also add the `onResolve` guard: fail the build when any `@syzygy/*` specifier resolves outside `packages/*/src` or
  `apps/*/src`. Optionally, name `@syzygy/support` in the `AGENTS.md:282-284` guardrail too.

### N11 — note. `merge-resolution-check.py` exits 0 on a reported difference, and in-region resolutions are checked only by eye

- **Severity:** low (an evidence tool, not shipped; the same class as round 1's N4 for `site-equivalence.py`).
- **Evidence** [Observed, section 5]:
  - Every `__main__` path prints JSON. Only `--selftest` sets an exit code.
  - MM1 and MM6–MM9 report differences with exit 0.
  - MM2–MM5 drop `http-host` or `support` from a list, keep ours only, or misorder the list, and the tool reports nothing
    by design.
  - The record carries the region texts but no mechanical union check.
- **Failure scenario:** a later rerun gated on exit code (rule 4's trap) reads green over a changed merge. Or a later
  hand resolution drops one side's package from a build list, and the evidence shows "resolved by hand" with nothing
  flagged.
- **Proposed fix:**
  - exit 1 when `pathsThatDifferWithoutBeingAResolvedConflict` is non-empty;
  - for list-valued regions such as these script lines, add the union predicate: set equality with ours ∪ theirs, no
    duplicates, each side's order kept as a subsequence (`tools/union_order_check.py` is one form);
  - add one selftest case per arm.

### N12 — note. N7's third difference is one instance of a class: any throw during the walk

- **Severity:** low (accuracy; unreachable at the call sites, for round 1's reasons).
- **Evidence** [Observed, `narrative-getter-probe.json`; the old body is taken verbatim from `polaris-narrative.ts` at
  `a088f1ca`, lines 133–136]:
  - a sibling, then a throwing getter: old `frozen: 0` of 2, package `frozen: 1` of 2;
  - a Proxy whose `ownKeys` trap throws, beside a sibling: old 1 of 2, package 2 of 2.
  - The non-empty typed array is the case where `Object.freeze` throws. These are the cases where `Object.values` or a
    trap throws.
- **Failure scenario:** a future caller relies on "three differences" and is surprised by a partial-freeze state after a
  getter throws.
- **Proposed fix:** state the class in the dispositions record: "any exception during the walk leaves different partial
  states; a non-empty typed array, a throwing getter and a throwing Proxy trap are instances". Optionally, add one
  `deep-freeze.test.ts` case that pins the package's partial state after a throw.

### N13 — note. Re-checkability gaps in the repair evidence

- **Severity:** low (rule 11 and rule 2's "enumerate remainders").
- **Evidence** [Observed]:
  - N6's reproduction path `/tmp/lc63x` is, on this host, a live working directory of another session. A cold re-checker
    here cannot use it without writing into that session's directory.
  - The record does not name the Node version for the probe. `n7` does (`v24.6.0`); `n6` does not.
  - The probe header says "each built with `npm run build:poc`", and `n6.reproduction.command` says "built with npm run
    build".
  - `support-purity-mutants.py:61` returns `'failedTests': failed[:4]`, so the record's T4 row says `failed: 5` and lists
    4 names. The missing one is the `import type` reader case, which my re-run shows failing.
  - The lane report the brief names (`report-530-r1.md`) does not exist.
- **Failure scenario:** a re-checker cannot reproduce `probe-output.json` on the shared host, or reads the T4 row as
  inconsistent.
- **Proposed fix:**
  - in the dispositions record, name the Node version and one build command;
  - for future probes, use a uniquely named, never-reused TMPDIR per record, or make the probe accept the fixture root as
    an argument and record it;
  - drop the `[:4]`, or record `failedTestsTruncated: true` with the full count.

## 7. Every changed output

None observed. All [Observed]:

| Output | Evidence | Result |
|---|---|---|
| 24 models, `responseIdentity`, freeze census, rendered pages, both gate evaluations, helper digests | `diff-probe.mjs` at `546f1ff0` and `a5ab2b28` under `/tmp/r530q`; `compare-probe.py` | both `1cc8b7c34af0592b5660357ca5ccb2c3cbf44d09398889cc539d9787bbae77f8`; 68 rows, 0 differ |
| owner-act gate decisions over live records and mutated prose | `live_diff.mjs` at both | 483 rows, 0 differ; both `485d5e65eb70…`, **equal to the record's pre-merge `baseOutputSha256` and `headOutputSha256`**, so the merge moved nothing there |
| hash and freeze call arguments | `site-equivalence.py 546f1ff0 a5ab2b28` | 59 files, 56 compared, `globalHashArguments` 111/111 and `globalFreezeArguments` 17/17 equal, 0 files differ, 0 non-canonical helpers. Every row is identical to the `c104771f..fe3855a1` output. My re-runs of round 1's two pairs are byte-equal to round 1's files (`d97835c3…`, `bc392d7e…`) |
| production change | `change_equality.py` | 78 of 81 non-`docs/` paths carry identical changes. The 3 that differ are the merge's `package.json` token and two test files |
| registry-bound bytes | blob sha256 at `a088f1ca`, `c104771f`, `fe3855a1`, `8bd514d7`, `094cc542`, `546f1ff0`, `767588d4`, `a5ab2b28`, `e5080f4d` | `git-object-reader.ts` `9f33e5fb…` and `project-shape-observer.ts` `9ff21517…`, each at all 9 (`registry-bound.txt`) |
| digest-cited governed files | `digest_citers_r2.py`: 73 subject paths existing at `546f1ff0`, base sha256 and blob id, any 12–64-hex prefix, over 5,099 tracked files and 28,052 distinct tokens at `a5ab2b28` | 42 hits on 38 files, all citers under `docs/evidence` (110 citer instances) or `docs/reviews` (14); **0** under `.syzygy/`, `openspec/`, `scripts/` or `.github/` |
| sweep figures | `sweep.py` at `094cc542`, `767588d4`, `a5ab2b28` | 6 sites, 1 `sha256`, 1 `deepFreeze` at each. The rows moved from `cap1-daemon` to `http-host` (N8). Population 236 → 241 (`namesSha256 094b7823…` at both merge commits) |

Could the merge have changed round 1's cleared claims? The evidence says no:
- the static arguments are identical row for row;
- the probe is equal across the merge base and the head under one TMPDIR;
- the live output digest equals the record's pre-merge one;
- the registry-bound bytes are equal at 9 commits;
- the subject's own production change is unchanged on 78 of 81 paths.

**The hash trace was not re-run** [Inferred unaffected]. The merge's 5 new population files hold two raw-digest sites that
#529 moved, and those sites lie on both sides of any post-merge comparison. The production change the trace measured is
unchanged.

## 8. Verdict per acceptance criterion

- **AC1** (one definition per helper, with sweep, method and denominator; registry-bound file untouched, digests equal):
  **met, with notes**.
  - At `a5ab2b28` there is 1 `sha256` (`packages/support/src/sha256.ts`) and 1 `deepFreeze` under both population rules,
    over 241 and 245 files.
  - The registry-bound bytes are equal.
  - N1's denominator is now stated under both rules.
  - Exception, N8: the merge moved two left-on-purpose sites, and the record and PR body name the old file and say the new
    files hold none.
- **AC3** (`responseIdentity` digests, model outputs and rendered bytes identical): **met** [Observed], section 7, now also
  across the merge.

## 9. Cleanup

**Deleted** [Observed]:
- the scratch clones `clone`, `clone-fe` and `clone-p`. Their local merge-mutant commits and the local merge `d83a3328`
  went with them, and none was pushed;
- every TMPDIR I made: `/tmp/r530b-1` … `/tmp/r530b-14`, `/tmp/r530b-e5a`, `/tmp/r530b-e5f`, `/tmp/r530q` and
  `/tmp/r530w`. `ls -d /tmp/r530b-* /tmp/r530q /tmp/r530w` reports `No such file or directory` for each;
- the full-suite JSON report (2.0 MB), after extracting `vitest-distabsent-a5ab2b28-summary.json`;
- `tools/__pycache__`.

**Not touched:**
- `/tmp/lc63x` and every other directory in `/tmp`;
- every worktree under `/home/tze/GitHub/syzygy/.worktrees/`.

No daemon was started. `ps -eo pid,ppid,etime,args | grep -F rev-530b` lists none of my processes. No `bd` call, push, PR
comment or merge was made, and the only GitHub calls were `gh pr view`, `gh pr checks` and `git fetch` / `git ls-remote`.
During the run the scratch filesystem hit its quota (`EDQUOT`) once, and I freed it by deleting `clone-fe` after its arms
were recorded. No result was lost: the arms JSON had been written before.

**Kept:** 89 files plus this raw, none over 300 KB (`find . -type f -size +300k` lists none). The largest are
`check-governance-a5ab2b28.log` at 171,938 bytes and `vitest-distabsent-a5ab2b28.log` at 125,477 bytes.
`tools/live_diff.mjs` is round 1's extract of the 6.2 harness, and its digest equals the record's
`liveDiffHarnessSha256`. The `old`/`new` fragment of every mutant I ran is in `egress-mutants-*.json`,
`purity-mutants*.json`, `merge-check-mutants.json` (described edits) and `purity-T5.txt`, and each names the commit it
ran at.

| File (relative to `rev-530b/`) | sha256 |
|---|---|
| `alias-subpath-probe.json` | `788114e1e294a7b67979d473f46e1152bad880a19ee4aa6210e11b95102e1bfc` |
| `both-sides.txt` | `ee7f13b43171b8ab0066bd0cd0967dc13aa5ac305eb16ae26e6866d343f89345` |
| `build-a5ab.log` | `db4ed42e238fcfd08f6ba67394970ac7bfab31aee1a07befc5d7862726e737a1` |
| `build-fe.log` | `37653556985ab7f816334ab3590c1219654ec1d4d97ea99b76e03dfbddb6800b` |
| `buildpoc-546f.log` | `a3a72a9f242cf7fd8cb0fef6262ab771df10d5dba5580ac943e355c80cae7660` |
| `buildpoc-a5ab.log` | `ff04021c063a8dd33d96a8b56213397750f5dd8560c5b2c658a5f815184c9ef2` |
| `change-equality.json` | `4ea451c4c3e5b7f3daba94e155675f4c8a834813b857811686af4933c8a31ce2` |
| `check-governance-a5ab2b28.log` | `e33a687ae30c26b8f5f6127d85352a15fb9e5a76ac6a2c9b7e0eda7e45afbc41` |
| `check-quotations-a5ab2b28.log` | `a3dfcf00412b4592d95b8bf26a7e6d133955b6df112513710d52d7f9d5e81f2d` |
| `cmp-546f-a5ab-q.json` | `5945bf49d48a34a35707594b459f22f0d9b9986d30e4ca240651e5f577a0b998` |
| `cmp-committed-a5ab-q.json` | `e67a6ec20defb9fdf00ef4a3a11aee3b3bee9b1052aba2fc321ff4cab1b117e0` |
| `cmp-live-546f-a5ab.json` | `0527d6ceca1f39970f6da0a5913b3894e537e6ae2400a2794d62372b8b5e35a4` |
| `cmp-q-w.json` | `0b0beca77dae491967cb0f080266542d5bbaf708c83c746b07b4867f50afe532` |
| `cross-purity.json` | `807062074bee44fa7f69629691f564c24ab5fdabbbcc28c7e007130c4587e91b` |
| `digest-citers-r2.json` | `7f8fa52fd16e1f004d670ca5f9167a85e8b87b4289e0bf558ebdfd84c5ef0433` |
| `egress-arms-2-a5ab2b28.json` | `e0b6de6312996aff72d97b433679b561e296d3cdd8ffc4b490cd85590467ec75` |
| `egress-arms-2-a5ab2b28.log` | `29c093cd3a73e2e91ff9d44488cc8db52ed1235144700dfb4872b4d758a3f313` |
| `egress-arms-3-a5ab2b28.json` | `9943853d4ef4458c60784a995c74b0641b3f6cb8ac2aa804dcfe361de0b98fa7` |
| `egress-arms-a5ab2b28.json` | `fa986e8865bc735bc14a1a9125a25cf46864101fdc18ad7ab687e913b8154628` |
| `egress-arms-a5ab2b28.log` | `58654975eb87d91d469888b4b012ebe94f130b0f7318123879a7ff2d6b534561` |
| `egress-arms-fe3855a1.json` | `802c02c7957cc055852d2cbb8fdf4d47c07143f6347400723f4a871b5b0de8ba` |
| `egress-arms-fe3855a1.log` | `36200b7b0db695137df0bd3d1098ead977a0452d91f7166c9853f0031d8374da` |
| `egress-mutants-2.json` | `5c194c3ff02f86364de97c25ca399543e5ba6195c331cc2999e0533f41746a11` |
| `egress-mutants-3.json` | `30d63c6f665cf668426c2d4842a06383e61a4ead0f7ded40d1ff789e18c110a0` |
| `egress-mutants-a.json` | `5266c945eba42a630de848f621a50065367afc8c11e2b86a352e947fb704eafb` |
| `egress-mutants-f.json` | `18d0fc65524ec11aca451bf9062c177ec30967480948621f9d3d31c97cf051e5` |
| `entry-drift-probe.json` | `dbdc7cfdee13289f03ba8da38af0aa52e3e481b78a81999e1af2b7b776db672c` |
| `live-546f.json` | `485d5e65eb701a39fce2816e54999d94c55812e3eac30d84c95997274dc21658` |
| `live-a5ab.json` | `485d5e65eb701a39fce2816e54999d94c55812e3eac30d84c95997274dc21658` |
| `main-moved-final.txt` | `6bb4719c80e6a27fc1c48326e5ae3ff26916b999c938b9389f34fe936b2d3489` |
| `main-moved.txt` | `e0fcb28560e099db56e90b9c2419acfcf991ea24fc9d85f57553ad04f241e671` |
| `merge-check-767588d4.json` | `6cc8f98aac03b7471aa43463a578872bea57279dc5ef776acc3a0deeea61216d` |
| `merge-check-mutants.json` | `d984f51514ee2536fafb031ecaf72c5c289ccbbad8c414d8258d7703f7fadd5f` |
| `mt-plain.txt` | `df3e9bb5fae68035a8e5e004ffd19b4071c1eff1494c195b24906b4506447ac6` |
| `narrative-freeze-probe-r2.json` | `46bfb305e5e1751b9623a963feba420810e994ce484d40621cf5d5e9e122f4bf` |
| `narrative-getter-probe.json` | `2ff2ea83eec5a6583fffaffe711bfc4f9f903d567a9a46c9af2aff40a957cce8` |
| `npmci-546f.log` | `b4c3b07028c4d33b403436fcdda24c1a79e439139ed780e1a5b3ee1c53cc7bc2` |
| `npmci-a5ab.log` | `dbd3abec22d155a26307398e61cdf5f2477398060615a3307e3efc20f0019ea0` |
| `npmci-fe.log` | `810e21b8a4d9a072c95efce2612044d179b95bda926e66fc27069c1838d4118c` |
| `npmci-localmerge.log` | `5f7f6c47acdda1d3d17eb294fcba3ffbabcf75225ca81b510dfb98f3131bb6e5` |
| `npmci-p.log` | `7991de3463e6470a65e27b58512e8e7a5cad3806b5540cadb6619a2f6c20d84c` |
| `popaudit-8bd514d7.json` | `6e2023e02e98582d23e2af690ab37c02541093957d0c888159118c40fb6662a8` |
| `popaudit-a088f1ca.json` | `911dc424b6c7a9fc29fb1a51b594ce2621c1713bf64d5aebc99a153916731db2` |
| `popaudit-a5ab2b28.json` | `d00a48fa50b31610bf35b3553f62d28099252858e29a5caefe7353b15704c6ee` |
| `pr-body.txt` | `9133788de4ff1ddde9b5f968728f77f6662dce73f12398525c5188b9db9f7951` |
| `probe-546f-q.json` | `1cc8b7c34af0592b5660357ca5ccb2c3cbf44d09398889cc539d9787bbae77f8` |
| `probe-546f-q.log` | `d4edfd7e3e2310e7a25caae54f647f19eb50a2274fd4398698b7903d247daffb` |
| `probe-a5ab-q.json` | `1cc8b7c34af0592b5660357ca5ccb2c3cbf44d09398889cc539d9787bbae77f8` |
| `probe-a5ab-q.log` | `305bb95bade5b4ad1704c22acebdb33c9db38d796ddf546659c94416c2cbd755` |
| `probe-a5ab-w.json` | `f7fcb81aceedd635a5e3c7cf8998e6573c068c6f2376e1bb3e188b1f2d3cbdd7` |
| `purity-T5.txt` | `a78f5780ffa08580b4fdc7a8bf892cb9c7668da5cc9beaef790ea959beec9d8b` |
| `purity-mutants-2.json` | `dc7b6396c6d1c1d542e9f488eff3636648c3374c0bf256c342969e676795877f` |
| `purity-mutants-2.log` | `144f1ad87354b8919dfd5d6ff65d99af9a2d2e3e5586ee81a2f729dd9e07472a` |
| `purity-mutants.json` | `f477e54b75da431ff1ee0bae9431b370201a53e0b08dbf65fad98aebab4582e8` |
| `purity-mutants.log` | `3f17c85875a8ca3bb296cea0894c1333f7a3300ccc9cf706532c46cacf88cee2` |
| `reach-n1.txt` | `4b7b471f0b63110ae7c1e61b64ab10a4564e0074c4066c463b9b5746b49198f1` |
| `rec-n.txt` | `78c23acc70decbe2ca0a8764c3a3f465c22655a8f3d29dd56c81992f99f63119` |
| `registry-bound.txt` | `13ccea19e066b5f6014a71debc22268bdfe15061c587cd703a786185acc4f25a` |
| `site-eq-546f-a5ab.json` | `1c9483b5157b3e17f8b7a152149e212a96b954ec3627455e2c2fbaa6ffb0f467` |
| `site-eq-a088-9029.json` | `d97835c3ac95852fb94265514ff67d84157ca5a23c146ffa463f76c08a2468fc` |
| `site-eq-c104-fe38.json` | `bc392d7e1f5ae8e38fce25e9855e89aed13578ca8dfbc6fe02fa08350c02dbb6` |
| `subject-paths.txt` | `5cde0e7c537ccfd623fea1b41b39bc9116f29a1b9be6c44c8b0cf95dc02fc1ce` |
| `sweep-094cc542.json` | `1c5951e69abaec10df9e8594f643d0dcd6839154c600d438dcc1ba17cc23374d` |
| `sweep-767588d4.json` | `baae0bbb9215273f08f0e8999f53f07a46dba131b7cfb9d6cbfba44f121f4517` |
| `sweep-a5ab2b28.json` | `f9e22a5900387e02304f56051a56345a1de40040de81e440788b5e9f6814a381` |
| `typecheck-a5ab2b28.log` | `f21762922bb179fa5dc8c33e881c4f062ef1c33bf48c7d3dad2dd0e5cd30ee98` |
| `union-order-check.json` | `5c32600c11dce394469caa99f1888ea6a131340e794ddc514388024f755c5ad9` |
| `vitest-distabsent-a5ab2b28-summary.json` | `4e7c002764b09af906df64b46f0967cf4b5c09377712b2ab5dc6e4527fbf892c` |
| `vitest-distabsent-a5ab2b28.log` | `3a03171cd1cc74d683fa404b86048335aa06a089177d88dd1647ba83f9f14faf` |
| `vitest-localmerge-main531.json` | `83457a6cc2e3445959edf588405646fddc749972ba491f35aefea83b48754a7e` |
| `vitest-localmerge-main531.log` | `5c6279b7cded6cc35493cc9badaeb325cf25c3bb2d6bb6478b69c5da665cf5b0` |
| `tools/alias_subpath_probe.mjs` | `711a113a06b2c274857fe8798fa4e599f042f2570c2278b11d9a75f10238c2a4` |
| `tools/change_equality.py` | `822fb7fae252570e4348a380cfaeb415e980cf36d9b6475c002019d176619af5` |
| `tools/cross_purity.py` | `3bf1a0841b516c6769470a8c49731e95fef2339cf0bda81d06ac6ebe9059fac0` |
| `tools/digest_citers_r2.py` | `3d188f19703325206af066e2a89cf6d67e265de08f37ba6d2dc388278eac6ba5` |
| `tools/dist_absent_run.py` | `31a190ce0642523426a9ebd5e2ea38dc2db6d15ccb44132962b133558b947a82` |
| `tools/egress_arms.py` | `85e1b75d6ac75276ace70485b00c753e6f16e83089ed83b61f0e81223cb2a96a` |
| `tools/entry_drift_probe.py` | `94bac07cbba9fad7286eb7d2363668b442acbe1121ebcbe46b40ef7bcf352d6d` |
| `tools/fill_kept.py` | `76f55c8baf36d80810f94b0393011584ad87bf0cecde27fec095012981b529a9` |
| `tools/live_diff.mjs` | `eedf318b7e44b39f0b1467b6ca95914a9b39ae7c6e223adc982fd1f9d6c4edaa` |
| `tools/make_egress_mutants.py` | `cefd7edf8fdb4c0fc819fdb80e862ca7df313f1e202d7122bdf9d847ee5dd5d5` |
| `tools/make_egress_mutants_2.py` | `bf10e2e62cc2c133169d97f55fe376d77b1536e2f547897119368e49707c68eb` |
| `tools/merge_check_mutants.py` | `f2b2cf7250c15a977df2aa947e8f99ff6bbf506228cbc6e1357766b607835827` |
| `tools/narrative_getter_probe.mjs` | `00ddce9a33fa33f9ad74c18207b7be1fe7d3a120e693bb8abc572fa6fe037f1f` |
| `tools/purity_mutants.py` | `a871d1a56d2c0759a7acd112e74e88f9105e4132495ca795bd2552e1b3a0437d` |
| `tools/purity_mutants_2.py` | `a14e251884de453b4444cc59f84a5f1b81513e14be78d871c41b7049d224e769` |
| `tools/quote_check.py` | `f022ed99ebf44824133ca453ebf107576bcbebb1895389cf525abe9f17d686a1` |
| `tools/reach.py` | `ab3a9d97205b33124dd4f14c062a045a0cb32723bfb2044ae6749fbbdf1e1ea8` |
| `tools/union_order_check.py` | `1a7b498b3fa28715f64036443f674d03ee1b8138eda5b3d00307055043be2602` |
