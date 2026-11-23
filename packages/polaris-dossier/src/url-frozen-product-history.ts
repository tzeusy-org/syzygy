import type { UrlOriginProvenance, UrlSemanticOriginDomain } from './url-origin-provenance.js';
import path from 'node:path';
import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { deepFreeze, isRecord, sha256 } from '@syzygy/support';
import { URL_HELPER_LAUNCH_FILES, isUrlHelperLaunchFile } from './url-launch-history.js';
import { assertProductFileUnchanged, snapshotProductFile, snapshotProductNames, type ProductFileSnapshot, type ProductNameSnapshot } from './url-product-reads.js';

const JSON_LIMITS = { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 } as const;
const canonical = (value: unknown): string => encodeCanonicalJson(value, JSON_LIMITS);
const copy = <T>(value: T): T => deepFreeze(parseBoundedJson(canonical(value), JSON_LIMITS)) as T;
function refuse(): never { throw new Error('url-run-artifacts-unavailable'); }
const hex = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/u.test(v);
const integer = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= 999_999;
const relative = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && Buffer.byteLength(v) <= 4096
  && !/[\\\u0000-\u0020\u007f]/u.test(v) && !v.startsWith('/') && v.split('/').every(p => p !== '' && p !== '.' && p !== '..');
function keys(v: unknown, required: readonly string[]): boolean {
  return isRecord(v) && required.every(k => Object.hasOwn(v, k)) && Object.keys(v).every(k => required.includes(k));
}

export type UrlProductSelector = 'author-checks' | 'author-drafts' | 'inventory-checks' | 'inventory-revisions'
  | 'fidelity-verdicts' | 'design-verdicts' | 'fidelity-checks' | 'design-checks' | 'fidelity-deliveries' | 'design-deliveries';
export interface FrozenProductIdentity {
  readonly path: string; readonly bytes: number; readonly sha256: string; readonly origin: string;
}
export interface UrlFrozenProductHistory {
  readonly format: 'polaris-url-frozen-products/2';
  readonly runId: string; readonly coreSha256: string; readonly declarationSha256: string;
  readonly records: readonly FrozenProductIdentity[];
  readonly provenance: UrlOriginProvenance;
  readonly artifacts: readonly (FrozenProductIdentity & { readonly role: 'author' | 'inventory' | 'fidelity' | 'design' })[];
}
const launchFiles: readonly string[] = Object.values(URL_HELPER_LAUNCH_FILES);
export const selectors: Readonly<Record<UrlProductSelector, { readonly directory: string; readonly pattern: RegExp }>> = Object.freeze({
  'author-checks': { directory: 'checks', pattern: /^rev-(0|[1-9][0-9]*)\.json$/u },
  'author-drafts': { directory: 'drafts', pattern: /^rev-(0|[1-9][0-9]*)\.json$/u },
  'inventory-checks': { directory: 'inventory/checks', pattern: /^rev-(0|[1-9][0-9]*)\.json$/u },
  'inventory-revisions': { directory: 'inventory', pattern: /^rev-(0|[1-9][0-9]*)\.json$/u },
  'fidelity-verdicts': { directory: 'reviews', pattern: /^fidelity-verdict-(0|[1-9][0-9]*)\.json$/u },
  'design-verdicts': { directory: 'reviews', pattern: /^design-verdict-(0|[1-9][0-9]*)\.json$/u },
  'fidelity-checks': { directory: 'reviews/checks', pattern: /^fidelity-verdict-(0|[1-9][0-9]*)\.json$/u },
  'design-checks': { directory: 'reviews/checks', pattern: /^design-verdict-(0|[1-9][0-9]*)\.json$/u },
  'fidelity-deliveries': { directory: 'reviews', pattern: /^fidelity-session-1\.delivery-([1-9][0-9]*)\.json$/u },
  'design-deliveries': { directory: 'reviews', pattern: /^design-session-1\.delivery-([1-9][0-9]*)\.json$/u },
});
export const knownRecord = (file: string): boolean => {
  if ((Object.keys(URL_HELPER_LAUNCH_FILES) as (keyof typeof URL_HELPER_LAUNCH_FILES)[]).some(role => isUrlHelperLaunchFile(role, file))) return true;
  if (['run.json', 'url-declaration.json', 'brief.json', 'brief.md', 'draft.schema.json',
    'inventory/session-1.json', 'reviews/fidelity-session-1.json', 'reviews/design-session-1.json', ...launchFiles].includes(file)) return true;
  const match = /^(?:checks|drafts|inventory|inventory\/checks)\/rev-(0|[1-9][0-9]*)\.json$/u.exec(file)
    ?? /^reviews\/(?:checks\/)?(?:fidelity|design)-verdict-(0|[1-9][0-9]*)\.json$/u.exec(file)
    ?? /^reviews\/(?:fidelity|design)-session-1\.delivery-([1-9][0-9]*)\.json$/u.exec(file);
  return match !== null && integer(Number(match[1]));
};
export const URL_ARTIFACT_LIMITS = Object.freeze({ itemBytes: 1_048_576, readBytes: 8_388_608, registrations: 1024, parents: 128 });
export const FROZEN_DRAFT_PATH = 'drafts/next.json';
export const AUTHOR_FEEDBACK = /^feedback\/(?:fidelity|design)-verdict-(?:0|[1-9][0-9]*)\.json$/u;
export const PACKET_DIRECTORY = /^fidelity-packet-[a-f0-9]{64}$/u;
export const PACKET_PATH = /^reviews\/(fidelity-packet-[a-f0-9]{64})\/(packet\.json|packet\.sha256)$/u;

