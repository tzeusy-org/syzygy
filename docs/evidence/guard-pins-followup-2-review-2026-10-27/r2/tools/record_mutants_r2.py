"""rev-541b: on-disk mutants of record.py's inputs and of record.py itself, aimed at its new scratchSha256 check (round-1 N3).

Each mutant edits one file in the clone, runs `record.py <clone> --check` (and `--selftest` for a mutant of record.py), restores the
file with `git checkout`, and asserts a clean tree. A data mutant is caught when --check exits 1; a mutant of the checker is caught
when --check or --selftest exits 1.
Usage: python3 -I record_mutants_r2.py <clone> <out.json>
"""
import hashlib, json, subprocess, sys

clone, out = sys.argv[1:3]
D = 'docs/evidence/syzygy-bpyt-8-39'
OLD_KIT = 'packages/polaris-generation-core/src/zz-836-old-testkit.ts'
KIT = 'packages/polaris-generation-core/src/workspace-reach.testkit.ts'


def git(*a):
    return subprocess.run(['git', '-C', clone, *a], capture_output=True, text=True, check=True).stdout


head_kit = hashlib.sha256(subprocess.run(['git', '-C', clone, 'show', f'5f0d5547:{KIT}'], capture_output=True, check=True).stdout).hexdigest()


def json_edit(name, fn):
    def apply():
        p = f'{clone}/{D}/{name}'
        d = json.load(open(p))
        fn(d)
        open(p, 'w').write(json.dumps(d, indent=1) + '\n')
    return name, apply


def text_edit(old, new):
    def apply():
        p = f'{clone}/{D}/record.py'
        s = open(p).read()
        assert s.count(old) == 1, old
        open(p, 'w').write(s.replace(old, new))
    return 'record.py', apply


CHECK = "        if d.get('scratchSha256', {}).get(OLD_KIT) != sha(blob(BASE, KIT) or ''):\n"
MUTANTS = {
    'D0 control: both island records re-serialized, no value changed': json_edit('island-diff.json', lambda d: None),
    "D1 island-diff.json: scratchSha256 set to HEAD's testkit digest": json_edit('island-diff.json', lambda d: d['scratchSha256'].update({OLD_KIT: head_kit})),
    "D2 island-diff-selftest.json: scratchSha256 set to HEAD's testkit digest": json_edit('island-diff-selftest.json', lambda d: d['scratchSha256'].update({OLD_KIT: head_kit})),
    'D3 island-diff.json: the scratchSha256 field removed': json_edit('island-diff.json', lambda d: d.pop('scratchSha256')),
    'D4 island-diff-selftest.json: one hex digit of scratchSha256 changed': json_edit('island-diff-selftest.json', lambda d: d['scratchSha256'].update(
        {OLD_KIT: ('1' if d['scratchSha256'][OLD_KIT][0] != '1' else '2') + d['scratchSha256'][OLD_KIT][1:]})),
    'C1 record.py: the scratchSha256 check removed': text_edit(CHECK, '        if False:\n'),
    'C2 record.py: the check applied to island-diff.json only': text_edit(CHECK, "        if label == 'island-diff' and d.get('scratchSha256', {}).get(OLD_KIT) != sha(blob(BASE, KIT) or ''):\n"),
    "C3 record.py: the check compares against HEAD's testkit blob": text_edit(CHECK, "        if d.get('scratchSha256', {}).get(OLD_KIT) != sha(blob(HEAD, KIT) or ''):\n"),
    'C4 record.py: the check only asks for a 64-hex value': text_edit(CHECK, "        if not re.fullmatch('[0-9a-f]{64}', d.get('scratchSha256', {}).get(OLD_KIT) or ''):\n"),
}
results = []
for label, (name, apply) in MUTANTS.items():
    assert git('status', '--porcelain', '--untracked-files=no') == ''
    apply()
    changed = git('status', '--porcelain', '--untracked-files=no').split()
    check = subprocess.run(['python3', '-I', f'{clone}/{D}/record.py', clone, '--check'], capture_output=True, text=True)
    rec = {'mutant': label, 'file': name, 'changed': changed, 'checkExit': check.returncode, 'checkOut': check.stdout.strip().splitlines()[-1:]}
    if name == 'record.py':
        st = subprocess.run(['python3', '-I', f'{clone}/{D}/record.py', clone, '--selftest'], capture_output=True, text=True)
        rec.update(selftestExit=st.returncode, selftestLast=st.stdout.strip().splitlines()[-1:],
                   selftestSurvived=[l for l in st.stdout.splitlines() if l.startswith('SURVIVED')])
    rec['caught'] = rec['checkExit'] != 0 or rec.get('selftestExit', 0) != 0
    git('checkout', '--', f'{D}/{name}')
    assert git('status', '--porcelain', '--untracked-files=no') == ''
    results.append(rec)
    print(json.dumps(rec), flush=True)
json.dump({'head': git('rev-parse', 'HEAD').strip(), 'headTestkitSha256': head_kit, 'results': results}, open(out, 'w'), indent=1)
