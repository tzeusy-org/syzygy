import * as fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { patchFs } from './fs-patch.testkit.js';
import { URL_ROLES, URL_RUN_MODE, URL_SUPPORTED_MODEL } from './url-run-record.js';
import { openUrlSupervisorStop, readUrlSupervisorState, requestUrlSupervisorStop, writeUrlSupervisorState, URL_SUPERVISOR_STATE_LIMITS,
  type UrlSupervisorStop } from './url-supervisor-state.js';
import type { SupervisorState } from './polaris.js';

function fixture() {
  const root = tempDir('url-supervisor-state-'), runId = `run-${'a'.repeat(32)}`, run = path.join(root, runId);
  const state: SupervisorState = { format: 'polaris-supervisor/2', mode: URL_RUN_MODE, declarationSha256: 'b'.repeat(64),
    run, runId, tmuxSession: 'polaris-own123', clone: path.join(root, 'own-clone'), url: 'https://own.example.invalid/source.git',
    model: URL_SUPPORTED_MODEL, authorSkipPermissions: false, briefIssuedAt: 1_792_540_800_000, deadlineSeconds: 3600,
    sessions: URL_ROLES.map(role => ({ role, session: 1, directory: role === 'author' ? run : `${run}.sessions/${role === 'inventory' ? 'session' : role}-1`,
      prompt: '', promptSha256: 'c'.repeat(64), allowedTools: null })), fidelityDeliveredFor: [], designDeliveredFor: [], notified: [], siteFor: {}, launches: [] };
  const file = path.join(root, `${runId}.supervisor.json`);
  const raw = (value: unknown) => fs.writeFileSync(file, JSON.stringify(value), { mode: 0o600 });
  return { root, runId, run, state, file, raw };
}
const changed = (state: SupervisorState, patch: Record<string, unknown>): SupervisorState => ({ ...state, ...patch }) as SupervisorState;
function failIo(name: 'fsyncSync' | 'renameSync' | 'linkSync'): () => void {
  return patchFs(name, () => () => { throw new Error('Own IO failure with a diagnostic that must stay private'); });
}

