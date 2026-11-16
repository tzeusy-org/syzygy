#!/usr/bin/env python3
"""rev-532d (round 4): items 1 and 2's byte checks for PR 532. Reviewer tool, not authority.

usage: python3 -I identity_r4.py CLONE R3_VARIANTS OUT.json

Item 1: extracts d38d7a3c's daemon-entry test lines 212-227 (1-indexed) and counts them in the test at 23af2d08 two
ways (substring count, and a line-window scan); diffs the test d0467aeb -> 23af2d08 line by line (difflib) and reports
every opcode. Item 2: loads the probe's MUTANTS at 23af2d08 (executing only the module's statements up to and including
the MUTANTS assignment, with a dummy argv) and rev-532c's VARIANTS, compares Y1-Y5's (old, new) fragments, and applies
each to main.ts at 23af2d08, comparing the resulting bytes.
"""
import ast, difflib, hashlib, json, subprocess, sys

clone, r3_path, out_path = sys.argv[1:4]
git = lambda *a: subprocess.run(['git', *a], cwd=clone, capture_output=True, check=True).stdout.decode()
sha = lambda s: hashlib.sha256(s.encode()).hexdigest()
DE = 'packages/cap1-system/src/daemon-entry-unchanged.system.test.ts'
BASE, PRE, HEAD = 'd38d7a3c', 'd0467aeb', '23af2d08'
out = {}

base_lines = git('show', f'{BASE}:{DE}').split('\n')
block_lines = base_lines[211:227]
block = '\n'.join(block_lines) + '\n'
head_text, pre_text = git('show', f'{HEAD}:{DE}'), git('show', f'{PRE}:{DE}')
head_lines, pre_lines = head_text.split('\n'), pre_text.split('\n')
windows = [i + 1 for i in range(len(head_lines) - len(block_lines) + 1) if head_lines[i:i + len(block_lines)] == block_lines]
out['item1'] = {
    'baseBlockFirstLine': block_lines[0], 'baseBlockSecondLine': block_lines[1], 'baseBlockLastLine': block_lines[-1],
    'baseBlockLines': len(block_lines), 'baseBlockSha256': sha(block),
    'substringCountAtHead': head_text.count(block), 'lineWindowStartsAtHead': windows,
    'substringCountAtPre': pre_text.count(block),
    'headTestSha256': sha(head_text), 'preTestSha256': sha(pre_text),
}
ops = []
for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(a=pre_lines, b=head_lines, autojunk=False).get_opcodes():
    if tag != 'equal': ops.append({'tag': tag, 'pre': [i1 + 1, i2], 'head': [j1 + 1, j2], 'removed': pre_lines[i1:i2], 'added': head_lines[j1:j2]})
out['item1']['diffOps'] = ops
if len(ops) == 1 and ops[0]['tag'] == 'insert':
    added = ops[0]['added']
    tail = '\n'.join(added[-len(block_lines):]) + '\n'
    out['item1']['insertedIsBlankPlusCommentPlusBlock'] = {
        'insertedLines': len(added), 'firstIsBlank': added[0] == '', 'tailEqualsBaseBlock': tail == block,
        'comment': added[1:len(added) - len(block_lines)],
        'commentAllStartWithSlashes': all(l.startswith('  // ') for l in added[1:len(added) - len(block_lines)]),
    }

probe_src = git('show', f'{HEAD}:docs/evidence/syzygy-bpyt-4-5/tools/daemon_entry_probe.py')
tree = ast.parse(probe_src)
stop = next(i for i, n in enumerate(tree.body) if isinstance(n, ast.Assign) and any(getattr(t, 'id', None) == 'MUTANTS' for t in n.targets))
prefix = ast.Module(body=tree.body[:stop + 1], type_ignores=[])
ns = {'__name__': 'probe_prefix'}
saved = sys.argv
sys.argv = ['probe', '/nonexistent', '/nonexistent.json']
exec(compile(prefix, 'daemon_entry_probe.py', 'exec'), ns)
sys.argv = saved
probe = {m['id']: m for m in ns['MUTANTS'] if m}
r3 = {}
exec(open(r3_path, encoding='utf8').read(), r3)
main_text = git('show', f'{HEAD}:apps/syzygy/src/main.ts')
ys = ['Y1-dossier-serve-falls-through', 'Y2-dossier-serve-reenters-main', 'Y3-flag-rewrites-argv-into-dossier', 'Y4-polaris-labelled-break',
      'Y5-dossier-serve-callback-after-branch']
item2 = {}
for y in ys:
    p, v = probe.get(y), r3['VARIANTS'].get(y)
    edits = v['edits']
    applied_r3 = main_text
    for old, new in edits:
        assert applied_r3.count(old) == 1, (y, 'r3 old not once')
        applied_r3 = applied_r3.replace(old, new)
    applied_probe = main_text.replace(p['old'], p['new']) if main_text.count(p['old']) == 1 else None
    item2[y] = {'inProbe': p is not None, 'probeKind': p['kind'], 'probeFile': p['file'], 'r3Edits': len(edits),
                'fragmentsEqual': len(edits) == 1 and (p['old'], p['new']) == edits[0],
                'probeOldOnceInMain': main_text.count(p['old']) == 1,
                'appliedEqual': applied_probe == applied_r3, 'appliedSha256': sha(applied_r3),
                'noteEqual': p['note'] == v['note'] or v['note'].startswith(p['note'])}
out['item2'] = item2
out['probeIdsY'] = sorted(k for k in probe if k.startswith('Y'))
out['mainTsSha256AtHead'] = sha(main_text)
json.dump(out, open(out_path, 'w', encoding='utf8'), indent=1, ensure_ascii=False)
print(json.dumps({'substringCountAtHead': out['item1']['substringCountAtHead'], 'lineWindowStartsAtHead': windows,
                  'diffOps': [(o['tag'], o['pre'], o['head']) for o in ops],
                  'inserted': out['item1'].get('insertedIsBlankPlusCommentPlusBlock', {}).get('tailEqualsBaseBlock'),
                  'Y': {y: (d['fragmentsEqual'], d['appliedEqual'], d['probeKind']) for y, d in item2.items()}, 'probeIdsY': out['probeIdsY']}))
