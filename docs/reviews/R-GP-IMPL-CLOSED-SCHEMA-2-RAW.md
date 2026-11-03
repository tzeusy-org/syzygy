# R-GP-IMPL-CLOSED-SCHEMA-2 — CC-REV-1 confirmation review of syzygy-bpyt.8.5 (one closed-schema builder and checker, PR #597), round 2
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 25185e1602a720fd7427e0999a2692a7272fb9e3
Subject: pr597.diff (git diff 08f2287d5b9424c549250088690c5abe3da4c357 25185e1602a720fd7427e0999a2692a7272fb9e3) sha256 eea263f29e0515251f045efb6fd8ab11dfa260d77e42a841e61d68a929248324

Reviewer: fresh-context PR reviewer (Claude Opus 5.5, review bead `syzygy-wygp`), 2026-11-03. I did not write this
change and did not write round 1. Exact head `25185e16`, PR base `08f2287d` (the merge base with `origin/main`). I read
no body of Butlers or of any observed repository; every input below is synthetic or the repository's own source.

Reviewed against: round 1 (`docs/reviews/R-GP-IMPL-CLOSED-SCHEMA-1-RAW.md` on branch `agent/syzygy-gd0g`, PR #600,
verdict REVISE over `fe3f808b`); GP-Q0 of `.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`
as the bead states it (behavior-preserving; no change to what a gate accepts or refuses or the reason it reports);
AGENTS.md verification rules 4, 6, 9 and 11; the PR body and `docs/evidence/syzygy-bpyt-8-5/schema-dedup-2026-11-03.json`
at the head. This is the confirmation round under the stopping rule; round-1 holds are not re-opened.

## Summary

F1 is repaired and the repair restores the base behavior exactly: in `check` mode each `oneOf` arm runs under
`try { … } catch { continue; }`, the same swallow as the base's `try { check(candidate, value); return; } catch {}`, and
`checkShape` walks every arm again as the base `checkDraftShape` did. The golden reproduces byte-identical at base and
head on my machine (`a4eea846…`, the record's figure), with the extended corpus. A 15-case probe across all four callers
gives identical output at base and head. The five notes are dispositioned as claimed. The repair introduced no reason
change against base that I could find. One new note: the `continue` in the restored catch is not pinned (`break`
survives), but on today's production schemas the two are indistinguishable.

## Round-1 findings

- F1 (revise) — repaired, confirmed.
  - Head `closed-schema.ts`, `visit`, `oneOf` branch: when `walk.firstFailure`, each arm runs against a fresh
    `found` walk inside `try { visit(found, arm, value, at); } catch { continue; }`; a clean arm returns; otherwise
    `fail(walk, 'invalid-disposition', …)`. This equals the base `check`'s loop: an arm that throws or records a breach
    is a miss, and the code is `invalid-disposition`.
  - `checkShape` mode now maps every arm (`schema.oneOf.map`) before testing `attempts.some(… length === 0)`, as the
    base `checkDraftShape` did at `08f2287d:packages/polaris-dossier/src/draft-schema.ts:301`.
  - The round-1 reproduction cases now give `Error: invalid-disposition` at head (tests in `closed-schema.test.ts` and
    `provider-draft.test.ts`, and my probe below).
  - The `knownPreserved` text and the PR body now say the arm-throw is a miss inside a `oneOf` and escapes outside one,
    which matches the code and my probe (case c9).
- N1 — repaired. `closed-schema.test.ts` "refuses an array that carries a named key beside its items" asserts
  `invalid-array` and `$.ids must be an array`. The record lists mutant `keycount` killed; not re-run by me.
- N2 — repaired. The test "checkShape names no form for a proxy" makes the guard reachable (a proxy over
  `{ kind: 'a', n: 3 }`). Recorded mutant `discriminator-proxy-guard` killed; not re-run by me.
- N3 — dispositioned. `golden.how` now tells a re-runner to read `GOLDEN_OUT` and the Tests line, not the exit code. My
  runs confirm the reason: both exit 1 on `Error: [vitest-worker]: Timeout calling "onTaskUpdate"` after
  `Tests  1 passed (1)`. `edit` and `repair` stay emitted-only, as the disposition says.
- N4 — repaired. `text` and `handle` are `Object.freeze`d. A test pins both. Every importer spreads them
  (`{ ...text, enum }`) and none assigns to them, so the freeze throws nowhere; the emitted documents are unchanged
  (golden).
- N5 — repaired. `subject.commit` is `a589cb05`, an ancestor of the head. `git diff --stat a589cb05 25185e16` touches
  only the record itself. All nine `subject.files` digests equal the head's bytes (checked by script, 9 of 9 True).

## New findings

### N1 (note): the restored catch's `continue` is not pinned; `break` survives

Mutant `catch-break` on the head bytes of `closed-schema.ts` (sha256
`aff1c28f9d34d6df9797d89f675b70ad78f6b5bb2c466dc326ab27fa409389ec`):

- old: `try { visit(found, arm, value, at); } catch { continue; }`
- new: `try { visit(found, arm, value, at); } catch { break; }`

Outcome: survived, `Tests  259 passed (259)` on the record's seven-file command. With `break`, an arm that throws ends
the search, so a later arm that would pass is never tried; the base tried it. On today's production schemas the two
cannot be told apart [Inferred, by reading]. The only check-mode `oneOf`s are `draft-model.ts` `disposition` and
`rendered-design.ts` `relationshipDiagram`, from a sweep of `oneOf` over non-test sources of `polaris-generation-core`
and `polaris-dossier` (6 hits outside `closed-schema.ts`; the other 4 are `draft-schema.ts`, which `checkShape` walks).
In check mode the only arm throw is `new Set` on a plain-object-prototype array, at a `uniqueItems` position. Every
`disposition` arm puts `refs()` at that position, and `relationshipDiagram` has no array. So any arm that gets past
the field test to that position throws on the same value. A test-only follow-up, for example a synthetic
`{ oneOf: [refs(), list(handle, 1)] }`: base `check` accepts a plain-object-prototype array there, and `break` refuses
it. This does not block.

## Re-run evidence

- `npm ci` in three detached worktrees under `/tmp/r597b` (head `25185e16` twice, base `08f2287d`), exit 0 each.
- Golden. `docs/evidence/syzygy-bpyt-8-5/golden-capture.test.ts.txt` (sha256 `9fc7d5bd…`, equal to the record) was
  copied to `packages/polaris-dossier/src/zz-bpyt85-golden.test.ts` in each tree and run with `GOLDEN_OUT`
  (`--testTimeout=3000000`).
  - base `08f2287d`: sha256 `a4eea846e3d4eb70d81da0f9467ee88b7e7f2a48bbc5b8f03ca5756b5498ad55`, `Tests  1 passed (1)`, 560 s.
  - head `25185e16`: sha256 `a4eea846e3d4eb70d81da0f9467ee88b7e7f2a48bbc5b8f03ca5756b5498ad55`, `Tests  1 passed (1)`, 569 s.
  - Both exit 1 on the vitest RPC timeout, read past per rule 4.
  - Populations, counted from the head output: `documents 32, parameterRefusals 7, shape 126624, closed 34849,
    fixtures 4172`, equal to the record.
- Mutants, on the record's seven-file command, head bytes as above, each applied in place and restored (file sha256
  re-checked after):
  - baseline: `Tests  259 passed (259)`.
  - `drop-arm-catch` (record fragments): `Tests  2 failed | 257 passed (259)`, killed, as recorded.
  - `shape-first-arm-stop` (record fragments): `Tests  1 failed | 258 passed (259)`, killed, as recorded.
  - `check-code-fields`, mine: the check-mode miss code `'invalid-disposition'` → `'invalid-fields'`.
    `Tests  4 failed | 255 passed (259)`, killed.
  - `catch-break`, mine: survived (N1 above).
