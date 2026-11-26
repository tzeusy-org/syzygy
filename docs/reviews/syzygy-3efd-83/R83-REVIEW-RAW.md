# R83 code review: clone-ref, launch-ref and verify --text bounded reads (syzygy-3efd.83)

Verdict: READY WITH NOTES
Subject: `git diff origin/main...3df966be` (origin/agent/syzygy-3efd.83), worktree `.worktrees/review/r83` detached at 3df966be, `npm ci` clean.
Reviewer: fresh-context, read-only. Date: 2026-11-24.

## Summary

[Observed] The three stat-then-read readers (`clone-head.ts` `readSmall`, `launch-clone.ts` `readBounded`, `verify-text-run.ts`
`readVerifyText`) now read through `readBoundedFile`: one `O_RDONLY | O_NONBLOCK | O_NOCTTY` open (plus `O_NOFOLLOW` for the two clone
readers), type and size from `fstat` on that descriptor, at most bound + 1 bytes read. FIFO, swapped-in FIFO, link, directory, oversize and
grown-after-fstat are all refused and pinned by literal-valued tests. The default path of the shared reader is byte-for-byte unchanged for
its 26 existing call sites. No blocking finding. Notes: one quiet semantic loosening in the launch reader (growth within the bound is no
longer refused), two branches no test pins (each survived an exploratory mutant), and the pre-existing last-component-only scope of
`O_NOFOLLOW`.

## Criterion 1: behaviour unchanged within the bound

- [Observed] `check-record-read.ts:34`: `readBoundedFile(file, maxBytes, options = {})` passes `options.followLink ?? true`; with `true` the
  open flags OR in `0`, so the flag word is identical to `origin/main` (`O_RDONLY | O_NONBLOCK | O_NOCTTY`), and the new `ELOOP` mapping is
  guarded by `!followLink`. `readFileAsSized` passes `true` explicitly. `check-record-read.test.ts:220` still asserts that exact flag word
  and passes.
- [Observed] Call-site diff: `git grep -nE "readBoundedFile\(|readFileAsSized\("` at 3df966be, non-test, gives 28 product call lines
  (plus the 2 definitions and `readCheckRecord`). Only `clone-head.ts:29` and `launch-clone.ts:90` pass a third argument
  (`{ followLink: false }`); `verify-text-run.ts:79` passes two. Every other site is untouched by the diff.
- [Observed] Wording kept for in-bound and refused files: clone-head `is not a regular file`, `is larger than <limit> bytes`,
  `cannot be read (<code>)`; launch `is not a regular file; it is refused, never followed`, `is larger than <limit> bytes`,
  `cannot be read (<code>)`, absent -> null; verify `is not a regular file`, `is larger than the 4194304-byte text bound`,
  `the text <f> cannot be read (<code>)`. All are the pre-change literals.
- [Observed] Node 24 `lstatSync(p, { throwIfNoEntry: false })` still throws `ENOTDIR` (checked in a scratch dir), so the launch reader's
  `ENOTDIR` outcome is unchanged (`cannot be read (ENOTDIR)`).
- Exceptions: see findings 1 and 3.

## Criterion 2: holes closed, no TOCTOU defeating the bound

- [Observed] FIFO: `O_NONBLOCK` open of a FIFO with no writer returns at once; `fstat` -> not a file -> refused. Tests at HEAD, the loose
  branch, launch HEAD and config (`clone-ref-read-bounds.test.ts`).
- [Observed] FIFO swapped in after lstat: launch test stages the race by patching `lstatSync`; the descriptor decides. clone-head has no
  lstat left at all.
- [Observed] Symlink: `O_NOFOLLOW` -> `ELOOP` -> `NotARegularFileError`; tests with a link to `/dev/zero` and to a regular file holding a
  valid commit (the second proves "never followed", not merely "refused because the target is odd").
- [Observed] Directory, oversize (sparse 4,097 / 16,777,217 / 4,194,305 bytes), and grown after fstat (patched `fstatSync` appends one
  byte) all refused with literal reasons.
- [Inferred] No TOCTOU defeats the bound: the type and size come from the descriptor, and the read loop stops at bound + 1 regardless of
  what `fstat` said, so even a regular file whose size lies (procfs, size 0) is read at most bound + 1 bytes. The only remaining pre-open
  look is the launch reader's existence probe, which no longer decides what is read.
- Residual scope, finding 4: `O_NOFOLLOW` covers the last component only.

## Criterion 3: verify --text link following

- [Observed] `readVerifyText` follows a link (default `followLink: true`), as `statSync` + `readFileSync` did before. Test
  `reads a regular file through a symbolic link` pins it; my mutant adding `{ followLink: false }` is killed by exactly that test.
