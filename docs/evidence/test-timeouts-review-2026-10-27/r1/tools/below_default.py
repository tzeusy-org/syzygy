"""below_default.py: is any in-scope base site's value below its Vitest default? (R-GP-IMPL-TEST-TIMEOUTS-1)
Usage: python3 below_default.py <repo> <commit> <rev-census.json> <deferred-files...>
A value is the timeout expression read as: a numeric literal (underscores allowed), a product `a * b` of such
literals, `{ timeout: X }`, or an identifier whose `const NAME = <value>` sits in the same file (one level).
Defaults: 5000 ms for test and suite sites, 10000 ms for hooks, and for config properties the default of the
property named (testTimeout 5000, hookTimeout 10000). Prints every site it cannot evaluate, for a human to read.
"""
import json, re, subprocess, sys
repo, commit, census_path, *deferred = sys.argv[1:]
sites = [s for s in json.load(open(census_path))['sitesList'] if s['path'] not in deferred]
show = lambda p: subprocess.run(['git', '-C', repo, 'show', f'{commit}:{p}'], capture_output=True, text=True).stdout
NUM = r'\d[\d_]*'
def value(expr, text, depth=0):
    e = re.sub(r'^\{\s*timeout:\s*(.*?)\s*\}$', r'\1', expr.strip()).strip()
    e = re.sub(r'^timeout:\s*', '', e)
    if re.fullmatch(NUM, e): return int(e.replace('_', ''))
    m = re.fullmatch(rf'({NUM})\s*\*\s*({NUM})', e)
    if m: return int(m.group(1).replace('_', '')) * int(m.group(2).replace('_', ''))
    if depth == 0 and re.fullmatch(r'[A-Za-z_]\w*', e):
        m = re.search(rf'^\s*(?:export\s+)?const\s+{e}\s*=\s*([^;\n]+);', text, re.M)
        if m: return value(m.group(1), text, 1)
    return None
DEFAULT = {'test': 5000, 'suite': 5000, 'hook': 10000}
rows, unknown, below = 0, [], []
for s in sites:
    if s['kind'] == 'setConfig': continue
    rows += 1
    expr = s.get('timeout') or ''
    v = value(expr, show(s['path']))
    d = DEFAULT.get(s['kind']) or {'testTimeout': 5000, 'hookTimeout': 10000}.get(s.get('name'), 5000)
    if v is None: unknown.append(f"{s['path']}:{s['line']} {expr!r}"); continue
    if v < d: below.append(f"{s['path']}:{s['line']} {v} < {d}")
print('in-scope sites', rows, 'evaluated', rows - len(unknown), 'below default', len(below), 'not evaluated', len(unknown))
for b in below: print('  BELOW', b)
for u in unknown: print('  NOT EVALUATED', u)
