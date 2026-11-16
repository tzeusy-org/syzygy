import { describe, expect, it } from 'vitest';
import { deepFreeze } from './deep-freeze.js';

describe('deepFreeze', () => {
  it('returns the value it was given and freezes every object it reaches', () => {
    const value = { a: { b: [{ c: 1 }, 2] }, d: 'text' };
    const returned = deepFreeze(value);
    expect(returned).toBe(value);
    expect(Object.isFrozen(value)).toBe(true);
    expect(Object.isFrozen(value.a)).toBe(true);
    expect(Object.isFrozen(value.a.b)).toBe(true);
    expect(Object.isFrozen(value.a.b[0])).toBe(true);
  });

  it('passes primitives, null and undefined through', () => {
    expect(deepFreeze(7)).toBe(7);
    expect(deepFreeze('s')).toBe('s');
    expect(deepFreeze(null)).toBeNull();
    expect(deepFreeze(undefined)).toBeUndefined();
  });

  it('ends the walk at an object that is already frozen', () => {
    const inner = { x: 1 };
    const shell = Object.freeze({ inner });
    deepFreeze(shell);
    expect(Object.isFrozen(inner)).toBe(false);
  });

  it('terminates on a cycle', () => {
    const node: { self?: unknown } = {};
    node.self = node;
    deepFreeze(node);
    expect(Object.isFrozen(node)).toBe(true);
  });

  // The owner is frozen before its members are walked, so a throw raised mid-walk by something other than Object.freeze leaves a partial
  // freeze: the owner, and the members reached before the throw (review R-GP-IMPL-SUPPORT-LEAF-1 round 2, N12; the call it replaced froze
  // members first and left the owner unfrozen). Object.values reads every member before the first is walked, so a throwing getter
  // stops the walk before any member; a Proxy whose ownKeys trap throws is reached only after its earlier sibling.
  it('leaves the owner frozen, and the members reached so far, when a member throws mid-walk', () => {
    const sibling = {};
    const withGetter = { sibling, get boom(): never { throw new Error('getter'); } };
    expect(() => deepFreeze(withGetter)).toThrow('getter');
    expect([Object.isFrozen(withGetter), Object.isFrozen(sibling)]).toEqual([true, false]);

    const reached = {};
    const withProxy = { reached, trap: new Proxy({}, { ownKeys() { throw new Error('trap'); } }) };
    expect(() => deepFreeze(withProxy)).toThrow('trap');
    expect([Object.isFrozen(withProxy), Object.isFrozen(reached)]).toEqual([true, true]);
  });

  it('makes a later write fail', () => {
    const value = deepFreeze({ list: [1] });
    expect(() => { (value.list as number[]).push(2); }).toThrow(TypeError);
  });
});
