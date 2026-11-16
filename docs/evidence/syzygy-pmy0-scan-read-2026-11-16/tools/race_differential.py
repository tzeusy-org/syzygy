"""Intra-scan interleaving differential for the private browser guardian.

Usage: python3 race_differential.py OLD_GUARDIAN NEW_GUARDIAN [CONTROL_GUARDIAN]

Both guardians run unmodified above a simulated syscall boundary (stat body
read, os.stat, readlink, scandir, pidfd open/send, waitpid, clock). One or two
process-table events are injected after chosen syscall indices, so the table
changes inside a scan: between a process's stat read and its owner lookup,
between lineage and verification, and between per-signal scans. Events: exit
and reap by an in-family parent, exit to zombie, exit then PID reuse by an
unrelated process, namespace link becoming unreadable, fork (below and above
the parent's PID). Trees include PID-wrap shapes, where a child's PID is below
its parent's, so the scan reads the child first.

Compared per run: the drain outcome (completed or exception class and
message), the delivered signal sequence, and the sequence of family sets every
descendants() call returned. A third guardian, when given, is run as a
negative control and must differ, proving the harness reaches the window.

Derived from the independent reviewer's harness for R-PMY0-GUARDIAN-SCAN-READ-1
(F3); this version also ticks on os.stat, records every descendants() result,
and injects event pairs.
"""
import copy
import hashlib
import json
import runpy
import sys
from types import SimpleNamespace
from unittest.mock import patch

ROOT, UID, NS, INIT = 1000, 500, 'pid:[1]', 1


def proc(start, ppid, **extra):
    row = dict(start=start, ppid=ppid, state='S', uid=UID, ns=NS, ns_readable=True)
    row.update(extra)
    return row


class Kernel:
    def __init__(self, procs, events):
        self.p = copy.deepcopy(procs)
        self.events = dict(events)  # syscall index -> event
        self.n = 0
        self.handles, self.fd, self.delivered = {}, 100, []

    def tick(self):
        self.n += 1
        if self.n in self.events:
            self.apply(self.events[self.n])

    def apply(self, event):
        kind, pid = event[0], event[1]
        row = self.p.get(pid)
        if row is None:
            return
        if kind == 'exit-reaped':
            self.reparent(pid)
            del self.p[pid]
        elif kind == 'exit-zombie':
            self.reparent(pid)
            row['state'] = 'Z'
        elif kind == 'reuse':
            self.reparent(pid)
            self.p[pid] = proc('reused', INIT)
        elif kind == 'taint':
            row['ns_readable'] = False
        elif kind == 'fork' and event[2] not in self.p:
            self.p[event[2]] = proc(f's{event[2]}', pid)

    def reparent(self, pid):
        for child in self.p.values():
            if child['ppid'] == pid:
                child['ppid'] = ROOT

    @staticmethod
    def pid_of(path):
        return int(str(path).split('/')[2])

    def read(self, path):
        row = self.p.get(self.pid_of(path))
        self.tick()
        if row is None:
            raise FileNotFoundError(2, 'gone', path)
        fields = [row['state'], str(row['ppid'])] + ['0'] * 17 + [row['start']] + ['0'] * 5
        return f'{self.pid_of(path)} (n) ' + ' '.join(fields)

    def stat(self, path, *args, **kwargs):
        row = self.p.get(self.pid_of(path))
        self.tick()
        if row is None:
            raise FileNotFoundError(2, 'gone', path)
        return SimpleNamespace(st_uid=row['uid'])

    def readlink(self, path, *args, **kwargs):
        row = self.p.get(self.pid_of(path))
        self.tick()
        if row is None:
            raise FileNotFoundError(2, 'gone', path)
        if not row['ns_readable']:
            raise PermissionError(13, 'denied', path)
        return row['ns']

    def scandir(self, path):
        names = [SimpleNamespace(name=str(pid)) for pid in sorted(self.p)]
        self.tick()

        class Listing:
            def __enter__(self):
                return names

            def __exit__(self, *args):
                return False
        return Listing()

    def pidfd_open(self, pid, *args):
        self.tick()
        row = self.p.get(pid)
        if row is None:
            raise ProcessLookupError(3, 'gone')
        self.fd += 1
        self.handles[self.fd] = (pid, row['start'])
        return self.fd

    def close(self, fd):
        self.handles.pop(fd)

    def send(self, fd, sig, *args):
        self.tick()
        pid, start = self.handles[fd]
        row = self.p.get(pid)
        if row is None or row['start'] != start:
            raise ProcessLookupError(3, 'gone')
        self.delivered.append((pid, sig.name))
        if row['state'] != 'Z':
            self.reparent(pid)
            row['state'] = 'Z'

    def waitpid(self, pid, options):
        children = [c for c, row in self.p.items() if row['ppid'] == ROOT]
        if not children:
            raise ChildProcessError(10, 'none')
        for child in children:
            if self.p[child]['state'] == 'Z':
                del self.p[child]
                return child, 0
        return 0, 0


class Clock:
    def __init__(self):
        self.now = 0.0

    def monotonic(self):
        return self.now

    def sleep(self, seconds):
        self.now += seconds


