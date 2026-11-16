#!/usr/bin/env python3
"""rev-520c `git` wrapper, put first on PATH by probe.py: every call execs the real git (REAL_GIT) unchanged, except that
`git checkout ...` first appends a JSON line to FAKE_MARK and sleeps FAKE_GIT_DELAY seconds, so a probe can signal the measurement
script while its restore is running. usage: (as git) REAL_GIT=... FAKE_MARK=... FAKE_GIT_DELAY=... git ..."""
import json, os, sys, time

real, args = os.environ['REAL_GIT'], sys.argv[1:]
if args[:1] == ['checkout']:
    with open(os.environ['FAKE_MARK'], 'a') as f:
        f.write(json.dumps({'what': 'checkout-enter', 'pid': os.getpid(), 'pgid': os.getpgid(0), 'sid': os.getsid(0), 't': time.time(),
                            'args': args}) + '\n')
    time.sleep(float(os.environ.get('FAKE_GIT_DELAY', '1.5')))
os.execv(real, [real, *args])
