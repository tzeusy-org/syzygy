# Design: run-tree read bounds for REQ-033, REQ-035 and REQ-048

Version 2.18, for bead syzygy-3efd.80. It extends the reader rule of REQ-polaris-generation-034 version 2.10 (one non-blocking open of the path, regular files only, a bound checked from the descriptor's size and at most one byte read past it) to every remaining unbounded read of a run-tree file, in the requirement that states the file. Code is cited at `origin/main` `c900e87119e872db9eb2db5d06ca60512ffc3a0b` (PR #908, which holds the 2.14 code for REQ-034's four files and `readBoundedFile` in `packages/polaris-dossier/src/check-record-read.ts`).

## The version label

[Observed] On `origin/main` at `c900e871`, `scripts/check_spec_reconciliation.py` holds tag constants up to `polaris-dossier-raw-read-disclosure-v2.17` (`RAW_READ_TAG`, row A-51), and `PROJECT-STATUS.md` routes 2.17 as agent-adopted in A-51. So this is 2.18. Tag `polaris-dossier-run-tree-read-bounds-v2.18`.

[Observed] Open PR #902 (`dossier-verify-text`, bead syzygy-5dhm.23) also modifies REQ-polaris-generation-033 and still names itself 2.17, a label A-51 has taken. [Inferred] Whichever of the two lands second has to renumber and rebuild its REQ-033 text over the other's; the builder of this package inserts only at anchors it asserts occur once, so it can be re-run over a new predecessor. The version is checked against `origin/main` again immediately before the adoption commit.

## Which requirement owns each file

