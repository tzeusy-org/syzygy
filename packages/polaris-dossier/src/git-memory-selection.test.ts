import { sha256 } from '@syzygy/support';
import { describe, expect, it } from 'vitest';
import { decodeGitIncomingUnit, gitMetadataFrame, GitMetadataUnitBuffer, gitLsRefsWire, prepareGitSelection, selectGitLsRefs } from './git-memory-selection.js';
const A = 'a'.repeat(40), B = 'b'.repeat(40), C = 'c'.repeat(64);
function plan(selector?: string) { const result = prepareGitSelection({ selector, admitMetadata: () => false }); if (!result.ok) throw new Error(result.code); return result.value.plan; }
describe('bounded Git v2 ls-refs conversion', () => {
  it('preserves exact default HEAD, named refs/tag peel and pure full-pin semantics', () => {
    expect(selectGitLsRefs(plan(), 'sha1', [Buffer.from(`${A} HEAD symref-target:refs/heads/trunk\n`)])).toEqual({ ok: true, value: { mode: 'remote-default', reference: 'refs/heads/trunk', identifier: A, objectFormat: 'sha1' } });
    expect(selectGitLsRefs(plan('refs/heads/trunk'), 'sha256', [Buffer.from(`${C} refs/heads/trunk\n`)])).toMatchObject({ ok: true, value: { identifier: C, objectFormat: 'sha256' } });
    expect(selectGitLsRefs(plan('v1'), 'sha1', [Buffer.from(`${A} refs/tags/v1 peeled:${B}\n`)])).toMatchObject({ ok: true, value: { reference: 'refs/tags/v1', identifier: B } });
    expect(selectGitLsRefs(plan(A.toUpperCase()), 'sha256', [Buffer.from('ignored foreign metadata')])).toEqual({ ok: true, value: { mode: 'full-commit', reference: null, identifier: A, objectFormat: 'sha1' } });
  });
  it('emits exact UTF8 prefix requests with symrefs/peel and no fetch or untrusted option', () => {
    const operation = prepareGitSelection({ selector: 'caf\u00e9', admitMetadata: () => true }); expect(operation.ok).toBe(true); if (!operation.ok) throw new Error('plan');
    expect(Object.isFrozen(operation.value.plan)).toBe(true);
    const wire = gitLsRefsWire(operation.value.plan, 'sha256');
    expect(wire.includes(Buffer.from('command=ls-refs\n'))).toBe(true); expect(wire.includes(Buffer.from('object-format=sha256\n'))).toBe(true);
    expect(wire.includes(Buffer.from('ref-prefix refs/heads/caf\u00e9\n'))).toBe(true); expect(wire.includes(Buffer.from('ref-prefix refs/tags/caf\u00e9\n'))).toBe(true);
    expect(wire.includes(Buffer.from('want '))).toBe(false); expect(wire.includes(Buffer.from('^{}'))).toBe(false);
    expect(gitLsRefsWire(plan(A), 'sha1').length).toBe(0);
  });
  it('refuses duplicate, unknown, overmatched, mixed format and invalid UTF8 forms', () => {
    for (const row of [
      `${A} HEAD symref-target:refs/heads/trunk extra:NONSECRET\n`, `${A} HEAD symref-target:refs/heads/trunk symref-target:refs/heads/trunk\n`, `${A} HEAD peeled:${B}\n`, `${A} HEAD\r\n`, `${A} HEAD symref-target:refs/tags/t\n`, `${C} HEAD symref-target:refs/heads/trunk\n`, `${A} HEADmore symref-target:refs/heads/trunk\n`, `${A} HEAD  symref-target:refs/heads/trunk\n`,
    ]) expect(selectGitLsRefs(plan(), 'sha1', [Buffer.from(row)]).ok).toBe(false);
    expect(selectGitLsRefs(plan(), 'sha1', [Buffer.from([0xff])]).ok).toBe(false);
    expect(selectGitLsRefs(plan(), 'sha1', [Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(`${A} HEAD symref-target:refs/heads/trunk\n`)])]).ok).toBe(false);
    expect(selectGitLsRefs(plan('trunk'), 'sha1', [Buffer.from(`${A} refs/heads/trunk\n`), Buffer.from(`${A} refs/heads/trunk\n`)]).ok).toBe(false);
    expect(selectGitLsRefs(plan('trunk'), 'sha1', [Buffer.from(`${A} refs/heads/trunk-other\n`)]).ok).toBe(false);
    expect(selectGitLsRefs(plan('trunk'), 'sha1', [Buffer.from(`${A} refs/heads/trunk\n`), Buffer.from(`${B} refs/tags/trunk\n`)])).toMatchObject({ ok: false, code: 'ref-ambiguous' });
  });
});

