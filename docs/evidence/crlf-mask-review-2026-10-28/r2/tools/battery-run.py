"""Runs PROJECT-STATUS.md's canonical battery block, line by line, in a fresh clone at a commit (the method of the lead's
battery_clone.py, rewritten to keep its clone and logs under this review's directory). Usage: python3 -I battery-run.py <commit> <dir>
Writes <dir>/battery/NNN.log per command and <dir>/battery/SUMMARY.txt; deletes the clone."""
import os, re, shutil, subprocess, sys
commit, base = sys.argv[1], sys.argv[2]
wt, out = os.path.join(base, 'battery-clone'), os.path.join(base, 'battery')
shutil.rmtree(wt, ignore_errors=True); shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
subprocess.run(['git', 'clone', '-q', '--no-hardlinks', '/home/tze/GitHub/syzygy', wt], check=True)
subprocess.run(['git', '-C', wt, 'checkout', '-q', '--detach', commit], check=True)
text = open(os.path.join(wt, 'PROJECT-STATUS.md'), encoding='utf8').read()
sec = text[text.index('How to verify this page'):]
block = re.search(r'```(?:sh|bash)\n(.*?)\n```', sec, re.S).group(1)
env = dict(os.environ)
results = []
for n, cmd in enumerate((l.strip() for l in block.split('\n')), 1):
    if not cmd or cmd.startswith('#'):
        continue
    if re.match(r'^[A-Z_]+=\S+$', cmd):
        k, v = cmd.split('=', 1); env[k] = v; continue
    p = subprocess.run(['bash', '-c', cmd], cwd=wt, env=env, capture_output=True, text=True)
    open(os.path.join(out, f'{n:03d}.log'), 'w').write(f'$ {cmd}\n--- stdout\n{p.stdout}\n--- stderr\n{p.stderr}\n')
    results.append((n, p.returncode, cmd[:100]))
bad = [r for r in results if r[1] != 0]
summary = f'commit={commit} commands={len(results)} nonzero={len(bad)}\n' + ''.join(f'NONZERO {r}\n' for r in bad)
open(os.path.join(out, 'SUMMARY.txt'), 'w').write(summary)
print(summary)
shutil.rmtree(wt, ignore_errors=True)
