import { DOSSIER_POLICY_PATH, DOSSIER_PREDECESSOR_POLICY_PATH, readCommittedPolicy, restartExplanation, type PolicyBinding } from './policy-snapshot.js';
import { classDecision, codeContentExempt, compileEveryOffsetMatcher, deniedDirectory, documentationExempt, readCodeContentExemption, readConfigurationDetectors, readGovernanceTextRule, readProjectDocumentationExemption, readProjectDocumentationRule, readScopeDetectors, readSecondStage, readSecretRedaction, readSourceVisibility, redactBody, redactionFor, type ClassDecision, type PlacementSubject, type SourceVisibility, type PublicSourceContentClass, type RedactionDetector } from '@syzygy/polaris-generation-core/live';
import { compileDetectors, deniedPathReason, detectSecrets, scanActiveContent, type DeniedPathRules, type SecretDetector } from '@syzygy/three-surface-poc-core';
import { isRecord, sha256 } from '@syzygy/support';

/** Classification and screening of every blob Syzygy reads for a check (REQ-polaris-generation-033: "every object SHALL be classified
 * and screened under the observing project's effective policies (REQ-polaris-generation-025) before its content is used in a check").
 *
 * The dossier loads committed policy bytes and compares their digest with the run binding; worktree drift or a policy change refuses. The rules are the any-repo reader's
 * (`apps/three-surface-poc/src/polaris-generation/public-source-screening.ts`), unforked: a path is excluded unread when a denied-path
 * rule names it, when a secret detector matches the path itself, or when it is in neither the scope's `project-documentation` class
 * (exactly one of that rule's path rules, `@syzygy/polaris-generation-core`'s `publicSourceContentClass`; classified when its declared policy rule is enabled) nor its code-content class (a final segment ending with one of
 * `sourceExtensions`); a body that is not UTF-8 text, that a secret detector matches, or that holds active content is excluded after the
 * read, whichever class admitted its path, except that a code-content body whose extension the scope's `codeContentExemption` lists
 * (version 3) skips the active-content scan when `screenBody` is given its path; every detector still runs over it. That exemption
 * holds at a page only while the page meets the scope's `renderCondition`, which `render.ts` confirms for the pages it draws (scanning
 * such a body as before where it cannot). An excluded blob is never used to verify a quotation, and no finding carries its bytes.
 * `contentClass` names the class a path is admitted under, so every artifact can retain fail-closed classification without a provider-statement grant. Policy residuals, not repaired here: the detectors match literal forms only, so an encoded or split secret passes
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
 * Under version 6 (variant `p`, approved 2026-11-05): the owner's placements add `redis.conf` (same repository, same commit), and the
 * scope adds a fourth detector, `config-secret-directive`, which runs wherever the other scope detectors run. It is not a whole-artifact
 * detector, so a project-documentation body it matches has the matched and guard lines withheld, and a body of any other class (code
 * content included) is excluded whole; agent text quoting a line that opens with such a directive is refused (`screenBody`).
 *
 * Version 8 and the D10 dossier successor build a screen for the subject's visibility. The declared-source entry records that
 * visibility, defaults private and never consults the historical visibility carriers. A public repository is screened exactly as under version 7. A private one is screened under the same
 * rules except that no body is retained as redacted-span: a detector match excludes the body whole in every class. A policy without
 * `sourceVisibility` (versions 1 to 7) admits public repositories only, so a screen built for a private one is refused. The screen
 * carries the visibility so that the render keeps a private excluded or withheld blob's object id off every page.
 *
 * The dossier declared-source policy 2.0.0 (REQ-polaris-generation-046 from specification version 2.6, adoption row A-22) decides a
 * path's class in two stages (`classDecision` in `@syzygy/polaris-generation-core`): Stage 1 is the predecessor's decision, unchanged,
 * and Stage 2 places some of what Stage 1 leaves indeterminate. The screen carries each admitted path's stage (`stageOf`) to every
 * redaction and exemption decision: a body Stage 2 places is never retained as redacted-span (any detector match excludes it whole,
 * under either visibility), no active-content exemption names it, and the policy's `configurationDetectors` run over it beside every
 * other detector. They also run over every text `screenBody` is given without a path (agent text), and over no body Stage 1 places, so a
 * Stage-1 body (and a cited span of one, which callers screen with its path) keeps its predecessor outcome. `deniedDirectoryNames` deny a
 * path any directory of which they name, before any read. A policy without `classDecision` (the predecessor) is screened exactly as before.
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
  /** The stage of the policy's class decision that admits a path (1, or 2 under the two-stage policy 2.0.0), or undefined when `screenPath`
   * excludes it. A Stage-2 body is never redacted or exempted from the active-content scan, and the configuration detectors screen it. */
  readonly stageOf: (repositoryPath: string) => 1 | 2 | undefined;
  /** Whether the policy decides classes in two stages (dossier policy 2.0.0). */
  readonly twoStage: boolean;
  /** How many configuration detectors the policy adds for Stage-2 bodies, their spans and agent text (0 before the dossier policy 2.0.0). */
  readonly configurationDetectors: number;
  /** Whether the policy declares the version-5 project-documentation exemption from the active-content scan. */
  readonly documentationExemption: boolean;
  /** How many detectors the scope adds to the policy's own (version 5's `scopeDetectors`; 0 before it). */
  readonly scopeDetectors: number;
  /** Why a read body is excluded, or undefined when it is admitted. With the blob's `repositoryPath`, a body the code-content exemption
   * or (version 5) the project-documentation exemption names skips the active-content scan; without one (agent text, or a page that
   * cannot meet the render condition) every body is scanned. Without a path, or with a path Stage 2 places, the configuration detectors
   * (dossier policy 2.0.0) run beside the others; with a path Stage 1 places they do not. */
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
  /** Whether a whole admitted body read at `repositoryPath`, scanned as before for a page that cannot be confirmed to meet the
   * renderCondition, holds a finding: the detectors of the body's stage (the configuration detectors only for a body Stage 2 places,
   * dossier policy 2.0.0: "They do not run over a body Stage 1 places"), then the active-content scan with no exemption. Under a
   * one-stage policy it answers as `screenBody(body)` does. */
  readonly scannedAsBefore: (body: string, repositoryPath: string) => boolean;
  /** The visibility this screen was built for (version 8): `private` excludes every detector-matched body whole, and the render shows no
   * object id of a blob excluded or withheld on any ground. Always `public` under versions 1 to 7. */
  readonly visibility: SourceVisibility;
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
export interface DossierScreenSubject extends PlacementSubject { readonly visibility?: SourceVisibility; readonly policySha256?: string; readonly policyPath?: string }
export type ScreenLoader = (subject?: DossierScreenSubject) => Promise<ScreenLoad>;

