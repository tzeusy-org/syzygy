// One evaluation-wide resource ledger: the 2026-09-05 registry entry's
// `resourceLimits`, `parsePassIdentities` and `resourceLimitSemantics`
// (registry amendment act) and PWB-REQ-006 as amended by the truth-and-
// readiness amendment act.
//
// The registry declares one deterministic envelope for the whole evaluation:
//
//   maxTotalBytes             "one cumulative counter across phase A and
//                              phase B; count each repository-relative-path
//                              plus object-id body once and never reset
//                              between phases";
//   maxParsePassesPerSource   "one unit is one complete traversal of one
//                              decoded source by a pass in
//                              parsePassIdentities; a helper traversal is
//                              charged to its named caller pass, repeating a
//                              pass counts again, and an unregistered
//                              traversal is forbidden; elapsed wall-clock
//                              time is not an input";
//   breachResult              "source and input breaches retain the complete
//                              population and make dependent facts Unknown".
//
// This module owns the counters. Every stage that reads a body or traverses
// a decoded source charges the same ledger before the work runs, so the
// limit plus one is never passed to a reader or an extractor. A pass is
// charged by its registry identity; a name outside the closed list throws,
// because an unregistered traversal is forbidden rather than tolerated.
//
// The ledger also keeps the validated phase-A seed bodies for the phase-B
// reader, so one (path, object id) body is taken from Git once, counted
// once and validated once; `release()` drops them once phase B has read.

import { PWB_INDEX_DEPTH } from './project-shape-manifest.js';
import type { PwbResourceLimits, ResourceLimitBreach } from './project-shape-observation.js';

export const PARSE_PASS_IDENTITIES = [
  'utf8-and-nul-validation',
  'secret-private-key-fragments',
  'secret-known-token-formats',
  'secret-credential-assignment',
  'secret-credential-bearing-url',
  'markdown-code-context-mask',
  'active-html-svg-script-handler',
  'unsafe-url-positions',
  'phase-a-link-discovery',
  'project-account-extraction',
  'declared-item-extraction',
  'fact-and-precedence-extraction',
] as const;
export type ParsePassIdentity = (typeof PARSE_PASS_IDENTITIES)[number];

// The policy's detector identities, each a registry pass of its own.
export const SECRET_DETECTOR_PASSES: Readonly<Record<string, ParsePassIdentity>> = {
  'private-key-material': 'secret-private-key-fragments',
  'known-token-formats': 'secret-known-token-formats',
  'credential-assignment': 'secret-credential-assignment',
  'credential-bearing-url': 'secret-credential-bearing-url',
};

// Thrown by a source's charge when the next pass would exceed
// maxParsePassesPerSource; the stage boundary turns it into an over-limit
// outcome for that one source. The traversal it guards never runs.
export class ParsePassBudgetExceeded extends Error {
  readonly breach: ResourceLimitBreach;
  readonly pass: ParsePassIdentity;
  constructor(breach: ResourceLimitBreach, pass: ParsePassIdentity) {
    super(`parse pass budget exceeded on ${breach.path ?? '?'} at ${pass}: ${breach.observed} > ${breach.declared}`);
    this.name = 'ParsePassBudgetExceeded';
    this.breach = breach;
    this.pass = pass;
  }
}

// Charges one named pass for one source; throws `ParsePassBudgetExceeded`
// when the budget is spent, or a plain Error for an unregistered name.
export type ParsePassCharge = (pass: ParsePassIdentity) => void;

interface TransientBody {
  readonly bytes: Uint8Array;
  readonly text: string;
}

// The registry's seven declared limits, in the order `PwbResourceLimits`
// names them — used only to iterate; it invents no eighth limit.
export const DECLARED_RESOURCE_LIMIT_IDENTITIES = [
  'maxSources',
  'maxBytesPerSource',
  'maxTotalBytes',
  'maxIndexDepth',
  'maxParsePassesPerSource',
  'maxHumanResponseBytes',
  'maxMachineResponseBytes',
] as const satisfies readonly (keyof PwbResourceLimits)[];

// A limit's usage is either genuinely known (a real number, possibly a
// true zero) or genuinely unmeasured — VIS-2: no evidence yields Unknown,
// never a silent, indistinguishable-from-real zero. A consumer that reads
// `.value` without checking `.state` cannot compile past the union.
export type ResourceLimitObservation =
  | { readonly state: 'observed'; readonly value: number }
  | { readonly state: 'unknown'; readonly reason: string };

