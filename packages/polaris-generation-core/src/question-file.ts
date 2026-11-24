import { deepFreeze, isRecord, sha256 } from '@syzygy/support';
import { parseBoundedJson } from './parse-json.js';
import { OWNER_TOPICS, type OwnerTopic, type ReaderQuestion } from './topics.js';

/** The question file (syzygy-5dhm.21, R1 slice 1): the one place the reader questions of a Polaris dossier are written, in two parts.
 *
 * The public part holds every question an author may be told: the operator brief's four topics, the provider profile's five reader
 * questions (which the reader test and the scorecard also read) and the kit's seven evaluation questions. The held-out part holds, per
 * comparison subject, the graded questions, the depth list and the reader tasks, by reference only: a key file's path, its SHA-256 and
 * its counts. Their text is written in that key file and never here, so this file, its JSON copy and the `syzygy` binary that carries
 * it hold no held-out text and may be read by anyone, an authoring session included. The key files stay out of every authoring packet
 * (CONTRIBUTING.md, "Changing the dossier brief, draft schema or renderer", rule 4); `packages/polaris-dossier/src/question-file-hold-out.test.ts`
 * checks the packets.
 *
 * The file's digest is SHA-256 over its encoding (two-space JSON, one trailing newline), which is also the byte content of its JSON
 * copy `docs/polaris-generation/question-file-v1.json` (a test holds the two identical). Because each held-out reference carries its
 * key's digest, the file's digest moves with any change to a public text, an order, a reference or a referenced key's bytes. A run
 * record names it (REQ-polaris-generation-033 version 2.27); results compare only at equal digest. */

export const QUESTION_FILE_FORMAT = 'polaris-question-file/1';
export const QUESTION_FILE_JSON_PATH = 'docs/polaris-generation/question-file-v1.json';
/** A depth list holds ten to twenty facts or trade-offs, and a subject has exactly five reader tasks (syzygy-5dhm.1). */
export const DEPTH_LIST_MIN = 10;
export const DEPTH_LIST_MAX = 20;
export const READER_TASKS = 5;
export const QUESTION_FILE_MAX_BYTES = 65_536;

export interface PublicQuestion { readonly id: string; readonly text: string }
/** A held-out list frozen in a key file, by reference: the key's repository-relative path, the SHA-256 of its bytes and the count of
 * items it holds for this list. */
export interface FrozenReference { readonly state: 'frozen'; readonly key: string; readonly sha256: string; readonly count: number }
/** A held-out list not yet written: the subject cannot bind a comparison until it is. */
export interface UnwrittenReference { readonly state: 'not-written'; readonly reason: string }
export type HeldOutReference = FrozenReference | UnwrittenReference;
export interface HeldOutEntry {
  readonly id: string;
  /** The repository the held-out facts describe, as the run record writes its URL, and the commit they describe. */
  readonly repository: string;
  readonly commit: string;
  readonly graded: HeldOutReference & { readonly requiredFacts?: number };
  readonly depth: HeldOutReference;
  readonly tasks: HeldOutReference;
}
export interface QuestionFile {
  readonly format: typeof QUESTION_FILE_FORMAT;
  readonly version: number;
  readonly public: {
    readonly briefTopics: readonly PublicQuestion[];
    readonly readerQuestions: readonly ReaderQuestion[];
    readonly evaluationQuestions: readonly PublicQuestion[];
  };
  readonly heldOut: { readonly rule: string; readonly entries: readonly HeldOutEntry[] };
}

const PILOT_KEY = 'docs/evidence/pursuit-2026-11-21b/pilot/key.json';

/** Version 1. The public texts are, byte for byte, the lists the brief (brief v19), the provider profile (`dossier-v1`) and
 * docs/polaris-generation/TARGETS.md held before they moved here. */
