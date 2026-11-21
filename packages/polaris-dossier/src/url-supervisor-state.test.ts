import * as fs from 'node:fs';
import path from 'node:path';
import { createRequire, syncBuiltinESMExports } from 'node:module';
import { describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { patchFs } from './fs-patch.testkit.js';
import { URL_ROLES, URL_RUN_MODE, URL_SUPPORTED_MODEL } from './url-run-record.js';
import { readUrlSupervisorState, writeUrlSupervisorState, URL_SUPERVISOR_STATE_LIMITS } from './url-supervisor-state.js';
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
function failIo(name: 'fsyncSync' | 'renameSync'): () => void {
  const builtin = createRequire(import.meta.url)('node:fs') as typeof fs;
  const original = builtin[name];
  Object.assign(builtin, { [name]: () => { throw new Error('Own IO failure with a diagnostic that must stay private'); } }); syncBuiltinESMExports();
  return () => { Object.assign(builtin, { [name]: original }); syncBuiltinESMExports(); };
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
