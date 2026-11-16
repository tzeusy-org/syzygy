#!/usr/bin/env python3
"""rev-525b: one line per probe record in DIR (run-*.json): case, tool sha, commit, edits' occurrence counts, outcome.

usage: python3 -I summarize.py DIR"""
import glob, json, os, sys

for path in sorted(glob.glob(os.path.join(sys.argv[1], 'run-*.json'))):
    r = json.load(open(path))
    s, run = r.get('summary', {}), r.get('run', {})
    occ = [e['occurrences'] for e in r.get('editChecks', [])]
    failed = '; '.join(f"{f['name'][-55:]} {f['ms']} ms{' ETIMEDOUT' if f['etimedout'] else ''}" for f in s.get('failed', []))
    k7477 = '; '.join(f"t={k['t']} {k['argv'][-40:]}" for k in run.get('killedOn7477', []))
    print(f"{r['case']}: tool {r['toolSha256'][:12]} commit {r['commit'][:8]} files {list(r['files'].values()) or '-'} "
          f"occ {occ} build {r.get('build', {}).get('exitCode', '-')} tree-clean {r['treeCleanAfter']} | exit {s.get('exitCode')} "
          f"{s.get('wallSeconds')} s {s.get('statuses')} | 7477 {s.get('port7477Seen')}/{s.get('samples')} mean {s.get('meanInterval')} "
          f"load1 {s.get('load1', {}).get('start')}-{s.get('load1', {}).get('end')} own {s.get('ownListeningPorts')} "
          f"surv {s.get('survivors')} | failed: {failed or '-'}{' | killedOn7477: ' + k7477 if k7477 else ''} "
          f"| passesExpectation {r.get('passesExpectation')}")
