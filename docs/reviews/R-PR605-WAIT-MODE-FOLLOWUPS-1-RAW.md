# R-PR605-WAIT-MODE-FOLLOWUPS-1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 6ec969214e31768afb2cbc28f4fefffc4fd61f11
Subject: PR #605 (`agent/syzygy-syoj`, bead `syzygy-syoj`), wait-mode follow-ups from `R-PR408-WAITING-SESSIONS-3-RAW.md` and `-4-RAW.md`: seven files, diff `git diff origin/main...6ec96921` (merge base `bbbffb2f`; origin/main at review `6e4974aa`).

Reviewer context: fresh; read the PR body, the diff and the cited code only. Run in a clean worktree after `npm ci`.

## Bound-file check (the REVISE trigger)

[Observed] No edited file is bound. For each of the seven changed paths I hashed the base and head bytes and grepped every tracked file at origin/main for both digests and for the path, restricted to `.syzygy`, `openspec`, `contracts` and `scripts` for the path.
- `.claude/skills/polaris-dossier/SKILL.md`: 0 digest citers (either side), 0 path citers.
- `packages/polaris-dossier/src/{waiting-sessions.ts,session-handover.ts,render.ts,index.ts}` and `waiting-sessions.test.ts`, `apps/three-surface-poc/src/polaris-authority-sweep.test.ts`: the base-side digests are cited only by `docs/evidence/**` point-in-time records (mutation and digest-citer censuses); no performed act's manifest, no `FINAL-FOUNDATIONAL-CONTRACT-ACCEPTANCE-RECORD.md` row, no acceptance record names a digest of any of them. Path citers are candidate-package prose and `STATIC-TRACE.json` (a path list, not a digest).
- None of the signed v1.2 package files (`polaris-dossier-local-agent-mode-v1-2/**`) is in the diff; the PR keeps round-4 findings 2 and the packet half of finding 1 out for a successor, as it says.
- `.codex/skills/polaris-dossier/SKILL.md` is not edited and does not need the Claude qualifiers: it already says what a waiting Codex session runs without asking depends on the operator's Codex approval policy (lines 56-60).

## GP-Q0: does any gate accept or refuse differently

[Observed] No, beyond the named reason text.
- `waitModeStatus` returns `signed` on the first record at or after 1.2 for which `signoffRecordHolds` and `appliedSubjectHolds` both hold, which is the old `names.some(...)` condition; `waitModeSignedIn` is now `status === 'signed'`. `drifted` is reached only after a record passed `signoffRecordHolds` and no record's applied subject held. Every non-`signed` state refuses; the refusal `stage` stays `unsigned` at the three call sites (`startSessions`, `deliverReview`, `awaitSession`).
- An injected `waitModeSigned` keeps the unsigned reason (`waitModeRefusal`), pinned by the test.
- Gate mirroring `parse_head` (round-3 note 2) is correctly not done here.
- `DECISION_DECLARATION` narrows the authority sweep's declaration reader from `(?:$| )` to `(?:$| \()`. That is a test-support predicate, not a product gate. [Observed] The full sweep passes, so no existing declaration is lost. [Inferred] It can only make the sweep stricter (a declaration followed by other text no longer declares); a CRLF-ended file would not match either form, as before.

## Is the TOCTOU fix real

[Observed] For the session directory, yes. `resolveSessionDirectory` lstat/realpaths the root and the directory once and returns the real path; `deliverToWaiting` builds `roundDir` from `resolved.real`, and `awaitSession` takes `realDir` from the same resolution for `writeFromStdin` and for the submitted-file containment check. The residual (a real path is still a path; no `openat`) is named in the doc comment and is accurate.

## Exceptions

1. [Observed, medium-low] The await-side half of the fix is unpinned. Rule-6 mutant: in `awaitSession` replace `await writeFromStdin(realDir, role` with `await writeFromStdin(directory, role` (the lexical path). `waiting-sessions.test.ts` passes 124 of 124, so the mutant survives. The PR's five mutants cover resolve and delivery only; the "await takes its write directory from the same resolution" claim in the PR body has no test. Before the PR `realDir` came from a second `realOrNull(directory)`; after it, it comes from the checked resolution, and nothing distinguishes that from the lexical path. A swap-after-check test through the `readStdin` seam (as the delivery test does with `afterCheck`) would pin it.
2. [Observed, low] The delivery test proves less than its title. `deliverToWaiting` still writes `writePacket(run, ...)` and the delivery record under `path.join(run, RUN_LAYOUT.reviews, ...)` through the lexical `run`. In the test the link swap repoints the whole state root, so those two files land in the swapped tree (`elsewhere`) while the round directory lands in the real one; the test asserts only the round directory. This is pre-existing, outside round-3 note 1 (which concerned the sessions directory), and arguably the same F1 threat; the doc comment should say the run-level writes are not covered, or the test should assert where they go.
3. [Observed, low] `awaitSession` still reads through the lexical `directory` after the check: the inventory brief (`path.join(directory, INVENTORY_BRIEF_FILE)`, digest-checked against the recorded sha256), the round directory polling (`roundDir = path.join(directory, ...)`, `existsSync` of `delivery.json`), and the `read:` path it prints. These are reads, the brief is rehashed, and the PR text speaks of the write directory, so this is a disclosure gap in the doc comment, not a defect.
4. [Inferred, note] `WAIT_MODE_DRIFTED` lists causes (digest mismatch, missing or disagreeing review or version head) that `appliedSubjectHolds` collapses into one boolean; the text is a superset, not a claim of which one, and is acceptable.

## Mutants re-run at this head (rule 6)

Each applied with `sed` to `packages/polaris-dossier/src/waiting-sessions.ts`, run with `npx vitest run packages/polaris-dossier/src/waiting-sessions.test.ts`, then `git checkout` of the file.
- Delivery writes lexically (`resolved.real` to `directory` in `roundDir`): killed by "writes a delivery through the checked real path when an ancestor link is swapped after the check" (1 failed, 123 passed).
- Drifted reported as unsigned (`return recorded ? 'drifted' : 'unsigned'` to `return 'unsigned'`): killed by three tests (1 status test, 2 CLI refusal-reason cases; 3 failed).
- Resolve returns the lexical path (`real` to `directory`): killed by two tests (2 failed).
- Await writes from the lexical directory: survived (exception 1).

## Other checks

- `npx vitest run packages/polaris-dossier apps/three-surface-poc/src/polaris-authority-sweep.test.ts`: 35 files passed, 1433 passed, 1 skipped.
- `npx tsc --noEmit -p tsconfig.json`: exit 0.
- Codex note: the new text states the outcome depends on the operator's approval policy and says Syzygy has not read it; it does not assert that Codex asks. The SKILL.md qualifiers (settings-layer allow rules, heredoc hand-over Unknown) are labeled as limits, not claims. The `render.ts` change is a comment only.
- Net test delta stated in the body (+8 ~1 -0) is consistent with the diff.

## Verdict

CONFIRM WITH EXCEPTIONS: no bound or prepared-act file is touched, no gate accepts or refuses differently beyond the reason split, and the session-directory fix resolves once and writes through the checked path. The exceptions are one surviving mutant on the await write path (1) and two scoping notes (2, 3); none changes behaviour at this head.
