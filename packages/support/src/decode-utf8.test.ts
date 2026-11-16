import { describe, expect, it } from 'vitest';
import { decodeUtf8 } from './decode-utf8.js';

const bytes = (...values: number[]): Uint8Array => new Uint8Array(values);

// Expected values are written out from the UTF-8 standard (RFC 3629, Table 3-7 of Unicode), not computed by a decoder.
describe('decodeUtf8', () => {
  it('decodes well-formed text of every sequence length', () => {
    expect(decodeUtf8(bytes())).toBe('');
    expect(decodeUtf8(bytes(0x61, 0x62, 0x63))).toBe('abc');
    expect(decodeUtf8(bytes(0xc3, 0xa9))).toBe('é');
    expect(decodeUtf8(bytes(0xe2, 0x82, 0xac))).toBe('€');
    expect(decodeUtf8(bytes(0xf0, 0x9f, 0x98, 0x80))).toBe('\u{1F600}');
    expect(decodeUtf8(bytes(0x00, 0x61))).toBe('\0a');
    expect(decodeUtf8(bytes(0xef, 0xbf, 0xbe))).toBe('￾');
    expect(decodeUtf8(bytes(0xef, 0xbf, 0xbd))).toBe('�');
  });

  it('refuses every malformed class instead of replacing it', () => {
    const refused: ReadonlyArray<readonly [string, Uint8Array]> = [
      ['a lone continuation byte', bytes(0x80)],
      ['a lead byte with no continuation', bytes(0xc3)],
      ['a truncated three-byte sequence', bytes(0xe2, 0x82)],
      ['a truncated four-byte sequence', bytes(0xf0, 0x9f, 0x98)],
      ['an overlong two-byte encoding of NUL', bytes(0xc0, 0x80)],
      ['an overlong three-byte encoding of slash', bytes(0xe0, 0x80, 0xaf)],
      ['an encoded surrogate', bytes(0xed, 0xa0, 0x80)],
      ['a code point past U+10FFFF', bytes(0xf4, 0x90, 0x80, 0x80)],
      ['the bytes 0xFE and 0xFF, which UTF-8 never uses', bytes(0xff, 0xfe)],
      ['a good prefix and a bad tail', bytes(0x61, 0x62, 0xc3, 0x28)],
    ];
    for (const [label, input] of refused) expect(decodeUtf8(input), label).toBeUndefined();
  });

  it('drops one leading byte-order mark and keeps a second', () => {
    expect(decodeUtf8(bytes(0xef, 0xbb, 0xbf, 0x61))).toBe('a');
    expect(decodeUtf8(bytes(0xef, 0xbb, 0xbf, 0xef, 0xbb, 0xbf, 0x61))).toBe('﻿a');
    expect(decodeUtf8(bytes(0x61, 0xef, 0xbb, 0xbf))).toBe('a﻿');
  });

  it('reads only the view, not the buffer behind it', () => {
    const behind = bytes(0xff, 0x61, 0x62, 0xff);
    expect(decodeUtf8(behind.subarray(1, 3))).toBe('ab');
    expect(decodeUtf8(behind)).toBeUndefined();
  });

  it('carries no state from a refused call into the next', () => {
    expect(decodeUtf8(bytes(0xe2, 0x82))).toBeUndefined();
    expect(decodeUtf8(bytes(0xac))).toBeUndefined();
    expect(decodeUtf8(bytes(0xe2, 0x82, 0xac))).toBe('€');
  });

  it('accepts a Buffer', () => {
    expect(decodeUtf8(Buffer.from('héllo'))).toBe('héllo');
  });
});
