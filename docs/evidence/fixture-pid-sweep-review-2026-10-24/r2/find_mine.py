"""Lists processes whose environment names one of the reviewer's TMPDIRs (/tmp/r509b-*), read-only.
With --kill, sends SIGKILL to each listed pid after re-reading its environment marker.
Usage: python3 find_mine.py [--kill]"""
import os
import re
import signal
import sys

MARK = re.compile(rb'^TMPDIR=/tmp/r509b-\d+/?')


def marker(pid):
    try:
        env = open(f'/proc/{pid}/environ', 'rb').read().split(b'\0')
    except OSError:
        return None
    hits = [e for e in env if MARK.match(e)]
    return hits[0].decode() if hits else None


found = []
for pid in os.listdir('/proc'):
    if not pid.isdigit() or int(pid) == os.getpid():
        continue
    m = marker(pid)
    if m:
        try:
            cmd = open(f'/proc/{pid}/cmdline', 'rb').read().replace(b'\0', b' ').decode(errors='replace')[:140]
        except OSError:
            cmd = '?'
        found.append((int(pid), m, cmd))
for row in sorted(found):
    print(*row)
print('count', len(found))
if '--kill' in sys.argv:
    for pid, m, _ in found:
        if marker(pid) == m:
            try:
                os.kill(pid, signal.SIGKILL)
                print('killed', pid)
            except OSError as error:
                print('not killed', pid, error)
