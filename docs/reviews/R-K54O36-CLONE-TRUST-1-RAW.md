# R-K54O36-CLONE-TRUST-1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: c7c5646ca636fd9955f280098946bbb31670c722
Reviewer: fresh-context subagent

Subject: `git show c7c5646ca`: `packages/polaris-dossier/src/polaris.ts` (`agentHomeSeed`, `sessionAddedDirs`,
`prepareAgentHome`, `sessionClaudeArgs`, `launchSession`) and `packages/polaris-dossier/src/polaris-launch-guidance.test.ts`.
Worktree clean at the reviewed commit. `npx vitest run packages/polaris-dossier/src/polaris-launch-guidance.test.ts`:
38 passed, 1 file [Observed].

## Against the acceptance criteria

- AC1 (seed trusts cwd plus exactly the `--add-dir` dirs, spelled identically): met in code. Both the seed
  (`polaris.ts:590` → `:549` → `:530-533`) and the argument list (`polaris.ts:584`) take the same strings from one
  function, `sessionAddedDirs(plan.role, state.clone)` (`polaris.ts:537-539`). No transform runs between them, so the
  spelling is the same byte for byte [Observed].
- AC2 (clone only for author and inventory): met (`polaris.ts:538`). Pinned by `polaris-launch-guidance.test.ts:114-119`
  [Observed].
- AC3 (no other behaviour change): met. The cwd entry keeps `hasTrustDialogAccepted` and `hasCompletedProjectOnboarding`,
  the top-level keys and `lastOnboardingVersion: '2.1.299'` are unchanged, the credential copy and chmod lines are
  untouched, and the `--add-dir` loop gives the same argv as the old `if` [Observed, diff read].
- AC4 (tests fail on a disagreement): met for `sessionClaudeArgs` versus `agentHomeSeed`. The test takes `added` from
  the real argv and compares it with the seed's keys (`test.ts:107-110`). A changed spelling on either side (trailing
  slash, `path.resolve` on one side only) makes the sorted arrays differ [Inferred: reasoned from the assertion; no mutant
  was run, because the brief made the worktree read-only]. Finding 2 covers the edge the test does not reach.

## Path spelling against Claude Code 2.1.332 (installed `~/.local/share/claude/versions/2.1.332`)

[Observed, from `strings` over the binary] Claude Code looks trust up as `projects[dH(dir)].hasTrustDialogAccepted`,
with `dH(e)=aY(e)=cle(HT(e) ?? realpath(resolve(e)))`, where `HT` is the enclosing readable git root. If that key misses,
it walks up through the parent directories (`Oh`/`xh`). The prompt text "Adding a new directory: … This session hasn't
worked here before. Is this a directory you created or one you trust?" is in the same build. So the key Claude Code
checks is the clone's git root, or else its realpath, as seen inside the bubblewrap view.

- Supervisor clone: `path.join(os.homedir() + '/.local/state/syzygy-polaris-clones', …)` (`polaris.ts:381,467`) is
  absolute, normalized and has no trailing slash. It is made by `git init` at that exact path, so its git root is the
  path itself [Observed].
- Operator `--clone`: `path.resolve(...)` (`polaris.ts:226`) is absolute, normalized and has no trailing slash. It is
  not realpath'd. Inside the view, `bwrapArgs` binds each path at its own literal spelling (`session-view.ts:96`) onto
  a fresh root, so the parent components inside the view are directories bwrap creates, not host symlinks. A
  subdirectory of a repository, or a worktree whose gitdir lies outside the view, finds no readable git root inside the
  view, and `HT` returns null in either case. So `dH` falls back to the literal path, which is also its realpath inside
  the view [Inferred: from the bind layout and the decompiled lookup; not exercised in a live session].

## Findings

1. `polaris.ts:551`. Severity: low (transitional). Evidence: the seed is written only
   `if (!fs.existsSync(seedFile))`, and the home is per run and role (`polaris.ts:543`,
   `${runId}.agents/<role>`). Within one run this is harmless: `state.clone` is persisted in the supervisor state
   (`polaris.ts:501`) and cannot change, and each role has its own home. A run whose author or inventory home was
   seeded by the code before this commit, then resumed by this code, keeps the old `.claude.json` without the clone
   entry. Those sessions still show the question. Claude Code also rewrites `.claude.json`, so rewriting the whole
   seed is not safe either. If resuming in-flight runs matters, merge the missing `projects[dir]` entries into the
   existing file; otherwise state that only new runs are covered. [Inferred]

2. `polaris-launch-guidance.test.ts:105-112`. Severity: low (test weakness). Evidence: the test calls `agentHomeSeed`
   with `sessionAddedDirs(role, state.clone)` itself. It never exercises the real call site that wires the two
   together, `launchSession` → `prepareAgentHome(…, sessionAddedDirs(plan.role, state.clone))` (`polaris.ts:590`), nor
   `prepareAgentHome`'s write. A regression that passes `[]`, `plan.directory` or another clone value at `:590` leaves
   the seed and argv out of step while every test passes. The cwd argument (`'/sessions/s-1'`) is also not tied to the
   view's `spec.cwd`. That pre-dates this commit (author `plan.directory === run === runDir`; others
   `sessionDir === plan.directory`). A narrow fix: export `prepareAgentHome`, or a pure
   `sessionLaunchInputs(plan, state)` that returns both the argv and the seed, and assert on that. [Observed]

3. `polaris.ts:531-532`. Severity: informational. Evidence: if an added directory equals `cwd`, the loop replaces
   the cwd entry and drops `hasCompletedProjectOnboarding`. That cannot happen with today's layout (the clone is never
   the run or session directory), but `projects[dir] ??= { … }` or a spread would make the ordering irrelevant.
   [Observed]

4. `polaris.ts:532`. Severity: informational. Evidence: Claude Code's own runner seeds each trusted path in four
   spellings: the path, `normalize('NFC')`, its realpath, and the realpath's NFC form (string near
   `Seeded persisted trust for … path(s)` in the binary). This seed writes the single spelling it passes. For the
   supervisor clone (ASCII slug plus label under `$HOME`) and the bind-at-literal-path view, one spelling suffices
   [Inferred]. Only a non-NFC or symlinked operator `--clone` would test that, and finding 2's harness would not catch
   it either.

No finding shows a case in today's default launch path (supervisor clone, fresh run) where the question would still
appear.
