"""rev-526 (review of syzygy-bpyt.8.35, PR #526): rule-6 mutants of launched.ts, run against chosen variants of launched.test.ts.

Recorded mutants (X3c, X3d, X5, O1, O8, ...) take their old/new fragments from the 8.35 record at the reviewed commit, read from the git
objects of every mutants-*.json there (asserted identical across files), never retyped. The reviewer's own mutants Y1-Y5 are written here,
at the same anchor as the PR 523 reviewer's tool. Test variants: fix (reviewed commit), base (71334012, the parent of the fix commit, whose
test file is main's), pre (df6046a1, before targetCtimeNs), and fix-noIno / fix-noMode (the fix with one new snapshot line removed: the
test-side mutant of one predicate). Each run: the test file alone, vitest JSON reporter, CI=1, its own TMPDIR under the root given, in its
own process group; bytes restored and checked by digest after each run. Killed: exit nonzero and at least one failed test (or a timeout).
Usage: python3 -I rev526_mutants.py <clone> <reviewed commit> <tmp root> <out.json> <repeats> <id>@<variant>[,...]
"""
import hashlib, json, os, signal, subprocess, sys, time
from pathlib import Path

CLONE, HEAD, TMPROOT, OUT, REPEATS, SPECS = Path(sys.argv[1]).resolve(), sys.argv[2], sys.argv[3], Path(sys.argv[4]), int(sys.argv[5]), sys.argv[6].split(',')
BASE, PRE = '71334012548cccd46a5a95e313a6014da87c8e3c', 'df6046a153fe130202abdf6bd3045a79ba143879'
READER = 'packages/polaris-dossier/src/launched.ts'
TEST = 'packages/polaris-dossier/src/launched.test.ts'
EV = 'docs/evidence/launch-form-target-ino-mode-2026-10-25'
ROW = 'launch forms in a run whose marker is unreadable count neither a declared form nor a syzygy-launched one: '
LINK_ROW = 'a symbolic link to the marker Syzygy writes'
ANCHOR = "  if (state === 'unreadable') return 'the run\\'s launched marker is present but cannot be read as the one Syzygy writes, so no launch form counts, declared or syzygy-launched';"
TAIL = "\n    return 'the run\\'s launched marker is present but cannot be read as the one Syzygy writes, so no launch form counts, declared or syzygy-launched'; }"
INO_LINE = '    targetIno: followed?.isFile() ? followed.ino : null,\n'
MODE_LINE = '    targetMode: followed?.isFile() ? followed.mode : null,\n'


def body(code):
    return "  if (state === 'unreadable') { try { const p = path.join(runDir, RUN_LAYOUT.launched); const s = fs.lstatSync(p); " + code + " } catch { /* rev526 mutant */ }" + TAIL


LINKED = "if (s.isSymbolicLink()) { const t = fs.statSync(p); if (t.isFile()) { const real = fs.readlinkSync(p); "
OWN = {
    # replace the target by a copy that keeps its bytes and its mode (copyFileSync copies the mode), renamed over it: only the inode moves
    'Y1-target-copyfile-renamed-over': body(LINKED + "fs.copyFileSync(real, `${real}.tmp`); fs.renameSync(`${real}.tmp`, real); } }"),
    # chmod the target to the mode it has: nothing but the change time moves
    'Y2-target-chmod-to-current-mode': body(LINKED + "fs.chmodSync(real, Number(t.mode & 0o7777)); } }"),
    # unlink the target, then write its bytes back at mode 0644 (the inode number may be reused on ext4; the mode changes)
    'Y3-target-unlinked-rewritten-0644': body(LINKED + "const b = fs.readFileSync(real); fs.unlinkSync(real); fs.writeFileSync(real, b, { mode: 0o644 }); } }"),
    # leave a second hard link to the target: bytes, mode and inode unchanged, the link count and change time move
    'Y4-target-hard-link-left': body(LINKED + "fs.linkSync(real, `${real}.hard`); } }"),
    # link the target to a temporary name, rename that onto the target (the same inode, so a no-op), unlink the temporary name
    'Y5-target-link-rename-unlink-same-inode': body(LINKED + "fs.linkSync(real, `${real}.tmp`); fs.renameSync(`${real}.tmp`, real); fs.rmSync(`${real}.tmp`, { force: true }); } }"),
}


def git(*args):
    return subprocess.run(['git', '-C', str(CLONE), *args], capture_output=True, check=True).stdout


def sha(data):
    return hashlib.sha256(data).hexdigest()


