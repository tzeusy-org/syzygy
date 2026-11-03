# R-GP-IMPL-UNIT-GUARD-LOCKS — CC-REV-1 implementation review of syzygy-93gz (unit-tier guard lock-site table, unrecorded defineProperty/spyOn, stated residuals), round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: e096f0a641132e659c98a02e4cca78772e273006
Subject: PR #670

Reviewer: fresh-context beads-pr-reviewer-worker (syzygy-qca4). Base `agent/syzygy-e8lv` at 5551af37 (PR #662, not on main); one commit on top, two files, +69 -3 (`vitest.unit-guard.setup.ts`, `apps/three-surface-poc/src/unit-tier-guard.test.ts`). Only that diff was reviewed.

## Method
- Scratch detached worktree at e096f0a6 under TMPDIR `/tmp/r670`, `npm ci` exit 0.
- Gates at that head: `npm run typecheck` exit 0; `npm test` (unit tier) 167 files, 3735 tests passed; `npm run test:tiers` exit 0, "ok: every test file is in exactly one tier" (unit 167, integration 88, e2e 24, live 3); `python3 scripts/check_governance.py` exit 0, 32 OK, 21 WARN, 0 FAIL. The known `restart.test.ts` flake (syzygy-exj7) did not occur.
- Base comparison: the same worktree with both changed files checked out from 5551af37 ran `npm test` 167 files, 3652 passed. Guard file alone: 34 tests at base, 117 at head; 3735 − 3652 = 83 = 117 − 34, matching the PR's "+83 ~0 -0".
- `gh pr checks 670`: "no checks reported" (stacked on a non-main base); mergeStateStatus CLEAN. The local battery above is the only run evidence.
- Rule-6 mutants (reviewer's own, `/tmp/r670/mut.py`, guard test file only, each restored after the run; tree clean afterwards):

| Id | Mutation | Result |
|---|---|---|
| M1 | dgram `bind/connect/send` lock → plain assignment | killed, 4 failed |
| M2 | `inspector`/`inspector/promises` `open` lock → plain assignment | killed, 3 failed |
| M3 | delete `sites.push([target, name])` in `lock` | killed, 1 failed |
| M4 | push an extra site `[process, 'kill']` that is not locked | killed, 1 failed |
| M5 | setup resolver regex drops `lookup` | killed, 7 failed |
| M6 | setter returns `undefined` instead of refusing | killed, 85 failed |
| M7 | `configurable: false` → `true` | killed, 11 failed |
| M8 | additionally lock `child_process.spawn` | killed, 3 failed |
| M9 | `worker_threads.Worker` lock → plain assignment | killed, 2 failed |
| M10 | drop `lookup` from both the setup and the test regex | killed, 2 failed (by the pre-existing behavioural rows) |
| M11 | drop the `_linkedBinding` lock and its `SITES` row together | killed, 1 failed (pre-existing behavioural row) |

- Doc-comment claims probed with a temporary `describe` appended to the guard file (removed after): `Reflect.set(childProcess, 'spawnSync', …)` throws "unit tier refuses reassignment" and records one attempt; `Object.defineProperties(childProcess, { spawnSync: … })` throws `TypeError` and records nothing; `Object.freeze(dns.promises)` succeeds and records nothing. 120 passed.

## Questions asked by the brief
- Are the lock sites complete? Yes, against the setup's own `install()`: every `lock(...)` call is in `SITES` (3 child_process sync exports, `ChildProcess.prototype.spawn`, `net.Socket.prototype.connect`, `net.Server.prototype.listen`, 3 dgram, the derived dns/dns.promises/Resolver families, 2 inspector `open`, `Worker`, `binding`, `_linkedBinding`, `dlopen`, conditional `execve`). The cross-check against `sites` (pushed inside `lock`) kills a site reverted to plain assignment, a site dropped, an extra site and a duplicate (length equality). The bead's E1 survivors (dgram, Worker, inspector.open) are now killed (M1, M2, M9).
- Are the residuals honest? Yes in substance: the E2 sentence is accurate (probed: defineProperty, defineProperties and spyOn throw a native TypeError and record nothing; Reflect.defineProperty returns false; Reflect.set is refused and recorded), and the test pins the refusal surviving each. E3 now names Reflect.defineProperty and the reassignable sibling exports. Exceptions N2 and N3 are about the precision of that wording and its pin.
- Is any previously-passing test newly refused? No. The setup change is bookkeeping (`sites.push`) plus one new global, `syzygyUnitTierGuardSites`, guarded like `syzygyUnitTierGuardTake`; base 3652 passed, head 3652 + 83 passed.
- Does any change alter what a gate accepts (GP-Q0)? No. The set of refused routes, the setter and the hooks are byte-identical apart from the `sites.push` line; only a caller of the new global from a non-guard file is refused, and no such caller existed before.

## Exceptions (notes; none changes the verdict)
- N1. The dns rows of `SITES` are not an explicit table: they are re-derived from the live module with a copy of the setup's own predicate (`/^(resolve|reverse|lookup)/` and the `typeof … === 'function'` filter). A change that narrows both copies together hides from the table and the cross-check; M10 was killed only by the pre-existing behavioural rows, not by the new table. The PR body's "explicit table of every lock site" overstates this family. A literal list of the dns names (or a floor per family) would close it.
- N2. "Pinned by a test" (PR body, E3): the sibling-exports test pins only `child_process.spawn`. `exec`, `execFile`, `fork` and `ChildProcess`, named in the same residual sentence, are not exercised, so locking one of them would not be seen by this test (M8 covers `spawn` only).
- N3. The residual sentence lists "the prototype chain" and "`Object.freeze` of an export object" among "sibling exports that reach no original … stay reassignable". Neither is an export: freeze is a further operation the guard does not refuse (probed: it succeeds, nothing recorded), and "the prototype chain" names no concrete route. The wording should say what each is.
- N4. `syzygyUnitTierGuardSites` returns the setup's internal `sites` array by reference, typed `readonly` only; the guard's own test could mutate the population it is checked against. Returning a copy costs nothing.
