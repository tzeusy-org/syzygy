import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BRIEF_TOPICS, DOSSIER_GUIDANCE, QUOTATION_RULE, READABILITY_GUIDANCE, REVIEW_REACH_RULE, VOICE_RULES } from './brief.js';
import { HOLD_OUT_WINDOW, heldOutQuestionsIn, holdOutWords, readKeyFacts, readKeyQuestions } from './regression-hold-out.testkit.js';

/** The regression's hold-out (syzygy-5dhm.134, R29 slice 2): no text an authoring session is given carries a question of the
 * regression key. The first such check in the tree: R1 slice 1's had not landed when this was written, so this is the minimal one
 * (the brief's sources and the installed agent texts, by word window; see the testkit for the predicate). The rendered brief of a
 * fixture run is checked in brief.test.ts, where its fixtures live. Expected values are literals.
 *
 * It searches for the key's 24 question texts and 81 required facts, not its model answers, and it does not keep `key.json` out of
 * anyone's reach: the key is a tracked file of this repository (see the testkit). */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const QUESTIONS = readKeyQuestions(ROOT);
const FACTS = readKeyFacts(ROOT);

/** Every file under `relative`, as repository-relative POSIX paths; a missing root is an error, never an empty population. */
function filesUnder(relative: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const child = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(child);
      else if (entry.isFile()) out.push(child);
    }
  };
  walk(relative);
  return out.sort();
}

/** Every kind of file under the walked roots, by the longest suffix listed here, and whether it is searched. `searched` is anything
 * a session could be handed or a product module could load as text; `test-support` is never built into the product
 * (`product-build.test.ts` pins that) and holds this check's own planted questions. A file of no listed kind fails the test: a new
 * kind of file is classified here before it can sit unsearched. */
const FILE_KINDS: Readonly<Record<string, 'searched' | 'test-support'>> = {
  '.test.ts': 'test-support',
  '.test.c': 'test-support',
  '.testkit.ts': 'test-support',
  '.ts': 'searched',
  '.c': 'searched',
  '.h': 'searched',
  '.json': 'searched',
  '.md': 'searched',
};
const kindOf = (file: string): 'searched' | 'test-support' | 'unclassified' =>
  FILE_KINDS[Object.keys(FILE_KINDS).find((suffix) => file.endsWith(suffix)) ?? ''] ?? 'unclassified';

/** What an authoring session can be handed: the dossier package's sources (the brief, the packets and every string or data file they
 * are built from), the provider mode's generation sources, the installed agent texts and the authoring kit. */
const WALKED: readonly string[] = [
  ...filesUnder('packages/polaris-dossier/src'),
  'packages/polaris-dossier/README.md',
  ...filesUnder('apps/three-surface-poc/src/polaris-generation'),
  ...filesUnder('.claude/skills/polaris-dossier'),
  ...filesUnder('.codex/skills/polaris-dossier'),
  ...filesUnder('docs/polaris-generation'),
];
const POPULATION: readonly string[] = WALKED.filter((file) => kindOf(file) === 'searched');
const BRIEF_FIXTURE = [...BRIEF_TOPICS.map((topic) => topic.text), DOSSIER_GUIDANCE, ...READABILITY_GUIDANCE, ...VOICE_RULES, QUOTATION_RULE, REVIEW_REACH_RULE].join('\n\n');