- Base-versus-head probe across the four callers. A vitest file, sha256
  `3d7243c1cf465a0560dc7f91c7259cd9f6586ef69fa505a87e8561b0a0d9646d`, was placed at
  `packages/polaris-dossier/src/zz-r597b-probe.test.ts` in the base and head trees and then removed. Its 15 output
  lines are identical at base and head (`diff` empty).
  - `check(disposition, …)` with a plain-object-prototype array under all three kinds, with `refs` first in value order,
    with `kind` last, with a duplicate, with an invalid item, empty, and with an unknown kind: all
    `Error: invalid-disposition`.
  - `validateStage('plan', …)` with that array under a disposition: `invalid-disposition`. With it at `sourceIds`
    (outside a `oneOf`): `TypeError`. `validateStage('inventory', …)` with it in a second entry's disposition:
    `invalid-disposition`.
  - `renderedDesignVerdict` with a proxied or array `diagram`: `Error: invalid-disposition`.
  - `checkDraftShape` on the inventory and draft schemas, with a bad entry, 60 bad sections beside a named-key array
    (over the error cap), and a top-level plain-object-prototype array: identical error lists.
- `npm run typecheck`: exit 0.
- Full suites of `packages/polaris-generation-core`, `packages/polaris-dossier` and `packages/polaris-generation-consent`
  at head: `Test Files  64 passed (64)`, `Tests  2795 passed | 1 skipped (2796)`. That is round 1's 2790 plus the 6
  tests this repair adds (5 in `closed-schema.test.ts`, 1 in `provider-draft.test.ts`).
- Registry-bound reader: `git diff --quiet 08f2287d 25185e16 -- packages/polaris-dossier/src/git-object-reader.ts`
  is clean, and its sha256 is `9f33e5fbbf464b1df28b79c3fcf5016b8ad7db1910041734c5fb8e4a790998f3`.
- Not re-run by me: the record's other 13 mutants, the sweeps (unchanged since round 1, whose reviewer re-derived
  them), and the clean-clone battery. The PR body says that battery is not re-run at this head.

## GP-Q0: reason changes the repair could introduce

The repair edits only the `oneOf` branch. In check mode, the branch's accept/refuse decision and its code are now
those of the base loop, because both swallow every arm exception and both emit one `invalid-disposition`. The head no
longer calls `discriminatorsMatch` in check mode, and that call never affected the check-mode code. In shape mode, the
branch is token-for-token the base's `checkDraftShape` `oneOf`. The one structural difference is that each arm's errors
are capped at 50 instead of being pushed uncapped and sliced, and the probe case s2 (over the cap) is identical. That
cap was settled in round 1. The 15-case probe and the 166,000-case golden found no difference. I found no new reason
change for `draft-schema.ts`, `provider-draft.ts`, `draft-model.ts` or `rendered-design.ts`.
