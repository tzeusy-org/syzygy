import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import type { EpistemicState } from '@syzygy/cap1-core';

import { FORBIDDEN, identifiersOf, specifiersOf } from '../../support/src/purity.testkit.js';
import { draftOwnerAct, type DraftableClaim } from './owner-act-drafter.js';

// M4 slice 7, arm (b) (P-71 Q3): the drafter is pure and writes nothing.
// Expected values are literals; the digest was computed outside this
// module (`printf '%s' '<bytes>' | sha256sum`).

const UNBOUND: EpistemicState = { label: 'Unknown', reasons: { primary: 'no-currency-bound-declared', secondary: [] }, freshness: 'fresh' };
const ALSO_UNBOUND: EpistemicState = { label: 'Unknown', reasons: { primary: 'excluded-content', secondary: ['no-currency-bound-declared'] }, freshness: 'fresh' };
const CLAIMS: readonly DraftableClaim[] = [
  { claimId: 'claim:source:b', epistemic: ALSO_UNBOUND },
  { claimId: 'claim:source:a', epistemic: UNBOUND },
];
const ARTIFACT = { path: '.syzygy/policies/quality.yaml', bytes: 'policies:\n  currency-bound: 30d\n' };
// Every name the drafter's code may use: its own declarations, parameters and fields, the two types it takes from
// `@syzygy/cap1-core`, `sha256` from `@syzygy/support`, and the array, string, Set and RegExp methods it calls. A global
// it does not use (`globalThis`, `WebSocket`, `fetch`, `performance`) is a name not on it, which the forbidden tokens above
// do not see (syzygy-bpyt.46, the PR 545 round-1 review's D2 and D5).
const DRAFTER_IDENTIFIERS = new Set([
  'DRAFTABLE_ACTS', 'DraftActType', 'DraftInput', 'DraftResult', 'DraftableClaim', 'DraftedClaimChange', 'EpistemicState', 'OwnerActDraft',
  'Readonly', 'Record', 'Set', 'UnknownReason', 'act', 'actType', 'adjudication', 'artifact', 'artifactPath', 'bytes', 'carries',
  'ceremonyPhrase', 'claim', 'claimId', 'claims', 'consent', 'const', 'declaration', 'draft', 'draftOwnerAct', 'epistemic', 'every', 'find',
  'from', 'frozenDigest', 'ids', 'includes', 'input', 'kind', 'label', 'length', 'map', 'path', 'phrase', 'policy', 'primary', 'reason',
  'reasons', 'refusal', 'relativePath', 'resolves', 'secondary', 'segment', 'sha256', 'size', 'sort', 'split', 'state', 'status', 'stray',
  'subject', 'test', 'title', 'to', 'undefined',
]);

describe('owner-act drafter (M4 slice 7)', () => {
  it('returns the packet as data for a fixture Unknown: a hard-coded literal', () => {
    expect(draftOwnerAct({ reason: 'no-currency-bound-declared', claims: CLAIMS, artifact: ARTIFACT, actType: 'policy' })).toEqual({
      kind: 'drafted',
      draft: {
        status: 'draft-binds-nothing',
        actType: 'policy',
        reason: 'no-currency-bound-declared',
        subject: 'Adopt policy for .syzygy/policies/quality.yaml',
        ceremonyPhrase: 'ADOPT POLICY .syzygy/policies/quality.yaml: 9ce17e548abcb5775b7d90d550badde852e75c04b72e1b0129e2f8b3bf4433dd',
        artifactPath: '.syzygy/policies/quality.yaml',
        frozenDigest: '9ce17e548abcb5775b7d90d550badde852e75c04b72e1b0129e2f8b3bf4433dd',
        claims: [
          { claimId: 'claim:source:a', from: 'no-currency-bound-declared', to: 'reason-discharged-pending-new-evaluation' },
          { claimId: 'claim:source:b', from: 'no-currency-bound-declared', to: 'reason-discharged-pending-new-evaluation' },
        ],
      },
    });
  });

  it('refuses a wrong act type, no claims, a claim without the reason, a repeated claim, or a non-relative path', () => {
    const base = { reason: 'no-currency-bound-declared', claims: CLAIMS, artifact: ARTIFACT, actType: 'policy' } as const;
    expect(draftOwnerAct({ ...base, actType: 'consent' })).toEqual({ kind: 'refused', refusal: 'a consent act does not discharge no-currency-bound-declared' });
    expect(draftOwnerAct({ ...base, claims: [] })).toEqual({ kind: 'refused', refusal: 'no claims' });
    const observed: DraftableClaim = { claimId: 'claim:source:c', epistemic: { label: 'Observed', tier: 'report-fact', freshness: 'fresh' } };
    expect(draftOwnerAct({ ...base, claims: [...CLAIMS, observed] })).toEqual({ kind: 'refused', refusal: 'claim:source:c does not carry no-currency-bound-declared' });
    expect(draftOwnerAct({ ...base, claims: [...CLAIMS, CLAIMS[1]!] })).toEqual({ kind: 'refused', refusal: 'a claim is named twice' });
    for (const path of ['/etc/passwd', '../outside.yaml', 'a//b.yaml', 'a/./b.yaml', '']) {
      expect(draftOwnerAct({ ...base, artifact: { path, bytes: '' } })).toEqual({ kind: 'refused', refusal: `not a repository-relative path: ${path}` });
    }
  });

  it('is pure: it imports no filesystem, network or process module and names no write', () => {
    const source = readFileSync(new URL('./owner-act-drafter.ts', import.meta.url), 'utf8');
    // Every module specifier, and the forbidden tokens, by the reader and
    // the list @syzygy/support's purity test uses (syzygy-bpyt.6.14).
    expect([...new Set(specifiersOf(source))].sort()).toEqual(['@syzygy/cap1-core', '@syzygy/support']);
    expect(/^import type .* from '@syzygy\/cap1-core';$/m.test(source)).toBe(true);
    for (const forbidden of FORBIDDEN) {
      expect(source, String(forbidden)).not.toMatch(forbidden);
    }
  });

  it('names no identifier outside its literal list, so it reads no global it does not use', () => {
    const source = readFileSync(new URL('./owner-act-drafter.ts', import.meta.url), 'utf8');
    expect(identifiersOf('owner-act-drafter.ts', source).filter((name) => !DRAFTER_IDENTIFIERS.has(name))).toEqual([]);
  });
});
