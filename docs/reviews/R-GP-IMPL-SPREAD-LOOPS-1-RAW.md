# R-GP-IMPL-SPREAD-LOOPS-1 — CC-REV-1 implementation review of syzygy-bpyt.1.18, round 1
Verdict: REVISE
Reviewed commit: 241b28ff
Subject: r1-review.diff sha256 2646d106f93b070761ae38a59ddc740c98a64cd13c84e7d0c8d6f71ac1f993e6

Reviewer: fresh-context CC-REV-1 reviewer (did not author the change; no access to the authoring session). Date 2026-10-28.
No observed repository body was read and no daemon was started; every input below is synthetic or a tracked Syzygy file.

One blocking finding (F1, a false figure in the PR body and the record: UTF-16 code-unit counts labelled bytes) and nine
notes. The code change itself is what the owner directed and nothing more; every changed output I could construct is a throw
becoming the shorter-input decision.

## 1. Subject identity checks

- [Observed] `sha256sum lead/b118/r1-review.diff` → `2646d106f93b070761ae38a59ddc740c98a64cd13c84e7d0c8d6f71ac1f993e6`.
  Re-derived in a scratch clone: `git diff 8d5d4bab 241b28ff | sha256sum` →
  `2646d106f93b070761ae38a59ddc740c98a64cd13c84e7d0c8d6f71ac1f993e6`. **Match.** `git diff --stat` ends
  "29 files changed, 5507 insertions(+), 2 deletions(-)".
- [Observed] `git merge-base 8d5d4bab 241b28ff` → `8d5d4babc7b20c5fe64238b9e538ae1b04e5254d`; `gh pr view 555 --json headRefOid`
  → `241b28ff5cc651d4367d508141e91736f9a858de`, state OPEN, mergeable MERGEABLE.
- [Observed] PR body: `gh pr view 555 -R Tzeusy/syzygy --json body --jq .body > f; sha256sum f` →
  `cce30f193b5285f384d98e07fe7af1914f9750021f482cb4257d0ea3d0baf3b2`. **Match** with the coordinator's freeze.
- [Observed] Production diff: `git diff --numstat 8d5d4bab 241b28ff -- . ':!docs/evidence'` gives exactly
  `2 1 markdown-code-context.ts`, `2 1 project-shape-extraction.ts` (+4 -2 in two files), four test files (+29, +31, +29,
  +28, no deletions) and `AGENTS.md` (+7). `git diff --numstat 0f0ce073 241b28ff -- packages apps scripts` is empty (0 lines);
  the only path outside `docs/evidence/syzygy-bpyt-1-18/` that differs between code commit and head is `AGENTS.md`.
- [Observed] Main since the base: `gh/main` = `a15b6a04` at the start of the review (`git ls-remote` agreed).
  `git diff --name-only 8d5d4bab a15b6a04` lists 146 paths. Of them, a PR path: **`AGENTS.md` only** (exact-line intersection
  with the 29 PR paths). Paths a changed test reads: the four changed tests import only
  `packages/three-surface-poc-core/src/**` modules and fixtures (none changed on main) and run under the root
  `vitest.config.ts`, `package.json`, `tsconfig.json`, `packages/three-surface-poc-core/package.json` and
  `packages/three-surface-poc-core/tsconfig.json`, **all five changed on main** (PR #549, `syzygy-bpyt.4.2`: aliases replaced by
  an `ssr.resolve.conditions` `source` export condition; no `pool` or stack setting). Local merge (`git merge gh/main` onto
  `241b28ff`, auto-merged `AGENTS.md`, no conflict, `npm ci`, every `dist/` absent), the four changed test files once:
  "Test Files  4 passed (4)", "Tests  264 passed (264)" (loadavg 25.96 before, 27.24 after).
- [Observed] Main moved again while I worked: `gh/main` = `b87e7a40` (PR #553, `syzygy-bpyt.49`). `git diff --name-only
  a15b6a04 b87e7a40` outside `docs/` is empty. Over `8d5d4bab..b87e7a40` (171 paths) the only PR path is still `AGENTS.md`,
  and the five config paths above are the only ones a changed test reads. I merged `b87e7a40` into the same local merge (no
  conflict) and ran the four files once more: "Test Files  4 passed (4)", "Tests  264 passed (264)" (loadavg 20.16 / 20.01).
- [Observed] Hosted checks, read at start: `checks pending`, `node pending`. Read again before writing:
  "checks	pass	17m48s" and "node	pass	2m59s".

## 2. Clauses relied on, and the class ruling

CC-REV-1 (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md`):
- `:18-20` "Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the agent
  performing the change never finally decides which classes it touches."
- `:35-37` "3. **deterministic observation** — snapshot composition, evaluation identity, the deterministic/inferred seam
  (VIS-7); 4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
