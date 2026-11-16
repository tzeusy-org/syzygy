# R-GP-IMPL-DOSSIER-CLI-TABLE-1 — CC-REV-1 implementation review of syzygy-bpyt.8.2, round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: c2ae58e4
Subject: r1-review.diff sha256 02f6c462fa9cf401341fd376caa54bd516a23ec04b1f31bb035964486b89770f

Reviewer: independent fresh-context CC-REV-1 reviewer (did not author the change). Work ran 2026-10-22 to 2026-10-24, with a
pause for a usage limit; the subject was re-checked after the pause (below). No target repository content was fetched or read;
no credential file was opened; no daemon was run against `~/.syzygy` or port 7478.

Abbreviations: "base" is `ce322e1a65b784c6304d51b05fb347351912a926` unless a row names `9a30237e`; "head" is
`c2ae58e4cbf39a90717a1e051292258c6baaa619`. Paths under `rev-518/` are under
`/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-518/`.

## 1. Subject identity checks

- [Observed] `sha256sum r1-review.diff` printed
  `02f6c462fa9cf401341fd376caa54bd516a23ec04b1f31bb035964486b89770f`. It matches the brief, and it matched again after the pause.
- [Observed] In a fresh scratch clone at head, `git diff ce322e1a65b7… c2ae58e4cbf3… | sha256sum` printed the same digest. So the
  file equals the diff from the merge base to the head.
- [Observed] `git diff --stat ce322e1a c2ae58e4 | tail -1`: `93 files changed, 37095 insertions(+), 369 deletions(-)`. Outside
  `docs/evidence/`, 22 files changed (643 insertions, 369 deletions), which is the code list in the brief.
- [Observed] `gh pr view 518 --json headRefOid` printed `c2ae58e4cbf39a90717a1e051292258c6baaa619`, before and after the pause.
- [Observed] `git merge-base ce322e1a HEAD` is `ce322e1a…`, and `9a30237e` is an ancestor of `ce322e1a`. From `9a30237e` to
  `ce322e1a`, the only file that changed under `apps/` or `packages/` is `packages/polaris-dossier/src/launched.test.ts`. So the
  production bytes the lane's goldens took as base are the same at both commits.
- [Observed] These production bytes are the ones the claims rest on, and they equal the head's:
  - `git diff --stat b5446ec7 c2ae58e4 -- . ':!docs/evidence' ':!*.test.ts' ':!*.testkit.ts'` printed nothing. The goldens ran
    at `b5446ec7`.
  - `git diff --stat 78853844 c2ae58e4 -- . ':!docs/evidence'` printed nothing. The rule-6 runs were at `78853844`.
  - Every one of `evidence.json`'s 18 `subject.files` digests matches the file at both `b5446ec7` and `c2ae58e4`.
  - Every one of `path-intent.json`'s 9 `filesAtRunsAt` digests matches the file at both `78853844` and `c2ae58e4`, and its 4
    `filesAtBase` digests match at both `9a30237e` and `ce322e1a`. Each digest was computed by script, never transcribed.
  - The 4 corpora and 3 retained goldens in `evidence.json` re-hash to their recorded sha256, with the recorded row counts (758,
    1617, 138, 375; 1617, 1302, 1195). `path-intent-base.jsonl` re-hashes to `357aacc6…`, 10,039 rows, as recorded.

## 2. Clauses relied on, and the class ruling

CC-REV-1 (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md:16-52`):
- "1. **authority boundaries** — write-universe, typed-authority table, adapter authorization (VIS-5, VIS-6);"
- "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
- "6. **public interface** — machine-queryable endpoints, adapter contracts, anything an external consumer can depend on;"
- "**Class membership is contested by default and is never finally determined by the agent performing the change**"
- "**The change record states** which classes the change touches, or "none," so a misclassification is a findable violation
  after the fact." and "**A reviewer or the owner** may reclassify at any time."

GP-Q0 (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md:51-66, 95-96`):
- "Behavior-preserving refactors may proceed under the acts already in force."
- "'Behavior-preserving' means none of the following changes: a rendered byte, a wire format, a refusal string or an exit code; a
  signed or digest-bound artifact; a consent, security or retention decision."
- "pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4 (security), and class-6
  pull requests that remove an endpoint." These get three checks: "an old-versus-new differential over a mutated-record corpus that
  includes records with altered prose; a rule-6 mutant for each predicate; a non-blocking owner notice in the cycle report."
- "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."

**Ruling: the PR touches class 1 and class 6. It does not touch classes 2, 3, 4, 5 or 7.**

