// Shows that widening LINE_END (RM7, RM11, RM12) changes an LF text's gate decision: each mutant is applied to a copy of the head
// build and two LF texts (no CR anywhere) are scanned. Usage: node widening-probe.mjs <head dist> <scratch dir inside node_modules>
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
const LS = String.fromCharCode(0x2028);
const NEL = String.fromCharCode(0x85);
const S = '<script>x</script>';
const TEXTS = { 'tilde fence around a script, U+2028 line separators': ['~~~', S, '~~~'].join(LS), 'tilde fence around a script, U+0085 line separators': ['~~~', S, '~~~'].join(NEL) };
for (const [id, replacement] of Object.entries(WIDEN)) {
  const dir = join(scratch, `widen-${id}`);
  rmSync(dir, { recursive: true, force: true });
  cpSync(headDist, dir, { recursive: true });
  if (replacement !== null) {
    const p = join(dir, 'markdown-code-context.js');
    const src = readFileSync(p, 'utf8');
    if (src.split(LINE_END).length !== 2) throw new Error('fragment');
    writeFileSync(p, src.replace(LINE_END, () => replacement));
  }
  const { scanActiveContent } = await import(pathToFileURL(join(dir, 'git-object-reader.js')).href);
  for (const [name, text] of Object.entries(TEXTS)) {
    const f = scanActiveContent(text);
    console.log(JSON.stringify({ build: id, text: name, decision: f.length === 0 ? 'admit' : f.map((x) => x.form + (x.context ? ':' + x.context : '')).join(',') }));
  }
  rmSync(dir, { recursive: true, force: true });
}
