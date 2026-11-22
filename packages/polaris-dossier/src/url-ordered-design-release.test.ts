import { afterEach, describe, expect, it, vi } from 'vitest';
import type { startSessionBroker, ReleaseReply } from './session-broker.js';
import type { SessionRelayPorts, SessionRelaySubject } from './session-relay.js';
import type { SessionMachineEffectContext } from './session-machine-transport.js';
import type { createOrderedDesignSession } from './url-ordered-design-session.js';
import { createOrderedDesignSessionProfile, DEFAULT_SESSION_MODEL } from './session-profile.js';
import { orderedDesignHostTestPort } from './url-ordered-design-host.js';

// Only host callback plumbing is under test here. Kernel authority and actual
// writes have their own real-socket adapter tests; these stubs grant neither.
const backend = vi.hoisted(() => ({ invoke: null as Parameters<typeof startSessionBroker>[1] | null, controller: null as object | null }));
vi.mock('./session-broker.js', async original => ({ ...await original<typeof import('./session-broker.js')>(),
  startSessionBroker: async (socket: string, invoke: Parameters<typeof startSessionBroker>[1]) => {
    backend.invoke = invoke;
    return { socket, close: async () => ({ pendingInvocations: 0, termination: 'settled' as const }) };
  },
}));
vi.mock('./url-ordered-design-session.js', async original => ({ ...await original<typeof import('./url-ordered-design-session.js')>(),
  isProductionOrderedDesignSession: (value: unknown) => value === backend.controller,
}));
afterEach(() => { backend.invoke = null; backend.controller = null; });

describe('ordered host final tool budget callback', () => {
  it.each(['current', 'budget-expired', 'authority-revoked', 'machine-revoked'] as const)(
    'preserves final authority and passes the distinct budget check to the broker: %s', async scenario => {
      const compiled = createOrderedDesignSessionProfile({ binding: { run: 'owned', role: 'design', sourceBinding: 'a'.repeat(64),
        policy: 'b'.repeat(64), provider: 'anthropic', model: DEFAULT_SESSION_MODEL },
      sessionId: '12345678-1234-4234-8234-123456789012', systemPrompt: 'Owned fixed system.', initialPrompt: 'Owned fixed prompt.',
      utcDate: '2026-11-23', kernelRelease: 'owned-fixture' });
      if (!compiled.ok) throw new Error('owned profile refused');
      const profile = compiled.value.profile, order: string[] = [], reply = { ok: true, text: 'NONSECRET-protected-prepared' };
      let authorityChecks = 0, machineChecks = 0, writes = 0;
      const authority = () => { order.push('authority'); if (++authorityChecks === 2 && scenario === 'authority-revoked') throw new Error('revoked'); };
      const finalBudget = () => { order.push('budget'); if (scenario === 'budget-expired') throw new Error('expired'); };
      const controller: ReturnType<typeof createOrderedDesignSession> = {
        checkRequest: async () => { throw new Error('unused request'); }, checkResponse: async () => ({ ok: false }),
        observe: async () => {}, issueReply: async (_value, release) => { release(reply, authority, finalBudget); },
        retire: async () => {}, readTerminal: async () => { throw new Error('unused terminal'); },
        reportAuditRead: () => false, chargeAuditRead: () => {}, workSnapshot: () => null,
      };
      backend.controller = controller;
      const subject: SessionRelaySubject = { binding: profile.input.binding, project: 'owned', pin: 'c'.repeat(40), principal: 'owned' };
      let ports: SessionRelayPorts | undefined;
      const relay = { socket: '/owned/relay', healthy: () => true, responseFlushed: () => true, close: async () => {} };
      const host = await orderedDesignHostTestPort(async (_socket, _subject, provided) => { ports = provided; return relay; })({
        controller: Promise.resolve(controller), profile, subject, activationDeadline: Date.now() + 10_000,
        brokerSocket: '/owned/broker', relaySocket: relay.socket, current: () => true,
        brokerMachine: { authentication: 'url-machine-peer/1' }, relayMachine: { authentication: 'url-machine-peer/1' },
        credential: { source: 'api-key-environment', credentialIdentity: 'Unknown', expiresAt: null, headers: () => null, close: () => {} },
        admit: () => { throw new Error('unused admission'); }, audit: () => {},
      });
      try {
        const context: SessionMachineEffectContext = {
          peer: { verifier: { mechanism: 'rfc5-7d', profileSha256: 'd'.repeat(64), processIdentitySha256: 'e'.repeat(64), channelIdentitySha256: 'f'.repeat(64) } },
          async mediate(_operation, effect) {
            try { return { ok: true, value: await effect(() => {
              order.push('machine'); return ++machineChecks !== 3 || scenario !== 'machine-revoked';
            }) }; } catch { return { ok: false }; }
          },
        };
        await ports!.audit({ event: 'response-admitted', subject, requestId: 'owned-request', at: '2026-11-23T00:00:00.000Z',
          credentialIdentity: 'Unknown', exposureMode: 'private-local-cli', governingRule: 'GOVERNANCE-SIMPLIFICATION-D10',
          admission: null, received: null, route: 'messages', consumedToolResults: [], outcome: 'response-admitted', status: 200,
          response: { digest: '1'.repeat(64), bytes: 100, content: 'messages-event-stream', stopReason: 'tool_use', textBlocks: 0,
            tool: { id: 'toolu_owned', name: 'mcp__syzygy__artifact_read', inputSha256: '2'.repeat(64) } } }, null);
        const release: ReleaseReply = (value, revalidate, budgetCheck) => {
          expect(value).toBe(reply); expect(budgetCheck).toBe(finalBudget);
          order.push('encode'); // Broker serializes before its final guards.
          revalidate?.();
          budgetCheck?.();
          order.push('write'); writes++;
        };
        const result = backend.invoke!({ tool: 'artifact_read', input: { path: 'owned' } }, release, context);
        if (scenario === 'current') await expect(result).resolves.toBeUndefined();
        else await expect(result).rejects.toThrow('url-ordered-design-host-unavailable');
        expect(order).toEqual(scenario === 'current' ? ['machine', 'authority', 'machine', 'encode', 'authority', 'machine', 'budget', 'write']
          : scenario === 'budget-expired' ? ['machine', 'authority', 'machine', 'encode', 'authority', 'machine', 'budget']
          : scenario === 'authority-revoked' ? ['machine', 'authority', 'machine', 'encode', 'authority']
          : ['machine', 'authority', 'machine', 'encode', 'authority', 'machine']);
        expect(writes).toBe(scenario === 'current' ? 1 : 0);
      } finally { await host.close(); }
    });
});
