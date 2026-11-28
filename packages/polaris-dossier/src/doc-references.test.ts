import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { deriveDocsAndCode, docsAndCodeUnknown, type DocsAndCode } from './doc-references.js';
import { GitObjectReadRefusal, type VerifiedBlob } from './git-object-reader.js';
import { buildDossierScreen, type DossierScreen } from './screen.js';

// syzygy-5dhm.119 (REQ-polaris-generation-034 version 2.48): the docsAndCode member from a tree listing, the bound policy's screen and a
// reader double that fails the test on any path the stated dispositions do not read. Expected rows and counts are literals written from
// the fixture before the driver ran. Planted secret values are fake and assembled from pieces.

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
// A run whose statement lists both classes; with none, every document is withheld by the class gate (the last but two case).
const BOTH = ['code-content', 'project-documentation'];
const derive = (f: ReturnType<typeof fixture>, consented: readonly string[] | null = BOTH): Promise<DocsAndCode> =>
  deriveDocsAndCode({ entries: f.entries, screen: V2, consented, read: f.read });
const derived = (m: DocsAndCode) => { if (m.state !== 'derived') throw new Error('expected a derived member'); return m; };
const rowsOf = (m: ReturnType<typeof derived>) => m.rows.map((r) => [r.document, r.line, r.written, r.value, r.form, r.outcome, r.epistemic, r.unknownReason, r.resolution]);

const TREE: Tree = {
  'README.md': 'See `src/app.py`, `src/gone.py` and [the guide](docs/guide.md).\nCall `runApp()`; `missingThing` is gone.\n',
  'docs/guide.md': 'Back to [the readme](../README.md); `lib/`, `Node.js` and `dist/out.js`.\n```\n`src/fenced.py`\n```\n',
  'src/app.py': 'def runApp():\n    pass\n# missingThing in a comment\n',
  'src/util.ts': 'export const x = "missingThing";\n',
  'pyproject.toml': 'missingThing = 1\n',
};
const READ = ['README.md', 'docs/guide.md', 'src/app.py', 'src/util.ts'];

