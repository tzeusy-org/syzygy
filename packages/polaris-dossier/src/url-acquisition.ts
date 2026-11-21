import { constants } from 'node:fs';
import { lstat, mkdir, mkdtemp, open, realpath, rm } from 'node:fs/promises';
import path from 'node:path';
import { sha256 } from '@syzygy/support';
import { DEFAULT_ACQUISITION_LIMITS, runAcquisitionGit, type AcquisitionProcessFailure, type AcquisitionProcessLimits, type AcquisitionProcessRequest, type AcquisitionProcessResult, type AcquisitionProcessSummary } from './acquisition-process.js';
import { resolveCloneHead } from './clone-head.js';
import { cloneGitDirShape, cloneStoreShape } from './clone-shape.js';
import { openPinnedObjectReader } from './git-object-reader.js';
import { dossierLocator } from './launch-identity.js';
import type { DossierScreen } from './screen.js';
import { planUrlRevision, selectUrlRevision, type UrlRevisionFailureCode, type UrlRevisionSelection } from './url-revision.js';

type MetadataScreen = Pick<DossierScreen, 'screenBody'>;
export interface UrlAcquisitionOperation {
  readonly stage: 'selection' | 'init' | 'fetch' | 'checkout';
  readonly summary: AcquisitionProcessSummary;
  readonly startedAt: string;
  readonly finishedAt: string;
}
export interface SelectedUrlSource {
  /** Original safe transport spelling, never reconstructed from normalized provenance. */
  readonly transportLocator: string;
  readonly normalizedLocator: string;
  readonly transport: 'https' | 'ssh';
  readonly selector: string | null;
  readonly revision: UrlRevisionSelection;
  /** Stored history is Inferred; a digest does not establish a provider receipt or remote truth. */
  readonly provenance: {
    readonly classification: 'source-metadata';
    readonly label: 'Inferred';
    readonly locatorSha256: string;
    readonly selectorSha256: string | null;
    readonly advertisement: { readonly sha256: string; readonly bytes: number } | null;
  };
}
interface CommonInput {
  readonly scratchRoot: string;
  readonly screen: MetadataScreen;
  readonly limits?: Partial<AcquisitionProcessLimits>;
  /** Trusted caller records/announces this safe stage and its bounds before a child can start. */
  readonly onStage?: (stage: UrlAcquisitionOperation['stage'], limits: AcquisitionProcessLimits) => void | Promise<void>;
}
export interface SelectUrlSourceInput extends CommonInput { readonly locator: string; readonly revision?: string }
export interface AcquireUrlSourceInput extends CommonInput { readonly source: SelectedUrlSource }
export type UrlAcquisitionFailureCode = UrlRevisionFailureCode | AcquisitionProcessFailure | 'locator-invalid' | 'metadata-excluded'
  | 'invalid-limits' | 'scratch-unavailable' | 'selection-invalid' | 'configuration-changed' | 'pin-mismatch'
  | 'object-not-commit' | 'clone-shape' | 'object-verification' | 'operation-failed';
export interface UrlAcquisitionFailure {
  readonly ok: false;
  readonly code: UrlAcquisitionFailureCode;
  readonly reason: string;
  readonly stage: 'locator' | 'selector' | 'metadata' | 'scratch' | 'selection' | 'init' | 'fetch' | 'checkout' | 'verification';
  readonly operations: readonly UrlAcquisitionOperation[];
  /** An unconfirmed group, or unsuccessful cleanup, retains its unique workspace for inspection; never reuse it. */
  readonly retainedWorkspace?: string;
}
export type SelectUrlSourceResult = { readonly ok: true; readonly source: SelectedUrlSource; readonly operations: readonly UrlAcquisitionOperation[] } | UrlAcquisitionFailure;
export type AcquireUrlSourceResult = { readonly ok: true; readonly source: SelectedUrlSource; readonly clone: string;
  readonly workspace: string; readonly operations: readonly UrlAcquisitionOperation[] } | UrlAcquisitionFailure;
type GitRunner = (request: AcquisitionProcessRequest) => Promise<AcquisitionProcessResult>;
class ProcessStateUnknown extends Error {}
async function trustedRun(runner: GitRunner, request: AcquisitionProcessRequest): Promise<AcquisitionProcessResult> {
  try { return await runner(request); } catch { throw new ProcessStateUnknown(); }
}

