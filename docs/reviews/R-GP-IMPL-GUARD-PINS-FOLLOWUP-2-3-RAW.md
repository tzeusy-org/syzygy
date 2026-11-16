# R-GP-IMPL-GUARD-PINS-FOLLOWUP-2-3 — CC-REV-1 implementation review of syzygy-bpyt.8.39, round 3
Verdict: REVISE
Reviewed commit: 93dc0390
Subject: r3-review.diff sha256 db9e4ee53a6c0eeb2e4af931f9ce0fb5d1344b0fd50bdd705bca71719a6c359b

Reviewer: an independent fresh-context agent (rev-541c). I did not write this change, and I did not review rounds 1 or 2. I read
round 2's raw (`rev-541b/R-GP-IMPL-GUARD-PINS-FOLLOWUP-2-2-RAW.md`, sha256 `4f368d70d98b737b7b7ac9e934bbcfbe6ce42a996e98e51e05fa1fcdccf62bf0`,
which matches the brief) for its section 4 and its tools. I did not change the change. I fetched no observed-repository content,
and I opened nothing under `~/.claude/` or `~/.config/`.

One blocking finding: the six lines are still false, as written, for a declaration in a workspace's manifest when the root's manifest
declares the same alias (F1). It is comment-only to fix, and the guards are unaffected. Under the stopping rule, the exact
replacement text is in F1, for the owner. There are five notes (N1–N5).

## 1. Subject identity checks

All digests below are scripted (`sha256sum` over `git diff` output written to a file), not transcribed.

| What | Command | sha256 | Matches the brief |
|---|---|---|---|
| The repair delta | `git diff 58e8f604 93dc0390` → `r3-review.diff` | `db9e4ee53a6c0eeb2e4af931f9ce0fb5d1344b0fd50bdd705bca71719a6c359b` | yes |
| The code-only round-3 delta | `git diff 5f0d5547 00b7dcf7 -- <workspace-reach.test.ts> <workspace-reach.testkit.ts>` → `code-r3.diff` | `aa09ddcac7467953300bbe5682a04f6ccc5b1ce6cbfea64fb1389b2104da8dbf` | yes |
| The whole PR's code diff | `git diff d38d7a3c 00b7dcf7 -- <same two files>` → `code-pr.diff` | `60ff6905fdcdf5cfd8ac0842741543dcf543c82ebdf3ec3496ded9ff4f6a2017` | yes |

- [Observed] `git ls-remote https://github.com/Tzeusy/syzygy`: `refs/heads/agent/syzygy-bpyt.8.39` is
  `93dc0390c9e41f13f228edf4ed75afd78ed62777`, and `refs/heads/main` is `973965a82f82d9b90af05e4b96524aae0d9dbec4`. `gh pr view 541`
  gives `headRefOid` `93dc0390c9e41f13f228edf4ed75afd78ed62777`, state `OPEN`.
- [Observed] `git log 58e8f604..93dc0390` has two commits: `00b7dcf7` (test) and `93dc0390` (docs). `git diff --stat 58e8f604 93dc0390`
  gives 13 files, 381 insertions and 222 deletions. Twelve are under `docs/evidence/syzygy-bpyt-8-39/`, and the thirteenth is
  `packages/polaris-generation-core/src/workspace-reach.testkit.ts`. The test file's blob is `d3754b93af4604c5f4b620ece1bf9b8d5e3b087e`
  at both `5f0d5547` and `00b7dcf7`.
- [Observed] `git merge-base 93dc0390 973965a8` is `d38d7a3c…`. The branch changes 26 paths since `d38d7a3c`, and main changes 351.
  Their intersection is 0, by two methods (`comm -12` over the sorted lists, and Python set intersection). Files: `branch-paths.txt`
  and `main-paths.txt`.
- [Observed] Testkit lines 64–69 at `93dc0390` are byte-equal to round 2's `f1-r2-replacement.txt` (sha256
  `e5500fb4ccba0029db729ce63a201113886ae627d2d9bd55258ebfe5c9718e9c`). The doc comment runs 59–78, and `LOCAL_VERSION` is at
  line 79 (it was at 70 at `d38d7a3c`, 78 at `5f0d5547`). The widest line in the comment is 134 characters. The file has 0 U+00A0.

## 2. Clauses relied on, and the class ruling

- CC-REV-1, `.syzygy/governance/policies/craft-and-care/review-and-documentation.md:18-20`: "Changes touching any of seven classes
  require review by an independent, fresh-context reviewer, and the agent performing the change never finally decides which classes it
  touches." And `:51`: "**A reviewer or the owner** may reclassify at any time." The classes I use, `:31-32`: "1. **authority
  boundaries** — write-universe, typed-authority table, adapter authorization (VIS-5, VIS-6);". `:37`: "4. **security** — anything under
  SEC-1…SEC-5, auth surfaces, egress paths;". `:40-41`: "6. **public interface** — machine-queryable endpoints, adapter contracts,
  anything an external consumer can depend on;".
- GP-Q0, in `.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`:
  - `:52`: "\"Behavior-preserving\" means none of the following changes:"
  - `:53`: "a rendered byte, a wire format, a refusal string or an exit code;"
  - `:54`: "a signed or digest-bound artifact;"
  - `:55`: "a consent, security or retention decision."
  - `:62`: "**Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4
    (security), and class-6 pull requests that remove an endpoint."
  - `:64-66`: "an old-versus-new differential over a mutated-record corpus that includes records with altered prose;", "a rule-6
    mutant for each predicate;" and "a non-blocking owner notice in the cycle report."
