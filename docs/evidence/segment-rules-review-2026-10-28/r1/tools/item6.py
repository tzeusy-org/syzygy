"""Item 6: is the added support-purity row the retained fix file's bytes, inserted before the `let a = 1` case?"""
import hashlib, subprocess, sys
repo = sys.argv[1]
show = lambda rev, p: subprocess.run(['git', '-C', repo, 'show', f'{rev}:{p}'], capture_output=True, check=True).stdout
fix = show('9fd03a8e', 'docs/evidence/support-leaf-followups-review-2026-10-28/r2/tools/fix-n2-object-rest-row.ts.txt')
print('fix sha256', hashlib.sha256(fix).hexdigest(), 'bytes', len(fix), repr(fix))
base = show('c672492c', 'packages/support/src/support-purity.test.ts')
head = show('9fd03a8e', 'packages/support/src/support-purity.test.ts')
anchor = b"    ['let a = 1; a += 1; [a] = [2];', []],\n"
print('anchor count base', base.count(anchor), 'head', head.count(anchor))
i = base.index(anchor)
expected = base[:i] + fix + base[i:]
print('head == base with fix inserted before anchor:', expected == head)
