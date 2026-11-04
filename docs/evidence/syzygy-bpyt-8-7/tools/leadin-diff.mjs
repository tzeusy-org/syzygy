// Differential: the render's lead-in span reader (quote-locate scanLeadIns) against the check's quotedSpans (quote-fidelity).
// node leadin-diff.mjs <tree> <scratch>; deterministic PRNG, prints counts and the first examples.
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
const [tree, scratch] = process.argv.slice(2);
const dist = path.join(tree, 'packages/polaris-generation-core/dist');
let src = fs.readFileSync(path.join(dist, 'quote-fidelity.js'), 'utf8');
src = src.replace(/from '\.\/([^']+)'/g, (_, f) => `from '${pathToFileURL(path.join(dist, f)).href}'`).replace(/from '@syzygy\/support'/g, `from '${pathToFileURL(path.join(tree, 'packages/support/dist/index.js')).href}'`) + '\nexport { quotedSpans as __quotedSpans };\n';
fs.writeFileSync(path.join(scratch, 'qf-copy.mjs'), src);
const qf = await import(pathToFileURL(path.join(scratch, 'qf-copy.mjs')).href);
const ql = await import(pathToFileURL(path.join(dist, 'quote-locate.js')).href);
const L = 'The project states:';
const atoms = [L, ' ', '"', '“', '”', 'a', 'b ', ' x '];
let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
let passing = 0, passingDiff = 0, passingRenderExtra = 0, passingCurlyOnly = 0; let n = 0, renderNotChecked = 0, leadInMismatch = 0; const examples = [];
for (let k = 0; k < 200000; k++) {
  const len = 1 + Math.floor(rnd() * 9); let t = '';
  for (let j = 0; j < len; j++) t += atoms[Math.floor(rnd() * atoms.length)];
  if (!t.includes(L)) continue; n++;
  const spans = qf.__quotedSpans(t, L, () => true);
  const renderSpans = ql.leadInQuotationSpans(t, L);
  for (const r of renderSpans) if (!spans.some(s => s.terminated && s.end === r.close && s.inner === r.inner)) { renderNotChecked++; if (examples.length < 6) examples.push({ kind: 'render-span-not-a-check-span', text: t, render: r, check: spans }); break; }
  const checkPasses = spans.every(s => s.terminated && qf.normaliseForQuote(s.inner).length > 0) && !qf.inspectBlockQuotes({ id: 'b', text: t, sourceIds: [] }, new Map(), L).findings.some(f => f.kind === 'lead-in-without-quote');
  if (checkPasses) { if (renderSpans.some(r => !spans.some(s => s.terminated && s.end === r.close && s.inner === r.inner))) { passingRenderExtra++; if (examples.filter(e => e.kind === 'extra').length < 3) examples.push({ kind: 'extra', text: t, renderSpans, check: spans }); } if (!t.includes('"')) passingCurlyOnly++; passing++; const a = JSON.stringify(renderSpans.map(r => [r.close, r.inner])); const b = JSON.stringify(spans.filter(s => renderSpans.some(r => r.close === s.end)).map(s => [s.end, s.inner])); if (a !== b || renderSpans.length !== ql.leadInQuotations(t, L).length) { passingDiff++; if (examples.filter(e => e.kind === 'passing').length < 4) examples.push({ kind: 'passing', text: t, renderSpans, check: spans, leadIns: ql.leadInQuotations(t, L) }); } }
  // the render reads "no quote" (straight only); the check finds lead-in-without-quote for neither straight nor curly
  const renderNoQuote = ql.leadInQuotations(t, L).filter(q => !q.terminated && q.kind === 'lead-in-without-quote').length;
  const checkNoQuote = qf.inspectBlockQuotes({ id: 'b', text: t, sourceIds: [] }, new Map(), L).findings.filter(f => f.kind === 'lead-in-without-quote').length;
  if (renderNoQuote !== checkNoQuote) { leadInMismatch++; if (examples.filter(e => e.kind === 'no-quote-count').length < 3) examples.push({ kind: 'no-quote-count', text: t, renderNoQuote, checkNoQuote }); }
}
console.log(JSON.stringify({ passingRenderSpanNotVerifiedByCheck: passingRenderExtra, passingWithNoStraightQuote: passingCurlyOnly, checkPassingTexts: passing, checkPassingWithRenderDifference: passingDiff, texts: n, renderSpanNotACheckSpan: renderNotChecked, leadInWithoutQuoteCountMismatch: leadInMismatch, examples }, null, 1));
