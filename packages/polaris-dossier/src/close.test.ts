import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { beforeAll, describe, expect, it } from 'vitest';
import { FIXTURE_SCREEN, LATER, NOW, PLANTED_SECRET, REAL_ROOT, fixtureSources, fullFixtureRun, makeClone } from './full-run.testkit.js';
import type { DossierRenderer } from './render.js';
import { closeRun, parseUsageFigure } from './close.js';
import { runStatus } from './status.js';
import { tempDir } from '@syzygy/test-kit';

// Asynchronous, so a slow command cannot starve the vitest worker's RPC (syzygy-w90k).
const execFileAsync = promisify(execFile);

let renderer: DossierRenderer;
beforeAll(async () => {
  const module = pathToFileURL(path.join(REAL_ROOT, 'apps/three-surface-poc/src/polaris-generation/dossier-site.ts')).href;
  renderer = ((await import(module)) as { renderLocalDossier: DossierRenderer }).renderLocalDossier;
});

type Doc = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const readJson = (file: string): Doc => JSON.parse(fs.readFileSync(file, 'utf8'));

/** A full fixture run in a fresh temporary directory; the state root is a sibling of the clone's directory. */
async function fullRun(options: { closeArgs?: string[]; plantSecret?: boolean; env?: Record<string, string> } = {}) {
  const dir = tempDir('dossier-close-');
  const { clone, commit } = makeClone(path.join(dir, 'repo'));
  const stateRoot = path.join(dir, 'state');
  const result = await fullFixtureRun({ clone, commit, stateRoot, renderer, ...options });
  return { ...result, dir, clone, commit, stateRoot };
}

