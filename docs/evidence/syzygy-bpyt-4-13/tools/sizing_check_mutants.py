#!/usr/bin/env python3
"""Rule-6 mutants of scripts/size_vitest_test_timeouts.py --check (syzygy-bpyt.4.13). Evidence tool, not authority.

usage: python3 -I docs/evidence/syzygy-bpyt-4-13/tools/sizing_check_mutants.py TREE OUT.json

M0 is the unmutated control. Each file mutant rewrites one fragment, which must occur exactly once, runs --check, and writes the
file's original bytes back. Each record mutant changes one duration in a copy of a record and passes the copy instead. A mutant is
killed when --check exits 1. M6 sits exactly at the threshold and is expected to pass, since the rule is strictly above it. R5 is
the round-1 reviewer's: the consent project's default raised to 60 s. TREE's tracked files must be clean, and are clean again after."""
import hashlib, json, os, subprocess, sys, tempfile

tree, out_path = os.path.abspath(sys.argv[1]), sys.argv[2]
F = 'packages/polaris-generation-consent/src/package-reader.test.ts'
E = 'docs/evidence/syzygy-bpyt-4-13'
LISTED = "    await expect(createPackageAdmissionReader({ root: '/missing', fs: memoryFs(world()) }).read()).rejects.toBeInstanceOf(AdmissionRecordError);\n  });\n"
NAME = 'package admission reader refuses when the decisions directory cannot be listed'
CONSENT = "          name: '@syzygy/polaris-generation-consent',\n          include: ['packages/polaris-generation-consent/src/**/*.test.ts'],\n"
FILE_MUTANTS = [
    ('M1', 'a sized timeout below the rule', F, '  }, 50_000);\n});\n', '  }, 45_000);\n});\n'),
    ('M2', 'a sized test without its timeout', F, '  }, 10_000);\n', '  });\n'),
    ('M3', 'an explicit timeout on a test the rule does not size', F, LISTED, LISTED.replace('  });\n', '  }, 15_000);\n')),
    ('M4', 'a measured test renamed', F, "it('refuses when the decisions directory cannot be listed'", "it('refuses when the decisions directory cannot be listed, renamed'"),
    ('R5', 'the consent project default raised to 60 s in vitest.config.ts (round-1 reviewer)', 'vitest.config.ts', CONSENT, CONSENT + '          testTimeout: 60_000,\n'),
]
RECORDS = [f'{E}/before-alone.json', f'{E}/before-full-1.json', f'{E}/before-full-2.json']
git = lambda *a: subprocess.run(['git', *a], cwd=tree, capture_output=True, text=True, check=True).stdout
if git('status', '--porcelain', '--untracked-files=no'): sys.exit('tracked files not clean')

def check(records, tmp, label):
    cmd = ['python3', '-I', 'scripts/size_vitest_test_timeouts.py', '.', '--file', F, '--project', '@syzygy/polaris-generation-consent',
           *sum((['--record', r] for r in records), []), '--report', f'{E}/load-127-report-extract.json', '8b143272113f216c797684d7c28cd3204831248f', '127.56', '83.31',
           '--out', os.path.join(tmp, f'{label}.json'), '--check']
    done = subprocess.run(cmd, cwd=tree, capture_output=True, text=True)
    return cmd, done.returncode, [l.strip() for l in done.stdout.split('\n') if l.strip().startswith('problem:') or 'collected,' in l]

results = []
with tempfile.TemporaryDirectory() as tmp:
    cmd0, rc, lines = check(RECORDS, tmp, 'M0')
    results.append({'id': 'M0', 'what': 'unmutated (the control)', 'expectedExit': 0, 'exitCode': rc, 'output': lines})
    for mid, what, path, old, new in FILE_MUTANTS:
        full = os.path.join(tree, path)
        original = open(full, encoding='utf8').read()
        if original.count(old) != 1: sys.exit(f'{mid}: the old fragment occurs {original.count(old)} times in {path}')
        open(full, 'w', encoding='utf8').write(original.replace(old, new))
        try: _, rc, lines = check(RECORDS, tmp, mid)
        finally: open(full, 'w', encoding='utf8').write(original)
        results.append({'id': mid, 'what': what, 'file': path, 'old': old, 'new': new, 'expectedExit': 1, 'exitCode': rc, 'output': lines})
    for mid, what, value, expected in (('M5', 'an unsized test measured above the threshold in one record', 2501, 1),
                                       ('M6', 'the same test at exactly the threshold (expected to pass: the rule is strictly above)', 2500, 0)):
        record = json.load(open(os.path.join(tree, RECORDS[0]), encoding='utf8'))
        hits = [t for t in record['runs'][0]['tests'] if t['name'] == NAME]
        if len(hits) != 1: sys.exit(f'{mid}: {len(hits)} tests named {NAME}')
        old_value, hits[0]['durationMs'] = hits[0]['durationMs'], value
        mutated = os.path.join(tmp, f'{mid}-before-alone.json')
        json.dump(record, open(mutated, 'w', encoding='utf8'))
        _, rc, lines = check([mutated, *RECORDS[1:]], tmp, mid)
        results.append({'id': mid, 'what': what, 'record': RECORDS[0], 'test': NAME, 'run': 1, 'old': {'durationMs': old_value}, 'new': {'durationMs': value},
                        'expectedExit': expected, 'exitCode': rc, 'output': lines})
    command = 'python3 -I ' + ' '.join(cmd0[2:]).replace(tmp, '<tmp>')
for r in results: r['asExpected'] = r['exitCode'] == r['expectedExit']
sha = lambda path: hashlib.sha256(open(path, 'rb').read()).hexdigest()
out = {'schema': 'sizing-check-mutants/2', 'bead': 'syzygy-bpyt.4.13',
       'text': 'Evidence record, not authority: rule-6 mutants of scripts/size_vitest_test_timeouts.py --check. Each file mutant rewrites one fragment and writes the original back; each record mutant changes one duration in a copy of a record. Generated by the tool named here; do not edit.',
       'tool': {'path': 'docs/evidence/syzygy-bpyt-4-13/tools/sizing_check_mutants.py', 'sha256': sha(__file__)},
       'commit': git('rev-parse', 'HEAD').strip(), 'checkScript': {'path': 'scripts/size_vitest_test_timeouts.py', 'sha256': sha(os.path.join(tree, 'scripts/size_vitest_test_timeouts.py'))},
       'command': command, 'results': results, 'allAsExpected': all(r['asExpected'] for r in results)}
open(out_path, 'w', encoding='utf8').write(json.dumps(out, indent=1) + '\n')
for r in results: print(r['id'], 'exit', r['exitCode'], 'expected', r['expectedExit'], '|', ' | '.join(r['output'][:2])[:220])
if git('status', '--porcelain', '--untracked-files=no'): sys.exit('tree not restored')
