# Review: run-tree read bounds 2.18 implementation (syzygy-3efd.80)

- Subject: `origin/agent/syzygy-3efd.80-code` at `c74488a4772eb5aac12a1858752e41b44943cbd1`, diff `git diff origin/main...c74488a4` (35 files, +1964/-75)
- Governing text: `openspec/changes/dossier-run-tree-read-bounds/proposed/polaris-generation/spec.md` (version 2.18; REQ-033 line 23 and scenarios 122-141; REQ-035 line 170 and scenarios 436-456; REQ-048 line 513 and scenario 672-679), `SEMANTIC-DELTA.md`
- Reviewer: fresh-context independent reviewer, detached worktree `.worktrees/review/r80impl` at the subject, `npm ci` clean

Verdict: NOT READY

One blocking finding: a new branch of the design packet's page-file reader (the "past what remains of the site's bound" refusal) has no test, and a mutant deleting it survives. Everything else is a note. The production code otherwise implements 2.18 as written: every bound, every refusal's words, the Unknown close members, and the read order of the waiting command match the clauses quoted below.

## What was checked

### Criterion 1: requirements and scenarios

[Observed] Bounds in `packages/polaris-dossier/src/run-tree-read.ts:8-30` against the spec. run.json 65,536; steps.jsonl and credential-breaches.jsonl 16,777,216; credential list 65,536 (`credential-probe.ts:27` `LIST_MAX_BYTES`); execution-choice.json 8,192; record.json 16,777,216; verdict and frozen verdict 4,194,304 (`VERDICT_MAX_BYTES` for review check, `RUN_TREE_BOUNDS.verdict` elsewhere); frozen inventory 4,194,304; records 262,144; round delivery.json 65,536; packet.sha256 78; supervisor state 16,777,216. All equal the spec's literals.

[Observed] Words, per reader:
- reverify `reverify.ts:93` and status `status.ts:106`: `<run> holds no readable run.json (<cause>)` through `readCause`. Matches "`<run> holds no readable run.json (not a regular file)` or `... (larger than 65536 bytes)`".
- execution choice `execution-choice.ts:160-162`: `execution-choice.json cannot be read (<cause>)`. Matches.
- credential probe `credential-probe.ts:73-76`: `<file> is not a regular file` / `<file> is larger than 65536 bytes`, now also for growth. Matches "now also for a list grown after its size was taken".
- close `close.ts:211-246`: the steps member is `{label:'Unknown', basis, entries:[], unreadable:0, why:'steps.jsonl cannot be read (<cause>)'}`. Breaches are `[{unreadable:true, why:'credential-breaches.jsonl cannot be read (<cause>)', label:'Unknown'}]`. An absent entry (`isMissingEntry`, lstat) stays empty. Matches the REQ-033 clause. The extra `basis` member was already present and is not forbidden.
- status close-record usage `status.ts:71-77`: `not recorded; the Execution Record cannot be read`. Matches.
- ledger `reading-ledger.ts:305`: `unreadableRuns`. Matches.
- logStep / check log: no append. Matches.
- supervisor `readMaxRepairCycles` `polaris.ts:739-744`: Infinity (no limit). Matches.
- review check `review.ts:139-146`: `<file> is not a regular file`, `<file> is larger than the 4194304-byte verdict bound`, freezes nothing. Matches.
- frozen verdict `review.ts:255`: `the frozen verdict reviews/<kind>-verdict-<n>.json cannot be read (<cause>)`. Matches.
- supervisor `blockingWhy` `polaris.ts:750`: `its verdict is unreadable`. Matches.
- frozen inventory `inventory.ts:383`, `review-packet.ts:76`, `inventory-coverage.ts:156` (Unknown advice). Matches.
- `readRecord` `run-dir.ts:91-96` under 262,144. The supervisor's `readReviewCheck` `polaris.ts:706` now goes through `readRecord`, and `latestRecord` takes undefined as no verdict. Matches "takes one it cannot read as no checked verdict of its kind".
- inventory brief: render reports `absent` (`inventory.ts:218-219`). `await` gives `the inventory brief cannot be read (not a regular file)` (`waiting-sessions.ts:607`). Matches.
- waiting command `waiting-sessions.ts:648-671`: reads the delivery record first and refuses with the existing mismatch words, reading no round file. It then reads delivery.json under 65,536, packet.json under `packetBytes` (own size where absent) and packet.sha256 under 78. Words: `round <r> cannot be read (<cause>); stop, and tell the operator`. Matches the REQ-035 clause.
- design packet `design-review.ts:62-71`: reads under `SITE_MAX_BYTES - total`, with the existing words. Matches the clause, but one branch is untested (finding 1).
- supervisor state `polaris.ts:241-255, 308-311`: `loadState` gives absent / unreadable / state. `--resume`, `--attach` and `--stop` refuse with `no launched run <id> under <root>`. A named `--supervise` refuses before any write. Resume reuses the state it read (`polaris.ts:158-181`). Matches "Each command reads the state once" and "writes nothing there".

