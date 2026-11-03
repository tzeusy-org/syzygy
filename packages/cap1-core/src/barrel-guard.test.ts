import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import * as barrel from './index.js';
import * as testing from './testing.js';

// syzygy-bpyt.7.8: the test-support entry (`@syzygy/cap1-core/testing`) stays out of production. Rule-6 mutant E05 of PR #498
// (re-exporting write-boundary.js from the barrel) survived every conformance and daemon test, so the reachability sweep was a
// one-time measurement; these two checks stand in for it.

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

// The testing entry's runtime names, as literals: an emptied or renamed entry must fail here, not make the barrel check vacuous.
const TESTING_ENTRY_NAMES = [
  'CAPABILITY_1_EXTERNAL_EFFECTS', 'WIDENING_FIELD_NAMES', 'authorizeWrite', 'canonicalTupleMultiset', 'compareRenderings',
  'detectWideningFields', 'disclosureOf', 'fullDisclosure', 'reportEffectBoundary',
];

// Source trees whose non-test modules may import the testing entry: the conformance suite and the system suite are test suites
// whose support modules (fixtures) build on it.
const EXCLUDED_SOURCE_TREES = ['packages/cap1-conformance/src', 'packages/cap1-system/src'];

// An import, a re-export or a dynamic import/require of the entry's specifier. A comment that names the entry is not one.
const TESTING_ENTRY_IMPORT = /(?:\bfrom|\bimport|\brequire)\s*\(?\s*(['"`])@syzygy\/cap1-core\/testing\1/;

function sourceTrees(): string[] {
  return ['packages', 'apps'].flatMap((group) =>
    readdirSync(join(repoRoot, group), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => `${group}/${entry.name}/src`),
  ).filter((tree) => !EXCLUDED_SOURCE_TREES.includes(tree));
}

function tsFiles(dir: string): string[] {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return tsFiles(path);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') ? [path] : [];
  });
}

describe('cap1-core test-support entry', () => {
  it('exports the names the barrel must never carry', () => {
    expect(Object.keys(testing).sort()).toEqual(TESTING_ENTRY_NAMES);
  });

  it('shares no exported name with the package barrel', () => {
    const barrelNames = new Set(Object.keys(barrel));
    expect(TESTING_ENTRY_NAMES.filter((name) => barrelNames.has(name))).toEqual([]);
  });

  it('is imported by no non-test module outside the conformance and system suites', () => {
    const trees = sourceTrees();
    // The denominator: the walk must reach the trees that hold the entry's real consumers' neighbours, not an empty set.
    expect(trees).toContain('packages/cap1-daemon/src');
    expect(trees).toContain('apps/three-surface-poc/src');
    const files = trees.flatMap((tree) => tsFiles(join(repoRoot, tree)));
    expect(files.length).toBeGreaterThan(100);
    const importers = files
      .filter((file) => readFileSync(file, 'utf8').split('\n').some((line) => TESTING_ENTRY_IMPORT.test(line)))
      .map((file) => relative(repoRoot, file));
    expect(importers).toEqual([]);
  });
});
