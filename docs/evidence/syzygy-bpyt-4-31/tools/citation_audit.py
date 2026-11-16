#!/usr/bin/env python3
"""Whether each kept timeout's citation holds a measurement of that site (syzygy-bpyt.4.31). Evidence tool, not authority.

usage: python3 -I docs/evidence/syzygy-bpyt-4-31/tools/citation_audit.py REPO CENSUS.json DECISIONS.json OUT.json [--mutants]

The coordinator's ruling of 2026-10-27: a kept reason may cite a commit or a retained record, of this bead or another, only
if it holds a measurement for that specific site, by its test name or its file, and a duration. Every kept site of CENSUS.json
(a census at the head) outside the files DECISIONS.json marks blocked is audited, over every citation its reason carries.

Names the site. A test match is a string that is the site's title, or ends in it after a space or a `>` (vitest's full name
joins suites and title with a space, its slow-test lines with ` > `). A file match is a string holding the site's full path or
its file name as a whole token, never its stem, so `x.browser.test.ts` is not named by `x.test.ts` (a config site is named by
its package directory). A test match outranks a file match. A file match counts only for a site with no test name of its own,
a hook, a suite or a config: a titled test needs a test match, and one with only a file match is a counted residual.

A duration. A numeric value, or a list of numbers, under a key that ends `ms`/`Ms`/`MS` or `seconds`/`Seconds`, or holds
`duration` in any case; a key that names a configured value (timeout, threshold, budget, limit, bound, margin, default) never
counts, whatever it ends in.

  record   the JSON file at the census commit measures the site when one of these holds:
           - an object carries a duration and, directly beside it, a string value that names the site;
           - an object has a key that names the site, whose value is an object carrying a duration, or is itself a duration
             value under a duration key somewhere above it;
           - its top-level `subject` names the site (for a test match the title may sit anywhere in it), and it carries a
             duration anywhere;
           - RECORD_READINGS, read by hand, points at a duration value in it under a duration key, and the record carries
             the reading's label as a key or inside a string (or names the site's file, when the reading gives no label);
             a test reading's filter must be in the site's title.
  commit   READINGS, read by hand, quotes the text in the commit that measures the site: the quote must occur in its message
           or its added lines (comment leaders dropped, whitespace folded), carry a duration (`N ms`, `N s`, `N.N s`,
           `N-M s`), and the commit must change the site's file.

Each reading's `identifies` says how the text is tied to the site. A citation that measures by none of these is unmeasured,
and a site none of whose citations measures it is a counted residual. `--mutants` runs one input mutant per predicate on the
real results and fails unless each is killed for that predicate's reason."""
import copy, json, re, subprocess, sys

DURATION_END = re.compile(r'(?:^ms$|[a-z0-9]Ms$|MS$|^seconds$|Seconds$)')
DURATION_ANY = re.compile(r'duration', re.I)
CONFIGURED = re.compile(r'timeout|threshold|budget|limit|bound|margin|default', re.I)
DURATION_TEXT = re.compile(r'\b\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?\s?(?:ms|s)\b')

# Commit citations, read by hand. Each quote is in the commit; `identifies` says why it is about the site.
READINGS = {
    ('b48d86fa', 'apps/three-surface-poc/src/restart.test.ts'): {
        'match': 'file', 'quote': "three restart.test.ts tests failed: two hit vitest's 5 s default",
        'identifies': 'names the file only: the commit set both the per-test budget (the describe) and the afterEach budget, TEST_MS'},
    ('0a08add9', 'packages/polaris-dossier/src/gate-acts.test.ts'): {
        'match': 'test', 'quote': "These walk the whole real decisions tree, or eight worlds in turn: about 2-5 s unloaded, past vitest's 5 s default under load.",
        'identifies': 'the comment on TREE_TIMEOUT, which the commit adds to exactly the two tests that use it'},
    ('3f08143c', 'apps/three-surface-poc/src/fixture-directories.test.ts'): {
        'match': 'test', 'quote': 'importing the config took more than the 5 s default under a load average of 95',
        'identifies': 'the one test in the file that imports vitest.config.ts (the message calls it "the config-pin test")'},
    ('30d2c2c9', 'packages/polaris-dossier/src/start-gates.test.ts'): {
        'match': 'test', 'quote': 'the real-tree preflight reads every act record and sweeps every decisions file (about 4.4 s alone)',
        'identifies': 'the comment on TREE_TIMEOUT, which the commit adds to exactly this preflight test'},
    ('6c91e65a', 'packages/polaris-generation-consent/src/package-reader.test.ts'): {
        'match': 'test', 'quote': 'about 3 s of a cold 4.5 s run, by CPU profile',
        'identifies': 'the comment the commit puts directly above the beforeAll it adds, which is this site'},
}

