import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { GitObjectReadRefusal, type VerifiedBlob } from './git-object-reader.js';
import { buildDossierScreen, type DossierScreen } from './screen.js';
import { deriveTestNames, testNamesUnknown, type TestNames } from './test-names.js';

// syzygy-5dhm.45 (REQ-polaris-generation-034 version 2.35): the testNames member from a tree listing, the bound policy's screen and a
// reader double that fails the test on any path the stated dispositions do not read. Expected members, counts and names are literals
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
  const entries = Object.entries(tree).map(([p, v]) => ({ path: p, mode: typeof v === 'object' ? v.mode : '100644', id: idOf(p) }));
  const read = async (p: string): Promise<VerifiedBlob> => {
    asked.push(p);
    if (!mayRead.includes(p)) throw new Error(`the reader double was asked for ${JSON.stringify(p)}, which the dispositions do not read`);
    if (refuse.includes(p)) throw new GitObjectReadRefusal('corrupt-object', 'refused by the double');
    return { path: p, mode: '100644', id: '0'.repeat(40), bytes: new TextEncoder().encode(tree[p] as string) };
  };
  return { entries, read, asked };
}
const derive = (f: ReturnType<typeof fixture>, consented: readonly string[] | null = null): Promise<TestNames> =>
  deriveTestNames({ entries: f.entries, screen: V2, consented, read: f.read });
const derived = (m: TestNames) => { if (m.state !== 'derived') throw new Error('expected a derived member'); return m; };
const entryOf = (m: ReturnType<typeof derived>, rule: string) => m.recognizers.find((r) => r.rule === rule)!;
const inferredFile = (p: string, names: number, valuesLeftOut = 0) => ({ path: p, epistemic: 'inferred', unknownReason: null, parseFault: null, names, valuesLeftOut });
const unknownFile = (p: string, unknownReason: string, parseFault: string | null = null) => ({ path: p, epistemic: 'unknown', unknownReason, parseFault, names: null, valuesLeftOut: null });

const TREE: Tree = {
  'test_root.py': 'def test_at_root():\n    pass\n',
  'tests/test_api.py': '# def test_commented():\ndef test_get():\n    """def test_doc(): pass"""\nclass TestPost:\n    def test_create(self):\n        pass\n',
  'web/src/app.test.ts': "// it('commented')\ndescribe('app', () => {\n  it('renders', () => {});\n  const s = \"it('in a string')\";\n});\n",
  'cmd/run_test.go': 'package main\n// func TestCommented(t *testing.T) {}\nfunc TestRun(t *testing.T) {}\n',
  'java/src/FooTest.java': 'class FooTest {\n  // @Test void commented() {}\n  @Test void works() {}\n}\n',
  'web/src/app.ts': 'export {};\n',
  'README.md': '# x\n',
};
const READ = ['cmd/run_test.go', 'java/src/FooTest.java', 'test_root.py', 'tests/test_api.py', 'web/src/app.test.ts'];

