import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { corpusRefusals, mechanismVersion, type MechanismTree } from './corpus.js';

// Pursuit 2026-11-21b R16 slice 1 (syzygy-5dhm.74): the corpus file parses, every entry has a 40-hex commit and a shape no other entry
// has, every stratum, tier and trait is held, the seal holds, the cost baseline is the stored runs' medians, and each predicate fails
// on a mutated copy (rule 6). Expected values are literals (CC-TEST-3); the fixture digest was computed outside the module.
// Tier: unit (unlisted in vitest.tiers.ts). It reads files and starts no process.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const CORPUS = 'docs/polaris-generation/dossier-corpus-v1.json';
const MEASURE_NOW = 'docs/evidence/pursuit-2026-11-21b/measure-now.json';
/** The seal of corpus version 1. Editing a sealed member fails this test: write dossier-corpus-v2.json and a new adoption row instead. */
const SEAL_V1 = 'b68e7826af426bf8e60d8e6f0b23b5aa41f8a88d46a44fe29217add160cc4f10';

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
let corpus: Json;
const copy = (): Json => JSON.parse(JSON.stringify(corpus)) as Json;
const readJson = (file: string): Json => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8')) as Json;
const checkoutTree: MechanismTree = { list: (dir) => fs.readdirSync(path.join(ROOT, dir)), read: (file) => fs.readFileSync(path.join(ROOT, file)) };

beforeAll(() => { corpus = readJson(CORPUS); });

describe('dossier corpus v1: the file', () => {
  it('is a valid corpus with no refusal', () => {
    expect(corpusRefusals(corpus)).toEqual([]);
  });

  it('names at least six shapes, each entry with a 40-hex commit and a shape no other entry has', () => {
    const entries = corpus['entries'] as Json[];
    expect(entries.length).toBe(14);
    expect(entries.every((entry) => /^[0-9a-f]{40}$/u.test(entry['commit'] as string))).toBe(true);
    const shapes = entries.map((entry) => entry['shape'] as string);
    expect(new Set(shapes).size).toBe(shapes.length);
    expect(shapes.length).toBeGreaterThanOrEqual(6);
  });

  it('is sealed by the literal seal of version 1', () => {
    expect(corpus['seal']['sha256']).toBe(SEAL_V1);
  });

  it('holds the cost baseline the six stored runs give, and targets 0.7 of it', () => {
    const perRun = readJson(MEASURE_NOW)['figures']['f_stage_time_and_operator_actions']['perRun'] as Record<string, Json>;
    const median = (values: number[]): number => {
      const sorted = [...values].sort((a, b) => a - b);
      const mid = sorted.length / 2;
      return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[Math.floor(mid)]!;
    };
    const runs = Object.values(perRun);
    const cost = corpus['passRule']['costTargets'];
    expect(runs.length).toBe(cost['baseline']['runs']);
    expect(median(runs.map((run) => run['wallMinutesFirstToLastStep'] as number))).toBe(cost['baseline']['medianWallMinutes']);
    expect(median(runs.map((run) => (run['rounds'] as unknown[]).length))).toBe(cost['baseline']['medianReviewRounds']);
    expect([cost['baseline']['medianWallMinutes'], cost['baseline']['medianReviewRounds'], cost['targets']['medianWallMinutes']]).toEqual([44.75, 5, 31.325]);
    expect(runs.every((run) => run['operatorActionsObservable']['usageFiguresGivenAtClose'] === 0)).toBe(true);
    expect(cost['baseline']['medianTokens']).toBeNull();
  });

  it('budgets a pass by its own arithmetic', () => {
    const entries = corpus['entries'] as Json[];
    const budget = corpus['passBudget'];
    const publicEntries = entries.filter((entry) => entry['visibility'] === 'public').length;
    expect([entries.length * budget['runsPerEntry'], publicEntries]).toEqual([28, 13]);
    expect(entries.length * budget['runsPerEntry'] * (budget['perRun']['agentTokenBudget'] / 2)
      + publicEntries * budget['plainArm']['sessionsPerPublicEntry'] * budget['plainArm']['agentTokenBudget']).toBe(budget['perPass']['tokenBudget']);
  });

  it('pins the rule\'s binding parts: closed infra faults, two pinned plain sessions, frozen key, binding calibration, a target that gates nothing', () => {
    const budget = corpus['passBudget'];
    const rule = corpus['passRule'];
    expect((budget['infrastructureFaults']['faults'] as Json[]).map((fault) => fault['id']))
      .toEqual(['provider-unavailable', 'provider-throttled', 'host-interrupted', 'runner-defect']);
    expect([budget['plainArm']['sessionsPerPublicEntry'], budget['plainArm']['model'], budget['perPass']['tokenBudget']]).toEqual([2, 'claude-opus-5-5', 550_000_000]);
    expect(Object.keys(rule['key'])).toEqual(['author', 'when', 'frozen', 'minimumFacts', 'heldOut', 'comparison']);
    expect(rule['clauses'][0]['statement']).toContain('`closed` (not `closed-with-finding`');
    expect(rule['clauses'][0]['statement']).toContain('`derivedBlocking` false');
    expect(rule['calibration']['minimumRecall']).toBe(7);
    expect(rule['calibration']['statement']).toContain('at most `incomplete`');
    expect(rule['advantage']['target']['pooledOverallPoints']).toBe(10);
    expect(rule['advantage']['status']).toContain('never a pass condition');
  });

  it('takes the mechanism version over this checkout: every member names a file', () => {
    const version = mechanismVersion(corpus['mechanismVersion'], checkoutTree);
    expect(version.ok).toBe(true);
    if (!version.ok) return;
    expect(version.files.some((file) => file.path.endsWith('.test.ts') || file.path.endsWith('.testkit.ts'))).toBe(false);
    expect([...new Set(version.files.map((file) => file.group))].sort()).toEqual(['agent-texts', 'brief', 'check', 'draft-schema', 'renderer', 'screen']);
  });
});