# Records that name the measured cases by a label of their own, read by hand: (record, site path, site title or None) -> the
# duration's path, and the label (`names`) the record must carry for the reading to stand.
BUL = 'docs/evidence/syzygy-bul-browser-ci-correction-2026-09-23.json'
K66P = 'docs/evidence/shared-fixture-models-k66p-2026-10-03.json'
ONRAMP = 'docs/evidence/pipeline-demo-onramp-budget-2026-10-15.json'
APP = 'apps/three-surface-poc/src/'
K66P_IDENTIFIES = ("the record names its three files by stem, as its subject lists them: runs[].targetFiles.<stem>.fileMs is the "
                   "file's duration under load, and sharedBuildMsUnderLoad.<stem> the shared fixture build this beforeAll "
                   '(shared.prepare) runs; this is the one test file with that stem')
RECORD_READINGS = {
    (BUL, APP + 'surface-routes.test.ts', 'exhausts 15 runtime cross-surface links over six classes and fetches every %s target'): {
        'match': 'test', 'at': ['completeLocalFullSuiteMeasurements', 0, 'directMs'],
        'identifies': "the record's direct and tailnet cases are this it.each's two rows (13 links when measured), and its "
                      'caseLocalBudgets give them 15000 ms, the value this site carries'},
    (BUL, APP + 'surface-routes.test.ts', 'withholds the post-script Orrery capability href when that exact capability is absent'): {
        'match': 'test', 'at': ['completeLocalFullSuiteMeasurements', 0, 'missingCapabilityMs'],
        'identifies': "the record's missing-capability case is this test, and its caseLocalBudgets give it 10000 ms, the value "
                      'this site carries'},
    (ONRAMP, APP + 'polaris-generation/pipeline-demo.test.ts', 'runs the README command after a clean install and requires exactly seven synthetic output files'): {
        'match': 'test', 'at': ['postChangeVerification', 'runs', 0, 'wallSeconds'], 'names': "-t 'README command'", 'filter': 'README command',
        'identifies': "the record's postChangeVerification.command runs the file with vitest's -t filter 'README command', which "
                      'this title holds and no other title in the file does'},
    **{(K66P, f'{APP}{stem}.test.ts', None): {'match': 'file', 'at': ['runs', 0, 'targetFiles', stem, 'fileMs'], 'names': stem, 'identifies': K66P_IDENTIFIES}
       for stem in ('polaris-first-reading', 'polaris-narrative', 'tuple-encoding')},
}

def pattern(text):
    parts = re.split(r'(\$\{[^}]*\}|%[sdifjoc#%]|\$[A-Za-z_][\w.]*)', text)
    return ''.join('.*' if i % 2 else re.escape(p) for i, p in enumerate(parts))

def unquoted(title):
    return title[1:-1] if title.startswith('`') and title.endswith('`') else title

def file_names(site):
    if site['kind'] == 'config': return [site['path'].split('/')[-2]]
    return [site['path'], site['path'].split('/')[-1]]

def counts(site, kind):
    """Whether a match of this kind measures the site: a file match only for a site with no test name of its own."""
    return kind == 'test' or (kind == 'file' and site['kind'] != 'test')

def namer(site, anywhere=False):
    title = site.get('title')
    test = re.compile(('' if anywhere else r'(?:^|[ >])') + pattern(unquoted(title)) + ('' if anywhere else r'$')) if title else None
    # A whole token: not inside a longer name, nor followed by another extension (`x.test` is not `x.test.ts`).
    file = re.compile('|'.join(r'(?<![\w.-])' + re.escape(n) + r'(?![\w-]|\.\w)' for n in file_names(site)))
    def names_site(s):
        if not isinstance(s, str): return None
        if test is not None and test.search(s): return 'test'
        return 'file' if file.search(s) else None
    return names_site

is_num = lambda v: isinstance(v, (int, float)) and not isinstance(v, bool)
is_duration_value = lambda v: is_num(v) or (isinstance(v, list) and bool(v) and all(is_num(x) for x in v))
is_duration_key = lambda k: isinstance(k, str) and bool(DURATION_END.search(k) or DURATION_ANY.search(k)) and not CONFIGURED.search(k)

def durations_in(d):
    return [(k, v) for k, v in d.items() if is_duration_key(k) and is_duration_value(v)]

