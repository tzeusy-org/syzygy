// Usage: npx vite-node --config <config with ssr.resolve.conditions ["source"]> --root . docs/evidence/syzygy-bpyt-8-41/entity-decoder-probe.ts <out.json>
// Runs both HTML entity decoders over the grid of entity-decoder-divergence.test.ts (same values, pads, forms) plus malformed and named cases.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { decodeHtmlText } from '../../../packages/polaris-generation-core/src/dossier-page-scan.js';
import { QUOTE_NORMALISATION } from '../../../packages/polaris-generation-core/src/quote-fidelity.js';

const step = QUOTE_NORMALISATION.find((s) => s.pattern.source.includes('#[xX]'))!;
const fidelity = (t: string): string => {
  const m = new RegExp(step.pattern.source, step.pattern.flags).exec(t);
  return m === null || m[0] !== t ? t : step.replace(m).map((p) => p.text).join('');
};
const VALUES = [0n, 1n, 9n, 10n, 0x41n, 0x7fn, 0xa0n, 0xd7ffn, 0xd800n, 0xdbffn, 0xdc00n, 0xdfffn, 0xe000n, 0xffffn, 0x10000n, 0x1f600n, 0x10ffffn, 0x110000n, 0xfffffn, 0xffffffn, 0x1000000n, 9_999_999n, 10_000_000n, 2n ** 31n, 2n ** 53n + 1n, 10n ** 30n];
const PADS = [0, 1, 2, 6, 7, 8, 40];
const cases: { text: string; cls: string }[] = [];
for (const v of VALUES) for (const pad of PADS) {
  const dec = '0'.repeat(pad) + v.toString(10), hex = '0'.repeat(pad) + v.toString(16);
  cases.push({ text: `&#${dec};`, cls: 'numeric' });
  for (const t of [`&#x${hex};`, `&#X${hex};`, `&#x${hex.toUpperCase()};`]) cases.push({ text: t, cls: 'numeric' });
}
for (const t of ['&#;', '&#x;', '&#xG;', '&#-1;', '&#1', '&#x41', '& #65;', '&#65 ;', '&#+65;', '&#6.5;', '&#٦٥;', '&#xZZ;']) cases.push({ text: t, cls: 'malformed' });
for (const t of ['&amp;', '&lt;', '&gt;', '&quot;', '&apos;', '&nbsp;', '&copy;', '&AMP;', '&Amp;', '&amp', '&;']) cases.push({ text: t, cls: 'named' });
const tally: Record<string, { total: number; diverge: number }> = {};
const divergences: { text: string; pageScan: string; fidelity: string }[] = [];
for (const c of cases) {
  const a = decodeHtmlText(c.text), b = fidelity(c.text);
  const t = (tally[c.cls] ??= { total: 0, diverge: 0 });
  t.total++;
  if (a !== b) { t.diverge++; divergences.push({ text: c.text.length > 30 ? `${c.text.slice(0, 12)}...(${c.text.length} chars)` : c.text, pageScan: JSON.stringify(a).slice(0, 40), fidelity: JSON.stringify(b).slice(0, 40) }); }
}
const git = (...a: string[]) => execFileSync('git', a, { encoding: 'utf8' }).trim();
const files = ['packages/polaris-generation-core/src/dossier-page-scan.ts', 'packages/polaris-generation-core/src/quote-fidelity.ts'];
const sha = (f: string) => execFileSync('sha256sum', [f], { encoding: 'utf8' }).split(' ')[0];
const record = {
  record: 'entity-decoder-differential', bead: 'syzygy-bpyt.8.41', date: '2026-11-04',
  labels: 'Every figure is Observed from this run unless marked Inferred.',
  subject: { commit: git('rev-parse', 'HEAD'), decoders: files.map((path) => ({ path, sha256: sha(path) })) },
  denominator: { total: cases.length, byClass: Object.fromEntries(Object.entries(tally).map(([k, v]) => [k, v.total])) },
  divergenceCount: divergences.length, divergenceByClass: Object.fromEntries(Object.entries(tally).map(([k, v]) => [k, v.diverge])),
  divergences,
  decision: 'Kept apart (GP-Q0): folding changes an output on the diverging rows; goes to the owner.',
};
writeFileSync(process.argv[2]!, `${JSON.stringify(record, null, 1)}\n`);
console.log(record.denominator, record.divergenceCount);
