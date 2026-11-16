"""Independent reviewer check (rev-530) of the 6.3 evidence record against git objects.
Usage: check_record.py <repo> <record path at commit> <commit>"""
import json, subprocess, sys, hashlib, re
repo, path, commit = sys.argv[1:4]
git = lambda *a, **k: subprocess.run(['git', '-C', repo, *a], capture_output=True, **k)
rec = json.loads(git('show', f'{commit}:{path}', check=True).stdout)
out = {'subject': {}, 'tools': {}, 'mutants': [], 'summary': {}}
for k in ('baseCommit', 'headCommit'):
    c = rec['subject'][k]
    out['subject'][k] = {'value': c, 'type': git('cat-file', '-t', c, text=True).stdout.strip(), 'ancestorOfReviewed': git('merge-base', '--is-ancestor', c, commit).returncode == 0}
evdir = path.rsplit('/', 1)[0]
for name, digest in rec['toolsSha256'].items():
    blob = git('show', f'{commit}:{evdir}/{name}').stdout
    out['tools'][name] = hashlib.sha256(blob).hexdigest() == digest
mh = rec['mutants']['head']
kinds = {'killed': 0, 'survived': 0}
for row in rec['mutants']['rows']:
    blob = git('show', f"{mh}:{row['file']}").stdout.decode('utf8')
    n = blob.count(row['old'])
    mc = row.get('commit')
    mtype = git('cat-file', '-t', mc, text=True).stdout.strip() if mc else None
    reach = git('branch', '-a', '--contains', mc, text=True).stdout.strip() if mtype == 'commit' else None
    # does the mutant commit, if present, apply exactly old->new to the head file?
    applied = None
    if mtype == 'commit':
        mblob = git('show', f"{mc}:{row['file']}").stdout.decode('utf8')
        applied = (blob.replace(row['old'], row['new'], 1) == mblob)
    det = row['detectors']
    killed_any = any(d.get('killed') for d in det.values())
    verdict_ok = row['verdict'].startswith('killed') == killed_any
    named = sorted(k for k, d in det.items() if d.get('killed'))
    verdict_names = sorted(re.findall(r'static|probe|tests', row['verdict']))
    # tests summary agrees with killed flag
    t = det.get('tests', {})
    summ = ' '.join(t.get('summary', []))
    tfailed = bool(re.search(r'Tests\s+\d+ failed', summ))
    out['mutants'].append({'id': row['id'], 'oldCountAtHead': n, 'mutantCommit': mtype, 'mutantCommitReachableFrom': reach or None, 'mutantCommitIsExactlyOldToNew': applied,
                           'verdictConsistent': verdict_ok and named == verdict_names, 'testsKilledAgreesWithSummary': (t.get('killed') == tfailed) if t else None,
                           'probeKilledAgreesWithRows': (det['probe'].get('killed') == (det['probe'].get('rowsThatDiffer', 0) > 0)) if det['probe'].get('killed') is not None else 'n/a',
                           'staticKilledAgreesWithFiles': det['static'].get('killed') == bool(det['static'].get('files'))})
    kinds['killed' if killed_any else 'survived'] += 1
out['summary'] = kinds | {'testsMissed': [r['id'] for r in rec['mutants']['rows'] if not r['detectors']['tests'].get('killed')]}
print(json.dumps(out, indent=1))
