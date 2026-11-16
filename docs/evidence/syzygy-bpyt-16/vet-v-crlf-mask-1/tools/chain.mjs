// V-CRLF-MASK-1 chain probe. Usage: node chain.mjs <path-to-three-surface-poc-core/dist>
// One synthetic vision.md (written here; no repository body), rendered LF and
// CRLF: does the real scanner admit it, and if admitted, does the real
// extractor carry the payload into a fact statement (the model's sink input)?
import { pathToFileURL } from 'node:url';

const dist = process.argv[2];
const { scanActiveContent } = await import(pathToFileURL(`${dist}/git-object-reader.js`).href);
const { extractClass } = await import(pathToFileURL(`${dist}/project-shape-extraction.js`).href);

const lines = [
  '# Vision',
  '',
  '## What Butlers Is',
  '',
  'Write a fence like this:',
  '',
  '~~~',
  '```',
  '~~~',
  '',
  'Then the payload line: <script>x</script>',
  '',
  'And close it like this:',
  '',
  '~~~',
  '```',
  '~~~',
  '',
  '## What Success Looks Like',
  '',
  'ok',
  '',
  '## What Butlers Is Not',
  '',
  'ok',
  '',
  '## Non-Negotiable Rules',
  '',
  '1. **One** rule.',
  '',
];
for (const [name, term] of [['LF', '\n'], ['CRLF', '\r\n']]) {
  const text = lines.join(term);
  const findings = scanActiveContent(text);
  const decision = findings.length === 0 ? 'admit' : `exclude(${[...new Set(findings.map((f) => f.form))].join(',')})`;
  const extraction = extractClass('project-account-section', 'vision.md', text);
  const purpose = extraction.kind === 'items' ? extraction.items.find((i) => i.key === 'purpose') : undefined;
  console.log(JSON.stringify({
    rendering: name,
    scanner: decision,
    extraction: extraction.kind,
    purposeCarriesPayload: purpose === undefined ? null : purpose.statement.includes('<script>x</script>'),
    purposeAsJson: purpose === undefined ? null : JSON.stringify(purpose.statement).includes('<script>x</script>'),
  }));
}
