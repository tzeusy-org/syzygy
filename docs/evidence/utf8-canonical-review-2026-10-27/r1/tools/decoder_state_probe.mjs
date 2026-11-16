// Does one shared fatal decoder (decodeUtf8, and the old module-level STRICT_UTF8 constants) answer every call exactly as
// a decoder constructed for that call (the old authority-artifact-fields `decode`)? A carried state would show as a
// difference on the call after a refusal or after a split sequence. Usage: node decoder_state_probe.mjs <built clone> <out.json>
// The sequence is built so consecutive calls split a multi-byte sequence or a byte-order mark across the boundary.
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [clone, out] = process.argv.slice(2);
const support = await import(pathToFileURL(join(clone, 'packages/support/dist/index.js')).href);
const fresh = (b) => { try { return new TextDecoder('utf-8', { fatal: true }).decode(b); } catch { return undefined; } };
const SHARED = new TextDecoder('utf-8', { fatal: true });
// --mutant-stream: the self-test of this probe; a shared decoder that streams carries state, and the probe must see it.
const STREAM = process.argv.includes('--mutant-stream') ? { stream: true } : undefined;
const shared = (b) => { try { return SHARED.decode(b, STREAM); } catch { return undefined; } };

let seed = 7;
const next = () => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return seed; };
const enc = new TextEncoder();
const pieces = [
  [0xef, 0xbb, 0xbf], [0xef, 0xbb], [0xbb, 0xbf], [0xbf], [0xe2, 0x82], [0xac], [0x82, 0xac], [0xf0, 0x9f], [0x98, 0x80], [0xf0], [0x9f, 0x98, 0x80],
  [0xc3], [0xa9], [0xed, 0xa0, 0x80], [0xed], [0xa0, 0x80], [0xc0, 0x80], [0xe0, 0x80, 0xaf], [0xf4, 0x90, 0x80, 0x80], [0xff], [0xfe], [0x80],
  [0x61], [0x0a], [0x00], [...enc.encode('é€\u{1F600}')], [],
];
const make = () => {
  const n = next() % 6;
  const parts = [];
  for (let i = 0; i < n; i++) parts.push(...pieces[next() % pieces.length]);
  if (next() % 50 === 0) parts.push(...new Array(70000 + (next() % 1000)).fill(0x61), ...pieces[next() % pieces.length]);
  return Uint8Array.from(parts);
};
const N = 300000;
let differ = 0, freshVsDecodeUtf8 = 0, refused = 0, bomLed = 0;
const examples = [];
const h = createHash('sha256');
for (let i = 0; i < N; i++) {
  const b = make();
  const a = fresh(b), s = shared(b), d = support.decodeUtf8(b);
  if (a === undefined) refused++;
  if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) bomLed++;
  if (a !== s) { differ++; if (examples.length < 5) examples.push({ i, bytes: [...b.slice(0, 12)], fresh: a, shared: s }); }
  if (a !== d) { freshVsDecodeUtf8++; if (examples.length < 5) examples.push({ i, bytes: [...b.slice(0, 12)], fresh: a, decodeUtf8: d }); }
  h.update(String(a === undefined ? '\u0000undefined' : a)).update('\u0001');
}
const result = { calls: N, refusedByFresh: refused, bomLed, freshVsShared: differ, freshVsDecodeUtf8, examples, freshOutputsSha256: h.digest('hex'), node: process.version };
writeFileSync(out, JSON.stringify(result, null, 1) + '\n');
console.log(JSON.stringify({ ...result, examples: examples.length }));
