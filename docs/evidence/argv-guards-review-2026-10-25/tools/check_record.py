"""rev-524: check the 8.34 evidence record against the git objects (rules 6 and 11).

Usage: python3 -I check_record.py <repo> <head> <base> <out.json>
"""
import hashlib, json, re, subprocess, sys

repo, head, base, out_file = sys.argv[1:5]
D = 'docs/evidence/syzygy-bpyt-8-34/'


def git(*args, check=True):
    return subprocess.run(['git', *args], cwd=repo, capture_output=True, check=check)


def show(commit, path):
    r = git('show', f'{commit}:{path}', check=False)
    return r.stdout if r.returncode == 0 else None


def sha(data):
    return hashlib.sha256(data).hexdigest()


findings, checks = [], []


def check(name, ok, detail=None):
    checks.append({'check': name, 'ok': bool(ok), **({'detail': detail} if detail is not None else {})})
    if not ok:
        findings.append(name)


record = json.loads(show(head, D + 'mutants-record.json'))
specs = json.loads(show(head, D + 'mutants.json'))
commit = record['subject']['commit']
check('record base is the stated base', record['subject']['base'] == base, record['subject']['base'])
check('record commit is an ancestor of head', git('merge-base', '--is-ancestor', commit, head, check=False).returncode == 0, commit)
apps_pkgs_diff = git('diff', '--name-only', commit, head, '--', 'apps', 'packages').stdout.decode().split()
check('record commit apps+packages equal head', apps_pkgs_diff == [], apps_pkgs_diff)
all_diff = git('diff', '--name-only', commit, head).stdout.decode().split()
check('files differing record commit -> head (informational)', True, all_diff)
for path, digest in record['subject']['files'].items():
    at_head, at_commit = show(head, path), show(commit, path)
    check(f'subject digest {path} at head', at_head is not None and sha(at_head) == digest)
    check(f'subject digest {path} at record commit', at_commit is not None and sha(at_commit) == digest)
diff = git('diff', base, commit, '--', 'apps', 'packages').stdout
check('diffSha256 re-derived', sha(diff) == record['subject']['diffSha256'], sha(diff))
for path, digest in record['tools'].items():
    data = show(head, path)
    check(f'tool digest {path} equals committed bytes', data is not None and sha(data) == digest, None if data is None else sha(data))

by_id = {r['id']: r for r in record['results']}
spec_list = specs['controls'] + specs['mutants']
check('record ids == spec ids, same order', [s['id'] for s in spec_list] == [r['id'] for r in record['results']])
per = []
for spec in spec_list:
    r = by_id.get(spec['id'])
    row = {'id': spec['id']}
    check(f"{spec['id']}: record edits equal spec edits", r is not None and r['edits'] == spec['edits'])
    occurrences = []
    for edit in spec['edits']:
        if 'create' in edit:
            occurrences.append({'file': edit['file'], 'absentAtCommit': show(commit, edit['file']) is None,
                                'absentAtHead': show(head, edit['file']) is None})
            check(f"{spec['id']}: created file absent at commit", show(commit, edit['file']) is None, edit['file'])
            continue
        text_c = (show(commit, edit['file']) or b'').decode()
        text_h = (show(head, edit['file']) or b'').decode()
        text_b = (show(base, edit['file']) or b'').decode()
        occ = {'file': edit['file'], 'atCommit': text_c.count(edit['old']), 'atHead': text_h.count(edit['old']),
               'atBase': text_b.count(edit['old'])}
        occurrences.append(occ)
        check(f"{spec['id']}: old occurs once at record commit ({edit['file']})", occ['atCommit'] == 1, occ)
    row['occurrences'] = occurrences
    if r is not None:
        control = spec['family'] == 'control'
        want = ('passes' if r['exit'] == 0 else 'FAILS') if control else ('killed' if r['exit'] != 0 else 'survives')
        check(f"{spec['id']}: verdict agrees with exit", r['verdict'] == want, (r['verdict'], r['exit']))
        check(f"{spec['id']}: verdict is the expected one", r['verdict'] == spec['expect'], (r['verdict'], spec['expect']))
        rows = [f for f in r['failed'] if ' > ' in f]
        m = re.search(r'Tests\s+(\d+) failed', ' '.join(r['tests']))
        nfailed = int(m.group(1)) if m else 0
        if not control and r['verdict'] == 'killed':
            check(f"{spec['id']}: killed with failed test rows", len(rows) > 0, rows)
        check(f"{spec['id']}: Tests-line failed count equals failed rows", nfailed == len(rows), (nfailed, len(rows)))
        if r['verdict'] in ('survives', 'passes'):
            check(f"{spec['id']}: a pass has no failed rows", nfailed == 0 and rows == [], (nfailed, rows))
        row.update({'verdict': r['verdict'], 'exit': r['exit'], 'tests': r['tests'], 'failedRows': rows})
    per.append(row)

files_digest = {name: sha(show(head, D + name)) for name in ['mutants-record.json', 'island-differential.json', 'dossier-golden.json',
                                                               'test-delta.json']}
out = {'head': head, 'base': base, 'recordCommit': commit, 'fileDigests': files_digest, 'checks': len(checks),
       'failedChecks': findings, 'perMutant': per, 'allChecks': checks}
json.dump(out, open(out_file, 'w'), indent=1, ensure_ascii=False)
print('checks', len(checks), 'failed', len(findings))
for f in findings:
    print('  FAIL', f)
print(json.dumps(files_digest, indent=1))
print('record commit -> head differing files:', all_diff)
for row in per:
    print(row['id'], row.get('verdict'), row.get('exit'), [(o['file'].split('/')[-1], o.get('atCommit'), o.get('atHead'), o.get('atBase')) for o in row['occurrences']])