### Criterion 2: sweep for unbounded run-tree reads

[Observed] Predicate: `readFileSync(`, `readFile(` and `createReadStream(`, as fixed strings, over non-test, non-testkit `.ts` under `packages/polaris-dossier/src` at the subject. It finds 20 lines (19 call sites plus one comment in `run-tree-read.ts:53`). A second method, `openSync(|readSync(|.open(|readlinkSync`, finds 16 lines, all pre-existing bounded readers or unrelated.

The 19 call sites:
- `git-object-reader.ts` (2): clone object store.
- `launch-write-consent.ts` (3), `launch-store.ts` (1), `waiting-sessions.ts:82,83,109,110,116` (5): governance tree.
- `doctrine-quote.ts`, `launch-cli.ts`, `rerender-measure.ts`: Syzygy checkout.
- `cli.ts:520`: operator config.
- `launch-copy.ts:169`, `clone-head.ts:31`: clone .git.
- `launch-disclosure.ts:89`: residual with no product caller, as the sweep record states.
- `verify-text-run.ts:101`: operator-named `--text` file, stat-then-read (see note 7).

None is a file 2.18 bounds.

[Observed] `apps/three-surface-poc/src/polaris-generation`: 15 sites, each matching a `not-run-tree` row of `docs/evidence/syzygy-3efd-80/run-tree-read-sweep-2026-11-23.json`. All 40 `in-scope` rows of that record now route through `readBoundedFile`, `readBoundedText`, `readFileAsSized` or `readRecord` at the subject.

### Criterion 3: special files and TOCTOU

[Observed] Every reader goes through `readRegularFile` in `check-record-read.ts:45-71`:
- one `openSync` with `O_RDONLY|O_NONBLOCK|O_NOCTTY` (follows symlinks, as the spec states);
- then `fstatSync` on that descriptor, refusing `!isFile()` and any size past the bound;
- then a read loop capped at bound+1, refusing more than the bound.

The size check and the read use the same descriptor, so a swap between them is impossible. Growth after the fstat is caught by the bound+1 cap. `PastBoundError` subclasses `BoundedJsonError('byte-limit')`, so existing `byte-limit` tests still hold.

[Inferred] `isMissingEntry` runs `lstat` after an ENOENT open. A race there can only move a dangling-link case between "absent" and "Unknown", and only for an entry that is itself being created or removed. This is acceptable.

### Criterion 5

[Observed] `git diff --quiet origin/main...c74488a4 -- apps/three-surface-poc/src/polaris-generation/dossier-render-provider-golden.test.ts` exits 0 (unchanged). The diff touches no screening, detector, secret or consent file (path sweep: 0 hits). The diff adds no `<script` and no consent prompt.

### Criterion 6: `npm run check`

[Observed] In the worktree at c74488a4, exit 0: `Test Files 213 passed (213)`, `Tests 5459 passed | 1 skipped (5460)`. Typecheck clean.

The new `run-tree-readers.test.ts` is in the integration tier (`vitest.tiers.ts`), so I ran the integration files separately. `npx vitest run --project integration` over run-tree-readers, waiting-sessions, review and inventory tests: `Test Files 4 passed`, `Tests 378 passed (378)`.

### Criterion 4: mutation sample

[Observed] Each mutant was applied with an exactly-once fragment assertion, and the source was restored with `git checkout` afterwards. The worktree was clean after each run.