- `:40-41` "6. **public interface** — machine-queryable endpoints, adapter contracts, anything an external consumer can depend on;"
- `:51` "**A reviewer or the owner** may reclassify at any time."

GP-Q0 (`OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md:59-66`, its bullet list joined): "pull requests touching class 1 (authority boundaries),
class 3 (deterministic observation) or class 4 (security) … The checks: an old-versus-new differential over a mutated-record
corpus that includes records with altered prose; a rule-6 mutant for each predicate; a non-blocking owner notice in the cycle
report." Stop clause (`:95-96`): "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."

Follow-ups record (`OWNER-DIRECTION-GREENFIELD-PARITY-FOLLOWUPS-2026-10-28.md`), preamble: "Each answer here is now a listed
change for the work it describes, and for nothing wider." Q1: "The owner directs that such texts be read like any shorter
text, at both sites." "Review: CC-REV-1 class 4 (security); the reviewer may add class 3 (deterministic observation)."

**Class ruling.**
- **Class 4: touched** [Observed]. `scanActiveContent` is the active-content screen; its callers are
  `git-object-reader.ts`, `content-classification.ts`, `apps/three-surface-poc/src/verbatim-route.ts`,
  `packages/polaris-dossier/src/screen.ts` and `apps/three-surface-poc/src/polaris-generation/public-source-screening.ts`
  (`grep -rlF scanActiveContent packages apps --include=*.ts`, less tests: 5 files). The last is the screen in front of the
  Polaris generation provider, an egress path.
- **Class 3: added, touched** [Observed]. A source past the bound aborted the whole snapshot (the reader rethrows, the build
  throws after 10 of 14 `cat-file` calls); it now composes. The outcome depended on stack depth, not the text.
- **Class 6: not touched, my ruling** [Inferred]. No route, status vocabulary, schema or field changes. What changes is which
  existing answer (`/api/poc` 503 under its existing ceiling, re-observation 200) a new input population reaches, which the
  owner's Q1 text names explicitly. If the owner reads "anything an external consumer can depend on" to cover per-input
  outcomes, class 6 adds no check that has not been run (its GP-Q0 trigger is endpoint removal).
- Classes 1, 2, 5, 7: none. No authority, identity, migration or certificate code changes.
- **Question or notice.** Nothing here needs an owner question: the only changed outputs are the throw-to-decision changes the
  Q1 answer lists, at the two sites it names. The notice on `syzygy-bpyt.10` is enough. It should name all five callers (N7).

Test-rigor bar (`git show 241b28ff:.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`):
- `:42` "**A test is worth keeping only if some plausible bug makes it fail.**"
- `:58-59` "Every bugfix ships a regression test — Written to fail on pre-fix code."
- `:78-79` "Deterministic or quarantined — A test that fails intermittently is worse than no test"
- `:82-84` "A failure names the defect — … assertion messages make the diff readable. A maintainer should localize the bug from
  failure output alone."
- `:93-96` "Growth is governed — A test is worth *adding* only if it catches a plausible bug no existing test catches … Reviews
  state the net test delta".

`AGENTS.md` verification rules 3 ("Digests are scripted, never transcribed; totals are computed"), 4, 6, 9 and 11; Notes to
self: "Durable lessons only; status and narrative belong in git log, `bd`, or `PROJECT-STATUS.md`."

## 3. What I ran, and the results

Scratch clone of `/home/tze/GitHub/syzygy`, `gh` remote fetched; worktrees at `8d5d4bab` (base), `0f0ce073` (code),
`241b28ff` (reviewed, dist-free, and a second one for builds), and the local merge. `npm ci` in each; node v24.6.0, 12 cores.
Builds: `npx tsc -b packages/three-surface-poc-core` at base and head (exit 0 each). [Observed] the base `dist` holds
`out.push(...pending.map(blank));` and `all.push(...result.items);`; the head `dist` holds the two loops.