- `AGENTS.md:126-127` (rule 6): "Mutate the input and confirm the check fails, per predicate, before trusting it (`--selftest` holds
  the fixtures)."
- The test-rigor bar, `.claude/skills/th-engineering/subskills/test-rigor/SKILL.md` at `93dc0390`, `:42`: "**A test is worth keeping
  only if some plausible bug makes it fail.**" And `:110-112`: "Verify new tests fail when the guarded behavior is broken (revert the
  fix or inject the bug locally to check)."

**Class ruling.** [Observed] The round-3 delta changes testkit comment text only (§3.3): the TypeScript token stream is equal
(1,287 tokens each side), and so is the comment-free esbuild emit. The other 12 files are evidence under `docs/evidence/`. The PR as
a whole keeps the classes it declares, 1, 4 and 6 (PR body `:21-23`): the testkit is the resolver behind the island guard, which is
the rule-6 kill evidence for class-1 and class-4 claims, and behind the daemon-path guard (class 6). No endpoint is removed. I rule
the classes as declared, 1, 4 and 6, with this round's delta touching none of them in behaviour.

**Under GP-Q0, nothing a gate accepts or refuses changes** [Observed]. No refusal string, exit code, rendered byte or wire format
changes, because no token of the testkit changes and no product file is in the branch: record.py's subject check (`:404-406`,
"the subject touches … not the two files") passes, and `summary.json`'s `productFilesChanged` is `[]`. No signed or digest-bound
artifact is touched: the evidence directory is cited by no act, and `F1_CLAUSE_SHA256` pins round 2's replacement file, not an act
argument. No consent, security or retention decision changes. Class 1 and 4 mean GP-Q0's three checks
apply to the PR. For this delta the differential is degenerate (comment-only). The rule-6 check per predicate is in §3.5 and N1. The
owner notice is due at landing.

## 3. What I ran, and the results

Every run used a scratch clone (`git clone /home/tze/GitHub/syzygy`, then the branch and main fetched), checked out at `93dc0390`, with
`npm ci --ignore-scripts` ("added 117 packages") and a private TMPDIR under `/tmp/r541c-<n>`. I ran one vitest process at a time.
`/proc/loadavg` before and after each run is in the `*.load` files (load1 17–28 throughout).

### 3.1 The six lines against npm: the lane's probe, re-run

- [Observed] `python3 -I npm_alias_probe.py <empty dir> <out>` at `93dc0390` exits 0, and its output is byte-equal (`cmp`) to the
  committed `npm-alias-probe.json`: 14 cases, npm 11.5.1, arborist 9.1.3, node v24.6.0, registry `http://127.0.0.1:9/`. (Load1
  17.26 before, 17.00 after.) File: `npm-alias-probe-lane-rerun.json`.

### 3.2 The six lines against npm: my own cases

`tools/npm_alias_probe_r3.py` is independent of both earlier probes. It runs every npm and node call with an environment built from
`PATH` alone: an empty scratch `HOME`, empty user and global configs, a private empty cache, offline, and registry
`http://127.0.0.1:9/`. Unlike both earlier probes, a case may declare in more than one manifest, and in any field. Workspaces: `w`
is `wlib` 1.0.0, `s` is `@syzygy/slib` 1.0.0, and there is `app`. npm 11.5.1, arborist 9.1.3, npm-package-arg 12.0.2. Output:
`npm-alias-probe-r3.json`.

| Case | Declarations | npm did [Observed] |
|---|---|---|
| Q1 | root `wlib: npm:typescript@^5.5.0` **and** app `wlib: npm:typescript@^5.5.0` | registry: "npm error request to http://127.0.0.1:9/typescript failed: cache mode is 'only-if-cached' but no cached response is available." |
| Q2 | root `wlib: npm:typescript@^5.5.0`, app `wlib: npm:typescript@^1.0.0` | link: lock `node_modules/wlib` `{resolved: w, link: true}`, install 0, `npm ls --all` 0, app loads `w/package.json` |
| Q3 | app `@syzygy/slib: npm:typescript@^1.0.0` (scoped, satisfied) | link `../../s`, app loads `s/package.json` |
| Q4 | root `@syzygy/slib: npm:typescript@next` (scoped, a dist-tag) | link `../../s` |
| Q5 | root `wlib: npm:./w` (npa throws for it) | link `../w` |
| Q6 | root `wlib: workspace:*` | link `../w` |
| Q7 | root `wlib: link:../nowhere` | link `../w` |
| Q8 | `w`'s own manifest `wlib: npm:typescript@^1.0.0` | link `../w`, `w` loads `w/package.json` |
| Q9 | app `peerDependencies` `wlib: npm:typescript@^5.5.0` | registry (`typescript`), after "npm warn ERESOLVE overriding peer dependency" |
| Q10 | app `wlib: npm:typescript@x` | link `../w` |
| Q11 | app `wlib: npm:typescript@` (empty range) | link `../w` |
| Q12 | control for Q1: app alone `wlib: npm:typescript@^5.5.0` | registry (`typescript`) |

Every link case gives lock exit 0, install exit 0 and `npm ls --all` exit 0, with no `npm warn` line.

