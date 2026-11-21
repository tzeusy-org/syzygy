import * as fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { loadSessionCredential } from './session-credential.js';

const PROTOCOL = { 'content-type': 'application/json', 'anthropic-version': '2023-06-01', 'x-app': 'cli' };
const NONSECRET = 'NONSECRET-CREDENTIAL-FIXTURE-1907';
const fresh = (value: unknown) => {
  const root = tempDir('session-credential-'); const file = path.join(root, '.credentials.json');
  fs.writeFileSync(file, JSON.stringify(value), { mode: 0o600 }); return file;
};
const doc = () => ({ claudeAiOauth: { accessToken: NONSECRET, refreshToken: 'NONSECRET-UNUSED-REFRESH', expiresAt: 2000, scopes: ['user:inference'] } });

describe('host-only provider authentication', () => {
  it.each([
    [{ CLAUDE_CODE_OAUTH_TOKEN: NONSECRET }, 'oauth-environment', 'authorization', `Bearer ${NONSECRET}`],
    [{ ANTHROPIC_API_KEY: NONSECRET }, 'api-key-environment', 'x-api-key', NONSECRET],
  ] as const)('uses one explicit environment source without touching a credential file', async (environment, source, header, expected) => {
    const result = await loadSessionCredential({ environment, credentialFile: '/NONSECRET-not-a-file/.credentials.json', now: () => 1000 });
    expect(result.ok).toBe(true); if (!result.ok) return;
    expect(result.credential.source).toBe(source); expect(result.credential.headers(PROTOCOL)).toEqual({ ...PROTOCOL, [header]: expected });
    expect(JSON.stringify(result)).not.toContain(NONSECRET);
    result.credential.close(); expect(result.credential.headers(PROTOCOL)).toBeNull();
  });
  it('refuses ambiguous or malformed supplied values instead of silently loading another source', async () => {
    const file = fresh(doc());
    for (const environment of [{ CLAUDE_CODE_OAUTH_TOKEN: NONSECRET, ANTHROPIC_API_KEY: NONSECRET }, { CLAUDE_CODE_OAUTH_TOKEN: '' }, { ANTHROPIC_API_KEY: 'NONSECRET\r\nInjected: x' }]) {
      expect(await loadSessionCredential({ environment, credentialFile: file, now: () => 1000 })).toEqual({ ok: false, reason: 'session-credential-unavailable' });
    }
  });
  it('loads only a bounded private regular OAuth file and rechecks expiry before each send', async () => {
    let now = 1000; const file = fresh(doc());
    const result = await loadSessionCredential({ environment: {}, credentialFile: file, now: () => now });
    expect(result.ok).toBe(true); if (!result.ok) return;
    expect(result.credential).toMatchObject({ source: 'oauth-file', credentialIdentity: 'Unknown', expiresAt: 2000 });
    expect(result.credential.headers(PROTOCOL)).toEqual({ ...PROTOCOL, authorization: `Bearer ${NONSECRET}` });
    expect(JSON.stringify(result)).not.toContain(NONSECRET); expect(JSON.stringify(result)).not.toContain('REFRESH');
    now = 2000; expect(result.credential.headers(PROTOCOL)).toBeNull(); result.credential.close();
    expect(fs.readFileSync(file, 'utf8')).toContain('NONSECRET-UNUSED-REFRESH');
  });
  it('rejects existing symbolic and hard-link aliases and group-readable credential files', async () => {
    const file = fresh(doc()), root = tempDir('session-credential-alias-'), alias = path.join(root, '.credentials.json');
    fs.symlinkSync(file, alias);
    expect((await loadSessionCredential({ environment: {}, credentialFile: alias, now: () => 1000 })).ok).toBe(false);
    fs.unlinkSync(alias); fs.linkSync(file, alias);
    expect((await loadSessionCredential({ environment: {}, credentialFile: alias, now: () => 1000 })).ok).toBe(false);
    fs.unlinkSync(alias); fs.chmodSync(file, 0o640);
    expect((await loadSessionCredential({ environment: {}, credentialFile: file, now: () => 1000 })).ok).toBe(false);
  });
  it('refuses expired, unscoped, duplicate-key, oversized or malformed input without diagnostic leakage', async () => {
    const samples = [JSON.stringify({ claudeAiOauth: { ...doc().claudeAiOauth, expiresAt: 999 } }),
      JSON.stringify({ claudeAiOauth: { ...doc().claudeAiOauth, scopes: [] } }),
      '{"claudeAiOauth":null,"claudeAiOauth":' + JSON.stringify(doc().claudeAiOauth) + '}',
      ' '.repeat(65_537), '{"accessToken":"NONSECRET-PRIVATE-PARSE-ERROR"'];
    for (const sample of samples) {
      const file = fresh(null); fs.writeFileSync(file, sample);
      expect(await loadSessionCredential({ environment: {}, credentialFile: file, now: () => 1000 })).toEqual({ ok: false, reason: 'session-credential-unavailable' });
    }
  });
  it('does not permit credentials, routing, cookies or folded values to enter via protocol-header arguments', async () => {
    const result = await loadSessionCredential({ environment: { CLAUDE_CODE_OAUTH_TOKEN: NONSECRET }, credentialFile: '/NONSECRET-unused/.credentials.json', now: () => 1000 });
    expect(result.ok).toBe(true); if (!result.ok) return;
    const extras: Record<string, string>[] = [{ authorization: 'Bearer NONSECRET-other' }, { host: 'elsewhere.invalid' }, { cookie: 'NONSECRET-cookie' }, { 'user-agent': 'NONSECRET\nfolded' }];
    for (const extra of extras) {
      expect(result.credential.headers({ ...PROTOCOL, ...extra })).toBeNull();
    }
    result.credential.close();
  });
});
