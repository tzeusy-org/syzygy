import * as fs from 'node:fs';
import * as path from 'node:path';
import { tempDir as makeTempDir } from '@syzygy/test-kit';
import { afterEach, describe, expect, it } from 'vitest';
import {
  classifyRead, createCredentialProbe, credentialListFromEnv, credentialListFromFile, credentialStepCheck, type CredentialListSource, type OpenForRead,
} from './credential-probe.js';

// syzygy-qkea.5 (S4): the adapter-credential check of D9's credential condition (R3-F1). Real files under a temporary directory, read
// by the real operating-system open as this test's user; the injected open covers outcomes the host cannot produce on demand.

const cleanups: (() => void)[] = [];
afterEach(() => { for (const cleanup of cleanups.splice(0).reverse()) cleanup(); });
const tempDir = (): string => {
  const dir = makeTempDir('dossier-cred-');
  // Runs before the kit's removal (afterEach precedes the file teardown): a 000-mode member must be readable again for it.
  cleanups.push(() => { fs.chmodSync(dir, 0o700); for (const name of fs.readdirSync(dir)) { try { fs.chmodSync(path.join(dir, name), 0o700); } catch { /* gone */ } } });
  return dir;
};
const listOf = (paths: readonly string[]): CredentialListSource => ({ describe: 'fixture list', list: () => ({ ok: true, paths }) });
const isRoot = process.getuid?.() === 0;

describe('the operating-system read attempt', () => {
  it('fails on a credential the operator\'s user can read', async () => {
    const dir = tempDir();
    const token = path.join(dir, 'scheduler.token');
    fs.writeFileSync(token, 'secret', { mode: 0o600 });
    expect(await createCredentialProbe(listOf([token])).probe()).toEqual({ passed: false, why: `adapter credentials readable by the operator's user: ${token}` });
  });

  it.skipIf(isRoot)('passes on a credential the operating system refuses to the user, and on an absent one', async () => {
    const dir = tempDir();
    const token = path.join(dir, 'scheduler.token');
    fs.writeFileSync(token, 'secret', { mode: 0o600 });
    fs.chmodSync(token, 0o000);
    const probe = createCredentialProbe(listOf([token, path.join(dir, 'absent.token')]));
    expect(await probe.probe()).toEqual({ passed: true, checked: 2, source: 'fixture list, together with 0 credential paths configured by typed adapters in this repository' });
    expect(probe.last()?.outcomes).toEqual([{ path: token, outcome: 'not-readable' }, { path: path.join(dir, 'absent.token'), outcome: 'absent' }]);
  });

  it('is not satisfied by an agent tool\'s deny rule', async () => {
    const dir = tempDir();
    const token = path.join(dir, 'scheduler.token');
    fs.writeFileSync(token, 'secret', { mode: 0o600 });
    fs.mkdirSync(path.join(dir, '.claude'));
    fs.writeFileSync(path.join(dir, '.claude', 'settings.json'), JSON.stringify({ permissions: { deny: [`Read(${token})`] } }));
    fs.writeFileSync(path.join(dir, '.codex-deny'), token);
    expect(await createCredentialProbe(listOf([token])).probe()).toMatchObject({ passed: false });
  });

  it('fails closed on a directory, and on an error it cannot classify', async () => {
    const dir = tempDir();
    expect(await createCredentialProbe(listOf([dir])).probe()).toEqual({ passed: false, why: `the read attempt could not decide for: ${dir}` });
    const eio: OpenForRead = () => ({ opened: false, code: 'EIO' });
    expect(await createCredentialProbe(listOf(['/x/token']), eio).probe()).toEqual({ passed: false, why: 'the read attempt could not decide for: /x/token' });
  });

  it.each<[ReturnType<OpenForRead>, string]>([
    [{ opened: true, regularFile: true }, 'readable'],
    [{ opened: true, regularFile: false }, 'unknown'],
    [{ opened: false, code: 'EACCES' }, 'not-readable'],
    [{ opened: false, code: 'EPERM' }, 'not-readable'],
    [{ opened: false, code: 'ENOENT' }, 'absent'],
    [{ opened: false, code: 'ELOOP' }, 'unknown'],
  ])('classifies %j as %s', (attempt, outcome) => {
    expect(classifyRead(attempt)).toBe(outcome);
  });
});