def first_duration(node, path=()):
    if isinstance(node, dict):
        for k, v in node.items():
            if is_duration_key(k) and is_duration_value(v): return list(path) + [k], v
        for k, v in node.items():
            got = first_duration(v, tuple(path) + (k,))
            if got: return got
    elif isinstance(node, list):
        for i, v in enumerate(node):
            got = first_duration(v, tuple(path) + (i,))
            if got: return got
    return None

def resolve(doc, path):
    for p in path:
        try: doc = doc[p]
        except (KeyError, IndexError, TypeError): return None
    return doc

def match_record(doc, site, path_name=None):
    names_site, found = namer(site), []
    def walk(node, path, under_duration):
        if isinstance(node, dict):
            here = durations_in(node)
            for k, v in node.items():
                kind = names_site(k)
                if kind and ((is_duration_value(v) and under_duration) or (isinstance(v, dict) and durations_in(v))):
                    found.append({'rule': 'key', 'kind': kind, 'at': path + [k], 'name': k[:200],
                                  'duration': v if is_duration_value(v) else dict(durations_in(v)[:1])})
                if here and isinstance(v, str):
                    kind = names_site(v)
                    if kind: found.append({'rule': 'beside', 'kind': kind, 'at': path + [k], 'name': v[:200], 'duration': dict(here[:1])})
            for k, v in node.items(): walk(v, path + [k], under_duration or is_duration_key(k))
        elif isinstance(node, list):
            for i, v in enumerate(node): walk(v, path + [i], under_duration)
    walk(doc, [], False)
    subject = doc.get('subject') if isinstance(doc, dict) else None
    kind, anywhere = namer(site, anywhere=True)(subject), first_duration(doc)
    if kind and anywhere:
        found.append({'rule': 'subject', 'kind': kind, 'at': ['subject'], 'name': subject[:200], 'duration': {'at': anywhere[0], 'value': anywhere[1]}})
    reading = RECORD_READINGS.get((path_name, site['path'], site.get('title')))
    if reading:
        value, names_file = resolve(doc, reading['at']), namer({**site, 'title': None})
        label = reading.get('names')
        carries = (lambda s: isinstance(s, str) and label in s) if label else names_file
        mentions = []
        def scan(node):
            if isinstance(node, dict):
                for k, v in node.items():
                    if carries(k): mentions.append(k)
                    scan(v)
            elif isinstance(node, list):
                for v in node: scan(v)
            elif carries(node): mentions.append(node)
        scan(doc)
        filtered = 'filter' not in reading or reading['filter'] in (site.get('title') or '')
        if is_duration_key(reading['at'][-1]) and is_duration_value(value) and mentions and filtered:
            found.append({'rule': 'reading', 'kind': reading['match'], 'at': reading['at'], 'name': mentions[0][:200],
                          'duration': value, 'identifies': reading['identifies']})
    found.sort(key=lambda m: m['kind'] != 'test')
    return found

fold = lambda t: re.sub(r'\s+', ' ', t)
LEADER = re.compile(r'^\s*(?://|/\*\*|\*)\s?')

def check_commit(reading, message, added, files, site):
    if reading is None: return 'no reading of this commit holds a measurement'
    if site['path'] not in files: return "the commit does not change the site's file"
    if fold(reading['quote']) not in fold(message) and fold(reading['quote']) not in fold(added): return 'the quote is not in the commit'
    if not DURATION_TEXT.search(reading['quote']): return 'the quote carries no duration'
    return None

def git(repo, *a):
    return subprocess.run(['git', '-C', repo, *a], capture_output=True, text=True, check=True).stdout

TITLED_FILE_ONLY = 'names only the site\'s file, and the site is a test with a name of its own, which needs a test match'

def audit_site(site, records, commits):
    """The site's row: each citation audited, and the best kind that measures it. `records` maps a cited path to its parsed
    JSON (None when it is not JSON); `commits` maps a cited commit to its message, added lines and changed files."""
    audits = []
    for path in site['citations']['measurements']:
        doc = records[path]
        found = match_record(doc, site, path) if doc is not None else []
        best = found[0]['kind'] if found else None
        audits.append({'citation': path, 'type': 'record', 'measured': best if best and counts(site, best) else None, 'matches': len(found),
                       'evidence': found[0] if found else 'not JSON, so not audited here' if doc is None else 'nothing in it names the site beside a duration',
                       **({'refused': TITLED_FILE_ONLY} if best and not counts(site, best) else {})})
    for c in site['citations']['commits']:
        reading = READINGS.get((c[:8], site['path']))
        why = check_commit(reading, *commits[c], site)
        if why is None and not counts(site, reading['match']): why = TITLED_FILE_ONLY
        audits.append({'citation': c, 'type': 'commit', 'measured': None if why else reading['match'],
                       'evidence': why or {'quote': reading['quote'], 'identifies': reading['identifies']}})
    kinds = [a['measured'] for a in audits if a['measured']]
    return {'site': f"{site['path']}:{site['line']}", 'kind': site['kind'], 'title': site.get('title'), 'audits': audits,
            'measured': 'test' if 'test' in kinds else 'file' if kinds else None}

