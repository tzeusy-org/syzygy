import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256 } from '@syzygy/support';
import { beforeAll, describe, expect, it } from 'vitest';
import { GitObjectReadRefusal, type VerifiedBlob } from './git-object-reader.js';
import { deriveManifestFacts, type ManifestFacts } from './manifest-facts.js';
import { buildDossierScreen, type DossierScreen } from './screen.js';

// syzygy-3efd.25 (REQ-polaris-generation-034 version 2.7): the manifestFacts member, from a tree listing, a screen and a reader double.
// Expected members, counts, reasons and identities are literals written before the driver ran. The screen's outcomes for the fixture paths
// are fixed by running the bound policy's screen (the committed declared-source policies 1.0.0 and 2.0.0), as the screening scenarios do,
// and asserted as preconditions; the retained-body case runs under a screen double. The reader double records every path it is asked for
// and fails the test on any path the stated dispositions do not read. Planted values are fake and assembled from pieces.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const POLICY = {
  v1: new Uint8Array(readFileSync(path.join(ROOT, '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json'))),
  v2: new Uint8Array(readFileSync(path.join(ROOT, '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2.json'))),
};
const SUBJECT = { repository: 'repository:o-r', commit: 'a'.repeat(40) };
const TOKEN = ['gh', 'p_', '0123456789abcdefghijklmnopqrstuvwxyzAB'].join('');
const SECRET_DIR = ['gh', 'p_', 'k'.repeat(24)].join('');
const LIMIT = 1_048_576;

let V1: DossierScreen, V2: DossierScreen;
beforeAll(() => {
  const build = (bytes: Uint8Array): DossierScreen => { const load = buildDossierScreen(bytes, true, SUBJECT, 'public'); if (!load.ok) throw new Error(load.why); return load.screen; };
  V1 = build(POLICY.v1);
  V2 = build(POLICY.v2);
});

/** A listed entry's object id: a stand-in derived from its path, so a refusal can name the listed blob or another object. */
const idOf = (p: string): string => createHash('sha1').update(p).digest('hex');
type Tree = Record<string, string | Uint8Array | { readonly mode: string } | GitObjectReadRefusal>;
/** The listing of `tree` (mode 100644 unless given) and a reader double that reads only `mayRead`, recording every path asked for. */
function fixture(tree: Tree, mayRead: readonly string[]) {
  const asked: string[] = [];
  const entries = Object.entries(tree).map(([p, v]) => ({ path: p, mode: typeof v === 'object' && 'mode' in v ? v.mode : '100644', id: idOf(p) }));
  const read = async (p: string): Promise<VerifiedBlob> => {
    asked.push(p);
    if (!mayRead.includes(p)) throw new Error(`the reader double was asked for ${JSON.stringify(p)}, which the dispositions do not read`);
    const v = tree[p]!;
    if (v instanceof GitObjectReadRefusal) throw v;
    const bytes = typeof v === 'string' ? new TextEncoder().encode(v) : v as Uint8Array;
    return { path: p, mode: '100644', id: '0'.repeat(40), bytes };
  };
  return { entries, read, asked };
}
const derive = (screen: DossierScreen, f: ReturnType<typeof fixture>, consented: readonly string[] | null = null): Promise<ManifestFacts> =>
  deriveManifestFacts({ entries: f.entries, screen, consented, read: f.read });
const derived = (m: ManifestFacts) => { if (m.state !== 'derived') throw new Error('expected a derived member'); return m; };
const empty = (rule: string) => ({ rule, ruleVersion: 1, label: 'inferred', candidates: 0, secretPathsLeftOut: 0, setApart: 0, inferred: 0, unknown: 0, valuesLeftOut: 0, facts: 0, files: [], filesNotListed: 0 });
const inferredFile = (p: string, facts: number, valuesLeftOut = 0) => ({ path: p, epistemic: 'inferred', unknownReason: null, parseFault: null, facts, valuesLeftOut });
const unknownFile = (p: string, unknownReason: string, parseFault: string | null = null) => ({ path: p, epistemic: 'unknown', unknownReason, parseFault, facts: null, valuesLeftOut: null });

