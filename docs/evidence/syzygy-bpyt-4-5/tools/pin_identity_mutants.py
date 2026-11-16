#!/usr/bin/env python3
"""Rule-6 mutants against build_record.py's pin-identity check (syzygy-bpyt.4.5). Evidence tool, not authority.

usage: python3 -I pin_identity_mutants.py TREE OUT.json BASE MAIN EVIDENCE PRIOR ROUND1 LATER_MAIN

The check reads git objects, not the retained results, so build_record_mutants.py cannot reach it. For each mutant this
replaces one fragment of the daemon-entry test as EVIDENCE has it, writes the result as a commit object whose one parent is
EVIDENCE (a temporary index; no ref, no working-tree change), and runs `python3 -I docs/evidence/syzygy-bpyt-4-5/tools/
build_record.py TREE BASE MAIN <that commit> PRIOR ROUND1 LATER_MAIN`. It records the fragment replaced, the one written,
the commit, the exit code and the last output line, then restores the evidence directory with `git checkout`. `expect` is
`fail` when the edit breaks the restored pin's identity with the base (BASE's `it` block on the pin and the one comment line
above it, exactly once), and a fail counts only when build_record refuses at that check; the control, EVIDENCE itself,
must exit 0. The scratch commits are fixed-date, so a re-run gives the same commit ids. The tree is checked clean before
and after.
"""
import json, os, subprocess, sys, tempfile

tree, out_path, args = os.path.abspath(sys.argv[1]), sys.argv[2], sys.argv[3:9]
base, main, ev, prior, round1, later = args
EV_DIR = 'docs/evidence/syzygy-bpyt-4-5'
DE_TEST = 'packages/cap1-system/src/daemon-entry-unchanged.system.test.ts'
REFUSAL = 'the test file does not hold the old pin from'
git = lambda *a, **k: subprocess.run(['git', *a], cwd=tree, capture_output=True, text=True, check=True, **k).stdout
TITLE = "  it('the daemon path never loads the POC app: each import is dynamic and inside the `dossier` or `polaris` branch', () => {\n"
COMMENT = "  // The `polaris` branch (prototype, POLARIS-DOSSIER-ONE-COMMAND-RUN-2026-10-14) injects the same renderer the same way.\n"
BODY = '    expect(mentions).toEqual([line, line]);\n'
text = git('show', f'{ev}:{DE_TEST}')
block = text[text.index(COMMENT):text.index('  });\n', text.index(COMMENT + TITLE)) + len('  });\n')]
MUTANTS = [
    ('control', None, None, 'pass', 'no edit: EVIDENCE itself; the rebuild exits 0'),
    ('P1-title-byte', TITLE, TITLE.replace('each import is dynamic', 'each import is Dynamic'), 'fail', "one byte of the pin's `it` title"),
    ('P2-comment-byte', COMMENT, COMMENT.replace('the same way.', 'the same way'), 'fail', 'one byte of the comment line above the pin'),
    ('P3-body-byte', BODY, BODY.replace('[line, line]', '[line,line]'), 'fail', "one byte of the pin's body"),
    ('P4-pin-twice', block, block + '\n' + block, 'fail', 'the pin block, with its comment line, held twice'),
    ('P5-pin-removed', block, '', 'fail', 'the pin block and its comment line removed (the comment block this lane wrote above them stays)'),
]
mode = git('ls-tree', ev, '--', DE_TEST).split()[0]
DATE = {'GIT_AUTHOR_NAME': 'pin-identity-mutants', 'GIT_AUTHOR_EMAIL': 'none@invalid', 'GIT_AUTHOR_DATE': '2026-10-27T00:00:00+00:00',
        'GIT_COMMITTER_NAME': 'pin-identity-mutants', 'GIT_COMMITTER_EMAIL': 'none@invalid', 'GIT_COMMITTER_DATE': '2026-10-27T00:00:00+00:00'}
def commit_with(mid, body):
    with tempfile.TemporaryDirectory() as scratch:
        env = {**os.environ, **DATE, 'GIT_INDEX_FILE': os.path.join(scratch, 'index')}
        blob = git('hash-object', '-w', '--stdin', input=body).strip()
        git('read-tree', ev, env=env)
        git('update-index', '--cacheinfo', f'{mode},{blob},{DE_TEST}', env=env)
        return git('commit-tree', git('write-tree', env=env).strip(), '-p', ev, '-m', f'pin-identity mutant {mid}', env=env).strip()

if git('status', '--porcelain').strip(): sys.exit('tree is not clean')
commit = git('rev-parse', 'HEAD').strip()
results = []
for mid, old, new, expect, note in MUTANTS:
    try:
        if old is None: at = git('rev-parse', ev).strip()
        else:
            if text.count(old) != 1: sys.exit(f'{mid}: the fragment occurs {text.count(old)} times at {ev}, not once')
            at = commit_with(mid, text.replace(old, new))
        run = subprocess.run([sys.executable, '-I', os.path.join(tree, EV_DIR, 'tools/build_record.py'), tree, base, main, at, prior, round1, later],
                             capture_output=True, text=True)
        last = (run.stderr.strip().splitlines() or run.stdout.strip().splitlines() or [''])[-1][:400]
        outcome = 'pass' if run.returncode == 0 else 'fail'
        refused_at_pin = outcome == 'fail' and REFUSAL in last
        results.append({'id': mid, 'note': note, 'file': DE_TEST, 'old': old, 'new': new, 'commit': at, 'expect': expect, 'exit': run.returncode,
                        'outcome': outcome, 'refusedAtPinCheck': refused_at_pin,
                        'asExpected': outcome == expect and (expect == 'pass' or refused_at_pin), 'lastLine': last})
        print(json.dumps({k: results[-1][k] for k in ('id', 'expect', 'exit', 'asExpected', 'lastLine')}), flush=True)
    finally:
        git('checkout', '--', EV_DIR)
if git('status', '--porcelain').strip(): sys.exit('tree not restored')
json.dump({'tool': os.path.basename(__file__), 'commit': commit, 'args': args, 'allAsExpected': all(r['asExpected'] for r in results), 'results': results},
          open(out_path, 'w', encoding='utf8'), indent=1)
