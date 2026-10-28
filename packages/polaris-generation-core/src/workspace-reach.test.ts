import { readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ROOT, WORKSPACE, entryModulesIn, resolve, resolveIn, segmentFaultOf, type Manifest, type Workspace } from './workspace-reach.testkit.js';

// syzygy-bpyt.8.36 (the review of 8.34, N1): the resolver both reach guards share reads a specifier it cannot follow as Node would
// as naming no module, so their "resolves every" rows fail on it rather than passing it as outside the workspace. The tree holds no
// such specifier and no `imports` field today, so the forms that need one run against a workspace of two packages written here.

const BARREL = 'packages/polaris-dossier/src/index.ts';

type DependencyFields = Pick<Manifest, 'dependencies' | 'devDependencies' | 'optionalDependencies' | 'peerDependencies'>;

/** Two packages: `@syzygy/app` with the given `imports` and dependencies, and `@syzygy/lib` with the given `.` export over two
 * modules and its own dependencies. */
function workspace(imports: Record<string, unknown>, dot: unknown = './dist/index.js', app: DependencyFields = {}, lib: DependencyFields = {}): Workspace {
  const manifests: Manifest[] = [
    { name: '@syzygy/app', dir: 'apps/app', imports, main: './dist/main.js', ...app },
    { name: '@syzygy/lib', dir: 'packages/lib', exports: { '.': dot, './argv': { types: './dist/argv.d.ts', import: './dist/argv.js' } }, ...lib },
  ];
  const files = new Set(['apps/app/src/main.ts', 'apps/app/src/local.ts', 'packages/lib/src/index.ts', 'packages/lib/src/argv.ts']);
  return { manifests: new Map(manifests.map((manifest) => [manifest.name, manifest])), isFile: (path) => files.has(path) };
}

