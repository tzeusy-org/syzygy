#!/usr/bin/env python3
"""Rule-6 mutants of scripts/size_vitest_test_timeouts.py --check, reproduced and extended (rev-520).

usage: python3 -I mutants.py TREE OUT.json
File mutants rewrite one fragment (which must occur exactly once) in TREE, run --check, then restore with git checkout.
Record mutants change one duration in a copy of a record under a temporary directory and pass the copy instead.
Each result stores the commit, the old/new fragment, the exit code and the script's output."""
import copy, json, os, subprocess, sys, tempfile

tree, out_path = os.path.abspath(sys.argv[1]), sys.argv[2]
FILE = 'packages/polaris-generation-consent/src/package-reader.test.ts'
E = 'docs/evidence/syzygy-bpyt-4-13'
commit = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=tree, capture_output=True, text=True, check=True).stdout.strip()
def clean(): return not subprocess.run(['git', 'status', '--porcelain', '--untracked-files=no'], cwd=tree, capture_output=True, text=True, check=True).stdout
assert clean(), 'tree not clean'

def check(records=None, report=None):
    records = records or [f'{E}/before-alone.json', f'{E}/before-full-1.json', f'{E}/before-full-2.json']
    report = report or f'{E}/load-127-report-extract.json'
    with tempfile.TemporaryDirectory() as tmp:
        cmd = ['python3', '-I', 'scripts/size_vitest_test_timeouts.py', '.', '--file', FILE, '--project', '@syzygy/polaris-generation-consent']
        for r in records: cmd += ['--record', r]
        cmd += ['--report', report, '8b143272113f216c797684d7c28cd3204831248f', '127.56', '83.31', '--out', os.path.join(tmp, 'o.json'), '--check']
        done = subprocess.run(cmd, cwd=tree, capture_output=True, text=True)
    lines = [l.strip() for l in (done.stdout + done.stderr).split('\n') if l.strip() and not l.startswith('   ') or 'problem' in l]
    return done.returncode, [l for l in lines if 'collected' in l or 'problem' in l or 'share a name' in l or 'failed' in l][:6]

results = []
def file_mutant(mid, what, path, old, new, expect):
    full = os.path.join(tree, path)
    text = open(full, encoding='utf8').read()
    assert text.count(old) == 1, f'{mid}: anchor occurs {text.count(old)} times'
    open(full, 'w', encoding='utf8').write(text.replace(old, new))
    try:
        code, output = check()
    finally:
        subprocess.run(['git', 'checkout', '--', path], cwd=tree, check=True)
    assert clean()
    results.append({'id': mid, 'what': what, 'file': path, 'old': old, 'new': new, 'expectedExit': expect, 'exitCode': code, 'asExpected': code == expect, 'output': output})
    print(mid, 'exit', code, 'expected', expect, output, flush=True)

def record_mutant(mid, what, which, test, run, new_ms, expect):
    with tempfile.TemporaryDirectory() as tmp:
        src = os.path.join(tree, which)
        d = json.load(open(src))
        if 'testResults' in d:
            hits = [a for a in d['testResults'][0]['assertionResults'] if a['fullName'] == test]
            assert len(hits) == 1
            old = hits[0]['duration']; hits[0]['duration'] = new_ms
            dst = os.path.join(tmp, os.path.basename(which)); json.dump(d, open(dst, 'w'))
            code, output = check(report=dst)
        else:
            hits = [t for r in d['runs'] if r['index'] == run for t in r['tests'] if t['name'] == test]
            assert len(hits) == 1
            old = hits[0]['durationMs']; hits[0]['durationMs'] = new_ms
            dst = os.path.join(tmp, os.path.basename(which)); json.dump(d, open(dst, 'w'))
            recs = [dst if r == which else r for r in (f'{E}/before-alone.json', f'{E}/before-full-1.json', f'{E}/before-full-2.json')]
            code, output = check(records=recs)
    results.append({'id': mid, 'what': what, 'record': which, 'test': test, 'run': run, 'old': {'durationMs': old}, 'new': {'durationMs': new_ms},
                    'expectedExit': expect, 'exitCode': code, 'asExpected': code == expect, 'output': output})
    print(mid, 'exit', code, 'expected', expect, output, flush=True)

