import * as fs from 'node:fs';
import * as path from 'node:path';
import { isRecord } from '@syzygy/support';
import { readCheckRecord } from './check-record-read.js';
import type { FigureFit } from './figure-fit.js';
import { containerProseWords, proseWords, type ReaderAdvice, type ReaderStandardId } from './reader-advice.js';
import { hasHomeForm, heroOf } from './draft-schema.js';
import { readRunRecord } from './run-record.js';
import { REVISION_FILE, RUN_ID, RUN_LAYOUT } from './state-directory.js';

/** The reading ledger (REQ-polaris-generation-034 version 2.4, syzygy-3efd.21): per narrative page the draft lays out on, the words of
 * its own prose, the reading minutes, the figures, the reader advisories per counted standard and the figure-fit counts, computed from
 * the draft alone as though its draft layer renders. A count over the draft, never a measurement of a rendered page; it adds no measure
 * beyond the RS-19 word count, the reader advice, the figures the draft places and figure fit. Inferred, advice: it gates nothing.
 *
 * `readingLedger` is pure and depends only on the draft's bytes (through the advice and figure fit computed from them) and the constants
 * below, so two checks of the same draft write byte-identical members. `readingDifference` reads the state root for the previous run of
 * the same repository identity and is computed at each check, never written to any file. */

export const READING_LEDGER_FORMAT = 'polaris-dossier-reading-ledger/1';
export const WORDS_PER_MINUTE = 200;

/** The counted standards, in the order the ledger writes them. */
export const LEDGER_STANDARDS: readonly ReaderStandardId[] = ['RS-13', 'RS-14', 'RS-16', 'RS-17', 'RS-19'];

export type AdvisoryCounts = Readonly<Record<ReaderStandardId, number>>;
export interface FigureFitCounts { readonly notFittingAt1440: number; readonly notFittingAt390: number; readonly unknown: number }
/** The numbers a page, and the draft, carry. */
export interface LedgerNumbers {
  readonly proseWords: number;
  readonly readingMinutes: number;
  readonly figures: number;
  readonly advisories: AdvisoryCounts;
  readonly figureFit: FigureFitCounts;
}
export interface LedgerPage extends LedgerNumbers { readonly page: string; readonly units: readonly string[] }
export interface LedgerDraft extends LedgerNumbers { readonly unplacedUnits: number }
export interface ReadingLedger {
  readonly format: typeof READING_LEDGER_FORMAT;
  readonly wordsPerMinute: number;
  readonly pages: readonly LedgerPage[];
  readonly draft: LedgerDraft;
}

const list = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);
const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const produced = (value: unknown): value is Readonly<Record<string, unknown>> => isRecord(value) && isRecord(value['disposition']) && value['disposition']['kind'] === 'produced';
const minutes = (words: number): number => Math.ceil(words / WORDS_PER_MINUTE);
/** A deep dive's page: its identity with every code point outside `A-Z`, `a-z`, `0-9`, `_`, `.` and `-` replaced by one `_`, the rule
 * by which the renderer names that page (`deepDivePath`); a surrogate pair is one code point, and so is a lone surrogate (version 2.8). */
export const deepDivePage = (id: string): string => `deep-dives/${id.replace(/[^A-Za-z0-9_.-]/gu, '_')}.html`;

/** One page's or the draft's tally, filled as units, figures and advice are placed. */
class Tally {
  proseWords = 0;
  figures = 0;
  readonly advisories: Record<ReaderStandardId, number> = { 'RS-13': 0, 'RS-14': 0, 'RS-16': 0, 'RS-17': 0, 'RS-19': 0 };
  readonly figureFit = { notFittingAt1440: 0, notFittingAt390: 0, unknown: 0 };
  numbers(): LedgerNumbers {
    return { proseWords: this.proseWords, readingMinutes: minutes(this.proseWords), figures: this.figures, advisories: { ...this.advisories }, figureFit: { ...this.figureFit } };
  }
}