[Observed] The effective composition (`scripts/count_polaris_effective_scenarios.py`'s `build_composition` at `c900e871`) takes REQ-033 from `dossier-raw-read-disclosure` (2.17), REQ-035 and REQ-048 from `dossier-url-declared-source-run` (2.1), and REQ-034 from `dossier-page-subsections` (2.16). Candidate REQ-polaris-generation-040 to 045 (`polaris-dossier-one-command-run/`) are in no adopted text: none of them is in the effective composition. The supervisor in `packages/polaris-dossier/src/polaris.ts` still cites "candidate REQ-polaris-generation-040 to 044" in its header, but the command it implements, `syzygy polaris <url>`, is stated by the adopted REQ-polaris-generation-048 ("Declared URL dossier supervisor", whose first sentence is "`syzygy polaris <url>` SHALL carry one URL-supervised run ..."). So the supervisor's own state file is specified in REQ-048, and its reads of other requirements' files are specified where those files are, as version 2.10 drew the line ("every reader of a draft or inventory check record", the supervisor among them).

[Observed] Each file was assigned by the clause that states it, found by a search of the effective requirement texts:

- REQ-033 ("Operator-agent authoring mode") states the run record ("Syzygy SHALL hold the run record and every record on which a check result, a limit or readiness rests in its own state directory for the run"), the instants of earlier steps and the owner's execution choice (its Inferred-label sentence), the credential list and the breach finding that "remain[s] in local records" (its execution-rule paragraph), and the close record and Execution Record. So `run.json`, `steps.jsonl`, `credential-breaches.jsonl`, the credential list, `execution-choice.json` and `record.json`.
- REQ-035 ("Fresh-context review in the operator-agent mode") states the verdict and its validation, the frozen inventory and its counting, the prompt, launch-form and delivery records, the waiting sessions' inventory brief and delivered rounds, and the rendered-design packet. So every review, inventory, session and page file below.
- REQ-048 states the supervisor, whose state file no other requirement names.

## The sweep and its denominator

[Observed] Predicate (Python `re`, per line): `\breadFileSync\(|\breadFile\(|\breadRecord\(|\breadFileAsSized\(|\breadBoundedFile\(`, one site per match, over `git ls-files packages/polaris-dossier/src/*.ts apps/three-surface-poc/src/polaris-generation/*.ts` less `*.test.ts` and `*.testkit.ts` (119 files), excluding import lines and the definitions of `readRecord`, `readBoundedFile` and `readFileAsSized`. It finds 89 sites; a second method (`grep -o -E` over the concatenated files with the same exclusions) also counts 89. Every site is classified in `docs/evidence/syzygy-3efd-80/run-tree-read-sweep-2026-11-23.json` (subject commit, predicate and the sweep script's digest recorded there):

| Class | Sites | What |
|---|---|---|
| in scope, specified here | 40 | below |
| already bounded | 14 | versions 2.10 and 2.14 of REQ-034: `readBoundedFile` or `readFileAsSized` |
| not the run tree | 34 | operator-named inputs, the clone's object store and refs, the Syzygy checkout and its governance tree, instruments, and a local function named `readRecord` over parsed values |
| residual | 1 | `launch-disclosure.ts` 89, `launch.json`: exported readers with no product caller (only tests call `readLaunchDisclosure` and `recordIssuedBrief`); the file is a retired launch-consent record, and REQ-046 since version 2.0 reads no launch record. Not specified; a later bead may delete the readers |

[Observed] The sweep reaches no read through `createReadStream`, `fs.promises` other than `readFile`, or a hand-written `openSync`/`readSync` loop that is not already bounded (the four such loops, in `launched.ts`, `policy-snapshot.ts`, `clone-shape.ts` and `launch-clone.ts`, open without blocking or bound their reads already, and `credential-probe.ts` 44 opens without reading).

## The in-scope reads, their bounds and their words

[Observed] Line numbers at `c900e871`. "Readers' bound" means the bound under which every reader already parses the file, not one derived from its writer; a larger file is already one no reader can use, so the bound changes no outcome for a regular file and only adds the kind check and the read limit.

| Reads | File | Requirement | Bound and derivation | Outcome where it is not a regular file or is past the bound |
|---|---|---|---|---|
| `reverify.ts` 90, `status.ts` 103, `session-statement.ts` 27, `check.ts` 157 and `run-dir.ts` 68 (step-log appends), `render.ts` 148, `reading-ledger.ts` 308, `polaris.ts` 720 | `run.json` | 033 | 65,536: readers' bound, `RECORD_JSON_LIMITS` in `run-record.ts` 104 (`readRunRecord`); the supervisor alone parsed it with no bound | reverify and status: `<run> holds no readable run.json (not a regular file)` / `(larger than 65536 bytes)` in place of the errno; the provider recheck: `the run record cannot be read to check <noun> declared provider`; reading ledger: `unreadableRuns`; the appends: no entry; render: falls through to the reverification's refusal; supervisor: no repair-cycle limit |
| `close.ts` 212 | `steps.jsonl` | 033 | 16,777,216: readers' bound; the log grows a line per step with no cap, and close carries at most 10,000 lines (`STEP_LINES_MAX`) | close carries no instants, as for a log it cannot read today |
| `close.ts` 227 | `credential-breaches.jsonl` | 033 | 16,777,216, as the step log | close carries no entries, as today |
| `credential-probe.ts` 72 | the credential list | 033 | 65,536: `LIST_MAX_BYTES`, which the probe applies today from a `stat` | the existing words `<file> is not a regular file` / `<file> is larger than 65536 bytes`, now also for growth after the `stat` |
| `execution-choice.ts` 157 | `execution-choice.json` | 033 | 8,192: readers' bound (its `parseBoundedJson` limit, line 164) | `execution-choice.json cannot be read (not a regular file)` / `(larger than 8192 bytes)`; absent stays absent |
| `status.ts` 73 | `record.json` | 033 | 16,777,216: readers' bound (the limit on the same line) | `not recorded; the Execution Record cannot be read`, as today |
| `review.ts` 133–139 (a `stat`, then a whole read) | the verdict review check is given | 035 | 4,194,304: `VERDICT_MAX_BYTES` (`review-model.ts` 34), applied today from the `stat` | the existing words, now also for growth after the `stat` |
| `review.ts` 249, `polaris.ts` 601 (`readVerdict`) and 729 (`blockingWhy`) | `reviews/<kind>-verdict-<n>.json` | 035 | 4,194,304: review check freezes exactly the bytes it read (`review.ts` 194) | review: `the frozen verdict reviews/<kind>-verdict-<n>.json cannot be read (not a regular file)` / `(larger than 4194304 bytes)`; supervisor: no rows, and `its verdict is unreadable` |
| `inventory.ts` 381, `review-packet.ts` 75, `inventory-coverage.ts` 154 | `inventory/rev-<n>.json` | 035 | 4,194,304: check freezes exactly the bytes `readSubject` read under that bound (`check.ts` 273, since 2.14) | `the frozen inventory inventory/rev-<n>.json cannot be read (not a regular file)` / `(larger than 4194304 bytes)`; the coverage advice is Unknown (its catch names the error's class) |
| `run-dir.ts` 90 (`readRecord`), through `review.ts` 244, 259, 262, `inventory.ts` 384, 387, `session-handover.ts` 542, `waiting-sessions.ts` 242, 257, 382, 540, 651 | review check, prompt, launch-form and delivery records | 035 | 262,144: readers' bound, `RECORD_JSON_LIMITS` in `run-dir.ts` 42 | as a record that does not parse (`readRecord` returns undefined), every word unchanged |
| `polaris.ts` 685 (`readReviewCheckUnbounded`, used at 754–755) | `reviews/checks/<kind>-verdict-<n>.json` | 035 | 262,144, as `readRecord` | `latestRecord` returns null: no checked verdict of that kind |
| `inventory.ts` 217, `waiting-sessions.ts` 604 | `inventory-brief.md` in the inventory session's directory | 035 | its own size (`readFileAsSized`): Syzygy records its digest (`session-handover.ts` 215), not its size | `the inventory brief cannot be read (not a regular file)`; the inventory-brief command's stored copy `absent` |
| `waiting-sessions.ts` 647 | a round's `delivery.json` | 035 | 65,536: readers' bound, `DELIVERY_JSON_LIMITS` (line 69) | `round <r> cannot be read (not a regular file); stop, and tell the operator` / `(larger than 65536 bytes)` |
| `waiting-sessions.ts` 648 | a round's `packet.json` | 035 | the `packetBytes` of the delivery record Syzygy wrote for the round (`waiting-sessions.ts` 329–332, the byte length of the exact bytes it writes), or its own size where that record cannot be read or states none (records before `packetBytes` existed, which `deliveries` already admits); the record is read first | `round <r> cannot be read (larger than <packetBytes> bytes); ...`; where the record cannot be read, the existing mismatch refusal |
| `waiting-sessions.ts` 649 | a round's `packet.sha256` | 035 | 78: the one line Syzygy writes, `<64 hex>  packet.json\n` | as `delivery.json`, with 78 |
| `design-review.ts` 62 | each page file under `site/<n>/` | 035 | what remains of `SITE_MAX_BYTES` (67,108,864, line 31) after the files read before it | the existing words `<path> in site <n> is not a regular file` and `site <n> is larger than 67108864 bytes` |
| `polaris.ts` 236 (`readState`) | `<state root>/<run id>.supervisor.json` | 048 | 16,777,216: readers' bound; the supervisor rewrites it whole per event and its lists (`sessions`, `launches`, `fidelityDeliveredFor`, `notified`, ...) have no cap | `no launched run <run id> under <state root>` (resume, attach, stop); a supervisor started for the run takes no earlier state |

[Inferred] The words chosen: wherever a reader's existing outcome names an error code, the bounded reader's two refusals would otherwise print `unknown-error` (`NotARegularFileError` carries no `code`) or `byte-limit` (`BoundedJsonError`'s code); the text names `not a regular file` and `larger than <bound> bytes` instead, so a reader sees why, as version 2.14 chose for the frozen draft revisions. Every other outcome is the reader's existing outcome for a file it cannot read, so no word changes there.

[Inferred] Polarity. Three readers take an unreadable file as an absence that is not fail-closed on its own: the supervisor takes a run record it cannot read as no repair-cycle limit, close takes a breach log it cannot read as no breaches, and status takes a close record it cannot read as usage not recorded. Each is the reader's existing rule for a file that does not parse or is absent, so the bound opens no new path: the agent sessions can already delete or rewrite each file. The supervisor's case is closed by the reverification, which refuses every step on a run whose run record cannot be read, so no step runs past the limit; the breach log is Inferred in close's record and the probe re-runs at every step, so a hidden breach line hides no readable credential; and a usage figure is never shown as zero (VIS-2).

[Inferred] A validated review check record (outcome `validated`, `problems` empty) holds only fixed words, digests, safe integers, the verdict's file name and a session identifier of at most 200 characters (`declaredSessionId`), so it lies far within 262,144 bytes; a refused record may be larger, and the supervisor reading it as no checked verdict changes nothing, since it treats a refused record as `none` today (`verdictFor`, `polaris.ts` 757–760).

## Bytes this version changes

[Inferred] None for a regular file within its bound: every reader reads exactly the bytes it read before, and no step writes or renders a different byte. Only the outcomes and words in the table above change, for a path holding something that is not a regular file, a file past its bound, or a file that grows past it while read. The provider golden (`apps/three-surface-poc/src/polaris-generation/dossier-render-provider-golden.test.ts`) is unaffected.

## What the code must change

[Inferred] For the code phase of syzygy-3efd.80:

- A run-file reader in `packages/polaris-dossier/` that reads `run.json` with `readBoundedFile(..., 65_536)` and maps `NotARegularFileError` and `BoundedJsonError('byte-limit')` to the stated words; route the eight `run.json` reads through it (the supervisor parsing through `readRunRecord` or keeping its own parse of the bounded text).
- `close.ts` `stepInstants` and `breachLog`: `readBoundedFile(..., 16_777_216)`. Close's digest of every stored file (`storedFiles`, `storedFileBound`) is left as version 2.14 states it: this version does not change which stored files close lists or digests.
- `credential-probe.ts` `credentialListFromFile`, `execution-choice.ts` `readExecutionChoice`, `status.ts` `closedUsage`: their bounds.
- `review.ts`: the verdict submission and the frozen verdict; `polaris.ts`: `readState`, `readVerdict`, `blockingWhy`, `readReviewCheckUnbounded` (renamed), `readMaxRepairCycles`; and its header's candidate citation corrected to REQ-048.
- `inventory.ts` 381, `review-packet.ts` 75, `inventory-coverage.ts` 154: the frozen inventory.
- `run-dir.ts` `readRecord`: `readBoundedFile(file, 262_144)`.
- `waiting-sessions.ts`: the inventory brief (`readFileAsSized`), the round's delivery record read before its packet, `delivery.json`, `packet.json` and `packet.sha256` under their bounds; `inventory.ts` 217 the stored brief copy.
- `design-review.ts` `readSite`: each page under the remaining site bound.
- Tests per reader: a FIFO, a symbolic link to `/dev/zero`, a directory, a file at and one byte past the bound, and a file grown after `fstat` (through the 2.10 test seam), asserting the words and that no more than bound + 1 bytes are read; a rule-6 mutation run with each mutant's `old`/`new` fragment and the commit, under `docs/evidence/syzygy-3efd-80/`.

## Residuals

- [Observed] `launch-disclosure.ts` 89 (`launch.json`) has no product caller and is not specified (the table above).
- [Inferred] A file read under its own size (the inventory brief, and a packet whose delivery record states no size) is bounded only by what the file holds when opened: a regular file the agent made very large is still read whole. No writer cap exists to derive a stated bound from; the digest Syzygy recorded refuses such a file after the read.
- [Inferred] The 16,777,216-byte bounds of the two logs, the close record and the supervisor's state are readers' bounds, not writer guarantees: a long run could in principle write more. No run has been measured near them.
- [Observed] `scripts/count_polaris_effective_scenarios.py --selftest` fails on `origin/main` at `c900e871` with `raw-read disclosure: URL source v2.1 and source policy v3 must be effective` before this package (run on an export of that commit); this package does not change that.