- [Observed] Link to `/dev/zero`: open succeeds, `fstat` says character device, refused before any read (test pins it).
- [Inferred] Link to a FIFO: the open is non-blocking and `fstat` refuses it, so no hang. Link to a socket: `open` fails `ENXIO` ->
  `cannot be read (ENXIO)`. Link to a tty: `O_NOCTTY`. Link to a size-lying regular file (procfs): read stops at 4,194,305 bytes and is
  refused. Link loop: `ELOOP` -> `the text <f> cannot be read (ELOOP)`, as before (unpinned, finding 2).
- [Inferred] Remaining hang only on a regular file whose `read` blocks (a FUSE or hung NFS mount); `O_NONBLOCK` does not apply to regular
  files. Same as before the change; the path is operator-named. Not a finding.

## Criterion 4: spec-stated words

- [Observed] Sweep over `openspec/` and `.syzygy/` (`grep -rlF`, file counts): `ELOOP` 0, `refused, never followed` 0,
  `grew while` 0. The old launch wording (`cannot be read (ELOOP)`) and the new (`is not a regular file; it is refused, never followed`)
  appear in no spec. `is not a regular file` (17 files) and `larger than` (22) appear, but only in run-tree reader wording
  (`dossier-verify-text/proposed/.../spec.md:23`, the 2.10 reader rule), which this change does not alter.
- [Observed] No spec line states a byte bound for the clone refs, packed-refs, config, or `--text`: the `--text` requirement
  (`dossier-verify-text/proposed/polaris-generation/spec.md:37`) and the launch closed list
  (`polaris-dossier-launch-consent/specs/polaris-generation/spec.md:253`) name no figure. Consistent with the code-stated-bound decision
  and follow-on syzygy-nffo.

## Criterion 5: literal expectations and mutants

- [Observed] Every expectation in `clone-ref-read-bounds.test.ts` is a literal or a path join with literal words; bounds are literal
  constants (4096, 16_777_216, 4_194_304), not imported from the module under test.
- [Observed] Mutation record `docs/evidence/syzygy-3efd-83/clone-ref-bounds-mutation-2026-11-24.json`: commit `0bf2bdda`, each of 24
  mutants stores `old`/`new`, 24 killed (22 by tests, 2 by timeout). Subject sha256 of all four source files matches 3df966be (the only
  later commit adds the record itself).
- [Observed] Sampled mutants applied by me (`/home/orca/.tmp/r83/mut.sh`, six test files, 242 tests), each restored by `git checkout`:
  - `launch-clone.ts` existence probe `if (fs.lstatSync(file, { throwIfNoEntry: false }) === undefined) return null;` -> `void 0;`:
    KILLED, 4 failures in `launch-clone.test.ts` (closed-list tests).
  - `verify-text-run.ts` `readBoundedFile(textFile, VERIFY_TEXT_MAX_BYTES)` -> `..., { followLink: false })`: KILLED, 1 failure
    (`reads a regular file through a symbolic link`).
  - `clone-head.ts` delete the `PastBoundError` mapping line: KILLED, 3 failures (HEAD 4,097, grown HEAD, packed-refs 16,777,217).
- [Observed] Two exploratory mutants SURVIVED (242 / 242 pass): see findings 2 and 3.

## Criterion 6: the sweep

- [Observed] Re-ran `unbounded_read_sweep.py` at 3df966be: 81 sites over 123 files, rows identical to the stored record (stored subject
  commit is `999b9ca7`; source unchanged since). Counts: already-bounded 30, not-run-tree 32, in-scope 11, bounded-code-stated 3,
  not-a-file-read 3, not-agent-writable 1, residual 1 (sum 81).
- [Observed] Second method: `perl` over the same `git ls-files` population with the same call regex and exclusions: 81. The exclusions
  remove only 4 definition lines (`check-record-read.ts:34`, `:45`, `rerender-measure.ts:273`, `run-dir.ts:91`), enumerated.
