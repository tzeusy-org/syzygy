import type { AdmissionRecord } from './admission-record.js';

// Which admission records are in force at an instant: one rule set for the consent ports, which grant
// by it, and the package reader, which reports by it. It imports no core module, so a module the
// `syzygy` CLI reaches may use it without reaching the parked provider island (syzygy-bpyt.8.19).

export const ref = (r: AdmissionRecord): string => `${r.recordId}@${r.version}`;

export type Dead = 'withdrawn' | 'future-dated' | 'not-in-force' | 'ambiguous-records';

/** Records that are plainly effective at `now`, plus why each other record is dead.
 * Candidate, future-dated, withdrawn and superseded records never count; two
 * records claiming the same id and version with different bytes void both. */
export function effective(records: readonly AdmissionRecord[], now: number): { readonly live: AdmissionRecord[]; readonly dead: ReadonlyMap<AdmissionRecord, Dead> } {
  const byRef = new Map<string, AdmissionRecord[]>();
  for (const r of records) byRef.set(ref(r), [...(byRef.get(ref(r)) ?? []), r]);
  const ambiguous = new Set([...byRef].filter(([, list]) => new Set(list.map(r => r.digest)).size > 1).map(([key]) => key));
  const dead = new Map<AdmissionRecord, Dead>();
  const live = records.filter(r => {
    const why: Dead | null = ambiguous.has(ref(r)) ? 'ambiguous-records'
      : r.withdrawnAt !== null ? 'withdrawn'            // dated or not: withdrawal defeats grant
      : r.inForceAt === null ? 'not-in-force'
      : r.inForceAt > now ? 'future-dated' : null;
    if (why !== null) dead.set(r, why);
    return why === null;
  });
  // A successor that took effect replaces its predecessor for good, whether the successor is later withdrawn or is itself ambiguous
  // (two byte-different claims of one id and version): neither leaves the old version standing.
  const replaced = new Set(records.flatMap(r => r.supersedes === null || r.supersessionAt === null || r.supersessionAt > now ? [] : [r.supersedes]));
  return { live: live.filter(r => !replaced.has(ref(r))), dead };
}

/** The records that are plainly in force at `now` (same polarity as the ports). */
export function inForceRecords(records: readonly AdmissionRecord[], now: number): readonly AdmissionRecord[] {
  return effective(records, now).live;
}

export type NotInForce = Dead | 'superseded';

/** Why each record that is not in force at `now` is not, by the same rules as `inForceRecords`: for reporting only, never a grant. */
export function notInForceRecords(records: readonly AdmissionRecord[], now: number): ReadonlyMap<AdmissionRecord, NotInForce> {
  const { live, dead } = effective(records, now);
  const out = new Map<AdmissionRecord, NotInForce>(dead);
  const kept = new Set(live);
  for (const r of records) if (!kept.has(r) && !out.has(r)) out.set(r, 'superseded');
  return out;
}
