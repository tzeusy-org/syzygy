"""R-GP-IMPL-LAUNCH-FORM-TARGET-CTIME-1 (review of syzygy-bpyt.8.33, PR #523): rule-6 mutants at base and fix.

Recorded mutants (O1, O8, R-chmod-cycle-rewrite) take their old/new fragments from the PR's own record at the reviewed commit, read from
the git object, never retyped. The reviewer's mutants X1-X4b are written here. Every mutant edits launched.ts at the same anchor; the test
file is set to the side's bytes from the git object (base: df6046a1, fix: the reviewed commit). Each run: the test file alone, vitest JSON
reporter, CI=1, its own TMPDIR under the root given, in its own process group; bytes restored and checked by digest after each run.
Killed: exit code nonzero and at least one failed test (or a timeout). The kernel and the TMPDIR file system are stored beside each run.
Usage: python3 -I rev523_mutants.py <clone> <reviewed commit> <base commit> <tmp root> <out.json> <repeats> <id>[,<id>...]
"""
import hashlib, json, os, signal, subprocess, sys, time
from pathlib import Path

CLONE, HEAD, BASE, TMPROOT, OUT, REPEATS, IDS = Path(sys.argv[1]).resolve(), sys.argv[2], sys.argv[3], sys.argv[4], Path(sys.argv[5]), int(sys.argv[6]), sys.argv[7].split(',')
READER = 'packages/polaris-dossier/src/launched.ts'
TEST = 'packages/polaris-dossier/src/launched.test.ts'
RECORD = 'docs/evidence/launch-form-target-ctime-2026-10-25/mutants-tmpfs.json'
ROW = 'launch forms in a run whose marker is unreadable count neither a declared form nor a syzygy-launched one: '
LINK_ROW = 'a symbolic link to the marker Syzygy writes'
ANCHOR = "  if (state === 'unreadable') return 'the run\\'s launched marker is present but cannot be read as the one Syzygy writes, so no launch form counts, declared or syzygy-launched';"
TAIL = "\n    return 'the run\\'s launched marker is present but cannot be read as the one Syzygy writes, so no launch form counts, declared or syzygy-launched'; }"


def body(code):
    return "  if (state === 'unreadable') { try { const p = path.join(runDir, RUN_LAYOUT.launched); const s = fs.lstatSync(p); " + code + " } catch { /* rev523 mutant */ }" + TAIL


OWN = {
    # utimes the target back after a chmod-cycle: no byte rewrite, atime and mtime put back
    'X1-target-chmod-cycle-utimes-restored': body("if (s.isSymbolicLink()) { const t = fs.statSync(p); if (t.isFile()) { fs.chmodSync(p, 0); fs.chmodSync(p, t.mode & 0o777); fs.utimesSync(p, t.atime, t.mtime); } }"),
    # rename the target away and back: same inode, same bytes, same mode, same link string
    'X2-target-rename-away-and-back': body("if (s.isSymbolicLink() && fs.statSync(p).isFile()) { const t = fs.realpathSync(p); fs.renameSync(t, `${t}.away`); fs.renameSync(`${t}.away`, t); }"),
    # replace the target at its own path by a byte-identical copy of the same mode (write a temporary file, rename it over the target)
    'X3-target-replaced-by-identical-copy': body("if (s.isSymbolicLink()) { const t = fs.statSync(p); if (t.isFile()) { const real = fs.realpathSync(p); const b = fs.readFileSync(real); fs.writeFileSync(`${real}.tmp`, b, { mode: t.mode & 0o777 }); fs.chmodSync(`${real}.tmp`, t.mode & 0o777); fs.renameSync(`${real}.tmp`, real); } }"),
    # the same, but the copy keeps mode 0644, so the target's mode stays changed after the ask
    'X3b-target-replaced-by-copy-mode-0644': body("if (s.isSymbolicLink()) { const t = fs.statSync(p); if (t.isFile()) { const real = fs.realpathSync(p); const b = fs.readFileSync(real); fs.writeFileSync(`${real}.tmp`, b); fs.chmodSync(`${real}.tmp`, 0o644); fs.renameSync(`${real}.tmp`, real); } }"),
    # X3 and X3b without realpathSync, which lstats every directory on the way and so marks their change times queried: the target's path is
    # read from the link, and nothing but the link and the target is stat'ed
    'X3c-target-replaced-by-identical-copy-no-realpath': body("if (s.isSymbolicLink()) { const t = fs.statSync(p); if (t.isFile()) { const real = fs.readlinkSync(p); const b = fs.readFileSync(p); fs.writeFileSync(`${real}.tmp`, b, { mode: t.mode & 0o777 }); fs.renameSync(`${real}.tmp`, real); } }"),
    'X3d-target-replaced-by-copy-mode-0644-no-realpath': body("if (s.isSymbolicLink()) { const t = fs.statSync(p); if (t.isFile()) { const real = fs.readlinkSync(p); const b = fs.readFileSync(p); fs.writeFileSync(`${real}.tmp`, b); fs.renameSync(`${real}.tmp`, real); } }"),
    # unlink the target first, then write a new file of the same bytes and mode at its path (the inode number may be reused on ext4)
    'X5-target-unlinked-then-rewritten': body("if (s.isSymbolicLink()) { const t = fs.statSync(p); if (t.isFile()) { const real = fs.readlinkSync(p); const b = fs.readFileSync(p); fs.unlinkSync(real); fs.writeFileSync(real, b, { mode: t.mode & 0o777 }); } }"),
    # retarget the link to a byte-identical copy at another path
    'X4-link-retargeted-to-identical-copy': body("if (s.isSymbolicLink()) { const t = fs.statSync(p); if (t.isFile()) { const copy = path.join(runDir, 'copy.json'); fs.copyFileSync(fs.realpathSync(p), copy); fs.unlinkSync(p); fs.symlinkSync(copy, p); } }"),
    # recreate the link itself with the same target string
    'X4b-link-recreated-same-string': body("if (s.isSymbolicLink()) { const to = fs.readlinkSync(p); fs.unlinkSync(p); fs.symlinkSync(to, p); }"),
}