def run(module, procs, events):
    kernel = Kernel(procs, events)
    ports = module['drain'].__globals__
    scan = ports['descendants']
    families = []

    def recorded():
        try:
            rows = scan()
        except Exception as error:
            families.append([type(error).__name__])
            raise
        families.append(sorted(rows))
        return rows
    saved = {key: ports[key] for key in ('ROOT', 'UID', 'NAMESPACE', 'read_stat_text', 'time', 'descendants')}
    ports.update(ROOT=ROOT, UID=UID, NAMESPACE=NS, read_stat_text=kernel.read, time=Clock(),
                 descendants=recorded)
    try:
        with patch('os.stat', kernel.stat), patch('os.readlink', kernel.readlink), \
                patch('os.scandir', kernel.scandir), patch('os.pidfd_open', kernel.pidfd_open), \
                patch('os.close', kernel.close), patch('signal.pidfd_send_signal', kernel.send), \
                patch('os.waitpid', kernel.waitpid), patch('os.waitstatus_to_exitcode', lambda status: status):
            try:
                module['drain'](SimpleNamespace(pid=-1, returncode=None))
                outcome = ['completed']
            except Exception as error:  # noqa: BLE001 - the outcome is the datum
                outcome = [type(error).__name__, str(error)]
    finally:
        ports.update(saved)
    return {'outcome': outcome, 'delivered': kernel.delivered, 'families': families, 'syscalls': kernel.n}


def base():
    return {INIT: proc('init', 0, uid=0, ns_readable=False), ROOT: proc('root', 999), 999: proc('w', INIT),
            998: proc('denied-sibling', 999, ns_readable=False)}


def trees():
    out = {}
    for unreadable in (False, True):
        tag = f'unreadable={unreadable}'
        t = base()
        t.update({2000: proc('P', ROOT), 2005: proc('A', 2000), 1500: proc('B', 2005, ns_readable=not unreadable)})
        out[f'wrap-child-below-parent {tag}'] = t
        t = base()
        t.update({2000: proc('P', ROOT), 2005: proc('A', 2000), 2010: proc('B', 2005, ns_readable=not unreadable)})
        out[f'child-above-parent {tag}'] = t
        t = base()
        t.update({2000: proc('P', ROOT), 2005: proc('A', 2000), 1500: proc('B', 2005),
                  1200: proc('C', 1500, ns_readable=not unreadable)})
        out[f'wrap-two-levels {tag}'] = t
    t = base()
    t.update({2000: proc('P', ROOT), 1800: proc('A', 2000), 1700: proc('B', 1800), 1600: proc('C', 1700)})
    out['wrap-descending-chain'] = t
    t = base()
    t.update({2000 + i: proc(f'k{i}', ROOT) for i in range(4)})
    out['four-siblings'] = t
    t = base()
    t.update({2000: proc('P', ROOT), 2005: proc('A', 2000), 1500: proc('B', 2005), 2003: proc('O', 999)})
    out['wrap-with-outside-sibling'] = t
    return out


def events_for(tree):
    pids = [pid for pid in tree if pid not in (INIT, ROOT, 999, 998)]
    events = [(kind, pid) for kind in ('exit-reaped', 'exit-zombie', 'reuse', 'taint') for pid in pids]
    events += [('fork', pids[0], 1100), ('fork', pids[-1], 3000)]
    return events


def main():
    paths = sys.argv[1:4]
    modules = [runpy.run_path(path) for path in paths]
    old, new = modules[0], modules[1]
    control = modules[2] if len(modules) > 2 else None
    totals = {'single': 0, 'pair': 0}
    differences, control_differences = [], 0
    for name, tree in trees().items():
        events = events_for(tree)
        horizon = run(old, tree, {})['syscalls'] + 30
        plans = [('single', {at: event}) for event in [None] + events for at in range(1, horizon if event else 2)
                 if event is not None or at == 1]
        # Pairs: an exit or reuse, then any event within the next 12 syscalls.
        firsts = [e for e in events if e[0] in ('exit-reaped', 'reuse')]
        plans += [('pair', {at: first, at + gap: second}) for first in firsts for second in events
                  if second != first for at in range(1, horizon, 3) for gap in (1, 2, 5, 12)]
        for kind, plan in plans:
            totals[kind] += 1
            a, b = run(old, tree, plan), run(new, tree, plan)
            if (a['outcome'], a['delivered'], a['families']) != (b['outcome'], b['delivered'], b['families']):
                differences.append({'tree': name, 'plan': {str(k): v for k, v in plan.items()},
                                    'old': a, 'new': b})
            if control is not None:
                c = run(control, tree, plan)
                control_differences += (a['outcome'], a['delivered'], a['families']) != (
                    c['outcome'], c['delivered'], c['families'])
    digest = [hashlib.sha256(open(path, 'rb').read()).hexdigest() for path in paths]
    print(json.dumps({'old': digest[0], 'new': digest[1], 'control': digest[2] if control else None,
                      'trees': len(trees()), 'runs': totals, 'differences': len(differences),
                      'differenceSamples': differences[:5], 'controlDifferences': control_differences},
                     indent=1, default=str))


if __name__ == '__main__':
    main()
