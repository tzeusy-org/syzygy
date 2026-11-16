# R-GP-IMPL-GUARD-PINS-NOTES-1 — CC-REV-1 implementation review of syzygy-bpyt.39, round 1
Verdict: REVISE
Reviewed commit: 38fa1596
Subject: r1-review.diff sha256 2eed0ddc776e4103a58c27e3f95db5e9c1a7adae19a93b58d382c2091825f9c7

Reviewer: an independent fresh-context agent (rev-547). I did not write this change and I did not change it. I read the brief, the
bead (read-only `bd show`), PR #541's round-3 raw and its dispositions record, the PR body and the evidence at the reviewed commit.
I fetched no observed-repository content. I opened nothing under `~/.claude/` or `~/.config/`, and no real `.npmrc`: `npm ci` ran
with an empty user and global config of my own, and every npm probe ran offline against `http://127.0.0.1:9/` over synthetic fixtures
in my own `/tmp/r547-<n>` directories.

One blocking finding, F1: a PR-body sentence about N3 is false as written. With the scratch directory inside the caller's npm
project, the fixed probe still reads the caller's `.npmrc`. This is the configuration that round 3's N3 named. The fix is PR-body
text only, and its exact text is in F1. There are six notes, N1–N6. The testkit's executable bytes are unchanged, no gate's accept
or refuse changes, the two `record.py` tools and all three probes reproduce (the root-exception record up to npm's log
timestamps), and hosted `checks` and `node` pass.

## 1. Subject identity checks

All [Observed], in a fresh clone of `/home/tze/GitHub/syzygy`. `agent/syzygy-bpyt.39` and `main` were fetched from
`https://github.com/Tzeusy/syzygy.git`.
- The PR head on GitHub is `38fa15966db89bfede725fbde8073aef552daf0b`. That equals the reviewed commit, and it was checked again at
  the end. `git merge-base 38fa1596 main` gives `81862261ddbc2b3c8e8481851f3c27129217d477`, the brief's base.
- `git diff 81862261 38fa1596 | sha256sum` gives `2eed0ddc776e4103a58c27e3f95db5e9c1a7adae19a93b58d382c2091825f9c7`. That
  **matches** the brief, and `cmp` with the brief's `r1-review.diff` reports no difference. The diff is 15 files, +1540/−14.
- `git diff 81862261 38fa1596 -- packages/ | sha256sum` gives
  `15826057c37847909d6b7d85e4c432d8bf75c52c3324399e8b3fa432af14ab7d`, which **matches**. It is one file,
  `packages/polaris-generation-core/src/workspace-reach.testkit.ts`, +8/−8. All 16 changed lines begin ` * `, and none carries
  `@ts-`, `<reference`, `eslint`, `prettier` or `biome`.
- The other 14 paths are evidence. Three are changed under `docs/evidence/syzygy-bpyt-8-39/`: `npm_alias_probe.py` (+5/−3),
  `record.py` (+4/−1) and `summary.json` (+2/−2). Eleven are new under `docs/evidence/syzygy-bpyt-39/`.
- Commits: `fafe3669` (the code and 8.39 tooling), `226e367b` (the probes) and `38fa1596` (the predicate mutants and the summary).
  `git diff fafe3669 38fa1596 -- packages/` is empty, so the testkit has not changed since `fafe3669`, the record's `HEAD`.
- **Main has not moved.** At every check, the last just before writing this raw, GitHub `main` was `81862261`. So
  `git diff --name-only 81862261 main` lists 0 paths, and 0 of them are PR paths. `git merge-tree --write-tree main 38fa1596` gives
  tree `e58ef3fe…`, which equals `38fa1596^{tree}`. The local merge is therefore the head tree. I ran the four importers on it once
  more (§3.9). PR #532 had not landed.
- Hosted CI at `38fa1596` (`gh pr checks 547`, `gh api …/check-runs`): `checks` completed success (24m57s) and `node` completed
  success (4m57s). In the `node` job, "unit + conformance tests (npm test)" reports "Test Files 251 passed | 3 skipped (254)" and
  "Tests 5506 passed | 5 skipped (5511)", and "system tests" reports "Tests 49 passed (49)".
- PR body: `gh pr view 547 --json body` has sha256 `dfabd04d7368b065e794273d8857a1b90bf07f9c6fb5a7fd9e99072a200e9f8b`, the same at
  the start and at the end. `:N` below means a line of that body. The PR has 0 comments.

## 2. Clauses relied on, and the class ruling

- CC-REV-1, `.syzygy/governance/policies/craft-and-care/review-and-documentation.md`:
  - `:18-19`: "Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the agent
    performing the change never finally decides which classes it touches."
  - `:49-50`: "**The change record states** which classes the change touches, or "none," so a misclassification is a findable
    violation after the fact."
- GP-Q0, `.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`:
  - `:52-55`, verbatim, with line breaks shown as ` / `: "- "Behavior-preserving" means none of the following changes: / - a
    rendered byte, a wire format, a refusal string or an exit code; / - a signed or digest-bound artifact; / - a consent, security or
    retention decision."
  - `:60`: "Each pull request states which CC-REV-1 classes it touches."
- `AGENTS.md` at `38fa1596`:
  - `:95`: "Never edit an artifact after an act has bound its digest."
  - `:126-127` (rule 6): "Mutate the input and confirm the check fails, per predicate, before trusting it (`--selftest` holds the
    fixtures)."
  - `:132` (rule 9): "A claim of absence needs a sweep with a denominator."
  - `:133` (rule 10): "Freeze the bytes a review is bound to; any later edit retires the review."
  - `:134-135` (rule 11): "An evidence record names its subject and the subject's digest; a record that names neither cannot be
    re-checked against the bytes it describes."
- `syzygy-bpyt.4.6`'s constraint, as the brief quotes it and `bd show` prints it: "old evidence records and the old runners' bytes
  are cited by digest (rule 11): write new-shape records, never rewrite old ones; keep old runner files until G3's citer sweep says
  otherwise."
- Test rigor: `.claude/skills/th-engineering/subskills/test-rigor/SKILL.md` at `38fa1596`. Its lines are quoted in §7.

**Class ruling: none.** [Inferred, from these Observed facts]
- The one `packages/` file is a test kit. It is imported by exactly four files, all `*.test.ts`: `git grep -l -F
  workspace-reach.testkit 38fa1596 -- apps packages scripts` finds 4 files and no product module. `index.ts` and `live.ts`, the
  package's only exports, do not name it.
- Its change is comment-only. TypeScript emit and the comment-free print are both equal (`comment_only.cjs`, re-run, §3.6), and my
  own parse-tree method finds 1,300 of 1,300 leaf tokens equal.
- Everything else is under `docs/evidence/`.

So nothing a guard or gate accepts or refuses changes. No rendered byte, wire format, refusal string or exit code changes, and no
digest-bound artifact changes (§3.1). #541 declared classes 1, 4 and 6 because it added resolver rows. This PR adds none.