| # | Run | loadavg (1 min) | Result, verbatim |
|---|---|---|---|
| R1 | Full vitest at `241b28ff`, every `dist/` absent (`find … -name dist` empty before and after), default timeouts, `TMPDIR=/tmp/r555-2 npx vitest run --reporter=json` | 20.11 before, 31.35 after | `numTotalTests 5629, numPassedTests 5624, numFailedTests 0, numPendingTests 5`, `success True`, 254 files. No file failed, so no re-run was needed. The 5 skipped are environment-gated (strace absent; three `SYZYGY_POC_BUTLERS_REPO` gated; one real-browser capture) |
| R2 | The four changed test files on the local merge with `a15b6a04` | 25.96 / 27.24 | "Tests  264 passed (264)" |
| R3 | The four test files at the base worktree | 20.09 | "Tests  241 passed (241)" (so +23, 241 → 264, matches the body) |
| R4 | `spread_sweep.py` (the lane's tool) at base and head | – | base `regexHits 33`, head `regexHits 31`; removed exactly the two sites, added none; both outputs deep-equal the lane's retained JSON |
| R5 | My own census, `tools/spread_census.py` (second method: any call with a spread argument, `git show` of every `.ts/.mts/.tsx/.js/.mjs` under packages, apps, scripts less tests; 279 files) | – | "hits 8d5d4bab 174 241b28ff 172"; only in base: the two site lines, 1 each; "only in 241b28ff []" |
| R6 | `syzygy-bpyt-16/crlf-differential.mjs`, unchanged, base dist vs head dist | 24.81 | C1 1,825 + 10,131 texts, C2 11,054, C3 8,345, C4 1,822, all "failures": 0; `fence/all` "refuses": 0, "accepts": 0, "sameDecisionOtherFindings": 0, "unchanged": 8050; exit 0. Output deep-equals the lane's `mask-differential-output.json` (every key) |
| R7 | `huge-differential.mjs`, default stack | 25.53 / 29.88 | `{"failures":[],"maskThresholds":{"LF":{"largestSurviving":125459,"firstThrowing":125460,…},"CRLF":{"largestSurviving":125464,"firstThrowing":125465,…},"CR":{"largestSurviving":125459,"firstThrowing":125460,…}},"extractor":{"largestSurviving":125458,"firstThrowing":125459}}` exit 0 |
| R8 | `huge-differential.mjs`, `--stack-size=1968` | 29.73 | failures []; LF/CRLF first throwing 251,409, CR 251,415, extractor 251,411; base **survives 200,000** in all three line ends and the extractor ("base": "masked" / "extracted"); throws at 400,000 |
| R9 | `huge-differential-selftest.mjs` | 27.07 | with absolute paths: S1..S6 all `killed: True`, "killed": 6, "total": 6. With a relative `<node_modules>` argument every mutant reports `killed: false, failures: []` (N6) |
| R10 | `spread-mutants.py` (the lane's), at `0f0ce073` | 26.15 / 27.89 | "CONTROL {'mask': (53, 0), 'extractor': (88, 0), 'reader': (90, 0), 'model': (33, 0)}"; MU1..MU6 all killed; "baseFailingTests": 20. Every row's detectors and failing-test set equals the lane's retained output |
| R11 | My rule-6 runner `tools/mutants.py`, default timeouts, failure messages kept, 14 mutants | 23.4–24.6 per mutant | CONTROL 264 tests, 0 failing; all 14 **killed**, 0 timeouts among the failing tests (section 7) |
| R12 | The lane's `trace-probe.test.ts.txt` at base and code (output dir changed only) | 20.75 / 20.20 | head pipeline, both extractor traces: deep-equal to the lane's files; base pipeline equal except `maskThreshold` (mine 125,284 surviving / 125,285 first throwing in all three ends; the lane's 125,285–125,287) |
| R13 | `build-record.py` in a worktree at `241b28ff` | – | regenerated record sha256 `6f01ed769935039e56d95ef52f493a4840ae6dd55bdda87b8f60007c62eb2065` = the body's; tree clean after |
| R14 | My differential `tools/own-differential.mjs` (section 5) | 31.35 / 28.81 | `{"failures":[],"F":{"texts":20000,"differing":0},"G":{"files":1892,"comparisons":5676,"differing":0,…}}` exit 0 |
| R15 | My order check `tools/order-check.mjs`, head | – | `"items":200006,…,"wholeArrayEqualsClassConcatenation":true,"successLinesStrictlyIncreasing":true`; base throws |
| R16 | My read-limit probe `tools/limit-probe.test.ts.txt` at code and base | 22.43 | head: 1,048,219-line empty fence in vision.md, 1,048,358 in the root index (1,048,560 bytes each) and a 262,071-bullet list (1,048,556 bytes) all `"kind":"observed","source":"classified"`, 0 breaches, the list's 262,076 items kept; base: all three `"threw":"RangeError: Maximum call stack size exceeded"` |
| R17 | My ceiling probe `tools/ceiling-probe.test.ts.txt` at code | – | `"shapeJsonBytes":227519062,"shapeJsonLength":227519050,"items":130018` (F1) |
| R18 | `tools/bytes-check.mjs` over `project-shape-model.test.ts`'s VISION | – | 130,000 bullets: `"utf16Length":520268,"utf8Bytes":520272`; 200,000: `800268` / `800272` (F1) |
| R19 | The old spread (L1) under `--pool=threads`, mask and reader test files | 19.76 | "Test Files  2 passed (2)", "Tests  143 passed (143)": the old code **survives every new mask and reader test** (N1) |
| R20 | Canary probe (N1's proposed test) default pool and `--pool=threads` | – | default "Tests  1 passed (1)"; threads "AssertionError: expected function to throw an error, but it didn't" |
| R21 | `PROJECT-STATUS.md` battery, `tools/battery.py`, one bash script in the dist-free clone at `241b28ff` | 24.40 before, 24.25 after | "commands 114 assignments 2 nonzero 0", every command reported an exit status, tree clean after. Then `npm run typecheck`: exit 0, 0 `error TS` (loadavg 23.65). Both match the body |

## 4. Findings

### F1 (blocking; low substance, a false figure): UTF-16 code-unit counts are published as bytes

**Evidence.** The PR body's table row reads "`buildProjectShape`, success list of 130,000 and of 200,000 bullets (520,268 and
800,268 bytes)", and its "Every changed output" item 2 reads "[Observed] A 130,000-item success list makes a shape whose JSON
is 227,519,050 bytes". [Observed] (R18) the 130,000- and 200,000-bullet texts are 520,272 and 800,272 UTF-8 bytes; 520,268
and 800,268 are their JavaScript `.length` (UTF-16 code units), off by 4 because the VISION fixture holds two U+2014 em
dashes. [Observed] (R17) the shape's JSON is 227,519,062 UTF-8 bytes; 227,519,050 is `json.length`. The same mislabel is in
the reviewed record: `build-record.py:91` types "(520,268 and 800,268 bytes, under maxBytesPerSource)" (the docstring at
`:4` says "nothing is typed here except the labels and the sentences that say what a figure means"), `:95` renders
`ceiling["shapeJsonBytes"]` as bytes, and `ceiling-head-0f0ce073.json` names the field `shapeJsonBytes`. No tool for the
ceiling figure is in the evidence directory, so it could not be re-run from it (rule 11's intent; I re-derived it with R17).
The trace keys "(400337 bytes)" etc. in `trace-*-pipeline.json` are the same `.length` labels, raw probe output.

**Failure scenario.** A reader compares a published "bytes" figure against `maxBytesPerSource` or a response ceiling, or
re-derives it with `Buffer.byteLength`, and gets a different number. Every conclusion stands (all texts are under the
1,048,576-byte limit; the shape is far over both ceilings); the figures as stated are false.

**Exact fix.**
1. PR body, table row: replace `(520,268 and 800,268 bytes)` with `(520,272 and 800,272 bytes; 520,268 and 800,268 UTF-16
   code units)`.
2. PR body, item 2: replace `makes a shape whose JSON is 227,519,050 bytes,` with `makes a shape whose JSON is 227,519,062
   bytes (227,519,050 UTF-16 code units),`.
3. `build-record.py:91`: replace `(520,268 and 800,268 bytes, under maxBytesPerSource)` with `(520,272 and 800,272 UTF-8
   bytes, under maxBytesPerSource)`.
4. `ceiling-head-0f0ce073.json`: replace its content with
   `{"kind":"observed","shapeJsonBytes":227519062,"shapeJsonUtf16Length":227519050,"maxHumanResponseBytes":2097152,"maxMachineResponseBytes":16777216}`
   and retain the tool that measures it beside it. My `tools/ceiling-probe.test.ts.txt` can be used as-is: it is the lane's
   probe lines 1-270 plus one test that prints both figures. Copy it in as `ceiling-probe.test.ts.txt` and name it in the
   record's `files`.
5. `build-record.py` docstring `:4`: replace `nothing is typed here except the labels and the sentences that say what a figure
   means` with `nothing is typed here except the labels, the sentences that say what a figure means, and the two bullet-text
   byte counts of claim 4 (measured with Buffer.byteLength)`.
6. Re-run `build-record.py`, and replace the body's "Record sha256" with the new digest.

### N1 (note, medium): the new tests are blind to the regression under a worker-thread test pool

[Observed] (R19) with the old spread restored at the mask site, `npx vitest run --pool=threads` over the mask and reader test
files passes all 143 tests. A node worker thread's default stack is 4 MB. [Observed] by a bare `node -e` probe, a 200,002-
argument spread does not throw in a worker and a 600,002-argument one does. The repository runs vitest's default `forks` pool
(no `pool` key in `vitest.config.ts`, at the base or on main) and CI uses node 24 with no stack flag, so at the configured
runner the tests kill the regression (R10, R11). The body says "at twice the stack the old code survives them". That is true,
but it does not name the one-line configuration change that silently produces a 4x stack.

**My ruling on stack dependence:** disclosed enough to merge, not blocking. The owner fixed the size at 200,000. A size that
fails the old code at any plausible stack does fit the read limit: a fence of about 1,048,000 empty lines (1 byte each) does,
and R16 shows the head reads it and the base throws. But that departs from the owner's size, and the mask's unit tests are not
bound by the read limit at all. The fix that keeps the owner's size is a canary, which makes the stack assumption fail loudly.
Proposed, verified (R20: passes under forks, fails under threads), for the `describe('a very long closed fence')` block of
`markdown-code-context.test.ts` (the same three lines, with `BULLETS`, serve `project-shape-extraction.test.ts`):

```ts
  // These sizes pin the fix only where one spread call over them overflows: a larger stack (a worker-thread pool runs at
  // 4 MB) lets the old line pass every test here. This canary fails first if the test process stops overflowing.
  it('one spread call over 200,002 arguments still overflows the stack in this test process', () => {
    const sink: unknown[] = [];
    expect(() => sink.push(...new Array<unknown>(LINES + 2))).toThrow(RangeError);
  });
```

### N2 (note, low): three test comments state a process-dependent boundary as a constant, and an inference as fact

- `markdown-code-context.test.ts:239`: "A call that spreads 125,285 lines or more overflows the stack on node 24 with the
  default stack, whatever the line end." [Observed] R7: bare node at the default stack survives 125,459 inner lines (LF).
  125,285 is an inner-line count, while the spread's argument count is two more. Replace it with: "A call that spreads about
  125,000 lines or more (the boundary moves with the process and its stack depth) overflows the stack on node 24 with the
  default stack, whatever the line end."
- `project-shape-model.test.ts:1011-1013`: "a closed fence of 125,285 lines or more … that nothing between the reader and the
  daemon caught: startup exited 1 and a re-observation kept the prior model." The PR body itself labels the startup exit
  "[Inferred, not run]". Replace `a closed fence of 125,285 lines or more` with `a closed fence of about 125,000 lines or more`,
  and `startup exited 1 and a re-observation kept the prior model` with `a re-observation failed and kept the prior model, and
  startup would exit 1 (read from poc-main.ts, not run)`.
- `project-shape-extraction.test.ts:1131` ("A call spreading 130,000 items or more overflows") is true as worded (any count
  at or above about 125,459 overflows). No change.

### N3 (note, low): the `AGENTS.md` bullet restates bead and owner-record state, and narrows a depth dependence

[Observed] at `241b28ff`, `AGENTS.md:271-277`. Its rule is true and durable: "Loop instead.", and the boundary of roughly
125,000 at the default stack (R7, R12). Three parts of it are not:
- "`syzygy-bpyt.1.18` did it for the mask and the extractor; `syzygy-bpyt.54` carries the other 31 calls, and a fix there
  that turns a crash into a decision goes to the owner". This is bead status (owned by `bd`) and an owner ruling (owned by
  the Q1 record). The count 31 goes stale when `.54` lands. Notes-to-self says "status and narrative belong in git log, `bd`,
  or `PROJECT-STATUS.md`".
- "the boundary moves a little with the process" understates it. The owner record says "Past roughly 100,000 to 125,000 lines
  or items, depending on how deep the caller is", and the bead's drafter trace records 103,535 lines at 2,000 frames deep
  [Observed by the drafter, per the bead comment; not re-run here].
- "nothing between the reader and the daemon catches" describes the two sites and does not hold for every call the rule
  governs.

Replacement text:

```
- Never hand a whole array to one call (`out.push(...lines)`): the argument
  list is bounded by the stack, so past roughly 100,000 to 125,000 elements at
  node's default stack (less the deeper the caller; half that at half the
  stack, four times it in a worker thread) it throws a `RangeError`. In the
  PWB reader nothing catches it before the daemon. Loop instead. A test that
  pins such a fix holds only at the stack it ran at; give it a canary that the
  one-call form still throws there.
```

### N4 (note, low): boolean assertions fail without naming the defect

`markdown-code-context.test.ts:251` (`expect(got.masked === …).toBe(true)`) and `git-object-reader.test.ts:471`
(`expect(result.text === text).toBe(true)`). [Observed] in R11, mutant R3 fails the mask test with "AssertionError: expected
false to be true // Object.is equality" (bar `:82-84`). The comment at `:250` explains the boolean: it avoids a 600 KB diff.
Keep the boolean and add vitest's message argument:
`expect(got.masked === `…`, 'the masked text differs from every non-terminator byte blanked').toBe(true);` and
`expect(result.text === text, 'the text read differs from the blob').toBe(true);`.

### N5 (note, low): the nine new reader tests sit under a describe whose title they do not test

`git-object-reader.test.ts:425` `describe('a CRLF or CR blob gets the outcome its LF form gets', …)` now holds the tests at
`:464`, `:474` and `:485`. Their full names read "a CRLF or CR blob gets the outcome its LF form gets LF: a 200,000-line closed
fence holding a script element reads as text…", but none of them compares a rendering with its LF form. Fix: move
`LONG_LINES` and the three `it.each` blocks into their own
`describe('a 200,000-line closed fence under the read limit (GP-B2 Q1)', () => { … })`, declaring `ENDS` there if it is not at
file scope.

### N6 (note, low): `huge-differential-selftest.mjs` needs an absolute `<node_modules>` path, and does not say so

`:35` `symlinkSync(nodeModules, join(root, 'node_modules'))` creates a relative symlink when given a relative path, so the
copied dist cannot resolve `@syzygy/*`. [Observed] R9: with relative arguments every mutant reported `killed: false`,
`failures: []`. The tool exits 1, so the run is not mistaken for a pass, but it looks like six surviving mutants. Fix: import
`resolve` from `node:path` and write `symlinkSync(resolve(nodeModules), join(root, 'node_modules'));` (and
`resolve(baseDist)` in the `execFileSync` arguments).

### N7 (note, information): the owner notice on `syzygy-bpyt.10` should name all five screen callers

The Q1 text names `/polaris`, `/api/poc` and re-observation. The changed decisions also reach the verbatim route, the dossier
screen (`packages/polaris-dossier/src/screen.ts`) and public-source screening, which screens bodies before provider egress.
Each now screens such a body as it screens a shorter one, inside the Q1 answer ("read like any shorter text, at both sites").
The notice should list the five callers, so the owner sees the egress screen named.

### N8 (note, low): the two 130,000-item tests run at 20-45% of the default timeout under this host's load

[Observed] R1 durations at loadavg about 20-31: `a 130,000-item success list is extracted whole` 2,206 ms, `a source whose
class holds 130,000 items` 969 ms (default `testTimeout` 5,000 ms). The other 21 new tests take 89-422 ms (all 23: 6,642 ms).
None timed out in R1, R2, R10 or R11. The body reports timeouts elsewhere at load about 30. Optional fix: give those two `it`
calls an explicit `30_000` timeout. That bounds a slow host and is not a retry.

### N9 (note, low): test strength and growth

- The three "left unclosed" mask tests pass at the base and were killed by none of my 14 mutants. The loop is never reached
  for an unclosed fence, so they guard an untouched path (bar `:93-96`). Keep them as a statement of "nothing new is refused",
  or drop them. The reader's "scanActiveContent … finds nothing inside it" tests are killed by exactly the mutants that kill
  the "reads as text" tests (L1, R3, R4).
- `project-shape-extraction.test.ts` checks three items at each end of each class slice. A mid-array swap would pass. R15
  shows the head keeps the whole array in order. Comparing the whole slice is one boolean:
  `expect(isDeepStrictEqual(r.items.slice(offset, offset + alone.items.length), alone.items), \`${cls} items differ from its one-class result\`).toBe(true)`.

## 5. Every changed output, or the evidence that there is none

[Observed] Base and head are deep-equal on every input that does not throw at the base:
- R6: 11,054 synthetic mask texts, 0 refuses / 0 accepts / 0 same-decision-other-findings.
- R7, R8: 20 survivor sizes per stack.
- R14 E: three fences of 100,000 lines each in one text (300,000 lines in all), three line ends.
- R14 F: 20,000 seeded random texts over fence, span, script, U+2028 and line-end tokens, 0 differing.
- R14 G: every tracked `.md` in the clone (1,892 files), `scanActiveContent` and `extractSource` with all nine classes under
  two paths, 5,676 comparisons, 0 differing. The extractor part reached only `unknown` (3,784 of 3,784: Syzygy's files do not
  meet the Butlers grammar), so it is weak evidence for the extractor. R7, R8 and R14 D are the extractor's survivor evidence.
- R14 B: unclosed fences of 200,000 and 400,000 lines are `malformed`, `unclosed-fence`, line 1, at both commits.

Where the base throws, the head returns the shorter-input decision:
- R14 A: a 200,000-line fence holding `<script>`, then `<script>alert(1)</script>` after it. Base `RangeError` in LF, CRLF and
  CR. Head scan forms `["script-element","script-element"]`, equal to the head's and the base's scan of the same text with a
  10-line fence. The head mask equals an oracle that blanks the fence region and keeps the rest.
- R14 C: a fence of 1,048,000 empty lines (1,048,008 bytes). Base throws; head masked equals the blanking oracle.
- R14 D: LF 262,000 and CRLF 209,000 bullets near the read limit (1,048,075 and 1,045,083 bytes). Base throws. Head keeps
  every item, and its first 50,000 items deep-equal the base's whole result on a 50,000-bullet text in the same line end.
- R16: the largest admitted fence and list through `buildProjectShape`.

The loop keeps order and every element: R7/R8 oracle equality, R14 A/C/D, R15 (whole 200,006-item array equal to the class
concatenation; lines strictly increasing). By reading [Inferred]: `blank` is pure and `pending.map(blank)` was fully built
before the old push, so the per-line push is element-for-element the same sequence. Nothing new is refused in any corpus.
**No input I could construct changes decision other than one that used to throw.**

The before/after table, as I re-ran it:

| Row | Re-run at both commits | Label |
|---|---|---|
| mask and `scanActiveContent`, 200,000 lines, three ends | R12 direct rows, R7, R14 A | [Observed]: base 6 of 6 throw, head masked, findings empty |
| `buildProjectShape`, fence in phase-B source and in root index | R12 | [Observed]: base throws after 10 and 1 `cat-file` calls; head `observed`, `classified`, 14 calls |
| 100,000-line fence | R12 | [Observed]: unchanged |
| success list 130,000 and 200,000 | R12, R16 | [Observed]: base throws, head keeps every item. The byte figures are wrong (F1) |
| 100,000 and 125,000 bullets | R12 | [Observed]: unchanged |
| re-observation | R12 | [Observed]: base `failed`, "Maximum call stack size exceeded", prior model and capture kept; head `reobserved`, replaced |
| startup | not run | [Inferred] is fair: `poc-main.ts:231-241` catches any non-`PocObservationError`, writes `syzygy POC: observation failed (${unexpectedObservationDetail(cause)})` and returns 1, and `unexpectedObservationDetail` names `RangeError` |

The 503 sentences are labelled fairly. The 227 MB shape figure is [Observed] (with F1's unit fix), and the 503 answer is
marked [Inferred] from `routes.ts`, not run. The re-observation 200/502 lines cite `reobserve-action.ts:24,30`; I read
`status: 200` at `:24` and `status: 502` at `:30` [Observed].

## 6. The owner's Q1 record, item by item

| Q1 item (record text) | Verdict |
|---|---|
| "a loop in place of the one-call push at both sites" | **Met** [Observed]: the two loops, +4 -2; the 31 other calls are unchanged (R4, R5) |
| "200,000-line fence tests in LF, CRLF and CR" | **Met** [Observed]: mask 6 (plus 3 unclosed), reader 9, model 3, each `it.each` over three line ends |
| "a long-list test under the per-source read limit" | **Met** [Observed]: 130,000 items (520,272 bytes), extraction and model tests. The model test's `classified` outcome passes through the reader's limit |
| "a mutation per site that restores the old call and must make its test fail" | **Met** at the configured runner [Observed]: MU1/L1 fails 18 tests and MU2/L2 fails 2, each failure a `RangeError`, not a timeout. Not met under `--pool=threads` (N1) |
| "the differential re-run at the pull request's head" | **Met** [Observed]: R6 at the code commit, which equals the head for every package byte |
| "A text that crashes today gets the decision a shorter fence or list would get; nothing new is refused" | **Met** [Observed], section 5 |
| `/polaris`, `/api/poc` 503; re-observation 200 replacing the evaluation | Re-observation [Observed] (R12); 503 [Inferred], fairly labelled |
| "The other 31 argument-spread calls … `syzygy-bpyt.54`" | **Met** [Observed]: untouched |
| Q1 follow-up "Land #544 first" | **Met** [Observed]: the base is #544's merge `8d5d4bab` |
| Review: class 4, the reviewer may add 3 | Classes 4 and 3 (section 2); GP-Q0's differential and rule-6 checks run; the notice is for the lead at landing (N7) |

## 7. Test quality

- **Regression pins** (bar `:58-59`) [Observed]: the BASE row fails 20 of the 23 new tests. The 3 that pass at the base are
  the unclosed guards (N9).
- **Rule 6, read per kill** (R11, default timeouts, no timeout among the failures). L1 and L2 (the old spread) and R4, R7 (a
  chunked spread of 150,000) fail by "RangeError: Maximum call stack size exceeded" in 18, 2, 18 and 2 tests. L3 (drops the
  closer), R1 (skips the opener) and R2 (blanks into a discarded array) fail 25 tests each, 19 of them existing ones and 6 new. R3 (fails
  open, raw lines kept, past 150,000) fails 12, all new tests, for example "AssertionError: expected 'unavailable' to be 'text'" and "expected
  [ { form: 'script-element', …(2) } ] to deeply equal []". R5 (dedupes by statement) fails 6, for example "expected [ Array(1) ]
  to have a length of 130000 but got 1". R6 (caps at 125,000) "expected … to have a length of 130006 but got 125006". R8 (one
  extra item past 100,000) "expected … to have a length of 130006 but got 130007", killed by the extraction test only. L5 and
  L6 (reversed) are killed only by existing tests. Every one of the 14 mutants is killed.
- **Determinism** (bar `:78-79`): the head's loop does not depend on the stack, so the new tests are deterministic at the head
  [Observed: green in R1, R2, R10 control and R11 control at loads 20-31]. They depend on the stack only as regression
  detectors (N1). Durations are in N8.
- **Failure messages** (bar `:82-84`): N4. The remaining assertions name their subject through vitest's diff (kind, outcome,
  length).
- **Net delta** (bar `:93-96`): +23 ~0 -0 over four files, 241 → 264 [Observed R3, R2]. Placement: N5. Growth: N9.

## 8. Cleanup

Deleted: the scratch clone (at the reviewed commit) and its four worktrees (base, code, a build copy of the reviewed commit,
and the local merge), and my TMPDIRs `/tmp/r555-1` to `/tmp/r555-7` (I created all seven). Also deleted: the battery's
per-command JSON and its log; its result line is quoted in R21. One body copy, written to `/tmp/r555-body.txt` for hashing, was deleted
at once. Not kept: the 2.1 MB vitest JSON (its counts and the 23 durations are in `full-suite-summary.json`), the `npm ci`
log, the vitest log and the PR body. No process from my tree is left running. No PR comment, push, merge or workflow
dispatch was made; no bd mutation was run.

Kept under `rev-555/` (sha256 computed after the last write; none over 300 KB):

| File | sha256 |
|---|---|
| `full-suite-summary.json` | `7d1af7a81a4bac4c18b78a1ce79ed9e0c3af0b81f9448f9051d25c113737bdb5` |
| `huge-1968-r1.json` | `9e47fb44e638e18bdc9ad566df7c217e63d5815e796d7b44d19f56f164ca76c1` |
| `huge-default-r1.json` | `9cb8bc70d4cffb7c90210bd1e9ca5ccb2308d7d00ca8e59b5018660eef46227b` |
| `lane-mutants-rerun.json` | `33d61589ad173266f1c9256ea380c104bb17c2fd2e236c1a4fcb320c665970d7` |
| `mask-differential-r1.json` | `13655eb27aa63184c199f83dd2704ecef72dfe4db65ae1570cae815f4c018308` |
| `md-list.bin` | `f2456a6b9c0ade9ccf5ab23363743591d29288ad601829c9742d9907e329d327` |
| `own-differential-default.json` | `0758cdcc572172d1c195178c0e34723cb6795038d79ca9a400129c2ece81ccb1` |
| `own-mutants.json` | `2ad73f774fb8da64567ef0ce1481c3b0c99fcd64edc43618169371697dd970e9` |
| `selftest-r1.json` | `13ef7fb263844782ecf7e32b03391c5501ef01b0ab686d5d15baf18ffa88b706` |
| `sweep-base.json` | `4bbe86dbc875d6caa4cf588171435b9de362bb576409e793089436638ca2bc03` |
| `sweep-head.json` | `a71a6d319a57c71f9219b5a5c70026033de81ff42faef999b66f002ef116c5d5` |
| `tools/battery.py` | `f41fae257e543c630543b211f3edfcb715ced51a4f4a24fb788877fc0c0f43c2` |
| `tools/bytes-check.mjs` | `81d0f03f392ef79cc12166b762432247d1fbc9ee8621d2d7d8b2cdca1b0c6917` |
| `tools/ceiling-probe.test.ts.txt` | `753d2b66b890e003e50a31a4df0a163849831c662cad00ce5d0d090952827bfe` |
| `tools/limit-probe.test.ts.txt` | `688a909d3343427966844d5188b4e679116f1511415ce8407c1e617b10797ac4` |
| `tools/mutants.py` | `1b5ba073abed5443b666a9df7bc0bd0dec3c9afa7db8c084d58d21d49405fb5b` |
| `tools/order-check.mjs` | `66b59450525d5ab05ff153ec5dc7f25e529fc78c52a3013476396307c1c4320b` |
| `tools/own-differential.mjs` | `6a54e8be5f207ab0137b4cbd34793c884747529ab36d832c389446ccacd1f38b` |
| `tools/spread_census.py` | `a379fdcabe640f3348e016bbea4edc56238816b004c476b0e0216b4aa74f3af3` |
| `trace-base-1.json` | `5ea8e51ad5335048dffce47d09de30c216738fdb803aa4d7ab43e749fa1b6dbc` |
| `trace-base-2.json` | `6f7329245c465abd3b63210dc5ee662f12d135557bd01c3b34ebc28b76401451` |
| `trace-head-1.json` | `8f6f2dcbf6c304a9a41328f3730158ad84e5f8aa1c6adc19ef434a66b921277c` |
| `trace-head-2.json` | `bc22cebdb7d75ae1155455b5a07af95505d7f7caba953d898e881a3acdf1aeae` |

`md-list.bin` is the NUL-separated `git ls-files -z '*.md'` of the clone at `241b28ff` (R14 G input). Every other
result file is named by its run in section 3.
