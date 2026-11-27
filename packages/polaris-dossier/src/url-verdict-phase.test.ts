import { expect, it } from 'vitest';
import { timeOrderedVerdictPhase, type OrderedVerdictPhaseTimings } from './url-run-composed.testkit.js';

it('retains only fixed verdict phase timings on the issuing invocation and preserves results and errors', async () => {
  let now = 1, calls = 0, clockReads = 0;
  const clock = () => { clockReads++; return now; };
  const first: OrderedVerdictPhaseTimings = {}, second: OrderedVerdictPhaseTimings = {};
  const privateResult = Object.freeze({ body: 'OWN_PRIVATE_VERDICT_PHASE_BODY' });
  const marker = new Error('OWN_PRIVATE_VERDICT_PHASE_ERROR');
  const outside = Promise.resolve(privateResult);
  expect(timeOrderedVerdictPhase(undefined, 'reproduction', clock, () => { calls++; return outside; })).toBe(outside);
  expect(clockReads).toBe(0);
  let resolveFirst!: (value: typeof privateResult) => void, rejectSecond!: (cause: unknown) => void;
  const firstPromise = new Promise<typeof privateResult>(resolve => { resolveFirst = resolve; });
  const secondPromise = new Promise<never>((_resolve, reject) => { rejectSecond = reject; });
  expect(timeOrderedVerdictPhase(first, 'reproduction', clock, () => { calls++; return firstPromise; })).toBe(firstPromise);
  now = 2;
  expect(timeOrderedVerdictPhase(second, 'proof', clock, () => { calls++; return secondPromise; })).toBe(secondPromise);
  expect(first).toEqual({ reproduction: { startedMs: 1 } });
  expect(second).toEqual({ proof: { startedMs: 2 } });
  now = 3; rejectSecond(marker);
  await expect(secondPromise).rejects.toBe(marker);
  now = 4; resolveFirst(privateResult);
  expect(await firstPromise).toBe(privateResult);
  expect(first).toEqual({ reproduction: { startedMs: 1, settledMs: 4, outcome: 'returned' } });
  expect(second).toEqual({ proof: { startedMs: 2, settledMs: 3, outcome: 'rejected' } });
  now = 5;
  let caught: unknown;
  try { timeOrderedVerdictPhase(first, 'proof', clock, () => { calls++; throw marker; }); } catch (cause) { caught = cause; }
  expect(caught).toBe(marker);
  expect(first.proof).toEqual({ startedMs: 5, settledMs: 5, outcome: 'rejected' });
  now = 6;
  const refused = Promise.resolve(null);
  expect(timeOrderedVerdictPhase(first, 'staging', clock, () => { calls++; return refused; })).toBe(refused);
  expect(await refused).toBeNull();
  expect(first.staging).toEqual({ startedMs: 6, settledMs: 6, outcome: 'returned' });
  for (let index = 0; index < 40; index++) {
    now = 7;
    const replacement = Promise.resolve(privateResult);
    expect(timeOrderedVerdictPhase(first, 'staging', clock, () => { calls++; return replacement; })).toBe(replacement);
    await replacement;
  }
  expect(first).toEqual({
    reproduction: { startedMs: 1, settledMs: 4, outcome: 'returned' },
    proof: { startedMs: 5, settledMs: 5, outcome: 'rejected' },
    staging: { startedMs: 7, settledMs: 7, outcome: 'returned' },
  });
  expect(second).toEqual({ proof: { startedMs: 2, settledMs: 3, outcome: 'rejected' } });
  expect(calls).toBe(45);
  expect(clockReads).toBe(88);
  const retained = JSON.stringify({ first, second });
  for (const excluded of ['OWN_PRIVATE_VERDICT_PHASE_BODY', 'OWN_PRIVATE_VERDICT_PHASE_ERROR', 'body'])
    expect(retained).not.toContain(excluded);
});

