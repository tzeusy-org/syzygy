import { deepFreeze } from '@syzygy/support';
import type { SessionAdmission } from './session-egress-policy.js';
import type { SessionResponseUsage } from './session-response.js';
import type { ViewRole } from './session-view.js';

const ROLES = ['author', 'inventory', 'fidelity', 'design'] as const;
const positive = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) > 0;
const nonnegative = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
export interface UrlBudgetSnapshot {
  readonly state: 'open' | 'stopped';
  readonly reason: 'deadline' | 'turn-budget' | 'token-budget' | 'invalid-usage' | 'usage-unavailable' | 'invalid-reservation' | null;
  /** Exactly this host's reservations, including attempts later refused. Never
   * a census of native CLI sends or proof that a provider received anything. */
  readonly requestReservations: number;
  readonly completeUsageReports: number;
  readonly pendingRoles: readonly ViewRole[];
  readonly reportedTokens: number | 'Unknown';
  readonly usageLabel: 'Inferred';
  readonly usagePopulation: 'normalized complete responses accepted by checked host relays';
  readonly uncapturedUsage: 'Unknown';
  readonly tokenEnforcement: 'reported-response-boundary; in-flight usage Unknown';
}

/** One synchronous shared ledger for four independently serialized role hosts.
 * Request reservations are consumed before audit/send, never rolled back after
 * an uncertain attempt. Provider-reported usage is a bounded capture, not a
 * pre-send token oracle or proof of uncaptured native usage. */
export function createUrlSessionBudget(input: {
  readonly deadline: number;
  readonly turnBudget: number | null;
  readonly tokenBudget: number | null;
  readonly now: () => number;
}) {
  const deadline = input.deadline, turnBudget = input.turnBudget, tokenBudget = input.tokenBudget, now = input.now;
  if (!positive(deadline) || (turnBudget !== null && !positive(turnBudget)) || (tokenBudget !== null && !positive(tokenBudget))
    || (turnBudget === null && tokenBudget === null) || typeof now !== 'function') throw new Error('url-budget-unavailable');
  let reason: UrlBudgetSnapshot['reason'] = null, requests = 0, responses = 0, tokens = 0;
  const pending = new Map<ViewRole, string>();
  const stop = (why: NonNullable<UrlBudgetSnapshot['reason']>): false => { reason ??= why; return false; };
  const current = (): boolean => {
    if (reason !== null) return false;
    try { const instant = now(); if (!nonnegative(instant) || instant >= deadline) return stop('deadline'); }
    catch { return stop('deadline'); }
    return true;
  };
  return Object.freeze({
    current,
    reserve: (role: ViewRole, admission: SessionAdmission): boolean => {
      if (!current()) return false;
      if (!ROLES.includes(role) || pending.has(role) || admission === null || typeof admission !== 'object'
        || typeof admission.digest !== 'string' || !/^[a-f0-9]{64}$/u.test(admission.digest)
        || !positive(admission.bytes) || admission.bytes > 2_097_152) return stop('invalid-reservation');
      if (turnBudget !== null && requests >= turnBudget) return stop('turn-budget');
      if (tokenBudget !== null && tokens >= tokenBudget) return stop('token-budget');
      if (!Number.isSafeInteger(requests + 1)) return stop('invalid-reservation');
      requests++; pending.set(role, admission.digest); return true;
    },
    observeUsage: (role: ViewRole, usage: SessionResponseUsage): boolean => {
      if (!ROLES.includes(role) || !pending.has(role) || usage === null || typeof usage !== 'object'
        || Object.keys(usage).sort().join(',') !== 'cacheCreationInputTokens,cacheReadInputTokens,inputTokens,outputTokens'
        || !Object.values(usage).every(nonnegative)) return stop('invalid-usage');
      const reported = usage.inputTokens + usage.outputTokens + usage.cacheCreationInputTokens + usage.cacheReadInputTokens;
      if (!nonnegative(reported) || !nonnegative(tokens + reported)) return stop('invalid-usage');
      tokens += reported; responses++; pending.delete(role);
      // Retain the actual captured report even when its late completion crosses
      // the deadline or exceeds the remaining reported budget.
      if (tokenBudget !== null && tokens > tokenBudget) return stop('token-budget');
      return current();
    },
    uncertainAttempt: (role: ViewRole): false => {
      if (!ROLES.includes(role)) return stop('invalid-reservation');
      return stop('usage-unavailable');
    },
    snapshot: (): UrlBudgetSnapshot => deepFreeze({ state: reason === null ? 'open' : 'stopped', reason,
      requestReservations: requests, completeUsageReports: responses, pendingRoles: ROLES.filter(role => pending.has(role)),
      reportedTokens: responses === 0 ? 'Unknown' : tokens, usageLabel: 'Inferred',
      usagePopulation: 'normalized complete responses accepted by checked host relays', uncapturedUsage: 'Unknown',
      tokenEnforcement: 'reported-response-boundary; in-flight usage Unknown' }),
  });
}