The PR body states no class at all (N5). The brief's "Class: none" is not in the body: none of its 52 lines, as `gh … --jq
.body` prints them, matches `class`, case-insensitive, and neither do the three commit messages.

## 3. What I ran, and the results

Each run had a private `TMPDIR` under `/tmp/r547-<n>`, and its `/proc/loadavg` is given as the three load averages (before → after
where both were recorded).

### 3.1 Digest-citer and locator sweep over the three edited 8.39 files (rule 9)

The tool is `tools/digest_sweep.py`. It reads every tracked blob at a commit through `git cat-file --batch`. For each of the three
files, at `81862261` (old) and at `38fa1596` (new), it searches case-insensitively for four forms: the full sha256 (64 hex), its
8-hex prefix, the git blob id (40 hex), and that id's 8-hex prefix. It reports whether each 8-hex hit lies inside a longer hex run.
It then lists every `record.py:`/`npm_alias_probe.py:`/`summary.json:` locator followed by a line number.

Denominators: **6,827** tracked blobs at `38fa1596`, and **6,816** at `81862261`.

| Old bytes (at `81862261`) | sha256 | Citers at `81862261` | Citers at `38fa1596` |
|---|---|---|---|
| `record.py` | `e4e27739587babcbb10e2b601b1b356987e824fda747a2dcc856e97f1bcedc1b` | 1: 8.39 `summary.json:316`, its own `tools` row | **0** |
| `npm_alias_probe.py` | `55aed20dde5eede39831cb5b698d13ffdd14584a1ad69d4e280b82c9060b4962` | 1: 8.39 `summary.json:314`, its own `tools` row | 1: `syzygy-bpyt-39/npmrc-trace-lane-probe-before.json:3`, the new "before" trace, which binds the BASE blob on purpose |
| `summary.json` | `57fe89147d9dc3df97ccca309c26945793e646cf26f24b3447e26a783612e28c` | **0** | **0** |

[Observed] The search found no hit for any git blob id form. It found no standalone 8-hex prefix: every 8-hex hit lies inside the
same full digest. So the old bytes were cited by digest only by the 8.39 `summary.json` that this PR regenerates, and the new trace
cites them deliberately. No raw, dispositions record or other evidence record cites them.

[Observed] The base bytes were never a review subject. Round 3 reviewed `93dc0390`, where `record.py` is `2719faef…` and
`npm_alias_probe.py` is `656b03bb…`, and the base bytes come from the coordinator-checked repair at `39b52beb`.

Locators: the sweep found 12 per commit. 7 are in `docs/evidence/http-host-review-2026-10-27/citations-head.txt` and point into
`syzygy-bpyt-7-3`, so they are unrelated. The other 5 are in the #541 raws, and each one resolves at its raw's own reviewed commit
[Observed by `git show <commit>:<path>`]:
- round 2, `:315` and `:401`: `npm_alias_probe.py:74-76` and `:78` at `58e8f604`;
- round 3, `:311`: `record.py:387-392` at `93dc0390` (the check is at `:390` there);
- round 3, `:337`: `record.py:105` at `93dc0390`;
- round 3, `:348`: `npm_alias_probe.py:87` and `:91` at `93dc0390`.

By `81862261`, the round-3 repair had already moved these lines: to `:93`/`:97`, `:108` and `:403`. So this PR breaks no locator.
At the head, `record.py`'s check is still at `:403` and `F1_RETIRED` at `:108`, and the probe's `version` lambda moves from `:93` to
`:95`. No tracked locator cites a base line of either file. The regex counts only the `<basename>:<n>` form. The continuation forms
in the same raw sentences (`:78`, `:91`, round 3's `(:5-7)`) sit beside a locator above, so they resolve at the same reviewed
commits.

[Observed] No CI workflow, script or `PROJECT-STATUS.md` names `syzygy-bpyt-8-39`. A `git grep -F` over `.github`, `scripts`,
`PROJECT-STATUS.md`, `AGENTS.md`, `docs/README.md` and `package.json` finds 0 hits.

### 3.2 8.39 `record.py`, at base and at head

- At head, `--check`: "summary.json matches ; problems: 0", exit 0. `--selftest`: "selftest: 76/76 mutations make a check fail",
  exit 0, with 76 lines `killed` and 0 `SURVIVED`. Load 30.88 30.74 34.89 → 30.63 30.71 34.77.
- At base `81862261` (a worktree of my clone), `--check`: "summary.json matches ; problems: 0". `--selftest`: "selftest: 74/74
  mutations make a check fail".
- At `93dc0390` (round 3's reviewed commit): "selftest: 70/70 mutations make a check fail".
- **So the three figures are each right for their own commit.** 70/70 is round 3's commit, and the bead copies it. 74/74 is the
  base, after the round-3 repair added four entries. 76/76 is the head. The PR body's "(it was 74/74)" is right at the base.
- The two new entries print:
  - "killed | a non-evidence path changed since the suite ran | ["suite: HEAD differs from REPAIR1 beyond testkit comment lines:
    ['packages/polaris-generation-core/src/workspace-reach.testkit.ts', 'README.md']"]";
  - "killed | a non-comment line inside the span since the suite ran | [...]".
- Line 70 is inside the doc-comment span: `doc_comment_span` gives lines 60–78 at the 8.39 `HEAD` (`c5fe2d40`), checked as
  `span[0] < n <= span[1]`.

### 3.3 `record_predicate_mutants.py`, re-run, and at base

- At head, re-run into my own scratch, the result is identical to the committed `record-predicate-mutants.json` in every field
  except `commit`. The committed record ran at `226e367b`, and mine ran at `38fa1596`. Both have the same `recordSha256`
  (`77e83043…`), both are `clean: true`, and both are `allAsExpected: true`. Load 31.76 30.89 34.67 → 29.94 30.72 34.39. The rows:
  - "S0-unmutated selftest: 76/76 survived []";
  - "S5-path-test-dropped selftest: 75/76 survived ['a non-evidence path changed since the suite ran']";
  - "S4-prefix-test-dropped selftest: 75/76 survived ['a non-comment line inside the span since the suite ran']";
  - "S6-span-test-dropped selftest: 75/76 survived ['a comment line changed since the suite ran on the LOCAL_VERSION line']".
- I read each survivor. Each is the entry that only its predicate kills: S5's injects `README.md`, S4's injects
  `const X = 1;` at line 70, and S6's (the existing entry) puts ` * x` on line 79.
- At base, with the same tool pointed at the base worktree: S5 and S4 give "74/74 survived []", and S6 gives "73/74 survived
  ['a comment line changed since the suite ran on the LOCAL_VERSION line']". So before this PR, dropping the path test or the
  prefix test left every entry killed, as the PR body `:7` says. Load 29.69 30.63 34.32.

### 3.4 My own mutants of the new `@since` hook and the path test

The tool is `tools/hook_mutants_839.py`, and the result is `hook-mutants-839.json`. Each mutant is one edit to a scratch copy of
8.39's `record.py` (sha256 `77e83043…`), and each `old` occurs once. The copy runs over the clone at `38fa1596`. Load 20.69
27.29 32.68 → 30.48 28.78 32.58.

| Id | Mutant | `--check` | `--selftest` |
|---|---|---|---|
| H0 | unmutated, with three extra `@since` entries | matches, 0 | 78/79. The identity entry SURVIVED (a negative control, as it should). "hook empties the list" was killed. "an evidence path added after the filter" was **killed**, so the hook cannot express a path the test should accept. |
| H1 | the hook bypassed (`since = [...]`) | matches, 0 | 75/76, survived: the new path entry |
| H2 | the hook under another key (`'sinc'`) | matches, 0 | 75/76, survived: the new path entry |
| H3 | the evidence-directory exclusion widened to `'docs/'` | matches, 0 | **76/76, nothing survives** |
| H4 | the exclusion becomes `if p == KIT` (every path but the testkit is dropped) | matches, 0 | **76/76, nothing survives** |
| H5 | the exclusion dropped | DIFFERS, 1 problem | "selftest: the unmutated inputs already fail" |
| H6 | the path test weakened to `KIT not in since` | matches, 0 | 75/76, survived: the new path entry |

Does the hook change what `--check` accepts at the fixed commits? **No.** [Observed] `hooked()` returns its value unchanged when
`MUTATE` is empty. `--check` matches at the head, and H1's copy with no hook gives the same summary ("matches").

H3 and H4 survive (N2). The hook is applied after the filter, so no entry can see a widened filter. That is the failure scenario
round 3's N1 named: "widening the evidence-directory exclusion". `tools/hook_fix_839.py` (`hook-fix-839.json`, load 31.34 26.52
29.25) checks a repair that moves the hook before the filter and adds one entry:
- F0, the repair alone: `--check` matches, and the selftest gives 77/77;
- F-H1, with the hook bypassed: both path entries survive;
- F-H3: "another bead's evidence path changed since the suite ran" survives;
- F-H4: both path entries survive;
- F-S5: both path entries survive.

### 3.5 N3: the probe re-run, and the npmrc traces

- **Plain re-run.** The head's `npm_alias_probe.py`, run with cwd `/tmp/r547-2/caller`, which holds an empty `.npmrc`, and scratch
  `/tmp/r547-2/s1`: exit 0. `cmp` with the committed `docs/evidence/syzygy-bpyt-8-39/npm-alias-probe.json` prints nothing, so the
  record is **byte-identical**: sha256 `e5f48acac3987f4bb32a18e341809f132e6f1ee4b064974ec5ec55a1aca48c1c`. It ran offline against
  `http://127.0.0.1:9/`. Load 22.74 27.16 31.16 → 23.56 27.21 31.13.
