import { constants } from 'node:fs';
import { lstat, mkdir, open, realpath, type FileHandle } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { admittedGitMemoryObjects, type GitAdmissionReceipt } from './git-memory-admission.js';
import { cloneGitDirShape, cloneStoreShape } from './clone-shape.js';
import { openPinnedObjectReader } from './git-object-reader.js';

const consumed = new WeakSet<GitAdmissionReceipt>();
const DIRECTORY = constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW;
const MAX_STORED_BYTES = 50_331_648;
export type GitMemoryStoreResult = { readonly ok: true; readonly clone: string; readonly objectCount: number;
  readonly storedBytes: number; readonly worktree: 'not-materialized'; readonly objectsReverified: true }
  | { readonly ok: false; readonly reason: 'admitted-object-store-refused'; readonly retainedClone: string | null;
    readonly storage: 'not-started' | 'metadata-only' | 'admitted-partial' };

/** This is the post-admission writer, never the wire receiver or decoder.
 * The caller owns a bounded trusted worker/process and a protected parent.
 * All source bodies must have passed the complete closure gate before this
 * module obtains its one-use receipt. No Git program, hook, filter, index or
 * original pack is used. Failures retain only metadata or admitted objects;
 * they do not pretend a partial operation was cancelled or rolled back.
 */
export async function persistAdmittedGitObjects(input: {
  readonly parent: string; readonly receipt: GitAdmissionReceipt;
  readonly current: (receipt: GitAdmissionReceipt) => boolean | Promise<boolean>;
  /** Must durably record safe receipt metadata before permitting source writes. */
  readonly audit: (receipt: GitAdmissionReceipt) => void | Promise<void>;
}): Promise<GitMemoryStoreResult> {
  let clone: string | null = null, bodyAttempted = false;
  const handles: FileHandle[] = [];
  const refused = (): GitMemoryStoreResult => ({ ok: false, reason: 'admitted-object-store-refused', retainedClone: clone,
    storage: bodyAttempted ? 'admitted-partial' : clone === null ? 'not-started' : 'metadata-only' });
  const closure = admittedGitMemoryObjects(input.receipt);
  if (!closure || consumed.has(input.receipt)) return refused();
  consumed.add(input.receipt);
  const current = input.current, audit = input.audit, receipt = input.receipt, parent = input.parent;
  const at = (directory: FileHandle, name: string): string => `/proc/self/fd/${directory.fd}/${name}`;
  const directory = async (parentHandle: FileHandle, name: string): Promise<FileHandle> => {
    await mkdir(at(parentHandle, name), { mode: 0o700 });
    const handle = await open(at(parentHandle, name), DIRECTORY); handles.push(handle); return handle;
  };
  const write = async (parentHandle: FileHandle, name: string, bytes: Uint8Array | string): Promise<void> => {
    const handle = await open(at(parentHandle, name), constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
    try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
  };
  try {
    if (typeof current !== 'function' || typeof audit !== 'function' || !path.isAbsolute(parent)
      || path.resolve(parent) !== parent || await realpath(parent) !== parent) return refused();
    const before = await lstat(parent);
    if (!before.isDirectory() || before.isSymbolicLink() || before.uid !== process.getuid?.() || (before.mode & 0o022) !== 0) return refused();
    const root = await open(parent, DIRECTORY); handles.push(root);
    const held = await root.stat();
    if (held.dev !== before.dev || held.ino !== before.ino || !(await current(receipt))) return refused();
    await audit(receipt);
    if (!(await current(receipt))) return refused();
    const name = `clone-${randomBytes(16).toString('hex')}`;
    await mkdir(at(root, name), { mode: 0o700 }); clone = path.join(parent, name);
    const owned = await open(at(root, name), DIRECTORY); handles.push(owned);
    const git = await directory(owned, '.git'), objects = await directory(git, 'objects');
    await directory(git, 'refs');
    const config = receipt.objectFormat === 'sha256'
      ? '[core]\n\trepositoryformatversion = 1\n\tbare = false\n[extensions]\n\tobjectformat = sha256\n'
      : '[core]\n\trepositoryformatversion = 0\n\tbare = false\n';
    await write(git, 'config', config);
    const fans = new Map<string, FileHandle>();
    let storedBytes = 0;
    for (const object of closure.objects) {
      if (!(await current(receipt))) return refused();
      const body = object.body;
      const header = Buffer.from(`${object.type} ${body.byteLength}\0`, 'ascii');
      if (object.size !== body.byteLength || createHash(receipt.objectFormat).update(header).update(body).digest('hex') !== object.oid) return refused();
      const encoded = deflateSync(Buffer.concat([header, body]));
      storedBytes += encoded.byteLength;
      if (storedBytes > MAX_STORED_BYTES) return refused();
      const fan = object.oid.slice(0, 2);
      let bucket = fans.get(fan);
      if (!bucket) { bucket = await directory(objects, fan); fans.set(fan, bucket); }
      bodyAttempted = true;
      await write(bucket, object.oid.slice(2), encoded);
    }
    if (!(await current(receipt))) return refused();
    await write(git, 'shallow', `${closure.commit}\n`);
    await write(git, 'HEAD', `${closure.commit}\n`);
    for (const handle of [...fans.values(), objects, git, owned, root]) await handle.sync();
    const gitDir = path.join(clone, '.git');
    if (!cloneGitDirShape(gitDir, closure.commit, { objectFormatSetting: receipt.objectFormat === 'sha256' }).ok) return refused();
    const reader = await openPinnedObjectReader({ gitDir, revision: closure.commit, maxObjectBytes: 2_097_152,
      maxInflatedBytesPerCall: 67_108_864, maxObjectsPerCall: 262_144, maxDeltaChainDepth: 64 });
    const inventory = await reader.inventory();
    if (!cloneStoreShape(gitDir, closure.commit, inventory).ok || inventory.stored !== receipt.objectCount) return refused();
    const unique = new Map(closure.paths.map(file => [file.oid, file.path]));
    await reader.readBlobs([...unique.values()]);
    if (!(await current(receipt))) return refused();
    return { ok: true, clone, objectCount: receipt.objectCount, storedBytes, worktree: 'not-materialized', objectsReverified: true };
  } catch { return refused(); }
  finally { for (const handle of handles.reverse()) try { await handle.close(); } catch { /* No cancellation or cleanup claim. */ } }
}