- **Class 1, touched.**
  - `governedPlaneViolation` (`apps/syzygy/src/main.ts:140-163`) is the daemon's RTF-1 write-universe containment: it decides
    whether the daemon may write its state, the machine credential included, under a given directory.
  - The PR replaces the function that decides it: the daemon's own `resolvePathIntent` is deleted, and the call goes to
    `@syzygy/polaris-dossier/state-directory`.
  - A behaviour-preserving swap of that function is still a change touching class 1. CC-REV-1's own violation example is a
    refactor of class-3 code.
  - So GP-Q0's three class-1 checks apply. Their status:
    - the differential: done by the lane, and by me over my own corpus (sections 3 and 5);
    - a rule-6 mutant per predicate: 12 of 13 killed plus 1 argued equivalent (P7, which I find sound), and 2 more mutants of my
      own, both killed;
    - the owner notice: still owed (N7).
  - "Records with altered prose" has no literal counterpart here: this code reads paths and argv, never a prose record. The
    altered inputs stand in for altered records: mutated paths (loops, dangling links, `..`, `//`, trailing `/`, mode-000
    components, ENOTDIR, over-long names) and mutated argv (Unicode look-alike dashes, padded flags, `--opt=`, prototype names).
    [Inferred]
- **Class 4, not touched.**
  - No SEC-clause surface, auth check or egress path changes.
  - The credential is still minted and written by unchanged code.
  - Only the resolver that feeds the class-1 check moved, and its answers are unchanged on every input I could build (section 5).
    [Inferred]
- **Class 6, touched; no endpoint removed.**
  - The `syzygy` / `syzygy dossier` / `syzygy polaris` argv surface is what operators, and the commands Syzygy prints for waiting
    sessions, depend on. The audit row PD-2 calls it "exported (CLI)".
  - The PR re-implements that surface's reader, adds two package subpath exports and widens one exported type (N4).
  - No endpoint is removed, so GP-Q0 adds no extra check for class 6.
- **The PR's declaration** ("none declared in the code; class 1 possible") left the ruling to the reviewer, which CC-REV-1
  permits. The disposition should record "classes 1 and 6" (N7).
- **GP-Q0's stop rule is not triggered.** No accepted or refused argv form, path or exit code changes on any corpus I ran
  (section 5), so nothing returns to the owner.

## 3. What I ran, and the results

Everything below ran in my own scratch clones, at head (`rev-518/clone`) and at base (`rev-518/base-clone`), each after `npm ci`
and `npm run build`. Both builds printed `exit=0`. Node was v24.6.0 unless a row says otherwise. Each suite ran with a private
TMPDIR (`/tmp/r518-1` … `/tmp/r518-10`).

### Required suites, at head

| Run | Result (quoted) |
|---|---|
| `cli-table.test.ts`, `subpath-imports.test.ts` and `state-directory.test.ts` | `Test Files  3 passed (3)`, `Tests  48 passed (48)` |
| `cli.test.ts` | `Tests  59 passed (59)` |
| The `apps/syzygy` tests: the built-entry system suite, `vitest run --config packages/cap1-system/vitest.config.ts` (`apps/syzygy/src` has no test file of its own) | `Test Files  8 passed \| 1 skipped (9)`, `Tests  47 passed \| 1 skipped (48)`. The skip is `fresh-clone.system.test.ts`, which is `it.skipIf(!RUN_FRESH_CLONE)` |
| `npm run typecheck` | exit 0 |
| `python3 scripts/check_governance.py` | `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`, the same line as at base; the WARN check ids are identical at base and head (`diff` printed nothing) |
| `gh pr checks 518` | `checks pass` and `node pass` |

I saw no `syzygy-bpyt.4.13`-style timeout. I did not run the full PROJECT-STATUS battery: the brief does not require it, and the
lane reports 110/0, which I did not re-derive.

### My own argv corpora (`rev-518/tools/my_corpus.py`)

I wrote this generator independently of the lane's `edge_corpus.py`. It produces 368 daemon argv, 357 polaris argv and 1,696
dossier argv. Digests: `corpus/daemon.json` `22b87668…`, `corpus/polaris.json` `085fe308…`, `corpus/dossier.json` `25621321…`.

The atoms the lane's corpus does not stress:
- Unicode look-alike dashes: U+2010, U+2011, U+2013, U+2014, U+2212, U+FF0D, and a soft-hyphen prefix;
- whitespace-padded flags: `' --json'`, `'--json '`, `'--json\n'`, `'--help '`;
- `''`, `'='`, `'-='`, `'--='`, `'--=x'`, `'---'` and `'----'`;
- prototype-named options and commands: `--constructor`, `--__proto__`, `--toString`, `__proto__`, `valueOf`;
- prefixes of option names: `--roo`, `--state`, `--tool` against `--tool-version`, `--usage-token`;
- `--` consumed as a value, and `--`, `--help` or `-h` after it;
- stop options and boolean options given as values;
- a valued option given three times, `--opt=` with an empty inline value, a 300-character argument, and `-é` / `--été`.

