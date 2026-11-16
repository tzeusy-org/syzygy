# R-PMY0-GUARDIAN-SCAN-READ-2 — independent review of PR #821
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 8d9ab2d88d00544a63f36b201adaafbc1e6f9302
Base: 74c44cc0d38888316a268ff1111f709c4a98dc2f

Reviewer: fresh context; I did not author this change. I read AGENTS.md and
round 1's raw (`R-PMY0-GUARDIAN-SCAN-READ-1-RAW.md`, CONFIRM WITH EXCEPTIONS at
7060b9f6).

- Worktree: `.worktrees/review/r-pmy0-2`, detached at the reviewed commit.
  - `npm ci` exited 0.
  - `git status --porcelain` was empty at the end.
- Merge base with origin/main: `5be0fce2e872`.
- origin/main moved to `6b54d312c` during the review.
  - Its new commits touch none of these files: the guardian, the fixture,
    `package.json`, `check_test_tiers.mjs`.
  - `git merge-tree` of `6b54d312` with `8d9ab2d8` is clean.
- Host: Python 3.14.4, about 4,360–4,380 visible PIDs, load1 between 11 and 30.
- Scratch directory:
  `/tmp/claude-996/-home-orca-orca-projects-syzygy/c279c71d-f39b-4d61-b70b-caea13e536a7/scratchpad/r-pmy0-2/`
  - It holds the extracted guardians, `mutants.json` (each mutant's `old` and
    `new` text), `main_vs.py`, `main_vs_norm.py`, and the outputs `A.json`,
    `A2.json`, `B.json`, `C.json`, `C2.json`, `D.json` and `rd-committed.json`.

Guardian digests. Each is the sha256 of `git cat-file blob <c>:scripts/poc_browser_lifetime.py`.
I used `cat-file` because `git show` here pipes through a filter and changes the bytes.

| Commit | Role | sha256 |
|---|---|---|
| origin/main and 5be0fce2 | main | `8394578a66be…` |
| cda30847 | predecessor (also at 9ed4c69e) | `af485ea34eaa…` |
| 7060b9f6 | round-1 subject | `678d0030dfc1…` |
| 8d9ab2d8 (= 16817297) | subject | `27e36020e866…` |

The subject digest matches `subject.files` in the record (line 7). The fixture
digest `6f0a59ff…` also matches (line 8). All 10 tool digests in `tools`
(lines 475–486) match the committed files byte for byte.

## Round-1 findings

### F1 — repaired
Round 1 said: "`hostTimings.ack17Probe.a.source_sha256` is `3299de04fc07…`, and
`ack17ProbeNote` says "'a' this subject". … the note must be corrected or the
row re-run on `678d0030`".

[Observed] The row is gone.
- `ack17Probe.subject` (`docs/evidence/syzygy-pmy0-scan-read-2026-11-16.json:373-383`)
  now carries the subject digest `27e36020…`.
- `ack17Probe.predecessor` (`:384-394`) carries `af485ea3…`.
- `3299de04` occurs only in the repair note (`:17`) and in `tools/build_record.py:81`.

The probe tools (`probe.sh`, `main_protocol_17.py`, `launcher_16.py`) are
committed. `probe.sh` hashes whichever source it copies, so the recorded digest
comes from the bytes that ran. I did not re-run ACK17 at this head.

### F2 — repaired
Round 1 said: "The PR body describes only the last commit; three material items
are undisclosed". Those were (a) the margin and scaling, (b) the e2e scheduling
change, and (c) the earlier commits and their open record.

[Observed] The PR body now covers each one:
- (a) Its section "Margin risk" gives the ratio, the estimate at 4,774 PIDs,
  the scaling as visible PIDs × signals, and "No worst-case deadline guarantee
  is claimed". G1 below qualifies the estimate.
