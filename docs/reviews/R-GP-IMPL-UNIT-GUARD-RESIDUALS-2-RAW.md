# Review: PR 662 (syzygy-e8lv), unit-guard residuals, round 2
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 142d4e72a29892543672ad6e49b5f167798d21f8
Subject: PR #662 (round 2)

Reviewer: pr-reviewer worker for syzygy-jbpi, fresh context. Scratch detached worktree at the head, `npm ci`, node v24.6.0.
Scope: the CI repair since round 1 (`5551af37`), the guard rule, and the round-1 findings at the new head.

## The guard rule is unchanged [Observed]
- `git diff 5551af37 142d4e72 -- vitest.unit-guard.setup.ts` is one hunk: the new `lockedChildProcess` accessor and its entry in the `Object.assign(globalThis, ...)` line. `refuse`, `lock`, `install`, the RAW set, the isolation refusal and the hooks are byte-identical to the round-1 head. No GP-Q0 matter.
- The test diff removes the `childProcess` default import, drops the quoted key column from REASSIGN, and derives the key from the row name's last segment (`spawnSync`, `spawn`, `connect`, `lookup`, `binding`). The five rows still target the same objects and properties.

## The new global widens nothing [Observed]
- It returns the same `node:child_process` module any test may already import; its synchronous exports and `ChildProcess.prototype.spawn` are locked accessors, so the value reaches no original.
- The setup file is wired into the unit project only (`vitest.config.ts:38`), so the global does not exist in the integration or e2e tier.
- Probe (a unit-tier file outside the guard test, deleted afterwards) that calls `syzygyUnitTierGuardChildProcess()` and swallows the throw: the file fails with "unit tier refused syzygyUnitTierGuardChildProcess from ..." (the attempt is recorded, as for `syzygyUnitTierGuardTake`).

## Rule 6 (mutants run on the head, each reverted, tree clean afterwards) [Observed]
- M1 restore the round-1 test file (`git show 5551af37:<file>`): `sync-child-process-guard.test.ts` (integration project) fails, 1 failed / 9 passed, naming `unit-tier-guard.test.ts:77 <spawnSync re-bound>` and `<childProcess re-bound>`. At the head it passes 10/10. This is the hosted-CI failure, reproduced and killed by the fix.
- M2 setter silent (`set: () => undefined && refuse(...)`): killed, the 5 REASSIGN rows fail.
- M3 key derived from the first segment instead of the last: killed, the 5 REASSIGN rows fail (the derivation is load-bearing and pinned).
- M4 remove the reader restriction from `lockedChildProcess`: SURVIVED (34/34). See N1.

## Gates at 142d4e72 [Observed]
- `npm run typecheck`: exit 0.
- `npm test`: 167 files, 3655 tests passed, exit 0.
- `npm run test:integration`: 88 files, 2548 tests passed, exit 0 (the known `restart.test.ts` flake did not occur).
- `npm run test:tiers`: "ok: every test file is in exactly one tier".
- `python3 scripts/check_governance.py`: 32 OK, 21 WARN, 0 FAIL.
- Hosted CI at review time: `node (unit)`, `node (integration)`, `node (e2e)` SUCCESS; `checks` and `node` pending.

## Round-1 findings at the new head [Observed]
- The no-bypass result stands: the lock code is unchanged, so every round-1 probe outcome carries over.
- E1, E2 and E3 of round 1 stand unrepaired: the REASSIGN table still pins 5 lock sites (dgram, `Worker` and `inspector.open` reassignment remain unpinned), the doc comment still says reassigning, restoring or mocking "throws and is recorded" while `defineProperty` and `vi.spyOn` throw unrecorded, and the residual list still omits `Reflect.defineProperty` and the writable sibling exports. These are the exceptions of this verdict.

## Notes
- N1 [Observed]: the new accessor's reader restriction is pinned by no test (M4), unlike `syzygyUnitTierGuardTake`'s (`unit-tier-guard-file.test.ts`, `drained`). [Inferred] It carries no safety load: without it a test would obtain a module it can import anyway, whose locked routes still refuse.
- No revise-level finding.
