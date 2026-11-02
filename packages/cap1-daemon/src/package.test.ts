import { readFileSync } from 'node:fs';
import { describe, expect, expectTypeOf, it } from 'vitest';

import * as daemon from '@syzygy/cap1-daemon';
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

describe('cap1-daemon package', () => {
  // Tests and tools load the source (syzygy-bpyt.4.2); Node takes the first condition it matches, so `source` comes first.
  it('is importable with source, built runtime and declaration entries', () => {
    expect(daemon).toBeDefined();
    expect(manifest.exports?.['.']).toStrictEqual({
      source: './src/index.ts',
      types: './dist/index.d.ts',
      import: './dist/index.js',
      default: './dist/index.js',
    });
    expect(Object.keys(manifest.exports?.['.'] ?? {})).toEqual(['source', 'types', 'import', 'default']);
  });

  // The generic host moved to @syzygy/http-host (syzygy-bpyt.7.3). The barrel re-exports it, so a consumer finds every value it
  // found before, and no other: the list is the barrel's runtime names at 9b539e5f, plus the eleven the captured-snapshot
  // pipeline added (syzygy-u2a.2: the capture, its reader and versions, the act-record location and the consent disclaimer).
  it('exports the values it exported before the host moved out', () => {
    expect(Object.keys(daemon).sort()).toEqual([
      'CONSENT_DECISIONS_RELATIVE_PATH', 'CONSENT_EFFECT_DISCLAIMER', 'CONSENT_RECORD_EXTENSION', 'CONSENT_RECORD_FIELDS',
      'CREDENTIAL_FILE_MODE', 'CREDENTIAL_FILE_NAME', 'CREDENTIAL_TOKEN_BYTES', 'DAEMON_CAPTURE_VERSIONS', 'DAEMON_HOST',
      'DAEMON_SCENARIO_CONTEXT', 'DECLARATION_RELATIVE_PATH', 'HANDLER_FAILURE_REASON', 'HANDLER_FAILURE_STATUS',
      'HUMAN_ENTRY_ROUTE_PATH', 'HUMAN_PAGE_PATH', 'MACHINE_CONTENT_TYPE', 'MACHINE_PROJECT_PATH', 'OWNER_ACT_EXTENSION',
      'OWNER_ACT_SUFFIX', 'README_RELATIVE_PATH', 'REFUSAL_BODY', 'REFUSAL_STATUS', 'REPOSITORY_ROOT_SCOPE',
      'STATE_DIR_MODE', 'STATE_WRITE_REFUSALS', 'UNKNOWN_ROUTE_REASON', 'UNKNOWN_ROUTE_STATUS', 'authorizeStateWrite',
      'captureProjectInputs', 'consentLoadFromText', 'consentPairFromText', 'consentReferenceFormProblem', 'createDaemon',
      'credentialFromAuthorizationHeader', 'ensureCredential', 'escapeHtml', 'evaluateCapturedProject', 'evaluateProject',
      'factsFromAnswers', 'fsCaptureReader', 'humanRoutes', 'isCaptureFailure', 'loadConsentReference', 'loadConsentReferences',
      'machineProjectBody', 'machineRoutes', 'minimalRootRoute', 'observeDeclaration', 'observeReadmeEvidence',
      'observeRepositorySnapshot', 'observeRootCandidate', 'resolveConsentReferencePath', 'verifyCredential',
    ]);
  });

  // syzygy-bpyt.7.14: a name pin passes a shim that exports one host value
  // under another's name. These 18 values are pairwise distinct, so `toBe`
  // tells any two of them apart.
  it('re-exports each host value as the host binding of the same name', () => {
    const shared = [
      'CREDENTIAL_FILE_MODE', 'CREDENTIAL_FILE_NAME', 'CREDENTIAL_TOKEN_BYTES', 'DAEMON_HOST', 'HANDLER_FAILURE_REASON',
      'HANDLER_FAILURE_STATUS', 'REFUSAL_BODY', 'REFUSAL_STATUS', 'STATE_DIR_MODE', 'STATE_WRITE_REFUSALS', 'UNKNOWN_ROUTE_REASON',
      'UNKNOWN_ROUTE_STATUS', 'authorizeStateWrite', 'createDaemon', 'credentialFromAuthorizationHeader', 'ensureCredential',
      'escapeHtml', 'verifyCredential',
    ] as const;
    expect(Object.keys(host).filter(name => Object.hasOwn(daemon, name)).sort()).toEqual([...shared]);
    expect(new Set(shared.map(name => host[name])).size).toBe(shared.length);
    for (const name of shared) {
      expect(daemon[name], name).toBe(host[name]);
    }
  });

  // Types leave no runtime binding, so this row is a compile check:
  // `npm run typecheck` fails when a shim drops a host type or exports
  // another type under its name.
  it('re-exports each host type under the same name (checked by the compiler)', () => {
    expectTypeOf<daemon.CredentialInspection>().toEqualTypeOf<host.CredentialInspection>();
    expectTypeOf<daemon.CredentialProvision>().toEqualTypeOf<host.CredentialProvision>();
    expectTypeOf<daemon.CredentialStat>().toEqualTypeOf<host.CredentialStat>();
    expectTypeOf<daemon.StateWriteAuthorization>().toEqualTypeOf<host.StateWriteAuthorization>();
    expectTypeOf<daemon.StateWriteRefusalName>().toEqualTypeOf<host.StateWriteRefusalName>();
    expectTypeOf<daemon.CredentialClass>().toEqualTypeOf<host.CredentialClass>();
    expectTypeOf<daemon.DaemonOptions>().toEqualTypeOf<host.DaemonOptions>();
    expectTypeOf<daemon.DaemonStart>().toEqualTypeOf<host.DaemonStart>();
    expectTypeOf<daemon.Route>().toEqualTypeOf<host.Route>();
    expectTypeOf<daemon.RouteContext>().toEqualTypeOf<host.RouteContext>();
    expectTypeOf<daemon.RouteRequest>().toEqualTypeOf<host.RouteRequest>();
    expectTypeOf<daemon.RouteResponse>().toEqualTypeOf<host.RouteResponse>();
    expectTypeOf<daemon.RunningDaemon>().toEqualTypeOf<host.RunningDaemon>();
  });
});
