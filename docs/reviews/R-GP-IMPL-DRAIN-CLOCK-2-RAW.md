# R-GP-IMPL-DRAIN-CLOCK-2 — CC-REV-1 implementation review of syzygy-bpyt.4.19, round 2
Verdict: CONFIRM
Reviewed commit: 33b01efb
Subject: git diff b77bae09 33b01efb sha256 889efae275dd7e55944982294f9435d9ee95e1b031fad26de6bbb47c4bca93fd

Scope. PR #560, "Make the browser drain-timeout test use an injected clock", head `33b01efb10251be92fb785b40699dca00f1ebb6f`, rebased on `origin/main` `b77bae09` (`git diff b77bae09 33b01efb` touches six files: one test, two tools and three evidence records; product code is unchanged). Round 2 of `R-GP-IMPL-DRAIN-CLOCK`.

Round-1 baseline. The round-1 raw (`R-GP-IMPL-DRAIN-CLOCK-1`) is not retained on the branch, so I did not read it. I judged against the only surviving text, the `bd comments syzygy-bpyt.81` entry dated 2026-10-28 23:10: REVISE over `72fd2f83`, raw sha256 `3d5b5ee9061ed100b56f39867f075e6967f166b3fe0470991eb4947b8dc8c5b4`, F1 (semantic; the injected `now` copied the product's 25 ms sleep, so the suite newly accepted a longer inter-scan sleep the base refused, 60/200/750 ms), F2 and F3 (body text), F4 (the 20-run repeat record). That summary does not say what F2 and F3 said, so for them I could only check the current PR body against the bytes, not against the original wording.

Method. [Observed] Everything below was run in a fresh worktree at `33b01efb` after `npm ci`, host load1 about 22.

1. F1 (semantic) — met.
   - `apps/three-surface-poc/src/cdp-browser.test.ts:85-103`: the first `closeDisposableBrowser` call now runs between `vi.useFakeTimers()` and a `finally { vi.useRealTimers(); }`. The product's `setTimeout(resolve, 25)` (`cdp-browser.ts:514`) and its default `Date.now` both read the fake clock, so the 100 ms drain deadline is a count of scans. The test advances 50 ms (`advanceTimersByTimeAsync`) and asserts `scans` is 3 before awaiting the call.
   - [Inferred] Tightness: the scans fall at 0, 25 and 50 fake milliseconds, so any inter-scan sleep above 25 ms leaves `scans` below 3 at 50 ms and fails the in-flight assertion. A sleep below 25 ms still passes, as it did at the base; that was never the F1 population.
   - [Observed] I ran `python3 -I docs/evidence/syzygy-bpyt-4-19/tools/rule6.py b77bae09 72fd2f83` at `33b01efb` (exit 0) and read its output, not its exit code:
     - unmutated file 29 of 29;
     - delayed-scan probe (60 ms of real busy-wait per fake scan): base test fails with `private browser profile drain did not verify two empty scans before deadline`, head test passes 29 of 29;
     - K1 (one empty scan suffices) killed, 26 passed and 3 failed; K2 (deadline a third) killed, 26 and 3; K3 (profile removed before socket close) killed, 23 and 6; K4 (inter-scan sleep 200 ms) killed, 28 and 1 with `expected 1 to be 3`, so 4 of 4;
     - F1 witness: the round-1 test file (`72fd2f83`) run under K4 passes 29 of 29 (survives), and the head kills K4.
   - My numbers equal the retained `rule6-729b0496.json` on every field I compared. The test file at the head hashes to `1dd72c42697b889a7b3a05518259bb2a1ad81e173f893b03f14480a1e0b6bc16`, the digest the record and `repeat-729b0496.json` carry, and equals the file at `729b0496`; `cdp-browser.ts` is byte-identical to `origin/main`'s (empty `git diff --stat`).
   - The three later calls in the same test inject `now` as a call counter and read no wall clock, so no wall-clock deadline remains in the case.

2. F4 (repeat record) — met on its face. `repeat-729b0496.json` (tool sha256 `b4f55beac54c823710b325d800b86d0bacec20a5b4760a60b7ef27c0610ebbab`) records 20 runs, 20 passing, 29 tests each, worktree clean, load1 17.76 to 19.35 across all samples, no load generator. I did not re-run all 20; I ran the file once (29 of 29 in 1.2 s) at load about 22, and the rule-6 run above ran it a further seven times at that load.

3. F2 and F3 (body text) — not confirmable against their original wording; the current body is accurate on every claim I could check:
   - 29 tests before and after, one modified (`grep -c '^  it('` is 29 at `b77bae09` and at the head), "Tests: +0 ~1 -0";
   - product file unchanged; every other assertion and deadline unchanged (diff read in full);
   - surface version `polaris@37bec30acd90` at the merge base and `polaris@6d265961aa82` at `729b0496`: re-derived from the two tree ids with the formula in `walkthrough-inputs.ts` (`pwbSurfaceVersion`), both match; the core tree is unchanged;
   - `python3 scripts/check_governance.py`: "32 OK, 21 WARN, 0 FAIL (53 checks)", as the body states;
   - `npm run typecheck` exits 0 at the head;
   - the CC-REV-1 class sentence is labelled `[Inferred]`, and the diff supports it (test file and evidence only).
   - Not re-run by me: the body's full-suite figures (253 files, 5,878 tests); the body itself says hosted CI re-runs them.

4. Evidence hygiene. Records name their subject commit and the digests of the test file, the product file and the tool (rule 11); `rule6.py` stores each mutant's old and new fragment (rule 6 record). The records name `729b0496`, one commit behind the head; the only change between `729b0496` and `33b01efb` is the retained records themselves (rename of the earlier `rule6-7dd61dfc.json` and `surface-version-7dd61dfc.json`, two new records), so the digests match the head's test file.

Findings. No blocking finding. No exception.

Observations (not exceptions; no action required for merge):
- O1. A product inter-scan sleep shorter than 25 ms is not killed by this case. The base did not kill it either, and no round-1 finding asked for it.
- O2. On a failing assertion the in-flight `closing` promise is never awaited; with a mutant that makes the call reject (K2) the rejection is surfaced through the later `await closing`. The mutant is still killed, and there is no effect on the passing path.

Hosted CI. At the time of writing, `node-ci` and `governance-docs` were queued at `33b01efb` (queued since 07:14 UTC, no runner assigned) and the canonical battery has not run. CONFIRM here covers the bytes of `33b01efb`; the merge decision still needs green hosted checks at the head that carries this raw.
