import { lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { GitObjectReadRefusal, openPinnedObjectReader, type PinnedObjectReader, type PinnedObjectReaderOptions } from './git-object-reader.js';

export type UrlSourceStore = 'owned-loose' | 'supplied';
const MAX_OBJECT_BYTES = 1_048_576;
const MAX_CALL_OBJECTS = 16_384;
export const URL_STORE_ENTRY_LIMIT = 32_768;
const MAX_INDEX_BYTES = 1_048_576;

/** Whole-source provenance reads Git object paths, including spaces in names. */
export const isUrlWholeSourcePath = (value: unknown): value is string => typeof value === 'string' && value.length > 0
  && Buffer.byteLength(value) <= 4096 && !/[\\\u0000-\u001f\u007f]/u.test(value) && !value.startsWith('/')
  && value.split('/').every(part => part !== '' && part !== '.' && part !== '..');

type ReaderFactory = (options: PinnedObjectReaderOptions) => PinnedObjectReader;

const readers = new WeakSet<ReaderFactory>();

export function isBoundUrlSourceReader(value: ReaderFactory | undefined): value is ReaderFactory {
  return value !== undefined && readers.has(value);
}

function refuse(): never {
  throw new GitObjectReadRefusal('unsafe-store-entry', 'the pinned URL source binding is unavailable or no longer current');
}

function identity(directory: string): string {
  if (realpathSync(directory) !== directory) return refuse();
  const stat = lstatSync(directory, { bigint: true });
  if (!stat.isDirectory()) return refuse();
  return `${stat.dev}:${stat.ino}`;
}

/** Keep the already selected clone and full pin at each object reader boundary.
 * The role never chooses read limits, store profile, clone or pin. */
export function bindUrlSourceReader(input: {
  readonly clone: string; readonly revision: string; readonly store: UrlSourceStore;
  readonly current: () => boolean;
  readonly objectBytes?: number; readonly callObjects?: number;
}): ReaderFactory {
  const { clone, revision, store, current, objectBytes = MAX_OBJECT_BYTES, callObjects = MAX_CALL_OBJECTS } = input;
  if (!path.isAbsolute(clone) || path.resolve(clone) !== clone || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(revision)
    || (store !== 'owned-loose' && store !== 'supplied') || !Number.isSafeInteger(objectBytes) || objectBytes < 1 || objectBytes > MAX_OBJECT_BYTES
    || !Number.isSafeInteger(callObjects) || callObjects < 1 || callObjects > MAX_CALL_OBJECTS) return refuse();
  const gitDir = path.join(clone, '.git');
  const directories = [clone, gitDir, path.join(gitDir, 'objects')];
  const identities = (() => {
    try { return directories.map(identity); }
    catch { return refuse(); }
  })();
  const check = (): void => {
    try {
      if (current() === true && directories.every((directory, i) => identity(directory) === identities[i])) return;
    } catch { /* All binding faults use the same refusal. */ }
    refuse();
  };
  check();
  const factory: ReaderFactory = options => {
    check();
    if (options.gitDir !== gitDir || options.revision !== revision) return refuse();
    const reader = openPinnedObjectReader({
      gitDir, revision, looseOnly: store === 'owned-loose',
      maxObjectBytes: objectBytes, maxInflatedBytesPerCall: 8 * objectBytes,
      maxObjectsPerCall: callObjects, maxDeltaChainDepth: 64,
      maxPackIndexBytesPerCall: MAX_INDEX_BYTES, maxStoreEntriesPerCall: URL_STORE_ENTRY_LIMIT,
    });
    const checked = async <T>(read: () => Promise<T>): Promise<T> => {
      check();
      const result = await read();
      check();
      return result;
    };
    return {
      revision, algorithm: reader.algorithm,
      tree: () => checked(reader.tree), listTree: () => checked(reader.listTree),
      inventory: () => checked(reader.inventory), commitHead: () => checked(reader.commitHead),
      storedType: () => checked(reader.storedType), readBlobs: paths => checked(() => reader.readBlobs(paths)),
    };
  };
  readers.add(factory);
  return factory;
}
