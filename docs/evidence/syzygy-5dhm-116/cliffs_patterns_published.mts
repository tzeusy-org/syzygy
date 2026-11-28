// syzygy-5dhm.116: every expression recognizer limit-default v1 runs is published in REQ-polaris-generation-034 v2.50's recognizer
// paragraph. For each pattern the code runs, some code span of that paragraph, compiled as a regular expression, has the same source.
// Prints one line per pattern and exits non-zero when any is missing; `--print` prints each source alone, one per line.
// Usage: npx tsx --conditions=source docs/evidence/syzygy-5dhm-116/cliffs_patterns_published.mts <spec.md> | --print
import { readFileSync } from 'node:fs';
import { LIMIT_PATTERNS } from '../../../packages/polaris-dossier/src/limits-recognize.ts';

if (process.argv[2] === '--print') {
  for (const [name, pattern] of Object.entries(LIMIT_PATTERNS)) console.log(`${name}\t${pattern.source}`);
  process.exit(0);
}
const spec = readFileSync(process.argv[2]!, 'utf8');
const start = spec.indexOf('From version 2.50 each render in the operator-agent mode SHALL also read the limits and defaults');
if (start < 0) throw new Error('the recognizer paragraph is missing');
const paragraph = spec.slice(start, spec.indexOf('\n', start));
const published = [...paragraph.matchAll(/`([^`]+)`/g)].flatMap((m) => { try { return [new RegExp(m[1]!).source]; } catch { return []; } });
let missing = 0;
for (const [name, pattern] of Object.entries(LIMIT_PATTERNS)) {
  const found = published.includes(pattern.source);
  if (!found) missing++;
  console.log(`${found ? 'published' : 'MISSING'} ${name} ${pattern.source}`);
}
console.log(`${Object.keys(LIMIT_PATTERNS).length - missing} of ${Object.keys(LIMIT_PATTERNS).length} published`);
process.exit(missing === 0 ? 0 : 1);
