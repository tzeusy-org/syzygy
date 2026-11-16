# runSync timeout and the state-dir root skip: review dispositions, rounds 1 and 2

[Observed] This record dispositions the two CC-REV-1 review rounds of
`syzygy-bpyt.4.22` with `syzygy-bpyt.4.25` (pull request #525). The change is
test-only:
- In `packages/cap1-system/src/daemon-entry-unchanged.system.test.ts`, every
  `runSync` row gets a 20 s timeout, `killSignal: 'SIGKILL'` and a throw on any
  spawn error. Every row except the governed-plane row also runs with
  `SYZYGY_PORT=0`.
- In `state-dir.system.test.ts`, the one mode-000 row skips under uid 0.

The evidence is under `docs/evidence/syzygy-bpyt-4-22/`.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) |
|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-RUNSYNC-ROOT-SKIP-1-RAW.md` | `REVISE` | `f7bbb93a` | `r1-review.diff` sha256 `c780b020a574d0edb253ed77367df21e4ff415c71420f59a3b5590362c126087` |
| 2 | `docs/reviews/R-GP-IMPL-RUNSYNC-ROOT-SKIP-2-RAW.md` | `CONFIRM WITH EXCEPTIONS` | `7459cc75` | `r2-review.diff` sha256 `05f284e45d8f33720460623ecf418c1e8437b35823412ab9a8f9c751dadebf32` |

Round 2's subject equals `git diff 3ec6929951080613b3c5cb7205fe303c5449be58
7459cc7585205e270f90173737c6d59786af650a`. At landing the branch took one
merge of main `a088f1ca`. Round 2 observed that none of the 244 paths main
changed since `3ec69299` is a subject path. [Observed] After the merge,
`git diff origin/main HEAD | sha256sum` printed the same digest as the
subject.

Round 2 was narrow, and its stopping rule was set before it ran. It found the
round-1 blocking finding repaired and N1 to N3 repaired. It added one note,
N5, and no blocking finding. Under the owner's notes-only stopping rule
(`.syzygy/governance/decisions/POLARIS-GATE-SITTING-2026-09-26-DECISION.md`
section 1), the round clears the exact bytes it read, and those bytes are not
edited. This record sits beside them. It is an implementation record and binds
nothing.

Revise-severity findings open: 0

## Class

CC-REV-1 classes: 1 and 6, by reviewer ruling. Test-only: runSync's
environment and failure mode in daemon-entry-unchanged.system.test.ts, and the
root skip of state-dir.system.test.ts's mode-000 row. No product byte changed.

Round 1 ruled this in section 2, and round 2 confirmed it. The PR had guessed
none and left the ruling to the reviewer, as CC-REV-1 permits. No endpoint is
removed. GP-Q0's checks for class 1:
- **Differential.** Degenerate for product code, since no product byte
  differs. The stand-in is the old test against the new over a mutant corpus:
  R5, R9, P1 and P2 at base and head.
- **A rule-6 mutant per predicate.** See the next section.
- **Owner notice.** Posted on `syzygy-bpyt.10` at landing.

GP-Q0's stop clause is not triggered: no gate accepts or refuses anything
differently, and what changed is what a test can see.

## Per-predicate mutant evidence (GP-Q0, and round 2's N5)

The change's predicates in their landed form, with the run that kills each
one. "Round 1" runs are in round 1's raw, section 3.4, and "round 2" runs in
round 2's raw, section 3.2. Their records are retained under
`docs/evidence/runsync-root-skip-review-2026-10-25/`.

| Predicate (head form) | Mutant | Outcome |
|---|---|---|
| `portEnv`'s default `{ SYZYGY_PORT: '0' }` | round 2 `T1-head-R5` (the default emptied, under R5) | `Dossier` binds 127.0.0.1:7477 and the 7477 predicate catches it |
| the governed-plane row's `{}` (pins the default port) | round 2 `ARG-dropped-P1-head` with P1; round 2 `READS-PORT-governed-row` | P1 survives once the `{}` is dropped, so the `{}` alone carries the kill; the governed row reads the variable |
| the 20 s timeout | round 1 `T2-no-timeout-R5` (timeout and `killSignal` removed, under R5) | killed by the hang predicate: SIGKILLed at the reviewer's 90 s deadline |
| the throw on a spawn error | round 1 `T3-no-throw-R5` | equivalent for pass and fail: the same two rows fail without the throw, on their exit-code assertion; only the lane's `timedOutRows` predicate tells them apart |
| `skipIf(isRoot)` | round 1 S1 (`skipIf(true)`) and S2 (`getuid?.() !== 0`) | as the real user each gives 5 passed and 1 skipped with exit 0, so a guard that skips too often fails no exit code (followed up as `syzygy-bpyt.4.30`) |

**N5 disposition.** The lane's record cites round 1's `T1-no-port-env-R5` for
the `SYZYGY_PORT=0` predicate. Its `old` fragment occurs once at `f7bbb93a`
and 0 times at `7459cc75`, because the repair moved the predicate into
`portEnv`'s default. The record states nothing false: it says the cited runs
ran against `f7bbb93a`'s test file. For the landed bytes, the predicate's
mutant of record is round 2's `T1-head-R5`, shown in the table above. No byte
change is needed.

Round 2 also found that the default rows do not read `SYZYGY_PORT` on a
faithful run (`READS-PORT-default-rows`: a non-port value still passes 15).
It also found that the governed-plane row does not depend on the runner's own
environment, because the test's `ENV` strips `SYZYGY_*`; it confirmed this by
running with those variables exported.

## Round 1: one blocking finding and four notes

- **F1** (blocking): `SYZYGY_PORT=0` on every row masked a dropped default
  port. Mutant P1 (`?? String(DEFAULT_PORT)` dropped) was killed at base by
  the governed-plane row alone and survived at `f7bbb93a` across the whole
  system tier. **Repaired** by the reviewer's three fragments. The
  governed-plane row now runs without the variable. The coordinator accepted
  the stated exposure: a regression that wrongly admits that argv binds 7477,
  if it is free, for at most 20 s before SIGKILL. Base had an unbounded hang
  instead. Round 2: P1 is killed at head by that row alone, P2 is killed by
  `ETIMEDOUT`, and R5 and R9 fail by `ETIMEDOUT` with nothing on 7477. Titles
  are unchanged, and `Tests: +0 ~13 -0`.
- **N1** (class): **repaired**. The PR body carries the class line above,
  verbatim, and the owner notice was posted at landing.
- **N2** (PR-body figures): **repaired**. The sampling now reads as a 0.25 s
  sleep between samples, with the mean stated. "341 ms" is replaced by the
  record's slowest head row, 386 ms, with its load1. The record stores
  `meanSampleIntervalSeconds` and load1 for 10 of 10 runs.
- **N3** (mutants of the change's own predicates): **repaired**. The record's
  `reviewRuns` cites round 1's runs by raw line, with one citation gone stale
  (N5, above). The skipped-population pin is filed as `syzygy-bpyt.4.30`.
- **N4** (method, for `syzygy-bpyt.8.35`): passed to that bead's lane. PR #526
  re-ran its root skip with a worker-only shim, unfiltered.

## Retained review evidence

Both reviewers' tools and results are kept under
`docs/evidence/runsync-root-skip-review-2026-10-25/`, 76 files:
- `r1/` (47 files): round 1's 9 tools and 38 results.
- `r2/` (29 files): round 2's 6 tools and 23 results, among them a copy of the
  PR body as round 2 read it (kept as a `.txt` file).

Every one of these files matches the sha256 its raw lists for it in its
cleanup section: round 1 53 of 53 named, round 2 34 of 34 named. That
comparison was made by script at landing, before the excluded files were
dropped.

Not retained: each round's build, typecheck, `test:system`, governance and
quotation logs, and round 1's re-derived subject diff. The raws quote each
log's result line, and the diff is `git diff 3ec69299 f7bbb93a`.

## Acceptance criteria

- `syzygy-bpyt.4.22`: **met**.
  - A row that would hang now fails within the timeout: R5 and R9 fail by
    `ETIMEDOUT`.
  - No mutant daemon keeps 7477, and no survivor is left.
  - The unmutated rows pass with unchanged titles.
- `syzygy-bpyt.4.25`, narrowed on 2026-10-25 to the `state-dir.system.test.ts`
  row: **met**.
  - The skip is limited to the one row.
  - A getuid shim checks the skip's condition only. Real-root behavior stays
    [Inferred].
  - The class is stated.
