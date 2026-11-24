import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { createRequire, syncBuiltinESMExports } from 'node:module';
import { deflateSync } from 'node:zlib';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { sha256 } from '@syzygy/support';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { buildDossierScreen } from './screen.js';
import { parseRunConfig } from './run-config.js';
import { DOSSIER_CONTENT_CLASSES, NO_WORK_ITEM_REASON, recordRunConfig } from './run-record.js';
import { isPreparedUrlRolePlan, prepareUrlRolePlans, type UrlRolePlanningOptions } from './url-role-plan.js';
import { createUrlRunOrigins, type UrlRunOriginsOptions } from './url-run-origins.js';
import * as boundSource from './url-source-reader.js';

const canonical = (value: unknown): string => encodeCanonicalJson(value, { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 });
const cleanup: string[] = [];
afterAll(async () => { for (const dir of cleanup.reverse()) await fs.rm(dir, { recursive: true, force: true }); });
async function fixture(supportImages: ReadonlyMap<string, Buffer>, sourceBodies: Record<string, string> = { 'MANIFESTO.md': 'Own declared purpose.\n', 'README.md': 'Own project overview.\n', 'own.ts': 'export const own = 1;\n' }) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'uro-')); cleanup.push(root);
  const run = path.join(root, 'own-run'), parent = path.join(root, 'views'), hidden = path.join(root, 'protected'), support = path.join(root, 'support'), clone = path.join(hidden, 'own-source');
  for (const dir of [run, parent, hidden, support, path.join(root, 'design-support')]) await fs.mkdir(dir, { mode: 0o700 });
  const object = async (kind: string, body: Buffer): Promise<string> => {
    const raw = Buffer.concat([Buffer.from(`${kind} ${body.length}\0`), body]), digest = createHash('sha1').update(raw).digest('hex');
    const file = path.join(clone, '.git/objects', digest.slice(0, 2), digest.slice(2)); await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, deflateSync(raw)); return digest;
  };
  const entries: Buffer[] = [];
  for (const [name, body] of Object.entries(sourceBodies)) entries.push(Buffer.concat([Buffer.from(`100644 ${name}\0`), Buffer.from(await object('blob', Buffer.from(body)), 'hex')]));
  const tree = await object('tree', Buffer.concat(entries)), pin = await object('commit', Buffer.from(`tree ${tree}\nauthor Own <own@example.invalid> 0 +0000\ncommitter Own <own@example.invalid> 0 +0000\n\nOwn fixture.\n`));
  const basePolicyBytes = await fs.readFile(new URL('../../../.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json', import.meta.url));
  const loaded = buildDossierScreen(basePolicyBytes, true, null, 'private'); if (!loaded.ok) throw Error(loaded.why);
  const policyDoc = JSON.parse(basePolicyBytes.toString()), policy = { path: '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json', commit: 'a'.repeat(40), policyId: policyDoc.policyId, policyVersion: policyDoc.policyVersion, sha256: sha256(basePolicyBytes) };
  const parsed = parseRunConfig(JSON.stringify({ operator: 'own-operator', agentTool: 'claude-code', agentToolVersion: '2.1.327', agentProvider: 'anthropic', model: 'claude-sonnet-4-6', deadline: 'PT1H', agentTurnBudget: 20, maxRepairCycles: 2, maxQuestions: 1, audience: 'Own readers', operatorIsOwner: false })); if (!parsed.ok) throw Error('config');
  const record = recordRunConfig(parsed.config, { repository: { url: 'own.example.invalid/source', repositoryId: 'own-source', role: 'observed-source' }, clone: { path: clone, declaredBy: 'operator', label: 'Inferred', use: 'read' }, pinnedRevision: { commit: pin, label: 'own', pinnedAt: '2026-11-19T00:00:00.000Z' }, screeningPolicy: policy, contentClasses: DOSSIER_CONTENT_CLASSES,
    visibility: { value: 'private', source: 'conservative-default', declaredBy: 'conservative default', label: 'Inferred' }, governed: { kind: 'unstated', because: ['Own fixture.'] }, workItem: { identity: null, reason: NO_WORK_ITEM_REASON } });
  for (const [file, bytes] of supportImages) await fs.writeFile(path.join(root, file), bytes, { mode: 0o600 });
  const supportSha256 = {
    'session-bridge.js': sha256(supportImages.get('support/session-bridge.js')!),
    'session-mcp.js': sha256(supportImages.get('support/session-mcp.js')!),
  };
  const node = await fs.realpath(process.execPath), canaries = ['source', 'auth', 'audit'].map(name => path.join(hidden, name));
  for (const file of canaries) await fs.writeFile(file, 'OWN SYNTHETIC CANARY');
  const planning: UrlRolePlanningOptions = { run, record, screen: loaded.screen, sessionDirectories: { author: run, inventory: path.join(root, 'inventory'), fidelity: path.join(root, 'fidelity'), design: path.join(root, 'design') }, cliExecutable: await fs.realpath(path.join(os.homedir(), '.local/share/claude/versions/2.1.327')), parent, protectedPaths: [run, hidden], canaries, current: () => true, audit: () => { throw Error('No CLI launch permitted'); }, now: Date.now(),
    runtime: { worker: { node, nodeSha256: sha256(await fs.readFile(node)), bundle: path.join(hidden, 'unused-worker.mjs'), bundleSha256: 'b'.repeat(64) }, peerProgram: { executable: path.join(hidden, 'unused-peer'), sha256: 'a'.repeat(64) }, supportDirectory: support, supportSha256, inputTreeSha256: 'c'.repeat(64), manifestSha256: 'd'.repeat(64), profileRegistrySha256: 'e'.repeat(64) } };
  const prepared = await prepareUrlRolePlans(planning); if (!prepared.ok) throw Error(`Own native preparation refused at ${prepared.stage}`); cleanup.push(prepared.socketRoot);
  const originBytes = await fs.readFile(new URL('../../../openspec/changes/dossier-url-declared-source-run/proposed/policies/POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1.json', import.meta.url));
  const options: UrlRunOriginsOptions = { runId: 'own-run', record, screen: loaded.screen, basePolicyBytes, originPolicy: { binding: { path: '.syzygy/governance/policies/POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1.json', commit: 'a'.repeat(40), policyId: 'POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1', policyVersion: '1.0.0', sha256: sha256(originBytes) }, bytes: originBytes }, current: () => true, roles: prepared.roles };
  return { options, run, root, clone, sourceBodies };
}
let own: Awaited<ReturnType<typeof fixture>>, codeOnly: Awaited<ReturnType<typeof fixture>>;
beforeAll(async () => {
  const root = new URL('../../../', import.meta.url);
  const { compileDossierSessionSupport } = await import(new URL('scripts/compile_dossier_session_support.mjs', root).href) as {
    compileDossierSessionSupport(read: (name: string) => Promise<Buffer>): Promise<ReadonlyMap<string, Buffer>>;
  };
  const supportImages = await compileDossierSessionSupport(name => fs.readFile(new URL(name, root)));
  own = await fixture(supportImages);
  codeOnly = await fixture(supportImages, { 'own.ts': 'export const own = 1;\n' });
}, 30_000);