describe('docsAndCode: doc-reference v1 under declared-source policy 2.0.0', () => {
  it('admits the fixture paths (precondition)', () => {
    for (const p of READ) expect(V2.screenPath(p)).toBeUndefined();
  });

  it('resolves each path against the tree and each identifier against the code text, and says document-only only where the search was whole', async () => {
    const f = fixture(TREE, READ);
    const m = derived(await derive(f));
    expect([...f.asked].sort()).toEqual(READ);
    expect([m.format, m.rule]).toEqual(['polaris-dossier-docs-and-code/1', { rule: 'doc-reference', ruleVersion: 1 }]);
    expect(rowsOf(m)).toEqual([
      ['README.md', 1, 'code-span', 'src/app.py', 'path', 'resolves', 'observed', null, { entry: 'file', path: 'src/app.py' }],
      ['README.md', 1, 'code-span', 'src/gone.py', 'path', 'document-only', 'observed', null, null],
      ['README.md', 1, 'link', 'docs/guide.md', 'path', 'resolves', 'observed', null, { entry: 'file', path: 'docs/guide.md' }],
      ['README.md', 2, 'code-span', 'runApp()', 'identifier', 'resolves', 'observed', null, { entry: 'identifier', path: 'src/app.py', line: 1, blob: idOf('src/app.py'), searched: 'code-text' }],
      ['README.md', 2, 'code-span', 'missingThing', 'identifier', 'document-only', 'observed', null, null],
      ['docs/guide.md', 1, 'link', '../README.md', 'path', 'resolves', 'observed', null, { entry: 'file', path: 'README.md' }],
      ['docs/guide.md', 1, 'code-span', 'lib/', 'path', 'document-only', 'observed', null, null],
      ['docs/guide.md', 1, 'code-span', 'Node.js', 'path', 'unknown', 'unknown', 'ambiguous-form', null],
      ['docs/guide.md', 1, 'code-span', 'dist/out.js', 'path', 'unknown', 'unknown', 'build-output-path', null],
    ]);
    expect(m.rows.map((r) => r.id)).toEqual(['_docref-1', '_docref-2', '_docref-3', '_docref-4', '_docref-5', '_docref-6', '_docref-7', '_docref-8', '_docref-9']);
    expect(m.rows[0]!.quote).toBe('See `src/app.py`, `src/gone.py` and [the guide](docs/guide.md).');
    expect(m.counts).toEqual({ resolves: 4, documentOnly: 3, unknown: 2 });
    const d = m.documents;
    expect([d.candidates, d.secretPathsLeftOut, d.setApart, d.observed, d.unknown, d.spansNotChecked, d.linksNotChecked, d.valuesLeftOut]).toEqual([2, 0, 0, 2, 0, 0, 0, 0]);
    expect(d.files).toEqual([
      { path: 'README.md', epistemic: 'observed', unknownReason: null, parseFault: null, resolves: 3, documentOnly: 2, unknown: 0, valuesLeftOut: 0 },
      { path: 'docs/guide.md', epistemic: 'observed', unknownReason: null, parseFault: null, resolves: 1, documentOnly: 1, unknown: 2, valuesLeftOut: 0 },
    ]);
    const c = m.code;
    expect([c.read, c.candidates, c.secretPathsLeftOut, c.setApart, c.observed, c.unknown, c.files, c.filesNotListed]).toEqual([true, 2, 0, 0, 2, 0, [], 0]);
    expect(JSON.stringify(m)).not.toContain('fenced');
  });

  it('keeps an identifier absent from the files read Unknown while any code file is unread (the ambiguous identifier)', async () => {
    const tree: Tree = { ...TREE, 'src/broken.py': 'x = """never closed\n', [`keys/${SECRET_NAME}/k.go`]: 'package k\n' };
    const f = fixture(tree, [...READ, 'src/broken.py']);
    const m = derived(await derive(f));
    expect(rowsOf(m).filter((r) => r[4] === 'identifier')).toEqual([
      ['README.md', 2, 'code-span', 'runApp()', 'identifier', 'resolves', 'observed', null, { entry: 'identifier', path: 'src/app.py', line: 1, blob: idOf('src/app.py'), searched: 'code-text' }],
      ['README.md', 2, 'code-span', 'missingThing', 'identifier', 'unknown', 'unknown', 'code-not-fully-read', null],
    ]);
    const c = m.code;
    expect([c.candidates, c.secretPathsLeftOut, c.observed, c.unknown]).toEqual([4, 1, 2, 1]);
    expect(c.files).toEqual([{ path: 'src/broken.py', epistemic: 'unknown', unknownReason: 'unparsed', parseFault: 'unterminated', resolves: null, documentOnly: null, unknown: null, valuesLeftOut: null }]);
    expect(JSON.stringify(m)).not.toContain(SECRET_NAME);
  });

  it('searches a language the lexer does not read as file text, and reads no code file where no row is an identifier', async () => {
    const withC = derived(await derive(fixture({ 'README.md': '`fooBar`\n', 'src/a.c': '/* note */ int fooBar;\n' }, ['README.md', 'src/a.c'])));
    expect(withC.rows.map((r) => r.resolution)).toEqual([{ entry: 'identifier', path: 'src/a.c', line: 1, blob: idOf('src/a.c'), searched: 'file-text' }]);
    const f = fixture({ 'README.md': '`src/a.c`\n', 'src/a.c': 'int x;\n' }, ['README.md']);
    const pathsOnly = derived(await derive(f));
    expect([pathsOnly.code.read, pathsOnly.code.candidates, pathsOnly.code.observed, pathsOnly.counts.resolves]).toEqual([false, 1, 0, 1]);
    expect(f.asked).toEqual(['README.md']);
  });

  it('resolves a bare name by basename, a directory only as a directory, and leaves a submodule and a climb above the root Unknown', async () => {
    const tree: Tree = {
      'docs/a/guide.md': '`server.c`, `missing.c`, `src/`, `src/x.c/`, `sub/lib/y.c`, [up](../../../x.md) and `../b/`.\n',
      'src/x.c': 'int x;\n', 'docs/b/n.txt': 'n\n', sub: { mode: '160000' },
      'cmd/server.c': 'int s;\n',
    };
    const m = derived(await derive(fixture(tree, ['docs/a/guide.md'])));
    expect(m.rows.map((r) => [r.value, r.outcome, r.unknownReason, r.resolution])).toEqual([
      ['server.c', 'resolves', null, { entry: 'file', path: 'cmd/server.c' }],
      ['missing.c', 'document-only', null, null],
      ['src/', 'resolves', null, { entry: 'directory', path: 'src' }],
      ['src/x.c/', 'document-only', null, null],
      ['sub/lib/y.c', 'unknown', 'submodule', null],
      ['../../../x.md', 'unknown', 'outside-tree', null],
      ['../b/', 'resolves', null, { entry: 'directory', path: 'docs/b' }],
    ]);
  });

  it('leaves out a row whose value or line the value checks refuse, or whose path a secret detector matches', async () => {
    const tree: Tree = { 'README.md': `\`keys/${SECRET_NAME}/x.md\`\n\`a/${'p'.repeat(260)}.md\`\n\`ok.md\`\tand \`b.md\`\n\`kept.md\`\n` };
    // The bound screen redacts or excludes such a body whole; a screen that admits it shows the row checks alone.
    const f = fixture(tree, ['README.md']);
    const admitting = { ...V2, screenTargetBody: () => ({ kind: 'admitted' as const }) };
    const m = derived(await deriveDocsAndCode({ entries: f.entries, screen: admitting, consented: BOTH, read: f.read }));
    expect(m.rows.map((r) => r.value)).toEqual(['kept.md']);
    expect([m.documents.valuesLeftOut, m.documents.files[0]!.valuesLeftOut]).toEqual([4, 4]);
    expect(JSON.stringify(m)).not.toContain(SECRET_NAME);
  });

  it('leaves a secret path out unnamed, sets apart vendored and generated documents, and names the rest Unknown with their reasons', async () => {
    const tree: Tree = {
      [`keys/${SECRET_NAME}/k.md`]: '`a.md`\n', 'vendor/x/v.md': '`a.md`\n', 'dist/a.md': '`a.md`\n',
      'docs/link.md': { mode: '120000' }, 'docs/open.md': '```\nnever closed\n', 'docs/refused.md': '`a.md`\n',
      'docs/bytes.md': '', 'docs/secret.md': `\`a.md\` ${SECRET_NAME}\n`,
    };
    const f = fixture(tree, ['docs/bytes.md', 'docs/open.md', 'docs/refused.md', 'docs/secret.md'], ['docs/refused.md']);
    f.read = ((inner) => async (p: string) => (p === 'docs/bytes.md' ? { path: p, mode: '100644', id: '0'.repeat(40), bytes: new Uint8Array([0xff]) } : inner(p)))(f.read);
    const m = derived(await derive(f));
    const d = m.documents;
    expect([d.candidates, d.secretPathsLeftOut, d.setApart, d.observed, d.unknown, m.rows.length]).toEqual([8, 1, 2, 0, 5, 0]);
    expect(d.files.map((e) => [e.path, e.unknownReason, e.parseFault])).toEqual([
      ['docs/link.md', 'symbolic-link', null], ['docs/bytes.md', 'not-utf8-text', null], ['docs/open.md', 'unparsed', 'unclosed-fence'],
      ['docs/refused.md', 'object-read-refused', null], ['docs/secret.md', 'secret-detector-match', null],
    ]);
    const text = JSON.stringify(m);
    for (const word of [SECRET_NAME, 'keys', 'vendor', 'dist/']) expect(text).not.toContain(word);
  });

  it('withholds a class the run\'s statement does not list, unread', async () => {
    const f = fixture({ 'README.md': '`a.md`\n' }, []);
    for (const consented of [['code-content'], null]) {
      const m = derived(await derive(f, consented));
      expect(m.documents.files.map((e) => e.unknownReason)).toEqual(['class-not-consented']);
    }
    expect(f.asked).toEqual([]);
  });

  it('reads at most 1000 documents and lists the first 2000 rows', async () => {
    const tree: Tree = {};
    for (let k = 0; k < 1001; k++) tree[`d${String(k).padStart(4, '0')}.md`] = '`a.md`\n';
    const many = derived(await derive(fixture(tree, Object.keys(tree).slice(0, 1000))));
    expect([many.documents.observed, many.documents.unknown, many.documents.files.length, many.documents.filesNotListed, many.documents.files.at(-1)!.path])
      .toEqual([1000, 1, 1000, 1, 'd0999.md']);
    const rows = derived(await derive(fixture({ 'a.md': '`b.md`\n'.repeat(2001) }, ['a.md'])));
    expect([rows.rows.length, rows.rowsNotListed, rows.rows.at(-1)!.id, rows.counts.documentOnly]).toEqual([2000, 1, '_docref-2000', 2001]);
  });

  it('states the member Unknown when the tree cannot be listed', () => {
    expect(docsAndCodeUnknown('tree-refused')).toEqual({ format: 'polaris-dossier-docs-and-code/1', state: 'unknown', why: 'the pinned tree could not be listed (tree-refused)' });
  });
});
