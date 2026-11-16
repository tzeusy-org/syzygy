// Evaluate an original and several mutated regexes over a corpus, with the
// JavaScript engine the production code runs on.
// Usage: node regex-differential.mjs < input.json
// Input: {"flags": "i", "original": "<source>", "mutants": [{"id": "...", "source": "..."}], "corpus": ["..."]}
// Output (stdout, JSON): {"originalMatches": n, "mutants": [{"id", "valid", "narrower", "broader", "narrowerWitnesses", "broaderWitnesses"}]}
import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const original = new RegExp(input.original, input.flags);
const expected = input.corpus.map((s) => original.test(s));
const shortest = (list) => [...list].sort((a, b) => a.length - b.length || (a < b ? -1 : 1)).slice(0, 5);
const mutants = input.mutants.map((m) => {
  let re;
  try {
    re = new RegExp(m.source, input.flags);
  } catch (error) {
    return { id: m.id, valid: false, error: String(error.message) };
  }
  const narrower = [];
  const broader = [];
  input.corpus.forEach((s, i) => {
    const got = re.test(s);
    if (expected[i] && !got) narrower.push(s);
    if (!expected[i] && got) broader.push(s);
  });
  return { id: m.id, valid: true, narrower: narrower.length, broader: broader.length, narrowerWitnesses: shortest(narrower), broaderWitnesses: shortest(broader) };
});
console.log(JSON.stringify({ corpus: input.corpus.length, originalMatches: expected.filter(Boolean).length, mutants }));
