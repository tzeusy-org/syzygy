import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { encodeCanonicalJson, generationSourcesForBody } from '@syzygy/polaris-generation-core/live';
import { sha256 } from '@syzygy/support';
import { buildDesignPacket } from './design-review.js';
import { designVerdictSchemaDocument } from './draft-schema.js';
import { buildDossierScreen, type DossierScreen } from './screen.js';
import type { DossierRenderer } from './render.js';
import { createUrlDesignView, createUrlDesignViewWithPolling, verifyUrlDesignView, type UrlDesignViewInput } from './url-design-view.js';
import { screenUrlRenderedSite } from './url-rendered-site-screen.js';

const pin = 'a'.repeat(40), runId = 'run-own-view';
const canonical = (v: unknown): string => encodeCanonicalJson(v, { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 });
let screen: DossierScreen, renderedOriginal: Buffer, smallOriginal: Buffer, actualFiles: ReadonlyMap<string, string>;
const input = (original = smallOriginal): UrlDesignViewInput => ({ original, expected: { runId, pinnedRevision: pin, sha256: sha256(original), bytes: original.byteLength }, screen });
const raw = (value: unknown): Buffer => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
function changeOriginal(change: (v: any) => void): Buffer { const value = JSON.parse(smallOriginal.toString()); change(value); return raw(value); }
function alterView(change: (v: any) => void): Buffer { const value = JSON.parse(Buffer.from(createUrlDesignView(input()).bytes).toString()); change(value); return Buffer.from(canonical(value)); }
function replacePayload(value: any, payload: string): void { value.payload = payload; value.payloadBytes = Buffer.byteLength(payload); value.payloadSha256 = sha256(payload); }
beforeAll(async () => {
  // Own synthetic inputs, actual installed pure renderer. No lane fixtures,
  // subprocesses, provider, foreign repository or saved-HTML producer claim.
  const doc = JSON.parse(fs.readFileSync(new URL('../../../.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json', import.meta.url), 'utf8'));
  doc.detectors.push({ id: 'own-marker', kind: 'literal-fragment', values: ['OWN_SECRET_CANARY'] });
  const builtScreen = buildDossierScreen(Buffer.from(JSON.stringify(doc)), true, null, 'private');
  if (!builtScreen.ok) throw Error(builtScreen.why); screen = builtScreen.screen;
  const body = 'Own pinned source.\n', blob = createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${Buffer.byteLength(body)}\0`), Buffer.from(body)])).digest('hex');
  const sources = generationSourcesForBody({ sourceId: 'src-0123456789abcdef01234567', repositoryId: 'own-renderer', revision: pin, path: 'own.ts', objectId: blob, body, evaluationId: 'own-evaluation' });
  const module = await import(new URL('../../../apps/three-surface-poc/src/polaris-generation/dossier-site.ts', import.meta.url).href) as { renderLocalDossier: DossierRenderer };
  const rendered = module.renderLocalDossier({ sources, local: {
    draft: { title: 'Own dossier', introduction: { id: 'intro', text: 'Own introduction.', sourceIds: [] }, sections: [], diagrams: [], deepDives: [], unresolved: [] },
    withheldTitle: 'Own withheld dossier', draftLayer: { state: 'editorial-draft', inferenceProvenance: { modelIdentity: 'own-model', modelVersion: null, declaredBy: 'operator', label: 'Inferred' } },
    blocks: new Map([['intro', { marking: 'inferred', unknownReason: null, basis: 'Own fixture.', executions: [], segments: [{ kind: 'prose', text: 'Own introduction.' }] }]]),
    glossary: [], disclosure: [], sourceAnchors: new Map(sources.map(source => [source.sourceId, { targetClass: 'evidence-artifact-identifier-with-integrity-digest' as const,
      identifier: blob, algorithm: 'sha1', fragment: null, targetState: pin, pathLabel: 'own.ts' }])), pages: [], reviewStatus: [{ id: 'own-review-status', label: 'Unknown', text: 'Own review unknown.' }],
  } });
  actualFiles = rendered.files;
  const packet = buildDesignPacket({ run: '/own-fixture/run-own-view', runId, pinnedRevision: pin, audience: 'Own readers', files: rendered.files });
  if (!packet.ok) throw Error(packet.reason); renderedOriginal = Buffer.from(packet.bytes);
  // A small shaped original is useful only for adversarial codec inputs. It
  // confers no producer trust; the positive above retains every renderer file.
  const small = JSON.parse(packet.bytes); small.criteria = ['Own criterion.'];
  small.files = [{ path: 'index.html', content: '<p>Own &amp; literal, &lt;script&gt;, "double", \'single\', café \ud83c\udf0d.</p>\n' }, { path: 'machine.json', content: '{"a":"Own","b":" data"}\n' }]
    .map(file => ({ path: file.path, sha256: sha256(file.content), content: file.content }));
  smallOriginal = raw(small);
});

describe('whole-packet URL design representation data', () => {
  it('keeps the exact captured packet across render polling points', async () => {
    const supplied = input(Buffer.from(renderedOriginal));
    const expected = createUrlDesignView(supplied);
    const changed = new Promise<void>(resolve => setImmediate(() => {
      supplied.original[0] = 0;
      resolve();
    }));
    const built = createUrlDesignViewWithPolling(supplied, () => true);
    await changed;
    expect(await built).toEqual(expected);
  });

  it('withholds an inert view when the render lease expires during its final screen', async () => {
    let current = true, screened = false;
    const supplied = input();
    const observed = { ...screen, screenBody: (text: string) => {
      screened = true;
      current = false;
      return screen.screenBody(text);
    } };
    expect(await createUrlDesignViewWithPolling({ ...supplied, screen: observed }, () => current)).toBeNull();
    expect(screened).toBe(true);
  });

  it('admits every actual renderer file through a fully screened inert view while preserving the FAILED raw finding', () => {
    expect(screenUrlRenderedSite(actualFiles, screen)).toEqual({ ok: true, files: 10, pages: 7,
      bytes: [...actualFiles.values()].reduce((total, file) => total + Buffer.byteLength(file), 0) });
    expect(screen.screenBody(renderedOriginal.toString())).toBe('active-content');
    const result = createUrlDesignView(input(renderedOriginal));
    const envelope = JSON.parse(Buffer.from(result.bytes).toString());
    expect(Object.keys(envelope)).toEqual(['encoding', 'format', 'originalBytes', 'originalSha256', 'payload', 'payloadBytes', 'payloadSha256']);
    expect(envelope.format).toBe('polaris-dossier-url-design-inert-view/1'); expect(envelope.encoding).toBe('html-entities-five/1');
    expect(result.kind).toBe('validated-representation-data-only'); expect(result.rawActive).toEqual({ status: 'failed', finding: 'active-content' });
    const original = JSON.parse(renderedOriginal.toString());
    expect(result.files).toBe(original.files.length); expect(result.files).toBe(10); expect(result.pages).toBe(7);
    expect(result.originalSha256).toBe(sha256(renderedOriginal)); expect(result.originalBytes).toBe(renderedOriginal.byteLength);
    expect(result.payloadSha256).toBe(sha256(envelope.payload)); expect(result.payloadBytes).toBe(Buffer.byteLength(envelope.payload));
    expect(result.sha256).toBe(sha256(result.bytes)); expect(result.byteLength).toBe(result.bytes.byteLength);
    expect(screen.screenBody(Buffer.from(result.bytes).toString())).toBeUndefined(); expect(screen.screenSecrets(Buffer.from(result.bytes).toString())).toBeUndefined();
    expect(screen.screenBody(Object.values(envelope).filter(v => typeof v === 'string').join(''))).toBeUndefined();
    expect(verifyUrlDesignView({ ...input(renderedOriginal), view: result.bytes }).sha256).toBe(result.sha256);
    // Independent test decoder, exactly once. No regex or table shared with codec.
    const recovered = envelope.payload.replace(/&(amp|lt|gt|quot|#39);/gu, (_: string, token: string) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" })[token]);
    expect(Buffer.from(recovered).equals(renderedOriginal)).toBe(true);
    expect(Object.hasOwn(result, 'original')).toBe(false); expect(Object.hasOwn(result, 'receipt')).toBe(false);
  });
  it('preserves literal entities, all five characters, Unicode and newline bytes with exactly one inverse', () => {
    const result = createUrlDesignView(input()), value = JSON.parse(Buffer.from(result.bytes).toString());
    expect(value.payload).toContain('&amp;amp;'); expect(value.payload).toContain('&amp;lt;script&amp;gt;');
    expect(value.payload).toContain('&quot;'); expect(value.payload).toContain('&#39;'); expect(value.payload).toContain('café');
    expect(verifyUrlDesignView({ ...input(), view: result.bytes }).originalSha256).toBe(sha256(smallOriginal));
    const widePin = 'a'.repeat(64), wide = changeOriginal(v => { v.pinnedRevision = widePin; v.verdictSchema = designVerdictSchemaDocument({ pinnedRevision: widePin }); });
    const bound = { ...input(wide), expected: { ...input(wide).expected, pinnedRevision: widePin } };
    const view = createUrlDesignView(bound); expect(verifyUrlDesignView({ ...bound, view: view.bytes }).originalSha256).toBe(sha256(wide));
    const interior = changeOriginal(v => { v.criteria = [`Own ${String.fromCharCode(0xfeff)} data\r\nwith CRLF.`]; });
    const preserved = createUrlDesignView(input(interior));
    expect(verifyUrlDesignView({ ...input(interior), view: preserved.bytes }).originalSha256).toBe(sha256(interior));
  });
  it('refuses unmatched code fences and unsafe Markdown URLs even after reversible encoding', () => {
    for (const text of ['`unmatched', '[Own](javascript:alert(1))']) {
      const bytes = changeOriginal(v => { v.criteria = [text]; });
      expect(() => createUrlDesignView(input(bytes))).toThrow('inert-screen');
    }
  });
  it('detects a policy signature introduced by the inert encoding', () => {
    const policy = JSON.parse(fs.readFileSync(new URL('../../../.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json', import.meta.url), 'utf8'));
    const signature = '&quot;format&quot;';
    policy.detectors.push({ id: 'own-encoding-marker', kind: 'literal-fragment', values: [signature] });
    const loaded = buildDossierScreen(Buffer.from(JSON.stringify(policy)), true, null, 'private');
    if (!loaded.ok) throw Error(loaded.why);
    const valid = createUrlDesignView(input());
    expect(loaded.screen.screenSecrets(smallOriginal.toString())).toBeUndefined();
    expect(loaded.screen.screenBody(Buffer.from(valid.bytes).toString())).toBe('secret-detector-match');
    const bound = { ...input(), screen: loaded.screen };
    expect(() => createUrlDesignView(bound)).toThrow('secret');
    expect(() => verifyUrlDesignView({ ...bound, view: valid.bytes })).toThrow('secret');
  });
  it('screens raw, JSON-decoded, per-file and cross-file/value/key compositions before entity encoding', () => {
    const variants = [
      changeOriginal(v => { v.criteria = ['OWN_SECRET_CANARY']; }),
      changeOriginal(v => { v.criteria = ['OWN_SECRET_', 'CANARY']; }),
      changeOriginal(v => { v.files.push({ path: 'own-a.txt', content: 'OWN_SECRET_' }, { path: 'own-b.txt', content: 'CANARY' }); }),
      changeOriginal(v => { v.files[1].content = '{"a":"OWN_SECRET_","b":"CANARY"}\n'; }),
      changeOriginal(v => { v.files[1].content = '{"OWN_SECRET_":"CANARY"}\n'; }),
    ];
    for (const bytes of variants) {
      const value = JSON.parse(bytes.toString()); value.files = value.files.map((file: { path: string; content: string }) => ({ path: file.path, sha256: sha256(file.content), content: file.content }));
      expect(() => createUrlDesignView(input(raw(value)))).toThrow('secret');
    }
    const escaped = changeOriginal(v => { v.criteria = ['OWN_SECRET_CANARY']; }).toString().replace('OWN_SECRET_CANARY', '\\u004fWN_SECRET_CANARY');
    // Exact original pretty serialization also refuses an alternate escape.
    expect(() => createUrlDesignView(input(Buffer.from(escaped)))).toThrow();
    const embedded = changeOriginal(v => { v.files[1].content = '{"a":"\\u004fWN_SECRET_CANARY"}\n'; v.files[1].sha256 = sha256(v.files[1].content); });
    expect(() => createUrlDesignView(input(embedded))).toThrow('secret');
  });
  it('refuses malformed raw UTF-8/BOM/NUL, duplicate keys, non-builder serialization and invalid embedded JSON', () => {
    for (const original of [Buffer.concat([Buffer.from([0xff]), smallOriginal]), Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), smallOriginal]),
      Buffer.from(`${smallOriginal.toString()}\0`), Buffer.from(smallOriginal.toString().replace('"kind": "design",', '"kind": "design",\n  "kind": "design",')),
      Buffer.from(JSON.stringify(JSON.parse(smallOriginal.toString()))), changeOriginal(v => { v.files[1].content = '{"a":0,"a":1}'; v.files[1].sha256 = sha256(v.files[1].content); }),
      changeOriginal(v => { v.criteria = ['\u0000']; }), changeOriginal(v => { v.criteria = ['\ud800']; })]) {
      expect(() => createUrlDesignView(input(original))).toThrow();
    }
  });
  it('requires the exact run/pin/kind/closed schema, full sorted file identity and pinned verdict schema', () => {
    for (const mutate of [(v: any) => { v.extra = 1; }, (v: any) => { v.kind = 'fidelity'; }, (v: any) => { v.runId = 'other'; },
      (v: any) => { v.pinnedRevision = 'b'.repeat(40); }, (v: any) => { v.region.excluded = 'selected pages'; },
      (v: any) => { v.files[0].sha256 = '0'.repeat(64); }, (v: any) => { v.files.reverse(); }, (v: any) => { v.files.push(v.files[1]); },
      (v: any) => { v.files.pop(); }, (v: any) => { v.files[0].path = '../own.html'; }, (v: any) => { v.files[0].extra = 1; },
      (v: any) => { v.verdictSchema.extra = 1; }]) expect(() => createUrlDesignView(input(changeOriginal(mutate)))).toThrow('packet');
    expect(() => createUrlDesignView({ ...input(), expected: { ...input().expected, sha256: '0'.repeat(64) } })).toThrow('identity');
    expect(() => createUrlDesignView({ ...input(), expected: { ...input().expected, bytes: smallOriginal.length + 1 } })).toThrow('identity');
  });
  it('rejects unknown/duplicate/noncanonical envelope keys, bad hashes/counts and alternate encoding claims', () => {
    for (const mutate of [(v: any) => { v.extra = 1; }, (v: any) => { delete v.payload; }, (v: any) => { v.encoding = 'base64'; },
      (v: any) => { v.format = 'other'; }, (v: any) => { v.originalBytes++; }, (v: any) => { v.originalSha256 = '0'.repeat(64); },
      (v: any) => { v.payloadBytes++; }, (v: any) => { v.payloadSha256 = '0'.repeat(64); }, (v: any) => { v.payloadBytes = Number.MAX_SAFE_INTEGER; }]) {
      expect(() => verifyUrlDesignView({ ...input(), view: alterView(mutate) })).toThrow('envelope');
    }
    const valid = createUrlDesignView(input()).bytes, text = Buffer.from(valid).toString();
    for (const view of [Buffer.from(`${text}\n`), Buffer.from(text.replace('{', '{"format":"other",')), Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), valid])])
      expect(() => verifyUrlDesignView({ ...input(), view })).toThrow();
  });
  it('independently rejects token aliases, recursive/double encoding, numeric/base64 fallbacks and changed or omitted original bytes', () => {
    for (const mutate of [(v: any) => replacePayload(v, v.payload.replace('&quot;', '&#34;')),
      (v: any) => replacePayload(v, v.payload.replace('&quot;', '&QUOT;')), (v: any) => replacePayload(v, v.payload.replace('&quot;', '"')),
      (v: any) => replacePayload(v, v.payload.replace('&amp;amp;', '&amp;')), (v: any) => replacePayload(v, v.payload.replace('Own criterion.', 'Other criterion.')),
      (v: any) => replacePayload(v, Buffer.from(smallOriginal).toString('base64')),
      (v: any) => replacePayload(v, v.payload.replace(/&/gu, '&amp;'))]) {
      expect(() => verifyUrlDesignView({ ...input(), view: alterView(mutate) })).toThrow();
    }
    const result = createUrlDesignView(input()), changed = changeOriginal(v => { v.criteria = ['Other criterion.']; });
    expect(() => verifyUrlDesignView({ ...input(changed), view: result.bytes })).toThrow('envelope');
    // A matching claimed hash is insufficient without matching genuine bytes.
    expect(() => verifyUrlDesignView({ ...input(), original: changed, view: result.bytes })).toThrow('identity');
  });
  it('uses positive lower-only caps, predicts expansion, and refuses file/node/depth and envelope limits without fallback', () => {
    const result = createUrlDesignView(input());
    const exact = { originalBytes: smallOriginal.length, payloadBytes: result.payloadBytes, envelopeBytes: result.byteLength, files: 2 };
    expect(createUrlDesignView({ ...input(), limits: exact }).sha256).toBe(result.sha256);
    for (const limits of [{ originalBytes: smallOriginal.length - 1 }, { payloadBytes: result.payloadBytes - 1 }, { envelopeBytes: result.byteLength - 1 },
      { files: 1 }, { nodes: 10 }, { depth: 1 }, { payloadBytes: 0 }, { nodes: -1 }, { depth: 33 }, { originalBytes: 2_097_153 }, { envelopeBytes: Infinity }, { files: 1.5 }, { extra: 1 }])
      expect(() => createUrlDesignView({ ...input(), limits: limits as never })).toThrow();
    expect(() => verifyUrlDesignView({ ...input(), view: result.bytes, limits: { envelopeBytes: result.byteLength - 1 } })).toThrow('limits');
  });
  it('re-screens the final whole envelope and decoded/composed fields with the unchanged caller screen', () => {
    const calls: string[] = [], real = screen;
    const wrapped = { ...real, screenBody(text: string) { calls.push(text); return real.screenBody(text); } };
    const result = createUrlDesignView({ ...input(), screen: wrapped }), text = Buffer.from(result.bytes).toString();
    const envelope = JSON.parse(text);
    expect(calls).toContain(text); expect(calls).toContain(envelope.payload);
    expect(calls).toContain(Object.entries(envelope).flatMap(([k, v]) => typeof v === 'string' ? [k, v] : [k]).join(''));
    const marker = { ...real, screenBody(s: string) { return s === text ? 'active-content' as const : real.screenBody(s); } };
    expect(() => verifyUrlDesignView({ ...input(), screen: marker, view: result.bytes })).toThrow('inert-screen');
  });
});
