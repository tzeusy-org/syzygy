// Checks the proposed F1 pin against the head build and the three widening mutants (as in widening-probe.mjs).
// Usage: node proposed-pin-check.mjs <head dist> <scratch dir inside node_modules>
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const [headDist, scratch] = process.argv.slice(2);
const BS = '\\';
const LINE_END = 'const LINE_END = /' + BS + 'r' + BS + 'n|' + BS + 'r|' + BS + 'n/g;';
const WIDEN = {
  head: null,
  'RM7-u2028': 'const LINE_END = /' + BS + 'r' + BS + 'n|' + BS + 'r|' + BS + 'n|' + BS + 'u2028/g;',
  'RM11-nel': 'const LINE_END = /' + BS + 'r' + BS + 'n|' + BS + 'r|' + BS + 'n|' + BS + 'x85/g;',
  'RM12-js-set': 'const LINE_END = /' + BS + 'r' + BS + 'n|[' + BS + 'r' + BS + 'n' + BS + 'u2028' + BS + 'u2029]/g;',
};
const SEPS = [0x2028, 0x2029, 0x85].map((c) => String.fromCharCode(c));
const EXPECTED = 'a' + ' '.repeat(7) + 'd';
for (const [id, replacement] of Object.entries(WIDEN)) {
  const dir = join(scratch, `pin-${id}`);
  rmSync(dir, { recursive: true, force: true });
  cpSync(headDist, dir, { recursive: true });
  if (replacement !== null) {
    const p = join(dir, 'markdown-code-context.js');
    writeFileSync(p, readFileSync(p, 'utf8').replace(LINE_END, () => replacement));
  }
  const { maskMarkdownCodeContexts } = await import(pathToFileURL(join(dir, 'markdown-code-context.js')).href);
  const got = SEPS.map((s) => { const m = maskMarkdownCodeContexts('a `b' + s + 'c` d'); return m.kind === 'masked' ? m.masked : m.kind; });
  console.log(JSON.stringify({ build: id, pinPasses: got.every((g) => g === EXPECTED), got }));
  rmSync(dir, { recursive: true, force: true });
}