describe('dossier corpus: each predicate refuses a mutated copy', () => {
  const refusalsAfter = (mutate: (value: Json) => void): string[] => { const value = copy(); mutate(value); return corpusRefusals(value); };
  const cases: readonly (readonly [string, (value: Json) => void, string])[] = [
    ['format', (v) => { v['format'] = 'other'; }, 'format is polaris-dossier-corpus/1'],
    ['short commit', (v) => { v['entries'][1]['commit'] = '6e83187b'; }, 'entry 2: commit is 40 lower-case hex digits'],
    ['upper-case commit', (v) => { v['entries'][1]['commit'] = (v['entries'][1]['commit'] as string).toUpperCase(); }, 'entry 2: commit is 40 lower-case hex digits'],
    ['duplicate shape', (v) => { v['entries'][2]['shape'] = v['entries'][1]['shape']; }, 'entry 3: shape python-library is already held by another entry'],
    ['duplicate id', (v) => { v['entries'][2]['id'] = 'C02'; }, 'entry 3: id C02 is already used'],
    ['repository', (v) => { v['entries'][0]['repository'] = 'redis/redis'; }, 'entry 1: repository is a GitHub URL, or synthetic:<name> for a synthetic fixture'],
    ['visibility', (v) => { v['entries'][0]['visibility'] = 'internal'; }, 'entry 1: visibility is one of public, private, synthetic'],
    ['licence', (v) => { v['entries'][0]['licence'] = ''; }, 'entry 1: licence is named'],
    ['missing stratum', (v) => { v['entries'][6]['strata'] = ['language:hcl']; }, 'no entry holds the stratum infrastructure-only'],
    ['tier mismatch', (v) => { v['entries'][0]['tier'] = 'M'; }, 'entry 1: tier M is not the tier of 21574480 bytes'],
    ['tier not held', (v) => { v['entries'] = (v['entries'] as Json[]).filter((e) => e['tier'] !== 'XL' || e['visibility'] === 'synthetic'); }, 'no surveyed entry is of tier XL'],
    ['no server trait', (v) => { for (const e of v['entries'] as Json[]) if (e['survey']) e['survey']['serverEntry'] = false; }, 'no surveyed entry holds the server-entry trait (the server shape pack)'],
    ['no default-only entry', (v) => { for (const e of v['entries'] as Json[]) if (e['survey']) e['survey']['serverEntry'] = true; }, 'no surveyed entry lacks the server-entry trait (the default shape pack alone)'],
    ['public entry with no survey', (v) => { v['entries'][0]['survey'] = null; }, 'entry 1: only a synthetic fixture has no survey'],
    ['survey field', (v) => { v['entries'][0]['survey']['packages'] = 'monorepo'; }, 'entry 1: survey needs packages as one of no-package-manifest, single-package, workspace'],
    ['tiers out of order', (v) => { v['tiers']['S'] = 1; }, 'tiers holds increasing positive byte bounds XS, S, M and L'],
    ['too few shapes', (v) => { v['entries'] = (v['entries'] as Json[]).slice(0, 5); }, 'the corpus names at least 6 shapes, not 5'],
    ['two stars', (v) => { v['mechanismVersion']['members'][0]['path'] = 'packages/*/src/*.ts'; }, 'mechanismVersion member 1 is a group and a distinct path with at most one * in its last segment'],
    ['repeated member', (v) => { v['mechanismVersion']['members'][1]['path'] = v['mechanismVersion']['members'][0]['path']; }, 'mechanismVersion member 2 is a group and a distinct path with at most one * in its last segment'],
    ['pass rule', (v) => { v['passRule'] = 'every shape closes'; }, 'passRule is an object'],
    ['seal covers', (v) => { v['seal']['covers'] = ['entries']; }, 'seal covers entries, tiers, mechanismVersion, passBudget, passRule and names a sha256'],
    ['sealed member edited', (v) => { v['passRule']['costTargets']['targets']['medianReviewRounds'] = 4; }, 'seal.sha256 is not the digest of the sealed members: a sealed member was edited, which needs a new corpus version'],
    ['budget edited', (v) => { v['passBudget']['runsPerEntry'] = 1; }, 'seal.sha256 is not the digest of the sealed members: a sealed member was edited, which needs a new corpus version'],
  ];
  it.each(cases)('%s', (_name, mutate, refusal) => {
    expect(refusalsAfter(mutate)).toContain(refusal);
  });

  it('an unsealed field outside the sealed members does not move the seal', () => {
    expect(refusalsAfter((v) => { v['status'] = 'a later note'; })).toEqual([]);
  });
});

