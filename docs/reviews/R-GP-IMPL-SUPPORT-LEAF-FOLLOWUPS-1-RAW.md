# R-GP-IMPL-SUPPORT-LEAF-FOLLOWUPS-1 — CC-REV-1 implementation review of syzygy-bpyt.46, round 1
Verdict: REVISE
Reviewed commit: 2f48eefa
Subject: r1-review.diff sha256 ce0af702af566ededd4598b0534a5dc6b16de32a530163282225191c1f0f4b0a

Reviewer: a fresh-context agent that did not author the change. PR https://github.com/Tzeusy/syzygy/pull/554, branch
`agent/syzygy-bpyt.46`, evidence head `2f48eefa98e1cf91379f0c22ebf73748cbb6184d`, code head `9380d2ef`, base `1a8864d9`.
Every path below named `rev-554/…` is under
`/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-554/`.

Summary: the code does what the bead and the round-2 fix texts ask, and every row the lane wrote kills what it says, in both
dist states. Four things block. Five sentences of the PR body are false at `2f48eefa` (F1). The `/../` row pins only a string
entry, while 14 of the workspace's 18 entries are condition objects (F2). The new root-alias test says the six unaliased entries
load from their built dist, but two of them load nothing under vitest: Vite rewrites them under the bare dossier alias (F3). The
left-out row refuses one form the body does not list, a new alias for one of the six (F4). F1 and F4 need body text only. F2 and
F3 need test bytes, and I give verified replacement text for both.

## 1. Subject identity checks

| Check | Result |
|---|---|
| `git diff 1a8864d9 2f48eefa`, re-derived by script | sha256 `ce0af702af566ededd4598b0534a5dc6b16de32a530163282225191c1f0f4b0a`, **matches** the subject file byte for byte [Observed: `sha256sum` printed the same digest for both] |
| Files in the diff | 14: 7 under `docs/evidence/syzygy-bpyt-46/` and 7 under `packages/` [Observed, `git diff --stat`] |
| Merge base of `1a8864d9` and `2f48eefa` | `1a8864d94f825fb7abff04f61a4588f325e2b098` [Observed] |
| PR head | `gh pr view 554 --json headRefOid` gives `2f48eefa98e1cf91379f0c22ebf73748cbb6184d`; commits `9380d2ef`, `2f48eefa`; state OPEN, MERGEABLE [Observed] |
| PR body, as `gh … --jq .body` writes it | sha256 `ca875374cc5d6262de3a86e0b0b2a9155bbf7de5a23e86a1bac8985857322d53`, **matches** the coordinator's frozen digest [Observed] |
| The lane's `16da1f74…` | is the same bytes without the trailing newline `--jq` adds: `head -c -1` of my file gives `16da1f7494c0c6fbba9d868dbbd5f06404311377ab41c1864a239b6bcc43b8af` [Observed] |
| Hosted checks at `2f48eefa` | `checks	pass	20m53s` and `node	pass	4m42s` (`gh pr checks 554 -R Tzeusy/syzygy`) [Observed] |
| Round-2 raw cited by the bead and body | `docs/reviews/R-GP-IMPL-SUPPORT-LEAF-GUARDS-2-RAW.md` hashes to `43569be3…` at `2f48eefa`, as the bead comment and body say; round 1 `bf317e35…`, as the body says [Observed] |

