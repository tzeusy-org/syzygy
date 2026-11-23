import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { checkDraft } from './check.js';
import { readBoundedFile, readFileAsSized } from './check-record-read.js';
import { breachLog, stepInstants } from './close.js';
import { credentialListFromFile } from './credential-probe.js';
import { readLatestSite } from './design-review.js';
import { readExecutionChoice } from './execution-choice.js';
import { inventoryCoverageAdvice } from './inventory-coverage.js';
import { patchFs } from './fs-patch.testkit.js';
import { blockingWhy, loadState, readMaxRepairCycles, readReviewCheck, readVerdict, runPolarisCli, type SupervisorState } from './polaris.js';
import * as rawDisclosure from './raw-read-disclosure.js';
import { reverifyPinnedRevision } from './reverify.js';
import { renderRun } from './render.js';
import { logStep, readRecord } from './run-dir.js';
import { recheckSessionStatement } from './session-statement.js';
import { readCause } from './run-tree-read.js';
import { closedUsage, runStatus } from './status.js';
import * as urlRecovery from './url-recovery.js';
import { URL_ROLES, URL_RUN_MODE, URL_SUPPORTED_MODEL } from './url-run-record.js';

const { launchProbe } = vi.hoisted(() => ({
  launchProbe: vi.fn((_command: string, _argv: string[], _options: unknown): { status: number; stdout: string } => {
    throw new Error('unexpected launcher process in reader fixture');
  }),
}));

vi.mock('node:child_process', async (importOriginal) => ({
  ...await importOriginal<typeof import('node:child_process')>(),
  spawnSync: launchProbe,
}));

// REQ-polaris-generation-033, -035 and -048 version 2.18 (syzygy-3efd.80): every run-tree file those requirements state is read by the
// reader rule of version 2.10 under the bound the spec states. Every reader opens the path once without blocking, refuses anything whose
// descriptor is not a regular file, or gives a size past the bound, before reading a byte, and reads at most one byte past the bound, so a
// file grown after its size was taken is refused too. The bounds and the words are the spec's literals, written here, never imported.
//
// A FIFO at the path blocks a reader that opens it without O_NONBLOCK forever, inside a synchronous call no test timeout can interrupt:
// the mutation runner (docs/evidence/syzygy-3efd-80/) bounds each run by a process timeout instead.

const RUN_RECORD_BOUND = 65_536;
const LOG_BOUND = 16_777_216;
const LIST_BOUND = 65_536;
const CHOICE_BOUND = 8_192;
const CLOSE_RECORD_BOUND = 16_777_216;
const VERDICT_BOUND = 4_194_304;
const RECORD_BOUND = 262_144;
const STATE_BOUND = 16_777_216;
const STATE_RUN_ID = `run-${'a'.repeat(32)}`;
const STATE_FILE = `${STATE_RUN_ID}.supervisor.json`;

function supervisorState(root: string): SupervisorState {
  const run = path.join(root, STATE_RUN_ID);
  return {
    format: 'polaris-supervisor/2', mode: URL_RUN_MODE, declarationSha256: 'b'.repeat(64),
    run, runId: STATE_RUN_ID, tmuxSession: 'polaris-viewa', clone: path.join(root, 'own-clone'),
    url: 'https://own.example.invalid/source.git', model: URL_SUPPORTED_MODEL, authorSkipPermissions: false,
    briefIssuedAt: 1_792_540_800_000, deadlineSeconds: 600,
    sessions: URL_ROLES.map(role => ({ role, session: 1, directory: role === 'author' ? run
      : `${run}.sessions/${role === 'inventory' ? 'session' : role}-1`, prompt: '', promptSha256: 'c'.repeat(64), allowedTools: null })),
    fidelityDeliveredFor: [], designDeliveredFor: [], notified: [], siteFor: {}, launches: [],
  };
}

function isSubject(file: fs.PathLike, subject: string): boolean {
  if (file === subject) return true;
  return typeof file === 'string' && file.startsWith('/proc/self/fd/') && path.basename(file) === path.basename(subject)
    && fs.realpathSync(path.dirname(file)) === path.dirname(subject);
}