def main():
    repo, census_path, decisions_path, out_path = sys.argv[1:5]
    census = json.load(open(census_path, encoding='utf8'))
    blocked = {r['site'].rsplit(':', 1)[0] for r in json.load(open(decisions_path, encoding='utf8'))['rows'] if r['decision'] == 'blocked'}
    commit = git(repo, 'rev-parse', census['commit']).strip()
    records, commits, rows = {}, {}, []
    for site in census['sites']:
        if site['path'] in blocked: continue
        for path in site['citations']['measurements']:
            if path not in records:
                try: records[path] = json.loads(git(repo, 'show', f'{commit}:{path}'))
                except ValueError: records[path] = None
        for c in site['citations']['commits']:
            if c not in commits:
                added = [LEADER.sub('', l[1:]) for l in git(repo, 'show', '--format=', c).splitlines() if l.startswith('+') and not l.startswith('+++')]
                commits[c] = (git(repo, 'show', '-s', '--format=%B', c), '\n'.join(added), set(git(repo, 'show', '--format=', '--name-only', c).split()))
        rows.append(audit_site(site, records, commits))
    count = lambda v: sum(1 for r in rows if r['measured'] == v)
    out = {'tool': 'citation_audit.py', 'census': commit, 'rule': '\n\n'.join(__doc__.split('\n\n')[2:]),
           'sites': len(rows), 'citations': sum(len(r['audits']) for r in rows),
           'measuredByTest': count('test'), 'measuredByFileOnly': count('file'),
           'residuals': [r['site'] for r in rows if r['measured'] is None], 'rows': rows}
    if '--mutants' in sys.argv: out['mutants'] = mutants(rows, records, commits, census, blocked)
    open(out_path, 'w', encoding='utf8').write(json.dumps(out, indent=1, ensure_ascii=False) + '\n')
    print(json.dumps({k: out[k] for k in ('sites', 'citations', 'measuredByTest', 'measuredByFileOnly', 'residuals')}))
    if 'mutants' in out:
        print(json.dumps({m['id']: m['outcome'] for m in out['mutants']}))
        if any(m['outcome'] != 'killed' for m in out['mutants']): sys.exit(1)

