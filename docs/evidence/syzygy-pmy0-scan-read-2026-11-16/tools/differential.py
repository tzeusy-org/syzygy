"""Old-versus-new guardian differential over a simulated process table.

Both guardians run unmodified above the syscall boundary (stat read, stat(),
readlink, scandir, pidfd_open/send/close, waitpid, clock). A corpus of trees
covers family, sibling, escaped (reparented outside), foreign-UID, other-
namespace, unreadable-namespace, zombie and signal-triggered dynamic cases.
Compared per case: drain outcome (completed or exception class + message),
the sequence of successfully delivered signals, the final table, and whether
any signal ever reached a process outside the family or with a foreign
identity. Scan counts are reported, not compared.
"""
import copy
import hashlib
import json
import os
import random
import runpy
import signal
import sys
from contextlib import contextmanager
from types import SimpleNamespace
from unittest.mock import patch

ROOT, UID, NS = 1000, 500, 'pid:[1]'
INIT = 1


class Kernel:
    def __init__(self, procs):
        self.procs = copy.deepcopy(procs)  # pid -> dict
        self.handles = {}
        self.next_fd = 100
        self.delivered = []
        self.violations = []
        self.next_pid = 5000
        self.scans = 0

    # syscall boundary -------------------------------------------------
    def _pid(self, path):
        return int(path.split('/')[2])

    def read_stat_text(self, path):
        pid = self._pid(path)
        p = self.procs.get(pid)
        if p is None:
            raise FileNotFoundError(2, 'gone', path)
        fields = [p['state'], str(p['ppid'])] + ['0'] * 17 + [p['start']] + ['0'] * 5
        return f'{pid} (n) x) ' + ' '.join(fields)

    def stat(self, path, *a, **k):
        pid = self._pid(path)
        p = self.procs.get(pid)
        if p is None:
            raise FileNotFoundError(2, 'gone', path)
        return SimpleNamespace(st_uid=p['uid'])

    def readlink(self, path, *a, **k):
        pid = self._pid(path)
        p = self.procs.get(pid)
        if p is None:
            raise FileNotFoundError(2, 'gone', path)
        if not p['ns_readable']:
            raise PermissionError(13, 'denied', path)
        return p['ns']

    @contextmanager
    def scandir(self, path):
        self.scans += 1
        yield [SimpleNamespace(name=n) for n in ['self', 'stat'] + [str(p) for p in sorted(self.procs)]]

    def pidfd_open(self, pid, *a):
        p = self.procs.get(pid)
        if p is None:
            raise ProcessLookupError(3, 'no such process')
        fd = self.next_fd
        self.next_fd += 1
        self.handles[fd] = (pid, p['start'])
        return fd

    def close(self, fd):
        assert fd in self.handles, f'closed unknown fd {fd}'
        del self.handles[fd]

    def in_family(self, pid):
        seen = set()
        while pid not in seen:
            seen.add(pid)
            p = self.procs.get(pid)
            if p is None:
                return False
            if p['ppid'] == ROOT:
                return True
            pid = p['ppid']
        return False

    def pidfd_send_signal(self, fd, sig, *a):
        pid, start = self.handles[fd]
        p = self.procs.get(pid)
        if p is None or p['start'] != start:
            raise ProcessLookupError(3, 'no such process')
        if p['uid'] != UID:
            raise PermissionError(1, 'not permitted')
        if not self.in_family(pid) or p['ns'] != NS:
            self.violations.append((pid, start, sig.name))
        self.delivered.append((pid, sig.name))
        if p['state'] == 'Z':
            return
        lethal = sig == signal.SIGKILL or not p.get('ignore_term')
        for trigger in p.get('on_signal', []):
            self.trigger(pid, trigger)
        if lethal and pid in self.procs and self.procs[pid]['state'] != 'Z':
            self.die(pid)

    def trigger(self, pid, trigger):
        kind = trigger[0]
        if kind == 'kill' and trigger[1] in self.procs and self.procs[trigger[1]]['state'] != 'Z':
            self.die(trigger[1])
        elif kind == 'taint' and trigger[1] in self.procs:
            self.procs[trigger[1]]['ns_readable'] = False
        elif kind == 'fork':
            self.procs[self.next_pid] = dict(start=f's{self.next_pid}', ppid=pid, state='S', uid=UID,
                                             ns=NS, ns_readable=True)
            self.next_pid += 1
        elif kind == 'setuid':
            self.procs[pid]['uid'] = UID + 7

    def die(self, pid):
        p = self.procs[pid]
        p['state'] = 'Z'
        for child in [c for c, q in self.procs.items() if q['ppid'] == pid]:
            self.procs[child]['ppid'] = ROOT if self.in_family(pid) else INIT
        parent = self.procs.get(p['ppid'])
        if p['ppid'] != ROOT and parent is not None and parent['state'] != 'Z' and parent.get('reaps', True):
            del self.procs[pid]
        elif p['ppid'] not in (ROOT,) and parent is None:
            del self.procs[pid]

    def waitpid(self, pid, options):
        children = [c for c, q in self.procs.items() if q['ppid'] == ROOT]
        if not children:
            raise ChildProcessError(10, 'no child')
        for c in children:
            if self.procs[c]['state'] == 'Z':
                del self.procs[c]
                return c, 0
        return 0, 0


