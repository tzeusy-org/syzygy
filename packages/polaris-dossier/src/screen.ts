import * as fs from 'node:fs';
import * as path from 'node:path';
import { POLICY_PATH, readClassActState, readPolicyActChain } from '@syzygy/polaris-generation-consent/live';
import { codeContentExempt, compileEveryOffsetMatcher, documentationExempt, publicSourceContentClass, readCodeContentExemption, readGovernanceTextRule, readProjectDocumentationExemption, readProjectDocumentationRule, readScopeDetectors, readSecretRedaction, redactBody, type PlacementSubject, type PublicSourceContentClass, type RedactionDetector } from '@syzygy/polaris-generation-core/live';
import { compileDetectors, deniedPathReason, detectSecrets, scanActiveContent, type DeniedPathRules, type SecretDetector } from '@syzygy/three-surface-poc-core';
import { isRecord, sha256 } from '@syzygy/support';

/** Classification and screening of every blob Syzygy reads for a check (REQ-polaris-generation-033: "every object SHALL be classified
 * and screened under the observing project's effective policies (REQ-polaris-generation-025) before its content is used in a check").
 *
 * The policy is the one the screening-scope act chain puts in force now, its bytes hashed against the chain's digest at load, so a policy
 * edited between the step's gate and this read is refused, not used. The rules are the any-repo reader's
 * (`apps/three-surface-poc/src/polaris-generation/public-source-screening.ts`), unforked: a path is excluded unread when a denied-path
 * rule names it, when a secret detector matches the path itself, or when it is in neither the scope's `project-documentation` class
 * (exactly one of that rule's path rules, `@syzygy/polaris-generation-core`'s `publicSourceContentClass`; classified only while the
 * RFC5-14 class amendment act is in force, the scope's `prerequisite`) nor its code-content class (a final segment ending with one of
 * `sourceExtensions`); a body that is not UTF-8 text, that a secret detector matches, or that holds active content is excluded after the
 * read, whichever class admitted its path, except that a code-content body whose extension the scope's `codeContentExemption` lists
 * (version 3) skips the active-content scan when `screenBody` is given its path; every detector still runs over it. That exemption
 * holds at a page only while the page meets the scope's `renderCondition`, which `render.ts` confirms for the pages it draws (scanning
 * such a body as before where it cannot). An excluded blob is never used to verify a quotation, and no finding carries its bytes.
 * `contentClass` names the class a path is admitted under, so that every agent-bound artifact can gate it by the classes its consent lists
 * (`class-gate.ts`). Policy residuals, not repaired here: the detectors match literal forms only, so an encoded or split secret passes
 * them; and the project-documentation rule folds ASCII A-Z only and splits words only at its `docTokenSeparators`, as its text says, so a
 * Unicode look-alike of a withheld word (`docs/\uff44esign.md`), a word joined by a tab (`docs/a\tb.md`) or one that runs on into other
 * characters (`docs/rfc0001.md`) is admitted as project-documentation. The detectors and the active-content scan still run on those bodies.
 *
 * Under version 4 (`secretRedaction`, `@syzygy/polaris-generation-core`'s `redactBody`), `screenTargetBody` retains a
 * project-documentation body whose only detector matches are line-redactable as RFC5-17's `redacted-span`: the matched lines and their
 * guard lines are withheld (emptied, terminators kept, so line numbers do not move), and every other body that a detector matches is
 * excluded whole as before. `screenBody` stays whole-text: it screens agent-written text, and a consumer not taught the redacted form
 * keeps whole-file exclusion. A withheld line is never handed out: `screenTargetBody` returns only the retained text.
 *
 * Under version 5 (variant `bcd`, approved 2026-11-03): the scope's `scopeDetectors` run beside the policy's detectors everywhere this
 * screen runs them (paths, `screenBody`, `screenTargetBody`'s every-offset scan and its re-screen of the retained text); root SECURITY and
 * MANIFESTO names are `governance-text` (data, never policy; any detector match excludes such a body whole, and it is scanned for active
 * content as before); the owner's placements put named paths in project-documentation for one repository at listed commits only, which
 * is why a screen is built for its run's `PlacementSubject` (one built without it places nothing); and a project-documentation body skips
 * the active-content scan when `screenBody` or `screenTargetBody` is given its path (`projectDocumentationExemption`), under the same
 * render condition `render.ts` confirms for the code-content exemption. Agent text, given no path, is still scanned whole.
 *
 * TODO(syzygy-qkea.17): these rules are a copy of the app's; move them into one shared package that both import. Until then
 * `screen.test.ts` builds both screens from the same policy and fails if they disagree on any path or body of its population. */

