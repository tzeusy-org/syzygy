import { randomBytes } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { BoundedJsonError, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { isRecord } from '@syzygy/support';
import { CHECK_RECORD_LIMITS, isCheckRecordOf, readBoundedFile, readCheckRecord } from './check-record-read.js';
import type { FigureFitEntry } from './figure-fit.js';
import { MECHANISM_RULES, mechanismRuleOf, type MechanismRuleId } from './reader-advice.js';
import { REVISION_FILE, RUN_LAYOUT } from './state-directory.js';

/** The run file of advice no author can act on (REQ-polaris-generation-034 version 2.9, syzygy-3efd.64), beside the run record (`run.json`).
 *
 * Each draft check writes `run-advice.json` in the run directory after its check record, in place of any earlier one: every `mechanism`-class
 * figure-fit entry of the run's draft check records, once per distinct pair of rule and entry, with the revisions it occurred in. It is a
 * function of those records alone, each read under the one check-record bound (`check-record-read.ts`), so it is re-derivable and needs no
 * read-modify-write. It is Inferred advice for the operator and Syzygy's maintainers: it gates nothing, and no check outcome, render,
 * review, close or reading difference reads it. The check records keep every entry, so nothing is dropped. */

export const RUN_ADVICE_FORMAT = 'polaris-dossier-run-advice/1' as const;
export const RUN_ADVICE_FILE = 'run-advice.json';

export interface RunAdvisory { readonly rule: MechanismRuleId; readonly advice: FigureFitEntry; readonly revisions: readonly number[] }
export interface RunAdvice {
  readonly format: typeof RUN_ADVICE_FORMAT;
  readonly runId: string;
  readonly rules: typeof MECHANISM_RULES;
  readonly checkRecords: { readonly read: number; readonly unreadable: number };
  readonly occurrences: number;
  readonly advisories: readonly RunAdvisory[];
}

/** A JSON value's text with every object's keys sorted, so two entries compare as JSON values whatever their key order. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (isRecord(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

/** Whether a stored figure-fit entry has the shape `figureFit` writes: an `unknown` entry, or one with the numbers its class reads. */
function isFitEntry(value: unknown): value is FigureFitEntry {
  if (!isRecord(value) || typeof value['diagram'] !== 'string') return false;
  if ('unknown' in value) return typeof value['unknown'] === 'string';
  return typeof value['columnPx'] === 'number' && typeof value['laidOutPx'] === 'number';
}

/** The `mechanism`-class entries of one parsed check record's `figureFit`, in its order, with their rule. */
export function mechanismEntries(record: unknown): { readonly rule: MechanismRuleId; readonly entry: FigureFitEntry }[] {
  const fit = isRecord(record) ? record['figureFit'] : undefined;
  const entries = isRecord(fit) && Array.isArray(fit['entries']) ? fit['entries'] : [];
  return entries.flatMap((entry) => {
    if (!isFitEntry(entry)) return [];
    const rule = mechanismRuleOf(entry);
    return rule === null ? [] : [{ rule, entry }];
  });
}

/** The run file's content, computed from every draft check record `checks/rev-<n>.json` of the run directory `run`. A record that cannot
 * be read under the bound, does not parse, or is not the check record of the revision its name gives is counted unreadable and contributes
 * nothing; a record without `figureFit` is read and contributes nothing. */
export function computeRunAdvice(run: string, runId: string): RunAdvice {
  const dir = path.join(run, RUN_LAYOUT.checks);
  let names: string[];
  try { names = fs.readdirSync(dir); } catch { names = []; }
  const revisions = names.flatMap((name) => { const m = REVISION_FILE.exec(name); return m === null ? [] : [Number(m[1])]; }).sort((a, b) => a - b);
  let read = 0, unreadable = 0;
  const byKey = new Map<string, { rule: MechanismRuleId; advice: FigureFitEntry; revisions: number[] }>();
  for (const revision of revisions) {
    let record: unknown;
    try { record = readCheckRecord(path.join(dir, `rev-${revision}.json`)); } catch { unreadable += 1; continue; }
    if (!isCheckRecordOf(record, revision)) { unreadable += 1; continue; }
    read += 1;
    for (const { rule, entry } of mechanismEntries(record)) {
      const key = `${rule}\n${canonical(entry)}`;
      const held = byKey.get(key);
      if (held === undefined) byKey.set(key, { rule, advice: entry, revisions: [revision] });
      else if (held.revisions[held.revisions.length - 1] !== revision) held.revisions.push(revision);
    }
  }
  // A Map keeps insertion order: by first revision, then by the entry's place in that revision's member.
  const advisories = [...byKey.values()];
  return {
    format: RUN_ADVICE_FORMAT, runId, rules: MECHANISM_RULES, checkRecords: { read, unreadable },
    occurrences: advisories.reduce((n, advisory) => n + advisory.revisions.length, 0), advisories,
  };
}

/** The run file's exact text: two-space JSON with one trailing newline. */
export const encodeRunAdvice = (advice: RunAdvice): string => `${JSON.stringify(advice, null, 2)}\n`;

/** Write the run file in place of any earlier one, through a temporary file renamed into place. Throws where it cannot be written. */
export function writeRunAdvice(run: string, advice: RunAdvice): void {
  const temp = path.join(run, `.${RUN_ADVICE_FILE}.${randomBytes(8).toString('hex')}`);
  try {
    fs.writeFileSync(temp, encodeRunAdvice(advice), { mode: 0o600, flag: 'wx' });
    fs.renameSync(temp, path.join(run, RUN_ADVICE_FILE));
  } catch (cause) {
    fs.rmSync(temp, { force: true });
    throw cause;
  }
}

/** The run file's read bound: the check record's, since the file holds no more than the entries of the run's records. */
export const RUN_ADVICE_LIMITS = CHECK_RECORD_LIMITS;

/** The run file as written, or null where it is missing, past the read bound (refused from its size before any byte is read), or is not
 * exactly what `writeRunAdvice` writes for some content. For the operator and tests only: no check outcome, render, review, close or reading
 * difference calls it. */
export function readRunAdvice(run: string): RunAdvice | null {
  const file = path.join(run, RUN_ADVICE_FILE);
  let text: string;
  try {
    // The reader rule (syzygy-3efd.76): a FIFO, a device, a directory or a file past the bound is no run file.
    text = readBoundedFile(file, RUN_ADVICE_LIMITS.maxBytes).toString('utf8');
  } catch { return null; }
  try {
    const doc: unknown = parseBoundedJson(text, RUN_ADVICE_LIMITS);
    if (!isRecord(doc) || doc['format'] !== RUN_ADVICE_FORMAT || encodeRunAdvice(doc as unknown as RunAdvice) !== text) return null;
    return doc as unknown as RunAdvice;
  } catch {
    return null;
  }
}