| Run | Result (quoted) |
|---|---|
| Daemon `parseCli` and polaris `parseArgs`, lifted from each tree by my own TypeScript-AST lifter (`tools/lift.mjs`, which takes each `FunctionDeclaration` by name, not by text markers), run by `tools/parse_run.mjs` under 2 environments each | `{"label": "parse", "rows": 1450, "differ": 0, "rowsByCaller": {"daemon": 736, "polaris": 714}, ...}` |
| The same under Node v22.18.0, head against base on v24, and head against base both on v22 | `"rows": 1450, "differ": 0` for each |
| The lane's `daemon-corpus.json` and `polaris-corpus.json` through my harness | `"rows": 1026, "differ": 0` |
| Dossier `runDossierCli` in process, each tree's built `dist`, from an empty cwd, env `{}`, a fixed clock, no sleep, no stdin (`tools/dossier_run.mjs`) | `{"label": "dossier", "rows": 1696, "differ": 0}`. Of these, 184 rows reached a command (exit 0 or 1) and the rest were usage errors |
| Head dossier on Node v22.18.0 against base on v24 | `"rows": 1696, "differ": 0` |
| The built entries as subprocesses (`tools/entry_run.py`): every daemon argv my parse read as help or invalid (263), every polaris argv read as a refusal or a help exit (231), and 16 RTF-1 containment cases over a symbolic-link fixture | `"rows": 510`, `"differ": 0`, `"rtf1BaseExits": [1]` |

What the 1,450 parse rows held at head [Observed]:
- daemon: help 192, invalid 334, run 210;
- polaris: help exits 36, option sets 252, refusal strings 426.

The 16 RTF-1 cases cover these refusals, quoted from the run: `really resolves to <FX>/root/.syzygy/x, inside the governed plane`,
`state directory is invalid (symlink-loop)`, `(path-unreadable): filesystem inspection failed at <FX>/root/locked/inner
(EACCES)`, `(ENOTDIR)`, `observed root is invalid (symlink-loop)`, `observed root is invalid (path-unreadable)`, and the lexical
`lies inside the governed plane`. Their inputs include a root given as a link, a link chain into `.syzygy`, a trailing slash,
`plain/..` and a leading `//`.

### The `resolvePathIntent` census (`tools/census.mjs`)

Three copies over one corpus:
- the base daemon copy, with its helper `filesystemFailureCode`, lifted from base `main.ts` by AST;
- the base state-directory copy, from the base `dist`;
- the head shared copy, from the head `dist`.

The corpus is 376 inputs over a fixture built on disk:
- links: absolute and relative targets, `../`-relative, dangling (absolute, relative and chained), a 3-link chain, a self-loop, a
  pair loop, a loop reached through a path, a link to `/`, a link to a file, targets with `/`, `..`, `.` and `//`, a link to a
  mode-000 directory, links into and out of the governed plane, and the governed root itself as a link;
- each base path combined with 11 suffixes (`''`, `/`, `/x`, `/x/`, `/..`, `/../x`, `/.`, `//x`, `/x/../y`, `/sub`, `/sub/z`);
- `/`, `//`, `///`, `/.`, `/..`, `''`, relative inputs, and a 255-byte, a 256-byte and a 300-byte component.

Result: `{"inputs":376,"daemonAnswers":{"resolved":310,"symlink-loop":27,"path-unreadable":39},"daemonVsBaseState":0,"daemonVsShared":0,"baseStateVsSharedOnStateFields":0}`.
- The 39 path-unreadable answers are EACCES 25, ENOTDIR 12 and ENAMETOOLONG 2.
- `/`, `//` and `/..` each resolve to `/` in all three copies.

### Mutants of my own on the shared copy (rule 6)

Old and new fragments are in `rev-518/mutants/M1-….json` and `M2-….json`.
- **M1, a missing path judged at the failed prefix.** `realPath: candidate` becomes `realPath: current` in the ENOENT arm.
  - Census: `"daemonVsShared":56`.
  - `state-directory.test.ts`: `Tests  2 failed | 22 passed (24)`, failing "resolves a missing path to itself" and "resolves a
    dangling link to where it would land". **Killed.**
- **M2, ENOTDIR read as missing.**
  - Census: `"daemonVsShared":12`.
  - `state-directory.test.ts`: `Tests  1 failed | 23 passed (24)`, failing "refuses a component below a regular file as
    unreadable". **Killed.**

### The subpath guard

