import * as path from 'node:path';
import { BoundedJsonError, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { isRecord } from '@syzygy/support';
import { dossierLocator, isNormalisedLocator } from './launch-identity.js';
import type { GovernedKind } from './governed.js';
import { validateRunConfig, type RunConfig, type RunConfigRefusal } from './run-config.js';

/** The run configuration as the run directory stores it (`run.json`).
 *
 * Each declared value is recorded with who declared it and its label: the operator declared it,
 * and Syzygy observed none of it, so every value is Inferred. The principal of the commands is the
 * operator, operator-declared; the commands hold no credential that authenticates to Syzygy, so the
 * credential identity is Unknown, never fabricated. No provider-reported model version exists in
 * this mode, and the record says so.
 *
 * The subject block records what `init` established: the repository, the pinned revision and the consent that named it, the start
 * gates' records, the governed decision and the per-project statement it relied on. Read back, every one of these is Inferred: it is
 * which revision the run was pinned to, not that the revision is consented, which every later step verifies again
 * (`reverifyPinnedRevision`). The run makes no provider dispatch and no scheduler effect, so it has no work item; the record says why,
 * and the run is rendered as unattributed execution under RFC4-19.
 *
 * The clone's location is recorded once, at `init`, as the operator supplied it (resolved to a real path), and every later step reads
 * the objects it needs from that clone's object store, so no step takes a clone argument and an agent cannot move a step onto another
 * clone by passing one. It is a read location only: nothing is written there. It too is Inferred, since the record is within the agent
 * sessions' write reach; what makes a read trustworthy is that every object is read by identifier from the pinned commit and re-hashed. */

export const RUN_RECORD_FORMAT = 'polaris-dossier-run/1' as const;
export const NO_PROVIDER_MODEL_VERSION = 'no provider-reported model version is available in the operator-agent mode';

export const NO_WORK_ITEM_REASON = 'the operator-agent run makes no provider dispatch and no scheduler effect, so no scheduler work item, Proposal or materialization record exists for it; it is rendered as unattributed execution under RFC4-19, never dropped';

export interface RunClone {
  /** The clone's real path when the run was initialised. */
  readonly path: string;
  readonly declaredBy: 'operator';
  readonly label: 'Inferred';
  readonly use: 'read';
}

export interface RunSubject {
  readonly repository: { readonly url: string; readonly repositoryId: string };
  readonly clone: RunClone;
  readonly pinnedRevision: { readonly commit: string; readonly label: string; readonly consentRecord: string; readonly pinnedAt: string };
  readonly startGates: { readonly registryEntry: string; readonly screeningPolicy: string };
  readonly governed: { readonly kind: GovernedKind; readonly because: readonly string[] };
  /** The per-project statement the run relies on (`recordId@version`); null only for a non-governed subject. */
  readonly providerStatement: string | null;
  readonly workItem: { readonly identity: null; readonly reason: typeof NO_WORK_ITEM_REASON };
}

export interface RecordedRunConfig {
  readonly format: typeof RUN_RECORD_FORMAT;
  readonly mode: 'operator-agent';
  readonly declared: RunConfig;
  readonly declaredBy: 'operator';
  readonly label: 'Inferred';
  readonly modelVersionProvider: typeof NO_PROVIDER_MODEL_VERSION;
  readonly principal: { readonly name: string; readonly declaredBy: 'operator'; readonly credentialIdentity: 'Unknown' };
  readonly subject: RunSubject;
}

export function recordRunConfig(config: RunConfig, subject: RunSubject): RecordedRunConfig {
  return {
    format: RUN_RECORD_FORMAT,
    mode: 'operator-agent',
    declared: config,
    declaredBy: 'operator',
    label: 'Inferred',
    modelVersionProvider: NO_PROVIDER_MODEL_VERSION,
    principal: { name: config.operator, declaredBy: 'operator', credentialIdentity: 'Unknown' },
    subject,
  };
}

/** The declared values in the input form `parseRunConfig` reads, so a stored record is re-validated
 * by the same rules that admitted it. */
function declaredInput(config: RunConfig): Record<string, unknown> {
  const input: Record<string, unknown> = {
    operator: config.operator, agentTool: config.agentTool, agentToolVersion: config.agentToolVersion,
    agentProvider: config.agentProvider, model: config.model, deadline: config.deadline.declared,
    maxRepairCycles: config.maxRepairCycles, maxQuestions: config.maxQuestions, audience: config.audience,
    operatorIsOwner: config.operatorIsOwner,
  };
  if (config.modelVersion !== null) input['modelVersion'] = config.modelVersion;
  if (config.agentTokenBudget !== null) input['agentTokenBudget'] = config.agentTokenBudget;
  if (config.agentTurnBudget !== null) input['agentTurnBudget'] = config.agentTurnBudget;
  if (config.poleLimit !== null) input['poleLimit'] = config.poleLimit;
  return input;
}

export function encodeRunRecord(config: RunConfig, subject: RunSubject): string {
  // Written only in the normalised form (046, line 17); the legacy form is read, never written.
  if (!isNormalisedLocator(subject.repository.url)) throw new Error('a run record carries the normalised URL only');
  const record = recordRunConfig(config, subject);
  return `${JSON.stringify({ ...record, declared: declaredInput(config) }, null, 2)}\n`;
}

export type ReadRunRecordResult =
  | { readonly ok: true; readonly record: RecordedRunConfig }
  | { readonly ok: false; readonly detail: string; readonly refusals?: readonly RunConfigRefusal[] };

const RECORD_JSON_LIMITS = Object.freeze({ maxBytes: 65_536, maxNodes: 256, maxDepth: 4 });
const RECORD_KEYS = ['declared', 'declaredBy', 'format', 'label', 'mode', 'modelVersionProvider', 'principal', 'subject'];

/** Read a stored record back. The record lies within the agent sessions' write reach, so it is
 * re-validated in full; whatever it says stays Inferred. */
export function readRunRecord(text: string): ReadRunRecordResult {
  let document: unknown;
  try {
    document = parseBoundedJson(text, RECORD_JSON_LIMITS);
  } catch (cause) {
    return { ok: false, detail: `run.json is not one bounded JSON object (${cause instanceof BoundedJsonError ? cause.code : 'invalid-json'})` };
  }
  if (document === null || typeof document !== 'object' || Array.isArray(document)) {
    return { ok: false, detail: 'run.json is not a JSON object' };
  }
  const fields = document as Readonly<Record<string, unknown>>;
  const keys = Object.keys(fields).sort();
  if (keys.join(',') !== RECORD_KEYS.join(',')) {
    return { ok: false, detail: `run.json carries fields ${keys.join(', ')}; expected ${RECORD_KEYS.join(', ')}` };
  }
  if (fields['format'] !== RUN_RECORD_FORMAT || fields['mode'] !== 'operator-agent' || fields['declaredBy'] !== 'operator'
    || fields['label'] !== 'Inferred' || fields['modelVersionProvider'] !== NO_PROVIDER_MODEL_VERSION) {
    return { ok: false, detail: `run.json is not a ${RUN_RECORD_FORMAT} record of the operator-agent mode` };
  }
  const config = validateRunConfig(fields['declared']);
  if (!config.ok) return { ok: false, detail: 'run.json declares an invalid run configuration', refusals: config.refusals };
  const principal = fields['principal'] as Readonly<Record<string, unknown>> | null;
  if (principal === null || typeof principal !== 'object' || principal['name'] !== config.config.operator
    || principal['declaredBy'] !== 'operator' || principal['credentialIdentity'] !== 'Unknown'
    || Object.keys(principal).length !== 3) {
    return { ok: false, detail: 'run.json principal must be the declared operator, operator-declared, with credential identity Unknown' };
  }
  const subject = readSubject(fields['subject']);
  if (typeof subject === 'string') return { ok: false, detail: `run.json subject is invalid: ${subject}` };
  return { ok: true, record: recordRunConfig(config.config, subject) };
}

type Fields = Readonly<Record<string, unknown>>;
const hasKeys = (value: Fields, keys: readonly string[]): boolean => Object.keys(value).sort().join(',') === [...keys].sort().join(',');
const isText = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '' && value.length <= 512;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const GOVERNED_KINDS: readonly GovernedKind[] = ['governed', 'non-governed', 'unstated'];

/** The form the retired GitHub-only rule (github-url.ts, removed in slice C) wrote into a run record's `repository.url`, exactly. */
const LEGACY_RECORDED_URL = /^https:\/\/github\.com\/[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9._-]{1,100}$/u;

/** A recorded repository URL, normalised: a normalised locator as written, or a URL in the exact form the retired rule wrote, normalised
 * by the rule (046, line 15); null for anything else. */
export function readRecordedUrl(text: string): string | null {
  if (isNormalisedLocator(text)) return text;
  if (!LEGACY_RECORDED_URL.test(text) || text.endsWith('.git') || /\/\.\.?$/u.test(text)) return null;
  const read = dossierLocator(text);
  return read.ok ? read.url : null;
}

/** The subject block, validated in full; a description of the first fault otherwise. */
function readSubject(value: unknown): RunSubject | string {
  if (!isRecord(value) || !hasKeys(value, ['repository', 'clone', 'pinnedRevision', 'startGates', 'governed', 'providerStatement', 'workItem'])) return 'it must carry exactly repository, clone, pinnedRevision, startGates, governed, providerStatement and workItem';
  const { repository, clone, pinnedRevision, startGates, governed, providerStatement, workItem } = value;
  if (!isRecord(repository) || !hasKeys(repository, ['url', 'repositoryId']) || !isText(repository['url']) || !isText(repository['repositoryId'])) return 'repository must carry a url and a repositoryId';
  // The normalised URL, for every host (046, line 17: "The normalised URL is the locator every launch consent record, the run record and
  // every page carry, for every host"). A record written before that rule carries the canonical https://github.com/<owner>/<repo> URL
  // the retired GitHub-only rule wrote; it is read, and normalised on reading, so an existing run is neither refused nor rewritten.
  const url = readRecordedUrl(repository['url']);
  if (url === null || !/^[a-z0-9][a-z0-9._-]*$/.test(repository['repositoryId'])) return 'repository url or repositoryId is malformed';
  if (!isRecord(clone) || !hasKeys(clone, ['path', 'declaredBy', 'label', 'use']) || clone['declaredBy'] !== 'operator' || clone['label'] !== 'Inferred' || clone['use'] !== 'read') return 'clone must carry its path, declared by the operator, labelled Inferred, for reading only';
  if (typeof clone['path'] !== 'string' || clone['path'].length > 4096 || path.resolve(clone['path']) !== clone['path'] || clone['path'].includes('\0')) return 'the clone path is not an absolute, normalised path';
  if (!isRecord(pinnedRevision) || !hasKeys(pinnedRevision, ['commit', 'label', 'consentRecord', 'pinnedAt'])) return 'pinnedRevision must carry commit, label, consentRecord and pinnedAt';
  if (typeof pinnedRevision['commit'] !== 'string' || !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(pinnedRevision['commit'])) return 'the pinned commit is not a full commit identifier';
  if (!isText(pinnedRevision['label']) || !isText(pinnedRevision['consentRecord'])) return 'the pinned revision must name its label and consent record';
  if (typeof pinnedRevision['pinnedAt'] !== 'string' || !INSTANT.test(pinnedRevision['pinnedAt']) || Number.isNaN(Date.parse(pinnedRevision['pinnedAt']))) return 'pinnedAt is not a UTC instant';
  if (!isRecord(startGates) || !hasKeys(startGates, ['registryEntry', 'screeningPolicy']) || !isText(startGates['registryEntry']) || !isText(startGates['screeningPolicy'])) return 'startGates must cite the registry entry and screening policy records';
  if (!isRecord(governed) || !hasKeys(governed, ['kind', 'because']) || !GOVERNED_KINDS.includes(governed['kind'] as GovernedKind)
    || !Array.isArray(governed['because']) || governed['because'].length === 0 || !governed['because'].every(isText)) return 'governed must carry a kind and its reasons';
  const kind = governed['kind'] as GovernedKind;
  if (providerStatement !== null && !isText(providerStatement)) return 'providerStatement must be a record citation or null';
  if (kind !== 'non-governed' && providerStatement === null) return `${kind === 'unstated' ? 'an unstated' : 'a governed'} subject must cite the per-project statement it relies on`;
  if (!isRecord(workItem) || !hasKeys(workItem, ['identity', 'reason']) || workItem['identity'] !== null || workItem['reason'] !== NO_WORK_ITEM_REASON) return 'workItem must record an absent identity with its reason';
  return {
    repository: { url, repositoryId: repository['repositoryId'] },
    clone: { path: clone['path'], declaredBy: 'operator', label: 'Inferred', use: 'read' },
    pinnedRevision: { commit: pinnedRevision['commit'], label: pinnedRevision['label'], consentRecord: pinnedRevision['consentRecord'], pinnedAt: pinnedRevision['pinnedAt'] },
    startGates: { registryEntry: startGates['registryEntry'], screeningPolicy: startGates['screeningPolicy'] },
    governed: { kind, because: [...(governed['because'] as string[])] },
    providerStatement: providerStatement as string | null,
    workItem: { identity: null, reason: NO_WORK_ITEM_REASON },
  };
}
