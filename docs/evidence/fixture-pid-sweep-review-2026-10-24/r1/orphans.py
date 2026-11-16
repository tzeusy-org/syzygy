"""List live processes whose environment names one of the reviewer's private TMPDIRs (read-only)."""
import os
import sys

wanted = [f'TMPDIR={d}'.encode() for d in sys.argv[1:]]
for entry in os.listdir('/proc'):
    if not entry.isdigit():
        continue
    try:
        environ = open(f'/proc/{entry}/environ', 'rb').read().split(b'\0')
        cmd = open(f'/proc/{entry}/cmdline', 'rb').read().replace(b'\0', b' ')[:120].decode('utf8', 'replace')
    except OSError:
        continue
    hits = [w.decode() for w in wanted if w in environ]
    if hits:
        print(entry, hits, cmd)
