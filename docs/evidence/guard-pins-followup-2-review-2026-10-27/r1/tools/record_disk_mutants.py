"""rev-541: mutate record.py's inputs on disk, one at a time, in a scratch clone, and confirm `record.py --check` fails on each
(rule 6, independent of record.py's own in-memory --selftest). Restores each file from git and asserts a clean tree after each.

Usage: python3 -I record_disk_mutants.py <clone> <out.json>
"""
import json, subprocess, sys

tree, out = sys.argv[1:3]
E = 'docs/evidence/syzygy-bpyt-8-39/'


def git(*args):
    return subprocess.run(['git', *args], cwd=tree, capture_output=True, text=True, check=True).stdout


def edit_json(rel, fn):
    def apply():
        path = f'{tree}/{rel}'
        data = json.load(open(path))
        fn(data)
        json.dump(data, open(path, 'w'), indent=1, ensure_ascii=False)
    return apply


def edit_text(rel, old, new):
    def apply():
        path = f'{tree}/{rel}'
        text = open(path).read()
        assert text.count(old) == 1, (rel, old, text.count(old))
        open(path, 'w').write(text.replace(old, new))
    return apply


def by_id(results, mid):
    return next(r for r in results if r['id'] == mid)


MUTANTS = {
    'M8 at head reported as surviving': edit_json(E + 'rev536-at-head.json', lambda d: by_id(d['results'], 'RV536-M8-root-declarations-unread').update(outcome='survives', exit=0, failed=[])),
    'M9 at head fails a second row': edit_json(E + 'rev536-at-head.json', lambda d: by_id(d['results'], 'RV536-M9-dotdot-alone-outside')['failed'].append(
        'FAIL   @syzygy/polaris-generation-core  packages/polaris-generation-core/src/workspace-reach.test.ts > the shared workspace resolver > reads a bare name declared as a .tar dependency as naming no module')),
    'M2 at base reported as killed': edit_json(E + 'rev536-at-base.json', lambda d: by_id(d['results'], 'RV536-M2-http-url-reads-outside').update(outcome='killed', exit=1)),
    'M7 old fragment edited': edit_json(E + 'rev536-at-head.json', lambda d: by_id(d['results'], 'RV536-M7-npm-alias-workspace-scope-only')['edits'][0].update(
        new=by_id(d['results'], 'RV536-M7-npm-alias-workspace-scope-only')['edits'][0]['new'].replace('npm:@syzygy', 'npm:@other'))),
    'run head commit changed': edit_json(E + 'rev536-at-head.json', lambda d: d.update(head='d38d7a3ce632a34c2a41bdb77ad323ba0b05b777')),
    'island answers one fewer equal': edit_json(E + 'island-diff.json', lambda d: d['resolves'].update(equal=2647)),
    'island old-testkit digest changed': edit_json(E + 'island-diff.json', lambda d: d['scratchSha256'].update({'packages/polaris-generation-core/src/zz-836-old-testkit.ts': '0' * 64})),
    'summary.json gains a key': edit_json(E + 'summary.json', lambda d: d.__setitem__('rev541Injected', True)),
    'npa probe pattern line altered': edit_text(E + 'npa-probe.json', 'tar\\\\.gz)$/iu;', 'tar\\\\.gx)$/iu;'),
}
assert git('status', '--porcelain') == ''
rows = []
for name, apply in MUTANTS.items():
    try:
        apply()
        run = subprocess.run(['python3', '-I', E + 'record.py', tree, '--check'], cwd=tree, capture_output=True, text=True, timeout=600)
        tail = (run.stdout + run.stderr).strip().splitlines()[-2:]
    except AssertionError as error:
        run, tail = None, [f'SPEC-ERROR {error}']
    finally:
        git('checkout', '--', E)
    clean = git('status', '--porcelain') == ''
    outcome = 'error' if run is None else ('killed' if run.returncode != 0 else 'survives')
    rows.append({'mutant': name, 'outcome': outcome, 'exit': None if run is None else run.returncode, 'tail': tail, 'cleanAfter': clean})
    print(outcome, '|', name, '|', tail[-1][:200] if tail else '', flush=True)
    assert clean
json.dump(rows, open(out, 'w'), indent=1)
print('killed', sum(r['outcome'] == 'killed' for r in rows), 'of', len(rows))
