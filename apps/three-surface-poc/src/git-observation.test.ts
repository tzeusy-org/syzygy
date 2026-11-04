import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { reach, readModule, WORKSPACE } from '../../../packages/polaris-generation-core/src/workspace-reach.testkit.js';
import {
  observeGitRepository,
  observeGitHorizon,
  observeObservatoryDrift,
  observeRevisionChange,
  PWB_APPROVED_REPOSITORY_LOCATOR,
  pocObserverInputsAreClean,
  resolvePwbRepositoryBinding,
} from './git-observation.js';
import { tempDir } from '@syzygy/test-kit';

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

function git(root: string, args: readonly string[]): string {
  return execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

function repositoryWithFile(relativePath: string): string {
  const root = tempDir('syzygy-poc-git-');
  const absolutePath = join(root, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, 'export const value = 1;\n', 'utf8');
  git(root, ['init', '-q']);
  git(root, ['config', 'gc.auto', '0']);
  git(root, ['config', 'maintenance.auto', 'false']);
  git(root, ['config', 'user.email', 'poc-test@example.invalid']);
  git(root, ['config', 'user.name', 'POC Test']);
  git(root, ['add', relativePath]);
  git(root, ['commit', '-qm', 'fixture']);
  return root;
}

function repositoryWithFiles(files: Readonly<Record<string, string>>): string {
  const root = tempDir('syzygy-poc-git-');
  for (const [relativePath, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, relativePath)), { recursive: true });
    writeFileSync(join(root, relativePath), text, 'utf8');
  }
  git(root, ['init', '-q']);
  git(root, ['config', 'gc.auto', '0']);
  git(root, ['config', 'maintenance.auto', 'false']);
  git(root, ['config', 'user.email', 'poc-test@example.invalid']);
  git(root, ['config', 'user.name', 'POC Test']);
  git(root, ['add', '-A']);
  git(root, ['commit', '-qm', 'fixture']);
  return root;
}

const ROOT_FILES = ['package.json', 'package-lock.json', 'tsconfig.base.json'];

/** What the POC start compiles or loads, read from the tree (syzygy-bpyt.56): the projects of the build step root package.json's
 * `poc` script runs, every project their tsconfig references reach, and every workspace the `poc` entry's import walk reaches; and
 * the exact inputs, the three root files plus the build step's program. A `poc` or build script of any other shape throws. */
function pocStartInputs(): { readonly projects: readonly string[]; readonly exact: readonly string[] } {
  const { scripts } = JSON.parse(readModule('package.json')) as { readonly scripts: Readonly<Record<string, string>> };
  const poc = /^npm run ([\w:-]+) --silent && node ((?:apps|packages)\/[^/ ]+)\/dist\/(\S+)\.js$/u.exec(scripts['poc'] ?? '');
  if (poc === null) throw new Error(`scripts.poc is not "npm run <build> --silent && node <project>/dist/<entry>.js": ${scripts['poc']}`);
  const [, buildScript, app, entry] = poc as unknown as [string, string, string, string];
  const [node, program, ...build] = (scripts[buildScript] ?? '').split(' ');
  if (node !== 'node' || program === undefined || build.length === 0) throw new Error(`scripts.${buildScript} is not "node <program> <project>...": ${scripts[buildScript]}`);
  const projects = new Set<string>();
  const visit = (project: string): void => {
    if (projects.has(project)) return;
    projects.add(project);
    const config = JSON.parse(readModule(`${project}/tsconfig.json`)) as { readonly references?: readonly { readonly path: string }[] };
    for (const reference of config.references ?? []) visit(posix.normalize(posix.join(project, reference.path)));
  };
  build.forEach(visit);
  const { reachable, unresolved } = reach(`${app}/src/${entry}.ts`, (file) =>
    ts.preProcessFile(readModule(file), true, true).importedFiles.map((imported) => imported.fileName));
  if (unresolved.length > 0) throw new Error(`unresolved: ${unresolved.map((edge) => `${edge.from} imports ${edge.specifier}`).join(', ')}`);
  if (!reachable.includes('packages/support/src/sha256.ts')) throw new Error('the import walk does not reach packages/support/src/sha256.ts');
  const workspaces = [...WORKSPACE.manifests.values()].map((manifest) => manifest.dir).filter((dir) => dir !== '.');
  for (const module of reachable) {
    const owner = workspaces.find((dir) => module.startsWith(`${dir}/`));
    if (owner === undefined) throw new Error(`${module}: in no workspace`);
    projects.add(owner);
  }
  return { projects: [...projects].sort(), exact: [...ROOT_FILES, program].sort() };
}

