// Which modules the product build emits that no product entry reaches: test support shipped in dist.
//
// Usage, from a checkout root: node product_reach.mjs <out.json>
// Population: every tracked non-test `.ts` module under a built project's `src/` (a project is apps/* or packages/* with a
// tsconfig.json). Edges: every static and dynamic import specifier `ts.preProcessFile` finds, resolved relatively (`.js` read as
// `.ts`, or a directory's index.ts) or, for `@syzygy/*`, through the package's `exports` `source` condition (or `main`). Entries:
// every `source` target of every workspace `exports` entry, every app's `main` read as its src module, and every module whose
// basename ends in `main.ts` (the scripts package.json and the docs run with node). A module is product when an entry reaches
// it; any other emitted module is listed with the tests that import it.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { posix } from 'node:path';

const ts = createRequire(`${process.cwd()}/package.json`)('typescript');
const tracked = execFileSync('git', ['ls-files', '-z', '--', 'apps', 'packages'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const projects = tracked.filter((p) => /^(?:apps|packages)\/[^/]+\/tsconfig\.json$/u.test(p)).map((p) => p.slice(0, -'/tsconfig.json'.length));
const manifests = new Map();
for (const p of tracked.filter((p) => /^(?:apps|packages)\/[^/]+\/package\.json$/u.test(p))) {
  const m = JSON.parse(readFileSync(p, 'utf8'));
  manifests.set(m.name, { dir: posix.dirname(p), ...m });
}
const isTest = (p) => /\.test\.ts$/u.test(p);
const all = tracked.filter((p) => /\.ts$/u.test(p) && !p.endsWith('.d.ts'));
const built = all.filter((p) => projects.some((pr) => p.startsWith(`${pr}/src/`)) && !isTest(p));

function resolveSpecifier(from, spec) {
  if (spec.startsWith('.')) {
    const base = posix.normalize(posix.join(posix.dirname(from), spec));
    for (const c of [base.replace(/\.js$/u, '.ts'), `${base}.ts`, posix.join(base, 'index.ts')]) if (existsSync(c)) return c;
    return undefined;
  }
  const match = /^(@syzygy\/[^/]+)(\/.*)?$/u.exec(spec);
  if (!match) return undefined;
  const m = manifests.get(match[1]);
  if (!m) return undefined;
  const sub = match[2] === undefined ? '.' : `.${match[2]}`;
  const entry = m.exports?.[sub];
  const target = entry === undefined ? (sub === '.' && m.main ? m.main.replace(/^\.\/dist\//u, './src/').replace(/\.js$/u, '.ts') : undefined)
    : typeof entry === 'string' ? entry.replace(/^\.\/dist\//u, './src/').replace(/\.js$/u, '.ts') : entry.source;
  return target === undefined ? undefined : posix.normalize(posix.join(m.dir, target));
}

const edges = new Map();
for (const p of all) {
  const info = ts.preProcessFile(readFileSync(p, 'utf8'), true, true);
  edges.set(p, info.importedFiles.map(({ fileName }) => resolveSpecifier(p, fileName)).filter(Boolean));
}
const entries = new Set();
for (const m of manifests.values()) {
  for (const entry of Object.values(m.exports ?? {})) if (typeof entry === 'object' && entry.source) entries.add(posix.normalize(posix.join(m.dir, entry.source)));
  if (m.main) entries.add(posix.normalize(posix.join(m.dir, m.main.replace(/^\.\/dist\//u, './src/').replace(/\.js$/u, '.ts'))));
}
for (const p of built) if (/main\.ts$/u.test(posix.basename(p))) entries.add(p);
const reached = new Set();
const pending = [...entries].filter((e) => built.includes(e));
while (pending.length) {
  const p = pending.pop();
  if (reached.has(p)) continue;
  reached.add(p);
  for (const q of edges.get(p) ?? []) if (!reached.has(q)) pending.push(q);
}
const importers = (target) => all.filter((p) => (edges.get(p) ?? []).includes(target));
const unreached = built.filter((p) => !reached.has(p)).map((p) => {
  const by = importers(p);
  return { module: p, importedByTests: by.filter(isTest).length, importedByNonTests: by.filter((q) => !isTest(q)), testOnly: by.length > 0 && by.every(isTest) };
});
const out = { built: built.length, entries: entries.size, reached: reached.size, unreached: unreached.length,
  testOnly: unreached.filter((u) => u.testOnly).length, unreachedModules: unreached };
writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
console.log(JSON.stringify({ built: out.built, entries: out.entries, reached: out.reached, unreached: out.unreached, testOnly: out.testOnly }));
for (const u of unreached) console.log(u.testOnly ? 'TEST-ONLY' : 'OTHER    ', u.module, 'tests:', u.importedByTests, 'non-tests:', u.importedByNonTests.join(',') || '-');
