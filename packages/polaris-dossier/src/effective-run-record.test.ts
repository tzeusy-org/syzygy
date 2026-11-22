import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { sha256 } from '@syzygy/support';
import { bindCurrentEffectiveUrlRun, effectiveUrlDisclosures, effectiveUrlProjection, mayAppendCompatibleStepLog, readEffectiveRunRecord, URL_MODE_MARKERS, URL_RUN_SIDECAR, type EffectiveRunAuthority, type ProtectedUrlRunContext } from './effective-run-record.js';
import { createUrlRunDeclaration, URL_ORIGIN_POLICY_PATH, URL_PROFILE_ID, URL_ROLES, urlSourceTransportIdentity, type UrlRunDeclarationInput } from './url-run-record.js';
import { DOSSIER_CONTENT_CLASSES, NO_WORK_ITEM_REASON, encodeRunRecord, readRunRecord } from './run-record.js';
import { parseRunConfig } from './run-config.js';
import { buildDossierScreen } from './screen.js';
import { patchFs } from './fs-patch.testkit.js';
import { issueBrief } from './brief.js';
import { bindUrlSourceReader } from './url-source-reader.js';
import { runStatus } from './status.js';
import { closeRun } from './close.js';
import { renderRun, type DossierRenderer, type DossierRendererInput } from './render.js';
import { addRawReadDisclosureFixture, FIXTURE_SCREEN, commitPolicyFixture, fixtureSources, fullFixtureRun, makeClone, NOW, LATER, policyFixture, REAL_ROOT } from './full-run.testkit.js';
import { readCommittedPolicy } from './policy-snapshot.js';
import { packageUrlRunModeAuthority, registerUrlRunMode } from './url-mode-registry.js';