const WORKSPACE: Tree = {
  'package.json': '{\n  "name": "kestrel",\n  "workspaces": ["packages/*"],\n  "devDependencies": { "typescript": "5.4.0" }\n}\n',
  'packages/a/package.json': '{ "name": "@k/a", "dependencies": { "zod": "3" } }\n',
  'packages/b/package.json': '{\n  "name": "@k/b",\n  "dependencies": {\n    "@k/a": "*"\n  }\n}\n',
  'Cargo.toml': '[workspace]\nmembers = ["crates/core"]\n\n[workspace.dependencies]\nserde = "1"\n',
  'README.md': '# Kestrel\n',
};
const WORKSPACE_READ = ['Cargo.toml', 'package.json', 'packages/a/package.json', 'packages/b/package.json'];

describe('manifestFacts: workspace manifests (scenario "Workspace manifests read into the check record")', () => {
  it('derives the member under policy 2.0.0: the ten recognizer entries in order, each file Inferred with its count, the facts in order', async () => {
    const f = fixture(WORKSPACE, WORKSPACE_READ);
    const member = await derive(V2, f);
    expect(member).toEqual({
      format: 'polaris-dossier-manifest-facts/2', state: 'derived',
      screeningPolicy: { policyId: 'polaris-butlers-project-shape-secrets', policyVersion: 'dossier-declared-source/2.0.0', sha256: sha256(POLICY.v2) },
      recognizers: [
        { rule: 'npm-package-manifest', ruleVersion: 1, label: 'inferred', candidates: 3, secretPathsLeftOut: 0, setApart: 0, inferred: 3, unknown: 0, valuesLeftOut: 0, facts: 7,
          files: [inferredFile('package.json', 3), inferredFile('packages/a/package.json', 2), inferredFile('packages/b/package.json', 2)], filesNotListed: 0 },
        { rule: 'cargo-manifest', ruleVersion: 1, label: 'inferred', candidates: 1, secretPathsLeftOut: 0, setApart: 0, inferred: 1, unknown: 0, valuesLeftOut: 0, facts: 2,
          files: [inferredFile('Cargo.toml', 2)], filesNotListed: 0 },
        empty('python-project-manifest'), empty('go-module-manifest'), empty('github-actions-workflow'),
        empty('compose-file'), empty('kubernetes-manifest'), empty('terraform-configuration'), empty('makefile'), empty('cmake-lists'),
      ],
      facts: [
        { id: '_manifest-1', fact: 'workspace-member', rule: 'cargo-manifest', ruleVersion: 1, path: 'Cargo.toml', lines: [2, 2], pattern: 'crates/core', epistemic: 'inferred' },
        { id: '_manifest-2', fact: 'dependency', rule: 'cargo-manifest', ruleVersion: 1, path: 'Cargo.toml', lines: [5, 5], name: 'serde', section: 'workspace.dependencies', group: null, epistemic: 'inferred' },
        { id: '_manifest-3', fact: 'package', rule: 'npm-package-manifest', ruleVersion: 1, path: 'package.json', lines: [2, 2], name: 'kestrel', epistemic: 'inferred' },
        { id: '_manifest-4', fact: 'workspace-member', rule: 'npm-package-manifest', ruleVersion: 1, path: 'package.json', lines: [3, 3], pattern: 'packages/*', epistemic: 'inferred' },
        { id: '_manifest-5', fact: 'dependency', rule: 'npm-package-manifest', ruleVersion: 1, path: 'package.json', lines: [4, 4], name: 'typescript', section: 'devDependencies', group: null, epistemic: 'inferred' },
        { id: '_manifest-6', fact: 'package', rule: 'npm-package-manifest', ruleVersion: 1, path: 'packages/a/package.json', lines: [1, 1], name: '@k/a', epistemic: 'inferred' },
        { id: '_manifest-7', fact: 'dependency', rule: 'npm-package-manifest', ruleVersion: 1, path: 'packages/a/package.json', lines: [1, 1], name: 'zod', section: 'dependencies', group: null, epistemic: 'inferred' },
        { id: '_manifest-8', fact: 'package', rule: 'npm-package-manifest', ruleVersion: 1, path: 'packages/b/package.json', lines: [2, 2], name: '@k/b', epistemic: 'inferred' },
        { id: '_manifest-9', fact: 'dependency', rule: 'npm-package-manifest', ruleVersion: 1, path: 'packages/b/package.json', lines: [4, 4], name: '@k/a', section: 'dependencies', group: null, epistemic: 'inferred' },
      ],
      factsNotListed: 0,
      remainder: {
        files: 5, secretPathsLeftOut: 0, candidates: 4, notCandidates: 1,
        places: [{ place: null, files: 3, notCandidates: 1 }, { place: 'packages', files: 2, notCandidates: 0 }],
        placesNotListed: 0, filesInPlacesNotListed: 0, notCandidatesInPlacesNotListed: 0,
      },
    });
    // One read per file, recognizer by recognizer in the stated order, each recognizer's files in path order.
    expect(f.asked).toEqual(['package.json', 'packages/a/package.json', 'packages/b/package.json', 'Cargo.toml']);
  });

  it('writes each member in the stated order, and the same bytes for a run relying on a statement listing code-content', async () => {
    const none = await derive(V2, fixture(WORKSPACE, WORKSPACE_READ));
    const listing = await derive(V2, fixture(WORKSPACE, WORKSPACE_READ), ['code-content']);
    expect(JSON.stringify(listing)).toBe(JSON.stringify(none));
    expect(Object.keys(none)).toEqual(['format', 'state', 'screeningPolicy', 'recognizers', 'facts', 'factsNotListed', 'remainder']);
    const m = derived(none);
    expect(Object.keys(m.recognizers[0]!)).toEqual(['rule', 'ruleVersion', 'label', 'candidates', 'secretPathsLeftOut', 'setApart', 'inferred', 'unknown', 'valuesLeftOut', 'facts', 'files', 'filesNotListed']);
    expect(Object.keys(m.recognizers[0]!.files[0]!)).toEqual(['path', 'epistemic', 'unknownReason', 'parseFault', 'facts', 'valuesLeftOut']);
    expect(Object.keys(m.facts[1]!)).toEqual(['id', 'fact', 'rule', 'ruleVersion', 'path', 'lines', 'name', 'section', 'group', 'epistemic']);
  });
});

