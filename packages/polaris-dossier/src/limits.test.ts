import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { GitObjectReadRefusal, type VerifiedBlob } from './git-object-reader.js';
import { deriveLimits, limitsUnknown, type LimitsAndDefaults } from './limits.js';
import { buildDossierScreen, type DossierScreen } from './screen.js';

// syzygy-5dhm.116 (REQ-polaris-generation-034 version 2.51): the limitsAndDefaults member from a tree listing, the bound policy's screen and
// a reader double that fails the test on any path the stated dispositions do not read. Expected members, counts and rows are literals
// written from the fixture before the driver ran. Planted secret values are fake and assembled from pieces.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const POLICY_V2 = new Uint8Array(readFileSync(path.join(ROOT, '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2.json')));
const SUBJECT = { repository: 'repository:o-r', commit: 'a'.repeat(40) };
const SECRET_NAME = ['gh', 'p_', 'k'.repeat(36)].join('');

let V2: DossierScreen;
beforeAll(() => {
  const load = buildDossierScreen(POLICY_V2, true, SUBJECT, 'public');
  if (!load.ok) throw new Error(load.why);
  V2 = load.screen;
});

const idOf = (p: string): string => createHash('sha1').update(p).digest('hex');
type Tree = Record<string, string | { readonly mode: string }>;
function fixture(tree: Tree, mayRead: readonly string[], refuse: readonly string[] = []) {
  const asked: string[] = [];
  const calls: (readonly string[])[] = [];
  const blobs = new Map<string, Uint8Array>();
  const entries = Object.entries(tree).map(([p, v]) => ({ path: p, mode: typeof v === 'object' ? v.mode : '100644', id: idOf(p) }));
  const readMany = async (paths: readonly string[]): Promise<readonly VerifiedBlob[]> => {
    calls.push(paths);
    return paths.map((p) => {
      asked.push(p);
      if (!mayRead.includes(p)) throw new Error(`the reader double was asked for ${JSON.stringify(p)}, which the dispositions do not read`);
      if (refuse.includes(p)) throw new GitObjectReadRefusal('corrupt-object', 'refused by the double');
      return { path: p, mode: '100644', id: idOf(p), bytes: blobs.get(p) ?? new TextEncoder().encode(tree[p] as string) };
    });
  };
  return { entries, readMany, asked, calls, blobs };
}
const derive = (f: ReturnType<typeof fixture>, consented: readonly string[] | null = null): Promise<LimitsAndDefaults> =>
  deriveLimits({ entries: f.entries, screen: V2, consented, readMany: f.readMany });
const derived = (m: LimitsAndDefaults) => { if (m.state !== 'derived') throw new Error('expected a derived member'); return m; };
const observedFile = (p: string, source: 'code' | 'config', rows: number, valuesLeftOut = 0) => ({ path: p, source, epistemic: 'observed', unknownReason: null, parseFault: null, rows, valuesLeftOut });
const unknownFile = (p: string, source: 'code' | 'config', unknownReason: string, parseFault: string | null = null) => ({ path: p, source, epistemic: 'unknown', unknownReason, parseFault, rows: null, valuesLeftOut: null });

const TREE: Tree = {
  'setup.py': 'MAX_WORKERS = 4\n# MAX_COMMENTED = 1\n',
  'pkg/net.py': 'READ_TIMEOUT = 2.5\nDEFAULT_HOST = "localhost"\nMAX_SIZE = size_of()\n',
  'web/src/limits.ts': 'export const UPLOAD_LIMIT = 10 * 1024 * 1024;\nconst s = "MAX_IN_STRING = 1";\n',
  'src/server.h': '#define PROTO_MAX_BULK (512*1024*1024)\n',
  'charts/app/values.yaml': 'replicaCount: 2\nservice:\n  port: 8080\n',
  'redis.conf': 'maxmemory 2gb\n',
  'README.md': 'MAX_DOC = 1\n',
};
const READ = ['charts/app/values.yaml', 'pkg/net.py', 'setup.py', 'src/server.h', 'web/src/limits.ts'];

