import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sha256 } from '@syzygy/support';
import { parseRunConfig } from './run-config.js';
import { DOSSIER_CONTENT_CLASSES, NO_WORK_ITEM_REASON, encodeRunRecord, readRunRecord, type RunSubject } from './run-record.js';
import { DOSSIER_POLICY_PATH } from './policy-snapshot.js';
import {
  URL_CONTENT_CLASSES, URL_DECLARATION_LIMITS, URL_ORIGIN_POLICY_PATH, URL_PROFILE_ID, URL_ROLES, URL_RUN_MODE,
  createUrlRunDeclaration, encodeUrlRunDeclaration, readEffectiveRunDeclaration, urlSourceTransportIdentity,
  type UrlContentClass, type UrlPlannedOrigin, type UrlRoleDeclaration, type UrlRunDeclarationContext, type UrlRunDeclarationInput,
} from './url-run-record.js';

const H = 'a'.repeat(64), OTHER = 'b'.repeat(64), PIN = 'c'.repeat(40);
const BASE_POLICY = { path: DOSSIER_POLICY_PATH, policyId: 'POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1', policyVersion: '1.0.0', commit: PIN, sha256: H };
const ORIGIN_POLICY = { path: URL_ORIGIN_POLICY_PATH, policyId: 'POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1', policyVersion: '1.0.0', commit: PIN, sha256: OTHER };
const CONFIG = { operator: 'synthetic-operator', agentTool: 'claude-code', agentToolVersion: '2.1.327', agentProvider: 'anthropic', model: 'claude-sonnet-4-6',
  deadline: 'PT3H', agentTurnBudget: 300, maxRepairCycles: 2, maxQuestions: 1, audience: 'synthetic-reader', operatorIsOwner: false };
