"""Read-only census of fixture directories directly under /tmp: legacy vs pid-named, owner alive or not.

Lists names and lstat only; sends signal 0 (no signal) to classify owners; deletes nothing.
"""
import collections
import os
import re
import time

NAME = re.compile(r'^syzygy-poc-surface-fixture-(template-)?p(\d+)-')
PREFIX = 'syzygy-poc-surface-fixture-'
counts = collections.Counter()
ages = collections.defaultdict(list)
now = time.time()
total = 0
for name in os.listdir('/tmp'):
    total += 1
    if not name.startswith(PREFIX):
        continue
    st = os.lstat(os.path.join('/tmp', name))
    kind = 'dir' if os.path.isdir(os.path.join('/tmp', name)) and not os.path.islink(os.path.join('/tmp', name)) else 'other'
    match = NAME.match(name)
    if match is None:
        state = 'legacy'
    else:
        try:
            os.kill(int(match.group(2)), 0)
            state = 'pid-alive'
        except ProcessLookupError:
            state = 'pid-dead'
        except OSError:
            state = 'pid-eperm-or-other'
    key = (state, kind, st.st_uid)
    counts[key] += 1
    ages[key].append(round((now - st.st_mtime) / 3600, 1))
print('entries directly under /tmp:', total)
for key, count in sorted(counts.items()):
    print(' ', key, count, 'age hours min/max', min(ages[key]), max(ages[key]))
print('fixture entries:', sum(counts.values()))
