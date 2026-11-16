# R-PMY0-GUARDIAN-SCAN-READ-1 — independent review of PR #821
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 7060b9f6b6bb340e7b18d1c1a8faee47eefcffeb
Base: 74c44cc0d38888316a268ff1111f709c4a98dc2f

Reviewer: fresh-context, did not author. Worktree `.worktrees/review/r-pmy0-1`
(detached at the reviewed commit, `npm ci` run, no edits left: `git status
--porcelain --untracked-files=no` empty after every mutant). Merge base with
`origin/main` is `5be0fce2e872563b581a56399e8be5f6880a19cc`; `origin/main`
(74c44cc0) has moved past it. Host Python 3.14.4, ~4,317–4,364 visible PIDs,
load1 10–12 during my runs. Scratch: `/tmp/claude-996/-home-orca-orca-projects-syzygy/c279c71d-f39b-4d61-b70b-caea13e536a7/scratchpad/r-pmy0/`.

Guardian digests used below (sha256 over file bytes, scripted):
- main `8394578a66be…` (`git show origin/main:scripts/poc_browser_lifetime.py`)
- predecessor `af485ea34eaa…` (= `9ed4c69e6`, the PR's own intermediate)
- subject `678d0030dfc1…` (= reviewed head; matches the evidence record)

## Hard constraints

| Constraint | Result |
|---|---|
| 3 s deadline unchanged | [Observed] `drain()` text identical to main: `deadline = time.monotonic() + 3` (`scripts/poc_browser_lifetime.py:152`). |
| Accept/refuse exactly as before | [Observed] drain-level outcome and delivered-signal sequence identical old vs new in 3,019 author cases (re-run) and in 10,562 reviewer intra-scan interleavings (below). One window changes `descendants()`'s return value (F3); no outcome difference found. |
| Identity (owner, namespace), two empty scans, explicit ack | [Observed] `identity()` still reads owner and, for same-UID rows, namespace (`:49-61`); every owned row is re-read by `identity()` (`:104-113`); `stop()` unchanged; `empty == 2` and `os.write(3, b'closed\n')` unchanged. |
| No target-lineage ancestry walk | [Observed] none; every signal still calls a full `descendants()` (`:129`). |
| No CC-TEST-4 reclassification | [Observed] none. The e2e phase split (F2b) changes run scheduling, not classification. |

No hard constraint is breached.

## Findings

### F1 — Medium — [Observed] The evidence record misattributes the ACK17 "after" probe to the subject

Anchor: `docs/evidence/syzygy-pmy0-scan-read-2026-11-16.json:349` and `:371`.

`hostTimings.ack17Probe.a.source_sha256` is `3299de04fc07…`, and
`ack17ProbeNote` says "'a' this subject". The subject is `678d0030…`. The
author's retained `pmy0/probe-a/guardian-source.py` hashes to `3299de04…` and
differs from the subject: it is an earlier draft in which `identity()` still
read through a text stream and `lineage()` had its own inline raw reader. So the
1.37 s "after" figure quoted in the brief was not measured on the reviewed
bytes. (The PR body quotes the drain17 timings, which did run `678d0030`, so
the body is not wrong here; the record is.) Rule 11: the digest is right,
the prose saying what it is is wrong.

My own measurement of the subject's ACK17 probe agrees with the conclusion (see
"Timing"), so this changes no outcome, but the note must be corrected or the
row re-run on `678d0030` before the record is cited.

### F2 — Medium — [Observed] The PR body describes only the last commit; three material items are undisclosed

Anchor: PR #821 body; `git log origin/main..7060b9f6` lists 9 commits.

