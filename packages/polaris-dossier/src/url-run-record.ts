import { BoundedJsonError, encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { deepFreeze, isRecord, sha256 } from '@syzygy/support';
import { dossierLocator } from './launch-identity.js';
import { readRunRecord, sourceBindingSha256, type RecordedRunConfig } from './run-record.js';
import type { PolicyBinding } from './policy-snapshot.js';

/** A historical declaration, never an admission receipt or current policy authority. The host
 * supplies directory identity and independently prepared expectations; it owns no-follow IO,
 * policy re-verification, detector screening, protected audit and actual transport enforcement.
 * This module neither reads files nor establishes that a declared send happened. */
export const URL_RUN_DECLARATION_FORMAT = 'polaris-dossier-url-declaration/1' as const;
export const URL_RUN_MODE = 'URL-supervised local CLI through checked transport relay' as const;
export const URL_DECLARATION_LIMITS = Object.freeze({ maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 });
export const URL_CONTENT_CLASSES = Object.freeze(['code-content', 'code-structure', 'derived-composites', 'evidence-content',
  'governance-text', 'project-documentation', 'work-history'] as const);
export type UrlContentClass = typeof URL_CONTENT_CLASSES[number];
export const URL_ROLES = Object.freeze(['author', 'inventory', 'fidelity', 'design'] as const);
export const URL_PROFILE_ID = 'claude-2.1.327-sonnet46/1' as const;
export const URL_SUPPORTED_MODEL = 'claude-sonnet-4-6' as const;
export const URL_ORIGIN_POLICY_PATH = '.syzygy/governance/policies/POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1.json' as const;
const ORIGIN_POLICY_ID = 'POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1';
const WORK_ITEM = Object.freeze({ identity: null, reason: 'local supervisor; no scheduler adapter' } as const);
const CAPTURE = Object.freeze({ actualSends: 'Unknown', providerReceipts: 'Unknown', modelVersion: 'Unknown',
  usage: 'Unknown', completeness: 'Unknown', sourceOperationOutcomes: 'Unknown' } as const);
const ROLE_CAPTURE = Object.freeze({ pid: 'Unknown', startedAt: 'Unknown', finishedAt: 'Unknown', outcome: 'Unknown' } as const);
const EXECUTION = Object.freeze({ observedCode: 'forbidden', permission: 'none' } as const);
const SPECIES = ['pinned-repository-body', 'verified-selected-git-commit-envelope-message',
  'structural-source-and-tool-metadata', 'fixed-role-policy-and-cli-scaffold', 'typed-run-control-and-clarification',
  'role-report-or-verdict', 'composed-role-input-or-broker-result', 'fixed-provider-text-or-tool-use',
  'authenticated-local-renderer-design-product-and-inert-view'] as const;

export interface UrlPlannedOrigin {
  readonly id: string;
  readonly species: typeof SPECIES[number];
  readonly sha256: string;
  readonly classes: readonly UrlContentClass[];
  /** Earlier entries whose actual classes are inherited, never a waiver for unknown origins. */
  readonly originIds: readonly string[];
}
export interface UrlSourceDestination {
  readonly scheme: 'https' | 'ssh'; readonly host: string; readonly port: number; readonly repository: string;
}
export interface UrlSourceTransport {
  readonly originalLocator: string;
  readonly destination: UrlSourceDestination;
  /** git-source: + SHA256 of the bounded canonical destination object, without username. */
  readonly providerId: string;
  readonly acquisitionId: string;
  readonly metadataClasses: readonly ['code-structure'];
  readonly selectionOrigin: 'validated-destination-before-acquisition';
  readonly commandSha256: string; readonly protocolSha256: string; readonly configurationSha256: string;
  readonly executableSha256: string; readonly environmentSha256: string;
}
export interface UrlInferenceDeclaration {
  readonly provider: 'anthropic'; readonly tool: 'claude-code'; readonly toolVersion: '2.1.327';
  readonly model: typeof URL_SUPPORTED_MODEL; readonly modelSelection: 'operator-option' | 'supported-default';
  /** Independently pinned supported registry digest, NOT a per-session compiled profile. */
  readonly profile: { readonly id: typeof URL_PROFILE_ID; readonly sha256: string };
}
export interface UrlRoleDeclaration {
  readonly role: typeof URL_ROLES[number]; readonly sessionId: string;
  readonly profileId: typeof URL_PROFILE_ID; readonly compiledProfileSha256: string;
  readonly commandSha256: string; readonly instructionSha256: string; readonly viewSha256: string;
  readonly scaffoldSha256: string; readonly mcpSha256: string; readonly configurationSha256: string;
  readonly executableSha256: string; readonly inputPacketSha256: string; readonly inputOriginId: string;
  readonly capture: typeof ROLE_CAPTURE;
}
export interface UrlRunDeclaration {
  readonly format: typeof URL_RUN_DECLARATION_FORMAT; readonly mode: typeof URL_RUN_MODE; readonly label: 'Inferred';
  readonly runId: string; readonly observingProject: 'project:syzygy'; readonly baseRunSha256: string;
  readonly sourceBindingSha256: string; readonly pinnedCommit: string;
  readonly basePolicy: PolicyBinding; readonly originPolicy: PolicyBinding;
  readonly inference: UrlInferenceDeclaration; readonly sourceTransport: UrlSourceTransport;
  readonly plannedOrigins: readonly UrlPlannedOrigin[]; readonly plannedClasses: readonly UrlContentClass[];
  readonly roles: readonly UrlRoleDeclaration[];
  readonly storage: {
    readonly protectedAudit: { readonly locator: string; readonly roleWritable: false };
    readonly compatibleHistory: { readonly locator: 'run-directory-history'; readonly roleWritable: true };
  };
  readonly workItem: typeof WORK_ITEM; readonly execution: typeof EXECUTION; readonly capture: typeof CAPTURE;
}
export interface UrlRunDeclarationInput {
  readonly runId: string; readonly originPolicy: PolicyBinding; readonly inference: UrlInferenceDeclaration;
  readonly sourceTransport: UrlSourceTransport; readonly plannedOrigins: readonly UrlPlannedOrigin[];
  readonly roles: readonly UrlRoleDeclaration[];
  /** Opaque host-resolved identity; never a selector-derived filesystem path. */
  readonly protectedAudit: string;
}
export interface UrlRunDeclarationContext {
  readonly runId: string;
  readonly expectedBasePolicy?: PolicyBinding;
  readonly expectedOriginPolicy?: PolicyBinding;
  readonly expectedSourceTransport?: UrlSourceTransport;
  readonly expectedProfileSha256?: string;
  readonly expectedSidecarSha256?: string;
}
export type UrlDeclarationText = string | Uint8Array;
export type UrlRunRecordFailureCode = 'invalid-base-record' | 'invalid-url-declaration' | 'binding-mismatch' | 'metadata-limit';
export interface UrlRunRecordFailure { readonly ok: false; readonly code: UrlRunRecordFailureCode; readonly reason: string }
export type EffectiveRunDeclaration =
  | { readonly kind: 'operator'; readonly declaration: RecordedRunConfig }
  | { readonly kind: 'url'; readonly declaration: UrlRunDeclaration };
export type EffectiveRunDeclarationResult =
  | { readonly ok: true; readonly core: RecordedRunConfig; readonly effective: EffectiveRunDeclaration }
  | UrlRunRecordFailure;
export type EncodedUrlRunDeclarationResult =
  | { readonly ok: true; readonly declaration: UrlRunDeclaration; readonly text: string; readonly sha256: string }
  | UrlRunRecordFailure;

class InvalidDeclaration extends Error {}
class BindingMismatch extends Error {}
function invalid(): never { throw new InvalidDeclaration(); }
function mismatch(): never { throw new BindingMismatch(); }
const fail = (code: UrlRunRecordFailureCode): UrlRunRecordFailure => ({ ok: false, code, reason: {
  'invalid-base-record': 'The compatible run record is invalid; preserve it and check the run configuration.',
  'invalid-url-declaration': 'The URL declaration is unsupported or malformed; preserve it and rebuild a checked declaration.',
  'binding-mismatch': 'The URL declaration does not match the expected run bindings; preserve it and check the recorded identities.',
  'metadata-limit': 'The URL metadata exceeds its fixed bounds; preserve it and reduce the declared metadata population.',
}[code] });
const failureOf = (cause: unknown): UrlRunRecordFailure => fail(cause instanceof BindingMismatch ? 'binding-mismatch'
  : cause instanceof BoundedJsonError && ['byte-limit', 'node-limit', 'depth-limit'].includes(cause.code) ? 'metadata-limit' : 'invalid-url-declaration');
const canonical = (value: unknown): string => encodeCanonicalJson(value, URL_DECLARATION_LIMITS);
const equal = (left: unknown, right: unknown): boolean => canonical(left) === canonical(right);
const keys = (value: unknown, expected: readonly string[]): value is Record<string, unknown> =>
  isRecord(value) && Object.keys(value).sort().join(',') === [...expected].sort().join(',');
const validUnicode = (value: string): boolean => Buffer.from(value, 'utf8').toString('utf8') === value;
const safeId = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9][a-z0-9._-]{0,127}$/.test(value);
const originId = (value: unknown): value is string => typeof value === 'string' && /^origin:[a-z0-9][a-z0-9._-]{0,127}$/.test(value);
const digest = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
const oid = (value: unknown): value is string => typeof value === 'string' && /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(value);

