import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import {
  committedUrlPoliciesCurrent, committedUrlPoliciesCurrentAsync, DOSSIER_POLICY_PATH,
  DOSSIER_URL_ORIGIN_POLICY_PATH, readCommittedPolicy, readCommittedUrlOriginPolicy,
} from './policy-snapshot.js';
import { readUrlParentAdoption, URL_PARENT_DEFAULT_REF, URL_PARENT_RECORD, URL_PARENT_TAG } from './url-parent-adoption.js';

const CHECKOUT = fileURLToPath(new URL('../../../', import.meta.url));
const TAG_REF = `refs/tags/${URL_PARENT_TAG}`;
const GOVERNANCE = '.syzygy/governance';
const CHANGE = 'openspec/changes/dossier-url-declared-source-run/proposed';
const SUBJECTS = [
  `${CHANGE}/polaris-generation/spec.md`,
  `${CHANGE}/contracts/DOSSIER-URL-LOCAL-MACHINE-CREDENTIAL-AMENDMENT.md`,
  DOSSIER_URL_ORIGIN_POLICY_PATH,
  `${GOVERNANCE}/decisions/DOSSIER-URL-RUN-CONTRACT-APPLICABILITY.md`,
] as const;
const FILES = [...SUBJECTS,
  `${GOVERNANCE}/contracts/rfcs/RFC-0003/manifests-and-namespace.md`,
  `${GOVERNANCE}/contracts/rfcs/RFC-0003/governance-homes-and-owner-acts.md`,
  `${GOVERNANCE}/contracts/rfcs/RFC-0005/admission-and-boundary.md`];
const temporary: string[] = [];

afterEach(() => {
  for (const root of temporary.splice(0)) rmSync(root, { recursive: true, force: true });
});

function scratch(): string {
  const root = mkdtempSync(join(tmpdir(), 'url-adoption-'));
  temporary.push(root);
  return root;
}

function git(root: string, ...args: string[]): string {
  return execFileSync('git', ['-C', root, '-c', 'user.name=Synthetic Adoption', '-c', 'user.email=fixture@example.invalid', ...args],
    { encoding: 'utf8', env: { ...process.env, GIT_NO_LAZY_FETCH: '1' }, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function copy(root: string, file: string): void {
  const target = join(root, file);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(join(CHECKOUT, file), target);
}

function fixture() {
  const root = scratch();
  const run = (...args: string[]): string => git(root, ...args);
  run('init', '-q', '--initial-branch=main', '--template=');
  copy(root, DOSSIER_POLICY_PATH);
  run('add', '.');
  run('commit', '-qm', 'Predecessor');
  run('switch', '-qc', 'package');
  for (const file of FILES) copy(root, file);
  run('add', '.');
  run('commit', '-qm', 'Reviewed package');
  run('switch', '-q', 'main');
  run('merge', '-q', '--no-ff', '-m', 'Install package', 'package');
  const landed = run('rev-parse', 'HEAD');
  run('tag', '-am', 'Reviewed version', URL_PARENT_TAG, landed);
  const links = SUBJECTS.map(file => `[subject](https://github.com/tzeusy-org/syzygy/blob/${landed}/${file})`).join(' · ');
  writeFileSync(join(root, URL_PARENT_RECORD), '# Agent adoptions\n\n'
    + '| Id | Date | Commit | What changed | Why | Revert | Tag |\n|---|---|---|---|---|---|---|\n'
    + `| A-14 | 2026-11-21 | \`${landed}\` | ${links} | Apply reviewed version | \`git revert -m 1 ${landed}\` | \`${URL_PARENT_TAG}\` |\n`);
  run('add', URL_PARENT_RECORD);
  run('commit', '-qm', 'Record adoption after landing');
  run('update-ref', URL_PARENT_DEFAULT_REF, 'HEAD');
  const base = readCommittedPolicy(root), origin = readCommittedUrlOriginPolicy(root);
  if (!base.ok || !origin.ok) throw new Error('fixture policies missing');
  const binding = readUrlParentAdoption(root, origin.binding.sha256);
  if (binding === null) throw new Error('fixture adoption missing');
  return { root, run, landed, binding, base: base.binding, origin: origin.binding };
}

describe('URL parent adoption on the observing Git checkout', () => {
  it('requires the actual direct default and version refs at startup and during a run', async () => {
    const { root, run, landed, binding, base, origin } = fixture();
    const current = () => committedUrlPoliciesCurrent(root, base, origin, binding);
    const currentAsync = () => committedUrlPoliciesCurrentAsync(root, base, origin, binding);
    expect(current()).toBe(true);
    expect(await currentAsync()).toBe(true);

    run('update-ref', `refs/tags/${URL_PARENT_DEFAULT_REF}`, 'HEAD');
    run('update-ref', '-d', URL_PARENT_DEFAULT_REF);
    expect(readUrlParentAdoption(root, origin.sha256)).toBeNull();
    expect(current()).toBe(false);
    expect(await currentAsync()).toBe(false);

    run('update-ref', URL_PARENT_DEFAULT_REF, 'HEAD');
    run('update-ref', `refs/heads/${TAG_REF}`, landed);
    run('update-ref', '-d', TAG_REF);
    expect(readUrlParentAdoption(root, origin.sha256)).toBeNull();
    expect(current()).toBe(false);
    expect(await currentAsync()).toBe(false);
  });

  it('accepts an unrelated advance and refuses a reverted-and-restored parent', () => {
    const { root, run, landed, binding, origin } = fixture();
    run('commit', '--allow-empty', '-qm', 'Unrelated default advance');
    run('update-ref', URL_PARENT_DEFAULT_REF, 'HEAD');
    const advanced = readUrlParentAdoption(root, origin.sha256, binding);
    expect(advanced?.defaultCommit).toBe(run('rev-parse', 'HEAD'));
    expect(advanced?.landedCommit).toBe(landed);
    run('revert', '--no-edit', '-m', '1', landed);
    run('restore', `--source=${landed}`, '--staged', '--worktree', '--', ...FILES);
    run('commit', '-qm', 'Restore bytes without a new adoption');
    run('update-ref', URL_PARENT_DEFAULT_REF, 'HEAD');
    expect(readUrlParentAdoption(root, origin.sha256, binding)).toBeNull();
    expect(readUrlParentAdoption(root, origin.sha256)).toBeNull();
  });

  it('refuses a missing local policy blob without invoking the promisor transport', () => {
    const { root, run } = fixture();
    run('config', 'uploadpack.allowFilter', 'true');
    const clone = scratch();
    git(clone, 'clone', '-q', '--filter=blob:none', '--no-checkout', pathToFileURL(root).href, '.');
    copy(clone, DOSSIER_URL_ORIGIN_POLICY_PATH);
    const object = `HEAD:${DOSSIER_URL_ORIGIN_POLICY_PATH}`;
    expect(() => git(clone, 'cat-file', '-e', object)).toThrow();
    expect(readCommittedUrlOriginPolicy(clone).ok).toBe(false);
    expect(() => git(clone, 'cat-file', '-e', object)).toThrow();
  });
});
