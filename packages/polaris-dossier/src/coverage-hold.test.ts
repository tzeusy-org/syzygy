import { describe, expect, it } from 'vitest';
import { HELD_ENTRIES_NAMED, fidelityCoverageHold, heldEntryLine, heldSchema } from './coverage-hold.js';
import type { PacketSpan } from './review-model.js';
import { coverageHoldKey, coverageHoldMessage } from './polaris.js';

// syzygy-5dhm.29 (REQ-polaris-generation-035 version 2.28). Every expected value is a literal written here.

const V5 = 'polaris-dossier-local-draft-v5';
const cite = (id: string, p: string, startLine: number, endLine = startLine): Record<string, unknown> => ({ id, path: p, startLine, endLine });
const entry = (id: string, ...citations: Record<string, unknown>[]): Record<string, unknown> => ({ id, kind: 'component', statement: `Statement of ${id}.`, citations });
const draftOf = (schemaVersion: string, citations: Record<string, unknown>[], over: Record<string, unknown> = {}): Record<string, unknown> => ({
  schemaVersion, introduction: { id: 'b-intro', text: 'An introduction.', label: 'observed', citations: [] },
  sections: [{ id: 's-1', title: 'One', paragraphs: [{ id: 'b-1', text: 'A paragraph.', label: 'observed', citations }] }], ...over,
});
const subject = (draft: Record<string, unknown>, entries: Record<string, unknown>[]) => ({ run: '/runs/run-x', draftRevision: 3, draft, inventoryRevision: 1, inventory: { entries } });
const noSecret = (): boolean => false;

