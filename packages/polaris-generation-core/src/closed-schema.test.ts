import { describe, expect, it } from 'vitest';
import { check, checkShape, handle, list, object, refs, text } from './closed-schema.js';

// The one closed-schema checker's hardening against untrusted values, in both of its forms (syzygy-bpyt.8.5): `check` throws
// the first breach's code, `checkShape` lists breaches by path. Expected codes and messages are literals.

const record = object({ id: handle, note: text, ids: refs() });
const shape = { root: record, defs: {} };
const good = (): Record<string, unknown> => ({ id: 'a1', note: 'Note.', ids: ['s1'] });
const code = (value: unknown): string => { try { check(record, value); return 'ok'; } catch (error) { return (error as Error).message; } };

describe('closed-schema checker', () => {
  it('admits a plain record', () => {
    expect(code(good())).toBe('ok');
    expect(checkShape(shape, good())).toEqual([]);
  });

  it('refuses a symbol key, an accessor and a proxy', () => {
    const symbol = { ...good(), [Symbol('s')]: 1 };
    const accessor = Object.defineProperty(good(), 'note', { get: () => 'Note.', enumerable: true });
    expect([code(symbol), code(accessor), code(new Proxy(good(), {}))]).toEqual(['invalid-property', 'invalid-property', 'invalid-structure']);
    expect(checkShape(shape, symbol)).toEqual([{ path: '$', detail: 'carries a symbol key or an accessor' }]);
  });

  it('refuses a class instance and a non-enumerable field', () => {
    class Holder { id = 'a1'; note = 'Note.'; ids = ['s1']; }
    const hidden = Object.defineProperty(good(), 'note', { value: 'Note.', enumerable: false });
    expect([code(new Holder()), code(hidden)]).toEqual(['invalid-object', 'invalid-fields']);
    expect(checkShape(shape, new Holder())).toEqual([{ path: '$', detail: 'must be an object' }]);
    expect(checkShape(shape, hidden)).toEqual([{ path: '$.note', detail: 'is not enumerable' }]);
  });

  it('check refuses a hole a named key stands in for', () => {
    const ids: unknown[] = ['s1', 's2']; delete ids[0]; (ids as unknown as Record<string, unknown>)['x'] = 1;
    expect(code({ ...good(), ids })).toBe('invalid-array');
  });

  it('check stops at its first breach: before the repeat test, and a missing field before a field breach', () => {
    const arrayLike = Object.setPrototypeOf([1], Object.prototype) as unknown;
    expect(code({ ...good(), ids: arrayLike })).toBe('invalid-string');
    expect(code({ note: 3, ids: ['s1'] })).toBe('invalid-fields');
    expect(checkShape(shape, { note: 3, ids: ['s1'] })).toEqual([{ path: '$.id', detail: 'is required' }, { path: '$.note', detail: 'must be a string' }]);
  });

  it('check walks the value\'s field order; checkShape the schema\'s', () => {
    const both = { ids: [], note: '', id: 'a1' };
    expect(code(both)).toBe('invalid-array');
    expect(checkShape(shape, both)).toEqual([
      { path: '$.note', detail: 'must be 1 to 8000 characters; is 0' },
      { path: '$.ids', detail: 'must hold 1 to 200 items; holds 0' },
    ]);
    expect(checkShape({ root: list(text, 0, 2), defs: {} }, ['a', 'a', 'a'])).toEqual([{ path: '$', detail: 'must hold 0 to 2 items; holds 3' }]);
  });
});
