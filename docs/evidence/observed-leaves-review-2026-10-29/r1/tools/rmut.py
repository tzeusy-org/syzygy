#!/usr/bin/env python3
"""Reviewer mutants for PR 559 (syzygy-bpyt.4.26). Usage: rmut.py <clone> <out.json> <row id>...|all

Each row: exact-once edits {path, old, new}, a TMPDIR, the failing-name set it must give (or a set it must include, for rows
whose collateral failures are not the point). Runs review.test.ts alone with vitest's JSON reporter, restores, checks the clone
is clean."""
import json, os, subprocess, sys, time, shutil

TEST = 'packages/polaris-dossier/src/review.test.ts'
REVIEW = 'packages/polaris-dossier/src/review.ts'
OBSERVES = "review-check observes only the packet, its digest and that the verdict names it: the reviewer's reading, independence, completeness, identifiers and launch form stay Inferred"
LEAFY = 'review-check observes only the packet and its digest under a TMPDIR whose path holds a verdict leaf'

REPLACE_LINE = "    const text = JSON.stringify(holder, (_key, value: unknown) => typeof value === 'string' ? value.split(run).join('<run>') : value);\n"
TMPCHECK = "    expect(text).not.toContain(tmpdir());\n"
PROBE_AT = "  return { reviewerText, holderTexts };\n"
PROBE = ("  if (process.env['R559_PROBE']) fs.writeFileSync(path.join(process.env['R559_PROBE'], `probe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`), JSON.stringify({ run, tmpdir: tmpdir(), "
         "reviewerText, holderTexts, replaced: observedHolders.map((h) => JSON.stringify(h, (_k, v: unknown) => typeof v === 'string' ? v.split(run).join('<run>') : v)), "
         "runTwice: observedHolders.flatMap((h) => { const out: string[] = []; const walk = (v: unknown): void => { if (typeof v === 'string') { if (v.split(run).length > 2) out.push(v); } else if (v !== null && typeof v === 'object') Object.values(v).forEach(walk); }; walk(h); return out; }) }));\n")
FID_REPORT = "    command: 'review-packet', outcome: 'built', run: opened.run, kind: 'fidelity', packetSha256: built.sha256, directory,\n"
RESTORE = "      if (outer === undefined) delete process.env['TMPDIR']; else process.env['TMPDIR'] = outer;\n"

def e(p, o, n): return {'path': p, 'old': o, 'new': n}

