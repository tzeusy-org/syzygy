import { describe, expect, it } from 'vitest';
import { sha256 } from './sha256.js';

// Expected values come from Python's hashlib, not from this module.
describe('sha256', () => {
  it('hashes text as its UTF-8 bytes', () => {
    expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256('é')).toBe('4a99557e4033c3539de2eb65472017cad5f9557f7a0625a09f1c3f6e2ba69c4c');
    expect(sha256('\u{1F600}')).toBe('f0443a342c5ef54783a111b51ba56c938e474c32324d90c3a60c9c8e3a37e2d9');
    expect(sha256('a'.repeat(1000))).toBe('41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3');
    expect(sha256('a\0b\nc')).toBe('214df3f68e1a607f5baa40cc3315f4316ae58b282b6c0bf288b89fec4da7aa80');
  });

  it('hashes a lone surrogate as the replacement character, as the UTF-8 encoder writes it', () => {
    expect(sha256('\ud800')).toBe('83d544ccc223c057d2bf80d3f2a32982c32c3c0db8e2674820da5064783fb097');
  });

  it('hashes bytes as given, a Uint8Array and a Buffer alike', () => {
    expect(sha256(new Uint8Array([0x61, 0x62, 0x63]))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256(Buffer.from('abc'))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256(new Uint8Array([0xef, 0xbf, 0xbd]))).toBe('83d544ccc223c057d2bf80d3f2a32982c32c3c0db8e2674820da5064783fb097');
  });

  it('hashes only the view, not the buffer behind it', () => {
    const behind = new Uint8Array([0x00, 0x61, 0x62, 0x63, 0xff]);
    expect(sha256(behind.subarray(1, 4))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});