/** `json` followed by spaces to exactly `bytes` bytes: still one JSON document. */
const padded = (json: string, bytes: number): string => {
  const text = json + ' '.repeat(bytes - Buffer.byteLength(json));
  if (Buffer.byteLength(text) !== bytes) throw new Error('fixture: padding missed its size');
  return text;
};
/** `line` followed by newlines to exactly `bytes` bytes: one log line and empty lines, which every log reader skips. */
const logPadded = (line: string, bytes: number): string => {
  const text = line + '\n'.repeat(bytes - Buffer.byteLength(line));
  if (Buffer.byteLength(text) !== bytes) throw new Error('fixture: padding missed its size');
  return text;
};

/** The bytes `run` reads from `subject`, one total per time it opens it. */
const bytesReadFrom = (subject: string, run: () => void): number[] => {
  const opened = new Map<number, number>();
  const totals: number[] = [];
  const restoreOpen = patchFs('openSync', (original) => ((file: fs.PathLike, ...rest: unknown[]) => {
    const fd = (original as (...args: unknown[]) => number)(file, ...rest);
    opened.delete(fd);
    if (isSubject(file, subject)) { opened.set(fd, totals.length); totals.push(0); }
    return fd;
  }) as typeof original);
  const restoreRead = patchFs('readSync', (original) => ((fd: number, ...rest: unknown[]) => {
    const read = (original as (...args: unknown[]) => number)(fd, ...rest);
    const index = opened.get(fd);
    if (index !== undefined) totals[index]! += read;
    return read;
  }) as typeof original);
  try { run(); } finally { restoreRead(); restoreOpen(); }
  return totals;
};

/** Runs `run` while `subject` grows by a mebibyte once a descriptor's size is taken at exactly `bound` bytes. */
const grownAfterSize = (subject: string, bound: number, run: () => void): void => {
  let grown = false;
  const restore = patchFs('fstatSync', (original) => ((fd: number, ...rest: unknown[]) => {
    const stats = (original as (...args: unknown[]) => fs.Stats)(fd, ...rest);
    if (!grown && stats.isFile() && Number(stats.size) === bound) { grown = true; fs.appendFileSync(subject, '\n'.repeat(1_048_576)); }
    return stats;
  }) as typeof original);
  try { run(); } finally { restore(); }
};

const PLANTS: readonly [string, (file: string) => void][] = [
  ['a FIFO', (file) => execFileSync('mkfifo', [file])],
  ['a symbolic link to /dev/zero', (file) => fs.symlinkSync('/dev/zero', file)],
  ['a directory', (file) => fs.mkdirSync(file)],
];

/** What a reader gives, fixed or as words naming the run directory or the file. */
type Expected = unknown | ((at: { run: string; subject: string }) => unknown);
const expectedOf = (expected: Expected, at: { run: string; subject: string }): unknown => (typeof expected === 'function' ? (expected as (at: { run: string; subject: string }) => unknown)(at) : expected);

interface Reader {
  readonly name: string;
  readonly bound: number;
  /** The file under test, relative to a fresh run directory. */
  readonly file: string;
  /** The file's bytes at exactly `bytes`. */
  readonly atBound: (bytes: number, run: string) => string;
  readonly read: (run: string, subject: string) => unknown;
  readonly readAtBound: Expected;
  readonly pastBound: Expected;
  readonly notRegular: Expected;
}

