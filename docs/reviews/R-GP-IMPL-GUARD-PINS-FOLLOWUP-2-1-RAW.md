# R-GP-IMPL-GUARD-PINS-FOLLOWUP-2-1 — CC-REV-1 implementation review of syzygy-bpyt.8.39, round 1
Verdict: REVISE
Reviewed commit: 5db78a26
Subject: r1-review.diff sha256 c4dfc588a5d9639671974689576693a7cc22fcd7abe68c5a0e844b8568f7584c

Reviewer: fresh-context CC-REV-1 reviewer (rev-541), 2026-10-27. I did not author the change and changed none of its bytes. I read
no body of Butlers or of any other observed repository, and opened no credential file. npm-package-arg and @npmcli/arborist were
read from node's own install (node v24.6.0, npm 11.5.1), and my npm probe ran offline with an empty private user and global config
and an empty private cache.

One blocking finding: a new comment sentence is false for npm (F1). It is comment-only to fix, and nothing a gate accepts or
refuses changes, either in the reviewed bytes or in the fix. Everything else the change claims reproduces.

## 1. Subject identity checks

All [Observed], in a scratch clone of `/home/tze/GitHub/syzygy` with `https://github.com/Tzeusy/syzygy.git` added as a remote.
- `sha256sum r1-review.diff`: `c4dfc588a5d9639671974689576693a7cc22fcd7abe68c5a0e844b8568f7584c`.
- `git diff d38d7a3ce632a34c2a41bdb77ad323ba0b05b777 5db78a26699a07716edd303484c0f7241df02e9e | sha256sum`: the same digest.
  **Match.** `19 files changed, 3956 insertions(+), 2 deletions(-)`.
- `git diff d38d7a3c 308a62f4 | sha256sum`: `23161e16390ce20f76bf1bcec4e06850c1249bb60b742ef9e1ff0f8a8d3defb4`. **Match.** 2 files,
  `workspace-reach.test.ts | 9 +++++++++` and `workspace-reach.testkit.ts | 6 ++++--`.
- `git diff --stat 308a62f4 5db78a26`: `17 files changed, 3943 insertions(+)`, every path under `docs/evidence/syzygy-bpyt-8-39/`.
  `git diff --quiet 308a62f4 5db78a26 -- packages apps scripts package.json package-lock.json` exits 0.
- `git merge-base d38d7a3c 5db78a26` is `d38d7a3c…`; `308a62f4^` is `d38d7a3c…` and `5db78a26^` is `308a62f4…`.
- `git ls-remote origin` (GitHub): `refs/heads/agent/syzygy-bpyt.8.39` at `5db78a26…`, and `gh pr view 541` gives
  `"headRefOid":"5db78a26699a07716edd303484c0f7241df02e9e"`, `"state":"OPEN"`.
- `gh pr checks 541 -R Tzeusy/syzygy`: `checks	pass	24m15s` and `node	pass	4m23s`. `gh run view` gives
  `"conclusion":"success","headSha":"5db78a26699a07716edd303484c0f7241df02e9e"` for both runs (40464073891 node, 40464073986
  governance-docs). The hosted node log's totals: `Test Files  243 passed | 3 skipped (246)`, `Tests  5378 passed | 5 skipped
  (5383)`, and for the system tests `Tests  49 passed (49)` (`hosted-node-totals.txt`).
- **Main moved.** At review start GitHub main was `d38d7a3c` (the base). It is now `eb8fb6cb523c7d415390ac60c15f7c2c56db2398`,
  #539, merged `2026-10-27T08:22:15Z`, and was still there when I re-checked at `2026-10-27T08:57:35Z` (#533 and #540 had not
  landed).
  - `git diff --name-only d38d7a3c eb8fb6cb`: 127 paths (`main-changed-paths.txt`). **0 of them is one of the subject's 19**
    (`comm -12` over both sorted lists). Two are resolver inputs: `apps/three-surface-poc/package.json`, which drops
    `"@syzygy/cap1-daemon": "0.0.0"`, and `package-lock.json`.
  - Local merge of `5db78a26` with `eb8fb6cb`: `93cc58d7dfb861cef5ae560850632d65c21e17a4`, tree `d134dac10c8072f2c873da6a4e801673b2df3b04`,
    no conflict. `git diff eb8fb6cb 93cc58d7 | sha256sum` is `c4dfc588…`, so the subject applies unchanged over current main.
    On it I ran the four guard files and all 18 mutants (§3.2, §3.4).
- The PR body was last updated `2026-10-27T08:36:44Z`. It now says main moved to `eb8fb6cb` and that none of its 127 paths is one of
  the PR's 19, and carries the battery line ("`commit=5db78a26699a07716edd303484c0f7241df02e9e commands=114 nonzero=0`"). My copy:
  `pr-body-now.md`, sha256 `52b085f231d1367627f66d7c3a58e986b01088214e79f707379ea1453611a516`.

## 2. Clauses relied on (quoted), and the class ruling

- CC-REV-1 (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md:18-20`): "Changes touching any of seven classes
  require review by an independent, fresh-context reviewer, and the agent performing the change never finally decides which classes
  it touches."
  - `:31-32`: "1. **authority boundaries** — write-universe, typed-authority table, adapter authorization (VIS-5, VIS-6);"
  - `:37`: "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
  - `:40-41`: "6. **public interface** — machine-queryable endpoints, adapter contracts, anything an external consumer can depend on;"
