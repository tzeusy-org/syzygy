// Round-2 reviewer's deletion-safety probe for PR 515 (syzygy-bpyt.4.11), against the head's compiled
// cdp-browser.js. Usage: TMPDIR=<private, empty> node safety_probe.mjs <dist/cdp-browser.js> <out.json> [racerTrials]
// Everything it makes and removes lies under TMPDIR. It refuses to run if TMPDIR is unset, is /tmp, or is not empty
// apart from node-compile-cache.
import { spawn } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, rmdirSync, statSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [dist, out, trialsArg] = process.argv.slice(2);
const root = process.env.TMPDIR;
if (!root || root === '/tmp' || !root.startsWith('/tmp/r515b-')) throw new Error('refusing: TMPDIR must be a private /tmp/r515b-* directory');
if (readdirSync(root).some((n) => n !== 'node-compile-cache')) throw new Error('refusing: TMPDIR is not empty');
const { removeBrowserProfile } = await import(dist);
const results = { tmpdir: tmpdir(), tmpdirMode: (statSync(root).mode & 0o7777).toString(8), cases: {} };
const big = (p) => lstatSync(p, { bigint: true });
const recorded = (p) => { const { dev, ino } = big(p); return { path: p, dev, ino }; };
function chromeDir(name, marker) {
  const d = join(root, name);
  mkdirSync(d);
  writeFileSync(join(d, 'SingletonSocket'), '');
  writeFileSync(join(d, 'marker'), marker);
  return d;
}
// Links first, by unlink: Node's rmSync with force leaves a dangling link in place (observed in this probe's first run).
function clean() {
  for (const n of readdirSync(root)) if (n !== 'node-compile-cache' && lstatSync(join(root, n)).isSymbolicLink()) unlinkSync(join(root, n));
  for (const n of readdirSync(root)) if (n !== 'node-compile-cache') rmSync(join(root, n), { recursive: true, force: true });
}
const has = (d, marker) => existsSync(join(d, 'marker'));

// P1: the profile path is a symlink to a directory whose link (ours) names a Chrome directory.
{
  const victim = chromeDir('.com.google.Chrome.Victim1', 'victim');
  const real = join(root, 'realprofile');
  mkdirSync(real);
  symlinkSync(join(victim, 'SingletonSocket'), join(real, 'SingletonSocket'));
  const profile = join(root, 'syzygy-browser-profile');
  symlinkSync(real, profile);
  const otherOwner = (p) => { const e = big(p); return p === profile ? Object.assign(Object.create(e), { uid: e.uid + 1n }) : e; };
  removeBrowserProfile(profile, { remove: () => undefined, lstat: otherOwner });
  results.cases['P1a symlinked profile answered as another owner: victim kept'] = has(victim);
  removeBrowserProfile(profile, { remove: () => undefined });
  results.cases['P1b symlinked profile that is ours, real lstat: victim removed (same-user link trusted, by design)'] = !existsSync(victim);
  clean();
}

// P2: the link is swapped for another between its owner check and readlink (a writer of the profile directory).
{
  const named = chromeDir('.com.google.Chrome.Named1', 'named');
  const other = chromeDir('.com.google.Chrome.Other1', 'other');
  const profile = join(root, 'profile2');
  mkdirSync(profile);
  const link = join(profile, 'SingletonSocket');
  symlinkSync(join(named, 'SingletonSocket'), link);
  let swapped = false;
  const swapAfterCheck = (p) => {
    const e = big(p);
    if (p === link && !swapped) { swapped = true; rmSync(link); symlinkSync(join(other, 'SingletonSocket'), link); }
    return e;
  };
  removeBrowserProfile(profile, { remove: () => undefined, lstat: swapAfterCheck });
  results.cases['P2 link swapped after its owner check: the directory the new link names is removed'] = !existsSync(other) && existsSync(named);
  clean();
}

// P3: the directory is replaced between the removal's identity check and its rmSync.
{
  const original = chromeDir('.com.google.Chrome.Ident1', 'original');
  const atLaunch = recorded(original);
  const aside = join(root, 'original-aside');
  let swapped = false;
  const swapAfterCheck = (p) => {
    const e = big(p);
    if (p === original && !swapped) { swapped = true; renameSync(original, aside); chromeDir('.com.google.Chrome.Ident1', 'replacement'); }
    return e;
  };
  const profile = join(root, 'profile3');
  mkdirSync(profile);
  removeBrowserProfile(profile, { singleton: atLaunch, lstat: swapAfterCheck });
  results.cases['P3 directory replaced after the identity check: the replacement is removed and the one that was read survives'] = !existsSync(original) && existsSync(join(aside, 'marker'));
  clean();
}

// P4: inode reuse on this TMPDIR's file system: make, remove, make again under one name.
{
  let same = 0;
  const n = 2000;
  const d = join(root, '.com.google.Chrome.Reuse1');
  for (let i = 0; i < n; i += 1) {
    mkdirSync(d); writeFileSync(join(d, 'SingletonSocket'), '');
    const first = big(d).ino;
    rmSync(d, { recursive: true, force: true });
    mkdirSync(d);
    if (big(d).ino === first) same += 1;
    rmdirSync(d);
  }
  results.cases['P4 inode reuse'] = { trials: n, sameInode: same };
  clean();
}

// P5: the same window without the seam: a separate same-user process swaps the directory with another,
// back and forth, while the default removal runs. Counts trials in which the replacement was removed.
{
  const trials = Number(trialsArg ?? 0);
  const tally = { trials, replacementRemoved: 0, originalRemoved: 0, neitherRemoved: 0, other: 0 };
  const racerSource = `
    const { renameSync } = require('node:fs');
    const [d, b, x] = process.argv.slice(1);
    process.stdout.write('go\\n');
    for (;;) { try { renameSync(d, x); renameSync(b, d); renameSync(d, b); renameSync(x, d); } catch {} }`;
  for (let t = 0; t < trials; t += 1) {
    const d = chromeDir('.com.google.Chrome.Race01', 'original');
    const atLaunch = recorded(d);
    const b = join(root, 'replacement');
    mkdirSync(b); writeFileSync(join(b, 'marker'), 'replacement'); writeFileSync(join(b, 'SingletonSocket'), '');
    const x = join(root, 'aside');
    const racer = spawn(process.execPath, ['-e', racerSource, d, b, x], { stdio: ['ignore', 'pipe', 'ignore'] });
    await new Promise((resolve) => racer.stdout.once('data', resolve));
    const profile = join(root, `profile-r${t}`);
    mkdirSync(profile);
    removeBrowserProfile(profile, { singleton: atLaunch });
    racer.kill('SIGKILL');
    await new Promise((resolve) => racer.once('exit', resolve));
    const markers = [];
    for (const p of [d, b, x]) { try { markers.push(readdirSync(p).includes('marker') ? readFileSync(join(p, 'marker'), 'utf8') : 'none'); } catch { markers.push('absent'); } }
    const left = new Set(markers);
    if (left.has('original') && !left.has('replacement')) tally.replacementRemoved += 1;
    else if (left.has('replacement') && !left.has('original')) tally.originalRemoved += 1;
    else if (left.has('replacement') && left.has('original')) tally.neitherRemoved += 1;
    else tally.other += 1;
    clean();
  }
  results.cases['P5 racer without the seam'] = tally;
}

clean();
results.leftInTmpdir = readdirSync(root).filter((n) => n !== 'node-compile-cache');
writeFileSync(out, JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
