// Public-source screening for the any-repo reader (`syzygy-vjqd`).
//
// The policy's `publicSourceScope` (package
// `contracts/candidates/public-source-screening-scope/`) says every base
// detector and the base active-content rule apply unchanged to every admitted
// public body, the base denied-path rules apply to every path, and a blob is
// `project-documentation` when exactly one of that rule's path rules matches
// it (version 2; classified only while the RFC5-14 class amendment act is in
// force and unwithdrawn at the port's clock, the scope's `prerequisite`), else `code-content` only when its
// final path segment ends with one of the scope's `sourceExtensions`
// (case-sensitive); every other blob is indeterminate and excluded unread.
// The class decision is `@syzygy/polaris-generation-core`'s
// `publicSourceContentClass`, shared with the dossier's screen. This module
// loads that policy by the owner act the screening-scope act chain puts in
// force (`readPolicyActChain`, the dossier's own strict reader: version 1, 2 or
// 3, each recorded by its dedicated recorder) — never through the Butlers
// governance-inputs pin — and refuses the run when no act is in force, the
// chain refuses, or the act names a digest the policy bytes do not hash to.
// Until 2026-10-08 the port read only the version-1 record, so it refused
// from the version-2 act on (`syzygy-p83h`).
//
// The screen reuses the PWB modules unforked: `compileDetectors` /
// `detectSecrets` over the policy's own detector strings (run over every path
// as well as every body), `scanActiveContent`, and `deniedPathReason` over the
// policy's own path lists. Under version 3, a code-content body whose
// extension the scope's `codeContentExemption` lists skips the active-content
// scan (`codeContentExempt`, shared with the dossier's screen); every detector
// still runs over it. Under version 4, `screenTargetBody` applies the scope's
// `secretRedaction` (`redactBody`, shared with the dossier's screen): a
// project-documentation body whose detector matches are all line-redactable
// is retained as `redacted-span` with its matched and guard lines withheld;
// `screenBody` stays whole-text, and this reader's corpus still excludes such
// a body whole (it is not yet taught to carry withheld lines). Under version 5
// (variant `bcd`), the scope's `scopeDetectors` run beside the policy's
// detectors on every path and body; root SECURITY and MANIFESTO names are
// `governance-text` (data, never policy, scanned as before, excluded whole on
// any detector match); the owner's placements classify named paths as
// project-documentation for one repository at listed commits only, so the
// screen is loaded for the corpus's repository and revision (one loaded
// without them places nothing); and a project-documentation body skips the
// active-content scan given its path (`projectDocumentationExemption`).
// Each exemption holds at a page only while the page meets
// the scope's `renderCondition`: this app's page sinks are the dossier
// renderer and the draft preview, which write every body byte through
// `escape` under `DRAFT_PREVIEW_CSP_META`, and their tests fail if either
// stops (`page-sink.test.ts`). Every excluded row carries a per-run HMAC id and no
// path, object id or body (the scope's `targetMetadataRule`), so nothing about
// it leaves the process.
//
// Policy residuals, not repairs: the detectors match literal forms only, so a
// secret encoded (base64, hex) or split across lines passes them; and the
// project-documentation rule folds ASCII A-Z only and splits words only at
// its `docTokenSeparators`, as its text says, so a Unicode look-alike of a
// withheld word (`docs/ｄesign.md`), a word joined by a tab
// (`docs/a\tb.md`) or one that runs on into other characters
// (`docs/rfc0001.md`) is admitted as project-documentation, its body still
// screened. Not implemented here: the scope's run-profile and
// instruction-text rules. Admitting a body is not consent to send it:
// `contentClass` names its class for whoever gates egress by consent; this
// reader has no production caller that hands its corpus on.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { POLICY_ACT_FORMS, readClassActState, readPolicyActChain } from '@syzygy/polaris-generation-consent';
import { codeContentExempt, compileEveryOffsetMatcher, documentationExempt, publicSourceContentClass, readCodeContentExemption, readGovernanceTextRule, readProjectDocumentationExemption, readProjectDocumentationRule, readScopeDetectors, readSecretRedaction, redactBody, type PipelinePorts, type PlacementSubject, type PublicSourceContentClass, type RedactionDetector } from '@syzygy/polaris-generation-core';
import { compileDetectors, deniedPathReason, detectSecrets, scanActiveContent, type DeniedPathRules, type SecretDetector } from '@syzygy/three-surface-poc-core';
import { sha256 } from '@syzygy/support';

