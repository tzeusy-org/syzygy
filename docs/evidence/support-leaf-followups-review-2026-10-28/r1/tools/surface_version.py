import hashlib, subprocess, sys
clone = sys.argv[1]
for rev in sys.argv[2:]:
    trees = [subprocess.run(['git', '-C', clone, 'rev-parse', f'{rev}:{p}'], capture_output=True, check=True, text=True).stdout.strip()
             for p in ['apps/three-surface-poc/src', 'packages/three-surface-poc-core/src']]
    print(rev, 'polaris@' + hashlib.sha256('\n'.join(trees).encode()).hexdigest()[:12], trees)
