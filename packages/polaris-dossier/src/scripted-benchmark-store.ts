import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { sha256 } from '@syzygy/support';
import { PastBoundError, readPrivateBoundedFile } from './check-record-read.js';
import { viewBinds, viewSha256, type ViewSpec } from './session-view.js';
import { RUN_ID, RUN_LAYOUT } from './state-directory.js';

export type BenchmarkRefusalReason =
  | 'custody-invalid' | 'artifact-invalid' | 'artifact-exists' | 'artifact-limit'
  | 'binding-invalid' | 'screening-refused' | 'answer-changed';

export class BenchmarkRefusal extends Error {
  constructor(readonly reason: BenchmarkRefusalReason) {
    super(reason);
    this.name = 'BenchmarkRefusal';
  }
}

const RUN_RECORD_BYTES = 65_536;
const roles = ['author', 'inventory', 'fidelity', 'design'] as const;
const files = { answers: 'answers.json', grade: 'grade.json' } as const;
type StoredArtifact = keyof typeof files;
const fixtureInputs = ['questionFile', 'key', 'depth', 'tasks'] as const;
type FixtureInput = typeof fixtureInputs[number];

interface StoreInputs {
  readonly stateRoot: string;
  readonly runId: string;
  readonly runRecordSha256: string;
  readonly sourceCheckout: string;
  readonly syzygyCheckout: string;
  readonly views: readonly ViewSpec[];
  readonly inputs: Readonly<Record<FixtureInput, string>>;
}

interface PhysicalPath {
  readonly real: string;
  readonly device: bigint;
  readonly inode: bigint;
}

const codeOf = (error: unknown) => (error as NodeJS.ErrnoException).code;

function identify(path: string, optional = false): PhysicalPath | null {
  if (path !== resolve(path)) throw new BenchmarkRefusal('custody-invalid');
  try {
    // A dangling optional link is a refusal. Only absence of the bind itself is allowed.
    fs.lstatSync(path);
  } catch (error) {
    if (optional && codeOf(error) === 'ENOENT') return null;
    throw error;
  }
  const real = fs.realpathSync(path);
  const stat = fs.statSync(real, { bigint: true });
  return { real, device: stat.dev, inode: stat.ino };
}

function within(child: string, parent: string): boolean {
  const suffix = relative(parent, child);
  return !isAbsolute(suffix) && suffix !== '..' && !suffix.startsWith('..' + sep);
}

const overlap = (left: string, right: string) => within(left, right) || within(right, left);

function privateDirectory(path: string): PhysicalPath {
  const stat = fs.lstatSync(path);
  const physical = identify(path);
  if (physical?.real !== path || !stat.isDirectory() || (stat.mode & 0o077) !== 0) {
    throw new BenchmarkRefusal('custody-invalid');
  }
  return physical;
}

function mkdirPrivate(path: string): PhysicalPath {
  try {
    fs.mkdirSync(path, { mode: 0o700 });
  } catch (error) {
    if (codeOf(error) !== 'EEXIST') throw error;
  }
  return privateDirectory(path);
}

function inDirectory<T>(directory: PhysicalPath, operation: (relativeRoot: string, fd: number) => T): T {
  const flags = fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW;
  const fd = fs.openSync(directory.real, flags);
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    if (opened.dev !== directory.device || opened.ino !== directory.inode || (opened.mode & 0o077n) !== 0n) {
      throw new BenchmarkRefusal('custody-invalid');
    }
    // Fixture views use Linux. The directory descriptor pins the parent for every leaf operation.
    return operation(`/proc/self/fd/${fd}`, fd);
  } finally {
    fs.closeSync(fd);
  }
}

function samePhysicalPath(before: PhysicalPath | null, after: PhysicalPath | null): boolean {
  return before?.real === after?.real && before?.device === after?.device && before?.inode === after?.inode;
}

function assertCustody(check: () => void): void {
  try {
    check();
  } catch {
    throw new BenchmarkRefusal('custody-invalid');
  }
}

export interface BenchmarkStore {
  readonly directory: string;
  readInput(input: FixtureInput, limit: number): Buffer;
  readStored(artifact: StoredArtifact, limit: number): Buffer | undefined;
  publish(artifact: StoredArtifact, bytes: Buffer, limit: number): void;
}

/** The evaluator's own fixture roots, alongside the associated ordinary run. */
export function prepareBenchmarkStore(input: StoreInputs): BenchmarkStore {
  try {
    return makeStore(input);
  } catch {
    throw new BenchmarkRefusal('custody-invalid');
  }
}

