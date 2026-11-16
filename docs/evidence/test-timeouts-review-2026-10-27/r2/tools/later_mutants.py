#!/usr/bin/env python3
"""Reviewer mutants of check_removals.py's --later input (R-GP-IMPL-TEST-TIMEOUTS-2).

usage: python3 -I later_mutants.py EVIDENCE-DIR MATCH-TOOL MY-CENSUS-546 MY-CENSUS-HEAD REPO OUT.json

Runs the lane's check_removals.py on the retained inputs with a mutated copy of later-observations.json, then my
match_sites.py (head census vs the tool's holding set). A mutant is 'refuses' when the dossier hook is in notHolding,
'accepts' otherwise; the cross-check column says whether the head's absent set still equals the holding set."""
import copy, json, os, subprocess, sys, tempfile

ev, match_tool, c546, chead, repo, out_p = sys.argv[1:7]
TOOL = os.path.join(ev, 'tools', 'check_removals.py')
SITE = 'apps/three-surface-poc/src/polaris-generation/dossier-cap-measure.test.ts:12'
later = json.load(open(os.path.join(ev, 'later-observations.json')))
def m_drop(d): d['rows'] = []
def m_at(d): d['rows'][0]['worstMs'] = 5000
def m_over(d): d['rows'][0]['worstMs'] = 5001
def m_site(d): d['rows'][0]['site'] = SITE.replace(':12', ':13')
def m_dupe(d): d['rows'].append({**d['rows'][0], 'worstMs': 100})
MUTANTS = [('L0', 'unmutated', lambda d: None), ('L1', 'row dropped', m_drop), ('L2', 'worstMs at threshold 5000', m_at),
           ('L3', 'worstMs 5001', m_over), ('L4', 'site key names line 13 (no such removal)', m_site),
           ('L5', 'a second row for the same site with worstMs 100, appended', m_dupe)]
rows = []
with tempfile.TemporaryDirectory() as tmp:
    for mid, what, f in MUTANTS:
        d = copy.deepcopy(later); f(d)
        lp, op, mp = (os.path.join(tmp, f'{mid}-{n}.json') for n in ('later', 'out', 'match'))
        json.dump(d, open(lp, 'w'))
        r = subprocess.run([sys.executable, '-I', TOOL, os.path.join(ev, 'decisions-546f1ff0.json'), os.path.join(ev, 'site-durations-head.json'),
                            os.path.join(ev, 'head-durations'), os.path.join(ev, 'full-runs.json'), op, '--later', lp], capture_output=True, text=True)
        o = json.load(open(op))
        m = subprocess.run([sys.executable, '-I', match_tool, repo, '546f1ff0', c546, 'e54f65c6', chead, op, mp], capture_output=True, text=True)
        mo = json.load(open(mp))
        rows.append({'id': mid, 'mutant': what, 'toolExit': r.returncode, 'holding': o['holding'], 'dossier': 'refuses' if SITE in o['notHolding'] else 'accepts',
                     'laterSitesListed': o['later']['sites'], 'absentEqualsHolding': mo['absentEqualsHolding'], 'holdingNotAbsent': mo['holdingNotAbsent']})
        print(json.dumps(rows[-1]))
json.dump(rows, open(out_p, 'w'), indent=1)
