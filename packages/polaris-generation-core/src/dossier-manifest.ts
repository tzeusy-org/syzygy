import { isRecord } from '@syzygy/support';
import { parseBoundedJson } from './parse-json.js';
import { OWNER_TOPICS, READER_QUESTIONS_FORMAT, type OwnerTopic, type ReaderQuestion } from './topics.js';

/** The dossier manifest and reader-question parsers and the evaluation error; split out of `dossier-evaluation.ts` unchanged. */

export const DOSSIER_FORMAT = 'polaris-dossier-v1';
export const EPISTEMIC = ['observed', 'inferred', 'unknown'] as const;
export type Epistemic = typeof EPISTEMIC[number];

export const JSON_LIMITS = { maxBytes: 4_000_000, maxNodes: 200_000, maxDepth: 32 } as const;

export class DossierEvaluationError extends Error {
  constructor(readonly code: 'invalid-manifest' | 'invalid-questions' | 'questions-not-frozen' | 'missing-page' | 'invalid-answer') {
    super(`Dossier evaluation refused: ${code}`);
    this.name = 'DossierEvaluationError';
  }
}

export interface DossierManifest {
  readonly format: typeof DOSSIER_FORMAT;
  readonly title: string;
  readonly entryPage: string;
  readonly pages: readonly { readonly path: string; readonly depth: number }[];
}

export const onlyKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean => Object.keys(value).every(key => keys.includes(key));
const handle = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,99}$/u;

/** A relative POSIX path inside the run directory: no root, no `.` or `..`, no backslash. */
export function isDossierPagePath(path: unknown): path is string {
  return typeof path === 'string' && path.length > 0 && path.length <= 300 && !path.startsWith('/') && !path.includes('\\') && !path.includes('\0')
    && path.split('/').every(part => part !== '' && part !== '.' && part !== '..');
}

export function parseDossierManifest(text: string): DossierManifest {
  const fail = (): never => { throw new DossierEvaluationError('invalid-manifest'); };
  let value: unknown;
  try { value = parseBoundedJson(text, JSON_LIMITS); } catch { return fail(); }
  if (!isRecord(value) || !onlyKeys(value, ['format', 'title', 'entryPage', 'pages']) || value.format !== DOSSIER_FORMAT
    || typeof value.title !== 'string' || !value.title.trim() || !isDossierPagePath(value.entryPage) || !Array.isArray(value.pages) || value.pages.length === 0) fail();
  const record = value as Record<string, unknown> & { pages: unknown[] };
  const seen = new Set<string>();
  const pages = record.pages.map(page => {
    if (!isRecord(page) || !onlyKeys(page, ['path', 'depth']) || !isDossierPagePath(page.path)
      || !Number.isSafeInteger(page.depth) || (page.depth as number) < 0 || seen.has(page.path)) fail();
    const entry = page as { path: string; depth: number };
    seen.add(entry.path);
    return { path: entry.path, depth: entry.depth };
  });
  const atZero = pages.filter(page => page.depth === 0);
  if (atZero.length !== 1 || atZero[0]!.path !== record.entryPage) fail();
  return { format: DOSSIER_FORMAT, title: record.title as string, entryPage: record.entryPage as string, pages };
}

export function parseReaderQuestions(text: string): readonly ReaderQuestion[] {
  const fail = (): never => { throw new DossierEvaluationError('invalid-questions'); };
  let value: unknown;
  try { value = parseBoundedJson(text, JSON_LIMITS); } catch { return fail(); }
  if (!isRecord(value) || !onlyKeys(value, ['format', 'questions']) || value.format !== READER_QUESTIONS_FORMAT
    || !Array.isArray(value.questions) || value.questions.length === 0) fail();
  const seen = new Set<string>();
  return (value as { questions: unknown[] }).questions.map(question => {
    if (!isRecord(question) || !onlyKeys(question, ['id', 'topics', 'text']) || typeof question.id !== 'string' || !handle.test(question.id)
      || seen.has(question.id) || typeof question.text !== 'string' || !question.text.trim() || !Array.isArray(question.topics)
      || question.topics.some(topic => !(OWNER_TOPICS as readonly unknown[]).includes(topic)) || new Set(question.topics).size !== question.topics.length) fail();
    const entry = question as { id: string; topics: OwnerTopic[]; text: string };
    seen.add(entry.id);
    return { id: entry.id, topics: [...entry.topics], text: entry.text };
  });
}