describe('the shared workspace resolver', () => {
  it('resolves a subpath export, a relative module and the barrel by name, and leaves a built-in and a dependency outside', () => {
    expect(resolve('apps/syzygy/src/main.ts', '@syzygy/polaris-dossier/argv')).toBe('packages/polaris-dossier/src/argv.ts');
    expect(resolve('packages/polaris-dossier/src/cli.ts', './argv.js')).toBe('packages/polaris-dossier/src/argv.ts');
    expect(resolve('apps/syzygy/src/main.ts', '@syzygy/polaris-dossier')).toBe(BARREL);
    expect(resolve('apps/syzygy/src/main.ts', 'node:fs')).toBeNull();
    expect(resolve('apps/syzygy/src/main.ts', 'typescript')).toBeNull();
  });

  it.each([
    ['an absolute path to the barrel', join(ROOT, BARREL)],
    ['a file: URL of the barrel', pathToFileURL(join(ROOT, BARREL)).href],
    ['a FILE: URL of the barrel', pathToFileURL(join(ROOT, BARREL)).href.replace(/^file:/u, 'FILE:')],
    ['a # alias its package does not declare', '#dossier'],
  ])('reads %s as naming no module', (_form, specifier) => {
    expect(resolve('apps/syzygy/src/main.ts', specifier)).toBeUndefined();
  });

  it.each([
    ['a package by name', { '#lib': '@syzygy/lib' }, 'packages/lib/src/index.ts'],
    ['a subpath by name', { '#argv': '@syzygy/lib/argv' }, 'packages/lib/src/argv.ts'],
    ['a module of its own package', { '#lib': './dist/local.js' }, 'apps/app/src/local.ts'],
    ['agreeing conditions', { '#lib': { types: './dist/local.d.ts', import: './dist/local.js', default: './dist/local.js' } }, 'apps/app/src/local.ts'],
  ])('follows a # alias its package declares for %s', (_form, imports, module) => {
    expect(resolveIn(workspace(imports), 'apps/app/src/main.ts', Object.keys(imports)[0]!)).toBe(module);
  });

  it.each([
    ['from a module of another package', { '#lib': '@syzygy/lib' }, 'packages/lib/src/argv.ts', '#lib'],
    ['whose target is another alias', { '#lib': '#other', '#other': '@syzygy/lib' }, 'apps/app/src/main.ts', '#lib'],
    ['whose target leaves its package', { '#lib': '../lib/dist/index.js' }, 'apps/app/src/main.ts', '#lib'],
    ['whose target leaves its package for a module that exists', { '#lib': '../../../packages/lib/src/index.js' }, 'apps/app/src/main.ts', '#lib'],
    ['whose target is a module of its own package outside dist', { '#lib': './src/local.js' }, 'apps/app/src/main.ts', '#lib'],
    ['whose target names no source module', { '#lib': './dist/missing.js' }, 'apps/app/src/main.ts', '#lib'],
    ['whose target is an absolute path', { '#lib': '/packages/lib/src/index.ts' }, 'apps/app/src/main.ts', '#lib'],
    ['whose conditions disagree', { '#lib': { node: '@syzygy/lib', import: './dist/local.js' } }, 'apps/app/src/main.ts', '#lib'],
    ['under a name its package does not declare', { '#lib': '@syzygy/lib' }, 'apps/app/src/main.ts', '#other'],
  ])('reads a # alias %s as naming no module', (_form, imports, from, specifier) => {
    expect(resolveIn(workspace(imports), from, specifier)).toBeUndefined();
  });

  it.each([
    ['node', { types: './dist/index.d.ts', node: './dist/index.js', import: './dist/argv.js' }],
    ['module-sync', { 'module-sync': './dist/index.js', import: './dist/argv.js' }],
    ['require', { import: './dist/argv.js', require: './dist/index.js' }],
    ['default', { import: './dist/argv.js', default: './dist/index.js' }],
  ])('reads an export whose %s condition names another target as naming no module', (_condition, dot) => {
    expect(resolveIn(workspace({}, dot), 'apps/app/src/main.ts', '@syzygy/lib')).toBeUndefined();
  });

  it('reads an export whose condition holds further conditions as naming no module', () => {
    expect(resolveIn(workspace({}, { import: { types: './dist/argv.d.ts', default: './dist/argv.js' } }), 'apps/app/src/main.ts', '@syzygy/lib')).toBeUndefined();
  });

  // syzygy-bpyt.8.37 (the review of 8.36, N2): npm installs a local dependency under the name its manifest gives it, so the barrel
  // of a workspace package can load under a bare name the `@syzygy/*` branch never reads. Any manifest's declaration counts, the
  // workspace root's among them, since npm installs it where every workspace module resolves it. A remote tarball URL and an `npm:`
  // alias of a registry package read as naming no module too, failing closed (syzygy-bpyt.8.38).
  it.each([
    ['a file: dependency', 'dossier', { dependencies: { dossier: 'file:../../packages/lib' } }, {}],
    ['a FILE: dependency of a scoped name', '@local/dossier', { dependencies: { '@local/dossier': 'FILE:../../packages/lib' } }, {}],
    ['a subpath of a file: dependency', 'dossier/argv', { dependencies: { dossier: 'file:../../packages/lib' } }, {}],
    ['a link: dev dependency', 'dossier', { devDependencies: { dossier: 'link:../../packages/lib' } }, {}],
    ['a workspace: optional dependency', 'dossier', { optionalDependencies: { dossier: 'workspace:*' } }, {}],
    ['an npm: alias peer dependency', 'dossier', { peerDependencies: { dossier: 'npm:@syzygy/lib@*' } }, {}],
    ['a path dependency', 'dossier', { dependencies: { dossier: '../../packages/lib' } }, {}],
    ['a home-relative path dependency', 'dossier', { dependencies: { dossier: '~/lib' } }, {}],
    ['an absolute path dependency', 'dossier', { dependencies: { dossier: '/srv/lib' } }, {}],
    ['a tarball dependency', 'dossier', { dependencies: { dossier: 'lib-0.0.0.tgz' } }, {}],
    ['a ./ path dependency', 'dossier', { dependencies: { dossier: './lib' } }, {}],
    ['a dependency on its own directory', 'dossier', { dependencies: { dossier: '.' } }, {}],
    ['a .tar dependency', 'dossier', { dependencies: { dossier: 'lib-0.0.0.tar' } }, {}],
    ['a .tar.gz dependency', 'dossier', { dependencies: { dossier: 'lib-0.0.0.tar.gz' } }, {}],
    ['a remote tarball URL dependency', 'dossier', { dependencies: { dossier: 'https://example.com/lib-1.0.0.tgz' } }, {}],
    ['a remote http tarball URL dependency', 'dossier', { dependencies: { dossier: 'http://example.com/lib-1.0.0.tar.gz' } }, {}],
    ['an npm: alias of a registry package', 'dossier', { dependencies: { dossier: 'npm:typescript@^5.5.0' } }, {}],
    ['a dependency on its parent directory', 'dossier', { dependencies: { dossier: '..' } }, {}],
    ['a git dependency whose spec ends in a tarball extension', 'dossier', { dependencies: { dossier: 'github:someone/dossier#v1.tar' } }, {}],
    ['an npm: alias with no version', 'dossier', { dependencies: { dossier: 'npm:typescript' } }, {}],
    ['a file: dependency of another package', 'dossier', {}, { dependencies: { dossier: 'file:../../apps/app' } }],
  ])('reads a bare name declared as %s as naming no module', (_form, specifier, app, lib) => {
    expect(resolveIn(workspace({}, undefined, app, lib), 'apps/app/src/main.ts', specifier)).toBeUndefined();
  });

  it.each([
    ['a registry version', 'dossier', { dependencies: { dossier: '2.9.0' } }],
    ['a registry range', 'dossier', { dependencies: { dossier: '^1.0.0' } }],
    ['a name no local dependency declares', 'dossier', { dependencies: { other: 'file:../../packages/lib' } }],
    ['a longer name than a local dependency', 'dossier-extra', { dependencies: { dossier: 'file:../../packages/lib' } }],
    ['a git dependency', 'dossier', { dependencies: { dossier: 'github:someone/dossier' } }],
    ['a registry tilde range', 'dossier', { dependencies: { dossier: '~1.2.3' } }],
    ['a git dependency whose path holds .tgz', 'dossier', { dependencies: { dossier: 'git+https://example.com/lib.tgz.git' } }],
  ])('leaves a bare name declared as %s outside the workspace', (_form, specifier, app) => {
    expect(resolveIn(workspace({}, undefined, app), 'apps/app/src/main.ts', specifier)).toBeNull();
  });

  it("reads the workspace root's manifest beside the packages'", () => {
    expect(WORKSPACE.manifests.get('syzygy-workspace')).toEqual({ dir: '.', ...JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) });
  });

  it("reads a bare name the workspace root's manifest declares as a local dependency as naming no module", () => {
    const { manifests, isFile } = workspace({});
    const root: Manifest = { name: 'root', dir: '.', devDependencies: { dossier: './packages/lib' } };
    expect(resolveIn({ manifests: new Map([...manifests, [root.name, root]]), isFile }, 'apps/app/src/main.ts', 'dossier')).toBeUndefined();
  });

  it('resolves an export whose conditions other than types all name one target', () => {
    expect(resolveIn(workspace({}, { types: './dist/argv.d.ts', import: './dist/argv.js', default: './dist/argv.js' }), 'apps/app/src/main.ts', '@syzygy/lib'))
      .toBe('packages/lib/src/argv.ts');
  });

  // syzygy-bpyt.4.2: tests and tools resolve the `source` condition, which names the module itself. It must be the one the other
  // conditions' `./dist/X.js` reads as, so a module reaches the same edges whichever condition loads it.
  it('resolves an export whose source condition names the module its other conditions build to', () => {
    expect(resolveIn(workspace({}, { source: './src/argv.ts', types: './dist/argv.d.ts', import: './dist/argv.js', default: './dist/argv.js' }), 'apps/app/src/main.ts', '@syzygy/lib'))
      .toBe('packages/lib/src/argv.ts');
  });

  it.each([
    ['another module', './src/index.ts'],
    ['the built target', './dist/argv.js'],
    ['a module outside src', './argv.ts'],
    ['further conditions', { default: './src/argv.ts' }],
  ])('reads an export whose source condition names %s as naming no module', (_form, source) => {
    expect(resolveIn(workspace({}, { source, types: './dist/argv.d.ts', import: './dist/argv.js', default: './dist/argv.js' }), 'apps/app/src/main.ts', '@syzygy/lib'))
      .toBeUndefined();
  });
});

