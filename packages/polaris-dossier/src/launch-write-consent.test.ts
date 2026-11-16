import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { REAL_ROOT } from './full-run.testkit.js';
import { WRITE_CONSENT_ACT_FILE, WRITE_CONSENT_ARTIFACT, readWriteConsent } from './launch-write-consent.js';

/** REQ-polaris-generation-046, line 29: the write consent is read in force from its owner-act record, by the act cross-check of
 * RFC3-16(a), never from a status word or a file's presence. The real act (LAUNCH-CONSENT-WRITE-CONSENT-ACT.md, recorded
 * 2026-11-09T03:37:56Z) is read from this checkout; each refusal is a copy of the two files in a temporary home, mutated. */

const DECISIONS = '.syzygy/governance/decisions';
const ACT_INSTANT = Date.parse('2026-11-09T03:37:56Z');

function home(mutate: (act: string, record: string) => { act: string; record: string } = (act, record) => ({ act, record }), others: Record<string, string> = {}): string {
  const root = tempDir('syzygy-write-consent-');
  const act = fs.readFileSync(path.join(REAL_ROOT, DECISIONS, WRITE_CONSENT_ACT_FILE), 'utf8');
  const record = fs.readFileSync(path.join(REAL_ROOT, WRITE_CONSENT_ARTIFACT), 'utf8');
  const m = mutate(act, record);
  fs.mkdirSync(path.join(root, DECISIONS), { recursive: true });
  fs.mkdirSync(path.dirname(path.join(root, WRITE_CONSENT_ARTIFACT)), { recursive: true });
  fs.writeFileSync(path.join(root, DECISIONS, WRITE_CONSENT_ACT_FILE), m.act);
  fs.writeFileSync(path.join(root, WRITE_CONSENT_ARTIFACT), m.record);
  for (const [name, body] of Object.entries(others)) fs.writeFileSync(path.join(root, DECISIONS, name), body);
  return root;
}

describe('the launch-record write consent', () => {
  it('is in force in this checkout from its act\'s instant, and not before', async () => {
    expect(await readWriteConsent({ root: REAL_ROOT, now: ACT_INSTANT })).toEqual({ state: 'ok', record: 'WRITE-CONSENT-LAUNCH-RECORDS-2026-11-08' });
    expect((await readWriteConsent({ root: REAL_ROOT, now: ACT_INSTANT - 1000 })).state).toBe('absent');
  });

  it('a copy of the two files reads the same', async () => {
    expect(await readWriteConsent({ root: home(), now: ACT_INSTANT })).toEqual({ state: 'ok', record: 'WRITE-CONSENT-LAUNCH-RECORDS-2026-11-08' });
  });

  it('is absent with no act record (asks nothing, names the consent)', async () => {
    const root = tempDir('syzygy-write-consent-none-');
    fs.mkdirSync(path.join(root, DECISIONS), { recursive: true });
    const state = await readWriteConsent({ root, now: ACT_INSTANT });
    expect(state.state).toBe('absent');
    if (state.state !== 'ok') expect(state.why).toMatch(/^the launch-record write consent \(WRITE-CONSENT-LAUNCH-RECORDS, its act \.syzygy\/governance\/decisions\/LAUNCH-CONSENT-WRITE-CONSENT-ACT\.md\) is not in force: /);
  });

  it.each([
    ['the record\'s bytes change', (a: string, r: string) => ({ act: a, record: r.replace('Trunk: `refs/heads/main`', 'Trunk: `refs/heads/trunk`') }), 'refused'],
    ['the act is not what its recorder writes', (a: string, r: string) => ({ act: a.replace('It grants the write class only', 'It grants the write class'), record: r }), 'refused'],
  ] as const)('is refused when %s', async (_name, mutate, state) => {
    expect((await readWriteConsent({ root: home(mutate), now: ACT_INSTANT })).state).toBe(state);
  });

  it('is refused when another decisions file names it (a withdrawal)', async () => {
    const state = await readWriteConsent({ root: home(undefined, { 'WITHDRAW.md': '# Owner act — withdrawal\n\nWithdraws WRITE-CONSENT-LAUNCH-RECORDS-2026-11-09.\n' }), now: ACT_INSTANT });
    expect(state.state).toBe('refused');
  });

  it('is refused when its record does not name the dedicated reference (an act binding other bytes)', async () => {
    const root = home((a, r) => {
      const record = r.replace('Dedicated reference: `refs/heads/launch-consent-records`', 'Dedicated reference: `refs/heads/other`');
      const digest = (s: string) => createHash('sha256').update(s).digest('hex');
      return { act: a.split(digest(r)).join(digest(record)), record };
    });
    const state = await readWriteConsent({ root, now: ACT_INSTANT });
    expect(state).toEqual({ state: 'refused', why: 'the launch-record write consent (WRITE-CONSENT-LAUNCH-RECORDS, its act .syzygy/governance/decisions/LAUNCH-CONSENT-WRITE-CONSENT-ACT.md) is in force but its record does not name, exactly once each, the record class, the reference refs/heads/launch-consent-records and the location .syzygy/governance/decisions/launch-consent/' });
  });
});
