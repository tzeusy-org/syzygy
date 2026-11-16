// The evaluation-wide resource ledger: registry `resourceLimits`,
// `parsePassIdentities` and `resourceLimitSemantics` as amended 2026-09-05
// (registry amendment act); PWB-REQ-006 as amended (truth-and-readiness
// amendment act). Expected pass identities and limit values are hand-typed
// literals — never imported from the module under test.

import { describe, expect, it } from 'vitest';

import { PWB_RESOURCE_LIMITS } from './project-shape-observation.js';
import type { PwbResourceLimits } from './pwb-types.js';
import { createTransientBodies } from './transient-bodies.js';
import {
  PARSE_PASS_IDENTITIES,
  SECRET_DETECTOR_PASSES,
  createResourceLedger,
  isParsePassIdentity,
  type ParsePassIdentity,
  type ResourceLedger,
} from './resource-ledger.js';

// Hand-typed from the amended registry entry.
const REGISTRY_PASSES = [
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

const OID_A = 'a'.repeat(40);
const OID_B = 'b'.repeat(40);

function limits(overrides: Partial<PwbResourceLimits>): PwbResourceLimits {
  return { ...PWB_RESOURCE_LIMITS, ...overrides };
}

describe('registry-bound pass identities', () => {
  it('the closed list is the registry list, in order', () => {
    expect([...PARSE_PASS_IDENTITIES]).toEqual([...REGISTRY_PASSES]);
    for (const pass of REGISTRY_PASSES) expect(isParsePassIdentity(pass)).toBe(true);
    expect(isParsePassIdentity('regex-scan')).toBe(false);
    expect(isParsePassIdentity('')).toBe(false);
  });

  it('every policy detector maps onto its own registry pass', () => {
    expect(SECRET_DETECTOR_PASSES).toEqual({
      'private-key-material': 'secret-private-key-fragments',
      'known-token-formats': 'secret-known-token-formats',
      'credential-assignment': 'secret-credential-assignment',
      'credential-bearing-url': 'secret-credential-bearing-url',
    });
  });

  it('every named pass is chargeable and counted under its own identity', () => {
    const ledger = createResourceLedger(limits({ maxParsePassesPerSource: 100 }));
    for (const pass of REGISTRY_PASSES) expect(ledger.chargePass('p', pass)).toBeUndefined();
    const summary = ledger.summary();
    expect(summary.parsePasses).toBe(12);
    expect(summary.sourcesTraversed).toBe(1);
    expect(summary.maxPassesOnOneSource).toBe(12);
    for (const pass of REGISTRY_PASSES) expect(summary.passesByIdentity[pass]).toBe(1);
  });

  it('an unregistered traversal is forbidden: it throws and charges nothing', () => {
    const ledger = createResourceLedger(PWB_RESOURCE_LIMITS);
    expect(() => ledger.chargePass('p', 'regex-scan' as ParsePassIdentity)).toThrow(/unregistered parse pass "regex-scan" on p: an unregistered traversal is forbidden/);
    expect(() => ledger.chargeFor('p')('' as ParsePassIdentity)).toThrow(/unregistered/);
    expect(ledger.passesFor('p')).toBe(0);
    expect(ledger.breaches).toEqual([]);
  });
});

describe('maxParsePassesPerSource — one budget per source, wall-clock never an input', () => {
  it('limit − 1 and limit pass; limit + 1 breaches and is recorded once per crossing', () => {
    const ledger = createResourceLedger(limits({ maxParsePassesPerSource: 3 }));
    expect(ledger.chargePass('p', 'utf8-and-nul-validation')).toBeUndefined();
    expect(ledger.chargePass('p', 'markdown-code-context-mask')).toBeUndefined();
    expect(ledger.passesFor('p')).toBe(2);
    expect(ledger.chargePass('p', 'unsafe-url-positions')).toBeUndefined();
    expect(ledger.passesFor('p')).toBe(3);
    expect(ledger.breaches).toEqual([]);
    expect(ledger.chargePass('p', 'phase-a-link-discovery')).toEqual({ limit: 'maxParsePassesPerSource', declared: 3, observed: 4, path: 'p' });
    expect(ledger.breaches).toEqual([{ limit: 'maxParsePassesPerSource', declared: 3, observed: 4, path: 'p' }]);
  });

  it('repeating a pass counts again', () => {
    const ledger = createResourceLedger(limits({ maxParsePassesPerSource: 2 }));
    expect(ledger.chargePass('p', 'secret-known-token-formats')).toBeUndefined();
    expect(ledger.chargePass('p', 'secret-known-token-formats')).toBeUndefined();
    expect(ledger.chargePass('p', 'secret-known-token-formats')).toMatchObject({ limit: 'maxParsePassesPerSource', observed: 3 });
    // The refused traversal never ran: it is a breach, not a performed pass.
    expect(ledger.summary().passesByIdentity['secret-known-token-formats']).toBe(2);
    expect(ledger.passesFor('p')).toBe(2);
    expect(ledger.chargePass('p', 'secret-known-token-formats')).toMatchObject({ observed: 3 });
    expect(ledger.breaches).toHaveLength(2);
  });

  it('budgets are per source: a second path starts at zero', () => {
    const ledger = createResourceLedger(limits({ maxParsePassesPerSource: 1 }));
    expect(ledger.chargePass('a', 'utf8-and-nul-validation')).toBeUndefined();
    expect(ledger.chargePass('b', 'utf8-and-nul-validation')).toBeUndefined();
    expect(ledger.chargePass('a', 'utf8-and-nul-validation')).toBeDefined();
    expect(ledger.passesFor('b')).toBe(1);
    expect(ledger.summary().sourcesTraversed).toBe(2);
  });

  it('chargeFor returns the recorded breach, never throws, and leaves the pass that never ran uncounted', () => {
    const ledger = createResourceLedger(limits({ maxParsePassesPerSource: 1 }));
    const charge = ledger.chargeFor('p');
    expect(charge('utf8-and-nul-validation')).toBeUndefined();
    const breach = charge('active-html-svg-script-handler');
    expect(breach).toEqual({ limit: 'maxParsePassesPerSource', declared: 1, observed: 2, path: 'p' });
    expect(ledger.breaches).toEqual([breach]);
    expect(ledger.passesFor('p')).toBe(1);
    expect(ledger.summary().passesByIdentity['active-html-svg-script-handler']).toBe(0);
    expect(() => charge('not-a-pass' as ParsePassIdentity)).toThrow(/unregistered parse pass/);
  });
});

describe('maxTotalBytes — one cumulative counter across both phases', () => {
  it('limit − 1 and limit fit; limit + 1 breaches and is not counted', () => {
    for (const [size, fits] of [
      [9, true],
      [10, true],
      [11, false],
    ] as const) {
      const ledger = createResourceLedger(limits({ maxTotalBytes: 10 }));
      const breach = ledger.chargeBody('p', OID_A, size);
      if (fits) {
        expect(breach, String(size)).toBeUndefined();
        expect(ledger.totalBytes()).toBe(size);
        expect(ledger.counted('p', OID_A)).toBe(true);
      } else {
        expect(breach).toEqual({ limit: 'maxTotalBytes', declared: 10, observed: 11, path: 'p' });
        expect(ledger.totalBytes()).toBe(0);
        expect(ledger.counted('p', OID_A)).toBe(false);
        expect(ledger.breaches).toEqual([breach]);
      }
    }
  });

  it('the counter accumulates and never resets: the body that would cross is refused, a later smaller one may fit', () => {
    const ledger = createResourceLedger(limits({ maxTotalBytes: 10 }));
    expect(ledger.chargeBody('a', OID_A, 6)).toBeUndefined();
    expect(ledger.chargeBody('b', OID_B, 5)).toMatchObject({ limit: 'maxTotalBytes', observed: 11, path: 'b' });
    expect(ledger.chargeBody('c', OID_B, 4)).toBeUndefined();
    expect(ledger.totalBytes()).toBe(10);
    expect(ledger.summary().bodiesCounted).toBe(2);
  });

  it('one (path, object id) body counts once, however many times it is charged', () => {
    const ledger = createResourceLedger(limits({ maxTotalBytes: 10 }));
    expect(ledger.chargeBody('p', OID_A, 7)).toBeUndefined();
    expect(ledger.chargeBody('p', OID_A, 7)).toBeUndefined();
    expect(ledger.projectBody('p', OID_A, 7)).toBeUndefined();
    expect(ledger.totalBytes()).toBe(7);
    expect(ledger.summary().bodiesCounted).toBe(1);
    expect(ledger.breaches).toEqual([]);
  });

  it('the same object at a different path, or a different object at the same path, is another body', () => {
    const ledger = createResourceLedger(limits({ maxTotalBytes: 100 }));
    ledger.chargeBody('p', OID_A, 7);
    ledger.chargeBody('q', OID_A, 7);
    ledger.chargeBody('p', OID_B, 7);
    expect(ledger.totalBytes()).toBe(21);
    expect(ledger.summary().bodiesCounted).toBe(3);
  });

  it('projectBody evaluates a declared size without counting it', () => {
    const ledger = createResourceLedger(limits({ maxTotalBytes: 10 }));
    expect(ledger.projectBody('p', OID_A, 10)).toBeUndefined();
    expect(ledger.totalBytes()).toBe(0);
    expect(ledger.projectBody('p', OID_A, 11)).toEqual({ limit: 'maxTotalBytes', declared: 10, observed: 11, path: 'p' });
    expect(ledger.breaches).toHaveLength(1);
  });
});

describe('transient phase-A bodies', () => {
  it('a remembered body is recalled by (path, object id) until release', () => {
    const bodies = createTransientBodies();
    const body = { bytes: new Uint8Array([104, 105]), text: 'hi' };
    bodies.remember('p', OID_A, body);
    expect(bodies.recall('p', OID_A)).toBe(body);
    expect(bodies.recall('p', OID_B)).toBeUndefined();
    expect(bodies.recall('q', OID_A)).toBeUndefined();
    bodies.release();
    expect(bodies.recall('p', OID_A)).toBeUndefined();
  });
});

describe('summary and breach order', () => {
  it('the summary is a snapshot with every identity present and breaches in occurrence order', () => {
    const ledger = createResourceLedger(limits({ maxTotalBytes: 1, maxParsePassesPerSource: 1 }));
    ledger.recordBreach({ limit: 'maxSources', declared: 1, observed: 2, path: 'x' });
    ledger.chargeBody('p', OID_A, 2);
    ledger.chargePass('p', 'utf8-and-nul-validation');
    ledger.chargePass('p', 'utf8-and-nul-validation');
    const summary = ledger.summary();
    expect(summary.breaches.map((b) => b.limit)).toEqual(['maxSources', 'maxTotalBytes', 'maxParsePassesPerSource']);
    expect(Object.keys(summary.passesByIdentity)).toEqual([...REGISTRY_PASSES]);
    expect(summary).toMatchObject({ bodiesCounted: 0, totalBytes: 0, parsePasses: 1, sourcesTraversed: 1, maxPassesOnOneSource: 1 });
    ledger.chargePass('q', 'phase-a-link-discovery');
    expect(summary.parsePasses).toBe(1);
    expect(ledger.limits).toEqual(limits({ maxTotalBytes: 1, maxParsePassesPerSource: 1 }));
  });
});

// ---------------------------------------------------------------------
// N3 slice 1: headroom against all seven declared limits, plus a derived
// cost record. Both are pure projections of counters the ledger already
// keeps (and, for the five limits it does not itself count, of breaches
// its callers already record here) — no new observation, no new limit.

describe('byLimit — headroom against all seven declared limits (N3 slice 1)', () => {
  it('the two limits this ledger counts directly report their own running counter', () => {
    const ledger = createResourceLedger(limits({ maxTotalBytes: 100, maxParsePassesPerSource: 5 }));
    ledger.chargeBody('p', OID_A, 40);
    ledger.chargePass('p', 'utf8-and-nul-validation');
    ledger.chargePass('p', 'markdown-code-context-mask');
    const { byLimit } = ledger.summary();
    expect(byLimit.maxTotalBytes).toEqual({ limit: 'maxTotalBytes', declared: 100, observed: { state: 'observed', value: 40 }, remaining: { state: 'observed', value: 60 } });
    expect(byLimit.maxParsePassesPerSource).toEqual({ limit: 'maxParsePassesPerSource', declared: 5, observed: { state: 'observed', value: 2 }, remaining: { state: 'observed', value: 3 } });
  });

  it('maxBytesPerSource reads the largest body this ledger has actually charged, not a 0 standing in for "never counted"', () => {
    const ledger = createResourceLedger(PWB_RESOURCE_LIMITS);
    ledger.chargeBody('a', OID_A, 5);
    ledger.chargeBody('b', OID_B, 12);
    const { byLimit } = ledger.summary();
    expect(byLimit.maxBytesPerSource).toEqual({
      limit: 'maxBytesPerSource',
      declared: PWB_RESOURCE_LIMITS.maxBytesPerSource,
      observed: { state: 'observed', value: 12 },
      remaining: { state: 'observed', value: PWB_RESOURCE_LIMITS.maxBytesPerSource - 12 },
    });
  });

  it('maxSources is Unknown, never sourcesTraversed standing in for the manifest population, when nothing declares it', () => {
    // sourcesTraversed (passes.size) is not the population maxSources
    // breaches against (manifest.sources.length): a manifest may hold a
    // path-only source this ledger never charges a pass to. Absent both a
    // declareSourcePopulation call and a recorded breach, this ledger
    // genuinely does not hold that population, so it must say Unknown
    // rather than substitute the smaller, ledger-local sourcesTraversed
    // count.
    const ledger = createResourceLedger(PWB_RESOURCE_LIMITS);
    ledger.chargePass('a', 'utf8-and-nul-validation');
    ledger.chargePass('b', 'utf8-and-nul-validation');
    const summary = ledger.summary();
    expect(summary.sourcesTraversed).toBe(2);
    expect(summary.byLimit.maxSources.observed.state).toBe('unknown');
    expect(summary.byLimit.maxSources.remaining.state).toBe('unknown');
    if (summary.byLimit.maxSources.observed.state === 'unknown') {
      expect(summary.byLimit.maxSources.observed.reason.length).toBeGreaterThan(0);
    }
  });

  it('maxSources reads the declared manifest population, not sourcesTraversed, for a fixture with a path-only source', () => {
    // Three manifest sources ('a', 'b' and a path-only 'c' never traversed
    // — the shape of `baseline-spec-tree`, which reads only the path
    // string and is never charged a parse pass), but only two are charged
    // a pass. declareSourcePopulation is the observation pipeline's
    // unconditional call (`project-shape-observation.ts`, right after the
    // manifest is derived) feeding in the same population the pipeline's
    // own maxSources breach check compares against the limit
    // (`manifest.sources.length`). The pinned invariant: observed equals
    // that declared population, not the smaller sourcesTraversed count.
    const ledger = createResourceLedger(PWB_RESOURCE_LIMITS);
    ledger.chargePass('a', 'utf8-and-nul-validation');
    ledger.chargePass('b', 'utf8-and-nul-validation');
    ledger.declareSourcePopulation(3);
    const summary = ledger.summary();
    expect(summary.sourcesTraversed).toBe(2);
    expect(summary.byLimit.maxSources).toEqual({
      limit: 'maxSources',
      declared: PWB_RESOURCE_LIMITS.maxSources,
      observed: { state: 'observed', value: 3 },
      remaining: { state: 'observed', value: PWB_RESOURCE_LIMITS.maxSources - 3 },
    });
    expect(summary.byLimit.maxSources.observed.state === 'observed' && summary.byLimit.maxSources.observed.value).not.toBe(summary.sourcesTraversed);
  });

  it('maxIndexDepth reads the fixed, always-known PWB_INDEX_DEPTH constant, never a silent 0', () => {
    const ledger = createResourceLedger(PWB_RESOURCE_LIMITS);
    const { byLimit } = ledger.summary();
    expect(byLimit.maxIndexDepth).toEqual({
      limit: 'maxIndexDepth',
      declared: PWB_RESOURCE_LIMITS.maxIndexDepth,
      observed: { state: 'observed', value: 3 },
      remaining: { state: 'observed', value: PWB_RESOURCE_LIMITS.maxIndexDepth - 3 },
    });
  });

  it('the two response ceilings this ledger never touches report Unknown, never a false 0', () => {
    const ledger = createResourceLedger(PWB_RESOURCE_LIMITS);
    const { byLimit } = ledger.summary();
    for (const limit of ['maxHumanResponseBytes', 'maxMachineResponseBytes'] as const) {
      const usage = byLimit[limit];
      expect(usage.declared).toBe(PWB_RESOURCE_LIMITS[limit]);
      expect(usage.observed.state).toBe('unknown');
      expect(usage.remaining.state).toBe('unknown');
      if (usage.observed.state === 'unknown') expect(usage.observed.reason.length).toBeGreaterThan(0);
    }
  });

  it('a recorded breach can raise maxSources and maxBytesPerSource above what this ledger charged directly, and remaining goes negative', () => {
    const ledger = createResourceLedger(limits({ maxSources: 10, maxBytesPerSource: 10 }));
    ledger.chargePass('a', 'utf8-and-nul-validation');
    ledger.recordBreach({ limit: 'maxSources', declared: 10, observed: 11, path: 'a' });
    ledger.recordBreach({ limit: 'maxSources', declared: 10, observed: 13, path: 'b' });
    ledger.recordBreach({ limit: 'maxBytesPerSource', declared: 10, observed: 20, path: 'huge' });
    const { byLimit } = ledger.summary();
    expect(byLimit.maxSources).toEqual({ limit: 'maxSources', declared: 10, observed: { state: 'observed', value: 13 }, remaining: { state: 'observed', value: -3 } });
    expect(byLimit.maxBytesPerSource).toEqual({ limit: 'maxBytesPerSource', declared: 10, observed: { state: 'observed', value: 20 }, remaining: { state: 'observed', value: -10 } });
  });

  it('carries all seven declared identities, never an eighth', () => {
    const { byLimit } = createResourceLedger(PWB_RESOURCE_LIMITS).summary();
    expect(Object.keys(byLimit).sort()).toEqual([
      'maxBytesPerSource',
      'maxHumanResponseBytes',
      'maxIndexDepth',
      'maxMachineResponseBytes',
      'maxParsePassesPerSource',
      'maxSources',
      'maxTotalBytes',
    ]);
  });

  // Rule 6: mutate the Unknown branch and confirm a test fails. Mutation:
  // in resource-ledger.ts's `observationFor`, the `maxHumanResponseBytes`
  // / `maxMachineResponseBytes` case changed from
  // `{ state: 'unknown', reason: '...' }` to `{ state: 'observed', value: 0 }`
  // (i.e. reverting to the pre-repair silent-zero behavior this describe
  // block exists to forbid) — run and reverted by hand; recorded here
  // because the mutated file is not committed. Result: the "response
  // ceilings... report Unknown" test above fails two assertions
  // (`usage.observed.state` reads `'observed'` instead of `'unknown'`) for
  // both `maxHumanResponseBytes` and `maxMachineResponseBytes`, and the
  // `usage.observed.reason` branch is never reached because `toBe('unknown')`
  // already fails first — confirming the test is sensitive to the Unknown
  // state, not vacuous.
});

// ---------------------------------------------------------------------
// syzygy-u05.17: pin the maxSources and maxBytesPerSource population/
// charged-value-vs-recorded-breach folds directly. R-PWB-N3-SLICES1-2-
// CONFIRMATION-2-RAW.md (line ~190) found a mutation to the maxSources
// fold — `Math.max(sourcePopulation ?? 0, breach ?? 0)` — survived all
// 1780 tests: replacing it with `sourcePopulation ?? breach ?? 0` (first
// operand wins whenever it is declared, never compared against a larger
// breach) agrees with every existing test, because no existing test
// declares a population *and* records a breach with a different,
// independently larger or smaller value for the same limit. The tests
// below do exactly that, in both directions, for maxSources and for the
// analogous maxBytesPerSource fold (`breach === undefined ? worstBodyBytes
// : Math.max(worstBodyBytes, breach)`), plus each side alone.

describe('maxSources fold — declared population vs recorded breach (syzygy-u05.17)', () => {
  it('a breach independently larger than the declared population wins', () => {
    const ledger = createResourceLedger(PWB_RESOURCE_LIMITS);
    ledger.declareSourcePopulation(5);
    ledger.recordBreach({ limit: 'maxSources', declared: PWB_RESOURCE_LIMITS.maxSources, observed: 20, path: 'x' });
    const { byLimit } = ledger.summary();
    expect(byLimit.maxSources.observed).toEqual({ state: 'observed', value: 20 });
  });

  it('a declared population independently larger than the recorded breach wins', () => {
    const ledger = createResourceLedger(PWB_RESOURCE_LIMITS);
    ledger.declareSourcePopulation(50);
    ledger.recordBreach({ limit: 'maxSources', declared: PWB_RESOURCE_LIMITS.maxSources, observed: 10, path: 'x' });
    const { byLimit } = ledger.summary();
    expect(byLimit.maxSources.observed).toEqual({ state: 'observed', value: 50 });
  });

  it('the declared population alone, no breach ever recorded', () => {
    const ledger = createResourceLedger(PWB_RESOURCE_LIMITS);
    ledger.declareSourcePopulation(7);
    const { byLimit } = ledger.summary();
    expect(byLimit.maxSources.observed).toEqual({ state: 'observed', value: 7 });
  });

  it('a recorded breach alone, the population never declared', () => {
    const ledger = createResourceLedger(PWB_RESOURCE_LIMITS);
    ledger.recordBreach({ limit: 'maxSources', declared: PWB_RESOURCE_LIMITS.maxSources, observed: 9, path: 'x' });
    const { byLimit } = ledger.summary();
    expect(byLimit.maxSources.observed).toEqual({ state: 'observed', value: 9 });
  });
});

describe('maxBytesPerSource fold — largest charged body vs recorded breach (syzygy-u05.17)', () => {
  it('a breach independently larger than any charged body wins', () => {
    const ledger = createResourceLedger(PWB_RESOURCE_LIMITS);
    ledger.chargeBody('p', OID_A, 5);
    ledger.recordBreach({ limit: 'maxBytesPerSource', declared: PWB_RESOURCE_LIMITS.maxBytesPerSource, observed: 50, path: 'huge' });
    const { byLimit } = ledger.summary();
    expect(byLimit.maxBytesPerSource.observed).toEqual({ state: 'observed', value: 50 });
  });

  it('the largest charged body independently larger than the recorded breach wins', () => {
    const ledger = createResourceLedger(PWB_RESOURCE_LIMITS);
    ledger.chargeBody('p', OID_A, 50);
    ledger.recordBreach({ limit: 'maxBytesPerSource', declared: PWB_RESOURCE_LIMITS.maxBytesPerSource, observed: 5, path: 'small' });
    const { byLimit } = ledger.summary();
    expect(byLimit.maxBytesPerSource.observed).toEqual({ state: 'observed', value: 50 });
  });

  it('a charged body alone, no breach ever recorded', () => {
    const ledger = createResourceLedger(PWB_RESOURCE_LIMITS);
    ledger.chargeBody('p', OID_A, 6);
    const { byLimit } = ledger.summary();
    expect(byLimit.maxBytesPerSource.observed).toEqual({ state: 'observed', value: 6 });
  });

  it('a recorded breach alone, no body ever charged', () => {
    const ledger = createResourceLedger(PWB_RESOURCE_LIMITS);
    ledger.recordBreach({ limit: 'maxBytesPerSource', declared: PWB_RESOURCE_LIMITS.maxBytesPerSource, observed: 8, path: 'huge' });
    const { byLimit } = ledger.summary();
    expect(byLimit.maxBytesPerSource.observed).toEqual({ state: 'observed', value: 8 });
  });
});

describe('cost — a pure derived record, no new observation (N3 slice 1)', () => {
  it('mirrors the counters the ledger already tracks: bodies, bytes, parse passes, worst-source passes', () => {
    const ledger = createResourceLedger(limits({ maxTotalBytes: 1000, maxParsePassesPerSource: 10 }));
    ledger.chargeBody('a', OID_A, 5);
    ledger.chargeBody('b', OID_B, 7);
    ledger.chargePass('a', 'utf8-and-nul-validation');
    ledger.chargePass('a', 'markdown-code-context-mask');
    ledger.chargePass('a', 'active-html-svg-script-handler');
    ledger.chargePass('b', 'utf8-and-nul-validation');
    const { cost } = ledger.summary();
    expect(cost).toEqual({ bodiesRead: 2, bytes: 12, parsePasses: 4, worstSourcePasses: 3 });
  });

  it('an empty ledger costs nothing', () => {
    const { cost } = createResourceLedger(PWB_RESOURCE_LIMITS).summary();
    expect(cost).toEqual({ bodiesRead: 0, bytes: 0, parsePasses: 0, worstSourcePasses: 0 });
  });
});

// ---------------------------------------------------------------------
// N3 slice 2: a build-time guard on maxPassesOnOneSource. L11-F2
// [Observed]: the production worst source already spends 14 of the
// declared 16 passes (a margin of 2), the most-consumed limit in the
// system, and Syzygy's own near-term roadmap (M2, M14, M15, lane B) each
// plausibly adds a pass. This guard recomputes the worst-source pass
// count over the synthetic Butlers-shaped fixture corpus
// (project-shape-model.test.ts's BASE_TEXTS) and fails — naming the
// source and the pass identities charged to it — when any registry pass
// identity would push a worst source past the declared margin.

// Hand-typed, in charge order, from the real pipeline run over BASE_TEXTS
// at PWB_RESOURCE_LIMITS (captured by instrumenting chargePass while
// running project-shape-model.test.ts's "every body is taken from Git
// once, counted once and validated once across both phases", whose
// resourceUse.maxPassesOnOneSource is the same hand-typed 14): the three
// sources tied for the worst load, each at 14 of the declared 16 passes.
const PASS_BUDGET_MARGIN = 2;
const ABOUT_README_SEQUENCE: readonly ParsePassIdentity[] = [
  'utf8-and-nul-validation',
  'secret-private-key-fragments',
  'secret-known-token-formats',
  'secret-credential-assignment',
  'secret-credential-bearing-url',
  'markdown-code-context-mask',
  'active-html-svg-script-handler',
  'unsafe-url-positions',
  'phase-a-link-discovery',
  'secret-private-key-fragments',
  'secret-known-token-formats',
  'secret-credential-assignment',
  'secret-credential-bearing-url',
  'fact-and-precedence-extraction',
];
const LEGENDS_README_SEQUENCE: readonly ParsePassIdentity[] = [
  'utf8-and-nul-validation',
  'secret-private-key-fragments',
  'secret-known-token-formats',
  'secret-credential-assignment',
  'secret-credential-bearing-url',
  'markdown-code-context-mask',
  'active-html-svg-script-handler',
  'unsafe-url-positions',
  'phase-a-link-discovery',
  'secret-private-key-fragments',
  'secret-known-token-formats',
  'secret-credential-assignment',
  'secret-credential-bearing-url',
  'declared-item-extraction',
];
const CRAFT_README_SEQUENCE: readonly ParsePassIdentity[] = LEGENDS_README_SEQUENCE;
const WORST_SOURCE_PASS_SEQUENCES: Readonly<Record<string, readonly ParsePassIdentity[]>> = {
  'about/README.md': ABOUT_README_SEQUENCE,
  'about/legends-and-lore/README.md': LEGENDS_README_SEQUENCE,
  'about/craft-and-care/README.md': CRAFT_README_SEQUENCE,
};

// Charges every hand-typed sequence onto a fresh ledger at the real
// declared maxParsePassesPerSource (16).
function ledgerAtWorstSources(sequences: Readonly<Record<string, readonly ParsePassIdentity[]>>): ResourceLedger {
  const ledger = createResourceLedger(PWB_RESOURCE_LIMITS);
  for (const [path, sequence] of Object.entries(sequences)) {
    for (const pass of sequence) {
      const breach = ledger.chargePass(path, pass);
      if (breach !== undefined) throw new Error(`fixture is already over the hard limit: ${path} at ${pass}`);
    }
  }
  return ledger;
}

// The guard predicate: throws, naming the source(s) at the worst load and
// the pass identities charged to each, when the worst source is not left
// at least `margin` passes of headroom under the declared limit.
function assertPassBudgetMargin(ledger: ResourceLedger, sequences: Readonly<Record<string, readonly ParsePassIdentity[]>>, margin: number): void {
  const declared = ledger.limits.maxParsePassesPerSource;
  const worst = ledger.summary().maxPassesOnOneSource;
  if (worst <= declared - margin) return;
  const atWorst = Object.entries(sequences).filter(([path]) => ledger.passesFor(path) === worst);
  const detail = atWorst.map(([path, sequence]) => `${path} (${sequence.length} passes: ${sequence.join(', ')})`).join('; ');
  throw new Error(`parse pass budget margin breached: worst source at ${worst} of ${declared} declared, margin ${margin} — ${detail}`);
}

describe('guard: maxPassesOnOneSource stays inside its declared margin (N3 slice 2)', () => {
  it('today the worst source sits exactly at the margin — 14 of the declared 16, margin 2', () => {
    const ledger = ledgerAtWorstSources(WORST_SOURCE_PASS_SEQUENCES);
    expect(ledger.summary().maxPassesOnOneSource).toBe(14);
    expect(PWB_RESOURCE_LIMITS.maxParsePassesPerSource - 14).toBe(PASS_BUDGET_MARGIN);
    expect(() => assertPassBudgetMargin(ledger, WORST_SOURCE_PASS_SEQUENCES, PASS_BUDGET_MARGIN)).not.toThrow();
  });

  it('a registry pass identity charged to the worst source pushes it past the margin: the guard fails, naming the source and its passes', () => {
    // Mutation: 'about/README.md' real 14-pass sequence gains a 15th
    // charge, 'project-account-extraction' — an already-registered pass
    // identity (`PARSE_PASS_IDENTITIES`, charged elsewhere for the account
    // section) newly applying to this source, standing in for how a 15th
    // charge could arrive here (per L11-F2's WHY: M2, M14, M15 or lane B).
    // old fragment: the 14-entry array ending in
    // 'fact-and-precedence-extraction'. new fragment: the same 14 plus
    // 'project-account-extraction' appended.
    const mutatedSequences: Readonly<Record<string, readonly ParsePassIdentity[]>> = {
      ...WORST_SOURCE_PASS_SEQUENCES,
      'about/README.md': [...ABOUT_README_SEQUENCE, 'project-account-extraction'],
    };
    const ledger = ledgerAtWorstSources(mutatedSequences);
    expect(ledger.summary().maxPassesOnOneSource).toBe(15);
    let caught: unknown;
    try {
      assertPassBudgetMargin(ledger, mutatedSequences, PASS_BUDGET_MARGIN);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(Error);
    const message = (caught as Error).message;
    expect(message).toContain('about/README.md');
    expect(message).toContain('15 of 16 declared');
    expect(message).toContain('project-account-extraction');
    expect(message).toContain('fact-and-precedence-extraction');
  });
});
