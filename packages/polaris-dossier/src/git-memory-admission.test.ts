import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { admitGitMemoryClosure, admittedGitMemoryObjects, gitMemoryAdmissionExclusions, type GitAcquisitionPolicy } from './git-memory-admission.js';
import { decodeGitMemoryPack } from './git-memory-pack.js';
import { buildDossierScreen } from './screen.js';
import { policyFixture } from './full-run.testkit.js';

function object(type: 'commit' | 'tree' | 'blob', bytes: Uint8Array | string) {
  const body = Buffer.from(bytes);
  return { type, body, oid: createHash('sha1').update(`${type} ${body.length}\0`).update(body).digest('hex') };
}
function fixture(files: { path: string; body: string | Uint8Array }[] = [{ path: 'README.md', body: 'Own repository documentation.\n' }], message = 'Own synthetic commit.\n') {
  const blobs = files.map(file => object('blob', file.body));
  const tree = object('tree', Buffer.concat(files.map((file, index) => Buffer.concat([Buffer.from(`100644 ${file.path}\0`), Buffer.from(blobs[index]!.oid, 'hex')]))));
  const commit = object('commit', `tree ${tree.oid}\nauthor Own Fixture <own@example.invalid> 946684800 +0000\ncommitter Own Fixture <own@example.invalid> 946684800 +0000\n\n${message}`);
  const objects = [commit, tree, ...new Map(blobs.map(blob => [blob.oid, blob])).values()];
  return packed(objects, commit.oid);
}
function packed(objects: ReturnType<typeof object>[], commit: string) {
  const header = Buffer.alloc(12); header.write('PACK'); header.writeUInt32BE(2, 4); header.writeUInt32BE(objects.length, 8);
  const entries = objects.map(item => {
    const kind = { commit: 1, tree: 2, blob: 3 }[item.type]; let size = item.body.length;
    const bytes = [(kind << 4) | (size & 15)]; size = Math.floor(size / 16);
    while (size > 0) { bytes[bytes.length - 1]! |= 128; bytes.push(size & 127); size = Math.floor(size / 128); }
    return Buffer.concat([Buffer.from(bytes), deflateSync(item.body)]);
  });
  const prefix = Buffer.concat([header, ...entries]);
  const wire = Buffer.concat([prefix, createHash('sha1').update(prefix).digest()]);
  const decoded = decodeGitMemoryPack({ pack: wire, objectFormat: 'sha1' });
  if (!decoded.ok) throw new Error(decoded.code);
  return { pack: decoded.pack, selectedCommit: commit, shallow: [commit] };
}
function emptyTreeFixture(name: string) {
  const empty = object('tree', Buffer.alloc(0));
  const tree = object('tree', Buffer.concat([Buffer.from(`40000 ${name}\0`), Buffer.from(empty.oid, 'hex')]));
  const commit = object('commit', `tree ${tree.oid}\nauthor Own Fixture <own@example.invalid> 946684800 +0000\ncommitter Own Fixture <own@example.invalid> 946684800 +0000\n\nOwn synthetic empty tree.\n`);
  return packed([commit, tree, empty], commit.oid);
}
function policy(visibility: 'public' | 'private' = 'private'): GitAcquisitionPolicy {
  const compiled = buildDossierScreen(policyFixture().bytes, true, null, visibility);
  if (!compiled.ok) throw new Error(compiled.why);
  return { id: 'POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1', version: '1.0.0', sha256: 'e'.repeat(64), screen: compiled.screen };
}

