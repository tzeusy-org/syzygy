#!/usr/bin/env python3
"""Each census site's worst measured duration, from the fresh records (syzygy-bpyt.4.31). Evidence tool, not authority.

usage: python3 -I docs/evidence/syzygy-bpyt-4-31/tools/site_durations.py CENSUS.json MEASURE-DIR OUT.json

A test site is matched to the tests of its file's `.tests.json` record (scripts/measure_vitest_test_durations.py) whose full
name is its suite titles and title joined by spaces; a title with vitest's printf or `$name` placeholders, or a template
literal, matches any text in their place. A hook site is matched to the suite rows of the file's `.hooks.json` record by suite
path ('(file)' for a file-level hook): a beforeAll/beforeEach site takes the suite's beforeAllMs, an afterAll/afterEach site its
afterAllMs. The system tier's record (cap1-system.hooks.json) also carries test durations: its config's testTimeout site takes every test of the tier that carries no explicit timeout of its own, and its hookTimeout site every suite's beforeAll and afterAll (a beforeEach or afterEach hook runs inside a test's duration and is not separated). For each site the record keeps every
observation, the worst, the runs it came from with their load1, and whether any run failed (a failed run's duration is a lower
bound). A site no record measures is listed with no worst; the tool decides nothing."""
import json, os, re, sys

census_path, measure_dir, out_path = sys.argv[1:4]
census = json.load(open(census_path, encoding='utf8'))

def records(path, kind):
    name = os.path.basename(path).removesuffix('.ts')
    if path.startswith('packages/cap1-system/'): name, kind = 'cap1-system', 'hooks'
    p = os.path.join(measure_dir, f'{name}.{kind}.json')
    return (json.load(open(p, encoding='utf8')), os.path.basename(p)) if os.path.exists(p) else (None, None)

def unquoted(title):
    """A template-literal title without its backticks, so its placeholders can be matched once it is joined to its suites."""
    return title[1:-1] if title.startswith('`') and title.endswith('`') else title

def pattern(title):
    parts = re.split(r'(\$\{[^}]*\}|%[sdifjoc#%]|\$[A-Za-z_][\w.]*)', title)
    return ''.join('.*' if i % 2 else re.escape(p) for i, p in enumerate(parts))

# A config's testTimeout governs only the tests that carry no explicit timeout of their own: the tier's test sites are left out.
own_sites = [(s['path'], re.compile(pattern(' '.join(unquoted(t or '') for t in [*s.get('suites', []), s.get('title')])) + '$'))
             for s in census['sites'] if s['kind'] == 'test' and s['path'].startswith('packages/cap1-system/')]
own_timeout = lambda t: any(t['file'] == path and full.match(t['name']) for path, full in own_sites)

rows = []
for s in census['sites']:
    obs, source = [], None
    if s['kind'] in ('test', 'suite'):
        record, source = records(s['path'], 'tests')
        if record:
            full = re.compile(pattern(' '.join(unquoted(t or '') for t in [*s.get('suites', []), s.get('title')])) + '$')
            for run in record['runs']:
                for t in run['tests']:
                    match = full.match(t['name']) if s['kind'] == 'test' else t['name'].startswith(' '.join(unquoted(t or '') for t in [*s.get('suites', []), s.get('title')]))
                    if match and t.get('durationMs') is not None:
                        obs.append({'run': run['index'], 'ms': t['durationMs'], 'status': t.get('status', t.get('state')), 'load1': run['load1'], 'test': t['name']})
    elif s['kind'] == 'hook':
        record, source = records(s['path'], 'hooks')
        if record:
            suite = ' > '.join(s.get('suites', [])) or '(file)'
            field = 'beforeAllMs' if s['callee'] in ('beforeAll', 'beforeEach') else 'afterAllMs'
            for run in record['runs']:
                for row in run['suites']:
                    if row['suite'] == suite and row[field] is not None and ('file' not in row or row['file'] == s['path']):
                        obs.append({'run': run['index'], 'ms': row[field], 'status': row['state'], 'load1': run['load1']})
    elif s['kind'] == 'config':
        record, source = records(s['path'], 'hooks')
        if record:
            for run in record['runs']:
                if s['callee'] == 'testTimeout':
                    obs += [{'run': run['index'], 'ms': t['durationMs'], 'status': t['state'], 'load1': run['load1'], 'test': f"{t['file']} {t['name']}"}
                            for t in run['tests'] if t['durationMs'] is not None and not own_timeout(t)]
                else:
                    obs += [{'run': run['index'], 'ms': max(r['beforeAllMs'] or 0, r['afterAllMs'] or 0), 'status': r['state'], 'load1': run['load1'], 'suite': f"{r['file']} {r['suite']}"}
                            for r in run['suites'] if r['beforeAllMs'] is not None]
    worst = max(obs, key=lambda o: o['ms'], default=None)
    rows.append({'site': f"{s['path']}:{s['line']}", 'kind': s['kind'], 'callee': s['callee'], 'expression': s['expression'], 'valueMs': s['valueMs'],
                 'title': s.get('title'), 'suites': s.get('suites'), 'record': source, 'observations': len(obs), 'tests': len({o.get('test') for o in obs}),
                 'worstMs': worst and worst['ms'], 'worst': worst, 'anyFailed': any(o['status'] not in ('passed', 'pass', 'skip', 'skipped', 'pending') for o in obs),
                 'loadRange': [min(o['load1']['min'] for o in obs), max(o['load1']['max'] for o in obs)] if obs else None})
out = {'tool': 'site_durations.py', 'census': os.path.basename(census_path), 'commit': census['commit'], 'sites': len(rows),
       'measured': sum(1 for r in rows if r['worstMs'] is not None), 'rows': rows}
open(out_path, 'w', encoding='utf8').write(json.dumps(out, indent=1) + '\n')
print(f"{out['sites']} sites, {out['measured']} measured")
