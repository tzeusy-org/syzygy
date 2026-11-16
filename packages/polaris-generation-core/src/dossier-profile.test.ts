import { describe, expect, it, vi } from 'vitest';

import { OWNER_TOPICS, parseReaderQuestions } from './dossier-evaluation.js';
import { clarify, DOSSIER_READER_QUESTIONS, OWNER_ANSWER_MAX_CHARS, OWNER_PROVENANCE_MAX_CHARS, DOSSIER_REQUESTED_ASSETS, dossierQuestionsFile, openQuestions, type ClarificationQuestion, type OwnerAnswer } from './dossier-profile.js';
import { generationSourcesForBody, gitBlobObjectId, type GenerationSource } from './generation-source.js';
import { validateRequestedAssets } from './provider-draft.js';
import { READER_QUESTION_TOPICS, validateReaderQuestions } from './reader-questions.js';

const file = (path: string): GenerationSource => generationSourcesForBody({ sourceId: `s-${path.replace(/[^A-Za-z0-9]/gu, '_')}`, repositoryId: 'repository:fixture',
  revision: 'a'.repeat(40), path, objectId: gitBlobObjectId('x\n'), evaluationId: 'e', body: 'x\n' })[0]!;
const deferredRow = (path: string): GenerationSource => { const { body: _b, spans: _s, ...rest } = file(path); return { ...rest, exclusion: { excluded: true, reason: 'deferred-by-budget' }, spans: [] }; };
const answer = (id: OwnerAnswer['id'], text: unknown = 'a purpose'): OwnerAnswer => ({ id, answer: text, attribution: 'owner', revision: 'r1', permittedDraftUse: true });
/** CPU time so far: this thread's (`process.threadCpuUsage`, Node 23.9 and later) or, where `process.threadCpuUsage` is absent
 * (Node before 23.9), the whole process's (`process.cpuUsage`), which also counts the worker's other threads; each bound keeps
 * its 10x margins under both (docs/evidence/syzygy-bpyt-4-5/cpu-separation-node22.json). */
const cpuUsage = (from?: NodeJS.CpuUsage): NodeJS.CpuUsage =>
  (typeof process.threadCpuUsage === 'function' ? process.threadCpuUsage(from) : process.cpuUsage(from));
/** CPU milliseconds spent since `from`: the work done, which neither load on the host nor the pool running the file stretches. */
const cpuMsSince = (from: NodeJS.CpuUsage): number => { const { user, system } = cpuUsage(from); return (user + system) / 1000; };
// A CPU-time bound sits at least 10x from the slowest head run of its region and from the fastest run of the quadratic
// mutant it names (docs/evidence/syzygy-bpyt-4-5/cpu-separation.json, syzygy-bpyt.4.5). Each was set at the geometric
// mean of the two at 3fc3709f and is kept, not refitted to each re-measurement, while both margins hold.
const EDGE_TRIM_CPU_MS = 1_900; // the backtracking edge trim before d7e25daf

describe('dossier profile', () => {
  it('exports the five questions as {id, topics, text} matching the owner topics and the frozen file shape', () => {
    expect(DOSSIER_READER_QUESTIONS.map(question => question.id)).toEqual([...READER_QUESTION_TOPICS]);
    expect(DOSSIER_READER_QUESTIONS.every(question => question.topics.length === 1 && question.topics[0] === question.id)).toBe(true);
    const text = DOSSIER_READER_QUESTIONS.map(question => question.text).join(' ');
    for (const phrase of ['core ideas', 'end-to-end', 'mechanisms', 'maintainers themselves claim', 'trade-offs']) expect(text).toContain(phrase);
    const file = JSON.parse(dossierQuestionsFile());
    expect(file.format).toBe('polaris-reader-questions-v1');
    expect(validateReaderQuestions(file.questions)).toEqual(DOSSIER_READER_QUESTIONS);
    expect(parseReaderQuestions(dossierQuestionsFile())).toEqual(DOSSIER_READER_QUESTIONS);
  });

  it('takes its topic list from the evaluator, not a copy', () => {
    expect(READER_QUESTION_TOPICS).toBe(OWNER_TOPICS);
  });

  it('requests one required section per question, with ids matching the topics', () => {
    expect(validateRequestedAssets([...DOSSIER_REQUESTED_ASSETS])).toHaveLength(DOSSIER_REQUESTED_ASSETS.length);
    expect(DOSSIER_REQUESTED_ASSETS.filter(asset => asset.required).map(asset => asset.id)).toEqual([...READER_QUESTION_TOPICS]);
  });
});

