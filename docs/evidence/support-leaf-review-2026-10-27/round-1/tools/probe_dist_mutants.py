"""rev-530: mutate a built dist file in place (exact-once replacement), or restore it. Usage: probe_dist_mutants.py <file> <old> <new> | --restore <file>"""
import sys, shutil, os
if sys.argv[1] == '--restore':
    f = sys.argv[2]; shutil.move(f + '.rev530-orig', f); sys.exit(0)
f, old, new = sys.argv[1:4]
t = open(f).read(); assert t.count(old) == 1, t.count(old)
shutil.copy(f, f + '.rev530-orig'); open(f, 'w').write(t.replace(old, new, 1))
