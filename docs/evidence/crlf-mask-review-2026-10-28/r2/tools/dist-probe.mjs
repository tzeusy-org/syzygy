// Round-2 probes over copies of the head build. For each build (the head, and the head with one mutation applied to its dist),
// prints the gate decision and positions of a few LF texts (no CR anywhere), and runs a candidate general pin: for every UTF-16
// code unit other than CR, LF and backtick, the text a, space, backtick, b, <unit>, c, backtick, space, d masks to "a       d".
// Usage: node dist-probe.mjs <head dist> <node_modules> <scratch dir, must not exist>
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const [headDist, nodeModules, scratch] = process.argv.slice(2);
if (existsSync(scratch)) throw new Error(`${scratch} exists`);
const BS = '\\';
const e = (...p) => p.map((x) => BS + x).join('');
const LINE_END = `const LINE_END = /${e('r', 'n')}|${e('r')}|${e('n')}/g;`;
const le = (body) => `const LINE_END = /${body}/g;`;
const [CRLF, CR, LF, LS, PS, NEL, VT, FF] = [e('r', 'n'), e('r'), e('n'), e('u2028'), e('u2029'), e('x85'), e('v'), e('f')];
const CLOSER = '/^ {0,3}(`{3,}|~{3,}) *$/';
const POS = 'if (text.charCodeAt(i) === 10) {';
const BUILDS = {
  head: [],
  'MU17-u2028': [['markdown-code-context.js', LINE_END, le(`${CRLF}|${CR}|${LF}|${LS}`)]],
  'MU18-nel': [['markdown-code-context.js', LINE_END, le(`${CRLF}|${CR}|${LF}|${NEL}`)]],
  'MU19-js-set': [['markdown-code-context.js', LINE_END, le(`${CRLF}|[${CR}${LF}${LS}${PS}]`)]],
  'RW1-u2029': [['markdown-code-context.js', LINE_END, le(`${CRLF}|${CR}|${LF}|${PS}`)]],
  'RW3-vt-ff': [['markdown-code-context.js', LINE_END, le(`${CRLF}|[${CR}${LF}${VT}${FF}]`)]],
  'RW4-splitlines': [['markdown-code-context.js', LINE_END, le(`${CRLF}|[${CR}${LF}${VT}${FF}${e('x1c', 'x1d', 'x1e')}${NEL}${LS}${PS}]`)]],
  'RW5-closer-separators': [['markdown-code-context.js', CLOSER, `/^ {0,3}(\`{3,}|~{3,})[ ${LS}${PS}${NEL}]*$/`]],
  'RW10-positionOf-u2028': [['git-object-reader.js', POS, 'if (text.charCodeAt(i) === 10 || text.charCodeAt(i) === 0x2028) {']],
};
const ch = (n) => String.fromCharCode(n);
const S = '<script>x</script>';
const TEXTS = {
  'tilde fence around a script, lines joined by VT': ['~~~', S, '~~~'].join(ch(0x0b)),
  'tilde fence around a script, lines joined by FF': ['~~~', S, '~~~'].join(ch(0x0c)),
  'a line, then a tilde fence around a script, lines joined by VT': ['x', '~~~', S, '~~~'].join(ch(0x0b)),
  'tilde fence around a script, lines joined by U+001C': ['~~~', S, '~~~'].join(ch(0x1c)),
  'tilde fence around a script, lines joined by U+2029': ['~~~', S, '~~~'].join(ch(0x2029)),
  'LF: closed backtick fence whose closer ends in U+2028, then a script': ['```', 'x', '```' + ch(0x2028), S].join('\n'),
  'LF: backtick fence around a script, closer ends in U+2028': ['```', S, '```' + ch(0x2028)].join('\n'),
  'LF: U+2028 then a script on the same line': 'a' + ch(0x2028) + S,
};
const general = (maskFn) => {
  const misses = [];
  for (let u = 0; u < 0x10000; u += 1) {
    if (u === 10 || u === 13 || u === 0x60) continue;
    const m = maskFn(`a \`b${ch(u)}c\` d`);
    if (m.kind !== 'masked' || m.masked !== 'a       d') misses.push(`U+${u.toString(16).toUpperCase().padStart(4, '0')}`);
  }
  return misses;
};
const enumerated = (maskFn) => [0x2028, 0x2029, 0x85].filter((u) => maskFn(`a \`b${ch(u)}c\` d`).masked !== 'a       d').map((u) => u.toString(16));
mkdirSync(scratch, { recursive: true });
symlinkSync(nodeModules, join(scratch, 'node_modules'));
for (const [id, edits] of Object.entries(BUILDS)) {
  const dir = join(scratch, id, 'dist');
  cpSync(headDist, dir, { recursive: true });
  for (const [file, oldText, newText] of edits) {
    const p = join(dir, file);
    const src = readFileSync(p, 'utf8');
    if (src.split(oldText).length !== 2) throw new Error(`${id}: fragment not once in ${file}`);
    const { writeFileSync } = await import('node:fs');
    writeFileSync(p, src.replace(oldText, () => newText));
  }
  const { scanActiveContent } = await import(pathToFileURL(join(dir, 'git-object-reader.js')).href);
  const { maskMarkdownCodeContexts } = await import(pathToFileURL(join(dir, 'markdown-code-context.js')).href);
  for (const [name, text] of Object.entries(TEXTS)) {
    const f = scanActiveContent(text);
    console.log(JSON.stringify({ build: id, text: name, decision: f.length === 0 ? 'admit' : f.map((x) => `${x.form}${x.context ? ':' + x.context : ''}@${x.line}:${x.column}`).join(',') }));
  }
  const misses = general(maskMarkdownCodeContexts);
  console.log(JSON.stringify({ build: id, enumeratedPinFailsAt: enumerated(maskMarkdownCodeContexts), generalPinMisses: misses.length, firstMisses: misses.slice(0, 8) }));
}
rmSync(scratch, { recursive: true, force: true });
