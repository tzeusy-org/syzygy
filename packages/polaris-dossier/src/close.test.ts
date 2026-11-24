import { execFile, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { beforeAll, describe, expect, it } from 'vitest';
import { FIXTURE_SCREEN, LATER, NOW, PLANTED_SECRET, REAL_ROOT, fixtureSources, fullFixtureRun, makeClone } from './full-run.testkit.js';
import type { DossierRenderer } from './render.js';
import { closeRun, parseUsageFigure } from './close.js';
import { patchFs } from './fs-patch.testkit.js';
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
async function fullRun(options: { closeArgs?: string[]; plantSecret?: boolean; env?: Record<string, string>; beforeClose?: (run: string) => void } = {}) {
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
    expect(record.format).toBe('polaris-dossier-execution-record/2');
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

  it('records stage timings and review rounds from the step log, Inferred, ending the wall time at the close instant', async () => {
    const { run } = await fullRun();
    const record = readJson(path.join(run, 'record.json'));
    expect(record.stepMeasures).toMatchObject({
      label: 'Inferred', unreadableRows: 0,
      wall: { state: 'measured', to: record.closedAt },
      draftRevisions: { state: 'counted' },
    });
    expect(record.stepMeasures.wall.from).toBe(record.steps.entries[0].at);
  });

  it('records the step measures Unknown, never zero, when the step log is gone', async () => {
    const { run } = await fullRun({ beforeClose: (dir) => fs.rmSync(path.join(dir, 'steps.jsonl')) });
    const record = readJson(path.join(run, 'record.json'));
    expect(record.stepMeasures).toEqual({
      label: 'Unknown',
      basis: 'derived by Syzygy at close from the run\'s step log, which the agent sessions can write; every figure is Inferred, and a figure whose rows the log does not carry is Unknown, never zero',
      why: 'the step log records no step',
    });
  });

  it('records the step measures Unknown with the reader\'s reason when the step log stands at its path but cannot be read', async () => {
    const { run } = await fullRun({ beforeClose: (dir) => { fs.rmSync(path.join(dir, 'steps.jsonl')); fs.mkdirSync(path.join(dir, 'steps.jsonl')); } });
    const record = readJson(path.join(run, 'record.json'));
    expect(record.stepMeasures.label).toBe('Unknown');
    expect(record.stepMeasures.why).toBe(record.steps.why);
    expect(record.stepMeasures.why).toMatch(/^steps\.jsonl cannot be read \(/u);
  });

  it('counts step-log lines past the 10,000 it reads as unreadable rows in the step measures', async () => {
    const extra = `${JSON.stringify({ format: 'polaris-dossier-step/1', step: 'await', at: '2026-01-01T00:00:00.000Z', outcome: 'delivered' })}\n`;
    const { run } = await fullRun({ beforeClose: (dir) => fs.appendFileSync(path.join(dir, 'steps.jsonl'), extra.repeat(10_000)) });
    const record = readJson(path.join(run, 'record.json'));
    const over = record.steps.unreadable;
    expect(over).toBeGreaterThan(0);
    expect(record.stepMeasures.unreadableRows).toBe(over);
    expect(record.stepMeasures.rows).toBe(10_000);
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
    const readable = { probe: async () => ({ passed: false as const, kind: 'adapter-credential-readable' as const, why: 'adapter credentials readable by the operator\'s user: /fixture/adapter.token' }) };
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

  it('refuses unavailable policy before writing a close record', async () => {
    const { run, commit } = await fullRun();
    fs.rmSync(path.join(run, 'record.json'));
    const sources = { ...fixtureSources(commit), declaredPolicy: async () => ({ ok: false as const, why: 'fixture unavailable' }) };
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

  // REQ-polaris-generation-034 version 2.8 (syzygy-3efd.72): close takes the latest passed draft from a check record of more than 4,194,304
  // bytes, here one carrying the `manifestFacts` member at every listing cap in its widest form, built by hand from the stated caps. Close
  // shares latestPassedDraft with review and render; render.test.ts runs the same record end to end through review's packet and the site.
  it('takes the passed draft revision from a check record carrying the widest manifest facts, over 4 MiB (version 2.8)', async () => {
    const MAX = Number.MAX_SAFE_INTEGER;
    const CJK = '\u4e00'.repeat(512), LONE = '\ud800'.repeat(256);
    const census = { path: `${JSON.stringify('\u0001'.repeat(512))} (9007199254740991 more code units)`, epistemic: 'unknown', unknownReason: 'path-not-citable', parseFault: null, facts: null, valuesLeftOut: null };
    const widest = {
      format: 'polaris-dossier-manifest-facts/2', state: 'derived',
      screeningPolicy: { policyId: 'x'.repeat(64), policyVersion: 'x'.repeat(64), sha256: '0'.repeat(64) },
      recognizers: ['npm-package-manifest', 'cargo-manifest', 'python-project-manifest', 'go-module-manifest', 'github-actions-workflow',
        'compose-file', 'kubernetes-manifest', 'terraform-configuration', 'makefile', 'cmake-lists'].map((rule, i) => ({
        rule, ruleVersion: 1, label: 'inferred', candidates: MAX, secretPathsLeftOut: MAX, setApart: MAX, inferred: MAX, unknown: MAX, valuesLeftOut: MAX, facts: MAX,
        files: Array.from({ length: i < 5 ? 250 : 100 }, () => census), filesNotListed: MAX,
      })),
      facts: Array.from({ length: 1000 }, (_, i) => ({
        id: `_manifest-${i + 1}`, fact: 'dependency', rule: 'python-project-manifest', ruleVersion: 1, path: CJK, lines: [1_048_577, 1_048_577],
        name: LONE, section: 'project.optional-dependencies', group: LONE, epistemic: 'inferred',
      })),
      factsNotListed: MAX,
      remainder: {
        files: MAX, secretPathsLeftOut: MAX, candidates: MAX, notCandidates: MAX,
        places: Array.from({ length: 251 }, () => ({ place: census.path, files: MAX, notCandidates: MAX })),
        placesNotListed: MAX, filesInPlacesNotListed: MAX, notCandidatesInPlacesNotListed: MAX,
      },
    };
    let size = 0;
    const { run } = await fullRun({ beforeClose: (dir) => {
      const file = path.join(dir, 'checks', 'rev-0.json');
      const text = `${JSON.stringify({ ...readJson(file), manifestFacts: widest }, null, 2)}\n`;
      fs.writeFileSync(file, text);
      size = Buffer.byteLength(text);
    } });
    expect([size > 4_194_304, size <= 16_777_216]).toEqual([true, true]);
    expect(readJson(path.join(run, 'record.json')).reportedCommands).toMatchObject({ draftRevision: 0, reportedBy: 'the authoring agent', label: 'Inferred' });
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

// REQ-polaris-generation-034 (syzygy-3efd.76): every reader of the brief record, of a frozen draft revision and of the run file reads it by
// the reader rule under its bound. The reverification each step runs refuses an unreadable brief record before the render's run disclosure,
// close's execution rule or close's digest of every stored file reads it, so those readers are pinned two ways: by how they read (through
// one bounded open of a descriptor, never `readFileSync` of the path, which blocks on a FIFO and reads a file of any size), and by what close
// records when a file is replaced at the moment its digest of the stored files opens it. A FIFO blocks a reader that opens it without
// O_NONBLOCK inside a synchronous call no test timeout interrupts; the mutation runner bounds each run by a process timeout.
describe('the readers of the run files in a full run', () => {
  it('never read brief.json, a draft or run-advice.json with readFileSync, from check through render and close', async () => {
    const unbounded: string[] = [];
    const watched = /(?:^|\/)(?:brief\.json|run-advice\.json|drafts\/(?:next|rev-\d+)\.json)$/u;
    const restore = patchFs('readFileSync', (original) => ((target: fs.PathOrFileDescriptor, ...rest: unknown[]) => {
      if (typeof target === 'string' && watched.test(target.split(path.sep).join('/'))) unbounded.push(`${target}\n${new Error().stack ?? ''}`);
      return (original as (...args: unknown[]) => unknown)(target, ...rest);
    }) as typeof original);
    let run: string;
    try { ({ run } = await fullRun()); } finally { restore(); }
    expect(readJson(path.join(run, 'record.json')).executionRule).toMatchObject({ arm: 'sec-3', label: 'Inferred' });
    expect(unbounded).toEqual([]);
  });

  /** A full run in which `change` is applied to the run file `rel` at the moment close's digest of the stored files opens it, once. */
  const runSwapping = async (rel: string, change: (file: string) => void) => {
    let swapped = false;
    const restore = patchFs('openSync', (original) => ((file: fs.PathLike, ...rest: unknown[]) => {
      if (!swapped && typeof file === 'string' && file.split(path.sep).join('/').endsWith(`/${rel}`) && (new Error().stack ?? '').includes('at storedFiles')) {
        swapped = true;
        change(file);
      }
      return (original as (...args: unknown[]) => number)(file, ...rest);
    }) as typeof original);
    let run: string;
    try { ({ run } = await fullRun()); } finally { restore(); }
    expect(swapped).toBe(true);
    return readJson(path.join(run, 'record.json')).stored as { files: { path: string; bytes: number }[]; notListed: number };
  };
  const replaceWith = (bytes: number) => (file: string): void => { fs.rmSync(file); fs.writeFileSync(file, ' '.repeat(bytes)); };

  it('digests every stored file of an untouched run, listing them all', async () => {
    const stored = await runSwapping('brief.json', () => { /* unchanged */ });
    expect(stored.notListed).toBe(0);
    expect(stored.files.map((entry) => entry.path)).toContain('brief.json');
  });

  it.each<[string, (file: string) => void]>([
    ['a FIFO', (file) => { fs.rmSync(file); execFileSync('mkfifo', [file]); }],
    ['a symbolic link to /dev/zero', (file) => { fs.rmSync(file); fs.symlinkSync('/dev/zero', file); }],
    ['a directory', (file) => { fs.rmSync(file); fs.mkdirSync(file); }],
  ])('counts a brief record that is %s when its digest opens it as not listed, without blocking', async (_what, change) => {
    const stored = await runSwapping('brief.json', change);
    expect(stored.notListed).toBe(1);
    expect(stored.files.map((entry) => entry.path)).not.toContain('brief.json');
  });

  it('digests a brief record of exactly 262,144 bytes and counts one of 262,145 as not listed', async () => {
    const at = await runSwapping('brief.json', replaceWith(262_144));
    expect(at.notListed).toBe(0);
    expect(at.files.find((entry) => entry.path === 'brief.json')?.bytes).toBe(262_144);
    const past = await runSwapping('brief.json', replaceWith(262_145));
    expect(past.notListed).toBe(1);
    expect(past.files.map((entry) => entry.path)).not.toContain('brief.json');
  });

  it('digests a frozen draft revision of exactly 4,194,304 bytes and counts one of 4,194,305 as not listed', async () => {
    const at = await runSwapping('drafts/rev-0.json', replaceWith(4_194_304));
    expect(at.files.find((entry) => entry.path === 'drafts/rev-0.json')?.bytes).toBe(4_194_304);
    expect(at.notListed).toBe(0);
    const past = await runSwapping('drafts/rev-0.json', replaceWith(4_194_305));
    expect(past.notListed).toBe(1);
    expect(past.files.map((entry) => entry.path)).not.toContain('drafts/rev-0.json');
  });

  it('digests run-advice.json of exactly 16,777,216 bytes and counts one of 16,777,217 as not listed', async () => {
    const at = await runSwapping('run-advice.json', replaceWith(16_777_216));
    expect(at.files.find((entry) => entry.path === 'run-advice.json')?.bytes).toBe(16_777_216);
    const past = await runSwapping('run-advice.json', replaceWith(16_777_217));
    expect(past.notListed).toBe(1);
    expect(past.files.map((entry) => entry.path)).not.toContain('run-advice.json');
  });

  it.each<[string, number]>([
    ['checks/rev-0.json', 16_777_216],
    ['inventory/checks/rev-0.json', 16_777_216],
    ['derived/rev-0.json', 4_194_304],
  ])('digests %s at its bound of %i bytes and counts it one byte past as not listed', async (rel, bound) => {
    const at = await runSwapping(rel, replaceWith(bound));
    expect(at.files.find((entry) => entry.path === rel)?.bytes).toBe(bound);
    const past = await runSwapping(rel, replaceWith(bound + 1));
    expect(past.notListed).toBe(1);
    expect(past.files.map((entry) => entry.path)).not.toContain(rel);
  });

  it('counts a file no stated bound covers as not listed when it grows after its size was taken', async () => {
    // steps.jsonl: read under its own size. It grows by a byte between the open and the read.
    let fd: number | undefined;
    const stored = await runSwapping('steps.jsonl', (file) => {
      // Grow it once its size has been taken: on the next fstat of the descriptor about to be opened.
      const restore = patchFs('fstatSync', (original) => ((descriptor: number, ...rest: unknown[]) => {
        const stats = (original as (...args: unknown[]) => fs.Stats)(descriptor, ...rest);
        if (fd === undefined) { fd = descriptor; fs.appendFileSync(file, 'x'); restore(); }
        return stats;
      }) as typeof original);
    });
    expect(fd).not.toBeUndefined();
    expect(stored.notListed).toBe(1);
    expect(stored.files.map((entry) => entry.path)).not.toContain('steps.jsonl');
  });
});
