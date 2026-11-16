"""R-GP-IMPL-HOST-TIDY-1 reviewer tool: check the lane's record against the git objects, by its own reading (rules 6 and 11).
Usage: python3 -I record_check.py <repo> <built head tree> <out.json>
<repo> holds every commit named; <built head tree> is a clean checkout of the code head with `npm run build` done, for the
mutants whose fragment lives in a built file (dist is not tracked, so its bytes are read from that build)."""
import hashlib, json, re, subprocess, sys

repo, built, out = sys.argv[1:4]
BASE, HEAD, EVID, PRE = ('9dba258992667f62ad503ec76d8a6b99efcc4bac', 'f2304fd5d2bfd0e50c48d6ea356ddea3f7be162d',
                         '561c80b38d447a56e4c1542e0a8fbbdb2dd1d845', '3fa4817c8ad02e8b8579d0f20ccc7d59e5738499')
D = 'docs/evidence/syzygy-bpyt-7-15'
results = []


def git(*a, text=True):
    return subprocess.run(['git', '-C', repo, *a], capture_output=True, check=True, text=text).stdout


def sha(b):
    return hashlib.sha256(b if isinstance(b, bytes) else b.encode()).hexdigest()


def blob(c, p):
    return git('show', f'{c}:{p}', text=False)


def check(name, ok, detail=''):
    results.append({'check': name, 'ok': bool(ok), 'detail': detail})


def j(p):
    return json.loads(blob(EVID, f'{D}/{p}'))


# Commits and their shape.
check('code head parents are 3fa4817c then BASE', git('show', '--no-patch', '--format=%P', HEAD).split() == [PRE, BASE])
check('evidence commit parent is the code head', git('show', '--no-patch', '--format=%P', EVID).split() == [HEAD])
ev_paths = git('diff', '--name-only', HEAD, EVID).split()
check('evidence commit touches only the lane evidence directory', all(p.startswith(D + '/') for p in ev_paths), f'{len(ev_paths)} paths')
check('merge base of BASE and the code head is BASE', git('merge-base', BASE, HEAD).strip() == BASE)
# Subject digests.
d_all, d_code = git('diff', BASE, EVID, text=False), git('diff', BASE, HEAD, text=False)
check('subject digest b961f4ee', sha(d_all) == 'b961f4ee73f50e0083ce96802f781e721db0a02bb2dc6d3a5c65f5fc1fdf0076', sha(d_all))
check('code-only digest 6516a6a0', sha(d_code) == '6516a6a00077f439a10798aaf6e4b47c5d6aaf3628607a10860001f3e055d394', sha(d_code))
n_all, n_code = git('diff', '--name-only', BASE, EVID).split(), git('diff', '--name-only', BASE, HEAD).split()
check('48 files, 18 code', (len(n_all), len(n_code)) == (48, 18), f'{len(n_all)} {len(n_code)}')
num = [l.split('\t')[:2] for l in git('diff', '--numstat', BASE, HEAD).splitlines()]
check('code +34/-33', (sum(int(a) for a, _ in num), sum(int(b) for _, b in num)) == (34, 33))
# Tool and record digests named by the brief and the summary.
for p, want in [('summary.json', '64f08af9fd2896eb04e15df8f2dae210e70fa53cd82529b9e56bd8d029ec1137'),
                ('diff-tools/differential.py', 'a897e306170b2eb247355ef5a372afaab415205780edd233ed7ea718351f7ad0'),
                ('diff-tools/surface.mjs', '655e9789e3b9d08afefc5c04fa45734de90edbf11c0047b7f4ce65b3da778552')]:
    check(f'brief digest of {p}', sha(blob(EVID, f'{D}/{p}')) == want)
s = j('summary.json')
for name, want in s['toolsSha256'].items():
    check(f'summary toolsSha256 {name}', sha(blob(EVID, f'{D}/{name}')) == want)
for p, want in s['subjectSha256'].items():
    check(f'summary subjectSha256 {p}', sha(blob(HEAD, p)) == want)
diff = j('diff-out/differential.json')
for name, want in diff['records'].items():
    check(f'differential record {name}', sha(blob(EVID, f'{D}/diff-out/{name}')) == want)
for name, want in diff['toolsSha256'].items():
    check(f'differential tool {name}', sha(blob(EVID, f'{D}/diff-tools/{name}')) == want)
check('differential base/head', (diff['base'], diff['head']) == (BASE, HEAD))
# Each mutant fragment occurs exactly once at the recorded commit; built files are read from the built head tree.
for o in diff['selftest']:
    text = (open(f'{built}/{o["file"]}', encoding='utf8').read() if '/dist/' in o['file'] else blob(HEAD, o['file']).decode())
    check(f'differential mutant {o["mutant"]}: old occurs once in {o["file"]}', text.count(o['old']) == 1, f'count={text.count(o["old"])}')
    check(f'differential mutant {o["mutant"]}: outcome agrees with the check value',
          o['detected'] is (o['checkHeld'] is False) and o['detected'] is (o['expected'] == 'detected'), f'checkHeld={o["checkHeld"]}')
