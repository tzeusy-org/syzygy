import { describe, expect, it } from 'vitest';
import { deriveStructure, deriveTreeFacts, structureUnknown } from './derive.js';
import { questionKindAdvice } from './question-kinds.js';
import { figureFit } from './figure-fit.js';
import { readerAdvice } from './reader-advice.js';
import { readingLedger, compareLedgers } from './reading-ledger.js';
import { deriveManifestFacts, manifestFactsUnknown } from './manifest-facts.js';
import { buildDossierScreen } from './screen.js';
import { policyFixture } from './full-run.testkit.js';
import { urlManifestFactsShape, urlReadingDifferenceShape, urlReadingLedgerShape, urlStructureRecordShape, urlQuestionKindAdviceShape } from './url-check-product-shape.js';

describe('current checked producer member projections', () => {
  it('admits actual Unknown and compared question-kind advice while refusing malformed nested declarations', () => {
    const facts = deriveTreeFacts([{ path: 'src/own.ts', mode: '100644' }], () => false);
    const unknown = questionKindAdvice({}, facts, () => false);
    const compared = questionKindAdvice({ schemaVersion: 'polaris-dossier-local-draft-v13',
      questionKinds: [{ blockId: 'own-unmatched-block', kinds: ['change'] }] }, facts, () => false);
    expect(urlQuestionKindAdviceShape(unknown)).toBe(true);
    expect(compared).toMatchObject({ state: 'compared', declarations: { rows: 1, counted: 0, unmatched: ['own-unmatched-block'] } });
    expect(urlQuestionKindAdviceShape(compared)).toBe(true);
    if (compared.state !== 'compared') throw new Error('owned question-kind comparison missing');
    for (const mutant of [
      { ...unknown, extra: true }, { ...unknown, why: 1 },
      { ...compared, label: 'Observed' }, { ...compared, kinds: ['invented'] },
      { ...compared, rule: { ...compared.rule, version: 0 } },
      { ...compared, declarations: { ...compared.declarations, rows: -1 } },
      { ...compared, declarations: { ...compared.declarations, unmatched: [null] } },
      { ...compared, units: [{ ...compared.units[0], answered: { purpose: 0 } }] },
      { ...compared, units: [{ ...compared.units[0], missing: ['invented'] }] },
      { ...compared, majorUnits: { ...compared.majorUnits, extra: true } },
    ]) expect(urlQuestionKindAdviceShape(mutant)).toBe(false);
  });
  it('admits actual structure output and refuses unknown nested fields', () => {
    const record = deriveStructure([{ path: 'src/server.ts', mode: '100644' }], () => false);
    expect(urlStructureRecordShape(record)).toBe(true);
    expect(urlStructureRecordShape(structureUnknown('owned refusal'))).toBe(true);
    if (record.state !== 'derived') throw new Error('owned structure missing');
    expect(urlStructureRecordShape({ ...record, traits: { ...record.traits, tests: { ...record.traits.tests, invented: true } } })).toBe(false);
  });
  it('admits actual ledger and signed comparison deltas while refusing malformed numbers and extras', () => {
    const record = readingLedger({}, figureFit({}, undefined), readerAdvice({}));
    expect(urlReadingLedgerShape(record)).toBe(true);
    expect(urlReadingLedgerShape({ ...record, draft: { ...record.draft, figures: -1 } })).toBe(false);
    const difference = { state: 'compared', against: { runId: 'owned', revision: 1, pinnedRevision: 'a'.repeat(40), checkedAt: '2026-11-22T00:00:00.000Z' },
      ...compareLedgers(record, record), unreadableRuns: 0, unreadableCheckRecords: 0 };
    expect(urlReadingDifferenceShape(difference)).toBe(true);
    expect(urlReadingDifferenceShape({ ...difference, pages: [{ ...difference.pages[0], invented: true }] })).toBe(false);
  });
  it('admits current manifest facts and fails closed on a missing or malformed coverage remainder', async () => {
    const built = buildDossierScreen(policyFixture().bytes, true, null, 'private');
    if (!built.ok) throw new Error('owned screen missing');
    const record = await deriveManifestFacts({ entries: [], screen: built.screen, consented: null,
      read: async () => { throw new Error('empty census must read no blob'); } });
    expect(record).toMatchObject({ format: 'polaris-dossier-manifest-facts/2' });
    expect(urlManifestFactsShape(record)).toBe(true);
    const unknown = manifestFactsUnknown('owned refusal');
    expect(urlManifestFactsShape(unknown)).toBe(true);
    if (record.state !== 'derived') throw new Error('owned census missing');
    const { remainder, ...withoutRemainder } = record;
    expect(record.recognizers).toHaveLength(10);
    expect(urlManifestFactsShape(withoutRemainder)).toBe(false);
    expect(urlManifestFactsShape({ ...withoutRemainder, format: 'polaris-dossier-manifest-facts/1' })).toBe(false);
    expect(urlManifestFactsShape({ ...unknown, format: 'polaris-dossier-manifest-facts/1' })).toBe(false);
    expect(urlManifestFactsShape({ ...unknown, remainder })).toBe(false);
    expect(urlManifestFactsShape({ ...record, remainder: { ...remainder, places: [{ place: false, files: 0, notCandidates: 0 }] } })).toBe(false);
    expect(urlManifestFactsShape({ ...record, remainder: { ...remainder, places: [{ ...remainder.places[0], extra: true }] } })).toBe(false);
    expect(urlManifestFactsShape({ ...record, recognizers: [{ ...record.recognizers[0], invented: true }] })).toBe(false);
    expect(urlManifestFactsShape({ ...record, facts: [{ fact: 'invented' }] })).toBe(false);
  });
});
