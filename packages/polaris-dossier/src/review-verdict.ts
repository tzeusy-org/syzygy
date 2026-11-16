import * as fs from 'node:fs';
import { bodyLines, leadInQuotations, locateQuote, normaliseTracked, reviewVerdict, type TrackedText } from '@syzygy/polaris-generation-core/live';
import { isRecord } from '@syzygy/support';
import { collectBlocks, declaredSessionId } from './check.js';
import { checkDraftShape, localVerdictSchema } from './draft-schema.js';
import { type PacketBuild, type PacketSpan, type ReviewKind, type ReviewProblem, type ReviewProblemKind, list, text } from './review-model.js';
import { ADVISORY_ENTRY, WITHHELD_ENTRY } from './draft-schema.js';
import { isUncitedJudgement, isWithheldItem, type SpanStanding } from './withheld-items.js';

/** How a packet span stands for the withheld-item rule (`withheld-items.ts`): an excluded or invalid UTF-8 blob, or a range touching a
 * redacted line, is withheld; a class-gated span keeps its own treatment. */
export function packetSpanStanding(outcome: PacketSpan['outcome']): SpanStanding {
  if (outcome === 'admitted') return 'admitted';
  if (outcome === 'redacted-span' || outcome === 'denied-path' || outcome === 'secret-detector-match' || outcome === 'unknown-extraction-class'
    || outcome === 'not-utf8-text' || outcome === 'active-content') return 'withheld';
  return 'other';
}

/** Each subject's citation identities, by how the span they name stands. */
export function standingBySubject(spans: readonly PacketSpan[]): { readonly draft: (citationId: string) => SpanStanding; readonly inventory: (citationId: string) => SpanStanding } {
  const by = { draft: new Map<string, SpanStanding>(), inventory: new Map<string, SpanStanding>() };
  for (const span of spans) for (const cited of span.citedBy) by[cited.subject].set(cited.citationId, packetSpanStanding(span.outcome));
  return { draft: (id) => by.draft.get(id) ?? 'other', inventory: (id) => by.inventory.get(id) ?? 'other' };
}

/** Validating a reviewer's verdict against the packet; split out of `review.ts` unchanged. */

export function nextVerdictNumber(reviews: string, kind: ReviewKind): number {
  let names: string[];
  try { names = fs.readdirSync(reviews); } catch { return 0; }
  const pattern = new RegExp(`^${kind}-verdict-(0|[1-9][0-9]*)\\.json$`, 'u');
  const numbers = names.flatMap((name) => { const match = pattern.exec(name); return match === null ? [] : [Number(match[1])]; });
  return numbers.length === 0 ? 0 : Math.max(...numbers) + 1;
}

/** Whether the verdict's own rows block readiness. */
export function derivedBlocking(verdict: Readonly<Record<string, unknown>>): boolean {
  const rows = (key: string): Readonly<Record<string, unknown>>[] => list(verdict[key]).filter(isRecord);
  return rows('findings').some((row) => row['severity'] === 'blocking')
    || rows('inventoryCoverage').some((row) => row['disposition'] !== 'represented' && row['disposition'] !== 'justified-omission' && row['disposition'] !== WITHHELD_ENTRY)
    || rows('inventoryAccuracy').some((row) => row['accuracy'] !== 'accurate' && row['accuracy'] !== WITHHELD_ENTRY)
    || rows('blockSupport').some((row) => row['verdict'] !== 'supported' && row['verdict'] !== WITHHELD_ENTRY && row['verdict'] !== ADVISORY_ENTRY);
}