class Clock:
    def __init__(self):
        self.now = 0.0

    def monotonic(self):
        return self.now

    def sleep(self, seconds):
        self.now += seconds


def run(module, procs):
    kernel = Kernel(procs)
    clock = Clock()
    g = module['drain'].__globals__
    saved = {k: g[k] for k in ('ROOT', 'UID', 'NAMESPACE', 'read_stat_text', 'time')}
    g.update(ROOT=ROOT, UID=UID, NAMESPACE=NS, read_stat_text=kernel.read_stat_text, time=clock)
    try:
        with patch('os.stat', kernel.stat), patch('os.readlink', kernel.readlink), \
                patch('os.scandir', kernel.scandir), patch('os.pidfd_open', kernel.pidfd_open), \
                patch('os.close', kernel.close), patch('signal.pidfd_send_signal', kernel.pidfd_send_signal), \
                patch('os.waitpid', kernel.waitpid), patch('os.waitstatus_to_exitcode', lambda s: s), \
                patch('os.kill', side_effect=AssertionError('PID-addressed signal')):
            try:
                module['drain'](SimpleNamespace(pid=-1, returncode=None))
                outcome = ['completed']
            except Exception as error:  # noqa: BLE001 - the outcome is the datum
                outcome = [type(error).__name__, str(error)]
    finally:
        g.update(saved)
    return {'outcome': outcome, 'delivered': kernel.delivered, 'violations': kernel.violations,
            'final': {str(k): v for k, v in sorted(kernel.procs.items())},
            'leakedHandles': len(kernel.handles), 'scans': kernel.scans, 'seconds': clock.now}


def proc(start, ppid, **extra):
    base = dict(start=start, ppid=ppid, state='S', uid=UID, ns=NS, ns_readable=True)
    base.update(extra)
    return base


def base_table():
    # The guardian itself, init, an unrelated same-UID process whose namespace
    # is unreadable (the denied sibling), and an unrelated foreign-UID process.
    return {INIT: proc('init', 0, uid=0, ns_readable=False), ROOT: proc('root', 999),
            999: proc('worker', INIT), 998: proc('denied-sibling', 999, ns_readable=False),
            997: proc('foreign', INIT, uid=0, ns_readable=False)}


def named_cases():
    cases = {}
    t = base_table(); cases['empty'] = t
    t = base_table(); t.update({2001: proc('a', ROOT)}); cases['one-child'] = t
    t = base_table(); t.update({2001: proc('a', ROOT), 2002: proc('b', 2001), 2003: proc('c', 2002)})
    cases['chain'] = t
    t = base_table(); t.update({2001 + i: proc(f'k{i}', ROOT) for i in range(17)}); cases['seventeen'] = t
    t = base_table(); t[2001] = proc('l', ROOT); t.update({2002 + i: proc(f'k{i}', 2001) for i in range(16)})
    cases['launcher-plus-sixteen'] = t
    t = base_table(); t.update({2001: proc('a', ROOT), 2002: proc('sib', 999)}); cases['sibling-outside'] = t
    t = base_table(); t.update({2001: proc('a', ROOT), 2002: proc('escaped', INIT)}); cases['escaped-to-init'] = t
    t = base_table(); t.update({2001: proc('a', ROOT), 2002: proc('f', 2001, uid=UID + 1, ns_readable=False)})
    cases['foreign-uid-descendant'] = t
    t = base_table(); t.update({2001: proc('a', ROOT), 2002: proc('o', 2001, ns='pid:[2]')})
    cases['other-namespace-descendant'] = t
    t = base_table(); t.update({2001: proc('a', ROOT), 2002: proc('u', 2001, ns_readable=False)})
    cases['owned-unreadable'] = t
    t = base_table(); t.update({2001: proc('a', ROOT), 2002: proc('u', ROOT, ns_readable=False)})
    cases['owned-unreadable-second'] = t
    t = base_table(); t.update({2001: proc('a', ROOT, ignore_term=True), 2002: proc('b', ROOT)})
    cases['ignores-term'] = t
    t = base_table(); t.update({2001: proc('z', ROOT, state='Z'), 2002: proc('b', ROOT)}); cases['zombie'] = t
    t = base_table(); t.update({2001: proc('p', ROOT, on_signal=[('kill', 2002)]), 2002: proc('c', 2001)})
    cases['parent-kills-child'] = t
    t = base_table(); t.update({2001: proc('p', ROOT, on_signal=[('kill', 2002)], reaps=True),
                                2002: proc('c', 2001), 2003: proc('d', ROOT)})
    cases['parent-kills-and-reaps'] = t
    t = base_table(); t.update({2001: proc('p', ROOT, on_signal=[('taint', 2002)]), 2002: proc('c', ROOT)})
    cases['signal-taints-later-target'] = t
    t = base_table(); t.update({2001: proc('p', ROOT, on_signal=[('fork',)]), 2002: proc('c', ROOT)})
    cases['signal-forks'] = t
    t = base_table(); t.update({2001: proc('p', ROOT, on_signal=[('setuid',)], ignore_term=True),
                                2002: proc('c', ROOT)})
    cases['signal-setuid-self'] = t
    t = base_table(); t.update({2001: proc('p', ROOT, on_signal=[('kill', 2001)]), 2002: proc('c', ROOT)})
    cases['self-trigger'] = t
    return cases


