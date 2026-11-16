"""Compare the bodies consent-ports.ts lost with the bodies in-force.ts gained, by script.

Usage: python3 -I verbatim.py <clone> <base-commit> <head-commit>
Prints the removed non-blank lines, the added non-blank lines, and every
difference after stripping a leading `export ` from the added side.
"""
import difflib
import subprocess
import sys

clone, base, head = sys.argv[1:4]


def show(rev, path):
    return subprocess.run(['git', '-C', clone, 'show', f'{rev}:{path}'], check=True, capture_output=True, text=True).stdout


old_cp = show(base, 'packages/polaris-generation-consent/src/consent-ports.ts').splitlines()
new_cp = show(head, 'packages/polaris-generation-consent/src/consent-ports.ts').splitlines()
in_force = show(head, 'packages/polaris-generation-consent/src/in-force.ts').splitlines()

sm = difflib.SequenceMatcher(a=old_cp, b=new_cp, autojunk=False)
removed, added_cp = [], []
for tag, i1, i2, j1, j2 in sm.get_opcodes():
    if tag in ('delete', 'replace'):
        removed.extend(old_cp[i1:i2])
    if tag in ('insert', 'replace'):
        added_cp.extend(new_cp[j1:j2])

removed_nb = [l for l in removed if l.strip()]
# in-force.ts body: drop the import line and the header comment block (lines starting with '//').
body = [l for l in in_force if l.strip() and not l.startswith('import ') and not l.startswith('// ')]
print('removed non-blank lines from consent-ports.ts:', len(removed_nb))
print('in-force.ts non-blank body lines (no import, no // header):', len(body))
print('lines added to consent-ports.ts:')
for l in added_cp:
    print('  +', l)

stripped = [l[len('export '):] if l.startswith('export ') else l for l in body]
exported = [l for l in body if l.startswith('export ')]
print('in-force.ts lines starting with "export ":', len(exported))
for l in exported:
    print('  ', l[:110])

diff = list(difflib.unified_diff(removed_nb, stripped, 'removed', 'in-force(export-stripped)', lineterm='', n=0))
print('differences removed vs in-force with export stripped:', 0 if not diff else len([d for d in diff if d[:1] in '+-' and not d.startswith(('+++', '---'))]))
for d in diff:
    print('  ', d[:160])

# Re-derive: is the in-force body a contiguous block of the old consent-ports.ts, in order?
joined_old = '\n'.join(l for l in old_cp if l.strip())
print('every stripped line occurs in old consent-ports.ts:', all(l in old_cp for l in stripped))

print('--- direct comparison, removed vs in-force body, no normalisation')
direct = [d for d in difflib.unified_diff(removed_nb, body, 'removed', 'in-force', lineterm='', n=0)]
for d in direct:
    print('  ', d[:160])
pairs = [(a, b) for a, b in zip(removed_nb, body) if a != b]
print('positional pairs differing:', len(pairs), 'of', len(body))
print('each differing pair differs only by a leading "export ":', all(b == 'export ' + a for a, b in pairs))
