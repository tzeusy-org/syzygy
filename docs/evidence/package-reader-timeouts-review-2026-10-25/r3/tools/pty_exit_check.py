#!/usr/bin/env python3
"""rev-520c: what exit status a Python child gets when it writes to its controlling pty after a hangup, then calls sys.exit(129).
The child mirrors leave_if_stopped(): a SIGHUP handler that only records, then print(..., file=sys.stderr, flush=True) and
sys.exit(128 + 1). Run once with the print and once without. usage: python3 -I pty_exit_check.py"""
import fcntl, os, pty, signal, subprocess, sys, termios, time

CHILD = r'''
import signal, sys, time
got = []
signal.signal(signal.SIGHUP, lambda n, f: got.append(n))
open(sys.argv[2], 'w').write('ready')
while not got: time.sleep(0.05)
time.sleep(0.2)
if sys.argv[1] == 'print': print('stopped by SIGHUP', file=sys.stderr, flush=True)
sys.exit(128 + got[0])
'''
for variant in ('print', 'noprint'):
    master, slave = pty.openpty()
    ready = f'/tmp/r520c-pty-ready-{os.getpid()}-{variant}'
    def pre():
        fcntl.ioctl(0, termios.TIOCSCTTY, 0)
    p = subprocess.Popen([sys.executable, '-I', '-c', CHILD, variant, ready], stdin=slave, stdout=slave, stderr=slave,
                         start_new_session=True, preexec_fn=pre)
    os.close(slave)
    while not os.path.exists(ready): time.sleep(0.02)
    os.close(master)   # hangup: the kernel sends SIGHUP to the session's processes
    p.wait()
    os.unlink(ready)
    print(f'{variant}: exit {p.returncode}')