function textOf(input: UrlDeclarationText): string {
  if (typeof input === 'string') {
    if (input.length > URL_DECLARATION_LIMITS.maxBytes || Buffer.byteLength(input, 'utf8') > URL_DECLARATION_LIMITS.maxBytes) throw new BoundedJsonError('byte-limit');
    if (!validUnicode(input)) invalid();
    return input;
  }
  if (!(input instanceof Uint8Array)) invalid();
  if (input.byteLength > URL_DECLARATION_LIMITS.maxBytes) throw new BoundedJsonError('byte-limit');
  // Keep BOM: it is not JSON whitespace, and silently removing it would change the bound bytes.
  return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(input);
}
function parse(text: string): unknown {
  const value: unknown = parseBoundedJson(text, URL_DECLARATION_LIMITS);
  const pending: unknown[] = [value];
  while (pending.length) {
    const item = pending.pop();
    if (typeof item === 'string' && !validUnicode(item)) invalid();
    if (isRecord(item)) {
      for (const [key, entry] of Object.entries(item)) { if (!validUnicode(key)) invalid(); pending.push(entry); }
    } else if (Array.isArray(item)) for (const entry of item) pending.push(entry);
  }
  return value;
}
function policy(value: unknown, origin: boolean): asserts value is PolicyBinding {
  if (!keys(value, ['path', 'commit', 'policyId', 'policyVersion', 'sha256']) || !oid(value['commit']) || !digest(value['sha256'])) invalid();
  if (origin && (value['path'] !== URL_ORIGIN_POLICY_PATH || value['policyId'] !== ORIGIN_POLICY_ID || value['policyVersion'] !== '1.0.0')) invalid();
}

