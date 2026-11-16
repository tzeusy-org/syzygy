import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ROOT, WORKSPACE, resolve, resolveIn, type Manifest, type Workspace } from './workspace-reach.testkit.js';

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
});
