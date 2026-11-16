import { describe, expect, it } from 'vitest';

import { frozenCensus } from './test-frozen.js';

// A census that cannot see an unfrozen member passes the pins that stand on it (syzygy-bpyt.6.13).
describe('frozenCensus', () => {
  it('reports nothing unfrozen for a value frozen all the way down, and counts the objects it walked', () => {
    const value = Object.freeze({ list: Object.freeze([Object.freeze({ leaf: 1 }), 2]), text: 'a' });
    expect(frozenCensus(value)).toEqual({ visited: 3, unfrozen: [] });
  });

  it('names the path of an unfrozen root, an unfrozen array and an unfrozen leaf below a frozen shell', () => {
    expect(frozenCensus({ a: 1 }).unfrozen).toEqual(['$']);
    expect(frozenCensus(Object.freeze({ list: [1] })).unfrozen).toEqual(['$.list']);
    expect(frozenCensus(Object.freeze({ shell: Object.freeze({ leaf: { x: 1 } }) })).unfrozen).toEqual(['$.shell.leaf']);
  });

  it('terminates on a cycle and counts each object once', () => {
    const node: { self?: unknown } = {};
    node.self = node;
    expect(frozenCensus(node)).toEqual({ visited: 1, unfrozen: ['$'] });
  });

  it('walks nothing for a primitive, null or undefined, and skips typed-array views', () => {
    for (const value of [7, 'text', null, undefined]) expect(frozenCensus(value)).toEqual({ visited: 0, unfrozen: [] });
    expect(frozenCensus(Object.freeze({ bytes: new Uint8Array([1, 2]) }))).toEqual({ visited: 1, unfrozen: [] });
  });
});