- [Observed] Five sampled classifications, each checked against source:
  - `clone-head.ts:29` bounded-code-stated: correct (reads via `readBoundedFile(..., { followLink: false })`).
  - `launch-copy.ts:169` not-agent-writable: lstat + 4,096 size check then `readFileSync` of HEAD in Syzygy's own fresh copy after
    `git init/fetch/checkout`. [Inferred] correct as classified; it remains a stat-then-read, honestly recorded "not changed".
  - `launch-disclosure.ts:89` residual: `readLaunchDisclosure` / `recordIssuedBrief` have no non-test caller (`grep`); correct.
  - `waiting-sessions.ts:553` in-scope: `readRecord` (`run-dir.ts:91`) reads via `readBoundedText` under `RUN_TREE_BOUNDS.record`;
    correct (the label "in-scope" is the .80 record's, meaning bounded in that bead; see finding 5).
  - `doctrine-quote.ts:43` not-run-tree: Syzygy doctrine file read under its own stat bound; correct.

## Criterion 7: checks

- [Observed] `npm run check` at 3df966be: exit 0; Test Files 215 passed (215); Tests 5486 passed, 1 skipped (5487). Typecheck clean.
- [Observed] The new test file is in the integration tier (`vitest.tiers.ts`), so `npm run check` does not run it. Run directly:
  `clone-ref-read-bounds.test.ts` 19, `launch-clone.test.ts` 20, `check-record-read.test.ts` 12 (51 passed);
  `verify-text.test.ts`, `gate-parts.test.ts`, `cli.test.ts` 203 passed.

## Criterion 8: readability and craft

- [Observed] Net simplification: launch's hand-written loop (14 lines) and clone-head's lstat chain are gone; one shared rule. Error
  mapping is three explicit `instanceof` lines per reader. The option is a named interface with a doc comment saying why it exists.
- [Observed] Test helpers (`clone`, `fifo`, `linkTo`, `sparse`, `grownAfterFstat`) are small and read well; the race is staged, not
  slept for.

## Findings

1. note, `packages/polaris-dossier/src/launch-clone.ts:81-96`. [Observed] The launch reader no longer refuses a file that grows while it
   is read but stays within its limit. On `origin/main` the loop allocated `size + 1` and returned `` `${file} grew while being read` `` the
   moment it filled; `readRegularFile` now grows the buffer up to `limit + 1` and accepts the longer content. So "behaviour unchanged within
   the bound" holds for a stable file, not for a file growing during the read. The phrase appears in no spec and no test (both swept, 0
   hits), and the bound still holds, so this is not blocking. [Inferred] Git writes refs by rename, so in-place growth is an attacker or
   race shape, and accepting its bytes as a claim is safe because the pin is re-hashed later. Repair: name the change in the bead close
   note or the adoption row ("growth within the bound is accepted, as every 2.10 reader accepts it"), or drop the claim of unchanged
   behaviour for this case.
2. note, `packages/polaris-dossier/src/check-record-read.ts:56`. [Observed] Mutant `if (!followLink && (cause as` -> `if ((cause as`
   survived all 242 tests: nothing pins that the default (link-following) path keeps reporting the open's own `ELOOP`. That guard is what
   keeps the 26 existing callers' outcomes unchanged for a link loop. Repair: one test, e.g. `readVerifyText` on a self-referencing link
   expects `{ reason: \`the text ${file} cannot be read (ELOOP)\` }`, or `readBoundedFile` default throwing an error with `code: 'ELOOP'`.
3. note, `packages/polaris-dossier/src/launch-clone.ts:94`. [Observed] Mutant `return code(cause) === 'ENOENT' ? null : {` ->
   `return {` survived. A file removed between the existence probe and the open is now treated as absent (null); before, the open's
   `ENOENT` gave `cannot be read (ENOENT)`. Arguably the better outcome, but an unpinned behaviour change. Repair: a staged-race test
   (patch `lstatSync` to report the entry, leave the path absent) expecting the absent outcome, or keep the old refusal.
4. note, `clone-head.ts:40-70`, `launch-clone.ts` (pre-existing). [Inferred] `O_NOFOLLOW` refuses only a link at the last component. A
   `.git` or `refs/heads` directory swapped for a link after `resolveCloneHead`'s `lstat` of `.git` is still followed, and
   `fs.existsSync(loose)` follows a link (a dangling link at the loose ref falls through to packed-refs). The byte bound still holds on
   every path, so criterion 2 is met; the "never followed" doc claims are about the file itself. Same as `origin/main`. Repair: none
   required here; if wanted, a follow-on to state the last-component scope in the module docs.
5. note, `docs/evidence/syzygy-3efd-83/unbounded-read-sweep-2026-11-24.json`. [Observed] The class `in-scope` (11 rows) is carried
   verbatim from the 3efd-80 record, where it meant "a run-tree read that bead bounded"; read cold in this record it suggests open work.
   The record's subject commit is `999b9ca7`, the mutation record's `0bf2bdda`, the branch head `3df966be`; source is identical across
   all three (re-derived), so nothing is stale. Repair: optional, add a one-line legend of the carried class names to the record or script.
6. note, `vitest.tiers.ts:88`. [Observed] The new tests sit in the integration tier, so `npm run check` (5486 tests) never exercises the
   change; only `check:all` does. Reasonable given `mkfifo` and 16 MiB sparse files. No repair; stated so a reader of "check green"
   does not assume coverage.

No blocking findings.