/** Destination identity is derived from the ORIGINAL validated locator. The legacy normalized
 * provenance string loses scheme/port/case/username and must never reconstruct a transport.
 * Conservative percent/backslash/dot-segment rejection avoids URL parser/Git path ambiguity. */
export function urlSourceTransportIdentity(originalLocator: unknown):
  | { readonly ok: true; readonly originalLocator: string; readonly destination: UrlSourceDestination; readonly providerId: string }
  | UrlRunRecordFailure {
  try {
    if (typeof originalLocator !== 'string' || originalLocator.length > 16_384 || !validUnicode(originalLocator)
      || /[%\\\u0000-\u0020\u007f]/u.test(originalLocator) || !dossierLocator(originalLocator).ok) invalid();
    let scheme: 'https' | 'ssh', host: string, port: number, repository: string;
    if (/^(?:https|ssh):\/\//iu.test(originalLocator)) {
      const uri = new URL(originalLocator);
      scheme = uri.protocol === 'https:' ? 'https' : 'ssh';
      if (uri.password || (scheme === 'https' && uri.username) || uri.search || uri.hash) invalid();
      const rawPath = originalLocator.slice(originalLocator.indexOf('/', originalLocator.indexOf('://') + 3));
      if (rawPath !== uri.pathname) invalid();
      host = uri.hostname.toLowerCase(); port = uri.port === '' ? (scheme === 'https' ? 443 : 22) : Number(uri.port);
      repository = uri.pathname;
    } else {
      if (originalLocator.includes('://')) invalid();
      const scp = /^(?:[^@/:]+@)?([^/:]+):(.+)$/u.exec(originalLocator);
      if (scp === null) invalid();
      const hostUrl = new URL(`https://${scp[1]!}/`);
      scheme = 'ssh'; host = hostUrl.hostname.toLowerCase(); port = 22; repository = scp[2]!;
    }
    if (!Number.isInteger(port) || port < 1 || port > 65_535 || !repository || repository.length > 4096
      || repository.split('/').some((part, index) => part === '.' || part === '..' || (part === '' && index !== 0 && index !== repository.split('/').length - 1))) invalid();
    const destination: UrlSourceDestination = { scheme, host, port, repository };
    return deepFreeze({ ok: true, originalLocator, destination, providerId: `git-source:${sha256(canonical(destination))}` });
  } catch { return fail('invalid-url-declaration'); }
}
function transport(value: unknown, core: RecordedRunConfig): asserts value is UrlSourceTransport {
  if (!keys(value, ['originalLocator', 'destination', 'providerId', 'acquisitionId', 'metadataClasses', 'selectionOrigin',
    'commandSha256', 'protocolSha256', 'configurationSha256', 'executableSha256', 'environmentSha256'])) invalid();
  const identity = urlSourceTransportIdentity(value['originalLocator']);
  if (!identity.ok || !equal(value['destination'], identity.destination) || value['providerId'] !== identity.providerId) invalid();
  const normalized = dossierLocator(identity.originalLocator);
  if (!normalized.ok || normalized.url !== core.subject.repository.url) mismatch();
  if (typeof value['acquisitionId'] !== 'string' || !/^acq-[0-9a-f]{32}$/.test(value['acquisitionId'])
    || !equal(value['metadataClasses'], ['code-structure']) || value['selectionOrigin'] !== 'validated-destination-before-acquisition'
    || !['commandSha256', 'protocolSha256', 'configurationSha256', 'executableSha256', 'environmentSha256'].every(key => digest(value[key]))) invalid();
}
function inference(value: unknown, core: RecordedRunConfig): asserts value is UrlInferenceDeclaration {
  if (!keys(value, ['provider', 'tool', 'toolVersion', 'model', 'modelSelection', 'profile'])
    || value['provider'] !== 'anthropic' || value['tool'] !== 'claude-code' || value['toolVersion'] !== '2.1.327'
    || value['model'] !== URL_SUPPORTED_MODEL || !['operator-option', 'supported-default'].includes(String(value['modelSelection']))
    || !keys(value['profile'], ['id', 'sha256']) || value['profile']['id'] !== URL_PROFILE_ID || !digest(value['profile']['sha256'])) invalid();
  if (core.declared.agentProvider !== value['provider'] || core.declared.agentTool !== value['tool']
    || core.declared.agentToolVersion !== value['toolVersion'] || core.declared.model !== value['model']) mismatch();
}
function origins(value: unknown): asserts value is readonly UrlPlannedOrigin[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 1024) invalid();
  const prior = new Map<string, readonly UrlContentClass[]>();
  for (const entry of value) {
    if (!keys(entry, ['id', 'species', 'sha256', 'classes', 'originIds']) || !originId(entry['id']) || prior.has(entry['id'])
      || !digest(entry['sha256']) || !Array.isArray(entry['classes']) || entry['classes'].length < 1
      || !entry['classes'].every(item => (URL_CONTENT_CLASSES as readonly unknown[]).includes(item))
      || !equal(entry['classes'], [...new Set(entry['classes'])].sort()) || !Array.isArray(entry['originIds'])
      || entry['originIds'].length > 1024 || !entry['originIds'].every(item => typeof item === 'string' && prior.has(item))
      || new Set(entry['originIds']).size !== entry['originIds'].length) invalid();
    const inherited = new Set<UrlContentClass>();
    for (const id of entry['originIds'] as string[]) for (const item of prior.get(id)!) inherited.add(item);
    let expected: readonly string[];
    switch (entry['species']) {
      case 'pinned-repository-body':
        if (entry['classes'].length !== 1 || !['code-content', 'project-documentation', 'governance-text'].includes(entry['classes'][0] as string)) invalid();
        expected = entry['classes'] as string[]; break;
      case 'verified-selected-git-commit-envelope-message': case 'typed-run-control-and-clarification': expected = ['work-history']; break;
      case 'structural-source-and-tool-metadata': expected = ['code-structure']; break;
      case 'fixed-role-policy-and-cli-scaffold': expected = ['governance-text']; break;
      // A planned scaffold origin names installed implementation syntax only.
      // The subsequent authenticated product inherits all actual inputs separately.
      case 'authenticated-local-renderer-design-product-and-inert-view': expected = ['code-content']; break;
      case 'role-report-or-verdict': expected = [...new Set(['evidence-content', ...inherited])].sort(); break;
      case 'composed-role-input-or-broker-result': case 'fixed-provider-text-or-tool-use':
        if (entry['originIds'].length === 0) invalid();
        expected = [...new Set(['derived-composites', ...inherited])].sort(); break;
      default: invalid();
    }
    if (!equal(entry['classes'], expected) || (!['role-report-or-verdict', 'composed-role-input-or-broker-result',
      'fixed-provider-text-or-tool-use'].includes(entry['species'] as string) && entry['originIds'].length !== 0)) invalid();
    prior.set(entry['id'], entry['classes'] as UrlContentClass[]);
  }
}
const plannedClasses = (entries: readonly UrlPlannedOrigin[]): readonly UrlContentClass[] =>
  [...new Set(entries.flatMap(entry => entry.classes))].sort();