// One limit's headroom: what the registry declares, what this ledger has
// observed toward it, and what is left — each an explicit
// `ResourceLimitObservation`, never a bare number that could be a real
// zero or a discarded Unknown wearing the same shape.
//
//   maxTotalBytes            this ledger's own running counter
//                            (`totalBytes()`).
//   maxParsePassesPerSource  this ledger's own running counter
//                            (`maxPassesOnOneSource`).
//   maxBytesPerSource        the ledger already stores every charged
//                            body's exact byte length in `bodies`; the
//                            largest one charged is the true observed
//                            value (`Math.max(0, ...bodies.values())`),
//                            raised further if a caller ever recorded a
//                            breach for a body larger than any charged
//                            one (a body over the limit is never
//                            counted into `bodies` at all).
//   maxSources               the full manifest source population
//                            (`manifest.sources.length`) — the same
//                            population `project-shape-observation.ts`
//                            itself compares against the declared limit
//                            to decide a breach — declared to this
//                            ledger once, unconditionally, by
//                            `declareSourcePopulation`; a manifest
//                            source the pipeline never traverses (e.g. a
//                            path-only `baseline-spec-tree` entry) is
//                            still a member of that population, so
//                            `sourcesTraversed` (this ledger's own count
//                            of sources charged at least one parse pass)
//                            is not used here — it silently undercounts
//                            whenever such a source is present. Raised
//                            further by any recorded breach carrying a
//                            higher count. Unknown only when neither the
//                            population was ever declared nor a breach
//                            was ever recorded.
//   maxIndexDepth            a fixed, always-known constant
//                            (`PWB_INDEX_DEPTH`) compared against the
//                            declared limit by the caller — real,
//                            static evidence, not a running count, but
//                            never Unknown.
//   maxHumanResponseBytes,   the final-response ceilings, enforced
//   maxMachineResponseBytes entirely outside this ledger by
//                            `apps/three-surface-poc/src/routes.ts`'s
//                            `boundedResponse`, which never charges a
//                            `ResourceLedger` — genuinely unmeasured
//                            here, so `state: 'unknown'`, never `0`.
//
// `remaining` mirrors `observed`'s state: `declared - value` when known
// (uncapped, so a breach shows as negative rather than clamped away),
// `unknown` with the same reason when `observed` is unknown.
export interface ResourceLimitUsage {
  readonly limit: keyof PwbResourceLimits;
  readonly declared: number;
  readonly observed: ResourceLimitObservation;
  readonly remaining: ResourceLimitObservation;
}

// Derived cost figures this pure ledger can answer without any new
// observation: bodies read and their bytes (maxTotalBytes' own counters),
// parse passes performed and the worst single source's count
// (maxParsePassesPerSource's own counters). Evaluation wall time, peak
// memory, the arrival date implied by the observed rate, and the
// generation-half figures (stage prompt bytes, corpus denominator) each
// need an input this ledger does not hold (a clock, process memory, the
// generation stage) and so are out of scope here — the registry itself
// says elapsed wall-clock time is not an input to this ledger.
export interface ResourceLedgerCostRecord {
  readonly bodiesRead: number;
  readonly bytes: number;
  readonly parsePasses: number;
  readonly worstSourcePasses: number;
}

export interface ResourceLedgerSummary {
  // Distinct (path, object id) bodies counted toward maxTotalBytes.
  readonly bodiesCounted: number;
  readonly totalBytes: number;
  readonly parsePasses: number;
  readonly passesByIdentity: Readonly<Record<ParsePassIdentity, number>>;
  readonly sourcesTraversed: number;
  readonly maxPassesOnOneSource: number;
  readonly breaches: readonly ResourceLimitBreach[];
  // Headroom against all seven declared limits and the derived cost
  // record; both are pure projections of the fields above plus `breaches`
  // — no new observation and no new limit.
  readonly byLimit: Readonly<Record<keyof PwbResourceLimits, ResourceLimitUsage>>;
  readonly cost: ResourceLedgerCostRecord;
}

export interface ResourceLedger {
  readonly limits: PwbResourceLimits;
  // Every breach recorded so far, in the order it occurred (both phases).
  readonly breaches: readonly ResourceLimitBreach[];
  recordBreach(breach: ResourceLimitBreach): void;