- **strace is available** (`strace -- version 6.19`). I ran `npmrc_trace.py` once on the head's probe, with `--compare` against the
  committed record. The result (`npmrc-trace-after-rerun.json`) is exit 0, `callerNpmrcOpened: []` and `recordEqualsReference:
  true`. Its only npmrc outside scratch is `/home/tze/.nvm/versions/node/v24.6.0/lib/node_modules/npm/npmrc`, openat ENOENT, count
  24. That equals the committed `npmrc-trace-lane-probe-after.json`. Load 22.71 26.97 31.03 → 21.92 26.31 30.66.
- **The committed traces, read.**
  - "before" has `probeSha256` `55aed20d…`, the base blob. It opens `/tmp/la-b39/caller/.npmrc` once (ok) and the builtin npmrc 24
    times (ENOENT). It is the positive control: it shows the trace sees npm's config opens.
  - "after" has `probeSha256` `677b0fe2…`, the head blob, and opens only the builtin npmrc.
  - The root-exception trace has `recordSha256` `12d3fa18…`. That equals the sha256 of the committed `root-exception-probe.json`,
    so the committed probe record is the traced run's own output.
- **Is the docstring true? Only conditionally.** [Observed] Three runs show it:
  - **The scratch directory under a directory holding a `package.json` and an `.npmrc`.** Caller `/tmp/r547-4/caller`, scratch
    `/tmp/r547-4/proj/s`, and `proj/` holds a `package.json` and an empty `.npmrc`. The fixed probe opens `/tmp/r547-4/proj/.npmrc`
    once (ok), outside scratch (`npmrc-trace-ancestor-package-json.json`). Load 20.36 25.67 30.36.
  - **The scratch directory inside the caller's npm project.** Caller `/tmp/r547-7/proj`, which holds a `package.json`, and scratch
    `/tmp/r547-7/proj/s`. The result has `callerNpmrcOpened: [{"path": "/tmp/r547-7/proj/.npmrc", "call": "openat", "result":
    "ok", "count": 1}]`, and the record is still byte-identical (`npmrc-trace-scratch-inside-caller-project.json`). Load 27.97 32.06
    31.74.
  - **A `node_modules` directory above.** One `npm --version` under strace, from cwd `/tmp/r547-5/anc/s`, where `anc/` holds a
    `node_modules` directory and an `.npmrc`, opens `/tmp/r547-5/anc/.npmrc`.

  The cause: npm takes the nearest directory above its working directory that holds a `package.json` or `node_modules` as the
  project, and reads that directory's `.npmrc`. The case calls are unaffected, because each case root holds its own
  `package.json`. The version calls run in the scratch directory itself, which holds none. So the docstring's "so … the one npmrc
  outside the scratch directory npm opens is its own builtin `<npm>/npmrc`" holds only when the scratch directory is outside any
  npm project. The PR body's "so they no longer read the caller's `.npmrc`" (`:8`) is false when the scratch directory sits inside
  the caller's project (F1, N1). The same holds for `root_exception_probe.py`'s docstring, which shares the pattern.
- **A verified repair.** `tools/f1/` holds patched copies of both probes, with a precondition sentence in each docstring and a guard
  that refuses such a scratch directory (§4 N1). With scratch `/tmp/r547-9/proj/s1`, under a `package.json`, both exit 1 with the
  guard's message. With scratch outside, the patched `npm_alias_probe.py` writes a record **byte-identical** to the committed one.
  The patched `root_exception_probe.py` writes a record equal to the committed one except on 4 lines: each is npm's debug-log path
  with its timestamp, in `errorLines` of A4, A5, N4 and N5. [Inferred] The same holds without the guard, because the timestamps
  come from npm. So the root-exception record is never byte-reproducible (§7). Load 27.33 27.30 29.47.

### 3.6 Comment-only, by the lane's tool and by mine

- **The lane's tool, re-run.** `node docs/evidence/syzygy-bpyt-8-39/comment_only.cjs <clone> 81862261… fafe3669… <testkit>
  <out> --selftest` writes a record **byte-identical** to the committed `syzygy-bpyt-39/comment-only.json`. Re-run to `38fa1596`,
  it gives the same `headSha256` (`ae226f8e…`), `emitEqual: true`, `printEqual: true`, and the same selftest. Load 27.86 28.19
  32.05.
- **Does it prove the executable bytes unchanged?** [Inferred] Yes, for this file. The emit uses `removeComments`, so equal JS means
  equal runtime code. The printer keeps types, so an equal print means equal types too. Comments in a `.ts` file carry semantics
  only as directives (`@ts-…`, `/// <reference>`), and none is among the 16 changed lines.
