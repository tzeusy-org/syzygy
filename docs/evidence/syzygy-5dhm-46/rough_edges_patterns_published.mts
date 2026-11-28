// syzygy-5dhm.46: check that every pattern recognizer rough-edge-marker v1 runs is published verbatim, as a code span, in the proposed
// requirement text (the bead: "publish every pattern"), for the kind and in the order the code runs it (R-ROUGH-EDGES-1 F11): each comment
// pattern right after "kind `<kind>`, ", the issue patterns in precedence order, and each code pattern right after "in <Language> by ".
// Prints one line per pattern and exits 1 on any pattern the text does not carry so.
// Usage: npx tsx --conditions=source docs/evidence/syzygy-5dhm-46/rough_edges_patterns_published.mts <spec.md>
import { readFileSync } from 'node:fs';
import { CODE_PATTERNS, COMMENT_PATTERNS, ISSUE_PATTERNS } from '../../../packages/polaris-dossier/src/rough-edges-recognize.ts';

const spec = readFileSync(process.argv[2]!, 'utf8');
const src = (p: RegExp): string => p.source.replaceAll('\\/', '/');
const LANGUAGE_WORDS: Record<string, string> = { java: 'Java', python: 'Python' };
const expected: { readonly label: string; readonly span: string }[] = [
  ...COMMENT_PATTERNS.map((p) => ({ label: p.kind, span: `kind \`${p.kind}\`, \`${src(p.pattern)}\`` })),
  ...ISSUE_PATTERNS.map((p) => ({ label: 'issue-reference', span: `\`${src(p)}\`` })),
  ...Object.entries(CODE_PATTERNS).map(([language, p]) => ({ label: `code ${language}`, span: `in ${LANGUAGE_WORDS[language]} by \`${src(p!)}\`` })),
];
let missing = 0, last = -1;
for (const { label, span } of expected) {
  const at = spec.indexOf(span);
  const ok = at >= 0 && spec.indexOf(span, at + 1) < 0 && at > last;
  if (!ok) missing++;
  else last = at;
  console.log(ok ? 'published' : 'MISSING  ', label, span);
}
console.log(`${expected.length} patterns, ${missing} missing, out of order or repeated`);
process.exit(missing === 0 ? 0 : 1);
