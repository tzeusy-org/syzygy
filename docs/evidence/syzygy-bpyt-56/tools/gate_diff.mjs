// syzygy-bpyt.56: what the observer-input gate refuses before and after, path by path.
// Usage, from the root of a clean Syzygy checkout: node docs/evidence/syzygy-bpyt-56/tools/gate_diff.mjs <base commit> <head commit> > record.json
// Each side's pocObserverInputsAreClean is read from `git show <commit>:apps/three-surface-poc/src/git-observation.ts` (the text from
// its `export function` line to the first line that is `}`), transpiled by TypeScript and evaluated alone. The population is every path
// `git ls-files` lists at the head commit, plus, for each apps/* and packages/* directory there, a manifest, a tsconfig, an untracked
// module, a sibling that only shares the name's start and a docs/<dir>/a.ts path that carries the name after its first segment, and
// scripts/clean_build.mjs.bak: the population git-observation.test.ts uses.
// The record lists every path the head refuses and the base accepts, and every path the base refuses and the head accepts.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const [base, head] = process.argv.slice(2).map((commit) => execFileSync('git', ['rev-parse', `${commit}^{commit}`], { encoding: 'utf8' }).trim());
const FILE = 'apps/three-surface-poc/src/git-observation.ts';
function gate(commit) {
  const text = execFileSync('git', ['show', `${commit}:${FILE}`], { encoding: 'utf8' });
  const start = text.indexOf('export function pocObserverInputsAreClean(');
  const end = text.indexOf('\n}\n', start);
  if (start < 0 || end < 0) throw new Error(`${commit}: no pocObserverInputsAreClean`);
  const source = text.slice(start, end + 3).replace('export function', 'function');
  const js = ts.transpileModule(`${source}\nreturn pocObserverInputsAreClean;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return { fn: new Function(js)(), sha256: createHash('sha256').update(source).digest('hex') };
}
const tracked = execFileSync('git', ['ls-tree', '-r', '-z', '--name-only', head], { encoding: 'utf8', maxBuffer: 1 << 26 }).split('\0').filter(Boolean);
const workspaces = [...new Set(tracked.filter((p) => /^(?:apps|packages)\/[^/]+\/package\.json$/u.test(p)).map((p) => p.slice(0, -'/package.json'.length)))].sort();
const probes = [...workspaces.flatMap((dir) => [`${dir}/package.json`, `${dir}/tsconfig.json`, `${dir}/src/__untracked__.ts`, `${dir}x/a.ts`, `docs/${dir}/a.ts`]), 'scripts/clean_build.mjs.bak'];
const population = [...new Set([...tracked, ...probes])].sort();
const b = gate(base), h = gate(head);
const refused = (g, path) => !g.fn({ changedPaths: [path] });
const newlyRefused = population.filter((p) => refused(h, p) && !refused(b, p));
const newlyAccepted = population.filter((p) => refused(b, p) && !refused(h, p));
const byTop = (paths) => Object.fromEntries([...new Set(paths.map((p) => p.split('/').slice(0, 2).join('/')))].sort().map((d) => [d, paths.filter((p) => p.startsWith(`${d}/`)).length]));
console.log(JSON.stringify({
  subject: 'pocObserverInputsAreClean, base against head, one changed path at a time',
  tool: { path: 'docs/evidence/syzygy-bpyt-56/tools/gate_diff.mjs', sha256: createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex') },
  base: { commit: base, functionSha256: b.sha256, refused: population.filter((p) => refused(b, p)).length },
  head: { commit: head, functionSha256: h.sha256, refused: population.filter((p) => refused(h, p)).length },
  population: { total: population.length, tracked: tracked.length, probes: probes.length, workspaces: workspaces.length },
  newlyRefused: { count: newlyRefused.length, tracked: newlyRefused.filter((p) => tracked.includes(p)).length, byDirectory: byTop(newlyRefused), paths: newlyRefused },
  newlyAccepted: { count: newlyAccepted.length, paths: newlyAccepted },
}, null, 1));