// syzygy-bpyt.4.2: the typecheck, the suite and the no-egress bundle load every workspace package by its `source` condition, and
// Node loads the built product by `import` or `default`. Every export of the tree's own manifests names one module either way.
describe("the tree's own exports", () => {
  it('put a source condition first in every entry, naming the module the built target is read as', () => {
    const entries = [...WORKSPACE.manifests.values()].flatMap((manifest) =>
      Object.entries(manifest.exports ?? {}).map(([subpath, entry]) => ({ manifest, subpath, entry: entry as Record<string, unknown> })));
    expect(entries.length).toBeGreaterThanOrEqual(17);
    const wrong = entries.filter(({ manifest, subpath, entry }) => {
      const specifier = subpath === '.' ? manifest.name : `${manifest.name}${subpath.slice(1)}`;
      return Object.keys(entry)[0] !== 'source' || typeof entry['source'] !== 'string'
        || resolveIn(WORKSPACE, `${manifest.dir}/src/index.ts`, specifier) !== posix.join(manifest.dir, entry['source']);
    });
    expect(wrong.map(({ manifest, subpath }) => `${manifest.name} ${subpath}`)).toEqual([]);
  });

  // The PR 549 review's F5: the row above reads the manifests, and the suite scan reads vitest.config.ts as text, so neither sees a
  // resolver plugin that sends a specifier to its dist. This imports each one as the suite does and asks for the source module's
  // own instance. The POC app's `.` entry runs the POC on import (main.ts), so only its manifest is checked, above.
  it('load, under the suite, each entry from its source module', async () => {
    const entries = [...WORKSPACE.manifests.values()].flatMap((manifest) =>
      Object.entries(manifest.exports ?? {}).map(([subpath, entry]) => ({
        specifier: subpath === '.' ? manifest.name : `${manifest.name}${subpath.slice(1)}`,
        source: posix.join(manifest.dir, (entry as Record<string, string>)['source']!),
      })));
    const imported = entries.filter(({ source }) => source !== 'apps/three-surface-poc/src/main.ts');
    expect(entries.length - imported.length).toBe(1);
    expect(imported.length).toBeGreaterThanOrEqual(16);
    for (const { specifier, source } of imported) {
      expect(await import(specifier), specifier).toBe(await import(pathToFileURL(join(ROOT, source)).href));
    }
  }, 60_000);
});

