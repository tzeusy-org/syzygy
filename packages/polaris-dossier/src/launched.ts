import * as fs from 'node:fs';
import * as path from 'node:path';
import { sha256 } from '@syzygy/support';
import { RUN_LAYOUT } from './state-directory.js';
import { isoOf } from './iso-of.js';

/** Launched runs (candidate REQ-polaris-generation-040 to 044; prototype under owner direction
 * POLARIS-DOSSIER-ONE-COMMAND-RUN-2026-10-14).
 *
 * A launched run is one `syzygy polaris` started: Syzygy, not the operator, starts every session. The run directory carries a marker,
 * `launched.json`, written by the supervisor right after `init`, which no session can write (each session's view holds the run directory
 * read-only or not at all). A launch record names the launch form `syzygy-launched` and what Syzygy itself did to start the session,
 * labelled Observed: the executable, the digest of the full command line, the directory, the view's digest, the process and the instant.
 * In a launched run the operator-declared forms `terminal` and `bang` are refused, and in any other run `syzygy-launched` is. */

export const LAUNCHED_FORMAT = 'polaris-dossier-launched/1';
export const LAUNCH_RECORD_FORMAT = 'polaris-dossier-launch-record/1';
export const SYZYGY_LAUNCHED = 'syzygy-launched' as const;

export interface LaunchedMarker {
  readonly format: typeof LAUNCHED_FORMAT;
  readonly runId: string;
  readonly startedAt: string;
  readonly command: 'syzygy polaris';
  readonly executionPermitted: false;
  readonly direction: 'POLARIS-DOSSIER-ONE-COMMAND-RUN-2026-10-14';
}

/** What the run directory's launched marker says, read fail-closed (syzygy-bpyt.8.8): `absent` when no file of that name exists, a run
 * the operator started; `launched` when it is the marker Syzygy writes; `unreadable` when something is there that cannot be read as that
 * marker (unreadable bytes, invalid JSON, another format, a directory, a link of any kind, a FIFO, a device, a file larger than any marker
 * when it is opened or by the time it is read).
 * No caller may treat `unreadable` more leniently than `launched`: whether Syzygy started the run's sessions cannot be told, so SEC-3's
 * instruction is never given and no launch form counts. */
export type LaunchedMarkerState = 'absent' | 'launched' | 'unreadable';

// `writeLaunchedMarker` writes a few hundred bytes; anything past this bound is not its marker.
const MARKER_BYTES_MAX = 4096;

export function launchedMarkerState(runDir: string): LaunchedMarkerState {
  const file = path.join(runDir, RUN_LAYOUT.launched);
  // Opened without following a link and without blocking, then judged by the open descriptor, so a FIFO or a device at the name can
  // neither hang nor exhaust the reader, and nothing can swap the file between the check and the read. The size the descriptor reports can
  // still grow before the read (syzygy-bpyt.8.12), so the read is bounded too: one byte past the bound is enough to refuse the file.
  let fd: number;
  try {
    fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'absent' : 'unreadable';
  }
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile() || stat.size > MARKER_BYTES_MAX) return 'unreadable';
    const bytes = Buffer.alloc(MARKER_BYTES_MAX + 1);
    let length = 0;
    while (length < bytes.length) {
      const read = fs.readSync(fd, bytes, length, bytes.length - length, null);
      if (read === 0) break;
      length += read;
    }
    if (length > MARKER_BYTES_MAX) return 'unreadable';
    const marker = JSON.parse(bytes.toString('utf8', 0, length)) as unknown;
    return typeof marker === 'object' && marker !== null && (marker as Record<string, unknown>)['format'] === LAUNCHED_FORMAT ? 'launched' : 'unreadable';
  } catch {
    return 'unreadable';
  } finally {
    fs.closeSync(fd);
  }
}

/** The kind of launch a session record must carry to count, by marker state, for a refusal's wording. */
export function expectedLaunch(state: LaunchedMarkerState): string {
  if (state === 'launched') return 'a syzygy-launched launch';
  if (state === 'absent') return 'a terminal or bang launch';
  return 'a countable launch (the run\'s launched marker is present but unreadable, so none counts)';
}

export function writeLaunchedMarker(runDir: string, runId: string, now: number): void {
  const marker: LaunchedMarker = {
    format: LAUNCHED_FORMAT, runId, startedAt: isoOf(now), command: 'syzygy polaris', executionPermitted: false,
    direction: 'POLARIS-DOSSIER-ONE-COMMAND-RUN-2026-10-14',
  };
  fs.writeFileSync(path.join(runDir, RUN_LAYOUT.launched), `${JSON.stringify(marker, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
}

/** What Syzygy did to start one session; every field Observed, because Syzygy did each itself. */
export interface LaunchObservation {
  readonly executable: string;
  readonly argv: readonly string[];
  readonly directory: string;
  readonly viewSha256: string;
  readonly pid: number | null;
  readonly startedAt: number;
}

export interface LaunchFormValue {
  readonly value: string;
  readonly declaredBy: string;
  readonly label: 'Inferred' | 'Observed';
}

/** The launch-form value of a Syzygy launch. */
export const launchedForm = (): LaunchFormValue => ({ value: SYZYGY_LAUNCHED, declaredBy: 'syzygy', label: 'Observed' });

/** Write the launch record of one session, once. `file` is the role's launch-record path inside the run directory. */
export function writeLaunchRecord(
  runDir: string, file: string, fields: { readonly role: 'inventory' | 'review'; readonly kind?: string; readonly runId: string; readonly session: number; readonly promptSha256: string },
  observed: LaunchObservation,
): string {
  const record = {
    format: LAUNCH_RECORD_FORMAT, role: fields.role, ...(fields.kind ? { kind: fields.kind } : {}), runId: fields.runId, session: fields.session,
    form: launchedForm(), promptSha256: fields.promptSha256,
    observed: {
      executable: observed.executable, argvSha256: sha256(JSON.stringify(observed.argv)), directory: observed.directory,
      viewSha256: observed.viewSha256, pid: observed.pid, startedAt: isoOf(observed.startedAt), label: 'Observed',
    },
    recordedAt: isoOf(observed.startedAt),
    label: 'Observed',
  };
  const target = path.join(runDir, file);
  fs.writeFileSync(target, `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  return target;
}

/** Whether a recorded launch form is acceptable for this run: `terminal` or `bang`, operator-declared and Inferred, in a run Syzygy did not
 * launch; `syzygy-launched`, recorded by Syzygy and Observed, in a run it did. Null when acceptable; the reason otherwise. */
export function launchFormRefusal(runDir: string, form: Readonly<Record<string, unknown>>): string | null {
  const state = launchedMarkerState(runDir);
  if (state === 'unreadable') return 'the run\'s launched marker is present but cannot be read as the one Syzygy writes, so no launch form counts, declared or syzygy-launched';
  if (state === 'launched') {
    if (form['value'] === SYZYGY_LAUNCHED && form['declaredBy'] === 'syzygy' && form['label'] === 'Observed') return null;
    return 'a launched run counts only sessions Syzygy launched (syzygy-launched, Observed)';
  }
  if ((form['value'] === 'terminal' || form['value'] === 'bang') && form['declaredBy'] === 'operator' && form['label'] === 'Inferred') return null;
  return 'a run the operator started counts only a terminal or bang launch the operator declared';
}
