import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import * as host from '@syzygy/http-host';

interface PackageManifest {
  readonly exports?: {
    readonly '.': string | {
      readonly source?: string;
      readonly types?: string;
      readonly import?: string;
      readonly default?: string;
    };
  };
}

const manifest = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as PackageManifest;

describe('http-host package', () => {
  // Tests and tools load the source (syzygy-bpyt.4.2); Node takes the first condition it matches, so `source` comes first.
  it('is importable with source, built runtime and declaration entries', () => {
    expect(host).toBeDefined();
    expect(manifest.exports?.['.']).toStrictEqual({
      source: './src/index.ts',
      types: './dist/index.d.ts',
      import: './dist/index.js',
      default: './dist/index.js',
    });
    expect(Object.keys(manifest.exports?.['.'] ?? {})).toEqual(['source', 'types', 'import', 'default']);
  });

  // The host's values, and none of the Capability 1 app that stayed in @syzygy/cap1-daemon (syzygy-bpyt.7.3).
  it('exports the host and nothing of the Capability 1 app', () => {
    expect(Object.keys(host).sort()).toEqual([
      'CREDENTIAL_FILE_MODE', 'CREDENTIAL_FILE_NAME', 'CREDENTIAL_TOKEN_BYTES', 'DAEMON_HOST', 'HANDLER_FAILURE_REASON',
      'HANDLER_FAILURE_STATUS', 'REFUSAL_BODY', 'REFUSAL_STATUS', 'STATE_DIR_MODE', 'STATE_WRITE_REFUSALS', 'UNKNOWN_ROUTE_REASON',
      'UNKNOWN_ROUTE_STATUS', 'authorizeStateWrite', 'closeOnSignal', 'createDaemon', 'credentialFromAuthorizationHeader',
      'ensureCredential', 'escapeHtml', 'verifyCredential',
    ]);
  });
});
