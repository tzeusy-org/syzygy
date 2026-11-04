# Review: reconciliation refuses nonregular sign-off entries (PR #714, syzygy-j5dg), round 1
Verdict: REVISE
Reviewed commit: 1c57fb2c66e85e1a1dc74192a4172bc6a07f9940
Subject: PR #714

Reviewer: fresh-context PR reviewer (gidd lane), 2026-11-04. Scope: the one
changed file, `scripts/check_spec_reconciliation.py` (+174 −5), against bead
`syzygy-j5dg`, the GP-Q0 stop clause
(`OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`, quoted at
`OWNER-DIRECTION-GREENFIELD-PARITY-FOLLOWUPS-2026-10-28.md:17-20`: "Any change
not listed here to what a gate accepts or refuses stops and returns to the
owner.") and the PR body's own claims. Script sha256 at `origin/main` as
fetched before the review (an ancestor of the head):
`2f75bb22cae10696a517d7587c5a8bba266f8e1259187408ee094e9d48affa78`; at the
head: `3c3d514754f0d621b019126a1e2683024378ed7a7f7654e8ef641a7c41085d68`.

## Findings

### F1 (verdict-changing) — two undisclosed accept-to-refuse changes; the "exit code is unchanged" claim is false

The PR body says "The exit code is unchanged. It was 1 from the traceback and
is 1 from the refusal" and the brief says "Previously each was a traceback with
exit 1". Old-versus-new differential, `--check` in scratch worktrees at
`origin/main` and at the head, one synthetic entry
`.syzygy/governance/decisions/J5DG-X-SIGNOFF-v1.0.md` per kind:

| Kind | main exit | head exit |
|---|---|---|
| directory | 1 (`IsADirectoryError` traceback) | 1 (`REFUSED R1`) |
| FIFO | 124 (`timeout 60`; the read blocks) | 1 (`REFUSED R1`) |
| dangling symlink | 1 (`FileNotFoundError`) | 1 |
| symlink loop | 1 (`OSError` ELOOP) | 1 |
| symlink to directory | 1 (`IsADirectoryError`) | 1 |
| **symlink to `/dev/null`** | **0, `7 of 7 predicates without FAIL; PASS`** (also `--census` exit 0) | 1 (`REFUSED R1`) |
| unreadable (mode 0) | 1 (`PermissionError`) | 1 |
| non-UTF-8 | 1 (`UnicodeDecodeError`) | 1 |
| symlink to a regular file | 0 | 0 (unchanged, the control) |

[Observed] A symlink to a character device that reads as empty was **accepted**
before and is refused now. The brief's own list includes "symlink-to-device",
so the premise that every kind was already exit 1 is wrong for it.

[Observed] Second change, not mentioned anywhere: `addition_records` used
`path.read_text(encoding="utf-8")`, which applies universal-newline translation;
`signoff_texts` uses `path.read_bytes().decode("utf-8")`, which does not. With
`VERSION_LINE = re.compile(r"^Version: (\d+\.\d+)$", re.M)` (line 356) a CRLF
record no longer yields a version. Differential: converting
`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.1.md`
to CRLF gives `OK R1 … 19 examined, 0 findings`, exit 0, at main, and at the
head `FAIL R1 … 1 findings`, "`…-SIGNOFF-v1.1.md` carries no single
`Version:` line", exit 1.

Both changes go toward refusal, and neither changes the verdict over the
current tree: [Observed] 19 `*-SIGNOFF-v*.md` records, 0 contain a CR byte, and
`--check` at the head is `7 of 7 predicates without FAIL; PASS`. But both
change what the gate accepts, neither is a listed change, and the PR presents
the change as polarity-preserving. Under the stop clause this returns to the
owner, or the PR narrows itself back to preserving those outcomes.
Suggested repair: keep `read_text(encoding="utf-8")` (same `OSError` /
`UnicodeDecodeError` behavior, same newline semantics). Then either route the
device-symlink tightening to the owner alongside `syzygy-vgzf`, or record it
as an owner-listed change before merge. Correct the PR body's polarity section
in either case.

### F2 (verdict-changing, test gap) — the CLI exit polarity is unpinned

The selftest fixtures call `run` and `census` directly. Nothing exercises
`main`'s `except SignoffEntriesRefused` branch. Rule-6 mutant **B**, which turns
`return 1` into `return 0` in that branch, **survives** every entry-kind
fixture (0 failures), while `--check` with a directory entry then prints
`REFUSED R1` and exits **0**. The exit code is the behavior GP-Q0 names, and
the PR shows it only by a one-off manual CLI run. Add one fixture that drives
`main([...])` (or a subprocess) over a refused tree and asserts exit 1 for
`--check`, `--census` and `--regenerate`, and that `--regenerate` writes no
file.

### F3 (note) — the recorder-parity claim covers one site, not "how the recorder reads its records"

`record_versioned_signoff.py:1116` does test a record with bare `is_file()`,
which follows symlinks, so a read-through of a symlink to a regular file
matches that site. Two other sites differ:

- `recorded_versions` (lines 1553-1559) counts any glob entry by name with no
  kind check. A directory named `…-SIGNOFF-v1.0.md` is a recorded version to
  the recorder, while the reconciliation now refuses it. That is the fail-closed
  side, so it is not a defect of this PR.
- The recorder refuses symlinks outright for the files it digests
  (`p115_read`, line 495; reviewed package files, line 1694).

The docstrings and the PR body should name the one site the parity holds with.

### F4 (note) — fixture coverage

- `entry_kind`'s `socket` and `block device` names have no fixture, so
  swapping either survives.
- The symlink control appends no witness record, so `--witnesses` cannot show
  it.
- [Inferred from code] `--selftest` is dispatched before the `try` in `main`.
  `selftest` → `scratch` → `inputs` → `addition_records(ROOT, …)` raises
  `SignoffEntriesRefused` uncaught when the real tree holds a bad entry. That
  is still exit 1, by traceback. The docstring's "Every mode" excludes it
  silently.

## Questions the brief asked

- **Is the script unfrozen?** Yes [Observed].
  - No tracked file cites the pre-PR sha (`git grep -F 2f75bb22` gives 0 hits).
  - The P115 (`docs/evidence/p115-implementation-authorization-2026-10-28/`:
    `MANIFEST.json:4767-4771`, `SOURCE-BINDINGS.json`,
    `CURRENT-SOURCE-REFRESH.json`, `CONSUMER-CENSUS.json`) and
    shared-mutation-runner (`refresh/MANIFEST.json:195`, `R2-CHANGE.json:192-193`)
    manifests pin `2219d1b8…`. That is a retained copy at
    `source/scripts/check_spec_reconciliation.py`, which is not in the tracked
    tree.
  - Main had already drifted from those bytes (`ad9cf65a`, `5c329704`) with CI
    green.
  - No file under `scripts/` or `.github/` names either evidence directory, so
    no live check re-verifies those pins.
  - The re-run commands recorded there (`--check`, `--selftest`) give the same
    verdict on the current clean tree.
  - `three-surface-poc-governedby-reference-amendment/IMPACT-SWEEP.json:5649`
    classifies the path `affected-preparation-gate` and binds no digest.
- **Exit polarity per kind:** see the F1 table. It is unchanged for 6 kinds,
  changed accept→refuse for symlink-to-empty-device and for CRLF records, and
  changed hang→refuse for a FIFO.
- **Does `--regenerate` write nothing on refusal?** Yes [Observed].
  - `regenerate` calls `census` before `write_additions`.
  - For all 8 refused kinds plus `/dev/null`, `--regenerate` exited 1 with
    `REFUSED R1`.
  - `find -newer` over the scratch worktree found no new file except
    `scripts/__pycache__` on a first run, and `git status --short` was empty
    after each run.
- **Is there a silent-skip or PASS path?** None found for a nonregular entry
  [Observed + Inferred].
  - `compose_cap1` calls `cap1_overlay_signed` → `addition_records`
    unconditionally (line 1301), so `census`, and through it `run`, always reads
    the whole population while the CAP1 spec exists. A missing CAP1 spec is its
    own FAIL.
  - All 9 kinds × 3 modes were refused at the head; the regular-file symlink
    passes by design (`syzygy-vgzf`).
  - Mutants A and C (below) show the fixtures catch silent skipping.

## Rule-6 mutants (mine), applied to the head's script in a scratch worktree

Each mutant ran the 8 kind fixtures plus the control through
`_entry_kind_cases` over a fresh `scratch` + `_propose_candidate` base (the
unmutated baseline gives 0 failures), plus a CLI `--check` with a directory
entry.

| ID | old → new | Fixture failures | CLI dir `--check` | Outcome |
|---|---|---|---|---|
| A | `if refused:` → `if False:` | 8 (every kind) | exit 0, no refusal | killed |
| B | `return 1` → `return 0` in `main`'s refusal handler | 0 | exit 0, `REFUSED R1` printed | **survived (F2)** |
| C | nonregular branch `refused.append(…); continue` → `continue` | 6 (dir, FIFO, dangling, loop, link-dir, device) | exit 0 | killed |
| E | `"symlink loop" if` → `"dangling symlink" if` | 1 (loop) | exit 1 | killed |
| I | `path.read_bytes().decode("utf-8")` → `path.read_text(encoding="utf-8")` | 0 | exit 1 | **survived**: the newline change in F1 is invisible to the selftest |
| J | `if not path.is_file():` → `if path.is_symlink() or not path.is_file():` | 1 (control) | exit 1 | killed |
| K | unreadable branch `refused.append(…)` → `pass` | 1 (unreadable) | exit 1 | killed |

The script was restored byte-identical afterwards (`cmp` against a saved copy;
`git status --short` empty).

## Gates at the head (`1c57fb2c`)

- `check_spec_reconciliation.py --check`: exit 0, `7 of 7 predicates without
  FAIL; PASS`. R6 WARN, as on main.
- `check_spec_reconciliation.py --selftest`: exit 0, `SELFTEST PASS … 110 of
  110 mutants killed by their expected predicate (commit 1c57fb2c66e8)`,
  17:58 wall.
- `check_governance.py`: `32 OK, 21 WARN, 0 FAIL (53 checks)`.
- `check_governance.py --selftest`: `433 fixtures, 0 failing`.

## What holds

- The refusal is named, per entry, and complete over the population.
- A FIFO is never opened.
- `--regenerate` writes nothing.
- No nonregular kind passes or is read as absent.
- The 8 new fixtures each die to their own mutant.
- The script is not frozen.

The REVISE rests on F1 (undisclosed gate-acceptance changes under the stop
clause, and a false polarity claim) and F2 (the exit polarity the PR is about
has no automated pin).
