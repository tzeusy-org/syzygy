import * as fs from 'node:fs';
import * as path from 'node:path';
import { type QuestionFile } from '@syzygy/polaris-generation-core/live';
import { sha256 } from '@syzygy/support';

/** The hold-out check of the comprehension regression (syzygy-5dhm.134, R29 slice 2): the regression key's questions are never shown to
 * an authoring session, so no text an authoring session is given may carry one. Test support only: nothing in the product imports it.
 *
 * What it checks and what it does not: the 24 question texts and the 81 required facts of the key, by the word window below, in the
 * files the test lists. The historical key is tracked by Syzygy and readable from its checkout mount. This regression checks
 * selected content for accidental reuse. It establishes no blind key custody.
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

/**
 * Read artificial keys from the verifier's explicit lookup and check their digests and counts.
 * Each needle names its subject, list and row. Unwritten references contribute no needles.
 */
export function readHeldOutNeedles(
  lookup: (key: string) => Buffer | undefined,
  file: QuestionFile,
): { readonly needles: KeyQuestion[]; readonly listsRead: number } {
  const needles: KeyQuestion[] = [];
  let listsRead = 0;
  for (const entry of file.heldOut.entries) {
    for (const list of ['graded', 'depth', 'tasks'] as const) {
      const reference = entry[list];
      if (reference.state !== 'frozen') continue;
      const bytes = lookup(reference.key);
      if (bytes === undefined) throw new Error(`held-out ${entry.id}/${list}: the evaluator key is unavailable`);
      if (sha256(bytes) !== reference.sha256) throw new Error(`held-out ${entry.id}/${list}: the key's bytes do not hash to the question file's digest`);
      const key = JSON.parse(bytes.toString('utf8')) as Record<string, unknown>;
      const rows = (name: string, text: string): { id: string; text: string }[] => {
        const value = key[name];
        if (!Array.isArray(value)) throw new Error(`held-out ${entry.id}/${list}: the key holds no ${name} list`);
        return value.map((row: unknown) => {
          const record = row as Record<string, unknown>;
          if (typeof record?.['id'] !== 'string' || typeof record[text] !== 'string') throw new Error(`held-out ${entry.id}/${list}: a row lacks a string id or ${text}`);
          return { id: record['id'], text: record[text] as string };
        });
      };
      const before = needles.length;
      if (list === 'graded') {
        for (const question of rows('questions', 'question')) needles.push({ id: `${entry.id}/graded/${question.id}`, question: question.text });
        for (const fact of readKeyFactsOf(key)) needles.push({ id: `${entry.id}/graded/${fact.id}`, question: fact.question });
        const count = rows('questions', 'question').length;
        if (count !== reference.count || needles.length - before - count !== entry.graded.requiredFacts) throw new Error(`held-out ${entry.id}/graded: the key's counts differ from the question file's`);
      } else {
        const found = list === 'depth' ? rows('depth', 'fact') : rows('tasks', 'task');
        for (const row of found) needles.push({ id: `${entry.id}/${list}/${row.id}`, question: row.text });
        if (found.length !== reference.count) throw new Error(`held-out ${entry.id}/${list}: the key's count differs from the question file's`);
      }
      listsRead += 1;
    }
  }
  return { needles, listsRead };
}

function readKeyFactsOf(key: Record<string, unknown>): KeyQuestion[] {
  const questions = key['questions'];
  if (!Array.isArray(questions)) throw new Error('a graded key holds no questions list');
  return questions.flatMap((question: { readonly id?: unknown; readonly required_facts?: unknown }) => {
    if (typeof question.id !== 'string' || !Array.isArray(question.required_facts)) throw new Error('a graded key question lacks an id or required facts');
    return question.required_facts.map((fact: unknown, index) => {
      if (typeof fact !== 'string') throw new Error('a required fact is not a string');
      return { id: `${question.id}#${index + 1}`, question: fact };
    });
  });
}

/** One packet an authoring-side session is given: its role, its name and its text. */
export interface RolePacket { readonly role: 'author' | 'inventory' | 'editor' | 'scout' | 'reviewer'; readonly packet: string; readonly text: string }

/** The held-out needles each packet carries, as `<role>:<packet>: <needle id>` lines, never the text: a finding names where and which,
 * and repeats nothing held out. A packet's text is also searched with JSON string escaping undone, so a needle serialized into JSON with
 * an escaped character (a quote, a newline) is still found. */
export function heldOutFindings(packets: readonly RolePacket[], needles: readonly KeyQuestion[]): string[] {
  return packets.flatMap(({ role, packet, text }) => {
    const unescaped = text.replace(/\\u([0-9a-fA-F]{4})/gu, (_match, hex: string) => String.fromCharCode(Number.parseInt(hex, 16))).replace(/\\(["\\/bfnrt])/gu, ' ');
    const found = new Set([...heldOutQuestionsIn(text, needles), ...heldOutQuestionsIn(unescaped, needles)]);
    return needles.filter(({ id }) => found.has(id)).map(({ id }) => `${role}:${packet}: ${id}`);
  });
}
