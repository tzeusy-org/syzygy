import { DOSSIER_READER_QUESTIONS, DOSSIER_REQUESTED_ASSETS, SOURCE_TEXT_MAX_LENGTH, generationSourceIdentity, generationSourcesForBody, generationSourcesForRedactedBody, gitBlobObjectId, validateGenerationSources, verifiedRedactedBody, validateReaderQuestions, validateRequestedAssets,
  type GenerationBudget, type GenerationExclusionReason, type ReaderQuestion, type GenerationSource, type GenerationStage, type PipelineRequest, type RequestedAsset } from '@syzygy/polaris-generation-core';
import { sha256 } from '@syzygy/support';

import { isolatedGit } from './isolated-git.js';
import { excludedSourceId, keyedDigest, newGenerationRunKey } from './run-key.js';
import { readGitBlobsBatch, type ReadGitBlobs } from '../git-blob-batch.js';

const git = isolatedGit;
const BLOB_BATCH = 200;
const STAGES: readonly GenerationStage[] = ['inventory', 'plan', 'author', 'edit', 'fidelity', 'repair'];

/** The trusted decision to look at one repository revision. The reader asks
 * before it touches the repository in any way, and only `allowed: true`
 * proceeds. A later lane backs this with real consent records. */
interface CorpusAdmissionRequest { readonly repositoryId: string; readonly revision: string; readonly include: readonly string[]; readonly exclude: readonly string[] }
type CorpusAdmissionDecision =
  | { readonly allowed: true; readonly permissionIdentity: string }
  | { readonly allowed: false; readonly reason: string };
export interface CorpusAdmissionPort { readonly decide: (request: CorpusAdmissionRequest) => Promise<CorpusAdmissionDecision> }

/** The default: no admission record, so no read. */
export const refusingAdmission: CorpusAdmissionPort = {
  decide: async () => ({ allowed: false, reason: 'no-admission-port: no observation consent record is wired' }),
};

export class CorpusRefusal extends Error {
  constructor(readonly reason: string) { super(`Corpus read refused: ${reason}`); this.name = 'CorpusRefusal'; }
}

export interface ReaderConfig {
  readonly repositoryId: string;
  readonly revision: string;
  readonly include: readonly string[];
  readonly exclude: readonly string[];
  readonly readerQuestions: readonly ReaderQuestion[];
  readonly requestedAssets: readonly RequestedAsset[];
  readonly budget: GenerationBudget;
  readonly oversize: 'split' | 'exclude';
  readonly routes?: Readonly<Record<GenerationStage, string>>;
}

const CONFIG_KEYS = new Set(['repositoryId', 'revision', 'include', 'exclude', 'readerQuestions', 'requestedAssets', 'budget', 'oversize', 'routes', 'profile']);
const BUDGET_KEYS = ['maxCalls', 'maxInputBytes', 'maxOutputBytes', 'maxUsageUnits', 'maxElapsedMs', 'maxRepairCycles', 'accountingPolicy'] as const;
const strings = (value: unknown, what: string): string[] => {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || item.length === 0)) throw new Error(`config-invalid: ${what}`);
  return value as string[];
};

/** `profile: "dossier"` supplies the dossier reader questions and assets unless the config sets its own.
 * Strict parse: unknown keys, wrong types and an unset revision are refused. */
function questionsFrom(value: unknown): readonly ReaderQuestion[] {
  try { return validateReaderQuestions(value); } catch (error) { throw new Error(`config-invalid: readerQuestions (${error instanceof Error ? error.message : 'invalid'})`); }
}

