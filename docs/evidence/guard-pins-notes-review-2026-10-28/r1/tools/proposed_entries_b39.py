"""Check the reviewer's proposed --selftest entries for docs/evidence/syzygy-bpyt-39/record.py: with them appended, the unmutated
selftest must kill every entry, and each mutant that site_drop_b39.py found unexercised must now leave exactly its entry SURVIVED.
Usage: python3 -I proposed_entries_b39.py <tree> <scratch dir> <out.json>
"""
import hashlib, json, os, subprocess, sys

tree, scratch, out = (os.path.realpath(a) for a in sys.argv[1:4])
REC = 'docs/evidence/syzygy-bpyt-39/record.py'
source = open(os.path.join(tree, REC)).read()
END = "    'a product file in the subject': {'@names': lambda names: sorted([*names, 'packages/support/src/index.ts'])},\n}\n"
ENTRIES = {
    'a root case app does not load from the workspace':
        "{'root-exception-probe.json': lambda d: (next(r for r in d['results'] if r['id'] == 'R3')['loads']['app'].update(path='nowhere/package.json'), d)[1]}",
    'a lane trace compared with another record':
        "{'npmrc-trace-lane-probe-before.json': lambda d: (d.update(reference='docs/evidence/syzygy-bpyt-39/root-exception-probe.json'), d)[1]}",
    'a comment-only selftest that misses a rename':
        "{'comment-only.json': lambda d: (d['selftest']['identifierRenamed'].update(printEqual=True), d)[1]}",
    'an unmutated predicate run that fails':
        "{'record-predicate-mutants.json': lambda d: (next(r for r in d['rows'] if r['id'] == 'S0-unmutated').update(survived=['x'], exit=1), d)[1]}",
    'a root case npm installs as a copy':
        "{'root-exception-probe.json': lambda d: (next(r for r in d['results'] if r['id'] == 'R5')['lockEntries']['node_modules/wlib'].update(link=False), d)[1]}",
    'a root case whose install fails':
        "{'root-exception-probe.json': lambda d: (next(r for r in d['results'] if r['id'] == 'R2').update(installExit=1), d)[1]}",
    'a testkit that states a root exception twice':
        "{'@kit': lambda kit: kit + \"// as a directory or a file, except in the root's manifest under a workspace's own name, where npm links that workspace;\\n\"}",
}
MUTANTS = [  # (id, old, new, the entry that must then survive alone)
    ('P5', "            problems.append(f'root-exception-probe {cid}: app does not load the workspace')",
     "            (lambda *a: None)(f'root-exception-probe {cid}: app does not load the workspace')", 'a root case app does not load from the workspace'),
    ('P10', "            problems.append(f'npmrc-trace {name}: compared with another record')",
     "            (lambda *a: None)(f'npmrc-trace {name}: compared with another record')", 'a lane trace compared with another record'),
    ('P12', "        problems.append('comment-only: the selftest does not separate a code change from a comment change')",
     "        (lambda *a: None)('comment-only: the selftest does not separate a code change from a comment change')", 'a comment-only selftest that misses a rename'),
    ('P16', "        problems.append('record-predicate-mutants: the unmutated selftest does not pass')",
     "        (lambda *a: None)('record-predicate-mutants: the unmutated selftest does not pass')", 'an unmutated predicate run that fails'),
    ('E1', " or not all(e.get('link') for e in entries.values())", '', 'a root case npm installs as a copy'),
    ('E2', "r.get('installExit') != 0 or ", '', 'a root case whose install fails'),
    ('E5', 'kit.count(t) != 1', 'kit.count(t) < 1', 'a testkit that states a root exception twice'),
    ('E7', ".get('app', {}).get('path') != 'w/package.json'", ".get('w', {}).get('path') != 'w/package.json'", 'a root case app does not load from the workspace'),
]
assert source.count(END) == 1
extended = source.replace(END, END[:-2] + ''.join(f'    {label!r}: {body},\n' for label, body in ENTRIES.items()) + '}\n')


def run(text, flag):
    path = os.path.join(scratch, 'record.py')
    open(path, 'w').write(text)
    r = subprocess.run(['python3', '-I', path, tree, flag], capture_output=True, text=True, timeout=1800)
    ls = r.stdout.splitlines()
    return {'exit': r.returncode, 'last': ls[-1] if ls else r.stderr[-300:], 'survived': [l.split(' | ')[1] for l in ls if l.startswith('SURVIVED | ')]}


os.makedirs(scratch, exist_ok=True)
rows = [{'id': 'X0-extended-unmutated', 'check': run(extended, '--check'), 'selftest': run(extended, '--selftest'), 'expected': []}]
for mid, old, new, entry in MUTANTS:
    assert extended.count(old) == 1, mid
    rows.append({'id': mid, 'old': old, 'new': new, 'check': run(extended.replace(old, new), '--check'),
                 'selftest': run(extended.replace(old, new), '--selftest'), 'expected': [entry]})
for r in rows:
    r['asExpected'] = r['selftest']['survived'] == r['expected']
    print(r['id'], '| check', r['check']['exit'], '| selftest', r['selftest']['exit'], r['selftest']['last'], '| survived', r['selftest']['survived'],
          'as expected' if r['asExpected'] else 'UNEXPECTED', flush=True)
os.remove(os.path.join(scratch, 'record.py'))
json.dump({'record': REC, 'recordSha256': hashlib.sha256(source.encode()).hexdigest(), 'entries': ENTRIES, 'rows': rows}, open(out, 'w'), indent=1)
