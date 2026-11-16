# R-GP-IMPL-ARGV-GUARDS-1 — CC-REV-1 implementation review of syzygy-bpyt.8.34, round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 43ae35fe
Subject: r1-review.diff sha256 27d79306964e269b4130fb7bf7794fd17b1831e500f4e6ee9e4051c0009099b2

Reviewer: an independent fresh-context session (Claude Opus 5.5), reviewer `rev-524`, 2026-10-25. I did not write this change and
did not edit it. PR #524, branch `agent/syzygy-bpyt.8.34`, reviewed commit `43ae35febce90724228e2e6001ee0b6e4c98597b`, base (merge
base with main) `3ec6929951080613b3c5cb7205fe303c5449be58`. I fetched no Butlers or other observed-repository content, opened no
credential file, mutated no bd issue, edited nothing under `/home/tze/GitHub/syzygy/.worktrees/`, and did not push, comment or merge.
Under `~/.claude/` I opened two non-credential files only: the test-rigor skill the brief names (item 4), and, once, my own session
transcript (`…/subagents/agent-arev-524-*.jsonl`) to recover my working context after a context compaction.
All work ran in three scratch clones of my own (head, base, and a read-only head "probe"), each after `npm ci`.

No blocking finding. Four notes (N1–N4). None must change the reviewed bytes before merge or go to the owner first.

## 1. Subject identity checks

1. **Subject digest.** [Observed] `sha256sum r1-review.diff` printed
   `27d79306964e269b4130fb7bf7794fd17b1831e500f4e6ee9e4051c0009099b2`. I re-derived `git diff 3ec69299… 43ae35fe…` in my clone;
   it hashes to the same digest. **It matches.** `git diff --stat` ends `14 files changed, 1881 insertions(+), 60 deletions(-)`.
2. **Base.** [Observed] `git ls-remote origin main` gives `71334012548cccd46a5a95e313a6014da87c8e3c`. Fetched into the clone,
   `git merge-base 43ae35fe 71334012` is `3ec6929951080613b3c5cb7205fe303c5449be58`. Main changed 58 files since the base; the
   overlap with the 14 subject paths is `[]` (scripted set intersection). So the base diff is what would merge.
3. **Implementation-plane files.** [Observed] `git diff --name-only 3ec69299 43ae35fe -- apps packages scripts package.json
   package-lock.json vitest.config.ts tsconfig.base.json .github` lists exactly four files, all test support:
   `packages/polaris-dossier/src/argv.test.ts`, `packages/polaris-dossier/src/subpath-imports.test.ts`,
   `packages/polaris-generation-core/src/island-boundary.test.ts` and the new
   `packages/polaris-generation-core/src/workspace-reach.testkit.ts`. The other 10 files are under `docs/evidence/syzygy-bpyt-8-34/`.
   0 product bytes change.
4. **Line counts.** [Observed, scripted over the subject diff] argv.test.ts +85/−1, subpath-imports.test.ts +83/−7,
   island-boundary.test.ts +7/−52, workspace-reach.testkit.ts +61/−0; 0 removed lines outside `apps/` and `packages/`. These equal
   the PR body's figures. Tracked files at the head: 3,753 (`git ls-tree -r -z --name-only`), as the PR body says.
5. **The record's commit.** [Observed] Every record names commit `20cabca516665412e194e7c10a893cb16e1dcc2d`, not the head.
   `git merge-base --is-ancestor 20cabca5 43ae35fe` succeeds and `git diff --name-only 20cabca5 43ae35fe -- apps packages` is empty.
   The 7 files that differ between them are all under `docs/evidence/syzygy-bpyt-8-34/` (the records and three harnesses). So the
   kill evidence was produced on the reviewed product and test bytes.
6. **CI.** [Observed] `gh pr checks 524`: `checks pass 1m59s` and `node pass 2m55s`.

## 2. Clauses relied on (quoted), and the class ruling

Quoted at `43ae35fe`:

- CC-REV-1, `.syzygy/governance/policies/craft-and-care/review-and-documentation.md`:
  - `:31`: "1. **authority boundaries** — write-universe, typed-authority table," (continuing "adapter authorization (VIS-5, VIS-6);")
  - `:35`: "3. **deterministic observation** — snapshot composition, evaluation" (continuing "identity, the deterministic/inferred seam
    (VIS-7);")
  - `:37`: "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
  - `:40`: "6. **public interface** — machine-queryable endpoints, adapter contracts," (continuing "anything an external consumer can
    depend on;")
  - `:49`: "**The change record states** which classes the change touches, or "none,""
  - `:51`: "**A reviewer or the owner** may reclassify at any time."
- GP-Q0, `.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`:
  - `:52-53`: ""Behavior-preserving" means none of the following changes:" / "a rendered byte, a wire format, a refusal string or an
    exit code;"
  - `:62`: "**Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4
    (security), and class-6 pull requests that remove an endpoint."
  - `:64-66`: "an old-versus-new differential over a mutated-record corpus that includes records with altered prose;" / "a rule-6
    mutant for each predicate;" / "a non-blocking owner notice in the cycle report."
  - `:95-96`: "Any change not listed here to what a gate accepts or refuses stops and returns" / "to the owner."
- `AGENTS.md` at `43ae35fe`:
  - rule 4, `:123-124`: "Read a check's output, not its exit code, and check its denominator against the whole population."
  - rule 6, `:126-127`: "Mutate the input and confirm the check fails, per predicate, before trusting it".
  - rule 9, `:132`: "A claim of absence needs a sweep with a denominator."
  - rule 11, `:134-135`: "An evidence record names its subject and the subject's digest; a record that names neither cannot be
    re-checked against the bytes it describes."
  - guardrail `:263-265`: "A rule-6 evidence record must store each mutant's `old`/`new` fragment and the commit it ran at".
  - guardrail `:273-274`: "Conformance expected values are hard-coded literals, never imported from the module under test."
  - guardrail `:297-299`: "Copy-oracle tests match by substring: a very short label (`None`) is "reached" by coincidence and
    proves nothing — give every label a distinctive string or drop it."
- The 8.1 ruling being evidenced, `docs/reviews/R-GP-IMPL-ISLAND-DECOUPLING-1-RAW.md:35-40`: "classes 1, 3, 4 and 6 are touched"; "Class
  1: the injected-renderer adapter, and the import specifiers on the gated modules"; "Class 4: the provider egress code's
  reachability from the CLI".
- The precedent, `docs/reviews/R-GP-IMPL-LAUNCH-FORM-CTIME-1-RAW.md` §2 (#519): "A change that weakens or strengthens what these rows
  can kill changes the security evidence, even though it changes no product byte."
- The test-rigor bar, `/home/tze/.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`: bar 4 (`:65-68`) "Expected values are literals or independently
  derived."; bar 6 (`:79-80`) "A test that fails intermittently is worse than no test"; bar 10 (`:94-96`) "A test is worth *adding*
  only if it catches a plausible bug no existing test catches".

**Class ruling: classes 1 and 4 (through the island guard), and class 6 with no endpoint removed. Classes 2, 3, 5 and 7 are not
touched.** The PR declares "none" (ceiling class 6); under `:51` I reclassify.

- **Classes 1 and 4, touched.** [Inferred] `island-boundary.test.ts` is the rule-6 kill evidence for the 8.1 ruling's class-4
  claim (the provider egress code is unreachable from the CLI) and its class-1 claim (the CLI injects the operator-agent renderer
  adapter, not the provider one: the 8.1 mutants B4 and B5 are killed by this guard). This change moves the guard's walk into a
  shared module, gives it a callback for edges, and replaces the inline `intoIsland` push with a filter over every edge. That changes
  the mechanism of class 1 and 4 evidence even though no product byte moves, which is the #516 and #519 reasoning. Its kill power is
  unchanged (§3 items 5–7).
- **Class 3, not touched.** No snapshot composition, evaluation identity or deterministic/inferred seam changes. 8.1's class 3 was
  the quote-flag seam, which the island guard does not evidence (those were 8.1's S and P mutants, on other tests).
- **Class 6, touched, no endpoint removed.** [Observed] The argv rows and the spec-copy check pin the `./argv` reader the daemon
  imports by subpath. No `exports` map changes (10 of 10 workspace manifests read; `@syzygy/polaris-generation-core` still exports
  only `.` and `./live`, so the testkit is not an endpoint). GP-Q0 adds checks for class 6 only when an endpoint is removed.
- **The daemon-path guard** is evidence that the daemon entry reaches only `argv.ts` and `state-directory.ts` of the dossier
  package. I find no class 1, 3 or 4 claim resting on it: the 8.32 review ruled class 6 alone for the change that added this guard
  (`R-GP-IMPL-ARGV-TABLE-1-RAW.md:65`), and the egress-reachability claim from the same entry is the island guard's.

**GP-Q0's three checks (`:64-66`), for classes 1 and 4:**
1. **Differential: degenerate for the product; the stand-ins are non-degenerate.** [Observed]
   - No product byte differs (§1 item 3), so any old-versus-new run of a product gate over any corpus is identical by construction.
     No record-reading code changed, so "records with altered prose" has no object here.
   - The changed code is the guard's walk. I ran the base walk and the head walk over the same tree from **every** non-test source
     module of the workspace as an entry: **246 of 246 answers equal** (reachable list, edges into the island, unresolved
     specifiers), 20 of the 246 entries have edges into the island, 0 have unresolved specifiers (`island-diff-all-entries.json`).
     The CLI entry gives 137 reachable / 0 into the island / 0 unresolved, and the consent root 32 / 11 / 0, as the lane's
     two-entry `island-differential.json` says.
   - Old test against new test over a mutant corpus: the 25 retained island mutants of the 8.1 and 8.23-era reviews that still
     apply, at base and at head: 17 killed at both, 8 survive at both, 0 differ (§3 item 6). Four of them edit package manifests
     (8.1 R4, B4; 8.23 R4; and my X6i), the nearest thing this guard has to an altered record.
2. **A rule-6 mutant per predicate: met.** [Observed] Each of the island guard's four tests is killed by at least one mutant at
   head: "lists twenty island modules" (B8, B9); "resolves every workspace import" (B5b, OE6, RW1, RW2); "reaches no island module"
   (R2, R3, R7, R8, B1–B5, 8.23 B1, B4, R1, R2); "reaches the island from the consent package root" (B7, RW1, RW2, and my IF1 on
   the moved filter itself). The daemon-path guard's four new tests and every new argv row are each killed by a recorded mutant
   (§3 items 3–4, §7).
3. **Owner notice: not yet posted; a landing action.** [Observed] `bd comments syzygy-bpyt.10` (read only) holds 23 comments, none
   naming 8.34 or #524; the last is the 8.33 notice. N3 covers it.

**Gate changes: none.** [Observed] No product byte changes, so nothing any gate accepts or refuses changes, and nothing here returns
to the owner under `:95-96`. The dossier golden re-run at the head is byte-equal (§5).

## 3. What I ran, and the results

Tools are under `rev-524/tools/`; every vitest run used a private TMPDIR (`/tmp/r524-<x>`), deleted afterwards. My runner `mut.py` is
independent of the lane's `run_record.py`: it requires each `old` to occur exactly once, requires a clean tree before and after
every mutant, and counts a mutant **killed only when the exit is nonzero and at least one named test row fails** (rule 4); no run
was an error without a failing row.

1. **Record check against the git objects** (`check_record.py` → `record-check.json`). [Observed] `checks 192 failed 0`:
   - base, commit-ancestry, `apps`+`packages` equality, each of 8 subject file digests at the head and at `20cabca5`, the record's
     `diffSha256` (`952ce40f…`, `git diff <base> <commit> -- apps packages`) re-derived, and the three tool digests against the
     committed bytes;
   - for all 28 specs (3 controls, 25 mutants): the record's edits equal `mutants.json`'s; each `old` occurs exactly once in its
     file at `20cabca5` (each `create` target is absent there); each verdict agrees with its exit code and with the expected
     verdict; each killed mutant has at least one failed test row; and the `Tests` line's failed count equals the failed rows.
   - A selftest with a wrong base (`32c16625`) fails exactly the two checks it should (`record base is the stated base`,
     `diffSha256 re-derived`), so the checker can fail.
   - The 16 mutants copied from the PR #521 review are edit-for-edit equal to its retained `results/my-mutants.json` and
     `results/phase2-mutants.json` (scripted comparison).
   - Evidence digests equal the PR body's: `mutants-record.json` `b86bf874…`, `island-differential.json` `ec675a3e…`,
     `dossier-golden.json` `bedd9b6c…`, `test-delta.json` `7c161199…`. The differential's `guardAtBase` `a32d3ddc…` equals the base
     guard's bytes; the golden's tool `eade32a9…` and corpus `25621321…` equal the committed files.
2. **The moved `reach`, text** (`reach_compare.py`, from the git objects). [Observed] After two printed normalisations (a leading
   `export ` dropped; `readModule(X)` read as `readFileSync(join(ROOT, X), 'utf8')`): `isFile` identical (110 vs 110 chars),
   the `manifests` block identical (512 vs 512), `resolve` identical (1201 vs 1201). The walk loop differs only in (a) taking its
   specifiers from a callback instead of `ts.preProcessFile(…)`, which the island guard now passes, and (b) pushing every edge, then
   filtering `island.has(edge.to) && !island.has(edge.from)` in the guard, instead of pushing only those edges inline. [Inferred]
   (b) is equivalent: the filter keeps order and multiplicity, and the edge object has the same three keys in the same order.
   `ROOT` is computed from the same directory (`packages/polaris-generation-core/src/`). Item 5 shows it by execution.
3. **The lane's 25 mutants and 3 controls, at base and head** (`lane-mutants-{base,head}.json`). [Observed]
   - Controls: base `Tests  65 passed (65)`, `Tests  17 passed (17)`, `Tests  21 passed (21)`; head `Tests  74 passed (74)`,
     `Tests  27 passed (27)`, `Tests  31 passed (31)`.
   - Survive at base, killed at head (16): OR1, OR2, D1, D2, D3, OE1, OE3, OE4, OE5, OS1, OS2, OB1, OB2, D4, D5, D6.
   - Killed at both (3): GM1, GM3, OE6. At base GM1 fails only the 8.32 entry list; at head also the new this-package row.
   - Survives at both (1): OB3, the recorded residual.
   - Not applicable at base, killed at head (5): CE1, SK1, SK2 (their `old` occurs 0 times in the base test), RW1, RW2 (the testkit
     does not exist at base).
   - Every head outcome and failing row agrees with the lane's record (`compare.py`: 28 of 28 `AGREES`).
   - Also from the #521 review's retained set, not in the lane's record: GM7 (namespace re-export of the barrel) and OE2 (walker
     drops `require`) are killed at base and at head (`gm7-oe2-{base,head}.json`). At head GM7 fails 5 rows: `edgesOf` throws for
     `export * as`, so the whole daemon walk fails closed.
4. **My own mutants** (`own-mutants-{base,head}.json`, `filter-mutants-*.json`, `x9-*.json`; 24 at head). [Observed]

   | Id | What it does | Base | Head |
   |---|---|---|---|
   | R-OR3 | an empty value is missing only under `dashValue: 'refuse'` | survives | killed (`["run","--revision",""]` row) |
   | R-OR4 | an empty value is missing only under `dashValue: 'take'` | survives | killed (`--root ''` and `--model ''` rows) |
   | R-Y1 | polaris spec gains a `valued` entry `--extra` | survives | killed (caller-spec row) |
   | R-Y2 | daemon spec `positionals: false` → `true` | survives | killed (caller-spec row) |
   | R-Y3 | daemon spec passed through a variable (behaviour-identical) | survives | killed (caller-spec row) |
   | R-Y4 | polaris `booleans` passed through a spread | survives | killed (caller-spec row) |
   | R-Y5 | a second identifier `readArgv` call in `cli.ts` | survives | killed (caller-spec row) |
   | R-Y6 | an extra `argvNs.readArgv(…)` namespace call with a drifted spec in `cli.ts` | survives | **survives** (N2) |
   | R-Y7 | an extra call through `const readArgs = readArgv` in `cli.ts` | survives | **survives** (N2) |
   | R-Y8 | another options command (`--draft`) gains a valued option | survives | survives (by design: not a policy copy) |
   | R-X1 | `main.ts` → `bridge-a.ts` → `bridge-b.ts` → barrel (two deep) | survives | killed (this-package row) |
   | R-X2 | the barrel re-exported from a new module of `cap1-daemon`'s root | survives | killed (this-package row) |
   | R-X3 | `createRequire` + `load('@syzygy/polaris-dossier')` in an intermediate module | survives | killed (`node:module` row) |
   | R-X3b | `createRequire` from the bare `'module'` specifier in `main.ts` | survives | killed (`node:module` row) |
   | R-X4 | `import(import.meta.resolve('@syzygy/polaris-dossier'))` in `main.ts` | survives | killed (computed-import row) |
   | R-X5 | a literal `await import(barrel)` inside `if (parsed.kind === 'help')` | killed | killed (entry list, this-package row) |
   | R-X6 | `apps/syzygy/package.json` `imports` `#dossier` → the barrel, `import '#dossier'` in `main.ts` | survives | **survives** (N1) |
   | R-X6b | the same alias (`#cli`) used from an intermediate module | survives | **survives** (N1) |
   | R-X8 | `process.getBuiltinModule('node:module').createRequire(…)(barrel)` | survives | survives (the PR's residual) |
   | R-X9 | a `node` condition ahead of `import` in the dossier's `./argv` export, pointing at `dist/index.js` | survives | **survives** (N1) |
   | R-X6i | island: `three-surface-poc` `imports` `#consent` → consent root, imported by `dossier-site.ts` | survives | survives (N1, pre-existing) |
   | R-X6j | control for X6i: the same edge by its package name | killed | killed |
   | R-IF1 / IF1b | the island filter / inline push never records an edge | killed | killed |
   | R-IF2 / IF2b | the island filter / inline push drops `!island.has(from)` | survives | survives (equivalent at both) |

   - **Runtime confirmation of the survivors that matter.** [Observed] `imports_probe.py`: with X6's manifest edit, `node` resolves
     `#dossier` to `file://<tree>/packages/polaris-dossier/dist/index.js` and the loaded module has `runDossierCli` and
     `runPolarisCli` (`true true`); with `import '#dossier';` added to `main.ts`, `npx tsc -p apps/syzygy --noEmit` exits 0.
     `cond_probe.py`: unmutated, `@syzygy/polaris-dossier/argv` resolves to `…/dist/argv.js`; under X9 to `…/dist/index.js`.
5. **Moved `reach`, by execution.** [Observed] Item 2 of §2's differential: 246/246 entries equal, answers digest
   `e297b289a9f722bdfe5840064f27e1454df131795eecb5b6c1546f30a1cae777`, tree clean after, scratch modules deleted.
6. **8.1 and 8.23-era island mutants** (`island_specs.py` → 25 kept, 1 skipped; `island-mutants-{base,head}.json`). [Observed]
   - Kept: every mutant of `island-decoupling-review-2026-10-22/mutants-reviewer.json` (R1–R9), `mutants-lane-rerun.json` (B1–B5b,
     B7–B9) and `consent-live-module-review-2026-10-24/reviewer-boundary-mutants.json` (B1, B4, R1–R5) whose tests include the
     island guard and whose `old` occurs once at both base and head. Skipped: 8.1's B6, whose `UNFOLLOWED` line no longer exists
     (0 at base, 0 at head).
   - Outcomes: `{('survives', 'survives'): 8, ('killed', 'killed'): 17}`. Killed at both: 8.1 R2, R3, R7, R8, B1, B2, B3, B4, B5,
     B5b, B7, B8, B9; 8.23 B1, B4, R1, R2. Survive at both: 8.1 R1, R4, R5, R6, R9; 8.23 R3, R4, R5 (each recorded as an expected
     survivor by its own review). **No island-guard kill is lost by the move.**
7. **Test names** (`titles.py`, `vitest list` over the three changed files at base and head). [Observed] 86 → 105 names: **19 added,
   0 removed**, 0 duplicates; argv.test.ts 65 → 74, subpath-imports.test.ts 17 → 27, island-boundary.test.ts 4 → 4. A scripted sweep
   of the diff's removed lines for `it(`, `it.each(`, `describe(`, `test(` and `])(` found 0 in each of the four code files. The
   lane's whole-repository `test-delta.json` (names 5,237 → 5,256, +19, 0 removed) I did not re-run; [Inferred] it must equal the
   three-file delta, since no other test file and no product module changed.
8. **Repeated runs** (`repeat.py`, the three changed files together, 6 runs, 12 cores). [Observed] 6 of 6 runs exit 0 with 105/105
   passed; load1 at start 43.4–47.5; wall 4.5–6.7 s. Slowest tests per run, by vitest's own duration: the island guard's
   pre-existing "resolves every workspace import" 278–885 ms; the new daemon-path first test (which pays for the cached walk)
   251–806 ms; the new "is the spec of every readArgv call" 196–657 ms. Against vitest's 5,000 ms default that is at least 5.6×
   headroom at load 47; no new walk needs its own timeout.
9. **Projects, once each at the head.**
   - [Observed] `@syzygy/polaris-generation-core`: `Test Files  22 passed (22)`, `Tests  778 passed (778)`.
   - [Observed] `@syzygy/polaris-dossier`: `Test Files  2 failed | 30 passed (32)`, `Tests  3 failed | 1323 passed | 1 skipped
     (1327)`. Two failures are `Test timed out in 5000ms.` in `start-gates.test.ts`, which this PR does not touch (the lane saw the
     same class). The third is `review.test.ts > review-check > observes only the packet…`: `AssertionError: expected
     '{"command":"review-packet","outcome":…' not to contain 'p1'`, and the received text contains my TMPDIR `/tmp/r524-p1/…` (N4).
     Re-run alone with TMPDIR `/tmp/r524-qx`: `Test Files  2 passed (2)`, `Tests  166 passed (166)`.
   - [Observed] `npm run typecheck` (the root script, `tsc -b` over ten projects) exits 0 with no diagnostics.
   - [Observed] `python3 scripts/check_governance.py`: `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`, exit 0.
   - [Observed] `python3 scripts/check_quotations.py`: exit 0.
   - [Unknown] The PROJECT-STATUS canonical battery (`commands=110 nonzero=0` in the PR body) I did not re-run; it is lane-reported.
10. **Dossier golden** (the lane's own `dossier_golden.py`, run unchanged in my probe clone at the head). [Observed] `{"buildExit": 0,
    "runExit": 0, "runOutput": "{\"rows\":1696}", "outputSha256": "54983601a3d783ee442719858e6e1d5fecad9f6589c170d71969b7a4e1a4762b",
    "equal": true, "cwdEmptyAfter": true, "trackedTreeCleanAfter": true}`. That digest is the one the #521 raw records
    (`R-GP-IMPL-ARGV-TABLE-1-RAW.md:269`).
11. **The `readArgv` module census, second method.** [Observed] `git grep -l -F readArgv 43ae35fe` over every tracked file: the
    only implementation-plane hits are `apps/syzygy/src/main.ts`, `packages/polaris-dossier/src/{argv,cli,polaris}.ts` and
    `argv.test.ts`; the rest are under `docs/`. That equals the test's list. Population the test scans: the 246 non-test `.ts`
    modules under `apps/*/src` and `packages/*/src` (`.mts` and `.cts` end in `ts` and are scanned too). Outside it, 21 script-like
    tracked files under `apps/`, `packages/` and `scripts/` (one `.ts` in `packages/polaris-dossier/test-support/`,
    `packages/cap1-system/vitest.config.ts`, 19 `.mjs` under `scripts/`, by the extension sweep), none of which is compiled product.
12. **The testkit's reach into product code.** [Observed] `git grep -n -F workspace-reach 43ae35fe -- apps packages scripts
    package.json vitest.config.ts` finds 3 lines in 2 files, both `.test.ts` (the two guards). No package `exports` names it. It is
    emitted into `packages/polaris-generation-core/dist/` by `tsc -b`, as that package's test files already are.

## 4. Findings

There is no blocking finding (no F). There are four notes.

### N1 — The shared resolver lets three type-clean forms reach the barrel from the daemon path (low)

- **Evidence.** [Observed] §3 item 4.
  - `workspace-reach.testkit.ts:33` returns `null` ("outside the workspace") for every specifier that is neither relative nor
    `@syzygy/<name>…`, and `:37-38` takes an `exports` object's `import` (else `default`) condition.
  - R-X6 (a package.json `imports` alias `#dossier` → `@syzygy/polaris-dossier`, imported from `main.ts`) and R-X6b (the same alias
    used from an intermediate module) pass all 27 rows of `subpath-imports.test.ts`. Node loads the barrel through the alias, and
    `tsc` accepts it (`imports-probe.json`).
  - R-X9 (a `node` condition ahead of `import` in the dossier's `./argv` export) passes all 27 rows; Node then resolves `/argv` to
    `dist/index.js` (`cond-probe.json`).
  - The PR's residuals name only loads with no import edge (`process.getBuiltinModule`, `eval`). These three have an edge, and the
    guard's title "reaches this package through argv.ts and state-directory.ts alone" is then false while green.
  - The island guard uses the same resolver. R-X6i (`#consent` → the consent root, from `dossier-site.ts`) survives at base and
    at head, so the move neither caused nor fixed it; the condition-order class (8.1 R4, 8.23 R4) was already recorded there.
  - Today no workspace manifest declares `imports` (0 of 10), and none puts a runtime condition ahead of `import`.
- **Failure scenario.** 8.5 ("one leaf util") tidies imports with a package.json `imports` map and one entry names the barrel; or
  someone adds a `node` condition to `./argv` for a build reason. Every daemon start then loads the whole dossier package (147 modules
  against 38, per the 8.2 review) with both guards green.
- **Proposed fix.** In `workspace-reach.testkit.ts`, fail closed:
  - make `resolve` return `undefined` (unresolved, so both guards' "resolves every…" rows fail) for a `#…` specifier, an absolute
    path and a `file:` URL, unless it resolves `#…` through the importing package's `imports` field and continues the walk;
  - in the `@syzygy/*` branch, return `undefined` when an `exports` entry's runtime conditions (`node`, `import`, `require`,
    `default`) do not all name the same target.
  - Add one row per form and record R-X6, R-X6b, R-X9 and R-X6i killed. Because the testkit is the island guard's mechanism, the
    change is again class 1/4 evidence (GP-Q0's checks). Until then, add the three forms to the residuals in the dispositions record.

### N2 — The spec-copy lift sees only identifier calls; an extra namespace or aliased call passes (low)

- **Evidence.** [Observed] R-Y6 (`import * as argvNs from './argv.js'` plus `void argvNs.readArgv(rest, { valued: ['--drift'],
  dashValue: 'take', repeat: 'last', positionals: true })` in `cli.ts`) and R-Y7 (`const readArgs = readArgv;` plus an extra call
  through it) both leave `Tests  74 passed (74)`. `argv.test.ts:177` lifts a call only when its callee is the identifier
  `readArgv`, and the module census at `:190` already lists `cli.ts`. The PR states this residual as "[Inferred, not run]"; it is now
  observed. The census is otherwise sound: a variable spec, a spread, a second identifier call, a new caller module and every
  copied drift fail loudly (R-Y1–R-Y5, D1–D6).
- **Failure scenario.** 8.5 adds a second reading in `cli.ts` through a namespace import with its own, unpinned policy; its
  accepted and refused forms change with CI green.
- **Proposed fix.** In `readArgvCallers`, count every reference to the `readArgv` binding (an identifier other than its import or
  export specifier and its declaration in `argv.ts`, or a property access named `readArgv`) and fail on any that is not the callee
  of a lifted call. Or let 8.5's planned fix (export each spec and pin it once) retire the lift. Name R-Y6 and R-Y7 in the
  dispositions record.

### N3 — Process: the change touches classes 1 and 4 (and 6, no endpoint removed), not "none"; the owner notice is pending (process)

- **Evidence.** [Observed] The PR body says "**CC-REV-1 classes: none declared.** The bead puts the ceiling at class 6." §2 rules
  classes 1 and 4 through the island guard, as #516 and #519 ruled for `launched.test.ts`, and class 6 for the argv rows. GP-Q0's
  differential and per-predicate checks are met in this review (§2). `bd comments syzygy-bpyt.10` has no 8.34 notice.
- **Failure scenario.** The cycle report omits 8.34, and the owner is not told that the CLI-to-island evidence changed mechanism.
- **Proposed fix.** At landing, post the GP-Q0 owner notice to `syzygy-bpyt.10`: classes 1 and 4 (island guard's walk moved to
  `workspace-reach.testkit.ts`, kill power unchanged: 246/246 differential entries equal, 25 retained island mutants with equal
  outcomes), class 6 without an endpoint removed, no product byte, the N1 residuals. Record the ruling in the dispositions.

### N4 — Outside the subject: `review.test.ts:545` fails when TMPDIR contains a reviewer leaf such as `p1` (low)

- **Evidence.** [Observed] §3 item 9. `review.test.ts:545` asserts `expect(text).not.toContain(leaf)` for every string leaf of the
  reviewer's verdict, including the block id `'p1'` (`:135`, `:244`); `text` is the observed holder's JSON, which carries the run
  path under `os.tmpdir()`. With `TMPDIR=/tmp/r524-p1` it failed; with `/tmp/r524-qx` the file passed. This PR does not touch the
  file. It is the inverse of the AGENTS.md `:297-299` guardrail: a short label "reached" by coincidence, here as a false failure.
- **Failure scenario.** A CI runner or an operator's TMPDIR contains `p1`, `c-p1` or another short leaf, and the suite goes red for
  no defect, which trains people to ignore red (test-rigor bar 6).
- **Proposed fix.** Give the fixture's ids distinctive strings (for example `block-p1-zz`), or compare leaves against the holder
  with path fields removed, and add a row that runs the check under a TMPDIR containing `p1`. File it as its own bead.

## 5. Every changed output, or the evidence that there is none

- **Product bytes: none changed.** [Observed] §1 item 3: the only changed implementation-plane files are three test files and one
  `.testkit.ts`.
- **Dossier golden: 0 rows differ.** [Observed] §3 item 10: 1,696 rows, `54983601…`, equal to the recorded digest.
- **Island walk answers: unchanged.** [Observed] 246/246 entries equal (§3 item 5), including the CLI entry (137/0/0) and the
  consent root (32/11/0).
- **Accepted and refused argv forms, paths, refusal strings, exit codes: unchanged** [Inferred from the byte identity of `argv.ts`,
  `cli.ts`, `polaris.ts`, `main.ts` and `state-directory.ts`; the golden exercises the CLI's refusal strings and exits].
- **Test output.** [Observed] +19 test names, 0 removed or renamed (§3 item 7).
- **Build output.** [Observed] `tsc -b` now emits `workspace-reach.testkit.{js,d.ts}` and maps into
  `packages/polaris-generation-core/dist/`. The emitted `packages/polaris-dossier/dist/subpath-imports.test.js` imports
  `../../polaris-generation-core/src/workspace-reach.testkit.js`, a path with no `.js` file; no `dist/` test is run (the vitest
  projects include only `src/**/*.test.ts`). The PR body discloses this.

## 6. Verdict per acceptance criterion

- **AC1 — met.** [Observed] The raw's five rows are at `argv.test.ts:41`, `:82`, `:83`, `:84`, `:107`; the `--out=` row at `:126`;
  the guard-order row at `:137`; the N3 row at `subpath-imports.test.ts:125-129`. Every expected value is a literal (no expected
  value is imported from `argv.ts`). OR1, OR2, OE1, OS1 and OS2 are recorded killed with `old`/`new` fragments, commit `20cabca5`
  and subject digests (§3 item 1); I reproduced each surviving at base and killed at head (§3 item 3).
- **AC2 — met, with N2.** [Observed] D1–D3 are recorded killed and I reproduced them (survive at base, killed at head), plus my
  R-Y1–R-Y5. R-Y6 and R-Y7 survive (N2).
- **AC3 — met, with N1.** [Observed] The walk is transitive from `main.ts`; OE3–OE5 are killed at head and survive at base; GM1 and
  GM3 are killed at base and at head; my R-X1–R-X4 (two-deep chain, another package, `createRequire` in an intermediate module,
  `import.meta.resolve`) are killed. R-X6, R-X6b and R-X9 still pass (N1).
- **AC4 — met; the class is reclassified (N3).** [Observed] No product byte changes and the golden differs on 0 rows. The PR states
  `Tests: +19 ~0 -0`, which I confirm for the changed files, and it states its class ("none", ceiling 6); I rule classes 1, 4 and 6.

## 7. Test quality

Against the test-rigor bar:
- **Bar 1 (behaviour) and bar 4 (no tautologies): met.** The argv rows pin `readArgv`'s answers with literal expected values. The
  spec-copy check compares lifted caller specs with the test's own literal copies; `DOSSIER_OPTIONS.valued` (`:211`) is a test-local
  literal, not a value from the module under test. By design the lift pins the callers' *shape*, so a behaviour-identical refactor
  (R-Y3, a spec in a variable) fails it. That is fail-closed and the PR names 8.5's export-and-pin as the full fix.
- **Bar 2 and bar 10 (each added test catches something new): met.** Each new row or test is killed-at-head-and-survived-at-base
  evidence for at least one mutant (§3 items 3–4), with one exception: the `switch` classifier row
  (`subpath-imports.test.ts:113`) has no mutant of its own in the record [Inferred: a `where` that named `case` clauses would fail
  it]. The suite grows +19 with no condensation, appropriate for gap-filling rows that each answer a review note.
- **Bar 3 (edge and failure paths): met.** Empty values under all three value policies, repeat-then-missing, a guard that must
  throw before a fault, and computed and transitive edges are now pinned.
- **Bar 6 (deterministic): met.** 6 of 6 repeated runs at load 43–47 passed 105/105. The daemon walk is cached in a module-level
  `daemonPath`; it depends only on the tree, and a throw leaves the cache empty so every row fails, not only the first.
- **Bar 7 (a failure names the defect): met.** The `toEqual` diffs name the module and edge or the drifted spec field. The combined
  row "has no node:module edge, and no import() or require of a computed name" holds two expectations, but each prints the offending
  `module: edge` strings.
- **Bar 8 (maintained code): two small readability points, no note.** `argv.test.ts:12` is a 201-column comment line; the file's
  other comment lines stay at 140 or under (scripted: 0 such lines at base, 1 at head). The testkit's `reach` doc says "in the
  order it reaches them", but `reachable` comes back sorted; only `edges` keep traversal order. The cross-package relative import of
  the testkit is disclosed, and its only alternative was a new class-6 export.
- **Bar 5 (mocks) and bar 9 (tiering):** no mocks; every changed test is a unit-tier source-text or pure-function test, targetable by
  file, about 5 s for all three.

## 8. Cleanup

- Deleted: my three scratch clones (`rev-524/clone`, `rev-524/base`, `rev-524/probe`) and every TMPDIR I created (`/tmp/r524-h1`…`h6`,
  `b1`…`b6`, `d1`, `r1`, `t1`, `g1`, `p1`, `p2`, `qx`). Nothing else in `/tmp` was touched. No process was killed.
- Kept, under `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-524/` (sha256, bytes):

| File | sha256 | Bytes |
|---|---|---|
| `check-governance.log` | `c6a464a7abbfb6c345f2796b97e5d30c4d0e141bbc0d00e5fcc8dfb8cec79914` | 170669 |
| `check-quotations.log` | `0a1152902b7da9d990f58d0befcf14a43e1e608dee1bd759d4fffccdd0c6123c` | 1606 |
| `cond-probe.json` | `48ef11fabc57ac59d5eb21d35716808034bcd59ff2d89070bb5639ee116b7a75` | 200 |
| `dossier-golden-rerun.json` | `67185c27ee030a94fc3e2cfc928932c9d1b5b5d36ab232e7bbae2f5c7e0d2eea` | 1109 |
| `filter-mutants-base.json` | `5b1e74db974d06e06a749bcf0cc189eaa830ada31ebe206319afc8ad9eecd688` | 1848 |
| `filter-mutants-head.json` | `278cfa25d02bcf898fd70dd0905c175f9c68217145da9af3ad50924f0340f2f0` | 1924 |
| `gm7-oe2-base.json` | `62a9fab0857fb81edce17400f4371025b4642ac386cd06d49eef8577a0f6f31f` | 2298 |
| `gm7-oe2-head.json` | `3c05f176554ba51942aac23d396246d12aafe83bfacd74120db57e9a361cdb30` | 3637 |
| `imports-probe.json` | `971bd698b59ec65c1a04f21e0579b5e5e93794718d6f5cbb0d87164af153151e` | 187 |
| `island-diff-all-entries.json` | `909713807e5e2694a5d7f98b157465004b5d116be76c1719b7718d670326f4d0` | 1000 |
| `island-diff-all-entries.log` | `7acb04c11154098af1c7df85eb468be683cc80b04a1768d1dfb263b79354a197` | 1001 |
| `island-mutants-base.json` | `50c3329c46de8366d90f6c24f43e917a14b091f47666599f538548eedfa5d9f3` | 21852 |
| `island-mutants-base.log` | `5afe6663632046d64a080090f241dd37f394cbf74611d4c5012f1e3e265fce1b` | 6149 |
| `island-mutants-head.json` | `71a1def99e164d891ba74d1772776508598819616bb1513bc4e93a0877c0df83` | 21853 |
| `island-mutants-head.log` | `aab774096f5e7a0680773f729eb06752153fbff187df99282acb72482beecf24` | 6149 |
| `lane-mutants-base.json` | `e084ac38184d5bdda5f017f9621ae02dca48198a6e36cde6ca2c4bea2a02d57d` | 18411 |
| `lane-mutants-base.log` | `ddd1b27883d2a735b834f23d3ea0c3ca9110c666684ebcf39b52012c85aedec1` | 3421 |
| `lane-mutants-head.json` | `df8680ee6d295b283b66d15520dc0b752fd4dbed583bffe7f2c7e9bb0913ac81` | 28837 |
| `lane-mutants-head.log` | `85147173ab430773c3ff227d0f569d1bdd7007013919d450643b581fe3523848` | 11426 |
| `own-mutants-base.json` | `b12acdd23f0b57b339c4875de194b89d347a434b858fc86bffbe2a5a0ce76ec9` | 18367 |
| `own-mutants-base.log` | `dde9797467d6aac37e5649aa34b606286a7e959b18d4403439e47aa10b5827a8` | 2433 |
| `own-mutants-head.json` | `e187b2a6d8abe6c3d5e899cc383b48c0f7bce095c3f098e8528b1a85b29c41b4` | 21987 |
| `own-mutants-head.log` | `9c5339febf04ababfe019ccdb61bb24fd2118443748f1f2aa4b8ca40e51bb181` | 5891 |
| `project-dossier-rerun.log` | `16285f1d02e3a40fcb55c715ebfc2be4011cbd228626ffa51d2431be09edee7b` | 11690 |
| `project-dossier.log` | `77bc73a7a4363aa7a48aa0764301f1b296dd981d92bbad03d7755f2a62487548` | 108294 |
| `project-generation-core.log` | `12b2b6ff2d42157b79f09b15a0c521e2503d9a0e9ea44c58426e9627c7009fcb` | 5916 |
| `record-check-selftest.json` | `62dc1599539a5ffb11bc51047eb85328308bb132de8dcfd3ce8903d2cf34f041` | 56626 |
| `record-check.json` | `3c3059ddcbfc84ec83e7dc94666ea607720c9b61205a763ccc42e4798c28d968` | 56560 |
| `rederived.diff` | `27d79306964e269b4130fb7bf7794fd17b1831e500f4e6ee9e4051c0009099b2` | 119249 |
| `repeat-runs.json` | `7715eab2f2782c5122db359b44e30039c800dbf4d84b3ef5038f9866914c29e9` | 9231 |
| `titles.json` | `f9cfcd1406a1ae7163d75cf783db871fef66b669dd2e2ff4854dcf2dd8bea4b1` | 4905 |
| `tools/check_record.py` | `a5700a93ff8c83b53ba1bd59f141b14a59c5226ac07e23269fee05f4d755d6e1` | 5530 |
| `tools/check_table.py` | `6e2638d38ebc82a1d9cc21c8da246f0374aa36e9ff4fc6abd6f73fdb5900e8b1` | 1149 |
| `tools/compare.py` | `57f3f07e44ca6dfa8fa3d2b223c4f437db173be6ded05ba23c47b535ac3194b8` | 1006 |
| `tools/cond_probe.py` | `1ac59eef1aad83d9d5366212edac95975e4eb6bd0ac13fc64df68f9f1b0e2285` | 1870 |
| `tools/filter-specs-base.json` | `6ccba4b0033c94d6fd87bfa43ad694c6127b6415f3d9d6f8670d9eb3d3faa349` | 1081 |
| `tools/filter-specs-head.json` | `34ac487db96db6bdea6bb25f0e1d96a68ef929c0e9a96d6825a4c9ab61636dfb` | 1156 |
| `tools/from_lane.py` | `02f0e0870e8ba12ce97afc1a7c3e92eff40b43af54368561175b54b0f90d2919` | 997 |
| `tools/gm7-oe2-specs.json` | `8965f4d502842ac6ac1e15b97f9342103f15fc5eb89d9fb58c57d36e3048e2bf` | 1010 |
| `tools/imports_probe.py` | `40e4d91d36a95517b157d9bf6b6a39a015f2338e476e6575f72464f771bf5822` | 2485 |
| `tools/island-specs.json` | `a7659f1ad26e1decc3a017a8048f3d8a638865804e5cfab632169be2429d0cb7` | 19969 |
| `tools/island_diff.py` | `9a4f053ecd6dd3f383416d1b1da7f26d0d1d8f50a1e9460d776ee2fa15a8fc7c` | 3927 |
| `tools/island_specs.py` | `9406436209c4032dfa89c07d4fc9be701e73596fd19af324be29acce1caeb5a7` | 2340 |
| `tools/lane-specs.json` | `33541031ed794b8294d1f96d34470868626928f3d45c91abe0949f818759b5ec` | 15869 |
| `tools/mut.py` | `ca2b8eadc503305bb3767b7220b02775429164ef6c183ac9854acf9d8ed9b6a5` | 4358 |
| `tools/own-specs.json` | `4383c39906b5906433c95e3d977e2ac3fecdbf4c8e8b880965916e4336940b2b` | 13368 |
| `tools/own_specs.py` | `83c4d50f8f13ef64ad7027c005ceae5827acd14c7b69138cc324e7bf30c00f6e` | 9207 |
| `tools/reach_compare.py` | `90b77e4769d1e917d0609fb6141f2bb3508435e463471005ab2688984158c5ac` | 1887 |
| `tools/repeat.py` | `5078d553f22acb58f3cfc015eb91ff4c2a38631668505ae9f54ef490965fa5b1` | 2352 |
| `tools/titles.py` | `7c0cd4fe225773f471989c524aa86cd8930d6af62b9cea63af7958b509590a1e` | 1844 |
| `tools/x9-specs.json` | `3d1483cdc712bdcf8bd4a074353f1a4706e7bd039cccd8bcd1ebaa18d732bfae` | 560 |
| `x9-base.json` | `2a65a7f2c928190fb56aaedc49336faa82eb3a4c501986a895e35593bb774dc8` | 896 |
| `x9-head.json` | `512d42e388effd5d3a83d2bb6932b39edccdf7be99aeb4eef827a9751c8fe4f4` | 897 |

53 kept files, plus this raw; `tools/check_table.py` re-hashed every row of this table against the bytes on disk (53 rows, 0
mismatched, 0 kept files unlisted) after the clones were deleted. The result JSONs name my scratch clone paths, which no longer exist; every mutant in them carries its
full `old`/`new` (or `create`) fragments, so each can be re-run in a fresh clone of `43ae35fe` (or `3ec69299`) with `tools/mut.py`.
