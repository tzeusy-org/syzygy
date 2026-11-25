import { createNativePolicyGitScope } from './policy-git-native.js';
import type { PolicyGitScope } from './policy-git.js';
import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { decodeUtf8, isRecord, sha256 } from '@syzygy/support';
import { bindCurrentEffectiveUrlRun, readEffectiveRunRecord } from './effective-run-record.js';
import type { GateSources } from './gate-sources.js';
import { reconstructColdUrlRunMachineHistory } from './url-machine-cold-history.js';
import { URL_HOST_ROOT } from './url-mode-registry.js';
import { readUrlParentAdoption } from './url-parent-adoption.js';
import { committedUrlPoliciesCurrent, committedUrlPoliciesCurrentAsync, readCommittedPolicy, readCommittedUrlOriginPolicy, restartExplanation, samePolicy } from './policy-snapshot.js';
import type { SupervisorState } from './polaris.js';
import { RAW_READ_DISCLOSURE_REFUSAL, readRawReadDisclosure } from './raw-read-disclosure.js';
import { reverifyPinnedRevision } from './reverify.js';
import { buildDossierScreen, placementSubjectOf } from './screen.js';
import { URL_CLI_PROGRAM, verifySupportedUrlCli } from './session-launch.js';
import type { ViewRole } from './session-view.js';
import { RUN_LAYOUT } from './state-directory.js';
import { URL_HELPER_LAUNCH_FILES } from './url-launch-history.js';
import { verifyUrlFrozenProductHistory } from './url-frozen-product-history.js';
import { snapshotProductFile } from './url-product-reads.js';
import { readUrlRuntime, urlPolicyGitProgram } from './url-runtime.js';
import { verifyUrlSessionAuditHistory } from './url-session-audit-history.js';
import { bindUrlSourceReader } from './url-source-reader.js';
import { acquireUrlRecoveryClaim, readUrlStoppedBoundaryChain, type UrlRecoveryClaim } from './url-stopped-run.js';
import { prepareUrlBudgetResume } from './url-session-budget.js';
import { verifyUrlRecoveryProducts } from './url-recovery-products.js';

const CANONICAL_LIMITS = { maxBytes: 65_536, maxNodes: 4096, maxDepth: 16 };
const verifiedRuns = new WeakMap<object, () => Promise<UrlRecoveryClaim | null>>();
const claimedRuns = new WeakMap<object, UrlRecoveryClaim>();
/** A live, consumed claim belongs to this exact independently verified cut. */
export function isClaimedStoppedUrlRun(value: unknown, claim: unknown): claim is UrlRecoveryClaim {
  return isRecord(value) && claimedRuns.get(value) === claim && claim !== undefined
    && (claim as UrlRecoveryClaim).current() === true;
}

/** Recheck the exact consumed claim across fresh asynchronous policy reads. */
export async function isClaimedStoppedUrlRunAsync(value: unknown, claim: UrlRecoveryClaim): Promise<boolean> {
  return isRecord(value) && claim !== undefined && claimedRuns.get(value) === claim && await claim.currentAsync() === true
    && claimedRuns.get(value) === claim;
}

/** Only an exact successful cold-verifier result can request exclusive
 * recovery. Saved/copied results never issue a claim. A successful call
 * durably consumes the boundary before returning active ownership; the caller
 * holds that claim through cleanup/next stop. */
export async function claimStoppedUrlRun(value: unknown): Promise<UrlRecoveryClaim | null> {
  if (!isRecord(value)) return null;
  const claim = await verifiedRuns.get(value)?.() ?? null;
  if (claim !== null) claimedRuns.set(value, claim);
  return claim;
}

function absent(run: string, file: string): boolean {
  try { fs.lstatSync(path.join(run, file)); }
  catch (error) { return (error as NodeJS.ErrnoException).code === 'ENOENT'; }
  return false;
}

/** Re-observe the protected stop boundary. The caller continues to exclude
 * writers until it makes a distinct, exclusive decision to start new work. */