def git(*args):
    return subprocess.run(['git', '-C', str(CLONE), *args], capture_output=True, check=True).stdout


def sha(data):
    return hashlib.sha256(data).hexdigest()


def recorded():
    rec = json.loads(git('show', f'{HEAD}:{RECORD}'))
    return {m['id']: [(e['file'], e['old'], e['new']) for e in m['edits']] for m in rec['mutants'] if m['tests'] == 'fix'}


def run(tmpdir, report):
    os.makedirs(tmpdir, exist_ok=False)
    report.unlink(missing_ok=True)
    proc = subprocess.Popen(['npx', 'vitest', 'run', '--project', '@syzygy/polaris-dossier', '--reporter=json', f'--outputFile={report}', TEST],
                            cwd=CLONE, env={**os.environ, 'CI': '1', 'TMPDIR': tmpdir}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                            start_new_session=True)
    try:
        proc.wait(timeout=300)
    except subprocess.TimeoutExpired:
        os.killpg(proc.pid, signal.SIGKILL)  # this run's own process group only
        proc.wait()
        return None, None, []
    if not report.exists():
        return proc.returncode, None, []
    data = json.loads(report.read_text())
    failed = [{'test': t['fullName'], 'firstErrorLine': next((l for msg in t['failureMessages'] for l in msg.splitlines() if l.strip()), None)}
              for f in data['testResults'] for t in f['assertionResults'] if t['status'] == 'failed']
    return proc.returncode, {k: data[k] for k in ('numTotalTests', 'numPassedTests', 'numFailedTests')}, failed


def main():
    assert git('status', '--porcelain', '--untracked-files=no') == b'', 'tracked tree must be clean'
    sides = {'base': git('show', f'{BASE}:{TEST}'), 'fix': git('show', f'{HEAD}:{TEST}')}
    reader = git('show', f'{HEAD}:{READER}')
    assert (CLONE / READER).read_bytes() == reader and git('show', f'{BASE}:{READER}') == reader
    rec = recorded()
    os.makedirs(TMPROOT, exist_ok=True)
    fs_type = subprocess.run(['stat', '-f', '-c', '%T', TMPROOT], capture_output=True, text=True).stdout.strip()
    df_type = subprocess.run(['df', '--output=fstype', TMPROOT], capture_output=True, text=True).stdout.split()[-1]
    results = []
    try:
        for mid in IDS:
            if mid == 'unmutated':
                edits = []
            elif mid in OWN:
                edits = [(READER, ANCHOR, OWN[mid])]
            else:
                edits = rec[mid]
            for side, test_bytes in sides.items():
                for rep in range(REPEATS):
                    current = {READER: reader.decode('utf8'), TEST: test_bytes.decode('utf8')}
                    once = all(current[f].count(old) == 1 for f, old, _ in edits)
                    assert once, (mid, side)
                    for f, old, new in edits:
                        current[f] = current[f].replace(old, new)
                    for f, text in current.items():
                        (CLONE / f).write_bytes(text.encode('utf8'))
                    load = os.getloadavg()[0]
                    t0 = time.time()
                    try:
                        code, counts, failed = run(f'{TMPROOT}/{mid}-{side}-{rep}', CLONE.parent / 'r523-report.json')
                    finally:
                        (CLONE / READER).write_bytes(reader)
                        (CLONE / TEST).write_bytes(sides['fix'])
                    rows = sorted(t['test'][len(ROW):] for t in failed if t['test'].startswith(ROW))
                    outcome = 'killed' if code is None or (code != 0 and failed) else 'survived'
                    results.append({'id': mid, 'side': side, 'rep': rep, 'testSha256': sha(test_bytes), 'edits': [{'file': f, 'old': o, 'new': n} for f, o, n in edits],
                                    'oldOccursOnce': once, 'exitCode': code, 'counts': counts, 'failedTests': failed, 'failedRows': rows,
                                    'linkRowFailed': LINK_ROW in rows, 'outcome': outcome, 'load1': round(load, 2), 'seconds': round(time.time() - t0, 1),
                                    'restored': sha((CLONE / READER).read_bytes()) == sha(reader) and sha((CLONE / TEST).read_bytes()) == sha(sides['fix'])})
                    r = results[-1]
                    print(mid, side, rep, outcome, counts, len(rows), 'link' if r['linkRowFailed'] else '-', r['load1'], flush=True)
    finally:
        (CLONE / READER).write_bytes(reader)
        (CLONE / TEST).write_bytes(sides['fix'])
    out = {'tool': 'rev523_mutants.py', 'toolSha256': sha(Path(__file__).read_bytes()), 'reviewedCommit': git('rev-parse', HEAD).decode().strip(),
           'base': git('rev-parse', BASE).decode().strip(), 'kernel': os.uname().release, 'node': subprocess.run(['node', '--version'], capture_output=True, text=True).stdout.strip(),
           'tmpRoot': TMPROOT, 'statF': fs_type, 'dfT': df_type, 'recordFragmentsFrom': f'{HEAD}:{RECORD}', 'runs': results,
           'trackedTreeCleanAfter': git('status', '--porcelain', '--untracked-files=no') == b''}
    OUT.write_text(json.dumps(out, indent=1) + '\n')


main()
