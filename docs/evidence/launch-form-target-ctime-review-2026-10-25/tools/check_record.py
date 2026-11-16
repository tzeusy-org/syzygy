"""R-GP-IMPL-LAUNCH-FORM-TARGET-CTIME-1: check the syzygy-bpyt.8.33 rule-6 records and field diff against the git objects.
Usage: python3 -I check_record.py <clone> <reviewed commit> <base commit>
Prints one line per check, 'OK' or 'FAIL', and a final tally. Reads git objects only; never the worktree."""
import hashlib, json, re, subprocess, sys

CLONE, HEAD, BASE = sys.argv[1], sys.argv[2], sys.argv[3]
EV = 'docs/evidence/launch-form-target-ctime-2026-10-25'
TEST = 'packages/polaris-dossier/src/launched.test.ts'
READER = 'packages/polaris-dossier/src/launched.ts'
ROW = 'launch forms in a run whose marker is unreadable count neither a declared form nor a syzygy-launched one: '
LINK_ROW = 'a symbolic link to the marker Syzygy writes'
results = []


def git(*args, binary=False):
    out = subprocess.run(['git', '-C', CLONE, *args], capture_output=True, check=True).stdout
    return out if binary else out.decode('utf8')


def blob(commit, path):
    return git('show', f'{commit}:{path}', binary=True)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def check(name, ok, detail=''):
    results.append(ok)
    print(('OK   ' if ok else 'FAIL ') + name + (f' -- {detail}' if detail else ''))


full_head, full_base = git('rev-parse', HEAD).strip(), git('rev-parse', BASE).strip()
subject = git('diff', full_base, full_head, binary=True)
check('subject digest = git diff base head', sha(subject) == 'c0148ad4af5f99df67c9b5c0f86a08eb5e2c805d7179f88921d7f13a9d0ac668', sha(subject))
base_test, head_test = blob(full_base, TEST), blob(full_head, TEST)
reader_base, reader_head = blob(full_base, READER), blob(full_head, READER)
check('reader unchanged base->head', reader_base == reader_head, sha(reader_head))