**Main since `1a8864d9`.** Main moved during this review.
- When I started, `refs/heads/main` was `e4a3a607333614575d0f3c40bcb063dea8fa0177` (PR #552), which changed 13 paths. All of them
  are governance, docs or review files, plus `AGENTS.md` and `scripts/check_docs_review_campaign_partition.py`.
- Before I finalized, it was `8d5d4babc7b20c5fe64238b9e538ae1b04e5254d` (PR #544, `syzygy-bpyt.16`), checked with
  `git ls-remote` immediately before the second merge run [Observed]. PRs #549 and #548 had not landed.
- From `1a8864d9` to `8d5d4bab`, main changed 175 paths, listed in `rev-554/tools/main-changed.txt`.

**Which of them matter here:**
- **PR paths:** none. The intersection with the 14 PR paths is empty [Observed, `comm -12` over both lists].
- **No `package.json`, `vitest.config.ts`, workflow or `@syzygy/support` source** is among them [Observed].
- **Paths a changed test may read:**
  - `packages/three-surface-poc-core/src/markdown-code-context.ts`, the one product module #544 changes. The S10 bundle and the
    reach walks in `island-boundary.test.ts` and `git-observation.test.ts` read it if an entry reaches it [Inferred].
  - `.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-FOLLOWUPS-2026-10-28.md` and `decisions/README.md`. The S10
    fixture run sets `recordsRoot: REAL_ROOT` (`full-run.testkit.ts:74`), so both are inside what that run may read [Inferred].
  - #544's other changed `.ts` files are tests. No changed test here imports them [Observed, the importer sweep in §3].
- On a merge, #544 moves the POC surface version again, since it changes both surface trees. That is #544's move, not this PR's.

**Merge runs.** Dist absent; the 5 changed test files and the 3 other importers of the two testkits.

| Merge | No conflict? | load1 | Result |
|---|---|---|---|
| `646ea6d4` = `2f48eefa` + `e4a3a607`, after `npm ci` | yes | 24.21 → 24.92 | 8 files passed of 8; 156 passed, 0 failed, 1 skipped [Observed] |
| `503980dc` = `2f48eefa` + `8d5d4bab`, after `npm ci` | yes | 24.28 → 25.68 | 8 files passed of 8; 156 passed, 0 failed, 1 skipped [Observed, `merge-changed-tests.json`] |

The skip is
`no provider call and no transmission (S10), without strace is not proved on this host: strace is unavailable, so the capture is skipped, never reported as passed`.
It is the counterpart row, which skips when strace is present; `/usr/bin/strace` is installed [Observed].

## 2. Clauses relied on, and the class ruling

- CC-REV-1, `review-and-documentation.md:18-19`: "Changes touching any of seven classes require review by an independent,
  fresh-context reviewer, and the agent performing the change never finally decides which classes it touches."
- CC-REV-1 class 4, `:37`: "**security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
- CC-REV-1, `:51`: "**A reviewer or the owner** may reclassify at any time."
- GP-Q0 part 1, `OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md:53`: behaviour-preserving means none of these changes:
  "a rendered byte, a wire format, a refusal string or an exit code;"
- GP-Q0, `:62`: "**Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4
  (security), and class-6 pull requests that remove an endpoint." The three checks: the differential, "a rule-6 mutant for each
  predicate", and (`:66`) "a non-blocking owner notice in the cycle report."
- GP-Q0 stop clause, `:95-96`: "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."
- AGENTS.md rule 6: "Mutate the input and confirm the check fails, per predicate, before trusting it". Rule 9: "A claim of absence
  needs a sweep with a denominator."
- The test-rigor bar (`git show 2f48eefa:.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`):
  - `:60-63`, bar 3: "Edge and failure paths are first-class … Happy-path-only coverage of a failure-prone component is a finding."
  - `:66-67`, bar 4: "Expected values are literals or independently derived."
  - `:82-84`, bar 7: "A failure names the defect … A maintainer should localize the bug from failure output alone."
  - `:103-105`, workflow step 2: "apply the mutation thought-experiment: name a one-line bug in the code under test this test
    would *not* catch but should."

**My ruling: class 4 (security), and no other.** [Inferred, from the clauses and the diff]
- Every changed file guards an egress or purity property. The S10 no-egress bundle's alias map is the proof's input. The two
  purity guards keep network, clock, process and loader names out of `@syzygy/support` and the owner-act drafter. So the PR touches
  "egress paths" through their test guards, as #545 did.
- Not class 1: no write-universe, authority table or adapter authorization code changes.
- Not class 3: the POC surface version moves (below), but no walkthrough record binds either version. `git grep` for
  `5dcfb19eb795` and `c5d31514b8d7` at `2f48eefa` returns no line [Observed].
- Not class 6: no endpoint, adapter contract or exported module changes. Non-test dist is byte-identical (§5).

So GP-Q0's three checks apply. The differential is §5, the rule-6 mutants are §3, and the owner notice is the coordinator's.

**The stop clause.** No product gate changes: no product module, no refusal string a user sees, no exit code of a product
command. What changes is what node-ci's `npm test` step refuses. #545's round 1 ruled, and the coordinator's comment on
`syzygy-bpyt.46` restates under the #546 precedent, that "a test guard that refuses more takes an owner notice on
syzygy-bpyt.10, not an owner question". I follow that precedent. It holds only if the notice lists what the guards now refuse
exactly. Today the body's list is not exact (F1, F4), so the notice cannot be written from it yet.

## 3. What I ran, and the results

Clones under `rev-554/`, each with `npm ci` ("added 117 packages"):
- `clone` at `2f48eefa`;
- `base` at `1a8864d9`;
- `gov` at `2f48eefa`, for the Python checks only;
- `merge` at `646ea6d4`, and `merge2` at `503980dc`.

Private TMPDIRs `/tmp/r554-0` to `/tmp/r554-10` and `/tmp/r554-probe`, all deleted. One vitest process at a time. Node v24.6.0,
vite 7.3.6, vitest 3.2.7. `load1` is from `/proc/loadavg`.

| Run | State | load1 | Result |
|---|---|---|---|
| Whole suite, `npx vitest run --reporter=json`, `clone` at `2f48eefa` | every `dist/` absent (0 of 12) | 24.14 → 36.36 | **255 files passed of 255; 5,558 passed, 0 failed, 5 skipped, 5,563 in all**; `success: true` [Observed, `suite-head-absent.json`]. Every one of the 16 added titles is present and passed. No file failed, so no file needed a run alone |
| Lane `mutants.py`, unchanged, on `clone` | absent | 23.77 at the end | `summary {'rows': 33, 'asExpected': 33, 'unexpected': []} status after '' leftovers []` [Observed] |
| Lane `mutants.py`, unchanged, on `clone` | 12 of 12 present, after `npm run build` (exit 0) | 18.71 at the start | `summary {'rows': 33, 'asExpected': 33, 'unexpected': []} status after '' leftovers []` [Observed] |
| Same rows, failing sets compared with the lane's committed records | both | — | the same failing set for every one of 33 rows in each state [Observed] |
| The lane's 33 rows, re-run with each failure message kept (`tools/lane_rows_with_messages.py`, the lane's own edit, run and restore steps) | absent | 17.11–25.06 | 33 of 33 as expected. Every kill is an `AssertionError` or the entry reader's own `Error`; no message names a timeout [Observed, `lane-rows-messages-absent.json`] |
| My mutants, `tools/rev_mutants.py`, 43 rows | absent | 19.32–24.85 | 42 of 43 as predicted. X5 (predicted to survive) was killed, because a default's inner assignment is itself read, so the reader's default arm is redundant (N1) (§4, §7) |
| The same 43 rows | present | 23.34–30.77 | the same exit and failing set as absent for all 43; no timeout [Observed, `tools/compare_states.py`] |
| Base probe, `tools/base_probe.py`, 19 rows on `base` | absent | 24.74–29.11 | which listed refusals were already refused at `1a8864d9` (F1) |
| All my proposed fixes applied together (`tools/fix_all_check.py`) | present | — | `tsc -b packages/support packages/polaris-generation-core` exit 0; the three touched files 111 passed, 0 failed; clone clean after [Observed, `fix-all-check.json`] |
| `npm run build`, `npm run typecheck` on `clone` | — | 22.11, 19.43 | both exit 0 [Observed] |
| `python3 scripts/check_governance.py` on `gov` | — | — | `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`, exit 0 [Observed] |
| `python3 scripts/check_quotations.py` on `gov` | — | — | exit 0 [Observed] |
| Canonical battery, `tools/battery.py` (rev-535's, copied from `docs/evidence/host-pins-review-2026-10-27/tools/`) on `gov` | — | — | `commit=2f48eefa98e1cf91379f0c22ebf73748cbb6184d commands=114 nonzero=0 cleanAfter=True` [Observed, `battery-head.json`], matching the body's line 114 |
| Node 24 package-target probe (`tools/node_targets.py`) | — | — | `./dist/x/../index.js` and `./dist/./index.js` give `ERR_INVALID_PACKAGE_TARGET`; `./dist//index.js` loads with DEP0166; a `types` condition `./dist/x/../index.d.ts` beside plain `import`/`default` loads [Observed, `node-targets.json`] |
| Vitest resolution probe (`tools/alias-shadow-probe.test.ts.txt`, copied in, run, deleted) | present | — | F3 [Observed] |

**The round-2 fix texts, byte for byte** (`tools/fix_bytes.py`, `fix-bytes.json`). Each of the five texts from
`docs/evidence/support-leaf-guards-review-2026-10-28/r2/tools/` occurs exactly once in `support-purity.test.ts` at `2f48eefa`,
whole, with its trailing newline. Each text's sha256 equals the round-2 raw's kept-files table (`:521-527`) [Observed]:

| Fix text | sha256 | Occurrences in the head file |
|---|---|---|
| `fix-r2-module-reader.ts.txt` | `547e3481…` | 1 |
| `fix-r2-writes-reader.ts.txt` | `ca2d30a8…` | 1 |
| `fix-r2-writes-row.ts.txt` | `af407589…` | 1 |
| `fix-r2-reader-rows.ts.txt` | `3e95d402…` | 1 |
| `fix-r2-import-call-row.ts.txt` | `a3bedd26…` | 1 |

No U+00A0 in any of them or in the head file.

**Other checks:**
- The identifier reader moved unchanged. The base function in `support-purity.test.ts` equals the head function in
  `purity.testkit.ts` once the `export ` prefix is removed [Observed, by script].
- `DRAFTER_IDENTIFIERS` holds 63 distinct names. The drafter's code names exactly those 63: 0 used and not listed, 0 listed and
  not used [Observed, `drafter-names.json`].
- Importers of the two testkits, swept over every tracked code or config file outside `docs/` at `2f48eefa` (denominator: 7,367
  tracked files). 2 import `purity.testkit` and 6 import `workspace-reach.testkit`, 8 in all, and every one is a `*.test.ts` file
  [Observed, `importers.json`].
- POC surface version, by `pwbSurfaceVersion`'s rule: `1a8864d9` gives `polaris@5dcfb19eb795`; `9380d2ef` and `2f48eefa` give
  `polaris@c5d31514b8d7`. Only the core tree id moves, `17dd5f22…` → `0e8887fd…`. The lane's figures are confirmed [Observed,
  `tools/surface_version.py`].

## 4. Findings

### F1 — blocking (PR body). Five sentences are false at `2f48eefa`

- **Severity:** low in effect. They are blocking under the verdict rule ("a false sentence in the PR body"), and because the owner
  notice will be written from the refusal list.
- **Evidence and exact replacements** (line numbers are the body as `gh` returns it):
  - **(a) Line 3, the file count.** "8 test or test-support files plus `docs/evidence/syzygy-bpyt-46/`". The diff has 7 files
    outside `docs/evidence/syzygy-bpyt-46/` [Observed, §1]. Replace "8 test or test-support files" with "7 test or test-support
    files". The next line, "All 8 importers of the two testkits", is true and stays.
  - **(b) Line 48, refusal 3, "defaults".** At `1a8864d9`, `[Object.freeze = (value) => value] = [];` in `sha256.ts` already
    failed the no-write row (base probe `B-default-write`: exit 1, the no-write row alone). The default is itself a
    `BinaryExpression` whose left side is a property access, and the base visitor walks into it. Parentheses (`B-paren-write`),
    spreads (`B-spread-write`), U4, U5 and a nested pattern (`B-nested-write`) each passed at base [Observed]. Replace the
    sentence with:

    > `3. The no-write row now reads destructuring targets: `[Object.freeze] = […]` (U4), `({ value: Object.freeze } = …)` (U5), and property targets inside parentheses, spreads and nested patterns. A property target with a default (`[Object.freeze = f] = []`) was already refused at `1a8864d9`, because the default is itself a property assignment.`

  - **(c) Lines 56-57, refusal 5 and its example E4.** E4 edits only the `import` condition of
    `@syzygy/polaris-dossier/state-directory`, so the entry's conditions disagree. `targetOf` reads that entry as naming no
    target, and the unreadable-entry throw refuses it whether or not the `/../` check exists:
    - at `1a8864d9`, E4 fails `no-egress.test.ts` before any row, with
      `@syzygy/polaris-dossier/state-directory: its entry is not a ./dist/X.js whose src/X.ts exists` (`B-E4-the-lane-dotdot-entry`);
    - at head with the `/../` check dropped (E1 plus E4, my `X2d`), both root-alias rows still fail, with that same message.

    The form that is newly refused is a `/../` entry whose conditions all agree. It passed at base (`B-uniform-dotdot-entry`: exit
    0, 6 passed) and fails both root-alias rows at head (`X2c`) [Observed]. Replace line 56 with:

    > `5. A workspace package whose `exports` or `main` target contains `/../` now throws, in any condition, `types` included. Before, an entry whose conditions all name `./dist/x/../state-directory.js` was joined to `src/state-directory.ts` and accepted; both root-alias rows and the whole S10 file now fail on it. E4, below, changes the `import` condition alone, so its conditions disagree and the unreadable-entry throw refused it at `1a8864d9` too: it shows the new message, not a new refusal.`

    In line 57, after "with the message `…, which Node refuses`", add: " (at `1a8864d9` the same edit failed it too, with `…: its entry is not a ./dist/X.js whose src/X.ts exists`)".
  - **(d) Line 63, refusal 7.** "That covers a new export added without a root alias". At `1a8864d9`, A4's edit (a `./cli` export,
    no alias) fails the S10 row "aliases every workspace package entry to the src module its exports, or its main, names" with
    `AssertionError: expected { …(19) } to deeply equal { …(18) }` (`B-A4-new-export-without-alias`) [Observed]. That row pins
    every entry literally, so a new export was refused before this PR, with or without an alias. Replace refusal 7 with the text
    in F4.
  - **(e) Line 27, "the six entries the config leaves to their built dist".** Two of the six load nothing under vitest (F3).
    Replace "and lists the six entries the config leaves to their built dist:" with:

    > `and lists the six entries the config leaves unaliased. Four load from their package's built dist through node_modules; the two dossier subpaths load nothing under vitest, because Vite rewrites them under the bare `@syzygy/polaris-dossier` alias (review R-GP-IMPL-SUPPORT-LEAF-FOLLOWUPS-1 F3):`

