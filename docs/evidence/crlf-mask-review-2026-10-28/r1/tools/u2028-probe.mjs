// Reviewer probe: the opener regex's dot also refuses U+2028 and U+2029, in LF texts (unchanged by PR 544).
// Usage: node u2028-probe.mjs <base dist> <head dist>
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const [baseDist, headDist] = process.argv.slice(2);
const load = async (d) => ({ scan: (await import(pathToFileURL(join(d, 'git-object-reader.js')).href)).scanActiveContent, mask: (await import(pathToFileURL(join(d, 'markdown-code-context.js')).href)).maskMarkdownCodeContexts });
const base = await load(baseDist);
const head = await load(headDist);
const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);
const NEL = String.fromCharCode(0x85);
const LF = String.fromCharCode(10);
const B = '```';
const S = '<script>x</script>';
const cases = {
  'control: opener with backtick info, script, closer': [B + 'a`b', S, B, ''].join(LF),
  'same, U+2028 in the info string': [B + LS + 'a`b', S, B, ''].join(LF),
  'same, U+2029 in the info string': [B + PS + 'a`b', S, B, ''].join(LF),
  'same, U+0085 in the info string': [B + NEL + 'a`b', S, B, ''].join(LF),
  'control: one line, backtick info holding script and backticks': B + S + B + LF,
  'one line, U+2028 after the opener run': B + LS + S + B + LF,
  'tilde opener with U+2028 info, script, closer': ['~~~' + LS, S, '~~~', ''].join(LF),
};
for (const [name, text] of Object.entries(cases)) {
  const h = head.scan(text);
  const b = base.scan(text);
  console.log(JSON.stringify({ name, head: h.map((f) => f.form + (f.context ? ':' + f.context : '')), baseEqualsHead: JSON.stringify(b) === JSON.stringify(h) }));
}
