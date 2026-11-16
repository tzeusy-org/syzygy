"""syzygy-bpyt.49 (the PR 547 round-1 review's N2 and N3): rule 6 for the two selftests this bead extends, one mutant at a time.

Each mutant is one edit to a scratch copy of a record.py; the copy runs with --check and --selftest over the tree given, and the
selftest entries that survive must be exactly the ones named. The N2 rows are the reviewer's hook_fix_839.py mutants of
docs/evidence/syzygy-bpyt-8-39/record.py (F-H1, F-H3, F-H4, F-S5), applied to the repaired line. The N3 rows are the reviewer's
proposed_entries_b39.py mutants of docs/evidence/syzygy-bpyt-39/record.py (P5, P10, P12, P16, E1, E2, E5, E7), with C1 for the
recordSha256 check this bead adds. Both reviewer tools are in docs/evidence/guard-pins-notes-review-2026-10-28/r1/tools/.
Usage: python3 -I mutants.py <tree> <scratch dir> <out.json>
"""
import hashlib, json, os, re, subprocess, sys

tree, scratch, out = (os.path.realpath(a) for a in sys.argv[1:4])
R839 = 'docs/evidence/syzygy-bpyt-8-39/record.py'
R39 = 'docs/evidence/syzygy-bpyt-39/record.py'
SINCE = "    since = [p for p in hooked('since', git('diff', '--name-only', REPAIR1, HEAD).split()) if not p.startswith(f'{HERE_REL}/')]\n"
PATHS = ['a non-evidence path changed since the suite ran', "another bead's evidence path changed since the suite ran"]
drop = lambda line: (line, line.replace('problems.append(', '(lambda *a: None)(', 1))
# (id, record, old, new, the entries that must then survive)
MUTANTS = [
    ('N2-0-unmutated', R839, None, None, []),
    ('N2-H1-hook-bypassed', R839, SINCE, SINCE.replace("hooked('since', git('diff', '--name-only', REPAIR1, HEAD).split())",
                                                       "git('diff', '--name-only', REPAIR1, HEAD).split()"), PATHS),
    ('N2-H3-exclusion-widened-to-docs', R839, SINCE, SINCE.replace("f'{HERE_REL}/'", "'docs/'"), PATHS[1:]),
    ('N2-H4-every-path-but-the-testkit-excluded', R839, SINCE, SINCE.replace("if not p.startswith(f'{HERE_REL}/')", 'if p == KIT'), PATHS),
    ('N2-S5-path-test-dropped', R839, 'if since != [KIT] or not late', 'if not late', PATHS),
    ('N3-0-unmutated', R39, None, None, []),
    ('N3-P5', R39, *drop("            problems.append(f'root-exception-probe {cid}: app does not load the workspace')"),
     ['a root case app does not load from the workspace']),
    ('N3-P10', R39, *drop("            problems.append(f'npmrc-trace {name}: compared with another record')"),
     ['a lane trace compared with another record']),
    ('N3-P12', R39, *drop("        problems.append('comment-only: the selftest does not separate a code change from a comment change')"),
     ['a comment-only selftest that misses a rename']),
    ('N3-P16', R39, *drop("        problems.append('record-predicate-mutants: the unmutated selftest does not pass')"),
     ['an unmutated predicate run that fails']),
    ('N3-E1', R39, " or not all(e.get('link') for e in entries.values())", '', ['a root case npm installs as a copy']),
    ('N3-E2', R39, "r.get('installExit') != 0 or ", '', ['a root case whose install fails']),
    ('N3-E5', R39, 'kit.count(t) != 1', 'kit.count(t) < 1', ['a testkit that states a root exception twice']),
    ('N3-E7', R39, ".get('app', {}).get('path') != 'w/package.json'", ".get('w', {}).get('path') != 'w/package.json'",
     ['a root case app does not load from the workspace']),
    ('N3-C1-trace-record-check-dropped', R39, *drop(
        "            problems.append('npmrc-trace root-exception-probe: the traced run did not write the committed root-exception-probe.json')"),
     ['a root-exception trace of another run']),
]
sha = lambda text: hashlib.sha256(text.encode()).hexdigest()
commit = subprocess.run(['git', '-C', tree, 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
os.makedirs(scratch, exist_ok=True)


def run(text, flag):
    path = os.path.join(scratch, 'record.py')
    open(path, 'w').write(text)
    r = subprocess.run(['python3', '-I', path, tree, flag], capture_output=True, text=True, timeout=1800)
    lines = r.stdout.splitlines()
    tally = re.search(r'selftest: (\d+)/(\d+)', r.stdout)
    return {'exit': r.returncode, 'last': lines[-1] if lines else r.stderr[-300:], 'tally': tally.group(0) if tally else None,
            'survived': [line.split(' | ')[1] for line in lines if line.startswith('SURVIVED | ')]}


rows = []
for mid, record, old, new, expected in MUTANTS:
    source = open(os.path.join(tree, record)).read()
    assert old is None or (source.count(old) == 1 and old != new), mid
    text = source if old is None else source.replace(old, new)
    row = {'id': mid, 'record': record, 'recordSha256': sha(source), 'old': old, 'new': new, 'check': run(text, '--check'),
           'selftest': run(text, '--selftest'), 'expected': expected}
    row['asExpected'] = row['check']['exit'] == 0 and row['selftest']['survived'] == expected and (row['selftest']['exit'] == 0) == (not expected)
    rows.append(row)
    print(mid, '| check', row['check']['exit'], '| selftest', row['selftest']['tally'], '| survived', row['selftest']['survived'],
          'as expected' if row['asExpected'] else 'UNEXPECTED', flush=True)
os.remove(os.path.join(scratch, 'record.py'))
json.dump({'commit': commit, 'rows': rows}, open(out, 'w'), indent=1)
open(out, 'a').write('\n')