describe('REQ-031 clarification', () => {
  const mechanicsOnly = [file('src/server.c'), file('src/db.c')];

  it('finds purpose, audience and scope gaps from the population, each with a content digest', () => {
    expect(openQuestions(mechanicsOnly).map(q => q.id)).toEqual(['purpose', 'audience']);
    expect(openQuestions([...mechanicsOnly, file('README.md')], true)).toEqual([]);
    const scope = openQuestions([...mechanicsOnly, file('docs/overview.md'), deferredRow('src/x.c'), deferredRow('src/y.c')], true);
    expect(scope.map(q => q.id)).toEqual(['scope']);
    expect(scope[0]!.contentDigest).toMatch(/^[0-9a-f]{64}$/u);
    expect(openQuestions([file('README.md'), deferredRow('src/x.c')], true)[0]!.question).toContain('1 file(s)');
  });

  // Expected values: SHA-256 of JSON.stringify([id, question, scope, reason]) for each question, typed here from the question text above
  // and taken with hashlib (docs/evidence/syzygy-bpyt-6-13/derive-literals.py). The digest is the identity a prior disposition carries
  // between passes, so a change to the tuple or its order moves it (class 3; review R-GP-IMPL-SUPPORT-LEAF-1 N2, mutant R3).
  it('digests each question by the exact tuple of its id, text, scope and reason', () => {
    expect(openQuestions(mechanicsOnly).map(q => [q.id, q.contentDigest])).toEqual([
      ['purpose', '57dd4d0707afa807a435bea0758bd4ac0a6e95c854b636b8b562556eba6ec2c6'],
      ['audience', 'a3e9d7308d9fb44eaabca2d484b5a9a5e58ac6bbe6435f31d9dc231510f37e5e'],
    ]);
    const scope = openQuestions([...mechanicsOnly, file('docs/overview.md'), deferredRow('src/x.c'), deferredRow('src/y.c')], true);
    expect(scope.map(q => [q.id, q.contentDigest])).toEqual([['scope', '8c1a2eaa83b70cdc42cb42559da868f6737aef974fe248f3c64a11dd9335a5b2']]);
  });

  it('zero-interaction mode asks nothing, records what it would have asked, and accounts for every question', async () => {
    const ask = vi.fn();
    const record = await clarify({ sources: mechanicsOnly, mode: 'zero-interaction', ask });
    expect(ask).not.toHaveBeenCalled();
    expect(record.wouldHaveAsked.map(q => q.id)).toEqual(['purpose', 'audience']);
    expect(record.wouldHaveAsked[0]).toMatchObject({ scope: expect.any(String), reason: expect.any(String) });
    expect(record.limitations).toHaveLength(2);
    expect(record.limitations[0]).toContain('no mission is asserted');
    expect(record.limitations[1]).toContain('remains unestablished');
    expect(record).toMatchObject({ answers: [], unaccountedQuestions: 0, mode: 'zero-interaction' });
  });

  it('measures unaccounted questions rather than asserting zero', async () => {
    const record = await clarify({ sources: mechanicsOnly, mode: 'zero-interaction' });
    const open = openQuestions(mechanicsOnly);
    expect(record.limitations.length + record.answers.length).toBe(open.length);
    expect(record.unaccountedQuestions).toBe(0);
  });

  it('stops at the question budget and does not repeat an unchanged deferred question', async () => {
    const sources = [...mechanicsOnly, deferredRow('src/x.c')];
    const [purpose] = openQuestions(sources);
    const record = await clarify({ sources, mode: 'zero-interaction', maxQuestions: 1, prior: [{ id: 'purpose', contentDigest: purpose!.contentDigest, disposition: 'deferred' }] });
    expect(record.suppressedAsRepeats).toEqual(['purpose']);
    expect(record.wouldHaveAsked.map(q => q.id)).toEqual(['audience']);
    expect(record.suppressedByBudget).toEqual(['scope']);
    expect(record.limitations).toHaveLength(3);
  });

  it('asks a deferred question again when its material content changed', async () => {
    const before = [...mechanicsOnly, deferredRow('src/x.c')];
    const after = [...mechanicsOnly, deferredRow('src/x.c'), deferredRow('src/y.c')];
    const scopeBefore = openQuestions(before).find(q => q.id === 'scope')!;
    const record = await clarify({ sources: after, mode: 'zero-interaction', maxQuestions: 5, prior: [{ id: 'scope', contentDigest: scopeBefore.contentDigest, disposition: 'deferred' }] });
    expect(record.reaskedAfterChange).toEqual(['scope']);
    expect(record.wouldHaveAsked.map(q => q.id)).toContain('scope');
    expect(record.suppressedAsRepeats).toEqual([]);
  });

  it('reuses an unchanged answered question without asking and records it as reused', async () => {
    const [purpose] = openQuestions(mechanicsOnly);
    const ask = vi.fn(async (q: ClarificationQuestion) => answer(q.id as 'audience', 'engineers'));
    const record = await clarify({ sources: mechanicsOnly, mode: 'interactive', ask,
      prior: [{ id: 'purpose', contentDigest: purpose!.contentDigest, disposition: 'answered', answer: 'cache', attribution: 'owner', revision: 'r0' }] });
    expect(ask.mock.calls.map(call => call[0].id)).toEqual(['audience']);
    expect(record.answers[0]).toMatchObject({ id: 'purpose', answer: 'cache', reused: true, adopted: false });
    expect(record.limitations).toEqual([]);
    expect(record.dispositions.map(d => `${d.id}:${d.disposition}`)).toEqual(['purpose:answered', 'audience:answered']);
  });

  it('does not reuse a prior answered disposition that would fail a live reply: it is asked again or carried as a limitation', async () => {
    const [purpose] = openQuestions(mechanicsOnly);
    const good = { id: 'purpose' as const, contentDigest: purpose!.contentDigest, disposition: 'answered' as const, answer: 'cache', attribution: 'owner', revision: 'r0' };
    const bad: Record<string, unknown>[] = [{ answer: '' }, { answer: '   ' }, { answer: 'unknown' }, { answer: 'UNKNOWN' }, { answer: ' Unknown \n' }, { answer: 42 }, { answer: undefined },
      { attribution: '' }, { attribution: '  ' }, { attribution: undefined }, { revision: '' }, { revision: '\t' }, { revision: undefined }, { answer: 'x'.repeat(OWNER_ANSWER_MAX_CHARS + 1) },
      { answer: '\u200b' }, { answer: '\u200b \u2003\ufeff' }, { answer: '\u200bunknown\u200b' }, { attribution: '\u200b' }, { revision: '\u2060\u00a0' },
      { attribution: 'o'.repeat(OWNER_PROVENANCE_MAX_CHARS + 1) }, { revision: 'r'.repeat(OWNER_PROVENANCE_MAX_CHARS + 1) }];
    for (const change of bad) {
      const record = await clarify({ sources: mechanicsOnly, mode: 'zero-interaction', prior: [{ ...good, ...change } as never] });
      expect(record.answers, JSON.stringify(change).slice(0, 50)).toEqual([]);
      expect(record.wouldHaveAsked.map(q => q.id)).toContain('purpose');
      expect(record.limitations.some(text => text.includes('no mission is asserted'))).toBe(true);
    }
    const ok = await clarify({ sources: mechanicsOnly, mode: 'zero-interaction', prior: [{ ...good, answer: '  cache  ', attribution: ' owner ', revision: ' r0 ' }] });
    expect(ok.answers[0]).toMatchObject({ id: 'purpose', answer: 'cache', attribution: 'owner', revision: 'r0', reused: true });
    const edge = await clarify({ sources: mechanicsOnly, mode: 'zero-interaction', prior: [{ ...good, answer: 'x'.repeat(OWNER_ANSWER_MAX_CHARS) }] });
    expect(edge.answers).toHaveLength(1);
  });

  it('treats unknown in any case as unknown, trims attribution and revision, rejects blank ones and bounds the answer', async () => {
    for (const text of ['Unknown', 'UNKNOWN', '  uNkNoWn  ']) {
      const record = await clarify({ sources: [...mechanicsOnly, file('README.md')], mode: 'interactive', maxQuestions: 1, ask: async q => ({ ...answer(q.id), answer: text }) });
      expect(record.answers[0], text).toMatchObject({ disposition: 'unknown', answer: null });
    }
    for (const change of [{ attribution: '' }, { attribution: '  ' }, { revision: '' }, { revision: ' \t' }, { attribution: 7 }, { revision: null }]) {
      const record = await clarify({ sources: mechanicsOnly, mode: 'interactive', ask: async q => ({ ...answer(q.id), ...change }) as never });
      expect(record.aborted, JSON.stringify(change)).toEqual({ id: 'purpose', reason: 'invalid-owner-answer' });
      expect(record.answers).toEqual([]);
    }
    const trimmed = await clarify({ sources: mechanicsOnly, mode: 'interactive', maxQuestions: 1, ask: async q => ({ ...answer(q.id), attribution: ' owner ', revision: ' r1 ' }) });
    expect(trimmed.answers[0]).toMatchObject({ attribution: 'owner', revision: 'r1' });
    const long = await clarify({ sources: mechanicsOnly, mode: 'interactive', maxQuestions: 1, ask: async q => answer(q.id, 'x'.repeat(OWNER_ANSWER_MAX_CHARS + 1)) });
    expect(long.aborted).toEqual({ id: 'purpose', reason: 'invalid-owner-answer' });
    const exact = await clarify({ sources: mechanicsOnly, mode: 'interactive', maxQuestions: 1, ask: async q => answer(q.id, 'x'.repeat(OWNER_ANSWER_MAX_CHARS)) });
    expect(exact.answers[0]).toMatchObject({ disposition: 'answered' });
  });

  it('treats zero-width and separator-only text as blank, bounds attribution and revision, and refuses a malformed prior', async () => {
    for (const change of [{ answer: '\u200b' }, { answer: '\u200bUNKNOWN\u2003' }, { attribution: '\u200b\u200d' }, { revision: '\u2028' },
      { attribution: 'o'.repeat(OWNER_PROVENANCE_MAX_CHARS + 1) }, { revision: 'r'.repeat(OWNER_PROVENANCE_MAX_CHARS + 1) }]) {
      const record = await clarify({ sources: mechanicsOnly, mode: 'interactive', maxQuestions: 1, ask: async q => ({ ...answer(q.id), ...change }) as never });
      const blankAnswer = 'answer' in change;
      if (blankAnswer) expect(record.answers[0], JSON.stringify(change)).toMatchObject({ disposition: 'unknown', answer: null });
      else expect(record.aborted, JSON.stringify(change)).toEqual({ id: 'purpose', reason: 'invalid-owner-answer' });
    }
    const exact = await clarify({ sources: mechanicsOnly, mode: 'interactive', maxQuestions: 1,
      ask: async q => ({ ...answer(q.id), attribution: 'o'.repeat(OWNER_PROVENANCE_MAX_CHARS), revision: '\u200br'.repeat(1) }) });
    expect(exact.answers[0]).toMatchObject({ disposition: 'answered', revision: 'r' });
    const [purpose] = openQuestions(mechanicsOnly);
    const entry = { id: 'purpose', contentDigest: purpose!.contentDigest, disposition: 'deferred' };
    for (const prior of [{}, 'x', [null], [7], [{ ...entry, id: 7 }], [{ ...entry, contentDigest: undefined }], [{ ...entry, disposition: 'maybe' }],
      [entry, entry], [{ ...entry, attribution: 7 }], [{ ...entry, revision: {} }]]) {
      await expect(clarify({ sources: mechanicsOnly, mode: 'zero-interaction', prior: prior as never }), JSON.stringify(prior)).rejects.toThrow('invalid-prior-dispositions');
    }
    await expect(clarify({ sources: mechanicsOnly, mode: 'zero-interaction', prior: [entry] as never })).resolves.toMatchObject({ suppressedAsRepeats: ['purpose'] });
  });

  it('counts default-ignorable and zero-width-split text as blank or unknown, and trims a long run of spaces in linear time', async () => {
    for (const text of ['\u0600', '\u3164', '\u2800', '\u034f', '\u115f', '\u200b\u3164\u2800', 'un\u200bknown', 'UN\u2060KNOWN', 'unk\u034fnown\u3164']) {
      const record = await clarify({ sources: mechanicsOnly, mode: 'interactive', maxQuestions: 1, ask: async q => ({ ...answer(q.id), answer: text }) });
      expect(record.answers[0], JSON.stringify(text)).toMatchObject({ disposition: 'unknown', answer: null });
    }
    const spaced = await clarify({ sources: mechanicsOnly, mode: 'interactive', maxQuestions: 1, ask: async q => ({ ...answer(q.id), answer: `${' '.repeat(50_000)}cache${' '.repeat(50_000)}` }) });
    expect(spaced.answers[0]).toMatchObject({ disposition: 'answered' });
    // Each filler goes in as a blank attribution and as a blank run between visible characters, the shape a
    // backtracking edge trim takes quadratic time on.
    const cpu = cpuUsage();
    for (const filler of [' ', '\u200b', '\u3164', '\t \u2003']) {
      for (const attribution of [filler.repeat(40_000), `a${filler.repeat(40_000)}b`]) {
        const blank = await clarify({ sources: mechanicsOnly, mode: 'interactive', maxQuestions: 1, ask: async q => ({ ...answer(q.id), answer: `${filler.repeat(40_000)}x`.slice(0, 40_000), attribution }) });
        expect(blank.aborted).toEqual({ id: 'purpose', reason: 'invalid-owner-answer' });
      }
    }
    expect(cpuMsSince(cpu)).toBeLessThan(EDGE_TRIM_CPU_MS);
  });

  it('records an owner answer with attribution without adopting it, and keeps a declined one as a limitation', async () => {
    const asked: string[] = [];
    const ask = async (q: { id: OwnerAnswer['id'] }): Promise<OwnerAnswer> => { asked.push(q.id); return q.id === 'purpose' ? answer('purpose') : answer('audience', 'unknown'); };
    const record = await clarify({ sources: mechanicsOnly, mode: 'interactive', ask });
    expect(asked).toEqual(['purpose', 'audience']);
    expect(record.answers).toMatchObject([{ id: 'purpose', disposition: 'answered', answer: 'a purpose', adopted: false }, { id: 'audience', disposition: 'unknown', answer: null }]);
    expect(record.limitations).toEqual([expect.stringContaining('intended reader')]);
    expect(record.wouldHaveAsked).toEqual([]);
  });

  it('treats an empty, blank or non-string answer as unknown, never as resolving the question', async () => {
    for (const text of ['', '   ', 42, null, undefined, {}, '  unknown ']) {
      const record = await clarify({ sources: [...mechanicsOnly, file('README.md')], mode: 'interactive', maxQuestions: 1, ask: async q => ({ ...answer(q.id), answer: text }) });
      expect(record.answers[0], String(text)).toMatchObject({ id: 'audience', disposition: 'unknown', answer: null });
      expect(record.limitations).toHaveLength(1);
    }
    const trimmed = await clarify({ sources: [...mechanicsOnly, file('README.md')], mode: 'interactive', ask: async q => answer(q.id, '  engineers  ') });
    expect(trimmed.answers[0]).toMatchObject({ answer: 'engineers', disposition: 'answered' });
  });

  it('redacts an answer the owner did not permit for draft use and keeps only the limitation', async () => {
    const record = await clarify({ sources: [...mechanicsOnly, file('README.md')], mode: 'interactive', ask: async q => ({ ...answer(q.id, 'SECRET-AUDIENCE'), permittedDraftUse: false }) });
    expect(record.answers[0]).toMatchObject({ id: 'audience', disposition: 'redacted', answer: null, permittedDraftUse: false });
    expect(JSON.stringify(record)).not.toContain('SECRET-AUDIENCE');
    expect(record.limitations).toHaveLength(1);
    expect(record.dispositions[0]).toMatchObject({ disposition: 'redacted' });
    expect(record.dispositions[0]).not.toHaveProperty('answer');
  });

  it('keeps earlier answers when a later reply is bad, and carries the rest as limitations', async () => {
    let n = 0;
    const record = await clarify({ sources: mechanicsOnly, mode: 'interactive', maxQuestions: 3,
      ask: async q => (n++ === 0 ? answer(q.id) : { ...answer(q.id), attribution: '' }) });
    expect(record.answers).toHaveLength(1);
    expect(record.answers[0]).toMatchObject({ id: 'purpose', answer: 'a purpose' });
    expect(record.aborted).toEqual({ id: 'audience', reason: 'invalid-owner-answer' });
    expect(record.limitations).toEqual([expect.stringContaining('intended reader')]);
    const thrown = await clarify({ sources: mechanicsOnly, mode: 'interactive', ask: async () => { throw new Error('port down'); } });
    expect(thrown.aborted).toEqual({ id: 'purpose', reason: 'port down' });
    expect(thrown.limitations).toHaveLength(2);
    expect(thrown.unaccountedQuestions).toBe(0);
  });

  it('rejects a reply whose permittedDraftUse is not a boolean', async () => {
    const record = await clarify({ sources: mechanicsOnly, mode: 'interactive', ask: async q => ({ ...answer(q.id), permittedDraftUse: 'yes' as unknown as boolean }) });
    expect(record.answers).toEqual([]);
    expect(record.aborted).toEqual({ id: 'purpose', reason: 'invalid-owner-answer' });
  });

  it('refuses interactive mode without a port, a mismatched id and a bad budget', async () => {
    await expect(clarify({ sources: mechanicsOnly, mode: 'interactive' })).rejects.toThrow('owner-port');
    const mismatch = await clarify({ sources: mechanicsOnly, mode: 'interactive', ask: async () => answer('scope') });
    expect(mismatch.aborted).toMatchObject({ id: 'purpose', reason: 'invalid-owner-answer' });
    await expect(clarify({ sources: mechanicsOnly, mode: 'zero-interaction', maxQuestions: -1 })).rejects.toThrow('invalid-question-budget');
  });
});
