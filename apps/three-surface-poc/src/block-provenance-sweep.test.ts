// POC-REQ-001 and POC-REQ-010 "One statement of provenance"
// (three-surface-poc-block-provenance-amendment-v1.0, syzygy-u05.19).
//
// The machine answer is `GET /api/poc`'s body, `JSON.stringify(model)`
// (routes.ts), so the sweep reads that serialization. Expected values come
// from git and the filesystem directly (the code-structure revision, a
// sampled file's size and digest) or are hand-typed literals the fixture's
// injected Dolt read returns (the Dolt revision, the capture instant); none is
// read back from the module under test. The provenance shape compared against
// is the one the same answer's entities carry.
//
// `violations()` is the signed oracle as one predicate per falsifier limb;
// the "falsifier" cases below put each limb's counterexample into a copy of a
// passing answer and require the oracle to name it (rule 6 at the predicate).
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { buildFixtureModel, fixtureRepoWithGit, fixtureWorkItemRow, FIXTURE_DOLT_REVISION } from './test-model-fixture.js';

const cleanups: string[] = [];
afterEach(() => {
  for (const directory of cleanups.splice(0)) rmSync(directory, { recursive: true, force: true });
});

/** The fixture's injected Dolt head and default evaluation instant, typed by hand. */
const DOLT_REVISION = FIXTURE_DOLT_REVISION;
const CAPTURE_INSTANT = '2026-08-30T12:00:00Z';
const SAMPLED_PATH = 'src/butlers/identity.py';

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Obj = { [key: string]: Json };

function git(root: string, args: readonly string[]): string {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function isObj(value: Json | undefined): value is Obj {
  return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);
}

/** Every leaf field under `value`, as [path, leaf]; the sweep's population. */
function leaves(value: Json, path = ''): [string, Json][] {
  if (Array.isArray(value)) return value.flatMap((member, index) => leaves(member, `${path}[${index}]`));
  if (isObj(value)) return Object.entries(value).flatMap(([key, member]) => leaves(member, path === '' ? key : `${path}.${key}`));
  return [[path, value]];
}

/** The provenance shape the answer's entities and relationships carry:
 * the keys every element has, and every key some element has. */
function sharedShape(answer: Obj): { required: Set<string>; allowed: Set<string> } {
  const elements: Obj[] = [];
  for (const list of ['entities', 'relationships']) {
    for (const holder of (answer[list] as Json[]) ?? []) {
      if (isObj(holder) && Array.isArray(holder.provenance)) elements.push(...holder.provenance.filter(isObj));
    }
  }
  const allowed = new Set(elements.flatMap((element) => Object.keys(element)));
  const required = new Set([...allowed].filter((key) => elements.every((element) => key in element)));
  return { required, allowed };
}

interface BlockSpec {
  readonly block: 'codeStructure' | 'workItems';
  readonly rows: 'files' | 'items';
  readonly revision: string;
  /** Row fields the database records (POC-REQ-010): left out of the capture-instant comparison. */
  readonly databaseTimes: readonly string[];
}

