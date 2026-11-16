#!/usr/bin/env python3
"""rev-532d (round 4): reviewer mutants against build_record.py's unreached-set, geometric-mean and pin-identity checks. Reviewer tool, not authority.

usage: python3 -I my_mutants_r4.py TREE OUT.json BASE MAIN EVIDENCE PRIOR ROUND1 LATER_MAIN

TREE is a clean checkout of the PR head with node_modules installed. Three mutant forms:
  json    edits retained result files under docs/evidence/syzygy-bpyt-4-5/ in the working tree, as the lane's
          build_record_mutants.py does (each edit recorded as file, pointer, old and new);
  test    writes the daemon-entry test with one edit as a commit object whose one parent is EVIDENCE (a temporary
          index, fixed dates, no ref), and passes that commit as EVIDENCE, as the lane's pin_identity_mutants.py does;
  checker edits build_record.py itself in the working tree (one (old, new) replacement).
Each runs `python3 -I build_record.py TREE BASE MAIN EVIDENCE PRIOR ROUND1 LATER_MAIN` and records the exit code and the
last output line; `git checkout -- docs/evidence/syzygy-bpyt-4-5` restores the tree after each. `sound` is what a sound
check must do; `check` names the refusal the mutant aims at (a substring of the expected last line), so a refusal by
another check is told apart. The tree must be clean before and after.
"""
import copy, json, os, subprocess, sys, tempfile

tree, out_path, args = os.path.abspath(sys.argv[1]), sys.argv[2], sys.argv[3:9]
base, main, ev, prior, round1, later = args
EV = 'docs/evidence/syzygy-bpyt-4-5'
DE_TEST = 'packages/cap1-system/src/daemon-entry-unchanged.system.test.ts'
TAG, ATTR, EDGE, HOST = 'TAG_SCAN_CPU_MS', 'ATTRIBUTE_SCAN_CPU_MS', 'EDGE_TRIM_CPU_MS', 'HOSTILE_LINE_CPU_MS'
git = lambda *a, **k: subprocess.run(['git', *a], cwd=tree, capture_output=True, text=True, check=True, **k).stdout
UNREACHED_MSG, MEAN_MSG = 'the rows not reached are', 'the runs give a geometric mean of'
# A test-form mutant at a new commit is refused by the first commit-binding check it meets (the mutants' or the census's
# `ran at`, then the daemon-entry inputs); any refusal but the pin check's counts.
PIN_MSG, BIND_MSG = 'the test file does not hold the old pin from', None

def site(d, bound): return next(s for s in d['sites'] if s['bound'] == bound)
def row(d, bound, word): return next(m for m in site(d, bound)['mutants'] if word in m['title'])
def uncapped(m, bound, ms):
    for r in m['runs']:
        r['capped'], r['exit'] = None, 0
        line = r['regions'][0]['line'] if r.get('regions') else 110
        r['regions'] = [{'line': line, 'bound': bound, 'cpuMs': ms}]
    m['min'], m['cappedRuns'] = ms, 0

def j_b3_node22(docs):
    m = row(docs['cpu-separation-node22.json'], TAG, 'plural'); uncapped(m, TAG, 600.0); m['reached'] = False
def j_nearmiss_reached(docs):
    m = row(docs['cpu-separation.json'], TAG, 'near-miss'); uncapped(m, TAG, 70000.0); m['reached'] = True
def j_nearmiss_twice(docs):
    s = site(docs['cpu-separation.json'], TAG); s['mutants'].append(copy.deepcopy(row(docs['cpu-separation.json'], TAG, 'near-miss')))
def j_node22_opening_unreached(docs):
    m = row(docs['cpu-separation-node22.json'], TAG, 'opening'); uncapped(m, TAG, 300.0); m['reached'] = False
def j_thread_plural_deleted(docs):
    s = site(docs['cpu-separation.json'], TAG); s['mutants'] = [m for m in s['mutants'] if 'plural' not in m['title']]
def j_gm_attr_2800(docs): site(docs['cpu-separation.json'], ATTR)['proposedBoundMs'] = 2800
def j_gm_node22_edge_2400(docs): site(docs['cpu-separation-node22.json'], EDGE)['proposedBoundMs'] = 2400
def j_gm_node22_host_150(docs): site(docs['cpu-separation-node22.json'], HOST)['proposedBoundMs'] = 150
def j_gm_from_runs_not_summary(docs):
    """thread EDGE_TRIM: one head region raised to 150 ms, headMaxMs and fileBound agreeing, proposedBoundMs left at 1900."""
    s = site(docs['cpu-separation.json'], EDGE)
    g = next(g for g in s['headRuns'][0]['regions'] if g['bound'] == EDGE); g['cpuMs'] = 150.0
    s['headMaxMs'] = 150.0; s['fileBound']['overHeadMax'] = round(1900 / 150.0, 1)
