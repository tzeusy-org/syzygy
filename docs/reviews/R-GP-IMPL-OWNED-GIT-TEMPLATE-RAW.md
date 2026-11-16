# Review: PR #691 (syzygy-157b), owned empty git templates in the dossier full-run testkit
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 60bdd9a36f89e9ac1806b8cb0a36106a53b1c985
Subject: PR #691

Reviewer: pr-reviewer worker for syzygy-hpfr, fresh context, scratch detached worktree at the reviewed commit, `npm ci` first, TMPDIR /tmp/r691 (removed afterwards).

## Verdict basis

[Observed] The diff touches two files: `packages/polaris-dossier/src/full-run.testkit.ts` (+17/-2) and `packages/polaris-dossier/src/start-gates.test.ts` (+30). No production, guard or `clone-shape.ts` code changed. Every in-scope `git init` in the testkit now goes through one private `gitInitFromEmptyTemplate`. The exceptions below are notes; none is a correctness defect in the repair.

## Sweep: every git-init site

Python `re` over `git ls-files -z`, pattern `git init|'init'|"init"|--template|GIT_TEMPLATE_DIR|templateDir`, restricted to files ending `.ts .mjs .js .py .sh .cjs .json`, excluding `docs/ .syzygy/ openspec/ .beads`. Denominator: 5,049 candidate files read, 136 matching lines.

- [Observed] In `full-run.testkit.ts` exactly two init invocations exist: `consentedClone` (`gitInitFromEmptyTemplate(clone, [])`) and `makeClone` (`gitInitFromEmptyTemplate(origin, ['-b', 'main'])`). The only remaining `'init'` literal in that file is the helper's own call (line 48). Both bead-scoped sites are covered.
- [Observed] Every other `git init` site is outside the bead's owned surface, which names the testkit alone and forbids package-wide migration: `start-gates.test.ts` `cloneAt` (intentionally exercises default and explicit templates), `check`, `inventory`, `render`, `review`, `gate-parts`, `git-object-reader`, `three-surface-poc*` tests, `packages/test-kit`, and scripts. `dossier-trigger.ts:214` and `record_versioned_signoff.py:463` already pass `--template=`. `polaris.ts:274` is production and out of scope.
- [Observed] `waiting-sessions.test.ts:52` reaches the fix through `makeClone`; its `cli init` call is the product command, not a fixture init.
- [Observed] `scripts/dossier_scale_measure.mjs:32` loads `packages/polaris-dossier/dist/full-run.testkit.js` and calls `kit.consentedClone` (line 89), so the script inherits the fix. Its own `git(origin, 'init', '-q', '-b', 'main')` (line 85) has no template. Exception E2.

## Environment preserved

- [Observed] The helper passes `{ env: GIT_ENV }`; `GIT_ENV` (global and system config `/dev/null`, `NO_MAINTENANCE`, fixed dates) is unchanged. The `-b main` argument, `file://` fetch, `--depth=1` and detached checkout are unchanged. Public signatures are unchanged.
- [Observed] Mutant M5 (drop `{ env: GIT_ENV }` from the helper) survives: start-gates 105/105 pass. Env preservation at the new site is pinned by no test. Exception E1.

## Template removed on every path

- [Observed] `mkdtemp` is inside no `try`; `execFileSync` and the `rmSync` are in `try/finally`. On init success and on init failure the template is removed (`force: true`). The test creates a regular file at the clone destination, asserts the throw, and compares the parent's entries before and after.
- [Inferred] The only path that can leave the directory is a failure of `mkdtemp` itself (nothing created) or a process kill between `mkdtemp` and `finally` (no exit hook, as the bead requires). `rmSync` failure would propagate, as the bead asks.
- [Observed] Mutant M2 (delete the `rmSync`) is caught: the parent-entries comparison fails with `.git-empty-template-*` listed.

## Other template channels

- [Observed] Run against git 2.53.0 with an ambient template holding `description.dpkg-new`: with `GIT_TEMPLATE_DIR` set and with `init.templateDir` set in a global config file, `git init --template=<empty dir>` produced `.git` holding `HEAD config objects refs` only. Without `--template`, the `init.templateDir` run copied the sentinel. So the explicit option overrides both channels without modifying them.
- [Inferred] The testkit sets `GIT_CONFIG_GLOBAL` and `GIT_CONFIG_SYSTEM` to `/dev/null`, so `init.templateDir` from those files is already unreachable; `GIT_TEMPLATE_DIR` from `process.env` is the live channel, and it is covered. A repository-local config cannot exist before init. The new test exercises only the `GIT_TEMPLATE_DIR` channel through the exported `GIT_ENV` object; the `init.templateDir` channel is shown only by my manual run above.
- [Observed] The template is created in `path.dirname(dir)`, the caller-owned fixture parent, a sibling of `.git` not a child, so it is never inside the cloned `.git`.

## Rule-6 mutants (my own), start-gates.test.ts, integration project

Baseline 105 passed. Fragments are exact `old` to `new`, applied to `full-run.testkit.ts` at 60bdd9a3.

- M1 `'-q', \`--template=${template}\`, ...args` to `'-q', ...args`: killed (1 failed, `expected true to be false`).
- M2 `fs.rmSync(template, { recursive: true, force: true });` to empty: killed (parent entries differ).
- M3 `gitInitFromEmptyTemplate(clone, []);` to `execFileSync('git', ['init', '-q', clone], { env: GIT_ENV });`: killed.
- M4 `gitInitFromEmptyTemplate(origin, ['-b', 'main']);` to `git('init', '-q', '-b', 'main');`: killed. Per-site coverage holds for both sites.
- M5 drop `{ env: GIT_ENV }` (`dir], { env: GIT_ENV });\n  } finally` to `dir]);\n  } finally`): SURVIVED.
- M6 `\`--template=${template}\`` to `'--template='`: survived. This is behaviorally equivalent for the sentinel oracle (an empty template); only the bead's "owned directory" design distinguishes them. Noted, not a defect.

Strictness control: the two new refusal rows (`description.dpkg-new`, `description.dpkg-tmp`) are added to the existing table and pass through the unchanged guard. Net tests: +0 new `it` blocks, two existing blocks extended, as the PR body states.

## Gates at the head (scratch worktree, `npm ci` first)

- `npm run typecheck`: exit 0.
- `npm test`: exit 0; 167 files, 3658 tests passed.
- `npm run test:integration`: exit 0; 88 files, 2549 tests passed.
- `python3 scripts/check_governance.py`: exit 0; 32 OK, 21 WARN, 0 FAIL (53 checks).
- `restart.test.ts` did not flake in this run.

## Exceptions (non-blocking, notes only)

- E1: M5 survives. Nothing pins that the helper's init keeps `GIT_ENV`. Suggest a follow-up that asserts it (for example through a `GIT_ENV` marker the init must see), or accept as low-risk since init reads no isolation-sensitive config.
- E2: `scripts/dossier_scale_measure.mjs:85` initializes its origin without a template. The origin is never passed to the clone-shape guard, so it is harmless here, but it is the one remaining unowned init beside the repaired helper; carry it into the `syzygy-bpyt.4.4` migration.
- E3: The `init.templateDir` channel is not exercised by a committed test; only `GIT_TEMPLATE_DIR` is.
