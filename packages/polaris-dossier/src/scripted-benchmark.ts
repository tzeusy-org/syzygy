import {
  bindComparison, parseBoundedJson, readQuestionFile, scriptedAnswers, type HeldOutReference, type ReaderAnswer,
} from '@syzygy/polaris-generation-core/live';
import { decodeUtf8, isRecord, sha256 } from '@syzygy/support';
import { type DossierScreen } from './screen.js';
import { BenchmarkRefusal, type BenchmarkStore } from './scripted-benchmark-store.js';

export const BENCHMARK_LIMITS = {
  questionFile: 65_536, key: 262_144, answers: 1_048_576, grade: 65_536,
} as const;
const KEY_FORMAT = 'polaris-scripted-benchmark-key/1';
const ANSWERS_FORMAT = 'polaris-scripted-benchmark-answers/1';
const GRADE_FORMAT = 'polaris-scripted-benchmark-grade/1';
const HANDLE = /^[a-z0-9][a-z0-9.-]{0,79}$/u;

interface FixtureIdentity {
  readonly runId: string;
  readonly entry: string;
  readonly repository: string;
  readonly commit: string;
  readonly questionFileSha256: string;
  readonly session: string;
}

interface KeyQuestion {
  readonly id: string;
  readonly prompt: string;
  readonly facts: string;
}

export interface FixtureKey {
  readonly format: typeof KEY_FORMAT;
  readonly id: string;
  readonly questions: readonly KeyQuestion[];
}

type AnswerKind = 'answered' | 'cannot-answer';

interface StoredAnswer {
  readonly question: string;
  readonly kind: AnswerKind;
  readonly text: string;
}

export interface BlindBenchmarkQuestion {
  readonly position: number;
  readonly kind: AnswerKind;
  readonly answer: readonly number[];
  readonly required: readonly number[];
}

interface BenchmarkScore {
  readonly position: number;
  readonly outcome: 'right' | 'partial' | 'wrong' | 'refused';
  readonly matched: number;
  readonly required: number;
}

interface BenchmarkGrade {
  readonly format: typeof GRADE_FORMAT;
  readonly label: 'Inferred';
  readonly answerSha256: string;
  readonly keySha256: string;
  readonly scores: readonly BenchmarkScore[];
}

type GradeOutcome =
  | { readonly status: 'unknown'; readonly reason: 'companion-absent' }
  | { readonly status: 'graded'; readonly grade: BenchmarkGrade };

interface ScriptedBenchmarkInput {
  readonly store: BenchmarkStore;
  readonly identity: FixtureIdentity;
  readonly script: Readonly<Record<string, ReaderAnswer>>;
  readonly pages: readonly { readonly path: string; readonly html: string }[];
  readonly screen: Pick<DossierScreen, 'screenBody'>;
  readonly onBlindPacket?: (packet: readonly BlindBenchmarkQuestion[]) => void;
}

export function fixtureBytes(document: unknown): Buffer {
  return Buffer.from(JSON.stringify(document, null, 2) + '\n', 'utf8');
}

function parseArtifact(bytes: Buffer): unknown {
  try {
    const text = decodeUtf8(bytes);
    if (text === undefined) throw new BenchmarkRefusal('artifact-invalid');
    const parsed = parseBoundedJson(text, { maxBytes: BENCHMARK_LIMITS.answers, maxDepth: 12, maxNodes: 200_000 });
    if (!fixtureBytes(parsed).equals(bytes)) throw new BenchmarkRefusal('artifact-invalid');
    return parsed;
  } catch {
    throw new BenchmarkRefusal('artifact-invalid');
  }
}

function hasFields(value: unknown, fields: readonly string[]): value is Record<string, unknown> {
  return isRecord(value) && Object.keys(value).length === fields.length && fields.every(field => Object.hasOwn(value, field));
}

function distinctFacts(text: string): string[] {
  return [...new Set(text.split('\n').map(line => line.replace(/^[\x09-\x0d ]+|[\x09-\x0d ]+$/gu, '')).filter(Boolean))];
}