const SUBJECT: RunSubject = {
  repository: { url: 'example.invalid/team/project', repositoryId: 'team-project', role: 'observed-source' },
  clone: { path: '/synthetic/owned-clone', declaredBy: 'operator', label: 'Inferred', use: 'read' },
  pinnedRevision: { commit: PIN, label: 'HEAD at synthetic capture', pinnedAt: '2026-11-19T01:00:00.000Z' },
  screeningPolicy: BASE_POLICY, contentClasses: DOSSIER_CONTENT_CLASSES,
  visibility: { value: 'private', source: 'conservative-default', declaredBy: 'conservative default', label: 'Inferred' },
  governed: { kind: 'unstated', because: ['synthetic fixture makes no governance declaration'] },
  workItem: { identity: null, reason: NO_WORK_ITEM_REASON },
};
function base(subject = SUBJECT, config = CONFIG): string {
  const parsed = parseRunConfig(JSON.stringify(config));
  if (!parsed.ok) throw new Error('synthetic run config invalid');
  return encodeRunRecord(parsed.config, subject);
}
function fixture(allClasses = false): { input: UrlRunDeclarationInput; context: UrlRunDeclarationContext } {
  const identity = urlSourceTransportIdentity('https://example.invalid/team/project');
  if (!identity.ok) throw new Error('synthetic transport invalid');
  const plannedOrigins: UrlPlannedOrigin[] = [
    { id: 'origin:metadata', species: 'structural-source-and-tool-metadata', sha256: H, classes: ['code-structure'], originIds: [] },
    { id: 'origin:scaffold', species: 'fixed-role-policy-and-cli-scaffold', sha256: H, classes: ['governance-text'], originIds: [] },
  ];
  if (allClasses) plannedOrigins.push(
    { id: 'origin:code', species: 'pinned-repository-body', sha256: H, classes: ['code-content'], originIds: [] },
    { id: 'origin:docs', species: 'pinned-repository-body', sha256: H, classes: ['project-documentation'], originIds: [] },
    { id: 'origin:commit', species: 'verified-selected-git-commit-envelope-message', sha256: H, classes: ['work-history'], originIds: [] },
    { id: 'origin:report', species: 'role-report-or-verdict', sha256: H, classes: ['code-content', 'evidence-content', 'work-history'], originIds: ['origin:code', 'origin:commit'] },
  );
  const inheritedIds = plannedOrigins.map(origin => origin.id);
  const inheritedClasses = [...new Set(plannedOrigins.flatMap(origin => origin.classes))];
  plannedOrigins.push({ id: 'origin:packet', species: 'composed-role-input-or-broker-result', sha256: OTHER,
    classes: [...inheritedClasses, 'derived-composites' as UrlContentClass].sort(), originIds: inheritedIds });
  const roles: UrlRoleDeclaration[] = URL_ROLES.map((role, index) => ({ role, sessionId: `0000000${index}-0000-4000-8000-000000000000`,
    profileId: URL_PROFILE_ID, compiledProfileSha256: OTHER, commandSha256: H, instructionSha256: H, viewSha256: H,
    scaffoldSha256: H, mcpSha256: H, configurationSha256: H, executableSha256: H, inputPacketSha256: OTHER, inputOriginId: 'origin:packet',
    capture: { pid: 'Unknown', startedAt: 'Unknown', finishedAt: 'Unknown', outcome: 'Unknown' } }));
  const input: UrlRunDeclarationInput = { runId: 'synthetic-run-1', originPolicy: ORIGIN_POLICY,
    inference: { provider: 'anthropic', tool: 'claude-code', toolVersion: '2.1.327', model: 'claude-sonnet-4-6', modelSelection: 'supported-default', profile: { id: URL_PROFILE_ID, sha256: H } },
    sourceTransport: { originalLocator: identity.originalLocator, destination: identity.destination, providerId: identity.providerId,
      acquisitionId: 'acq-0123456789abcdef0123456789abcdef', metadataClasses: ['code-structure'], selectionOrigin: 'validated-destination-before-acquisition',
      commandSha256: H, protocolSha256: H, configurationSha256: H, executableSha256: H, environmentSha256: H },
    plannedOrigins, roles, protectedAudit: 'url-audit:synthetic-run-1' };
  return { input, context: { runId: input.runId, expectedBasePolicy: BASE_POLICY, expectedOriginPolicy: ORIGIN_POLICY,
    expectedSourceTransport: input.sourceTransport, expectedProfileSha256: H } };
}
function issued(allClasses = false) {
  const { input, context } = fixture(allClasses), baseText = base();
  const result = createUrlRunDeclaration(baseText, input, context);
  expect(result.ok, 'the synthetic supported declaration must validate').toBe(true);
  if (!result.ok) throw new Error(`synthetic URL declaration failed: ${result.code}`);
  return { ...result, baseText, input, context };
}
function altered(text: string, change: (value: Record<string, any>) => void): string {
  const value: Record<string, any> = JSON.parse(text); change(value); return JSON.stringify(value);
}
const code = (result: ReturnType<typeof readEffectiveRunDeclaration>): string => result.ok ? 'accepted' : result.code;