- GP-Q0 (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`):
  - `:52-55` (list items joined): "\"Behavior-preserving\" means none of the following changes: a rendered byte, a wire format, a refusal string or an exit
    code; a signed or digest-bound artifact; a consent, security or retention decision."
  - `:62`: "**Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4
    (security), and class-6 pull requests that remove an endpoint."
  - `:95-96`: "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."
- `AGENTS.md` at `5db78a26`, rule 6 (`:126-127`): "Mutate the input and confirm the check fails, per predicate, before trusting it";
  rule 9 (`:132`): "A claim of absence needs a sweep with a denominator."; rule 11 (`:134-135`): "An evidence record names its
  subject and the subject's digest; a record that names neither cannot be re-checked against the bytes it describes."
- The test-rigor bar, `git show 5db78a26:.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`, quoted in §7.

**Class ruling: 1, 4 and 6, no endpoint removed.** This is what the PR declares.
- [Observed] The two changed files are test-side. `workspace-reach.testkit.ts` holds the resolver. Its importers over `apps`,
  `packages` and `scripts` at `5db78a26` are exactly `subpath-imports.test.ts`, `island-boundary.test.ts` and
  `workspace-reach.test.ts` (`git grep -F 'workspace-reach.testkit'`, 3 importers).
- Classes 1 and 4. [Inferred, from the #536 dispositions record's "Class" section] The resolver is the island guard's mechanism,
  and that guard is the rule-6 kill evidence for the 8.1 ruling's class-1 and class-4 claims. Rows that pin the resolver touch
  those classes, even though they move none of its tokens.
- Class 6. The daemon-path guard (`subpath-imports.test.ts`) walks with the same resolver over `@syzygy/polaris-dossier`'s exports,
  and the new rows pin how a bare name is read in that walk. No `exports` entry, `package.json`, route or endpoint is in the
  subject, so no endpoint is removed.
- So GP-Q0's three extra checks apply. The differential is degenerate (§3.6, §3.7). There is a rule-6 mutant per predicate (§3.2,
  §3.4). The owner notice is due at landing [Unknown: not yet due].

**GP-Q0: nothing a gate accepts or refuses changes.** [Observed]
- The testkit's token sequence is identical at both commits (1,287 of 1,287 tokens, §3.6).
- The test diff only inserts lines: difflib opcodes `insert, insert`, and 0 base lines removed or replaced.
- HEAD's four guard files pass 169/169 against BASE's testkit (§3.3).
- The island answers are equal (254/254 walks and 2,648/2,648 answers, §3.7).
- The built `.d.ts` is byte-equal, and the built `.js` differs in comment lines only (§5).
- No rendered byte, wire format, refusal string, exit code, or signed or digest-bound artifact is in the subject. F1's fix is a
  comment edit, so it changes nothing a gate accepts or refuses either. The stop clause (`:95-96`) is not triggered.

## 3. What I ran, and the results

One vitest process at a time. Each run had a private TMPDIR under `/tmp/r541-*`, deleted afterwards. `/proc/loadavg` load1 is
given for every run.

### 3.1 Setup
- [Observed] Two scratch clones: head at `5db78a26` and base at `d38d7a3c`, the base clone later turned into the merge `93cc58d7`.
  `npm ci` in each: `added 117 packages`, exit 0 (load1 45.4 → 44.7).
- My mutant runner, `tools/rmut.py`, is independent of `mut.py` and `record.py`. It applies each `old`→`new` edit, requires that
  `old` occur exactly once, and runs `npx vitest run --reporter=json`. It reads the failing rows from the JSON report's `fullName`,
  not from console lines, restores the files, and asserts `git status --porcelain` is empty before and after. Over all 62 runs:
  every `old` count is 1, every tree is clean after, and there are 0 errors and 0 timeouts.

### 3.2 The #536 reviewer's 11 mutants, from `rev536-specs.json`, unchanged

`rev536-specs.json` is byte-identical at both commits (`cmp` of the two `git show` blobs). I added one BASELINE (no edit) over the
same four guard files (`rev536-specs-plus-baseline.json`).

| Mutant | Base `d38d7a3c` | Head `5db78a26` | Merge `93cc58d7` | Failing row(s) at head |
|---|---|---|---|---|
| BASELINE | survives 165/165 | survives 169/169 | survives 169/169 | — |
| M1 https URL reads outside | killed, 1 row | killed, 1 row | killed, 1 row | "…a remote tarball URL dependency…" |
| **M2 http URL reads outside** | **survives 165/165** | **killed, 1 row** | killed, 1 row | "…a remote http tarball URL dependency…" |
| M3 tarball needs `./` | killed, 4 rows | killed, 5 rows | killed, 5 rows | `.tar`, `.tar.gz`, http URL, URL, tarball |
| M4 census takes `.ts.md` | killed, 1 row | killed, 1 row | killed, 1 row | the census row |
| M5 tree depth two | survives | survives 169/169 | survives | — |
| M6 root keeps only dependencies | killed, 1 row | killed, 1 row | killed, 1 row | "reads the workspace root's manifest beside the packages'" |
| **M7 `npm:` arm `npm:@syzygy/` only** | **survives 165/165** | **killed, 1 row** | killed, 1 row | "…an npm: alias of a registry package…" |
| **M8 `localNames` skips `dir` `.`** | **survives 165/165** | **killed, 1 row** | killed, 1 row | "reads a bare name the workspace root's manifest declares as a local dependency as naming no module" |
| **M9 `..` alone reads outside** | **survives 165/165** | **killed, 1 row** | killed, 1 row | "…a dependency on its parent directory…" |
| M10 exclusion `$` dropped | survives | survives 169/169 | survives | — |
| M11 residual widened | survives | survives 169/169 | survives | — |

- [Observed] Each of the four targets survives at base and is killed at head **by its own new row alone** (`Tests` 168/169, one
  failed row, and it is that row). The same holds on the merge.
- [Observed] Against the lane's records (`rev536-at-base.json`, `rev536-at-head.json`, compared by script): 11 of 11 outcomes equal
  at each commit, and 0 differences in the set of failing rows at head (lane's FAIL lines normalized to `fullName`). The lane ran at
  `308a62f4` and I ran at `5db78a26`; their `packages/` trees are identical (§1).
- Load1: base 52.7–64.8, head 56.3–63.6, merge 47.4–53.8. Each run took 4.3–7.6 s.

### 3.3 Faithfulness to the checked fix, and pre-existing behaviour
- [Observed] `tools/fix_equal.py`, reading only git objects, applies `rev536-fix-specs.json`'s `FIX-rows-only` edits (both to
  `workspace-reach.test.ts`, each `old` occurring once at base) to BASE's test file. It gives `"appliedEqualsHead": true`, with
  applied and head both sha256 `5e3ef214af947bc9455ae4d8ebd56c26d01ffe825c5968ce2d9c8625b36a59a4`. The opcodes are
  `["insert", "insert"]`, with `"baseLinesRemovedOrReplaced": 0` and `"linesAdded": 9`. Selftest: base against base gives
  `"appliedEqualsHead": false`.
- [Observed] Titles (`vitest list --json` over the four guard files): base 165, head 169, 0 duplicates at either commit. 4 are added,
  all in `workspace-reach.test.ts` and all four of the new rows, and **0 are removed**. The lane's `titles.json` says 165 and 169.
- [Observed] **The rows pin behaviour the resolver already had.** HEAD's test files run against BASE's testkit bytes (one edit
  replacing the whole testkit; `head-tests-base-kit.json`): `survives 0 169/169`, load1 54.5.

### 3.4 My own mutants (`rev541-specs.json`), against the predicates the new rows cover

| Id | Mutation | Base | Head | Merge | Killed at head by |
|---|---|---|---|---|---|
| X1 | the root manifest's `dependencies`, `optionalDependencies` and `peerDependencies` unread (root reads `devDependencies` only) | survives | **survives 169/169** | survives | — (§7) |
| X2 | the root manifest's `devDependencies` unread | survives | killed, 1 row | killed | the root-declaration row alone |
| X3 | the `npm:` arm refuses only an alias with an explicit `@version` (`npm:(?:@[^/@]+\/)?[^@]+@`) | survives | **survives 169/169** | survives | — (N1) |
| X4 | the `npm:` arm case-sensitive (`(?-i:npm:)`), so `NPM:x` reads outside | survives | **survives 169/169** | survives | — (§7) |
| X5 | the tarball arm skips a spec holding `#` (`^[^#]*\.(?:tgz\|tar\|tar\.gz)$`), so a git spec ending in a tarball extension reads outside | survives | **survives 169/169** | survives | — (N1) |
| X6 | `localNames` skips a manifest whose name is not scoped | survives | killed, 1 row | killed | the root-declaration row alone |
| X7 | the tarball arm skips an `http(s)` URL unless it ends in `.tgz` | survives | killed, 1 row | killed | the http tarball URL row alone |

- [Observed] Survivors at head: **X1, X3, X4 and X5**. X2, X6 and X7 show that the new rows also pin the root's
  `devDependencies`, an unscoped root name and an `http` URL ending in `.tar.gz`.
- [Observed] The rows I propose for X3 and X5 (N1), checked at head (`rev541-fix-specs.json`, `rev541-fix-at-head.json`):
  `FIX541-rows-only survives 0 171/171`. With X5 as well, the run is killed 170/171 and its one failing row is "…a git dependency
  whose spec ends in a tarball extension…". With X3, it is killed 170/171 and the one failing row is "…an npm: alias with no
  version…". X4 and X1 still survive with the rows, 171/171.
- Load1: head 49.5–57.1, base 55.2–58.9, merge 53.2–56.9, fix 61.5–62.9.

### 3.5 The comments: npa and npm
- [Observed] The lane's `npa_probe.cjs`, re-run at head, gives output equal to the lane's `npa-probe.json` (`equal to lane record:
  True`, 46 forms). npm-package-arg is `12.0.2`. Every comment form falls as the lane says. The three residual forms are `directory`
  and `False`, and 18 of 23 row versions are refused. The 5 not refused are the outside controls: `2.9.0` `version`, `^1.0.0`
  `range`, `github:someone/dossier` `git`, `~1.2.3` `range` and `git+https://example.com/lib.tgz.git` `git`.
- [Observed] My own probe (`tools/npa_probe3.cjs`, `npa-probe3-head.json`), with the pattern read from HEAD's one
  `const LOCAL_VERSION = ` line:
  - **N3 sentence, 9 forms:** `github:someone/dossier#v1.tgz`, `github:someone/dossier#v1.tar.gz`, `gitlab:someone/dossier#release.tar`,
    `bitbucket:someone/dossier.tgz`, `git://example.com/lib.tar.gz`, `git+ssh://git@example.com/lib.git#v1.tgz`,
    `https://github.com/someone/dossier.git#v1.tgz`, `someone/dossier#V1.TAR` and `git+file:../../packages/lib.tgz`. npa types
    every one `git`, and the pattern refuses every one. **The N3 sentence is true of npa and of the pattern.**
  - **The tarball URL clause, 3 forms:** `https://example.com/lib.TGZ`, `http://example.com/a/b/lib-1.0.0.tar` and
    `HTTPS://example.com/lib.tgz`. npa types each `remote`, and the pattern refuses each.
  - **N4's parenthetical, 14 forms:**
    - npa accepts an alias only when the spec after `npm:` is a registry spec, with `subRegistry: true` in every accepted case. The
      accepted forms are `npm:@scope/lib@^1.0.0` (an alias of a `range`), the unversioned `npm:@syzygy/polaris-dossier` and
      `npm:lodash` (each `range`), `npm:lodash@1.2.3` (`version`), `npm:lodash@next` (`tag`) and `NPM:lodash@1` (`range`).
    - Every non-registry form throws "aliases only work for registry deps": `npm:github:…`, `npm:git+https://…`, `npm:https://….tgz`,
      `npm:/srv/lib`, `npm:lib@file:../x` and `npm:lib.tgz`. `npm:lib@workspace:*` throws `EUNSUPPORTEDPROTOCOL`, and
      `npm:npm:lodash@1` throws "nested aliases not supported".
    - The pattern refuses all 14. **The parenthetical is true of npa and of the pattern.**
- [Observed] **What npm installs for an alias** (`tools/npm_alias_probe.py`, `npm-alias-probe.json`, npm `11.5.1`). Each case is a
  two-workspace project: workspace `w` is named `wlib` at `1.0.0`, and workspace `app` declares one dependency. The run is
  `npm install --package-lock-only --offline` with an empty private cache. On success, a full offline install follows, and then
  Node's `require.resolve('<name>/package.json')` from inside `app`:

| # | `app` declares | exit | lockfile | `app` loads |
|---|---|---|---|---|
| 0 | `"wlib": "npm:typescript@*"` | 0 | `node_modules/wlib` `{"resolved": "w", "link": true}` | `w/package.json wlib@1.0.0` |
| 1 | `"wlib": "npm:wlib@*"` | 0 | same | `w/package.json wlib@1.0.0` |
| 2 | `"wlib": "npm:typescript@^1.0.0"` | 0 | same | `w/package.json wlib@1.0.0` |
| 3 | `"wlib": "npm:typescript@^5.5.0"` | 1 | — | `npm error code ENOTCACHED` |
| 4 | `"dossier": "npm:wlib@*"` | 1 | — | `npm error code ENOTCACHED` |
| 5 | `"dossier": "npm:typescript@^5.5.0"` | 1 | — | `npm error code ENOTCACHED` |
| 6 | `"dossier": "npm:@scope/lib"` | 1 | — | `npm error code ENOTCACHED` |
| 7 | `"wlib": "*"` (control) | 0 | same as 0 | `w/package.json wlib@1.0.0` |
| 8 | nothing (control) | 0 | same as 0 | `w/package.json wlib@1.0.0` |

  The cache held only `_logs` afterwards, so nothing was fetched in cases 0–2. ENOTCACHED means npm went to the registry for that
  spec (offline). The source agrees [Observed, read from arborist `9.1.3`]:
  - `lib/arborist/build-ideal-tree.js:1227`: "const isWorkspace = this.idealTree.workspaces && this.idealTree.workspaces.has(spec.name)".
  - `:1250-1255`: "if (isWorkspace) { const existingNode = this.idealTree.edgesOut.get(spec.name).to; if (existingNode &&
    existingNode.isWorkspace && existingNode.satisfies(edge)) { return existingNode } }".
  - `lib/dep-valid.js:61-63`: "case 'alias': // check that the alias target is valid / return depValid(child, requested.subSpec,
    requestor)". This checks the target's range against the workspace's version and never its name. For `range`, `:46-49` gives
    "if (requested.fetchSpec === '*') { return true }".
  - So npm links a workspace for an `npm:` alias declared under that workspace's own name whenever the workspace's version
    satisfies the alias's range, whatever the target names (cases 0–2). It fetches from the registry otherwise (cases 3–6). That is
    F1.