import { excludedSourceId, newGenerationRunKey } from './run-key.js';
import { CorpusRefusal, readRepoCorpus, type CorpusScreen, type ReaderConfig, type RepoCorpus, type RepoCorpusPorts } from './repo-corpus.js';

const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
export const PUBLIC_SOURCE_POLICY_PATH = '.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json';
/** The version-1 act's record, the first of the chain's closed list of recorder forms (`POLICY_ACT_FORMS`). */
export const PUBLIC_SOURCE_ACT_RECORD_PATH = `.syzygy/governance/decisions/${POLICY_ACT_FORMS[0]!.file}`;
const ACT_IDENTITY = /^Act identity: `([^`\n]+)`$/gmu;
const ACT_DATE = /^Date: (\d{4}-\d{2}-\d{2})$/gmu;
const EXACT_DIGEST = /^Exact digest \(SHA-256\): `([0-9a-f]{64})`$/gmu;

/** The inputs the screen is loaded from; absent bytes are `undefined`. `actRecord` is the record of the act the chain puts in force,
 * and `why`, when it is absent, says why none is. `classActInForce` only decides whether the project-documentation class is classified:
 * true only when the RFC5-14 class amendment act is in force at the port's clock; leaving it out leaves that class's paths indeterminate. */
export interface PublicSourcePolicyActPort {
  readonly read: () => Promise<{ readonly actRecord: string | undefined; readonly why?: string; readonly policy: Uint8Array | undefined; readonly classActInForce?: boolean }>;
}

const readOrAbsent = async (path: string): Promise<Buffer | undefined> => {
  try { return await readFile(path); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
};

/** Reads the in-force act's record and the policy from a Syzygy checkout (default: this one) at `now()`, both with the dossier's own
 * strict readers: `readPolicyActChain` (every decisions file swept, the chain's order and supersessions checked, the act in force at
 * `now()` binding the policy's current bytes) and `readClassActState` (the RFC5-14 act recorded in the recorder's form, binding the
 * installed RFC-0005 module's bytes, in effect by `now()` and named by no other decisions file). */
export function checkoutPolicyActPort(syzygyRoot: string = REPO_ROOT, now: () => number = Date.now): PublicSourcePolicyActPort {
  return {
    read: async () => {
      const at = now();
      const chain = await readPolicyActChain({ root: syzygyRoot, now: at });
      const policy = await readOrAbsent(join(syzygyRoot, PUBLIC_SOURCE_POLICY_PATH));
      const classAct = await readClassActState({ root: syzygyRoot, now: at });
      return {
        ...(chain.state === 'ok' ? { actRecord: chain.final.text } : { actRecord: undefined, why: chain.why }),
        policy: policy === undefined ? undefined : new Uint8Array(policy), classActInForce: classAct.state === 'ok',
      };
    },
  };
}

export interface PublicSourceScreen extends CorpusScreen {
  readonly policyId: string;
  readonly policyVersion: string;
  readonly policySha256: string;
  /** Whether the policy's project-documentation class is classified: it has the rule and the RFC5-14 class act is in force. */
  readonly projectDocumentation: boolean;
  /** Whether the policy declares the version-3 code-content exemption. */
  readonly codeContentExemption: boolean;
  /** Whether the policy declares the version-4 secret redaction. */
  readonly secretRedaction: boolean;
  /** Whether the policy classifies the version-5 governance-text class. */
  readonly governanceText: boolean;
  /** Whether the policy declares the version-5 project-documentation exemption from the active-content scan. */
  readonly documentationExemption: boolean;
  /** How many detectors the scope adds to the policy's own (version 5's `scopeDetectors`; 0 before it). */
  readonly scopeDetectors: number;
  /** A target body screened under the policy's secret redaction (version 4) where it applies; see the dossier's `screenTargetBody`. */
  readonly screenTargetBody: (body: string, path: string) => PublicSourceTargetBody;
  /** The content class `screenPath` admits a path under, or undefined when it excludes the path. Whoever hands an admitted body to an
   * agent or a provider gates it by the classes the consent for that pair lists; screening is not that consent. */
  readonly contentClass: (path: string) => PublicSourceContentClass | undefined;
}

/** The dossier screen's `TargetBodyScreen`, unforked in shape. */
export type PublicSourceTargetBody =
  | { readonly kind: 'admitted' }
  | { readonly kind: 'redacted'; readonly retained: string; readonly retainedLines: readonly string[]; readonly lineByteOffsets: readonly number[];
      readonly originalBytes: number; readonly contentSha256: string; readonly withheld: readonly number[]; readonly detectorIds: readonly string[] }
  | { readonly kind: 'excluded'; readonly outcome: 'secret-detector-match' | 'active-content' };

function refuse(why: string): never { throw new CorpusRefusal(`public-source-policy: ${why}`); }
const stringList = (value: unknown): value is readonly string[] => Array.isArray(value) && value.every(item => typeof item === 'string' && item.length > 0);

/** Verifies the act record against the policy bytes and builds the screen. Any gap refuses. `subject` is the repository read
 * (its consent identity, `repository:<id>`, which the reader config already carries) and the admitted commit it is read at, which the
 * version-5 owner placements compare; null places nothing. */
export async function loadPublicSourceScreen(port: PublicSourcePolicyActPort = checkoutPolicyActPort(), runKey: Uint8Array = newGenerationRunKey(),
  subject: PlacementSubject | null = null): Promise<PublicSourceScreen> {
  if (runKey.byteLength < 32) refuse('run key shorter than 32 bytes');
  const { actRecord, why, policy, classActInForce } = await port.read();
  if (actRecord === undefined) refuse(`no screening-scope policy act is in force${why === undefined ? '' : ` (${why})`}`);
  if (policy === undefined) refuse(`no policy at ${PUBLIC_SOURCE_POLICY_PATH}`);
  const act = actRecord!;
  const identities = [...act.matchAll(ACT_IDENTITY)].map(match => match[1]!), dates = [...act.matchAll(ACT_DATE)].map(match => match[1]!);
  const form = POLICY_ACT_FORMS.find(candidate => act.startsWith(`${candidate.title}\n`));
  if (form === undefined || identities.length !== 1 || dates.length !== 1 || identities[0] !== form.identity(dates[0]!)
    || !act.includes('\nAct type: `approve-policy`\n') || !act.includes(`\nArtifact identity: \`${PUBLIC_SOURCE_POLICY_PATH}\`\n`)
    || !act.includes('\nProject identity: `project:syzygy`\n')) refuse('act record is not a public-source scope approve-policy act');
  const digests = [...act.matchAll(EXACT_DIGEST)].map(match => match[1]!);
  if (digests.length !== 1) refuse('act record does not name exactly one exact digest');
  const policySha256 = sha256(policy!);
  if (policySha256 !== digests[0]) refuse('policy bytes do not hash to the act argument');
  let doc: Record<string, unknown>;
  try { doc = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(policy!)) as Record<string, unknown>; } catch { return refuse('policy is not UTF-8 JSON'); }
  const scope = doc.publicSourceScope, admission = doc.sourceAdmission as Record<string, unknown> | undefined;
  if (scope === null || typeof scope !== 'object' || Array.isArray(scope)) refuse('policy carries no publicSourceScope');
  if (typeof doc.policyId !== 'string' || typeof doc.policyVersion !== 'string') refuse('policy identity unreadable');
  if (admission === null || typeof admission !== 'object' || !stringList(admission.deniedPathBasenames) || !stringList(admission.deniedPathPrefixes)
    || !stringList(admission.deniedPathSuffixes)) refuse('policy denied-path rules unreadable');
  const classification = (scope as Record<string, unknown>).contentClassification as Record<string, unknown> | undefined;
  const codeContent = Array.isArray(classification?.rules) ? classification.rules.filter((rule: unknown) => (rule as Record<string, unknown> | null)?.class === 'code-content') : [];
  const extensions = (codeContent[0] as Record<string, unknown> | undefined)?.sourceExtensions;
  if (codeContent.length !== 1 || !stringList(extensions) || extensions.length === 0 || extensions.some(extension => !/^\.[^/\s]+$/u.test(extension) || extension.includes('..'))) refuse('policy sourceExtensions unreadable');
  const sourceExtensions = extensions as readonly string[];
  const documentationRead = readProjectDocumentationRule(classification!.rules as readonly unknown[], sourceExtensions);
  if (!documentationRead.ok) refuse(`policy ${documentationRead.why.replace(/^its /u, '')}`);
  // The scope's prerequisite: the class is classified only while the in-force RFC-0005 vocabulary lists it.
  const documentation = classActInForce === true ? documentationRead.rule : null;
  const governanceRead = readGovernanceTextRule(classification);
  if (!governanceRead.ok) refuse(`policy ${governanceRead.why.replace(/^its /u, '')}`);
  const governanceTextPaths = governanceRead.ok ? governanceRead.paths : null;
  const exemptionRead = readCodeContentExemption(scope, sourceExtensions);
  if (!exemptionRead.ok) refuse(`policy ${exemptionRead.why.replace(/^its /u, '')}`);
  const exemption = exemptionRead.ok ? exemptionRead.exemption : null;
  const documentationExemptionRead = readProjectDocumentationExemption(scope);
  if (!documentationExemptionRead.ok) refuse(`policy ${documentationExemptionRead.why.replace(/^its /u, '')}`);
  const documentationExemption = documentationExemptionRead.ok && documentationExemptionRead.declared;
  const policyDetectorIds = Array.isArray(doc.detectors) ? doc.detectors.flatMap((d: unknown) => (d !== null && typeof d === 'object' && typeof (d as Record<string, unknown>).id === 'string' ? [(d as Record<string, unknown>).id as string] : [])) : [];
  const scopeRead = readScopeDetectors(scope, policyDetectorIds);
  if (!scopeRead.ok) refuse(`policy ${scopeRead.why.replace(/^its /u, '')}`);
  const scopeDetectors = scopeRead.ok ? scopeRead.detectors : [];
  // The scope's detectors join the policy's for this scope only (version 5); before version 5 the list is the policy's alone.
  const allDetectors = Array.isArray(doc.detectors) ? [...doc.detectors as unknown[], ...scopeDetectors] : doc.detectors;
  const detectorIds = [...policyDetectorIds, ...scopeDetectors.map(detector => detector.id)];
  const redactionRead = readSecretRedaction(scope, detectorIds);
  if (!redactionRead.ok) refuse(`policy ${redactionRead.why.replace(/^its /u, '')}`);
  const redaction = redactionRead.ok ? redactionRead.redaction : null;
  const rules: DeniedPathRules = { basenames: admission!.deniedPathBasenames as string[], prefixes: admission!.deniedPathPrefixes as string[], suffixes: admission!.deniedPathSuffixes as string[] };
  let detectors: ReturnType<typeof compileDetectors>;
  try { detectors = compileDetectors({ detectors: allDetectors as readonly SecretDetector[] }); } catch (error) { return refuse(`detectors: ${error instanceof Error ? error.message : 'invalid'}`); }
  const everyOffset = compileEveryOffsetMatcher(allDetectors as readonly RedactionDetector[]);
  const context = { governanceTextPaths, subject };
  const classOf = (path: string): PublicSourceContentClass | undefined => publicSourceContentClass(path, sourceExtensions, documentation, context);
  const key = Buffer.from(runKey);
  // Unread: denied path, then a detector match anywhere in the path, then a path in neither project-documentation nor code-content.
  const screenPath = (path: string) => deniedPathReason(path, rules) !== undefined ? 'denied-path' as const
    : detectSecrets(detectors, path) !== undefined ? 'secret-detector-match' as const
      : classOf(path) !== undefined ? undefined : 'unknown-extraction-class' as const;
  const contentClass = (path: string): PublicSourceContentClass | undefined => screenPath(path) === undefined ? classOf(path) : undefined;
  const exempt = (path: string | undefined): boolean => {
    if (path === undefined) return false;
    const found = contentClass(path);
    return codeContentExempt(path, found, exemption) || documentationExempt(found, documentationExemption);
  };
  const active = (body: string, path: string | undefined): boolean => !exempt(path) && scanActiveContent(body).length > 0;
  const screenTargetBody = (body: string, path: string): PublicSourceTargetBody => {
    const redacted = redactBody(body, contentClass(path), everyOffset, redaction);
    if (redacted.kind === 'excluded') return { kind: 'excluded', outcome: 'secret-detector-match' };
    if (active(body, path)) return { kind: 'excluded', outcome: 'active-content' };
    return redacted.kind === 'clean' ? { kind: 'admitted' } : redacted;
  };
  return {
    policyId: doc.policyId as string, policyVersion: doc.policyVersion as string, policySha256, projectDocumentation: documentation !== null,
    codeContentExemption: exemption !== null,
    secretRedaction: redaction !== null,
    governanceText: governanceTextPaths !== null,
    documentationExemption,
    scopeDetectors: scopeDetectors.length,
    screenTargetBody,
    screenPath,
    contentClass,
    // Detectors scan the raw text (inert code contexts included), then the active-content scan unless the exemption names the body's path.
    screenBody: (body, path) => detectSecrets(detectors, body) !== undefined ? 'secret-detector-match'
      : active(body, path) ? 'active-content' : undefined,
    opaqueId: identity => excludedSourceId(key, identity),
  };
}