describe('the regression key is held out of authoring text', () => {
  it('reads the 24 questions of the key', () => {
    expect(QUESTIONS).toHaveLength(24);
    expect(QUESTIONS[0]).toEqual({ id: 'Q01', question: 'What is Redis, where does it keep its data, and what kinds of application problems is it meant to solve?' });
    expect(Math.min(...QUESTIONS.map(({ question }) => holdOutWords(question).length))).toBe(20);
    expect(HOLD_OUT_WINDOW).toBe(8);
  });

  it('reads the 81 required facts of the key, none shorter than the window', () => {
    expect(FACTS).toHaveLength(81);
    expect(new Set(FACTS.map(({ id }) => id)).size).toBe(81);
    expect(FACTS[0]?.id).toBe('Q01#1');
    expect(new Set(FACTS.map(({ id }) => id.split('#')[0])).size).toBe(24);
    // No fact is shorter than the window, so every one is searched for by 8 consecutive words and none by a short whole phrase.
    expect(Math.min(...FACTS.map(({ question }) => holdOutWords(question).length))).toBe(8);
  });

  it('classifies every file under the walked roots, so none sits unsearched by its kind', () => {
    expect(WALKED.filter((file) => kindOf(file) === 'unclassified')).toEqual([]);
    expect(kindOf('packages/polaris-dossier/src/brief.ts')).toBe('searched');
    expect(kindOf('packages/polaris-dossier/src/brief.test.ts')).toBe('test-support');
    expect(kindOf('packages/polaris-dossier/src/launch.testkit.ts')).toBe('test-support');
    expect(kindOf('packages/polaris-dossier/src/session-peer.c')).toBe('searched');
    expect(kindOf('packages/polaris-dossier/src/policy-git-protocol.h')).toBe('searched');
    expect(kindOf('packages/polaris-dossier/src/session-peer-lifetime.test.c')).toBe('test-support');
    expect(kindOf('packages/polaris-dossier/src/shape-packs/default.json')).toBe('searched');
    expect(kindOf('packages/polaris-dossier/src/notes.txt')).toBe('unclassified');
    expect(kindOf('packages/polaris-dossier/src/render.css')).toBe('unclassified');
    expect(kindOf('packages/polaris-dossier/src/Makefile')).toBe('unclassified');
    // The searched files and the test support are the whole walk: nothing is dropped by a filter that names no kind.
    expect(POPULATION.length + WALKED.filter((file) => kindOf(file) === 'test-support').length).toBe(WALKED.length);
    expect(new Set(WALKED).size).toBe(WALKED.length);
  });

  it('finds no key question in any brief source, agent text or authoring guide', () => {
    for (const required of ['packages/polaris-dossier/src/brief.ts', 'packages/polaris-dossier/src/review-packet.ts', 'packages/polaris-dossier/src/shape-packs/default.json',
      'packages/polaris-dossier/src/policy-git-protocol.h',
      'packages/polaris-dossier/README.md', 'apps/three-surface-poc/src/polaris-generation/dossier-render.ts', '.claude/skills/polaris-dossier/SKILL.md',
      '.codex/skills/polaris-dossier/SKILL.md', 'docs/polaris-generation/AUTHORING.md']) expect(POPULATION).toContain(required);
    expect(POPULATION.filter((file) => file.includes('.test.') || file.includes('.testkit.'))).toEqual([]);
    const hits = POPULATION.flatMap((file) => heldOutQuestionsIn(fs.readFileSync(path.join(ROOT, file), 'utf8'), QUESTIONS).map((id) => `${file}: ${id}`));
    expect(hits).toEqual([]);
  });

  it('finds no required fact of the key in the same files, and finds one once it is put in a text', () => {
    const hits = POPULATION.flatMap((file) => heldOutQuestionsIn(fs.readFileSync(path.join(ROOT, file), 'utf8'), FACTS).map((id) => `${file}: ${id}`));
    expect(hits).toEqual([]);
    expect(heldOutQuestionsIn(BRIEF_FIXTURE, FACTS)).toEqual([]);
    for (const { id, question } of FACTS) expect(heldOutQuestionsIn(`${BRIEF_FIXTURE}\n- ${question}\n`, FACTS)).toEqual([id]);
  });

  it('finds none in the brief fixture, and refuses the fixture once one key question is put in it', () => {
    expect(BRIEF_FIXTURE.length).toBeGreaterThan(5000);
    expect(heldOutQuestionsIn(BRIEF_FIXTURE, QUESTIONS)).toEqual([]);
    const literal = 'What is Redis, where does it keep its data, and what kinds of application problems is it meant to solve?';
    expect(heldOutQuestionsIn(`${BRIEF_FIXTURE}\n\nReader question: ${literal}\n`, QUESTIONS)).toEqual(['Q01']);
    // Every one of the 24, not only the first.
    for (const { id, question } of QUESTIONS) expect(heldOutQuestionsIn(`${BRIEF_FIXTURE}\n${question}`, QUESTIONS)).toEqual([id]);
  });

  it('is not hidden by case, wrapping, punctuation or markup, and reads a short fragment as no finding', () => {
    const disguised = ['WHAT IS REDIS; where does it\n   keep its **data** and what kinds', 'of application problems'].join('\n');
    expect(heldOutQuestionsIn(disguised, QUESTIONS)).toEqual(['Q01']);
    expect(heldOutQuestionsIn('- where does it keep its data, and what kinds of application problems', QUESTIONS)).toEqual(['Q01']);
    // Seven consecutive words of the question: under the window.
    expect(heldOutQuestionsIn('What is Redis, where does it keep', QUESTIONS)).toEqual([]);
    // Eight of its words in another order, and the same words run together with others, are not the question.
    expect(heldOutQuestionsIn('Redis is what, where it does keep its data', QUESTIONS)).toEqual([]);
    expect(heldOutQuestionsIn('whatever is Redis, where does it keep its database', QUESTIONS)).toEqual([]);
    expect(heldOutQuestionsIn('', QUESTIONS)).toEqual([]);
  });
});
