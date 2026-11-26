import * as fs from 'node:fs';
import * as path from 'node:path';
import { NotARegularFileError, PastBoundError, readBoundedFile } from './check-record-read.js';

/** The commit the clone has checked out (REQ-polaris-generation-033: "the clone's checked-out HEAD commit").
 *
 * HEAD and the refs it names lie within the agent sessions' write reach, so the commit read here is a claim, compared against the
 * revisions the in-force observation consent names and, once pinned, read only by object identifier with every object re-hashed
 * (git-object-reader.ts). This module reads `.git/HEAD`, at most one loose ref under `refs/heads/`, and `packed-refs`; it runs no
 * process and reads no other file. A `.git` that is a file (a gitdir pointer) or a symbolic link is refused, never followed, as the
 * object reader refuses it.
 *
 * Each of those files is read by the reader rule of version 2.10 (`readBoundedFile`, syzygy-3efd.83): one open, without blocking and
 * without following a link at the path, the type and size taken from that descriptor, and at most one byte past the bound read, so a FIFO,
 * a link or a file grown after its size was taken is refused, never read whole. The two bounds are this reader's own, stated here and in
 * no requirement yet (syzygy-nffo states them in REQ-polaris-generation-033). */

export type CloneHead =
  | { readonly ok: true; readonly commit: string; readonly via: string; readonly gitDir: string }
  | { readonly ok: false; readonly reason: string };

const MAX_REF_BYTES = 4096;
const MAX_PACKED_REFS_BYTES = 16 * 1024 * 1024;
const OBJECT_ID = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const BRANCH_REF = /^refs\/heads\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/;

function readSmall(file: string, limit: number): { readonly text: string } | { readonly reason: string } {
  try {
    return { text: readBoundedFile(file, limit, { followLink: false }).toString('utf8') };
  } catch (cause) {
    if (cause instanceof NotARegularFileError) return { reason: `${file} is not a regular file` };
    if (cause instanceof PastBoundError) return { reason: `${file} is larger than ${limit} bytes` };
    return { reason: `${file} cannot be read (${(cause as NodeJS.ErrnoException).code ?? 'unknown-error'})` };
  }
}

export function resolveCloneHead(clone: string): CloneHead {
  const gitDir = path.join(path.resolve(clone), '.git');
  let stats: fs.Stats;
  try {
    stats = fs.lstatSync(gitDir);
  } catch (cause) {
    return { ok: false, reason: `${gitDir} cannot be read (${(cause as NodeJS.ErrnoException).code ?? 'unknown-error'}); the clone must be a plain clone with a .git directory` };
  }
  if (stats.isSymbolicLink()) return { ok: false, reason: `${gitDir} is a symbolic link; it is refused, never followed` };
  if (!stats.isDirectory()) return { ok: false, reason: `${gitDir} is not a directory (a gitdir pointer is refused, never followed); use a plain clone` };

  const head = readSmall(path.join(gitDir, 'HEAD'), MAX_REF_BYTES);
  if ('reason' in head) return { ok: false, reason: head.reason };
  const line = head.text.endsWith('\n') ? head.text.slice(0, -1) : head.text;
  if (OBJECT_ID.test(line)) return { ok: true, commit: line, via: 'detached HEAD', gitDir };
  const symbolic = /^ref: (\S+)$/.exec(line);
  if (symbolic === null) return { ok: false, reason: 'HEAD is neither a full commit identifier nor a branch reference' };
  const ref = symbolic[1]!;
  if (!BRANCH_REF.test(ref) || ref.split('/').some(part => part === '.' || part === '..' || part.endsWith('.lock'))) {
    return { ok: false, reason: `HEAD names ${JSON.stringify(ref.slice(0, 200))}, which is not a branch under refs/heads/` };
  }

  const loose = path.join(gitDir, ...ref.split('/'));
  if (fs.existsSync(loose)) {
    const value = readSmall(loose, MAX_REF_BYTES);
    if ('reason' in value) return { ok: false, reason: value.reason };
    const id = value.text.endsWith('\n') ? value.text.slice(0, -1) : value.text;
    return OBJECT_ID.test(id) ? { ok: true, commit: id, via: ref, gitDir } : { ok: false, reason: `${ref} does not hold a full commit identifier` };
  }
  const packedPath = path.join(gitDir, 'packed-refs');
  if (!fs.existsSync(packedPath)) return { ok: false, reason: `HEAD names ${ref}, which has no loose file and no packed-refs entry` };
  const packed = readSmall(packedPath, MAX_PACKED_REFS_BYTES);
  if ('reason' in packed) return { ok: false, reason: packed.reason };
  const hits = packed.text.split('\n').flatMap(row => {
    const m = /^([0-9a-f]{40}|[0-9a-f]{64}) (\S+)$/.exec(row);
    return m !== null && m[2] === ref ? [m[1]!] : [];
  });
  if (hits.length !== 1) return { ok: false, reason: `packed-refs holds ${hits.length} entries for ${ref}; exactly one is required` };
  return { ok: true, commit: hits[0]!, via: ref, gitDir };
}