describe('bounded URL supervisor metadata', () => {
  it('round-trips format2 identities and atomically updates bounded progress without retaining prompt bodies', () => {
    const f = fixture(); expect(readUrlSupervisorState(f.root, f.runId)).toBe(null);
    writeUrlSupervisorState(f.root, f.state); const first = fs.statSync(f.file);
    expect(readUrlSupervisorState(f.root, f.runId)).toEqual(f.state);
    const at = new Date(f.state.briefIssuedAt + 1000).toISOString();
    const update = changed(f.state, { fidelityDeliveredFor: [0, 1, 1], fidelityDeliveredPairs: ['0/0', '1/0', '1/1'],
      designDeliveredFor: [0], notified: ['inventory-draft-0', 'fidelity-1', 'design-0'], siteFor: { 0: -1, 1: 0 },
      pendingRepair: { draftAbove: 1, inventoryAbove: 0 }, launches: [{ role: 'author', pid: 123, at, argvSha256: 'd'.repeat(64), viewSha256: 'e'.repeat(64) }], stopped: at });
    writeUrlSupervisorState(f.root, update);
    expect(readUrlSupervisorState(f.root, f.runId)).toEqual(update); expect(fs.statSync(f.file).ino).not.toBe(first.ino);
    expect(fs.statSync(f.file).mode & 0o777).toBe(0o600); expect(fs.readdirSync(f.root)).toEqual([path.basename(f.file)]);
  });
  it('binds final-site metadata to a completed run and a later site for the same draft', () => {
    const f = fixture();
    const at = new Date(f.state.briefIssuedAt + 1000).toISOString();
    const finalSite = { site: 5, draftRevision: 2, verdict: 4, packetSha256: 'd'.repeat(64),
      verdictEventSha256: 'e'.repeat(64), populationSha256: 'f'.repeat(64) };
    const closed = changed(f.state, { siteFor: { 2: 3 }, stopped: at, done: at, finalSite });
    writeUrlSupervisorState(f.root, closed);
    expect(readUrlSupervisorState(f.root, f.runId)).toEqual(closed);

    for (const patch of [{ done: undefined }, { stopped: undefined }, { siteFor: { 1: 3 } }, { siteFor: { 2: 5 } },
      { finalSite: { ...finalSite, verdictEventSha256: 'x'.repeat(64) } }, { finalSite: { ...finalSite, raw: 'Own body' } }]) {
      const state = changed(closed, patch);
      expect(() => writeUrlSupervisorState(f.root, state)).toThrow('url-supervisor-state-unavailable');
      expect(readUrlSupervisorState(f.root, f.runId)).toEqual(closed);
    }
  });
  it('refuses legacy, unknown, injected or misbound metadata on both read and write', () => {
    const f = fixture();
    const patches: Record<string, unknown>[] = [
      { format: 'polaris-supervisor/1' }, { mode: 'operator-started' }, { declarationSha256: 'b'.repeat(63) }, { runId: '../escape' },
      { declarationSha256: `${'b'.repeat(64)}\n` }, { runId: `${f.runId}\n` }, { notified: ['design-0\n'] }, { fidelityDeliveredPairs: ['0/0\n'] }, { siteFor: { '0\n': 1 } },
      { run: `${f.run}-other` }, { clone: `${f.root}/../clone` }, { clone: 'relative' }, { tmuxSession: '-t other' },
      { tmuxSession: 'polaris-x:0; kill-server' }, { url: 'https://user:password@own.invalid/source' }, { model: 'unsupported' },
      { authorSkipPermissions: true }, { prompt: 'Own body must never persist' }, { sessions: [...f.state.sessions].reverse() },
      { sessions: f.state.sessions.map(s => ({ ...s, prompt: 'Own raw role prompt' })) },
      { sessions: f.state.sessions.map(s => ({ ...s, directory: f.run })) },
      { sessions: f.state.sessions.map(s => ({ ...s, allowedTools: ['Bash'] })) }, { notified: ['Own arbitrary body'] },
      { launches: [{ role: 'author', pid: null, at: 'now', argvSha256: 'd'.repeat(64), viewSha256: 'e'.repeat(64) }] },
      { pendingRepair: {} }, { pendingRepair: { draftAbove: 0, body: 'Own text' } }, { siteFor: { '01': 0 } },
    ];
    for (const patch of patches) {
      const state = changed(f.state, patch); expect(() => writeUrlSupervisorState(f.root, state)).toThrow('url-supervisor-state-unavailable');
      expect(fs.existsSync(f.file)).toBe(false); f.raw(state); expect(readUrlSupervisorState(f.root, f.runId)).toBe(null); fs.unlinkSync(f.file);
    }
  });
  it('refuses nonfinite and overflowing arithmetic, populations, schema depth, encoding and malformed JSON', () => {
    const f = fixture();
    for (const patch of [{ briefIssuedAt: Infinity }, { briefIssuedAt: 0 }, { deadlineSeconds: 0 }, { deadlineSeconds: NaN },
      { deadlineSeconds: Number.MAX_SAFE_INTEGER }, { briefIssuedAt: Number.MAX_SAFE_INTEGER - 1, deadlineSeconds: 1 },
      { fidelityDeliveredFor: Array(URL_SUPERVISOR_STATE_LIMITS.population + 1).fill(0) }, { designDeliveredFor: [-1] },
      { siteFor: { 0: 1_000_000 } }, { fidelityDeliveredPairs: ['0/NaN'] }, { stopped: '2026-02-30T00:00:00.000Z' }]) {
      expect(() => writeUrlSupervisorState(f.root, changed(f.state, patch))).toThrow('url-supervisor-state-unavailable');
    }
    for (const bytes of [Buffer.from('{'), Buffer.from('{"format":1,"format":2}'), Buffer.from([0xff]),
      Buffer.from(`${'['.repeat(13)}0${']'.repeat(13)}`), Buffer.alloc(URL_SUPERVISOR_STATE_LIMITS.maxBytes + 1, 32)]) {
      fs.writeFileSync(f.file, bytes, { mode: 0o600 }); expect(readUrlSupervisorState(f.root, f.runId)).toBe(null);
    }
  });
  it('refuses links, directories, nonprivate modes and symlink ancestors without changing their targets', () => {
    const f = fixture(), other = path.join(f.root, 'own-other'); fs.writeFileSync(other, 'Own unrelated bytes', { mode: 0o600 });
    for (const kind of ['symlink', 'hardlink', 'directory', 'mode'] as const) {
      if (kind === 'symlink') fs.symlinkSync(other, f.file);
      else if (kind === 'hardlink') fs.linkSync(other, f.file);
      else if (kind === 'directory') fs.mkdirSync(f.file);
      else { f.raw(f.state); fs.chmodSync(f.file, 0o640); }
      expect(readUrlSupervisorState(f.root, f.runId)).toBe(null);
      expect(() => writeUrlSupervisorState(f.root, f.state)).toThrow('url-supervisor-state-unavailable');
      expect(fs.readFileSync(other, 'utf8')).toBe('Own unrelated bytes');
      fs.rmSync(f.file, { recursive: true });
    }
    const alias = `${f.root}-alias`; fs.symlinkSync(f.root, alias);
    try { expect(readUrlSupervisorState(alias, f.runId)).toBe(null); expect(() => writeUrlSupervisorState(alias, f.state)).toThrow('url-supervisor-state-unavailable'); }
    finally { fs.unlinkSync(alias); }
    f.raw({ unrelated: true }); expect(() => writeUrlSupervisorState(f.root, f.state)).toThrow('url-supervisor-state-unavailable');
    expect(JSON.parse(fs.readFileSync(f.file, 'utf8'))).toEqual({ unrelated: true });
  });
  it('opens data descriptors with nofollow and nonblock and handles an unavailable stream', () => {
    const f = fixture(); let flags = 0;
    const restore = patchFs('openSync', original => ((file: fs.PathLike, given: number, mode?: fs.Mode) => {
      if (String(file).endsWith(`${f.runId}.supervisor.json`)) { flags = given; throw Object.assign(new Error('Own FIFO stand-in'), { code: 'ENXIO' }); }
      return original(file, given, mode);
    }) as typeof fs.openSync);
    try {
      expect(readUrlSupervisorState(f.root, f.runId)).toBe(null);
      expect(flags & fs.constants.O_NOFOLLOW).not.toBe(0); expect(flags & fs.constants.O_NONBLOCK).not.toBe(0);
    } finally { restore(); }
  });
  it('detects replacement or chmod during descriptor reading and preserves a target changed before rename', () => {
    const f = fixture(); f.raw(f.state); let mutated = false;
    const restore = patchFs('readSync', original => ((...args: Parameters<typeof fs.readSync>) => {
      const n = Reflect.apply(original, fs, args) as number;
      if (!mutated) { mutated = true; fs.renameSync(f.file, `${f.file}.old`); f.raw(f.state); }
      return n;
    }) as typeof fs.readSync);
    try { expect(readUrlSupervisorState(f.root, f.runId)).toBe(null); } finally { restore(); }
    fs.unlinkSync(`${f.file}.old`);
    const restoreMode = patchFs('readSync', original => ((...args: Parameters<typeof fs.readSync>) => {
      const n = Reflect.apply(original, fs, args) as number; fs.chmodSync(f.file, 0o640); return n;
    }) as typeof fs.readSync);
    try { expect(readUrlSupervisorState(f.root, f.runId)).toBe(null); } finally { restoreMode(); fs.chmodSync(f.file, 0o600); }
    let replaced = false;
    const restoreStat = patchFs('lstatSync', original => ((file: fs.PathLike, options?: fs.StatOptions) => {
      if (!replaced && String(file).endsWith('.tmp')) { replaced = true; fs.unlinkSync(f.file); fs.writeFileSync(f.file, 'Own replacement', { mode: 0o600 }); }
      return original(file, options as never);
    }) as typeof fs.lstatSync);
    try { expect(() => writeUrlSupervisorState(f.root, f.state)).toThrow('url-supervisor-state-unavailable'); }
    finally { restoreStat(); }
    expect(fs.readFileSync(f.file, 'utf8')).toBe('Own replacement'); expect(fs.readdirSync(f.root)).toEqual([path.basename(f.file)]);
  });
  it('refuses immutable binding changes and accessor/symbol-bearing state without overwriting valid metadata', () => {
    const f = fixture(); writeUrlSupervisorState(f.root, f.state);
    for (const patch of [{ declarationSha256: 'd'.repeat(64) }, { url: 'https://other.invalid/source.git' }, { deadlineSeconds: 7200 }]) {
      expect(() => writeUrlSupervisorState(f.root, changed(f.state, patch))).toThrow('url-supervisor-state-unavailable');
    }
    const accessor = { ...f.state }; Object.defineProperty(accessor, 'url', { get: () => { throw new Error('Own getter must not run'); }, enumerable: true });
    expect(() => writeUrlSupervisorState(f.root, accessor)).toThrow('url-supervisor-state-unavailable');
    expect(() => writeUrlSupervisorState(f.root, Object.assign({ ...f.state }, { [Symbol('own')]: 'Own body' }))).toThrow('url-supervisor-state-unavailable');
    expect(readUrlSupervisorState(f.root, f.runId)).toEqual(f.state);
  });
  it('preserves the previous state on flush or rename failure and cleans only its own temporary inode', () => {
    for (const name of ['fsyncSync', 'renameSync'] as const) {
      const f = fixture(); writeUrlSupervisorState(f.root, f.state); const original = fs.readFileSync(f.file);
      const restore = failIo(name);
      try { expect(() => writeUrlSupervisorState(f.root, changed(f.state, { notified: ['design-0'] }))).toThrow(/^url-supervisor-state-unavailable$/u); }
      finally { restore(); }
      expect(fs.readFileSync(f.file)).toEqual(original); expect(fs.readdirSync(f.root)).toEqual([path.basename(f.file)]);
    }
    const f = fixture(); let collision: string | undefined;
    const restore = patchFs('openSync', original => ((file: fs.PathLike, flags: number, mode?: fs.Mode) => {
      if (collision === undefined && String(file).endsWith('.tmp')) { collision = path.join(f.root, path.basename(String(file))); fs.writeFileSync(collision, 'Own unrelated collision', { mode: 0o600 }); }
      return original(file, flags, mode);
    }) as typeof fs.openSync);
    try { expect(() => writeUrlSupervisorState(f.root, f.state)).toThrow(/^url-supervisor-state-unavailable$/u); }
    finally { restore(); }
    expect(collision).toBeDefined(); expect(fs.readFileSync(collision!, 'utf8')).toBe('Own unrelated collision');
  });
});

