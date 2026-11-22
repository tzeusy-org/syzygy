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
  it('refreshes only missing future capacity once and keeps all prior charges spent', () => {
    let host = 0;
    const pool = createUrlRunCpuBudget(1000, () => host), held = pool.holdOrdered(800)!;
    held.chargeScreenCpuMicroseconds(100);
    pool.charge('machine', 50);
    host = 150;
    expect(held.remainingCpuMicroseconds()).toBe(550);
    expect(held.reserveRemainingOnce(650)).toBe(650);
    expect(pool.cpuMicroseconds()).toBe(300);
    expect(held.reserveRemainingOnce(650)).toBeNull();
    expect(held.remainingCpuMicroseconds()).toBe(650);
    // Exactly fifty unreserved units remain. The hold protects its full refresh.
    pool.charge('machine', 50);
    held.chargeScreenCpuMicroseconds(650);
    expect(pool.cpuMicroseconds()).toBe(1000);
    expect(held.remainingCpuMicroseconds()).toBe(0);
    expect(() => pool.charge('machine', 1)).toThrow();
  });
  it('refuses insufficient, invalid, released and stale continuation reservations', () => {
    for (const required of [701, 0, -1, 1.5, NaN, Infinity]) {
      let host = 0;
      const pool = createUrlRunCpuBudget(1000, () => host), held = pool.holdOrdered(800)!;
      host = 300;
      expect(held.reserveRemainingOnce(required)).toBeNull();
      expect(held.remainingCpuMicroseconds()).toBe(500);
      expect(pool.cpuMicroseconds()).toBe(300);
      expect(held.reserveRemainingOnce(600)).toBeNull();
    }
    const pool = createUrlRunCpuBudget(1000, () => 0), first = pool.holdOrdered(800)!;
    first.release();
    const second = pool.holdOrdered(900)!;
    expect(first.reserveRemainingOnce(950)).toBeNull();
    expect(second.reserveRemainingOnce(800)).toBe(900);
    second.release();
    expect(second.reserveRemainingOnce(900)).toBeNull();
    expect(pool.cpuMicroseconds()).toBe(0);
  });
  it('never takes capacity already spent by competing native work', () => {
    let host = 0;
    const pool = createUrlRunCpuBudget(1000, () => host), held = pool.holdOrdered(800)!;
    pool.charge('machine', 200);
    host = 100;
    expect(held.reserveRemainingOnce(701)).toBeNull();
    expect(held.remainingCpuMicroseconds()).toBe(700);
    expect(pool.cpuMicroseconds()).toBe(300);
  });
});
