# R-RECORD-BOUNDS-SPEC-1 — fresh-reader review of dossier record bounds 2.10
Subject SHA-256: 3e593bac3f9287dd7caf1e4a69fff2261b51d983af5ebcde1c13c03a18df819e
Verdict: REVISE
Reviewer: fresh-context agent, 2026-11-22

## Subject

[Observed] I worked in the worktree `/home/orca/orca/projects/syzygy/.worktrees/parallel-agents/syzygy-3efd.73`. HEAD is `1ca83b458834f5b4d45d6d13cfd567940a8d48f2`, and the package is staged but not committed. I computed each digest with `sha256sum`:

| File | SHA-256 |
|---|---|
| `openspec/changes/dossier-record-bounds/proposed/polaris-generation/spec.md` (bound subject; matches the expected digest) | `3e593bac3f9287dd7caf1e4a69fff2261b51d983af5ebcde1c13c03a18df819e` |
| `SEMANTIC-DELTA.md` | `d27b360ad45c611f072245848f6086c94de4f31e69b5730eeb1eab18c46841a4` |
| `design.md` | `5ece9a55723a1147a6f420d64b82cac774402cf71e896f9e863470047216c863` |
| `proposal.md` | `e80ecbf63eaad29cff4fb1fe29ed9e5323fa0fba9264148b9763521967119039` |
| `README.md` | `3b94a9ec71d0697042b1cba13f5fc599d83352f3f169fd6105bfe23ffcaa6a9b` |
| `tasks.md` | `de71809e6faeb08caf1f1ca8c7b4590b3fe48db30f4f8ecc8762b61c122e453e` |
| `GOVERNING-DEPENDENCIES.json` | `3f6c2b317bf01c0d940f7ee7b41ce73ddb2b0cfd5aa4efe2afbfb26c4ae3efef` |
| `docs/evidence/syzygy-3efd-73/measure_record.py` | `30e0c88b4f2365be33dcc4f7ac673e21718b2da7eaa958db150c30dc57263d63` |
| `docs/evidence/syzygy-3efd-73/measure_bounded.py` | `76319607b07d470e6c0ab645198da83ac314c0af5770821a1e47f3a72917e606` |
| `docs/evidence/syzygy-3efd-73/record-bounds-measurement-2026-11-22.json` | `ea4930ed3497741b5ee34a41305325a71518e3a120ef08d90d4a283dd06c26cf` |
| Predecessor, `openspec/changes/dossier-computed-maps/proposed/polaris-generation/spec.md` (2.9) | `63902cc6f737295f7aac4953b7c950ced6142d5648bdd63abc4996d31a8d0987` |

I also read these governing references:
- RFC2-24 (`rendering-vocabularies.md`, lines 103–150);
- in `packages/polaris-dossier/src`: `check.ts`, `check-model.ts`, `check-record-read.ts`, `inventory.ts` (lines 200–399), `run-dir.ts`, `polaris.ts` (lines 630–800), `derived-record.ts` (lines 100–210), `credential-probe.ts`, `reading-ledger.ts` (lines 295–340), `review-packet.ts` and `close.ts`;
- `packages/polaris-generation-core/src/parse-json.ts`;
- `apps/three-surface-poc/src/polaris-generation/dossier-site.ts` (lines 820–1045).

## Method

- **Semantic delta.** [Observed] A Python `difflib` line diff and character diff of the new spec against the 2.9 spec shows these changes and nothing else: the title (line 1) and preamble (line 3); the edited passages at lines 46 and 48; three inserted paragraphs (new lines 87–92); scenario lines 366, 610 and 611; six inserted scenarios (new lines 709–742); the Case, Observable, Oracle and Falsifier lines, each only appended to (745–747, 749); and `parent_requirements` (759), extended only by `, REQ-polaris-generation-035`. Scenario counts: 100 before, 106 after (`grep -c '^#### Scenario:'`).
- **Figures.** [Observed] I re-ran both measurement scripts with `python3 -I`. Every figure in the evidence record re-derives exactly. I then extended them in scratch scripts under `.../scratchpad/sp210/review/`: the record members the script leaves out, and the redaction case at its real scale.
- **Reader sweep.** [Observed] I ran `grep` for `INVENTORY_CHECKS|RUN_LAYOUT.checks|'checks'|"checks"` over `packages/`, `apps/` and `scripts/`, which matched 21 files (12 tests and 9 others). Separately I ran `grep` for `CHECK_RECORD_FORMAT|isCheckRecordOf|latestPassedDraft|readCheckRecord` outside tests and `dist`.
  - Draft check records are read only through `readCheckRecord`: `review-packet.ts:39`, `polaris.ts:660` and `679`, `reading-ledger.ts:315`. Review, render and close all reach it through `latestPassedDraft`.
  - Inventory check records are read only by `inventory.ts:365` (`readRecord`) and `polaris.ts:679` (`latestRecord` with `readUnbounded`).
  - `scripts/redis_screening_remeasure.mjs` only symlinks `checks/` entries.