const STEP_BASIS = 'the run\'s step log, which the agent sessions can write';
const READERS: readonly Reader[] = [
  {
    name: 'runStatus (REQ-033: syzygy dossier status reads run.json)', bound: RUN_RECORD_BOUND, file: 'run.json',
    atBound: (bytes) => padded('[]', bytes),
    read: (run) => { const result = runStatus(run); return result.ok ? 'ok' : result.refusal.reason.startsWith(`${run} holds no readable run.json`) ? result.refusal.reason : 'parsed'; },
    readAtBound: 'parsed',
    pastBound: ({ run }: { run: string }) => `${run} holds no readable run.json (larger than 65536 bytes)`,
    notRegular: ({ run }: { run: string }) => `${run} holds no readable run.json (not a regular file)`,
  },
  {
    name: 'logStep (REQ-033: no step-log entry for an invalid run record)', bound: RUN_RECORD_BOUND, file: 'run.json',
    atBound: (bytes) => padded('[]', bytes),
    read: (run) => { logStep(run, 'check', 0, {}); return fs.existsSync(path.join(run, 'steps.jsonl')); },
    readAtBound: false,
    pastBound: false,
    notRegular: false,
  },
  {
    name: 'readMaxRepairCycles (REQ-033: the URL supervisor takes the repair-cycle limit from run.json)', bound: RUN_RECORD_BOUND, file: 'run.json',
    atBound: (bytes) => padded('{"declared":{"maxRepairCycles":3}}', bytes),
    read: (run) => readMaxRepairCycles(run),
    readAtBound: 3,
    pastBound: Number.POSITIVE_INFINITY,
    notRegular: Number.POSITIVE_INFINITY,
  },
  {
    name: 'stepInstants (REQ-033: close reads steps.jsonl)', bound: LOG_BOUND, file: 'steps.jsonl',
    atBound: (bytes) => logPadded('{"step":"check","at":"2026-11-23T00:00:00.000Z"}', bytes),
    read: (run) => stepInstants(run),
    readAtBound: { label: 'Inferred', basis: STEP_BASIS, entries: [{ step: 'check', at: '2026-11-23T00:00:00.000Z', outcome: null }], unreadable: 0 },
    pastBound: { label: 'Unknown', basis: STEP_BASIS, entries: [], unreadable: 0, why: 'steps.jsonl cannot be read (larger than 16777216 bytes)' },
    notRegular: { label: 'Unknown', basis: STEP_BASIS, entries: [], unreadable: 0, why: 'steps.jsonl cannot be read (not a regular file)' },
  },
  {
    name: 'breachLog (REQ-033: close reads credential-breaches.jsonl)', bound: LOG_BOUND, file: 'credential-breaches.jsonl',
    atBound: (bytes) => logPadded('{"path":"/home/a/.ssh/id"}', bytes),
    read: (run) => breachLog(run),
    readAtBound: [{ path: '/home/a/.ssh/id', label: 'Inferred' }],
    pastBound: [{ unreadable: true, why: 'credential-breaches.jsonl cannot be read (larger than 16777216 bytes)', label: 'Unknown' }],
    notRegular: [{ unreadable: true, why: 'credential-breaches.jsonl cannot be read (not a regular file)', label: 'Unknown' }],
  },
  {
    name: 'credentialListFromFile (REQ-033: the credential probe reads its list)', bound: LIST_BOUND, file: 'credentials.json',
    atBound: (bytes) => padded('{"format":"syzygy-adapter-credential-list/1","credentials":["/home/a/.ssh/id"]}', bytes),
    read: (_run, subject) => credentialListFromFile(subject).list(),
    readAtBound: { ok: true, paths: ['/home/a/.ssh/id'] },
    pastBound: ({ subject }: { subject: string }) => ({ ok: false, why: `${subject} is larger than 65536 bytes` }),
    notRegular: ({ subject }: { subject: string }) => ({ ok: false, why: `${subject} is not a regular file` }),
  },
  {
    name: 'readExecutionChoice (REQ-033: the execution-rule reader)', bound: CHOICE_BOUND, file: 'execution-choice.json',
    atBound: (bytes) => padded('{}', bytes),
    read: (run) => readExecutionChoice(run),
    readAtBound: { state: 'refused', why: 'execution-choice.json does not carry exactly the fields allow-execution writes' },
    pastBound: { state: 'refused', why: 'execution-choice.json cannot be read (larger than 8192 bytes)' },
    notRegular: { state: 'refused', why: 'execution-choice.json cannot be read (not a regular file)' },
  },
  {
    name: 'closedUsage (REQ-033: syzygy dossier status reads the close record)', bound: CLOSE_RECORD_BOUND, file: 'record.json',
    atBound: (bytes) => padded('{"agentUsage":{"state":"not-recorded"}}', bytes),
    read: (_run, subject) => closedUsage(subject),
    readAtBound: 'not recorded: the operator declared no usage figure at close, and Syzygy cannot observe the agent sessions\' usage',
    pastBound: 'not recorded; the Execution Record cannot be read',
    notRegular: 'not recorded; the Execution Record cannot be read',
  },
  {
    name: 'readRecord (REQ-035: review check, prompt, launch-form and delivery records)', bound: RECORD_BOUND, file: 'record.json',
    atBound: (bytes) => padded('{"outcome":"validated"}', bytes),
    read: (_run, subject) => readRecord(subject),
    readAtBound: { outcome: 'validated' },
    pastBound: undefined,
    notRegular: undefined,
  },
  {
    name: 'readReviewCheck (REQ-035: the URL supervisor reads review check records, now bounded)', bound: RECORD_BOUND, file: 'reviews/checks/fidelity-verdict-0.json',
    atBound: (bytes) => padded('{"outcome":"validated"}', bytes),
    read: (_run, subject) => readReviewCheck(subject),
    readAtBound: { outcome: 'validated' },
    pastBound: undefined,
    notRegular: undefined,
  },
  {
    name: 'readVerdict (REQ-035: the URL supervisor reads a frozen verdict\'s rows)', bound: VERDICT_BOUND, file: 'reviews/fidelity-verdict-1.json',
    atBound: (bytes) => padded('{"findings":[]}', bytes),
    read: (run) => readVerdict(run, 'fidelity', 1),
    readAtBound: { findings: [] },
    pastBound: {},
    notRegular: {},
  },
  {
    name: 'blockingWhy (REQ-035: the URL supervisor gives why a verdict is not ready)', bound: VERDICT_BOUND, file: 'reviews/design-verdict-2.json',
    atBound: (bytes) => padded('{"findings":[]}', bytes),
    read: (run) => blockingWhy(run, 'design', 2),
    readAtBound: 'the reviewer declared it not ready',
    pastBound: 'its verdict is unreadable',
    notRegular: 'its verdict is unreadable',
  },
  {
    name: 'loadState (REQ-048: the supervisor\'s own state)', bound: STATE_BOUND, file: STATE_FILE,
    atBound: (bytes, run) => padded(JSON.stringify(supervisorState(run)), bytes),
    read: (run) => loadState(run, STATE_RUN_ID),
    readAtBound: ({ run }: { run: string }) => supervisorState(run),
    pastBound: 'unreadable',
    notRegular: 'unreadable',
  },
];

