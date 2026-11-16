# R-GP-IMPL-ARGV-TABLE-1 — CC-REV-1 implementation review of syzygy-bpyt.8.32, round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: e3e6a78b
Subject: r1-review.diff sha256 ffb43eb9096074b99e7022fd304216f8565844f226ddc772a6aef20adc5784ec

Reviewer: an independent fresh-context agent (rev-521). I did not author this change and share no context with its author. I
read the bead, the PR body, the round-1 raw of PR #518 and its dispositions, the governing references below, and the subject.
I edited no worktree under `/home/tze/GitHub/syzygy/.worktrees/`, pushed nothing and commented nowhere. I read no observed
repository's content.

## 1. Subject identity checks

- [Observed] `sha256sum r1-review.diff` printed
  `ffb43eb9096074b99e7022fd304216f8565844f226ddc772a6aef20adc5784ec`, the brief's digest.
- [Observed] In my scratch clone, `git diff df6046a153fe130202abdf6bd3045a79ba143879 e3e6a78b2ae9db8a26e5139ce74213325f3e8d72 |
  sha256sum` printed the same digest. So the subject file is that diff. `git diff --stat` printed `15 files changed, 1828
  insertions(+), 28 deletions(-)`.
- [Observed] `git merge-base df6046a1 e3e6a78b` is `df6046a153fe130202abdf6bd3045a79ba143879`.
  `gh api repos/Tzeusy/syzygy/commits/main --jq .sha` printed the same commit. `gh pr view 521` gives head `e3e6a78b…`, base
  `main`, `OPEN`, `MERGEABLE`. So the subject is exactly what would merge.
- [Observed] Commits `df6046a1..e3e6a78b`: `adc57243`, `9a1bd629`, `93ab9b56`, `e3e6a78b`.
- [Observed] Layout. 0 files under `.syzygy/` or `openspec/`.
  - Code: `argv.ts`, `review.ts`, `argv.test.ts` (new), `subpath-imports.test.ts` and `state-directory.test.ts`, all in
    `packages/polaris-dossier/src/`.
  - Evidence and tools: 10 files under `docs/evidence/syzygy-bpyt-8-32/`.
  - Unchanged from base: `state-directory.ts`, `apps/syzygy/src/main.ts`, `cli.ts`, `polaris.ts` and the package's
    `package.json` (`git diff --stat` printed nothing for those five).
- [Observed] The lane's evidence records name `93ab9b56`, not the head.
  - `git diff --stat 93ab9b56 e3e6a78b -- apps packages` printed nothing.
  - `git diff df6046a1 93ab9b56 -- apps packages` and `git diff df6046a1 e3e6a78b -- apps packages` both hash to `d4043be9…`. That equals the
    record's `diffSha256`.
  - All 7 of the record's per-file subject digests, and all 6 of its tool digests, equal the head bytes.
  - All 4 of `goldens-record.json`'s file digests, and all 8 of its tool digests, equal the head bytes.

## 2. Clauses relied on (quoted), and the class ruling

**CC-REV-1** (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md`):
- :31 "1. **authority boundaries** — write-universe, typed-authority table, adapter authorization (VIS-5, VIS-6);"
- :40 "6. **public interface** — machine-queryable endpoints, adapter contracts, anything an external consumer can depend on;"
- :45-46 "**Class membership is contested by default and is never finally determined by the agent performing the change**"
- :49-50 "**The change record states** which classes the change touches, or "none," so a misclassification is a findable violation
  after the fact."
- :51 "**A reviewer or the owner** may reclassify at any time."

**GP-Q0** (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`):
- :51 "Behavior-preserving refactors may proceed under the acts already in force."
- :52-53 "'Behavior-preserving' means none of the following changes: … a rendered byte, a wire format, a refusal string or an
  exit code;"
- :62 "**Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4
  (security), and class-6 pull requests that remove an endpoint."
- :64-66 "an old-versus-new differential over a mutated-record corpus that includes records with altered prose; a rule-6 mutant
  for each predicate; a non-blocking owner notice in the cycle report."
- :95-96 "Any change not listed here to what a gate accepts or refuses stops and returns to the owner"

**AGENTS.md** (at the reviewed commit):
- :273-274 "Conformance expected values are hard-coded literals, never imported from the module under test."
- Verification rules 2, 4, 6 and 9.

**The test-rigor bar** (`th-engineering/subskills/test-rigor/SKILL.md`):
- "A test is worth keeping only if some plausible bug makes it fail."
- Expectation 3: "Edge and failure paths are first-class".
- Expectation 4: "Expected values are literals or independently derived."
- Expectation 7: "A failure names the defect".

**Ruling: class 6 is touched, with no endpoint removed. Classes 1, 2, 3, 4, 5 and 7 are not touched.**

- **Class 6, touched.**
  - `@syzygy/polaris-dossier` exports `./argv` as a public subpath. At head its `package.json` `exports` are `['.', './argv',
    './state-directory']`.
  - `readArgv` behind that subpath now throws for a spec it could never read. Before, it answered such a spec with faults.
  - `ReviewPacketResult` is exported from the barrel (`index.ts:19`). It narrows back to its pre-Outcome form, and 8.2's wide
    form is no longer assignable to it (TS2322, section 3).
  - Both are things "an external consumer can depend on". No endpoint is removed, so GP-Q0 adds no further check.
- **Class 1, not touched.** [Observed]
  - The RTF-1 resolver (`state-directory.ts`) and the daemon's containment check (`main.ts`) are byte-identical to base.
  - The only class-1-adjacent byte is one test row, now `it.skipIf(isRoot)`. It changes whether that row runs under root, where
    it could not pass. It does not change what the resolver accepts or refuses.
  - A reviewer or the owner may reclassify (:51). If this is ruled class 1, GP-Q0's three checks stand as follows:
    - **Differential:** the dossier golden differs on 0 of 1,696 rows (mine, section 3). The lane's subprocess golden carries
      9 RTF-1 containment refusals; its record's input digests equal the head bytes, but I did not re-run it.
    - **A rule-6 mutant for the one changed predicate (the skip):** K1 and K2, re-run and killed, and my OK1 and OK2. See N7
      for what they prove.
    - **Owner notice:** the coordinator's, on the cycle report.
    - "Records with altered prose" has no counterpart: this code reads argv and paths, never prose. [Inferred]