for fs_name in ('tmpfs', 'ext4'):
    rec = json.loads(blob(full_head, f'{EV}/mutants-{fs_name}.json'))
    p = f'[{fs_name}] '
    check(p + 'base = full base', rec['base'] == full_base, rec['base'])
    commit = rec['commit']
    check(p + 'record commit is an ancestor of head', subprocess.run(['git', '-C', CLONE, 'merge-base', '--is-ancestor', commit, full_head]).returncode == 0, commit)
    check(p + 'test bytes at record commit = head', blob(commit, TEST) == head_test)
    check(p + 'reader bytes at record commit = head', blob(commit, READER) == reader_head)
    check(p + 'testSha256.base = sha(base test)', rec['testSha256']['base'] == sha(base_test), rec['testSha256']['base'])
    check(p + 'testSha256.fix = sha(head test)', rec['testSha256']['fix'] == sha(head_test), rec['testSha256']['fix'])
    check(p + 'readerSha256 = sha(reader)', rec['readerSha256'] == sha(reader_head), rec['readerSha256'])
    diff_pk = git('diff', full_base, commit, '--', 'packages', binary=True)
    check(p + 'diffSha256 = git diff base commit -- packages', rec['diffSha256'] == sha(diff_pk), rec['diffSha256'])
    check(p + 'diffSha256 also = git diff base head -- packages', rec['diffSha256'] == sha(git('diff', full_base, full_head, '--', 'packages', binary=True)))
    check(p + 'harnessSha256 = sha(mutants.py at head)', rec['harnessSha256'] == sha(blob(full_head, f'{EV}/mutants.py')), rec['harnessSha256'])
    check(p + 'harness at record commit = at head', blob(commit, f'{EV}/mutants.py') == blob(full_head, f'{EV}/mutants.py'))
    for key in ('record830', 'reviewRun'):
        src = rec['fragmentsFrom'][key]
        check(p + f'fragmentsFrom.{key} digest = git object at head', src['sha256'] == sha(blob(full_head, src['path'])), src['path'])
    check(p + 'kernel stored', bool(rec.get('kernel')), rec.get('kernel'))
    check(p + 'tmpdir filesystem stored', bool(rec['tmpdir'].get('filesystem')), json.dumps(rec['tmpdir']))
    check(p + 'trackedTreeCleanAfter', rec['trackedTreeCleanAfter'] is True)
    for side, data in (('base', base_test), ('fix', head_test)):
        u = rec['unmutated'][side]
        check(p + f'unmutated {side} testSha256 / exit 0 / 43 of 43', u['testSha256'] == sha(data) and u['exitCode'] == 0 and u['counts'] == {'numTotalTests': 43, 'numPassedTests': 43, 'numFailedTests': 0} and u['failedTests'] == [])
    # fragments: each mutant's stored edits against its side's file, and against its source records
    rec830 = json.loads(blob(full_head, rec['fragmentsFrom']['record830']['path']))
    review = json.loads(blob(full_head, rec['fragmentsFrom']['reviewRun']['path']))
    src_edits = {m['id']: m['edits'] for m in rec830['mutants'] if m['tests'] == 'fix'}
    src_edits.update({m['id']: m['edits'] for m in review['mutants'] if m['side'] == 'head' and m['id'].startswith('O')})
    src_rows830 = {m['id']: sorted(m['failedRows']) for m in rec830['mutants'] if m['tests'] == 'fix'}
    ids = sorted({m['id'] for m in rec['mutants']})
    check(p + f'mutant population = 13 (8.30) + 8 (O1-O8) = 21, each on both sides', len(ids) == 21 and len(rec['mutants']) == 42 and set(ids) == set(src_edits), f'{len(ids)} ids, {len(rec["mutants"])} runs')
    for m in rec['mutants']:
        side_files = {READER: reader_head.decode('utf8'), TEST: (base_test if m['tests'] == 'base' else head_test).decode('utf8')}
        once = all(side_files[e['file']].count(e['old']) == 1 for e in m['edits'])
        same_src = [{k: e[k] for k in ('file', 'old', 'new')} for e in m['edits']] == [{k: e[k] for k in ('file', 'old', 'new')} for e in src_edits[m['id']]]
        rows = sorted(t['test'][len(ROW):] for t in m['failedTests'] if t['test'].startswith(ROW))
        killed = m['blocked'] or (m['exitCode'] != 0 and bool(m['failedTests']))
        counts_ok = m['counts'] is not None and m['counts']['numFailedTests'] == len(m['failedTests']) and m['counts']['numTotalTests'] == 43 and m['counts']['numPassedTests'] + m['counts']['numFailedTests'] == 43
        exit_ok = (m['exitCode'] == 0) == (len(m['failedTests']) == 0)
        ok = once and same_src and rows == m['failedRows'] and m['outcome'] == ('killed' if killed else 'survived') and counts_ok and exit_ok and m['restored'] is True and m['blocked'] is False
        check(p + f"{m['id']} [{m['tests']}] old-once/source/rows/outcome/exit/counts/restored", ok,
              f"once={once} src={same_src} rows={rows == m['failedRows']} outcome={m['outcome']} exit={m['exitCode']} n={len(m['failedRows'])} link={LINK_ROW in m['failedRows']}")
    # unchanged or stronger against 8.30's fix rows
    by = {(m['id'], m['tests']): m for m in rec['mutants']}
    for mid, rows830 in src_rows830.items():
        now = by[(mid, 'fix')]['failedRows']
        check(p + f'{mid}: fix rows superset of 8.30 fix rows, none added', set(rows830) <= set(now) and set(now) == set(rows830), f'830={len(rows830)} now={len(now)}')
    # repeats and parallel
    def passed(r):
        return r['exitCode'] == 0 and r['counts'] == {'numTotalTests': 43, 'numPassedTests': 43, 'numFailedTests': 0}
    reps, par = rec['unmutatedFixRepeats'], rec['unmutatedFixParallel']
    check(p + 'repeats: 20 runs, every one 43/43', reps['runs'] == 20 and len(reps['results']) == 20 and all(passed(r) for r in reps['results']) and reps['allPassed43'])
    check(p + 'parallel: 12 runs, every one 43/43', par['runs'] == 12 and len(par['results']) == 12 and all(passed(r) for r in par['results']) and par['allPassed43'])
    loads = [r['loadBefore'][0] for r in reps['results']] + [r['loadAfter'][0] for r in reps['results']]
    print(f'INFO {p}sequential load1 range {min(loads)}-{max(loads)}; parallel load {json.dumps(par["load"])}')
    # summary table for the PR body
    for mid in ids:
        b, f = by[(mid, 'base')], by[(mid, 'fix')]
        print(f"TABLE {p}{mid}: base {b['outcome']} {len(b['failedRows'])} link={LINK_ROW in b['failedRows']} | fix {f['outcome']} {len(f['failedRows'])} link={LINK_ROW in f['failedRows']} {f['counts']}")

# field diff
fd = json.loads(blob(full_head, f'{EV}/field-diff.json'))
check('field-diff testSha256 = head test', fd['testSha256'] == sha(head_test))
check('field-diff tool digest = field_diff.py at head', fd['tool']['sha256'] == sha(blob(full_head, f'{EV}/field_diff.py')), fd['tool']['sha256'])
header = ' FAIL  |@syzygy/polaris-dossier| packages/polaris-dossier/src/launched.test.ts > launch forms in a run whose marker is unreadable > count neither a declared form nor a syzygy-launched one: a symbolic link to the marker Syzygy writes\n'
for run in fd['runs']:
    txt = blob(full_head, f"{EV}/{run['output']['path']}")
    check(f"field-diff {run['output']['path']} digest", run['output']['sha256'] == sha(txt))
    text = txt.decode('utf8')
    n = text.count(header)
    section = text.split(header, 1)[1].split('⎯⎯⎯', 1)[0] if n == 1 else ''
    # every +/- line in the block, whatever it names (not only the seven fields)
    plusminus = [line.strip() for line in section.split('\n') if re.match(r'\s*[-+]\s', line) and not re.match(r'\s*[-+]\s+(Expected|Received)\b', line)]
    fields = sorted({re.search(r'"(\w+)"', l).group(1) for l in plusminus if re.search(r'"(\w+)"', l)})
    check(f"field-diff {run['mutant']} {run['tmpdir']['filesystem']}: link-row block once, only targetCtimeNs on +/- lines", n == 1 and fields == ['targetCtimeNs'] and len(plusminus) == 2, f'blocks={n} fields={fields} lines={len(plusminus)}')
    failing = sorted(set(re.findall(r'count neither a declared form nor a syzygy-launched one: ([^\n]+?)\n', text)))
    print(f"INFO field-diff {run['mutant']} {run['tmpdir']['filesystem']} failing rows named in output: {len(failing)}")

print(f'TALLY {sum(results)} OK, {len(results) - sum(results)} FAIL, {len(results)} checks')
