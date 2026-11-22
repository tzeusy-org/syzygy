import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { deepFreeze, isRecord, sha256 } from '@syzygy/support';
import { DOSSIER_POLICY_PATH, DOSSIER_POLICY_VERSION, DOSSIER_PREDECESSOR_POLICY_PATH,
  DOSSIER_PREDECESSOR_POLICY_VERSION, readCommittedPolicy, type PolicyBinding } from './policy-snapshot.js';
import { buildDossierScreen } from './screen.js';
import { URL_ORIGIN_POLICY_PATH, urlSourceTransportIdentity, type UrlRunDeclarationContext } from './url-run-record.js';
import type { EffectiveRunAuthority } from './effective-run-record.js';

/** This host namespace is never mounted into a URL role. Its records describe
 * local declarations, not tamperproof recovery or actual provider outcomes. */
export const URL_HOST_ROOT = path.join(os.homedir(), '.local/state/syzygy-url-host');
const FORMAT = 'polaris-url-mode-binding/1';
const BOUNDS = { maxBytes: 65_536, maxNodes: 4096, maxDepth: 16 };
const MARKERS = ['launched.json', 'url-acquisition.json', 'url-supervisor.json', 'url-attempt.json', 'url-declaration.json'];
const HEX = /^[a-f0-9]{64}$/u;
type Context = UrlRunDeclarationContext & Required<Pick<UrlRunDeclarationContext,
  'expectedBasePolicy' | 'expectedOriginPolicy' | 'expectedSourceTransport' | 'expectedProfileSha256' | 'expectedSidecarSha256'>>;
const canonical = (value: unknown): string => encodeCanonicalJson(value, BOUNDS);
const exact = (value: Record<string, unknown>, names: readonly string[]): boolean =>
  Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name));
function policy(value: unknown, expectedPath: string, expectedId: string, expectedVersion: string): value is PolicyBinding {
  return isRecord(value) && exact(value, ['path', 'commit', 'policyId', 'policyVersion', 'sha256'])
    && value.path === expectedPath && value.policyId === expectedId && value.policyVersion === expectedVersion
    && typeof value.commit === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(value.commit)
    && typeof value.sha256 === 'string' && HEX.test(value.sha256);
}
function context(value: unknown, runId: string): value is Context {
  if (!isRecord(value) || !exact(value, ['runId', 'expectedBasePolicy', 'expectedOriginPolicy', 'expectedSourceTransport',
    'expectedProfileSha256', 'expectedSidecarSha256']) || value.runId !== runId
    || !(policy(value.expectedBasePolicy, DOSSIER_POLICY_PATH, 'polaris-butlers-project-shape-secrets', DOSSIER_POLICY_VERSION)
      || policy(value.expectedBasePolicy, DOSSIER_PREDECESSOR_POLICY_PATH, 'polaris-butlers-project-shape-secrets', DOSSIER_PREDECESSOR_POLICY_VERSION))
    || !policy(value.expectedOriginPolicy, URL_ORIGIN_POLICY_PATH, 'POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1', '1.0.0')
    || typeof value.expectedProfileSha256 !== 'string' || !HEX.test(value.expectedProfileSha256)
    || typeof value.expectedSidecarSha256 !== 'string' || !HEX.test(value.expectedSidecarSha256)) return false;
  const source = value.expectedSourceTransport;
  if (!isRecord(source) || !exact(source, ['originalLocator', 'destination', 'providerId', 'acquisitionId', 'metadataClasses',
    'selectionOrigin', 'commandSha256', 'protocolSha256', 'configurationSha256', 'executableSha256', 'environmentSha256'])
    || typeof source.originalLocator !== 'string') return false;
  const identity = urlSourceTransportIdentity(source.originalLocator);
  return identity.ok && canonical(source.destination) === canonical(identity.destination) && source.providerId === identity.providerId
    && typeof source.acquisitionId === 'string' && /^acq-[a-f0-9]{32}$/u.test(source.acquisitionId)
    && canonical(source.metadataClasses) === '["code-structure"]' && source.selectionOrigin === 'validated-destination-before-acquisition'
    && ['commandSha256', 'protocolSha256', 'configurationSha256', 'executableSha256', 'environmentSha256']
      .every(key => typeof source[key] === 'string' && HEX.test(source[key]));
}
function ownedDirectory(directory: string): boolean {
  const stat = fs.lstatSync(directory);
  return path.isAbsolute(directory) && path.resolve(directory) === directory && fs.realpathSync(directory) === directory
    && stat.isDirectory() && !stat.isSymbolicLink() && stat.uid === process.getuid?.() && (stat.mode & 0o077) === 0;
}
function runIdentity(run: string, runId: string): boolean {
  return path.isAbsolute(run) && path.resolve(run) === run && fs.realpathSync(run) === run
    && fs.lstatSync(run).isDirectory() && path.basename(run) === runId && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(runId);
}
function separated(root: string, run: string): boolean {
  return root !== run && !root.startsWith(`${run}/`) && !run.startsWith(`${root}/`);
}
const slot = (root: string, run: string): string => path.join(root, `${sha256(run)}.json`);