- **Its selftest kills a non-comment change.** Renaming `localNames` and changing the `|npm:|` literal each make both comparisons
  differ, and an added comment keeps both equal.
- **My own method** (`tools/token_compare.cjs`, `token-compare.json`). It compares the leaf tokens of the parsed tree, with JSDoc
  nodes skipped. A first version used the raw scanner. It desynchronized on the regex literal and read backticks inside the comment
  as a template, so it reported a false difference. I replaced it with the parse-tree version.
  - Real: 1,300 of 1,300 leaves equal, and 136 lines at both commits.
  - A type-only mutant (`localNames<T>(`) differs, at 1,303 leaves.
  - A string mutant (`|npm :|`) differs.
  - An added `/* x */` stays equal.
- `LOCAL_VERSION` is at line 79 at both commits.
- [Observed] The build compiles the kit to `dist/workspace-reach.testkit.js`, and `removeComments` is unset, so the comment change
  reaches that untracked, unexported output. No export reaches it.

### 3.7 N4 and N5: the comment against npm

- **Word diff** of the LOCAL_VERSION doc comment, base to head (lines 59–78 at both), with ` * ` prefixes stripped. It finds exactly
  four changes:
  1. bullet 1 gains ", except in the root's manifest under a workspace's own name, where npm links that workspace";
  2. bullet 2 gains "except in the root's manifest under a workspace's own name, as above,";
  3. bullet 2's "and other package managers link them locally" becomes "and another package manager might link them (not observed
     here)";
  4. the `npm:` bullet's "which other package managers can link locally" becomes "which another package manager might link
     locally (not observed here)".

  The comment's widest line is 134 columns, as at base. The `npm:` bullet keeps six lines, rewrapped.
- **The lane's record** (`root-exception-probe.json`, read by script):
  - R1–R5, the root's manifest under `wlib`: each has `lockExit` 0 and the single lock entry `node_modules/wlib → w`, `link:
    true`; `installExit` 0; `rootLink` `../w`; and app, w and s all load `w/package.json`.
  - A1/A2, app's manifest: link `app/nowhere`. A3: ENOENT. A4/A5: EUNSUPPORTEDPROTOCOL.
  - N1/N2, the root's manifest under a name no workspace has: link `nowhere`. N3: ENOENT. N4/N5: EUNSUPPORTEDPROTOCOL.
- **Does the probe observe more than exit 0? Yes.** It observes the lockfile entry, the install, the symlink, and the package.json
  Node resolves from `app`. `record.py` checks `observed(r)` and `loads.app.path` for R cases, though that second check has no
  selftest entry (N3).
- **[Inferred] how to read "where npm links that workspace".** npm links every workspace into the root's `node_modules` anyway:
  A1/A2 carry the same `node_modules/wlib → w` entry. What the R cases show is that npm skips the root's declaration and the bare
  name resolves to the workspace. The comment's wording is true in effect, as is the `npm:` bullet's "skips … and links that
  workspace". This is not a finding.
- **My own cases** (`tools/root_exception_more.py`, `root-exception-more.json`, load 20.07 24.71 29.76). The lane's tool, unchanged
  except for its `FORMS`, runs the seven forms of bullet 1 the lane did not: `.`, `..`, `../x`, `/x`, `~/x`, `x.tar` and
  `x.tar.gz`.
  - In the root's manifest under `wlib`, each of R1–R7 links `w`, and app loads `w/package.json`.
  - In app's manifest and under a name no workspace has, each is read as a directory (A1–A5, N1–N5 link the named path) or as a
    file (A6/A7, N6/N7 ENOENT).

  So bullet 1's exception holds for all ten of its forms at npm 11.5.1: three observed by the lane and seven by me.
- **A scoped workspace name** (`tools/root_exception_scoped.py`, `root-exception-scoped.json`, load 23.11 26.94 29.70). The lane's
  five forms in the root's manifest under `@syzygy/slib` each link `s`, and app loads `s/package.json`.
- **The hedges.** Whether another package manager links these is [Unknown]. I did not probe pnpm, yarn or bun. "might … (not
  observed here)" states exactly that, so both hedged sentences are true as written.

### 3.8 The new `record.py`

- `--check`: "summary.json matches ; problems: 0 []", exit 0. `--selftest`: "selftest: 19/19 mutations make a check fail", exit 0.
  Load 22.18 24.73 29.56.
- **Rule 11: met.** The record names its subject: four paths, `SUBJECT`, over the fixed `BASE` `81862261` and `HEAD` `fafe3669`.
  `summary.json` carries each subject file's sha256 at `HEAD`. Each trace names its probe's digest and its record's digest.
  `comment-only.json` names both blobs, and `record-predicate-mutants.json` names the 8.39 `record.py` digest and its commit.
  `root-exception-probe.json` carries no tool digest of its own. Its trace binds it (`recordSha256` `12d3fa18…`), but `record.py`
  never compares the two (N3).
- **Per predicate.** `tools/site_drop_b39.py` (`site-drop-b39.json`, load 20.67 24.11 29.17 → 20.15 23.60 28.81) neutralizes each of
  the 18 `problems.append(` sites in turn in a scratch copy. 14 sites are exercised: each leaves exactly the entries aimed at it
  SURVIVED. 4 sites leave **19/19, nothing survives**:
  - P5, `:95`, the R-case check that app loads `w/package.json`;
  - P10, `:112`, the lane traces' reference path;
  - P12, `:122`, `comment-only.json`'s selftest field;
  - P16, `:134`, the unmutated predicate-mutant row.
- **My expression-level mutants** of the same record:
  - E3 (trace digest dropped), E4 (retired-sentence check dropped) and E6 (the subject may grow) are each killed by their entry
    (18/19).
  - E1 (a lock entry that is not a link still read as a link), E2 (`installExit` not read), E5 (`count != 1` → `< 1`) and E7 (the
    R-case load check reading `w` instead of `app`) each **survive, 19/19** (N3).
- **Proposed entries, verified** (`tools/proposed_entries_b39.py`, `proposed-entries-b39.json`, load 24.58 24.17 28.75). Seven
  entries are appended (N3 gives their text). The extended selftest gives "26/26". Each of P5, P10, P12, P16, E1, E2, E5 and E7
  then leaves exactly its own entry SURVIVED (25/26).
- **A proposed check, verified inline.** The added check compares the root-exception trace's `recordSha256` with
  `root-exception-probe.json`. With it, `--check` matches and the selftest gives 20/20. With the entry and no check, 19/20, and the
  entry survives.

### 3.9 Suites, typecheck and governance

- **The four testkit importers at `38fa1596`**: `git-observation.test.ts`, `subpath-imports.test.ts`, `island-boundary.test.ts`
  and `workspace-reach.test.ts`. The result: "Test Files 4 passed (4)", "Tests 98 passed (98)". Load 31.99 30.81 30.52 → 33.12
  31.06 30.60.
- **The same four on the local merge** (tree `e58ef3fe…`, equal to the head tree): "Tests 98 passed (98)". Load 25.25 26.97 29.60.
- **The whole suite, once**: `npx vitest run --reporter=json`, after `npm ci` and before any build (`full-suite-summary.json`). It
  gives 254 files and 5511 tests: 5505 passed, **1 failed**, 5 pending. Load 31.09 30.70 30.49 → 34.84 35.18 32.52.
  - The failure: `packages/polaris-dossier/src/gate-acts.test.ts` > "the gate forms against the recorders render the sign-off
    record byte for byte as render_record does, from the same fields: CONFIRM WITH EXCEPTIONS", at 5,096 ms, with "Error:
    STACK_TRACE_ERROR", which is Vitest's 5 s default timeout.
  - **Alone, it passes**: "Tests 133 passed (133)", with "tests 87.54s" for the file. Load 29.99 33.97 32.20 → 30.37 32.97 32.00.
  - [Inferred] It is load, not this change. The test reads none of the PR's paths: `grep` for `syzygy-bpyt-8-39`,
    `syzygy-bpyt-39` and `workspace-reach` in it finds 0 hits. Hosted `node` passed the same 5511 (N6).
- `npm run typecheck`: exit 0. Load 22.61 28.87 30.61 → 21.94 28.10 30.30.
- `python3 scripts/check_governance.py`: "32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted", exit 0. No line names
  `syzygy-bpyt-39`, `syzygy-bpyt-8-39` or `workspace-reach`.
- `python3 scripts/check_quotations.py`: exit 0. Both match the PR body `:38`. Load 21.54 27.91 30.23.

## 4. Findings

### F1 — The PR body's N3 sentence is false when the scratch directory is inside the caller's npm project (blocking: a false sentence in the PR body)

- **Evidence.** [Observed, §3.5] PR body `:8` says the version calls "now run with `cwd` set to the scratch directory, so they no
  longer read the caller's `.npmrc`."
  - With the caller `/tmp/r547-7/proj` holding a `package.json`, and the scratch directory `/tmp/r547-7/proj/s` inside it, the
    head's probe opens `/tmp/r547-7/proj/.npmrc`, the caller's own, once (`openat`, ok).
  - The cause is npm's project lookup from the version calls' working directory, which the scratch directory alone does not
    control.
  - Round 3's N3 named this configuration in its failure scenario (`R-GP-IMPL-GUARD-PINS-FOLLOWUP-2-3-RAW.md:353`): "The probe is
    run from a directory, or inside a project, whose `.npmrc` holds a token". Its proposed fix (`:355`) carried the condition:
    "Pass `cwd=scratch` to `version(...)` (a scratch directory with no `package.json` above it)". The repair dropped that
    condition.

  The traced runs used a scratch directory outside any project, so the committed traces are true for what they record.
- **Failure scenario.** A natural invocation from the repository root reads `<repo>/.npmrc`, if one exists, for the version call:
  `python3 -I docs/evidence/syzygy-bpyt-8-39/npm_alias_probe.py .scratch/np out.json`. Someone trusts the PR body and runs it so.
  Nothing is fetched, and the record is unchanged, but the sentence that closes N3 is false for that run.
- **Fix (PR body only; the reviewed bytes stay as they are).** Replace the whole of `:8` with:

  ```
  - **N3** (`docs/evidence/syzygy-bpyt-8-39/npm_alias_probe.py`): the `npm --version` and `node --version` calls now run with `cwd` set to the scratch directory, so they no longer read the caller's `.npmrc` when the scratch directory lies outside any npm project. If a directory above the scratch directory holds a `package.json` or `node_modules`, npm takes that directory as the project and the version calls read its `.npmrc`; when the scratch directory is inside the caller's project, that is the caller's own `.npmrc` (observed by this PR's round-1 review, R-GP-IMPL-GUARD-PINS-NOTES-1). The traced runs below used a scratch directory outside any project. The docstring names npm's builtin `<npm>/npmrc` (absent here) as the one npmrc opened outside scratch; that holds under the same condition, which the docstring does not yet state (the review's N1).
  ```

  Verify: `gh pr view 547 -R Tzeusy/syzygy --json body --jq .body | grep -c -F "when the scratch directory lies outside any npm
  project"` prints `1`, and `grep -c -F "so they no longer read the caller's \`.npmrc\`."` prints `0`. If N1's guard is adopted in
  this PR instead of a follow-up, replace the last two sentences with "Both probes now refuse such a scratch directory." Then the
  file plan in N1 applies.