describe('fidelityCoverageHold', () => {
  it('holds a v5 draft that leaves an entry without an outcome, naming it by identifier and path', () => {
    const hold = fidelityCoverageHold(subject(draftOf(V5, [cite('c-1', 'src/a.ts', 1, 4)]), [entry('e-a', cite('i-1', 'src/a.ts', 3)), entry('e-b', cite('i-2', 'src/b.ts', 1))]), [], noSecret);
    expect(hold?.reasons).toEqual(['"e-b" ("src/b.ts")']);
    expect(hold?.entries).toEqual([{ entryId: 'e-b', paths: ['src/b.ts'], unnamedPaths: 0 }]);
    expect(hold?.reason).toBe('The fidelity review waits, so no fidelity packet is issued: 1 entry of inventory revision 1 has no outcome in draft revision 3. '
      + 'An entry has an outcome when a block of the draft cites a span on one of its paths with overlapping lines, or a claim block\'s text names one of its paths, '
      + 'or the draft\'s `inventoryOmissions` records it with a reason. Without one: "e-b" ("src/b.ts"). '
      + 'Next: in drafts/next.json, either represent each entry in a block that cites what it states, or add {"entryId": ..., "reason": ...} to `inventoryOmissions` '
      + 'saying why a reader of this dossier does not need it; then run syzygy dossier check /runs/run-x again. '
      + 'The packet is issued once a passed draft revision leaves no entry without an outcome; the reviewer still judges each entry and each reason.');
    expect(hold?.reason).not.toContain('Statement of');
  });

  it('issues when every entry is covered, named in a claim, or recorded as omitted', () => {
    const entries = [entry('e-a', cite('i-1', 'src/a.ts', 3)), entry('e-b', cite('i-2', 'src/b.ts', 1)), entry('e-c', cite('i-3', 'src/c.ts', 9))];
    const draft = draftOf(V5, [cite('c-1', 'src/a.ts', 1, 4)], {
      deepDives: [{ id: 'd-1', title: 'B', paragraphs: [{ id: 'b-2', text: 'See src/b.ts for the loader.', label: 'inferred', citations: [] }] }],
      inventoryOmissions: [{ entryId: 'e-c', reason: 'Outside this dossier.' }],
    });
    expect(fidelityCoverageHold(subject(draft, entries), [], noSecret)).toBeUndefined();
  });

  it('does not count a disjoint span on the same path, or an omission row without a reason', () => {
    const entries = [entry('e-a', cite('i-1', 'src/a.ts', 10))];
    expect(fidelityCoverageHold(subject(draftOf(V5, [cite('c-1', 'src/a.ts', 1, 9)]), entries), [], noSecret)?.reasons).toEqual(['"e-a" ("src/a.ts")']);
    expect(fidelityCoverageHold(subject(draftOf(V5, [], { inventoryOmissions: [{ entryId: 'e-a', reason: '' }] }), entries), [], noSecret)?.reasons).toEqual(['"e-a" ("src/a.ts")']);
  });

  it('never holds a draft of schema v2 to v4, which can record no omission', () => {
    const entries = [entry('e-b', cite('i-2', 'src/b.ts', 1))];
    for (const version of ['polaris-dossier-local-draft-v2', 'polaris-dossier-local-draft-v3', 'polaris-dossier-local-draft-v4']) {
      expect(fidelityCoverageHold(subject(draftOf(version, []), entries), [], noSecret)).toBeUndefined();
    }
    expect(heldSchema('polaris-dossier-local-draft-v4')).toBe(false);
    expect(heldSchema('polaris-dossier-local-draft-v13')).toBe(true);
    expect(heldSchema(undefined)).toBe(false);
  });

  it('leaves out an entry screening withholds, whose outcome is Syzygy\'s', () => {
    const withheld: PacketSpan = { id: 'span-1', path: null, startLine: 1, endLine: 1, objectId: null, outcome: 'secret-detector-match', citedBy: [{ subject: 'inventory', citationId: 'i-9' }] };
    const admitted: PacketSpan = { id: 'span-2', path: 'src/b.ts', startLine: 1, endLine: 1, objectId: 'abc', outcome: 'admitted', text: 'x\n', citedBy: [{ subject: 'inventory', citationId: 'i-2' }] };
    const entries = [entry('e-secret', cite('i-9', 'config/secret.env', 1)), entry('e-b', cite('i-2', 'src/b.ts', 1))];
    const hold = fidelityCoverageHold(subject(draftOf(V5, []), entries), [withheld, admitted], (p) => p === 'config/secret.env');
    expect(hold?.reasons).toEqual(['"e-b" ("src/b.ts")']);
  });

  it('counts a secret path and never names it, and names an entry with no identifier or no path plainly', () => {
    expect(heldEntryLine({ entryId: 'e-1', paths: ['src/a.ts'], unnamedPaths: 1 })).toBe('"e-1" ("src/a.ts", 1 path not named because a secret detector matches it)');
    expect(heldEntryLine({ entryId: 'e-2', paths: [], unnamedPaths: 2 })).toBe('"e-2" (2 paths not named because a secret detector matches them)');
    expect(heldEntryLine({ entryId: null, paths: [], unnamedPaths: 0 })).toBe('an entry with no identifier (cites no path)');
    expect(heldEntryLine({ entryId: 'say "hi"', paths: ['a b.ts'], unnamedPaths: 0 })).toBe('"say \\"hi\\"" ("a b.ts")');
  });

  it('names twelve entries in its paragraph, counts the rest, and lists every one in its reasons', () => {
    expect(HELD_ENTRIES_NAMED).toBe(12);
    const entries = Array.from({ length: 14 }, (_, i) => entry(`e-${i + 1}`, cite(`i-${i + 1}`, `src/f${i + 1}.ts`, 1)));
    const hold = fidelityCoverageHold(subject(draftOf(V5, []), entries), [], noSecret)!;
    expect(hold.reasons).toHaveLength(14);
    expect(hold.reason).toContain('14 entries of inventory revision 1 have no outcome in draft revision 3.');
    expect(hold.reason).toContain('"e-12" ("src/f12.ts"); and 2 more (every one is in this refusal\'s reasons and in check\'s inventoryCoverageAdvice). Next:');
    expect(hold.reason).not.toContain('"e-13"');
  });
});

describe('the launched run\'s hold notice', () => {
  it('keys the hold by its draft and inventory pair and tells the author the refusal in one line', () => {
    expect(coverageHoldKey(3, 1)).toBe('coverage-held-3/1');
    expect(coverageHoldMessage('The fidelity review waits.\nNext: repair.')).toBe('Syzygy: The fidelity review waits. Next: repair. This repair counts against the run\'s repair-cycle limit like any other draft revision.');
  });
});