describe('the credential list', () => {
  it('fails closed when no list source is configured', async () => {
    expect(await createCredentialProbe(credentialListFromEnv({})).probe()).toEqual({
      passed: false, why: 'no credential list source is configured: set SYZYGY_DOSSIER_CREDENTIAL_LIST to a syzygy-adapter-credential-list/1 file (source: no credential list (SYZYGY_DOSSIER_CREDENTIAL_LIST is not set))',
    });
  });

  it('passes an explicitly declared empty list, saying it is operator-declared and naming the source', async () => {
    expect(await createCredentialProbe(listOf([])).probe()).toEqual({
      passed: true, checked: 0,
      source: 'no adapter credential declared; list operator-declared, Inferred (fixture list, together with 0 credential paths configured by typed adapters in this repository)',
    });
  });

  it('probes the union of the declared list and the paths typed adapters configure', async () => {
    const dir = tempDir();
    const configured = path.join(dir, 'provider.key');
    fs.writeFileSync(configured, 'secret', { mode: 0o600 });
    const probe = createCredentialProbe(listOf([]), undefined, [configured]);
    expect(await probe.probe()).toEqual({ passed: false, why: `adapter credentials readable by the operator's user: ${configured}` });
    expect(probe.last()?.source).toBe('fixture list, together with 1 credential path configured by typed adapters in this repository');
  });

  it('configures no adapter credential in this repository, and never the cap1 machine token', async () => {
    const { CONFIGURED_ADAPTER_CREDENTIALS } = await import('./credential-probe.js');
    expect(CONFIGURED_ADAPTER_CREDENTIALS).toEqual([]);
  });

  it('reads a list file named by the environment and names it as the source', async () => {
    const dir = tempDir();
    const file = path.join(dir, 'credentials.json');
    fs.writeFileSync(file, JSON.stringify({ format: 'syzygy-adapter-credential-list/1', credentials: [path.join(dir, 'absent.token')] }));
    expect(await createCredentialProbe(credentialListFromEnv({ SYZYGY_DOSSIER_CREDENTIAL_LIST: file })).probe()).toEqual({
      passed: true, checked: 1, source: `the credential list file ${file}, which the agent sessions can write, together with 0 credential paths configured by typed adapters in this repository`,
    });
  });

  it('passes a list file that declares no credential, naming the file', async () => {
    const dir = tempDir();
    const file = path.join(dir, 'credentials.json');
    fs.writeFileSync(file, JSON.stringify({ format: 'syzygy-adapter-credential-list/1', credentials: [] }));
    expect(await createCredentialProbe(credentialListFromEnv({ SYZYGY_DOSSIER_CREDENTIAL_LIST: file })).probe()).toEqual({
      passed: true, checked: 0,
      source: `no adapter credential declared; list operator-declared, Inferred (the credential list file ${file}, which the agent sessions can write, together with 0 credential paths configured by typed adapters in this repository)`,
    });
  });

  it('fails closed on an unreadable list file', async () => {
    const dir = tempDir();
    expect(await createCredentialProbe(credentialListFromFile(path.join(dir, 'missing.json'))).probe()).toMatchObject({ passed: false });
  });

  it.each<[string, unknown]>([
    ['another format', { format: 'other/1', credentials: [] }],
    ['an extra field', { format: 'syzygy-adapter-credential-list/1', credentials: [], note: 'x' }],
    ['a relative path', { format: 'syzygy-adapter-credential-list/1', credentials: ['token'] }],
    ['a non-text entry', { format: 'syzygy-adapter-credential-list/1', credentials: [7] }],
  ])('refuses a list file with %s', (_name, document) => {
    const dir = tempDir();
    const file = path.join(dir, 'credentials.json');
    fs.writeFileSync(file, JSON.stringify(document));
    expect(credentialListFromFile(file).list().ok).toBe(false);
  });
});