export function parseReaderConfig(text: string, overrides: Partial<Pick<ReaderConfig, 'repositoryId' | 'revision'>> & { include?: readonly string[]; exclude?: readonly string[] } = {}): ReaderConfig {
  const raw = JSON.parse(text) as Record<string, unknown>;
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).some(key => !CONFIG_KEYS.has(key))) throw new Error('config-invalid: keys');
  const budget = raw.budget as Record<string, unknown>;
  if (budget === null || typeof budget !== 'object' || Object.keys(budget).length !== BUDGET_KEYS.length
    || BUDGET_KEYS.some(key => key === 'accountingPolicy' ? typeof budget[key] !== 'string' : !Number.isSafeInteger(budget[key]) || (budget[key] as number) < 0)) throw new Error('config-invalid: budget');
  if (raw.profile !== undefined && raw.profile !== 'dossier') throw new Error('config-invalid: profile');
  const dossier = raw.profile === 'dossier';
  const oversize = raw.oversize ?? 'split';
  if (oversize !== 'split' && oversize !== 'exclude') throw new Error('config-invalid: oversize');
  const routes = raw.routes as Record<string, unknown> | undefined;
  if (routes !== undefined && (typeof routes !== 'object' || routes === null || STAGES.some(stage => typeof routes[stage] !== 'string'))) throw new Error('config-invalid: routes');
  const config: ReaderConfig = {
    repositoryId: overrides.repositoryId ?? String(raw.repositoryId ?? ''),
    revision: overrides.revision ?? String(raw.revision ?? ''),
    include: overrides.include?.length ? overrides.include : strings(raw.include ?? ['**'], 'include'),
    exclude: overrides.exclude?.length ? overrides.exclude : strings(raw.exclude ?? [], 'exclude'),
    readerQuestions: dossier && raw.readerQuestions === undefined ? DOSSIER_READER_QUESTIONS : questionsFrom(raw.readerQuestions),
    requestedAssets: dossier && raw.requestedAssets === undefined ? DOSSIER_REQUESTED_ASSETS : raw.requestedAssets as RequestedAsset[], budget: budget as unknown as GenerationBudget,
    oversize, ...(routes === undefined ? {} : { routes: routes as unknown as Record<GenerationStage, string> }),
  };
  assertIdentity(config.repositoryId, config.revision);
  validateRequestedAssets(config.requestedAssets);
  return config;
}

function assertIdentity(repositoryId: string, revision: string): void {
  // Every 046 identity (line 15: a-z, 0-9, '.', '_', '-', after `repository:`) is admitted, compared exactly; ':' and upper case stay for the
  // `github:<owner>:<repo>` form (the owner's ruling of 2026-11-14, "Widen all readers now"; R-PDJA-33-RULINGS-2 finding 1).
  if (!/^[A-Za-z0-9:._-]+$/u.test(repositoryId)) throw new Error('invalid-repository-id');
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(revision)) throw new Error('invalid-pinned-commit');
}

/** The path rules the source validator enforces, so one odd name is accounted for rather than fatal. */
function representablePath(path: string): boolean {
  // A control character (a newline included) is legal in a Git path but no row may carry one.
  return path.length > 0 && !path.startsWith('/') && !/[\u0000-\u001f\u007f]/u.test(path) && !path.includes('\\') && !path.includes('\uFFFD')
    && !path.split('/').some(part => part === '' || part === '.' || part === '..');
}

// Test seam: exported for the tests; production code reaches it only inside this file.
/** `**` crosses directories, `**` + `/` may match none, `*` and `?` stay in one segment. */
export function globToRegExp(glob: string): RegExp {
  let out = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]!;
    if (c === '*' && glob[i + 1] === '*') {
      if (glob[i + 2] === '/') { out += '(?:.*/)?'; i += 2; } else { out += '.*'; i += 1; }
    } else if (c === '*') out += '[^/]*';
    else if (c === '?') out += '[^/]';
    else out += c.replace(/[\\^$.|+()[\]{}]/gu, '\\$&');
  }
  // `s`: `**` spans a newline inside a path too, so such a path is counted unquotable, not outside the include.
  return new RegExp(`^${out}$`, 'su');
}

