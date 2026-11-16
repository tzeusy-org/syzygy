"""syzygy-bpyt.54, rule 6 for the sweep itself: each mutant rewrites one predicate of spread_sweep.py method 1 in a
temporary copy and must make `--selftest` exit 1. Usage: python3 spread_sweep_mutants.py <clone> [--selftest-record] (prints JSON; with --selftest-record prints the
unmutated selftest record instead; exits 1 if any
mutant survives or the unmutated selftest fails). Every mutant records its exact old and new fragment."""
import hashlib
import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = sys.argv[1]
COMMIT = subprocess.run(['git', '-C', ROOT, 'rev-parse', 'HEAD'], capture_output=True, check=True, text=True).stdout.strip()
SUBJECT = {'ranAtCommit': COMMIT, 'tool': 'docs/evidence/syzygy-bpyt-54/spread_sweep.py',
           'toolSha256': hashlib.sha256(open(os.path.join(HERE, 'spread_sweep.py'), 'rb').read()).hexdigest()}
SOURCE = open(os.path.join(HERE, 'spread_sweep.py'), encoding='utf-8').read()
MUTANTS = [
    ('strip-disabled', 'code = strip_with_depth(raw)', 'code = raw'),
    ('apply-dropped', "if tok.endswith('.apply('):", "if False:"),
    ('square-not-a-bracket', "if tok in '([{':", "if tok in '({':"),
    ('optional-call-dropped', " or code[k - 1:k + 1] == '?.'", ''),
    ('any-paren-counts', "if stack and stack[-1][0] == '(' and stack[-1][2]:", "if stack and stack[-1][0] in '([{':"),
    ('rest-param-never', 'def rest_param(code, pos):\n', 'def rest_param(code, pos):\n    return False\n'),
    ('regex-literal-ignored', "if c == '/' and (prev_sig == '' or prev_sig", "if False and (prev_sig == '' or prev_sig"),
]


def selftest(text):
    with tempfile.TemporaryDirectory() as tmp:
        path = os.path.join(tmp, 'spread_sweep.py')
        open(path, 'w', encoding='utf-8').write(text)
        run = subprocess.run([sys.executable, '-I', path, '--selftest'], capture_output=True, text=True, cwd=tmp)
        try:
            return run.returncode, json.loads(run.stdout)['failures']
        except (json.JSONDecodeError, KeyError):
            return 'crashed', [run.stderr.strip()[-300:]]


base_code, base_failures = selftest(SOURCE)
if '--selftest-record' in sys.argv:
    print(json.dumps({**SUBJECT, 'selftest': 'pass' if base_code == 0 else 'fail', 'failures': base_failures}, indent=1))
    sys.exit(0 if base_code == 0 else 1)
rows = []
for name, old, new in MUTANTS:
    if SOURCE.count(old) != 1:
        rows.append({'mutant': name, 'old': old, 'new': new, 'outcome': f'fragment occurs {SOURCE.count(old)} times'}); continue
    code, failures = selftest(SOURCE.replace(old, new))
    rows.append({'mutant': name, 'old': old, 'new': new, 'exit': code, 'outcome': 'killed' if code == 1 else 'survived', 'selftestFailures': failures})
ok = base_code == 0 and all(row.get('outcome') == 'killed' for row in rows)
print(json.dumps({**SUBJECT, 'unmutatedSelftestExit': base_code, 'unmutatedFailures': base_failures, 'mutants': rows,
                  'killed': sum(row.get('outcome') == 'killed' for row in rows), 'total': len(rows)}, indent=1))
sys.exit(0 if ok else 1)
