import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { link, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { sha256 } from '@syzygy/support';
import { recordRunConfig, sourceBindingSha256, DOSSIER_CONTENT_CLASSES } from './run-record.js';
import { createSessionTools, type SessionToolOrigins, type SessionToolsOptions, type SessionToolsReceipt } from './session-tools.js';
import type { SessionContentClass } from './session-egress-policy.js';
import type { DossierScreen } from './screen.js';
import type { ViewRole } from './session-view.js';
import { createSessionController } from './session-controller.js';
import { createSessionProfile, DEFAULT_SESSION_MODEL, sessionProfileReminderText } from './session-profile.js';
import { SESSION_CONTENT_CLASSES } from './session-egress-policy.js';
import { createUrlSessionControl, type UrlSessionControlAudit, type UrlSessionQuestionFrame, type UrlSessionAnswer } from './session-control.js';

const roots: string[] = [];
const controls: ReturnType<typeof createUrlSessionControl>[] = [];
afterEach(async () => { for (const control of controls.splice(0)) control.close(); for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });
const secret = (text: string) => /SYNTHETIC_SECRET|CROSSBOUNDARY/u.test(text);
const bytes = (text: string) => new TextEncoder().encode(text);
function validDraft(pin: string) {
  return { schemaVersion: 'polaris-dossier-local-draft-v7', thesisBasis: 'none', pinnedRevision: pin, sessionId: 'own-author', title: 'Own fixture',
    introduction: { id: 'intro', label: 'non-normative', text: 'A reading guide.' },
    understanding: Object.fromEntries(['purpose', 'beneficiary', 'proposition', 'capabilities', 'components', 'choices', 'tradeOffs', 'limits', 'terminology', 'contradictions', 'openQuestions']
      .map(key => [key, [{ id: `u-${key}`, label: 'unknown', reason: 'missing-evidence', statement: 'Not stated.', scope: 'Own fixture.', citations: [] }]])),
    sections: [{ id: 'guide', title: 'Guide', paragraphs: [{ id: 'p', label: 'non-normative', text: 'Read the fixture.', children: [] }], disposition: { kind: 'produced', assetIds: ['guide'] } }],
    diagrams: [], deepDives: [], unresolved: [], discovery: { inspected: [], selected: [], excluded: [], unresolved: [], deferred: [], stoppingReason: 'Own fixture.' }, clarifications: [], executions: [] };
}
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'syzygy-session-tools-')); roots.push(root);
  const clone = path.join(root, 'own-source'); await mkdir(clone);
  const home = path.join(root, 'own-git-home'); await mkdir(home);
  const git = (...args: string[]): string => execFileSync('/usr/bin/git', ['-c', 'core.hooksPath=/dev/null', '-c', 'user.name=Own Fixture', '-c', 'user.email=fixture@example.invalid', ...args],
    { cwd: clone, env: { PATH: '/usr/bin:/bin', HOME: home, LANG: 'C', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  git('init', '--template=', '.');
  await writeFile(path.join(clone, 'README.md'), 'first\nsecond\nthird\n');
  await writeFile(path.join(clone, 'private.md'), 'public first\nSYNTHETIC_SECRET\npublic last\n');
  await writeFile(path.join(clone, 'code.ts'), '<script>ownFixture()</script>\n');
  await writeFile(path.join(clone, '.env'), 'excluded fixture\n');
  await writeFile(path.join(clone, 'unknown.bin'), 'unknown class\n');
  await writeFile(path.join(clone, 'badutf8.md'), Buffer.from([0xff]));
  await writeFile(path.join(clone, 'large.md'), Buffer.alloc(1_048_577, 120));
  await symlink('../outside-fixture', path.join(clone, 'link.md'));
  git('add', '.'); git('commit', '-m', 'own source fixture');
  const pin = git('rev-parse', 'HEAD').trim();
  const privateObject = git('rev-parse', 'HEAD:private.md').trim();
  const run = path.join(root, 'run-fixture'); await mkdir(run); await mkdir(path.join(run, 'drafts')); await mkdir(path.join(run, 'checks'));
  const helpers = path.join(root, 'helpers'); await mkdir(helpers);
  const directories = Object.fromEntries(await Promise.all((['inventory', 'fidelity', 'design'] as const).map(async role => {
    const directory = path.join(helpers, role); await mkdir(directory); await mkdir(path.join(directory, 'round-1')); return [role, directory];
  }))) as Record<'inventory' | 'fidelity' | 'design', string>;
  const screen: DossierScreen = {
    policyId: 'fixture-policy', policyVersion: '1', policySha256: '7'.repeat(64), projectDocumentation: true, codeContentExemption: true,
    governanceText: false, documentationExemption: false, scopeDetectors: 1, secretRedaction: true, visibility: 'private',
    screenPath: file => file === '.env' ? 'denied-path' : !/\.(?:md|ts)$/u.test(file) ? 'unknown-extraction-class' : undefined,
    contentClass: file => /\.md$/u.test(file) ? 'project-documentation' : /\.ts$/u.test(file) ? 'code-content' : undefined,
    screenSecrets: text => secret(text) ? 'secret-detector-match' : undefined,
    screenBody: text => secret(text) ? 'secret-detector-match' : text.includes('<script') ? 'active-content' : undefined,
    stageOf: file => screen.screenPath(file) === undefined ? 1 : undefined, twoStage: false, configurationDetectors: 0,
    scannedAsBefore: text => Boolean(secret(text)) || text.includes('<script'),
    activeContentAsBefore: text => text.includes('<script'),
    screenTargetBody: (text, file) => {
      if (secret(text)) {
        if (screen.visibility === 'private') return { kind: 'excluded', outcome: 'secret-detector-match' };
        const retained = 'public first\n\npublic last\n';
        return { kind: 'redacted', retained, retainedLines: ['public first\n', '\n', 'public last\n'], lineByteOffsets: [0, 13, 30],
          originalBytes: bytes(text).length, contentSha256: sha256(text), withheld: [2], detectorIds: ['own-detector'] };
      }
      return text.includes('<script') && !file.endsWith('.ts') ? { kind: 'excluded', outcome: 'active-content' } : { kind: 'admitted' };
    },
  };
  const recorded = recordRunConfig({ operator: 'fixture-operator', agentTool: 'claude-code', agentToolVersion: 'fixture-version', agentProvider: 'anthropic',
    model: 'fixture-model', modelVersion: null, deadline: { declared: 'PT1H', seconds: 3600 }, agentTokenBudget: null, agentTurnBudget: 20,
    maxRepairCycles: 2, maxQuestions: 1, audience: 'fixture readers', operatorIsOwner: false, poleLimit: null }, {
    repository: { url: 'fixture.invalid/own/source', repositoryId: 'own-source', role: 'observed-source' },
    clone: { path: clone, declaredBy: 'operator', label: 'Inferred', use: 'read' }, pinnedRevision: { commit: pin, label: 'fixture', pinnedAt: '2026-11-19T00:00:00.000Z' },
    screeningPolicy: { path: '.syzygy/governance/policies/fixture.json', commit: 'a'.repeat(40), policyId: screen.policyId, policyVersion: screen.policyVersion, sha256: screen.policySha256 },
    contentClasses: DOSSIER_CONTENT_CLASSES, visibility: { value: 'private', source: 'conservative-default', declaredBy: 'fixture-operator', label: 'Inferred' },
    governed: { kind: 'non-governed', because: ['Own fixture.'] }, workItem: { identity: null, reason: 'the operator-agent run makes no provider dispatch and no scheduler effect, so no scheduler work item, Proposal or materialization record exists for it; it is rendered as unattributed execution under RFC4-19, never dropped' },
  });
  const receipts: SessionToolsReceipt[] = [];
  const calls: { argv: readonly string[]; stdin: Uint8Array | null }[] = [];
  const registry = new Map<string, SessionToolOrigins>();
  let permitted = true, reverifications = 0;
  const put = async (directory: string, file: string, content: string, classes: readonly SessionContentClass[] = ['derived-composites']) => {
    await writeFile(path.join(directory, file), content);
    registry.set(file, { digest: sha256(content), classes, originIds: [`artifact:${sha256(content)}`] });
  };
  await put(run, 'brief.md', 'Own brief.'); await put(run, 'brief.json', '{"instruction":"Own brief."}');
  await put(run, 'draft.schema.json', '{"type":"object"}');
  await put(run, 'drafts/next.json', JSON.stringify(validDraft(pin)), ['derived-composites', 'project-documentation']);
  await put(directories.inventory, 'inventory-brief.md', 'Own inventory brief.');
  await put(directories.fidelity, 'round-1/packet.json', '{"source":"Own packet quotation."}', ['derived-composites', 'project-documentation']);
  const tools = (role: ViewRole = 'author', changes: Partial<SessionToolsOptions> = {}) => createSessionTools({
    role, run, sessionDir: role === 'author' ? run : directories[role], record: recorded, screen,
    binding: { run: path.basename(run), role, sourceBinding: sourceBindingSha256(recorded.subject), policy: screen.policySha256, provider: 'anthropic', model: 'fixture-model' },
    scanSecrets: secret, reverify: async () => { reverifications++; return permitted; },
    runDossier: async (argv, stdin) => { calls.push({ argv: [...argv], stdin: stdin === null ? null : new Uint8Array(stdin) }); return { stdout: '{"status":"own run"}', stderr: '', exit: 0 }; },
    onReceipt: receipt => { receipts.push(receipt); },
    artifactOrigins: (file, _data) => registry.get(file) ?? null,
    inputOrigins: (_tool, _input, data) => ({ digest: sha256(data), classes: ['derived-composites', 'project-documentation'], originIds: ['provider:issued-own-input'] }),
    dossierOrigins: (_argv, response) => ({ digest: sha256(encodeCanonicalJson(response, { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 })), classes: ['work-history'], originIds: ['dossier:own-result'] }),
    ...changes,
  });
  return { root, clone, run, directories, pin, privateObject, git, screen, recorded, receipts, calls, registry, put, tools,
    revoke: () => { permitted = false; }, reverifications: () => reverifications };
}
const invoke = (tools: ReturnType<typeof createSessionTools>, tool: string, input: Record<string, unknown>) => tools.invoke({ tool, input });

describe('trusted role session tools', () => {
  it.each(['author', 'inventory'] as const)('lets only the %s recipient read exact registered repair feedback in its own directory', async role => {
    const f = await fixture(), directory = role === 'author' ? f.run : f.directories.inventory;
    await mkdir(path.join(directory, 'feedback'));
    const file = 'feedback/fidelity-verdict-1.json', content = '{"findings":[{"reason":"Own synthetic repair evidence."}]}';
    await writeFile(path.join(directory, file), content);
    const tools = f.tools(role);
    expect((await invoke(tools, 'artifact_read', { path: file })).ok).toBe(false);
    await f.put(directory, file, content, ['evidence-content', 'derived-composites']);
    expect(await invoke(tools, 'artifact_read', { path: file })).toMatchObject({ ok: true, text: content });
    expect(f.receipts.at(-1)!.classes).toEqual(['derived-composites', 'evidence-content']);
    await writeFile(path.join(directory, file), '{"findings":[]}');
    expect((await invoke(tools, 'artifact_read', { path: file })).ok).toBe(false);
    for (const other of ['fidelity', 'design'] as const) expect(f.tools(other).validateToolInput('mcp__syzygy__artifact_read', { path: file })).toBe(false);
    for (const unsafe of ['../feedback/fidelity-verdict-1.json', '/feedback/fidelity-verdict-1.json', 'feedback/other-verdict-1.json', 'feedback/fidelity-verdict-01.json'])
      expect(tools.validateToolInput('mcp__syzygy__artifact_read', { path: unsafe })).toBe(false);
  });

  it('reads exact pinned source lines, preserves its path class and source exemption, and registers exact immutable wire receipts', async () => {
    const f = await fixture(); const tools = f.tools();
    expect(tools.validateToolInput('mcp__syzygy__source_read', { path: 'README.md', limit: 1 })).toBe(true);
    expect(f.tools('fidelity').validateToolInput('mcp__syzygy__source_read', { path: 'README.md' })).toBe(false);
    expect(tools.validateToolInput('mcp__syzygy__artifact_read', { path: '../other-role/packet.json' })).toBe(false);
    expect(tools.validateToolInput('mcp__syzygy__dossier_step', { argv: ['dossier', 'status', f.run] })).toBe(true);
    expect(tools.validateToolInput('mcp__syzygy__dossier_step', { argv: ['dossier', 'close', f.run] })).toBe(false);
    expect(f.calls).toEqual([]); expect(f.receipts).toEqual([]); expect(f.reverifications()).toBe(0);
    await writeFile(path.join(f.clone, 'README.md'), 'untrusted working tree\n');
    const result = await invoke(tools, 'source_read', { path: 'README.md', offset: 1, limit: 1 });
    expect(result).toMatchObject({ ok: true, kind: 'source-span', text: 'second\n', offset: 1, nextOffset: 2, contentClass: 'project-documentation', provenance: { commit: f.pin } });
    expect(f.receipts[0]!.classes).toEqual(['code-structure', 'project-documentation']);
    expect(f.receipts[0]!.canonicalText).toBe(JSON.stringify(result));
    expect(f.receipts[0]!.digest).toBe(sha256(JSON.stringify(result)));
    expect(Object.isFrozen(f.receipts[0]!.binding)).toBe(true);
    expect(Object.isFrozen(f.receipts[0]!.toolInput)).toBe(true);
    const code = await invoke(tools, 'source_read', { path: 'code.ts' });
    expect(code).toMatchObject({ ok: true, text: '<script>ownFixture()</script>\n', contentClass: 'code-content' });
    expect(f.receipts.at(-1)!.classes).toEqual(['code-content', 'code-structure']);
    expect(f.receipts[0]!.id).not.toBe(f.receipts[1]!.id);
  });

  it('pages only admitted regular paths with metadata-only class and refuses excluded bodies without private object identities', async () => {
    const f = await fixture(); const tools = f.tools('inventory');
    const paths = await invoke(tools, 'source_read', { path: '.', limit: 2 });
    expect(paths).toMatchObject({ ok: true, paths: ['README.md', 'badutf8.md'], nextOffset: 2, scope: 'path-classification-only; bodies may still be excluded' });
    expect(f.receipts.at(-1)!.classes).toEqual(['code-structure']);
    const next = await invoke(tools, 'source_read', { path: '', offset: 2, limit: 2000 });
    expect(next).toMatchObject({ ok: true, paths: ['code.ts', 'large.md', 'private.md'], nextOffset: null });
    for (const file of ['private.md', '.env', 'unknown.bin', 'link.md', 'badutf8.md', 'large.md']) {
      const refused = await invoke(tools, 'source_read', { path: file }); expect(refused.ok).toBe(false);
      expect(JSON.stringify(refused)).not.toContain('SYNTHETIC_SECRET');
      expect(JSON.stringify(refused)).not.toContain(f.privateObject);
    }
    expect(JSON.stringify(f.receipts)).not.toContain(f.privateObject);
    expect(JSON.stringify(f.receipts)).not.toContain('SYNTHETIC_SECRET');
  });

  it('uses retained public spans while private whole exclusion and corrupt-object failures remain closed', async () => {
    const f = await fixture();
    const publicRecord = { ...f.recorded, subject: { ...f.recorded.subject, visibility: { ...f.recorded.subject.visibility, value: 'public' as const } } };
    Object.assign(f.screen, { visibility: 'public' });
    const tools = f.tools('author', { record: publicRecord, binding: { run: path.basename(f.run), role: 'author', sourceBinding: sourceBindingSha256(publicRecord.subject), policy: f.screen.policySha256, provider: 'anthropic', model: 'fixture-model' } });
    expect(await invoke(tools, 'source_read', { path: 'private.md' })).toMatchObject({ ok: true, redacted: true, text: 'public first\n\npublic last\n' });
    const objectId = f.git('rev-parse', 'HEAD:README.md').trim();
    const objectFile = path.join(f.clone, '.git/objects', objectId.slice(0, 2), objectId.slice(2));
    await rm(objectFile); await writeFile(objectFile, 'own corrupt object');
    const failed = await invoke(tools, 'source_read', { path: 'README.md' });
    expect(failed).toMatchObject({ ok: false, code: 'source-unavailable' });
    expect(JSON.stringify(failed)).not.toContain(objectId);
  });

  it('enforces role and strict request schemas before filesystem or command access', async () => {
    const f = await fixture();
    for (const role of ['fidelity', 'design'] as const) {
      const tools = f.tools(role);
      expect(await invoke(tools, 'source_read', { path: 'README.md' })).toMatchObject({ ok: false, code: 'role-refused' });
      expect(await invoke(tools, 'artifact_read', { path: 'drafts/next.json' })).toMatchObject({ ok: false, code: 'path-refused' });
      expect(await invoke(tools, 'artifact_write', { path: 'drafts/next.json', content: '{}' })).toMatchObject({ ok: false, code: 'role-refused' });
    }
    const author = f.tools();
    for (const request of [
      { tool: 'source_read', role: 'inventory', input: { path: 'README.md' } },
      { tool: 'source_read', input: { path: '../outside' } }, { tool: 'source_read', input: { path: '/outside' } },
      { tool: 'source_read', input: { path: 'README.md', limit: 2001 } }, { tool: 'source_read', input: { path: 'README.md', receipt: {} } },
      { tool: 'artifact_read', input: { path: 'run.json' } }, { tool: 'artifact_read', input: { path: 'brief.md\n' } }, { tool: 'artifact_read', input: { path: 'checks/../run.json' } },
    ]) expect((await author.invoke(request)).ok).toBe(false);
    expect(f.calls).toHaveLength(0);
  });

  it('submits only the protected design verdict directly through stdin when the round directory is absent', async () => {
    const f = await fixture();
    const stdin = JSON.stringify({ readiness: 'ready' });
    const argv = (role: 'fidelity' | 'design') =>
      ['dossier', 'await', f.directories[role], '--submit', 'round-2/verdict.json', '--stdin'];
    expect(await invoke(f.tools('design'), 'dossier_step', { argv: argv('design'), stdin }))
      .toMatchObject({ ok: false, code: 'artifact-unavailable' });
    expect(await invoke(f.tools('fidelity'), 'dossier_step', { argv: argv('fidelity'), stdin }))
      .toMatchObject({ ok: false, code: 'artifact-unavailable' });
    expect(await invoke(f.tools('design', { designArtifact: async () => null }), 'dossier_step', { argv: argv('design'), stdin }))
      .toMatchObject({ ok: true, kind: 'dossier-result' });
    expect(f.calls).toEqual([{ argv: argv('design'), stdin: new TextEncoder().encode(stdin) }]);
    await expect(readFile(path.join(f.directories.design, 'round-2', 'verdict.json'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('binds artifact bytes to independent origins and refuses symlink, hardlink, traversal and stale classifications', async () => {
    const f = await fixture(); const author = f.tools();
    expect(await invoke(author, 'artifact_read', { path: 'brief.md' })).toMatchObject({ ok: true, text: 'Own brief.' });
    expect(f.receipts.at(-1)!.classes).toEqual(['derived-composites']);
    await writeFile(path.join(f.run, 'brief.md'), 'changed but otherwise safe');
    expect(await invoke(author, 'artifact_read', { path: 'brief.md' })).toMatchObject({ ok: false, code: 'unknown-origin' });
    await rm(path.join(f.run, 'brief.md')); await symlink(path.join(f.root, 'outside'), path.join(f.run, 'brief.md'));
    expect(await invoke(author, 'artifact_read', { path: 'brief.md' })).toMatchObject({ ok: false, code: 'artifact-unavailable' });
    await rm(path.join(f.run, 'brief.md')); await writeFile(path.join(f.root, 'outside'), 'own outside'); await link(path.join(f.root, 'outside'), path.join(f.run, 'brief.md'));
    expect(await invoke(author, 'artifact_read', { path: 'brief.md' })).toMatchObject({ ok: false, code: 'artifact-unavailable' });
    const review = f.tools('fidelity');
    expect(await invoke(review, 'artifact_read', { path: 'round-1/packet.json' })).toMatchObject({ ok: true, text: '{"source":"Own packet quotation."}' });
    expect(f.receipts.at(-1)!.classes).toEqual(['derived-composites', 'project-documentation']);
    await rm(path.join(f.directories.fidelity, 'round-1'), { recursive: true }); await symlink(f.run, path.join(f.directories.fidelity, 'round-1'));
    expect(await invoke(review, 'artifact_read', { path: 'round-1/packet.json' })).toMatchObject({ ok: false, code: 'artifact-unavailable' });
  });

  it('reads a design view through the virtual role port and retires the read after the receipt', async () => {
    const f = await fixture(), file = 'round-1/design-view.json', text = '{"own":"&lt;p&gt;Own inert design&lt;/p&gt;"}';
    const bytes = Buffer.from(text), digest = sha256(bytes);
    await mkdir(path.join(f.directories.design, 'round-1'), { recursive: true });
    await f.put(f.directories.design, file, '{"own":"role-written impostor"}');
    await f.put(f.directories.design, 'round-1/packet.json', '{"own":"generic packet"}');
    let opens = 0, closes = 0, valid = true;
    const designArtifact: NonNullable<SessionToolsOptions['designArtifact']> = async path => {
      opens++;
      if (path !== file) return null;
      return { bytes, origins: { digest, classes: ['derived-composites'], originIds: ['origin:own-view'] },
        revalidate: () => { if (!valid) throw new Error('retired'); }, close: () => { closes++; } };
    };
    const design = f.tools('design', { designArtifact });
    for (const role of ['author', 'inventory', 'fidelity'] as const) {
      const tools = f.tools(role, { designArtifact });
      expect(tools.validateToolInput('mcp__syzygy__artifact_read', { path: file })).toBe(false);
      expect(await invoke(tools, 'artifact_read', { path: file })).toMatchObject({ ok: false, code: 'path-refused' });
    }
    expect(opens).toBe(0);
    expect(await invoke(f.tools('design'), 'artifact_read', { path: file })).toMatchObject({ ok: false, code: 'path-refused' });
    expect(await invoke(design, 'artifact_read', { path: 'round-1/packet.json' })).toMatchObject({ ok: false, code: 'path-refused' });
    expect(await invoke(design, 'artifact_read', { path: 'round-2/design-view.json' })).toMatchObject({ ok: false, code: 'artifact-unavailable' });
    expect(await invoke(design, 'artifact_read', { path: file })).toEqual({ ok: true, kind: 'artifact', path: file, text, sha256: digest });
    expect(f.receipts.at(-1)!.originIds).toEqual(['origin:own-view']);
    expect(closes).toBe(1);
    const retired = f.tools('design', { designArtifact, onReceipt: receipt => { expect(receipt.toolInput).toEqual({ path: file }); valid = false; } });
    expect(await invoke(retired, 'artifact_read', { path: file })).toMatchObject({ ok: false, code: 'receipt-unavailable' });
    expect(closes).toBe(2);
    valid = true;
    let verifiedBeforeExpiry = false, released = false;
    const guarded = await design.invoke({ tool: 'artifact_read', input: { path: file } }, (reply, revalidate) => {
      expect(closes).toBe(2);
      expect(reply).toMatchObject({ ok: true, sha256: digest });
      expect(revalidate).toBeTypeOf('function');
      revalidate!();
      verifiedBeforeExpiry = true;
      valid = false;
      revalidate!();
      released = true;
    });
    expect(guarded).toMatchObject({ ok: false, code: 'receipt-unavailable' });
    expect(verifiedBeforeExpiry).toBe(true);
    expect(released).toBe(false);
    expect(closes).toBe(3);
  });

  it.each([
    [1, ['wait', 'close']],
    [2, ['wait', 'revalidate', 'wait', 'close']],
    [3, ['wait', 'revalidate', 'wait', 'receipt', 'wait', 'close']],
  ] as const)('refuses artifact delivery when receipt wait %i fails', async (refuseAt, expected) => {
    const f = await fixture(), file = 'round-1/design-view.json', bytes = Buffer.from('{"own":"Owned inert fixture."}');
    const digest = sha256(bytes);
    const events: string[] = [];
    let waits = 0;
    const waitForSample = async (): Promise<void> => {
      events.push('wait');
      if (++waits === refuseAt) throw new Error('resource sample expired');
    };
    const tools = f.tools('design', {
      designArtifact: async () => ({
        bytes, origins: { digest, classes: ['derived-composites'], originIds: ['origin:own-view'] }, waitForSample,
        revalidate: () => { events.push('revalidate'); }, close: () => { events.push('close'); },
      }),
      onReceipt: (receipt, wait) => {
        expect(wait).toBe(waitForSample);
        expect(receipt.canonicalText).toBe(JSON.stringify({ kind: 'artifact', ok: true, path: file, sha256: digest, text: bytes.toString() }));
        events.push('receipt');
      },
    });
    const reply = await tools.invoke({ tool: 'artifact_read', input: { path: file } }, () => { events.push('release'); });
    expect(reply).toMatchObject({ ok: false, code: 'receipt-unavailable' });
    expect(events).toEqual(expected);
  });

  it('screens decoded artifact inputs, requires matching origins and validates the draft before any write', async () => {
    const f = await fixture(); const prior = await readFile(path.join(f.run, 'drafts/next.json'), 'utf8');
    const author = f.tools();
    for (const content of ['{', '{}', JSON.stringify({ ...validDraft(f.pin), pinnedRevision: 'b'.repeat(40) }),
      '{"title":"SYNTHETIC_SECRET"}', JSON.stringify({ ...validDraft(f.pin), title: 'SYNTHETIC_SECRET' }).replace('SYNTHETIC_SECRET', '\\u0053YNTHETIC_SECRET'), '{"a":"CROSS","b":"BOUNDARY"}']) {
      expect((await invoke(author, 'artifact_write', { path: 'drafts/next.json', content })).ok).toBe(false);
      expect(await readFile(path.join(f.run, 'drafts/next.json'), 'utf8')).toBe(prior);
    }
    expect(JSON.stringify(f.receipts)).not.toContain('SYNTHETIC_SECRET');
    const mismatch = f.tools('author', { inputOrigins: () => ({ digest: '0'.repeat(64), classes: ['derived-composites'], originIds: ['provider:wrong'] }) });
    expect(await invoke(mismatch, 'artifact_write', { path: 'drafts/next.json', content: prior })).toMatchObject({ ok: false, code: 'unknown-origin' });
    const unknownClass = f.tools('author', { inputOrigins: (_tool, _input, data) => ({ digest: sha256(data), classes: ['unclassified' as SessionContentClass], originIds: ['provider:unknown'] }) });
    expect(await invoke(unknownClass, 'artifact_write', { path: 'drafts/next.json', content: prior })).toMatchObject({ ok: false, code: 'unknown-origin' });
    let permitted = true;
    const changedBeforeWrite = f.tools('author', { reverify: async () => permitted, inputOrigins: (_tool, _input, data) => {
      permitted = false; return { digest: sha256(data), classes: ['derived-composites'], originIds: ['provider:changed'] };
    } });
    expect(await invoke(changedBeforeWrite, 'artifact_write', { path: 'drafts/next.json', content: JSON.stringify({ ...validDraft(f.pin), title: 'This write must never happen' }) })).toMatchObject({ ok: false, code: 'binding-changed' });
    expect(await readFile(path.join(f.run, 'drafts/next.json'), 'utf8')).toBe(prior);
    const next = JSON.stringify({ ...validDraft(f.pin), title: 'Updated own fixture' });
    expect(await invoke(author, 'artifact_write', { path: 'drafts/next.json', content: next })).toMatchObject({ ok: true, kind: 'artifact-written', sha256: sha256(next) });
    expect(await readFile(path.join(f.run, 'drafts/next.json'), 'utf8')).toBe(next);
    expect(await readdir(path.join(f.run, 'drafts'))).toEqual(['next.json']);
    expect(f.receipts.at(-1)!.classes).toEqual(['derived-composites', 'project-documentation', 'work-history']);
    await rm(path.join(f.run, 'drafts/next.json')); await symlink(path.join(f.root, 'outside-write'), path.join(f.run, 'drafts/next.json'));
    expect(await invoke(author, 'artifact_write', { path: 'drafts/next.json', content: next })).toMatchObject({ ok: false, code: 'artifact-unavailable' });
    await expect(readFile(path.join(f.root, 'outside-write'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('executes only fixed author commands and screened own helper stdin, with one-minute bounded await queries', async () => {
    const f = await fixture(); const author = f.tools();
    for (const argv of [['dossier', 'check', f.run, '--draft', '/outside'], ['dossier', 'status', f.directories.inventory], ['node', '-e', 'outside'], ['dossier', 'await', f.run]])
      expect(await invoke(author, 'dossier_step', { argv })).toMatchObject({ ok: false, code: 'command-refused' });
    expect(f.calls).toHaveLength(0);
    expect(await invoke(author, 'dossier_step', { argv: ['dossier', 'check', `${f.run}/`, '--json'] })).toMatchObject({ ok: true, kind: 'dossier-result' });
    expect(f.calls[0]!.argv).toEqual(['dossier', 'check', f.run, '--json']);
    const inventory = f.tools('inventory');
    expect(await invoke(inventory, 'dossier_step', { argv: ['dossier', 'await', f.directories.inventory] })).toMatchObject({ ok: true });
    expect(f.calls.at(-1)!.argv).toEqual(['dossier', 'await', f.directories.inventory, '--wait-minutes', '1']);
    const base = ['dossier', 'await', f.directories.inventory]; const previous = f.calls.length;
    for (const input of [ { argv: [...base, '--submit', 'inventory.json'] }, { argv: [...base, '--submit', '/outside', '--stdin'], stdin: '{}' },
      { argv: [...base, '--submit', 'round-1/verdict.json', '--stdin'], stdin: '{}' }, { argv: [...base, '--wait-minutes', '2'] },
      { argv: [...base, '--submit', 'inventory.json', '--stdin'], stdin: '{"x":"SYNTHETIC_SECRET"}' } ]) expect((await invoke(inventory, 'dossier_step', input)).ok).toBe(false);
    expect(f.calls).toHaveLength(previous);
    const stdin = '{"own":"inventory"}';
    expect(await invoke(inventory, 'dossier_step', { argv: [...base, '--submit', 'inventory.json', '--stdin'], stdin })).toMatchObject({ ok: true });
    expect(Buffer.from(f.calls.at(-1)!.stdin!).toString('utf8')).toBe(stdin);
    const fidelity = f.tools('fidelity');
    expect(await invoke(fidelity, 'dossier_step', { argv: ['dossier', 'await', f.directories.fidelity, '--submit', 'round-1/verdict.json', '--stdin'], stdin: '{}' })).toMatchObject({ ok: true });
    await rm(path.join(f.directories.fidelity, 'round-1'), { recursive: true }); await symlink(f.run, path.join(f.directories.fidelity, 'round-1'));
    expect(await invoke(fidelity, 'dossier_step', { argv: ['dossier', 'await', f.directories.fidelity, '--submit', 'round-1/verdict.json', '--stdin'], stdin: '{}' }))
      .toMatchObject({ ok: false, code: 'artifact-unavailable' });
  });

  it('keeps queued capacity occupied until the underlying dossier operation actually settles', async () => {
    const f = await fixture();
    let finish!: (value: { stdout: string; stderr: string; exit: number }) => void;
    let started!: () => void;
    const begun = new Promise<void>(resolve => { started = resolve; });
    let calls = 0;
    const tools = f.tools('author', { runDossier: async () => {
      calls++; if (calls !== 1) return { stdout: '{}', stderr: '', exit: 0 };
      started(); return new Promise(resolve => { finish = resolve; });
    } });
    const request = { tool: 'dossier_step', input: { argv: ['dossier', 'status', f.run] } };
    const first = tools.invoke(request); await begun;
    const queued = [tools.invoke(request), tools.invoke(request), tools.invoke(request)];
    const extra = tools.invoke(request);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refused = await Promise.race([extra, new Promise(resolve => { timer = setTimeout(() => resolve({ code: 'still-pending' }), 100); })]);
    if (timer !== undefined) clearTimeout(timer);
    expect(calls).toBe(1); expect(f.receipts).toHaveLength(0);
    finish({ stdout: '{}', stderr: '', exit: 0 });
    for (const reply of await Promise.all([first, ...queued])) expect(reply.ok).toBe(true);
    await extra;
    expect(refused).toMatchObject({ ok: false, code: 'capacity-exhausted' });
    expect(calls).toBe(4);
    expect((await tools.invoke(request)).ok).toBe(true);
  });

  it('refuses changed policy/provider, failed receipts, unknown response origins and all raw dossier errors', async () => {
    const f = await fixture(); const author = f.tools();
    f.revoke();
    expect(await invoke(author, 'source_read', { path: 'README.md' })).toMatchObject({ ok: false, code: 'binding-changed' });
    expect(f.receipts).toHaveLength(0);
    const wrong = f.tools('author', { binding: { run: path.basename(f.run), role: 'inventory', sourceBinding: sourceBindingSha256(f.recorded.subject), policy: f.screen.policySha256, provider: 'other-provider', model: 'fixture-model' } });
    expect(await invoke(wrong, 'artifact_read', { path: 'brief.md' })).toMatchObject({ ok: false, code: 'binding-changed' });
    let stillCurrent = true;
    const changedAtReceipt = f.tools('author', { reverify: async () => stillCurrent, onReceipt: () => { stillCurrent = false; } });
    expect(await invoke(changedAtReceipt, 'source_read', { path: 'README.md' })).toMatchObject({ ok: false, code: 'binding-changed' });
    const failedReceipt = f.tools('author', { reverify: async () => true, onReceipt: () => { throw new Error('SYNTHETIC_SECRET callback detail'); } });
    expect(await invoke(failedReceipt, 'source_read', { path: 'README.md' })).toMatchObject({ ok: false, code: 'receipt-unavailable' });
    const argv = ['dossier', 'status', f.run];
    for (const runDossier of [ async () => { throw new Error('SYNTHETIC_SECRET error'); }, async () => ({ stdout: '', stderr: 'raw path /outside and SYNTHETIC_SECRET', exit: 1 }), async () => ({ stdout: 'raw safe-looking error', stderr: '', exit: 1 }),
      async () => ({ stdout: '{"x":"\\u0053YNTHETIC_SECRET"}', stderr: '', exit: 0 }) ]) {
      const reply = await invoke(f.tools('author', { reverify: async () => true, runDossier }), 'dossier_step', { argv });
      expect(reply.ok).toBe(false); expect(JSON.stringify(reply)).not.toContain('SYNTHETIC_SECRET'); expect(JSON.stringify(reply)).not.toContain('/outside');
    }
    const unknown = f.tools('author', { reverify: async () => true, dossierOrigins: () => null });
    expect(await invoke(unknown, 'dossier_step', { argv })).toMatchObject({ ok: false, code: 'unknown-origin' });
    expect(f.reverifications()).toBeGreaterThan(0);
  });
});


describe('URL control through the unchanged dossier_step schema', () => {
  const flush = async () => { for (let index = 0; index < 100; index++) await Promise.resolve(); };
  async function controlled() {
    const f = await fixture(), frames: UrlSessionQuestionFrame[] = [], audits: UrlSessionControlAudit[] = [];
    let resolveAnswer!: (answer: UrlSessionAnswer) => void;
    const answer = new Promise<UrlSessionAnswer>(resolve => { resolveAnswer = resolve; });
    const control = createUrlSessionControl({ run: f.run, binding: { run: path.basename(f.run), sourceBinding: sourceBindingSha256(f.recorded.subject),
      policy: f.screen.policySha256, provider: 'anthropic', model: 'fixture-model' }, screen: f.screen, current: () => true,
      maxQuestions: 1, reserveQuestion: () => true, audit: event => { audits.push(event); },
      ask: frame => { frames.push(frame); return answer; }, onFailure: () => {}, limits: { designWaitMilliseconds: 25 } });
    controls.push(control);
    return { ...f, control, frames, audits, resolveAnswer };
  }
  const step = (tools: ReturnType<typeof createSessionTools>, argv: string[], stdin?: string) => invoke(tools, 'dossier_step', { argv, ...(stdin === undefined ? {} : { stdin }) });

  it('returns the original exit of authenticated findings and wait reports', async () => {
    const f = await controlled();
    const commands = [
      { role: 'author', argv: ['dossier', 'check', f.run], exit: 1, report: { command: 'check', outcome: 'findings' } },
      { role: 'fidelity', argv: ['dossier', 'await', f.directories.fidelity], exit: 3, report: { command: 'await', outcome: 'waiting' } },
      { role: 'inventory', argv: ['dossier', 'await', f.directories.inventory, '--submit', 'inventory.json', '--stdin'],
        stdin: '{}', exit: 1, report: { command: 'await', outcome: 'submitted', passed: false } },
    ] as const;
    for (const item of commands) {
      const stdin = 'stdin' in item ? item.stdin : undefined;
      const response = { stdout: JSON.stringify(item.report), stderr: '', exit: item.exit };
      const runDossier = async () => response;
      const control = f.control.forRole(item.role);
      expect(await step(f.tools(item.role, { urlControl: control, runDossier }), [...item.argv], stdin)).toMatchObject({ ok: true, kind: 'dossier-result', ...response });
      expect(await step(f.tools(item.role, { runDossier }), [...item.argv], stdin)).toMatchObject({ ok: false, code: 'dossier-refused' });
      expect(await step(f.tools(item.role, { urlControl: control, runDossier, dossierOrigins: () => null }), [...item.argv], stdin)).toMatchObject({ ok: false, code: 'unknown-origin' });
      const mismatched = async () => ({ ...response, exit: 2 });
      expect(await step(f.tools(item.role, { urlControl: control, runDossier: mismatched }), [...item.argv], stdin)).toMatchObject({ ok: false, code: 'dossier-refused' });
      const refused = async () => ({ ...response, stdout: JSON.stringify({ command: item.report.command, outcome: 'refused' }) });
      expect(await step(f.tools(item.role, { urlControl: control, runDossier: refused }), [...item.argv], stdin)).toMatchObject({ ok: false, code: 'dossier-refused' });
    }
  });

  it('adds only exact own-run commands with a genuine role-bound capability and leaves default operator commands unchanged', async () => {
    const f = await controlled();
    for (const role of ['author', 'inventory', 'fidelity', 'design'] as const) {
      const tools = f.tools(role, { urlControl: f.control.forRole(role) });
      expect(tools.validateToolInput('mcp__syzygy__dossier_step', { argv: ['dossier', 'poll', f.run] })).toBe(true);
      expect(await step(tools, ['dossier', 'poll', f.run])).toMatchObject({ ok: true, kind: 'session-control', state: 'pending' });
      for (const argv of [['dossier', 'poll', `${f.run}/`], ['dossier', 'poll', '/other/run'], ['dossier', 'poll', f.run, '--json'], ['dossier', 'shell', f.run]]) {
        expect(tools.validateToolInput('mcp__syzygy__dossier_step', { argv })).toBe(false);
      }
      expect(tools.validateToolInput('mcp__syzygy__dossier_step', { argv: ['dossier', 'clarify', f.run, '--stdin'], stdin: '{"kind":"question","question":"Own question"}' })).toBe(role === 'author');
    }
    const defaultTools = f.tools();
    expect(await step(defaultTools, ['dossier', 'poll', f.run])).toMatchObject({ ok: false, code: 'command-refused' });
    expect(await step(defaultTools, ['dossier', 'status', f.run])).toMatchObject({ ok: true, kind: 'dossier-result' });
    const fake = f.tools('author', { urlControl: { ...f.control.forRole('author') } });
    expect(await step(fake, ['dossier', 'poll', f.run])).toMatchObject({ ok: false, code: 'command-refused' });
    const wrong = f.tools('author', { urlControl: f.control.forRole('design') });
    expect(await step(wrong, ['dossier', 'poll', f.run])).toMatchObject({ ok: false, code: 'command-refused' });
    expect(f.calls.map(call => call.argv[1])).toEqual(['status']);
  });

  it('returns typed events and an exact canonical one-use answer through the normal receipt using actual input-origin callbacks', async () => {
    const f = await controlled(), observed: string[] = [];
    const tools = f.tools('author', { urlControl: f.control.forRole('author'), inputOrigins: (_tool, _input, data) => {
      observed.push(new TextDecoder().decode(data)); return { digest: sha256(data), classes: ['project-documentation'], originIds: [`provider:own-${observed.length}`] };
    } });
    expect(await f.control.publish('author', { event: 'draft-ready', revision: 2 })).toBe(true);
    expect(await step(tools, ['dossier', 'poll', f.run])).toMatchObject({ ok: true, events: [{ event: 'draft-ready', revision: 2, sequence: 1 }] });
    const question = JSON.stringify({ kind: 'question', question: 'Which own fixture description?', options: ['First own choice', 'Second own choice'] });
    const started = await step(tools, ['dossier', 'clarify', f.run, '--stdin'], question); await flush();
    expect(started).toMatchObject({ ok: true, state: 'pending' }); expect(f.frames).toHaveLength(1);
    const frame = f.frames[0]!;
    f.resolveAnswer({ kind: 'answered', nonce: frame.nonce, questionSha256: frame.questionSha256, answerKind: 'selected-interpretation', answer: 'Second own choice' }); await flush();
    const retrieval = JSON.stringify({ kind: 'answer', nonce: frame.nonce, questionSha256: frame.questionSha256 });
    const result = await step(tools, ['dossier', 'clarify', f.run, '--stdin'], retrieval);
    expect(result).toMatchObject({ ok: true, state: 'answered', answer: 'Second own choice', attribution: 'operator', label: 'Inferred' });
    expect(observed).toEqual([question, retrieval]);
    const receipt = f.receipts.at(-1)!;
    expect(receipt.canonicalText).toBe(encodeCanonicalJson(result, { maxBytes: 65_536, maxNodes: 512, maxDepth: 8 }));
    expect(receipt.digest).toBe(sha256(receipt.canonicalText));
    expect(receipt.classes).toEqual(['project-documentation', 'work-history']);
    expect(receipt.originIds).toEqual(expect.arrayContaining(['provider:own-1', 'provider:own-2', `url-control:question:${frame.questionSha256}`, `url-control:answer:${sha256('Second own choice')}`]));
    expect(JSON.stringify(f.audits)).not.toContain('Second own choice'); expect(JSON.stringify(f.audits)).not.toContain('Which own fixture description?');
    expect(await step(tools, ['dossier', 'clarify', f.run, '--stdin'], retrieval)).toMatchObject({ ok: false }); expect(f.calls).toEqual([]);
  });

  it('composes the actual provider-issued controller record, unchanged schema validation, receipts, and next request for a complete clarification', async () => {
    const f = await fixture();
    const record = recordRunConfig({ ...f.recorded.declared, model: DEFAULT_SESSION_MODEL }, f.recorded.subject);
    const binding = { run: path.basename(f.run), role: 'author' as const, sourceBinding: sourceBindingSha256(record.subject),
      policy: f.screen.policySha256, provider: 'anthropic', model: DEFAULT_SESSION_MODEL };
    const compiled = createSessionProfile({ binding, sessionId: '12345678-1234-4234-8234-123456789012', systemPrompt: 'Use the four bounded tools.',
      initialPrompt: 'Ask about the own synthetic fixture.', utcDate: '2026-11-19', kernelRelease: '6.0.0-own' });
    if (!compiled.ok) throw new Error('own profile refused'); const profile = compiled.value.profile;
    let tools!: ReturnType<typeof createSessionTools>;
    const controller = createSessionController({ profile, declaredClasses: SESSION_CONTENT_CLASSES, scanSecrets: secret,
      initialOrigin: { binding, id: 'initial:own-controller', kind: 'initial-prompt', canonicalText: profile.input.initialPrompt,
        classes: ['project-documentation'], originIds: ['source:own-controller'] }, validateToolInput: (name, input) => tools.validateToolInput(name, input) });
    const control = createUrlSessionControl({ run: f.run, binding: { run: binding.run, sourceBinding: binding.sourceBinding,
      policy: binding.policy, provider: binding.provider, model: binding.model }, screen: f.screen, current: () => true, maxQuestions: 1,
      reserveQuestion: () => true, audit: () => {}, onFailure: () => {}, ask: frame => ({ kind: 'answered', nonce: frame.nonce,
        questionSha256: frame.questionSha256, answerKind: 'free-text', answer: 'Own operator description.' }) });
    controls.push(control);
    tools = f.tools('author', { record, binding, urlControl: control.forRole('author'), inputOrigins: controller.inputOrigins,
      onReceipt: async receipt => { await controller.onReceipt(receipt); f.receipts.push(receipt); } });
    const { tool_choice: _projected, ...wire } = profile.baseline;
    const request = (messages: unknown[]) => bytes(JSON.stringify({ ...wire, metadata: {
      user_id: JSON.stringify({ device_id: '0'.repeat(64), account_uuid: '', session_id: profile.input.sessionId }) }, messages }));
    const issue = (id: string, input: Record<string, unknown>) => ({ type: 'tool_use', id, name: 'mcp__syzygy__dossier_step', input });
    const response = (call: unknown) => bytes(JSON.stringify({ id: 'msg_own_control', type: 'message', role: 'assistant', model: DEFAULT_SESSION_MODEL,
      content: [call], stop_reason: 'tool_use', stop_sequence: null, usage: { input_tokens: 3, output_tokens: 5 } }));
    const firstInput = { argv: ['dossier', 'clarify', f.run, '--stdin'], stdin: '{"kind":"question","question":"Describe the own fixture?"}' };
    const first = issue('toolu_control_1', firstInput);
    expect(controller.request(request([profile.initialMessage])).ok).toBe(true);
    expect(controller.response(response(first), 'application/json')).toEqual({ ok: true });
    expect(controller.beginTool({ tool: 'dossier_step', input: firstInput })).toBe(true);
    const initial = await step(tools, firstInput.argv, firstInput.stdin); await flush();
    expect(initial).toMatchObject({ ok: true, state: 'pending' }); expect(controller.completeTool(initial)).toBe(true);
    const firstReceipt = f.receipts[0]!;
    expect(firstReceipt.originIds).toContain('provider-response:1'); expect(firstReceipt.originIds).toContain('source:own-controller');
    const history = [profile.historicalInitialMessage, { role: 'assistant', content: [first] }, { role: 'user', content: [{ type: 'tool_result', tool_use_id: first.id,
      content: [{ type: 'text', text: firstReceipt.canonicalText + '\n' }, { type: 'text', text: sessionProfileReminderText(14_999_992) }],
      cache_control: { type: 'ephemeral', ttl: '1h' } }] }];
    expect(controller.request(request(history)).ok).toBe(true);
    const nextInput = { argv: firstInput.argv, stdin: JSON.stringify({ kind: 'answer', nonce: initial.nonce, questionSha256: initial.questionSha256 }) };
    expect(controller.response(response(issue('toolu_control_2', nextInput)), 'application/json')).toEqual({ ok: true });
    expect(controller.beginTool({ tool: 'dossier_step', input: nextInput })).toBe(true);
    const answer = await step(tools, nextInput.argv, nextInput.stdin);
    expect(answer).toMatchObject({ ok: true, state: 'answered', answer: 'Own operator description.', label: 'Inferred' });
    expect(controller.completeTool(answer)).toBe(true);
    expect(f.receipts.at(-1)!.originIds).toContain('provider-response:2');
    expect(f.receipts.at(-1)!.classes).toEqual(expect.arrayContaining(['derived-composites', 'project-documentation', 'work-history']));
    expect(f.calls).toEqual([]);
  });

  it('cannot replace actual provider input origins with claimed payload ids and screens decoded/nested/composed input before UI', async () => {
    const f = await controlled(), tools = f.tools('author', { urlControl: f.control.forRole('author'), inputOrigins: () => null });
    const question = JSON.stringify({ kind: 'question', question: 'Own safe question' });
    expect(await step(tools, ['dossier', 'clarify', f.run, '--stdin'], question)).toMatchObject({ ok: false, code: 'unknown-origin' });
    const valid = f.tools('author', { urlControl: f.control.forRole('author') });
    for (const stdin of ['{"kind":"question","question":"Own safe question","originIds":["provider:forged"]}',
      '{"kind":"question","question":"Own safe question","evidence":"SYNTHETIC_\\u0053ECRET"}',
      '{"kind":"question","question":"Own safe question","evidence":{"nested":"<script>own()</script>"}}',
      '{"kind":"question","question":"CROSS","options":["BOUNDARY","safe"]}']) {
      expect((await step(valid, ['dossier', 'clarify', f.run, '--stdin'], stdin)).ok).toBe(false);
    }
    expect(f.frames).toEqual([]); expect(f.audits).toEqual([]); expect(f.calls).toEqual([]);
  });

  it('withholds the raw answer if canonical receipt registration throws', async () => {
    const f = await controlled(), tools = f.tools('author', { urlControl: f.control.forRole('author') });
    await step(tools, ['dossier', 'clarify', f.run, '--stdin'], '{"kind":"question","question":"Own safe question"}'); await flush();
    const frame = f.frames[0]!;
    f.resolveAnswer({ kind: 'answered', nonce: frame.nonce, questionSha256: frame.questionSha256, answerKind: 'free-text', answer: 'OWN_EPHEMERAL_ANSWER' }); await flush();
    const broken = f.tools('author', { urlControl: f.control.forRole('author'), onReceipt: () => { throw new Error('own receipt refused'); } });
    const result = await step(broken, ['dossier', 'clarify', f.run, '--stdin'], JSON.stringify({ kind: 'answer', nonce: frame.nonce, questionSha256: frame.questionSha256 }));
    expect(result).toMatchObject({ ok: false, code: 'receipt-unavailable' }); expect(JSON.stringify(result)).not.toContain('OWN_EPHEMERAL_ANSWER');
    expect(JSON.stringify(f.audits)).not.toContain('OWN_EPHEMERAL_ANSWER');
  });

  it('snapshots the optional control capability before asynchronous tool work begins', async () => {
    const f = await controlled();
    const config: SessionToolsOptions = { role: 'author', run: f.run, sessionDir: f.run, record: f.recorded, screen: f.screen,
      binding: { run: path.basename(f.run), role: 'author', sourceBinding: sourceBindingSha256(f.recorded.subject),
        policy: f.screen.policySha256, provider: 'anthropic', model: 'fixture-model' },
      scanSecrets: secret, reverify: async () => true, runDossier: async () => { throw new Error('unexpected command'); },
      onReceipt: () => {}, urlControl: f.control.forRole('author') };
    const tools = createSessionTools(config); Object.assign(config, { urlControl: undefined });
    expect(await step(tools, ['dossier', 'poll', f.run])).toMatchObject({ ok: true, kind: 'session-control' });
  });
});
