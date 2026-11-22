import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseBoundedJson, type LocalDerivedFact, type LocalDerivedStructure, type LocalTreeCounts } from '@syzygy/polaris-generation-core/live';
import { isRecord, sha256 } from '@syzygy/support';
import { TOP_LEVEL_UNIT } from './derive-rules.js';
import { deriveTreeFacts, type TreeFact, type TreeFacts } from './derive.js';
import { GitObjectReadRefusal, type TreeEntry } from './git-object-reader.js';
import { readCommittedBytes } from './policy-snapshot.js';
import type { DossierScreen } from './screen.js';
import { RUN_LAYOUT } from './state-directory.js';

/** The derived-structure record and its currency (REQ-polaris-generation-034 version 2.3, syzygy-3efd.27).
 *
 * `syzygy dossier check` derives the facts of rule `top-level-unit` version 1 from the tree listing it takes for its census and keeps
 * them, once per draft revision, as `derived/rev-<n>.json` in the run directory: an evidence artifact naming its source (repository and
 * revision), capture time, scope and provenance, identified by the SHA-256 of its bytes. Each render of that revision publishes those
 * bytes unchanged, re-derives the facts from the tree it lists, and labels a fact Observed only while the currency policy, read as the
 * committed bytes at the Syzygy checkout's HEAD and applied only at the adopted digest, declares a bound for its rule and version and that
 * bound holds. No draft member reaches the record or the region. */

export const DERIVED_RECORD_FORMAT = 'polaris-dossier-derived-structure/1';
export const DERIVED_SCOPE = 'tree-metadata: the paths and modes of the pinned tree\'s entries; no file body, size or object id';
export const DERIVED_PRODUCER = 'syzygy dossier check';
/** The name the record is published under at the root of a rendered site. */
export const DERIVED_SITE_FILE = 'derived-structure.json';

export const CURRENCY_POLICY_PATH = '.syzygy/governance/policies/POLARIS-DOSSIER-DERIVED-FACT-CURRENCY-POLICY-v1.json';
/** The SHA-256 of the policy bytes adopted with version 2.3: any other bytes declare no bound. */
export const CURRENCY_POLICY_SHA256 = '95a3aa132041aa5dd8f860e8ce4c92b3e3c3380ebef4b1ada19bee6b8f50865e';

const RECORD_LIMITS = Object.freeze({ maxBytes: 4 * 1024 * 1024, maxNodes: 100_000, maxDepth: 8 });

/** A path a secret detector of the bound screening policy matches, read as a path or as text. */
export const secretPathOf = (screen: Pick<DossierScreen, 'screenPath' | 'screenBody'>) => (repositoryPath: string): boolean =>
  screen.screenPath(repositoryPath) === 'secret-detector-match' || screen.screenBody(repositoryPath, repositoryPath) === 'secret-detector-match';

export const derivedRecordFile = (run: string, revision: number): string => path.join(run, RUN_LAYOUT.derived, `rev-${revision}.json`);

/** The record's exact text: two-space JSON with one trailing newline, members in the order the requirement states. */
export function encodeDerivedRecord(source: { readonly repositoryId: string; readonly revision: string; readonly capturedAt: string }, derived: TreeFacts | { readonly why: string }): string {
  const head = {
    format: DERIVED_RECORD_FORMAT,
    repositoryId: source.repositoryId,
    revision: source.revision,
    capturedAt: source.capturedAt,
    scope: DERIVED_SCOPE,
    producer: DERIVED_PRODUCER,
    rules: [{ id: TOP_LEVEL_UNIT.id, version: TOP_LEVEL_UNIT.version }],
  };
  const body = 'why' in derived
    ? { state: 'unknown', why: derived.why }
    : { state: 'derived', files: derived.files, secretPathsLeftOut: derived.secretPathsLeftOut, submodules: derived.submodules, facts: derived.facts, unitsNotListed: derived.unitsNotListed };
  return `${JSON.stringify({ ...head, ...body }, null, 2)}\n`;
}