const H = 'a'.repeat(64), OTHER = 'b'.repeat(64), PIN = 'c'.repeat(40);
const RUN = `run-${'d'.repeat(32)}`;
const config = () => {
  const parsed = parseRunConfig(JSON.stringify({ operator: 'synthetic-operator', agentTool: 'claude-code', agentToolVersion: '2.1.327',
    agentProvider: 'anthropic', model: 'claude-sonnet-4-6', deadline: 'PT1H', agentTurnBudget: 300, maxRepairCycles: 3,
    maxQuestions: 1, audience: 'synthetic-reader', operatorIsOwner: false }));
  if (!parsed.ok) throw new Error('synthetic configuration refused');
  return parsed.config;
};
function ownRun(screeningPolicy = policyFixture().binding): string {
  const root = tempDir('effective-run-record-'), run = path.join(root, RUN);
  fs.mkdirSync(run);
  fs.writeFileSync(path.join(run, 'run.json'), encodeRunRecord(config(), {
    repository: { url: 'example.invalid/team/project', repositoryId: 'team-project', role: 'observed-source' },
    clone: { path: path.join(root, 'unused-synthetic-clone'), declaredBy: 'operator', label: 'Inferred', use: 'read' },
    pinnedRevision: { commit: PIN, label: 'synthetic pin selection', pinnedAt: '2026-10-07T12:00:00.000Z' },
    screeningPolicy, contentClasses: DOSSIER_CONTENT_CLASSES,
    visibility: { value: 'private', source: 'conservative-default', declaredBy: 'synthetic default', label: 'Inferred' },
    governed: { kind: 'unstated', because: ['synthetic fixture has no project declaration'] },
    workItem: { identity: null, reason: NO_WORK_ITEM_REASON },
  }));
  addRawReadDisclosureFixture(run);
  return run;
}
function bindUrl(run: string, screenMetadata: (text: string) => boolean = () => true) {
  const baseText = fs.readFileSync(path.join(run, 'run.json'), 'utf8'), read = readRunRecord(baseText);
  if (!read.ok) throw new Error('synthetic compatible record invalid');
  const identity = urlSourceTransportIdentity(`https://${read.record.subject.repository.url}`);
  if (!identity.ok) throw new Error('synthetic source destination invalid');
  const runId = path.basename(run);
  const input: UrlRunDeclarationInput = { runId,
    originPolicy: { path: URL_ORIGIN_POLICY_PATH, commit: PIN, policyId: 'POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1', policyVersion: '1.0.0', sha256: OTHER },
    inference: { provider: 'anthropic', tool: 'claude-code', toolVersion: '2.1.327', model: 'claude-sonnet-4-6', modelSelection: 'supported-default', profile: { id: URL_PROFILE_ID, sha256: H } },
    sourceTransport: { originalLocator: identity.originalLocator, destination: identity.destination, providerId: identity.providerId,
      acquisitionId: 'acq-0123456789abcdef0123456789abcdef', metadataClasses: ['code-structure'], selectionOrigin: 'validated-destination-before-acquisition',
      commandSha256: H, protocolSha256: H, configurationSha256: H, executableSha256: H, environmentSha256: H },
    plannedOrigins: [
      { id: 'origin:metadata', species: 'structural-source-and-tool-metadata', sha256: H, classes: ['code-structure'], originIds: [] },
      { id: 'origin:scaffold', species: 'fixed-role-policy-and-cli-scaffold', sha256: H, classes: ['governance-text'], originIds: [] },
      { id: 'origin:body', species: 'pinned-repository-body', sha256: H, classes: ['code-content'], originIds: [] },
      { id: 'origin:packet', species: 'composed-role-input-or-broker-result', sha256: OTHER,
        classes: ['code-content', 'code-structure', 'derived-composites', 'governance-text'], originIds: ['origin:metadata', 'origin:scaffold', 'origin:body'] },
    ],
    roles: URL_ROLES.map((role, index) => ({ role, sessionId: `0000000${index}-0000-4000-8000-000000000000`, profileId: URL_PROFILE_ID,
      compiledProfileSha256: OTHER, commandSha256: H, instructionSha256: H, viewSha256: H, scaffoldSha256: H, mcpSha256: H,
      configurationSha256: H, executableSha256: H, inputPacketSha256: OTHER, inputOriginId: 'origin:packet',
      capture: { pid: 'Unknown', startedAt: 'Unknown', finishedAt: 'Unknown', outcome: 'Unknown' } })), protectedAudit: `url-audit:${runId}` };
  const context: ProtectedUrlRunContext = { runId, expectedBasePolicy: read.record.subject.screeningPolicy,
    expectedOriginPolicy: input.originPolicy, expectedSourceTransport: input.sourceTransport, expectedProfileSha256: H };
  const encoded = createUrlRunDeclaration(baseText, input, context);
  expect(encoded.ok).toBe(true);
  if (!encoded.ok) throw new Error('synthetic URL declaration invalid');
  fs.writeFileSync(path.join(run, URL_RUN_SIDECAR), encoded.text);
  const bound = { ...context, expectedSidecarSha256: encoded.sha256 };
  const createMetadataScreen = () => screenMetadata;
  const authority: EffectiveRunAuthority = (canonical, id) => canonical === run && id === runId
    ? { kind: 'url', context: bound, createMetadataScreen } : { kind: 'refused' };
  return { ...encoded, authority, context: bound, core: read.record };
}

