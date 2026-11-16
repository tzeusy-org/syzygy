import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// syzygy-4mbu round 1, finding 1: an operator-reported run resolves to the
// `reported` kind, capped at report-fact (RFC5-19), and since round 2 (note
// 2) there is no `verified` kind at all. Every consumer of the verification
// must treat `reported` as not verified. This sweep fixes the consumer
// population, so a new reader fails here until it is added below with the
// reason it is safe; the behaviour of each listed consumer is asserted in
// its own test file (named beside it).
//
// What the sweep finds, and what it cannot (round-2 note 3):
// - any mention of the field name `testArtifactVerification`, so member
//   access, a destructuring reader (`const { testArtifactVerification } =
//   model`, with or without a rename) and a re-declaration are all found;
// - any mention of the result type's name;
// - a whole-model serializer written `JSON.stringify(model)`, the machine
//   channel at `/api/poc`, which carries the verification verbatim.
// It cannot find a reader that never spells the field name: a computed key
// (`model[key]`), `Object.values(model)`, a spread into another object, or
// a whole-model serializer over a variable with another name. Those are
// a reviewer's to catch; the wire value is self-describing (`kind:
// 'reported'`, `tier: 'report-fact'`, `disclosure`), so a verbatim copy
// cannot read as verified.

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const TREES = ['apps', 'packages'];
const DEFINITION = 'packages/three-surface-poc-core/src/test-artifact-verification.ts';

/** Every non-test TypeScript source under the two implementation trees. */
function sources(): Map<string, string> {
  const found = new Map<string, string>();
  for (const tree of TREES) {
    for (const entry of readdirSync(join(ROOT, tree), { recursive: true, encoding: 'utf8' })) {
      const path = `${tree}/${entry}`;
      if (!path.endsWith('.ts') || path.endsWith('.test.ts') || path.endsWith('.d.ts')) continue;
      if (path.includes('/node_modules/') || path.includes('/dist/')) continue;
      found.set(path, readFileSync(join(ROOT, path), 'utf8'));
    }
  }
  return found;
}

const CONSUMER = /\btestArtifactVerification\b|\bTestArtifactVerificationResult\b/;
const WHOLE_MODEL = /\bJSON\.stringify\(\s*model\s*\)/;
const VERIFIED_COMPARISON = /\bkind\s*[!=]==?\s*['"]verified['"]/g;
const VERIFIED_ARM = /\bcase\s+['"]verified['"]\s*:/g;

/** The consumers, each with why `reported` cannot read as verified there
 * and the test that holds it. */
const EXPECTED_CONSUMERS: Readonly<Record<string, string>> = {
  'apps/three-surface-poc/src/trajectory.ts':
    'renders `reported` in the Unknown encoding with its disclosure, never "Verified" (trajectory.test.ts)',
  'packages/three-surface-poc-core/src/model.ts':
    'adds `reported` to the Unknown subjects as `execution-blocked` with its disclosure (trajectory.test.ts reads it back)',
  'packages/three-surface-poc-core/src/model-slices.ts':
    'the Trajectory slice resolves the verification and returns it verbatim to the compose step; it branches on no kind (model.test.ts)',
  'apps/three-surface-poc/src/fresh-checkout-demo-main.ts':
    'copies the kind string into its evidence record; it gates nothing on it',
};

/** The whole-model channels: they carry the verification without naming it. */
const EXPECTED_WHOLE_MODEL: Readonly<Record<string, string>> = {
  'apps/three-surface-poc/src/routes.ts':
    'serves the model verbatim at /api/poc; the value names its own kind, tier and disclosure, and no `verified` kind exists to serve',
};

describe('every consumer of the test-artifact verification treats `reported` as not verified', () => {
  it('finds exactly the listed consumers, by name and by whole-model serialization', () => {
    const all = sources();
    expect(all.size).toBeGreaterThan(100);
    const consumers = [...all].filter(([path, text]) => path !== DEFINITION && CONSUMER.test(text)).map(([path]) => path);
    expect(consumers.sort()).toEqual(Object.keys(EXPECTED_CONSUMERS).sort());
    const wholeModel = [...all].filter(([, text]) => WHOLE_MODEL.test(text)).map(([path]) => path);
    expect(wholeModel.sort()).toEqual(Object.keys(EXPECTED_WHOLE_MODEL).sort());
  });

  it('finds a destructuring reader, with or without a rename', () => {
    expect(CONSUMER.test('const { testArtifactVerification } = model;')).toBe(true);
    expect(CONSUMER.test('const { testArtifactVerification: v } = model;')).toBe(true);
  });

  it('finds no `verified` comparison or switch arm anywhere, since no such kind exists', () => {
    const sites: string[] = [];
    for (const [path, text] of sources()) {
      if ([...text.matchAll(VERIFIED_COMPARISON)].length + [...text.matchAll(VERIFIED_ARM)].length > 0) sites.push(path);
    }
    expect(sites).toEqual([]);
    const trajectory = sources().get('apps/three-surface-poc/src/trajectory.ts') ?? '';
    const observedBadge = trajectory.split('\n').filter((line) => line.includes('epistemic-observed') && line.includes('worker-change-verification'));
    expect(observedBadge).toEqual([]);
  });

  it('defines no `verified` result kind', () => {
    const definition = sources().get(DEFINITION) ?? '';
    expect(definition).toContain('export type TestArtifactVerificationResult =');
    expect(definition).not.toMatch(/kind:\s*'verified'/);
  });
});