export type ScreenExclusion = 'denied-path' | 'secret-detector-match' | 'unknown-extraction-class' | 'not-utf8-text' | 'active-content';

export interface DossierScreen {
  readonly policyId: string;
  readonly policyVersion: string;
  readonly policySha256: string;
  /** Whether the policy's project-documentation class is classified: it has the rule and the RFC5-14 class act is in force. */
  readonly projectDocumentation: boolean;
  /** Why a path is excluded before any read, or undefined when its blob may be read. */
  readonly screenPath: (repositoryPath: string) => ScreenExclusion | undefined;
  /** The content class `screenPath` admits a path under, or undefined when it excludes the path. */
  readonly contentClass: (repositoryPath: string) => PublicSourceContentClass | undefined;
  /** Whether the policy declares the version-3 code-content exemption. */
  readonly codeContentExemption: boolean;
  /** Whether the policy classifies the version-5 governance-text class (root SECURITY and MANIFESTO names). */
  readonly governanceText: boolean;
  /** Whether the policy declares the version-5 project-documentation exemption from the active-content scan. */
  readonly documentationExemption: boolean;
  /** How many detectors the scope adds to the policy's own (version 5's `scopeDetectors`; 0 before it). */
  readonly scopeDetectors: number;
  /** Why a read body is excluded, or undefined when it is admitted. With the blob's `repositoryPath`, a body the code-content exemption
   * or (version 5) the project-documentation exemption names skips the active-content scan; without one (agent text, or a page that
   * cannot meet the render condition) every body is scanned. */
  readonly screenBody: (body: string, repositoryPath?: string) => ScreenExclusion | undefined;
  /** Whether the policy declares the version-4 secret redaction. */
  readonly secretRedaction: boolean;
  /** A target body read at `repositoryPath`, screened under the policy's secret redaction (version 4) where it applies: every detector over
   * the complete body from every offset, the active-content scan over the complete body exactly as `screenBody` runs it. */
  readonly screenTargetBody: (body: string, repositoryPath: string) => TargetBodyScreen;
  /** Whether `body`, scanned for active content as before (no exemption applied), holds any: the scan a page that cannot be confirmed to
   * meet the renderCondition applies to an exempt body. It runs over the complete body, so a redacted body (version 4) that an exemption
   * admitted (version 5's project-documentation exemption) is checked on its withheld lines too; the answer carries no text. */
  readonly activeContentAsBefore: (body: string) => boolean;
}

/** A target body as `screenTargetBody` screens it: admitted whole, retained as `redacted-span` (only `retained`, never the withheld
 * lines, is carried; `withheld` are their 1-based numbers, ascending), or excluded whole for `outcome`. */
export type TargetBodyScreen =
  | { readonly kind: 'admitted' }
  | { readonly kind: 'redacted'; readonly retained: string; readonly retainedLines: readonly string[]; readonly lineByteOffsets: readonly number[];
      readonly originalBytes: number; readonly contentSha256: string; readonly withheld: readonly number[]; readonly detectorIds: readonly string[] }
  | { readonly kind: 'excluded'; readonly outcome: ScreenExclusion };

export type ScreenLoad = { readonly ok: true; readonly screen: DossierScreen } | { readonly ok: false; readonly why: string };
/** How a step loads its screen: for the run's placement subject (`placementSubjectOf`), which the version-5 owner placements compare. */
export type ScreenLoader = (subject?: PlacementSubject) => Promise<ScreenLoad>;

const stringList = (value: unknown): value is readonly string[] => Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0);

/** The run's repository and pinned commit as the owner-placement rule compares them: `repository:<id>`, the consent subject form. */
export const placementSubjectOf = (subject: { readonly repository: { readonly repositoryId: string }; readonly pinnedRevision: { readonly commit: string } }): PlacementSubject =>
  ({ repository: `repository:${subject.repository.repositoryId}`, commit: subject.pinnedRevision.commit });

