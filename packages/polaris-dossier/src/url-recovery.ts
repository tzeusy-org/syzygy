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
import { committedUrlPoliciesCurrentAsync, readCommittedPolicy, readCommittedUrlOriginPolicy, samePolicy } from './policy-snapshot.js';
import type { SupervisorState } from './polaris.js';
import { reverifyPinnedRevision } from './reverify.js';
import { buildDossierScreen, placementSubjectOf } from './screen.js';
import { URL_CLI_PROGRAM, verifySupportedUrlCli } from './session-launch.js';
import type { ViewRole } from './session-view.js';
import { RUN_LAYOUT } from './state-directory.js';
import { URL_HELPER_LAUNCH_FILES } from './url-launch-history.js';
import { verifyUrlFrozenProductHistory } from './url-run-artifacts.js';
import { snapshotProductFile } from './url-product-reads.js';
import { readUrlRuntime } from './url-runtime.js';
import { verifyUrlSessionAuditHistory } from './url-session-audit-history.js';
import { bindUrlSourceReader } from './url-source-reader.js';
import { readUrlStoppedBoundary } from './url-stopped-run.js';

const CANONICAL_LIMITS = { maxBytes: 65_536, maxNodes: 4096, maxDepth: 16 };

function absent(run: string, file: string): boolean {
  try { fs.lstatSync(path.join(run, file)); }
  catch (error) { return (error as NodeJS.ErrnoException).code === 'ENOENT'; }
  return false;
}

/** Re-observe the protected stop boundary. The caller continues to exclude
 * writers until it makes a distinct, exclusive decision to start new work. */
