"""List processes of this user whose environ carries TMPDIR=/tmp/r509c-* or whose argv names /tmp/r509c-. Read-only."""
import os
uid = os.getuid()
found = []
for name in os.listdir('/proc'):
    if not name.isdigit():
        continue
    try:
        if os.stat(f'/proc/{name}').st_uid != uid:
            continue
        argv = open(f'/proc/{name}/cmdline', 'rb').read().replace(b'\0', b' ').decode('utf-8', 'replace')
        try:
            env = open(f'/proc/{name}/environ', 'rb').read().split(b'\0')
        except OSError:
            env = []
    except OSError:
        continue
    marker = [e.decode('utf-8', 'replace') for e in env if e.startswith(b'TMPDIR=/tmp/r509c-')]
    if marker or '/tmp/r509c-' in argv:
        found.append((int(name), marker, argv[:160]))
for row in sorted(found):
    print(row)
print('count', len(found))
