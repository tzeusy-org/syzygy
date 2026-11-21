import { execFile, execFileSync } from 'node:child_process';
import { closeSync, constants, fstatSync, lstatSync, openSync, readSync, type Stats } from 'node:fs';
import { parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import * as path from 'node:path';
import { isRecord, sha256 } from '@syzygy/support';
import { parseUrlParentRefs, URL_PARENT_REF_ARGS, type UrlParentAdoption } from './url-parent-adoption.js';

/** The dossier successor is versioned separately from the PWB/provider policy.
 * Its screening predicates are preserved; its admission provenance follows D10. */
export const DOSSIER_POLICY_PATH = '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json';
export const DOSSIER_URL_ORIGIN_POLICY_PATH = '.syzygy/governance/policies/POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1.json';
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
    env['GIT_NO_LAZY_FETCH'] = '1';
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

/** Both screening policies are read from the committed observing checkout. */
export function readCommittedPolicy(root: string): PolicySnapshot {
  return committedPolicy(root, DOSSIER_POLICY_PATH);
}

/** The URL origin policy has its own committed identity. */
export function readCommittedUrlOriginPolicy(root: string): PolicySnapshot {
  const snapshot = committedPolicy(root, DOSSIER_URL_ORIGIN_POLICY_PATH);
  return snapshot.ok && (snapshot.binding.policyId !== 'POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1'
    || snapshot.binding.policyVersion !== '1.0.0')
    ? { ok: false, why: 'the committed URL origin policy has an unsupported identity or version' } : snapshot;
}

function committedPolicy(root: string, policyPath: typeof DOSSIER_POLICY_PATH | typeof DOSSIER_URL_ORIGIN_POLICY_PATH): PolicySnapshot {
  const read = readCommittedBytes(root, policyPath);
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
      path: policyPath, commit, policyId: document['policyId'], policyVersion: document['policyVersion'], sha256: sha256(bytes),
    } };
  } catch {
    // Malformed policy bytes are not content-safe output.
    return { ok: false, why: 'the committed dossier screening policy cannot be read as bounded UTF-8 JSON' };
  }
}

/** Check both documents by one commit identity, bracketed by live HEAD
 * samples. The admitted commit lets the common case use one Git process. */
export function committedUrlPoliciesCurrent(root: string, base: PolicyBinding, origin: PolicyBinding, parent?: UrlParentAdoption): boolean {
  try {
    const probe = currentPolicyProbe(root, base, origin, parent);
    const refsCurrent = (): boolean => parent === undefined || probe.refsCurrent(execFileSync('git', probe.refArgs,
      { ...probe.options, stdio: ['ignore', 'pipe', 'pipe'] }));
    if (!refsCurrent()) return false;
    const read = (commit: string): boolean | string => probe.check(commit, execFileSync('git', probe.args,
      { ...probe.options, input: probe.input(commit), stdio: ['pipe', 'pipe', 'pipe'] }));
    const initial = read(base.commit);
    return (typeof initial === 'string' ? read(initial) === true : initial) && refsCurrent() && probe.workingFilesCurrent();
  } catch { return false; }
}

/** Session and audit callbacks can wait for Git while role resource samples run. */
export async function committedUrlPoliciesCurrentAsync(root: string, base: PolicyBinding, origin: PolicyBinding, parent?: UrlParentAdoption): Promise<boolean> {
  try {
    const probe = currentPolicyProbe(root, base, origin, parent);
    const runGit = (args: readonly string[], input?: string): Promise<Buffer> =>
      new Promise((resolve, reject) => {
        const child = execFile('git', args, { ...probe.options, encoding: 'buffer' }, (error, stdout) => {
          if (error) reject(error);
          else resolve(stdout);
        });
        if (input === undefined) {
          child.stdin?.destroy();
          return;
        }
        if (!child.stdin) throw new Error('current policy input');
        child.stdin.on('error', reject);
        child.stdin.end(input);
      });
    const refsCurrent = async (): Promise<boolean> =>
      parent === undefined || probe.refsCurrent(await runGit(probe.refArgs));
    if (!(await refsCurrent())) return false;
    const read = async (commit: string): Promise<boolean | string> =>
      probe.check(commit, await runGit(probe.args, probe.input(commit)));
    const initial = await read(base.commit);
    return (typeof initial === 'string' ? await read(initial) === true : initial) && await refsCurrent() && probe.workingFilesCurrent();
  } catch { return false; }
}