[Observed] `tools/clause_predict_r3.cjs` scores three readings against every recorded case. It uses npm's own npa and semver, and the
cases are the lane's 14, round 2's 25 (its 26 less the no-declaration control D1) and my 12, so 51 in all
(`clause-predict-r3.json`):
- round 2's six lines, read as written: 50 agree, and 1 disagrees, Q1;
- the same lines read as if "the root's manifest declares it" meant "the declaration is the root's": 51 of 51 agree;
- the replacement proposed in F1: 51 of 51 agree.

[Observed] `tools/npa_alias_r3.cjs`, with npm-package-arg 12.0.2, checks 12 further `npm:` forms. After `npm:`, only a tag, a version
or a range parses (`npm:typescript@latest` is `tag`, `npm:@scope/x@1.2.3` is `version`, `npm:typescript@` is range `*`). Git, URL,
path and tarball forms throw "aliases only work for registry deps"; `workspace:` and `link:` throw EUNSUPPORTEDPROTOCOL; `npm:npm:…`
throws "nested aliases not supported". So the six lines' first sentence holds.

[Observed] The cause of Q1 is in arborist 9.1.3. `lib/node.js:923-929` drops only the root's own edge: "if (!current ||
current.type !== 'workspace') { new Edge({ from: this, name, spec, accept: ad[name], type }) }". The workspace's edge is checked by
`lib/dep-valid.js:61-63` ("case 'alias': … return depValid(child, requested.subSpec, requestor)") and `:46-53` (range `*` is true,
otherwise `semver.satisfies(child.version, requested.fetchSpec, true)`). The root's declaration plays no part in that check.

### 3.3 Comment-only, by my own method

`tools/tokens_r3.cjs` reads each blob two ways. The first is the TypeScript 5.9.3 scanner's token stream with trivia skipped,
re-scanning regular expressions and template continuations as the parser does. The second is the esbuild 0.28.2 transform with
`legalComments: 'none'`.

| Pair | Bytes differ | Tokens | Tokens equal | Emit equal |
|---|---|---|---|---|
| testkit `5f0d5547` → `00b7dcf7` | yes | 1,287 / 1,287 | yes | yes (both `822c6f79…`) |
| testkit `d38d7a3c` → `00b7dcf7` | yes | 1,287 / 1,287 | yes | yes |
| test file `5f0d5547` → `00b7dcf7` | no | 1,637 / 1,637 | yes | yes |

Its selftest on the head blob [Observed]:
- a code edit (`|link:|` → `|lnk:|`): tokens and emit differ;
- a comment that closes early and adds a token: both differ;
- a renamed function: both differ;
- a reworded comment: both stay equal.

The lane's `comment_only.cjs`, re-run, is byte-equal to the committed `comment-only.json` (`comment-only-lane-rerun.json`). So round
2's full-suite run at `5f0d5547` stands for `00b7dcf7`, as the brief allows.

### 3.4 Tests

- [Observed] The four guard files at `93dc0390` (`argv.test.ts`, `subpath-imports.test.ts`, `island-boundary.test.ts`,
  `workspace-reach.test.ts`), run with `npx vitest run <4 files> --reporter=json`, exit 0: 14 suites and 171 tests, 171 passed, 0
  failed, 0 pending (`guards-head.json`; load1 24.92 before, 25.40 after).
- [Observed] On a local merge of `93dc0390` with `973965a8` (`4b2ebefb`), after `npm ci`, the same four files give 171/171, and
  `python3 -I record.py . --check` prints "summary.json matches ; problems: 0" (`guards-merge.json`; load1 24.29 before, 27.07 after).
- [Observed] Hosted CI, `gh pr checks 541 -R Tzeusy/syzygy`: "checks	pass	24m25s" and "node	pass	3m32s". The check-runs API for
  `93dc0390c9e41f13f228edf4ed75afd78ed62777` gives `checks completed success` and `node completed success` (`gh-pr-checks.txt`,
  `hosted-check-runs.tsv`).

### 3.5 record.py

- [Observed] `python3 -I record.py <clone> --check`: "summary.json matches ; problems: 0", exit 0. `--selftest`: "selftest: 70/70
  mutations make a check fail", exit 0. All 70 lines read `killed` (`record-selftest.log`). The SELFTEST table grew from 64 entries at
  `58e8f604` to 70. Seventeen entries use a hook: 14 git-derived values and 3 digests. This matches the PR body `:56`.
- Source mutants (`tools/record_mutants_r3.py`, `record-mutants-r3.json`). Each makes one textual edit to a copy of record.py; each
  `old` occurs exactly once:

| Id | Mutation | `--check` | `--selftest` |
|---|---|---|---|
| S1 | `F1_CLAUSE`'s pinned text, one word (`absent` → `present`) | exit 1, "summary.json DIFFERS ; problems: 1" | exit 1, "selftest: the unmutated inputs already fail" |
| S2 | `F1_CLAUSE_SHA256`, one hex digit | exit 1, same | exit 1, same |
| S3 | the `LOCAL_VERSION`-line mutation moved back to line 78 | exit 0 | exit 1, "selftest: 69/70 mutations make a check fail" (it survives at 78, as round 2 predicted) |
| S4 | the late check's ` * ` prefix test dropped | exit 0 | **exit 0, 70/70** (N1) |
| S5 | the late check's path test dropped (`since != [KIT]`) | exit 0 | **exit 0, 70/70** (N1) |
| S6 | the `F1_RETIRED` test dropped | exit 0 | exit 1, 68/70 |

