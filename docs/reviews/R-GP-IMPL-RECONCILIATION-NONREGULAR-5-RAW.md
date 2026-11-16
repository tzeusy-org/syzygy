# R-GP-IMPL-RECONCILIATION-NONREGULAR-5 — independent review of PR #714
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 23046797509630d4a9ddc55666b910ef728072d0
Base: 7f237f091ad7086d6728ad48db4257452cf0d5bc

Subject: `scripts/check_spec_reconciliation.py` at the reviewed commit, SHA-256 `7de29ea0218b061cf4a7d0dc3e32723305f850949f04567476d09b171a8a9645`, with its evidence under `docs/evidence/syzygy-j5dg/`. Base: `origin/main` as fetched 2026-11-17, which is the branch's merge base. Main's checker SHA-256 is `113cd6e9a8dbd3765fa37d12d8c91b6ce11e23e3166d39cfbfe3cbbae70367b8`. The round-4 head `f0ccc4b3` has checker SHA-256 `0716061d99e35124f5cf745cce99707617ac19f0c64ed16f6de58286b528469d`, the digest round 4 reviewed. Reviewer: fresh-context Claude reviewer. I did not author or repair this change. I did not edit the branch, write to `bd`, push, merge or record any act. Governing references read: AGENTS.md verification rules 1–11; owner answer `pr714-fifo-refusal` B (`.syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-15.md:151-164`); round 4's raw. Acceptance criterion (the brief's): any row where the subject accepts or refuses differently from main is a finding, unless main crashed and the subject now gives a structured `REFUSED`. Any new hang or crash where main did not hang or crash is also a finding.

No revise finding. F7 is closed. Three notes follow (N1–N3); none changes what the checker accepts or refuses relative to main.

## F7 — closed

Round 4's wording (`docs/reviews/R-GP-IMPL-RECONCILIATION-NONREGULAR-4-RAW.md:10`): "In CLI collection mode, `signoff_texts` keeps reading after the first refused entry … It skips only a FIFO … Every other later entry is opened with `read_text` … The same reason applies to any blocking character device, and the guard does not cover one." Its title (`:8`): "collection opens entries main never reached, so a main crash can become a hang".

[Observed] At the subject, the guard reads `if refused and not _is_regular(path):` (`scripts/check_spec_reconciliation.py:515`). `_is_regular` (`:473-479`) is `stat.S_ISREG(path.stat().st_mode)`, so symlinks are followed, and it returns False when `stat` raises. Once an entry is refused, any later entry that is not a regular file is named with `entry_kind` and ", not opened because an earlier entry is refused" (`:516-518`), and nothing opens it. `refused` is appended only in the `collect` branch (`:523-530`). So the guard cannot fire in library mode, and it cannot fire before the first refusal. `git diff f0ccc4b3 23046797 -- scripts/check_spec_reconciliation.py` has four hunks: `_is_regular` replaces `_is_fifo`, the docstring, the guard line, and the selftest's after-refusal cases. Nothing else in the checker changed.

[Observed] Round 4's two F7 shapes, from my own differential (rows `dir-then:ptmx` and `dir-then:devzero`, all three modes): main exits 1 with an `IsADirectoryError` traceback. The round-4 head HANGs on ptmx and dies with `MemoryError` on /dev/zero. The subject gives `REFUSED R1` with exit 1 in every mode. The same holds with a non-UTF-8 regular file as the refused first entry (`nonutf8-then:ptmx`, `nonutf8-then:devzero`).

## Differential (own harness)

[Observed] Harness: `r5diff.py`. Main's checker and the round-4 checker were copied as untracked siblings (`scripts/_r5_main.py`, `scripts/_r5_r4.py`) into the subject worktree, so all three read the same tree. They were removed afterwards. Each run used a 20 s timeout and `RLIMIT_AS` = 3 GiB. Entries were `A-R5REV-SIGNOFF-v1.0.md` and, where a second entry is needed, `ZZ-R5REV-SIGNOFF-v1.0.md`. Link targets were non-glob `_r5_*.target` files. Live-writer FIFO cases ran the three checkers one at a time; a threaded writer served a finite stream to every open. `git status --porcelain` was checked after every case and was never dirty, so no mode wrote.

Population (unique): 40 cases × 3 modes = 120 rows. They are 37 cases in `rows.jsonl` (111 rows) plus 3 large-file cases in `rows2.jsonl` (9 rows). `rows2.jsonl` also re-runs the 6 live-writer cases (18 rows) with nothing else reading the tree. Their outcomes match `rows.jsonl`, and the stdout digests are equal on all three sides. The shapes are FIFO with a live writer, writerless FIFO, symlink to each, symlink to `/dev/ptmx`, symlink to `/dev/zero`, symlink to a non-UTF-8 regular file, symlink to a directory, dangling symlink, symlink to a good UTF-8 file, symlink to `/dev/null`, and symlink to a 4 GiB sparse regular file. Each shape was run in three positions:
- alone;
- after a refused directory (`dir-then:*`), plus four shapes after a refused non-UTF-8 file;
- before a refused directory (`*:then-dir`).

