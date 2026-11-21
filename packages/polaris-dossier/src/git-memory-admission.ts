import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { sha256 } from '@syzygy/support';
import { validateGitMemoryClosure, type DecodedGitMemoryPack, type GitMemoryClosure, type GitMemoryPackLimits } from './git-memory-pack.js';
import type { DossierScreen, ScreenExclusion } from './screen.js';
import type { SessionContentClass } from './session-egress-policy.js';

export interface GitAcquisitionPolicy {
  readonly id: 'POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1';
  readonly version: '1.0.0'; readonly sha256: string;
  /** The observing project's exact committed source policy; never a policy read
   * from the acquired repository. Caller verifies current committed bindings. */
  readonly screen: DossierScreen;
}
export interface GitAdmissionReceipt {
  readonly commit: string; readonly objectFormat: 'sha1' | 'sha256'; readonly objectCount: number;
  readonly retainedBytes: number; readonly policySha256: string; readonly originPolicySha256: string;
  readonly classes: readonly SessionContentClass[];
  readonly identitiesSha256: string;
}
interface Admitted { readonly closure: GitMemoryClosure; readonly receipt: GitAdmissionReceipt }
const admitted = new WeakMap<GitAdmissionReceipt, Admitted>();
const BOUNDS = { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 };
const canonical = (value: unknown): string => encodeCanonicalJson(value, BOUNDS);
const supported = new Set<SessionContentClass>(['code-content', 'project-documentation', 'governance-text']);
export interface GitAdmissionFailure { readonly ok: false; readonly code: 'required-acquisition-content-excluded' }
/** Protected local evidence only. Hashes of private excluded content/locations
 * must not enter public/role diagnostics. No raw path, Git OID or size is kept. */
export interface GitAcquisitionExclusion {
  readonly species: 'commit' | 'tree-alias' | 'blob-alias';
  readonly locationSha256: string; readonly contentSha256: string;
  readonly policySha256: string; readonly originPolicySha256: string;
  readonly outcome: ScreenExclusion | 'redacted-span' | 'screening-failed';
}
const exclusions = new WeakMap<GitAdmissionFailure, readonly GitAcquisitionExclusion[]>();
export const gitMemoryAdmissionExclusions = (failure: GitAdmissionFailure): readonly GitAcquisitionExclusion[] | null =>
  exclusions.get(failure) ?? null;

/** Structural validity is not storage authority. Validate the whole original
 * decoded pack again, then screen every exact retained object and every path
 * alias before issuing a receipt usable by the trusted loose-object writer.
 * No raw pack, rejected body, path, object ID or size is returned on refusal.
 */