/** Build the screen from the policy's bytes. Every field the rules need must be present and well formed, or the screen is refused.
 * `classActInForce` says whether the RFC5-14 project-documentation class amendment is confirmed in force; when it is not, the class's
 * rule is still read (a malformed one refuses) but classifies nothing, so its paths are indeterminate. `subject` is the repository the
 * blobs are read from and the admitted commit they are read at, which the version-5 owner placements compare; null places nothing. */
export function buildDossierScreen(policy: Uint8Array, classActInForce = false, subject: PlacementSubject | null = null): ScreenLoad {
  const refuse = (why: string): ScreenLoad => ({ ok: false, why: `the screening policy cannot be applied: ${why}` });
  let doc: unknown;
  try { doc = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(policy)); } catch { return refuse('it is not UTF-8 JSON'); }
  if (!isRecord(doc) || typeof doc['policyId'] !== 'string' || typeof doc['policyVersion'] !== 'string') return refuse('its identity is unreadable');
  const scope = doc['publicSourceScope'], admission = doc['sourceAdmission'];
  if (!isRecord(scope)) return refuse('it carries no publicSourceScope');
  if (!isRecord(admission) || !stringList(admission['deniedPathBasenames']) || !stringList(admission['deniedPathPrefixes']) || !stringList(admission['deniedPathSuffixes'])) {
    return refuse('its denied-path rules are unreadable');
  }
  const classification = scope['contentClassification'];
  const rules = isRecord(classification) && Array.isArray(classification['rules']) ? classification['rules'] : [];
  const codeContent = rules.filter((rule: unknown) => isRecord(rule) && rule['class'] === 'code-content');
  const extensions = isRecord(codeContent[0]) ? codeContent[0]['sourceExtensions'] : undefined;
  if (codeContent.length !== 1 || !stringList(extensions) || extensions.length === 0 || extensions.some((extension) => !/^\.[^/\s]+$/u.test(extension) || extension.includes('..'))) {
    return refuse('its code-content sourceExtensions are unreadable');
  }
  const documentationRead = readProjectDocumentationRule(rules, extensions);
  if (!documentationRead.ok) return refuse(documentationRead.why);
  const documentation = classActInForce ? documentationRead.rule : null;
  const governanceRead = readGovernanceTextRule(classification);
  if (!governanceRead.ok) return refuse(governanceRead.why);
  const governanceTextPaths = governanceRead.paths;
  const exemptionRead = readCodeContentExemption(scope, extensions);
  if (!exemptionRead.ok) return refuse(exemptionRead.why);
  const exemption = exemptionRead.exemption;
  const documentationExemptionRead = readProjectDocumentationExemption(scope);
  if (!documentationExemptionRead.ok) return refuse(documentationExemptionRead.why);
  const documentationExemption = documentationExemptionRead.declared;
  const policyDetectorIds = Array.isArray(doc['detectors']) ? doc['detectors'].flatMap((d: unknown) => (isRecord(d) && typeof d['id'] === 'string' ? [d['id']] : [])) : [];
  const scopeRead = readScopeDetectors(scope, policyDetectorIds);
  if (!scopeRead.ok) return refuse(scopeRead.why);
  // The scope's detectors join the policy's for this scope only (version 5); before version 5 the list is the policy's alone.
  const allDetectors = Array.isArray(doc['detectors']) ? [...doc['detectors'] as unknown[], ...scopeRead.detectors] : doc['detectors'];
  const detectorIds = [...policyDetectorIds, ...scopeRead.detectors.map((detector) => detector.id)];
  const redactionRead = readSecretRedaction(scope, detectorIds);
  if (!redactionRead.ok) return refuse(redactionRead.why);
  const redaction = redactionRead.redaction;
  const denied: DeniedPathRules = { basenames: admission['deniedPathBasenames'], prefixes: admission['deniedPathPrefixes'], suffixes: admission['deniedPathSuffixes'] };
  let detectors: ReturnType<typeof compileDetectors>;
  try { detectors = compileDetectors({ detectors: allDetectors as readonly SecretDetector[] }); } catch (error) { return refuse(`its detectors do not compile (${error instanceof Error ? error.message : 'invalid'})`); }
  const everyOffset = compileEveryOffsetMatcher(allDetectors as readonly RedactionDetector[]);
  const context = { governanceTextPaths, subject };
  const classOf = (repositoryPath: string): PublicSourceContentClass | undefined => publicSourceContentClass(repositoryPath, extensions, documentation, context);
  const screenPath = (repositoryPath: string): ScreenExclusion | undefined => deniedPathReason(repositoryPath, denied) !== undefined ? 'denied-path'
    : detectSecrets(detectors, repositoryPath) !== undefined ? 'secret-detector-match'
      : classOf(repositoryPath) !== undefined ? undefined : 'unknown-extraction-class';
  const contentClass = (repositoryPath: string): PublicSourceContentClass | undefined => (screenPath(repositoryPath) === undefined ? classOf(repositoryPath) : undefined);
  const exempt = (repositoryPath: string | undefined): boolean => {
    if (repositoryPath === undefined) return false;
    const found = contentClass(repositoryPath);
    return codeContentExempt(repositoryPath, found, exemption) || documentationExempt(found, documentationExemption);
  };
  const active = (body: string, repositoryPath: string): boolean => !exempt(repositoryPath) && scanActiveContent(body).length > 0;
  // The detectors first (from every offset, over the complete body), then the active-content scan over the complete body, as before.
  const screenTargetBody = (body: string, repositoryPath: string): TargetBodyScreen => {
    const redacted = redactBody(body, contentClass(repositoryPath), everyOffset, redaction);
    if (redacted.kind === 'excluded') return { kind: 'excluded', outcome: 'secret-detector-match' };
    if (active(body, repositoryPath)) return { kind: 'excluded', outcome: 'active-content' };
    return redacted.kind === 'clean' ? { kind: 'admitted' } : redacted;
  };
  return {
    ok: true,
    screen: {
      policyId: doc['policyId'], policyVersion: doc['policyVersion'], policySha256: sha256(policy),
      projectDocumentation: documentation !== null,
      codeContentExemption: exemption !== null,
      governanceText: governanceTextPaths !== null,
      documentationExemption,
      scopeDetectors: scopeRead.detectors.length,
      screenPath,
      contentClass,
      screenBody: (body, repositoryPath) => detectSecrets(detectors, body) !== undefined ? 'secret-detector-match'
        : !exempt(repositoryPath) && scanActiveContent(body).length > 0 ? 'active-content' : undefined,
      secretRedaction: redaction !== null,
      screenTargetBody,
      activeContentAsBefore: (body) => scanActiveContent(body).length > 0,
    },
  };
}