  // maxSources. The full manifest source population
  // (`manifest.sources.length`), declared once, unconditionally — whether
  // or not it exceeds the declared limit — by the observation pipeline
  // right after the manifest is derived. This is the same population
  // `project-shape-observation.ts` itself compares against the declared
  // limit for breach purposes, so `summary()` can report `maxSources`'
  // true usage even absent a breach, rather than substituting the smaller
  // count of sources this ledger separately charged a parse pass to (some
  // manifest sources are path-only and never traversed).
  declareSourcePopulation(count: number): void;

  // maxTotalBytes. `projectBody` evaluates a declared size before the body
  // is opened and records a breach without counting; `chargeBody` counts
  // the bytes actually taken, once per (path, object id). Both return the
  // breach when the cumulative total would be exceeded.
  projectBody(path: string, objectId: string, byteLength: number): ResourceLimitBreach | undefined;
  chargeBody(path: string, objectId: string, byteLength: number): ResourceLimitBreach | undefined;
  counted(path: string, objectId: string): boolean;
  totalBytes(): number;

  // maxParsePassesPerSource. Returns the breach (recorded) when this pass
  // would exceed the budget, counting nothing because the traversal never
  // runs; throws for an unregistered identity.
  chargePass(path: string, pass: ParsePassIdentity): ResourceLimitBreach | undefined;
  passesFor(path: string): number;
  // The throwing form one stage hands to its pass functions.
  chargeFor(path: string): ParsePassCharge;

  // Transient phase-A bodies for phase B.
  remember(path: string, objectId: string, body: TransientBody): void;
  recall(path: string, objectId: string): TransientBody | undefined;
  release(): void;

  summary(): ResourceLedgerSummary;
}

function bodyKey(path: string, objectId: string): string {
  return `${path} ${objectId}`;
}

export function isParsePassIdentity(value: string): value is ParsePassIdentity {
  return (PARSE_PASS_IDENTITIES as readonly string[]).includes(value);
}

