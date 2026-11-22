import * as fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire, syncBuiltinESMExports } from 'node:module';
import { deflateSync } from 'node:zlib';
import { describe, expect, it, vi } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { sha256 } from '@syzygy/support';
import { encodeCanonicalJson, generationSourcesForBody } from '@syzygy/polaris-generation-core/live';
import { buildDossierScreen } from './screen.js';
import { parseRunConfig } from './run-config.js';
import { DOSSIER_CONTENT_CLASSES, NO_WORK_ITEM_REASON, recordRunConfig, sourceBindingSha256 } from './run-record.js';
import type { SessionAdmission } from './session-egress-policy.js';
import type { SessionToolsReceipt } from './session-tools.js';
import * as objectReader from './git-object-reader.js';
import { createUrlOriginLedger, type UrlOriginLedgerOptions, type UrlOriginReceipt, type UrlWholeSourceBody } from './url-origin-ledger.js';
import { verifyUrlRenderedSources } from './url-rendered-source-proof.js';

const canonical = (value: unknown): string => encodeCanonicalJson(value, { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 });
const bytes = (text: string) => Buffer.from(text);
function fixture(sourceText = 'Own source line one.\nOwn source line two.\n', file = 'own.ts', visibility: 'public' | 'private' = 'private') {
  const root = tempDir('url-origin-'), clone = path.join(root, 'own-clone'), git = path.join(clone, '.git');
  const object = (kind: string, body: Buffer): string => {
    const raw = Buffer.concat([Buffer.from(`${kind} ${body.length}\0`), body]), digest = createHash('sha1').update(raw).digest('hex');
    const file = path.join(git, 'objects', digest.slice(0, 2), digest.slice(2)); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, deflateSync(raw)); return digest;
  };
  const blob = object('blob', bytes(sourceText)), tree = object('tree', Buffer.concat([bytes(`100644 ${file}\0`), Buffer.from(blob, 'hex')]));
  const commit = object('commit', bytes(`tree ${tree}\nauthor Own <own@example.invalid> 0 +0000\ncommitter Own <own@example.invalid> 0 +0000\n\nOwn fixture.\n`));
  const policy = JSON.parse(fs.readFileSync(new URL('../../../.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json', import.meta.url), 'utf8'));
  policy.detectors.push({ id: 'own-test-detector', kind: 'literal-fragment', values: ['OWN_SECRET_CANARY'] });
  const basePolicyBytes = bytes(JSON.stringify(policy)), loaded = buildDossierScreen(basePolicyBytes, true, null, visibility); if (!loaded.ok) throw Error(loaded.why);
  const originBytes = fs.readFileSync(new URL('../../../openspec/changes/dossier-url-declared-source-run/proposed/policies/POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1.json', import.meta.url));
  const parsed = parseRunConfig(JSON.stringify({ operator: 'own-operator', agentTool: 'claude-code', agentToolVersion: '2.1.327', agentProvider: 'anthropic', model: 'claude-sonnet-4-6', deadline: 'PT1H', agentTokenBudget: 1000, agentTurnBudget: 10, maxRepairCycles: 1, maxQuestions: 1, audience: 'Own fixture', operatorIsOwner: false })); if (!parsed.ok) throw Error('config');
  const binding = { path: '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json', commit: 'a'.repeat(40), policyId: policy.policyId, policyVersion: policy.policyVersion, sha256: sha256(basePolicyBytes) };
  const record = recordRunConfig(parsed.config, { repository: { url: 'own.example.invalid/source', repositoryId: 'own', role: 'observed-source' }, clone: { path: clone, declaredBy: 'operator', label: 'Inferred', use: 'read' }, pinnedRevision: { commit, label: 'own', pinnedAt: '2026-11-19T00:00:00.000Z' }, screeningPolicy: binding, contentClasses: DOSSIER_CONTENT_CLASSES, visibility: { value: visibility, source: 'declaration', declaredBy: 'own', label: 'Inferred' }, governed: { kind: 'non-governed', because: ['own'] }, workItem: { identity: null, reason: NO_WORK_ITEM_REASON } });
  let current = true;
  const options: UrlOriginLedgerOptions = { runId: 'own-run', record, screen: loaded.screen, basePolicyBytes,
    originPolicy: { binding: { path: '.syzygy/governance/policies/POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1.json', commit: 'a'.repeat(40), policyId: 'POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1', policyVersion: '1.0.0', sha256: sha256(originBytes) }, bytes: originBytes }, current: () => current,
    fixed: [{ id: 'origin:policy', kind: 'policy', bytes: bytes('Own fixed no-execution instructions.') }, { id: 'origin:structure', kind: 'structure', bytes: bytes('{"kind":"own-structure"}') }, { id: 'origin:control', kind: 'run-control', bytes: bytes('{"operation":"own-control"}') }],
    schemas: { draft: value => !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).join(',') === 'draft', inventory: value => !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).join(',') === 'inventory' } };
  return { options, ledger: createUrlOriginLedger(options), blob, tree, commit, clone, sourceText, file, stale: () => { current = false; } };
}
function roots(f: ReturnType<typeof fixture>) { return f.options.fixed.map(value => f.ledger.fixed(value.id, value.bytes)); }
function hostReceipt(f: ReturnType<typeof fixture>, role: 'author' | 'inventory', toolName: SessionToolsReceipt['toolName'], toolInput: Record<string, unknown>, reply: unknown): SessionToolsReceipt {
  const canonicalText = canonical(reply);
  return { binding: { run: 'own-run', role, sourceBinding: sourceBindingSha256(f.options.record.subject), policy: f.options.screen.policySha256, provider: 'anthropic', model: 'claude-sonnet-4-6' }, id: `tool-${sha256(canonical([toolInput, reply]))}`, kind: 'tool-result', toolName, toolInput, canonicalText, classes: ['code-content'], originIds: ['ARBITRARY_RECEIPT_TAG_IS_NOT_AUTHORITY'], digest: sha256(canonicalText), bytes: Buffer.byteLength(canonicalText) };
}

