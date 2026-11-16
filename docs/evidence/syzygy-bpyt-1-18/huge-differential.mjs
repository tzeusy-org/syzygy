// Differential for syzygy-bpyt.1.18: where does the one-call spread push throw, and what does the loop return in its place?
// Usage: node [--stack-size=N] huge-differential.mjs <base dist> <head dist> <out.json>
//   <dist> is packages/three-surface-poc-core/dist of a built checkout: BASE the parent of the fix, HEAD the fix.
// Every text is synthetic. "inner lines" counts the lines between a fence's delimiters (the probe of step 1 used the same count; the
// fence is two lines longer, and the spread's argument count is the fence's whole line count).
//
// Per line end (LF, CRLF, CR):
//   threshold  BASE: one bisection, in this process, between 1,000 and 400,000 inner lines: the largest count the mask survived and
//              the first that threw, with the text's byte length there. It is a measurement of this run, not a constant: the boundary
//              moves with the process, its stack use and what has already run (125,457 in the first run of this tool, 125,285 in a
//              vitest process, and a bare node process that repeats one size survived 125,500).
//   survivors  BASE and HEAD return deep-equal results (mask and scanActiveContent) at 1, 10, 1,000 and 50% and 80% of the bisection's
//              largest survivor (the boundary itself is not used: it moves by a hundred lines or so between calls).
//   beyond     HEAD at the bisection's first throwing count, 200,000 and 400,000: the mask is the text with every byte but CR and LF
//              blanked (an oracle that does not read the mask), fences is 1, and scanActiveContent finds nothing. BASE's result at the
//              same counts is recorded beside it, whatever it is (it throws at default stack size, and survives 200,000 at twice the stack).
// Extractor: the same, for a success-criteria list of n bullets under the exact vision heading (extractSource, one class), with
// the same survivor sizes and a result that keeps every item in order.
// The node version, the stack size flag and the default stack are recorded: the thresholds depend on them.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';

const [baseDist, headDist, out] = process.argv.slice(2);
if (out === undefined) throw new Error('usage: huge-differential.mjs <base dist> <head dist> <out.json>');
const load = async (dist) => {
  const reader = await import(pathToFileURL(join(dist, 'git-object-reader.js')).href);
  const mask = await import(pathToFileURL(join(dist, 'markdown-code-context.js')).href);
  const extraction = await import(pathToFileURL(join(dist, 'project-shape-extraction.js')).href);
  return { scan: reader.scanActiveContent, mask: mask.maskMarkdownCodeContexts, extract: extraction.extractSource };
};
const base = await load(baseDist);
const head = await load(headDist);

const attempt = (fn) => {
  try {
    return { returned: fn() };
  } catch (error) {
    return { threw: `${error.name}: ${error.message}` };
  }
};
const TERMINATORS = { LF: '\n', CRLF: '\r\n', CR: '\r' };
const fenceText = (inner, end) => `\`\`\`${end}${`x${end}`.repeat(inner)}\`\`\`${end}`;
const bulletText = (n) => `# Butlers\n\n## What Success Looks Like\n\n${'- x\n'.repeat(n)}\n## What Butlers Is Not\n\nNot a toy.\n`;
const extractFor = (impl, n) => attempt(() => {
  const r = impl.extract({ path: 'heart-and-soul/vision.md', extractionClasses: ['success-criterion'] }, bulletText(n));
  return { kind: r.kind, items: r.kind === 'extracted' ? r.items.length : undefined, denominator: r.kind === 'extracted' ? r.denominators['success-criterion'] : undefined, first: r.kind === 'extracted' ? r.items[0] : undefined, last: r.kind === 'extracted' ? r.items.at(-1) : undefined };
});
const maskFor = (impl, text) => attempt(() => impl.mask(text));
const scanFor = (impl, text) => attempt(() => impl.scan(text));