- **The lane's G5 (main.ts statically imports the barrel), reproduced from its spec verbatim:** `Tests  1 failed | 7 passed (8)`
  ("are /argv and /state-directory, imported statically, and the barrel is not"). Killed, as recorded.
- **My GM1: main.ts gains `export { runDossierCli } from '@syzygy/polaris-dossier';`** `Tests  8 passed (8)`. **Survived** (N2).
- **My GM3: argv.ts gains `import { createRequire } from 'node:module'` and `createRequire(import.meta.url)('./cli.js')`.**
  `Tests  8 passed (8)`. **Survived** (N2).
- **What the daemon's `--help` path loads**, through a Node resolve hook (`tools/log-hooks.mjs`):
  - base: 35 modules, 0 from polaris-dossier;
  - head: 38 modules, 2 from polaris-dossier (`argv.js`, `state-directory.js`);
  - head with GM1's line added to a copy of `dist/main.js`: 147 modules, 38 from polaris-dossier.

### The `Outcome` type

- Base `dist` against head `dist` for the 10 type-only files (brief, check, close, execution-choice, init, inventory, render,
  review, session-handover, waiting-sessions): the sha256 of the emitted `.js` is identical in 10 of 10. `outcome.js` is
  `export {};`.
- These 10 sources did not change between `a14b6d1c` (the lane's emit comparison) and head: `git diff --stat` printed nothing.
- A `tsc --strict` probe (TypeScript 5.9.3) of the ReviewPacketResult shape: the old form is assignable to the new one, but the
  new one is not assignable to the old (`error TS2322: Type 'New' is not assignable to type 'Old'`). See N4.

### The AC1 sweep

- **The lane's script, re-run on `git archive` exports of both trees:** base `42 files, 15 hits`; head `44 files, 3 hits`
  (`argv.ts:50`, `argv.ts:54`, `run-config.ts:182`).
- **Neither population has a subdirectory** (`find -mindepth 1 -type d` printed nothing), so the script's non-recursive listing
  covers the whole population.
- **My own sweep with independent patterns** (`tools/my_sweep.py`): `44 files 134 hits`, of which 113 are loop headers.
  - None of the 113 loop headers reads argv. All of the 9 next-element reads are byte or line cursors, in `doctrine-quote.ts` and
    `git-object-reader.ts`.
  - It also finds argv read by hand, without a loop, at `broker-client.ts:13-15` and `broker.ts:35` (both unchanged by this PR),
    and at `cli.ts:437`, `:440` and `:442` (the `--json` filter and the help names, inherited unchanged). See N6.

### Test delta

`npx vitest list` over the 4 test files the PR touches gave base 70 names and head 107: `removed 0 added 37`.
- `cli.test.ts`: 57 → 59;
- `state-directory.test.ts`: 13 → 24;
- `cli-table.test.ts`: 0 → 16;
- `subpath-imports.test.ts`: 0 → 8.

The only test or testkit files that changed are these 4 plus `fs-patch.testkit.ts`. This confirms `Tests: +37 ~1 -0`.

### The lane's reader mutants against the committed suites only (`tools/committed_suite_mutants.py`)

Each R spec's edits were applied verbatim to `argv.ts`, then:
- polaris-dossier's `dist` was rebuilt;
- the 11 polaris-dossier test files that call `runDossierCli` ran from source (591 tests);
- `daemon-entry-unchanged.system.test.ts` ran against the built entry (15 tests).

The evidence goldens were not run, because no CI step runs them.

| Mutant | Dossier tests (591) | Daemon system test (15) | Committed suites |
|---|---|---|---|
| R0 unmutated | `591 passed` | `15 passed` | control passes |
| R1 terminator skipped | `591 passed` | `15 passed` | **survived** |
| R2b group read by its first option | `591 passed` | `15 passed` | **survived** |
| R3 dash value taken when refused | `591 passed` | `15 passed` | **survived** |
| R4 repeat taken when refused | `2 failed \| 589 passed` | `15 passed` | killed |
| R5 positional taken when refused | `591 passed` | `2 failed \| 13 passed` | killed, but only as a hang (see below) |
| R6 stop option ignored | `591 passed` | `3 failed \| 12 passed` | killed |
| R7 dash positional taken | `591 passed` | `15 passed` | **survived** |
| R8 boolean option ignored | `591 passed` | `15 passed` | **survived** |
| R9 missing value unchecked | `2 failed \| 589 passed` | `2 failed \| 13 passed` | killed by the dossier tests |
| R10 first value kept | `591 passed` | `15 passed` | **survived** |

Disclosures about this run:
- **R5 and R9 made the daemon start**, R5 for `--port 0 dossier` and `Dossier`, and R9 for `--port`. R5's `Dossier` row and R9's
  `--port` row each bound the default port 127.0.0.1:7477.
- **The test's `spawnSync` has no timeout, so it hung.** I ended each mutant daemon by its pid (my own child processes, whose cwd
  was under `/tmp/r518-9`). The kills are listed in `results/hung-daemon-kills.log`, plus two manual kills during R5. The rows
  then failed with `status: null`.