- **Classes 2, 3, 4, 5 and 7, not touched.** [Inferred from the layout in section 1]
  - Nothing mints identity, composes a snapshot, touches a SEC surface, auth or egress path, migrates a store, or renders a
    certificate.
- **GP-Q0's stop rule (:95-96) is not triggered.** No accepted or refused argv form, path or exit code changes:
  - the dossier golden is digest-equal to base;
  - the new throw depends only on the spec, and 13 of 13 real specs pass it (section 3);
  - the subpath guard is a test.

## 3. What I ran, and the results

All of it ran in my scratch clone `rev-521/clone` at `e3e6a78b`, after `npm ci` (`EXIT 0`), on Node v24.6.0, with private TMPDIRs
`/tmp/r521-1` to `/tmp/r521-9`. Tools are under `rev-521/tools/`.

### Required suites, at head
- `npm run typecheck`: `EXIT 0`.
- `argv.test.ts`, `subpath-imports.test.ts` and `state-directory.test.ts`: `Test Files  3 passed (3)`, `Tests  106 passed (106)`
  (65, 17 and 24).
- `npx vitest run --project @syzygy/polaris-dossier`: `Test Files  32 passed (32)`, `Tests  1307 passed | 1 skipped (1308)`,
  exit 0. The one skip is in `no-egress.test.ts`, which this PR does not touch.
- `python3 scripts/check_governance.py`: `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`, exit 0.
- `python3 scripts/check_quotations.py`: exit 0; `OK    QC-1  a quotation beside a path:line locator was said by that file — 36
  quotations examined in 17 of 939 .md files scanned (loc-paren-quote 2, loc-colon-quote 24, quote-paren-loc 10), 0 findings`.
- `daemon-entry-unchanged.system.test.ts` against the built entry (control `C0-daemon`): `Tests  15 passed (15)`.
- I did not run the canonical battery. The PR's `commands=110 nonzero=0` is lane-reported.

### Is the table literal and independent?
- **Literal sweep** (`tools/literal_sweep.mjs`, by syntax tree). [Observed]
  - It reads the last element of every `it.each` row in `argv.test.ts`, and every `toEqual` argument outside the tables.
  - Result: `"tableRows": 64, "directLiteralExpectations": 2, "nonLiteral": []`. 64 rows plus one plain `it` make the 65 tests.
  - Negative control (rule 6): one row's expectation replaced by `readArgv(['--port'], DAEMON)` in a scratch copy is reported as
    `"row 34: CallExpression readArgv(['--port'], DAEMON)"`.
- **Each copy against its caller** (`tools/spec_copies.mjs`). [Observed] It lifts every `readArgv` call's spec from the syntax
  tree: `main.ts:71`, `polaris.ts:128`, `cli.ts:451` and `cli.ts:464`.
  - `"daemonCopyEqual": true`, `"polarisCopyEqual": true` and `"dossierOneCopyEqual": true`.
  - `"dossierOptionsPolicyEqual": true`: `dashValue`, `repeat` and `positionals` equal `cli.ts:464`'s.
  - `DOSSIER_OPTIONS.valued` `["--revision","--declare"]` equals exactly one command's options: `'allow-execution'` (`cli.ts:299`).
- **Would a drift between copy and caller go unseen in CI? Yes.** See N2. [Observed for the suites named]
  - D1, polaris `repeat: 'last'` → `'refuse'`: project `Tests  1307 passed | 1 skipped (1308)`.
  - D2, daemon `repeat: 'last'` → `'refuse'`: project the same, and daemon-entry `Tests  15 passed (15)`.
  - D3, the dossier options `dashValue: 'refuse'` → `'take'`: project the same. Only the dossier golden kills it (digest
    `f8bb9a29…` ≠ base).
  - Sweep (rule 9). Over 252 files (every tracked `*.test.ts` plus `cap1-system/src/harness.ts`), a line naming one of nine
    valued options (`--port`, `--root`, `--state-dir`, `--model`, `--clone`, `--revision`, `--deadline`, `--operator`,
    `--audience`) twice, single-quoted, occurs only in `argv.test.ts` (16 lines). So outside the copy, D1 and D2 have nowhere
    else to be seen. [Inferred within the sweep's limits: one line, single quotes, nine of the 18 daemon and polaris valued
    names.]
  - The daemon-entry test's dossier rows (`:168`, `:179`, `:195`) pass no dossier valued option, so D3 cannot be seen there.

### Do the mutants prove what they claim?
- **The lane's spec file rebuilds byte-identically.** `build_mutants.py` re-run printed `4 controls, 26 mutants`, and its output
  hashes to `f14f54fd4a9c576a089f5ce28234962a9b1dea0e16c2aaf48504e04fccb52ebe`, which is the committed `mutants.json`.
- **Copied edit for edit** (`tools/check_mutant_copies.py`). R1, R2b and R3–R10 equal 8.2's specs (`edits-equal`), and GM1 and
  GM3 equal the review's specs. Each `old` fragment occurs once at head.