export function admitGitMemoryClosure(input: {
  readonly pack: DecodedGitMemoryPack; readonly selectedCommit: string; readonly shallow: readonly string[];
  readonly policy: GitAcquisitionPolicy; readonly limits?: Partial<GitMemoryPackLimits>;
}): { readonly ok: true; readonly receipt: GitAdmissionReceipt } | GitAdmissionFailure {
  const reached: GitAcquisitionExclusion[] = [];
  let active: Omit<GitAcquisitionExclusion, 'outcome'> | null = null;
  const failure = (): GitAdmissionFailure => {
    const result: GitAdmissionFailure = Object.freeze({ ok: false, code: 'required-acquisition-content-excluded' });
    exclusions.set(result, Object.freeze([...reached])); return result;
  };
  const exclude = (species: GitAcquisitionExclusion['species'], location: string, body: Uint8Array,
    outcome: GitAcquisitionExclusion['outcome']): GitAdmissionFailure => {
    reached.push(Object.freeze({ species, locationSha256: sha256(location), contentSha256: sha256(body),
      policySha256: input.policy.screen.policySha256, originPolicySha256: input.policy.sha256, outcome }));
    return failure();
  };
  try {
    const { policy } = input;
    if (policy.id !== 'POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1' || policy.version !== '1.0.0'
      || !/^[a-f0-9]{64}$/u.test(policy.sha256) || !/^[a-f0-9]{64}$/u.test(policy.screen.policySha256)) return failure();
    const checked = validateGitMemoryClosure({ pack: input.pack, selectedCommit: input.selectedCommit, shallow: input.shallow,
      ...(input.limits === undefined ? {} : { limits: input.limits }) });
    if (!checked.ok) return failure();
    const closure = checked.closure;
    const objects = new Map(closure.objects.map(object => [object.oid, object]));
    const processing = (species: GitAcquisitionExclusion['species'], location: string, body: Uint8Array): void => {
      active = { species, locationSha256: sha256(location), contentSha256: sha256(body),
        policySha256: policy.screen.policySha256, originPolicySha256: policy.sha256 };
    };
    let metadataExclusion: ScreenExclusion = 'secret-detector-match';
    const metadata = (fields: readonly string[]): boolean => {
      // Screen actual decoded fields before adding structural/JSON prefixes.
      // Prefixes can hide a detector anchored at a field's first character.
      for (const field of [...fields, fields.join('')]) {
        const reason = policy.screen.screenBody(field);
        if (reason !== undefined) { metadataExclusion = reason; return false; }
      }
      return true;
    };
    const text = (bytes: Uint8Array): string => {
      const value = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
      if (value.includes('\0')) throw new Error('excluded');
      return value;
    };
    const classes = new Set<SessionContentClass>(['code-structure', 'work-history']);
    const identities: unknown[] = [];
    // Commit grammar, parent OIDs, identities, timestamps and exact UTF-8 message
    // were structurally verified by the decoder; no signature/opaque exception.
    const commit = objects.get(closure.commit);
    if (!commit || commit.type !== 'commit') return failure();
    processing('commit', 'selected-commit', commit.body);
    const commitText = text(commit.body), boundary = commitText.indexOf('\n\n');
    const headers = commitText.slice(0, boundary).split('\n');
    if (!metadata([commitText, commitText.slice(boundary + 2), ...headers.map(line => line.replace(/^(?:author|committer) /u, ''))])) {
      return exclude('commit', 'selected-commit', commit.body, metadataExclusion);
    }
    identities.push(['commit', commit.oid, sha256(commit.body), ['work-history']]);
    // Tree encoding contains binary OIDs and NUL delimiters. It is the exact
    // verified structural grammar, not an arbitrary binary-body exemption.
    // Screen its complete decoded text fields and every alias before storage.
    for (const tree of closure.trees) {
      const treeObject = objects.get(tree.oid);
      if (!treeObject) return failure();
      processing('tree-alias', tree.path, treeObject.body);
      if (!metadata([tree.path, ...tree.path.split('/'), tree.oid, canonical({ path: tree.path, oid: tree.oid })])) {
        const object = objects.get(tree.oid);
        return object ? exclude('tree-alias', tree.path, object.body, metadataExclusion) : failure();
      }
      identities.push(['tree-alias', tree.path, tree.oid, ['code-structure']]);
    }
    for (const file of closure.paths) {
      const blob = objects.get(file.oid);
      if (!blob || blob.type !== 'blob') return failure();
      processing('blob-alias', file.path, blob.body);
      if (!metadata([file.path, ...file.path.split('/'), file.mode, file.oid, canonical(file)])) {
        return exclude('blob-alias', file.path, blob.body, metadataExclusion);
      }
      const pathExclusion = policy.screen.screenPath(file.path);
      if (pathExclusion !== undefined) return exclude('blob-alias', file.path, blob.body, pathExclusion);
      const contentClass = policy.screen.contentClass(file.path);
      if (contentClass === undefined || !supported.has(contentClass)) return exclude('blob-alias', file.path, blob.body, 'unknown-extraction-class');
      let whole: string;
      try { whole = text(blob.body); } catch { return exclude('blob-alias', file.path, blob.body, 'not-utf8-text'); }
      const screened = policy.screen.screenTargetBody(whole, file.path);
      // Redaction would change a blob while retaining its old Git identity.
      // Owned strict acquisition must refuse, including the public branch.
      if (screened.kind !== 'admitted') return exclude('blob-alias', file.path, blob.body, screened.kind === 'redacted' ? 'redacted-span' : screened.outcome);
      if (policy.screen.screenSecrets(whole) !== undefined) return exclude('blob-alias', file.path, blob.body, 'secret-detector-match');
      classes.add(contentClass);
      identities.push(['blob-alias', file.path, file.mode, file.oid, sha256(blob.body), [contentClass, 'code-structure']]);
    }
    active = null;
    // Every object is retained exactly; the structural validator rejects extras
    // and proves every tree/blob occurs in the path/alias population above.
    for (const object of closure.objects) if (object.type === 'tree') identities.push(['tree', object.oid, sha256(object.body), ['code-structure']]);
    const retainedBytes = closure.objects.reduce((sum, object) => sum + object.size, 0);
    if (!Number.isSafeInteger(retainedBytes)) return failure();
    const receipt: GitAdmissionReceipt = Object.freeze({ commit: closure.commit, objectFormat: input.pack.objectFormat,
      objectCount: closure.objects.length, retainedBytes, policySha256: policy.screen.policySha256, originPolicySha256: policy.sha256,
      classes: Object.freeze([...classes].sort()), identitiesSha256: sha256(canonical(identities)) });
    admitted.set(receipt, { closure, receipt });
    return { ok: true, receipt };
  } catch {
    // The processing callback updates this slot; TS does not follow that write
    // into the catch edge, so retain its declared union explicitly here.
    const interrupted = active as Omit<GitAcquisitionExclusion, 'outcome'> | null;
    if (interrupted !== null) reached.push(Object.freeze({ ...interrupted, outcome: 'screening-failed' }));
    return failure();
  }
}

/** Host-only capability. Serialized/forged receipts never authorize a write.
 * The returned objects still provide defensive body copies. */
export function admittedGitMemoryObjects(receipt: GitAdmissionReceipt): GitMemoryClosure | null {
  return admitted.get(receipt)?.closure ?? null;
}