describe('effective host run readers', () => {
  it('keeps the package URL authority current across reads and reopens committed policy for a full metadata check', () => {
    const recordsRoot = commitPolicyFixture(tempDir('effective-run-observer-'), policyFixture().bytes);
    const policy = readCommittedPolicy(recordsRoot);
    if (!policy.ok) throw new Error('synthetic committed policy refused');
    const policyFile = path.join(recordsRoot, policy.binding.path);
    const root = tempDir('effective-run-host-');
    const run = ownRun(policy.binding), authority = packageUrlRunModeAuthority(recordsRoot, root);
    const url = bindUrl(run);
    expect(registerUrlRunMode({ root, run, context: url.context })).toBe(true);
    expect(readEffectiveRunRecord(run, authority)).toMatchObject({ ok: true, effective: { kind: 'url' } });
    const current = bindCurrentEffectiveUrlRun(run, authority, {
      baseSha256: sha256(fs.readFileSync(path.join(run, 'run.json'))), sidecarSha256: url.sha256,
    });
    expect(current).not.toBeNull();
    expect(current?.()).toBe(true);
    expect(current?.()).toBe(true);

    fs.appendFileSync(policyFile, '\n');
    expect(readEffectiveRunRecord(run, authority)).toMatchObject({ ok: false, code: 'policy-binding',
      reason: expect.stringMatching(/v4\.json.*the protected URL metadata screen cannot verify the bound policy.*start a new run/) });
    expect(readEffectiveRunRecord(ownRun(policy.binding), authority)).toMatchObject({ ok: true, effective: { kind: 'operator' } });
    fs.writeFileSync(policyFile, policy.bytes);
    expect(readEffectiveRunRecord(run, authority)).toMatchObject({ ok: true, effective: { kind: 'url' } });

    const sidecar = path.join(run, URL_RUN_SIDECAR);
    fs.appendFileSync(sidecar, '\n');
    expect(current?.()).toBe(false);
    fs.writeFileSync(sidecar, url.text);
    expect(current?.()).toBe(true);
    fs.unlinkSync(path.join(root, `${sha256(run)}.json`));
    expect(current?.()).toBe(false);
  });

  it('rechecks exact admitted files and protected URL authority without repeating the bound screening', () => {
    const run = ownRun(), base = path.join(run, 'run.json'), sidecar = path.join(run, URL_RUN_SIDECAR);
    let opened = 0, screened = 0, revoked = false, changedContext = false, changedScreen = false;
    const screen = () => { screened++; return true; };
    const createMetadataScreen = () => { opened++; return screen; };
    const otherMetadataScreen = () => () => true;
    const url = bindUrl(run, screen);
    const authority: EffectiveRunAuthority = () => revoked ? { kind: 'refused' }
      : { kind: 'url', context: changedContext ? { ...url.context, expectedProfileSha256: OTHER } : url.context,
        createMetadataScreen: changedScreen ? otherMetadataScreen : createMetadataScreen };
    const expected = { baseSha256: sha256(fs.readFileSync(base)), sidecarSha256: url.sha256 };
    expect(bindCurrentEffectiveUrlRun(run, authority, { ...expected, sidecarSha256: OTHER })).toBeNull();
    const beforeBinding = opened;
    const current = bindCurrentEffectiveUrlRun(run, authority, expected)!;
    expect(current).not.toBeNull();
    expect(opened).toBe(beforeBinding + 1);
    const initialChecks = screened;
    expect(initialChecks).toBeGreaterThan(0);
    expect(current()).toBe(true);
    expect(screened).toBe(initialChecks);
    changedContext = true;
    expect(current()).toBe(false);
    changedContext = false;
    changedScreen = true;
    expect(current()).toBe(false);
    changedScreen = false;
    for (const file of [base, sidecar]) {
      const original = fs.readFileSync(file);
      fs.appendFileSync(file, ' ');
      expect(current()).toBe(false);
      fs.writeFileSync(file, original);
      expect(current()).toBe(true);
    }
    const sidecarStat = fs.statSync(sidecar);
    let withdrawnDuringRead = false;
    const restoreRead = patchFs('readSync', original => ((fd: number, ...args: unknown[]) => {
      const stat = fs.fstatSync(fd);
      if (stat.dev === sidecarStat.dev && stat.ino === sidecarStat.ino) withdrawnDuringRead = revoked = true;
      return (original as (...values: unknown[]) => number)(fd, ...args);
    }) as typeof fs.readSync);
    try { expect(current()).toBe(false); } finally { restoreRead(); }
    expect(withdrawnDuringRead).toBe(true);
    expect(opened).toBe(beforeBinding + 1);
    expect(screened).toBe(initialChecks);
  });

  it('preserves legacy operator projection and refuses every URL marker/sidecar without protected host identity', () => {
    const run = ownRun(), baseText = fs.readFileSync(path.join(run, 'run.json'), 'utf8'), old = readRunRecord(baseText);
    const plain = readEffectiveRunRecord(run);
    expect(mayAppendCompatibleStepLog(run)).toBe(true);
    expect(plain.ok && old.ok && plain.core).toEqual(old.ok && old.record);
    expect(plain.ok && plain.effective.kind).toBe('operator');
    expect(readEffectiveRunRecord(run, (() => undefined) as unknown as EffectiveRunAuthority)).toMatchObject({ ok: false, code: 'mode-binding' });
    for (const marker of URL_MODE_MARKERS) {
      fs.writeFileSync(path.join(run, marker), 'NONSECRET synthetic marker');
      expect(readEffectiveRunRecord(run)).toMatchObject({ ok: false, code: 'mode-binding' });
      expect(readEffectiveRunRecord(run, () => ({ kind: 'operator' }))).toMatchObject({ ok: false, code: 'mode-binding' });
      fs.unlinkSync(path.join(run, marker));
    }
    bindUrl(run);
    expect(mayAppendCompatibleStepLog(run)).toBe(true);
    expect(readEffectiveRunRecord(run)).toMatchObject({ ok: false, code: 'mode-binding' });
    expect(readEffectiveRunRecord(run, () => ({ kind: 'operator' }))).toMatchObject({ ok: false, code: 'mode-binding' });
    fs.writeFileSync(path.join(run, 'run.json'), '{"format":"polaris-dossier-run/1"}');
    expect(mayAppendCompatibleStepLog(run)).toBe(false);
  });

  it('requires complete independent URL bindings, rejects deletion/downgrade and rechecks metadata after screening', () => {
    const run = ownRun(), url = bindUrl(run);
    expect(readEffectiveRunRecord(run, (() => undefined) as unknown as EffectiveRunAuthority)).toMatchObject({ ok: false, code: 'mode-binding' });
    expect(readEffectiveRunRecord(run, url.authority)).toMatchObject({ ok: true, sidecarSha256: sha256(url.text), effective: { kind: 'url' } });
    fs.unlinkSync(path.join(run, URL_RUN_SIDECAR));
    expect(readEffectiveRunRecord(run, url.authority)).toMatchObject({ ok: false, code: 'mode-binding' });
    fs.writeFileSync(path.join(run, URL_RUN_SIDECAR), url.text);
    const wrong: EffectiveRunAuthority = () => ({ kind: 'url', context: { ...url.context, expectedProfileSha256: OTHER }, createMetadataScreen: () => () => true });
    expect(readEffectiveRunRecord(run, wrong)).toMatchObject({ ok: false, code: 'invalid-record' });
    const missing = () => ({ kind: 'url', context: { runId: RUN }, createMetadataScreen: () => () => true });
    expect(readEffectiveRunRecord(run, missing as EffectiveRunAuthority)).toMatchObject({ ok: false, code: 'mode-binding' });
    for (const name of ['expectedBasePolicy', 'expectedOriginPolicy', 'expectedSourceTransport', 'expectedProfileSha256']) {
      const context = { ...url.context } as unknown as Record<string, unknown>; delete context[name];
      const incomplete = () => ({ kind: 'url', context, createMetadataScreen: () => () => true });
      expect(readEffectiveRunRecord(run, incomplete as unknown as EffectiveRunAuthority)).toMatchObject({ ok: false, code: 'mode-binding' });
    }
    let changed = false;
    const racing: EffectiveRunAuthority = () => ({ kind: 'url', context: url.context, createMetadataScreen: () => () => {
      if (!changed) { changed = true; fs.appendFileSync(path.join(run, 'run.json'), ' '); }
      return true;
    } });
    expect(readEffectiveRunRecord(run, racing)).toMatchObject({ ok: false, code: 'record-unreadable' });
  });

  it('refuses symlink, hardlink, directory, FIFO, excessive, malformed UTF8 and replaced metadata without blocking', () => {
    const run = ownRun(), saved = fs.readFileSync(path.join(run, 'run.json')), file = path.join(run, 'run.json');
    const own = path.join(path.dirname(run), 'own-only-metadata'); fs.writeFileSync(own, saved);
    const canary = fs.statSync(own);
    const forms: (() => void)[] = [
      () => fs.symlinkSync(own, file), () => fs.linkSync(own, file), () => fs.mkdirSync(file),
      () => execFileSync('/usr/bin/mkfifo', [file]), () => fs.writeFileSync(file, Buffer.alloc(65_537)),
      () => fs.writeFileSync(file, new Uint8Array([0xc0, 0xaf])),
    ];
    for (const form of forms) {
      fs.rmSync(file, { force: true, recursive: true }); form();
      let canaryReads = 0, unsafeBlockingOpen = 0;
      const restoreRead = patchFs('readSync', original => ((fd: number, ...args: unknown[]) => {
        const stat = fs.fstatSync(fd); if (stat.dev === canary.dev && stat.ino === canary.ino) canaryReads++;
        return (original as (...values: unknown[]) => number)(fd, ...args);
      }) as typeof fs.readSync);
      const restoreOpen = patchFs('openSync', original => ((target: fs.PathLike, flags: fs.OpenMode, ...args: unknown[]) => {
        // Prevent an intentionally broken mutant from blocking the test process on its own FIFO.
        // The baseline still performs the real nonblocking kernel open and regular-file check.
        if (String(target).endsWith('/run.json') && typeof flags === 'number' && !(flags & fs.constants.O_NONBLOCK)) {
          unsafeBlockingOpen++; throw new Error('NONSECRET test stopped a blocking metadata open');
        }
        return (original as (...values: unknown[]) => number)(target, flags, ...args);
      }) as typeof fs.openSync);
      try {
        expect(readEffectiveRunRecord(run)).toMatchObject({ ok: false, code: 'record-unreadable' });
        expect(mayAppendCompatibleStepLog(run)).toBe(false);
        expect(canaryReads).toBe(0);
        expect(unsafeBlockingOpen).toBe(0);
      } finally { restoreOpen(); restoreRead(); }
    }
    fs.rmSync(file, { force: true }); fs.writeFileSync(file, saved);
    const url = bindUrl(run), sidecar = path.join(run, URL_RUN_SIDECAR);
    fs.unlinkSync(sidecar); fs.symlinkSync(own, sidecar);
    expect(readEffectiveRunRecord(run, url.authority)).toMatchObject({ ok: false, code: 'record-unreadable' });
    const alias = path.join(path.dirname(run), 'alias'); fs.symlinkSync(run, alias);
    expect(readEffectiveRunRecord(alias, url.authority)).toMatchObject({ ok: false, code: 'run-unreadable' });
  });

  it('screens decoded fields and complete cross-field composition before release, with bounded constant refusals', () => {
    const run = ownRun(), file = path.join(run, 'run.json');
    const core = JSON.parse(fs.readFileSync(file, 'utf8'));
    core.subject.governed.because = ['NONSECRET-JOINRIGHT', 'NONSECRET-JOINLEFT'];
    fs.writeFileSync(file, JSON.stringify(core));
    const url = bindUrl(run, text => !text.includes('NONSECRET-JOINLEFTNONSECRET-JOINRIGHT'));
    const refused = readEffectiveRunRecord(run, url.authority);
    expect(refused).toMatchObject({ ok: false, code: 'metadata-screen' });
    expect(JSON.stringify(refused)).not.toContain('NONSECRET');
    for (const denied of ['Distinct Git source-transport provider', '"selectionCapturedAt":']) {
      const composed: EffectiveRunAuthority = () => ({ kind: 'url', context: url.context, createMetadataScreen: () => text => !text.includes(denied) });
      expect(readEffectiveRunRecord(run, composed)).toMatchObject({ ok: false, code: 'metadata-screen' });
    }
    const throwing: EffectiveRunAuthority = () => ({ kind: 'url', context: url.context, createMetadataScreen: () => { throw new Error('NONSECRET unsafe scanner diagnostic'); } });
    expect(readEffectiveRunRecord(run, throwing)).toMatchObject({ ok: false, code: 'metadata-screen' });
    const corrupted = JSON.parse(url.text); corrupted['NONSECRET-excess'] = 'NONSECRET-diagnostic';
    fs.writeFileSync(path.join(run, URL_RUN_SIDECAR), JSON.stringify(corrupted));
    expect(readEffectiveRunRecord(run, url.authority)).toMatchObject({ ok: false, code: 'invalid-record' });
  });

  it('uses one effective declaration in brief, status and close, and requires protected URL render inputs', async () => {
    const rendererPath = pathToFileURL(path.join(REAL_ROOT, 'apps/three-surface-poc/src/polaris-generation/dossier-site.ts')).href;
    const renderer = (await import(rendererPath) as { renderLocalDossier: DossierRenderer }).renderLocalDossier;
    const root = tempDir('effective-readers-full-'), { clone, commit } = makeClone(path.join(root, 'repo'));
    const snapshot = await fixtureSources(commit).declaredPolicy!();
    if (!snapshot.ok) throw new Error('synthetic policy unavailable');
    const applied = buildDossierScreen(snapshot.bytes, true, null, 'private');
    console.info(JSON.stringify({ fixturePolicyDiagnostic: { sha256: sha256(snapshot.bytes), binding: snapshot.binding,
      applied: applied.ok ? { ok: true, policyId: applied.screen.policyId, policyVersion: applied.screen.policyVersion, sha256: applied.screen.policySha256 } : applied } }));
    expect(applied.ok, 'synthetic policy must retain private metadata admission').toBe(true);
    // Existing fixture constructs an operator history using only its own synthetic source. This
    // test then exercises the reader overlay; it does not claim a URL acquisition or CLI launch.
    let fixtureInput: DossierRendererInput | undefined;
    const fixture = await fullFixtureRun({ clone, commit, stateRoot: path.join(root, 'state'), renderer: input => {
      fixtureInput = input;
      return renderer(input);
    } });
    const run = fixture.run, baseFile = path.join(run, 'run.json'), compatible = JSON.parse(fs.readFileSync(baseFile, 'utf8'));
    compatible.declared.agentToolVersion = '2.1.327'; compatible.declared.model = 'claude-sonnet-4-6';
    fs.writeFileSync(baseFile, JSON.stringify(compatible));
    const url = bindUrl(run);
    const sources = { ...fixtureSources(commit), effectiveRunDeclaration: url.authority };
    const openReader = bindUrlSourceReader({ clone, revision: commit, store: 'supplied', current: () => true });
    const deps = { sources, openReader, now: () => LATER, loadScreen: async () => FIXTURE_SCREEN,
      probe: { probe: async () => ({ passed: true as const, checked: 0, source: 'own synthetic fixture' }) }, renderer };
    for (const name of ['brief.md', 'brief.json', 'draft.schema.json', 'record.json']) fs.unlinkSync(path.join(run, name));
    const brief = await issueBrief(run, { ...deps, now: () => NOW });
    expect(brief.ok).toBe(true);
    const briefText = fs.readFileSync(path.join(run, 'brief.md'), 'utf8');
    expect(briefText).toContain('URL-supervised local CLI through checked transport relay');
    expect(briefText).toContain('model selection origin supported-default');
    expect(briefText).toContain('source_read');
    const status = runStatus(run, () => LATER, url.authority);
    expect(status.ok).toBe(true);
    if (!status.ok) throw new Error('own URL status refused');
    expect(status.report.mode).toBe('URL-supervised local CLI through checked transport relay');
    expect(status.report.subject.workItem.reason).toBe('local supervisor; no scheduler adapter');
    expect(status.report.configuration.declaredBy).toBe('URL run configuration');
    expect(status.report.effectiveRun).toEqual(effectiveUrlProjection(url.core, url.declaration));
    expect(status.report.effectiveRun?.sourceTransport.providerId).toBe(url.declaration.sourceTransport.providerId);
    expect(status.report.effectiveRun?.sourceTransport.destination).toEqual({ scheme: 'https', host: 'github.com', port: 443, repository: '/redis/redis' });
    expect(status.report.effectiveRun?.inference.provider).toBe('anthropic');
    expect(status.report.effectiveRun?.plannedClasses).toEqual(['code-content', 'code-structure', 'derived-composites', 'governance-text']);
    expect(status.report.limitsSpent.agentUsage).toContain('Unknown');
    const sites = fs.readdirSync(path.join(run, 'site')).sort();
    const render = await renderRun(run, deps);
    expect(render).toMatchObject({ ok: false, refusal: { stage: 'reverify', reason: 'A URL render requires authenticated product reads.' } });
    expect(fs.readdirSync(path.join(run, 'site')).sort()).toEqual(sites);

    // Exercise the renderer projection in memory after checking the protected run entry point.
    if (fixtureInput === undefined || fixtureInput.local.draftLayer.state !== 'editorial-draft' || !status.report.effectiveRun) {
      throw new Error('synthetic editorial input or URL declaration missing');
    }
    const effectiveRun = status.report.effectiveRun;
    const disclosure = effectiveUrlDisclosures(url.core, url.declaration);
    const view = renderer({ ...fixtureInput, local: {
      ...fixtureInput.local, effectiveRun, disclosure,
      authoring: { tool: effectiveRun.inference.tool, model: effectiveRun.inference.model },
      draftLayer: { ...fixtureInput.local.draftLayer, inferenceProvenance: {
        provider: effectiveRun.inference.provider, modelIdentity: effectiveRun.inference.model,
        modelVersion: null, declaredBy: 'supported-default', label: 'Inferred',
      } },
    } }).files;
    const machine = JSON.parse(view.get('machine.json') ?? 'null');
    expect(machine.effectiveRun).toEqual(effectiveRun);
    expect(machine.disclosure).toContainEqual(expect.objectContaining({ id: 'url-capture-scope', label: 'Unknown' }));
    const pages = [...view].filter(([name]) => name.endsWith('.html'));
    expect(pages.length).toBeGreaterThan(1);
    expect(new Set(machine.pages)).toEqual(new Set(pages.map(([name]) => name)));
    for (const [name, html] of pages) {
      expect(html, name).toContain('Provider delivery, served model and capture completeness remain Unknown');
      expect(html, name).toContain('data-inference-model="claude-sonnet-4-6"');
      expect(html, name).toContain(`data-disclosure-ids="${disclosure.map(item => item.id).join(' ')}"`);
      const attribute = html.match(/data-effective-run="([^"]+)"/u)?.[1];
      expect(attribute, name).toBeDefined();
      expect(JSON.parse(attribute!.replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&amp;', '&')), name)
        .toEqual(effectiveRun);
    }
    const refusedClose = await closeRun(run, {}, { ...deps, admitRecord: () => false });
    expect(refusedClose).toMatchObject({ ok: false, refusal: { stage: 'write' } });
    expect(fs.existsSync(path.join(run, 'record.json'))).toBe(false);
    const urlSupervisorCapture = {
      roles: URL_ROLES.map((role, index) => ({
        role, pid: 1_000 + index, startedAt: NOW, finishedAt: LATER, outcome: 'Unknown' as const,
      })),
      audit: { tipSha256: H, durableRecords: 8, relayEvents: { 'send-attempt': 1, 'send-outcome': 1 },
        providerReceipts: 'Unknown' as const, completeness: 'Unknown' as const },
    };
    const close = await closeRun(run, {}, { ...deps, admitRecord: () => true, urlSupervisorCapture });
    expect(close.ok).toBe(true);
    const record = JSON.parse(fs.readFileSync(path.join(run, 'record.json'), 'utf8'));
    expect(record.mode).toBe(status.report.mode);
    expect(record.effectiveRun).toEqual(status.report.effectiveRun);
    expect(record.noProviderCall).toBeUndefined();
    expect(record.credentialsIssued).toBe('Unknown');
    expect(record.supervisorCapture).toMatchObject({ label: 'Inferred', roles: urlSupervisorCapture.roles,
      protectedAudit: { locator: url.declaration.storage.protectedAudit.locator, tipSha256: H, durableRecords: 8,
        capturedSendAttempts: 1, capturedSendOutcomes: 1, providerReceipts: 'Unknown', completeness: 'Unknown' } });
    expect(record.effectiveRun.capture.actualSends).toBe('Unknown');
    expect(record.effectiveRun.storage.protectedAudit.roleWritable).toBe(false);
    expect(record.effectiveRun.storage.compatibleHistory.roleWritable).toBe(true);
    expect(record.urlDeclarationSha256).toBe(url.sha256);
    // Missing sidecar never falls back to the writable operator core at any dependent reader.
    fs.unlinkSync(path.join(run, URL_RUN_SIDECAR));
    expect(runStatus(run, () => LATER, url.authority).ok).toBe(false);
    expect((await issueBrief(run, deps)).ok).toBe(false);
    expect((await renderRun(run, deps)).ok).toBe(false);
    expect((await closeRun(run, {}, deps)).ok).toBe(false);
  }, 30_000);
});
