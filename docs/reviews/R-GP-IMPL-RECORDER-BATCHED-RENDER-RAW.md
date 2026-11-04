# R-GP-IMPL-RECORDER-BATCHED-RENDER — implementation review of syzygy-bpyt.4.8 (recorder testkit batched render), round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 03b8ed77e16e0cafe390c92e81dcf6cbcfeece22
Subject: PR #689

Reviewer: independent fresh-context reviewer (beads-pr-reviewer-worker, default model). I did not author the change and did
not change it. Every probe below ran in a scratch detached worktree at the reviewed commit, after `npm ci`, with
`TMPDIR=/tmp/r689`; every scratch file was removed before the gates ran, and `git status --short` was empty at that point.

## 1. Subject identity

- [Observed] `sha256sum packages/polaris-generation-consent/src/recorder-fixtures.testkit.ts` at the reviewed commit:
  `68f757e1108eba31edab05e419478a8324d52ecfe9c5f3378c21b6550bd00a14`, equal to the evidence record's `subjectSha256`.
- [Observed] The predecessor bytes `git show cbd8b708:<same path> | sha256sum`:
  `73c3c18032ce023bcc9b8f45ab36aab060629ec8299389726cbd87e804b28bcc`, equal to `predecessorSha256`.
- [Observed] The mutants' `commit` `c00193e8` is not an ancestor of the reviewed head (rebased), but the testkit and the
  differential test have identical bytes there and at the head (sha256 prefixes `68f757e1108e` and `1ccbaeb0df50` at both).
  The record stores each mutant's `old`/`new` fragment, so the mutants stay re-runnable.

## 2. Can slot-filling differ from a direct render?

Mechanism read: `RENDER_TEMPLATES_PY` calls each recorder's `render_act` / `render_record` once with `'\0name\0'` in each
caller-supplied position, and `fill` replaces `/\0(\w+)\0/g` in that template with a function callback. That design is
correct because of three properties:

- [Observed] Every slotted parameter is pure f-string interpolation in the recorders read. These are
  `record_public_repo_admission_acts.render_act`, `record_dossier_agent_provider_v2_act.render_act` and
  `record_versioned_signoff.render_record` with `installed_lines`. Each recorder's `identity_for` and `phrase_for` are
  `f"{stem}-{date}"` and `f"{label}: {argument}"`. No slotted value is truncated, case-folded, parsed or branched on. `verdict`
  is only interpolated in provider v2 and in the sign-off, and `disposition` only goes through `disposition or "none"`, which
  the kit mirrors by refusing `''`.
- [Observed] Replacement runs in one pass over the template, so a filled value is never rescanned. A function callback means
  `$&`, `$1`, `` $` `` and `$'` are inert.
- [Observed] Patching `vs.beh.digest` reaches only `installed_lines` on the render path. Inside `render_record` and its
  helpers, `beh.digest` occurs only at line 1929. Its other uses (lines 250, 1696, 1697, 1862 and `applied_rows`) are not
  reached from `render_record`.

Adversarial differential (scratch integration test, not retained). It reused the PR's `DIRECT_PY` and drove the kit against
the recorder's own call on the same values. It ran three value sets × every form (4 recorder keys, policy 1–5, class,
5 dossier-local-agent keys, provider v2, registry) and the sign-off over six roots × {null, named} disposition, for
87 cases. The values were:
- `argument` = `x\0date\0y`, `''` and `\0sha\0`
- `date` = `$&$1$$$\``, `\0instant\0` and `\0superseded\0`
- `instant` = NFD `é` + LF + backslash + both quotes + `{x}` + U+2028, `\0argument\0` and `\0supersededDate\0`
- `superseded` = a lone NUL, `$'` and `\0date\0`
- `supersededDate` = `''`, two NULs and `\0argument\0`
- `verdict` = `REVISE`, `\0verdict\0` and `none`
- `disposition` = `\0disposition\0`, an emoji + CRLF, and `none`
- sign-off roots: an entry file, an entry that is a directory, a symlink to a file, a broken symlink, an empty file, and
  non-UTF-8 binary bytes

- [Observed] `ADV cases=87 diffs=0 []`, `Tests 1 passed (1)`.

- **N1 [Observed], low.** An unreadable installed entry renders differently. In the kit, `renderLocalAgentSignoff` wraps
  `statSync` and `readFileSync` in a bare `catch {}`, so an `EACCES` entry renders `Installed entry SHA-256: absent`. The
  recorder instead raises. Probe: a mode-000 entry gives `NOPERM: Installed entry SHA-256: absent` from the kit and
  `PY: raised PermissionError` from `vs.render_record` over the same root. No current consumer builds such a root, so this does
  not change any verdict in the suites. The same catch makes `isFile()` redundant: reviewer mutant R2 below is equivalent. A
  catch narrowed to `ENOENT`/`ENOTDIR` (and `EISDIR`) would match the recorder.