function readKey(bytes: Buffer, id: string, count: number, requiredFacts: number): FixtureKey {
  const key = parseArtifact(bytes);
  if (!hasFields(key, ['format', 'id', 'questions']) || key.format !== KEY_FORMAT || key.id !== id
    || !Array.isArray(key.questions) || key.questions.length !== count) {
    throw new BenchmarkRefusal('binding-invalid');
  }
  const questions = key.questions.map((question: unknown): KeyQuestion => {
    if (!hasFields(question, ['id', 'prompt', 'facts']) || typeof question.id !== 'string' || !HANDLE.test(question.id)
      || typeof question.prompt !== 'string' || question.prompt.trim() === '' || typeof question.facts !== 'string'
      || distinctFacts(question.facts).length === 0) {
      throw new BenchmarkRefusal('binding-invalid');
    }
    return { id: question.id, prompt: question.prompt, facts: question.facts };
  });
  if (new Set(questions.map(question => question.id)).size !== count
    || questions.reduce((total, question) => total + distinctFacts(question.facts).length, 0) !== requiredFacts) {
    throw new BenchmarkRefusal('binding-invalid');
  }
  return { format: KEY_FORMAT, id, questions };
}

function verifyFrozenList(input: ScriptedBenchmarkInput, name: 'depth' | 'tasks', reference: HeldOutReference): void {
  if (reference.state !== 'frozen') throw new BenchmarkRefusal('binding-invalid');
  const bytes = input.store.readInput(name, BENCHMARK_LIMITS.key);
  if (sha256(bytes) !== reference.sha256) throw new BenchmarkRefusal('binding-invalid');
  const rows = parseArtifact(bytes);
  if (!Array.isArray(rows) || rows.length !== reference.count || rows.some(row => typeof row !== 'string' || row.trim() === '')
    || new Set(rows).size !== rows.length) {
    throw new BenchmarkRefusal('binding-invalid');
  }
  for (const row of rows) screenText(input.screen, row);
}

function loadFrozenKey(input: ScriptedBenchmarkInput): { key: FixtureKey; keySha256: string } {
  const { identity, store, screen } = input;
  const frozenBytes = store.readInput('questionFile', BENCHMARK_LIMITS.questionFile);
  const frozen = decodeUtf8(frozenBytes);
  if (frozen === undefined || sha256(frozenBytes) !== identity.questionFileSha256) throw new BenchmarkRefusal('binding-invalid');
  let comparison;
  try {
    comparison = bindComparison(readQuestionFile(frozen), identity);
  } catch {
    throw new BenchmarkRefusal('binding-invalid');
  }
  if (!comparison.ok || comparison.questionFile.sha256 !== identity.questionFileSha256) throw new BenchmarkRefusal('binding-invalid');
  verifyFrozenList(input, 'depth', comparison.entry.depth);
  verifyFrozenList(input, 'tasks', comparison.entry.tasks);
  const reference = comparison.entry.graded;
  if (reference.state !== 'frozen' || reference.requiredFacts === undefined) throw new BenchmarkRefusal('binding-invalid');
  const bytes = store.readInput('key', BENCHMARK_LIMITS.key);
  const keySha256 = sha256(bytes);
  if (reference.sha256 !== keySha256) throw new BenchmarkRefusal('binding-invalid');
  const key = readKey(bytes, reference.key, reference.count, reference.requiredFacts);
  for (const { prompt, facts } of key.questions) {
    screenText(screen, prompt);
    screenText(screen, facts);
  }
  return { key, keySha256 };
}

function screenText(screen: ScriptedBenchmarkInput['screen'], text: string): void {
  if (Buffer.from(text, 'utf8').toString('utf8') !== text || screen.screenBody(text) !== undefined) {
    throw new BenchmarkRefusal('screening-refused');
  }
}

function readAnswers(bytes: Buffer, binding: Readonly<Record<string, string>>, questions: readonly KeyQuestion[]): StoredAnswer[] {
  const document = parseArtifact(bytes);
  if (!hasFields(document, ['format', 'label', 'binding', 'answers']) || document.format !== ANSWERS_FORMAT || document.label !== 'Inferred'
    || !hasFields(document.binding, Object.keys(binding)) || !Array.isArray(document.answers) || document.answers.length !== questions.length) {
    throw new BenchmarkRefusal('answer-changed');
  }
  const actual = document.binding;
  if (!Object.entries(binding).every(([name, value]) => actual[name] === value)) throw new BenchmarkRefusal('answer-changed');
  return document.answers.map((answer: unknown, index: number) => {
    if (!hasFields(answer, ['question', 'kind', 'text']) || answer.question !== questions[index]!.id
      || (answer.kind !== 'answered' && answer.kind !== 'cannot-answer') || typeof answer.text !== 'string') {
      throw new BenchmarkRefusal('answer-changed');
    }
    return { question: answer.question, kind: answer.kind, text: answer.text };
  });
}

