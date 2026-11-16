"""Run PROJECT-STATUS.md's canonical battery block, one command at a time, from the tree given; print commit, count and nonzero."""
import re, subprocess, sys
tree = sys.argv[1]
text = open(f'{tree}/PROJECT-STATUS.md').read()
block = text[text.index('## How to verify this page'):]
block = block[block.index('```sh\n') + 6:]
block = block[:block.index('\n```')]
env_lines, nonzero, n = [], [], 0
for line in block.split('\n'):
    if not line.strip() or line.lstrip().startswith('#'):
        continue
    n += 1
    if re.match(r'^[A-Z_]+=\S+$', line.strip()):
        env_lines.append(line.strip())
        continue
    r = subprocess.run(['bash', '-c', '; '.join(env_lines + [line])], cwd=tree, capture_output=True, text=True)
    if r.returncode != 0:
        nonzero.append((line, r.returncode, (r.stdout + r.stderr)[-300:]))
commit = subprocess.run(['git', '-C', tree, 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip()
print(f'commit={commit} commands={n} nonzero={len(nonzero)}')
for x in nonzero:
    print(x)