### 3.6 The testkit change is comments only, by my own methods
- [Observed] `tools/tokens_equal.cjs` (TypeScript 5.9.3 scanner) scans the source as the parser does: a slash where an expression
  may start is re-scanned as a regex, and a `}` that closes a template substitution is re-scanned as the template's middle or tail.
  It compares the non-trivia tokens by kind and exact text. Result over BASE's and HEAD's testkit blobs (`blobs/`, sha256
  `ed67106f…` and `94c9d93b…`): `"oldTokens": 1287, "newTokens": 1287, "tokensEqual": true`, unbalanced `[0, 0]`.
- [Observed] Line level, by an LCS over lines: the removed lines are base 64 and 66, and the added lines are head 64, 65, 67 and
  68. `"removedOutsideComment": []`, `"addedOutsideComment": []`, and the only comment opener holding them is `/**`, the
  `LOCAL_VERSION` doc comment. Every other line is byte-identical, including the `LOCAL_VERSION` line, `localNames` and
  `resolveIn`.
- [Observed] Selftest of that tool (`tools/tokens_selftest.py`, `tokens-selftest.json`): one character of the regex literal
  changed, `localNames` renamed, a template literal's text changed and a string literal changed each make the tokens differ, and an
  added comment leaves them equal. `ok 5 of 5`. An earlier draft of the tool, without template re-scanning, lost sync and reported
  a false difference. I fixed it before trusting it.