/** A kept record as a render reads it back: its exact text and digest, and its members once they are well formed. */
export interface KeptRecord {
  readonly text: string;
  readonly sha256: string;
  readonly revision: string;
  readonly capturedAt: string;
  readonly state: 'derived' | 'unknown';
  readonly facts: readonly TreeFact[];
  readonly unitsNotListed: number;
  /** The record's own counts (version 2.9 compares them with the render's re-derivation, and never renders them); zero for an `unknown` record. */
  readonly files: number;
  readonly secretPathsLeftOut: number;
  readonly submodules: number;
}

const count = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const str = (value: unknown): value is string => typeof value === 'string';

const FACT_ID = /^_tree-(?:root|unit-[1-9][0-9]*|contains-[1-9][0-9]*)$/u;
const RULE_ID = /^[a-z][a-z0-9-]{0,63}$/u;
const REVISION = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
/** A directory's raw first segment: non-empty, one segment. */
const segment = (value: string): boolean => value !== '' && !value.includes('/');

/** One fact, rebuilt with its members in the order `deriveTreeFacts` writes them, or undefined where any member is malformed. */
function factOf(value: unknown): TreeFact | undefined {
  if (!isRecord(value) || !str(value['id']) || !FACT_ID.test(value['id']) || !str(value['rule']) || !RULE_ID.test(value['rule']) || !count(value['ruleVersion']) || !str(value['path'])) return undefined;
  const { id, rule, ruleVersion, path: at } = value;
  switch (value['fact']) {
    case 'tree-root': return id === '_tree-root' && at === '.' && count(value['rootFiles']) ? { id, fact: 'tree-root', rule, ruleVersion, path: at, rootFiles: value['rootFiles'] } : undefined;
    case 'top-level-unit': return id.startsWith('_tree-unit-') && segment(at) && count(value['files']) ? { id, fact: 'top-level-unit', rule, ruleVersion, path: at, files: value['files'] } : undefined;
    case 'contains': return id.startsWith('_tree-contains-') && segment(at) && value['from'] === '_tree-root' && str(value['to']) && value['to'].startsWith('_tree-unit-') && FACT_ID.test(value['to'])
      ? { id, fact: 'contains', rule, ruleVersion, path: at, from: '_tree-root', to: value['to'] } : undefined;
    default: return undefined;
  }
}

/** What a kept record must agree with: the run's repository, and the bound screen's secret-path test. */
export interface RecordExpectations {
  readonly repositoryId: string;
  readonly isSecretPath: (repositoryPath: string) => boolean;
}

/** The run directory's record for draft revision `revision`, or undefined where there is none that reads as one. The agent sessions can
 * write in the run directory, so a record is read only when it is exactly what `encodeDerivedRecord` writes: its members rebuilt from
 * their parsed values encode to its bytes, with no member added, moved or respaced; it names the run's repository, the fixed scope,
 * producer and rules (the rebuild writes those constants); its revision is a full object id and its capture time an instant; each fact
 * is well formed, starting with the root, with unique identities of Syzygy's own forms; and no fact's path is one the screen's secret
 * test matches. Anything else is no record: nothing of it is drawn, listed or published. */