- (b) "E2e scheduling (`bffd3f94`)" gives the reason and the effect ("the
  suite no longer exercises that deadline under e2e peer load"), and says it is
  not a reclassification.
- (c) "Stricter lifetime assertions" and "Evidence" disclose the 11-14
  record's `readiness: BLOCKED` and its `pending` list as historical.
- The body names all of the branch's guardian commits, and the Rejected
  section records the reverted `lineage()` reader.

### F3 — repaired, verified independently
Round 1 said: "a process that exits between its stat read and the old owner
lookup … is also a lineage edge … the subject reaches B through A."

[Observed] The repair restores the predecessor's text.
- `descendants()` builds scan rows with `identity(int(name), with_namespace=False)`
  (`scripts/poc_browser_lifetime.py:70`).
- `identity()` still makes the owner lookup inside the
  `FileNotFoundError`/`ProcessLookupError` guard (`:48`, `:55-56`).
- `lineage()` and `stat_fields()` are deleted.

`git diff cda308473 8d9ab2d8 -- scripts/poc_browser_lifetime.py` contains only
the `read_stat_text` body, `process_names()` and the imports. `identity`,
`descendants`, `stop`, `reap`, `drain` and `main` are textually identical to
the predecessor's.

The diff against origin/main is likewise confined to I/O mechanics:
- raw `os.open`/`os.read` plus a whole-buffer decode, where main uses `Path.read_text`;
- string paths;
- `split(None, 20)`;
- `os.scandir`, where main uses `Path.iterdir`.

The control flow, refusal predicates, deadline, escalation, `empty == 2` and
the acknowledgement are byte-identical to main.

Committed differential, re-run:
`python3 race_differential.py g-cda308473.py g-HEAD.py g-7060b9f6.py`, wall
time 9 min 6 s.
- 22,869 single runs and 215,520 pair runs over 9 trees.
- `differences: 0`.
- `controlDifferences: 129270`, using round 1's subject 678d0030 as control.
- Both figures equal the record (`:23-33`).

Reviewer runs. These use my adapter `main_vs.py`, which runs the committed
kernel and plans. It also runs main's `Path`-based guardian by patching
`Path.read_text`, and gives the fake directory entries a `.path`.

| Run | Old | New / control | Differences | Control differences |
|---|---|---|---|---|
| A2 | main 8394578a | subject 27e36020; control m2 | **0** (syscall counts 0 different) | **5,375** |
| B | main | main (self-control) | 0 | n/a |
| C | subject | m1 | **44,789** | n/a |
| D | subject | m3 | **132,508** | n/a |

The mutants:
- m2 is main with `owner = directory.stat().st_uid` wrapped in
  `try/except FileNotFoundError: owner = None`. That is the F3 window on main's
  own text.
- m1 adds `PermissionError` to `identity()`'s `except`, so a denied namespace
  stops refusing.
- m3 changes `empty == 2` to `empty == 1`.

A2 compares main directly with the subject. The committed differential only
covers af485ea3 against the subject, so A2 closes the main-to-af485ea3 link
that round 1 left resting on the 11-14 records, at least within this kernel.

The first form of A (`A.json`) showed 44,789 differences. All of them were the
exception message: main's `PermissionError` read `denied: PosixPath('/proc/N/ns/pid')`
and the subject's read `denied: '/proc/N/ns/pid'`. This comes from the
harness. The fake kernel raises with whatever path object it was given.
[Observed] The real `os.readlink(Path(...))` reports the string form, so on the
host the two messages are identical:
`PermissionError [Errno 13] Permission denied: '/proc/1/ns/pid'` both ways.
A2 normalizes only that repr. The regex is in `main_vs_norm.py:45`.

What the differential cannot reach, judged by reading:
- **Stat reader.** Both harnesses replace `read_stat_text` or `Path.read_text`.
  Equivalence there rests on the reader primitive differential, and round 1
  re-ran that one.
  - `read_stat_text` is byte-identical between 7060b9f6 and 8d9ab2d8, so round
    1's checks still apply to it: three codec modes, 0 row mismatches; newline
    translation only before the last `)`; `final=True` whole-buffer decode;
    EINTR handled by PEP 475.
  - [Inferred] An undecodable `comm` still raises `UnicodeDecodeError`
    uncaught, which means exit 70, as on main. The message positions are the
    same because both decode the whole buffer at once.
- **Listing.** `os.scandir` gives the same names in the same order as
  `Path.iterdir`. On 3.14, `iterdir` is itself a materialized `os.scandir`
  (I read the pathlib source on the host).
  - The F5 gate is gone, so every interpreter now runs the same listing. On
    pre-3.13 interpreters, main used `os.listdir`; that is the same getdents
    order. Not measured here.
- **Delivered signals and family sets.** The A2 and committed runs compare them
  over every plan.
- **Timing.** The subject is faster, so it can run more rounds before the
  deadline. That is a schedule difference, not a predicate difference.

Conclusion: [Observed within the kernel, Inferred beyond it] the subject's
outcome, delivered signals, family sets and exceptions equal main's.

### F4 — repaired
Round 1 said: "The differential and mutation scripts are not retained".

[Observed] All 10 tools are under
`docs/evidence/syzygy-pmy0-scan-read-2026-11-16/tools/`, with digests in the
record (`:475-486`), and I re-hashed every one. The mutation records store each
mutant's `old`/`new` and the commit `f1bea130` (`:167-307`), which satisfies
the AGENTS.md lesson on rule-6 evidence records.

### F5 — repaired
Round 1 said: "`process_names()` gates on exactly Python 3.14".

[Observed] `process_names()` is now an unconditional `os.scandir`
(`scripts/poc_browser_lifetime.py:59-62`). `sys.version_info` no longer appears
in the guardian or the fixture.

### F6 — repaired
Round 1 said: "The final assertion `[...] == [(4242,)] * len(...) != []` is a
chained comparison … Split it" and "The `_reader` loop variables are used, so
they should not carry a leading underscore."

[Observed]
- The assertion is now two asserts with distinct messages
  (`apps/three-surface-poc/src/test-fixtures/browser-parent-death.py:52-54`).
- The `_reader` loops are gone; with `lineage` deleted, a single
  `identity` call replaces each one (`:131-132`, `:147-158`).
- The remaining loop variable `reader` (`:302`) is used.
- New control, `kept a row that vanished after its read` (`:162-164`), pins the
  F3 restoration at the `identity()` level. The record's `keeps-vanished-row`
  mutant was killed by it (`:242-252`).

## New findings

### G1 — note — [Observed] The margin estimate scales a refusal time, so "about 3.0 s" is not an estimate of completion

Anchors: PR body, "Margin risk"; record `hostTimings.margin.estimateAt4774Pids`
(`:400`). Source of the 4.03 s figure:
`docs/evidence/syzygy-pmy0-guardian-outcome-2026-11-14.json:27`.

The 4.03 s comes from a "Single current-source SIGTERM attribution attempt"
on af485ea3. That run "captured a cleanup deadline refusal: 18 scans, 3.96568 s
scan time, 4.03338 s drain … Instrumentation overhead unknown". So:
- the drain did not complete, and 4.03 s is the time at refusal, not at completion;
- it is a different case from the drain17 workload whose 0.747 ratio is
  applied to it;
- its instrumentation overhead is unknown.

The body says "about 3.0 s against the fixed 3 s deadline". It is labelled
[Inferred], but it reads as a completion estimate. Truncation pushes the true
figure up, and instrumentation may push it down, so the honest statement is
that the direction is unknown. The body should say something like:
"4.03 s was a deadline refusal (incomplete, instrumented) on a different case.
Scaled by 0.747 it gives about 3.0 s of work without completing. Under those
conditions a refusal cannot be excluded."

"Effectively no margin" and "No worst-case deadline guarantee is claimed" are
already there, so the conclusion is not reversed and the figure is still worth
stating. The owner should simply not read "about 3.0 s" as "would just pass".

The premise of the brief holds. [Observed] The subject is no slower than its
predecessor or main:
- drain17: subject 1.56–1.64 s against af485ea3 2.09–2.25 s (record `:310-370`);
- ACK17 in the record: 1.77 s against 2.32 s;
- round 1 measured main at 3.63–5.36 s, refused;
- behaviour equals main (F3 above).
The remaining margin is therefore not a defect of this change.

"Predecessor" in the margin section means af485ea3, the branch's own
intermediate, not main. The Equivalence heading says so, but the margin
paragraph does not.

### G2 — note — [Observed] The committed race differential is close to a tautology against af485ea3

Both guardians run with `read_stat_text` replaced by the fake kernel
(`tools/race_differential.py:176-178`). After the replacement, af485ea3 and the
subject differ only in `process_names()`, so "0 differences" mostly confirms
that the text was restored. The F3 sensitivity claim rests on the
`keepVanishedRowMutant` control, which is a fair and proper control.

The differential does not compare against main. It cannot run main as written,
because main has no `read_stat_text` and `saved` (`:176`) would raise
`KeyError`. My A2 run fills that gap with 0 differences. Recommendation, not
required: retain a main-capable variant, or record that main → af485ea3 is
covered by A2-style runs.

### G3 — note — [Observed] `npm run check` failed on the same two untouched files as round 1's check:all attempt

`npm run check` at 8d9ab2d8 ran with load1 about 24, partly from my four
concurrent harness processes:
- typecheck passed;
- unit: "2 failed | 181 passed (183)", "2 failed | 4304 passed | 1 skipped (4307)";
- both failures were "Test timed out in 5000ms", in
  `packages/polaris-generation-core/src/island-boundary.test.ts` and
  `apps/three-surface-poc/src/polaris-generation/diagram-layout.test.ts`.

Those are the same two files the record lists for the 80399fae check:all
attempt (`:440-443`). The branch touches neither file. Re-run alone at load1
about 11, they gave "2 passed (2)", "46 passed (46)".

[Inferred] These are load-sensitive 5 s timeouts and are not caused by this
change. The PR body's "183 files; 4,306 passed" was not reproduced under my load.
The clean-clone `check:all` the body still owes should record the load.

Also run:
- `python3 scripts/check_governance.py`: "32 OK, 21 WARN, 0 FAIL (53 checks)".
- Lifetime file (`vitest run --project e2e apps/three-surface-poc/src/cdp-browser.browser.test.ts`)
  at 4,377 PIDs and load1 about 22–30: "5 passed (5)".
- check:all was not run.

## Other changes from 7060b9f6 to 8d9ab2d8

The commits are 16817297, f1bea130 and 8d9ab2d8.

- Guardian: covered under F3 and F5.
- Fixture: covered under F6. The scan-refusal loop now patches `identity` for
  both the guardian and the observer (`:302-329`). The `guardian-scan-reused`
  control was killed by the record's `scan-skips-reverification` mutant, so it
  is still live.
- Record: rebuilt by `tools/build_record.py`.
  - The `earlierSubject80399fae` block (`:419-473`) is labelled history.
  - Mutations: 10 of 10 killed, 2 of them by an earlier named control, with
    the predicted marker absent. That is disclosed.
- The tools are evidence only and are not imported by product code.

No regression found.

## Disposition requested

- G1: correct the margin wording in the PR body and in
  `hostTimings.margin.estimateAt4774Pids` before landing.
- G2 and G3: optional.
- Landing still needs the clean-clone `check:all`, as the body already says.
