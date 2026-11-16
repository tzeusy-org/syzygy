// Reviewer's order check for syzygy-bpyt.1.18 (R-GP-IMPL-SPREAD-LOOPS-1). Usage: node order-check.mjs <head dist>
// Synthetic text only. A vision text with a 200,000-bullet success list and a 3-item principle list: extractSource over three classes
// must equal, item for item over the whole array, the concatenation of the three one-class results in class order, and the
// success-criterion items must have strictly increasing line numbers. Prints one JSON line; exit 1 on any failure.
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';

const dist = process.argv[2];
const { extractSource } = await import(pathToFileURL(join(dist, 'project-shape-extraction.js')).href);
const n = 200000;
const text = [
  '# Fixture', '', '## What Butlers Is', '', 'A household.', '', '## What Success Looks Like', '',
  ...Array.from({ length: n }, () => '- x'), '', '## What Butlers Is Not', '', 'Not a toy.', '', '## Non-Negotiable Rules', '',
  '1. **Fail closed** — silence is Unknown.', '2. **Cite** — every claim carries a source.', '3. **Bound** — every read is bounded.', '',
].join('\n');
const CLASSES = ['project-account-section', 'principle', 'success-criterion'];
const path = 'heart-and-soul/vision.md';
const all = extractSource({ path, extractionClasses: CLASSES }, text);
const parts = CLASSES.map((cls) => extractSource({ path, extractionClasses: [cls] }, text));
const kinds = [all.kind, ...parts.map((p) => p.kind)];
const concat = parts.flatMap((p) => (p.kind === 'extracted' ? p.items : []));
const whole = all.kind === 'extracted' && isDeepStrictEqual(all.items, concat);
const success = all.kind === 'extracted' ? all.items.filter((i) => i.class === 'success-criterion') : [];
let increasing = success.length === n;
for (let i = 1; i < success.length && increasing; i += 1) increasing = success[i].line > success[i - 1].line;
const out = { kinds, items: all.kind === 'extracted' ? all.items.length : undefined, denominators: all.denominators, wholeArrayEqualsClassConcatenation: whole, successLinesStrictlyIncreasing: increasing };
console.log(JSON.stringify(out));
process.exit(whole && increasing ? 0 : 1);
