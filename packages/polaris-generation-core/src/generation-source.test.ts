import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { GENERATION_EXCLUSION_REASONS, excludedSourceId, keyedDigest, newGenerationRunKey, generationSourcesForBody, segmentBody, generationAnchorId, generationSourceIdentity, gitBlobObjectId, quotableGenerationSources, validateGenerationSources, type GenerationExclusionReason, type GenerationSource } from './generation-source.js';

const body = 'A supported purpose.\n';
const base = { repositoryId: 'repository:fixture', revision: 'a'.repeat(40), path: 'intent/purpose.md', objectId: gitBlobObjectId(body) };
const source = (): GenerationSource => ({
  ...base, sourceId: 'purpose', evaluationId: 'evaluation:fixture', classificationBasis: 'body', exclusion: { excluded: false }, body,
  spans: [{ anchorId: generationAnchorId(base, 0, Buffer.byteLength(body)), start: 0, end: Buffer.byteLength(body), text: body }],
});

describe('evaluation-bound generation sources', () => {
  it('keeps source and anchor identities stable under source reorder', () => {
    const first = source();
    const secondBody = 'Another declaration.\n';
    const secondBase = { ...base, path: 'intent/other.md', objectId: gitBlobObjectId(secondBody) };
    const second: GenerationSource = { ...first, ...secondBase, sourceId: 'other', body: secondBody,
      spans: [{ anchorId: generationAnchorId(secondBase, 0, Buffer.byteLength(secondBody)), start: 0, end: Buffer.byteLength(secondBody), text: secondBody }] };
    expect(validateGenerationSources([first, second])).toHaveLength(2);
    expect(validateGenerationSources([second, first]).map(entry => generationSourceIdentity({ ...entry, objectId: entry.objectId as string })).sort())
      .toEqual([generationSourceIdentity(base), generationSourceIdentity(secondBase)].sort());
    expect(quotableGenerationSources([first, second])).toEqual([{ sourceId: 'purpose', text: body }, { sourceId: 'other', text: secondBody }]);
  });

  it('reads a repository id by 046\'s identity grammar, "." included, and the github: form; refuses one outside (R-PDJA-33-RULINGS-2 finding 1)', () => {
    const withId = (repositoryId: string): GenerationSource => {
      const b = { ...base, repositoryId };
      return { ...source(), repositoryId, spans: [{ anchorId: generationAnchorId(b, 0, Buffer.byteLength(body)), start: 0, end: Buffer.byteLength(body), text: body }] };
    };
    for (const id of ['repository:nodejs-node.js', 'repository:-x', 'repository:_a.b', 'github:Owner:repo_d']) expect(validateGenerationSources([withId(id)]), id).toHaveLength(1);
    for (const id of ['repository:a b', 'repository:a/b', 'repository:a~b', '']) expect(() => validateGenerationSources([withId(id)]), id).toThrow('invalid-source');
  });

  it('counts path-only, excluded and unavailable sources while withholding their bytes and anchors', () => {
    const quoted = source();
    const { body: _body, ...withoutBody } = quoted;
    const pathOnly: GenerationSource = { ...withoutBody, sourceId: 'path-only', path: 'intent/path-only.md', classificationBasis: 'path-only', spans: [] };
    const excluded: GenerationSource = { ...withoutBody, sourceId: `s-${'1'.repeat(24)}`, path: 'intent/secret.md', exclusion: { excluded: true, reason: 'active-content' }, spans: [] };
    const unavailable: GenerationSource = { ...withoutBody, sourceId: `s-${'2'.repeat(24)}`, path: 'intent/missing.md', objectId: null, exclusion: { excluded: true, reason: 'missing-at-revision' }, spans: [] };
    const population = [quoted, pathOnly, excluded, unavailable];
    expect(validateGenerationSources(population)).toHaveLength(4);
    expect(quotableGenerationSources(population)).toEqual([{ sourceId: 'purpose', text: body }]);
    expect(() => validateGenerationSources([{ ...pathOnly, spans: quoted.spans }])).toThrow('unquotable-source');
    expect(() => validateGenerationSources([{ ...excluded, body }])).toThrow('unquotable-source');
    expect(() => validateGenerationSources([{ ...quoted, extra: 'unreviewed' } as GenerationSource])).toThrow('invalid-source');
  });

  it('declares a closed, literal exclusion reason list and refuses any reason or path-derived id outside it', () => {
    const { body: _body, ...withoutBody } = source();
    const row = (reason: unknown, sourceId = `s-${'3'.repeat(24)}`): GenerationSource => ({ ...withoutBody, sourceId, exclusion: { excluded: true, reason: reason as GenerationExclusionReason }, spans: [] });
    expect(GENERATION_EXCLUSION_REASONS).toContain('oversize-source-excluded');
    expect(new Set(GENERATION_EXCLUSION_REASONS).size).toBe(GENERATION_EXCLUSION_REASONS.length);
    for (const reason of GENERATION_EXCLUSION_REASONS) expect(validateGenerationSources([row(reason)]), reason).toHaveLength(1);
    for (const reason of ['', 'r', 'excluded-content', 'ACTIVE-CONTENT', 'active-content ', 7, null, undefined, { toString: () => 'empty-file' }]) {
      expect(() => validateGenerationSources([row(reason)]), String(reason)).toThrow('invalid-source');
    }
    for (const sourceId of ['README.md', 'readme', 'secret', `s-${'3'.repeat(23)}`, `s-${'3'.repeat(25)}`, `s-${'G'.repeat(24)}`, `s-${'3'.repeat(24)}-p1`]) {
      expect(() => validateGenerationSources([row('empty-file', sourceId)]), sourceId).toThrow('invalid-source');
    }
  });

  it('keeps the declaration a plain literal array a static reader can parse', () => {
    const text = readFileSync(new URL('./generation-source.ts', import.meta.url), 'utf8');
    const match = /^export const GENERATION_EXCLUSION_REASONS = \[\n((?:  '[a-z0-9-]+',\n)+)\] as const;$/mu.exec(text);
    expect(match).not.toBeNull();
    expect([...match![1]!.matchAll(/'([a-z0-9-]+)'/gu)].map(entry => entry[1])).toEqual([...GENERATION_EXCLUSION_REASONS]);
  });

  it('rejects forged object binding, offset drift, duplicate anchors and unknown-byte spans', () => {
    const valid = source();
    expect(() => validateGenerationSources([{ ...valid, objectId: 'b'.repeat(40) }])).toThrow('object-mismatch');
    expect(() => validateGenerationSources([{ ...valid, spans: [{ ...valid.spans[0]!, end: 2 }] }])).toThrow('body-mismatch');
    expect(() => validateGenerationSources([{ ...valid, spans: [valid.spans[0]!, valid.spans[0]!] }])).toThrow('duplicate-anchor');
    expect(() => validateGenerationSources([{ ...valid, spans: [{ ...valid.spans[0]!, anchorId: 'unowned' }] }])).toThrow('invalid-anchor');
  });

  it('binds a changed blob to only its own identity', () => {
    const first = source();
    const changed = `${body}One qualification.\n`;
    const changedBase = { ...base, objectId: gitBlobObjectId(changed) };
    const next: GenerationSource = { ...first, objectId: changedBase.objectId, body: changed,
      spans: [{ anchorId: generationAnchorId(changedBase, 0, Buffer.byteLength(changed)), start: 0, end: Buffer.byteLength(changed), text: changed }] };
    expect(validateGenerationSources([next])).toHaveLength(1);
    expect(generationSourceIdentity(changedBase)).not.toBe(generationSourceIdentity(base));
    expect(next.spans[0]?.anchorId).not.toBe(first.spans[0]?.anchorId);
  });
});

