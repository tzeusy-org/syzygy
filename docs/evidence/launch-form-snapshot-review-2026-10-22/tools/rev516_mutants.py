"""Reviewer rule-6 harness for PR 516 (syzygy-bpyt.8.24), run in a scratch clone only.

Each mutant is applied to the clone's files by exact string replacement (each `old` must occur exactly once), the one test file is
run alone with vitest's JSON reporter, the files are restored, and their sha256 is checked against the original. The base side
writes `launched.test.ts` at a0406967 over the clone's copy; the fix side uses the clone's copy at bddbbf6c (equal to 5c2b34da's).

Usage: python3 -I rev516_mutants.py <clone> <out.json> <tmpdir> <mutant-id>[,<mutant-id>...] <side>[,<side>...]
       python3 -I rev516_mutants.py <clone> --compare-record <record.json>
"""
import hashlib
import json
import os
import signal
import subprocess
import sys
import time

READER = 'packages/polaris-dossier/src/launched.ts'
TEST = 'packages/polaris-dossier/src/launched.test.ts'
BASE = 'a04069678c02881cd41a25b850e14f79d581c083'
HEAD = 'bddbbf6c3ef2cd3fff2b73946356c57fc5bd5353'

# Appendix A of docs/reviews/R-GP-IMPL-LAUNCH-FORM-POSTCONDITION-1-RAW.md, transcribed by this reviewer.
REFUSAL = "the run\\'s launched marker is present but cannot be read as the one Syzygy writes, so no launch form counts, declared or syzygy-launched"
REFUSAL_LINE = f"  if (state === 'unreadable') return '{REFUSAL}';"


def refusal_with(body: str) -> str:
    return f"  if (state === 'unreadable') {{ {body}\n    return '{REFUSAL}'; }}"


REMOVE_ANY = ("try { fs.rmSync(path.join(runDir, RUN_LAYOUT.launched), { recursive: true, force: true }); } catch { /* reviewer mutant */ } "
              "try { fs.unlinkSync(path.join(runDir, RUN_LAYOUT.launched)); } catch { /* reviewer mutant */ }")
READER_HEAD = 'export function launchedMarkerState(runDir: string): LaunchedMarkerState {\n  const file = path.join(runDir, RUN_LAYOUT.launched);'
MEMO_HEAD = ('const REMEMBERED = new Map<string, LaunchedMarkerState>();\nexport function launchedMarkerState(runDir: string): LaunchedMarkerState {\n'
             '  const hit = REMEMBERED.get(runDir); if (hit) return hit;\n'
             '  const state = launchedMarkerStateOnce(runDir); REMEMBERED.set(runDir, state); return state;\n}\n\n'
             'function launchedMarkerStateOnce(runDir: string): LaunchedMarkerState {\n  const file = path.join(runDir, RUN_LAYOUT.launched);')

# This reviewer's own mutants (not in Appendix A).
SAME_SIZE_REWRITE = ("try { const p = path.join(runDir, RUN_LAYOUT.launched); const s = fs.statSync(p); "
                     "if (s.isFile() && s.size > 0) fs.writeFileSync(p, ' '.repeat(s.size)); } catch { /* reviewer mutant */ }")
CHMOD_CYCLE_REWRITE = ("try { const p = path.join(runDir, RUN_LAYOUT.launched); const s = fs.lstatSync(p); "
                       "if (s.isFile() && (s.mode & 0o777) === 0) { fs.chmodSync(p, 0o600); fs.writeFileSync(p, ' '.repeat(s.size)); fs.chmodSync(p, 0o000); } } "
                       "catch { /* reviewer mutant */ }")
FILL_DANGLING_TARGET = ("try { const p = path.join(runDir, RUN_LAYOUT.launched); if (fs.lstatSync(p).isSymbolicLink()) { const t = fs.readlinkSync(p); "
                        "if (!fs.existsSync(t)) fs.writeFileSync(t, '{\"format\": \"polaris-dossier-launched/1\"}'); } } catch { /* reviewer mutant */ }")
FIFO_TO_EMPTY_FILE = ("try { const p = path.join(runDir, RUN_LAYOUT.launched); if (fs.lstatSync(p).isFIFO()) { fs.unlinkSync(p); fs.writeFileSync(p, ''); } } "
                      "catch { /* reviewer mutant */ }")

