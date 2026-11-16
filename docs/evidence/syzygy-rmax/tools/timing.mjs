// Thread CPU ms for the old pattern and the shipped scan on `](` floods. usage: node timing.mjs <root> [--old]
const { obfuscatedDestinationMatches, scanActiveContent } = await import(process.argv[2] + '/packages/three-surface-poc-core/dist/git-object-reader.js');
const OLD = /\]\(\s*<?[^)\s]*&(?:#\d+|#[xX][0-9a-fA-F]+|[A-Za-z][A-Za-z0-9]*);/g;
const ms = (f) => { const c = process.threadCpuUsage(); f(); const u = process.threadCpuUsage(c); return +((u.user + u.system) / 1000).toFixed(2); };
const rows = [];
for (const n of [10_000, 30_000, 100_000]) {
  for (const [unit, tail] of [['](', ''], ['](<', ''], ['](&', ''], ['](&a', ''], ['](', '&amp;']]) {
    const text = unit.repeat(n) + tail;
    const row = { flood: `${n} x ${JSON.stringify(unit)}${tail ? ' + ' + JSON.stringify(tail) : ''}`, headMatcherMs: ms(() => obfuscatedDestinationMatches(text)), headScanMs: ms(() => scanActiveContent(text)) };
    if (process.argv.includes('--old') && (n < 100_000 || (unit === '](' && !tail))) row.oldMs = ms(() => [...text.matchAll(OLD)]);
    rows.push(row);
  }
}
console.log(JSON.stringify(rows, null, 1));
