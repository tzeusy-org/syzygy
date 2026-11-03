// Differential sweep: replaced OBFUSCATED_DESTINATION (oracle, in workers with a cap) vs shipped obfuscatedDestinationMatches, over every tracked file, raw and masked.
// usage: node sweep.mjs <root> <out.json>   (reads <out.json>.files: NUL-separated `git ls-files -z`)
import { Worker } from 'node:worker_threads';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = process.argv[2], out = process.argv[3], CAP = Number(process.argv[4] ?? 120000), POOL = Number(process.argv[5] ?? 8);
const { obfuscatedDestinationMatches } = await import(root + '/packages/three-surface-poc-core/dist/git-object-reader.js');
const { maskMarkdownCodeContexts } = await import(root + '/packages/three-surface-poc-core/dist/markdown-code-context.js');
const ORACLE = String.raw`
const { parentPort } = require('node:worker_threads');
const OLD = /\]\(\s*<?[^)\s]*&(?:#\d+|#[xX][0-9a-fA-F]+|[A-Za-z][A-Za-z0-9]*);/g;
parentPort.postMessage({ source: OLD.source, flags: OLD.flags });
parentPort.on('message', (t) => { const a = performance.now(); const m = [...t.matchAll(OLD)].map((q) => ({ index: q.index, value: q[0] })); parentPort.postMessage({ m, ms: performance.now() - a }); });`;
const EXPECTED_OLD_SOURCE = String.raw`\]\(\s*<?[^)\s]*&(?:#\d+|#[xX][0-9a-fA-F]+|[A-Za-z][A-Za-z0-9]*);`;
const files = readFileSync(out + '.files', 'utf8').split('\0').filter(Boolean);
const dec = new TextDecoder('utf-8', { fatal: true });
const tasks = []; const skipped = [];
for (const f of files) {
  let b; try { b = readFileSync(root + '/' + f); } catch { skipped.push({ f, why: 'unreadable' }); continue; }
  if (b.includes(0)) { skipped.push({ f, why: 'nul' }); continue; }
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
      if (first) { first = false; if (msg.source !== EXPECTED_OLD_SOURCE || msg.flags !== 'g') throw new Error('oracle source drift'); timer = setTimeout(() => { w.terminate(); rows.push({ f: task.f, sha: task.sha, form: task.form, bytes: task.text.length, outcome: 'oracle-over-cap' }); loop(); }, CAP); w.postMessage(task.text); return; }
      clearTimeout(timer); w.terminate();
      const a = performance.now(); const h = obfuscatedDestinationMatches(task.text); const hm = performance.now() - a;
      rows.push({ f: task.f, sha: task.sha, form: task.form, bytes: task.text.length, outcome: JSON.stringify(msg.m) === JSON.stringify(h) ? 'same' : 'differ', matches: msg.m.length, oldMs: +msg.ms.toFixed(1), headMs: +hm.toFixed(2) });
      loop();
    });
  };
  loop();
});
await Promise.all(Array.from({ length: POOL }, runOne));
const by = (o) => rows.filter((r) => r.outcome === o);
const summary = { capMs: CAP, trackedFiles: files.length, skipped: skipped.length, comparedForms: tasks.length, same: by('same').length, differ: by('differ'), overCap: by('oracle-over-cap'), oracleMatches: rows.reduce((n, r) => n + (r.matches ?? 0), 0), filesWithMatches: [...new Set(rows.filter((r) => r.matches > 0).map((r) => r.f))].length, slowestOld: [...by('same')].sort((a, b) => b.oldMs - a.oldMs).slice(0, 5).map(({ f, form, bytes, oldMs, headMs }) => ({ f, form, bytes, oldMs, headMs })), skippedFiles: skipped };
writeFileSync(out, JSON.stringify(summary, null, 1));
console.log(JSON.stringify({ ...summary, slowestOld: undefined, skippedFiles: undefined, differ: summary.differ.length, overCap: summary.overCap.map((r) => r.f + ':' + r.form) }));
