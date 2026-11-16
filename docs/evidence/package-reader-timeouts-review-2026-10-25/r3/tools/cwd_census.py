#!/usr/bin/env python3
"""rev-520c: count processes, and those whose cwd is under PREFIX (cwd unreadable ones counted separately).
usage: python3 -I cwd_census.py PREFIX"""
import os, sys

prefix = os.path.realpath(sys.argv[1])
total = unreadable = 0
hits = []
for pid in (p for p in os.listdir('/proc') if p.isdigit()):
    try:
        cwd = os.readlink(f'/proc/{pid}/cwd')
    except FileNotFoundError:
        continue
    except PermissionError:
        total += 1; unreadable += 1; continue
    total += 1
    if cwd == prefix or cwd.startswith(prefix + '/'):
        hits.append((pid, cwd))
print(f'processes {total}, cwd unreadable {unreadable}, cwd under prefix {len(hits)}')
for pid, cwd in hits: print('HIT', pid, cwd)