/** sha256 of the dossier policy 2.0.0's `sourceAdmission.pathRuleScope`, which states `deniedDirectoryNames`: every segment but the final
 * one, wherever it sits, compared case-insensitively as the other denied-path rules are. */
const PATH_RULE_SCOPE_TWO_STAGE = '0171fb2354b835db17efe6839d54e403c56ae842eb9be19b81ed525d9130563e';
const stringList = (value: unknown): value is readonly string[] => Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0);

/** The run's repository and pinned commit as the owner-placement rule compares them: `repository:<id>`, the consent subject form. */
/** One loader for every step. Declared visibility defaults private; the
 * current screen must match the policy digest bound in the run. */
export const screenLoaderOf = (injected: ScreenLoader | undefined, recordsRoot: string, now: number): ScreenLoader =>
  async subject => {
    const loaded = await (injected === undefined ? loadDossierScreen(recordsRoot, now, subject ?? null) : injected(subject));
    if (loaded.ok && subject?.policySha256 !== undefined && loaded.screen.policySha256 !== subject.policySha256) {
      return { ok: false, why: subject.policyPath === DOSSIER_PREDECESSOR_POLICY_PATH ? restartExplanation('the applied screen differs from the policy bytes bound to this run')
        : 'the applied screen differs from the policy bytes bound to this run' };
    }
    if (loaded.ok && subject?.visibility !== undefined && loaded.screen.visibility !== subject.visibility) {
      return { ok: false, why: 'the applied screen differs from the run declared visibility' };
    }
    return loaded;
  };