const metadataSafe = (screen: MetadataScreen, values: readonly string[]): boolean => {
  try { return values.every(value => Buffer.from(value, 'utf8').toString('utf8') === value && screen.screenBody(value) === undefined); } catch { return false; }
};
const bounded = (input: CommonInput): boolean => {
  const limits = { ...DEFAULT_ACQUISITION_LIMITS, ...input.limits };
  return Object.values(limits).every(value => Number.isSafeInteger(value) && value > 0)
    && limits.processMilliseconds <= 2_147_483_647 && limits.sampleMilliseconds <= 2_147_483_647;
};
function locator(input: unknown): { readonly original: string; readonly normalized: string; readonly transport: 'https' | 'ssh' } | null {
  if (typeof input !== 'string' || Buffer.byteLength(input, 'utf8') > 16_384 || Buffer.from(input, 'utf8').toString('utf8') !== input) return null;
  const read = dossierLocator(input);
  if (!read.ok) return null;
  const transport = /^https:\/\//iu.test(input) ? 'https'
    : /^ssh:\/\//iu.test(input) || !input.includes('://') ? 'ssh' : null;
  return transport === null ? null : { original: input, normalized: read.url, transport };
}
const digest = (text: string): string => sha256(new TextEncoder().encode(text));
const refusal = (code: UrlAcquisitionFailureCode, stage: UrlAcquisitionFailure['stage'], reason: string,
  operations: readonly UrlAcquisitionOperation[] = []): UrlAcquisitionFailure => ({ ok: false, code, stage, reason, operations });

async function newWorkspace(root: string, prefix: string): Promise<string> {
  if (!path.isAbsolute(root)) throw new Error('scratch');
  const stat = await lstat(root);
  if (!stat.isDirectory() || stat.isSymbolicLink() || await realpath(root) !== root) throw new Error('scratch');
  return mkdtemp(path.join(root, prefix));
}
async function cleanup(workspace: string, operations: readonly UrlAcquisitionOperation[]): Promise<string | undefined> {
  if (operations.some(operation => operation.summary.groupTermination === 'unconfirmed')) return workspace;
  try { await rm(workspace, { recursive: true, force: true }); return undefined; } catch { return workspace; }
}
async function failedWorkspace(workspace: string, result: UrlAcquisitionFailure): Promise<UrlAcquisitionFailure> {
  const retainedWorkspace = await cleanup(workspace, result.operations);
  return retainedWorkspace === undefined ? result : { ...result, retainedWorkspace };
}
async function acknowledge(input: CommonInput, stage: UrlAcquisitionOperation['stage']): Promise<AcquisitionProcessLimits> {
  const limits = Object.freeze({ ...DEFAULT_ACQUISITION_LIMITS, ...input.limits });
  if (!bounded({ ...input, limits })) throw new Error('limits');
  await input.onStage?.(stage, limits);
  return limits;
}
async function invoke(runner: GitRunner, workspace: string, cwd: string, transport: 'none' | 'https' | 'ssh',
  args: readonly string[], input: CommonInput, stage: UrlAcquisitionOperation['stage'], operations: UrlAcquisitionOperation[]): Promise<UrlAcquisitionFailure | null> {
  const limits = await acknowledge(input, stage);
  const home = await mkdtemp(path.join(workspace, 'home-'));
  const startedAt = new Date().toISOString();
  const result = await trustedRun(runner, { args, cwd, home, transport, monitorRoot: workspace, limits });
  operations.push({ stage, summary: result.summary, startedAt, finishedAt: new Date().toISOString() });
  return result.ok ? null : refusal(result.code, stage, result.reason, operations);
}

/** Metadata-only selection. No supplied clone is read or modified. All source metadata is screened
 * without a path exemption before it can enter output, provenance or a Git argument. */
export const selectUrlSource = (input: SelectUrlSourceInput): Promise<SelectUrlSourceResult> => select(input, runAcquisitionGit);
/** Creates one fresh owned clone and pins the identifier already selected. No remote selector is re-resolved. */
export const acquireUrlSource = (input: AcquireUrlSourceInput): Promise<AcquireUrlSourceResult> => acquire(input, runAcquisitionGit);
/** Internal own-fixture process boundary; never exported through the workspace barrel or user configuration. */
export function urlAcquisitionTestPort(runner: GitRunner): {
  readonly selectUrlSource: (input: SelectUrlSourceInput) => Promise<SelectUrlSourceResult>;
  readonly acquireUrlSource: (input: AcquireUrlSourceInput) => Promise<AcquireUrlSourceResult>;
} {
  return { selectUrlSource: input => select(input, runner), acquireUrlSource: input => acquire(input, runner) };
}

