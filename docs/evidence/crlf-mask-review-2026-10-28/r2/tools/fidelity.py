"""Fidelity of the round-2 repair: each pin present byte for byte at the code head, nothing else changed in the two test
files, and the production mask byte-equal at three commits. Run from the clone root: python3 -I fidelity.py <lead/b16 dir>"""
import hashlib, subprocess, sys

lead = sys.argv[1]
def show(commit, path):
    return subprocess.run(['git', 'show', f'{commit}:{path}'], capture_output=True, check=True).stdout

def check(path, pin_file, anchor):
    pin = open(f'{lead}/{pin_file}', 'rb').read()
    before, after = show('c399eda9', path), show('224e8faa', path)
    print(path)
    print('  pin bytes', len(pin), 'sha256', hashlib.sha256(pin).hexdigest())
    print('  occurrences of pin at 224e8faa:', after.count(pin), 'at c399eda9:', before.count(pin))
    # Removing exactly the pin and one following blank line must give the round-1 file back.
    restored = after.replace(pin + b'\n', b'', 1)
    print('  head minus pin+blank == c399eda9:', restored == before)
    i = after.index(pin)
    following = after[i + len(pin):i + len(pin) + 1 + len(anchor)]
    print('  pin followed by blank line then anchor:', following == b'\n' + anchor)
    print('  U+00A0 in head file:', after.decode('utf-8').count(chr(0xa0)), 'raw CR:', after.count(b'\r'))

check('packages/three-surface-poc-core/src/markdown-code-context.test.ts', 'f1-pin.ts',
      b'  // This test compares a rendering with another, so it proves equality, not correctness')
check('packages/three-surface-poc-core/src/git-object-reader.test.ts', 'n2a-gap.ts',
      b"describe('declared resource limits are evaluation inputs', () => {")

rows = open(f'{lead}/f1-mutant-rows.py', 'rb').read()
mp = 'docs/evidence/syzygy-bpyt-16/crlf-mask-mutants.py'
m = show('224e8faa', mp)
print(mp, 'rows sha256', hashlib.sha256(rows).hexdigest(), 'occurrences at 224e8faa:', m.count(rows), 'at c399eda9:', show('c399eda9', mp).count(rows))

prod = 'packages/three-surface-poc-core/src/markdown-code-context.ts'
for c in ['d621bfa2', 'f7ea8584', '6928b50a', 'c399eda9', '224e8faa', '561e4f77']:
    b = show(c, prod)
    print(prod, c, len(b), hashlib.sha256(b).hexdigest())
names = subprocess.run(['git', 'diff', '--name-only', 'c399eda9', '561e4f77', '--', 'apps', 'packages', 'scripts'], capture_output=True, text=True, check=True).stdout.split()
print('code paths changed c399eda9..561e4f77:', names)
