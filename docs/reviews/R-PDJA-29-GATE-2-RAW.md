# R-PDJA-29-GATE-2 — sign-off gate moved to registry entry v1.1, implementation review, round 2
Reviewed commit: 3e1b215f
Subject: branch agent/syzygy-pdja-29-gate-v1-1
Verdict: CONFIRM WITH EXCEPTIONS

## What I ran

- Setup [Observed]
  - I fetched the branch. `FETCH_HEAD` = `3e1b215f978a52df2f43ffbc9c58e745ccd48f08`.
  - I created a detached worktree `/home/orca/.tmp/reviews/rvgate2` at 3e1b215f and ran `npm ci` (rc 0).
  - `TMPDIR=/home/orca/.tmp/reviews/tmpgate2` was set for every run.
  - `git diff --stat 58f890e8 3e1b215f`: 7 files, +366/−28.
    - The code changes are in `package-reader.ts`, `gate-acts.test.ts`, `index.ts` and `live.ts`.
    - The other files are the round-1 raw, the campaign file and the mutation record.
  - The earlier session stalled before its mutants. After the lead's wake-up I read every log in full. Each run had a complete log and an rc line, so none was re-run.
- Pinned SHA-256 [Observed]
  - `git show origin/main:.syzygy/governance/decisions/PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-SIGNOFF-v1.0.md | sha256sum` gives `f211248d1175087e9e4961caee2c52de249196a412f8f6f0dcd3de54c130ac45`.
  - The worktree file gives the same value.
  - It equals `LOCAL_AGENT_GIT_SOURCE_SIGNOFF_V1_0_RECORD_SHA256`.
  - The last commit to touch that path is `3409ef5a` (commit date 2026-10-08). The code comment says "recorded on 2026-10-07 (3409ef5a)", which is the record's own date.
- Branch head, no v1.1 record [Observed]
  - `npm run check`, rc 0: `Test Files  183 passed (183)` / `Tests  4306 passed | 1 skipped (4307)`.
  - `npm run test:integration`, rc 0: `Test Files  94 passed (94)` / `Tests  2844 passed | 4 skipped (2848)`.
  - `python3 scripts/check_governance.py`, rc 0: `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`.
  - `python3 scripts/check_docs_review_campaign_partition.py --check`, rc 0:
    - `second-method PASS: git ls-files=833; git ls-tree=833; exact path sets equal`
    - `partition PASS: denominator=833; assigned=833; raw=787; other=46; unmatched=0; overlaps=0; campaigns=151`
- Simulated sign-off in a throwaway clone of 3e1b215f under TMPDIR [Observed]
  - I ran the recorder with the brief's exact arguments (rc 0). It wrote:
    - `wrote .syzygy/governance/decisions/PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-SIGNOFF-v1.1.md`
    - `appended the public-git-source-acquisition-local-agent v1.1 block to .syzygy/governance/decisions/ACCEPTANCE-ACT-RECORD.md`
    - It also changed the installed entry JSON.
  - It printed one unrelated `SyntaxWarning` from `record_pwb_behavior_amendment_acts.py:70`.
  - I committed the result in the clone only (`28d3900a`). No tag was made.
  - `--check public-git-source-acquisition-local-agent --version 1.0`, rc 0: `recorded public-git-source-acquisition-local-agent v1.0 sign-off regenerates exactly; superseded by a later version`.
  - `--check public-git-source-acquisition-local-agent --version 1.1`, rc 0: `recorded public-git-source-acquisition-local-agent v1.1 sign-off regenerates exactly; applied tree verified`.
  - `npm run check`, rc 0: `Test Files  183 passed (183)` / `Tests  4306 passed | 1 skipped (4307)`.
  - `npm run test:integration`, rc 0: `Test Files  94 passed (94)` / `Tests  2844 passed | 4 skipped (2848)`.
  - `check_governance.py`, rc 0: `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`.
