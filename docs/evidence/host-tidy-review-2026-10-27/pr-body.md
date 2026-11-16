## Outcome

`syzygy-bpyt.7.15` closes notes N2, N9 and N12 of the PR #529 round-1 review (`docs/reviews/R-GP-IMPL-HTTP-HOST-1-RAW.md`), and carries that review's N5 for the differential it reuses. No product behaviour changes: two http-host files take comment edits only, and the POC's test files and manifests stop going through `@syzygy/cap1-daemon`.

- **N9** (`packages/http-host/src/server.ts`): the header (lines 11–29) now describes the generic host that both apps serve through. It replaces the Capability 1 wording ("this wave mounts only the minimal root route"). The header is rewritten in the same 19 lines, so every later line number holds and the PR #529 dispositions' line map stays valid. Line 76 now says "every app" instead of "RT4/RT5". Line 32 ("exposure beyond loopback is out of Capability 1's scope") and `credentials.ts:7` ("CAP1-REQ-012's admission context") keep their wording: each cites where its rule comes from, which stays true for the shared host.
- **N2** (`packages/http-host/src/shutdown.ts`): six comment lines say why only the signal block is shared, as the lead allowed ("carry a byte differential … or record why not"). No helper was extracted, for three reasons:
  - the two listening banners share no line;
  - the POC redacts a start failure's detail (`startup-detail.ts`), where the Capability 1 daemon prints it whole;
  - the POC injects `createDaemon` and its io, and runs `credentialProvision` and `startConsole` between those statements, so a shared helper would take each of them as a parameter.
  Since nothing was extracted, no printed byte or exit code can move. The differential's `e2eEqual` confirms it.
- **N12**: 13 POC test files now import the host from `@syzygy/http-host`, a one-line change each. `apps/three-surface-poc/package.json` drops `@syzygy/cap1-daemon`, `tsconfig.json` drops its reference, and `package-lock.json` drops the matching line in the POC entry. At HEAD, 0 POC files name `@syzygy/cap1-daemon`; at BASE, those 13 test files and the manifest did. #535's two files (`browser-origin.test.ts` and `git-observation.test.ts`) never imported it, so they needed no retarget.
- **N5** (`docs/evidence/syzygy-bpyt-7-15/diff-tools/`): the 7.3 differential is reused here. Two changes:
  - The surface key now includes the declaration's own name (`declaredAs`), beside its file. The old key was blind to R13's swap, because both constants are declared in the same host file.
  - The selftest gains three mutants: a dropped shim type re-export and the R13 swap (both detected by `surfaceEqual`), and a changed constant in the host source, which `surfaceEqual` must hold. That last one is the stated limit: the surface compares names and bindings, never values. Values belong to host-diff (built files, and only the constants it records), #535's binding pins, and the literal statuses in the tests.
  The frozen 7.3 evidence is untouched.

## Classes

- **Declared:** 4. The edits are comment-only, but they are in the credential-admission host files (`server.ts`, `shutdown.ts`).
- **For the reviewer to rule:** 3. The POC drops its cap1-daemon edge, while the observer-input gate (`git-observation.ts:183`) still lists `packages/cap1-daemon/`. The gate's code is unchanged, and the differential finds 0 differing decisions over 5,528 paths.

GP-Q0's further checks for class 4:
- **Differential:** see Evidence. Every comparison is equal, the gate included.
- **A rule-6 mutant per predicate:** `record.py --selftest` gives 31/31; the differential's selftest gives 7/7 as stated; `code_equal.cjs` and `poc_alone.py` each carry their own mutants.
- **Owner notice on `syzygy-bpyt.10`:** for the coordinator to post at landing, since I run no `bd` mutation.

## Authority

