// Effect authority (N6 slices 1-2, bd syzygy-u05.6): the one typed
// answer to "may this POC perform this effect?". Pure and fail-closed:
// every arm that is not affirmatively authorized is a named refusal that
// carries its reason, and a foreclosure carries the owner ruling that
// foreclosed it.
//
// Order is load-bearing. A foreclosed effect is refused before the
// registry entry is consulted, because a foreclosure is lifted only by
// new owner acts, never by registry text alone (P-71-Q5: a future run
// needs a dated act naming the write, then a registry-entry amendment,
// then a fresh implementation authorization). Any other effect is
// authorized only when the registry entry's `writeSurface` names it.

/** An effect the POC can perform, named by the surface it writes. */
export interface Effect {
  readonly id: string;
  /** The write surface a registry entry must name to authorize it. */
  readonly surface: string;
}

/** The registry entry's typed write authority. `writeSurface` is read as
 * untrusted JSON: anything but an array of strings authorizes nothing. */
interface RegistryWriteAuthority {
  readonly writeSurface: unknown;
}

export interface Foreclosure {
  readonly citation: string;
  readonly ruling: string;
  readonly decisionPath: string;
}

export type EffectAuthorityVerdict =
  | { readonly authorized: true; readonly effect: string }
  | {
      readonly authorized: false;
      readonly effect: string;
      readonly refusedBy: 'foreclosed';
      readonly foreclosure: Foreclosure;
      readonly detail: string;
    }
  | {
      readonly authorized: false;
      readonly effect: string;
      readonly refusedBy: 'registry-unavailable' | 'write-surface-malformed' | 'not-in-write-surface';
      readonly detail: string;
    };

/** The Trajectory materialize action: `bd create` into the Butlers
 * repository's own tracker. */
export const BUTLERS_TRACKER_WRITE: Effect = {
  id: 'butlers-tracker-write',
  surface: 'butlers:.beads',
};

const P71_Q5_FORECLOSURE: Foreclosure = {
  citation: 'P-71-Q5',
  ruling:
    "Reading B: the return path's write into Butlers is foreclosed by the 2026-09-02 act; " +
    'no write into Butlers or any repository',
  decisionPath: '.syzygy/governance/decisions/POLARIS-PURSUIT-OWNER-RULINGS-P68-P83-DECISION.md',
};

/** Effects an owner ruling forecloses, keyed by effect id. */
const FORECLOSED_EFFECTS: ReadonlyMap<string, Foreclosure> = new Map([
  [BUTLERS_TRACKER_WRITE.id, P71_Q5_FORECLOSURE],
]);

export function effectAuthority(
  registryEntry: RegistryWriteAuthority | null,
  effect: Effect,
  foreclosed: ReadonlyMap<string, Foreclosure> = FORECLOSED_EFFECTS,
): EffectAuthorityVerdict {
  const foreclosure = foreclosed.get(effect.id);
  if (foreclosure !== undefined) {
    return {
      authorized: false,
      effect: effect.id,
      refusedBy: 'foreclosed',
      foreclosure,
      detail: `foreclosed by owner ruling ${foreclosure.citation}: ${foreclosure.ruling}`,
    };
  }
  if (registryEntry === null) {
    return {
      authorized: false,
      effect: effect.id,
      refusedBy: 'registry-unavailable',
      detail: 'no registry entry was supplied, so no write surface authorizes this effect',
    };
  }
  const surface = registryEntry.writeSurface;
  if (!Array.isArray(surface) || !surface.every((entry) => typeof entry === 'string')) {
    return {
      authorized: false,
      effect: effect.id,
      refusedBy: 'write-surface-malformed',
      detail: 'the registry write surface is not a list of strings',
    };
  }
  if (!surface.includes(effect.surface)) {
    return {
      authorized: false,
      effect: effect.id,
      refusedBy: 'not-in-write-surface',
      detail: `the registry write surface does not name ${effect.surface}`,
    };
  }
  return { authorized: true, effect: effect.id };
}

/** The materialize action's authority. The foreclosure is decided before
 * any registry entry is read, so the action passes none; were the
 * foreclosure lifted, a null entry would still refuse (fail-closed) until
 * the real entry is supplied. */
export function dispatchAuthorization(
  registryEntry: RegistryWriteAuthority | null = null,
): EffectAuthorityVerdict {
  return effectAuthority(registryEntry, BUTLERS_TRACKER_WRITE);
}