- **One kill hit a `--help dossier` process during the R9 run**, so R9's `--help dossier` failure is contaminated. R9 is killed
  independently by its 2 dossier-test failures.
- **R3 and R9 also failed to type-check** (`build: 1`). tsc still emitted the mutated JavaScript: R9's `--port` row started a
  daemon on 7477. R3 only touches the `refuse` arm, which no daemon or polaris caller uses.
- **The worktree was clean after every mutant** (`restoredClean: true` 11 of 11). A final rebuild exited 0, and `dist/argv.js`
  holds none of the mutant fragments (a grep count of 0).

**Summary: 6 of 10 reader predicates (R1, R2b, R3, R7, R8, R10) are pinned by no committed test.** The retained goldens kill all
10 (`evidence.json` `readerMutants`), but no CI step runs them. See N1.

## 4. Findings

There is no blocking finding (no F). There are eight notes, N1 to N8.

### N1 — Six of the ten argv-reader predicates are pinned only by the evidence goldens, which no CI step runs (medium)

- **Evidence.** [Observed] The committed-suite table in section 3:
  - R1 (the `--` terminator), R2b (short groups), R3 (a dash-led value refused), R7 (a dash-led positional), R8 (the boolean
    options) and R10 (the last value wins) each leave all 591 dossier-CLI tests and all 15 daemon-entry tests green.
  - `syzygy polaris`'s `parseArgs` has no committed test at all. No `*.test.ts` calls `runPolarisCli`, and that was already so
    at base.
  - `syzygy-bpyt.8.5` plans to move `argv.ts`: the PR's residual list says so, and `subpath-imports.test.ts:11`.
- **Failure scenario.** A later edit to `readArgv`, in 8.5 or anywhere else, ends up skipping the `--` token (R1).
  - `syzygy dossier status -- <run>` then runs `status` on `<run>`, where today it refuses with exit 2
    (`unknown option for status: --`).
  - `check <run> --draft -x` takes `-x` as the draft (R3).
  - Every committed test stays green, and a refused form becomes an accepted one with no owner act. GP-Q0's stop rule exists to
    prevent exactly that.
- **Proposed fix.** Commit `packages/polaris-dossier/src/argv.test.ts`, a literal table of `readArgv` answers per caller policy:
  - daemon (`stopAt`, `positionals: false`, `dashValue: 'take'`, `repeat: 'last'`);
  - dossier one-argument;
  - dossier options (`refuse` and `refuse`);
  - polaris (`booleans`, `take`, `last`).

  It needs at least one row per predicate: `--`, `-abc`, `-hx`, `-`, `-5`, `--x=v`, a dash-led value, a repeat, a missing value,
  a boolean and a stop option. Rerun R1–R10 against it and record the results. It belongs with this bead's follow-up, or as a
  precondition of 8.5. The test-rigor bar's expectation 3 applies: "Edge and failure paths are first-class … Happy-path-only
  coverage of a failure-prone component is a finding".

### N2 — The subpath guard misses two ways to pull the barrel into the daemon path (low)

- **Evidence.** [Observed]
  - **GM1:** a static `export { runDossierCli } from '@syzygy/polaris-dossier';` in `main.ts` leaves `subpath-imports.test.ts` at
    `8 passed`.
    - Its first test filters `ts.isImportDeclaration` (`subpath-imports.test.ts:31`), so an `ExportDeclaration` is invisible to
      it.
    - With that line, the daemon's `--help` path loads 147 modules (38 from polaris-dossier), against 38 (2) without it.
  - **GM3:** `argv.ts` loading `./cli.js` through `createRequire` from `node:module` also passes. The predicate is "imports node:
    built-ins alone", and `node:module` is a built-in that can load anything.
  - A top-level `await import('@syzygy/polaris-dossier')` in `main.ts` would also pass test 1 [Inferred from the same filter].
- **Failure scenario.** An edit re-exports a dossier symbol from the entry, or a dossier subpath gains a `createRequire` call.
  Every daemon start then evaluates the whole dossier package and its dependencies. The guard and CI stay green.
- **Proposed fix.**
  - In test 1, collect every import edge of `main.ts` with `ts.preProcessFile(text, true, true)` (static, export-from and
    dynamic). Assert that the barrel appears only as a dynamic import inside the `dossier` and `polaris` branches, as
    `daemon-entry-unchanged.system.test.ts:203-217` already does for the POC app.
  - In test 2, pin the exact built-in list: `argv.ts` imports `node:util`; `state-directory.ts` imports `node:crypto`,
    `node:fs` and `node:path`. Or forbid `node:module`.
  - Add GM1 and GM3 as recorded mutants.

