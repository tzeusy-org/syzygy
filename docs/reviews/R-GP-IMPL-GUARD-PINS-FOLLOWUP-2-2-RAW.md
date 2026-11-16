# R-GP-IMPL-GUARD-PINS-FOLLOWUP-2-2 — CC-REV-1 implementation review of syzygy-bpyt.8.39, round 2
Verdict: REVISE
Reviewed commit: 58e8f604
Subject: r2-review.diff sha256 6b3da14cf9c3c9a551eca65c9e54a9bd058a3f2db9f7765ae5f709dafd64384f

Reviewer: fresh-context CC-REV-1 reviewer (rev-541b), 2026-10-27. I did not author the change, did not review round 1, and changed
none of the subject's bytes. I read no body of Butlers or of any other observed repository, and opened nothing under `~/.claude/`,
`~/.config/` or any token store. npm, arborist, npm-package-arg and semver were read from node's own install (node v24.6.0,
npm 11.5.1, arborist 9.1.3, npm-package-arg 12.0.2, semver 7.7.2). Every npm call I made ran offline with HOME set to an empty
scratch directory, empty user and global configs, an empty private cache and a registry of `http://127.0.0.1:9/`.

One blocking finding. The repaired `npm:` sentence is still false for npm (F1): npm ignores a root-manifest declaration under a
workspace's name and links the workspace, whatever the alias's range. §4 gives the exact replacement text for a narrow round 3.
Fixing it is comment-only, and nothing a gate accepts or refuses changes, in the reviewed bytes or in the fix. The repairs of N1, N2,
N3 and N4 are met. There are three notes.

## 1. Subject identity checks

All [Observed]. I worked in a scratch clone of `/home/tze/GitHub/syzygy`, with `https://github.com/Tzeusy/syzygy.git` added as a
remote and `agent/syzygy-bpyt.8.39` and `main` fetched from it.

- `sha256sum r2-review.diff` (`git diff 5db78a26 58e8f604`): `6b3da14cf9c3c9a551eca65c9e54a9bd058a3f2db9f7765ae5f709dafd64384f`.
  **Match.** `24 files changed, 1465 insertions(+), 497 deletions(-)`: 8 added, 15 modified, 1 deleted
  (`start-gates-default-reporter.log`). Two are the code files, and the other 22 are under `docs/evidence/syzygy-bpyt-8-39/`.
- `git diff 308a62f4 5f0d5547 -- <the two code files> | sha256sum`: `a825177271320866bddbe9ab688d7f0c791b3e4584ee43c4b2add7dd9afefca6`.
  **Match.** `git diff 5db78a26 5f0d5547` gives the same digest over the same two files, and is `2 files changed, 12 insertions(+),
  4 deletions(-)` with no path filter. The test file gets `+2`, and the testkit gets `+10/−4`. Run with no path filter,
  `git diff 308a62f4 5f0d5547` also carries the 17 evidence files that `5db78a26` added (sha256 `1a5a0257…`). The brief's digest is
  the one over the two code files.
- `git diff d38d7a3c 5f0d5547 -- <the two code files> | sha256sum`: `4a0291695ff094172f09f21ceaf5caf6eb2c844e9d32c799bff9465e4509feb1`.
  **Match.**
- Every path `git diff --name-only 5f0d5547 58e8f604` names is under `docs/evidence/syzygy-bpyt-8-39/` (22 paths), so the evidence
  commit moves no code.
- The parents chain: `58e8f604^ = 5f0d5547…`, `5f0d5547^ = 5db78a26…`, `5db78a26^ = 308a62f4…` and `308a62f4^ = d38d7a3c…`.
- `git ls-remote`: `refs/heads/agent/syzygy-bpyt.8.39` is at `58e8f60456e9de8d06cd4f8db5defe23e69b7112`. `gh pr view 541` gives
  `"headRefOid":"58e8f60456e9de8d06cd4f8db5defe23e69b7112","state":"OPEN","updatedAt":"2026-10-27T10:39:10Z"`, and nothing had
  changed at 12:10:29Z. My copy of the body, `pr-body-now.md`, has sha256 `a7b8d3b6…`, and the live body hashes the same.
- **Hosted CI.** `gh pr checks 541 -R Tzeusy/syzygy`: `checks	pass	24m42s` and `node	pass	4m40s`. For both runs (40489621927
  governance-docs and 40489621910 node-ci), `gh run view` gives `"conclusion":"success"` and
  `"headSha":"58e8f60456e9de8d06cd4f8db5defe23e69b7112"`.
  - Both runs checked out `refs/pull/541/merge`: `HEAD is now at 0528e539 Merge 58e8f60456e9de8d06cd4f8db5defe23e69b7112 into
    41932c3b5aba567376fea3b32a80a54f8b6b30ab`. That is main after #533, so they ran before #540 landed.
  - The node log gives `Test Files  244 passed | 3 skipped (247)` and `Tests  5441 passed | 5 skipped (5446)`; the system tests give
    `Tests  49 passed (49)`.
  - The governance log gives `32 OK, 21 WARN, 0 FAIL (53 checks)`.
