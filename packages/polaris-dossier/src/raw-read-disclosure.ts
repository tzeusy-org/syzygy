import { randomBytes } from 'node:crypto';
import * as fs from 'node:fs';
import path from 'node:path';
import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { decodeUtf8, isRecord } from '@syzygy/support';
import { RUN_ID, RUN_LAYOUT } from './state-directory.js';
import { assertProductFileUnchanged, snapshotProductFile } from './url-product-reads.js';

const VERSION = 'polaris-dossier-raw-read-disclosure/1';
const LIMITS = { maxBytes: 65_536, maxNodes: 16, maxDepth: 2 };
const FILE = RUN_LAYOUT.rawReadDisclosure;
export const RAW_READ_DISCLOSURE_RISK = "The dossier authoring session's own reads of the raw clone are unscreened. A secret from that clone may reach the run's declared provider.";
export const RAW_READ_DISCLOSURE_REFUSAL = 'REQ-polaris-generation-033 requires a valid raw-read disclosure before this step. Start a new run with syzygy dossier init or syzygy polaris <url>.';

export interface RawReadDisclosure {
  readonly schemaVersion: typeof VERSION;
  readonly runId: string;
  readonly declaredProvider: string;
  readonly authorHandoff: 'not-reached' | 'reached' | 'unknown';
}

function decode(bytes: Uint8Array | null, run: string, provider: string): RawReadDisclosure | null {
  const runId = path.basename(run);
  if (bytes === null || !RUN_ID.test(runId) || provider.trim() === '') return null;
  const text = decodeUtf8(bytes);
  if (text === undefined) return null;
  const value = parseBoundedJson(text, LIMITS);
  if (!isRecord(value) || Object.keys(value).length !== 4 || value['schemaVersion'] !== VERSION
    || value['runId'] !== runId || value['declaredProvider'] !== provider) return null;
  const handoff = value['authorHandoff'];
  if (handoff !== 'not-reached' && handoff !== 'reached' && handoff !== 'unknown') return null;
  return { schemaVersion: VERSION, runId, declaredProvider: provider, authorHandoff: handoff };
}

export function initialRawReadDisclosure(runId: string, declaredProvider: string): string {
  return encodeCanonicalJson({ schemaVersion: VERSION, runId, declaredProvider, authorHandoff: 'not-reached' }, LIMITS);
}

export function readRawReadDisclosure(run: string, declaredProvider: string): RawReadDisclosure | null {
  try {
    return decode(snapshotProductFile(path.resolve(run), FILE, LIMITS.maxBytes, () => {}).bytes, run, declaredProvider);
  } catch { return null; }
}

export function describeRawReadDisclosure(disclosure: RawReadDisclosure | null): {
  readonly authorHandoff: RawReadDisclosure['authorHandoff'] | 'Unknown';
  readonly label: 'Inferred' | 'Unknown';
  readonly risk: string;
  readonly uncapturedTransmissions: 'Unknown';
} {
  return {
    authorHandoff: disclosure?.authorHandoff ?? 'Unknown',
    label: disclosure === null || disclosure.authorHandoff === 'unknown' ? 'Unknown' : 'Inferred',
    risk: RAW_READ_DISCLOSURE_RISK,
    uncapturedTransmissions: 'Unknown',
  };
}

/** Replace only a valid, still-current companion at an explicit handoff. */
export function recordRawReadHandoff(runDir: string, declaredProvider: string,
  handoff: Exclude<RawReadDisclosure['authorHandoff'], 'not-reached'>): boolean {
  const run = path.resolve(runDir);
  let directory: number | undefined, temporary: string | undefined;
  try {
    const saved = snapshotProductFile(run, FILE, LIMITS.maxBytes, () => {});
    const current = decode(saved.bytes, run, declaredProvider);
    if (current === null) return false;
    if (current.authorHandoff === handoff || current.authorHandoff === 'reached') return true;
    directory = fs.openSync(run, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
    const held = fs.fstatSync(directory);
    const identity = saved.chain[0];
    if (!identity || held.dev !== identity.dev || held.ino !== identity.ino) return false;
    const anchor = `/proc/self/fd/${directory}`;
    const name = path.join(anchor, `.${FILE}.${randomBytes(16).toString('hex')}`);
    const descriptor = fs.openSync(name, 'wx', 0o600);
    temporary = name;
    try {
      fs.writeFileSync(descriptor, encodeCanonicalJson({ ...current, authorHandoff: handoff }, LIMITS));
      fs.fsyncSync(descriptor);
    } finally { fs.closeSync(descriptor); }
    assertProductFileUnchanged(run, FILE, saved, () => {});
    fs.renameSync(name, path.join(anchor, FILE));
    temporary = undefined;
    fs.fsyncSync(directory);
    return true;
  } catch { return false; }
  finally {
    if (temporary !== undefined) try { fs.unlinkSync(temporary); } catch { /* The update did not publish. */ }
    if (directory !== undefined) fs.closeSync(directory);
  }
}
