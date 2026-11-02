import { execFile, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import ts from 'typescript';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { ROOT, readModule, resolve } from '../../../packages/polaris-generation-core/src/workspace-reach.testkit.js';

// syzygy-bpyt.4.2: `npm run build` emits the product, with no test and no test-support module but two kits a reader takes from
// dist, and `npm run typecheck` is the one program that reads the tests. TypeScript emits every module of the project in the
// program a tsconfig builds: the modules it names and every module one of those imports or names in a triple-slash reference,
// whatever `exclude` says (a composite build also fails, TS6307), so a build emits no test support only while each project
// excludes it and no module it builds reaches it. A tool runs over a dist the build has just written whole:
// scripts/clean_build.mjs removes every dist `tsc -b` will build before it builds, where `tsc -b --force` kept an output whose
// source was gone and `tsc -b` alone also kept one altered since it was written.

const TEST = /\.test\.ts$/u;
const KIT = /\.testkit\.ts$/u;
// Test support that is not named as a kit: each opens with a `Test support:` comment, and only tests import it. Other modules that
// open so (test-model-fixture.ts and its kind) are imported by product modules, so they are product.
const TEST_SUPPORT = [
  'apps/three-surface-poc/src/test-deep-dive-markers.ts',
  'apps/three-surface-poc/src/test-fixture-sweep.global-setup.ts',
  'apps/three-surface-poc/src/test-http-client.ts',
  'packages/three-surface-poc-core/src/test-cleanup.ts',
  'packages/three-surface-poc-core/src/test-frozen.ts',
];
const isTestSupport = (path: string): boolean => TEST.test(path) || KIT.test(path) || TEST_SUPPORT.includes(path);
// The kits the product build keeps, each for the reader that takes it from dist.
const BUILT_KITS = {
  'packages/polaris-dossier/src/full-run.testkit.ts': 'scripts/dossier_scale_measure.mjs imports its dist',
  'packages/polaris-generation-consent/src/recorder-fixtures.testkit.ts': "the package's ./testing export re-exports it",
};
// What each project's tsconfig.json excludes from its include, ["src"].
const EXCLUDES: Readonly<Record<string, readonly string[]>> = {
  'apps/syzygy': ['src/**/*.test.ts'],
  'apps/three-surface-poc': ['src/**/*.test.ts', 'src/test-deep-dive-markers.ts', 'src/test-fixture-sweep.global-setup.ts', 'src/test-http-client.ts'],
  'packages/cap1-core': ['src/**/*.test.ts'],
  'packages/cap1-daemon': ['src/**/*.test.ts'],
  'packages/http-host': ['src/**/*.test.ts'],
  'packages/polaris-dossier': ['src/**/*.test.ts', 'src/child-process.testkit.ts', 'src/fs-patch.testkit.ts'],
  'packages/polaris-generation-consent': ['src/**/*.test.ts'],
  'packages/polaris-generation-core': ['src/**/*.test.ts', 'src/**/*.testkit.ts'],
  'packages/support': ['src/**/*.test.ts', 'src/**/*.testkit.ts'],
  'packages/three-surface-poc-core': ['src/**/*.test.ts', 'src/test-cleanup.ts', 'src/test-frozen.ts'],
};
const tracked = execFileSync('git', ['-C', ROOT, 'ls-files', '-z', '--', 'apps', 'packages'], { encoding: 'utf8' }).split('\0').filter((path) => path !== '');
const manifest = JSON.parse(readModule('package.json')) as { readonly scripts: Readonly<Record<string, string>> };
const projects = tracked.filter((path) => /^(?:apps|packages)\/[^/]+\/tsconfig\.json$/u.test(path)).map((path) => path.slice(0, -'/tsconfig.json'.length));
const CLEAN_BUILD = 'node scripts/clean_build.mjs';
const projectsOf = (script: string | undefined): string[] | undefined =>
  new RegExp(`^${CLEAN_BUILD} ((?:(?:apps|packages)/[\\w.-]+ ?)+)$`, 'u').exec(script ?? '')?.[1]?.trim().split(' ');
// Child processes run async (syzygy-w90k): a synchronous block over 60s starves vitest's worker RPC.
const run = promisify(execFile);
const cleanups: string[] = [];
afterEach(() => { for (const directory of cleanups.splice(0)) rmSync(directory, { recursive: true, force: true }); });

const importsOf = (from: string): string[] => ts.preProcessFile(readModule(from), true, true).importedFiles.map(({ fileName }) => fileName);
// The modules a project's build emits: every source file of the project's own src/ in the program TypeScript builds from its
// tsconfig.json, the files it names and every one they reach by an import or a triple-slash reference (syzygy-bpyt.65; a model
// that followed imports alone missed the PR 549 review's X10). A declaration file emits nothing.
function emitted(project: string, root: string = ROOT): string[] {
  const base = root.endsWith('/') ? root : `${root}/`;
  const path = join(base, project, 'tsconfig.json');
  const parsed = ts.parseJsonConfigFileContent(ts.readConfigFile(path, ts.sys.readFile).config, ts.sys, dirname(path));
  const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options, projectReferences: parsed.projectReferences });
  return program.getSourceFiles().map(({ fileName }) => fileName)
    .filter((file) => file.startsWith(`${base}${project}/src/`) && !file.endsWith('.d.ts')).map((file) => file.slice(base.length)).sort();
}

