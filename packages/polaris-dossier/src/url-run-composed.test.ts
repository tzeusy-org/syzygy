import * as fs from 'node:fs/promises';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { sha256 } from '@syzygy/support';
import { buildComposedRuntime, prepareComposedRun } from './url-run-composed.testkit.js';
import { draft, inventory, fidelityVerdict, designVerdict } from './full-run.testkit.js';
import { closeRun } from './close.js';
import * as rendering from './render.js';
import { RUN_LAYOUT } from './state-directory.js';
import { createCredentialProbe, credentialListFromEnv } from './credential-probe.js';
import { runPolarisCli, runUrlSupervisorLoop, type SupervisorState } from './polaris.js';
import { openUrlSupervisorStop, readUrlSupervisorState, requestUrlSupervisorStop, writeUrlSupervisorState } from './url-supervisor-state.js';
import { loadSessionCredential } from './session-credential.js';
import { startUrlRunSessions, type UrlRunSessions } from './url-run-sessions.js';
import { sessionRelayTestPort } from './session-relay.js';
import type { UrlRuntime } from './url-runtime.js';
import * as sessionAudit from './url-session-audit.js';
import { orderedDesignPlanInputForDelivery, planOrderedDesignBytes, type OrderedDesignPlan } from './url-design-delivery.js';
import { isOrderedDesignSessionProfile } from './session-profile.js';
import { reconstructColdUrlRunMachineHistory } from './url-machine-cold-history.js';
import { readVerifiedUrlAuditLaunches, verifyUrlSessionAuditHistory, type UrlSessionAuditHistoryOptions } from './url-session-audit-history.js';
import { verifyColdOrderedDesignAuditHistory } from './url-ordered-design-audit-history.js';
import * as recovery from './url-recovery.js';
import * as runMachine from './url-run-machine.js';
import * as policySnapshot from './policy-snapshot.js';

const recoveryHost = await vi.hoisted(async () => {
  const { homedir } = await import('node:os');
  const { join } = await import('node:path');
  return { root: join(homedir(), '.tmp', `url-composed-host-${process.pid}-${Date.now()}`) };
});
// Isolate the filesystem namespace while keeping its production store readers,
// mode registration, stop seals and exclusive claim machinery intact.
vi.mock('./url-mode-registry.js', async importOriginal => ({
  ...await importOriginal<typeof import('./url-mode-registry.js')>(), URL_HOST_ROOT: recoveryHost.root,
}));

type Forward = Parameters<typeof sessionRelayTestPort>[0];
const provider = vi.hoisted(() => new Map<string, Forward>());
const relayRoles = vi.hoisted(() => [] as string[]);
const settledProviderRoles = vi.hoisted(() => new Set<string>());
const finalResponseDelivery = vi.hoisted(() => ({ wait: null as Promise<void> | null }));
const relayObservations = vi.hoisted(() => [] as { role: string; event: string; route: string | null }[]);
// Keep the real host, machine mediation, policy, audit and relay. Replace only
// the relay's compiled provider boundary; this fixture performs no network send.
vi.mock('./session-relay.js', async importOriginal => {
  const actual = await importOriginal<typeof import('./session-relay.js')>();
  return { ...actual, startSessionRelay: (...args: Parameters<typeof actual.startSessionRelay>) => {
    relayRoles.push(args[1].binding.role);
    const selected = provider.get(args[1].binding.role);
    if (selected === undefined) throw new Error('owned composed provider not selected');
    const ports = args[2];
    return actual.sessionRelayTestPort(selected)(args[0], args[1], { ...ports,
      current: async () => {
        const barrier = args[1].binding.role !== 'design' && settledProviderRoles.has(args[1].binding.role) ? finalResponseDelivery.wait : null;
        if (barrier === null) return ports.current();
        if (!(await ports.current())) return false;
        // This post-audit guard is outside machine-store mediation. Holding an
        // audit callback would retain its exclusive lease and block other roles.
        await barrier;
        return ports.current();
      }, audit: async (event, context) => {
      relayObservations.push({ role: args[1].binding.role, event: event.event, route: event.route });
      await ports.audit(event, context);
      if (event.event === 'response-admitted' && event.response?.stopReason === 'end_turn') {
        settledProviderRoles.add(args[1].binding.role);
        // The next guard may wait only after this genuine durable append.
      }
    } }, args[3], args[4]);
  } };
});