- Direct gate probes [Observed]
  - Method:
    - `vite-node` with the `source` condition, `now` = 2026-11-12T00:00:00Z.
    - `readVersionedSignoffState` with `LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM`.
    - Each case ran on a fresh copy of the clone's `.syzygy/`, which holds both records.
  - Outcomes:
    - P0, unmodified baseline → `ok public-git-source-acquisition-local-agent-v1.1`.
    - A, owner-selection slot "The owner withdraws …-v1.1" → `refused invalid-records`.
    - B, disposition slot "Withdrawn: …-v1.1" → `refused invalid-records`.
    - C, withdrawal line appended → `refused invalid-records`.
    - F, 64-hex token in the owner-selection slot → `refused invalid-records`.
    - G, verdict changed to CONFIRM → `refused invalid-records`.
    - N1, CRLF line endings → `refused invalid-records`.
    - N2, extra trailing newline → `refused invalid-records`.
    - N3, final newline removed → `refused invalid-records`.
    - N4, UTF-8 BOM prefix → `refused invalid-records`.
    - N5, trailing space on one line → `refused invalid-records`.
    - H, date slot changed (still a v1.0 template render) → `refused invalid-records`.
    - D, byte-identical copy named `NOTES-COPY.md` → refused, named by that file.
    - D2, byte-identical copy at `sub/PUBLIC-…-SIGNOFF-v1.0.md` → refused, named by the subdirectory path.
    - D3, copy at the `.MD` case variant → refused, named by that file.
    - S1, v1.0 path is a symlink to identical bytes outside `decisions/` → `ok`.
    - S2, `LINK.md` in decisions symlinked to the v1.0 record → refused, named by `LINK.md`.
    - S3, `X.md` symlinked to a withdrawal text outside decisions → refused, named by `X.md`.
    - W1, v1.1 withdrawal sentence in an unrelated decisions file → refused, named by that file.
    - W2, withdrawal-named file whose only content is `Act identity: …-v1.1` → refused, named by that file.
    - E, v1.0 record deleted → `ok`.
- Real-tree effect of the tightened Anthropic exemptions [Observed]
  - I ran `createPackageGateSources(...).providerStatements.statementsFor` for every `STATEMENT_FORMS` key, plus `registryEntry()`.
  - Two roots: the branch worktree (no v1.1) and the clone (with v1.1).
  - I ran it on the new source, then on the 58f890e8 sources of both packages checked out into the clone, then restored them.
  - The output was byte-identical across old and new code: sha256 `db0e2dd1…` both times.
    - redis-redis: one anthropic statement, `0.2.0-candidate.1`, not withdrawn, act `AGENT-PROVIDER-V2-REDIS-ANTHROPIC-2026-10-08`.
    - registryEntry: worktree `absent`, clone `ok`.
- Mutants (rule 6) on `package-reader.ts` in the worktree [Observed]
  - Command: `npx vitest run packages/polaris-dossier/src/gate-acts.test.ts packages/polaris-dossier/src/start-gates.test.ts packages/polaris-generation-consent/src/real-tree.test.ts`.
  - Unmutated baseline: `Tests  257 passed (257)`.
  - The file was restored byte for byte after each mutant. Restored sha `70056818…`, equal to the committed file and to the evidence record's `file_sha256_restored`.
  - M5 (recorded), pin byte comparison dropped:
    - old: `    if (pinned !== undefined) { if (sha256(text) !== pinned) refuse(); continue; }`
    - new: `    if (pinned !== undefined) { continue; }`
    - **Killed**, `5 failed | 252 passed`: the A, B, F, G and appended-withdrawal cases. Matches the record.
  - M1 (recorded), exempt slot sweep dropped:
    - old: `      if (namesAct(family.sweep, '', textForms(Object.values(fields).join('\n')))) {`
    - new: `      if (false) {`
    - **Killed**, `2 failed | 255 passed`: the two Anthropic "withdrawal … in its selection label" cases. Matches the record.
  - R1 (own), pin looked up by basename:
    - old: `    const pinned = family.pins?.get(rel);`
    - new: `    const pinned = family.pins?.get(path.basename(rel));`
    - **Survived**, `257 passed`. See Finding 2.
  - R2 (own), pin mismatch falls through to the sweep instead of refusing:
    - old: `    if (pinned !== undefined) { if (sha256(text) !== pinned) refuse(); continue; }`
    - new: `    if (pinned !== undefined && sha256(text) === pinned) continue;`
    - **Killed**, `5 failed | 252 passed`.
  - R3 (own), pin compared after CRLF→LF normalisation:
    - old: `if (sha256(text) !== pinned) refuse();`
    - new: `if (sha256(text.replace(/\r\n/g, '\n')) !== pinned) refuse();`
    - **Survived**, `257 passed`. See Finding 2.
  - `git status --short` in the worktree was empty afterwards.
- Cleanup [Observed]
  - Removed the worktree with `git worktree remove --force` and deleted TMPDIR, which held the clone, the probe roots and the logs.
  - Nothing tracked in the real repo was edited. The recorder never ran there.
  - No dossier run, no observed-repository body read, no provider call.

## Round-1 findings

