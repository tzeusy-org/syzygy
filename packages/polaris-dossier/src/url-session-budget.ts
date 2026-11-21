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
  readonly heldDesignTurns: number;
  readonly completeUsageReports: number;
  readonly pendingRoles: readonly ViewRole[];
  readonly reportedTokens: number | 'Unknown';
  readonly usageLabel: 'Inferred';
  readonly usagePopulation: 'normalized complete responses captured by checked host relays';
  readonly uncapturedUsage: 'Unknown';
  readonly tokenEnforcement: 'reported-response-boundary; in-flight usage Unknown';
}

export interface UrlOrderedDesignTurnReservation {
  readonly current: () => boolean;
  readonly canSend: () => boolean;
  readonly reserve: (admission: SessionAdmission) => boolean;
  readonly observeUsage: (usage: SessionResponseUsage) => boolean;
  readonly complete: () => boolean;
  readonly retire: () => void;
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
  let reason: UrlBudgetSnapshot['reason'] = null, requests = 0, responses = 0, tokens = 0, lastInstant = 0;
  let designState: 'available' | 'held' | 'complete' | 'retired' = 'available';
  let heldDesignTurns = 0;
  const pending = new Map<ViewRole, string>();
  const stop = (why: NonNullable<UrlBudgetSnapshot['reason']>): false => { reason ??= why; return false; };
  const current = (): boolean => {
    if (reason !== null) return false;
    try {
      const instant = now();
      if (!nonnegative(instant) || instant < lastInstant || instant >= deadline) return stop('deadline');
      lastInstant = instant;
    }
    catch { return stop('deadline'); }
    return true;
  };
  const tokenAvailable = (): boolean => tokenBudget === null || tokens < tokenBudget || stop('token-budget');
  const consume = (role: ViewRole, admission: SessionAdmission): boolean => {
    if (!ROLES.includes(role) || pending.has(role) || admission === null || typeof admission !== 'object'
      || typeof admission.digest !== 'string' || !/^[a-f0-9]{64}$/u.test(admission.digest)
      || !positive(admission.bytes) || admission.bytes > 2_097_152 || !Number.isSafeInteger(requests + 1))
      return stop('invalid-reservation');
    requests++;
    pending.set(role, admission.digest);
    return true;
  };
  const observeUsage = (role: ViewRole, usage: SessionResponseUsage): boolean => {
    if (!ROLES.includes(role) || !pending.has(role) || usage === null || typeof usage !== 'object'
      || Object.keys(usage).sort().join(',') !== 'cacheCreationInputTokens,cacheReadInputTokens,inputTokens,outputTokens'
      || !Object.values(usage).every(nonnegative)) return stop('invalid-usage');
    const reported = usage.inputTokens + usage.outputTokens + usage.cacheCreationInputTokens + usage.cacheReadInputTokens;
    if (!nonnegative(reported) || !nonnegative(tokens + reported)) return stop('invalid-usage');
    tokens += reported;
    responses++;
    pending.delete(role);
    // Retain actual usage captured at a late or over-budget response.
    if (tokenBudget !== null && tokens > tokenBudget) return stop('token-budget');
    return current();
  };
  const holdOrderedDesignTurns = (turns: number, expires: number): UrlOrderedDesignTurnReservation | null => {
    if (designState !== 'available' || !current() || !positive(turns) || !positive(expires)
      || expires > deadline || expires <= lastInstant || pending.has('design') || !tokenAvailable()
      || !Number.isSafeInteger(requests + turns)) return null;
    if (turnBudget !== null && requests + turns > turnBudget) {
      stop('turn-budget');
      return null;
    }
    designState = 'held';
    heldDesignTurns = turns;
    const reservationCurrent = (): boolean =>
      (designState === 'held' || designState === 'complete') && current() && lastInstant < expires;
    const canSend = (): boolean => designState === 'held' && heldDesignTurns > 0 && !pending.has('design')
      && reservationCurrent() && tokenAvailable();
    return Object.freeze({
      current: reservationCurrent,
      canSend,
      reserve: (admission: SessionAdmission): boolean => {
        if (!canSend() || !consume('design', admission)) return false;
        heldDesignTurns--;
        return true;
      },
      observeUsage: (usage: SessionResponseUsage): boolean =>
        (designState === 'held' || designState === 'retired') && observeUsage('design', usage) && reservationCurrent(),
      complete: (): boolean => {
        if (designState !== 'held' || heldDesignTurns !== 0 || pending.has('design') || !reservationCurrent()) return false;
        designState = 'complete';
        return true;
      },
      retire: (): void => {
        if (designState !== 'held') return;
        designState = 'retired';
        heldDesignTurns = 0;
        if (pending.has('design')) stop('usage-unavailable');
      },
    });
  };
  return Object.freeze({
    current,
    holdOrderedDesignTurns,
    reserve: (role: ViewRole, admission: SessionAdmission): boolean => {
      if (!current() || (role === 'design' && designState !== 'available')) return false;
      if (turnBudget !== null) {
        if (designState === 'held' && requests + heldDesignTurns >= turnBudget) return false;
        if (requests >= turnBudget) return stop('turn-budget');
      }
      if (!Number.isSafeInteger(requests + heldDesignTurns + 1)) return false;
      return tokenAvailable() && consume(role, admission);
    },
    observeUsage: (role: ViewRole, usage: SessionResponseUsage): boolean =>
      (role !== 'design' || designState === 'available') && observeUsage(role, usage),
    uncertainAttempt: (role: ViewRole): false => {
      if (!ROLES.includes(role)) return stop('invalid-reservation');
      return stop('usage-unavailable');
    },
    snapshot: (): UrlBudgetSnapshot => deepFreeze({ state: reason === null ? 'open' : 'stopped', reason,
      requestReservations: requests, heldDesignTurns, completeUsageReports: responses, pendingRoles: ROLES.filter(role => pending.has(role)),
      reportedTokens: responses === 0 ? 'Unknown' : tokens, usageLabel: 'Inferred',
      usagePopulation: 'normalized complete responses captured by checked host relays', uncapturedUsage: 'Unknown',
      tokenEnforcement: 'reported-response-boundary; in-flight usage Unknown' }),
  });
}