const fresh = (reader: Reader): { run: string; subject: string } => {
  const run = tempDir('run-tree-read-');
  const subject = path.join(run, reader.file);
  fs.mkdirSync(path.dirname(subject), { recursive: true });
  return { run, subject };
};

describe.each(READERS)('the run-tree reader rule (syzygy-3efd.80): $name', (reader) => {
  it('reads a file of exactly its bound, to its end and no further', () => {
    const at = fresh(reader);
    fs.writeFileSync(at.subject, reader.atBound(reader.bound, at.run), { mode: 0o600 });
    let seen: unknown;
    expect(bytesReadFrom(at.subject, () => { seen = reader.read(at.run, at.subject); })).toEqual([reader.bound]);
    expect(seen).toEqual(expectedOf(reader.readAtBound, at));
  });

  it('refuses a file one byte past its bound from its size alone, reading no byte of it', () => {
    const at = fresh(reader);
    fs.writeFileSync(at.subject, reader.atBound(reader.bound + 1, at.run), { mode: 0o600 });
    let seen: unknown;
    expect(bytesReadFrom(at.subject, () => { seen = reader.read(at.run, at.subject); })).toEqual([0]);
    expect(seen).toEqual(expectedOf(reader.pastBound, at));
  });

  it('refuses a file grown past its bound after its size was taken, reading at most one byte past the bound', () => {
    const at = fresh(reader);
    fs.writeFileSync(at.subject, reader.atBound(reader.bound, at.run), { mode: 0o600 });
    let seen: unknown, reads: number[] = [];
    grownAfterSize(at.subject, reader.bound, () => { reads = bytesReadFrom(at.subject, () => { seen = reader.read(at.run, at.subject); }); });
    expect(reads).toEqual([reader.bound + 1]);
    expect(seen).toEqual(expectedOf(reader.pastBound, at));
  });

  it.each(PLANTS)('refuses %s at its path without blocking or reading a byte', (_what, plant) => {
    const at = fresh(reader);
    plant(at.subject);
    let seen: unknown;
    const reads = bytesReadFrom(at.subject, () => { seen = reader.read(at.run, at.subject); });
    expect(reads.length).toBeLessThanOrEqual(1);
    expect(reads.reduce((total, count) => total + count, 0)).toBe(0);
    expect(seen).toEqual(expectedOf(reader.notRegular, at));
  });
});