describe('read-only Git observation', () => {
  it('binds only the approved resolved locator and its exact Git common directory', () => {
    const result = resolvePwbRepositoryBinding('/configured/butlers-link', {
      approvedLocator: '/approved/butlers',
      realpath: (path) => path === '/configured/butlers-link' ? '/approved/butlers' : path,
      runGit: () => '/approved/butlers/.git\n',
    });
    expect(result).toEqual({ kind: 'bound', locator: '/approved/butlers', gitCommonDirectory: '/approved/butlers/.git' });
  });

  it('keeps the approved locator byte-equal to the act-bound consent mapping', () => {
    const consent = readFileSync(join(REPO_ROOT, '.syzygy/governance/decisions/BUTLERS-PROJECT-SHAPE-OBSERVATION-CONSENT.md'), 'utf8');
    expect(consent).toContain(`Current locator: \`${PWB_APPROVED_REPOSITORY_LOCATOR}\` (configuration, not repository`);
  });

  it('rejects a second Butlers-shaped repository before any repository observation', () => {
    let gitCalls = 0;
    const result = resolvePwbRepositoryBinding('/other/butlers', {
      approvedLocator: '/approved/butlers',
      realpath: (path) => path,
      runGit: () => {
        gitCalls += 1;
        return '/other/butlers/.git\n';
      },
    });
    expect(result).toEqual({ kind: 'rejected', reason: 'locator-mismatched' });
    expect(gitCalls).toBe(0);
  });

  it('rejects a mismatched Git common directory', () => {
    const result = resolvePwbRepositoryBinding('/approved/butlers', {
      approvedLocator: '/approved/butlers',
      realpath: (path) => path,
      runGit: () => '/other/object-database\n',
    });
    expect(result).toEqual({ kind: 'rejected', reason: 'git-common-directory-mismatched' });
  });

  it('allows unrelated dirty files while protecting POC runtime inputs', () => {
    expect(pocObserverInputsAreClean({ changedPaths: ['.gitignore'] })).toBe(true);
    expect(
      pocObserverInputsAreClean({
        changedPaths: ['apps/three-surface-poc/src/main.ts'],
      }),
    ).toBe(false);
    expect(
      pocObserverInputsAreClean({
        changedPaths: ['packages/three-surface-poc-core/src/model.ts'],
      }),
    ).toBe(false);
    expect(
      pocObserverInputsAreClean({ changedPaths: ['packages/cap1-daemon/src/server.ts'] }),
    ).toBe(false);
    expect(pocObserverInputsAreClean({ changedPaths: ['package.json'] })).toBe(false);
  });

  // syzygy-bpyt.7.3: the host the POC serves through moved out of cap1-daemon; its bytes are still a runtime input.
  // syzygy-bpyt.7.14: so is its manifest, which names the entry the POC resolves.
  it('protects the HTTP host package the POC serves through', () => {
    expect(pocObserverInputsAreClean({ changedPaths: ['packages/http-host/src/server.ts'] })).toBe(false);
    expect(pocObserverInputsAreClean({ changedPaths: ['packages/http-host/package.json'] })).toBe(false);
  });

  // syzygy-bpyt.4.2, the PR 549 review's F2: `build:poc` names scripts/clean_build.mjs, which removes the dists and runs tsc, so the
  // build definition that package.json held whole before is protected as an exact input too.
  it('protects the clean-build script that build:poc runs', () => {
    expect(pocObserverInputsAreClean({ changedPaths: ['scripts/clean_build.mjs'] })).toBe(false);
  });

  // Owner direction GP-B2 Q3, answer B (syzygy-bpyt.56): the gate protects every project the POC start compiles or loads, and this
  // row derives that set instead of listing it. The start is root package.json's `poc` script: its build step (`build:poc`, a
  // `node <program> <project>...` command), every project those projects' tsconfig references reach, and every workspace the
  // `poc` entry's import walk reaches (the walk follows every edge TypeScript's preprocessor reports, as island-boundary.test.ts
  // does). The exact inputs are the three root files and the build step's program (scripts/clean_build.mjs, syzygy-bpyt.4.2). The
  // row requires the gate to refuse exactly those, so a prefix it lacks, one it has beyond them, or one narrowed to src/ (the PR 535
  // review's N6) fails it, over every tracked path and, for each workspace, a manifest, a tsconfig, an untracked module and a
  // sibling directory that only shares the name's start, and a path under docs/ that carries the name after its first segment.
  it('refuses exactly the projects the POC start compiles or loads, and the files that define its build', () => {
    const { projects, exact } = pocStartInputs();
    expect(projects).toEqual([
      'apps/three-surface-poc',
      'packages/cap1-core',
      'packages/cap1-daemon',
      'packages/http-host',
      'packages/polaris-generation-consent',
      'packages/polaris-generation-core',
      'packages/support',
      'packages/three-surface-poc-core',
    ]);
    expect(exact).toEqual(['package-lock.json', 'package.json', 'scripts/clean_build.mjs', 'tsconfig.base.json']);
    const workspaces = [...WORKSPACE.manifests.values()].map((manifest) => manifest.dir).filter((dir) => dir !== '.').sort();
    expect(workspaces, 'the workspaces the probes are built over; a new workspace needs its probes reviewed').toHaveLength(13);
    const tracked = git(REPO_ROOT, ['ls-files', '-z']).split('\0').filter((path) => path !== '');
    const probes = [...workspaces.flatMap((dir) => [`${dir}/package.json`, `${dir}/tsconfig.json`, `${dir}/src/__untracked__.ts`, `${dir}x/a.ts`, `docs/${dir}/a.ts`]), 'scripts/clean_build.mjs.bak'];
    expect(probes, 'five probes per workspace and the program\'s near-miss; a changed count means the probe list changed').toHaveLength(66);
    const population = [...new Set([...tracked, ...probes])].sort();
    const isInput = (path: string): boolean => exact.includes(path) || projects.some((dir) => path.startsWith(`${dir}/`));
    expect(population.filter((path) => pocObserverInputsAreClean({ changedPaths: [path] }) === isInput(path))
      .map((path) => `${path}: ${isInput(path) ? 'accepted' : 'refused'}`)).toEqual([]);
    expect(tracked.filter(isInput).length).toBeGreaterThan(0);
  });

  // A tsconfig.base.json every protected project's own tsconfig.json extends, so the root file the gate protects is the one each
  // build reads its options from. A protected project whose chain ends anywhere else, or passes through a file outside every protected project, fails here.
  it('reads every protected project from tsconfig.base.json through its own extends chain', () => {
    const { projects } = pocStartInputs();
    for (const project of projects) {
      const chain: string[] = [];
      for (let config: string | undefined = `${project}/tsconfig.json`; config !== undefined;) {
        chain.push(config);
        const { extends: base } = JSON.parse(readModule(config)) as { readonly extends?: string };
        config = base === undefined ? undefined : posix.normalize(posix.join(posix.dirname(config), base));
      }
      expect(chain.at(-1), project).toBe('tsconfig.base.json');
      expect(chain.filter((link) => link !== 'tsconfig.base.json' && !projects.some((dir) => link.startsWith(`${dir}/`))), project).toEqual([]);
    }
  });

  // The two edits observed on 2026-10-27 (syzygy-bpyt.1.16): a protected-looking project's tsconfig.json sends its outDir into
  // packages/http-host/dist, and an untracked module there overwrites one the daemon imports. Through polaris-generation-core the
  // gate accepted that tree before syzygy-bpyt.56; through cap1-daemon it refused it. Both forms are planted, the project's own
  // outDir and one inherited through `extends`, and observed as the gate observes them, untracked files included. Since #549
  // scripts/clean_build.mjs refuses both before building too (a project's own outDir must be dist, and the inherited form sets
  // none), so these rows pin the gate's own refusal, beside the build's.
  it.each(['packages/polaris-generation-core', 'packages/cap1-daemon'])('refuses a tree that builds %s into another package\'s dist', (project) => {
    const tsconfig = `${project}/tsconfig.json`;
    const base = JSON.stringify({ extends: '../../tsconfig.base.json', compilerOptions: { outDir: 'dist', tsBuildInfoFile: 'dist/.tsbuildinfo' }, include: ['src'] });
    const escape = JSON.stringify({ extends: '../../tsconfig.base.json', compilerOptions: { outDir: '../http-host/dist' } });
    const planted = { [tsconfig]: { extends: '../../tsconfig.base.json', compilerOptions: { outDir: '../http-host/dist', tsBuildInfoFile: 'dist/.tsbuildinfo' }, include: ['src/escape-html.ts'] } };
    const inherited = { [tsconfig]: { extends: './escape.json', compilerOptions: { tsBuildInfoFile: 'dist/.tsbuildinfo' }, include: ['src/escape-html.ts'] } };
    for (const [form, config, extra] of [['own outDir', planted, {}], ['inherited outDir', inherited, { [`${project}/escape.json`]: escape }]] as const) {
      const root = repositoryWithFiles({ [tsconfig]: base, [`${project}/src/index.ts`]: 'export const value = 1;\n' });
      writeFileSync(join(root, tsconfig), `${JSON.stringify(config[tsconfig])}\n`, 'utf8');
      for (const [path, text] of Object.entries(extra)) writeFileSync(join(root, path), text, 'utf8');
      writeFileSync(join(root, project, 'src', 'escape-html.ts'), "export const escapeHtml = (text: string): string => text;\n", 'utf8');
      const observation = observeGitRepository(root);
      expect(observation.changedPaths, form).toEqual([tsconfig, ...Object.keys(extra), `${project}/src/escape-html.ts`].sort());
      expect(pocObserverInputsAreClean(observation), form).toBe(false);
    }
  });

  it('identifies clean and dirty states without refreshing the index', () => {
    const root = repositoryWithFile('src/example.ts');

    const indexPath = join(root, '.git', 'index');
    const before = statSync(indexPath, { bigint: true }).mtimeNs;
    const clean = observeGitRepository(root);
    const afterClean = statSync(indexPath, { bigint: true }).mtimeNs;
    expect(clean.clean).toBe(true);
    expect(clean.changedPaths).toEqual([]);
    expect(clean.revision).toMatch(/^[0-9a-f]{40}$/);
    expect(clean.worktreeMetadataDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(afterClean).toBe(before);

    writeFileSync(join(root, 'src', 'example.ts'), 'export const value = 2;\n', 'utf8');
    const dirty = observeGitRepository(root);
    const afterDirty = statSync(indexPath, { bigint: true }).mtimeNs;
    expect(dirty.clean).toBe(false);
    expect(dirty.changedPaths).toEqual(['src/example.ts']);
    expect(dirty.worktreeMetadataDigest).not.toBe(clean.worktreeMetadataDigest);
    expect(afterDirty).toBe(before);
  });

  it('retains a protected source path when it is renamed out', () => {
    const protectedPath = 'apps/three-surface-poc/src/main.ts';
    for (const staged of [true, false]) {
      const root = repositoryWithFile(protectedPath);
      mkdirSync(join(root, 'notes'), { recursive: true });
      if (staged) {
        git(root, ['mv', protectedPath, 'notes/main.ts']);
      } else {
        renameSync(join(root, protectedPath), join(root, 'notes/main.ts'));
      }

      const observation = observeGitRepository(root);
      expect(observation.changedPaths).toContain(protectedPath);
      expect(pocObserverInputsAreClean(observation)).toBe(false);
    }
  });

  it('computes a metadata-only changed/added horizon between revisions', () => {
    const root = repositoryWithFile('src/example.ts');
    const pinned = git(root, ['rev-parse', 'HEAD']);
    mkdirSync(join(root, 'src', 'new'), { recursive: true });
    writeFileSync(join(root, 'src', 'example.ts'), 'export const value = 2;\n', 'utf8');
    writeFileSync(join(root, 'src', 'new', 'added.ts'), 'export const added = true;\n', 'utf8');
    git(root, ['add', '-A']);
    git(root, ['commit', '-qm', 'advance']);
    const horizon = observeGitHorizon(root, pinned);
    expect(horizon.pinnedRevision).toBe(pinned);
    expect(horizon.currentRevision).not.toBe(pinned);
    expect(horizon.currentCommitterInstant).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(horizon.changedSources).toBe(1);
    expect(horizon.addedSources).toBe(1);
  });

  it('reads the observed-project limb between two evaluated revisions, and Unknown when the comparison fails (syzygy-u05.2)', () => {
    const root = repositoryWithFile('src/example.ts');
    const first = git(root, ['rev-parse', 'HEAD']);
    writeFileSync(join(root, 'src', 'example.ts'), 'export const value = 3;\n', 'utf8');
    writeFileSync(join(root, 'src', 'one.ts'), 'export const one = 1;\n', 'utf8');
    writeFileSync(join(root, 'src', 'two.ts'), 'export const two = 2;\n', 'utf8');
    git(root, ['add', '-A']);
    git(root, ['commit', '-qm', 'advance']);
    const second = git(root, ['rev-parse', 'HEAD']);
    expect(observeRevisionChange(root, first, second)).toEqual({ changedSources: 1, addedSources: 2 });
    expect(observeRevisionChange(root, second, second)).toEqual({ changedSources: 0, addedSources: 0 });
    expect(observeRevisionChange(root, 'f'.repeat(40), second)).toBeNull();
  });

  it('counts Syzygy commits since the build revision for the observatory limb, Unknown when unreadable (syzygy-u05.2)', () => {
    const root = repositoryWithFile('src/example.ts');
    const build = git(root, ['rev-parse', 'HEAD']);
    expect(observeObservatoryDrift(root, build)).toEqual({ buildRevision: build, currentRevision: build, commitsSinceBuild: 0 });
    for (const value of ['2', '3']) {
      writeFileSync(join(root, 'src', 'example.ts'), `export const value = ${value};\n`, 'utf8');
      git(root, ['commit', '-qam', `advance ${value}`]);
    }
    const head = git(root, ['rev-parse', 'HEAD']);
    expect(observeObservatoryDrift(root, build)).toEqual({ buildRevision: build, currentRevision: head, commitsSinceBuild: 2 });
    expect(observeObservatoryDrift(root, 'f'.repeat(40))).toEqual({ buildRevision: 'f'.repeat(40), currentRevision: head, commitsSinceBuild: null });
    expect(observeObservatoryDrift(root, build, { runGit: () => { throw new Error('unreadable'); } })).toEqual({ buildRevision: build, currentRevision: null, commitsSinceBuild: null });
    // A count git did not give as a non-negative integer is Unknown, never zero (syzygy-5oi3, M4).
    for (const reply of ['', 'not-a-count', '1.5', '-1']) {
      const runGit = (_root: string, args: readonly string[]): string => (args[0] === 'rev-parse' ? `${head}\n` : `${reply}\n`);
      expect(observeObservatoryDrift(root, build, { runGit }), JSON.stringify(reply)).toEqual({ buildRevision: build, currentRevision: head, commitsSinceBuild: null });
    }
  });
});