const bisect = (probe, low = 1000, high = 400000) => {
  if (probe(low).threw !== undefined) return { error: `throws already at ${low}` };
  if (probe(high).threw === undefined) return { noThrowAt: high };
  while (high - low > 1) {
    const mid = (low + high) >> 1;
    if (probe(mid).threw === undefined) low = mid;
    else high = mid;
  }
  return { largestSurviving: low, firstThrowing: high };
};

const result = { node: process.version, execArgv: process.execArgv, mask: {}, extractor: {}, failures: [] };
const check = (ok, what) => {
  if (!ok) result.failures.push(what);
};

for (const [name, end] of Object.entries(TERMINATORS)) {
  const threshold = bisect((n) => maskFor(base, fenceText(n, end)));
  const row = { threshold: { ...threshold, bytesAtFirstThrow: threshold.firstThrowing === undefined ? undefined : fenceText(threshold.firstThrowing, end).length }, survivors: [], beyond: [] };
  const sizes = [1, 10, 1000, Math.floor(threshold.largestSurviving * 0.5), Math.floor(threshold.largestSurviving * 0.8)];
  for (const n of sizes) {
    const text = fenceText(n, end);
    const same = isDeepStrictEqual(maskFor(base, text), maskFor(head, text)) && isDeepStrictEqual(scanFor(base, text), scanFor(head, text));
    row.survivors.push({ inner: n, baseEqualsHead: same });
    check(same, `mask ${name} survivor ${n}: base and head differ`);
  }
  const beyond = [threshold.firstThrowing, 200000, 400000].filter((n) => n !== undefined);
  for (const n of beyond) {
    const text = fenceText(n, end);
    const baseResult = maskFor(base, text);
    const headResult = maskFor(head, text);
    const headScan = scanFor(head, text);
    const oracle = text.replace(/[^\r\n]/g, ' ');
    const headOk = headResult.returned?.kind === 'masked' && headResult.returned.masked === oracle && headResult.returned.fences === 1 && headResult.returned.spans === 0 && Array.isArray(headScan.returned) && headScan.returned.length === 0;
    row.beyond.push({ inner: n, bytes: text.length, base: baseResult.threw ?? baseResult.returned.kind, head: headResult.threw ?? headResult.returned.kind, headEqualsOracle: headOk });
    check(headOk, `mask ${name} beyond ${n}: head does not equal the oracle`);
  }
  result.mask[name] = row;
}

const ex = { threshold: bisect((n) => extractFor(base, n)), survivors: [], beyond: [] };
const exSizes = [1, 10, 1000, Math.floor(ex.threshold.largestSurviving * 0.5), Math.floor(ex.threshold.largestSurviving * 0.8)];
for (const n of exSizes) {
  const same = isDeepStrictEqual(extractFor(base, n), extractFor(head, n));
  ex.survivors.push({ inner: n, baseEqualsHead: same });
  check(same, `extractor survivor ${n}: base and head differ`);
}
for (const n of [ex.threshold.firstThrowing, 200000, 400000].filter((n) => n !== undefined)) {
  const baseResult = extractFor(base, n);
  const headResult = extractFor(head, n);
  const headOk = headResult.returned?.kind === 'extracted' && headResult.returned.items === n && headResult.returned.denominator === n;
  ex.beyond.push({ bullets: n, bytes: bulletText(n).length, base: baseResult.threw ?? baseResult.returned.kind, head: headResult.threw ?? `${headResult.returned.kind}, ${headResult.returned.items} items, denominator ${headResult.returned.denominator}`, headKeepsEveryItem: headOk });
  check(headOk, `extractor beyond ${n}: head does not keep every item`);
}
result.extractor = ex;
writeFileSync(out, `${JSON.stringify(result, null, 1)}\n`);
console.log(JSON.stringify({ failures: result.failures, maskThresholds: Object.fromEntries(Object.entries(result.mask).map(([k, v]) => [k, v.threshold])), extractor: ex.threshold }));
process.exit(result.failures.length === 0 ? 0 : 1);