describe('manifestFacts: python, workflows and path rules', () => {
  it('records a project\'s package and dependency facts with sections and groups, and nothing from an include or tool.poetry', async () => {
    const tree: Tree = { 'pyproject.toml': '[project]\nname = "kestrel"\ndependencies = ["requests>=2", "click"]\n\n[project.optional-dependencies]\ndocs = ["sphinx"]\n\n[dependency-groups]\ndev = ["pytest", { include-group = "docs" }]\n\n[tool.poetry]\nname = "x"\n' };
    const m = derived(await derive(V2, fixture(tree, ['pyproject.toml'])));
    expect(m.facts.map((f) => [f.fact, f.lines, f['name'], f['section'], f['group']])).toEqual([
      ['package', [2, 2], 'kestrel', undefined, undefined],
      ['dependency', [3, 3], 'click', 'project.dependencies', null], ['dependency', [3, 3], 'requests', 'project.dependencies', null],
      ['dependency', [6, 6], 'sphinx', 'project.optional-dependencies', 'docs'],
      ['dependency', [9, 9], 'pytest', 'dependency-groups', 'dev'],
    ]);
  });

  it('records a workflow, its triggers, jobs and needs, and takes no workflow one directory deeper or with another case or extension', async () => {
    const tree: Tree = {
      '.github/workflows/ci.yml': 'name: CI\non:\n  push:\n  pull_request:\njobs:\n  build:\n    runs-on: x\n  test:\n    needs: build\n    runs-on: x\n',
      '.github/workflows/release.yaml': 'on: release\njobs: {}\n',
      '.github/workflows/nested/x.yml': 'on: push\n',
      '.github/workflows/CI.YML': 'on: push\n',
      '.github/workflows/test_e2e.yml': 'on: push\n',
    };
    const f = fixture(tree, ['.github/workflows/ci.yml', '.github/workflows/release.yaml', '.github/workflows/test_e2e.yml']);
    const m = derived(await derive(V2, f));
    const workflow = m.recognizers[4]!;
    expect([workflow.candidates, workflow.setApart, workflow.inferred, workflow.facts]).toEqual([3, 0, 3, 10]);
    expect(m.facts.filter((x) => x.path === '.github/workflows/ci.yml').map((x) => [x.id, x.fact, x.lines, x['name'] ?? x['event'] ?? x['job'] ?? null, x['from'] ?? null, x['to'] ?? null])).toEqual([
      ['_manifest-1', 'workflow', [1, 10], 'CI', null, null],
      ['_manifest-2', 'workflow-trigger', [3, 3], 'push', null, null],
      ['_manifest-3', 'workflow-trigger', [4, 4], 'pull_request', null, null],
      ['_manifest-4', 'job', [6, 7], 'build', null, null],
      ['_manifest-5', 'job', [8, 10], 'test', null, null],
      ['_manifest-6', 'job-needs', [9, 9], null, 'test', 'build'],
    ]);
    expect(f.asked).toEqual(['.github/workflows/ci.yml', '.github/workflows/release.yaml', '.github/workflows/test_e2e.yml']);
  });
});

