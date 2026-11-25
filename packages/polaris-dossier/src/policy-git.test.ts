import { describe, expect, it } from 'vitest';
import { createPolicyGitScope, type PolicyGitReceipt, type PendingPolicyGit } from './policy-git.js';
const options = { env: {}, maxBuffer: 1024, timeout: 10_000 };
const completed = (result: PolicyGitReceipt): PendingPolicyGit => ({ completion: Promise.resolve(result), settleSync: () => result, close() {} });
const receipt = (user = 11, system = 7): PolicyGitReceipt => ({ stdout: Buffer.from('checked'), reason: 0, status: 0, signal: 0,
  userMicroseconds: user, systemMicroseconds: system, usageComplete: true });

describe('run-owned policy Git CPU scope', () => {
  it('charges completed children before success and retains known usage on Git failure', async () => {
    let host = 100, result = receipt();
    const scope = createPolicyGitScope({ runSync: () => result, runAsync: () => completed(result), close() {} }, () => host);
    expect(scope.runSync([], options).toString()).toBe('checked');
    expect(scope.initialSpent()).toBe(18);
    host += 5;
    expect(scope.cpuClock()).toBe(123);
    result = { ...receipt(3, 2), reason: 8, status: 23 };
    await expect(scope.runAsync([], options)).rejects.toThrow('policy-git-failed');
    expect(scope.childCpuMicroseconds()).toBe(23);
    expect(scope.healthy()).toBe(true);
  });
  it('permanently poisons unknown, invalid and overflowing usage before releasing output', () => {
    for (const bad of [{ ...receipt(), usageComplete: false }, receipt(-1), receipt(Number.MAX_SAFE_INTEGER), receipt(Number.NaN)]) {
      const scope = createPolicyGitScope({ runSync: () => bad, runAsync: () => completed(bad), close() {} });
      expect(() => scope.runSync([], options)).toThrow('policy-git-usage-unavailable');
      expect(() => scope.childCpuMicroseconds()).toThrow('policy-git-usage-unavailable');
      expect(() => scope.runSync([], options)).toThrow('policy-git-unavailable');
    }
  });
  it('refuses an active handoff and drains owned work before close without dropping its final charge', async () => {
    let resolve!: (result: PolicyGitReceipt) => void, closed = false;
    const scope = createPolicyGitScope({ runSync: () => receipt(),
      runAsync: () => ({ completion: new Promise<PolicyGitReceipt>(done => { resolve = done; }), settleSync: () => receipt(31, 13), close() {} }), close() { closed = true; } });
    const pending = scope.runAsync([], options);
    expect(() => scope.initialSpent()).toThrow('policy-git-not-idle');
    const closing = scope.close();
    expect(closed).toBe(false);
    expect(() => scope.runAsync([], options)).toThrow('policy-git-unavailable');
    resolve(receipt(31, 13));
    await pending;
    expect(await closing).toBe(true);
    expect(closed).toBe(true);
    expect(scope.childCpuMicroseconds()).toBe(44);
  });
  it('retains per-call images through receipt accounting and releases them exactly once, poisoning cleanup failure', async () => {
    for (const cleanupFails of [false, true]) {
      let alive = true, closed = 0, resolve!: (value: PolicyGitReceipt) => void;
      const scope = createPolicyGitScope({ runSync: () => receipt(), runAsync: () => ({
        completion: new Promise<PolicyGitReceipt>(done => { resolve = done; }),
        settleSync: () => { if (!alive) throw new Error('owned images already closed'); return receipt(); },
        close: () => {
          expect(scope.childCpuMicroseconds()).toBe(18);
          expect(scope.cpuClock()).toBe(118); // No unsettled record may read a released descriptor.
          closed++; alive = false;
          if (cleanupFails) throw new Error('owned image close failed');
        },
      }), close() {} }, () => 100);
      const pending = scope.runAsync([], options);
      // Completion can be ready before its outer accounting microtask runs.
      resolve(receipt());
      expect(scope.cpuClock()).toBe(118);
      expect(alive).toBe(true);
      if (cleanupFails) await expect(pending).rejects.toThrow('owned image close failed');
      else expect((await pending).toString()).toBe('checked');
      expect(closed).toBe(1); expect(alive).toBe(false);
      expect(scope.healthy()).toBe(!cleanupFails);
      expect(await scope.close()).toBe(!cleanupFails);
      expect(closed).toBe(1);
    }
  });
  it('keeps concurrent completion charges and marks a transport failure unknown', async () => {
    let first!: (result: PolicyGitReceipt) => void;
    const scope = createPolicyGitScope({ runSync: () => receipt(), runAsync: () => ({ completion: new Promise<PolicyGitReceipt>(done => { first = done; }), settleSync: () => receipt(9, 1), close() {} }), close() {} });
    const pending = scope.runAsync([], options);
    const clock = scope.cpuClock();
    expect(Number.isSafeInteger(clock)).toBe(true);
    expect(scope.childCpuMicroseconds()).toBe(10);
    scope.cpuClock();
    expect(scope.childCpuMicroseconds()).toBe(10);
    scope.runSync([], options);
    first(receipt(9, 1)); await pending;
    expect(scope.initialSpent()).toBe(28);
    const failed = createPolicyGitScope({ runSync() { throw new Error('transport'); }, runAsync: () => completed(receipt()), close() {} });
    expect(() => failed.runSync([], options)).toThrow('transport');
    expect(failed.healthy()).toBe(false);
  });
});
