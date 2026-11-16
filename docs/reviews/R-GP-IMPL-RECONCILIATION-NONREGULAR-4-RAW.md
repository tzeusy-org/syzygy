# R-GP-IMPL-RECONCILIATION-NONREGULAR-4 — independent review of PR #714
Verdict: REVISE
Reviewed commit: f0ccc4b3f1642e5644a9838f61f7c980f01fa39f
Base: d065b481e0674cc98c21102c789fef7865653f60

Subject: `scripts/check_spec_reconciliation.py` at the reviewed commit, SHA-256 `0716061d99e35124f5cf745cce99707617ac19f0c64ed16f6de58286b528469d`, with its evidence under `docs/evidence/syzygy-j5dg/`. Base: `origin/main` as fetched 2026-11-17, which is also the branch's merge base. Its checker SHA-256 is `113cd6e9a8dbd3765fa37d12d8c91b6ce11e23e3166d39cfbfe3cbbae70367b8`. Reviewer: fresh-context Claude reviewer; I did not author or repair this change, and I did not edit the branch, write to `bd`, push, merge or record any act. Governing references read: AGENTS.md verification rules 1–11; owner answer `pr714-fifo-refusal` (B) in `.syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-15.md:151-164`; round 3's raw `docs/reviews/R-GP-IMPL-RECONCILIATION-NONREGULAR-3-RAW.md`. The acceptance criterion applied is the brief's: any row where the subject accepts or refuses differently from main is a finding, unless main crashed and the subject now gives a structured `REFUSED`.

## F7 — revise: collection opens entries main never reached, so a main crash can become a hang

[Observed] In CLI collection mode, `signoff_texts` keeps reading after the first refused entry (`scripts/check_spec_reconciliation.py:508-530`). It skips only a FIFO (`:510-513`). Every other later entry is opened with `read_text` (`:519`). Main stopped at the first read error and never opened those later entries. The docstring gives this reason for the FIFO rule: "opening it could block where main crashed" (`:498-499`). The same reason applies to any blocking character device, and the guard does not cover one.

[Observed] My differential: a directory entry `A-J5DGR4-SIGNOFF-v1.0.md`, followed in sort order by `ZZ-J5DGR4-SIGNOFF-v1.0.md`, which is a symlink to `/dev/ptmx`. Each run had a 25 s timeout and a 3 GiB address-space limit:

| Mode | Main | Subject |
|---|---|---|
| `--check` | exit 1, `IsADirectoryError` traceback | HANG (timeout) |
| `--census` | exit 1, `IsADirectoryError` traceback | HANG (timeout) |
| `--regenerate` | exit 1, `IsADirectoryError` traceback | HANG (timeout) |

[Observed] Control: a symlink to `/dev/ptmx` on its own hangs on both sides in all three modes (`ptmx-alone`, IDENTICAL). So the regression comes from reading past the refusal, not from the device. Main refused this tree, by crash, in under a second. The subject never returns a verdict. This is neither "accepted" nor "a main crash turned into a structured REFUSED". It changes what the gate does with an input main refused, so it meets the brief's finding rule. It also breaks the PR's own stated aim, that only crashes and hangs become refusals, never the reverse.

[Observed] The same root cause, less severe: a directory followed by a symlink to `/dev/zero`. Main exits 1 with `IsADirectoryError` in 0.1–2.5 s. The subject reads `/dev/zero` until `MemoryError` and exits 1 with an unstructured traceback in 2.1–4.6 s. That is under my 3 GiB limit; with no limit, the run depends on host memory. Both sides exit 1, but the structured `REFUSED R1` the PR exists to produce is lost (`refused-dir-before-devzero`, 3 rows `DIFFERENT`, crash→crash with a different exception).

[Inferred] The repair is engineering work inside "main crash → structured REFUSED". Once an entry is refused, the result is already a refusal. So whether later entries are opened or only named changes the finding text, never the verdict. One possible repair: once an entry is refused, open no later entry that is not a regular file, named by `stat` as the FIFO rule already does. This needs no new owner answer. A repair that changed behaviour *before* the first refusal would be an owner question.

## Coordinator's residual: a FIFO after a refused entry is named and not opened

