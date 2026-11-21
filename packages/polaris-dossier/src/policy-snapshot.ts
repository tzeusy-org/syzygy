import { execFileSync } from 'node:child_process';
import { closeSync, constants, fstatSync, openSync, readSync } from 'node:fs';
import { parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import * as path from 'node:path';
import { isRecord, sha256 } from '@syzygy/support';

/** The dossier successor is versioned separately from the PWB/provider policy.
 * Its screening predicates are preserved; its admission provenance follows D10. */
export const DOSSIER_POLICY_PATH = '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json';
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
export function readCommittedPolicy(root: string): PolicySnapshot {
  const read = readCommittedBytes(root, DOSSIER_POLICY_PATH);
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
      path: DOSSIER_POLICY_PATH, commit, policyId: document['policyId'], policyVersion: document['policyVersion'], sha256: sha256(bytes),
    } };
  } catch {
    // Malformed policy bytes are not content-safe output.
    return { ok: false, why: 'the committed dossier screening policy cannot be read as bounded UTF-8 JSON' };
  }
}

export const samePolicy = (a: PolicyBinding, b: PolicyBinding): boolean =>
  a.path === b.path && a.policyId === b.policyId && a.policyVersion === b.policyVersion && a.sha256 === b.sha256;
