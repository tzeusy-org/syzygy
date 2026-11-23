import { execFile, execFileSync } from 'node:child_process';
import { appendFileSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  committedUrlPoliciesCurrent, committedUrlPoliciesCurrentAsync, DOSSIER_POLICY_PATH, DOSSIER_READMISSION_POLICY_PATH,
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
const LEDGER_HEADER = '# Agent adoptions\n\n'
  + '| Id | Date | Commit | What changed | Why | Revert | Tag |\n|---|---|---|---|---|---|---|\n';
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
  copy(root, DOSSIER_READMISSION_POLICY_PATH);
  mkdirSync(dirname(join(root, URL_PARENT_RECORD)), { recursive: true });
  writeFileSync(join(root, URL_PARENT_RECORD), LEDGER_HEADER);
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
  writeFileSync(join(root, URL_PARENT_RECORD), LEDGER_HEADER
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

describe('URL parent adoption on the observing Git checkout', { timeout: 30_000 }, () => {
  it('verifies the same parent within the aggregate deadline under fixed Git startup latency', async () => {
    const { root, origin, binding } = fixture();
    const shim = scratch();
    const { stdout } = await promisify(execFile)('/bin/sh', ['-c', 'command -v git'], { encoding: 'utf8', timeout: 1000, maxBuffer: 4096 });
    const program = stdout.trim();
    writeFileSync(join(shim, 'git'), `#!/bin/sh\n/bin/sleep 0.42\nexec '${program.replaceAll("'", "'\\''")}' "$@"\n`,
      { mode: 0o755 });
    vi.stubEnv('PATH', `${shim}:${process.env['PATH'] ?? ''}`);
    try { expect(readUrlParentAdoption(root, origin.sha256)).toEqual(binding); }
    finally { vi.unstubAllEnvs(); }
  });

  it('keeps the A-14 overlay over the exact retained or current base', async () => {
    const { root, binding, base, origin } = fixture();
    const old = readCommittedPolicy(root, DOSSIER_READMISSION_POLICY_PATH);
    if (!old.ok) throw new Error(old.why);
    expect(base.policyVersion).toBe('dossier-declared-source/4.0.0');
    expect(old.binding.policyVersion).toBe('dossier-declared-source/3.0.0');
    const current = (bound: typeof base) => committedUrlPoliciesCurrent(root, bound, origin, binding);
    const currentAsync = (bound: typeof base) => committedUrlPoliciesCurrentAsync(root, bound, origin, binding);
    expect([current(base), current(old.binding), current({ ...old.binding, sha256: base.sha256 })]).toEqual([true, true, false]);
    expect(await Promise.all([currentAsync(base), currentAsync(old.binding)])).toEqual([true, true]);
    appendFileSync(join(root, DOSSIER_READMISSION_POLICY_PATH), ' ');
    expect([current(base), current(old.binding)]).toEqual([true, false]);
    expect(await Promise.all([currentAsync(base), currentAsync(old.binding)])).toEqual([true, false]);
  });

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

  it('refuses an intervening amendment to an installed clause after its bytes are restored', () => {
    const { root, run, binding, origin } = fixture();
    const file = `${GOVERNANCE}/contracts/rfcs/RFC-0003/governance-homes-and-owner-acts.md`;
    const original = readFileSync(join(root, file), 'utf8');
    const changed = original.replace('\n**RFC3-16(b).', '\n**RFC3-16(b). Intervening change.');
    expect(changed).not.toBe(original);
    writeFileSync(join(root, file), changed);
    run('commit', '-qam', 'Change installed clause');
    writeFileSync(join(root, file), original);
    run('commit', '-qam', 'Restore installed clause');
    run('update-ref', URL_PARENT_DEFAULT_REF, 'HEAD');
    expect(readUrlParentAdoption(root, origin.sha256)).toBeNull();
    expect(readUrlParentAdoption(root, origin.sha256, binding)).toBeNull();
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

  it('keeps an appended retirement effective when a later commit removes it', () => {
    const { root, run, binding, origin } = fixture();
    const record = join(root, URL_PARENT_RECORD);
    appendFileSync(record, '| A-15 | 2026-11-22 | `bbbbbbbb` | Record unrelated research | Test | — | — |\n');
    run('commit', '-qam', 'Append unrelated row');
    run('update-ref', URL_PARENT_DEFAULT_REF, 'HEAD');
    const unrelated = readUrlParentAdoption(root, origin.sha256, binding);
    expect(unrelated?.defaultCommit).toBe(run('rev-parse', 'HEAD'));
    appendFileSync(record, '| A-16 | 2026-11-22 | `cccccccc` | Retire A-14 | Test | — | — |\n');
    run('commit', '-qam', 'Append retirement');
    run('update-ref', URL_PARENT_DEFAULT_REF, 'HEAD');
    expect(readUrlParentAdoption(root, origin.sha256, binding)).toBeNull();
    run('restore', '--source=HEAD^', '--staged', '--worktree', '--', URL_PARENT_RECORD);
    run('commit', '-qm', 'Remove retirement from the current ledger');
    run('update-ref', URL_PARENT_DEFAULT_REF, 'HEAD');
    expect(readUrlParentAdoption(root, origin.sha256, unrelated ?? undefined)).toBeNull();
    expect(readUrlParentAdoption(root, origin.sha256)).toBeNull();
  });

  it('accepts edits to another adoption while detecting a changed URL adoption after restoration', () => {
    const { root, run, origin } = fixture();
    const record = join(root, URL_PARENT_RECORD);
    appendFileSync(record, '| A-23 | 2026-11-22 | `bbbbbbbb` | Retire the surface freeze | Follow D12 | — | — |\n');
    run('commit', '-qam', 'Append unrelated adoption');
    run('update-ref', URL_PARENT_DEFAULT_REF, 'HEAD');
    const before = readUrlParentAdoption(root, origin.sha256)!;

    const original = readFileSync(record, 'utf8');
    const corrected = original.replace('Follow D12', 'Follow D13');
    expect(corrected).not.toBe(original);
    writeFileSync(record, corrected);
    run('commit', '-qam', 'Correct the unrelated doctrine reference');
    run('update-ref', URL_PARENT_DEFAULT_REF, 'HEAD');
    const current = run('rev-parse', 'HEAD');
    expect(readUrlParentAdoption(root, origin.sha256)?.defaultCommit).toBe(current);
    expect(readUrlParentAdoption(root, origin.sha256, before)?.defaultCommit).toBe(current);

    const changed = corrected.replace('Apply reviewed version', 'Apply revised version');
    expect(changed).not.toBe(corrected);
    writeFileSync(record, changed);
    run('commit', '-qam', 'Edit the governing URL adoption');
    writeFileSync(record, corrected);
    run('commit', '-qam', 'Restore the governing URL adoption');
    run('update-ref', URL_PARENT_DEFAULT_REF, 'HEAD');
    expect(readUrlParentAdoption(root, origin.sha256)).toBeNull();
    expect(readUrlParentAdoption(root, origin.sha256, before)).toBeNull();
  });

  it('honors an explicit withdrawal between landing and recording the adoption', () => {
    const { root, run, landed, origin } = fixture();
    const record = join(root, URL_PARENT_RECORD);
    const adopted = readFileSync(record, 'utf8');
    run('reset', '--hard', landed);
    appendFileSync(record, `| A-15 | 2026-11-22 | \`dddddddd\` | Withdraw \`${landed}\` | Test | — | — |\n`);
    run('commit', '-qam', 'Withdraw the landed version');
    writeFileSync(record, adopted);
    run('commit', '-qam', 'Replace the withdrawal with the adoption record');
    run('update-ref', URL_PARENT_DEFAULT_REF, 'HEAD');
    expect(readUrlParentAdoption(root, origin.sha256)).toBeNull();
  });
});
