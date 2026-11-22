import { describe, expect, it } from 'vitest';
import { createUrlRunCpuBudget } from './url-run-cpu-budget.js';

describe('shared URL supervisor CPU capacity', () => {
  it('holds the whole design allowance against competing native work and accounts actual host CPU', () => {
    let host = 100;
    const pool = createUrlRunCpuBudget(1000, () => host);
    const held = pool.holdOrdered(800)!;
    expect(pool.holdOrdered(1)).toBeNull();
    pool.charge('author', 200);
    host += 50;
    expect(held.remainingCpuMicroseconds()).toBe(750);
    held.chargeScreenCpuMicroseconds(600);
    expect(held.cpuMicroseconds()).toBe(850);
    expect(held.remainingCpuMicroseconds()).toBe(150);
    expect(() => pool.charge('inventory', 1)).toThrow();
    expect(pool.current()).toBe(false);
  });
  it('releases only unspent capacity and never revives a prior handle', () => {
    const pool = createUrlRunCpuBudget(1000, () => 100);
    const first = pool.holdOrdered(800)!;
    first.chargeScreenCpuMicroseconds(100); first.release();
    const second = pool.holdOrdered(900)!;
    expect(first.remainingCpuMicroseconds()).toBe(0);
    expect(() => first.chargeScreenCpuMicroseconds(1)).toThrow();
    first.release();
    expect(second.remainingCpuMicroseconds()).toBe(900);
    second.chargeScreenCpuMicroseconds(900);
    expect(pool.cpuMicroseconds()).toBe(1000);
  });
  it('refuses clock rollback and a native charge before starting work past the selected capacity', () => {
    let host = 10;
    const rollback = createUrlRunCpuBudget(100, () => host);
    host = 9;
    expect(rollback.current()).toBe(false);
    const pool = createUrlRunCpuBudget(100, () => 10);
    expect(() => pool.charge('author', 101)).toThrow();
    expect(pool.cpuMicroseconds()).toBe(0);
  });
});
