// Reviewer's decoy probe for PR 515 (syzygy-bpyt.4.11). Run with a private TMPDIR, e.g.
//   TMPDIR=/tmp/r515-p1 node decoy_probe.mjs <dist cdp-browser.js> <outside-dir> <cwd-dir> <out.json>
// Part A: removeBrowserProfile against crafted SingletonSocket links (no Chrome).
// Part B: real Chromes, with decoys planted beside them, closed gracefully and by a forced kill.
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const [moduleArg, outsideArg, cwdArg, outArg] = process.argv.slice(2);
const { removeBrowserProfile, launchBrowser, findBrowserExecutable } = await import(resolve(moduleArg));
const T = tmpdir();
const OUT = resolve(outsideArg);
const CWD = resolve(cwdArg);
if (!T.startsWith('/tmp/r515b-') || !OUT.startsWith('/tmp/r515b-') || !CWD.startsWith('/tmp/r515b-')) throw new Error(`refusing: ${T} ${OUT} ${CWD}`);
mkdirSync(OUT, { recursive: true });
mkdirSync(CWD, { recursive: true });
process.chdir(CWD);

function chromeDir(parent, name) {
  const directory = join(parent, name);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'SingletonSocket'), '');
  writeFileSync(join(directory, 'sentinel'), 'decoy');
  return directory;
}
function profileWithLink(target) {
  const profile = mkdtempSync(join(T, 'syzygy-poc-browser-'));
  symlinkSync(target, join(profile, 'SingletonSocket'));
  return profile;
}
const present = (path) => { try { lstatSync(path); return true; } catch { return false; } };
const results = { tmpdir: T, outside: OUT, cwd: CWD, partA: [], partB: [] };

function caseA(id, setup, expectRemoved) {
  const { target, watch } = setup();
  const profile = profileWithLink(target);
  let threw = null;
  try { removeBrowserProfile(profile); } catch (error) { threw = String(error); }
  const after = Object.fromEntries(watch.map((path) => [path, present(path)]));
  const removed = watch.filter((path) => !after[path]);
  const holds = threw === null && !present(profile) && JSON.stringify(removed) === JSON.stringify(expectRemoved);
  results.partA.push({ id, target, watched: watch, removed, expectRemoved, profileRemoved: !present(profile), threw, holds });
}

// 1 absolute target outside TMPDIR, with a matching name
caseA('absolute-outside', () => { const d = chromeDir(OUT, '.com.google.Chrome.Outsd1'); return { target: join(d, 'SingletonSocket'), watch: [d, join(d, 'sentinel')] }; }, []);
// 2 a '..' path that leaves TMPDIR
caseA('dotdot-leaves-tmpdir', () => { const d = chromeDir(OUT, '.com.google.Chrome.Outsd2'); return { target: `${T}/../${OUT.split('/').pop()}/.com.google.Chrome.Outsd2/SingletonSocket`, watch: [d] }; }, []);
// 3 a '..' path that stays in TMPDIR (fails closed: not textually directly under it)
caseA('dotdot-inside-tmpdir', () => { const d = chromeDir(T, '.com.google.Chrome.DotDt1'); mkdirSync(join(T, 'sub'), { recursive: true }); return { target: `${T}/sub/../.com.google.Chrome.DotDt1/SingletonSocket`, watch: [d] }; }, []);
// 4 a relative target, with matching directories in TMPDIR and in the process's cwd
caseA('relative-target', () => { const a = chromeDir(T, '.com.google.Chrome.Relat1'); const b = chromeDir(CWD, '.com.google.Chrome.Relat1'); return { target: '.com.google.Chrome.Relat1/SingletonSocket', watch: [a, b] }; }, []);
// 5 a nested path under a matching directory
caseA('nested', () => { const d = chromeDir(join(T, '.com.google.Chrome.Nest01'), 'inner'); return { target: join(d, 'SingletonSocket'), watch: [d, join(T, '.com.google.Chrome.Nest01')] }; }, []);
// 6 a final component that is itself a symlink to a directory outside TMPDIR
caseA('final-component-symlink', () => { const victim = chromeDir(OUT, 'victim'); const link = join(T, '.com.google.Chrome.SymLk1'); symlinkSync(victim, link); return { target: join(link, 'SingletonSocket'), watch: [link, victim, join(victim, 'sentinel')] }; }, []);
// 7 the final component a regular file
caseA('final-component-file', () => { const file = join(T, '.com.google.Chrome.File01'); writeFileSync(file, 'x'); return { target: join(file, 'SingletonSocket'), watch: [file] }; }, []);
// 8 a trailing slash: dirname would be TMPDIR itself
caseA('trailing-slash-names-tmpdir', () => { const d = chromeDir(T, '.com.google.Chrome.Trail1'); return { target: `${d}/`, watch: [d, T] }; }, []);
// 9 the link names TMPDIR itself and the root of /tmp
caseA('names-tmpdir-itself', () => ({ target: join(T, 'SingletonSocket'), watch: [T] }), []);
// 10 a doubled slash before the name
caseA('double-slash', () => { const d = chromeDir(T, '.com.google.Chrome.Dbl001'); return { target: `${T}//.com.google.Chrome.Dbl001/SingletonSocket`, watch: [d] }; }, []);
// 11 a name with a trailing newline after a valid suffix
caseA('newline-in-name', () => { const d = chromeDir(T, '.com.google.Chrome.Ab\n'); return { target: join(d, 'SingletonSocket'), watch: [d] }; }, []);
// 12 positive control: our own directory beside two other Chromes' directories
caseA('own-among-siblings', () => {
  const mine = chromeDir(T, '.com.google.Chrome.Mine01');
  const a = chromeDir(T, 'com.google.Chrome.Other1');
  const b = chromeDir(T, 'org.chromium.Chromium.Other2');
  return { target: join(mine, 'SingletonSocket'), watch: [mine, a, b] };
}, [join(T, '.com.google.Chrome.Mine01')]);