- Selftest entries I added, one at a time:
  - T1, a clause true except for one word ("the root's manifest refuses it"): killed.
  - T2, round 1's rule kept in other words, with no retired phrase: **SURVIVED** (N2).
  - T3, a REPAIR1-to-HEAD comment line on line 80: killed.
  - T4, a ` * ` line that closes the comment early, simulated through the hook: SURVIVED. The hook cannot model it, because the span
    is computed from the real blob. G1 below shows the real check kills it.
  - T5, a line without the ` * ` prefix inside the span (`record-t5-r3.txt`): killed (71/71). With S4 applied, T5 SURVIVED (70/71). So
    the prefix predicate works when its input changes, and no SELFTEST entry exercises it.
- Git-object mutants of the new REPAIR1-to-HEAD check. Each is a real commit made off `00b7dcf7` with a private index, read by a copy
  of record.py whose `HEAD` is that commit. Only the problems the check emits ("suite: HEAD differs from REPAIR1…") are read:
  - G1, a ` * ` line in the span that closes the comment early and adds `const EXTRA = 1;`: fails;
  - G2, a ` * ` line in `targetOf`'s doc comment: fails;
  - G3, a code token on the `LOCAL_VERSION` line: fails;
  - G4, `README.md` changed beside a comment-only testkit: fails, "…: ['README.md', 'packages/…/workspace-reach.testkit.ts']";
  - G5, a negative control, one ` * ` line in the span reworded: passes;
  - G6, a negative control, `00b7dcf7` itself: passes.

### 3.6 N1: the probe's environment, with a sentinel

[Observed] I ran the lane's probe under `strace -f -e trace=openat,open` with these sentinels:
- `HOME` pointing at a sentinel directory whose `.npmrc` holds `package-lock=false` and `loglevel=silly`;
- inherited `npm_config_package_lock=false`, `NPM_CONFIG_LOGLEVEL=silly` and `NPM_CONFIG_USERCONFIG=<sentinel>`.

The results (`npmrc-sentinel-lane.txt`):
- 0 of the trace's 49,878 lines open a path under the sentinel home;
- the probe's own empty user and global npmrc are opened 24 times each;
- the output is byte-equal to the committed record, so no inherited `npm_config_*` variable reached npm, in either case;
- one open is of `<scratchpad>/rev-541c/.npmrc`, ENOENT. That is the caller's working directory, opened by the final
  `npm --version` call, the only npm call without `cwd=` (N3);
- every npm call opens npm's own builtin `…/lib/node_modules/npm/npmrc` (23 times, ENOENT here).

### 3.7 N2: the dated count