### N1 — Both probe docstrings state the npmrc property without its precondition (low; evidence tooling)

- **Evidence.** [Observed, §3.5] Both docstrings drop the precondition:
  - `npm_alias_probe.py:7-10` at the head: "…and a working directory inside the scratch directory, so nothing is fetched and the
    one npmrc outside the scratch directory npm opens is its own builtin `<npm>/npmrc` (absent here)";
  - `root_exception_probe.py:8-11` makes the same claim.

  Each is false with a `package.json` or a `node_modules` above the scratch directory. Three runs show it: the ancestor trace, the
  caller-project trace and the `node_modules` check.
- **Failure scenario.** As in F1. A later reader cites the docstring as proof that the probe never reads a host `.npmrc`.
- **Proposed fix (verified, §3.5).** Apply `tools/f1/npm_alias_probe.py.diff` and `tools/f1/root_exception_probe.py.diff`, both
  kept under `rev-547/`. Each adds the precondition sentence to the docstring and `<empty scratch dir, outside any npm project>` to
  the Usage line. Each also adds, after the not-empty check, the guard:

  ```python
  # npm takes the nearest directory above its working directory that holds a package.json or node_modules as the project, and
  # reads that directory's .npmrc; the version calls run in the scratch directory itself, so no such directory may be above it.
  up = os.path.dirname(scratch)
  while True:
      if any(os.path.exists(os.path.join(up, name)) for name in ('package.json', 'node_modules')):
          sys.exit(f'{up} holds a package.json or node_modules, so npm would read its .npmrc: use a scratch directory outside any npm project')
      if up == os.path.dirname(up):
          break
      up = os.path.dirname(up)
  ```

  The cascade, because both records hash on-disk tools:
  1. Regenerate 8.39's `summary.json` (`python3 -I docs/evidence/syzygy-bpyt-8-39/record.py .`). Its `npm_alias_probe.py` tool
     digest changes, and it must still give 76/76.
  2. Re-run `npmrc_trace.py` for `root_exception_probe.py`, because `record.py:97-103` checks that trace's `probeSha256` against
     the on-disk tool.
  3. Regenerate `syzygy-bpyt-39/summary.json` (its `tools` row).
  4. If the lane probe's "after" trace must bind the new probe blob, move `record.py`'s `HEAD` to the new commit. Its subject check
     `changed != SUBJECT` then needs the bead's own directory excluded, as 8.39's does (`if not p.startswith(f'{HERE_REL}/')`).

  That is why this is a follow-up bead and not a pre-merge change.

### N2 — 8.39's `@since` hook sits after the evidence-directory filter, so a widened filter survives the selftest (low; evidence tooling)

