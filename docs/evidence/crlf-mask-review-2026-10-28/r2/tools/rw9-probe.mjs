// Does RW9 (LF CR read as one line end) change a gate decision, or only a reported line? Every text of up to four lines over a
// small line alphabet, each line ended by LF, CR or CRLF (the last also by nothing), is scanned by the head build and by a copy with
// RW9 applied; decisions (excluded or not), finding multisets without lines, and full findings are compared.
// Usage: node rw9-probe.mjs <head dist> <node_modules> <scratch, must not exist>
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';
const [headDist, nodeModules, scratch] = process.argv.slice(2);
if (existsSync(scratch)) throw new Error(`${scratch} exists`);
const BS = '\\';
const e = (...p) => p.map((x) => BS + x).join('');
const OLD = `const LINE_END = /${e('r', 'n')}|${e('r')}|${e('n')}/g;`;
const NEW = `const LINE_END = /${e('r', 'n')}|${e('n', 'r')}|${e('r')}|${e('n')}/g;`;
mkdirSync(scratch, { recursive: true });
symlinkSync(nodeModules, join(scratch, 'node_modules'));
const dist = join(scratch, 'dist');
cpSync(headDist, dist, { recursive: true });
const p = join(dist, 'markdown-code-context.js');
const src = readFileSync(p, 'utf8');
if (src.split(OLD).length !== 2) throw new Error('fragment');
writeFileSync(p, src.replace(OLD, () => NEW));
const head = (await import(pathToFileURL(join(headDist, 'git-object-reader.js')).href)).scanActiveContent;
const mut = (await import(pathToFileURL(join(dist, 'git-object-reader.js')).href)).scanActiveContent;
const LINES = ['', '```', '~~~', '<script>x</script>', '`', 'a', '``` x`', '`x`'];
const TERMS = ['\n', '\r', '\r\n'];
const tally = { texts: 0, withLfCr: 0, decisionChanged: 0, formsChanged: 0, onlyLinesChanged: 0, unchanged: 0 };
const examples = [];
const forms = (f) => f.map((x) => `${x.form}${x.context ? ':' + x.context : ''}`).sort();
const rec = (lines, text) => {
  if (lines.length > 0) {
    for (const last of [...TERMS, '']) {
      const t = text + lines[lines.length - 1] + last;
      tally.texts += 1;
      const lfcr = t.includes('\n\r');
      if (lfcr) tally.withLfCr += 1;
      const a = head(t), b = mut(t);
      if ((a.length > 0) !== (b.length > 0)) { tally.decisionChanged += 1; if (examples.length < 5) examples.push({ t, a, b }); }
      else if (!isDeepStrictEqual(forms(a), forms(b))) tally.formsChanged += 1;
      else if (!isDeepStrictEqual(a, b)) { tally.onlyLinesChanged += 1; if (!lfcr) throw new Error('a change without LF CR'); }
      else tally.unchanged += 1;
    }
  }
  if (lines.length === 4) return;
  for (const l of LINES) for (const term of lines.length === 0 ? [''] : TERMS) rec([...lines, l], lines.length === 0 ? '' : text + lines[lines.length - 1] + term);
};
// rec builds text incrementally: text holds every line but the last, each with its terminator.
for (const l of LINES) rec([l], '');
console.log(JSON.stringify({ tally, examples }));
rmSync(scratch, { recursive: true, force: true });