- **Unbounded-read probe.** [Observed] In the scratch directory I ran a node probe of `fs.statSync` followed by `fs.readFileSync` on a symbolic link to `/dev/zero`.
- **Checker.** [Observed] I ran `python3 scripts/check_spec_reconciliation.py --check` (PASS, 7 of 7) and `--selftest` (328 of 328 mutants killed, 59 of 59 controls held). These ran on the unstaged script changes in the worktree, which are not part of the bound subject.

## Findings

### F1 — blocking: "size first" does not bound a reader when the entry is not a regular file

Text concerned (new line 90): "Every reader of a draft or inventory check record SHALL first take the file's size and SHALL refuse a file larger than 16,777,216 bytes from its size alone, before reading any byte of it. The run directory lies within the agent sessions' write reach, so no reader trusts a record's size, values or depth." The Falsifier clause concerned: "a reader … reads any byte of a file larger than 16,777,216 bytes".

Evidence:
- [Observed] `readCheckRecord` (`check-record-read.ts`, lines 14–16) calls `fs.statSync(file).size` and then `fs.readFileSync(file)`. The design (`design.md`, "What the code must change") tells `inventoryOfRecord` and the supervisor to use the same reader.
- [Observed] A symbolic link to `/dev/zero` at the record's path passes that size check, because the device's stat size is 0. `readFileSync` then reads until memory runs out. The probe process aborted with `std::bad_alloc`, exit 134. That is not a catchable exception, so the supervisor's `try { … } catch { return null; }` cannot turn it into "no record".
- [Inferred] A FIFO at the path also passes with size 0, and `readFileSync` blocks forever: the supervisor hangs instead of "neither proceeding nor stopping".
- [Inferred] A file that grows or is swapped between `stat` and `read` is also read whole.

All of these lie within the agent sessions' write reach, which is exactly the threat syzygy-3efd.74 names. The spec's rule, implemented literally as the design directs, leaves that threat open for both record kinds. The scenario and Falsifier cannot catch it either, since they speak only of "a file larger than" the bound.

Suggested repair:
- State the rule as: open the path once; refuse anything that is not a regular file (by `fstat` on the opened descriptor; say whether a symbolic link is refused or followed); and read at most 16,777,217 bytes from that descriptor, a longer read counting as past the bound.
- Add a scenario and a Falsifier clause covering a device or a FIFO at the record's path and a file grown after its size was taken. Each counts as a record that cannot be read and never stalls or crashes the reader.
- [Inferred] As an aside, `readDerivedRecord` (`derived-record.ts`, line 104) has the same hole for `derived/rev-<n>.json`. Whatever words (b) settles on, the render should classify such an entry as `unusable` without reading it unbounded.

### F2 — blocking: the bounded form's stated size rests on a false premise about `credential`

Text concerned (new line 88): "with … each of the screening policy's identifier and version and the credential probe's reason charged as 4,096 six-byte escapes (Syzygy writes each of them, never a session, and each is far shorter), the bounded form of a draft check record takes 76,067 bytes … and of an inventory check record 80,383 bytes … so a bounded form lies within the bound." `design.md` and `measure_bounded.py` repeat the claim.

Evidence:
- [Observed] When the probe fails, `credential.finding.why` is `result.why` (`credential-probe.ts`, line 192). One form of it is `adapter credentials readable by the operator's user: ${readable.join(', ')}` (line 158).
- [Observed] `readable` lists paths from the credential list file. That file's own description says it is "the credential list file ${file}, which the agent sessions can write" (line 63), and it is read up to `LIST_MAX_BYTES = 65_536` bytes with up to 1,024 values (lines 25 and 77).
- [Observed] Another form of `why`, `${list.why} (source: ${source.describe})`, carries the operator's environment path twice. The passed form's `credential.source` carries it too, and `measure_bounded.py` does not model that form.
- [Inferred] So a session can make `why` roughly 64 KiB, well past the 4,096 code units charged. The parenthetical "never a session" is untrue, and 76,067 and 80,383 bytes are not maxima.
- [Inferred] The conclusion "a bounded form lies within the bound" still holds: the member stays within a few hundred KiB, far below 16 MiB. But the spec states a false figure and a false reason as its proof.

