# Rule 6: rewrite the shipped pattern one fragment at a time and confirm the equivalence test fails.
# usage: python3 mutants.py <root>
import json, subprocess, sys, os
root = sys.argv[1]; p = os.path.join(root, 'packages/three-surface-poc-core/src/git-object-reader.ts')
orig = open(p).read()
HEAD = r"const OBFUSCATED_DESTINATION = /\]\(\s*(?:<?[^)\s]*&(?:#\d+|#[xX][0-9a-fA-F]+|[A-Za-z][A-Za-z0-9]*);|((?:[^)\s\]]|\](?!\(\s))*))/g;"
assert orig.count(HEAD) == 1
M = [
 ('m1-drop-run-end-lookahead', HEAD.replace(r'|\](?!\(\s)', r'|\]')),
 ('m2-lookahead-without-ws', HEAD.replace(r'\](?!\(\s)', r'\](?!\()')),
 ('m3-consume-ws-in-skip', HEAD.replace(r'[^)\s\]]', r'[^)\]]')),
 ('m4-skip-consumes-close-paren', HEAD.replace(r'[^)\s\]]', r'[^\s\]]')),
 ('m5-skip-branch-captures-nothing', HEAD.replace(r'|((?:[^)\s\]]|\](?!\(\s))*))', r'|(?:[^)\s\]]|\](?!\(\s))*)')),
 ('m6-lazy-run', HEAD.replace(r'<?[^)\s]*&', r'<?[^)\s]*?&')),
 ('m7-drop-angle', HEAD.replace(r'(?:<?[^)\s]*&', r'(?:[^)\s<]*&')),
 ('m8-drop-hex-branch', HEAD.replace(r'|#[xX][0-9a-fA-F]+', '')),
 ('m9-skip-first', HEAD.replace(r'(?:<?[^)\s]*&(?:#\d+|#[xX][0-9a-fA-F]+|[A-Za-z][A-Za-z0-9]*);|((?:[^)\s\]]|\](?!\(\s))*))', r'(?:((?:[^)\s\]]|\](?!\(\s))*)|<?[^)\s]*&(?:#\d+|#[xX][0-9a-fA-F]+|[A-Za-z][A-Za-z0-9]*);)')),
 ('m10-sticky-flag', HEAD.replace(')*))/g;', ')*))/gy;')),
]
rows = []
for mid, new in M:
    assert new != HEAD, mid
    open(p, 'w').write(orig.replace(HEAD, new))
    try:
        r = subprocess.run(['npx', 'vitest', 'run', 'packages/three-surface-poc-core/src/obfuscated-destination-equivalence.test.ts', '-t', 'matches the replaced pattern'], cwd=root, capture_output=True, text=True, timeout=600)
        tail = [l for l in r.stdout.splitlines() if 'Tests ' in l]
        row = {'id': mid, 'old': HEAD, 'new': new, 'exit': r.returncode, 'tests': tail[-1].strip() if tail else None, 'killed': r.returncode != 0, 'killedBy': 'differential' if r.returncode != 0 else None}
        if r.returncode == 0:
            # A mutant with the same matches can still be quadratic: the timing rows judge it.
            t = subprocess.run(['npx', 'vitest', 'run', 'packages/three-surface-poc-core/src/obfuscated-destination-equivalence.test.ts', '-t', 'linear'], cwd=root, capture_output=True, text=True, timeout=600)
            ttail = [l for l in t.stdout.splitlines() if 'Tests ' in l]
            row.update({'timingExit': t.returncode, 'timingTests': ttail[-1].strip() if ttail else None, 'killed': t.returncode != 0, 'killedBy': 'timing' if t.returncode != 0 else None})
        rows.append(row)
    finally:
        open(p, 'w').write(orig)
print(json.dumps(rows, indent=1))
