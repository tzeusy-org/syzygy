"""Reviewer's battery runner (R-GP-IMPL-SPREAD-LOOPS-1). Usage: battery.py <clone> <out json>
Takes the first fenced block under PROJECT-STATUS.md "How to verify this page", joins backslash continuations, and runs it as ONE
bash script in <clone> (so assignments such as CS=... persist), printing a marker with the exit status after every line that is not
a bare assignment. A command is every non-blank, non-comment line that is not a bare NAME=value assignment."""
import json, re, subprocess, sys
clone, out = sys.argv[1:3]
t = open(f'{clone}/PROJECT-STATUS.md', encoding='utf8').read()
sec = t[t.find('How to verify this page'):]
block = re.search(r'```(?:bash|sh)?\n(.*?)\n```', sec, re.S).group(1)
lines, cur = [], ''
for line in block.split('\n'):
    if not cur and (not line.strip() or line.strip().startswith('#')):
        continue
    cur += line
    if cur.endswith('\\'):
        cur = cur[:-1] + ' '
        continue
    lines.append(cur); cur = ''
script, cmds = [], []
for line in lines:
    script.append(line)
    if re.match(r'^[A-Za-z_][A-Za-z0-9_]*=\S*\s*$', line.strip()):
        continue
    cmds.append(line)
    script.append(f'echo "__R555 {len(cmds) - 1} $?" >&2')
p = subprocess.run(['bash', '-c', '\n'.join(script)], cwd=clone, capture_output=True, text=True)
codes = {int(m.group(1)): int(m.group(2)) for m in re.finditer(r'^__R555 (\d+) (\d+)$', p.stderr, re.M)}
rows = [{'n': i, 'cmd': c[:200], 'exit': codes.get(i)} for i, c in enumerate(cmds)]
bad = [r for r in rows if r['exit'] != 0]
json.dump({'commands': len(cmds), 'assignments': len(lines) - len(cmds), 'nonzero': bad, 'rows': rows}, open(out, 'w'), indent=1)
print('commands', len(cmds), 'assignments', len(lines) - len(cmds), 'nonzero', len(bad))
for r in bad:
    print(r)