describe('the product build', () => {
  // One program per project, built once: two rows read them, and under load they take longer than a test's default timeout.
  let modules: string[] = [];
  beforeAll(() => { modules = projects.flatMap((project) => emitted(project)); }, 120_000);

  it('builds every workspace project with a tsconfig, each excluding its tests and test support and keeping its outputs under dist', () => {
    expect(projectsOf(manifest.scripts['build'])?.slice().sort()).toEqual(projects.slice().sort());
    expect(Object.keys(EXCLUDES)).toEqual(projects.slice().sort());
    for (const project of projects) {
      const config = JSON.parse(readModule(`${project}/tsconfig.json`)) as { readonly files?: unknown; readonly include?: unknown; readonly exclude?: unknown; readonly compilerOptions?: Record<string, unknown> };
      expect([config.files, config.include, config.exclude], project).toEqual([undefined, ['src'], EXCLUDES[project]]);
      expect(config.compilerOptions, project).toMatchObject({ rootDir: 'src', outDir: 'dist', tsBuildInfoFile: 'dist/.tsbuildinfo' });
    }
  });

  it('builds through the clean build alone, before every tool that runs a built module', () => {
    const scripts = Object.entries(manifest.scripts);
    expect(scripts.filter(([, script]) => /--force|\btsc\b/u.test(script)).map(([name]) => name)).toEqual(['typecheck']);
    expect(projectsOf(manifest.scripts['build:poc'])?.every((project) => projects.includes(project))).toBe(true);
    // A tool runs a built module only after one of the two builds, in the same script. poc:restart replaces a running listener
    // with an identical successor from the dist that listener runs, so it builds nothing.
    const tools = scripts.filter(([, script]) => /\bnode (?:apps|packages)\/[^ ]+\/dist\//u.test(script)).map(([name, script]) => ({ name, script }));
    expect(tools.length).toBeGreaterThanOrEqual(16);
    expect(tools.filter(({ script }) => !/^(?:node scripts\/check_generator_install\.mjs && )?npm run build(?::poc)? --silent && node /u.test(script)).map(({ name }) => name))
      .toEqual(['poc:restart']);
  });

  it('emits no test and no test-support module, but the two kits a reader takes from dist', () => {
    expect(modules.length).toBeGreaterThan(200);
    expect(modules.filter(isTestSupport)).toEqual(Object.keys(BUILT_KITS).sort());
  });

  it('imports no test or test-support module from any module it builds, but the consent package\'s testing entry its kit', () => {
    const edges = modules.flatMap((from) => importsOf(from).map((specifier) => ({ from, to: resolve(from, specifier) })));
    expect(edges.length).toBeGreaterThan(1000);
    expect(edges.filter(({ to }) => typeof to === 'string' && isTestSupport(to)).map(({ from, to }) => `${from} imports ${to}`))
      .toEqual(['packages/polaris-generation-consent/src/testing.ts imports packages/polaris-generation-consent/src/recorder-fixtures.testkit.ts']);
  });
});

// One-file projects in a scratch tree: d referencing b, b referencing a, and c, which none names; and tools/x, a project outside
// apps/* and packages/*. The script runs from the scratch root.
function scratchTree(): string {
  const root = mkdtempSync(join(tmpdir(), 'syzygy-clean-build-'));
  cleanups.push(root);
  const project = (dir: string, references: readonly string[]): void => {
    const name = dir.slice(dir.lastIndexOf('/') + 1);
    mkdirSync(join(root, dir, 'src'), { recursive: true });
    writeFileSync(join(root, dir, 'src', `${name}.ts`), `export const ${name} = '${name}';\n`);
    writeFileSync(join(root, dir, 'tsconfig.json'), JSON.stringify({
      compilerOptions: { composite: true, target: 'ES2022', module: 'ES2022', moduleResolution: 'bundler', types: [], rootDir: 'src', outDir: 'dist', tsBuildInfoFile: 'dist/.tsbuildinfo' },
      include: ['src'], references: references.map((path) => ({ path })),
    }));
  };
  project('packages/a', []);
  project('packages/b', ['../a']);
  project('packages/c', []);
  project('packages/d', ['../b']);
  project('tools/x', []);
  return root;
}
const cleanBuild = (root: string, ...projects: string[]) => run(process.execPath, [join(ROOT, 'scripts/clean_build.mjs'), ...projects], { cwd: root });
const plant = (root: string, path: string, text: string): void => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), text); };
const editConfig = (root: string, dir: string, edit: (config: Record<string, any>) => void): void => {
  const config = JSON.parse(readFileSync(join(root, dir, 'tsconfig.json'), 'utf8')) as Record<string, any>;
  edit(config);
  writeFileSync(join(root, dir, 'tsconfig.json'), JSON.stringify(config));
};
// A project's tsconfig.json extends a base.json beside it that sets these compilerOptions.
const inherit = (root: string, dir: string, compilerOptions: Record<string, unknown>): void => {
  plant(root, `${dir}/base.json`, JSON.stringify({ compilerOptions }));
  editConfig(root, dir, (config) => { config.extends = './base.json'; });
};