interface RepoCorpusCount {
  readonly listed: number;
  readonly notBlob: number;
  readonly outsideInclude: number;
  readonly excludedByGlob: number;
  readonly unquotablePath: number;
  /** Files chosen to read; listed = notBlob + outsideInclude + excludedByGlob + unquotablePath + selected. */
  readonly selected: number;
  readonly emptyFiles: number;
  /** Rows in `sources`: one per file, plus extra pieces of oversize files. */
  readonly sourceRows: number;
  readonly binaryOrNonUtf8: number;
  readonly oversizeFiles: number;
  readonly oversizeExcluded: number;
  /** Withheld by a screen (zero without one): denied path, detector match on
   * the path or the body, active content, and a blob no class rule covers. */
  readonly deniedPath: number;
  readonly secretDetectorMatches: number;
  readonly activeContent: number;
  readonly indeterminate: number;
  /** Unquotable paths (never selected, never read) whose path a detector matched; counted apart from
   * `secretDetectorMatches`, which counts selected sources only. Zero without a screen. */
  readonly unquotablePathSecretMatches: number;
  readonly redactedFiles: number;
  readonly withheldLines: number;
}
export interface RepoCorpus {
  readonly repositoryId: string;
  readonly revision: string;
  readonly permissionIdentity: string;
  readonly sources: readonly GenerationSource[];
  readonly count: RepoCorpusCount;
  readonly unrepresentable: readonly { readonly pathHmac: string; readonly objectId: string; readonly reason: 'unquotable-path' }[];
  readonly rawBytes: number;
  readonly identityDigest: string;
}

/** A whole-artifact screen over each selected blob. The path screen decides
 * before the blob is read; the body screen runs on the whole decoded text,
 * before any splitting. With a screen in force every excluded row, whatever
 * its reason, carries `opaqueId(identity)` and a placeholder path naming that
 * id, never the repository path, object id or body. */
type CorpusScreenReason = Extract<GenerationExclusionReason, 'denied-path' | 'secret-detector-match' | 'active-content' | 'unknown-extraction-class'>;
export interface CorpusScreen {
  readonly screenPath: (path: string) => Exclude<CorpusScreenReason, 'active-content'> | undefined;
  /** With the blob's path, a body the scope's code-content exemption names may skip the active-content scan. */
  readonly screenBody: (body: string, path?: string) => 'secret-detector-match' | 'active-content' | undefined;
  /** Absent on a whole-body screen. A v4 target-body screen must return only safe retained material and original coordinates. */
  readonly screenTargetBody?: (body: string, path: string) =>
    | { readonly kind: 'admitted' }
    | { readonly kind: 'excluded'; readonly outcome: 'secret-detector-match' | 'active-content' }
    | { readonly kind: 'redacted'; readonly retained: string; readonly retainedLines: readonly string[]; readonly withheld: readonly number[];
        readonly lineByteOffsets: readonly number[]; readonly originalBytes: number; readonly contentSha256: string };
  readonly policySha256?: string;
  readonly opaqueId: (identity: string) => string;
}
/** `runKey` keys every excluded row's id and the unrepresentable path digests
 * (syzygy-75ds); it defaults to a fresh key per read and is never serialised. */
export interface RepoCorpusPorts { readonly admission?: CorpusAdmissionPort; readonly readBlobs?: ReadGitBlobs; readonly screen?: CorpusScreen; readonly runKey?: Buffer }

/** Reads exactly the named blobs of one pinned commit, after the admission
 * port says yes. Never the working tree, never another revision, never a
 * provider. Every tree entry is accounted for in `count`. */