- [Observed] The lane's `comment_only.cjs --selftest`, re-run, writes a record byte-identical to the lane's `comment-only.json`
  (`cmp`). `emitEqual: true` and `printEqual: true`. Renaming an identifier and changing the literal make both differ, and adding a
  comment leaves both equal.
- The built output (§5) is a third method.

### 3.7 The island differential
- [Observed] The #528 lane's `island_diff.py`, re-run with base `d38d7a3c` and head `5db78a26` (the tool asserts that HEAD is the
  tree's): `walks 254 / 254`, `answers 2648 / 2648`, `byAnswer {'module': 1620, 'null': 1028, 'undefined': 0}`.
- Both answer digests equal the lane's (`True True`). The two fields that differ are `head` (my commit) and `scratchSha256` of the
  scratch test, which embeds the tool's tmpdir path. Load1 52.5 → 51.1.

### 3.8 The record (rules 6 and 11)
- [Observed] `python3 -I record.py <clone> --check`: `summary.json matches ; problems: 0`, exit 0. `--selftest`: `selftest: 41/41
  mutations make a check fail`, exit 0, 41 `killed` lines.
- [Observed] My own on-disk mutations of record inputs, one at a time in the clone, restored from git after each with a clean tree
  (`tools/record_disk_mutants.py`, `record-disk-mutants.json`). Each mutation and what `--check` reported:
  - M8 at head reported as surviving: `summary.json DIFFERS ; problems: 2`, killed.
  - M9 at head failing a second row: `problems: 1`, killed.
  - M2 at base reported as killed: `problems: 2`, killed.
  - M7's recorded edit altered: `problems: 1`, killed.
  - The run's head commit changed: `problems: 1`, killed.
  - The island answers one fewer equal: `problems: 1`, killed.
  - A key added to `summary.json`: `DIFFERS`, exit 1, killed.
  - The npa probe's pattern line altered: `problems: 1`, killed.
  - **The island record's `scratchSha256` for `zz-836-old-testkit.ts` zeroed: `summary.json matches ; problems: 0`. Survives**
    (N3). The recorded value is correct: it equals the sha256 of BASE's testkit blob.

### 3.9 The whole vitest suite, typecheck, governance, quotations
- [Observed] `npm run typecheck` at `5db78a26`: exit 0 (load1 52.5 → 50.8). At `d38d7a3c`: exit 0.
- [Observed] **Whole vitest suite at `5db78a26`**, run after the typecheck build: `npx vitest run`, all nine projects, 08:39:31Z to
  08:45:28Z, load1 52.2 → 64.5. Result: `Test Files  1 failed | 242 passed | 3 skipped (246)` and `Tests  1 failed | 5377 passed |
  5 skipped (5383)` (`full-suite-summary.json`).
  - The one failure is `packages/polaris-dossier/src/waiting-sessions.test.ts` › "a rendered-design reviewer's continuity, disclosed
    in the review-status region discloses a design reviewer that continued to round 2 (mutant: drop the design continuity
    sentence)", 5,279.9 ms, "Test timed out in 5000ms."
  - Run alone right after, the file passes: `Tests  116 passed (116)` at the default timeout (load1 64.2), and 116/116 with
    `--testTimeout=60000` (load1 57.0).
  - That file imports neither changed file. The testkit's importers are the three guard tests, and no file imports a `*.test.ts`.
  - The 5 skipped are the strace capture and four live or browser tests gated by environment.
  - Hosted `node` at `5db78a26`: `5378 passed | 5 skipped (5383)`.
  - [Inferred] The failure is host load, not the change.
- [Observed] `python3 scripts/check_governance.py` at `5db78a26`: `32 OK, 21 WARN, 0 FAIL (53 checks)`, exit 0. No line names
  `syzygy-bpyt-8-39` or `workspace-reach`.
