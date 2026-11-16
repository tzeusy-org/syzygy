#!/usr/bin/env python3
"""rev-525: one table row per probe record (OUTDIR/run-*.json), with the tool digest each was made by.

usage: python3 -I summarize.py OUTDIR TOOL_PATH"""
import glob, hashlib, json, os, re, sys

outdir, tool = sys.argv[1], sys.argv[2]
tool_sha = hashlib.sha256(open(tool, 'rb').read()).hexdigest()
paths = sorted(glob.glob(os.path.join(outdir, 'run-*.json')))
print(f'{len(paths)} records; current probe.py sha256 {tool_sha}')
short = lambda name: re.sub(r'^.*?(unchanged|first argument|symlink reality) ', '', name)[:44]
for p in paths:
    d = json.load(open(p))
    r, s = d['run'], d['summary']
    skipped = [short(t['name']) for t in r['tests'] if t['status'] == 'skipped'] if 'shim-file' in d['case'] or d['case'].startswith('S') else []
    failed = [f"{short(t['name'])} {t['durationMs']}ms{' ETIMEDOUT' if 'ETIMEDOUT' in (t['failure'] or '') else ''}"
              for t in r['tests'] if t['status'] == 'failed']
    print(f"| {d['case']} | tool {'=' if d['toolSha256'] == tool_sha else 'DIFFERS'} | commit {d['commit'][:8]} | exit {s['exitCode']} "
          f"| {s['wallSeconds']} s{' DEADLINE' if s['deadlineHit'] else ''} | {s['statuses']} | 7477 seen {s['port7477Seen']}/{s['samples']} "
          f"killed {s['killedOn7477']} | unstuck {s['unstuck']} | own ports {len(s['ownListeningPorts'])} | survivors {s['survivors']} "
          f"| clean {d['treeCleanAfter']} | build {d.get('build', {}).get('exitCode', '-')} | failed {failed} | skipped {skipped} |")
