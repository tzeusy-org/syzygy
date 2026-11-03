import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { admittedSourcesDigest, fidelity } from './dossier-evaluation.js';
import { generationAnchorId, generationSourcesForBody, generationSourcesForRedactedBody, generationSourceTextAt, generationSpanRange,
  gitBlobObjectId, quotableGenerationSources, validateGenerationSources, validateGenerationSourceTransport, verifiedRedactedBody, type GenerationSource } from './generation-source.js';
import { checkBlockQuotes, sourceTextById } from './quote-fidelity.js';
import { compileEveryOffsetMatcher, readSecretRedaction, redactBody, type RedactionDetector } from './secret-redaction.js';
import { runGenerationPipeline, type PipelinePorts, type PipelineRequest } from './pipeline.js';
import type { DossierManifest } from './dossier-evaluation.js';

const policy = readFileSync(new URL('../../../.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json', import.meta.url), 'utf8');
const doc = JSON.parse(policy);
// Since version 5 the scope's own detectors join the policy's for this scope, and wholeArtifactDetectors names two of them.
const detectors: RedactionDetector[] = [...doc.detectors, ...doc.publicSourceScope.scopeDetectors.detectors];
const read = readSecretRedaction(doc.publicSourceScope, detectors.map((d) => d.id));
if (!read.ok || read.redaction === null) throw Error('fixture policy');
const matcher = compileEveryOffsetMatcher(detectors);
const screen = (body: string) => redactBody(body, 'project-documentation', matcher, read.redaction);
const BODY = 'a\rg\ntoken=abcdefghij\nh\nvisible\nlast\n';
const identity = { sourceId: 'doc', repositoryId: 'repository:fixture', revision: 'a'.repeat(40), path: 'docs/mixed.txt',
  objectId: gitBlobObjectId(BODY), evaluationId: 'evaluation:fixture' };
const make = (body = BODY, oversize: 'split' | 'exclude' = 'split') => generationSourcesForRedactedBody({ ...identity, objectId: gitBlobObjectId(body),
  projection: verifiedRedactedBody(body, gitBlobObjectId(body), identity.path, screen), policySha256: createHash('sha256').update(policy).digest('hex'), oversize });
const transport = (sources: readonly GenerationSource[]) => JSON.parse(JSON.stringify(sources)) as GenerationSource[];