def j_gm_float_equal(docs): site(docs['cpu-separation.json'], ATTR)['proposedBoundMs'] = 2900.0

TITLE = "  it('the daemon path never loads the POC app: each import is dynamic and inside the `dossier` or `polaris` branch', () => {\n"
COMMENT = "  // The `polaris` branch (prototype, POLARIS-DOSSIER-ONE-COMMAND-RUN-2026-10-14) injects the same renderer the same way.\n"
text = git('show', f'{ev}:{DE_TEST}')
block = text[text.index(COMMENT):text.index('  });\n', text.index(COMMENT + TITLE)) + len('  });\n')]
altered = block.replace('[line, line]', '[line,line]')
def t_twice_one_altered(t): return t.replace(block, block + '\n' + altered)
def t_altered_first_exact_second(t): return t.replace(block, altered + '\n' + block)
def t_in_block_comment(t): return t.replace(block, '  /*\n' + block + '  */\n')
def t_under_describe_skip(t): return t.replace(block, "  describe.skip('kept', () => {\n" + block + '  });\n')

CHECKER_OLD = "UNREACHED = {'TAG_SCAN_CPU_MS': ['scans near-miss tag names at the ceiling']}"
MUTANTS = [
    ('control', 'json', None, 'pass', None, 'no edit'),
    ('M1-node22-plural-under-bound', 'json', j_b3_node22, 'fail', UNREACHED_MSG,
     "B3 on the Node 22 path: process-CPU TAG_SCAN's plural row uncapped at 600 ms on every run (under the 1,500 bound), summaries agreeing"),
    ('M2-thread-nearmiss-reached', 'json', j_nearmiss_reached, 'fail', UNREACHED_MSG,
     'the declared unreached row reaches (70,000 ms uncapped, above the 60,021.3 mutant min, so no other figure moves): the set is then empty, not the declared one'),
    ('M3-thread-nearmiss-twice', 'json', j_nearmiss_twice, 'fail', UNREACHED_MSG, 'the near-miss row held twice: two unreached rows with the declared title'),
    ('M4-node22-opening-row-unreached', 'json', j_node22_opening_unreached, 'fail', UNREACHED_MSG,
     "an extra unreached row: process-CPU TAG_SCAN's opening-tags row uncapped at 300 ms (under 10x the 64.5 head max and the bound); the mutant min stays the plural row's"),
    ('M5-thread-plural-row-deleted', 'json', j_thread_plural_deleted, 'fail', None,
     "thread TAG_SCAN's plural row deleted from the record: no unreached row is added, the mutant min stays the opening row's"),
    ('M6-thread-attr-mean-2800', 'json', j_gm_attr_2800, 'fail', MEAN_MSG, "thread ATTRIBUTE_SCAN's proposedBoundMs 2900 -> 2800, one off in the second significant figure"),
    ('M7-node22-edge-mean-2400', 'json', j_gm_node22_edge_2400, 'fail', MEAN_MSG, "Node 22 EDGE_TRIM's proposedBoundMs 2300 -> 2400"),
    ('M8-node22-host-mean-150', 'json', j_gm_node22_host_150, 'fail', MEAN_MSG, "Node 22 HOSTILE_LINE's proposedBoundMs 160 -> 150 (three significant figures in reach)"),
    ('M9-thread-edge-mean-from-runs', 'json', j_gm_from_runs_not_summary, 'fail', MEAN_MSG,
     "thread EDGE_TRIM: a head region raised to 150 ms with headMaxMs and fileBound agreeing; the runs then give sqrt(150 x 60066.3) -> 3000, against the recorded 1900"),
    ('M10-thread-attr-mean-float', 'json', j_gm_float_equal, 'pass', None, 'proposedBoundMs 2900 written as 2900.0: the same number'),
    ('M11-pin-twice-one-altered', 'test', t_twice_one_altered, 'pass-pin-check', BIND_MSG,
     'the exact pin, then a second copy with one byte altered: the exact block occurs once, so the identity check passes it and the daemon-entry binding refuses'),
    ('M12-pin-altered-then-exact', 'test', t_altered_first_exact_second, 'pass-pin-check', BIND_MSG, 'the altered copy first, the exact block second'),
    ('M13-pin-in-block-comment', 'test', t_in_block_comment, 'pass-pin-check', BIND_MSG, 'the exact pin wrapped in /* */, so it never runs'),
    ('M14-pin-under-describe-skip', 'test', t_under_describe_skip, 'pass-pin-check', BIND_MSG, "the exact pin inside describe.skip(), so it never runs"),
    ('M15-checker-unreached-extra-title', 'checker', (CHECKER_OLD, "UNREACHED = {'TAG_SCAN_CPU_MS': ['scans near-miss tag names at the ceiling', 'scans unterminated plural tags at the ceiling']}"),
     'fail', UNREACHED_MSG, 'build_record itself declares one more unreached row than the data has: exact equality must refuse'),
    ('M16-checker-unreached-on-attr', 'checker', (CHECKER_OLD, "UNREACHED = {'TAG_SCAN_CPU_MS': ['scans near-miss tag names at the ceiling'], 'ATTRIBUTE_SCAN_CPU_MS': ['scans one tag body that is a single word run at the ceiling']}"),
     'fail', UNREACHED_MSG, 'build_record declares a reached row of another bound unreached'),
]

