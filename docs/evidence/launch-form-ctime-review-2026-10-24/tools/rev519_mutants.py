"""R-GP-IMPL-LAUNCH-FORM-CTIME-1 reviewer mutants for syzygy-bpyt.8.30 (PR 519), written by the reviewer, independent of mutants.py.

Each mutant inserts a body into launchFormRefusal's unreadable branch (launched.ts), as a launch-form reader that touches the marker
and still refuses. It runs against launched.test.ts at the base (ce322e1a, the snapshot without the change time) and at the head
(3fb73809), alone, with vitest's JSON reporter, under the TMPDIR given, then restores the bytes and checks their digests.
R-chmod-cycle-rewrite is reproduced from the record's own stored fragment (read from the record, not retyped).
Usage: python3 -I rev519_mutants.py <clone> <tmpdir> <scratch dir> <out.json> [mutant ids...]; VARIANT_TEST=<file> runs that test instead; FROM_RECORD=<id,...> adds
those record mutants from their stored fragments."""
import hashlib, json, os, signal, subprocess, sys
from pathlib import Path

ROOT, TMP, SCRATCH, OUT = Path(sys.argv[1]).resolve(), sys.argv[2], Path(sys.argv[3]).resolve(), Path(sys.argv[4])
ONLY = set(sys.argv[5:])
BASE, HEAD = 'ce322e1a65b784c6304d51b05fb347351912a926', '3fb7380945bd8ac0374e38792a814aed070bd8c6'
READER, TEST = 'packages/polaris-dossier/src/launched.ts', 'packages/polaris-dossier/src/launched.test.ts'
REPORT = SCRATCH / 'rev519-vitest.json'
COMMAND = ['npx', 'vitest', 'run', '--project', '@syzygy/polaris-dossier', '--reporter=json', f'--outputFile={REPORT}', TEST]
ROW = 'launch forms in a run whose marker is unreadable count neither a declared form nor a syzygy-launched one: '
MESSAGE = ("'the run\\'s launched marker is present but cannot be read as the one Syzygy writes, so no launch form counts, declared or "
           "syzygy-launched'")
ANCHOR = f"  if (state === 'unreadable') return {MESSAGE};"
P = "const p = path.join(runDir, RUN_LAYOUT.launched); const s = fs.lstatSync(p);"
OWN = {
    # Rewrite a readable regular file's own bytes, unchanged; through a link it rewrites the link's target.
    'O1-same-bytes-rewrite': f"{P} if (fs.statSync(p).isFile()) {{ const b = fs.readFileSync(p); fs.writeFileSync(p, b); }}",
    # The same, then the access and modification times put back, and for the mode-000 file the mode cycled around it.
    'O2-same-bytes-rewrite-utimes-restored': f"{P} if (s.isFile()) {{ const m = s.mode & 0o777; if (m === 0) fs.chmodSync(p, 0o600); const b = fs.readFileSync(p); fs.writeFileSync(p, b); fs.utimesSync(p, s.atime, s.mtime); if (m === 0) fs.chmodSync(p, 0); }}",
    # Truncate a regular file at the name to nothing and refill it with its own bytes.
    'O3-truncate-then-refill': f"{P} if (s.isFile()) {{ const m = s.mode & 0o777; if (m === 0) fs.chmodSync(p, 0o600); const b = fs.readFileSync(p); fs.truncateSync(p, 0); fs.appendFileSync(p, b); if (m === 0) fs.chmodSync(p, 0); }}",
    # Replace a regular file or a directory with a new one of the same type, mode and bytes (a new inode, unless the file system reuses its number).
    'O4-replace-with-new-inode': f"{P} const m = s.mode & 0o777; if (s.isFile()) {{ if (m === 0) fs.chmodSync(p, 0o600); const b = fs.readFileSync(p); fs.unlinkSync(p); fs.writeFileSync(p, b, {{ mode: 0o600 }}); fs.chmodSync(p, m); }} else if (s.isDirectory()) {{ fs.rmdirSync(p); fs.mkdirSync(p); fs.chmodSync(p, m); }}",
    # Drain a FIFO and write what it held back into it, so the pipe holds the same bytes.
    'O5-fifo-drain-and-refill': f"{P} if (s.isFIFO()) {{ const r = fs.openSync(p, fs.constants.O_RDONLY | fs.constants.O_NONBLOCK); const b = Buffer.alloc(65536); let n = 0; try {{ n = fs.readSync(r, b, 0, b.length, null); }} catch {{ n = 0; }} const w = fs.openSync(p, fs.constants.O_WRONLY | fs.constants.O_NONBLOCK); if (n > 0) fs.writeSync(w, b, 0, n); fs.closeSync(w); fs.closeSync(r); }}",
    # chmod a marker that is not a link to the mode it already has: every compared field, and the marker, stay as they were.
    'O6-chmod-to-the-same-mode': f"{P} if (!s.isSymbolicLink()) fs.chmodSync(p, s.mode & 0o7777);",
    # Rename the marker away and back.
    'O7-rename-away-and-back': f"{P} fs.renameSync(p, `${{p}}.away`); fs.renameSync(`${{p}}.away`, p);",
    # Through a link to a regular file, cycle the target's mode and rewrite its bytes unchanged (the link itself is untouched).
    'O8-link-target-chmod-cycle-rewrite': f"{P} if (s.isSymbolicLink()) {{ const t = fs.statSync(p); if (t.isFile()) {{ const b = fs.readFileSync(p); fs.chmodSync(p, 0); fs.chmodSync(p, 0o600); fs.writeFileSync(p, b); fs.chmodSync(p, t.mode & 0o777); }} }}",
}
sha = lambda b: hashlib.sha256(b).hexdigest()
git = lambda *a: subprocess.run(['git', '-C', str(ROOT), *a], capture_output=True, check=True).stdout


