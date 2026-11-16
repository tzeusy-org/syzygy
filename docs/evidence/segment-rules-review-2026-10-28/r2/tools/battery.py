"""Run PROJECT-STATUS.md's canonical battery block line by line in the given checkout; print one result line per command."""
import os, re, subprocess, sys
root = sys.argv[1]
t = open(os.path.join(root, 'PROJECT-STATUS.md')).read()
a = t.index('How to verify this page')
b = t.index('```sh', a); e = t.index('```', b + 5)
lines = [l for l in t[b + 5:e].split('\n') if l.strip() and not l.strip().startswith('#')]
env = dict(os.environ)
fails = 0; n = 0
for line in lines:
    m = re.match(r'^([A-Z]+)=(\S+)\s*$', line)
    if m:
        env[m.group(1)] = m.group(2); continue
    n += 1
    cmd = line.split('  #')[0].split(' # ')[0].strip()
    r = subprocess.run(['bash', '-c', cmd], cwd=root, env=env, capture_output=True, text=True)
    out = (r.stdout + r.stderr).strip().split('\n')
    last = out[-1][:160] if out else ''
    if r.returncode != 0: fails += 1
    print(f'{r.returncode}\t{cmd[:110]}\t{last}')
print(f'commands {n} nonzero {fails}')