export const QUESTION_FILE: QuestionFile = deepFreeze({
  format: QUESTION_FILE_FORMAT,
  version: 1,
  public: {
    briefTopics: [
      { id: 'why-the-project-exists', text: 'Why does this project exist: what problem does it solve, for whom, and what advantages over the alternatives do its maintainers themselves state? Write it as an argument; a quotation, where you use one, supports the argument and is never the argument itself. A repository that states no reason for existing gets an `unknown` block here, never an invented reason.' },
      { id: 'core-ideas', text: 'What are this project\'s core ideas, stated so a newcomer could repeat them?' },
      { id: 'end-to-end-workflows', text: 'How does a user get from start to finish on the most important end-to-end workflows?' },
      { id: 'mechanisms-and-trade-offs', text: 'What mechanisms underneath make those workflows work, where does each live, and what trade-offs, limits and costs does the design accept for them?' },
    ],
    readerQuestions: [
      { id: 'core-ideas', topics: ['core-ideas'], text: 'What are this project\'s core ideas, stated so a newcomer could repeat them?' },
      { id: 'end-to-end-workflows', topics: ['end-to-end-workflows'], text: 'How does a user get from start to finish on the most important end-to-end workflows?' },
      { id: 'mechanisms', topics: ['mechanisms'], text: 'What mechanisms underneath make those workflows work, and where does each live?' },
      { id: 'maintainer-stated-advantages', topics: ['maintainer-stated-advantages'], text: 'What advantages over alternatives do the maintainers themselves claim, in which words and where?' },
      { id: 'trade-offs', topics: ['trade-offs'], text: 'What trade-offs, limits and costs does the design accept, and what does it give up for them?' },
    ],
    evaluationQuestions: [
      { id: 'purpose', text: 'purpose' },
      { id: 'beneficiary', text: 'beneficiary' },
      { id: 'central-thesis', text: 'central thesis' },
      { id: 'important-capabilities', text: 'important capabilities' },
      { id: 'architectural-choice', text: 'one architectural choice' },
      { id: 'limit', text: 'a limit' },
      { id: 'uncertainty', text: 'an uncertainty' },
    ],
  },
  heldOut: {
    rule: 'Every held-out text lives in the key file its reference names, never in this file. No graded question, required fact, depth fact or reader task enters a brief, packet, skill text or any other text an authoring, inventory, editor or scout session is given, and each key is stored outside every clone a session works in (CONTRIBUTING.md rule 4).',
    entries: [
      {
        id: 'redis-pilot-2026-11-21',
        repository: 'github.com/redis/redis',
        commit: '498ecd0d6d007db11ddb3aea9428552598a78622',
        graded: { state: 'frozen', key: PILOT_KEY, sha256: '0dd376661de598819730357aa844fe026a7113959e30b9f863d8159af72b3690', count: 24, requiredFacts: 81 },
        depth: { state: 'not-written', reason: 'the pilot froze graded questions only; a depth list is written by a session that has seen neither arm, before the calibration pass (syzygy-5dhm.83)' },
        tasks: { state: 'not-written', reason: 'the pilot froze graded questions only; five reader tasks are written with the depth list, before the calibration pass (syzygy-5dhm.83)' },
      },
    ],
  },
});

/** The file's bytes: two-space JSON and one trailing newline. */
export const encodeQuestionFile = (file: QuestionFile): string => `${JSON.stringify(file, null, 2)}\n`;
export const questionFileSha256 = (file: QuestionFile): string => sha256(encodeQuestionFile(file));
export const QUESTION_FILE_SHA256 = questionFileSha256(QUESTION_FILE);

/** What a run record binds: the file's format, version and digest. */
export interface QuestionFileBinding { readonly format: typeof QUESTION_FILE_FORMAT; readonly version: number; readonly sha256: string }
export const questionFileBinding = (file: QuestionFile = QUESTION_FILE): QuestionFileBinding =>
  ({ format: file.format, version: file.version, sha256: questionFileSha256(file) });

export type QuestionFileFault =
  | 'not-json' | 'shape' | 'duplicate-id' | 'unknown-topic' | 'empty-list' | 'reference' | 'depth-count' | 'task-count' | 'not-canonical';
export class QuestionFileError extends Error {
  constructor(readonly fault: QuestionFileFault) { super(`question file refused: ${fault}`); this.name = 'QuestionFileError'; }
}

