import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { GitObjectReadRefusal, type VerifiedBlob } from './git-object-reader.js';
import { deriveRoughEdges, roughEdgesUnknown, type RoughEdges } from './rough-edges.js';
import { buildDossierScreen, type DossierScreen } from './screen.js';

// syzygy-5dhm.46 (REQ-polaris-generation-034 version 2.43): the roughEdges member from a tree listing, the bound policy's screen and a
// reader double that fails the test on any path the stated dispositions do not read. Expected members, counts and markers are literals
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
    return { path: p, mode: '100644', id: idOf(p), bytes: new TextEncoder().encode(tree[p] as string) };
  };
  return { entries, read, asked };
}
const derive = (f: ReturnType<typeof fixture>, consented: readonly string[] | null = null): Promise<RoughEdges> =>
  deriveRoughEdges({ entries: f.entries, screen: V2, consented, read: f.read });
const derived = (m: RoughEdges) => { if (m.state !== 'derived') throw new Error('expected a derived member'); return m; };
const observedFile = (p: string, markers: number, valuesLeftOut = 0) => ({ path: p, epistemic: 'observed', unknownReason: null, parseFault: null, markers, valuesLeftOut });
const unknownFile = (p: string, unknownReason: string, parseFault: string | null = null) => ({ path: p, epistemic: 'unknown', unknownReason, parseFault, markers: null, valuesLeftOut: null });

const TREE: Tree = {
  'setup.py': '# TODO: pin versions\nimport x\n',
  'pkg/core.py': 'import warnings\n\ndef f():\n    """FIXME in a docstring"""\n    warnings.warn("old", DeprecationWarning)  # see #41\n',
  'web/src/app.ts': '// HACK: around #7\nconst s = "TODO in a string";\n/** @deprecated use g */\nexport function f() {}\n',
  'web/src/clean.ts': 'export const x = 1;\n',
  'cmd/main.go': 'package main\n// Deprecated: use run2\nfunc run() {}\n// FIXME GH-9\n',
  'java/A.java': 'class A {\n  @Deprecated void f() {}\n}\n',
  'README.md': '# TODO\n',
};
const READ = ['cmd/main.go', 'java/A.java', 'pkg/core.py', 'setup.py', 'web/src/app.ts', 'web/src/clean.ts'];

