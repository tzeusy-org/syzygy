#!/usr/bin/env python3
"""rev-520c fault-injection and trace wrapper: runs a measurement script unchanged under runpy, with one library call patched or
traced (the script's bytes are not edited). usage: python3 -I inject.py MODE SCRIPT [script args...]

MODE killpg-race: os.killpg passes through, except that the first killpg(pid, 0) whose real answer is ProcessLookupError answers
                  "alive" instead, so the script's next call, its SIGTERM to the group, meets a group already gone (R2 F3 (b)).
                  Each call and its real outcome is written to stderr as a KILLPG line.
MODE trace:       nothing is patched. subprocess.Popen is subclassed only to write, to stderr, a TRACE line when it is entered and
                  when it returns (with the script's `stopped_by` at that moment), and a SystemExit leaving the script is written
                  with its code, then re-raised. So an attempt's record says whether vitest was started before or after a signal."""
import os, runpy, subprocess, sys, time

mode, script, rest = sys.argv[1], sys.argv[2], sys.argv[3:]
T0 = time.monotonic()


def log(*parts):
    print('TRACE', f'{time.monotonic() - T0:.4f}', *parts, file=sys.stderr, flush=True)


SEEN = {}


def stopped():
    main = sys.modules.get('__main__')
    if getattr(main, 'stopped_by', None) is not None: SEEN['main'] = main   # the script's module while runpy runs it
    main = SEEN.get('main')
    return list(main.stopped_by) if main is not None else None


if mode == 'killpg-race':
    real_killpg, state = os.killpg, {'faked': False}

    def killpg(pid, sig):
        try:
            real_killpg(pid, sig)
            print(f'KILLPG {pid} {int(sig)} -> ok', file=sys.stderr, flush=True)
        except ProcessLookupError:
            if int(sig) == 0 and not state['faked']:
                state['faked'] = True
                print(f'KILLPG {pid} 0 -> ESRCH, answered alive (injected)', file=sys.stderr, flush=True)
                return
            print(f'KILLPG {pid} {int(sig)} -> ESRCH', file=sys.stderr, flush=True)
            raise
    os.killpg = killpg
elif mode == 'trace':
    real_popen = subprocess.Popen

    class TracedPopen(real_popen):
        def __init__(self, args, *a, **k):
            log('popen-enter', repr(list(args)[:3]), 'stopped', stopped())
            try:
                super().__init__(args, *a, **k)
            except BaseException as e:
                log('popen-raised', type(e).__name__)
                raise
            log('popen-return', self.pid, 'stopped', stopped())
    subprocess.Popen = TracedPopen
else:
    sys.exit(f'unknown mode {mode}')

sys.argv = [script, *rest]
try:
    runpy.run_path(script, run_name='__main__')
except SystemExit as e:
    if mode == 'trace':
        log('exit', repr(e.code), 'stopped', stopped())
    raise