| Mutant | Source | Result |
|---|---|---|
| `await-record-not-first`: delete `if (record === undefined) return mismatch();` (`waiting-sessions.ts`) | recorded | killed: "refuses a round holding a FIFO at packet.json and no readable delivery record ..." fails (1 failed / 145) |
| `supervise-unreadable-started-afresh`: delete `if (loaded === 'unreadable') return refuse(...)` (`polaris.ts`) | recorded | killed: 2 failed / 103 (`--supervise` FIFO; dangling link) |
| `close-breaches-as-none`: `if (!read.ok) return [];` (`close.ts`) | recorded | killed: 6 failed / 103 |
| delete `if (cause instanceof BoundedJsonError && cause.code === 'byte-limit') return \`site ${number} is larger than ...\`` (`design-review.ts:66`) | new | **SURVIVED**: run-tree-readers + design-review tests, 109 passed / 109 |

[Observed] Mutation record `run-tree-bounds-mutation-2026-11-23.json` stores `old`/`new` per mutant, the commit `70c0cc29` and per-file digests (format mutation-run/1). It satisfies the rule-6 storage shape.

## Findings

### 1. The page-file past-bound refusal is untested, and a mutant deleting it survives (blocking)

- Where: `packages/polaris-dossier/src/design-review.ts:65-68`.
- Clause (REQ-035 v2.18, line 170): "Each rendered page file the design packet reads from `site/<n>/`: what remains of the site's bound of 67,108,864 bytes after the page files read before it, so that ... one past what remains `site <n> is larger than 67108864 bytes`, the existing words."
- The Case line (spec line 458) requires "a file one byte past its bound and a file grown after its size was taken at each ... page file this requirement bounds, and a regular file exactly at each bound". The scenario "Review files read under their bounds" names "a rendered page file the design packet reads".
- Evidence [Observed]:
  - The only new tests of `readLatestSite` (`run-tree-readers.test.ts`, describe "readLatestSite") cover the three special-file plants and one small regular page.
  - No test in the package names `67108864`. A grep across polaris-dossier and three-surface-poc tests finds that literal only in `derived-record.test.ts` and `git-blob-batch.test.ts`.
  - Deleting the byte-limit branch leaves both suites green (above).
  - The mutation population of 58 holds two design-review mutants (`site-page-old-reader`, `site-page-not-regular-words`) and none over this branch or the `SITE_MAX_BYTES - total` arithmetic.
  - With the branch gone, a page past what remains throws a `PastBoundError`. The outer catch turns it into `site <n> cannot be read (byte-limit)`, wrong words that no test sees.
- Repair: add literal tests to `run-tree-readers.test.ts`:
  - (a) A one-page site whose page is a sparse file of 67,108,865 bytes (`fs.truncateSync`, cheap): expect `{ ok: false, reason: 'site 0 is larger than 67108864 bytes' }` and `bytesReadFrom(page) === [0]`.
  - (b) A two-page site whose first page is N bytes and whose second is sparse at `67,108,864 - N + 1`: the remainder arithmetic. Expect the same words, with 0 bytes read from the second page.
  - (c) Optionally, the grow-after-fstat case at exactly the remainder.
  - Add the deletion mutant and a `SITE_MAX_BYTES - total` → `SITE_MAX_BYTES` mutant to the recorded run.

### 2. Per-file Case coverage is incomplete outside the table-driven readers (note)

- Clause: the Case lines of REQ-033 (line 143) and REQ-035 (line 458) put all five plants and an at-bound file "at each" bounded file.
- Evidence [Observed]: the `READERS` table covers all six cases for 14 readers. These readers are covered only by a subset:
  - review-check verdict file: FIFO and grown only;
  - frozen verdict and frozen inventory: FIFO and past only;
  - round `delivery.json`: directory and past;
  - `packet.sha256`: past only;
  - `packet.json`: FIFO and past-`packetBytes`;
  - inventory brief: FIFO only;
  - page files: plants only (finding 1).
- The shared `readRegularFile` is fully tested through the table, so the gap is in per-site wiring, not in the rule.
- Repair: add the missing reader rows to `READERS`, or `it.each` over the five plants at each of these sites.

### 3. The mutation evidence does not describe the head (note)

