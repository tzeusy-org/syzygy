import { describe, expect, it, vi } from 'vitest';
import { checkUrlSessionCurrent, isCompletedUrlDesignExit } from './url-run-sessions.js';
import type { UrlSessionLaunchOutcome } from './session-launch.js';

const complete: UrlSessionLaunchOutcome = {
  outcome: 'exited', exitCode: 0, signal: null, viewTermination: 'view-exited', groupTermination: 'confirmed',
  toolTermination: 'settled', pendingInvocations: 0, stdout: { bytes: 0, sha256: 'a'.repeat(64) },
  stderr: { bytes: 0, sha256: 'a'.repeat(64) }, sampledStorageBytes: 0, peakProcesses: 1,
  aggregateEnforcement: 'sampled-stop-only', betweenSamples: 'Unknown',
};

describe('completed design launch health', () => {
  it('accepts only a successful exit with independently settled process and tool cleanup', () => {
    expect(isCompletedUrlDesignExit(complete)).toBe(true);
    const refused: (UrlSessionLaunchOutcome | 'Unknown')[] = [
      'Unknown', { ...complete, outcome: 'stopped' }, { ...complete, exitCode: 1 }, { ...complete, signal: 'SIGTERM' },
      { ...complete, viewTermination: 'Unknown' }, { ...complete, groupTermination: 'Unknown' },
      { ...complete, toolTermination: 'Unknown' }, { ...complete, pendingInvocations: 1 },
    ];
    for (const outcome of refused) expect(isCompletedUrlDesignExit(outcome), JSON.stringify(outcome)).toBe(false);
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

describe('current policy across completed design cleanup', () => {
  it('checks policy once and checks effect authority after each settlement', async () => {
    const current = vi.fn(async () => true), effectCurrent = vi.fn(() => true), changed = vi.fn();
    expect(await checkUrlSessionCurrent({ settleCompletedDesign: async () => 'current',
      effectCurrent, current, bindingChanged: changed })).toBe(true);
    expect(current).toHaveBeenCalledTimes(1);
    expect(effectCurrent).toHaveBeenCalledTimes(2);
    expect(changed).not.toHaveBeenCalled();
  });

  it.each([true, false])('rechecks policy after deferred child cleanup (policy remains current: %s)', async valid => {
    const finished = deferred<UrlSessionLaunchOutcome>(), cleanupBegan = deferred<void>();
    let healthy = true, policy = true, checks = 0;
    const current = vi.fn(async () => { if (++checks === 1) healthy = false; return policy; }), changed = vi.fn();
    const checking = checkUrlSessionCurrent({
      settleCompletedDesign: async () => {
        if (healthy) return 'current';
        cleanupBegan.resolve();
        const outcome = await finished.promise;
        healthy = true;
        return isCompletedUrlDesignExit(outcome) ? 'settled' : 'refused';
      },
      effectCurrent: () => healthy, current, bindingChanged: changed,
    });
    await cleanupBegan.promise;
    // The independent verifier already returned true; cleanup remains held.
    expect(current).toHaveBeenCalledTimes(1);
    policy = valid;
    finished.resolve(complete);
    expect(await checking).toBe(valid);
    expect(current).toHaveBeenCalledTimes(2);
    expect(changed).toHaveBeenCalledTimes(valid ? 0 : 1);
  });

  it('retains cheap authority checks after the final independent verifier await', async () => {
    let settlements = 0, checks = 0, authority = true;
    const changed = vi.fn();
    expect(await checkUrlSessionCurrent({
      settleCompletedDesign: async () => ++settlements === 1 ? 'current' : 'settled',
      current: async () => { if (++checks === 2) authority = false; return true; },
      effectCurrent: () => authority, bindingChanged: changed,
    })).toBe(false);
    expect(checks).toBe(2);
    expect(changed).not.toHaveBeenCalled();
  });
});
