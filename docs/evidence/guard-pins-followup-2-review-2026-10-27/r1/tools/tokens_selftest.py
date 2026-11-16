"""rev-541: rule-6 selftest of tokens_equal.cjs. Writes five mutated copies of the head testkit and checks that each code change
makes the token sequences differ and that an added comment leaves them equal.

Usage: python3 -I tokens_selftest.py <typescript module dir> <testkit-head.ts> <scratch dir> <out.json>
"""
import json, os, subprocess, sys

ts_dir, head_path, scratch, out = sys.argv[1:5]
here = os.path.dirname(os.path.abspath(__file__))
text = open(head_path, encoding='utf-8').read()
MUTANTS = {  # name: (old, new, count of replacements, tokens must stay equal)
    'regex-char': ('tar\\.gz)$/iu;', 'tar\\.gx)$/iu;', 1, False),
    'rename-localNames': ('localNames', 'localNamez', -1, False),
    'template-text': ('${parent}/${name}/package.json', '${parent}/${name}/package.jsom', 1, False),
    'string-literal': ("'./dist/'", "'./dist//'", 1, False),
    'add-comment': ('const LOCAL_VERSION', '/* extra */ const LOCAL_VERSION', 1, True),
}
os.makedirs(scratch, exist_ok=True)
rows = []
for name, (old, new, count, equal) in MUTANTS.items():
    assert old in text, name
    path = os.path.join(scratch, f'mut-{name}.ts')
    open(path, 'w', encoding='utf-8').write(text.replace(old, new, count))
    report = json.loads(subprocess.run(['node', os.path.join(here, 'tokens_equal.cjs'), ts_dir, head_path, path],
                                       capture_output=True, text=True, check=True).stdout)
    rows.append({'mutant': name, 'tokensEqual': report['tokensEqual'], 'expectedEqual': equal, 'ok': report['tokensEqual'] == equal,
                 'addedOutsideComment': report['addedOutsideComment']})
    os.remove(path)
json.dump(rows, open(out, 'w'), indent=1)
print(json.dumps(rows))
print('ok', sum(r['ok'] for r in rows), 'of', len(rows))
