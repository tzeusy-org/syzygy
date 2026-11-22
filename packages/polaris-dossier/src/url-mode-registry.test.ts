import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import { sha256 } from '@syzygy/support';
import { DOSSIER_POLICY_PATH, DOSSIER_PREDECESSOR_POLICY_PATH } from './policy-snapshot.js';
import { URL_ORIGIN_POLICY_PATH, urlSourceTransportIdentity } from './url-run-record.js';
import { registerUrlRunMode, urlRunModeAuthority } from './url-mode-registry.js';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });
function fixture() {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'url-host-mode-')); roots.push(temporary);
  const root = path.join(temporary, 'host'), runId = 'own-run', run = path.join(temporary, runId);
  fs.mkdirSync(root, { mode: 0o700 }); fs.mkdirSync(run);
  const identity = urlSourceTransportIdentity('https://example.invalid/own/project');
  if (!identity.ok) throw new Error('own locator fixture refused');
  const digest = 'a'.repeat(64), commit = 'c'.repeat(40);
  const context = {
    runId,
    expectedBasePolicy: { path: DOSSIER_POLICY_PATH, policyId: 'polaris-butlers-project-shape-secrets', policyVersion: 'dossier-declared-source/2.0.0', commit, sha256: digest },
    expectedOriginPolicy: { path: URL_ORIGIN_POLICY_PATH, policyId: 'POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1', policyVersion: '1.0.0', commit, sha256: digest },
    expectedSourceTransport: { originalLocator: identity.originalLocator, destination: identity.destination, providerId: identity.providerId,
      acquisitionId: `acq-${'a'.repeat(32)}`, metadataClasses: ['code-structure'] as const, selectionOrigin: 'validated-destination-before-acquisition' as const,
      commandSha256: digest, protocolSha256: digest, configurationSha256: digest, executableSha256: digest, environmentSha256: digest },
    expectedProfileSha256: digest, expectedSidecarSha256: 'b'.repeat(64),
  };
  const file = path.join(root, `${sha256(run)}.json`);
  return { temporary, root, run, runId, context, file };
}