export function readDerivedRecord(run: string, revision: number, expected: RecordExpectations): KeptRecord | undefined {
  let bytes: Buffer;
  try { bytes = fs.readFileSync(derivedRecordFile(run, revision)); } catch { return undefined; }
  try {
    // A byte-order mark is kept, never stripped, so it fails the parse: the text published is always the kept bytes exactly.
    const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
    const doc: unknown = parseBoundedJson(text, RECORD_LIMITS);
    if (!isRecord(doc) || doc['format'] !== DERIVED_RECORD_FORMAT || !str(doc['revision']) || !REVISION.test(doc['revision']) || !str(doc['capturedAt']) || !INSTANT.test(doc['capturedAt'])) return undefined;
    const source = { repositoryId: expected.repositoryId, revision: doc['revision'], capturedAt: doc['capturedAt'] };
    const base = { text, sha256: sha256(bytes), revision: doc['revision'], capturedAt: doc['capturedAt'] };
    if (doc['state'] === 'unknown') {
      return str(doc['why']) && encodeDerivedRecord(source, { why: doc['why'] }) === text ? { ...base, state: 'unknown', facts: [], unitsNotListed: 0, files: 0, secretPathsLeftOut: 0, submodules: 0 } : undefined;
    }
    if (doc['state'] !== 'derived' || !Array.isArray(doc['facts']) || !count(doc['unitsNotListed']) || !count(doc['files']) || !count(doc['secretPathsLeftOut']) || !count(doc['submodules'])) return undefined;
    const facts = doc['facts'].map(factOf);
    if (facts.some((fact) => fact === undefined) || facts[0]?.fact !== 'tree-root' || new Set(facts.map((fact) => fact!.id)).size !== facts.length) return undefined;
    const kept = facts as TreeFact[];
    if (kept.some((fact) => fact.fact !== 'tree-root' && expected.isSecretPath(fact.path))) return undefined;
    const rebuilt = encodeDerivedRecord(source, { files: doc['files'], secretPathsLeftOut: doc['secretPathsLeftOut'], submodules: doc['submodules'], facts: kept, unitsNotListed: doc['unitsNotListed'] });
    return rebuilt === text
      ? { ...base, state: 'derived', facts: kept, unitsNotListed: doc['unitsNotListed'], files: doc['files'], secretPathsLeftOut: doc['secretPathsLeftOut'], submodules: doc['submodules'] } : undefined;
  } catch {
    return undefined;
  }
}

/** The currency policy a render applies: its identity and the bounds it declares, by `<rule>@<version>`. */
export interface CurrencyPolicy {
  readonly policyId: string;
  readonly policyVersion: string;
  readonly sha256: string;
  readonly bounds: ReadonlyMap<string, string>;
}

/** The currency policy from the committed bytes at the Syzygy checkout `root`'s HEAD, applied only at the adopted digest; null where the
 * bytes are missing, uncommitted, unreadable, unparseable or of another digest, which declare no bound. */
export function readCurrencyPolicy(root: string): CurrencyPolicy | null {
  const read = readCommittedBytes(root, CURRENCY_POLICY_PATH);
  return read.ok ? currencyPolicyOf(read.bytes) : null;
}

/** The policy these bytes declare, or null for bytes of any digest but the adopted one. */
export function currencyPolicyOf(bytes: Uint8Array): CurrencyPolicy | null {
  const digest = sha256(bytes);
  if (digest !== CURRENCY_POLICY_SHA256) return null;
  try {
    const doc: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!isRecord(doc) || !str(doc['policyId']) || !str(doc['policyVersion']) || !Array.isArray(doc['declarations'])) return null;
    const bounds = new Map<string, string>();
    for (const declaration of doc['declarations']) {
      if (isRecord(declaration) && str(declaration['rule']) && count(declaration['version']) && str(declaration['currencyBound'])) bounds.set(`${declaration['rule']}@${declaration['version']}`, declaration['currencyBound']);
    }
    return { policyId: doc['policyId'], policyVersion: doc['policyVersion'], sha256: digest, bounds };
  } catch {
    return null;
  }
}

const sameFacts = (a: readonly TreeFact[], b: readonly TreeFact[]): boolean => JSON.stringify(a) === JSON.stringify(b);

/** What the region states at this render: the record of draft revision `revision`, compared with the facts this render re-derives from
 * the tree its reader lists, under the currency policy. */