function makeStore(input: StoreInputs): BenchmarkStore {
  if (!RUN_ID.test(input.runId) || input.views.length !== roles.length
    || roles.some(role => input.views.filter(view => view.role === role).length !== 1)) {
    throw new BenchmarkRefusal('custody-invalid');
  }
  const state = privateDirectory(input.stateRoot);
  const run = privateDirectory(join(state.real, input.runId));
  const benchmarkPath = join(state.real, 'benchmark');
  const companionPath = join(benchmarkPath, input.runId);
  const privateInputs = new Map(fixtureInputs.map(name => {
    const path = input.inputs[name];
    const directory = privateDirectory(dirname(path));
    const physical = identify(path, true);
    if (physical !== null && physical.real !== path) throw new BenchmarkRefusal('custody-invalid');
    return [name, { directory, path }];
  }));
  const readPaths = [...privateInputs.values()].map(({ path }) => path);
  const inputDirectories = [...privateInputs.values()].map(({ directory }) => directory);
  const viewDigests = input.views.map(viewSha256);
  const mounted = [
    { path: input.sourceCheckout, optional: false }, { path: input.syzygyCheckout, optional: false },
    ...input.views.flatMap(view => viewBinds(view).map(bind => ({ path: bind.path, optional: bind.option === '--ro-bind-try' }))),
  ].map(mount => ({ ...mount, expected: identify(mount.path, mount.optional) }));
  const protectedPaths = [companionPath, ...readPaths, ...inputDirectories.map(path => path.real)];
  if (new Set(readPaths).size !== readPaths.length || protectedPaths.some(path => overlap(path, run.real))
    || inputDirectories.some(directory => overlap(directory.real, companionPath))
    || mounted.some(({ expected }) => expected !== null && protectedPaths.some(path => overlap(path, expected.real)))) {
    throw new BenchmarkRefusal('custody-invalid');
  }
  const checkRun = () => inDirectory(run, root => {
    const bytes = readPrivateBoundedFile(join(root, RUN_LAYOUT.config), RUN_RECORD_BYTES);
    if (sha256(bytes) !== input.runRecordSha256) throw new BenchmarkRefusal('custody-invalid');
  });
  checkRun();
  const benchmarkRoot = mkdirPrivate(benchmarkPath);
  const companion = mkdirPrivate(companionPath);
  const check = () => assertCustody(() => {
    if (input.views.length !== roles.length || input.views.some((view, index) => viewSha256(view) !== viewDigests[index])) {
      throw new BenchmarkRefusal('custody-invalid');
    }
    for (const path of [state, run, benchmarkRoot, companion, ...inputDirectories]) {
      if (!samePhysicalPath(path, privateDirectory(path.real))) throw new BenchmarkRefusal('custody-invalid');
    }
    checkRun();
    for (const { path, optional, expected } of mounted) {
      if (!samePhysicalPath(expected, identify(path, optional))) throw new BenchmarkRefusal('custody-invalid');
    }
  });

  const read = (directory: PhysicalPath, name: string, limit: number, missing: 'refuse' | 'allow'): Buffer | undefined => {
    check();
    try {
      return inDirectory(directory, root => readPrivateBoundedFile(join(root, name), limit));
    } catch (error) {
      if (missing === 'allow' && codeOf(error) === 'ENOENT') return undefined;
      if (error instanceof PastBoundError) throw new BenchmarkRefusal('artifact-limit');
      if (error instanceof BenchmarkRefusal) throw error;
      throw new BenchmarkRefusal('artifact-invalid');
    }
  };

  return {
    directory: companion.real,
    readInput(name, limit) {
      const { directory, path } = privateInputs.get(name)!;
      return read(directory, basename(path), limit, 'refuse')!;
    },
    readStored: (artifact, limit) => read(companion, files[artifact], limit, 'allow'),
    publish(artifact, bytes, limit) {
      if (bytes.length > limit) throw new BenchmarkRefusal('artifact-limit');
      check();
      try {
        inDirectory(companion, (root, directory) => {
          const staging = join(root, `.pending-${randomUUID()}`);
          const fd = fs.openSync(staging, 'wx', 0o600);
          try {
            try {
              fs.writeFileSync(fd, bytes);
              fs.fsyncSync(fd);
            } finally {
              fs.closeSync(fd);
            }
            fs.linkSync(staging, join(root, files[artifact]));
          } finally {
            fs.unlinkSync(staging);
          }
          fs.fsyncSync(directory);
        });
      } catch (error) {
        if (error instanceof BenchmarkRefusal) throw error;
        throw new BenchmarkRefusal(codeOf(error) === 'EEXIST' ? 'artifact-exists' : 'artifact-invalid');
      }
    },
  };
}
