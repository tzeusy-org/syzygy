import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { isRecord } from './is-record.js';

class Plain {}
class SubArray extends Array {}

const revokedObject = Proxy.revocable({}, {});
revokedObject.revoke();
const revokedArray = Proxy.revocable([], {});
revokedArray.revoke();
const throwingGetter = {};
Object.defineProperty(throwingGetter, 'x', { get() { throw new Error('a getter must not run'); }, enumerable: true });
const trapping = new Proxy({}, new Proxy({}, { get() { throw new Error('a trap must not run'); } }));

// Every expected value is written out from the rule (a non-null object that is not an array), not computed by the function.
const ADMITTED: ReadonlyArray<readonly [string, unknown]> = [
  ['an empty object', {}],
  ['an object with a key', { a: 1 }],
  ['an array-like object', { length: 0 }],
  ['an object that claims to be an array by tag', { [Symbol.toStringTag]: 'Array' }],
  ['an object with no prototype', Object.create(null)],
  ['an object whose prototype is Array.prototype', Object.create(Array.prototype)],
  ['a frozen object', Object.freeze({})],
  ['an object with a throwing getter, which is not read', throwingGetter],
  ['a class instance', new Plain()],
  ['a typed array', new Uint8Array(2)],
  ['a Map', new Map()],
  ['a RegExp', /r/],
  ['an Error', new Error('e')],
  ['a boxed number', Object(1)],
  ['a boxed string', Object('s')],
  ['a boxed bigint', Object(1n)],
  ['a proxy of an object', new Proxy({}, {})],
  ['a proxy whose traps throw, which no trap is asked', trapping],
  ['an object from another realm', runInNewContext('({})')],
  ['an object with no prototype from another realm', runInNewContext('Object.create(null)')],
];

const REFUSED: ReadonlyArray<readonly [string, unknown]> = [
  ['undefined', undefined],
  ['null', null],
  ['true', true],
  ['zero', 0],
  ['negative zero', -0],
  ['NaN', Number.NaN],
  ['the empty string', ''],
  ['a string', 'x'],
  ['a bigint', 1n],
  ['a symbol', Symbol('s')],
  ['a function', () => 1],
  ['a class', Plain],
  ['an empty array', []],
  ['an array with a hole', new Array(3)],
  ['an array with an extra key', Object.assign([], { x: 1 })],
  ['an array subclass instance', new SubArray()],
  ['a proxy of an array', new Proxy([], {})],
  ['a proxy of a function', new Proxy(() => 1, {})],
  ['an array from another realm', runInNewContext('[]')],
];

describe('isRecord', () => {
  it.each(ADMITTED)('admits %s', (_label, value) => {
    expect(isRecord(value)).toBe(true);
  });

  it.each(REFUSED)('refuses %s', (_label, value) => {
    expect(isRecord(value)).toBe(false);
  });

  // Array.isArray cannot look through a revoked proxy, so the call throws rather than answering; no copy of this predicate
  // that the package replaced caught the throw either, so a caller sees the same TypeError it always saw.
  it('throws a TypeError on a revoked proxy, of an object or of an array, instead of answering', () => {
    expect(() => isRecord(revokedObject.proxy)).toThrow(TypeError);
    expect(() => isRecord(revokedArray.proxy)).toThrow(TypeError);
  });

  it('narrows an unknown value to a record whose members are read as unknown', () => {
    const value: unknown = JSON.parse('{"a":[1],"b":"s"}');
    if (!isRecord(value)) throw new Error('expected a record');
    expect(Object.keys(value)).toEqual(['a', 'b']);
    expect(value['b']).toBe('s');
  });
});