MUTANTS = {
    'D1-with-memoized-reader': [(READER, REFUSAL_LINE, refusal_with(REMOVE_ANY)), (READER, READER_HEAD, MEMO_HEAD)],
    'D1-terminal-only': [(READER, REFUSAL_LINE, refusal_with(f"if (form['value'] === 'terminal') {{ {REMOVE_ANY} }}"))],
    'D1-bang-only': [(READER, REFUSAL_LINE, refusal_with(f"if (form['value'] === 'bang') {{ {REMOVE_ANY} }}"))],
    'D1-syzygy-launched-only': [(READER, REFUSAL_LINE, refusal_with(f"if (form['value'] === SYZYGY_LAUNCHED) {{ {REMOVE_ANY} }}"))],
    'D1-any-remover': [(READER, REFUSAL_LINE, refusal_with(REMOVE_ANY))],
    'D3-repair-to-launched': [(READER, REFUSAL_LINE, refusal_with(f"{REMOVE_ANY} try {{ writeLaunchedMarker(runDir, 'run-x', 0); }} catch {{ /* reviewer mutant */ }}"))],
    'D4-truncate': [(READER, REFUSAL_LINE, refusal_with("try { fs.truncateSync(path.join(runDir, RUN_LAYOUT.launched), 0); } catch { /* reviewer mutant */ }"))],
    'M-every-form-drains-then-refuses': [
        (READER, "    if (!stat.isFile() || stat.size > MARKER_BYTES_MAX) return 'unreadable';", "    if (stat.size > MARKER_BYTES_MAX) return 'unreadable';"),
        (READER, "    if (length > MARKER_BYTES_MAX) return 'unreadable';", "    if (length > MARKER_BYTES_MAX || !stat.isFile()) return 'unreadable';"),
    ],
    'T-ask-of-an-unplanted-run': [(TEST, '      const dir = planted();', '      const dir = runDir();')],
    'R-same-size-rewrite': [(READER, REFUSAL_LINE, refusal_with(SAME_SIZE_REWRITE))],
    'R-chmod-cycle-rewrite': [(READER, REFUSAL_LINE, refusal_with(CHMOD_CYCLE_REWRITE))],
    'R-fill-dangling-target': [(READER, REFUSAL_LINE, refusal_with(FILL_DANGLING_TARGET))],
    'R-fifo-to-empty-file': [(READER, REFUSAL_LINE, refusal_with(FIFO_TO_EMPTY_FILE))],
    'none': [],
}


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_show(clone: str, commit: str, path: str) -> bytes:
    return subprocess.run(['git', '-C', clone, 'show', f'{commit}:{path}'], check=True, capture_output=True).stdout


def compare_record(clone: str, record_path: str) -> None:
    rec = json.load(open(record_path))
    seen = set()
    for m in rec['mutants']:
        if m['id'] in seen:
            continue
        seen.add(m['id'])
        mine = MUTANTS.get(m['id'])
        theirs = [(e['file'], e['old'], e['new']) for e in m['edits']]
        print(m['id'], 'identical to this transcription of Appendix A' if mine == theirs else f'DIFFERS: mine={mine!r} theirs={theirs!r}')
    base_reader = git_show(clone, BASE, READER).decode()
    for mid, edits in MUTANTS.items():
        for path, old, _new in edits:
            src = base_reader if path == READER else git_show(clone, BASE, TEST).decode()
            print(f'  {mid}: old occurs {src.count(old)} time(s) in {path} at base')