describe('manifestFacts: malformed and empty manifests', () => {
  it('names each malformed file Unknown, unparsed, with its fault, null counts and no fact', async () => {
    const tree: Tree = {
      'a/package.json': '{ "name": "a", ',
      'b/Cargo.toml': '[package]\nname = 1\n',
      '.github/workflows/ci.yml': '- on: push\n',
      'c/package.json': '{ "dependencies": {}, "dependencies": {} }\n',
    };
    const m = derived(await derive(V2, fixture(tree, Object.keys(tree))));
    expect(m.recognizers.map((r) => [r.rule, r.inferred, r.unknown, r.facts, r.files])).toEqual([
      ['npm-package-manifest', 0, 2, 0, [unknownFile('a/package.json', 'unparsed', 'syntax'), unknownFile('c/package.json', 'unparsed', 'duplicate-key')]],
      ['cargo-manifest', 0, 1, 0, [unknownFile('b/Cargo.toml', 'unparsed', 'field-type')]],
      ['python-project-manifest', 0, 0, 0, []], ['go-module-manifest', 0, 0, 0, []],
      ['github-actions-workflow', 0, 1, 0, [unknownFile('.github/workflows/ci.yml', 'unparsed', 'field-type')]],
      ['compose-file', 0, 0, 0, []], ['kubernetes-manifest', 0, 0, 0, []], ['terraform-configuration', 0, 0, 0, []], ['makefile', 0, 0, 0, []], ['cmake-lists', 0, 0, 0, []],
    ]);
    expect(m.facts).toEqual([]);
  });

  it('names an empty Cargo.toml and pyproject.toml Inferred with zero facts, and an empty package.json Unknown, syntax', async () => {
    const tree: Tree = { 'Cargo.toml': '', 'pyproject.toml': '', 'package.json': '' };
    const m = derived(await derive(V2, fixture(tree, Object.keys(tree))));
    expect(m.recognizers.slice(0, 3).map((r) => r.files)).toEqual([[unknownFile('package.json', 'unparsed', 'syntax')], [inferredFile('Cargo.toml', 0)], [inferredFile('pyproject.toml', 0)]]);
  });
});

