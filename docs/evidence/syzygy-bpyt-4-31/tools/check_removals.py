#!/usr/bin/env python3
"""Whether every removed timeout holds at the head (syzygy-bpyt.4.31). Evidence tool, not authority.

usage: python3 -I docs/evidence/syzygy-bpyt-4-31/tools/check_removals.py DECISIONS.json HEAD-SITE-DURATIONS.json HEAD-RECORDS-DIR FULL-RUNS.json OUT.json
           [--later LATER.json]

DECISIONS.json is decide.py's output at the base; HEAD-SITE-DURATIONS.json is site_durations.py run over the base census and the
records re-measured at the head (5 alone runs of each file with a removal), which HEAD-RECORDS-DIR holds; FULL-RUNS.json is ci_durations.py --local over saved
logs of full `npx vitest run` runs at the head, where every removed timeout has fallen back to vitest's default; LATER.json lists
observations of removed sites made after those runs, each with its source. A removal holds when

  alone   the head records observed it at least 5 times, every observation passed, and its worst is at or under its threshold;
  full    in every full run the site is bounded at or under its threshold: a test by its own line, which must be a pass (in a
          file that passed, no line means under 300 ms; a file with a failure lists every test, so there no line bounds nothing),
          and a hook by its file's duration less the tests listed beneath it;
  later   no observation in LATER.json ran past its threshold.

OUT.json lists each removal with both verdicts and their evidence, and the removals that do not hold. It decides nothing else."""
import json, os, re, sys

decisions_path, durations_path, records_dir, full_path, out_path = sys.argv[1:6]
later_path = sys.argv[sys.argv.index('--later') + 1] if '--later' in sys.argv else None
later = {r['site']: r for r in json.load(open(later_path, encoding='utf8'))['rows']} if later_path else {}
decisions = json.load(open(decisions_path, encoding='utf8'))
durations = {r['site']: r for r in json.load(open(durations_path, encoding='utf8'))['rows']}
full = json.load(open(full_path, encoding='utf8'))

def unquoted(title):
    return title[1:-1] if title.startswith('`') and title.endswith('`') else title

def pattern(text):
    parts = re.split(r'(\$\{[^}]*\}|%[sdifjoc#%]|\$[A-Za-z_][\w.]*)', text)
    return ''.join('.*' if i % 2 else re.escape(p) for i, p in enumerate(parts))

def full_bounds(row):
    path = row['site'].rsplit(':', 1)[0]
    out = []
    for run in full['runs']:
        files = [f for f in run['files'] if f['file'] == path]
        if not files:
            out.append({'run': run['runId'], 'boundMs': None, 'why': 'file not in the log'})
            continue
        f = files[0]
        passed = f['mark'] == '✓'
        if row['kind'] == 'hook':
            out.append({'run': run['runId'], 'boundMs': f['ms'] - sum(t['ms'] for t in f['slowTests']), 'filePassed': passed,
                        'why': f"file {f['ms']} ms less {len(f['slowTests'])} tests listed"})
        else:
            name = re.compile(pattern(' > '.join(unquoted(t or '') for t in [*(row.get('suites') or []), row.get('title')])) + '$')
            own = [t for t in f['slowTests'] if name.match(t['name'])]
            if any(t['mark'] != '✓' for t in own):
                out.append({'run': run['runId'], 'boundMs': None, 'why': f"failed: {[t['line'] for t in own if t['mark'] != '✓']}"})
            elif own:
                out.append({'run': run['runId'], 'boundMs': max(t['ms'] for t in own), 'why': f"own lines {[t['ms'] for t in own]}"})
            else:
                out.append({'run': run['runId'], 'boundMs': 300 if passed else None,
                            'why': 'no line in a passing file: under 300 ms' if passed else 'no line in a file with a failure'})
    return out

commit_of = lambda name: json.load(open(os.path.join(records_dir, name), encoding='utf8'))['subject']['commit'] if name else None

rows = []
for row in decisions['rows']:
    if row['decision'] != 'remove': continue
    d = durations.get(row['site'], {})
    alone_ok = d.get('worstMs') is not None and d['observations'] >= 5 and not d['anyFailed'] and d['worstMs'] <= row['thresholdMs']
    bounds = full_bounds(row)
    full_ok = bool(bounds) and all(b['boundMs'] is not None and b['boundMs'] <= row['thresholdMs'] for b in bounds)
    seen = later.get(row['site'])
    later_ok = seen is None or seen['worstMs'] <= row['thresholdMs']
    rows.append({'site': row['site'], 'kind': row['kind'], 'thresholdMs': row['thresholdMs'], 'title': row.get('title'), 'suites': row.get('suites'),
                 'alone': {'holds': alone_ok, 'record': d.get('record'), 'recordCommit': commit_of(d.get('record')), 'observations': d.get('observations'), 'worstMs': d.get('worstMs'),
                           'anyFailed': d.get('anyFailed'), 'loadRange': d.get('loadRange')},
                 'full': {'holds': full_ok, 'bounds': bounds},
                 'later': {'holds': later_ok, **({'worstMs': seen['worstMs'], 'source': seen['source']} if seen else {'observations': 'none listed'})},
                 'holds': alone_ok and full_ok and later_ok})
out = {'tool': 'check_removals.py', 'base': decisions['census'], 'headRecordCommits': sorted({r['alone']['recordCommit'] for r in rows} - {None}),
       'fullRuns': [{'run': r['runId'], 'commit': r['headSha'], 'conclusion': r['conclusion']} for r in full['runs']],
       'later': {'path': later_path, 'sites': sorted(later)} if later_path else None,
       'rule': '\n\n'.join(__doc__.split('\n\n')[2:4]), 'removals': len(rows), 'holding': sum(r['holds'] for r in rows),
       'notHolding': [r['site'] for r in rows if not r['holds']], 'rows': rows}
open(out_path, 'w', encoding='utf8').write(json.dumps(out, indent=1, ensure_ascii=False) + '\n')
print(f"{out['holding']} of {out['removals']} removals hold; not holding: {out['notHolding']}")