// Part B: real Chrome.
function ownChromeLeaders() {
  return readdirSync('/proc').filter((n) => /^\d+$/.test(n)).map(Number).filter((pid) => {
    try {
      const stat = readFileSync(`/proc/${pid}/stat`, 'utf8');
      const fields = stat.slice(stat.lastIndexOf(')') + 2).trim().split(/\s+/);
      return Number(fields[1]) === process.pid && readFileSync(`/proc/${pid}/cmdline`, 'utf8').includes(`--user-data-dir=${T}/`);
    } catch { return false; }
  });
}
function networkHelper(leader) {
  return readdirSync('/proc').filter((n) => /^\d+$/.test(n)).map(Number).filter((pid) => {
    try {
      const stat = readFileSync(`/proc/${pid}/stat`, 'utf8');
      const fields = stat.slice(stat.lastIndexOf(')') + 2).trim().split(/\s+/);
      return Number(fields[3]) === leader && readFileSync(`/proc/${pid}/cmdline`, 'utf8').includes('--utility-sub-type=network.mojom.NetworkService');
    } catch { return false; }
  });
}
const chromeNamed = () => readdirSync(T).filter((n) => /^\.?(?:com\.google\.Chrome|org\.chromium\.Chromium)\./.test(n)).sort();
const executable = findBrowserExecutable();
if (executable !== undefined) {
  const decoys = [chromeDir(T, '.com.google.Chrome.Decoy1'), chromeDir(T, 'com.google.Chrome.Decoy2'), chromeDir(T, 'org.chromium.Chromium.Decoy3')];
  const victim = chromeDir(OUT, 'victim2');
  const decoyLink = join(T, '.com.google.Chrome.LinkD1');
  symlinkSync(victim, decoyLink);
  const watch = [...decoys, decoyLink, victim, join(victim, 'sentinel')];
  const before = chromeNamed();
  // Two Chromes in one TMPDIR. A is closed by a forced kill while B runs; B must keep its directory and work.
  const browserA = await launchBrowser(executable);
  const afterA = chromeNamed();
  const browserB = await launchBrowser(executable);
  const afterB = chromeNamed();
  const leaders = ownChromeLeaders();
  const dirA = afterA.filter((n) => !before.includes(n));
  const dirB = afterB.filter((n) => !afterA.includes(n));
  // Freeze A's network helper so A's leader misses its close grace and is killed (the leak path).
  const profiles = leaders.map((pid) => /--user-data-dir=(.*?)(?= --|\0|$)/.exec(readFileSync(`/proc/${pid}/cmdline`, 'utf8'))?.[1]);
  const leaderA = leaders.find((pid, i) => profiles[i] !== undefined && existsSync(join(profiles[i], 'SingletonSocket')) && readlinkSync(join(profiles[i], 'SingletonSocket')).includes(dirA[0] ?? '\0'));
  const frozen = leaderA === undefined ? [] : networkHelper(leaderA);
  for (const pid of frozen) process.kill(pid, 'SIGSTOP');
  let closeA = 'ok';
  try { await browserA.close(); } catch (error) { closeA = String(error); }
  for (const pid of frozen) { try { process.kill(pid, 'SIGKILL'); } catch { /* gone */ } }
  const afterCloseA = chromeNamed();
  let bWorks = false;
  try { const page = await browserB.newPage(); await page.navigate('data:text/html,<p>b</p>'); bWorks = (await page.evaluate('document.body.textContent')) === 'b'; await page.close(); } catch (error) { bWorks = String(error); }
  let closeB = 'ok';
  try { await browserB.close(); } catch (error) { closeB = String(error); }
  const afterCloseB = chromeNamed();
  const survivors = Object.fromEntries(watch.map((path) => [path, present(path)]));
  results.partB.push({
    executable, version: browserA.version, before, dirA, dirB, leaders: leaders.length, frozen: frozen.length, closeA, afterCloseA, bWorks, closeB, afterCloseB, survivors,
    holds: dirA.length === 1 && dirB.length === 1 && frozen.length === 1 && closeA === 'ok' && afterCloseA.includes(dirB[0]) && !afterCloseA.includes(dirA[0]) && bWorks === true && closeB === 'ok'
      && JSON.stringify(afterCloseB) === JSON.stringify(before) && Object.values(survivors).every(Boolean),
    profilesLeft: readdirSync(T).filter((n) => n.startsWith('syzygy-poc-browser-')).length,
  });
}
results.holds = results.partA.every((r) => r.holds) && results.partB.every((r) => r.holds);
writeFileSync(outArg, `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify({ partA: results.partA.map((r) => [r.id, r.holds, r.removed.length]), partB: results.partB.map((r) => ({ holds: r.holds, closeA: r.closeA, closeB: r.closeB, bWorks: r.bWorks, dirA: r.dirA, dirB: r.dirB, afterCloseA: r.afterCloseA, afterCloseB: r.afterCloseB, frozen: r.frozen, profilesLeft: r.profilesLeft })), holds: results.holds }, null, 1));
