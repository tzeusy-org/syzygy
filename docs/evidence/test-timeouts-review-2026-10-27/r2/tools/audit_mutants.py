#!/usr/bin/env python3
"""Reviewer mutants of citation_audit.py's new file-match predicate (R-GP-IMPL-TEST-TIMEOUTS-2).

usage: python3 -I audit_mutants.py REPO OUT.json

Loads the lane's citation_audit.py from REPO as a module (no edit to it), reads census-head.json and every cited record at
the census commit, and audits one site over a mutated copy of one cited record with the lane's own audit_site(). Each
mutant rewrites every string and key of the record. 'killed' means the site's verdict drops to a counted residual
(measured None); 'survived' means the mutated record still measures it.

  R1 stem:        a hook measured by file; every full path and file name of its file is cut to the stem
                  (polaris-copy.test.ts -> polaris-copy); the record then names no file of the site.
  R2 same name:   the same hook; every occurrence of its file is rewritten to a file of the same basename in another
                  directory (packages/elsewhere/src/polaris-copy.test.ts); the record then names a different file.
  R3 titled/file: a titled test measured by test (production-reobserve:160); its title is replaced in both cited records,
                  so they name only its file; a titled test with only a file match must become a residual.
  R4 same name, test: R2's rewrite applied to a titled test measured by test name, keeping the title
                  (production-reobserve:160, both records); the record then names a test of the same title in another file.
  C1 control:     R2's rewrite to the site's own path (no change in meaning), which must still measure the site.
"""
import copy, importlib.util, json, os, subprocess, sys

repo, out_path = sys.argv[1:3]
ev = os.path.join(repo, 'docs/evidence/syzygy-bpyt-4-31')
spec = importlib.util.spec_from_file_location('citation_audit', os.path.join(ev, 'tools/citation_audit.py'))
ca = importlib.util.module_from_spec(spec); spec.loader.exec_module(ca)
census = json.load(open(os.path.join(ev, 'census-head.json')))
commit = census['commit']
sites = {f"{s['path']}:{s['line']}": s for s in census['sites']}
def record(path):
    try: return json.loads(subprocess.run(['git', '-C', repo, 'show', f'{commit}:{path}'], capture_output=True, text=True, check=True).stdout)
    except ValueError: return None
def rewrite(node, f):
    if isinstance(node, dict): return {f(k): rewrite(v, f) for k, v in node.items()}
    if isinstance(node, list): return [rewrite(v, f) for v in node]
    return f(node) if isinstance(node, str) else node
def audit(key, mutate):
    site = sites[key]
    records = {p: record(p) for p in site['citations']['measurements']}
    before = ca.audit_site(site, records, {})['measured']
    after_records = {p: (rewrite(copy.deepcopy(d), mutate) if d is not None else None) for p, d in records.items()}
    after = ca.audit_site(site, after_records, {})
    return before, after
HOOK = 'apps/three-surface-poc/src/polaris-copy.test.ts:226'
TEST = 'apps/three-surface-poc/src/production-reobserve.test.ts:160'
hp, hb = HOOK.rsplit(':', 1)[0], HOOK.rsplit(':', 1)[0].split('/')[-1]
tp, tb = TEST.rsplit(':', 1)[0], TEST.rsplit(':', 1)[0].split('/')[-1]
title = sites[TEST]['title']
def stem(s): return s.replace(hp, hb).replace(hb, hb.split('.')[0])
def elsewhere(path, base):
    return lambda s: s.replace(path, base).replace(base, 'packages/elsewhere/src/' + base)
MUTANTS = [
    ('R1', 'a stem match does not name the file', HOOK, stem, 'killed'),
    ('R2', 'a different file with the same basename does not name the file', HOOK, elsewhere(hp, hb), 'killed'),
    ('R3', 'a titled test matched by file only is a residual', TEST, lambda s: s.replace(title, 'some other test of the file'), 'killed'),
    ('R4', 'a same-titled test in a different file with the same basename does not name the test', TEST, elsewhere(tp, tb), 'killed'),
    ('C1', 'control: the site\'s own path written in full still names it', HOOK, lambda s: s.replace(hp, hb).replace(hb, hp), 'held'),
]
rows = []
for mid, what, key, f, want in MUTANTS:
    before, after = audit(key, f)
    got = 'held' if after['measured'] == before else 'killed' if after['measured'] is None else f'changed to {after["measured"]}'
    rows.append({'id': mid, 'predicate': what, 'site': key, 'before': before, 'after': after['measured'], 'expected': want,
                 'outcome': got if mid.startswith('C') else ('killed' if got == 'killed' else 'SURVIVED'),
                 'audits': [{'citation': a['citation'], 'measured': a['measured'], 'evidence': a['evidence'] if isinstance(a['evidence'], str) else
                             {k: a['evidence'].get(k) for k in ('rule', 'kind', 'name', 'duration')}, **({'refused': a['refused']} if 'refused' in a else {})} for a in after['audits']]})
    print(json.dumps({k: rows[-1][k] for k in ('id', 'site', 'before', 'after', 'outcome')}))
json.dump({'tool': 'audit_mutants.py', 'censusCommit': commit, 'auditSha256': __import__('hashlib').sha256(open(os.path.join(ev, 'tools/citation_audit.py'), 'rb').read()).hexdigest(), 'rows': rows}, open(out_path, 'w'), indent=1)