describe('roughEdges: rough-edge-marker v1 under declared-source policy 2.0.0', () => {
  it('admits the fixture paths (precondition)', () => {
    for (const p of READ) expect(V2.screenPath(p)).toBeUndefined();
  });

  it('reads every marker as an Observed row with its quoted line, and counts them per unit by kind', async () => {
    const f = fixture(TREE, READ);
    const m = derived(await derive(f));
    expect([...f.asked].sort()).toEqual(READ);
    expect(m.format).toBe('polaris-dossier-rough-edges/1');
    expect(m.unitRule).toEqual({ rule: 'top-level-unit', ruleVersion: 1 });
    const r = m.recognizer;
    expect([r.rule, r.ruleVersion, r.label, r.candidates, r.secretPathsLeftOut, r.setApart, r.observed, r.unknown, r.valuesLeftOut, r.markers])
      .toEqual(['rough-edge-marker', 1, 'observed', 6, 0, 0, 6, 0, 0, 10]);
    expect(r.files).toEqual([
      observedFile('cmd/main.go', 3), observedFile('java/A.java', 1), observedFile('pkg/core.py', 2),
      observedFile('setup.py', 1), observedFile('web/src/app.ts', 3), observedFile('web/src/clean.ts', 0),
    ]);
    expect(m.markers.map((k) => [k.id, k.kind, k.marker, k.path, k.line, k.unit, k.quote, k.epistemic, k.referenceContent])).toEqual([
      ['_marker-1', 'deprecation', 'Deprecated:', 'cmd/main.go', 2, 'cmd', '// Deprecated: use run2', 'observed', null],
      ['_marker-2', 'fixme', 'FIXME', 'cmd/main.go', 4, 'cmd', '// FIXME GH-9', 'observed', null],
      ['_marker-3', 'issue-reference', 'GH-9', 'cmd/main.go', 4, 'cmd', '// FIXME GH-9', 'observed', 'unknown'],
      ['_marker-4', 'deprecation', '@Deprecated', 'java/A.java', 2, 'java', '@Deprecated void f() {}', 'observed', null],
      ['_marker-5', 'deprecation', 'DeprecationWarning', 'pkg/core.py', 5, 'pkg', 'warnings.warn("old", DeprecationWarning)  # see #41', 'observed', null],
      ['_marker-6', 'issue-reference', '#41', 'pkg/core.py', 5, 'pkg', 'warnings.warn("old", DeprecationWarning)  # see #41', 'observed', 'unknown'],
      ['_marker-7', 'todo', 'TODO', 'setup.py', 1, null, '# TODO: pin versions', 'observed', null],
      ['_marker-8', 'hack', 'HACK', 'web/src/app.ts', 1, 'web', '// HACK: around #7', 'observed', null],
      ['_marker-9', 'issue-reference', '#7', 'web/src/app.ts', 1, 'web', '// HACK: around #7', 'observed', 'unknown'],
      ['_marker-10', 'deprecation', '@deprecated', 'web/src/app.ts', 3, 'web', '/** @deprecated use g */', 'observed', null],
    ]);
    expect(m.markers[0]!.blob).toBe(idOf('cmd/main.go'));
    const zero = { todo: 0, fixme: 0, hack: 0, deprecation: 0, 'issue-reference': 0 };
    expect(m.units).toEqual([
      { unit: null, files: 1, markers: 1, byKind: { ...zero, todo: 1 } },
      { unit: 'cmd', files: 1, markers: 3, byKind: { ...zero, fixme: 1, deprecation: 1, 'issue-reference': 1 } },
      { unit: 'java', files: 1, markers: 1, byKind: { ...zero, deprecation: 1 } },
      { unit: 'pkg', files: 1, markers: 2, byKind: { ...zero, deprecation: 1, 'issue-reference': 1 } },
      { unit: 'web', files: 2, markers: 3, byKind: { ...zero, hack: 1, deprecation: 1, 'issue-reference': 1 } },
    ]);
    expect([m.unitsNotListed, m.markersNotListed]).toEqual([0, 0]);
    const text = JSON.stringify(m);
    for (const word of ['TODO in a string', 'FIXME in a docstring', 'README']) expect(text).not.toContain(word);
  });

  it('leaves a secret path out unnamed, sets apart vendored and generated paths, and names the rest Unknown with their reasons', async () => {
    const secret = `keys/${SECRET_NAME}/k.py`;
    const tree: Tree = {
      [secret]: '# TODO\n', 'vendor/x/v.py': '# TODO\n', 'dist/a.js': '// TODO\n',
      'src/link.py': { mode: '120000' }, 'src/open.py': 'x = """\n', 'src/refused.py': '# TODO\n',
      'src/bytes.py': '', 'src/secret.py': `# TODO\nt = "${SECRET_NAME}"\n`,
    };
    const f = fixture(tree, ['src/bytes.py', 'src/open.py', 'src/refused.py', 'src/secret.py'], ['src/refused.py']);
    f.read = ((inner) => async (p: string) => (p === 'src/bytes.py' ? { path: p, mode: '100644', id: '0'.repeat(40), bytes: new Uint8Array([0xff]) } : inner(p)))(f.read);
    const m = derived(await derive(f));
    const r = m.recognizer;
    expect([r.candidates, r.secretPathsLeftOut, r.setApart, r.observed, r.unknown, r.markers]).toEqual([8, 1, 2, 0, 5, 0]);
    expect(r.files).toEqual([
      unknownFile('src/bytes.py', 'not-utf8-text'), unknownFile('src/open.py', 'unparsed', 'unterminated'),
      unknownFile('src/refused.py', 'object-read-refused'), unknownFile('src/secret.py', 'secret-detector-match'),
      unknownFile('src/link.py', 'symbolic-link'),
    ]);
    expect(m.units).toEqual([]);
    const text = JSON.stringify(m);
    for (const word of [SECRET_NAME, 'keys', 'vendor', 'dist/']) expect(text).not.toContain(word);
  });

  it('withholds a class the run\'s statement does not list, unread', async () => {
    const f = fixture({ 'src/a.py': '# TODO\n' }, []);
    const m = derived(await derive(f, ['project-documentation']));
    expect(m.recognizer.files).toEqual([unknownFile('src/a.py', 'class-not-consented')]);
    expect(f.asked).toEqual([]);
  });

  it('leaves out and counts a marker whose line the value checks refuse', async () => {
    const long = `// TODO ${'x'.repeat(250)}`;
    const f = fixture({ 'a.js': `${long}\n// FIXME\tx\n// HACK kept\n` }, ['a.js']);
    const m = derived(await derive(f));
    expect(m.recognizer.files).toEqual([observedFile('a.js', 1, 2)]);
    expect(m.markers.map((k) => k.quote)).toEqual(['// HACK kept']);
    expect(m.units).toEqual([{ unit: null, files: 1, markers: 1, byKind: { todo: 0, fixme: 0, hack: 1, deprecation: 0, 'issue-reference': 0 } }]);
  });

  it('states the member Unknown when the tree cannot be listed', () => {
    expect(roughEdgesUnknown('tree-refused')).toEqual({ format: 'polaris-dossier-rough-edges/1', state: 'unknown', why: 'the pinned tree could not be listed (tree-refused)' });
  });
});
