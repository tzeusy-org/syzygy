import { execFileSync } from 'node:child_process';
import { closeSync, constants, fstatSync, openSync, readSync } from 'node:fs';
import { parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import * as path from 'node:path';
import { isRecord, sha256 } from '@syzygy/support';

/** The dossier successor is versioned separately from the PWB/provider policy.
 * Its screening predicates are preserved; its admission provenance follows D10.
 *
 * From specification version 2.6 (REQ-polaris-generation-046, adoption row A-22) every new run binds version 2.0.0, the two-stage class
 * decision. Version 1.0.0 stays committed and unedited, and stays the binding of every run whose record names it: such a run is screened
 * under it, never re-screened under 2.0.0, and a step of it that can no longer read it as its binding refuses with `restartExplanation`. */
export const DOSSIER_POLICY_PATH = '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2.json';
export const DOSSIER_POLICY_VERSION = 'dossier-declared-source/2.0.0';
export const DOSSIER_PREDECESSOR_POLICY_PATH = '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json';
export const DOSSIER_PREDECESSOR_POLICY_VERSION = 'dossier-declared-source/1.0.0';
/** The policy files a run record may bind: the one new runs bind, and the predecessor earlier runs bound. */
export const DOSSIER_POLICY_PATHS: readonly string[] = Object.freeze([DOSSIER_POLICY_PATH, DOSSIER_PREDECESSOR_POLICY_PATH]);

/** Why a step of a run bound to the predecessor refuses when it can no longer read the predecessor as its binding: both versions named,
 * the run never moved to the new one. */
export const restartExplanation = (why: string): string =>
  `this run is bound to the screening policy ${DOSSIER_PREDECESSOR_POLICY_PATH} (${DOSSIER_PREDECESSOR_POLICY_VERSION}), which can no longer be read as its binding (${why}); `
  + `a run is never re-screened under another version or moved to it, so start a new run, which binds ${DOSSIER_POLICY_PATH} (${DOSSIER_POLICY_VERSION})`;
const MAX_POLICY_BYTES = 2_097_152;

export interface PolicyBinding {
  readonly path: string;
  readonly commit: string;
  readonly policyId: string;
  readonly policyVersion: string;
  readonly sha256: string;
}

export type PolicySnapshot =
  | { readonly ok: true; readonly binding: PolicyBinding; readonly bytes: Uint8Array }
  | { readonly ok: false; readonly why: string };

/** The bytes of `relativePath` committed at this Syzygy checkout's HEAD, never the observed clone's. HEAD is captured once and the file
 * read by that commit, so a concurrent ref update cannot mix subjects; bytes in the working tree that differ from the committed ones are
 * refused rather than silently adopted. Shared by the screening policy and the derived-fact currency policy (syzygy-3efd.27). */
export function readCommittedBytes(root: string, relativePath: string): { readonly ok: true; readonly commit: string; readonly bytes: Buffer } | { readonly ok: false; readonly fault: 'commit' | 'file' | 'differs' | 'unreadable' } {
  try {
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
    env['GIT_CONFIG_NOSYSTEM'] = '1';
    env['GIT_CONFIG_GLOBAL'] = '/dev/null';
    env['GIT_OPTIONAL_LOCKS'] = '0';
    const git = (...args: string[]): Buffer => execFileSync('git', [
      '--no-replace-objects', '-C', root, ...args,
    ], { env, maxBuffer: MAX_POLICY_BYTES, timeout: 10_000, stdio: ['ignore', 'pipe', 'pipe'] });
    const commit = git('rev-parse', '--verify', 'HEAD^{commit}').toString('ascii').trim();
    if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(commit)) return { ok: false, fault: 'commit' };
    const bytes = git('show', `${commit}:${relativePath}`);
    const fd = openSync(path.join(root, relativePath), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    let current: Buffer;
    try {
      const stats = fstatSync(fd);
      if (!stats.isFile() || stats.size > MAX_POLICY_BYTES) return { ok: false, fault: 'file' };
      current = Buffer.alloc(MAX_POLICY_BYTES + 1);
      let size = 0;
      while (size < current.length) {
        const count = readSync(fd, current, size, current.length - size, null);
        if (count === 0) break;
        size += count;
      }
      current = current.subarray(0, size);
    } finally { closeSync(fd); }
    if (bytes.length > MAX_POLICY_BYTES || !bytes.equals(current)) return { ok: false, fault: 'differs' };
    return { ok: true, commit, bytes };
  } catch {
    // Git diagnostics are not content-safe output.
    return { ok: false, fault: 'unreadable' };
  }
}

/** Reads this Syzygy checkout, never the observed clone. Capture HEAD once and
 * read by that commit, so a concurrent ref update cannot mix policy subjects.
 * Uncommitted policy bytes are refused rather than silently adopted. */
export function readCommittedPolicy(root: string, relativePath: string = DOSSIER_POLICY_PATH): PolicySnapshot {
  if (!DOSSIER_POLICY_PATHS.includes(relativePath)) return { ok: false, why: 'the dossier policy path is not one a run may bind' };
  const read = readCommittedBytes(root, relativePath);
  if (!read.ok) {
    return { ok: false, why: read.fault === 'commit' ? 'the Syzygy policy commit is unreadable'
      : read.fault === 'file' ? 'the dossier policy must be a bounded regular file'
      : read.fault === 'differs' ? 'the dossier policy differs from its committed bytes; start only from a committed policy'
      : 'the committed dossier screening policy cannot be read as bounded UTF-8 JSON' };
  }
  const { commit, bytes } = read;
  try {
    const document: unknown = parseBoundedJson(new TextDecoder('utf-8', { fatal: true }).decode(bytes), { maxBytes: MAX_POLICY_BYTES, maxNodes: 65_536, maxDepth: 32 });
    if (!isRecord(document) || typeof document['policyId'] !== 'string' || !document['policyId'].trim()
      || typeof document['policyVersion'] !== 'string' || !document['policyVersion'].trim()) {
      return { ok: false, why: 'the committed dossier policy has no readable identity and version' };
    }
    return { ok: true, bytes: new Uint8Array(bytes), binding: {
      path: relativePath, commit, policyId: document['policyId'], policyVersion: document['policyVersion'], sha256: sha256(bytes),
    } };
  } catch {
    // Malformed policy bytes are not content-safe output.
    return { ok: false, why: 'the committed dossier screening policy cannot be read as bounded UTF-8 JSON' };
  }
}

export const samePolicy = (a: PolicyBinding, b: PolicyBinding): boolean =>
  a.path === b.path && a.policyId === b.policyId && a.policyVersion === b.policyVersion && a.sha256 === b.sha256;