const STOP_ERROR = /^url-supervisor-stop-unavailable$/u;
function stopFixture() {
  const f = fixture(), active = changed(f.state, { stopGeneration: 'f'.repeat(32) });
  const offer = path.join(f.root, `${f.runId}.supervisor-stop`);
  writeUrlSupervisorState(f.root, active);
  return { ...f, active, offer };
}

describe('generation-bound URL supervisor stop requests', () => {
  it('publishes a bounded private offer and accepts duplicate requests without changing supervisor metadata', () => {
    const f = stopFixture();
    expect(() => requestUrlSupervisorStop(f.root, f.active)).toThrow(STOP_ERROR);
    expect(() => openUrlSupervisorStop(f.root, f.state)).toThrow(STOP_ERROR);
    const control = openUrlSupervisorStop(f.root, f.active);
    try {
      const stateBytes = fs.readFileSync(f.file), ready = fs.readFileSync(f.offer);
      expect(ready.toString('ascii')).toEqual(`polaris-supervisor-stop/1\n${'f'.repeat(32)}\n${'b'.repeat(64)}\n0`);
      const initial = fs.statSync(f.offer);
      expect(initial.mode & 0o777).toBe(0o600);
      expect(initial.nlink).toBe(1);
      expect(control.status()).toBe('ready');
      expect(() => openUrlSupervisorStop(f.root, f.active)).toThrow(STOP_ERROR);
      expect(fs.readFileSync(f.offer)).toEqual(ready);
      expect(() => requestUrlSupervisorStop(f.root, changed(f.active, { declarationSha256: 'd'.repeat(64) }))).toThrow(STOP_ERROR);
      requestUrlSupervisorStop(f.root, f.active);
      requestUrlSupervisorStop(f.root, f.active);
      expect(control.status()).toBe('requested');
      const requested = fs.readFileSync(f.offer);
      expect(requested.subarray(0, -1)).toEqual(ready.subarray(0, -1));
      expect(requested.at(-1)).toBe(0x31);
      expect(fs.statSync(f.offer).ino).toBe(initial.ino);
      expect(fs.readFileSync(f.file)).toEqual(stateBytes);
    } finally { expect(control.close()).toBe('requested'); }
    expect(control.close()).toBe('requested');
    expect(() => control.status()).toThrow(STOP_ERROR);
    expect(() => requestUrlSupervisorStop(f.root, f.active)).toThrow(STOP_ERROR);
    expect(fs.readdirSync(f.root)).toEqual([path.basename(f.file)]);
  });

  it('rejects a stale snapshot and never gives a delayed writer the successor inode', () => {
    const f = stopFixture(), control = openUrlSupervisorStop(f.root, f.active);
    const next = changed(f.active, { stopGeneration: '5'.repeat(32) });
    let successor: UrlSupervisorStop | undefined;
    const restore = patchFs('writeSync', original => ((...args: unknown[]) => {
      if (successor === undefined && args[3] === 1) {
        control.close();
        writeUrlSupervisorState(f.root, next);
        successor = openUrlSupervisorStop(f.root, next);
      }
      return Reflect.apply(original, fs, args);
    }) as typeof fs.writeSync);
    try {
      expect(() => requestUrlSupervisorStop(f.root, f.active)).toThrow(STOP_ERROR);
      expect(successor?.status()).toBe('ready');
      expect(() => requestUrlSupervisorStop(f.root, f.active)).toThrow(STOP_ERROR);
      expect(successor?.status()).toBe('ready');
      requestUrlSupervisorStop(f.root, next);
      expect(successor?.status()).toBe('requested');
    } finally { restore(); control.close(); successor?.close(); }
  });

  it('seals the last accepted request even when it lands immediately before offer retirement', () => {
    const f = stopFixture(), control = openUrlSupervisorStop(f.root, f.active);
    expect(control.status()).toBe('ready');
    let accepted = false;
    const restore = patchFs('unlinkSync', original => (file => {
      if (path.basename(String(file)) === path.basename(f.offer)) {
        requestUrlSupervisorStop(f.root, f.active);
        accepted = true;
      }
      return original(file);
    }));
    try {
      expect(control.close()).toBe('requested');
      expect(accepted).toBe(true);
      expect(control.close()).toBe('requested');
    } finally { restore(); }
    expect(() => requestUrlSupervisorStop(f.root, f.active)).toThrow(STOP_ERROR);
  });

  it('refuses an invalid root after offer retirement instead of reporting readiness', () => {
    const f = stopFixture(), control = openUrlSupervisorStop(f.root, f.active), moved = `${f.root}-retired`;
    const restore = patchFs('unlinkSync', original => (file => {
      original(file);
      if (path.basename(String(file)) === path.basename(f.offer)) {
        fs.renameSync(f.root, moved);
        fs.mkdirSync(f.root, { mode: 0o700 });
      }
    }));
    try {
      expect(() => control.close()).toThrow(STOP_ERROR);
      expect(() => control.close()).toThrow(STOP_ERROR);
    } finally {
      restore();
      if (fs.existsSync(moved)) { fs.rmdirSync(f.root); fs.renameSync(moved, f.root); }
    }
  });

  it('refuses a replacement with identical bytes and never retires its name through the old handle', () => {
    const f = stopFixture(), control = openUrlSupervisorStop(f.root, f.active);
    const retired = `${f.offer}.retired`;
    fs.renameSync(f.offer, retired);
    fs.copyFileSync(retired, f.offer);
    expect(() => control.status()).toThrow(STOP_ERROR);
    expect(() => control.close()).toThrow(STOP_ERROR);
    expect(() => control.close()).toThrow(STOP_ERROR);
    expect(fs.readFileSync(f.offer)).toEqual(fs.readFileSync(retired));
  });

  it('refuses a missing or malformed offer and malformed or terminal state with fixed errors', () => {
    const f = stopFixture();
    for (const stopGeneration of ['F'.repeat(32), '0'.repeat(31), '0'.repeat(33), `${'0'.repeat(32)}\n`, undefined]) {
      const changedState = changed(f.active, { stopGeneration });
      expect(() => writeUrlSupervisorState(f.root, changedState)).toThrow('url-supervisor-state-unavailable');
      expect(() => requestUrlSupervisorStop(f.root, changedState)).toThrow(STOP_ERROR);
    }
    const control = openUrlSupervisorStop(f.root, f.active);
    const valid = fs.readFileSync(f.offer);
    const at = new Date(f.state.briefIssuedAt + 1000).toISOString();
    try {
      for (const bytes of [Buffer.alloc(10_000), Buffer.alloc(valid.length, 0x30), Buffer.concat([valid.subarray(0, -1), Buffer.of(0x32)])]) {
        fs.writeFileSync(f.offer, bytes);
        expect(() => control.status()).toThrow(STOP_ERROR);
        expect(() => requestUrlSupervisorStop(f.root, f.active)).toThrow(STOP_ERROR);
      }
      fs.writeFileSync(f.offer, valid);
      writeUrlSupervisorState(f.root, changed(f.active, { stopped: at }));
      expect(() => control.status()).toThrow(STOP_ERROR);
      expect(() => requestUrlSupervisorStop(f.root, f.active)).toThrow(STOP_ERROR);
    } finally { expect(control.close()).toBe('ready'); }
    expect(() => requestUrlSupervisorStop(f.root, f.active)).toThrow(STOP_ERROR);
  });

  it('refuses nonprivate files and aliases without replacing their targets', () => {
    const f = stopFixture(), target = path.join(f.root, 'target');
    fs.writeFileSync(target, 'Own unrelated bytes', { mode: 0o600 });
    for (const kind of ['symbolic', 'hardlink', 'private-mode'] as const) {
      if (kind === 'symbolic') fs.symlinkSync(target, f.offer);
      else if (kind === 'hardlink') fs.linkSync(target, f.offer);
      else fs.writeFileSync(f.offer, 'Own nonprivate offer', { mode: 0o640 });
      expect(() => openUrlSupervisorStop(f.root, f.active)).toThrow(STOP_ERROR);
      expect(() => requestUrlSupervisorStop(f.root, f.active)).toThrow(STOP_ERROR);
      expect(fs.readFileSync(target, 'utf8')).toBe('Own unrelated bytes');
      fs.unlinkSync(f.offer);
    }
    fs.chmodSync(f.root, 0o750);
    try { expect(() => openUrlSupervisorStop(f.root, f.active)).toThrow(STOP_ERROR); }
    finally { fs.chmodSync(f.root, 0o700); }
  });

  it('keeps an offer whose publication fails unavailable and retries persistence for a recorded request', () => {
    const f = stopFixture();
    const failPublish = failIo('linkSync');
    try { expect(() => openUrlSupervisorStop(f.root, f.active)).toThrow(STOP_ERROR); }
    finally { failPublish(); }
    expect(fs.readdirSync(f.root)).toEqual([path.basename(f.file)]);
    const control = openUrlSupervisorStop(f.root, f.active);
    try {
      const failFlush = failIo('fsyncSync');
      try { expect(() => requestUrlSupervisorStop(f.root, f.active)).toThrow(STOP_ERROR); }
      finally { failFlush(); }
      requestUrlSupervisorStop(f.root, f.active);
      expect(control.status()).toBe('requested');
    } finally { control.close(); }
  });
});
