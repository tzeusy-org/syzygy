# R-SCREENING-V8-INSTALL-1 — screening scope v8 record and install, PR #810, round 1
Reviewed commit: 5d583b2b2eac563611571e0e7a527a50748ec530
Subject: PR #810
Verdict: CONFIRM WITH EXCEPTIONS

Scope: the two commits on base `715c59c4` (`73716fc7` is the record, `5d583b2b` is the install). Read against the 2026-11-09 owner direction (part 3), the 2026-11-08 owner selection, the #807 post-record checklist and the #810 body. The review used a detached worktree with `npm ci` and `TMPDIR=/home/orca/.tmp/reviews/tmp810`. I edited nothing, ran no dossier, read no observed-repository body, made no provider call and created no tag. Both the worktree and the TMPDIR have been removed.

## Answers to the brief

1. **The act record is exact.** [Observed]
   - The quote line of `OWNER-SELECTION-SCREENING-SCOPE-V8-2026-11-08.md` is the only line starting `> `. Its text equals `b'Sign screening scope version 8, variant pv'` by byte comparison in Python (`True`), and it appears exactly once in the act record (line 57).
   - Reproduction: I cloned the PR, checked out `715c59c4` (the parent of `73716fc7`) and ran `--record 44153bbe… --date 2026-11-09 --owner-words 'Sign screening scope version 8, variant pv' --instant 2026-11-09T09:27:14Z`. After `git add -A`, `git diff --cached 73716fc7` was **0 lines**. That covers all three files: the act record, the aggregate section and the policy bytes.
   - The policy file hashes to `44153bbe210c7a724f224f2bc1c9255db43cf0887b6ad22dd24884514f21bbe8`, the manifest row.
   - The aggregate section names the v8 act path once (count 1).
   - No `*scope-v8*` tag exists in the clone.
   - `--check` passes; output under item 5.
2. **Each install edit follows from the checklist or from a stated necessity.** [Observed]
   - (a) **Dropping the v7 `--selftest` follows precedent.** The v7 record commit `bbc5f117` swapped both v6 lines, `--check` and `--selftest`, for the v7 pair. The v8 `--selftest` was already in the battery, so swapping the pair here is a net −1. The v7 selftest now refuses by design: `ValueError: the policy on disk is neither the version-6 variant-p bytes nor this package's row; the base is unknown`. CG-26 passes: `139 checks examined, 0 findings — 139 published, 139 hosted, 139 shared`. The "one hundred and thirty-nine" sentence matches.
   - (b) **Only `OWNER-DECISION-PACKET.md` gains the PERFORMED head.** The recorder freezes that packet at `df4e39a6…` once the head is stripped (`PACKET_REL`, `PERFORMED_HEAD_RE`, lines 148 and 262). The base packet bytes hash to exactly `df4e39a6cca5f4f4263a78c40b69c25282ae728bb891257fed3457e2e2c353c2`. No other package file or builder byte changed between `715c59c4` and `5d583b2b`. The v5, v6 and v7 package directories carry no PERFORMED head, so the PR body's correction of checklist item 6 holds.
   - (c) **Both `check_governance.py` repairs are pure moves or deletions.**
     - The v7 offering block moved verbatim from before `PWB_STATE1_SUBJECTS` to after it.
     - The removed v8 copy-registry block duplicates the one that stays at lines 3877–3897, which registers the same manifest under `PUBLIC_SOURCE_SCOPE_V2_LABEL`.
     - CG-7e reports `105 files examined, 0 findings`.
   - (d) **The test retargeting matches checklist items 2–5.**
     - Historical rebuilds now go `b8.base_bytes()` → assert `performed-v8` and `b8.propose(v7_s) == live` → reverse v7's patch → assert `b7.propose(v6_p) == v7_s`. Each step is asserted, so nothing is assumed.
     - Live-byte fixtures pass `'public'` explicitly.
   - (e) **The product change widens nothing.**
     - `screenLoaderOf` gains a trailing optional `visibilityOf` and forwards it to `loadDossierScreen`. When it is `undefined`, the default parameter `(placed) => pairVisibilityAt(placed, { root, now })` applies (`screen.ts:217`). `CensusDeps.visibilityOf` is likewise optional.
     - The production callers pass no decision, so all four reach `pairVisibilityAt`:
       - `render.ts:162`, `review-packet.ts:88` and `check.ts:193` call `screenLoaderOf` with three arguments;
       - `inventory.ts:176` passes `deps`, which has no `visibilityOf`.
     - No production caller defaults to public.
3. **No fail-closed rule is weakened.** [Observed] With `sourceVisibility` declared, an undecided pair stays private:
   - **No visibility given.** `buildDossierScreen` computes `given ?? (declared ? 'private' : 'public')` (`screen.ts:135`).
   - **No subject.** `loadDossierScreen` sets `private` (`screen.ts:232`).
   - **A failed decision** refuses the screen.
   - The tests that pin this:
     - `screen-scope-v8.test.ts:67`: "is what a version-8 screen built with no visibility gives: private, never the looser public";
     - `:98`: the screen is refused when a consent record cannot be read;
     - `:102`: "builds a screen for no subject as private";
     - `source-visibility.test.ts:61–67`: no record, mixed records, states-nothing and `private` all decide `private`;
     - `source-visibility-gate.test.ts:76`: a launch record answering not public decides `private`.
   - The `'public'` the tests inject is always explicit and never a default.
