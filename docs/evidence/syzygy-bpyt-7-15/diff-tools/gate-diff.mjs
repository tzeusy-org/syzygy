// syzygy-bpyt.7.3: the POC observer-input gate's decision on each changed path, one path at a time, from one build.
// Usage: node gate-diff.mjs <tree> <paths.json> <out.json>; <paths.json> is a JSON array of repository-relative paths.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
const [tree, pathsFile, out] = process.argv.slice(2);
const { pocObserverInputsAreClean } = await import(pathToFileURL(path.join(tree, 'apps/three-surface-poc/dist/git-observation.js')).href);
const paths = JSON.parse(fs.readFileSync(pathsFile, 'utf8'));
const decisions = Object.fromEntries(paths.map((changed) => [changed, pocObserverInputsAreClean({ changedPaths: [changed] }) ? 'accepted' : 'refused']));
fs.writeFileSync(out, `${JSON.stringify(decisions, null, 1)}\n`);
console.log(`${paths.length} paths, ${Object.values(decisions).filter((d) => d === 'refused').length} refused`);
