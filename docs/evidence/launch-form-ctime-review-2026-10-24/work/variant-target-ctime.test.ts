import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { patchFs } from './fs-patch.testkit.js';
import { expectedLaunch, launchFormRefusal, launchedMarkerState, writeLaunchedMarker } from './launched.js';

// syzygy-bpyt.8.8: the launched marker is read fail-closed. Only a missing file means a run the operator started; anything present that is
// not the marker Syzygy writes is `unreadable`, and no caller treats that more leniently than a launched run. Expected values are literals.

const cleanups: (() => void)[] = [];
afterEach(() => { for (const cleanup of cleanups.splice(0).reverse()) cleanup(); });
const runDir = (): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'polaris-marker-'));
  cleanups.push(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
};
const marker = (dir: string): string => path.join(dir, 'launched.json');
/** The marker's bytes typed by hand, so the reader and the writer cannot drift together. */
const TYPED = '{\n  "format": "polaris-dossier-launched/1",\n  "runId": "run-x",\n  "startedAt": "2026-10-21T00:00:00.000Z",\n  "command": "syzygy polaris",\n  "executionPermitted": false,\n  "direction": "POLARIS-DOSSIER-ONE-COMMAND-RUN-2026-10-14"\n}\n';
const PREFIX = '{"format": "polaris-dossier-launched/1", "pad": "';
/** A marker of the right format, exactly `bytes` long; its last byte is a newline, so the bytes before it are the marker too. */
const padded = (bytes: number): string => `${PREFIX}${'x'.repeat(bytes - PREFIX.length - 3)}"}\n`;
/** A FIFO holding the marker's bytes, kept open by a reader of the test's own so the bytes stay in the pipe. */
const fifoHoldingTheMarker = (dir: string): void => {
  execFileSync('mkfifo', [marker(dir)]);
  const keep = fs.openSync(marker(dir), fs.constants.O_RDONLY | fs.constants.O_NONBLOCK);
  cleanups.push(() => fs.closeSync(keep));
  const writer = fs.openSync(marker(dir), fs.constants.O_WRONLY | fs.constants.O_NONBLOCK);
  fs.writeSync(writer, TYPED);
  fs.closeSync(writer);
};
/** What the test sees of a run's marker without asking the reader: its lstat (mode, inode, size, change time), a link's target, and the
 * bytes of a regular file the test can read, followed through a link. It opens no FIFO or device, so it drains no pipe. Times are left
 * out except the change time: a read moves the access time, and nothing that leaves the marker as it was moves the change time. */
const markerSnapshot = (dir: string): Readonly<Record<string, unknown>> | null => {
  const stat = fs.lstatSync(marker(dir), { bigint: true, throwIfNoEntry: false });
  if (stat === undefined) return null;
  let bytes: string | null = null;
  if (fs.statSync(marker(dir), { throwIfNoEntry: false })?.isFile()) {
    try { bytes = fs.readFileSync(marker(dir)).toString('base64'); } catch { bytes = null; }
  }
  const followed = stat.isSymbolicLink() ? fs.statSync(marker(dir), { bigint: true, throwIfNoEntry: false }) : undefined;
  return {
    mode: stat.mode, ino: stat.ino, size: stat.size, ctimeNs: stat.ctimeNs, link: stat.isSymbolicLink() ? fs.readlinkSync(marker(dir)) : null, bytes,
    targetCtimeNs: followed?.isFile() ? followed.ctimeNs : null,
  };
};

const PRESENT_BUT_NOT_THE_MARKER: readonly [string, (dir: string) => void][] = [
  ['an empty file', (dir) => fs.writeFileSync(marker(dir), '')],
  ['invalid JSON', (dir) => fs.writeFileSync(marker(dir), '{"format": "polaris-dossier-launched/1"')],
  ['JSON null', (dir) => fs.writeFileSync(marker(dir), 'null')],
  ['a JSON array', (dir) => fs.writeFileSync(marker(dir), '[]')],
  ['a JSON string', (dir) => fs.writeFileSync(marker(dir), '"polaris-dossier-launched/1"')],
  ['another format', (dir) => fs.writeFileSync(marker(dir), '{"format": "polaris-dossier-launched/2"}')],
  ['no format', (dir) => fs.writeFileSync(marker(dir), '{"runId": "run-x"}')],
  ['a format that is not a string', (dir) => fs.writeFileSync(marker(dir), '{"format": 1}')],
  ['a byte-order mark before the marker', (dir) => fs.writeFileSync(marker(dir), '\uFEFF{"format": "polaris-dossier-launched/1"}')],
  ['a directory', (dir) => fs.mkdirSync(marker(dir))],
  ['a dangling symbolic link', (dir) => fs.symlinkSync(path.join(dir, 'nowhere.json'), marker(dir))],
  ['a symbolic link to the marker Syzygy writes', (dir) => { fs.mkdirSync(path.join(dir, 'elsewhere')); writeLaunchedMarker(path.join(dir, 'elsewhere'), 'run-x', Date.UTC(2026, 9, 21)); fs.symlinkSync(path.join(dir, 'elsewhere', 'launched.json'), marker(dir)); }],
  ['a symbolic link to a character device', (dir) => fs.symlinkSync('/dev/zero', marker(dir))],
  ['a FIFO', (dir) => execFileSync('mkfifo', [marker(dir)])],
  ['a FIFO holding the marker\'s bytes', fifoHoldingTheMarker],
  ['a marker of 4097 bytes, one past the bound', (dir) => fs.writeFileSync(marker(dir), padded(4097))],
  ['a file its reader may not read', (dir) => { fs.writeFileSync(marker(dir), '{"format": "polaris-dossier-launched/1"}'); fs.chmodSync(marker(dir), 0o000); }],
];

