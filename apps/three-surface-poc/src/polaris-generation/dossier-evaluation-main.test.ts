import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';

import { generationAnchorId, gitBlobObjectId, type GenerationSource } from '@syzygy/polaris-generation-core';
import { evaluateDossierDirectory, parseArgs } from './dossier-evaluation-main.js';

const REVISION = 'b'.repeat(40);
const BODY = 'Requests sends HTTP for humans.';
const objectId = gitBlobObjectId(BODY);
const SOURCE: GenerationSource = {
  sourceId: 'readme', repositoryId: 'project:synthetic', revision: REVISION, path: 'README.md', objectId, evaluationId: 'eval-1',
  classificationBasis: 'body', exclusion: { excluded: false }, body: BODY,
  spans: [{ anchorId: generationAnchorId({ repositoryId: 'project:synthetic', revision: REVISION, path: 'README.md', objectId }, 0, 31), start: 0, end: 31, text: BODY }],
};
const INDEX = '<html><body><main data-reading-level="0"><section id="thesis" data-topics="core-ideas"><p data-claim-id="c1" data-epistemic="observed">It is a client. <q data-quote-source="readme" data-quote-start="9" data-quote-end="31">sends HTTP for humans.</q></p></section></main></body></html>';
const DEEP = '<html><body><main data-reading-level="0"><section id="adapters" data-topics="mechanisms"><p data-claim-id="c2" data-epistemic="inferred">Adapters own transport.</p></section></main></body></html>';
const QUESTIONS = JSON.stringify({ format: 'polaris-reader-questions-v1', questions: [{ id: 'q1', topics: ['core-ideas'], text: 'What is it?' }] });


function runDirectory(): { readonly root: string; readonly dossier: string; readonly sources: string; readonly questions: string } {
  const root = tempDir('syzygy-dossier-eval-');
  const dossier = join(root, 'run');
  mkdirSync(join(dossier, 'deep-dives'), { recursive: true });
  writeFileSync(join(dossier, 'dossier.json'), JSON.stringify({ format: 'polaris-dossier-v1', title: 'Synthetic', entryPage: 'index.html', pages: [{ path: 'index.html', depth: 0 }, { path: 'deep-dives/adapters.html', depth: 1 }] }));
  writeFileSync(join(dossier, 'index.html'), INDEX);
  writeFileSync(join(dossier, 'deep-dives', 'adapters.html'), DEEP);
  writeFileSync(join(root, 'sources.json'), JSON.stringify([SOURCE]));
  writeFileSync(join(root, 'questions.json'), QUESTIONS);
  return { root, dossier, sources: join(root, 'sources.json'), questions: join(root, 'questions.json') };
}

const signal = new AbortController().signal;

describe('dossier evaluation over a run directory', () => {
  it('reads the manifest pages, sources and frozen questions and reports all four parts', async () => {
    const run = runDirectory();
    writeFileSync(join(run.root, 'budget.json'), JSON.stringify({ maxFirstLevelWords: 10 }));
    writeFileSync(join(run.root, 'answers.json'), JSON.stringify({ format: 'polaris-scripted-answers-v1', answers: {
      q1: { kind: 'answered', text: 'An HTTP client.', citations: [{ page: 'index.html', sectionId: 'thesis' }], attemptedPaths: ['index.html'] },
    } }));
    // A digest the questions file does not hash to: the freeze must refuse it.
    await expect(evaluateDossierDirectory({ ...run, expectQuestionsSha256: '0'.repeat(64) }, signal)).rejects.toThrow('questions-not-frozen');
    const ok = await evaluateDossierDirectory({ ...run, budget: join(run.root, 'budget.json'), answers: join(run.root, 'answers.json') }, signal);
    expect(ok.readerCost.firstReadingLevel).toMatchObject({ words: 8, wordBudget: { bound: 10, observed: 8, outcome: 'within' } });
    expect(ok.fidelity.quotes.outcome).toBe('all-resolved');
    expect(ok.fidelity.claims.outcome).toBe('all-labelled');
    expect(ok.coverage.find(row => row.topic === 'core-ideas')?.status).toBe('scripted-answer-cited');
    expect(ok.subject.readers?.kind).toBe('scripted');
    expect(ok.subject.budgetSha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(ok.coverage.find(row => row.topic === 'mechanisms')?.status).toBe('declared-only');
    expect(ok.subject.pages.map(page => page.path)).toEqual(['index.html', 'deep-dives/adapters.html']);
    expect(ok.providerCallPerformed).toBe(false);
  });

  it('refuses a page that is a symlink, even to a file inside the directory', async () => {
    const run = runDirectory();
    writeFileSync(join(run.root, 'outside.html'), DEEP);
    rmSync(join(run.dossier, 'deep-dives', 'adapters.html'));
    symlinkSync(join(run.root, 'outside.html'), join(run.dossier, 'deep-dives', 'adapters.html'));
    await expect(evaluateDossierDirectory(run, signal)).rejects.toThrow('page-is-symlink');
  });

  it('refuses a page under a symlinked directory that resolves outside the run directory', async () => {
    const run = runDirectory();
    mkdirSync(join(run.root, 'elsewhere'));
    writeFileSync(join(run.root, 'elsewhere', 'adapters.html'), DEEP);
    rmSync(join(run.dossier, 'deep-dives'), { recursive: true });
    symlinkSync(join(run.root, 'elsewhere'), join(run.dossier, 'deep-dives'));
    await expect(evaluateDossierDirectory(run, signal)).rejects.toThrow('page-outside-run-directory');
  });

  it('refuses a page that is a FIFO rather than a regular file, without blocking on it', async () => {
    const run = runDirectory();
    rmSync(join(run.dossier, 'deep-dives', 'adapters.html'));
    execFileSync('mkfifo', [join(run.dossier, 'deep-dives', 'adapters.html')]);
    await expect(evaluateDossierDirectory(run, signal)).rejects.toThrow('page-not-a-file');
  });

  it('refuses scripted answers in the wrong format', async () => {
    const run = runDirectory();
    writeFileSync(join(run.root, 'answers.json'), JSON.stringify({ answers: {} }));
    await expect(evaluateDossierDirectory({ ...run, answers: join(run.root, 'answers.json') }, signal)).rejects.toThrow('invalid-scripted-answers');
  });

  it('parses only the documented flags, each once, with the three inputs required', () => {
    expect(parseArgs(['--dossier', 'd', '--sources', 's', '--questions', 'q', '--out', 'o'])).toEqual({ dossier: 'd', sources: 's', questions: 'q', out: 'o' });
    expect(parseArgs(['--dossier', 'd', '--sources', 's'])).toBeNull();
    expect(parseArgs(['--dossier', 'd', '--sources', 's', '--questions', 'q', '--model', 'x'])).toBeNull();
    expect(parseArgs(['--dossier', 'd', '--dossier', 'e', '--sources', 's', '--questions', 'q'])).toBeNull();
    expect(parseArgs(['--dossier', '--sources', 's', '--questions', 'q'])).toBeNull();
  });
});