describe('the clean build', () => {
  it('leaves no output it did not just write in any project it builds, and leaves other projects alone', async () => {
    const root = scratchTree();
    await cleanBuild(root, 'packages/d');
    const fresh = readFileSync(join(root, 'packages/b/dist/b.js'), 'utf8');
    expect(fresh).toContain("export const b = 'b';");
    expect(existsSync(join(root, 'packages/a/dist/a.js'))).toBe(true);
    plant(root, 'packages/b/dist/b.js', 'throw new Error("poisoned output");\n');
    // a is two references below d, the one project named.
    plant(root, 'packages/a/dist/removed-source.js', 'throw new Error("stale output");\n');
    rmSync(join(root, 'packages/a/dist/a.js'));
    plant(root, 'packages/c/dist/c.js', 'not built here\n');
    await cleanBuild(root, 'packages/d');
    expect(readFileSync(join(root, 'packages/b/dist/b.js'), 'utf8')).toBe(fresh);
    expect(existsSync(join(root, 'packages/a/dist/removed-source.js'))).toBe(false);
    expect(existsSync(join(root, 'packages/a/dist/a.js'))).toBe(true);
    expect(existsSync(join(root, 'packages/d/dist/d.js'))).toBe(true);
    expect(readFileSync(join(root, 'packages/c/dist/c.js'), 'utf8')).toBe('not built here\n');
  }, 60_000);

  // Each case plants an output in every project's dist and in a's `types`, and every one must survive the refusal.
  const KEPT = ['packages/a/dist/a.js', 'packages/a/types/a.d.ts', 'packages/b/dist/b.js', 'packages/d/dist/d.js', 'tools/x/dist/x.js'];
  const KEPT_OUTSIDE: string[] = [];
  it.each<[string, string[], (root: string) => void, string]>([
    ['names no project', [], () => {}, 'usage:'],
    ['names a directory with no tsconfig.json', ['packages/e'], () => {}, 'packages/e: not a workspace project'],
    ['names a project outside the workspaces', ['tools/x'], () => {}, 'tools/x: not a workspace project'],
    ['reaches a project whose outputs leave dist', ['packages/d'], (root) => editConfig(root, 'packages/a', (config) => { config.compilerOptions.outDir = 'out'; }),
      'packages/a/tsconfig.json: its outputs and incremental state are not both under dist'],
    ['reaches a project whose declarations leave dist', ['packages/d'], (root) => editConfig(root, 'packages/a', (config) => { config.compilerOptions.declarationDir = 'types'; }),
      'packages/a/tsconfig.json: its outputs and incremental state are not both under dist'],
    ['reaches a project that bundles its outputs into one file', ['packages/d'], (root) => editConfig(root, 'packages/a', (config) => { config.compilerOptions.outFile = 'dist/a.js'; }),
      'packages/a/tsconfig.json: its outputs and incremental state are not both under dist'],
    ['reaches a reference cycle', ['packages/d'], (root) => editConfig(root, 'packages/a', (config) => { config.references = [{ path: '../d' }]; }),
      'packages/d -> packages/b -> packages/a -> packages/d: project references form a cycle'],
    ['reaches a tsconfig.json that is not plain JSON', ['packages/d'], (root) => writeFileSync(join(root, 'packages/a/tsconfig.json'), `// a comment\n${readFileSync(join(root, 'packages/a/tsconfig.json'), 'utf8')}`),
      'packages/a/tsconfig.json: not plain JSON'],
    ['names a project whose directory resolves outside the checkout', ['packages/e'], (root) => {
      const outside = mkdtempSync(join(tmpdir(), 'syzygy-clean-build-outside-'));
      cleanups.push(outside);
      plant(outside, 'tsconfig.json', readFileSync(join(root, 'packages/c/tsconfig.json'), 'utf8'));
      plant(outside, 'dist/e.js', 'kept\n');
      symlinkSync(outside, join(root, 'packages/e'));
      KEPT_OUTSIDE.push(join(outside, 'dist/e.js'));
    }, 'packages/e: resolves outside the checkout'],
    // syzygy-bpyt.65: options as TypeScript reads them, through `extends`, each refused before anything is removed.
    ['reaches a project whose declarations leave dist through extends', ['packages/d'], (root) => inherit(root, 'packages/a', { declarationDir: 'types' }),
      'packages/a/tsconfig.json: its outputs and incremental state are not both under dist'],
    ['reaches a project that bundles its outputs into one file through extends', ['packages/d'], (root) => inherit(root, 'packages/a', { outFile: 'dist/a.js' }),
      'packages/a/tsconfig.json: its outputs and incremental state are not both under dist'],
    ['reaches a referenced project that is not composite', ['packages/d'], (root) => editConfig(root, 'packages/a', (config) => { config.compilerOptions.composite = false; }),
      'packages/a/tsconfig.json: a referenced project is not composite'],
    ['reaches a referenced project that does not set composite', ['packages/d'], (root) => editConfig(root, 'packages/a', (config) => { delete config.compilerOptions.composite; }),
      'packages/a/tsconfig.json: a referenced project is not composite'],
    ['reaches a referenced project that inherits composite false', ['packages/d'], (root) => {
      editConfig(root, 'packages/a', (config) => { delete config.compilerOptions.composite; });
      inherit(root, 'packages/a', { composite: false });
    }, 'packages/a/tsconfig.json: a referenced project is not composite'],
    ['reaches a project whose declarations sit in a sibling of dist through extends', ['packages/d'], (root) => inherit(root, 'packages/a', { declarationDir: 'dist-x' }),
      'packages/a/tsconfig.json: its outputs and incremental state are not both under dist'],
  ])('refuses, removing nothing, when it %s', async (_case, projects, edit, reason) => {
    // A row whose refusal fails leaves its outside path behind; it is not the next row's (syzygy-bpyt.4.42).
    KEPT_OUTSIDE.length = 0;
    const root = scratchTree();
    edit(root);
    for (const path of KEPT) plant(root, path, 'kept\n');
    await expect(cleanBuild(root, ...projects)).rejects.toMatchObject({ stderr: expect.stringContaining(reason) });
    for (const path of [...KEPT.map((kept) => join(root, kept)), ...KEPT_OUTSIDE]) expect(readFileSync(path, 'utf8'), path).toBe('kept\n');
  }, 30_000);

  // TypeScript reads a backslash in a path as a separator, so it resolves this project's outDir to packages/x/y/dist, outside its
  // own dist, while the tsconfig's own outDir is 'dist' (R6).
  it('refuses, removing nothing, when it names a project whose directory name holds a backslash', async () => {
    const root = scratchTree();
    plant(root, 'packages/x\\y/src/m.ts', "export const m = 'm';\n");
    plant(root, 'packages/x\\y/tsconfig.json', readFileSync(join(root, 'packages/c/tsconfig.json'), 'utf8'));
    plant(root, 'packages/x\\y/dist/m.js', 'kept\n');
    await expect(cleanBuild(root, 'packages/x\\y')).rejects
      .toMatchObject({ stderr: expect.stringContaining('packages/x\\y/tsconfig.json: its outputs and incremental state are not both under dist') });
    expect(readFileSync(join(root, 'packages/x\\y/dist/m.js'), 'utf8')).toBe('kept\n');
  }, 30_000);

  // tsc -b requires composite only of a referenced project, so a named project nothing references builds without it.
  it('builds a named project that nothing references and that is not composite', async () => {
    const root = scratchTree();
    editConfig(root, 'packages/c', (config) => { delete config.compilerOptions.composite; config.compilerOptions.incremental = true; });
    await cleanBuild(root, 'packages/c');
    expect(readFileSync(join(root, 'packages/c/dist/c.js'), 'utf8')).toContain("export const c = 'c';");
  }, 60_000);

  // Every workspace project takes composite from tsconfig.base.json, so the script reads it as TypeScript does, through extends.
  it('builds a referenced project that inherits composite through extends', async () => {
    const root = scratchTree();
    editConfig(root, 'packages/a', (config) => { delete config.compilerOptions.composite; });
    inherit(root, 'packages/a', { composite: true });
    await cleanBuild(root, 'packages/d');
    expect(readFileSync(join(root, 'packages/a/dist/a.js'), 'utf8')).toContain("export const a = 'a';");
  }, 60_000);
});

