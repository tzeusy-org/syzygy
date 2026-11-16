// Reported positions at base and head, against the LF form. Usage: node positions-print.mjs <base dist> <head dist>
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const load = async (d) => (await import(pathToFileURL(join(d, 'git-object-reader.js')).href)).scanActiveContent;
const base = await load(process.argv[2]);
const head = await load(process.argv[3]);
const CR = String.fromCharCode(13);
const LF = String.fromCharCode(10);
const S = '<script>x</script>';
const rows = [
  ['bare CR, script-element', ['a', S], CR],
  ['CRLF, script-element', ['a', S], CR + LF],
  ['bare CR, unclosed span', ['a', 'b', '`x'], CR],
  ['CRLF, unclosed span', ['a', 'b', '`x'], CR + LF],
  ['mixed (LF, CR), script-element on line 3', ['a', 'b', S], null],
];
for (const [name, lines, end] of rows) {
  const text = end === null ? lines[0] + LF + lines[1] + CR + lines[2] : lines.join(end);
  const lf = lines.join(LF);
  const f = (xs) => xs.map((x) => `${x.form}${x.context ? ':' + x.context : ''}@${x.line}:${x.column}`).join(',');
  console.log(JSON.stringify({ name, text, base: f(base(text)), head: f(head(text)), lfForm: f(head(lf)) }));
}
