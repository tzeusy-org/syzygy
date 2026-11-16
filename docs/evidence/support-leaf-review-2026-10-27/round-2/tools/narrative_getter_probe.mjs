// N7 completeness: a throw raised mid-walk by something other than Object.freeze (a throwing getter, a Proxy trap).
// The old variant's body is taken from the committed blob (polaris-narrative.ts at a088f1ca, lines 133-136, checked
// verbatim); the package side is the built @syzygy/support of the clone. Usage: node narrative_getter_probe.mjs <repo> <built clone>
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const [repo, clone] = process.argv.slice(2);
const blob = execFileSync('git', ['-C', repo, 'show', 'a088f1caf061c1a2062527ce8521c9b64c3c7fd1:apps/three-surface-poc/src/polaris-narrative.ts'], { encoding: 'utf8' });
const lines = blob.split('\n').slice(132, 136).join('\n');
const want = "  if (value !== null && typeof value === 'object') {\n    for (const inner of Object.values(value as Record<string, unknown>)) deepFreeze(inner);\n    Object.freeze(value);\n  }";
if (lines !== want) throw new Error('old body not found verbatim at lines 133-136');
const oldFreeze = new Function('value', `function deepFreeze(value) {\n${lines.replace(' as Record<string, unknown>', '')}\n  return value;\n}\nreturn deepFreeze(value);`);
const { deepFreeze } = await import(pathToFileURL(join(clone, 'packages/support/dist/index.js')).href);
// The Proxy itself is left out of the frozen census: Object.isFrozen on it would run the trap.
const cases = {
  'a sibling, then a getter that throws': () => { const a = {}; const v = { a, get b() { throw new Error('getter'); } }; return { v, all: [v, a] }; },
  'a Proxy whose ownKeys trap throws, beside a sibling': () => { const a = {}; const p = new Proxy({}, { ownKeys() { throw new Error('trap'); } }); const v = { a, p }; return { v, all: [v, a] }; },
};
const rows = [];
for (const [name, make] of Object.entries(cases)) {
  const row = { case: name };
  for (const [label, fn] of [['old', oldFreeze], ['package', deepFreeze]]) {
    const { v, all } = make();
    let threw = null;
    try { fn(v); } catch (e) { threw = `${e.name}: ${String(e.message).split('\n')[0]}`; }
    row[label] = { threw, frozen: all.filter((o) => Object.isFrozen(o)).length, objects: all.length };
  }
  rows.push(row);
}
console.log(JSON.stringify({ node: process.version, rows }, null, 1));
