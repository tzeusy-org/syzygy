// Texts mixing only LF and CRLF (no bare CR): are head findings deep-equal to the LF form's, positions included?
// Usage: node mixed-crlf-positions.mjs <head dist> <iterations> <seed>
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
const [dist, iters, seed] = process.argv.slice(2);
const scan = (await import(pathToFileURL(join(dist, 'git-object-reader.js')).href)).scanActiveContent;
let s = Number(seed) >>> 0;
const rand = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (xs) => xs[Math.floor(rand() * xs.length)];
const CR = String.fromCharCode(13);
const LF = String.fromCharCode(10);
const POOL = ['```', '~~~', '```js', '```a`b', '``` text', '- ```', 'a `b', 'c` d', '<script>x</script>', '<div>', '[a](javascript:x)', '<!-- c -->', '<a onload=x>', 'text', '', '    ```', '~~~ a`b'];
let rows = 0;
let differ = 0;
for (let k = 0; k < Number(iters); k += 1) {
  const n = 1 + Math.floor(rand() * 9);
  const lines = Array.from({ length: n }, () => pick(POOL) + (rand() < 0.3 ? pick(POOL) : ''));
  const terms = lines.map((_, i) => (i === n - 1 && rand() < 0.4 ? '' : rand() < 0.5 ? CR + LF : LF));
  if (!terms.some((t) => t === CR + LF)) continue;
  const text = lines.map((l, i) => l + terms[i]).join('');
  const lf = lines.map((l, i) => l + (terms[i] === '' ? '' : LF)).join('');
  rows += 1;
  if (!isDeepStrictEqual(scan(text), scan(lf))) differ += 1;
}
console.log(JSON.stringify({ textsMixingLfAndCrlfOnly: rows, findingsDifferFromLfFormIncludingPositions: differ }));
