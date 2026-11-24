import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DOSSIER_READER_QUESTIONS, dossierQuestionsFile } from './dossier-profile.js';
import { parseReaderQuestions } from './dossier-manifest.js';
import {
  QUESTION_FILE, QUESTION_FILE_SHA256, QuestionFileError, bindComparison, encodeQuestionFile, questionFileBinding, questionFileSha256, readQuestionFile,
  type QuestionFile,
} from './question-file.js';

// syzygy-5dhm.21 (R1 slice 1): the one question file. Expected values are literals or computed here from the files on disk, never
// imported from the module under test.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const JSON_COPY = fs.readFileSync(path.join(ROOT, 'docs/polaris-generation/question-file-v1.json'), 'utf8');
const sha = (bytes: string | Buffer): string => createHash('sha256').update(bytes).digest('hex');
const mutable = (): Record<string, any> => JSON.parse(JSON_COPY) as Record<string, any>;
const encode = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
const fault = (text: string): string => {
  try { readQuestionFile(text); return 'read'; } catch (cause) { return cause instanceof QuestionFileError ? cause.fault : 'other'; }
};
const FROZEN_DEPTH = { state: 'frozen', key: 'docs/evidence/example/key.json', sha256: 'a'.repeat(64), count: 12 };
const FROZEN_TASKS = { state: 'frozen', key: 'docs/evidence/example/key.json', sha256: 'a'.repeat(64), count: 5 };

