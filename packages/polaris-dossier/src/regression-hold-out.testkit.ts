import * as fs from 'node:fs';
import * as path from 'node:path';

/** The hold-out check of the comprehension regression (syzygy-5dhm.134, R29 slice 2): the regression key's questions are never shown to
 * an authoring session, so no text an authoring session is given may carry one. Test support only: nothing in the product imports it.
 *
 * What it checks and what it does not: the 24 question texts and the 81 required facts of the key, by the word window below, in the
 * files the test lists. It does not check the model answers, and it cannot keep the key from a session: `key.json` is a tracked file
 * of this repository, so it sits in any checkout of it. An authoring session works in the observed repository's clone or copy, never
 * in this checkout, and the check holds only what Syzygy itself hands that session.
 *
 * The predicate, stated so it can be re-run: both texts are lower-cased and every run of characters outside `a-z0-9` becomes one
 * space; a question is found in a text when any `HOLD_OUT_WINDOW` consecutive words of the question (the whole question when it has
 * fewer) occur in the text as whole words in that order. Case, line wrapping, punctuation and markup around the words do not hide a
 * question; a paraphrase does, and a fragment shorter than the window is not a finding. */
export const HOLD_OUT_WINDOW = 8;
export const KEY_PATH = 'docs/evidence/pursuit-2026-11-21b/pilot/key.json';

export const holdOutWords = (text: string): string[] => text.toLowerCase().replace(/[^a-z0-9]+/gu, ' ').trim().split(' ').filter((word) => word !== '');

export interface KeyQuestion { readonly id: string; readonly question: string }

/** The ids of the key questions a text carries, by the predicate above. */
export function heldOutQuestionsIn(text: string, questions: readonly KeyQuestion[]): string[] {
  const haystack = ` ${holdOutWords(text).join(' ')} `;
  const found: string[] = [];
  for (const { id, question } of questions) {
    const words = holdOutWords(question);
    const size = Math.min(HOLD_OUT_WINDOW, words.length);
    if (size === 0) continue;
    for (let start = 0; start + size <= words.length; start++) {
      if (haystack.includes(` ${words.slice(start, start + size).join(' ')} `)) { found.push(id); break; }
    }
  }
  return found;
}

interface KeyRecord { readonly questions: readonly { readonly id: unknown; readonly question: unknown; readonly required_facts: unknown }[] }
const readKey = (root: string): KeyRecord => JSON.parse(fs.readFileSync(path.join(root, KEY_PATH), 'utf8')) as KeyRecord;

/** The regression key's questions, read from the record. */
export function readKeyQuestions(root: string): KeyQuestion[] {
  return readKey(root).questions.map(({ id, question }) => {
    if (typeof id !== 'string' || typeof question !== 'string') throw new Error('the regression key has a question without a string id or text');
    return { id, question };
  });
}

/** The regression key's required facts, each as a text the same predicate searches for; the id is `<question id>#<position from 1>`. */
export function readKeyFacts(root: string): KeyQuestion[] {
  return readKey(root).questions.flatMap(({ id, required_facts: facts }) => {
    if (typeof id !== 'string' || !Array.isArray(facts) || facts.length === 0) throw new Error('the regression key has a question without an id or required facts');
    return facts.map((fact: unknown, index) => {
      if (typeof fact !== 'string') throw new Error(`the regression key's ${id} has a required fact that is not a string`);
      return { id: `${id}#${index + 1}`, question: fact };
    });
  });
}