- **Failure scenario:** the coordinator writes the owner notice from the body. It then tells the owner that defaults, a new export
  and E4 are new refusals, which they are not, and omits F4's refusal, which is one.

### F2 — blocking (code, low). The `/../` row pins only a string entry, and 14 of the 18 real entries are condition objects

- **Severity:** low today: no target in the workspace has a `/../` segment. It is blocking for the same reason as round 2's F2: a
  new row survives a one-line narrowing of what its title claims, without deliberate evasion.
- **Evidence:**
  - The row "throws on a /../ segment that the resolver would join away, since Node refuses the entry"
    (`workspace-reach.test.ts:150-154`) uses `workspace({}, './dist/x/../index.js')`. That is a plain string entry.
  - The check is `JSON.stringify(entry).includes('/../')` (`workspace-reach.testkit.ts:130`). **X2** narrows it to
    `typeof entry === 'string' && entry.includes('/../')`. X2 passes `workspace-reach.test.ts` and `root-vitest-aliases.test.ts`,
    59 of 59 in both dist states [Observed].
  - **Reach:** X2 plus a real entry whose conditions all name `./dist/x/../state-directory.js` (**X2b**) passes both root-alias
    rows [Observed]. The workspace's 12 manifests name 18 entries: 14 are condition objects, 3 are strings and 1 is a `main`
    [Observed, by script]. So under X2 the check reads none of the 14 entries that are objects.
  - E1 (the check dropped) is killed, but only by the fixture row. With E1, a uniform real `/../` entry passes the whole of
    `root-vitest-aliases.test.ts` (**X2e**) [Observed].
