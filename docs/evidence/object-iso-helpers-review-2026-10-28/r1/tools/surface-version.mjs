// Re-derive the POC surface version with the repository's own pwbSurfaceVersion (built dist), per commit.
// Usage: node surface-version.mjs <clone> <commit>...
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const [clone, ...commits] = process.argv.slice(2);
const { pwbSurfaceVersion } = await import(pathToFileURL(`${clone}/apps/three-surface-poc/dist/walkthrough-inputs.js`).href);
const runGit = (root, args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' });
for (const c of commits) console.log(c, pwbSurfaceVersion(runGit, clone, c));
