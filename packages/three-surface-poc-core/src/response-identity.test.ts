import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { canonicalJson } from './project-shape-manifest.js';
import {
  buildResponseIdentity,
  responseIdentityMetadata,
  responseIdentityPreimage,
  type ResponseIdentityDeclaration,
} from './response-identity.js';

function model(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    evaluation: { asOf: '2026-09-23T00:00:00.000Z', label: 'same-evaluation' },
    projectShape: { observed: 'stable-shape' },
    rows: [{ id: 'a', value: 1 }, { id: 'b', value: 2 }],
    ...overrides,
    responseIdentity: responseIdentityMetadata(),
  };
}

function declaration(excludes: readonly string[]): ResponseIdentityDeclaration {
  return { excludes, stableAcross: ['restart'], varyingWith: ['revision'] };
}

describe('response identity', () => {
  it('declares one unique, lexical exclusion set and freezes the emitted metadata', () => {
    const identity = buildResponseIdentity(model());
    expect(identity.excludes).toHaveLength(27);
    expect(new Set(identity.excludes).size).toBe(27);
    expect(identity.excludes).toEqual([...identity.excludes].sort());
    expect(Object.isFrozen(identity)).toBe(true);
    expect(Object.isFrozen(identity.excludes)).toBe(true);
    expect(Object.isFrozen(identity.stableAcross)).toBe(true);
    expect(Object.isFrozen(identity.varyingWith)).toBe(true);
  });

  it('omits declared capture instants but changes for an undeclared instant', () => {
    const first = buildResponseIdentity(model());
    const restarted = buildResponseIdentity(model({ evaluation: { asOf: '2026-09-24T00:00:00.000Z', label: 'same-evaluation' } }));
    expect(restarted.contentKey).toBe(first.contentKey);

    const undeclared = buildResponseIdentity(model({ runtime: { capturedAt: '2026-09-24T00:00:00.000Z' } }));
    const changed = buildResponseIdentity(model({ runtime: { capturedAt: '2026-09-25T00:00:00.000Z' } }));
    expect(changed.contentKey).not.toBe(undeclared.contentKey);
  });

  it('is sensitive to non-excluded content while the unrelated input digest remains independent', () => {
    const first = model({ evaluation: { asOf: '2026-09-23T00:00:00.000Z', label: 'same-evaluation' }, inputsDigest: 'same-inputs' });
    const changed = model({ evaluation: { asOf: '2026-09-23T00:00:00.000Z', label: 'same-evaluation' }, inputsDigest: 'same-inputs', projectShape: { observed: 'changed-shape-byte' } });
    expect((first.inputsDigest as string | undefined)).toBe((changed.inputsDigest as string | undefined));
    expect(buildResponseIdentity(first).contentKey).not.toBe(buildResponseIdentity(changed).contentKey);
  });

  it('sorts object keys canonically, preserves array order, and omits only its own contentKey', () => {
    const first = model({ object: { z: 1, a: 2 } });
    const reordered = model({ object: { a: 2, z: 1 } });
    expect(buildResponseIdentity(first).contentKey).toBe(buildResponseIdentity(reordered).contentKey);

    const arrayReordered = model({ rows: [{ id: 'b', value: 2 }, { id: 'a', value: 1 }] });
    expect(buildResponseIdentity(first).contentKey).not.toBe(buildResponseIdentity(arrayReordered).contentKey);

    const withKey = { ...first, responseIdentity: buildResponseIdentity(first) };
    expect(buildResponseIdentity(withKey).contentKey).toBe(buildResponseIdentity(first).contentKey);
  });

  it('uses the emitted declaration when recomputing a complete model', () => {
    const original = model({ capture: { capturedAt: '2026-09-23T00:00:00.000Z' } });
    const identity = buildResponseIdentity(original);
    const tampered = {
      ...original,
      responseIdentity: { ...identity, excludes: identity.excludes.slice(1) },
    };
    expect(buildResponseIdentity(tampered).contentKey).not.toBe(identity.contentKey);
  });

  it('does not mutate the model or retain process-global state', () => {
    const input = model();
    const first = buildResponseIdentity(input);
    expect((input.responseIdentity as { readonly contentKey: string }).contentKey).toBe('');
    const second = buildResponseIdentity(model());
    expect(second.contentKey).toBe(first.contentKey);
  });

  it('matches an independent canonical JSON and SHA-256 recomputation', () => {
    const value = model();
    const identity = buildResponseIdentity(value);
    const preimage = responseIdentityPreimage(value).value;
    const expected = `sha256:${createHash('sha256').update(canonicalJson(preimage)).digest('hex')}`;
    expect(identity.contentKey).toBe(expected);
  });

  it('permits absent conditional paths but rejects malformed, duplicate, unsorted, and wrong-shape declarations', () => {
    const absent = buildResponseIdentity(
      model(),
      declaration(['optional[].capturedAt']),
    );
    expect(absent.contentKey).toMatch(/^sha256:[0-9a-f]{64}$/);

    expect(() => buildResponseIdentity(model(), declaration(['rows[].id', 'rows[].id']))).toThrow(/duplicated/);
    expect(() => buildResponseIdentity(model(), declaration(['rows[].id', 'evaluation.asOf']))).toThrow(/lexical/);
    expect(() => buildResponseIdentity(model(), declaration(['rows[0].id']))).toThrow(/malformed/);
    expect(() => buildResponseIdentity(model({ rows: { id: 'not-an-array' } }), declaration(['rows[].id']))).toThrow(/array/);
    expect(() => buildResponseIdentity({ ...model(), responseIdentity: undefined })).toThrow(/metadata/);
  });

  it('fails closed when canonicalization cannot represent the preimage', () => {
    expect(() => buildResponseIdentity(model({ impossible: BigInt(1) }))).toThrow(/canonicalization failed/);
  });
});
