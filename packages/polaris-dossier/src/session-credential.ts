import { open, realpath } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { isRecord } from '@syzygy/support';

export interface SessionCredential {
  readonly source: 'oauth-environment' | 'api-key-environment' | 'oauth-file';
  readonly credentialIdentity: 'Unknown';
  readonly expiresAt: number | null;
  /** Host-only, process-to-process use. Never serialize or log the returned headers. */
  headers(protocol: Readonly<Record<string, string>>): Readonly<Record<string, string>> | null;
  close(): void;
}
type Result = { readonly ok: true; readonly credential: SessionCredential }
  | { readonly ok: false; readonly reason: 'session-credential-unavailable' };
const refused = (): Result => ({ ok: false, reason: 'session-credential-unavailable' });
const tokenText = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9._~+/-]{1,8192}=*$/u.test(value)
  && value.length <= 8192;

/** Reads only the two explicitly supported environment names or the caller's
 * known Claude credential file. No credential discovery, role copy, refresh,
 * indexing or diagnostic containing authentication data is performed.
 */
export async function loadSessionCredential(input: {
  readonly environment: Readonly<{ CLAUDE_CODE_OAUTH_TOKEN?: string; ANTHROPIC_API_KEY?: string }>;
  readonly credentialFile: string;
  readonly now: () => number;
}): Promise<Result> {
  let token = '', mode: 'oauth' | 'api-key' = 'oauth';
  let source: SessionCredential['source'] = 'oauth-file', expiresAt: number | null = null;
  try {
    const oauth = input.environment.CLAUDE_CODE_OAUTH_TOKEN;
    const apiKey = input.environment.ANTHROPIC_API_KEY;
    if (oauth !== undefined && apiKey !== undefined) return refused();
    if (oauth !== undefined || apiKey !== undefined) {
      const chosen = oauth ?? apiKey;
      if (!tokenText(chosen)) return refused();
      token = chosen; mode = oauth === undefined ? 'api-key' : 'oauth';
      source = mode === 'oauth' ? 'oauth-environment' : 'api-key-environment';
    } else {
      const file = input.credentialFile;
      if (!path.isAbsolute(file) || path.normalize(file) !== file || path.basename(file) !== '.credentials.json'
        || await realpath(path.dirname(file)) !== path.dirname(file)) return refused();
      const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
      try {
        const stat = await handle.stat();
        if (!stat.isFile() || stat.nlink !== 1 || stat.size > 65_536 || (stat.mode & 0o077) !== 0
          || (process.getuid !== undefined && stat.uid !== process.getuid()) || await realpath(file) !== file) return refused();
        const bytes = Buffer.alloc(65_537);
        let size = 0;
        while (size < bytes.length) {
          const read = await handle.read(bytes, size, bytes.length - size, null);
          if (read.bytesRead === 0) break;
          size += read.bytesRead;
        }
        if (size > 65_536) return refused();
        const value: unknown = parseBoundedJson(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, size)),
          { maxBytes: 65_536, maxNodes: 4096, maxDepth: 16 });
        if (!isRecord(value) || !isRecord(value.claudeAiOauth)) return refused();
        const credential = value.claudeAiOauth;
        if (!tokenText(credential.accessToken) || !Number.isSafeInteger(credential.expiresAt)
          || Number(credential.expiresAt) <= input.now() || !Array.isArray(credential.scopes)
          || !credential.scopes.includes('user:inference')) return refused();
        token = credential.accessToken; expiresAt = Number(credential.expiresAt);
      } finally { await handle.close(); }
    }
    if (!Number.isFinite(input.now())) return refused();
    let closed = false;
    return { ok: true, credential: Object.freeze({ source, credentialIdentity: 'Unknown' as const, expiresAt,
      headers: (protocol: Readonly<Record<string, string>>) => {
        try {
          const now = input.now();
          if (closed || !Number.isFinite(now) || (expiresAt !== null && now >= expiresAt)
            || Object.entries(protocol).some(([key, value]) => !['anthropic-version', 'anthropic-beta', 'content-type', 'user-agent', 'x-app'].includes(key)
              || typeof value !== 'string' || value.length > 8192 || /[\0\r\n]/u.test(value))
            || protocol['content-type'] !== 'application/json' || protocol['anthropic-version'] !== '2023-06-01') return null;
          return { ...protocol, ...(mode === 'oauth' ? { authorization: `Bearer ${token}` } : { 'x-api-key': token }) };
        } catch { return null; }
      },
      close: () => { closed = true; token = ''; },
    }) };
  } catch { token = ''; return refused(); }
}
