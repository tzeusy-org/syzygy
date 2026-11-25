import { describe, expect, it } from 'vitest';
import { CoverageHoldNotices, HELD_ENTRIES_NAMED, coverageHoldKey, coverageHoldMessage, fidelityCoverageHold, heldEntryLine, heldSchema, submitCoverageNotice } from './coverage-hold.js';
import type { PacketSpan } from './review-model.js';

// syzygy-5dhm.29 (REQ-polaris-generation-035 version 2.28). Every expected value is a literal written here.

const V5 = 'polaris-dossier-local-draft-v5';
const RUN = '/runs/run-x';
const cite = (id: string, p: string, startLine: number, endLine = startLine): Record<string, unknown> => ({ id, path: p, startLine, endLine });
const entry = (id: string, ...citations: Record<string, unknown>[]): Record<string, unknown> => ({ id, kind: 'component', statement: `Statement of ${id}.`, citations });
const draftOf = (schemaVersion: string, citations: Record<string, unknown>[], over: Record<string, unknown> = {}): Record<string, unknown> => ({
  schemaVersion, introduction: { id: 'b-intro', text: 'An introduction.', label: 'observed', citations: [] },
  sections: [{ id: 's-1', title: 'One', paragraphs: [{ id: 'b-1', text: 'A paragraph.', label: 'observed', citations }] }], ...over,
});
const subject = (draft: Record<string, unknown>, entries: Record<string, unknown>[]) => ({ run: RUN, draftRevision: 3, draft, inventoryRevision: 1, inventory: { entries } });
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
  const pair = (draftRevision: number, inventoryRevision: number) => ({ draftRevision, inventoryRevision });
  const response = (draftRevision: number, inventoryRevision: number): Record<string, unknown> => ({
    command: 'session-prompt', outcome: 'refused', stage: 'coverage', coverage: pair(draftRevision, inventoryRevision), reasons: ['"e-a" ("src/a.ts")'],
  });
  const deliveryFrom = (doc: Record<string, unknown>) => async () => ({ exit: 1, doc, stderr: '' });
  const unexpectedDelivery = async (): Promise<never> => { throw new Error('the stored hold must prevent another packet attempt'); };

  it('uses the pair selected by the delivery after the supervisor snapshot moves, and records a successful send once', async () => {
    const sent: string[] = [];
    const notices = new CoverageHoldNotices(sent, RUN);
    expect(coverageHoldKey(3, 1)).toBe('coverage-held-3/1');
    const delivered: string[] = [];
    let acknowledge!: (value: 'sent') => void, entered!: () => void;
    const acknowledgment = new Promise<'sent'>(resolve => { acknowledge = resolve; });
    const sending = new Promise<void>(resolve => { entered = resolve; });
    const send = async (message: string, selected: { draftRevision: number; inventoryRevision: number }): Promise<'sent'> => {
      expect(selected).toEqual({ draftRevision: 4, inventoryRevision: 1 });
      delivered.push(message); entered(); return acknowledgment;
    };
    const advancing = notices.advance(pair(3, 1), deliveryFrom(response(4, 1)), send);
    await Promise.race([sending, advancing]);
    expect(sent).toEqual([]);
    acknowledge('sent');
    expect(await advancing).toEqual({
      kind: 'coverage', pair: pair(4, 1), currentHeld: false, observed: true, notice: 'sent',
    });
    expect(delivered).toHaveLength(1);
    expect(delivered[0]).toContain('Draft revision 4 leaves 1 entry from inventory revision 1');
    expect(delivered[0]).toContain('syzygy dossier check /runs/run-x again.');
    expect(await notices.advance(pair(4, 1), unexpectedDelivery, send)).toMatchObject({ currentHeld: true, observed: false, notice: 'unchanged' });
    expect(await new CoverageHoldNotices(sent, RUN).advance(pair(4, 1), unexpectedDelivery, send)).toEqual({
      kind: 'coverage', pair: pair(4, 1), currentHeld: true, observed: false, notice: 'unchanged',
    });
    expect(delivered).toHaveLength(1);
    expect(sent).toEqual(['coverage-held-4/1']);

    const nativeSent: string[] = [], nativeMessages: string[] = [];
    const native = new CoverageHoldNotices(nativeSent, '/host/path-not-mounted-in-the-role', 'native-control');
    const doc = { ...response(8, 2), reasons: ['SYNTHETIC_SECRET source description', 'src/private-path.ts'] };
    expect(await native.advance(pair(7, 1), deliveryFrom(doc), async (message, selected): Promise<'sent'> => {
      expect(selected).toEqual({ draftRevision: 8, inventoryRevision: 2 }); nativeMessages.push(message); return 'sent';
    })).toMatchObject({ pair: { draftRevision: 8, inventoryRevision: 2 }, currentHeld: false, notice: 'sent' });
    expect(nativeMessages).toEqual(['Syzygy: The fidelity review waits. Draft revision 8 leaves 2 entries from inventory revision 2 without an outcome. '
      + 'All 2 entry descriptions are omitted from this control notice; read the permitted check advice for them. '
      + 'In drafts/next.json, represent each entry with a supported citation or add {"entryId": ..., "reason": ...} to inventoryOmissions. '
      + 'Use artifact_write for drafts/next.json, then dossier_step with the check argv from your launch instructions. '
      + 'This repair counts against the run\'s repair-cycle limit. This notice is coverage bookkeeping, not a review verdict.']);
    expect(nativeMessages[0]!.length).toBeLessThanOrEqual(4000);
    expect(nativeMessages[0]).not.toContain('SYNTHETIC_SECRET');
    expect(nativeMessages[0]).not.toContain('private-path');
    expect(nativeMessages[0]).not.toContain('/host/');
    expect(nativeSent).toEqual(['coverage-held-8/2']);
  });

  it('retains a hold across a failed notice and retries the saved message without marking a send', async () => {
    const sent: string[] = [];
    const notices = new CoverageHoldNotices(sent, RUN);
    const messages: string[] = [];
    const first = await notices.advance(pair(3, 1), deliveryFrom(response(3, 1)), async (message): Promise<'failed'> => { messages.push(message); return 'failed'; });
    expect(first).toMatchObject({ kind: 'coverage', currentHeld: true, observed: true, notice: 'failed' });
    expect(sent).toEqual([]);
    const second = await notices.advance(pair(3, 1), unexpectedDelivery, async (message): Promise<'sent'> => { messages.push(message); return 'sent'; });
    expect(second).toMatchObject({ kind: 'coverage', currentHeld: true, observed: false, notice: 'sent' });
    expect(messages).toHaveLength(2);
    expect(messages[1]).toBe(messages[0]);
    expect(sent).toEqual(['coverage-held-3/1']);
  });

  it('stops after five failed sends or a typed notice that was not submitted, and records neither as sent', async () => {
    const sent: string[] = [];
    const notices = new CoverageHoldNotices(sent, RUN);
    expect(await notices.advance(pair(3, 1), deliveryFrom(response(3, 1)), () => 'failed')).toMatchObject({ notice: 'failed' });
    for (const notice of ['failed', 'failed', 'failed', 'exhausted', 'unchanged']) {
      expect(await notices.advance(pair(3, 1), unexpectedDelivery, () => 'failed')).toMatchObject({ notice });
    }
    expect(await notices.advance(pair(3, 2), deliveryFrom(response(3, 2)), () => 'unsubmitted')).toMatchObject({ notice: 'unsubmitted' });
    const unexpectedSend = (): never => { throw new Error('new input could append to unsubmitted text in the author pane'); };
    expect(await notices.advance(pair(3, 2), unexpectedDelivery, unexpectedSend)).toMatchObject({ currentHeld: true, notice: 'unchanged' });
    expect(await notices.advance(pair(4, 2), deliveryFrom(response(4, 2)), unexpectedSend)).toMatchObject({ currentHeld: true, notice: 'unchanged' });
    expect(sent).toEqual([]);
  });

  it('distinguishes a failed literal write, an Enter failure and two acknowledged operations', () => {
    const unexpectedEnter = (): never => { throw new Error('a failed literal write must not submit Enter'); };
    expect(submitCoverageNotice(() => false, unexpectedEnter)).toBe('failed');
    expect(submitCoverageNotice(() => true, () => false)).toBe('unsubmitted');
    expect(submitCoverageNotice(() => true, () => true)).toBe('sent');
  });

  it('does not turn a reason string or an invalid selection into an observed hold', async () => {
    const notices = new CoverageHoldNotices([], RUN);
    const invalid = [
      { ...response(3, 1), coverage: undefined, reason: 'Draft revision 3, inventory revision 1.' },
      response(3, -1),
      { ...response(3, 1), reasons: [null] },
    ];
    const unexpectedSend = (): never => { throw new Error('an invalid pair must not be sent'); };
    for (const doc of invalid) {
      const deliver = deliveryFrom(doc);
      expect(await notices.advance(pair(3, 1), deliver, unexpectedSend)).toEqual({ kind: 'delivery', step: await deliver() });
    }
  });

  it('keeps the complete edit and check instructions when long descriptions fill the notice budget', () => {
    const entries = Array.from({ length: 12 }, (_, i) => entry(`e-${i + 1}`, cite(`i-${i + 1}`, `src/${'a'.repeat(200)}/${'b'.repeat(200)}/f${i + 1}.ts`, 1)));
    const hold = fidelityCoverageHold(subject(draftOf(V5, []), entries), [], noSecret)!;
    expect(hold.reason.length).toBeGreaterThan(5000);
    const message = coverageHoldMessage(RUN, { draftRevision: 3, inventoryRevision: 1 }, hold.reasons);
    expect(message.length).toBeLessThanOrEqual(4000);
    expect(message).not.toContain('\n');
    expect(message).toContain('Next: in drafts/next.json, either represent each entry in a block that cites what it states');
    expect(message).toContain('add {"entryId": ..., "reason": ...} to `inventoryOmissions`');
    expect(message).toContain('run syzygy dossier check /runs/run-x again. This repair counts against the run\'s repair-cycle limit');
    const retained = (message.match(/"e-\d+"/gu) ?? []).length;
    expect(retained).toBeGreaterThan(0);
    expect(retained).toBeLessThan(12);
    expect(message).toContain(`${12 - retained} entry descriptions omitted`);
  });

  it('preserves bounded recheck instructions for a path too long to print or containing terminal controls', () => {
    const paths = [`/${'segment/'.repeat(510)}run-x`, '/runs/cut\nline'];
    for (const run of paths) {
      const message = coverageHoldMessage(run, pair(3, 1), ['"e-1" ("src/file.ts")']);
      expect(message.length).toBeLessThanOrEqual(4000);
      expect(message).not.toContain(run);
      expect(message).not.toContain('\n');
      expect(message).toContain('add {"entryId": ..., "reason": ...} to `inventoryOmissions`');
      expect(message).toContain('rerun `syzygy dossier check` using the absolute run path from your launch prompt as one argument.');
    }
  });
});