/** The ledger of one parsed draft, with the check's reader advice and figure fit over the same draft. */
export function readingLedger(subject: unknown, fit: FigureFit, advice: ReaderAdvice): ReadingLedger {
  const doc: Readonly<Record<string, unknown>> = isRecord(subject) ? subject : {};
  const pages = new Map<string, { readonly units: string[]; readonly tally: Tally }>();
  const page = (name: string): { readonly units: string[]; readonly tally: Tally } => {
    let entry = pages.get(name);
    if (entry === undefined) { entry = { units: [], tally: new Tally() }; pages.set(name, entry); }
    return entry;
  };
  const draft = new Tally();
  let unplacedUnits = 0;
  page('index.html');

  // Pages: the landing page, then each Pole's, then each produced deep dive's, in that order.
  const sections = list(doc['sections']);
  const dives = list(doc['deepDives']);
  const hasPoles = Array.isArray(doc['poles']);
  const why = text(doc['whySection']);
  const poleSections = list(doc['poles']).map((pole) => (isRecord(pole) ? list(pole['sections']).flatMap((id) => (typeof id === 'string' ? [id] : [])) : []));
  const polePages = poleSections.map((ids, k) => (ids.some((id) => id !== why) ? `poles/${k + 1}.html` : null));
  for (const name of polePages) if (name !== null) page(name);
  const divePages = dives.map((dive) => (produced(dive) ? deepDivePage(text(dive['id']) ?? '') : null));
  for (const name of divePages) if (name !== null) page(name);

  /** The page of section `i`: none when it is not produced; the landing page without Poles, or for the why section; else the page of the
   * first Pole that lists it, or none (an unplaced unit). */
  const sectionPage = (i: number): string | null => {
    const section = sections[i];
    if (!produced(section)) return null;
    const id = text(section['id']);
    if (!hasPoles) return 'index.html';
    if (id !== undefined && id === why) return 'index.html';
    const k = id === undefined ? -1 : poleSections.findIndex((ids) => ids.includes(id));
    return k < 0 ? null : polePages[k]!;
  };
  const sectionIndex = (id: string | undefined): number => (id === undefined ? -1 : sections.findIndex((section) => isRecord(section) && section['id'] === id));
  const pageOfSectionId = (id: string | undefined): string | null => { const i = sectionIndex(id); return i < 0 ? null : sectionPage(i); };
  const sectionPages = sections.map((_, i) => sectionPage(i));

  // Units and their words: the introduction and any hero omission, then the produced sections and deep dives.
  const hero = heroOf(doc);
  const overviewBlocks = [
    ['introduction', doc['introduction']],
    ['hero-omission', hero?.form === 'omitted' ? hero.value : undefined],
  ] as const;
  for (const [unit, block] of overviewBlocks) {
    if (!isRecord(block)) continue;
    const words = proseWords(block);
    const landing = page('index.html');
    landing.units.push(unit);
    landing.tally.proseWords += words;
    draft.proseWords += words;
  }
  sections.forEach((section, i) => {
    if (!produced(section)) return;
    const words = containerProseWords(doc, section, 'sections');
    draft.proseWords += words;
    const at = sectionPages[i]!;
    if (at === null) { unplacedUnits += 1; return; }
    const entry = page(at);
    entry.units.push(`section:${text(section['id']) ?? ''}`);
    entry.tally.proseWords += words;
  });
  dives.forEach((dive, i) => {
    if (!produced(dive)) return;
    const words = containerProseWords(doc, dive, 'deepDives');
    draft.proseWords += words;
    const entry = page(divePages[i]!);
    entry.units.push(`deep-dive:${text(dive['id']) ?? ''}`);
    entry.tally.proseWords += words;
  });

  // Figures: a produced diagram, on the page of its home (v5 and later) or of its `sectionId` section. A figure homed on a deep dive with
  // no page sits where that deep dive's section's figures do; one whose section is not produced or is unplaced is on no page.
  const homesInHome = hasHomeForm(doc['schemaVersion']);
  const diagrams = list(doc['diagrams']);
  const figurePage = (diagram: Readonly<Record<string, unknown>>): string | null => {
    if (!homesInHome) return pageOfSectionId(text(diagram['sectionId']));
    const home = diagram['home'];
    if (!isRecord(home)) return null;
    if (home['kind'] === 'overview') return 'index.html';
    if (home['kind'] === 'section') return pageOfSectionId(text(home['target']));
    if (home['kind'] !== 'deep-dive') return null;
    const target = text(home['target']);
    const d = target === undefined ? -1 : dives.findIndex((dive) => isRecord(dive) && dive['id'] === target);
    if (d < 0) return null;
    return divePages[d] ?? pageOfSectionId(text((dives[d] as Readonly<Record<string, unknown>>)['sectionId']));
  };
  const diagramPages = diagrams.map((diagram) => (produced(diagram) ? figurePage(diagram) : null));
  diagrams.forEach((diagram, i) => {
    if (!produced(diagram)) return;
    draft.figures += 1;
    const at = diagramPages[i]!;
    if (at !== null) page(at).tally.figures += 1;
  });

  // Advisories, by the JSON path each is located at.
  const LOCATED = /^\$\.(sections|deepDives|diagrams)\[(\d+)\]/u;
  for (const advisory of advice.advisories) {
    if (!(LEDGER_STANDARDS as readonly string[]).includes(advisory.standard)) continue;
    draft.advisories[advisory.standard] += 1;
    const match = LOCATED.exec(advisory.at);
    if (match === null) continue;
    const i = Number(match[2]);
    const at = match[1] === 'sections' ? sectionPages[i] : match[1] === 'deepDives' ? divePages[i] : diagramPages[i];
    if (at !== undefined && at !== null) page(at).tally.advisories[advisory.standard] += 1;
  }

  // Figure fit: each entry on the page of the produced figure it names (the first of that identity).
  const figureByName = new Map<string, string | null>();
  diagrams.forEach((diagram, i) => {
    const id = produced(diagram) ? text(diagram['id']) : undefined;
    if (id !== undefined && !figureByName.has(id)) figureByName.set(id, diagramPages[i]!);
  });
  for (const entry of fit.entries) {
    const member = 'unknown' in entry ? 'unknown' : entry.viewportPx === 1440 ? 'notFittingAt1440' : entry.viewportPx === 390 ? 'notFittingAt390' : undefined;
    if (member === undefined) continue;
    draft.figureFit[member] += 1;
    const at = figureByName.get(entry.diagram);
    if (at !== undefined && at !== null) page(at).tally.figureFit[member] += 1;
  }

  return {
    format: READING_LEDGER_FORMAT,
    wordsPerMinute: WORDS_PER_MINUTE,
    pages: [...pages].map(([name, entry]) => ({ page: name, units: entry.units, ...entry.tally.numbers() })),
    draft: { ...draft.numbers(), unplacedUnits },
  };
}