export async function readRepoCorpus(repoRoot: string, config: Pick<ReaderConfig, 'repositoryId' | 'revision' | 'include' | 'exclude' | 'oversize'>, ports: RepoCorpusPorts = {}): Promise<RepoCorpus> {
  assertIdentity(config.repositoryId, config.revision);
  const decision = await (ports.admission ?? refusingAdmission).decide({ repositoryId: config.repositoryId, revision: config.revision, include: config.include, exclude: config.exclude });
  if (decision.allowed !== true) throw new CorpusRefusal(decision.allowed === false ? decision.reason : 'admission-undecided');
  if (typeof decision.permissionIdentity !== 'string' || decision.permissionIdentity.length === 0) throw new CorpusRefusal('admission-without-permission-identity');
  const readBlobs = ports.readBlobs ?? readGitBlobsBatch;
  const runKey = ports.runKey ?? newGenerationRunKey();
  if (git(repoRoot, ['cat-file', '-t', config.revision]).toString('utf8').trim() !== 'commit') throw new Error('invalid-pinned-commit');
  const include = config.include.map(globToRegExp), exclude = config.exclude.map(globToRegExp);
  const records = git(repoRoot, ['ls-tree', '-r', '-z', '--full-tree', config.revision]).toString('utf8').split('\0').filter(Boolean).map(row => {
    // `s`: a newline inside a path is part of the path (counted unquotable below), never a malformed record.
    const match = /^(\d{6}) (blob|tree|commit) ([0-9a-f]{40}|[0-9a-f]{64})\t(.+)$/su.exec(row);
    if (!match) throw new Error('invalid-git-tree-record');
    return { mode: match[1]!, type: match[2]!, objectId: match[3]!, path: match[4]! };
  });
  let unquotablePathSecretMatches = 0;
  let notBlob = 0, outsideInclude = 0, excludedByGlob = 0, unquotablePath = 0, binaryOrNonUtf8 = 0, emptyFiles = 0, oversizeFiles = 0, oversizeExcluded = 0, rawBytes = 0;
  let redactedFiles = 0, withheldLines = 0;
  const screened: Record<CorpusScreenReason, number> = { 'denied-path': 0, 'secret-detector-match': 0, 'active-content': 0, 'unknown-extraction-class': 0 };
  const unrepresentable: { readonly pathHmac: string; readonly objectId: string; readonly reason: 'unquotable-path' }[] = [];
  const chosen = records.filter(record => {
    if (record.type !== 'blob' || record.mode === '120000') { notBlob++; return false; }
    if (!include.some(re => re.test(record.path))) { outsideInclude++; return false; }
    if (exclude.some(re => re.test(record.path))) { excludedByGlob++; return false; }
    // A name no source row can carry is counted and listed by digest, never a failed run.
    // Under a screen it is counted only (no digest, no object id), and a detector match in it is counted too.
    if (!representablePath(record.path)) {
      unquotablePath++;
      if (ports.screen === undefined) unrepresentable.push({ pathHmac: keyedDigest(runKey, record.path), objectId: record.objectId, reason: 'unquotable-path' });
      else if (ports.screen.screenPath(record.path) === 'secret-detector-match') unquotablePathSecretMatches++;
      return false;
    }
    return true;
  }).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  const evaluationId = `corpus:${config.repositoryId}@${config.revision}`;
  const sources: GenerationSource[] = [];
  const algorithm = (objectId: string): 'sha1' | 'sha256' => objectId.length === 40 ? 'sha1' : 'sha256';
  const screen = ports.screen;
  const withheld = (record: { readonly path: string; readonly objectId: string }, reason: GenerationExclusionReason): GenerationSource => {
    const sourceId = screen!.opaqueId(generationSourceIdentity({ repositoryId: config.repositoryId, revision: config.revision, path: record.path, objectId: record.objectId }));
    return { repositoryId: config.repositoryId, revision: config.revision, path: `withheld/${sourceId}`, objectId: null, evaluationId, sourceId,
      classificationBasis: 'body', exclusion: { excluded: true, reason }, spans: [] };
  };
  for (let at = 0; at < chosen.length; at += BLOB_BATCH) {
    const batch = chosen.slice(at, at + BLOB_BATCH);
    // A path the screen refuses is withheld unread.
    const byPath = new Map(screen === undefined ? [] : batch.flatMap(record => { const reason = screen.screenPath(record.path); return reason === undefined ? [] : [[record, reason] as const]; }));
    const blobs = readBlobs(repoRoot, batch.filter(record => !byPath.has(record)).map(record => record.objectId));
    for (const record of batch) {
      const pathReason = byPath.get(record);
      if (pathReason !== undefined) { screened[pathReason]++; sources.push(withheld(record, pathReason)); continue; }
      const bytes = blobs.get(record.objectId);
      if (!(bytes instanceof Uint8Array)) throw bytes ?? new Error('corpus-blob-unread');
      rawBytes += bytes.length;
      const sourceId = `s-${sha256(record.path).slice(0, 24)}`;
      const base = { repositoryId: config.repositoryId, revision: config.revision, path: record.path, objectId: record.objectId, evaluationId, sourceId };
      const excludedRow = (reason: GenerationExclusionReason): GenerationSource => screen !== undefined ? withheld(record, reason)
        : ({ ...base, sourceId: excludedSourceId(runKey, record.path), classificationBasis: 'body', exclusion: { excluded: true, reason }, spans: [] });
      let body: string | undefined;
      // ignoreBOM keeps a leading U+FEFF so the text still hashes to its blob.
      try { body = bytes.includes(0) ? undefined : new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); } catch { body = undefined; }
      if (body === undefined) { binaryOrNonUtf8++; sources.push(excludedRow('binary-or-non-utf8')); continue; }
      if (gitBlobObjectId(body, algorithm(record.objectId)) !== record.objectId) throw new Error('corpus-object-mismatch');
      if (body.length === 0) { emptyFiles++; sources.push(excludedRow('empty-file')); continue; }
      const targeted = screen?.screenTargetBody?.(body, record.path);
      const screenedOut = targeted?.kind === 'excluded' ? targeted.outcome : targeted === undefined ? screen?.screenBody(body, record.path) : undefined;
      if (screenedOut !== undefined) { screened[screenedOut]++; sources.push(withheld(record, screenedOut)); continue; }
      if (targeted?.kind === 'redacted') {
        if (screen?.policySha256 === undefined) throw new CorpusRefusal('redacted-body-without-policy-identity');
        redactedFiles++; withheldLines += targeted.withheld.length;
        const projection = verifiedRedactedBody(body, record.objectId, record.path, screen.screenTargetBody!);
        const retained = generationSourcesForRedactedBody({ ...base, projection, policySha256: screen.policySha256, oversize: config.oversize });
        if (retained.some(row => row.segment !== undefined || row.exclusion.excluded)) { oversizeFiles++; if (config.oversize === 'exclude') oversizeExcluded++; }
        sources.push(...retained.map(row => row.exclusion.excluded ? withheld(record, row.exclusion.reason) : row));
        continue;
      }
      if ([...body].length > SOURCE_TEXT_MAX_LENGTH) { oversizeFiles++; if (config.oversize === 'exclude') oversizeExcluded++; }
      sources.push(...generationSourcesForBody({ ...base, body, oversize: config.oversize }).map(row => !row.exclusion.excluded ? row
        : screen !== undefined ? withheld(record, row.exclusion.reason) : { ...row, sourceId: excludedSourceId(runKey, record.path) }));
    }
  }
  validateGenerationSources(sources);
  return { repositoryId: config.repositoryId, revision: config.revision, permissionIdentity: decision.permissionIdentity, sources,
    count: { listed: records.length, notBlob, outsideInclude, excludedByGlob, unquotablePath, selected: chosen.length, binaryOrNonUtf8, emptyFiles, oversizeFiles, oversizeExcluded, sourceRows: sources.length,
      deniedPath: screened['denied-path'], secretDetectorMatches: screened['secret-detector-match'], activeContent: screened['active-content'], indeterminate: screened['unknown-extraction-class'], unquotablePathSecretMatches,
      redactedFiles, withheldLines },
    unrepresentable,
    rawBytes, // The digest binds the population across runs, so a path-bearing excluded row contributes its unkeyed id, never its keyed one.
    // A withheld row (objectId null) carries only the screen's own keyed id, as before.
    identityDigest: sha256(sources.map(source => `${source.path}\0${source.objectId}\0${source.exclusion.excluded && source.objectId !== null ? `s-${sha256(source.path).slice(0, 24)}` : source.sourceId}`).join('\n')) };
}

/** The request the pipeline would run; startedAt is the caller's clock. */
export function buildPipelineRequest(corpus: RepoCorpus, config: ReaderConfig, startedAt: number): PipelineRequest {
  const routes = config.routes ?? Object.fromEntries(STAGES.map(stage => [stage, `provider-${stage}`])) as Record<GenerationStage, string>;
  return { requestId: `repo-${corpus.identityDigest}`, projectId: corpus.repositoryId, snapshotId: corpus.identityDigest, routes, startedAt,
    budget: config.budget, sources: corpus.sources, readerQuestions: config.readerQuestions, requestedAssets: config.requestedAssets };
}