mode = git('ls-tree', ev, '--', DE_TEST).split()[0]
DATE = {'GIT_AUTHOR_NAME': 'rev-532d', 'GIT_AUTHOR_EMAIL': 'none@invalid', 'GIT_AUTHOR_DATE': '2026-10-28T00:00:00+00:00',
        'GIT_COMMITTER_NAME': 'rev-532d', 'GIT_COMMITTER_EMAIL': 'none@invalid', 'GIT_COMMITTER_DATE': '2026-10-28T00:00:00+00:00'}
def commit_with(mid, body):
    with tempfile.TemporaryDirectory() as scratch:
        env = {**os.environ, **DATE, 'GIT_INDEX_FILE': os.path.join(scratch, 'index')}
        blob = git('hash-object', '-w', '--stdin', input=body).strip()
        git('read-tree', ev, env=env)
        git('update-index', '--cacheinfo', f'{mode},{blob},{DE_TEST}', env=env)
        return git('commit-tree', git('write-tree', env=env).strip(), '-p', ev, '-m', f'rev-532d mutant {mid}', env=env).strip()

if git('status', '--porcelain').strip(): sys.exit('tree is not clean')
results = []
for mid, form, edit, sound, check, note in MUTANTS:
    at, recorded = ev, []
    try:
        if form == 'json' and edit:
            names = ('cpu-separation.json', 'cpu-separation-node22.json')
            docs = {n: json.load(open(os.path.join(tree, EV, n), encoding='utf8')) for n in names}
            before = copy.deepcopy(docs)
            edit(docs)
            for n in names:
                if docs[n] != before[n]:
                    open(os.path.join(tree, EV, n), 'w', encoding='utf8').write(json.dumps(docs[n], indent=1))
                    recorded.append({'file': n, 'changed': True})
        elif form == 'test':
            new = edit(text)
            if new == text: sys.exit(f'{mid}: the edit changed nothing')
            at = commit_with(mid, new)
            recorded.append({'file': DE_TEST, 'commit': at, 'exactBlockCount': new.count(block), 'newSha': subprocess.run(['sha256sum'], input=new, capture_output=True, text=True).stdout.split()[0]})
        elif form == 'checker':
            p = os.path.join(tree, EV, 'tools/build_record.py'); src = open(p, encoding='utf8').read()
            if src.count(edit[0]) != 1: sys.exit(f'{mid}: checker fragment not once')
            open(p, 'w', encoding='utf8').write(src.replace(edit[0], edit[1])); recorded.append({'file': 'tools/build_record.py', 'old': edit[0], 'new': edit[1]})
        run = subprocess.run([sys.executable, '-I', os.path.join(tree, EV, 'tools/build_record.py'), tree, base, main, at, prior, round1, later],
                             capture_output=True, text=True)
        last = (run.stderr.strip().splitlines() or run.stdout.strip().splitlines() or [''])[-1][:500]
        outcome = 'pass' if run.returncode == 0 else 'fail'
        at_check = check is None or check in last
        if sound == 'pass-pin-check': as_expected = outcome == 'fail' and PIN_MSG not in last and at_check
        else: as_expected = outcome == sound and at_check
        results.append({'id': mid, 'form': form, 'note': note, 'edits': recorded, 'sound': sound, 'check': check, 'exit': run.returncode,
                        'outcome': outcome, 'atNamedCheck': at_check, 'asSound': as_expected, 'lastLine': last})
        print(json.dumps({k: results[-1][k] for k in ('id', 'sound', 'exit', 'asSound', 'lastLine')}), flush=True)
    finally:
        git('checkout', '--', EV)
if git('status', '--porcelain').strip(): sys.exit('tree not restored')
json.dump({'tool': os.path.basename(__file__), 'commit': git('rev-parse', 'HEAD').strip(), 'args': args, 'results': results},
          open(out_path, 'w', encoding='utf8'), indent=1, ensure_ascii=False)