describe('persistent host URL mode declaration binding', () => {
  it('preserves ordinary operator runs and refuses missing bindings for every URL marker including dangling links', () => {
    const f = fixture(), authority = urlRunModeAuthority(f.root, () => true);
    expect(authority(f.run, f.runId)).toEqual({ kind: 'operator' });
    for (const marker of ['launched.json', 'url-acquisition.json', 'url-supervisor.json', 'url-attempt.json', 'url-declaration.json']) {
      const file = path.join(f.run, marker); fs.symlinkSync(path.join(f.temporary, 'absent'), file);
      expect(authority(f.run, f.runId)).toEqual({ kind: 'refused' }); fs.unlinkSync(file);
    }
    fs.rmdirSync(f.root);
    expect(authority(f.run, f.runId)).toEqual({ kind: 'operator' });
    fs.writeFileSync(path.join(f.run, 'launched.json'), '{}');
    expect(authority(f.run, f.runId)).toEqual({ kind: 'refused' });
  });

  it('retains exact independently supplied bindings exclusively and returns the host metadata predicate', () => {
    const f = fixture(); let calls = 0;
    const metadata = (text: string): boolean => { calls++; return text === 'own-safe'; };
    expect(registerUrlRunMode(f)).toBe(true);
    expect(registerUrlRunMode(f)).toBe(false);
    const authority = urlRunModeAuthority(f.root, metadata), result = authority(f.run, f.runId);
    expect(result.kind).toBe('url'); if (result.kind !== 'url') return;
    expect(result.context).toEqual(f.context); expect(result.screenMetadata).toBe(metadata);
    expect(Object.isFrozen(result.context)).toBe(true); expect(Object.isFrozen(result.context.expectedSourceTransport)).toBe(true);
    expect(result.screenMetadata('own-safe')).toBe(true); expect(result.screenMetadata('different')).toBe(false); expect(calls).toBe(2);
    expect(fs.statSync(f.file).mode & 0o777).toBe(0o600);
    expect(authority(f.run, 'other-run')).toEqual({ kind: 'refused' });
    // Retained declarations keep their exact predecessor pair. Reading them
    // neither migrates their binding nor permits new predecessor registration.
    const legacy = { ...f.context, expectedBasePolicy: { ...f.context.expectedBasePolicy,
      path: DOSSIER_PREDECESSOR_POLICY_PATH, policyVersion: 'dossier-declared-source/1.0.0' } };
    fs.writeFileSync(f.file, JSON.stringify({ format: 'polaris-url-mode-binding/1', run: f.run, runId: f.runId, context: legacy }));
    const retained = authority(f.run, f.runId);
    expect(retained.kind).toBe('url');
    if (retained.kind === 'url') expect(retained.context.expectedBasePolicy).toEqual(legacy.expectedBasePolicy);
    fs.writeFileSync(path.join(f.run, 'launched.json'), '{}'); fs.unlinkSync(f.file);
    expect(authority(f.run, f.runId)).toEqual({ kind: 'refused' });
  });

  it('refuses incomplete, changed or unknown host binding fields before creating a registry slot', () => {
    const f = fixture();
    const cases = [ { ...f.context, expectedSidecarSha256: '' }, { ...f.context, extra: true },
      { ...f.context, expectedProfileSha256: undefined }, { ...f.context, runId: 'different' },
      { ...f.context, expectedBasePolicy: { ...f.context.expectedBasePolicy, path: URL_ORIGIN_POLICY_PATH } },
      { ...f.context, expectedBasePolicy: { ...f.context.expectedBasePolicy, policyId: 'POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1' } },
      { ...f.context, expectedBasePolicy: { ...f.context.expectedBasePolicy, policyVersion: '1.0.0' } },
      { ...f.context, expectedBasePolicy: { ...f.context.expectedBasePolicy, policyVersion: 'dossier-declared-source/1.0.0' } },
      { ...f.context, expectedBasePolicy: { ...f.context.expectedBasePolicy, path: DOSSIER_PREDECESSOR_POLICY_PATH } },
      { ...f.context, expectedBasePolicy: { ...f.context.expectedBasePolicy, path: DOSSIER_PREDECESSOR_POLICY_PATH,
        policyVersion: 'dossier-declared-source/1.0.0' } },
      { ...f.context, expectedSourceTransport: { ...f.context.expectedSourceTransport, providerId: 'git-source:forged' } },
      { ...f.context, expectedSourceTransport: { ...f.context.expectedSourceTransport, metadataClasses: ['work-history'] } } ];
    for (const context of cases) {
      expect(registerUrlRunMode({ ...f, context: context as typeof f.context })).toBe(false);
      expect(fs.existsSync(f.file)).toBe(false);
    }
    expect(registerUrlRunMode(f)).toBe(true);
  });

  it('bounds and validates regular protected files without following links, hardlinks, FIFOs or unsafe permissions', () => {
    const f = fixture(), authority = urlRunModeAuthority(f.root, () => true);
    expect(registerUrlRunMode(f)).toBe(true); const original = fs.readFileSync(f.file);
    const bad = [ Buffer.from('{"format":"polaris-url-mode-binding/1","format":"duplicate"}'), Buffer.from([0xff]),
      Buffer.alloc(65_537, 32), Buffer.from(JSON.stringify({ ...JSON.parse(original.toString()), run: '/wrong' })) ];
    for (const bytes of bad) { fs.writeFileSync(f.file, bytes); expect(authority(f.run, f.runId)).toEqual({ kind: 'refused' }); }
    fs.writeFileSync(f.file, original); fs.chmodSync(f.file, 0o640);
    expect(authority(f.run, f.runId)).toEqual({ kind: 'refused' }); fs.chmodSync(f.file, 0o600);
    const other = path.join(f.temporary, 'other'); fs.linkSync(f.file, other);
    expect(authority(f.run, f.runId)).toEqual({ kind: 'refused' }); fs.unlinkSync(other);
    fs.unlinkSync(f.file); fs.symlinkSync(other, f.file);
    expect(authority(f.run, f.runId)).toEqual({ kind: 'refused' }); fs.unlinkSync(f.file);
    execFileSync('/usr/bin/mkfifo', ['--', f.file]);
    expect(authority(f.run, f.runId)).toEqual({ kind: 'refused' }); fs.unlinkSync(f.file);
    fs.chmodSync(f.root, 0o750); expect(registerUrlRunMode(f)).toBe(false);
    expect(authority(f.run, f.runId)).toEqual({ kind: 'refused' });
  });

  it('requires canonical separate registry/run roots and never edits or repairs a supplied directory', () => {
    const f = fixture();
    expect(registerUrlRunMode({ ...f, root: f.run })).toBe(false);
    expect(urlRunModeAuthority(f.run, () => true)(f.run, f.runId)).toEqual({ kind: 'refused' });
    const alias = path.join(f.temporary, 'alias'); fs.symlinkSync(f.root, alias);
    expect(registerUrlRunMode({ ...f, root: alias })).toBe(false);
    expect(urlRunModeAuthority(alias, () => true)(f.run, f.runId)).toEqual({ kind: 'refused' });
    expect(fs.readdirSync(f.run)).toEqual([]); expect(fs.readdirSync(f.root)).toEqual([]);
  });
});
