# Review: PR 662 (syzygy-e8lv), unit-guard residuals, round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 5551af37a1d29bceb2a7b826a08fb810313ed8c4
Subject: PR #662

Reviewer: pr-reviewer worker for syzygy-jbpi, fresh context. Scratch detached worktree at the head, `npm ci`, node v24.6.0, vitest 3.2.7.
Diff: `vitest.unit-guard.setup.ts` and `apps/three-surface-poc/src/unit-tier-guard.test.ts` only (62 insertions, 16 deletions); no existing test line is removed or edited.

## Gates [Observed]
- `npm run typecheck`: exit 0.
- `npm test` (unit project): 167 files, 3652 tests passed, exit 0 (the author's figure).
- `npm run test:tiers`: exit 0, "every test file is in exactly one tier".
- `python3 scripts/check_governance.py`: exit 0, 32 OK, 21 WARN, 0 FAIL.
- Hosted CI on the head at review time: `node (unit)` pass; `checks`, `node (e2e)`, `node (integration)` still pending.

## Bypass attempts on the accessor lock [Observed, probe file in the unit tier, deleted afterwards]
Caught (throws, route stays refused):
- Assignment through the CJS export, through the ESM namespace, `Reflect.set`, and calling the setter directly: throw, and each is recorded (the file fails even if swallowed).
- `Object.defineProperty` / `Object.defineProperties` on the CJS object or the namespace: TypeError "Cannot redefine property", NOT recorded.
- `vi.spyOn(cp,'spawnSync')`, with `'get'`, `vi.spyOn(net.Socket.prototype,'connect')`, `vi.spyOn(process,'binding')`: TypeError, NOT recorded.
- `createRequire`, `process.getBuiltinModule`, deleting `require.cache`, `Module._load`, bare dynamic `import('child_process')`: all return the one patched object; calls refused and recorded.
- `import('node:child_process?x=1')`: ERR_MODULE_NOT_FOUND; a builtin cannot be re-evaluated through a query string.
- Instance shadowing of `ChildProcess.prototype.spawn` by assignment: setter fires, recorded.
- `vm.runInNewContext`: the new context has no `require`.
- Indirect routes: `cluster.fork`, `http2.connect`, `tls.connect`, `net.createServer().listen`, `Worker` via `getBuiltinModule`, `process.execve`, `binding('pipe_wrap'|'tty_wrap')`: all refused and recorded.
Not caught, none a bypass of a refusal (the original function stays unreachable):
- `Reflect.defineProperty` returns `false` silently; nothing thrown or recorded.
- Sibling exports stay writable: `cp.spawn`, `cp.ChildProcess`, `Object.setPrototypeOf(ChildProcess.prototype, {})`, `Object.freeze(cp)`. These reach no original.
- `new tty.WriteStream(1)`, `new net.Socket({fd:1})`: construct objects; the setup states the fd-wrapping residual.
- `process.binding('fs')`, `'fs_event_wrap'`: allowed, stated.
Legitimate mocking: `vi.mock('node:fs', factory)`, `vi.mock('node:child_process', factory spreading importActual)`, `vi.spyOn(os,'hostname')`, `vi.spyOn(console,'log')`, fake timers, `vi.stubEnv`, `vi.stubGlobal('process', ...)`, `vi.restoreAllMocks()`: all pass; after `restoreAllMocks` the refusal still throws. No existing test needed a change.

## Rule 6 (mutants run on the head, each reverted) [Observed]
- M1 `configurable: true`: killed (5 failures).
- M2 setter silent (`set: () => undefined`): killed (5).
- M3 setter throws without recording: killed (5).
- M4 drop `tty_wrap` from the RAW set: killed (1, the tty_wrap row).
- M5 replace the `process.execve` lock with nothing: killed (the unrefused execve replaced the worker; run died with ERR_IPC_CHANNEL_CLOSED).
- M6 `dgram.Socket.prototype` back to plain assignment: SURVIVED (34/34).
- M7 `worker_threads.Worker` back to plain assignment: SURVIVED (34/34).
- M8 `inspector.open` and `inspectorPromises.open` back to plain assignment: SURVIVED (34/34).

## Exceptions
- E1 [Observed]: the REASSIGN table covers 5 of the lock sites (`spawnSync`, `ChildProcess.prototype.spawn`, `net.Socket.prototype.connect`, `dns.lookup`, `process.binding`). `lock` is one helper, so the risk is low, but dgram, `Worker`, `inspector.open`, `net.Server.listen`, `_linkedBinding`, `dlopen`, `execve` and the Resolver prototypes are not pinned as unreassignable (M6 to M8). The PR body's "every patched route" claim is true of the code and unpinned for most of them.
- E2 [Observed]: the doc comment and PR body say reassigning, restoring or mocking "throws and is recorded". Only plain assignment (and the direct setter call) is recorded. `Object.defineProperty` and `vi.spyOn` throw an unrecorded TypeError, so a test that swallows that throw does not fail its file. The refusal stays in place, so this is a wording gap, not a bypass.
- E3 [Observed]: the stated residual list omits that `Reflect.defineProperty` fails silently (returns false) and that the unpatched sibling exports (`cp.spawn`, `cp.ChildProcess`) remain reassignable.

## Notes
- N1 [Observed]: the 90 `docs/evidence` tool files are untouched; the PR body's test delta "+10 ~0 -0" matches the 5 added ROUTES rows and 5 REASSIGN rows.
- N2 [Inferred]: `fetch` refuses asynchronously (undici reaches `Socket.connect`); not observed to completion in the probe. Unchanged from the prior guard.
- No revise-level finding. The residual list otherwise matches what the probes reached.