describe('manifestFacts: excluded or withheld blob never read', () => {
  it('reads none of the paths its dispositions exclude: secret, set apart, denied, indeterminate, unconsented, symbolic link, unciteable', async () => {
    const tree: Tree = {
      [`${SECRET_DIR}/package.json`]: '{}', 'node_modules/x/package.json': '{}', 'dist/package.json': '{}', 'test/fixtures/package.json': '{}',
      '.docker/package.json': '{}', 'governance/package.json': '{}', 'linked/package.json': { mode: '120000' },
      'ctl\u0001/package.json': '{}', [`${'x'.repeat(520)}/package.json`]: '{}', 'ok/package.json': '{ "name": "ok" }',
      'go.mod': 'module x\n', 'cmd/x/go.mod': 'module y\n',
    };
    // The bound policy's own outcomes for these paths, fixed by running its screen.
    expect([V2.screenPath('.docker/package.json'), V2.screenPath('governance/package.json'), V2.screenPath('go.mod'), V2.screenPath('ok/package.json')])
      .toEqual(['denied-path', 'unknown-extraction-class', 'unknown-extraction-class', undefined]);
    expect(V2.screenPath(SECRET_DIR)).toBe('secret-detector-match');
    const f = fixture(tree, ['ok/package.json']);
    const m = derived(await derive(V2, f));
    expect(f.asked).toEqual(['ok/package.json']);
    const npm = m.recognizers[0]!;
    expect([npm.candidates, npm.secretPathsLeftOut, npm.setApart, npm.inferred, npm.unknown]).toEqual([10, 1, 3, 1, 5]);
    expect(npm.files).toEqual([
      inferredFile('ok/package.json', 1),
      unknownFile('.docker/package.json', 'denied-path'),
      unknownFile('"ctl\\u0001/package.json"', 'path-not-citable'),
      unknownFile('governance/package.json', 'unknown-extraction-class'),
      unknownFile('linked/package.json', 'symbolic-link'),
      unknownFile(`"${'x'.repeat(512)}" (21 more code units)`, 'path-not-citable'),
    ]);
    // The recognizer entries and facts name no set-apart or secret path; the remainder names top-level places only, never a secret one.
    const text = JSON.stringify([m.recognizers, m.facts]);
    for (const hidden of [SECRET_DIR, 'node_modules', 'dist/', 'test/fixtures']) expect(text).not.toContain(hidden);
    expect(JSON.stringify(m)).not.toContain(SECRET_DIR);
    expect(m.recognizers[3]!.files).toEqual([unknownFile('cmd/x/go.mod', 'unknown-extraction-class'), unknownFile('go.mod', 'unknown-extraction-class')]);
  });

  it('withholds a class the run\'s statement does not list (class-not-consented), unread', async () => {
    const f = fixture({ 'package.json': '{}' }, []);
    const m = derived(await derive(V2, f, ['project-documentation']));
    expect(m.recognizers[0]!.files).toEqual([unknownFile('package.json', 'class-not-consented')]);
    expect(f.asked).toEqual([]);
  });

  it('reads a body a detector or the active-content rule excludes once, names it Unknown with its outcome word, and never parses it', async () => {
    const tree: Tree = {
      'a/package.json': `{ "name": "a", "description": "${TOKEN}" }\n`,
      'b/package.json': '{ "name": "b", "description": "<script>alert(1)</script>" }\n',
    };
    expect(V2.screenTargetBody(tree['a/package.json'] as string, 'a/package.json')).toEqual({ kind: 'excluded', outcome: 'secret-detector-match' });
    expect(V2.screenTargetBody(tree['b/package.json'] as string, 'b/package.json')).toEqual({ kind: 'excluded', outcome: 'active-content' });
    const f = fixture(tree, Object.keys(tree));
    const m = derived(await derive(V2, f));
    expect(f.asked).toEqual(['a/package.json', 'b/package.json']);
    expect(m.recognizers[0]!.files).toEqual([unknownFile('a/package.json', 'secret-detector-match'), unknownFile('b/package.json', 'active-content')]);
    expect(m.facts).toEqual([]);
    expect(JSON.stringify(m)).not.toContain(TOKEN);
  });

  it('names a body a screen double retains with lines withheld Unknown, redacted-body, and never parses it', async () => {
    const retaining: DossierScreen = { ...V2, screenTargetBody: () => ({ kind: 'redacted', retained: '', retainedLines: [''], lineByteOffsets: [0], originalBytes: 1, contentSha256: '0'.repeat(64), withheld: [1], detectorIds: ['x'] }) };
    const m = derived(await derive(retaining, fixture({ 'package.json': '{ "name": "a" }' }, ['package.json'])));
    expect(m.recognizers[0]!.files).toEqual([unknownFile('package.json', 'redacted-body')]);
    expect(m.facts).toEqual([]);
  });

  it('makes a refused read Unknown for that file alone: object-read-refused, too-large over the bound, not-utf8-text', async () => {
    const exact = `{ "name": "exact"${' '.repeat(LIMIT - 19)}}\n`;
    expect(new TextEncoder().encode(exact).byteLength).toBe(LIMIT);
    const tree: Tree = {
      'a/package.json': new GitObjectReadRefusal('object-missing', 'fixture: missing', '1'.repeat(40), 'a/package.json'),
      'b/package.json': new GitObjectReadRefusal('corrupt-object', 'fixture: over the bound', idOf('b/package.json'), 'b/package.json', true),
      // A delta base or tree on the way over the bound: the listed blob was not shown over it, so the read is refused, not too-large.
      'f/package.json': new GitObjectReadRefusal('corrupt-object', 'fixture: a base over the bound', '2'.repeat(40), 'f/package.json', true),
      'c/package.json': new Uint8Array(LIMIT + 1).fill(0x20),
      'd/package.json': exact,
      'e/package.json': new Uint8Array([0x7b, 0xff, 0x7d]),
    };
    const m = derived(await derive(V2, fixture(tree, Object.keys(tree))));
    expect(m.recognizers[0]!.files).toEqual([
      unknownFile('a/package.json', 'object-read-refused'), unknownFile('b/package.json', 'too-large'), unknownFile('c/package.json', 'too-large'),
      inferredFile('d/package.json', 1), unknownFile('e/package.json', 'not-utf8-text'), unknownFile('f/package.json', 'object-read-refused'),
    ]);
  });
});