- **Evidence.** [Observed, §3.4] `record.py:400` is `since = hooked('since', [p for p in … if not
  p.startswith(f'{HERE_REL}/')])`. Each mutant below leaves `--check` matching and the selftest at 76/76:
  - H3, widening the exclusion to `'docs/'`;
  - H4, reducing it to `p == KIT`, which makes the path test vacuous on real data.

  An entry that injects an evidence path through the hook is killed (H0). So the selftest cannot express a path the test should
  accept.

  The PR's claim holds as worded: the new entry is the one that only `since != [KIT]` kills (S5, H6). The repair is the round-3
  reviewer's proposed fix, verbatim. Round 3's N1 failure scenario, "widening the evidence-directory exclusion", is still unkilled.
- **Failure scenario.** A later edit widens the exclusion, and every entry stays killed. A product file changed after the suite ran
  then passes "HEAD differs from REPAIR1 only in testkit comment lines".
- **Proposed fix (verified, `hook-fix-839.json`).**
  - Replace `:400` with `    since = [p for p in hooked('since', git('diff', '--name-only', REPAIR1, HEAD).split()) if not
    p.startswith(f'{HERE_REL}/')]`.
  - After the `'a non-evidence path changed since the suite ran'` entry, add `"another bead's evidence path changed since the
    suite ran": {'@since': lambda names: [*names, 'docs/evidence/syzygy-bpyt-8-36/x.json']},`.

  The result is 77/77. F-H3 leaves the new entry SURVIVED, and F-H1, F-H4 and F-S5 each leave both path entries SURVIVED. This is
  another in-place edit of 8.39's `record.py`, under the same ruling as §6. Fold it into N1's follow-up bead.

### N3 — The new `record.py`'s selftest leaves 4 of its 18 checks, and four expression mutants, unexercised (low; evidence tooling)

- **Evidence.** [Observed, §3.8] Neutralizing P5, P10, P12 or P16 leaves 19/19, and E1, E2, E5 and E7 survive.
  - P5 is the check behind the PR body's "app loads `w/package.json`" (`:16`): `record.py:94-95`.
  - The root-exception trace's `recordSha256` is never compared with `root-exception-probe.json`. Nothing checked ties that record
    to the tool digest the trace names.

  This is the gap class that N1 is repairing in 8.39 (rule 6, `AGENTS.md:126`).
- **Failure scenario.** A later edit drops the app-load check, or reads `loads.w` instead. On this data `w` loads `w/package.json`
  too, so the selftest still reports 19/19, and the R-case claim "app loads the workspace" is no longer checked.
- **Proposed fix (verified, 26/26, each mutant leaving only its entry).** Append to `SELFTEST`:

  ```python
      'a root case app does not load from the workspace': {'root-exception-probe.json': lambda d: (next(r for r in d['results'] if r['id'] == 'R3')['loads']['app'].update(path='nowhere/package.json'), d)[1]},
      'a lane trace compared with another record': {'npmrc-trace-lane-probe-before.json': lambda d: (d.update(reference='docs/evidence/syzygy-bpyt-39/root-exception-probe.json'), d)[1]},
      'a comment-only selftest that misses a rename': {'comment-only.json': lambda d: (d['selftest']['identifierRenamed'].update(printEqual=True), d)[1]},
      'an unmutated predicate run that fails': {'record-predicate-mutants.json': lambda d: (next(r for r in d['rows'] if r['id'] == 'S0-unmutated').update(survived=['x'], exit=1), d)[1]},
      'a root case npm installs as a copy': {'root-exception-probe.json': lambda d: (next(r for r in d['results'] if r['id'] == 'R5')['lockEntries']['node_modules/wlib'].update(link=False), d)[1]},
      'a root case whose install fails': {'root-exception-probe.json': lambda d: (next(r for r in d['results'] if r['id'] == 'R2').update(installExit=1), d)[1]},
      'a testkit that states a root exception twice': {'@kit': lambda kit: kit + "// as a directory or a file, except in the root's manifest under a workspace's own name, where npm links that workspace;\n"},
  ```

  Then, after `record.py:112`, add the check below, with the entry `'a root-exception trace of another run':
  {'npmrc-trace-root-exception-probe.json': lambda d: (d.update(recordSha256='0' * 64), d)[1]}`. That was verified at 20/20, and
  the entry survives without the check.

  ```python
          if name == 'root-exception-probe' and t['recordSha256'] != sha((HERE / 'root-exception-probe.json').read_bytes()):
              problems.append('npmrc-trace root-exception-probe: the traced run did not write the committed root-exception-probe.json')
  ```

  `summary.json` is unchanged by either, since neither enters the summary dict. A follow-up bead is enough.

### N4 — #541's dispositions record reports 8.39's selftest at 74/74 "on the landing tree"; on main after this PR it is 76/76 (process)

- **Evidence.** [Observed] `docs/evidence/guard-pins-followup-2-round-3-dispositions-2026-10-27.md:78-80` reads "**`record.py` on
  the landing tree**, merged with main: … `--selftest`: "selftest: 74/74 mutations make a check fail"". It names no commit for the
  landing tree, which is `a403b902` (#541's merge). After this PR lands, the same command on main prints 76/76.
  - Its `:163-166` ("stands unhedged in the testkit until that bead lands") becomes historical the same way.
  - It cites no digest or locator into the three files (§3.1), so no citation breaks. Only a cold reading goes stale.
- **Failure scenario.** A reader runs the record on main, gets 76/76, and takes the dispositions record for wrong, or the reverse.
- **Proposed fix.** Do not edit the record (CC-REV-6 practice for retained records). In this bead's own dispositions record,
  written at landing, add one dated line:
  - it names `guard-pins-followup-2-round-3-dispositions-2026-10-27.md:78-80`;
  - it says that sentence is true at `a403b902`;
  - it says #547 edited 8.39's `record.py` and `npm_alias_probe.py` in place, giving 76/76 and two new tool digests in 8.39's
    `summary.json`.

### N5 — The PR body states no CC-REV-1 class, and promises a battery comment that does not exist (process)

- **Evidence.** [Observed] None of the body's 52 lines matches `class` (CC-REV-1 `:49-50`, GP-Q0 `:60`). Siblings #538, #540
  and #541 each carry a class section. `:40` says "Battery in a clone: running; the result follows in a comment.", and the PR
  has 0 comments (checked at the start and at the end of this review).
  - The new record pins fixed commits `fafe3669` and `226e367b`, as 8.39's does. A squash or rebase merge would leave them
    reachable from no ref, and `--check` would fail on `git show`.
- **Failure scenario.** A misclassification is not "a findable violation after the fact", because nothing is stated to find. Or a
  landing cites a battery that was never reported.
- **Proposed fix, before merge.**
  - Add a section: "## CC-REV-1 classes\n\nNone. The testkit change is comment-only (equal emit and print), and the rest is evidence
    under `docs/evidence/`. The round-1 reviewer (R-GP-IMPL-GUARD-PINS-NOTES-1) ruled none."
  - Post the clone battery's result as a comment, or replace `:40` with the result.
  - Merge with a merge commit, as #541 and #543 were.

### N6 — `gate-acts.test.ts` times out under load in the whole suite (low; outside this diff)

- **Evidence.** [Observed, §3.9] One `it.each` case took 5,096 ms against Vitest's 5 s default at load ~31. Alone it passes, 133/133,
  in 87.5 s of test time. It spawns the recorder tools, and none of this PR's paths are among its inputs. `.beads/issues.jsonl` in
  the main checkout (370 lines) has 0 lines naming `gate-acts`.
- **Failure scenario.** A full-suite run on a loaded host goes red for a reason unrelated to the change under review, and
  reviewers learn to ignore red (test-rigor bar 6).
- **Proposed fix.** A follow-up bead: give that `it.each` an explicit timeout sized from its measured alone-runtime, or move it to
  the slow tier. Out of scope here.

## 5. Every changed output

[Observed unless marked]
- **The testkit's runtime and type surface: none.** Emit and print are equal (lane's tool, re-run), 1,300 of 1,300 parse-tree
  leaves are equal (mine), there are 136 lines at both commits, and `LOCAL_VERSION` stays at line 79. The untracked `dist/` output
  carries the comment change, and no export reaches it [Inferred from `exports` and the 4 importers].