function roles(value: unknown, entries: readonly UrlPlannedOrigin[]): asserts value is readonly UrlRoleDeclaration[] {
  if (!Array.isArray(value) || value.length !== URL_ROLES.length) invalid();
  const sessions = new Set<string>();
  for (const [index, role] of value.entries()) {
    if (!keys(role, ['role', 'sessionId', 'profileId', 'compiledProfileSha256', 'commandSha256', 'instructionSha256', 'viewSha256',
      'scaffoldSha256', 'mcpSha256', 'configurationSha256', 'executableSha256', 'inputPacketSha256', 'inputOriginId', 'capture'])
      || role['role'] !== URL_ROLES[index] || role['profileId'] !== URL_PROFILE_ID || typeof role['sessionId'] !== 'string'
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(role['sessionId']) || sessions.has(role['sessionId'])
      || !['compiledProfileSha256', 'commandSha256', 'instructionSha256', 'viewSha256', 'scaffoldSha256', 'mcpSha256',
        'configurationSha256', 'executableSha256', 'inputPacketSha256'].every(key => digest(role[key])) || !equal(role['capture'], ROLE_CAPTURE)) invalid();
    const input = entries.find(entry => entry.id === role['inputOriginId']);
    if (!input || input.species !== 'composed-role-input-or-broker-result' || input.sha256 !== role['inputPacketSha256']) mismatch();
    sessions.add(role['sessionId']);
  }
}
function validate(value: unknown, core: RecordedRunConfig, baseText: string, sidecarText: string, context: unknown): asserts value is UrlRunDeclaration {
  if (!keys(value, ['format', 'mode', 'label', 'runId', 'observingProject', 'baseRunSha256', 'sourceBindingSha256', 'pinnedCommit',
    'basePolicy', 'originPolicy', 'inference', 'sourceTransport', 'plannedOrigins', 'plannedClasses', 'roles', 'storage', 'workItem', 'execution', 'capture'])
    || value['format'] !== URL_RUN_DECLARATION_FORMAT || value['mode'] !== URL_RUN_MODE || value['label'] !== 'Inferred'
    || !safeId(value['runId']) || value['observingProject'] !== 'project:syzygy') invalid();
  const supplied: unknown = parse(canonical(context));
  const allowedContext = ['runId', 'expectedBasePolicy', 'expectedOriginPolicy', 'expectedSourceTransport', 'expectedProfileSha256', 'expectedSidecarSha256'];
  if (!isRecord(supplied) || !safeId(supplied['runId']) || Object.keys(supplied).some(key => !allowedContext.includes(key))) invalid();
  if (value['runId'] !== supplied['runId'] || value['baseRunSha256'] !== sha256(baseText)
    || value['sourceBindingSha256'] !== sourceBindingSha256(core.subject) || value['pinnedCommit'] !== core.subject.pinnedRevision.commit
    || !equal(value['basePolicy'], core.subject.screeningPolicy)) mismatch();
  policy(value['originPolicy'], true); inference(value['inference'], core); transport(value['sourceTransport'], core);
  origins(value['plannedOrigins']); roles(value['roles'], value['plannedOrigins']);
  if (!equal(value['plannedClasses'], plannedClasses(value['plannedOrigins']))) invalid();
  if (!equal(value['storage'], { protectedAudit: { locator: `url-audit:${value['runId']}`, roleWritable: false },
    compatibleHistory: { locator: 'run-directory-history', roleWritable: true } }) || !equal(value['workItem'], WORK_ITEM)
    || !equal(value['execution'], EXECUTION) || !equal(value['capture'], CAPTURE)) invalid();
  for (const [expected, actual] of [['expectedBasePolicy', 'basePolicy'], ['expectedOriginPolicy', 'originPolicy'],
    ['expectedSourceTransport', 'sourceTransport']] as const) if (Object.hasOwn(supplied, expected) && !equal(supplied[expected], value[actual])) mismatch();
  if (Object.hasOwn(supplied, 'expectedProfileSha256') && supplied['expectedProfileSha256'] !== value['inference'].profile.sha256) mismatch();
  if (Object.hasOwn(supplied, 'expectedSidecarSha256') && supplied['expectedSidecarSha256'] !== sha256(sidecarText)) mismatch();
}