export async function derivedStructureAt(inputs: {
  readonly run: string;
  readonly revision: number;
  readonly pinned: string;
  /** The run's repository identity, which the kept record must name. */
  readonly repositoryId: string;
  /** Only paths and modes are read from the listing: never an object id or a size. */
  readonly reader: { readonly listTree: () => Promise<readonly Pick<TreeEntry, 'path' | 'mode'>[]> };
  readonly isSecretPath: (repositoryPath: string) => boolean;
  readonly policy: CurrencyPolicy | null;
}): Promise<LocalDerivedStructure> {
  const { run, revision, pinned, repositoryId, reader, isSecretPath, policy } = inputs;
  const record = readDerivedRecord(run, revision, { repositoryId, isSecretPath });
  if (record === undefined) return { state: 'missing', revision: pinned, unknownReason: 'missing-evidence' };
  if (record.state === 'unknown') return { state: 'unknown', revision: pinned, unknownReason: 'source-uncaptured-or-unreachable' };
  let entries: readonly Pick<TreeEntry, 'path' | 'mode'>[];
  try {
    entries = await reader.listTree();
  } catch (cause) {
    if (!(cause instanceof GitObjectReadRefusal)) throw cause;
    return { state: 'unknown', revision: pinned, unknownReason: 'source-uncaptured-or-unreachable' };
  }
  const now = deriveTreeFacts(entries, isSecretPath);
  // `pinned-revision`: current exactly when the record names this render's revision and this render re-derives the same facts.
  const current = record.revision === pinned && sameFacts(record.facts, now.facts) && record.unitsNotListed === now.unitsNotListed;
  const facts: LocalDerivedFact[] = record.facts.map((fact) => {
    const bound = policy?.bounds.get(`${fact.rule}@${fact.ruleVersion}`);
    const unknownReason = bound !== 'pinned-revision' ? 'no-currency-bound-declared' as const : current ? null : 'stale-beyond-currency-bound' as const;
    return {
      id: fact.id, fact: fact.fact, rule: fact.rule, ruleVersion: fact.ruleVersion, path: fact.path,
      count: fact.fact === 'tree-root' ? fact.rootFiles : fact.fact === 'top-level-unit' ? fact.files : null,
      to: fact.fact === 'contains' ? fact.to : null,
      epistemic: unknownReason === null ? 'observed' : 'unknown', unknownReason,
    };
  });
  return {
    state: 'derived', revision: pinned, recordRevision: record.revision, capturedAt: record.capturedAt, recordText: record.text, sha256: record.sha256,
    currencyPolicy: policy === null ? null : { policyId: policy.policyId, policyVersion: policy.policyVersion, sha256: policy.sha256 },
    facts, unitsNotListed: record.unitsNotListed,
    // Version 2.9 (syzygy-3efd.36): the directory map counts what this render re-derives from the tree, never the record's counts, which lie
    // within the agent sessions' write reach and which currency does not compare; it says whether the record's three counts equal these.
    tree: treeCounts(now),
    countsMatch: record.files === now.files && record.secretPathsLeftOut === now.secretPathsLeftOut && record.submodules === now.submodules,
  };
}

/** The counts of a re-derivation of the tree (version 2.9): every blob entry is counted once, at the root, under a listed or an unlisted
 * top-level directory, or as a secret-matching path, so `files - rootFiles - unitFiles - secretPathsLeftOut` is the files under the
 * directories counted and not listed, and is never negative. */
export function treeCounts(now: TreeFacts): LocalTreeCounts {
  let rootFiles = 0, unitsListed = 0, unitFiles = 0;
  for (const fact of now.facts) {
    if (fact.fact === 'tree-root') rootFiles = fact.rootFiles;
    else if (fact.fact === 'top-level-unit') { unitsListed += 1; unitFiles += fact.files; }
  }
  return { files: now.files, rootFiles, unitsListed, unitFiles, unitsNotListed: now.unitsNotListed, secretPathsLeftOut: now.secretPathsLeftOut, submodules: now.submodules };
}