- [Observed] `python3 scripts/check_quotations.py` at `5db78a26`: exit 0.
- [Unknown] I did not re-run the canonical battery. The PR body's line is the lane's.
- [Observed] Faithful-tree sweep over the tracked root and `apps/*`/`packages/*` manifests, with the four dependency fields.
  - At `5db78a26`: 13 manifests and 29 versions. 0 match the pattern, and 0 are shaped like a bare directory spec.
  - On the merge: 13 manifests and 28 versions, 0 and 0.
  - Workspace names: 12 of 12 are `@syzygy/`-scoped. The one unscoped name, `syzygy-workspace`, is the root and not a workspace.
  - 25 dependencies are declared under a workspace's name (every `@syzygy/*: "0.0.0"`), which is the arborist path in §3.5.

## 4. Findings

### F1 — The new `npm:` sentence "npm installs it from the registry" is false for npm (blocking: a false comment sentence)

- **Evidence.**
  - The sentence, `workspace-reach.testkit.ts:64-66` at `5db78a26`: "- `npm:`: an alias. npm installs it from the registry
    (npm-package-arg 12.0.2 accepts only a registry spec after `npm:`), but its target may carry a workspace package's name, which
    other package managers can link locally; every alias is refused, failing closed."
  - [Observed, §3.5, cases 0–2] npm 11.5.1 does not install an `npm:` alias from the registry when the alias is declared under a
    workspace's own name and that workspace's version satisfies the alias's range. It links the workspace, fetches nothing, and Node
    then loads the workspace under that name, even for `"wlib": "npm:typescript@*"`. Arborist 9.1.3 decides by the name the
    dependency is declared under (`build-ideal-tree.js:1227`, `:1250-1255`). For an alias it checks only the target's range against
    the workspace's version, never the target's name (`dep-valid.js:61-63`, `:46-49`).
  - So the sentence's universal claim has a counterexample. Its contrast also points at the wrong field for npm: npm links by the
    declared name, and a target that carries a workspace's name goes to the registry (case 4).
  - The parenthetical is true, but it is a parse fact. It cannot establish an install fact.
  - The PR body repeats the claim ("**N4: the `npm:` clause says npm installs every alias from the registry.**",
    `pr-body-now.md:4`). It rests it on the npa probe ("Each comment claim holds, including the new ones", `:66`), which classifies
    spec strings and never observes what npm installs.
  - Origin: the bead's item 3 prescribes the text ("to say npm installs every alias from the registry"). That text came from the #536
    raw's inference (`docs/reviews/R-GP-IMPL-GUARD-PINS-FOLLOWUP-1-RAW.md:150`): "For an `npm:` alias, `spec.name` is the
    dependency's own name (above), so npm fetches the alias target from the registry." The step missed that the dependency's own
    name can itself be a workspace's. The implementer applied the prescribed text faithfully.
- **Impact on the guards.** None today [Observed]. Every workspace here is `@syzygy/`-scoped (12 of 12), and `resolveIn` reads an
  `@syzygy/*` specifier through the manifest's `exports` before it ever consults `localNames` (`testkit:99-105`). That loads the
  same workspace npm links. Fixing the sentence is comment-only and changes nothing a gate accepts or refuses.
- **The alternative reading, disclosed.** Read "it" as only the aliases whose bare name this pattern decides: names outside
  `@syzygy/*`, none of which is a workspace's name in this tree. On that reading the sentence holds in this tree today. The sentence
  carries no such scope, and the brief's rule is that a false comment sentence is REVISE, so I rule it blocking.
