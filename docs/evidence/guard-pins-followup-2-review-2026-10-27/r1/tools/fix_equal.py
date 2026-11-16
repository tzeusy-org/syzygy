"""rev-541: does HEAD's workspace-reach.test.ts equal the #536 reviewer's FIX-rows-only edits applied to BASE's?

Usage: python3 -I fix_equal.py <repo> <base> <head> <fix-specs.json at a commit, as a git path>
Reads every input from git objects. Also checks that no BASE line is removed or reordered (difflib opcodes are insert only),
that the FIX mutant's other edits touch no testkit, and that each `old` occurs once at BASE. Prints one JSON object.
"""
import difflib, hashlib, json, subprocess, sys

repo, base, head, specs_path = sys.argv[1:5]
TEST = 'packages/polaris-generation-core/src/workspace-reach.test.ts'


def show(rev, path):
    return subprocess.run(['git', 'show', f'{rev}:{path}'], cwd=repo, capture_output=True, check=True).stdout.decode('utf-8')


specs = json.loads(show(head, specs_path))
fix = next(m for m in specs['mutants'] if m['id'] == 'FIX-rows-only')
text = show(base, TEST)
olds = []
for edit in fix['edits']:
    assert edit['file'] == TEST, edit['file']
    olds.append(text.count(edit['old']))
    text = text.replace(edit['old'], edit['new'], 1)
head_text = show(head, TEST)
base_lines, head_lines = show(base, TEST).splitlines(), head_text.splitlines()
ops = [op for op in difflib.SequenceMatcher(a=base_lines, b=head_lines, autojunk=False).get_opcodes() if op[0] != 'equal']
added = [line for op in ops for line in head_lines[op[3]:op[4]]]
print(json.dumps({
    'fixEditFiles': sorted({e['file'] for e in fix['edits']}),
    'oldCountsAtBase': olds,
    'appliedEqualsHead': text == head_text,
    'appliedSha256': hashlib.sha256(text.encode()).hexdigest(),
    'headSha256': hashlib.sha256(head_text.encode()).hexdigest(),
    'opcodes': [op[0] for op in ops],
    'baseLinesRemovedOrReplaced': sum(op[2] - op[1] for op in ops),
    'linesAdded': len(added),
    'addedItTitles': [line.strip() for line in added if line.strip().startswith(('it(', "it(\"", '[\''))],
}, indent=1))