// --- The difference from the previous run of the same repository ------------------------------------------------------------------

export type PageChange = 'unchanged' | 'changed' | 'added' | 'removed';
export interface NumbersDelta {
  readonly proseWords: number;
  readonly readingMinutes: number;
  readonly figures: number;
  readonly advisories: AdvisoryCounts;
  readonly figureFit: FigureFitCounts;
}
export interface PageDifference {
  readonly page: string;
  readonly change: PageChange;
  readonly before: LedgerNumbers | null;
  readonly after: LedgerNumbers | null;
  readonly delta: NumbersDelta | null;
}
export type ReadingDifference =
  | {
      readonly state: 'compared';
      readonly against: { readonly runId: string; readonly revision: number; readonly pinnedRevision: string; readonly checkedAt: string };
      readonly pages: readonly PageDifference[];
      readonly draft: { readonly before: LedgerDraft; readonly after: LedgerDraft; readonly delta: NumbersDelta & { readonly unplacedUnits: number } };
      readonly unreadableRuns: number;
      readonly unreadableCheckRecords: number;
    }
  | { readonly state: 'unknown'; readonly why: string; readonly unreadableRuns: number; readonly unreadableCheckRecords: number };

export const NO_EARLIER_LEDGER = 'no earlier run of this repository in the state root holds a reading ledger that could be read';
export const STATE_ROOT_UNLISTABLE = 'the state root could not be listed';
export const DRAFT_DOES_NOT_PARSE = 'this draft does not parse, so it has no reading ledger';
/** Version 2.11: the reason where check wrote the record's bounded form, which keeps no ledger although the draft parsed. */
export const BOUNDED_FORM_HAS_NO_LEDGER = "this check's record was written in its bounded form, which keeps no reading ledger";

const CHECKED_AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const COMMIT = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const byCodeUnit = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

const count = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const numbersOf = (value: unknown): LedgerNumbers | undefined => {
  if (!isRecord(value) || !isRecord(value['advisories']) || !isRecord(value['figureFit'])) return undefined;
  const advisories = value['advisories'], fit = value['figureFit'];
  if (![value['proseWords'], value['readingMinutes'], value['figures']].every(count)) return undefined;
  if (!LEDGER_STANDARDS.every((standard) => count(advisories[standard]))) return undefined;
  if (![fit['notFittingAt1440'], fit['notFittingAt390'], fit['unknown']].every(count)) return undefined;
  return {
    proseWords: value['proseWords'] as number, readingMinutes: value['readingMinutes'] as number, figures: value['figures'] as number,
    advisories: Object.fromEntries(LEDGER_STANDARDS.map((standard) => [standard, advisories[standard] as number])) as AdvisoryCounts,
    figureFit: { notFittingAt1440: fit['notFittingAt1440'] as number, notFittingAt390: fit['notFittingAt390'] as number, unknown: fit['unknown'] as number },
  };
};

