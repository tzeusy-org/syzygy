import { describe, expect, it } from 'vitest';
import { sha256 } from '@syzygy/support';
import { isOrderedDesignPartPath, planOrderedDesignBytes } from './url-design-delivery.js';

/** Owned canonical transport vector 253. The expected encoded counts and
 * hashes below are retained values from the independently verified vector. */
function vector() {
  const originalSha256 = 'c312c1a6d42a064b07308fe0ee427257d94b11d727737f87b4678d8953c39ee5';
  const payload = '{&quot;owned&quot;:&quot;fixture &lt; &amp; \\n \u{1fabf} \\&quot; escape&quot;}\n';
  const envelope = Buffer.from(JSON.stringify({
    encoding: 'html-entities-five/1', format: 'polaris-dossier-url-design-inert-view/1',
    originalBytes: 42, originalSha256, payload, payloadBytes: 74,
    payloadSha256: '55c2eef579a71ed211e789b29be9af65a107d5dd95fe7013b64075a2e54d518b',
  }));
  return {
    envelope, envelopeSha256: 'b120f6c83145e629d08cea4bf89c1a324cdbede0342258df9582d2ef38f0328d',
    original: { bytes: 42, sha256: originalSha256 }, fileCount: 15, pageCount: 12,
    binding: {
      basePolicySha256: sha256('fixture base policy'), deadline: '2026-11-22T00:00:00.000Z', encoding: 'html-entities-five/1',
      originPolicySha256: sha256('fixture origin policy'), originalReceiptSha256: sha256('fixture original receipt identity'),
      pin: sha256('fixture pin'), producerSha256: sha256('fixture producer'), profileSha256: sha256('fixture profile'),
      project: 'own-fixture-project', provider: 'own-fixture-provider', role: 'design', round: 1, run: 'own-fixture-run',
      session: 'own-fixture-session', transferEpoch: 1,
    } as const,
    parents: ['fixture-parent-b', 'fixture-parent-a', 'fixture-parent-b'].map(sha256),
    instructionProfileSha256: 'e'.repeat(64),
    limits: { partBytes: 252, partCount: 2, replyBytes: 648, preparedBytes: 1024 },
  };
}
const REFUSAL = 'url-ordered-design-plan-refused';

describe('ordered URL design byte plan', () => {
  it('reproduces the canonical vector with ordered repeated parents and separate reply identities', () => {
    const plan = planOrderedDesignBytes(vector());
    const manifestSha256 = 'bcd3da3bea266e3d99b60984a67b6c7b7ea409fd326983a75ed937c518eb714e';
    expect(plan.manifestSha256).toBe(manifestSha256);
    expect(plan.manifest.binding.parentSetSha256).toBe('a75c0dc8556bda0d4fff5fa098d6e05075443ac57a4d11a9287da194d5f7c889');
    expect(plan.manifest.parts).toEqual([
      { bytes: 252, offset: 0, ordinal: 1, path: 'round-1/design-view-part-1.json',
        sha256: 'befb48178af9470d00cb9484c43d347f135397d24ec8a2da2b467e16c5e2ae9a' },
      { bytes: 128, offset: 252, ordinal: 2, path: 'round-1/design-view-part-2.json',
        sha256: '535d2c24bd6ee2d4940711037493f1ffbfd6d44061430818c1e76bfffec64e71' },
    ]);
    expect(plan.replies).toEqual([
      { manifestSha256, ordinal: 1, bytes: 648, sha256: 'c3cf4b4e33ea75f3e03573eef8d1c58de60aa5fa795230370958235e0d1ec4fc' },
      { manifestSha256, ordinal: 2, bytes: 517, sha256: '477db6e1832fd4e788f6a342079507c2caea1976133969b65d54c9a3905ca360' },
    ]);
    expect(plan.manifestText.endsWith('\n')).toBe(false);
    expect(Object.isFrozen(plan.manifest.parts[0])).toBe(true);
    expect(Object.isFrozen(plan.replies[0])).toBe(true);
    expect(plan.preparedText).toBe(JSON.stringify({
      encoding: 'html-entities-five/1', envelopeBytes: 380, envelopeSha256: vector().envelopeSha256, fileCount: 15,
      format: 'polaris-dossier-url-design-prepared/1', instructionProfileSha256: 'e'.repeat(64), manifestSha256,
      originalBytes: 42, originalSha256: vector().original.sha256, pageCount: 12, partCount: 2, round: 1,
    }));
  });

  it('backs up before a split scalar and keeps the envelope byte denominator', () => {
    const input = vector();
    const plan = planOrderedDesignBytes({ ...input, limits: { ...input.limits, partBytes: 250 } });
    expect(plan.manifest.parts.map(({ bytes, offset }) => ({ bytes, offset }))).toEqual([{ bytes: 248, offset: 0 }, { bytes: 132, offset: 248 }]);
    expect(input.envelope.subarray(248, 252)).toEqual(Buffer.from('\u{1fabf}'));
  });

  it('withholds the entire plan when partition, escaped reply or prepared bytes exceed the profile', () => {
    const input = vector();
    for (const cut of [{ partCount: 1 }, { replyBytes: 647 }, { preparedBytes: 128 }, { partBytes: Number.NaN }]) {
      expect(() => planOrderedDesignBytes({ ...input, limits: { ...input.limits, ...cut } })).toThrow(REFUSAL);
    }
    // At a 190-byte slice size the second part needs more wrapper/escape
    // bytes than the first, so checking the initial release alone is unsafe.
    const split = { ...input, limits: { ...input.limits, partBytes: 190 } };
    const plan = planOrderedDesignBytes(split);
    expect(plan.replies[1]!.bytes).toBeGreaterThan(plan.replies[0]!.bytes);
    expect(() => planOrderedDesignBytes({
      ...split, limits: { ...split.limits, replyBytes: plan.replies[0]!.bytes },
    })).toThrow(REFUSAL);
  });

  it('refuses a new digest of a noncanonical envelope and inconsistent original or transfer bindings', () => {
    const input = vector();
    for (const envelope of [Buffer.concat([input.envelope, Buffer.from('\n')]),
      Buffer.concat([input.envelope.subarray(0, 249), input.envelope.subarray(250)])]) {
      expect(() => planOrderedDesignBytes({ ...input, envelope, envelopeSha256: sha256(envelope) })).toThrow(REFUSAL);
    }
    expect(() => planOrderedDesignBytes({ ...input, original: { ...input.original, bytes: 43 } })).toThrow(REFUSAL);
    expect(() => planOrderedDesignBytes({ ...input, fileCount: 11 })).toThrow(REFUSAL);
    expect(() => planOrderedDesignBytes({ ...input, binding: { ...input.binding, transferEpoch: 0 } })).toThrow(REFUSAL);
    expect(() => planOrderedDesignBytes({ ...input, binding: { ...input.binding, run: 'own-fixture-run\n' } })).toThrow(REFUSAL);
  });

  it('reserves only the exact bounded virtual selector spelling', () => {
    expect(isOrderedDesignPartPath('round-1/design-view-part-12.json')).toBe(true);
    for (const path of ['round-01/design-view-part-1.json', 'round-1/design-view-part-01.json', 'round-1/design-view-part-0.json',
      'round-1/design-view-part-1023.json', 'round-1/design-view-part-1.json\n', 'round-1/../design-view-part-1.json']) {
      expect(isOrderedDesignPartPath(path)).toBe(false);
    }
  });
});
