#!/usr/bin/env python3
"""The keep-or-remove rule of syzygy-bpyt.4.31, applied to every census site. Evidence tool, not authority.

usage: python3 -I docs/evidence/syzygy-bpyt-4-31/tools/decide.py CENSUS.json SITE-DURATIONS.json CI-DURATIONS.json CITED.json OUT.json

The threshold is half the default the site falls back to once its timeout is removed, so a kept site has measured worse
than 2x headroom (the coordinator's ruling of 2026-10-27, the same rule as syzygy-bpyt.4.13's
scripts/size_vitest_test_timeouts.py). The root vitest.config.ts sets neither default, so vitest's own apply: testTimeout
5000 ms gives 2500 ms for a test or suite, and hookTimeout 10000 ms gives 5000 ms for a hook. A site is

  cited     when its reason already cites a commit or retained record, or CITED.json names one, that measured it above the
            threshold (or saw it time out at the default); its reason is made to cite that;
  blocked   when its file is one an open pull request changes (CITED.json `blocked`); it is left as it is;
  remove    when the fresh local runs measured it (at least 5 observations, every run passed) at or under the threshold AND every
            hosted run listed bounds it there too: for a test, its slow-test line (or no line, which means under 300 ms) in a
            run where its file ran; for a hook, its file's duration less the slow tests listed beneath it; AND it is neither
            below vitest's default (5000 ms for a test or suite, 10000 ms for a hook), where removing it would loosen the test
            (ruling 3), nor a vitest config's own timeout, which bounds a whole tier (ruling 4): such a site is kept, on that basis;
  keep      otherwise, citing whichever measurement exceeded the threshold, or, when no measurement exceeds it but a host does
            not bound it, the record that shows the gap. Hosted runs print no hook time: a file's duration less its slow tests
            bounds its hooks from above, and that less 300 ms for every other test bounds them, together, from below.
            A config's hookTimeout also governs every beforeEach and afterEach hook, which runs inside a test's duration: it is
            removed only when its tier's worst test is at or under the hook threshold.

A removal still has to pass 5 of 5 full-file runs at the head, each again at or under the threshold, before it lands."""
import json, os, re, sys

DEFAULT_MS = {'test': 5000, 'suite': 5000, 'hook': 10000}
TEST_THRESHOLD_MS, HOOK_THRESHOLD_MS = DEFAULT_MS['test'] // 2, DEFAULT_MS['hook'] // 2
census_path, durations_path, ci_path, cited_path, out_path = sys.argv[1:6]
census = json.load(open(census_path, encoding='utf8'))
durations = {r['site']: r for r in json.load(open(durations_path, encoding='utf8'))['rows']}
ci = json.load(open(ci_path, encoding='utf8'))
cited = json.load(open(cited_path, encoding='utf8'))

def unquoted(title):
    """A template-literal title without its backticks, so its placeholders can be matched once it is joined to its suites."""
    return title[1:-1] if title.startswith('`') and title.endswith('`') else title

def pattern(text):
    parts = re.split(r'(\$\{[^}]*\}|%[sdifjoc#%]|\$[A-Za-z_][\w.]*)', text)
    return ''.join('.*' if i % 2 else re.escape(p) for i, p in enumerate(parts))

def ci_bound(site):
    """Each hosted run's bound on the site, in ms, or None where the run does not bound it."""
    path = site['path']
    bounds = []
    for run in ci['runs']:
        # The system tier's reporter prints paths relative to packages/cap1-system; every other path is relative to the root.
        files = [f for f in run['files'] if path in (f['file'], 'packages/cap1-system/' + f['file']) and f['mark'] == '✓']
        if not files: bounds.append({'runId': run['runId'], 'head': run['headSha'][:8], 'boundMs': None, 'why': 'file not reported as passed'}); continue
        f = files[0]
        if site['kind'] in ('test', 'suite'):
            full = re.compile(pattern(' > '.join(unquoted(t or '') for t in [*(site.get('suites') or []), site.get('title')])) + '$')
            slow = [t for t in f['slowTests'] if full.match(t['name'])]
            bounds.append({'runId': run['runId'], 'head': run['headSha'][:8], 'boundMs': max((t['ms'] for t in slow), default=300),
                           'why': f"slow-test line{'s' if len(slow) > 1 else ''} {[t['ms'] for t in slow]}" if slow else 'no slow-test line: under 300 ms'})
        else:
            rest = f['ms'] - sum(t['ms'] for t in f['slowTests'])
            # Every test with no slow-test line took under 300 ms, so the file's hooks together took at least this long.
            lower = rest - 300 * (f['tests'] - len(f['slowTests']))
            bounds.append({'runId': run['runId'], 'head': run['headSha'][:8], 'boundMs': rest, 'hooksAtLeastMs': lower,
                           'why': f"file {f['ms']} ms less {len(f['slowTests'])} slow tests; its hooks together took at least {lower} ms"})
    return bounds