- GP-Q0 part 1 (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`): behaviour-preserving work under the acts in force.
- The stop clause ("Any change not listed here to what a gate accepts or refuses stops and returns to the owner") is not reached. No gate's code changes, and the gate list keeps `packages/cap1-daemon/`, because narrowing it would be a gate change.

## Every changed output

- **Served bytes, refusals, exit codes, startup and shutdown output:** none change. The differential shows them equal through both barrels and the built daemon.
- **Test titles:** none change (1,262 at both commits).
- **POC build graph:** `tsc -b apps/three-surface-poc` no longer builds `packages/cap1-daemon` (`poc-alone-*.json`).
- **The POC walkthrough surface version** (`pwbSurfaceVersion`): it moves from `polaris@e4fd613eed56` at BASE to `polaris@2bb1f43332fd` at HEAD. The 13 changed test files sit in `apps/three-surface-poc/src`; the core tree is unchanged. No bound record carries the version, the same position as #529's N1 and #535.

## Evidence

The evidence is in `docs/evidence/syzygy-bpyt-7-15/`.
- `record.py <tree> --check` reports 0 problems, and `--selftest` gives 31/31. It checks every input below against git.
- BASE: `9dba258992667f62ad503ec76d8a6b99efcc4bac` (main after #535).
- Code head: `f2304fd5d2bfd0e50c48d6ea356ddea3f7be162d`, the merge of BASE into `3fa4817c`, with no conflicts.
- Evidence commit: `561c80b38d447a56e4c1542e0a8fbbdb2dd1d845`.

Subjects:
- `git diff 9dba2589 f2304fd5`: sha256 `6516a6a00077f439a10798aaf6e4b47c5d6aaf3628607a10860001f3e055d394`, 18 files, +34/−33;
- `git diff 9dba2589 561c80b3`: sha256 `b961f4ee73f50e0083ce96802f781e721db0a02bb2dc6d3a5c65f5fc1fdf0076`, 48 files.

**Comment-only** (`code_equal.cjs`): both http-host files, printed with TypeScript's printer at BASE and at HEAD with comments removed and types kept, are equal. Its selftest is a renamed identifier (differs), a changed literal (differs) and an added comment (stays equal). `record.py` also checks:
- `server.ts` has the same line count at both commits, and the only lines that differ are 11–25 and 76;
- `shutdown.ts` gains exactly six `//` lines.

**The POC without cap1-daemon** (`poc_alone.py`, a fresh clone with no `dist`):
- At HEAD, `tsc -b apps/three-surface-poc` exits 0 and builds no cap1-daemon `dist`. A mutant that re-imports `@syzygy/cap1-daemon` in `routes.test.ts` exits 2 with TS2307.
- At BASE, both builds exit 0, and cap1-daemon is built.

**The differential** (`diff-tools/differential.py --selftest`, both clones `npm ci && npm run build`; records in `diff-out/`):
- `surfaceEqual`, `hostEqualThroughCap1Daemon`, `hostEqualThroughHttpHost` and `e2eEqual` are all true;
- the gate: 0 of 5,528 paths differ, and 321 are refused at both commits;
- selftest: 6 of the 7 mutants are detected, and `source-value-changed` is held, as stated.

**Tests:**
- `titles.py`: 1,262 titles at both commits over the three touched projects, 0 added, 0 removed.
- `suite_run.py` at HEAD: 1,264 total, 1,262 passed, 0 failed, 2 skipped, exit 0. The run counts two more tests than the list, accounted for per file: the live test, which is skipped because `BUTLERS_REPO` is unset (`vitest list` does not report it), and one skipped test in `polaris-opening-index.browser.test.ts`.
- **A disclosure.** An earlier full run at the same commit, at load 39, failed one test: `polaris-authority-sweep.test.ts` "no source/authority/provenance field…", "Test timed out in 5000ms". Its record was overwritten when I added per-file counts to `suite_run.py` and re-ran. `rerun-alone-*.json` records the file passing 5/5 alone at both commits. [Inferred] It was a load timeout: the test reads only the tracked tree, and this PR adds no key it sweeps.

## Residuals

- `git-observation.ts:183` still lists `packages/cap1-daemon/` as a POC observer input, even though no POC file now imports it. `main.test.ts:399` and `git-observation.test.ts:109` pin it. Narrowing that list is a GP-Q0 gate change, so it returns to the owner if wanted.
- Root `build:poc` still builds `packages/cap1-daemon`. That is outside the bead's text.
- `server.ts:32` and `credentials.ts:7` keep their Capability 1 citations (see N9 above); the reviewer may rule they should be reworded.

Tests: +0 ~0 -0 (titles; 13 test files change one import line each)

Battery: `battery_clone.py 561c80b38d447a56e4c1542e0a8fbbdb2dd1d845 b715-1`: `commands=110 nonzero=0`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01APhWyj6JKsAs6kzgYByHeD

