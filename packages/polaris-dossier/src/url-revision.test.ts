import { describe, expect, it } from 'vitest';
import { planUrlRevision, selectUrlRevision, type UrlRevisionPlan } from './url-revision.js';

// REQ-polaris-generation-047: literal remote metadata, independent of any
// consent fixture or Git command builder. Production acquisition has a separate
// transport/integrity test; these assertions protect selection and refusal.
const TIP = 'a'.repeat(40);
const TAG = 'b'.repeat(40);
const SHA256 = 'c'.repeat(64);
const select = (selector: string | undefined, advertisement: string) => {
  const plan = planUrlRevision(selector);
  if (!plan.ok) throw new Error(plan.reason);
  return selectUrlRevision(plan.value, advertisement);
};

describe('remote URL revision selection', () => {
  it('uses the advertised non-main default tip, with no recorded revision fallback', () => {
    expect(select(undefined, `ref: refs/heads/release-next\tHEAD\n${TIP}\tHEAD\n`)).toEqual({ ok: true, value: {
      mode: 'remote-default', reference: 'refs/heads/release-next', identifier: TIP, objectFormat: 'sha1',
    } });
    expect(select(undefined, `${TAG}\tHEAD\n`).ok).toBe(false);
  });

  it('selects an explicit branch independently of HEAD and recognizes SHA-256 metadata', () => {
    expect(select('refs/heads/stable', `${SHA256}\trefs/heads/stable\n`)).toEqual({ ok: true, value: {
      mode: 'remote-ref', reference: 'refs/heads/stable', identifier: SHA256, objectFormat: 'sha256',
    } });
  });

  it('requires qualification when branch and tag share a label, even at the same commit', () => {
    expect(select('stable', `${TIP}\trefs/heads/stable\n${TIP}\trefs/tags/stable\n`)).toEqual({
      ok: false, code: 'ref-ambiguous', reason: '--revision is ambiguous between a remote branch and tag; use refs/heads/<branch> or refs/tags/<tag>',
    });
    expect(select('refs/heads/stable', `${TIP}\trefs/heads/stable\n`).ok).toBe(true);
  });

  it('selects the advertised peeled target for a tag reference, while a full object ID is never peeled', () => {
    expect(select('v1', `${TAG}\trefs/tags/v1\n${TIP}\trefs/tags/v1^{}\n`)).toEqual({ ok: true, value: {
      mode: 'remote-ref', reference: 'refs/tags/v1', identifier: TIP, objectFormat: 'sha1',
    } });
    // Commit type still needs the independent pinned reader, including for a
    // lightweight tag or a raw full identifier naming an annotated tag object.
    expect(select('refs/tags/light', `${TIP}\trefs/tags/light\n`).ok).toBe(true);
    expect(select(TAG.toUpperCase(), 'untrusted metadata is not consulted')).toEqual({ ok: true, value: {
      mode: 'full-commit', reference: null, identifier: TAG, objectFormat: 'sha1',
    } });
  });

  it.each([
    '',
    `ref: refs/heads/main\tHEAD\n`,
    `ref: refs/tags/main\tHEAD\n${TIP}\tHEAD\n`,
    `ref: refs/heads/main\tHEAD\nref: refs/heads/other\tHEAD\n${TIP}\tHEAD\n`,
    `ref: refs/heads/main\tHEAD\n${TIP}\tHEAD\n${TIP}\tHEAD\n`,
    `ref: refs/heads/main\tHEAD\n${TIP}\tHEAD\tignored\n`,
    `ref: refs/heads/main\tHEAD\n${TIP}\trefs/heads/main\n`,
  ])('refuses missing, malformed or conflicting default metadata (%#)', advertisement => {
    const result = select(undefined, advertisement);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('--revision');
  });

  it('does not confuse Git pattern matches with the exact requested ref', () => {
    expect(select('main', `${TIP}\trefs/heads/other/main\n`).ok).toBe(false);
    expect(select('main', `${TIP}\trefs/heads/main\n${TAG}\trefs/heads/other/main\n`).ok).toBe(false);
    expect(select('main', `${TIP}\trefs/tags/main^{}\n`).ok).toBe(false);
    expect(select('main', `${TIP}\trefs/heads/main\n${TAG}\trefs/tags/main^{}\n`).ok).toBe(false);
    expect(select('v1', `${TAG}\trefs/tags/v1\n${SHA256}\trefs/tags/v1^{}\n`).ok).toBe(false);
  });

  it('bounds metadata and selector parsing rather than accepting an unlimited advertisement', () => {
    expect(select(undefined, 'x'.repeat(2_097_153))).toMatchObject({ ok: false, code: 'metadata-limit' });
    expect(planUrlRevision('x'.repeat(1025))).toMatchObject({ ok: false, code: 'selector-limit' });
  });

  it.each(['abcd123', 'main~1', 'main..other', '-upload-pack=evil', 'main:*', 'refs/pull/1/head', 'bad\nref', '', 'refs/heads/.hidden', 'refs/heads/x.lock'])('refuses unsupported selector %j without echoing it', selector => {
    const result = planUrlRevision(selector);
    expect(result.ok).toBe(false);
    if (!result.ok && selector !== '') expect(result.reason).not.toContain(selector);
  });

  it('a full-ID plan needs no remote advertisement at all', () => {
    const plan: UrlRevisionPlan = { kind: 'full-commit', commit: TIP, queries: [] };
    expect(selectUrlRevision(plan, '').ok).toBe(true);
  });
});
