const { scanActiveContent } = await import(process.argv[2] + '/packages/three-surface-poc-core/dist/git-object-reader.js');
const lines = { '2KB =': `a =${' '.repeat(2000)}b`, '20KB =': `a =${' '.repeat(20000)}b`, '20KB ="': `a ="${' \t'.repeat(10000)}b`, '20KB ](<': `[x](${' '.repeat(10000)}<${' '.repeat(10000)}b`, '20KB ]:': `[x]:${' '.repeat(20000)}b`, '20KB scheme': `<j${' '.repeat(10000)}a${' '.repeat(10000)}x`, '20KB span': `a =\`${'x'.repeat(20000)}\`` };
const out = {};
for (const [k, v] of Object.entries(lines)) { const c = process.threadCpuUsage(); scanActiveContent(v); const u = process.threadCpuUsage(c); out[k] = +((u.user + u.system) / 1000).toFixed(2); }
console.log(JSON.stringify(out));
