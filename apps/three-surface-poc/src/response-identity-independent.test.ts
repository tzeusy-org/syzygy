import { createHash } from 'node:crypto';
import { rmSync } from 'node:fs';

import { afterEach, describe, expect, it } from 'vitest';

import type { PocModel } from '@syzygy/three-surface-poc-core';

import { buildFixtureModel, fixtureRepoWithGit } from './test-model-fixture.js';
import {
  ADMITTING_AUTHORITY,
  PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC,
  projectShapeFixtureGit,
} from './test-project-shape-fixture.js';
import { walkthroughJudgmentFixture } from './test-walkthrough-judgment-fixture.js';

const cleanups: string[] = [];
afterEach(() => {
  for (const directory of cleanups.splice(0)) rmSync(directory, { recursive: true, force: true });
});

// Independent copy of the response-identity declaration. This test must
// fail if production drops, adds, or renames a path, without importing the
// production declaration or path walker.
const EXCLUDES = [
  'codeStructure.capturedAt',
  'evaluation.asOf',
  'projectShape.authority.evaluationId',
  'projectShape.authority.evaluationInstant',
  'projectShape.claim.evaluationId',
  'projectShape.classes.baseline-spec.claim.evaluationId',
  'projectShape.classes.catalog-entry.claim.evaluationId',
  'projectShape.classes.craft-policy.claim.evaluationId',
  'projectShape.classes.design-contract.claim.evaluationId',
  'projectShape.classes.principle.claim.evaluationId',
  'projectShape.classes.project-account-section.claim.evaluationId',
  'projectShape.classes.roster-identity.claim.evaluationId',
  'projectShape.classes.success-criterion.claim.evaluationId',
  'projectShape.classes.topology-component.claim.evaluationId',
  'projectShape.facts[].claim.evaluationId',
  'projectShape.identity.capturedAt',
  'projectShape.identity.deterministicInputs.authority.evaluationId',
  'projectShape.items[].claim.evaluationId',
  'projectShape.projectAccount[].claim.evaluationId',
  'projectShape.sources[].claim.evaluationId',
  'projectShape.sources[].stamp.capturedAt',
  'proposedWork.currentAuthority.claim.evaluationId',
  'walkthroughJudgment.evaluation.evaluationId',
  'walkthroughJudgment.evaluation.evaluationInstant',
  'workItems.capturedAt',
] as const;

const FIRST_AS_OF = '2026-09-06T10:00:00Z';
const SECOND_AS_OF = '2026-09-06T10:01:00Z';

function completeModels(): readonly [PocModel, PocModel] {
  const fixtureRepo = fixtureRepoWithGit(cleanups);
  const common = {
    fixtureRepo,
    projectShape: {
      authority: ADMITTING_AUTHORITY,
      runGit: projectShapeFixtureGit(PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC),
    },
    walkthroughJudgment: walkthroughJudgmentFixture('lawful-state-2'),
  } as const;
  return [
    buildFixtureModel(cleanups, { ...common, evaluationAsOf: FIRST_AS_OF }),
    buildFixtureModel(cleanups, { ...common, evaluationAsOf: SECOND_AS_OF }),
  ];
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function canonicalJsonIndependent(value: unknown): string {
  const canonicalize = (candidate: unknown): unknown => {
    if (Array.isArray(candidate)) return candidate.map(canonicalize);
    if (candidate !== null && typeof candidate === 'object') {
      const record = candidate as Record<string, unknown>;
      return Object.fromEntries(
        Object.keys(record)
          .filter((key) => record[key] !== undefined)
          .sort()
          .map((key) => [key, canonicalize(record[key])]),
      );
    }
    return candidate;
  };
  return JSON.stringify(canonicalize(value));
}

function normalized(path: string): string {
  return path.replace(/\[\d+\]/g, '[]');
}

function instantPaths(value: unknown, instants: readonly string[], path = '', out = new Set<string>()): Set<string> {
  if (typeof value === 'string') {
    if (instants.some((instant) => value.includes(instant))) out.add(normalized(path));
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => instantPaths(item, instants, `${path}[${index}]`, out));
    return out;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      instantPaths(child, instants, path === '' ? key : `${path}.${key}`, out);
    }
  }
  return out;
}

interface Segment {
  readonly key: string;
  readonly all: boolean;
}

function parsePath(path: string): readonly Segment[] {
  return path.split('.').map((raw) => ({
    key: raw.endsWith('[]') ? raw.slice(0, -2) : raw,
    all: raw.endsWith('[]'),
  }));
}

function deletePath(root: Record<string, unknown>, path: string): boolean {
  const segments = parsePath(path);
  const remove = (value: unknown, index: number): boolean => {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
    const record = value as Record<string, unknown>;
    const segment = segments[index];
    if (segment === undefined || !(segment.key in record)) return false;
    if (index === segments.length - 1) {
      delete record[segment.key];
      return true;
    }
    const child = record[segment.key];
    if (segment.all) {
      if (!Array.isArray(child)) throw new Error(`independent census path ${path} expected an array`);
      return child.reduce((found, member) => remove(member, index + 1) || found, false);
    }
    return remove(child, index + 1);
  };
  return remove(root, 0);
}

