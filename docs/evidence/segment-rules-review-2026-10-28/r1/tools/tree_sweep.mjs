// Over every package.json tracked at a revision (argv[3]) in a repo (argv[2]), apply the head testkit's segmentFaultOf (argv[4]) to
// each exports entry (or main, without exports), and the base check (JSON.stringify(entry).includes('/../')); count targets.
import { execFileSync } from 'node:child_process';
const [repo, rev, kitPath] = process.argv.slice(2);
const kit = await import(kitPath);
const git = (...a) => execFileSync('git', ['-C', repo, ...a], { encoding: 'utf8', maxBuffer: 1 << 26 });
const paths = git('ls-tree', '-r', '-z', '--name-only', rev).split('\0').filter((p) => /^(apps|packages)\/[^/]+\/package\.json$/.test(p) || p === 'package.json');
let targets = 0, entries = 0, newFaults = [], oldFaults = [];
const count = (e) => typeof e === 'string' ? 1 : Array.isArray(e) ? e.reduce((n, x) => n + count(x), 0) : e && typeof e === 'object' ? Object.values(e).reduce((n, x) => n + count(x), 0) : 0;
for (const p of paths) {
  const m = JSON.parse(git('show', `${rev}:${p}`));
  const list = m.exports !== undefined ? Object.entries(m.exports) : m.main !== undefined ? [['.', m.main]] : [];
  for (const [sub, entry] of list) {
    entries++; targets += count(entry);
    const f = kit.segmentFaultOf(entry, m.exports === undefined); if (f) newFaults.push(`${p} ${sub}: ${f}`);
    if (JSON.stringify(entry).includes('/../')) oldFaults.push(`${p} ${sub}`);
  }
}
console.log(JSON.stringify({ rev, manifests: paths.length, entries, targets, newFaults, oldFaults }));