def mutants(rows, records, commits, census, blocked):
    """One input mutant per predicate, each made on every copy in the cited record or commit, on a real site and citation the
    unmutated inputs measure. A record mutant is killed when the site's best match drops below the kind it had (to none, for a
    file match); a commit mutant when the check refuses it with that predicate's reason; a site mutant (A12, A13) when the whole
    site, audited over the mutated record, becomes a counted residual."""
    sites = {f"{s['path']}:{s['line']}": s for s in census['sites']}
    def pick(typ, kind, rule=None):
        return next((r['site'], a) for r in rows for a in r['audits'] if a['type'] == typ and a['measured'] == kind and r['measured'] == kind
                    and (rule is None or a['evidence'].get('rule') == rule))
    def rewrite(node, fn):
        if isinstance(node, dict): return {fn(k): rewrite(v, fn) for k, v in node.items()}
        if isinstance(node, list): return [rewrite(v, fn) for v in node]
        return fn(node) if isinstance(node, str) else node
    out = []
    def record_mutant(mid, what, kind, rule, mutate):
        key, audit = pick('record', kind, rule)
        site = sites[key]
        doc, change = mutate(copy.deepcopy(records[audit['citation']]), site)
        got = match_record(doc, site, audit['citation'])
        best = got[0]['kind'] if got else None
        killed = best is None if kind == 'file' else best != 'test'
        out.append({'id': mid, 'predicate': what, 'site': key, 'citation': audit['citation'], 'rule': rule, 'change': change,
                    'before': kind, 'after': best, 'outcome': 'killed' if killed else 'survived'})
    def drop_title(doc, site):
        title = unquoted(site['title'])
        return rewrite(doc, lambda s: s.replace(title, 'syzygy-mutant ' + title[:-1])), {'everyString': {'old': title, 'new': 'syzygy-mutant ' + title[:-1]}}
    def drop_file(doc, site):
        names = file_names(site)
        def swap(s):
            for n in names: s = s.replace(n, 'syzygy-mutant')
            return s
        return rewrite(doc, swap), {'everyString': {'old': names, 'new': 'syzygy-mutant'}}
    def drop_durations(doc, site):
        def strip(node):
            if isinstance(node, dict): return {k: strip(v) for k, v in node.items() if not is_duration_key(k)}
            if isinstance(node, list): return [strip(v) for v in node]
            return node
        return strip(doc), {'everyDurationKey': 'removed'}
    def configure_durations(doc, site):
        return rewrite(doc, lambda k: 'timeout' + k[0].upper() + k[1:] if is_duration_key(k) else k), {'everyDurationKey': 'prefixed with timeout'}
    def drop_subject(doc, site):
        return {**doc, 'subject': 'syzygy-mutant'}, {'subject': 'syzygy-mutant'}
    def drop_reading(doc, site):
        at = next(r['at'] for (_, path, title), r in RECORD_READINGS.items() if (path, title) == (site['path'], site.get('title')))
        holder = resolve(doc, at[:-1])
        holder['count'] = holder.pop(at[-1])
        return doc, {'readingKey': {'at': at, 'old': at[-1], 'new': 'count'}}
    record_mutant('A1', 'a test match needs the title at the end of a name', 'test', 'beside', drop_title)
    record_mutant('A2', 'a file match needs the file as a whole token', 'file', 'beside', drop_file)
    record_mutant('A3', 'a match needs a duration', 'test', 'beside', drop_durations)
    record_mutant('A4', 'a configured value is never a duration', 'test', 'beside', configure_durations)
    record_mutant('A5', 'a key naming the site needs a duration under it or above it', 'test', 'key', drop_durations)
    record_mutant('A6', 'the subject rule needs the subject to name the site', 'test', 'subject', drop_subject)
    record_mutant('A7', "a record reading's path must end at a duration key", 'test', 'reading', drop_reading)
    def site_mutant(mid, what, path, kind, old, new):
        key = next(r['site'] for r in rows if r['site'].rsplit(':', 1)[0] == path and r['kind'] == kind and r['measured'])
        site = sites[key]
        audit = next(a for a in next(r for r in rows if r['site'] == key)['audits'] if a['type'] == 'record' and a['measured'])
        mutated = {**records, audit['citation']: rewrite(copy.deepcopy(records[audit['citation']]), lambda s: s.replace(old, new))}
        after, found = audit_site(site, mutated, commits), match_record(mutated[audit['citation']], site, audit['citation'])
        out.append({'id': mid, 'predicate': what, 'site': key, 'citation': audit['citation'], 'change': {'everyString': {'old': old, 'new': new}},
                    'before': next(r for r in rows if r['site'] == key)['measured'], 'bestMatchAfter': found[0]['kind'] if found else None, 'after': after['measured'],
                    'outcome': 'killed' if after['measured'] is None else 'survived'})
    # The review's T4: the record still names the file, but only another test of it.
    title = unquoted(next(r for r in rows if r['site'].startswith(APP + 'keyboard-sweep-record.test.ts:') and r['kind'] == 'test' and r['measured'] == 'test')['title'])
    site_mutant('A12', 'a titled test with only a file match is a counted residual', APP + 'keyboard-sweep-record.test.ts', 'test',
                title, 'decodes the escaped footer and refuses a page that names no evaluation, two, or an abbreviated revision (moved)')
    # The review's T5: the record names another file with the same stem.
    site_mutant('A13', "a file match needs the site's full path or file name, never its stem", APP + 'polaris-opening-index.browser.test.ts', 'hook',
                'polaris-opening-index.browser.test.ts', 'polaris-opening-index.test.ts')
    key, audit = pick('commit', 'test')
    site, c = sites[key], audit['citation']
    reading = READINGS[(c[:8], site['path'])]
    message, added, files = commits[c]
    undurate = lambda t: DURATION_TEXT.sub('some time', t)
    for mid, what, want, args in [
            ('A8', "the commit must change the site's file", "the commit does not change the site's file", (reading, message, added, files - {site['path']})),
            ('A9', 'the quote must be in the commit', 'the quote is not in the commit',
             (reading, message.replace(reading['quote'][:12], 'syzygy-mutant'), added.replace(reading['quote'][:12], 'syzygy-mutant'), files)),
            ('A10', 'the quote must carry a duration', 'the quote carries no duration',
             ({**reading, 'quote': undurate(reading['quote'])}, undurate(message), undurate(added), files)),
            ('A11', 'a commit with no reading is unmeasured', 'no reading of this commit holds a measurement', (None, message, added, files))]:
        why = check_commit(*args, site)
        out.append({'id': mid, 'predicate': what, 'site': key, 'citation': c, 'refusal': why, 'outcome': 'killed' if why == want else 'survived'})
    return out

if __name__ == '__main__':
    main()