// syzygy-bpyt.8.9 (owner direction GP-Q7): the hand-kept list fails closed when a configured adapter declares a credential it lacks.
describe('a configured adapter\'s credential declaration', () => {
  const REFUSAL = 'a configured typed adapter declares a credential the repository\'s adapter-credential list does not hold: ';
  const counted = (paths: readonly string[]): CredentialListSource & { readonly reads: () => number } => {
    let reads = 0;
    return { describe: 'fixture list', list: () => { reads += 1; return { ok: true, paths }; }, reads: () => reads };
  };
  const opens: string[] = [];
  const absent: OpenForRead = (file) => { opens.push(file); return { opened: false, code: 'ENOENT' }; };
  afterEach(() => { opens.splice(0); });

  it('refuses a declared credential the list does not hold, before reading the declared list or attempting any read', async () => {
    const source = counted(['/x/listed.token']);
    const probe = createCredentialProbe(source, absent, [], [{ adapter: 'fixture-scheduler', credentials: ['/x/scheduler.token'] }]);
    expect(await probe.probe()).toEqual({ passed: false, why: `${REFUSAL}fixture-scheduler: /x/scheduler.token` });
    expect(probe.last()).toEqual({ source: 'fixture list, together with 0 credential paths configured by typed adapters in this repository', outcomes: [] });
    expect(source.reads()).toBe(0);
    expect(opens).toEqual([]);
  });

  it('names every unlisted declaration, of every adapter, and none the list holds', async () => {
    const probe = createCredentialProbe(listOf([]), absent, ['/x/a.token'], [
      { adapter: 'fixture-ci', credentials: ['/x/a.token', '/x/b.token'] },
      { adapter: 'fixture-provider', credentials: ['/x/c.token'] },
    ]);
    expect(await probe.probe()).toEqual({ passed: false, why: `${REFUSAL}fixture-ci: /x/b.token, fixture-provider: /x/c.token` });
  });

  it('refuses a declaration the list spells differently: membership is exact', async () => {
    const probe = createCredentialProbe(listOf([]), absent, ['/x/a.token'], [{ adapter: 'fixture-ci', credentials: ['/x//a.token'] }]);
    expect(await probe.probe()).toEqual({ passed: false, why: `${REFUSAL}fixture-ci: /x//a.token` });
  });

  it('refuses on the declaration, not the list source, when no list source is configured either', async () => {
    const probe = createCredentialProbe(credentialListFromEnv({}), absent, [], [{ adapter: 'fixture-scheduler', credentials: ['/x/scheduler.token'] }]);
    expect(await probe.probe()).toEqual({ passed: false, why: `${REFUSAL}fixture-scheduler: /x/scheduler.token` });
  });

  it('is not satisfied by the operator-declared list holding the path', async () => {
    const probe = createCredentialProbe(listOf(['/x/scheduler.token']), absent, [], [{ adapter: 'fixture-scheduler', credentials: ['/x/scheduler.token'] }]);
    expect(await probe.probe()).toEqual({ passed: false, why: `${REFUSAL}fixture-scheduler: /x/scheduler.token` });
  });

  it('probes as before when the list holds every declared credential', async () => {
    const source = counted([]);
    const probe = createCredentialProbe(source, absent, ['/x/a.token'], [{ adapter: 'fixture-ci', credentials: ['/x/a.token'] }]);
    expect(await probe.probe()).toEqual({ passed: true, checked: 1, source: 'fixture list, together with 1 credential path configured by typed adapters in this repository' });
    expect(source.reads()).toBe(1);
    expect(opens).toEqual(['/x/a.token']);
    const dir = tempDir();
    const token = path.join(dir, 'ci.token');
    fs.writeFileSync(token, 'secret', { mode: 0o600 });
    expect(await createCredentialProbe(listOf([]), undefined, [token], [{ adapter: 'fixture-ci', credentials: [token] }]).probe())
      .toEqual({ passed: false, why: `adapter credentials readable by the operator's user: ${token}` });
  });

  it('changes nothing for an adapter that declares no credential, or for no adapter', async () => {
    const expected = {
      passed: true, checked: 0,
      source: 'no adapter credential declared; list operator-declared, Inferred (fixture list, together with 0 credential paths configured by typed adapters in this repository)',
    };
    expect(await createCredentialProbe(listOf([]), absent, [], [{ adapter: 'fixture-ci', credentials: [] }]).probe()).toEqual(expected);
    expect(await createCredentialProbe(listOf([]), absent, [], []).probe()).toEqual(expected);
    expect(opens).toEqual([]);
  });

  it('configures no adapter declaration in this repository', async () => {
    const { CONFIGURED_ADAPTER_DECLARATIONS } = await import('./credential-probe.js');
    expect(CONFIGURED_ADAPTER_DECLARATIONS).toEqual([]);
    expect(Object.isFrozen(CONFIGURED_ADAPTER_DECLARATIONS)).toBe(true);
  });
});

describe('the step hook every later step calls', () => {
  const runWith = (brief: string | null, record: unknown): string => {
    const run = tempDir();
    if (brief !== null) fs.writeFileSync(path.join(run, 'brief.md'), brief);
    if (record !== undefined) fs.writeFileSync(path.join(run, 'brief.json'), typeof record === 'string' ? record : JSON.stringify(record));
    return run;
  };
  const failing = { probe: async () => ({ passed: false as const, why: 'fixture credential readable' }) };
  const passing = { probe: async () => ({ passed: true as const, checked: 1, source: 'fixture' }) };
  const NOW = Date.UTC(2026, 9, 7, 12, 0, 0);

  it('is not required before a brief, or after a brief that permits no execution', async () => {
    expect(await credentialStepCheck(runWith(null, undefined), 'check', failing, NOW)).toMatchObject({ required: false });
    expect(await credentialStepCheck(runWith('b', { executionRule: { arm: 'sec-3' } }), 'check', failing, NOW)).toMatchObject({ required: false });
  });

  it('reports a breach as a finding telling the agent to run nothing further, and logs it', async () => {
    const run = runWith('b', { executionRule: { arm: 'permitting' } });
    const result = await credentialStepCheck(run, 'close', failing, NOW);
    const finding = {
      kind: 'adapter-credential-readable', step: 'close', at: '2026-10-07T12:00:00.000Z', why: 'fixture credential readable',
      instruction: 'Run no further observed code: the permission to build and run the observed project has lapsed for this run.',
    };
    expect(result).toEqual({ required: true, passed: false, finding });
    expect(fs.readFileSync(path.join(run, 'credential-breaches.jsonl'), 'utf8')).toBe(`${JSON.stringify(finding)}\n`);
    expect(await credentialStepCheck(run, 'check', passing, NOW)).toEqual({ required: true, passed: true, checked: 1, source: 'fixture' });
  });

  it('probes when the brief record cannot be read to say execution was not permitted', async () => {
    expect(await credentialStepCheck(runWith('b', '{not json'), 'render', failing, NOW)).toMatchObject({ required: true, passed: false });
    expect(await credentialStepCheck(runWith('b', undefined), 'render', failing, NOW)).toMatchObject({ required: true, passed: false });
  });
});
