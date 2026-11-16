// rev-540: print the module URLs Node loads for the POC entry --help, grouped (diagnostic for closure_independent.mjs).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const [tree, hook, loads] = process.argv.slice(2);
execFileSync(process.execPath, ['--import', pathToFileURL(hook).href, join(tree, 'apps/three-surface-poc/dist/main.js'), '--help'], { cwd: tree, env: { ...process.env, REV540_LOADS: loads } });
const urls = readFileSync(loads, 'utf8').split('\n').filter(Boolean);
const groups = {};
for (const u of urls) { const k = u.startsWith('file://') ? u.replace(pathToFileURL(tree).href + '/', '').split('/').slice(0, 2).join('/') : u.split(':')[0]; groups[k] = (groups[k] ?? 0) + 1; }
console.log(groups);