### N3 — The daemon-entry system test hangs, rather than fails, when a parse regression admits an argv, and a regression can bind the default port 7477 (low; pre-existing file, not in this diff)

- **Evidence.** [Observed] Under R5 and R9, `daemon-entry-unchanged.system.test.ts`'s `runSync` (`spawnSync`, with no `timeout`)
  waited on a daemon that never exits. The run hung for about 27 minutes until I killed the daemon by pid. Under R5, `Dossier`
  bound 127.0.0.1:7477 (`ss -ltnp` showed the mutant's pid); under R9, `--port` started a daemon that bound 7477 too.
- **Failure scenario.** A future argv regression in CI hangs the system job instead of failing it. On a developer host it can
  take, or collide with, port 7477.
- **Proposed fix.** In that test's `runSync`, pass `timeout` (for example 20 s) to `spawnSync`, and add `SYZYGY_PORT: '0'` to its
  `ENV`. A wrongly admitted argv then binds an ephemeral port, and the row fails with a timeout. Track this under a separate bead:
  the file is outside this PR.

### N4 — "The step result types … are structurally the same types" is not exact for `ReviewPacketResult` (low)

- **Evidence.** [Observed]
  - At base, `ReviewPacketResult` was a union of two `ok: true` variants (fidelity and design reports) and one refusal.
  - At head it is `Outcome<Fidelity | Design, Refusal>`, which is one `ok: true` variant whose `report` is a union. The new type
    is strictly wider.
  - A `tsc --strict` probe of the same shape gives `error TS2322: Type 'New' is not assignable to type 'Old'`; the old form is
    assignable to the new one.
  - It is exported from the barrel (`index.ts:19`). No consumer in the repository depends on the difference: typecheck passes,
    and the emitted JavaScript is identical.
- **Failure scenario.** None at runtime. A future consumer of `ok: true` that relies on the old per-variant pairing loses that
  correlation at the type level. More immediately, the PR's sentence overstates what the commit proves.
- **Proposed fix.** Either write the type as `Outcome<Fidelity, Refusal> | { readonly ok: true; readonly report: Design }`, or
  correct the sentence in the disposition: "structurally the same, except `ReviewPacketResult`, now a supertype of its old form".

### N5 — `readArgv` silently cannot read a single-dash valued option (low; latent)

- **Evidence.** [Observed] `argv.ts:42` keys `parseArgs`'s options by `name.slice(2)`.
  - With `valued: ['-o', '--out']`, `readArgv(['-o','file'])` returns `{"fault":"missing-value","arg":"-o"}`, while `--out file`
    is read.
  - No current caller declares a single-dash valued or boolean name: I read all three callers' lists.
- **Failure scenario.** A later caller adds a short valued option, for example in 8.5's leaf util. It is refused on every input,
  and nothing says why.
- **Proposed fix.** In `readArgv`, throw a programming error when any `valued`, `booleans` or `stopAt` name is not of the form
  `--<name>`, with `-h` allowed only in `stopAt` and `booleans`. Or state the constraint in the `ArgvSpec` doc comment. Add one
  test row either way.

### N6 — The AC1 sweep statement should name the hand-written argv reads that are not loops (low)

- **Evidence.** [Observed] My sweep found argv read by hand outside `argv.ts`. None of them is a loop, so AC1 ("no hand-rolled
  argv loop") holds. The lane's patterns do not report them:
  - `broker-client.ts:13-15` (`argv.includes('--stdin')`, the standalone in-view client);
  - `broker.ts:25,35` (the broker rules destructure argv after filtering `--json`);
  - `cli.ts:437`, `:440` and `:442` (the `--json` filter and the help names, inherited unchanged).
- **Failure scenario.** A later reader trusts "3 hits at head" as the whole population of argv handling. The broker rules are a
  security-relevant authorization over forwarded argv, and they must keep agreeing with `runDossierCli`'s reading.
- **Proposed fix.** Add one sentence to the disposition and the AC1 record naming these sites and why they are not loops. Note the
  broker-rule/reader coupling for 8.5.

### N7 — Record the ruled classes and add the class-1 owner notice (low; process)

- **Evidence.** Section 2 rules classes 1 and 6. GP-Q0 requires "a non-blocking owner notice in the cycle report" for class 1,
  and none exists yet: the cycle report is `syzygy-bpyt.10`. [Observed: the PR body says "An owner notice line would go in the
  cycle report"]
- **Failure scenario.** The class-1 change merges with no owner-visible notice, against GP-Q0.
- **Proposed fix.** In the disposition record and the PR body, state "CC-REV-1 classes: 1 (RTF-1 containment resolver unified) and
  6 (CLI argv surface re-implemented, no endpoint removed)". Add one owner-notice line to the `syzygy-bpyt.10` cycle report, citing
  `path-intent.json` and this raw.

### N8 — The new EACCES row in `state-directory.test.ts` passes only when the suite runs as a non-root user (low)

- **Evidence.** [Observed] `state-directory.test.ts:119-129` relies on `chmod 0o000` blocking `lstat`. Root bypasses that, so
  under root the row would see ENOENT and fail.
  - The same pattern already exists in `state-dir.system.test.ts:364` and `launched.test.ts:64`.
  - `credential-probe.test.ts:20` has the repository's idiom for it: `const isRoot = process.getuid?.() === 0`.
  - CI runs on `ubuntu-latest` as a non-root user, and the job passed.
- **Failure scenario.** Someone runs the suite as root, for example in a container. The test fails for a reason unrelated to the
  code, which teaches people to ignore red.
- **Proposed fix.** Write that row as `it.skipIf(isRoot)`, with a comment, in the follow-up that adds N1's test.

## 5. Every changed output, or the evidence that there is none

**No CLI output changes.** [Observed] Over my corpora, base against head, comparing exit code, stdout and stderr (or the
parse-level return value), 0 rows differ:
- 1,696 dossier argv in process: 0 differ on Node 24, and 0 for head on Node 22 against base on Node 24;
- 1,450 lifted parse rows on Node 24 and on Node 22;
- the lane's 1,026 parse rows through my harness;
- 510 built-entry subprocess runs (263 daemon, 231 polaris, 16 RTF-1).

**No path judgement changes.** The census gave 0 of 376 inputs differing between the base daemon copy and the head shared copy,
on `resolved`, `realPath`, `reason` and `detail`. These agree with the lane's own 0 of 1,617, 0 of 1,302, 0 of 1,195, 0 of 296
and the caller differentials. The lane also showed, with a negative control, that its harness can see a difference.

Changes that are not outputs [Observed]:
- **The daemon's module graph.** The daemon path now statically loads `@syzygy/polaris-dossier/argv` and `/state-directory`: 38
  modules on `--help`, against 35 at base. If polaris-dossier's `dist` is missing, every daemon start fails at import. `npm run
  build` and `tsc -b apps/syzygy` build it, because `apps/syzygy/tsconfig.json` already references the package. The coordinator
  allowed this.
- **Package exports.** `./argv` and `./state-directory` are added. `cli.ts` exports `DOSSIER_COMMANDS`; the barrel is unchanged.
- **`resolvePathIntent`'s type.** Its failure arm gains `reason`. The daemon copy's `dangling` field is dropped (no caller read
  it), and `intendedRealPath` is now `realPath`.
- **`ReviewPacketResult`** is widened (N4).

The spec scenarios (REQ-polaris-generation-033..036) are not affected:
- **`polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md`** pins no usage line, refusal text, option or exit code. A
  sweep for `exit`, `usage error/line/text`, `unknown option`, `takes exactly`, `--<name>` and `syzygy dossier|polaris <cmd>`
  found 0 hits for each.
- **The design's "Command surface"** (`design.md:309-315`) pins the exit statuses: "0 clean, 1 findings or refusal (reason
  printed), 2 usage error, and since version 1.2, 3 when `await` is still waiting". It also pins the commands and option shapes.
  All are unchanged, per the goldens above.
- **The one-command-run proposed spec** names `--clone`, `--resume`, `syzygy dossier init` and `syzygy polaris --resume`. Their
  reading is unchanged: the polaris rows in section 3 include every valued option with values, `=`-forms, repeats and dash
  values.

## 6. Verdict per acceptance criterion

- **AC1 — one parser and one command table; no hand-rolled argv loop remains in `apps/syzygy` or `polaris-dossier` (sweep
  stated): met.**
  - `readArgv` is the one reader for all three callers, and `DOSSIER_COMMANDS` is the one table.
  - The lane's sweep reproduces exactly: 42 files and 15 hits at base, 44 files and 3 hits at head.
  - My independent sweep finds no argv loop. It finds three hand-written argv reads that are not loops, which should be disclosed
    (N6).
  - `dossier-main.ts` is outside both trees, and the coordinator excluded it.
- **AC2 — every CLI test passes unchanged; a table-driven test enumerates every command's usage line: met.**
  - `cli.test.ts` gives 59 passed, and the other runDossierCli test files pass (591 tests in the R0 control).
  - `cli-table.test.ts` enumerates all 15 synopses as literals and checks them against `DOSSIER_USAGE`.
  - The one changed body is `cli.test.ts:125`'s literal source list, which gains `argv.ts` and `outcome.ts`. **I agree with the
    coordinator's ratification.** The test pins the population that its own "imports no network module" sweep runs over, so
    adding a source file must add it there. The two new modules get their own no-network rows, and no assertion about the CLI's
    behaviour changed.
- **AC3 — exit codes and stderr text identical for every refusal (golden over the CLI test corpus): met.**
  - The lane's golden over the 919 captured test argv plus 758 edge forms differs on 0 rows. Its negative control differs on 20
    and 42.
  - My independent 1,696-row dossier corpus and the 510 subprocess runs differ on 0 rows.

## 7. Test quality

The test-rigor bar is in `th-engineering/subskills/test-rigor/SKILL.md`.

**`cli-table.test.ts` (+16).**
- Its expected values are literals: the 15 synopses, and two first lines per command.
- It derives nothing from the table it tests, except the names that key it (bar 4).
- The lane's U1–U10 record kills 10 of 10 mutants.
- Its reach is narrow. It pins only `[name]` and `[name, '-5']`. The "requires a value", "given more than once", flag-doubling
  and positional-count messages are pinned elsewhere only for some commands: `start-gates.test.ts:1074-1078` and
  `check.test.ts:567-569`.

**`state-directory.test.ts` (+11).**
- One row per arm, with full literal objects, including `reason`.
- The readlink-failure arm is reached by patching `readlinkSync` through `fs-patch.testkit.ts`. That is a boundary the repository
  does not own, so the mock is legitimate under bar 5.
- My M1 and M2 are killed. The root caveat is N8.

**`subpath-imports.test.ts` (+8).**
- It sees the forbidden forms it names: static, type-only, export-from, `require` and dynamic, inside the two subpath modules.
- For the entry, it checks only `ImportDeclaration`s, and `node:` is too broad an allow-list (N2).

**`cli.test.ts` (~1, +2).** Ratified above.

**The suite as a whole: the new shared reader has no unit test of its own** (N1).
- `readArgv` decides what three entry points accept and refuse, and 6 of its 10 predicates survive every committed suite.
- The rule-6 evidence the lane recorded is sound: 10 of 10 killed by the goldens, with old and new fragments and the commit
  stored. But a golden that no CI step runs protects only the commit it ran at.
- The net test delta is +37, and every test added catches a mutant that no earlier test caught, which meets bar 10.

**The evidence records satisfy rules 6 and 11.**
- Each record names its subject commit in full (`runsAt`, `base`) and per-file sha256 digests, all re-verified in section 1.
- Every mutant record stores its edits as `old`/`new` fragments, with its command and its commit (`b5446ec7` or `78853844`).
- R2's survival at `856d5c5c` is recorded with its disposition.
- P7 is argued equivalent. The argument is sound on POSIX:
  - each candidate comes from `path.resolve`, which leaves no empty component except the root's, and that one joins back to `/`;
  - my census agrees on `/`, `//`, `///` and `/..` [Inferred, for every input outside the census].
- Minor: `path-intent.json` records the lane's worktree path as `lifted.head.tree`. The commit and digests are the real anchor,
  so this costs nothing.

**Node versions.** The PR's goldens ran on Node v24.6.0 only. I re-ran the parse corpus on v22.18.0, and the dossier corpus for
head on it: 0 differ. `engines` is `>=22.15`, and 22.15 itself is untested [Unknown]. `node:util` `parseArgs` treats any
following argument, `--` included, as a string option's value on both versions tested [Observed]. I know of no change to that
between 22.15 and 22.18 [Inferred].

## 8. Cleanup

- I ended my own processes by pid only: the mutant daemons listed in section 3. At the end, no process of mine remained:
  `ps -eo pid,args | grep -F rev-518/clone/apps/syzygy/dist/main.js` printed none.
- I deleted the scratch clones `rev-518/clone` and `rev-518/base-clone`, the lifted, base-copy and lane-corpus scratch
  directories, and the private TMPDIRs `/tmp/r518-1` … `/tmp/r518-10`. I deleted nothing else in `/tmp`.
- I kept, beside this raw:
  - `rev-518/tools/`: the corpus generator, lifter, harnesses, census, entry runner, sweeps, the committed-suite mutant runner and
    the resolve hook;
  - `rev-518/corpus/`: my three argv corpora;
  - `rev-518/mutants/`: the M1, M2, GM1 and GM3 specs;
  - `rev-518/results/`: every result file and log quoted above.
- I changed, pushed, commented on or merged nothing in the subject, and I ran no `bd` mutation.