function setPath(root: Record<string, unknown>, path: string, value: string): void {
  const segments = parsePath(path);
  const assign = (current: unknown, index: number): void => {
    if (current === null || typeof current !== 'object' || Array.isArray(current)) throw new Error(`independent census path ${path} cannot be assigned`);
    const record = current as Record<string, unknown>;
    const segment = segments[index];
    if (segment === undefined) throw new Error(`independent census path ${path} is empty`);
    if (index === segments.length - 1) {
      record[segment.key] = value;
      return;
    }
    const child = record[segment.key];
    if (segment.all) {
      if (!Array.isArray(child)) throw new Error(`independent census path ${path} expected an array`);
      child.forEach((member) => assign(member, index + 1));
      return;
    }
    assign(child, index + 1);
  };
  assign(root, 0);
}

function stampedFixtureBodies(): readonly [Record<string, unknown>, Record<string, unknown>] {
  const [first, second] = completeModels();
  const left = cloneJson(first) as unknown as Record<string, unknown>;
  const right = cloneJson(second) as unknown as Record<string, unknown>;
  for (const path of EXCLUDES) {
    setPath(left, path, FIRST_AS_OF);
    setPath(right, path, SECOND_AS_OF);
  }
  return [left, right];
}

function bodyAfterExclusions(model: unknown, excludes: readonly string[]): { readonly body: Record<string, unknown>; readonly resolved: readonly string[] } {
  const body = cloneJson(model) as unknown as Record<string, unknown>;
  const identity = body.responseIdentity as { contentKey?: string };
  delete identity.contentKey;
  const resolved = excludes.filter((path) => deletePath(body, path));
  return { body, resolved };
}

function independentKey(model: unknown, excludes: readonly string[]): { readonly key: string; readonly body: Record<string, unknown>; readonly resolved: readonly string[] } {
  const result = bodyAfterExclusions(model, excludes);
  return {
    key: `sha256:${createHash('sha256').update(canonicalJsonIndependent(result.body)).digest('hex')}`,
    body: result.body,
    resolved: result.resolved,
  };
}

function firstDifference(left: unknown, right: unknown, path = ''): string | undefined {
  if (Object.is(left, right)) return undefined;
  if (Array.isArray(left) && Array.isArray(right)) {
    for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
      const difference = firstDifference(left[index], right[index], `${path}[${index}]`);
      if (difference !== undefined) return difference;
    }
    return undefined;
  }
  if (left !== null && right !== null && typeof left === 'object' && typeof right === 'object') {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    for (const key of keys) {
      const difference = firstDifference(
        (left as Record<string, unknown>)[key],
        (right as Record<string, unknown>)[key],
        path === '' ? key : `${path}.${key}`,
      );
      if (difference !== undefined) return difference;
    }
    return undefined;
  }
  return path;
}

function assertStable(left: unknown, right: unknown, excludes: readonly string[]): void {
  const first = independentKey(left, excludes);
  const second = independentKey(right, excludes);
  if (first.key !== second.key) {
    throw new Error(`response identity stability failed at ${firstDifference(first.body, second.body) ?? '<unknown>'}`);
  }
}

describe('response identity independent census and mutation proofs', () => {
  it('maps both evaluation instants to exactly the 25 declared structural paths, with no 26th path', () => {
    const [first, second] = stampedFixtureBodies();
    const paths = new Set([
      ...instantPaths(JSON.parse(JSON.stringify(first)), [FIRST_AS_OF, SECOND_AS_OF]),
      ...instantPaths(JSON.parse(JSON.stringify(second)), [FIRST_AS_OF, SECOND_AS_OF]),
    ]);
    expect([...paths].sort()).toEqual([...EXCLUDES].sort());
    expect(paths.size).toBe(25);
  });

  it('removing each exercised exclusion makes the independent stability oracle fail and names that path', () => {
    const [first, second] = stampedFixtureBodies();
    const baseline = independentKey(first, EXCLUDES);
    expect(baseline.resolved).toEqual([...EXCLUDES]);
    for (const omitted of EXCLUDES) {
      const remaining = EXCLUDES.filter((path) => path !== omitted);
      const firstMutant = independentKey(first, remaining);
      const secondMutant = independentKey(second, remaining);
      expect(firstMutant.key, `omitted exercised exclusion: ${omitted}`).not.toBe(secondMutant.key);
      expect(firstDifference(firstMutant.body, secondMutant.body), `omitted exercised exclusion: ${omitted}`).toBeDefined();
    }
  });

  it('fails stability on an undeclared instant and names the injected structural path', () => {
    const [first, second] = stampedFixtureBodies();
    const left = cloneJson(first) as unknown as PocModel & { runtime?: { unlistedInstant?: string } };
    const right = cloneJson(second) as unknown as PocModel & { runtime?: { unlistedInstant?: string } };
    left.runtime = { unlistedInstant: FIRST_AS_OF };
    right.runtime = { unlistedInstant: SECOND_AS_OF };
    expect(() => assertStable(left, right, EXCLUDES)).toThrow('runtime.unlistedInstant');
  });

  it('serves the content key of the very body it is served with', () => {
    const [model] = completeModels();
    expect(model.responseIdentity.contentKey).toBe(independentKey(model, EXCLUDES).key);
  });
});
