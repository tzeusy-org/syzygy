// syzygy-5dhm.119: every expression recognizer doc-reference v1 runs is published in REQ-polaris-generation-034 v2.48's recognizer paragraph.
// For each pattern the code runs, some code span of that paragraph, compiled as a regular expression, has the same source and flags but
// `g`. Prints one line per pattern and exits non-zero when any is missing.
// Usage: npx tsx --conditions=source docs/evidence/syzygy-5dhm-119/docs_and_code_patterns_published.mts <spec.md>
import { readFileSync } from 'node:fs';
import { DOC_REFERENCE_PATTERNS } from '../../../packages/polaris-dossier/src/doc-references-recognize.ts';
import { TOKEN } from '../../../packages/polaris-dossier/src/doc-references.ts';

const spec = readFileSync(process.argv[2]!, 'utf8');
const start = spec.indexOf('From version 2.48 each render in the operator-agent mode SHALL also resolve the paths and identifiers');
if (start < 0) throw new Error('the recognizer paragraph is missing');
const paragraph = spec.slice(start, spec.indexOf('\n', start));
const published = [...paragraph.matchAll(/`([^`]+)`/g)].flatMap((m) => { try { return [new RegExp(m[1]!).source]; } catch { return []; } });
let missing = 0;
for (const [name, pattern] of Object.entries({ ...DOC_REFERENCE_PATTERNS, TOKEN })) {
  const found = published.includes(pattern.source);
  if (!found) missing++;
  console.log(`${found ? 'published' : 'MISSING'} ${name} ${pattern.source}`);
}
console.log(`${Object.keys(DOC_REFERENCE_PATTERNS).length + 1 - missing} of ${Object.keys(DOC_REFERENCE_PATTERNS).length + 1} published`);
process.exit(missing === 0 ? 0 : 1);