# id: (tmpdir kind, edits, mode, names) — mode 'exact' or 'includes'
ROWS = {
    'P0-probe-plain': ('plain', [e(TEST, PROBE_AT, PROBE + PROBE_AT)], 'exact', []),
    'P0P-probe-p1': ('p1', [e(TEST, PROBE_AT, PROBE + PROBE_AT)], 'exact', []),
    # A replacement that misses one holder: the CLI review-packet holder (the one carrying `command`) is read as emitted.
    'R1-cli-holder-unreplaced': ('plain', [e(TEST, REPLACE_LINE, "    const text = 'command' in holder ? JSON.stringify(holder) : JSON.stringify(holder, (_key, value: unknown) => typeof value === 'string' ? value.split(run).join('<run>') : value);\n")], 'exact', [OBSERVES, LEAFY]),
    # The same miss with the tmpdir refusal dropped: under a plain TMPDIR nothing is left to fail; under a p1 TMPDIR the leaf does.
    'R1B-cli-holder-unreplaced-no-tmpcheck-plain': ('plain', [e(TEST, REPLACE_LINE, "    const text = 'command' in holder ? JSON.stringify(holder) : JSON.stringify(holder, (_key, value: unknown) => typeof value === 'string' ? value.split(run).join('<run>') : value);\n"), e(TEST, TMPCHECK, '')], 'exact', [LEAFY]),
    'R1BP-cli-holder-unreplaced-no-tmpcheck-p1': ('p1', [e(TEST, REPLACE_LINE, "    const text = 'command' in holder ? JSON.stringify(holder) : JSON.stringify(holder, (_key, value: unknown) => typeof value === 'string' ? value.split(run).join('<run>') : value);\n"), e(TEST, TMPCHECK, '')], 'exact', [OBSERVES, LEAFY]),
    # Only the first occurrence in each string replaced.
    'R2-first-occurrence-only': ('p1', [e(TEST, "value.split(run).join('<run>')", "value.replace(run, '<run>')")], 'exact', []),
    # A real verdict leaf beside the run path in an emitted holder (product edit): run path followed by the leaf.
    'R3-leaf-after-run-path': ('plain', [e(REVIEW, FID_REPORT, FID_REPORT.replace('run: opened.run,', 'run: `${opened.run}p1`,'))], 'includes', [OBSERVES, LEAFY]),
    # The leaf before the run path.
    'R3B-leaf-before-run-path': ('plain', [e(REVIEW, FID_REPORT, FID_REPORT.replace('run: opened.run,', 'run: `p1${opened.run}`,'))], 'includes', [OBSERVES, LEAFY]),
    # The leaf as a directory segment under the run path.
    'R3C-leaf-as-segment-under-run': ('plain', [e(REVIEW, FID_REPORT, FID_REPORT.replace('directory,\n', 'directory: path.join(directory, \'p1\'),\n'))], 'includes', [OBSERVES, LEAFY]),
    # A verdict leaf of another kind (the sessionId) beside the run path.
    'R3D-session-id-beside-run': ('plain', [e(REVIEW, FID_REPORT, FID_REPORT.replace('run: opened.run,', 'run: `${opened.run}/reviewer-1`,'))], 'includes', [OBSERVES, LEAFY]),
    # The new row never restores TMPDIR: later rows mkdtemp under the deleted leafy directory.
    'R4-no-restore': ('plain', [e(TEST, RESTORE, '')], 'includes', []),
    # The digest refusal removed and every string emptied of the run but the digest dropped from one holder (product edit).
    'R5-digest-dropped-from-cli-holder': ('plain', [e(REVIEW, FID_REPORT, FID_REPORT.replace('packetSha256: built.sha256,', "packetSha256: 'x',"))], 'includes', [OBSERVES, LEAFY]),
    # A path outside the run directory but under os.tmpdir(), spelled with the run path as its prefix (a sibling): the tmpdir refusal
    # the body lists does not fire, since the run-path replacement eats the prefix. Neither observed-only row may fail.
    'R6-sibling-of-run-not-refused': ('plain', [e(REVIEW, FID_REPORT, FID_REPORT.replace('directory,\n', 'directory: `${opened.run}-elsewhere`,\n'))], 'excludes', [OBSERVES, LEAFY]),
    # A path outside os.tmpdir() whose spelling starts with it (TMPDIR + '-other'): refused, though the body lists no such refusal.
    'R7-path-outside-tmpdir-refused': ('plain', [e(REVIEW, FID_REPORT, FID_REPORT.replace('directory,\n', 'directory: `${path.dirname(path.dirname(opened.run))}-other`,\n'))], 'includes', [OBSERVES, LEAFY]),
    # The old check (eb6183b5: raw holder JSON, no tmpdir or digest assertion) over the same product mutants, for the differential.
    'OLD-R3-leaf-after-run-path': ('plain', [e(TEST, REPLACE_LINE + TMPCHECK + "    expect(text).toContain(digest);\n", '    const text = JSON.stringify(holder);\n'), e(REVIEW, FID_REPORT, FID_REPORT.replace('run: opened.run,', 'run: `${opened.run}p1`,'))], 'record', []),
    'OLD-R6-sibling-of-run': ('plain', [e(TEST, REPLACE_LINE + TMPCHECK + "    expect(text).toContain(digest);\n", '    const text = JSON.stringify(holder);\n'), e(REVIEW, FID_REPORT, FID_REPORT.replace('directory,\n', 'directory: `${opened.run}-elsewhere`,\n'))], 'record', []),
    'OLD-R7-path-outside-tmpdir': ('plain', [e(TEST, REPLACE_LINE + TMPCHECK + "    expect(text).toContain(digest);\n", '    const text = JSON.stringify(holder);\n'), e(REVIEW, FID_REPORT, FID_REPORT.replace('directory,\n', 'directory: `${path.dirname(path.dirname(opened.run))}-other`,\n'))], 'record', []),
    'OLD-R5-digest-dropped': ('plain', [e(TEST, REPLACE_LINE + TMPCHECK + "    expect(text).toContain(digest);\n", '    const text = JSON.stringify(holder);\n'), e(REVIEW, FID_REPORT, FID_REPORT.replace('packetSha256: built.sha256,', "packetSha256: 'x',"))], 'record', []),
}

