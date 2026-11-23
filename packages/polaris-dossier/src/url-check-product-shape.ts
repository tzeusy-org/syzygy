import { isRecord } from '@syzygy/support';
import { MANIFEST_FACTS_FORMAT } from './manifest-facts.js';
import { FACT_MEMBERS, type FactKind } from './manifest-model.js';

type Predicate = (value: unknown) => boolean;
const text: Predicate = value => typeof value === 'string' && Buffer.byteLength(value) <= 1_048_576;
const signed: Predicate = value => Number.isSafeInteger(value);
const count: Predicate = value => signed(value) && Number(value) >= 0;
const boolean: Predicate = value => typeof value === 'boolean';
const one = (...values: readonly unknown[]): Predicate => value => values.includes(value);
const nullable = (check: Predicate): Predicate => value => value === null || check(value);
const list = (check: Predicate): Predicate => value => Array.isArray(value) && value.length <= 4096 && value.every(check);
const object = (fields: Readonly<Record<string, Predicate>>): Predicate => value => isRecord(value)
  && Object.keys(value).length === Object.keys(fields).length
  && Object.entries(fields).every(([key, check]) => Object.hasOwn(value, key) && check(value[key]));
const strings = list(text);
const listed = { listed: strings, notListed: count };
const counted = object({ rule: text, files: count, ...listed });

/** Closed projections of the actual check producer's optional members. These
 * validate shape only; the bridge separately captures the actual producer and
 * compares its complete stored bytes before issuing any provenance receipt. */
export const urlStructureRecordShape: Predicate = value => object({ state: one('unknown'), why: text, note: text })(value)
  || object({ state: one('derived'), rules: strings, files: count, secretPathsLeftOut: count, submodules: count,
    units: list(object({ unit: text, files: count })), unitsNotListed: count, rootFiles: count,
    vendored: counted, generated: counted,
    languages: object({ rule: text, counts: list(object({ language: text, files: count })), unrecognized: count }),
    traits: object({ docsTree: object({ rule: text, matched: boolean, ...listed }), tests: object({ rule: text, files: count }),
      packages: object({ rule: text, shape: one('no-package-manifest', 'single-package', 'workspace'), ...listed }),
      serverEntry: object({ rule: text, holds: boolean, ...listed }) }), note: text })(value);

const advisories = (number: Predicate) => object(Object.fromEntries(['RS-13', 'RS-14', 'RS-16', 'RS-17', 'RS-19'].map(id => [id, number])));
const figures = (number: Predicate) => object({ notFittingAt1440: number, notFittingAt390: number, unknown: number });
const numbers = (number: Predicate) => ({ proseWords: number, readingMinutes: number, figures: number,
  advisories: advisories(number), figureFit: figures(number) });
const draft = object({ ...numbers(count), unplacedUnits: count });
export const urlReadingLedgerShape = object({ format: one('polaris-dossier-reading-ledger/1'), wordsPerMinute: count,
  pages: list(object({ page: text, units: strings, ...numbers(count) })), draft });
export const urlReadingDifferenceShape: Predicate = value => object({ state: one('unknown'), why: text,
  unreadableRuns: count, unreadableCheckRecords: count })(value)
  || object({ state: one('compared'), against: object({ runId: text, revision: count, pinnedRevision: text, checkedAt: text }),
    pages: list(object({ page: text, change: one('unchanged', 'changed', 'added', 'removed'),
      before: nullable(object(numbers(count))), after: nullable(object(numbers(count))), delta: nullable(object(numbers(signed))) })),
    draft: object({ before: draft, after: draft, delta: object({ ...numbers(signed), unplacedUnits: signed }) }),
    unreadableRuns: count, unreadableCheckRecords: count })(value);

const manifestFile = object({ path: text, epistemic: one('inferred', 'unknown'), unknownReason: one(null,
  'path-not-citable', 'symbolic-link', 'denied-path', 'unknown-extraction-class', 'class-not-consented', 'over-read-limit',
  'object-read-refused', 'not-utf8-text', 'too-large', 'secret-detector-match', 'active-content', 'redacted-body', 'unparsed'),
  parseFault: one(null, 'duplicate-key', 'syntax', 'field-type', 'beyond-reader'), facts: nullable(count), valuesLeftOut: nullable(count) });
const lines: Predicate = value => Array.isArray(value) && value.length === 2 && count(value[0]) && Number(value[0]) > 0
  && count(value[1]) && Number(value[1]) >= Number(value[0]);
const fact: Predicate = value => {
  if (!isRecord(value) || typeof value.fact !== 'string' || !Object.hasOwn(FACT_MEMBERS, value.fact)) return false;
  const members = FACT_MEMBERS[value.fact as FactKind];
  return object({ id: text, fact: one(value.fact), rule: text, ruleVersion: count, path: text, lines, epistemic: one('inferred'),
    ...Object.fromEntries(members.map(member => [member.name, nullable(text)])) })(value);
};
const manifestFormat = one(MANIFEST_FACTS_FORMAT);
const remainder = object({ files: count, secretPathsLeftOut: count, candidates: count, notCandidates: count,
  places: list(object({ place: nullable(text), files: count, notCandidates: count })),
  placesNotListed: count, filesInPlacesNotListed: count, notCandidatesInPlacesNotListed: count });
export const urlManifestFactsShape: Predicate = value => object({ format: manifestFormat, state: one('unknown'), why: text })(value)
  || object({ format: manifestFormat, state: one('derived'),
    screeningPolicy: object({ policyId: text, policyVersion: text, sha256: value => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value) }),
    recognizers: list(object({ rule: text, ruleVersion: count, label: one('inferred'), candidates: count, secretPathsLeftOut: count,
      setApart: count, inferred: count, unknown: count, valuesLeftOut: count, facts: count, files: list(manifestFile), filesNotListed: count })),
    facts: list(fact), factsNotListed: count, remainder })(value);
