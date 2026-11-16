#!/usr/bin/env python3
"""rev-520c stand-in for `npx vitest run ...`, put first on PATH by probe.py, so a probe can give the measured child a behaviour real
vitest only shows by chance. It ignores its arguments. FAKE_NPX_MODE picks the behaviour; each step is appended to FAKE_MARK as a
JSON line. usage: (as npx) FAKE_NPX_MODE=... FAKE_MARK=... npx ...

pipe       write 64 KiB blocks to stdout as fast as the reader takes them, for up to 20 s, then sleep 60 s
pipex      write 32 MiB to stdout, then exit 0
linger     fork a child that keeps stdout open and sleeps 6 s; the parent exits 0 at once (same process group)
detach     fork a child that calls setsid() (leaves the group) and keeps stdout open for 20 s; the parent sleeps 60 s
detachx    as detach, but the parent exits 0 at once
noterm     ignore SIGTERM and sleep 60 s
badutf8    write one PROF line, then one byte that is not UTF-8 (0xff), then exit 0"""
import json, os, signal, sys, time

mode, mark = os.environ['FAKE_NPX_MODE'], os.environ['FAKE_MARK']


def note(what, **k):
    with open(mark, 'a') as f:
        f.write(json.dumps({'what': what, 'pid': os.getpid(), 'pgid': os.getpgid(0), 'sid': os.getsid(0), 't': time.time(), **k}) + '\n')


note('start', mode=mode)
out = sys.stdout.buffer
if mode == 'pipe':
    block, end, n = b'x' * 65535 + b'\n', time.monotonic() + 20, 0
    while time.monotonic() < end:
        out.write(block); out.flush(); n += 1
        if n == 64: note('wrote-4MiB')
    note('pipe-done', blocks=n)
    time.sleep(60)
elif mode == 'pipex':
    block = b'x' * 65535 + b'\n'
    for _ in range(512): out.write(block)
    out.flush()
    note('pipex-done', blocks=512)
    sys.exit(0)
elif mode in ('linger', 'detach', 'detachx'):
    out.write(b'fake vitest\n'); out.flush()
    child = os.fork()
    if child == 0:
        if mode != 'linger': os.setsid()
        note('child', holds='stdout')
        time.sleep(6 if mode == 'linger' else 20)
        note('child-exit')
        os._exit(0)
    note('parent-forked', child=child)
    if mode == 'detach': time.sleep(60)
    note('parent-exit')
    sys.exit(0)
elif mode == 'noterm':
    signal.signal(signal.SIGTERM, signal.SIG_IGN)
    note('ignoring-sigterm')
    time.sleep(60)
elif mode == 'badutf8':
    out.write(b'PROF\tfake > test\t1\t0\t0\n\xff\n'); out.flush()
    note('badutf8-done')
    sys.exit(0)
else:
    sys.exit(f'unknown FAKE_NPX_MODE {mode}')