def main():
    clone, out_path, *ids = sys.argv[1:]
    if ids == ['all']: ids = list(ROWS)
    git = lambda *a: subprocess.run(['git', '-C', clone, *a], capture_output=True, text=True, check=True).stdout
    assert git('status', '--porcelain') == ''
    base_tmp = '/tmp/r559-m'
    results = []
    for rid in ids:
        kind, edits, mode, names = ROWS[rid]
        tmp = base_tmp + ('-p1' if kind == 'p1' else '-qx')
        shutil.rmtree(tmp, ignore_errors=True); os.makedirs(tmp)
        probe = os.path.join(os.path.dirname(os.path.abspath(out_path)), 'probes', rid); os.makedirs(probe, exist_ok=True)
        saved = {}
        for ed in edits:
            p = os.path.join(clone, ed['path'])
            saved.setdefault(p, open(p, encoding='utf8').read())
            cur = open(p, encoding='utf8').read()
            assert cur.count(ed['old']) == 1, (rid, ed['old'][:80], cur.count(ed['old']))
            open(p, 'w', encoding='utf8').write(cur.replace(ed['old'], ed['new']))
        load = open('/proc/loadavg').read().split()[0]
        t0 = time.time()
        rep = os.path.join(tmp, 'report.json')
        try:
            proc = subprocess.run(['npx', 'vitest', 'run', TEST, '--reporter=json', f'--outputFile={rep}'], cwd=clone, capture_output=True, text=True,
                                  env={**os.environ, 'TMPDIR': tmp, 'R559_PROBE': probe}, timeout=1200)
        finally:
            for p, body in saved.items(): open(p, 'w', encoding='utf8').write(body)
        r = json.load(open(rep))
        failed = sorted(f"{' '.join(a['ancestorTitles'])} {a['title']}" for tr in r['testResults'] for a in tr['assertionResults'] if a['status'] == 'failed')
        msgs = {f"{' '.join(a['ancestorTitles'])} {a['title']}": (a['failureMessages'][0].splitlines()[0][:300] if a['failureMessages'] else '')
                for tr in r['testResults'] for a in tr['assertionResults'] if a['status'] == 'failed'}
        ok = True if mode == 'record' else failed == sorted(names) if mode == 'exact' else (not (set(names) & set(failed))) if mode == 'excludes' else (set(names) <= set(failed) and (failed != [] or names == []))
        if rid == 'R4-no-restore': ok = len(failed) > 0 and LEAFY not in failed
        results.append({'id': rid, 'tmpdir': tmp, 'edits': edits, 'mode': mode, 'expected': sorted(names), 'failing': failed, 'messages': msgs,
                        'exit': proc.returncode, 'passed': r['numPassedTests'], 'failed': r['numFailedTests'], 'total': r['numTotalTests'],
                        'asExpected': ok, 'load1': float(load), 'seconds': round(time.time() - t0, 1)})
        print(rid, 'as expected' if ok else 'UNEXPECTED', proc.returncode, r['numPassedTests'], r['numFailedTests'], load, flush=True)
        shutil.rmtree(tmp, ignore_errors=True)
    status = git('status', '--porcelain')
    json.dump({'commit': git('rev-parse', 'HEAD').strip(), 'statusAfter': status, 'rows': results}, open(out_path, 'w'), indent=1)
    print('status after', repr(status))

if __name__ == '__main__':
    main()