4. **No signed spec or policy byte changed outside the recorder's own apply.** [Observed] `git diff --name-only 715c59c4 5d583b2b` under `openspec/` and `.syzygy/` lists only:
   - the packet head (b);
   - the act record, the aggregate section and the policy JSON, all byte-equal to the recorder's output (1).
5. **Battery outputs:**
   - `python3 scripts/check_governance.py`: `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`, rc=0.
   - `record_public_source_screening_scope_v8_act.py --check 44153bbe210c7a724f224f2bc1c9255db43cf0887b6ad22dd24884514f21bbe8 --date 2026-11-09 --owner-words 'Sign screening scope version 8, variant pv'`: `recorded policy act matches the exact owner argument`, rc=0.
   - `… --selftest`: `selftest: 88 of 88 predicates held`, rc=0.
   - `npm run check`: `Test Files  183 passed (183)` and `Tests  4264 passed | 1 skipped (4265)`, rc=0.
   - Integration tier: `npx vitest run --project integration packages/polaris-dossier packages/polaris-generation-core packages/polaris-generation-consent packages/three-surface-poc-core apps/three-surface-poc` gives `Test Files  1 failed | 89 passed (90)` and `Tests  1 failed | 2768 passed | 4 skipped (2773)`, rc=1. The failure is pre-existing; see Finding 2.
   - `check_docs_review_campaign_partition.py --check`: `partition PASS: denominator=819; assigned=819; raw=774; other=45; unmatched=0; overlaps=0; campaigns=146`, rc=0.
   - `install_redis_sitting.py --selftest`: `selftest: 180 of 180 predicates held`, rc=0.
   - `gh pr checks 810`: `no checks reported on the 'agent/syzygy-pdja.21-v8-install' branch`. The PR is a draft, mergeable, on base `715c59c4`.

## Findings

**Finding 1 — PROJECT-STATUS.md gains no v8 row, and the v7 row is not marked superseded** (revise)
- [Observed] After the install, `PROJECT-STATUS.md` names `SCOPE-V8-ACT` 0 times and `SCOPE-V7-ACT` once, at line 244. That row reads "PERFORMED 2026-11-06 — a superseding state-(1) `approve-policy` act … with its install", with no mention that v8 superseded it on 2026-11-09.
- [Observed] Precedent: the v7 install commit `d62ae239` added that v7 row to `PROJECT-STATUS.md`. The v8 install adds no equivalent row.
- [Inferred] The status page, which owns "what state it is in", now gives no sign that private sources are admitted under version 8. CG-27 does not catch an omission, and the #807 checklist did not list it.
- Repair: add a dated v8 row naming the act record and its install. Mark the superseded v7 sentence at the sentence itself, not with a page banner.

**Finding 2 — An integration test fails on both head and base: a substring oracle matches "0 bytes" inside "25540 bytes"** (note)
- [Observed] Failing test: `packages/polaris-dossier/src/waiting-sessions.test.ts:1008`, "says Unknown, never zero, for an earlier round whose record states no size", which asserts `expected 'Round 2 packet: 25540 bytes (Observed…' not to contain '0 bytes'`.
- [Observed] The same failure, at the same 25540 bytes, reproduces at base `715c59c4` in a scratch clone after `npm ci`. It is not caused by this PR.
- [Inferred] The packet size depends on the environment, perhaps through a path length, so it passed in the author's run (whose 2769 passed equals my 2768 + 1). This is the copy-oracle substring trap described in AGENTS.md.
- Suggested follow-up: a bead to anchor the assertion, for example `/\b0 bytes/`.

**Finding 3 — The v7 act record is no longer checked by any battery line** (note)
- [Observed] With both v7 lines removed, nothing in the battery runs the v7 recorder's `--check`. The v6 lines were dropped the same way at v7 (`bbc5f117`), so this follows precedent.
- [Inferred] The v7 act record's bytes are still covered indirectly:
  - the v8 record names it as superseded;
  - `governance-inputs.ts` lists it in `PWB_SUPERSEDED_ACT_RECORDS`.

**Finding 4 — Hosted CI has not run on the head** (note)
- [Observed] `gh pr checks 810` reports no checks. Hosted checks are needed on this head before merge.
- [Inferred] This is consistent with the PR being a draft.

**Finding 5 — The v7 private-refusal pin is now skipped by design** (note)
- [Observed] `screen-scope-v8.test.ts`'s `describe.runIf(V7 !== null)` block skips once the v7 bytes are gone. This is the unit tier's 1 skip.
- [Observed] It is the behaviour #807 stated. The fail-closed pins that matter under v8 (item 3) run against the live bytes.