export const urlRoleArtifactRoot = (run: string, role: 'author' | 'inventory' | 'fidelity' | 'design'): string => role === 'author' ? run
  : `${run}.sessions/${role === 'inventory' ? 'session' : role}-1`;

export function productPopulation(run: string, expected: readonly string[], check: () => void): void {
  const directories = new Map<string, ProductNameSnapshot>();
  const names = (directory: string): readonly string[] => {
    let snapshot = directories.get(directory);
    if (snapshot === undefined) {
      snapshot = snapshotProductNames(run, directory, 4096, check);
      directories.set(directory, snapshot);
    }
    return snapshot.names;
  };
  for (const { directory, pattern } of Object.values(selectors)) {
    const prefix = `${directory}/`, files = names(directory).filter(name => pattern.test(name)).map(name => prefix + name);
    const known = expected.filter(file => file.startsWith(prefix) && pattern.test(file.slice(prefix.length)));
    if (files.length !== known.length || known.some(file => !files.includes(file))) refuse();
  }
  for (const file of [FROZEN_DRAFT_PATH]) {
    if (names(path.dirname(file)).includes(path.basename(file)) !== expected.includes(file)) refuse();
  }
  for (const role of Object.keys(URL_HELPER_LAUNCH_FILES) as (keyof typeof URL_HELPER_LAUNCH_FILES)[]) {
    const directory = path.dirname(URL_HELPER_LAUNCH_FILES[role]);
    const actual = names(directory).map(name => `${directory}/${name}`).filter(file => isUrlHelperLaunchFile(role, file));
    const retained = expected.filter(file => isUrlHelperLaunchFile(role, file));
    if (actual.length !== retained.length || retained.some(file => !actual.includes(file))) refuse();
  }
  const feedback = names('feedback').map(name => `feedback/${name}`).filter(file => AUTHOR_FEEDBACK.test(file));
  const expectedFeedback = expected.filter(file => AUTHOR_FEEDBACK.test(file));
  if (feedback.length !== expectedFeedback.length || expectedFeedback.some(file => !feedback.includes(file))) refuse();
  const packets = new Set(expected.flatMap(file => {
    const match = PACKET_PATH.exec(file); return match === null ? [] : [match[1]!];
  }));
  const observed = names('reviews').filter(name => PACKET_DIRECTORY.test(name));
  if (observed.length !== packets.size || observed.some(name => !packets.has(name))) refuse();
  for (const packet of packets) {
    const directory = `reviews/${packet}`;
    const packetFiles = ['packet.json', 'packet.sha256'];
    const actual = names(directory);
    if (actual.length !== packetFiles.length || packetFiles.some(name => !actual.includes(name) || !expected.includes(`${directory}/${name}`))) refuse();
  }
}


