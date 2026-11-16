// Probe: one LF text under the head build and under a copy whose closer tolerates a trailing VT or FF (PX1).
// Usage: node px1-probe.mjs <head dist> <node_modules> <scratch, must not exist>
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const [headDist, nodeModules, scratch] = process.argv.slice(2);
if (existsSync(scratch)) throw new Error(`${scratch} exists`);
mkdirSync(join(scratch, 'packages', 'three-surface-poc-core'), { recursive: true });
symlinkSync(nodeModules, join(scratch, 'node_modules'));
const dist = join(scratch, 'packages', 'three-surface-poc-core', 'dist');
cpSync(headDist, dist, { recursive: true });
const p = join(dist, 'markdown-code-context.js');
const src = readFileSync(p, 'utf8');
const old = '/^ {0,3}(`{3,}|~{3,}) *$/';
if (src.split(old).length !== 2) throw new Error('fragment');
writeFileSync(p, src.replace(old, () => '/^ {0,3}(`{3,}|~{3,})[ \\v\\f]*$/'));
const head = (await import(pathToFileURL(join(headDist, 'git-object-reader.js')).href)).scanActiveContent;
const px1 = (await import(pathToFileURL(join(dist, 'git-object-reader.js')).href)).scanActiveContent;
const show = (f) => (f.length === 0 ? 'admit' : f.map((x) => `${x.form}${x.context ? ':' + x.context : ''}@${x.line}:${x.column}`).join(','));
const text = ['```', 'A', '```' + String.fromCharCode(0x0b), '```', '<script>x</script>', '```'].join('\n');
console.log(JSON.stringify({ text: JSON.stringify(text), head: show(head(text)), px1: show(px1(text)) }));
rmSync(scratch, { recursive: true, force: true });