export async function verifyStoppedUrlRun(state: SupervisorState, input: {
  readonly checkout: string; readonly sources: GateSources; readonly now: () => number;
  readonly requireAuthorHandoffDisclosure?: boolean;
}) {
  const run = state.run, { sources, now } = input, root = sources.recordsRoot;
  const deadline = state.briefIssuedAt + state.deadlineSeconds * 1000;
  const stillStopped = (): boolean => now() < deadline && absent(run, RUN_LAYOUT.record) && absent(run, RUN_LAYOUT.executionChoice);
  const refuse = (code: 'state' | 'policy' | 'disclosure' | 'runtime' | 'checkpoint' | 'source' | 'machine-history' | 'session-history' | 'budget',
    reason?: string) => ({ ok: false as const, code, ...(reason === undefined ? {} : { reason }) });
  let policyGit: PolicyGitScope | undefined;
  let retainedPolicyGit = false;
  try {
    if (state.stopGeneration === undefined || state.declarationSha256 === undefined || state.stopped === undefined || state.done !== undefined
      || sources.effectiveRunDeclaration === undefined) return refuse('state');
    const read = readEffectiveRunRecord(run, sources.effectiveRunDeclaration);
    if (!read.ok) return read.code === 'policy-binding' ? refuse('policy', read.reason) : refuse('state');
    if (read.effective.kind !== 'url' || read.sidecarSha256 !== state.declarationSha256) return refuse('state');
    const { declaration } = read.effective, record = read.core;
    if (declaration.runId !== state.runId || record.declared.deadline.seconds !== state.deadlineSeconds
      || record.subject.pinnedRevision.commit !== declaration.pinnedCommit || record.subject.clone.path !== state.clone
      || declaration.inference.model !== state.model || declaration.sourceTransport.originalLocator !== state.url) return refuse('state');
    if (input.requireAuthorHandoffDisclosure === true && readRawReadDisclosure(run, record.declared.agentProvider) === null)
      return refuse('disclosure', RAW_READ_DISCLOSURE_REFUSAL);
    if (!stillStopped()) return refuse('state');
    const policy = readCommittedPolicy(root, declaration.basePolicy.path), origin = readCommittedUrlOriginPolicy(root);
    if (!policy.ok || !samePolicy(policy.binding, declaration.basePolicy)) return refuse('policy',
      restartExplanation('the committed policy identity, version or bytes differ from this run binding', declaration.basePolicy.path));
    if (!origin.ok || !samePolicy(origin.binding, declaration.originPolicy)) return refuse('policy',
      restartExplanation('the committed URL overlay identity, version or bytes differ from this run binding', declaration.originPolicy.path));
    const runtime = await readUrlRuntime(input.checkout);
    if (!runtime.ok) return refuse('runtime');
    const policyProgram = urlPolicyGitProgram(runtime.runtime);
    if (policyProgram === null) return refuse('runtime');
    policyGit = createNativePolicyGitScope(policyProgram);
    const policyExecutor = policyGit;
    const adoption = readUrlParentAdoption(root, origin.binding.sha256, undefined, policyExecutor);
    if (adoption === null) return refuse('policy', 'The exact installed A-14 URL dossier adoption cannot be verified against the observed default branch.');
    const policyCurrent = (): Promise<boolean> => committedUrlPoliciesCurrentAsync(root, policy.binding, origin.binding, adoption, policyExecutor);
    const policyChanged = () => refuse('policy', restartExplanation(
      `the checked policy pair with ${origin.binding.path} (${origin.binding.policyVersion}) cannot be re-established`, policy.binding.path));
    if (!await policyCurrent()) return policyChanged();
    const authority = bindCurrentEffectiveUrlRun(run, sources.effectiveRunDeclaration, {
      baseSha256: declaration.baseRunSha256, sidecarSha256: read.sidecarSha256,
    });
    const current = (): boolean => authority !== null && stillStopped() && authority();
    const clockCurrent = (): boolean => now() < deadline;
    const expected = { run, runId: state.runId, generation: state.stopGeneration, coreSha256: declaration.baseRunSha256,
      declarationSha256: read.sidecarSha256, sourcePin: declaration.pinnedCommit, deadline };
    const history = readUrlStoppedBoundaryChain(URL_HOST_ROOT, expected, now());
    const sealed = history?.at(-1);
    if (!history || !sealed || !current() || sealed.record.products.coreSha256 !== expected.coreSha256
      || sealed.record.products.declarationSha256 !== expected.declarationSha256
      || verifyUrlFrozenProductHistory(run, sealed.record.products, current) === null) return refuse('checkpoint');
    const historyCurrent = (): boolean => {
      const actual = readUrlStoppedBoundaryChain(URL_HOST_ROOT, expected, now());
      return actual !== null && actual.length === history.length
        && actual.every((boundary, index) => boundary.sha256 === history[index]!.sha256);
    };
    const placement = placementSubjectOf(record.subject);
    const screen = buildDossierScreen(policy.bytes, true, placement, placement.visibility);
    if (!screen.ok) return refuse('policy', restartExplanation(screen.why, declaration.basePolicy.path));
    let executable: string;
    try { executable = fs.realpathSync(path.join(os.homedir(), '.local/share/claude/versions', URL_CLI_PROGRAM.version)); }
    catch { return refuse('runtime'); }
    if (!runtime.ok || runtime.runtime.profileRegistrySha256 !== declaration.inference.profile.sha256
      || declaration.inference.toolVersion !== URL_CLI_PROGRAM.version || !await verifySupportedUrlCli(executable)) return refuse('runtime');
    const openReader = bindUrlSourceReader({ clone: record.subject.clone.path, revision: declaration.pinnedCommit,
      store: sealed.record.sourceStore, current: clockCurrent });
    const checked = await reverifyPinnedRevision(run, sources, now(), { openReader });
    if (!checked.ok) {
      const policyRefusal = checked.refusals.find(item => item.code === 'policy' || item.code === 'policy-changed');
      return policyRefusal === undefined ? refuse('source') : refuse('policy', policyRefusal.reason);
    }
    if (checked.revision.commit !== declaration.pinnedCommit || checked.sidecarSha256 !== read.sidecarSha256
      || !current()) return refuse('source');
    const brief = sealed.record.products.records.find(file => file.path === RUN_LAYOUT.briefRecord);
    if (!brief) return refuse('checkpoint');
    const briefBytes = snapshotProductFile(run, RUN_LAYOUT.briefRecord, brief.bytes, () => {
      if (!clockCurrent()) throw new Error('url-recovery-expired');
    }).bytes;
    if (briefBytes === null || briefBytes.length !== brief.bytes || sha256(briefBytes) !== brief.sha256) return refuse('checkpoint');
    const briefText = decodeUtf8(briefBytes);
    if (briefText === undefined) return refuse('checkpoint');
    const briefRecord = parseBoundedJson(briefText, CANONICAL_LIMITS);
    if (!isRecord(briefRecord) || briefRecord.issuedAt !== new Date(state.briefIssuedAt).toISOString()) return refuse('checkpoint');
    const governanceRoot = path.join(root, '.syzygy');
    const protectedRoot = path.join(URL_HOST_ROOT, 'acquisitions', sealed.record.machineAttempt, 'machine-lifecycle');
    const binding = { controllerSha256: runtime.runtime.inputTreeSha256,
      parentBindingSha256: sha256(encodeCanonicalJson({ rowId: adoption.rowId, landedCommit: adoption.landedCommit,
        tagObject: adoption.tagObject, subjects: adoption.subjects }, CANONICAL_LIMITS)) };
    const profiles = Object.fromEntries(declaration.roles.map(role => [role.role, role.compiledProfileSha256])) as Readonly<Record<ViewRole, string>>;
    const retainedLaunches = Object.fromEntries(declaration.roles.filter(role => Object.hasOwn(URL_HELPER_LAUNCH_FILES, role.role))
      .map(role => [role.role, { run, runId: expected.runId, coreSha256: expected.coreSha256, declarationSha256: expected.declarationSha256,
        roleDeclaration: role, executable, screen: screen.screen }]));
    let machine: Awaited<ReturnType<typeof reconstructColdUrlRunMachineHistory>> = null;
    let audit: Awaited<ReturnType<typeof verifyUrlSessionAuditHistory>> = null;
    const historicallySettledRoles = new Set<ViewRole>();
    const verifiedAudits: NonNullable<Awaited<ReturnType<typeof verifyUrlSessionAuditHistory>>>[] = [];
    let requests = 0, responses = 0, tokens = 0, cumulativeQuestionCount = 0, nextDesignRound = 1;
    for (const boundary of history) {
      machine = await reconstructColdUrlRunMachineHistory({ governanceRoot, protectedRoot, sealed: boundary.record.machine,
        expected: { identitySha256: sealed.record.machine.identitySha256, binding, runId: expected.runId,
          sourcePin: expected.sourcePin, originPolicySha256: origin.binding.sha256, profiles, deadline }, now, current });
      if (!machine || !current()) return refuse('machine-history');
      audit = await verifyUrlSessionAuditHistory({ parent: path.join(URL_HOST_ROOT, 'acquisitions', boundary.record.attempt),
        name: 'sessions', expected: boundary.record.audit, retainedLaunches, machineHistory: machine, current, deadline });
      if (!audit || !current()) return refuse('session-history');
      for (const attempt of boundary.record.audit.ordered ?? []) {
        if (attempt.plan.manifest.binding.transferEpoch !== nextDesignRound++) return refuse('session-history');
      }
      verifiedAudits.push(audit);
      for (const role of audit.capturedSettledRoles) historicallySettledRoles.add(role);
      requests += audit.capturedCompleteExchanges + audit.capturedCountExchanges;
      responses += audit.capturedCompleteExchanges;
      tokens += audit.capturedReportedTokens === 'Unknown' ? 0 : audit.capturedReportedTokens;
      cumulativeQuestionCount += audit.capturedQuestions;
      const spend = boundary.record.spend;
      if (![requests, responses, tokens, cumulativeQuestionCount].every(Number.isSafeInteger)
        || cumulativeQuestionCount > record.declared.maxQuestions
        || spend.requestReservations !== requests || spend.completeUsageReports !== responses
        || spend.reportedTokens !== (responses === 0 ? 'Unknown' : tokens)) return refuse('budget');
    }
    if (!machine || !audit) return refuse('machine-history');
    const resumeBudget = prepareUrlBudgetResume({ spend: sealed.record.spend, deadline,
      turnBudget: record.declared.agentTurnBudget, tokenBudget: record.declared.agentTokenBudget, observedAt: now() });
    if (!resumeBudget) return refuse('budget');
    if (!await policyCurrent()) return policyChanged();
    if (!historyCurrent()
      || verifyUrlFrozenProductHistory(run, sealed.record.products, current) === null || !current()) return refuse('checkpoint');
    const products = verifyUrlRecoveryProducts({ hostRoot: URL_HOST_ROOT, expected, boundarySha256: sealed.sha256,
      machine, audits: verifiedAudits, now, current });
    if (!products || !current()) return refuse('checkpoint');
    const verified = Object.freeze({ ok: true as const, machine, record, audit, boundary: sealed, history,
      verifiedAudits: Object.freeze(verifiedAudits), historicallySettledRoles: Object.freeze([...historicallySettledRoles]),
      resumeBudget, products, cumulativeQuestionCount, nextDesignRound, checkedContext: Object.freeze({ runtime: runtime.runtime, executable,
        screen: screen.screen, policy, origin, adoption, policyGit: policyExecutor, openReader, authority, current, policyCurrent,
        effective: read.effective, sourceStore: sealed.record.sourceStore, deadline }) });
    verifiedRuns.set(verified, async () => {
      if (!await policyCurrent() || !current() || !historyCurrent()) return null;
      const claim = acquireUrlRecoveryClaim({ root: URL_HOST_ROOT, expected, sha256: sealed.sha256, now,
        current, policy: { current: () => committedUrlPoliciesCurrent(root, policy.binding, origin.binding, adoption, policyExecutor),
          currentAsync: policyCurrent } });
      if (!claim) return null;
      if (!await policyCurrent() || !claim.consume() || !claim.current()) { claim.release(); return null; }
      return claim;
    });
    retainedPolicyGit = true;
    return verified;
  } catch { return refuse('checkpoint'); }
  finally { if (!retainedPolicyGit) await policyGit?.close(); }
}