describe('the run-tree reader rule (syzygy-3efd.80): what stays as it was', () => {
  it('close takes an absent step log and an absent breach log as empty logs, as before', () => {
    const run = tempDir('run-tree-read-absent-');
    expect(stepInstants(run)).toEqual({ label: 'Inferred', basis: STEP_BASIS, entries: [], unreadable: 0 });
    expect(breachLog(run)).toEqual([]);
  });

  it('close returns Unknown for logs whose links cannot be opened', () => {
    const run = tempDir('run-tree-read-unreadable-');
    fs.symlinkSync('missing', path.join(run, 'steps.jsonl'));
    fs.symlinkSync('missing', path.join(run, 'credential-breaches.jsonl'));
    expect(stepInstants(run)).toMatchObject({ label: 'Unknown', why: 'steps.jsonl cannot be read (ENOENT)' });
    expect(breachLog(run)).toEqual([
      { unreadable: true, label: 'Unknown', why: 'credential-breaches.jsonl cannot be read (ENOENT)' },
    ]);
  });

  it('the execution-rule reader takes an absent choice as absent, as before', () => {
    expect(readExecutionChoice(tempDir('run-tree-read-absent-'))).toEqual({ state: 'absent', why: 'no execution-choice.json in the run directory' });
  });

  it('the supervisor takes a state path holding nothing as no earlier state, and a state that does not parse as unreadable', () => {
    const root = tempDir('run-tree-read-state-');
    expect(loadState(root, STATE_RUN_ID)).toBe('absent');
    fs.writeFileSync(path.join(root, STATE_FILE), '{', { mode: 0o600 });
    expect(loadState(root, STATE_RUN_ID)).toBe('unreadable');
    fs.writeFileSync(path.join(root, STATE_FILE), 'null');
    expect(loadState(root, STATE_RUN_ID)).toBe('unreadable');
  });

  it.each(PLANTS)('the reverification refuses a run whose run.json is %s with record-invalid and the stated words', async (_what, plant) => {
    const run = tempDir('run-tree-read-reverify-');
    plant(path.join(run, 'run.json'));
    const result = await reverifyPinnedRevision(run, {} as never, 0);
    expect(result).toMatchObject({ ok: false, refusals: [{ code: 'record-invalid', reason: `${run} holds no readable run.json (not a regular file)` }] });
  });

  it('the reverification refuses a run.json one byte past 65,536 bytes with the stated words', async () => {
    const run = tempDir('run-tree-read-reverify-');
    fs.writeFileSync(path.join(run, 'run.json'), padded('{}', RUN_RECORD_BOUND + 1));
    const result = await reverifyPinnedRevision(run, {} as never, 0);
    expect(result).toMatchObject({ ok: false, refusals: [{ code: 'record-invalid', reason: `${run} holds no readable run.json (larger than 65536 bytes)` }] });
  });
});

describe('the run-tree reader rule (syzygy-3efd.80): readLatestSite (the design packet reads each page file)', () => {
  it.each(PLANTS)('refuses a page file that is a regular file when listed and %s when opened, reading no byte', (_what, plant) => {
    const run = tempDir('run-tree-read-site-');
    const page = path.join(run, 'site', '0', 'index.html');
    fs.mkdirSync(path.dirname(page), { recursive: true });
    fs.writeFileSync(page, '<!doctype html>');
    let swapped = false;
    const restore = patchFs('openSync', (original) => ((file: fs.PathLike, ...rest: unknown[]) => {
      if (file === page && !swapped) { swapped = true; fs.rmSync(page); plant(page); }
      return (original as (...args: unknown[]) => number)(file, ...rest);
    }) as typeof original);
    let seen: unknown, reads: number[] = [];
    try { reads = bytesReadFrom(page, () => { seen = readLatestSite(run); }); } finally { restore(); }
    expect(swapped).toBe(true);
    expect(reads).toEqual([0]);
    expect(seen).toEqual({ ok: false, reason: 'index.html in site 0 is not a regular file' });
  });

  it('reads a page file within what remains of the site bound as before', () => {
    const run = tempDir('run-tree-read-site-');
    const page = path.join(run, 'site', '0', 'index.html');
    fs.mkdirSync(path.dirname(page), { recursive: true });
    fs.writeFileSync(page, '<!doctype html>');
    expect(readLatestSite(run)).toEqual({ ok: true, number: 0, directory: path.join(run, 'site', '0'), files: new Map([['index.html', '<!doctype html>']]) });
  });
});

