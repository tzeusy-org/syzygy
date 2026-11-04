# Review of PR #719 (syzygy-exj7): restart drain race and authority-sweep timeout
Verdict: CONFIRM
Reviewed commit: 6b7cbcf29692374fb6dad8c38b508f9ae487dba5
Subject: PR #719, `apps/three-surface-poc/src/restart.test.ts`, `apps/three-surface-poc/src/polaris-authority-sweep.test.ts`, `docs/evidence/syzygy-exj7/flaky-under-load-2026-11-04.json` (merge base 8ca41d68)

## Checks

1. Drain fix addresses the race. [Observed] `drainPrivateFixtureProcesses` now returns on an empty scan only when `readProvenance(pid) === undefined` for every registered PID and every PID the drain saw. `readProcessProvenance` returns undefined only for ENOENT or state `Z`, the two states that never revert; an unreadable mid-exit read throws `private-process-identity-unreadable`, which the drain's existing catch retries until its deadline. The race is closed, not masked. [Inferred] A reused PID owned by another process would hold the drain until its deadline and then fail loudly; that is a loud failure and not a hidden one.
2. Revert mutation. [Observed] In a scratch edit of the head I replaced the `if ([...]).every(...)) return;` line with `return;`. The new test (syzygy-exj7) failed with `expected +0 to be 3`; the file was restored by `git checkout` and the tree was clean after. With the fix, `restart.test.ts` (17 tests) and `polaris-authority-sweep.test.ts` pass (23 tests in all).
3. Timeout bump. [Observed] The diff to `polaris-authority-sweep.test.ts` adds a comment and `, 25_000` on one `it`; no assertion, root list or file population changed, and the other tests keep the default. [Observed] The evidence record's measured worst case is 8,029 ms (7 of 30 unclipped runs above 5 s), so 25 s is about 3x worst. A genuine hang would still fail at 25 s. 
4. Local gates. [Observed] `npm run check` at the head: 168 files, 3763 tests passed.
5. Hosted CI at 6b7cbcf2. [Observed] `node`, `node (unit)`, `node (integration)` and `node (e2e)` pass for this head. The governance-docs `checks` run (41778849945) was still in progress when this raw was written; see the head of the PR for its final state.
6. PR body and evidence. [Observed] The body carries `Tests: +1 ~2 -0`; the diff adds one test and edits two (the restart drain helper is not a test; the sweep test gains a timeout), consistent within that counting. The evidence record names the bead, `baseCommit` 92eafd01, the host, the method, per-subject causes and raw per-run data.

## Findings

- N1 (note, low). Rule 11: the evidence record names its subject and the base commit (92eafd01) but not the commit or digest of the fixed tree the "after" runs ran against; the amplified-harness edits were scratch and uncommitted, and the record says so. The "after" results therefore cannot be re-checked against specific bytes. Not blocking: the deterministic test and the revert mutation above reproduce the behavior at 6b7cbcf2.
- N2 (note, low). The restart race is not reproducible on the unmodified file (0 of 30 runs); the fix rests on the amplified harness (4 of 300 failing drains before, 0 of 450 after) and on the deterministic test. The PR body discloses this.
- N3 (note, low). The new test asserts exact counts (`provenanceReads` 3, `scans` 4), which pin the drain's loop shape and not only its outcome; acceptable for a regression test of this loop, but a later change to the loop will need the numbers revisited.

No blocking finding.
