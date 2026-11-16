#!/usr/bin/env python3
"""Does a browser launch that fails leave the draft-preview test's `polaris-draft-browser-*` directory?

Usage: launch_failure_probe.py <worktree> <tree-commit> <out.json> <private-tmpdir> <mode>

`draft-preview.browser.test.ts` makes a temp directory for its page and then launches the browser. Before
syzygy-bpyt.4.11 the launch was outside the test's `try`, so a launch that threw skipped the `finally` that removes
the directory. The probe makes the launch fail without a browser: SYZYGY_POC_BROWSER=/bin/false is found as the
executable, spawns, exits at once, and `launchBrowser` throws before it announces a DevTools endpoint. The test
file runs ALONE under <private-tmpdir> (emptied first); the test is expected to fail, and the criterion is what
the failed test leaves behind.

<mode> is `head` (the tree as committed) or `base` (the three edits of the test reversed, as before the fix, and
restored afterwards: the `draft-preview-launch-outside-try` mutant).

`holds` is true when the test failed on the launch (the first error line says the browser did not start, so the
case is not vacuous) and, in `head` mode, no `polaris-draft-browser-*` directory is left, or in `base` mode one is.
A `syzygy-poc-browser-*` profile is left in both modes: `launchBrowser` retains the profile of a launch whose process
group it could not verify, by design (its comment: "The launched group's identity was not established. Retain its
profile."); it is counted and reported, not hidden.
"""
import hashlib
import json
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile

WT, COMMIT, OUT, TMP, MODE = pathlib.Path(sys.argv[1]).resolve(), sys.argv[2], pathlib.Path(sys.argv[3]).resolve(), pathlib.Path(sys.argv[4]).resolve(), sys.argv[5]
assert MODE in ('head', 'base'), MODE
SRC = 'apps/three-surface-poc/src/polaris-generation/draft-preview.browser.test.ts'
EDITS = [
    ("import { findBrowserExecutable, launchBrowser, type Browser } from '../cdp-browser.js';",
     "import { findBrowserExecutable, launchBrowser } from '../cdp-browser.js';"),
    ("  // The launch is inside the try: a launch that fails still removes the directory (syzygy-bpyt.4.11).\n  let browser: Browser | undefined;\n  try {\n    browser = await launchBrowser(executable);\n",
     "  const browser = await launchBrowser(executable);\n  try {\n"),
    ("  } finally {\n    try { await browser?.close(); }\n    finally { await rm(directory, { recursive: true, force: true }); }\n  }\n",
     "  } finally { await browser.close(); await rm(directory, { recursive: true, force: true }); }\n"),
]
git = lambda *a: subprocess.run(['git', *a], cwd=WT, capture_output=True, text=True, check=True).stdout.strip()
assert git('rev-parse', 'HEAD') == git('rev-parse', COMMIT), 'the worktree must be at <tree-commit>'
assert git('status', '--porcelain', '--', SRC) == '', 'the test file must be committed'

original = (WT / SRC).read_text()
digest = hashlib.sha256(original.encode()).hexdigest()
report = pathlib.Path(tempfile.mkdtemp(prefix='zz-launch-failure-')) / 'report.json'  # removed in the final `finally`
command = ['npx', 'vitest', 'run', SRC, '--project', '@syzygy/three-surface-poc-app', '--reporter=json', f'--outputFile={report}']
record: dict = {'tool': 'launch_failure_probe.py', 'treeCommit': COMMIT, 'mode': MODE, 'file': SRC, 'sha256AtCommit': digest,
                'command': 'SYZYGY_POC_BROWSER=/bin/false TMPDIR=<private> ' + ' '.join(command[:5] + ['--project ...'])}
shutil.rmtree(TMP, ignore_errors=True)
TMP.mkdir(parents=True)
try:
    if MODE == 'base':
        assert all(original.count(new) == 1 for new, _ in EDITS), 'each fragment must occur once'
        mutated = original
        for new, old in EDITS:
            mutated = mutated.replace(new, old, 1)
        (WT / SRC).write_text(mutated)
        record['mutant'] = {'id': 'draft-preview-launch-outside-try', 'file': SRC, 'edits': [{'old': new, 'new': old} for new, old in EDITS]}
    ran = subprocess.run(command, cwd=WT, capture_output=True, text=True, env={**os.environ, 'TMPDIR': str(TMP), 'SYZYGY_POC_BROWSER': '/bin/false'}, timeout=600)
    data = json.loads(report.read_text()) if report.exists() else {'testResults': []}
finally:
    (WT / SRC).write_text(original)
    shutil.rmtree(report.parent, ignore_errors=True)
assert hashlib.sha256((WT / SRC).read_bytes()).hexdigest() == digest, 'source not restored'
cases = [a for suite in data['testResults'] for a in suite['assertionResults']]
failing = [{'test': a['fullName'], 'firstErrorLine': (a['failureMessages'][0].splitlines() or [''])[0] if a['failureMessages'] else ''} for a in cases if a['status'] == 'failed']
left = sorted(p.name for p in TMP.iterdir() if p.name != 'node-compile-cache')
draft = [n for n in left if n.startswith('polaris-draft-browser-')]
profiles = [n for n in left if n.startswith('syzygy-poc-browser-')]
launch_failed = any(('browser' in f['firstErrorLine'] and ('private' in f['firstErrorLine'] or 'DevTools' in f['firstErrorLine'])) or 'cannot verify private browser' in f['firstErrorLine'] for f in failing)
record |= {'exit': ran.returncode, 'testsRun': len(cases), 'failing': failing, 'left': left, 'draftPreviewDirectoriesLeft': len(draft), 'retainedProfilesLeft': len(profiles),
           'launchFailedAsExpected': launch_failed,
           'holds': launch_failed and (len(draft) == 0 if MODE == 'head' else len(draft) == 1)}
OUT.write_text(json.dumps(record, indent=1) + '\n')
print(json.dumps({k: record[k] for k in ('mode', 'exit', 'failing', 'left', 'launchFailedAsExpected', 'holds')}, indent=1))
shutil.rmtree(TMP, ignore_errors=True)