Main vs subject over the 120 unique rows, classified by script:

| main → subject | rows |
|---|---|
| crash → `REFUSED` | 75 |
| identical accept (exit 0, same stdout digest) | 12 |
| identical hang (both time out) | 18 |
| identical crash (`MemoryError` both) | 12 |
| crash → different crash (`IsADirectoryError` → `MemoryError`) | 3 (N1) |

Second method: `Counter` over (main class, subject class) across both files gives 0 rows where exactly one side accepts, and 0 rows where main exits cleanly or refuses while the subject hangs or crashes. A `grep -o` of the subject class literals gives REFUSED 75 + 12, EXIT0 12 + 6, HANG 18 + 0 and CRASH 6 + 9 across the two files. With the 18 re-run live-writer rows of `rows2.jsonl` (12 REFUSED, 6 EXIT0) set aside as duplicates, that is 75 + 12 + 18 + 15 = 120, which matches the table (75 + 12 + 18 + 12 + 3). No row accepts on one side and refuses on the other. No row has a new hang. No row has a crash where main did not crash.

- Live-writer FIFO, alone and through a symlink: exit 0 on all three sides, with equal stdout in all modes. Owner answer B holds.
- Writerless FIFO, alone and through a symlink: hangs on all three sides in all modes, unchanged and still the owner's question per the docstring. The same holds when it sorts before a refused directory.
- `/dev/ptmx` alone or before a refused directory: hangs on all three sides. `/dev/zero` alone or before a refused directory: `MemoryError` on all three sides. Both are the disclosed pre-refusal remainder.
- Every F7 shape after a refused entry gives main crash → subject `REFUSED`, including the live-writer FIFO, which main never reached.

## Behaviour before the first refusal is byte-identical to `f0ccc4b3`

[Observed] Over the 66 rows in the `alone:*` and `*:then-dir` populations, round-4 head and subject agree on class, exit code, stdout digest and stderr in every row with these exceptions, each explained:
- `alone:devzero` and `devzero:then-dir` (6 rows): the only stderr difference is traceback line numbers (`544`→`549`, `519`→`524`), the five docstring lines added.
- `sym-nonutf8:then-dir`, `sym-dir:then-dir` and `dangling:then-dir` (9 rows): the only difference is the later directory's finding, which gains ", not opened because an earlier entry is refused". That entry comes after the first refusal, so this is after-refusal behaviour by construction.

In code, the only predicate added is guarded by `refused`, which is empty until the first refusal.

## F5 — in-process callers keep main's exceptions

[Observed] I loaded main's module (from a main worktree) and the subject's module side by side.
- `addition_records(root, "x")` over a temp root holding a directory, an unreadable file (mode 0), non-UTF-8 bytes, a dangling symlink, a symlink to a directory, a directory then a FIFO, a directory then a ptmx symlink, and non-UTF-8 then a `/dev/zero` symlink: 8 of 8 raise the same class, message, `.filename` and `errno` on both sides.
- `run(tree)` and `census(tree)` over `scratch()` copies of the repository with a directory, non-UTF-8 bytes, a dangling symlink, a directory then ptmx, and a directory then a FIFO: 10 of 10 the same (`f5b.log`, "10 of 10 same").

No `SignoffEntriesRefused` reaches an in-process caller, and none hangs on the after-refusal device, because main's first error propagates before the guard is reached.

## Rule 6