Suggested repair: bound `credential` from its real caps. That means the credential list's 65,536 bytes for `why`, and the environment path, or a stated cap on it, for `source` and the `list.why` forms. Then re-measure, or state the bounded form's size as "less than <N> bytes" with that derivation and drop "never a session". Alternatively, cap the reason's length where Syzygy writes it.

### F3 — non-blocking: 2.9 sentences on the report and the run file are not covered by the exception, and the byte list is incomplete

Text concerned (new line 88): "Wherever this requirement says a draft check record carries `figureFit`, `readingLedger` or `manifestFacts`, or that the check record holds every advice entry, a bounded form is the exception." Also the byte list (line 92): "A draft or inventory check record whose full form would be past the read bound is written in its bounded form, and that check's report changes as above."

Evidence:
- [Observed] The 2.9 sentence at line 110, "Check's report … SHALL carry `mechanismAdvice`", is about the report, not the record. The exception does not reach it, although the new paragraph says the report "carries no `figureFit` or `mechanismAdvice`". The specific sentence plausibly wins over the general one, but the text as written contradicts itself.
- [Inferred] Line 110 still has each draft check write `run-advice.json`. Under 2.9, a record past the bound was counted in `checkRecords.unreadable`. Its bounded form is now counted in `read` and contributes nothing. So `run-advice.json` bytes change, and the byte list does not name them.
- [Inferred] The step log entry (`check.ts`, `log({ outcome, revision, findings: findings.length })`) is unspecified: it could count the full findings or the one bound finding.
- [Observed] The close's Execution Record carries "the digest of each file in the run directory" (`close.ts`). Its bytes change wherever a listed file changes, and the byte list does not say so.

Suggested repair: extend the exception sentence to the report's `figureFit` and `mechanismAdvice`. Add to the byte list: `run-advice.json` (read and unreadable counts), the step log's findings count (say which), and the close record's digests of changed run files.

### F4 — non-blocking: the 371-quotation figure is measured on a record that lacks members check writes

Text concerned (new line 90): "an inventory check record of 371 one-word quotations already passes (108,959 bytes and 4,099 values, measured as above)".

Evidence:
- [Observed] `measure_record.py` `record()` leaves out these members of the inventory record: `inventory`, `session`, `screeningPolicy`, `credential`, `limits`, `counts` and `completeness`.
- [Observed] With those members added in their shortest forms (scratch `inv.py`), 371 quotations give 109,797 bytes and 4,130 values. The first count past 4,096 values is 368 quotations (4,097 values).
- [Inferred] "371 passes the earlier bound" is still true, since the real record is larger, but the parenthetical figures are not that record's.
- [Inferred] The design table labels these figures [Observed], while the evidence record labels them "Inferred: each figure is built by hand".

Suggested repair: re-measure with every member, or write "at least 4,099 values on a record holding only …". The scenario's "371 quotations, more than 4,096 values" can stay.

### F5 — non-blocking: "60 bytes per withheld line range" is a floor, not a rate

Text concerned (new line 88): "adds 60 bytes per withheld line range".

Evidence:
- [Observed] The 60 is the difference between 2,000 and 1,000 ranges, where line numbers have four digits. At the stated 279,609 ranges, line numbers reach six digits, and the record is 17,784,588 bytes (scratch `red.py`). The fewest ranges past the bound is 263,869, giving 16,777,228 bytes.
- [Inferred] The claim "takes a record past the bound alone" holds, but the rate is wrong.

Suggested repair: "at least 60 bytes per withheld line range".

### F6 — non-blocking: the words for an entry that is not a file, and lstat errors other than ENOENT

Text concerned (line 48): "`missing-evidence`, `no derived record was kept when this draft revision was checked`, where the file system holds no entry, of any kind, at the draft revision's `derived/rev-<n>.json`; `missing-evidence`, `a derived record file is present for this draft revision but this render cannot use it; …`". The new scenario adds: "where a directory stands at that path the same words and state appear".

Evidence:
- [Observed] For a directory at the path the scenario requires the words "a derived record file is present", which is not literally true (VIS-2 asks for exact words).
- [Inferred] Whether "the file system holds no entry" is decidable is unspecified for an `lstat` that fails with an error other than ENOENT, such as EACCES or ENOTDIR on `derived/`. In those cases neither sentence is known to be true.
- [Observed] Apart from this, the decision order in the spec matches `derivedStructureAt` (`derived-record.ts`, lines 175–192): no file, then not in form a record, then `unknown` state or a tree that cannot be listed, then a foreign rule, version or path.

