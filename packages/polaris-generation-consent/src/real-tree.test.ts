import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CITATION_ALLOWLIST } from './citation-allowlist.js';
import { DECISIONS_DIR, LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM, createPackageAdmissionReader, createPackageAdmissionRecordsPort, createPackagePolicyReader, readClassActState, readInForceEgress, readPolicyActChain, readVersionedSignoffState, type PackageReaderFs } from './package-reader.js';

/** Every read the dossier relies on, over this checkout's real `.syzygy/governance/decisions/`. A decisions file whose prose trips a
 * withdrawal sweep refuses every admission; this fails CI on the commit that adds it, not at the owner's sitting. The remedy is to
 * reword the file; never to widen a filter. A `CITATION_ALLOWLIST` entry no longer cures a trip: since syzygy-bpyt.1.24 an
 * allowlisted file is swept whole too, and its set-aside reading can only add a refusal. */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const realFs: PackageReaderFs = { readdir: dir => readdir(dir), readFile: file => readFile(file, 'utf8') };
/** The real tree with one extra decisions file, to show the reads do reach that directory. */
const withExtra = (name: string, text: string): PackageReaderFs => {
  const dir = path.join(ROOT, DECISIONS_DIR), file = path.join(dir, name);
  return { readdir: async d => (d === dir ? [...await readdir(d), name] : readdir(d)), readFile: async f => (f === file ? text : readFile(f, 'utf8')) };
};
const reads = (fs: PackageReaderFs, now = Date.now()) => ({
  admission: () => createPackageAdmissionReader({ root: ROOT, fs }).read(),
  policy: () => createPackagePolicyReader({ root: ROOT, fs }).read(),
  chain: () => readPolicyActChain({ root: ROOT, fs, now }),
  classAct: () => readClassActState({ root: ROOT, fs, now }),
  egress: () => readInForceEgress({ root: ROOT, fs, now }),
  signoff: () => readVersionedSignoffState({ root: ROOT, fs, now, form: LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM }),
  port: createPackageAdmissionRecordsPort({ root: ROOT, now: () => now, fs }),
});
const exists = async (rel: string): Promise<boolean> => { try { await readFile(path.join(ROOT, rel)); return true; } catch { return false; } };
const KINDS = ['observation-consent', 'egress-consent', 'public-source-policy'] as const;
const TIMEOUT = 120_000;   // each read walks the whole decisions tree: worst 8.0 s over 5 alone runs at load1 39-47 (docs/evidence/syzygy-bpyt-4-31/durations/real-tree.test.tests.json)

describe('the readers over this checkout\'s decisions directory', () => {
  it('refuse nothing: no file in decisions/ trips a sweep or breaks a recorder\'s form', async () => {
    const r = reads(realFs);
    await expect(r.admission(), 'admission read').resolves.toBeDefined();
    await expect(r.policy(), 'policy read').resolves.toBeDefined();
    for (const [name, read] of [['policy chain', r.chain], ['class act', r.classAct], ['egress', r.egress]] as const) {
      const got = await read();
      expect(got.state, `${name}: ${got.state === 'ok' ? '' : got.why}`).not.toBe('refused');
    }
    // The registry sign-off follows the tree: absent while its record is, in force once the sitting records it.
    const signoff = await r.signoff(), record = `${DECISIONS_DIR}/${LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM.file}`;
    if (await exists(record)) expect(signoff, 'registry sign-off').toMatchObject({ state: 'ok', act: { identity: 'public-git-source-acquisition-local-agent-v1.0' } });
    else expect(signoff, 'registry sign-off').toEqual({ state: 'absent', why: `no owner-act record ${record} exists` });
    for (const kind of KINDS) {
      const answer = await r.port.check({ kind, repositoryId: 'redis-redis', revision: '0'.repeat(40) });
      expect(answer.satisfied ? '' : answer.why, kind).not.toContain('could not be read');
    }
  }, TIMEOUT);
  it('do reach that directory: one added file naming a record or the class act refuses the reads that sweep for it', async () => {
    await expect(reads(withExtra('ZZ-PROBE.md', 'Withdrawn: PUBLIC-OBS-REDIS-2026-10-03\n')).admission()).rejects.toThrow();
    await expect(reads(withExtra('ZZ-PROBE.md', 'Revokes the public source scope approval.\n')).policy()).rejects.toThrow();
    expect((await reads(withExtra('ZZ-PROBE.md', 'Revokes RFC5-PROJECT-DOCUMENTATION-AMEND-2026-10-03.\n')).classAct()).state).toBe('refused');
    expect((await reads(withExtra('ZZ-PROBE.md', 'Withdrawn: public-git-source-acquisition-local-agent-v1.0\n')).signoff()).state).toBe('refused');
    const port = reads(withExtra('ZZ-PROBE.md', 'Withdrawn: PUBLIC-EGRESS-anthropic\n')).port;
    expect(await port.check({ kind: 'egress-consent', repositoryId: 'redis-redis', revision: '0'.repeat(40) })).toMatchObject({ satisfied: false, why: expect.stringContaining('could not be read') });
  }, TIMEOUT);
  it('the citation allowlist holds only entries that match a file here, byte for byte, each with a reason', async () => {
    for (const [rel, entry] of CITATION_ALLOWLIST) {
      let text: string | null = null;
      try { text = await readFile(path.join(ROOT, DECISIONS_DIR, rel), 'utf8'); } catch { text = null; }
      expect(text === null ? null : createHash('sha256').update(text, 'utf8').digest('hex'), `${rel}: stale entry; remove it or re-review the file`).toBe(entry.sha256);
      expect(entry.reason.trim(), rel).not.toBe('');
    }
  });
});
