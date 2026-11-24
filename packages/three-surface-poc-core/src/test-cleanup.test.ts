import { describe, expect, it } from 'vitest';

import { removeFixtureDirectory } from './test-cleanup.testkit.js';

describe('fixture cleanup', () => {
  it('retries transient ENOTEMPTY failures and succeeds within the bound', () => {
    let attempts = 0;
    removeFixtureDirectory('/tmp/fixture', {
      remove: () => {
        attempts += 1;
        if (attempts < 3) throw Object.assign(new Error('directory still changing'), { code: 'ENOTEMPTY' });
      },
    });
    expect(attempts).toBe(3);
  });

  it('does not retry permanent cleanup failures beyond the bound', () => {
    let attempts = 0;
    expect(() => removeFixtureDirectory('/tmp/fixture', {
      maxAttempts: 2,
      remove: () => {
        attempts += 1;
        throw Object.assign(new Error('permission denied'), { code: 'EACCES' });
      },
    })).toThrow('permission denied');
    expect(attempts).toBe(1);
  });

  it('exhausts retryable cleanup failures at the exact total-call bound and preserves the original error', () => {
    let attempts = 0;
    const failure = Object.assign(new Error('directory remains busy'), { code: 'ENOTEMPTY' });
    expect(() => removeFixtureDirectory('/tmp/fixture', {
      maxAttempts: 2,
      remove: () => {
        attempts += 1;
        throw failure;
      },
    })).toThrow(failure);
    expect(attempts).toBe(2);
  });
});
