// Rule 6 for huge-differential.mjs: mutate the HEAD build and confirm each predicate fails on its own.
// Usage: node huge-differential-selftest.mjs <base dist> <head dist> <node_modules dir> <scratch dir> <out.json>
// The scratch dir is created fresh (it must not exist); the head dist is copied into it with node_modules linked beside it, one
// mutation is applied to the copy, and the differential runs against it. A mutation is killed when the differential exits 1 and a
// failure it names starts with the expected prefix. The mutations are applied to the compiled JavaScript of the head build.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const [baseDist, headDist, nodeModules, scratch, out] = process.argv.slice(2);
if (out === undefined) throw new Error('usage: huge-differential-selftest.mjs <base dist> <head dist> <node_modules> <scratch> <out.json>');
if (existsSync(scratch)) throw new Error(`${scratch} exists`);

const MASK_LOOP = 'for (const pendingLine of pending)\n                    out.push(blank(pendingLine));';
const EXTRACTOR_LOOP = 'for (const item of result.items)\n            all.push(item);';
// [id, predicate, file, old, new, expected failure prefixes]
const MUTANTS = [
  ['S1', 'mask beyond: the head must not throw', 'markdown-code-context.js', MASK_LOOP, 'out.push(...pending.map(blank));', ['mask LF beyond', 'mask CRLF beyond', 'mask CR beyond']],
  ['S2', 'mask beyond: the head equals the oracle', 'markdown-code-context.js', MASK_LOOP, 'for (const pendingLine of pending.slice(0, -1))\n                    out.push(blank(pendingLine));', ['mask LF beyond']],
  ['S3', 'mask survivors: base equals head', 'markdown-code-context.js', MASK_LOOP, 'for (const pendingLine of pending)\n                    out.push(pendingLine);', ['mask LF survivor']],
  ['S4', 'extractor beyond: the head must not throw', 'project-shape-extraction.js', EXTRACTOR_LOOP, 'all.push(...result.items);', ['extractor beyond']],
  ['S5', 'extractor beyond: the head keeps every item', 'project-shape-extraction.js', EXTRACTOR_LOOP, 'for (const item of result.items.slice(0, -1))\n            all.push(item);', ['extractor beyond']],
  ['S6', 'extractor survivors: base equals head', 'project-shape-extraction.js', EXTRACTOR_LOOP, 'for (const item of result.items.slice(1))\n            all.push(item);', ['extractor survivor']],
];

const results = [];
rmSync(scratch, { recursive: true, force: true });
for (const [id, predicate, file, oldText, newText, expected] of MUTANTS) {
  const root = join(scratch, id);
  const dist = join(root, 'packages', 'three-surface-poc-core', 'dist');
  mkdirSync(dirname(dist), { recursive: true });
  cpSync(headDist, dist, { recursive: true });
  symlinkSync(resolve(nodeModules), join(root, 'node_modules'));
  const path = join(dist, file);
  const source = readFileSync(path, 'utf8');
  if (source.split(oldText).length !== 2) throw new Error(`${id}: the old fragment is not in ${file} exactly once`);
  writeFileSync(path, source.replace(oldText, () => newText));
  const outJson = join(root, 'out.json');
  let exit = 0;
  try {
    execFileSync('node', [join(here, 'huge-differential.mjs'), resolve(baseDist), dist, outJson], { stdio: ['ignore', 'ignore', 'ignore'], maxBuffer: 1 << 28 });
  } catch (error) {
    exit = error.status ?? -1;
  }
  const failures = existsSync(outJson) ? JSON.parse(readFileSync(outJson, 'utf8')).failures : [];
  const killed = exit === 1 && expected.every((prefix) => failures.some((failure) => failure.startsWith(prefix)));
  results.push({ id, predicate, file, old: oldText, new: newText, exit, failures, expectedPrefixes: expected, killed });
}
rmSync(scratch, { recursive: true, force: true });
writeFileSync(out, `${JSON.stringify({ mutants: results, killed: results.filter((r) => r.killed).length, total: results.length }, null, 1)}\n`);
console.log(JSON.stringify(results.map(({ id, predicate, exit, failures, killed }) => ({ id, predicate, exit, failures: failures.length, killed })), null, 1));
if (results.some((r) => !r.killed)) process.exit(1);