// syzygy-bpyt.46: the entries the S10 bundle aliases by.
describe('the workspace entry modules', () => {
  it('reads each entry of each package, its main where it has no exports, as the src module it names', () => {
    expect(entryModulesIn(workspace({}))).toEqual({
      '@syzygy/app': 'apps/app/src/main.ts', '@syzygy/lib': 'packages/lib/src/index.ts', '@syzygy/lib/argv': 'packages/lib/src/argv.ts',
    });
  });

  it('throws on an entry the resolver cannot read', () => {
    expect(() => entryModulesIn(workspace({}, './lib/index.js'))).toThrow('@syzygy/lib: its entry is not a ./dist/X.js whose src/X.ts exists');
  });

  it('throws on a /../ segment that the resolver would join away, since Node refuses the entry', () => {
    // The resolver alone reads the entry as the module it joins to, so the throw is the entry reader's own (the PR 545 round-1 review's N6).
    expect(resolveIn(workspace({}, './dist/x/../index.js'), 'apps/app/src/main.ts', '@syzygy/lib')).toBe('packages/lib/src/index.ts');
    expect(() => entryModulesIn(workspace({}, './dist/x/../index.js')))
      .toThrow(`@syzygy/lib: its entry target "./dist/x/../index.js" has an empty, '.', '..' or 'node_modules' segment, which Node refuses (ERR_INVALID_PACKAGE_TARGET)`);
    expect(() => entryModulesIn(workspace({}, { types: './dist/index.d.ts', import: './dist/x/../index.js', default: './dist/x/../index.js' })))
      .toThrow(`@syzygy/lib: its import condition target "./dist/x/../index.js" has an empty, '.', '..' or 'node_modules' segment, which Node refuses (ERR_INVALID_PACKAGE_TARGET)`);
  });

  // syzygy-bpyt.70 (the PR 554 reviews' round-1 N3 and round-2 N3): a target Node never reads is refused too, since the resolver
  // would join it away, but its message makes no claim about Node; and the fault Node refuses is the one named.
  it('throws on such a target under a condition Node does not read, or in a main, and names the one Node refuses first', () => {
    expect(() => entryModulesIn(workspace({}, { types: './dist/x/../index.d.ts', import: './dist/index.js', default: './dist/index.js' })))
      .toThrow(`@syzygy/lib: its types condition target "./dist/x/../index.d.ts" has an empty, '.', '..' or 'node_modules' segment, which Node does not read`);
    expect(() => entryModulesIn(workspace({}, { source: './src/x/../index.ts', import: './dist/index.js', default: './dist/index.js' })))
      .toThrow(`@syzygy/lib: its source condition target "./src/x/../index.ts" has an empty, '.', '..' or 'node_modules' segment, which Node does not read`);
    expect(() => entryModulesIn(workspace({}, { node: { import: './dist/./index.js' }, default: './dist/index.js' })))
      .toThrow(`@syzygy/lib: its node > import condition target "./dist/./index.js" has an empty, '.', '..' or 'node_modules' segment, which Node refuses (ERR_INVALID_PACKAGE_TARGET)`);
    expect(() => entryModulesIn(workspace({}, { source: './src/x/../index.ts', import: './dist//index.js', default: './dist/./index.js' })))
      .toThrow(`@syzygy/lib: its default condition target "./dist/./index.js" has an empty, '.', '..' or 'node_modules' segment, which Node refuses (ERR_INVALID_PACKAGE_TARGET)`);
    expect(() => entryModulesIn(workspace({}, { require: './dist/./index.js', import: './dist/index.js', default: './dist/index.js' })))
      .toThrow(`@syzygy/lib: its require condition target "./dist/./index.js" has an empty, '.', '..' or 'node_modules' segment, which Node refuses (ERR_INVALID_PACKAGE_TARGET)`);
    const base = workspace({});
    const app = { ...base.manifests.get('@syzygy/app')!, main: './dist/x/../main.js' };
    expect(() => entryModulesIn({ ...base, manifests: new Map([...base.manifests, ['@syzygy/app', app]]) }))
      .toThrow(`@syzygy/app: its main field target "./dist/x/../main.js" has an empty, '.', '..' or 'node_modules' segment, which Node reads without its exports rules`);
  });

  // The PR 557 round-1 review's N2: the check before syzygy-bpyt.70 read the serialized entry, so it refused a condition key with a
  // /../ segment too; the target reader keeps that refusal, so nothing is newly accepted.
  it('throws on a condition key with a /../ segment, at any depth', () => {
    expect(() => entryModulesIn(workspace({}, { 'a/../b': './dist/index.js' })))
      .toThrow('@syzygy/lib: its condition key "a/../b" has a /../ segment, and no condition Node matches by default has one');
    expect(() => entryModulesIn(workspace({}, { node: { 'x/../import': './dist/index.js' }, default: './dist/index.js' })))
      .toThrow('@syzygy/lib: its node > condition key "x/../import" has a /../ segment, and no condition Node matches by default has one');
    // A key fault beside a target Node refuses: the target is named, as the more severe (the PR 557 round-2 review's N2, its RK3).
    expect(() => entryModulesIn(workspace({}, { 'a/../b': './dist/index.js', import: './dist/./index.js', default: './dist/./index.js' })))
      .toThrow(`@syzygy/lib: its import condition target "./dist/./index.js" has an empty, '.', '..' or 'node_modules' segment, which Node refuses (ERR_INVALID_PACKAGE_TARGET)`);
    expect(entryModulesIn(workspace({}, { 'a/..b': './dist/index.js', default: './dist/index.js' }))['@syzygy/lib']).toBe('packages/lib/src/index.ts');
  });
});

