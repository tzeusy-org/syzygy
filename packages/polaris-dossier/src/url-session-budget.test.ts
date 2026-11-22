import { describe, expect, it } from 'vitest';
import { createUrlSessionBudget, prepareUrlBudgetResume } from './url-session-budget.js';

const admission = { digest: 'a'.repeat(64), bytes: 100, classes: ['governance-text'] as const, originIds: ['own:fixture'] };
const usage = { inputTokens: 3, outputTokens: 5, cacheCreationInputTokens: 7, cacheReadInputTokens: 11 };
describe('shared URL host budget capture', () => {
  it('continues verified lifetime spend once, preserves Unknown counts and never renews the deadline or limits', () => {
    let now = 5;
    const limits = { deadline: 100, turnBudget: 4, tokenBudget: 80, now: () => now };
    const seed = { spend: { requestReservations: 2, completeUsageReports: 1, reportedTokens: 26 },
      deadline: 100, turnBudget: 4, tokenBudget: 80, observedAt: 5 };
    const resume = prepareUrlBudgetResume(seed)!;
    expect(resume).not.toBeNull();
    expect(() => createUrlSessionBudget({ ...limits, resume: { ...resume } })).toThrow('url-budget-resume-unavailable');
    expect(() => createUrlSessionBudget({ ...limits, deadline: 101, resume })).toThrow('url-budget-resume-unavailable');
    expect(() => createUrlSessionBudget({ ...limits, turnBudget: 5, resume })).toThrow('url-budget-resume-unavailable');
    const b = createUrlSessionBudget({ ...limits, resume });
    expect(() => createUrlSessionBudget({ ...limits, resume })).toThrow('url-budget-resume-unavailable');
    expect(b.snapshot()).toMatchObject({ requestReservations: 2, completeUsageReports: 1, reportedTokens: 26, pendingRoles: [], heldDesignTurns: 0 });
    expect(b.reserve('inventory', admission)).toBe(true); expect(b.observeUsage('inventory', usage)).toBe(true);
    expect(b.reserveCount('fidelity', admission)).toBe(true); expect(b.observeCount('fidelity')).toBe(true);
    expect(b.reserve('author', admission)).toBe(false);
    expect(b.snapshot()).toMatchObject({ requestReservations: 4, completeUsageReports: 2, reportedTokens: 52, reason: 'turn-budget' });
    const tokenSeed = prepareUrlBudgetResume({ ...seed, turnBudget: null, tokenBudget: 50 })!;
    const tokenBound = createUrlSessionBudget({ ...limits, turnBudget: null, tokenBudget: 50, resume: tokenSeed });
    expect(tokenBound.reserve('inventory', admission)).toBe(true); expect(tokenBound.observeUsage('inventory', usage)).toBe(false);
    expect(tokenBound.snapshot()).toMatchObject({ requestReservations: 3, completeUsageReports: 2, reportedTokens: 52, reason: 'token-budget' });
    const counts = prepareUrlBudgetResume({ ...seed, spend: { requestReservations: 2, completeUsageReports: 0, reportedTokens: 'Unknown' } })!;
    const c = createUrlSessionBudget({ ...limits, resume: counts });
    expect(c.snapshot().reportedTokens).toBe('Unknown');
    now = 100; expect(c.reserve('inventory', admission)).toBe(false); expect(c.snapshot().reason).toBe('deadline');
    const rollback = createUrlSessionBudget({ ...limits, now: () => 4, resume: prepareUrlBudgetResume(seed)! });
    expect(rollback.current()).toBe(false);
    for (const invalid of [
      { ...seed, spend: { ...seed.spend, requestReservations: 4 } },
      { ...seed, spend: { ...seed.spend, reportedTokens: 80 } },
      { ...seed, spend: { ...seed.spend, completeUsageReports: 3 } },
      { ...seed, spend: { ...seed.spend, completeUsageReports: 0 } },
      { ...seed, observedAt: 100 },
    ]) expect(prepareUrlBudgetResume(invalid)).toBeNull();
  });
  it('bounds a count exchange without recording its estimate as inference usage', () => {
    const plan = { deadline: 100, turnBudget: 2, tokenBudget: 100, now: () => 1 };
    const budget = createUrlSessionBudget(plan);
    expect(budget.reserveCount('design', admission)).toBe(false);
    expect(budget.reserveCount('author', admission)).toBe(true);
    expect(budget.observeCount('author')).toBe(true);
    expect(budget.snapshot()).toMatchObject({ requestReservations: 1, completeUsageReports: 0, reportedTokens: 'Unknown', pendingRoles: [] });
    expect(budget.reserve('author', admission)).toBe(true);
    expect(budget.observeUsage('author', usage)).toBe(true);
    expect(budget.reserveCount('inventory', admission)).toBe(false);
    expect(budget.snapshot()).toMatchObject({ requestReservations: 2, completeUsageReports: 1, reportedTokens: 26, reason: 'turn-budget' });
    const wrongResponse = createUrlSessionBudget(plan);
    expect(wrongResponse.reserveCount('author', admission)).toBe(true);
    expect(wrongResponse.observeUsage('author', usage)).toBe(false);
    const wrongRequest = createUrlSessionBudget(plan);
    expect(wrongRequest.reserve('author', admission)).toBe(true);
    expect(wrongRequest.observeCount('author')).toBe(false);
  });
  it('consumes reservations across roles before replies, keeps missing usage Unknown and enforces the shared turn boundary', () => {
    const budget = createUrlSessionBudget({ deadline: 100, turnBudget: 2, tokenBudget: null, now: () => 1 });
    expect(budget.snapshot()).toMatchObject({ requestReservations: 0, reportedTokens: 'Unknown', uncapturedUsage: 'Unknown' });
    expect(budget.reserve('author', admission)).toBe(true); expect(budget.reserve('inventory', admission)).toBe(true);
    expect(budget.snapshot().pendingRoles).toEqual(['author', 'inventory']);
    expect(budget.observeUsage('author', usage)).toBe(true);
    expect(budget.snapshot()).toMatchObject({ reportedTokens: 26, requestReservations: 2, completeUsageReports: 1, pendingRoles: ['inventory'] });
    expect(budget.reserve('fidelity', admission)).toBe(false);
    expect(budget.snapshot()).toMatchObject({ state: 'stopped', reason: 'turn-budget', requestReservations: 2 });
    expect(budget.observeUsage('inventory', usage)).toBe(false);
    expect(budget.snapshot()).toMatchObject({ completeUsageReports: 2, reportedTokens: 52, pendingRoles: [] });
  });
  it('counts all four provider counters and stops on overspend, malformed, duplicate or unreserved reports', () => {
    const budget = createUrlSessionBudget({ deadline: 100, turnBudget: null, tokenBudget: 25, now: () => 1 });
    expect(budget.reserve('author', admission)).toBe(true); expect(budget.observeUsage('author', usage)).toBe(false);
    expect(budget.snapshot()).toMatchObject({ reason: 'token-budget', reportedTokens: 26, completeUsageReports: 1 });
    for (const invalid of [null, { ...usage, extra: 1 }, { ...usage, inputTokens: -1 }, { ...usage, outputTokens: 1.5 },
      { ...usage, cacheReadInputTokens: Number.MAX_SAFE_INTEGER }]) {
      const b = createUrlSessionBudget({ deadline: 100, turnBudget: 10, tokenBudget: 100, now: () => 1 });
      expect(b.reserve('author', admission)).toBe(true);
      expect(b.observeUsage('author', invalid as typeof usage)).toBe(false); expect(b.snapshot().reason).toBe('invalid-usage');
    }
    const duplicate = createUrlSessionBudget({ deadline: 100, turnBudget: 10, tokenBudget: null, now: () => 1 });
    expect(duplicate.observeUsage('author', usage)).toBe(false);
    const b = createUrlSessionBudget({ deadline: 100, turnBudget: 10, tokenBudget: null, now: () => 1 });
    b.reserve('author', admission); expect(b.observeUsage('author', usage)).toBe(true);
    expect(b.observeUsage('author', usage)).toBe(false); expect(b.snapshot().reason).toBe('invalid-usage');
  });
  it('stops uncertain attempts permanently, checks clock failures and never refunds a consumed slot', () => {
    let now = 1;
    const b = createUrlSessionBudget({ deadline: 100, turnBudget: 10, tokenBudget: null, now: () => now });
    b.reserve('author', admission); now = 100;
    expect(b.observeUsage('author', usage)).toBe(false);
    expect(b.snapshot()).toMatchObject({ reason: 'deadline', reportedTokens: 26, requestReservations: 1 });
    const unknown = createUrlSessionBudget({ deadline: 100, turnBudget: 10, tokenBudget: null, now: () => 1 });
    expect(unknown.reserve('author', admission)).toBe(true); expect(unknown.uncertainAttempt('author')).toBe(false);
    expect(unknown.reserve('inventory', admission)).toBe(false); expect(unknown.snapshot()).toMatchObject({ reason: 'usage-unavailable', requestReservations: 1, reportedTokens: 'Unknown' });
    const clock = createUrlSessionBudget({ deadline: 100, turnBudget: 10, tokenBudget: null, now: () => { throw new Error('own-clock'); } });
    expect(clock.reserve('author', admission)).toBe(false);
    expect(() => createUrlSessionBudget({ deadline: 100, turnBudget: null, tokenBudget: null, now: () => 1 })).toThrow();
  });
  it('holds the complete ordered path before consuming each turn and protects that capacity from other roles', () => {
    const b = createUrlSessionBudget({ deadline: 100, turnBudget: 6, tokenBudget: null, now: () => 1 });
    expect(b.reserve('design', admission)).toBe(true);
    expect(b.holdOrderedDesignTurns(4, 100)).toBeNull();
    expect(b.observeUsage('design', usage)).toBe(true);
    const held = b.holdOrderedDesignTurns(4, 100)!;
    expect(held.complete()).toBe(false);
    expect(b.reserve('author', admission)).toBe(true);
    expect(b.reserve('inventory', admission)).toBe(false);
    expect(b.reserve('design', admission)).toBe(false);
    expect(b.snapshot()).toMatchObject({ state: 'open', heldDesignTurns: 4, requestReservations: 2 });
    expect(b.observeUsage('author', usage)).toBe(true);
    for (let index = 0; index < 4; index++) {
      expect(held.canSend()).toBe(true);
      expect(held.reserve(admission)).toBe(true);
      expect(held.reserve(admission)).toBe(false);
      expect(b.reserve('inventory', admission)).toBe(false);
      expect(b.observeUsage('design', usage)).toBe(false);
      expect(held.observeUsage(usage)).toBe(true);
    }
    expect(held.canSend()).toBe(false);
    expect(held.complete()).toBe(true);
    expect(held.complete()).toBe(false);
    expect(b.holdOrderedDesignTurns(1, 100)).toBeNull();
    expect(b.snapshot()).toMatchObject({ state: 'stopped', reason: 'turn-budget', heldDesignTurns: 0, requestReservations: 6, reportedTokens: 156 });
  });
  it('starts a fresh repair round only after completion and never reactivates an old reservation', () => {
    const b = createUrlSessionBudget({ deadline: 100, turnBudget: 10, tokenBudget: 300, now: () => 1 });
    expect(b.reserve('design', admission)).toBe(true);
    expect(b.observeUsage('design', usage)).toBe(true);
    const first = b.holdOrderedDesignTurns(4, 90)!;
    expect(b.holdOrderedDesignTurns(4, 90)).toBeNull();
    for (let turn = 0; turn < 4; turn++) { expect(first.reserve(admission)).toBe(true); expect(first.observeUsage(usage)).toBe(true); }
    expect(first.complete()).toBe(true);
    expect(b.reserve('design', admission)).toBe(true);
    expect(first.current()).toBe(false);
    expect(b.observeUsage('design', usage)).toBe(true);
    const repair = b.holdOrderedDesignTurns(4, 90)!;
    expect(first.reserve(admission)).toBe(false);
    expect(first.observeUsage(usage)).toBe(false);
    expect(first.complete()).toBe(false);
    first.retire();
    expect(repair.current()).toBe(true);
    for (let turn = 0; turn < 4; turn++) { expect(repair.reserve(admission)).toBe(true); expect(repair.observeUsage(usage)).toBe(true); }
    expect(repair.complete()).toBe(true);
    expect(b.snapshot()).toMatchObject({ requestReservations: 10, completeUsageReports: 10, reportedTokens: 260, heldDesignTurns: 0 });
    expect(b.holdOrderedDesignTurns(4, 90)).toBeNull();
  });
  it('refuses a short budget before consuming a turn and cannot extend an expired or retired reservation', () => {
    let now = 5;
    const short = createUrlSessionBudget({ deadline: 100, turnBudget: 3, tokenBudget: null, now: () => now });
    expect(short.holdOrderedDesignTurns(4, 100)).toBeNull();
    expect(short.snapshot()).toMatchObject({ reason: 'turn-budget', heldDesignTurns: 0, requestReservations: 0 });
    const b = createUrlSessionBudget({ deadline: 100, turnBudget: 5, tokenBudget: null, now: () => now });
    expect(b.holdOrderedDesignTurns(4, 101)).toBeNull();
    const held = b.holdOrderedDesignTurns(4, 12)!;
    expect(held.reserve(admission)).toBe(true);
    now = 12;
    expect(held.observeUsage(usage)).toBe(false);
    now = 11;
    expect(held.canSend()).toBe(false);
    held.retire();
    expect(b.holdOrderedDesignTurns(4, 100)).toBeNull();
    expect(b.snapshot()).toMatchObject({ reason: 'deadline', heldDesignTurns: 0, requestReservations: 1, reportedTokens: 26 });
  });
  it('charges measured usage and refuses the next effect at the token cutoff', () => {
    const b = createUrlSessionBudget({ deadline: 100, turnBudget: null, tokenBudget: 26, now: () => 1 });
    const held = b.holdOrderedDesignTurns(4, 100)!;
    expect(held.reserve(admission)).toBe(true);
    expect(held.observeUsage(usage)).toBe(true);
    expect(held.canSend()).toBe(false);
    held.retire();
    expect(b.snapshot()).toMatchObject({ reason: 'token-budget', heldDesignTurns: 0, requestReservations: 1, reportedTokens: 26 });
  });
});