describe('initial URL run provenance from genuine native preparations', () => {
  it('keeps four initial prompts on exactly three fixed parents and preserves required declaration aliases', async () => {
    const result = await createUrlRunOrigins(own.options);
    for (const plan of own.options.roles) {
      expect(isPreparedUrlRolePlan(plan)).toBe(true);
      const origins = result.ledger.origins(result.initialReceipts[plan.role], Buffer.from(plan.profile.input.initialPrompt));
      expect(origins.classes).toEqual(['code-structure', 'derived-composites', 'governance-text', 'work-history']);
      const declaration = result.plannedOrigins.find(entry => entry.id === plan.declaration.inputOriginId)!;
      expect(declaration.sha256).toBe(plan.declaration.inputPacketSha256);
      expect(declaration.originIds).toEqual(['origin:role-policy', 'origin:run-control', 'origin:tool-metadata']);
      expect(declaration.classes).not.toContain('evidence-content'); expect(declaration.classes).not.toContain('code-content');
      expect(result.ledger.metadata(result.initialReceipts[plan.role]).id).not.toBe(declaration.id);
    }
    const earlier = new Set<string>(); for (const entry of result.plannedOrigins) { expect(earlier.has(entry.id)).toBe(false); for (const parent of entry.originIds) expect(earlier.has(parent)).toBe(true); earlier.add(entry.id); }
    expect(await fs.readdir(own.run)).toEqual([]);
  });
  it('earns evidence class from a strict actual-preparation report while leaving provider and later lifecycle facts Unknown', async () => {
    const result = await createUrlRunOrigins(own.options), prep = result.preparation;
    expect(prep.report.format).toBe('polaris-url-native-preparation-check/1'); expect(prep.report.label).toBe('Inferred');
    expect(prep.report.roles.map(row => row.role)).toEqual(['author', 'inventory', 'fidelity', 'design']);
    expect(prep.report).toMatchObject({ providerSends: 'Unknown', providerReceipts: 'Unknown', modelServed: 'Unknown', sessionTermination: 'Unknown' });
    expect(result.ledger.origins(prep.receipt, prep.bytes).classes).toEqual(['code-structure', 'evidence-content', 'governance-text', 'work-history']);
    for (const forged of [{ ...prep.report, providerSends: 0 }, { ...prep.report, quality: 'ready' }, { format: 'dossier-quality-check', readiness: 'ready' }]) {
      expect(() => result.ledger.report({ role: 'author', kind: 'check', bytes: Buffer.from(canonical(forged)), parents: [result.roots.rolePolicy] })).toThrow('url-origin-refused');
    }
  });
  it('finds one actual whole-body verified representative per present base class and projects no source bodies or excluded identifiers', async () => {
    const result = await createUrlRunOrigins(own.options);
    expect(result.source.report).toMatchObject({ treeEntries: 3, eligibleRegularPaths: 3, representedClasses: ['code-content', 'project-documentation', 'governance-text'], noCandidatePathClasses: [], unexaminedBodies: 'Unknown', sourceBodiesStoredHere: false });
    const emitted = JSON.stringify({ report: result.source.report, plans: result.plannedOrigins });
    for (const body of Object.values(own.sourceBodies)) expect(emitted).not.toContain(body.trim());
    expect(Object.keys(result.source.representatives).sort()).toEqual(['code-content', 'governance-text', 'project-documentation']);
    const actual = [...new Set(result.plannedOrigins.flatMap(entry => entry.classes))].sort();
    expect(actual).toEqual(['code-content', 'code-structure', 'derived-composites', 'evidence-content', 'governance-text', 'project-documentation', 'work-history']);
    const smaller = await createUrlRunOrigins(codeOnly.options);
    expect(smaller.source.report.representedClasses).toEqual(['code-content']);
    expect(smaller.source.report.noCandidatePathClasses).toEqual(['project-documentation', 'governance-text']);
    expect([...new Set(smaller.plannedOrigins.flatMap(entry => entry.classes))]).not.toContain('project-documentation');

  });
  it('uses existing role/pin/session-bound artifact shapes and rejects opaque or foreign-session report laundering', async () => {
    const result = await createUrlRunOrigins(own.options), sessionId = own.options.roles[1]!.profile.input.sessionId;
    const value = { schemaVersion: 'polaris-dossier-local-inventory-v1', pinnedRevision: own.options.record.subject.pinnedRevision.commit, sessionId,
      entries: [{ id: 'purpose', kind: 'purpose', label: 'inferred', statement: 'Own purpose.', citations: [{ id: 'own-cite', path: 'MANIFESTO.md', startLine: 1, endLine: 1 }], quotations: [] }], coverage: { inspected: ['MANIFESTO.md'], excluded: [], deferred: [], stoppingReason: 'Own scope.' } };
    const b = Buffer.from(canonical(value));
    const report = result.ledger.report({ role: 'inventory', kind: 'inventory', bytes: b, parents: [result.roots.rolePolicy] });
    expect(result.ledger.metadata(report).classes).toEqual(['evidence-content', 'governance-text']);
    for (const invalid of [{ ...value, sessionId: 'foreign-session' }, { ...value, pinnedRevision: 'f'.repeat(40) }, { type: 'thinking', signature: 'opaque', data: 'unknown' }]) {
      expect(() => result.ledger.report({ role: 'inventory', kind: 'inventory', bytes: Buffer.from(canonical(invalid)), parents: [result.roots.rolePolicy] })).toThrow('url-origin-refused');
    }
  });
  it('never loads index bytes for a preexisting pack or one inserted in the actual preparation census gap', async () => {
    const promises = createRequire(import.meta.url)('node:fs/promises') as typeof import('node:fs/promises');
    const originalOpen = promises.open, originalDir = promises.opendir;
    const pack = path.join(codeOnly.clone, '.git/objects/pack'), index = path.join(pack, 'race.idx');
    await fs.mkdir(pack); let injected = false, actualIndexBytes = 0;
    Object.assign(promises, {
      opendir: async (...args: Parameters<typeof promises.opendir>) => {
        const directory = await Reflect.apply(originalDir, promises, args) as Awaited<ReturnType<typeof promises.opendir>>;
        if (String(args[0]) === pack && !injected) {
          const close = directory.close.bind(directory);
          Object.assign(directory, { close: async () => { await close(); await fs.writeFile(index, Buffer.alloc(16_777_217)); injected = true; } });
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
      // The first tree operation can finish from loose objects. Its subsequent source
      // operation must refuse the now nonempty pack directory without loading the index.
      await expect(createUrlRunOrigins(codeOnly.options)).rejects.toThrow('url-run-origins-unavailable');
      expect(injected).toBe(true); expect(actualIndexBytes).toBe(0);
      await expect(createUrlRunOrigins(codeOnly.options)).rejects.toThrow('url-run-origins-unavailable');
      expect(actualIndexBytes).toBe(0);
    } finally { Object.assign(promises, { open: originalOpen, opendir: originalDir }); syncBuiltinESMExports(); await fs.rm(pack, { recursive: true }); }
    expect((await createUrlRunOrigins(codeOnly.options)).source.report.representedClasses).toEqual(['code-content']);
  });
  it('completes the guarded tree walk within its original limit and refuses a late live check', async () => {
    let reading = false, elapsed = 0, samples = 0, sampleMilliseconds = 1550;
    const list = boundSource.listBoundUrlSourceTree;
    const listTree = vi.spyOn(boundSource, 'listBoundUrlSourceTree').mockImplementation(async input => {
      reading = true;
      try { return await list(input); }
      finally { reading = false; }
    });
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => elapsed);
    const options = { ...own.options, current: () => {
      if (reading) { samples++; elapsed += sampleMilliseconds; }
      return true;
    } };
    try {
      const origins = await createUrlRunOrigins(options);
      expect(origins.source.report).toMatchObject({ treeEntries: 3, eligibleRegularPaths: 3 });
      expect(samples).toBe(3);
      sampleMilliseconds = 1750;
      samples = 0;
      await expect(createUrlRunOrigins(options)).rejects.toThrow('url-run-origins-unavailable');
      expect(samples).toBe(3);
    } finally { clock.mockRestore(); listTree.mockRestore(); }
  });

  it('refuses shaped or foreign role populations, stale policies and bounded tree excess without fabricating origins', async () => {
    await expect(createUrlRunOrigins({ ...own.options, roles: own.options.roles.map(plan => ({ ...plan })) })).rejects.toThrow('url-run-origins-unavailable');
    await expect(createUrlRunOrigins({ ...own.options, roles: [...own.options.roles].reverse() })).rejects.toThrow('url-run-origins-unavailable');
    await expect(createUrlRunOrigins({ ...own.options, runId: 'foreign-run' })).rejects.toThrow('url-run-origins-unavailable');
    await expect(createUrlRunOrigins({ ...own.options, current: () => false })).rejects.toThrow('url-run-origins-unavailable');
    await expect(createUrlRunOrigins({ ...own.options, limits: { treeEntries: 1 } })).rejects.toThrow('url-run-origins-unavailable');
    await expect(createUrlRunOrigins({ ...own.options, limits: [] as never })).rejects.toThrow('url-run-origins-unavailable');
    await expect(createUrlRunOrigins({ ...own.options, originPolicy: { ...own.options.originPolicy, bytes: Buffer.from('changed') } })).rejects.toThrow('url-run-origins-unavailable');
  });
});