/** Persist independently prepared host bindings before creating the URL
 * sidecar/brief/roles. Exclusive immutable slots refuse overwrite or replay.
 * Caller must have compiled and screened the declaration before this call. */
export function registerUrlRunMode(input: { readonly root: string; readonly run: string; readonly context: Context }): boolean {
  let fd: number | undefined;
  try {
    if (!runIdentity(input.run, input.context.runId) || !context(input.context, input.context.runId)
      || !policy(input.context.expectedBasePolicy, DOSSIER_POLICY_PATH, 'polaris-butlers-project-shape-secrets', DOSSIER_POLICY_VERSION)
      || !separated(input.root, input.run) || !ownedDirectory(input.root)) return false;
    const text = canonical({ format: FORMAT, run: input.run, runId: input.context.runId, context: input.context });
    fd = fs.openSync(slot(input.root, input.run), fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
    fs.writeFileSync(fd, `${text}\n`); fs.fsyncSync(fd); fs.closeSync(fd); fd = undefined;
    const directory = fs.openSync(input.root, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
    try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
    return true;
  } catch { return false; }
  finally { if (fd !== undefined) fs.closeSync(fd); }
}

/** A missing protected binding can never downgrade a marked URL run. No
 * sidecar value supplies its own expected digest or trusted metadata gate. */
export function urlRunModeAuthority(root: string, screenMetadata: (text: string) => boolean): EffectiveRunAuthority {
  return (run, runId) => {
    let fd: number | undefined;
    try {
      if (!runIdentity(run, runId) || !separated(root, run)) return { kind: 'refused' };
      try { if (!ownedDirectory(root)) return { kind: 'refused' }; }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') return { kind: 'refused' };
      }
      try { fd = fs.openSync(slot(root, run), fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') return { kind: 'refused' };
        // lstat keeps dangling links, FIFOs and directories visible as markers.
        for (const marker of MARKERS) {
          try { fs.lstatSync(path.join(run, marker)); return { kind: 'refused' }; }
          catch (cause) { if ((cause as NodeJS.ErrnoException).code !== 'ENOENT') return { kind: 'refused' }; }
        }
        return { kind: 'operator' };
      }
      const before = fs.fstatSync(fd);
      if (!before.isFile() || before.uid !== process.getuid?.() || (before.mode & 0o077) !== 0 || before.nlink !== 1 || before.size > BOUNDS.maxBytes) return { kind: 'refused' };
      const bytes = Buffer.alloc(BOUNDS.maxBytes + 1); let length = 0;
      while (length < bytes.length) { const n = fs.readSync(fd, bytes, length, bytes.length - length, null); if (n === 0) break; length += n; }
      const after = fs.fstatSync(fd);
      if (length > BOUNDS.maxBytes || before.size !== after.size || before.mtimeMs !== after.mtimeMs
        || before.ctimeMs !== after.ctimeMs || before.ino !== fs.lstatSync(slot(root, run)).ino) return { kind: 'refused' };
      const value: unknown = parseBoundedJson(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, length)), BOUNDS);
      if (!isRecord(value) || !exact(value, ['format', 'run', 'runId', 'context']) || value.format !== FORMAT
        || value.run !== run || value.runId !== runId || !context(value.context, runId)) return { kind: 'refused' };
      return { kind: 'url', context: deepFreeze(value.context), screenMetadata };
    } catch { return { kind: 'refused' }; }
    finally { if (fd !== undefined) fs.closeSync(fd); }
  };
}

/** Composition-root default. Ordinary operator mode requires no policy read;
 * URL metadata uses the current committed detector scope, without source reads. */
export function packageUrlRunModeAuthority(recordsRoot: string): EffectiveRunAuthority {
  return (run, runId) => {
    let predicate: ((text: string) => boolean) | undefined;
    const authority = urlRunModeAuthority(URL_HOST_ROOT, text => {
      if (predicate === undefined) {
        const snapshot = readCommittedPolicy(recordsRoot);
        if (!snapshot.ok) return false;
        const built = buildDossierScreen(snapshot.bytes, true, null, 'private');
        if (!built.ok) return false;
        predicate = value => built.screen.screenSecrets(value) === undefined;
      }
      return predicate(text);
    });
    return authority(run, runId);
  };
}
