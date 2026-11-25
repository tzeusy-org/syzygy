export interface UrlOrderedCpuReservation {
  readonly cpuMicroseconds: number;
  readonly remainingCpuMicroseconds: number;
}

/** Shared supervisor CPU capacity. The clock can include measured policy-child
 * CPU; other native jobs charge their enforced full capacity before spawn.
 * The separately kernel-limited role CLIs are outside this population.
 * initialSpent carries known work completed before this clock's baseline;
 * subsequent clock deltas must include only newly completed work. */
export function createUrlRunCpuBudget(limit: number, cpuClock: () => number, initialSpent = 0) {
  if (!Number.isSafeInteger(limit) || limit <= 0
    || !Number.isSafeInteger(initialSpent) || initialSpent < 0 || initialSpent > limit) {
    throw new Error('url-run-cpu-budget-unavailable');
  }
  let previous = cpuClock(), spent = initialSpent, stopped = false;
  let active: { remaining: number; released: boolean } | null = null;
  const sample = (): boolean => {
    try {
      const next = cpuClock(), delta = next - previous;
      if (!Number.isSafeInteger(next) || !Number.isSafeInteger(delta) || delta < 0) stopped = true;
      else {
        previous = next; spent += delta;
        if (active !== null) active.remaining -= delta;
      }
      if (!Number.isSafeInteger(spent) || spent > limit || (active !== null && active.remaining < 0)) stopped = true;
    } catch { stopped = true; }
    return !stopped;
  };
  const charge = (role: string, capacity: number): void => {
    if (!sample() || !Number.isSafeInteger(capacity) || capacity <= 0
      || capacity > limit - spent - (role === 'design' ? 0 : active?.remaining ?? 0)
      || (role === 'design' && active !== null && capacity > active.remaining)) {
      stopped = true; throw new Error('url-run-cpu-budget-unavailable');
    }
    spent += capacity;
    if (role === 'design' && active !== null) active.remaining -= capacity;
  };
  return Object.freeze({ current: sample, charge,
    cpuMicroseconds: (): number => { sample(); return spent; },
    holdOrdered: (capacity: number) => {
      if (!sample() || active !== null || !Number.isSafeInteger(capacity) || capacity <= 0 || capacity > limit - spent) return null;
      const held = { remaining: capacity, released: false }; active = held;
      let continuationReserved = false;
      const current = (): boolean => sample() && active === held && !held.released;
      return Object.freeze({
        remainingCpuMicroseconds: (): number => current() ? held.remaining : 0,
        /** Refresh exactly once before the first continuation release. Previous
         * charges remain spent; only unused capacity in the original pool can
         * cover a missing future allowance. This grants no effect authority. */
        reserveRemainingOnce: (required: number): UrlOrderedCpuReservation | null => {
          if (!current() || continuationReserved) return null;
          continuationReserved = true;
          if (!Number.isSafeInteger(required) || required <= 0 || required > limit - spent) return null;
          held.remaining = Math.max(held.remaining, required);
          return Object.freeze({ cpuMicroseconds: spent, remainingCpuMicroseconds: held.remaining });
        },
        cpuMicroseconds: (): number => { sample(); return spent; },
        chargeScreenCpuMicroseconds: (value: number): void => {
          if (!current()) throw new Error('url-run-cpu-budget-unavailable');
          charge('design', value);
        },
        release: (): void => { if (held.released) return; sample(); held.released = true; if (active === held) active = null; },
      });
    },
  });
}