/** The signed oracle and falsifier, one message per violated limb. */
function violations(answer: Obj, spec: BlockSpec): string[] {
  const found: string[] = [];
  const observation = answer[spec.block];
  if (!isObj(observation) || observation.kind !== 'observed') return [`${spec.block} is not an observed observation`];
  const record = observation.provenance;
  const shape = sharedShape(answer);
  if (!isObj(record)) {
    found.push('no provenance record, or one in another shape');
  } else {
    const keys = Object.keys(record);
    if (shape.required.size === 0) found.push('the answer carries no entity provenance to compare the shape against');
    for (const key of shape.required) if (!(key in record)) found.push(`provenance record lacks shared-shape field ${key}`);
    for (const key of keys) if (!shape.allowed.has(key)) found.push(`provenance record has non-shared-shape field ${key}`);
    if (keys.some((key) => typeof record[key] !== 'string')) found.push('provenance record field is not a string');
    if (record.revision !== spec.revision) found.push(`provenance revision ${String(record.revision)} differs from ${spec.revision}`);
  }
  const swept = leaves(observation);
  const revisionHolders = swept.filter(([, value]) => value === spec.revision).map(([path]) => path);
  if (revisionHolders.join() !== 'provenance.revision') found.push(`fields holding the revision: [${revisionHolders.join(', ')}]`);
  const databaseTime = new RegExp(`^${spec.rows}\\[\\d+\\]\\.(?:${spec.databaseTimes.join('|') || '(?!)'})$`);
  const capturedAt = observation.capturedAt;
  const instantHolders = swept
    .filter(([path, value]) => value === CAPTURE_INSTANT && !databaseTime.test(path))
    .map(([path]) => path);
  if (capturedAt !== CAPTURE_INSTANT || instantHolders.join() !== 'capturedAt') {
    found.push(`fields holding the capture instant: [${instantHolders.join(', ')}]`);
  }
  return found;
}

const CODE: Omit<BlockSpec, 'revision'> = { block: 'codeStructure', rows: 'files', databaseTimes: [] };
const WORK: BlockSpec = { block: 'workItems', rows: 'items', revision: DOLT_REVISION, databaseTimes: ['createdAt', 'updatedAt', 'closedAt'] };

function servedAnswer(options: { readonly withInstantUpdate?: boolean } = {}): { answer: Obj; repoRoot: string; head: string } {
  const fixtureRepo = fixtureRepoWithGit(cleanups);
  const rows = [
    fixtureWorkItemRow('bu-open1', 'open', '2026-08-01T00:00:00Z', '2026-08-02T00:00:00Z', null),
    // A database-recorded time that equals the capture instant is a fact,
    // never a restatement (POC-REQ-010's exception).
    fixtureWorkItemRow('bu-closed1', 'closed', '2026-08-03T00:00:00Z', options.withInstantUpdate === true ? CAPTURE_INSTANT : '2026-08-04T00:00:00Z', options.withInstantUpdate === true ? CAPTURE_INSTANT : '2026-08-04T00:00:00Z'),
  ];
  const model = buildFixtureModel(cleanups, { fixtureRepo, workItemRows: rows, evaluationAsOf: CAPTURE_INSTANT });
  const answer = JSON.parse(JSON.stringify(model)) as Obj;
  return { answer, repoRoot: fixtureRepo.repoRoot, head: git(fixtureRepo.repoRoot, ['rev-parse', 'HEAD']) };
}

function clone(answer: Obj): Obj {
  return JSON.parse(JSON.stringify(answer)) as Obj;
}

function block(answer: Obj, name: 'codeStructure' | 'workItems'): Obj {
  return answer[name] as Obj;
}

function rowsOf(answer: Obj, name: 'codeStructure' | 'workItems'): Obj[] {
  return block(answer, name)[name === 'codeStructure' ? 'files' : 'items'] as Obj[];
}

