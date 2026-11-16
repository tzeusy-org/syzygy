"""Independent reviewer tool (rev-530). For each -U0 hunk of the .ts diff, rewrite the removed
lines mechanically (inline createHash('sha256').update(X[, 'utf8']).digest('hex') -> sha256(X);
the local alias digest( -> sha256(; drop createHash imports, local sha256/digest/deepFreeze
definitions) and compare with the added lines, ignoring added '@syzygy/support' imports.
Prints every hunk whose rewrite differs. Usage: hunk_rewrite_check.py <base> <head> <repo>"""
import re, subprocess, sys
base, head, repo = sys.argv[1:4]
diff = subprocess.run(['git', '-C', repo, 'diff', '-U0', base, head, '--', '*.ts', ':!*.test.ts'], capture_output=True, text=True, check=True).stdout
def rewrite_chain(code):
    out = ''; i = 0
    while True:
        m = re.compile(r"createHash\('sha256'\)\.update\(").search(code, i)
        if not m: return out + code[i:]
        s = m.end(); depth = 1; t = s
        while depth: depth += {'(':1, ')':-1}.get(code[t], 0); t += 1
        arg = code[s:t-1]
        arg = re.sub(r",\s*'utf8'\s*$", '', arg)
        rest = code[t:]
        assert rest.startswith(".digest('hex')"), rest[:40]
        out += code[i:m.start()] + f'sha256({arg})'; i = t + len(".digest('hex')")
files = {}; cur = None; hunks = []
for line in diff.split('\n'):
    if line.startswith('diff --git'): cur = None; continue
    if line.startswith('+++ '): fname = line[6:]; continue
    if line.startswith('--- '): continue
    if line.startswith('@@'): cur = {'file': fname, 'head': line, 'rm': [], 'add': []}; hunks.append(cur); continue
    if cur is None: continue
    if line.startswith('-'): cur['rm'].append(line[1:])
    elif line.startswith('+'): cur['add'].append(line[1:])
bad = 0; checked = 0; helper_defs = []
for h in hunks:
    rm = '\n'.join(h['rm']); add = '\n'.join(h['add'])
    # drop definitions (multi-line function bodies and one-line arrows), recorded separately
    for pat in [r"(?ms)^(export )?function (sha256|deepFreeze)<?.*?^\}\n?", r"(?m)^(/\*\*.*\*/\n)?const (sha256|digest) = .*\n?", r"(?m)^/\*\* Freezes .*\*/\n?"]:
        for m in re.finditer(pat, rm + '\n'): helper_defs.append((h['file'], m.group(0).strip()[:300]))
        rm = re.sub(pat, '', rm + '\n').rstrip('\n')
    rm = rewrite_chain(rm)
    rm = re.sub(r"\bdigest\(", 'sha256(', rm) if h['file'].endswith(('dossier-site.ts', 'durable-lifecycle.ts')) else rm
    # imports
    rm = re.sub(r"(?m)^import \{ createHash \} from 'node:crypto';\n?", '', rm)
    rm = re.sub(r"(?m)^import \{ createHash, (.*) \} from 'node:crypto';", r"import { \1 } from 'node:crypto';", rm)
    add = re.sub(r"(?m)^import \{ [\w, ]+ \} from '@syzygy/support';\n?", '', add + '\n').rstrip('\n')
    norm = lambda s: re.sub(r'\s+', ' ', s).strip()
    # remove act-fields import members that moved to the package
    if h['file'].endswith(('body-read-authority.ts', 'walkthrough-judgment.ts')):
        rm = re.sub(r"(?m)^\s*(deepFreeze|sha256),\n?", '', rm + '\n').rstrip('\n')
    checked += 1
    if norm(rm) != norm(add):
        bad += 1; print('DIFF', h['file'], h['head']); print('  rm*:', norm(rm)[:400]); print('  add:', norm(add)[:400])
print(f'hunks {len(hunks)} checked {checked} differing {bad}')
print('helper definitions removed:', len(helper_defs))
for f, d in helper_defs: print(' ', f, '|', re.sub(r'\s+', ' ', d)[:220])
