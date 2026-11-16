"""Count processes visible to this user whose NSpid shows a nested PID namespace.

Read-only: reads /proc/<pid>/status and the pid namespace link only.
"""
import os
import collections

total = 0
readable = 0
nested = collections.Counter()
ns_links = collections.Counter()
examples = {}
for entry in os.listdir('/proc'):
    if not entry.isdigit():
        continue
    total += 1
    try:
        with open(f'/proc/{entry}/status') as handle:
            fields = dict(line.rstrip('\n').split(':\t', 1) for line in handle if ':\t' in line)
    except OSError:
        continue
    readable += 1
    uid = fields.get('Uid', '').split('\t')[0]
    nspid = fields.get('NSpid', '').split('\t')
    try:
        link = os.readlink(f'/proc/{entry}/ns/pid')
    except OSError:
        link = 'unreadable'
    ns_links[(uid, link)] += 1
    if len(nspid) > 1:
        nested[uid] += 1
        examples.setdefault(uid, (entry, fields.get('Name'), nspid))
print('pids listed', total, 'status readable', readable)
print('nested-namespace processes by uid', dict(nested))
print('examples', examples)
print('pid namespace links by uid (top 10):')
for key, count in ns_links.most_common(10):
    print(' ', key, count)
