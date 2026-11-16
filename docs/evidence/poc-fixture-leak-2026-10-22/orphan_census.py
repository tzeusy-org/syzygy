#!/usr/bin/env python3
"""Which processes of this user still carry one of this lane's private browser profiles on their command line?

Usage: orphan_census.py <out.json> <private-directory> [<private-directory>...] [--stop]

The evidence tools of this directory report `processesStillNamingThisTmpdir`, which matches `TMPDIR=<dir>` in a process's
environment. A Chrome zygote and its descendants have no readable environment, so that check is blind to exactly the
processes a killed browser leaves behind (found 2026-10-22, review round 3 of the pull request: 18 and 38 Chrome
processes of two earlier TERM probes had been alive for about seven hours and kept re-creating their profile
directories). This script matches the exact argument `--user-data-dir=<private-directory>/` in each process's argv
instead, per directory, and records the counts by kind (leader, zygote, renderer, gpu-process, utility), the pids and the
age of the oldest. Only processes owned by this user whose argv carries that exact marker are listed; nothing is matched by
name. With `--stop` it then sends SIGTERM to those processes (by pid, from the list it just made) and lists again.
"""
import json
import os
import pathlib
import signal
import sys
import time

arguments = sys.argv[1:]
stop = '--stop' in arguments
arguments = [a for a in arguments if a != '--stop']
out, directories = pathlib.Path(arguments[0]), arguments[1:]
assert directories and all(pathlib.Path(d).is_absolute() and len(pathlib.Path(d).parts) >= 3 for d in directories), 'give absolute private directories, never / or a top-level one'
me = os.getuid()
ticks = os.sysconf('SC_CLK_TCK')
uptime = float(open('/proc/uptime').read().split()[0])


def census(directory: str) -> dict:
    marker = f'--user-data-dir={directory.rstrip("/")}/'
    found = []
    for name in os.listdir('/proc'):
        if not name.isdigit():
            continue
        try:
            if os.stat(f'/proc/{name}').st_uid != me:
                continue
            argv = open(f'/proc/{name}/cmdline', 'rb').read().replace(b'\0', b' ').decode('utf-8', 'replace')
            if marker not in argv:
                continue
            stat = open(f'/proc/{name}/stat').read()
            fields = stat[stat.rindex(')') + 2:].split()
            started = int(fields[19]) / ticks
            kind = argv.split('--type=')[1].split()[0] if '--type=' in argv else 'leader'
            found.append({'pid': int(name), 'ppid': int(fields[1]), 'kind': kind, 'ageSeconds': round(uptime - started)})
        except (OSError, IndexError, ValueError):
            continue
    kinds: dict[str, int] = {}
    for item in found:
        kinds[item['kind']] = kinds.get(item['kind'], 0) + 1
    return {'directory': directory, 'processes': len(found), 'byKind': dict(sorted(kinds.items())), 'oldestAgeSeconds': max((i['ageSeconds'] for i in found), default=None), 'pids': sorted(i['pid'] for i in found)}


before = [census(d) for d in directories]
record = {'tool': 'orphan_census.py', 'marker': '--user-data-dir=<private-directory>/ in argv (not TMPDIR in environ)', 'before': before}
if stop:
    for entry in before:
        for pid in entry['pids']:
            try:
                os.kill(pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
    time.sleep(3)
    record['afterSigterm'] = [census(d) for d in directories]
out.write_text(json.dumps(record, indent=1) + '\n')
print(json.dumps({'before': {e['directory']: e['processes'] for e in before}, 'afterSigterm': {e['directory']: e['processes'] for e in record.get('afterSigterm', [])}}))