describe('the question file', () => {
  it('is held byte for byte by its JSON copy, whose SHA-256 is the recorded digest', () => {
    expect(encodeQuestionFile(QUESTION_FILE)).toBe(JSON_COPY);
    expect(sha(JSON_COPY)).toBe('b2d08554c96197afa8466cf004d7cfb61d3af0fbf952a2500d28d9aa225e6729');
    expect(QUESTION_FILE_SHA256).toBe('b2d08554c96197afa8466cf004d7cfb61d3af0fbf952a2500d28d9aa225e6729');
    expect(questionFileBinding()).toEqual({ format: 'polaris-question-file/1', version: 1, sha256: 'b2d08554c96197afa8466cf004d7cfb61d3af0fbf952a2500d28d9aa225e6729' });
    expect(readQuestionFile(JSON_COPY)).toEqual(QUESTION_FILE);
  });

  it('holds the public lists in their former order and words', () => {
    expect(QUESTION_FILE.public.briefTopics.map((topic) => topic.id)).toEqual(['why-the-project-exists', 'core-ideas', 'end-to-end-workflows', 'mechanisms-and-trade-offs']);
    expect(QUESTION_FILE.public.briefTopics[1]?.text).toBe('What are this project\'s core ideas, stated so a newcomer could repeat them?');
    expect(QUESTION_FILE.public.readerQuestions.map((question) => question.id)).toEqual(['core-ideas', 'end-to-end-workflows', 'mechanisms', 'maintainer-stated-advantages', 'trade-offs']);
    expect(QUESTION_FILE.public.readerQuestions[2]).toEqual({ id: 'mechanisms', topics: ['mechanisms'], text: 'What mechanisms underneath make those workflows work, and where does each live?' });
    expect(QUESTION_FILE.public.evaluationQuestions.map((question) => question.text)).toEqual(['purpose', 'beneficiary', 'central thesis', 'important capabilities', 'one architectural choice', 'a limit', 'an uncertainty']);
  });

  it('is the list the provider profile, its frozen questions file and the scorecard\'s reader all read', () => {
    expect(DOSSIER_READER_QUESTIONS).toBe(QUESTION_FILE.public.readerQuestions);
    expect(parseReaderQuestions(dossierQuestionsFile())).toEqual(QUESTION_FILE.public.readerQuestions);
  });

  it('pins each frozen held-out key by digest and count, and carries no held-out text itself', () => {
    const [redis] = QUESTION_FILE.heldOut.entries;
    expect(QUESTION_FILE.heldOut.entries).toHaveLength(1);
    expect(redis?.graded).toEqual({ state: 'frozen', key: 'docs/evidence/pursuit-2026-11-21b/pilot/key.json', sha256: '0dd376661de598819730357aa844fe026a7113959e30b9f863d8159af72b3690', count: 24, requiredFacts: 81 });
    const bytes = fs.readFileSync(path.join(ROOT, 'docs/evidence/pursuit-2026-11-21b/pilot/key.json'));
    expect(sha(bytes)).toBe('0dd376661de598819730357aa844fe026a7113959e30b9f863d8159af72b3690');
    const key = JSON.parse(bytes.toString('utf8')) as { questions: { question: string; required_facts: string[] }[] };
    expect(key.questions).toHaveLength(24);
    expect(key.questions.flatMap((question) => question.required_facts)).toHaveLength(81);
    expect(redis?.depth.state).toBe('not-written');
    expect(redis?.tasks.state).toBe('not-written');
    // The pilot's first question is in its key, never in the file.
    expect(JSON_COPY).not.toContain('where does it keep its data');
  });

  it('moves its digest with any change to a text, an order or a referenced key', () => {
    const changedText = mutable();
    changedText.public.briefTopics[1].text += ' ';
    const reordered = mutable();
    reordered.public.readerQuestions.reverse();
    const rekeyed = mutable();
    rekeyed.heldOut.entries[0].graded.sha256 = 'b'.repeat(64);
    const digests = [JSON_COPY, encode(changedText), encode(reordered), encode(rekeyed)].map((text) => questionFileSha256(readQuestionFile(text)));
    expect(new Set(digests).size).toBe(4);
    expect(digests[0]).toBe('b2d08554c96197afa8466cf004d7cfb61d3af0fbf952a2500d28d9aa225e6729');
  });

  it('refuses a malformed file by its first fault', () => {
    const cases: [string, (file: Record<string, any>) => void, string][] = [
      ['stray member', (file) => { file.extra = 1; }, 'shape'],
      ['other format', (file) => { file.format = 'polaris-question-file/2'; }, 'shape'],
      ['duplicate public id', (file) => { file.public.briefTopics[1].id = 'core-ideas'; file.public.briefTopics[2].id = 'core-ideas'; }, 'duplicate-id'],
      ['unknown topic', (file) => { file.public.readerQuestions[0].topics = ['marketing']; }, 'unknown-topic'],
      ['empty list', (file) => { file.public.evaluationQuestions = []; }, 'empty-list'],
      ['duplicate entry', (file) => { file.heldOut.entries.push(file.heldOut.entries[0]); }, 'duplicate-id'],
      ['key outside docs', (file) => { file.heldOut.entries[0].graded.key = 'packages/x/key.json'; }, 'reference'],
      ['key climbing out', (file) => { file.heldOut.entries[0].graded.key = 'docs/../key.json'; }, 'reference'],
      ['short digest', (file) => { file.heldOut.entries[0].graded.sha256 = 'a'.repeat(63); }, 'reference'],
      ['graded without its fact count', (file) => { delete file.heldOut.entries[0].graded.requiredFacts; }, 'shape'],
      ['short commit', (file) => { file.heldOut.entries[0].commit = '498ecd0'; }, 'shape'],
    ];
    for (const [name, mutate, expected] of cases) {
      const file = mutable();
      mutate(file);
      expect([name, fault(encode(file))]).toEqual([name, expected]);
    }
    expect(fault('{')).toBe('not-json');
    expect(fault(JSON_COPY.trimEnd())).toBe('not-canonical');
    expect(fault(JSON.stringify(JSON.parse(JSON_COPY)))).toBe('not-canonical');
  });

  it('binds ten to twenty depth facts and exactly five reader tasks, and nothing either side', () => {
    const withCounts = (depth: number, tasks: number): string => {
      const file = mutable();
      file.heldOut.entries[0].depth = { ...FROZEN_DEPTH, count: depth };
      file.heldOut.entries[0].tasks = { ...FROZEN_TASKS, count: tasks };
      return encode(file);
    };
    expect([9, 10, 20, 21].map((depth) => fault(withCounts(depth, 5)))).toEqual(['depth-count', 'read', 'read', 'depth-count']);
    expect([4, 5, 6].map((tasks) => fault(withCounts(12, tasks)))).toEqual(['task-count', 'read', 'task-count']);
  });

  it('binds a comparison only to a known subject at its own commit with every held-out list frozen', () => {
    const subject = { entry: 'redis-pilot-2026-11-21', repository: 'github.com/redis/redis', commit: '498ecd0d6d007db11ddb3aea9428552598a78622' };
    expect(bindComparison(QUESTION_FILE, subject)).toEqual({ ok: false, reason: 'held-out-part-incomplete' });
    expect(bindComparison(QUESTION_FILE, { ...subject, entry: 'valkey' })).toEqual({ ok: false, reason: 'unknown-subject' });
    expect(bindComparison(QUESTION_FILE, { ...subject, commit: 'f'.repeat(40) })).toEqual({ ok: false, reason: 'subject-mismatch' });
    const file = mutable();
    file.heldOut.entries[0].depth = FROZEN_DEPTH;
    file.heldOut.entries[0].tasks = FROZEN_TASKS;
    const complete: QuestionFile = readQuestionFile(encode(file));
    const bound = bindComparison(complete, subject);
    expect(bound.ok).toBe(true);
    expect(bound.ok && bound.questionFile.sha256).toBe(sha(encode(file)));
    expect(bound.ok && bound.questionFile.sha256).not.toBe('b2d08554c96197afa8466cf004d7cfb61d3af0fbf952a2500d28d9aa225e6729');
  });
});
