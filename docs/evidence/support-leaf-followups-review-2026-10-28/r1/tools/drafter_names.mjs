// Usage: node drafter_names.mjs <clone>: the drafter's identifiers (the testkit's reading, re-implemented here) against DRAFTER_IDENTIFIERS.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const clone = process.argv[2];
const ts = createRequire(`${clone}/package.json`)('typescript');
const src = readFileSync(`${clone}/packages/three-surface-poc-core/src/owner-act-drafter.ts`, 'utf8');
const names = new Set();
const visit = (node) => { if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) names.add(node.text); ts.forEachChild(node, visit); };
visit(ts.createSourceFile('d.ts', src, ts.ScriptTarget.Latest, false));
const test = readFileSync(`${clone}/packages/three-surface-poc-core/src/owner-act-drafter.test.ts`, 'utf8');
const list = [...test.match(/const DRAFTER_IDENTIFIERS = new Set\(\[([\s\S]*?)\]\);/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
console.log(JSON.stringify({ used: names.size, listed: list.length, usedNotListed: [...names].filter((n) => !list.includes(n)), listedNotUsed: list.filter((n) => !names.has(n)) }));