/** The screen of the policy in force at `now`, from a Syzygy checkout: the act chain must put an act in force whose argument is the
 * policy's current bytes, and the bytes read for the screen must hash to that argument. The project-documentation class is classified
 * only when the RFC5-14 class amendment act is in force at `now` and the installed RFC-0005 module hashes to its argument; an absent
 * or refused class act leaves the class's paths indeterminate and the rest of the screen unchanged. */
export async function loadDossierScreen(root: string, now: number, readBytes: (file: string) => Buffer = (file) => fs.readFileSync(file), subject: PlacementSubject | null = null): Promise<ScreenLoad> {
  const chain = await readPolicyActChain({ root, now });
  if (chain.state !== 'ok') return { ok: false, why: `no screening policy is in force: ${chain.why}` };
  // The chain read the policy once; this is a second read, so a change between the two is caught here.
  let bytes: Buffer;
  try { bytes = readBytes(path.join(root, POLICY_PATH)); } catch (cause) {
    return { ok: false, why: `the screening policy cannot be read (${(cause as NodeJS.ErrnoException).code ?? 'unknown-error'})` };
  }
  if (sha256(bytes) !== chain.final.digest) return { ok: false, why: 'the screening policy changed after its act was checked; its bytes differ from the act\'s argument' };
  const classAct = await readClassActState({ root, now });
  return buildDossierScreen(new Uint8Array(bytes), classAct.state === 'ok', subject);
}