describe('the emitted-set model', () => {
  // The PR 549 review's X10: a triple-slash reference puts a module in the program, so tsc emits it, though no module imports it.
  it('takes in a module a triple-slash reference names, as tsc --listFilesOnly does', async () => {
    const root = scratchTree();
    editConfig(root, 'packages/a', (config) => { config.exclude = ['src/**/*.test.ts']; });
    plant(root, 'packages/a/src/t.test.ts', "export const t = 't';\n");
    const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc');
    const listed = async (): Promise<string[]> => (await run(process.execPath, [tsc, '-p', join(root, 'packages/a/tsconfig.json'), '--listFilesOnly'])).stdout
      .split('\n').filter((file) => file.startsWith(`${root}/packages/a/src/`)).map((file) => file.slice(root.length + 1)).sort();
    expect(emitted('packages/a', root)).toEqual(['packages/a/src/a.ts']);
    expect(await listed()).toEqual(['packages/a/src/a.ts']);
    plant(root, 'packages/a/src/a.ts', `/// <reference path="./t.test.ts" />\n${readFileSync(join(root, 'packages/a/src/a.ts'), 'utf8')}`);
    expect(emitted('packages/a', root)).toEqual(['packages/a/src/a.ts', 'packages/a/src/t.test.ts']);
    expect(await listed()).toEqual(['packages/a/src/a.ts', 'packages/a/src/t.test.ts']);
  }, 60_000);
});

describe('the typecheck', () => {
  it('reads every module of every workspace, tests among them, from source and emits nothing', () => {
    const config = JSON.parse(readModule('tsconfig.json')) as { readonly compilerOptions: Record<string, unknown>; readonly include: readonly string[] };
    expect(manifest.scripts['typecheck']).toBe('tsc -p tsconfig.json');
    expect(config.include).toEqual(['apps/*/src', 'packages/*/src', 'packages/*/test-support']);
    expect(config.compilerOptions).toMatchObject({ noEmit: true, customConditions: ['source'] });
    const outside = tracked.filter((path) => /\.[cm]?tsx?$/u.test(path) && !/^(?:apps|packages)\/[^/]+\/(?:src|test-support)\//u.test(path));
    expect(outside).toEqual(['packages/cap1-system/vitest.config.ts']);
  });
});
