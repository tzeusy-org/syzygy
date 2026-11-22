import { describe, expect, it, vi } from 'vitest';
import { checkUrlOrderedProductCurrent } from './url-run-ordered-attempt.js';

describe('bounded ordered product refresh', () => {
  it('checks an open product once and does not reproduce a still-current proof', async () => {
    const assertCurrent = vi.fn(), refresh = vi.fn(async () => true);
    expect(await checkUrlOrderedProductCurrent({ leaseOpen: () => true, assertCurrent, refresh })).toBe(true);
    expect(assertCurrent).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('refuses a changed proof that remains open without trying renewal', async () => {
    const refresh = vi.fn(async () => true);
    expect(await checkUrlOrderedProductCurrent({ leaseOpen: () => true,
      assertCurrent: () => { throw new Error('owned changed product'); }, refresh })).toBe(false);
    expect(refresh).not.toHaveBeenCalled();
  });

  it.each([true, false])('performs exactly one refresh when full validation crosses expiry: refreshed=%s', async refreshed => {
    let open = true;
    const refresh = vi.fn(async () => refreshed);
    expect(await checkUrlOrderedProductCurrent({ leaseOpen: () => open,
      assertCurrent: () => { open = false; throw new Error('owned product expired during full check'); }, refresh })).toBe(refreshed);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('never loops when fresh reproduction itself cannot validate', async () => {
    const refresh = vi.fn(async () => { throw new Error('owned reproduction failed'); });
    await expect(checkUrlOrderedProductCurrent({ leaseOpen: () => false, assertCurrent: () => {}, refresh })).rejects.toThrow('owned reproduction failed');
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