describe('close (S10)', () => {
  it('records the operator-declared usage, labelled Inferred and attributed to the operator, never a receipt', async () => {
    const { run, steps } = await fullRun({ closeArgs: ['--usage-tokens', '48213', '--usage-turns', '37'] });
    const record = readJson(path.join(run, 'record.json'));
    expect(record.format).toBe('polaris-dossier-execution-record/1');
    expect(record.agentUsage).toEqual({
      state: 'declared', tokens: 48213, turns: 37, declaredBy: 'operator', label: 'Inferred',
      basis: 'the figure the operator declared at close, as their agent tool showed it; Syzygy cannot observe the agent sessions\' usage, and this is not a provider receipt',
    });
    expect(JSON.stringify(record)).not.toMatch(/"label":\s*"Observed"[^}]*usage|receipt":\s*true/u);
    const status = steps.at(-1)!;
    expect(JSON.parse(status.stdout).limitsSpent.agentUsage).toBe('48213 tokens and 37 turns, as the operator declared at close; not observed by Syzygy and not a provider receipt');
    expect(JSON.parse(status.stdout).state).toBe('closed');
  });

  it('records undeclared usage as not recorded, never zero', async () => {
    const { run, steps } = await fullRun();
    const record = readJson(path.join(run, 'record.json'));
    expect(record.agentUsage).toEqual({ state: 'not-recorded', text: 'not recorded: the operator declared no usage figure at close, and Syzygy cannot observe the agent sessions\' usage', label: 'Unknown' });
    expect(JSON.parse(steps.at(-1)!.stdout).limitsSpent.agentUsage).toBe('not recorded: the operator declared no usage figure at close, and Syzygy cannot observe the agent sessions\' usage');
    // No usage figure anywhere in the record is a zero.
    const usage = JSON.stringify(record.agentUsage);
    expect(usage).not.toMatch(/\b0\b/u);
  });

  it('refuses a zero, negative, fractional or non-decimal figure before it opens the run, and writes nothing', async () => {
    for (const figure of ['0', '-1', '1.5', '01', '1e3', '', ' 5', '9007199254740993']) {
      expect(typeof parseUsageFigure('--usage-tokens', figure)).toBe('string');
    }
    expect(parseUsageFigure('--usage-tokens', undefined)).toBeNull();
    expect(parseUsageFigure('--usage-turns', '12')).toBe(12);
    const missing = path.join(tempDir('dossier-close-none-'), `run-${'a'.repeat(32)}`);
    const refused = await closeRun(missing, { usageTokens: '0' }, { sources: fixtureSources('0'.repeat(40)), now: () => LATER, probe: { probe: async () => ({ passed: true as const, checked: 0, source: 'x' }) } });
    expect(refused).toMatchObject({ ok: false, refusal: { stage: 'usage' } });
    expect(fs.existsSync(missing)).toBe(false);
  });

  it('closes a run once, and refuses after the deadline', async () => {
    const { run, commit } = await fullRun();
    const deps = (now: number) => ({ sources: fixtureSources(commit), now: () => now, probe: { probe: async () => ({ passed: true as const, checked: 0, source: 'x' }) } });
    const before = fs.readFileSync(path.join(run, 'record.json'));
    expect(await closeRun(run, {}, deps(LATER))).toMatchObject({ ok: false, refusal: { stage: 'closed-already' } });
    expect(fs.readFileSync(path.join(run, 'record.json'))).toEqual(before);
    fs.rmSync(path.join(run, 'record.json'));
    expect(await closeRun(run, {}, deps(NOW + 3_600_000))).toMatchObject({ ok: false, refusal: { stage: 'deadline' } });
    expect(fs.existsSync(path.join(run, 'record.json'))).toBe(false);
  });

  it('runs the adapter-credential check at close after a permitting brief: a readable credential is a finding recorded in the record', async () => {
    const { run, commit } = await fullRun();
    fs.rmSync(path.join(run, 'record.json'));
    // The brief record names the arm; a permitting one makes the check required at every later step (the arm itself is off in production).
    const briefRecord = readJson(path.join(run, 'brief.json'));
    fs.writeFileSync(path.join(run, 'brief.json'), JSON.stringify({ ...briefRecord, executionRule: { arm: 'permitting' } }));
    const readable = { probe: async () => ({ passed: false as const, why: 'adapter credentials readable by the operator\'s user: /fixture/adapter.token' }) };
    const closed = await closeRun(run, { usageTurns: '4' }, { sources: fixtureSources(commit), now: () => LATER, probe: readable, loadScreen: async () => FIXTURE_SCREEN });
    if (!closed.ok) throw new Error(closed.refusal.reason);
    expect(closed.report.outcome).toBe('closed-with-finding');
    expect(closed.report.credential).toMatchObject({ required: true, passed: false, finding: { kind: 'adapter-credential-readable', step: 'close' } });
    const record = readJson(path.join(run, 'record.json'));
    expect(record.credential.atClose).toMatchObject({ required: true, passed: false, finding: { step: 'close', instruction: 'Run no further observed code: the permission to build and run the observed project has lapsed for this run.' } });
    expect(record.credential.breaches).toEqual([expect.objectContaining({ step: 'close', label: 'Inferred' })]);
    expect(record.disclosures.some((line: string) => line.startsWith('The adapter-credential check is an operating-system read attempt'))).toBe(true);
  });

  it('never overwrites a record that appears while it closes: a concurrent close loses, and the first record stands', async () => {
    const { run, commit } = await fullRun();
    fs.rmSync(path.join(run, 'record.json'));
    const briefRecord = readJson(path.join(run, 'brief.json'));
    fs.writeFileSync(path.join(run, 'brief.json'), JSON.stringify({ ...briefRecord, executionRule: { arm: 'permitting' } }));
    // The credential check runs after the closed-once check; another close finishing during it writes its record first.
    const racing = { probe: async () => { fs.writeFileSync(path.join(run, 'record.json'), 'the other close\'s record\n'); return { passed: true as const, checked: 0, source: 'x' }; } };
    expect(await closeRun(run, {}, { sources: fixtureSources(commit), now: () => LATER, probe: racing, loadScreen: async () => FIXTURE_SCREEN })).toMatchObject({ ok: false, refusal: { stage: 'write' } });
    expect(fs.readFileSync(path.join(run, 'record.json'), 'utf8')).toBe('the other close\'s record\n');
  });

  it('refuses when the consent no longer names the pinned revision', async () => {
    const { run, commit } = await fullRun();
    fs.rmSync(path.join(run, 'record.json'));
    const sources = { ...fixtureSources(commit), observationConsentFor: async () => ({ satisfied: false as const, why: 'withdrawn' }) };
    expect(await closeRun(run, {}, { sources, now: () => LATER, probe: { probe: async () => ({ passed: true as const, checked: 0, source: 'x' }) } })).toMatchObject({ ok: false, refusal: { stage: 'reverify' } });
    expect(fs.existsSync(path.join(run, 'record.json'))).toBe(false);
  });

  it('carries the agent\'s reported commands as its report, screened, and copies no prompt, brief or transcript body', async () => {
    const { run } = await fullRun({ plantSecret: true });
    const text = fs.readFileSync(path.join(run, 'record.json'), 'utf8');
    const record = JSON.parse(text);
    expect(record.reportedCommands).toMatchObject({ draftRevision: 0, reportedBy: 'the authoring agent', label: 'Inferred', count: 3, withheld: 2 });
    // A withheld command stays counted by its position and the reason, and nothing else of it is kept.
    const WITHHELD = '[withheld: a secret detector matches this text]';
    expect(record.reportedCommands.commands).toEqual([
      { position: 1, id: 'x-1', command: 'git log --oneline -1', workingDirectory: 'the clone' },
      { position: 2, withheld: WITHHELD, reason: 'secret-detector-match' },
      { position: 3, withheld: WITHHELD, reason: 'secret-detector-match' },
    ]);
    expect(text).not.toContain(PLANTED_SECRET);
    // No byte of a withheld command, and no unkeyed digest of it, appears anywhere in the record: its fields one by one, joined, as a
    // JSON tuple, and the secret alone, each under every common hash in hex and base64. The ids are distinctive enough to sweep as
    // bytes; 'ls' and 'the clone' are not, since the admitted command's row carries the latter.
    const withheld = [
      ['x-2', `curl -H 'Authorization: token ${PLANTED_SECRET}' https://api.github.com/user`, 'the clone'],
      ['x-3', 'ls', `/tmp/${PLANTED_SECRET}`],
    ];
    const inputs = [PLANTED_SECRET, ...withheld.flatMap((fields) => [...fields, fields.join(''), fields.join(' '), fields.join('\u0000'), JSON.stringify(fields)])];
    const digests = inputs.flatMap((input) => ['sha256', 'sha1', 'md5', 'sha512', 'sha384'].flatMap((algorithm) => {
      const raw = createHash(algorithm).update(input).digest();
      return [raw.toString('hex'), raw.toString('base64'), raw.toString('base64url')];
    }));
    expect(digests).toHaveLength(inputs.length * 15);
    expect(digests.filter((value) => text.includes(value))).toEqual([]);
    expect(withheld.flatMap(([id, command, workingDirectory]) => [id!, command!, workingDirectory!]).filter((value) => value.length > 9 || value.startsWith('x-')).filter((value) => text.includes(value))).toEqual([]);
    // No body of a prompt, brief or packet Syzygy wrote: no line of eight words or more from any of them appears in the record, except
    // the adopted doctrine the execution rule quotes, which the run record must carry verbatim.
    const quoted = JSON.stringify(record.executionRule);
    const sessions = `${run}.sessions`;
    const bodies = [path.join(run, 'brief.md'), ...walk(sessions).filter((file) => /\.(md|txt)$/u.test(file))];
    expect(bodies.length).toBeGreaterThan(1);
    let compared = 0;
    for (const body of bodies) {
      for (const line of fs.readFileSync(body, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l.split(/\s+/u).length >= 8)) {
        if (quoted.includes(JSON.stringify(line).slice(1, -1))) continue;
        compared++;
        expect(text).not.toContain(JSON.stringify(line).slice(1, -1));
      }
    }
    expect(compared).toBeGreaterThan(20);
    // Only digests of the stored files: the record's stored list names every file in the run directory but record.json.
    expect(record.stored.files.map((file: { path: string }) => file.path)).toEqual(walk(run).map((file) => path.relative(run, file)).filter((file) => file !== 'record.json').sort());
    expect(record.noProviderCall).toContain('Syzygy made no provider call');
    expect(record.executionRule.arm).toBe('sec-3');
    expect(record.steps.entries.map((entry: { step: string }) => entry.step)).toEqual(expect.arrayContaining(['check', 'render']));
  });

  it('leaves no credential in the state directory: a sweep of every file under the state root, with its denominator', async () => {
    const credentialDir = tempDir('dossier-close-credential-');
    const sentinels = { GITHUB_TOKEN: 'ghp_SENTINELgithubTOKEN0123456789abcdefAB', ANTHROPIC_API_KEY: 'sk-ant-SENTINEL-anthropic-key-0123456789', OPENAI_API_KEY: 'sk-SENTINELopenaiKEY0123456789abcdefghij' };
    const credential = path.join(credentialDir, 'adapter.token');
    fs.writeFileSync(credential, 'SENTINEL-adapter-credential-bytes', { mode: 0o600 });
    const list = path.join(credentialDir, 'list.json');
    fs.writeFileSync(list, JSON.stringify({ format: 'syzygy-adapter-credential-list/1', credentials: [credential] }));
    const { stateRoot } = await fullRun({ closeArgs: ['--usage-turns', '9'], env: { ...sentinels, SYZYGY_DOSSIER_CREDENTIAL_LIST: list } });
    const files = walk(stateRoot);
    const needles = [...Object.values(sentinels), 'SENTINEL-adapter-credential-bytes', 'SENTINEL'];
    const hits = files.filter((file) => { const bytes = fs.readFileSync(file, 'latin1'); return needles.some((needle) => bytes.includes(needle)); });
    // The denominator: every regular file under the state root, run directory and sessions root alike, counted by a second method.
    const counted = (await execFileAsync('find', [stateRoot, '-type', 'f'])).stdout.split('\n').filter((line) => line !== '').length;
    expect(files.length).toBe(counted);
    expect(files.length).toBeGreaterThan(40);
    expect(hits).toEqual([]);
    // No file Syzygy holds names a credential: none is named like one, and the sessions root holds only the session directories.
    expect(files.filter((file) => /token|credential|secret|\.key$|\.pem$/iu.test(path.basename(file)))).toEqual([]);
  });
});

function walk(dir: string): string[] {
  const out: string[] = [];
  const visit = (current: string): void => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) visit(full); else if (entry.isFile()) out.push(full);
    }
  };
  visit(dir);
  return out.sort();
}