const HANDLE = /^[a-z0-9][a-z0-9.-]{0,79}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const COMMIT = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const KEY_PATH = /^docs\/(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+\.json$/u;
const TEXT_MAX = 1_000;
const keysAre = (value: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean =>
  Object.keys(value).sort().join(',') === [...keys].sort().join(',');
const isText = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '' && [...value].length <= TEXT_MAX;

function list<T>(value: unknown, read: (item: unknown) => T, idOf: (item: T) => string): T[] {
  if (!Array.isArray(value)) throw new QuestionFileError('shape');
  if (value.length === 0) throw new QuestionFileError('empty-list');
  const items = value.map(read);
  if (new Set(items.map(idOf)).size !== items.length) throw new QuestionFileError('duplicate-id');
  return items;
}

function publicQuestion(value: unknown): PublicQuestion {
  if (!isRecord(value) || !keysAre(value, ['id', 'text']) || typeof value.id !== 'string' || !HANDLE.test(value.id) || !isText(value.text)) throw new QuestionFileError('shape');
  return { id: value.id, text: value.text };
}

function readerQuestion(value: unknown): ReaderQuestion {
  if (!isRecord(value) || !keysAre(value, ['id', 'topics', 'text']) || typeof value.id !== 'string' || !HANDLE.test(value.id) || !isText(value.text)
    || !Array.isArray(value.topics) || value.topics.length === 0) throw new QuestionFileError('shape');
  if (value.topics.some((topic) => !(OWNER_TOPICS as readonly unknown[]).includes(topic)) || new Set(value.topics).size !== value.topics.length) throw new QuestionFileError('unknown-topic');
  return { id: value.id, topics: [...value.topics as OwnerTopic[]], text: value.text };
}

/** A reference; `bounds` is the inclusive count range a frozen one must fall in, `extra` a further integer member it carries. */
function reference(value: unknown, bounds: readonly [number, number], fault: QuestionFileFault, extra?: string): HeldOutReference & Record<string, unknown> {
  if (!isRecord(value)) throw new QuestionFileError('shape');
  if (value.state === 'not-written') {
    if (!keysAre(value, ['state', 'reason']) || !isText(value.reason)) throw new QuestionFileError('shape');
    return { state: 'not-written', reason: value.reason };
  }
  if (value.state !== 'frozen' || !keysAre(value, ['state', 'key', 'sha256', 'count', ...(extra === undefined ? [] : [extra])])) throw new QuestionFileError('shape');
  if (typeof value.key !== 'string' || !KEY_PATH.test(value.key) || value.key.split('/').some((part) => part === '.' || part === '..')
    || typeof value.sha256 !== 'string' || !HEX64.test(value.sha256)) throw new QuestionFileError('reference');
  if (!Number.isSafeInteger(value.count) || (value.count as number) < bounds[0] || (value.count as number) > bounds[1]) throw new QuestionFileError(fault);
  const frozen = { state: 'frozen' as const, key: value.key, sha256: value.sha256, count: value.count as number };
  if (extra === undefined) return frozen;
  if (!Number.isSafeInteger(value[extra]) || (value[extra] as number) < 1) throw new QuestionFileError('shape');
  return { ...frozen, [extra]: value[extra] as number };
}

function heldOutEntry(value: unknown): HeldOutEntry {
  if (!isRecord(value) || !keysAre(value, ['id', 'repository', 'commit', 'graded', 'depth', 'tasks']) || typeof value.id !== 'string' || !HANDLE.test(value.id)
    || !isText(value.repository) || typeof value.commit !== 'string' || !COMMIT.test(value.commit)) throw new QuestionFileError('shape');
  return {
    id: value.id, repository: value.repository, commit: value.commit,
    graded: reference(value.graded, [1, 100], 'shape', 'requiredFacts') as HeldOutEntry['graded'],
    depth: reference(value.depth, [DEPTH_LIST_MIN, DEPTH_LIST_MAX], 'depth-count'),
    tasks: reference(value.tasks, [READER_TASKS, READER_TASKS], 'task-count'),
  };
}

/** Read a question file's bytes: one bounded strict JSON object of the closed shape above, in its own encoding (a file whose bytes are
 * not the encoding of what they parse to is refused, so one content has one digest). Fails closed with the first fault. */
export function readQuestionFile(text: string): QuestionFile {
  let document: unknown;
  try { document = parseBoundedJson(text, { maxBytes: QUESTION_FILE_MAX_BYTES, maxNodes: 2_048, maxDepth: 8 }); } catch { throw new QuestionFileError('not-json'); }
  if (!isRecord(document) || !keysAre(document, ['format', 'version', 'public', 'heldOut']) || document.format !== QUESTION_FILE_FORMAT
    || !Number.isSafeInteger(document.version) || (document.version as number) < 1) throw new QuestionFileError('shape');
  const parts = document.public;
  const heldOut = document.heldOut;
  if (!isRecord(parts) || !keysAre(parts, ['briefTopics', 'readerQuestions', 'evaluationQuestions'])
    || !isRecord(heldOut) || !keysAre(heldOut, ['rule', 'entries']) || !isText(heldOut.rule)) throw new QuestionFileError('shape');
  const file: QuestionFile = {
    format: QUESTION_FILE_FORMAT,
    version: document.version as number,
    public: {
      briefTopics: list(parts.briefTopics, publicQuestion, (q) => q.id),
      readerQuestions: list(parts.readerQuestions, readerQuestion, (q) => q.id),
      evaluationQuestions: list(parts.evaluationQuestions, publicQuestion, (q) => q.id),
    },
    heldOut: { rule: heldOut.rule, entries: list(heldOut.entries, heldOutEntry, (entry) => entry.id) },
  };
  if (encodeQuestionFile(file) !== text) throw new QuestionFileError('not-canonical');
  return file;
}

export type ComparisonBinding =
  | { readonly ok: true; readonly questionFile: QuestionFileBinding; readonly entry: HeldOutEntry }
  | { readonly ok: false; readonly reason: 'unknown-subject' | 'subject-mismatch' | 'held-out-part-incomplete' };

/** Bind a comparison to the file: the subject's entry, its repository and commit as the comparison names them, and every held-out list
 * frozen. A subject with any list not written cannot bind, so no comparison runs without its key. */
export function bindComparison(file: QuestionFile, subject: { readonly entry: string; readonly repository: string; readonly commit: string }): ComparisonBinding {
  const entry = file.heldOut.entries.find((candidate) => candidate.id === subject.entry);
  if (entry === undefined) return { ok: false, reason: 'unknown-subject' };
  if (entry.repository !== subject.repository || entry.commit !== subject.commit) return { ok: false, reason: 'subject-mismatch' };
  if ([entry.graded, entry.depth, entry.tasks].some((ref) => ref.state !== 'frozen')) return { ok: false, reason: 'held-out-part-incomplete' };
  return { ok: true, questionFile: questionFileBinding(file), entry };
}