[Observed] Not an owner question. In every case, main crashes on the earlier entry with exit 1, and the subject emits a structured `REFUSED R1` with exit 1, naming both entries. Example stderr for `refused-dir-before-fifo-nowriter --check`: `` `…/A-J5DGR4-SIGNOFF-v1.0.md`: directory `` and `` `…/ZZ-J5DGR4-SIGNOFF-v1.0.md`: FIFO, not opened because an earlier entry is refused ``. This holds for a live-writer FIFO, a writerless FIFO, and a symlink to a writerless FIFO (9 rows, all `crash->REFUSED`). This is exactly the permitted class. Main never reached the FIFO, so no acceptance it gave is withdrawn.

## F6 — closed

Round 3's wording (`docs/reviews/R-GP-IMPL-RECONCILIATION-NONREGULAR-3-RAW.md:14`): "The unconditional FIFO branch at `scripts/check_spec_reconciliation.py:499` refuses every FIFO before reading it. … Main reads such an entry successfully; the head refuses it." It also says (`:26`): "main's `addition_records(root, \"finite-stream-control\")` returns the path, exact text and version `1.0`. The head raises `SignoffEntriesRefused`".

[Observed] The branch round 3 cited (at `cba689c2`: `if fifo: … raise SignoffEntriesRefused` before any read) is gone. At the subject, a FIFO is read by the same `read_text` as main (`:514-519`). The only FIFO-specific branch is the post-refusal guard (`:510`). My CLI differential, with an independent writer thread serving one finite stream per open:

| Case | `--check` | `--census` | `--regenerate` |
|---|---|---|---|
| FIFO, live writer | IDENTICAL, exit 0, `7 of 7 predicates without FAIL` | IDENTICAL, exit 0, same stdout digest | IDENTICAL, exit 0, no output |
| symlink to FIFO, live writer | IDENTICAL, exit 0 | IDENTICAL, exit 0 | IDENTICAL, exit 0 |
| FIFO, no writer | HANG on both | HANG on both | HANG on both |
| symlink to FIFO, no writer | HANG on both | HANG on both | HANG on both |
| live-writer FIFO before a refused directory | crash→REFUSED | crash→REFUSED | crash→REFUSED |
| writerless FIFO before a refused directory | HANG on both | HANG on both | HANG on both |

[Observed] The library counterexample from round 3: with a writer supplying `Package: finite-stream-control\nVersion: 1.0\n`, `addition_records(root, "finite-stream-control")` returns `[('.syzygy/governance/decisions/A-J5DGR4LIB-SIGNOFF-v1.0.md', 'Package: finite-stream-control\nVersion: 1.0\n', '1.0')]` on both main and the subject. F6 is closed in all three modes and on the import path. Writerless-FIFO treatment equals main's, a hang, so owner answer B's "any other change … returns to the owner" is not triggered by a FIFO before any refusal.

## Other kinds and earlier repairs

[Observed] Directory, unreadable regular file (mode 0) and invalid UTF-8: all 9 rows are `crash->REFUSED`. Main gives `IsADirectoryError`, `PermissionError` and `UnicodeDecodeError` tracebacks. The subject gives `REFUSED R1 … no predicate was evaluated`, naming the entry and its kind (`unreadable regular file (Permission denied)`, `regular file that is not UTF-8`), with exit 1. A directory followed by an unreadable regular file: 3 rows `crash->REFUSED`. After every row of the differential, `git status --porcelain` was empty on both trees, so no mode wrote.

[Observed] Differential denominator: 14 cases × 3 modes = 42 rows in `diff714-rows.jsonl`, plus 3 cases × 3 modes = 9 rows in `diff714-rows-extra.jsonl`, 51 in total. Computed by `Counter` over both files: 9 IDENTICAL non-hang (accept, or the same crash), 12 IDENTICAL hang, 24 crash→REFUSED and 6 DIFFERENT (the 3 `/dev/zero` and 3 `/dev/ptmx` rows after a refused directory, both F7). No row accepts on one side and refuses on the other.

[Observed] R1 kinds: the subject's `--selftest` kills all 8 `ENTRY_KIND_CASES` (directory, socket, dangling symlink, symlink loop, symlink to directory, symlink to block device, unreadable, not UTF-8). It holds 4 controls, including `signoff-entry-control-live-writer-fifo`, and kills `signoff-entry-fifo-after-refusal`. Summary line: `SELFTEST PASS: … 111 of 111 mutants killed by their expected predicate; 4 of 4 controls held (commit f0ccc4b3f164)`. Runtime: 5 min 13 s.