def run_one(clone: str, mutant: str, side: str, out_dir: str, tmpdir: str) -> dict:
    originals = {p: open(os.path.join(clone, p), 'rb').read() for p in (READER, TEST)}
    orig_sha = {p: sha(b) for p, b in originals.items()}
    texts = {p: b.decode() for p, b in originals.items()}
    if side == 'base':
        texts[TEST] = git_show(clone, BASE, TEST).decode()
    if side == 'fixctime':
        # This review's proposed strengthening (N1), a scratch edit only: the snapshot also holds the marker's ctime, exactly.
        old = '  return { mode: stat.mode, ino: stat.ino, size: stat.size, link:'
        new = '  return { mode: stat.mode, ino: stat.ino, size: stat.size, ctimeNs: fs.lstatSync(marker(dir), { bigint: true }).ctimeNs, link:'
        if texts[TEST].count(old) != 1:
            raise SystemExit('fixctime: return line not found once')
        texts[TEST] = texts[TEST].replace(old, new)
    if side == 'probe':
        # A scratch edit only: log what each ask's `before` snapshot holds, per row and form, to the file named by R516_PROBE.
        old = '      const before = markerSnapshot(dir);\n'
        new = old + ("      fs.appendFileSync(process.env['R516_PROBE'] as string, JSON.stringify({ row: _name, form: form['value'], "
                     "fields: before === null ? null : Object.keys(before), mode: before === null ? null : before['mode'], "
                     "bytes: before === null || before['bytes'] === null ? null : Buffer.from(before['bytes'] as string, 'base64').length, "
                     "link: before === null ? null : before['link'] }) + '\\n');\n")
        if texts[TEST].count(old) != 1:
            raise SystemExit('probe: before line not found once')
        texts[TEST] = texts[TEST].replace(old, new)
    for path, old, new in MUTANTS[mutant]:
        count = texts[path].count(old)
        if count != 1:
            raise SystemExit(f'{mutant}: old fragment occurs {count} times in {path}')
        texts[path] = texts[path].replace(old, new)
    report = os.path.join(out_dir, f'{mutant}--{side}.vitest.json')
    if os.path.exists(report):
        os.remove(report)
    result = {'mutant': mutant, 'side': side, 'testSha256': sha(texts[TEST].encode()), 'readerSha256': sha(texts[READER].encode())}
    try:
        for p in (READER, TEST):
            open(os.path.join(clone, p), 'w').write(texts[p])
        env = dict(os.environ, CI='1', TMPDIR=tmpdir)
        cmd = ['npx', 'vitest', 'run', '--project', '@syzygy/polaris-dossier', '--reporter=json', f'--outputFile={report}', TEST]
        started = time.time()
        proc = subprocess.Popen(cmd, cwd=clone, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, start_new_session=True)
        try:
            out, _ = proc.communicate(timeout=300)
            result['timedOut'] = False
        except subprocess.TimeoutExpired:
            os.killpg(proc.pid, signal.SIGKILL)  # this harness's own process group only
            out, _ = proc.communicate()
            result['timedOut'] = True
        result['seconds'] = round(time.time() - started, 1)
        result['exitCode'] = proc.returncode
        result['stdoutTail'] = out.decode(errors='replace')[-600:]
    finally:
        for p, b in originals.items():
            open(os.path.join(clone, p), 'wb').write(b)
        restored = {p: sha(open(os.path.join(clone, p), 'rb').read()) for p in (READER, TEST)}
        result['restored'] = restored == orig_sha
    if os.path.exists(report):
        data = json.load(open(report))
        result['counts'] = {k: data[k] for k in ('numTotalTests', 'numPassedTests', 'numFailedTests')}
        failed = []
        for f in data['testResults']:
            for a in f['assertionResults']:
                if a['status'] == 'failed':
                    msg = (a.get('failureMessages') or [''])[0]
                    first = msg.splitlines()[0] if msg else ''
                    frame = next((ln.strip() for ln in msg.splitlines() if 'launched.test.ts:' in ln), '')
                    failed.append({'test': a['fullName'], 'firstErrorLine': first, 'testFrame': frame})
        result['failedTests'] = failed
    result['outcome'] = 'killed' if result.get('timedOut') or (result['exitCode'] != 0 and result.get('failedTests')) else (
        'survived' if result['exitCode'] == 0 else 'blocked')
    return result


def main() -> None:
    clone = sys.argv[1]
    if sys.argv[2] == '--compare-record':
        compare_record(clone, sys.argv[3])
        return
    out_path, tmpdir = sys.argv[2], sys.argv[3]
    mutants, sides = sys.argv[4].split(','), sys.argv[5].split(',')
    out_dir = os.path.dirname(out_path)
    results = []
    status = subprocess.run(['git', '-C', clone, 'status', '--porcelain', '--untracked-files=no'], capture_output=True, text=True).stdout
    if status.strip():
        raise SystemExit(f'clone not clean before run: {status!r}')
    for mutant in mutants:
        for side in sides:
            r = run_one(clone, mutant, side, out_dir, tmpdir)
            print(json.dumps({k: r.get(k) for k in ('mutant', 'side', 'outcome', 'exitCode', 'counts', 'seconds', 'restored', 'timedOut')}), flush=True)
            results.append(r)
            json.dump({'head': HEAD, 'base': BASE, 'results': results}, open(out_path, 'w'), indent=1)
    status = subprocess.run(['git', '-C', clone, 'status', '--porcelain', '--untracked-files=no'], capture_output=True, text=True).stdout
    print('tracked tree clean after:', status.strip() == '', flush=True)


if __name__ == '__main__':
    main()
