#!/usr/bin/env python3
"""Summarize a vitest JSON report: totals, per-file status and counts, and every failed test with its first message line.

Usage: vsum.py <report.json> [<clone prefix to strip>]
"""
import json
import sys

d = json.load(open(sys.argv[1]))
prefix = sys.argv[2].rstrip('/') + '/' if len(sys.argv) > 2 else ''
print('total', d['numTotalTests'], 'passed', d['numPassedTests'], 'failed', d['numFailedTests'], 'pending', d['numPendingTests'],
      'files', len(d['testResults']), 'failedFiles', sum(f['status'] == 'failed' for f in d['testResults']), 'success', d['success'])
for f in d['testResults']:
    counts = {}
    for t in f['assertionResults']:
        counts[t['status']] = counts.get(t['status'], 0) + 1
    if len(d['testResults']) <= 12 or f['status'] != 'passed':
        print(' ', f['status'], f['name'].replace(prefix, ''), counts, (f.get('message') or '')[:300])
    for t in f['assertionResults']:
        if t['status'] == 'failed':
            print('    FAILED', t['fullName'], '::', (t.get('failureMessages') or [''])[0].split('\n')[0][:300])