describe('redacted Git source fidelity and safe transport', () => {
  it('retains the original object and mixed-ending coordinates, with marker text outside evidence spans', () => {
    const sources = make(), source = sources[0]!;
    expect(validateGenerationSources(sources)).toHaveLength(1);
    expect(source.objectId).toBe(identity.objectId);
    expect(source.body).toBe('a\r[redacted-span: 3 withheld line(s) in this file]\nvisible\nlast\n');
    expect(source.redaction).toMatchObject({ redactionClass: 'redacted-span', withheldLines: 3, withheld: [2, 3, 4], originalLines: 6, originalBytes: 36 });
    expect(source.spans.map(span => [span.start, span.end, span.text, span.original])).toEqual([
      [0, 2, 'a\r', { start: 0, startLine: 1, endLine: 1 }],
      [51, 64, 'visible\nlast\n', { start: 23, startLine: 5, endLine: 6 }],
    ]);
    expect(source.spans.map(span => generationSpanRange(source, span))).toEqual([[0, 2], [23, 36]]);
    expect(source.spans[1]!.anchorId).toBe(generationAnchorId(identity, 23, 36));
    expect(generationSourceTextAt(source, 31, 35)).toBe('last');
    const bomBody = '\uFEFFVisible\n';
    const ordinary = generationSourcesForBody({ ...identity, objectId: gitBlobObjectId(bomBody), body: bomBody })[0]!;
    expect(validateGenerationSources([ordinary])).toHaveLength(1);
    expect(generationSourceTextAt(ordinary, 0, 11)).toBe('\uFEFFVisible\n');
    const bomRetained = make(BODY.replace('visible', '\uFEFFvisible'))[0]!;
    expect(generationSourceTextAt(bomRetained, 23, 33)).toBe('\uFEFFvisible');
    expect(generationSourceTextAt(source, 1, 24)).toBeUndefined();
    expect(JSON.stringify(sources)).not.toContain('abcdefghij');
    expect(JSON.stringify(sources)).not.toContain('token=');
    expect(quotableGenerationSources(sources)).toEqual([{ sourceId: 'doc', text: source.body, redaction: { redactionClass: 'redacted-span', withheldLines: 3 } }]);
  });

  it('verifies original bytes in the constructor, and ordinary sources retain their full-body object binding', () => {
    expect(() => verifiedRedactedBody(BODY + 'wrong', identity.objectId, identity.path, screen)).toThrow('object-mismatch');
    expect(() => verifiedRedactedBody(BODY, identity.objectId, identity.path, raw => {
      const got = screen(raw); if (got.kind !== 'redacted') throw Error('fixture');
      return { ...got, retainedLines: ['forged\r', ...got.retainedLines.slice(1)] };
    })).toThrow('body-mismatch');
    expect(() => generationSourcesForRedactedBody({ ...identity, projection: { ...verifiedRedactedBody(BODY, identity.objectId, identity.path, screen) }, policySha256: 'f'.repeat(64) })).toThrow('object-mismatch');
    expect(() => validateGenerationSources(generationSourcesForBody({ ...identity, body: 'arbitrary safe text' }))).toThrow('object-mismatch');
  });

  it('never grants pure evaluation or quotation fidelity to a JSON claim of redaction', () => {
    const untrusted = transport(make());
    expect(validateGenerationSourceTransport(untrusted)).toHaveLength(1);
    expect(() => validateGenerationSources(untrusted)).toThrow('object-mismatch');
    expect(() => sourceTextById(untrusted)).toThrow('object-mismatch');
    expect(() => generationSourceTextAt(untrusted[0]!, 31, 35)).toThrow('object-mismatch');
    expect(() => admittedSourcesDigest(untrusted)).toThrow('object-mismatch');
    expect(() => fidelity({ pages: [] } as unknown as DossierManifest, new Map(), untrusted)).toThrow('object-mismatch');
  });

  it('quotes surviving runs, refusing marker quotations and joins across withheld original lines', () => {
    const texts = sourceTextById(make());
    expect(checkBlockQuotes({ id: 'kept', text: 'The project states: "visible last"', sourceIds: ['doc'] }, texts)).toEqual([]);
    expect(checkBlockQuotes({ id: 'join', text: 'The project states: "a visible"', sourceIds: ['doc'] }, texts).map(f => f.kind)).toEqual(['quote-not-in-cited-sources']);
    expect(checkBlockQuotes({ id: 'marker', text: 'The project states: "redacted-span"', sourceIds: ['doc'] }, texts).map(f => f.kind)).toEqual(['quote-not-in-cited-sources']);
  });

  it('splits only retained material, preserves original anchors and emits one complete marker per withheld run', () => {
    const large = 'before\n' + 'token=abcdefghij\n' + 'guard\n' + 'z'.repeat(100_010) + '\n';
    const sources = make(large);
    expect(sources).toHaveLength(2);
    expect(validateGenerationSources(sources)).toHaveLength(2);
    expect(sources.map(source => source.body).join('').match(/\[redacted-span: 3 withheld line\(s\) in this file\]/gu)).toHaveLength(1);
    expect(sources.flatMap(source => source.spans).map(span => [span.original!.start, span.text.length])).toEqual([[30, 99_951], [99_981, 60]]);
    expect(JSON.stringify(sources)).not.toContain('abcdefghij');
    expect(make(large, 'exclude')[0]).toMatchObject({ exclusion: { excluded: true, reason: 'oversize-source-excluded' }, spans: [] });
  });

  it('replays JSON only against a fresh verified population, rejecting forged content, metadata and object identity before dispatch', async () => {
    const original = make();
    const request = (sources: readonly GenerationSource[]): PipelineRequest => ({ requestId: 'redacted-run', projectId: 'fixture', snapshotId: 'snapshot', startedAt: Date.now(),
      routes: { inventory: 'fixture', plan: 'fixture', author: 'fixture', edit: 'fixture', fidelity: 'fixture', repair: 'fixture' }, sources,
      readerQuestions: [{ id: 'why', topics: [], text: 'Why?' }], requestedAssets: [], budget: { maxCalls: 5, maxInputBytes: 200_000, maxOutputBytes: 10_000, maxUsageUnits: 20, maxElapsedMs: 10_000, maxRepairCycles: 0, accountingPolicy: 'fixture' } });
    const sends: string[] = [];
    const ports: PipelinePorts = { now: Date.now, verifySources: async () => make(), permissionIdentity: async () => 'fixture',
      admit: async input => ({ kind: 'reserved', permit: { attemptId: String(input.ordinal), maxUsageUnits: 1, maxOutputBytes: 1_000 } }),
      permitted: async () => true, releaseUnsent: async () => undefined, responseSchema: () => ({ version: 'fixture', schema: {} }),
      generate: async input => { sends.push(input.input); return { body: '{}', model: 'fixture', usageUnits: 1 }; },
      validate: (_stage, data) => data, record: async () => undefined, lateReceipt: async () => undefined, fidelity: () => ({ blocking: false, findings: [] }) };
    expect(await runGenerationPipeline(request(transport(original)), { ...ports, verifySources: async () => true }, new AbortController().signal)).toMatchObject({ status: 'stopped', reason: 'source-refused' });
    const forgeries = [
      (source: GenerationSource) => ({ ...source, redaction: { ...source.redaction!, withheldLines: 2, withheld: [2, 3] } }),
      (source: GenerationSource) => ({ ...source, objectId: 'b'.repeat(40), spans: source.spans.map(span => ({ ...span, anchorId: span.anchorId.replace(identity.objectId, 'b'.repeat(40)) })) }),
      (source: GenerationSource) => { const body = source.body!.replace('visible', 'fiction'); return { ...source, body, redaction: { ...source.redaction!, retainedSha256: createHash('sha256').update(body).digest('hex') }, spans: source.spans.map(span => ({ ...span, text: span.text.replace('visible', 'fiction') })) }; },
      (source: GenerationSource) => ({ ...source, redaction: { ...source.redaction!, policySha256: 'b'.repeat(64) } }),
    ];
    for (const forge of forgeries) expect(await runGenerationPipeline(request([forge(transport(original)[0]!)]), ports, new AbortController().signal)).toMatchObject({ status: 'stopped', reason: 'source-refused' });
    expect(sends).toHaveLength(0);
    const replay = await runGenerationPipeline(request(transport(original)), ports, new AbortController().signal);
    expect(replay.status).toBe('awaiting-rendered-review');
    expect(sends).toHaveLength(5);
    expect(sends.join('\n')).not.toContain('abcdefghij');
    expect(sends[0]).toContain('[redacted-span: 3 withheld line(s) in this file]');
  });
});