/** Validate a closed topological graph. Every class came from the protected
 * producer ledger; this parser confers no capability or historical authority. */
export function verifyFrozenOriginProvenance(graph: UrlOriginProvenance) {
  if (!keys(graph, ['format', 'nodes']) || graph.format !== 'polaris-url-origin-provenance/2'
    || !Array.isArray(graph.nodes) || graph.nodes.length > URL_ARTIFACT_LIMITS.registrations) refuse();
  const nodes = new Map<string, UrlOriginProvenance['nodes'][number]>();
  const classes = ['code-content', 'code-structure', 'derived-composites', 'evidence-content', 'governance-text', 'project-documentation', 'work-history'];
  const strings = (v: unknown): v is string[] => Array.isArray(v) && v.length <= URL_ARTIFACT_LIMITS.parents
    && v.every(item => typeof item === 'string' && item.length > 0 && item.length <= 256) && new Set(v).size === v.length;
  for (const node of graph.nodes) {
    if (!keys(node, ['key', 'referenceMode', 'metadata', 'parents', 'derivation'])
      || !['declared', 'inherited'].includes(node.referenceMode) || typeof node.key !== 'string' || !/^node-[1-9][0-9]*$/u.test(node.key)
      || nodes.has(node.key) || !strings(node.parents) || node.parents.some((parent: string) => !nodes.has(parent))
      || !keys(node.metadata, ['id', 'digest', 'bytes', 'classes', 'originIds']) || typeof node.metadata.id !== 'string'
      || !/^origin:[a-z0-9][a-z0-9._-]{0,127}$/u.test(node.metadata.id) || !hex(node.metadata.digest)
      || !Number.isSafeInteger(node.metadata.bytes) || node.metadata.bytes < 0 || node.metadata.bytes > URL_ARTIFACT_LIMITS.itemBytes
      || !strings(node.metadata.classes) || node.metadata.classes.length < 1 || node.metadata.classes.some((value: string) => !classes.includes(value))
      || !strings(node.metadata.originIds) || !isRecord(node.derivation)) refuse();
    const d = node.derivation;
    if (d.kind === 'fixed') { if (!keys(d, ['kind', 'id']) || d.id !== node.metadata.id || node.parents.length) refuse(); }
    else if (d.kind === 'source-span' || d.kind === 'source-whole') {
      if (!keys(d, d.kind === 'source-span' ? ['kind', 'path', 'objectId', 'offset', 'limit'] : ['kind', 'path', 'objectId'])
        || !relative(d.path) || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(d.objectId) || node.parents.length
        || (d.kind === 'source-span' && (!integer(d.offset) || !integer(d.limit) || d.limit < 1 || d.limit > 2000))) refuse();
    } else if (d.kind === 'source-tree') {
      if (!keys(d, ['kind', 'offset', 'limit']) || !integer(d.offset) || !integer(d.limit) || d.limit < 1 || d.limit > 2000 || node.parents.length) refuse();
    } else if (d.kind === 'source-manifest-remainder') {
      if (!keys(d, ['kind']) || node.parents.length || node.metadata.originIds.length || node.referenceMode !== 'declared'
        || canonical(node.metadata.classes) !== canonical(['code-structure']) || !/^origin:manifest-remainder-[a-f0-9]{32}$/u.test(node.metadata.id)) refuse();
    } else if (d.kind === 'report') {
      if (!keys(d, ['kind', 'report', 'role']) || !['draft', 'inventory', 'fidelity-verdict', 'design-verdict', 'check'].includes(d.report)
        || !['author', 'inventory', 'fidelity', 'design'].includes(d.role) || node.parents.length < 1) refuse();
    } else if (['renderer', 'authenticated-provider-output', 'composition', 'source-reply'].includes(d.kind)) {
      if (!keys(d, ['kind']) || (['renderer', 'authenticated-provider-output'].includes(d.kind) ? node.parents.length !== 0 : node.parents.length < 1)) refuse();
    } else refuse();
    if (d.kind === 'composition' || d.kind === 'report' || d.kind === 'source-reply') {
      const inherited = [...new Set(node.parents.flatMap((parent: string) => nodes.get(parent)!.metadata.classes))];
      if (d.kind !== 'source-reply') inherited.push(d.kind === 'report' && d.report !== 'draft' ? 'evidence-content' : 'derived-composites');
      if (canonical([...new Set(inherited)].sort()) !== canonical(node.metadata.classes)) refuse();
      const references = [...new Set(node.parents.flatMap((parent: string) => {
        const prior = nodes.get(parent)!;
        return prior.referenceMode === 'declared' ? [prior.metadata.id] : prior.metadata.originIds;
      }))].sort();
      if (canonical(references) !== canonical(node.metadata.originIds)) refuse();
    }
    nodes.set(node.key, node);
  }
  return nodes;
}

