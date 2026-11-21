import * as fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { decodeGitMemoryPack } from './git-memory-pack.js';
import { admitGitMemoryClosure, type GitAdmissionReceipt } from './git-memory-admission.js';
import { persistAdmittedGitObjects } from './git-memory-store.js';
import { buildDossierScreen } from './screen.js';
import { policyFixture } from './full-run.testkit.js';

const CONTENT = 'Own synthetic admitted documentation.\n';
function fixture(format: 'sha1' | 'sha256' = 'sha1') {
  const root = tempDir('git-memory-store-'), repo = path.join(root, 'own.git'), home = path.join(root, 'own-home'), parent = path.join(root, 'destination');
  fs.mkdirSync(home); fs.mkdirSync(parent, { mode: 0o700 });
  const env = { PATH: '/usr/bin:/bin', HOME: home, LANG: 'C', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'Own Fixture', GIT_COMMITTER_NAME: 'Own Fixture', GIT_AUTHOR_EMAIL: 'own@example.invalid', GIT_COMMITTER_EMAIL: 'own@example.invalid',
    GIT_AUTHOR_DATE: '2000-01-01T00:00:00+0000', GIT_COMMITTER_DATE: '2000-01-01T00:00:00+0000' };
  const git = (args: readonly string[], input = ''): Buffer => execFileSync('/usr/bin/git', ['--git-dir', repo, ...args], { env, input, maxBuffer: 1_048_576, stdio: ['pipe', 'pipe', 'pipe'] });
  git(['init', '--bare', '--template=', `--object-format=${format}`, repo]);
  const blob = git(['hash-object', '-w', '--stdin'], CONTENT).toString().trim();
  const tree = git(['mktree'], `100644 blob ${blob}\tREADME.md\n`).toString().trim();
  const pin = git(['commit-tree', tree], 'Own synthetic source.\n').toString().trim();
  const raw = git(['pack-objects', '--stdout', '--window=0'], `${pin}\n${tree}\n${blob}\n`);
  const decoded = decodeGitMemoryPack({ pack: raw, objectFormat: format }); if (!decoded.ok) throw new Error(decoded.code);
  const screen = buildDossierScreen(policyFixture().bytes, true, null, 'private'); if (!screen.ok) throw new Error(screen.why);
  const accepted = admitGitMemoryClosure({ pack: decoded.pack, selectedCommit: pin, shallow: [pin],
    policy: { id: 'POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1', version: '1.0.0', sha256: 'e'.repeat(64), screen: screen.screen } });
  if (!accepted.ok) throw new Error(accepted.code);
  return { root, parent, receipt: accepted.receipt, pin, blob, env };
}

describe('post-admission exact loose object storage', () => {
  it.each(['sha1', 'sha256'] as const)('writes only admitted exact loose objects and strict metadata for %s', async format => {
    const f = fixture(format), events: string[] = [];
    const result = await persistAdmittedGitObjects({ parent: f.parent, receipt: f.receipt,
      current: () => { events.push('current'); return true; }, audit: () => { events.push('audit'); expect(fs.readdirSync(f.parent)).toEqual([]); } });
    expect(result.ok).toBe(true); if (!result.ok) return;
    expect(result).toMatchObject({ objectCount: 3, worktree: 'not-materialized', objectsReverified: true });
    expect(events.slice(0, 3)).toEqual(['current', 'audit', 'current']);
    expect(fs.readdirSync(result.clone)).toEqual(['.git']);
    const git = path.join(result.clone, '.git');
    expect(fs.readdirSync(git).sort()).toEqual(['HEAD', 'config', 'objects', 'refs', 'shallow']);
    expect(fs.readFileSync(path.join(git, 'HEAD'), 'utf8')).toBe(f.pin + '\n');
    const native = (args: string[]) => execFileSync('/usr/bin/git', ['--git-dir', git, ...args], { env: f.env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    expect(native(['rev-parse', '--verify', 'HEAD']).trim()).toBe(f.pin);
    expect(native(['cat-file', 'blob', f.blob])).toBe(CONTENT);
    expect((await persistAdmittedGitObjects({ parent: f.parent, receipt: f.receipt, current: () => true, audit: () => undefined })).ok).toBe(false);
    expect(fs.readdirSync(f.parent)).toHaveLength(1);
  });

  it('creates nothing for a forged receipt or a policy that becomes stale during audit', async () => {
    const forged = fixture(); let touched = 0;
    const ports = { parent: forged.parent, current: () => { touched++; return true; }, audit: () => { touched++; } };
    expect(await persistAdmittedGitObjects({ ...ports, receipt: { ...forged.receipt } })).toEqual({ ok: false, reason: 'admitted-object-store-refused', retainedClone: null, storage: 'not-started' });
    expect(touched).toBe(0); expect(fs.readdirSync(forged.parent)).toEqual([]);
    const stale = fixture(); let current = true;
    expect(await persistAdmittedGitObjects({ parent: stale.parent, receipt: stale.receipt, current: () => current, audit: async () => { await Promise.resolve(); current = false; } }))
      .toEqual({ ok: false, reason: 'admitted-object-store-refused', retainedClone: null, storage: 'not-started' });
    expect(fs.readdirSync(stale.parent)).toEqual([]);
  });

  it('reports an admitted partial store when current binding fails between object writes', async () => {
    const f = fixture(); let checks = 0;
    const result = await persistAdmittedGitObjects({ parent: f.parent, receipt: f.receipt, current: () => ++checks <= 3, audit: () => undefined });
    expect(result.ok).toBe(false); if (result.ok) return;
    expect(result.storage).toBe('admitted-partial'); expect(result.retainedClone).not.toBeNull();
    expect(fs.existsSync(path.join(result.retainedClone!, '.git', 'HEAD'))).toBe(false);
    expect(fs.readdirSync(f.parent)).toHaveLength(1);
  });

  it('refuses symbolic parent aliases and failed audit without writing source bodies', async () => {
    const f = fixture(), alias = path.join(f.root, 'alias'); fs.symlinkSync(f.parent, alias);
    expect((await persistAdmittedGitObjects({ parent: alias, receipt: f.receipt, current: () => true, audit: () => undefined })).ok).toBe(false);
    expect(fs.readdirSync(f.parent)).toEqual([]);
    const g = fixture();
    expect(await persistAdmittedGitObjects({ parent: g.parent, receipt: g.receipt, current: () => true,
      audit: () => { throw new Error('NONSECRET-private-audit-error'); } }))
      .toEqual({ ok: false, reason: 'admitted-object-store-refused', retainedClone: null, storage: 'not-started' });
    expect(fs.readdirSync(g.parent)).toEqual([]);
    // A deserialized history object is not a live admission capability either.
    expect((await persistAdmittedGitObjects({ parent: g.parent, receipt: JSON.parse(JSON.stringify(g.receipt)) as GitAdmissionReceipt, current: () => true, audit: () => undefined })).ok).toBe(false);
  });
});
