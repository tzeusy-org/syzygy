// isoOf: the head module (built dist) against each base copy's exact text, over the retained instant corpus plus reviewer values.
// Usage: node iso-differential.mjs <clone> <census-base.json>
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const [clone, census] = process.argv.slice(2);
const d = await import(pathToFileURL(`${clone}/docs/evidence/syzygy-bpyt-6-3-iso/differential.mjs`).href);
const ts = createRequire(`${clone}/package.json`)('typescript');
const { isoOf } = await import(pathToFileURL(`${clone}/packages/polaris-dossier/dist/iso-of.js`).href);
const rows = JSON.parse(readFileSync(census, 'utf8')).rows.filter((r) => r.name === 'isoOf');
const members = [...rows.map((r) => ({ id: `base ${r.file}:${r.line}`, fn: d.evaluate(ts, 'isoOf', r.exactText) })), { id: 'head dist iso-of.js', fn: isoOf }];
const extra = [8.64e15 + 0.5, -8.64e15 - 0.5, 8.64e15 - 0.5, 1e300, Number.MIN_VALUE, -Number.MIN_VALUE, -0.5, 0.999, 2 ** 31, -(2 ** 31)]
  .map((n) => [String(n), n]).concat([['"1e3"', '1e3'], ['[5]', [5]], ['{valueOf:7}', { valueOf: () => 7 }], ['Symbol', Symbol('s')], ['false', false]]);
const corpus = [...d.instantNumberCorpus(), ...extra];
const groups = d.group(members, corpus);
console.log(`corpus ${d.instantNumberCorpus().length} + ${extra.length} = ${corpus.length}; members ${members.length}; groups ${groups.length}`);
for (const g of groups) console.log(`  ${g.signatureSha256} x${g.members.length}`);
for (const [l, v] of extra) console.log(`  ${l}: ${d.outcome(isoOf, v)}`);