- **Failure scenario:** someone tidies the check to "the target string". The fixture row stays green, and a uniform `/../` entry
  added to any package is aliased to the module it joins to. Node refuses that entry with `ERR_INVALID_PACKAGE_TARGET`
  (`node-targets.json`), so the S10 bundle and the root aliases name a module Node never loads.
- **Exact fix (verified):** in `packages/polaris-generation-core/src/workspace-reach.test.ts`, insert after line 153 the content of
  `rev-554/tools/fix-f2-object-entry-row.ts.txt`:

  ```ts
      expect(() => entryModulesIn(workspace({}, { types: './dist/index.d.ts', import: './dist/x/../index.js', default: './dist/x/../index.js' })))
        .toThrow('@syzygy/lib: its entry has a /../ segment, which Node refuses');
  ```

  - Unmutated with it, 57 of 57 pass (`X2g`).
  - X2 with it (`X2f`) and E1 with it (`X2h`) are each killed by the `/../` row alone, with
    `AssertionError: expected [Function] to throw an error`.
  - `tsc -b` exits 0 with every fix applied (`fix-all-check.json`).
  - The title count does not change.

### F3 — blocking (test text and PR body). The root-alias oracle models the map, not Vite's matching: two of the six "left to their built dist" load nothing

- **Severity:** medium for item 3's purpose. Item 3 exists because a test runs the module the alias map gives it, not necessarily
  the one Node loads. The oracle checks each key's target, but it does not check what a specifier actually matches.
- **Evidence:**
  - Vite 7.3.6's alias match (`node_modules/vite/dist/node/chunks/config.js:27025-27030`) is `importee === pattern` or
    `importee.startsWith(withTrailingSlash(pattern))`. The first alias in the config's order that matches is applied.
  - `vitest.config.ts:13` aliases the bare `@syzygy/polaris-dossier` to `packages/polaris-dossier/src/index.ts`, and the config
    has no `/argv` or `/state-directory` alias. So `@syzygy/polaris-dossier/argv` is rewritten to `…/src/index.ts/argv`.
  - **Probe, dist present** (a temporary test file under `packages/polaris-generation-core/src/`, deleted after):
    - in vitest, both dossier subpaths fail:
      `error: Cannot find module '@syzygy/polaris-dossier/argv' imported from '…/zz-alias-shadow-probe.test.ts'.`, and the same
      for `/state-directory`;
    - `@syzygy/polaris-generation-core/live`, which has its own alias ahead of the bare one, loads;
    - plain Node, from `packages/polaris-generation-core`, loads `@syzygy/polaris-dossier/argv` (`node loads isArgvFault,readArgv`);
    - with only the bare dossier alias removed from the config, vitest loads both subpaths from dist
      (`loaded: isArgvFault,readArgv` and `loaded: REVIEW_PACKET_DIR,…`). The config was restored and the clone left clean
      [Observed].
  - So the test's comment (`root-vitest-aliases.test.ts:8-9`: "the entries the map leaves out, which a test then loads from the
    package's built dist through node_modules"), its title (`:19`: "leave exactly these entries to their built dist") and body
    line 27 are each false for 2 of the 6.
  - The oracle also cannot see the order its correctness depends on. **X13** swaps `@syzygy/polaris-generation-core/live` behind
    the bare `@syzygy/polaris-generation-core`, which makes the bare alias shadow `/live`. Both root-alias rows still pass [Observed].
  - No test imports either dossier subpath by specifier today. `git grep` of the two quoted specifiers in `*.ts` at `2f48eefa`
    finds `apps/syzygy/src/main.ts`, which imports both (`:40-41`) but which suite tests read only as text, and four test files
    that use them as data strings [Observed]. So nothing fails today [Inferred from the green suite].
- **Failure scenario:** a test imports `@syzygy/polaris-dossier/argv`, or a module that does, and fails with "Cannot find module".
  The oracle meant to explain the aliases calls that entry "left to its built dist". Or the config is reordered, `/live` tests
  load the barrel's path plus `/live`, and the alias rows stay green.