export function readEffectiveRunDeclaration(baseInput: UrlDeclarationText, sidecarInput: UrlDeclarationText | null,
  context?: UrlRunDeclarationContext): EffectiveRunDeclarationResult {
  let baseText: string, core: RecordedRunConfig;
  try {
    // Null overlay preserves the existing string reader, including its legacy URL normalization.
    baseText = sidecarInput === null && typeof baseInput === 'string' ? baseInput : textOf(baseInput);
    const read = readRunRecord(baseText);
    if (!read.ok) return fail('invalid-base-record');
    // The legacy reader shares its readonly class tuple. Freeze our URL snapshot without
    // changing that module's shared value or its absent-overlay operator behavior.
    core = sidecarInput === null ? read.record : { ...read.record,
      subject: { ...read.record.subject, contentClasses: [...read.record.subject.contentClasses] } };
  } catch { return fail('invalid-base-record'); }
  if (sidecarInput === null) return { ok: true, core, effective: { kind: 'operator', declaration: core } };
  try {
    const sidecarText = textOf(sidecarInput);
    const declaration: unknown = parse(sidecarText);
    validate(declaration, core, baseText, sidecarText, context);
    return deepFreeze({ ok: true, core, effective: { kind: 'url', declaration } });
  } catch (cause) { return failureOf(cause); }
}
export function encodeUrlRunDeclaration(baseText: UrlDeclarationText, declaration: unknown,
  context?: UrlRunDeclarationContext): EncodedUrlRunDeclarationResult {
  try {
    const text = `${canonical(declaration)}\n`;
    const read = readEffectiveRunDeclaration(baseText, text, context);
    if (!read.ok) return read;
    if (read.effective.kind !== 'url') return fail('invalid-url-declaration');
    return deepFreeze({ ok: true, declaration: read.effective.declaration, text, sha256: sha256(text) });
  } catch { return fail('invalid-url-declaration'); }
}
export function createUrlRunDeclaration(baseInput: UrlDeclarationText, input: UrlRunDeclarationInput,
  context?: UrlRunDeclarationContext): EncodedUrlRunDeclarationResult {
  try {
    const baseText = textOf(baseInput), read = readRunRecord(baseText);
    if (!read.ok) return fail('invalid-base-record');
    const data: unknown = parse(canonical(input));
    if (!keys(data, ['runId', 'originPolicy', 'inference', 'sourceTransport', 'plannedOrigins', 'roles', 'protectedAudit'])) invalid();
    origins(data['plannedOrigins']);
    const declaration = { format: URL_RUN_DECLARATION_FORMAT, mode: URL_RUN_MODE, label: 'Inferred', runId: data['runId'],
      observingProject: 'project:syzygy', baseRunSha256: sha256(baseText), sourceBindingSha256: sourceBindingSha256(read.record.subject),
      pinnedCommit: read.record.subject.pinnedRevision.commit, basePolicy: read.record.subject.screeningPolicy,
      originPolicy: data['originPolicy'], inference: data['inference'], sourceTransport: data['sourceTransport'],
      plannedOrigins: data['plannedOrigins'], plannedClasses: plannedClasses(data['plannedOrigins']), roles: data['roles'],
      storage: { protectedAudit: { locator: data['protectedAudit'], roleWritable: false },
        compatibleHistory: { locator: 'run-directory-history', roleWritable: true } }, workItem: WORK_ITEM, execution: EXECUTION, capture: CAPTURE };
    return encodeUrlRunDeclaration(baseText, declaration, context);
  } catch { return fail('invalid-url-declaration'); }
}
