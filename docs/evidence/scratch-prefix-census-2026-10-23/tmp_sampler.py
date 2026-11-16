#!/usr/bin/env python3
"""Watch one directory and record when each direct entry appeared and vanished.

Usage: tmp_sampler.py <directory> <out.json> <interval-seconds> <stop-file>

Lists <directory> every <interval-seconds> until <stop-file> exists, then writes <out.json>: for every name ever seen its first and
last sighting (seconds since the start), whether it was a directory, and its owner; plus `present`, the names in the final listing.
It reads names and stats only and removes nothing. The out file is also written every 30 s so a killed sampler leaves a record.
"""
import json
import os
import sys
import time

directory, out, interval, stop = sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4]
entries: dict = {}
start = time.time()
present: list = []


def write(final: bool) -> None:
    record = {'tool': 'tmp_sampler.py', 'directory': directory, 'intervalSeconds': interval, 'seconds': round(time.time() - start, 1), 'final': final,
              'entries': entries, 'present': present}
    tmp = out + '.part'
    with open(tmp, 'w') as handle:
        json.dump(record, handle, indent=0)
    os.replace(tmp, out)


last_write = start
while True:
    now = round(time.time() - start, 2)
    try:
        listing = list(os.scandir(directory))
    except OSError:
        listing = []
    present = sorted(e.name for e in listing)
    for e in listing:
        try:
            info = e.stat(follow_symlinks=False)
            kind = 'dir' if e.is_dir(follow_symlinks=False) else 'link' if e.is_symlink() else 'file'
            uid = info.st_uid
        except OSError:
            continue
        item = entries.setdefault(e.name, {'first': now, 'kind': kind, 'uid': uid})
        item['last'] = now
    if os.path.exists(stop):
        break
    if time.time() - last_write > 30:
        write(False)
        last_write = time.time()
    time.sleep(interval)
write(True)
