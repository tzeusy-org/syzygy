// usage: node mustfail_match.mjs <clone> <title-census.jsonl> <vitest-json>
// For every must-fail name in the plan at the clone's HEAD, prints the reader
// titles it matches by substring (the plan test's rule: title.includes(name)
// over the it/test/each titles the census marks captured) and the vitest
// fullNames it matches by substring (the runner's rule:
// failing.includes(name) over assertionResults[].fullName). Exits 0.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const [cloneArg, censusPath, vitestPath] = process.argv.slice(2);
const clone = resolve(cloneArg);
const ts = createRequire(join(clone, 'package.json'))('typescript');
const planPath = join(clone, 'apps/three-surface-poc/src/polaris-generation/generation-mutation.ts');
const js = ts.transpileModule(readFileSync(planPath, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const plan = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const titles = readFileSync(censusPath, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.captured);
const report = JSON.parse(readFileSync(vitestPath, 'utf8'));
const fullNames = report.testResults.flatMap((f) => f.assertionResults.map((a) => a.fullName));
let names = 0;
for (const m of plan.GENERATION_LITERAL_MUTATIONS) {
  for (const name of m.mustFail) {
    names += 1;
    const t = titles.filter((r) => r.title.includes(name));
    const f = fullNames.filter((n) => n.includes(name));
    console.log(JSON.stringify({ id: m.id, name, readerTitles: t.map((r) => `${r.file.split('/').pop()}:${r.line} ${r.title}`), fullNames: f }));
  }
}
console.log(JSON.stringify({ mutations: plan.GENERATION_LITERAL_MUTATIONS.length, mustFailNames: names, capturedTitles: titles.length, fullNames: fullNames.length }));