- **Guards and gates: none.** No product file changes. The four importers pass 98/98 at the head and on the merge. Hosted `node` and
  `checks` pass. No test file changes, so the title population is unchanged: the hosted and local totals are both 5511.
- **8.39 evidence.** `summary.json` changes in exactly two lines, the `npm_alias_probe.py` and `record.py` tool digests
  (`677b0fe2…`, `77e83043…`). `--check` matches, and the selftest goes 74 → 76. `npm-alias-probe.json` is unchanged, and the new
  probe reproduces it byte for byte.
- **New evidence:** 11 files under `syzygy-bpyt-39/`. They are reproducible:
  - `comment-only.json` is byte-identical on re-run;
  - `record-predicate-mutants.json` is equal except `commit`;
  - the lane-probe "after" trace is equal;
  - `root-exception-probe.json` is equal except npm's 4 debug-log timestamps (with my patched copy);
  - `summary.json` is matched by `--check`.
- No rendered byte, wire format, refusal string, exit code or digest-bound artifact changes (GP-Q0 `:52-55`; §3.1 for digests).

## 6. Verdicts

- **N1 (round 3): met, with a residual.** The `@since` hook and both entries are in place. Dropping each of the three predicates in
  turn leaves exactly its own entry surviving (75/76 each), against 74/74 for S4 and S5 at the base. The residual is N2: the hook's
  placement leaves filter-widening unkilled.
- **N3 (round 3): partly met.** Both version calls now run with `cwd=scratch`. The traced and re-run configurations open no npmrc
  outside scratch except the builtin one, and the record is byte-identical. The claim is still unconditional, which makes the PR
  body's sentence false for a scratch directory inside the caller's project (F1) and leaves the docstrings without their
  precondition (N1).
- **N4 (round 3): met.** The `npm:` sentence is hedged. Extending the hedge to the `link:`/`workspace:` bullet is disclosed (`:13`),
  and the bullet made the same unobserved claim. Both hedged sentences are true: each says
  plainly that the behaviour is [Unknown] here.
- **N5 (round 3), the `:60-63` item: met.** Both bullets carry the root-manifest exception. It is true for all ten forms of bullet 1
  and both forms of bullet 2, under `wlib` and under `@syzygy/slib` (§3.7). The probe observes the lock entry, the install and
  Node's resolution, not only exit 0.
- **The in-place edit of 8.39's evidence: right here, with N4's pointer.** The reasons:
  1. No tracked blob outside the set this PR regenerates cites the old bytes of any of the three files by digest. The sweep covered
     6,827 blobs at the head and 6,816 at the base, over sha256, prefix and blob-id forms. The one exception is the new "before"
     trace, which cites the old probe on purpose and binds it to the base commit.
  2. Every locator into them is commit-scoped, and the round-3 repair had already moved them.
  3. No act, manifest or review binds the base bytes: round 3 reviewed `93dc0390`, not `39b52beb`.
  4. 8.39's record hashes its tools from disk. Fixing the tools in a copy under `syzygy-bpyt-39/` would have left 8.39's directory
     holding a probe that reads the caller's `.npmrc` and a checker with two unexercised predicates, beside two divergent copies.
  5. Every 8.39 output is re-derived and equal where it claims to be. `npm-alias-probe.json` is byte-identical under the new probe,
     and `summary.json` differs only in its two tool digests.

  `syzygy-bpyt.4.6`'s constraint protects records "cited by digest", and its own exit is a citer sweep. §3.1 is that sweep, and it
  finds none. The alternative would have been new files: `syzygy-bpyt-39/record_839.py`, a copy of 8.39's checker carrying the
  two entries, and `syzygy-bpyt-39/npm_alias_probe.py` with `cwd=scratch`, with 8.39's directory untouched. I rule it worse here.
  The one cost is a stale cold reading of #541's dispositions record, which N4 repairs by a pointer, not an edit.

## 7. Test quality

Bar: `.claude/skills/th-engineering/subskills/test-rigor/SKILL.md` at `38fa1596`.
- Core rule (`:42`): "**A test is worth keeping only if some plausible bug makes it fail.**" Both new 8.39 entries pass. Each is the
  only entry that a plausible predicate drop leaves alive (§3.3). The new record's 19 entries each kill a real predicate. 4 of its
  18 checks have no entry (N3).
- Workflow 2 (`:103-104`): "name a one-line bug in the code under test this test would *not* catch but should." These are H3 and
  H4 for 8.39's path test (N2), and P5/E7 for the new record's app-load check (N3). Each comes with an entry or a repair, verified.
- Bar 4 (`:64-67`): "Expected values are literals or independently derived." Met. `EXPECTED`, `TEXT`, `PREDICATES` and `SUBJECT`
  in the new record are literals, and the predicate-mutant tool's `EXPECTED` is a literal, not read from a run.
- Bar 6 (`:78-79`): "A test that fails intermittently is worse than no test". The suite's `gate-acts.test.ts` case timed out under
  load and passes alone. It is outside this diff (N6). `root-exception-probe.json` embeds npm's debug-log timestamps, so a re-run
  never matches it byte for byte. Replacing that timestamp, as the probe already replaces the scratch path with `<scratch>`, would
  make it comparable byte for byte, like 8.39's probe.
  This is low, and it belongs with N3's bead.
- Bar 10 (`:95`): "Reviews state the net test delta". Vitest: +0 ~0 −0, which matches the PR body `:42`. Evidence selftests:
  8.39 goes +2 (74 → 76), and the new record adds +19. None duplicates an existing entry: each new 8.39 entry is the sole survivor
  of its own predicate drop.

## 8. Cleanup

I removed my scratch clone, its base worktree and every `/tmp/r547-<n>` directory: `-1` to `-9`. I left nothing else in `/tmp`. I
killed no process; every run was in the foreground or in my own background shell, and each exited. I did not keep these files:
- the full-suite JSON (2.1 MB in `/tmp/r547-1`), summarized in `full-suite-summary.json`;
- the governance and quotations logs, whose result lines are quoted in §3.9;
- my PR-body snapshot (`pr-body-r1.md`, sha256 `dfabd04d7368b065e794273d8857a1b90bf07f9c6fb5a7fd9e99072a200e9f8b`, the same as the
  live body);
