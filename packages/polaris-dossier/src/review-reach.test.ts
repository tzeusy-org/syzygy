import { describe, expect, it } from 'vitest';
import type { CitedBlob } from './check-model.js';
import { citationReach, reviewReachAdvice, type ReachInputs } from './review-reach.js';

// syzygy-pdja.20: which claim blocks no fidelity verdict can confirm, as advice on the check report. Expected values are literals.

const SECRET_PATH = `docs/${['gh', 'p_'].join('')}${'k'.repeat(24)}.txt`;
/** A stand-in screen: `.md` files have no class, `.env` is a denied path, the token path matches a detector; `.txt` files are
 * project-documentation and everything else code-content; a body holding `SECRET` matches a detector. */
const screenPath = (p: string) => (p === '.env' ? 'denied-path' as const : p === SECRET_PATH ? 'secret-detector-match' as const : p.endsWith('.md') ? 'unknown-extraction-class' as const : undefined);
const screen: ReachInputs['screen'] = {
  screenPath,
  contentClass: (p) => (screenPath(p) !== undefined ? undefined : p.endsWith('.txt') ? 'project-documentation' : 'code-content'),
  screenBody: (body) => (body.includes('SECRET') ? 'secret-detector-match' : undefined),
};
const citedBlobs: CitedBlob[] = [
  { path: 'src/a.c', objectId: 'a', read: true, outcome: 'admitted' },
  { path: 'docs/notes.txt', objectId: 'n', read: true, outcome: 'admitted' },
  { path: 'src/config.c', objectId: 'c', read: true, outcome: 'admitted', redaction: { redactionClass: 'redacted-span', withheldLines: 2, detectorIds: ['credential-assignment'], withheldLineRanges: [[1, 2]] } },
  { path: 'README.md', objectId: null, read: false, outcome: 'unknown-extraction-class' },
  { path: 'src/types.ts', objectId: 't', read: true, outcome: 'active-content' },
  { path: null, objectId: null, read: false, outcome: 'secret-detector-match' },
];
const admitted: ReachInputs['admitted'] = new Map([
  ['src/a.c', { objectId: 'a', raw: 'one\ntwo\n' }],
  ['docs/notes.txt', { objectId: 'n', raw: 'notes\n' }],
  // Lines 1 and 2 withheld; line 4's retained text matches a detector on its own.
  ['src/config.c', { objectId: 'c', raw: '\n\nint port;\nSECRET\n', withheld: [1, 2], retainedLines: ['\n', '\n', 'int port;\n', 'SECRET\n'] }],
]);
const inputs = (consented: readonly string[] | null = null): ReachInputs => ({ citedBlobs, admitted, screen, consented });
const cite = (id: string, path: unknown, startLine = 1, endLine = 1) => ({ id, path, startLine, endLine });

describe('citationReach: how one cited span reaches the fidelity review', () => {
  it.each<[string, unknown, number, number, string]>([
    ['an admitted code-content file', 'src/a.c', 1, 2, 'reaches-review'],
    ['a file without a content class', 'README.md', 1, 1, 'withheld'],
    ['a body with active content', 'src/types.ts', 1, 1, 'withheld'],
    ['a denied path, not in the cited blobs', '.env', 1, 1, 'withheld'],
    ['a secret-matching path, recorded without its path', SECRET_PATH, 1, 1, 'withheld'],
    ['a path naming no file (a check finding already)', 'src/gone.c', 1, 1, 'reaches-review'],
    ['a non-string path', 7, 1, 1, 'reaches-review'],
    ['a range touching a redacted line', 'src/config.c', 2, 3, 'withheld'],
    ['a range of retained lines only', 'src/config.c', 3, 3, 'reaches-review'],
    ['a retained range whose own text a detector matches', 'src/config.c', 4, 4, 'withheld'],
    ['project documentation, with no statement in force', 'docs/notes.txt', 1, 1, 'class-gated'],
  ])('%s', (_name, path, startLine, endLine, expected) => {
    expect(citationReach(cite('c', path, startLine, endLine), inputs())).toBe(expected);
  });

  it('applies the class gate as the run\'s consent decides it, before any redaction', () => {
    expect(citationReach(cite('c', 'docs/notes.txt'), inputs(['project-documentation']))).toBe('reaches-review');
    expect(citationReach(cite('c', 'src/a.c'), inputs([]))).toBe('class-gated');
    expect(citationReach(cite('c', 'src/config.c', 3, 3), inputs([]))).toBe('class-gated');
    expect(citationReach(cite('c', 'src/config.c', 3, 3), inputs(['code-content']))).toBe('reaches-review');
  });
});