- Finding 1 (revise) — **resolved** [Observed]
  - How the pin works:
    - `findActRecords` looks up `family.pins` by decisions-relative path before any exemption.
    - Any bytes there whose sha256 differs from the pin throw `invalid-records`, since `refuse` returns `never` and throws.
    - `readVersionedSignoffState` passes `pinnedRecords` as `pins` and no longer passes an exemption.
  - Probes A, B, F, G and C all refuse now, as do N1–N5 and H.
  - The pinned value is the sha of the v1.0 record on `origin/main`.
  - The Anthropic exemptions are tightened in `findActRecords`:
    - the slot values are swept with `namesAct(sweep, '', …)`;
    - an owner-selection slot holding a 64-hex token refuses.
  - The tightened "digest in the packet words" expectation is correct and fails closed:
    - The exempted record's selection slot now holds a token its own form refuses, so reading it past was the gap.
    - Version 1 now reads unbound as well as withdrawn.
    - The pair's gate stays `absent`, as before.
  - The tightening changes no real-tree outcome: the old and new statement and registry readings are byte-identical, shown above.
- Finding 2 (note) — **resolved** [Observed]
  - New tests in the `it.each` block put the recorded v1.0 bytes, and a fresh v1.0 rendering, at `…-SIGNOFF-v1.0-COPY.md`. Both expect a refusal named by the copy.
  - Probes D, D2, D3 and S2 agree.
  - Recorded M2 is killed by the Anthropic test. A sign-off-specific path test now exists as well.
- Finding 3 (note) — unchanged, still holds [Observed]
  - In the clone, the recorder's v1.1 record reads `ok`.
  - `--check` regenerates v1.0 and v1.1 exactly.
  - The tests still compare template renders against the Python recorder (`renderLocalAgentSignoffV10` / `renderLocalAgentSignoff`).
  - The rewritten render test builds its own v1.0 root rather than reading the record `world()` writes.
- Finding 4 (note) — unchanged [Inferred]
  - The repair touches none of its readers.
  - The v1.1 `--check` battery line, its workflow step and the count sentence still belong to the signing commit.
  - The campaign file says so.

## Findings

**Finding 1 — the repair holds fail-closed for every probe and both recorded mutants re-run as recorded** (note)

- [Observed] All 21 probes behave as intended.
  - Every byte change to the pinned file refuses, including CRLF, BOM, newline and whitespace variants.
  - Every copy outside the pinned path is swept.
  - Every symlinked or plain withdrawal elsewhere in `decisions/` refuses.
  - Two cases read `ok`:
    - S1, a symlink at the pinned path to identical bytes;
    - E, the v1.0 record deleted.
- [Inferred] Neither `ok` case lets other words in.
  - S1 is read through and compared by content, so only the pinned bytes pass.
  - E repeats round 1's probe E. Deleting a superseded record withdraws nothing.
- [Observed] A pin mismatch refuses with the bare `invalid-records` and no `namedBy`.
  - Copies elsewhere name the file.
  - Diagnostic only: the outcome is fail-closed either way.

**Finding 2 — two pin mutants survive, both only widening admission to content-identical bytes** (note)

- [Observed] R1 survives: the pin is looked up by `path.basename(rel)`.
  - No test puts the pinned bytes at a subdirectory path with the pinned basename.
  - Probe D2 shows the code refuses that case today.
- [Observed] R3 survives: the pin is compared after CRLF normalisation.
  - No test covers a CRLF variant.
  - Probe N1 shows it refuses today.
- [Inferred] Either regression would admit only text equal to the recorded record (a duplicate, or the same lines with CRLF), so neither could mask a withdrawal.
  - Two `it.each` rows would pin both: the D2 path and the N1 CRLF variant.

**Finding 3 — the mutation record names its base commit but not the test file it ran with** (note)

- [Observed] `gate-v1-1-r1-repair-mutation-2026-11-11.json` gives `commit_base` 58f890e8 and says it was "run against the uncommitted working tree".
  - It identifies the mutated file by `file_sha256_restored`.
  - That value equals `package-reader.ts` at 3e1b215f.
- [Observed] Its outcomes re-run identically at 3e1b215f, for M5 and M1.
- [Inferred] The kill outcomes also depend on `gate-acts.test.ts`, whose digest the record does not carry.
  - Rule 11 asks for the subject's digest.
  - Naming 3e1b215f as the commit the outcomes hold at, or adding the test file's sha, would make the record checkable on its own.
  - Not repaired in place if it is already cited. A successor record or an addendum would do.