def random_case(rng):
    t = base_table()
    pids = []
    n = rng.randint(1, 9)
    for i in range(n):
        pid = 2001 + i
        parent = rng.choice([ROOT] + pids) if pids else ROOT
        if rng.random() < .08:
            parent = rng.choice([INIT, 999])  # sibling / escaped
        extra = {}
        r = rng.random()
        if r < .05:
            extra.update(uid=UID + 1, ns_readable=False)
        elif r < .10:
            extra.update(ns='pid:[2]')
        elif r < .14:
            extra.update(ns_readable=False)
        elif r < .18:
            extra.update(state='Z')
        if rng.random() < .2:
            extra['ignore_term'] = True
        if rng.random() < .1:
            extra['reaps'] = False
        t[pid] = proc(f's{pid}', parent, **extra)
        pids.append(pid)
    for pid in pids:
        if rng.random() < .3:
            kind = rng.choice(['kill', 'taint', 'fork', 'setuid'])
            t[pid]['on_signal'] = [(kind, rng.choice(pids))] if kind in ('kill', 'taint') else [(kind,)]
    return t


def main():
    old = runpy.run_path(sys.argv[1])
    new = runpy.run_path(sys.argv[2])
    count = int(sys.argv[3]) if len(sys.argv) > 3 else 2000
    rng = random.Random(20261116)
    corpus = list(named_cases().items()) + [(f'random-{i}', random_case(rng)) for i in range(count)]
    report = {'old': sys.argv[1], 'oldSha256': hashlib.sha256(open(sys.argv[1], 'rb').read()).hexdigest(),
              'new': sys.argv[2], 'newSha256': hashlib.sha256(open(sys.argv[2], 'rb').read()).hexdigest(),
              'seed': 20261116, 'cases': len(corpus), 'identical': 0, 'differences': [],
              'outcomes': {}, 'dynamicCases': 0, 'violations': {'old': 0, 'new': 0},
              'scans': {'old': 0, 'new': 0}, 'leakedHandles': {'old': 0, 'new': 0}}
    for name, table in corpus:
        dynamic = any(p.get('on_signal') for p in table.values())
        report['dynamicCases'] += dynamic
        a, b = run(old, table), run(new, table)
        for side, r in (('old', a), ('new', b)):
            report['violations'][side] += len(r['violations'])
            report['scans'][side] += r['scans']
            report['leakedHandles'][side] += r['leakedHandles']
        key = ' / '.join(a['outcome'][:2])
        report['outcomes'][key] = report['outcomes'].get(key, 0) + 1
        same = all(a[k] == b[k] for k in ('outcome', 'delivered', 'final', 'violations'))
        if same:
            report['identical'] += 1
        else:
            report['differences'].append({'case': name, 'dynamic': dynamic, 'table': {str(k): v for k, v in table.items()},
                                          'old': {k: a[k] for k in ('outcome', 'delivered', 'violations')},
                                          'new': {k: b[k] for k in ('outcome', 'delivered', 'violations')}})
    print(json.dumps(report, indent=1))


if __name__ == '__main__':
    main()
