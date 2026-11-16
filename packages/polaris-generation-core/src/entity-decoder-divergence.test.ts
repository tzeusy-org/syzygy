import { describe, expect, it } from 'vitest';

import { decodeHtmlText } from './dossier-page-scan.js';
import { QUOTE_NORMALISATION } from './quote-fidelity.js';

// syzygy-bpyt.8.41 (greenfield G4): two HTML entity decoders, kept apart on purpose.
//   page-scan  `decodeHtmlText`  (dossier-page-scan.ts): reads a rendered dossier page the way a reader sees it, for the
//                                evaluator's claim text, quote text and attributes. Caps a reference at 7 decimal or 6 hex digits
//                                and decodes `&#0;` to U+0000.
//   fidelity   `decodeEntity`    (quote-fidelity.ts, reached through the entity step of QUOTE_NORMALISATION): normalises source and
//                                quotation text so a quotation can be located in a cited source. Caps no digit run (leading zeros
//                                stay a reference) and leaves `&#0;` literal, so a NUL never enters a located quote.
// A merge would change an output on some input in either direction (GP-Q0): it goes to the owner. This file pins the two
// differences over a generated grid. Every expectation below is typed from the rules above, never read back from either decoder.
// The record of the same grid: docs/evidence/syzygy-bpyt-8-41/entity-decoder-differential-2026-11-04.json.

const entityStep = QUOTE_NORMALISATION.find((step) => step.pattern.source.includes('#[xX]'));
if (entityStep === undefined) throw new Error('entity step not found in QUOTE_NORMALISATION');

/** The fidelity decoder on one reference: the step's own pieces when it matches the whole text, else the text unchanged. */
const fidelity = (text: string): string => {
  const match = new RegExp(entityStep.pattern.source, entityStep.pattern.flags).exec(text);
  if (match === null || match[0] !== text) return text;
  return entityStep.replace(match as RegExpExecArray).map((piece) => piece.text).join('');
};
const pageScan = (text: string): string => decodeHtmlText(text);

const VALUES: readonly bigint[] = [
  0n, 1n, 9n, 10n, 0x41n, 0x7fn, 0xa0n, 0xd7ffn, 0xd800n, 0xdbffn, 0xdc00n, 0xdfffn, 0xe000n, 0xffffn, 0x10000n, 0x1f600n,
  0x10ffffn, 0x110000n, 0xfffffn, 0xffffffn, 0x1000000n, 9_999_999n, 10_000_000n, 2n ** 31n, 2n ** 53n + 1n, 10n ** 30n,
];
const PADS = [0, 1, 2, 6, 7, 8, 40] as const;
interface Reference { readonly text: string; readonly value: bigint; readonly digits: number; readonly cap: number }
const corpus: Reference[] = [];
for (const value of VALUES) {
  for (const pad of PADS) {
    const dec = '0'.repeat(pad) + value.toString(10);
    corpus.push({ text: `&#${dec};`, value, digits: dec.length, cap: 7 });
    const hex = '0'.repeat(pad) + value.toString(16);
    for (const [marker, digits] of [['x', hex], ['X', hex], ['x', hex.toUpperCase()]] as const) {
      corpus.push({ text: `&#${marker}${digits};`, value, digits: digits.length, cap: 6 });
    }
  }
}
const MALFORMED = ['&#;', '&#x;', '&#xG;', '&#-1;', '&#1', '&#x41', '& #65;', '&#65 ;', '&#+65;', '&#6.5;', '&#٦٥;', '&#xZZ;'];
const NAMED = ['&amp;', '&lt;', '&gt;', '&quot;', '&apos;', '&nbsp;', '&copy;', '&AMP;', '&Amp;', '&amp', '&;'];

const surrogate = (v: bigint): boolean => v >= 0xd800n && v <= 0xdfffn;
const inRange = (v: bigint): boolean => v <= 0x10ffffn && !surrogate(v);
const chr = (v: bigint): string => String.fromCodePoint(Number(v));
// Rule of the page-scan decoder: within the digit cap, decode every in-range non-surrogate value, U+0000 included.
const expectPageScan = (r: Reference): string => (r.digits <= r.cap && inRange(r.value) ? chr(r.value) : r.text);
// Rule of the fidelity decoder: no digit cap, but a zero value stays literal.
const expectFidelity = (r: Reference): string => (r.value > 0n && inRange(r.value) ? chr(r.value) : r.text);

describe('the two HTML entity decoders differ in exactly two ways (G4)', () => {
  it('each decoder follows its own typed rule over the whole numeric grid', () => {
    for (const r of corpus) {
      expect(pageScan(r.text), `page-scan ${r.text}`).toBe(expectPageScan(r));
      expect(fidelity(r.text), `fidelity ${r.text}`).toBe(expectFidelity(r));
    }
  });

  it('they diverge on a zero value within the cap and on a positive in-range value written past the page-scan digit cap, and nowhere else', () => {
    const divergent = corpus.filter((r) => pageScan(r.text) !== fidelity(r.text));
    const typed = corpus.filter((r) => (r.value === 0n && r.digits <= r.cap) || (r.value > 0n && inRange(r.value) && r.digits > r.cap));
    expect(divergent.map((r) => r.text)).toEqual(typed.map((r) => r.text));
    expect(corpus.length).toBe(26 * 7 * 4);
    expect(divergent.length).toBe(typed.length);
    // Anchors typed by hand, so an empty grid cannot pass.
    expect([pageScan('&#0;'), fidelity('&#0;')]).toEqual(['\u0000', '&#0;']);
    expect([pageScan('&#x0;'), fidelity('&#x0;')]).toEqual(['\u0000', '&#x0;']);
    expect([pageScan('&#00000065;'), fidelity('&#00000065;')]).toEqual(['&#00000065;', 'A']);
    expect([pageScan('&#x0000041;'), fidelity('&#x0000041;')]).toEqual(['&#x0000041;', 'A']);
    expect([pageScan('&#65;'), fidelity('&#65;')]).toEqual(['A', 'A']);
  });

  it('they agree on surrogates, values above 0x10FFFF, malformed references and named entities', () => {
    for (const r of corpus.filter((x) => !inRange(x.value))) expect([pageScan(r.text), fidelity(r.text)]).toEqual([r.text, r.text]);
    for (const text of [...MALFORMED, ...NAMED]) expect(pageScan(text), text).toBe(fidelity(text));
    expect(pageScan('&nbsp;')).toBe(' ');
    expect(pageScan('&copy;')).toBe('&copy;');
  });
});