export const placementSubjectOf = (subject: {
  readonly repository: { readonly repositoryId: string }; readonly pinnedRevision: { readonly commit: string };
  readonly visibility?: { readonly value: SourceVisibility }; readonly screeningPolicy?: PolicyBinding;
}): DossierScreenSubject => ({
  repository: `repository:${subject.repository.repositoryId}`, commit: subject.pinnedRevision.commit,
  ...(subject.visibility === undefined ? {} : { visibility: subject.visibility.value }),
  ...(subject.screeningPolicy === undefined ? {} : { policySha256: subject.screeningPolicy.sha256, policyPath: subject.screeningPolicy.path }),
});

/** Build the screen from the policy's bytes. Every field the rules need must be present and well formed, or the screen is refused.
 * `projectDocumentationEnabled` enables the policy's project-documentation rule; when false, the class's
 * rule is still read (a malformed one refuses) but classifies nothing, so its paths are indeterminate. `subject` is the repository the
 * blobs are read from and the admitted commit they are read at, which the version-5 owner placements compare; null places nothing. */
export function buildDossierScreen(policy: Uint8Array, projectDocumentationEnabled = false, subject: PlacementSubject | null = null, given?: SourceVisibility): ScreenLoad {
  const refuse = (why: string): ScreenLoad => ({ ok: false, why: `the screening policy cannot be applied: ${why}` });
  let doc: unknown;
  try { doc = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(policy)); } catch { return refuse('it is not UTF-8 JSON'); }
  if (!isRecord(doc) || typeof doc['policyId'] !== 'string' || typeof doc['policyVersion'] !== 'string') return refuse('its identity is unreadable');
  const scope = doc['publicSourceScope'], admission = doc['sourceAdmission'];
  if (!isRecord(scope)) return refuse('it carries no publicSourceScope');
  const classification = scope['contentClassification'];
  // The two-stage class decision (dossier policy 2.0.0) changes how four other texts are read; each is accepted only beside it.
  const twoStage = isRecord(classification) && Object.hasOwn(classification, 'classDecision');
  const visibilityRead = readSourceVisibility(scope, twoStage);
  if (!visibilityRead.ok) return refuse(visibilityRead.why);
  // No visibility given: a policy without `sourceVisibility` admits public repositories only, so public; a version-8 policy, the
  // stricter private, so a caller that forgets the decision never gets partial redaction or a rendered object id.
  const visibility: SourceVisibility = given ?? (visibilityRead.declared ? 'private' : 'public');
  if (visibility === 'private' && !visibilityRead.admitsPrivate) return refuse('the repository is not public at this commit (no effective observation consent record of its pair states public through its carrier for every record), and this policy admits public repositories only');
  if (!isRecord(admission) || !stringList(admission['deniedPathBasenames']) || !stringList(admission['deniedPathPrefixes']) || !stringList(admission['deniedPathSuffixes'])) {
    return refuse('its denied-path rules are unreadable');
  }
  const allRules = isRecord(classification) && Array.isArray(classification['rules']) ? classification['rules'] : [];
  // Stage 1 is the five rules without an id; under a one-stage policy a rule with an id refuses (`readSecondStage`).
  const rules = twoStage ? allRules.filter((rule: unknown) => !(isRecord(rule) && Object.hasOwn(rule, 'id'))) : allRules;
  const codeContent = rules.filter((rule: unknown) => isRecord(rule) && rule['class'] === 'code-content');
  const extensions = isRecord(codeContent[0]) ? codeContent[0]['sourceExtensions'] : undefined;
  if (codeContent.length !== 1 || !stringList(extensions) || extensions.length === 0 || extensions.some((extension) => !/^\.[^/\s]+$/u.test(extension) || extension.includes('..'))) {
    return refuse('its code-content sourceExtensions are unreadable');
  }
  const documentationRead = readProjectDocumentationRule(rules, extensions);
  if (!documentationRead.ok) return refuse(documentationRead.why);
  const documentation = projectDocumentationEnabled ? documentationRead.rule : null;
  const secondRead = readSecondStage(classification, documentationRead.rule, extensions);
  if (!secondRead.ok) return refuse(secondRead.why);
  const second = secondRead.stage;
  const governanceRead = readGovernanceTextRule(twoStage ? { ...classification, rules } : classification);
  if (!governanceRead.ok) return refuse(governanceRead.why);
  const governanceTextPaths = governanceRead.paths;
  const exemptionRead = readCodeContentExemption(scope, extensions);
  if (!exemptionRead.ok) return refuse(exemptionRead.why);
  const exemption = exemptionRead.exemption;
  // code-content-extended: "activeContent.codeContentExemption names none of these extensions or names".
  if (second !== null && exemption !== null && exemption.exemptExtensions.some(entry => [...second.configurationExtensions, ...second.languageExtensions].includes(entry))) {
    return refuse('its code-content exemption names an extension code-content-extended places, which that rule says it never does');
  }
  const documentationExemptionRead = readProjectDocumentationExemption(scope, twoStage);
  if (!documentationExemptionRead.ok) return refuse(documentationExemptionRead.why);
  const documentationExemption = documentationExemptionRead.declared;
  const policyDetectorIds = Array.isArray(doc['detectors']) ? doc['detectors'].flatMap((d: unknown) => (isRecord(d) && typeof d['id'] === 'string' ? [d['id']] : [])) : [];
  const scopeRead = readScopeDetectors(scope, policyDetectorIds);
  if (!scopeRead.ok) return refuse(scopeRead.why);
  // The scope's detectors join the policy's for this scope only (version 5); before version 5 the list is the policy's alone.
  const allDetectors = Array.isArray(doc['detectors']) ? [...doc['detectors'] as unknown[], ...scopeRead.detectors] : doc['detectors'];
  const detectorIds = [...policyDetectorIds, ...scopeRead.detectors.map((detector) => detector.id)];
  const configurationRead = readConfigurationDetectors(scope, detectorIds);
  if (!configurationRead.ok) return refuse(configurationRead.why);
  // The configuration detectors screen Stage-2 bodies, their spans and agent text; they exist only beside the decision that has a Stage 2,
  // and that decision is read only with them.
  if (twoStage !== (configurationRead.detectors.length > 0)) return refuse(twoStage ? 'its two-stage class decision comes without configurationDetectors' : 'its configurationDetectors come without the two-stage class decision');
  const redactionRead = readSecretRedaction(scope, detectorIds, twoStage);
  if (!redactionRead.ok) return refuse(redactionRead.why);
  const redaction = redactionRead.redaction;
  const denied: DeniedPathRules = { basenames: admission['deniedPathBasenames'], prefixes: admission['deniedPathPrefixes'], suffixes: admission['deniedPathSuffixes'] };
  // deniedDirectoryNames (dossier policy 2.0.0) are read only under the pathRuleScope text that states them, and only beside the
  // two-stage decision they were adopted with.
  const directoryNames = admission['deniedDirectoryNames'];
  if (twoStage !== Object.hasOwn(admission, 'deniedDirectoryNames')) return refuse(twoStage ? 'its two-stage class decision comes without deniedDirectoryNames' : 'its deniedDirectoryNames come without the two-stage class decision');
  if (twoStage && (!stringList(directoryNames) || directoryNames.length === 0 || directoryNames.some(name => name.includes('/') || name === '.' || name === '..')
    || typeof admission['pathRuleScope'] !== 'string' || sha256(admission['pathRuleScope']) !== PATH_RULE_SCOPE_TWO_STAGE)) {
    return refuse('its deniedDirectoryNames or the pathRuleScope that states them are not the rules this screen implements');
  }
  const directories: readonly string[] = twoStage ? directoryNames as readonly string[] : [];
  let detectors: ReturnType<typeof compileDetectors>;
  try { detectors = compileDetectors({ detectors: allDetectors as readonly SecretDetector[] }); } catch (error) { return refuse(`its detectors do not compile (${error instanceof Error ? error.message : 'invalid'})`); }
  const everyOffset = compileEveryOffsetMatcher(allDetectors as readonly RedactionDetector[]);
  // Stage-2 bodies and agent text: every detector above and the configuration detectors, as the policy writes them.
  const extendedDetectors = [...(allDetectors as readonly RedactionDetector[]), ...configurationRead.detectors];
  let stageTwoDetectors: ReturnType<typeof compileDetectors>;
  try { stageTwoDetectors = compileDetectors({ detectors: extendedDetectors as readonly SecretDetector[] }); } catch (error) { return refuse(`its configuration detectors do not compile (${error instanceof Error ? error.message : 'invalid'})`); }
  const stageTwoOffsets = compileEveryOffsetMatcher(extendedDetectors);
  const context = { governanceTextPaths, subject };
  const decide = (repositoryPath: string): ClassDecision | undefined => classDecision(repositoryPath, extensions, documentation, context, second);
  const screenPath = (repositoryPath: string): ScreenExclusion | undefined => deniedPathReason(repositoryPath, denied) !== undefined || deniedDirectory(repositoryPath, directories) ? 'denied-path'
    : detectSecrets(detectors, repositoryPath) !== undefined ? 'secret-detector-match'
      : decide(repositoryPath) !== undefined ? undefined : 'unknown-extraction-class';
  const admittedDecision = (repositoryPath: string): ClassDecision | undefined => (screenPath(repositoryPath) === undefined ? decide(repositoryPath) : undefined);
  const contentClass = (repositoryPath: string): PublicSourceContentClass | undefined => admittedDecision(repositoryPath)?.contentClass;
  const exempt = (repositoryPath: string | undefined): boolean => {
    if (repositoryPath === undefined) return false;
    const found = admittedDecision(repositoryPath);
    return codeContentExempt(repositoryPath, found?.contentClass, exemption, found?.stage) || documentationExempt(found?.contentClass, documentationExemption, found?.stage);
  };
  // Agent text (no path) and a Stage-2 body are screened by the configuration detectors too.
  const stageTwo = (repositoryPath: string | undefined): boolean => repositoryPath === undefined || admittedDecision(repositoryPath)?.stage === 2;
  const active = (body: string, repositoryPath: string): boolean => !exempt(repositoryPath) && scanActiveContent(body).length > 0;
  // The detectors first (from every offset, over the complete body), then the active-content scan over the complete body, as before.
  const screenTargetBody = (body: string, repositoryPath: string): TargetBodyScreen => {
    const found = admittedDecision(repositoryPath);
    // A Stage-2 body is excluded whole on any detector match, under either visibility: it is never retained as redacted-span.
    const redacted = found?.stage === 2 ? redactBody(body, found.contentClass, stageTwoOffsets, null)
      : redactBody(body, found?.contentClass, everyOffset, redactionFor(redaction, visibility));
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
      configurationDetectors: configurationRead.detectors.length,
      twoStage,
      screenPath,
      contentClass,
      stageOf: (repositoryPath) => admittedDecision(repositoryPath)?.stage,
      screenBody: (body, repositoryPath) => detectSecrets(stageTwo(repositoryPath) ? stageTwoDetectors : detectors, body) !== undefined ? 'secret-detector-match'
        : !exempt(repositoryPath) && scanActiveContent(body).length > 0 ? 'active-content' : undefined,
      secretRedaction: redaction !== null,
      screenTargetBody,
      activeContentAsBefore: (body) => scanActiveContent(body).length > 0,
      scannedAsBefore: (body, repositoryPath) => detectSecrets(stageTwo(repositoryPath) ? stageTwoDetectors : detectors, body) !== undefined || scanActiveContent(body).length > 0,
      visibility,
    },
  };
}

/** Apply committed dossier policy bytes; no classification/policy act or
 * observation-consent visibility carrier is consulted. */
export async function loadDossierScreen(root: string, _now: number, subject: DossierScreenSubject | null = null): Promise<ScreenLoad> {
  // A run is screened under the policy file its record binds (REQ-polaris-generation-046 from version 2.6): one bound to the predecessor
  // stays under it, and refuses with the restart explanation when it can no longer be read as that binding; a new step binds the successor.
  const bound = subject?.policyPath ?? DOSSIER_POLICY_PATH;
  const predecessor = bound === DOSSIER_PREDECESSOR_POLICY_PATH;
  const snapshot = readCommittedPolicy(root, bound);
  if (!snapshot.ok) return predecessor ? { ok: false, why: restartExplanation(snapshot.why) } : snapshot;
  if (subject?.policySha256 !== undefined && snapshot.binding.sha256 !== subject.policySha256) {
    return { ok: false, why: predecessor ? restartExplanation('the committed predecessor bytes differ from this run binding') : 'the committed dossier policy changed from this run binding' };
  }
  return buildDossierScreen(snapshot.bytes, true, subject, subject?.visibility ?? 'private');
}