function blindQuestion(question: KeyQuestion, row: StoredAnswer, position: number): BlindBenchmarkQuestion {
  const tokens = new Map<string, number>();
  const token = (fact: string): number => {
    const known = tokens.get(fact);
    if (known !== undefined) return known;
    const next = tokens.size + 1;
    tokens.set(fact, next);
    return next;
  };
  const required = distinctFacts(question.facts).map(token);
  const answer = row.kind === 'answered' ? distinctFacts(row.text).map(token).sort((a, b) => a - b) : [];
  return { position, kind: row.kind, answer, required };
}

function gradeQuestion(row: BlindBenchmarkQuestion): BenchmarkScore {
  const required = new Set(row.required);
  const matched = row.answer.filter(fact => required.has(fact)).length;
  let outcome: BenchmarkScore['outcome'];
  if (row.kind === 'cannot-answer') outcome = 'refused';
  else if (matched === 0 || matched < row.answer.length) outcome = 'wrong';
  else if (matched === required.size) outcome = 'right';
  else outcome = 'partial';
  return { position: row.position, outcome, matched, required: required.size };
}

/** This path is driven only by the evaluator's prepared fixture and its scripted reader. */
export function scriptedBenchmark(input: ScriptedBenchmarkInput): {
  storeAnswers(signal: AbortSignal): Promise<string>;
  grade(): GradeOutcome;
} {
  const { store, identity, screen } = input;
  const readers = scriptedAnswers(input.script);
  let answerReceipt: string | undefined;
  const bindingOf = (keySha256: string) => ({
    runId: identity.runId, entry: identity.entry, repository: identity.repository, commit: identity.commit,
    questionFileSha256: identity.questionFileSha256, session: identity.session, keySha256, scriptSha256: readers.subjectSha256,
  });

  return {
    async storeAnswers(signal) {
      const { key, keySha256 } = loadFrozenKey(input);
      const answers: StoredAnswer[] = [];
      for (const question of key.questions) {
        signal.throwIfAborted();
        const row = await readers.create().answer({ question: { id: question.id, text: question.prompt }, pages: input.pages }, signal);
        const text = row.kind === 'answered' ? row.text : row.reason;
        if (typeof text !== 'string') throw new BenchmarkRefusal('artifact-invalid');
        screenText(screen, text);
        answers.push({ question: question.id, kind: row.kind, text });
      }
      signal.throwIfAborted();
      const bytes = fixtureBytes({ format: ANSWERS_FORMAT, label: 'Inferred', binding: bindingOf(keySha256), answers });
      store.publish('answers', bytes, BENCHMARK_LIMITS.answers);
      answerReceipt = sha256(bytes);
      return answerReceipt;
    },

    grade() {
      const bytes = store.readStored('answers', BENCHMARK_LIMITS.answers);
      if (bytes === undefined) return { status: 'unknown', reason: 'companion-absent' };
      if (answerReceipt === undefined || sha256(bytes) !== answerReceipt) throw new BenchmarkRefusal('answer-changed');
      const { key, keySha256 } = loadFrozenKey(input);
      const answers = readAnswers(bytes, bindingOf(keySha256), key.questions);
      for (const { text } of answers) screenText(screen, text);
      const packet = key.questions.map((question, index) => blindQuestion(question, answers[index]!, index + 1));
      input.onBlindPacket?.(structuredClone(packet));
      const grade = {
        format: GRADE_FORMAT, label: 'Inferred', answerSha256: answerReceipt, keySha256, scores: packet.map(gradeQuestion),
      } as const;
      const encoded = fixtureBytes(grade);
      store.publish('grade', encoded, BENCHMARK_LIMITS.grade);
      if (!store.readStored('grade', BENCHMARK_LIMITS.grade)?.equals(encoded)) throw new BenchmarkRefusal('artifact-invalid');
      return { status: 'graded', grade };
    },
  };
}