- **Failure scenario.** This is the failure N4 was filed to prevent. A reader takes "npm installs every alias from the registry" as
  the premise for a ruling on the kept `npm:` refusal, or on narrowing that arm (the PR's own residual: "Narrowing an arm changes
  what the guards refuse, and needs a GP-Q0 ruling"). The ruling is then made on a premise npm does not hold. The clause also
  directs the reader to the alias's target as the possibly-local part, when for npm it is the declared name.
- **Proposed fix** (comment-only; the token check and `record.py`'s ` * `-line check still apply). Replace `testkit:64-66` with:
  ```
   * - `npm:`: an alias. npm-package-arg 12.0.2 accepts only a registry spec after `npm:`, and npm fetches that spec from the
   *   registry unless the alias is declared under a workspace's own name and that workspace's version satisfies it; then npm links
   *   the workspace, as for any dependency declared under a workspace's name (every workspace here is `@syzygy/`-scoped, and the
   *   `@syzygy/*` branch reads such a name before this pattern). Its target may carry a workspace package's name, which other
   *   package managers can link locally; every alias is refused, failing closed.
  ```
  Then:
  - correct the PR body's N4 bullet and its "Each comment claim holds" sentence;
  - in the dispositions record, correct the #536 raw's step at `:150` (the raw itself stays verbatim under CC-REV-6) and the #536
    dispositions' statement of N4 (`guard-pins-followup-round-1-dispositions-2026-10-27.md:116-118`);
  - attach `npm-alias-probe.json`, or an equivalent run, as the evidence for the new clause.

### N1 — Two refusals the comment states have no row: a git spec ending in a tarball extension, and an unversioned `npm:` alias (low)

- **Evidence.** [Observed, §3.4] X5 (the tarball arm skips a spec holding `#`, so `github:someone/dossier#v1.tar` reads outside)
  and X3 (the `npm:` arm needs an explicit `@version`, so `npm:typescript` reads outside) each survive 169/169 at head and on the
  merge.
  - The new N3 sentence names the first: "a git spec whose text ends in a tarball extension (`github:someone/dossier#v1.tar`), which
    npm types as `git`; both are refused too, failing closed". The `npm:` clause covers the second ("every alias is refused"). npa
    types `npm:typescript` as an alias of a range (§3.5).
  - The PR is honest that the N3 refusal is "named in the testkit comment", not pinned. This is the same gap #536's N2 found for
    three other named refusals.
- **Failure scenario.** A tidy narrows the tarball arm to a path-like spec (`^[^#:]*\.tgz…`), or narrows the `npm:` arm to the
  `name@range` shape, with all 169 rows green. The comment and the owner notice still say the form is refused.
- **Proposed fix**, checked (§3.4: 171/171 together, each kills its own mutant alone). After the `'..'` row in "reads a bare name
  declared as %s as naming no module", add:
  `['a git dependency whose spec ends in a tarball extension', 'dossier', { dependencies: { dossier: 'github:someone/dossier#v1.tar' } }, {}],`
  and
  `['an npm: alias with no version', 'dossier', { dependencies: { dossier: 'npm:typescript' } }, {}],`.
  These pin existing refusals and change no answer.

### N2 — A workspace whose name is not `@syzygy/`-scoped is read as outside by its bare name, and nothing pins that none exists (low; pre-existing, outside this bead)

- **Evidence.**
  - [Observed, §3.5, cases 7 and 8] npm links every workspace into `node_modules` under its own name. Inside the workspace project,
    `require.resolve('wlib/package.json')` from `app` loads the workspace with or without any declaration.
  - [Observed] `resolveIn` reads a bare name outside `@syzygy/*` as `null` (outside) unless some manifest declares it with a local
    version (`testkit:99-100`). A scratch test over a synthetic workspace with an unscoped package `plainlib`
    (`tools/zz-r541-unscoped.test.ts`, run on the merge tree and deleted) prints `R541-ANSWER null` (`Tests  1 passed (1)`).
  - [Observed] Today it is vacuous: 12 of 12 workspaces are `@syzygy/`-scoped (§3.9). No row or check pins that precondition. The
    testkit's header states the `@syzygy/*` route ("An `@syzygy/*` specifier resolves through its package's `exports`") but does
    not name unscoped workspaces as a residual.
- **Failure scenario.** A later bead adds a workspace with an unscoped name, for example a vendored tool, and a daemon-path or CLI
  module imports it by that bare name. Node loads its source from the workspace link, while the resolver reads it as outside. The
  island and daemon-path walks skip it, and both guards stay green on a tree that breaks their invariant.
- **Proposed fix.**
  - Now: name it as a residual in the testkit comment, beside the 8.38 directory-spec residual, and in the owner notice on
    `syzygy-bpyt.10`.
  - Either of two closures changes what the guards refuse, and so needs a GP-Q0 ruling first: (a) a precondition row asserting that
    every non-root manifest in `WORKSPACE` has a name matching `^@syzygy\/`, which fails the day an unscoped workspace lands; or (b)
    `localNames` adding every non-root manifest's own name, which fails closed.

### N3 — `record.py` never checks the island record's `scratchSha256` (low)

- **Evidence.** [Observed, §3.8] Zeroing `scratchSha256["packages/polaris-generation-core/src/zz-836-old-testkit.ts"]` in
  `island-diff.json` leaves `--check` at `summary.json matches ; problems: 0`. `grep -c scratchSha256 record.py` gives `0`.
  - The recorded value is correct today (it equals the sha256 of BASE's testkit blob).
  - The base and head commits and the tool digest are checked, and they determine those bytes, so the field is redundant. But it
    is the record's only statement of the testkit bytes the differential compared, and it can drift unnoticed (rule 11).
- **Failure scenario.** A later re-run of the differential against a hand-edited old testkit records a different `scratchSha256`
  beside the same commits. `--check` still passes, and a reader trusting the field is misled about what was compared.
- **Proposed fix.** In `record.py`, check that `diff['scratchSha256'][f'{DIR}/zz-836-old-testkit.ts'] == sha(blob(BASE, KIT))` for
  both island records, and add a `--selftest` mutation for it. Or drop the field from what the record relies on. This is evidence
  tooling only.

### N4 — Process: "the full run" in the PR body means two of nine projects (process)

- **Evidence.** [Observed]
  - The PR body's suite paragraph is headed "Both packages' suites", but then says "the full run gives 2,168 passed and 1 skipped".
    `suite.json`'s run labelled `full` is `--project @syzygy/polaris-generation-core --project @syzygy/polaris-dossier`: 55 of 246
    files and 2,169 of 5,383 tests. The lane did not run the whole vitest suite locally.
  - The brief's own summary of the PR calls it "Local full suite".
  - The whole suite is covered by hosted `node` (`5378 passed | 5 skipped (5383)`) and by this review (§3.9). This review's whole run
    had one 5 s timeout in a different file (`waiting-sessions.test.ts`), which passes alone 116/116.
- **Failure scenario.** The dispositions record copies "full suite: one timeout in `start-gates.test.ts`", and a later reader takes
  the lane's two-project run as the whole-suite denominator.
- **Proposed fix.** The dispositions record says "both packages' suites (55 files, 2,169 tests)". It cites hosted `node` and §3.9
  here for the whole suite, naming the `waiting-sessions.test.ts` timeout and its 116/116 rerun.

## 5. Every changed output, or the evidence that there is none

No product output changes. [Observed]
- The code diff is two test-side files. The testkit is imported only by the three guard tests (§2), and no `exports` entry in any
  manifest names it. `@syzygy/polaris-generation-core` is `"private": true`, and its exports are `.` → `./dist/index.js` and
  `./live` → `./dist/live.js`.
- Built output: `npm run typecheck` (`tsc -b`, the same project list as `npm run build`) at base and at head, then `diff -rq` over
  every `dist/` tree. 11 of 12 are identical: `support`, `cap1-core`, `http-host`, `cap1-daemon`, `cap1-conformance`,
  `three-surface-poc-core`, `cap1-system`, `polaris-generation-consent`, `polaris-dossier`, `apps/syzygy` and
  `apps/three-surface-poc`.
  - In `packages/polaris-generation-core/dist`, 6 files differ: `.tsbuildinfo`, `workspace-reach.test.js` and its `.map`,
    `workspace-reach.testkit.js` and its `.map`, and `workspace-reach.testkit.d.ts.map`.
  - `workspace-reach.testkit.d.ts` is byte-equal (`cmp`). `diff` of the two `workspace-reach.testkit.js` files shows two hunks,
    `51c51,52` and `53c54,55`, both inside the doc comment.
  - No file under any `dist/` outside the guard tests' own outputs names `workspace-reach`, apart from the two `.tsbuildinfo` files.
    These are ignored build outputs that no export reaches.
- The resolver's tokens are identical (§3.6), and over the tree every island walk and resolver answer is equal (§3.7).
- No `package.json`, rendered byte, wire format, refusal string or exit code is in the subject.
- The 17 evidence files are new, under `docs/evidence/syzygy-bpyt-8-39/`. No existing evidence file is touched; `rev536-specs.json`
  and `rev536-fix-specs.json` are unchanged.

## 6. Verdict per item of the bead

- **Item 1 (N1, the root-declaration row): met.** [Observed] The row is the #536 reviewer's checked text, unchanged (§3.3). M8
  survives 165/165 at base and is killed at head by this row alone, and the same holds on the merge. X2 and X6 are killed by it as
  well.
- **Item 2 (N2, three rows): met.** [Observed] The rows are the checked text, unchanged. M2, M7 and M9 each survive 165/165 at base
  and are each killed at head by their own row alone. Together the guard files pass 169/169 at head and on the merge.
- **Item 3 (N4 comment, and N3's optional clause): not met as written.**
  - The change is comments only: met, by three methods (§3.6, §5).
  - The N3 clause is true of npa and of the pattern over 12 forms of my own (§3.5). Its refusal is unpinned (N1).
  - The N4 clause's "npm installs it from the registry" is false for npm (F1). That text is the one the bead prescribed.
- **Rule-6 for items 1 and 2, with old/new fragments and the commit: met.** [Observed] `rev536-at-base.json` and
  `rev536-at-head.json` carry each mutant's `edits` and the run's `head`, and `record.py --check` checks them. I reproduced all 11
  at both commits and on the merge (§3.2).
- **The comment-only check for item 3 (emit-equal and line-level): met.** [Observed] `comment_only.cjs` reproduces byte for byte,
  and `record.py`'s ` * `-line check passes. My token and line checks agree.
- **Classes 1, 4 and 6: agreed** (§2). No endpoint is removed. Under GP-Q0, nothing a gate accepts or refuses changes.
- **CC-REV-1 review:** this one. The owner notice is due at landing [Unknown]. It should add N1's two forms and N2's residual.

## 7. Test quality

- **Core rule** (`.claude/skills/th-engineering/subskills/test-rigor/SKILL.md:42`, at `5db78a26`): "**A test is worth keeping only if
  some plausible bug makes it fail.**" [Observed] Each new row makes a mutant fail that no other row catches: M2, M7, M8 and M9
  survive at base.
- **Bar 1** (`:52-54`): "Tests pin observable outcomes (return values, state transitions, emitted effects), not internal call
  sequences." Each row asserts `resolveIn`'s return value through the exported interface.
- **Bar 4** (`:64-67`): "Expected values are literals or independently derived." Each expectation is `toBeUndefined()`, a literal
  outcome. The root row builds its root manifest by hand (`{ name: 'root', dir: '.', devDependencies: { dossier: './packages/lib' } }`)
  rather than reading the tree.
- **Bar 7** (`:82-84`): "A maintainer should localize the bug from failure output alone." Each kill names its form: "…a dependency
  on its parent directory…", "…an npm: alias of a registry package…".
- **Bar 10** (`:93-97`): "A test is worth *adding* only if it catches a plausible bug no existing test catches: search for the
  nearest existing test first and prefer extending it. Reviews state the net test delta".
  - Three rows extend the nearest table. The fourth is one `it` placed beside the root-entry row, since no table builds a root
    manifest.
  - `Tests: +4 ~0 -0`, re-derived: 169 − 165, with 0 titles removed and an insert-only diff.
- **Bar 3** (`:60-63`, edge paths): the new rows are edge forms (`..` alone, `http:` against `https:`, an alias of a non-workspace
  target). Two edges the comment states stay open (N1: X3 and X5).
  - X1 survives: the root's three non-dev fields are unread. I do not ask for a row: `localNames` iterates the four fields
    uniformly for every manifest, and the app-side rows already pin each field.
  - X4 survives: `NPM:` reads outside. I do not ask for a row: one `/i` flag covers the whole pattern, and `FILE:` already has a
    row.
  - M5 and M10 stay equivalent on the tree, and M11 is the named residual, all as #536 ruled.
- **Bar 6** (`:78-81`): 0 timeouts in 62 guard-file runs at load1 47–65. The one whole-suite timeout was elsewhere and does not
  recur alone (§3.9).
- **Bar 8** (`:85-87`): the root row reuses `workspace()` and appends the root to its Map. Order is irrelevant to `localNames`,
  which iterates every manifest, so the row is readable and not brittle.

## 8. Cleanup

- Deleted: both scratch clones (head and base/merge), every TMPDIR I made (`/tmp/r541-b1`…`b3`, `h1`, `h2`, `m1`, `m2`, `f1`,
  `k1`, `i1`, `l`, `u`, `ws`, `t`, `full`, `npm`), and the 2 MB vitest JSON report, which `full-suite-summary.json` summarizes
  with its sha256 `e16ec4aef3704a1ea7da2f4302f39d90edac0a45c02761a6b152cd1df79d8e34`.
  - `ls -d /tmp/r541-*` gives "No such file or directory". I deleted nothing in `/tmp` outside my own TMPDIRs, and I killed no
    process.
  - A helper file I wrote outside `rev-541/` (the table below, before pasting) is deleted.
- Kept, under `rev-541/`: 52 files. Each is under 300 KB (`find . -size +300k` is empty) and is listed with its sha256. This raw
  is not listed in its own table.

| Path | sha256 |
|---|---|
| `blobs/testkit-base.ts` | `ed67106fe74333c97f419f4a52f14f75bfaa34bbfa5b41f33c4f1b6545895731` |
| `blobs/testkit-head.ts` | `94c9d93b40cc4f54afc8a6d56d9062b25e27938016edef566d7bd75b6381cbd3` |
| `check-governance.log` | `a236a65511f7a601bb742cc2363725a250f4aa0384710e7d7d30b7b2b612a3a4` |
| `check-quotations.log` | `7a34ea59919f05b900f1e4c86ff402635584b01388c30cacee8cd936d2ed3093` |
| `comment-only-rerun.json` | `e866d1263e76796748effcdde0f9ec4aa2d30d2c1dbaeeaf681de93919eb1a55` |
| `fix-equal.json` | `2fd220e2a042cf48f28fbc0bf09af6884d7402a891acf9cd1e73357116baa7ac` |
| `full-suite-summary.json` | `c81ea581df20d9276a347b0fc716a4158b401317035ba2f1abc3de45619a8a8e` |
| `full-suite.load` | `43be15773b0af0bda42ec7e0bf36c95397144f760d7173e84b567068acbf5ad5` |
| `full-suite.log` | `b20ff8d8c4b185cff75313c0f3e2f2ba7cb1d900dbd6af3c02403509b284d0ce` |
| `head-tests-base-kit-specs.json` | `74850c3a1f6024e00af76bac31389f0240ffebf5bb780d5b694c3832a706f57c` |
| `head-tests-base-kit.json` | `f90bd99fb8be0219a35dda1914e79797834c4f7d5a85fe56042c816e91b24b34` |
| `hosted-node-totals.txt` | `db03dbdd8635805e2dd9e93f3ee5fbc8b90f12341cebd353d93d988e5496af12` |
| `island-diff-rerun.json` | `34cf54f8eac642294cf75413d4a997630f18307262520d222a3cfa9feeeb73b5` |
| `island-diff-rerun.log` | `10255708670b31ec12006c77d36e672790554db5b44f321e83c5d8e971242217` |
| `main-changed-paths.txt` | `bae0427256b15f0f8c25bdc5572f3c07b1a089c739e750176bc98d90fe1f37a7` |
| `npa-probe-lane-rerun.json` | `92cadf9b8da00f34f3e33160287a781f88c46e1c2dcac9450e8a86d2aee0982c` |
| `npa-probe3-head.json` | `2094590cd0d2062d8e081e4a258a0d8430f0f98ad488cab20a1e7083fe981088` |
| `npm-alias-probe.json` | `79313bc54deb8d9a4dcfaf9dde5fdb2c16b9a27243488d591076f224eef54e95` |
| `npm-ci-base.log` | `b6640843f1adc9157410536aed53695255a92226d17e56daba188c8d3e39b40f` |
| `npm-ci-head.log` | `8948f6f3246243344b904ec08788e37e94fa7dfc6eb823af96968c041b60ac4b` |
| `npm-ci-merge.log` | `8948f6f3246243344b904ec08788e37e94fa7dfc6eb823af96968c041b60ac4b` |
| `pr-body-now.md` | `52b085f231d1367627f66d7c3a58e986b01088214e79f707379ea1453611a516` |
| `record-disk-mutants.json` | `e7c1f4641aa6462538508ab15f36820076784fe702c4e7f3d4f3b21c70911c34` |
| `record-selftest.log` | `816f104e7dca2d5ff1e106c1aa005936edfdca4d13f58ce8098f79c7775a5ef0` |
| `rev536-specs-plus-baseline.json` | `c0eee171fc96d8a34c780a883a038c988c784c0bc3bec9e2513c6ee4d53c4f12` |
| `rev541-at-base.json` | `403a08fdef1df1fb1d63a1a755efa076a33fe8716d62f64e8b2c95e625643770` |
| `rev541-at-head.json` | `6cd1ca67cb2e68771ec72685703a3e277a67430eb3d2c80015e851ab13484c9f` |
| `rev541-at-merge.json` | `e8c721b1f4ed814db61b7a0034a652c4bfb786ccb9304bf3f6177cacd35c3bca` |
| `rev541-fix-at-head.json` | `c5f408171cbc9a65b786655c155b0eb80973310653bc0121bd2a30c69ad09b97` |
| `rev541-fix-specs.json` | `50d59d9550e333892885ef3f8c082bf472f9c772d765cb3991a3377a99fe0f20` |
| `rev541-specs.json` | `3f9d1900546b54413766d95a3790db1114ac10f51a79313fcae0d678509d63e7` |
| `rmut-base-rest.json` | `6489bc7334830c5567efa24736ee9db32a80706e65725e68b4c32b25dc8bf4e4` |
| `rmut-base.json` | `26ca432e7c71c949468e9cdbc1f38106f3734e3754d9dcf13ab093aca34583d0` |
| `rmut-head.json` | `477cb73f75d0f544e0d6845f31c16f1c890bef55e0f15141e4db4c034e93f595` |
| `rmut-merge.json` | `436be24f1b5c76e082e2424838fff03c7ffbfab68ae14e0edad2ae70209c25e4` |
| `subject-paths.txt` | `deb0a94927a1978ce745aad98e3f1c74e14e9baee1646c0c881c47f3cddf8cde` |
| `titles-base.json` | `992e0283d1fd02bee8605c769630bd75699ccf5e9760b24faa24b78910bdf092` |
| `titles-head.json` | `4ca1e3c2df323851e3cd6fab23fade551d81ecf2759d43976d86d56e3833b89d` |
| `tokens-equal.json` | `ee155ee723bbfc740d06818a262fb4e137b11b8279a97664d696e5b439d7f165` |
| `tokens-selftest.json` | `8e92df2a41cc43aa5cd080bb704ea5fe7698fc1b41c840098f2e2612b193a646` |
| `tools/fix_equal.py` | `809f4c72b850ae333a211b111de7861a60e8b36020cde40603db27fc2f113970` |
| `tools/npa_probe3.cjs` | `971c768ba0054fda9326cfb5306a22ff1d99679f2e189171129fe9b06d1759e6` |
| `tools/npm_alias_probe.py` | `e7433d43abc9ab822c4435617b2f2d9c1432379b933abd5da4e406b1d170c5d8` |
| `tools/record_disk_mutants.py` | `c97a744d11141137d0269b9f9ed254c4003fa48e8d67fe97c03868eb677f28fe` |
| `tools/rmut.py` | `76bccae484e3321122800be914e33e958d1c260dfc48bb659cd5099e3c916245` |
| `tools/tokens_equal.cjs` | `2df32b980dfa53c7c3c8e46ca237108374daf3494f0d01a665ee0db599a8f8c2` |
| `tools/tokens_selftest.py` | `7e6cbedf6629df64a0f9c4785eea47e54a564aa01f595348c51be3fbf01df501` |
| `tools/zz-r541-unscoped.test.ts` | `4ff25d1b74ed2911fd65e7f1839e54299a114bcc4aa6d52e3fca8f5276bad584` |
| `typecheck-base.log` | `f21762922bb179fa5dc8c33e881c4f062ef1c33bf48c7d3dad2dd0e5cd30ee98` |
| `typecheck-head.log` | `f21762922bb179fa5dc8c33e881c4f062ef1c33bf48c7d3dad2dd0e5cd30ee98` |
| `waiting-sessions-60s.log` | `5108d52a76fd842eea79b508d90fc343fb3af01506e73a41971c6774a20cdc07` |
| `waiting-sessions-default.log` | `b46b8af23c845e14c8a3ac79af7f62c6c79ddba1511521af6bd75eeeced80b48` |
