// Prints the head mask of each edge input, JSON-escaped, with its length check. Usage: node edge-print.mjs <head dist>
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const { maskMarkdownCodeContexts: mask } = await import(pathToFileURL(join(process.argv[2], 'markdown-code-context.js')).href);
const CR = String.fromCharCode(13);
const LF = String.fromCharCode(10);
const HI = String.fromCharCode(0xd800);
const LO = String.fromCharCode(0xdc00);
const EDGE = ['', CR, LF, CR + LF, CR + CR + LF, LF + CR, CR + CR, 'a' + CR, '```' + CR + 'x' + CR + '```' + CR, '```' + CR + LF + '<x>' + CR + LF + '```', HI, LO + '`' + HI + '`' + CR, '`' + HI + CR + LO + '`'];
for (const t of EDGE) {
  const m = mask(t);
  console.log(JSON.stringify(t), '->', JSON.stringify(m), m.kind === 'masked' ? `lengthKept=${m.masked.length === t.length}` : '');
}
