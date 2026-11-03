// Differential sweep: replaced UNSAFE_URL (oracle, in workers with a cap) vs shipped unsafeUrlMatches, over every tracked file, raw and masked.
import { Worker } from 'node:worker_threads';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = process.argv[2], out = process.argv[3], CAP = Number(process.argv[4] ?? 120000), POOL = Number(process.argv[5] ?? 8), INCLUDE_NUL = process.argv[6] === '--include-nul';
const { unsafeUrlMatches } = await import(root + '/packages/three-surface-poc-core/dist/git-object-reader.js');
const { maskMarkdownCodeContexts } = await import(root + '/packages/three-surface-poc-core/dist/markdown-code-context.js');
const ORACLE = `
const { parentPort } = require('node:worker_threads');
const S='(?:j\\\\s*a\\\\s*v\\\\s*a\\\\s*s\\\\s*c\\\\s*r\\\\s*i\\\\s*p\\\\s*t|v\\\\s*b\\\\s*s\\\\s*c\\\\s*r\\\\s*i\\\\s*p\\\\s*t|d\\\\s*a\\\\s*t\\\\s*a|f\\\\s*i\\\\s*l\\\\s*e)\\\\s*:';
const OLD=new RegExp('(?:\\\\]\\\\(\\\\s*<?|\\\\]:\\\\s*<?|=\\\\s*["\\']?\\\\s*|<)\\\\s*'+S,'gi');
parentPort.postMessage({ source: OLD.source });
parentPort.on('message', (t) => { const a=performance.now(); const m=[...t.matchAll(OLD)].map(q=>({index:q.index,value:q[0]})); parentPort.postMessage({ m, ms: performance.now()-a }); });`;
const EXPECTED_OLD_SOURCE = String.raw`(?:\]\(\s*<?|\]:\s*<?|=\s*["']?\s*|<)\s*(?:j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t|v\s*b\s*s\s*c\s*r\s*i\s*p\s*t|d\s*a\s*t\s*a|f\s*i\s*l\s*e)\s*:`;
const files = readFileSync(out + '.files', 'utf8').split('\0').filter(Boolean);
const dec = new TextDecoder('utf-8', { fatal: true });
const tasks = []; let skipped = [];
for (const f of files) {
  let b; try { b = readFileSync(root + '/' + f); } catch { skipped.push({ f, why: 'unreadable' }); continue; }
  if (!INCLUDE_NUL && b.includes(0)) { skipped.push({ f, why: 'nul' }); continue; }
  let t; try { t = dec.decode(b); } catch { skipped.push({ f, why: 'not-utf-8' }); continue; }
  const sha = createHash('sha256').update(b).digest('hex');
  tasks.push({ f, sha, form: 'raw', text: t });
  const m = maskMarkdownCodeContexts(t);
  if (m.kind !== 'malformed') tasks.push({ f, sha, form: 'masked', text: m.masked });
}
const rows = []; let next = 0;
const runOne = () => new Promise((resolve) => {
  const loop = () => {
    if (next >= tasks.length) return resolve();
    const task = tasks[next++];
    const w = new Worker(ORACLE, { eval: true });
    let timer; let first = true;
    w.on('message', (msg) => {
      if (first) { first = false; if (msg.source !== EXPECTED_OLD_SOURCE) throw new Error('oracle source drift'); timer = setTimeout(() => { w.terminate(); rows.push({ f: task.f, sha: task.sha, form: task.form, bytes: task.text.length, outcome: 'oracle-over-cap' }); loop(); }, CAP); w.postMessage(task.text); return; }
      clearTimeout(timer); w.terminate();
      const a = performance.now(); const h = unsafeUrlMatches(task.text); const hm = performance.now() - a;
      rows.push({ f: task.f, sha: task.sha, form: task.form, bytes: task.text.length, outcome: JSON.stringify(msg.m) === JSON.stringify(h) ? 'same' : 'differ', matches: msg.m.length, oldMs: +msg.ms.toFixed(1), headMs: +hm.toFixed(2) });
      loop();
    });
  };
  loop();
});
await Promise.all(Array.from({ length: POOL }, runOne));
const by = (o) => rows.filter((r) => r.outcome === o);
writeFileSync(out, JSON.stringify({ capMs: CAP, trackedFiles: files.length, skipped: skipped.length, comparedForms: tasks.length, same: by('same').length, differ: by('differ').map((r) => r), overCap: by('oracle-over-cap'), oracleMatches: rows.reduce((n, r) => n + (r.matches ?? 0), 0), slowest: [...by('same')].sort((a, b) => b.oldMs - a.oldMs).slice(0, 10), skippedFiles: skipped, rows }, null, 1));
console.log(JSON.stringify({ trackedFiles: files.length, skipped: skipped.length, comparedForms: tasks.length, same: by('same').length, differ: by('differ').length, overCap: by('oracle-over-cap').map((r) => r.f + ':' + r.form) }));
