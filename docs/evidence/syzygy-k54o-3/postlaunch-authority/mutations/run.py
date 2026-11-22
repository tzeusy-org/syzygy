import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(sys.argv[1])
OUT = Path(sys.argv[2])
EXPECTED = '02947eea982781b96d22048dc0f59082c5bc3bfb'
PREFIX = 'packages/polaris-dossier/src/'


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)


def sha(body):
    return hashlib.sha256(body).hexdigest()


def test(name, project, test_file, selector):
    command = [
        'npx', '--no-install', 'vitest', 'run', '--project', project,
        '--maxWorkers=1', PREFIX + test_file, '-t', selector,
    ]
    log = OUT / f'{name}.log'
    with log.open('wb') as stream:
        run = subprocess.run(command, stdout=stream, stderr=subprocess.STDOUT, cwd=ROOT)
    body = log.read_bytes()
    outcome = re.search(rb'(?m)^\s*Tests\s+1 (passed|failed)\b', body)
    assert outcome is not None, f'no selected test outcome in {log}'
    return {'command': command, 'exit': run.returncode,
            'outcome': outcome.group(1).decode(), 'log': log.name, 'sha256': sha(body)}


def main():
    OUT.mkdir()
    assert git('rev-parse', 'HEAD').decode().strip() == EXPECTED
    assert not git('status', '--porcelain')
    provenance = ('integration', 'url-origin-ledger.test.ts', 'authority at capture and release')
    faults = (
        ('duplicate-session-authority',
         'url-run-sessions.ts', "if (settlement === 'current') return true;",
         "if (settlement === 'current') return input.effectCurrent();",
         ('unit', 'url-run-sessions-completion.test.ts', 'checks policy once and checks effect')),
        ('full-authority-per-provenance-edge',
         'url-origin-ledger.ts', 'const value = lookup(receipt), provenance = lineage.get(receipt);',
         'const value = entry(receipt), provenance = lineage.get(receipt);', provenance),
        ('omit-provenance-release-authority',
         'url-origin-ledger.ts', '    live();\n    return captured;',
         '    return captured;', provenance),
        ('omit-fingerprint-release-authority',
         'url-origin-ledger.ts', '      live(); return fingerprint;',
         '      return fingerprint;', provenance),
        ('omit-early-launch-sampler-drain',
         'url-run-artifacts.ts',
         '    if (waitForSamples !== undefined) {\n      await yieldToPoll();\n      if (!(await waitForSamples())) refuse();\n    }\n    live();\n    const { history, scope, project, eventSha256 }',
         '    live();\n    const { history, scope, project, eventSha256 }',
         ('integration', 'url-launch-history.test.ts', 'before inspecting or registering launch history')),
    )
    results = []
    for name, file, old, new, selection in faults:
        target = ROOT / PREFIX / file
        original = target.read_bytes()
        assert original.count(old.encode()) == 1
        before = test(name + '-original', *selection)
        assert before['exit'] == 0 and before['outcome'] == 'passed'
        try:
            target.write_bytes(original.replace(old.encode(), new.encode()))
            mutated = test(name + '-mutated', *selection)
            assert mutated['exit'] != 0 and mutated['outcome'] == 'failed'
        finally:
            target.write_bytes(original)
        results.append({'fault': name, 'path': PREFIX + file, 'fileSha256': sha(original),
                        'old': old, 'new': new, 'original': before, 'mutated': mutated})
    assert not git('status', '--porcelain')
    (OUT / 'results.json').write_text(json.dumps({'subject': EXPECTED, 'results': results}, indent=2) + '\n')


if __name__ == '__main__':
    main()
