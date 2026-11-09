import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { GIT_ENV, tempDir } from '@syzygy/test-kit';
import type { GateSources } from './gate-sources.js';
import type { LaunchTerminal } from './launch.js';

/** Fixtures for the launch tests, written outside the code under test: governance homes and clones made with the `git` binary, an
 * independent listing of a repository's references, HEAD, index and working tree, and a scripted terminal. Git runs only in the
 * temporary directories made here; nothing reads or writes the real repository's references. */

export const gitIn = (cwd: string, ...args: string[]): string =>
  execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', env: { ...GIT_ENV, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@example.invalid', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@example.invalid' } }).trim();

export function writeFiles(dir: string, files: Readonly<Record<string, string>>): void {
  for (const [file, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), body);
  }
}

/** A governance home: a repository on `main` holding a decisions directory, with a working-tree change left uncommitted. */
export function makeHome(): string {
  const home = tempDir('syzygy-launch-home-');
  gitIn(home, 'init', '-q', '-b', 'main');
  writeFiles(home, { '.syzygy/governance/decisions/README.md': '# decisions\n', 'README.md': 'home\n' });
  gitIn(home, 'add', '-A');
  gitIn(home, 'commit', '-q', '-m', 'home');
  fs.writeFileSync(path.join(home, 'README.md'), 'home, edited and uncommitted\n');
  return home;
}

/** Every reference with its value, HEAD, the index's bytes and every working-tree file's bytes (`.git` excluded): an independent listing. */
export function listing(repo: string): { readonly refs: string; readonly head: string; readonly index: string; readonly tree: string } {
  const files: string[] = [];
  const walk = (rel: string) => {
    for (const e of fs.readdirSync(path.join(repo, rel), { withFileTypes: true })) {
      const child = rel === '' ? e.name : `${rel}/${e.name}`;
      if (child === '.git') continue;
      if (e.isDirectory()) walk(child); else files.push(`${child}\0${fs.readFileSync(path.join(repo, child), 'latin1')}`);
    }
  };
  walk('');
  const index = path.join(repo, '.git', 'index');
  return {
    refs: gitIn(repo, 'for-each-ref', '--format=%(refname) %(objectname)'),
    head: fs.readFileSync(path.join(repo, '.git', 'HEAD'), 'utf8'),
    index: fs.existsSync(index) ? fs.readFileSync(index).toString('base64') : '',
    tree: files.sort().join('\n'),
  };
}

/** An upstream repository with `files` committed on `main`, and its commit. */
export function makeUpstream(files: Readonly<Record<string, string>>, more: readonly Readonly<Record<string, string>>[] = []): { readonly dir: string; readonly commits: readonly string[] } {
  const dir = tempDir('syzygy-launch-upstream-');
  gitIn(dir, 'init', '-q', '-b', 'main');
  const commits: string[] = [];
  for (const set of [files, ...more]) {
    writeFiles(dir, set);
    gitIn(dir, 'add', '-A');
    gitIn(dir, 'commit', '-q', '-m', 'upstream');
    commits.push(gitIn(dir, 'rev-parse', 'HEAD'));
  }
  return { dir, commits };
}

/** A full clone of `upstream` (origin, its HEAD reference, a local main), with origin's URL then set to `url`. */
export function fullClone(upstream: string, url: string): string {
  const parent = tempDir('syzygy-launch-clone-');
  const clone = path.join(parent, 'clone');
  gitIn(parent, 'clone', '-q', upstream, clone);
  gitIn(clone, 'remote', 'set-url', 'origin', url);
  return clone;
}

export interface ScriptedTerminal extends LaunchTerminal {
  readonly printed: string[];
  readonly prompts: string[];
  /** Answers not yet asked for. */
  readonly left: () => number;
}

export function scriptedTerminal(answers: readonly (string | null)[], isTTY = true): ScriptedTerminal {
  const queue = [...answers];
  const printed: string[] = [], prompts: string[] = [];
  return {
    isTTY, name: '/dev/pts/fixture', printed, prompts, left: () => queue.length,
    print: text => { printed.push(text); },
    ask: async prompt => { prompts.push(prompt); return queue.length === 0 ? null : queue.shift()!; },
  };
}

/** Gate sources of no other act: no observation consent, no drawer statement, no provider statement; every start gate in force. */
export function noOtherActs(): GateSources {
  return {
    recordsRoot: '/fixture',
    repositoryIdsFor: async () => [],
    consentedRevisionsFor: async () => [],
    observationConsentFor: async () => ({ satisfied: false, why: 'no other act' }),
    registryEntry: async () => ({ state: 'ok', record: 'REGISTRY-FIXTURE' }),
    screeningPolicy: async () => ({ state: 'ok', record: 'POLICY-FIXTURE' }),
    d9: async () => ({ state: 'absent', why: 'fixture' }),
    rfc720Ruling: async () => ({ state: 'absent', why: 'fixture' }),
    projectInput: { drawerFor: async () => ({ stated: false, why: 'no other act' }) },
    providerStatements: { statementsFor: async () => [] },
  };
}

/** The fixture's own preview classification, by extension: what the oracle expects the policy port to return. */
export const fixtureClasses = async (_identity: string, _commit: string, paths: readonly string[]) =>
  ({ classes: [...new Set(paths.map(p => (p.endsWith('.md') ? 'project-documentation' : 'code-content')))].sort() });