describe('reviewReachAdvice: the claim blocks no verdict can confirm', () => {
  const block = (id: string, citations: unknown[], extra: Record<string, unknown> = {}) => ({ id, label: 'inferred', basis: 'source', text: 'A claim.', citations, quotations: [], ...extra });
  const draft = {
    introduction: block('intro', [cite('i1', 'src/a.c')]),
    understanding: { purpose: [{ id: 'u1', label: 'inferred', statement: 'S.', scope: 'X.', citations: [cite('u1c', 'README.md')] }] },
    sections: [{
      id: 's', title: 'S',
      paragraphs: [
        block('only-withheld', [cite('w1', 'README.md'), cite('w2', 'src/config.c', 1, 1)], { children: [block('child-gated', [cite('g1', 'docs/notes.txt')])] }),
        block('gated-and-withheld', [cite('g2', 'docs/notes.txt'), cite('w3', 'README.md')]),
        block('mixed', [cite('m1', 'src/a.c'), cite('m2', 'README.md')]),
        block('quotes-withheld', [cite('q1', 'src/a.c'), cite('q2', 'README.md')], { quotations: ['q2'] }),
        { id: 'unknown-gated', label: 'unknown', reason: 'missing-evidence', text: 'Not established.', citations: [cite('ug', 'docs/notes.txt')] },
        { id: 'unknown-withheld', label: 'unknown', reason: 'missing-evidence', text: 'Not established.', citations: [cite('uw', 'README.md')] },
        block('judgement', [], { judgement: true }),
        { kind: 'table', caption: 'T', columns: ['A'], rows: [{ cells: [block('cell-gated', [cite('t1', 'docs/notes.txt', 1, 1)])] }] },
      ],
    }],
  };

  it('lists each block every cited span of which the review is not given, by its consequence, and counts them', () => {
    expect(reviewReachAdvice(draft, inputs())).toEqual({
      note: expect.stringContaining('it sets no outcome and is not stored in the check record'),
      counts: { unconfirmable: 3, withheldItems: 3 },
      blocks: [
        { at: '$.sections[0].paragraphs[0]', blockId: 'only-withheld', consequence: 'withheld-item', detail: expect.stringContaining('its entry is `withheld`') },
        { at: '$.sections[0].paragraphs[0].children[0]', blockId: 'child-gated', consequence: 'unconfirmable', detail: expect.stringContaining('blocking readiness') },
        { at: '$.sections[0].paragraphs[1]', blockId: 'gated-and-withheld', consequence: 'unconfirmable', detail: expect.stringContaining('at least one by the class gate') },
        { at: '$.sections[0].paragraphs[3]', blockId: 'quotes-withheld', consequence: 'withheld-item', detail: expect.stringContaining('or a span it quotes') },
        { at: '$.sections[0].paragraphs[5]', blockId: 'unknown-withheld', consequence: 'withheld-item', detail: expect.stringContaining('renders Unknown') },
        { at: '$.sections[0].paragraphs[7].rows[0].cells[0]', blockId: 'cell-gated', consequence: 'unconfirmable', detail: expect.stringContaining('the run\'s consent does not cover its file\'s class') },
      ],
    });
  });

  it('lists nothing once the consent covers the gated class, and keeps the screening-withheld blocks', () => {
    const advice = reviewReachAdvice(draft, inputs(['code-content', 'project-documentation']));
    expect(advice.counts).toEqual({ unconfirmable: 0, withheldItems: 3 });
    expect(advice.blocks.map((b) => b.blockId)).toEqual(['only-withheld', 'quotes-withheld', 'unknown-withheld']);
  });

  it('states zero counts, never omits them, for a draft with nothing to list or one that is not an object', () => {
    expect(reviewReachAdvice({ introduction: block('intro', [cite('i1', 'src/a.c')]) }, inputs())).toEqual({ note: expect.any(String), counts: { unconfirmable: 0, withheldItems: 0 }, blocks: [] });
    expect(reviewReachAdvice('x', inputs()).counts).toEqual({ unconfirmable: 0, withheldItems: 0 });
    expect(reviewReachAdvice(null, inputs()).blocks).toEqual([]);
  });

  it('names a block without an identifier as null, and states the advice it carries', () => {
    const advice = reviewReachAdvice({ sections: [{ paragraphs: [{ label: 'inferred', text: 'A claim.', citations: [cite('x', 'docs/notes.txt')] }] }] }, inputs());
    expect(advice.blocks).toEqual([{ at: '$.sections[0].paragraphs[0]', blockId: null, consequence: 'unconfirmable', detail: expect.any(String) }]);
    expect(advice.note).toContain('cite an admitted file that states the same fact, as well or instead, or state it as `unknown`');
    expect(advice.note).toContain('Resubmitting such a block unchanged spends a repair cycle and changes neither.');
  });
});