/** Metadata identity only. Each ordered edge retains its complete semantic
 * parent. Allocation IDs/reference modes disappear only after exact inherited
 * origin references have been checked against the closed producer graph. */
export function fingerprintUrlOriginProvenance(
  captured: { readonly graph: UrlOriginProvenance; readonly keys: readonly string[] }, domain: UrlSemanticOriginDomain,
): string {
  const nodes = verifyFrozenOriginProvenance(captured.graph), hashes = new Map<string, string>();
  if (!keys(domain, ['runId', 'sourceBindingSha256', 'sourcePin', 'basePolicySha256', 'originPolicySha256'])
    || typeof domain.runId !== 'string' || domain.runId.length < 1 || domain.runId.length > 256
    || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(domain.sourcePin)
    || ![domain.sourceBindingSha256, domain.basePolicySha256, domain.originPolicySha256].every(hex)
    || !Array.isArray(captured.keys) || captured.keys.length > URL_ARTIFACT_LIMITS.parents) refuse();
  for (const [key, node] of nodes) {
    const derived = ['composition', 'report', 'source-reply'].includes(node.derivation.kind);
    const parents = node.parents.map(parent => hashes.get(parent)!);
    hashes.set(key, sha256(canonical({ digest: node.metadata.digest, bytes: node.metadata.bytes, classes: node.metadata.classes,
      derivation: node.derivation, parents,
      originReferences: derived ? { kind: 'checked-parent-references', parents } : { kind: 'leaf-references', ids: node.metadata.originIds } })));
  }
  const roots = captured.keys.map(key => { const value = hashes.get(key); if (!value) refuse(); return value; });
  return sha256(canonical({ format: 'polaris-url-semantic-origin/1', domain, roots }));
}

/** Recheck an independent snapshot of the frozen run files, including the
 * complete stage filename populations. The caller supplies the protected
 * expectation; a digest learned from the file under test is insufficient. */
