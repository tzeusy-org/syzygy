"""reason_check.py: an independent check that each kept head site carries a reason with a citation
(R-GP-IMPL-TEST-TIMEOUTS-1).
Usage: python3 reason_check.py <repo> <commit> <rev-census.json at commit> <deferred-files...>
A site's reason is any comment text found by the first rule that yields text:
  R1 a `//` comment after the timeout expression on its line;
  R2 a comment block (`//` run or `/* */`) ending on the line directly above the timeout line;
  R3 when the timeout is an identifier (or `timeout: NAME`), the declaration `const NAME =` in the same file or a
     relatively imported one: a `//` on that line, or a comment block ending directly above it, or above the top of a
     contiguous run of one-line const declarations that includes it;
  R4 for a config property, a `//` on its line or a comment directly above it, or above its run of one-line properties.
A citation is a 7-40 hex run that `git cat-file -e <hex>^{commit}` accepts, or a docs/evidence/ path tracked at the commit.
Prints every site without a reason or without a citation, with the population.
"""
import json, re, subprocess, sys

repo, commit, census_path, *deferred = sys.argv[1:]
census = json.load(open(census_path))
git = lambda *a: subprocess.run(['git', '-C', repo, *a], capture_output=True, text=True)
tracked = set(git('ls-tree', '-r', '--name-only', commit).stdout.split('\n'))
texts = {}
def text(p):
    if p not in texts: texts[p] = git('show', f'{commit}:{p}').stdout.split('\n') if p in tracked else None
    return texts[p]

def block_above(lines, i):  # i: 0-based line index; block ending at i-1
    j = i - 1
    if j >= 0 and re.search(r'\*/\s*$', lines[j]):
        out = []
        while j >= 0:
            out.insert(0, lines[j]);
            if '/*' in lines[j]: break
            j -= 1
        return ' '.join(out)
    out = []
    while j >= 0 and re.match(r'^\s*//', lines[j]): out.insert(0, lines[j]); j -= 1
    return ' '.join(out) or None

def after_comment(line, start):
    k = line.find('//', start)
    return line[k:] if k >= 0 else None

ONE_CONST = re.compile(r'^\s*(export\s+)?const\s+\w+\s*=\s*[^;]*;\s*(//.*)?$')
ONE_PROP = re.compile(r'^\s*\w+\s*:\s*[^{}]*,\s*(//.*)?$')

def decl_reason(path, name, seen=()):
    lines = text(path)
    if lines is None or (path, name) in seen: return None
    for i, l in enumerate(lines):
        if re.match(rf'^\s*(export\s+)?const\s+{re.escape(name)}\b\s*=', l):
            c = after_comment(l, l.find('=')) or block_above(lines, i)
            if c: return c
            top = i
            while top - 1 >= 0 and ONE_CONST.match(lines[top - 1]) and not re.match(r'^\s*//', lines[top - 1]): top -= 1
            if top != i or ONE_CONST.match(l): return block_above(lines, top)
            return None
    for l in lines:  # a relative import of the name
        m = re.match(rf"^\s*import\s*\{{[^}}]*\b{re.escape(name)}\b[^}}]*\}}\s*from\s*'(\.[^']+)'", l)
        if m:
            base = (path.rsplit('/', 1)[0] + '/' + m.group(1)).replace('/./', '/')
            parts = []
            for seg in base.split('/'):
                if seg == '..': parts.pop()
                else: parts.append(seg)
            base = '/'.join(parts).removesuffix('.js')
            for cand in (base + '.ts', base + '.mts', base + '/index.ts'):
                if cand in tracked: return decl_reason(cand, name, seen + ((path, name),))
    return None

def citations(t):
    hexes = [h for h in set(re.findall(r'\b[0-9a-f]{7,40}\b', t or '')) if git('cat-file', '-e', f'{h}^{{commit}}').returncode == 0]
    paths = [p.rstrip('.:') for p in re.findall(r"docs/evidence/[^\s)`'\",;]+", t or '')]
    return hexes, [p for p in paths if p in tracked]

rows, missing_reason, missing_cite = 0, [], []
for s in census['sitesList']:
    if s['path'] in deferred: continue
    rows += 1
    lines = text(s['path'])
    i = s['line'] - 1
    line = lines[i]
    expr = s.get('timeout') or ''
    k = line.find(expr.split(':')[-1].strip()) if expr else -1
    reason = after_comment(line, max(k, 0)) or block_above(lines, i)
    if not reason:
        name = re.sub(r'^timeout:\s*', '', expr).strip()
        if re.fullmatch(r'[A-Za-z_]\w*', name): reason = decl_reason(s['path'], name)
    if not reason and s['kind'] == 'config':
        top = i
        while top - 1 >= 0 and ONE_PROP.match(lines[top - 1]) and not re.match(r'^\s*//', lines[top - 1]): top -= 1
        reason = block_above(lines, top)
    if not reason: missing_reason.append(f"{s['path']}:{s['line']}"); continue
    h, p = citations(reason)
    if not h and not p: missing_cite.append((f"{s['path']}:{s['line']}", reason[:160]))
print('kept sites checked', rows, 'without a reason', len(missing_reason), 'without a citation', len(missing_cite))
for m in missing_reason: print('  NO REASON', m)
for m in missing_cite: print('  NO CITATION', m)