describe('mechanismVersion over a fixture tree', () => {
  const files: Record<string, string> = { 'd/x.ts': 'X', 'd/y1.ts': 'Y', 'd/y1.test.ts': 'T', 'd/z.ts': 'Z' };
  const tree: MechanismTree = {
    list: (dir) => Object.keys(files).filter((file) => path.posix.dirname(file) === dir).map((file) => path.posix.basename(file)),
    read: (file) => new TextEncoder().encode(files[file]!),
  };
  const definition = (paths: readonly string[]) => ({
    format: 'polaris-dossier-mechanism/1' as const, excludeSuffixes: ['.test.ts'], members: paths.map((p, i) => ({ group: i === 0 ? 'a' : 'b', path: p })),
  });

  it('digests the format line and one line per file, sorted, leaving out excluded suffixes', () => {
    const version = mechanismVersion(definition(['d/x.ts', 'd/y*.ts']), tree);
    expect(version).toMatchObject({ ok: true, digest: '709c904e4a12d7898fe0efdabd6f95b5b2cd4001f707feaf624ac4c493488ce2' });
    if (version.ok) expect(version.files.map((file) => [file.group, file.path])).toEqual([['a', 'd/x.ts'], ['b', 'd/y1.ts']]);
  });

  it('moves when a member file changes and not when another file does', () => {
    const before = mechanismVersion(definition(['d/x.ts', 'd/y*.ts']), tree);
    files['d/z.ts'] = 'Z2';
    expect(mechanismVersion(definition(['d/x.ts', 'd/y*.ts']), tree)).toEqual(before);
    files['d/x.ts'] = 'X2';
    expect(mechanismVersion(definition(['d/x.ts', 'd/y*.ts']), tree)).not.toEqual(before);
    files['d/x.ts'] = 'X';
  });

  it('refuses a member that names no file', () => {
    expect(mechanismVersion(definition(['d/x.ts', 'd/w*.ts']), tree)).toEqual({ ok: false, reason: 'mechanism member d/w*.ts names no file' });
    expect(mechanismVersion(definition(['d/gone.ts']), tree)).toEqual({ ok: false, reason: 'mechanism member d/gone.ts names no file' });
  });
});