type Fixture = Awaited<ReturnType<typeof prepareComposedRun>>;
type Tool = { readonly type: 'tool_use'; readonly id: string; readonly name: string; readonly input: Record<string, unknown> };
const canonical = (value: unknown) => encodeCanonicalJson(value, { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 });
const tool = (id: string, name: string, input: Record<string, unknown>): Tool => ({ type: 'tool_use', id: `toolu_owned_${id}`, name: `mcp__syzygy__${name}`, input });
const waitForAbort = (signal: AbortSignal): Promise<never> => new Promise((_, reject) => {
  if (signal.aborted) reject(new Error('owned provider stopped'));
  else signal.addEventListener('abort', () => reject(new Error('owned provider stopped')), { once: true });
});
type ScriptCall = Tool | { type: 'text'; text: string };
function scripted(role: string, calls: readonly (ScriptCall | (() => ScriptCall | Promise<ScriptCall>))[]) {
  const received: unknown[] = [];
  let count = 0, countQueries = 0, allow!: () => void;
  const gate = new Promise<void>(resolve => { allow = resolve; });
  const forward: Forward = async input => {
    if (input.route.includes('count_tokens')) {
      countQueries++;
      return { status: 200, contentType: 'application/json', body: Buffer.from('{"input_tokens":24000}'), requestFlushed: true };
    }
    await Promise.race([gate, waitForAbort(input.signal)]);
    await new Promise(resolve => setTimeout(resolve, 300));
    received.push(JSON.parse(Buffer.from(input.body).toString()));
    const next = calls[count++];
    const call = typeof next === 'function' ? await Promise.race([Promise.resolve(next()), waitForAbort(input.signal)]) : next;
    if (call === undefined) return waitForAbort(input.signal);
    const event = (type: string, value: Record<string, unknown>) => `event: ${type}\ndata: ${JSON.stringify({ type, ...value })}\n\n`;
    const body = event('message_start', { message: { id: `msg_owned_${role}_${count}`, type: 'message', role: 'assistant', model: 'claude-sonnet-4-6',
      content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 3, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } })
      + event('content_block_start', { index: 0, content_block: call.type === 'tool_use' ? { ...call, input: {} } : { type: 'text', text: '' } })
      + event('content_block_delta', { index: 0, delta: call.type === 'tool_use' ? { type: 'input_json_delta', partial_json: canonical(call.input) } : { type: 'text_delta', text: call.text } })
      + event('content_block_stop', { index: 0 })
      + event('message_delta', { delta: { stop_reason: call.type === 'tool_use' ? 'tool_use' : 'end_turn', stop_sequence: null }, usage: { output_tokens: 4 } })
      + event('message_stop', {});
    return { status: 200, contentType: 'text/event-stream', body: Buffer.from(body), requestFlushed: true };
  };
  provider.set(role, forward);
  return { allow, received, count: () => count, countQueries: () => countQueries };
}

let runtime: UrlRuntime;
const cleanup: (() => Promise<unknown>)[] = [];
beforeAll(async () => { await fs.mkdir(recoveryHost.root, { mode: 0o700 }); await fs.chmod(recoveryHost.root, 0o700); runtime = await buildComposedRuntime(); }, 60_000);
afterAll(async () => { if (process.env['SYZYGY_COMPOSED_RETAIN'] === undefined) await fs.rm(recoveryHost.root, { recursive: true, force: true }); });
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); provider.clear(); relayRoles.length = 0; relayObservations.length = 0; settledProviderRoles.clear(); finalResponseDelivery.wait = null; vi.restoreAllMocks(); vi.unstubAllEnvs(); });

type SeenReceipt = { role: string; id: string; digest: string; bytes: number; toolName: string; inputSha256: string; committed: boolean };
async function start(f: Fixture, failures: string[], onFailure: (reason: string) => void, receipts: SeenReceipt[], stopRequested: () => boolean) {
  const credential = await loadSessionCredential({ environment: { ANTHROPIC_API_KEY: 'OWN_SYNTHETIC_COMPOSED_CREDENTIAL' },
    credentialFile: path.join(f.hidden, 'no-ambient-credential.json'), now: Date.now });
  if (!credential.ok) throw new Error('owned composed credential refused');
  const prompt = (role: 'inventory' | 'fidelity' | 'design') => {
    const session = f.sessions.sessions.find(item => role === 'inventory' ? item.role === 'inventory' : item.role === 'review' && item.kind === role);
    if (!session) throw new Error('owned composed helper prompt absent');
    return session.promptSha256;
  };
  return startUrlRunSessions({ run: f.run, record: f.record, screen: f.screen, plans: f.plans, runtime,
    declaredClasses: f.declaration.plannedClasses, originPolicySha256: f.origin.binding.sha256,
    auditParent: f.hidden, auditName: 'sessions', principal: f.record.declared.operator,
    sessionDirectories: f.directories, canaries: f.canaries, current: f.current, now: Date.now, deadline: f.deadline,
    credential: credential.credential, sourceReader: f.openReader, stopRequested,
    production: { ...(f.machine ?? { governanceRoot: path.join(f.root, 'observing/.syzygy'), protectedRoot: path.join(f.hidden, 'machine'),
      parent: { rowId: 'A-1', landedCommit: 'a'.repeat(40), defaultCommit: 'a'.repeat(40), tagObject: 'b'.repeat(40),
        subjects: [{ path: f.origin.binding.path, sha256: f.origin.binding.sha256 }] } }), current: f.current,
      policyBytes: f.policy.bytes, artifacts: f.artifacts },
    launchHistory: { promptDigests: { inventory: prompt('inventory'), fidelity: prompt('fidelity'), design: prompt('design') }, register: f.artifacts.registerLaunchHistory },
    runDossier: f.artifacts.runDossier, artifactOrigins: f.artifacts.artifactOrigins, dossierOrigins: f.artifacts.dossierOrigins,
    toolReceipt: async (role, receipt, admission, current) => {
      const result = await f.artifacts.toolReceipt(role, receipt, admission, current);
      receipts.push({ role, id: receipt.id, digest: receipt.digest, bytes: receipt.bytes, toolName: receipt.toolName,
        inputSha256: sha256(canonical(receipt.toolInput)), committed: false });
      return result;
    }, toolReceiptCommitted: (role, id) => {
      f.artifacts.committed(role, id);
      const receipt = receipts.find(receipt => receipt.role === role && receipt.id === id); if (receipt) receipt.committed = true;
    },
    ask: async () => { throw new Error('owned composed run asks no question'); }, onFailure: reason => { failures.push(reason); onFailure(reason); },
  });
}

