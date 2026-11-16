// Probe: how the head and base masks read a fence opener whose info string holds a separator (LF texts only).
// Usage: node opener-probe.mjs <base dist> <head dist>
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const [baseDist, headDist] = process.argv.slice(2);
const load = async (d) => (await import(pathToFileURL(join(d, 'markdown-code-context.js')).href)).maskMarkdownCodeContexts;
const base = await load(baseDist); const head = await load(headDist);
const show = (m) => (m.kind === 'masked' ? `masked fences=${m.fences} spans=${m.spans}` : `malformed ${m.reason}@${m.line}`);
const out = {};
for (const [name, code] of [['x', 0x78], ['U+0085', 0x85], ['U+2028', 0x2028], ['U+2029', 0x2029], ['VT', 0x0b], ['FF', 0x0c], ['U+FEFF', 0xfeff]]) {
  const text = ['```' + String.fromCharCode(code) + 'info', '<script>x</script>', '```'].join('\n');
  out[name] = { head: show(head(text)), base: show(base(text)), equal: show(head(text)) === show(base(text)) };
}
console.log(JSON.stringify(out, null, 1));
