// Surface version at each commit, through the head's own built pwbSurfaceVersion (argv[2] = built checkout root, rest = commits).
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
const [root, ...commits] = process.argv.slice(2);
const { pwbSurfaceVersion } = await import(pathToFileURL(join(root, 'apps/three-surface-poc/dist/walkthrough-inputs.js')).href);
const runGit = (repo, args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
for (const c of commits) console.log(c, pwbSurfaceVersion(runGit, root, c));