/** The any-repo reader with the public-source screen in force: the policy act
 * is verified before the admission port is asked or the repository touched. */
export async function readScreenedRepoCorpus(repoRoot: string, config: Pick<ReaderConfig, 'repositoryId' | 'revision' | 'include' | 'exclude' | 'oversize'>,
  ports: Omit<RepoCorpusPorts, 'screen'> & { readonly policyAct?: PublicSourcePolicyActPort; readonly runKey?: Buffer } = {}): Promise<RepoCorpus> {
  const runKey = ports.runKey ?? newGenerationRunKey();
  const screen = await loadPublicSourceScreen(ports.policyAct, runKey, { repository: config.repositoryId, commit: config.revision });
  return readRepoCorpus(repoRoot, config, { ...(ports.admission === undefined ? {} : { admission: ports.admission }), ...(ports.readBlobs === undefined ? {} : { readBlobs: ports.readBlobs }), screen, runKey });
}

/** The existing pipeline source-verification boundary for a public-source corpus. Re-evaluates policy and observation admission, reads
 * original Git blobs by the pinned identifiers, verifies their hashes, and screens them again. Returned JSON projections never verify
 * themselves: the pipeline compares the complete request population against this newly produced population before dispatch. */
export function screenedRepoCorpusVerifier(repoRoot: string, config: Pick<ReaderConfig, 'repositoryId' | 'revision' | 'include' | 'exclude' | 'oversize'>,
  ports: Omit<RepoCorpusPorts, 'screen'> & { readonly policyAct?: PublicSourcePolicyActPort; readonly runKey?: Buffer } = {}): PipelinePorts['verifySources'] {
  return async request => {
    if (request.sources.some(source => source.repositoryId !== config.repositoryId || source.revision !== config.revision)) return false;
    try { return (await readScreenedRepoCorpus(repoRoot, config, ports)).sources; } catch { return false; }
  };
}