/** Every validation of REQ-polaris-generation-035 over a parsed verdict, against the packet rebuilt now. */
export function validateVerdict(verdict: Readonly<Record<string, unknown>>, built: Extract<PacketBuild, { ok: true }>, authoringIds: ReadonlySet<string>): ReviewProblem[] {
  const problems: ReviewProblem[] = [];
  const add = (kind: ReviewProblemKind, at: string, detail: string): void => { problems.push({ kind, at, detail }); };
  const pinned = text(built.draft.doc['pinnedRevision']) ?? '';
  for (const error of checkDraftShape(localVerdictSchema({ pinnedRevision: pinned }), verdict)) add('schema', error.path, error.detail);

  if (verdict['packetSha256'] !== built.sha256) {
    add('stale-packet', '$.packetSha256', `the verdict names a packet other than the one Syzygy rebuilt now from the current frozen draft and inventory (${built.sha256}); a verdict bound to another packet does not count`);
  }
  const sessionId = declaredSessionId(verdict);
  if (sessionId !== null && authoringIds.has(sessionId)) add('session-identity', '$.sessionId', 'the verdict declares the authoring session\'s identifier: a review by the authoring session does not count');
  if (sessionId !== null && sessionId === built.inventory.sessionId) add('session-identity', '$.sessionId', 'the verdict declares the inventory session\'s identifier: the review session must differ from the session whose inventory it reviews');

  const entryIds = list(built.inventory.doc['entries']).flatMap((entry) => (isRecord(entry) && text(entry['id']) !== undefined ? [text(entry['id'])!] : []));
  const claimBlocks = collectBlocks(built.draft.doc).filter((block) => block.textKey === 'text');
  const blockIds = claimBlocks.flatMap((block) => (text(block.value['id']) === undefined ? [] : [text(block.value['id'])!]));
  const inferredBlocks = new Set(claimBlocks.filter((block) => block.value['label'] === 'inferred').map((block) => text(block.value['id'])));
  const spans = new Map(built.spans.map((span) => [span.id, span]));
  const complete = (key: string, idKey: string, expected: readonly string[], kind: ReviewProblemKind, noun: string): void => {
    const seen = new Set<string>();
    list(verdict[key]).forEach((row, i) => {
      const id = isRecord(row) ? text(row[idKey]) : undefined;
      if (id === undefined) return;
      if (!expected.includes(id)) add('unresolved-reference', `$.${key}[${i}].${idKey}`, `no ${noun} in the packet has the identity ${JSON.stringify(id)}`);
      else if (seen.has(id)) add('duplicate-entry', `$.${key}[${i}].${idKey}`, `the ${noun} ${JSON.stringify(id)} has more than one row`);
      seen.add(id);
    });
    for (const id of expected) if (!seen.has(id)) add(kind, `$.${key}`, `the ${noun} ${JSON.stringify(id)} has no row`);
  };
  complete('inventoryCoverage', 'entryId', entryIds, 'coverage-incomplete', 'inventory entry');
  complete('inventoryAccuracy', 'entryId', entryIds, 'accuracy-incomplete', 'inventory entry');
  complete('blockSupport', 'blockId', blockIds, 'support-incomplete', 'claim block');
  list(verdict['inventoryCoverage']).forEach((row, i) => {
    list(isRecord(row) ? row['blockIds'] : []).forEach((id, k) => {
      if (typeof id === 'string' && !blockIds.includes(id)) add('unresolved-reference', `$.inventoryCoverage[${i}].blockIds[${k}]`, `no claim block of the draft has the identity ${JSON.stringify(id)}`);
    });
  });
  for (const key of ['inventoryAccuracy', 'blockSupport'] as const) {
    list(verdict[key]).forEach((row, i) => {
      list(isRecord(row) ? row['spanIds'] : []).forEach((id, k) => {
        if (typeof id === 'string' && !spans.has(id)) add('unresolved-reference', `$.${key}[${i}].spanIds[${k}]`, `the packet has no span ${JSON.stringify(id)}`);
      });
    });
  }

  // v1.5: `withheld` fits a withheld item and an inventory entry whose every cited span is withheld; `advisory` fits an uncited judgement
  // block. Either entry marked accurate or supported is refused, and so is either value on an entry it does not fit.
  const standing = standingBySubject(built.spans);
  const withheldBlocks = new Set(claimBlocks.filter((block) => isWithheldItem(block.value, standing.draft)).map((block) => text(block.value['id'])));
  const judgements = new Set(claimBlocks.filter((block) => isUncitedJudgement(block.value)).map((block) => text(block.value['id'])));
  const withheldEntries = new Set(list(built.inventory.doc['entries']).filter(isRecord).filter((entry) => isWithheldItem(entry, standing.inventory)).map((entry) => text(entry['id'])));
  const fit = (key: string, idKey: string, valueKey: string, held: ReadonlySet<string | undefined>, judged: ReadonlySet<string | undefined>, judgedAs: string | null): void => {
    list(verdict[key]).forEach((row, i) => {
      if (!isRecord(row)) return;
      const id = text(row[idKey]), value = row[valueKey], at = `$.${key}[${i}].${valueKey}`;
      if (value === WITHHELD_ENTRY && !held.has(id)) add('withheld-entry', at, `${JSON.stringify(id)} is not withheld: \`withheld\` is only for an item every cited span of which, or a quotation of which, screening withholds`);
      if (judgedAs !== null && held.has(id) && value === judgedAs) add('withheld-entry', at, `${JSON.stringify(id)} is withheld, so it is never judged ${judgedAs}: its entry is \`withheld\``);
      if (value === ADVISORY_ENTRY && !judged.has(id)) add('advisory-entry', at, `${JSON.stringify(id)} is not an uncited judgement: \`advisory\` is only for an Inferred block marked as a judgement and citing nothing`);
      if (judgedAs !== null && judged.has(id) && value === judgedAs) add('advisory-entry', at, `${JSON.stringify(id)} is an uncited judgement, so it is never judged ${judgedAs}: its entry is \`advisory\`, or a blocking finding where it asserts a project fact`);
    });
  };
  fit('blockSupport', 'blockId', 'verdict', withheldBlocks, judgements, 'supported');
  fit('inventoryAccuracy', 'entryId', 'accuracy', withheldEntries, new Set(), 'accurate');
  // Coverage judges whether the draft carries an entry, not the entry's accuracy: a withheld entry may still be represented.
  fit('inventoryCoverage', 'entryId', 'disposition', withheldEntries, new Set(), null);

  // Every quotation the verdict relies on verifies against the span it names, in the blob Syzygy read now.
  const tracked = new Map<string, TrackedText>();
  for (const [key, field] of [['inventoryCoverage', 'reason'], ['inventoryAccuracy', 'reason'], ['blockSupport', 'reason'], ['findings', 'message']] as const) {
    list(verdict[key]).forEach((row, i) => {
      if (!isRecord(row)) return;
      const at = `$.${key}[${i}]`;
      const quotes = leadInQuotations(text(row[field]) ?? '');
      const namedSpans = list(row['quotations']);
      if (quotes.length !== namedSpans.length) add('quotation-count', `${at}.quotations`, `the ${field} carries ${quotes.length} quotation(s) and quotations names ${namedSpans.length} span(s); name one per quotation, in order`);
      quotes.forEach((quote, q) => {
        if (!quote.terminated) { add('quotation-unverified', `${at}.${field}`, `quotation ${q + 1} has no closed quote after its lead-in`); return; }
        const id = namedSpans[q];
        if (id === undefined) return;
        const span = typeof id === 'string' ? spans.get(id) : undefined;
        if (span === undefined || span.outcome !== 'admitted') { add('quotation-span', `${at}.quotations[${q}]`, 'the quotation names no admitted span of the packet'); return; }
        // The admitted packet span is a contiguous original range and contains no withheld line. Re-splitting the marked whole body
        // would use presentation line numbers; the span's own bytes preserve its original line identity.
        const raw = span.text;
        if (!tracked.has(span.id)) tracked.set(span.id, normaliseTracked(raw));
        const located = locateQuote(raw, tracked.get(span.id)!, quote.inner, 1, bodyLines(raw).length);
        if (!located.found) add('quotation-unverified', `${at}.${field}`, `quotation ${q + 1} does not verify against ${span.id} (${located.kind})`);
      });
    });
  }

  // Consistency: the shared verdict rule, then no readiness beside a blocking row. Only a verdict of the right shape is judged. The
  // shared rule's support rows are the inferred blocks': an unknown or non-normative block cites nothing it claims, so its support row
  // judges its label and names no span.
  // A `withheld` or `advisory` row judges no support, so the shared rule does not see it.
  const supportRows = list(verdict['blockSupport']).filter(isRecord).filter((row) => inferredBlocks.has(text(row['blockId'])) && row['verdict'] !== WITHHELD_ENTRY && row['verdict'] !== ADVISORY_ENTRY);
  if (!problems.some((problem) => problem.kind === 'schema') && supportRows.length > 0) {
    try {
      reviewVerdict({
        inventoryCoverage: list(verdict['inventoryCoverage']).filter(isRecord).filter((row) => row['disposition'] !== WITHHELD_ENTRY).map((row) => ({ entryId: row['entryId'], disposition: row['disposition'], blockIds: row['blockIds'], reason: row['reason'] })),
        blockSupport: supportRows.map((row) => ({ blockId: row['blockId'], verdict: row['verdict'], sourceIds: row['spanIds'], reason: row['reason'] })),
        findings: list(verdict['findings']).filter(isRecord).map((row) => ({ severity: row['severity'], message: row['message'], target: row['target'] })),
      });
    } catch (cause) {
      add('inconsistent', '$', `the verdict is inconsistent: ${(cause as Error).message} (a represented entry names a block, a supported inferred block names a span)`);
    }
  }
  if (!problems.some((problem) => problem.kind === 'schema') && verdict['readiness'] === 'ready' && derivedBlocking(verdict)) {
    add('inconsistent', '$.readiness', 'the verdict declares the draft ready beside a blocking finding, an entry neither represented nor justifiably omitted, an entry not accurate or a block not supported');
  }
  return problems;
}