describe('testNames: four recognizers under declared-source policy 2.0.0', () => {
  it('admits the fixture paths (precondition)', () => {
    for (const p of READ) expect(V2.screenPath(p)).toBeUndefined();
  });

  it('reads each framework\'s names, maps them to units, and takes no name from a comment or a string', async () => {
    const f = fixture(TREE, READ);
    const m = derived(await derive(f));
    expect([...f.asked].sort()).toEqual(READ);
    expect(m.format).toBe('polaris-dossier-test-names/1');
    expect(m.unitRule).toEqual({ rule: 'top-level-unit', ruleVersion: 1 });
    expect(m.recognizers.map((r) => [r.rule, r.ruleVersion, r.label, r.candidates, r.inferred, r.unknown, r.names])).toEqual([
      ['pytest-test-name', 1, 'inferred', 2, 2, 0, 4],
      ['js-test-call', 1, 'inferred', 1, 1, 0, 2],
      ['go-test-function', 1, 'inferred', 1, 1, 0, 1],
      ['junit-test-method', 1, 'inferred', 1, 1, 0, 1],
    ]);
    expect(entryOf(m, 'pytest-test-name').files).toEqual([inferredFile('test_root.py', 1), inferredFile('tests/test_api.py', 3)]);
    expect(m.names.map((n) => [n.id, n.path, n.line, n.kind, n.name, n.unit, n.rule, n.epistemic])).toEqual([
      ['_test-name-1', 'cmd/run_test.go', 3, 'test', 'TestRun', 'cmd', 'go-test-function', 'inferred'],
      ['_test-name-2', 'java/src/FooTest.java', 3, 'test', 'works', 'java', 'junit-test-method', 'inferred'],
      ['_test-name-3', 'test_root.py', 1, 'test', 'test_at_root', null, 'pytest-test-name', 'inferred'],
      ['_test-name-4', 'tests/test_api.py', 2, 'test', 'test_get', 'tests', 'pytest-test-name', 'inferred'],
      ['_test-name-5', 'tests/test_api.py', 4, 'suite', 'TestPost', 'tests', 'pytest-test-name', 'inferred'],
      ['_test-name-6', 'tests/test_api.py', 5, 'test', 'test_create', 'tests', 'pytest-test-name', 'inferred'],
      ['_test-name-7', 'web/src/app.test.ts', 2, 'suite', 'app', 'web', 'js-test-call', 'inferred'],
      ['_test-name-8', 'web/src/app.test.ts', 3, 'test', 'renders', 'web', 'js-test-call', 'inferred'],
    ]);
    const zero = { 'pytest-test-name': 0, 'js-test-call': 0, 'go-test-function': 0, 'junit-test-method': 0 };
    expect(m.units).toEqual([
      { unit: null, files: 1, names: 1, byRule: { ...zero, 'pytest-test-name': 1 } },
      { unit: 'cmd', files: 1, names: 1, byRule: { ...zero, 'go-test-function': 1 } },
      { unit: 'java', files: 1, names: 1, byRule: { ...zero, 'junit-test-method': 1 } },
      { unit: 'tests', files: 1, names: 3, byRule: { ...zero, 'pytest-test-name': 3 } },
      { unit: 'web', files: 1, names: 2, byRule: { ...zero, 'js-test-call': 2 } },
    ]);
    expect([m.unitsNotListed, m.namesNotListed]).toEqual([0, 0]);
    const text = JSON.stringify(m);
    for (const word of ['test_commented', 'test_doc', 'commented', 'in a string', 'TestCommented']) expect(text).not.toContain(word);
  });

  it('leaves a secret path out unnamed, sets apart vendored and generated paths, and names the rest Unknown with their reasons', async () => {
    const secret = `keys/${SECRET_NAME}/test_k.py`;
    const tree: Tree = {
      [secret]: 'def test_k(): pass\n', 'vendor/x/test_v.py': 'def test_v(): pass\n', 'dist/a.test.js': "it('x')\n",
      'tests/test_link.py': { mode: '120000' }, 'tests/test_open.py': 'x = """\n', 'tests/test_refused.py': 'def test_r(): pass\n',
      'tests/test_bytes.py': '', 'tests/test_secret.py': `def test_s():\n    t = "${SECRET_NAME}"\n`,
    };
    const f = fixture(tree, ['tests/test_bytes.py', 'tests/test_open.py', 'tests/test_refused.py', 'tests/test_secret.py'], ['tests/test_refused.py']);
    f.read = ((inner) => async (p: string) => (p === 'tests/test_bytes.py' ? { path: p, mode: '100644', id: '0'.repeat(40), bytes: new Uint8Array([0xff]) } : inner(p)))(f.read);
    const m = derived(await derive(f));
    const py = entryOf(m, 'pytest-test-name');
    expect([py.candidates, py.secretPathsLeftOut, py.setApart, py.inferred, py.unknown, py.names]).toEqual([7, 1, 1, 0, 5, 0]);
    expect(py.files).toEqual([
      unknownFile('tests/test_bytes.py', 'not-utf8-text'), unknownFile('tests/test_open.py', 'unparsed', 'unterminated'),
      unknownFile('tests/test_refused.py', 'object-read-refused'), unknownFile('tests/test_secret.py', 'secret-detector-match'),
      unknownFile('tests/test_link.py', 'symbolic-link'),
    ]);
    expect(entryOf(m, 'js-test-call').setApart).toBe(1);
    expect(m.units).toEqual([]);
    const text = JSON.stringify(m);
    for (const word of [SECRET_NAME, 'keys', 'vendor', 'dist/']) expect(text).not.toContain(word);
  });

  it('withholds a class the run\'s statement does not list, unread', async () => {
    const f = fixture({ 'tests/test_a.py': 'def test_a(): pass\n' }, []);
    const m = derived(await derive(f, ['project-documentation']));
    expect(entryOf(m, 'pytest-test-name').files).toEqual([unknownFile('tests/test_a.py', 'class-not-consented')]);
    expect(f.asked).toEqual([]);
  });

  it('leaves out and counts a name the value checks refuse', async () => {
    const long = 'x'.repeat(257);
    const f = fixture({ 'a.test.js': `it('${long}');\nit('');\nit('kept');\n` }, ['a.test.js']);
    const m = derived(await derive(f));
    expect(entryOf(m, 'js-test-call').files).toEqual([inferredFile('a.test.js', 1, 2)]);
    expect(m.names.map((n) => n.name)).toEqual(['kept']);
  });

  it('states the member Unknown when the tree cannot be listed', () => {
    expect(testNamesUnknown('tree-refused')).toEqual({ format: 'polaris-dossier-test-names/1', state: 'unknown', why: 'the pinned tree could not be listed (tree-refused)' });
  });
});
