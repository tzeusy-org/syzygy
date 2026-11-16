"""rev-528: copies of the lane's island_diff.py whose --selftest applies a different testkit mutation (its selftest input).

Usage: python3 -I make_selftest_variants.py <lane_island_diff.py> <outdir>
  v-types:  the agreement check also compares `types`, so every @syzygy object entry names no one target: answers must differ;
  v-hash:   the # branch reads every # specifier as outside again (null): the tree has no # specifier, so answers must stay equal.
"""
import os, sys

source, outdir = sys.argv[1:3]
text = open(source).read()
LINE = 'MUTANT = ("[base.replace(/\\\\.js$/u, \'.ts\'), `${base}.ts`, `${base}/index.ts`]", "[`${base}.ts`, `${base}/index.ts`]")\n'
assert text.count(LINE) == 1, 'MUTANT line not found once'
variants = {
    'v-types': 'MUTANT = ("filter(([condition]) => condition !== \'types\')", "filter(() => true)")\n',
    'v-hash': 'MUTANT = ("  if (specifier.startsWith(\'#\')) {\\n", "  if (specifier.startsWith(\'#\')) return null;\\n  if (specifier.startsWith(\'#\')) {\\n")\n',
}
for name, line in variants.items():
    path = os.path.join(outdir, f'island_diff_{name}.py')
    open(path, 'w').write(text.replace(LINE, line))
    print(path)