describe('POC-REQ-001: the code-structure observation states its provenance once', () => {
  it('names git HEAD in one shared-shape record, and no other field holds the revision or the capture instant', () => {
    const { answer, repoRoot, head } = servedAnswer();
    const files = rowsOf(answer, 'codeStructure');
    // Denominator: the observation's own fields and the complete inventory.
    expect(files.length).toBe(git(repoRoot, ['ls-tree', '-r', '--name-only', head]).split('\n').length);
    expect(Object.keys(block(answer, 'codeStructure')).sort()).toEqual(['capturedAt', 'files', 'kind', 'provenance']);
    expect(Object.keys(block(answer, 'codeStructure').provenance as Obj).sort()).toEqual(['kind', 'revision', 'source']);
    expect(violations(answer, { ...CODE, revision: head })).toEqual([]);
  });

  it("a sampled entry's size and digest match stat and an independent digest at that commit", () => {
    const { answer, repoRoot, head } = servedAnswer();
    const sampled = rowsOf(answer, 'codeStructure').find((file) => file.path === SAMPLED_PATH);
    expect(sampled).toBeDefined();
    expect(sampled?.sizeBytes).toBe(statSync(join(repoRoot, SAMPLED_PATH)).size);
    expect(sampled?.sizeBytes).toBe(readFileSync(join(repoRoot, SAMPLED_PATH)).length);
    expect(sampled?.digest).toBe(`git-blob-sha1:${git(repoRoot, ['hash-object', SAMPLED_PATH])}`);
    expect(git(repoRoot, ['rev-parse', `${head}:${SAMPLED_PATH}`])).toBe(git(repoRoot, ['hash-object', SAMPLED_PATH]));
  });

  describe('falsifier: the oracle names each limb', () => {
    it('a provenance revision that differs from HEAD', () => {
      const { answer, head } = servedAnswer();
      const mutant = clone(answer);
      (block(mutant, 'codeStructure').provenance as Obj).revision = `${head.slice(0, -1)}0`;
      expect(violations(mutant, { ...CODE, revision: head }).join('\n')).toContain('provenance revision');
    });
    it('no provenance record', () => {
      const { answer, head } = servedAnswer();
      const mutant = clone(answer);
      delete block(mutant, 'codeStructure').provenance;
      expect(violations(mutant, { ...CODE, revision: head }).join('\n')).toContain('no provenance record');
    });
    it('the record in another shape (a list, or a field outside the shared shape)', () => {
      const { answer, head } = servedAnswer();
      const listed = clone(answer);
      block(listed, 'codeStructure').provenance = [block(listed, 'codeStructure').provenance as Obj];
      expect(violations(listed, { ...CODE, revision: head }).join('\n')).toContain('another shape');
      const widened = clone(answer);
      (block(widened, 'codeStructure').provenance as Obj).capturedAt = CAPTURE_INSTANT;
      expect(violations(widened, { ...CODE, revision: head }).join('\n')).toContain('non-shared-shape field capturedAt');
      const narrowed = clone(answer);
      delete (block(narrowed, 'codeStructure').provenance as Obj).source;
      expect(violations(narrowed, { ...CODE, revision: head }).join('\n')).toContain('lacks shared-shape field source');
    });
    it('another observation field holding the revision', () => {
      const { answer, head } = servedAnswer();
      const mutant = clone(answer);
      block(mutant, 'codeStructure').revision = head;
      expect(violations(mutant, { ...CODE, revision: head }).join('\n')).toContain('fields holding the revision: [provenance.revision, revision]');
    });
    it('an entry carrying the revision', () => {
      const { answer, head } = servedAnswer();
      const mutant = clone(answer);
      (rowsOf(mutant, 'codeStructure')[0] as Obj).revision = head;
      expect(violations(mutant, { ...CODE, revision: head }).join('\n')).toContain('files[0].revision');
    });
    it('an entry carrying the capture instant', () => {
      const { answer, head } = servedAnswer();
      const mutant = clone(answer);
      (rowsOf(mutant, 'codeStructure')[0] as Obj).observedAt = CAPTURE_INSTANT;
      expect(violations(mutant, { ...CODE, revision: head }).join('\n')).toContain('files[0].observedAt');
    });
  });
});

