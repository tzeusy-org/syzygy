// syzygy-qu5j read census. When SYZYGY_READ_CENSUS names a directory, every test file records the repository paths it
// read the content of in-process (node:fs), one JSON line per file, so scripts/check_read_census.mjs can prove pull-request selection
// would pick that file for a change to each path. Off by default; reads through a child process are not seen.
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll } from 'vitest';

const OUT = process.env['SYZYGY_READ_CENSUS'];
const ROOT = fileURLToPath(new URL('.', import.meta.url));
const INSTALLED = Symbol.for('syzygy.readCensus');
type Census = { file: string; paths: Set<string> };
const slot = globalThis as { [INSTALLED]?: Census };

const repoPath = (target: unknown): string | undefined => {
  let path: string;
  if (typeof target === 'string') path = target;
  else if (target instanceof URL && target.protocol === 'file:') path = fileURLToPath(target);
  else if (Buffer.isBuffer(target)) path = target.toString('utf8');
  else return undefined;
  const absolute = isAbsolute(path) ? path : resolve(path);
  const inside = relative(ROOT, absolute);
  if (inside === '' || inside.startsWith('..') || isAbsolute(inside)) return undefined;
  const name = inside.split(sep).join('/');
  return /(^|\/)(node_modules|dist|\.git)(\/|$)/u.test(name) ? undefined : name;
};

function install(census: Census): void {
  const wrap = (target: Record<string, unknown>, names: readonly string[]): void => {
    for (const name of names) {
      const original = target[name];
      if (typeof original !== 'function') continue;
      target[name] = function (this: unknown, first: unknown, ...rest: unknown[]) {
        const path = repoPath(first);
        if (path !== undefined) census.paths.add(path);
        return (original as (...args: unknown[]) => unknown).call(this, first, ...rest);
      };
    }
  };
  // Content reads only: a listing or an existence check depends on which files exist, not on what a change writes into one.
  // A copy reads its source (the first argument); a directory copied whole is recorded as the directory, which is no
  // tracked file. Reads inside a worker thread are not recorded: the thread has its own fs bindings.
  const READS = ['readFile', 'readFileSync', 'createReadStream', 'open', 'openSync', 'copyFile', 'copyFileSync', 'cp', 'cpSync',
    'openAsBlob'];
  wrap(fs as unknown as Record<string, unknown>, READS);
  wrap(fsPromises as unknown as Record<string, unknown>, READS);
  syncBuiltinESMExports();
}

if (OUT !== undefined && OUT !== '') {
  const file = (globalThis as { __vitest_worker__?: { filepath?: string } }).__vitest_worker__?.filepath;
  if (slot[INSTALLED] === undefined) {
    slot[INSTALLED] = { file: '', paths: new Set() };
    install(slot[INSTALLED]);
  }
  const census = slot[INSTALLED];
  census.file = file === undefined ? '' : relative(ROOT, file).split(sep).join('/');
  census.paths.clear();
  afterAll(() => {
    const line = JSON.stringify({ file: census.file, paths: [...census.paths].sort() });
    fs.mkdirSync(OUT, { recursive: true });
    fs.appendFileSync(resolve(OUT, `census-${process.pid}.jsonl`), `${line}\n`);
  });
}