describe('limitsAndDefaults: limit-default v1 under declared-source policy 2.0.0', () => {
  it('admits the fixture paths it reads, and excludes the ini configuration path by its class (precondition)', () => {
    for (const p of READ) expect(V2.screenPath(p)).toBeUndefined();
    expect(V2.screenPath('redis.conf')).toBe('unknown-extraction-class');
  });

  it('lists each limit and default with its value, path, line and unit, and counts them per unit', async () => {
    const f = fixture(TREE, READ);
    const m = derived(await derive(f));
    expect([...f.asked].sort()).toEqual(READ);
    expect(f.calls.length).toBe(1);
    expect(m.format).toBe('polaris-dossier-limits-and-defaults/1');
    expect(m.unitRule).toEqual({ rule: 'top-level-unit', ruleVersion: 1 });
    const r = m.recognizer;
    expect([r.rule, r.ruleVersion, r.candidates, r.secretPathsLeftOut, r.setApart, r.observed, r.unknown, r.valuesLeftOut, r.sequenceItemsNotRead, r.rows])
      .toEqual(['limit-default', 1, 6, 0, 0, 5, 1, 0, 0, 8]);
    expect(r.files).toEqual([
      observedFile('charts/app/values.yaml', 'config', 2), observedFile('pkg/net.py', 'code', 3), observedFile('setup.py', 'code', 1),
      observedFile('src/server.h', 'code', 1), observedFile('web/src/limits.ts', 'code', 1), unknownFile('redis.conf', 'config', 'unknown-extraction-class'),
    ]);
    expect(m.rows.map((k) => [k.id, k.source, k.kind, k.name, k.value, k.valueType, k.path, k.line, k.unit, k.quote, k.epistemic, k.unknownReason])).toEqual([
      ['_limit-1', 'config', 'entry', 'replicaCount', '2', 'integer', 'charts/app/values.yaml', 1, 'charts', 'replicaCount: 2', 'observed', null],
      ['_limit-2', 'config', 'entry', 'service.port', '8080', 'integer', 'charts/app/values.yaml', 3, 'charts', 'port: 8080', 'observed', null],
      ['_limit-3', 'code', 'timeout', 'READ_TIMEOUT', '2.5', 'decimal', 'pkg/net.py', 1, 'pkg', 'READ_TIMEOUT = 2.5', 'observed', null],
      ['_limit-4', 'code', 'default', 'DEFAULT_HOST', '"localhost"', 'string', 'pkg/net.py', 2, 'pkg', 'DEFAULT_HOST = "localhost"', 'observed', null],
      ['_limit-5', 'code', 'max', 'MAX_SIZE', null, null, 'pkg/net.py', 3, 'pkg', 'MAX_SIZE = size_of()', 'unknown', 'value-not-literal'],
      ['_limit-6', 'code', 'max', 'MAX_WORKERS', '4', 'integer', 'setup.py', 1, null, 'MAX_WORKERS = 4', 'observed', null],
      ['_limit-7', 'code', 'max', 'PROTO_MAX_BULK', '(512*1024*1024)', 'expression', 'src/server.h', 1, 'src', '#define PROTO_MAX_BULK (512*1024*1024)', 'observed', null],
      ['_limit-8', 'code', 'limit', 'UPLOAD_LIMIT', '10 * 1024 * 1024', 'expression', 'web/src/limits.ts', 1, 'web', 'export const UPLOAD_LIMIT = 10 * 1024 * 1024;', 'observed', null],
    ]);
    expect(m.rows[0]!.blob).toBe(idOf('charts/app/values.yaml'));
    expect(m.units).toEqual([
      { unit: null, files: 1, constants: 1, entries: 0, valuesUnknown: 0 },
      { unit: 'charts', files: 1, constants: 0, entries: 2, valuesUnknown: 0 },
      { unit: 'pkg', files: 1, constants: 3, entries: 0, valuesUnknown: 1 },
      { unit: 'src', files: 1, constants: 1, entries: 0, valuesUnknown: 0 },
      { unit: 'web', files: 1, constants: 1, entries: 0, valuesUnknown: 0 },
    ]);
    expect([m.unitsNotListed, m.rowsNotListed]).toEqual([0, 0]);
    const text = JSON.stringify(m);
    for (const word of ['MAX_COMMENTED', 'MAX_IN_STRING', 'MAX_DOC', 'maxmemory']) expect(text).not.toContain(word);
  });

  it('leaves a secret path out unnamed, sets apart vendored and generated paths, and names the rest Unknown with their reasons', async () => {
    const secret = `keys/${SECRET_NAME}/k.py`;
    const tree: Tree = {
      [secret]: 'MAX_A = 1\n', 'vendor/x/v.py': 'MAX_A = 1\n', 'dist/a.js': 'const MAX_A = 1;\n',
      'src/link.py': { mode: '120000' }, 'src/open.py': 'x = """\n', 'src/refused.py': 'MAX_A = 1\n',
      'src/bytes.py': '', 'src/secret.py': `MAX_A = 1\nt = "${SECRET_NAME}"\n`, 'chart/values.yaml': 'a: &x 1\n',
    };
    const readable = ['chart/values.yaml', 'src/bytes.py', 'src/open.py', 'src/refused.py', 'src/secret.py'];
    const f = fixture(tree, readable, ['src/refused.py']);
    f.blobs.set('src/bytes.py', new Uint8Array([0xff]));
    const m = derived(await derive(f));
    const r = m.recognizer;
    expect([r.candidates, r.secretPathsLeftOut, r.setApart, r.observed, r.unknown, r.rows]).toEqual([9, 1, 2, 0, 6, 0]);
    expect(r.files).toEqual([
      unknownFile('chart/values.yaml', 'config', 'unparsed', 'outside-grammar'), unknownFile('src/bytes.py', 'code', 'not-utf8-text'),
      unknownFile('src/open.py', 'code', 'unparsed', 'unterminated'), unknownFile('src/refused.py', 'code', 'object-read-refused'),
      unknownFile('src/secret.py', 'code', 'secret-detector-match'), unknownFile('src/link.py', 'code', 'symbolic-link'),
    ]);
    // The batch was refused for one path, so each path was read again in a call of its own.
    expect(f.calls.map((c) => c.length)).toEqual([5, 1, 1, 1, 1, 1]);
    expect(m.units).toEqual([]);
    const text = JSON.stringify(m);
    for (const word of [SECRET_NAME, 'keys', 'vendor', 'dist/']) expect(text).not.toContain(word);
  });

  it('withholds configuration whose body the screen excludes as active content, Unknown and with no row', async () => {
    const f = fixture({ 'values.yaml': 'note: <script>alert(1)</script>\nmax: 3\n' }, ['values.yaml']);
    const m = derived(await derive(f));
    expect(m.recognizer.files).toEqual([unknownFile('values.yaml', 'config', 'active-content')]);
    expect(m.rows).toEqual([]);
  });

  it('withholds a class the run\'s statement does not list, unread', async () => {
    const f = fixture({ 'src/a.py': 'MAX_A = 1\n' }, []);
    const m = derived(await derive(f, ['project-documentation']));
    expect(m.recognizer.files).toEqual([unknownFile('src/a.py', 'code', 'class-not-consented')]);
    expect(f.asked).toEqual([]);
  });

  it('leaves out and counts a row whose line the value checks refuse', async () => {
    const f = fixture({ 'a.py': `MAX_LONG = "${'x'.repeat(250)}"\nMAX_TAB =\t1\nMAX_KEPT = 1\n` }, ['a.py']);
    const m = derived(await derive(f));
    expect(m.recognizer.files).toEqual([observedFile('a.py', 'code', 1, 2)]);
    expect(m.rows.map((k) => k.quote)).toEqual(['MAX_KEPT = 1']);
  });

  it('names a path past the path limit and an over-large body Unknown', async () => {
    const long = `src/${'p'.repeat(520)}.py`;
    const f = fixture({ [long]: 'MAX_A = 1\n', 'src/big.py': 'MAX_A = 1\n' }, ['src/big.py']);
    f.blobs.set('src/big.py', new Uint8Array(1_048_577));
    const m = derived(await derive(f));
    expect(m.recognizer.files.map((file) => [file.unknownReason, file.path.length > 512 ? 'long' : file.path])).toEqual([['too-large', 'src/big.py'], ['path-not-citable', 'long']]);
  });

  it('reads at most 1000 source files, 64 to a call, and at most 250 configuration files', async () => {
    const tree: Tree = {};
    for (let k = 0; k < 1001; k++) tree[`f${String(k).padStart(4, '0')}.py`] = 'MAX_A = 1\n';
    for (let k = 0; k < 251; k++) tree[`c${String(k).padStart(3, '0')}/values.yaml`] = 'a: 1\n';
    const all = Object.keys(tree).sort();
    const reads = [...all.filter((p) => p.startsWith('c')).slice(0, 250), ...all.filter((p) => p.startsWith('f')).slice(0, 1000)];
    const f = fixture(tree, reads);
    const m = derived(await derive(f));
    const r = m.recognizer;
    expect([r.candidates, r.observed, r.unknown, r.rows, r.files.length, r.filesNotListed]).toEqual([1252, 1250, 2, 1250, 1000, 252]);
    expect(f.asked.length).toBe(1250);
    expect(f.asked).not.toContain('f1000.py');
    expect(f.asked).not.toContain('c250/values.yaml');
    expect(f.calls.map((c) => c.length)).toEqual([...Array<number>(19).fill(64), 34]);
  });

  it('lists the first 2000 rows and counts every one', async () => {
    const f = fixture({ 'a.py': 'MAX_A = 1\n'.repeat(2001) }, ['a.py']);
    const m = derived(await derive(f));
    expect([m.rows.length, m.rowsNotListed, m.rows.at(-1)!.id, m.rows.at(-1)!.line, m.units[0]!.constants]).toEqual([2000, 1, '_limit-2000', 2000, 2001]);
  });

  it('lists the first 250 units and counts the rest', async () => {
    const tree: Tree = {};
    for (let k = 0; k < 251; k++) tree[`d${String(k).padStart(3, '0')}/a.py`] = 'MAX_A = 1\n';
    const m = derived(await derive(fixture(tree, Object.keys(tree))));
    expect([m.units.length, m.unitsNotListed, m.units.at(-1)!.unit, m.recognizer.rows]).toEqual([250, 1, 'd249', 251]);
  });

  it('counts sequence items not read, and keeps a unit whose files read hold no row', async () => {
    const tree: Tree = { 'deploy/values.yaml': 'args:\n  - a\n  - b\n', 'lib/empty.py': 'x = 1\n' };
    const m = derived(await derive(fixture(tree, ['deploy/values.yaml', 'lib/empty.py'])));
    expect([m.recognizer.observed, m.recognizer.sequenceItemsNotRead, m.recognizer.rows, m.rows]).toEqual([2, 2, 0, []]);
    expect(m.units).toEqual([
      { unit: 'deploy', files: 1, constants: 0, entries: 0, valuesUnknown: 0 },
      { unit: 'lib', files: 1, constants: 0, entries: 0, valuesUnknown: 0 },
    ]);
  });

  it('passes on a reader error that is no refusal, never reading the batch again path by path', async () => {
    const f = fixture({ 'a.py': 'MAX_A = 1\n', 'b.py': 'MAX_B = 2\n' }, ['a.py', 'b.py']);
    const readMany = (paths: readonly string[]) => (paths.length > 1 ? Promise.reject(new Error('the store closed')) : f.readMany(paths));
    await expect(deriveLimits({ entries: f.entries, screen: V2, consented: null, readMany })).rejects.toThrow('the store closed');
  });

  it('leaves out a row whose quoted line the secret detectors match, though its body was admitted', async () => {
    const f = fixture({ 'a.py': 'MAX_A = 1\nMAX_B = 2\n' }, ['a.py']);
    const screen: DossierScreen = { ...V2, screenBody: (text: string) => (text.includes('MAX_B') ? 'secret-detector-match' : V2.screenBody(text)) };
    const m = derived(await deriveLimits({ entries: f.entries, screen, consented: null, readMany: f.readMany }));
    expect(m.rows.map((k) => k.name)).toEqual(['MAX_A']);
    expect([m.recognizer.valuesLeftOut, m.recognizer.files[0]!.valuesLeftOut]).toEqual([1, 1]);
  });

  it('states the member Unknown when the tree cannot be listed', () => {
    expect(limitsUnknown('tree-refused')).toEqual({ format: 'polaris-dossier-limits-and-defaults/1', state: 'unknown', why: 'the pinned tree could not be listed (tree-refused)' });
  });
});