- my empty `npmcfg/` files.

Two checks ran inline and left no file: the `node_modules` strace check (§3.5) and the proposed root-exception
`recordSha256` check (§3.8). Their result lines are quoted where they are reported.

Every kept file is under `rev-547/`, and none is over 300 KB:

| Path (relative to `rev-547/`) | sha256 |
|---|---|
| `b39-selftest-head.log` | `3d0129b55d35ab0d6cba2a5320b3444f29c2f1f4ab82f8123162087708b059e6` |
| `comment-only-rerun.json` | `e90d30a3daef39d60959be626de26336dec8a9667ba37a3e0ab99e0266a6b053` |
| `digest-sweep-base.json` | `856cced667519b6dc33a663118dc18b937ccda5970c22e10fb81b496b3cce200` |
| `digest-sweep-head.json` | `64c5d71a7a7c550a9a48260b04e47a23c02e135c48fb82a6f08a261a504dc15d` |
| `full-suite-load.txt` | `067f66f00f935a3c855e8010fd440fa7ff69a5af0fde56367e00440607d58792` |
| `full-suite-summary.json` | `ae4f690dd40419ebb807a1653a7c4d03e0ea59cb21019717ed978f0e3e0e9c45` |
| `gate-acts-alone.log` | `72a728cb937c36a06b1bedaa2075eecb3e8a1d99afb9e2690a1de061e4356015` |
| `hook-fix-839.json` | `1203c58222cae9172371f8cb4b3e1e73af593c012deb4539840d46db0669db6f` |
| `hook-mutants-839.json` | `29124639fbdb277e0601acb26677b3f958f971c43d71826e9754907c6b970a8e` |
| `hosted-check-runs.tsv` | `802cc00626035bedcc5c483d4246bc9b24be851c56dcc14508ddb59c72d23066` |
| `hosted-checks.txt` | `bd898bdcf08fc825b3fed429b495dcf8132bfbd7177ec2512d9d45c108dc947f` |
| `importers-head.log` | `02074d800b0351546fd6bfefe9d20f4b434d176fe05cf73ee18084e3f29d7659` |
| `importers-merge.log` | `57c10782afa67e8fb7d7b2aa31ab0e3ab1d361a9f2841a7fd538149231c1eeeb` |
| `main-changed-paths.txt` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `npm-alias-probe-rerun.json` | `e5f48acac3987f4bb32a18e341809f132e6f1ee4b064974ec5ec55a1aca48c1c` |
| `npm-alias-probe-rerun.log` | `8f176002c7d519073e41503d6475e0e5b878abedb0e64cc1793f952d13f8b3db` |
| `npm-ci-head.log` | `8948f6f3246243344b904ec08788e37e94fa7dfc6eb823af96968c041b60ac4b` |
| `npmrc-trace-after-rerun.json` | `455f9df9406729193f1b8afa7c538fb0b1c20df125944397d7bad0bfadd8bd41` |
| `npmrc-trace-ancestor-package-json.json` | `708bab45c3cd04aec793339e4206788d4e46afb6e3c49c43b1a7bbb298c5f419` |
| `npmrc-trace-scratch-inside-caller-project.json` | `9262e02db6ae7bb716a9929495137a7bbaa06b73990627e6e49ec30d97d0c2f6` |
| `pr-comments.tsv` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `pr-paths.txt` | `b52dbdf8ae092be31b094a634141b5228d954a830fde7f795d2053e8e00e213e` |
| `predicate-mutants-at-base.json` | `72f6eeb78b2b2ee1ddbd1ae916c7082b69920f6486f142bd86be7965a96268be` |
| `predicate-mutants-rerun.json` | `575fa12b568e7ed9281e808056b4bbf02444b7203aed82b93ab59bce5a6a071d` |
| `proposed-entries-b39.json` | `7d32fc82b490cc745866f7f201ff40d0c0e62694e506c20f7be186b302856a41` |
| `r839-selftest-base.log` | `bcb1fa5aec00f54a6edbc28bea6597526065ee2ca583c0bbae59113fb913ce66` |
| `r839-selftest-head.log` | `cabd93a04fb7353ca40b34987bdf1fab86d8e0f726895205064506b054fc6c1d` |
| `root-exception-more.json` | `301d682074c4bd7d8b78c36f704d79b20e83cff5dd36b093606c1f91a901bda5` |
| `root-exception-scoped.json` | `ed40c493e442e19384f609a3ff9ff380f9c3b2a3d240ecfa559bbd6a3b734f9b` |
| `site-drop-b39.json` | `7e6a89921604c2dc65c001f351f7e0184c19f4309a0588c1a171142e04ab26c2` |
| `token-compare.json` | `08f0472bbc3c2151ea7868be9cd6d55d1ad2f613d9848ad959bc309c324d37ed` |
| `tools/digest_sweep.py` | `40ec1319805ced6b2573c2a7ac23b2c073fba21f912ce43dd435e38cea68987f` |
| `tools/f1/npm_alias_probe.py` | `d0681b01b953b0dcff793cb4c6331245ee3c0c101d0977909df30cd0c6444812` |
| `tools/f1/npm_alias_probe.py.diff` | `6bcc9f2d73cf6921438ef3677cbe802184be1076b9b31c7a998d143cc5e0f2e8` |
| `tools/f1/root_exception_probe.py` | `b919a201567d3ed7093365eb845c354e716ccc6d07901bb72b3ad93dcbdf27fe` |
| `tools/f1/root_exception_probe.py.diff` | `35ccbf21afbb30e3fa343f1393b5a1119906b2e1cf329c938b4a2233cc517d79` |
| `tools/hook_fix_839.py` | `02a6723528f8e8b2651263bf96c55a8565e51637586cd744d1bc8665190cd68d` |
| `tools/hook_mutants_839.py` | `602bcec048c3a50a1e8aeb66cad868bb0fc92901c0455a8a9d2e3695833e1973` |
| `tools/proposed_entries_b39.py` | `32d286d89f3b8fd6efc302deaea1cb3e97106336098792da18275da0f7729074` |
| `tools/root_exception_more.py` | `57b3bead0c6a15d36d0a05a222295b5fa709f4cc2361840af6c47c5228e07444` |
| `tools/root_exception_scoped.py` | `b70c94e19f7235daf497a4b2860d2a5d265ba9abec4b5fa40144854abccbdb63` |
| `tools/site_drop_b39.py` | `8d0393f6890dac26d6e8b3346a8449390c89f3793e59e709c6e0c24d8744b7c7` |
| `tools/token_compare.cjs` | `76dbf266fa2a1aed23aa9d873818258efd2978dfec71ffe2475d04a0abedeb4a` |
| `typecheck-head.log` | `f21762922bb179fa5dc8c33e881c4f062ef1c33bf48c7d3dad2dd0e5cd30ee98` |

44 files. The raw itself is `R-GP-IMPL-GUARD-PINS-NOTES-1-RAW.md`, beside them.