[Observed] At `93dc0390` and at `973965a8`:
- the root's `workspaces` field is `['packages/*', 'apps/*']`;
- the tree has 12 manifests matching `(apps|packages)/[^/]+/package.json`, of 13 tracked `package.json` files;
- 0 of the 12 names lack the `@syzygy/` prefix.

So "At syzygy-bpyt.8.39, 0 of the 12 workspaces are unscoped" is true at both commits. record.py's two literals (`:95`, `:506`) carry
it, and the selftest "a testkit without the N2 residual count" is killed.

### 3.8 The PR body

[Observed] `pr-body-r3.md` (sha256 `443e6911…`, 127 lines, fetched with `gh pr view 541 --json body`):
- `:4` carries the six lines verbatim (checked by script, joined).
- A Python sweep over 14 phrases finds no sentence carrying round 0's or round 1's rule. Round 0's "installs it from the registry"
  appears once, at `:4`, quoted as the text round 1 found false; "version satisfies it" and "as for any dependency declared" give 0.
- The round-2 rule's condition ("the root's manifest declares it" / "when the root declares it") is at `:4`, `:102` and `:119`, so all
  three carry F1.
- `:10`, in the round-1 repair section, still says "0 of the 12 workspaces are unscoped today." (N5).
- "Battery" gives 0 hits; the main pointer is `973965a8`; the evidence digests at `:44`, `:58`, `:86`, `:88`, `:93`, `:98` and
  `:108` match the files at `93dc0390` (`sha256sum` over each blob).

## 4. Findings

### F1 — The six lines are still false, as written, for a workspace's declaration when the root's manifest declares the same alias (blocking: a sentence of the new clause is false)

- **The sentence**, `workspace-reach.testkit.ts:64-67` at `93dc0390`: "npm 11.5.1 fetches that spec from the registry unless the alias
  is declared under a workspace's own name and either the root's manifest declares it or the alias's range is `*`, absent or one that
  workspace's version satisfies; then npm links the workspace".
- **Evidence.** [Observed, §3.2 Q1, Q12] Take app's declaration `wlib: npm:typescript@^5.5.0`. It is declared under a workspace's own
  name, and the root's manifest declares it too, byte for byte. So the sentence says npm links the workspace. npm fetches
  `typescript@^5.5.0` from the registry instead, exactly as it does when app alone declares it (Q12).
  - Read as written, the condition is about what the root's manifest declares, not which manifest the declaration is in. It holds in
    Q1, and the sentence is then false.
  - The parenthetical ("npm skips any root declaration under a workspace's name, whatever its version") explains the root's own
    declaration. It does not say that the root's declaration leaves another manifest's declaration unchanged.
  - [Observed, §3.2] arborist drops the root's edge only (`node.js:923-929`), and checks the workspace's edge by its own range
    (`dep-valid.js:46-53, 61-63`).
  - [Observed] Over 51 recorded cases, the sentence read as written disagrees with npm on exactly one, Q1. Neither the lane's probe
    nor round 2's declared a name in two manifests, so `NPM_EXPECTED` never tested this.
- **The alternative reading, disclosed.** Read "the root's manifest declares it" as "the declaration is in the root's manifest", and
  the sentence holds for all 51 cases. Nothing in the text carries that scope. Round 2 ruled the same kind of unscoped condition
  blocking (its F1, "Nothing in the text carries that scope"), and the brief's rule makes a still-false sentence REVISE. So I rule it
  blocking. The owner may instead rule the per-declaration reading as intended, which leaves this round with notes only.
- **Impact on the guards.** None [Observed]:
  - every `npm:` alias is refused (failing closed);
  - every workspace is `@syzygy/`-scoped (12 of 12 at `93dc0390` and `973965a8`), and `resolveIn` reads such a name through the
    `@syzygy/*` branch (`testkit:106-107`) before `localNames`;
  - 0 of the tree's 29 dependency versions, over 13 manifests, match the pattern (`summary.json`'s `faithfulTree`, which `--check`
    regenerates byte for byte).

  The fix is comment-only.
- **Failure scenario.** [Inferred] A later GP-Q0 ruling on narrowing the `npm:` refusal reasons from this sentence. It concludes that
  when the root's manifest declares an alias under a workspace's name, the same alias in a workspace's manifest links the workspace,
  and it lets the guards read that name as the workspace. npm in fact puts the registry package at
  `<workspace>/node_modules/<name>`, from arborist's nested placement of an invalid edge, which I could not install offline. The
  guard would then follow an edge to a module Node never loads.
- **Proposed fix: exact text for the owner** (comment-only; `f1-r3-replacement.txt`, sha256
  `2aad70a67dbcb898a27f7b5f09641ac77a8d3d5c9790970cfd42ddfb8f2ef432`). Replace `workspace-reach.testkit.ts:64-69` at `00b7dcf7`
  (round 2's six lines) with these six:
  ```
   * - `npm:`: an alias. npm-package-arg 12.0.2 accepts only a registry spec after `npm:`. npm 11.5.1 skips each declaration in the
   *   root's manifest under a workspace's own name, whatever its version, and links that workspace. For every other declaration,
   *   npm fetches the alias's spec from the registry unless that declaration is under a workspace's own name and the alias's range
   *   is `*`, absent or one that workspace's version satisfies; then npm links the workspace, as for a plain range so declared.
   *   Every workspace here is `@syzygy/`-scoped, and the `@syzygy/*` branch reads such a name before this pattern. Its target may
   *   carry a workspace package's name, which other package managers can link locally; every alias is refused, failing closed.
  ```
  Each clause has evidence [Observed]:
  - only a registry spec after `npm:`: the lane's `npa-probe.json` and §3.2 `npa-alias-r3.json`;
  - the root's declaration skipped, whatever its version: lane 10–12; round 2 A3, A4, R1, R2, R4–R7 and F3 (all four root fields);
    mine Q4–Q7; `node.js:923-929`;
  - every other declaration, by its own range:
    - registry under a name no workspace has: lane 0–2 and 13; round 2 B1, B2, R3 and R8;
    - `*` links: lane 3 and 6; round 2 C3 (a prerelease workspace);
    - absent links: lane 9; round 2 F1 and F2; mine Q11;
    - a satisfied range links: lane 4; round 2 C2 and F5; mine Q2, Q3, Q8 and Q10;
    - an unsatisfied range or a tag requests the registry: lane 5; round 2 A1, A2, C1, C4, F4, F6 and R9; mine Q1, Q9 and Q12;
  - "as for a plain range so declared": lane 7 and 8;
  - the `@syzygy/*` sentence: `testkit:106-107`, and §3.7;
  - the last sentence is unchanged from round 2 (see N4).

  Checked [Observed]:
  - applied to `00b7dcf7`'s testkit (`tools/testkit-with-f1-r3.ts`), the token streams are equal (1,287 / 1,287) and so are the
    emits (`comment-only-f1-r3.json`);
  - it is six lines, so `LOCAL_VERSION` stays at line 79, and record.py's line-79 mutation needs no move;
  - the widest line is 129 characters, within the comment's existing 134;
  - every line has an even number of backticks, so no code span is broken across a line;
  - it contains neither `F1_RETIRED` phrase, and it carries `NAMED_IN_COMMENT`'s "npm-package-arg 12.0.2 accepts only a registry spec
    after `npm:`".

  If the owner adopts it, these follow:
  - record.py: `F1_CLAUSE` takes the six lines, and `F1_CLAUSE_SHA256` becomes `2aad70a6…` (the file's digest above). `F1_RETIRED`
    gains round 2's "either the root's manifest declares it".
  - `npm_alias_probe.py`: a case shape with more than one declaration, and Q1 (root and app both `wlib: npm:typescript@^5.5.0`,
    expected registry `typescript`) in `CASES` and `NPM_EXPECTED`, keyed by both manifests.
  - The PR body: `:4`, `:102` and `:119` follow the new text.
  - The dispositions record (round 2's N3) names that round 2's text was false for this case, as round 2 named round 1's.

### N1 — record.py's new REPAIR1-to-HEAD check has two predicates that no `--selftest` entry exercises (low; evidence tooling)

- **Evidence.** [Observed, §3.5] The check at `record.py:387-392` has three predicates:
  - the path test, `since != [KIT]`;
  - the span test;
  - the ` * ` prefix test.

  Dropping the path test (S5) or the prefix test (S4) leaves `--check` matching and `--selftest` at 70/70, exit 0. Both of the new
  selftest entries (`:500`, `:501`) put a line at 79, which only the span test kills. `since` is read from `git` directly and is not
  `hooked`, so no selftest entry can reach the path test. Each predicate does fail when its own input is mutated, so the checks work
  today: G4 (`README.md`) kills the path test, and T5 kills the prefix test. Rule 6 asks for that per predicate in `--selftest`
  (`AGENTS.md:126-127`).
- **Failure scenario.** A later edit to record.py drops or weakens the path test, for example by widening the evidence-directory
  exclusion. `--selftest` still reports every mutation killed. Then a product file changed after the suite ran passes the claim that
  "HEAD differs from REPAIR1 only in testkit comment lines".
- **Proposed fix** (evidence tooling only):
  - wrap `since` as `hooked('since', since)`;
  - add `'a non-evidence path changed since the suite ran': {'@since': lambda names: [*names, 'README.md']}`;
  - add `'a non-comment line inside the span since the suite ran': {f'@lines {KIT} {REPAIR1[:8]}': lambda lines: [*lines, ['+', 70,
    'const X = 1;']]}`.

  The second entry is T5, and it is killed only by the prefix test. Or drop the prefix test, since the span test already refuses any
  line that closes the comment (G1). A follow-up bead is enough. If F1's follow-ons touch record.py, fold it in there.

### N2 — `F1_RETIRED` bans two phrases, not round 1's rule (low; evidence tooling and PR-body wording)

- **Evidence.** [Observed, §3.5 T2] A testkit that keeps the six lines once and adds round 1's rule in its own words passes both
  `--check` and `--selftest`. The added text is "unless the alias is declared under a workspace's own name and that workspace's
  version satisfies it". `F1_RETIRED` (`record.py:105`) holds round 0's "npm installs it from the registry" and one phrase of round
  1's, "as for any dependency declared under a workspace's name". The PR body (`:15`, `:49`) says "neither round 0's nor round 1's
  phrase remains". That is true of the two phrases chosen.
- **Failure scenario.** A later edit restores round 1's false branch beside the clause, in different words, and the record still
  passes. This is low-likelihood, because `kit.count(F1_CLAUSE) == 1` still holds the clause itself.
- **Proposed fix.** Add "and that workspace's version satisfies it" to `F1_RETIRED`, and round 2's "either the root's manifest declares
  it" if F1 is adopted. Or word the PR body as "neither retired phrase remains".

### N3 — The probe's `npm --version` call reads the caller's directory `.npmrc` (low; evidence tooling)

- **Evidence.** [Observed, §3.6] Every case call runs with `cwd=` a scratch case root. The version call has no `cwd`: the helper is
  defined at `npm_alias_probe.py:87` and called as `version('npm', '--version')` at `:91`. So npm opens `<caller's cwd>/.npmrc` as
  project config. The trace shows it once, ENOENT, for the directory I ran from. The docstring (`:5-7`) says "no npmrc of the host is
  read". The sentinel `$HOME/.npmrc` is opened 0
  times, and inherited `npm_config_*` variables are filtered, so round 2's N1 is repaired. The builtin `<npm>/npmrc` is opened by
  every npm call, as npm always does (ENOENT here). The Syzygy tree tracks 0 `.npmrc` files.
- **Failure scenario.** The probe is run from a directory, or inside a project, whose `.npmrc` holds a token. npm loads it for the
  version call. No request is made, but the record's claim is wider than the behaviour.
- **Proposed fix.** Pass `cwd=scratch` to `version(...)` (a scratch directory with no `package.json` above it). Or narrow the docstring
  to "no user, global or HOME npmrc of the host is read". A follow-up bead is enough.

### N4 — "which other package managers can link locally" is stated as fact, and no round has observed it (low; carried from round 0)

- **Evidence.** [Observed] The clause states it as fact: "Its target may carry a workspace package's name, which other package managers
  can link locally". That is `testkit:68-69` at `93dc0390`, unchanged from round 0, and it is kept unchanged in F1's replacement.
  Round 2 marked it [Unknown]. The bytes carry no such mark. I could not probe it offline:
  - `unshare -rn` fails ("write failed /proc/self/uid_map: Operation not permitted"), so I could not make a network-less namespace;
  - pnpm is not installed;
  - I did not run yarn or bun without a guaranteed unreachable registry.

  [Unknown] whether any package manager links an `npm:` alias whose target names a workspace.
- **Failure scenario.** A later ruling cites the clause as evidence that some package manager links such an alias locally. That would
  rely on a sentence no review has checked.
- **Proposed fix** (optional, comment-only). Replace "which other package managers can link locally" with "which another package
  manager might link locally (not observed here)". Check the width: the text grows by 23 characters, so it must be rewrapped to stay
  within six lines, or the line-79 mutation moves. Or leave it, since the refusal fails closed either way. Owner's or follow-up's
  choice.

### N5 — Process: one stale count in the PR body, the earlier bullets' root exception, and the dispositions still owed (process)

- **Evidence.** [Observed]
  - PR body `:10` (the round-1 repair section) still says "0 of the 12 workspaces are unscoped today." That is the undated form N2
    retired from the code. The dated form is at `:18` and `:117`.
  - Outside this round's lines, which rounds 1 and 2 cleared: the `file:`/path bullet (`testkit:60-61`, "npm reads each as a
    directory or a file") and the `link:`/`workspace:` bullet (`:62-63`, "npm does not install them at all") do not carry the
    root-manifest exception. The six lines now state that exception inside the `npm:` bullet only. Q6 (root `wlib: workspace:*`) and
    Q7 (root `wlib: link:../nowhere`) install with exit 0 and link the workspace. This does not affect the gate: 12 of 12 workspaces
    are scoped, and the `@syzygy/*` branch reads their names first.
  - Round 2's N3: no dispositions record names `GUARD-PINS-FOLLOWUP-2` yet. `git grep -l` at `93dc0390` finds only `record.py`, and
    at `973965a8` it finds nothing.
- **Failure scenario.** A landing copies `:10`'s undated count, or the dispositions record carries round 2's text as the corrected
  premise.
- **Proposed fix.** At landing:
  - date or quote `:10`;
  - write the dispositions record for rounds 1–3, carrying round 1's two corrections (round 2's N3), round 2's F1 text as superseded,
    and this round's F1 outcome;
  - open a follow-up bead for the `:60-63` root exception, if the owner wants it.

## 5. Every changed output

None [Observed]:
- No product file is in the branch: record.py's `productFilesChanged` is empty, and the 26 branch paths are the two code files and 24
  under `docs/evidence/syzygy-bpyt-8-39/`.
- In this round, the test file is byte-unchanged, and the testkit's token stream and comment-free emit are unchanged (§3.3).
- The four guard files give 171/171 at `93dc0390` and on the merge with `973965a8`, the same totals the evidence records for
  `00b7dcf7` (`repeat-runs.json`, 5 runs of 171/171, checked by `record.py --check`).
- Hosted `checks` and `node` pass at `93dc0390`.

## 6. Verdict on each round-2 finding's repair

| Round-2 finding | Repair verdict |
|---|---|
| F1 (the `npm:` sentence false for a root declaration) | **Applied exactly, not cleared.** Lines 64–69 are round 2's six lines, byte-equal, and the root-declared cases reproduce (lane 10–13, 14/14 byte-equal). But round 2's text is itself false as written when two manifests declare the same alias (Q1): new F1, with exact text for the owner. |
| N1 (the probe read the host's npm config) | **Repaired.** Every npm and node call runs with `env=ENV`, `npm prefix -g` is gone, and arborist's path comes from `realpath(which npm)`. A sentinel `$HOME/.npmrc` is opened 0 times, and inherited `npm_config_*` / `NPM_CONFIG_*` variables are filtered (§3.6). Residual: N3, the cwd `.npmrc` of the version call. |
| N2 (the undated count) | **Repaired.** "At syzygy-bpyt.8.39, 0 of the 12 workspaces are unscoped;" is true at `93dc0390` and `973965a8` (§3.7), and both `record.py` literals follow it. Residual: PR body `:10` (N5). |
| N3 (process) | **Partly repaired, rest at landing.** The main pointer is `973965a8`, and 0 of 26 paths are shared (reproduced). The battery line is removed for the coordinator to fill. The dispositions record is still unwritten (N5). |

## 7. Test quality

- The PR's test rows are unchanged this round (the test file's blob is equal at `5f0d5547` and `00b7dcf7`). Rounds 1 and 2 cleared
  them. Net test delta this round: +0 titles. Over the PR: `Tests: +6 ~0 -0`, 165 → 171.
- record.py's new checks meet the bar's core rule (`SKILL.md:42`, "**A test is worth keeping only if some plausible bug makes it
  fail.**") for the clause pin, killed by S1, S2 and T1, and for the late check, where G1–G4 fail and G5 and G6 pass.
- Two of the late check's three predicates have no `--selftest` entry (N1). That falls short of `SKILL.md:110-112` ("Verify new
  tests fail when the guarded behavior is broken") as rule 6 applies it per predicate.
- The retired-phrase predicate is load-bearing (S6 drops the selftest to 68/70) but narrow (N2).
- The probe's `NPM_EXPECTED` covers one declaration per case only, which is how F1's case went untested. F1's follow-ons add a
  two-manifest case.
- The lane's probe (all 14 recorded cases) and its comment-only tool reproduce byte for byte. I did not re-run round 2's probe; I
  scored its recorded outputs (§3.2). No test was flaky in my runs.

## 8. Cleanup

I deleted the scratch clone (251 MB) and every TMPDIR I made (`/tmp/r541c-1` through `/tmp/r541c-9`, including the 7.9 MB strace
trace). `ls -d /tmp/r541c-*` now finds nothing. I deleted nothing else. The kept files are all in `rev-541c/`, and none is over
300 KB. The table lists every kept file except this raw, whose sha256 is in the reply.

| Path | sha256 |
|---|---|
| `branch-paths.txt` | `60895e35859a54ee78ae012454347d3a8b0c41c916ddc52ae1483f0965d5e3c1` |
| `clause-predict-r3.json` | `64e54a2aa8927c5d5f51064b2625b76ce99a3bdd640274d618fe6cfcf9169809` |
| `code-pr.diff` | `60ff6905fdcdf5cfd8ac0842741543dcf543c82ebdf3ec3496ded9ff4f6a2017` |
| `code-r3.diff` | `aa09ddcac7467953300bbe5682a04f6ccc5b1ce6cbfea64fb1389b2104da8dbf` |
| `comment-only-f1-r3.json` | `6ca881c9bf4cb6973b32e0b48817b4f5a4f2c88b24a5cb8fd7f91c104008ef30` |
| `comment-only-lane-rerun.json` | `4b3bc2aaf827e2ed970b9a050b14133d0c739edadec39055317ae0092f94e932` |
| `comment-only-r3-kit-base.json` | `0131ba13d56811b5d03112285d9c8553de49c0e35973eedd89c2797fa233e70e` |
| `comment-only-r3-kit.json` | `4f414a13377d6d79a1cec5251d13dd164ce50ef4443106715eee08ddd4b52b0b` |
| `comment-only-r3-test.json` | `1efd496366d164ce47e37699021c1bc08d2931e0f156252889cf1561bb1af987` |
| `f1-r3-replacement.txt` | `2aad70a67dbcb898a27f7b5f09641ac77a8d3d5c9790970cfd42ddfb8f2ef432` |
| `gh-pr-checks.txt` | `75dcf05430c3907611d989016c479dcae415c4dfc8d139d6085b45facfd13fa7` |
| `guards-head.json` | `9e69b2eabc5375373db30d9544f46f35c10ec7885d9e3b4358230b085cf30e76` |
| `guards-head.load` | `ef657c14d5b05cb65ab83f038d26c721ff2a51b661997df244b689074b9183f3` |
| `guards-head.log` | `8495c119cf2a685919c204bae9318b46f3fcd786525c5f9a4d8797e981ec0b11` |
| `guards-merge.json` | `eb54989ebbc26de44ed5a6f8a94ec11ecbd7f14d2e5ea3c76f3b0ec8aaefe380` |
| `guards-merge.load` | `8c16c5a41ef18af92f4664356619c316d3bad28bd9657cece4fbb1d79e0c148c` |
| `guards-merge.log` | `3daf03a69062d4b34656a03ae20b32a36d8d24e4bfe9df8c29f10d00493e2556` |
| `hosted-check-runs.tsv` | `b82b62e6e5407bf0f63d4036154364c61a0f732eb638345c23ccc50357176402` |
| `main-paths.txt` | `b906501729c8ed9d4b007997bafc530c5e374462b50f51d179367411059e044d` |
| `npa-alias-r3.json` | `ba6a38bd89b42f7a5cb723a351349d1eaff9a388e34b22af6b8f215f7acb155c` |
| `npm-alias-probe-lane-rerun.json` | `e85c699bfa3515d563c5e66dbeb7db4f03de9f99214089bc755d93178232ddb5` |
| `npm-alias-probe-lane-rerun.load` | `c10a8f8201c93878ff1d884742bce97ed1817db32622e0ad980d7f9dfa094371` |
| `npm-alias-probe-lane-rerun.log` | `ccc71773ec37536c5c2808c646630fecfaf6c60e6ed5c6d9779337f45f85866a` |
| `npm-alias-probe-r3.json` | `3c06b6ce7e67df743d44f0a5b3df83aa1b99e498040e2b9365f6b14b6504bec2` |
| `npm-alias-probe-r3.load` | `c0153b1cae67729f54c97cc3e6768493e8d62e80c59981233734ca7928ff2851` |
| `npm-ci-head.log` | `8948f6f3246243344b904ec08788e37e94fa7dfc6eb823af96968c041b60ac4b` |
| `npm-ci-merge.log` | `b6640843f1adc9157410536aed53695255a92226d17e56daba188c8d3e39b40f` |
| `npmrc-sentinel-lane.load` | `068a06752f954b007b49196f9af83afee4d151da26c474ea3bed8b7770e8f856` |
| `npmrc-sentinel-lane.txt` | `83617ee8d9c3048e80d7b9a5cb3baf5d0d103d66c69da645e51de097693f2dac` |
| `pr-body-r3.md` | `443e6911c2f97366cff5664e0bad6b5bfc9933a86aca911783d71df3374ae498` |
| `r3-review.diff` | `db9e4ee53a6c0eeb2e4af931f9ce0fb5d1344b0fd50bdd705bca71719a6c359b` |
| `record-mutants-r3.json` | `5bee38878dc25e04a3575ccf1c9806056074e2ae37b8775bb71c0552f1c8ba73` |
| `record-mutants-r3.load` | `8a1b77ba82f25329f3313da07dc88969a6f97dc31c27100906f46a49b343c986` |
| `record-selftest.log` | `40288e0b2dd4875e0e3e06b07fc5dd327c3632b5c7ca58a4b77609d6300e59f7` |
| `record-t5-r3.txt` | `5bf73c2a3fcce0408b35cb1240fdf99937e7b9cac46a6f171f792895e7714e2d` |
| `tools/clause_predict_r3.cjs` | `ce795e1eaf46b0f065a756b3928fd6d3544a422d2e1a353952a2b6364f8174e8` |
| `tools/npa_alias_r3.cjs` | `33f3a05c5f4970194aabfeb1213e4350252509f7f337441a7a2318f6614f1892` |
| `tools/npm_alias_probe_r3.py` | `bdb9230598dcb8a134f98766166647484a91903d4b830b6b52c9c7c3b00a498d` |
| `tools/record_mutants_r3.py` | `f7d1469c05b447ef2ccb6813f07db17e0592adbfd2d5215c7ce187d8b6a85bca` |
| `tools/record_t5_r3.py` | `6855585a1bdc07269e40623708b24585c084b5d1155cd6dd8809cdec47f4c891` |
| `tools/testkit-with-f1-r3.ts` | `ca95245c8fd80b511d9b15c5fce3ab72eb2b5e5ef4bbd6fe9f7614721096bf79` |
| `tools/tokens_r3.cjs` | `37dd35573f48327b842b4b052c507db3b522cac03b11b2cb0223e032eb466d08` |
