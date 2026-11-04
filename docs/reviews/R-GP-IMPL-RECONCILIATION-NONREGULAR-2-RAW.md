# Review: reconciliation refuses nonregular sign-off entries (PR #714, syzygy-j5dg), round 2
Verdict: REVISE
Reviewed commit: 433b59e4e58951cc8ff8b9a56c9cb3dc1b38a831
Subject: PR #714

Reviewer: fresh-context PR reviewer (gidd lane, round 2), 2026-11-04. Scope:
the one changed file, `scripts/check_spec_reconciliation.py` (+265 −7 against
`origin/main` `8ca41d68`, an ancestor of the head), against bead
`syzygy-j5dg`, the round-1 raw (`R-GP-IMPL-RECONCILIATION-NONREGULAR-RAW.md`),
the coordinator's repair ruling (the PR changes nothing main accepts; only
main's crashes and hangs may become structured refusals, exit 1,
`REFUSED R1`) and the GP-Q0 stop clause. Script sha256 at main
`2f75bb22cae10696a517d7587c5a8bba266f8e1259187408ee094e9d48affa78`; at the
head `a85cfd01bd2e0845d5bd812f4a52be5301d3042a4cfbc9857913656fb902bb18`
(the digest the PR body names).

## Findings

### F5 (verdict-changing) — a CI gate green on main is red at the head: the refusal is no longer an `OSError`, and an in-process consumer admits only `OSError`

[Observed] Hosted CI at `433b59e4`: workflow `governance-docs`, run
`41782440516`, job `checks`, step
`prepare_three_surface_poc_governedby_reference_recording --selftest`
fails. The same step passed on main at the PR's base `8ca41d68` (run
`41777137929`). The job log ends:

```
  File ".../scripts/prepare_three_surface_poc_governedby_reference_recording.py", line 1985, in family_failure_selftest
    reconciliation.check_outcomes(tree, report)
  File ".../scripts/check_spec_reconciliation.py", line 894, in check_outcomes
    found = addition_records(root, change)
  File ".../scripts/check_spec_reconciliation.py", line 504, in addition_records
    for path, text in signoff_texts(root):
  File ".../scripts/check_spec_reconciliation.py", line 488, in signoff_texts
    raise SignoffEntriesRefused(refused)
check_spec_reconciliation.SignoffEntriesRefused: `.syzygy/governance/decisions/THREE-SURFACE-POC-GOVERNEDBY-REFERENCE-AMENDMENT-SIGNOFF-v2.0.md`: directory
##[error]Process completed with exit code 1.
```

[Observed] Reproduced locally in a detached worktree at the head: the same
traceback, exit 1.

Mechanism [Observed from code]:
`prepare_three_surface_poc_governedby_reference_recording.py`
`family_failure_selftest` creates a directory at a reserved
`…-SIGNOFF-v2.0.md` path (line 1887, `mutation == "directory"`) and calls
`reconciliation.check_outcomes` and `reconciliation.check_census` inside
`except OSError as reader_error:` (lines 1984-2006). Its comment says "Its
immutable generic addition scan may refuse a nonregular reserved entry before
returning a report. Only this exact fixture input is an admitted refusal", and
the frontier then requires `reader_error.filename` to be that fixture path. At
main the read raised `IsADirectoryError`, an `OSError` carrying `.filename`,
so the consumer recorded an admitted refusal. At the head the read error is
caught and re-raised as `SignoffEntriesRefused(Exception)`, which is not an
`OSError` and has no `.filename`, so it escapes the handler and the
consumer's selftest crashes.

So the PR changes an outcome main accepts: a check that passes on main fails at
the head. That is outside the coordinator's ruling and is a GP-Q0 change to
what a gate accepts. The round-1 review and the repairer's parity differential
both compared only this script's own CLI, so neither saw it.

Sweep of in-process consumers, so the denominator is stated: `git grep -l -F
check_spec_reconciliation -- scripts` gives 11 files (the script itself and
10 consumers). Only the governedby prepare script wraps reconciliation calls
in an `OSError` handler (13 `except … OSError` sites in that file). In the
three other consumers that have one (`build_cap1_trusted_bootstrap_consent_adoption.py`,
`build_polaris_dependency_unions.py`, `install_redis_local_agent_sitting.py`),
the handler does not wrap an in-process reconciliation call; the last one
runs `--regenerate` as a subprocess and reads its exit code.