// The other readers of run.json, each on a run whose run.json is a FIFO: every one gives its outcome for a run record it cannot read, and
// none blocks (a reader that opens the FIFO without O_NONBLOCK never returns, which the mutation runner's process timeout catches).
describe('the run-tree reader rule (syzygy-3efd.80): the other readers of run.json', () => {
  const fifoRun = (): string => {
    const run = path.join(tempDir('run-tree-read-fifo-'), `run-${'d'.repeat(32)}`);
    fs.mkdirSync(run);
    execFileSync('mkfifo', [path.join(run, 'run.json')]);
    return run;
  };

  it('check refuses with record-invalid and the stated words, and appends no step-log entry', async () => {
    const run = fifoRun();
    const result = await checkDraft(run, {}, { now: () => 0 } as never);
    expect(result).toMatchObject({ ok: false, refusal: { reasons: [`${run} holds no readable run.json (not a regular file)`] } });
    expect(fs.existsSync(path.join(run, 'steps.jsonl'))).toBe(false);
  });

  it('render refuses with the stated words, and appends no step-log entry', async () => {
    const run = fifoRun();
    const result = await renderRun(run, { now: () => 0, renderer: (() => { throw new Error('not reached'); }) as never } as never);
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).toContain(`${run} holds no readable run.json (not a regular file)`);
    expect(fs.existsSync(path.join(run, 'steps.jsonl'))).toBe(false);
  });

  it('the recheck of a session\'s declared provider takes the run record as one it cannot read', async () => {
    const run = fifoRun();
    expect(await recheckSessionStatement(run, 'the fidelity session', {}, {} as never, 0)).toEqual({ ok: false, why: 'the run record cannot be read to check the fidelity session declared provider; its work does not count' });
  });
});

// REQ-polaris-generation-048 version 2.18: a state path holding something the supervisor cannot read refuses every command that names the
// run, and a supervisor started for that run writes nothing there rather than starting it afresh.
describe('the run-tree reader rule (syzygy-3efd.80): syzygy polaris over a state it cannot read', () => {
  it.each([['--stop'], ['--attach'], ['--supervise']])('%s refuses a run whose state is a FIFO, without blocking, and writes nothing there', async (flag) => {
    const root = tempDir('run-tree-read-polaris-');
    const state = path.join(root, STATE_FILE);
    execFileSync('mkfifo', [state]);
    const argv = flag === '--supervise' ? ['--supervise', '--resume', STATE_RUN_ID, '--audience', 'operators', '--state-root', root]
      : [flag, STATE_RUN_ID, '--state-root', root];
    let stderr = '';
    const restore = vi.spyOn(process.stderr, 'write').mockImplementation(((chunk: string | Uint8Array) => { stderr += String(chunk); return true; }) as typeof process.stderr.write);
    let exit: number;
    try { exit = await runPolarisCli(argv); } finally { restore.mockRestore(); }
    expect(exit).toBe(1);
    expect(stderr).toBe(`syzygy polaris: refused: no launched run ${STATE_RUN_ID} under ${root}\n`);
    expect(fs.lstatSync(state).isFIFO()).toBe(true);
  });

  it('refuses a named supervisor whose state is a dangling link', async () => {
    const root = tempDir('run-tree-read-polaris-');
    const state = path.join(root, STATE_FILE);
    fs.symlinkSync('missing', state);
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      expect(await runPolarisCli(['--supervise', '--resume', STATE_RUN_ID, '--state-root', root])).toBe(1);
      expect(stderr).toHaveBeenLastCalledWith(`syzygy polaris: refused: no launched run ${STATE_RUN_ID} under ${root}\n`);
      expect(fs.readlinkSync(state)).toBe('missing');
      expect(fs.readdirSync(root)).toEqual([STATE_FILE]);
    } finally {
      stderr.mockRestore();
    }
  });
});