describe('manifestFacts: the bound policy', () => {
  it('names every go.mod Unknown (unknown-extraction-class) and unread under 1.0.0 and 2.0.0, and every other manifest under 1.0.0', async () => {
    const tree: Tree = { 'go.mod': 'module x\n', 'cmd/x/go.mod': 'module y\n', 'package.json': '{}', 'Cargo.toml': '', 'pyproject.toml': '', '.github/workflows/ci.yml': 'on: push\n' };
    for (const screen of [V1, V2]) {
      const f = fixture(tree, screen === V2 ? ['package.json', 'Cargo.toml', 'pyproject.toml', '.github/workflows/ci.yml'] : []);
      const m = derived(await derive(screen, f));
      const go = m.recognizers[3]!;
      expect([go.unknown, go.facts, go.files.map((x) => x.unknownReason)]).toEqual([2, 0, ['unknown-extraction-class', 'unknown-extraction-class']]);
      if (screen === V1) {
        expect(m.screeningPolicy.policyVersion).toBe('dossier-declared-source/1.0.0');
        expect(m.recognizers.map((r) => r.files.map((x) => x.unknownReason))).toEqual([['unknown-extraction-class'], ['unknown-extraction-class'], ['unknown-extraction-class'], ['unknown-extraction-class', 'unknown-extraction-class'], ['unknown-extraction-class'], [], [], [], [], []]);
        expect(f.asked).toEqual([]);
      }
    }
  });
});