def run_suite():
    REPORT.unlink(missing_ok=True)
    proc = subprocess.Popen(COMMAND, cwd=ROOT, env={**os.environ, 'CI': '1', 'TMPDIR': TMP}, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, start_new_session=True)
    try:
        out, _ = proc.communicate(timeout=300)
    except subprocess.TimeoutExpired:
        os.killpg(proc.pid, signal.SIGKILL); proc.communicate(); return None, None, []
    if not REPORT.exists():
        return proc.returncode, None, [{'test': '<no report>', 'message': out.decode()[-2000:]}]
    rep = json.loads(REPORT.read_text())
    failed = [{'test': t['fullName'], 'message': '\n'.join(m for m in t['failureMessages'])[:1500]}
              for f in rep['testResults'] for t in f['assertionResults'] if t['status'] == 'failed']
    return proc.returncode, {k: rep[k] for k in ('numTotalTests', 'numPassedTests', 'numFailedTests')}, failed


def main():
    assert git('status', '--porcelain', '--untracked-files=no') == b'', 'tracked tree not clean'
    assert git('rev-parse', 'HEAD').strip().decode() == HEAD
    record = json.loads(git('show', f'{HEAD}:docs/evidence/launch-form-snapshot-ctime-mutants-2026-10-23.json'))
    chmod = next(m for m in record['mutants'] if m['id'] == 'R-chmod-cycle-rewrite' and m['tests'] == 'fix')['edits']
    mutants = {'R-chmod-cycle-rewrite (from the record)': [(e['file'], e['old'], e['new']) for e in chmod]}
    for rid in filter(None, os.environ.get('FROM_RECORD', '').split(',')):  # further record mutants, by id, from their stored fragments
        mutants[f'{rid} (from the record)'] = [(e['file'], e['old'], e['new']) for e in next(m for m in record['mutants'] if m['id'] == rid and m['tests'] == 'fix')['edits']]
    mutants.update({k: [(READER, ANCHOR, f"  if (state === 'unreadable') {{ try {{ {v} }} catch {{ /* rev519 mutant */ }}\n    return {MESSAGE}; }}")] for k, v in OWN.items()})
    if ONLY: mutants = {k: v for k, v in mutants.items() if k.split(' ')[0] in ONLY}
    sides = {'base': git('show', f'{BASE}:{TEST}'), 'head': (ROOT / TEST).read_bytes()}
    if os.environ.get('VARIANT_TEST'):  # a reviewer's scratch variant of the test, run instead of base and head (never committed)
        head = sides['head']; sides = {'variant': Path(os.environ['VARIANT_TEST']).read_bytes()}; sides_head = head
    else:
        sides_head = sides['head']
    reader = (ROOT / READER).read_bytes()
    results = {'tmpdir': TMP, 'filesystem': subprocess.run(['stat', '-f', '-c', '%T', TMP], capture_output=True, text=True).stdout.strip(),
               'kernel': os.uname().release, 'commit': HEAD, 'base': BASE, 'testSha256': {k: sha(v) for k, v in sides.items()},
               'readerSha256': sha(reader), 'command': ' '.join(COMMAND), 'mutants': []}
    try:
        for side, test in sides.items():
            (ROOT / TEST).write_bytes(test)
            code, counts, failed = run_suite()
            results['mutants'].append({'id': 'unmutated', 'side': side, 'exitCode': code, 'counts': counts, 'failed': failed})
            print('unmutated', side, counts, flush=True)
            for mid, edits in mutants.items():
                src = {READER: reader.decode(), TEST: test.decode()}
                assert all(src[f].count(o) == 1 for f, o, _ in edits), mid
                for f, o, n in edits: src[f] = src[f].replace(o, n)
                for f in src: (ROOT / f).write_bytes(src[f].encode())
                try:
                    code, counts, failed = run_suite()
                finally:
                    (ROOT / READER).write_bytes(reader); (ROOT / TEST).write_bytes(test)
                rows = sorted(t['test'][len(ROW):] for t in failed if t['test'].startswith(ROW))
                others = sorted(t['test'] for t in failed if not t['test'].startswith(ROW))
                results['mutants'].append({'id': mid, 'side': side, 'edits': [{'file': f, 'old': o, 'new': n} for f, o, n in edits], 'exitCode': code,
                                           'counts': counts, 'outcome': 'killed' if code is None or (code != 0 and failed) else 'survived',
                                           'failedRows': rows, 'otherFailed': others, 'firstFailure': failed[0] if failed else None,
                                           'restored': sha((ROOT / READER).read_bytes()) == sha(reader) and sha((ROOT / TEST).read_bytes()) == sha(test)})
                print(mid, side, results['mutants'][-1]['outcome'], counts, len(rows), others, flush=True)
    finally:
        (ROOT / READER).write_bytes(reader); (ROOT / TEST).write_bytes(sides_head)
    results['trackedTreeCleanAfter'] = git('status', '--porcelain', '--untracked-files=no') == b''
    OUT.write_text(json.dumps(results, indent=1) + '\n')
    print('clean after', results['trackedTreeCleanAfter'])


main()