describe('host-owned URL origin ledger', () => {
  it('issues genuine opaque local receipts and rejects copied, foreign, changed or absent parents', () => {
    const f = fixture(), other = fixture(), receipt = roots(f)[0]!;
    expect(f.ledger.origins(receipt, f.options.fixed[0]!.bytes).classes).toEqual(['governance-text']);
    for (const forged of [{}, { ...receipt }, roots(other)[0]] as UrlOriginReceipt[]) expect(() => f.ledger.compose(bytes('Own composed input.'), [forged])).toThrow('url-origin-refused');
    expect(() => f.ledger.compose(bytes('Own'), [])).toThrow('url-origin-refused');
    expect(() => f.ledger.origins(receipt, bytes('Own changed'))).toThrow('url-origin-refused');
    expect(() => f.ledger.fixed('origin:unknown', bytes('Own'))).toThrow('url-origin-refused');
    expect(() => createUrlOriginLedger({ ...f.options, fixed: [{ ...f.options.fixed[0]!, kind: 'evidence-content' as never }] })).toThrow('url-origin-refused');
  });
  it('returns a read-only receipt batch after exact bytes and final authority are checked', () => {
    const f = fixture(), [policy, structure] = roots(f);
    const subject = f.options.fixed[0]!.bytes;
    expect(f.ledger.inspectMetadata([{ receipt: policy!, bytes: subject }, { receipt: structure! }]))
      .toEqual([f.ledger.metadata(policy!), f.ledger.metadata(structure!)]);
    expect(() => f.ledger.inspectMetadata([{ receipt: policy!, bytes: bytes('Own changed') }])).toThrow('url-origin-refused');
    expect(() => f.ledger.inspectMetadata([{ receipt: roots(fixture())[0]! }])).toThrow('url-origin-refused');
    expect(() => f.ledger.inspectMetadata([{
      receipt: policy!, get bytes() { f.stale(); return subject; },
    }])).toThrow('url-origin-refused');
  });
  it('retains transitive actual class unions with valid earlier declaration edges, without all-seven widening', () => {
    const f = fixture(), [policy, structure, control] = roots(f);
    const first = f.ledger.compose(bytes('Own first composed input.'), [policy!, structure!]);
    const second = f.ledger.compose(bytes('Own second composed input.'), [first, control!]);
    expect(f.ledger.metadata(second).classes).toEqual(['code-structure', 'derived-composites', 'governance-text', 'work-history']);
    const prior = new Map<string, readonly string[]>();
    for (const entry of f.ledger.plannedOrigins()) { for (const parent of entry.originIds) expect(prior.has(parent)).toBe(true); prior.set(entry.id, entry.classes); }
    expect(f.ledger.plannedOrigins().at(-1)!.originIds).toContain(f.ledger.metadata(first).id);
    expect(JSON.stringify(f.ledger.metadata(second))).not.toContain('Own second');
  });
  it('screens raw, decoded, cross-field and active-content composition without source-extension exemptions', () => {
    const f = fixture(), parent = roots(f)[0]!;
    for (const text of ['OWN_SECRET_CANARY', '{"x":"OWN_\\u0053ECRET_CANARY"}', '{"x":"OWN_","y":"SECRET_CANARY"}', '<script>Own</script>', '{"x":"<scr","y":"ipt>Own</script>"}']) {
      expect(() => f.ledger.compose(bytes(text), [parent]), text).toThrow('url-origin-refused');
    }
    expect(() => f.ledger.compose(Uint8Array.from([0xff]), [parent])).toThrow();
  });
  it('rehashes pinned commit/path/blob and keeps the base source treatment separate from arbitrary composed text', async () => {
    const f = fixture('const own = "<script>Own</script>";\n');
    const receipt = await f.ledger.sourceSpan({ path: 'own.ts', offset: 0, limit: 1 });
    expect(f.ledger.origins(receipt, bytes(f.sourceText)).classes).toEqual(['code-content', 'code-structure']);
    expect(() => f.ledger.compose(bytes(f.sourceText), [receipt])).toThrow('url-origin-refused');
    expect(() => f.ledger.bindArtifact({ role: 'author', path: 'drafts/next.json', bytes: bytes(f.sourceText), receipt })).toThrow('url-origin-refused');
    expect(JSON.stringify(f.ledger.metadata(receipt))).not.toContain(f.blob);
    await expect(f.ledger.sourceSpan({ path: '../own.ts' })).rejects.toThrow('url-origin-refused');
    fs.writeFileSync(path.join(f.clone, '.git/objects', f.blob.slice(0, 2), f.blob.slice(2)), deflateSync(bytes('blob 7\0changed')));
    await expect(f.ledger.sourceSpan({ path: 'own.ts' })).rejects.toThrow('url-origin-refused');
    const excluded = fixture('OWN_SECRET_CANARY'); await expect(excluded.ledger.sourceSpan({ path: 'own.ts' })).rejects.toThrow('url-origin-refused');
    const packed = fixture(); fs.mkdirSync(path.join(packed.clone, '.git/objects/pack')); fs.writeFileSync(path.join(packed.clone, '.git/objects/pack', 'own.idx'), 'Own unsupported packed profile');
    await expect(packed.ledger.sourceSpan({ path: 'own.ts' })).rejects.toThrow('url-origin-refused');

  });
  it('authenticates exact complete byte coverage beyond 2000 lines without accepting span assertions or extending raw active treatment', async () => {
    const text = 'Own line.\r\n'.repeat(2001) + 'const own = "<script>Own</script>"; // tail \u00e9\n';
    const f = fixture(text), supplied = bytes(text), pristine = bytes(text);
    const pending = f.ledger.verifyWholeSourceBody({ path: f.file, objectId: f.blob, bytes: supplied }); supplied[supplied.length - 2] = 0x58;
    const capability = await pending, whole = f.ledger.inspectWholeSourceBody(capability);
    expect(whole).toMatchObject({ runId: 'own-run', sourceBindingSha256: sourceBindingSha256(f.options.record.subject), path: f.file, objectId: f.blob,
      pinnedCommit: f.commit, policies: { baseSha256: f.options.screen.policySha256, originSha256: f.options.originPolicy.binding.sha256 },
      range: { start: 0, end: pristine.length }, digest: sha256(pristine), bytes: pristine.length, classes: ['code-content', 'code-structure'] });
    expect(f.ledger.origins(whole.origin, pristine).classes).toEqual(['code-content', 'code-structure']);
    expect(Object.isFrozen(whole.range)).toBe(true); expect(JSON.stringify(whole)).not.toContain('tail');
    expect(await f.ledger.verifyWholeSourceBody({ path: f.file, objectId: f.blob, bytes: pristine })).toBe(capability);
    expect(await f.ledger.sourceWhole({ path: f.file })).toBe(whole.origin);
    expect(() => f.ledger.metadata({ ...whole.origin })).toThrow('url-origin-refused');
    await expect(f.ledger.sourceWhole({ path: '../own.ts' })).rejects.toThrow('url-origin-refused');
    await expect(f.ledger.sourceWhole({ path: f.file, bytes: pristine } as never)).rejects.toThrow('url-origin-refused');
    const span = await f.ledger.sourceSpan({ path: f.file, offset: 0, limit: 2000 });
    for (const forged of [{}, { ...capability }, whole, span, { path: f.file, objectId: f.blob, range: whole.range, digest: whole.digest }] as UrlWholeSourceBody[]) {
      expect(() => f.ledger.inspectWholeSourceBody(forged)).toThrow('url-origin-refused');
    }
    expect(() => fixture().ledger.inspectWholeSourceBody(capability)).toThrow('url-origin-refused');
    for (const invalid of [pristine.subarray(0, pristine.length - 1), supplied]) await expect(f.ledger.verifyWholeSourceBody({ path: f.file, objectId: f.blob, bytes: invalid })).rejects.toThrow('url-origin-refused');
    await expect(f.ledger.verifyWholeSourceBody({ path: f.file, objectId: fixture('Own different blob.').blob, bytes: pristine })).rejects.toThrow('url-origin-refused');
    await expect(f.ledger.verifyWholeSourceBody({ path: '../own.ts', objectId: f.blob, bytes: pristine })).rejects.toThrow('url-origin-refused');
    await expect(f.ledger.verifyWholeSourceBody({ path: f.file, objectId: `${f.blob}\n`, bytes: pristine })).rejects.toThrow('url-origin-refused');
    expect(() => f.ledger.origins(whole.origin, supplied)).toThrow('url-origin-refused');
    expect(() => f.ledger.compose(pristine, [whole.origin])).toThrow('url-origin-refused');
    expect(() => f.ledger.bindArtifact({ role: 'design', path: 'packet.json', bytes: pristine, receipt: whole.origin })).toThrow('url-origin-refused');
    fs.writeFileSync(path.join(f.clone, '.git/objects', f.blob.slice(0, 2), f.blob.slice(2)), deflateSync(bytes('blob 3\0bad')));
    await expect(f.ledger.verifyWholeSourceBody({ path: f.file, objectId: f.blob, bytes: pristine })).rejects.toThrow('url-origin-refused');
    await expect(f.ledger.sourceWhole({ path: f.file })).rejects.toThrow('url-origin-refused');
  });
  it('refuses whole-body tail secrets, private exclusions and public partial redaction while retaining actual base classes', async () => {
    const tail = fixture('Own safe first line.\n'.repeat(2100) + 'OWN_SECRET_CANARY\n');
    await expect(tail.ledger.verifyWholeSourceBody({ path: tail.file, objectId: tail.blob, bytes: bytes(tail.sourceText) })).rejects.toThrow('url-origin-refused');
    await expect(tail.ledger.sourceWhole({ path: tail.file })).rejects.toThrow('url-origin-refused');
    const redactionText = 'Own before.\nhttps://own:OwnPassword@own.example.invalid/private\nOwn after.\n';
    for (const visibility of ['private', 'public'] as const) {
      const f = fixture(redactionText, 'README.md', visibility);
      expect(f.options.screen.screenTargetBody(redactionText, f.file).kind).toBe(visibility === 'public' ? 'redacted' : 'excluded');
      await expect(f.ledger.verifyWholeSourceBody({ path: f.file, objectId: f.blob, bytes: bytes(f.sourceText) })).rejects.toThrow('url-origin-refused');
      await expect(f.ledger.sourceWhole({ path: f.file })).rejects.toThrow('url-origin-refused');
      await expect(f.ledger.verifyWholeSourceBody({ path: f.file, objectId: f.blob, bytes: bytes('Own surviving lines only.\n') })).rejects.toThrow('url-origin-refused');
    }
    for (const [file, contentClass] of [['README.md', 'project-documentation'], ['MANIFESTO.md', 'governance-text']] as const) {
      const f = fixture('Own declared purpose.\n', file), cap = await f.ledger.verifyWholeSourceBody({ path: file, objectId: f.blob, bytes: bytes(f.sourceText) });
      expect(f.ledger.inspectWholeSourceBody(cap).classes).toEqual([contentClass, 'code-structure'].sort());
    }
    for (const [file, body] of [['.env', 'Own body'], ['unknown.opaque', 'Own body'], ['own.ts', 'Own\0body']] as const) {
      const f = fixture(body, file); await expect(f.ledger.verifyWholeSourceBody({ path: file, objectId: f.blob, bytes: bytes(body) })).rejects.toThrow('url-origin-refused');
    }
  });
  it('matches the renderer’s complete ordered pieces to a native full-body receipt', async () => {
    const raw = 'Own long bounded input for the complete source page.\n'.repeat(2300) + 'Own terminal source text.\n';
    const f = fixture(raw), runId = f.options.runId, record = f.options.record;
    const sources = generationSourcesForBody({ sourceId: `src-${sha256(f.file).slice(0, 24)}`, path: f.file,
      repositoryId: record.subject.repository.repositoryId, revision: f.commit, objectId: f.blob, evaluationId: runId, body: raw });
    expect(sources.length).toBeGreaterThan(1);
    expect(sources.at(-1)?.body).toContain('Own terminal source text.');
    const source = { path: f.file, objectId: f.blob, raw, redacted: false };
    const input = { runId, pinnedRevision: f.commit, input: { sources }, sourceBodies: [source], signal: new AbortController().signal };
    const full = await verifyUrlRenderedSources(input, record, f.ledger);
    expect(full).toEqual([expect.objectContaining({ path: f.file, digest: sha256(raw), range: { start: 0, end: Buffer.byteLength(raw) } })]);
    const last = sources.at(-1)!;
    const incorrect = [sources.slice(0, -1), [...sources].reverse(), [...sources, last],
      [...sources.slice(0, -1), { ...last, body: 'Own different tail.' }],
      [...sources.slice(0, -1), { ...last, segment: { ...last.segment!, start: last.segment!.start + 1 } }]];
    for (const subset of incorrect) await expect(verifyUrlRenderedSources({ ...input, input: { sources: subset } }, record, f.ledger)).rejects.toThrow();
    for (const body of [{ ...source, raw: raw.slice(0, -1) }, { ...source, redacted: true }, { ...source, path: 'foreign.ts' }])
      await expect(verifyUrlRenderedSources({ ...input, sourceBodies: [body] }, record, f.ledger)).rejects.toThrow();
    await expect(verifyUrlRenderedSources({ ...input, sourceBodies: [source, source] }, record, f.ledger)).rejects.toThrow();
  });
  it('keeps complete-body bounds/currentness and cancels late issuance without poisoning a concurrent independent operation', async () => {
    const f = fixture(), input = { path: f.file, objectId: f.blob, bytes: bytes(f.sourceText) };
    for (const limits of [{ itemBytes: 8 }, { bytes: 1 }, { receipts: 1 }]) {
      const ledger = createUrlOriginLedger({ ...f.options, fixed: [], limits });
      await expect(ledger.verifyWholeSourceBody(input)).rejects.toThrow('url-origin-refused');
    }
    const packed = fixture(); fs.mkdirSync(path.join(packed.clone, '.git/objects/pack')); fs.writeFileSync(path.join(packed.clone, '.git/objects/pack', 'own.idx'), 'Own unsupported packed profile');
    await expect(packed.ledger.verifyWholeSourceBody({ path: packed.file, objectId: packed.blob, bytes: bytes(packed.sourceText) })).rejects.toThrow('url-origin-refused');
    const cap = await f.ledger.verifyWholeSourceBody(input); f.stale();
    expect(() => f.ledger.inspectWholeSourceBody(cap)).toThrow('url-origin-refused');
    await expect(f.ledger.verifyWholeSourceBody(input)).rejects.toThrow('url-origin-refused');
    const g = fixture(), timeoutLedger = createUrlOriginLedger({ ...g.options, limits: { readMilliseconds: 20, itemBytes: 512 } }), before = timeoutLedger.plannedOrigins();
    let release!: () => void, completed!: () => void;
    const blocked = new Promise<void>(resolve => { release = resolve; }), finished = new Promise<void>(resolve => { completed = resolve; });
    const openReader = objectReader.openPinnedObjectReader;
    const spy = vi.spyOn(objectReader, 'openPinnedObjectReader').mockImplementation(options => {
      const reader = openReader(options);
      return { ...reader, readBlobs: async paths => {
        if (options.maxObjectBytes === 512) { await blocked; try { return await reader.readBlobs(paths); } finally { completed(); } }
        return reader.readBlobs(paths);
      } };
    });
    try {
      const value = { path: g.file, objectId: g.blob, bytes: bytes(g.sourceText) };
      const late = timeoutLedger.verifyWholeSourceBody(value), refusal = expect(late).rejects.toThrow('url-origin-refused');
      const concurrent = await g.ledger.verifyWholeSourceBody(value); expect(g.ledger.inspectWholeSourceBody(concurrent).bytes).toBe(value.bytes.length);
      await refusal; release(); await finished; await new Promise<void>(resolve => setImmediate(resolve));
      expect(timeoutLedger.plannedOrigins()).toEqual(before);
    } finally { release(); spy.mockRestore(); }
  });
  it('never reads an index inserted after an empty-pack census in the actual whole-source operation', async () => {
    const f = fixture(), pack = path.join(f.clone, '.git/objects/pack'), index = path.join(pack, 'race.idx'); fs.mkdirSync(pack);
    const promises = createRequire(import.meta.url)('node:fs/promises') as typeof import('node:fs/promises');
    const originalDir = promises.opendir, originalOpen = promises.open;
    let injected = false, actualIndexBytes = 0, complete = false;
    Object.assign(promises, {
      opendir: async (...args: Parameters<typeof promises.opendir>) => {
        const directory = await Reflect.apply(originalDir, promises, args) as fs.Dir;
        if (String(args[0]) === pack) {
          const close = directory.close.bind(directory);
          Object.assign(directory, { close: async () => { await close(); fs.writeFileSync(index, Buffer.alloc(16_777_217)); injected = true; } });
        }
        return directory;
      },
      open: async (...args: Parameters<typeof promises.open>) => {
        const handle = await originalOpen(...args);
        if (String(args[0]) === index) {
          const readFile = handle.readFile.bind(handle);
          Object.assign(handle, { readFile: async (...given: unknown[]) => { const read = await Reflect.apply(readFile, handle, given) as Buffer; actualIndexBytes += read.length; return read; } });
        }
        return handle;
      },
    }); syncBuiltinESMExports();
    try {
      try {
        const cap = await f.ledger.verifyWholeSourceBody({ path: f.file, objectId: f.blob, bytes: bytes(f.sourceText) });
        complete = f.ledger.inspectWholeSourceBody(cap).bytes === Buffer.byteLength(f.sourceText);
      } catch (error) { expect((error as Error).message).toBe('url-origin-refused'); }
      await expect(f.ledger.sourceSpan({ path: f.file })).rejects.toThrow('url-origin-refused');
      const listing = hostReceipt(f, 'author', 'mcp__syzygy__source_read', { path: '.' }, { ok: true, kind: 'source-paths', paths: [f.file], offset: 0, nextOffset: null,
        scope: 'path-classification-only; bodies may still be excluded', provenance: { commit: f.commit, tree: f.tree } });
      await expect(f.ledger.hostAdapter({ binding: listing.binding, admittedRequest: () => null }).onToolReceipt(listing)).rejects.toThrow('url-origin-refused');
    } finally { Object.assign(promises, { opendir: originalDir, open: originalOpen }); syncBuiltinESMExports(); }
    expect(injected).toBe(true); expect(actualIndexBytes).toBe(0); expect(complete).toBe(true);
  });
  it('adds evidence-content only for host schema checked named role reports with genuine parents', () => {
    const f = fixture(), parent = roots(f)[0]!, payload = bytes('{"inventory":[]}');
    const report = f.ledger.report({ role: 'inventory', kind: 'inventory', bytes: payload, parents: [parent] });
    expect(f.ledger.origins(report, payload).classes).toEqual(['evidence-content', 'governance-text']);
    expect(() => f.ledger.report({ role: 'author', kind: 'inventory', bytes: payload, parents: [parent] })).toThrow('url-origin-refused');
    expect(() => f.ledger.report({ role: 'inventory', kind: 'inventory', bytes: bytes('{"opaque":"unknown"}'), parents: [parent] })).toThrow('url-origin-refused');
    f.ledger.bindArtifact({ role: 'inventory', path: 'inventory.json', bytes: payload, receipt: report });
    expect(f.ledger.artifactOrigins('inventory', 'inventory.json', payload)?.digest).toBe(sha256(payload));
    expect(f.ledger.artifactOrigins('author', 'inventory.json', payload)).toBe(null);
    expect(f.ledger.artifactOrigins('inventory', 'inventory.json', bytes('{"inventory":[1]}'))).toBe(null);
  });
  it('rechecks authority after validating a report with genuine parents and before issuing its origin', () => {
    const f = fixture();
    let authorized = true;
    let validated = false;
    const ledger = createUrlOriginLedger({
      ...f.options,
      current: () => authorized,
      schemas: { inventory() { validated = true; authorized = false; return true; } },
    });
    const parents = f.options.fixed.map(value => ledger.fixed(value.id, value.bytes));
    const before = ledger.plannedOrigins();
    expect(() => ledger.report({ role: 'inventory', kind: 'inventory', bytes: bytes('{"inventory":[]}'), parents }))
      .toThrow('url-origin-refused');
    expect(validated).toBe(true);
    authorized = true;
    expect(ledger.plannedOrigins()).toEqual(before);
  });
  it('rechecks both bounds of a subject batch and refuses inexact bytes', () => {
    const f = fixture();
    const current = vi.fn(() => true);
    const ledger = createUrlOriginLedger({ ...f.options, current });
    const subjects = f.options.fixed.map(({ id, bytes }) => ({ bytes, receipt: ledger.fixed(id, bytes) }));

    current.mockClear();
    expect(() => ledger.verifySubjects(subjects)).not.toThrow();
    expect(current).toHaveBeenCalledTimes(2);
    const [first, second] = subjects;
    expect(() => ledger.verifySubjects([first!, { ...second!, bytes: Buffer.alloc(second!.bytes.length) }]))
      .toThrow('url-origin-refused');
    expect(() => ledger.verifySubjects([first!, { ...second!, receipt: {} as UrlOriginReceipt }]))
      .toThrow('url-origin-refused');

    current.mockClear().mockReturnValueOnce(true).mockReturnValueOnce(false);
    expect(() => ledger.verifySubjects(subjects)).toThrow('url-origin-refused');
    expect(current).toHaveBeenCalledTimes(2);
  });
  it('derives actual-host draft and submitted-report callbacks from captured admission, ignoring shaped receipt class labels', async () => {
    const f = fixture(), payload = '{"draft":"Own draft"}';
    const receipt = hostReceipt(f, 'author', 'mcp__syzygy__artifact_write', { path: 'drafts/next.json', content: payload }, { ok: true, kind: 'artifact-written', path: 'drafts/next.json', sha256: sha256(payload) });
    let admission: SessionAdmission | null = null;
    const adapter = f.ledger.hostAdapter({ binding: receipt.binding, admittedRequest: () => admission });
    await expect(adapter.onToolReceipt(receipt)).rejects.toThrow('url-origin-refused');
    expect(adapter.artifactOrigins('drafts/next.json', bytes(payload))).toBe(null);
    admission = { digest: 'a'.repeat(64), bytes: 40, classes: ['governance-text', 'work-history'], originIds: ['ACTUAL_HOST_CAPTURED_ORIGIN'] };
    await adapter.onToolReceipt(receipt);
    expect(adapter.artifactOrigins('drafts/next.json', bytes(payload))?.classes).toEqual(['derived-composites', 'governance-text', 'work-history']);
    await expect(adapter.onToolReceipt(receipt)).rejects.toThrow('url-origin-refused');
    expect(adapter.artifactOrigins('drafts/next.json', bytes('changed'))).toBe(null);
    const submitted = '{"inventory":[]}', helper = hostReceipt(f, 'inventory', 'mcp__syzygy__dossier_step', { argv: ['dossier', 'await', '/own/inventory', '--submit', 'inventory.json', '--stdin'], stdin: submitted }, { ok: true, kind: 'dossier-result', stdout: 'Own submission.', stderr: '', exit: 0 });
    const helperAdapter = f.ledger.hostAdapter({ binding: helper.binding, admittedRequest: () => admission });
    await helperAdapter.onToolReceipt(helper);
    expect(helperAdapter.artifactOrigins('inventory.json', bytes(submitted))?.classes).toEqual(['derived-composites', 'evidence-content', 'governance-text', 'work-history']);

  });
  it('keeps a draft unbound during polling and refuses a changed admission or replay', async () => {
    const f = fixture(), payload = '{"draft":"Own draft"}', file = 'drafts/next.json';
    const receipt = hostReceipt(f, 'author', 'mcp__syzygy__artifact_write', { path: file, content: payload },
      { ok: true, kind: 'artifact-written', path: file, sha256: sha256(payload) });
    const initial: SessionAdmission = { digest: 'a'.repeat(64), bytes: 40, classes: ['work-history'], originIds: ['OWN_DRAFT_ADMISSION'] };
    let admission = initial;
    const adapter = f.ledger.hostAdapter({ binding: receipt.binding, admittedRequest: () => admission });
    const current = () => adapter.artifactOrigins(file, bytes(payload));

    const changed = adapter.onToolReceipt(receipt);
    expect(current()).toBeNull();
    admission = { ...initial, digest: 'b'.repeat(64) };
    await expect(changed).rejects.toThrow('url-origin-refused');
    expect(current()).toBeNull();

    admission = initial;
    await expect(adapter.onToolReceipt(receipt, async () => false)).rejects.toThrow('url-origin-refused');
    expect(current()).toBeNull();
    const first = adapter.onToolReceipt(receipt), replay = adapter.onToolReceipt(receipt);
    await Promise.all([expect(first).resolves.toBeDefined(), expect(replay).rejects.toThrow('url-origin-refused')]);
    expect(current()?.digest).toBe(sha256(payload));
  });
  it('independently matches source and artifact replies instead of trusting a successful shaped receipt', async () => {
    const f = fixture(), reply = { ok: true, kind: 'source-span', path: 'own.ts', text: f.sourceText, offset: 0, nextOffset: null, contentClass: 'code-content', redacted: false, provenance: { commit: f.commit, objectId: f.blob } };
    const receipt = hostReceipt(f, 'author', 'mcp__syzygy__source_read', { path: 'own.ts' }, reply), adapter = f.ledger.hostAdapter({ binding: receipt.binding, admittedRequest: () => null });
    const received = await adapter.onToolReceipt(receipt); expect(f.ledger.metadata(received).classes).toEqual(['code-content', 'code-structure']);
    const listing = hostReceipt(f, 'author', 'mcp__syzygy__source_read', { path: '.' }, { ok: true, kind: 'source-paths', paths: ['own.ts'], offset: 0, nextOffset: null, scope: 'path-classification-only; bodies may still be excluded', provenance: { commit: f.commit, tree: f.tree } });
    expect(f.ledger.metadata(await adapter.onToolReceipt(listing)).classes).toEqual(['code-structure']);
    await expect(adapter.onToolReceipt(hostReceipt(f, 'author', 'mcp__syzygy__source_read', { path: 'own.ts' }, { ...reply, nextOffset: 1 }))).rejects.toThrow('url-origin-refused');

    await expect(adapter.onToolReceipt(hostReceipt(f, 'author', 'mcp__syzygy__source_read', { path: 'own.ts' }, { ...reply, text: 'changed' }))).rejects.toThrow('url-origin-refused');
    const parent = roots(f)[0]!, b = f.options.fixed[0]!.bytes; f.ledger.bindArtifact({ role: 'author', path: 'brief.md', bytes: b, receipt: parent });
    const read = hostReceipt(f, 'author', 'mcp__syzygy__artifact_read', { path: 'brief.md' }, { ok: true, kind: 'artifact', path: 'brief.md', text: Buffer.from(b).toString(), sha256: sha256(b) });
    expect(f.ledger.metadata(await adapter.onToolReceipt(read)).classes).toEqual(['derived-composites', 'governance-text']);
  });
  it('keeps existing bindings and publishes no partial batch after validation or capacity refusal', () => {
    const f = fixture();
    let current = true, withdrawDuringScreening = false;
    const ledger = createUrlOriginLedger({
      ...f.options,
      limits: { artifactBindings: 2 },
      current: () => current,
      screen: {
        ...f.options.screen,
        screenBody: (text, file) => {
          if (withdrawDuringScreening) current = false;
          return f.options.screen.screenBody(text, file);
        },
      },
    });
    const [old, next] = f.options.fixed;
    const bind = (file: string, origin: typeof old) => ({ role: 'fidelity' as const, path: file, bytes: origin!.bytes,
      receipt: ledger.fixed(origin!.id, origin!.bytes) });
    const packet = bind('packet.json', old);
    const replacement = bind('packet.json', next);
    const digest = bind('packet.sha256', next);
    ledger.bindArtifact(packet);

    for (const given of [[replacement, { ...digest, bytes: old!.bytes }],
      [replacement, digest, bind('schema.json', next)], [replacement, replacement]]) {
      expect(() => ledger.bindArtifacts(given)).toThrow('url-origin-refused');
      expect(ledger.artifactOrigins('fidelity', packet.path, packet.bytes)?.digest).toBe(sha256(packet.bytes));
      expect(ledger.artifactOrigins('fidelity', digest.path, digest.bytes)).toBeNull();
    }
    withdrawDuringScreening = true;
    expect(() => ledger.bindArtifacts([replacement, digest])).toThrow('url-origin-refused');
    expect(current).toBe(false);
    withdrawDuringScreening = false;
    current = true;
    expect(ledger.artifactOrigins('fidelity', packet.path, packet.bytes)?.digest).toBe(sha256(packet.bytes));
    expect(ledger.artifactOrigins('fidelity', digest.path, digest.bytes)).toBeNull();

    ledger.bindArtifacts([replacement, digest]);
    expect(ledger.artifactOrigins('fidelity', replacement.path, replacement.bytes)?.digest).toBe(sha256(replacement.bytes));
    expect(ledger.artifactOrigins('fidelity', digest.path, digest.bytes)?.digest).toBe(sha256(digest.bytes));
  });

  it('fails closed on stale policy, bound-policy mismatch, byte/receipt/parent limits and mutable registry inputs', () => {
    const f = fixture(), receipt = roots(f)[0]!; f.stale(); expect(() => f.ledger.origins(receipt, f.options.fixed[0]!.bytes)).toThrow('url-origin-refused');
    const g = fixture(); expect(() => createUrlOriginLedger({ ...g.options, basePolicyBytes: bytes('changed') })).toThrow('url-origin-refused');
    expect(() => g.ledger.compose(bytes('Own'), [roots(g)[0]!, roots(g)[0]!])).toThrow('url-origin-refused');
    const parentLimited = createUrlOriginLedger({ ...g.options, limits: { parents: 1 } }), [pa, pb] = g.options.fixed.map(value => parentLimited.fixed(value.id, value.bytes));
    expect(() => parentLimited.compose(bytes('Own'), [pa!, pb!])).toThrow('url-origin-refused');

    const small = createUrlOriginLedger({ ...g.options, fixed: [], limits: { itemBytes: 4 } }); expect(() => small.compose(bytes('Own too large'), [receipt])).toThrow('url-origin-refused');
    const limited = createUrlOriginLedger({ ...g.options, fixed: [g.options.fixed[0]!], limits: { receipts: 1 } }), first = limited.fixed(g.options.fixed[0]!.id, g.options.fixed[0]!.bytes);
    expect(() => limited.compose(bytes('Own'), [first])).toThrow('url-origin-refused');
    const mutable = { ...g.options, fixed: [{ ...g.options.fixed[0]!, bytes: Uint8Array.from(g.options.fixed[0]!.bytes) }] }, ledger = createUrlOriginLedger(mutable);
    mutable.fixed[0]!.bytes[0] = 0x58; expect(() => ledger.fixed('origin:policy', mutable.fixed[0]!.bytes)).toThrow('url-origin-refused');
  });
});