- **Re-run from the recorded fragments** with my own applier, `tools/run_mutants.py` (not the lane's `mutate.py`).
  - Controls: `C0-argv` `Tests  65 passed (65)`; `C0-guard` `Tests  17 passed (17)`; the row as the user is `['passed']`; the row
    under my own simulated-root shim (`tools/fake-root.mjs`) is `['skipped']`.

| Mutant | Result at head | Lane's record |
|---|---|---|
| R1 terminator skipped | `Tests  4 failed \| 61 passed (65)` | killed |
| R2b group read by its first option | `Tests  2 failed \| 63 passed (65)` | killed |
| R3 dash value taken when refused | `Tests  3 failed \| 62 passed (65)` | killed |
| R4 repeat taken when refused | `Tests  1 failed \| 64 passed (65)` | killed |
| R5 positional taken when refused | `Tests  1 failed \| 64 passed (65)` | killed |
| R6 stop option ignored | `Tests  3 failed \| 62 passed (65)` | killed |
| R7 dash positional taken | `Tests  3 failed \| 62 passed (65)` | killed |
| R8 boolean option ignored | `Tests  3 failed \| 62 passed (65)` | killed |
| R9 missing value unchecked | `Tests  3 failed \| 62 passed (65)` | killed |
| R10 first value kept | `Tests  2 failed \| 63 passed (65)` | killed |
| GM1 entry re-exports the barrel | `Tests  1 failed \| 16 passed (17)` | killed |
| GM3 argv loads the CLI through node:module | `Tests  1 failed \| 16 passed (17)` | killed |
| GM7 entry re-exports the barrel as a namespace | `Tests  1 failed \| 16 passed (17)` | killed |
| S3 stop names unchecked (spec guard) | `Tests  2 failed \| 63 passed (65)` | killed |
| S7 short form never (spec guard) | `Tests  32 failed \| 33 passed (65)` | killed |
| K1 root skip dropped (root skip) | row `['passed']` under the shim, expected `skipped` | killed |
| K2 root skip inverted (root skip) | row `['skipped']` as the user, expected `passed` | killed |

- The failing titles equal the lane record's for 16 of these 17. For S7, my runner keeps 12 titles and the lane's keeps 20.
- `restoredClean True`.
- **R2's "not applicable" is right.** [Observed]
  - R2's old fragment, `arg !== token.rawName`, stands at `856d5c5c:packages/polaris-dossier/src/argv.ts:52`. It was removed by
    `c5908cc0` ("judge each argv token by its whole argument alone"). It occurs 0 times at head, and `rawName` occurs 0 times in
    base `argv.ts`.
  - At head, R2's predicate (an option is recognised only by its whole argument) is spread over three arms: valued, stop and
    boolean. R2b mutates the stop arm. My OR3 (the valued arm judged by `rawName`: `Tests  2 failed | 63 passed (65)`) and OR4
    (the boolean arm: `Tests  1 failed | 64 passed (65)`) cover the other two. Both are killed.
- **My own mutants, one or more per new predicate family.** Fragments are in `my-mutants.json` and `phase2-mutants.json`; results
  are in `my-mutants-result.json` and `phase2-result.json`.

| Family | Mutant | argv / guard / row test | Other suites | Verdict |
|---|---|---|---|---|
| reader table | OR1: the missing-value check before the repeat check | `Tests  65 passed (65)` | project `1307 passed \| 1 skipped`; dossier golden digest `54983601…` (= base) | **survives everything** (N1) |
| reader table | OR2: an empty value read as missing (`!token.value`) | `Tests  65 passed (65)` | project the same; daemon-entry `15 passed`; dossier golden `e74b93c9…` ≠ base | **survives CI**, killed by the golden only (N1) |
| reader table | OR3, OR4 (above) | killed | — | killed |
| two-way edge finder | OE1: the agreement one way only (`walked.some(s => !reported.includes(s))`) | `Tests  17 passed (17)` | — | **survives** (N3) |
| two-way edge finder | OE2: the walker drops its `require` arm | `Tests  2 failed \| 15 passed (17)` | — | killed |
| edge finder, subject | OE3: `main.ts` gains `const barrel = '@syzygy/polaris-dossier'; await import(barrel);` | `Tests  17 passed (17)` | — | **survives** (N4) |
| edge finder, subject | OE4: `main.ts` gains `createRequire as lazyRequire` from `node:module` and `lazyRequire(import.meta.url)('@syzygy/polaris-dossier')` | `Tests  17 passed (17)` | — | **survives** (N4) |
| edge finder, subject | OE5: new `apps/syzygy/src/dossier-bridge.ts` (`export * from '@syzygy/polaris-dossier';`), imported by `main.ts` | `Tests  17 passed (17)` | — | **survives** (N4) |
| branch classifier | OB1: an if's condition counts as inside it | `Tests  17 passed (17)` | — | survives; equivalent for `main.ts` (N6) |
| branch classifier | OB2: the outermost if, not the nearest | `Tests  17 passed (17)` | — | survives; equivalent at head (N6) |
| classifier, subject | OB3: a shadowed `argv` block before the polaris branch carries the barrel import | `Tests  17 passed (17)` | — | survives; contrived (N6) |
| spec guard | OS1: the guard moved after the token loop | `Tests  65 passed (65)` | — | **survives** (N5) |
| spec guard | OS2: `LONG` admits a trailing `=` | `Tests  65 passed (65)` | — | **survives** (N5) |
| root skip | OK1: `isRoot` read from `geteuid` | row `['passed']` under the shim | — | "killed", a false kill (N7) |
| root skip | OK2: the skip written as `if (isRoot) return;` inside the row | row `['passed']` under the shim | — | "killed", a false kill: an equivalent mutant (N7) |

- What head answers for the shapes OR1 and OR2 change (`tools/or_shapes.mjs`, the built reader and CLI). [Observed]
  - `readArgv(['run','--revision','a','--revision'], DOSSIER_OPTIONS)` is `{"fault":"repeated","arg":"--revision"}`.
  - `runDossierCli(['allow-execution', '/nonexistent-r521/run', '--revision', 'a', '--revision'])` exits `2` with `syzygy dossier: --revision given more than
    once`. Under OR1 it would read `--revision requires a value` [Inferred from cli.ts:466's message for `missing-value`].
  - `['run','--revision','']` reads `{"values":{"--revision":""}…}`, and the daemon's `['--root','']` reads
    `{"values":{"--root":""}…}`.
  - The predicate, stated: a valued option read once with a value and given again with a missing or dash-led value, after
    `--json` is filtered. It matches **0 of 1,696** rows of the 8.2 reviewer's dossier corpus, so no evidence golden can see OR1.
  - An empty-string value matches 24 of 1,696 rows, which is why the golden kills OR2.

### The guard's soundness: can both methods miss the same form?
I appended probes to a scratch copy of `subpath-imports.test.ts`, so they reuse `edgesOf` and `entryEdgesOf` byte for byte
(`tools/guard-probe-tail.ts`, output in `guard-probe.json`). [Observed]

| Probe (after `import * as path from 'node:path';`) | Preprocessor reports | Result |
|---|---|---|
| `const name = '@syzygy/polaris-dossier'; await import(name);` | `node:path` | entry edges `[]`. **Both miss it; passes** |
| `await import('@syzygy/' + 'polaris-dossier');` | `node:path`, `@syzygy/` | throws "disagree" (fail-closed, and only one way; N3) |
| `` await import(`@syzygy/polaris-dossier`); `` | both see it | `dynamic import … outside any if` |
| `require.resolve('@syzygy/polaris-dossier');` | `node:path` | `[]`. Both miss it, but it loads nothing |
| `import.meta.resolve('@syzygy/polaris-dossier');` | `node:path` | `[]`. Both miss it, but it loads nothing |
| `import { createRequire as cr } from 'node:module'; cr(import.meta.url)('@syzygy/polaris-dossier');` | `node:path`, `node:module` | entry edges `[]`. **Both miss the call, and `entryEdgesOf` drops `node:module`; passes** |
| `import nodeModule from 'node:module'; nodeModule.createRequire(import.meta.url)('@syzygy/polaris-dossier');` | the same | `[]`. **Passes** |
| `import './dossier-bridge.js';` (an intermediate local module) | `./dossier-bridge.js` | entry edges `[]`. **Not followed; passes** |
| `declare module 'm' { export * from '@syzygy/polaris-dossier'; }` | also reports `m` | throws "disagree" (fail-closed, false alarm) |
| `if (a) {} else if (argv[0] === 'dossier') { await import(…); }` | — | `inside if (argv[0] === 'dossier')`. **`else if` holds** |
| `switch (argv[0]) { case 'dossier': await import(…); }` | — | `outside any if` (fail-closed) |
| `argv[0] === 'dossier' ? await import(…) : undefined` | — | `outside any if` (fail-closed) |
| `function f(argv) { if (argv[0] !== 'dossier') return; return import(…); }` | — | `outside any if` (fail-closed) |
| `if (argv[0] === 'dossier') { if (x) {} else { await import(…); } }` | — | `inside the else of if (x)` (fail-closed) |
| `{ const argv = ['dossier']; if (argv[0] === 'dossier') await import(…); }` | — | `inside if (argv[0] === 'dossier')`. **Text-based; passes if it replaces a real edge** (OB3) |

So "the two methods agree" is a real check for every form that exactly one of them reports. It cannot see a form that neither
reports: a computed specifier, a `require` under another name, or an edge one module further on.

### `readArgv`'s new programming-error path
- [Observed] `tools/spec_copies.mjs` imports the built `dist/argv.js` and calls `readArgv` with every real spec:
  - the daemon's;
  - polaris's;
  - the dossier one-argument spec;
  - each of the 10 options commands' specs, built as `cli.ts:464` builds them from `DOSSIER_COMMANDS`: `init`,
    `allow-execution`, `check`, `session-prompt`, `await`, `launch-form`, `inventory-check`, `review-packet`, `review-check`,
    `close`.

  Each spec ran under 4 argument lists (52 calls). `"realSpecs": 13`, `"throws": []`.
- The guard reads only `spec`, before `args`, so no operator argv can reach it. Every spec is a code literal, or the
  `DOSSIER_COMMANDS` literal option lists.
- The `shape.flag` names (`--fresh`, `--stdin`) are filtered out before `readArgv` and never enter a spec.
- On class: a class-6 change to the `./argv` export (section 2), and no change to any accepted or refused argv.

### `ReviewPacketResult`
- **Assignability: my own probe** (`tools/type_probe.mjs`), independent of the lane's.
  - It lifts the aliases by syntax tree from `review.ts` at `ce322e1a` (before), `df6046a1` (was) and `e3e6a78b` (head), and uses
    the real `ReverifyRefusal` from the built declarations, not a placeholder. It runs under `tsc --strict`, TypeScript 5.9.3.
  - Results: `Before -> Head` exit 0; `Head -> Before` exit 0; `Before -> Was` exit 0; `Head -> Was` exit 0; `Was -> Before`
    `error TS2322: Type 'Was' is not assignable to type 'Before'.`; `Was -> Head` `error TS2322: Type 'Was' is not assignable to
    type 'Head'.`
  - Negative control: Head with `draftRevision: string` fails both ways (`error TS2322: Type 'Neg' is not assignable to type
    'Head'.` and the reverse). This reproduces the lane's six directions.
- **Emitted JavaScript: real `tsc -b --force packages/polaris-dossier` builds at the three commits.** The lane used
  `transpileModule`.
  - `dist/review.js` is sha256 `d8f8885c188b8874f69b3d053c601cd175b90f9b9192e760ab03364f8f6cc902` at all three.
  - `dist/review.d.ts` changes, `3da8ba40…` → `ee51968f…`: a local `type ReviewPacketRefusal` and two `Outcome`s.
  - `dist/argv.js` changes, `66c30d5d…` → `c3ed238a…`. `diff` shows only the added `LONG`, `SHORT`, the doc comment and the two
    guard loops.

### The root skip
- [Observed] The idiom matches the repository's exactly: `credential-probe.test.ts:20` has `const isRoot = process.getuid?.() ===
  0;` and `:30` has `it.skipIf(isRoot)(…)`. `state-directory.test.ts:19` and `:121` now read the same.
- [Observed] Real root is not available here: `unshare -r id` printed `unshare: write failed /proc/self/uid_map: Operation not
  permitted`, and `sudo -n true` printed `sudo: a password is required`. The row's failure under real root therefore stays
  [Inferred]: root's search capability on a mode-000 directory makes the `lstat` succeed or say ENOENT instead of EACCES.
- [Observed] The simulated-root evidence holds for what it shows. My own shim, the same one line as the lane's, flips the row from
  `passed` to `skipped`. What it does not show is in N7.

### Goldens
- [Observed] I ran the 8.2 reviewer's `tools/dossier_run.mjs` over `corpus/dossier.json` at head, from an empty directory.
  - It printed `{"rows":1696}`, with sha256 `54983601a3d783ee442719858e6e1d5fecad9f6589c170d71969b7a4e1a4762b`. That is 8.2's base
    output, so 0 rows differ.
  - After every phase-2 mutant I rebuilt the head and ran it again (control `C1`). It printed the same digest.
- I did not run the lane's three goldens. They write fixed paths under `/tmp/la-b82/`, outside my TMPDIR. Their record's input
  digests equal the head bytes (section 1), and the rows and digests it reports are lane-reported.
- [Observed] Residual 5's "(3 occurrences)" of the worktree path in `goldens-record.json` counts lines: 3 command lines carrying
  6 path strings. Nothing hangs on it.

### Test delta
- [Observed] `npx vitest list --json` over the whole repository: base `5163` and head `5237` names. By name, `added 77 removed 3`:
  - `argv.test.ts` +65, `subpath-imports.test.ts` +12;
  - the 3 removed titles are the 3 `subpath-imports.test.ts` checks the PR names.

  This confirms `Tests: +77 ~6 -3`. The `~6` (five forbidden-import rows with a stricter assertion under unchanged titles, and the
  mode-000 row) matches the diff.

## 4. Findings

There is no blocking finding (no F). There are eight notes, N1 to N8. None of them must change the reviewed bytes before merge
or go to the owner first.

### N1 — Two reader behaviours are still pinned by no CI suite: a repeat's precedence over a missing value, and an empty value (medium)

- **Evidence.** [Observed] Section 3.
  - **OR1**, the `missing-value` check moved before the `repeat` check (`argv.ts:62-63` swapped), leaves all of these green:
    - `argv.test.ts` (`65 passed`);
    - the whole `@syzygy/polaris-dossier` project (`1307 passed | 1 skipped`);
    - the 1,696-row dossier golden (digest equal to base). 0 of its rows have the shape that tells the two orders apart.
  - **OR2**, an empty value read as missing (`token.value === undefined` → `!token.value`, `argv.ts:63`), leaves `argv.test.ts`,
    the project and the daemon-entry system test green. Only the dossier golden kills it (24 rows carry `''`), and no CI step runs
    that golden. That is the same gap as 8.2's N1.
  - The table has a repeat row (`['--revision','a','--revision','b']`) and missing-value rows, but no row where both apply. It has
    no row with an empty value under any policy.
- **Failure scenario.** 8.5 moves `argv.ts` and reorders the two checks.
  - `syzygy dossier allow-execution <run> --revision a --revision` then refuses with `--revision requires a value` instead of
    `--revision given more than once`. A refusal string changes (GP-Q0 :53) with every suite and every golden green.
  - Or a "tidy" `!token.value` makes `syzygy --root ''` and `syzygy dossier await <dir> --submit ''` newly refused, and only an
    uncommitted golden notices.
- **Proposed fix.** Add these literal rows to `packages/polaris-dossier/src/argv.test.ts`:
  - dossier options:
    - `[['run', '--revision', 'a', '--revision'], { fault: 'repeated', arg: '--revision' }]`;
    - `[['run', '--revision', 'a', '--revision', '-x'], { fault: 'repeated', arg: '--revision' }]`;
    - `[['run', '--revision', ''], { values: { '--revision': '' }, flags: [], positional: ['run'] }]`;
  - daemon: `[['--root', ''], { values: { '--root': '' }, flags: [], positional: [] }]`;
  - polaris: `[['--model', '', 'url'], { values: { '--model': '' }, flags: [], positional: ['url'] }]`.

  Each answer above is what head returns. [Observed: `or-shapes.json` for the dossier and daemon rows; for the polaris row, head's
  `argv.ts` run directly under Node's type stripping printed `{"values":{"--model":""},"flags":[],"positional":["url"]}`.]
  Then re-run OR1 and OR2 (fragments in `rev-521/my-mutants.json`) and record both as killed. This belongs before 8.5 starts,
  like 8.32 itself.

### N2 — A drift between a caller's spec and its copy in `argv.test.ts` goes unseen in CI; residual 1 says otherwise (medium)

- **Evidence.** [Observed] Section 3.
  - The four copies equal their callers at head, checked by syntax tree. But nothing ties them together.
  - D1 (polaris `repeat` → `refuse`), D2 (daemon `repeat` → `refuse`) and D3 (dossier options `dashValue` → `take`) each leave
    `argv.test.ts` and the whole project green. D2 also leaves the daemon-entry system test green (`15 passed`).
  - D3 is the R3 mutation expressed in the caller rather than the reader. 8.32's table now kills R3 in the reader, but not D3,
    and only the dossier golden sees D3.
  - Outside the copy, none of the 252 files swept repeats one of the nine swept valued options on a line (section 3 states the
    sweep's limits).
  - The PR's residual 1 says: "If a caller's own spec changes, the daemon's system tests and the dossier CLI tests notice for
    those two callers". D2 and D3 are counterexamples.
- **Failure scenario.** 8.5 moves `argv.ts` and the specs. It edits `cli.ts`'s options spec to `dashValue: 'take'`, so `check
  <run> --draft -x` takes `-x` as the draft. `argv.test.ts` still pins the old copy, so CI stays green, and a refused form becomes
  an accepted one with no owner act (GP-Q0 :95-96).
- **Proposed fix.**
  - Now: correct residual 1's sentence in the dispositions record. Name D1–D3 and the suites they pass.
  - In 8.5, or before it:
    - export each caller's spec as a named constant from the module that uses it (`DAEMON_ARGV_SPEC`, `POLARIS_ARGV_SPEC`,
      `DOSSIER_ONE_ARGV_SPEC`, and a `dossierOptionsSpec(options)` builder);
    - have `argv.test.ts` import those as *inputs*, and pin each spec once against a literal (`expect(DAEMON_ARGV_SPEC).toEqual({
      valued: ['--root', '--state-dir', '--port'], … })`);
    - keep every expected answer literal. Importing an input is not importing an expected value, so the AGENTS.md :273-274 guardrail
      holds.
  - A cheaper interim: a test that lifts each caller's spec by syntax tree and compares it with the copies, as
    `rev-521/tools/spec_copies.mjs` does.

### N3 — The edge finder's agreement is pinned in one direction only (low)

- **Evidence.** [Observed]
  - OE1 weakens `subpath-imports.test.ts:51` to throw only when the walk finds a specifier the preprocessor does not. It leaves
    `17 passed`.
  - The one disagreement row (`:106`, `export * as`) is walk-only. No row feeds a form that only the preprocessor reports.
  - Such forms exist. `await import('@syzygy/' + 'polaris-dossier')` makes the preprocessor report `@syzygy/` and the walk report
    nothing. Today that throws (fail-closed). Under OE1 it passes unseen.
- **Failure scenario.** A later "simplification" of the comparison keeps the committed row green and silently admits a
  concatenated barrel specifier into `main.ts`.
- **Proposed fix.** Add a row beside `:106`: `expect(() => edgesOf("await import('@syzygy/' + 'polaris-dossier');\n")).toThrow('the
  preprocessor and the syntax walk disagree: {"walked":[],"reported":["@syzygy/"]}');`. That exact message was observed at head
  (`guard-probe-2.json`). Then record OE1 as killed.

### N4 — Residual 3's "None is known" is not right: three forms reach the barrel past both methods (low)

- **Evidence.** [Observed] With `subpath-imports.test.ts` at `17 passed`, each of these survives:
  - **OE3**, a computed specifier: `const barrel = '@syzygy/polaris-dossier'; await import(barrel);` in `main.ts`.
  - **OE4**, `createRequire` under an alias in `main.ts`. The exact built-in pin covers only `argv.ts` and `state-directory.ts`,
    and `entryEdgesOf` (`:56`) keeps only specifiers containing `polaris-dossier`, so `node:module` in `main.ts` is not seen.
  - **OE5**, an intermediate local module. `main.ts` imports `./dossier-bridge.js`, which re-exports the barrel. The entry check
    does not follow edges.

  `require.resolve` and `import.meta.resolve` are also missed by both methods, but they load nothing. OE5 is the plausible one:
  8.5, or any later refactor, can extract a helper from `main.ts`.
- **Failure scenario.** A helper module extracted from `main.ts` imports the barrel statically. Every daemon start then loads the
  whole dossier package, as GM1 did (147 modules against 38, per the 8.2 review), and the guard stays green.
- **Proposed fix.**
  - Correct residual 3 in the dispositions record, naming OE3–OE5.
  - In the guard, follow relative and `@syzygy/*` edges from `main.ts` transitively, as
    `packages/polaris-generation-core/src/island-boundary.test.ts:71` (`reach`) already does over `ts.preProcessFile` edges.
    - Treat dynamic imports inside the `dossier` and `polaris` branches as the only allowed way into the barrel.
    - Fail on any other reachable module under `packages/polaris-dossier/src/` beyond `argv.ts` and `state-directory.ts`.
  - Fail on a `node:module` edge from any module the daemon path reaches. Have the walk record an `import()` or `require` whose
    argument is not a string literal as its own failing edge, outside the agreement check.
  - Alternatively, commit the 8.2 reviewer's resolve-hook census (`dossier-cli-table-review-2026-10-24/tools/log-hooks.mjs`: the
    `--help` path loads 38 modules, 2 from polaris-dossier) as a system test. It sees every form, the computed ones included.

### N5 — The spec-guard rows pin neither "before reading anything" nor a valued name ending in `=` (low)

- **Evidence.** [Observed]
  - The title at `argv.test.ts:121` is "throws for %j, before reading anything". Every row calls `readArgv(['run'], spec)`
    (`:122`), whose reading completes without a fault. So OS1, the two guard loops moved after the token loop, leaves `65 passed`.
  - OS2, `LONG` widened to admit a trailing `=` (so `--out=` passes the guard), also leaves `65 passed`. No row names `--out=`.
    parseArgs splits `--out=` at the `=`, so such an option can never take the next argument as its value [Inferred from how the
    reader keys options by `name.slice(2)`].
- **Failure scenario.**
  - A refactor that validates lazily lets `readArgv(['--bogus'], { …, valued: ['-o'] })` answer `unknown` instead of throwing. The
    programming error then hides behind an operator-facing refusal, which is what N5 of the 8.2 review set out to prevent.
  - A spec naming `--out=` is accepted and silently never reads a value.
- **Proposed fix.**
  - Add `[{ ...DOSSIER_ONE, valued: ['--out='] }, 'argv: the valued option --out= is not --<name>']` to the throw table.
  - Add one row that throws even though the arguments fault first: `expect(() => readArgv(['--bogus'], { ...DOSSIER_ONE, valued:
    ['-o'] })).toThrow(new Error('argv: the valued option -o is not --<name>'))`.
  - Then record OS1 and OS2 as killed.

### N6 — The branch classifier trusts the condition's text; record it (low; no change required)

- **Evidence.** [Observed] Section 3's probe table.
  - `else if` is classified correctly.
  - `switch`, a ternary, an early `return` and a nested `else` read as `outside any if` or as the inner `if`. Each fails the
    exact-list check, so the classifier fails closed: a false alarm, never a false pass.
  - OB1 (an `if`'s condition counted as inside it) and OB2 (the outermost `if`) survive. Both are equivalent for `main.ts` at
    head:
    - under OB1, a condition holding an import would carry `import(` in its text, which no expected edge contains;
    - under OB2, `main.ts` has no nested `if` around either branch (`main.ts:172`, `:190`).
  - OB3 survives. A shadowed `argv` block carrying the barrel import, together with removing the polaris branch's own import,
    keeps the four expected edges and loads the barrel on every start. It is contrived.
- **Failure scenario.** Only a deliberate evasion like OB3. Accidental shapes fail closed.
- **Proposed fix.** Nothing on these bytes. Record in the dispositions that the classifier names the nearest `if` by its
  condition's source text and is fail-closed for other shapes. Optionally pin that with an `else if` row and a `switch` row. N4's
  reachability rewrite would subsume this.

### N7 — The root-skip evidence proves the mechanism, not the property; two other mode-000 rows still fail under root (low)

- **Evidence.** [Observed]
  - The shim answers only `getuid()`, and the row harness passes on the row's *status*.
  - So OK1 (`isRoot` read from `geteuid`, at least as correct under real root) and OK2 (the skip written as `if (isRoot) return;`
    inside the row, behaviourally the same: the row does not fail under root) are both "killed". They are false kills.
  - K1 and K2 show that the row's status follows a faked `getuid()`. They do not show that the row would fail under real root
    without the skip. That stays [Inferred] (residual 2): real root is unavailable here, as in the lane.
  - No committed test fails if the skip is removed, and none could.
  - The same root-sensitive pattern remains, unskipped, at `packages/cap1-system/src/state-dir.system.test.ts:364` (`chmodSync(
    blocked, 0o000)`) and `packages/polaris-dossier/src/launched.test.ts:66` (`fs.chmodSync(marker(dir), 0o000)`). The 8.2 review
    named both, and the bead scoped N8 to `state-directory.test.ts`.
- **Failure scenario.** A container run as root: those two rows fail for a reason unrelated to the code.
- **Proposed fix.**
  - Nothing on these bytes. In the dispositions, call K1 and K2 "harness checks of the skip's condition", not proofs of the row's
    behaviour under root.
  - File one low bead to apply the same `isRoot` idiom to `state-dir.system.test.ts:364` and `launched.test.ts:66`.
  - The real-root behaviour stays [Inferred] until a root CI job exists.

### N8 — Record the class as 6 (process; low)

- **Evidence.** The PR declares "none in the accepted or refused argv forms or paths, with two possible classes" (1 and 6) and
  leaves the ruling to the reviewer. CC-REV-1 :49-50 asks the change record to state the classes. Section 2 rules class 6, not
  class 1.
- **Failure scenario.** The dispositions copy "class 1 possible" forward, and the cycle report carries an owner notice for a class
  the change does not touch. Or the class-6 throw goes unrecorded.
- **Proposed fix.** In the dispositions record, state: "CC-REV-1 class: 6 (the `./argv` export's `readArgv` throws for a spec it
  could never read; the exported `ReviewPacketResult` narrows back to its pre-Outcome form; no endpoint removed). Not class 1:
  `state-directory.ts` and `main.ts` are byte-identical to base." No GP-Q0 owner notice is needed for class 6 without a removed
  endpoint.

## 5. Every changed output, or the evidence that there is none

- **Runtime JavaScript.** [Observed, real builds]
  - `dist/argv.js` changes only by the guard: `LONG`, `SHORT`, the doc comment and two loops that throw.
  - `dist/review.js` is byte-identical at `ce322e1a`, `df6046a1` and `e3e6a78b` (`d8f8885c…`).
  - No other source module changes. `state-directory.ts`, `main.ts`, `cli.ts`, `polaris.ts` and `package.json` are identical to
    base.
- **The new throw is unreachable from operator input.** [Observed] It reads only `spec`. 13 of 13 real specs pass it under 52
  calls.
- **Rendered bytes, refusal strings and exit codes of the dossier CLI.** [Observed] At head, the 8.2 reviewer's 1,696-row dossier
  golden hashes to `54983601…`, which is 8.2's base output, so 0 rows differ. It hashed the same again after rebuilding from
  every mutant.
- **The daemon's and polaris's argv.** [Inferred] They are unchanged: their specs are unchanged and pass the guard, and the reader
  is unchanged apart from the guard (the `dist/argv.js` diff). The lane's parse and subprocess goldens (1,302 and 1,195 rows) are
  lane-reported; their recorded inputs equal the head bytes.
- **Declarations.**
  - `dist/review.d.ts` changes `3da8ba40…` → `ee51968f…`: two `Outcome`s through a local `ReviewPacketRefusal`.
  - `dist/argv.d.ts` changes `dad7ca27…` → `ddc63953…`: the doc comments.
  - Type-level only, and typecheck exits 0.
- **Tests and evidence.** Section 3's test delta, and 10 evidence files.

## 6. Verdict per acceptance criterion

- **"`argv.test.ts` exists, with literal expected answers per caller policy, and kills R1–R10 (recorded)": met.**
  - 64 table rows and 2 direct expectations, all literal, with the sweep's negative control.
  - The four policies equal their callers at head.
  - R1, R2b and R3–R10 are killed. I re-ran them and got the same titles. R2 is correctly not applicable.
  - `mutants-record.json` stores each mutant's old/new fragments, command, exit and commit.
  - N1 and N2 are coverage beyond the criterion.
- **"GM1 and GM3 are killed by `subpath-imports.test.ts` (recorded)": met.** I re-ran both and got `1 failed | 16 passed (17)`.
  N3 and N4 are gaps beyond the criterion.
- **"N4, N5 and N8 are each answered in the PR": met.**
  - N4: the two-variant type, reproduced by my own probe, with real-emit identity.
  - N5: the doc comment and the guard, with rows. N5 of this review is a further gap.
  - N8: `skipIf(isRoot)` in the repository's idiom. N7 of this review is about its evidence.
- **"The dossier CLI goldens still differ on 0 rows": met.** Mine: 0 of 1,696, digest-equal to base. The lane's three: their
  record, with inputs equal to the head.
- **"The Tests delta and the class are stated": met.**
  - The delta reproduces by name over the whole repository (5,163 → 5,237, +77 −3).
  - The class is stated as possible classes for the reviewer to rule, as 8.2's round accepted. The ruling is class 6 (N8).

## 7. Test quality

Applying the test-rigor bar:
- **Expectation 4, no tautologies.** Met. The expected values are literals (the sweep above).
  - The `answer()` helper (`argv.test.ts:21-25`) only projects a `Map` and a `Set` into plain data; it computes nothing expected.
  - A broken `isArgvFault` would make every read row fail, not pass.
  - The policies are inputs, copied by hand. That is sound for independence, and weak against drift (N2).
- **Determinism.** Met.
  - `argv.test.ts` is pure.
  - `subpath-imports.test.ts` reads tracked files only.
  - The mode-000 row creates and restores its own directory, and it is skipped only under a uid of 0.
- **Expectation 7, a failure names the defect.** Met.
  - Each row's title names its input and its expected answer (`%j reads as %j`), and the failing titles in section 3 point at the predicate
    (for example R1: `["--","--help"] reads as {"fault":"unknown","arg":"--"}`).
  - The guard's failures quote the offending edge string or the disagreeing lists.
  - One title over-claims: "before reading anything" (N5).
- **One gate species per behaviour.**
  - The reader is pinned by one unit table. The goldens are evidence, not a gate.
  - The daemon path's imports are watched by three static checks of different scope, which do not duplicate one another:
    - this guard (the barrel and subpath built-ins);
    - `island-boundary.test.ts` (the provider island, transitive);
    - `daemon-entry-unchanged.system.test.ts:203-217` (the POC app, by text).
  - N4's transitive fix would let this guard reuse `island-boundary`'s `reach` instead of adding a fourth mechanism.
- **Expectation 3, edge and failure paths first-class.** Mostly met: every predicate the bead listed has a row under every policy
  that reaches it. The gaps are the interaction rows and the empty value (N1), the reverse disagreement (N3) and the guard's order
  (N5).
- **Expectation 10, growth.** The +77 names are one new table file and one extended guard file. Each row was shown, by the
  recorded mutants, to catch a defect that no committed test caught before. Nothing is adds-only bloat.

## 8. Cleanup

- Deleted: the scratch clone `rev-521/clone` (clean at `e3e6a78b` when deleted: `git status --porcelain` printed 0 lines), and
  every private TMPDIR, `/tmp/r521-1` to `/tmp/r521-9` (`ls -d /tmp/r521-*` then printed `No such file or directory`). Those held
  the golden outputs (13.7 MB each), vitest JSON reports and probe copies. Nothing outside my own TMPDIRs was touched, and no
  process was killed.
- Kept under `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-521/` (sha256, first
  16 hex):
  - **Tools** (`tools/`):
    - `build_my_mutants.py` `837d6b0fb0250796`
    - `build_phase2.py` `6ed24a4c2d9f041c`
    - `check_mutant_copies.py` `fc5e0ed8f979fb09`
    - `fake-root.mjs` `0d098789d99c5308`
    - `guard-probe-tail.ts` `dff0911070aabd4b`
    - `guard-probe-tail-2.ts` `c00c21ff2f40287b`
    - `literal_sweep.mjs` `7a7906166f2cc83e`
    - `or_shapes.mjs` `0c3c76ecf27d4c41`
    - `row_check.py` `b60fee598c7c628d`
    - `run_mutants.py` `90291b504fd71cb2`
    - `spec_copies.mjs` `1d465f62ad4648db`
    - `type_probe.mjs` `134c85298c18699e`
  - **Mutant specs and results:**
    - `my-mutants.json` `9bb58aee3723aa51`
    - `my-mutants-result.json` `f4f8eff06d9da071`
    - `my-mutants.log` `ff68ede9104e7303`
    - `phase2-mutants.json` `7c97d7460e9259fb`
    - `phase2-result.json` `ad210a874dc0be38`
    - `phase2.log` `30f20623a59d00be`
    - `mutants-rebuilt.json` `f14f54fd4a9c576a`
  - **Probes and sweeps:**
    - `spec-copies-head.json` `16f310b3cdb189a9`
    - `literal-sweep.json` `a646d39a94d12de4`
    - `guard-probe.json` `1ac106ad8d6a5078`
    - `guard-probe-2.json` `ee8d40d3eeb49a3a`
    - `or-shapes.json` `379feb6d7be2f185`
    - `type-probe-result.json` `64ebc0d078b2b770`
    - `type-probe/` (16 generated probe files)
  - **Builds:**
    - `emit/base/{argv.js,argv.d.ts,review.js,review.d.ts}`
    - `emit/head/{argv.js,argv.d.ts,review.js,review.d.ts}`
  - **Logs:**
    - `npm-ci.log` `b18e3a1f3c7b310d`
    - `typecheck-head.log` `20da490fc4e26131`
    - `three-files-head.log` `24a068d80256622e`
    - `project-head.log` `6cebfdf968594c51`
    - `check-governance.log` `1285c02e7e2ba852`
    - `check-quotations.log` `2f21bf3dbc79d8af`
    - `list-base.json` `4d903b9498271ff7`
    - `list-head.json` `6bcee0431750822c`
  - **This raw.**
- The result files name my deleted clone's path. `tools/type_probe.mjs` and `run_mutants.py` take the tree as an argument and
  re-derive everything from a fresh clone at `e3e6a78b`.