for side, c in (('base', BASE), ('head', HEAD)):
    pa = j(f'poc-alone-{side}.json')
    check(f'poc-alone-{side} commit', pa['commit'] == c)
    m = pa['builds'][1]['mutant']
    check(f'poc-alone-{side} mutant old occurs once in {m["file"]} at {side}', blob(c, m['file']).decode().count(m['old']) == 1)
    for b in pa['builds']:
        agree = (b['exit'] == 0) == (b['errors'] == [])
        check(f'poc-alone-{side} {b["label"]}: exit {b["exit"]} agrees with its errors', agree, str(b['errors'][:1]))
    refs = [r['path'] for r in json.loads(blob(c, 'apps/three-surface-poc/tsconfig.json'))['references']]
    check(f'poc-alone-{side} references are the tsconfig references at {side}', refs == pa['references'])
ce = j('code-equal.json')
for r in ce['rows']:
    for c, k in ((BASE, 'base'), (HEAD, 'head')):
        check(f'code-equal {r["file"]} {k} digest', sha(blob(c, r['file'])) == r[k])
    head_text = blob(HEAD, r['file']).decode()
    for k in ('identifierRenamed', 'literalChanged'):
        what = r['selftest'][k]['what']
        first = head_text.find(what)
        line = head_text[:first].count('\n') + 1
        in_comment = head_text.split('\n')[line - 1].lstrip().startswith(('//', '*', '/*'))
        check(f'code-equal {r["file"]} {k}: first {what} is code, not comment', first >= 0 and not in_comment, f'line {line}')
su = j('suite-head.json')
check('suite-head exit agrees with failures', (su['exit'] == 0) == (su['failed'] == 0), f'exit={su["exit"]} failed={su["failed"]}')
check('suite-head commit is the code head', su['commit'] == HEAD)
for side, c in (('base', BASE), ('head', HEAD)):
    ra = j(f'rerun-alone-{side}.json')
    check(f'rerun-alone-{side} commit', ra['commit'] == c)
    for r in ra['rows']:
        check(f'rerun-alone-{side} {r["file"]}: exit agrees', (r['exit'] == 0) == (r['failed'] == 0 and r['passed'] == r['total']))
ti = j('titles.json')
check('titles commits', (ti['baseCommit'], ti['headCommit']) == (BASE, HEAD))
# PR-body figures against the record.
body = open(sys.argv[3].replace('record-check.json', 'pr-body.md'), encoding='utf8').read()
claims = {
    '31/31': '31/31' in body, '0 of 5,528 / 321 refused': (s['differential']['gatePaths'], s['differential']['gateDiffering'], s['differential']['refused']) == (5528, 0, 321),
    '5,528 in body': '5,528' in body, '321 in body': '321 are refused' in body,
    '1,262 titles': ti['base'] == ti['head'] == 1262 and '1,262 titles' in body,
    '1,264 / 1,262 / 0 / 2': (su['total'], su['passed'], su['failed'], su['skipped']) == (1264, 1262, 0, 2) and '1,264 total, 1,262 passed, 0 failed, 2 skipped' in body,
    'surface versions': (s['surfaceVersion']['base'], s['surfaceVersion']['head']) == ('polaris@e4fd613eed56', 'polaris@2bb1f43332fd') and 'polaris@e4fd613eed56' in body and 'polaris@2bb1f43332fd' in body,
    'server lines 11-25 and 76': s['serverLinesChanged'] == [*range(11, 16), *range(17, 26), 76] and '11–25 and 76' in body,
    '13 test files': len([p for p in n_code if p.endswith('.test.ts')]) == 13,
    'six shutdown comment lines': len([l for l in git('diff', '-U0', BASE, HEAD, '--', 'packages/http-host/src/shutdown.ts').splitlines() if l.startswith('+//')]) == 6,
    '6 of 7 detected, one held': sorted(s['differential']['selftest'].values()).count('detected') == 6 and 'source-value-changed' in body,
    'rerun 5/5 at both': all(j(f'rerun-alone-{x}.json')['rows'][0]['passed'] == 5 for x in ('base', 'head')),
    'header lines 11-29 claim': 'lines 11–29' in body,
}
for k, v in claims.items():
    check(f'PR body claim: {k}', v)
json.dump(results, open(out, 'w'), indent=1)
bad = [r for r in results if not r['ok']]
print(f'{len(results)} checks, {len(bad)} failing')
for r in bad:
    print(' FAIL', r['check'], r['detail'])
sys.exit(1 if bad else 0)
