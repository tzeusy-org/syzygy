// syzygy-5dhm.46: check that every pattern recognizer rough-edge-marker v1 runs is published verbatim, as a code span, in the proposed
// requirement text (the bead: "publish every pattern"). Prints one line per pattern and exits 1 on any pattern the text does not carry.
// Usage: npx tsx --conditions=source docs/evidence/syzygy-5dhm-46/rough_edges_patterns_published.mts <spec.md>
import { readFileSync } from 'node:fs';
import { CODE_PATTERNS, COMMENT_PATTERNS, ISSUE_PATTERNS } from '../../../packages/polaris-dossier/src/rough-edges-recognize.ts';

const spec = readFileSync(process.argv[2]!, 'utf8');
const sources = [...COMMENT_PATTERNS.map((p) => p.pattern), ...ISSUE_PATTERNS, ...Object.values(CODE_PATTERNS)].map((p) => p!.source.replaceAll('\\/', '/'));
let missing = 0;
for (const source of sources) {
  const found = spec.includes(`\`${source}\``);
  if (!found) missing++;
  console.log(found ? 'published' : 'MISSING  ', source);
}
console.log(`${sources.length} patterns, ${missing} missing`);
process.exit(missing === 0 ? 0 : 1);
