/**
 * The reader questions a run is built to answer. The pipeline's
 * `readerQuestions` is typed `unknown` at the request boundary, so this is
 * the closed shape every request must satisfy before anything dispatches.
 * Topics name the owner-level subjects a question serves; the list and the
 * question type are declared once in topics.ts (`OWNER_TOPICS`,
 * `ReaderQuestion`), which the dossier evaluator shares.
 */

import { isRecord } from '@syzygy/support';
import { OWNER_TOPICS, type OwnerTopic, type ReaderQuestion } from './topics.js';

export const READER_QUESTION_TOPICS = OWNER_TOPICS;
export type ReaderQuestionTopic = OwnerTopic;
export const READER_QUESTIONS_MAX = 20;
export const READER_QUESTION_TEXT_MAX = 500;

export class ReaderQuestionsError extends Error {
  constructor() { super('Reader questions rejected'); this.name = 'ReaderQuestionsError'; }
}

const handle = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,99}$/u;

/** A closed shape: ids unique handles, topics from the list without repeats,
 * text non-blank and bounded, no extra keys. Fails closed on anything else. */
export function validateReaderQuestions(value: unknown): readonly ReaderQuestion[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > READER_QUESTIONS_MAX) throw new ReaderQuestionsError();
  const seen = new Set<string>();
  return value.map((question: unknown): ReaderQuestion => {
    if (!isRecord(question) || Object.keys(question).some(key => !['id', 'topics', 'text'].includes(key))
      || typeof question.id !== 'string' || !handle.test(question.id) || seen.has(question.id)
      || typeof question.text !== 'string' || question.text.trim().length === 0 || [...question.text].length > READER_QUESTION_TEXT_MAX
      || !Array.isArray(question.topics) || question.topics.some(topic => !(READER_QUESTION_TOPICS as readonly unknown[]).includes(topic))
      || new Set(question.topics).size !== question.topics.length) throw new ReaderQuestionsError();
    seen.add(question.id);
    return { id: question.id, topics: [...question.topics as ReaderQuestionTopic[]], text: question.text };
  });
}
