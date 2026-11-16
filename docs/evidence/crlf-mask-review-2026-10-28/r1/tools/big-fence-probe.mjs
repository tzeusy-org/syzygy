// Does a fence with many lines make the mask throw (the spread in out.push(...pending))? Base and head, LF and bare CR.
// Usage: node big-fence-probe.mjs <base dist> <head dist> <lines>
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const [b, h, n] = process.argv.slice(2);
const load = async (d) => (await import(pathToFileURL(join(d, 'markdown-code-context.js')).href)).maskMarkdownCodeContexts;
const base = await load(b);
const head = await load(h);
const N = Number(n);
for (const [name, end] of [['LF', String.fromCharCode(10)], ['CRLF', String.fromCharCode(13, 10)], ['CR', String.fromCharCode(13)]]) {
  const text = '```' + end + end.repeat(N) + '```' + end;
  for (const [which, mask] of [['base', base], ['head', head]]) {
    let out;
    try { const m = mask(text); out = m.kind + (m.kind === 'masked' ? ` fences=${m.fences} lengthKept=${m.masked.length === text.length}` : ` ${m.reason}`); } catch (e) { out = `THROWS ${e.constructor.name}: ${e.message}`; }
    console.log(JSON.stringify({ terminator: name, lines: N, bytes: text.length, build: which, out }));
  }
}