[Observed] I ran the mutants in a separate detached worktree at `23046797`. My copy of the author's runner (`r5_mutations.py`) differs only in its `MUTANTS` list. Each mutant drives `_entry_kind_cases` over the selftest's scratch base. Baseline: exit 0, `FAILURES 0`. The subject was restored to SHA-256 `7de29ea0…a9645` (verified by the runner's assert and by `sha256sum`). The tree was clean afterwards.

| Mutant | Fragment | Outcome |
|---|---|---|
| author F7-M2-fifo-only-guard | `if refused and not _is_regular(path):` → `if refused and stat.S_ISFIFO(path.stat().st_mode):` | killed: `FAILED ['signoff-entry-symlink-to-ptmx-after-refusal', 'signoff-entry-symlink-to-dev-zero-after-refusal']` |
| own R5-B-not-dir-is-regular | `return stat.S_ISREG(path.stat().st_mode)` → `return not stat.S_ISDIR(path.stat().st_mode)` | killed: the FIFO, symlink-to-FIFO, ptmx and /dev/zero after-refusal cases all fail |
| own R5-A-unstatable-is-regular | in `_is_regular`, `except OSError: return False` → `return True` | **SURVIVED** (N2) |

## Notes

N1 — note: a large regular file after a refused entry still loses the structured refusal under a memory limit. [Observed] `dir-then:sparse4g`, a refused directory then a symlink to a 4 GiB sparse regular file: main exits 1 with `IsADirectoryError`, while the round-4 head and the subject exit 1 with `MemoryError` in all three modes (0.1–2.4 s, 3 GiB cap). This is the same crash-to-different-crash class that round 4 counted under F7 for `/dev/zero`. Here the subject reaches it by design: it reads every later regular file so the file's own error can be named (PR body; docstring `:503-505`). Round 4's suggested repair made the same choice. It is neither an accept/refuse change nor a new crash where main did not crash, and the same file before any refusal crashes main identically (`alone:sparse4g`, `sparse4g:then-dir`: `MemoryError` on all three sides). [Inferred] Opening no later entry at all after a refusal would close it, at the cost of naming fewer findings. That trade is engineering, not an owner question.

N2 — note: no fixture pins an unstatable entry after a refusal. R5-A survives. Under that mutant, a dangling symlink or a symlink loop after a refused entry is opened instead of named. [Inferred] The open fails at once with an `OSError`, which collection already turns into a named refusal via `entry_kind`, so only the finding text changes ("dangling symlink (…)" without ", not opened …"). There is no hang and no verdict change. My differential shows the subject's behaviour on `dir-then:dangling` is `REFUSED` in all modes. This is round 4's R4-A pattern again: correct behaviour with nothing pinning it.

N3 — note: the author's F7 evidence is anchored to pre-rebase commits. `differential-f7-summary-2026-11-17.json` and `mutations-f7-2026-11-17.json` name main `d065b481` and head `77a5d381`, not `7f237f09` and `23046797`. Each also records the checker digests: head `7de29ea0…` and main `113cd6e9…`. I recomputed both and they equal the reviewed bytes, so under rule 11 the records still bind the bytes reviewed. The PR body discloses the rebase. The r4-differential harness is byte-identical to round 4's `diff714-v2.py` (both SHA-256 `967c3a9c…be52d`). A `grep -F -c` of its rows reproduces the claimed 21 IDENTICAL, 30 crash→REFUSED and 0 DIFFERENT.

## Retained raws and campaign

[Observed] `docs/reviews/R-GP-IMPL-RECONCILIATION-NONREGULAR-4-RAW.md` is byte-exact against `/home/orca/.tmp/syzygy-looper-20261116/R-GP-IMPL-RECONCILIATION-NONREGULAR-4-RAW.md`. `cmp` reports no difference, both SHA-256 are `ad677c64dd84fb457d2605524387bef3bf18ba526cdde81cc07b99191329453d`, and both git blobs are `7668ff94`. The first three raws match their blobs on `origin/agent/syzygy-gidd` (`83f3c06a`, `b8d3cc9b`, `dc71cff6`). Line 2 of each of the four raws is `Verdict: REVISE`.

[Observed] `docs/review-campaigns/greenfield-parity-implementation.md`: numstat against `origin/main` is `2 0`, and main's 91,012 bytes are an exact prefix of the subject's 92,517. The change is append-only. The appended paragraph's verdict words (`REVISE` for rounds 1–4) match line 2 of each raw.

## Checks run at the subject (review worktree, `23046797`)

[Observed]
- `--selftest`: exit 0, `SELFTEST PASS: clean scratch copy and its signed- and adopted-addition variants pass; 115 of 115 mutants killed by their expected predicate; 4 of 4 controls held (commit 230467975096)`, 4 min 2 s.
- `--check`: exit 0, `7 of 7 predicates without FAIL; PASS`. R1–R5 and R7 are OK. R6 is WARN, the pre-existing report-only pin naming `syzygy-2g0d`.
- `python3 scripts/check_governance.py`: exit 0, `32 OK, 21 WARN, 0 FAIL (53 checks)`.
- `scripts/check_docs_review_campaign_partition.py --check`:
  - `second-method PASS: git ls-files=877; git ls-tree=877; exact path sets equal`
  - `partition PASS: denominator=877; assigned=877; raw=830; other=47; unmatched=0; overlaps=0; campaigns=153`

I did not run check:all.

## Hygiene

[Observed] Every FIFO, symlink, target and directory I created was removed after each case. A sweep for named pipes owned by `orca` under the review worktrees and `/tmp`, modified 2026-11-17, finds only three created before this review began (00:42–01:11 +08; the review worktree was created 02:41). None is mine, and I left them. The auxiliary main, round-4 and mutation worktrees were removed. The review worktree `.worktrees/review/r-714-5` is clean.

## Evidence

Everything is under `/home/orca/.tmp/syzygy-looper-20261116/r714-5-evidence/` (SHA-256):
- `r5diff.py` `58099669…` (final form). `rows.jsonl` ran before the `sparse4g` shape was added. That is the only edit; it adds one shape.
- `rows.jsonl` `3b5f7521…` and `rows2.jsonl` `681142ab…`
- `f5.py` `4e12fb2d…`, `f5b.py` `78f2923c…` and `f5b.log` `1b7aee3a…`
- `r5_mutations.py` `9e236dd9…`, `mutations.json` `fc213bb9…` and `mut.log` `6d4f5dc8…`
- `selftest.log` `002b16da…`
