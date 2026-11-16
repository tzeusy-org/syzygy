#!/usr/bin/env python3
"""Is F1's measure (and F2's non-vacuity text, and the N12 sentence) the same text in the record, the lane's follow-up JSON and the PR body?

Usage: text_parity.py <census.json> <followups.json> <lane-report.md> <pr-body.md> <out.json>

Word-level differences only (difflib over whitespace-split words), so a reader sees exactly which words each carrier adds or drops.
"""
import difflib
import json
import re
import sys

census = json.load(open(sys.argv[1]))
follow = {f['id']: f for f in json.load(open(sys.argv[2]))}
report = open(sys.argv[3]).read()
body = open(sys.argv[4]).read()
lane_json = json.loads(re.search(r'Discovered-Follow-Ups-JSON:\n```json\n(.*?)\n```', report, re.S).group(1))
lane = {f['id']: f for f in lane_json}


def word_diff(a, b):
    wa, wb = a.split(), b.split()
    out = []
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(a=wa, b=wb, autojunk=False).get_opcodes():
        if op != 'equal':
            out.append({'op': op, 'record': ' '.join(wa[i1:i2]), 'other': ' '.join(wb[j1:j2])})
    return out


rec_f1 = census['followUps'][0]['measure']
json_f1 = follow['F1']['description']
json_f1_measure = json_f1[json_f1.index('Measure: ') + len('Measure: '):]
rec_f2_what, rec_f2_measure = census['followUps'][1]['what'], census['followUps'][1]['measure']
json_f2 = follow['F2']['description']
body_lines = body.splitlines()
body_f1 = [l for l in body_lines if 'Measure (round 2, F3)' in l]
body_f1_measure = body_f1[0][body_f1[0].index('**Measure (round 2, F3):**') + len('**Measure (round 2, F3):**'):].strip() if body_f1 else None
body_f3 = [l for l in body_lines if l.startswith('- **F3 (blocking)')]
pass_condition = "reads syzygy-poc-browser- and chrome-singleton-directory stillThere 0 and the killed run's marker count 0"
result = {
    'followupsJsonEqualsLaneReportJson': follow == lane,
    'f1': {
        'recordVsFollowUpJson': word_diff(rec_f1, json_f1_measure),
        'recordVsPrBody': word_diff(rec_f1, body_f1_measure) if body_f1_measure else 'no "Measure (round 2, F3)" line in the PR body',
        'passConditionOfPartTwo': {'record': pass_condition in rec_f1, 'followUpJson': pass_condition in json_f1_measure,
                                   'prBodyFollowUpLine': bool(body_f1_measure) and 'stillThere' in body_f1_measure,
                                   'prBodyRepairLine': bool(body_f3) and 'stillThere 0 and the killed' in body_f3[0]},
        'inferredSentence': {'record': '[Inferred, the harness was not run for this]' in rec_f1, 'followUpJson': '[Inferred' in json_f1_measure,
                             'prBody': '[Inferred, the harness was not run for this]' in body},
    },
    'f2': {
        'nonVacuityBranchInRecordWhat': 'dead-owner root holding an entry of an R9 class and one of an R6 class' in rec_f2_what,
        'nonVacuityBranchInFollowUpJson': 'dead-owner root holding an entry of an R9 class and one of an R6 class' in json_f2,
        'freshRunWordingRecord': "a fresh run started in the killed run's leftovers" in rec_f2_what and "a fresh run started in the killed run's leftovers" in rec_f2_measure,
        'freshRunWordingFollowUpJson': "a fresh run started in the killed run's leftovers" in json_f2,
        'oldWordingGone': {'record': 'same private TMPDIR' not in rec_f2_what + rec_f2_measure, 'followUpJson': 'same private TMPDIR' not in json_f2},
        'measureCarriedInFollowUpJson': 'leftBySIGKILL lists only' in json_f2,
        'assemblerRuleClause': {'record': 'needs a disposition rule for the root' in rec_f2_what, 'followUpJson': 'needs a disposition rule for the root' in json_f2},
    },
    'n12': {
        'record': {fid: census['followUps'][i]['measure'].count('round 2, N12') for i, fid in ((0, 'F1'), (1, 'F2'))},
        'followUpJson': {fid: follow[fid]['description'].count('round 2, N12') for fid in ('F1', 'F2')},
        'namesTheRound2RawFile': {'record': 'R-GP-IMPL-SCRATCH-PREFIX-CENSUS-2' in json.dumps(census['followUps']), 'followUpJson': 'R-GP-IMPL-SCRATCH-PREFIX-CENSUS-2' in json.dumps(list(follow.values()))},
    },
}
open(sys.argv[5], 'w').write(json.dumps(result, indent=1) + '\n')
print(json.dumps(result, indent=1))
