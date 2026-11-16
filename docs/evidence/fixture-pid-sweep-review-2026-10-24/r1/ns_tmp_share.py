"""For uid-1000 processes in a nested PID namespace, does their /tmp equal the host /tmp?

Read-only: stats /proc/<pid>/root/tmp and compares (st_dev, st_ino) with /tmp.
"""
import os
import collections

host = os.stat('/tmp')
host_key = (host.st_dev, host.st_ino)
rows = collections.Counter()
for entry in os.listdir('/proc'):
    if not entry.isdigit():
        continue
    try:
        with open(f'/proc/{entry}/status') as handle:
            fields = dict(line.rstrip('\n').split(':\t', 1) for line in handle if ':\t' in line)
    except OSError:
        continue
    if fields.get('Uid', '').split('\t')[0] != '1000':
        continue
    nspid = fields.get('NSpid', '').split('\t')
    if len(nspid) < 2:
        continue
    try:
        their = os.stat(f'/proc/{entry}/root/tmp')
        shared = 'shares-host-tmp' if (their.st_dev, their.st_ino) == host_key else 'own-tmp'
    except OSError as error:
        shared = f'unknown ({error.errno})'
    rows[(fields.get('Name'), shared)] += 1
print('host /tmp', host_key)
for key, count in sorted(rows.items()):
    print(' ', key, count)
print('denominator (nested uid-1000 processes):', sum(rows.values()))
