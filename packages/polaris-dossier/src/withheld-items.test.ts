import { describe, expect, it } from 'vitest';
import { packetSpanStanding } from './review-verdict.js';
import { isJudgement, isUncitedJudgement, isWithheldItem, type SpanStanding } from './withheld-items.js';

// Dossier spec v1.5, REQ-polaris-generation-034: which items are withheld and which blocks are uncited judgements. Expected values are
// literals fixed here.
const standing = (table: Record<string, SpanStanding>) => (id: string): SpanStanding => table[id] ?? 'other';
const cite = (id: string) => ({ id, path: 'a.c', startLine: 1, endLine: 1 });

describe('withheld items', () => {
  it.each<[string, Record<string, unknown>, Record<string, SpanStanding>, boolean]>([
    ['every citation withheld', { citations: [cite('a'), cite('b')], quotations: [] }, { a: 'withheld', b: 'withheld' }, true],
    ['one admitted citation beside a withheld one, quoting neither', { citations: [cite('a'), cite('b')], quotations: [] }, { a: 'withheld', b: 'admitted' }, false],
    ['a quotation from a withheld span beside an admitted citation', { citations: [cite('a'), cite('b')], quotations: ['a'] }, { a: 'withheld', b: 'admitted' }, true],
    ['a quotation from an admitted span beside a withheld citation', { citations: [cite('a'), cite('b')], quotations: ['b'] }, { a: 'withheld', b: 'admitted' }, false],
    ['no citation at all', { citations: [], quotations: [] }, {}, false],
    ['only class-gated citations, which keep their own treatment', { citations: [cite('a')], quotations: [] }, { a: 'other' }, false],
    ['one withheld and one class-gated citation', { citations: [cite('a'), cite('b')], quotations: [] }, { a: 'withheld', b: 'other' }, false],
  ])('%s', (_name, value, table, expected) => {
    expect(isWithheldItem(value, standing(table))).toBe(expected);
  });

  it.each<[string, boolean]>([
    ['admitted', false], ['redacted-span', true], ['denied-path', true], ['secret-detector-match', true], ['unknown-extraction-class', true],
    ['not-utf8-text', true], ['active-content', true], ['class-not-consented', false], ['absent', false], ['beyond-blob', false],
  ])('a packet span with outcome %s is withheld: %s', (outcome, withheld) => {
    expect(packetSpanStanding(outcome as never) === 'withheld').toBe(withheld);
    expect(packetSpanStanding(outcome as never)).toBe(outcome === 'admitted' ? 'admitted' : withheld ? 'withheld' : 'other');
  });
});

describe('uncited judgements', () => {
  it.each<[string, Record<string, unknown>, boolean, boolean]>([
    ['an Inferred block marked, citing nothing', { label: 'inferred', judgement: true, citations: [] }, true, true],
    ['an Inferred block marked, citing a source', { label: 'inferred', judgement: true, citations: [cite('a')] }, false, true],
    ['an Inferred block unmarked, citing nothing', { label: 'inferred', citations: [] }, false, false],
    ['an Inferred block marked false', { label: 'inferred', judgement: false, citations: [] }, false, false],
    ['an Unknown block marked', { label: 'unknown', judgement: true, citations: [] }, false, false],
    ['a non-normative block marked', { label: 'non-normative', judgement: true }, false, false],
  ])('%s', (_name, value, uncited, judged) => {
    expect(isUncitedJudgement(value)).toBe(uncited);
    expect(isJudgement(value)).toBe(judged);
  });
});