- Evidence [Observed]: 3 of the 58 recorded `old` fragments no longer occur exactly once at c74488a4. They are `close-old-reader`, `state-old-reader` and `state-unparsed-as-absent`, changed by `9a925651`.
- The follow-up receipt `run-tree-bounds-review-mutation-2026-11-24.json` (3 mutants at `9a925651`) covers the new controls, but not a re-run of those three at the head.
- The commit title honestly says "at 70c0cc29".
- Repair: re-run the 58 (plus finding 1's) at the final head, or re-point the three fragments.

### 4. Dead code and duplicate constants (note)

- `design-review.ts:70-71`: `if (total > SITE_MAX_BYTES) return ...` is now unreachable. Each read is bounded by `SITE_MAX_BYTES - total`, so `total` cannot exceed the bound. Remove it, or keep it as an explicit invariant with a comment saying so.
- `run-tree-read.ts:16`: `RUN_TREE_BOUNDS.credentialList` is never read (0 uses; the probe uses its own `LIST_MAX_BYTES`). Likewise review check uses `VERDICT_MAX_BYTES` while the others use `RUN_TREE_BOUNDS.verdict`.
- Repair: delete `credentialList`, or point `credential-probe.ts` and `review.ts` at the one table so a bound has one home.

### 5. `readCause`'s optional bound can print `larger than undefined bytes` (note)

- Where: `run-tree-read.ts:35-40`.
- The third branch formats `bound` when it is undefined. `waiting-sessions.ts:607` calls `readCause(cause)` with no bound. The branch is unreachable there today, because `readFileAsSized` throws only `PastBoundError` [Inferred].
- Repair: return the code when `bound === undefined`, or make the third branch require a bound.

### 6. Delivered-packet scenario test is weaker than the scenario (note)

- Clause: scenario "Delivered packet read under its recorded size": "reads at most one byte past that size ... neither hashes nor hands over that packet".
- Evidence [Observed]: `waiting-sessions.test.ts` (case "a packet past the packetBytes ...") computes the expected bound from the fixture record (`stated`), not from a literal. It asserts only the refusal words, not the bytes read.
- Repair: assert bytes read equal `packetBytes + 1` with the `bytesReadFrom` helper, and pin the fixture's packetBytes as a literal.

### 7. Reads outside 2.18 that are still stat-then-read or unbounded (note; not covered by 2.18)

- `verify-text-run.ts:98-101`: `statSync` then `readFileSync` of the operator-named `--text` file (TOCTOU: a FIFO swapped in after the stat blocks). It arrived on main after the sweep's commit `c900e871` (`7322508b` is not an ancestor of c900e871), so the sweep record does not list it.
- `clone-head.ts:31`: the clone's `.git` HEAD and refs. The sweep record itself calls these "within the agent sessions write reach" and classifies them `not-run-tree`.
- Neither is a file 2.18 states [Observed]. Repair: file a follow-on bead to route both through `readBoundedFile`, and refresh the sweep record at the head.

### 8. Behavior the spec does not state (note)

- `waiting-sessions.ts:657`: a readable delivery record whose `packetBytes` is present but not a non-negative safe integer refuses with the mismatch words. The clause speaks only of a record that "cannot be read". This is a defensible reading (a malformed record is not one the command can read), and it is tested and mutation-checked.
- Repair: state it in the next spec touch, or say so in the adoption row.

### 9. Absent-entry tests differ between readers (note)

- `execution-choice.ts:160` uses `isNotFound`, so a dangling link reads as `absent`, as before. Close and the supervisor use `isMissingEntry`, so a dangling link reads as Unknown or unreadable. Both match what the spec requires of each.
- Repair: a one-line comment at `execution-choice.ts:160` saying why the plain ENOENT test is kept.

### 10. `syzygy polaris --resume` over an unreadable state is untested (note)

- Clause: scenario "Supervisor state read under its bound" names `--resume`.
- Evidence [Observed]: the tests cover `--stop`, `--attach` and `--supervise`. `--resume` (`polaris.ts:158-160`) reaches `readState` only after the tmux and view probes. The code returns the stated words through `readState` returning null, but no test pins it.
- Repair: add a `--resume` row with tmux mocked, as the live-view resume test does.

## Craft

[Observed] Names are clear (`readLog`, `loadState`, `readCause`, `isMissingEntry`). Comments cite the version and the requirement, and match the code. The exceptions are the unreachable check (finding 4) and the `polaris.ts` header, which now names REQ-048 correctly. Test expected values are literals written in the test, as the file header says. The exception is finding 6.
