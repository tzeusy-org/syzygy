import { describe, expect, it, vi } from 'vitest';
import type { UrlCommittedStageCheck } from './url-run-artifacts.js';
import { urlRunResumeRolesTestPort as selectRoles, urlRunSessionsTestPort, type UrlRunSessionsOptions } from './url-run-sessions.js';

type Checks = Parameters<typeof selectRoles>[0];
const passed = (revision: number): UrlCommittedStageCheck => ({ revision, record: { outcome: 'passed' }, verdict: null });
const fidelity = (draftRevision: number, inventoryRevision: number, blocking = false,
  verdict: Readonly<Record<string, unknown>> = {}): UrlCommittedStageCheck => ({ revision: 4,
  record: { outcome: 'validated', packet: { draftRevision, inventoryRevision }, readiness: { blocking } }, verdict });
const ready = (): Checks => ({ author: passed(2), inventory: passed(3), fidelity: fidelity(2, 3), design: null });

describe('fresh URL role selection from retained validated stages', () => {
  it('selects unfinished producers and an independent reviewer without starting design', () => {
    expect(selectRoles({ author: null, inventory: null, fidelity: null, design: null }, [])).toEqual(['author', 'inventory', 'fidelity']);
    expect(selectRoles({ author: passed(2), inventory: null, fidelity: null, design: null }, [])).toEqual(['inventory', 'fidelity']);
    expect(selectRoles({ ...ready(), fidelity: null }, [])).toEqual(['fidelity']);
    expect(selectRoles(ready(), [])).toEqual([]);
  });

  it('requires a validated fidelity check for both exact current producer revisions', () => {
    expect(selectRoles({ ...ready(), fidelity: fidelity(1, 3) }, [])).toEqual(['fidelity']);
    expect(selectRoles({ ...ready(), fidelity: fidelity(2, 2) }, [])).toEqual(['fidelity']);
    expect(selectRoles({ ...ready(), fidelity: { ...fidelity(2, 3), record: { outcome: 'refused' } } }, [])).toEqual(['fidelity']);
    expect(selectRoles({ ...ready(), author: { ...passed(2), record: { outcome: 'failed' } } }, [])).toEqual(['author', 'fidelity']);
  });

  it('retains already-notified blocking fidelity repairs for their affected producers', () => {
    const inventoryAccuracy = [{ entryId: 'own-entry', accuracy: 'inaccurate' }];
    expect(selectRoles({ ...ready(), fidelity: fidelity(2, 3, true, { inventoryAccuracy }) }, [])).toEqual(['inventory']);
    expect(selectRoles({ ...ready(), fidelity: fidelity(2, 3, true, { findings: [{ severity: 'blocking' }] }) }, [])).toEqual(['author']);
    expect(selectRoles({ ...ready(), fidelity: fidelity(2, 3, true,
      { inventoryAccuracy, blockSupport: [{ verdict: 'unsupported' }] }) }, [])).toEqual(['author', 'inventory']);
    expect(selectRoles({ ...ready(), fidelity: fidelity(2, 3, true,
      { inventoryAccuracy, inventoryCoverage: [{ disposition: 'missing' }] }) }, [])).toEqual(['author', 'inventory']);
    expect(selectRoles({ ...ready(), fidelity: fidelity(2, 3, true) }, [])).toEqual(['author']);
    expect(() => selectRoles({ ...ready(), fidelity: { ...fidelity(2, 3, true), verdict: null } }, [])).toThrow('url-run-sessions-unavailable');
  });

  it('requires matching eligible site, current draft and checked verdict before a design repair', () => {
    const checks = { ...ready(), design: { revision: 7, record: { outcome: 'validated', packet: { site: 5 },
      readiness: { blocking: true } }, verdict: {} } };
    const eligible = { site: 5, draftRevision: 2, number: 7 };
    expect(selectRoles(checks, [eligible])).toEqual(['author']);
    expect(selectRoles(checks, [])).toEqual([]);
    expect(selectRoles(checks, [{ ...eligible, site: 4 }])).toEqual([]);
    expect(selectRoles(checks, [{ ...eligible, draftRevision: 1 }])).toEqual([]);
    expect(selectRoles(checks, [{ ...eligible, number: 6 }])).toEqual([]);
    expect(selectRoles({ ...checks, design: { ...checks.design, record: { ...checks.design.record,
      readiness: { blocking: false } } } }, [eligible])).toEqual([]);
  });
});

describe('runtime continuation admission before effects', () => {
  it('refuses a copied successful result and asserted current claim before touching production inputs', async () => {
    const unexpected = vi.fn((): never => { throw new Error('unexpected runtime effect'); });
    const start = urlRunSessionsTestPort({ prepare: unexpected, host: unexpected, launch: unexpected });
    const claimCurrent = vi.fn(() => true);
    const options = { resume: { verified: Object.freeze({ ok: true }), claim: { current: claimCurrent } },
      get production() { return unexpected(); }, get plans() { return unexpected(); } } as unknown as UrlRunSessionsOptions;
    await expect(start(options)).rejects.toThrow('url-run-sessions-unavailable');
    expect(unexpected).not.toHaveBeenCalled();
    expect(claimCurrent).not.toHaveBeenCalled();
  });
});