/** A stored ledger read back, or undefined where it is not of this format's form. */
export function storedLedger(value: unknown): ReadingLedger | undefined {
  if (!isRecord(value) || value['format'] !== READING_LEDGER_FORMAT || !count(value['wordsPerMinute']) || !Array.isArray(value['pages'])) return undefined;
  const pages: LedgerPage[] = [];
  const seen = new Set<string>();
  for (const entry of value['pages']) {
    const numbers = numbersOf(entry);
    if (numbers === undefined || !isRecord(entry) || typeof entry['page'] !== 'string' || seen.has(entry['page']) || !Array.isArray(entry['units']) || !entry['units'].every((unit) => typeof unit === 'string')) return undefined;
    seen.add(entry['page']);
    pages.push({ page: entry['page'], units: entry['units'] as string[], ...numbers });
  }
  const draft = numbersOf(value['draft']);
  if (draft === undefined || !isRecord(value['draft']) || !count(value['draft']['unplacedUnits'])) return undefined;
  return { format: READING_LEDGER_FORMAT, wordsPerMinute: value['wordsPerMinute'] as number, pages, draft: { ...draft, unplacedUnits: value['draft']['unplacedUnits'] as number } };
}

const minus = (after: LedgerNumbers, before: LedgerNumbers): NumbersDelta => ({
  proseWords: after.proseWords - before.proseWords,
  readingMinutes: after.readingMinutes - before.readingMinutes,
  figures: after.figures - before.figures,
  advisories: Object.fromEntries(LEDGER_STANDARDS.map((standard) => [standard, after.advisories[standard] - before.advisories[standard]])) as AdvisoryCounts,
  figureFit: {
    notFittingAt1440: after.figureFit.notFittingAt1440 - before.figureFit.notFittingAt1440,
    notFittingAt390: after.figureFit.notFittingAt390 - before.figureFit.notFittingAt390,
    unknown: after.figureFit.unknown - before.figureFit.unknown,
  },
});
const numbers = (value: LedgerNumbers): LedgerNumbers => ({ proseWords: value.proseWords, readingMinutes: value.readingMinutes, figures: value.figures, advisories: value.advisories, figureFit: value.figureFit });
const unchanged = (delta: NumbersDelta): boolean => delta.proseWords === 0 && delta.readingMinutes === 0 && delta.figures === 0
  && LEDGER_STANDARDS.every((standard) => delta.advisories[standard] === 0) && delta.figureFit.notFittingAt1440 === 0 && delta.figureFit.notFittingAt390 === 0 && delta.figureFit.unknown === 0;

/** Two ledgers compared page by page: this ledger's pages in its order, then the earlier one's other pages in its order. Pure. */
export function compareLedgers(before: ReadingLedger, after: ReadingLedger): { readonly pages: readonly PageDifference[]; readonly draft: Extract<ReadingDifference, { state: 'compared' }>['draft'] } {
  const earlier = new Map(before.pages.map((entry) => [entry.page, entry]));
  const later = new Map(after.pages.map((entry) => [entry.page, entry]));
  const pages: PageDifference[] = after.pages.map((entry) => {
    const was = earlier.get(entry.page);
    if (was === undefined) return { page: entry.page, change: 'added', before: null, after: numbers(entry), delta: null };
    const delta = minus(entry, was);
    return { page: entry.page, change: unchanged(delta) ? 'unchanged' : 'changed', before: numbers(was), after: numbers(entry), delta };
  });
  for (const entry of before.pages) if (!later.has(entry.page)) pages.push({ page: entry.page, change: 'removed', before: numbers(entry), after: null, delta: null });
  return { pages, draft: { before: before.draft, after: after.draft, delta: { ...minus(after.draft, before.draft), unplacedUnits: after.draft.unplacedUnits - before.draft.unplacedUnits } } };
}