function sourceOf(safe: NonNullable<ReturnType<typeof locator>>, selector: string | undefined, revision: UrlRevisionSelection,
  advertisement: string | null): SelectedUrlSource {
  return Object.freeze({ transportLocator: safe.original, normalizedLocator: safe.normalized, transport: safe.transport,
    selector: selector ?? null, revision: Object.freeze({ mode: revision.mode, reference: revision.reference,
      identifier: revision.identifier, objectFormat: revision.objectFormat }), provenance: Object.freeze({ classification: 'source-metadata',
      label: 'Inferred', locatorSha256: digest(safe.original), selectorSha256: selector === undefined ? null : digest(selector),
      advertisement: advertisement === null ? null : Object.freeze({ sha256: digest(advertisement), bytes: Buffer.byteLength(advertisement, 'utf8') }),
    }) });
}

async function select(input: SelectUrlSourceInput, runner: GitRunner): Promise<SelectUrlSourceResult> {
  const safe = locator(input.locator);
  if (!safe) return refusal('locator-invalid', 'locator', 'Use a credential-free HTTPS or SSH Git locator without query, fragment or unsafe characters; the input is not reproduced.');
  if (input.revision !== undefined && typeof input.revision !== 'string') return refusal('selector-unsupported', 'selector', 'Use a full commit identifier or an exact remote branch or tag reference.');
  if (input.revision !== undefined && input.revision.length > 1024) return refusal('selector-limit', 'selector', 'The selector exceeds the 1024-character limit; use a full commit identifier.');
  if (!metadataSafe(input.screen, [safe.original, safe.normalized, ...(input.revision === undefined ? [] : [input.revision])])) {
    return refusal('metadata-excluded', 'metadata', 'Source metadata is excluded by the committed policy and is not printed or stored.');
  }
  const plan = planUrlRevision(input.revision);
  if (!plan.ok) return refusal(plan.code, 'selector', plan.reason);
  if (!bounded(input)) return refusal('invalid-limits', 'metadata', 'Acquisition requires positive finite process, output, file, directory and sampling bounds.');
  if (plan.value.kind === 'full-commit') {
    const selected = selectUrlRevision(plan.value, '');
    if (!selected.ok) return refusal(selected.code, 'selection', selected.reason);
    if (!metadataSafe(input.screen, [selected.value.identifier])) return refusal('metadata-excluded', 'metadata', 'Selected metadata is excluded by the committed policy and is not printed or stored.');
    return { ok: true, source: sourceOf(safe, input.revision, selected.value, null), operations: [] };
  }
  let workspace: string;
  try { workspace = await newWorkspace(input.scratchRoot, 'url-selection-'); }
  catch { return refusal('scratch-unavailable', 'scratch', 'A real owned scratch directory outside source and run state is required.'); }
  const operations: UrlAcquisitionOperation[] = [];
  try {
    const limits = await acknowledge(input, 'selection');
    const home = await mkdtemp(path.join(workspace, 'home-'));
    const startedAt = new Date().toISOString();
    const result = await trustedRun(runner, { args: ['ls-remote', '--symref', '--', safe.original, ...plan.value.queries], cwd: workspace,
      home, transport: safe.transport, monitorRoot: workspace, limits });
    operations.push({ stage: 'selection', summary: result.summary, startedAt, finishedAt: new Date().toISOString() });
    if (!result.ok) return failedWorkspace(workspace, refusal(result.code, 'selection', result.reason, operations));
    if (Buffer.byteLength(result.stdout, 'utf8') > DEFAULT_ACQUISITION_LIMITS.outputBytes) return failedWorkspace(workspace,
      refusal('metadata-limit', 'metadata', 'The remote advertisement exceeds the metadata byte limit; use a full commit identifier.', operations));
    // Screen the full advertisement before parsing or retaining a selected field/digest. No raw advertisement is returned.
    if (!metadataSafe(input.screen, [result.stdout])) return failedWorkspace(workspace,
      refusal('metadata-excluded', 'metadata', 'Remote metadata is excluded by the committed policy and is not printed or stored.', operations));
    const selected = selectUrlRevision(plan.value, result.stdout);
    if (!selected.ok) return failedWorkspace(workspace, refusal(selected.code, 'selection', selected.reason, operations));
    if (!metadataSafe(input.screen, [selected.value.identifier, ...(selected.value.reference === null ? [] : [selected.value.reference])])) {
      return failedWorkspace(workspace, refusal('metadata-excluded', 'metadata', 'Selected metadata is excluded by the committed policy and is not printed or stored.', operations));
    }
    const source = sourceOf(safe, input.revision, selected.value, result.stdout);
    const retainedWorkspace = await cleanup(workspace, operations);
    if (retainedWorkspace !== undefined) return { ...refusal('scratch-unavailable', 'scratch', 'The selection workspace could not be removed; inspect it before retrying.', operations), retainedWorkspace };
    return { ok: true, source, operations };
  } catch (cause) {
    if (cause instanceof ProcessStateUnknown) return { ...refusal('termination-unconfirmed', 'selection', 'The Git process state is unknown; inspect local processes and the retained workspace before retrying.', operations), retainedWorkspace: workspace };
    return failedWorkspace(workspace, refusal('operation-failed', 'selection', 'The bounded source selection could not complete; supply a clone or retry with an exact commit.', operations));
  }
}