def recorded():
    names = git('ls-tree', '-z', '--name-only', HEAD, f'{EV}/').decode().split('\0')
    out = {}
    for name in names:
        if not (name.rsplit('/', 1)[-1].startswith('mutants-') and name.endswith('.json')):
            continue
        for r in json.loads(git('show', f'{HEAD}:{name}'))['runs']:
            edits = [(e['file'], e['old'], e['new']) for e in r['edits']]
            assert out.setdefault(r['id'], edits) == edits, ('recorded edits differ between runs', r['id'])
    return out


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
    finally:
        subprocess.run(['rm', '-rf', '--', tmpdir], check=True)
    if not report.exists():
        return proc.returncode, None, []
    data = json.loads(report.read_text())
    failed = [{'test': t['fullName'], 'firstErrorLine': next((l for msg in t['failureMessages'] for l in msg.splitlines() if l.strip()), None)}
              for f in data['testResults'] for t in f['assertionResults'] if t['status'] == 'failed']
    return proc.returncode, {k: data[k] for k in ('numTotalTests', 'numPassedTests', 'numFailedTests', 'numPendingTests')}, failed


def main():
    assert git('status', '--porcelain', '--untracked-files=no') == b'', 'tracked tree must be clean'
    fix = git('show', f'{HEAD}:{TEST}').decode()
    assert fix.count(INO_LINE) == 1 and fix.count(MODE_LINE) == 1
    variants = {'fix': fix, 'base': git('show', f'{BASE}:{TEST}').decode(), 'pre': git('show', f'{PRE}:{TEST}').decode(),
                'fix-noIno': fix.replace(INO_LINE, ''), 'fix-noMode': fix.replace(MODE_LINE, '')}
    reader = git('show', f'{HEAD}:{READER}')
    assert (CLONE / READER).read_bytes() == reader and git('show', f'{BASE}:{READER}') == reader and git('show', f'{PRE}:{READER}') == reader
    fix_bytes = fix.encode()
    rec = recorded()
    os.makedirs(TMPROOT, exist_ok=True)
    fs_type = subprocess.run(['stat', '-f', '-c', '%T', TMPROOT], capture_output=True, text=True).stdout.strip()
    df_type = subprocess.run(['df', '--output=fstype', TMPROOT], capture_output=True, text=True).stdout.split()[-1]
    results = []
    report = CLONE.parent / f'r526-report-{os.getpid()}.json'
    try:
        for spec in SPECS:
            mid, variant = spec.split('@')
            edits = [] if mid == 'unmutated' else [(READER, ANCHOR, OWN[mid])] if mid in OWN else rec[mid]
            source = 'none' if mid == 'unmutated' else 'reviewer' if mid in OWN else f'{HEAD[:8]}:{EV}/mutants-*.json'
            for rep in range(REPEATS):
                current = {READER: reader.decode(), TEST: variants[variant]}
                once = all(current[f].count(old) == 1 for f, old, _ in edits)
                assert once, (mid, variant)
                for f, old, new in edits:
                    current[f] = current[f].replace(old, new)
                for f, text in current.items():
                    (CLONE / f).write_bytes(text.encode())
                load = os.getloadavg()[0]
                t0 = time.time()
                try:
                    code, counts, failed = run(f'{TMPROOT}/{mid}-{variant}-{rep}', report)
                finally:
                    (CLONE / READER).write_bytes(reader)
                    (CLONE / TEST).write_bytes(fix_bytes)
                rows = sorted(t['test'][len(ROW):] for t in failed if t['test'].startswith(ROW))
                outcome = 'killed' if code is None or (code != 0 and failed) else 'survived'
                results.append({'id': mid, 'variant': variant, 'rep': rep, 'fragmentSource': source, 'testSha256': sha(variants[variant].encode()),
                                'edits': [{'file': f, 'old': o, 'new': n} for f, o, n in edits], 'oldOccursOnce': once, 'exitCode': code,
                                'counts': counts, 'failedTests': failed, 'failedRows': rows, 'linkRowFailed': LINK_ROW in rows, 'outcome': outcome,
                                'load1': round(load, 2), 'seconds': round(time.time() - t0, 1),
                                'restored': sha((CLONE / READER).read_bytes()) == sha(reader) and sha((CLONE / TEST).read_bytes()) == sha(fix_bytes)})
                r = results[-1]
                print(mid, variant, rep, outcome, counts, len(rows), 'link' if r['linkRowFailed'] else '-', r['load1'], flush=True)
    finally:
        (CLONE / READER).write_bytes(reader)
        (CLONE / TEST).write_bytes(fix_bytes)
        report.unlink(missing_ok=True)
    out = {'tool': 'rev526_mutants.py', 'toolSha256': sha(Path(__file__).read_bytes()), 'reviewedCommit': git('rev-parse', HEAD).decode().strip(),
           'base': BASE, 'preBase': PRE, 'variantSha256': {k: sha(v.encode()) for k, v in variants.items()},
           'kernel': os.uname().release, 'node': subprocess.run(['node', '--version'], capture_output=True, text=True).stdout.strip(),
           'tmpRoot': TMPROOT, 'statF': fs_type, 'dfT': df_type, 'runs': results,
           'trackedTreeCleanAfter': git('status', '--porcelain', '--untracked-files=no') == b''}
    OUT.write_text(json.dumps(out, indent=1) + '\n')


main()