describe('POC-REQ-010: the work-item observation states its provenance once', () => {
  it('names the Dolt head in one shared-shape record, and no other field holds the revision or the capture instant', () => {
    const { answer } = servedAnswer();
    const items = rowsOf(answer, 'workItems');
    expect(items.map((item) => item.id)).toEqual(['bu-open1', 'bu-closed1']);
    expect(Object.keys(block(answer, 'workItems')).sort()).toEqual(['beadPrefix', 'capturedAt', 'governedByUnknownCount', 'items', 'kind', 'provenance', 'titles']);
    expect(Object.keys(block(answer, 'workItems').provenance as Obj).sort()).toEqual(['kind', 'revision', 'source']);
    expect(violations(answer, WORK)).toEqual([]);
  });

  it('a sampled item matches the database read', () => {
    const { answer } = servedAnswer();
    expect(rowsOf(answer, 'workItems').find((item) => item.id === 'bu-open1')).toEqual({
      // SEC-5 (syzygy-jytt): the read row's title is never served.
      id: 'bu-open1',
      status: 'open',
      issueType: 'task',
      priority: 1,
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-02T00:00:00Z',
      closedAt: null,
      // POC-REQ-014 (P-100): the governing-intent Unknown, not a provenance field.
      governedBy: {
        label: 'Unknown',
        closedReason: 'source-uncaptured-or-unreachable',
        resolutionRoutes: [{ reason: 'source-uncaptured-or-unreachable', route: 'Repair the observer/source; new snapshot', actor: 'operator', verb: 'repair', target: 'evaluation' }],
      },
    });
  });

  it("leaves an item's database-recorded times out of the capture-instant comparison", () => {
    const { answer } = servedAnswer({ withInstantUpdate: true });
    const closed = rowsOf(answer, 'workItems').find((item) => item.id === 'bu-closed1');
    expect(closed?.updatedAt).toBe(CAPTURE_INSTANT);
    expect(closed?.closedAt).toBe(CAPTURE_INSTANT);
    expect(violations(answer, WORK)).toEqual([]);
  });

  describe('falsifier: the oracle names each limb', () => {
    it('a provenance revision that differs from the Dolt head', () => {
      const { answer } = servedAnswer();
      const mutant = clone(answer);
      (block(mutant, 'workItems').provenance as Obj).revision = 'dolt-other-revision';
      expect(violations(mutant, WORK).join('\n')).toContain('provenance revision dolt-other-revision differs');
    });
    it('no provenance record', () => {
      const { answer } = servedAnswer();
      const mutant = clone(answer);
      delete block(mutant, 'workItems').provenance;
      expect(violations(mutant, WORK).join('\n')).toContain('no provenance record');
    });
    it('the record in another shape', () => {
      const { answer } = servedAnswer();
      const mutant = clone(answer);
      block(mutant, 'workItems').provenance = { doltRevision: DOLT_REVISION };
      const found = violations(mutant, WORK).join('\n');
      expect(found).toContain('non-shared-shape field doltRevision');
      expect(found).toContain('lacks shared-shape field revision');
    });
    it('another observation field holding the Dolt revision', () => {
      const { answer } = servedAnswer();
      const mutant = clone(answer);
      block(mutant, 'workItems').doltRevision = DOLT_REVISION;
      expect(violations(mutant, WORK).join('\n')).toContain('fields holding the revision: [provenance.revision, doltRevision]');
    });
    it('a work-item fact carrying the Dolt revision', () => {
      const { answer } = servedAnswer();
      const mutant = clone(answer);
      (rowsOf(mutant, 'workItems')[1] as Obj).doltRevision = DOLT_REVISION;
      expect(violations(mutant, WORK).join('\n')).toContain('items[1].doltRevision');
    });
    it('a work-item fact carrying the capture instant outside a database time', () => {
      const { answer } = servedAnswer();
      const mutant = clone(answer);
      (rowsOf(mutant, 'workItems')[0] as Obj).observedAt = CAPTURE_INSTANT;
      expect(violations(mutant, WORK).join('\n')).toContain('items[0].observedAt');
    });
    it('an observation without its own capture instant', () => {
      const { answer } = servedAnswer();
      const mutant = clone(answer);
      delete block(mutant, 'workItems').capturedAt;
      expect(violations(mutant, WORK).join('\n')).toContain('fields holding the capture instant: []');
    });
  });
});