describe('whole verified closure admission before source storage', () => {
  it('admits exact safe objects with metadata and actual body classes and an unforgeable local receipt', () => {
    const source = fixture(); const result = admitGitMemoryClosure({ ...source, policy: policy() });
    expect(result.ok).toBe(true); if (!result.ok) return;
    expect(result.receipt).toMatchObject({ commit: source.selectedCommit, objectFormat: 'sha1', objectCount: 3,
      classes: ['code-structure', 'project-documentation', 'work-history'] });
    const closure = admittedGitMemoryObjects(result.receipt);
    expect(closure?.objects).toHaveLength(3); expect(closure?.paths).toEqual([{ path: 'README.md', mode: '100644', oid: expect.stringMatching(/^[a-f0-9]{40}$/u) }]);
    expect(admittedGitMemoryObjects({ ...result.receipt })).toBeNull();
    expect(admittedGitMemoryObjects(JSON.parse(JSON.stringify(result.receipt)))).toBeNull();
    const body = closure!.objects.find(item => item.type === 'blob')!.body; body.fill(0);
    expect(Buffer.from(closure!.objects.find(item => item.type === 'blob')!.body).toString('utf8')).toBe('Own repository documentation.\n');
  });

  it('screens every alias and refuses a denied alias even when the identical blob has an admitted path', () => {
    const same = 'Own fixture shared body.\n';
    const denied = fixture([{ path: '.env', body: same }, { path: 'README.md', body: same }]);
    const accepted = fixture([{ path: 'README.md', body: same }, { path: 'copy.ts', body: same }]);
    expect(admitGitMemoryClosure({ ...denied, policy: policy() })).toEqual({ ok: false, code: 'required-acquisition-content-excluded' });
    const result = admitGitMemoryClosure({ ...accepted, policy: policy() }); expect(result.ok).toBe(true);
    if (result.ok) expect(result.receipt.classes).toEqual(['code-content', 'code-structure', 'project-documentation', 'work-history']);
  });

  it('screens raw decoded empty-tree names before canonical JSON can hide anchored detector matches', () => {
    const supplied = policy();
    const name = 'requirepass OwnSyntheticCanary';
    expect(supplied.screen.screenBody(name)).toBe('secret-detector-match');
    expect(supplied.screen.screenBody(JSON.stringify({ path: name, oid: 'a'.repeat(40) }))).toBeUndefined();
    const bad = admitGitMemoryClosure({ ...emptyTreeFixture(name), policy: supplied });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(gitMemoryAdmissionExclusions(bad)).toMatchObject([{ species: 'tree-alias' }]);
    expect(admitGitMemoryClosure({ ...emptyTreeFixture('own-safe-empty-tree'), policy: supplied }).ok).toBe(true);
  });

  it('refuses private secrets, public redaction, unknown classes and binary bodies with no excluded metadata in the reply', () => {
    const synthetic = 'AKIA' + 'A'.repeat(16);
    for (const [source, visibility] of [[fixture([{ path: 'README.md', body: synthetic }]), 'private'],
      [fixture([{ path: 'README.md', body: synthetic }]), 'public'], [fixture([{ path: 'own.unknown', body: 'Own unsupported body' }]), 'private'],
      [fixture([{ path: 'README.md', body: Buffer.from([0xff]) }]), 'private']] as const) {
      const result = admitGitMemoryClosure({ ...source, policy: policy(visibility) });
      expect(result).toEqual({ ok: false, code: 'required-acquisition-content-excluded' });
      expect(JSON.stringify(result)).not.toContain(synthetic); expect(JSON.stringify(result)).not.toContain(source.selectedCommit);
    }
  });

  it('keeps source active-content exemptions path-bound and screens commit metadata without one', () => {
    const body = '<script>ownFixture()</script>\n';
    expect(admitGitMemoryClosure({ ...fixture([{ path: 'own.ts', body }]), policy: policy() }).ok).toBe(true);
    expect(admitGitMemoryClosure({ ...fixture(undefined, body), policy: policy() })).toEqual({ ok: false, code: 'required-acquisition-content-excluded' });
    expect(admitGitMemoryClosure({ ...fixture(undefined, 'AKIA' + 'A'.repeat(16)), policy: policy() }).ok).toBe(false);
  });

  it('fails closed for forged packs, wrong pins, detector exceptions and incomplete policy binding', () => {
    const source = fixture();
    for (const altered of [{ ...source, selectedCommit: 'f'.repeat(40) }, { ...source, shallow: [] }, { ...source, pack: { ...source.pack } }]) {
      expect(admitGitMemoryClosure({ ...altered, policy: policy() }).ok).toBe(false);
    }
    const supplied = policy();
    expect(admitGitMemoryClosure({ ...source, policy: { ...supplied, sha256: '' } }).ok).toBe(false);
    expect(admitGitMemoryClosure({ ...source, policy: { ...supplied, screen: { ...supplied.screen, screenTargetBody: () => { throw new Error('NONSECRET-unsafe-diagnostic'); } } } })).toEqual({ ok: false, code: 'required-acquisition-content-excluded' });
  });

  it('keeps reached exclusion hashes in a genuine protected-only receipt without exporting paths, IDs, sizes or bodies', () => {
    const body = 'AKIA' + 'A'.repeat(16), source = fixture([{ path: 'README.md', body }]);
    const result = admitGitMemoryClosure({ ...source, policy: policy() });
    expect(result.ok).toBe(false); if (result.ok) return;
    expect(JSON.stringify(result)).toBe('{"ok":false,"code":"required-acquisition-content-excluded"}');
    const evidence = gitMemoryAdmissionExclusions(result)!;
    expect(evidence).toEqual([{ species: 'blob-alias', locationSha256: createHash('sha256').update('README.md').digest('hex'),
      contentSha256: createHash('sha256').update(body).digest('hex'), policySha256: policy().screen.policySha256,
      originPolicySha256: 'e'.repeat(64), outcome: 'secret-detector-match' }]);
    expect(Object.isFrozen(evidence)).toBe(true); expect(Object.isFrozen(evidence[0])).toBe(true);
    expect(JSON.stringify(evidence)).not.toContain(body); expect(JSON.stringify(evidence)).not.toContain('README.md');
    expect(JSON.stringify(evidence)).not.toContain(source.selectedCommit);
    expect(gitMemoryAdmissionExclusions({ ...result })).toBeNull();
    const supplied = policy();
    const thrown = admitGitMemoryClosure({ ...fixture(), policy: { ...supplied, screen: { ...supplied.screen,
      screenTargetBody: () => { throw new Error('NONSECRET-unsafe-diagnostic'); } } } });
    expect(thrown.ok).toBe(false); if (thrown.ok) return;
    expect(gitMemoryAdmissionExclusions(thrown)).toMatchObject([{ species: 'blob-alias', outcome: 'screening-failed' }]);
    expect(JSON.stringify(gitMemoryAdmissionExclusions(thrown))).not.toContain('NONSECRET-unsafe-diagnostic');
    const malformed = admitGitMemoryClosure({ ...source, selectedCommit: 'f'.repeat(40), policy: policy() });
    expect(malformed.ok).toBe(false); if (malformed.ok) return;
    expect(gitMemoryAdmissionExclusions(malformed)).toEqual([]);
  });
});