export function verifyUrlFrozenProductHistory(run: string, given: UrlFrozenProductHistory, current: () => boolean):
  { readonly kind: 'verified-frozen-products'; readonly authorization: 'none'; readonly records: number } | null {
  try {
    const deadline = performance.now() + 5000;
    const check = (): void => { if (performance.now() >= deadline) refuse(); };
    if (current() !== true) refuse();
    const expected = copy(given);
    if (!keys(expected, ['format', 'runId', 'coreSha256', 'declarationSha256', 'records', 'provenance', 'artifacts'])
      || expected.format !== 'polaris-url-frozen-products/2' || expected.runId !== path.basename(run)
      || !hex(expected.coreSha256) || !hex(expected.declarationSha256) || !Array.isArray(expected.records)
      || expected.records.length > URL_ARTIFACT_LIMITS.registrations) refuse();
    if (!Array.isArray(expected.artifacts) || expected.artifacts.length > URL_ARTIFACT_LIMITS.registrations) refuse();
    const nodes = verifyFrozenOriginProvenance(expected.provenance);
    const paths: string[] = []; let totalBytes = 0;
    for (const record of expected.records) {
      if (!keys(record, ['path', 'bytes', 'sha256', 'origin']) || !relative(record.path)
        || (record.path !== FROZEN_DRAFT_PATH && !knownRecord(record.path) && !PACKET_PATH.test(record.path) && !AUTHOR_FEEDBACK.test(record.path)) || !hex(record.sha256)
        || typeof record.bytes !== 'number' || !Number.isSafeInteger(record.bytes) || record.bytes < 1 || record.bytes > URL_ARTIFACT_LIMITS.itemBytes
        || (paths.length > 0 && paths.at(-1)! >= record.path)) refuse();
      const origin = nodes.get(record.origin);
      if (!origin || origin.metadata.digest !== record.sha256 || origin.metadata.bytes !== record.bytes) refuse();
      totalBytes += record.bytes;
      if (totalBytes > URL_ARTIFACT_LIMITS.readBytes) refuse();
      paths.push(record.path);
    }
    if (!['run.json', 'url-declaration.json', 'brief.json', 'brief.md', 'draft.schema.json', 'inventory/session-1.json',
      'reviews/fidelity-session-1.json', 'reviews/design-session-1.json'].every(file => paths.includes(file))
      || expected.records.find(record => record.path === 'run.json')?.sha256 !== expected.coreSha256
      || expected.records.find(record => record.path === 'url-declaration.json')?.sha256 !== expected.declarationSha256) refuse();
    productPopulation(run, paths, check);
    const snapshots = new Map<string, ProductFileSnapshot>();
    for (const expectedFile of expected.records) {
      const observed = snapshotProductFile(run, expectedFile.path, expectedFile.bytes, check);
      if (observed.bytes === null || observed.bytes.length !== expectedFile.bytes || sha256(observed.bytes) !== expectedFile.sha256) refuse();
      snapshots.set(expectedFile.path, observed);
    }
    const artifactSnapshots: { readonly root: string; readonly path: string; readonly snapshot: ProductFileSnapshot }[] = [];
    const bindings = new Set<string>();
    for (const artifact of expected.artifacts) {
      if (!keys(artifact, ['role', 'path', 'bytes', 'sha256', 'origin']) || !['author', 'inventory', 'fidelity', 'design'].includes(artifact.role)
        || !relative(artifact.path) || !hex(artifact.sha256) || !Number.isSafeInteger(artifact.bytes) || artifact.bytes < 1
        || artifact.bytes > URL_ARTIFACT_LIMITS.itemBytes || bindings.has(`${artifact.role}:${artifact.path}`)) refuse();
      const node = nodes.get(artifact.origin);
      if (!node || node.metadata.digest !== artifact.sha256 || node.metadata.bytes !== artifact.bytes) refuse();
      bindings.add(`${artifact.role}:${artifact.path}`);
      totalBytes += artifact.bytes; if (totalBytes > URL_ARTIFACT_LIMITS.readBytes) refuse();
      const root = urlRoleArtifactRoot(run, artifact.role), observed = snapshotProductFile(root, artifact.path, artifact.bytes, check);
      if (observed.bytes === null || observed.bytes.length !== artifact.bytes || sha256(observed.bytes) !== artifact.sha256) refuse();
      artifactSnapshots.push({ root, path: artifact.path, snapshot: observed });
    }
    productPopulation(run, paths, check);
    for (const artifact of artifactSnapshots) assertProductFileUnchanged(artifact.root, artifact.path, artifact.snapshot, check);
    for (const [file, observed] of snapshots) assertProductFileUnchanged(run, file, observed, check);
    if (current() !== true) refuse();
    check();
    return Object.freeze({ kind: 'verified-frozen-products', authorization: 'none', records: paths.length });
  } catch { return null; }
}