AGREE = 'the policy port and the strict policy chain agree on every world in the fixture set, at every instant'
UNSIZED = 'package admission reader refuses when the decisions directory cannot be listed'
code, output = check(); results.append({'id': 'M0', 'what': 'unmutated control', 'exitCode': code, 'expectedExit': 0, 'asExpected': code == 0, 'output': output}); print('M0', code, output)
# Reproductions of the implementer's M1, M3, M5, M6 (fragments as recorded in sizing-check-mutants.json)
file_mutant('M1', 'a sized timeout below the rule', FILE, '  }, 50_000);\n});\n', '  }, 45_000);\n});\n', 1)
file_mutant('M3', 'an explicit timeout on a test the rule does not size', FILE,
            "    await expect(createPackageAdmissionReader({ root: '/missing', fs: memoryFs(world()) }).read()).rejects.toBeInstanceOf(AdmissionRecordError);\n  });\n",
            "    await expect(createPackageAdmissionReader({ root: '/missing', fs: memoryFs(world()) }).read()).rejects.toBeInstanceOf(AdmissionRecordError);\n  }, 15_000);\n", 1)
file_mutant('M4', 'a measured test renamed', FILE, "it('refuses when the decisions directory cannot be listed'", "it('refuses when the decisions directory cannot be listed, renamed'", 1)
record_mutant('M5', 'an unsized test measured at 2,501 ms', f'{E}/before-alone.json', UNSIZED, 1, 2501, 1)
record_mutant('M6', 'the same test at exactly 2,500 ms (rule is strictly above: expected to pass)', f'{E}/before-alone.json', UNSIZED, 1, 2500, 0)
# Reviewer's own mutants
file_mutant('R1', 'a sized timeout above the rule (the direction that hides a hang)', FILE, '  }, 50_000);\n});\n', '  }, 55_000);\n});\n', 1)
file_mutant('R2', 'a second test with a name the file already has', FILE,
            "  it('refuses when the decisions directory cannot be listed', async () => {",
            "  it('refuses when the decisions directory cannot be listed', () => {});\n  it('refuses when the decisions directory cannot be listed', async () => {", 1)
file_mutant('R3', 'a new test no record measured', FILE,
            "  it('refuses when the decisions directory cannot be listed', async () => {",
            "  it('a new test no record measured', () => {});\n  it('refuses when the decisions directory cannot be listed', async () => {", 1)
record_mutant('R4a', 'rounding boundary: agreement test worst 16,666 ms in the load-127 extract (x3 = 49,998, rounds to 50,000: expected to pass)',
              f'{E}/load-127-report-extract.json', AGREE, None, 16666.4, 0)
record_mutant('R4b', 'rounding boundary: agreement test worst 16,667 ms (x3 = 50,001, rounds to 55,000: expected to fail)',
              f'{E}/load-127-report-extract.json', AGREE, None, 16667, 1)
file_mutant('R5', 'the consent project default raised to 60 s in vitest.config.ts (the bead forbids raising the default)', 'vitest.config.ts',
            "          name: '@syzygy/polaris-generation-consent',\n          include: ['packages/polaris-generation-consent/src/**/*.test.ts'],\n",
            "          name: '@syzygy/polaris-generation-consent',\n          include: ['packages/polaris-generation-consent/src/**/*.test.ts'],\n          testTimeout: 60_000,\n", 1)
json.dump({'schema': 'rev-520-sizing-mutants/1', 'commit': commit, 'results': results}, open(out_path, 'w'), indent=1)
print('as expected:', sum(r['asExpected'] for r in results), 'of', len(results), '| tree clean:', clean())