describe("the segment rules the entry reader copies from Node 24's exports resolver", () => {
  // Each expectation is Node 24.6.0's own outcome for that target under `import`, recorded by
  // docs/evidence/syzygy-bpyt-70/tools/node_segments.mjs in node-segments.json. `warns`: Node accepts the target with DEP0166;
  // it then loads `./dist//index.js` and fails to load `./dist/`, which names a directory.
  const CASES: readonly (readonly [string, 'loads' | 'refuses' | 'warns'])[] = [
    ['./dist/index.js', 'loads'], ['./dist/.hidden/index.js', 'loads'], ['./dist/..x/index.js', 'loads'], ['./dist/node_modules_x/index.js', 'loads'],
    ['./dist/x/../index.js', 'refuses'], ['./dist/./index.js', 'refuses'], ['./dist/node_modules/index.js', 'refuses'],
    ['./dist/NODE_MODULES/index.js', 'refuses'], ['./dist/%2e%2e/index.js', 'refuses'], ['./dist/%2E/index.js', 'refuses'],
    ['./dist/%6eode_modules/index.js', 'refuses'], ['./dist/x\\..\\index.js', 'refuses'], ['./dist//index.js', 'warns'],
    ['./dist/%4Eode_modules/index.js', 'refuses'], ['./dist/', 'warns'],
  ];
  it.each(CASES)('reads %j as Node does: it %s', (target, outcome) => {
    const fault = segmentFaultOf({ import: target }, false);
    expect(fault === undefined ? 'loads' : fault.endsWith('which Node refuses (ERR_INVALID_PACKAGE_TARGET)') ? 'refuses'
      : fault.endsWith('which Node accepts with a deprecation warning (DEP0166)') ? 'warns' : fault).toBe(outcome);
  });
});
