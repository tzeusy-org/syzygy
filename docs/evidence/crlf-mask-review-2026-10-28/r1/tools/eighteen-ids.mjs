// Method 2 for the 18 case ids: compute the LF profile and extraction vectors live from the head build over fence-probe.mjs's 33
// cases (a second source for the case lines), and keep the cases read as well formed where the two vectors agree.
// Usage: node eighteen-ids.mjs <head dist> <fence-probe.mjs>
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const [dist, probe] = process.argv.slice(2);
const core = await import(pathToFileURL(join(dist, 'index.js')).href);
const src = readFileSync(probe, 'utf8');
const start = src.indexOf('const CASES = [');
const end = src.indexOf('\n];', start);
const B = '```';
const T = '~~~';
const CASES = new Function('B', 'T', 'return ' + src.slice(start + 'const CASES = '.length, end + 2) + ';')(B, T);
const LF = String.fromCharCode(10);
const PROBE = '## PROBE [p](probe.md)';
const joined = (lines) => lines.map((l) => l + LF).join('');
const profile = (text, k) => { const m = core.maskMarkdownCodeContexts(text); return m.kind === 'malformed' ? 'M' : (m.masked.split(LF)[k] ?? '') === PROBE ? 'V' : 'H'; };
const extraction = (text) => { const r = core.extractClass('project-account-section', 'architecture.md', text); return r.kind === 'items' && r.items.some((i) => (i.statement ?? '').includes('PROBE')) ? 'V' : 'H'; };
const vector = (read, lines) => { let o = ''; for (let k = 0; k <= lines.length; k += 1) o += read(joined([...lines.slice(0, k), PROBE, ...lines.slice(k)]), k); return o; };
const agree = [];
for (const [id, , lines] of CASES) {
  const whole = core.maskMarkdownCodeContexts(joined(lines)).kind === 'masked';
  if (whole && vector(profile, lines) === vector(extraction, lines)) agree.push(id);
}
console.log(CASES.length, agree.length, JSON.stringify(agree));