rows = []
for s in census['sites']:
    key = f"{s['path']}:{s['line']}"
    file = s['path']
    threshold = HOOK_THRESHOLD_MS if s['kind'] == 'hook' else TEST_THRESHOLD_MS
    d = durations.get(key, {})
    row = {'site': key, 'kind': s['kind'], 'callee': s['callee'], 'expression': s['expression'], 'valueMs': s['valueMs'], 'thresholdMs': threshold,
           'title': s.get('title'), 'suites': s.get('suites'), 'baseReason': (s['reason'] or {}).get('text'), 'baseCitations': s['citations']}
    if file in cited.get('blocked', {}):
        row.update(decision='blocked', basis=cited['blocked'][file])
    elif key in cited.get('sites', {}):
        row.update(decision='cited', basis=cited['sites'][key])
    elif s['citations']['commits'] or s['citations']['measurements']:
        row.update(decision='cited', basis='its reason already cites a measurement: ' + ', '.join(s['citations']['commits'] + s['citations']['measurements']))
    else:
        local = {k: d.get(k) for k in ('record', 'observations', 'worstMs', 'worst', 'anyFailed', 'loadRange')}
        hosted = ci_bound(s) if s['kind'] in ('test', 'suite', 'hook') else []
        local_ok = d.get('worstMs') is not None and d['observations'] >= 5 and not d['anyFailed'] and d['worstMs'] <= threshold
        hosted_ok = bool(hosted) and all(b['boundMs'] is not None and b['boundMs'] <= threshold for b in hosted)
        if s['kind'] == 'config': hosted_ok = local_ok  # the system tier's slow-test lines are read with the record, not here
        if s['kind'] == 'config' and s['callee'] == 'hookTimeout':
            # It also governs every beforeEach and afterEach hook, which runs inside a test's duration: only the tier's worst test bounds those.
            tier = [r for r in durations.values() if r['site'].startswith(os.path.dirname(file) + '/') and r['kind'] in ('test', 'config') and r['callee'] != 'hookTimeout']
            worst_test = max((r['worstMs'] for r in tier if r['worstMs'] is not None), default=None)
            local['tierWorstTestMs'] = worst_test
            if worst_test is None or worst_test > threshold: local_ok = hosted_ok = False
        guard = (f"measured at or under the threshold, but below vitest's {DEFAULT_MS[s['kind']]} ms default: removing it would loosen the test (ruling 3)"
                 if s['valueMs'] is not None and s['kind'] in DEFAULT_MS and s['valueMs'] < DEFAULT_MS[s['kind']] else
                 'measured at or under the threshold, but a vitest config timeout bounds its whole tier and stays (ruling 4)' if s['kind'] == 'config' else None)
        row.update(local=local, hosted=hosted, decision='remove' if local_ok and hosted_ok and guard is None else 'keep',
                   basis=(guard if local_ok and hosted_ok and guard else
                          'local worst and every hosted bound at or under the threshold' if local_ok and hosted_ok else
                          f"its beforeEach and afterEach hooks run inside test durations, which reach {local.get('tierWorstTestMs')} ms" if 'tierWorstTestMs' in local else
                          'local worst over the threshold' if d.get('worstMs') is not None and d['worstMs'] > threshold else
                          'a local run failed' if d.get('anyFailed') else
                          f"a hosted run's hooks together took over the threshold (at least {max(x.get('hooksAtLeastMs') or 0 for x in hosted)} ms)" if any((x.get('hooksAtLeastMs') or 0) > threshold for x in hosted) else
                          'no local measurement' if d.get('worstMs') is None else
                          'a hosted run does not bound it at or under the threshold'))
    rows.append(row)
count = lambda k: sum(1 for r in rows if r['decision'] == k)
out = {'tool': 'decide.py', 'census': census['commit'], 'rule': {'testThresholdMs': TEST_THRESHOLD_MS, 'hookThresholdMs': HOOK_THRESHOLD_MS, 'text': '\n\n'.join(__doc__.split('\n\n')[2:])},
       'sites': len(rows), 'decisions': {k: count(k) for k in ('cited', 'blocked', 'remove', 'keep')}, 'rows': rows}
open(out_path, 'w', encoding='utf8').write(json.dumps(out, indent=1, ensure_ascii=False) + '\n')
print(json.dumps(out['decisions']))