function currentPolicyProbe(root: string, base: PolicyBinding, origin: PolicyBinding, parent: UrlParentAdoption | undefined) {
  if (base.path !== DOSSIER_POLICY_PATH || origin.path !== DOSSIER_URL_ORIGIN_POLICY_PATH
    || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(base.commit)) throw new Error('current policy binding');
  const subjects = new Map([[base.path, base.sha256], [origin.path, origin.sha256]]);
  for (const subject of parent?.subjects ?? []) {
    const previous = subjects.get(subject.path);
    if (previous !== undefined && previous !== subject.sha256) throw new Error('conflicting URL parent binding');
    subjects.set(subject.path, subject.sha256);
  }
  const working = [...subjects].map(([file, digest]) => {
    const snapshot = readWorkingPolicy(path.join(root, file));
    if (sha256(snapshot.bytes) !== digest) throw new Error('current policy bytes');
    return snapshot;
  });
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
  Object.assign(env, { GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_OPTIONAL_LOCKS: '0', GIT_NO_LAZY_FETCH: '1' });
  const prefix = ['--no-replace-objects', '-C', root];
  const args = [...prefix, 'cat-file', '--batch-command'];
  const refArgs = [...prefix, ...URL_PARENT_REF_ARGS];
  const options = { env, maxBuffer: working.reduce((bytes, file) => bytes + file.bytes.length + 128, 4096), timeout: 10_000 };
  const head = 'info HEAD^{commit}';
  const input = (commit: string): string => [head, ...[...subjects.keys()].map(file => `contents ${commit}:${file}`), head, ''].join('\n');
  const refsCurrent = (output: Buffer): boolean => {
    const refs = parseUrlParentRefs(output);
    return refs !== null && refs.defaultCommit === parent?.defaultCommit && refs.tagObject === parent.tagObject;
  };
  const check = (commit: string, response: Buffer): boolean | string => {
    let offset = 0;
    const header = (type: 'commit' | 'blob') => {
      const end = response.indexOf(10, offset);
      if (end < 0 || end - offset > 128) throw new Error('current policy header');
      const line = response.toString('ascii', offset, end);
      const fields = /^([a-f0-9]{40}|[a-f0-9]{64}) (commit|blob) ([1-9][0-9]*)$/u.exec(line);
      const size = Number(fields?.[3]);
      if (fields?.[2] !== type || !Number.isSafeInteger(size)) throw new Error('current policy type');
      offset = end + 1;
      return { id: fields[1]!, size };
    };
    const first = header('commit').id;
    if (first !== commit) return first;
    for (const file of working) {
      const blob = header('blob'), end = offset + blob.size;
      if (blob.size > MAX_POLICY_BYTES || response[end] !== 10) return false;
      const bytes = response.subarray(offset, end);
      if (!bytes.equals(file.bytes)) return false;
      offset = end + 1;
    }
    return header('commit').id === commit && offset === response.length;
  };
  const workingFilesCurrent = (): boolean => working.every(file => sameWorkingFile(file.stats, lstatSync(file.path)));
  return { args, refArgs, options, input, check, refsCurrent, workingFilesCurrent };
}

function sameWorkingFile(initial: Stats, sample: Stats): boolean {
  return sample.isFile() && sample.dev === initial.dev && sample.ino === initial.ino
    && sample.size === initial.size && sample.mtimeMs === initial.mtimeMs && sample.ctimeMs === initial.ctimeMs;
}

function readWorkingPolicy(file: string): { path: string; bytes: Buffer; stats: Stats } {
  const fd = openSync(file, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const initial = fstatSync(fd);
    if (!initial.isFile() || initial.size < 1 || initial.size > MAX_POLICY_BYTES) throw new Error('current policy file');
    const bytes = Buffer.alloc(initial.size + 1);
    let size = 0;
    while (size < bytes.length) {
      const count = readSync(fd, bytes, size, bytes.length - size, null);
      if (count === 0) break;
      size += count;
    }
    if (size !== initial.size || !sameWorkingFile(initial, fstatSync(fd))) throw new Error('current policy changed');
    return { path: file, bytes: bytes.subarray(0, size), stats: initial };
  } finally { closeSync(fd); }
}

export const samePolicy = (a: PolicyBinding, b: PolicyBinding): boolean =>
  a.path === b.path && a.policyId === b.policyId && a.policyVersion === b.policyVersion && a.sha256 === b.sha256;