- **Main has moved** to `973965a82f82d9b90af05e4b96524aae0d9dbec4` (#540). Before it are `41932c3b` (#533) and `eb8fb6cb` (#539). It
  was still there at 12:10:29Z.
  - `git diff --name-only d38d7a3c 973965a8` gives 351 paths (`main-changed-paths.txt`). The PR's net paths over `d38d7a3c..58e8f604`
    number 26 (`pr-paths.txt`). The paths any PR commit touched number 27 (`pr-paths-ever.txt`), because
    `start-gates-default-reporter.log` was added and then removed. **0 of 26, and 0 of 27, are among main's 351** (`comm -12`).
  - Two of main's changed paths are resolver inputs, both from #539: `apps/three-surface-poc/package.json` and `package-lock.json`.
    No `package.json` is added under `apps/*` or `packages/*`.
  - Local merge of `58e8f604` with `973965a8`: `092d508e04eb2dbdf8f01a8300a3eb6f6c3f36f0`, tree `5e6797ca72f99d8cdf269fd57c091a594a38f1f6`,
    no conflict. `git diff 973965a8 092d508e | sha256sum` gives `0e12a678…`, equal to `git diff d38d7a3c 58e8f604 | sha256sum`, so
    the PR applies unchanged over current main. After `npm ci` on the merge (`added 117 packages`, exit 0):
    - the four guard files pass 171/171 (load1 28.3);
    - X3 and X5 are each killed by their own new row alone (§3.3);
    - `record.py --check` gives `summary.json matches ; problems: 0`, exit 0.

## 2. Clauses relied on (quoted), and the class ruling

- CC-REV-1 (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md:18-20`, at `58e8f604`): "Changes touching any of
  seven classes require review by an independent, fresh-context reviewer, and the agent performing the change never finally decides
  which classes it touches."
  - `:31`: "1. **authority boundaries** — write-universe, typed-authority table,"
  - `:37`: "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
  - `:40`: "6. **public interface** — machine-queryable endpoints, adapter contracts,"
- GP-Q0 (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`, at `58e8f604`):
  - `:52-55` (list items joined): "\"Behavior-preserving\" means none of the following changes: a rendered byte, a wire format, a
    refusal string or an exit code; a signed or digest-bound artifact; a consent, security or retention decision."
  - `:62`: "**Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4
    (security), and class-6 pull requests that remove an endpoint."
  - `:95-96`: "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."
- `AGENTS.md` at `58e8f604`, which the PR does not change (`git diff --quiet d38d7a3c 58e8f604 -- AGENTS.md` exits 0):
  - rule 6 (`:126-127`): "Mutate the input and confirm the check fails, per predicate, before trusting it";
  - rule 9 (`:132`): "A claim of absence needs a sweep with a denominator.";
  - rule 11 (`:134`): "An evidence record names its subject and the subject's digest".
- The test-rigor bar, `git show 58e8f604:.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`, is quoted in §7.

**Class ruling: 1, 4 and 6, with no endpoint removed.** I agree with the PR and with round 1.
- [Observed] The two changed files are test-side. `git grep -c -F 'workspace-reach.testkit' 58e8f604 -- apps packages scripts` finds
  the testkit named in exactly three files: `subpath-imports.test.ts`, `island-boundary.test.ts` (an import and a comment) and
  `workspace-reach.test.ts`.
- [Inferred, as round 1 ruled] Classes 1 and 4: the resolver is the island guard's mechanism, and that guard is the rule-6 kill
  evidence for the 8.1 ruling's class-1 and class-4 claims.
- Class 6: the daemon-path guard walks `@syzygy/polaris-dossier`'s exports with the same resolver.
- No `exports` entry, `package.json`, route or endpoint is in the subject. So GP-Q0's three extra checks apply; the owner notice is due
  at landing [Unknown: not yet due].

**GP-Q0: nothing a gate accepts or refuses changes.** [Observed]
- The testkit change is comment-only, by esbuild and by a line-level check (§3.7). The lane's TypeScript emit/print proof re-runs to
  a byte-identical record.
- The test diff `5db78a26..5f0d5547` is one insert of 2 lines. It equals round 1's FIX541-rows-only edit applied to `308a62f4`'s file
  (`fix541-equal.json`).
- The repair's four guard files pass 171/171 against BASE's testkit bytes (`R541B-PIN`, §3.4). The new rows pin behaviour the
  resolver already had.
- The whole suite at `58e8f604` has 0 failures (§3.8).
- The F1 fix proposed in §4 is also comment-only: its esbuild output equals HEAD's, and its 5 removed and 6 added lines all lie
  inside the doc comment. So the stop clause (`:95-96`) is not triggered by the bytes or by the fix.

## 3. What I ran, and the results

I ran one vitest process at a time, each with a private TMPDIR under `/tmp/r541b-*`, and deleted every TMPDIR afterwards.
`tools/mrun.py` is my mutant runner, written for this round; it shares no code with `mut.py`, `record.py` or round 1's `rmut.py`. For
each mutant it:
- asserts a clean tree;
- applies each edit, requiring that its `old` occur exactly once;
- runs `npx vitest run --reporter=json` over the mutant's files and projects, and reads the failing rows from the report's
  `assertionResults`;
- restores the files with `git checkout`, and asserts a clean tree again.

Over all 34 runs: every `old` count is 1, and there are 0 timeouts and 0 errors. load1 ranged 25.2–44.5, and each run took 3.5–11.0 s.

### 3.1 Setup
- [Observed] One clone, checked out in turn at `58e8f604` (the repair's code), `5db78a26` (round 1's commit) and the merge
  `092d508e`. I ran `npm ci` after each switch: `added 117 packages`, exit 0 every time.
- Round 1's spec files, kept in the evidence directory, are byte-identical to round 1's own copies: `rev541-specs.json` `3f9d1900…`
  and `rev541-fix-specs.json` `50d59d95…`. At `5db78a26` I ran from round 1's copy, since the evidence directory did not hold it yet.

### 3.2 F1: what npm installs, by the lane's probe and by mine
- [Observed] **The lane's `npm_alias_probe.py`, re-run** offline (`npm-alias-probe-lane-rerun.json`, load1 76.7 → 70.0) is
  byte-identical to the lane's `npm-alias-probe.json` (`cmp`). Its nine outcomes reproduce. The cache held only `_logs` afterwards.
  - I ran it with HOME, `npm_config_userconfig` and `npm_config_globalconfig` set to empty scratch files in the outer environment.
    Two of its npm calls do not use its private environment (N1).
- [Observed] **My own probe**, `tools/npm_alias_probe_r2.py`, written for this round. Each case is a fresh project with workspaces `w`
  (`wlib` 1.0.0), `s` (`@syzygy/slib` 1.0.0), `p` (`plib` 1.0.0-beta.1) and `app`, and the case puts one dependency in one manifest.
  For each case the probe:
  - runs `npm install --package-lock-only --ignore-scripts`;
  - on success, runs a full install, `npm ls --all`, and Node's `require.resolve('<name>/package.json')` from `app` and from the root.

  Load1 was 45.8 → 38.6 for the main and root sets, and 22.5 → 22.2 for the fix set. Every case's cache held only `_logs`
  afterwards. Re-running the main and root sets with the final tool gives records equal to the kept ones.

| Case | Declared in | Declaration | npm | Node loads from `app` |
|---|---|---|---|---|
| A1 | app | `wlib: npm:wlib@^2.0.0` | ENOTCACHED `http://127.0.0.1:9/wlib` | — |
| A2 | app | `@syzygy/slib: npm:typescript@^5.5.0` | ENOTCACHED `…/typescript` | — |
| **A3** | **root** `dependencies` | **`wlib: npm:typescript@^5.5.0`** | **exit 0, `node_modules/wlib` → `../w`, `npm ls` exit 0, no `npm warn` line** | **`w/package.json` wlib 1.0.0** |
| A4 | root | `wlib: npm:typescript@*` | link `../w` | `w/package.json` |
| B1 | app | `dossier: npm:wlib@1.0.0` | ENOTCACHED `…/wlib` | — |
| B2 | app | `dossier: npm:@syzygy/slib` | ENOTCACHED `…/@syzygy%2fslib` | — |
| C1 | app | `wlib: npm:typescript@latest` | ENOTCACHED `…/typescript` | — |
| C2 | app | `wlib: npm:typescript@1.0.0` | link `../w` | `w/package.json` |
| C3 | app | `plib: npm:typescript@*` (prerelease workspace) | link `../p` | `p/package.json` 1.0.0-beta.1 |
| C4 | app | `plib: npm:typescript@>=0.0.0` | ENOTCACHED `…/typescript` | — |
| D1 | nothing | — | links all three workspaces | each workspace's own `package.json` |
| **R1** | **root** | **`@syzygy/slib: npm:typescript@^5.5.0`** | **link `../../s`** | **`s/package.json`** |
| R2 | root | `wlib: ^5.5.0` (plain range, control) | link `../w` | `w/package.json` |
| R3 | root | `dossier: npm:typescript@^5.5.0` (control) | ENOTCACHED `…/typescript` | — |
| **R4/R5/R6** | **root** `devDependencies` / `optionalDependencies` / `peerDependencies` | **`wlib: npm:typescript@^5.5.0`** | **link `../w`, each** | **`w/package.json`, each** |
| R7 | root | `wlib: github:someone/wlib#v1.tar` | link `../w` | `w/package.json` |
| R8 | root | `dossier: npm:wlib@*` | ENOTCACHED `…/wlib` | — |
| R9 | workspace `w` | `wlib: npm:typescript@^5.5.0` | ENOTCACHED `…/typescript` | — |
| F1 | app | `wlib: npm:typescript` | link `../w` | `w/package.json` |
| F2 | app | `plib: npm:typescript` | link `../p` | `p/package.json` |
| F3 | root | `wlib: npm:typescript@latest` | link `../w` | `w/package.json` |
| F4 | app | `wlib: npm:typescript@<1.0.0` | ENOTCACHED `…/typescript` | — |
| F5 | workspace `s` | `wlib: npm:typescript@*` | link `../w` | `w/package.json` |
| F6 | workspace `s` | `wlib: npm:typescript@^5.5.0` | ENOTCACHED `…/typescript` | — |

- The brief's two cases:
  - An alias under a workspace's name whose range the workspace does not satisfy: A1, A2, F4 and F6 request the registry, as the
    clause says, but **A3, R1 and R4–R6, declared in the root's manifest, link the workspace**.
  - An alias whose target carries a workspace's name: B1, B2 and R8 request that name from the registry, and never link.
- [Observed, the arborist 9.1.3 source] Why the root differs:
  - `lib/node.js:876`, in `#loadWorkspaces`, gives the root one edge per workspace: "new Edge({ from: this, name, spec:
    \`file:${path}\`, type: 'workspace' })".
  - `lib/node.js:923-932`: "#loadDepType (deps, type, ad) { // Because of the order in which _loadDeps runs, we always want to //
    prioritize a new edge over an existing one for (const [name, spec] of Object.entries(deps || {})) { const current =
    this.edgesOut.get(name) if (!current || current.type !== 'workspace') { new Edge({ from: this, name, spec, accept: ad[name], type
    }) } } }".
  - So for every one of the root's four fields, a declaration whose name already has a workspace edge builds no edge at all. Its spec
    is never resolved, checked or fetched.
  - In any other manifest, the arborist path round 1 quoted applies, and I re-read it here:
    - `lib/arborist/build-ideal-tree.js:1227`: "const isWorkspace = this.idealTree.workspaces && this.idealTree.workspaces.has(spec.name)";
    - `:1250-1252`: "if (isWorkspace) { … if (existingNode && existingNode.isWorkspace && existingNode.satisfies(edge)) {";
    - `lib/dep-valid.js:61-63`: "case 'alias': // check that the alias target is valid / return depValid(child, requested.subSpec,
      requestor)";
    - `:47`: "if (requested.fetchSpec === '*') {", then "return true";
    - `:53`: "return semver.satisfies(child.version, requested.fetchSpec, true)";
    - `:65-68`: for `tag`, "return child.resolved && npa(child.resolved).type === 'remote'".
- [Observed] A note on "satisfies". `semver.satisfies('1.0.0-beta.1', '*')` and `semver.satisfies('1.0.0-beta.1', '>=0.0.0', true)`
  are both `false` under npm's semver 7.7.2. Yet npm links for `*` and for an alias with no version (C3, F2), because of the `*`
  short-circuit at `dep-valid.js:47`.
  - So "that workspace's version satisfies it" holds only as npm checks it, not as semver does.
  - Every workspace here is at `0.0.0`, which is not a prerelease, so this does not falsify anything in the tree. The replacement
    text in §4 states it anyway.
- [Observed] **The tree today:** at `58e8f604` and at `973965a8`, the root manifest declares 0 workspace names. Every one of the
  25 (head) and 24 (main) dependencies declared under a workspace's name is `"0.0.0"`, and 0 of the 29 (head) and 28 (main)
  versions is an `npm:` alias. So the counterexample is not reachable in this tree.

### 3.3 N1: X3 and X5, from round 1's specs

| Mutant | `5db78a26` (round 1) | `5f0d5547` code (`58e8f604`) | Merge `092d508e` | Failing row at the repair |
|---|---|---|---|---|
| BASELINE | survives 169/169 | survives 171/171 | survives 171/171 | — |
| R541-X3 (the `npm:` arm needs an explicit `@version`) | **survives 169/169** | **killed 170/171, 1 row** | killed 170/171, 1 row | "…reads a bare name declared as an npm: alias with no version as naming no module" |
| R541-X5 (the tarball arm skips a spec holding `#`) | **survives 169/169** | **killed 170/171, 1 row** | killed 170/171, 1 row | "…reads a bare name declared as a git dependency whose spec ends in a tarball extension as naming no module" |

- [Observed] Each survives at round 1's commit and dies at the repair **by its own new row alone**. The same holds on the merge.
- [Observed] **Both rows are pins, not changes to the resolver.** The repair's four guard files run against BASE's (`d38d7a3c`)
  testkit bytes, with one edit replacing the whole testkit: `R541B-PIN… survives 171/171`. The testkit's code is unchanged as well
  (§3.7).
- The two rows are round 1's checked text, byte for byte. The test file at `5f0d5547` equals FIX541-rows-only applied to
  `308a62f4`'s, with sha256 `15c395c9…` both ways. The diff is `["insert"]`, `"linesAdded": 2` and `"linesRemovedOrReplaced": 0`.

### 3.4 M7's attribution, and my own mutants

- [Observed] **M7 at `5db78a26`:** `killed 168/169`, 1 failing row, "…an npm: alias of a registry package…". **At the repair:**
  `killed 169/171`, 2 failing rows: that row and "…an npm: alias with no version…". So round 0's "killed by its own row alone" was
  true at its commit and is no longer true at head.
  - M2, M8 and M9 at the repair are each `killed 170/171`, by their own row alone (`m2789-at-repair.json`).
- My mutants, from `rev541b-specs.json`:

| Id | Mutation | `5db78a26` | Repair | Failing rows at the repair |
|---|---|---|---|---|
| Y1 | the `npm:` arm refuses only an alias with no version (X3 inverted) | killed, 2 rows | killed, 2 rows | the registry-alias row, and the pre-existing peer-dependency row (`npm:@syzygy/lib@*`) |
| Y2 | the tarball arm skips a `github:` shorthand (`^(?!github:).*\.(?:tgz…)$`) | **survives 169/169** | **killed, 1 row** | the git-spec row alone |
| Y3 | the tarball arm takes only a spec with no colon (round 1 N1's failure scenario) | killed, 2 rows | killed, 3 rows | the git-spec row and both tarball-URL rows |
| Y4 | the tarball arm drops a bare `.tar` | killed, 1 row | killed, 2 rows | the `.tar` row and the git-spec row |
| Y5 | the `npm:` arm needs a scoped target or a version (`npm:(?=@\|[^@]*@)`) | **survives 169/169** | **killed, 1 row** | the unversioned-alias row alone |
| Y6 | the `npm:` arm refuses only a scoped or unversioned alias (`npm:(?=@\|[^@]*$)`) | killed, 1 row | **killed, 1 row** | the registry-alias (M7) row alone |
| Y7 | the tarball arm case-sensitive (`(?-i:\.(?:tgz\|tar\|tar\.gz))$`) | not run | **survives 171/171** | — (§7) |
| PIN | the repair's test files against BASE's testkit | not run | survives 171/171 | — (§3.3) |

- **M7's attribution is not a defect in the evidence or the tests.** [Observed]
  - The two rows pin different predicates. Y6 is killed by M7's own row alone, at both commits, and X3 and Y5 are killed by the
    unversioned row alone. Neither row is redundant.
  - M7 fails both because its narrowing (`npm:@syzygy/` only) breaks both predicates at once. Either row alone would kill it.
  - The record says so. `record.py`'s `TARGETS` lists both rows for M7 and requires them to be its only failures. The PR body says
    "M7 by its own row and the round-1 unversioned-alias row".
  - "Only together" would misdescribe it: M7 is killed by each row, not by the pair.
- Survivors among my own mutants: **at the repair, Y7 only**. At round 1's commit, Y2 and Y5 survive, and the N1 rows kill both.

### 3.5 N2: the residual sentence
- The sentence (`workspace-reach.testkit.ts:74-77` at `58e8f604`): "Residual (the review of 8.39, N2): a workspace whose name is not
  `@syzygy/`-scoped is read by its bare name as outside the workspace (unless some manifest declares that name with a version this
  pattern matches), while npm links it under that name and Node loads it from there. 0 of the 12 workspaces are unscoped today;
  closing it changes what the guards refuse and needs a GP-Q0 ruling first."
- [Observed] Resolver side. I ran a scratch test (`tools/zz-r541b-n2.test.ts`) once at `58e8f604` from inside the package, then
  deleted it. Over a synthetic workspace with an unscoped `plainlib` that has `exports`, it gives (`n2-resolver-answers.txt`):
  - nothing declared: `null`;
  - `app` declares `file:`: `undefined`;
  - the root declares `npm:`: `undefined`;
  - `app` declares `1.0.0`: `null`;
  - the subpath `plainlib/x`: `null`.

  `Tests  1 passed (1)`. So the bare name reads as outside unless a manifest declares it with a version the pattern matches.
- [Observed] npm side: in case D1, npm links every workspace under its own name, and Node loads each from `app`. The root's
  declarations cannot override this either (§3.2).
- [Observed] "0 of the 12" holds: `apps/*` and `packages/*` hold 12 manifests at `58e8f604` and at `973965a8`, and 0 names are
  unscoped. The root's `workspaces` is `["packages/*", "apps/*"]` at both commits. The sentence is true.
- [Observed] **It does not decide `syzygy-bpyt.1.17`.** `bd show syzygy-bpyt.1.17` is an OPEN P3 decision bead offering (a) a
  precondition row, (b) `localNames` adding each workspace's own name and (c) "Leave it as a named residual". The sentence names no
  closure, and it says closing "needs a GP-Q0 ruling first". Naming the residual is the status quo every option starts from.
- [Observed, recorded, not a finding] An alias under an `@syzygy/*` workspace's name that npm does not link (A2) reads through the
  `@syzygy/*` branch as that workspace's module (scratch case U6: `packages/slib/src/index.ts`), while npm installs the registry
  package. The guards then walk a module Node would not load. That can only add failures, so it fails closed.

### 3.6 N3: `record.py`'s new check
- [Observed] At `58e8f604`, `python3 -I record.py <clone> --check` gives `summary.json matches ; problems: 0`, exit 0.
  `--selftest` gives `selftest: 64/64 mutations make a check fail`, exit 0: 64 `killed` lines and 0 `SURVIVED`. Its two new
  mutations are `killed | an island diff over another old testkit` and `killed | an island selftest over another old testkit`.
- [Observed] My on-disk mutations (`tools/record_mutants_r2.py`, `record-mutants-r2.json`). Each one edits one file, runs `--check`
  (and `--selftest` for a checker edit), restores the file from git and asserts a clean tree.

| Mutant | `--check` | `--selftest` | Caught |
|---|---|---|---|
| D0 control: `island-diff.json` re-serialized, no value changed | `matches ; problems: 0` | — | (control passes) |
| D1 `island-diff.json` `scratchSha256` set to HEAD's testkit digest | `DIFFERS ; problems: 1`, exit 1 | — | yes |
| D2 `island-diff-selftest.json` `scratchSha256` set to HEAD's testkit digest | `DIFFERS ; problems: 1`, exit 1 | — | yes |
| D3 `island-diff.json` `scratchSha256` field removed | `DIFFERS ; problems: 1`, exit 1 | — | yes |
| D4 `island-diff-selftest.json` one hex digit changed | `DIFFERS ; problems: 1`, exit 1 | — | yes |
| C1 `record.py`: the check removed (`if False:`) | `DIFFERS ; problems: 0` | `62/64`, both island mutations `SURVIVED` | yes |
| C2 `record.py`: the check applied to `island-diff.json` only | `DIFFERS ; problems: 0` | `63/64`, the selftest-record mutation `SURVIVED` | yes |
| C3 `record.py`: compares against HEAD's testkit blob | `DIFFERS ; problems: 2` | "the unmutated inputs already fail" | yes |
| C4 `record.py`: only asks for a 64-hex value | `DIFFERS ; problems: 0` | `63/64`, the zeroed-digest mutation `SURVIVED` | yes |

- Every mutation is caught. C1, C2 and C4 are caught for the right reason only by `--selftest`. Under `--check` they show as
  `DIFFERS` only because `summary.json` carries `record.py`'s own digest, so any edit to `record.py` changes it (§7).

### 3.7 The testkit change is comment-only, by my own method
- [Observed] `tools/comment_only_r2.cjs` uses esbuild 0.28.2, not the TypeScript compiler that the lane and round 1 used. It
  transforms each blob with `loader: 'ts'`, `minifyWhitespace`, identifiers kept and `legalComments: 'none'`, which strips types and
  every comment. It then compares the outputs (`comment-only-r2.json`).
  - `d38d7a3c → 308a62f4` and `308a62f4 → 5f0d5547` both give `strippedEqual: true`, and `comment-only-r2-base-to-repair.json` gives
    the same for `d38d7a3c → 5f0d5547`.
  - Selftest: changing one regex character, renaming `localNames` or changing a string literal each change the output; adding a
    comment or a doc-comment line leaves it equal (`"ok": true`).
- [Observed] Line level (an LCS over lines in the same tool), for `308a62f4 → 5f0d5547`: removed lines 64, 65, 66 and 71; added
  lines 64–68 and 73–77. 0 of them lies outside the doc comment that closes on the line before `const LOCAL_VERSION = `, and 0
  fails to start with ` * `. The `LOCAL_VERSION` line is byte-equal (`"lv": true`).
- [Observed] The lane's `comment_only.cjs … --selftest` re-runs to a byte-identical `comment-only.json` (`cmp`), and its
  `npa_probe.cjs` to a byte-identical `npa-probe.json`.

### 3.8 The whole vitest suite, typecheck, governance, quotations, and N4
- [Observed] `npm run typecheck` at `58e8f604`: exit 0 (load1 31.4 → 32.1).
- [Observed] **The whole vitest suite at `58e8f604`**, run after the typecheck build:
  `npx vitest run --reporter=default --reporter=json`, all projects, 11:57:57Z to 12:02:09Z, load1 29.2 → 42.9.
  - Result: `Test Files  243 passed | 3 skipped (246)`, `Tests  5380 passed | 5 skipped (5385)`, `vitest exit 0`
    (`full-suite-summary.json`; the 2 MB report had sha256 `ce4966e4…` and is deleted).
  - The 5 skipped are exactly the five files `suite.json` lists: the strace capture, two `SYZYGY_POC_BUTLERS_REPO`-gated live
    tests, the browser test and the live discovery test.
- [Observed] **N4: `suite.json`** is one run, labelled `whole`, of `npx vitest run --reporter=json` at
  `5f0d5547dfe7f89adf3e86310f819ddeebfaae90`: `success: True`, 246 files, 5,385 total, 5,380 passed, 0 failed and 5 skipped. That
  equals my run on the same code.
  - The PR body no longer calls the two-package run "full". It says "Round 0's `suite.json` was both packages' suites (55 files,
    2,169 tests), not the whole suite".
- [Observed] `python3 scripts/check_governance.py` at `58e8f604`: `32 OK, 21 WARN, 0 FAIL (53 checks)`, exit 0. 0 lines name
  `syzygy-bpyt-8-39` or `workspace-reach`.
- [Observed] `python3 scripts/check_quotations.py` at `58e8f604`: exit 0.
- [Unknown] I did not run the canonical battery. The PR body says "Battery: pending at `58e8f604`." (N3).

### 3.9 The lane probe's metadata calls read the host's npm config
- [Observed] `npm_alias_probe.py:74-76` and `:78` at `58e8f604` run `npm prefix -g` and `npm --version` as
  `subprocess.run(args, capture_output=True, text=True)`, with no `env=`, so not under the probe's private `ENV`. Its docstring
  (`:5-6`) says "npm runs offline, with a private empty cache, an empty user and global config, and a registry of
  http://127.0.0.1:9/, so nothing is fetched and no npmrc of the host is read."
- [Observed] I checked with a sentinel HOME, `/tmp/r541b-home/.npmrc`, holding `prefix=/r541b-sentinel-prefix` and
  `loglevel=silly`, and nothing else set (`npmrc-sentinel.txt`):
  - `npm prefix -g` printed `/r541b-sentinel-prefix`;
  - `npm --version` logged `npm silly config load:file:/tmp/r541b-home/.npmrc`;
  - with `npm_config_userconfig` pointing at an empty file, `npm prefix -g` printed `/home/tze/.nvm/versions/node/v24.6.0`.
- So, run as its usage line says, the probe's two metadata calls load the operator's real `~/.npmrc` and global npmrc, and the
  recorded `arborist` version is read from wherever that config's `prefix` points. Neither call makes a network request. See N1.

## 4. Findings

### F1 — The repaired `npm:` sentence is still false: npm ignores a root-manifest declaration under a workspace's name (blocking: a repaired comment sentence that is still false)

- **Evidence.**
  - The sentence, `workspace-reach.testkit.ts:64-66` at `58e8f604`: "npm-package-arg 12.0.2 accepts only a registry spec after
    `npm:`, and npm fetches that spec from the registry unless the alias is declared under a workspace's own name and that
    workspace's version satisfies it; then npm links the workspace, as for any dependency declared under a workspace's name".
  - [Observed, §3.2, A3, R1, R4, R5, R6] Declared in the root's manifest under a workspace's own name, with a range the workspace's
    version does not satisfy (`npm:typescript@^5.5.0` against 1.0.0), the alias is not fetched from the registry. npm links the
    workspace:
    - the lockfile and the full install exit 0;
    - `node_modules/wlib` → `../w`;
    - `npm ls --all` exits 0, and no `npm warn` line is printed;
    - Node loads `w/package.json` from `app`.

    This holds for all four of the root's fields, and for a scoped name (R1). The control R3, the same alias under a name no
    workspace has, requests the registry. So the root's declarations are read, and only the workspace-named one is dropped.
  - [Observed] The cause is arborist 9.1.3's `lib/node.js:923-932`: "if (!current || current.type !== 'workspace') { new Edge(…) }".
    Edges are built from the root's dependencies only for names that have no workspace edge (`:876`). The range is never checked,
    which is why R2 (plain `^5.5.0`), R7 (a git spec) and F3 (a dist-tag) link too.
  - The testkit reads the root's manifest (the round-0 root-declaration row pins it). So the root's declarations are in the domain the
    sentence speaks about. The lane's probe declared every case in `app` and has no root case. `record.py`'s `NPM_EXPECTED` (`:102`)
    has none either, so the record never tested this branch.
  - The PR body states the same rule three times: the clause quoted verbatim (`pr-body-now.md:4`); "So the alias follows the same
    rule as any dependency declared under a workspace's name, which is what the new clause says." (`:94`); and "It fetches an `npm:`
    alias from the registry, unless the alias is declared under a workspace's name and the workspace's version satisfies it"
    (`:111`).
  - Origin: round 1 proposed the text verbatim (round 1 §4 F1, "Proposed fix"), and the implementer applied it faithfully. Round 1's
    probe, like the lane's, declared every case in a non-root workspace.
- **Impact on the guards.** None today [Observed, §3.2]. The root declares 0 workspace names, and every workspace is
  `@syzygy/`-scoped (12 of 12). The `@syzygy/*` branch (`testkit:105-111`) reads such a name through `exports`, which loads the same
  workspace npm links. The fix is comment-only (§2).
- **The alternative reading, disclosed.** Read the sentence as about declarations a workspace's own manifest makes. On that reading it
  holds for every case I ran: lane cases 3–8, A1, A2, C1–C4, F1, F2 and F4–F6, and R9. Nothing in the text carries that scope,
  though, and the testkit reads the root's manifest like any other. Under the brief's rule a repaired sentence that is still false is
  REVISE, so I rule it blocking, as round 1 did for the same kind of counterexample.
- **Failure scenario.** A later ruling on the kept `npm:` refusal, or on `syzygy-bpyt.1.17`, reasons from "npm fetches … unless … the
  workspace's version satisfies it". It then concludes that a root-level alias under a workspace's name with a non-matching range
  installs a registry package. npm in fact links the workspace silently. The premise for narrowing an arm (which needs a GP-Q0
  ruling) would be wrong in the very branch the round-0 row says the resolver reads.
- **Proposed fix, exact text for round 3** (comment-only; `f1-r2-replacement.txt`, sha256 `e5500fb4…`). Replace
  `workspace-reach.testkit.ts:64-68` at `58e8f604`, the five lines from " * - `npm:`: an alias." through "every alias is refused,
  failing closed.", with these six:
  ```
   * - `npm:`: an alias. npm-package-arg 12.0.2 accepts only a registry spec after `npm:`, and npm 11.5.1 fetches that spec from
   *   the registry unless the alias is declared under a workspace's own name and either the root's manifest declares it or the
   *   alias's range is `*`, absent or one that workspace's version satisfies; then npm links the workspace, as for a plain range
   *   declared under a workspace's name (npm skips any root declaration under a workspace's name, whatever its version). Every
   *   workspace here is `@syzygy/`-scoped, and the `@syzygy/*` branch reads such a name before this pattern. Its target may carry
   *   a workspace package's name, which other package managers can link locally; every alias is refused, failing closed.
  ```
  Each clause has evidence here [Observed, §3.2]:
  - registry for a name no workspace has: lane 0–2, B1, B2, R3 and R8;
  - the root's declaration skipped: A3, A4, R1, R4–R7 and F3, and `node.js:923-932`;
  - `*` or absent links, a prerelease too: lane 3, C3, F1 and F2;
  - a satisfied range links: lane 4, C2 and F5;
  - an unsatisfied range or a tag requests the registry: lane 5, A1, A2, C1, C4, F4, F6 and R9;
  - "as for a plain range": lane 7 and 8, and R2.

  "Other package managers can link locally" is carried unchanged from round 0, and I could not probe it offline [Unknown].

  I checked the six lines comment-only: applied to `5f0d5547`'s testkit (`tools/testkit-with-f1-r2.ts`), the esbuild output is
  equal, and the 5 removed and 6 added lines all lie inside the doc comment and start with ` * `. Lines are at most 128 characters
  wide, within the comment's existing 134. Round 3 also needs these changes:
  - in `record.py`, `F1_CLAUSE` (`:94`) becomes these six lines;
  - the selftest mutation `'a changed line on the LOCAL_VERSION line itself'` (`:480`) hard-codes line `78`. `LOCAL_VERSION` moves to
    line 79, so the mutation must move with it, or it silently lands inside the comment and survives;
  - `npm_alias_probe.py` gains root-declared cases (at least A3 and R1, beside the control R3), and `NPM_EXPECTED` gains them;
  - the PR body's `:4`, `:94` and `:111` follow the new text;
  - the dispositions record carries round 1's still-owed corrections (N3).

### N1 — The lane's npm probe reads the host's npm config in two calls, against its own docstring (low; evidence tooling)

- **Evidence.** [Observed, §3.9] `npm_alias_probe.py:74-76` and `:78` call `npm prefix -g` and `npm --version` without `env=ENV`.
  With a sentinel `$HOME/.npmrc`, `npm prefix -g` returns the sentinel's `prefix`, and `npm --version` logs `config
  load:file:<HOME>/.npmrc`. The docstring (`:5-6`) says "no npmrc of the host is read", and the PR body (`:91`) says the probe runs
  with "empty user and global configs". Both are true of the install calls only. No request leaves the host.
- **Failure scenario.** The probe is re-run per its usage line on a host whose `~/.npmrc` holds an auth token and a custom `prefix`.
  npm loads that file, a token included, for the two metadata calls, though the record says no host npmrc is read. The `arborist`
  field is then read from the custom prefix's npm, which need not be the npm that ran the cases, or the run crashes on a missing
  `package.json`.
- **Proposed fix** (evidence tooling only): pass `env=ENV` to both calls. Derive arborist's path from
  `os.path.realpath(shutil.which('npm'))` (its `lib/node_modules/npm/…`), as `tools/npm_alias_probe_r2.py` does. Or narrow the
  docstring to "no npm install call reads an npmrc of the host".

### N2 — "0 of the 12 workspaces are unscoped today" is an undated count that nothing in CI pins (low)

- **Evidence.** [Observed] The new residual sentence says "0 of the 12 workspaces are unscoped today". It is true at `58e8f604` and at
  `973965a8` (§3.5). `record.py` pins it (`NAMED_IN_COMMENT`, `:92`; selftest `:483`), but `record.py` runs only by hand:
  `git grep -F syzygy-bpyt-8-39` over `.github`, `scripts`, `PROJECT-STATUS.md` and `package.json` at `58e8f604` gives 0 matches.
- **Failure scenario.** Any later PR that adds a 13th workspace, even a scoped one, makes the code comment false ("12"), and no check
  fails. That is the stale-restated-state pattern `AGENTS.md` warns about ("A page that restates state it does not own goes stale
  silently").
- **Proposed fix** (comment-only): date it, for example "At syzygy-bpyt.8.39, 0 of the 12 workspaces are unscoped;", and update
  `record.py`'s two literals with it. Round 3 may fold this in, and should then check that sentence too. Otherwise it goes to a
  follow-up bead. Option (a) of `syzygy-bpyt.1.17` would supersede it.

### N3 — Process: stale PR-body state, the battery, and the still-unwritten round-1 dispositions (process)

- **Evidence.** [Observed]
  - The PR body says "Main is `41932c3b` (#533); it shares none of the branch's paths" (`:33`). Main is now `973965a8` (#540). The
    claim still holds there (0 of 26 shared paths, §1). Hosted CI ran on the merge with `41932c3b`, not with current main, and my
    local merge covers the difference.
  - The PR body says "Battery: pending at `58e8f604`." (`:116`).
  - No dispositions record for round 1 exists yet: on the branch and on main, the only tracked file naming
    `GUARD-PINS-FOLLOWUP-2` is `record.py`. Round 1's F1 fix asked that record to correct two things: the #536 raw's step at
    `docs/reviews/R-GP-IMPL-GUARD-PINS-FOLLOWUP-1-RAW.md:150`, with the raw itself kept verbatim; and the #536 dispositions' N4 line
    (`docs/evidence/guard-pins-followup-round-1-dispositions-2026-10-27.md:116-118`, unchanged on main).
- **Failure scenario.** The landing cites a battery line that was never filled, or the dispositions record copies round 1's proposed
  text, or this PR body's rule, as the corrected premise. It would then propagate F1's false branch.
- **Proposed fix.** At landing:
  - refresh the main pointer and the merge evidence;
  - fill the battery line at the landing commit;
  - write the dispositions record for both rounds, carrying round 1's two corrections and this round's F1 text, and naming that
    round 1's proposed text was itself false for the root's manifest.

## 5. Every changed output, or the evidence that there is none

No product output changes. [Observed]
- The code diff is two test-side files. The testkit is named only by the three guard tests (§2), and no `exports` entry names it.
- The testkit's code is unchanged: by esbuild's comment-free output (§3.7), by the lane's TypeScript emit and print (re-run
  byte-identical), and by a line check showing the `LOCAL_VERSION` line is byte-equal.
- The test file only gains two rows, and every existing row is byte-unchanged (an insert-only diff).
- The repair's tests pass against BASE's testkit (171/171), and the whole suite passes (5,380 passed, 0 failed).
- The subject has no `package.json`, rendered byte, wire format, refusal string, exit code, or signed or digest-bound artifact.
- The evidence delta is 22 files under `docs/evidence/syzygy-bpyt-8-39/`: 8 added, 13 modified and 1 deleted
  (`start-gates-default-reporter.log`, round 0's two-package timeout log, superseded by the whole-suite `suite.json`). No path
  outside that directory is touched.

## 6. Verdict on each round-1 finding's repair

- **F1: not met.** [Observed]
  - The sentence round 1 found false is gone. `F1_FALSE` is absent from HEAD's testkit, which `record.py` checks.
  - The PR body no longer asserts it: "Each comment claim holds" became "Each parse claim the comment makes holds" (`:87`), and `:4`
    quotes the old text only as what round 1 found false.
  - The replacement, round 1's own text applied verbatim, is still false for a root-manifest declaration (this round's F1). The PR
    body repeats the new rule at `:4`, `:94` and `:111`.
  - No dispositions record exists yet (N3).
- **N1: met.** [Observed] The two rows are round 1's checked text, byte for byte. X3 and X5 each survive 169/169 at `5db78a26` and
  are each killed at `5f0d5547` by their own row alone, on the merge too. Both are pins (PIN 171/171), not resolver changes.
- **N2: met.** [Observed] The residual sentence is true (§3.5), and it does not decide `syzygy-bpyt.1.17`. Note N2 asks that its
  count be dated.
- **N3: met.** [Observed] `record.py` checks `scratchSha256` for both island records against BASE's testkit blob, and `--selftest`
  has one mutation for each (64/64). My data mutants D1–D4 each fail `--check`. My checker mutants C1, C2 and C4 are caught by
  `--selftest`, and C3 by `--check`.
- **N4: met.** [Observed] `suite.json` is one whole-suite run at `5f0d5547` (246 files; 5,380 passed, 0 failed and 5 skipped of
  5,385), and my run on the same code agrees. The PR body names round 0's two-package run correctly.
- **The #536 targets at head:** M2, M8 and M9 are each killed by their own row alone, and M7 by its own row and the unversioned row,
  each of which kills it alone (§3.4). That is not a defect.

## 7. Test quality

- **Core rule** (`.claude/skills/th-engineering/subskills/test-rigor/SKILL.md:42`, at `58e8f604`): "**A test is worth keeping only if
  some plausible bug makes it fail.**" [Observed] Each new row kills a mutant that no other row catches: the git-spec row kills X5 and
  Y2 alone, and the unversioned-alias row kills X3 and Y5 alone. All four survive at `5db78a26`.
- **Bar 10** (`:93-97`): "A test is worth *adding* only if it catches a plausible bug no existing test catches: search for the
  nearest existing test first and prefer extending it. Reviews state the net test delta".
  - Both rows extend the nearest table ("reads a bare name declared as %s as naming no module").
  - The net delta over the repair is `Tests: +2 ~0 -0` (169 → 171, insert-only). Over the whole PR it is `+6 ~0 -0` (165 → 171).
  - M7's row stays necessary at head: Y6 is killed by it alone.
- **Bar 4** (`:64-67`): "Expected values are literals or independently derived." Each row asserts `toBeUndefined()`.
- **Bar 7** (`:82-84`): "A maintainer should localize the bug from failure output alone." Each kill names its form: "…a git
  dependency whose spec ends in a tarball extension…", "…an npm: alias with no version…".
- **Bar 6** (`:78-81`, deterministic): 0 timeouts in 34 guard-file runs at load1 25–45, and 0 failures in the whole suite.
- **Survivors, named.**
  - Y7, a case-sensitive tarball arm, survives 171/171. It is X4's class: one `/iu` flag covers the whole pattern, the `FILE:` row
    pins that flag, and round 1 ruled X4 needs no row. I agree and ask for none.
  - Round 1's X1 and X4, and #536's M5, M10 and M11, survive as already ruled, and `record.py` checks that they do.
- **The record as a test of itself.** `--selftest` is the only thing that catches a weakened check for the right reason. `--check`
  flags any edit to `record.py` through its own digest in `summary.json`, so it cannot tell a weakened check from a reworded comment.
  My C1, C2 and C4 show the selftest does catch weakened checks.
- **Bar 3** (`:60-63`, edge paths): the root-manifest branch of the `npm:` clause had no probe case (F1). That is an evidence gap, not
  a test gap: the resolver's answer for it is already pinned by the root-declaration row.

## 8. Cleanup

- Deleted:
  - the scratch clone, which held `58e8f604`, `5db78a26` and the merge `092d508e`;
  - every TMPDIR I made (`/tmp/r541b-ci`, `-np1`…`-np4`, `-np-main`, `-np-root`, `-m1`, `-full` and `-home`);
  - the 2 MB vitest JSON report, which `full-suite-summary.json` summarizes with its sha256 `ce4966e4…`;
  - the scratch test file, copied into the clone and removed before the clone was;
  - a helper table file outside `rev-541b/`.
- `ls -d /tmp/r541b-*` gives "No such file or directory". I deleted nothing in `/tmp` outside my own TMPDIRs, and killed no process.
- Kept, under `rev-541b/`: 57 files, each under 300 KB (`find . -size +300k` is empty). This raw is not listed in its own table.
  - `rev541b-at-repair.json` holds Y1–Y5 and PIN, and Y6 and Y7 were run later into their own files. `rev541b-specs.json` is the
    final spec, with all eight. `rev541b-specs-noPin.json` is the same less PIN, as run at `5db78a26` before Y7 existed.

| Path | sha256 |
|---|---|
| `blobs/test-308a62f4.ts` | `5e3ef214af947bc9455ae4d8ebd56c26d01ffe825c5968ce2d9c8625b36a59a4` |
| `blobs/test-5f0d5547.ts` | `15c395c9e23686d605f39f2bd4ea5f9f52fe3e45cbbce244f752486282758519` |
| `blobs/test-d38d7a3c.ts` | `a20cdbc84b4e21ee62d6d06eb2abe8c7a21affa03974a35355a812ac89b7cb1e` |
| `blobs/testkit-308a62f4.ts` | `94c9d93b40cc4f54afc8a6d56d9062b25e27938016edef566d7bd75b6381cbd3` |
| `blobs/testkit-5f0d5547.ts` | `440209bb6d876b7ae1240a88cd4cf5913b01750a0d9ffa56f90c072be7f76951` |
| `blobs/testkit-d38d7a3c.ts` | `ed67106fe74333c97f419f4a52f14f75bfaa34bbfa5b41f33c4f1b6545895731` |
| `check-governance.log` | `b3d667212269962dd0f11f6e073326781b78da51e37e55eaf9c73aab834298ff` |
| `check-quotations.log` | `7a34ea59919f05b900f1e4c86ff402635584b01388c30cacee8cd936d2ed3093` |
| `comment-only-lane-rerun.json` | `02cf841a759eaa4a1e32624d77dfc2566e7535fce267ed0794c589d949999b5d` |
| `comment-only-r2-base-to-repair.json` | `93ecb3f97c6b41f049bce5acf94f8d9b82027ace2ec9c4161e18682584810810` |
| `comment-only-r2.json` | `3b577cfece680b789db98d56102518049cda823e9534ff4f640665158b1830b1` |
| `f1-r2-replacement.txt` | `e5500fb4ccba0029db729ce63a201113886ae627d2d9bd55258ebfe5c9718e9c` |
| `fix541-equal.json` | `9393ce25ee5d45b4acb4269e3f845d101c192ffc6afc70f40468ac116fac7f70` |
| `full-suite-summary.json` | `9c531526bba4b4745ec5dbf8c3c4777904a1cf6375a071017577d8eac1a1ecf0` |
| `full-suite.load` | `313f2e17935aa3639af759ae01ddd80dc8769638fbb3f01164836b7c1fb8f6ee` |
| `full-suite.log` | `8d8701b19e380705b76df22e241d5868e1716e76ab778f7c7449205bd58380c1` |
| `gh-pr-checks.txt` | `7c228d026dc1f9e9aad338f6a137d8fc421665e29770b4ae97c4efc04f591ff6` |
| `hosted-checks-lines.txt` | `b2e01fa22b8b27f275568c4d007fe42003c9c65dace81c9f05f0ce854bdf2104` |
| `hosted-node-totals.txt` | `3907f32b2f4f2df6886e08a39483134721f9ef04e35cbe9df92d76add5fb6cbf` |
| `m2789-at-repair.json` | `5257063842d0691684953712319884b9b95454e37b235ef60e3671a909c85937` |
| `m7-at-round1.json` | `9112db4736d8254dc7f97cb889ec5dab1b8a2d6922d7f1b47119652dbfef5b62` |
| `main-changed-paths.txt` | `b906501729c8ed9d4b007997bafc530c5e374462b50f51d179367411059e044d` |
| `merge-guards.json` | `918d7b005ff33e1dcdfdabf6c9e745c75e0c5f979fea7db50ce87d83c3fd74e8` |
| `n2-resolver-answers.txt` | `89f236d4845aeebfd28de6b93dc4b8b542f15fb04ece01c5f29f122fd3e86b38` |
| `npa-probe-lane-rerun.json` | `d738e101a46f6d13d0b0734e200921d1cce77f91bff407614f1d06cc27af842d` |
| `npm-alias-probe-lane-rerun.json` | `a0570c51e453e2944faa575e670321e819b911160e5dfba13cbb1a43856cf480` |
| `npm-alias-probe-lane-rerun.load` | `7e9cc86f4b11780ff6759a0d25ecb4006e09445563c5f376df5ba47ec8f65603` |
| `npm-alias-probe-r2-fix.json` | `d656fc2519e8c3397e63503fa923b3826618cd4cf14dd93ce21a10d5ddf78c96` |
| `npm-alias-probe-r2-root.json` | `f292ab87ad9c3410ab6d80576259f8bbabaa9b83f035937ed30873f3953159cd` |
| `npm-alias-probe-r2.json` | `19d8766e55fd7d56a6ffd4add54c70c0cfa5d749eee39a7b5bd30ececd578745` |
| `npm-alias-probe-r2.load` | `8a9ede4bfa8940a8ddd597b7bdfbcc986c560e09a35a93f49685dde5c7c6d141` |
| `npm-ci-head.log` | `634f94a251bf20b440193409c55d3adc5e973be4d5e1f5f46e20e4c66762d2a2` |
| `npm-ci-merge.log` | `b6934657f652d529a477c4335a26c9fedff13dc01c427a0421a768a5b854e410` |
| `npm-ci-round1.log` | `b6934657f652d529a477c4335a26c9fedff13dc01c427a0421a768a5b854e410` |
| `npmrc-sentinel.txt` | `db45d585bc0d04234948f492316eef7aaf2d7ae0f4b6e1f105759aeaaba853b8` |
| `pr-body-now.md` | `a7b8d3b6a3b8b18be01d1a1a58c0a733fbd726cf300eb999af73ca822574e4f9` |
| `pr-paths-ever.txt` | `b2108a6e3bd2b0540c0480c28a7ba1a45fd1ac6a739f1675acdb75d6e07de1d3` |
| `pr-paths.txt` | `60895e35859a54ee78ae012454347d3a8b0c41c916ddc52ae1483f0965d5e3c1` |
| `r2-review.diff` | `6b3da14cf9c3c9a551eca65c9e54a9bd058a3f2db9f7765ae5f709dafd64384f` |
| `record-mutants-r2.json` | `048002afe23f444228a62995b8bacd931ebabcb3dc8257a24805faf16e46020c` |
| `record-selftest.log` | `c5c180eadc607d6e8d4aafdfbad969156f2f56da727298f6c6c3c67abd090966` |
| `rev541b-at-repair.json` | `729167d462d4428644f59b5b33151c6674a73a655ae32273b02eb250111df1ac` |
| `rev541b-at-round1.json` | `a30773668f06b6638c4e55a5c038d1670a73e55f5cfd994917ef827020042d44` |
| `rev541b-specs-noPin.json` | `512c06da2fd755c673a76973714db06f40840f3393bb97432432a3ac510390c3` |
| `rev541b-specs.json` | `8c48ac03b45bc3ba7ea139bd679e97c806f681b42c301122cbb62fdbbaa7f0f8` |
| `rev541b-y6-at-repair.json` | `c96929584c5f6a3d3ea603597ab65bf6ebaf4d89aaeda60ca35a286c667f089b` |
| `rev541b-y7-at-repair.json` | `f5e073b7acc326bbdfbe052464010dc2ec74c2d2dbbd6c5e47c4709d92a9b5ea` |
| `tools/comment_only_r2.cjs` | `7f27df125cc24c13456b30a87e00747d4f6f08cd4314bbc6317e8ed3fa0cb6c7` |
| `tools/mrun.py` | `2b82e06a8c91623be0add754d3b12ca07c978f9ec26afaaf2da3d3ec4025f942` |
| `tools/npm_alias_probe_r2.py` | `01a7ce1678a12d2fea9dbedbe8b411296f1d4be452a84a679a20e85abced193e` |
| `tools/record_mutants_r2.py` | `2e249a205f692fb30ca4676d11006ec6bca5f1e1698a181d3a4c906ee5b57cba` |
| `tools/testkit-with-f1-r2.ts` | `18f3bbf8b76c6bcfab6fcbffbfae5b34b758d0bfb2886d4c92da90fcb7f97792` |
| `tools/zz-r541b-n2.test.ts` | `1444e2b67256b39eeb8b48df616aab3beb51a4919af2668540800b4c3070dcf0` |
| `typecheck-head.load` | `86368945f58fd5d95b5764e7935cec2a0c5a17938e04a47ec9b909510ed5e2fe` |
| `typecheck-head.log` | `e79ba97c617f3c42161f19299460b61c3cf6b394dad5622ce35c7343f1a926b6` |
| `x35-at-repair.json` | `41654a8466846a14eb3b40c06a12ce9ea4db6b028823e199a302a3f462eb05b5` |
| `x35-at-round1.json` | `da9ff85713170ea55fb86d57646f2ed12d6e5b94e2a8e4d072f8c2a86f0346d1` |