describe('byte-order mark', () => {
  it('keeps a leading U+FEFF in a span so a BOM file still validates against its blob', () => {
    const text = '\uFEFFhello\n';
    const [only] = generationSourcesForBody({ sourceId: 'bom', repositoryId: 'repository:fixture', revision: 'a'.repeat(40), path: 'bom.txt',
      objectId: gitBlobObjectId(text), evaluationId: 'e', body: text });
    expect(validateGenerationSources([only!])).toHaveLength(1);
    expect(only!.spans[0]!.text.startsWith('\uFEFF')).toBe(true);
  });
});

describe('oversize bodies', () => {
  const big = `${'line of ordinary text \u00e9\u4e2d!\n'.repeat(9000)}tail`;
  const ident = (text: string) => ({ repositoryId: 'repository:fixture', revision: 'a'.repeat(40), path: 'src/big.c', objectId: gitBlobObjectId(text),
    sourceId: `s-${'4'.repeat(24)}`, evaluationId: 'evaluation:fixture', body: text });

  it('fits a body at the limit whole and splits one character over', () => {
    const at = 'x'.repeat(100_000), over = `${at}y`;
    expect(generationSourcesForBody(ident(at))).toHaveLength(1);
    const pieces = generationSourcesForBody(ident(over));
    expect(pieces.length).toBe(2);
    expect(validateGenerationSources(pieces)).toHaveLength(2);
  });

  it('splits into contiguous, line-aligned, code-point-safe pieces that rejoin to the blob', () => {
    expect([...big].length).toBeGreaterThan(100_000);
    const pieces = segmentBody(big);
    expect(pieces.map(p => p.text).join('')).toBe(big);
    expect(pieces.every(p => [...p.text].length <= 100_000)).toBe(true);
    expect(pieces.slice(0, -1).every(p => p.text.endsWith('\n'))).toBe(true);
    let at = 0;
    for (const p of pieces) { expect(p.start).toBe(at); at = p.end; expect(Buffer.byteLength(p.text)).toBe(p.end - p.start); }
    expect(at).toBe(Buffer.byteLength(big));
  });

  it('produces valid quotable pieces with blob-absolute anchors and unique ids', () => {
    const sources = generationSourcesForBody(ident(big));
    expect(validateGenerationSources(sources)).toHaveLength(sources.length);
    expect(quotableGenerationSources(sources).map(q => q.sourceId)).toEqual(sources.map((_, i) => `s-${'4'.repeat(24)}-p${i + 1}`));
    const second = sources[1]!;
    expect(second.spans[0]!.anchorId.endsWith(`:${second.segment!.start}-${second.segment!.end}`)).toBe(true);
    expect(second.spans[0]!.start).toBe(0);
  });

  it('excludes with a recorded reason when asked, keeping the row counted', () => {
    const [row] = generationSourcesForBody({ ...ident(big), oversize: 'exclude' });
    expect(row).toMatchObject({ exclusion: { excluded: true, reason: 'oversize-source-excluded' }, spans: [] });
    expect(row!.body).toBeUndefined();
    expect(validateGenerationSources([row!])).toHaveLength(1);
    expect(quotableGenerationSources([row!])).toEqual([]);
  });

  it('still rejects a whole body over the limit and any non-contiguous piece set', () => {
    const whole = { ...generationSourcesForBody(ident(`${'x'.repeat(100_000)}y`))[0]! };
    const { segment: _segment, ...unsegmented } = whole;
    const sources = generationSourcesForBody(ident(big));
    expect(() => validateGenerationSources([{ ...unsegmented, body: big, spans: [{ anchorId: 'x', start: 0, end: 1, text: 'x' }] }])).toThrow();
    expect(() => validateGenerationSources(sources.slice(1))).toThrow('invalid-segments');
    expect(() => validateGenerationSources([sources[0]!, ...sources.slice(2)])).toThrow('invalid-segments');
    expect(() => validateGenerationSources([{ ...sources[0]!, segment: { ...sources[0]!.segment!, count: 99 } }, ...sources.slice(1)])).toThrow('invalid-segments');
    const shifted = sources[1]!, gap = shifted.segment!.start + 1, gapEnd = shifted.segment!.end + 1;
    const gapped: GenerationSource = { ...shifted, segment: { ...shifted.segment!, start: gap, end: gapEnd },
      spans: [{ ...shifted.spans[0]!, anchorId: generationAnchorId({ ...shifted, objectId: shifted.objectId! }, gap, gapEnd) }] };
    expect(() => validateGenerationSources([sources[0]!, gapped, ...sources.slice(2)])).toThrow('invalid-segments');
    const whole2 = generationSourcesForBody(ident('small\n'))[0]!;
    expect(() => validateGenerationSources([{ ...sources[0]!, objectId: whole2.objectId, path: whole2.path }, whole2])).toThrow();
    expect(() => validateGenerationSources([{ ...sources[0]!, body: 'short' }, ...sources.slice(1)])).toThrow('body-mismatch');
    expect(() => validateGenerationSources([{ ...sources[0]!, exclusion: { excluded: true, reason: 'r' }, body: undefined, spans: [] } as unknown as GenerationSource, ...sources.slice(1)])).toThrow('invalid-source');
  });
  it('rejects a whole or excluded row of the same blob beside its pieces', () => {
    const sources = generationSourcesForBody(ident(big));
    const [excluded] = generationSourcesForBody({ ...ident(big), sourceId: `s-${'6'.repeat(24)}`, oversize: 'exclude' });
    expect(() => validateGenerationSources([excluded!, ...sources])).toThrow('invalid-segments');
  });

  it('rejects a consistently truncated tail', () => {
    const sources = generationSourcesForBody(ident(big));
    const kept = sources.slice(0, -1).map(piece => ({ ...piece, segment: { ...piece.segment!, count: sources.length - 1 } }));
    expect(kept.length).toBeGreaterThanOrEqual(1);
    expect(() => validateGenerationSources(kept)).toThrow('invalid-segments');
    const lied = sources.map(piece => ({ ...piece, segment: { ...piece.segment!, blobBytes: piece.segment!.blobBytes + 1 } }));
    expect(() => validateGenerationSources(lied)).toThrow('invalid-segments');
    expect(() => validateGenerationSources([sources[0]!, { ...sources[1]!, segment: { ...sources[1]!.segment!, blobBytes: sources[1]!.segment!.blobBytes + 1 } }, ...sources.slice(2)])).toThrow('invalid-segments');
    expect(() => validateGenerationSources([{ ...sources[0]!, segment: { ...sources[0]!.segment!, blobBytes: 1 } }, ...sources.slice(1)])).toThrow();
  });

  it('slices real blob bytes on code-point boundaries with 4-byte characters and CRLF', () => {
    const text = `${'row \u{1F600} \u00e9\u4e2d\r\n'.repeat(20_000)}tail\r\n`;
    const blob = Buffer.from(text, 'utf8');
    const sources = generationSourcesForBody(ident(text));
    expect(sources.length).toBeGreaterThan(1);
    for (const piece of sources) {
      const { start, end } = piece.segment!;
      expect(new TextDecoder('utf-8', { fatal: true }).decode(blob.subarray(start, end))).toBe(piece.body);
    }
    expect(sources.at(-1)!.segment!.end).toBe(blob.length);
    expect(validateGenerationSources(sources)).toHaveLength(sources.length);
  });
});

describe('the run key', () => {
  it('refuses a key shorter than 32 bytes, so no keyed id is derivable from the path alone', () => {
    for (const key of [new Uint8Array(0), Buffer.alloc(16, 1), Buffer.alloc(31, 1)]) {
      expect(() => keyedDigest(key, 'src/a.c')).toThrow('generation run key shorter than 32 bytes');
      expect(() => excludedSourceId(key, 'src/a.c')).toThrow('generation run key shorter than 32 bytes');
    }
  });

  it('accepts a 32-byte key: stable under it, different under another', () => {
    const key = Buffer.alloc(32, 1);
    expect(excludedSourceId(key, 'src/a.c')).toMatch(/^s-[0-9a-f]{24}$/u);
    expect(excludedSourceId(key, 'src/a.c')).toBe(excludedSourceId(Buffer.alloc(32, 1), 'src/a.c'));
    expect(excludedSourceId(key, 'src/a.c')).not.toBe(excludedSourceId(Buffer.alloc(32, 2), 'src/a.c'));
    expect(newGenerationRunKey().byteLength).toBe(32);
  });
});