describe('effective URL run declaration (pure bounded historical metadata)', () => {
  it('preserves the absent-overlay operator record and its original provider/work-item/class semantics', () => {
    const baseText = base(SUBJECT, { ...CONFIG, agentTool: 'codex', agentToolVersion: 'synthetic-version', agentProvider: 'openai', model: 'synthetic-model' });
    const original = readRunRecord(baseText);
    const result = readEffectiveRunDeclaration(baseText, null, { runId: 'unrelated-directory' });
    expect(result.ok).toBe(true);
    if (!result.ok || !original.ok) throw new Error('synthetic core refused');
    expect(result.core).toEqual(original.record);
    expect(result.effective).toEqual({ kind: 'operator', declaration: original.record });
    expect(result.effective.declaration).toBe(result.core);
    expect(result.core.subject.contentClasses).toEqual(['code-content', 'project-documentation', 'governance-text']);
    expect(result.core.subject.workItem.reason).toBe(NO_WORK_ITEM_REASON);
    expect(code(readEffectiveRunDeclaration('{"format":"polaris-dossier-run/1"}', null))).toBe('invalid-base-record');
  });

  it('projects distinct inference/source declarations, supported-default attribution, exact base bytes and Unknown capture scope', () => {
    const result = issued(true);
    expect(result.sha256).toBe(sha256(result.text));
    expect(result.declaration.baseRunSha256).toBe(sha256(result.baseText));
    expect(result.declaration.mode).toBe('URL-supervised local CLI through checked transport relay');
    expect(result.declaration.label).toBe('Inferred');
    expect(result.declaration.inference.modelSelection).toBe('supported-default');
    expect(result.declaration.inference.profile.sha256).toBe(H);
    expect(result.declaration.roles[0]!.compiledProfileSha256).toBe(OTHER);
    expect(result.declaration.sourceTransport.providerId).toBe('git-source:' + sha256('{"host":"example.invalid","port":443,"repository":"/team/project","scheme":"https"}'));
    expect(result.declaration.sourceTransport.metadataClasses).toEqual(['code-structure']);
    expect(result.declaration.plannedClasses).toEqual(['code-content', 'code-structure', 'derived-composites', 'evidence-content', 'governance-text', 'project-documentation', 'work-history']);
    expect(result.declaration.workItem).toEqual({ identity: null, reason: 'local supervisor; no scheduler adapter' });
    expect(result.declaration.execution).toEqual({ observedCode: 'forbidden', permission: 'none' });
    expect(result.declaration.capture).toEqual({ actualSends: 'Unknown', providerReceipts: 'Unknown', modelVersion: 'Unknown', usage: 'Unknown', completeness: 'Unknown', sourceOperationOutcomes: 'Unknown' });
    expect(result.declaration.storage).toEqual({ protectedAudit: { locator: 'url-audit:synthetic-run-1', roleWritable: false }, compatibleHistory: { locator: 'run-directory-history', roleWritable: true } });
    const read = readEffectiveRunDeclaration(new TextEncoder().encode(result.baseText), new TextEncoder().encode(result.text), { ...result.context, expectedSidecarSha256: result.sha256 });
    expect(read.ok).toBe(true);
    if (!read.ok) throw new Error('synthetic issued record refused');
    expect(read.effective).toEqual({ kind: 'url', declaration: result.declaration });
    expect(Object.isFrozen(read.effective)).toBe(true);
    expect(Object.isFrozen(read.core.subject.screeningPolicy)).toBe(true);
    const explicit = fixture();
    expect(createUrlRunDeclaration(base(), { ...explicit.input, inference: { ...explicit.input.inference, modelSelection: 'operator-option' } }, explicit.context).ok).toBe(true);
  });

  it('requires independent run identity and refuses every changed base/source/policy/profile/provider binding without fallback', () => {
    const item = issued();
    expect(code(readEffectiveRunDeclaration(item.baseText, item.text))).toBe('invalid-url-declaration');
    expect(code(readEffectiveRunDeclaration(item.baseText, item.text, { runId: 'foreign-run' }))).toBe('binding-mismatch');
    expect(code(readEffectiveRunDeclaration(item.baseText + ' ', item.text, item.context))).toBe('binding-mismatch');
    const contexts: UrlRunDeclarationContext[] = [
      { ...item.context, expectedBasePolicy: { ...BASE_POLICY, commit: 'd'.repeat(40) } },
      { ...item.context, expectedOriginPolicy: { ...ORIGIN_POLICY, sha256: H } },
      { ...item.context, expectedSourceTransport: { ...item.input.sourceTransport, originalLocator: 'ssh://git@example.invalid/team/project' } },
      { ...item.context, expectedProfileSha256: OTHER }, { ...item.context, expectedSidecarSha256: OTHER },
    ];
    for (const context of contexts) expect(code(readEffectiveRunDeclaration(item.baseText, item.text, context))).toBe('binding-mismatch');
    const bindingChanges: ((value: Record<string, any>) => void)[] = [
      value => { value.runId = 'foreign-run'; }, value => { value.pinnedCommit = 'd'.repeat(40); },
      value => { value.sourceBindingSha256 = OTHER; }, value => { value.basePolicy.commit = 'd'.repeat(40); },
      value => { value.baseRunSha256 = OTHER; }, value => { value.originPolicy.sha256 = H; },
      value => { value.inference.profile.sha256 = OTHER; }, value => { value.sourceTransport.commandSha256 = OTHER; },
    ];
    for (const change of bindingChanges) expect(code(readEffectiveRunDeclaration(item.baseText, altered(item.text, change), item.context))).toBe('binding-mismatch');
    // A historical sidecar must match the compatible core even when the caller supplies only
    // directory identity; independent live expectations add authority checks, not this relation.
    expect(code(readEffectiveRunDeclaration(item.baseText, altered(item.text, value => { value.basePolicy.commit = 'd'.repeat(40); }), { runId: item.context.runId }))).toBe('binding-mismatch');
    expect(code(readEffectiveRunDeclaration(base(SUBJECT, { ...CONFIG, agentProvider: 'other-provider' }), item.text, item.context))).toBe('binding-mismatch');
    const changedBase = base({ ...SUBJECT, visibility: { ...SUBJECT.visibility, value: 'public', source: 'declaration' } });
    expect(code(readEffectiveRunDeclaration(changedBase, item.text, item.context))).toBe('binding-mismatch');
    expect(encodeUrlRunDeclaration(item.baseText, { ...item.declaration, pinnedCommit: 'd'.repeat(40) }, item.context).ok).toBe(false);
  });

  it('keeps the exact original transport while deriving scheme/host/port/repository independently of lossy provenance', () => {
    const https = urlSourceTransportIdentity('https://EXAMPLE.invalid:8443/Team/Project.git');
    const ssh = urlSourceTransportIdentity('ssh://git@example.invalid:2222/Team/Project.git');
    const scp = urlSourceTransportIdentity('git@example.invalid:Team/Project.git');
    expect(https).toMatchObject({ ok: true, originalLocator: 'https://EXAMPLE.invalid:8443/Team/Project.git', destination: { scheme: 'https', host: 'example.invalid', port: 8443, repository: '/Team/Project.git' } });
    expect(ssh).toMatchObject({ ok: true, destination: { scheme: 'ssh', host: 'example.invalid', port: 2222, repository: '/Team/Project.git' } });
    expect(scp).toMatchObject({ ok: true, destination: { scheme: 'ssh', host: 'example.invalid', port: 22, repository: 'Team/Project.git' } });
    for (const locator of ['http://example.invalid/team/project', 'file:///own/fixture', 'git://example.invalid/team/project',
      'https://user@example.invalid/team/project', 'ssh://git:synthetic-password@example.invalid/team/project',
      'https://example.invalid/a/../project', 'https://example.invalid/a/%2e%2e/project',
      'https://example.invalid/team/project?synthetic=1', 'https://example.invalid:99999/team/project', 'git@example.invalid::foreign-helper']) {
      expect(urlSourceTransportIdentity(locator).ok, locator).toBe(false);
    }
    const item = issued();
    for (const change of [
      (value: Record<string, any>) => { value.sourceTransport.destination.port = 8443; },
      (value: Record<string, any>) => { value.sourceTransport.providerId = 'anthropic'; },
      (value: Record<string, any>) => { value.sourceTransport.metadataClasses = ['code-content']; },
      (value: Record<string, any>) => { value.sourceTransport.acquisitionId = '../run/other'; },
      (value: Record<string, any>) => { value.sourceTransport.selectionOrigin = 'first-provider-request'; },
    ]) expect(code(readEffectiveRunDeclaration(item.baseText, altered(item.text, change), item.context))).toBe('invalid-url-declaration');
  });

  it('derives only explicitly justified class unions and retains the whole embedded-origin denominator', () => {
    const minimal = issued();
    expect(minimal.declaration.plannedClasses).toEqual(['code-structure', 'derived-composites', 'governance-text']);
    expect(URL_CONTENT_CLASSES.length).toBe(7);
    const item = issued(true);
    const changes: ((value: Record<string, any>) => void)[] = [
      value => { value.plannedClasses = ['derived-composites']; },
      value => { value.plannedOrigins[0].classes = ['code-content']; },
      value => { value.plannedOrigins[2].classes = ['work-history']; },
      value => { value.plannedOrigins[5].classes = ['evidence-content']; },
      value => { value.plannedOrigins[6].classes = ['derived-composites']; },
      value => { value.plannedOrigins[6].originIds = ['origin:missing']; },
      value => { value.plannedOrigins[6].originIds = ['origin:packet']; },
      value => { value.plannedOrigins[6].originIds.push('origin:code'); },
      value => { value.plannedOrigins[2].species = 'unknown-observed-body'; },
      value => { value.plannedOrigins[1].id = 'origin:metadata'; },
      value => { value.plannedOrigins = []; },
    ];
    for (const change of changes) expect(code(readEffectiveRunDeclaration(item.baseText, altered(item.text, change), item.context))).toBe('invalid-url-declaration');
    expect(createUrlRunDeclaration(base(), { ...minimal.input, plannedOrigins: [] }, minimal.context).ok).toBe(false);
  });

  it('rejects missing/cross-role/changed packet identities, foreign profiles and unsupported authority/capture fields', () => {
    const item = issued();
    const changes: ((value: Record<string, any>) => void)[] = [
      value => { value.roles.pop(); }, value => { value.roles[1].role = 'author'; },
      value => { value.roles[1].sessionId = value.roles[0].sessionId; }, value => { value.roles[0].profileId = 'foreign-profile'; },
      value => { delete value.roles[0].compiledProfileSha256; }, value => { value.inference.model = 'foreign-model'; },
      value => { value.roles[0].compiledProfileSha256 = 'Unknown'; },
      value => { value.inference.provider = 'foreign-provider'; }, value => { value.inference.profile.id = 'foreign-profile'; },
      value => { value.inference.modelSelection = 'operator'; }, value => { value.originPolicy.policyVersion = '2.0.0'; },
      value => { value.originPolicy.path = '../foreign-policy'; }, value => { value.execution.permission = 'granted'; },
      value => { value.capture.actualSends = 1; }, value => { value.roles[0].capture.pid = 123; },
      value => { value.storage.protectedAudit.roleWritable = true; }, value => { value.storage.protectedAudit.locator = 'url-audit:foreign-run'; },
      value => { value.roles[0].prompt = 'NONSECRET synthetic prompt must not be a metadata slot'; },
      value => { value.capture.transcript = 'NONSECRET synthetic transcript must not be a metadata slot'; },
    ];
    for (const change of changes) expect(code(readEffectiveRunDeclaration(item.baseText, altered(item.text, change), item.context))).toBe('invalid-url-declaration');
    for (const change of [
      (value: Record<string, any>) => { value.roles[0].inputPacketSha256 = H; },
      (value: Record<string, any>) => { value.roles[0].inputOriginId = 'origin:scaffold'; },
    ]) expect(code(readEffectiveRunDeclaration(item.baseText, altered(item.text, change), item.context))).toBe('binding-mismatch');
  });

  it('enforces strict UTF8/duplicate/unknown metadata and exactly the byte/node/depth ceilings before interpretation', () => {
    const item = issued();
    expect(URL_DECLARATION_LIMITS).toEqual({ maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 });
    const padded = item.text + ' '.repeat(2_097_152 - Buffer.byteLength(item.text));
    expect(readEffectiveRunDeclaration(item.baseText, padded, item.context).ok).toBe(true);
    expect(code(readEffectiveRunDeclaration(item.baseText, padded + ' ', item.context))).toBe('metadata-limit');
    expect(code(readEffectiveRunDeclaration(item.baseText, '[' + Array(65_536).fill('0').join(',') + ']', item.context))).toBe('metadata-limit');
    expect(code(readEffectiveRunDeclaration(item.baseText, '['.repeat(33) + '0' + ']'.repeat(33), item.context))).toBe('metadata-limit');
    const nested32 = '['.repeat(32) + '0' + ']'.repeat(32);
    expect(code(readEffectiveRunDeclaration(item.baseText, nested32, item.context))).toBe('invalid-url-declaration');
    const nodes65536 = '[' + Array(65_535).fill('0').join(',') + ']';
    expect(code(readEffectiveRunDeclaration(item.baseText, nodes65536, item.context))).toBe('invalid-url-declaration');
    for (const bad of [new Uint8Array([0xc0, 0xaf]), new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode(item.text)]),
      '{"format":"x","format":"y"}', '{"format":"x","for\\u006dat":"y"}', item.text.replace('synthetic-run-1', '\\ud800'),
      altered(item.text, value => { value['NONSECRET-unknown-key'] = 'NONSECRET-unknown-value'; }), item.text + 'false']) {
      const result = readEffectiveRunDeclaration(item.baseText, bad, item.context);
      expect(code(result)).toBe('invalid-url-declaration');
      expect(JSON.stringify(result)).not.toContain('NONSECRET-unknown');
    }
    const badCore = '{"NONSECRET-core-field":"NONSECRET-core-value"}';
    const bad = readEffectiveRunDeclaration(badCore, item.text, item.context);
    expect(code(bad)).toBe('invalid-base-record');
    expect(JSON.stringify(bad)).not.toContain('NONSECRET-core');
  });

  it('snapshots/freeze-protects creator/encoder output and rejects accessor-driven or excess input', () => {
    const item = issued();
    expect(Object.isFrozen(item.declaration)).toBe(true);
    expect(Object.isFrozen(item.declaration.roles[0])).toBe(true);
    expect(() => { (URL_ROLES as unknown as string[]).reverse(); }).toThrow();
    expect(() => { (URL_CONTENT_CLASSES as unknown as string[]).push('unknown-content'); }).toThrow();
    const legacy = readRunRecord(base());
    expect(legacy.ok && Object.isFrozen(legacy.record.subject.contentClasses)).toBe(false);
    const old = item.text;
    (item.input.roles[0] as { inputPacketSha256: string }).inputPacketSha256 = H;
    expect(item.declaration.roles[0]!.inputPacketSha256).toBe(OTHER);
    expect(item.text).toBe(old);
    expect(() => { (item.declaration.roles as unknown[]).pop(); }).toThrow();
    const good = fixture();
    let touched = false;
    const accessor = { ...good.input, get prompt() { touched = true; return 'NONSECRET'; } };
    expect(createUrlRunDeclaration(base(), accessor, good.context).ok).toBe(false);
    expect(touched).toBe(false);
    expect(createUrlRunDeclaration(base(), { ...good.input, foreign: true } as UrlRunDeclarationInput, good.context).ok).toBe(false);
    expect(createUrlRunDeclaration(base(), good.input).ok).toBe(false);
    expect(encodeUrlRunDeclaration(base(), { ...item.declaration, cookie: 'NONSECRET' }, item.context).ok).toBe(false);
    expect(createUrlRunDeclaration('not-json', good.input, good.context)).toMatchObject({ ok: false, code: 'invalid-base-record' });
  });

  it('has no source-level filesystem/network/process/dynamic execution capability of its own', () => {
    const source = readFileSync(new URL('./url-run-record.ts', import.meta.url), 'utf8');
    const imports = [...source.matchAll(/^import .* from '([^']+)';$/gm)].map(match => match[1]);
    expect(imports).toEqual(['@syzygy/polaris-generation-core/live', '@syzygy/support', './launch-identity.js', './run-record.js', './policy-snapshot.js']);
    expect(source).not.toMatch(/\b(?:import|require|eval)\s*\(|\bprocess\s*\.|\bfetch\s*\(/);
    // Imported legacy readers expose effectful modules elsewhere; this is a component claim,
    // not proof that the whole acquisition/supervisor is pure or that no send occurred.
    expect(URL_RUN_MODE).toBe('URL-supervised local CLI through checked transport relay');
  });
});