describe('manifestFacts: values, caps and order', () => {
  it('leaves out a fact whose body-taken value is over 256 code units, holds a control character or a detector matches, and counts it', async () => {
    const escaped = `\\u0067${TOKEN.slice(1)}`;
    const body = `{ "name": "${'n'.repeat(257)}", "dependencies": { "ok": "1", "${escaped}": "1", "a\\u0001b": "1", "${'d'.repeat(256)}": "1" } }\n`;
    expect(body).not.toContain(TOKEN);
    expect(V2.screenTargetBody(body, 'package.json')).toEqual({ kind: 'admitted' });
    const m = derived(await derive(V2, fixture({ 'package.json': body }, ['package.json'])));
    expect(m.recognizers[0]!.files).toEqual([inferredFile('package.json', 2, 3)]);
    expect([m.recognizers[0]!.valuesLeftOut, m.recognizers[0]!.facts]).toEqual([3, 2]);
    expect(m.facts.map((f) => f['name'])).toEqual(['d'.repeat(256), 'ok']);
    expect(JSON.stringify(m)).not.toContain(TOKEN);
  });

  it('reads and lists the first 250 of 260 files, counts the rest Unknown over-read-limit, and lists the first 1,000 facts', async () => {
    const tree: Tree = {};
    const names = Array.from({ length: 260 }, (_, i) => `p/${String(i).padStart(3, '0')}/package.json`);
    for (const n of names) tree[n] = '{ "name": "n", "dependencies": { "a": "1", "b": "1", "c": "1", "d": "1" } }';
    const f = fixture(tree, names.slice(0, 250));
    const m = derived(await derive(V2, f));
    const npm = m.recognizers[0]!;
    expect([npm.candidates, npm.secretPathsLeftOut + npm.setApart + npm.inferred + npm.unknown, npm.inferred, npm.unknown, npm.facts, npm.files.length, npm.filesNotListed])
      .toEqual([260, 260, 250, 10, 1250, 250, 10]);
    expect(npm.files[249]).toEqual(inferredFile('p/249/package.json', 5));
    expect(f.asked).toHaveLength(250);
    expect([m.facts.length, m.factsNotListed, m.facts[999]!.id, m.facts[999]!.path, m.facts[999]!['name']]).toEqual([1000, 250, '_manifest-1000', 'p/199/package.json', 'd']);
  });

  it('lists exactly 1,000 facts with none left, and counts the 1,001st', async () => {
    const tree: Tree = {};
    for (let i = 0; i < 200; i++) tree[`p/${String(i).padStart(3, '0')}/package.json`] = '{ "name": "n", "dependencies": { "a": "1", "b": "1", "c": "1", "d": "1" } }';
    const thousand = derived(await derive(V2, fixture(tree, Object.keys(tree))));
    expect([thousand.facts.length, thousand.factsNotListed]).toEqual([1000, 0]);
    tree['q/package.json'] = '{ "name": "q" }';
    const more = derived(await derive(V2, fixture(tree, Object.keys(tree))));
    expect([more.facts.length, more.factsNotListed, more.recognizers[0]!.facts]).toEqual([1000, 1, 1001]);
  });

  it('lists every file read first, so unread files sorting before them do not hide one', async () => {
    const tree: Tree = {};
    for (let i = 0; i < 5; i++) { tree[`.docker/${i}/package.json`] = '{}'; tree[`a/${i}/package.json`] = { mode: '120000' }; }
    const readable = Array.from({ length: 250 }, (_, i) => `p/${String(i).padStart(3, '0')}/package.json`);
    for (const n of readable) tree[n] = '{}';
    const f = fixture(tree, readable);
    const npm = derived(await derive(V2, f)).recognizers[0]!;
    expect(f.asked).toEqual(readable);
    expect(npm.files.map((x) => x.path)).toEqual(readable);
    expect([npm.inferred, npm.unknown, npm.inferred + npm.unknown, npm.filesNotListed]).toEqual([250, 10, 260, 10]);
  });

  it('reads a path of 512 code units and names one of 513 path-not-citable, unread', async () => {
    const at512 = `${'p'.repeat(499)}/package.json`, at513 = `${'p'.repeat(500)}/package.json`;
    expect([at512.length, at513.length]).toEqual([512, 513]);
    const f = fixture({ [at512]: '{ "name": "a" }', [at513]: '{ "name": "b" }' }, [at512]);
    const npm = derived(await derive(V2, f)).recognizers[0]!;
    expect(f.asked).toEqual([at512]);
    expect(npm.files).toEqual([inferredFile(at512, 1), unknownFile(`"${'p'.repeat(500)}/package.jso" (1 more code units)`, 'path-not-citable')]);
  });

  // Review finding 7 (syzygy-3efd.25), version 2.8 (syzygy-3efd.72) and the infrastructure recognizers (syzygy-3efd.26): the member has no byte bound of its
  // own; the spec fixes its caps (1,000 facts listed; 250 files per recognizer of version 2.7 and 100 per infrastructure recognizer
  // listed; the root and 250 places of the remainder; values to 256 code units, paths to 512) and states that at those caps the member,
  // encoded as the check record encodes it, takes fewer than 13,000,000 bytes (10,000,000 before the infrastructure recognizers), under the 16,777,216-byte
  // bound every reader of a check record applies. Built here by hand from the stated caps, never from the recognizer: every count a safe
  // integer; every fact a `dependency` whose path is 512 three-byte characters and whose `name` and `group` are 256 lone surrogates (six
  // bytes each once escaped); each file entry in one of three forms, the widest an Unknown `path-not-citable` entry whose census-form path
  // begins with 512 control characters (`\u0001`, seven bytes once the record escapes the census form's backslash); every remainder place
  // in that census form; and the screening policy's identifier and version 4,096 lone surrogates each.
  it('measures the widest member at every cap under 13,000,000 bytes, and admits a 256-unit value of lone surrogates', async () => {
    const lone = derived(await derive(V2, fixture({ 'package.json': `{ "name": "${'\\ud800'.repeat(256)}" }` }, ['package.json'])));
    expect([lone.facts.length, (lone.facts[0]!['name'] as string).length, lone.recognizers[0]!.valuesLeftOut]).toEqual([1, 256, 0]);
    const MAX = Number.MAX_SAFE_INTEGER;
    const CJK = '\u4e00'.repeat(512), LONE = '\ud800'.repeat(256), POLICY_WIDE = '\ud800'.repeat(4096);
    const census = `${JSON.stringify('\u0001'.repeat(512))} (9007199254740991 more code units)`;
    const FILES = {
      inferred: { path: CJK, epistemic: 'inferred', unknownReason: null, parseFault: null, facts: MAX, valuesLeftOut: MAX },
      unparsed: { path: CJK, epistemic: 'unknown', unknownReason: 'unparsed', parseFault: 'beyond-reader', facts: null, valuesLeftOut: null },
      census: { path: census, epistemic: 'unknown', unknownReason: 'path-not-citable', parseFault: null, facts: null, valuesLeftOut: null },
    };
    const RULES = ['npm-package-manifest', 'cargo-manifest', 'python-project-manifest', 'go-module-manifest', 'github-actions-workflow',
      'compose-file', 'kubernetes-manifest', 'terraform-configuration', 'makefile', 'cmake-lists'];
    const widest = (file: Record<string, unknown>) => ({
      format: 'polaris-dossier-manifest-facts/2', state: 'derived',
      screeningPolicy: { policyId: POLICY_WIDE, policyVersion: POLICY_WIDE, sha256: '0'.repeat(64) },
      recognizers: RULES.map((rule, i) => ({
        rule, ruleVersion: 1, label: 'inferred', candidates: MAX, secretPathsLeftOut: MAX, setApart: MAX, inferred: MAX, unknown: MAX, valuesLeftOut: MAX, facts: MAX,
        files: Array.from({ length: i < 5 ? 250 : 100 }, () => file), filesNotListed: MAX,
      })),
      facts: Array.from({ length: 1000 }, (_, i) => ({
        id: `_manifest-${i + 1}`, fact: 'dependency', rule: 'python-project-manifest', ruleVersion: 1, path: CJK, lines: [1_048_577, 1_048_577],
        name: LONE, section: 'project.optional-dependencies', group: LONE, epistemic: 'inferred',
      })),
      factsNotListed: MAX,
      remainder: {
        files: MAX, secretPathsLeftOut: MAX, candidates: MAX, notCandidates: MAX,
        places: Array.from({ length: 251 }, () => ({ place: census, files: MAX, notCandidates: MAX })),
        placesNotListed: MAX, filesInPlacesNotListed: MAX, notCandidatesInPlacesNotListed: MAX,
      },
    });
    // The member's own bytes in the record: `{"manifestFacts": member}` less `{"manifestFacts": {}}`, each two-space JSON as check writes.
    const bytes = (member: unknown): number => Buffer.byteLength(JSON.stringify({ manifestFacts: member }, null, 2)) - Buffer.byteLength(JSON.stringify({ manifestFacts: {} }, null, 2));
    // The census form of a path is the one the recognizer writes: the first 512 code units quoted, then the count of the rest.
    expect(census.slice(0, 8)).toBe('"\\u0001\\');
    expect([bytes(widest(FILES.inferred)), bytes(widest(FILES.unparsed)), bytes(widest(FILES.census))]).toEqual([9_066_582, 9_052_582, 12_699_582]);
    expect(bytes(widest(FILES.census))).toBeLessThan(13_000_000);
  });

  it('is deterministic: the same bytes whatever the listing order, and every fact and entry labelled inferred', async () => {
    const forward = await derive(V2, fixture(WORKSPACE, WORKSPACE_READ));
    const reversed: Tree = Object.fromEntries(Object.entries(WORKSPACE).reverse());
    const backward = await derive(V2, fixture(reversed, WORKSPACE_READ));
    expect(JSON.stringify(backward)).toBe(JSON.stringify(forward));
    const m = derived(forward);
    expect(new Set(m.facts.map((x) => x.epistemic))).toEqual(new Set(['inferred']));
    expect(new Set(m.recognizers.map((x) => x.label))).toEqual(new Set(['inferred']));
  });
});