- **Exact fix (verified, preferred):** replace `packages/polaris-generation-core/src/root-vitest-aliases.test.ts` with the content
  of `rev-554/tools/fix-f3-root-vitest-aliases.test.ts.txt` (sha256 `a10cf20a…`, in the kept-files table). It:
  - corrects the comment;
  - retitles the second row "leave exactly these entries unaliased";
  - adds `aliasFor`, Vite's first-match rule;
  - adds two rows: "match each aliased specifier by its own alias first, so no shorter alias ahead of it shadows it", and
    "shadow exactly the two dossier subpaths, which the bare dossier alias rewrites to no module".

  Verified (each in both dist states):
  - `FX3-0`, unmutated, passes 4 of 4.
  - `FX3-reorder` (X13 plus the fix) is killed by the own-alias-first row alone.
  - `FX3-unshadow` (the bare dossier alias removed) is killed by the unaliased row and the shadow row.
  - `FX3-A3` (A3's support alias removed) is killed by the unaliased row.
  - `tsc -b` exits 0.

  In the same commit, change `mutants.py`'s `LEFT_ROW` constant to the new title, and re-run its records. The two new rows refuse
  more: add them to the body's refusal list as 8 and 9:

  > `8. An aliased specifier that a shorter alias ahead of it in the config matches first fails, so the config's order is pinned.`
  > `9. The unaliased entries some shorter alias rewrites must be exactly the two dossier subpaths.`

- **Minimal alternative, if the coordinator wants no new rows:** keep the two rows. Replace line 9 of the test with
  `// out are a literal list. Vite applies the first alias equal to a specifier or a prefix of it followed by `/`, so the two dossier`,
  then `// subpaths are rewritten under the bare dossier alias's src entry, where no module is; the other four load from their built dist.`.
  Retitle the second row `'leave exactly these entries unaliased'`, and apply F1(e). That makes no claim false, but it leaves X13
  surviving.
- **Not in this PR:** aliasing the two subpaths ahead of the bare alias in `vitest.config.ts` is a config byte. It belongs to a
  follow-up bead, and the shadow row then shrinks to `[]` in the same change.

### F4 — blocking (PR body). The left-out row refuses a form the body does not list: a new alias for one of the six

- **Severity:** low. It is blocking under the verdict rule ("a refusal the body does not list").
- **Evidence:**
  - At head, **X15** adds a correct alias,
    `'@syzygy/polaris-dossier/argv': fileURLToPath(new URL('./packages/polaris-dossier/src/argv.ts', import.meta.url))`, ahead of
    the bare dossier alias. The alias row passes. "leave exactly these entries to their built dist" fails with
    `AssertionError: expected [ '@syzygy/app', …(4) ] to deeply equal [ '@syzygy/app', …(5) ]` [Observed].
  - At `1a8864d9`, the same edit passes all four guards that read the config's aliases or the workspace entries: 91 tests passed,
    0 failed (`B-correct-alias-for-a-left-out-entry`). The four are `sync-child-process-guard.test.ts`,
    `subpath-imports.test.ts`, `workspace-reach.test.ts` and `island-boundary.test.ts` [Observed]. That the rest of the suite
    accepts it is [Inferred]: it would make that subpath loadable, which F3 shows it is not today.
  - The body's refusal 7 names only "a new export added without a root alias, and an existing alias removed".
- **Failure scenario:** the F3 follow-up, or anyone who fixes the shadowing, finds a red row the owner was never told about. A
  later reader then treats it as an unintended refusal.
- **Exact fix (body only):** replace refusal 7 (line 63) with:

  > `7. The package entries the config does not alias must be exactly the six listed. So an existing alias removed fails (A3), and so does a new alias for one of the six, even one that names the right module, until the list shrinks in the same change (review R-GP-IMPL-SUPPORT-LEAF-FOLLOWUPS-1 F4). A new export added without a root alias fails here too (A4), but the S10 alias-map row already refused any new export at `1a8864d9`.`

### N1 — note. The new `import()` row and three arms of the write reader have no reader row, so a one-line narrowing of either is invisible (round 2's N2, one level down)

- **Severity:** low (workflow step 2, `SKILL.md:103-105`). The texts are the round-2 reviewer's own, applied byte for byte, so the
  lane did what was asked. The gap is in the round-2 fix itself.
- **Evidence** (each passes `support-purity.test.ts` 43 of 43, in both dist states [Observed]):
  - **X8**, the `import()` row's visitor without its `ts.forEachChild` recursion, plus V9: the row reads only the `SourceFile` node,
    so it can never fail, and V9 passes.
  - **X7**, the `import()` row reading only a string-literal argument, plus R2: R2, which refusal 2 lists, passes.
  - **X4**, `propertyWritesOf` without its object-pattern arm, plus U5: U5, which refusal 3 lists, passes.
  - **X6**, without its parenthesis arm, plus `(Object.freeze) = (value) => value;`: passes.
  - **X12**, without its spread arm, plus `[...Object.freeze] = [];`: passes.
  - Controls, at head unmutated, are each killed by the no-write row alone: the nested pattern `({ value: [Object.freeze] } = …)`
    (`X4c`), the parenthesized write (`X6c`) and the spread write (`X11`) [Observed].
  - The default arm is redundant: X5 drops it and the default write is still killed, because the inner assignment is itself read.
- **Proposed fix (verified, `fix-all-check.json`):**
  - Insert `rev-554/tools/fix-n-write-rows.ts.txt` before the `'let a = 1; …'` case (`support-purity.test.ts:191`): three cases,
    an object pattern, parentheses and a spread.
  - Insert `rev-554/tools/fix-n-import-reader.ts.txt`, an `importCallsOf` reader, after `propertyWritesOf` (after `:61`).
  - Replace the `import()` row (`:103-114`) with `rev-554/tools/fix-n-import-row.ts.txt`. Its title is unchanged, so `IMPORT_ROW`
    still matches.
  - Append `rev-554/tools/fix-n-import-reader-rows.ts.txt` after the property-write describe: four cases, the last a negative,
    `import.meta.url`.

  With them, FX0 passes 50 of 50:
  - FX-X4, FX-X6 and FX-X12 are each killed by their own new write-reader row alone;
  - FX-X7 is killed by the computed-specifier reader row alone;
  - FX-X8 is killed by the three positive `import()` reader rows;
  - V9 and U5 are still killed by their guard rows alone.

  That is +7 tests. I recommend taking it in the same revision, since F2 and F3 reopen this file's neighbours anyway.

### N2 — note. The E4 rule-6 row does not exercise item 5's predicate

- **Evidence:** rule 6 asks for a mutant "per predicate". E4 is attributed to item 5 in the body ("E4, a real `/../` entry"). But
  with the `/../` check dropped, E4 is still killed by the unreadable-entry throw (`X2d`). With the check dropped, a uniform
  `/../` entry is not killed at all (`X2e`). So E1, through the fixture row, is the only pin on the predicate, and E4 pins the
  older throw [Observed].
- **Proposed fix:** in `mutants.py`, change E4's edit to name `./dist/x/../state-directory.js` in both the `import` and the
  `default` conditions (my `E4_UNIFORM`). The expected failing set is unchanged: `X2c` fails exactly the two root-alias rows. Add
  a row E1+E4u expected to pass, which records X2e as the disclosed limit F2's row closes.

### N3 — note. Node refuses more than `/../`, and the check refuses one `/../` Node accepts

- **Evidence** (`node-targets.json`; `X10`):
  - Node 24 refuses `./dist/./index.js` with `ERR_INVALID_PACKAGE_TARGET`, but `entryModulesIn` reads it as
    `packages/lib/src/index.ts` and does not throw. The class item 5 names, a target Node refuses and `moduleIn` joins away, is
    wider than the `/../` substring. Node's own rule covers `.`, `..` and `node_modules` segments.
  - A `types` condition of `./dist/x/../index.d.ts` beside plain `import` and `default` targets loads in Node, since Node never
    reads `types`. `entryModulesIn` throws on it with "…which Node refuses", which is false for that entry.
  - Neither form occurs today: 0 of the 47 target strings in the 12 manifests has a `.`, `..`, empty or `node_modules` segment
    after `./` [Observed, by script].
- **Proposed fix:** add both to the body's residuals, or test each target with Node's invalid-segment rule in place of the
  substring. The second is a refusal change, so it goes in the owner notice. Not blocking: the bead scoped item 5 to `/../`.

### N4 — information. The guards' own comparisons are unpinned, with measured reach

- **X1**, the drafter row comparing names case-insensitively, passes. Its only reach is a global that differs from a listed name
  in case alone. Of the globals Node 24 exposes, only `Map` does (it matches `map`). **X1d**, X1 plus `void new Map();`, passes,
  and at head the same edit is killed by the drafter row (`X1e`) [Observed]. `Map` is harmless.
- **X3**, the alias row comparing basenames, plus an alias moved to `packages/cap1-core/src/index.ts`, passes. Without X3 the
  same edit is killed by the alias row alone (`X3c`) [Observed].
- Neither needs a row unless the coordinator wants rows over the guards' own comparisons. Neither file has them for its other
  rows.

### N5 — note. Item 4 can follow now

- The body (line 99) defers item 4 "once #552 is on main". #552 is on main as `e4a3a607` [Observed]. The sentence was true when it
  was written. A follow-up bead can take item 4, naming `@syzygy/support`'s purity guard in the AGENTS.md `packages/support`
  bullet.

### N6 — information. The testkit now emits a test-only dist module that imports `typescript`

- `purity.testkit.ts` imports `typescript`, so `packages/support/dist/purity.testkit.js` imports it too.
- The package exports only `"."` (`./dist/index.js`), pinned by its own row, and that module reaches no testkit. `tsc -b` exits 0.
- The package declares no dependency, and `typescript` resolves from the root `node_modules`, as it already did for
  `support-purity.test.js` [Observed: dist comparison, §5].

## 5. Every changed output

- **Non-test dist.** Built with `npm run build` at `1a8864d9` and at `2f48eefa`, every file under the 12 `dist/` trees hashed.
  1,004 of 1,004 non-test files are byte-identical: 0 added, 0 removed, 0 changed [Observed, `dist-compare.json`].
- **Test dist.** 4 files added, `root-vitest-aliases.test.{js,d.ts}` and their maps. 21 changed: the five test or testkit modules'
  `.js`, `.d.ts` and maps, and five `.tsbuildinfo` files, among them `apps/three-surface-poc/dist/.tsbuildinfo`, which records
  referenced projects' outputs [Observed].
- **The S10 bundle's inputs.** The alias-map row's literal is unchanged by the diff, and it passes at head in both states, so the
  derived alias map equals the base map [Observed]. The same aliases and entry point give the same bundle [Inferred; not rebuilt
  byte for byte].
- **POC surface version.** `polaris@5dcfb19eb795` → `polaris@c5d31514b8d7`, as the lane says. It is bound by no record at
  `2f48eefa` [Observed, §1-§3].
- **No product byte.** No file outside `packages/*/src/*.test.ts`, the two testkits and `docs/evidence/syzygy-bpyt-46/` changes.
  `vitest.config.ts`, every `package.json` and every workflow are unchanged [Observed, the diff's 14 paths].
- **What `npm test` refuses.** It changes: §6 and F1, F4.

## 6. Verdict on each item and deviation

| Item | Verdict | Basis |
|---|---|---|
| 1, the drafter's identifier allowlist | **met** | D2 and D5, which survived at #545 and pass at base (`B-D2`, `B-D5`), each fail the new row alone. DA1 and K3 pin the list and the shared reader. The list equals the drafter's names exactly (63/63). The "is pure" title was kept rather than retitled, which the bead allows ("or retitle it"), now that the allowlist backs it |
| 3, the root aliases checked against the entries | **met as worded, with F3** | The bead allows "or pin them by an oracle row", and the PR pins them. A1-A4 are each killed as stated. The oracle's model of the left-out entries is wrong for 2 of 6, and the config's order is unpinned (F3) |
| 5, `/../` throws in the entry reader, not in `moduleIn` | **met as worded, with F2** | The check sits in `entryModulesIn`, which `workspaceAliases` now calls, and `moduleIn` is untouched. The positive control shows the resolver alone joins the entry away. Its row pins only a string entry (F2); the class is wider than the substring (N3) |
| Round 2's N2, reader rows and `propertyWritesOf` | **met** | Byte for byte (§3). FN-Q1 is killed by exactly the two module-reader rows the reviewer named, and FN-Q2 by the one write-reader row. The reader rows do not reach every arm (N1) |
| Round 2's N3, destructuring writes | **met** | FN-U4 and FN-U5 are each killed by the no-write row alone. Parentheses and spreads too (X6c, X11) |
| Round 2's N4, `import()` row and `ImportEqualsDeclaration` | **met** | FN-V7 is killed by the createHash row alone. FN-V9, FN-Y5b, FN-Y5c and R2 are killed by the `import()` row alone. X9 shows the `ImportEquals` arm is pinned by its reader row |
| Item 2, deferred to `syzygy-bpyt.58` | **lawful deviation** | `bd show syzygy-bpyt.58`: "Precondition test: every workspace @syzygy/-named, every dependency spec a registry version (GP-B2 Q4 A)", OPEN [Observed]. Z7 still passes, as disclosed |
| Item 4, skipped | **lawful deviation**, now unblocked | N5 |

**The disclosed residuals:**

| Residual | True as stated? | Blocking? |
|---|---|---|
| R1 and Y3 | **true**: both pass 43 of 43 in both states (lane rows) | no; disclosed since 6.14 |
| Z7 | **true**: passes, 6 of 6 | no; `syzygy-bpyt.58` |
| V8 | **true**: V8, from the round-2 record, passes 43 of 43 (`X17`) | no; it exposes only the hash constructor (round 2's N1) |
| The drafter has no property-write row | **true**: `void ((input: DraftInput) => { input.claims.length = 0; });` uses only listed names and passes 4 of 4 (`X16`) | no; the body claims no write row for the drafter |
| The subset check | **true** by construction: the row filters used names against the list. Today the two sets are equal | no |
| The substring `/../` test misses a trailing `/..` | **true**: `./dist/..` throws the unreadable-entry message (`X18`) | no. Its neighbours `/./` and `types` are N3 |
| Item 4 | **true** | no; N5 |

None of them is a gap in what the change claims to refuse. F2's gap, an object entry, is not a disclosed residual.

**The seven listed refusals, held against my runs:**

| Refusal | Holds at head? | New against `1a8864d9`? |
|---|---|---|
| 1, V7 | yes (FN-V7) | yes (`B-V7` passes) |
| 2, V9, Y5b, Y5c and R2 | yes | yes (all four pass at base) |
| 3 | yes for U4, U5, parentheses and spreads | not "defaults" (F1(b)) |
| 4, D2, D5 and any unlisted name | yes | yes (`B-D2`, `B-D5`, `B-Map` pass at base) |
| 5 | yes for a uniform `/../` | E4 is not new (F1(c)) |
| 6 | yes (A1, A2) | yes for a target other tests still accept [Inferred: at base only `sync-child-process-guard.test.ts` reads the alias targets, and it follows them to scan for synchronous calls rather than comparing them] |
| 7 | yes (A3, A4) | A4's form is not new (F1(d)) |

The one refusal not listed is F4 (X15). Today's sources pass every row: the suite is green at head and on the merge. No listed
refusal refuses a form today's sources use.

## 7. Test quality

- **Failure messages (bar 7).** Every new assertion names what failed. The source rows print `<file>: <text>`; the drafter row
  prints the names outside its list (`expected [ 'HOME', 'globalThis' ] to deeply equal []`); the entry reader's throws name the
  specifier and the reason. The alias rows' first line is a collapsed diff (`expected { …(12) } to deeply equal { …(12) }`), with
  the full diff below it. E1's and E2's first line is `expected [Function] to throw an error`, which the row title localizes.
  Observed in `lane-rows-messages-absent.json`.
- **Expected values (bar 4).**
  - The drafter's list and the left-out list are literals.
  - The alias row's expectation comes from `entryModules`, which reads the manifests, so it is derived independently of
    `vitest.config.ts`.
  - The reader rows are literals.
- **Edge paths (bar 3, workflow step 2).**
  - For the readers: N1.
  - For the `/../` check: F2.
  - For the alias oracle: F3 shows the one-line bug it misses, where a test loads nothing although the map is right.
- **Determinism.** No row depends on time or order, except that the alias oracle depends on the config's key order, which F3
  pins. No retry or sleep was added.
- **Rule 6 records.** Each of the lane's rows stores its edits, its commit and its expected failing set, written before the run. My
  re-runs match the committed records row for row. The one attribution gap is N2.
- **Net test delta:** +16 titles; one changed body, the no-write row. F2 adds 0 titles, F3 +2 and N1 +7.

## 8. Cleanup

The clones `rev-554/clone`, `base`, `gov`, `merge` and `merge2`, and the TMPDIRs `/tmp/r554-0` to `/tmp/r554-10` and `/tmp/r554-probe`,
are deleted. Not kept: the PR body copy, the re-derived diff (it equals the subject), the 2.1 MB suite report (its summary and
digest are in `suite-head-absent.json`), governance, quotations, build, typecheck and `npm ci` logs, and `tools/__pycache__`.
Each kept file is under 300 KB.

47 kept files:

| Kept file | sha256 |
|---|---|
| `tools/alias-shadow-probe.test.ts.txt` | `bd7f18d7c288c6a1aef99f323a945a518aa22fde806881e4b2b97b72edae07ba` |
| `tools/base_probe.py` | `b4898a25a898a9fa37f553e7874bb735254260366c39be516989c0c69f7f6008` |
| `tools/battery.py` | `4a30a3b6fbe065a125da5f7b7bfe2500242da6996d70541f5fe83d9786c0ac14` |
| `tools/compare_states.py` | `731fc3cdb52ad2f3d07e260ab133439ef42badf04003539f00e924f4cf9e043d` |
| `tools/dist_compare.py` | `fa1df0e6cf2b036b912b872f49bc931a68ec54007285f44724537516bfeb1a35` |
| `tools/dist_hashes.py` | `f1fea0b710b760dddf42ad132d4f241f89c8bb7e7c063aca7d4f36c067da5522` |
| `tools/drafter_names.mjs` | `90e185cd4d585736aa61614bc7e312f4e78da351341d71c1c873e82973691f57` |
| `tools/fix-f2-object-entry-row.ts.txt` | `5a70742a7b189bf04621aad6bc0a556a80407d9dd9495889bd5e4a5ff1d9c6cc` |
| `tools/fix-f3-root-vitest-aliases.test.ts.txt` | `a10cf20a9f37dda22b1d150a273cb1c190b4fd2bce0eb65084eadfbe12e179c9` |
| `tools/fix-n-import-reader-rows.ts.txt` | `3b755d6956134ae8882ade6c4679e82002b29cdd74b402fff5685256edb5364b` |
| `tools/fix-n-import-reader.ts.txt` | `9affefce2736f093546487349ea641f7507a62eb9481693a7f31aa0cd5734d44` |
| `tools/fix-n-import-row.ts.txt` | `bec4d557f5d355c0339b8586fd9bb4b22c5c0aede5491a0c1e9b5fb4c4331f70` |
| `tools/fix-n-write-rows.ts.txt` | `2238a3eefdd47ad4e73b2f1e4a45b8f85fd247207b653deb34de3ded59cf763f` |
| `tools/fix_all_check.py` | `afa0f97c0c818c0dc9a3112487bedb5d34b60fc4bb507c0e85a0eaa967aca750` |
| `tools/fix_bytes.py` | `e7a9887be94935877780e85317159f04e63ced419901d73c28cde0105f152347` |
| `tools/importers.py` | `46bddf9ddcb25e9019113cf2206af917b7d81df3ac0fa2ab25ad0991e0152037` |
| `tools/kill_messages.py` | `9a2c6bb8f20b14d8553ca71d8eb97acb189a8718b0fc6f201483967e097af168` |
| `tools/lane_rows_with_messages.py` | `6ee91a79581ffc9e22e6b47067e4550d3fcd408ae85b70ef6c8ab2a6aa03f0f5` |
| `tools/main-changed.txt` | `29f9bad2da8a372b401568a52bf03555fc51e1de0a923aa6e5deff8577744978` |
| `tools/node_targets.py` | `3af01e3f29c81bfe4670179469124221e938e52d2ae54a92de4cf0e6b755cdb5` |
| `tools/pr-paths.txt` | `4f15a6de515775965948cad37749d46bf4319ea138ef2a8e0119792afc6f7a9a` |
| `tools/reader_probe.mjs` | `697ee97f472f0be6b3dadb505924abd81f1e2d06a00ca0a4c128d39467cac240` |
| `tools/rev_mutants.py` | `e9b32d453097dabbc3c1f6903fac3f180ea878d94d0b4f59dcce463d01c7379b` |
| `tools/suite_summary.py` | `019f5f87a72a31fae9125522e44203fafa7eab7b49e3a9d49e90576eb347a6f0` |
| `tools/surface_version.py` | `1cc725849186a099981b558c6f2d8276bdb578bb7f66aa2fc43d4445efc6eba9` |
| `base-probe.json` | `9437c61620e86e3cd3815b7bea2af293e3799e0971b9f1e4b696c853ff7c868b` |
| `base-probe.log` | `982bdc4765102d93e62b085b9c5e79dd613c6496d05cdf8d27768bfa6d0d5f42` |
| `battery-head.json` | `8d1932e090dc62cd5b996219bb2a8fa2ac9b73b8bd1bff7d86614c430316e52c` |
| `battery-head.log` | `624fa0256a9f27b0c4673a1780d04d52d26fb36b4568ddf2d4439a1f5c1dc48c` |
| `dist-compare.json` | `572abbcaedf46963dac2abbbc2311eed0bb61b08964e7b232520b929d95457f5` |
| `drafter-names.json` | `94acd9820c49d6f2126ea6e6552d0553fb7e66703118d8cf1f2ef0e37a14ad1e` |
| `fix-all-check.json` | `36e47707b044e5648a6167e98f3dcffcc0b70254c152f8f2cf2b2bcc9280e657` |
| `fix-bytes.json` | `42d05afaf65d8dae1b2798f96289a5b9722400bc4ff08bed99fab4bc81406eba` |
| `importers.json` | `7f6e79b3ce092610fe3dc79181abf3158fc3222b4778e2a740f1018a977d26b7` |
| `lane-mutants-absent.json` | `e9dcdde7d1e30221252c7a4b7f8c77b38dc5a03b62cf9f8d48684eb092c68044` |
| `lane-mutants-absent.log` | `b0ed754eb789a24d31ef1cafd742605b1186047e0a995c7e1f104b8c0e1c7570` |
| `lane-mutants-present.json` | `f99cd956e32a4c4539980404dac17626b1c618d8d24761fb763f58dccf9ebc22` |
| `lane-mutants-present.log` | `b0ed754eb789a24d31ef1cafd742605b1186047e0a995c7e1f104b8c0e1c7570` |
| `lane-rows-messages-absent.json` | `f51ec0334115f2d41e4d90a13ffe9c203f3da5dabd821ac8812ffbb7f48e4647` |
| `lane-rows-messages-absent.log` | `f785923230f64bd2993400a62e2f562c5e76317958d0d81afe89c7c7b004bf84` |
| `merge-changed-tests.json` | `836466c1821ca83d8b39378156ab3a3cf33480a13df6a003944820e37d24ecc9` |
| `node-targets.json` | `f7fdb2f12c30d77123a8aaa18bae0c8ee6dcad2bd03a4865cf75625ff294fb8d` |
| `rev-mutants-head-absent.json` | `25b721a6dd9328f59ab08369885f828eac33a0e5051e73f6569ffe4b9b5d1db2` |
| `rev-mutants-head-absent.log` | `be77d85f707386b1509112e7f6c54715ff89e9c7527744e22af01a6ae738baa8` |
| `rev-mutants-head-present.json` | `d9ac303c2da9b18961b4bab2c08dc08e1dd7d8b7c3ef61a54d78ac1b231a99c0` |
| `rev-mutants-head-present.log` | `be77d85f707386b1509112e7f6c54715ff89e9c7527744e22af01a6ae738baa8` |
| `suite-head-absent.json` | `5248492e564200bdc58b88d241591f9b3e5b517cd6225905cd0b2b61a8224439` |