export async function verifyStoppedUrlRun(state: SupervisorState, input: {
  readonly checkout: string; readonly sources: GateSources; readonly now: () => number;
}) {
  const run = state.run, { sources, now } = input, root = sources.recordsRoot;
  const deadline = state.briefIssuedAt + state.deadlineSeconds * 1000;
  const stillStopped = (): boolean => now() < deadline && absent(run, RUN_LAYOUT.record) && absent(run, RUN_LAYOUT.executionChoice);
  const refuse = (code: 'state' | 'policy' | 'runtime' | 'checkpoint' | 'source' | 'machine-history' | 'session-history' | 'budget') => ({ ok: false as const, code });
  try {
    if (state.stopGeneration === undefined || state.declarationSha256 === undefined || state.stopped === undefined || state.done !== undefined
      || !stillStopped() || sources.effectiveRunDeclaration === undefined) return refuse('state');
    const read = readEffectiveRunRecord(run, sources.effectiveRunDeclaration);
    if (!read.ok || read.effective.kind !== 'url' || read.sidecarSha256 !== state.declarationSha256) return refuse('state');
    const { declaration } = read.effective, record = read.core;
    if (declaration.runId !== state.runId || record.declared.deadline.seconds !== state.deadlineSeconds
      || record.subject.pinnedRevision.commit !== declaration.pinnedCommit || record.subject.clone.path !== state.clone
      || declaration.inference.model !== state.model || declaration.sourceTransport.originalLocator !== state.url) return refuse('state');
    const policy = readCommittedPolicy(root, declaration.basePolicy.path), origin = readCommittedUrlOriginPolicy(root);
    if (!policy.ok || !origin.ok || !samePolicy(policy.binding, declaration.basePolicy)
      || !samePolicy(origin.binding, declaration.originPolicy)) return refuse('policy');
    const adoption = readUrlParentAdoption(root, origin.binding.sha256);
    const policyCurrent = (): Promise<boolean> => adoption === null ? Promise.resolve(false)
      : committedUrlPoliciesCurrentAsync(root, policy.binding, origin.binding, adoption);
    if (adoption === null || !await policyCurrent()) return refuse('policy');
    const authority = bindCurrentEffectiveUrlRun(run, sources.effectiveRunDeclaration, {
      baseSha256: declaration.baseRunSha256, sidecarSha256: read.sidecarSha256,
    });
    const current = (): boolean => authority !== null && stillStopped() && authority();
    const clockCurrent = (): boolean => now() < deadline;
    const expected = { run, runId: state.runId, generation: state.stopGeneration, coreSha256: declaration.baseRunSha256,
      declarationSha256: read.sidecarSha256, sourcePin: declaration.pinnedCommit, deadline };
    const sealed = readUrlStoppedBoundary(URL_HOST_ROOT, expected, now());
    if (!sealed || !current() || sealed.record.products.coreSha256 !== expected.coreSha256
      || sealed.record.products.declarationSha256 !== expected.declarationSha256
      || verifyUrlFrozenProductHistory(run, sealed.record.products, current) === null) return refuse('checkpoint');
    const placement = placementSubjectOf(record.subject);
    const screen = buildDossierScreen(policy.bytes, true, placement, placement.visibility);
    if (!screen.ok) return refuse('policy');
    const runtime = await readUrlRuntime(input.checkout);
    let executable: string;
    try { executable = fs.realpathSync(path.join(os.homedir(), '.local/share/claude/versions', URL_CLI_PROGRAM.version)); }
    catch { return refuse('runtime'); }
    if (!runtime.ok || runtime.runtime.profileRegistrySha256 !== declaration.inference.profile.sha256
      || declaration.inference.toolVersion !== URL_CLI_PROGRAM.version || !await verifySupportedUrlCli(executable)) return refuse('runtime');
    const openReader = bindUrlSourceReader({ clone: record.subject.clone.path, revision: declaration.pinnedCommit,
      store: sealed.record.sourceStore, current: clockCurrent });
    const checked = await reverifyPinnedRevision(run, sources, now(), { openReader });
    if (!checked.ok || checked.revision.commit !== declaration.pinnedCommit || checked.sidecarSha256 !== read.sidecarSha256
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
    const auditParent = path.join(URL_HOST_ROOT, 'acquisitions', sealed.record.attempt);
    const governanceRoot = path.join(root, '.syzygy'), protectedRoot = path.join(auditParent, 'machine-lifecycle');
    const binding = { controllerSha256: runtime.runtime.inputTreeSha256,
      parentBindingSha256: sha256(encodeCanonicalJson({ rowId: adoption.rowId, landedCommit: adoption.landedCommit,
        tagObject: adoption.tagObject, subjects: adoption.subjects }, CANONICAL_LIMITS)) };
    const profiles = Object.fromEntries(declaration.roles.map(role => [role.role, role.compiledProfileSha256])) as Readonly<Record<ViewRole, string>>;
    const machine = await reconstructColdUrlRunMachineHistory({ governanceRoot, protectedRoot, sealed: sealed.record.machine,
      expected: { identitySha256: sealed.record.machine.identitySha256, binding, runId: expected.runId,
        sourcePin: expected.sourcePin, originPolicySha256: origin.binding.sha256, profiles, deadline }, now, current: stillStopped });
    if (!machine || !current()) return refuse('machine-history');
    const retainedLaunches = Object.fromEntries(declaration.roles.filter(role => Object.hasOwn(URL_HELPER_LAUNCH_FILES, role.role))
      .map(role => [role.role, { run, runId: expected.runId, coreSha256: expected.coreSha256, declarationSha256: expected.declarationSha256,
        roleDeclaration: role, executable, screen: screen.screen }]));
    const audit = await verifyUrlSessionAuditHistory({ parent: auditParent, name: 'sessions', expected: sealed.record.audit,
      retainedLaunches, machineHistory: machine, current: stillStopped });
    if (audit === null || !current()) return refuse('session-history');
    const spend = sealed.record.spend;
    if (spend.requestReservations !== audit.capturedCompleteExchanges + audit.capturedCountExchanges
      || spend.completeUsageReports !== audit.capturedCompleteExchanges || spend.reportedTokens !== audit.capturedReportedTokens
      || (record.declared.agentTurnBudget !== null && spend.requestReservations >= record.declared.agentTurnBudget)
      || (record.declared.agentTokenBudget !== null && spend.reportedTokens !== 'Unknown' && spend.reportedTokens >= record.declared.agentTokenBudget))
      return refuse('budget');
    if (!await policyCurrent() || readUrlStoppedBoundary(URL_HOST_ROOT, expected, now())?.sha256 !== sealed.sha256
      || verifyUrlFrozenProductHistory(run, sealed.record.products, current) === null || !current()) return refuse('checkpoint');
    return { ok: true as const, machine, record, audit, boundary: sealed };
  } catch { return refuse('checkpoint'); }
}
