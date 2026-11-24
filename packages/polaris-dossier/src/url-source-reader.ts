import { lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { GitObjectReadRefusal, openPinnedObjectReader, type PinnedObjectReader, type PinnedObjectReaderOptions, type VerifiedBlob } from './git-object-reader.js';

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

interface SourceReaderBinding {
  readonly clone: string; readonly revision: string; readonly store: UrlSourceStore;
  readonly current: () => boolean;
  readonly objectBytes?: number; readonly callObjects?: number;
}

/** Keep the already selected clone and full pin at each object reader boundary.
 * The role never chooses read limits, store profile, clone or pin. */
export function bindUrlSourceReader(input: SourceReaderBinding): ReaderFactory {
  return issueFactory(captureSourceReader(input));
}

function issueFactory({ check, open }: ReturnType<typeof captureSourceReader>): ReaderFactory {
  check();
  const factory: ReaderFactory = options => {
    check();
    return open(options);
  };
  readers.add(factory);
  return factory;
}

/** Host-only origin ledger port. The ledger's synchronous screen handles
 * the raw body privately. Only the result of that screen may leave the
 * bracket, after the fresh authority and named-store checks. */
export function captureUrlOriginSourceReader(input: SourceReaderBinding) {
  const captured = captureSourceReader(input);
  const { gitDir, revision, check, openPinned } = captured;
  const options = { gitDir, revision };
  let factory: ReaderFactory | undefined;
  return Object.freeze({
    open: () => (factory ??= issueFactory(captured))(options),
    async readScreenedBlob<T>(file: string, checkTime: () => void, screen: (blob: VerifiedBlob | undefined) => T): Promise<T> {
      const reader = openPinned(options);
      check();
      checkTime();
      const blob = (await reader.readBlobs([file]))[0];
      const result = screen(blob);
      check();
      return result;
    },
  });
}

/** Complete the census under one binding and one guarded descriptor walk. */
export async function listBoundUrlSourceTree(input: SourceReaderBinding): ReturnType<PinnedObjectReader['listTree']> {
  const { gitDir, revision, open } = captureSourceReader(input);
  // Keep capture private. The immediate walk checks authority and the names
  // captured above before object I/O, and samples both again on return.
  return open({ gitDir, revision }).listTree();
}

function captureSourceReader(input: SourceReaderBinding) {
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
  const openPinned: ReaderFactory = options => {
    if (options.gitDir !== gitDir || options.revision !== revision) return refuse();
    return openPinnedObjectReader({
      gitDir, revision, looseOnly: store === 'owned-loose',
      maxObjectBytes: objectBytes, maxInflatedBytesPerCall: 8 * objectBytes,
      maxObjectsPerCall: callObjects, maxDeltaChainDepth: 64,
      maxPackIndexBytesPerCall: MAX_INDEX_BYTES, maxStoreEntriesPerCall: URL_STORE_ENTRY_LIMIT,
    });
  };
  const open: ReaderFactory = options => {
    const reader = openPinned(options);
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
  return { gitDir, revision, check, open, openPinned };
}