/** The previous run's ledger: among the other run directories of the state root whose run record names this repository identity, each
 * run's candidate is the ledger of its highest-numbered check record that parses, carries a ledger of this format and was checked before
 * `checkedAt`; the previous run is the one whose candidate was checked latest, a tie going to the greatest run identity. What cannot be
 * read is counted, never passed over: a check record whose `checkedAt` is malformed, or whose own `revision` is not the one its file name
 * says, is unreadable; one validly checked at or after `checkedAt` is passed over uncounted. Nothing is matched by directory name beyond the run-identity form, or by URL.
 * `ledger` is `undefined` for a draft that does not parse and `'bounded'` where check wrote the record's bounded form (version 2.11);
 * either is Unknown with both counts 0, and the state root is not listed. */
export function readingDifference(run: string, repositoryId: string, checkedAt: string, ledger: ReadingLedger | undefined | 'bounded'): ReadingDifference {
  if (ledger === undefined) return { state: 'unknown', why: DRAFT_DOES_NOT_PARSE, unreadableRuns: 0, unreadableCheckRecords: 0 };
  if (ledger === 'bounded') return { state: 'unknown', why: BOUNDED_FORM_HAS_NO_LEDGER, unreadableRuns: 0, unreadableCheckRecords: 0 };
  const root = path.dirname(run), self = path.basename(run);
  let names: fs.Dirent[];
  try { names = fs.readdirSync(root, { withFileTypes: true }); } catch { return { state: 'unknown', why: STATE_ROOT_UNLISTABLE, unreadableRuns: 0, unreadableCheckRecords: 0 }; }
  let unreadableRuns = 0, unreadableCheckRecords = 0;
  let best: { readonly runId: string; readonly revision: number; readonly pinnedRevision: string; readonly checkedAt: string; readonly ledger: ReadingLedger } | undefined;
  for (const entry of names) {
    if (!entry.isDirectory() || !RUN_ID.test(entry.name) || entry.name === self) continue;
    const dir = path.join(root, entry.name);
    let stored;
    try { stored = readRunRecord(fs.readFileSync(path.join(dir, RUN_LAYOUT.config), 'utf8')); } catch { unreadableRuns += 1; continue; }
    if (!stored.ok) { unreadableRuns += 1; continue; }
    if (stored.record.subject.repository.repositoryId !== repositoryId) continue;
    let records: number[];
    try {
      records = fs.readdirSync(path.join(dir, RUN_LAYOUT.checks)).flatMap((name) => { const match = REVISION_FILE.exec(name); return match === null ? [] : [Number(match[1])]; });
    } catch (cause) {
      if ((cause as NodeJS.ErrnoException).code !== 'ENOENT') unreadableCheckRecords += 1;
      continue;
    }
    for (const revision of records.sort((a, b) => b - a)) {
      let record: unknown;
      try { record = readCheckRecord(path.join(dir, RUN_LAYOUT.checks, `rev-${revision}.json`)); } catch { unreadableCheckRecords += 1; continue; }
      if (!isRecord(record) || !isRecord(record['readingLedger']) || record['readingLedger']['format'] !== READING_LEDGER_FORMAT) continue;
      const at = record['checkedAt'];
      if (typeof at !== 'string' || !CHECKED_AT.test(at)) { unreadableCheckRecords += 1; continue; }
      if (!(at < checkedAt)) continue;
      const earlier = storedLedger(record['readingLedger']);
      const pinned = record['pinnedRevision'];
      // The revision reported is the record's own, and it must be the one its file name says: a record that disagrees is unreadable.
      if (earlier === undefined || typeof pinned !== 'string' || !COMMIT.test(pinned) || record['revision'] !== revision) { unreadableCheckRecords += 1; continue; }
      if (best === undefined || at > best.checkedAt || (at === best.checkedAt && byCodeUnit(entry.name, best.runId) > 0)) {
        best = { runId: entry.name, revision, pinnedRevision: pinned, checkedAt: at, ledger: earlier };
      }
      break;
    }
  }
  if (best === undefined) return { state: 'unknown', why: NO_EARLIER_LEDGER, unreadableRuns, unreadableCheckRecords };
  const compared = compareLedgers(best.ledger, ledger);
  return {
    state: 'compared',
    against: { runId: best.runId, revision: best.revision, pinnedRevision: best.pinnedRevision, checkedAt: best.checkedAt },
    pages: compared.pages, draft: compared.draft, unreadableRuns, unreadableCheckRecords,
  };
}
