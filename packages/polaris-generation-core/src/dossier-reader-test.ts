import { isRecord } from '@syzygy/support';
import { digestCanonicalJson } from './canonical-json.js';
import { OWNER_TOPICS, type ReaderQuestion } from './topics.js';
import { DossierEvaluationError, type DossierManifest, JSON_LIMITS, onlyKeys } from './dossier-manifest.js';
import { type ScannedPage } from './dossier-page-scan.js';

/** The scripted reader-test harness and topic coverage; split out of `dossier-evaluation.ts` unchanged. */

// ---------------------------------------------------------------------------
// (c) Reader test scaffolding. A fresh reader per question sees the question
// text and the page bytes only: no topics, sources, manifest or prior answers.

export interface ReaderLocation { readonly page: string; readonly sectionId: string }
export type ReaderAnswer =
  | { readonly kind: 'answered'; readonly text: string; readonly citations: readonly ReaderLocation[]; readonly attemptedPaths: readonly string[] }
  | { readonly kind: 'cannot-answer'; readonly reason: string; readonly attemptedPaths: readonly string[] };
export interface ReaderAnswerPort {
  answer(input: { readonly question: { readonly id: string; readonly text: string }; readonly pages: readonly { readonly path: string; readonly html: string }[] }, signal: AbortSignal): Promise<ReaderAnswer>;
}

/** Creates one fresh reader per question. `kind` and `subjectSha256` bind the
 * report to what answered: a scripted citation never reads as reader evidence. */
export interface ReaderPortFactory {
  readonly kind: 'scripted';
  readonly subjectSha256: string;
  create(): ReaderAnswerPort;
}

/** The only answer implementation: answers fixed in advance, keyed by question id. */
export function scriptedAnswers(script: Readonly<Record<string, ReaderAnswer>>): ReaderPortFactory {
  const frozen = structuredClone(script);
  return {
    kind: 'scripted',
    subjectSha256: digestCanonicalJson(frozen, JSON_LIMITS).digest,
    create: () => ({
      async answer({ question }) {
        const scripted = frozen[question.id];
        return scripted === undefined ? { kind: 'cannot-answer', reason: 'no scripted answer', attemptedPaths: [] } : structuredClone(scripted);
      },
    }),
  };
}

function checkAnswer(value: unknown): ReaderAnswer {
  const fail = (): never => { throw new DossierEvaluationError('invalid-answer'); };
  if (!isRecord(value) || !Array.isArray(value.attemptedPaths) || value.attemptedPaths.some(path => typeof path !== 'string')) fail();
  const answer = value as Record<string, unknown>;
  if (answer.kind === 'answered') {
    if (!onlyKeys(answer, ['kind', 'text', 'citations', 'attemptedPaths']) || typeof answer.text !== 'string' || !Array.isArray(answer.citations)
      || answer.citations.some(citation => !isRecord(citation) || !onlyKeys(citation, ['page', 'sectionId']) || typeof citation.page !== 'string' || typeof citation.sectionId !== 'string')) fail();
  } else if (answer.kind === 'cannot-answer') {
    if (!onlyKeys(answer, ['kind', 'reason', 'attemptedPaths']) || typeof answer.reason !== 'string') fail();
  } else fail();
  return value as ReaderAnswer;
}

export async function runReaderTest(questions: readonly ReaderQuestion[], manifest: DossierManifest, pages: ReadonlyMap<string, string>,
  scanned: ReadonlyMap<string, ScannedPage>, readers: ReaderPortFactory, signal: AbortSignal) {
  const pageInput = manifest.pages.map(page => ({ path: page.path, html: pages.get(page.path)! }));
  const results = [];
  for (const question of questions) {
    signal.throwIfAborted();
    const answer = checkAnswer(await readers.create().answer({ question: { id: question.id, text: question.text }, pages: pageInput.map(page => ({ ...page })) }, signal));
    const citations = answer.kind === 'answered' ? answer.citations.map(citation => ({
      ...citation,
      resolves: scanned.get(citation.page)?.sections.some(section => section.id === citation.sectionId) ?? false,
    })) : [];
    results.push({
      questionId: question.id,
      topics: question.topics,
      readerPort: readers.kind,
      kind: answer.kind,
      ...(answer.kind === 'answered' ? { text: answer.text } : { reason: answer.reason }),
      citations,
      attemptedPaths: answer.attemptedPaths.map(path => ({ path, known: scanned.has(path) })),
      // Recorded, never graded here: accuracy and comprehension are a later, separate judgement.
      accuracy: 'not-evaluated' as const,
    });
  }
  return results;
}

// ---------------------------------------------------------------------------
// (d) Coverage per owner topic.

type ReaderResult = Awaited<ReturnType<typeof runReaderTest>>[number];

export function topicCoverage(manifest: DossierManifest, scanned: ReadonlyMap<string, ScannedPage>, questions: readonly ReaderQuestion[], reader: readonly ReaderResult[] | null) {
  return OWNER_TOPICS.map(topic => {
    const declared = manifest.pages.flatMap(page => scanned.get(page.path)!.sections
      .filter(section => section.topics.includes(topic) && section.id !== null)
      .map(section => ({ page: page.path, sectionId: section.id! })));
    const asked = questions.filter(question => question.topics.includes(topic)).map(question => question.id);
    const answeredFrom = reader === null ? [] : reader
      .filter(result => result.topics.includes(topic) && result.kind === 'answered')
      .flatMap(result => result.citations.filter(citation => citation.resolves).map(citation => ({ questionId: result.questionId, page: citation.page, sectionId: citation.sectionId })));
    // A page's own declaration is the generator's assertion. A resolved answer
    // citation names where an answer was found; from a scripted port it is a
    // fixture, never reader evidence, and no citation is graded here.
    const status = answeredFrom.length > 0 ? 'scripted-answer-cited' as const : declared.length > 0 ? 'declared-only' as const : 'unknown' as const;
    return { topic, status, ...(answeredFrom.length > 0 ? { readerPort: 'scripted' as const, accuracy: 'not-evaluated' as const } : {}), declaredBy: declared, questions: asked, answerCitations: answeredFrom };
  });
}