it('routes Resume into a new window of the retained view using the supervisor state it read once', async () => {
  const root = tempDir('run-tree-read-resume-');
  const state = path.join(root, STATE_FILE), retained = supervisorState(root);
  fs.writeFileSync(state, JSON.stringify(retained), { mode: 0o600 });
  const recovery = vi.spyOn(urlRecovery, 'verifyStoppedUrlRun')
    .mockResolvedValue({ ok: true, record: { declared: { agentProvider: 'anthropic' } } } as never);
  const disclosure = vi.spyOn(rawDisclosure, 'readRawReadDisclosure')
    .mockReturnValue({ authorHandoff: 'reached' } as never);
  let opens = 0;
  const restore = patchFs('openSync', (original) => ((file: fs.PathLike, ...rest: unknown[]) => {
    if (isSubject(file, state)) opens++;
    return (original as (...args: unknown[]) => number)(file, ...rest);
  }) as typeof original);
  launchProbe.mockImplementation(() => ({ status: 0, stdout: 'done\n' }));
  try {
    expect(await runPolarisCli(['--resume', STATE_RUN_ID, '--state-root', root, '--no-attach'])).toBe(0);
    expect(opens).toBe(1);
    expect(recovery).toHaveBeenCalledExactlyOnceWith(retained, expect.any(Object));
    expect(launchProbe.mock.calls).toEqual([
      ['tmux', ['-V'], { encoding: 'utf8' }],
      ['bwrap', ['--version'], { encoding: 'utf8' }],
      ['bwrap', expect.arrayContaining(['--unshare-all', '/bin/sh', '-c']), { encoding: 'utf8' }],
      ['tmux', ['has-session', '-t', retained.tmuxSession], { stdio: 'ignore' }],
      ['tmux', expect.arrayContaining(['new-window', '-t', retained.tmuxSession, '--supervise',
        '--tmux-session', STATE_RUN_ID]), { stdio: 'inherit' }],
      ['tmux', ['set-option', '-t', retained.tmuxSession, 'remain-on-exit', 'on'], { stdio: 'ignore' }],
    ]);
  } finally {
    restore();
    recovery.mockRestore();
    disclosure.mockRestore();
    launchProbe.mockReset();
  }
});

// Check's inventory-coverage advice reads the frozen inventory of record under 4,194,304 bytes: one it cannot read is an Unknown advice.
describe('the run-tree reader rule (syzygy-3efd.80): the inventory-coverage advice', () => {
  it.each(PLANTS)('is Unknown, without blocking, where the frozen inventory is %s', async (_what, plant) => {
    const run = tempDir('run-tree-read-coverage-');
    fs.mkdirSync(path.join(run, 'inventory'));
    plant(path.join(run, 'inventory', 'rev-0.json'));
    const advice = await inventoryCoverageAdvice(run, {}, {
      inventoryOfRecord: async () => ({ counts: true, file: 'inventory/rev-0.json', sha256: 'a'.repeat(64), revision: 0 }) as never,
      sources: {} as never, now: 0, isSecretPath: () => false,
    });
    expect(advice).toMatchObject({ state: 'unknown', why: 'the inventory of record could not be read or compared (NotARegularFileError)' });
  });
});

// A file read under its own size (the inventory brief, a packet whose delivery record states no size) names the size it was read under.
describe('the run-tree reader rule (syzygy-3efd.80): the bound a refusal names', () => {
  it('names the size a file read under its own size had when opened, once it grows while read', () => {
    const file = path.join(tempDir('run-tree-read-sized-'), 'inventory-brief.md');
    fs.writeFileSync(file, '0123456789');
    let cause: unknown;
    grownAfterSize(file, 10, () => { try { readFileAsSized(file); } catch (error) { cause = error; } });
    expect(readCause(cause)).toBe('larger than 10 bytes');
  });

  it('names the bound a file past it by its size was refused under, with no bound given to the words', () => {
    const file = path.join(tempDir('run-tree-read-sized-'), 'packet.json');
    fs.writeFileSync(file, '0123456789');
    let cause: unknown;
    try { readBoundedFile(file, 5); } catch (error) { cause = error; }
    expect(readCause(cause)).toBe('larger than 5 bytes');
  });
});
