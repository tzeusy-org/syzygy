import { afterAll, beforeEach } from 'vitest';

// Vitest runs a file's tests back to back without yielding to the event
// loop, so a file of synchronous tests is one long macrotask. The worker
// answers its parent over an RPC whose calls time out after a fixed 60 s, and
// a reply can only be read when the loop turns: a file whose synchronous
// tests summed past 60 s under load failed the run with "Timeout calling
// onTaskUpdate" though every test passed (syzygy-w90k). One loop turn before
// each test lets pending replies land, so only a single test that blocks for
// 60 s can still starve the RPC; sync-child-process-guard.test.ts keeps long
// child processes out of that position.
// Every tier keeps the yield (syzygy-bpyt.4.3): the unit tier runs no child process, but one of its files runs 58 synchronous
// tests for 32 s on a loaded host, over half the bound.
beforeEach(() => new Promise<void>((resolve) => setImmediate(resolve)));

// Teardown for state a helper module builds once per test file (syzygy-jsyi).
// A helper also imported outside Vitest cannot call `afterAll` itself, and
// `process.on('exit')` never fires in a Vitest worker, so a helper registers
// here: everything registered runs once the file's tests have finished.
type FileTeardown = () => void | Promise<void>;
const afterTestFile: FileTeardown[] = [];
Object.assign(globalThis, { syzygyAfterTestFile: (teardown: FileTeardown) => { afterTestFile.push(teardown); } });
afterAll(async () => {
  // Drain the live stack: an awaited teardown may register another callback.
  while (afterTestFile.length > 0) await afterTestFile.pop()!();
});