describe('launchedMarkerState', () => {
  it('is absent when no file of that name exists, and when the run directory itself is missing', () => {
    const dir = runDir();
    expect(launchedMarkerState(dir)).toBe('absent');
    expect(launchedMarkerState(path.join(dir, 'missing-run'))).toBe('absent');
  });

  it('is launched for the marker Syzygy writes', () => {
    const dir = runDir();
    writeLaunchedMarker(dir, 'run-x', Date.UTC(2026, 9, 21));
    expect(launchedMarkerState(dir)).toBe('launched');
  });

  it('is launched for the marker\'s bytes typed by hand, so the reader and the writer cannot drift together', () => {
    const dir = runDir();
    fs.writeFileSync(marker(dir), TYPED);
    expect(launchedMarkerState(dir)).toBe('launched');
  });

  it('is launched for a marker of exactly 4096 bytes, the bound', () => {
    const dir = runDir();
    fs.writeFileSync(marker(dir), padded(4096));
    expect(fs.statSync(marker(dir)).size).toBe(4096);
    expect(launchedMarkerState(dir)).toBe('launched');
  });

  it.each(PRESENT_BUT_NOT_THE_MARKER)('is unreadable for %s', (_name, plant) => {
    const dir = runDir();
    plant(dir);
    expect(launchedMarkerState(dir)).toBe('unreadable');
  });

  it('is unreadable when the run directory is a file', () => {
    const dir = runDir();
    fs.writeFileSync(path.join(dir, 'not-a-run'), '');
    expect(launchedMarkerState(path.join(dir, 'not-a-run'))).toBe('unreadable');
  });

  // syzygy-bpyt.8.12 (R-GP-IMPL-LAUNCHED-MARKER-2 R2-N1): the bound holds on the bytes read as well as on the size the descriptor reports.
  // Each case rewrites the file in place right after the reader's first call of one fs function returns, as a writer racing it could.
  it.each<[string, 'fstatSync' | 'readSync', string, string]>([
    ['grows after it is measured into a marker of exactly 4097 bytes, which only the bound on the read refuses', 'fstatSync', PREFIX, padded(4097)],
    ['shrinks after it is measured from 4097 bytes into the marker, which only the bound on the measured size refuses', 'fstatSync', padded(4097), TYPED],
    ['grows past 4096 bytes between two reads, the first of which held the whole marker', 'readSync', TYPED, `${TYPED}${' '.repeat(4096)}`],
  ])('is unreadable for a marker that %s', (_name, call, before, after) => {
    const dir = runDir();
    fs.writeFileSync(marker(dir), before);
    let rewritten = false;
    cleanups.push(patchFs(call, (original) => ((...args: unknown[]) => {
      const result = (original as (...a: unknown[]) => unknown)(...args);
      if (!rewritten) { rewritten = true; fs.writeFileSync(marker(dir), after); }
      return result;
    }) as never));
    // The race is asserted staged before the state is judged, so a reader that never makes the patched call fails here, not on the state.
    const state = launchedMarkerState(dir);
    expect(rewritten).toBe(true);
    expect(state).toBe('unreadable');
    expect(fs.statSync(marker(dir)).size).toBe(Buffer.byteLength(after));
  });
});

describe('launch forms in a run whose marker is unreadable', () => {
  it.each(PRESENT_BUT_NOT_THE_MARKER)('count neither a declared form nor a syzygy-launched one: %s', (_name, plant) => {
    // Each form is asked of a run planted afresh, so a reader that drains a FIFO on one form cannot leave the next an empty pipe.
    const planted = (): string => { const dir = runDir(); plant(dir); return dir; };
    // Each ask must leave the marker as the test saw it before the ask, by a snapshot that asks no reader, and the run unreadable. So a
    // reader that removes, replaces or truncates an unreadable marker cannot pass here, whatever it remembers. The snapshot reads no
    // FIFO's bytes and cannot read an unreadable file's, so a reader that only drains a pipe still passes.
    const asked = (form: Readonly<Record<string, unknown>>): string | null => {
      const dir = planted();
      const before = markerSnapshot(dir);
      const reason = launchFormRefusal(dir, form);
      expect(markerSnapshot(dir)).toEqual(before);
      expect(launchedMarkerState(dir)).toBe('unreadable');
      return reason;
    };
    const refusal = 'the run\'s launched marker is present but cannot be read as the one Syzygy writes, so no launch form counts, declared or syzygy-launched';
    expect(asked({ value: 'terminal', declaredBy: 'operator', label: 'Inferred' })).toBe(refusal);
    expect(asked({ value: 'bang', declaredBy: 'operator', label: 'Inferred' })).toBe(refusal);
    expect(asked({ value: 'syzygy-launched', declaredBy: 'syzygy', label: 'Observed' })).toBe(refusal);
  });

  it('name what a counted record must carry, by marker state', () => {
    expect(expectedLaunch('launched')).toBe('a syzygy-launched launch');
    expect(expectedLaunch('absent')).toBe('a terminal or bang launch');
    expect(expectedLaunch('unreadable')).toBe('a countable launch (the run\'s launched marker is present but unreadable, so none counts)');
  });
});