/** Treat even a prior return value as untrusted runtime input. Only reconstructed screened fields survive. */
function admittedSource(input: AcquireUrlSourceInput): SelectedUrlSource | null {
  try {
    const given = input.source;
    const safe = locator(given.transportLocator);
    if (!safe || given.normalizedLocator !== safe.normalized || given.transport !== safe.transport
      || (given.selector !== null && typeof given.selector !== 'string')) return null;
    const selector = given.selector ?? undefined;
    const plan = planUrlRevision(selector);
    const revision = given.revision;
    if (!plan.ok || typeof revision.identifier !== 'string' || !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(revision.identifier)
      || revision.objectFormat !== (revision.identifier.length === 64 ? 'sha256' : 'sha1') || revision.mode !== plan.value.kind) return null;
    if (plan.value.kind === 'full-commit') {
      if (revision.identifier !== plan.value.commit || revision.reference !== null) return null;
    } else {
      if (typeof revision.reference !== 'string') return null;
      const referencePlan = planUrlRevision(revision.reference);
      if (!referencePlan.ok || referencePlan.value.kind !== 'remote-ref' || referencePlan.value.references.length !== 1
        || (plan.value.kind === 'remote-default' ? !revision.reference.startsWith('refs/heads/') : !plan.value.references.includes(revision.reference))) return null;
    }
    if (!metadataSafe(input.screen, [safe.original, safe.normalized, revision.identifier,
      ...(selector === undefined ? [] : [selector]), ...(revision.reference === null ? [] : [revision.reference])])) return null;
    const p = given.provenance;
    const ad = p.advertisement;
    if (p.classification !== 'source-metadata' || p.label !== 'Inferred' || p.locatorSha256 !== digest(safe.original)
      || p.selectorSha256 !== (selector === undefined ? null : digest(selector))
      || (plan.value.kind === 'full-commit' ? ad !== null : ad === null)
      || (ad !== null && (typeof ad.sha256 !== 'string' || !/^[0-9a-f]{64}$/u.test(ad.sha256) || !Number.isSafeInteger(ad.bytes) || ad.bytes <= 0 || ad.bytes > DEFAULT_ACQUISITION_LIMITS.outputBytes))) return null;
    const reconstructed = sourceOf(safe, selector, revision, null);
    return Object.freeze({ ...reconstructed, provenance: Object.freeze({ ...reconstructed.provenance,
      advertisement: ad === null ? null : Object.freeze({ sha256: ad.sha256, bytes: ad.bytes }) }) });
  } catch { return null; }
}
async function configBytes(clone: string): Promise<Buffer> {
  const file = await open(path.join(clone, '.git/config'), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > 16_384) throw new Error('config');
    const bytes = Buffer.alloc(16_385);
    let length = 0;
    while (length < bytes.length) {
      const read = await file.read(bytes, length, bytes.length - length, null);
      if (read.bytesRead === 0) break;
      length += read.bytesRead;
    }
    if (length > 16_384) throw new Error('config');
    return bytes.subarray(0, length);
  } finally { await file.close(); }
}
async function acquire(input: AcquireUrlSourceInput, runner: GitRunner): Promise<AcquireUrlSourceResult> {
  const source = admittedSource(input);
  if (!source) return refusal('selection-invalid', 'metadata', 'The selected source is malformed, changed or excluded by the committed policy; select it again.');
  if (!bounded(input)) return refusal('invalid-limits', 'metadata', 'Acquisition requires positive finite process, output, file, directory and sampling bounds.');
  let workspace: string;
  try { workspace = await newWorkspace(input.scratchRoot, 'url-acquisition-'); }
  catch { return refusal('scratch-unavailable', 'scratch', 'A real owned scratch directory outside source and run state is required.'); }
  const clone = path.join(workspace, 'clone');
  const operations: UrlAcquisitionOperation[] = [];
  let stage: UrlAcquisitionFailure['stage'] = 'init';
  try {
    await mkdir(clone);
    let failure = await invoke(runner, workspace, clone, 'none', ['init', '--template=', `--object-format=${source.revision.objectFormat}`, '.'], input, 'init', operations);
    if (failure) return failedWorkspace(workspace, failure);
    const config = await configBytes(clone);
    stage = 'fetch';
    if (!config.equals(await configBytes(clone))) return failedWorkspace(workspace,
      refusal('configuration-changed', stage, 'The owned Git configuration changed; acquire a new clone.', operations));
    failure = await invoke(runner, workspace, clone, source.transport,
      ['fetch', '--depth=1', '--no-tags', '--no-recurse-submodules', '--', source.transportLocator, source.revision.identifier], input, 'fetch', operations);
    if (failure) return failedWorkspace(workspace, failure);
    stage = 'verification';
    const reader = openPinnedObjectReader({ gitDir: path.join(clone, '.git'), revision: source.revision.identifier });
    if (await reader.storedType() !== 'commit') return failedWorkspace(workspace,
      refusal('object-not-commit', stage, 'The selected identifier is not a stored commit; use a full commit or a named remote tag.', operations));
    await reader.tree(); // Hash and prove the selected commit before any checkout; never peel an explicit tag object.
    stage = 'checkout';
    if (!config.equals(await configBytes(clone))) return failedWorkspace(workspace,
      refusal('configuration-changed', stage, 'The owned Git configuration changed; acquire a new clone.', operations));
    failure = await invoke(runner, workspace, clone, 'none', ['checkout', '--detach', source.revision.identifier], input, 'checkout', operations);
    if (failure) return failedWorkspace(workspace, failure);
    stage = 'verification';
    if (!config.equals(await configBytes(clone))) return failedWorkspace(workspace,
      refusal('configuration-changed', stage, 'The owned Git configuration changed; acquire a new clone.', operations));
    const head = resolveCloneHead(clone);
    if (!head.ok || head.commit !== source.revision.identifier || head.via !== 'detached HEAD') return failedWorkspace(workspace,
      refusal('pin-mismatch', stage, 'The acquired detached HEAD does not equal the selected full commit; acquire a new clone.', operations));
    const shape = cloneGitDirShape(head.gitDir, head.commit, { objectFormatSetting: source.revision.objectFormat === 'sha256' });
    if (!shape.ok) return failedWorkspace(workspace, refusal('clone-shape', stage, 'The acquired Git directory does not have the strict one-commit form; supply a conforming clone.', operations));
    const store = cloneStoreShape(head.gitDir, head.commit, await reader.inventory());
    if (!store.ok) return failedWorkspace(workspace, refusal('clone-shape', stage, 'The acquired object store does not have the strict one-commit form; supply a conforming clone.', operations));
    return { ok: true, source, clone, workspace, operations };
  } catch (cause) {
    if (cause instanceof ProcessStateUnknown) return { ...refusal('termination-unconfirmed', stage, 'The Git process state is unknown; inspect local processes and the retained workspace before retrying.', operations), retainedWorkspace: workspace };
    return failedWorkspace(workspace, refusal(stage === 'verification' ? 'object-verification' : 'operation-failed', stage,
    'The selected source could not be verified or acquired within its strict local form; supply a conforming clone.', operations));
  }
}