a. **Thin margin and scaling.** The body gives timings only at ~3,735 PIDs and
   never says the scan stays O(visible PIDs × signals) or what the margin is at
   the owner-observed ~4,774 PIDs. The 11-14 record says "No worst-case
   deadline guarantee is claimed"; the body does not. [Inferred] scaling the
   retained predecessor failure (4.03 s drain at 4,774 PIDs) by the observed
   new/old ratio (0.63–0.69 in both the author's and my drain17 runs) gives
   about 2.6–2.8 s against the 3 s deadline. Acceptance criterion 4: not
   disclosed.
b. **E2e scheduling change.** `package.json` `test:e2e` now runs
   `cdp-browser.browser.test.ts` alone before the other e2e files, and
   `check_test_tiers.mjs` enforces that. This changes the conditions under which
   the deadline is exercised in the suite (no e2e peers). It is documented in
   `CONTRIBUTING.md:140-143` but appears in neither the PR body nor a stated
   rationale (commit `bffd3f943` has no body). Not a CC-TEST-4 reclassification,
   but the owner should see it was done.
c. **Earlier commits and their open record.** The new guardian-role and
   guardian-exit assertions (`cdp-browser.browser.test.ts:132-141`), the fixture
   wait-loop change, and `docs/evidence/syzygy-pmy0-guardian-outcome-2026-11-14.json`
   (whose `subject.readiness` is "BLOCKED" and whose `pending` list includes
   "Current strict guardian-role/exit/poll … fault controls") are in the diff
   but not in the body.

### F3 — Low — [Observed + Inferred] The race-window claim is incomplete: a kept row can also bring its children into the family

Anchor: `scripts/poc_browser_lifetime.py:64-72, 88-99`; evidence
`equivalence.raceWindowDifference`.

The author says a process that exits between its stat read and the old owner
lookup "is now kept as a scan row and later dropped by identity()". That is
true of the row itself, but it is also a lineage edge. If a child B of that
process A was read earlier in the same scan with `ppid == A` (B's PID below A,
i.e. after PID wrap), the predecessor drops A and so cannot reach B in that
scan; the subject reaches B through A. [Observed] with an injected
`exit-reaped` of A right after its stat read, `descendants()` returns `[2000]`
on the predecessor and `[1500, 2000]` on the subject.

The direction is fail-closed: the subject's scan rows are a superset, so its
owned closure is a superset and it verifies at least as many PIDs. [Observed]
over the whole drain the outcome converges. B is reparented to the subreaper,
so the predecessor finds it on the next per-signal scan. In 10,562
single-event interleavings, outcome and delivered signals were identical.
[Inferred] For a refusal to differ you need two concurrent events, PID wrap,
and a family member that reaps its own children. In that case the subject can
refuse where the predecessor would have completed, never the reverse.
"No refusal predicate changes" holds. "Does not change any refusal" is true
only for single-event interleavings, not universally.

Evidence gap: the author's `differential.py` holds the process table fixed
for the whole scan. Mutations happen only inside `pidfd_send_signal`, so the
3,019-case corpus cannot reach this window, which is the one behavioural
difference the change introduces. My harness (`r-pmy0/race2.py`) injects one
event (exit-reaped, exit-zombie, PID reuse, namespace taint, fork) after each
syscall, including between a stat read and the owner lookup. Results:
- old ≡ new: 10,562 / 10,562 identical.
- old ≡ old (self-control): 10,562 / 10,562.
- Negative control, re-verification disabled (`if False:`): 449 outcome
  differences.

I recommend retaining it, or an equivalent, with the record.

### F4 — Low — [Observed] The differential and mutation scripts are not retained, so the record cannot be re-checked once the scratchpad goes

Anchor: `docs/evidence/syzygy-pmy0-scan-read-2026-11-16.json`. It has no
script path, digest or text. The mutation `log` values are bare filenames.

I could re-run the record's figures only because the author's session
scratchpad still exists. The 11-14 record retained its probe texts verbatim
with digests (`textArtifacts`). This one should do the same, at least for
`differential.py`, `primitive_differential.py`, `mutate.py` and `drain17.py`.

### F5 — Low — [Observed] `process_names()` gates on exactly Python 3.14

Anchor: `scripts/poc_browser_lifetime.py:75-85` (from `6c1498c88`).

There are two listing paths. Only the 3.14 branch runs on this host, and the
condition is `== (3, 14)`, so 3.15 silently returns to the slower `Path`
path. Refusals are unaffected because the listing is the same set. Still, it
is a branch on interpreter version, kept to preserve an iterator's internal
syscall shape, and a reader cannot verify it locally. Simpler: use
`os.scandir`, or `os.listdir`, unconditionally, and show by differential
that the result set is the same.

### F6 — Nit — [Observed] Fixture readability

- Anchor: `browser-parent-death.py` `guardian_stat`. The final assertion
  `[...] == [(4242,)] * len(...) != []` is a chained comparison that reads as
  a typo. Split it into two asserts.
- The `_reader` loop variables are used, so they should not carry a
  leading underscore.

## Acceptance criteria

1. **Refusal equivalence.** Holds at drain level.
   - [Observed] I re-ran the author's drain differential on byte-identical
     copies of af485ea3 and 678d0030: 3,019 / 3,019 identical, scans
     17,221 / 17,221.
   - [Observed] I re-ran the reader differential:
     - default locale (`locale`/UTF-8): 3,744 cases, 0 mismatches, live 4,356/4,356;
     - real C locale (`-X utf8=0`, `ANSI_X3.4-1968`): 0 mismatches, outcomes
       `value 396 / UnicodeDecodeError 3268 / IndexError 79 / ValueError 1`,
       which equals the record;
     - UTF-8 mode: 0 mismatches.
   - Corpus gaps I hunted:
     - Intra-scan exits, PID reuse and namespace-unreadable timing: F3, now
       covered by my harness, with no outcome difference.
     - Partial reads: the subject's loop reads to EOF, and the `single-read`
       mutant is killed.
     - Encoding: text mode decodes `read()` with `final=True`, which equals
       `bytes.decode` for every codec, stateful ones included. Newline
       translation only touches `\r` before the last `)`, which the parse never
       reads after `rfind(')') + 2`. 325 text-only differences, 0 row
       differences.
     - EINTR is retried by `os.read` under PEP 475, in both readers.
   - Main → af485ea3 (earlier commits, Path → str, `split(None, 20)`, scandir)
     rests on the 11-14 records. I did not re-derive it beyond
     `split(None, 20)[:20] == split()[:20]`, which holds by definition.
2. **Mutants are real; the record names subject digests.** Partly.
   - [Observed] Rule 11 subject digests are present and correct for the
     guardian and fixture at `80399fae`. F1 and F4 are the exceptions.
   - [Observed] My own mutants, in my worktree, with `old`/`new` stored in
     `r-pmy0/mutants*/result.json` at the reviewed commit:
     - `single-read` (author's), startup case: killed.
     - `lineage-blind` (`return None`), SIGTERM case: killed.
     - `lineage-pgrp-as-parent` (`fields[2]`): killed.
     - `exit-70-after-ack` and `exit-120-after-ack` (`sys.exit(70)` /
       `os._exit(120)` before `code = …`): killed, by "expected [0, 137, 143]
       to include 70/120". This also covers the 11-14 record's pending
       "guardian exit" control.
     - The control passed.
   - One reviewer mutant, `sys.exit(70)` inside the ack `try`, survived. It is
     equivalent in worker-death mode, where `os.write(3, …)` raises
     `BrokenPipeError` first. That is not a defect.
3. **Readability and minimality.** Acceptable.
   - `read_stat_text`, `stat_fields` and `lineage` are small and commented with
     their reasons.
   - Exceptions: F5 and F6.
4. **Performance honesty.**
   - The drain17 numbers are honest.
   - The ACK17 "after" row is not on the subject (F1).
   - The margin is not disclosed in the PR body (F2a).
5. **Fixture controls.** Kept or strengthened. [Observed]
   - Added refusals: `owned-sibling-unreadable` and `owned-sibling-reused`.
   - New reader controls:
     - exit during read, for both readers;
     - unused-tail independence;
     - multi-chunk read;
     - undecodable refusal;
     - descriptor closed;
     - decoder warning before open;
     - locale codec.
   - The scan-reuse controls are re-pointed at `lineage`.
   - The guardian role is pinned by argv, and the guardian exit must be
     WIFEXITED with code in {0, 137, 143}.
   - Behaviour change in the wait loop: it now waits on the pinned guardian's
     reap instead of polling `family()`. The `after` census is taken right after
     guardian exit, which is stricter, and `after.proc == []` and
     `procFamilyDenominator == 0` are retained. `outside-family` moved its
     parent from `row` to `current`. `stop()` ignores the parent, so strength is
     unchanged.
6. **Probe timing.**
   [Observed] ACK17 probe (author's `main_protocol_17.py`, unchanged, copy of
   `probe.sh` writing to my scratch):

   | Source | Elapsed after stop | Exit | Ack | proof | PIDs (denominator) |
   |---|---|---|---|---|---|
   | subject 678d0030 | 1.466 s | 143 | `closed` | true | 4,317 |
   | subject 678d0030 | 1.567 s | 143 | `closed` | true | 4,319 |
   | main 8394578a | 3.369 s | 70, "deadline exceeded" | none | false | 4,327 |

   drain17 at load1 ~11:

   | Source | Drain | Scans | Result | PIDs |
   |---|---|---|---|---|
   | main | 5.36 s, 3.63 s | 19 | refused (deadline) | 4,348 / 4,364 |
   | af485ea3 | 2.33 s, 2.22 s | 20 | completed | 4,344 / 4,336 |
   | 678d0030 | 1.61 s, 1.39 s | 20 | completed | 4,340 / 4,334 |

## Also run

- [Observed] `npm run test:tiers`: "ok: every test file is in exactly one tier",
  e2e phases 1 + 14 = 15.
- [Observed] `python3 scripts/check_governance.py`: 32 OK, 21 WARN, 0 FAIL
  (53 checks).
- Not run: `check:all`, as instructed. The PR's unit-tier failure (two 5 s
  timeouts in untouched files) remains unclassified, and a clean-clone
  `check:all` is still owed before landing.

## Disposition requested

Before landing:
- Fix F1: correct the note, or re-run the ACK17 row on `678d0030`.
- Fix F2: disclose the margin and scaling, the e2e phase split and its
  rationale, and the earlier commits' open items in the PR body.
- Fix F4: retain the scripts.

F3's harness is recommended. F5 and F6 are optional.