- **N2 [Inferred], low.** `fill` does not assert that the filled text has no NUL left. A slot that a future recorder alters (for
  example `argument[:12]`) would no longer match `/\0(\w+)\0/`, so it would survive as raw NUL bytes in the output with no
  throw. Only the integration differential would catch that, and only for its fixed values. A one-line `includes('\0')` check
  after the replace would make this fail loudly in every tier.

## 3. Does a consumer that forgets `loadRecorderForms` fail loudly?

- [Observed] Yes. A render before loading throws `recorder render failed: the forms are not loaded; await
  loadRecorderForms() at the top of the test file first` (scratch probe `BEFORE-LOAD:`). Removing the top-level await from
  `package-reader.test.ts` fails the file at collection with that message (R6 below). Vitest's default `isolate: true` is not
  overridden in `vitest.config.ts` or `vitest.tiers.ts` (no `isolate`/`pool` setting), so another file's load cannot mask a
  missing await.
- [Observed] Loading in a unit-tier file throws the tier's `refuses child_process ... "python3"` error, so the kit cannot leak
  a process into the unit tier.

## 4. Guard: tightened only

- [Observed] The only hunk in `apps/three-surface-poc/src/sync-child-process-guard.test.ts` deletes the
  `recorder-fixtures.testkit.ts 'python3'` EXEMPT entry (`+0 -2`). No pattern, function list or other exemption changed, so
  nothing is widened.
- [Observed] Adding an `execFileSync('python3', ...)` to the testkit fails the guard (R7 below). That differs from the
  author's G1 mutant, which used `spawnSync`.

## 5. Product build / dist

- [Observed] The testkit's new import `@syzygy/support` is declared: it is a dependency in the consent `package.json` at line
  28, and the consent `tsconfig.json` has it as a reference at line 15. `apps/three-surface-poc/src/product-build.test.ts` on
  the e2e project: `Tests 25 passed (25)`.
- [Observed] Importing the module starts no process; the first spawn is in `loadRecorderForms`.

## 6. Reviewer rule-6 mutants (at the reviewed commit; each restored by `cp` from a saved copy)

| id | file | old | new | test | result |
|---|---|---|---|---|---|
| R1 | testkit | `template.replace(/\0(\w+)\0/g,` | `template.replace(/\0(\w+)\0/,` | `recorder-fixtures.testkit.test.ts` | killed (Failed Tests 2) |
| R2 | testkit | `if (statSync(entry).isFile()) installed` | `if (statSync(entry) !== undefined) installed` | differential + adversarial | survived, equivalent: `readFileSync` on a directory throws `EISDIR` into the same catch (see N1) |
| R4 | testkit (python) | `t['class'] = cls.render_act(A, D, ` | `t['class'] = cls.render_act(A, I, ` | `recorder-fixtures.testkit.test.ts` | killed (Failed Tests 1) |
| R6 | `package-reader.test.ts` | `await loadRecorderForms();` | `void loadRecorderForms;` | that file | killed (collection throws "the forms are not loaded"; no tests) |
| R7 | testkit | `import { execFile } from 'node:child_process';` | `import { execFile, execFileSync } ...;` + `export const probe = (): unknown => execFileSync('python3', ['-V']);` | `sync-child-process-guard.test.ts` | killed (Failed Tests 1) |

## 7. Other observations

- **N3 [Observed], cosmetic.** `packages/polaris-dossier/src/screen-scope-v5.test.ts` adds one blank line inside its
  `beforeAll` Python program string (after `import build_public_source_screening_scope_v5 ...`). That edit is outside the
  stated change. It is harmless to the Python program.
- **N4 [Observed], info.** The 3612-of-3612 population replay cannot be re-run from the record. The record keeps the capture
  method and `loggedOutputsSha256`, but not the log or the replay test ("not retained"). The retained permanent check is the
  23-case differential, and this review's 87-case adversarial run supports the same equivalence.

## 8. Gates at the reviewed commit (scratch worktree, `npm ci` first)

- [Observed] `npm run typecheck`: exit 0.
- [Observed] `npm test`: `Test Files 167 passed (167)`, `Tests 3658 passed (3658)`, exit 0.
- [Observed] `npm run test:integration`: `Test Files 89 passed (89)`, `Tests 2552 passed (2552)`, exit 0; no restart.test.ts
  flake on this run.
- [Observed] e2e `product-build.test.ts`: `Tests 25 passed (25)`.
- [Observed] `python3 scripts/check_governance.py`: `32 OK, 21 WARN, 0 FAIL (53 checks)`, exit 0.
- These match the PR body's stated figures.

## Verdict

CONFIRM WITH EXCEPTIONS. Slot-filling equals the direct recorder render over the adversarial population tried, a missing
load fails loudly, the guard is only tightened, and every gate is green. N1 (unreadable entry rendered as `absent`) and N2 (no
residual-NUL assertion) are low-severity hardening notes. N3 and N4 are notes only.
