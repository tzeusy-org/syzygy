#!/usr/bin/env python3
"""Bind the closed interrupted-run projection to the clean native runner."""
import json
from pathlib import Path
import runpy
import sys


def main(prefix):
    previous = Path(__file__).resolve().parent.parent / 'native-stop-resume-27e83c50b' / 'project.py'
    project = runpy.run_path(str(previous))['project']
    runner = json.loads(Path(f'{prefix}-runner.json').read_bytes())
    expected_commit = '9eb31ba04eb3164b269727fc57417e7117528efc'
    expected_tree = '93a152ec6b4f7537c05a3a901f16dbecce65b121'
    if (runner['subjectCommit'] != expected_commit or runner['observedHeadAfter'] != expected_commit
            or runner['subjectTree'] != expected_tree or runner['cleanAfter'] is not True
            or runner['exitCode'] != 1):
        raise ValueError('runner does not bind the expected clean failed replay')
    result = project(prefix, runner['exitCode'])
    result['subjectCommit'] = expected_commit
    result['subjectTree'] = expected_tree
    result['runner'] = runner
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main(Path(sys.argv[1]))