Suggested repair: word it "an entry is present at this draft revision's derived-record path, but this render cannot use it; …", or keep "file" and give a directory its own wording. State that only ENOENT counts as no entry, and that every other `lstat` outcome takes the `unusable` words.

### F7 — non-blocking: the value and depth arms may not be reachable by any real subject, so some scenarios and Case lines may not be testable as written

Text concerned: the scenario "Check record past the bound for a draft with findings", whose WHEN reads "a draft with findings would give a check record of more than 2,000,000 values". Also the Case line: "drafts and inventories whose full records fall just within and just past each of the three bounds".

Evidence:
- [Observed] The measured records reach at most 838,851 values (the redaction case) and 482,038 values (the passed-draft case). Their depth is at most 6.
- [Inferred] Record depth is fixed by Syzygy's own structure, so no subject reaches 17 levels. The package does not show that a draft within 500,000 values can produce more than 2,000,000 record values through findings.
- [Unknown] Whether either arm is reachable.

Suggested repair: show a reachable construction for the values arm, or state that the value and depth arms are tested through an injected measure or encoder seam. Reword the scenario's WHEN to a case that is reachable, for example the byte arm with findings.

### F8 — non-blocking: claim labels in the package prose

Evidence: [Observed] Several substantive passages carry no [Observed]/[Inferred]/[Unknown] label:
- `proposal.md` "What changes" and "Non-goals";
- `SEMANTIC-DELTA.md` "Added", "Amended" and "What a reader of the previous text would now do differently";
- `design.md` "The rule chosen" options list and "What the code must change".

Suggested repair: label them. For example, the code-change list is [Inferred] and the 2.9 quotations are [Observed].

## What holds

- **Delta and carry-over.** [Observed] The subject digest matches the expected one. Every line of 2.9 other than those `SEMANTIC-DELTA.md` lists is carried byte for byte. The amended lines change only as stated: the Form lines and warrants are pure appends, and the two passages and three scenario lines are the edits quoted. The scenario count goes from 100 to 106, as stated.
- **Measurements.** [Observed] Both scripts reproduce every figure in the evidence record exactly: 19,945,121; 16,474,121; 16,994,134; 60.0; 279,609; 3,839; 371, 108,959 and 4,099; 76,067, 48 and 3; 80,383, 51 and 3. Each script's digest matches the one the record lists.
- **Bounded-form members.** [Observed] The kept and dropped lists are complete against `DRAFT_PLAN.record` (`check.ts`, lines 106–128), `INVENTORY_PLAN.record` (`inventory.ts`, lines 297–318) and the `stored` spread (`check.ts`). Apart from `credential` (F2), every kept member is fixed text, a regex-bounded identifier (`RUN_ID`, and the session identifier at most 200 characters) or a number. The format identifier is kept, so `isCheckRecordOf` and the `inventoryOfRecord` format test still recognise it.
- **Reader coverage.** [Observed] Under the sweep above, the readers the spec names are the only production readers of both record kinds. Inventory records are read by `inventoryOfRecord`, which the fidelity packet and the supervisor also use, and by `latestChecks` with `readUnbounded`. Draft records are read through `readCheckRecord` everywhere. [Inferred] `readingDifference` skips a bounded record as it skips a record without a ledger, and the supervisor's `refusedAtLimit` stops on a bounded record at the limit, as "counts against the repair-cycle limit" requires.
- **Ownership.** [Observed] The design's statement holds: REQ-034 already names the inventory check record ("an inventory check record carries none"), and `inventory-check` runs `checkSubject`. [Inferred] Amending REQ-034 and adding REQ-035 as a parent is reasoned, and a code-only fix would not have been enough, because the bound changes which inventories count.
- **Reason code.** [Inferred] Keeping `missing-evidence` and splitting only the words and `state` is consistent with RFC2-24's closed list (#2, "Declaration exists; no current evidence artifact"). No new reason is minted.
- **Bytes outside operator mode.** [Observed] The region and the maps are operator-agent only. The provider-mode bytes and `dossier.json` (page paths only) are unchanged by (b).
- **Checker.** [Observed] `check_spec_reconciliation.py --check` passes. Its `--selftest` passes 328 of 328, on unstaged changes outside the subject.
- **Owner classes.** [Observed] The package decides none: there is no `.syzygy/governance/doctrine/` edit, no detector or SEC-5 change, no foreign repository, and no exposure or release.