Suggested repair (the author's choice): keep the refusal an `OSError`
subclass that carries the first refused entry's absolute path as `.filename`
(and `errno` where the read gave one), or re-raise the original `OSError` /
`UnicodeDecodeError` from the library path and keep the structured refusal in
`main` only. Re-run every consumer selftest that imports the module, in
particular the governedby prepare `--selftest` and `--check`, and the full
`governance-docs` battery, not only this script's own `--selftest`. Note that
a `UnicodeDecodeError` is a `ValueError`, and several consumers catch
`ValueError`; the repair has to keep that polarity too.

## Round-1 findings

- **F1 (accept→refuse for `/dev/null` symlink and CRLF): closed for this
  script's CLI** [Observed]. `signoff_texts` reads with
  `path.read_text(encoding="utf-8")`, as main does. My own main-versus-head
  differential (below) gives identical exit, stdout, stderr and tree state for
  both inputs in `--check`, `--census` and `--regenerate`. F5 reopens the
  wider claim, "nothing main accepts changes", for the library path.
- **F2 (CLI exit polarity unpinned): closed** [Observed]. `_cli_exits` drives
  `main` for `--check`, `--census` and `--regenerate` over the directory
  fixture and asserts exit 1, `REFUSED R1` printed and a byte-unchanged tree.
  M1 below is killed.
- **F3 (recorder-parity wording): closed** [Observed]. The docstrings now
  claim parity with main's read only. No remaining sentence claims parity with
  how the recorder reads its records.
- **F4 (fixture coverage): closed** [Observed].
  - Socket (`os.mknod(S_IFSOCK)`) and block-device fixtures exist.
  - The block-device fixture is skipped, and says `SKIPPED`, when no unreadable
    block device exists.
  - Controls write `held` witnesses.
  - `--selftest` is dispatched inside the `SignoffEntriesRefused` handler.

## Independent main-versus-head differential

Method: two detached worktrees, one at `origin/main` `8ca41d68`, one at the
head `433b59e4`. They differ only in this script. Each worktree has the same
fixture applied and runs its own script. For each case and mode the
comparison covers:

- the exit code
- the sha256 of the full stdout
- the sha256 of the stderr, without Python's `SyntaxWarning` lines from an
  unrelated script
- the sha256 of `git status --porcelain -uall` plus `git diff --binary`
  after the run

Timeout 60 s, address-space limit 3 GiB. Fixtures sit in
`.syzygy/governance/decisions/`; `J5DG-X-SIGNOFF-v1.0.md` is the synthetic
entry, and REC is `POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.1.md`.

Results: 19 cases × 3 modes = 57 rows.

- 39 rows (13 cases) are IDENTICAL.
- 15 rows (5 cases) went from crash or hang to `REFUSED R1` exit 1.
- 3 rows (1 case) crash in both.
- 0 rows differ in any other way.
- 0 rows differ in tree state.

| Case | Not in repairer's list | Rows | Outcome |
|---|---|---|---|
| clean tree | | 3 | identical (check exit 0) |
| symlink to `/dev/null` | | 3 | identical (exit 0) |
| symlink to a regular file | | 3 | identical (exit 0) |
| symlink to a real record under a new version name | yes | 3 | identical (check exit 1, `5 of 7`, census 0) |
| CRLF on REC | | 3 | identical (exit 0) |
| CRLF on all 19 records | yes | 3 | identical (check exit 1, `4 of 7`) |
| UTF-8 BOM prepended to REC | yes | 3 | identical (exit 0) |
| trailing bare CR on REC | yes | 3 | identical (exit 0) |
| all-bare-CR line endings on REC | yes | 3 | identical (exit 0) |
| CR before one `Version:` line only | yes | 3 | identical (exit 0) |
| U+2028 inside REC | yes | 3 | identical (exit 0) |
| empty regular entry | yes | 3 | identical (exit 0) |
| hardlink to REC under a new version name | yes | 3 | identical (check exit 1) |
| symlink to a directory | | 3 | main `IsADirectoryError` → head `REFUSED R1` exit 1 |
| directory | | 3 | main `IsADirectoryError` → head `REFUSED R1` exit 1 |
| symlink to a FIFO | yes | 3 | main timeout (124) → head `REFUSED R1` exit 1 |
| non-UTF-8 bytes | | 3 | main `UnicodeDecodeError` → head `REFUSED R1` exit 1 |
| UTF-16 BOM file | yes | 3 | main `UnicodeDecodeError` → head `REFUSED R1` exit 1 |
| symlink to `/dev/zero` | yes | 3 | both `MemoryError`, exit 1 (parity; see note N1) |

So for the script's own CLI the coordinator's ruling holds over this
population. F5 is the one known violation, and it is on the import path.

## Rule-6 mutants (run by this reviewer)

Each mutant was applied to the head's script in its own detached worktree at
`433b59e4` (an exact, unique string replace) and ran the full `--selftest`:

- **M1:** in `main`'s `except SignoffEntriesRefused` branch, `return 1` →
  `return 0`. **Killed**: `--selftest` exit 1, `SELFTEST FAIL: signoff-entry-directory: … ['--check: exit 0, refusal printed True', '--census: exit 0, refusal printed True', '--regenerate: exit 0, refusal printed True']`.
- **M2:** in `signoff_texts`,
  `out.append((path, path.read_text(encoding="utf-8")))` →
  `out.append((path, path.read_bytes().decode("utf-8")))`. **Killed**: `--selftest` exit 1, `SELFTEST FAIL: signoff-entry-control-crlf-record: must read as before and pass; ['R1']`.

Unmutated head: `--selftest` gave `SELFTEST PASS: … 111 of 111 mutants
killed by their expected predicate; 3 of 3 controls held (commit
433b59e4e589)`, exit 0, which matches the PR body.

## Gates at the head (local, detached worktree)

- `check_spec_reconciliation.py --check`: `7 of 7 predicates without FAIL;
  PASS`, exit 0.
- `--selftest`: PASS (above).
- `check_governance.py`: `32 OK, 21 WARN, 0 FAIL (53 checks)`.
- `prepare_three_surface_poc_governedby_reference_recording.py --selftest`:
  **exit 1**, with the F5 traceback.
- Hosted CI at `433b59e4`, `gh pr checks 714`:
  - `checks`: **fail** (F5).
  - `node`, `node (unit)`, `node (integration)`, `node (e2e)`: pass.
- Unresolved review threads: 0.

## Notes

- **N1:** an entry that reads forever (a symlink to `/dev/zero`) still
  crashes with `MemoryError` at both main and the head. That is parity, so it
  is not a defect of this PR. The FIFO pre-check does not cover it, so
  "main's hangs become refusals" holds for FIFOs only. If the owner wants this
  closed, it belongs with `syzygy-vgzf`.
- **N2:** the PR body's parity differential and selftest evidence are
  accurate for what they measured. Its claim "The only outcomes that change
  are main's crashes" is false while F5 stands.

## Merge readiness

Not merge-ready at `433b59e4`: F5 is verdict-changing, and the required
`checks` job is red.
