# Review: owned git template follow-ups (syzygy-8xok)
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 6291acc231f7a1b48a2ece091ea9a515046aa99e
Subject: PR #694

Scope: the diff of `agent/syzygy-8xok` over its base `agent/syzygy-157b` (PR #691): `full-run.testkit.ts` (export), `start-gates.test.ts` (+3 tests), `scripts/dossier_scale_measure.mjs` (one line). Reviewer: fresh context, scratch detached worktree at the head, `npm ci` first, TMPDIR `/tmp/r694`.

## Gates at the head (all run in the foreground)

- `npm run typecheck`: exit 0.
- `npm test`: 167 files, 3658 tests passed.
- `npm run test:integration`: 88 files, 2552 tests passed.
- `python3 scripts/check_governance.py`: `32 OK, 21 WARN, 0 FAIL (53 checks)`.
- `npm run build` exit 0; `dist/full-run.testkit.js` carries `gitInitFromEmptyTemplate` (3 occurrences).
- `node scripts/dossier_scale_measure.mjs --work /tmp/r694/work/w`: exit 0, JSON record written, no stderr, work directory emptied (the helper's `.git-empty-template-*` directory is removed in `finally`). The script still works.

## Mutants (rule 6), run by this reviewer on `start-gates.test.ts` in the integration project, each restored

| Id | Mutation | Result |
|---|---|---|
| M1 | helper drops `{ env: GIT_ENV }` | killed: "the owned-template init runs under the fixture env" fails (1 failed, 107 passed) |
| M2 | helper drops `--template=${template}` | killed: the older-git template test and the new init.templateDir test fail (2 failed) |
| M4 | script: `execFileSync('git', ['init', '-q', '-b', 'main', origin], ...)` in place of the helper call | SURVIVED (108 passed) |
| M5 | script: `git(origin, 'init', '-b', 'main')` | SURVIVED |
| M6 | script: `git(origin, 'init', '--quiet', '-b', 'main')` | SURVIVED |
| M8 | script: an extra `git(origin, 'init')` added after the helper call | SURVIVED |
| M7 | script: trailing comment on the helper line (benign) | passes, correctly |

## Findings

E1 (env preservation): real. M1 is killed by a test that observes behavior (the `init.defaultBranch` set only in the fixture env's config channel reaches HEAD). Note, not blocking: it hardcodes `GIT_CONFIG_COUNT = '3'` and index 2, so it silently depends on `NO_MAINTENANCE` holding exactly two entries; a third entry would collide or fail for an unrelated reason.

E3 (`init.templateDir` channel): real. M2 is killed by it, and the sentinel files in the configured template are left untouched (asserted). The `GIT_CONFIG_GLOBAL` override is restored in `finally`.

E2 (scale-measure origin init): the fix is correct and the script runs, but the pin is weak (exception 1). It reads source text and asserts one positive substring plus one negative regex, `/'init', '-q'/`, which forbids a single spelling of a bare init. M4, M5, M6 and M8 are realistic regressions (long flag, dropped `-q`, a reordered argv, a second init) and all survive; conversely a harmless reformat to double quotes breaks the positive `toContain` falsely. The positive substring is also an exact-string assertion on source that is not a contract, which the test-growth gate discourages. A pin that holds: assert that no quoted `'init'` token occurs in the script outside the helper call (for example `/['"]init['"]/` count of zero), or run the script's origin init behind an injected `GIT_TEMPLATE_DIR` sentinel and assert it stays out of the origin's `.git`.

## Exceptions

1. E2 source pin survives four realistic mutants (M4, M5, M6, M8); widen the negative predicate to any `init` token, and publish the regex.
2. (note) E1 test depends on the `NO_MAINTENANCE` entry count.

No correctness defect in the product code; the testkit export and the script change are minimal and behave as described. The PR body's test delta (+3 ~0 -0) matches the diff.
