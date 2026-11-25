import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { createPolicyGitScope } from './policy-git.js';
import { runPolarisCli, type SupervisorState } from './polaris.js';
import { URL_ROLES, URL_RUN_MODE, URL_SUPPORTED_MODEL } from './url-run-record.js';
import { writeUrlSupervisorState } from './url-supervisor-state.js';

const recovery = vi.hoisted(() => ({ verify: vi.fn(), claim: vi.fn(), disclosure: vi.fn(), launch: vi.fn() }));
vi.mock('./url-recovery.js', async original => ({ ...await original<typeof import('./url-recovery.js')>(),
  verifyStoppedUrlRun: recovery.verify, claimStoppedUrlRun: recovery.claim }));
vi.mock('./raw-read-disclosure.js', async original => ({ ...await original<typeof import('./raw-read-disclosure.js')>(),
  readRawReadDisclosure: recovery.disclosure }));
vi.mock('./url-run-sessions.js', async original => ({ ...await original<typeof import('./url-run-sessions.js')>(),
  startUrlRunSessions: recovery.launch }));
afterEach(() => { vi.restoreAllMocks(); vi.resetAllMocks(); });

describe('verified recovery scope ownership before a resumed launch', () => {
  it.each(['missing disclosure', 'null claim', 'rejected claim'] as const)('closes the retained scope on %s', async refusal => {
    const root = tempDir('polaris-recovery-owner-'), runId = `run-${'a'.repeat(32)}`, run = path.join(root, runId);
    const now = Date.now();
    const state: SupervisorState = { format: 'polaris-supervisor/2', mode: URL_RUN_MODE, declarationSha256: 'b'.repeat(64),
      run, runId, tmuxSession: 'polaris-ownrecovery', clone: path.join(root, 'own-source'), url: 'https://own.example.invalid/o/r',
      model: URL_SUPPORTED_MODEL, authorSkipPermissions: false, briefIssuedAt: now, deadlineSeconds: 3600,
      stopGeneration: 'c'.repeat(32), stopped: new Date(now).toISOString(),
      sessions: URL_ROLES.map(role => ({ role, session: 1,
        directory: role === 'author' ? run : `${run}.sessions/${role === 'inventory' ? 'session' : role}-1`,
        prompt: '', promptSha256: 'd'.repeat(64), allowedTools: null })),
      fidelityDeliveredFor: [], designDeliveredFor: [], notified: [], siteFor: {}, launches: [] };
    writeUrlSupervisorState(root, state);
    const close = vi.fn(), noGit = (): never => { throw new Error('own recovery control admits no Git'); };
    const policyGit = createPolicyGitScope({ runSync: noGit, runAsync: noGit, close });
    const verified = { ok: true, record: { declared: { agentProvider: 'anthropic' } }, checkedContext: { policyGit } };
    recovery.verify.mockResolvedValue(verified);
    recovery.disclosure.mockReturnValue(refusal === 'missing disclosure' ? null : {});
    if (refusal === 'rejected claim') recovery.claim.mockRejectedValue(new Error('own rejected claim'));
    else recovery.claim.mockResolvedValue(null);
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      expect(await runPolarisCli(['--supervise', '--resume', runId, '--state-root', root], { now: () => now })).toBe(1);
      expect(recovery.verify).toHaveBeenCalledOnce();
      expect(recovery.disclosure).toHaveBeenCalledOnce();
      expect(recovery.claim).toHaveBeenCalledTimes(refusal === 'missing disclosure' ? 0 : 1);
      expect(close).toHaveBeenCalledOnce();
      expect(policyGit.healthy()).toBe(false);
      expect(recovery.launch).not.toHaveBeenCalled();
    } finally { stdout.mockRestore(); stderr.mockRestore(); if (policyGit.healthy()) await policyGit.close(); }
  });
});