export function createResourceLedger(limits: PwbResourceLimits): ResourceLedger {
  const breaches: ResourceLimitBreach[] = [];
  const bodies = new Map<string, number>();
  let total = 0;
  const passes = new Map<string, number>();
  const byIdentity = new Map<ParsePassIdentity, number>(PARSE_PASS_IDENTITIES.map((pass) => [pass, 0]));
  const transient = new Map<string, TransientBody>();
  // Undeclared until the observation pipeline calls `declareSourcePopulation`
  // — distinct from a declared population of 0, which is real evidence.
  let sourcePopulation: number | undefined;

  const recordBreach = (breach: ResourceLimitBreach): void => {
    breaches.push(breach);
  };

  const evaluateBody = (path: string, objectId: string, byteLength: number): ResourceLimitBreach | undefined => {
    if (bodies.has(bodyKey(path, objectId))) return undefined;
    const projected = total + byteLength;
    if (projected <= limits.maxTotalBytes) return undefined;
    const breach: ResourceLimitBreach = { limit: 'maxTotalBytes', declared: limits.maxTotalBytes, observed: projected, path };
    recordBreach(breach);
    return breach;
  };

  const chargePass = (path: string, pass: ParsePassIdentity): ResourceLimitBreach | undefined => {
    if (!isParsePassIdentity(pass)) {
      throw new Error(`unregistered parse pass ${JSON.stringify(pass)} on ${path}: an unregistered traversal is forbidden`);
    }
    const next = (passes.get(path) ?? 0) + 1;
    if (next > limits.maxParsePassesPerSource) {
      // The traversal never runs, so it is not counted as performed.
      const breach: ResourceLimitBreach = { limit: 'maxParsePassesPerSource', declared: limits.maxParsePassesPerSource, observed: next, path };
      recordBreach(breach);
      return breach;
    }
    passes.set(path, next);
    byIdentity.set(pass, (byIdentity.get(pass) ?? 0) + 1);
    return undefined;
  };

  return {
    limits,
    breaches,
    recordBreach,
    declareSourcePopulation: (count) => {
      sourcePopulation = count;
    },
    projectBody: evaluateBody,
    chargeBody: (path, objectId, byteLength) => {
      const breach = evaluateBody(path, objectId, byteLength);
      if (breach !== undefined) return breach;
      const key = bodyKey(path, objectId);
      if (bodies.has(key)) return undefined;
      bodies.set(key, byteLength);
      total += byteLength;
      return undefined;
    },
    counted: (path, objectId) => bodies.has(bodyKey(path, objectId)),
    totalBytes: () => total,
    chargePass,
    passesFor: (path) => passes.get(path) ?? 0,
    chargeFor: (path) => (pass) => {
      const breach = chargePass(path, pass);
      if (breach !== undefined) throw new ParsePassBudgetExceeded(breach, pass);
    },
    remember: (path, objectId, body) => {
      transient.set(bodyKey(path, objectId), body);
    },
    recall: (path, objectId) => transient.get(bodyKey(path, objectId)),
    release: () => {
      transient.clear();
    },
    summary: () => {
      const bodiesCounted = bodies.size;
      const totalBytesNow = total;
      const parsePasses = [...byIdentity.values()].reduce((sum, count) => sum + count, 0);
      const maxPassesOnOneSource = Math.max(0, ...passes.values());
      const breachesNow = [...breaches];

      // Highest `observed` any recorded breach carries for `limit`, or
      // `undefined` when this ledger has recorded no breach for it — never
      // a 0 standing in for "no breach recorded."
      const observedFromBreaches = (limit: keyof PwbResourceLimits): number | undefined =>
        breachesNow.reduce<number | undefined>((worst, breach) => (breach.limit === limit ? Math.max(worst ?? breach.observed, breach.observed) : worst), undefined);

      // The largest single body this ledger has actually charged; a body
      // that breached `maxBytesPerSource` before this ledger ever counted
      // it is not in `bodies`, so a recorded breach (below) can raise this.
      const worstBodyBytes = Math.max(0, ...bodies.values());

      const observationFor = (limit: keyof PwbResourceLimits): ResourceLimitObservation => {
        switch (limit) {
          case 'maxTotalBytes':
            return { state: 'observed', value: totalBytesNow };
          case 'maxParsePassesPerSource':
            return { state: 'observed', value: maxPassesOnOneSource };
          case 'maxBytesPerSource': {
            const breach = observedFromBreaches(limit);
            return { state: 'observed', value: breach === undefined ? worstBodyBytes : Math.max(worstBodyBytes, breach) };
          }
          case 'maxSources': {
            const breach = observedFromBreaches(limit);
            if (sourcePopulation === undefined && breach === undefined) {
              return {
                state: 'unknown',
                reason:
                  'the manifest source population (declareSourcePopulation) was never declared to this ledger and no maxSources breach was recorded, so the full population the limit is compared against is not evidence this ledger holds',
              };
            }
            return { state: 'observed', value: Math.max(sourcePopulation ?? 0, breach ?? 0) };
          }
          case 'maxIndexDepth':
            // A fixed, always-known constant — real, static evidence, not
            // a running count this ledger keeps, but never Unknown.
            return { state: 'observed', value: PWB_INDEX_DEPTH };
          case 'maxHumanResponseBytes':
          case 'maxMachineResponseBytes':
            return {
              state: 'unknown',
              reason: 'the final-response ceiling is enforced entirely outside this ledger, by routes.ts\'s boundedResponse, which never charges a ResourceLedger',
            };
        }
      };

      const remainingFor = (declared: number, observed: ResourceLimitObservation): ResourceLimitObservation =>
        observed.state === 'observed' ? { state: 'observed', value: declared - observed.value } : { state: 'unknown', reason: observed.reason };

      const byLimit = Object.fromEntries(
        DECLARED_RESOURCE_LIMIT_IDENTITIES.map((limit) => {
          const declared = limits[limit];
          const observed = observationFor(limit);
          const usage: ResourceLimitUsage = { limit, declared, observed, remaining: remainingFor(declared, observed) };
          return [limit, usage];
        }),
      ) as Record<keyof PwbResourceLimits, ResourceLimitUsage>;

      const cost: ResourceLedgerCostRecord = {
        bodiesRead: bodiesCounted,
        bytes: totalBytesNow,
        parsePasses,
        worstSourcePasses: maxPassesOnOneSource,
      };

      return {
        bodiesCounted,
        totalBytes: totalBytesNow,
        parsePasses,
        passesByIdentity: Object.fromEntries(PARSE_PASS_IDENTITIES.map((pass) => [pass, byIdentity.get(pass) ?? 0])) as Record<ParsePassIdentity, number>,
        sourcesTraversed: passes.size,
        maxPassesOnOneSource,
        breaches: breachesNow,
        byLimit,
        cost,
      };
    },
  };
}