describe('composed URL run with actual role processes', { timeout: 360_000 }, () => {
  // The stop variant controls callback scheduling at one captured cut; it does
  // not claim that arbitrary practical stops have complete provider exchanges.
  it.each(['complete', 'delivery-stop', 'stop-resume', 'eligible-stop-resume'] as const)('runs the genuine production pipeline to %s', async scenario => {
    const eligibleStop = scenario === 'eligible-stop-resume';
    const cut = scenario === 'delivery-stop' || scenario === 'stop-resume';
    const stoppingCut = cut || eligibleStop, resumeAfterStop = scenario === 'stop-resume' || eligibleStop;
    const resumeChecks: unknown[] = [];
    let releaseFinalResponses!: () => void;
    if (stoppingCut) finalResponseDelivery.wait = new Promise<void>(resolve => { releaseFinalResponses = resolve; });
    const ordinary = ['author', 'inventory', 'fidelity'] as const;
    const releaseProvider = new Map<(typeof ordinary)[number], () => void>();
    const finalResponse = (role: (typeof ordinary)[number]): (() => Promise<ScriptCall>)[] => {
      if (!stoppingCut) return [];
      const released = new Promise<void>(resolve => { releaseProvider.set(role, resolve); });
      return [async () => {
        await released;
        return { type: 'text', text: 'OWN ROLE COMPLETE AT CONTROLLED STOP' };
      }];
    };
    const settleOrdinaryResponses = async () => {
      const until = performance.now() + 5_000;
      // Create an audit boundary with no outstanding ordinary exchanges.
      // Settle each synthetic end-turn separately against the live machine.
      for (const role of ordinary) {
        releaseProvider.get(role)!();
        while (!settledProviderRoles.has(role) && performance.now() < until)
          await new Promise(resolve => setTimeout(resolve, 5));
        expect(settledProviderRoles.has(role), `${role} end-turn audit at the owned stop`).toBe(true);
      }
    };
    const liveFinals: sessionAudit.UrlDesignRenderContinuation[] = [], coldFinals: sessionAudit.UrlDesignRenderContinuation[] = [];
    let finalProductAssertions = 0, finalSiteBeforeStop = -1;
    if (eligibleStop) {
      const assertFinal = sessionAudit.assertUrlFinalDesignProduct;
      vi.spyOn(sessionAudit, 'assertUrlFinalDesignProduct').mockImplementation((...args) => { assertFinal(...args); finalProductAssertions++; });
      const recoverFinal = sessionAudit.recoverUrlDesignRenderContinuation;
      vi.spyOn(sessionAudit, 'recoverUrlDesignRenderContinuation').mockImplementation(async input => {
        const result = await recoverFinal(input);
        resumeChecks.push({ phase: 'cold-final-factory', issued: result !== null });
        expect(result).not.toBeNull();
        sessionAudit.assertUrlDesignRenderContinuationCurrent(result!);
        expect(() => sessionAudit.assertUrlDesignRenderContinuationCurrent({ ...result! })).toThrow();
        const priorIds = new Set(liveFinals[0]!.original.parents.map(parent => parent.id));
        const freshIds = result!.original.parents.filter(parent => !priorIds.has(parent.id));
        expect(freshIds.length).toBeGreaterThan(0);
        expect(result!.original.semanticParentsSha256).toBe(liveFinals[0]!.original.semanticParentsSha256);
        expect(result!.original.semanticInputsSha256).toBe(liveFinals[0]!.original.semanticInputsSha256);
        coldFinals.push(result!);
        return result;
      });
    }
    const reproducedAtDesignHostCount: number[] = [];
    const deliveryReproductions: number[][] = [];
    if (stoppingCut) {
      const reproduce = rendering.reproduceUrlRender;
      vi.spyOn(rendering, 'reproduceUrlRender').mockImplementation(async (...args) => {
        const result = await reproduce(...args);
        if (result) reproducedAtDesignHostCount.push(relayRoles.filter(role => role === 'design').length);
        return result;
      });
    }
    let delivered: sessionAudit.UrlDesignDeliveryView | undefined;
    let expectedPlan: OrderedDesignPlan | undefined;
    const beginOrdered = vi.fn(), resumedBegins = vi.fn();
    const createAudit = sessionAudit.createUrlSessionAudit;
    let cutTaken = false, resumeGuardsChecked = false;
    if (stoppingCut) vi.spyOn(sessionAudit, 'createUrlSessionAudit').mockImplementation(async options => {
      if (cutTaken && resumeAfterStop && !resumeGuardsChecked) {
        // Exercise the exact callback supplied by the public resumed producer,
        // while its genuine consumed claim is held and before any audit write.
        const policyFile = path.join(f.observer!.root, f.policy.binding.path);
        const policyBytes = await fs.readFile(policyFile);
        try {
          await fs.appendFile(policyFile, '\n');
          expect(await options.current()).toBe(false);
        } finally { await fs.writeFile(policyFile, policyBytes); }
        expect(await options.current()).toBe(true);
        const lock = path.join(recoveryHost.root, `${sha256(f.run)}.recovery.lock`);
        const withdrawn = `${lock}.controlled-withdrawal`;
        const policyCurrent = policySnapshot.committedUrlPoliciesCurrentAsync;
        let reportChecked!: () => void, releasePolicy!: () => void;
        const checkedPolicy = new Promise<void>(resolve => { reportChecked = resolve; });
        const policyHold = new Promise<void>(resolve => { releasePolicy = resolve; });
        const pausePolicy = vi.spyOn(policySnapshot, 'committedUrlPoliciesCurrentAsync').mockImplementationOnce(async (...args) => {
          const current = await policyCurrent(...args);
          expect(current).toBe(true);
          reportChecked();
          await policyHold;
          return current;
        });
        try {
          const pending = options.current();
          expect(await Promise.race([checkedPolicy.then(() => 'checking-policy'), Promise.resolve(pending).then(() => 'finished')]))
            .toBe('checking-policy');
          await fs.rename(lock, withdrawn);
          try {
            releasePolicy();
            expect(await pending).toBe(false);
          } finally { await fs.rename(withdrawn, lock); }
        } finally {
          releasePolicy();
          pausePolicy.mockRestore();
        }
        expect(await options.current()).toBe(true);
        resumeGuardsChecked = true;
        resumeChecks.push({ phase: 'resumed-guards', policyWithdrawal: 'refused', claimWithdrawal: 'refused' });
      }
      const resumedAudit = cutTaken;
      const actual = await createAudit(options);
      if (!actual.ok) return actual;
      return { ...actual,
        beginOrderedDesignAudit: (...args) => { (resumedAudit ? resumedBegins : beginOrdered)(); return actual.beginOrderedDesignAudit(...args); },
        commitDesignDelivery: async (...args) => {
          // The actual issuer confirms the delivery before this interruption.
          // No writer, lease, receipt or history is synthesized by the test.
          const view = await actual.commitDesignDelivery(...args);
          deliveryReproductions.push(reproducedAtDesignHostCount.slice(-2));
          if (resumedAudit) return view;
          const profile = f.plans.find(plan => plan.role === 'design')!.profile;
          if (!isOrderedDesignSessionProfile(profile)) throw new Error('owned ordered profile absent');
          expectedPlan = planOrderedDesignBytes({ ...orderedDesignPlanInputForDelivery(profile, view.receipt,
            args[0].expectedProduct, f.commit, f.deadline), envelope: view.view });
          delivered = view;
          if (!cut) return view;
          cutTaken = true;
          // Complete the already observed ordinary exchanges, then begin the
          // real stop before allowing their final delivery guards to recheck.
          await settleOrdinaryResponses();
          void beginOwnedStop().catch(() => {});
          throw new Error('owned interruption after confirmed design delivery');
        },
      };
    });
    const f = await prepareComposedRun(runtime, resumeAfterStop ? { hostRoot: recoveryHost.root } : undefined); cleanup.push(f.close);
    const writeEvidence = async (result: Record<string, unknown>) => {
      const file = process.env['SYZYGY_F3_NATIVE_EVIDENCE_FILE'];
      if (file !== undefined) await fs.writeFile(file, JSON.stringify({ scenario, inputTreeSha256: runtime.inputTreeSha256,
        profileRegistrySha256: runtime.profileRegistrySha256,
        profiles: f.plans.map(plan => ({ role: plan.role, id: plan.profile.id, sha256: plan.profile.digest })), ...result }, null, 2));
    };
    const session = (role: string) => f.plans.find(plan => plan.role === role)!.profile.input.sessionId;
    const sourceReads = (role: string) => ['src/kestrel.c', 'docs/notes.txt'].map((file, index) => tool(`source_${role === 'author' ? 1 : 2}_${index}`, 'source_read', { path: file }));
    const author = scripted('author', [tool('brief', 'artifact_read', { path: 'brief.md' }), tool('schema', 'artifact_read', { path: 'draft.schema.json' }),
      ...sourceReads('author'), tool('draft', 'artifact_write', { path: 'drafts/next.json', content: canonical({ ...draft(f.commit),
        schemaVersion: 'polaris-dossier-local-draft-v7', thesisBasis: 'stated', sessionId: session('author'), executions: [] }) }),
      tool('check', 'dossier_step', { argv: ['dossier', 'check', f.run] }), ...finalResponse('author')]);
    const inv = scripted('inventory', [tool('inventory_await', 'dossier_step', { argv: ['dossier', 'await', f.directories.inventory] }),
      tool('inventory_brief', 'artifact_read', { path: 'inventory-brief.md' }), ...sourceReads('inventory'),
      tool('inventory_submit', 'dossier_step', { argv: ['dossier', 'await', f.directories.inventory, '--submit', 'inventory.json', '--stdin'],
        stdin: canonical({ ...inventory(f.commit), sessionId: session('inventory') }) }), ...finalResponse('inventory')]);
    const resultTexts = (requests: readonly unknown[]): Record<string, unknown>[] => {
      const results: Record<string, unknown>[] = [];
      const visit = (value: unknown): void => {
        if (typeof value === 'string') { try { const doc = JSON.parse(value); if (doc && typeof doc === 'object') results.push(doc); } catch { /* Native reminder or ordinary prose. */ } }
        else if (Array.isArray(value)) for (const child of value) visit(child);
        else if (value && typeof value === 'object') for (const child of Object.values(value)) visit(child);
      };
      for (const request of requests) visit(request);
      return results;
    };
    const fidelity = scripted('fidelity', [tool('fidelity_await', 'dossier_step', { argv: ['dossier', 'await', f.directories.fidelity] }),
      tool('fidelity_packet', 'artifact_read', { path: 'round-1/packet.json' }), () => {
        const artifact = resultTexts(fidelity.received).reverse().find(value => value.kind === 'artifact' && value.path === 'round-1/packet.json');
        if (typeof artifact?.text !== 'string' || typeof artifact.sha256 !== 'string') throw new Error('complete native fidelity packet absent');
        const packet = JSON.parse(artifact.text) as { spans: { id: string; path: string; startLine: number }[] };
        return tool('fidelity_submit', 'dossier_step', { argv: ['dossier', 'await', f.directories.fidelity, '--submit', 'round-1/verdict.json', '--stdin'],
          stdin: canonical({ ...fidelityVerdict(f.commit, artifact.sha256, packet.spans), sessionId: session('fidelity') }) });
      }, ...finalResponse('fidelity')]);
    let designRound = 1;
    const design = scripted('design', [tool('design_poll', 'dossier_step', { argv: ['dossier', 'poll', f.runId] }),
      () => tool('design_part_1', 'artifact_read', { path: `round-${designRound}/design-view-part-1.json` }),
      () => tool('design_part_2', 'artifact_read', { path: `round-${designRound}/design-view-part-2.json` }), () => {
        const rows = resultTexts(design.received).filter(value => value.kind === 'design-view-part');
        const parts = [1, 2].map(ordinal => [...rows].reverse().find(row => row.ordinal === ordinal));
        if (parts.some(part => typeof part?.text !== 'string')) throw new Error('complete native ordered design parts absent');
        const view = JSON.parse(parts.map(part => part!.text).join('')) as { originalSha256: string; payload: string };
        const inverse: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
        const packet = JSON.parse(view.payload.replace(/&(?:amp|lt|gt|quot|#39);/gu, entity => inverse[entity]!)) as { files: { path: string }[] };
        const pages = packet.files.filter(file => file.path.endsWith('.html')).map(file => file.path);
        return tool('design_submit', 'dossier_step', { argv: ['dossier', 'await', '/work', '--submit', `round-${designRound}/verdict.json`, '--stdin'],
          stdin: canonical({ ...designVerdict(f.commit, view.originalSha256, pages), sessionId: session('design') }) });
      }, { type: 'text', text: 'SYZYGY_DESIGN_TRANSFER_COMPLETE' }]);
    const events: string[] = [], draws: string[][] = [], failures: string[] = [], receipts: SeenReceipt[] = [];
    const stateRoot = path.dirname(f.run);
    const state: SupervisorState = { format: 'polaris-supervisor/2', mode: f.declaration.mode, declarationSha256: sha256(f.effectiveDeclaration.bytes),
      run: f.run, runId: f.runId, tmuxSession: 'polaris-owncomposed', clone: f.record.subject.clone.path, url: f.declaration.sourceTransport.originalLocator,
      model: f.record.declared.model, authorSkipPermissions: false, briefIssuedAt: Date.parse(f.brief.issuedAt), deadlineSeconds: f.record.declared.deadline.seconds,
      sessions: ['author', 'inventory', 'fidelity', 'design'].map(role => {
        const issued = role === 'author' ? f.brief : f.sessions.sessions.find(item => role === 'inventory' ? item.role === role : item.kind === role)!;
        return { role: role as 'author' | 'inventory' | 'fidelity' | 'design', session: 1, directory: f.directories[role as keyof typeof f.directories],
          prompt: '', promptSha256: role === 'author' ? sha256(f.plans[0]!.profile.input.initialPrompt) : (issued as { promptSha256: string }).promptSha256, allowedTools: null };
      }), fidelityDeliveredFor: [], designDeliveredFor: [], fidelityDeliveredPairs: [], notified: [], siteFor: {}, launches: [], stopGeneration: 'c'.repeat(32) };
    try { writeUrlSupervisorState(stateRoot, state); } catch { throw new Error(`own state: ${JSON.stringify(state)}`); }
    const stop = openUrlSupervisorStop(stateRoot, state); cleanup.push(async () => stop.close());
    const controller = await start(f, failures, () => {}, receipts, () => stop.status() === 'requested').catch(async () => {
      const audit = [];
      for (const role of ['author', 'inventory', 'fidelity', 'design']) {
        const text = await fs.readFile(path.join(f.hidden, `sessions-${role}.jsonl`), 'utf8').catch(() => '');
        for (const line of text.split('\n').filter(Boolean)) {
          const row = JSON.parse(line) as { event: { kind: string; payload: unknown } };
          audit.push({ role, kind: row.event.kind, payload: row.event.payload });
        }
      }
      throw new Error(JSON.stringify({ ownStartFailure: failures, relayRoles, audit }));
    }); cleanup.push(controller.stop);
    function beginOwnedStop() {
      try {
        if (resumeAfterStop) requestUrlSupervisorStop(stateRoot, state);
        return controller.stop();
      } finally { releaseFinalResponses(); }
    }
    const observedRuntime: UrlRunSessions = !eligibleStop ? controller : { ...controller,
      prepareFinalRender: async (...args) => {
        const proof = await controller.prepareFinalRender(...args);
        if (proof !== null) liveFinals.push(proof);
        return proof;
      },
      stop: async () => {
        if (cutTaken || finalProductAssertions !== 3) return controller.stop();
        // This is the production cleanup entry after final render/reproduction,
        // before its stop decision and write-once execution record.
        expect(liveFinals).toHaveLength(2);
        expect(finalProductAssertions).toBe(3);
        expect(await fs.stat(path.join(f.run, RUN_LAYOUT.record)).then(() => true, () => false)).toBe(false);
        for (const entry of await fs.readdir(path.join(f.run, RUN_LAYOUT.site)))
          if (/^(?:0|[1-9][0-9]*)$/u.test(entry)) finalSiteBeforeStop = Math.max(finalSiteBeforeStop, Number(entry));
        expect(finalSiteBeforeStop).toBeGreaterThan(state.siteFor['0']!);
        await settleOrdinaryResponses();
        cutTaken = true;
        return beginOwnedStop();
      },
    };
    const loop = runUrlSupervisorLoop(stateRoot, f.ports, state, { event: message => events.push(message), draw: lines => draws.push([...lines]) }, {
      prepared: { record: f.record, roles: f.plans, effectiveDeclaration: f.effectiveDeclaration, screen: f.screen, renderer: f.renderer, origins: f.origins,
        current: f.current, openReader: f.openReader, directories: f.directories, auditDirectory: f.hidden, sourceStore: 'owned-loose' },
      artifacts: f.artifacts, runtime: observedRuntime, stop,
    });
    author.allow();
    try {
      const authorPassed = () => {
        try { return f.artifacts.latestStageCheck('author')?.record.outcome === 'passed'; }
        catch (error) { if (error instanceof Error && error.message === 'url-run-artifacts-unavailable') return false; throw error; }
      };
      const until = performance.now() + 60_000;
      while (!authorPassed() && failures.length === 0 && performance.now() < until)
        await new Promise(resolve => setTimeout(resolve, 250));
      expect(failures).toEqual([]);
      inv.allow(); design.allow();
      const packetUntil = performance.now() + 60_000;
      while (!state.fidelityDeliveredPairs?.includes('0/0') && failures.length === 0 && state.stopped === undefined && performance.now() < packetUntil)
        await new Promise(resolve => setTimeout(resolve, 250));
      fidelity.allow();
      if (stoppingCut) {
        expect(await loop).toBe(1);
        const stopped = await controller.stop();
        expect(delivered).toBeDefined();
        expect(expectedPlan).toBeDefined();
        expect(deliveryReproductions).toEqual([[0, 0]]);
        if (cut) {
          expect(beginOrdered).not.toHaveBeenCalled();
          expect(stopped.audit).toMatchObject({ closed: true, poisoned: false, captured: { 'design-delivery': 1, 'design-ordered': 0 } });
          expect(stopped.closedAuditHistory?.ordered).toEqual([{
            profileInput: f.plans.find(plan => plan.role === 'design')!.profile.input,
            plan: expectedPlan, principal: f.record.declared.operator,
            scope: stopped.closedAuditHistory!.declarations.design.scope,
            receipt: delivered!.receipt, disposition: { kind: 'stopped', tip: null },
          }]);
        } else {
          expect(beginOrdered).toHaveBeenCalledTimes(1);
          expect(stopped.audit).toMatchObject({ closed: true, poisoned: false, captured: { 'design-delivery': 1, 'ordered-design-verdict': 1 } });
          expect(stopped.closedAuditHistory?.ordered).toHaveLength(1);
          expect(stopped.closedAuditHistory!.ordered![0]).toMatchObject({ plan: expectedPlan, receipt: delivered!.receipt, disposition: { kind: 'eligible' } });
        }
        expect(stopped.closedMachineHistory).toBeDefined();
        const sealed = stopped.closedMachineHistory!;
        const machine = await reconstructColdUrlRunMachineHistory({
          governanceRoot: f.machine?.governanceRoot ?? path.join(f.root, 'observing/.syzygy'),
          protectedRoot: f.machine?.protectedRoot ?? path.join(f.hidden, 'machine'), sealed, expected: { identitySha256: sealed.identitySha256, binding: sealed.binding, runId: f.runId,
            sourcePin: f.commit, originPolicySha256: f.origin.binding.sha256,
            profiles: Object.fromEntries(f.plans.map(plan => [plan.role, plan.profile.digest])) as Record<'author' | 'inventory' | 'fidelity' | 'design', string>,
            deadline: f.deadline }, now: Date.now, current: f.current,
        });
        expect(machine, 'the real clean-close machine seal must reconstruct').not.toBeNull();
        const retainedLaunches: NonNullable<UrlSessionAuditHistoryOptions['retainedLaunches']> = Object.fromEntries(
          f.plans.filter(plan => plan.role !== 'author').map(plan => [plan.role, {
            run: f.run, runId: f.runId, coreSha256: f.declaration.baseRunSha256,
            declarationSha256: sha256(f.effectiveDeclaration.bytes), roleDeclaration: plan.declaration,
            executable: plan.view.cliExecutable, screen: f.screen,
          }]));
        const options: UrlSessionAuditHistoryOptions = { parent: f.hidden, name: 'sessions', expected: stopped.closedAuditHistory!,
          current: f.current, deadline: f.deadline, retainedLaunches,
          machineHistory: { identitySha256: machine!.identitySha256, snapshots: machine!.snapshots } };
        const retainedCut = process.env['SYZYGY_COMPOSED_RETAIN'];
        if (retainedCut !== undefined) {
          cleanup.splice(cleanup.indexOf(f.close), 1);
          await fs.writeFile(retainedCut, JSON.stringify({ run: f.run, hidden: f.hidden, root: f.root,
            governanceRoot: f.machine?.governanceRoot, protectedRoot: f.machine?.protectedRoot,
            deadline: f.deadline, policy: Buffer.from(f.policy.bytes).toString('base64'),
            expected: stopped.closedAuditHistory, sealed: stopped.closedMachineHistory,
            retainedLaunches: Object.fromEntries(Object.entries(retainedLaunches).map(([role, subject]) => [role, { ...subject, screen: undefined }])) }, null, 2));
        }
        const verified = await verifyUrlSessionAuditHistory(options);
        expect(verified, 'the closed full audit must accept the confirmed stopped delivery').toMatchObject({ authorization: 'none', replay: 'forbidden', completeness: 'Unknown', capturedHelperLaunches: 3 });
        expect(readVerifiedUrlAuditLaunches(verified)?.ordered).toEqual(stopped.closedAuditHistory!.ordered);
        if (cut) expect(readVerifiedUrlAuditLaunches(verified)?.ordered[0]!.disposition).toEqual({ kind: 'stopped', tip: null });
        const rows = (await fs.readFile(path.join(f.hidden, 'sessions-design.jsonl'), 'utf8')).trim().split('\n')
          .map(line => JSON.parse(line)).filter(row => ['design-delivery', 'design-ordered', 'ordered-design-verdict'].includes(row.event.kind));
        if (cut) expect(rows.map(row => row.event.kind)).toEqual(['design-delivery']);
        const coldOrdered = verifyColdOrderedDesignAuditHistory({ rows, attempts: stopped.closedAuditHistory!.ordered!,
          profileSha256: f.plans.find(plan => plan.role === 'design')!.profile.digest, firstEpoch: 1,
          subject: { project: 'project:syzygy', pin: f.commit, principal: f.record.declared.operator,
            deadline: new Date(f.deadline).toISOString() }, asOf: Date.now() });
        expect(coldOrdered).toMatchObject({ authorization: 'none', replay: 'forbidden',
          attempts: [{ epoch: 1, disposition: eligibleStop ? 'eligible' : 'stopped', ...(cut ? { recordCount: 0 } : {}) }] });
        expect(await verifyUrlSessionAuditHistory({ ...options, deadline: f.deadline + 1 })).toBeNull();
        expect(await verifyUrlSessionAuditHistory({ ...options, deadline: undefined })).toBeNull();
        if (resumeAfterStop) {
          expect(events.at(-1)).toBe('run ended: operator stop requested, checked history retained');
          expect(stopped.failure).toBeNull();
          expect(stopped.budget.pendingRoles).toEqual([]);
          if (cut) expect(design.count()).toBe(0);
          const launchesBeforeResume = [...relayRoles];
          const forwardsBeforeResume = [author.count(), inv.count(), fidelity.count(), design.count()];
          const oldDesignPid = stopped.roles.find(role => role.role === 'design')!.pid;
          const verifiedCuts: Awaited<ReturnType<typeof recovery.verifyStoppedUrlRun>>[] = [];
          const verify = recovery.verifyStoppedUrlRun, claim = recovery.claimStoppedUrlRun;
          vi.spyOn(recovery, 'verifyStoppedUrlRun').mockImplementation(async (...args) => {
            const result = await verify(...args); verifiedCuts.push(result);
            resumeChecks.push(result.ok ? { phase: 'verify', ok: true, nextDesignRound: result.nextDesignRound } : { phase: 'verify', ...result }); return result;
          });
          let claimedExactCut = false;
          vi.spyOn(recovery, 'claimStoppedUrlRun').mockImplementation(async value => {
            expect(verifiedCuts).toContain(value);
            const result = await claim(value);
            claimedExactCut = recovery.isClaimedStoppedUrlRun(value, result);
            expect(claimedExactCut).toBe(true);
            resumeChecks.push({ phase: 'claim', exactCut: claimedExactCut, current: result?.current() });
            return result;
          });
          const createMachine = runMachine.createUrlRunMachine;
          const machineChecks: { current: boolean; claimChecks: number; withdrawn: boolean }[] = [];
          vi.spyOn(runMachine, 'createUrlRunMachine').mockImplementationOnce(async options => {
            const machine = await createMachine(options);
            const checkClaim = vi.spyOn(recovery, 'isClaimedStoppedUrlRun');
            const current = machine.current(), claimChecks = checkClaim.mock.calls.length;
            checkClaim.mockRestore();
            const lock = path.join(recoveryHost.root, `${sha256(f.run)}.recovery.lock`);
            const withdrawn = `${lock}.machine-withdrawal`;
            await fs.rename(lock, withdrawn);
            try {
              const observation = { current, claimChecks, withdrawn: !machine.current() };
              machineChecks.push(observation);
              resumeChecks.push({ phase: 'machine-claim', ...observation });
            } finally { await fs.rename(withdrawn, lock); }
            return machine;
          });
          if (cut) designRound = 2;
          vi.stubEnv('CLAUDE_CODE_OAUTH_TOKEN', undefined);
          vi.stubEnv('ANTHROPIC_API_KEY', 'OWN_SYNTHETIC_COMPOSED_CREDENTIAL');
          const exit = await runPolarisCli(['--supervise', '--resume', f.run, '--state-root', stateRoot], f.ports);
          expect(machineChecks).toEqual([{ current: true, claimChecks: 1, withdrawn: true }]);
          expect(exit).toBe(0);
          expect(verifiedCuts).toHaveLength(1);
          expect(verifiedCuts[0]).toMatchObject({ ok: true, nextDesignRound: 2,
            boundary: { record: { products: { format: 'polaris-url-frozen-products/2' } } } });
          expect(claimedExactCut).toBe(true);
          const resumed = readUrlSupervisorState(stateRoot, f.runId);
          expect(resumed?.done).toBeDefined();
          expect(resumed!.finalSite!.site).toBeGreaterThan(resumed!.siteFor['0']!);
          const recordBytes = await fs.readFile(path.join(f.run, 'record.json'));
          const execution = JSON.parse(recordBytes.toString()) as { format: string; supervisorCapture: {
            roles: { role: string; pid: number | 'Unknown' }[]; historical: unknown } };
          expect(execution.format).toBe('polaris-dossier-execution-record/2');
          expect(execution.supervisorCapture.historical).toBeDefined();
          if (eligibleStop) {
            expect(relayRoles).toEqual(launchesBeforeResume);
            expect(resumed!.launches).toEqual([]);
            expect([author.count(), inv.count(), fidelity.count(), design.count()]).toEqual(forwardsBeforeResume);
            expect(resumedBegins).not.toHaveBeenCalled();
            expect(coldFinals).toHaveLength(2);
            expect(coldFinals[0]).not.toBe(coldFinals[1]);
            expect(resumed!.finalSite!.site).toBeGreaterThan(finalSiteBeforeStop);
            expect(execution.supervisorCapture.roles.every(role => role.pid === 'Unknown')).toBe(true);
            expect(() => sessionAudit.assertUrlDesignRenderContinuationCurrent(coldFinals[0]!)).toThrow();
          } else {
            expect(deliveryReproductions).toEqual([[0, 0], [1, 1]]);
            const fresh = execution.supervisorCapture.roles.find(role => role.role === 'design')!;
            expect(typeof fresh.pid).toBe('number'); expect(fresh.pid).not.toBe(oldDesignPid);
            expect(execution.supervisorCapture.roles.filter(role => role.role !== 'design').every(role => role.pid === 'Unknown')).toBe(true);
          }
          const again = await closeRun(f.run, {}, { sources: f.sources, now: Date.now, openReader: f.openReader,
            probe: createCredentialProbe(credentialListFromEnv({})), loadScreen: async () => ({ ok: true as const, screen: f.screen }) });
          expect(again).toMatchObject({ ok: false, refusal: { stage: 'closed-already' } });
          expect(await fs.readFile(path.join(f.run, 'record.json'))).toEqual(recordBytes);
          await writeEvidence({ recordSha256: sha256(recordBytes), state: resumed, events, resumeChecks,
            requestsBeforeResume: forwardsBeforeResume,
            requestsAfterResume: [author.count(), inv.count(), fidelity.count(), design.count()],
            launchesBeforeResume, launchesAfterResume: [...relayRoles],
            deliveryReproductions, finalSiteBeforeStop, coldFinalContinuations: coldFinals.length, orderedBeginsAfterResume: resumedBegins.mock.calls.length });
        }
        return;
      }
      expect(await loop, JSON.stringify({ events, failures, summary: controller.summary(), draws: draws.slice(-1), producerReports: f.producerReports() })).toBe(0);
      expect(state.done).toBeDefined(); expect(state.finalSite!.site).toBeGreaterThan(state.siteFor['0']!);
      expect(controller.summary().roles.every(role => role.pid !== 'Unknown')).toBe(true);
      expect(failures).toEqual([]);
      const recordFile = path.join(f.run, 'record.json'), recordBytes = await fs.readFile(recordFile);
      const execution = JSON.parse(recordBytes.toString()) as { format: string; supervisorCapture: { roles: unknown[] } };
      expect(execution.format).toBe('polaris-dossier-execution-record/2');
      expect(execution.supervisorCapture.roles).toHaveLength(4);
      const again = await closeRun(f.run, {}, { sources: f.sources, now: Date.now, openReader: f.openReader,
        probe: createCredentialProbe(credentialListFromEnv({})), loadScreen: async () => ({ ok: true as const, screen: f.screen }) });
      expect(again).toMatchObject({ ok: false, refusal: { stage: 'closed-already' } });
      expect(await fs.readFile(recordFile)).toEqual(recordBytes);
      await writeEvidence({ recordSha256: sha256(recordBytes), state, events, roles: controller.summary().roles,
        requests: { author: author.count(), inventory: inv.count(), fidelity: fidelity.count(), design: design.count() } });
    } catch (error) {
      const stopped = await controller.stop(); await loop.catch(() => {});
      const retainedCut = process.env['SYZYGY_COMPOSED_RETAIN'];
      if (retainedCut !== undefined) {
        const closing = cleanup.indexOf(f.close);
        if (closing >= 0) cleanup.splice(closing, 1);
        // Preserve failed pre-cut artifacts only after real bounded cleanup.
        // A failure manifest is separate from any already retained valid cut.
        await fs.writeFile(`${retainedCut}.failure.json`, JSON.stringify({ scenario, run: f.run, root: f.root, hidden: f.hidden,
          failure: error instanceof Error ? error.message : 'Unknown', inputTreeSha256: runtime.inputTreeSha256,
          profileRegistrySha256: runtime.profileRegistrySha256, stopped, events, failures, resumeChecks }, null, 2));
      }
      throw new Error(JSON.stringify({ failure: error instanceof Error ? error.message : 'Unknown', events, failures,
        roles: controller.summary(), authorForwards: author.count(), inventoryForwards: inv.count(), fidelityForwards: fidelity.count(), designForwards: design.count(),
        resumeChecks, producerReports: f.producerReports(), reads: f.productReadReports(), relayObservations, receipts }));
    }
  }, 360_000);
});