[Observed] F5 holds. I ran my own in-process comparison: main's and the subject's modules, loaded side by side over the same tree. I called `run`, `census` and `addition_records` against a directory, an unreadable file, invalid UTF-8 and a dangling symlink. All 12 calls raise the same class, message, `.filename` and `errno` on both sides: `IsADirectoryError`, `PermissionError`, `UnicodeDecodeError` and `FileNotFoundError`. No `SignoffEntriesRefused` reaches an in-process caller.

## Rule 6

[Observed] I ran the mutants in a separate scratch worktree at the subject commit. Each one drove `_entry_kind_cases` over the selftest's own scratch base. The subject was restored to SHA-256 `0716061d…469d` afterwards, and the tree was clean.

| Mutant | Fragment | Outcome |
|---|---|---|
| baseline | none | exit 0, `FAILURES 0` |
| author F6-M1-refuse-every-fifo | `if refused and _is_fifo(path):` → `if _is_fifo(path):` | killed: `BROKEN signoff-entry-control-live-writer-fifo` |
| own R4-B-cli-never-collects | `_COLLECT_REFUSALS = True` → `_COLLECT_REFUSALS = False` | killed, by an `IsADirectoryError` escaping the directory case's CLI polarity check, so the driver exited 1 rather than recording a finding |
| own R4-C-collect-reads-replace-errors | collected `read_text(encoding="utf-8")` → `…, errors="replace")` | killed: `SURVIVED signoff-entry-not-utf8 ['collected: not refused']` |
| own R4-A-is-fifo-lstat | `stat.S_ISFIFO(path.stat().st_mode)` → `…path.lstat()…` | **SURVIVED** |

[Observed] Note: R4-A survives because no fixture puts a *symlink to* a FIFO after a refused entry. The subject handles that case correctly (`refused-dir-before-symfifo-nowriter`, 3 rows crash→REFUSED), but nothing pins it. A fixture for F7 should cover the symlink form too.

## Retained raws and campaign

[Observed] The three retained raws are byte-identical to their blobs on `origin/agent/syzygy-gidd` (`4dd3fa92`). The blob ids match, and so do the SHA-256 values computed separately:
- `-RAW.md`: blob `83f3c06a`, sha256 `c35a7b1d…`
- `-2-RAW.md`: blob `b8d3cc9b`, sha256 `f4006869…`
- `-3-RAW.md`: blob `dc71cff6`, sha256 `3b533687…`

[Observed] `docs/review-campaigns/greenfield-parity-implementation.md`: numstat `2 0`, and main's bytes are an exact prefix of the subject's (90,221 of 91,215 bytes). The change is append-only. The appended verdict words, `REVISE` ×3, match line 2 of each raw.

## Checks run at the subject (review worktree)

[Observed]
- `--selftest`: PASS, as above.
- `--check`: `7 of 7 predicates without FAIL; PASS`, exit 0. R6 has 2 WARN findings, both pre-existing report-only pins naming `syzygy-2g0d`.
- `python3 scripts/check_governance.py`: `32 OK, 21 WARN, 0 FAIL (53 checks)`.
- `scripts/check_docs_review_campaign_partition.py --check`:
  - `second-method PASS: git ls-files=875; git ls-tree=875`
  - `partition PASS: denominator=875; assigned=875; raw=828; other=47; unmatched=0; overlaps=0; campaigns=153`

I did not run check:all.

## Evidence

All under `/home/orca/.tmp/syzygy-looper-20261116/r714-4-evidence/`:
- `diff714.py` (sha256 `63306374…`) and `diff714-v2.py` (adds the ptmx and unreadable-after-refusal cases; `967c3a9c…`): the harness.
- `diff714-rows.jsonl` (`dbe207ce…`) and `diff714-rows-extra.jsonl` (`fc0df3f5…`): one row per case and mode, with exit, class, stdout digest, stderr tail, seconds and post-run git status.
- `diff714.out`: the streamed summary.
- `f5.py`: the in-process exception comparison.
- `f6lib.py`: the library counterexample.
- `mut.py` and `mutations.out`: the rule-6 run.

All FIFOs, symlinks and directories I created were removed, and every tree's `git status --porcelain` was empty afterwards.