describe('incoming protocol metadata decoder', () => {
  const frame = (value: string | 0 | 1 | 2) => typeof value === 'number' ? gitMetadataFrame(value) : gitMetadataFrame(Buffer.from(value));
  const ad = Buffer.concat(['version 2\n', 'agent=git/NONSECRET_JOIN\n', 'object-format=sha1\n', 'ls-refs=unborn\n', 'fetch=shallow wait-for-done\n'].map(frame).concat(frame(0)));
  it('retains every known capability field and exact raw/decoded compositions', () => {
    const decoded = decodeGitIncomingUnit('advertisement', 'git-v2-stateless', null, ad);
    expect(decoded?.parsed).toEqual({ kind: 'advertisement', protocolVersion: 2, agent: 'git/NONSECRET_JOIN', lsRefs: 'unborn', fetch: ['shallow', 'wait-for-done'], serverOption: false, objectFormat: 'sha1' });
    expect(decoded?.text).toBe(ad.toString()); expect(decoded?.payloadText).toContain('agent=git/NONSECRET_JOIN\nobject-format=sha1\n');
    expect(decoded?.decodedFields).toContain('git/NONSECRET_JOIN'); expect(decoded?.composition).toBe(decoded?.decodedFields.join(''));
    expect(decoded?.composition).toContain('NONSECRET_JOINobject-formatsha1'); expect(decoded?.text).not.toContain('NONSECRET_JOINobject-formatsha1');
    expect(Object.isFrozen(decoded?.parsed)).toBe(true); expect(Object.isFrozen(decoded?.decodedFields)).toBe(true);
  });
  it('rederives complete ref rows and fetch header/end without accepting PACK or progress', () => {
    const refs = Buffer.concat([frame(2), frame(`${A} HEAD symref-target:refs/heads/trunk\n`), frame(0), frame(2)]);
    expect(decodeGitIncomingUnit('ls-refs', 'git-v2-stateless', 'sha1', refs)?.parsed).toEqual({ kind: 'ls-refs', objectFormat: 'sha1', rows: [{ identifier: A, reference: 'HEAD', attributes: [{ kind: 'symref-target', value: 'refs/heads/trunk' }] }] });
    const header = Buffer.concat([frame(2), frame('shallow-info\n'), frame(`shallow ${A}`), frame(1), frame('packfile\n')]);
    const decoded = decodeGitIncomingUnit('fetch-header', 'git-v2-stateless', 'sha1', header);
    expect(decoded?.parsed).toEqual({ kind: 'fetch-header', objectFormat: 'sha1', shallowIdentifier: A, leadingResponseEnd: true });
    const end = decodeGitIncomingUnit('fetch-end', 'git-v2-stateless', 'sha1', Buffer.concat([header, frame(0), frame(2)]));
    expect(end?.parsed).toMatchObject({ kind: 'fetch-end', header: decoded?.parsed, headerDigest: sha256(header), endMarkers: [0, 2] });
    for (const body of ['\u0001PACK_NONSECRET', '\u0002NONSECRET_PROGRESS', 'unknown:NONSECRET\n']) expect(decodeGitIncomingUnit('ls-refs', 'git-v2-stateless', 'sha1', Buffer.concat([frame(body), frame(0), frame(2)]))).toBeUndefined();
  });
  it('refuses unknown/duplicate capabilities and bounds raw byte/frame allocation before capture', () => {
    for (const extra of ['agent=git/extra\n', 'unknown=NONSECRET\n', 'object-format=sha256\n']) {
      const raw = Buffer.concat([ad.subarray(0, -4), frame(extra), frame(0)]);
      expect(decodeGitIncomingUnit('advertisement', 'git-v2-stateless', null, raw)).toBeUndefined();
    }
    expect(decodeGitIncomingUnit('advertisement', 'git-v2-stateless', null, Buffer.alloc(65_537))).toBeUndefined();
    const buffer = new GitMetadataUnitBuffer(16, 3); expect(buffer.append(0)).toBe(true); expect(buffer.append(0)).toBe(true); expect(buffer.append(0)).toBe(true); expect(buffer.append(0)).toBe(false); expect(buffer.wire().length).toBe(12);
    const large = new GitMetadataUnitBuffer(); expect(large.append(Buffer.alloc(65_537))).toBe(false); expect(large.wire().length).toBe(0);
  });
});
